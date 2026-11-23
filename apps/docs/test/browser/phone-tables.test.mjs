// The tables of a component page as a phone draws them, 390 wide, in each engine (components/ComponentSpecs.astro,
// components/visuals/MeasureDiagram.astro, and the inline code of @tanrei/web/code.css inside Tanrei's Table):
//
// - no name in a table is broken inside: a code run breaks at its spaces and hyphens or not at all, since the Table
//   widens a column for a word rather than breaking it (TBL-3) — before, a column of names was one character wide and
//   `width` stood as `wi` / `dt` / `h`;
// - a column of sentences (a part's, a property's, a slot's or an event's description, a requirement) keeps a
//   readable measure beside columns of names that do not wrap, and is never wider than the box beside a narrow first
//   column, so that a two-column table — the anatomy's — stands inside its box and a reader does not scroll every line;
// - the note that says a length is not drawn stands on a line of its own under the length's name, not run into it;
// - where the Table's box is narrow, each row of a table of sentences is one block: its name on a line, a property's
//   type and default after their columns' names on the next, and its description under them at the box's whole width,
//   the table still a table to assistive technology — before, a property's row was as tall as its description at its
//   least measure, its name, type and default in an empty band and the description scrolled off the box; at 1440 the
//   same tables keep their columns.
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

/** Each table of sentences as it is drawn: its box, its width, and each row's cells. */
function stacked() {
  const rect = (node) => {
    const box = node.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, width: box.width };
  };
  return [...document.querySelectorAll('table.described, table.behavior')].map((table) => {
    const box = table.closest('tanrei-table');
    const labels = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    const header = getComputedStyle(table.querySelector('thead'));
    return {
      label: box.getAttribute('label'),
      // A table of properties: four columns, the name, its type, its default and its description.
      props: table.querySelectorAll('thead th').length === 4,
      box: box.getBoundingClientRect().width,
      width: table.getBoundingClientRect().width,
      header: header.display === 'none' ? 'none' : getComputedStyle(table.querySelector('thead th')).visibility,
      rows: [...table.querySelectorAll(':scope > tbody > tr')].map((tr) => {
        const cells = [...tr.children];
        return {
          name: cells[0].textContent.trim(),
          first: rect(cells[0]),
          description: rect(cells.at(-1)),
          // The column's name drawn before the value: generated text, its text for assistive technology after a slash.
          between: cells.slice(1, -1).map((cell, i) => ({ ...rect(cell), label: labels[i + 1], before: getComputedStyle(cell, '::before').content.replace(/^"(.*?)"[\s\S]*$/, '$1') })),
        };
      }),
    };
  });
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

    for (const url of PAGES) {
      test(`${url}: each row of a table of sentences is one block, its description at the box's width`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        await page.goto(`${origin}${url}`);
        await settlePage(page);
        const tables = await page.evaluate(stacked);
        assert.ok(tables.some((table) => table.props), 'the Specs have a table of properties');
        for (const table of tables) {
          assert.ok(table.width <= table.box + 1, `${table.label}: the table ${table.width}px stands in its box ${table.box}px, nothing to scroll`);
          assert.equal(table.header, 'visible', `${table.label}: its header row is still there for assistive technology`);
          for (const row of table.rows) {
            assert.ok(row.description.width >= table.box - 1, `${table.label} ${row.name}: its description ${row.description.width}px wide, as its box ${table.box}px`);
            assert.ok(row.description.top >= row.first.bottom - 1, `${table.label} ${row.name}: its description stands under its name`);
            for (const cell of row.between) {
              assert.ok(cell.top >= row.first.bottom - 1 && cell.bottom <= row.description.top + 1, `${table.label} ${row.name}: its ${cell.label} stands between its name and its description`);
              assert.equal(cell.before, cell.label, `${table.label} ${row.name}: its ${cell.label} is drawn after its column's name`);
            }
          }
        }
        if (engine === 'chromium') {
          // The engine's own tree, not the markup: a table whose display changed is still a table, named by its heading,
          // with its column headers and its cells.
          const session = await context.newCDPSession(page);
          const { nodes } = await session.send('Accessibility.getFullAXTree');
          const label = tables.find((table) => table.props).label;
          const table = nodes.find((node) => !node.ignored && node.role?.value === 'table' && node.name?.value === label);
          assert.ok(table, `the properties are a table named "${label}"`);
          const byId = new Map(nodes.map((node) => [node.nodeId, node]));
          const roles = new Set();
          const walk = (node) => {
            if (!node.ignored) roles.add(node.role?.value);
            for (const id of node.childIds ?? []) if (byId.has(id)) walk(byId.get(id));
          };
          walk(table);
          for (const role of ['row', 'columnheader', 'cell']) assert.ok(roles.has(role), `the table has a ${role}: ${[...roles].join(', ')}`);
          await session.detach();
        }
        await context.close();
      });
    }

    test('the same tables keep their columns at 1440 wide', LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${origin}/components/select/`);
      await settlePage(page);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('table.described')].filter((table) => table.querySelectorAll('thead th').length === 4).flatMap((table) => [...table.querySelectorAll(':scope > tbody > tr')]).map((tr) => new Set([...tr.children].map((cell) => Math.round(cell.getBoundingClientRect().top))).size),
      );
      assert.ok(rows.length > 0, 'the Select has properties');
      assert.deepEqual([...new Set(rows)], [1], 'each property is one row of four cells side by side');
      await context.close();
    });

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
