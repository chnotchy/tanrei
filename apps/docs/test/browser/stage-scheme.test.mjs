// The gallery's stages draw in the page's scheme and contrast, and follow every change of them: the color scheme
// chosen in the header's Appearance panel reaches a stage in the page (a preset's scope, which inherits the page's scheme as any subtree does) and a
// stage's window (a document of its own, which the gallery writes in the scheme and the contrast, and hands each
// change of them), until the stage's own switch is turned. A window is written in the scheme and the contrast the site
// stored.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port. The stages in the page are the floating action button menu's: it lives
// in the m3-like layer, so its stages are that preset's scope. The windows are the dialog's.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { launch } from './launch.mjs';

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
  browser = await launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

const PAGE = '/components/fab-menu/';
const INLINE = 'filled-closed';
const WINDOWS = '/components/dialog/';
const WINDOW = 'basic';
const stage = (id) => `.docs-stage[data-fixture-id="${id}"]`;

/** The reader's choice of color mode in the header's Appearance panel, as its tabs hand it on (their `change`). */
const chooseTheme = (page, theme) =>
  page.evaluate((value) => {
    const tabs = document.querySelector('tanrei-tabs.docs-appearance-mode');
    tabs.value = value;
    tabs.dispatchEvent(new Event('change', { bubbles: true }));
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
  test('the header’s theme reaches a preset’s stage, on the system’s other scheme, until the stage’s own switch is turned', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${PAGE}`, { waitUntil: 'load' });
      // The panel's elements are defined when a reader is about to use it: a pointer over its button.
      await page.hover('#docs-appearance');
      await page.waitForFunction(() => customElements.get('tanrei-tabs') && document.querySelector('tanrei-tabs.docs-appearance-mode')?.updateComplete);

      await chooseTheme(page, 'dark');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.deepEqual(await inline(page, INLINE), { system: 'm3-like', scheme: 'dark' }, 'the preset’s scope draws in the page’s scheme, not the system’s');
      await chooseTheme(page, 'light');
      assert.equal((await inline(page, INLINE)).scheme, 'light');

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

  test('the header’s theme and the page’s contrast reach a window, on the system’s other scheme', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${WINDOWS}`, { waitUntil: 'load' });
      // The panel's elements are defined when a reader is about to use it: a pointer over its button.
      await page.hover('#docs-appearance');
      await page.waitForFunction(() => customElements.get('tanrei-tabs') && document.querySelector('tanrei-tabs.docs-appearance-mode')?.updateComplete);
      // The window is written when it comes near the view.
      await page.locator(stage(WINDOW)).scrollIntoViewIfNeeded();
      assert.deepEqual(await windowed(page, WINDOW), { theme: 'light', contrast: null, scheme: 'light' });

      await chooseTheme(page, 'dark');
      await page.waitForFunction((selector) => document.querySelector(`${selector} iframe`)?.contentDocument?.documentElement.dataset.tanreiTheme === 'dark', stage(WINDOW), { timeout: 15_000 });
      assert.deepEqual(await windowed(page, WINDOW), { theme: 'dark', contrast: null, scheme: 'dark' });
      await chooseTheme(page, 'light');
      assert.equal((await windowed(page, WINDOW)).theme, 'light', 'the window follows the change');

      // The page's contrast (what a live example's switch sets on the root) reaches the window.
      await page.evaluate(() => document.documentElement.setAttribute('data-tanrei-contrast', 'high'));
      await page.waitForFunction((selector) => document.querySelector(`${selector} iframe`)?.contentDocument?.documentElement.dataset.tanreiContrast === 'high', stage(WINDOW), { timeout: 5_000 });
      await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-contrast'));
      assert.equal((await windowed(page, WINDOW)).contrast, null, 'standard again: the window holds no contrast of its own');
    } finally {
      await context.close();
    }
  });

  test('a window is written in the contrast and theme the site stored', async () => {
    const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 1000 } });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}${WINDOWS}`, { waitUntil: 'load' });
      await page.evaluate(() => {
        localStorage.setItem('tanrei-docs-appearance', JSON.stringify({ mode: 'dark', contrast: 'medium' }));
      });
      await page.goto(`${origin}${WINDOWS}`, { waitUntil: 'load' });
      await page.locator(stage(WINDOW)).scrollIntoViewIfNeeded();
      // What the window's document was written with, before the page handed it anything.
      const written = await page.waitForFunction((selector) => {
        const source = document.querySelector(`${selector} iframe`)?.getAttribute('srcdoc');
        const root = source && new DOMParser().parseFromString(source, 'text/html').documentElement;
        return root ? { theme: root.dataset.tanreiTheme ?? null, contrast: root.dataset.tanreiContrast ?? null } : null;
      }, stage(WINDOW), { timeout: 15_000 });
      assert.deepEqual(await written.jsonValue(), { theme: 'dark', contrast: 'medium' });
    } finally {
      await context.close();
    }
  });
});
