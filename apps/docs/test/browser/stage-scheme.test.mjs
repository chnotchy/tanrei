// The gallery's stages draw in the page's scheme and contrast, and follow every change of them: the header's theme
// picker reaches a stage in the page (a preset's scope, which inherits the page's scheme as any subtree does) and a
// stage's window (a document of its own, which the gallery hands the scheme and the contrast), until the stage's own
// switch is turned. A window opened later starts from the contrast the site stored.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port. The page is the floating action button menu's: it lives in the m3-like
// layer, so its stages are that preset's scope, and its open fixtures are drawn in windows.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
let server;
let origin;
let browser;

before(async () => {
  server = http.createServer((request, response) => {
    let file = path.join(dist, decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

const PAGE = '/components/fab-menu/';
const INLINE = 'filled-closed';
const WINDOW = 'filled-open';
const stage = (id) => `.docs-stage[data-fixture-id="${id}"]`;

/** The reader's choice in the header's theme picker, as the picker hands it on (its `change`). */
const chooseTheme = (page, theme) =>
  page.evaluate((value) => {
    const select = document.querySelector('tanrei-select.docs-theme');
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, theme);

/** What a stage in the page draws in: its box's scheme, and the scope it stands in. */
const inline = (page, id) =>
  page.locator(`${stage(id)} .docs-stage-box`).evaluate((box) => ({ system: box.dataset.tanreiSystem, scheme: getComputedStyle(box).colorScheme }));

/** What a stage's window draws in, once its document has loaded: its root's scheme and contrast. */
async function windowed(page, id) {
  const handle = await page.waitForFunction(
    (selector) => {
      const doc = document.querySelector(`${selector} iframe`)?.contentDocument;
      const root = doc?.documentElement;
      if (doc?.readyState !== 'complete' || !root.querySelector('.stage')) return null;
      return { theme: root.dataset.tanreiTheme ?? null, contrast: root.dataset.tanreiContrast ?? null, scheme: doc.defaultView.getComputedStyle(root).colorScheme };
    },
    stage(id),
    { timeout: 15_000 },
  );
  return handle.jsonValue();
}

describe("the gallery's stages follow the page's scheme and contrast", () => {
  test('the header’s theme reaches a preset’s stage and a window, on the system’s other scheme, until the stage’s own switch is turned', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${PAGE}`, { waitUntil: 'load' });
      await page.waitForFunction(() => customElements.get('tanrei-select') && document.querySelector('tanrei-select.docs-theme')?.updateComplete);
      // The window loads when it comes near the view.
      await page.locator(stage(WINDOW)).scrollIntoViewIfNeeded();

      await chooseTheme(page, 'dark');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.deepEqual(await inline(page, INLINE), { system: 'm3-like', scheme: 'dark' }, 'the preset’s scope draws in the page’s scheme, not the system’s');
      await page.waitForFunction((selector) => document.querySelector(`${selector} iframe`)?.contentDocument?.documentElement.dataset.tanreiTheme === 'dark', stage(WINDOW), { timeout: 15_000 });
      assert.deepEqual(await windowed(page, WINDOW), { theme: 'dark', contrast: null, scheme: 'dark' });

      await chooseTheme(page, 'light');
      assert.equal((await inline(page, INLINE)).scheme, 'light');
      assert.equal((await windowed(page, WINDOW)).theme, 'light', 'the window follows the change');

      // The page's contrast (what a live example's switch sets on the root) reaches the window.
      await page.evaluate(() => document.documentElement.setAttribute('data-tanrei-contrast', 'high'));
      await page.waitForFunction((selector) => document.querySelector(`${selector} iframe`)?.contentDocument?.documentElement.dataset.tanreiContrast === 'high', stage(WINDOW), { timeout: 5_000 });
      await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-contrast'));
      assert.equal((await windowed(page, WINDOW)).contrast, null, 'standard again: the window holds no contrast of its own');

      // A stage whose own switch is turned keeps its scheme when the page's changes.
      await page.locator(`${stage(INLINE)}`).scrollIntoViewIfNeeded();
      const toggle = page.locator(`${stage(INLINE)} [data-stage-theme]`);
      await toggle.waitFor();
      await toggle.click();
      await page.waitForFunction((selector) => document.querySelector(`${selector} .docs-stage-box`)?.dataset.tanreiTheme === 'dark', stage(INLINE), { timeout: 5_000 });
      await chooseTheme(page, 'dark');
      await chooseTheme(page, 'light');
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal((await inline(page, INLINE)).scheme, 'dark', 'the turned stage keeps its own scheme');
      assert.equal((await inline(page, 'small-closed')).scheme, 'light', 'a stage beside it still follows the page');
    } finally {
      await context.close();
    }
  });

  test('a window opened later starts from the contrast and theme the site stored', async () => {
    const context = await browser.newContext({ colorScheme: 'light' });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${PAGE}`, { waitUntil: 'load' });
      await page.evaluate(() => {
        localStorage.setItem('tanrei-docs-contrast', 'medium');
        localStorage.setItem('starlight-theme', 'dark');
      });
      await page.goto(`${origin}/fixtures/fab-menu/?id=${WINDOW}`, { waitUntil: 'load' });
      const root = await page.evaluate(() => ({ theme: document.documentElement.dataset.tanreiTheme ?? null, contrast: document.documentElement.dataset.tanreiContrast ?? null }));
      assert.deepEqual(root, { theme: 'dark', contrast: 'medium' });
    } finally {
      await context.close();
    }
  });
});
