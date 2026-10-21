// The built site's icon fonts: every icon the site draws is a glyph of the file it is drawn from — the families are
// registered from files cut down to the names the site's sources and the components use (packages/tools/src/glyphs.js,
// font-faces.js --icon-glyphs) — a page stays within its transfer budget, and the Theme Studio page, which may draw
// any glyph at any weight, takes the full files after it has loaded.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port the way the host does (host.mjs) (text compressed with Brotli).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { iconFont } from '../../../../packages/tools/src/icon-font.js';
import { watchNetwork } from './network-quiet.mjs';
import { serveDist } from './host.mjs';

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

let host;
let origin;
let browser;

before(async () => {
  host = await serveDist(dist, { brotli: true });
  origin = host.origin;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await host?.close();
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

/**
 * What a page transfers before it is idle, compressed: [total bytes, the icon files' bytes, the largest requests]. Idle
 * is the load, then 500 ms with nothing in flight (network-quiet.mjs): Playwright's `networkidle` can be lost on a page
 * as long as a component's, and its wait then runs out with nothing in flight.
 */
async function transfer(url) {
  const context = await browser.newContext({ viewport: { width: 412, height: 823 } });
  try {
    const page = await context.newPage();
    const { cdp, quiet } = await watchNetwork(page);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const requests = new Map();
    // What a file weighs on the wire, less its response's head: this server speaks HTTP/1.1 and writes every header of
    // every response in full, where the host's HTTP/2 and HTTP/3 send a header it sent before on the connection in a
    // few bytes — the host's headers (the content security policy is 400 bytes) would otherwise count about 60 KB.
    const heads = new Map();
    cdp.on('Network.responseReceivedExtraInfo', (event) => heads.set(event.requestId, event.headersText?.length ?? 0));
    cdp.on('Network.responseReceived', (event) => requests.set(event.requestId, { url: event.response.url, bytes: 0 }));
    cdp.on('Network.loadingFinished', (event) => requests.has(event.requestId) && (requests.get(event.requestId).bytes = event.encodedDataLength - (heads.get(event.requestId) ?? 0)));
    await page.goto(origin + url, { waitUntil: 'load' });
    await quiet();
    const list = [...requests.values()];
    const sum = (rows) => rows.reduce((total, row) => total + row.bytes, 0);
    const drawn = await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/["']/g, '')));
    return { total: sum(list), icons: sum(list.filter((row) => /material-symbols/.test(row.url))), largest: list.sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((row) => `${Math.round(row.bytes / 1024)} KB ${row.url.replace(origin, '')}`), files: list.map((row) => row.url.replace(/^.*\//, '')), drawn };
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

// Noto Sans JP comes in about 120 files by Unicode range, each taken whole for any one of its characters: the Button
// page's guideline quotes 保存 and デプロイ, and its six characters took 107 KB of three files. A page not in Japanese
// draws them from the site's cut of the family (font-faces.js --text-cut), a page in Japanese from the family's files.
describe('the Japanese a page quotes', () => {
  const slice = /^noto-sans-jp-\d+-wght-normal\./;
  const cut = /^noto-sans-jp-cut-\d+\.generated\./;
  test('on a page not in Japanese, is drawn from the cut: none of the family’s own files', async () => {
    const { files, drawn } = await transfer('/components/button/');
    assert.deepEqual(files.filter((file) => slice.test(file)), []);
    assert.ok(files.some((file) => cut.test(file)), files.join(', '));
    assert.ok(drawn.includes('Noto Sans JP Cut'), drawn.join(', '));
  });
  test('on a page in Japanese, is drawn from the family’s own files, and the cut is not asked for', async () => {
    const { files } = await transfer('/ja/components/button/');
    assert.deepEqual(files.filter((file) => cut.test(file)), []);
    assert.ok(files.some((file) => slice.test(file)), files.join(', '));
  });
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
