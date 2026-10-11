// What prose costs the browser's style engine: a long page of prose with
// islands in it, two and three deep (test/prose-page.ts), is styled whole — once with `dist/prose.css`, once without —
// and the time Chromium spends RECALCULATING STYLE for it is compared. The time is the engine's own counter
// (`RecalcStyleDuration`, over the DevTools protocol), not a wall clock around the test: nothing else the page or the
// machine does is in it, and the comparison is a ratio on the same page in the same browser, so a slow or busy machine
// moves both sides. The smallest of several runs is taken on each side: a run can only be slowed, never sped up.
//
// The stylesheet tests (prose.test.ts, "no selector looks for an island…"; has.test.ts, for `:has()` in every sheet of
// the package) hold the shape of the selectors; this one holds what the shape is for.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CDPSession, type Page, expect, test } from '@playwright/test';
import { fixturesTablePage, prosePage } from '../../test/prose-page.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/**
 * How many times the page's own style time prose may cost. Measured (Chromium 153; 12 000 elements, 300
 * islands, the prose twelve elements deep): 3.4 on a quiet machine and up to 5 beside other test workers — nearly all
 * of it the declarations themselves (a sixth of the elements are links, each with the Link's whole look). The shapes
 * this guards against, on the same page: 71 for a parent selector that looks for an island among each element's
 * ancestors (`:not(.tanrei-prose <island> *)`) even with every rule filed under its element's name, and 660 — eight and
 * a half seconds — for that selector as it was, every rule tried on every element. About twice the measured value: room
 * for another engine version and for new rules, none for those shapes.
 */
const BUDGET = 8;
const RUNS = 7;
/**
 * The share of a whole restyle of the page that one write — an attribute, a child — may cost. Measured the same way:
 * under 0.001 (0.04 ms of 60: the element and its neighbours). With one `:has()` on any element whatever in the sheet
 * (`:has(> h2:only-child)`, a heading's wrapper with no name — the stylesheet test refuses it) the same write cost
 * 0.05 of the page, 2.9 ms: what follows each of the element's ancestors was restyled, and on a page with a product's
 * own `:has()` rules beside it, the whole document. Five times the measured value, a tenth of that shape's.
 */
const WRITE_BUDGET = 0.005;

/**
 * How many elements one write inside a table may restyle, on a page with every stylesheet of the package and a
 * `:has()` of the product's own on its root.
 * Counted (Chromium 153; a table of 2 400 elements in prose): 2 to 4 — the element, what it holds, the
 * table itself (table.css asks it whether it has a footer, for itself) and the root (the product's question). With
 * `:has()` asked of the table for the sake of its rows, and one rule anywhere whose element an
 * engine cannot name, every such write restyles the table whole: 2 400. The
 * test draws that shape too, so that the count is seen to tell the two apart.
 *
 * Counted, not timed, because the time of such a write is not the package's to keep: a product's `:root:has(…)` is
 * asked again of the whole document at each write some `:has()` of the page asks about — 7 ms of the 26 ms the table
 * takes to style whole, on this page — whatever the package's selectors are. The style time is still read, and the
 * old shape must cost more of it: `TABLE_WRITE_TIME` of what it cost is the most the new one may (0.4 measured).
 */
const TABLE_WRITE_ELEMENTS = 12;
const TABLE_WRITE_TIME = 0.7;

const page13k = prosePage({ blocks: 2000, islands: 300 });
const html = (css: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style><style>${css}</style></head><body>${page13k}</body></html>`;

const styleSeconds = async (cdp: CDPSession) => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'RecalcStyleDuration')!.value;
/** The style time of one whole restyle of the page's content — taken out, put back, and a style read — the least of `RUNS`, in ms. */
async function restyle(page: Page, cdp: CDPSession): Promise<number> {
  const runs: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    await page.evaluate(() => {
      const content = document.body.firstElementChild!;
      content.remove();
      void getComputedStyle(document.body).color;
    });
    const before = await styleSeconds(cdp);
    await page.evaluate(() => {
      document.body.append((window as unknown as { content: Element }).content);
      void getComputedStyle(document.querySelector('#prose')!.lastElementChild!).color;
    });
    runs.push(((await styleSeconds(cdp)) - before) * 1000);
  }
  return Math.min(...runs);
}
async function measure(page: Page, css: string) {
  await page.setContent(html(css));
  await page.evaluate(() => {
    (window as unknown as { content: Element }).content = document.body.firstElementChild!;
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const ms = await restyle(page, cdp);
  await cdp.detach();
  return ms;
}

test.describe('what prose costs', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the style time is read over the DevTools protocol');
  // Seven restyles of 13 000 elements on each side; the default 30 s is for a fixture.
  test.setTimeout(120_000);

  test('PRS-16 styling a long page of prose with 300 islands, two and three deep, costs at most 8 times the page’s own style time', async ({ page }) => {
    const control = await measure(page, '');
    const prose = await measure(page, read('dist/prose.css'));
    // The page is the one meant, and prose is drawn on it: its own blocks at every level, and nothing inside an island.
    const drawn = await page.evaluate(() => {
      const gap = (selector: string) => getComputedStyle(document.querySelector(selector)!).marginBlockStart;
      const size = (selector: string) => getComputedStyle(document.querySelector(selector)!).fontSize;
      return {
        elements: document.querySelectorAll('body *').length,
        islands: document.querySelectorAll('#prose > :is(.tanrei-not-prose, tanrei-card, tanrei-callout, tanrei-tabs, tanrei-code-block, tanrei-table)').length,
        first: gap('#prose > h2 + p') !== '0px',
        second: size('#prose > * > .tanrei-prose > h3') !== size('#prose > tanrei-card > div h3'),
        third: size('#prose .tanrei-prose .tanrei-prose > h3') !== size('#prose .tanrei-prose .tanrei-prose > .tanrei-not-prose h3'),
        marked: size('#prose > * > .tanrei-prose > .tanrei-not-prose h3') === size('#prose > tanrei-card > div h3'),
      };
    });
    expect(drawn).toMatchObject({ islands: 300, first: true, second: true, third: true, marked: true });
    expect(drawn.elements).toBeGreaterThan(12_000);
    test.info().annotations.push({ type: 'style time', description: `control ${control.toFixed(1)} ms, prose ${prose.toFixed(1)} ms, ratio ${(prose / control).toFixed(1)} (${drawn.elements} elements)` });
    console.log(`prose.perf: control ${control.toFixed(1)} ms, prose ${prose.toFixed(1)} ms, ratio ${(prose / control).toFixed(1)} (${drawn.elements} elements)`);
    expect(control).toBeGreaterThan(0);
    expect(prose / control, `prose ${prose.toFixed(1)} ms against ${control.toFixed(1)} ms without it`).toBeLessThanOrEqual(BUDGET);
  });

  test('PRS-16 a component that writes an attribute, or adds a child, deep in a long page of prose does not restyle the page', async ({ page }) => {
    await page.setContent(html(read('dist/prose.css')));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    // What an element does when it is defined and when it updates: attributes on itself (one of them, `type`, is a name
    // prose's own `:has()` asks about), and a child. Thirty elements, three deep in the page's blocks, one at a time —
    // each followed by a read of a style, as a component's own update is.
    const elements = await page.evaluate(() => document.querySelectorAll('body *').length);
    const before = await styleSeconds(cdp);
    const writes = await page.evaluate(() => {
      const targets = [...document.querySelectorAll('#prose > section > p, #prose > blockquote > p, #prose > ul > li > ul > li')].filter((_, index) => index % 20 === 0).slice(0, 30);
      for (const target of targets) {
        target.setAttribute('type', 'text');
        void getComputedStyle(target).color;
        target.append(document.createElement('span'));
        void getComputedStyle(target).color;
        target.toggleAttribute('hidden');
        void getComputedStyle(target).color;
        target.toggleAttribute('hidden');
        void getComputedStyle(target).color;
      }
      return targets.length * 4;
    });
    const each = (((await styleSeconds(cdp)) - before) * 1000) / writes;
    await cdp.detach();
    const whole = await measure(page, read('dist/prose.css'));
    console.log(`prose.perf: ${each.toFixed(3)} ms a write, ${whole.toFixed(1)} ms the whole page (${elements} elements)`);
    test.info().annotations.push({ type: 'style time', description: `${each.toFixed(3)} ms a write, ${whole.toFixed(1)} ms the whole page` });
    expect(writes).toBe(120);
    expect(each / whole, `a write costs ${each.toFixed(3)} ms of style time, the whole page ${whole.toFixed(1)} ms`).toBeLessThanOrEqual(WRITE_BUDGET);
  });

  test('PRS-16 one attribute written, or one child added, inside a table of 2,500 elements in prose restyles the element, not the table — with every stylesheet of the package on the page, and the product’s own :has() rules beside them', async ({ page }) => {
    const manifest = JSON.parse(read('custom-elements.json')) as { modules: { declarations?: { tagName?: string }[] }[] };
    const tags = [...new Set(manifest.modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName).filter((t): t is string => !!t))];
    const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css'));
    // What a product's own stylesheet may hold, and the docs site's did: a question asked of the root about anything
    // below it — after which every element of the page is one whose changes `:has()` may concern — and a rule that
    // asks one element for the sake of another the engine cannot name. Neither matches anything here.
    const PRODUCT = ':root:has(.product-menu-open) { --product-menu: 1; } .product-list:has(> p) > :not(:first-child) { margin-block-start: 1px; }';
    // The shape this guards against, as table.css had it (`:has()` asked of the table for its last body row).
    const AS_IT_WAS = ':where(tanrei-table) > :where(table):where(:not(:has(> tfoot > tr))) > :where(tbody:last-of-type) > :where(tr:last-child) { --_as-it-was: 0px; }';
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const measured = async (extra: string, footer: boolean) => {
      // Every stylesheet a page can load and every element of the package (each adds its styles to its shadow root or
      // to the document: an engine keeps one account of `:has()` for all of them), then the table.
      await page.setContent(
        `<!doctype html><html lang="en"><head><meta charset="utf-8">${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}<style>${PRODUCT}${extra}</style></head><body><div hidden>${tags
          .filter((tag) => tag !== 'tanrei-table')
          .map((tag) => `<${tag}></${tag}>`)
          .join('')}</div>${fixturesTablePage({ footer })}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`,
      );
      await page.waitForFunction((all) => all.every((tag) => !!customElements.get(tag)), tags);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const drawn = await page.evaluate(() => {
        const table = document.querySelector('#fixtures-table')!;
        const last = table.querySelector('tbody > tr:last-child > td')!;
        return {
          elements: table.querySelectorAll('*').length,
          columns: table.getAttribute('data-columns'),
          // TBL-8: no line under the last row of the table — the last body row's, unless a footer row follows it.
          lastBodyLine: getComputedStyle(last).borderBottomWidth,
          firstBodyLine: getComputedStyle(table.querySelector('tbody > tr > td')!).borderBottomWidth,
          aligned: getComputedStyle(table.querySelector('tbody > tr > td:nth-child(3)')!).textAlign,
        };
      });
      // What a component does while it is defined: attributes on itself — `type` is a name prose's `:has()` asks about
      // — and a child; each followed by a read of a style, as a component's own update is.
      const restyles: number[] = [];
      const collect = (event: { value: { name: string; args: { elementCount?: number } }[] }) => {
        for (const each of event.value) if (each.name === 'UpdateLayoutTree' && typeof each.args.elementCount === 'number') restyles.push(each.args.elementCount);
      };
      cdp.on('Tracing.dataCollected', collect);
      await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] } });
      const before = await styleSeconds(cdp);
      const writes = await page.evaluate(() => {
        const targets = [...document.querySelectorAll('#fixtures-table x-live')].filter((_, index) => index % 8 === 0).slice(0, 30);
        for (const target of targets) {
          target.setAttribute('type', 'text');
          void getComputedStyle(target).color;
          target.setAttribute('size', 'medium');
          void getComputedStyle(target).color;
          target.append(document.createElement('span'));
          void getComputedStyle(target).color;
        }
        return targets.length * 3;
      });
      const each = (((await styleSeconds(cdp)) - before) * 1000) / writes;
      const ended = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
      await cdp.send('Tracing.end');
      await ended;
      cdp.off('Tracing.dataCollected', collect);
      // The whole table, styled again: taken out, put back, and a style read — the least of several.
      const runs: number[] = [];
      for (let run = 0; run < RUNS; run++) {
        await page.evaluate(() => {
          const w = window as unknown as { table: Element; after: Element };
          w.table = document.querySelector('#fixtures-table')!;
          w.after = w.table.nextElementSibling!;
          w.table.remove();
          void getComputedStyle(document.body).color;
        });
        const start = await styleSeconds(cdp);
        await page.evaluate(() => {
          const w = window as unknown as { table: Element; after: Element };
          w.after.before(w.table);
          void getComputedStyle(w.table.querySelector('tbody > tr:last-child > td')!).color;
        });
        runs.push(((await styleSeconds(cdp)) - start) * 1000);
      }
      return { ...drawn, writes, each, whole: Math.min(...runs), restyles: restyles.length, most: Math.max(...restyles) };
    };

    const now = await measured('', false);
    const footed = await measured('', true);
    const asItWas = await measured(AS_IT_WAS, false);
    await cdp.detach();
    for (const [name, m] of Object.entries({ now, footed, asItWas })) {
      const line = `${name}: at most ${m.most} of ${m.elements} elements restyled by a write; ${m.each.toFixed(3)} ms a write, ${m.whole.toFixed(1)} ms the whole table`;
      console.log(`prose.perf (table) ${line}`);
      test.info().annotations.push({ type: 'style', description: line });
    }
    // The page is the one meant, and the table is drawn on it: the element read its columns, a column aligned by its
    // header alone, and nothing under the last body row unless a footer row follows.
    expect(now).toMatchObject({ columns: '4', writes: 90, aligned: 'right', lastBodyLine: '0px' });
    expect(now.elements).toBeGreaterThan(2_400);
    expect(Number.parseFloat(now.firstBodyLine)).toBeGreaterThan(0);
    expect(footed.lastBodyLine).toBe(footed.firstBodyLine);
    // Every write was styled by itself (a read follows each), and none restyled more than a handful of elements.
    expect(now.restyles).toBeGreaterThanOrEqual(now.writes);
    expect(now.most, `a write restyled ${now.most} of the table's ${now.elements} elements`).toBeLessThanOrEqual(TABLE_WRITE_ELEMENTS);
    expect(footed.most, `with a footer row, a write restyled ${footed.most} of ${footed.elements} elements`).toBeLessThanOrEqual(TABLE_WRITE_ELEMENTS);
    // …and the count sees the shape it is for: asked of the table for the sake of its rows, a write is the whole table,
    // and costs the style time of one.
    expect(asItWas.most, 'the count tells the old shape from the new').toBeGreaterThan(now.elements * 0.9);
    expect(now.each / asItWas.each, `a write costs ${now.each.toFixed(3)} ms of style time, and ${asItWas.each.toFixed(3)} ms in the old shape`).toBeLessThanOrEqual(TABLE_WRITE_TIME);
  });
});
