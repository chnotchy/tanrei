// A suite leaves nothing behind. Temporary directories are made with tempDir()
// (packages/tools/src/test-tmp.js): tagged with the process that made them, removed when the test file ends, and the
// file fails if one stays. This file is the other half: no code of this package makes one in any other way.
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { directTempDirCalls, leavesNothingBehind, ownTempDirs, tempDir, throwawayGitEnv } from '../src/test-tmp.js';

leavesNothingBehind(after);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('temporary directories are made only through tempDir(), which removes them', () => {
  assert.deepEqual(directTempDirCalls(pkg), [], 'use tempDir(purpose) from packages/tools/src/test-tmp.js instead of fs.mkdtempSync');
});

test('tempDir(): tagged with this process, counted while it exists', () => {
  const before = ownTempDirs().length;
  const dir = tempDir('tmp-check');
  assert.ok(fs.statSync(dir).isDirectory());
  assert.match(path.basename(dir), new RegExp(`^tanrei-tmp-check-p${process.pid}-`));
  assert.equal(ownTempDirs().length, before + 1);
  assert.throws(() => tempDir('../escape'), /purpose/);
});

test('the check itself: what stays is reported, what a child process makes is swept when it exits', async () => {
  const { sweepTempDirs } = await import('../src/test-tmp.js');
  const { spawnSync } = await import('node:child_process');
  const os = await import('node:os');
  // A child makes a directory and exits without removing it: its exit handler does.
  const helper = path.join(pkg, 'src/test-tmp.js');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import { tempDir } from ${JSON.stringify(helper)}; console.log(tempDir('child'));`], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout.trim(), /tanrei-child-p\d+-/);
  assert.equal(fs.existsSync(child.stdout.trim()), false, 'swept on exit');
  // A directory with this process's tag that tempDir() does not know about is what the file-level check reports.
  const stray = path.join(os.tmpdir(), `tanrei-stray-p${process.pid}-manual`);
  fs.mkdirSync(stray);
  try {
    assert.deepEqual(sweepTempDirs(), [path.basename(stray)]);
  } finally {
    fs.rmdirSync(stray);
  }
});

test('the check leaves out what an earlier process with the same id left: a runner killed before its exit sweep', () => {
  // The child stands for a test file whose id a killed process had: an entry with its tag is there before the module
  // loads. The check must not count it — and a directory the child makes after that is still counted.
  const helper = path.join(pkg, 'src/test-tmp.js');
  const script = `
    import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
    const stale = path.join(os.tmpdir(), 'tanrei-node-test-p' + process.pid + '-stale');
    fs.mkdirSync(stale);
    console.log(stale);
    const { ownTempDirs, sweepTempDirs } = await import(${JSON.stringify(helper)});
    const before = sweepTempDirs();
    const stray = path.join(os.tmpdir(), 'tanrei-stray-p' + process.pid + '-manual');
    fs.mkdirSync(stray);
    const after = ownTempDirs();
    fs.rmdirSync(stray);
    console.log(JSON.stringify({ before, after, stale: path.basename(stale), stray: path.basename(stray) }));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  const [stalePath, json] = child.stdout.trim().split('\n');
  try {
    assert.equal(child.status, 0, child.stderr);
    const seen = JSON.parse(json);
    assert.deepEqual(seen.before, [], `${seen.stale} was left by an earlier process, not by this one`);
    assert.deepEqual(seen.after, [seen.stray], 'a directory made with the tag after the module loaded is still reported');
    assert.ok(fs.existsSync(stalePath), 'the earlier process\'s entry is left alone, not removed');
  } finally {
    if (stalePath) fs.rmSync(stalePath, { recursive: true, force: true });
  }
});

/**
 * Start a child that runs this module source with the helper's `tempDir` imported, wait for the first line it prints,
 * and hand back the child and that line.
 */
async function startChild(source) {
  const helper = path.join(pkg, 'src/test-tmp.js');
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import { tempDir } from ${JSON.stringify(helper)};\n${source}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stderr.on('data', (chunk) => (err += chunk));
  const line = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      out += chunk;
      if (out.includes('\n')) resolve(out.split('\n')[0]);
    });
    child.on('exit', (code, signal) => reject(new Error(`the child ended (${signal ?? code}) before it printed a line: ${err}`)));
  });
  return { child, line, stderr: () => err };
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  test(`a process ended by ${signal} sweeps its directories and still ends by ${signal}`, async () => {
    // The child makes a directory and waits; the signal arrives while it is idle, as from a terminal or a job's timeout.
    const { child, line: dir, stderr } = await startChild(`console.log(tempDir('signalled')); setInterval(() => {}, 1000);`);
    try {
      assert.match(path.basename(dir), /^tanrei-signalled-p\d+-/);
      assert.ok(fs.existsSync(dir), 'the directory is there while the child runs');
      const ended = once(child, 'exit');
      child.kill(signal);
      const [code, by] = await ended;
      assert.equal(by, signal, `ended by the signal, not by an exit (code ${code}): ${stderr()}`);
      assert.equal(fs.existsSync(dir), false, 'swept before the child ended');
    } finally {
      child.kill('SIGKILL');
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('a process with a listener of its own for the signal ends as that listener says, swept as well', async () => {
  const { child, line: dir, stderr } = await startChild(`process.on('SIGTERM', () => process.exit(3)); console.log(tempDir('signalled')); setInterval(() => {}, 1000);`);
  try {
    const ended = once(child, 'exit');
    child.kill('SIGTERM');
    const [code, by] = await ended;
    assert.deepEqual({ code, by }, { code: 3, by: null }, stderr());
    assert.equal(fs.existsSync(dir), false);
  } finally {
    child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a process that only imports the module reacts to a signal as it did without it', async () => {
  // No directory, no listener: the default action ends the process.
  const { child, line, stderr } = await startChild(`console.log(process.listenerCount('SIGTERM')); setInterval(() => {}, 1000);`);
  assert.equal(line, '0');
  const ended = once(child, 'exit');
  child.kill('SIGTERM');
  const [, by] = await ended;
  assert.equal(by, 'SIGTERM', stderr());
});

test('the runner, signalled while it waits for node --test, sweeps its report directory once the run returns and ends by the signal', async () => {
  // The runner is blocked in spawnSync and runs no listener until node --test returns. The test file below says it has
  // started, then waits for a file this test writes only after it has signalled the runner (the runner alone, not its
  // child), so the signal is sure to arrive while the runner waits.
  const dir = tempDir('runner-signal');
  const started = path.join(dir, 'started');
  const release = path.join(dir, 'release');
  fs.writeFileSync(path.join(dir, 'wait.test.mjs'), `
    import fs from 'node:fs'; import { test } from 'node:test';
    test('waits for the parent', async () => {
      fs.writeFileSync(${JSON.stringify(started)}, '');
      while (!fs.existsSync(${JSON.stringify(release)})) await new Promise((resolve) => setTimeout(resolve, 20));
    });`);
  const before = new Set(fs.readdirSync(os.tmpdir()));
  const runner = spawn(process.execPath, [path.join(pkg, 'src/run-node-tests.js'), 'wait.test.mjs'], { cwd: dir, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  runner.stdout.on('data', (chunk) => (output += chunk));
  runner.stderr.on('data', (chunk) => (output += chunk));
  const ended = once(runner, 'exit');
  try {
    while (!fs.existsSync(started)) {
      assert.equal(runner.exitCode, null, `the runner ended before the test file started: ${output}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const tag = `-p${runner.pid}-`;
    const mine = () => fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('tanrei-') && name.includes(tag) && !before.has(name));
    assert.equal(mine().length, 1, 'the runner made its report directory');
    runner.kill('SIGTERM');
    fs.writeFileSync(release, '');
    const [code, by] = await ended;
    assert.equal(by, 'SIGTERM', `ended by the signal (code ${code}): ${output}`);
    assert.deepEqual(mine(), [], 'its report directory was swept');
  } finally {
    fs.writeFileSync(release, '');
    runner.kill('SIGKILL');
  }
});

/** This process's environment for a child `node --test` of its own (not a subtest of this run). */
function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

test('a test that makes a git repository in its own directory leaves the repository a hook runs for untouched', () => {
  // Git hands a hook the repository it runs for (GIT_DIR, GIT_INDEX_FILE), and those beat `git -C <dir>`. The suite
  // below makes repositories of its own; run under a GIT_DIR, it must not init, configure or commit there.
  const git = (dir, ...args) => execFileSync('git', ['-C', dir, '-c', 'user.name=o', '-c', 'user.email=o@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', env: throwawayGitEnv() });
  const real = tempDir('hook-repository');
  git(real, 'init', '-q', '-b', 'main');
  git(real, 'commit', '-q', '--allow-empty', '-m', 'chore: the repository being pushed');
  const head = git(real, 'rev-parse', 'HEAD').trim();
  const config = fs.readFileSync(path.join(real, '.git', 'config'), 'utf8');
  const run = spawnSync(process.execPath, ['--test', path.join(pkg, 'test', 'guard-bash-repositories.test.js')], { encoding: 'utf8', env: { ...childEnv(), GIT_DIR: path.join(real, '.git'), GIT_INDEX_FILE: path.join(real, '.git', 'index') } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(git(real, 'rev-parse', 'HEAD').trim(), head, 'no commit was made in the hook\'s repository');
  assert.equal(fs.readFileSync(path.join(real, '.git', 'config'), 'utf8'), config, 'its config is as it was (core.bare untouched)');
});

test('throwawayGitEnv() drops every variable that tells git which repository to use, and nothing else', () => {
  const env = throwawayGitEnv({ GIT_DIR: 'a', GIT_WORK_TREE: 'b', GIT_INDEX_FILE: 'c', GIT_COMMON_DIR: 'd', GIT_EDITOR: 'true', PATH: '/bin' });
  assert.deepEqual(env, { GIT_EDITOR: 'true', PATH: '/bin' });
});
