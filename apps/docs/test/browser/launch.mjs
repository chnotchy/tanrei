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
const OPTIONS = { firefox: { firefoxUserPrefs: { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } } };

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
export function launch(engine = 'chromium') {
  if (!ENGINE_NAMES.includes(engine)) throw new Error(`no engine "${engine}": the engines are ${ENGINE_NAMES.join(', ')}`);
  return playwright[engine].launch(OPTIONS[engine]);
}
