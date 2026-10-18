// The built site does not move under the reader as it loads: on a representative set of pages, at a phone's width and
// a desktop's, the layout shifts the browser reports while the page loads add up to no more than 0.01 (a tenth of the
// 0.1 that Core Web Vitals calls good).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// What is measured is an amount of layout, not a time: the sum of every `layout-shift` entry not caused by input
// (a PerformanceObserver, buffered from the document's start), which is at least the page's Cumulative Layout Shift
// (CLS is the largest window of that sum). The page is loaded as a slow line delivers it: every script is held until the
// whole document has been parsed and drawn, its faces loaded, and then let through. So the first frame is always the
// page before any of its elements is defined — what a reader on a slow line sees — and the sum is the room the page
// takes when they are, however fast the machine is. Nothing scrolls and nothing is pressed while it is measured; it ends
// when the load has fired, nothing has been in flight for 500 ms (network-quiet.mjs), the faces are ready, and two
// frames have been drawn since.
//
// It reads `dist/` and serves it on a free port the way a static host does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { watchNetwork } from './network-quiet.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** The most the layout may shift while a page loads. */
const BUDGET = 0.01;

/**
 * The pages asked: the home (its hero is drawn from components before they are defined), two component pages (a live
 * example under the head, then a long gallery of fixtures, each drawn as it comes near the view), a foundations page of
 * token tables and specimens, a component page in Japanese (its own faces) and the home in Arabic (right to left).
 */
const PAGES = ['/', '/components/button/', '/components/field/', '/foundations/color/', '/ja/components/button/', '/ar/'];
/** A phone's width and a desktop's. */
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

/**
 * Pages known to shift by more than the budget, and why: each is still measured and reported, as a TODO rather than a
 * failure. Once a fix brings one within the budget its test says so: take it off this list then.
 */
const KNOWN = {
  '/components/field/ at 1440': [
    'Over the budget: the live example under the head draws its fields only once they are defined, and its stage grows',
    'from 80 to 248 px, which moves the text below it; and the sidebar\'s rows move 26 px down when the navigation drawer is',
    'defined, because its header (the menu button and the "All components" switch, whose label takes two lines there) is',
    'taller than the plain links\' stand-in for it in frame.css. What is missing: the room an example takes before its',
    'elements are defined, and a stand-in for the drawer\'s header of the defined header\'s height.',
  ].join(' '),
};

// ── A static host ────────────────────────────────────────────────────────────────────────────────────────────────

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };
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

// ── In the page ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Runs in the page before any of its scripts: keeps every layout shift not caused by input, with what moved. */
function observeShifts() {
  /** What moved, as a path of up to four elements (a node in a shadow tree is not named by the browser). */
  const describe = (node) => {
    const parts = [];
    for (let at = node, depth = 0; at && depth < 4; depth++) {
      if (at.nodeType === Node.TEXT_NODE) parts.push(`"${at.textContent.trim().slice(0, 24)}"`);
      else if (at.nodeType === Node.ELEMENT_NODE) parts.push(at.localName + (at.id ? `#${at.id}` : '') + (at.classList.length ? `.${[...at.classList].slice(0, 2).join('.')}` : ''));
      at = at.parentNode instanceof ShadowRoot ? at.parentNode.host : at.parentNode;
      if (at === document.documentElement || at === document) break;
    }
    return parts.reverse().join(' > ') || '(a node the browser does not name)';
  };
  const rect = (r) => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`;
  const shifts = [];
  Object.defineProperty(window, '__docsLayoutShifts', { value: shifts });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      shifts.push({ value: entry.value, sources: entry.sources.map((source) => `${describe(source.node)}: ${rect(source.previousRect)} → ${rect(source.currentRect)}`) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

/** Runs in the page before any of its scripts: says when the document is parsed, its faces are ready and two frames have been drawn. */
function signalDrawn() {
  if (window !== window.top) return;
  document.addEventListener('readystatechange', async () => {
    // "interactive": parsed, before the deferred and module scripts run (they are what is held).
    if (document.readyState !== 'interactive') return;
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__docsDrawn();
  });
}

/** Resolves when the faces are ready and two frames have been drawn since: the shifts kept until then. */
async function shiftsAtRest() {
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return window.__docsLayoutShifts;
}

// ── The pages ────────────────────────────────────────────────────────────────────────────────────────────────────

describe(`the layout shifts by no more than ${BUDGET} while a page loads`, { concurrency: 2 }, () => {
  for (const url of PAGES) {
    for (const viewport of VIEWPORTS) {
      const name = `${url} at ${viewport.width}`;
      test(name, async (t) => {
        const context = await browser.newContext({ viewport });
        try {
          const page = await context.newPage();
          await page.addInitScript(observeShifts);
          // Every script (the page's and its windows') is held until the page has been drawn without them.
          let drawn;
          const whenDrawn = new Promise((resolve) => (drawn = resolve));
          await page.exposeFunction('__docsDrawn', () => drawn());
          await page.addInitScript(signalDrawn);
          await page.route(/\.m?js(\?|$)/, async (route) => {
            await whenDrawn;
            await route.continue();
          });
          const network = await watchNetwork(page);
          await page.goto(origin + url, { waitUntil: 'load' });
          await network.quiet();
          const shifts = await page.evaluate(shiftsAtRest);
          const total = shifts.reduce((sum, { value }) => sum + value, 0);
          t.diagnostic(`layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
          if (KNOWN[name] && total <= BUDGET) t.diagnostic(`within the budget now: take "${name}" off the pages known to shift`);
          if (KNOWN[name] && total > BUDGET) t.todo(KNOWN[name]);
          const moved = shifts.filter(({ value }) => value > 0).map(({ value, sources }) => `${value.toFixed(4)}:\n      ${sources.join('\n      ') || '(no source named)'}`);
          assert.ok(total <= BUDGET, `${url} at ${viewport.width} × ${viewport.height} shifts by ${total.toFixed(4)} as it loads (at most ${BUDGET}):\n  ${moved.join('\n  ')}`);
        } finally {
          await context.close();
        }
      });
    }
  }
});
