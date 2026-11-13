// The browsers of the site's browser tests: every file launches its engines here, so each engine starts as every
// other file starts it, and what one engine needs to load the site is said once.
//
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/<file>.test.mjs   # a file that runs in each engine
//
// A file that runs in each engine reads them from `DOCS_ENGINES` (`engines`); one that runs in Chromium only launches
// it alone (`launch()`).
//
// No test may hold its job without a word. Playwright gives its actions, its navigations and `waitForFunction` a limit
// of their own (30 s), and none to a new context or page, to closing one or the browser, or to a script that awaits the
// page (`evaluate`): a browser that stops answering any of those holds the test until the job's own limit, and
// node:test, which reports a file's tests in their order, prints nothing more from any file of the shard (in CI, the
// appearance test in WebKit stopped in one of those and printed nothing for twelve minutes, until the job's limit
// cancelled it). So the browser `launch()` returns gives each new context, new page and close ANSWER, and fails saying
// what it waited for; each file gives its tests a limit of their own, well above its slowest (node:test's
// `--test-timeout` would limit the whole file, not each test), the backstop for anything else; and a test that fails
// has the contexts it opened closed, and, if it ran out of time, its failure names what it was still waiting for
// (below). `test:browser` runs with `--test-force-exit`, so that a file whose browser no longer answers ends once its
// tests have reported, instead of being held open by its connection to that browser.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as playwright from '@playwright/test';
import { serveDist } from './host.mjs';
import { SETTLE, describeRequests, settleDocument, settleFrame } from './waits.mjs';

/** How long a browser has to answer what has no limit of Playwright's: a new context or page, closing one, a script. */
export const ANSWER = 60_000;

/** How long what is read for a failure's message may take: a browser that has stopped answering answers nothing. */
const READ = 5_000;

/** `promise`, or `otherwise` once `ms` have passed. */
async function within(ms, promise, otherwise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(otherwise), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `promise`, or a failure after ANSWER that says what was waited for, and what `more()` says then (given READ).
 * @template T
 * @param {string} what
 * @param {Promise<T>} promise
 * @param {() => Promise<string>} [more]
 * @returns {Promise<T>}
 */
export async function bounded(what, promise, more = async () => '') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(async () => {
          const said = await within(READ, more().catch((cause) => `not read: ${String(cause).split('\n')[0]}`), `not read in ${READ / 1000} s`);
          reject(new Error(`${what}: no answer within ${ANSWER / 1000} s${said ? `. ${said}` : ''}`));
        }, ANSWER);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// The tests running now, and each context still open with the test that opened it: the one test running when it was
// asked for, or none when several ran at once (a describe with `concurrency`, a test and its subtests), whose contexts
// cannot be told apart and are left to the browser's close. node:test hands a test's hooks the context its function
// is given, so a test is known by it.
/** @type {Set<import('node:test').TestContext>} */
const running = new Set();
/** @type {Map<import('@playwright/test').BrowserContext, import('node:test').TestContext | null>} */
const opened = new Map();
/**
 * The scripts each page is running for the test (`page.evaluate`), with when each was asked for.
 * @type {WeakMap<import('@playwright/test').Page, Map<object, { what: string, started: number }>>} */
const asked = new WeakMap();
/**
 * The requests of each page that have not ended, with when each was asked for and the status of its response if one came.
 * @type {WeakMap<import('@playwright/test').Page, Map<import('@playwright/test').Request, { started: number, answered?: number }>>} */
const requests = new WeakMap();

beforeEach((t) => {
  running.add(t);
});

// A test that failed leaves nothing open behind it: the contexts it opened are closed, so that their pages do not go on
// drawing beside the tests after it. One that ran out of its limit says first what it was still waiting for: the
// scripts its pages were running, the state of each page and the requests they had not had answered. Neither may
// hide why the test failed: what cannot be read or closed is added to its failure, never thrown.
afterEach(async (t) => {
  running.delete(t);
  const own = [...opened].filter(([, owner]) => owner === t).map(([context]) => context);
  for (const context of own) opened.delete(context);
  if (t.passed || !t.error) return;
  const notes = [];
  if (t.error.failureType === 'testTimeoutFailure') {
    // A test that ran beside others: its pages are among those opened while several ran, and each of them is named.
    const shared = [...opened].filter(([, owner]) => owner === null).map(([context]) => context);
    const pages = (own.length ? own : shared).flatMap((context) => context.pages());
    const where = own.length ? 'its pages' : 'the pages open beside the tests it ran with (which are its own cannot be told)';
    notes.push(`Still waiting when the limit ran out; ${where}: ${(await Promise.all(pages.map(standing))).join('; ') || 'none is open'}.`);
  }
  for (const context of own) {
    await context.close().catch((cause) => notes.push(`Closing a context it opened failed too: ${String(cause).split('\n')[0]}`));
  }
  if (notes.length) amend(t.error, `\n${notes.join('\n')}`);
});

/**
 * `failure` (node:test's, for a test) says `more` as well, wherever a reporter reads it: TAP its message, or its
 * cause's for a failure of the test's own code; the spec reporter its cause, printed whole (an error by its stack).
 */
function amend(failure, more) {
  failure.message += more;
  const { cause } = failure;
  if (typeof cause === 'string') failure.cause = cause + more;
  else if (cause instanceof Error) {
    const was = cause.message;
    cause.message += more;
    if (typeof cause.stack === 'string' && was) cause.stack = cause.stack.replace(was, cause.message);
  }
}

/** What `page` is doing: its address, its document's state, the scripts it is running that have not answered, and its requests that have not ended. */
async function standing(page) {
  const now = Date.now();
  const scripts = [...(asked.get(page)?.values() ?? [])].map(({ what, started }) => `${what} (asked ${((now - started) / 1000).toFixed(1)} s ago)`);
  const state = page.isClosed() ? 'closed' : await within(READ, page.mainFrame().evaluate(() => `${document.readyState}, ${document.visibilityState}`).catch((cause) => `not read: ${String(cause).split('\n')[0]}`), `not read in ${READ / 1000} s`);
  return `${page.url()} (its document ${state}): ${scripts.length ? `running ${scripts.join(', ')}` : 'no script of the test running'}; outstanding: ${outstanding(page, now)}`;
}

/** The requests of `page` that have not ended (launch.mjs keeps them from the page's start). */
export function outstanding(page, now = Date.now()) {
  const open = requests.get(page);
  if (!open) return 'not kept (the page was not opened in a browser of launch())';
  return describeRequests([...open].map(([request, entry]) => ({ type: request.resourceType(), url: request.url(), ...entry })), now);
}

/**
 * The element `selector` names in `page` settled (`settleFrame` in waits.mjs: in view, nothing in it matching
 * `pending`, its elements defined, the fonts in, two frames drawn), each wait within its bound. A wait that runs out
 * fails at once, naming what it waited for and the page's requests that had not ended, rather than holding the test
 * to its limit.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {{ scroll?: 'start' | 'center' | 'end' | 'nearest', pending?: string }} [options]
 */
export async function settle(page, selector, { scroll, pending } = {}) {
  const lost = await page.evaluate(settleFrame, { selector, scroll, pending, bounds: SETTLE });
  if (lost) throw new Error(`${page.url()} did not settle: ${lost}. Outstanding: ${outstanding(page)}.`);
}

/**
 * `page` settled as a whole (`settleDocument` in waits.mjs: the tags of `tags` and of the elements `among` matches
 * defined, the update of every element `update` matches complete, the fonts in unless `fonts` is false, `frames` frames
 * drawn), each wait within its bound; one that runs out fails at once, as `settle` does. `settlePage(page, { fonts:
 * false })` is two frames drawn, and no more.
 * @param {import('@playwright/test').Page} page
 * @param {{ tags?: string[], among?: string, update?: string, fonts?: boolean, frames?: number }} [options]
 */
export async function settlePage(page, options = {}) {
  const lost = await page.evaluate(settleDocument, { ...options, bounds: SETTLE });
  if (lost) throw new Error(`${page.url()} did not settle: ${lost}. Outstanding: ${outstanding(page)}.`);
}

/**
 * The page of the site a new Chromium draws before it is handed to a test (`launch`): the Button's, whose waits the
 * bounds in waits.mjs were measured on, with its scripts, its elements defined and its fonts in.
 */
const FIRST_PAGE = '/components/button/';

/**
 * A new Chromium draws one page of the built site (served from `dist/` for it alone), its fonts in and two frames
 * drawn, all of it given ANSWER, before any test has it. A Chromium that has drawn nothing yet builds its raster
 * pipelines (Skia on Dawn on SwiftShader, compiled on the CPU: the switches below) as the site's first pages are drawn,
 * and keeps them for every page after, whatever their address. Traced on a laptop under load (fourteen busy loops
 * beside it, load near 40): the GPU process's main thread spent 5.4 s in seven raster tasks
 * (`RasterDecoderImpl::DoEndRasterCHROMIUM`, almost none of it their flush) after the first two pages' load, and those
 * pages drew no frame for 5.7 and 5.9 s while their own timers ran on time, visible and focused; without the load it
 * took about a second. A test's bounded wait for frames (`settle`, `settlePage`: 5 s) could then be the one to pay it:
 * the sidebar's stand-in test, whose first two pages wait for frames as soon as they have loaded, failed so once in
 * four runs of the docs files three at a time (load near 15), and in 3 runs of 3 under the busy loops with a recorder
 * of frames in its pages (2 runs without the recorder passed); the one-frame test's first `settle` failed so once in
 * another run of the files three at a time (load near 22). With a page of the site drawn first the stand-in test
 * passed in 8 runs of 8 under the busy loops; a page of one line of text drawn first did not help (both first pages
 * went 6 s without a frame): the pipelines are those of what the site draws. The page is not one of a test's, and
 * nothing of it is kept but what the GPU process built.
 * @param {import('@playwright/test').Browser} browser a Chromium, before `launch` wraps it
 */
async function warmUp(browser) {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
  if (!fs.existsSync(path.join(dist, 'index.html'))) return; // the files say themselves that the site is not built
  const host = await serveDist(dist);
  const address = `${host.origin}${FIRST_PAGE}`;
  let context;
  try {
    await bounded(`chromium: its first page, ${address}, drawn before the tests`, (async () => {
      context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(address, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    })());
  } finally {
    await context?.close();
    await host.close();
  }
}

/** The engines Playwright launches. */
export const ENGINE_NAMES = ['chromium', 'firefox', 'webkit'];

// Firefox is told to ignore Cross-Origin-Opener-Policy. Every page of the site is sent with
// `Cross-Origin-Opener-Policy: same-origin` (public/_headers), so Firefox moves the first navigation of each new page,
// from its about:blank, into a new browsing context group, and on a busy machine Playwright's Firefox (1.63) loses that
// navigation: the document loads (readyState `complete`, a load in its navigation timing), but `goto` hears neither the
// commit nor the load and waits out its time, and a page reached some other way answers `evaluate` but not a locator's
// click. Measured in the CI image on four CPUs: the six languages' pages of the header's test, each in a new page, lost
// 6 navigations in 24; that file failed in 6 runs of 10, and with a busy loop beside it in 4 of 6; with the policy
// ignored it passed in 10 of 10, and in 12 of 12 beside the busy loop. The tests of the policies, the "last updated"
// line and the Studio's page timed out on their `goto` the same way, each in Firefox only; run in turn with and without
// the preference, ten times each in the same image and size, the "last updated" test failed in 6 runs of 10 without it
// (a `goto` waiting out its 30 s for `domcontentloaded`) and in none with it, the Studio's page in 1 of 10 and in none,
// and the policies' test in none either way. No test here is about the
// policy in a browser (no page opens another; the CSP test reads the headers the host sends, which this leaves as they
// are), and the other engines keep it.
//
// Chromium rasters its pages on the GPU, which is SwiftShader's, on the CPU: the headless shell would raster them in
// software, and a page rastered in software can stop for good as it is scrolled. The compositor's raster pool runs
// its tasks in two jobs of the renderer's thread pool: a tile painted ahead of the view goes to the low-priority one.
// Once the page scrolls to that tile, the step that lets the newly committed tree be shown waits for it. The
// low-priority job finishes the tile, is asked to yield to any higher-priority job waiting for a worker (V8's
// compilers, its collector, a script being streamed), and returns without waking the pool's other job, the one that
// runs that step (`CategorizedWorkerPoolJob::Run` in cc/raster/categorized_worker_pool.cc, Chromium 153; unchanged on
// Chromium's main branch). Nothing wakes it again: the tree is never shown, the next commit never comes, and the page's
// thread waits for it in its next write to the compositor (a scroll: `LayerTreeHost::WaitForCommitCompletion`) without
// end. No script runs, no timer fires, the debugger cannot stop it, and the fixture gallery's test names it "held
// outside script". A tile rastered on the GPU is never one of that job's tasks (cc/tiles/tile_manager.cc: such a task
// is not run concurrently, and only the pool's other job runs those), so no tile can be left waiting there.
// (V8 collecting its garbage on the page's thread took one of those jobs away, not the others: the gallery's file still
// stopped in CI.) Measured in the CI's container image (its arm64 build, 2 CPUs): every component page scrolled through
// at both widths ran 109758 raster tasks on the GPU, none of them in the low-priority job; in software, 12 of those
// pages ran 4710 of their 15611 there. A page made to show it (tiles slow to raster, a window scrolled each frame, fresh
// functions made hot each frame), four at a time for 5 minutes, with V8's collector on the page's thread: 5 of 58
// pages stopped in software, the three traced each on that wait, the low-priority job the last to run a raster task,
// its worker going on to V8's compile jobs; on the GPU, with garbage made each frame as well, 0 of 60 (it draws about a
// seventh as many frames there, so this count alone proves little; the task counts above are the reason).
const OPTIONS = {
  chromium: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization'] },
  firefox: { firefoxUserPrefs: { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } },
};

/**
 * The engines a file runs in: those `DOCS_ENGINES` names (comma-separated), or the file's own when it names none.
 * @param {string} [fallback] the file's engines, comma-separated
 * @returns {string[]}
 */
export function engines(fallback = 'chromium') {
  const names = (process.env.DOCS_ENGINES ?? fallback).split(',').map((name) => name.trim()).filter(Boolean);
  const unknown = names.filter((name) => !ENGINE_NAMES.includes(name));
  if (unknown.length > 0) throw new Error(`DOCS_ENGINES names ${unknown.join(', ')}: the engines are ${ENGINE_NAMES.join(', ')}`);
  return names;
}

/**
 * Launch an engine as every browser test launches it. A Chromium that does not raster on the GPU is closed and the
 * launch fails, saying so: the switches above would otherwise stop working without anyone noticing (a new Chromium
 * that reads them otherwise, a GPU it refuses), and the gallery's pages would be left to stop as before. A Chromium
 * that does raster on the GPU draws a page of the site before it is returned (`warmUp`).
 * @param {string} [engine]
 * @returns {Promise<import('@playwright/test').Browser>}
 */
export async function launch(engine = 'chromium') {
  if (!ENGINE_NAMES.includes(engine)) throw new Error(`no engine "${engine}": the engines are ${ENGINE_NAMES.join(', ')}`);
  const browser = await playwright[engine].launch(OPTIONS[engine]);
  if (engine === 'chromium') {
    const session = await browser.newBrowserCDPSession();
    const { featureStatus } = (await session.send('SystemInfo.getInfo')).gpu;
    await session.detach();
    if (!featureStatus.rasterization?.startsWith('enabled')) {
      await browser.close();
      throw new Error(`Chromium rasters in software (rasterization: ${featureStatus.rasterization}, gpu_compositing: ${featureStatus.gpu_compositing}), where a scrolled page can stop for good: it is launched to raster on SwiftShader's GPU (launch.mjs)`);
    }
    await warmUp(browser).catch(async (cause) => {
      await browser.close();
      throw cause;
    });
  }
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const owner = running.size === 1 ? [...running][0] : null;
    const context = await bounded(`${engine}: a new context`, newContext(...args));
    opened.set(context, owner);
    context.on('close', () => opened.delete(context));
    const newPage = context.newPage.bind(context);
    context.newPage = (...more) => bounded(`${engine}: a new page`, newPage(...more));
    const close = context.close.bind(context);
    context.close = (...more) => bounded(`${engine}: closing the context of ${context.pages().map((page) => page.url()).join(', ') || 'no page'}`, close(...more));
    context.on('page', (page) => {
      sayWhatIsOutstanding(page);
      keepWhatIsAsked(page);
      const closePage = page.close.bind(page);
      page.close = (...more) => bounded(`${engine}: closing ${page.url()}`, closePage(...more));
    });
    return context;
  };
  const closeBrowser = browser.close.bind(browser);
  browser.close = (...args) => bounded(`closing ${engine}`, closeBrowser(...args));
  return browser;
}

// The scripts a page runs for the test, kept while they run, so that a test that runs out of its limit names the one
// it was waiting for (above).
function keepWhatIsAsked(page) {
  const scripts = new Map();
  asked.set(page, scripts);
  const evaluate = page.evaluate.bind(page);
  page.evaluate = async (fn, ...args) => {
    const key = {};
    scripts.set(key, { what: `\`${String(fn).replace(/\s+/g, ' ').slice(0, 120)}\``, started: Date.now() });
    try {
      return await evaluate(fn, ...args);
    } finally {
      scripts.delete(key);
    }
  };
}

// A navigation that does not end says what it was waiting for. `goto` times out with only the address and the event it
// waited for; this adds the page's requests that had not ended (each with how long it had run and whether its response
// had come), the address the page's main frame stands at and its document's state, so a load that never comes names
// what was outstanding.
function sayWhatIsOutstanding(page) {
  /** @type {Map<import('@playwright/test').Request, { started: number, answered?: number }>} */
  const open = new Map();
  requests.set(page, open);
  page.on('request', (request) => open.set(request, { started: Date.now() }));
  page.on('response', (response) => {
    const entry = open.get(response.request());
    if (entry) entry.answered = response.status();
  });
  for (const ended of ['requestfinished', 'requestfailed']) page.on(ended, (request) => open.delete(request));
  const goto = page.goto.bind(page);
  page.goto = async (...args) => {
    try {
      return await goto(...args);
    } catch (error) {
      if (!(error instanceof Error) || page.isClosed()) throw error;
      const pending = outstanding(page);
      const state = await Promise.race([page.evaluate(() => document.readyState).catch((cause) => `not read: ${String(cause).split('\n')[0]}`), new Promise((resolve) => setTimeout(() => resolve('not read in 5 s'), 5000))]);
      error.message += `\nOutstanding when it failed: ${pending}. The main frame stands at ${page.mainFrame().url()}, its document ${state}.`;
      throw error;
    }
  };
}
