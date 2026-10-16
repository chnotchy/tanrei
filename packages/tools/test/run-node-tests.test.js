// A test file that fails to load, or a hook that throws, fails the run (src/run-node-tests.js). On Node 22.13 `node --test`
// prints such a suite as `not ok`, says `fail 0` and exits 0 — the docs app's suite on the head's font preloads once
// went unrun that way, with a green run, because a file it reads had not been generated.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { uncountedFailures } from '../src/run-node-tests.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(pkg, '../..');
const runner = path.join(pkg, 'src/run-node-tests.js');

/** This process's environment for a child `node --test` of its own (not a subtest of this run). */
function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
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
