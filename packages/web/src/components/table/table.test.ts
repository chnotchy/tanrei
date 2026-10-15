// <tanrei-table> and table.css, driven by specs/table.spec.json: every behaviour id (TBL-1…59) is cited by a test title,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here (the two row heights of TBL-4's verify are the spec's own numbers for the default system).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { atRest } from '../../../test/at-rest.js';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { decodePng } from '../../../test/png.js';
import { expectPressHeldAtEveryMoment } from '../../../test/held-press.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';
import { type Fixture, type FixtureItem, acmeSystemCss, fixturesDocument, iconFaceArrives, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, tableNameSuffix, withoutIconFont, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('table');
type P = Page;
const TAG = 'tanrei-table';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-table-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const table = (page: P, id: string) => host(page, id).locator('> table');
/** A cell by row and column, counted from 1 among the rows of a section. */
const cell = (page: P, id: string, section: 'thead' | 'tbody' | 'tfoot', row: number, column: number) =>
  table(page, id).locator(`> ${section} > tr:nth-child(${row}) > :nth-child(${column})`);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
/** Where the text of an element is drawn: the box of its contents, not of the element. */
const textBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** How many lines the text of an element runs over. */
const lines = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops: number[] = [];
    for (const r of range.getClientRects()) if (r.width > 0 && !tops.some((top) => Math.abs(top - r.top) < r.height / 2)) tops.push(r.top);
    return tops.length;
  });
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
const scroll = (locator: Locator) =>
  locator.evaluate((el) => ({ left: el.scrollLeft, top: el.scrollTop, width: el.scrollWidth, height: el.scrollHeight, clientWidth: el.clientWidth, clientHeight: el.clientHeight }));
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
/** One frame drawn: what an observer of sizes or of the document wrote has been styled. */
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

// Fixtures of a test's own, in the spec's shape.
const col = (header: string, props: Fixture['props'] = {}): FixtureItem => ({ kind: 'column', props: { header, ...props } });
const row = (cells: string[], props: Fixture['props'] = {}): FixtureItem => ({ kind: 'row', props, items: cells.map((content) => ({ kind: 'cell', props: {}, content })) });
const fx = (id: string, props: Fixture['props'], items: FixtureItem[], extra: Partial<Fixture> = {}): Fixture => ({ id, props, items, ...extra });
/** A fixture whose table is written by the test (rendered Markdown, markup the harness does not write). */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
/** A fixture's name on a page of fixtures: the spec's, and its id where another fixture has the same name (the harness's `tableNameSuffix`). */
const named = (f: Fixture) => `${String(f.props.caption ?? f.props.label)}${tableNameSuffix(spec, f)}`;
const some = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
/** The stage's width, and the height its table's box may take (a fixture cannot state either: TBL-17, TBL-19). */
const size = (page: P, id: string, { width, height }: { width?: number; height?: number }) =>
  stage(page, id).evaluate(
    (el, [w, h]) => {
      if (w !== null) (el as HTMLElement).style.inlineSize = `${w + 32}px`;
      if (h !== null) (el.querySelector('tanrei-table') as HTMLElement).style.maxBlockSize = `${h}px`;
    },
    [width ?? null, height ?? null] as const,
  );
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const NUMBERS = ['Region', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];

test.describe('the parts and their sizes', () => {
  test('TBL-1: the caption, one header row, the body rows in order and the footer rows after them, each row a cell per column; as wide as its layout, with no fill, edge, corner, elevation or outer space of its own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('basic', 'totals') });
    for (const id of ['basic', 'totals']) {
      const f = fixture(id);
      const columns = f.items!.filter((item) => item.kind === 'column');
      const rows = f.items!.filter((item) => item.kind === 'row');
      const order = await table(page, id).evaluate((el) => [...el.children].map((child) => child.localName));
      expect(order, id).toEqual(['caption', 'thead', 'tbody', ...(rows.some((r) => r.props.footer) ? ['tfoot'] : [])]);
      // Drawn from top to bottom in that order.
      const tops = await table(page, id).evaluate((el) => [...el.children].map((child) => child.getBoundingClientRect().top));
      expect([...tops].sort((a, b) => a - b), id).toEqual(tops);
      expect(await table(page, id).locator('> thead > tr').count()).toBe(1);
      expect(await table(page, id).locator('> thead > tr > th').allTextContents()).toEqual(columns.map((c) => String(c.props.header)));
      expect(await table(page, id).locator('> tbody > tr > :first-child').allTextContents()).toEqual(rows.filter((r) => !r.props.footer).map((r) => r.items![0].content));
      expect(await table(page, id).evaluate((el) => [...el.rows].map((tr) => tr.cells.length))).toEqual(Array(rows.length + 1).fill(columns.length));
      // The native table is a table still, and the box is its layout's width.
      expect(await css(table(page, id), 'display')).toBe('table');
      const [outer, inner, wrapper] = [await box(stage(page, id)), await box(table(page, id)), await box(host(page, id))];
      near(wrapper.width, outer.width - 32);
      near(inner.width, wrapper.width);
      for (const part of [host(page, id), table(page, id)]) {
        const drawn = await part.evaluate((el) => {
          const s = getComputedStyle(el);
          const sides = ['top', 'right', 'bottom', 'left'];
          return {
            fill: s.backgroundColor,
            image: s.backgroundImage,
            elevation: s.boxShadow,
            edges: sides.map((side) => s.getPropertyValue(`border-${side}-width`)),
            space: sides.flatMap((side) => [s.getPropertyValue(`margin-${side}`), s.getPropertyValue(`padding-${side}`)]),
            corners: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => s.getPropertyValue(`border-${corner}-radius`)),
          };
        });
        expect(drawn, id).toEqual({ fill: 'rgba(0, 0, 0, 0)', image: 'none', elevation: 'none', edges: Array(4).fill('0px'), space: Array(8).fill('0px'), corners: Array(4).fill('0px') });
      }
    }
  });

  test('TBL-2: a column is never narrower than what cannot break in it, the columns share the box in proportion to their content, and a width the product gives a column replaces the content’s', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('long-cells', 'basic'), fx('given', { label: 'Given' }, [col('Name'), col('Note'), row(['A', 'B'])])] });
    // The verify: the three columns that do not wrap are as wide as their widest cell, and Description takes the rest and wraps.
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    for (const column of [1, 2, 3]) {
      const cells = await table(page, 'long-cells').locator(`tr > :nth-child(${column})`).all();
      const widest = Math.max(...(await Promise.all(cells.map(async (c) => (await textBox(c)).width))));
      near((await box(cells[0])).width, widest + 2 * pad, 1);
      for (const c of cells) expect(await lines(c)).toBe(1);
    }
    const description = cell(page, 'long-cells', 'tbody', 1, 4);
    expect(await lines(description)).toBeGreaterThan(1);
    near((await box(table(page, 'long-cells'))).width, (await box(host(page, 'long-cells'))).width);
    // No unit of its own: no cell and no column carries a width.
    expect(await table(page, 'long-cells').evaluate((el) => [...el.querySelectorAll('th, td, col')].every((c) => (c as HTMLElement).style.width === '' && !c.hasAttribute('width')))).toBe(true);
    expect(await css(table(page, 'long-cells'), 'table-layout')).toBe('auto');
    // Columns of short text share what is left in proportion to their content: the longer column is the wider.
    const [sizeColumn, heightColumn, useColumn] = await Promise.all([1, 2, 3].map(async (n) => (await box(cell(page, 'basic', 'thead', 1, n))).width));
    expect(useColumn).toBeGreaterThan(sizeColumn);
    expect(sizeColumn).toBeGreaterThan(0);
    expect(heightColumn).toBeGreaterThan(0);
    near(sizeColumn + heightColumn + useColumn, (await box(host(page, 'basic'))).width, 1);
    // A width the product gives.
    await cell(page, 'given', 'thead', 1, 1).evaluate((el) => ((el as HTMLElement).style.width = '500px'));
    near((await box(cell(page, 'given', 'tbody', 1, 1))).width, 500 + 2 * pad, 1);
  });

  test('TBL-3: text wraps inside its column and is never cut or ended with an ellipsis; a run with no break opportunity is not broken and widens its column; a column whose wrap is false stays on one line, its header too', async ({ page }) => {
    const identifier = 'comp.table.cell.text.typescale.compact.fontWeightEmphasized';
    await mountFixtures(page, spec, {
      fixtures: [...some('requirements'), fx('run', { label: 'Run' }, [col('Token of the table'), col('What it is for', { wrap: false }), row([identifier, 'The weight of a row header'])])],
    });
    const requirement = cell(page, 'requirements', 'tbody', 1, 2);
    expect(await lines(requirement)).toBeGreaterThan(1);
    for (const c of await table(page, 'requirements').locator('th, td').all()) {
      expect(await css(c, 'text-overflow')).toBe('clip');
      expect(await css(c, 'overflow')).toBe('visible');
      expect(await c.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    // A stage narrower than the identifier: the run is whole on one line, its column is as wide as it, the box scrolls.
    await size(page, 'run', { width: 288 });
    const run = cell(page, 'run', 'tbody', 1, 1);
    expect(await lines(run)).toBe(1);
    expect((await box(run)).width).toBeGreaterThanOrEqual((await textBox(run)).width);
    expect((await scroll(host(page, 'run'))).width).toBeGreaterThan((await scroll(host(page, 'run'))).clientWidth);
    // The column whose wrap is false keeps every cell on one line, its header cell included.
    for (const c of [cell(page, 'run', 'thead', 1, 2), cell(page, 'run', 'tbody', 1, 2)]) expect(await lines(c)).toBe(1);
  });

  test('TBL-4: a cell’s paddings and text style by density, its color, figures of equal width, a row as tall as its tallest cell (46 and 32 for one line in the default system), cells aligned to the top', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('basic', 'compact', 'long-cells', 'totals') });
    for (const [id, density, height] of [['basic', 'regular', 46], ['compact', 'compact', 32]] as const) {
      const padBlock = await resolveToken(page, T(`cell-padding-block-${density}`));
      const padInline = await resolveToken(page, T(`cell-padding-inline-${density}`));
      const line = await resolveToken(page, T('divider-thickness'));
      for (const column of [1, 3]) {
        const c = cell(page, id, 'tbody', 1, column);
        expect(await px(c, 'padding-top')).toBe(padBlock);
        // The line under the row takes its width from the padding above it (TBL-8).
        expect((await px(c, 'padding-bottom')) + (await px(c, 'border-bottom-width'))).toBe(padBlock);
        expect(await px(c, 'padding-left')).toBe(padInline);
        expect(await px(c, 'padding-right')).toBe(padInline);
        expect(await px(c, 'font-size')).toBe(await resolveToken(page, T(`cell-text-typescale-${density}-font-size`)));
        expect(await css(c, 'font-weight')).toBe(String(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T(`cell-text-typescale-${density}-font-weight`))) || '400');
        expect(await css(c, 'color')).toBe(await resolveColor(page, T('cell-text-color')));
        expect(await css(c, 'font-variant-numeric')).toContain('tabular-nums');
        expect(await css(c, 'vertical-align')).toBe('top');
      }
      expect(line).toBeGreaterThan(0);
      near((await box(table(page, id).locator('> tbody > tr').first())).height, height, 0.1);
      // No height of its own.
      expect(await table(page, id).evaluate((el) => [...el.querySelectorAll('tr, th, td')].every((c) => (c as HTMLElement).style.height === ''))).toBe(true);
    }
    // As tall as its tallest cell and no taller; the first lines of a row share a baseline (one top, one style).
    const tall = table(page, 'long-cells').locator('> tbody > tr').first();
    const description = cell(page, 'long-cells', 'tbody', 1, 4);
    const pad = await resolveToken(page, T('cell-padding-block-regular'));
    near((await box(tall)).height, (await lines(description)) * (await px(description, 'line-height')) + 2 * pad, 0.5);
    const tops = await Promise.all([1, 2, 3, 4].map(async (n) => (await textBox(cell(page, 'long-cells', 'tbody', 1, n))).top));
    for (const top of tops) near(top, tops[0], 0.1);
    // The numbers of a column line up: digits of one width.
    const digits = await Promise.all(['31', '30'].map((text) => table(page, 'totals').locator('td', { hasText: new RegExp(`^${text}$`) }).first()).map(async (c) => (await textBox(c)).width));
    near(digits[0], digits[1], 0.1);
  });

  test('TBL-5: a header cell is a label in the header’s color with a cell’s paddings, over the header’s fill, on the last line of its row; a table whose every header is empty draws no header row and no line for it', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...some('basic', 'compact', 'no-header'),
        fx('two-lines', { label: 'Two lines' }, [col('A header of two lines that wraps'), col('Short'), row(['x', 'y'])]),
        raw('empty-head', { label: 'Empty head' }, '<table><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Role</td><td>button</td></tr></tbody></table>'),
      ],
    });
    for (const [id, density] of [['basic', 'regular'], ['compact', 'compact']] as const) {
      const h = cell(page, id, 'thead', 1, 1);
      expect(await px(h, 'font-size')).toBe(await resolveToken(page, T(`header-text-typescale-${density}-font-size`)));
      expect(await css(h, 'font-weight')).toBe('500');
      expect(await css(h, 'color')).toBe(await resolveColor(page, T('header-text-color')));
      expect(await px(h, 'padding-top')).toBe(await resolveToken(page, T(`cell-padding-block-${density}`)));
      expect(await px(h, 'padding-left')).toBe(await resolveToken(page, T(`cell-padding-inline-${density}`)));
      expect(await css(h, 'vertical-align')).toBe('bottom');
    }
    // The header's fill is the token's (none in the default system).
    await override(page, { [T('header-container-color')]: 'rgb(1, 2, 3)' });
    expect(await css(cell(page, 'basic', 'thead', 1, 2), 'background-image')).toContain('rgb(1, 2, 3)');
    expect(await css(cell(page, 'basic', 'tbody', 1, 2), 'background-image')).toBe('none');
    // Bottom alignment: the short header's text ends where the wrapped one's last line ends.
    await size(page, 'two-lines', { width: 200 });
    const [long, short] = [await textBox(cell(page, 'two-lines', 'thead', 1, 1)), await textBox(cell(page, 'two-lines', 'thead', 1, 2))];
    expect(long.height).toBeGreaterThan(short.height * 1.5);
    near(long.bottom, short.bottom, 0.5);
    // The verify: no header row, each row's first cell its header; the first row has no line above it.
    expect(await table(page, 'no-header').locator('> thead').count()).toBe(0);
    near((await box(table(page, 'no-header').locator('> tbody > tr').first())).y, (await box(host(page, 'no-header'))).y, 0.1);
    expect(await px(cell(page, 'no-header', 'tbody', 1, 1), 'border-top-width')).toBe(0);
    expect(await cell(page, 'no-header', 'tbody', 1, 1).evaluate((el) => el.localName)).toBe('th');
    // A header row written with every cell empty (rendered Markdown) is not drawn either.
    expect(await css(table(page, 'empty-head').locator('> thead'), 'display')).toBe('none');
    near((await box(table(page, 'empty-head').locator('> tbody > tr').first())).y, (await box(host(page, 'empty-head'))).y, 0.1);
  });

  test('TBL-6: while rowHeaders is true the first cell of every body and footer row is drawn at the emphasized weight in the cell’s color, with no fill, and is a row header; while it is false the first column is cells — except a first cell the product’s own markup already marks as the header of its row, which is one whatever rowHeaders says', async ({ page }) => {
    const markdown = '<table><thead><tr><th>Plan</th><th>Seats</th></tr></thead><tbody><tr><td>Free</td><td>3</td></tr><tr><td>Team</td><td>50</td></tr></tbody><tfoot><tr><td>All</td><td>53</td></tr></tfoot></table>';
    const marked = '<table><thead><tr><th scope="col">Plan</th><th scope="col">Seats</th></tr></thead><tbody><tr><th scope="row">Free</th><td>3</td></tr></tbody></table>';
    await mountFixtures(page, spec, { fixtures: [...some('totals', 'basic'), raw('markdown', { label: 'Plans', rowHeaders: true }, markdown), raw('marked', { label: 'Marked by the product' }, marked)] });
    const emphasized = await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('cell-text-typescale-regular-font-weight-emphasized'));
    const weight = await css(cell(page, 'totals', 'tbody', 1, 2), 'font-weight');
    for (const header of [cell(page, 'totals', 'tbody', 1, 1), cell(page, 'totals', 'tfoot', 1, 1)]) {
      expect(await header.evaluate((el) => `${el.localName} ${el.getAttribute('scope')}`)).toBe('th row');
      expect(Number(await css(header, 'font-weight'))).toBeGreaterThan(Number(weight));
      expect(await css(header, 'font-weight')).toBe(await page.evaluate((v) => { const probe = document.createElement('i'); probe.style.fontWeight = v; document.body.append(probe); const w = getComputedStyle(probe).fontWeight; probe.remove(); return w; }, emphasized));
      expect(await css(header, 'color')).toBe(await resolveColor(page, T('cell-text-color')));
      expect(await css(header, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await px(header, 'padding-left')).toBe(await resolveToken(page, T('cell-padding-inline-regular')));
      expect(await px(header, 'font-size')).toBe(await px(cell(page, 'totals', 'tbody', 1, 2), 'font-size'));
    }
    await expect(stage(page, 'totals').getByRole('rowheader')).toHaveCount(5);
    // False: cells, drawn as cells.
    expect(await cell(page, 'basic', 'tbody', 1, 1).evaluate((el) => el.localName)).toBe('td');
    expect(await css(cell(page, 'basic', 'tbody', 1, 1), 'font-weight')).toBe(await css(cell(page, 'basic', 'tbody', 1, 2), 'font-weight'));
    await expect(stage(page, 'basic').getByRole('rowheader')).toHaveCount(0);
    // A table of plain cells (rendered Markdown) with row-headers: drawn and exposed as row headers, and as cells again without it.
    const first = cell(page, 'markdown', 'tbody', 1, 1);
    await expect(first).toHaveAttribute('role', 'rowheader');
    expect(await css(first, 'font-weight')).toBe(await css(cell(page, 'totals', 'tbody', 1, 1), 'font-weight'));
    await expect(stage(page, 'markdown').getByRole('rowheader')).toHaveCount(3);
    await host(page, 'markdown').evaluate((el) => ((el as unknown as { rowHeaders: boolean }).rowHeaders = false));
    await expect(stage(page, 'markdown').getByRole('rowheader')).toHaveCount(0);
    expect(await css(first, 'font-weight')).toBe(await css(cell(page, 'markdown', 'tbody', 1, 2), 'font-weight'));
    // rowHeaders adds row headers and takes none away: the product's own `th scope="row"` is one without it.
    expect(await host(page, 'marked').evaluate((el) => el.hasAttribute('row-headers'))).toBe(false);
    await expect(stage(page, 'marked').getByRole('rowheader', { name: 'Free' })).toHaveCount(1);
    expect(await css(cell(page, 'marked', 'tbody', 1, 1), 'font-weight')).toBe(await css(cell(page, 'totals', 'tbody', 1, 1), 'font-weight'));
  });

  test('TBL-7: the content of every cell of a column — header and footer cells included — sits at the start, the middle or the end as the column names, every line of a wrapped cell alike; another value is start', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...some('totals', 'centered'),
        fx('wrapped', { label: 'Wrapped' }, [col('A', { align: 'end' }), col('B', { align: 'center' }), col('C', { align: 'sideways' }), row(['one two three four five six seven', 'one two three four five six seven', 'c'])]),
        // The column's alignment on its header cell alone: the element takes it to the cells. Markdown's own attribute too.
        raw('header-only', { label: 'Header only' }, '<table><thead><tr><th>Item</th><th data-align="end">Price</th><th align="center">Stock</th><th align="right">Sum</th></tr></thead><tbody><tr><td>Tea</td><td>4.25</td><td>Yes</td><td>8.50</td></tr><tr><td>Sugar</td><td data-align="start">3.00</td><td>No</td><td>3.00</td></tr></tbody></table>'),
      ],
    });
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    const placed = async (c: Locator) => {
      const [b, t] = [await edges(c), await textBox(c)];
      return { start: t.left - b.left, end: b.right - t.right };
    };
    // start, and end in header, body and footer.
    near((await placed(cell(page, 'totals', 'tbody', 1, 1))).start, pad);
    for (const c of [cell(page, 'totals', 'thead', 1, 2), cell(page, 'totals', 'tbody', 2, 2), cell(page, 'totals', 'tfoot', 1, 2)]) near((await placed(c)).end, pad);
    // center.
    for (const c of [cell(page, 'centered', 'thead', 1, 3), cell(page, 'centered', 'tbody', 1, 3)]) {
      const p = await placed(c);
      near(p.start, p.end, 1);
      expect(p.start).toBeGreaterThan(pad);
    }
    // Every line of a wrapped cell: the text's box ends at the padding, and the first line is shorter than the box.
    await size(page, 'wrapped', { width: 300 });
    expect(await css(cell(page, 'wrapped', 'tbody', 1, 1), 'text-align')).toBe('right');
    expect(await css(cell(page, 'wrapped', 'tbody', 1, 2), 'text-align')).toBe('center');
    for (const c of [cell(page, 'wrapped', 'tbody', 1, 3), cell(page, 'wrapped', 'thead', 1, 3)]) expect(await css(c, 'text-align')).toBe('left');
    expect(await css(cell(page, 'wrapped', 'tbody', 1, 1), 'text-align-last')).toBe('auto');
    // From the header cell alone.
    for (const r of [1, 2]) {
      expect(await css(cell(page, 'header-only', 'tbody', r, 3), 'text-align')).toBe('center');
      expect(await css(cell(page, 'header-only', 'tbody', r, 4), 'text-align')).toBe('right');
    }
    expect(await css(cell(page, 'header-only', 'tbody', 1, 2), 'text-align')).toBe('right');
    // A cell that names its own keeps it.
    expect(await css(cell(page, 'header-only', 'tbody', 2, 2), 'text-align')).toBe('left');
    // No cell was written to: the alignment travels by the wrapper.
    expect(await cell(page, 'header-only', 'tbody', 1, 2).evaluate((el) => el.getAttributeNames())).toEqual([]);
    // …and follows the header when it changes (TBL-25).
    await cell(page, 'header-only', 'thead', 1, 2).evaluate((el) => el.setAttribute('data-align', 'center'));
    await expect.poll(() => css(cell(page, 'header-only', 'tbody', 1, 2), 'text-align')).toBe('center');
  });
});

test.describe('telling rows apart', () => {
  test('TBL-8: while separation is divider one line of divider.thickness in divider.color under the header row, between two rows and above the first footer row, adding nothing to a row’s height; none above the first row, below the last, or between columns', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('separation-divider', 'separation-gap', 'totals') });
    const [thickness, color] = [await resolveToken(page, T('divider-thickness')), await resolveColor(page, T('divider-color'))];
    for (const id of ['separation-divider', 'totals']) {
      const lined = [cell(page, id, 'thead', 1, 1), cell(page, id, 'tbody', 1, 2), cell(page, id, 'tbody', 2, 1)];
      // The last body row of a table with a footer has the line above the first footer row.
      if (id === 'totals') lined.push(table(page, id).locator('> tbody > tr:last-child > :first-child'));
      for (const c of lined) {
        expect(await px(c, 'border-bottom-width')).toBe(thickness);
        expect(await css(c, 'border-bottom-color')).toBe(color);
        expect(await css(c, 'border-bottom-style')).toBe('solid');
        expect(await px(c, 'border-top-width')).toBe(0);
        expect(await px(c, 'border-left-width')).toBe(0);
        expect(await px(c, 'border-right-width')).toBe(0);
      }
      const last = table(page, id).locator('tr').last().locator('> *').first();
      expect(await px(last, 'border-bottom-width')).toBe(0);
      // Across the whole width: the cells of a row touch, and the row is the table's width.
      near((await box(table(page, id).locator('> tbody > tr').first())).width, (await box(table(page, id))).width, 0.1);
      expect(await css(table(page, id), 'border-spacing')).toBe('0px');
    }
    // Nothing added to a row's height, and its content not moved: a row with a line and the last row, which has none.
    const [first, last] = [table(page, 'separation-divider').locator('> tbody > tr').first(), table(page, 'separation-divider').locator('> tbody > tr').last()];
    near((await box(first)).height, (await box(last)).height, 0.1);
    near((await textBox(first.locator('> *').first())).top - (await box(first)).y, (await textBox(last.locator('> *').first())).top - (await box(last)).y, 0.1);
  });

  test('TBL-9: separation auto is what comp.table.separation names, which follows the system’s choice; divider and gap are themselves whatever the tokens say; a change is drawn at once and keeps the scroll; an unknown value is auto and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: some('basic', 'separation-divider', 'separation-gap', 'wide') });
    const [thickness, gap, pad] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T('row-gap')), await resolveToken(page, T('cell-padding-block-regular'))];
    const form = async (id: string) => {
      const c = cell(page, id, 'tbody', 1, 1);
      const [line, under] = [await px(c, 'border-bottom-width'), await px(c, 'padding-bottom')];
      return line === thickness && under === pad - thickness ? 'divider' : line === 0 && under === pad + gap ? 'gap' : `neither (${line}, ${under})`;
    };
    expect(gap).toBeGreaterThan(0);
    expect([await form('basic'), await form('separation-divider'), await form('separation-gap')]).toEqual(['divider', 'divider', 'gap']);
    // A browser without style queries is told the choice by the element, which reads it when it reads the table: a
    // change of a token is then seen at its next reading (README). Where the queries work, `override` is all there is.
    const set = async (vars: Record<string, string>) => {
      await override(page, vars);
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('tanrei-table')) if (element.querySelector(':scope > table[data-separation]')) (element as unknown as { read(): void }).read();
      });
    };
    // The system's choice is followed by auto alone…
    await set({ '--tanrei-sys-behavior-separation': 'gap' });
    await expect.poll(() => form('basic')).toBe('gap');
    expect([await form('separation-divider'), await form('separation-gap')]).toEqual(['divider', 'gap']);
    // …and the table's own token sets it apart from the system.
    await set({ [T('separation')]: 'divider' });
    await expect.poll(() => form('basic')).toBe('divider');
    await set({ [T('separation')]: 'gap', '--tanrei-sys-behavior-separation': 'divider' });
    await expect.poll(() => form('basic')).toBe('gap');
    // A name the choice does not have is the first value, divider.
    await set({ [T('separation')]: 'stripes' });
    await expect.poll(() => form('basic')).toBe('divider');
    // The prop, changed while shown: at once, no animation, the scroll kept.
    await set({ [T('separation')]: 'divider' });
    await host(page, 'wide').evaluate((el) => (el.scrollLeft = 90));
    await host(page, 'wide').evaluate((el) => ((el as unknown as { separation: string }).separation = 'gap'));
    await expect.poll(() => form('wide')).toBe('gap');
    expect((await scroll(host(page, 'wide'))).left).toBe(90);
    expect(await css(cell(page, 'wide', 'tbody', 1, 1), 'transition-duration')).toBe('0s');
    // Unknown: auto, and a debug build says so.
    await host(page, 'wide').evaluate((el) => ((el as unknown as { separation: string }).separation = 'dotted'));
    await expect.poll(() => form('wide')).toBe('divider');
    await expect.poll(() => seen.filter((m) => m.includes('TBL-9') && m.includes('"dotted"')).length).toBe(1);
  });

  test('TBL-9: where the browser has no style queries the element names the tokens’ separation on the table, and the same rules draw it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('basic') });
    const [thickness, gap, pad] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T('row-gap')), await resolveToken(page, T('cell-padding-block-regular'))];
    const queries = await page.evaluate(() => CSS.supports('container-type: inline-size') && (() => { const s = new CSSStyleSheet(); s.replaceSync('@container style(--x: y) { a { color: red } }'); return s.cssRules.length === 1 && (s.cssRules[0] as CSSContainerRule).conditionText !== undefined; })());
    expect(typeof queries).toBe('boolean');
    await override(page, { [T('separation')]: 'gap' });
    await host(page, 'basic').evaluate((el) => ((el as unknown as { striped: boolean }).striped = true));
    const c = cell(page, 'basic', 'tbody', 1, 1);
    // Either way it is the gap form: by the query, or by the attribute the element wrote.
    await expect.poll(() => px(c, 'border-bottom-width')).toBe(0);
    expect(await px(c, 'padding-bottom')).toBe(pad + gap);
    const written = await table(page, 'basic').getAttribute('data-separation');
    expect([null, 'gap']).toContain(written);
    // The attribute alone draws the form (the rule the fallback relies on), on a table whose tokens say divider.
    await override(page, { [T('separation')]: 'divider' });
    await host(page, 'basic').evaluate((el) => ((el as unknown as { striped: boolean }).striped = false));
    await table(page, 'basic').evaluate((el) => el.setAttribute('data-separation', 'gap'));
    await expect.poll(() => px(c, 'border-bottom-width')).toBe(0);
    expect(thickness).toBeGreaterThan(0);
  });

  test('TBL-10: while separation is gap, row.gap of empty space under the header row, between rows and above the first footer row, no line, and none of it above the first row or below the last; the rows are rows still', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('separation-gap', 'separation-divider'), { ...fixture('totals'), id: 'totals-gap', props: { ...fixture('totals').props, separation: 'gap' } }] });
    const gap = await resolveToken(page, T('row-gap'));
    const heights = async (id: string) => Promise.all((await table(page, id).locator('tr').all()).map(async (tr) => (await box(tr)).height));
    const [spaced, lined] = [await heights('separation-gap'), await heights('separation-divider')];
    // Header, first and second body rows are row.gap taller; the last row is not.
    for (const index of [0, 1, 2]) near(spaced[index] - lined[index], gap, 0.1);
    near(spaced[3], lined[3], 0.1);
    for (const c of await table(page, 'separation-gap').locator('th, td').all()) for (const side of ['top', 'right', 'bottom', 'left']) expect(await px(c, `border-${side}-width`)).toBe(0);
    near((await box(table(page, 'separation-gap').locator('> thead > tr'))).y, (await box(table(page, 'separation-gap').locator('> caption'))).y + (await box(table(page, 'separation-gap').locator('> caption'))).height, 0.1);
    // Above the first footer row, and nothing under the last footer row.
    const total = await heights('totals-gap');
    near(total[total.length - 2] - total[total.length - 1], gap, 0.1);
    await expect(stage(page, 'separation-gap').getByRole('row')).toHaveCount(4);
  });

  test('TBL-11: while striped, every second body row that is shown is filled with stripe.container.color across its width, paddings included — never the header row or a footer row — and nothing else about the row changes', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('striped', 'separation-gap-striped'), { ...fixture('totals'), id: 'totals-striped', props: { ...fixture('totals').props, striped: true } }, { ...fixture('striped'), id: 'plain', props: { ...fixture('striped').props, striped: false } }] });
    const stripe = await resolveColor(page, T('stripe-container-color'));
    const filled = async (id: string) =>
      table(page, id).evaluate((el, color) => [...el.querySelectorAll('tr')].map((tr) => ([...tr.children].every((c) => getComputedStyle(c).backgroundImage.includes(color)) ? 'filled' : [...tr.children].every((c) => !getComputedStyle(c).backgroundImage.includes(color)) ? 'plain' : 'mixed')), stripe);
    expect(await filled('striped')).toEqual(['plain', 'plain', 'filled', 'plain', 'filled', 'plain']);
    // Never the footer row (the fourth body row is filled, the footer after it is not).
    expect(await filled('totals-striped')).toEqual(['plain', 'plain', 'filled', 'plain', 'filled', 'plain']);
    const second = cell(page, 'striped', 'tbody', 2, 1);
    expect(await css(second, 'background-image')).toContain(stripe);
    // Paddings included: the fill is the cell's whole padding box, and the cells of a row touch.
    expect(await css(second, 'background-size')).toMatch(/^100% (100%|calc\(100% - 0px\))$/);
    // Nothing else changes: the rows are where they are without the stripes, lines included.
    const geometry = async (id: string) => Promise.all((await table(page, id).locator('tr').all()).map(async (tr) => [(await box(tr)).height, await px(tr.locator('> *').first(), 'border-bottom-width')]));
    expect(await geometry('striped')).toEqual(await geometry('plain'));
    // Counted among the rows that are shown.
    await table(page, 'striped').locator('> tbody > tr').nth(1).evaluate((el) => ((el as HTMLElement).hidden = true));
    expect(await filled('striped')).toEqual(['plain', 'plain', 'plain', 'filled', 'plain', 'filled']);
    // With gap: the space between two rows is left out of the fill.
    const gap = await resolveToken(page, T('row-gap'));
    const gapped = cell(page, 'separation-gap-striped', 'tbody', 2, 1);
    expect(await css(gapped, 'background-image')).toContain(stripe);
    expect(await css(gapped, 'background-repeat')).toBe('no-repeat');
    expect(await css(gapped, 'background-size')).toContain(`${gap}px`);
  });
});

test.describe('caption, footer, cells', () => {
  test('TBL-12: the caption is drawn above the header row at the start edge of the box in its own text style and color, caption.gap above the first row, wraps inside the box’s width and stays where it is while the columns scroll sideways', async ({ page }) => {
    const long = 'Visits by region in the first eight months of the year, counted once per person and per day, with the sum of every region in the last row';
    await mountFixtures(page, spec, { fixtures: [...some('basic'), { ...fixture('wide'), props: { caption: long } }, raw('by-attribute', {}, '<table><tbody><tr><td>a</td></tr></tbody></table>')] });
    const caption = table(page, 'basic').locator('> caption');
    expect(await px(caption, 'font-size')).toBe(await resolveToken(page, T('caption-text-typescale-font-size')));
    expect(await css(caption, 'color')).toBe(await resolveColor(page, T('caption-text-color')));
    near((await textBox(caption)).left, (await box(host(page, 'basic'))).x, 0.5);
    expect(await px(caption, 'padding-bottom')).toBe(await resolveToken(page, T('caption-gap')));
    near((await box(table(page, 'basic').locator('> thead > tr'))).y, (await box(caption)).y + (await box(caption)).height, 0.1);
    near((await box(caption)).height, (await px(caption, 'line-height')) + (await px(caption, 'padding-bottom')), 0.5);
    expect((await box(caption)).y).toBeLessThan((await box(table(page, 'basic').locator('> thead'))).y);
    // Wider than its box: the caption wraps inside the box, and stays while the columns scroll.
    const wide = table(page, 'wide').locator('> caption');
    const boxed = await box(host(page, 'wide'));
    expect((await scroll(host(page, 'wide'))).width).toBeGreaterThan(boxed.width);
    expect(await lines(wide)).toBeGreaterThan(1);
    expect((await textBox(wide)).right).toBeLessThanOrEqual(boxed.x + boxed.width + 0.5);
    const before = await textBox(wide);
    for (const to of ['middle', 'end'] as const) {
      await host(page, 'wide').evaluate((el, where) => (el.scrollLeft = where === 'end' ? el.scrollWidth : 120), to);
      const now = await textBox(wide);
      near(now.left, before.left, 0.5);
      near(now.right, before.right, 0.5);
    }
    // The attribute is a convenience that writes the caption.
    await host(page, 'by-attribute').evaluate((el) => el.setAttribute('caption', 'Written by the attribute'));
    await expect(table(page, 'by-attribute').locator('> caption')).toHaveText('Written by the attribute');
    await host(page, 'by-attribute').evaluate((el) => ((el as unknown as { caption: string }).caption = 'Renamed'));
    await expect(table(page, 'by-attribute').locator('> caption')).toHaveText('Renamed');
    await expect(stage(page, 'by-attribute').getByRole('table', { name: 'Renamed' })).toHaveCount(1);
    await host(page, 'by-attribute').evaluate((el) => ((el as unknown as { caption: string }).caption = ''));
    await expect(table(page, 'by-attribute').locator('> caption')).toHaveCount(0);
  });

  test('TBL-13: a footer row is drawn after every body row at the emphasized weight in the cell’s color, aligned as its columns, never striped, and exposed after the body; a body row given after a footer row is still drawn before it, and reported', async ({ page }) => {
    const seen = warnings(page);
    const misplaced = '<table><thead><tr><th>Item</th><th data-align="end">Sum</th></tr></thead><tfoot><tr><td>Total</td><td data-align="end">7</td></tr></tfoot><tbody><tr><td>Tea</td><td data-align="end">4</td></tr><tr><td>Sugar</td><td data-align="end">3</td></tr></tbody></table>';
    await mountFixtures(page, spec, { fixtures: [...some('totals'), raw('misplaced', { label: 'Misplaced' }, misplaced)] });
    // The verify: totals ends with a row of sums.
    const sums = table(page, 'totals').locator('> tfoot > tr');
    expect(await sums.locator('> *').allTextContents()).toEqual(['Total', '37', '37', '37', '37', '37']);
    expect((await box(sums)).y).toBeGreaterThan((await box(table(page, 'totals').locator('> tbody > tr').last())).y);
    const body = cell(page, 'totals', 'tbody', 1, 2);
    for (const c of await sums.locator('> *').all()) {
      expect(Number(await css(c, 'font-weight'))).toBeGreaterThan(Number(await css(body, 'font-weight')));
      expect(await css(c, 'color')).toBe(await resolveColor(page, T('cell-text-color')));
      expect(await px(c, 'font-size')).toBe(await px(body, 'font-size'));
    }
    expect(await css(cell(page, 'totals', 'tfoot', 1, 2), 'text-align')).toBe('right');
    const read = await stage(page, 'totals').ariaSnapshot();
    expect(read.indexOf('Total')).toBeGreaterThan(read.indexOf('Stable'));
    // Given before the body: drawn after it, with the line above it, and said.
    const [foot, lastBody] = [await box(table(page, 'misplaced').locator('> tfoot > tr')), await box(table(page, 'misplaced').locator('> tbody > tr').last())];
    expect(foot.y).toBeGreaterThanOrEqual(lastBody.y + lastBody.height - 0.5);
    expect(await px(table(page, 'misplaced').locator('> tbody > tr:last-child > td').first(), 'border-bottom-width')).toBe(await resolveToken(page, T('divider-thickness')));
    expect(await px(table(page, 'misplaced').locator('> tfoot > tr > td').first(), 'border-bottom-width')).toBe(0);
    await expect.poll(() => seen.filter((m) => m.includes('TBL-13')).length).toBe(1);
  });

  test('TBL-14: an empty cell draws nothing, keeps its place and its paddings, and is an empty cell; a row with too few cells leaves the missing ones empty at its end — no cell is written into it — and is reported, and one with too many draws only as many as there are columns, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [...some('empty-cells'), fx('ragged', { label: 'Ragged' }, [col('A'), col('B'), col('C'), row(['1', '2', '3']), row(['only']), row(['1', '2', '3', 'surplus', 'more'])])],
    });
    const empty = cell(page, 'empty-cells', 'tbody', 1, 4);
    expect(await empty.evaluate((el) => el.childNodes.length)).toBe(0);
    for (const pseudo of ['::before', '::after']) expect(await empty.evaluate((el, p) => getComputedStyle(el, p).content, pseudo)).toMatch(/^(none|normal)$/);
    expect(await css(empty, 'display')).toBe('table-cell');
    expect(await px(empty, 'padding-left')).toBe(await resolveToken(page, T('cell-padding-inline-regular')));
    // The cells after it stay in their columns.
    near((await box(cell(page, 'empty-cells', 'tbody', 1, 5))).x, (await box(cell(page, 'empty-cells', 'thead', 1, 5))).x, 0.1);
    near((await box(empty)).height, (await box(cell(page, 'empty-cells', 'tbody', 1, 1))).height, 0.1);
    expect(await stage(page, 'empty-cells').ariaSnapshot()).toMatch(/- cell\n/);
    // Too few: the row is the table's width and the cell it has is in the first column.
    near((await box(table(page, 'ragged').locator('> tbody > tr').nth(1))).height, (await box(table(page, 'ragged').locator('> tbody > tr').first())).height, 1.1);
    near((await box(cell(page, 'ragged', 'tbody', 2, 1))).width, (await box(cell(page, 'ragged', 'thead', 1, 1))).width, 0.1);
    // Too many: only as many as the table has columns.
    await expect(host(page, 'ragged')).toHaveAttribute('data-columns', '3');
    expect(await Promise.all([3, 4, 5].map((n) => css(cell(page, 'ragged', 'tbody', 3, n), 'display')))).toEqual(['table-cell', 'none', 'none']);
    near((await box(table(page, 'ragged'))).width, (await box(host(page, 'ragged'))).width, 0.5);
    await expect.poll(() => seen.filter((m) => m.includes('TBL-14') && m.includes('5 cells') && m.includes('3 columns')).length).toBe(1);
    // Too few: reported as well, and the row holds the one cell it was given.
    await expect.poll(() => seen.filter((m) => m.includes('TBL-14') && m.includes('1 cells') && m.includes('3 columns')).length).toBe(1);
    expect(await table(page, 'ragged').evaluate((el) => el.tBodies[0].rows[1].cells.length)).toBe(1);
  });

  test('TBL-15: a component in a cell is placed by the column’s alignment on the cell’s first line, takes nothing from the table, adds no height to the row, and is reached by pointer and keyboard as outside the table', async ({ page }) => {
    const content = '<table><thead><tr><th>Name</th><th data-align="end">Open</th></tr></thead><tbody><tr><td>A row of text that is plain</td><td data-align="end"><a id="in-cell" href="#x">Open</a></td></tr><tr><td><button id="pressed" type="button">Press</button></td><td data-align="end">2</td></tr></tbody></table>';
    await mountFixtures(page, spec, { fixtures: [...some('tags', 'basic'), raw('content', { label: 'Content' }, content)] });
    // The verify: a small tag in each platform's cell, as its own spec draws it, on the first line, the row no taller.
    await expect(stage(page, 'tags').locator('tanrei-tag')).toHaveCount(15);
    near((await box(table(page, 'tags').locator('> tbody > tr').first())).height, (await box(table(page, 'basic').locator('> tbody > tr').first())).height, 0.1);
    const tagged = cell(page, 'tags', 'tbody', 1, 3);
    const tag = tagged.locator('tanrei-tag');
    expect((await box(tag)).height).toBe(await resolveToken(page, '--tanrei-comp-tag-container-height-small'));
    const [tagBox, lineBox] = [await box(tag), await textBox(cell(page, 'tags', 'tbody', 1, 1))];
    near(tagBox.y + tagBox.height / 2, lineBox.top + lineBox.height / 2, 1.5);
    near(tagBox.x - (await box(tagged)).x, await resolveToken(page, T('cell-padding-inline-regular')), 0.5);
    // Nothing of the table's is set on it: the tag is the tag it is anywhere.
    expect(await tag.evaluate((el) => el.getAttributeNames().filter((name) => name === 'style' || name === 'class' || name.startsWith('data-')))).toEqual([]);
    expect(await css(tag, 'vertical-align')).toBe('baseline');
    // By the column's alignment.
    const link = page.locator('#in-cell');
    near((await box(cell(page, 'content', 'tbody', 1, 2))).x + (await box(cell(page, 'content', 'tbody', 1, 2))).width - ((await box(link)).x + (await box(link)).width), await resolveToken(page, T('cell-padding-inline-regular')), 0.5);
    // Input reaches it: a pointer…
    await page.evaluate(() => {
      (window as unknown as { pressed: number }).pressed = 0;
      document.querySelector('#pressed')!.addEventListener('click', () => (window as unknown as { pressed: number }).pressed++);
    });
    await page.locator('#pressed').click();
    expect(await page.evaluate(() => (window as unknown as { pressed: number }).pressed)).toBe(1);
    // …and the keyboard, in the reading order of the cells: the link of the first row, then the button of the second.
    await tabTo(page, link);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#x');
    await tabTo(page, page.locator('#pressed'));
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { pressed: number }).pressed)).toBe(2);
  });

  test('TBL-16: the table, its cells and rows that cannot be chosen take no input and change nothing they draw under a pointer, a press or focus; while no column is sortable the table listens for no press and emits no event', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('striped') });
    const paint = () =>
      table(page, 'striped').evaluate((el) =>
        [el, ...el.querySelectorAll('tr, th, td')].map((part) => {
          const s = getComputedStyle(part);
          return [s.backgroundColor, s.backgroundImage, s.color, s.outlineStyle, s.boxShadow, s.cursor, s.opacity].join('|');
        }),
      );
    const rest = await paint();
    const events = await page.evaluate(() => {
      const seen: string[] = [];
      const element = document.querySelector('tanrei-table')!;
      const dispatch = element.dispatchEvent.bind(element);
      element.dispatchEvent = (event: Event) => (seen.push(event.type), dispatch(event));
      (window as unknown as { tableEvents: string[] }).tableEvents = seen;
      return seen;
    });
    expect(events).toEqual([]);
    for (const part of [cell(page, 'striped', 'thead', 1, 2), cell(page, 'striped', 'tbody', 2, 1), cell(page, 'striped', 'tbody', 3, 3)]) {
      await part.hover();
      expect(await paint()).toEqual(rest);
      await page.mouse.down();
      expect(await paint()).toEqual(rest);
      await page.mouse.up();
      await part.click();
      expect(await paint()).toEqual(rest);
    }
    // Nothing in it is a focus stop or a control (the box that scrolls is TBL-22's).
    expect(await host(page, 'striped').evaluate((el) => [el, ...el.querySelectorAll('*')].filter((part) => part.hasAttribute('tabindex') || part.hasAttribute('onclick') || part.getAttribute('role') === 'button').length)).toBe(0);
    expect(await css(cell(page, 'striped', 'thead', 1, 2), 'cursor')).toBe('auto');
    expect(await page.evaluate(() => (window as unknown as { tableEvents: string[] }).tableEvents)).toEqual([]);
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
  });
});

test.describe('scrolling in its own box', () => {
  test('TBL-17: columns wider than the box scroll sideways inside it — header, body and footer rows together, from the start edge — and what holds the table never scrolls; a wheel scrolls it', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('wide', 'basic') });
    // The verify: the stage does not scroll, the table's box does.
    const s = await scroll(host(page, 'wide'));
    expect(s.width).toBeGreaterThan(s.clientWidth + 100);
    expect(s.left).toBe(0);
    near((await box(host(page, 'wide'))).width, (await box(stage(page, 'wide'))).width - 32, 0.1);
    expect(await stage(page, 'wide').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const lefts = async () => Promise.all([cell(page, 'wide', 'thead', 1, 5), cell(page, 'wide', 'tbody', 2, 5), cell(page, 'wide', 'tfoot', 1, 5)].map(async (c) => (await box(c)).x));
    const before = await lefts();
    const at = await box(host(page, 'wide'));
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.wheel(140, 0);
    await expect.poll(async () => (await scroll(host(page, 'wide'))).left).toBeGreaterThan(100);
    // Where it rests: one engine scrolls a wheel's distance over several frames (137 of the 140 when first past 100),
    // so the place is taken with the cells read between two readings of it that agree.
    let [moved, after] = [0, [] as number[]];
    await expect(async () => {
      moved = (await scroll(host(page, 'wide'))).left;
      after = await lefts();
      expect((await scroll(host(page, 'wide'))).left).toBe(moved);
    }).toPass();
    for (const [index, left] of after.entries()) near(before[index] - left, moved, 0.6);
    expect(await page.evaluate(() => [window.scrollX, document.documentElement.scrollLeft])).toEqual([0, 0]);
    // A table that fits does not scroll.
    const fits = await scroll(host(page, 'basic'));
    expect(fits.width).toBe(fits.clientWidth);
  });

  test('TBL-18: where the layout gives the table less height than its rows need the rows scroll inside its own box, the caption first in it and the status line staying at its bottom; where it sets no limit the table is exactly as tall as its caption and its rows', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('sticky-header', 'basic'), { ...fixture('sticky-header'), id: 'with-status', props: { caption: 'Releases, counted', status: '12 releases' } }] });
    // With a status line: the caption scrolls away with the rows, and the line stays at the bottom of the box.
    await size(page, 'with-status', { height: 240 });
    await host(page, 'with-status').evaluate((el) => (el.scrollTop = 200));
    await frame(page);
    const kept = await box(host(page, 'with-status'));
    const lineAt = await box(host(page, 'with-status').locator('> [data-part="status"]'));
    near(lineAt.y + lineAt.height, kept.y + kept.height, 0.1);
    expect((await box(table(page, 'with-status').locator('> caption'))).y).toBeLessThan(kept.y);
    await host(page, 'with-status').evaluate((el) => (el.scrollTop = 0));
    const natural = await box(host(page, 'sticky-header'));
    near(natural.height, (await box(table(page, 'sticky-header'))).height, 0.1);
    const parts = await table(page, 'sticky-header').evaluate((el) => [el.caption!, ...el.rows].reduce((sum, part) => sum + part.getBoundingClientRect().height, 0));
    near(natural.height, parts, 0.5);
    expect(await css(host(page, 'sticky-header'), 'max-height')).toBe('none');
    await size(page, 'sticky-header', { height: 240 });
    const limited = await scroll(host(page, 'sticky-header'));
    expect(limited.clientHeight).toBe(240);
    expect(limited.height).toBeGreaterThan(500);
    // The caption is above the rows, and the page does not scroll for them.
    const at = await box(host(page, 'sticky-header'));
    await page.mouse.move(at.x + at.width / 2, at.y + 120);
    await page.mouse.wheel(0, 200);
    await expect.poll(async () => (await scroll(host(page, 'sticky-header'))).top).toBeGreaterThan(150);
    expect((await box(table(page, 'sticky-header').locator('> caption'))).y).toBeLessThan((await box(table(page, 'sticky-header').locator('> tbody > tr').first())).y);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('TBL-19: while stickyHeader is true and the rows scroll in the box the header row stays at its top, opaque in sticky.container.color under the header’s fill, with a line under it whatever the separation while a row is under it; otherwise it scrolls with the rows', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...some('sticky-header'), { ...fixture('sticky-header'), id: 'gap', props: { ...fixture('sticky-header').props, separation: 'gap' } }, { ...fixture('sticky-header'), id: 'not-kept', props: { caption: 'Releases' } }],
    });
    const [thickness, color, fill] = [await resolveToken(page, T('divider-thickness')), await resolveColor(page, T('divider-color')), await resolveColor(page, T('sticky-container-color'))];
    for (const id of ['sticky-header', 'gap', 'not-kept']) await size(page, id, { height: 240 });
    for (const id of ['sticky-header', 'gap']) {
      const header = cell(page, id, 'thead', 1, 2);
      // At rest the gap form has no line under its header.
      expect(await px(header, 'border-bottom-width')).toBe(id === 'gap' ? 0 : thickness);
      const rest = await box(header);
      await host(page, id).evaluate((el) => (el.scrollTop = 300));
      await expect(host(page, id)).toHaveAttribute('data-more-above', '');
      const top = (await box(host(page, id))).y;
      near((await box(header)).y, top, 0.1);
      near((await box(header)).height, rest.height, 0.1);
      expect(await css(header, 'background-color')).toBe(fill);
      expect(await px(header, 'border-bottom-width')).toBe(thickness);
      expect(await css(header, 'border-bottom-color')).toBe(color);
      // Above the rows that pass under it.
      const under = await header.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
      });
      expect(under).toBe(true);
      // Back at the top the line of the gap form is gone again.
      await host(page, id).evaluate((el) => (el.scrollTop = 0));
      await expect(host(page, id)).not.toHaveAttribute('data-more-above', '');
      expect(await px(header, 'border-bottom-width')).toBe(id === 'gap' ? 0 : thickness);
    }
    // The header's own fill is over the opaque one.
    await override(page, { [T('header-container-color')]: 'rgba(1, 2, 3, 0.5)' });
    expect(await css(cell(page, 'sticky-header', 'thead', 1, 1), 'background-image')).toContain('rgba(1, 2, 3, 0.5)');
    expect(await css(cell(page, 'sticky-header', 'thead', 1, 1), 'background-color')).toBe(fill);
    // False: the header scrolls away with the rows.
    await host(page, 'not-kept').evaluate((el) => (el.scrollTop = 300));
    expect((await box(cell(page, 'not-kept', 'thead', 1, 1))).y).toBeLessThan((await box(host(page, 'not-kept'))).y - 100);
    expect(await css(cell(page, 'not-kept', 'thead', 1, 1), 'position')).toBe('static');
  });

  test('TBL-19: a table that does not scroll its rows in its own box does not keep its header while the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 300 });
    await mountFixtures(page, spec, { fixtures: some('sticky-header') });
    await page.evaluate(() => window.scrollTo(0, 250));
    expect((await box(cell(page, 'sticky-header', 'thead', 1, 1))).y).toBeLessThan(0);
  });

  test('TBL-20: while stickyFirstColumn is true and the table scrolls sideways the first column stays at the start edge, opaque under its row’s fill, with a line along its inner edge while a column is under it; the first header cell stays above both; a column wider than half of the box lets go', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...some('wide-sticky-column', 'wide-sticky-column-striped'), { ...fixture('wide-sticky-column'), id: 'both', props: { ...fixture('wide-sticky-column').props, stickyHeader: true } }],
    });
    const [thickness, color, fill, stripe] = [await resolveToken(page, T('divider-thickness')), await resolveColor(page, T('divider-color')), await resolveColor(page, T('sticky-container-color')), await resolveColor(page, T('stripe-container-color'))];
    // The verify: after scrolling to the end the Region column is still at the start edge, with a line along its inner edge.
    for (const id of ['wide-sticky-column', 'wide-sticky-column-striped']) {
      const firsts = [cell(page, id, 'thead', 1, 1), cell(page, id, 'tbody', 1, 1), cell(page, id, 'tbody', 2, 1), table(page, id).locator('tr').last().locator('> *').first()];
      const widths = await Promise.all(firsts.map(async (c) => (await box(c)).width));
      for (const c of firsts) expect(await px(c, 'border-right-width')).toBe(0);
      await host(page, id).evaluate((el) => (el.scrollLeft = el.scrollWidth));
      await expect(host(page, id)).toHaveAttribute('data-more-start', '');
      const start = (await box(host(page, id))).x;
      for (const [index, c] of firsts.entries()) {
        near((await box(c)).x, start, 0.1);
        expect(await css(c, 'background-color')).toBe(fill);
        expect(await px(c, 'border-right-width')).toBe(thickness);
        expect(await css(c, 'border-right-color')).toBe(color);
        // The line takes nothing from the column.
        near((await box(c)).width, widths[index], 0.1);
      }
      // For the table's whole height: every first cell, and they touch.
      expect(await table(page, id).evaluate((el) => [...el.rows].every((r) => getComputedStyle(r.cells[0]).borderRightWidth !== '0px'))).toBe(true);
      // Over the columns that pass under it.
      expect(await firsts[1].evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width - 4, r.top + r.height / 2) === el; })).toBe(true);
      // The start line of the box is this line: the box draws none of its own there (TBL-21).
      expect(await host(page, id).evaluate((el) => getComputedStyle(el, '::before').borderLeftWidth)).toBe('0px');
      await host(page, id).evaluate((el) => (el.scrollLeft = 0));
      await expect(host(page, id)).not.toHaveAttribute('data-more-start', '');
      expect(await px(firsts[1], 'border-right-width')).toBe(0);
    }
    // Under the fill its row gives it: a striped row's first cell is the stripe over the opaque fill.
    const striped = cell(page, 'wide-sticky-column-striped', 'tbody', 2, 1);
    expect(await css(striped, 'background-image')).toContain(stripe);
    expect(await css(striped, 'background-color')).toBe(fill);
    // Both: the first header cell stays above the header row and the first column.
    await size(page, 'both', { height: 200 });
    await host(page, 'both').evaluate((el) => el.scrollTo(200, 120));
    const corner = cell(page, 'both', 'thead', 1, 1);
    const at = await box(host(page, 'both'));
    near((await box(corner)).x, at.x, 0.1);
    near((await box(corner)).y, at.y, 0.1);
    expect(await corner.evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el; })).toBe(true);
    const z = async (c: Locator) => Number(await css(c, 'z-index'));
    expect(await z(corner)).toBeGreaterThan(await z(cell(page, 'both', 'thead', 1, 2)));
    expect(await z(cell(page, 'both', 'thead', 1, 2))).toBeGreaterThan(await z(cell(page, 'both', 'tbody', 1, 1)));
    // The verify's second half: at a stage narrower than twice the Region column, the column scrolls away with the others.
    const region = (await box(cell(page, 'wide-sticky-column', 'tbody', 1, 1))).width;
    await size(page, 'wide-sticky-column', { width: Math.floor(region * 2) - 20 });
    await expect(host(page, 'wide-sticky-column')).toHaveAttribute('data-first-column-released', '');
    await host(page, 'wide-sticky-column').evaluate((el) => (el.scrollLeft = 200));
    expect((await box(cell(page, 'wide-sticky-column', 'tbody', 1, 1))).x).toBeLessThan((await box(host(page, 'wide-sticky-column'))).x - 100);
    // …and the box then draws its own start line.
    await expect.poll(() => host(page, 'wide-sticky-column').evaluate((el) => getComputedStyle(el, '::before').borderLeftWidth)).toBe(`${thickness}px`);
    // Wide enough again, it is kept again.
    await size(page, 'wide-sticky-column', { width: 480 });
    await expect(host(page, 'wide-sticky-column')).not.toHaveAttribute('data-first-column-released', '');
    near((await box(cell(page, 'wide-sticky-column', 'tbody', 1, 1))).x, (await box(host(page, 'wide-sticky-column'))).x, 0.1);
  });

  test('TBL-21: a line of divider.thickness in divider.color along an inline edge of the box, for the table’s whole height, while columns lie beyond it, removed when the scroll reaches that edge — and nothing else says there is more', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('wide', 'basic') });
    const [thickness, color] = [await resolveToken(page, T('divider-thickness')), await resolveColor(page, T('divider-color'))];
    const lines = () =>
      host(page, 'wide').evaluate((el) => {
        const [start, end] = [getComputedStyle(el, '::before'), getComputedStyle(el, '::after')];
        return { start: Number.parseFloat(start.borderLeftWidth), end: Number.parseFloat(end.borderRightWidth), color: end.borderRightColor, height: Number.parseFloat(end.height), position: end.position };
      });
    // At the start: more at the end only.
    await expect(host(page, 'wide')).toHaveAttribute('data-more-end', '');
    expect(await lines()).toMatchObject({ start: 0, end: thickness, color, position: 'sticky' });
    near((await lines()).height, (await box(table(page, 'wide'))).height, 0.6);
    // In the middle: both.
    await host(page, 'wide').evaluate((el) => (el.scrollLeft = 100));
    await expect(host(page, 'wide')).toHaveAttribute('data-more-start', '');
    expect(await lines()).toMatchObject({ start: thickness, end: thickness });
    // At the end: the start only.
    await host(page, 'wide').evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await expect(host(page, 'wide')).not.toHaveAttribute('data-more-end', '');
    expect(await lines()).toMatchObject({ start: thickness, end: 0 });
    // The line is drawn at the box's edge, over the cells: the pixels of the box's first column of pixels are the divider's.
    const at = await box(host(page, 'wide'));
    const shot = await page.screenshot({ clip: { x: at.x, y: at.y + at.height / 2, width: 1, height: 1 }, scale: 'css' });
    await host(page, 'wide').evaluate((el) => (el.scrollLeft = 0));
    await expect(host(page, 'wide')).not.toHaveAttribute('data-more-start', '');
    const none = await page.screenshot({ clip: { x: at.x, y: at.y + at.height / 2, width: 1, height: 1 }, scale: 'css' });
    expect(shot.equals(none)).toBe(false);
    // With these lines alone: no shadow, no fade, no other color.
    for (const part of [host(page, 'wide'), table(page, 'wide')]) {
      expect(await css(part, 'box-shadow')).toBe('none');
      expect(await css(part, 'mask-image')).toBe('none');
      expect(await css(part, 'background-image')).toBe('none');
    }
    // A table that does not scroll has neither.
    expect(await host(page, 'basic').evaluate((el) => [el.hasAttribute('data-more-start'), el.hasAttribute('data-more-end'), getComputedStyle(el, '::after').borderRightWidth])).toEqual([false, false, '0px']);
  });

  test('TBL-22: while it scrolls the box is one stop in the focus order before anything in its cells, a region with the table’s name, with the system’s focus ring inside its edge, and the keys scroll it; a table that does not scroll is no stop and no region', async ({ page }) => {
    const content = (id: string) => `<table><caption>Links ${id}</caption><thead><tr>${NUMBERS.map((n) => `<th data-wrap="false">${n} of the year</th>`).join('')}</tr></thead><tbody><tr>${NUMBERS.map((n, i) => `<td>${i === 2 ? `<a id="link-${id}" href="#${id}">link</a>` : n}</td>`).join('')}</tr></tbody></table>`;
    await mountFixtures(page, spec, { fixtures: [...some('basic', 'wide'), raw('links', {}, content('links'), {}), { ...fixture('sticky-header'), id: 'tall' }] });
    await size(page, 'links', { width: 480 });
    await size(page, 'tall', { height: 200 });
    // The verify: basic is passed, the box of wide is reached, and the right arrow scrolls it.
    await expect(host(page, 'wide')).toHaveAttribute('tabindex', '0');
    expect(await host(page, 'basic').evaluate((el) => [el.hasAttribute('tabindex'), el.hasAttribute('role'), el.tabIndex])).toEqual([false, false, -1]);
    await expect(stage(page, 'basic').getByRole('region')).toHaveCount(0);
    await expect(stage(page, 'wide').getByRole('region', { name: named(fixture('wide')), exact: true })).toHaveCount(1);
    await expect(host(page, 'wide')).toHaveAttribute('aria-labelledby', await table(page, 'wide').locator('> caption').getAttribute('id') as string);
    await page.locator('body').click({ position: { x: 790, y: 5 } });
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.parentElement?.getAttribute('data-fixture'))).toBe('wide');
    // The ring: outer-width wide, in the focus color, set in from the edge by the offset, never animated.
    const [width, offset] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset')];
    expect(await px(host(page, 'wide'), 'outline-width')).toBe(width);
    expect(await css(host(page, 'wide'), 'outline-style')).toBe('solid');
    expect(await css(host(page, 'wide'), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(host(page, 'wide'), 'outline-offset')).toBe(-(width + offset));
    expect(await css(host(page, 'wide'), 'transition-property')).not.toContain('outline');
    expect(await css(host(page, 'wide'), 'transition-duration')).toBe('0s');
    // The arrow keys: left and right move the view left and right.
    // (A key is held until the box has moved: an engine that scrolls for as long as a key is down moves little for a tap.)
    const hold = async (key: string, id: string, moved: (s: Awaited<ReturnType<typeof scroll>>) => boolean) => {
      await page.keyboard.down(key);
      await expect.poll(async () => moved(await scroll(host(page, id))), { message: key }).toBe(true);
      await page.keyboard.up(key);
      // What the key began has ended before the next one: the box stands still (however long that takes here).
      await atRest(host(page, id));
    };
    await hold('ArrowRight', 'wide', (s) => s.left > 0);
    const right = (await scroll(host(page, 'wide'))).left;
    await hold('ArrowLeft', 'wide', (s) => s.left < right);
    // Before anything in its cells: the box, then the link in it.
    await tabTo(page, host(page, 'links'));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link-links');
    // A pointer does not draw the ring.
    await page.locator('body').click({ position: { x: 790, y: 5 } });
    await cell(page, 'wide', 'tbody', 1, 2).click();
    expect(await css(host(page, 'wide'), 'outline-style')).toBe('none');
    // Up and down, a page, and to either end, as the browser scrolls a region.
    await tabTo(page, host(page, 'tall'));
    await hold('ArrowDown', 'tall', (s) => s.top > 0);
    const down = (await scroll(host(page, 'tall'))).top;
    await hold('ArrowUp', 'tall', (s) => s.top < down);
    // Each key is pressed on a box at rest, as a person presses it. A key scrolls over some frames: Chromium drops a
    // key that arrives between the last of them and that scroll's end (End, pressed as Page Down ended, moved nothing),
    // and WebKit adds a key that arrives on the way to where the scroll was going (Home would end short of the top).
    await atRest(host(page, 'tall'));
    await page.keyboard.press('PageDown');
    await expect.poll(async () => (await scroll(host(page, 'tall'))).top).toBeGreaterThan(100);
    await atRest(host(page, 'tall'));
    await page.keyboard.press('End');
    await expect.poll(async () => { const s = await scroll(host(page, 'tall')); return s.height - s.clientHeight - s.top; }).toBeLessThanOrEqual(1);
    await atRest(host(page, 'tall'));
    await page.keyboard.press('Home');
    await expect.poll(async () => (await scroll(host(page, 'tall'))).top).toBe(0);
    await atRest(host(page, 'tall'));
    await page.keyboard.press('PageDown');
    await expect.poll(async () => (await scroll(host(page, 'tall'))).top).toBeGreaterThan(100);
    const paged = (await atRest(host(page, 'tall'))).top;
    await page.keyboard.press('PageUp');
    await expect.poll(async () => (await scroll(host(page, 'tall'))).top).toBeLessThan(paged - 50);
    // No longer scrolling, it is no stop and no region.
    await size(page, 'wide', { width: 1200 });
    await page.setViewportSize({ width: 1400, height: 900 });
    await stage(page, 'wide').evaluate((el) => ((el as HTMLElement).style.maxInlineSize = 'none'));
    await expect(host(page, 'wide')).not.toHaveAttribute('tabindex', '0');
    expect(await host(page, 'wide').evaluate((el) => [el.hasAttribute('role'), el.hasAttribute('aria-labelledby')])).toEqual([false, false]);
  });

  test('TBL-22: the focus ring is drawn whole — over a header row and a first column that stay in view', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [{ ...fixture('wide-sticky-column'), id: 'both', props: { ...fixture('wide-sticky-column').props, stickyHeader: true } }] });
    await size(page, 'both', { height: 200 });
    await host(page, 'both').evaluate((el) => el.scrollTo(150, 100));
    await tabTo(page, host(page, 'both'));
    const [width, offset] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset')];
    const at = await box(host(page, 'both'));
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    const inset = offset + width / 2;
    const [r, g, b] = ring.match(/\d+/g)!.map(Number);
    // The middle of the ring on its start side (over the first column) and on its top side (over the header row).
    for (const [x, y] of [[at.x + inset, at.y + at.height / 2], [at.x + at.width / 2, at.y + inset], [at.x + inset, at.y + inset + 6]]) {
      const image = decodePng(await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 }, scale: 'css' }));
      expect([image.data[0], image.data[1], image.data[2]], `${x}, ${y}`).toEqual([r, g, b]);
    }
  });
});

test.describe('accessibility', () => {
  test('TBL-23: the table is named by its caption, or by label where there is none, and label is not drawn; with both, the caption is the name; with neither it has no name, and that is reported — and while such a table scrolls its box is still a focus stop, a region without a name', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [...some('basic', 'label-only'), { ...fixture('basic'), id: 'both', props: { caption: 'The caption', label: 'The label' } }, { ...fixture('basic'), id: 'unnamed', props: {} }, { ...fixture('wide'), id: 'wide-label', props: { label: 'Visits, by label' } }, { ...fixture('wide'), id: 'wide-unnamed', props: {} }],
    });
    await expect(stage(page, 'basic').getByRole('table', { name: named(fixture('basic')), exact: true })).toHaveCount(1);
    await expect(stage(page, 'label-only').getByRole('table', { name: named(fixture('label-only')), exact: true })).toHaveCount(1);
    await expect(table(page, 'label-only')).toHaveAttribute('aria-label', named(fixture('label-only')));
    expect(named(fixture('label-only'))).toContain('Button sizes');
    // Not drawn: the labelled table is the captioned one without its caption.
    expect(await table(page, 'label-only').locator('> caption').count()).toBe(0);
    expect(await host(page, 'label-only').evaluate((el) => (el as HTMLElement).innerText)).not.toContain('Button sizes');
    near((await box(host(page, 'basic'))).height - (await box(host(page, 'label-only'))).height, (await box(table(page, 'basic').locator('> caption'))).height, 0.1);
    // Both: the caption.
    await expect(stage(page, 'both').getByRole('table', { name: 'The caption', exact: true })).toHaveCount(1);
    expect(await table(page, 'both').getAttribute('aria-label')).toBeNull();
    // Neither.
    await expect(stage(page, 'unnamed').getByRole('table')).toHaveCount(1);
    expect(await stage(page, 'unnamed').ariaSnapshot()).toMatch(/^- table:/);
    await expect.poll(() => seen.filter((m) => m.includes('TBL-23')).length).toBe(2);
    // A table without a name that scrolls: the keyboard must still be able to scroll it.
    await expect(host(page, 'wide-unnamed')).toHaveAttribute('tabindex', '0');
    await expect(host(page, 'wide-unnamed')).toHaveAttribute('role', 'region');
    expect(await host(page, 'wide-unnamed').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-labelledby')])).toEqual([null, null]);
    // A scroll region carries the label where there is no caption, and follows it.
    await expect(stage(page, 'wide-label').getByRole('region', { name: 'Visits, by label' })).toHaveCount(1);
    await host(page, 'wide-label').evaluate((el) => ((el as unknown as { label: string }).label = 'Renamed'));
    await expect(stage(page, 'wide-label').getByRole('region', { name: 'Renamed' })).toHaveCount(1);
    await expect(stage(page, 'wide-label').getByRole('table', { name: 'Renamed' })).toHaveCount(1);
  });

  test('TBL-24: every fixture is a table with its rows, column headers, row headers and cells — also while it scrolls in its own box and while a column or the header is kept in view; striping and density change nothing that is exposed', async ({ page, browserName }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      const columns = f.items!.filter((item) => item.kind === 'column');
      // TBL-50: a placeholder row is hidden from assistive technology.
      const rows = f.items!.filter((item) => item.kind === 'row' && item.props.placeholder !== true);
      const headed = columns.some((c) => c.props.header);
      // TBL-42: a table whose rows can be chosen has one cell more in every row, the header row's too.
      const selects = f.props.selection === 'multiple' || f.props.selection === 'single' ? rows.length + (headed ? 1 : 0) : 0;
      const name = named(f);
      const tableRole = stage(page, f.id).getByRole('table', { name, exact: true });
      await expect(tableRole, f.id).toHaveCount(1);
      // TBL-48: a fixture without rows that fills the empty slot has one more row, of one cell.
      const none = f.slots?.empty !== undefined && !rows.some((r) => r.props.footer !== true) ? 1 : 0;
      await expect(tableRole.getByRole('row'), f.id).toHaveCount(rows.length + none + (headed ? 1 : 0));
      await expect(tableRole.getByRole('columnheader'), f.id).toHaveCount(headed ? columns.length : 0);
      await expect(tableRole.getByRole('rowheader'), f.id).toHaveCount(f.props.rowHeaders ? rows.length : 0);
      await expect(tableRole.getByRole('cell'), f.id).toHaveCount(rows.reduce((sum, r) => sum + r.items!.length, 0) + none + selects - (f.props.rowHeaders ? rows.length : 0));
      // Structure, not style: header cells are header cells of their column and row.
      expect(await table(page, f.id).evaluate((el) => [...el.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col') && [...el.querySelectorAll('tbody th, tfoot th')].every((th) => th.getAttribute('scope') === 'row')), f.id).toBe(true);
      expect(await css(table(page, f.id), 'display'), f.id).toBe('table');
      expect(await table(page, f.id).evaluate((el) => [...el.querySelectorAll('thead, tbody, tfoot, tr, th, td')].map((part) => getComputedStyle(part).display).filter((d) => !/^table-/.test(d))), f.id).toEqual([]);
    }
    // The same rows and cells while it scrolls, with a column kept in view.
    const before = await stage(page, 'wide-sticky-column').getByRole('table').ariaSnapshot();
    await host(page, 'wide-sticky-column').evaluate((el) => (el.scrollLeft = 200));
    await expect(host(page, 'wide-sticky-column')).toHaveAttribute('data-more-start', '');
    expect(await stage(page, 'wide-sticky-column').getByRole('table').ariaSnapshot()).toBe(before);
    // Striped or not, compact or not.
    const plain = (text: string) => text.replace(/"[^"]*"|: .*/g, '');
    expect(plain(await stage(page, 'striped-compact-tokens').getByRole('table').ariaSnapshot())).toBe(plain(await stage(page, 'compact-tokens').getByRole('table').ariaSnapshot()));
    // The browser's own tree (Chromium's, read over the DevTools protocol) says the same of a table that scrolls with a column kept.
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const roles = nodes.filter((n) => !n.ignored).map((n) => String(n.role?.value));
      const count = (role: string) => roles.filter((r) => r === role).length;
      const expected = spec.fixtures.reduce(
        (sum, f) => {
          const rows = f.items!.filter((item) => item.kind === 'row' && item.props.placeholder !== true);
          const columns = f.items!.filter((item) => item.kind === 'column');
          const headed = columns.some((c) => c.props.header);
          const none = f.slots?.empty !== undefined && !rows.some((r) => r.props.footer !== true) ? 1 : 0;
          return { table: sum.table + 1, row: sum.row + rows.length + none + (headed ? 1 : 0), columnheader: sum.columnheader + (headed ? columns.length : 0), rowheader: sum.rowheader + (f.props.rowHeaders ? rows.length : 0) };
        },
        { table: 0, row: 0, columnheader: 0, rowheader: 0 },
      );
      expect({ table: count('table'), row: count('row'), columnheader: count('columnheader'), rowheader: count('rowheader') }).toEqual(expected);
      await cdp.detach();
    }
  });

  test('TBL-24: a cell is associated with the header of its column and of its row', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('totals') });
    const headers = await cell(page, 'totals', 'tbody', 2, 3).evaluate((el) => {
      const td = el as HTMLTableCellElement;
      const t = td.closest('table')!;
      return [t.tHead!.rows[0].cells[td.cellIndex].textContent, (td.parentElement as HTMLTableRowElement).cells[0].textContent, t.tHead!.rows[0].cells[td.cellIndex].scope, (td.parentElement as HTMLTableRowElement).cells[0].scope];
    });
    expect(headers).toEqual(['SwiftUI', 'Alpha', 'col', 'row']);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      for (const fixtures of [spec.fixtures]) {
        await mountFixtures(page, spec, { theme, fixtures });
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, `${theme} ${fixtures.map((f) => f.id).join(' ')}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
      }
    }
  });
});

test.describe('changes, direction, text size, forced colors', () => {
  test('TBL-25: rows, columns and cells that change are drawn at once, without a motion, the scroll kept, and nothing announces the change — the status line is the one place that tells one (TBL-52), and focus stays on the sort button through a change of rows (TBL-34)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('wide', 'basic') });
    await host(page, 'wide').evaluate((el) => (el.scrollLeft = 120));
    await table(page, 'wide').evaluate((el) => {
      const added = el.tBodies[0].insertRow();
      for (let i = 0; i < 9; i++) added.insertCell().textContent = i ? String(1000 + i) : 'Highlands';
      for (const tr of el.rows) tr.deleteCell(4);
      el.tBodies[0].rows[0].cells[1].textContent = '9,999';
    });
    await frame(page);
    expect((await scroll(host(page, 'wide'))).left).toBe(120);
    await expect(stage(page, 'wide').getByRole('row')).toHaveCount(8);
    await expect(stage(page, 'wide').getByRole('columnheader')).toHaveCount(8);
    await expect(host(page, 'wide')).toHaveAttribute('data-columns', '8');
    // The new last row has no line under it, and the row that was last now has one.
    expect(await px(table(page, 'wide').locator('> tbody > tr').last().locator('> *').first(), 'border-bottom-width')).toBe(await resolveToken(page, T('divider-thickness')));
    for (const part of [host(page, 'wide'), table(page, 'wide'), cell(page, 'wide', 'tbody', 1, 2)]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
      expect(await css(part, 'animation-name')).toBe('none');
    }
    expect(await host(page, 'wide').evaluate((el) => [el, ...el.querySelectorAll('*')].filter((part) => part.hasAttribute('aria-live') || ['status', 'alert', 'log'].includes(part.getAttribute('role') ?? '')).length)).toBe(0);
    // Columns enough to overflow make the box a region; rows taken away make it none again.
    await table(page, 'basic').evaluate((el) => {
      for (const tr of el.rows) for (let i = 0; i < 8; i++) tr.insertCell().textContent = 'One more column of text';
      for (const td of el.querySelectorAll('td')) td.setAttribute('data-wrap', 'false');
    });
    await expect(host(page, 'basic')).toHaveAttribute('role', 'region');
    await table(page, 'basic').evaluate((el) => {
      for (const tr of el.rows) while (tr.cells.length > 3) tr.deleteCell(-1);
    });
    await expect(host(page, 'basic')).not.toHaveAttribute('role', 'region');
    // A density changed while shown.
    await host(page, 'basic').evaluate((el) => ((el as unknown as { density: string }).density = 'compact'));
    await expect.poll(async () => px(cell(page, 'basic', 'tbody', 1, 1), 'padding-top')).toBe(await resolveToken(page, T('cell-padding-block-compact')));
  });

  test('TBL-26: the direction is that of the nearest ancestor that sets one — the table has no setting of its own — and a change of it is drawn at once, with the column a person was looking at still in view', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [{ ...fixture('wide-sticky-column'), id: 'turned' }, ...some('basic')], dir: 'ltr' });
    await size(page, 'turned', { width: 480 });
    expect((spec.props ?? []).some((p) => /dir/i.test(p.name))).toBe(false);
    const sides = async () => {
      const [h, first, last] = [await edges(host(page, 'turned')), await edges(cell(page, 'turned', 'tbody', 1, 1)), await edges(cell(page, 'turned', 'tbody', 1, 9))];
      return { firstAtLeft: Math.abs(first.left - h.left) < 1, firstAtRight: Math.abs(first.right - h.right) < 1, lastBeyondRight: last.right > h.right, lastBeyondLeft: last.left < h.left };
    };
    expect(await sides()).toEqual({ firstAtLeft: true, firstAtRight: false, lastBeyondRight: true, lastBeyondLeft: false });
    // On an ancestor inside the page, not on the root.
    await stage(page, 'turned').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await expect.poll(sides).toEqual({ firstAtLeft: false, firstAtRight: true, lastBeyondRight: false, lastBeyondLeft: true });
    expect(await css(cell(page, 'turned', 'tbody', 1, 1), 'text-align')).toBe('right');
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');
    expect(await css(cell(page, 'basic', 'tbody', 1, 1), 'text-align')).toBe('left');
    expect(await css(host(page, 'turned'), 'transition-duration')).toBe('0s');
    // Scrolled to a column, then turned: the same column is in view, the same distance from the start.
    await host(page, 'turned').evaluate((el) => (el.scrollLeft = -180));
    await expect(host(page, 'turned')).toHaveAttribute('data-more-start', '');
    const seen = async () => {
      const h = await edges(host(page, 'turned'));
      const cells = await table(page, 'turned').locator('> thead > tr > th').all();
      const inside: string[] = [];
      for (const c of cells) {
        const e = await edges(c);
        if (e.left >= h.left - 1 && e.right <= h.right + 1) inside.push((await c.textContent())!);
      }
      return inside;
    };
    const looking = await seen();
    await stage(page, 'turned').evaluate((el) => el.setAttribute('dir', 'ltr'));
    await expect.poll(async () => Math.round((await scroll(host(page, 'turned'))).left)).toBe(180);
    expect(await seen()).toEqual(looking);
    expect(await sides()).toMatchObject({ firstAtLeft: true });
  });

  test('TBL-27: in a right-to-left layout the columns run from the right, the scroll begins at the right edge, a first column that stays is at the right with its line on its left, and the lines of TBL-21 are at the edges columns lie beyond; top and bottom do not change', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('rtl-wide-sticky-column', 'rtl') });
    const id = 'rtl-wide-sticky-column';
    const thickness = await resolveToken(page, T('divider-thickness'));
    // The verify: the first column is at the right edge and the table opens showing it.
    const h = await edges(host(page, id));
    const first = cell(page, id, 'tbody', 1, 1);
    near((await edges(first)).right, h.right, 0.1);
    expect((await scroll(host(page, id))).left).toBe(0);
    expect((await edges(cell(page, id, 'tbody', 1, 2))).right).toBeLessThanOrEqual((await edges(first)).left + 0.5);
    expect((await edges(cell(page, id, 'tbody', 1, 9))).left).toBeLessThan(h.left);
    // More at the end, which is the left: the end line is at the box's left edge.
    await expect(host(page, id)).toHaveAttribute('data-more-end', '');
    expect(await host(page, id).evaluate((el) => [getComputedStyle(el, '::after').borderLeftWidth, getComputedStyle(el, '::after').borderRightWidth])).toEqual([`${thickness}px`, '0px']);
    // Scrolling moves the other columns under it from the left; its line is on its left.
    await host(page, id).evaluate((el) => (el.scrollLeft = -150));
    await expect(host(page, id)).toHaveAttribute('data-more-start', '');
    near((await edges(first)).right, h.right, 0.1);
    expect(await px(first, 'border-left-width')).toBe(thickness);
    expect(await px(first, 'border-right-width')).toBe(0);
    expect(await first.evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + 4, r.top + r.height / 2) === el; })).toBe(true);
    // Paddings and alignment by the layout: start is the right, and a number column's end the left.
    expect(await css(first, 'text-align')).toBe('right');
    expect(await css(cell(page, id, 'tbody', 1, 2), 'text-align')).toBe('left');
    near(h.right - (await textBox(first)).right, await resolveToken(page, T('cell-padding-inline-regular')), 0.6);
    // Top and bottom: the header row is the first row and the footer the last.
    const rows = await Promise.all((await table(page, 'rtl').locator('tr').all()).map(async (tr) => (await box(tr)).y));
    expect([...rows].sort((a, b) => a - b)).toEqual(rows);
    expect((await box(table(page, 'rtl').locator('> thead > tr'))).y).toBe(Math.min(...rows));
    expect((await box(table(page, 'rtl').locator('> tfoot > tr'))).y).toBe(Math.max(...rows));
    // The caption is at the start edge: the right.
    near((await textBox(table(page, 'rtl').locator('> caption'))).right, (await edges(host(page, 'rtl'))).right, 0.6);
  });

  test('TBL-28: the text of each cell, header cell and caption is text of its own direction, placed by the column’s alignment in the layout direction; a number is never reversed', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('rtl', 'ltr-cells-rtl') });
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    // The verify: the numbers end at the left edge of their cells and read 18.50.
    const price = cell(page, 'rtl', 'tbody', 1, 3);
    expect(await price.textContent()).toBe('18.50');
    near((await textBox(price)).left - (await edges(price)).left, pad, 0.6);
    const order = await price.evaluate((el) => {
      const text = el.firstChild as Text;
      return [0, 4].map((index) => {
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        return range.getBoundingClientRect().left;
      });
    });
    // Written left to right: the 1 is to the left of the last 0.
    expect(order[0]).toBeLessThan(order[1]);
    // The verify: left-to-right names in a right-to-left layout keep their order and start at the right edge of their cell.
    for (const [r, c, text] of [[1, 2, 'tanrei-button'], [3, 3, '.disabled(_:)'], [3, 5, 'onPressed: null']] as const) {
      const name = cell(page, 'ltr-cells-rtl', 'tbody', r, c);
      expect(await name.textContent()).toBe(text);
      near((await edges(name)).right - (await textBox(name)).right, pad, 0.6);
      const ends = await name.evaluate((el) => {
        const node = el.firstChild as Text;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getBoundingClientRect().left;
        };
        return [at(0), at(node.length - 1)];
      });
      expect(ends[0], text).toBeLessThan(ends[1]);
      expect(await css(name, 'unicode-bidi')).toBe('plaintext');
      // The layout's direction is not the text's: the cell is still right-to-left.
      expect(await css(name, 'direction')).toBe('rtl');
    }
    for (const part of [cell(page, 'rtl', 'thead', 1, 1), table(page, 'rtl').locator('> caption')]) expect(await css(part, 'unicode-bidi')).toBe('plaintext');
  });

  test('TBL-29: at 200 % text and a 320 wide window every fixture’s text is whole and grown, paddings and lines kept, and only the table’s own box scrolls sideways; raised text spacing loses nothing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec);
    const normal = { font: await px(cell(page, 'basic', 'tbody', 1, 1), 'font-size'), pad: await px(cell(page, 'basic', 'tbody', 1, 1), 'padding-left'), line: await px(cell(page, 'basic', 'tbody', 1, 1), 'border-bottom-width'), header: await px(cell(page, 'basic', 'thead', 1, 1), 'font-size'), caption: await px(table(page, 'basic').locator('> caption'), 'font-size') };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    const c = cell(page, 'basic', 'tbody', 1, 1);
    expect(await px(c, 'font-size')).toBe(normal.font * 2);
    expect(await px(cell(page, 'basic', 'thead', 1, 1), 'font-size')).toBe(normal.header * 2);
    expect(await px(table(page, 'basic').locator('> caption'), 'font-size')).toBe(normal.caption * 2);
    // Its paddings and its lines are kept: none is given up to make room (the system's space unit is the reader's too).
    expect(await px(c, 'padding-left')).toBeGreaterThanOrEqual(normal.pad);
    expect(await px(c, 'border-bottom-width')).toBeGreaterThanOrEqual(normal.line);
    const whole = async (label: string) => {
      // What holds the tables never scrolls sideways.
      expect(await page.evaluate(() => document.documentElement.scrollWidth), label).toBeLessThanOrEqual(320);
      for (const f of spec.fixtures) {
        expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), `${label} ${f.id}`).toBe(true);
        near((await box(host(page, f.id))).width, 288, 0.1);
        // No fixed height, nothing cut: no cell clips, and every cell holds its text. (A selection cell holds no text:
        // it cuts what its checkbox's container, a size of its own, would draw beyond a compact row — TBL-42.)
        const cut = await table(page, f.id).evaluate((el) =>
          [...el.querySelectorAll('caption, th, td:not([data-part="selection"])')].filter((part) => {
            const s = getComputedStyle(part);
            const range = document.createRange();
            range.selectNodeContents(part);
            // The part of a caption that names its fixture is read, not drawn (the harness's `tableNameSuffix`).
            const undrawn = part.querySelector('.fixture-name');
            if (undrawn) range.setEndBefore(undrawn);
            const [outer, inner] = [part.getBoundingClientRect(), range.getBoundingClientRect()];
            return s.overflow !== 'visible' || s.textOverflow !== 'clip' || (inner.width > 0 && (inner.bottom > outer.bottom + 1 || inner.top < outer.top - 1 || inner.right > outer.right + 1 || inner.left < outer.left - 1));
          }).length,
        );
        expect(cut, `${label} ${f.id}`).toBe(0);
      }
    };
    await whole('200 %');
    // Columns that no longer fit scroll in the table's own box.
    const s = await scroll(host(page, 'totals'));
    expect(s.width).toBeGreaterThan(s.clientWidth);
    await expect(host(page, 'totals')).toHaveAttribute('role', 'region');
    // What can wrap wraps.
    expect(await lines(cell(page, 'long-cells', 'tbody', 1, 4))).toBeGreaterThan(3);
    // The reader's own spacing (WCAG 1.4.12).
    await page.addStyleTag({ content: 'tanrei-table :is(caption, th, td) { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } tanrei-table p { margin-block-end: 2em !important; }' });
    await frame(page);
    await whole('text spacing');
  });

  test('TBL-30: in forced colors every line is the text color and so is the text; header cells, row headers and footer cells keep their text styles; a striped table draws its row lines whatever its separation', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('separation-gap-striped', 'separation-gap', 'totals', 'wide-sticky-column', 'wide'), { ...fixture('sticky-header'), id: 'kept-gap', props: { ...fixture('sticky-header').props, separation: 'gap' } }] });
    const heights = async () => Promise.all(['separation-gap-striped', 'totals'].map(async (id) => (await box(table(page, id))).height));
    const before = await heights();
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    const thickness = await resolveToken(page, T('divider-thickness'));
    // The verify: separation-gap-striped draws a CanvasText line between its rows, and under its header.
    for (const c of [cell(page, 'separation-gap-striped', 'tbody', 1, 1), cell(page, 'separation-gap-striped', 'tbody', 2, 3), cell(page, 'separation-gap-striped', 'thead', 1, 1)]) {
      expect(await px(c, 'border-bottom-width')).toBe(thickness);
      expect(await css(c, 'border-bottom-color')).toBe(canvasText);
      expect(await css(c, 'background-image')).toBe('none');
    }
    expect(await px(table(page, 'separation-gap-striped').locator('> tbody > tr').last().locator('> *').first(), 'border-bottom-width')).toBe(0);
    // Nothing moves: the line takes its width from the space.
    expect(await heights()).toEqual(before);
    // A gap table that is not striped still has no line: only what is drawn is drawn in the text color.
    for (const side of ['top', 'right', 'bottom', 'left']) expect(await px(cell(page, 'separation-gap', 'tbody', 1, 1), `border-${side}-width`)).toBe(0);
    // TBL-8's lines, and the text.
    const lined = cell(page, 'totals', 'tbody', 1, 2);
    expect(await css(lined, 'border-bottom-color')).toBe(canvasText);
    for (const c of [lined, cell(page, 'totals', 'thead', 1, 1), cell(page, 'totals', 'tfoot', 1, 1), table(page, 'totals').locator('> caption')]) expect(await css(c, 'color')).toBe(canvasText);
    // Told apart by their text styles, as without the mode.
    expect(Number(await css(cell(page, 'totals', 'tbody', 1, 1), 'font-weight'))).toBeGreaterThan(Number(await css(lined, 'font-weight')));
    expect(Number(await css(cell(page, 'totals', 'tfoot', 1, 2), 'font-weight'))).toBeGreaterThan(Number(await css(lined, 'font-weight')));
    expect(await px(cell(page, 'totals', 'thead', 1, 1), 'font-size')).toBe(await resolveToken(page, T('header-text-typescale-regular-font-size')));
    // TBL-20's and TBL-21's lines.
    await host(page, 'wide-sticky-column').evaluate((el) => (el.scrollLeft = 100));
    await expect(host(page, 'wide-sticky-column')).toHaveAttribute('data-more-start', '');
    expect(await css(cell(page, 'wide-sticky-column', 'tbody', 1, 1), 'border-right-color')).toBe(canvasText);
    expect(await px(cell(page, 'wide-sticky-column', 'tbody', 1, 1), 'border-right-width')).toBe(thickness);
    expect(await host(page, 'wide').evaluate((el) => [getComputedStyle(el, '::after').borderRightColor, getComputedStyle(el, '::after').borderRightWidth])).toEqual([canvasText, `${thickness}px`]);
    // TBL-19's line.
    await size(page, 'kept-gap', { height: 200 });
    await host(page, 'kept-gap').evaluate((el) => (el.scrollTop = 200));
    await expect(host(page, 'kept-gap')).toHaveAttribute('data-more-above', '');
    expect(await css(cell(page, 'kept-gap', 'thead', 1, 1), 'border-bottom-color')).toBe(canvasText);
    expect(await px(cell(page, 'kept-gap', 'thead', 1, 1), 'border-bottom-width')).toBe(thickness);
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('TBL-31: a density the active design system does not have renders with the default’s tokens and is reported; one a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...some('basic'), { ...fixture('basic'), id: 'unknown', props: { caption: 'Button sizes', density: 'roomy' } }, { ...fixture('basic'), id: 'not-a-name', props: { caption: 'Button sizes', density: 'Very Loose!' } }] });
    const geometry = async (id: string) => Promise.all((await table(page, id).locator('tr, th, td').all()).map(async (part) => { const b = await box(part); return [b.width, b.height]; }));
    expect(await geometry('unknown')).toEqual(await geometry('basic'));
    expect(await geometry('not-a-name')).toEqual(await geometry('basic'));
    expect(await px(cell(page, 'unknown', 'tbody', 1, 1), 'font-size')).toBe(await resolveToken(page, T('cell-text-typescale-regular-font-size')));
    await expect.poll(() => seen.filter((m) => m.includes('TBL-31') && m.includes('"roomy"')).length).toBe(1);
    expect(seen.filter((m) => m.includes('TBL-31') && m.includes('Very Loose!')).length).toBe(1);
    expect(seen.filter((m) => m.includes('TBL-31')).length).toBe(2);
    // A layer that adds the value: its paddings are read, and what it leaves out is the default's.
    await override(page, { [T('cell-padding-block-airy')]: '20px', [T('cell-padding-inline-airy')]: '28px' });
    await host(page, 'basic').evaluate((el) => ((el as unknown as { density: string }).density = 'airy'));
    await expect.poll(() => px(cell(page, 'basic', 'tbody', 1, 1), 'padding-top')).toBe(20);
    expect(await px(cell(page, 'basic', 'tbody', 1, 1), 'padding-left')).toBe(28);
    expect(await px(cell(page, 'basic', 'tbody', 1, 1), 'font-size')).toBe(await resolveToken(page, T('cell-text-typescale-regular-font-size')));
    expect(seen.filter((m) => m.includes('"airy"')).length).toBe(0);
  });
});

test.describe('the element and its stylesheet', () => {
  /** The fixtures' document with the stylesheet a page loads and no script: the table before its element is defined. */
  const withoutScript = async (page: P, fixtures: Fixture[]) => {
    const document = await fixturesDocument(spec, { fixtures });
    const script = document.lastIndexOf('<script type="module">');
    await page.setContent(`${document.slice(0, script)}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
  };
  const geometry = (page: P) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.stage')].map((s) => [
        (s as HTMLElement).dataset.fixture,
        ...[s, ...s.querySelectorAll('tanrei-table, table, caption, tr, th, td')].map((part) => {
          const r = part.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ');
        }),
      ]),
    );

  test('the stylesheet alone draws every fixture, and defining the element moves nothing (TBL-1, TBL-25)', async ({ page }) => {
    // The tags fixture holds another component, whose own definition draws it, and so do the fixtures whose rows can
    // be chosen (their checkboxes and radio buttons): they are left out of this measure. A table of native checkboxes
    // is measured with scripting off and on by TBL-57's test.
    const fixtures = spec.fixtures.filter((f) => f.id !== 'tags' && f.props.selection !== 'multiple' && f.props.selection !== 'single');
    await withoutScript(page, fixtures);
    expect(await page.evaluate(() => customElements.get('tanrei-table'))).toBeUndefined();
    // Drawn without script: the tokens' paddings, the header's style, the stripes, the scroll box and the parts that stay.
    expect(await px(cell(page, 'compact', 'tbody', 1, 1), 'padding-top')).toBe(await resolveToken(page, T('cell-padding-block-compact')));
    expect(await css(cell(page, 'totals', 'tbody', 1, 2), 'text-align')).toBe('right');
    expect(await css(cell(page, 'striped', 'tbody', 2, 1), 'background-image')).not.toBe('none');
    expect((await scroll(host(page, 'wide'))).width).toBeGreaterThan((await scroll(host(page, 'wide'))).clientWidth);
    expect(await css(cell(page, 'wide-sticky-column', 'tbody', 1, 1), 'position')).toBe('sticky');
    expect(await css(cell(page, 'sticky-header', 'thead', 1, 1), 'position')).toBe('sticky');
    const before = await geometry(page);
    await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await page.waitForFunction(() => !!customElements.get('tanrei-table'));
    await frame(page);
    await expect(host(page, 'wide')).toHaveAttribute('role', 'region');
    expect(await geometry(page)).toEqual(before);
  });

  test('the element brings its stylesheet to the root it is connected to: a table in another component’s shadow root is drawn, a focus stop and aligned (TBL-4, TBL-7, TBL-22)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('basic') });
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.style.inlineSize = '300px';
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = `<tanrei-table density="compact"><table><caption>In a shadow root</caption><thead><tr>${['Region', 'January', 'February', 'March', 'April'].map((n, i) => `<th data-wrap="false"${i ? ' data-align="end"' : ''}>${n} of the year</th>`).join('')}</tr></thead><tbody><tr><td>North</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table></tanrei-table>`;
      document.body.append(outer);
    });
    const inner = page.locator('#outer tanrei-table');
    await expect(inner).toHaveAttribute('role', 'region');
    expect(await inner.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
    expect(await px(inner.locator('td').first(), 'padding-top')).toBe(await resolveToken(page, T('cell-padding-block-compact')));
    expect(await css(inner.locator('td').nth(1), 'text-align')).toBe('right');
    expect(await inner.evaluate((el) => (el.getRootNode() as ShadowRoot).adoptedStyleSheets.length)).toBeGreaterThan(0);
  });

  test('the rules the element writes are in no cascade layer: on a page that loads table.css into a later layer of its own, a column aligned and kept on one line by its header alone is so in every cell, surplus cells are not drawn, and a density a system added is drawn (TBL-3, TBL-7, TBL-14, TBL-31)', async ({ page }) => {
    // A column's alignment and wrapping named on its header cell alone, as the spec's columns are; a row with a cell too many.
    const markup =
      '<table><caption>Visits</caption><thead><tr><th scope="col">Region</th><th scope="col" data-align="end" data-wrap="false">Visits in January</th><th scope="col" data-align="center">State</th></tr></thead>' +
      '<tbody><tr><td>North</td><td>1 204 and some more</td><td>open</td></tr><tr><td>South</td><td>2 918 and some more</td><td>shut</td><td id="surplus">one too many</td></tr></tbody>' +
      '<tfoot><tr><td>All</td><td>4 122 and some more</td><td>—</td></tr></tfoot></table>';
    await mountFixtures(page, spec, { fixtures: [raw('layered', { label: 'Visits' }, markup), raw('airy', { label: 'Visits', density: 'airy' }, markup.replace('id="surplus"', ''))] });
    await size(page, 'layered', { width: 220 });
    // The page's own copy of table.css, in a layer of the page's that comes after Tanrei's — as a site does whose
    // framework's reset is layered. A later layer wins whatever the order and the specificity of the rules.
    await page.addStyleTag({ content: `@layer tanrei, site;\n@layer site {\n${fs.readFileSync(path.join(pkg, 'dist/table.css'), 'utf8')}\n}` });
    await override(page, { [T('cell-padding-block-airy')]: '20px', [T('cell-padding-inline-airy')]: '28px' });
    await frame(page);
    // The copy is the one that draws the table: its rule, in the later layer and with no specificity, beats a rule of
    // `tanrei.components` that every rule of that layer would lose to.
    await page.addStyleTag({ content: '@layer tanrei.components { tanrei-table > table > tbody > tr > td { vertical-align: middle; } }' });
    expect(await css(cell(page, 'layered', 'tbody', 1, 1), 'vertical-align')).toBe('top');
    await expect(host(page, 'layered')).toHaveAttribute('data-columns-end', '2');
    await expect(host(page, 'layered')).toHaveAttribute('data-columns-nowrap', '2');
    await expect(host(page, 'layered')).toHaveAttribute('data-columns-center', '3');
    for (const section of ['thead', 'tbody', 'tfoot'] as const) {
      // TBL-7: the end, the middle — and the start where the header names nothing.
      expect(await css(cell(page, 'layered', section, 1, 1), 'text-align'), section).toBe('left');
      expect(await css(cell(page, 'layered', section, 1, 2), 'text-align'), section).toBe('right');
      expect(await css(cell(page, 'layered', section, 1, 3), 'text-align'), section).toBe('center');
      // TBL-3: one line, in a box too narrow for it.
      expect(await css(cell(page, 'layered', section, 1, 2), 'white-space'), section).toBe('nowrap');
      expect(await lines(cell(page, 'layered', section, 1, 2)), section).toBe(1);
      expect(await css(cell(page, 'layered', section, 1, 1), 'white-space'), section).toBe('normal');
    }
    // TBL-14: the cell after the last column is not drawn.
    await expect(host(page, 'layered')).toHaveAttribute('data-columns', '3');
    expect(await css(page.locator('#surplus'), 'display')).toBe('none');
    // TBL-31: a density a design system added, drawn from its tokens over the copy's regular.
    await expect.poll(() => px(cell(page, 'airy', 'tbody', 1, 1), 'padding-top')).toBe(20);
    expect(await px(cell(page, 'airy', 'tbody', 1, 1), 'padding-left')).toBe(28);
    expect(await px(cell(page, 'layered', 'tbody', 1, 1), 'padding-top')).toBe(await resolveToken(page, T('cell-padding-block-regular')));
    // One class of the product's, outside any layer, still wins over what the element writes: they have no specificity.
    await page.addStyleTag({ content: '.mine { text-align: left; }' });
    await cell(page, 'layered', 'tbody', 1, 2).evaluate((el) => el.classList.add('mine'));
    expect(await css(cell(page, 'layered', 'tbody', 1, 2), 'text-align')).toBe('left');
  });

  test('a table inside a cell is the product’s: the table draws none of it (TBL-15)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [raw('nested', { label: 'Nested', striped: true }, '<table><thead><tr><th>Outer</th></tr></thead><tbody><tr><td>one</td></tr><tr><td><table id="inner"><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table></td></tr></tbody></table>')] });
    const inner = page.locator('#inner td').first();
    expect(await px(inner, 'padding-top')).toBeLessThan(await resolveToken(page, T('cell-padding-block-regular')));
    expect(await css(page.locator('#inner td').nth(1), 'background-image')).toBe('none');
    expect(await css(inner, 'font-variant-numeric')).toBe('tabular-nums');
  });

  test('300 rows of the compact token table mount and scroll with nothing per row: one element, no listener and no observer on a row, the nodes of the table alone, and no frame asked for (TBL-18, TBL-25)', async ({ page, browserName }) => {
    const tokens = fixture('compact-tokens');
    const columns = tokens.items!.filter((item) => item.kind === 'column');
    const rows = tokens.items!.filter((item) => item.kind === 'row');
    const many: Fixture = { ...tokens, id: 'many', props: { ...tokens.props, stickyHeader: true, striped: true }, items: [...columns, ...Array.from({ length: 300 }, (_, i) => rows[i % rows.length])] };
    const instrument = () => {
      const w = window as unknown as { counts: { listeners: number; frames: number; observed: number; mutations: number; resizes: number } };
      w.counts = { listeners: 0, frames: 0, observed: 0, mutations: 0, resizes: 0 };
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (this: EventTarget, ...args: Parameters<typeof add>) {
        if (this instanceof Element && this.closest('tanrei-table') && this.localName !== 'tanrei-tag') w.counts.listeners++;
        return add.apply(this, args);
      };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => (w.counts.frames++, raf(callback));
      for (const [name, key] of [['ResizeObserver', 'resizes'], ['MutationObserver', 'mutations']] as const) {
        const Native = (window as unknown as Record<string, { prototype: { observe: (...args: unknown[]) => void } }>)[name];
        const observe = Native.prototype.observe;
        Native.prototype.observe = function (...args: unknown[]) {
          const target = args[0];
          if (target instanceof Element && target.closest('tanrei-table')) {
            w.counts[key]++;
            if (/^(tr|td|th|tbody|thead)$/.test(target.localName)) w.counts.observed++;
          }
          return observe.apply(this, args);
        };
      }
    };
    // The page counts what the element asks of it, from before the element is defined.
    const document = (await fixturesDocument(spec, { fixtures: [many] })).replace('<head>', `<head><script>(${instrument.toString()})()</script>`);
    const started = Date.now();
    await page.setContent(document);
    await page.waitForFunction(() => !!customElements.get('tanrei-table') && document.querySelector('tanrei-table')!.hasAttribute('data-columns'));
    const mounted = Date.now() - started;
    await page.evaluate(() => document.fonts.ready);
    await size(page, 'many', { height: 400 });
    await frame(page);
    const counts = () => page.evaluate(() => ({ ...(window as unknown as { counts: Record<string, number> }).counts }));
    const atMount = await counts();
    // One scroll listener on the box; the box and the table observed for size, the box for changes; nothing on a row.
    expect(atMount).toMatchObject({ listeners: 1, observed: 0, resizes: 2, mutations: 1 });
    // The nodes are the table's own: the element added none (3 cells a row, a row, the header's, the sections, the table).
    expect(await host(page, 'many').evaluate((el) => el.querySelectorAll('*').length)).toBe(300 * 4 + 1 + 3 + 2 + 1);
    // No cell and no row was written to.
    expect(await table(page, 'many').evaluate((el) => [...el.querySelectorAll('tr, td')].filter((part) => part.getAttributeNames().some((name) => name !== 'data-wrap')).length)).toBe(0);
    near((await box(table(page, 'many').locator('> tbody > tr').nth(150))).height, 32, 0.1);
    // The element's own work on the table that is already there, measured in the page: reading it again and measuring it.
    const work = await host(page, 'many').evaluate((el) => {
      const element = el as unknown as { read(): void };
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) element.read();
      return (performance.now() - t0) / 20;
    });
    // Scrolling: through the whole table, a frame at a time, with no frame asked for by the element and the header kept.
    const scrolled = await host(page, 'many').evaluate(async (el) => {
      const w = window as unknown as { counts: { frames: number } };
      const asked = w.counts.frames;
      const t0 = performance.now();
      let frames = 0;
      const step = 400;
      const next = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
      for (let top = 0; top < el.scrollHeight; top += step) {
        el.scrollTop = top;
        void el.getBoundingClientRect();
        frames++;
        await next();
      }
      return { ms: performance.now() - t0, steps: frames, asked: w.counts.frames - asked, top: el.scrollTop };
    });
    expect(scrolled.asked).toBe(0);
    expect(scrolled.top).toBeGreaterThan(8000);
    near((await box(cell(page, 'many', 'thead', 1, 1))).y, (await box(host(page, 'many'))).y, 0.1);
    expect(await counts()).toMatchObject({ listeners: 1, observed: 0, resizes: 2, mutations: 1 });
    // At rest it asks for no frame.
    const resting = (await counts()).frames;
    await page.waitForTimeout(400);
    expect((await counts()).frames).toBe(resting);
    console.log(`[table 300 rows] ${browserName}: mounted (document set, element defined, faces ready) in ${mounted} ms; the element's read of the table ${work.toFixed(3)} ms; ${scrolled.steps} scroll steps in ${scrolled.ms.toFixed(0)} ms (${(scrolled.ms / scrolled.steps).toFixed(2)} ms a step); nodes ${300 * 4 + 7}; listeners ${atMount.listeners}; observers ${atMount.resizes + atMount.mutations}, none on a row; frames asked for ${scrolled.asked}`);
    // Generous bounds: a regression to work per row per frame is an order of magnitude, not a percentage.
    expect(work).toBeLessThan(8);
    expect(scrolled.ms / scrolled.steps).toBeLessThan(50);
  });
});

// ── The data features: sorting, the empty body, the status line ──────────────────
const control = (page: P, id: string, column: number) => cell(page, id, 'thead', 1, column).locator('> button, > a');
const statusLine = (page: P, id: string) => host(page, id).locator('> [data-part="status"]');
const pseudo = (locator: Locator, property: string, which: '::before' | '::after') => locator.evaluate((el, [p, w]) => getComputedStyle(el, w).getPropertyValue(p), [property, which] as const);
/** A color as four numbers, whichever way the engine writes it. */
const channels = (color: string) => {
  const numbers = (color.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
  const [r, g, b, a = 1] = /^rgb/.test(color) ? [numbers[0] / 255, numbers[1] / 255, numbers[2] / 255, numbers[3]] : numbers;
  return [r, g, b, a ?? 1];
};
const sameColor = (a: string, b: string, label = '') => {
  const [x, y] = [channels(a), channels(b)];
  // A color that is not drawn is the same whatever its channels are.
  if (x[3] === 0 && y[3] === 0) return;
  for (let i = 0; i < 4; i++) expect(Math.abs(x[i] - y[i]), `${label} ${a} ≈ ${b}`).toBeLessThan(0.006);
};
/** No motion of a state: what a state draws is read at once. */
const still = (page: P) => page.addStyleTag({ content: 'tanrei-table th > :is(button, a), tanrei-table th > :is(button, a)::before, tanrei-table th > :is(button, a)::after { transition: none !important; }' });
/** Every `sort` the page hears, with what it carries. */
const hearSorts = (page: P, cancel = false) =>
  page.evaluate((stop) => {
    const w = window as unknown as { sorts: unknown[] };
    w.sorts = [];
    document.addEventListener('sort', (event) => {
      w.sorts.push({ ...(event as CustomEvent).detail, cancelable: event.cancelable, from: (event.target as Element).localName });
      if (stop) event.preventDefault();
    });
  }, cancel);
const sorts = (page: P) => page.evaluate(() => (window as unknown as { sorts: { column: string; index: number; direction: string; cancelable: boolean; from: string }[] }).sorts);
/** The text of an element as it is drawn: the box of its text nodes alone. */
const labelBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    const text = [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
    range.setStartBefore(text[0]);
    range.setEndAfter(text[text.length - 1]);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });
/** The Chromium accessibility tree, over the DevTools protocol: what the browser computed. */
async function axTree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const kept = nodes.filter((node) => !node.ignored);
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  /** The nearest ancestor that is exposed. */
  const parentOf = (node: (typeof nodes)[number]) => {
    for (let up = node.parentId ? byId.get(node.parentId) : undefined; up; up = up.parentId ? byId.get(up.parentId) : undefined) if (!up.ignored) return up;
    return undefined;
  };
  return kept.map((node) => ({
    id: node.nodeId,
    role: String(node.role?.value ?? ''),
    name: String(node.name?.value ?? ''),
    parent: parentOf(node)?.nodeId,
    parentRole: String(parentOf(node)?.role?.value ?? ''),
    live: String(node.properties?.find((p) => p.name === 'live')?.value?.value ?? ''),
  }));
}
test.describe('a column that can be sorted', () => {
  test('TBL-32: a sortable column’s header cell is one button — its container the whole box of the cell, paddings included, square — holding the header in the header’s style and the mark in the header’s icon box at the mark weight, after the label and before it in an end-aligned column; the mark’s box is kept whatever the sort is; a sortable column without a header is drawn plain and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable', 'sorted-end', 'basic'), raw('headless', { label: 'Headless' }, '<table><thead><tr><th scope="col" aria-sort="none"><button type="button"></button></th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>')] });
    const size = await resolveToken(page, T('header-icon-size'));
    const gap = await resolveToken(page, T('header-gap'));
    for (const column of [1, 2, 3]) {
      const button = control(page, 'sortable', column);
      await expect(button).toHaveCount(1);
      // The container: the button's own box, laid over the padding box of the cell.
      const th = cell(page, 'sortable', 'thead', 1, column);
      const inner = await th.evaluate((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height - Number.parseFloat(getComputedStyle(el).borderBottomWidth) }));
      expect(await pseudo(button, 'position', '::before')).toBe('absolute');
      near(Number.parseFloat(await pseudo(button, 'width', '::before')), inner.width, 0.1);
      near(Number.parseFloat(await pseudo(button, 'height', '::before')), inner.height, 0.1);
      expect(await pseudo(button, 'border-top-left-radius', '::before')).toBe('0px');
      // The label keeps the header's text style, and the cell its paddings.
      expect(await css(button, 'font-size')).toBe(await css(cell(page, 'basic', 'thead', 1, 1), 'font-size'));
      expect(await css(button, 'font-weight')).toBe(await css(cell(page, 'basic', 'thead', 1, 1), 'font-weight'));
      expect(await px(th, 'padding-left')).toBe(await resolveToken(page, T('cell-padding-inline-regular')));
      // The mark: a glyph of the icon set in its box, at the mark weight, outlined, with the box's optical size.
      expect(Number.parseFloat(await pseudo(button, 'width', '::after'))).toBe(size);
      expect(Number.parseFloat(await pseudo(button, 'height', '::after'))).toBe(size);
      expect(await pseudo(button, 'font-family', '::after')).toContain('Material Symbols');
      const axes = await pseudo(button, 'font-variation-settings', '::after');
      expect(axes).toMatch(/"wght" 500/);
      expect(axes).toMatch(/"FILL" 0/);
      expect(axes).toMatch(/"opsz" 20/);
      expect(await css(button, 'column-gap')).toBe(`${gap}px`);
    }
    // After the label in a start-aligned column; before it in an end-aligned one, whose label ends where its numbers end.
    expect(await css(control(page, 'sorted-end', 1), 'flex-direction')).toBe('row');
    const first = control(page, 'sorted-end', 1);
    near((await labelBox(first)).left, (await box(first)).x, 0.6);
    near((await box(first)).x + (await box(first)).width - (await labelBox(first)).right, gap + size, 0.6);
    for (const column of [2, 3]) {
      const button = control(page, 'sorted-end', column);
      expect(await css(button, 'flex-direction')).toBe('row-reverse');
      near((await labelBox(button)).right, (await box(button)).x + (await box(button)).width, 0.6);
      const number = await cell(page, 'sorted-end', 'tbody', 1, column).evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().right;
      });
      near((await labelBox(button)).right, number, 0.6);
    }
    // A change of order moves no label and changes no column's width.
    const widths = () => Promise.all([1, 2, 3].map(async (n) => [(await box(cell(page, 'sortable', 'thead', 1, n))).width, (await labelBox(control(page, 'sortable', n))).left]));
    const before = await widths();
    await table(page, 'sortable').evaluate((el) => {
      el.tHead!.rows[0].cells[0].setAttribute('aria-sort', 'none');
      el.tHead!.rows[0].cells[2].setAttribute('aria-sort', 'descending');
    });
    await frame(page);
    expect(await widths()).toEqual(before);
    // No header: no button is drawn, and a debug build says so.
    expect(await css(control(page, 'headless', 1), 'display')).toBe('none');
    await expect.poll(() => seen.filter((m) => m.includes('TBL-32')).length).toBe(1);
  });

  test('TBL-33: the table draws the order the product sets and never makes one — swap_vert in the colors of the part sort while a column is not sorted, arrow_upward or arrow_downward in the colors of the part sorted while it is — at once; its rows stay in the order given; two sorted columns are drawn as given and reported; a sort on a column that is not sortable is ignored', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable', 'basic'), raw('plain-sort', { label: 'Plain' }, '<table><thead><tr><th scope="col" aria-sort="ascending">A</th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>')] });
    await still(page);
    const drawn = async (column: number) => ({ glyph: (await pseudo(control(page, 'sortable', column), 'content', '::after')).replace(/\s*\/.*$/, ''), label: await css(control(page, 'sortable', column), 'color'), icon: await pseudo(control(page, 'sortable', column), 'color', '::after'), container: await pseudo(control(page, 'sortable', column), 'background-color', '::before') });
    const expectPart = async (column: number, part: 'sort' | 'sorted', glyph: string) => {
      const now = await drawn(column);
      expect(now.glyph).toBe(`"${glyph}"`);
      sameColor(now.label, await resolveColor(page, T(`${part}-label-color`)), `${part} label`);
      sameColor(now.icon, await resolveColor(page, T(`${part}-icon-color`)), `${part} icon`);
      sameColor(now.container, await resolveColor(page, T(`${part}-container-color`)), `${part} container`);
    };
    await expectPart(1, 'sorted', 'arrow_upward');
    await expectPart(2, 'sort', 'swap_vert');
    await expectPart(3, 'sort', 'swap_vert');
    // The sorted label is the color of the data; the others keep the header's.
    sameColor((await drawn(1)).label, await css(cell(page, 'sortable', 'tbody', 1, 1), 'color'));
    sameColor((await drawn(2)).label, await css(cell(page, 'basic', 'thead', 1, 1), 'color'));
    const order = () => table(page, 'sortable').evaluate((el) => [...el.tBodies[0].rows].map((row) => row.cells[0].textContent));
    const given = await order();
    expect(given).toEqual(['Filter paper', 'Hand grinder', 'Kettle', 'Scale']);
    // The product sets another order: the other glyph and colors at once, and the rows as they are given.
    await table(page, 'sortable').evaluate((el) => {
      el.tHead!.rows[0].cells[0].setAttribute('aria-sort', 'none');
      el.tHead!.rows[0].cells[2].setAttribute('aria-sort', 'descending');
    });
    await expectPart(1, 'sort', 'swap_vert');
    await expectPart(3, 'sorted', 'arrow_downward');
    expect(await order()).toEqual(given);
    // A press orders nothing either.
    await control(page, 'sortable', 2).click();
    expect(await order()).toEqual(given);
    expect(await cell(page, 'sortable', 'thead', 1, 2).getAttribute('aria-sort')).toBe('none');
    // Two columns that say the rows are in their order: each drawn as given, and reported once.
    await table(page, 'sortable').evaluate((el) => el.tHead!.rows[0].cells[0].setAttribute('aria-sort', 'ascending'));
    await expectPart(1, 'sorted', 'arrow_upward');
    await expectPart(3, 'sorted', 'arrow_downward');
    await expect.poll(() => seen.filter((m) => m.includes('TBL-33')).length).toBeGreaterThanOrEqual(1);
    // A header cell that names an order and holds no control is a plain header: no mark, the header's color.
    const plain = cell(page, 'plain-sort', 'thead', 1, 1);
    expect(await plain.evaluate((el) => getComputedStyle(el, '::after').content)).toMatch(/^(none|normal)$/);
    expect(await css(plain, 'color')).toBe(await css(cell(page, 'plain-sort', 'thead', 1, 2), 'color'));
    near((await box(plain)).height, (await box(cell(page, 'basic', 'thead', 1, 1))).height, 0.1);
  });

  test('TBL-34: a press by pointer, Enter or Space emits sort exactly once with the column’s value, its index and the direction asked for — ascending, or descending where the rows ascend by it — and changes nothing drawn; focus stays on the button through the press and through the change of rows; a control that is an anchor emits once, is followed unless the event was cancelled, and Space does not activate it', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...some('sortable'),
        raw('linked', { label: 'Linked' }, '<table><thead><tr><th scope="col" aria-sort="descending" data-value="name"><a href="#by-name">Name</a></th><th scope="col" aria-sort="none"><a href="#by-stock">Stock</a></th></tr></thead><tbody><tr><td>Kettle</td><td>15</td></tr></tbody></table>'),
      ],
    });
    await hearSorts(page);
    const name = control(page, 'sortable', 1);
    const mark = () => pseudo(name, 'content', '::after');
    const before = await mark();
    await name.click();
    expect(await sorts(page)).toEqual([{ column: 'name', index: 0, direction: 'descending', cancelable: false, from: 'tanrei-table' }]);
    // The mark and the order stay as they are until the product sets them.
    expect(await mark()).toBe(before);
    expect(await cell(page, 'sortable', 'thead', 1, 1).getAttribute('aria-sort')).toBe('ascending');
    await tabTo(page, control(page, 'sortable', 3));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect((await sorts(page)).slice(1)).toEqual([
      { column: 'price', index: 2, direction: 'ascending', cancelable: false, from: 'tanrei-table' },
      { column: 'price', index: 2, direction: 'ascending', cancelable: false, from: 'tanrei-table' },
    ]);
    await expect(control(page, 'sortable', 3)).toBeFocused();
    // The product answers: it gives the rows again in the new order — here the whole table, its header row with them.
    await table(page, 'sortable').evaluate((el) => {
      const html = el.outerHTML.replace('aria-sort="none" data-value="price"', 'aria-sort="ascending" data-value="price"').replace('aria-sort="ascending" data-value="name"', 'aria-sort="none" data-value="name"');
      el.outerHTML = html;
    });
    await expect(control(page, 'sortable', 3)).toBeFocused();
    expect(await cell(page, 'sortable', 'thead', 1, 3).getAttribute('aria-sort')).toBe('ascending');
    await page.keyboard.press('Enter');
    expect((await sorts(page)).at(-1)).toMatchObject({ column: 'price', direction: 'descending' });
    // An anchor: Enter emits once and the link is followed; Space activates no link.
    await page.evaluate(() => ((window as unknown as { sorts: unknown[] }).sorts.length = 0));
    await tabTo(page, control(page, 'linked', 1));
    await page.keyboard.press('Space');
    expect(await sorts(page)).toEqual([]);
    await page.keyboard.press('Enter');
    expect(await sorts(page)).toEqual([{ column: 'name', index: 0, direction: 'ascending', cancelable: true, from: 'tanrei-table' }]);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#by-name');
  });

  test('TBL-34: a product that cancels the sort of a control that is an anchor is not taken to its address', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('linked', { label: 'Linked' }, '<table><thead><tr><th scope="col" aria-sort="none" data-value="stock"><a href="#by-stock">Stock</a></th></tr></thead><tbody><tr><td>15</td></tr></tbody></table>')] });
    await hearSorts(page, true);
    await control(page, 'linked', 1).click();
    expect(await sorts(page)).toEqual([{ column: 'stock', index: 0, direction: 'ascending', cancelable: true, from: 'tanrei-table' }]);
    await frame(page);
    expect(await page.evaluate(() => location.hash)).toBe('');
  });

  test('TBL-35: hovered, keyboard-focused and pressed are drawn from the tokens of the button’s part, pressed over focused over hovered; focus gained by pointer is not the focused state; a change takes motion.state-duration and is immediate where motion is reduced; the state layer covers the header cell alone, over sticky.container.color while the header row is kept', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable'), { ...fixture('sortable'), id: 'kept', props: { caption: 'Kept', stickyHeader: true } }] });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(await pseudo(control(page, 'sortable', 2), 'transition-duration', '::before')).toBe(`${duration / 1000}s`);
    expect(await pseudo(control(page, 'sortable', 2), 'transition-property', '::before')).toBe('background-color');
    await still(page);
    const state = async (id: string, column: number) => ({ container: await pseudo(control(page, id, column), 'background-color', '::before'), label: await css(control(page, id, column), 'color'), icon: await pseudo(control(page, id, column), 'color', '::after'), opacity: await css(control(page, id, column), 'opacity') });
    const expectState = async (id: string, column: number, part: 'sort' | 'sorted', name: 'hovered' | 'focused' | 'pressed') => {
      const now = await state(id, column);
      sameColor(now.container, await resolveColor(page, T(`${part}-${name}-container-color`)), `${part} ${name} container`);
      sameColor(now.label, await resolveColor(page, T(`${part}-${name}-label-color`)), `${part} ${name} label`);
      sameColor(now.icon, await resolveColor(page, T(`${part}-${name}-icon-color`)), `${part} ${name} icon`);
      expect(Number(now.opacity)).toBe(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T(`${name}-opacity`))));
    };
    // The three states draw three different containers, each unlike the resting one.
    const layers = await Promise.all((['hovered', 'focused', 'pressed'] as const).map((name) => resolveColor(page, T(`sort-${name}-container-color`))));
    expect(channels(layers[0])[3]).toBeGreaterThan(0);
    expect(channels(layers[2])[3]).toBeGreaterThan(channels(layers[0])[3]);
    await control(page, 'sortable', 2).hover();
    await expectState('sortable', 2, 'sort', 'hovered');
    await control(page, 'sortable', 1).hover();
    await expectState('sortable', 1, 'sorted', 'hovered');
    // Hover is the cell's alone: the next header and the row under it are as they were.
    sameColor((await state('sortable', 2)).container, await resolveColor(page, T('sort-container-color')));
    expect(await css(cell(page, 'sortable', 'tbody', 1, 1), 'background-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    await page.mouse.move(0, 0);
    // Focused over hovered.
    await tabTo(page, control(page, 'sortable', 2));
    await control(page, 'sortable', 2).hover();
    await expectState('sortable', 2, 'sort', 'focused');
    // Pressed over both.
    await page.mouse.down();
    await expect(control(page, 'sortable', 2)).toHaveAttribute('data-pressed', 'overlay');
    await expectState('sortable', 2, 'sort', 'pressed');
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => control(page, 'sortable', 2).getAttribute('data-pressed')).toBeNull();
    // Focus gained by pointer is not the focused state (WebKit does not focus a button a pointer presses).
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await control(page, 'sortable', 3).click();
    await page.mouse.move(0, 0);
    await expect.poll(() => control(page, 'sortable', 3).getAttribute('data-pressed')).toBeNull();
    if (browserName !== 'webkit') await expect(control(page, 'sortable', 3)).toBeFocused();
    expect(await control(page, 'sortable', 3).evaluate((el) => el.matches(':focus-visible'))).toBe(false);
    sameColor((await state('sortable', 3)).container, await resolveColor(page, T('sort-container-color')));
    // Kept in view: the cell is opaque in the sticky color, and the state layer is drawn over it.
    sameColor(await css(cell(page, 'kept', 'thead', 1, 2), 'background-color'), await resolveColor(page, T('sticky-container-color')));
    expect(await css(cell(page, 'kept', 'thead', 1, 2), 'position')).toBe('sticky');
    await control(page, 'kept', 2).hover();
    await expectState('kept', 2, 'sort', 'hovered');
    expect(await pseudo(control(page, 'kept', 2), 'z-index', '::before')).toBe('-1');
    expect(await css(control(page, 'kept', 2), 'isolation')).toBe('isolate');
    // Reduced motion: immediate.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable'), reducedMotion: true });
    expect(await pseudo(control(page, 'sortable', 2), 'transition-duration', '::before')).toBe('0s');
    expect(await pseudo(control(page, 'sortable', 2), 'transition-duration', '::after')).toBe('0s');
  });

  test('TBL-36: keyboard focus on a sort button shows the system’s indicator inside the edge of its header cell — the outer width in the focus-ring color, set in by sys.focus.offset — without animation, and never for a pointer; a button focused under a first column kept in view is brought out beside it', async ({ page }) => {
    const wide: Fixture = raw(
      'under',
      { stickyFirstColumn: true },
      `<table><caption>Under the first column</caption><thead><tr>${['Region', 'January', 'February', 'March', 'April', 'May', 'June', 'July'].map((h) => `<th scope="col" aria-sort="none" data-wrap="false"><button type="button">${h} of the year</button></th>`).join('')}</tr></thead><tbody><tr>${Array.from({ length: 8 }, (_, i) => `<td>${i}</td>`).join('')}</tr></tbody></table>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable'), wide] });
    const button = control(page, 'sortable', 2);
    await tabTo(page, button);
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const offset = await resolveToken(page, '--tanrei-sys-focus-offset');
    expect(await pseudo(button, 'outline-style', '::before')).toBe('solid');
    expect(Number.parseFloat(await pseudo(button, 'outline-width', '::before'))).toBe(outer);
    sameColor(await pseudo(button, 'outline-color', '::before'), await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Inside the cell: the stroke's outer edge is the offset in from the edge of the container.
    expect(Number.parseFloat(await pseudo(button, 'outline-offset', '::before'))).toBe(-(offset + outer));
    expect(await pseudo(button, 'transition-property', '::before')).not.toContain('outline');
    // The button draws no ring of its own beside it.
    expect(await css(button, 'outline-style')).toBe('none');
    // Not for a pointer.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await control(page, 'sortable', 3).click();
    await page.mouse.move(0, 0);
    expect(await pseudo(control(page, 'sortable', 3), 'outline-style', '::before')).toBe('none');
    // Under a first column that is kept: the box scrolls so that the whole cell is beside it.
    await size(page, 'under', { width: 420 });
    await frame(page);
    await tabTo(page, control(page, 'under', 5));
    await tab(page, { back: true });
    await tab(page, { back: true });
    await tab(page, { back: true });
    await expect(control(page, 'under', 2)).toBeFocused();
    // (Read once an engine's own scroll for the focus is over: WebKit, where the three keys came within one frame,
    // moves the box by a pixel a few frames after the focus — and the table brings the cell out again.)
    await page.waitForTimeout(300);
    const kept = await box(cell(page, 'under', 'thead', 1, 1));
    const focused = await box(cell(page, 'under', 'thead', 1, 2));
    expect(focused.x).toBeGreaterThanOrEqual(kept.x + kept.width - 0.6);
  });

  test('TBL-37: a press by pointer, Enter or Space shows the pressed state without delay and keeps it for at least sys.motion.duration.press-hold, even when the press ends sooner', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable') });
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    const button = control(page, 'sortable', 2);
    // (Counted from the input event, not from the moment an observer hears of the attribute — test/watched-press.ts:
    // the observer is told after the button's own listeners returned, and a hold counted from there comes out short by
    // what they did, 98 ms of 100 in Firefox on a slow machine, while the state was held in full.)
    for (const [by, act] of [
      ['a click', () => button.click()],
      ['Enter', () => button.press('Enter')],
      ['Space', () => button.press('Space')],
    ] as const) {
      await watchPress(button);
      await act();
      expect((await expectPressShownAndHeld(page, hold, by)).feedback, by).toBe('overlay');
    }
  });

  test('TBL-38: a press is answered as sys.behavior.pressed-feedback names — overlay paints the pressed tokens on the whole container at once (the default), ripple grows the pressed layer from the point of contact and from the centre for a key (m3-like), dim applies the pressed opacity and no layer (cupertino), none draws nothing — and the ripple appears whole where motion is reduced', async ({ page }) => {
    const fixtures = some('sortable');
    const button = () => control(page, 'sortable', 2);
    const down = async () => {
      const at = await box(cell(page, 'sortable', 'thead', 1, 2));
      await page.mouse.move(at.x + 30, at.y + 20);
      await page.mouse.down();
      return at;
    };
    const up = async () => {
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => button().getAttribute('data-pressed')).toBeNull();
    };
    // overlay
    await mountFixtures(page, spec, { icons: true, fixtures });
    await still(page);
    await down();
    await expect(button()).toHaveAttribute('data-pressed', 'overlay');
    sameColor(await pseudo(button(), 'background-color', '::before'), await resolveColor(page, T('sort-pressed-container-color')));
    await expect(button().locator('.ripple')).toHaveCount(0);
    await up();
    // ripple
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'm3-like' });
    await still(page);
    const at = await down();
    await expect(button()).toHaveAttribute('data-pressed', 'ripple');
    const ripple = button().locator('> .ripple');
    await expect(ripple).toHaveCount(1);
    // The layer is the cell's: it grows from the point of contact in the cell.
    const [x, y] = await ripple.evaluate((el) => [(el as HTMLElement).style.getPropertyValue('--_x'), (el as HTMLElement).style.getPropertyValue('--_y')].map((v) => Number.parseFloat(v)));
    near(x, 30, 1);
    near(y, 20, 1);
    near((await box(ripple)).width, await cell(page, 'sortable', 'thead', 1, 2).evaluate((el) => el.clientWidth), 0.6);
    sameColor(await css(ripple, 'background-color'), await resolveColor(page, T('sort-pressed-container-color')));
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    // The container's own fill stays with the state under the press, and the layer moves nothing.
    sameColor(await pseudo(button(), 'background-color', '::before'), await resolveColor(page, T('sort-hovered-container-color')));
    near((await box(cell(page, 'sortable', 'thead', 1, 2))).height, at.height, 0.1);
    await up();
    await expect(ripple).toHaveCount(0);
    await button().focus();
    await page.keyboard.down('Enter');
    const fromKey = await button().locator('> .ripple').evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x')));
    near(fromKey, (await cell(page, 'sortable', 'thead', 1, 2).evaluate((el) => el.clientWidth)) / 2, 1);
    await page.keyboard.up('Enter');
    await expect.poll(() => button().getAttribute('data-pressed')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await down();
    expect(await css(button().locator('> .ripple'), 'animation-name')).toBe('none');
    await up();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // dim
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'cupertino' });
    await still(page);
    await down();
    await expect(button()).toHaveAttribute('data-pressed', 'dim');
    expect(Number(await css(button(), 'opacity'))).toBeCloseTo(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('pressed-opacity'))), 2);
    expect(Number(await css(button(), 'opacity'))).toBeLessThan(1);
    await expect(button().locator('.ripple')).toHaveCount(0);
    await up();
    // none
    await mountFixtures(page, spec, { icons: true, fixtures });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await still(page);
    await tabTo(page, button());
    const paint = () => button().evaluate((el) => [getComputedStyle(el, '::before').backgroundColor, getComputedStyle(el).opacity, getComputedStyle(el).color, getComputedStyle(el, '::after').color]);
    const focused = await paint();
    await page.keyboard.down('Enter');
    await expect(button()).toHaveAttribute('data-pressed', 'none');
    expect(await paint()).toEqual(focused);
    await page.keyboard.up('Enter');
  });

  test('TBL-39: the keyboard focus of a sort button is drawn as sys.behavior.focus-style names — a ring, or a glow under the acme system — and its container has square corners whatever the corner smoothing is', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable') });
    await tabTo(page, control(page, 'sortable', 2));
    sameColor(await pseudo(control(page, 'sortable', 2), 'outline-color', '::before'), await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await pseudo(control(page, 'sortable', 2), 'top', '::before')).toBe('0px');
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable'), system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, control(page, 'sortable', 2));
    expect(await pseudo(control(page, 'sortable', 2), 'outline-color', '::before')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await pseudo(control(page, 'sortable', 2), 'box-shadow', '::before')).not.toBe('none');
    // The glow is inside the cell: its box is drawn in from the cell's edge.
    expect(Number.parseFloat(await pseudo(control(page, 'sortable', 2), 'top', '::before'))).toBeGreaterThan(0);
    // Square under a system that eases its corners.
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable'), system: 'cupertino' });
    expect(await pseudo(control(page, 'sortable', 2), 'border-top-left-radius', '::before')).toBe('0px');
    expect(await control(page, 'sortable', 2).evaluate((el) => el.hasAttribute('data-tanrei-shape'))).toBe(false);
  });

  test('TBL-40: a sort button’s hit area is its whole header cell, with no gap to the one beside it; for a fine pointer the header row is at least sys.target.pointer high at the regular density and as high as its density gives at the compact one; for a coarse pointer it is sys.target.touch high at both', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable', 'sortable-compact', 'compact') });
    for (const id of ['sortable', 'sortable-compact']) {
      // Every point of a header cell — its corners, and the edge it shares with the next — is its button's.
      for (const column of [1, 2, 3]) {
        const at = await box(cell(page, id, 'thead', 1, column));
        const inner = await cell(page, id, 'thead', 1, column).evaluate((el) => el.clientHeight);
        for (const [x, y] of [[at.x + 1, at.y + 1], [at.x + at.width - 1, at.y + 1], [at.x + 1, at.y + inner - 1], [at.x + at.width - 1, at.y + inner - 1], [at.x + at.width / 2, at.y + inner / 2]]) {
          expect(await page.evaluate(([px, py, n]) => { const hit = document.elementFromPoint(px, py); const th = hit?.closest('th'); return !!hit?.closest('button') && th?.cellIndex === n - 1; }, [x, y, column] as const), `${id} ${column} ${x} ${y}`).toBe(true);
        }
      }
    }
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect((await box(table(page, 'sortable').locator('> thead > tr'))).height).toBeGreaterThanOrEqual(pointer);
    // Compact: what its density gives — a compact header row that sorts nothing is as high.
    const compact = (await box(table(page, 'compact').locator('> thead > tr'))).height;
    console.log(`[table] a compact header row is ${compact} high`);
    expect(compact).toBeLessThan(pointer);
    near((await box(table(page, 'sortable-compact').locator('> thead > tr'))).height, compact, 0.1);
    expect(fs.readFileSync(path.join(pkg, 'dist/table.css'), 'utf8')).toMatch(/@media \(pointer: coarse\) \{\s*:where\(tanrei-table\) \{\s*--_table-sort-target: var\(--tanrei-sys-target-touch\)/);
    if (browserName !== 'chromium') return;
    // Only Chromium can emulate a coarse pointer (touch emulation over CDP).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    await frame(page);
    near((await box(table(page, 'sortable-compact').locator('> thead > tr'))).height, touch, 0.1);
    near((await box(table(page, 'sortable').locator('> thead > tr'))).height, touch, 0.1);
    // Drawn so: the label is still on the cell's last line.
    const th = await box(cell(page, 'sortable-compact', 'thead', 1, 1));
    near(th.y + th.height - (await labelBox(control(page, 'sortable-compact', 1))).bottom, (await resolveToken(page, T('cell-padding-block-compact'))), 1.1);
  });

  test('TBL-41: a sortable column’s header cell is a column header that carries the order — ascending, descending or none — and holds a button named by the column’s header; the mark is hidden from assistive technology; a table that sorts nothing has no order; the table announces no order', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable', 'basic') });
    expect(await table(page, 'sortable').evaluate((el) => [...el.tHead!.rows[0].cells].map((c) => [c.localName, c.getAttribute('scope'), c.getAttribute('aria-sort')]))).toEqual([['th', 'col', 'ascending'], ['th', 'col', 'none'], ['th', 'col', 'none']]);
    for (const [column, name] of [[1, 'Name'], [2, 'Stock'], [3, 'Price']] as const) {
      await expect(cell(page, 'sortable', 'thead', 1, column).getByRole('button', { name, exact: true })).toHaveCount(1);
      await expect(stage(page, 'sortable').getByRole('columnheader', { name, exact: true })).toHaveCount(1);
    }
    expect(await host(page, 'basic').evaluate((el) => el.querySelectorAll('[aria-sort]').length)).toBe(0);
    // Nothing in the table is a live region, and no word is written: the header cell's state says the order.
    expect(await host(page, 'sortable').evaluate((el) => [el, ...el.querySelectorAll('*')].filter((part) => part.hasAttribute('aria-live') || ['status', 'alert', 'log'].includes(part.getAttribute('role') ?? '')).length)).toBe(0);
    expect(await host(page, 'sortable').evaluate((el) => (el as HTMLElement).innerText)).not.toMatch(/sorted|swap_vert|arrow_/);
    if (browserName !== 'chromium') return;
    // As the browser computed it: three column headers, each holding one button of the same name and nothing else that is named.
    const tree = await axTree(page);
    const headers = tree.filter((node) => node.role === 'columnheader' && ['Name', 'Stock', 'Price'].includes(node.name));
    expect(headers.map((node) => node.name)).toEqual(['Name', 'Stock', 'Price']);
    for (const header of headers) {
      const inside = tree.filter((node) => node.parent === header.id);
      expect(inside.map((node) => [node.role, node.name])).toEqual([['button', header.name]]);
    }
    expect(tree.filter((node) => /swap_vert|arrow_upward|arrow_downward/.test(node.name))).toEqual([]);
  });
});

test.describe('no rows, and the status line', () => {
  test('TBL-48: with no body row and something in the empty slot, its content is drawn under the header row and before any footer row — as wide as the box, in view while the columns scroll, with empty.padding-block above and below and a cell’s inline padding, no line, stripe or fill through it — as one row of one cell that spans every column; with nothing in the slot nothing is drawn between header and footer; with a body row it is not drawn', async ({ page, browserName }) => {
    const NINE = NUMBERS.map((h) => `<th scope="col" data-wrap="false">${h} of the year</th>`).join('');
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...some('empty', 'header-alone', 'rtl-empty'),
        raw('wide-empty', { striped: true }, `<table><caption>Wide and empty</caption><thead><tr>${NINE}</tr></thead><tbody><tr data-part="empty"><td colspan="2"><div id="none">Nothing matches these filters, however wide the table is.</div></td></tr></tbody><tfoot><tr>${NUMBERS.map(() => '<td>0</td>').join('')}</tr></tfoot></table>`),
        raw('both', { label: 'Rows and an empty row' }, '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr><tr data-part="empty"><td><div>Nothing</div></td></tr></tbody></table>'),
      ],
    });
    const row = table(page, 'empty').locator('> tbody > tr');
    await expect(row).toHaveCount(1);
    const only = row.locator('> td');
    await expect(only).toHaveCount(1);
    expect(await only.evaluate((el: HTMLTableCellElement) => el.colSpan)).toBe(3);
    await expect(only).toHaveText('No products match these filters.');
    // Under the header row and its line, as wide as the box, with its room.
    const head = await box(table(page, 'empty').locator('> thead > tr'));
    const at = await box(only);
    near(at.y, head.y + head.height, 0.1);
    near(at.width, (await box(host(page, 'empty'))).width, 0.1);
    const room = await resolveToken(page, T('empty-padding-block'));
    expect(await px(only, 'padding-top')).toBe(room);
    expect(await px(only, 'padding-bottom')).toBe(room);
    expect(await px(only, 'padding-left')).toBe(await resolveToken(page, T('cell-padding-inline-regular')));
    expect(await px(only, 'border-bottom-width')).toBe(0);
    expect(await css(only, 'background-image')).toBe('none');
    expect(await css(only, 'background-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    // One row of one cell, with no word, glyph or role of the table's, and nothing live.
    await expect(stage(page, 'empty').getByRole('row')).toHaveCount(2);
    expect(await row.evaluate((el) => [el.getAttribute('role'), el.querySelectorAll('[role], [aria-live]').length, getComputedStyle(el.cells[0], '::before').content, getComputedStyle(el.cells[0], '::after').content])).toEqual([null, 0, 'none', 'none']);
    // Nothing in the slot: the header alone.
    expect(await table(page, 'header-alone').evaluate((el) => el.tBodies[0].rows.length)).toBe(0);
    near((await box(table(page, 'header-alone'))).height, (await box(table(page, 'header-alone').locator('> thead > tr'))).height, 0.1);
    // A table wider than its box: the element puts the colspan right, the content is as wide as the box at most and
    // stays in view sideways; the footer rows follow it, and no stripe is drawn through it.
    await size(page, 'wide-empty', { width: 480 });
    await frame(page);
    const wideCell = table(page, 'wide-empty').locator('> tbody > tr > td');
    expect(await wideCell.evaluate((el: HTMLTableCellElement) => el.colSpan)).toBe(9);
    expect(await css(wideCell, 'background-image')).toBe('none');
    const boxAt = await box(host(page, 'wide-empty'));
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    expect((await box(page.locator('#none'))).width).toBeLessThanOrEqual(boxAt.width - pad * 2 + 0.1);
    await host(page, 'wide-empty').evaluate((el) => (el.scrollLeft = 300));
    await frame(page);
    near((await box(page.locator('#none'))).x, boxAt.x + pad, 0.6);
    expect((await box(table(page, 'wide-empty').locator('> tfoot > tr'))).y).toBeGreaterThanOrEqual((await box(wideCell)).y + (await box(wideCell)).height - 0.1);
    // Right to left: the content begins at the right.
    const rtl = await box(table(page, 'rtl-empty').locator('> tbody > tr > td > div'));
    const rtlBox = await box(host(page, 'rtl-empty'));
    near(rtl.x + rtl.width, rtlBox.x + rtlBox.width - pad, 0.6);
    // While the table has a body row the empty content is not drawn.
    expect(await css(table(page, 'both').locator('> tbody > tr').nth(1), 'display')).toBe('none');
    await expect(stage(page, 'both').getByRole('row')).toHaveCount(2);
    if (browserName !== 'chromium') return;
    const tree = await axTree(page);
    const tableNode = tree.find((node) => node.role === 'table' && node.name === named(fixture('empty')))!;
    const rows = tree.filter((node) => node.role === 'row' && tree.some((group) => group.id === node.parent && (group.id === tableNode.id || group.parent === tableNode.id)));
    expect(rows).toHaveLength(2);
    expect(rows.map((each) => tree.filter((node) => node.parent === each.id).map((node) => node.role).join(' ')).sort()).toEqual(['cell', 'columnheader columnheader columnheader']);
  });

  test('TBL-51: the status line is drawn under the last row — the status text at the start edge in its text style and color, the pagination at the end, centred on its height, with status.padding-block above and below and a cell’s inline padding — as wide as the box and in place while the columns scroll; one line above it while separation is divider; the two stacked where they do not fit; at the bottom of a box that scrolls its rows, opaque, with its line whatever the separation; and no line or room without either', async ({ page }) => {
    const data = fixture('status-pagination');
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...some('status', 'status-pagination', 'status-long', 'basic'),
        { ...data, id: 'gap', props: { caption: 'Gap', separation: 'gap', status: '1–4 of 132' } },
        { ...fixture('wide'), id: 'wide-status', props: { caption: 'Wide with a status', status: '6 regions' }, slots: { pagination: 'Page 1 of 2' } },
        raw('alone', { label: 'Pagination alone' }, '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><div data-part="status"><span id="next">Page 1 of 2</span></div>'),
        raw('nothing', { label: 'An empty status' }, '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><div data-part="status"><p role="status"></p></div>'),
      ],
    });
    const line = statusLine(page, 'status-pagination');
    const text = line.locator('> [role="status"]');
    const next = line.locator('> span');
    const at = await box(line);
    const outer = await box(host(page, 'status-pagination'));
    const last = await box(table(page, 'status-pagination').locator('> tbody > tr').last());
    // Under the last row, as wide as the box.
    near(at.y, last.y + last.height, 0.1);
    near(at.width, outer.width, 0.1);
    near(at.x, outer.x, 0.1);
    near(at.y + at.height, outer.y + outer.height, 0.1);
    // Its text style and color, its paddings (the line above takes its width from the padding).
    const lineWidth = await resolveToken(page, T('divider-thickness'));
    const padBlock = await resolveToken(page, T('status-padding-block'));
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    expect(await css(text, 'font-size')).toBe(`${await resolveToken(page, T('status-text-typescale-font-size'))}px`);
    sameColor(await css(text, 'color'), await resolveColor(page, T('status-text-color')));
    expect(await px(line, 'border-top-width')).toBe(lineWidth);
    sameColor(await css(line, 'border-top-color'), await resolveColor(page, T('divider-color')));
    expect((await px(line, 'padding-top')) + lineWidth).toBe(padBlock);
    expect(await px(line, 'padding-bottom')).toBe(padBlock);
    expect(await px(line, 'padding-left')).toBe(pad);
    // The text at the start edge, the pagination at the end, both centred on the line's height.
    near((await box(text)).x, at.x + pad, 0.1);
    near((await box(next)).x + (await box(next)).width, at.x + at.width - pad, 0.1);
    const middle = (b: { y: number; height: number }) => b.y + b.height / 2;
    near(middle(await box(text)), middle(await box(next)), 0.6);
    expect((await box(next)).x - ((await box(text)).x + (await box(text)).width)).toBeGreaterThanOrEqual(await resolveToken(page, T('status-gap')));
    // A status alone, and a pagination alone, which is at the end edge.
    near((await box(statusLine(page, 'status').locator('> [role="status"]'))).x, (await box(host(page, 'status'))).x + pad, 0.1);
    const aloneBox = await box(host(page, 'alone'));
    near((await box(page.locator('#next'))).x + (await box(page.locator('#next'))).width, aloneBox.x + aloneBox.width - pad, 0.1);
    // Too long for one line: the text above the pagination, the gap apart, each at the start edge, the text whole.
    const long = statusLine(page, 'status-long');
    const longText = await box(long.locator('> [role="status"]'));
    const longNext = await box(long.locator('> span'));
    near(longNext.y, longText.y + longText.height + (await resolveToken(page, T('status-gap'))), 0.6);
    near(longNext.x, longText.x, 0.1);
    expect(longText.height).toBeGreaterThan((await box(text)).height * 1.5);
    expect(await long.locator('> [role="status"]').evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow === 'clip' && getComputedStyle(el).overflow === 'visible')).toBe(true);
    // While separation is gap there is no line above it — until a row is under it.
    expect(await px(statusLine(page, 'gap'), 'border-top-width')).toBe(0);
    near((await box(statusLine(page, 'gap'))).height, at.height, 0.1);
    // In place while the columns scroll sideways.
    const wide = statusLine(page, 'wide-status');
    const wideBox = await box(host(page, 'wide-status'));
    expect((await scroll(host(page, 'wide-status'))).width).toBeGreaterThan(wideBox.width);
    near((await box(wide)).width, wideBox.width, 0.1);
    await host(page, 'wide-status').evaluate((el) => (el.scrollLeft = 200));
    await frame(page);
    near((await box(wide)).x, wideBox.x, 0.1);
    expect((await box(cell(page, 'wide-status', 'tbody', 1, 1))).x).toBeLessThan(wideBox.x - 100);
    // The lines that say there is more are the table's, not the status line's.
    await expect(host(page, 'wide-status')).toHaveAttribute('data-more-start', '');
    // At the bottom of a box that scrolls its rows, opaque, with its line whatever the separation while a row is under it.
    for (const id of ['status-pagination', 'gap']) {
      await size(page, id, { height: 150 });
      await frame(page);
      const limited = await box(host(page, id));
      near((await box(statusLine(page, id))).y + (await box(statusLine(page, id))).height, limited.y + limited.height, 0.1);
      await expect(host(page, id)).toHaveAttribute('data-more-below', '');
      expect(await px(statusLine(page, id), 'border-top-width')).toBe(lineWidth);
      sameColor(await css(statusLine(page, id), 'background-color'), await resolveColor(page, T('sticky-container-color')));
      expect(channels(await css(statusLine(page, id), 'background-color'))[3]).toBe(1);
      // A row is under it: the point just inside the line is the line's, not a cell's.
      await statusLine(page, id).scrollIntoViewIfNeeded();
      const inside = await box(statusLine(page, id));
      expect(await page.evaluate(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit?.closest('[data-part="status"]') ? 'status' : `${hit?.localName} ${hit?.parentElement?.localName}`; }, [inside.x + 40, inside.y + inside.height / 2] as const), id).toBe('status');
      await host(page, id).evaluate((el) => (el.scrollTop = el.scrollHeight));
      await expect(host(page, id)).not.toHaveAttribute('data-more-below', '');
      near((await box(statusLine(page, id))).y + (await box(statusLine(page, id))).height, (await box(host(page, id))).y + limited.height, 0.1);
    }
    expect(await px(statusLine(page, 'gap'), 'border-top-width')).toBe(0);
    // No status text and no pagination: no line and no room; a table without the part has none.
    expect((await box(statusLine(page, 'nothing'))).height).toBe(0);
    near((await box(host(page, 'nothing'))).height, (await box(table(page, 'nothing'))).height, 0.1);
    await expect(statusLine(page, 'basic')).toHaveCount(0);
  });

  test('TBL-52: the status text is a status that is told politely when it changes and not when it is first drawn, without moving focus; the status property writes it and the table writes no word of its own; the pagination is placed and nothing else — not styled, given no key and not listened to', async ({ page, browserName }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...some('status', 'status-pagination'),
        raw('by-property', { caption: 'By the property', status: '4 products' }, '<table><thead><tr><th scope="col" aria-sort="none"><button type="button">Name</button></th></tr></thead><tbody><tr><td>Kettle</td></tr></tbody></table>'),
        raw('later', { label: 'Later' }, '<table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>Kettle</td></tr></tbody></table>'),
      ],
    });
    // The markup the README writes: the product's own paragraph, a status.
    const written = statusLine(page, 'status').locator('> p');
    await expect(written).toHaveAttribute('role', 'status');
    await expect(written).toHaveText('4 products');
    expect(await written.evaluate((el) => [el.getAttribute('aria-live'), el.getAttribute('aria-atomic')])).toEqual([null, null]);
    // The property writes the same thing, once, after the table.
    const own = statusLine(page, 'by-property');
    await expect(own).toHaveCount(1);
    expect(await host(page, 'by-property').evaluate((el) => el.lastElementChild?.getAttribute('data-part'))).toBe('status');
    await expect(own.locator('> p[role="status"]')).toHaveText('4 products');
    // A change: the same status, its text replaced — which is what is told — and focus where it was.
    await tabTo(page, control(page, 'by-property', 1));
    const node = await own.locator('> p').elementHandle();
    await host(page, 'by-property').evaluate((el) => ((el as unknown as { status: string }).status = '1 product matches'));
    await expect(own.locator('> p')).toHaveText('1 product matches');
    expect(await own.locator('> p').evaluate((el, was) => el === was, node)).toBe(true);
    await expect(control(page, 'by-property', 1)).toBeFocused();
    await expect(statusLine(page, 'by-property')).toHaveCount(1);
    // Emptied: the status stays, with no text and no room, so that the next text is told.
    await host(page, 'by-property').evaluate((el) => ((el as unknown as { status: string }).status = ''));
    await expect(own.locator('> p[role="status"]')).toHaveText('');
    expect((await box(own)).height).toBe(0);
    // Given later, to a table that had none.
    await host(page, 'later').evaluate((el) => el.setAttribute('status', 'Loaded'));
    await expect(statusLine(page, 'later').locator('> p[role="status"]')).toHaveText('Loaded');
    // The product's own paragraph is the one that is read: the property does not write over it.
    await host(page, 'status').evaluate((el) => ((el as unknown as { status: string }).status = 'Ignored'));
    await frame(page);
    await expect(statusLine(page, 'status').locator('> [role="status"]')).toHaveCount(1);
    await expect(written).toHaveText('4 products');
    // The table writes no word: what the line says is what the fixture gave.
    expect(await statusLine(page, 'status-pagination').evaluate((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim())).toBe('1–4 of 132 Page 1 of 33');
    // The pagination is placed, and nothing else: no attribute, no style of the table's on what it holds, no event.
    const next = statusLine(page, 'status-pagination').locator('> span');
    expect(await next.evaluate((el) => el.getAttributeNames())).toEqual([]);
    expect(await css(next, 'position')).toBe('static');
    expect(await css(next, 'margin-left')).toBe('0px');
    await hearSorts(page);
    await next.click();
    expect(await sorts(page)).toEqual([]);
    if (browserName !== 'chromium') return;
    const tree = await axTree(page);
    const status = tree.filter((entry) => entry.role === 'status');
    expect(status.map((entry) => entry.live)).toEqual(status.map(() => 'polite'));
    expect(status.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe('the data features in other conditions', () => {
  test('TBL-53: in a right-to-left layout a sort mark is after its label on the left, and before it — on the right — in an end-aligned column; the status text is at the right of the status line and the pagination at the left; the marks are not mirrored; the status text is text of its own direction', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('rtl-sortable-selection', 'rtl-empty') });
    const id = 'rtl-sortable-selection';
    const columns = fixture(id).items!.filter((item) => item.kind === 'column');
    expect(columns.map((column) => column.props.align ?? 'start')).toEqual(['start', 'end', 'end']);
    const size = await resolveToken(page, T('header-icon-size'));
    const gap = await resolveToken(page, T('header-gap'));
    // (The fixture's rows can be chosen: its first column of data is the second cell, after the selection column.)
    // Start-aligned: the label at the right of the button, the mark's room at its left.
    const first = control(page, id, 2);
    near((await labelBox(first)).right, (await box(first)).x + (await box(first)).width, 0.6);
    near((await labelBox(first)).left - (await box(first)).x, gap + size, 0.6);
    // The selection column begins at the right edge, and the first column where it ends.
    near((await box(cell(page, id, 'thead', 1, 1))).x + (await box(cell(page, id, 'thead', 1, 1))).width, (await box(host(page, id))).x + (await box(host(page, id))).width, 0.1);
    near((await box(cell(page, id, 'thead', 1, 2))).x + (await box(cell(page, id, 'thead', 1, 2))).width, (await box(cell(page, id, 'thead', 1, 1))).x, 0.1);
    // End-aligned: the label ends at the left, where its numbers end, and the mark is at its right.
    for (const column of [3, 4]) {
      const button = control(page, id, column);
      near((await labelBox(button)).left, (await box(button)).x, 0.6);
      near((await box(button)).x + (await box(button)).width - (await labelBox(button)).right, gap + size, 0.6);
      expect(await pseudo(button, 'transform', '::after')).toBe('none');
      expect(await pseudo(button, 'direction', '::after')).toBe('ltr');
    }
    // The status text at the right, the pagination at the left.
    const line = await box(statusLine(page, id));
    const pad = await resolveToken(page, T('cell-padding-inline-regular'));
    const text = statusLine(page, id).locator('> [role="status"]');
    near((await box(text)).x + (await box(text)).width, line.x + line.width - pad, 0.1);
    near((await box(statusLine(page, id).locator('> span'))).x, line.x + pad, 0.1);
    expect(await css(text, 'unicode-bidi')).toBe('plaintext');
    // A status written left to right in a right-to-left table is still laid out as its own text, at the right.
    await text.evaluate((el) => (el.textContent = '1 of 3 selected.'));
    near((await box(text)).x + (await box(text)).width, line.x + line.width - pad, 0.1);
    expect(await text.evaluate((el) => { const range = document.createRange(); range.setStart(el.firstChild!, 15); range.setEnd(el.firstChild!, 16); const dot = range.getBoundingClientRect(); const all = el.getBoundingClientRect(); return dot.right > all.right - 2; })).toBe(true);
  });

  test('TBL-54: in forced colors a sort button’s label and mark are the button’s text color and its focus indicator the highlight, the sorted column is told by its glyph alone, and the line above a status line is the text color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable'), { ...fixture('status'), id: 'kept', props: { caption: 'Kept', separation: 'gap', status: '4 products' } }] });
    await still(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const system = (keyword: string) =>
      page.evaluate((k) => {
        const probe = document.createElement('div');
        probe.style.color = k;
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, keyword);
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const buttonText = await system('ButtonText');
    for (const column of [1, 2]) {
      expect(await css(control(page, 'sortable', column), 'color')).toBe(buttonText);
      expect(await pseudo(control(page, 'sortable', column), 'color', '::after')).toBe(buttonText);
    }
    // The sorted column and the others differ by their glyphs, and by no color.
    expect(await pseudo(control(page, 'sortable', 1), 'content', '::after')).not.toBe(await pseudo(control(page, 'sortable', 2), 'content', '::after'));
    await tabTo(page, control(page, 'sortable', 2));
    expect(await pseudo(control(page, 'sortable', 2), 'outline-color', '::before')).toBe(await system('Highlight'));
    expect(await pseudo(control(page, 'sortable', 2), 'outline-style', '::before')).toBe('solid');
    // No border that is not a line is painted.
    expect(await pseudo(control(page, 'sortable', 2), 'border-top-width', '::before')).toBe('0px');
    // The line above a status line kept in view.
    await size(page, 'kept', { height: 120 });
    await expect(host(page, 'kept')).toHaveAttribute('data-more-below', '');
    expect(await css(statusLine(page, 'kept'), 'border-top-color')).toBe(await system('CanvasText'));
    expect(await px(statusLine(page, 'kept'), 'border-top-width')).toBeGreaterThan(0);
  });

  test('TBL-55: at 200 % text and a 320 wide window a sort button’s label and its mark’s box grow, the label wraps inside its column with the mark on its last line, the status text grows and wraps and the status line is laid out in two lines; nothing is cut and only the table’s own box scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable-long-headers', 'status-pagination', 'status-long') });
    const id = 'sortable-long-headers';
    const normal = { label: await px(control(page, id, 1), 'font-size'), mark: Number.parseFloat(await pseudo(control(page, id, 1), 'width', '::after')), status: await px(statusLine(page, 'status-pagination').locator('> [role="status"]'), 'font-size') };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    expect(await px(control(page, id, 1), 'font-size')).toBe(normal.label * 2);
    expect(Number.parseFloat(await pseudo(control(page, id, 1), 'width', '::after'))).toBe(normal.mark * 2);
    expect(await px(statusLine(page, 'status-pagination').locator('> [role="status"]'), 'font-size')).toBe(normal.status * 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    for (const column of [1, 2, 3]) {
      const button = control(page, id, column);
      const th = await box(cell(page, id, 'thead', 1, column));
      const label = await labelBox(button);
      const line = await px(button, 'line-height');
      // The label wraps and is whole inside its cell.
      expect(label.bottom - label.top).toBeGreaterThan(line * 1.5);
      expect(label.left).toBeGreaterThanOrEqual(th.x - 0.5);
      expect(label.right).toBeLessThanOrEqual(th.x + th.width + 0.5);
      expect(await button.evaluate((el) => getComputedStyle(el).overflow === 'visible' && getComputedStyle(el).textOverflow === 'clip')).toBe(true);
      // The mark is on the label's last line: the button ends where the label does, and the mark's box is in its last line.
      near((await box(button)).y + (await box(button)).height, label.bottom, line * 0.2);
      expect(await css(button, 'align-items')).toBe('end');
    }
    // The status line: the text above the pagination, whole.
    for (const status of ['status-pagination', 'status-long']) {
      const text = await box(statusLine(page, status).locator('> [role="status"]'));
      const next = await box(statusLine(page, status).locator('> span'));
      expect(next.y).toBeGreaterThanOrEqual(text.y + text.height);
      near(next.x, text.x, 0.6);
      const outer = await box(host(page, status));
      expect(text.x + text.width).toBeLessThanOrEqual(outer.x + outer.width + 0.5);
      near((await box(statusLine(page, status))).width, outer.width, 0.1);
    }
  });

  test('TBL-56: while the icon set cannot draw a sort mark nothing is drawn in its box — never the glyph’s name — the box is kept, the button works all the same, and the glyph is drawn once the set can', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('sortable') });
    const button = control(page, 'sortable', 2);
    expect(await pseudo(button, 'visibility', '::after')).toBe('visible');
    const width = (await box(cell(page, 'sortable', 'thead', 1, 2))).width;
    const family = await withoutIconFont(page);
    await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
    await expect(host(page, 'sortable')).toHaveAttribute('data-glyphs', 'pending');
    expect(await pseudo(button, 'visibility', '::after')).toBe('hidden');
    expect(Number.parseFloat(await pseudo(button, 'width', '::after'))).toBe(await resolveToken(page, T('header-icon-size')));
    expect(await pseudo(button, 'overflow', '::after')).toBe('hidden');
    near((await box(cell(page, 'sortable', 'thead', 1, 2))).width, width, 0.1);
    await hearSorts(page);
    await button.click();
    expect(await sorts(page)).toHaveLength(1);
    await iconFaceArrives(page, family);
    await expect(host(page, 'sortable')).not.toHaveAttribute('data-glyphs');
    expect(await pseudo(button, 'visibility', '::after')).toBe('visible');
    // The box the name was measured in is gone, and the table is as it was.
    expect(await host(page, 'sortable').evaluate((el) => el.querySelectorAll(':scope > [data-tanrei-glyph-probe]').length)).toBe(0);
  });

  test('TBL-57: with scripting off the fixtures sortable, empty and status-pagination are drawn as with it — the sort buttons and the marks of the order their header cells name, hover, focus and a press held for press-hold, the empty content, the status line at the bottom of a box that scrolls — a sort control that is an anchor works, and nothing is hidden that script would reveal', async ({ page: off }) => {
    test.setTimeout(90_000);
    // The document without the package's script: the element is never defined, and the stylesheet draws alone.
    const ids = ['sortable', 'sorted-end', 'sortable-compact', 'sortable-long-headers', 'empty', 'status', 'status-pagination', 'status-long', 'rtl-empty'];
    const linked = raw('linked', { label: 'Linked' }, '<table><thead><tr><th scope="col" aria-sort="none"><a href="#by-stock">Stock</a></th></tr></thead><tbody><tr><td>15</td></tr></tbody></table>');
    const kept: Fixture = { ...fixture('status-pagination'), id: 'short', props: { caption: 'Short', status: '1–4 of 132' } };
    const document = await fixturesDocument(spec, { icons: true, fixtures: [...some(...ids), linked, kept] });
    const script = document.lastIndexOf('<script type="module">');
    const html = `${document.slice(0, script)}<style>[data-fixture="short"] tanrei-table { max-block-size: 150px; } tanrei-table th > :is(button, a)::before { transition: none !important; }</style></body></html>`;
    await off.setContent(html);
    expect(await off.locator('tanrei-table').first().evaluate((el) => el.matches(':defined'))).toBe(false);
    // The same document with the script: every box of every part is where the stylesheet alone drew it.
    const on = await off.context().newPage();
    await on.setContent(`${html.replace('</body></html>', '')}${document.slice(script)}`);
    await on.waitForFunction(() => !!customElements.get('tanrei-table') && [...document.querySelectorAll('tanrei-table')].every((el) => el.hasAttribute('data-columns')));
    const geometry = (p: P) =>
      p.evaluate(async () => {
        await document.fonts.ready;
        return [...document.querySelectorAll('.stage')].map((s) => [
          (s as HTMLElement).dataset.fixture,
          ...[...s.querySelectorAll('tanrei-table, table, caption, tr, th, td, th > button, th > a, [data-part="status"], [data-part="status"] > *')].map((part) => {
            const r = part.getBoundingClientRect();
            const before = part.matches('th > button, th > a') ? getComputedStyle(part, '::before') : null;
            const after = part.matches('th > button, th > a') ? getComputedStyle(part, '::after') : null;
            return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ') + (before && after ? ` | ${before.width} ${before.height} ${after.content} ${after.width} ${after.color} ${getComputedStyle(part).color}` : '');
          }),
        ]);
      });
    expect(await geometry(off)).toEqual(await geometry(on));
    // The marks of the order the header cells name.
    const button = (id: string, column: number) => off.locator(`[data-fixture="${id}"] thead th`).nth(column - 1).locator('> button, > a');
    expect((await pseudo(button('sortable', 1), 'content', '::after')).replace(/\s*\/.*$/, '')).toBe('"arrow_upward"');
    expect((await pseudo(button('sortable', 2), 'content', '::after')).replace(/\s*\/.*$/, '')).toBe('"swap_vert"');
    expect((await pseudo(button('sorted-end', 3), 'content', '::after')).replace(/\s*\/.*$/, '')).toBe('"arrow_downward"');
    // Hover and keyboard focus are drawn.
    const rest = await pseudo(button('sortable', 2), 'background-color', '::before');
    await button('sortable', 2).hover();
    await expect.poll(() => pseudo(button('sortable', 2), 'background-color', '::before')).not.toBe(rest);
    await off.mouse.move(0, 0);
    await tabTo(off, button('sortable', 2));
    expect(await pseudo(button('sortable', 2), 'outline-style', '::before')).toBe('solid');
    // A press: the overlay at once, kept for press-hold after the pointer is gone.
    // (What is drawn, not that a number is held: the pressed container in the state's place, in every frame of
    // press-hold after the release, in the box that draws the button's container.)
    await expectPressHeldAtEveryMoment(off, button('sortable', 3), { pressed: await resolveColor(off, T('sort-pressed-container-color')), pseudo: '::before', at: { x: 4, y: 4 } });
    // An anchor works as the browser makes it work.
    await button('linked', 1).click();
    await expect.poll(() => off.url()).toContain('#by-stock');
    // The empty content and the status line, the line at the bottom of a box that scrolls its rows.
    await expect(off.locator('[data-fixture="empty"] tbody td')).toBeVisible();
    const short = off.locator('[data-fixture="short"] tanrei-table');
    const outer = (await short.boundingBox())!;
    const line = (await short.locator('> [data-part="status"]').boundingBox())!;
    expect(outer.height).toBe(150);
    near(line.y + line.height, outer.y + outer.height, 0.1);
    // Nothing is hidden that script would have to reveal.
    expect(await off.evaluate(() => [...document.querySelectorAll('tanrei-table *')].filter((el) => !el.closest('.fixture-name') && (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden')).length)).toBe(0);
    await on.close();
  });
});

// ── Rows that can be chosen, and a loading body ──────────────────────────────
/** The checkbox of a row's selection cell: Tanrei's, or the browser's own. */
const check = (page: P, id: string, section: 'thead' | 'tbody' | 'tfoot', r: number) => cell(page, id, section, r, 1).locator('> tanrei-checkbox, > input');
/** The radio button of a row's selection cell under single selection (TBL-60): Tanrei's, or the browser's own. */
const radio = (page: P, id: string, r: number) => cell(page, id, 'tbody', r, 1).locator('> tanrei-radio-button, > input');
/** Which rows' radio buttons are checked, in row order. */
const radioed = (page: P, id: string) => table(page, id).evaluate((el) => [...el.querySelectorAll(':scope > tbody > tr > [data-part="selection"] > :is(tanrei-radio-button, input[type="radio"])')].filter((r) => (r as HTMLInputElement).checked).map((r) => (r.closest('tr') as HTMLElement).dataset.value));
/** What a checkbox says: checked, mixed, disabled. */
const said = (locator: Locator) => locator.evaluate((el) => { const c = el as HTMLInputElement; return [c.checked ? 'checked' : c.indeterminate ? 'mixed' : 'unchecked', c.disabled ? 'disabled' : 'enabled'].join(' '); });
/** The values of the rows drawn as chosen, in row order. */
const chosen = (page: P, id: string) => table(page, id).evaluate((el) => [...el.querySelectorAll(':scope > tbody > tr[data-selected]')].map((tr) => (tr as HTMLElement).dataset.value));
/** Every `selectionchange` of a table the page hears, with what it carries. (The browser has an event of that name, of text selections: it is no CustomEvent.) */
const hearChoices = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as { choices: unknown[]; hearing?: boolean };
    w.choices = [];
    if (w.hearing) return;
    w.hearing = true;
    document.addEventListener('selectionchange', (event) => {
      if (event instanceof CustomEvent) w.choices.push({ values: (event.detail as { values: string[] }).values, from: (event.target as Element).localName, cancelable: event.cancelable });
    });
  });
const choices = (page: P) => page.evaluate(() => (window as unknown as { choices: { values: string[]; from: string; cancelable: boolean }[] }).choices);
/** A table of the product's own native checkboxes, as a page writes it that must work without script (TBL-57). */
const NATIVE = `<table><thead><tr><td data-part="selection"><input type="checkbox"></td><th scope="col">Name</th><th scope="col" data-align="end">Stock</th></tr></thead><tbody>
  <tr data-value="kettle"><td data-part="selection"><input type="checkbox" name="row" value="kettle" aria-label="Select Kettle" checked></td><th scope="row">Kettle</th><td data-align="end">15</td></tr>
  <tr data-value="scale"><td data-part="selection"><input type="checkbox" name="row" value="scale" aria-label="Select Scale"></td><th scope="row">Scale</th><td data-align="end">0</td></tr>
  <tr data-value="paper" data-selected><td data-part="selection"><input type="checkbox" name="row" value="paper" aria-label="Select Filter paper"></td><th scope="row">Filter paper</th><td data-align="end">120</td></tr>
  <tr><td data-part="selection"></td><th scope="row">Discontinued</th><td data-align="end">0</td></tr>
  </tbody></table>`;
const native = (id: string, props: Fixture['props'] = {}) => raw(id, { label: id, selection: 'multiple', selectAllLabel: 'Select all products', ...props }, NATIVE);
const settled = (page: P, id: string) => host(page, id).evaluate(async (el) => { await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete; await Promise.all([...el.querySelectorAll('tanrei-checkbox, tanrei-radio-button')].map((c) => (c as unknown as { updateComplete: Promise<unknown> }).updateComplete)); });
/** TBL-58, TBL-59: rows whose cells hold what answers a press itself, a row of text, rows that cannot be chosen, a table in a cell. */
const PRESSED = `<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th><th scope="col">Note</th></tr></thead><tbody>
  <tr data-value="a"><td data-part="selection"><tanrei-checkbox label-hidden label="A"></tanrei-checkbox></td><th scope="row">Kettle</th><td>Pour <a href="#notes" class="p-link">notes</a> <button type="button" class="p-button">Edit</button> <input class="p-field" aria-label="Note" value="slow"> <label class="p-label"><input type="radio" name="pressed-radio"> Pick</label> <span class="p-own" style="cursor: pointer">open</span> <tanrei-button variant="text">Do</tanrei-button></td></tr>
  <tr data-value="b"><td data-part="selection"><tanrei-checkbox label-hidden label="B"></tanrei-checkbox></td><th scope="row">Scale</th><td>Weighs to the tenth of a gram</td></tr>
  <tr><td data-part="selection"></td><th scope="row">Discontinued</th><td>No value, so no checkbox</td></tr>
  <tr data-placeholder data-value="p"><td data-part="selection"></td><td></td><td></td></tr>
  <tr data-value="n"><td data-part="selection"><tanrei-checkbox label-hidden label="N"></tanrei-checkbox></td><th scope="row">Nested</th><td><table><tbody><tr><td>inner</td></tr></tbody></table></td></tr>
  </tbody><tfoot><tr data-value="f"><td data-part="selection"></td><th scope="row">Total</th><td>2</td></tr></tfoot></table>`;
/** The color of each layer of an element's background image, the top one first. */
const layers = (locator: Locator) => locator.evaluate((el) => [...getComputedStyle(el).backgroundImage.matchAll(/linear-gradient\((rgba?\([^)]*\)|color\([^)]*\)|transparent)/g)].map((m) => m[1]));

test.describe('rows that can be chosen', () => {
  test('TBL-42: while selection is multiple a selection column stands before the first column — the checkbox for every row in the header row, a row’s own in each body row that has a value, an empty cell in a row without one and in a footer row — as wide as the checkbox and a cell’s paddings, the checkbox on the cell’s first line and the row no taller for it; it is no column of data', async ({ page }) => {
    const plain = raw('plain-cells', { label: 'Plain cells', selection: 'multiple', rowHeaders: true, selectAllLabel: 'All' }, '<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th><th scope="col">Stock</th></tr></thead><tbody><tr data-value="a"><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><td>Kettle</td><td>15</td></tr><tr><td data-part="selection"><tanrei-checkbox label-hidden label="Stray"></tanrei-checkbox></td><td>Scale</td><td>0</td></tr></tbody></table>');
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('selection', 'selection-compact', 'sortable-selection', 'totals', 'compact'), plain] });
    await settled(page, 'selection');
    const f = fixture('selection');
    const columns = f.items!.filter((item) => item.kind === 'column').length;
    // One cell more than the columns of data in every row, and the first is the selection cell: a cell, not a header.
    expect(await table(page, 'selection').evaluate((el) => [...el.rows].map((tr) => [tr.cells.length, tr.cells[0].localName, tr.cells[0].dataset.part].join(' ')))).toEqual(Array(6).fill(`${columns + 1} td selection`));
    // The header row's holds the checkbox for every row, a body row's its own, the footer row's nothing.
    await expect(check(page, 'selection', 'thead', 1)).toHaveCount(1);
    for (const r of [1, 2, 3, 4]) await expect(check(page, 'selection', 'tbody', r)).toBeVisible();
    expect(await cell(page, 'selection', 'tfoot', 1, 1).evaluate((el) => el.childNodes.length)).toBe(0);
    // No label is drawn: the checkbox is as wide as its container. The checkbox's box — not its round container —
    // stands at the cell's padding, where the text of the other cells starts: the selection cell's paddings are a
    // cell's less half of what the container exceeds the box by, and the column is as wide as the container and them.
    const [ring, square] = [await resolveToken(page, '--tanrei-comp-checkbox-container-size'), await resolveToken(page, '--tanrei-comp-checkbox-box-size')];
    for (const [id, density] of [['selection', 'regular'], ['selection-compact', 'compact']] as const) {
      const pad = await resolveToken(page, T(`cell-padding-inline-${density}`));
      const inset = Math.max(0, pad - (ring - square) / 2);
      const one = await box(check(page, id, 'tbody', 1));
      near(one.width, ring, 0.1);
      for (const section of ['thead', 'tbody'] as const) {
        const at = await box(cell(page, id, section, 1, 1));
        near(at.width, one.width + 2 * inset, 0.1);
        near((await box(check(page, id, section, 1))).x, at.x + inset, 0.1);
        // The box's start edge is at the cell's padding, as the text of the next column's cells is at theirs.
        const square0 = await check(page, id, section, 1).evaluate((el) => el.shadowRoot!.querySelector('.box')!.getBoundingClientRect().left);
        near(square0, at.x + pad, 0.6);
      }
      // The verify: under the default system the column is 18 + 2 × 16 = 50 wide at the regular density.
      if (density === 'regular') near((await box(cell(page, id, 'tbody', 1, 1))).width, 50, 0.1);
      await expect(check(page, id, 'tbody', 1)).toHaveAttribute('label-hidden', '');
    }
    // On the cell's first line: centred on the line the row's text stands on, and the row is as tall as one without it.
    for (const [id, same] of [['selection', 'totals'], ['selection-compact', 'compact']] as const) {
      const drawn = await check(page, id, 'tbody', 1).evaluate((el) => { const r = el.shadowRoot!.querySelector('.box')!.getBoundingClientRect(); return (r.top + r.bottom) / 2; });
      const text = await textBox(cell(page, id, 'tbody', 1, 2));
      near(drawn, (text.top + text.bottom) / 2, 0.6);
      near((await box(table(page, id).locator('> tbody > tr').first())).height, (await box(table(page, same).locator('> tbody > tr').first())).height, 0.1);
    }
    // TBL-6: the first column is the first column of data — the row header is the cell after the selection cell.
    expect(await cell(page, 'selection', 'tbody', 1, 2).evaluate((el) => [el.localName, el.getAttribute('scope')])).toEqual(['th', 'row']);
    await expect(cell(page, 'plain-cells', 'tbody', 1, 2)).toHaveAttribute('role', 'rowheader');
    expect(await cell(page, 'plain-cells', 'tbody', 1, 1).getAttribute('role')).toBeNull();
    expect(Number(await css(cell(page, 'plain-cells', 'tbody', 1, 2), 'font-weight'))).toBeGreaterThan(Number(await css(cell(page, 'plain-cells', 'tbody', 1, 3), 'font-weight')));
    // A body row without a value cannot be chosen: no checkbox is drawn in it, whatever the markup holds.
    await expect(check(page, 'plain-cells', 'tbody', 2)).toBeHidden();
    await expect(check(page, 'plain-cells', 'tbody', 1)).toBeVisible();
    // A sort event's index does not count it.
    await hearSorts(page);
    await control(page, 'sortable-selection', 3).click();
    expect((await sorts(page)).map((s) => [s.column, s.index])).toEqual([['stock', 1]]);
  });

  test('TBL-42: while stickyFirstColumn is true the selection column stays in view with the first column, and the two together are released where they would take more than half of the box', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('selection-sticky-column') });
    const id = 'selection-sticky-column';
    await settled(page, id);
    await expect(host(page, id)).toHaveAttribute('data-selection-kept', '');
    const range = await scroll(host(page, id));
    expect(range.width).toBeGreaterThan(range.clientWidth);
    // The verify: scrolled to the end, the checkbox and the Region column are both at the start edge.
    await host(page, id).evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await expect(host(page, id)).toHaveAttribute('data-more-start', '');
    const outer = await box(host(page, id));
    for (const section of ['thead', 'tbody'] as const) {
      const [select, region, last] = [await box(cell(page, id, section, 2 - (section === 'thead' ? 1 : 0), 1)), await box(cell(page, id, section, 2 - (section === 'thead' ? 1 : 0), 2)), await box(cell(page, id, section, 2 - (section === 'thead' ? 1 : 0), 10))];
      near(select.x, outer.x, 0.1);
      near(region.x, select.x + select.width, 0.1);
      near(last.x + last.width, outer.x + outer.width, 1);
    }
    // The line along the inner edge is the first column's, not the selection column's; both are opaque.
    const thickness = await resolveToken(page, T('divider-thickness'));
    expect(await px(cell(page, id, 'tbody', 1, 1), 'border-right-width')).toBe(0);
    expect(await px(cell(page, id, 'tbody', 1, 2), 'border-right-width')).toBe(thickness);
    const sticky = await resolveColor(page, T('sticky-container-color'));
    for (const column of [1, 2]) sameColor(await css(cell(page, id, 'tbody', 1, column), 'background-color'), sticky);
    // A chosen row's fill lies over that color in the cells that are kept (TBL-43).
    expect(await css(cell(page, id, 'tbody', 2, 1), 'background-image')).toContain(await resolveColor(page, T('row-selected-container-color')));
    sameColor(await css(cell(page, id, 'tbody', 2, 2), 'background-color'), sticky);
    // Released together: the two take more than half of a narrow box.
    const [select, region] = [await box(cell(page, id, 'tbody', 1, 1)), await box(cell(page, id, 'tbody', 1, 2))];
    await size(page, id, { width: Math.floor((select.width + region.width) * 2 - 8) });
    await expect(host(page, id)).toHaveAttribute('data-first-column-released', '');
    expect(await host(page, id).getAttribute('data-selection-kept')).toBeNull();
    await host(page, id).evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await frame(page);
    expect((await box(cell(page, id, 'tbody', 1, 2))).x).toBeLessThan((await box(host(page, id))).x);
    expect((await box(cell(page, id, 'tbody', 1, 1))).x).toBeLessThan((await box(host(page, id))).x);
  });

  test('TBL-42: while selection is none the table draws no selection column and no checkbox, ignores every row’s selected and emits no selectionChange', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [{ ...fixture('selection'), id: 'off', props: { caption: 'Off', rowHeaders: true } }, native('none-native', { selection: 'none' }), native('unknown', { selection: 'some' })] });
    const seen = warnings(page);
    // The harness writes no selection cell for a fixture that is not multiple; the native table holds them in its markup.
    for (const id of ['none-native', 'unknown']) {
      expect(await table(page, id).evaluate((el) => [...el.querySelectorAll('[data-part="selection"]')].map((c) => getComputedStyle(c).display))).toEqual(Array(5).fill('none'));
      // A row's selected is ignored: no fill, no text color of a chosen row.
      expect(await css(cell(page, id, 'tbody', 3, 2), 'background-image')).toBe('none');
      sameColor(await css(cell(page, id, 'tbody', 3, 2), 'color'), await resolveColor(page, T('cell-text-color')));
      await hearChoices(page);
      await check(page, id, 'tbody', 2).evaluate((el) => (el as HTMLInputElement).click());
      expect(await choices(page)).toEqual([]);
      expect(await chosen(page, id)).toEqual(['paper']);
      // Nothing was written on the checkboxes either.
      expect(await check(page, id, 'thead', 1).evaluate((el) => [el.getAttribute('aria-label'), (el as HTMLInputElement).indeterminate])).toEqual([null, false]);
    }
    expect(await table(page, 'off').locator('[data-part="selection"]').count()).toBe(0);
    // A selection the table does not define is none, and a debug build says so.
    await host(page, 'unknown').evaluate((el) => ((el as unknown as { selection: string }).selection = 'several'));
    await expect.poll(() => seen.filter((m) => m.includes('TBL-42') && m.includes('"several"')).length).toBe(1);
  });

  test('TBL-43: a chosen row takes selected.container.color across its whole width, paddings and the selection cell included, in place of a stripe, and its text selected.text.color; what a cell holds keeps its own colors; the lines and the gap are as without it; the fill changes at once; a footer row and a placeholder row are never chosen', async ({ page }) => {
    const mixed = raw('held', { label: 'Held', selection: 'multiple', loading: true, selectAllLabel: 'All' }, '<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th></tr></thead><tbody><tr data-value="a" data-selected><td data-part="selection"><tanrei-checkbox label-hidden label="A"></tanrei-checkbox></td><td>Kettle <span class="own" style="color: var(--tanrei-sys-color-error)">low</span> <tanrei-tag label="New" size="small"></tanrei-tag></td></tr><tr data-value="b"><td data-part="selection"><tanrei-checkbox label-hidden label="B"></tanrei-checkbox></td><td>Scale <span class="own" style="color: var(--tanrei-sys-color-error)">low</span> <tanrei-tag label="New" size="small"></tanrei-tag></td></tr><tr data-placeholder data-selected data-value="c"><td data-part="selection"></td><td></td></tr></tbody><tfoot><tr data-selected data-value="d"><td data-part="selection"></td><td>Total</td></tr></tfoot></table>');
    await mountFixtures(page, spec, { fixtures: [...some('selection-striped', 'selection', 'separation-gap-striped'), mixed] });
    await settled(page, 'selection-striped');
    const [fill, stripe, text, plain] = [await resolveColor(page, T('row-selected-container-color')), await resolveColor(page, T('stripe-container-color')), await resolveColor(page, T('row-selected-text-color')), await resolveColor(page, T('cell-text-color'))];
    const rows = (id: string) =>
      table(page, id).evaluate((el, [f, s]) => [...el.querySelectorAll(':scope > tbody > tr, :scope > tfoot > tr')].map((tr) => { const images = [...tr.children].map((c) => getComputedStyle(c).backgroundImage); return images.every((i) => i.includes(f)) ? 'chosen' : images.every((i) => i.includes(s)) ? 'stripe' : images.every((i) => !i.includes(f) && !i.includes(s)) ? 'plain' : 'mixed'; }), [fill, stripe] as const);
    // The verify: the second row is selected and takes the selected fill, not the stripe; the fourth keeps its stripe.
    expect(await rows('selection-striped')).toEqual(['plain', 'chosen', 'plain', 'stripe']);
    expect(await rows('selection')).toEqual(['chosen', 'plain', 'chosen', 'plain', 'plain']);
    // Across the whole width: every cell's padding box, the selection cell's too, and the cells of a row touch.
    const id = 'selection-striped';
    const cells = await table(page, id).locator('> tbody > tr:nth-child(2) > *').all();
    expect(cells).toHaveLength(4);
    for (const [index, c] of cells.entries()) {
      expect(await css(c, 'background-repeat')).toMatch(/^no-repeat(, no-repeat)*$/);
      sameColor(await css(c, 'color'), text, `cell ${index}`);
      if (index) near((await box(c)).x, (await box(cells[index - 1])).x + (await box(cells[index - 1])).width, 0.1);
    }
    near((await box(cells[0])).x, (await box(host(page, id))).x, 0.1);
    near((await box(cells[3])).x + (await box(cells[3])).width, (await box(host(page, id))).x + (await box(host(page, id))).width, 0.1);
    // The gap between rows is left out of the fill, and the rows are where they are without a selection.
    const gap = await resolveToken(page, T('row-gap'));
    expect(await css(cells[1], 'background-size')).toContain(`${gap}px`);
    const heights = async () => Promise.all((await table(page, id).locator('> tbody > tr').all()).map(async (tr) => [(await box(tr)).height, await px(tr.locator('> *').nth(1), 'border-bottom-width'), await px(tr.locator('> *').nth(1), 'padding-bottom')]));
    const before = await heights();
    // At once, without a motion of the table's own.
    expect(await css(cells[1], 'transition-duration')).toBe('0s');
    await check(page, id, 'tbody', 1).click();
    expect(await rows(id)).toEqual(['chosen', 'chosen', 'plain', 'stripe']);
    sameColor(await css(cell(page, id, 'tbody', 1, 2), 'color'), text);
    expect(await heights()).toEqual(before);
    await check(page, id, 'tbody', 2).click();
    expect(await rows(id)).toEqual(['chosen', 'stripe', 'plain', 'stripe']);
    sameColor(await css(cell(page, id, 'tbody', 2, 2), 'color'), plain);
    // What a cell holds that is not plain text keeps its own colors.
    const own = (r: number) => cell(page, 'held', 'tbody', r, 2).evaluate((el) => [getComputedStyle(el.querySelector('.own')!).color, ...[...el.querySelector('tanrei-tag')!.shadowRoot!.querySelectorAll('*')].map((part) => `${getComputedStyle(part).color} ${getComputedStyle(part).backgroundColor}`)]);
    expect(await own(1)).toEqual(await own(2));
    sameColor((await own(1))[0], await resolveColor(page, '--tanrei-sys-color-error'));
    sameColor(await css(cell(page, 'held', 'tbody', 1, 2), 'color'), text);
    // A placeholder row and a footer row are never chosen, whatever they say.
    expect(await rows('held')).toEqual(['chosen', 'plain', 'plain', 'plain']);
  });

  test('TBL-44: a change of a row’s checkbox — by a press, or by Space while it has focus — sets its selected and emits selectionChange exactly once with the values of every chosen row in row order; a press on the row outside the checkbox’s cell changes it as TBL-58 says; what the product sets is drawn and not emitted; rows given again in another order are each chosen by their own selected, and nothing is carried over to a row the table is not given', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('selection'), native('native')] });
    for (const id of ['selection', 'native']) {
      await settled(page, id);
      await hearChoices(page);
      const start = id === 'selection' ? ['paper', 'kettle'] : ['kettle', 'paper'];
      const order = id === 'selection' ? ['paper', 'grinder', 'kettle', 'scale'] : ['kettle', 'scale', 'paper'];
      // First drawn by what each row says — and, for a native checkbox, by its own `checked` (TBL-57).
      expect(await chosen(page, id)).toEqual(start);
      for (const r of [1, 2, 3]) expect((await said(check(page, id, 'tbody', r))).startsWith('checked'), `${id} ${r}`).toBe(start.includes(order[r - 1]));
      expect(await choices(page)).toEqual([]);
      // A press on the second row's checkbox: chosen, one event, the values in row order.
      await check(page, id, 'tbody', 2).click();
      await expect(table(page, id).locator('> tbody > tr').nth(1)).toHaveAttribute('data-selected', '');
      const after = order.filter((value) => [...start, order[1]].includes(value));
      expect(await choices(page)).toEqual([{ values: after, from: 'tanrei-table', cancelable: false }]);
      // Space while it has focus lets the row go: one more event.
      await check(page, id, 'tbody', 2).focus();
      await page.keyboard.press('Space');
      await expect.poll(() => choices(page)).toHaveLength(2);
      expect((await choices(page))[1].values).toEqual(order.filter((value) => start.includes(value)));
      expect(await chosen(page, id)).toEqual(start);
      // A press on the row outside its checkbox's cell changes the checkbox (TBL-58), with one event each time.
      await cell(page, id, 'tbody', 2, 2).click();
      await expect.poll(() => choices(page)).toHaveLength(3);
      expect(await chosen(page, id)).toEqual(after);
      await page.mouse.move(0, 0);
      await cell(page, id, 'tbody', 2, 3).click();
      await expect.poll(() => choices(page)).toHaveLength(4);
      expect((await choices(page))[3].values).toEqual(order.filter((value) => start.includes(value)));
      expect(await chosen(page, id)).toEqual(start);
      // The product sets a row's selected: drawn, its checkbox checked, nothing emitted — and takes it back.
      await table(page, id).locator('> tbody > tr').nth(1).evaluate((el) => el.setAttribute('data-selected', ''));
      await expect.poll(() => said(check(page, id, 'tbody', 2))).toBe('checked enabled');
      await table(page, id).locator('> tbody > tr').nth(0).evaluate((el) => el.removeAttribute('data-selected'));
      await expect.poll(() => said(check(page, id, 'tbody', 1))).toBe('unchecked enabled');
      await frame(page);
      expect(await choices(page)).toHaveLength(4);
      // The rows given again in another order: each is drawn by its own selected.
      const now = await chosen(page, id);
      await table(page, id).evaluate((el) => el.tBodies[0].append(...[...el.tBodies[0].rows].reverse()));
      await frame(page);
      expect(await chosen(page, id)).toEqual([...now].reverse());
      expect(await table(page, id).evaluate((el) => [...el.tBodies[0].rows].filter((tr) => tr.dataset.value).map((tr) => (tr.cells[0].firstElementChild as HTMLInputElement).checked === tr.hasAttribute('data-selected')))).toEqual(Array(order.length).fill(true));
      // Other rows, one with the value of a row that was chosen: nothing is carried over to it.
      await table(page, id).evaluate((el, value) => {
        const fresh = [...el.tBodies[0].rows].find((tr) => tr.dataset.value)!.cloneNode(true) as HTMLTableRowElement;
        fresh.dataset.value = value;
        fresh.removeAttribute('data-selected');
        fresh.cells[0].firstElementChild!.removeAttribute('checked');
        if (fresh.cells[0].firstElementChild instanceof HTMLInputElement) fresh.cells[0].firstElementChild.checked = false;
        el.tBodies[0].replaceChildren(fresh);
      }, now[0]);
      await frame(page);
      expect(await chosen(page, id)).toEqual([]);
      expect(await said(check(page, id, 'thead', 1))).toBe('unchecked enabled');
      expect(await choices(page)).toHaveLength(4);
    }
  });

  test('TBL-44: the table’s selectionChange is a CustomEvent that carries values; the browser’s own event of that name, which a text field in a cell sends through the table, is none of the table’s and chooses nothing', async ({ page }) => {
    const field = NATIVE.replace('<td data-align="end">15</td>', '<td><input type="text" value="Kettle and scale" aria-label="Note"></td>');
    await mountFixtures(page, spec, { fixtures: [raw('field', { label: 'field', selection: 'multiple', selectAllLabel: 'All' }, field)] });
    await settled(page, 'field');
    await hearChoices(page);
    await page.evaluate(() => {
      const w = window as unknown as { plain: number };
      w.plain = 0;
      document.querySelector('tanrei-table')!.addEventListener('selectionchange', (event) => { if (!(event instanceof CustomEvent)) w.plain++; });
    });
    await table(page, 'field').locator('input[type="text"]').click();
    await page.keyboard.press('Shift+ArrowLeft');
    await table(page, 'field').locator('input[type="text"]').evaluate((el) => (el as HTMLInputElement).select());
    // The browser's event reaches the table's listeners — a product tells the two apart by the kind of event.
    await expect.poll(() => page.evaluate(() => (window as unknown as { plain: number }).plain)).toBeGreaterThan(0);
    expect(await choices(page)).toEqual([]);
    expect(await chosen(page, 'field')).toEqual(['kettle', 'paper']);
    await check(page, 'field', 'tbody', 2).click();
    expect(await choices(page)).toEqual([{ values: ['kettle', 'scale', 'paper'], from: 'tanrei-table', cancelable: false }]);
  });

  test('TBL-45: the checkbox for every row is checked while each row that has a value is chosen, mixed while some are, unchecked while none is and disabled while there is no such row; activating it while unchecked or mixed chooses every such row and while checked clears every one, with one selectionChange; rows the table was not given are not claimed', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('selection', 'selection-all', 'selection-compact', 'empty-selection', 'loading-placeholders'), native('native')] });
    for (const id of ['selection', 'selection-all', 'selection-compact', 'empty-selection', 'loading-placeholders', 'native']) await settled(page, id);
    // The verify.
    expect(await said(check(page, 'selection', 'thead', 1))).toBe('mixed enabled');
    expect(await said(check(page, 'selection-all', 'thead', 1))).toBe('checked enabled');
    expect(await said(check(page, 'selection-compact', 'thead', 1))).toBe('unchecked enabled');
    expect(await said(check(page, 'empty-selection', 'thead', 1))).toBe('unchecked disabled');
    // TBL-50: a placeholder row is no row for it.
    expect(await said(check(page, 'loading-placeholders', 'thead', 1))).toBe('unchecked disabled');
    expect(await said(check(page, 'native', 'thead', 1))).toBe('mixed enabled');
    for (const id of ['selection', 'native']) {
      const every = id === 'selection' ? ['paper', 'grinder', 'kettle', 'scale'] : ['kettle', 'scale', 'paper'];
      await hearChoices(page);
      // Mixed: every row that has a value is chosen — the row without one is not, and has no checkbox.
      await check(page, id, 'thead', 1).click();
      expect(await choices(page)).toEqual([{ values: every, from: 'tanrei-table', cancelable: false }]);
      expect(await chosen(page, id)).toEqual(every);
      expect(await said(check(page, id, 'thead', 1))).toBe('checked enabled');
      for (const r of every.keys()) expect(await said(check(page, id, 'tbody', r + 1))).toBe('checked enabled');
      // Checked: every one is cleared.
      await check(page, id, 'thead', 1).focus();
      await page.keyboard.press('Space');
      await expect.poll(() => choices(page)).toHaveLength(2);
      expect((await choices(page))[1].values).toEqual([]);
      expect(await chosen(page, id)).toEqual([]);
      expect(await said(check(page, id, 'thead', 1))).toBe('unchecked enabled');
      // Unchecked: every one is chosen; then one row let go makes it mixed, at once.
      await check(page, id, 'thead', 1).click();
      expect((await choices(page))[2].values).toEqual(every);
      await check(page, id, 'tbody', 1).click();
      expect(await said(check(page, id, 'thead', 1))).toBe('mixed enabled');
      expect((await choices(page))[3].values).toEqual(every.slice(1));
      expect(await choices(page)).toHaveLength(4);
    }
    // "Every row" is every row the table has been given: a row that arrives is counted, and nothing else is.
    await check(page, 'selection-all', 'tbody', 1).evaluate((el) => {
      const fresh = el.closest('tr')!.cloneNode(true) as HTMLElement;
      fresh.dataset.value = 'dripper';
      fresh.removeAttribute('data-selected');
      fresh.querySelector('tanrei-checkbox')!.removeAttribute('checked');
      el.closest('tbody')!.append(fresh);
    });
    await expect.poll(() => said(check(page, 'selection-all', 'thead', 1))).toBe('mixed enabled');
    await table(page, 'selection-all').evaluate((el) => el.tBodies[0].replaceChildren());
    await expect.poll(() => said(check(page, 'selection-all', 'thead', 1))).toBe('unchecked disabled');
  });

  test('TBL-46: a row’s checkbox is named by its selectLabel, or by its row header where it has none; without either it has no name and a debug build says so once; the checkbox for every row is named by selectAllLabel, from the instance or the product’s words; a table with checkboxes is still a table of rows and cells, with no grid and no selected state', async ({ page, browserName }) => {
    const unnamed = raw('unnamed', { label: 'Unnamed', selection: 'multiple' }, '<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th></tr></thead><tbody><tr data-value="a"><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><td>Kettle</td></tr><tr data-value="b"><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><td>Scale</td></tr></tbody></table>');
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...some('selection', 'selection-sticky-column', 'japanese-data'), unnamed, native('native', { selectAllLabel: '' })] });
    for (const id of ['selection', 'selection-sticky-column', 'unnamed', 'native']) await settled(page, id);
    // By selectLabel.
    const rows = fixture('selection').items!.filter((item) => item.kind === 'row' && !item.props.footer);
    for (const [index, r] of rows.entries()) await expect(stage(page, 'selection').getByRole('checkbox', { name: String(r.props.selectLabel), exact: true })).toHaveCount(1);
    await expect(table(page, 'selection').getByRole('checkbox')).toHaveCount(rows.length + 1);
    // By the row's header cell where the row gives no selectLabel.
    for (const name of ['Islands', 'Northern coast', 'Highlands', 'Capital']) await expect(stage(page, 'selection-sticky-column').getByRole('checkbox', { name, exact: true })).toHaveCount(1);
    // …and it follows the header's text.
    await cell(page, 'selection-sticky-column', 'tbody', 1, 2).evaluate((el) => (el.textContent = 'Outer islands'));
    await expect(stage(page, 'selection-sticky-column').getByRole('checkbox', { name: 'Outer islands', exact: true })).toHaveCount(1);
    // The header's, by selectAllLabel.
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Select all products', exact: true })).toHaveCount(1);
    await expect(stage(page, 'japanese-data').getByRole('checkbox', { name: 'すべての商品を選択', exact: true })).toHaveCount(1);
    await host(page, 'selection').evaluate((el) => ((el as unknown as { selectAllLabel: string }).selectAllLabel = 'Every product'));
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Every product', exact: true })).toHaveCount(1);
    // Neither a label nor a row header: no name, still drawn, reported once for the table.
    await expect(check(page, 'unnamed', 'tbody', 1)).toBeVisible();
    expect(await check(page, 'unnamed', 'tbody', 1).evaluate((el) => (el as unknown as { label: string }).label)).toBe('');
    await expect.poll(() => seen.filter((m) => m.includes('TBL-46') && m.includes('without a name')).length).toBe(1);
    // No word for the header's checkbox from the instance or the product: drawn, without a name, the missing word recorded.
    await expect(check(page, 'unnamed', 'thead', 1)).toBeVisible();
    expect(await check(page, 'unnamed', 'thead', 1).evaluate((el) => (el as unknown as { label: string }).label)).toBe('');
    expect(await check(page, 'native', 'thead', 1).getAttribute('aria-label')).toBeNull();
    expect(await missingWords(page)).toContain('selectAllLabel');
    expect(seen.filter((m) => m.includes('select-all-label') && m.includes('TBL-46')).length).toBe(1);
    // The product's words give it, to both kinds of checkbox; the instance's own still wins.
    await setWords(page, { selectAllLabel: 'Select every row' });
    await expect(stage(page, 'unnamed').getByRole('checkbox', { name: 'Select every row', exact: true })).toHaveCount(1);
    await expect(stage(page, 'native').getByRole('checkbox', { name: 'Select every row', exact: true })).toHaveCount(1);
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Every product', exact: true })).toHaveCount(1);
    // A native checkbox keeps the name the product wrote.
    await expect(stage(page, 'native').getByRole('checkbox', { name: 'Select Kettle', exact: true })).toHaveCount(1);
    // Still a table: rows, column headers, row headers, cells and checkboxes — no grid, no selected state.
    const f = fixture('selection');
    const all = f.items!.filter((item) => item.kind === 'row');
    const tableRole = stage(page, 'selection').getByRole('table', { name: named(f), exact: true });
    await expect(tableRole).toHaveCount(1);
    await expect(tableRole.getByRole('row')).toHaveCount(all.length + 1);
    await expect(tableRole.getByRole('columnheader')).toHaveCount(3);
    await expect(tableRole.getByRole('rowheader')).toHaveCount(all.length);
    await expect(stage(page, 'selection').getByRole('grid')).toHaveCount(0);
    expect(await host(page, 'selection').evaluate((el) => el.querySelectorAll('[aria-selected], [role="grid"], [role="gridcell"]').length)).toBe(0);
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Every product', exact: true })).toHaveJSProperty('indeterminate', true);
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Select Filter paper', exact: true })).toBeChecked();
    await expect(stage(page, 'selection').getByRole('checkbox', { name: 'Select Hand grinder', exact: true })).not.toBeChecked();
    // The verify: Chromium's own tree of the fixture selection.
    if (browserName === 'chromium') {
      await mountFixtures(page, spec, { fixtures: some('selection') });
      await settled(page, 'selection');
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      const kept = nodes.filter((n) => !n.ignored);
      const count = (role: string) => kept.filter((n) => String(n.role?.value) === role).length;
      expect({ table: count('table'), row: count('row'), columnheader: count('columnheader'), rowheader: count('rowheader'), checkbox: count('checkbox'), grid: count('grid'), gridcell: count('gridcell') }).toEqual({ table: 1, row: 6, columnheader: 3, rowheader: 5, checkbox: 5, grid: 0, gridcell: 0 });
      // Six selection cells, and the two data cells of each of the five rows under the header.
      expect(count('cell')).toBe(6 + 10);
      expect(kept.some((n) => n.properties?.some((p) => p.name === 'selected'))).toBe(false);
      const boxes = kept.filter((n) => String(n.role?.value) === 'checkbox').map((n) => [String(n.name?.value), String(n.properties?.find((p) => p.name === 'checked')?.value?.value)]);
      expect(boxes.sort((a, b) => a[0].localeCompare(b[0]))).toEqual([['Select all products', 'mixed'], ['Select Filter paper', 'true'], ['Select Hand grinder', 'false'], ['Select Kettle', 'true'], ['Select Scale', 'false']]);
    }
  });

  test('TBL-47: each sort button and each checkbox is its own stop in reading order — the header row’s controls, then each row’s checkbox — and no key moves focus from cell to cell; a checkbox’s hit area is its whole selection cell; a row that holds a checkbox is at least the pointer’s target high at the regular density and as high as its density gives at compact', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable-selection', 'selection', 'selection-compact', 'compact'), native('native')] });
    for (const id of ['sortable-selection', 'selection', 'selection-compact', 'native']) await settled(page, id);
    // The hit area is the whole selection cell, in width and in height: a press in a corner of the cell is the checkbox's.
    // (Before the keys below: Home, End and the arrow keys are left to the page, which scrolls for them as it does under
    // a native checkbox, and the browser eases that scroll over some frames — a press aimed at where a cell was read
    // to be while the window is still moving lands on the row that has come under it.)
    for (const which of ['selection', 'native']) {
      await hearChoices(page);
      await cell(page, which, 'tbody', 2, 1).scrollIntoViewIfNeeded();
      const at = await box(cell(page, which, 'tbody', 2, 1));
      const was = await said(check(page, which, 'tbody', 2));
      await page.mouse.click(at.x + 2, at.y + 2);
      await expect.poll(() => said(check(page, which, 'tbody', 2))).not.toBe(was);
      await page.mouse.click(at.x + at.width - 2, at.y + at.height - 2);
      await expect.poll(() => said(check(page, which, 'tbody', 2))).toBe(was);
      expect(await choices(page)).toHaveLength(2);
      // The header's too.
      const head = await box(cell(page, which, 'thead', 1, 1));
      await page.mouse.click(head.x + 2, head.y + 2);
      await expect.poll(() => choices(page)).toHaveLength(3);
      // One press on the checkbox itself is one change.
      await check(page, which, 'tbody', 1).click();
      expect(await choices(page)).toHaveLength(4);
    }
    const id = 'sortable-selection';
    // The verify: Tab visits the header's checkbox, Name, Stock, Price, then each row's checkbox in turn.
    const focused = () => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a?.localName === 'tanrei-checkbox' ? `checkbox ${(a as unknown as { label: string }).label}` : (a?.textContent ?? '').trim(); });
    await tabTo(page, check(page, id, 'thead', 1));
    const order = [await focused()];
    for (let stop = 0; stop < 7; stop++) {
      await tab(page);
      order.push(await focused());
    }
    expect(order).toEqual(['checkbox Select all products', 'Name', 'Stock', 'Price', 'checkbox Select Filter paper', 'checkbox Select Hand grinder', 'checkbox Select Kettle', 'checkbox Select Scale']);
    // The arrow keys move focus nowhere, and choose nothing.
    await hearChoices(page);
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      await page.keyboard.press(key);
      expect(await focused(), key).toBe('checkbox Select Scale');
    }
    expect(await choices(page)).toEqual([]);
    // For a fine pointer: at least the pointer's target at the regular density, and what the density gives at compact.
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const tr of await table(page, 'selection').locator('> thead > tr, > tbody > tr').all()) expect((await box(tr)).height).toBeGreaterThanOrEqual(pointer);
    near((await box(table(page, 'selection-compact').locator('> tbody > tr').first())).height, (await box(table(page, 'compact').locator('> tbody > tr').first())).height, 0.1);
    expect((await box(table(page, 'selection-compact').locator('> tbody > tr').first())).height).toBeLessThan(pointer);
  });

  test('TBL-47: with a coarse pointer a row that holds a checkbox is at least the touch target high, drawn so, at both densities, and its selection cell at least the touch target wide', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: browser.browserType().name() !== 'firefox' });
    const page = await context.newPage();
    await mountFixtures(page, spec, { fixtures: [...some('selection', 'selection-compact', 'selection-striped'), native('native', { density: 'compact' })] });
    test.skip(!(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)), 'this browser does not emulate a coarse pointer');
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    for (const id of ['selection', 'selection-compact', 'native']) {
      for (const tr of await table(page, id).locator('> thead > tr, > tbody > tr:not(:last-child)').all()) expect((await box(tr)).height, id).toBeGreaterThanOrEqual(touch);
      expect((await box(cell(page, id, 'tbody', 1, 1))).width, id).toBeGreaterThanOrEqual(touch);
    }
    // Drawn so: under separation gap the space between two rows is beside the target, not part of it.
    const gap = await resolveToken(page, T('row-gap'));
    expect((await box(table(page, 'selection-striped').locator('> tbody > tr').first())).height).toBeGreaterThanOrEqual(touch + gap);
    await context.close();
  });

  test('TBL-58: a press anywhere on a row that can be chosen changes its checkbox — not on what a cell holds that answers a press, not at the end of a drag or a text selection, not with a modifier, a middle button or a second click, not where the product cancelled it, not on a row that cannot be chosen; the row gets no role, stop or selected state', async ({ page }) => {
    // Some forty presses, each followed by the task in which the element decides it: longer than one test is given.
    test.slow();
    await mountFixtures(page, spec, { fixtures: [...some('selection'), raw('press', { label: 'Press', selection: 'multiple', rowHeaders: true, selectAllLabel: 'All' }, PRESSED)] });
    const id = 'press';
    await settled(page, id);
    await settled(page, 'selection');
    await hearChoices(page);
    const counted = async (n: number) => {
      await expect.poll(() => choices(page)).toHaveLength(n);
      // The click is decided a task after it: give a click that should change nothing the time to have done so.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
      expect(await choices(page)).toHaveLength(n);
    };
    // The verify: the row's text, its padding and its row header choose the row with one event; a second click lets it go.
    await cell(page, id, 'tbody', 2, 3).click();
    await counted(1);
    expect((await choices(page))[0].values).toEqual(['b']);
    expect(await chosen(page, id)).toEqual(['b']);
    await cell(page, id, 'tbody', 2, 3).click();
    await counted(2);
    expect(await chosen(page, id)).toEqual([]);
    const text = await box(cell(page, id, 'tbody', 2, 3));
    await page.mouse.click(text.x + text.width - 2, text.y + text.height - 2);
    await counted(3);
    await cell(page, id, 'tbody', 2, 2).click();
    await counted(4);
    expect(await chosen(page, id)).toEqual([]);
    // The fixture selection: a row header that is a th, and a row that is chosen let go.
    await cell(page, 'selection', 'tbody', 1, 3).click();
    await counted(5);
    expect(await chosen(page, 'selection')).not.toContain('paper');
    await cell(page, 'selection', 'tbody', 1, 2).click();
    await counted(6);
    expect(await chosen(page, 'selection')).toContain('paper');
    // What a cell holds that answers a press keeps it: the link (its default prevented), the button, the field, the
    // label, an element the product gave the pointer cursor, a Tanrei button.
    await page.evaluate(() => document.querySelector('.p-link')!.addEventListener('click', (event) => event.preventDefault()));
    const row = (r: number) => table(page, id).locator('> tbody > tr').nth(r - 1);
    for (const own of ['.p-link', '.p-button', '.p-field', '.p-label', '.p-own', 'tanrei-button']) {
      await row(1).locator(own).click();
      await counted(6);
    }
    expect(await chosen(page, id)).toEqual([]);
    // A drag of 20 px, which also selects text, chooses nothing; a press moved by 4 px chooses.
    const drag = async (by: number) => {
      const at = await box(cell(page, id, 'tbody', 2, 3));
      // From the cell's padding: a press moved by 4 px there selects no text.
      await page.mouse.move(at.x + 3, at.y + at.height / 2);
      await page.mouse.down();
      await page.mouse.move(at.x + 3 + by, at.y + at.height / 2, { steps: 4 });
      await page.mouse.up();
    };
    await drag(20);
    await counted(6);
    await page.evaluate(() => getSelection()?.removeAllRanges());
    await drag(4);
    await counted(7);
    await drag(4);
    await counted(8);
    await page.evaluate(() => getSelection()?.removeAllRanges());
    // A release that ends a text selection in the row chooses nothing.
    await page.evaluate(() => {
      const td = document.querySelector('[data-fixture="press"] tbody tr:nth-child(2) > td:last-child')!;
      window.addEventListener('mouseup', () => getSelection()!.selectAllChildren(td), { capture: true, once: true });
    });
    await cell(page, id, 'tbody', 2, 3).click();
    await counted(8);
    await page.evaluate(() => getSelection()?.removeAllRanges());
    // A modifier key, the middle button, a script's click() on a cell, a click the product cancels.
    for (const modifier of ['Control', 'Meta', 'Shift', 'Alt'] as const) {
      await cell(page, id, 'tbody', 2, 3).click({ modifiers: [modifier] });
      await counted(8);
      await page.evaluate(() => getSelection()?.removeAllRanges());
    }
    await cell(page, id, 'tbody', 2, 3).click({ button: 'middle' });
    await counted(8);
    await cell(page, id, 'tbody', 2, 3).evaluate((el) => (el as HTMLElement).click());
    await counted(8);
    await page.evaluate(() => document.querySelector('[data-fixture="press"] tbody tr:nth-child(2) > td:last-child')!.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    await cell(page, id, 'tbody', 2, 3).click();
    await counted(8);
    // A double click is one press and a second click: the first changes the row, the second (detail 2) does not. (Its
    // two halves are sent one after the other: in a double click sent at once the engine has selected the word under it
    // before the first click's turn comes, and that is a text selection, which chooses nothing either.)
    await page.mouse.move(0, 0);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 800)));
    const twice = await box(cell(page, id, 'tbody', 2, 2));
    await page.mouse.click(twice.x + 4, twice.y + twice.height / 2);
    await counted(9);
    await page.mouse.down({ clickCount: 2 });
    await page.mouse.up({ clickCount: 2 });
    await counted(9);
    expect(await chosen(page, id)).toEqual(['b']);
    await page.evaluate(() => getSelection()?.removeAllRanges());
    // A row without a value, a placeholder row, a footer row, the header row outside its checkbox, and a table nested in
    // a cell take no such press.
    await cell(page, id, 'tbody', 3, 3).click();
    await cell(page, id, 'tbody', 4, 3).click({ force: true });
    await cell(page, id, 'tfoot', 1, 3).click();
    await cell(page, id, 'thead', 1, 2).click();
    await row(5).locator('table td').click();
    await counted(9);
    // A row whose checkbox is disabled takes none either.
    await row(2).locator('tanrei-checkbox').evaluate((el) => ((el as HTMLInputElement).disabled = true));
    await cell(page, id, 'tbody', 2, 3).click();
    await counted(9);
    // The row is no control: no role, no tab index, no selected state, and Tab reaches the checkboxes as before.
    expect(await table(page, id).evaluate((el) => [...el.querySelectorAll(':scope > tbody > tr')].map((tr) => ['role', 'tabindex', 'aria-selected'].filter((a) => tr.hasAttribute(a))).flat())).toEqual([]);
    await tabTo(page, check(page, id, 'tbody', 1));
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.classList.contains('p-link'))).toBe(true);
  });

  test('TBL-59: a fine pointer over a row that can be chosen draws it hovered as one target — its condition’s hovered fill over its stripe or its chosen fill, its text, the pointer cursor — and at rest over what answers a press itself; a press draws it pressed without delay for press-hold, as the system’s feedback names (ripple as overlay, dim, none); a key on the checkbox does not; forced colors take the fills', async ({ page }) => {
    const pressed = raw('press', { label: 'Press', selection: 'multiple', rowHeaders: true, selectAllLabel: 'All' }, PRESSED);
    await mountFixtures(page, spec, { fixtures: [...some('selection-striped'), pressed] });
    const id = 'selection-striped';
    await settled(page, id);
    const tr = (r: number, at = id) => table(page, at).locator('> tbody > tr').nth(r - 1);
    const [stripe, unselected, selected, unselectedText, selectedText, unselectedPressed] = await Promise.all(
      ['stripe-container-color', 'row-unselected-hovered-container-color', 'row-selected-hovered-container-color', 'row-unselected-hovered-text-color', 'row-selected-hovered-text-color', 'row-unselected-pressed-container-color'].map((name) => resolveColor(page, T(name))),
    );
    const fill = await resolveColor(page, T('row-selected-container-color'));
    // The verify: over the text of the fourth row, every cell of it in the hovered fill over its stripe, and the pointer.
    await cell(page, id, 'tbody', 4, 2).hover();
    await expect(tr(4)).toHaveAttribute('data-tanrei-hit', '');
    for (const c of await tr(4).locator('> *').all()) {
      const [state, rest] = await layers(c);
      sameColor(state, unselected, 'hovered');
      sameColor(rest, stripe, 'stripe');
      sameColor(await css(c, 'color'), unselectedText, 'text');
    }
    expect(await css(cell(page, id, 'tbody', 4, 2), 'cursor')).toBe('pointer');
    expect(channels(unselected)[3]).toBeGreaterThan(0);
    // Over the second row, which is chosen, the chosen condition's.
    await cell(page, id, 'tbody', 2, 3).hover();
    await expect(tr(4)).not.toHaveAttribute('data-tanrei-hit');
    await expect(tr(2)).toHaveAttribute('data-tanrei-hit', '');
    for (const c of await tr(2).locator('> *').all()) {
      const [state, rest] = await layers(c);
      sameColor(state, selected, 'hovered');
      sameColor(rest, fill, 'chosen');
      sameColor(await css(c, 'color'), selectedText, 'text');
      // Short of the gap between rows, as the fill under it.
      const gap = await resolveToken(page, T('row-gap'));
      for (const size of (await css(c, 'background-size')).split(',')) expect(size).toContain(`${gap}px`);
    }
    // The selection cell and the checkbox in it are the row's too.
    await check(page, id, 'tbody', 3).hover();
    await expect(tr(3)).toHaveAttribute('data-tanrei-hit', '');
    // Over what a cell holds that answers a press itself the row is at rest, and the thing keeps its own cursor.
    await settled(page, 'press');
    await table(page, 'press').locator('.p-link').hover();
    await expect(tr(1, 'press')).not.toHaveAttribute('data-tanrei-hit');
    sameColor((await layers(cell(page, 'press', 'tbody', 1, 3)))[0], 'rgba(0, 0, 0, 0)');
    // (Its own: the cursor the engine gives a link anywhere — `pointer`, or `auto` in WebKit, whose links point by themselves.)
    const linkCursor = await page.evaluate(() => { const a = document.body.appendChild(Object.assign(document.createElement('a'), { href: '#elsewhere', textContent: 'x' })); const c = getComputedStyle(a).cursor; a.remove(); return c; });
    expect(await css(table(page, 'press').locator('.p-link'), 'cursor')).toBe(linkCursor);
    await table(page, 'press').locator('.p-field').hover();
    await expect(tr(1, 'press')).not.toHaveAttribute('data-tanrei-hit');
    await cell(page, 'press', 'tbody', 1, 2).hover();
    await expect(tr(1, 'press')).toHaveAttribute('data-tanrei-hit', '');
    // A row that cannot be chosen is never hovered; off the table no row is.
    await cell(page, 'press', 'tbody', 3, 3).hover();
    await expect(table(page, 'press').locator('tr[data-tanrei-hit]')).toHaveCount(0);
    await cell(page, id, 'tbody', 1, 2).hover();
    await page.mouse.move(0, 0);
    await expect(page.locator('tr[data-tanrei-hit]')).toHaveCount(0);
    // A press: the pressed fill at once, held for press-hold however quick the release.
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await watchPress(tr(1));
    await cell(page, id, 'tbody', 1, 2).click();
    expect((await expectPressShownAndHeld(page, hold, 'a click on a row')).feedback).toBe('overlay');
    const at = await box(cell(page, id, 'tbody', 3, 2));
    await page.mouse.move(at.x + 10, at.y + 10);
    await page.mouse.down();
    await expect(tr(3)).toHaveAttribute('data-pressed', 'overlay');
    sameColor((await layers(cell(page, id, 'tbody', 3, 2)))[0], unselectedPressed, 'pressed');
    await page.mouse.up();
    await expect.poll(() => tr(3).getAttribute('data-pressed')).toBeNull();
    // A press in the selection cell, on the checkbox itself, presses the row too; a key on the checkbox does not.
    await watchPress(tr(4));
    await check(page, id, 'tbody', 4).click();
    expect((await expectPressShownAndHeld(page, hold, 'a click on the checkbox')).feedback).toBe('overlay');
    await page.mouse.move(0, 0);
    await check(page, id, 'tbody', 4).focus();
    await page.keyboard.down('Space');
    expect(await tr(4).getAttribute('data-pressed')).toBeNull();
    await page.keyboard.up('Space');
    // Forced colors take the fills, as they take the chosen one (TBL-54).
    await cell(page, id, 'tbody', 1, 2).hover();
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await css(cell(page, id, 'tbody', 1, 2), 'background-image')).toBe('none');
    await page.emulateMedia({ forcedColors: 'none' });
    await page.mouse.move(0, 0);
    // ripple (m3-like) is drawn as overlay: no layer of its own in a row.
    const down = async () => {
      const where = await box(cell(page, id, 'tbody', 1, 2));
      await page.mouse.move(where.x + 10, where.y + 10);
      await page.mouse.down();
    };
    const up = async () => {
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => tr(1).getAttribute('data-pressed')).toBeNull();
    };
    await mountFixtures(page, spec, { fixtures: some('selection-striped'), system: 'm3-like' });
    await settled(page, id);
    await down();
    await expect(tr(1)).toHaveAttribute('data-pressed', 'overlay');
    sameColor((await layers(cell(page, id, 'tbody', 1, 2)))[0], await resolveColor(page, T('row-unselected-pressed-container-color')), 'm3-like pressed');
    await expect(tr(1).locator('.ripple')).toHaveCount(0);
    await up();
    // dim (cupertino): no hover, and a press dims the row whole while its fill stays at rest.
    await mountFixtures(page, spec, { fixtures: some('selection-striped'), system: 'cupertino' });
    await settled(page, id);
    await cell(page, id, 'tbody', 1, 2).hover();
    await expect(tr(1)).toHaveAttribute('data-tanrei-hit', '');
    sameColor((await layers(cell(page, id, 'tbody', 1, 2)))[0], 'rgba(0, 0, 0, 0)', 'cupertino hovered');
    await down();
    await expect(tr(1)).toHaveAttribute('data-pressed', 'dim');
    const opacity = Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('pressed-opacity')));
    expect(opacity).toBeLessThan(1);
    expect(Number(await css(tr(1), 'opacity'))).toBeCloseTo(opacity, 2);
    sameColor((await layers(cell(page, id, 'tbody', 1, 2)))[0], 'rgba(0, 0, 0, 0)', 'cupertino pressed');
    await up();
    // none: nothing changes under the press.
    await mountFixtures(page, spec, { fixtures: some('selection-striped') });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await settled(page, id);
    await cell(page, id, 'tbody', 1, 2).hover();
    const paint = () => tr(1).evaluate((el) => [...el.children].map((c) => [getComputedStyle(c).backgroundImage, getComputedStyle(c).color, getComputedStyle(el).opacity].join('|')));
    const hovered = await paint();
    await down();
    await expect(tr(1)).toHaveAttribute('data-pressed', 'none');
    expect(await paint()).toEqual(hovered);
    await up();
  });

  test('TBL-25: rows that are replaced because the product ordered or fetched them keep keyboard focus on the checkbox that had it — the checkbox of the row with the same value — and a checkbox that takes focus under a header row or a status line kept in view is brought out from under it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('sortable-selection'), { ...fixture('data'), id: 'kept' }] });
    const id = 'sortable-selection';
    await settled(page, id);
    await tabTo(page, check(page, id, 'tbody', 3));
    expect(await page.evaluate(() => (document.activeElement as unknown as { label: string }).label)).toBe('Select Kettle');
    // Given again as new rows, in another order: the row "kettle" is now the first.
    await table(page, id).evaluate((el) => {
      const copies = [...el.tBodies[0].rows].map((tr) => tr.cloneNode(true) as HTMLTableRowElement);
      el.tBodies[0].replaceChildren(copies[2], copies[0], copies[1], copies[3]);
    });
    await expect.poll(() => page.evaluate(() => (document.activeElement as unknown as { label?: string } | null)?.label)).toBe('Select Kettle');
    expect(await check(page, id, 'tbody', 1).evaluate((el) => el === document.activeElement)).toBe(true);
    // The same rows, moved: focus stays with the row.
    await table(page, id).evaluate((el) => el.tBodies[0].append(el.tBodies[0].rows[0]));
    await expect.poll(() => check(page, id, 'tbody', 4).evaluate((el) => el === document.activeElement)).toBe(true);
    // A row that is gone takes focus with it, and the table sends it nowhere.
    await table(page, id).evaluate((el) => el.tBodies[0].rows[3].remove());
    await frame(page);
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
    // Under a header row and a status line kept in view.
    await size(page, 'kept', { height: 110 });
    await settled(page, 'kept');
    await host(page, 'kept').evaluate((el) => (el.scrollTop = el.scrollHeight));
    await check(page, 'kept', 'tbody', 1).evaluate((el) => (el as HTMLElement).focus());
    await frame(page);
    const head = await box(cell(page, 'kept', 'thead', 1, 1));
    expect((await box(cell(page, 'kept', 'tbody', 1, 1))).y).toBeGreaterThanOrEqual(head.y + head.height - 0.6);
    await host(page, 'kept').evaluate((el) => (el.scrollTop = 0));
    await check(page, 'kept', 'tbody', 4).evaluate((el) => (el as HTMLElement).focus());
    await frame(page);
    const last = await box(cell(page, 'kept', 'tbody', 4, 1));
    expect(last.y + last.height).toBeLessThanOrEqual((await box(statusLine(page, 'kept'))).y + 0.6);
  });
});

test.describe('a loading body', () => {
  test('TBL-49: while loading the table is exposed as busy and draws the rows it is given as they are — no color, opacity or size of its own changes, its sort buttons, checkboxes and status line work as without it, the empty content is not drawn even with no body row — and it announces nothing itself', async ({ page }) => {
    const none: Fixture = { ...fixture('empty'), id: 'loading-empty', props: { ...fixture('empty').props, caption: 'Nothing yet', loading: true } };
    const server = raw('server', { label: 'Server' }, '<table aria-busy="true"><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr data-part="empty"><td colspan="1"><div>No products</div></td></tr></tbody></table>');
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('loading', 'selection', 'sortable-selection', 'empty'), none, server] });
    for (const id of ['loading', 'selection', 'sortable-selection']) await settled(page, id);
    // The verify: aria-busy on the table, and the four rows it had, drawn as in the fixture selection.
    await expect(table(page, 'loading')).toHaveAttribute('aria-busy', 'true');
    expect(await table(page, 'selection').getAttribute('aria-busy')).toBeNull();
    const drawn = (id: string) =>
      table(page, id).evaluate((el) =>
        [...el.querySelectorAll(':scope > thead > tr, :scope > tbody > tr')].map((tr) => [...tr.children].map((c) => { const s = getComputedStyle(c); const r = c.getBoundingClientRect(); return [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100, s.color, s.backgroundImage, s.opacity, s.pointerEvents].join(' '); })),
      );
    expect(await drawn('loading')).toEqual(await drawn('selection'));
    expect(await host(page, 'loading').evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).pointerEvents, getComputedStyle(el.querySelector('table')!).opacity, el.hasAttribute('inert'), el.querySelectorAll('[disabled], [aria-disabled]').length])).toEqual(['1', 'auto', '1', false, 0]);
    // The checkboxes work as without it.
    await hearChoices(page);
    await check(page, 'loading', 'tbody', 2).click();
    expect((await choices(page)).map((c) => c.values)).toEqual([['paper', 'grinder', 'kettle']]);
    // So do the sort buttons, and the status line is the place where the product says it.
    await host(page, 'sortable-selection').evaluate((el) => ((el as unknown as { loading: boolean }).loading = true));
    await expect(table(page, 'sortable-selection')).toHaveAttribute('aria-busy', 'true');
    await hearSorts(page);
    await control(page, 'sortable-selection', 3).click();
    expect(await sorts(page)).toHaveLength(1);
    await expect(statusLine(page, 'loading').locator('> [role="status"]')).toHaveText('Loading');
    // It announces nothing itself: the table writes no live region, and no word, for it.
    expect(await host(page, 'loading').evaluate((el) => el.querySelectorAll('[aria-live], [role="alert"]').length)).toBe(0);
    expect(await host(page, 'loading').evaluate((el) => el.querySelectorAll('[role="status"]').length)).toBe(1);
    // Loading ends when the product says so: the busy state the element wrote is taken away.
    await host(page, 'sortable-selection').evaluate((el) => ((el as unknown as { loading: boolean }).loading = false));
    await expect.poll(() => table(page, 'sortable-selection').getAttribute('aria-busy')).toBeNull();
    // The empty content is not drawn while loading, even with no body row — and is when loading ends.
    await expect(table(page, 'empty').locator('> tbody > tr[data-part="empty"]')).toBeVisible();
    await expect(table(page, 'loading-empty').locator('> tbody > tr[data-part="empty"]')).toBeHidden();
    await host(page, 'loading-empty').evaluate((el) => ((el as unknown as { loading: boolean }).loading = false));
    await expect(table(page, 'loading-empty').locator('> tbody > tr[data-part="empty"]')).toBeVisible();
    // A busy state a server wrote is read by the stylesheet, and left as it is by the element.
    await expect(table(page, 'server').locator('> tbody > tr[data-part="empty"]')).toBeHidden();
    await expect(table(page, 'server')).toHaveAttribute('aria-busy', 'true');
  });

  test('TBL-50: a placeholder row is drawn as a body row — counted for stripes, with a cell’s paddings and lines — at least as tall as a row of one line of text at the table’s density however little it holds, holds what the product puts in its cells, has no checkbox, is no row for the header checkbox or for the empty content, and is hidden from assistive technology; one in a table that is not loading is drawn all the same and reported', async ({ page, browserName }) => {
    const skeleton = '<span class="tanrei-skeleton-placeholder"></span>';
    const cells = (inner: string) => `<td data-part="selection"><tanrei-checkbox label-hidden label="Never"></tanrei-checkbox></td><td>${inner}</td><td>${inner}</td>`;
    const held = raw('held', { label: 'Held', selection: 'multiple', loading: true, striped: true, density: 'compact', selectAllLabel: 'All' }, `<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th><th scope="col">Stock</th></tr></thead><tbody><tr data-placeholder>${cells(skeleton)}</tr><tr data-placeholder>${cells('')}</tr><tr data-part="empty"><td colspan="3"><div>No products</div></td></tr></tbody></table>`);
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...some('loading-placeholders', 'selection', 'selection-compact'), held] });
    // The Skeleton's stylesheet, as a page that draws its placeholders loads it.
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, 'dist/skeleton.css'), 'utf8') });
    for (const id of ['loading-placeholders', 'held']) await settled(page, id);
    const id = 'loading-placeholders';
    // The verify: five rows of empty cells, each as high as a row of one line (46 under the default system), no checkbox, the header checkbox disabled.
    const rows = await table(page, id).locator('> tbody > tr').all();
    expect(rows).toHaveLength(5);
    const line = (await box(table(page, 'selection').locator('> tbody > tr').first())).height;
    near(line, 46, 0.1);
    for (const tr of rows.slice(0, 4)) near((await box(tr)).height, line, 0.1);
    expect(await table(page, id).evaluate((el) => [...el.tBodies[0].rows].every((tr) => [...tr.cells].every((c) => c.childNodes.length === 0)))).toBe(true);
    expect(await said(check(page, id, 'thead', 1))).toBe('unchecked disabled');
    // A cell's paddings, and the line between rows.
    expect(await px(cell(page, id, 'tbody', 1, 2), 'padding-top')).toBe(await resolveToken(page, T('cell-padding-block-regular')));
    expect(await px(cell(page, id, 'tbody', 1, 2), 'border-bottom-width')).toBe(await resolveToken(page, T('divider-thickness')));
    // Hidden from assistive technology: no row of nothing is exposed.
    await expect(stage(page, id).getByRole('row')).toHaveCount(1);
    for (const tr of rows) await expect(tr).toHaveAttribute('aria-hidden', 'true');
    // The element hides a row the product did not, and no checkbox is drawn in it whatever the markup holds.
    for (const r of [1, 2]) {
      await expect(table(page, 'held').locator('> tbody > tr').nth(r - 1)).toHaveAttribute('aria-hidden', 'true');
      await expect(check(page, 'held', 'tbody', r)).toBeHidden();
    }
    expect(await said(check(page, 'held', 'thead', 1))).toBe('unchecked disabled');
    // What the product puts in a cell — the Skeleton's text placeholder — is one line of the cell's text style: the row
    // is as tall as the row of empty cells beside it, and as a row of text at this density.
    const compact = (await box(table(page, 'selection-compact').locator('> tbody > tr').first())).height;
    near((await box(table(page, 'held').locator('> tbody > tr').nth(0))).height, compact, 0.1);
    near((await box(table(page, 'held').locator('> tbody > tr').nth(1))).height, compact, 0.1);
    expect((await box(cell(page, 'held', 'tbody', 1, 2).locator('> span'))).height).toBeGreaterThan(0);
    // Counted for stripes: the second placeholder row is striped.
    expect(await css(cell(page, 'held', 'tbody', 2, 2), 'background-image')).toContain(await resolveColor(page, T('stripe-container-color')));
    expect(await css(cell(page, 'held', 'tbody', 1, 2), 'background-image')).not.toContain(await resolveColor(page, T('stripe-container-color')));
    // No row for the empty content: while loading it is not drawn (TBL-49); when loading ends, with placeholder rows
    // alone, it is — and the placeholder rows are drawn all the same, which a debug build reports.
    await expect(table(page, 'held').locator('> tbody > tr[data-part="empty"]')).toBeHidden();
    expect(seen.filter((m) => m.includes('TBL-50'))).toEqual([]);
    await host(page, 'held').evaluate((el) => ((el as unknown as { loading: boolean }).loading = false));
    await expect(table(page, 'held').locator('> tbody > tr[data-part="empty"]')).toBeVisible();
    await expect(table(page, 'held').locator('> tbody > tr').nth(0)).toBeVisible();
    await expect.poll(() => seen.filter((m) => m.includes('TBL-50')).length).toBe(1);
    // The record arrives in the row that stood for it: the row is a row again.
    await table(page, 'held').locator('> tbody > tr').nth(0).evaluate((el) => { el.removeAttribute('data-placeholder'); el.setAttribute('data-value', 'kettle'); el.cells[1].textContent = 'Kettle'; });
    await expect.poll(() => table(page, 'held').locator('> tbody > tr').nth(0).getAttribute('aria-hidden')).toBeNull();
    await expect(check(page, 'held', 'tbody', 1)).toBeVisible();
    await expect.poll(() => said(check(page, 'held', 'thead', 1))).toBe('unchecked enabled');
    await expect(table(page, 'held').locator('> tbody > tr[data-part="empty"]')).toBeHidden();
    // Chromium's own tree: the placeholder rows are not in it.
    if (browserName === 'chromium') {
      const tree = await axTree(page);
      const tables = tree.filter((n) => n.role === 'table').map((n) => n.id);
      const inTable = (name: string) => tree.filter((n) => n.role === 'row' && tree.find((t) => t.id === n.parent || t.id === tree.find((p) => p.id === n.parent)?.parent)?.name === name);
      expect(tables.length).toBe(4);
      expect(inTable('Products (loading-placeholders)').length).toBe(1);
    }
  });
});

test.describe('chosen rows and a loading body in other conditions', () => {
  test('TBL-53: in a right-to-left layout the selection column is at the right edge, before the first column, and stays at the right with a first column kept in view', async ({ page }) => {
    const wide: Fixture = { ...fixture('selection-sticky-column'), id: 'rtl-kept', direction: 'rtl', props: { ...fixture('selection-sticky-column').props, caption: 'Kept, right to left' } };
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('rtl-sortable-selection'), wide] });
    const id = 'rtl-sortable-selection';
    await settled(page, id);
    const outer = await box(host(page, id));
    for (const section of ['thead', 'tbody'] as const) {
      const [select, first] = [await box(cell(page, id, section, 1, 1)), await box(cell(page, id, section, 1, 2))];
      near(select.x + select.width, outer.x + outer.width, 0.1);
      near(first.x + first.width, select.x, 0.1);
      // The checkbox at the start of its cell: the right — its box at the cell's padding, its round container reaching into it.
      const pad = await resolveToken(page, T('cell-padding-inline-regular'));
      const reach = ((await resolveToken(page, '--tanrei-comp-checkbox-container-size')) - (await resolveToken(page, '--tanrei-comp-checkbox-box-size'))) / 2;
      const one = await box(check(page, id, section, 1));
      near(one.x + one.width, select.x + select.width - Math.max(0, pad - reach), 0.1);
    }
    await settled(page, 'rtl-kept');
    await expect(host(page, 'rtl-kept')).toHaveAttribute('data-selection-kept', '');
    await host(page, 'rtl-kept').evaluate((el) => (el.scrollLeft = -el.scrollWidth));
    await expect(host(page, 'rtl-kept')).toHaveAttribute('data-more-start', '');
    const kept = await box(host(page, 'rtl-kept'));
    const [select, region] = [await box(cell(page, 'rtl-kept', 'tbody', 1, 1)), await box(cell(page, 'rtl-kept', 'tbody', 1, 2))];
    near(select.x + select.width, kept.x + kept.width, 0.1);
    near(region.x + region.width, select.x, 0.1);
    expect(await px(cell(page, 'rtl-kept', 'tbody', 1, 2), 'border-left-width')).toBe(await resolveToken(page, T('divider-thickness')));
  });

  test('TBL-54: in forced colors the fill of a chosen row is gone and its text is the text color: a chosen row and one that is not differ by their checkboxes, and no fixture relies on a background color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('selection', 'selection-striped') });
    await settled(page, 'selection');
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'rgb(1, 2, 3)'; document.body.appendChild(probe); const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)'; probe.remove(); return repainted; });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const canvasText = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'CanvasText'; document.body.appendChild(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
    for (const id of ['selection', 'selection-striped']) {
      for (const r of [1, 2, 3, 4]) {
        for (const column of [1, 2, 3]) {
          expect(await css(cell(page, id, 'tbody', r, column), 'background-image'), `${id} ${r} ${column}`).toBe('none');
          expect(await css(cell(page, id, 'tbody', r, column), 'color')).toBe(canvasText);
        }
      }
    }
    // The checkboxes say it: the first row's is checked, the second's is not, and the Checkbox draws that in this mode by its own spec.
    expect(await said(check(page, 'selection', 'tbody', 1))).toBe('checked enabled');
    expect(await said(check(page, 'selection', 'tbody', 2))).toBe('unchecked enabled');
    const marks = async (r: number) => check(page, 'selection', 'tbody', r).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.mark.check')!).opacity);
    expect(await marks(1)).not.toBe(await marks(2));
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('TBL-55: at 200 % text and a 320 wide window the selection column stays as wide as its checkbox and paddings, nothing of the fixture data is cut and only the table’s own box scrolls sideways', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('data', 'selection') });
    await settled(page, 'data');
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    for (const id of ['data', 'selection']) {
      const select = await box(cell(page, id, 'tbody', 1, 1));
      const one = await box(check(page, id, 'tbody', 1));
      const reach = ((await resolveToken(page, '--tanrei-comp-checkbox-container-size')) - (await resolveToken(page, '--tanrei-comp-checkbox-box-size'))) / 2;
      near(select.width, one.width + 2 * Math.max(0, (await resolveToken(page, T(`cell-padding-inline-${id === 'data' ? 'compact' : 'regular'}`))) - reach), 0.1);
      // Every header label and every cell is whole.
      expect(await table(page, id).evaluate((el) => [...el.querySelectorAll('th, td:not([data-part])')].filter((c) => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length), id).toBe(0);
    }
    // Only the table's own box scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const s = await scroll(host(page, 'data'));
    expect(s.width).toBeGreaterThan(s.clientWidth);
  });

  test('TBL-57: with scripting off the selection column, a chosen row — by data-selected or by a native checkbox that is checked — and placeholder rows are drawn from the product’s markup as with it, native checkboxes inside the product’s form work as the browser makes them work, and a row shows no state and no pointer and a press on it changes nothing', async ({ page: off }) => {
    const NATIVE_FORM = NATIVE.replace('<input type="checkbox">', '<input type="checkbox" aria-label="Select all products">');
    const placeholders = raw('placeholders', { label: 'Placeholders', selection: 'multiple', loading: true }, '<table aria-busy="true"><thead><tr><td data-part="selection"><input type="checkbox" aria-label="All" disabled></td><th scope="col">Name</th></tr></thead><tbody><tr data-placeholder aria-hidden="true"><td data-part="selection"></td><td></td></tr><tr data-placeholder aria-hidden="true"><td data-part="selection"></td><td><span class="tanrei-skeleton-placeholder"></span></td></tr><tr data-part="empty"><td colspan="2"><div>None</div></td></tr></tbody></table>');
    const fixtures = [raw('form', { label: 'form', selection: 'multiple', rowHeaders: true, striped: true }, NATIVE_FORM), placeholders, ...some('basic')];
    const document = await fixturesDocument(spec, { fixtures });
    const script = document.lastIndexOf('<script type="module">');
    const html = `${document.slice(0, script)}<style>${fs.readFileSync(path.join(pkg, 'dist/skeleton.css'), 'utf8')}</style></body></html>`;
    await off.setContent(html);
    expect(await off.locator('tanrei-table').first().evaluate((el) => el.matches(':defined'))).toBe(false);
    const on = await off.context().newPage();
    await on.setContent(`${html.replace('</body></html>', '')}${document.slice(script)}`);
    await on.waitForFunction(() => !!customElements.get('tanrei-table') && [...document.querySelectorAll('tanrei-table')].every((el) => el.hasAttribute('data-columns')));
    const drawn = (p: P) =>
      p.evaluate(async () => {
        await document.fonts.ready;
        return [...document.querySelectorAll('.stage')].map((s) => [
          (s as HTMLElement).dataset.fixture,
          ...[...s.querySelectorAll('tanrei-table, table, tr, th, td, input')].map((part) => {
            const r = part.getBoundingClientRect();
            const style = getComputedStyle(part);
            return `${[r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ')} | ${style.backgroundImage} ${style.color}`;
          }),
        ]);
      });
    expect(await drawn(off)).toEqual(await drawn(on));
    // The selection column, and the rows chosen by either form of the markup.
    const fill = await resolveColor(off, T('row-selected-container-color'));
    const stripe = await resolveColor(off, T('stripe-container-color'));
    const image = (r: number) => css(cell(off, 'form', 'tbody', r, 2), 'background-image');
    expect(await image(1)).toContain(fill);
    expect(await image(2)).toContain(stripe);
    expect(await image(3)).toContain(fill);
    expect(await image(4)).toContain(stripe);
    // A native checkbox works as the browser makes it work, and its row follows it.
    await check(off, 'form', 'tbody', 2).click();
    expect(await image(2)).toContain(fill);
    await check(off, 'form', 'tbody', 1).click();
    expect(await image(1)).not.toContain(fill);
    // TBL-58, TBL-59: without script a row answers no press, so it shows neither a state nor the pointer cursor, and a
    // press on it beside its checkbox changes nothing.
    const before = await check(off, 'form', 'tbody', 3).isChecked();
    await cell(off, 'form', 'tbody', 3, 2).hover();
    expect(await off.locator('tr[data-tanrei-hit], tr[data-pressed]').count()).toBe(0);
    for (const c of [1, 2, 3]) expect(await css(cell(off, 'form', 'tbody', 3, c), 'cursor'), `cell ${c}`).toBe('auto');
    await cell(off, 'form', 'tbody', 3, 2).click();
    expect(await check(off, 'form', 'tbody', 3).isChecked()).toBe(before);
    await off.mouse.move(0, 0);
    // Placeholder rows: one line tall, however little they hold; the empty content is not drawn in a busy table.
    const line = (await box(off.locator('[data-fixture="basic"] tbody tr').first())).height;
    for (const r of [1, 2]) near((await box(off.locator('[data-fixture="placeholders"] tbody tr').nth(r - 1))).height, line, 0.1);
    await expect(off.locator('[data-fixture="placeholders"] tbody tr[data-part="empty"]')).toBeHidden();
    // Nothing is hidden that script would have to reveal: what is not drawn is not drawn with it either.
    const hidden = (p: P) => p.evaluate(() => [...document.querySelectorAll('tanrei-table *')].filter((el) => !el.closest('.fixture-name') && getComputedStyle(el).display === 'none').map((el) => el.localName));
    expect(await hidden(off)).toEqual(await hidden(on));
    await on.close();
  });

  test('TBL-42, TBL-60: while selection is single the selection column holds a radio button in each body row that can be chosen and nothing in the header row, as wide as the radio button and a cell’s paddings with its ring at the cell’s padding; the radio buttons share one name — the product’s, or one the table gives those that have none; a control of the other kind is not drawn, and a debug build says so', async ({ page }) => {
    const seen = warnings(page);
    const unnamed = raw('unnamed', { label: 'Unnamed', selection: 'single', rowHeaders: true }, `<table><thead><tr><td data-part="selection"></td><th scope="col">Name</th></tr></thead><tbody>${['a', 'b', 'c'].map((v) => `<tr data-value="${v}"><td data-part="selection"><tanrei-radio-button label-hidden${v === 'b' ? ' name="kept"' : ''}></tanrei-radio-button></td><th scope="row">Row ${v}</th></tr>`).join('')}</tbody></table>`);
    const mixed = raw('mixed', { label: 'Mixed', selection: 'single', rowHeaders: true }, '<table><thead><tr><td data-part="selection"><tanrei-checkbox label-hidden label="All"></tanrei-checkbox></td><th scope="col">Name</th></tr></thead><tbody><tr data-value="a"><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="row">Kettle</th></tr><tr data-value="b"><td data-part="selection"><tanrei-radio-button label-hidden></tanrei-radio-button></td><th scope="row">Scale</th></tr></tbody></table>');
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('selection-single', 'totals'), unnamed, mixed] });
    for (const id of ['selection-single', 'unnamed', 'mixed']) await settled(page, id);
    const id = 'selection-single';
    const f = fixture(id);
    const columns = f.items!.filter((item) => item.kind === 'column').length;
    expect(await table(page, id).evaluate((el) => [...el.rows].map((tr) => [tr.cells.length, tr.cells[0].dataset.part].join(' ')))).toEqual(Array(6).fill(`${columns + 1} selection`));
    // The header row's selection cell holds nothing: no control stands for every row.
    expect(await cell(page, id, 'thead', 1, 1).evaluate((el) => el.childElementCount)).toBe(0);
    for (const r of [1, 2, 3, 4]) await expect(radio(page, id, r)).toBeVisible();
    await expect(table(page, id).locator('tanrei-checkbox')).toHaveCount(0);
    // The ring, not the round container, stands at the cell's padding, and the column is as wide as the container and
    // the paddings: under the default system 20 + 2 × 16 = 52 (the verify).
    const [ring, container, pad] = [await resolveToken(page, '--tanrei-comp-radio-button-ring-size'), await resolveToken(page, '--tanrei-comp-radio-button-container-size'), await resolveToken(page, T('cell-padding-inline-regular'))];
    const inset = Math.max(0, pad - (container - ring) / 2);
    for (const section of ['thead', 'tbody'] as const) near((await box(cell(page, id, section, 1, 1))).width, container + 2 * inset, 0.1);
    near((await box(cell(page, id, 'tbody', 1, 1))).width, 52, 0.1);
    const at = await box(cell(page, id, 'tbody', 1, 1));
    const drawn = await radio(page, id, 1).evaluate((el) => { const r = el.shadowRoot!.querySelector('.ring')!.getBoundingClientRect(); return { left: r.left, middle: (r.top + r.bottom) / 2 }; });
    near(drawn.left, at.x + pad, 0.6);
    await expect(radio(page, id, 1)).toHaveAttribute('label-hidden', '');
    // On the cell's first line, and the row no taller for it.
    const text = await textBox(cell(page, id, 'tbody', 1, 2));
    near(drawn.middle, (text.top + text.bottom) / 2, 0.6);
    near((await box(table(page, id).locator('> tbody > tr').first())).height, (await box(table(page, 'totals').locator('> tbody > tr').first())).height, 0.1);
    // The fixture's radio buttons keep the name the product gave them; those with none take the product's, or the table's.
    expect(await table(page, id).evaluate((el) => [...new Set([...el.querySelectorAll('tanrei-radio-button')].map((r) => r.getAttribute('name')))])).toEqual([id]);
    expect(await table(page, 'unnamed').evaluate((el) => [...el.querySelectorAll('tanrei-radio-button')].map((r) => r.getAttribute('name')))).toEqual(['kept', 'kept', 'kept']);
    await radio(page, 'unnamed', 2).evaluate((el) => el.removeAttribute('name'));
    await expect.poll(() => table(page, 'unnamed').evaluate((el) => [...new Set([...el.querySelectorAll('tanrei-radio-button')].map((r) => r.getAttribute('name') ?? ''))].map((n) => /^tanrei-table-\d+$/.test(n)))).toEqual([true]);
    // They are one group: one chosen at a time.
    await radio(page, 'unnamed', 1).click();
    await radio(page, 'unnamed', 3).click();
    expect(await radioed(page, 'unnamed')).toEqual(['c']);
    expect(await chosen(page, 'unnamed')).toEqual(['c']);
    // Let go of single selection, the names the table gave are taken back.
    await host(page, 'unnamed').evaluate((el) => ((el as unknown as { selection: string }).selection = 'none'));
    await expect.poll(() => table(page, 'unnamed').evaluate((el) => [...el.querySelectorAll('tanrei-radio-button')].map((r) => r.getAttribute('name')))).toEqual([null, null, null]);
    // A checkbox under single selection — in the header row or in a body row — is not drawn, and its row cannot be chosen.
    await expect(cell(page, 'mixed', 'thead', 1, 1).locator('tanrei-checkbox')).toBeHidden();
    await expect(cell(page, 'mixed', 'tbody', 1, 1).locator('tanrei-checkbox')).toBeHidden();
    await expect(radio(page, 'mixed', 2)).toBeVisible();
    await hearChoices(page);
    await cell(page, 'mixed', 'tbody', 1, 2).click();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(await choices(page)).toEqual([]);
    await expect.poll(() => seen.filter((m) => m.includes('TBL-60') && m.includes('header row holds a control')).length).toBe(1);
    expect(seen.filter((m) => m.includes('TBL-60') && m.includes('holds a checkbox while selection is single')).length).toBe(1);
    // …and a radio button under multiple selection is not drawn either.
    await host(page, 'mixed').evaluate((el) => ((el as unknown as { selection: string }).selection = 'multiple'));
    await expect(radio(page, 'mixed', 2)).toBeHidden();
    await expect(cell(page, 'mixed', 'tbody', 1, 1).locator('tanrei-checkbox')).toBeVisible();
    await expect.poll(() => seen.filter((m) => m.includes('TBL-60') && m.includes('holds a radio button while selection is multiple')).length).toBe(1);
  });

  test('TBL-60, TBL-44, TBL-58, TBL-59: choosing a row lets the chosen one go, with one selectionChange carrying its value alone; the chosen row’s radio button, Space on it and a press on its row change nothing, though the row is drawn hovered as the radio button is; what the product writes is drawn and not emitted, and of several rows marked chosen at once the first stands', async ({ page }) => {
    const seen = warnings(page);
    const NATIVE_RADIO = `<table><thead><tr><td data-part="selection"></td><th scope="col">Name</th><th scope="col" data-align="end">Stock</th></tr></thead><tbody>
      <tr data-value="kettle"><td data-part="selection"><input type="radio" name="pick" value="kettle" aria-label="Select Kettle" checked></td><th scope="row">Kettle</th><td data-align="end">15</td></tr>
      <tr data-value="scale"><td data-part="selection"><input type="radio" name="pick" value="scale" aria-label="Select Scale"></td><th scope="row">Scale</th><td data-align="end">0</td></tr>
      <tr data-value="paper"><td data-part="selection"><input type="radio" name="pick" value="paper" aria-label="Select Filter paper"></td><th scope="row">Filter paper</th><td data-align="end">120</td></tr>
      </tbody></table>`;
    await mountFixtures(page, spec, { fixtures: [...some('selection-single'), raw('native-radio', { label: 'Native radio', selection: 'single', rowHeaders: true }, NATIVE_RADIO)] });
    const quiet = async (n: number) => {
      // The row's click is decided a task after it: give a click that should change nothing the time to have done so.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
      expect(await choices(page)).toHaveLength(n);
    };
    for (const id of ['selection-single', 'native-radio']) {
      await settled(page, id);
      await hearChoices(page);
      const order = id === 'selection-single' ? ['paper', 'grinder', 'kettle', 'scale'] : ['kettle', 'scale', 'paper'];
      // The verify: Kettle is chosen and its radio button checked — for a native one, by its own `checked` (TBL-57).
      expect(await chosen(page, id)).toEqual(['kettle']);
      expect(await radioed(page, id)).toEqual(['kettle']);
      // A press on another row's radio button chooses that row and lets Kettle go, with one event carrying its value.
      const other = order.indexOf('scale') + 1;
      await radio(page, id, other).click();
      await expect.poll(() => choices(page)).toHaveLength(1);
      expect(await choices(page)).toEqual([{ values: ['scale'], from: 'tanrei-table', cancelable: false }]);
      expect(await chosen(page, id)).toEqual(['scale']);
      expect(await radioed(page, id)).toEqual(['scale']);
      // The chosen row's radio button again, Space on it, a press on its row: nothing changes, nothing is emitted.
      await radio(page, id, other).click();
      await quiet(1);
      await radio(page, id, other).focus();
      await page.keyboard.press('Space');
      await quiet(1);
      await cell(page, id, 'tbody', other, 2).click();
      await quiet(1);
      expect(await chosen(page, id)).toEqual(['scale']);
      // A press on another row's text chooses it (TBL-58).
      const third = order.indexOf('paper') + 1;
      await cell(page, id, 'tbody', third, 3).click();
      await expect.poll(() => choices(page)).toHaveLength(2);
      expect((await choices(page))[1].values).toEqual(['paper']);
      expect(await radioed(page, id)).toEqual(['paper']);
      // TBL-59: under a fine pointer the chosen row is drawn hovered all the same, with the pointer cursor: its press is
      // its radio button's, which answers a hover while selected.
      await page.mouse.move(0, 0);
      await cell(page, id, 'tbody', third, 2).hover();
      await expect(table(page, id).locator('> tbody > tr').nth(third - 1)).toHaveAttribute('data-tanrei-hit', '');
      expect(await css(cell(page, id, 'tbody', third, 2), 'cursor')).toBe('pointer');
      await page.mouse.move(0, 0);
      // The product chooses another row: drawn, the radio buttons follow, nothing emitted.
      await table(page, id).locator('> tbody > tr').nth(0).evaluate((el) => el.setAttribute('data-selected', ''));
      await expect.poll(() => chosen(page, id)).toEqual([order[0]]);
      expect(await radioed(page, id)).toEqual([order[0]]);
      // Several written at once: the first in row order stands, and a debug build says so.
      await table(page, id).evaluate((el) => { el.tBodies[0].rows[1].setAttribute('data-selected', ''); el.tBodies[0].rows[2].setAttribute('data-selected', ''); });
      await expect.poll(() => chosen(page, id)).toEqual([order[1]]);
      expect(await radioed(page, id)).toEqual([order[1]]);
      // The product lets every row go: none is chosen, no radio button is checked.
      await table(page, id).locator('> tbody > tr').nth(1).evaluate((el) => el.removeAttribute('data-selected'));
      await expect.poll(() => radioed(page, id)).toEqual([]);
      expect(await chosen(page, id)).toEqual([]);
      await frame(page);
      expect(await choices(page)).toHaveLength(2);
    }
    expect(seen.filter((m) => m.includes('TBL-60') && m.includes('2 rows are marked as chosen')).length).toBe(2);
  });

  test('TBL-61, TBL-47, TBL-46: the radio buttons are one stop — the chosen row’s, or the first row’s while none is — and the arrow keys move focus and the choice from row to row, wrapping, with one selectionChange each; each is a radio named by its row, with its position among them, in no radio group, and the table has no grid and no selected state', async ({ page, browserName }) => {
    const NATIVE_RADIO = `<table><thead><tr><td data-part="selection"></td><th scope="col">Name</th></tr></thead><tbody>
      <tr data-value="kettle" data-selected><td data-part="selection"><input type="radio" name="pick" aria-label="Select Kettle"></td><th scope="row">Kettle</th></tr>
      <tr data-value="scale"><td data-part="selection"><input type="radio" name="pick" aria-label="Select Scale"></td><th scope="row">Scale</th></tr>
      <tr data-value="paper"><td data-part="selection"><input type="radio" name="pick" aria-label="Select Filter paper"></td><th scope="row">Filter paper</th></tr>
      </tbody></table>`;
    // (A fixture with sort buttons after the two: headless Firefox does not wrap Tab around at the last control.)
    await mountFixtures(page, spec, { fixtures: [...some('selection-single'), raw('native-radio', { label: 'Native radio', selection: 'single' }, NATIVE_RADIO), ...some('sortable')] });
    for (const id of ['selection-single', 'native-radio']) {
      await settled(page, id);
      await hearChoices(page);
      const order = id === 'selection-single' ? ['paper', 'grinder', 'kettle', 'scale'] : ['kettle', 'scale', 'paper'];
      const inTable = () => host(page, id).evaluate((el) => { const a = document.activeElement; return a && el.contains(a) ? ((a.closest('tr') as HTMLElement).dataset.value ?? '') : null; });
      // Tab reaches the chosen row's radio button, and the next Tab leaves the table: one stop.
      const at = order.indexOf('kettle') + 1;
      await tabTo(page, radio(page, id, at));
      expect(await inTable()).toBe('kettle');
      await tab(page);
      expect(await inTable()).toBeNull();
      await tab(page, { back: true });
      expect(await inTable()).toBe('kettle');
      // Down moves to the next row's and chooses it, with one event; past the last it wraps to the first; Up goes back.
      const expected: string[][] = [];
      let now = at - 1;
      for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft']) {
        now = (now + (key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1) + order.length) % order.length;
        await page.keyboard.press(key);
        await expect.poll(inTable, key).toBe(order[now]);
        await expect.poll(() => chosen(page, id), key).toEqual([order[now]]);
        expected.push([order[now]]);
      }
      expect((await choices(page)).map((c) => c.values)).toEqual(expected);
      // While no row is chosen the stop is the first row's. (Of native radio buttons of which none is checked, the browser
      // decides which one Tab enters at — Chromium, the one focused last — so this is asked of Tanrei's alone.)
      if (id === 'native-radio') continue;
      await table(page, id).evaluate((el) => el.querySelectorAll('tr[data-selected]').forEach((tr) => tr.removeAttribute('data-selected')));
      await expect.poll(() => radioed(page, id)).toEqual([]);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await tabTo(page, radio(page, id, 1));
      await tab(page);
      expect(await inTable()).toBeNull();
      // Space chooses the row whose radio button has focus.
      await tab(page, { back: true });
      expect(await inTable()).toBe(order[0]);
      await page.keyboard.press('Space');
      await expect.poll(() => chosen(page, id)).toEqual([order[0]]);
    }
    // Exposed as radios, named by their rows, in no radio group; still a table, with no grid and no selected state.
    const f = fixture('selection-single');
    const tableRole = stage(page, 'selection-single').getByRole('table', { name: named(f), exact: true });
    await expect(tableRole).toHaveCount(1);
    const rows = f.items!.filter((item) => item.kind === 'row' && !item.props.footer);
    for (const r of rows) await expect(tableRole.getByRole('radio', { name: String(r.props.selectLabel), exact: true })).toHaveCount(1);
    await expect(tableRole.getByRole('radio')).toHaveCount(rows.length);
    await expect(tableRole.getByRole('checkbox')).toHaveCount(0);
    await expect(stage(page, 'selection-single').getByRole('radiogroup')).toHaveCount(0);
    await expect(stage(page, 'selection-single').getByRole('grid')).toHaveCount(0);
    expect(await host(page, 'selection-single').evaluate((el) => el.querySelectorAll('[aria-selected], [role="grid"], [role="gridcell"], [role="radiogroup"]').length)).toBe(0);
    // The verify: Chromium's own tree — four radios, one checked, each at its place of four.
    if (browserName === 'chromium') {
      await mountFixtures(page, spec, { fixtures: some('selection-single') });
      await settled(page, 'selection-single');
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      const kept = nodes.filter((n) => !n.ignored);
      const count = (role: string) => kept.filter((n) => String(n.role?.value) === role).length;
      expect({ table: count('table'), row: count('row'), columnheader: count('columnheader'), rowheader: count('rowheader'), radio: count('radio'), checkbox: count('checkbox'), radiogroup: count('radiogroup'), grid: count('grid') }).toEqual({ table: 1, row: 6, columnheader: 3, rowheader: 5, radio: 4, checkbox: 0, radiogroup: 0, grid: 0 });
      expect(kept.some((n) => n.properties?.some((p) => p.name === 'selected'))).toBe(false);
      const radios = await stage(page, 'selection-single').locator('tanrei-radio-button').evaluateAll((all) => all.map((r) => { const input = r.shadowRoot!.querySelector('input')!; return [input.getAttribute('aria-label'), input.checked, input.getAttribute('aria-posinset'), input.getAttribute('aria-setsize')].join(' '); }));
      expect(radios).toEqual(['Select Filter paper false 1 4', 'Select Hand grinder false 2 4', 'Select Kettle true 3 4', 'Select Scale false 4 4']);
    }
  });

  test('TBL-57: with scripting off, native radio buttons of one name in the product’s markup exclude each other as the browser makes them, and the row of the checked one is drawn chosen', async ({ page: off }) => {
    const markup = `<table><thead><tr><td data-part="selection"></td><th scope="col">Name</th></tr></thead><tbody>
      <tr data-value="kettle"><td data-part="selection"><input type="radio" name="pick" aria-label="Select Kettle" checked></td><th scope="row">Kettle</th></tr>
      <tr data-value="scale"><td data-part="selection"><input type="radio" name="pick" aria-label="Select Scale"></td><th scope="row">Scale</th></tr>
      </tbody></table>`;
    const document = await fixturesDocument(spec, { fixtures: [raw('form', { label: 'form', selection: 'single', rowHeaders: true }, markup)] });
    const script = document.lastIndexOf('<script type="module">');
    await off.setContent(`${document.slice(0, script)}</body></html>`);
    expect(await off.locator('tanrei-table').first().evaluate((el) => el.matches(':defined'))).toBe(false);
    const fill = await resolveColor(off, T('row-selected-container-color'));
    const image = (r: number) => css(cell(off, 'form', 'tbody', r, 2), 'background-image');
    expect(await image(1)).toContain(fill);
    expect(await image(2)).not.toContain(fill);
    await radio(off, 'form', 2).click();
    expect(await image(2)).toContain(fill);
    expect(await image(1)).not.toContain(fill);
    // The header row's selection cell is drawn, empty, as wide as the body rows', so that the columns line up.
    near((await box(cell(off, 'form', 'thead', 1, 1))).width, (await box(cell(off, 'form', 'tbody', 1, 1))).width, 0.1);
  });

  test('the fixtures that choose rows have no axe violations with their checkboxes and radio buttons changed, in light and dark, and the contrast of a chosen row’s text holds (TBL-43, TBL-46)', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: some('selection', 'selection-striped', 'selection-single', 'data', 'loading-placeholders') });
      await settled(page, 'selection');
      await settled(page, 'selection-single');
      await check(page, 'selection', 'thead', 1).click();
      await check(page, 'selection-striped', 'tbody', 1).click();
      await radio(page, 'selection-single', 1).click();
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(spec.fixtures).toHaveLength(49);
    // Every fixture is drawn: the thirteen that choose rows or load are among them.
    expect(spec.fixtures.filter((f) => f.props.selection !== undefined || f.props.loading !== undefined).map((f) => f.id)).toEqual(['selection', 'selection-all', 'selection-compact', 'selection-striped', 'selection-sticky-column', 'selection-single', 'sortable-selection', 'empty-selection', 'loading', 'loading-placeholders', 'data', 'japanese-data', 'rtl-sortable-selection']);
    for (const f of spec.fixtures.filter((each) => each.props.selection === 'multiple')) await expect(host(page, f.id)).toHaveAttribute('selection', 'multiple');
    for (const f of spec.fixtures) expect(await host(page, f.id).evaluate((el) => el.hasAttribute('loading')), f.id).toBe(f.props.loading === true);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toHaveCount(1);
      await expect(table(page, f.id), f.id).toBeVisible();
      for (const [prop, attribute] of [['density', 'density'], ['separation', 'separation']] as const) if (f.props[prop]) await expect(host(page, f.id)).toHaveAttribute(attribute, String(f.props[prop]));
      for (const [prop, attribute] of [['striped', 'striped'], ['rowHeaders', 'row-headers'], ['stickyHeader', 'sticky-header'], ['stickyFirstColumn', 'sticky-first-column']] as const) {
        expect(await host(page, f.id).evaluate((el, name) => el.hasAttribute(name), attribute), `${f.id} ${attribute}`).toBe(f.props[prop] === true);
      }
      if (f.direction) await expect(stage(page, f.id)).toHaveAttribute('dir', f.direction);
    }
    // The fixtures that must scroll do, at rest, and the others do not scroll sideways except the six-column mapping.
    for (const f of spec.fixtures) {
      const s = await scroll(host(page, f.id));
      if (/wide|selection-sticky-column/.test(f.id)) expect(s.width, f.id).toBeGreaterThan(s.clientWidth);
      else if (!/mapping|ltr-cells-rtl/.test(f.id)) expect(s.width, f.id).toBe(s.clientWidth);
      // No fixture scrolls its rows: a checkbox's container, taller than a compact row, adds nothing under the last row.
      expect(s.height, f.id).toBe(s.clientHeight);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
