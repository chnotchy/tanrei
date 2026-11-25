// A component's tokens table as the built site draws it (components/ComponentSpecs.astro), on the page of the component
// with the most tokens, the button's, in each engine (`DOCS_ENGINES`), at a phone's width and a desktop's:
//
// - it is not laid out until it comes near the view (`content-visibility: auto`), and the room it holds until then is
//   one line of the Table's small cell for each of its rows and its header row: drawn, a row of one line is that
//   tall, and only a value of several parts (a shadow) is broken onto more lines;
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
        const drawn = await page.evaluate((selector) => {
          const table = document.querySelector(selector);
          const rows = [...table.querySelectorAll(':scope > table > tbody > tr')].map((row) => ({ height: row.getBoundingClientRect().height, value: row.cells[2]?.textContent.trim() ?? '' }));
          return { rows, scrolls: table.scrollWidth - table.clientWidth > 1, tabindex: table.getAttribute('tabindex'), role: table.getAttribute('role') };
        }, TABLE);
        const line = held / (drawn.rows.length + 1);
        const oneLine = drawn.rows.filter((row) => Math.abs(row.height - line) < 0.5);
        const taller = drawn.rows.filter((row) => row.height > line + 0.5);
        const shorter = drawn.rows.filter((row) => row.height < line - 0.5);
        assert.deepEqual(shorter, [], `no row is shorter than the line each row holds (${line.toFixed(2)} px)`);
        assert.ok(oneLine.length > drawn.rows.length * 0.9, `a row of one line is as tall as it holds: ${oneLine.length} of ${drawn.rows.length} rows are ${line.toFixed(2)} px`);
        for (const row of taller) assert.match(row.value, /,/, `only a value of several parts is broken onto more lines: «${row.value}» is ${row.height} px`);
        if (drawn.scrolls) {
          assert.equal(drawn.tabindex, '0', 'where it scrolls it is a focus stop once it is drawn');
          assert.equal(drawn.role, 'region', 'where it scrolls it is a region once it is drawn');
        }
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
