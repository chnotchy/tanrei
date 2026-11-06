// Harsh mode's own tests (test/harsh.ts says what harsh mode is). The Playwright tests in test/harsh/self/ are run with
// harsh mode off and on, in the three engines, and each must end as this file says: a race (a test that is wrong on
// purpose, titled "race: …") passes with harsh mode off and fails with it on — harsh mode makes it lose — while a sound
// test passes in both, and a check of harsh mode by itself passes where it applies. A race that harsh mode no longer
// fails is a hole in harsh mode, and so is one that also fails with it off for another reason (it would prove nothing).
//
// How a race ends must not hang on how fast the machine is. Where a race can be built so, it is: a fade read a while
// after it started, counted in the page from its start, passes with harsh mode off on any machine. Where it cannot — a
// press-hold read after the click's round trip, a state written in the next frame read a fixed time after the click: a
// loaded machine may take longer than the race allows — the race notes in the page whether the timing it takes for
// granted held (the hold had not ended by the read, the frame had come by it), and says so when it did not
// (test/harsh/self/late.ts). It ends "late" when it said so, whether it then failed or passed: with harsh mode off it
// must pass or be late, never fail otherwise, and where harsh mode makes it lose it must be late. The races that read
// late are listed in the run's diagnostics, and so is the error of every test that ended other than the table says.
//
//   node --test test/harsh-self.test.mjs        (part of `test:node`; the browsers Playwright installed are needed)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINES = ['chromium', 'firefox', 'webkit'];

const CHROMIUM_ONLY_FAILS = { chromium: 'failed', firefox: 'passed', webkit: 'passed' };

/** A race that nothing makes lose, whose read a loaded machine may still make late. */
const ON_TIME_OR_LATE = 'passed or late';

/**
 * How each test ends, by run and engine — 'passed', 'failed', 'late' (a race that failed saying it read late) or
 * 'skipped', or either of two as 'a or b' — for all three, or one per engine. The runs: `plain` (harsh mode off),
 * `harsh` (its defaults) and `options` (its defaults and every option it has on: `OPTIONS`; a test that says nothing
 * for it ends as in `harsh`).
 * @type {Record<string, Record<string, string | Record<string, string>>>}
 */
const EXPECTED = {
  'race: a press-hold read after the click returns': { plain: ON_TIME_OR_LATE, harsh: 'late' },
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
  // Only Firefox's frames can be made late (TANREI_HARSH_FRAME); by default they are not, and the race passes unless the
  // machine is late with a frame by itself.
  'race: a state written in the next frame, read 80 ms after the click': {
    plain: ON_TIME_OR_LATE,
    harsh: ON_TIME_OR_LATE,
    options: { chromium: ON_TIME_OR_LATE, firefox: 'late', webkit: ON_TIME_OR_LATE },
  },
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
 * Runs harsh mode's own tests with the given environment, and returns how each ended, keyed `<engine> › <title>`, what
 * each race that read late said of it, and the error of each test that failed.
 * @param {Record<string, string | undefined>} env
 * @returns {{ ended: Record<string, string>, lateness: Record<string, string>, errors: Record<string, string> }}
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
  /** @type {Record<string, string>} */
  const lateness = {};
  /** @type {Record<string, string>} */
  const errors = {};
  const walk = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const each of spec.tests) {
        const key = `${each.projectName} › ${spec.title}`;
        const last = each.results.at(-1);
        const status = last?.status === 'timedOut' || last?.status === 'interrupted' ? 'failed' : (last?.status ?? 'skipped');
        const late = [...(last?.annotations ?? []), ...(each.annotations ?? [])].find(({ type }) => type === 'late');
        if (late) lateness[key] = `it ${status}, ${late.description}`;
        if (status === 'failed') errors[key] = (last?.errors ?? []).map(({ message }) => message ?? '').join('\n') || `${last?.status ?? 'no result'}`;
        ended[key] = late && (status === 'failed' || status === 'passed') ? 'late' : status;
      }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites) walk(suite);
  return { ended, lateness, errors };
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

/**
 * Runs harsh mode's own tests in `mode` and compares how they ended with the table. An end the table allows as one of
 * two ('passed or late') is shown in the table's words, so a difference shows only what does not match.
 * @param {import('node:test').TestContext} t
 * @param {'plain' | 'harsh' | 'options'} mode
 * @param {Record<string, string>} env
 */
function check(t, mode, env) {
  const { ended, lateness, errors } = run(env);
  const want = wanted(mode);
  for (const [key, said] of Object.entries(lateness)) t.diagnostic(`${key}: ${ended[key]}, ${said}`);
  const seen = Object.fromEntries(Object.entries(ended).map(([key, end]) => [key, want[key]?.split(' or ').includes(end) ? want[key] : end]));
  for (const [key, end] of Object.entries(seen)) if (end !== want[key] && errors[key]) t.diagnostic(`${key}: ${end}, not ${want[key] ?? 'in the table'}: ${stripVTControlCharacters(errors[key])}`);
  assert.deepEqual(seen, want);
}

test('harsh mode: its own tests end as they must with it off — every race passes or reads late', (t) => {
  check(t, 'plain', {});
});

test('harsh mode: its own tests end as they must with it on — every race fails, every sound test passes', (t) => {
  check(t, 'harsh', { TANREI_HARSH: '1' });
});

test('harsh mode: its own tests end as they must with every option on', (t) => {
  check(t, 'options', { TANREI_HARSH: '1', ...OPTIONS });
});
