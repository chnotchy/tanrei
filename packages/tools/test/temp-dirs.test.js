// A suite leaves nothing behind. Temporary directories are made with tempDir()
// (packages/tools/src/test-tmp.js): tagged with the process that made them, removed when the test file ends, and the
// file fails if one stays. This file is the other half: no code of this package makes one in any other way.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
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
