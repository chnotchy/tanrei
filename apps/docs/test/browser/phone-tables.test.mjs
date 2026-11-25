// The tables of a component page as a phone draws them, 390 wide, in each engine (components/ComponentSpecs.astro,
// components/visuals/MeasureDiagram.astro, and the inline code of @tanrei/web/code.css inside Tanrei's Table):
//
// - no name in a table is broken inside: a code run breaks at its spaces and hyphens or not at all, since the Table
//   widens a column for a word rather than breaking it (TBL-3) — before, a column of names was one character wide and
//   `width` stood as `wi` / `dt` / `h`;
// - a column of sentences (a part's, a property's, a slot's or an event's description, a requirement) keeps a
//   readable measure beside columns of names that do not wrap, and is never wider than the box beside a narrow first
//   column, so that a two-column table — the anatomy's — stands inside its box and a reader does not scroll every line;
// - the note that says a length is not drawn stands on a line of its own under the length's name, not run into it.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium node --test test/browser/phone-tables.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

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

// The Select's parts have the longest names (`option-supporting-text`); the Tabs' measure table has notes; the
// Arabic page draws the same tables right to left.
const PAGES = ['/components/select/', '/components/tabs/', '/ar/components/select/'];

/** What the page's tables draw: every code run's lines against its pieces, and the widths of the columns of sentences. */
function tables() {
  const lines = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
  };
  const broken = [];
  for (const code of document.querySelectorAll('tanrei-table td code, tanrei-table th code')) {
    if (code.closest('[hidden], .tokens')) continue;
    // Where a line may break by the text's own rules: at a space, after a hyphen, and (Firefox) after a slash.
    const pieces = code.textContent.trim().split(/\s+|(?<=[-/])/).filter(Boolean).length;
    if (lines(code) > pieces) broken.push(`${code.closest('tanrei-table').getAttribute('label')}: "${code.textContent.trim()}" on ${lines(code)} lines`);
  }
  const measure = [];
  for (const table of document.querySelectorAll('table.described, table.behavior')) {
    const box = table.closest('tanrei-table').getBoundingClientRect().width;
    const least = Math.min((table.classList.contains('behavior') ? 18 : 16) * Number.parseFloat(getComputedStyle(document.documentElement).fontSize), (table.classList.contains('behavior') ? 0.7 : 0.55) * box);
    const narrowest = Math.min(...[...table.querySelectorAll('tbody td:last-child')].map((td) => td.getBoundingClientRect().width));
    measure.push({ label: table.closest('tanrei-table').getAttribute('label'), box, table: table.getBoundingClientRect().width, least, narrowest, twoColumns: table.querySelector('tr').children.length === 2, anatomy: Boolean(table.closest('[id^="docs-anatomy-"]')) });
  }
  return { broken, measure };
}

for (const engine of ENGINES) {
  describe(`a component page's tables at 390 wide in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const url of PAGES) {
      test(`${url}: no name broken inside, a readable measure for sentences, the anatomy inside its box`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        await page.goto(`${origin}${url}`);
        await settlePage(page);
        const { broken, measure } = await page.evaluate(tables);
        assert.deepEqual(broken, [], 'every name in a table stays whole');
        assert.ok(measure.length >= 3, `the Specs' tables are found: ${measure.length}`);
        for (const table of measure) {
          assert.ok(table.narrowest >= table.least - 1, `${table.label}: its sentences ${table.narrowest}px wide, at least ${table.least}px`);
          if (table.anatomy) assert.ok(table.table <= table.box + 1, `${table.label}: the anatomy's table ${table.table}px stands in its box ${table.box}px`);
        }
        await context.close();
      });
    }

    test('/components/tabs/: a length not drawn is said on a line of its own, under its name', LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${origin}/components/tabs/`);
      // The figure is drawn when it comes near the view, and its table's notes with it.
      const figure = page.locator('[data-blueprint-figure="measure"]');
      await figure.scrollIntoViewIfNeeded();
      await page.locator('[data-blueprint-figure="measure"] [data-example-overlay][data-drawn]:not([data-drawing])').waitFor({ state: 'attached', timeout: 30_000 });
      const notes = await page.locator('[data-measure-note]:not([hidden])').evaluateAll((all) =>
        all.map((note) => {
          const name = note.parentElement.querySelector('code').getBoundingClientRect();
          const box = note.getBoundingClientRect();
          return { text: note.textContent.trim(), below: box.top >= name.bottom - 1, display: getComputedStyle(note).display };
        }),
      );
      assert.ok(notes.length > 0, 'the Tabs draw a length other than its token, and the table says so');
      for (const note of notes) assert.deepEqual([note.below, note.display], [true, 'block'], `"${note.text}" stands under its length's name`);
      await context.close();
    });
  });
}
