// The web's CI shards are split by measured time (src/playwright-shards.js) and the times measured again from a full
// run's report (src/playwright-durations.js). What must hold: every listed test is in exactly one shard, a file nobody
// measured still runs, a file longer than a shard's share is cut by its top-level blocks, and a report that ran a file
// only in part does not measure it.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { measuredRuns, refreshedDurations } from '../src/playwright-durations.js';
import { coverage, split, testsOf } from '../src/playwright-shards.js';

/** A Playwright JSON list: files → their top-level blocks → `n` tests each, in each project; `at` for a helper's tests. */
function list(files, projects = ['chromium']) {
  return {
    suites: Object.entries(files).map(([file, blocks]) => ({
      title: file,
      file,
      specs: [],
      suites: Object.entries(blocks).map(([title, { n, at }]) => ({
        title,
        file,
        specs: Array.from({ length: n }, (_, k) => ({ title: `${title} test ${k}`, file: at ?? file, tests: projects.map((projectName) => ({ projectName, results: [] })) })),
      })),
    })),
  };
}

describe('the web shards split by measured time', () => {
  test('every test is in exactly one shard, and the shards are about equal', () => {
    const tests = testsOf(list({ 'a.test.ts': { A: { n: 3 } }, 'b.test.ts': { B: { n: 3 } }, 'c.test.ts': { C: { n: 3 } }, 'd.test.ts': { D: { n: 3 } } }));
    const shards = split(tests, { chromium: { 'a.test.ts': 30, 'b.test.ts': 20, 'c.test.ts': 10, 'd.test.ts': 20 } }, 2);
    assert.deepEqual(
      shards.map((s) => s.seconds),
      [40, 40],
    );
    assert.deepEqual(coverage(tests, shards.map((s) => s.lines)), { none: [], several: [] });
  });

  test('a file the durations do not name weighs its project median, and is named in the log', () => {
    const tests = testsOf(list({ 'a.test.ts': { A: { n: 1 } }, 'b.test.ts': { B: { n: 1 } }, 'c.test.ts': { C: { n: 1 } }, 'new.test.ts': { N: { n: 1 } } }));
    const shards = split(tests, { chromium: { 'a.test.ts': 10, 'b.test.ts': 20, 'c.test.ts': 60 } }, 2);
    const mine = shards.find((s) => s.units.includes('new.test.ts'));
    assert.deepEqual(mine.guessed, ['new.test.ts']);
    assert.equal(
      shards.reduce((a, s) => a + s.seconds, 0),
      110,
    );
    assert.deepEqual(coverage(tests, shards.map((s) => s.lines)), { none: [], several: [] });
  });

  test('a file longer than a shard’s share is dealt by its top-level blocks', () => {
    const tests = testsOf(list({ 'big.test.ts': { one: { n: 2 }, two: { n: 2 } }, 'small.test.ts': { S: { n: 1 } } }));
    const shards = split(tests, { chromium: { 'big.test.ts': 80, 'small.test.ts': 20 } }, 2);
    assert.deepEqual(
      shards.map((s) => s.lines),
      [['big.test.ts › one', 'small.test.ts'], ['big.test.ts › two']],
    );
    assert.deepEqual(coverage(tests, shards.map((s) => s.lines)), { none: [], several: [] });
  });

  test('the first shard starts with the seconds of its other work, and the dealing counts them', () => {
    const tests = testsOf(list({ 'a.test.ts': { A: { n: 1 } }, 'b.test.ts': { B: { n: 1 } }, 'c.test.ts': { C: { n: 1 } }, 'd.test.ts': { D: { n: 1 } } }));
    const shards = split(tests, { chromium: { 'a.test.ts': 30, 'b.test.ts': 20, 'c.test.ts': 10, 'd.test.ts': 20 } }, 2, { first: 20 });
    assert.deepEqual(
      shards.map((s) => [s.seconds, s.before]),
      [
        [30, 20],
        [50, 0],
      ],
    );
    assert.deepEqual(coverage(tests, shards.map((s) => s.lines)), { none: [], several: [] });
  });

  test('a selection weighs a file it matches in part by its share of the file’s tests', () => {
    const every = testsOf(list({ 'all.test.ts': { one: { n: 3 }, two: { n: 1 } }, 'own.test.ts': { O: { n: 2 } } }));
    // The grep matches one test of all.test.ts (the block `two`) and the whole of own.test.ts.
    const tests = every.filter((t) => t.file === 'own.test.ts' || t.titles[0] === 'two');
    const durations = { chromium: { 'all.test.ts': 80, 'own.test.ts': 20 } };
    const shards = split(tests, durations, 2, { every });
    assert.deepEqual(
      shards.map((s) => s.seconds).sort((a, b) => a - b),
      [20, 20],
    );
    assert.deepEqual(coverage(tests, shards.map((s) => s.lines)), { none: [], several: [] });
    assert.deepEqual(
      split(tests, durations, 2).map((s) => s.seconds).sort((a, b) => a - b),
      [20, 80],
      'without the list of every test the part weighs the whole file',
    );
  });

  test('a test declared in a helper module is selected by the helper’s path, its file’s line loading the file', () => {
    const tests = testsOf(list({ 'bar.test.ts': { own: { n: 1 }, shared: { n: 2, at: '../test/helper.ts' } } }));
    const [only] = split(tests, { chromium: { 'bar.test.ts': 5 } }, 1);
    assert.deepEqual(only.lines, ['../test/helper.ts › shared', 'bar.test.ts']);
    assert.deepEqual(coverage(tests, [only.lines]).none, []);
    assert.equal(coverage(tests, [['bar.test.ts']]).none.length, 2, 'without the helper line its tests run nowhere');
  });

  test('an anonymous describe adds no title, as in Playwright’s title path', () => {
    const report = { suites: [{ title: 'a.test.ts', file: 'a.test.ts', suites: [{ title: '', specs: [{ title: 't', file: 'a.test.ts', tests: [{ projectName: 'chromium' }] }] }] }] };
    assert.deepEqual(testsOf(report)[0].titles, ['t']);
  });

  test('coverage finds a test in no shard and one in two', () => {
    const tests = testsOf(list({ 'a.test.ts': { A: { n: 1 } }, 'b.test.ts': { B: { n: 1 } } }));
    assert.deepEqual(coverage(tests, [['a.test.ts'], ['a.test.ts › A']]), { none: ['[chromium] b.test.ts › B › B test 0'], several: ['[chromium] a.test.ts › A › A test 0'] });
  });

  test('a project the durations do not name fails the split', () => {
    const tests = testsOf(list({ 'a.test.ts': { A: { n: 1 } } }, ['webkit']));
    assert.throws(() => split(tests, { chromium: {} }, 1), /no seconds for the project "webkit"/);
  });
});

describe('the web shards’ durations measured again', () => {
  const result = (duration) => ({ duration });
  const report = {
    suites: [
      { title: 'a.test.ts', file: 'a.test.ts', specs: [{ title: 't', file: 'a.test.ts', tests: [{ projectName: 'chromium', results: [result(1500), result(500)] }] }] },
      { title: 'b.test.ts', file: 'b.test.ts', specs: [{ title: 't', file: 'b.test.ts', tests: [{ projectName: 'chromium', results: [result(3000)] }] }, { title: 'u', file: 'b.test.ts', tests: [{ projectName: 'chromium', results: [] }] }] },
    ],
  };

  test('a file is the sum of its tests’ attempts; a file run in part is not measured', () => {
    assert.deepEqual([...measuredRuns([report]).get('chromium')], [['a.test.ts', [2]]]);
  });

  test('what was not measured keeps its seconds, and the comment stays first', () => {
    const next = refreshedDurations({ $comment: 'c', webkit: { 'a.test.ts': 9 }, chromium: { 'b.test.ts': 7, 'a.test.ts': 1 } }, measuredRuns([report, report]));
    assert.deepEqual(Object.keys(next), ['$comment', 'chromium', 'webkit']);
    assert.deepEqual(next.chromium, { 'a.test.ts': 2, 'b.test.ts': 7 });
    assert.deepEqual(next.webkit, { 'a.test.ts': 9 });
  });
});
