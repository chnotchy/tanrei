// What a page draws late holds the room it will take, in each engine: a reader who reaches a figure or a table before
// the modules that define its elements have arrived (a page down within moments of the load, a slow line) does not see
// it grow or shrink when they do, and nothing below it moves.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/held-room.test.mjs   # in one engine (all three by default)
//
// Every module that defines an element is held back until the test lets it through: the page is parsed and drawn
// without them, its faces in, and paged through from its top to its end, as a reader pages through it. Each of the
// page's own figures (a stage that is not one of the gallery's: those hold their baseline's box, layout-shift.test.mjs)
// and each table — and the description lists of status tags: a component's grid of its platforms, the status page's
// legend — is read the first time it is in the view: that is the room the reader sees it take. Then the modules are let
// through and the page is paged through again, each step once what is in the view is defined: every figure, table and
// list is as high as it was, to half a pixel. What it holds before is the web package's cloak
// (`@tanrei/web/cloak.css`, scoped to the stages: lib/stage-cloak.mjs), the tables' own rooms
// (components/Table.astro, ComponentSpecs.astro) and the status tag's (components/StatusBadge.astro).
//
// In Chromium, the Layout Instability API also says how far the page moved under a reader who is looking at a figure
// when its modules arrive: the view put on it while the modules are held, then the modules let through. The shifts,
// all told, are held to the budget a page's load is held to (layout-shift.test.mjs).
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

const { APPEARANCE_KEY } = await import('../../src/lib/appearance.ts');

/** Each test's limit, the backstop for a wait with none of its own (launch.mjs). */
const LIMIT = { timeout: 240_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');

/** The most the layout may shift under a reader looking at what arrives late: what a page's load is held to. */
const BUDGET = 0.01;

/** How long a step of the read waits for the elements in the view to be defined once their modules are let through. */
const DEFINED = 20_000;

/**
 * The modules that define the elements, as the site's build writes them: each component's module is a chunk of its
 * own (lib/define-on-demand.ts), the one that calls `customElements.define`.
 */
const elementChunks = new Set(
  fs.readdirSync(path.join(dist, '_astro')).filter((file) => file.endsWith('.js') && fs.readFileSync(path.join(dist, '_astro', file), 'utf8').includes('customElements.define(')),
);

/** The description lists of status tags, as the read names them. */
const GRID = "the platforms' grid";
const LEGEND = 'the status legend';

const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

/**
 * The pages, at a phone's width and a desktop's, and the figure a reader looks at when its modules arrive:
 * - the Text field's, whose examples of multi-line fields are each `min-rows` lines of the input's text tall (when the
 *   cloak held one line, the first of them, 384 px tall before, was 510 px drawn);
 * - the Date and time picker's, whose specs draw open pickers in place (when the cloak took them out of the page, a
 *   stage of two was 64 px tall before and 1033 px drawn);
 * - the Select's in Japanese, whose tables wrap their rows at a phone's width (its keyboard table drawn in words before
 *   its keys were defined, 1248 px tall at a phone's width, was 1126 to 1148 px once the keys were drawn in the reader's
 *   convention: components/visuals/KeyboardMap.astro now draws the reader's keys before);
 * - a component's page and the status page, in each design system a reader may choose (`system`) and in scripts other
 *   than the Latin, whose platforms' grid and legend are rows of status tags (components/StatusBadge.astro): drawn as
 *   their words before they were defined, a line of the label's text tall, each tag was 4 px lower than the small tag's
 *   container, and the grid and the legend grew when they were defined (the grid by 2 px in a desktop's window in
 *   cupertino and by 3 px at a phone's width in m3-like, the legend by 2 to 3 px). `lists` names what each must read.
 */
const CASES = [
  { url: '/components/text-field/', viewport: PHONE, look: '#docs-figure-7-stage', lists: [GRID] },
  { url: '/components/text-field/', viewport: WIDE, look: '#docs-figure-7-stage', lists: [GRID] },
  { url: '/components/date-time-picker/', viewport: PHONE, look: '#docs-figure-2-stage' },
  { url: '/components/date-time-picker/', viewport: WIDE, look: '#docs-figure-2-stage' },
  { url: '/ja/components/select/', viewport: PHONE, look: '.docs-keyboard-map', lists: [GRID] },
  { url: '/components/link/', viewport: WIDE, system: 'cupertino', look: '.availability .platforms', lists: [GRID] },
  { url: '/ar/components/link/', viewport: PHONE, system: 'm3-like', lists: [GRID] },
  { url: '/status/', viewport: WIDE, system: 'm3-like', lists: [LEGEND] },
  { url: '/hi/status/', viewport: PHONE, look: '.matrix tanrei-description-list', lists: [LEGEND] },
];

/**
 * What is known to change its height once its elements are defined, and why: each is still read and reported, as a
 * TODO rather than a failure, once every other assertion of its test holds. Take one off once it keeps its height.
 */
const KNOWN = [
  {
    url: '/components/date-time-picker/',
    width: PHONE.width,
    box: '#docs-figure-4-stage',
    why: "a range field's time wraps where the surface is narrower than its words (\"6:00 AM next day\" on two lines at a phone's width), and the cloak holds a range field at one line: how many lines it takes is a matter of the words, the width and the face, which no token says",
  },
];
const knownFor = (url, width, key) => KNOWN.find((known) => (!known.url || known.url === url) && (!known.width || known.width === width) && known.box === key);

/** Runs in the page before any of its scripts: keeps every layout shift not caused by input, with what moved. */
function observeShifts() {
  const shifts = [];
  Object.defineProperty(window, '__docsLayoutShifts', { value: shifts });
  if (!PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) return;
  const rect = (r) => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`;
  const name = (node) => (node instanceof Element ? node.localName + (node.id ? `#${node.id}` : '') : (node?.nodeName ?? '?'));
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      shifts.push({ value: entry.value, sources: entry.sources.map((source) => `${name(source.node)}: ${rect(source.previousRect)} → ${rect(source.currentRect)}`) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

/**
 * Runs in the page: pages through it from its top to its end, a window less 120 px at a time, and reads the height of
 * each of its own figures' stages, of each table and of each list of status tags (named `grid` and `legend`) the first
 * time it is in the view. With `defined`, each step waits (up to that many ms) until every element in the view is
 * defined, its faces in, then two frames: an element is defined once its stage comes near the view
 * (lib/define-on-demand.ts), so the page is defined as it is paged through.
 */
async function pageThrough({ defined, grid, legend }) {
  const seen = {};
  const lost = new Set();
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const inView = (box) => {
    const rect = box.getBoundingClientRect();
    return rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  };
  const boxes = () => [...document.querySelectorAll('[data-example-stage][id], tanrei-table, .availability .platforms, .matrix tanrei-description-list')].filter((box) => !box.closest('[data-fixture-gallery]') && inView(box));
  for (let top = 0; ; top += innerHeight - 120) {
    scrollTo(0, top);
    await frame();
    if (defined) {
      const names = [...new Set(boxes().flatMap((box) => [box, ...box.querySelectorAll('*')].map((element) => element.localName).filter((name) => name.startsWith('tanrei-'))))];
      const late = await Promise.race([
        Promise.all(names.map((name) => customElements.whenDefined(name))).then(() => null),
        new Promise((resolve) => setTimeout(() => resolve(names.filter((name) => !customElements.get(name))), defined)),
      ]);
      for (const name of late ?? []) lost.add(name);
      await document.fonts.ready;
      await frame();
      await frame();
    }
    for (const box of boxes()) {
      const key =
        box.localName === 'tanrei-description-list'
          ? box.matches('.platforms') ? grid : legend
          : box.localName !== 'tanrei-table' ? `#${box.id}` : `${box.classList.contains('docs-keyboard-map') ? 'keyboard table' : 'table'} "${box.getAttribute('label')}"`;
      seen[key] ??= box.getBoundingClientRect().height;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 1) break;
  }
  scrollTo(0, 0);
  return { seen, lost: [...lost] };
}

/**
 * Runs in the page: every element a figure holds within a window of the view is defined (up to `bound` ms), its faces
 * in. (Not the frame's own: the header's search is defined when it is used, search-on-use.test.mjs.)
 */
async function nearDefined(bound) {
  const near = [...document.querySelectorAll('[data-example-stage] *')].filter((element) => {
    if (!element.localName.startsWith('tanrei-')) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom > -innerHeight && rect.top < 2 * innerHeight;
  });
  const names = [...new Set(near.map((element) => element.localName))];
  const late = await Promise.race([
    Promise.all(names.map((name) => customElements.whenDefined(name))).then(() => null),
    new Promise((resolve) => setTimeout(() => resolve(names.filter((name) => !customElements.get(name))), bound)),
  ]);
  await document.fonts.ready;
  return late;
}

/**
 * Opens `url` with every element's module held back until `release()` is called. Resolves once the page has been
 * parsed and drawn without them and its faces are in.
 */
async function openHeld(context, url, system) {
  const page = await context.newPage();
  await page.addInitScript(observeShifts);
  // The design system the reader chose, as the Appearance panel keeps it (lib/appearance.ts).
  if (system) await page.addInitScript(({ key, look }) => localStorage.setItem(key, JSON.stringify({ look })), { key: APPEARANCE_KEY, look: system });
  let release;
  const released = new Promise((resolve) => (release = resolve));
  let held = 0;
  await page.route(/\/_astro\/[^/]+\.js(\?|$)/, async (route) => {
    if (elementChunks.has(new URL(route.request().url()).pathname.split('/').pop())) {
      held++;
      await released;
    }
    await route.continue();
  });
  // Not the load: a module the page's scripts import may be one held back.
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => document.readyState !== 'loading', null, { timeout: 30_000 });
  // Its faces in: Firefox and WebKit resolve `document.fonts.ready` only once the document has loaded, which it does not
  // while its modules are held (Firefox's `document.fonts.status` stays "loading" too), so the faces are asked one by one.
  await page.waitForFunction(() => [...document.fonts].every((face) => face.status !== 'loading'), null, { timeout: 30_000 });
  await settlePage(page, { fonts: false });
  return { page, release, held: () => held };
}

let host;
before(async () => {
  host = await serveDist(dist);
});
after(async () => {
  await host?.close();
});

for (const engine of ENGINES) {
  describe(`in ${engine}, a figure or a table drawn late holds the room it will take`, { concurrency: 1 }, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const { url, viewport, look, system, lists = [] } of CASES) {
      const name = `${url} at ${viewport.width}${system ? ` in ${system}` : ''}`;
      const phone = viewport.width < 800;
      test(`${name}: each of its own figures, each table and each list of status tags, paged through before its elements are defined, is as high once they are`, LIMIT, async (t) => {
        const context = await browser.newContext({ viewport, isMobile: phone && engine !== 'firefox', hasTouch: phone });
        try {
          const { page, release, held } = await openHeld(context, host.origin + url, system);
          const { seen: before } = await page.evaluate(pageThrough, { defined: 0, grid: GRID, legend: LEGEND });
          if (system) assert.equal(await page.evaluate(() => document.documentElement.dataset.docsLook), system, `${name}: the page is not drawn in ${system}`);
          for (const list of lists) assert.ok(list in before, `${name}: ${list} was not read, and this test holds nothing of it`);
          // Before they are defined, a keyboard table's keys are drawn, not an empty box: each key of the reader's
          // convention is painted (the cloak, where a stage holds one, leaves keys the page wrote to their own sheet).
          const keys = await page.evaluate(() => {
            const shown = [...document.querySelectorAll('.docs-keyboard-map [data-tanrei-keys-key]')].filter((key) => getComputedStyle(key.closest('[data-tanrei-keys]')).display !== 'none');
            const shortcuts = document.querySelectorAll('.docs-keyboard-map tanrei-keyboard-shortcut').length;
            return { shortcuts, shown: shown.length, unpainted: shown.filter((key) => getComputedStyle(key).visibility !== 'visible' || key.getBoundingClientRect().width === 0).length, defined: !!customElements.get('tanrei-keyboard-shortcut') };
          });
          assert.equal(keys.defined, false, `${name}: the Keyboard shortcut was defined while its module was held`);
          // A table whose rows name no chord (the Text field's: «Printable characters») has no key to draw.
          if (keys.shortcuts) assert.ok(keys.shown >= keys.shortcuts, `${name}: a keyboard table drew ${keys.shown} keys for its ${keys.shortcuts} shortcuts before its elements were defined`);
          assert.equal(keys.unpainted, 0, `${name}: ${keys.unpainted} of a keyboard table's ${keys.shown} keys were not painted before their elements were defined`);
          release();
          // Once to define the page as a reader would reach it, and again to read it as it stands then.
          await page.evaluate(pageThrough, { defined: DEFINED, grid: GRID, legend: LEGEND });
          const { seen: after, lost } = await page.evaluate(pageThrough, { defined: DEFINED, grid: GRID, legend: LEGEND });
          assert.deepEqual(lost, [], `${name}: elements in the view not defined once their modules were let through`);
          assert.ok(held() > 0, 'no element module was asked for: the build names its chunks otherwise, and this test held nothing');
          const changed = Object.entries(before)
            .filter(([key, height]) => key in after && Math.abs(after[key] - height) >= 0.5)
            .map(([key, height]) => ({ key, said: `${key} ${height.toFixed(2)} → ${after[key].toFixed(2)} px`, known: knownFor(url, viewport.width, key) }));
          const known = changed.filter((change) => change.known);
          t.diagnostic(`${held()} module requests held; ${Object.keys(before).length} figures and tables read; ${changed.length} changed (${known.length} known): ${changed.map((change) => change.said).join(', ') || 'none'}`);
          assert.deepEqual(
            changed.filter((change) => !change.known).map((change) => change.said),
            [],
            `${name}: what the page draws late changed its height once its elements were defined`,
          );
          if (known.length) t.todo(known.map((change) => `${change.said}: ${change.known.why}`).join('\n'));
        } finally {
          await context.close();
        }
      });

      if (engine !== 'chromium' || !look) continue;
      test(`${name}: a reader looking at ${look} when its modules arrive sees the page move by no more than ${BUDGET}`, LIMIT, async (t) => {
        const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone });
        try {
          const { page, release } = await openHeld(context, host.origin + url, system);
          await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: 'start' }), look);
          await settlePage(page, { fonts: false });
          await page.evaluate(() => (window.__docsLayoutShifts.length = 0));
          release();
          const late = await page.evaluate(nearDefined, DEFINED);
          assert.equal(late, null, `${name}: elements near the view not defined once their modules were let through: ${late}`);
          await settlePage(page, { fonts: false, frames: 4 });
          const shifts = await page.evaluate(() => window.__docsLayoutShifts);
          const total = shifts.reduce((sum, { value }) => sum + value, 0);
          t.diagnostic(`layout shift ${total.toFixed(4)} in ${shifts.length} entr${shifts.length === 1 ? 'y' : 'ies'}`);
          const moved = shifts.map(({ value, sources }) => `${value.toFixed(4)}:\n      ${sources.join('\n      ') || '(no source named)'}`);
          assert.ok(total <= BUDGET, `${name}, looking at ${look}: the page moves by ${total.toFixed(4)} when its modules arrive (at most ${BUDGET}):\n  ${moved.join('\n  ')}`);
        } finally {
          await context.close();
        }
      });
    }
  });
}
