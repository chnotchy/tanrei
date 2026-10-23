// When a page has stopped asking for files (network-quiet.mjs): after the load and 500 ms with nothing in flight, on a
// document whose parse leaves the network quiet for longer than that before DOMContentLoaded — where Playwright's
// `networkidle` fires before DOMContentLoaded and is then lost — and never while the page goes on asking. And no
// browser test of the docs waits for `networkidle`.
//
//   pnpm --filter @tanrei/docs test:browser
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { QUIET_MS, watchNetwork } from './network-quiet.mjs';
import { launch } from './launch.mjs';

// A document whose parser has nothing in flight for longer than 500 ms, then asks for a script it makes itself (the
// preload scanner does not see it) that ends before DOMContentLoaded, then parses on. The parser is held by scripts that
// run for a time on the clock, not by the document's length: a parse slowed by length leaves a gap that shrinks on a
// fast machine and takes tens of seconds on a busy runner. The test measures that the page did what it is for.
const rows = (n) => '<div class="row"><span>A line of the page</span> <b>and more of it</b></div>'.repeat(n);
const hold = (ms) => `<script>for (const end = performance.now() + ${ms}; performance.now() < end; );</script>`;
const ask = `<script>document.head.append(Object.assign(document.createElement('script'), { src: '/late.js' }));</script>`;
const PAGES = {
  // Held for 300 ms more than the window before it asks, and for 200 ms after, while /late.js ends.
  '/held/': `<!doctype html><title>held</title>${rows(1000)}${hold(QUIET_MS + 300)}${ask}${rows(1000)}${hold(200)}<p>end</p>`,
  // A page that never stops asking: a request every 200 ms.
  '/asking/': `<!doctype html><title>asking</title><script>setInterval(() => fetch('/poll.json?' + Math.random()), 200);</script>`,
};

let server;
let origin;
let browser;

before(async () => {
  server = http.createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/late.js') return response.writeHead(200, { 'content-type': 'text/javascript' }).end('window.late = true;');
    if (pathname === '/poll.json') return response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    if (PAGES[pathname]) return response.writeHead(200, { 'content-type': 'text/html' }).end(PAGES[pathname]);
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

describe('a page that has stopped asking for files', () => {
  test('a document whose parse leaves the network quiet: after its load and its late script', async () => {
    const page = await browser.newPage();
    try {
      const network = await watchNetwork(page);
      // The page's requests and DOMContentLoaded, on the browser's own clock (seconds).
      /** @type {{ id: string, url?: string, at: number }[]} */
      const events = [];
      let contentLoaded;
      network.cdp.on('Network.requestWillBeSent', ({ requestId, request, timestamp }) => events.push({ id: requestId, url: request.url, at: timestamp }));
      network.cdp.on('Network.loadingFinished', ({ requestId, timestamp }) => events.push({ id: requestId, at: timestamp }));
      network.cdp.on('Network.loadingFailed', ({ requestId, timestamp }) => events.push({ id: requestId, at: timestamp }));
      network.cdp.on('Page.domContentEventFired', ({ timestamp }) => (contentLoaded = timestamp));
      await network.cdp.send('Page.enable');
      await page.goto(`${origin}/held/`, { waitUntil: 'load' });
      const started = Date.now();
      await network.quiet({ limit: 10_000 });
      assert.ok(Date.now() - started < 10_000);
      assert.deepEqual(await page.evaluate(() => ({ state: document.readyState, late: window.late === true })), { state: 'complete', late: true });
      assert.deepEqual(network.inFlight(), []);

      // The page did what it is for, measured: nothing was in flight for longer than the helper's window before it asked
      // for /late.js, and /late.js ended before DOMContentLoaded.
      const asked = events.findIndex(({ url }) => url?.endsWith('/late.js'));
      assert.ok(asked > 0, 'the page asked for /late.js after its own document');
      const gap = (events[asked].at - Math.max(...events.slice(0, asked).map(({ at }) => at))) * 1000;
      assert.ok(gap > QUIET_MS, `nothing in flight for ${Math.round(gap)} ms before /late.js, more than ${QUIET_MS} ms`);
      const ended = events.slice(asked + 1).find(({ id, url }) => id === events[asked].id && url === undefined)?.at;
      assert.ok(ended !== undefined && contentLoaded !== undefined && ended < contentLoaded, '/late.js ended before DOMContentLoaded');
    } finally {
      await page.close();
    }
  });

  test('a page that goes on asking: never, and the wait names what is in flight', async () => {
    const page = await browser.newPage();
    try {
      const network = await watchNetwork(page);
      await page.goto(`${origin}/asking/`, { waitUntil: 'load' });
      await assert.rejects(network.quiet({ limit: 2_000 }), /\/asking\/ still asks for files after 2 s/);
    } finally {
      await page.close();
    }
  });
});

test('no browser test of the docs waits for networkidle', () => {
  const dir = fileURLToPath(new URL('./', import.meta.url));
  const waits = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.mjs') && name !== 'network-quiet.mjs' && name !== 'network-quiet.test.mjs')
    .filter((name) => /['"]networkidle['"]/.test(fs.readFileSync(`${dir}${name}`, 'utf8')));
  assert.deepEqual(waits, [], 'wait with watchNetwork(page) … quiet() (network-quiet.mjs) instead');
});
