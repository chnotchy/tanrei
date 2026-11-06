// Harsh mode's own tests (test/harsh.ts says what harsh mode is). The Playwright tests in test/harsh/self/ are run with
// harsh mode off and on, in the three engines, and each must end as this file says: a race (a test that is wrong on
// purpose, titled "race: …") passes with harsh mode off and fails with it on — harsh mode makes it lose — while a sound
// test passes in both, and a check of harsh mode by itself passes where it applies. A race that harsh mode no longer
// fails is a hole in harsh mode, and so is one that also fails with it off (it would prove nothing).
//
//   node --test test/harsh-self.test.mjs        (part of `test:node`; the browsers Playwright installed are needed)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINES = ['chromium', 'firefox', 'webkit'];

const CHROMIUM_ONLY_FAILS = { chromium: 'failed', firefox: 'passed', webkit: 'passed' };

/**
 * How each test ends, by run and engine: 'passed', 'failed' or 'skipped' for all three, or one per engine. The runs:
 * `plain` (harsh mode off), `harsh` (its defaults) and `options` (its defaults and every option it has on: `OPTIONS`;
 * a test that says nothing for it ends as in `harsh`).
 * @type {Record<string, Record<string, string | Record<string, string>>>}
 */
const EXPECTED = {
  'race: a press-hold read after the click returns': { plain: 'passed', harsh: 'failed' },
  'sound: a press-hold read while the pointer holds it': { plain: 'passed', harsh: 'passed' },
  'check: the self-check refuses gaps shorter than it was told to expect': { plain: 'skipped', harsh: 'passed' },
  'check: the self-check passes the gaps the run gives': { plain: 'skipped', harsh: 'passed' },
  // Firefox and WebKit play motion at its own speed unless asked (TANREI_HARSH_PAGE_MOTION=1): a motion race passes there.
  'race: a fade read once, a while after the click that starts it': { plain: 'passed', harsh: CHROMIUM_ONLY_FAILS, options: 'failed' },
  'race: a fade in a shadow root read once, a while after the click that starts it': { plain: 'passed', harsh: CHROMIUM_ONLY_FAILS, options: 'failed' },
  'race: a scripted fade read once, a while after the click that starts it': { plain: 'passed', harsh: CHROMIUM_ONLY_FAILS, options: 'failed' },
  'sound: a fade waited for until it ends': { plain: 'passed', harsh: 'passed' },
  'sound: a page reads and sets its animations’ playback rates as it knows them': { plain: 'passed', harsh: 'passed' },
  'check: the self-check refuses a motion rate it was not given': { plain: 'skipped', harsh: { chromium: 'passed', firefox: 'skipped', webkit: 'skipped' }, options: 'passed' },
  // Only Firefox's frames can be made late (TANREI_HARSH_FRAME); by default they are not, and the race passes.
  'race: a state written in the next frame, read 80 ms after the click': { plain: 'passed', harsh: 'passed', options: { chromium: 'passed', firefox: 'failed', webkit: 'passed' } },
  'sound: a state written in the next frame, read two frames after the click': { plain: 'passed', harsh: 'passed' },
  'check: the self-check refuses frames that come sooner than it was told to expect': { plain: 'skipped', harsh: 'skipped', options: { chromium: 'skipped', firefox: 'passed', webkit: 'skipped' } },
  'check: the guard refuses a method it names that the class does not have': { plain: 'skipped', harsh: 'passed' },
  'check: the guard refuses an input action it does not name, in a class of input actions': { plain: 'skipped', harsh: 'passed' },
  'check: the guard wraps what it names, and the action waits the gaps': { plain: 'skipped', harsh: 'passed' },
  'check: a test that sets no time gets the config’s, multiplied': { plain: 'passed', harsh: 'passed' },
  'check: test.setTimeout() in a test is multiplied': { plain: 'passed', harsh: 'passed' },
  'check: test.setTimeout(0) stays no timeout': { plain: 'passed', harsh: 'passed' },
  'check: test.slow() triples the multiplied time': { plain: 'passed', harsh: 'passed' },
  'check: test.setTimeout() in a describe block is multiplied': { plain: 'passed', harsh: 'passed' },
  'check: test.describe.configure({ timeout }) is multiplied': { plain: 'passed', harsh: 'passed' },
  'check: test.setTimeout() of a test extended from harsh mode’s is multiplied': { plain: 'passed', harsh: 'passed' },
  'check: the guard refuses a test with no test type to multiply on': { plain: 'passed', harsh: 'passed' },
};

/**
 * Runs harsh mode's own tests with the given environment, and returns how each ended, keyed `<engine> › <title>`.
 * @param {Record<string, string | undefined>} env
 */
function run(env) {
  const result = spawnSync(process.execPath, [path.join(pkg, 'node_modules/@playwright/test/cli.js'), 'test', '-c', 'test/harsh/self/playwright.config.ts', '--reporter=json', '--workers=3'], {
    cwd: pkg,
    env: { ...process.env, CI: '', TANREI_HARSH: '', ...env },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    assert.fail(`Playwright gave no JSON report (exit ${result.status}):\n${result.stderr}\n${result.stdout.slice(0, 4000)}`);
  }
  assert.deepEqual(report.errors ?? [], [], 'the run itself failed');
  /** @type {Record<string, string>} */
  const ended = {};
  const walk = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const each of spec.tests) {
        const last = each.results.at(-1);
        ended[`${each.projectName} › ${spec.title}`] = last?.status === 'timedOut' || last?.status === 'interrupted' ? 'failed' : (last?.status ?? 'skipped');
      }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites) walk(suite);
  return ended;
}

/** Harsh mode's options, all on, for the `options` run. */
const OPTIONS = { TANREI_HARSH_PAGE_MOTION: '1', TANREI_HARSH_FRAME: '250' };

/** @param {'plain' | 'harsh' | 'options'} mode */
const wanted = (mode) =>
  Object.fromEntries(
    Object.entries(EXPECTED).flatMap(([title, modes]) =>
      ENGINES.map((engine) => {
        const ends = modes[mode] ?? modes.harsh;
        return [`${engine} › ${title}`, typeof ends === 'string' ? ends : ends[engine]];
      }),
    ),
  );

test('harsh mode: its own tests end as they must with it off — every race passes', () => {
  assert.deepEqual(run({}), wanted('plain'));
});

test('harsh mode: its own tests end as they must with it on — every race fails, every sound test passes', () => {
  assert.deepEqual(run({ TANREI_HARSH: '1' }), wanted('harsh'));
});

test('harsh mode: its own tests end as they must with every option on', () => {
  assert.deepEqual(run({ TANREI_HARSH: '1', ...OPTIONS }), wanted('options'));
});
