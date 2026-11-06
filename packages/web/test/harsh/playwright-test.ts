// @playwright/test as harsh mode serves it (test/harsh.ts says what harsh mode is). Only a harsh run loads this file:
// its tsconfig maps the module name here, so the tests and the shared helpers need no change. Everything is the real
// module's, except `test`, whose fixtures
// - put a gap before and after every input action, in every engine (once a worker, on the client's own classes: a
//   locator's and a page's actions go through its frame, and the mouse, the keyboard and the touchscreen are their own);
// - slow every page the test opens — the `page` fixture's, a page of a context the test makes itself, a popup —
//   before the test can use it (`newPage()` resolves once it is slowed; a popup is slowed as it appears);
// - check, once a worker before its first test, that all of this takes effect (`checkHarsh`), and fail the worker's
//   tests if it does not.
import type { Browser, BrowserContext, Page, test as realTest } from '@playwright/test';
import * as real from '../../node_modules/@playwright/test/index.mjs';
import { HARSH_TIMEOUT, type Harsh, harsh } from '../harsh.js';
import { slowMotion } from './slow-motion.js';

// The real module is reached by its file, past the mapping of its name to this one; a type checker follows that file's
// re-export only from its real path in the store, not from the link, so its `test` is typed here as the name's.
const base = (real as unknown as { test: typeof realTest }).test;

export * from '../../node_modules/@playwright/test/index.mjs';

/** A test's time as harsh mode gives it: `HARSH_TIMEOUT` times the time asked for (0, no timeout, stays 0). */
const longer = (timeout: number) => (timeout > 0 ? timeout * HARSH_TIMEOUT : timeout);

type TestTypePrototype = { _setTimeout?: (location: unknown, timeout: number) => void; _configure?: (location: unknown, options: { timeout?: number }) => void };

/**
 * The prototype of the test type behind `test`: its methods are what `test.setTimeout()` and
 * `test.describe.configure()` call (in a describe block, they set the block's time; in a test or a hook, its own). It is
 * reached through the symbol Playwright keys it by on `test`. Throws, naming what is missing, if it is not there.
 */
export function testTypePrototype(of: object): Required<TestTypePrototype> {
  const key = Object.getOwnPropertySymbols(of).find((symbol) => symbol.description === 'testType');
  const type = key === undefined ? undefined : (of as Record<symbol, object | undefined>)[key];
  const proto = (type && Object.getPrototypeOf(type)) as TestTypePrototype | undefined;
  if (typeof proto?._setTimeout !== 'function' || typeof proto._configure !== 'function')
    throw new Error(
      `harsh mode found nothing to multiply a test's own time on: Playwright's test has no ${key === undefined ? 'test type (Symbol(testType))' : 'TestTypeImpl._setTimeout or _configure'} — has it renamed them? Without them test.setTimeout() puts a test back on its unslowed time (test/harsh/playwright-test.ts)`,
    );
  return proto as Required<TestTypePrototype>;
}

// A time the test sets itself is multiplied as the config's is. The methods are replaced on the prototype before
// `base.extend()` below makes this module's `test`: a test type binds them as it is made, so this `test` and every
// test extended from it (a file's own `test.extend()`) take the multiplied ones; the real module's own `test`, made
// before, keeps its own.
if (harsh) {
  const proto = testTypePrototype(base);
  const { _setTimeout: setTimeout, _configure: configure } = proto;
  proto._setTimeout = function (this: unknown, location, timeout) {
    return setTimeout.call(this, location, longer(timeout));
  };
  proto._configure = function (this: unknown, location, options) {
    return configure.call(this, location, options?.timeout === undefined ? options : { ...options, timeout: longer(options.timeout) });
  };
}

/** The client's input actions, by the object that carries them. A frame's are a locator's and a page's too. */
const ACTIONS = {
  frame: ['check', 'click', 'dblclick', 'dispatchEvent', 'dragAndDrop', 'fill', 'focus', 'hover', 'press', 'selectOption', 'setChecked', 'setInputFiles', 'tap', 'type', 'uncheck'],
  element: ['check', 'click', 'dblclick', 'dispatchEvent', 'fill', 'focus', 'hover', 'press', 'selectOption', 'setChecked', 'setInputFiles', 'tap', 'type', 'uncheck'],
  mouse: ['click', 'dblclick', 'down', 'move', 'up', 'wheel'],
  keyboard: ['down', 'insertText', 'press', 'type', 'up'],
  touchscreen: ['tap'],
} as const;

const pause = (ms: number) => (ms ? new Promise((resolve) => setTimeout(resolve, ms)) : undefined);

const gapped = new WeakSet<object>();

/** Wraps each named method of a prototype (once): the gap before, the action, the gap after. */
function gapAround(proto: Record<string, unknown>, names: readonly string[]) {
  if (!harsh || gapped.has(proto)) return;
  gapped.add(proto);
  for (const name of names) {
    const action = proto[name];
    if (typeof action !== 'function') continue;
    proto[name] = async function (this: unknown, ...args: unknown[]) {
      await pause(harsh!.before);
      const result = await action.apply(this, args);
      await pause(harsh!.after);
      return result;
    };
  }
}

let elementGapped = false;
/** Contexts the test made with scripting off (`javaScriptEnabled: false`). */
const unscripted = new WeakSet<BrowserContext>();

async function gapActions(page: Page) {
  gapAround(Object.getPrototypeOf(page.mainFrame()), ACTIONS.frame);
  gapAround(Object.getPrototypeOf(page.mouse), ACTIONS.mouse);
  gapAround(Object.getPrototypeOf(page.keyboard), ACTIONS.keyboard);
  gapAround(Object.getPrototypeOf(page.touchscreen), ACTIONS.touchscreen);
  // An element handle's class is reached through a handle, asked of a page once a worker — never of a page whose
  // context has scripting off (a test that compares a page without its script): a handle asked there leaves that
  // page's `waitForFunction` never polling again (the steps stylesheet's test waited for its fonts until it timed out).
  if (elementGapped || unscripted.has(page.context())) return;
  elementGapped = true;
  const element = await page.evaluateHandle(() => document.documentElement);
  gapAround(Object.getPrototypeOf(element), ACTIONS.element);
  await element.dispose();
}

const slowed = new WeakMap<Page, Promise<void>>();

/**
 * The gaps (every engine), the motion rate (Chromium's engine rate; test/harsh/slow-motion.ts in Firefox and WebKit, on
 * request) and the CPU throttling (Chromium), on one page — once: every
 * caller waits for the same work, so a page handed over by `newPage()` is slowed before the test has it.
 */
function slowDown(page: Page): Promise<void> {
  if (!harsh) return Promise.resolve();
  let done = slowed.get(page);
  if (!done) {
    done = (async () => {
      await gapActions(page);
      if (page.context().browser()?.browserType().name() !== 'chromium') {
        // Firefox and WebKit have no rate to set: on request, the page's animations are slowed in the page
        // (test/harsh/slow-motion.ts), in every document to come and in the one it has. A page with scripting off is left
        // as it is.
        if (harsh.pageMotion && harsh.motion !== 1 && !unscripted.has(page.context())) {
          await page.addInitScript(slowMotion, harsh.motion);
          await page.evaluate(slowMotion, harsh.motion);
        }
        return;
      }
      const cdp = await page.context().newCDPSession(page);
      if (harsh.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: harsh.cpu });
      if (harsh.motion !== 1) {
        // The rate holds for the page's documents to come too (a `setContent`, a `goto`): the agent keeps it while enabled.
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: harsh.motion });
      }
    })();
    slowed.set(page, done);
  }
  return done;
}

const wrapped = new WeakSet<BrowserContext>();

/** Every page of a context is slowed before `newPage()` hands it over; a page the page opens, as it appears. */
function slowContext(context: BrowserContext): BrowserContext {
  if (wrapped.has(context)) return context;
  wrapped.add(context);
  const newPage = context.newPage.bind(context);
  context.newPage = async () => {
    const page = await newPage();
    await slowDown(page);
    return page;
  };
  context.on('page', (page) => void slowDown(page).catch(() => {}));
  for (const page of context.pages()) void slowDown(page).catch(() => {});
  return context;
}

/** The page the check acts on: a button to click and tap, a field to type in, and a log of the input events it gets. */
const PROBE = `<button id="button" style="position: absolute; left: 10px; top: 10px; width: 100px; height: 40px">probe</button>
<input id="field" style="position: absolute; left: 10px; top: 70px; width: 100px">
<script>
  window.harshSeen = [];
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'touchstart', 'touchend'])
    addEventListener(type, () => window.harshSeen.push(performance.now()), true);
</script>`;

/** A page clock's resolution is coarsened (Firefox, to a millisecond) and a Node timer may fire a millisecond early. */
const SLACK = 5;

/** The share of its time a motion moves in the check, at a rate `r`, may be between r × (1 - MOTION_SLACK) and r × (1 + MOTION_SLACK). */
const MOTION_SLACK = 0.5;

/**
 * Harsh mode's check of itself, in a context of its own on `browser` (a harsh one: its contexts and pages are slowed as
 * a test's are). It throws, saying what fell short, unless
 * - each kind of input action — a locator's (through its frame), an element handle's, the mouse's, the keyboard's, the
 *   touchscreen's — reaches the page at least `expected.before` ms after it was asked for and returns at least
 *   `expected.after` ms after its last event, both in the page's own clock: a gap Node waits for where the action does
 *   not pass through it (a method Playwright renamed or moved) would be missing here;
 * - a motion in a shadow root moves at `expected.motion` times the time that passes (a CSS transition, a CSS animation,
 *   a script's `animate()`, an `Animation` made and played), not at its own speed, and the page reads its playback
 *   rate as 1 — in Chromium by the engine's rate, in Firefox and WebKit, when `expected.pageMotion` asks, by
 *   test/harsh/slow-motion.ts.
 * The fixture below calls it with the run's settings; harsh mode's own tests (test/harsh/self/) call it with more than
 * the run gives, to see it refuse.
 */
export async function checkHarsh(browser: Browser, expected: Harsh): Promise<void> {
  const engine = browser.browserType().name();
  const context = await browser.newContext({ hasTouch: true });
  try {
    const page = await context.newPage();
    await page.setContent(PROBE);
    const problems: string[] = [];
    const handle = await page.$('#button');
    const actions: [string, () => Promise<unknown>][] = [
      ['locator.click', () => page.locator('#button').click()],
      ['locator.press', () => page.locator('#field').press('a')],
      ['elementHandle.click', () => handle!.click()],
      ['mouse.click', () => page.mouse.click(60, 30)],
      ['keyboard.press', () => page.keyboard.press('b')],
      ['touchscreen.tap', () => page.touchscreen.tap(60, 30)],
    ];
    for (const [name, act] of actions) {
      const asked = await page.evaluate(() => {
        (window as unknown as { harshSeen: number[] }).harshSeen = [];
        document.getElementById('field')!.focus();
        return performance.now();
      });
      await act();
      const { seen, now } = await page.evaluate(() => ({ seen: (window as unknown as { harshSeen: number[] }).harshSeen, now: performance.now() }));
      if (!seen.length) {
        problems.push(`${name} reached the page with no input event`);
        continue;
      }
      const before = Math.min(...seen) - asked;
      const after = now - Math.max(...seen);
      if (before < expected.before - SLACK) problems.push(`${name} reached the page ${Math.round(before)} ms after it was asked for, not ${expected.before} ms (the gap before it)`);
      if (after < expected.after - SLACK) problems.push(`${name} returned ${Math.round(after)} ms after its last event, not ${expected.after} ms (the gap after it)`);
    }
    await handle!.dispose();
    if (expected.motion !== 1 && (engine === 'chromium' || expected.pageMotion)) {
      // In a shadow root, as a component's motions are: Firefox and WebKit's rate reaches a transition there by its
      // root's events. Each motion's time is read in two frame callbacks half a second apart (a motion's time is its
      // frame's), the first a frame after the motions began, against the page's clock (not the callbacks' own time,
      // which Chromium's rate slows too).
      const { rates, reported } = await page.evaluate(async () => {
        const host = document.createElement('div');
        document.body.append(host);
        const root = host.attachShadow({ mode: 'open' });
        root.innerHTML = `<style>
          @keyframes harsh-probe { from { rotate: 0deg } to { rotate: 90deg } }
          div { inline-size: 10px; block-size: 10px; opacity: 1; transition: opacity 10s linear }
          .on { opacity: 0; animation: harsh-probe 10s linear }
        </style><div></div>`;
        const box = root.querySelector('div')!;
        getComputedStyle(box).opacity;
        const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await frame();
        box.classList.add('on');
        const scripted = box.animate([{ translate: '0px' }, { translate: '10px' }], 10_000);
        const made = new Animation(new KeyframeEffect(box, [{ scale: '1' }, { scale: '2' }], 10_000));
        made.play();
        await frame();
        await frame();
        const all = box.getAnimations();
        const kinds: Record<string, Animation | undefined> = {
          transition: all.find((animation) => animation instanceof CSSTransition),
          'CSS animation': all.find((animation) => animation instanceof CSSAnimation),
          'animate()': scripted,
          'new Animation()': made,
        };
        const times = () => Object.values(kinds).map((animation) => (animation ? Number(animation.currentTime) : NaN));
        const [start, first] = [performance.now(), times()];
        await new Promise((resolve) => setTimeout(resolve, 500));
        await frame();
        const [end, last] = [performance.now(), times()];
        const result = {
          rates: Object.fromEntries(Object.keys(kinds).map((kind, at) => [kind, (last[at] - first[at]) / (end - start)])),
          reported: all.map((animation) => animation.playbackRate),
        };
        host.remove();
        return result;
      });
      for (const [kind, rate] of Object.entries(rates)) {
        if (!(rate >= expected.motion * (1 - MOTION_SLACK) && rate <= expected.motion * (1 + MOTION_SLACK)))
          problems.push(`a ${kind} moved ${rate.toFixed(2)} of the time that passed, not ${expected.motion} (the motion rate)`);
      }
      if (reported.some((rate) => rate !== 1)) problems.push(`the page reads its animations' playback rates as ${reported.join(', ')}, not 1: the rate shows`);
    }
    if (problems.length) throw new Error(`harsh mode did not take effect in ${engine}:\n- ${problems.join('\n- ')}`);
  } finally {
    await context.close();
  }
}

export const test = base.extend<{ context: BrowserContext }, { browser: Browser; harshChecked: void }>({
  browser: [
    async ({ browser }, use) => {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (options) => {
        const context = await newContext(options);
        if (options?.javaScriptEnabled === false) unscripted.add(context);
        return slowContext(context);
      };
      const newPage = browser.newPage.bind(browser);
      browser.newPage = async (options) => {
        const page = await newPage(options);
        if (options?.javaScriptEnabled === false) unscripted.add(page.context());
        await slowDown(page);
        return page;
      };
      await use(browser);
    },
    { scope: 'worker' },
  ],
  // Before the worker's first test, on the browser as the tests get it.
  harshChecked: [
    async ({ browser }, use) => {
      if (harsh) await checkHarsh(browser, harsh);
      await use();
    },
    { scope: 'worker', auto: true, timeout: 60_000 },
  ],
  context: async ({ context }, use) => {
    await use(slowContext(context));
  },
  page: async ({ page }, use) => {
    await slowDown(page);
    await use(page);
  },
});

export default test;
