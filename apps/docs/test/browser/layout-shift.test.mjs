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
import { register } from 'node:module';
import { watchNetwork } from './network-quiet.mjs';
import { launch } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { APPEARANCE_KEY, CUSTOM_KEY, CUSTOM_STYLE_ID, PENDING_ATTR } = await import('../../src/lib/appearance.ts');

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the Button page at 390,
// took 16 s in CI.
const LIMIT = { timeout: 120_000 };

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
const KNOWN = {};

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
  browser = await launch();
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

/**
 * The shifts of one load of `url` in `context`, every script held until the page has been drawn without them; with
 * `settled` (a function run in the page, and its argument), also once the page says it is.
 */
async function loadShifts(context, url, settled) {
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
  // (The reader's own theme is computed in a worker the page starts: its script is not counted, network-quiet.mjs.)
  await network.quiet({ worker: /\/sheet-worker-[^/]*\.js$/ });
  if (settled) await page.waitForFunction(settled[0], settled[1], { timeout: 60_000 });
  const shifts = await page.evaluate(shiftsAtRest);
  await page.close();
  return shifts;
}

describe(`the layout shifts by no more than ${BUDGET} while a page loads`, { concurrency: 2 }, () => {
  for (const url of PAGES) {
    for (const viewport of VIEWPORTS) {
      const name = `${url} at ${viewport.width}`;
      test(name, LIMIT, async (t) => {
        const context = await browser.newContext({ viewport });
        try {
          const shifts = await loadShifts(context, url);
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

// The reader's own theme (src/lib/custom-theme.ts): a page is hidden until the theme's stylesheet is in, and drawn in
// it from then on — the first time, when the sheet is computed in a worker, and every time after, when it is read
// from IndexedDB before the first paint. Neither load may move the page by more than the same budget. The theme is a
// layer as Theme Studio writes one: a brand color of its own, and denser than the default system, at the least size
// unit Theme Studio offers (its size row, packages/studio/src/core.js), so that its sheet changes sizes as well as colors.
const NS = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8')).namespace;
const dial = (value) => ({ $value: { value, unit: 'px' }, reason: 'Chosen in Theme Studio.' });
const tone = (light, dark) => ({ derive: { fn: 'tone', palette: 'primary', tone: { light, dark } } });
const THEME = {
  key: CUSTOM_KEY,
  appearance: APPEARANCE_KEY,
  layer: {
    id: 'acme',
    extends: NS,
    palettes: { primary: { source: { seed: '#0b6e4f' } } },
    tokens: {
      [`${NS}.sys.color.primary`]: tone([45, 38, 30], [72, 80, 87]),
      [`${NS}.sys.color.on-primary`]: tone([100], [10]),
      [`${NS}.sys.color.primary-container`]: tone([93, 91, 89], [22]),
      [`${NS}.sys.color.on-primary-container`]: tone([20, 15, 10], [88, 92, 96]),
      [`${NS}.sys.color.inverse-primary`]: tone([80], [40]),
      [`${NS}.dial.space.unit`]: dial(6),
      [`${NS}.dial.size.unit`]: dial(3),
    },
  },
};
describe(`under the reader's own theme, the layout shifts by no more than ${BUDGET} while a page loads`, { concurrency: 2 }, () => {
  for (const viewport of VIEWPORTS) {
    test(`/components/button/ at ${viewport.width}, the sheet computed and then kept`, LIMIT, async (t) => {
      const context = await browser.newContext({ viewport });
      try {
        await context.addInitScript(({ key, appearance, layer }) => {
          if (location.protocol !== 'http:' || localStorage.getItem(key)) return;
          localStorage.setItem(key, JSON.stringify({ hash: 'shift1', layer }));
          localStorage.setItem(appearance, JSON.stringify({ look: 'custom' }));
        }, THEME);
        // The page shown in the theme: its sheet in, and the head's mark taken away.
        const inTheme = ({ style, pending }) => document.getElementById(style) && !document.documentElement.hasAttribute(pending);
        for (const load of ['computed', 'kept']) {
          const shifts = await loadShifts(context, '/components/button/', [inTheme, { style: CUSTOM_STYLE_ID, pending: PENDING_ATTR }]);
          const total = shifts.reduce((sum, { value }) => sum + value, 0);
          t.diagnostic(`${load}: layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
          const moved = shifts.filter(({ value }) => value > 0).map(({ value, sources }) => `${value.toFixed(4)}:\n      ${sources.join('\n      ') || '(no source named)'}`);
          assert.ok(total <= BUDGET, `the sheet ${load}: shifts by ${total.toFixed(4)} as it loads (at most ${BUDGET}):\n  ${moved.join('\n  ')}`);
        }
      } finally {
        await context.close();
      }
    });
  }
});
