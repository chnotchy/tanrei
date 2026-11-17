// Harsh mode: a run that makes a timing race fail every time instead of once in fifty runs on a loaded CI runner.
//
// A test that is correct under real timing — it reads a motion in the task that starts it, waits for a condition and
// not for a time, holds the page clock for a timer — passes in harsh mode too. A test that reads a colour while a
// transition still runs, reads a short state after a round trip, reads a resting look while a press-hold still runs,
// or measures a box while it moves does not.
//
//   TANREI_HARSH=1 pnpm --filter @tanrei/web test [files…] --project=chromium --grep-invert "snapshot: "
//
// What it does (playwright.config.ts reads this file; test/harsh/ holds the fixtures):
// - every engine: a gap around every input action (a click, press, hover, tap, fill, focus, a mouse or keyboard step):
//   - after it, so what a test reads after an action it reads that much later, as a loaded runner answers: a state
//     that lasts only 100 ms after the action is gone by then;
//   - before it, so an action aimed with what the test read earlier (a box measured during a motion, a state seen a
//     moment ago) lands that much later, when the read may no longer be true.
// - every engine: press-hold (`sys.motion.duration.press-hold`, 100 ms) made longer by twice the gap after an action
//   (`pressHold`), so a released press keeps its pressed look past the gap and a read after the action lands in the
//   hold, as it does on a fast machine. Without it the gap would end the hold before every read, and a test that reads
//   a resting look after a click without waiting for the hold to end would pass here while it fails on a fast machine.
//   The token is lengthened in the page: the generated sheets' rules that declare it, declared again with the time added
//   (`pressHoldRules`, test/harsh/press-hold.ts). A test that reads the token reads the lengthened hold; a test that
//   checks the system's own value compares with `pressHoldAsRun()`. The other race — a component's press-hold read
//   after an action's round trip, taking it to last — wins against a hold this long: TANREI_HARSH_PRESS_HOLD=0 leaves
//   the hold as it is, and the gap makes that race lose instead.
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
//   page no sooner than the gap before it and returns no sooner than the gap after it, in the page's own clock, that
//   the page's motion plays at the rate asked for, and that press-hold is as long as it was made — and fails every test of the worker, saying what did not, if not
//   (`checkHarsh`, test/harsh/playwright-test.ts). A gap that only Node waits for, or a rate the engine did not take, would
//   let a race pass harsh mode as it passes a fast machine.
//
// Each setting can be changed: TANREI_HARSH=1 takes the defaults below; TANREI_HARSH_BEFORE and TANREI_HARSH_AFTER
// (ms), TANREI_HARSH_CPU (the throttling rate, 1 = off), TANREI_HARSH_MOTION (the playback rate, 1 = off) and
// TANREI_HARSH_PRESS_HOLD (ms added to press-hold, 0 = off; twice the gap after an action unless set) override one
// each; TANREI_HARSH_PAGE_MOTION=1 slows Firefox's and WebKit's motion as well, and TANREI_HARSH_FRAME (ms, 0 =
// off) makes Firefox's frames late.

import fs from 'node:fs';
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
  /** Milliseconds added to press-hold (`sys.motion.duration.press-hold`) in every engine; 0 is off. */
  pressHold: number;
}

/**
 * How much longer harsh mode makes press-hold, given the gap after an action: twice the gap. A press released by an
 * action stays pressed for the gap, which the read after the action waits, and as much again, for the read's own round
 * trip on a loaded machine, so that read lands in the hold.
 */
export const pressHoldFor = (after: number): number => 2 * after;

/**
 * The defaults, chosen by measurement on the timing failures CI found, each run before and after its fix:
 * - 300 ms around an action is past press-hold (100 ms) with room for a slow round trip: a press-hold read too late
 *   (BRC-16) and a press aimed at a box measured while it moved (MDL-9) fail with it;
 * - motion played at a fifth of its speed (a 150 ms transition lasts 750 ms, the longest token, 1 s, lasts 5 s) is
 *   still running when a test that does not wait for it reads once: SEL-60 and TAB-45 fail with it;
 *   with both, the four old tests failed 4 runs in 4 each in Chromium, and their fixed versions passed 3 in 3 in
 *   Chromium, Firefox and WebKit. Firefox and WebKit have no motion rate: there the old BRC-16 failed 3 in 3, the old
 *   MDL-9 1 in 3 in Firefox, and the two motion reads passed. (Measured before press-hold was made longer: a read
 *   like the old BRC-16's, of a component's press-hold, loses now with TANREI_HARSH_PRESS_HOLD=0.)
 * - press-hold made longer by twice the gap after an action (100 ms becomes 700 ms): with the hold at its own length a
 *   read after an action always came after the hold had ended, so a test that read a resting look after a click without
 *   waiting for the hold passed here and failed on a fast machine in every engine. Harsh mode's own race of it
 *   (test/harsh/self/press-hold.self.ts) read 304 to 634 ms after the release and passed 9 runs in 9 in the three
 *   engines with the hold at its own length (TANREI_HARSH_PRESS_HOLD=0), and read 317 to 349 ms after it and failed 9
 *   in 9 with it at 700 ms.
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
export const HARSH_DEFAULTS: Harsh = { before: 300, after: 300, cpu: 1, motion: 0.2, pageMotion: false, frame: 0, pressHold: pressHoldFor(300) };

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
        pressHold: number('TANREI_HARSH_PRESS_HOLD', pressHoldFor(number('TANREI_HARSH_AFTER', HARSH_DEFAULTS.after))),
      }
    : undefined;

/**
 * Press-hold as this run makes it, given its own length in ms: longer by `pressHold` in harsh mode, as it is otherwise.
 * A test that checks the system's own value of the token (`expect(hold).toBe(pressHoldAsRun(100))`) compares with it.
 */
export const pressHoldAsRun = (own: number): number => own + (harsh?.pressHold ?? 0);

/** The custom property that holds press-hold, and the token sheets that declare it (the package's generated ones). */
const PRESS_HOLD = '--tanrei-sys-motion-duration-press-hold';
const generated = path.join(here, '..', 'src', 'generated');

/**
 * Each rule of the generated token sheets (the default system's and every preset's) that declares press-hold: its
 * selector and the value it declares, in the order the sheets cascade (the default system's first). A declaration
 * anywhere but directly in a rule of the `@layer` the sheet is wrapped in (in an `@media`, say) is not one harsh mode
 * can declare again as it stands, and throws, naming it, rather than leave that hold at its own length.
 */
export function pressHoldDeclarations(): { selector: string; value: string }[] {
  const sheets = [path.join(generated, 'tokens.css'), ...fs.readdirSync(path.join(generated, 'systems')).filter((name) => name.endsWith('.css')).sort().map((name) => path.join(generated, 'systems', name))];
  const found: { selector: string; value: string }[] = [];
  for (const sheet of sheets) {
    const open: string[] = [];
    for (const line of fs.readFileSync(sheet, 'utf8').split('\n')) {
      const text = line.trim();
      if (text.endsWith('{')) open.push(text.slice(0, -1).trim());
      else if (text === '}') open.pop();
      else if (text.startsWith(`${PRESS_HOLD}:`)) {
        if (open.length !== 2 || !open[0]!.startsWith('@layer ') || open[1]!.startsWith('@'))
          throw new Error(`harsh mode cannot make press-hold longer where ${path.relative(path.join(here, '..'), sheet)} declares it, in ${open.join(' › ') || 'no rule'}: it declares again only a rule in the sheet's @layer (test/harsh.ts, pressHoldDeclarations)`);
        found.push({ selector: open[1]!, value: text.slice(PRESS_HOLD.length + 1).replace(/;$/, '').trim() });
      }
    }
  }
  if (!found.length) throw new Error(`harsh mode found no declaration of ${PRESS_HOLD} in ${path.relative(path.join(here, '..'), generated)}: has the token been renamed? (test/harsh.ts, pressHoldDeclarations)`);
  return found;
}

/**
 * The stylesheet by which harsh mode makes press-hold `extra` ms longer: each rule of the generated sheets that declares
 * it, declared again with `extra` added, outside any layer. So it holds on every element where the token sheets set
 * the hold (the root, a contrast or a system scope), follows the motion dial as the token does, and gives way where the
 * token sheets give way too: to a value a test writes on the root's own style.
 */
export const pressHoldRules = (extra: number): string =>
  pressHoldDeclarations()
    .map(({ selector, value }) => `${selector} { ${PRESS_HOLD}: calc(${value} + ${extra}ms); }`)
    .join('\n');

/**
 * Tests that harsh mode does not run, each by its title and with the reason. Only a test that legitimately measures
 * real time belongs here (a performance budget, a press that must stay shorter than a long press): harsh mode changes
 * real time on purpose. A test that fails in harsh mode for any other reason has a race to fix, not an exemption.
 */
export const HARSH_OPT_OUTS: readonly { title: RegExp; reason: string }[] = [];

/**
 * The annotation by which a test asks harsh mode to leave its pages' motion at its own speed (the gaps around input
 * actions stay): `test.describe(title, motionAtItsOwnSpeed(reason), …)` or `test(title, motionAtItsOwnSpeed(reason), …)`.
 * Only a test that counts the engine's own work belongs here, and says why. Chromium's motion rate is set over the
 * DevTools protocol's Animation domain, and with that domain on the engine works differently: it skips one forced
 * style pass for each motion a component holds to its next frame and plays on in that frame's callback
 * (`startFromNextFrame`). perf-budget.test.ts counted 180 forced passes fewer from ten dialogs to a hundred with it on
 * than a product's page makes. A test that reads a motion has a race to fix, not this.
 */
export const MOTION_AT_ITS_OWN_SPEED = 'harsh mode: motion at its own speed';
export const motionAtItsOwnSpeed = (reason: string) => ({ annotation: { type: MOTION_AT_ITS_OWN_SPEED, description: reason } });

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
