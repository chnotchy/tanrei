// What a large tree costs (specs/tree-view.spec.json; the tree of a design system's tokens holds thousands of rows): a
// tree of 5,000 items is defined, one parent is opened, one arrow key is pressed and one item is chosen, and what the
// browser did for each is read from the engine's own counters over the DevTools protocol — the time it spent in
// script, in style and in layout (`Performance.getMetrics`), and how many elements each style pass went through
// (`UpdateLayoutTree` in a trace), as prose.perf.test.ts does for a table.
//
// The page is the worst a product gives the tree: every stylesheet of the package, every element defined, and a
// `:has()` of the product's own on the root — after which every element of the page is one whose changes `:has()`
// may concern.
//
// What is held: one row's change — its focus, its selection, its open — styles that row and its own parts again, and
// never the tree — counted over every style pass the change takes, so another row restyled in a pass of its own
// still counts (one pass alone held 12 for an arrow key that also restyled the next row). The times are reported (as annotations and on the console), and held only loosely: a time is the
// machine's as much as the tree's.
//
// Chromium only: the counters are the DevTools protocol's.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CDPSession, type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const GROUPS = 50;
const LEAVES = 100;
/** A tree of 50 parents of 100 leaves each: 5,050 items, each row with an icon, a label and a trailing text. */
function lists(open: 'all' | 'first'): string {
  const row = (icon: string, label: string, value: string) => `<span><span class="tanrei-icon" aria-hidden="true">${icon}</span><bdi>${label}</bdi><span data-trailing-text>${value}</span></span>`;
  let html = '<ul>';
  for (let g = 0; g < GROUPS; g++) {
    html += `<li data-value="g${g}"${open === 'all' || g === 0 ? ' data-open' : ''}>${row('folder', `group-${g}`, String(LEAVES))}<ul>`;
    for (let l = 0; l < LEAVES; l++) html += `<li data-value="g${g}.t${l}">${row('draft', `token-${g}-${l}`, `#${(g * 1000 + l).toString(16).padStart(6, '0')}`)}</li>`;
    html += '</ul></li>';
  }
  return `${html}</ul>`;
}
const tree = (open: 'all' | 'first') => `<tanrei-tree-view id="tree" label="Every token" selection="single" density="compact" guides>${lists(open)}</tanrei-tree-view>`;

/** One row's change may style this many elements again, in all the style passes it takes: the row, its parts, the item, and what the page asks of its root. Counted: 12 for an arrow key (the row that loses focus and the row that takes it, six boxes each), 15 to 18 for a choice. */
const ROW_ELEMENTS = 16;
/** Opening one parent of 100 rows styles its rows and their parts for the first time: 100 rows. Counted: 702 (seven boxes a row). */
const OPEN_ELEMENTS = LEAVES * 8 + ROW_ELEMENTS;

interface Cost {
  script: number;
  style: number;
  layout: number;
  /** The most elements one style pass went through, how many passes there were, and the elements of all of them together. */
  most: number;
  passes: number;
  restyled: number;
}
const metrics = async (cdp: CDPSession) => {
  const { metrics: all } = await cdp.send('Performance.getMetrics');
  const of = (name: string) => all.find((m) => m.name === name)!.value * 1000;
  return { script: of('ScriptDuration'), style: of('RecalcStyleDuration'), layout: of('LayoutDuration') };
};
/**
 * What `act` cost: the engine's time in script, style and layout, and the elements its style passes went through.
 *
 * Counted from a tree at rest. A row pressed before — a click on a chevron, Enter on a row — keeps its pressed state for
 * press-hold after the press (BTN-8), and its end restyles that row. Ended inside the next count, it would be that count's:
 * one arrow key after a choice would count the chosen row let go in the same pass as the two rows of the arrow key. So no row of the tree is pressed when a
 * count begins, and the count holds what `act` does alone.
 */
async function cost(page: Page, cdp: CDPSession, act: () => Promise<void>): Promise<Cost> {
  await page.waitForFunction(() => !document.querySelector('#pane [data-pressed]'), undefined, { timeout: 10_000 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const restyles: number[] = [];
  const collect = (event: { value: { name: string; args: { elementCount?: number } }[] }) => {
    for (const each of event.value) if (each.name === 'UpdateLayoutTree' && typeof each.args.elementCount === 'number') restyles.push(each.args.elementCount);
  };
  cdp.on('Tracing.dataCollected', collect);
  await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] } });
  const before = await metrics(cdp);
  await act();
  // Drawn: two frames have passed.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const after = await metrics(cdp);
  const ended = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  await ended;
  cdp.off('Tracing.dataCollected', collect);
  return { script: after.script - before.script, style: after.style - before.style, layout: after.layout - before.layout, most: Math.max(0, ...restyles), passes: restyles.length, restyled: restyles.reduce((sum, n) => sum + n, 0) };
}
const said = (name: string, c: Cost) => {
  const line = `${name}: script ${c.script.toFixed(1)} ms, style ${c.style.toFixed(1)} ms, layout ${c.layout.toFixed(1)} ms; at most ${c.most} elements in one style pass, ${c.restyled} in all ${c.passes} passes`;
  console.log(`tree-view.perf ${line}`);
  test.info().annotations.push({ type: 'cost', description: line });
};

test.describe('a tree of 5,000 rows', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the counters are read over the DevTools protocol');

  test('TRV-9, TRV-15, TRV-20: defined, one parent opened, one arrow key and one choice — each change of one row styles that row again and never the tree, on a page with every stylesheet of the package and a :has() of the product’s own on its root', async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const manifest = JSON.parse(read('custom-elements.json')) as { modules: { declarations?: { tagName?: string }[] }[] };
    const tags = [...new Set(manifest.modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName).filter((t): t is string => !!t)), 'tanrei-tree-view'];
    const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css'));
    const PRODUCT = ':root:has(.product-menu-open) { --product-menu: 1; }';
    const head = `<meta charset="utf-8">${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}<style>${PRODUCT} body { margin: 0; } #pane { inline-size: 360px; block-size: 600px; overflow: auto; }</style>`;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const run = async (open: 'all' | 'first') => {
      // Without the script: what the lists themselves cost the browser, drawn by the stylesheet alone.
      await page.setContent(`<!doctype html><html lang="en"><head>${head}</head><body><div id="pane"></div></body></html>`);
      const put = (markup: string) =>
        page.evaluate((html) => {
          document.querySelector('#pane')!.innerHTML = html;
          void document.querySelector('#pane')!.getBoundingClientRect().height;
        }, markup);
      const alone = await cost(page, cdp, () => put(tree(open)));
      // With every element defined: the same lists, and what the element adds to them.
      await page.setContent(`<!doctype html><html lang="en"><head>${head}</head><body><div hidden>${tags.filter((tag) => tag !== 'tanrei-tree-view').map((tag) => `<${tag}></${tag}>`).join('')}</div><div id="pane"></div><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
      await page.waitForFunction((all) => all.every((tag) => !!customElements.get(tag)), tags);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const defined = await cost(page, cdp, () => put(tree(open)));
      const shown = await page.evaluate(() => [...document.querySelectorAll('#tree li')].filter((li) => li.firstElementChild!.checkVisibility()).length);
      const items = await page.evaluate(() => document.querySelectorAll(`#tree [role="treeitem"]`).length);
      return { alone, defined, shown, read: items };
    };

    // Everything open: 5,050 rows shown, all read.
    const all = await run('all');
    said(`defined, ${all.shown} rows shown — the lists alone`, all.alone);
    said(`defined, ${all.shown} rows shown — with the element`, all.defined);
    expect(all.shown).toBe(GROUPS * LEAVES + GROUPS);
    expect(all.read).toBe(all.shown);

    // One parent open, as a tool shows its tokens: 150 rows shown, and only they are read.
    const first = await run('first');
    said(`defined, ${first.shown} of 5,050 rows shown — the lists alone`, first.alone);
    said(`defined, ${first.shown} of 5,050 rows shown — with the element`, first.defined);
    expect(first.shown).toBe(GROUPS + LEAVES);
    expect(first.read).toBe(first.shown);
    // A tree costs what it shows: the closed parents' 4,900 items are not styled, laid out or read.
    expect(first.defined.most).toBeLessThan(all.defined.most / 4);

    // (The page is now the tree with one parent open.) One parent of 100 rows opened by its chevron.
    const chevron = await page.evaluate(() => {
      document.querySelector('#tree li[data-value="g1"] > span')!.scrollIntoView({ block: 'center' });
      const r = document.querySelector('#tree li[data-value="g1"] > span')!.getBoundingClientRect();
      return { x: r.left + 12, y: r.top + r.height / 2 };
    });
    const opened = await cost(page, cdp, () => page.mouse.click(chevron.x, chevron.y));
    said('one parent of 100 rows opened', opened);
    expect(await page.evaluate(() => document.querySelector('#tree li[data-value="g1"]')!.hasAttribute('data-open'))).toBe(true);
    expect(opened.most).toBeLessThanOrEqual(OPEN_ELEMENTS);

    // One arrow key: focus moves from one row to the next.
    await page.evaluate(() => (document.querySelector('#tree li[data-value="g0.t3"] > span') as HTMLElement).focus());
    await page.keyboard.press('ArrowDown');
    const arrow = await cost(page, cdp, () => page.keyboard.press('ArrowDown'));
    said('one arrow key', arrow);
    expect(await page.evaluate(() => document.activeElement?.parentElement?.getAttribute('data-value'))).toBe('g0.t5');
    expect(arrow.restyled, `an arrow key restyled ${arrow.restyled} elements`).toBeLessThanOrEqual(ROW_ELEMENTS);

    // One choice: Enter on a leaf — the row chosen and the row that was.
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    const chosen = await cost(page, cdp, () => page.keyboard.press('Enter'));
    said('one item chosen', chosen);
    expect(await page.evaluate(() => (document.querySelector('#tree') as HTMLElement & { value: string }).value)).toBe('g0.t6');
    expect(chosen.restyled, `a choice restyled ${chosen.restyled} elements`).toBeLessThanOrEqual(ROW_ELEMENTS * 2);

    // An arrow key onto an open parent of 100 rows, and off it again: the parent's own row, not the rows it holds.
    await page.evaluate(() => (document.querySelector('#tree li[data-value="g0.t0"] > span') as HTMLElement).focus());
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    const onto = await cost(page, cdp, () => page.keyboard.press('ArrowUp'));
    said('one arrow key onto an open parent of 100 rows', onto);
    expect(await page.evaluate(() => document.activeElement?.parentElement?.getAttribute('data-value'))).toBe('g0');
    expect(onto.restyled, `an arrow key onto a parent restyled ${onto.restyled} elements`).toBeLessThanOrEqual(ROW_ELEMENTS);

    // An open parent chosen: its own row, and the row that was chosen — not the 100 rows it holds. (With the tree item
    // on the `<li>`, which holds them, this was every row under it: 709 elements for the arrow key above.)
    await page.evaluate(() => (document.querySelector('#tree li[data-value="g0"] > span') as HTMLElement).focus());
    const parent = await cost(page, cdp, () => page.keyboard.press('Enter'));
    said('one open parent of 100 rows chosen', parent);
    expect(await page.evaluate(() => (document.querySelector('#tree') as HTMLElement & { value: string }).value)).toBe('g0');
    expect(parent.restyled, `choosing a parent restyled ${parent.restyled} elements`).toBeLessThanOrEqual(ROW_ELEMENTS * 2);
    await cdp.detach();
  });
});
