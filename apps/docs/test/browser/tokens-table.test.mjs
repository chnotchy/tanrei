// A component's tokens table as the built site draws it (components/ComponentSpecs.astro), on the page of the component
// with the most tokens, the button's, in each engine (`DOCS_ENGINES`), at a phone's width and a desktop's:
//
// - it is not laid out until it comes near the view (`content-visibility: auto`), and the room it holds until then is
//   one line of the Table's small cell for each of its rows and its header row: drawn, every row and the header row
//   is that one line — no cell of it wraps — and the table is as tall as the room it held, to a pixel;
// - so it is on the pages where its cells wrapped most when a column could break them (a shadow's layers, an easing's
//   numbers, a header in a narrow column), in English and in the languages whose headers are longest, at a phone's
//   width and a desktop's: a browser without scroll anchoring (Safari) moves what the reader sees by whatever the
//   table, drawn above the view, takes beyond the room it held (280 px on the Japanese Select's page, 3000 on the FAB
//   menu's, when the values wrapped);
// - its words are found by the browser's find in page while it is away from the view;
// - once it is near, the Table has read its sizes: where it scrolls it is a focus stop and a region;
// - while it is away, a layout of the page does not lay out its rows, on a page that reads right to left too: the box
//   that skips it is a block of its own around the Table, which is a size container — WebKit lays out the content of a
//   skipped box that is a size container all the same, and with the skipping on the Table itself a layout of the
//   Arabic button's page took two and a half times as long as one without the table (in CI's container image, 457 ms
//   against 175).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the table at 390, in
// WebKit, took 15 s in CI.
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');
const PAGE = '/components/button/';
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
/**
 * The pages whose tokens table outgrew the room it held most, when its values and headers could wrap (of every
 * component page in all six languages, at 390 in Chromium, 532 of 588 were taller than they held, and Firefox and
 * WebKit drew the pages measured in them alike, at 390 and at 1440): the FAB menu's (3012 px, its shadows and
 * easings), the Main action button's (2252), the Chip's (920), the Select's, where it was first seen (280), and the
 * File upload's, whose header row took several lines in Hindi and in Arabic.
 */
const WORST = ['/es/components/fab-menu/', '/hi/components/main-action-button/', '/components/chip/', '/ja/components/select/', '/hi/components/file-upload/', '/ar/components/file-upload/'];
/** The box that holds the room of the tokens table's rows, and the tokens table: the small Table of the Specs tab in it. */
const BOX = '[style*="--docs-token-rows"]';
const TABLE = `${BOX} > tanrei-table[size="small"]`;

let host;
let origin;

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});

after(async () => {
  await host?.close();
});

for (const engine of ENGINES) {
  describe(`the tokens table in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const viewport of VIEWPORTS) {
      test(`at ${viewport.width} wide it holds the room of its rows until it is near, its words are found while it is away, and the Table reads its sizes once it is drawn`, LIMIT, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
        const page = await context.newPage();
        await page.goto(`${origin}${PAGE}`);
        await page.waitForLoadState('load');

        const away = await page.evaluate(({ selector, box }) => {
          const table = document.querySelector(selector);
          const style = getComputedStyle(document.querySelector(box));
          const last = table.querySelector(':scope > table > tbody > tr:last-child > td code')?.textContent ?? '';
          getSelection().removeAllRanges();
          const found = window.find(last, true);
          getSelection().removeAllRanges();
          scrollTo(0, 0);
          return {
            visibility: style.contentVisibility,
            held: style.containIntrinsicBlockSize,
            rows: table.querySelectorAll(':scope > table > tbody > tr').length,
            below: table.getBoundingClientRect().top > innerHeight,
            last,
            found,
          };
        }, { selector: TABLE, box: BOX });
        assert.equal(away.visibility, 'auto', 'it is not laid out until it comes near the view');
        assert.ok(away.below, 'it stands below the first view of the page');
        assert.ok(away.rows > 100, `it is the page's long table (${away.rows} rows)`);
        assert.ok(away.found, `find in page finds «${away.last}», in its last row, while it is away from the view`);
        const held = Number(/([\d.]+)px$/.exec(away.held)?.[1]);
        assert.ok(held > 0, `it holds a room before it is drawn (${away.held})`);

        // Drawn: near the view, its elements defined, the fonts in, four frames since (each wait bounded: launch.mjs).
        await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: 'start' }), BOX);
        await settlePage(page, { tags: ['tanrei-table', 'tanrei-swatch'], frames: 4 });
        const drawn = await page.evaluate(({ selector, box }) => {
          const table = document.querySelector(selector);
          const rows = [...table.querySelectorAll(':scope > table > :is(thead, tbody) > tr')].map((row) => ({ height: row.getBoundingClientRect().height, cells: [...row.cells].map((cell) => cell.textContent.trim()).join(' | ') }));
          return { rows, height: document.querySelector(box).getBoundingClientRect().height, scrolls: table.scrollWidth - table.clientWidth > 1, tabindex: table.getAttribute('tabindex'), role: table.getAttribute('role') };
        }, { selector: TABLE, box: BOX });
        const line = held / drawn.rows.length;
        const offLine = drawn.rows.filter((row) => Math.abs(row.height - line) >= 0.5);
        assert.deepEqual(offLine, [], `every row, the header row too, is the one line each row holds (${line.toFixed(2)} px)`);
        assert.ok(Math.abs(drawn.height - held) < 1, `drawn, it is as tall as the room it held: ${drawn.height} px against ${held} px`);
        if (drawn.scrolls) {
          assert.equal(drawn.tabindex, '0', 'where it scrolls it is a focus stop once it is drawn');
          assert.equal(drawn.role, 'region', 'where it scrolls it is a region once it is drawn');
        }
        await context.close();
      });
    }

    for (const viewport of VIEWPORTS) {
      test(`at ${viewport.width} wide, on the pages whose cells wrapped most, it is drawn as tall as the room it held`, LIMIT, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
        const page = await context.newPage();
        const off = [];
        for (const address of WORST) {
          await page.goto(`${origin}${address}`);
          await page.waitForLoadState('load');
          const { held, swatches } = await page.evaluate((box) => {
            const element = document.querySelector(box);
            const below = element.getBoundingClientRect().top > innerHeight;
            return { held: below ? getComputedStyle(element).containIntrinsicBlockSize : null, swatches: Boolean(element.querySelector('tanrei-swatch')) };
          }, BOX);
          assert.ok(held, `${address}: the table stands below the first view of the page`);
          await page.evaluate((box) => document.querySelector(box).scrollIntoView({ block: 'start' }), BOX);
          // A table of no color token has no swatch, and its page may define none.
          await settlePage(page, { tags: swatches ? ['tanrei-table', 'tanrei-swatch'] : ['tanrei-table'], frames: 4 });
          const drawn = await page.evaluate(({ selector, box }) => {
            const rows = [...document.querySelectorAll(`${selector} > table > :is(thead, tbody) > tr`)];
            const line = Math.min(...rows.map((row) => row.getBoundingClientRect().height));
            const taller = rows.filter((row) => row.getBoundingClientRect().height > line + 0.5).map((row) => `«${[...row.cells].map((cell) => cell.textContent.trim()).join(' | ')}» ${row.getBoundingClientRect().height} px`);
            return { height: document.querySelector(box).getBoundingClientRect().height, taller };
          }, { selector: TABLE, box: BOX });
          const room = Number(/([\d.]+)px$/.exec(held)?.[1]);
          if (!(Math.abs(drawn.height - room) < 1)) off.push(`${address}: held ${room} px, drawn ${drawn.height} px; taller than one line: ${drawn.taller.slice(0, 3).join('; ')}`);
        }
        assert.deepEqual(off, [], 'drawn, the tokens table is as tall as the room it held, to a pixel');
        await context.close();
      });
    }

    test('while it is away from the view, a layout of a page that reads right to left does not lay out its rows', LIMIT, async () => {
      const context = await browser.newContext({ viewport: VIEWPORTS[1], reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await context.newPage();
      await page.goto(`${origin}/ar${PAGE}`);
      await settlePage(page, { frames: 4 });
      // Engine work against engine work, in the same page and moment: a layout of the whole page (the body narrowed to a
      // width that narrows the content's column, and widened back, each read back) with the table where it is, and
      // with its box taken out of the layout, in turn, the median of each.
      // Skipped, the table adds nothing; laid out, its 580 rows are most of the page's layout.
      const { kept, without, below } = await page.evaluate((box) => {
        const held = document.querySelector(box);
        const body = document.body;
        const layout = () => {
          const start = performance.now();
          body.style.width = body.style.width ? '' : '1000px';
          void body.offsetHeight;
          return performance.now() - start;
        };
        const median = (all) => all.sort((a, b) => a - b)[all.length >> 1];
        const times = { kept: [], without: [] };
        for (let i = 0; i < 9; i++) {
          times.kept.push(layout(), layout());
          held.style.display = 'none';
          void body.offsetHeight;
          times.without.push(layout(), layout());
          held.style.display = '';
          void body.offsetHeight;
        }
        return { kept: median(times.kept), without: median(times.without), below: held.getBoundingClientRect().top > innerHeight };
      }, BOX);
      assert.ok(below, 'the table is away from the view');
      assert.ok(kept < without * 1.5 + 5, `a layout of the page takes ${kept.toFixed(1)} ms with the table away from the view and ${without.toFixed(1)} ms without it: its rows are laid out`);
      await context.close();
    });
  });
}
