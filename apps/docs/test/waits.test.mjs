// The bounded waits of the browser tests (test/browser/waits.mjs), without a browser: `settleFrame` and
// `settleDocument` run against stand-ins of the page's globals, and each wait that runs out says what it was waiting
// for; the outstanding requests are written as a timed-out test and a lost `goto` print them.
//
// Each races each wait against a timer and reads `Date.now()`, so it runs on a fake clock (`setTimeout` and
// `Date`) that only moves when `onClock` moves it. On the real clock a loaded machine that took the thread for longer
// than a bound let the bound's timer come due together with a frame's, and the bound won: two frames 1 ms apart were
// reported as not drawn in 60 ms.
//
//   node --test test/waits.test.mjs
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { SETTLE, describeRequests, settleDocument, settleFrame } from './browser/waits.mjs';

const SHORT = { pending: 60, defined: 60, fonts: 60, frames: 60 };
const NEVER = new Promise(() => {});
const GLOBALS = ['document', 'customElements', 'requestAnimationFrame'];
const saved = Object.fromEntries(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'] }));

afterEach(() => {
  mock.timers.reset();
  for (const name of GLOBALS) {
    if (saved[name]) Object.defineProperty(globalThis, name, saved[name]);
    else delete globalThis[name];
  }
});

/**
 * Runs `promise` to its end on the fake clock: everything already due (and the promises it settles) runs, then the
 * clock moves 1 ms, until the promise settles. The real `setImmediate` is the one thing left on the real clock: it
 * comes after every promise callback queued before it, and no wait under test uses it.
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
async function onClock(promise) {
  let done = false;
  const result = promise.finally(() => (done = true));
  for (let ms = 0; ; ms += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    if (done) return result;
    assert.ok(ms < 1_000, 'still running after 1 s on the fake clock, far past every bound in SHORT');
    mock.timers.tick(1);
  }
}

/**
 * A page of one frame holding `tags`, of which `defined` are defined (the rest never are), with `faces` (each
 * `loading` or `loaded`), whose `fonts.ready` and frames come or not, and whose frame holds `pending` until `cleared`.
 */
function page({ tags = ['tanrei-button'], defined = tags, faces = [], fontsReady = true, frames = true, pending = false } = {}) {
  const scrolled = [];
  let holds = pending;
  const frame = {
    scrollIntoView: (options) => scrolled.push(options),
    querySelectorAll: (selector) => (selector === '*' ? [{ localName: 'div' }, ...tags.map((localName) => ({ localName }))] : []),
    querySelector: () => (holds ? {} : null),
  };
  const fonts = faces.map(([family, status]) => ({ family, weight: '400', style: 'normal', status }));
  Object.assign(fonts, { ready: fontsReady ? Promise.resolve() : NEVER, status: fontsReady ? 'loaded' : 'loading' });
  globalThis.document = { querySelector: (selector) => (selector === '#frame' ? frame : null), fonts, visibilityState: 'visible' };
  globalThis.customElements = {
    get: (name) => (defined.includes(name) ? class {} : undefined),
    whenDefined: (name) => (defined.includes(name) ? Promise.resolve() : NEVER),
  };
  globalThis.requestAnimationFrame = (callback) => (frames ? setTimeout(callback, 16) : 0);
  return { scrolled, clear: () => (holds = false) };
}

describe('settleFrame', () => {
  test('resolves to nothing once the frame is in view, its elements defined, the fonts in and two frames drawn', async () => {
    const { scrolled } = page({ tags: ['tanrei-button', 'tanrei-switch'] });
    assert.equal(await onClock(settleFrame({ selector: '#frame', scroll: 'start', bounds: SHORT })), null);
    assert.deepEqual(scrolled, [{ block: 'start' }]);
  });

  test('waits for what is pending to go, and says so when it does not', async () => {
    const { clear } = page({ pending: true });
    setTimeout(clear, 20);
    assert.equal(await onClock(settleFrame({ selector: '#frame', pending: 'template', bounds: SHORT })), null);
    page({ pending: true });
    assert.equal(await onClock(settleFrame({ selector: '#frame', pending: 'template', bounds: SHORT })), '#frame still holds template after 0.06 s');
  });

  test('names the tags that are not defined in time', async () => {
    page({ tags: ['tanrei-button', 'tanrei-segment', 'tanrei-switch'], defined: ['tanrei-button'] });
    assert.equal(await onClock(settleFrame({ selector: '#frame', bounds: SHORT })), 'not defined after 0.06 s: tanrei-segment, tanrei-switch (of the 3 tags in #frame)');
  });

  test('names the faces still loading when the fonts are not in in time', async () => {
    page({ faces: [['Inter', 'loaded'], ['Noto Sans JP', 'loading']], fontsReady: false });
    assert.equal(await onClock(settleFrame({ selector: '#frame', bounds: SHORT })), 'document.fonts.ready not resolved after 0.06 s (fonts loading; loading: Noto Sans JP 400 normal)');
  });

  test('says when no frame is drawn in time, and whether the document is shown', async () => {
    page({ frames: false });
    assert.equal(await onClock(settleFrame({ selector: '#frame', bounds: SHORT })), 'two frames not drawn in 0.06 s (the document visible)');
  });

  test('gives a wait its bound once more when its timer fired late, after the thread was held', async () => {
    // The thread is held from 20 ms to 220 ms; the second frame is drawn 16 ms after it, behind the bound's late timer.
    page();
    let heldUntil = 0;
    globalThis.requestAnimationFrame = (callback) => {
      const draw = () => (Date.now() < heldUntil + 16 ? setTimeout(draw, heldUntil + 16 - Date.now()) : callback());
      return setTimeout(draw, 16);
    };
    setTimeout(() => {
      heldUntil = Date.now() + 200;
      mock.timers.setTime(heldUntil);
    }, 20);
    assert.equal(await onClock(settleFrame({ selector: '#frame', bounds: SHORT })), null);
  });

  test('says when there is no such element', async () => {
    page();
    assert.equal(await onClock(settleFrame({ selector: '#elsewhere', bounds: SHORT })), 'no element matches #elsewhere');
  });

  test('reads nothing outside itself, as the page that runs it has nothing else', () => {
    // Playwright sends the function's source to the page: a name from this module would be undefined there.
    const source = String(settleFrame);
    assert.doesNotMatch(source, /\bSETTLE\b|\bdescribeRequests\b/);
  });

  test('its bounds, all run out after a goto that ran out (30 s), end well inside a test’s limit (120 s)', () => {
    const total = Object.values(SETTLE).reduce((sum, ms) => sum + ms, 0);
    assert.ok(total + 30_000 < 120_000 * 0.75, `${total} ms of waits after a 30 s goto`);
  });
});

/**
 * A document holding `tags` (what `among` matches), of which `defined` are defined, with one element `#updating` (a `tanrei-search`)
 * whose update completes or not, and the fonts and frames of `page` above. Returns how many frames were asked for.
 */
function wholePage({ tags = ['tanrei-button'], defined = tags, updates = true, frames = true, ...rest } = {}) {
  page({ tags, defined, frames, ...rest });
  let asked = 0;
  const updating = { localName: 'tanrei-search', updateComplete: updates ? Promise.resolve(true) : NEVER, isUpdatePending: !updates };
  Object.assign(globalThis.document, {
    querySelectorAll: (selector) => (selector === '*' ? [{ localName: 'html' }, ...tags.map((localName) => ({ localName }))] : selector === '#updating' ? [updating] : []),
  });
  const drawn = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => ((asked += 1), drawn(callback));
  return { frames: () => asked };
}

describe('settleDocument', () => {
  test('resolves to nothing once the tags named and found are defined, the update complete, the fonts in and two frames drawn', async () => {
    const { frames } = wholePage({ tags: ['tanrei-app-bar'], defined: ['tanrei-app-bar', 'tanrei-button'] });
    assert.equal(await onClock(settleDocument({ tags: ['tanrei-button'], among: '*', update: '#updating', bounds: SHORT })), null);
    assert.equal(frames(), 2);
  });

  test('draws as many frames as it is asked for, and none with 0', async () => {
    const { frames } = wholePage();
    assert.equal(await onClock(settleDocument({ frames: 3, bounds: SHORT })), null);
    assert.equal(frames(), 3);
    const none = wholePage();
    assert.equal(await onClock(settleDocument({ frames: 0, bounds: SHORT })), null);
    assert.equal(none.frames(), 0);
  });

  test('names the tags that are not defined in time, those it was given and those it found', async () => {
    wholePage({ tags: ['tanrei-app-bar', 'tanrei-menu'], defined: ['tanrei-app-bar'] });
    assert.equal(await onClock(settleDocument({ tags: ['tanrei-search'], among: '*', bounds: SHORT })), 'not defined after 0.06 s: tanrei-search, tanrei-menu (of the 3 tags waited for)');
  });

  test('says when the update does not complete in time, or there is no such element', async () => {
    wholePage({ updates: false });
    assert.equal(await onClock(settleDocument({ update: '#updating', bounds: SHORT })), 'the update of #updating not complete after 0.06 s (an update pending: tanrei-search)');
    wholePage();
    assert.equal(await onClock(settleDocument({ update: '#elsewhere', bounds: SHORT })), 'no element matches #elsewhere');
  });

  test('names the faces still loading, and does not wait for them when told not to', async () => {
    wholePage({ faces: [['Inter', 'loading']], fontsReady: false });
    assert.equal(await onClock(settleDocument({ bounds: SHORT })), 'document.fonts.ready not resolved after 0.06 s (fonts loading; loading: Inter 400 normal)');
    assert.equal(await onClock(settleDocument({ fonts: false, bounds: SHORT })), null);
  });

  test('says when the frames are not drawn in time', async () => {
    wholePage({ frames: false });
    assert.equal(await onClock(settleDocument({ fonts: false, bounds: SHORT })), '2 frames not drawn in 0.06 s (the document visible)');
  });

  test('waits for the update of every element the selector matches, and names those still pending', async () => {
    wholePage();
    const done = { localName: 'tanrei-tab', updateComplete: Promise.resolve(true), isUpdatePending: false };
    const held = { localName: 'tanrei-tabs', updateComplete: NEVER, isUpdatePending: true };
    globalThis.document.querySelectorAll = (selector) => (selector === 'body *' ? [done, held, { localName: 'div' }] : []);
    assert.equal(await onClock(settleDocument({ update: 'body *', fonts: false, frames: 0, bounds: SHORT })), 'the update of body * not complete after 0.06 s (an update pending: tanrei-tabs)');
    globalThis.document.querySelectorAll = (selector) => (selector === 'body *' ? [done, { localName: 'div' }] : []);
    assert.equal(await onClock(settleDocument({ update: 'body *', fonts: false, frames: 0, bounds: SHORT })), null);
  });

  test('gives a wait its bound once more when its timer fired late, after the thread was held, and only once', async () => {
    // The page's thread is held from 20 ms to 220 ms: the frame due at 32 ms is drawn 16 ms after the hold, and the
    // bound's timer, due at 60 ms, fires at 221 ms, late by far more than a quarter of the bound.
    wholePage({ frames: false });
    let heldUntil = 0;
    globalThis.requestAnimationFrame = (callback) => {
      const draw = () => (Date.now() < heldUntil + 16 ? setTimeout(draw, heldUntil + 16 - Date.now()) : callback());
      return setTimeout(draw, 16);
    };
    setTimeout(() => {
      heldUntil = Date.now() + 200;
      mock.timers.setTime(heldUntil);
    }, 20);
    assert.equal(await onClock(settleDocument({ fonts: false, bounds: SHORT })), null);
    // A second hold, past the bound given once more: the wait runs out.
    wholePage({ frames: false });
    globalThis.requestAnimationFrame = () => 0;
    const hold = () => mock.timers.setTime(Date.now() + 200);
    setTimeout(hold, 20);
    setTimeout(hold, 250);
    assert.equal(await onClock(settleDocument({ fonts: false, bounds: SHORT })), '2 frames not drawn in 0.06 s (the document visible)');
  });

  test('a timer that fires on time is not given its bound again', async () => {
    wholePage({ frames: false });
    const started = Date.now();
    assert.equal(await onClock(settleDocument({ fonts: false, bounds: SHORT })), '2 frames not drawn in 0.06 s (the document visible)');
    assert.ok(Date.now() - started <= 61, `ran out after ${Date.now() - started} ms`);
  });

  test('reads nothing outside itself, as the page that runs it has nothing else', () => {
    assert.doesNotMatch(String(settleDocument), /\bSETTLE\b|\bdescribeRequests\b|\bsettleFrame\b/);
  });
});

describe('describeRequests', () => {
  test('each request not ended, by type, address, age and whether its response came', () => {
    const now = 100_000;
    assert.equal(
      describeRequests(
        [
          { type: 'script', url: 'http://127.0.0.1:1/_astro/a.js', started: now - 10_200 },
          { type: 'font', url: 'http://127.0.0.1:1/_astro/b.woff2', started: now - 500, answered: 200 },
        ],
        now,
      ),
      'script http://127.0.0.1:1/_astro/a.js, asked 10.2 s ago, no response; font http://127.0.0.1:1/_astro/b.woff2, asked 0.5 s ago, response 200, body not ended',
    );
  });

  test('says when nothing is outstanding', () => {
    assert.equal(describeRequests([], 0), 'no request');
  });
});
