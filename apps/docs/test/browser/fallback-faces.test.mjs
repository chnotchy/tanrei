// Text drawn before its web font arrives takes the room it will take after: when the text faces come 3 s late, the
// page hardly moves as they arrive.
//
//   pnpm --filter @tanrei/docs build && node --test test/browser/fallback-faces.test.mjs
//
// The site registers its faces `font-display: swap` (src/styles/fonts.generated.css), so until a face's file arrives
// its text is drawn in the stack's next family — "Inter Fallback", "Roboto Mono Fallback", "Noto Sans JP Fallback":
// the platform's own face drawn at the web font's average width and line height (packages/tools/src/font-metrics.js).
// Here every file of the text faces (Inter, Roboto Mono, Noto Sans JP) is held until 3 s after the page was asked for
// and the page has settled in its fallbacks; then they are let through, and the layout shifts the browser reports from
// that moment until the faces are ready are summed. Each page is measured again with the fallback faces taken out of
// the stacks (the platform's faces at their own size, as before there were any).
//
// Why not nothing at all: a face drawn at another face's AVERAGE width sets a given line a little wider or narrower,
// and now and then a paragraph wraps into one line more or less. Measured on macOS (Arial, Hiragino Sans), the English
// getting-started page at a phone's width still moves by 0.0100 (a paragraph above a callout takes a line less in
// Inter), where without the fallback faces it moved by 0.0216; the typography page by 0.0002 at that width, where it
// moved by 0.1047; the Japanese getting-started page by 0, where it moved by 0.0922; the six measures together by
// 0.0115, where they moved by 0.3279. So each page is held to BUDGET, and the pages together to SHARE of what they
// move without the fallback faces.
//
// Chromium only: it is the engine that reports layout shifts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { launch } from './launch.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** How late the text faces come. */
const DELAY_MS = 3000;
/** The most a page may move as they arrive: a fifth of the 0.1 Core Web Vitals call good. */
const BUDGET = 0.02;
/** The most the pages may move together with the fallback faces, as a share of what they move without them. */
const SHARE = 0.2;
/** The files of the text faces (and of their cuts). */
const TEXT_FACES = /\/(inter|roboto-mono|noto-sans-jp)-[^/]*\.woff2(\?|$)/;
/** Pages of running text, headings and code, in English and in Japanese. */
const PAGES = ['/getting-started/web/', '/foundations/typography/', '/ja/getting-started/web/'];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
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

/** Runs in the page before any of its scripts: keeps every layout shift not caused by input, with when and what moved. */
function observeShifts() {
  const shifts = [];
  Object.defineProperty(window, '__docsLayoutShifts', { value: shifts });
  const name = (node) => (node?.nodeType === Node.ELEMENT_NODE ? node.localName + (node.id ? `#${node.id}` : '') + (node.classList.length ? `.${[...node.classList].slice(0, 2).join('.')}` : '') : (node?.textContent ?? '').trim().slice(0, 24));
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) shifts.push({ at: entry.startTime, value: entry.value, sources: entry.sources.map((source) => `${name(source.node)} ${Math.round(source.previousRect.y)}→${Math.round(source.currentRect.y)}`) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

/** The tokens' text stacks with every fallback face taken out: the page as it was drawn before there were any. */
function withoutFallbacks() {
  const style = document.createElement('style');
  const root = getComputedStyle(document.documentElement);
  const props = ['brand', 'plain', 'mono'].map((name) => `--tanrei-ref-typeface-${name}`);
  style.textContent = `:root:root:root { ${props.map((prop) => `${prop}: ${root.getPropertyValue(prop).replace(/,\s*['"][^'"]+ Fallback['"]/g, '')} !important;`).join(' ')} }`;
  document.head.append(style);
}

/**
 * Loads `url` with the text faces held, lets them through, and returns the layout shifts from that moment on.
 * @param {{ fallbacks: boolean }} options
 */
async function shiftsAsFacesArrive(url, viewport, { fallbacks }) {
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    await page.addInitScript(observeShifts);
    let release;
    const released = new Promise((resolve) => (release = resolve));
    let held = 0;
    await page.route(TEXT_FACES, async (route) => {
      held += 1;
      await released;
      await route.continue();
    });
    const asked = Date.now();
    await page.goto(origin + url, { waitUntil: 'domcontentloaded' });
    if (!fallbacks) await page.evaluate(withoutFallbacks);
    await wait(Math.max(0, DELAY_MS - (Date.now() - asked)));
    // Settled in the fallbacks: every element defined, two frames drawn, and no text face here yet.
    const before = await page.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const faces = [...document.fonts];
      return {
        at: performance.now(),
        loaded: faces.filter((face) => /^"?(Inter|Roboto Mono|Noto Sans JP)"?$/.test(face.family) && face.status === 'loaded').length,
        fallbacks: Object.fromEntries(faces.filter((face) => / Fallback"?$/.test(face.family)).map((face) => [face.family.replaceAll('"', ''), face.status])),
      };
    });
    assert.ok(held > 0, 'no text face was asked for');
    assert.equal(before.loaded, 0, 'a text face arrived while it was held');
    if (fallbacks) assert.equal(before.fallbacks['Inter Fallback'], 'loaded', `the platform has none of the faces "Inter Fallback" is drawn from: ${JSON.stringify(before.fallbacks)}`);
    release();
    const shifts = await page.evaluate(async (from) => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return window.__docsLayoutShifts.filter((shift) => shift.at > from);
    }, before.at);
    const loaded = await page.evaluate(() => [...document.fonts].filter((face) => /^"?Inter"?$/.test(face.family) && face.status === 'loaded').length);
    assert.ok(loaded > 0, 'Inter never arrived');
    return shifts;
  } finally {
    await context.close();
  }
}

const sum = (shifts) => shifts.reduce((total, { value }) => total + value, 0);
const described = (shifts) => shifts.map(({ value, sources }) => `${value.toFixed(4)}: ${sources.join(', ')}`).join('\n  ');

const totals = { with: 0, without: 0 };

describe(`a page hardly moves when its text faces arrive ${DELAY_MS / 1000} s late`, { concurrency: 2 }, () => {
  for (const url of PAGES) {
    for (const viewport of VIEWPORTS) {
      test(`${url} at ${viewport.width}`, async (t) => {
        const shifts = await shiftsAsFacesArrive(url, viewport, { fallbacks: true });
        const before = sum(await shiftsAsFacesArrive(url, viewport, { fallbacks: false }));
        totals.with += sum(shifts);
        totals.without += before;
        t.diagnostic(`layout shift as the faces arrive: ${sum(shifts).toFixed(4)} (${before.toFixed(4)} without the fallback faces)`);
        assert.ok(sum(shifts) <= BUDGET, `${url} at ${viewport.width} moves by ${sum(shifts).toFixed(4)} as its faces arrive (at most ${BUDGET}):\n  ${described(shifts)}`);
      });
    }
  }
});

test('the fallback faces take away most of the movement: what is measured is what they prevent', () => {
  assert.ok(totals.without > 0.05, `without the fallback faces the pages moved by ${totals.without.toFixed(4)} in all: too little for the measure to tell anything`);
  assert.ok(totals.with <= totals.without * SHARE, `with the fallback faces the pages moved by ${totals.with.toFixed(4)} in all, without them by ${totals.without.toFixed(4)} (at most ${SHARE} of it)`);
});
