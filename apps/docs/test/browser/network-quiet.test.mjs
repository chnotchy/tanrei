// When a page has stopped asking for files (network-quiet.mjs): after the load and 500 ms with nothing in flight, on a
// long document parsed slowly — where Playwright's `networkidle` fires before DOMContentLoaded and is then lost — and
// never while the page goes on asking. And no browser test of the docs waits for `networkidle`.
//
//   pnpm --filter @tanrei/docs test:browser
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { watchNetwork } from './network-quiet.mjs';

// A long document whose parser, slowed, has nothing in flight for longer than 500 ms, then asks for a script it makes
// itself (the preload scanner does not see it) that ends before DOMContentLoaded, then parses on.
const rows = (n) => '<div class="row"><span>A line of the page</span> <b>and more of it</b></div>'.repeat(n);
const ask = `<script>document.head.append(Object.assign(document.createElement('script'), { src: '/late.js' }));</script>`;
const PAGES = {
  '/long/': `<!doctype html><title>long</title><style>.row { display: flex; gap: 4px }</style>${rows(30000)}${ask}${rows(10000)}<p>end</p>`,
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
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

describe('a page that has stopped asking for files', () => {
  test('a long document parsed slowly: after its load and its late script', async () => {
    const page = await browser.newPage();
    try {
      const network = await watchNetwork(page);
      // Four times slower: the parse leaves more than 500 ms with nothing in flight, on any machine.
      await network.cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(`${origin}/long/`, { waitUntil: 'load' });
      const started = Date.now();
      await network.quiet({ limit: 10_000 });
      assert.ok(Date.now() - started < 10_000);
      assert.deepEqual(await page.evaluate(() => ({ state: document.readyState, late: window.late === true })), { state: 'complete', late: true });
      assert.deepEqual(network.inFlight(), []);
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
