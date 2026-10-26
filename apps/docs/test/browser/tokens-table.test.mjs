// A component's tokens table as the built site draws it (components/ComponentSpecs.astro), on the page of the component
// with the most tokens, the button's, in each engine (`DOCS_ENGINES`), at a phone's width and a desktop's:
//
// - it is not laid out until it comes near the view (`content-visibility: auto`), and the room it holds until then is
//   one line of the Table's compact cell for each of its rows and its header row: drawn, a row of one line is that
//   tall, and only a value of several parts (a shadow) is broken onto more lines;
// - its words are found by the browser's find in page while it is away from the view;
// - once it is near, the Table has read its sizes: where it scrolls it is a focus stop and a region.
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
import { engines, launch } from './launch.mjs';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

const ENGINES = engines('chromium,firefox,webkit');
const PAGE = '/components/button/';
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
/** The tokens table: the compact Table of the Specs tab that holds the room of its rows. */
const TABLE = 'tanrei-table[density="compact"][style*="--docs-token-rows"]';

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
      test(`at ${viewport.width} wide it holds the room of its rows until it is near, its words are found while it is away, and the Table reads its sizes once it is drawn`, async () => {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
        const page = await context.newPage();
        await page.goto(`${origin}${PAGE}`);
        await page.waitForLoadState('load');

        const away = await page.evaluate((selector) => {
          const table = document.querySelector(selector);
          const style = getComputedStyle(table);
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
        }, TABLE);
        assert.equal(away.visibility, 'auto', 'it is not laid out until it comes near the view');
        assert.ok(away.below, 'it stands below the first view of the page');
        assert.ok(away.rows > 100, `it is the page's long table (${away.rows} rows)`);
        assert.ok(away.found, `find in page finds «${away.last}», in its last row, while it is away from the view`);
        const held = Number(/([\d.]+)px$/.exec(away.held)?.[1]);
        assert.ok(held > 0, `it holds a room before it is drawn (${away.held})`);

        // Drawn: near the view, its elements defined, two frames since.
        const drawn = await page.evaluate(async (selector) => {
          const table = document.querySelector(selector);
          table.scrollIntoView({ block: 'start' });
          await customElements.whenDefined('tanrei-table');
          await customElements.whenDefined('tanrei-swatch');
          await document.fonts.ready;
          for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
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
  });
}
