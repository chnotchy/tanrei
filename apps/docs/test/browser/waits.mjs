// What the browser tests wait for in a page before they measure it, each wait with a bound of its own, and the words a
// failure says what was outstanding in. Nothing here needs a browser: `settleFrame` and `settleDocument` run in the
// page (`page.evaluate`, through `settle` and `settlePage` in launch.mjs) and read only the page's globals, so
// `test/waits.test.mjs` runs them in Node against stand-ins of them. A new wait in a test goes through one of them
// rather than awaiting `customElements.whenDefined`, `document.fonts.ready`, an update or a frame inline.
//
// A wait for a page has no end of its own: `customElements.whenDefined` waits for a chunk the page fetches after its
// load, `document.fonts.ready` for every face it asked for, a frame for the page to be drawn. A fetch that is never
// answered left one of them waiting until the test's own limit (120 s), and the failure named only the script that was
// running. Bounded, the wait fails at once and names what it was waiting for, and launch.mjs adds the requests that had
// not ended.

/**
 * Each wait's bound, in milliseconds. Each is far above what the wait takes and well inside the test's limit (120 s)
 * with the `goto` before it (30 s): together they are 45 s. Measured on the button's page after its load, three times
 * in each engine on a laptop (the playground, the first example and the state matrix): what was pending went within
 * 148 ms, the elements were defined within 144 ms, the fonts were in within 7 ms and two frames were drawn within 82 ms.
 * - `pending`: the frame's actions and controls are drawn once its elements are defined; the 10 s it was given before.
 * - `defined`: the frame's elements, whose chunks are fetched after the page's load. The fixture gallery gives the same
 *   wait 5 s before it says the page is stalled; this is four times that.
 * - `fonts`: the page's faces, small files served from the same host; the fixture gallery gives them 10 s too.
 * - `frames`: two frames, about 33 ms in a visible page.
 */
export const SETTLE = { pending: 10_000, defined: 20_000, fonts: 10_000, frames: 5_000 };

/**
 * In the page: the element `selector` names brought into view (`scroll`, a `block` of `scrollIntoView`), nothing in
 * it matching `pending` any more, every custom element in it defined, the fonts in and two frames drawn since. Each
 * wait is given its bound in `bounds`. Resolves to nothing when all of that came, or to what did not come in its time.
 * It reads nothing outside itself: Playwright sends its source to the page.
 * @param {{ selector: string, scroll?: ScrollLogicalPosition, pending?: string, bounds: typeof SETTLE }} what
 * @returns {Promise<string | null>}
 */
export async function settleFrame({ selector, scroll, pending, bounds }) {
  const late = {};
  const within = async (ms, promise) => {
    let timer;
    try {
      return await Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(late), ms)))]);
    } finally {
      clearTimeout(timer);
    }
  };
  const seconds = (ms) => `${ms / 1000} s`;
  const frame = document.querySelector(selector);
  if (!frame) return `no element matches ${selector}`;
  if (scroll) frame.scrollIntoView({ block: scroll });
  if (pending) {
    const deadline = Date.now() + bounds.pending;
    while (frame.querySelector(pending) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    if (frame.querySelector(pending)) return `${selector} still holds ${pending} after ${seconds(bounds.pending)}`;
  }
  const names = [...new Set([...frame.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.includes('-')))];
  if ((await within(bounds.defined, Promise.all(names.map((name) => customElements.whenDefined(name))))) === late) {
    return `not defined after ${seconds(bounds.defined)}: ${names.filter((name) => !customElements.get(name)).join(', ')} (of the ${names.length} tags in ${selector})`;
  }
  if ((await within(bounds.fonts, document.fonts.ready)) === late) {
    const loading = [...document.fonts].filter((face) => face.status === 'loading').map((face) => `${face.family} ${face.weight} ${face.style}`);
    return `document.fonts.ready not resolved after ${seconds(bounds.fonts)} (fonts ${document.fonts.status}; ${loading.length ? `loading: ${loading.join(', ')}` : 'no face loading'})`;
  }
  if ((await within(bounds.frames, new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))) === late) {
    return `two frames not drawn in ${seconds(bounds.frames)} (the document ${document.visibilityState})`;
  }
  return null;
}

/**
 * In the page, for a test that waits on the document rather than on one frame of it: every tag of `tags` defined, and
 * every custom element's tag among the elements `among` matches (a selector, as `*` for the whole document); the
 * update of the element `update` names complete (a Lit element's `updateComplete`); the fonts in, unless `fonts` is
 * false; and `frames` frames drawn since (two unless said otherwise; none with 0). Each wait is given its bound in
 * `bounds`, the tags and the update the bound of `defined`. Resolves to nothing when all of that came, or to what did
 * not come in its time. It reads nothing outside itself: Playwright sends its source to the page.
 * @param {{ tags?: string[], among?: string, update?: string, fonts?: boolean, frames?: number, bounds: typeof SETTLE }} what
 * @returns {Promise<string | null>}
 */
export async function settleDocument({ tags = [], among, update, fonts = true, frames = 2, bounds }) {
  const late = {};
  const within = async (ms, promise) => {
    let timer;
    try {
      return await Promise.race([promise, new Promise((resolve) => (timer = setTimeout(() => resolve(late), ms)))]);
    } finally {
      clearTimeout(timer);
    }
  };
  const seconds = (ms) => `${ms / 1000} s`;
  const found = among ? [...document.querySelectorAll(among)].map((element) => element.localName).filter((name) => name.includes('-')) : [];
  const names = [...new Set([...tags, ...found])];
  if (names.length && (await within(bounds.defined, Promise.all(names.map((name) => customElements.whenDefined(name))))) === late) {
    return `not defined after ${seconds(bounds.defined)}: ${names.filter((name) => !customElements.get(name)).join(', ')} (of the ${names.length} tags waited for)`;
  }
  if (update) {
    const element = document.querySelector(update);
    if (!element) return `no element matches ${update}`;
    if ((await within(bounds.defined, Promise.resolve(element.updateComplete))) === late) {
      return `the update of ${update} not complete after ${seconds(bounds.defined)}${element.isUpdatePending ? ' (an update pending)' : ''}`;
    }
  }
  if (fonts && (await within(bounds.fonts, document.fonts.ready)) === late) {
    const loading = [...document.fonts].filter((face) => face.status === 'loading').map((face) => `${face.family} ${face.weight} ${face.style}`);
    return `document.fonts.ready not resolved after ${seconds(bounds.fonts)} (fonts ${document.fonts.status}; ${loading.length ? `loading: ${loading.join(', ')}` : 'no face loading'})`;
  }
  if (frames > 0) {
    const drawn = new Promise((resolve) => {
      let left = frames;
      const next = () => (--left <= 0 ? resolve(undefined) : requestAnimationFrame(next));
      requestAnimationFrame(next);
    });
    if ((await within(bounds.frames, drawn)) === late) return `${frames} frame${frames === 1 ? '' : 's'} not drawn in ${seconds(bounds.frames)} (the document ${document.visibilityState})`;
  }
  return null;
}

/**
 * The requests of a page that had not ended at `now`: each its type, its address, how long ago it was asked and
 * whether its response had come.
 * @param {Iterable<{ type: string, url: string, started: number, answered?: number }>} requests
 * @param {number} now
 */
export function describeRequests(requests, now) {
  const said = [...requests].map(({ type, url, started, answered }) => `${type} ${url}, asked ${((now - started) / 1000).toFixed(1)} s ago, ${answered === undefined ? 'no response' : `response ${answered}, body not ended`}`);
  return said.length ? said.join('; ') : 'no request';
}
