// The focus order figure as the built site draws it (components/visuals/FocusOrder.astro, lib/visuals/focus-order.ts),
// in each engine: the stops the figure computes and numbers are the elements the Tab key actually reaches, in that
// order, and nothing else of the component; the caption's list says as many stops; and the keyboard map
// (components/visuals/KeyboardMap.astro) draws every row of its spec, each chord a Keyboard shortcut read in the page's
// language.
//
// The test focuses a stop it adds just before the figure's subject (in the figure's canvas, outside the subject, and
// out of the way), presses Tab once for each number, and reads where the focus is, through every shadow root: the
// element focused must stand where the number's stop stands. One press more leaves the component for a stop it adds
// just after the subject. WebKit moves focus to every control only with Option (Alt) and Tab, as Safari does by default.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium node --test test/browser/focus-order.test.mjs   # in one engine (all three by default)
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settle } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');
const { getSpec } = await import('../../src/lib/repo.ts');
const { keySegments } = await import('../../src/lib/visuals/keyboard.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');
let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

const FRAME = '[data-focus-order-figure]';
const VIEWPORT = { width: 1440, height: 900 };
/** The pages that draw the figure, each by the component it shows; two of them right to left. */
const PAGES = [
  { path: '/components/tabs/', name: 'tabs' },
  { path: '/components/slider/', name: 'slider' },
  { path: '/components/tree-view/', name: 'tree-view' },
  { path: '/components/accordion/', name: 'accordion' },
  { path: '/components/calendar/', name: 'calendar' },
  { path: '/components/carousel/', name: 'carousel' },
  { path: '/components/chip-field/', name: 'chip-field' },
  { path: '/components/combobox/', name: 'combobox' },
  { path: '/components/date-time-picker/', name: 'date-time-picker' },
  { path: '/components/list/', name: 'list' },
  { path: '/components/menubar/', name: 'menubar' },
  { path: '/components/one-time-code-input/', name: 'one-time-code-input' },
  { path: '/components/pagination/', name: 'pagination' },
  { path: '/components/radio-group/', name: 'radio-group' },
  { path: '/components/rating/', name: 'rating' },
  { path: '/components/segmented-button/', name: 'segmented-button' },
  { path: '/components/select/', name: 'select' },
  { path: '/components/table/', name: 'table' },
  { path: '/components/tag-group/', name: 'tag-group' },
  { path: '/components/toolbar/', name: 'toolbar' },
  { path: '/ar/components/tree-view/', name: 'tree-view' },
  { path: '/ar/components/toolbar/', name: 'toolbar' },
];

/** The figure near the view, its elements defined, the fonts in, two frames drawn, and its numbers laid. */
async function drawn(page) {
  await settle(page, FRAME, { scroll: 'center', pending: '[data-example-pending]' });
  await page.waitForFunction((selector) => document.querySelector(selector)?.dataset.focusStops !== undefined, FRAME, { timeout: 10_000 });
}

/** The numbers as the figure laid them: where each one's stop is, in the canvas's box. */
const numbers = (page) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    return [...frame.querySelectorAll('[data-example-overlay] .docs-focus-stop')].map((marker) => ({
      n: Number(marker.textContent),
      box: ['left', 'top', 'width', 'height'].map((side) => Number(marker.dataset[side])),
    }));
  }, FRAME);

/** Adds a stop just before the subject and one just after it, in the canvas, and focuses the first. */
const stopsAround = (page) =>
  page.evaluate((selector) => {
    const frame = document.querySelector(selector);
    const canvas = frame.querySelector('[data-example-canvas]');
    const subject = canvas.querySelector('[data-focus-order]');
    const stop = (name) => {
      const element = document.createElement('span');
      element.tabIndex = 0;
      element.dataset.testStop = name;
      element.style.cssText = 'position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 1px; block-size: 1px; overflow: hidden;';
      return element;
    };
    subject.before(stop('before'));
    subject.after(stop('after'));
    canvas.querySelector('[data-test-stop="before"]').focus();
    return document.activeElement?.dataset.testStop ?? null;
  }, FRAME);

/** Where the focus is, through every shadow root: inside the subject (and its box in the canvas's), or the stop the test added. */
const focused = (page) =>
  page.evaluate((selector) => {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    if (!element) return { where: 'nowhere' };
    if (element.dataset?.testStop) return { where: element.dataset.testStop };
    const frame = document.querySelector(selector);
    const canvas = frame.querySelector('[data-example-canvas]');
    const subject = canvas.querySelector('[data-focus-order]');
    let node = element;
    while (node && node !== subject) node = node.parentNode ?? node.host;
    if (!node) return { where: 'outside', tag: element.localName };
    const base = canvas.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return { where: 'subject', tag: element.localName, box: [box.left - base.left, box.top - base.top, box.width, box.height] };
  }, FRAME);

for (const engine of ENGINES) {
  describe(`the focus order figure in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const { path: address, name } of PAGES) {
      test(`${address}: Tab stops where the numbers say, in their order, and nowhere else of the component`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: VIEWPORT });
        const page = await context.newPage();
        await page.goto(`${origin}${address}`);
        await drawn(page);
        const laid = await numbers(page);
        assert.ok(laid.length > 0, `${name}: the figure numbers at least one stop`);
        assert.deepEqual(
          laid.map(({ n }) => n),
          laid.map((_, i) => i + 1),
          'the numbers count from 1',
        );
        assert.equal(await stopsAround(page), 'before');
        const tab = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
        for (const { n, box } of laid) {
          await page.keyboard.press(tab);
          const now = await focused(page);
          assert.equal(now.where, 'subject', `${name}: Tab ${n} reaches the component (it reached ${JSON.stringify(now)})`);
          now.box.forEach((value, i) => assert.ok(Math.abs(value - box[i]) <= 1, `${name}: Tab ${n} reaches ${now.tag} at ${now.box.map(Math.round)}, where number ${n} is at ${box.map(Math.round)}`));
        }
        await page.keyboard.press(tab);
        assert.deepEqual(await focused(page), { where: 'after' }, `${name}: after the last number, Tab leaves the component`);
        // The caption's list says as many stops, each in words.
        const words = await page.evaluate((selector) => [...document.querySelector(selector).querySelectorAll('[data-focus-order-list] li')].map((item) => item.textContent.trim()), FRAME);
        assert.equal(words.length, laid.length);
        for (const word of words) assert.ok(word, `${name}: every stop is said in words`);
        await context.close();
      });
    }

    test('the keyboard map draws every row of the spec, each chord a Keyboard shortcut read in the page’s language', LIMIT, async () => {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      for (const [lang, name] of [
        ['en', 'tabs'],
        ['ja', 'menu'],
        ['ar', 'tree-view'],
        ['en', 'dialog'],
        ['es', 'combobox'],
        ['zh-cn', 'select'],
        ['hi', 'date-time-picker'],
        ['ja', 'table'],
        ['ar', 'list'],
      ]) {
        await page.goto(`${origin}${lang === 'en' ? '' : `/${lang}`}/components/${name}/`);
        await settle(page, '.docs-keyboard-map', { scroll: 'center' });
        const rows = await page.evaluate(() =>
          [...document.querySelectorAll('.docs-keyboard-map tbody tr')].map((row) => ({
            chords: [...row.querySelectorAll('tanrei-keyboard-shortcut')].map((shortcut) => ({ label: shortcut.getAttribute('label'), defined: Boolean(customElements.get(shortcut.localName)), caps: shortcut.shadowRoot?.querySelectorAll('[part~="container"]').length ?? 0 })),
          })),
        );
        const keyboard = getSpec(name).accessibility.keyboard;
        assert.equal(rows.length, keyboard.length, `${lang}: a row for each row of ${name}'s spec`);
        const names = strings(lang).keys;
        keyboard.forEach((row, i) => {
          const chords = keySegments(row.keys).filter((segment) => 'chord' in segment);
          assert.equal(rows[i].chords.length, chords.length, `${lang}: ${row.keys}`);
          chords.forEach((segment, j) => {
            const drawnChord = rows[i].chords[j];
            assert.ok(drawnChord.defined && drawnChord.caps > 0, `${lang}: ${row.keys}: the chord is drawn as caps`);
            for (const key of segment.chord) if (names[key]) assert.ok(drawnChord.label.includes(names[key]), `${lang}: ${row.keys}: “${drawnChord.label}” names ${key} as ${names[key]}`);
          });
        });
      }
      await context.close();
    });
  });
}
