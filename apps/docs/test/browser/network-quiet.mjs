// When a page has stopped asking for files: nothing in flight for 500 ms after its load, counted from the page's own
// network events. It is what Playwright's `networkidle` means, without the way Playwright (1.63) loses it.
//
// Playwright counts a frame's requests and fires `networkidle` 500 ms after the last one ends. Once it has fired, the
// end of a later request starts no new count, and the page's next lifecycle event recounts and takes `networkidle` away
// if a request has run since. A long document that is parsed slowly (a component page of several hundred kilobytes, on a
// busy runner) has nothing in flight for more than 500 ms before DOMContentLoaded, so `networkidle` fires then. The
// parser then asks for a module, the module ends before DOMContentLoaded, and DOMContentLoaded takes `networkidle` away
// for good. `waitForLoadState('networkidle')` after the load then waits until its time runs out, with nothing in flight,
// and `goto(…, { waitUntil: 'networkidle' })` can return while the document is still loading.
//
//   const network = await watchNetwork(page);   // before the page is asked for
//   await page.goto(url, { waitUntil: 'load' });
//   await network.quiet();                     // then 500 ms with nothing in flight
import { setTimeout as wait } from 'node:timers/promises';

/** How long nothing may be in flight for the page to have stopped asking: Playwright's `networkidle`'s 500 ms. */
export const QUIET_MS = 500;
/** How long a page may go on asking: Playwright's default time for a wait, 30 s. */
export const LIMIT_MS = 30_000;

/**
 * Counts the page's requests (its frames' too: the site's windows are of its own origin and in its process) from a
 * session of the browser's own protocol, opened before the page is asked for.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').CDPSession} [cdp] a session already open on the page (its Network domain is enabled here)
 */
export async function watchNetwork(page, cdp) {
  cdp ??= await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  /** @type {Map<string, string>} each request in flight, by id: its address */
  const open = new Map();
  let last = Date.now();
  cdp.on('Network.requestWillBeSent', (event) => {
    open.set(event.requestId, event.request.url);
    last = Date.now();
  });
  const ended = (event) => {
    open.delete(event.requestId);
    last = Date.now();
  };
  cdp.on('Network.loadingFinished', ended);
  cdp.on('Network.loadingFailed', ended);
  return {
    cdp,
    /** The requests in flight now, by address. */
    inFlight: () => [...open.values()],
    /**
     * Resolves once nothing has been in flight for `quiet` ms; rejects, naming what is still in flight, when the page is
     * still asking after `limit` ms. Call it after the load: a request the load did not wait for is waited for here.
     */
    async quiet({ quiet = QUIET_MS, limit = LIMIT_MS } = {}) {
      const start = Date.now();
      while (open.size || Date.now() - last < quiet) {
        if (Date.now() - start > limit) {
          const asked = [...open.values()].map((url) => url.replace(/^https?:\/\/[^/]+/, ''));
          throw new Error(`${page.url()} still asks for files after ${limit / 1000} s, ${asked.length} in flight: ${asked.join(', ') || '(none; the last ended under 500 ms ago)'}`);
        }
        await wait(25);
      }
    },
  };
}
