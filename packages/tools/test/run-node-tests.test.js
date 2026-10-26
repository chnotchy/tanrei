// A test file that fails to load, or a hook that throws, fails the run (src/run-node-tests.js). On Node 22.13 `node --test`
// prints such a suite as `not ok`, says `fail 0` and exits 0 — the docs app's suite on the head's font preloads once
// went unrun that way, with a green run, because a file it reads had not been generated.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { balance, shard, uncountedFailures } from '../src/run-node-tests.js';
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
    const logs = ['2026-10-26T12:00:00.0Z # file-duration test/a.test.mjs 61.4\nok 1 - a', '# file-duration test/a.test.mjs 58.6\n# file-duration test/new.test.mjs 12.2\r'];
    const found = measured(logs);
    assert.deepEqual([...found], [['test/a.test.mjs', [61.4, 58.6]], ['test/new.test.mjs', [12.2]]]);
    const next = refreshed({ $comment: 'seconds', 'b.test.mjs': 40, 'a.test.mjs': 50 }, found, (file) => file.replace(/^test\//, ''));
    assert.deepEqual(Object.entries(next), [['$comment', 'seconds'], ['a.test.mjs', 60], ['b.test.mjs', 40], ['new.test.mjs', 12]]);
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
