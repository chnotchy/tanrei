// @playwright/test as harsh mode serves it (test/harsh.ts says what harsh mode is). Only a harsh run loads this file:
// its tsconfig maps the module name here, so the tests and the shared helpers need no change. Everything is the real
// module's, except `test`, whose fixtures
// - put a gap before and after every input action, in every engine (once a worker, on the client's own classes: a
//   locator's and a page's actions go through its frame, and the mouse, the keyboard and the touchscreen are their own);
// - slow every Chromium page the test opens — the `page` fixture's, a page of a context the test makes itself, a popup —
//   before the test can use it (`newPage()` resolves once it is slowed; a popup is slowed as it appears).
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { test as base } from '../../node_modules/@playwright/test/index.mjs';
import { harsh } from '../harsh.js';

export * from '../../node_modules/@playwright/test/index.mjs';

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
 * The gaps (every engine), and the CPU throttling and the motion playback rate (Chromium), on one page — once: every
 * caller waits for the same work, so a page handed over by `newPage()` is slowed before the test has it.
 */
function slowDown(page: Page): Promise<void> {
  if (!harsh) return Promise.resolve();
  let done = slowed.get(page);
  if (!done) {
    done = (async () => {
      await gapActions(page);
      if (page.context().browser()?.browserType().name() !== 'chromium') return;
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

export const test = base.extend<{ context: BrowserContext }, { browser: Browser }>({
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
  context: async ({ context }, use) => {
    await use(slowContext(context));
  },
  page: async ({ page }, use) => {
    await slowDown(page);
    await use(page);
  },
});

export default test;
