// The home page's hero, before and after its elements are defined: nothing in it moves when they are, and its primary
// action's label is never drawn in the plain link's color over the Button's fill.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port. The order is the one a slow line gives: the header's script defines the
// Buttons, and the hero's own script — which holds the whole library (lib/register-web.ts) — arrives after it.
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

// The home page of each language: the root one and each language's directory (a folder of the content with its own
// `components`).
const content = path.join(docs, 'src/content/docs');
const languages = fs.readdirSync(content).filter((name) => fs.existsSync(path.join(content, name, 'components')));
const homes = ['/', ...languages.map((lang) => `/${lang}/`)];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
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

const everythingDefined = () => [...document.querySelectorAll('.hero *')].every((el) => !el.localName.includes('-') || el.matches(':defined'));

/** Where the hero's title and what stands under the specimen are, with no script run, and with every element defined. */
async function places(url, width) {
  const out = {};
  for (const scripts of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      if (!scripts) await page.route(/\.m?js(\?|$)/, (route) => route.abort());
      await page.goto(origin + url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      if (scripts) await page.waitForFunction(everythingDefined, null, { timeout: 30000 });
      out[scripts ? 'defined' : 'stopped'] = await page.evaluate(() => {
        const top = (selector) => document.querySelector(selector).getBoundingClientRect().top + scrollY;
        return { title: top('.hero h1'), under: top('.hero .platforms') };
      });
    } finally {
      await context.close();
    }
  }
  return out;
}

describe('the hero holds its place while its elements are defined', { concurrency: 4 }, () => {
  test('there is a home page in every language', () => assert.ok(homes.length >= 6, homes.join(', ')));
  for (const url of homes) {
    // Two columns: the copy beside the specimen. The specimen is given the rows its Buttons take once drawn (Hero.astro).
    test(`${url} at 1440: the title and what stands under the specimen`, async () => {
      const { stopped, defined } = await places(url, 1440);
      assert.ok(Math.abs(stopped.title - defined.title) <= 0.5, `the title stood at ${stopped.title} with no script and at ${defined.title} once defined`);
      assert.ok(Math.abs(stopped.under - defined.under) <= 0.5, `the platform list stood at ${stopped.under} with no script and at ${defined.under} once defined`);
    });
    // One column: the specimen is under the copy.
    test(`${url} at 390: the title`, async () => {
      const { stopped, defined } = await places(url, 390);
      assert.ok(Math.abs(stopped.title - defined.title) <= 0.5, `the title stood at ${stopped.title} with no script and at ${defined.title} once defined`);
    });
  }
});

describe('the primary action, in every frame it is drawn as a Button', () => {
  for (const width of [1440, 390]) {
    test(`at ${width}: its label stands out from its fill (4.5:1), the plain anchor gone`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      try {
        // Every frame from the first: is the action defined, does it still hold its anchor, and the contrast of the
        // color its label is drawn in (the anchor's, while it is there) over the container's fill.
        await context.addInitScript(() => {
          const frames = (window.__heroFrames = []);
          const channels = (color) => (color.match(/[\d.]+/g) ?? []).map(Number);
          const luminance = ([r, g, b]) => {
            const linear = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
          };
          const tick = () => {
            const action = document.querySelector('.hero .action');
            const container = action?.shadowRoot?.querySelector('[part~="container"]');
            const label = action?.shadowRoot?.querySelector('[part~="label"]');
            if (action?.matches(':defined') && container && label) {
              const anchor = action.querySelector('a');
              const fill = channels(getComputedStyle(container).backgroundColor);
              const ink = channels(getComputedStyle(anchor ?? label).color);
              const [hi, lo] = [luminance(fill), luminance(ink)].sort((a, b) => b - a);
              frames.push({ anchor: !!anchor, opaque: (fill[3] ?? 1) === 1, contrast: (hi + 0.05) / (lo + 0.05) });
            }
            if (frames.length < 30) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const page = await context.newPage();
        // The hero's script is held until the Button is defined (by the header's script), or 10 s.
        await page.route(/\/_astro\/Hero\.astro_astro_type_script[^/]*\.js$/, async (route) => {
          await page.waitForFunction(() => !!customElements.get('tanrei-button'), null, { timeout: 10000, polling: 50 }).catch(() => {});
          await route.continue();
        });
        await page.goto(origin + '/', { waitUntil: 'load' });
        await page.waitForFunction(() => window.__heroFrames.length >= 30, null, { timeout: 30000 });
        const frames = await page.evaluate(() => window.__heroFrames);
        assert.ok(frames[0].opaque, 'the primary action is drawn with an opaque fill');
        assert.deepEqual(frames.filter((frame) => frame.anchor).length, 0, 'frames drawn as a Button with the plain anchor still in it');
        const worst = Math.min(...frames.map((frame) => frame.contrast));
        assert.ok(worst >= 4.5, `the label's contrast over the fill fell to ${worst.toFixed(2)}:1`);
      } finally {
        await context.close();
      }
    });
  }
});
