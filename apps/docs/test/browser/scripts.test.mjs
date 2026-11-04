// The built site's scripts: a page asks for the modules of the elements it draws, and only those
// (src/lib/define-on-demand.ts) — and every element it draws is defined, in the document and in every shadow root.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port the way a static host does (text compressed with Brotli).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { watchNetwork } from './network-quiet.mjs';
import { launch } from './launch.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/**
 * The most script the home page may transfer, compressed as this host compresses it, with every file it asks for
 * before it is idle: 185 KB. It defines the elements it draws, but the search, which waits for its first use, and is
 * 172 KB in 86 files; it was 608 KB in 71 files when every page imported the whole web package, which defines all of
 * its elements.
 */
const HOME_SCRIPT_BUDGET = 185 * 1024;

// Pages of each kind: the home page, a component's page in two languages (a demo of every state, its fixtures'
// gallery), a component's page whose picker draws an element it does not import in its shadow root (the Text input's
// picker is a Button), a token page and a page that sets the product's words. The documents of the fixtures' windows,
// which stand without the site's frame and its scripts, are asked of separately.
const PAGES = ['/', '/components/button/', '/ja/components/button/', '/components/text-input/', '/tokens/color/', '/foundations/words/'];


// ── A static host ────────────────────────────────────────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
const packed = new Map();
let server;
let origin;
let browser;

before(async () => {
  server = http.createServer((request, response) => {
    let file = path.join(dist, decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    if (/^(text\/|application\/(json|xml)|image\/svg)/.test(type) && /\bbr\b/.test(request.headers['accept-encoding'] ?? '')) {
      if (!packed.has(file)) packed.set(file, zlib.brotliCompressSync(fs.readFileSync(file), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }));
      return response.writeHead(200, { 'content-type': type, 'content-encoding': 'br' }).end(packed.get(file));
    }
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

/** A page, opened until it has stopped asking for files: the scripts it fetched (address, compressed bytes) and the errors it threw. */
async function open(url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const network = await watchNetwork(page);
  /** @type {Set<string>} the address of each script the page asked for */
  const asked = new Set();
  network.cdp.on('Network.responseReceived', (event) => event.type === 'Script' && asked.add(new URL(event.response.url).pathname));
  await page.goto(origin + url, { waitUntil: 'load' });
  await network.quiet();
  // What the host sent for each, compressed: the body alone, the same on every run.
  const scripts = [...asked].map((pathname) => ({ pathname, bytes: packed.get(path.join(dist, decodeURIComponent(pathname)))?.length ?? fs.statSync(path.join(dist, decodeURIComponent(pathname))).size }));
  return { context, page, errors, scripts };
}

// ── The tests ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('a built page’s scripts', { concurrency: 2 }, () => {
  test(`the home page transfers at most ${HOME_SCRIPT_BUDGET / 1024} KB of script`, async () => {
    const { context, scripts } = await open('/');
    try {
      const bytes = scripts.reduce((sum, script) => sum + script.bytes, 0);
      assert.ok(bytes <= HOME_SCRIPT_BUDGET, `${Math.round(bytes / 1024)} KB of script in ${scripts.length} files`);
    } finally {
      await context.close();
    }
  });

  for (const url of PAGES) {
    test(`${url} defines every element it draws, in the document and in every shadow root`, async () => {
      const { context, page, errors } = await open(url);
      try {
        // The modules a page asks for are all in once it is quiet; an element is upgraded when its module is evaluated.
        // An element defined on its first use (`data-define-on-use`: the search, the Appearance panel), and what it holds,
        // is left undefined until then
        // (test/browser/search-on-use.test.mjs). A frame's stage defines what it holds once it comes near the view
        // (components/visuals/Example.astro): every one is let go here, as if the reader had scrolled the page through.
        await page.evaluate(() => {
          for (const stage of document.querySelectorAll('[data-example-pending]')) stage.removeAttribute('data-example-pending');
        });
        await page.waitForFunction(() => {
          const undefinedIn = (root) => [...root.querySelectorAll('*')].some((el) => (el.localName.startsWith('tanrei-') && !el.matches(':defined') && !el.closest('[data-define-on-use]')) || (el.shadowRoot && undefinedIn(el.shadowRoot)));
          return !undefinedIn(document);
        }, null, { timeout: 10_000 }).catch(() => {});
        const left = await page.evaluate(() => {
          const out = new Set();
          const visit = (root, where) => {
            for (const el of root.querySelectorAll('*')) {
              if (el.localName.startsWith('tanrei-') && !el.matches(':defined') && !el.closest('[data-define-on-use]')) out.add(`${el.localName} (${where})`);
              if (el.shadowRoot) visit(el.shadowRoot, `in the shadow root of ${el.localName}`);
            }
          };
          visit(document, 'in the document');
          return [...out];
        });
        assert.deepEqual(left, [], 'elements left undefined');
        assert.deepEqual(errors, [], 'errors the page threw');
      } finally {
        await context.close();
      }
    });
  }

  // A window's document runs one module (lib/fixture-window.ts), which defines what the window draws: a date-time
  // picker's window holds Buttons in its shadow root that its fixture does not write.
  test('a window of the fixtures’ gallery defines every element it draws, in its document and in every shadow root', async () => {
    const { context, page, errors } = await open('/components/date-time-picker/');
    try {
      const frame = page.locator('iframe.docs-window-frame').first();
      await frame.scrollIntoViewIfNeeded();
      await page.waitForFunction((element) => element.contentDocument?.querySelector('body > .stages > .stage') && !element.hasAttribute('inert'), await frame.elementHandle(), { timeout: 15_000 });
      const left = await frame.evaluate((element) => {
        const out = new Set();
        const visit = (node, where) => {
          for (const el of node.querySelectorAll('*')) {
            if (el.localName.startsWith('tanrei-') && !el.matches(':defined')) out.add(`${el.localName} (${where})`);
            if (el.shadowRoot) visit(el.shadowRoot, `in the shadow root of ${el.localName}`);
          }
        };
        visit(element.contentDocument, 'in the document');
        return [...out];
      });
      assert.deepEqual(left, [], 'elements left undefined in the window');
      assert.deepEqual(errors, [], 'errors the page threw');
    } finally {
      await context.close();
    }
  });
});
