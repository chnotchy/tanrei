// The browsers of the site's browser tests: every file launches its engines here, so each engine starts as every
// other file starts it, and what one engine needs to load the site is said once.
//
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/<file>.test.mjs   # a file that runs in each engine
//
// A file that runs in each engine reads them from `DOCS_ENGINES` (`engines`); one that runs in Chromium only launches
// it alone (`launch()`).
import * as playwright from '@playwright/test';

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
// Chromium's V8 collects garbage on the page's own thread (`--single-threaded-gc`), so that no collector job of V8's
// competes with the compositor's raster jobs in the renderer's thread pool. Beside those jobs, a page of the headless
// shell (which rasters in software) could stop for good as it was scrolled: a tile painted ahead of the view by the
// raster pool's low-priority job is needed once the page scrolls to it; that job finishes it, is asked to yield to the
// collector's higher-priority jobs, and returns without waking the pool's other job, the one that runs the step that
// lets the newly committed tree be shown (`CategorizedWorkerPoolJob::Run` in cc/raster/categorized_worker_pool.cc,
// Chromium 153; unchanged on Chromium's main branch). Nothing wakes it again, the tree is never shown, the next commit
// never comes, and the page's thread waits for it in its next write to the compositor (a scroll:
// `LayerTreeHost::WaitForCommitCompletion`) without end: no script runs, no timer fires, the debugger cannot stop it.
// Measured in the CI's container image (its arm64 build, 2 CPUs): the fixture gallery's file stopped on a page in 2 of 72 runs recorded with a
// trace, each time on that wait (the renderer's native stack and its trace both show it). A page made to show it
// (tiles slow to raster, a window scrolled each frame, garbage made each frame), four at a time for 5 minutes, three
// times: 76 of 125 pages stopped; side by side with the flag, 0 of 96; without the garbage, 0 of 32. With the flag the
// gallery's file passed in 99 runs of 99, and takes as long as without it.
const OPTIONS = {
  chromium: { args: ['--js-flags=--single-threaded-gc'] },
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
 * Launch an engine as every browser test launches it.
 * @param {string} [engine]
 * @returns {Promise<import('@playwright/test').Browser>}
 */
export async function launch(engine = 'chromium') {
  if (!ENGINE_NAMES.includes(engine)) throw new Error(`no engine "${engine}": the engines are ${ENGINE_NAMES.join(', ')}`);
  const browser = await playwright[engine].launch(OPTIONS[engine]);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    context.on('page', sayWhatIsOutstanding);
    return context;
  };
  return browser;
}

// A navigation that does not end says what it was waiting for. `goto` times out with only the address and the event it
// waited for; this adds the page's requests that had not ended (each with how long it had run and whether its response
// had come), the address the page's main frame stands at and its document's state, so a load that never comes names
// what was outstanding.
function sayWhatIsOutstanding(page) {
  /** @type {Map<import('@playwright/test').Request, { started: number, answered?: number }>} */
  const open = new Map();
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
      const now = Date.now();
      const outstanding = [...open].map(([request, { started, answered }]) => `${request.resourceType()} ${request.url()}, asked ${((now - started) / 1000).toFixed(1)} s ago, ${answered === undefined ? 'no response' : `response ${answered}, body not ended`}`);
      const state = await Promise.race([page.evaluate(() => document.readyState).catch((cause) => `not read: ${String(cause).split('\n')[0]}`), new Promise((resolve) => setTimeout(() => resolve('not read in 5 s'), 5000))]);
      error.message += `\nOutstanding when it failed: ${outstanding.length ? outstanding.join('; ') : 'no request'}. The main frame stands at ${page.mainFrame().url()}, its document ${state}.`;
      throw error;
    }
  };
}
