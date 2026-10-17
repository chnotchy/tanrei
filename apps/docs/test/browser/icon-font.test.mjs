// The built site's icon fonts: every icon the site draws is a glyph of the file it is drawn from — the families are
// registered from files cut down to the names the site's sources and the components use (packages/tools/src/glyphs.js,
// font-faces.js --icon-glyphs) — a page stays within its transfer budget, and the Theme Studio page, which may draw
// any glyph at any weight, takes the full files after it has loaded.
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
import { chromium } from '@playwright/test';
import { iconFont } from '../../../../packages/tools/src/icon-font.js';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** The most a page of the site may transfer, compressed, with every file it asks for before it is idle: 1,200 KB. It was 6,085 KB (home) and 6,233 KB (a component page) with the full icon file, 5,249 KB of it. */
const PAGE_BUDGET = 1200 * 1024;

// ── The site's files ─────────────────────────────────────────────────────────────────────────────────────────────

const assets = fs.readdirSync(path.join(dist, '_astro'));
/** The file a family is drawn from on every page: the cut-down one the build emitted. */
const cutFile = (family) => {
  const name = assets.find((file) => file.startsWith(`${family.toLowerCase().replaceAll(' ', '-')}.subset.generated.`) && file.endsWith('.woff2'));
  assert.ok(name, `dist/_astro has no cut-down file of ${family}`);
  return path.join(dist, '_astro', name);
};
const FAMILIES = ['Material Symbols Rounded', 'Material Symbols Outlined'];
const fonts = Object.fromEntries(await Promise.all(FAMILIES.map(async (family) => [family, await iconFont(fs.readFileSync(cutFile(family)))])));

/** Every built page, as [url, file]: the root language's and each other language's. */
const pages = [];
const walk = (dir, url) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '_astro' && entry.name !== 'pagefind') walk(path.join(dir, entry.name), `${url}${entry.name}/`);
    else if (entry.name === 'index.html') pages.push([url, path.join(dir, entry.name)]);
  }
};
walk(dist, '/');
pages.sort(([a], [b]) => (a < b ? -1 : 1));
const languages = new Set(fs.readdirSync(path.join(docs, 'src/content/docs')).filter((name) => fs.existsSync(path.join(docs, 'src/content/docs', name, 'components'))));
const rootPages = pages.filter(([url]) => !languages.has(url.split('/')[1]));

/** The words a family draws as one glyph of its cut-down file, and those it does not. */
function undrawn(family, words) {
  const font = fonts[family];
  return [...words].filter((word) => {
    for (const FILL of [0, 1]) {
      const glyphs = font.shape(word, { FILL, wght: 300, opsz: 24 });
      if (glyphs.length !== 1 || glyphs[0] === 0) return true;
    }
    return false;
  });
}

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
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

// ── The tests ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('every icon of the built pages is a glyph of the cut-down file', { concurrency: 4 }, () => {
  test('the icon words written into every page, in every language', () => {
    // An icon written as markup: a bare `.tanrei-icon`, a glyph attribute (`icon`, `leading-icon`, `glyph`…), the
    // text of a glyph slot (`slot="icon"`, `slot="leading-icon"`, `slot="chevron"`…).
    const words = new Map();
    for (const [url, file] of pages) {
      const html = fs.readFileSync(file, 'utf8');
      const add = (word) => (words.get(word) ?? words.set(word, new Set()).get(word)).add(url);
      for (const m of html.matchAll(/<[a-z][\w-]*\s[^>]*?class="[^"]*\btanrei-icon\b[^"]*"[^>]*>\s*([^<]*?)\s*</g)) add(m[1]);
      for (const m of html.matchAll(/\s(?:icon|glyph|[a-z]+(?:-[a-z]+)*-icon)="([a-z0-9_]+)"/g)) add(m[1]);
      for (const m of html.matchAll(/<[a-z][\w-]*\s[^>]*?\bslot="(?:icon|[a-z-]+-icon|chevron|chevron-open)"[^>]*>\s*([a-z0-9_]+)\s*</g)) add(m[1]);
    }
    assert.ok(words.size > 50, `found ${words.size} icon words`);
    for (const family of FAMILIES) {
      const missing = undrawn(family, words.keys());
      assert.deepEqual(missing.map((word) => `${word} (${[...words.get(word)].slice(0, 2).join(', ')})`), [], `${family}: words the pages draw that its cut-down file has no glyph for`);
    }
  });

  test('there are pages to open', () => assert.ok(rootPages.length > 100, `${rootPages.length} pages`));
  // Drawn: the components' own glyphs in their shadow roots and generated boxes, after they are defined. A glyph
  // drawn only once something is opened is in the list the components' code gives (glyphs.json, tested with the
  // font in packages/tools/test/glyphs.test.js).
  for (const [url] of rootPages.filter(([url]) => !url.includes('/theme-studio/'))) {
    test(`drawn on ${url}`, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await page.goto(origin + url, { waitUntil: 'load' });
        await page.waitForFunction(() => [...document.querySelectorAll('*')].every((el) => !el.localName.includes('-') || el.matches(':defined')), null, { timeout: 30000 }).catch(() => {});
        const drawn = await page.evaluate(() => {
          const out = [];
          const icon = (style) => /^["']?Material Symbols/.test(style.fontFamily);
          const visit = (root) => {
            for (const el of root.querySelectorAll('*')) {
              const style = getComputedStyle(el);
              if (icon(style)) {
                const text = [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim();
                if (text) out.push([style.fontFamily.split(',')[0].replace(/["']/g, '').trim(), text]);
              }
              for (const pseudo of ['::before', '::after']) {
                const generated = getComputedStyle(el, pseudo);
                const content = generated.content.match(/^"([a-z0-9_]+)"/)?.[1];
                if (content && icon(generated)) out.push([generated.fontFamily.split(',')[0].replace(/["']/g, '').trim(), content]);
              }
              if (el.shadowRoot) visit(el.shadowRoot);
            }
          };
          visit(document);
          return out;
        });
        for (const family of FAMILIES) {
          const words = new Set(drawn.filter(([of]) => of === family).map(([, word]) => word));
          assert.deepEqual(undrawn(family, words), [], `${family} on ${url}`);
        }
      } finally {
        await context.close();
      }
    });
  }
});

/** What a page transfers before it is idle, compressed: [total bytes, the icon files' bytes, the largest requests]. */
async function transfer(url) {
  const context = await browser.newContext({ viewport: { width: 412, height: 823 } });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const requests = new Map();
    cdp.on('Network.responseReceived', (event) => requests.set(event.requestId, { url: event.response.url, bytes: 0 }));
    cdp.on('Network.loadingFinished', (event) => requests.has(event.requestId) && (requests.get(event.requestId).bytes = event.encodedDataLength));
    await page.goto(origin + url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    const list = [...requests.values()];
    const sum = (rows) => rows.reduce((total, row) => total + row.bytes, 0);
    return { total: sum(list), icons: sum(list.filter((row) => /material-symbols/.test(row.url))), largest: list.sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((row) => `${Math.round(row.bytes / 1024)} KB ${row.url.replace(origin, '')}`) };
  } finally {
    await context.close();
  }
}

describe('what a page transfers', () => {
  for (const url of ['/', '/components/button/']) {
    test(`${url}: at most ${PAGE_BUDGET / 1024} KB, its icon file one of the small ones`, async (t) => {
      const { total, icons, largest } = await transfer(url);
      t.diagnostic(`${url}: ${Math.round(total / 1024)} KB, the icon files ${Math.round(icons / 1024)} KB`);
      assert.ok(total <= PAGE_BUDGET, `${url} transferred ${Math.round(total / 1024)} KB: ${largest.join('; ')}`);
      assert.ok(icons > 0 && icons < 200 * 1024, `${url}: the icon files are ${Math.round(icons / 1024)} KB`);
    });
  }
});

describe('the Theme Studio page', () => {
  test('takes the full icon files once it has loaded, and from then on draws any glyph', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}/foundations/theme-studio/`, { waitUntil: 'load' });
      // A glyph no list names, drawn in the default icon family: its name in letters, wider than its 1 em box,
      // until the full file is the family's face.
      const width = () => page.evaluate(() => {
        const probe = document.body.appendChild(Object.assign(document.createElement('span'), { textContent: 'pets', style: "font: 24px 'Material Symbols Rounded'; position: absolute; white-space: nowrap" }));
        const drawn = probe.getBoundingClientRect().width;
        probe.remove();
        return drawn;
      });
      await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => /material-symbols-rounded-latin-full-normal/.test(entry.name) && entry.responseEnd > 0), null, { timeout: 60000 });
      const full = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const entry = performance.getEntriesByType('resource').find((e) => /material-symbols-rounded-latin-full-normal/.test(e.name));
        return { asked: entry.startTime, loaded: nav.loadEventStart };
      });
      assert.ok(full.asked >= full.loaded, `the full file was asked for at ${Math.round(full.asked)} ms, before the page's load at ${Math.round(full.loaded)} ms`);
      await page.evaluate(() => document.fonts.load("24px 'Material Symbols Rounded'", 'pets'));
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      assert.equal(Math.round(await width()), 24, 'a glyph outside the lists is drawn as a glyph');

      // Any other page draws it as its name: the cut-down file is all it has.
      await page.goto(`${origin}/foundations/icons/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.load("24px 'Material Symbols Rounded'", 'pets'));
      assert.ok((await width()) > 30, 'on another page the full file is not registered');
    } finally {
      await context.close();
    }
  });
});
