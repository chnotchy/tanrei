// A test file that fails to load, or a hook that throws, fails the run (src/run-node-tests.js). On Node 22.13 `node --test`
// prints such a suite as `not ok`, says `fail 0` and exits 0 — the docs app's suite on the head's font preloads once
// went unrun that way, with a green run, because a file it reads had not been generated.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { balance, inOrderConfig, jobSeconds, longestFirst, shard, uncountedFailures } from '../src/run-node-tests.js';
import { measured, refreshed } from '../src/shard-weights.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(pkg, '../..');
const runner = path.join(pkg, 'src/run-node-tests.js');

/** This process's environment for a child `node --test` of its own (not a subtest of this run). */
function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.TEST_SHARD;
  return env;
}

/** Run the runner over one test file with this source, next to a file that passes; its exit status. */
function run(source) {
  const dir = tempDir('node-test-case');
  fs.writeFileSync(path.join(dir, 'case.test.mjs'), source);
  fs.writeFileSync(path.join(dir, 'passes.test.mjs'), "import { test } from 'node:test';\ntest('passes', () => {});\n");
  const child = spawnSync(process.execPath, [runner, 'case.test.mjs', 'passes.test.mjs'], { cwd: dir, env: childEnv(), encoding: 'utf8' });
  return { status: child.status, output: `${child.stdout}${child.stderr}` };
}

const head = "import { after, before, describe, test } from 'node:test';\n";

describe('the Node test runner of every package', () => {
  // Each of these is a failure; the first three are the ones Node 22.13's `node --test` exits 0 on.
  const failing = {
    'a describe body that throws (a file it reads is missing)': `${head}describe('reads a file', () => { throw new Error('ENOENT'); });\n`,
    'a describe body that rejects': `${head}describe('awaits', async () => { await null; throw new Error('late'); });\n`,
    'an after hook inside a describe that throws': `${head}describe('s', () => { after(() => { throw new Error('after'); }); test('t', () => {}); });\n`,
    'a before hook that throws': `${head}describe('s', () => { before(() => { throw new Error('before'); }); test('t', () => {}); });\n`,
    'a file that throws as it loads': `${head}throw new Error('at load');\n`,
    'a test that fails': `${head}test('t', () => { throw new Error('plain'); });\n`,
  };
  for (const [name, source] of Object.entries(failing)) {
    test(`fails the run on ${name}`, () => {
      const { status, output } = run(source);
      assert.notEqual(status, 0, output);
    });
  }

  test('passes a run whose only failure is a TODO, as node --test does', () => {
    const { status, output } = run(`${head}test('not yet', { todo: true }, () => { throw new Error('todo'); });\ntest('t', () => {});\n`);
    assert.equal(status, 0, output);
  });

  test('names what Node reported and did not count', () => {
    const { output } = run(`${head}describe('reads a file', () => { throw new Error('ENOENT'); });\n`);
    // On a Node that counts it the runner's own exit code is enough; where it does not, the message says why.
    if (/not counted/.test(output)) assert.match(output, /not ok \d+ - reads a file/);
  });
});

test('TEST_SHARD runs one share of the files, and the shares together run each file once', () => {
  const dir = tempDir('node-test-shard');
  const files = ['a', 'b', 'c', 'd', 'e'].map((name) => `${name}.test.mjs`);
  for (const file of files) fs.writeFileSync(path.join(dir, file), `import { test } from 'node:test';\ntest('${file}', () => {});\n`);
  const ran = [];
  for (const index of [1, 2]) {
    const child = spawnSync(process.execPath, [runner, '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: `${index}/2` }, encoding: 'utf8' });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    const names = [...child.stdout.matchAll(/^ok \d+ - (\S+)$/gm)].map((m) => m[1]);
    assert.ok(names.length > 0 && names.length < files.length, `shard ${index}/2 ran ${names.join(', ')}`);
    ran.push(...names);
  }
  assert.deepEqual(ran.sort(), files);
  assert.deepEqual(shard({}), []);
  for (const value of ['0/3', '4/3', '1', 'a/b']) assert.throws(() => shard({ TEST_SHARD: value }), /TEST_SHARD/);
});

describe('shards by measured time (--shard-weights)', () => {
  const weights = { 'a.test.mjs': 50, 'b.test.mjs': 40, 'c.test.mjs': 30, 'd.test.mjs': 20, 'e.test.mjs': 10, 'gone.test.mjs': 5 };
  const files = ['a.test.mjs', 'b.test.mjs', 'c.test.mjs', 'd.test.mjs', 'e.test.mjs', 'new.test.mjs'];
  const testFile = (name) => `import { test } from 'node:test';\ntest('${name}', () => {});\n`;

  test('every file is in exactly one shard, a file the weights do not name among them at their median', () => {
    for (const total of [1, 2, 3, 4, 7]) {
      const shards = balance(files, weights, total);
      assert.equal(shards.length, total);
      assert.deepEqual(shards.flatMap((s) => s.files).sort(), [...files].sort(), `${total} shards`);
    }
    const shards = balance(files, weights, 3);
    assert.deepEqual(shards.find((s) => s.files.includes('new.test.mjs')).guessed, ['new.test.mjs']);
    // The median of the six weights (5, 10, 20, 30, 40, 50) is 25; the name of a file that is not there runs nowhere.
    assert.equal(shards.reduce((sum, s) => sum + s.seconds, 0), 50 + 40 + 30 + 20 + 10 + 25);
    assert.ok(!shards.some((s) => s.files.includes('gone.test.mjs')));
  });

  test('the same split whatever order the files are found in: longest first, each to the shard with the least so far', () => {
    const split = (list) => balance(list, weights, 2).map((s) => s.files);
    const expected = split(files);
    for (const order of [[...files].reverse(), [files[3], files[0], files[5], files[1], files[4], files[2]]]) assert.deepEqual(split(order), expected);
    // a 50 → 1 (50); b 40 → 2 (40); c 30 → 2 (70); new 25 → 1 (75); d 20 → 2 (90); e 10 → 1 (85).
    assert.deepEqual(expected, [['a.test.mjs', 'e.test.mjs', 'new.test.mjs'], ['b.test.mjs', 'c.test.mjs', 'd.test.mjs']]);
  });

  test('a file of `$alone` takes a shard of its own, and the others share the rest', () => {
    const shards = balance(files, { ...weights, $alone: ['a.test.mjs', 'gone.test.mjs'] }, 3);
    assert.deepEqual(shards[0].files, ['a.test.mjs']);
    assert.deepEqual(shards.flatMap((s) => s.files).sort(), [...files].sort());
    // The rest, without a: b 40 → 2 (40); c 30 → 3 (30); new 25 → 3 (55); d 20 → 2 (60); e 10 → 3 (65).
    assert.deepEqual(shards.slice(1).map((s) => s.files), [['b.test.mjs', 'd.test.mjs'], ['c.test.mjs', 'e.test.mjs', 'new.test.mjs']]);
    assert.throws(() => balance(files, { ...weights, $alone: ['a.test.mjs', 'b.test.mjs'] }, 2), /need at least one/);
  });

  test('the runner gives each shard its files by weight, says how it split them, and how long each ran', () => {
    const dir = tempDir('node-test-weights');
    fs.mkdirSync(path.join(dir, 'test'));
    for (const file of files) fs.writeFileSync(path.join(dir, 'test', file), testFile(file));
    fs.writeFileSync(path.join(dir, 'test/durations.json'), JSON.stringify({ $comment: 'seconds', ...weights }));
    const ran = [];
    for (const index of [1, 2, 3]) {
      const child = spawnSync(process.execPath, [runner, '--shard-weights=test/durations.json', 'test/*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: `${index}/3` }, encoding: 'utf8' });
      assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
      const names = [...child.stdout.matchAll(/^ok \d+ - (\S+)$/gm)].map((m) => m[1]);
      assert.ok(names.length > 0, `shard ${index}/3 ran nothing`);
      assert.match(child.stdout, new RegExp(`^# → ${index}/3: \\d+ s — `, 'm'));
      const timed = [...child.stdout.matchAll(/^# file-duration (\S+) \d+\.\d$/gm)].map((m) => m[1]);
      assert.deepEqual(timed, names.map((name) => `test/${name}`).sort());
      ran.push(...names);
    }
    assert.deepEqual(ran.sort(), [...files].sort());
  });

  test('a shard starts its files longest first by the weights, a file they do not name at their median', () => {
    // The names run against the weights: in name order `a` (the shortest) would start first and `e` (the longest) last.
    const dir = tempDir('node-test-weights-order');
    const log = path.join(dir, 'started.txt');
    const table = { 'a.test.mjs': 1, 'b.test.mjs': 2, 'c.test.mjs': 30, 'e.test.mjs': 50 }; // median 16 for d
    for (const name of ['a', 'b', 'c', 'd', 'e']) {
      fs.writeFileSync(path.join(dir, `${name}.test.mjs`), `import fs from 'node:fs';\nimport { test } from 'node:test';\nfs.appendFileSync(${JSON.stringify(log)}, '${name}\\n');\ntest('${name}', () => {});\n`);
    }
    fs.writeFileSync(path.join(dir, 'durations.json'), JSON.stringify(table));
    assert.deepEqual(longestFirst(['a.test.mjs', 'b.test.mjs', 'c.test.mjs', 'd.test.mjs', 'e.test.mjs'], table), ['e.test.mjs', 'c.test.mjs', 'd.test.mjs', 'b.test.mjs', 'a.test.mjs']);
    // One at a time, so each file has started before the next one does; `--test-force-exit` as the docs pass it.
    const child = spawnSync(process.execPath, [runner, '--shard-weights=durations.json', '--test-concurrency=1', '--test-force-exit', '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: '1/1' }, encoding: 'utf8' });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    assert.deepEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), ['e', 'c', 'd', 'b', 'a']);
    assert.match(child.stdout, /^# this shard starts its files longest first, by the weights: e\.test\.mjs, c\.test\.mjs, d\.test\.mjs, b\.test\.mjs, a\.test\.mjs$/m);
    // Its report still ends with each file's seconds, in name order.
    assert.deepEqual([...child.stdout.matchAll(/^# file-duration (\S+) \d+\.\d$/gm)].map((m) => m[1]), ['a.test.mjs', 'b.test.mjs', 'c.test.mjs', 'd.test.mjs', 'e.test.mjs']);
  });

  test('a run sharded by weights ends under --test-force-exit with its report written, and refuses a flag it would drop', () => {
    const dir = tempDir('node-test-weights-exit');
    fs.writeFileSync(path.join(dir, 'lingers.test.mjs'), "import { test } from 'node:test';\nsetInterval(() => {}, 1000);\ntest('lingers', () => {});\n");
    fs.writeFileSync(path.join(dir, 'durations.json'), '{}');
    const child = spawnSync(process.execPath, [runner, '--shard-weights=durations.json', '--test-force-exit', '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: '1/1' }, encoding: 'utf8', timeout: 60_000 });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    assert.match(child.stdout, /^# file-duration lingers\.test\.mjs \d+\.\d$/m);
    const options = { shown: 'tap', report: '/r.tap' };
    const config = inOrderConfig(['--test-force-exit', '--test-concurrency=3', '--test-timeout=5000', '--test-name-pattern=x'], ['b', 'a'], options);
    assert.deepEqual({ ...config, reporters: config.reporters.map((r) => r.destination) }, { files: ['b', 'a'], forceExit: true, only: false, concurrency: 3, timeout: 5000, testNamePatterns: ['x'], reporters: ['stdout', '/r.tap'] });
    assert.deepEqual(inOrderConfig(['--test-reporter=dot', '--test-reporter-destination=out.txt'], [], options).reporters[0], { reporter: 'dot', destination: 'out.txt' });
    for (const flags of [['--test-shard=1/2'], ['--experimental-test-coverage'], ['--test-concurrency=many']]) assert.throws(() => inOrderConfig(flags, [], options), /--test-/);
  });

  test('started longest first, every shared docs browser job of three CI runs takes less time, by the seconds its files ran', () => {
    // A job runs its files three at a time (`--test-concurrency` by default: CI's 4 cores less one), each as a place
    // comes free. In name order its time was close to what it took in CI; longest first, it is shorter, and never
    // under what three places can do (the longest file, or a third of the files' seconds).
    assert.equal(jobSeconds([10, 1, 1, 1, 9], 3), 10);
    assert.equal(jobSeconds([1, 1, 1, 9, 10], 3), 11);
    const { weights, jobs } = JSON.parse(fs.readFileSync(path.join(pkg, 'test/fixtures/docs-browser-jobs.json'), 'utf8'));
    const report = [];
    for (const [job, seconds] of Object.entries(jobs)) {
      const files = Object.keys(seconds);
      const before = jobSeconds([...files].sort().map((file) => seconds[file]), 3);
      const after = jobSeconds(longestFirst(files, weights).map((file) => seconds[file]), 3);
      const bound = Math.max(Object.values(seconds).reduce((sum, s) => sum + s, 0) / 3, ...Object.values(seconds));
      report.push(`${job}: ${Math.round(before)} → ${Math.round(after)} s (at best ${Math.round(bound)})`);
      assert.ok(after <= before && after >= bound - 1e-9, report.at(-1));
      // Within 2 % of the best three places can do, where name order lost up to a fifth.
      assert.ok(after <= bound * 1.02, report.at(-1));
    }
    const total = (order) => Object.values(jobs).reduce((sum, seconds) => sum + jobSeconds(order(Object.keys(seconds)).map((file) => seconds[file]), 3), 0);
    assert.ok(total((files) => longestFirst(files, weights)) < total((files) => [...files].sort()) * 0.9, report.join('\n'));
    // The job that reached its 20-minute limit: about 940 s of tests in name order, its 620 s page actions started last.
    const cut = jobs['45993351303 8/10'];
    assert.equal(Math.round(jobSeconds(Object.keys(cut).sort().map((file) => cut[file]), 3)), 939);
    assert.equal(Math.round(jobSeconds(longestFirst(Object.keys(cut), weights).map((file) => cut[file]), 3)), 721);
  });

  test('a failure in a run sharded by weights fails it, a describe body that throws among them', () => {
    for (const source of ["test('t', () => { throw new Error('plain'); });", "describe('reads a file', () => { throw new Error('ENOENT'); });"]) {
      const dir = tempDir('node-test-weights-fail');
      fs.writeFileSync(path.join(dir, 'case.test.mjs'), `import { describe, test } from 'node:test';\n${source}\n`);
      fs.writeFileSync(path.join(dir, 'durations.json'), '{}');
      const child = spawnSync(process.execPath, [runner, '--shard-weights=durations.json', '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: '1/1' }, encoding: 'utf8' });
      assert.notEqual(child.status, 0, `${child.stdout}${child.stderr}`);
      assert.match(child.stdout, /^# file-duration case\.test\.mjs \d+\.\d$/m);
    }
  });

  test('a file whose tests a helper module declares is timed as that file, not the helper', () => {
    const dir = tempDir('node-test-weights-helper');
    fs.writeFileSync(path.join(dir, 'helper.mjs'), "import { test } from 'node:test';\nexport function make(name) { test(name, () => {}); }\n");
    for (const name of ['light', 'dark']) fs.writeFileSync(path.join(dir, `${name}.test.mjs`), `import { make } from './helper.mjs';\nmake('${name}');\n`);
    fs.writeFileSync(path.join(dir, 'durations.json'), '{}');
    const child = spawnSync(process.execPath, [runner, '--shard-weights=durations.json', '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: '1/1' }, encoding: 'utf8' });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    assert.deepEqual([...child.stdout.matchAll(/^# file-duration (\S+) /gm)].map((m) => m[1]), ['dark.test.mjs', 'light.test.mjs']);
  });

  test('more shards than files: a shard with none runs nothing, and passes', () => {
    const dir = tempDir('node-test-weights-few');
    fs.writeFileSync(path.join(dir, 'only.test.mjs'), testFile('only'));
    fs.writeFileSync(path.join(dir, 'durations.json'), '{}');
    const child = spawnSync(process.execPath, [runner, '--shard-weights=durations.json', '*.test.mjs'], { cwd: dir, env: { ...childEnv(), TEST_SHARD: '2/2' }, encoding: 'utf8' });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    assert.doesNotMatch(child.stdout, /^ok \d+ - /m);
  });

  test('without TEST_SHARD the weights are not read, and every file runs', () => {
    const dir = tempDir('node-test-weights-all');
    for (const file of ['x.test.mjs', 'y.test.mjs']) fs.writeFileSync(path.join(dir, file), testFile(file));
    const child = spawnSync(process.execPath, [runner, '--shard-weights=missing.json', '*.test.mjs'], { cwd: dir, env: childEnv(), encoding: 'utf8' });
    assert.equal(child.status, 0, `${child.stdout}${child.stderr}`);
    assert.equal([...child.stdout.matchAll(/^ok \d+ - /gm)].length, 2);
  });

  test('the weights are measured again from the logs of a sharded run', () => {
    const logs = ['2026-10-26T12:00:00.0Z # file-duration test/a.test.mjs 61.4\nok 1 - a', '# file-duration test/a.test.mjs 58.6\n# file-duration test/new.test.mjs 12.2\r\n# file-duration test/quick.test.mjs 0.4'];
    const found = measured(logs);
    assert.deepEqual([...found], [['test/a.test.mjs', [61.4, 58.6]], ['test/new.test.mjs', [12.2]], ['test/quick.test.mjs', [0.4]]]);
    const next = refreshed({ $comment: 'seconds', 'b.test.mjs': 40, 'a.test.mjs': 50 }, found, (file) => file.replace(/^test\//, ''));
    // A file that ran for less than half a second weighs one: never 0.
    assert.deepEqual(Object.entries(next), [['$comment', 'seconds'], ['a.test.mjs', 60], ['b.test.mjs', 40], ['new.test.mjs', 12], ['quick.test.mjs', 1]]);
  });

  test('the docs’ browser tests are split by their weights file: seconds by file, and a comment that says where they come from', () => {
    const docs = path.join(root, 'apps/docs');
    assert.match(JSON.parse(fs.readFileSync(path.join(docs, 'package.json'), 'utf8')).scripts['test:browser'], /--shard-weights=test\/browser\/durations\.json /);
    const { $comment, $alone = [], ...table } = JSON.parse(fs.readFileSync(path.join(docs, 'test/browser/durations.json'), 'utf8'));
    assert.match($comment, /shard-weights\.js/);
    for (const [file, seconds] of Object.entries(table)) assert.ok(file.endsWith('.test.mjs') && Number.isFinite(seconds) && seconds > 0, `${file}: ${seconds}`);
    // A file that runs alone is a file the table weighs, and the CI job has a shard for each and one for the rest.
    for (const file of $alone) assert.ok(file in table, `$alone names ${file}, which the table does not weigh`);
    const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    const shards = Number(/docs-browser:[\s\S]*?shards: \[(\d+)\]/.exec(ci)?.[1]);
    assert.ok(shards > $alone.length, `ci.yml's docs browser job has ${shards} shards, and ${$alone.length} files run alone`);
    // The jobs that share the other files plan within a tenth of each other: a share far longer than the rest is the
    // job a slow runner cuts at its limit (measure the weights again, or give the job more shards).
    const files = fs.readdirSync(path.join(docs, 'test/browser')).filter((file) => file.endsWith('.test.mjs'));
    const shared = balance(files, { $alone, ...table }, shards).slice($alone.length).map((s) => s.seconds);
    const plan = `the shared jobs plan ${shared.map(Math.round).join(' / ')} s`;
    assert.ok(Math.max(...shared) - Math.min(...shared) <= Math.max(...shared) / 10, plan);
  });
});

test('a TAP report’s failures: at any depth, without the TODOs', () => {
  const tap = ['TAP version 13', '# Subtest: s', '    not ok 1 - inner', 'not ok 1 - s', 'ok 2 - fine', 'not ok 3 - later # TODO', 'ok 4 - skipped # SKIP', '# not ok 5 - a comment'].join('\n');
  assert.deepEqual(uncountedFailures(tap), ['not ok 1 - inner', 'not ok 1 - s']);
});

test('every package runs its Node tests through the runner, never `node --test` itself', () => {
  // A paused native platform keeps its scripts until it catches up (paused-platforms.json): its checks do not run.
  const { paused } = JSON.parse(fs.readFileSync(path.join(pkg, 'paused-platforms.json'), 'utf8'));
  const found = [];
  for (const group of ['apps', 'packages']) {
    for (const name of fs.readdirSync(path.join(root, group))) {
      const file = path.join(root, group, name, 'package.json');
      if (!fs.existsSync(file) || paused.includes(name)) continue;
      for (const [script, command] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')).scripts ?? {})) {
        if (/\bnode\s+--test\b/.test(command)) found.push(`${group}/${name} "${script}": ${command}`);
      }
    }
  }
  assert.deepEqual(found, [], 'run `node <path to packages/tools/src/run-node-tests.js> …` instead: it fails on a failure node --test reports and does not count');
});
