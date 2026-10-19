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
// - Chromium: its animations and transitions played slower (CDP `Animation.setPlaybackRate`), so a single read during a
//   motion lands in the motion, not after it; on request, the page's CPU slowed (`Emulation.setCPUThrottlingRate`).
//   The page clock (`page.clock`) is untouched: a test that holds it counts time as before.
// - every engine: a test gets 4 times its time and an `expect` 3 times its own (15 s), for waits on slowed motion.
//
// Each setting can be changed: TANREI_HARSH=1 takes the defaults below; TANREI_HARSH_BEFORE and TANREI_HARSH_AFTER
// (ms), TANREI_HARSH_CPU (the throttling rate, 1 = off) and TANREI_HARSH_MOTION (the playback rate, 1 = off) override
// one each.

export interface Harsh {
  /** Milliseconds waited before each input action, in every engine. */
  before: number;
  /** Milliseconds waited after each input action, in every engine. */
  after: number;
  /** Chromium's CPU throttling rate (`Emulation.setCPUThrottlingRate`); 1 is off. */
  cpu: number;
  /** Chromium's animation playback rate (`Animation.setPlaybackRate`); 1 is off, 0.1 plays a 150 ms transition in 1.5 s. */
  motion: number;
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
export const HARSH_DEFAULTS: Harsh = { before: 300, after: 300, cpu: 1, motion: 0.2 };

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
