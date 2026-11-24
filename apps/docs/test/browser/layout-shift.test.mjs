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
// Then, at a phone's width, the page does not move under the reader as they read it through: paged down from its top to
// its end, the shifts add up to no more than SCROLL_BUDGET (below).
//
// It reads `dist/` and serves it on a free port the way a static host does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { sheetKept, until } from './kept-sheet.mjs';
import { watchNetwork } from './network-quiet.mjs';
import { launch, settle, settlePage } from './launch.mjs';

register('../vite-shim.mjs', import.meta.url);
const { APPEARANCE_KEY, CUSTOM_KEY, LOOK_SHEET_ID, LATE_ATTR, PENDING_ATTR, SHEET_STORE } = await import('../../src/lib/appearance.ts');

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
      shifts.push({ value: entry.value, scrolled: scrollY, sources: entry.sources.map((source) => `${describe(source.node)}: ${rect(source.previousRect)} → ${rect(source.currentRect)}`) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

/**
 * Runs in the page before any of its scripts: says when the document is parsed, its faces are ready and two frames
 * have been drawn. Each wait has the bound `settle` gives it (waits.mjs: 10 s for the faces, 5 s for the frames), after
 * which the scripts are let through all the same, and the page's `goto` goes on: faces that never came are named by
 * the wait for the shifts at rest (`settlePage`), not left to hold the scripts until the `goto` runs out.
 */
function signalDrawn() {
  if (window !== window.top) return;
  const within = (ms, promise) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
  document.addEventListener('readystatechange', async () => {
    // "interactive": parsed, before the deferred and module scripts run (they are what is held).
    if (document.readyState !== 'interactive') return;
    await within(10_000, document.fonts.ready);
    await within(5_000, new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    window.__docsDrawn();
  });
}

/** The shifts kept until the faces are ready and two frames have been drawn since (each wait bounded: launch.mjs). */
async function shiftsAtRest(page) {
  await settlePage(page);
  return page.evaluate(() => window.__docsLayoutShifts);
}

// ── The pages ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The shifts of one load of `url` in `context`, every script held until the page has been drawn without them; with
 * `settled` (a function run in the page, and its argument), also once the page says it is. `done`, given the page once
 * its shifts are read, says what it wants of it before it is closed.
 */
async function loadShifts(context, url, settled, done) {
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
  const shifts = await shiftsAtRest(page);
  await done?.(page);
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

// ── Read through ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The most the layout may shift, all told, while a reader pages through a whole page at a phone's width: a quarter of
 * the 0.1 that Core Web Vitals calls good. It is a sum over the whole read, every entry of it, where the page's CLS is
 * only its largest burst (a window of five seconds at most), so the sum is the stricter of the two. It is not the tenth
 * the load is held to: a long page holds tables that are not laid out until they come near the view, each holding the
 * room of rows one line tall (ComponentSpecs.astro, the tokens' table), which wrap at this width — the Japanese Select's
 * page moved by 0.013 so as it was read through. Before a figure took its drawn room while it was still below the view
 * (lib/example.ts, `releaseSoon`), each of these pages moved by more than twice this: the Date and time picker's by 0.074, the
 * Text field's by 0.075 (0.236 in Arabic) and the Japanese Select's by 0.078.
 */
const SCROLL_BUDGET = 0.025;

/**
 * Pages of figures defined late, as a reader pages through them: four open date and time pickers under the Date and
 * time picker's head, each about 1000 px tall drawn; the Text field's examples and playground, in English and in Arabic
 * (right to left); the Select's in Japanese (its own faces).
 */
const READ = ['/components/date-time-picker/', '/components/text-field/', '/ar/components/text-field/', '/ja/components/select/'];
const PHONE = { width: 390, height: 844 };
/** How far a page down moves: the window, less the lines it keeps in view so that the reader keeps their place. */
const KEPT = 120;

describe(`the layout shifts by no more than ${SCROLL_BUDGET} while a reader pages through a page at ${PHONE.width}`, { concurrency: 2 }, () => {
  for (const url of READ) {
    test(url, { timeout: 300_000 }, async (t) => {
      const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
      try {
        const page = await context.newPage();
        await page.addInitScript(observeShifts);
        // The page loaded and quiet — what its first view asked for, and what it asks for right after its load — as it
        // is by the time a reader has read that view.
        const network = await watchNetwork(page);
        await page.goto(origin + url, { waitUntil: 'load' });
        await network.quiet({ worker: /\/sheet-worker-[^/]*\.js$/ });
        await settlePage(page);
        // A page down at a time — farther than a frame is drawn ahead of the view (half a window, lib/example.ts) — to
        // the page's end, each time once every frame in the view has been drawn, its elements defined and two frames
        // drawn since: what is drawn late moves the page then, as it does under a reader.
        for (let top = PHONE.height - KEPT; ; top += PHONE.height - KEPT) {
          const { end, inView } = await page.evaluate((y) => {
            window.scrollTo(0, y);
            const stages = [...document.querySelectorAll('[data-example-stage][id]')].filter((stage) => {
              const box = stage.getBoundingClientRect();
              return box.height > 0 && box.bottom > 0 && box.top < innerHeight;
            });
            return { end: scrollY + innerHeight >= document.documentElement.scrollHeight - 1, inView: stages.map((stage) => stage.id) };
          }, top);
          for (const id of inView) await settle(page, `[data-example]:has(> figure > [data-part="frame"] > #${id})`, { pending: '[data-example-pending], [data-pending]' });
          await settlePage(page, { fonts: false });
          if (end) break;
        }
        const shifts = await page.evaluate(() => window.__docsLayoutShifts);
        const total = shifts.reduce((sum, { value }) => sum + value, 0);
        t.diagnostic(`layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
        const moved = shifts.filter(({ value }) => value > 0).map(({ value, scrolled, sources }) => `${value.toFixed(4)}, scrolled ${Math.round(scrolled)} px:\n      ${sources.join('\n      ') || '(no source named)'}`);
        assert.ok(total <= SCROLL_BUDGET, `${url} at ${PHONE.width} × ${PHONE.height} shifts by ${total.toFixed(4)} as it is paged through (at most ${SCROLL_BUDGET}):\n  ${moved.join('\n  ')}`);
      } finally {
        await context.close();
      }
    });
  }
});

// ── Read through before the figures' elements arrive ─────────────────────────────────────────────────────────────

/**
 * Runs in the page before any of its scripts: keeps each change of a figure's stage's height made while the stage is
 * in the view, with what it was and what it became. A stage that grows or shrinks in the view moves what is below it
 * under the reader's eyes, wherever its elements' modules come from and whenever they arrive.
 */
function watchStages() {
  const changed = [];
  Object.defineProperty(window, '__docsStagesChanged', { value: changed });
  const heights = new WeakMap();
  const inView = (box) => box.height > 0 && box.bottom > 0 && box.top < innerHeight;
  const watcher = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const box = target.getBoundingClientRect();
      const before = heights.get(target);
      heights.set(target, box);
      if (!before || Math.abs(before.height - box.height) < 0.5) continue;
      // In the view before it changed, or after: either way the reader saw it move what is below it. (Its top is where
      // it is now: a stage above it that changed first has moved it already, and is counted on its own.)
      const was = { top: box.top, bottom: box.top + before.height, height: before.height };
      if (!inView(was) && !inView(box)) continue;
      changed.push({ id: target.id, gallery: Boolean(target.closest('[data-fixture-gallery]')), from: before.height, to: box.height, top: box.top, scrolled: scrollY });
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    for (const stage of document.querySelectorAll('[data-example-stage]')) watcher.observe(stage);
  });
}

/**
 * The modules that define the elements, as the site's build writes them: each component's module is a chunk of its
 * own (lib/define-on-demand.ts), the one that calls `customElements.define`.
 */
const elementChunks = new Set(
  fs.readdirSync(path.join(dist, '_astro')).filter((file) => file.endsWith('.js') && fs.readFileSync(path.join(dist, '_astro', file), 'utf8').includes('customElements.define(')),
);

/**
 * Pages read through while every element's module arrives late — `late` ms after it is asked for, as on a slow line or
 * a busy machine — so that the reader reaches figures before their elements are defined: the Text field's, whose first
 * example is a column of fields 236 px tall drawn (80 px before they are defined, without the cloak), in English and in
 * Arabic (right to left), at a phone's width and a desktop's.
 *
 * - A page's own figure does not change its height while it is in the view: what its stage holds takes its drawn room
 *   before any script runs (lib/stage-cloak.mjs), and a stage below the view takes it before the reader reaches it
 *   (lib/example.ts).
 * - A stage of the Specs tab's gallery holds the room of its fixture's baseline until the fixture is defined, and then
 *   takes its drawn room, once (lib/example.ts, `letGoWhenDefined`): never the room of the fixture before it is
 *   defined in between. The baseline is the web package's picture of the fixture, not the page's, and may differ from
 *   what the page draws (KNOWN_LATE).
 * - The layout's shifts, all told, are held to SCROLL_BUDGET, as when the modules come at once.
 */
const LATE_READS = [
  { url: '/ar/components/text-field/', viewport: PHONE, late: 1_000 },
  { url: '/components/text-field/', viewport: PHONE, late: 3_000 },
  { url: '/ar/components/text-field/', viewport: { width: 1440, height: 900 }, late: 3_000 },
  { url: '/components/text-field/', viewport: { width: 1440, height: 900 }, late: 1_000 },
];

/**
 * Pages whose shifts, read so, add up to more than SCROLL_BUDGET, and why: each is still measured and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it is within the budget.
 */
const KNOWN_LATE = {
  '/ar/components/text-field/ at 390':
    "the gallery's stacked-code-multiline-wrap is drawn 51 px taller on the page (at 390 and at 1440) than its baseline, whose room its stage holds until the fixture is drawn; the web package's harness embeds Inter alone, so its baselines draw a fixture's code in whatever monospace face the machine has, where the page draws it in Roboto Mono",
};

describe('no figure changes its height in the view while a reader pages through a page whose elements arrive late', { concurrency: 2 }, () => {
  for (const { url, viewport, late } of LATE_READS) {
    const name = `${url} at ${viewport.width}`;
    test(`${name}, each element's module ${late / 1000} s late`, { timeout: 300_000 }, async (t) => {
      const phone = viewport.width < 800;
      const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone });
      try {
        const page = await context.newPage();
        await page.addInitScript(observeShifts);
        await page.addInitScript(watchStages);
        let held = 0;
        await page.route(/\/_astro\/[^/]+\.js(\?|$)/, async (route) => {
          if (elementChunks.has(new URL(route.request().url()).pathname.split('/').pop())) {
            held++;
            await new Promise((resolve) => setTimeout(resolve, late));
          }
          await route.continue();
        });
        await page.goto(origin + url, { waitUntil: 'load' });
        // Two pages down at a time from the load on — a fling, farther than a frame is drawn ahead of the view (half a
        // window, lib/example.ts), so that the reader lands on frames whose elements have not been asked for yet — each
        // time once every frame in the view has been drawn, its elements defined and two frames drawn since.
        for (let top = 2 * (viewport.height - KEPT); ; top += 2 * (viewport.height - KEPT)) {
          const { end, inView } = await page.evaluate((y) => {
            window.scrollTo(0, y);
            const stages = [...document.querySelectorAll('[data-example-stage][id]')].filter((stage) => {
              const box = stage.getBoundingClientRect();
              return box.height > 0 && box.bottom > 0 && box.top < innerHeight;
            });
            return { end: scrollY + innerHeight >= document.documentElement.scrollHeight - 1, inView: stages.map((stage) => stage.id) };
          }, top);
          for (const id of inView) await settle(page, `[data-example]:has(> figure > [data-part="frame"] > #${id})`, { pending: '[data-example-pending], [data-pending]' });
          await settlePage(page, { fonts: false });
          if (end) break;
        }
        assert.ok(held > 0, 'no element module was asked for: the build names its chunks otherwise, and this test held nothing late');
        const changed = await page.evaluate(() => window.__docsStagesChanged);
        const shifts = await page.evaluate(() => window.__docsLayoutShifts);
        const total = shifts.reduce((sum, { value }) => sum + value, 0);
        const said = ({ id, from, to, top, scrolled }) => `#${id} ${Math.round(from)} → ${Math.round(to)} px, its top ${Math.round(top)} px down the view, scrolled ${Math.round(scrolled)} px`;
        const own = changed.filter((change) => !change.gallery);
        const gallery = changed.filter((change) => change.gallery);
        const largest = Math.max(0, ...gallery.map(({ from, to }) => Math.abs(to - from)));
        t.diagnostic(`${held} module requests held ${late} ms; layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}; ${own.length} of the page's own figures and ${gallery.length} of the gallery's stages changed in the view (the largest by ${largest.toFixed(1)} px)`);
        assert.deepEqual(own.map(said), [], `figures of ${name} changed their height in the view as it was paged through`);
        const twice = Object.entries(Object.groupBy(gallery, ({ id }) => id)).filter(([, each]) => each.length > 1);
        assert.deepEqual(twice.map(([id, each]) => `#${id}: ${each.map(said).join('; ')}`), [], `stages of ${name}'s gallery changed their height more than once in the view: from their baseline's room to their fixture's before it is defined, then to the drawn room`);
        const moved = shifts.filter(({ value }) => value > 0).map(({ value, scrolled, sources }) => `${value.toFixed(4)}, scrolled ${Math.round(scrolled)} px:\n      ${sources.join('\n      ') || '(no source named)'}`);
        if (KNOWN_LATE[name] && total <= SCROLL_BUDGET) t.diagnostic(`within the budget now: take "${name}" off the pages known to shift`);
        if (KNOWN_LATE[name] && total > SCROLL_BUDGET) return t.todo(KNOWN_LATE[name]);
        assert.ok(total <= SCROLL_BUDGET, `${name} × ${viewport.height} shifts by ${total.toFixed(4)} as it is paged through, its modules ${late} ms late (at most ${SCROLL_BUDGET}):\n  ${moved.join('\n  ')}`);
      } finally {
        await context.close();
      }
    });
  }
});

// The sidebar as the reader left it on an earlier visit (components/frame/Sidebar.astro): a width they gave it, or
// folded to its column, given back before the first frame. Neither may move the page by more than the same budget,
// and the folded one not at all: the column, the header's menu button (shown from the first frame on a page with a
// sidebar, styles/frame.css) and the playground's stage (Playground.astro) each hold the box they take once drawn.
const SIDEBAR_KEPT = [
  { name: 'a width the reader gave the sidebar', kept: { width: 320 }, budget: BUDGET },
  { name: 'the sidebar folded to its column', kept: { expanded: false }, budget: 0 },
];
describe(`with the sidebar as the reader left it, the layout shifts by no more than ${BUDGET} while a page loads`, { concurrency: 2 }, () => {
  for (const { name, kept, budget } of SIDEBAR_KEPT) {
    test(`/components/button/ at 1440, ${name}`, LIMIT, async (t) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        await context.addInitScript((value) => localStorage.setItem('tanrei-docs-sidebar-layout', value), JSON.stringify(kept));
        const shifts = await loadShifts(context, '/components/button/');
        const total = shifts.reduce((sum, { value }) => sum + value, 0);
        t.diagnostic(`layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
        const moved = shifts.filter(({ value }) => value > 0).map(({ value, sources }) => `${value.toFixed(4)}:\n      ${sources.join('\n      ') || '(no source named)'}`);
        assert.ok(total <= budget, `${name}: shifts by ${total} as it loads (at most ${budget}):\n  ${moved.join('\n  ')}`);
      } finally {
        await context.close();
      }
    });
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
        // The page shown in the theme: its sheet in, and the head's mark taken away. The first load may show it in the
        // default system instead, once REVEAL_AFTER has passed without the sheet (a machine too slow to compute it in
        // time: CI's runners), and keep the sheet for the next load; the next load reads it before its first paint. The
        // first load's sheet is written to IndexedDB while the page goes on: the next load waits until it is kept.
        const marks = { style: LOOK_SHEET_ID, pending: PENDING_ATTR, late: LATE_ATTR };
        const shown = ({ style, pending, late }) => (Boolean(document.getElementById(style)) || document.documentElement.hasAttribute(late)) && !document.documentElement.hasAttribute(pending);
        for (const load of ['computed', 'kept']) {
          let late = false;
          const shifts = await loadShifts(context, '/components/button/', [shown, marks], async (page) => {
            late = await page.evaluate((mark) => document.documentElement.hasAttribute(mark), LATE_ATTR);
            await until(page, late ? 'the sheet computed after the page was shown, kept for the next load' : 'the sheet kept for the next load', sheetKept, { ...SHEET_STORE, hash: 'shift1' });
          });
          assert.ok(load === 'computed' || !late, 'the kept sheet is read before the first paint: the page is shown in the theme');
          const total = shifts.reduce((sum, { value }) => sum + value, 0);
          t.diagnostic(`${load}${late ? ' (shown in the default system: the sheet was not in after REVEAL_AFTER)' : ''}: layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
          const moved = shifts.filter(({ value }) => value > 0).map(({ value, sources }) => `${value.toFixed(4)}:\n      ${sources.join('\n      ') || '(no source named)'}`);
          assert.ok(total <= BUDGET, `the sheet ${load}: shifts by ${total.toFixed(4)} as it loads (at most ${BUDGET}):\n  ${moved.join('\n  ')}`);
        }
      } finally {
        await context.close();
      }
    });
  }
});
