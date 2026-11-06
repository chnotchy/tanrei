// Harsh mode: a run that makes a timing race fail every time instead of once in fifty runs on a loaded CI runner.
//
// A test that is correct under real timing — it reads a motion in the task that starts it, waits for a condition and
// not for a time, holds the page clock for a timer — passes in harsh mode too. A test that reads a colour while a
// transition still runs, reads a 100 ms press-hold after a round trip, or measures a box while it moves does not.
//
//   TANREI_HARSH=1 pnpm --filter @tanrei/web test [files…] --project=chromium --grep-invert "snapshot: "
//
// What it does (playwright.config.ts reads this file; test/harsh/ holds the fixtures):
// - every engine: a gap around every input action (a click, press, hover, tap, fill, focus, a mouse or keyboard step):
//   - after it, so what a test reads after an action it reads that much later, as a loaded runner answers: a state
//     that lasts only press-hold (100 ms) after the action is gone by then;
//   - before it, so an action aimed with what the test read earlier (a box measured during a motion, a state seen a
//     moment ago) lands that much later, when the read may no longer be true.
// - Chromium: the page's animations and transitions played slower (CDP `Animation.setPlaybackRate`), so a single read
//   during a motion lands in the motion, not after it. Firefox and WebKit have no such rate; on request
//   (TANREI_HARSH_PAGE_MOTION=1) their pages' own animations are slowed instead (test/harsh/slow-motion.ts) — not by
//   default, because a motion the engine lists no animation for cannot be slowed from the page while one that runs
//   with it is (below).
// - Chromium: on request, the page's CPU slowed (`Emulation.setCPUThrottlingRate`).
// - Firefox: on request (TANREI_HARSH_FRAME=<ms>), a frame only every that many milliseconds (its `layout.frame_rate`),
//   so a test that takes a frame to have come soon after an event — a state a component writes in its next frame, read
//   a moment later — reads before it. The engine's own frame: its frame callbacks, style, layout, observers and paint
//   all come late together, as on a loaded machine. Chromium and WebKit have no such setting Playwright can reach
//   (Chromium's switches can turn the frame rate's limit off, not lower it), and a delay of the page's frame callbacks
//   alone would not be faithful: the frame they belong to would still be drawn on time, its resize observers would
//   still report in it (the waits in test/motions.ts count frames by them), and its transitions would start in it.
//   The page clock (`page.clock`) is untouched: a test that holds it counts time as before.
// - every engine: a test gets 4 times its time and an `expect` 3 times its own (15 s), for waits on slowed motion — a
//   time the test or its describe block sets itself (`test.setTimeout()`, `test.describe.configure({ timeout })`) is
//   multiplied too, or it would put the test back on its unslowed time. A timeout given to one call (an `expect`'s, an
//   action's `{ timeout }`) is not.
// - every engine, once a worker before its first test: harsh mode checks that its own slowing takes effect — that an
//   action of each kind (a locator's, an element handle's, the mouse's, the keyboard's, the touchscreen's) reaches the
//   page no sooner than the gap before it and returns no sooner than the gap after it, in the page's own clock, and that
//   the page's motion plays at the rate asked for — and fails every test of the worker, saying what did not, if not
//   (`checkHarsh`, test/harsh/playwright-test.ts). A gap that only Node waits for, or a rate the engine did not take, would
//   let a race pass harsh mode as it passes a fast machine.
//
// Each setting can be changed: TANREI_HARSH=1 takes the defaults below; TANREI_HARSH_BEFORE and TANREI_HARSH_AFTER
// (ms), TANREI_HARSH_CPU (the throttling rate, 1 = off) and TANREI_HARSH_MOTION (the playback rate, 1 = off) override
// one each; TANREI_HARSH_PAGE_MOTION=1 slows Firefox's and WebKit's motion as well, and TANREI_HARSH_FRAME (ms, 0 =
// off) makes Firefox's frames late.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlaywrightTestOptions, PlaywrightWorkerOptions, Project as AnyProject } from '@playwright/test';

type Project = AnyProject<PlaywrightTestOptions, PlaywrightWorkerOptions>;

export interface Harsh {
  /** Milliseconds waited before each input action, in every engine. */
  before: number;
  /** Milliseconds waited after each input action, in every engine. */
  after: number;
  /** Chromium's CPU throttling rate (`Emulation.setCPUThrottlingRate`); 1 is off. */
  cpu: number;
  /** Chromium's animation playback rate (`Animation.setPlaybackRate`); 1 is off, 0.1 plays a 150 ms transition in 1.5 s. */
  motion: number;
  /** Firefox and WebKit play their pages' own animations at `motion` too (test/harsh/slow-motion.ts). */
  pageMotion: boolean;
  /** Firefox draws a frame only every this many milliseconds (`layout.frame_rate`); 0 is off (its own rate). */
  frame: number;
}

/**
 * The defaults, chosen by measurement on the timing failures CI found, each run before and after its fix:
 * - 300 ms around an action is past press-hold (100 ms) with room for a slow round trip: a press-hold read too late
 *   (BRC-16) and a press aimed at a box measured while it moved (MDL-9) fail with it;
 * - motion played at a fifth of its speed (a 150 ms transition lasts 750 ms, the longest token, 1 s, lasts 5 s) is
 *   still running when a test that does not wait for it reads once: SEL-60 and TAB-45 fail with it;
 *   with both, the four old tests failed 4 runs in 4 each in Chromium, and their fixed versions passed 3 in 3 in
 *   Chromium, Firefox and WebKit. Firefox and WebKit have no motion rate: there the old BRC-16 failed 3 in 3, the old
 *   MDL-9 1 in 3 in Firefox, and the two motion reads passed.
 * - Firefox's and WebKit's motion slowed in the page (TANREI_HARSH_PAGE_MOTION=1) fails the races harsh mode's own tests
 *   hold (test/harsh/self/motion.self.ts) as Chromium does, and in a sample of eight suites (1090 tests in the two
 *   engines) failed one more test, CHF-17, which read where a label rests while it still moved after a change of
 *   variant (fixed). But it is not on by default: it also failed ACC-13 in both, a correct test. The height of a
 *   `<details>` element's content is a transition of its `::details-content`, which no engine lists and whose events
 *   reach no listener, so the page cannot slow it, while the item's clock that runs with it is slowed: the two drift
 *   apart, and the test, which compares them in every frame, sees a jump that is not there. Chromium's rate slows both.
 * - the CPU is NOT throttled by default: a slower page answers each round trip later, which gives a motion time to
 *   end before the read and hides the motion races above (the old SEL-60 failed 6 runs in 6 unthrottled, 1 in 6 at
 *   8×, 2 in 3 at 4×). Throttling is there for a race of another shape: TANREI_HARSH_CPU=4.
 * - Not caught: a read in the frame before a transition starts, which reads the old value exactly (the old LKC-34
 *   passed 4 in 4, and 6 in 6 at 12× CPU): nothing here delays a frame against the page's tasks.
 * - Not caught: a box read in the task after the motions the page can list have ended, while one it cannot list still
 *   moves for a frame or two — the height of a `<details>` element's content, which Chromium turns back a frame later
 *   than the chevron that turns with it. Whether the read lands in that frame is the round trip's length against the
 *   frame's: the old ACC-13 passed 3 in 3 here, 3 in 3 at TANREI_HARSH_MOTION=4 and 10 in 10 in scripts/ci-like.sh,
 *   though the first frame without a listed motion showed the height short in 7 of 10 runs at TANREI_HARSH_CPU=6.
 *   Read such a box with `boxAtRest` (test/at-rest.ts).
 */
export const HARSH_DEFAULTS: Harsh = { before: 300, after: 300, cpu: 1, motion: 0.2, pageMotion: false, frame: 0 };

const here = path.dirname(fileURLToPath(import.meta.url));

const number = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a number ≥ 0, not "${raw}"`);
  return value;
};

/** The harsh settings of this run, or undefined when TANREI_HARSH is not set. */
export const harsh: Harsh | undefined =
  process.env.TANREI_HARSH && process.env.TANREI_HARSH !== '0'
    ? {
        before: number('TANREI_HARSH_BEFORE', HARSH_DEFAULTS.before),
        after: number('TANREI_HARSH_AFTER', HARSH_DEFAULTS.after),
        cpu: Math.max(1, number('TANREI_HARSH_CPU', HARSH_DEFAULTS.cpu)),
        motion: number('TANREI_HARSH_MOTION', HARSH_DEFAULTS.motion) || 1,
        pageMotion: process.env.TANREI_HARSH_PAGE_MOTION ? process.env.TANREI_HARSH_PAGE_MOTION !== '0' : HARSH_DEFAULTS.pageMotion,
        frame: number('TANREI_HARSH_FRAME', HARSH_DEFAULTS.frame),
      }
    : undefined;

/**
 * Tests that harsh mode does not run, each by its title and with the reason. Only a test that legitimately measures
 * real time belongs here (a performance budget, a press that must stay shorter than a long press): harsh mode changes
 * real time on purpose. A test that fails in harsh mode for any other reason has a race to fix, not an exemption.
 */
export const HARSH_OPT_OUTS: readonly { title: RegExp; reason: string }[] = [];

/** The opt-outs as one pattern for a project's `grepInvert`. */
export const harshOptOuts = (): RegExp => (HARSH_OPT_OUTS.length ? new RegExp(HARSH_OPT_OUTS.map(({ title }) => `(?:${title.source})`).join('|')) : /(?!)/);

/**
 * A Playwright project as harsh mode runs it (as it is when harsh mode is off): without the tests it opts out of, and,
 * in Firefox with late frames asked for, at that frame rate. A test that sets its own launch options (a fixture's
 * `launchOptions`) sets them in place of these.
 */
export const harshProject = (project: Project): Project => {
  if (!harsh) return project;
  const use = project.use ?? {};
  const firefox = (use.browserName ?? use.defaultBrowserType) === 'firefox';
  return {
    ...project,
    grepInvert: [...[project.grepInvert ?? []].flat(), harshOptOuts()],
    ...(firefox && harsh.frame > 0
      ? {
          use: {
            ...use,
            launchOptions: {
              ...use.launchOptions,
              firefoxUserPrefs: { ...use.launchOptions?.firefoxUserPrefs, 'layout.frame_rate': Math.max(1, Math.round(1000 / harsh.frame)) },
            },
          },
        }
      : {}),
  };
};

/**
 * What a Playwright config takes from harsh mode (nothing when it is off): the tsconfig that puts test/harsh/ in place
 * of @playwright/test, and the test's time. playwright.config.ts and harsh mode's own tests (test/harsh/self/) read it.
 */
export const harshConfig = (): { tsconfig?: string; timeout?: number; expect?: { timeout: number } } =>
  harsh ? { tsconfig: path.join(here, 'harsh', 'tsconfig.json'), timeout: 30_000 * HARSH_TIMEOUT, expect: { timeout: 5_000 * HARSH_EXPECT_TIMEOUT } } : {};

/**
 * How many times its time a test gets in harsh mode: Playwright's default (30 s), or what the test or its describe
 * block sets (`test.setTimeout()`, `test.describe.configure({ timeout })`, which test/harsh/playwright-test.ts multiplies).
 */
export const HARSH_TIMEOUT = 4;
/** How many times its time an `expect` gets in harsh mode (Playwright's default, 5 s). */
export const HARSH_EXPECT_TIMEOUT = 3;
