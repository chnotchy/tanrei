// The bounded waits of the browser tests (test/browser/waits.mjs), without a browser: `settleFrame` runs against
// stand-ins of the page's globals, and each wait that runs out says what it was waiting for; the outstanding requests
// are written as a timed-out test and a lost `goto` print them.
//
//   node --test test/waits.test.mjs
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { SETTLE, describeRequests, settleFrame } from './browser/waits.mjs';

const SHORT = { pending: 60, defined: 60, fonts: 60, frames: 60 };
const NEVER = new Promise(() => {});
const GLOBALS = ['document', 'customElements', 'requestAnimationFrame'];
const saved = Object.fromEntries(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

afterEach(() => {
  for (const name of GLOBALS) {
    if (saved[name]) Object.defineProperty(globalThis, name, saved[name]);
    else delete globalThis[name];
  }
});

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
  globalThis.requestAnimationFrame = (callback) => (frames ? setTimeout(callback, 1) : 0);
  return { scrolled, clear: () => (holds = false) };
}

describe('settleFrame', () => {
  test('resolves to nothing once the frame is in view, its elements defined, the fonts in and two frames drawn', async () => {
    const { scrolled } = page({ tags: ['tanrei-button', 'tanrei-switch'] });
    assert.equal(await settleFrame({ selector: '#frame', scroll: 'start', bounds: SHORT }), null);
    assert.deepEqual(scrolled, [{ block: 'start' }]);
  });

  test('waits for what is pending to go, and says so when it does not', async () => {
    const { clear } = page({ pending: true });
    setTimeout(clear, 20);
    assert.equal(await settleFrame({ selector: '#frame', pending: 'template', bounds: SHORT }), null);
    page({ pending: true });
    assert.equal(await settleFrame({ selector: '#frame', pending: 'template', bounds: SHORT }), '#frame still holds template after 0.06 s');
  });

  test('names the tags that are not defined in time', async () => {
    page({ tags: ['tanrei-button', 'tanrei-segment', 'tanrei-switch'], defined: ['tanrei-button'] });
    assert.equal(await settleFrame({ selector: '#frame', bounds: SHORT }), 'not defined after 0.06 s: tanrei-segment, tanrei-switch (of the 3 tags in #frame)');
  });

  test('names the faces still loading when the fonts are not in in time', async () => {
    page({ faces: [['Inter', 'loaded'], ['Noto Sans JP', 'loading']], fontsReady: false });
    assert.equal(await settleFrame({ selector: '#frame', bounds: SHORT }), 'document.fonts.ready not resolved after 0.06 s (fonts loading; loading: Noto Sans JP 400 normal)');
  });

  test('says when no frame is drawn in time, and whether the document is shown', async () => {
    page({ frames: false });
    assert.equal(await settleFrame({ selector: '#frame', bounds: SHORT }), 'two frames not drawn in 0.06 s (the document visible)');
  });

  test('says when there is no such element', async () => {
    page();
    assert.equal(await settleFrame({ selector: '#elsewhere', bounds: SHORT }), 'no element matches #elsewhere');
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
