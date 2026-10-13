// <tanrei-tree-view> and tree-view.css, driven by specs/tree-view.spec.json: every behaviour id (TRV-1…42) is cited by a
// test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here. What a tree of thousands costs is measured in tree-view.perf.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type DocumentOptions, type Fixture, acmeSystemCss, fixturesDocument, iconFaceArrives, loadSpec, missingWords, mountFixtures, setWords, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../../test/icons.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';

const spec = loadSpec('tree-view');
type P = Page;
const TAG = 'tanrei-tree-view';
const T = (name: string) => `--tanrei-comp-tree-view-${name}`;

/** Every item is named after its label (`data-t`), so that a test can say which row it means. */
const nameItems = (page: P) =>
  page.evaluate(() => {
    for (const li of document.querySelectorAll('tanrei-tree-view li:not([data-tanrei-loading])')) {
      const row = li.firstElementChild;
      const label = row?.querySelector(':scope > bdi') ?? row;
      let text = '';
      for (const node of label?.childNodes ?? []) if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
      li.setAttribute('data-t', text.trim());
    }
  });
async function mount(page: P, options: DocumentOptions & { reducedMotion?: boolean } = {}) {
  await mountFixtures(page, spec, { icons: true, ...options });
  await nameItems(page);
  await defined(page);
}
/**
 * What the element writes when it is defined — `aria-selected` on the chosen rows — changes their colors, and where the
 * browser had already computed the rows' style (Firefox as a rule, every engine on a busy machine) they move there over
 * motion.state-duration: for that long a selected row's fill reads as its color at an alpha below one, and its label a
 * step from its color. A test reads a row at rest, so the mount ends when those transitions have. (A rule added after
 * the mount that sets their duration to nothing does not end the ones already running.) One inside a closed list that
 * is kept for the browser's find-in-page (`hidden="until-found"`) is skipped content: it is never begun, and Firefox
 * lists it as pending for as long as the list is closed — it is not waited for.
 */
const defined = (page: P) =>
  page.evaluate(async (tag) => {
    const moving = () =>
      [...document.querySelectorAll(tag)]
        .flatMap((tree) => tree.getAnimations({ subtree: true }))
        .filter((a) => a instanceof CSSTransition && a.playState === 'running' && !(a.effect as KeyframeEffect).target?.closest('[hidden]'));
    for (let running = moving(); running.length > 0; running = moving()) await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }, TAG);
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** An item of a fixture's tree, by its label. */
const item = (page: P, id: string, label: string) => host(page, id).locator(`li[data-t="${label}"]`);
const row = (page: P, id: string, label: string) => item(page, id, label).locator('> :first-child');
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/**
 * What a row draws: its own box (the hit area), its container (the row's `::after`), the chevron's box (its
 * `::before`), and where its label's text is.
 */
const drawn = (locator: Locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    const before = getComputedStyle(el, '::before');
    const r = el.getBoundingClientRect();
    const rtl = s.direction === 'rtl';
    const size = Number.parseFloat(before.width);
    const rows = s.gridTemplateRows.split(' ').reduce((sum, track) => sum + (Number.parseFloat(track) || 0), 0);
    const top = r.top + Number.parseFloat(s.paddingTop) + (r.height - Number.parseFloat(s.paddingTop) - Number.parseFloat(s.paddingBottom) - rows) / 2;
    const start = Number.parseFloat(rtl ? s.paddingRight : s.paddingLeft);
    const label = [...el.childNodes].find((n) => (n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()) || (n instanceof Element && !n.matches('.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text], [data-tanrei-loading-box], .ripple')));
    const range = document.createRange();
    let text = null;
    if (label) {
      const first = label.nodeType === Node.TEXT_NODE ? label : ([...label.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()) ?? label);
      range.selectNodeContents(first);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
      const b = range.getBoundingClientRect();
      const tops: number[] = [];
      for (const rect of rects) if (!tops.some((t) => Math.abs(t - rect.top) < rect.height / 2)) tops.push(rect.top);
      text = { left: b.left, right: b.right, top: b.top, bottom: b.bottom, lines: tops.length, first: rects[0] ? { top: rects[0].top, bottom: rects[0].bottom, left: rects[0].left, right: rects[0].right } : null };
    }
    return {
      row: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height },
      container: { left: r.left + Number.parseFloat(after.left), right: r.right - Number.parseFloat(after.right), top: r.top + Number.parseFloat(after.top), bottom: r.bottom - Number.parseFloat(after.bottom) },
      chevron: { size, top: top + Number.parseFloat(before.marginTop), left: rtl ? r.right - start - size : r.left + start, right: rtl ? r.right - start : r.left + start + size, content: before.content, rotate: before.rotate, scale: before.scale, color: before.color },
      // (The row's line, as a length: its computed `line-height`, which the label's text style gives as a number.)
      line: Number.parseFloat(s.lineHeight),
      firstLine: top,
      text,
      rtl,
    };
  });
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
/** Every `toggle` and `change` on the page, in order: `toggle:<label>:<open>`, `change:<detail>`. */
const watch = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    document.addEventListener('toggle', (event) => {
      const li = event.target as Element;
      if (li.localName === 'li') w.__events.push(`toggle:${li.getAttribute('data-t')}:${(event as CustomEvent<{ open: boolean }>).detail.open}`);
    });
    document.addEventListener('change', (event) => w.__events.push(`change:${JSON.stringify((event as CustomEvent).detail)}`));
  });
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** The lists whose height is being moved now. */
const moving = (page: P) => page.evaluate(() => document.querySelectorAll('tanrei-tree-view [data-tanrei-moving]').length);
const settled = (page: P) => expect.poll(() => moving(page), { timeout: 5000 }).toBe(0);
/** The label of the row that has focus (the row is what takes it), or the name of whatever else has. */
const focused = (page: P) => page.evaluate(() => (document.activeElement?.getAttribute('role') === 'treeitem' ? document.activeElement.parentElement!.getAttribute('data-t') : (document.activeElement?.localName ?? null)));
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
/** A fixture whose lists are written by the test. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
/** No fill: a transparent color, however the browser writes one. */
const CLEAR = /^(rgba\(0, 0, 0, 0\)|transparent|.*\/ 0\))$/;
/** A font family as a name, however the engine quotes it. */
const unquoted = (family: string) => family.replaceAll(/["']/g, '').trim();
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const still = `${TAG} li > :first-child, ${TAG} li > :first-child::before, ${TAG} li > :first-child::after, ${TAG} li > :first-child * { transition-duration: 0s !important; }`;
/** The rows that are shown, top to bottom, by their labels. */
const shownRows = (page: P, id: string) =>
  host(page, id).evaluate((tree) =>
    [...tree.querySelectorAll('li[data-t]')]
      .filter((li) => li.firstElementChild!.checkVisibility())
      .map((li) => ({ label: li.getAttribute('data-t')!, box: li.firstElementChild!.getBoundingClientRect() }))
      .sort((a, b) => a.box.top - b.box.top)
      .map((each) => each.label),
  );
/** A small tree of a test's own: two parents with values, one inside the other, and leaves. */
const SMALL = `<ul>
  <li data-value="a" data-open><span>Alpha</span><ul>
    <li data-value="a1"><span>Apple</span></li>
    <li data-value="a2" data-open><span>Apricot</span><ul><li data-value="a2x"><span>Almond</span></li></ul></li>
    <li data-value="a3" data-disabled><span>Avocado</span></li>
  </ul></li>
  <li data-value="b"><span>Beta</span><ul><li data-value="b1"><span>Banana</span></li></ul></li>
  <li><span>Gamma</span><ul><li><span>Grape</span></li></ul></li>
  <li data-value="d"><span>Delta</span></li>
  <li><span>Epsilon</span></li>
</ul>`;

test.describe('the column, the rows and their parts', () => {
  test('TRV-1: one column of rows in the order given, depth first; as wide as its layout, with no space, fill, edge, size or scroll of its own; rows touch', async ({ page }) => {
    await mount(page, { fixtures: some('basic', 'all-closed') });
    expect(await shownRows(page, 'basic')).toEqual(['src', 'components', 'button.ts', 'checkbox.ts', 'tree-view.ts', 'styles', 'index.ts', 'test', 'package.json', 'README.md']);
    expect(await shownRows(page, 'all-closed')).toEqual(['src', 'test', 'package.json', 'README.md']);
    const tree = host(page, 'basic');
    const box = await edges(tree);
    const outer = await edges(stage(page, 'basic'));
    // (The stage's own padding is 16.)
    near(box.left, outer.left + 16);
    near(box.right, outer.right - 16);
    for (const property of ['margin-top', 'margin-left', 'padding-top', 'padding-left', 'border-top-width', 'border-left-width']) expect(await px(tree, property)).toBe(0);
    expect(await css(tree, 'background-color')).toMatch(CLEAR);
    expect(await css(tree, 'overflow')).toBe('visible');
    expect(['0px', 'auto']).toContain(await css(tree, 'min-width'));
    expect(await css(tree, 'max-width')).toBe('none');
    // Rows touch, and the tree is as tall as the rows it shows.
    const rows = await tree.evaluate((el) => [...el.querySelectorAll('li > :first-child')].filter((r) => r.checkVisibility()).map((r) => r.getBoundingClientRect()).map((r) => [r.top, r.bottom]));
    for (let n = 1; n < rows.length; n++) near(rows[n][0], rows[n - 1][1], 0.1);
    near(box.top, rows[0][0], 0.1);
    near(box.bottom, rows.at(-1)![1], 0.1);
  });

  test('TRV-2: a row is at least its density’s height and grows with its text, padded by its density’s paddings; from the start it holds the chevron’s box, the icon, the text, the trailing content and the trailing text, a gap between each two; each is centred on the label’s first line, and height beyond the text is shared above and below', async ({ page }) => {
    await mount(page, {
      fixtures: [
        ...some('all-parts', 'all-parts-compact', 'long-labels'),
        raw('parts', { label: 'Parts' }, '<ul><li><span><span class="tanrei-icon">folder</span><bdi>Label</bdi><span data-trailing><span id="mark" style="display:block;inline-size:8px;block-size:30px;background:currentColor"></span></span><span data-trailing-text>12</span></span></li></ul>'),
        raw('small-trailing', { label: 'Small' }, '<ul><li><span><bdi>Label</bdi><small data-trailing id="small" style="font-size: 10px">new</small></span></li></ul>'),
      ],
    });
    for (const [id, density] of [
      ['all-parts', 'regular'],
      ['all-parts-compact', 'compact'],
    ] as const) {
      const height = await resolveToken(page, T(`container-height-${density}`));
      const padInline = await resolveToken(page, T(`container-padding-inline-${density}`));
      const gap = await resolveToken(page, T(`container-gap-${density}`));
      const chevron = await resolveToken(page, T(`chevron-size-${density}`));
      const icon = await resolveToken(page, T(`icon-size-${density}`));
      const target = density === 'regular' ? await resolveToken(page, '--tanrei-sys-target-pointer') : 0;
      const r = row(page, id, 'package.json');
      const d = await drawn(r);
      expect(d.row.height).toBe(Math.max(height, target));
      // From the start: the chevron's box, the gap, the icon, the gap, the text … the trailing text, the padding.
      near(d.chevron.left, d.row.left + padInline);
      expect(d.chevron.size).toBe(chevron);
      const glyph = await edges(r.locator('> .tanrei-icon'));
      near(glyph.left, d.chevron.right + gap);
      expect(glyph.width).toBe(icon);
      near(d.text!.left, glyph.right + gap);
      const value = await edges(r.locator('> [data-trailing-text]'));
      near(value.right, d.row.right - padInline);
      // Each is centred on the label's first line; one line is centred in the row.
      const middle = d.firstLine + d.line / 2;
      near(d.chevron.top + chevron / 2, middle);
      near((glyph.top + glyph.bottom) / 2, middle);
      near((value.top + value.bottom) / 2, middle, 1);
      near(middle, (d.row.top + d.row.bottom) / 2);
      expect(await css(r, 'border-top-left-radius', '::after')).toBe(`${await resolveToken(page, T('container-shape'))}px`);
    }
    // A row that grows: the padding above its first line and below its last, the parts still on the first line.
    const long = row(page, 'long-labels', 'swiftui/Sources/Tanrei/Generated/TanreiTokens.swift');
    const d = await drawn(long);
    const pad = await resolveToken(page, T('container-padding-block-regular'));
    expect(d.text!.lines).toBeGreaterThan(1);
    near(d.firstLine, d.row.top + pad);
    const lastLine = await long.locator('[data-supporting-text]').evaluate((el) => Math.max(...[...el.getClientRects()].map((rect) => rect.bottom)));
    near(d.row.bottom - pad, d.firstLine + Math.round((lastLine - d.firstLine) / d.line) * d.line, 1.5);
    near(d.chevron.top + d.chevron.size / 2, d.firstLine + d.line / 2);
    const size = await edges(long.locator('> [data-trailing-text]'));
    near((size.top + size.bottom) / 2, d.firstLine + d.line / 2, 1);
    // The trailing content stands before the trailing text, a gap from each neighbour, centred on the first line whatever its height.
    const parts = await drawn(row(page, 'parts', 'Label'));
    const mark = await edges(page.locator('#mark'));
    const text = await edges(row(page, 'parts', 'Label').locator('> [data-trailing-text]'));
    near(mark.right + (await resolveToken(page, T('container-gap-regular'))), text.left);
    near((mark.top + mark.bottom) / 2, parts.firstLine + parts.line / 2);
    // … and whatever font size the product gives its element: its box is one line of the LABEL high, on that line.
    const small = await drawn(row(page, 'small-trailing', 'Label'));
    const box = await edges(page.locator('#small'));
    near(box.bottom - box.top, small.line);
    near((box.top + box.bottom) / 2, small.firstLine + small.line / 2);
  });

  test('TRV-3: a first-level container begins at the tree’s start edge and each deeper one level.indent further in — its fill and focus indicator, not its content alone — and all end at the tree’s end edge; where a level’s indent would take more than half of the width the row begins where the deepest level that fits begins, its true level is still exposed, and the depth is reported once', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, { fixtures: some('deep', 'compact') });
    for (const [id, density, labels] of [
      ['deep', 'regular', ['Catalogue', 'Furniture', 'Seating', 'Chairs', 'Office chairs', 'With armrests']],
      ['compact', 'compact', ['src', 'components', 'button.ts']],
    ] as const) {
      const indent = await resolveToken(page, T(`level-indent-${density}`));
      const tree = await edges(host(page, id));
      for (const [level, label] of labels.entries()) {
        const d = await drawn(row(page, id, label));
        near(d.container.left, tree.left + indent * level);
        near(d.container.right, tree.right);
        // The row itself — the hit area — is the tree's whole width.
        near(d.row.left, tree.left);
        near(d.row.right, tree.right);
      }
    }
    expect(seen.filter((text) => text.includes('TRV-3'))).toEqual([]);
    // 200 wide: half is 100, and the deepest level that fits begins 96 in (three indents of 32).
    await page.addStyleTag({ content: `[data-fixture="deep"] { inline-size: 232px !important; }` });
    const indent = await resolveToken(page, T('level-indent-regular'));
    const tree = await edges(host(page, 'deep'));
    const fits = Math.floor(tree.width / 2 / indent);
    expect(fits).toBe(3);
    for (const [level, label] of ['Catalogue', 'Furniture', 'Seating', 'Chairs', 'Office chairs', 'With armrests'].entries()) {
      near((await drawn(row(page, 'deep', label))).container.left, tree.left + indent * Math.min(level, fits));
    }
    // The guide of a level past the limit stands under its parent's chevron all the same.
    expect(await row(page, 'deep', 'With armrests').getAttribute('aria-level')).toBeNull();
    // Reported once, when the user first acts.
    await tabTo(page, row(page, 'deep', 'Catalogue'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(seen.filter((text) => text.includes('TRV-3'))).toHaveLength(1);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    expect(nodes.find((node) => node.role?.value === 'treeitem' && node.name?.value === 'With armrests')?.properties?.find((p) => p.name === 'level')?.value.value).toBe(6);
  });

  test('TRV-4: every row keeps the chevron’s box at its start; a parent’s draws chevron_right in the chevron color, as drawn while it is closed and turned a quarter turn while it is open; a leaf’s draws nothing, so that the names of one level begin on one line; nothing else about a row tells open from closed; a disabled parent keeps its chevron', async ({ page }) => {
    await mount(page, { fixtures: some('basic', 'compact', 'trailing-text', 'disabled') });
    for (const [id, density] of [
      ['basic', 'regular'],
      ['compact', 'compact'],
    ] as const) {
      const size = await resolveToken(page, T(`chevron-size-${density}`));
      const open = await drawn(row(page, id, 'src'));
      const closed = await drawn(row(page, id, 'styles'));
      const leaf = await drawn(row(page, id, 'index.ts'));
      for (const d of [open, closed, leaf]) expect(d.chevron.size).toBe(size);
      expect(open.chevron.content).toContain('chevron_right');
      expect(closed.chevron.content).toContain('chevron_right');
      expect(leaf.chevron.content).not.toContain('chevron_right');
      expect(closed.chevron.rotate).toBe('none');
      expect(open.chevron.rotate).toBe('90deg');
      expect(closed.chevron.color).toBe(await resolveColor(page, T('unselected-chevron-color')));
      // A leaf and a parent of one level begin their names on one line.
      near(leaf.text!.left, closed.text!.left);
    }
    // The glyph is the icon set's, outlined; an item that says it will hold items is a parent.
    expect(unquoted(await css(row(page, 'basic', 'src'), 'font-family', '::before'))).toBe(unquoted(await css(page.locator('html'), '--tanrei-sys-icon-family-unselected')));
    // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
    expect(await drawnOpticalSize(row(page, 'basic', 'src'), '::before')).toBe(await opticalSize(page, await resolveToken(page, T('chevron-size-regular'))));
    expect((await drawn(row(page, 'trailing-text', 'test'))).chevron.content).toContain('chevron_right');
    // Open and closed rows are the same but for the chevron.
    for (const property of ['color', 'font', 'min-height', 'padding-left']) expect(await css(row(page, 'basic', 'src'), property)).toBe(await css(row(page, 'basic', 'test'), property));
    expect(await css(row(page, 'basic', 'src'), 'background-color', '::after')).toBe(await css(row(page, 'basic', 'test'), 'background-color', '::after'));
    // Hidden from assistive technology: the alternative of the content is empty where the browser reads one.
    expect(await row(page, 'basic', 'src').getAttribute('aria-expanded')).toBe('true');
    expect((await drawn(row(page, 'disabled', 'themes'))).chevron.content).toContain('chevron_right');
    expect((await drawn(row(page, 'disabled', 'generated'))).chevron.content).toContain('chevron_right');
  });

  test('TRV-5: an icon is the glyph of that name after the chevron’s box, in the density’s box and the condition’s icon color, outlined — filled while its own item is selected — and hidden from assistive technology; with no icon no room is kept; an item that names no open icon draws the same glyph open and closed', async ({ page }) => {
    await mount(page, { fixtures: some('icons', 'basic', 'single-parent-selected', 'compact') });
    const size = await resolveToken(page, T('icon-size-regular'));
    const glyph = row(page, 'icons', 'src').locator('> .tanrei-icon');
    expect((await edges(glyph)).width).toBe(size);
    expect((await edges(glyph)).height).toBe(size);
    expect((await edges(row(page, 'compact', 'src').locator('> .tanrei-icon'))).width).toBe(await resolveToken(page, T('icon-size-compact')));
    expect(await css(glyph, 'color')).toBe(await resolveColor(page, T('unselected-icon-color')));
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(await glyph.textContent()).toBe('folder');
    expect(await row(page, 'icons', 'styles').locator('> .tanrei-icon').textContent()).toBe('folder');
    // No icon: the label begins a gap after the chevron's box.
    const bare = await drawn(row(page, 'basic', 'src'));
    near(bare.text!.left, bare.chevron.right + (await resolveToken(page, T('container-gap-regular'))));
    // Selected: the selected family and fill, on its own row and not on the rows under it.
    const fill = (locator: Locator) => css(locator, 'font-variation-settings');
    const selected = row(page, 'single-parent-selected', 'components').locator('> .tanrei-icon');
    const under = row(page, 'single-parent-selected', 'button.ts').locator('> .tanrei-icon');
    const on = Number(await css(page.locator('html'), '--tanrei-sys-icon-fill-selected'));
    const off = Number(await css(page.locator('html'), '--tanrei-sys-icon-fill-unselected'));
    expect(on).not.toBe(off);
    // (The fill moves to its value over the icon's own transition once the element has marked the selection.)
    await expect.poll(() => fill(selected)).toContain(`"FILL" ${on}`);
    expect(await fill(under)).toContain(`"FILL" ${off}`);
    expect(await css(selected, 'color')).toBe(await resolveColor(page, T('selected-icon-color')));
    expect(unquoted(await css(selected, 'font-family'))).toBe(unquoted(await css(page.locator('html'), '--tanrei-sys-icon-family-selected')));
  });

  test('TRV-6: the label is drawn in its density’s text style and its condition’s color, wraps and is never cut, and a name with no place to break breaks where it must; content in the label’s place is drawn in the label’s style and a code span keeps its typeface; a control in a row is still rendered, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, {
      fixtures: [
        ...some('long-labels', 'compact', 'single'),
        raw('slots', { label: 'Slots' }, '<ul><li><span><bdi>The <code style="font-family: monospace">id</code> of a <mark>tok</mark>en</bdi></span></li><li><span>Plain <a href="#x">a link</a></span></li><li><span><bdi>ok</bdi><span data-trailing><button>x</button></span></span></li></ul>'),
      ],
    });
    const probe = async (density: string) => {
      await page.evaluate((d) => {
        const el = document.createElement('p');
        el.id = `probe-${d}`;
        el.style.cssText = `font: var(--tanrei-comp-tree-view-label-typescale-${d}-font); letter-spacing: var(--tanrei-comp-tree-view-label-typescale-${d}-letter-spacing)`;
        document.body.append(el);
      }, density);
      return page.locator(`#probe-${density}`);
    };
    for (const [id, density, label] of [
      ['long-labels', 'regular', 'packages'],
      ['compact', 'compact', 'src'],
    ] as const) {
      const expected = await probe(density);
      for (const property of ['font-size', 'line-height', 'font-weight', 'letter-spacing']) expect(await css(row(page, id, label).locator('> bdi'), property)).toBe(await css(expected, property));
      expect(await css(row(page, id, label), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    }
    expect(await css(row(page, 'single', 'checkbox.ts'), 'color')).toBe(await resolveColor(page, T('selected-label-color')));
    // Nothing is cut and nothing widens the tree.
    const tree = host(page, 'long-labels');
    expect(await tree.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const label of ['a-file-name-with-no-place-to-break-that-is-longer-than-the-tree-is-wide.generated.tokens.json', 'The colors, sizes, text styles and motion of every component, for the three shipped presets']) {
      const r = row(page, 'long-labels', label);
      const d = await drawn(r);
      expect(d.text!.lines).toBeGreaterThan(1);
      expect(d.text!.right).toBeLessThanOrEqual(d.row.right + 0.5);
      expect(await css(r.locator('> bdi'), 'text-overflow')).toBe('clip');
      expect(await r.locator('> bdi').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    // The label slot: in the label's place and style; a code span keeps its own typeface.
    const own = host(page, 'slots').locator('li').first().locator('> span > bdi');
    expect(await css(own, 'font-size')).toBe(await css(row(page, 'long-labels', 'packages').locator('> bdi'), 'font-size'));
    expect(await css(own.locator('code'), 'font-family')).toBe('monospace');
    await expect(host(page, 'slots').locator('a')).toBeVisible();
    await expect(host(page, 'slots').locator('button')).toBeVisible();
    expect(seen.filter((text) => text.includes('TRV-6') && text.includes('<a>'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('TRV-6') && text.includes('<button>'))).toHaveLength(1);
  });

  test('TRV-7: the supporting text goes on after the label in the same block of text, a gap after its last word and on its baseline, in its own text style and color, and wraps with it; the trailing text is one line at the end of the row and is cut with an ellipsis where it would take more than half of the row’s inner width; the trailing content stands before it, unstyled', async ({ page }) => {
    await mount(page, {
      fixtures: [
        ...some('all-parts', 'supporting-text', 'long-labels'),
        raw('half', { label: 'Half' }, '<ul><li><span><bdi>Name</bdi><span data-trailing-text id="long-value">a trailing value that is far longer than half of the width of the row it stands in</span></span></li><li><span><bdi>Tag</bdi><span data-trailing id="slot"><b>new</b></span><span data-trailing-text>3</span></span></li></ul>'),
      ],
    });
    const gap = await resolveToken(page, T('container-gap-regular'));
    const r = row(page, 'all-parts', 'src');
    const supporting = r.locator('[data-supporting-text]');
    const d = await drawn(r);
    const first = await supporting.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = [...range.getClientRects()].filter((each) => each.width > 0)[0];
      return { left: rect.left, top: rect.top, bottom: rect.bottom };
    });
    near(first.left, d.text!.right + gap, 1);
    // On the label's line: its smaller text sits within the label's line box.
    expect(first.top).toBeGreaterThanOrEqual(d.firstLine - 0.5);
    expect(first.bottom).toBeLessThanOrEqual(d.firstLine + d.line + 0.5);
    expect(await css(supporting, 'color')).toBe(await resolveColor(page, T('unselected-supporting-text-color')));
    // (The selected row's colors move to their values over the state duration once the element has marked the selection.)
    await expect.poll(() => css(row(page, 'all-parts', 'index.ts').locator('[data-supporting-text]'), 'color')).toBe(await resolveColor(page, T('selected-supporting-text-color')));
    const style = await page.evaluate(() => {
      const el = document.createElement('p');
      el.style.cssText = 'font: var(--tanrei-comp-tree-view-supporting-text-typescale-font)';
      document.body.append(el);
      return getComputedStyle(el).fontSize;
    });
    expect(await css(supporting, 'font-size')).toBe(style);
    // It wraps with the label and is never cut.
    const wrapped = row(page, 'supporting-text', 'generated/').locator('[data-supporting-text]');
    expect(await wrapped.evaluate((el) => new Set([...el.getClientRects()].filter((each) => each.width > 0).map((each) => Math.round(each.top))).size)).toBeGreaterThan(1);
    // The trailing text: one line, the condition's color, its own text style.
    const value = r.locator('> [data-trailing-text]');
    expect(await css(value, 'white-space')).toBe('nowrap');
    expect(await css(value, 'color')).toBe(await resolveColor(page, T('unselected-trailing-text-color')));
    expect(await css(row(page, 'all-parts', 'index.ts').locator('> [data-trailing-text]'), 'color')).toBe(await resolveColor(page, T('selected-trailing-text-color')));
    expect(await value.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // More than half: cut, and the label keeps at least half.
    const long = page.locator('#long-value');
    const inner = await long.evaluate((el) => {
      const s = getComputedStyle(el.parentElement!);
      return el.parentElement!.getBoundingClientRect().width - Number.parseFloat(s.paddingLeft) - Number.parseFloat(s.paddingRight);
    });
    expect(await css(long, 'text-overflow')).toBe('ellipsis');
    expect(await long.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // (Half of what the chevron's box leaves: the label keeps at least as much as the trailing text takes.)
    const lead = (await resolveToken(page, T('chevron-size-regular'))) + gap;
    expect((await edges(long)).width + gap).toBeLessThanOrEqual((inner - lead) / 2 + 0.5);
    expect((await drawn(page.locator('#long-value').locator('xpath=..'))).text!.right - (await drawn(page.locator('#long-value').locator('xpath=..'))).text!.left).toBeGreaterThan(20);
    // The trailing content: before the trailing text, with no style of the tree's.
    const slot = await edges(page.locator('#slot'));
    const count = await edges(page.locator('#slot + [data-trailing-text]'));
    near(slot.right + gap, count.left);
    expect(await css(page.locator('#slot b'), 'font-weight')).toBe('700');
  });

  test('TRV-8: with guides, each open parent that shows a row draws one line of guide.width in guide.color from the lower edge of its row to the lower edge of the last row under it, centred under its chevron’s box; it keeps its color beside a disabled row, takes no space, and is not drawn without guides', async ({ page }) => {
    await mount(page, { fixtures: [...some('guides', 'icons', 'compact-guides', 'multiple-parent-and-child'), raw('guided-loading', { label: 'Guided', guides: true, loadingLabel: 'Loading…' }, '<ul><li data-open data-expandable data-loading><span>Remote</span></li><li data-open><span>Dim</span><ul><li data-disabled><span>Off</span></li></ul></li></ul>')] });
    const line = (id: string, label: string) =>
      item(page, id, label)
        .locator('> ul')
        .evaluate((list) => {
          const s = getComputedStyle(list, '::before');
          const r = list.getBoundingClientRect();
          const left = r.left + Number.parseFloat(s.left);
          return { content: s.content, width: Number.parseFloat(s.borderLeftWidth), color: s.borderLeftColor, left, top: r.top + Number.parseFloat(s.top), bottom: r.bottom - Number.parseFloat(s.bottom), opacity: s.opacity, events: s.pointerEvents };
        });
    for (const [id, density] of [
      ['guides', 'regular'],
      ['compact-guides', 'compact'],
    ] as const) {
      const width = await resolveToken(page, T('guide-width'));
      for (const [parent, last] of [
        ['src', 'index.ts'],
        ['components', 'tree-view.ts'],
      ] as const) {
        const l = await line(id, parent);
        const d = await drawn(row(page, id, parent));
        expect(l.width).toBe(width);
        expect(l.color).toBe(await resolveColor(page, T('guide-color')));
        near(l.left + width / 2, (d.chevron.left + d.chevron.right) / 2);
        near(l.top, d.row.bottom);
        near(l.bottom, (await drawn(row(page, id, last))).row.bottom);
        expect(l.events).toBe('none');
      }
      expect(density).toBeTruthy();
    }
    // The same layout with and without; no line without.
    const boxes = (id: string) => host(page, id).evaluate((tree) => [...tree.querySelectorAll('li > :first-child, li > :first-child > *')].map((r) => r.getBoundingClientRect()).map((r) => [r.left, r.top, r.width, r.height]));
    const guided = await boxes('multiple-parent-and-child');
    await host(page, 'multiple-parent-and-child').evaluate((el) => el.removeAttribute('guides'));
    expect(await boxes('multiple-parent-and-child')).toEqual(guided);
    expect(await item(page, 'icons', 'src').locator('> ul').evaluate((list) => getComputedStyle(list, '::before').content)).toBe('none');
    // A loading row is run beside too, and a disabled row's opacity does not reach the line.
    const remote = await line('guided-loading', 'Remote');
    near(remote.bottom, (await edges(item(page, 'guided-loading', 'Remote').locator('li[data-tanrei-loading]'))).bottom);
    expect(remote.bottom - remote.top).toBeGreaterThan(0);
    expect((await line('guided-loading', 'Dim')).opacity).toBe('1');
    expect(await css(item(page, 'guided-loading', 'Dim').locator('> ul'), 'opacity')).toBe('1');
  });
});

test.describe('open and closed', () => {
  test('TRV-9: open is the state of that parent alone — a closed parent’s rows are not drawn, take no space, cannot take focus and are not exposed, and keep their own open; the first frame is drawn as the items say, without motion and without toggle; a leaf’s open is ignored; the items stay in the document', async ({ page }) => {
    // From before the element is defined: every toggle, and every list whose height is moved.
    const early = `<script>window.__early = []; document.addEventListener('toggle', (event) => window.__early.push(event.target.localName)); new MutationObserver(() => { if (document.querySelector('[data-tanrei-moving]')) window.__early.push('moving'); }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-tanrei-moving'] });</script>`;
    const document = await fixturesDocument(spec, { icons: true, fixtures: [...some('basic'), raw('kept', { label: 'Kept' }, '<ul><li><span>Outer</span><ul><li data-open><span>Inner</span><ul><li><span>Deep</span></li></ul></li></ul></li><li data-open><span>Leaf</span></li></ul>')] });
    await page.setContent(document.replace('<head>', `<head>${early}`));
    await page.waitForFunction(() => !!customElements.get('tanrei-tree-view'));
    await frame(page);
    await nameItems(page);
    expect(await page.evaluate(() => (window as unknown as { __early: string[] }).__early)).toEqual([]);
    expect(await moving(page)).toBe(0);
    // Closed: not drawn, no space, kept in the document.
    const closed = item(page, 'basic', 'styles');
    await expect(closed.locator('li')).toHaveCount(2);
    for (const inner of await closed.locator('li > :first-child').all()) expect(await inner.evaluate((el) => el.checkVisibility())).toBe(false);
    expect((await edges(closed.locator('> ul'))).height).toBe(0);
    near((await edges(closed)).height, (await edges(row(page, 'basic', 'styles'))).height);

    // Not in the focus order and not reachable by the arrow keys.
    await tabTo(page, row(page, 'basic', 'src'));
    for (let n = 0; n < 5; n++) await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('styles');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('index.ts');
    // A closed parent keeps its descendants' open: it opens again as it was.
    await expect(item(page, 'kept', 'Inner')).toHaveAttribute('data-open', '');
    expect(await shownRows(page, 'kept')).toEqual(['Outer', 'Leaf']);
    await row(page, 'kept', 'Outer').click();
    await settled(page);
    expect(await shownRows(page, 'kept')).toEqual(['Outer', 'Inner', 'Deep', 'Leaf']);
    // A leaf's open is ignored: no chevron, no expanded state.
    expect((await drawn(row(page, 'kept', 'Leaf'))).chevron.content).not.toContain('chevron_right');
    expect(await row(page, 'kept', 'Leaf').getAttribute('aria-expanded')).toBeNull();
  });

  test('TRV-10: a press on a parent’s chevron emits its toggle once with the new state, sets its open and leaves the selection; a press anywhere on the row of a parent that cannot be chosen, and Enter or Space on it, do the same; a press on the row of an item that can be chosen chooses it and opens nothing; resting the pointer opens nothing, and two quick presses are answered one by one', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small', selection: 'single' }, SMALL)] });
    await nameItems(page);
    await watch(page);
    const beta = await drawn(row(page, 'small', 'Beta'));
    // The chevron of a parent that can be chosen: toggles, and chooses nothing.
    await page.mouse.click((beta.chevron.left + beta.chevron.right) / 2, (beta.row.top + beta.row.bottom) / 2);
    expect(await events(page)).toEqual(['toggle:Beta:true']);
    await expect(item(page, 'small', 'Beta')).toHaveAttribute('data-open', '');
    expect(await host(page, 'small').evaluate((el: HTMLElement & { value: string | null }) => el.value)).toBeNull();
    await settled(page);
    // Its row, outside the chevron: chooses, and neither opens nor closes.
    await page.mouse.click(beta.row.right - 20, (beta.row.top + beta.row.bottom) / 2);
    expect(await events(page)).toEqual(['change:{"value":"b"}']);
    await expect(item(page, 'small', 'Beta')).toHaveAttribute('data-open', '');
    // A parent that cannot be chosen: the whole row opens and closes it — its far end, and Enter and Space.
    const gamma = await drawn(row(page, 'small', 'Gamma'));
    await page.mouse.click(gamma.row.right - 4, gamma.row.top + 4);
    expect(await events(page)).toEqual(['toggle:Gamma:true']);
    await settled(page);
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['toggle:Gamma:false']);
    await settled(page);
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual(['toggle:Gamma:true']);
    await settled(page);
    // Resting the pointer opens nothing; each of two quick presses is answered by itself.
    await row(page, 'small', 'Gamma').hover();
    await page.waitForTimeout(700);
    expect(await events(page)).toEqual([]);
    await row(page, 'small', 'Gamma').dblclick();
    expect(await events(page)).toEqual(['toggle:Gamma:false', 'toggle:Gamma:true']);
  });

  test('TRV-11: a change of open reveals or hides the rows under the parent from its row downward and turns its chevron over motion.disclosure-duration with its easing — the rows laid out once, only how much of them is seen moving; rows being hidden stay drawn until the end and leave the keys at once; a change on the way goes on from where the height is; toggle is emitted when the change begins; at once where motion is reduced', async ({ page }) => {
    await mount(page, { fixtures: some('basic') });
    await watch(page);
    const duration = await resolveToken(page, T('motion-disclosure-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    await override(page, { [T('motion-disclosure-duration')]: '600ms' });
    const list = item(page, 'basic', 'test').locator('> ul');
    const below = row(page, 'basic', 'package.json');
    const before = (await edges(below)).top;
    // The list's motion is read, and held where it begins, in the task of the click that starts it, after the element
    // has answered it: seven questions stand between the click and the reading on the way, and a runner that takes a
    // second over them would find a motion of 600 ms over.
    await page.evaluate(() => {
      window.addEventListener(
        'click',
        () => {
          const motions = document.querySelector('[data-tanrei-moving]')?.getAnimations() ?? [];
          (window as any).begun = motions.map((a) => ({ duration: (a.effect!.getTiming().duration as number) || 0, easing: a.effect!.getTiming().easing, properties: (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))) }));
          for (const motion of motions) motion.pause();
        },
        { once: true },
      );
    });
    await row(page, 'basic', 'test').click();
    // Begun: the toggle is out, one animation moves the list's height, the row under it is laid out at its size.
    expect(await events(page)).toEqual(['toggle:test:true']);
    const running = await page.evaluate(() => (window as any).begun as { duration: number; easing: string; properties: string[] }[]);
    expect(running).toHaveLength(1);
    expect(running[0].duration).toBe(600);
    expect(new Set(running[0].properties)).toEqual(new Set(['blockSize']));
    await expect(list).toHaveAttribute('data-tanrei-moving', 'opening');
    expect(await css(list, 'overflow-y')).toBe('clip');
    expect(await css(row(page, 'basic', 'test'), 'transition-duration', '::before')).toContain('0.6s');
    const inner = row(page, 'basic', 'button.test.ts');
    const height = (await edges(inner)).height;
    expect(height).toBe((await edges(below)).height);
    // Held a quarter of the way through its time: what is read of the list on its way, and the turn after it, are then
    // of one moment however long a round trip takes. (Left to run, the list is read wherever a busy machine lets it get
    // to — and the disclosure's curve is a spring, which carries the height a layout unit past its end before it
    // rests there.)
    const [mid, under] = await page.evaluate(() => {
      const moved = document.querySelector('[data-tanrei-moving]')!;
      const motion = moved.getAnimations()[0];
      motion.pause();
      motion.currentTime = 150;
      return [moved.getBoundingClientRect().height, moved.parentElement!.nextElementSibling!.getBoundingClientRect().top];
    });
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(height);
    near(under, before + mid, 1);
    expect((await edges(inner)).height).toBe(height);
    // Turned on the way: it goes on from where it is, toward closed — drawn until the end, out of the keys at once.
    // Read in the task of the click, after the element has answered it: the list as the turn left it.
    await list.evaluate((el) => {
      window.addEventListener('click', () => ((window as any).turned = { moving: el.getAttribute('data-tanrei-moving'), inert: el.inert, height: el.getBoundingClientRect().height, motions: el.getAnimations().length }), { once: true });
    });
    await row(page, 'basic', 'test').click();
    expect(await events(page)).toEqual(['toggle:test:false']);
    const turned = await page.evaluate(() => (window as any).turned as { moving: string | null; inert: boolean; height: number; motions: number });
    expect(turned.height).toBeGreaterThan(0);
    expect(turned.height).toBeLessThanOrEqual(height);
    // From where the height is: the list is as tall after the turn as it was before it, to a layout unit.
    near(turned.height, mid, 1 / 64);
    expect(turned.moving).toBe('closing');
    expect(turned.inert).toBe(true);
    expect(turned.motions).toBe(1);
    expect((await edges(inner)).height).toBe(height);
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('package.json');
    await settled(page);
    near((await edges(below)).top, before);
    expect(await list.evaluate((el) => el.inert)).toBe(false);
    expect(await inner.evaluate((el) => el.checkVisibility())).toBe(false);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await row(page, 'basic', 'test').click();
    expect(await moving(page)).toBe(0);
    near((await edges(below)).top, before + height);
    expect(await css(row(page, 'basic', 'test'), 'transition-property', '::before')).toBe('none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('TRV-12: a parent that opens or closes keeps its row where it is and moves only what follows; a parent that closes around the focused row takes the focus; a focused row that is removed gives focus to the row that follows it, or else the one before; a row focused by the keyboard is brought into view by the least distance that shows it whole', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small' }, SMALL)], reducedMotion: true });
    await nameItems(page);
    await page.addStyleTag({ content: `[data-fixture="small"] { block-size: 150px; overflow: auto; padding: 0 !important; }` });
    const box = stage(page, 'small');
    // Its row stays; what follows moves.
    await box.evaluate((el) => (el.scrollTop = 200));
    const scrolled = await edges(row(page, 'small', 'Beta'));
    const next = (await edges(row(page, 'small', 'Gamma'))).top;
    const view = await edges(box);
    expect(scrolled.top).toBeGreaterThanOrEqual(view.top);
    expect(scrolled.bottom).toBeLessThanOrEqual(view.bottom);
    await page.mouse.click(scrolled.right - 30, scrolled.top + 10);
    expect((await edges(row(page, 'small', 'Beta'))).top).toBe(scrolled.top);
    expect(await box.evaluate((el) => el.scrollTop)).toBe(200);
    near((await edges(row(page, 'small', 'Gamma'))).top, next + scrolled.height);
    await page.mouse.click(scrolled.right - 30, scrolled.top + 10);
    expect((await edges(row(page, 'small', 'Beta'))).top).toBe(scrolled.top);
    // A row that is not wholly in view is brought in by the least distance.
    await box.evaluate((el) => (el.scrollTop = 0));
    await row(page, 'small', 'Alpha').focus();
    for (let n = 0; n < 5; n++) await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Beta');
    const beta = await edges(row(page, 'small', 'Beta'));
    expect(beta.top).toBeGreaterThanOrEqual(view.top - 0.5);
    near(beta.bottom, view.bottom, 1);
    // A parent that closes around the focus takes it.
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Almond');
    await item(page, 'small', 'Alpha').evaluate((el) => el.removeAttribute('data-open'));
    await expect.poll(() => focused(page)).toBe('Alpha');
    await item(page, 'small', 'Alpha').evaluate((el) => el.setAttribute('data-open', ''));
    // The focused row removed: the row that follows it; the last of a list: the one before; all of them: the parent.
    await row(page, 'small', 'Apple').focus();
    await item(page, 'small', 'Apple').evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Apricot');
    await row(page, 'small', 'Avocado').focus();
    await item(page, 'small', 'Avocado').evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Almond');
    await item(page, 'small', 'Banana').evaluate((el) => (el.parentElement!.parentElement as HTMLElement).setAttribute('data-open', ''));
    await row(page, 'small', 'Banana').focus();
    await item(page, 'small', 'Banana').evaluate((el) => el.remove());
    await expect.poll(() => focused(page)).toBe('Beta');
  });

  test('TRV-13: an open loading parent draws one loading row under it, after the rows it holds and one level further in: a small Loading indicator named by loadingLabel in the chevron’s place and loadingLabel after it in the supporting text’s style; it takes no focus, answers nothing and is no item; the parent is busy, open or closed; nothing is fetched and nothing announced; without loadingLabel the indicator is drawn and it is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, { fixtures: [...some('loading'), raw('nameless', { label: 'Nameless' }, '<ul><li data-open data-expandable data-loading><span>Remote</span></li><li data-loading data-open><span>A leaf</span></li></ul>')] });
    const packages = item(page, 'loading', 'packages');
    const tokens = item(page, 'loading', 'tokens');
    const loader = packages.locator('li[data-tanrei-loading]');
    await expect(loader).toHaveCount(1);
    await expect(tokens.locator('> ul > li[data-tanrei-loading]')).toHaveCount(1);
    // After the rows it already holds, one level further in.
    expect(await tokens.locator('> ul').evaluate((list) => list.lastElementChild!.hasAttribute('data-tanrei-loading'))).toBe(true);
    const indent = await resolveToken(page, T('level-indent-regular'));
    const parentRow = await drawn(row(page, 'loading', 'packages'));
    const loading = await drawn(loader.locator('> :first-child'));
    near(loading.container.left, parentRow.container.left + indent);
    expect(loading.row.height).toBe(parentRow.row.height);
    near(loading.row.top, parentRow.row.bottom);
    // The indicator in the chevron's place, the words after it.
    const indicator = loader.locator('tanrei-loading-indicator');
    await expect(indicator).toHaveAttribute('size', 'small');
    await expect(indicator).toHaveAttribute('label', 'Loading…');
    const spinner = await edges(indicator);
    near((spinner.left + spinner.right) / 2, (loading.chevron.left + loading.chevron.right) / 2);
    const words = loader.locator('[data-tanrei-loading-label]');
    await expect(words).toHaveText('Loading…');
    expect(await css(words, 'color')).toBe(await resolveColor(page, T('unselected-supporting-text-color')));
    near((await edges(words)).left, loading.chevron.right + (await resolveToken(page, T('container-gap-regular'))), 1);
    // Not an item: no role of an item, no focus, nothing on a press, not reached by the arrow keys.
    await expect(loader).toHaveAttribute('role', 'none');
    // Kept from assistive technology whole: a tree holds tree items alone, and the parent says that it is busy.
    await expect(loader).toHaveAttribute('aria-hidden', 'true');
    expect(await loader.getAttribute('tabindex')).toBeNull();
    await watch(page);
    await loader.click();
    expect(await events(page)).toEqual([]);
    await tabTo(page, row(page, 'loading', 'packages'));
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('apps');
    // Busy while loading, open or closed; not busy after.
    await expect(row(page, 'loading', 'packages')).toHaveAttribute('aria-busy', 'true');
    await row(page, 'loading', 'tokens').click();
    await expect(row(page, 'loading', 'tokens')).toHaveAttribute('aria-busy', 'true');
    await packages.evaluate((el) => el.removeAttribute('data-loading'));
    await expect(packages.locator('li[data-tanrei-loading]')).toHaveCount(0);
    expect(await row(page, 'loading', 'packages').getAttribute('aria-busy')).toBeNull();
    // An expandable parent with no items opens onto no rows.
    expect((await edges(packages)).height).toBe(parentRow.row.height);
    expect(await page.locator('[aria-live], [role="status"], [role="alert"]').count()).toBe(0);
    // No words: still drawn, and reported. A leaf is never loading.
    await expect(item(page, 'nameless', 'Remote').locator('tanrei-loading-indicator')).toHaveCount(1);
    await expect(item(page, 'nameless', 'A leaf').locator('tanrei-loading-indicator')).toHaveCount(0);
    expect(await row(page, 'nameless', 'A leaf').getAttribute('aria-busy')).toBeNull();
    expect(seen.filter((text) => text.includes('TRV-13'))).toHaveLength(1);
    // The product's words give the loading row its words and its indicator its name; the tree's own prop wins.
    expect(await missingWords(page)).toContain('loadingLabel');
    await setWords(page, { loadingLabel: 'Loading…' });
    await expect(item(page, 'nameless', 'Remote').locator('tanrei-loading-indicator')).toHaveAttribute('label', 'Loading…');
    await expect(item(page, 'nameless', 'Remote').locator('[data-tanrei-loading-label]')).toHaveText('Loading…');
    await host(page, 'nameless').evaluate((el) => el.setAttribute('loading-label', 'Fetching…'));
    await expect(item(page, 'nameless', 'Remote').locator('tanrei-loading-indicator')).toHaveAttribute('label', 'Fetching…');
  });

  test('TRV-14: where the browser’s find-in-page reports a match in a closed parent’s rows, that parent and every closed parent above it open at once, without motion, each with one toggle of true — a disabled one too; where it cannot, nothing opens for it', async ({ page }) => {
    await mount(page, { fixtures: [raw('found', { label: 'Found' }, '<ul><li data-disabled><span>Outer</span><ul><li><span>Inner</span><ul><li><span>Needle</span></li></ul></li></ul></li></ul>')] });
    await nameItems(page);
    await watch(page);
    const supported = await page.evaluate(() => 'onbeforematch' in HTMLElement.prototype);
    const inner = item(page, 'found', 'Inner').locator('> ul');
    const outer = item(page, 'found', 'Outer').locator('> ul');
    if (!supported) {
      // Closed rows are not searched: they are not drawn at all, and nothing is opened.
      expect(await css(outer, 'display')).toBe('none');
      expect(await outer.getAttribute('hidden')).toBeNull();
      return;
    }
    // Closed lists stay searchable: hidden until found, and taking no space.
    await expect(outer).toHaveAttribute('hidden', 'until-found');
    expect(await css(outer, 'content-visibility')).toBe('hidden');
    expect((await edges(outer)).height).toBe(0);
    // What the browser does for a match: it asks each closed list around it, the outermost first, then shows them.
    await page.evaluate(() => {
      const lists = [...document.querySelectorAll('[data-fixture="found"] li > ul')];
      for (const list of lists) {
        list.dispatchEvent(new Event('beforematch', { bubbles: true }));
        list.removeAttribute('hidden');
      }
    });
    expect(await events(page)).toEqual(['toggle:Outer:true', 'toggle:Inner:true']);
    expect(await moving(page)).toBe(0);
    expect(await inner.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(row(page, 'found', 'Needle')).toBeVisible();
    await expect(row(page, 'found', 'Outer')).toHaveAttribute('aria-expanded', 'true');
    expect(await row(page, 'found', 'Inner').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });
});

test.describe('selection', () => {
  test('TRV-15: an item can be chosen while selection is single or multiple, it has a value and is not disabled; the item whose value the tree holds is drawn from the selected condition on its own row and no other, and a closed parent is not opened to show it; a value that names no item selects nothing and two items with one value are both selected, each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, {
      fixtures: [...some('single', 'single-parent-selected', 'multiple'), raw('hidden-choice', { label: 'Hidden', selection: 'single', value: 'b1' }, SMALL), raw('nobody', { label: 'Nobody', selection: 'single', value: 'nothing' }, SMALL), raw('twice', { label: 'Twice', selection: 'single', value: 'x' }, '<ul><li data-value="x"><span>One</span></li><li data-value="x"><span>Two</span></li></ul>')],
    });
    await nameItems(page);
    const fill = (id: string, label: string) => css(row(page, id, label), 'background-color', '::after');
    const on = await resolveColor(page, T('selected-container-color'));
    // (Selected when the element is defined, a row takes its fill over the state's motion: TRV-31.)
    await expect.poll(() => fill('single', 'checkbox.ts')).toBe(on);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await css(row(page, 'single', 'checkbox.ts'), 'color')).toBe(await resolveColor(page, T('selected-label-color')));
    for (const label of ['button.ts', 'components', 'src']) expect(await fill('single', label)).toMatch(CLEAR);
    // A parent is selected like a leaf, and the rows under it are not marked.
    expect(await fill('single-parent-selected', 'components')).toBe(on);
    expect(await css(row(page, 'single-parent-selected', 'components'), 'color', '::before')).toBe(await resolveColor(page, T('selected-chevron-color')));
    expect(await fill('single-parent-selected', 'button.ts')).toMatch(CLEAR);
    expect(await css(row(page, 'single-parent-selected', 'button.ts'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    for (const label of ['button.ts', 'checkbox.ts', 'package.json']) expect(await fill('multiple', label)).toBe(on);
    expect(await fill('multiple', 'tree-view.ts')).toMatch(CLEAR);
    // Under a closed parent: selected, and the parent neither opened nor marked.
    await expect(row(page, 'hidden-choice', 'Banana')).toHaveAttribute('aria-selected', 'true');
    expect(await item(page, 'hidden-choice', 'Beta').getAttribute('data-open')).toBeNull();
    expect(await fill('hidden-choice', 'Beta')).toMatch(CLEAR);
    // What can be chosen says so.
    await expect(row(page, 'hidden-choice', 'Alpha')).toHaveAttribute('aria-selected', 'false');
    expect(await row(page, 'hidden-choice', 'Gamma').getAttribute('aria-selected')).toBeNull();
    expect(await row(page, 'hidden-choice', 'Avocado').getAttribute('aria-selected')).toBeNull();
    // No such item; two items.
    await expect(host(page, 'nobody').locator('[aria-selected="true"]')).toHaveCount(0);
    await expect(host(page, 'twice').locator('[aria-selected="true"]')).toHaveCount(2);
    expect(seen.filter((text) => text.includes('TRV-15') && text.includes('"nothing"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('TRV-15') && text.includes('2 items'))).toHaveLength(1);
  });

  test('TRV-16: in a single selection, a press on the row outside the chevron, Enter and Space each set value to the item’s and emit change exactly once, and the item that was selected becomes unselected; the selected item again changes nothing and emits nothing', async ({ page }) => {
    await mount(page, { fixtures: some('single') });
    await watch(page);
    const tree = host(page, 'single');
    const value = () => tree.evaluate((el: HTMLElement & { value: string | null }) => el.value);
    await row(page, 'single', 'button.ts').click();
    expect(await events(page)).toEqual(['change:{"value":"src/components/button.ts"}']);
    expect(await value()).toBe('src/components/button.ts');
    await expect(row(page, 'single', 'button.ts')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'single', 'checkbox.ts')).toHaveAttribute('aria-selected', 'false');
    await expect(tree.locator('[aria-selected="true"]')).toHaveCount(1);
    // Again: nothing.
    await row(page, 'single', 'button.ts').click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual([]);
    expect(await value()).toBe('src/components/button.ts');
    // By the keyboard: moving changes nothing, Enter and Space choose. A parent is chosen, not opened.
    await page.keyboard.press('ArrowDown');
    expect(await events(page)).toEqual([]);
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['change:{"value":"src/components/checkbox.ts"}']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual(['change:{"value":"src/styles"}']);
    expect(await item(page, 'single', 'styles').getAttribute('data-open')).toBeNull();
    // The product may set it; nothing is emitted for that.
    await tree.evaluate((el: HTMLElement & { value: string | null }) => (el.value = 'package.json'));
    await expect(row(page, 'single', 'package.json')).toHaveAttribute('aria-selected', 'true');
    await expect(tree.locator('[aria-selected="true"]')).toHaveCount(1);
    await tree.evaluate((el: HTMLElement & { value: string | null }) => (el.value = null));
    await expect(tree.locator('[aria-selected="true"]')).toHaveCount(0);
    expect(await events(page)).toEqual([]);
  });

  test('TRV-17: in a multiple selection, a press on the row, Enter and Space each add the item’s value to values, or remove it, and emit change exactly once; each item is chosen by itself — choosing a parent does not choose what it holds, and closing a parent changes nothing', async ({ page }) => {
    await mount(page, { fixtures: some('multiple') });
    await watch(page);
    const tree = host(page, 'multiple');
    const values = () => tree.evaluate((el: HTMLElement & { values: string[] }) => el.values);
    await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
    await row(page, 'multiple', 'tree-view.ts').click();
    expect(await events(page)).toEqual(['change:{"values":["src/components/button.ts","src/components/checkbox.ts","package.json","src/components/tree-view.ts"]}']);
    await row(page, 'multiple', 'button.ts').click();
    expect(await events(page)).toEqual(['change:{"values":["src/components/checkbox.ts","package.json","src/components/tree-view.ts"]}']);
    await expect(row(page, 'multiple', 'button.ts')).toHaveAttribute('aria-selected', 'false');
    // A parent, by itself.
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('components');
    await page.keyboard.press('Space');
    expect(await values()).toEqual(['src/components/checkbox.ts', 'package.json', 'src/components/tree-view.ts', 'src/components']);
    await expect(row(page, 'multiple', 'button.ts')).toHaveAttribute('aria-selected', 'false');
    expect(await row(page, 'multiple', 'components').getAttribute('aria-checked')).toBeNull();
    await events(page);
    // Closing a parent changes nothing.
    await page.keyboard.press('ArrowLeft');
    await settled(page);
    expect(await events(page)).toEqual(['toggle:components:false']);
    expect(await values()).toHaveLength(4);
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['change:{"values":["src/components/checkbox.ts","package.json","src/components/tree-view.ts"]}']);
  });

  test('TRV-18: with selection none every item is drawn unselected, value and values are ignored and no selected state is exposed; a leaf that cannot be chosen draws no hover and no press and emits nothing, and is still reached by the arrow keys and shows its focus; a parent answers on its whole row', async ({ page }) => {
    await mount(page, { fixtures: [raw('read', { label: 'Read', value: 'd', values: ['a'] }, SMALL), raw('some', { label: 'Some', selection: 'single' }, SMALL)] });
    await nameItems(page);
    await page.addStyleTag({ content: still });
    await watch(page);
    await expect(host(page, 'read').locator('[aria-selected]')).toHaveCount(0);
    expect(await host(page, 'read').getAttribute('aria-multiselectable')).toBeNull();
    const hovered = await resolveColor(page, T('unselected-hovered-container-color'));
    for (const [id, label] of [
      ['read', 'Delta'],
      ['read', 'Apple'],
      ['some', 'Epsilon'],
    ] as const) {
      const leaf = row(page, id, label);
      await leaf.hover();
      expect(await css(leaf, 'background-color', '::after')).toMatch(CLEAR);
      expect(await css(leaf, 'cursor')).toBe('default');
      await page.mouse.down();
      expect(await leaf.getAttribute('data-pressed')).toBeNull();
      await page.mouse.up();
      expect(await events(page)).toEqual([]);
    }
    // A parent answers on its whole row.
    const parent = row(page, 'read', 'Gamma');
    await parent.hover({ position: { x: 300, y: 10 } });
    expect(await css(parent, 'background-color', '::after')).toBe(hovered);
    expect(await css(parent, 'cursor')).toBe('pointer');
    // The arrow keys reach a leaf, and its keyboard focus is shown.
    await row(page, 'read', 'Alpha').focus();
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Epsilon');
    expect(await px(row(page, 'read', 'Epsilon'), 'border-top-width', '::after')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual([]);
  });
});

test.describe('the keyboard', () => {
  test('TRV-19: the tree is one stop in the focus order — Tab moves focus into it to the row focused last, or else the first selected item that is shown, or else the first row, and Tab again leaves it; entering changes no selection and opens nothing; a tree that shows no row is no stop', async ({ page }) => {
    await mount(page, { fixtures: [raw('first', { label: 'First' }, SMALL), raw('chosen', { label: 'Chosen', selection: 'multiple', values: ['d', 'a2', 'b1'] }, SMALL), raw('none', { label: 'None' }, '')] });
    await nameItems(page);
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="before">before</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">after</button>');
    });
    await watch(page);
    await page.locator('#before').focus();
    await tab(page);
    expect(await focused(page)).toBe('Alpha');
    await tab(page);
    // The first selected item that is shown (b1 is under a closed parent; a2 comes before d).
    expect(await focused(page)).toBe('Apricot');
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    expect(await events(page)).toEqual([]);
    // One stop each: one row with tabindex 0, every other -1.
    for (const id of ['first', 'chosen']) {
      expect(await host(page, id).locator('[role="treeitem"][tabindex="0"]').count()).toBe(1);
      expect(await host(page, id).locator('[role="treeitem"]:not([tabindex])').count()).toBe(0);
      // Nothing else in the tree is a stop: no item's own element, nothing inside a row.
      expect(await host(page, id).locator('[tabindex]:not([role="treeitem"])').count()).toBe(0);
    }
    expect(await host(page, 'none').locator('[tabindex]').count()).toBe(0);
    expect(await host(page, 'none').getAttribute('role')).toBeNull();
    // The row that had focus last.
    await tab(page, { back: true });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Avocado');
    await tab(page);
    await tab(page, { back: true });
    expect(await focused(page)).toBe('Avocado');
  });

  test('TRV-20: Down and Up Arrow move focus to the next and the previous row that is shown, whatever its level and whether or not it is disabled, without wrapping; Home and End to the first and the last; nothing opens and the selection does not follow; the keys stay the page’s while focus is not on a row', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small', selection: 'single', value: 'd' }, SMALL)] });
    await nameItems(page);
    await watch(page);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div style="block-size: 2000px"></div><button id="before">before</button>'));
    // Not on a row: the page scrolls.
    await page.locator('#before').focus();
    // WebKit scrolls the focused button into view after focus() returns: read the position once it has landed.
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press('Home');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(y);
    await tab(page);
    expect(await focused(page)).toBe('Delta');
    const order = ['Alpha', 'Apple', 'Apricot', 'Almond', 'Avocado', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    await page.keyboard.press('Home');
    for (const label of order) {
      expect(await focused(page)).toBe(label);
      await page.keyboard.press('ArrowDown');
    }
    // No wrapping at the last, nor at the first.
    expect(await focused(page)).toBe('Epsilon');
    for (const label of [...order].reverse()) {
      expect(await focused(page)).toBe(label);
      await page.keyboard.press('ArrowUp');
    }
    expect(await focused(page)).toBe('Alpha');
    await page.keyboard.press('End');
    expect(await focused(page)).toBe('Epsilon');
    expect(await events(page)).toEqual([]);
    expect(await host(page, 'small').evaluate((el: HTMLElement & { value: string | null }) => el.value)).toBe('d');
    // With a modifier the key is the platform's.
    await page.keyboard.press('Alt+ArrowUp');
    expect(await focused(page)).toBe('Epsilon');
  });

  test('TRV-21: the arrow toward the end of the line opens a closed parent and keeps focus, moves to the first item of an open one, and does nothing on a leaf, a disabled closed parent or an open parent that shows none; the arrow toward the start closes an open parent and keeps focus, moves to the parent’s row from any other row, and does nothing on the first level', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small' }, SMALL), raw('edges', { label: 'Edges' }, '<ul><li data-disabled><span>Locked</span><ul><li><span>In</span></li></ul></li><li data-open data-expandable><span>Empty</span></li><li data-open data-disabled><span>Stuck</span><ul><li><span>Kept</span></li></ul></li></ul>')], reducedMotion: true });
    await nameItems(page);
    await watch(page);
    await tabTo(page, row(page, 'small', 'Alpha'));
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('Beta');
    await page.keyboard.press('ArrowRight');
    expect(await events(page)).toEqual(['toggle:Beta:true']);
    expect(await focused(page)).toBe('Beta');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Banana');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Banana');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Beta');
    await page.keyboard.press('ArrowLeft');
    expect(await events(page)).toEqual(['toggle:Beta:false']);
    expect(await focused(page)).toBe('Beta');
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Beta');
    expect(await events(page)).toEqual([]);
    // A leaf two levels down steps out to its parent.
    await row(page, 'small', 'Almond').focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('Apricot');
    // A disabled closed parent, an open parent that shows none, a disabled open parent.
    await row(page, 'edges', 'Locked').focus();
    await page.keyboard.press('ArrowRight');
    expect(await item(page, 'edges', 'Locked').getAttribute('data-open')).toBeNull();
    await row(page, 'edges', 'Empty').focus();
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Empty');
    await row(page, 'edges', 'Stuck').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'edges', 'Stuck')).toHaveAttribute('data-open', '');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('Kept');
    expect(await events(page)).toEqual([]);
  });

  test('TRV-22: Enter and Space do what a press on the row does — choose, or open and close a parent that cannot be chosen, and nothing on a leaf that cannot be chosen or on a disabled item; the asterisk opens every closed parent that is not disabled among the focused row’s siblings, each with one toggle, and keeps focus; any other key and a key with a modifier are the platform’s', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small', selection: 'single' }, SMALL.replace('<li><span>Gamma', '<li data-disabled><span>Zeta</span><ul><li><span>Zest</span></li></ul></li><li><span>Gamma'))], reducedMotion: true });
    await nameItems(page);
    await watch(page);
    await row(page, 'small', 'Gamma').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual(['toggle:Gamma:true', 'toggle:Gamma:false']);
    await row(page, 'small', 'Epsilon').focus();
    await page.keyboard.press('Enter');
    await row(page, 'small', 'Avocado').focus();
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual([]);
    await row(page, 'small', 'Delta').focus();
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['change:{"value":"d"}']);
    // The asterisk: the closed parents among the siblings, not the disabled one, not the levels under them.
    await page.keyboard.press('*');
    expect(await events(page)).toEqual(['toggle:Beta:true', 'toggle:Gamma:true']);
    expect(await focused(page)).toBe('Delta');
    expect(await item(page, 'small', 'Zeta').getAttribute('data-open')).toBeNull();
    // Other keys, and keys with a modifier, are left alone.
    const prevented = await page.evaluate(() => {
      const seen: string[] = [];
      document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented) seen.push(`${event.ctrlKey ? 'Control+' : ''}${event.key}`);
      });
      (window as unknown as { __prevented: string[] }).__prevented = seen;
      return seen;
    });
    expect(prevented).toEqual([]);
    for (const key of ['Escape', 'F2', 'PageDown', 'Control+a', 'Control+Enter']) await page.keyboard.press(key);
    expect(await page.evaluate(() => (window as unknown as { __prevented: string[] }).__prevented)).toEqual([]);
    expect(await events(page)).toEqual([]);
  });

  test('TRV-23: printable characters typed within a second of each other move focus to the next shown row whose label begins with them, without regard to case, going on from the first after the last; one character again goes to the next such row; nothing that matches keeps focus; no closed parent is opened, the selection is unchanged, and a Space inside a run is not an activation', async ({ page }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small', selection: 'single' }, SMALL.replace('<span>Epsilon</span>', '<span><bdi>Al dente<small data-supporting-text>zzz</small></bdi></span>'))] });
    await nameItems(page);
    await watch(page);
    await tabTo(page, row(page, 'small', 'Alpha'));
    await page.keyboard.press('a');
    expect(await focused(page)).toBe('Apple');
    await page.keyboard.press('a');
    expect(await focused(page)).toBe('Apricot');
    await page.waitForTimeout(1100);
    // A run: "av", then from the last row round to the first.
    await page.keyboard.type('AV');
    expect(await focused(page)).toBe('Avocado');
    await page.waitForTimeout(1100);
    await page.keyboard.press('g');
    expect(await focused(page)).toBe('Gamma');
    await page.waitForTimeout(1100);
    // Banana is under a closed parent: not found, and not opened.
    await page.keyboard.type('ba');
    expect(await focused(page)).toBe('Beta');
    expect(await item(page, 'small', 'Beta').getAttribute('data-open')).toBeNull();
    await page.waitForTimeout(1100);
    // A Space inside a run belongs to it; the supporting text is not the label.
    await page.keyboard.type('al d');
    expect(await focused(page)).toBe('Al dente');
    await page.waitForTimeout(1100);
    await page.keyboard.press('z');
    expect(await focused(page)).toBe('Al dente');
    expect(await events(page)).toEqual([]);
  });
});

test.describe('states', () => {
  test('TRV-24: under the acme system a hovered, a focused and a pressed row are drawn from their own tokens, pressed over focused over hovered, on the whole container wherever the pointer is in the hit area; focus by a pointer is not the focused state; the guides and the rows beside it do not change', async ({ page }) => {
    await mount(page, { fixtures: some('guides'), system: 'acme', systemCss: await acmeSystemCss() });
    await page.addStyleTag({ content: still });
    const r = row(page, 'guides', 'components');
    const fill = () => css(r, 'background-color', '::after');
    const colors = { hovered: await resolveColor(page, T('unselected-hovered-container-color')), focused: await resolveColor(page, T('unselected-focused-container-color')), pressed: await resolveColor(page, T('unselected-pressed-container-color')) };
    expect(new Set(Object.values(colors)).size).toBe(3);
    const guide = await item(page, 'guides', 'src').locator('> ul').evaluate((list) => getComputedStyle(list, '::before').borderLeftColor);
    const beside = await css(row(page, 'guides', 'button.ts'), 'background-color', '::after');
    // In the indent, at the tree's start edge: the whole container answers.
    const d = await drawn(r);
    await page.mouse.move(d.row.left + 2, d.row.top + 4);
    expect(await fill()).toBe(colors.hovered);
    expect(await css(r, 'color')).toBe(await resolveColor(page, T('unselected-hovered-label-color')));
    expect(await css(r, 'color', '::before')).toBe(await resolveColor(page, T('unselected-hovered-chevron-color')));
    await page.mouse.move(d.row.right - 2, d.row.bottom - 2);
    expect(await fill()).toBe(colors.hovered);
    // Focus by the keyboard, with the pointer still over it: focused wins. Pressed wins over both.
    await tabTo(page, row(page, 'guides', 'src'));
    await page.keyboard.press('ArrowDown');
    expect(await fill()).toBe(colors.focused);
    await page.mouse.down();
    expect(await fill()).toBe(colors.pressed);
    expect(await item(page, 'guides', 'src').locator('> ul').evaluate((list) => getComputedStyle(list, '::before').borderLeftColor)).toBe(guide);
    expect(await css(row(page, 'guides', 'button.ts'), 'background-color', '::after')).toBe(beside);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => r.getAttribute('data-pressed')).toBeNull();
    await settled(page);
    // Focus gained by the pointer is not the focused state.
    await row(page, 'guides', 'test').click();
    await page.mouse.move(0, 0);
    await expect.poll(() => row(page, 'guides', 'test').getAttribute('data-pressed')).toBeNull();
    expect(await css(row(page, 'guides', 'test'), 'background-color', '::after')).toMatch(CLEAR);
  });

  test('TRV-25: a row focused by the keyboard shows the focus ring inside its container, following container.shape, without animation; focus by a pointer shows none', async ({ page }) => {
    await mount(page, { fixtures: some('basic') });
    const r = row(page, 'basic', 'components');
    await tabTo(page, row(page, 'basic', 'src'));
    await page.keyboard.press('ArrowDown');
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const inner = await resolveToken(page, '--tanrei-sys-focus-inner-width');
    expect(await px(r, 'border-top-width', '::after')).toBe(outer);
    expect(await css(r, 'border-top-style', '::after')).toBe('solid');
    expect(await css(r, 'border-top-color', '::after')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Inside the container: the stroke is its own edge, which begins where the level does; the inner stroke is within it.
    const d = await drawn(r);
    near(d.container.left, d.row.left + (await resolveToken(page, T('level-indent-regular'))));
    near(d.container.top, d.row.top);
    expect(await px(r, 'outline-offset', '::after')).toBe(-(outer + inner));
    expect(await css(r, 'box-sizing', '::after')).toBe('border-box');
    expect(await css(r, 'border-top-left-radius', '::after')).toBe(`${await resolveToken(page, T('container-shape'))}px`);
    expect(await css(r, 'transition-property', '::after')).toBe('background-color');
    // The row's own outline is not drawn: the indicator is its container's.
    expect(await css(r, 'outline-style')).toBe('none');
    await row(page, 'basic', 'test').click();
    expect(await px(row(page, 'basic', 'test'), 'border-top-width', '::after')).toBe(0);
  });

  test('TRV-26: a row’s hit area is the tree’s whole width, however far its container is set in, and its whole height; a regular row is at least the pointer target high and a compact one as high as its density gives, and for touch both are at least the touch target; the chevron’s own hit area runs from the start edge to the middle of the gap after its box, and is at least the target wide', async ({ page, browserName }) => {
    await mount(page, { fixtures: [raw('small', { label: 'Small', selection: 'single' }, SMALL), raw('tight', { label: 'Tight', selection: 'single', density: 'compact' }, SMALL)] });
    await nameItems(page);
    await watch(page);
    // The first and the last pixels of a row two levels in choose it.
    const deep = await drawn(row(page, 'small', 'Almond'));
    expect(deep.container.left).toBeGreaterThan(deep.row.left + 40);
    await page.mouse.click(deep.row.left + 1, deep.row.top + 1);
    expect(await events(page)).toEqual(['change:{"value":"a2x"}']);
    const leaf = await drawn(row(page, 'small', 'Delta'));
    await page.mouse.click(leaf.row.right - 1, leaf.row.bottom - 1);
    expect(await events(page)).toEqual(['change:{"value":"d"}']);
    // Heights.
    expect(leaf.row.height).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-pointer'));
    expect((await drawn(row(page, 'tight', 'Delta'))).row.height).toBe(await resolveToken(page, T('container-height-compact')));
    // The chevron's hit area: to the middle of the gap after its box; and at least the target wide, where that is more.
    const beta = await drawn(row(page, 'small', 'Beta'));
    const gap = await resolveToken(page, T('container-gap-regular'));
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const reach = Math.max(beta.chevron.right + gap / 2 - beta.row.left, target);
    const y = (beta.row.top + beta.row.bottom) / 2;
    await page.mouse.click(beta.row.left + 1, y);
    expect(await events(page)).toEqual(['toggle:Beta:true']);
    await settled(page);
    await page.mouse.click(beta.row.left + reach - 1, y);
    expect(await events(page)).toEqual(['toggle:Beta:false']);
    await settled(page);
    await page.mouse.click(beta.row.left + reach + 2, y);
    expect(await events(page)).toEqual(['change:{"value":"b"}']);
    // Two levels in, the indent is the chevron's too.
    const apricot = await drawn(row(page, 'small', 'Apricot'));
    await page.mouse.click(apricot.row.left + 2, (apricot.row.top + apricot.row.bottom) / 2);
    expect(await events(page)).toEqual(['toggle:Apricot:false']);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(async () => (await edges(row(page, 'tight', 'Delta'))).height).toBe(touch);
    expect((await edges(row(page, 'small', 'Delta'))).height).toBeGreaterThanOrEqual(touch);
  });

  test('TRV-27: a disabled item is drawn from the disabled tokens with its opacity on the whole row, is exposed as disabled, emits nothing for a press or a key and draws no hover and no press; the arrow keys still reach it; it keeps its place, its selection and its open, and the items it shows keep their own', async ({ page }) => {
    await mount(page, { fixtures: some('disabled') });
    await page.addStyleTag({ content: still });
    await watch(page);
    const opacity = Number(
      await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.opacity = 'var(--tanrei-comp-tree-view-disabled-opacity)';
        document.body.append(probe);
        const value = getComputedStyle(probe).opacity;
        probe.remove();
        return value;
      }),
    );
    expect(opacity).toBeLessThan(1);
    const off = row(page, 'disabled', 'typeface');
    expect(Number(await css(off, 'opacity'))).toBe(opacity);
    expect(await css(off, 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    expect(await css(off, 'background-color', '::after')).toMatch(CLEAR);
    await expect(row(page, 'disabled', 'typeface')).toHaveAttribute('aria-disabled', 'true');
    // A disabled parent that is open shows its items, which are not disabled; one that is selected keeps its fill.
    const themes = row(page, 'disabled', 'themes');
    expect(Number(await css(themes, 'opacity'))).toBe(opacity);
    await expect(row(page, 'disabled', 'light')).toBeVisible();
    expect(Number(await css(row(page, 'disabled', 'light'), 'opacity'))).toBe(1);
    expect(await row(page, 'disabled', 'light').getAttribute('aria-disabled')).toBeNull();
    expect(await css(row(page, 'disabled', 'generated'), 'background-color', '::after')).toBe(await resolveColor(page, T('selected-disabled-container-color')));
    await expect(row(page, 'disabled', 'generated')).toHaveAttribute('aria-selected', 'true');
    // No answer: hover, press, chevron, keys.
    await themes.hover();
    expect(await css(themes, 'cursor')).toBe('default');
    const d = await drawn(themes);
    await page.mouse.click((d.chevron.left + d.chevron.right) / 2, (d.row.top + d.row.bottom) / 2);
    // (A script's click too: the row says that it is disabled, and nothing answers.)
    await off.click({ force: true });
    expect(await themes.getAttribute('data-pressed')).toBeNull();
    await row(page, 'disabled', 'palette').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('typeface');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('themes');
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'disabled', 'themes')).toHaveAttribute('data-open', '');
    expect(await events(page)).toEqual([]);
    // The product may still close it and select it.
    await item(page, 'disabled', 'themes').evaluate((el) => el.removeAttribute('data-open'));
    await expect(row(page, 'disabled', 'themes')).toHaveAttribute('aria-expanded', 'false');
    await host(page, 'disabled').evaluate((el: HTMLElement & { values: string[] }) => (el.values = ['themes']));
    await expect(row(page, 'disabled', 'themes')).toHaveAttribute('aria-selected', 'true');
  });

  test('TRV-25, TRV-27: a disabled row that the arrow keys reach draws its focus ring at full strength — the disabled opacity is taken into its colors, not laid over the ring — and looks as faded as it did without focus', async ({ page }) => {
    await mount(page, { fixtures: some('disabled') });
    await page.addStyleTag({ content: still });
    const off = row(page, 'disabled', 'typeface');
    const opacity = Number(await css(off, 'opacity'));
    expect(opacity).toBeLessThan(1);
    const label = await resolveColor(page, T('unselected-disabled-label-color'));
    await row(page, 'disabled', 'palette').focus();
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('typeface');
    // The row is opaque, so the ring is not faded: its stroke is the focus ring's own color.
    expect(Number(await css(off, 'opacity'))).toBe(1);
    expect(await px(off, 'border-top-width', '::after')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await css(off, 'border-top-color', '::after')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // Its text carries the opacity itself: the disabled label color at the disabled opacity.
    const [drawnLabel, expected] = await off.evaluate((el, [color, alpha]) => {
      const probe = document.createElement('div');
      probe.style.color = `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
      document.body.append(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      return [getComputedStyle(el).color, want];
    }, [label, opacity] as const);
    expect(drawnLabel).toBe(expected);
    // Focus gone, the row is faded as a whole again.
    await page.keyboard.press('ArrowUp');
    expect(Number(await css(off, 'opacity'))).toBe(opacity);
    expect(await css(off, 'color')).toBe(label);
  });

  test('TRV-28: a press by pointer, Enter or Space shows the pressed state without delay and keeps it for at least sys.motion.duration.press-hold, even when the press ends sooner', async ({ page }) => {
    await mount(page, { fixtures: some('single') });
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '300ms' });
    const r = row(page, 'single', 'button.ts');
    // (From the input event to the pressed state's end, and the state set in the turn of that event — test/watched-press.ts.
    // What an observer hears, it hears after the tree's own listeners returned: "without delay" is not a number of
    // milliseconds between the two, which grows with the machine.)
    for (const [by, act] of [
      ['a click', () => r.click()],
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
    ] as const) {
      await watchPress(r);
      await act();
      expect((await expectPressShownAndHeld(page, 300, by)).feedback, by).toBe('overlay');
      await expect(r).not.toHaveAttribute('data-pressed');
    }
  });

  test('TRV-29: a press is answered as sys.behavior.pressed-feedback names — overlay paints the pressed tokens on the whole container at once, ripple grows the pressed layer from the point of contact inside the container (from its centre for a key), dim applies the pressed opacity and no layer, none draws nothing; the ripple grows over motion.feedback-duration and appears whole where motion is reduced', async ({ page }) => {
    await mount(page, { fixtures: some('single'), system: 'acme', systemCss: await acmeSystemCss() });
    await page.addStyleTag({ content: still });
    // (The selected row: a press on it changes nothing, so every press is drawn from the same condition.)
    const r = row(page, 'single', 'checkbox.ts');
    const d = await drawn(r);
    const pressed = await resolveColor(page, T('selected-pressed-container-color'));
    const hovered = await resolveColor(page, T('selected-hovered-container-color'));
    const at = { x: d.row.left + 4, y: d.row.top + 10 };
    const press = async (feedback: string) => {
      await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
    };
    const release = async () => {
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => r.getAttribute('data-pressed')).toBeNull();
      await expect(r.locator('.ripple')).toHaveCount(0);
    };
    await press('overlay');
    await expect(r).toHaveAttribute('data-pressed', 'overlay');
    expect(await css(r, 'background-color', '::after')).toBe(pressed);
    expect(await css(r, 'color')).toBe(await resolveColor(page, T('selected-pressed-label-color')));
    await release();
    // ripple: the layer is the container's box, and grows from the point of contact clamped into it.
    await press('ripple');
    await expect(r).toHaveAttribute('data-pressed', 'ripple');
    const ripple = r.locator('.ripple');
    const layer = await edges(ripple);
    near(layer.left, d.container.left);
    near(layer.right, d.container.right);
    expect(await css(ripple, 'background-color')).toBe(pressed);
    expect(await ripple.evaluate((el) => el.style.getPropertyValue('--_x'))).toBe('0px');
    expect(await css(r, 'background-color', '::after')).toBe(hovered);
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    expect(await css(ripple, 'border-top-left-radius')).toBe(await css(r, 'border-top-left-radius', '::after'));
    await release();
    await row(page, 'single', 'checkbox.ts').focus();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    await page.keyboard.down('Enter');
    const centre = await r.locator('.ripple').evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), el.getBoundingClientRect().width]);
    near(centre[0], centre[1] / 2);
    await page.keyboard.up('Enter');
    await expect(r.locator('.ripple')).toHaveCount(0);
    // dim: the pressed opacity, no layer, the container as it was. none: nothing.
    await press('dim');
    await expect(r).toHaveAttribute('data-pressed', 'dim');
    await expect(r.locator('.ripple')).toHaveCount(0);
    expect(await css(r, 'background-color', '::after')).not.toBe(pressed);
    await release();
    await press('none');
    await expect(r).toHaveAttribute('data-pressed', 'none');
    expect(await css(r, 'background-color', '::after')).not.toBe(pressed);
    await release();
    // Reduced motion: the layer whole, at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await press('ripple');
    expect(await css(r.locator('.ripple'), 'animation-name')).toBe('none');
    await release();
  });

  test('TRV-30: the corners of a row’s container are eased by sys.shape.corner-smoothing where the browser can, and keyboard focus is drawn as sys.behavior.focus-style names — a ring, or a glow inside the container under the acme system', async ({ page }) => {
    await mount(page, { fixtures: some('basic'), system: 'cupertino' });
    const r = row(page, 'basic', 'src');
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(1)'));
    const shape = await css(r, 'corner-shape', '::after');
    const radius = await resolveToken(page, T('container-shape'));
    if (smooth) {
      expect(shape).toContain('superellipse');
      expect(await px(r, 'border-top-left-radius', '::after')).toBeGreaterThan(radius);
    } else {
      expect(shape).toBe('');
      expect(await px(r, 'border-top-left-radius', '::after')).toBeCloseTo(radius, 1);
    }
    // ring (the default) and glow (acme).
    await mount(page, { fixtures: some('basic') });
    await tabTo(page, row(page, 'basic', 'src'));
    expect(await css(r, 'box-shadow', '::after')).toBe('none');
    expect(await px(r, 'border-top-width', '::after')).toBeGreaterThan(0);
    await mount(page, { fixtures: some('basic'), system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, row(page, 'basic', 'src'));
    expect(await css(r, 'box-shadow', '::after')).not.toBe('none');
    expect(await px(r, 'border-top-width', '::after')).toBe(0);
    // The glow is inside the container: its box is drawn in from the row's edge, and the fill goes on to it.
    expect(await px(r, 'top', '::after')).toBeGreaterThan(0);
    expect((await css(r, 'box-shadow', '::after')).split('px').length).toBeGreaterThan(9);
  });

  test('TRV-31: the colors of a row change between states and between the unselected and the selected condition over motion.state-duration with its easing, and at once where motion is reduced; the selected fill does not slide from row to row', async ({ page }) => {
    await mount(page, { fixtures: some('single') });
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const r = row(page, 'single', 'button.ts');
    expect(await css(r, 'transition-property', '::after')).toBe('background-color');
    expect(await css(r, 'transition-duration', '::after')).toBe(duration);
    const own = (await css(r, 'transition-property')).split(', ');
    const times = (await css(r, 'transition-duration')).split(', ');
    expect(times[own.indexOf('color')]).toBe(duration);
    expect(await css(r.locator('> .tanrei-icon'), 'transition-property')).toContain('font-variation-settings');
    // Each row's own fill fades in place: the row that is chosen and the row that no longer is each run a background
    // transition of their own, over the token's duration with its easing, and no box moves. They are read in the task
    // that changes the value — after the element's update `getAnimations()` styles the new condition and lists the
    // transitions it makes — so that neither a frame nor an answer to the test stands between the change and the
    // reading: on a runner without a GPU two frames take WebKit 500 ms, longer than any state transition, and a list
    // asked for after them is empty.
    const before = await drawn(row(page, 'single', 'checkbox.ts'));
    const fading = await host(page, 'single').evaluate(async (tree: HTMLElement & { value: string | null; updateComplete: Promise<unknown> }, easingToken) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${easingToken})`;
      document.body.append(probe);
      const easing = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      tree.value = 'src/components/button.ts';
      await tree.updateComplete;
      const fills = tree.getAnimations({ subtree: true }).filter((a) => (a as CSSTransition).transitionProperty === 'background-color');
      return {
        easing,
        fills: fills.map((a) => {
          const effect = a.effect as KeyframeEffect;
          // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
          return { row: effect.target!.parentElement!.getAttribute('data-t'), on: effect.pseudoElement, duration: `${Math.round(Number(effect.getTiming().duration)) / 1000}s`, easing: effect.getTiming().easing, state: a.playState };
        }),
      };
    }, T('motion-state-easing'));
    expect(fading.fills.map((fill) => fill.row).sort()).toEqual(['button.ts', 'checkbox.ts']);
    for (const fill of fading.fills) expect(fill).toEqual({ row: fill.row, on: '::after', duration, easing: fading.easing, state: 'running' });
    expect((await drawn(row(page, 'single', 'checkbox.ts'))).container).toEqual(before.container);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(r, 'transition-property', '::after')).toBe('none');
    expect((await css(r, 'transition-property')).includes('color, ')).toBe(false);
  });
});

test.describe('accessibility', () => {
  test('TRV-32: the tree is a tree named by label — multiselectable while selection is multiple — and each item one tree item named by its label and described by its supporting text, the text of its trailing content and its trailing text, with its level, its place and the number of its siblings; a parent is expanded or collapsed and its items a group of its own; an item that can be chosen is selected or not; disabled and busy are said; the chevron, the icon and the guides are hidden; a tree or an item without a name is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, {
      fixtures: [...some('all-parts', 'multiple', 'disabled', 'loading'), raw('described', { label: 'Described' }, '<ul><li><span><bdi>Name<small data-supporting-text>about</small></bdi><span data-trailing><b>new</b></span><span data-trailing-text>12</span></span></li><li><span>Raw text <small data-supporting-text>beside it</small></span></li><li><span></span></li></ul>'), raw('nameless', {}, '<ul><li><span>Only</span></li></ul>')],
    });
    const tree = host(page, 'all-parts');
    await expect(tree).toHaveAttribute('role', 'tree');
    await expect(tree).toHaveAccessibleName('Project files');
    expect(await tree.getAttribute('aria-multiselectable')).toBeNull();
    await expect(host(page, 'multiple')).toHaveAttribute('aria-multiselectable', 'true');
    // The lists: none at the tree's own, a group under each parent.
    await expect(tree.locator('> ul')).toHaveAttribute('role', 'none');
    await expect(item(page, 'all-parts', 'src').locator('> ul')).toHaveAttribute('role', 'group');
    // The row is the tree item; the `<li>` around it and the rows under it has no role.
    const src = row(page, 'all-parts', 'src');
    await expect(item(page, 'all-parts', 'src')).toHaveAttribute('role', 'none');
    await expect(src).toHaveAttribute('role', 'treeitem');
    await expect(src).toHaveAccessibleName('src');
    await expect(src).toHaveAccessibleDescription('what is published 12 files');
    await expect(src).toHaveAttribute('aria-expanded', 'true');
    await expect(row(page, 'all-parts', 'components')).toHaveAttribute('aria-expanded', 'false');
    expect(await row(page, 'all-parts', 'package.json').getAttribute('aria-expanded')).toBeNull();
    await expect(row(page, 'all-parts', 'index.ts')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'all-parts', 'package.json')).toHaveAttribute('aria-selected', 'false');
    await expect(row(page, 'all-parts', 'src').locator('> .tanrei-icon')).toHaveAttribute('aria-hidden', 'true');
    expect((await drawn(row(page, 'all-parts', 'src'))).chevron.content).toMatch(/chevron_right/);
    // The description in order: supporting text, trailing content, trailing text; the label alone is the name.
    const first = host(page, 'described').locator('li').first().locator('> span');
    await expect(first).toHaveAccessibleName('Name');
    await expect(first).toHaveAccessibleDescription('about new 12');
    await expect(host(page, 'described').locator('li').nth(1).locator('> span')).toHaveAccessibleName('Raw text');
    await expect(host(page, 'described').locator('li').nth(1).locator('> span')).toHaveAccessibleDescription('beside it');
    await expect(row(page, 'disabled', 'typeface')).toHaveAttribute('aria-disabled', 'true');
    await expect(row(page, 'loading', 'packages')).toHaveAttribute('aria-busy', 'true');
    // Level, set size and position come from the nesting: none is written.
    expect(await page.locator(`${TAG} [aria-level], ${TAG} [aria-setsize], ${TAG} [aria-posinset]`).count()).toBe(0);
    expect(seen.filter((text) => text.includes('TRV-32') && text.includes('the tree has no accessible name'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('TRV-32') && text.includes('the item has no accessible name'))).toHaveLength(1);
    await expect(host(page, 'nameless').locator('li')).toBeVisible();
    // What the engine itself exposes can be read in Chromium alone (the DevTools protocol).
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const property = (node: (typeof nodes)[number], name: string) => node.properties?.find((p) => p.name === name)?.value.value;
    const trees = nodes.filter((node) => node.role?.value === 'tree');
    // (In the spec's order: multiple, all-parts, disabled, loading; then the test's own two.)
    expect(trees.map((node) => node.name?.value)).toEqual(['Project files', 'Project files', 'Token sources', 'Repository', 'Described', '']);
    expect(trees.map((node) => property(node, 'multiselectable'))).toEqual([true, false, true, false, false, false]);
    const items = nodes.filter((node) => node.role?.value === 'treeitem');
    /** Every item of that name on the page (several fixtures hold the same files). */
    const exposed = (name: string) =>
      items
        .filter((each) => each.name?.value === name)
        .map((node) => ({ description: node.description?.value ?? '', level: property(node, 'level'), expanded: property(node, 'expanded'), selected: property(node, 'selected'), disabled: property(node, 'disabled'), busy: property(node, 'busy') }));
    expect(exposed('src')).toContainEqual(expect.objectContaining({ description: 'what is published 12 files', level: 1, expanded: true, selected: false }));
    expect(exposed('components')).toContainEqual(expect.objectContaining({ description: 'one file per component 9 files', level: 2, expanded: false }));
    expect(exposed('index.ts')).toContainEqual(expect.objectContaining({ description: 'the entry point 1 KB', level: 2, selected: true, expanded: undefined }));
    expect(exposed('typeface')).toContainEqual(expect.objectContaining({ level: 2, disabled: true }));
    expect(exposed('packages')).toContainEqual(expect.objectContaining({ level: 1, expanded: true }));
    expect(exposed('packages')[0].busy).toBeTruthy();
    // A closed parent's items are not exposed; the loading row is no item; a group belongs to its parent.
    expect(items.some((node) => node.name?.value === 'button.ts' && property(node, 'level') === 3)).toBe(true);
    expect(items.filter((node) => node.name?.value === 'schemes')).toHaveLength(0);
    expect(items.some((node) => (node.name?.value ?? '').includes('Loading'))).toBe(false);
    // The items a parent shows are a group of their own, exposed after the parent's item and one level further in.
    const groups = nodes.filter((node) => node.role?.value === 'group');
    expect(groups.length).toBeGreaterThanOrEqual(4);
    expect(nodes.filter((node) => node.role?.value === 'listitem' || node.role?.value === 'list')).toHaveLength(0);
    // The loading row is no part of the tree for assistive technology: no progress bar among the tree's items.
    expect(nodes.filter((node) => node.role?.value === 'progressbar')).toHaveLength(0);
    await expect(item(page, 'loading', 'packages').locator('tanrei-loading-indicator')).toHaveAttribute('label', 'Loading…');
  });

  test('TRV-33: opening, closing and choosing announce nothing — no live region, no alert, no status — and move neither keyboard focus nor anything else', async ({ page }) => {
    await mount(page, { fixtures: some('single'), reducedMotion: true });
    await tabTo(page, row(page, 'single', 'checkbox.ts'));
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('src');
    const src = await drawn(row(page, 'single', 'src'));
    await page.mouse.click((src.chevron.left + src.chevron.right) / 2, (src.row.top + src.row.bottom) / 2);
    expect(await focused(page)).toBe('src');
    await page.keyboard.press('Enter');
    expect(await focused(page)).toBe('src');
    await host(page, 'single').evaluate((el: HTMLElement & { value: string | null }) => (el.value = 'README.md'));
    await item(page, 'single', 'test').evaluate((el) => el.setAttribute('data-open', ''));
    await frame(page);
    expect(await focused(page)).toBe('src');
    expect(await page.locator('[aria-live], [role="status"], [role="alert"], [role="log"]').count()).toBe(0);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });

  test('TRV-34: at 200 % text in a stage 320 wide the labels, the supporting texts and the trailing texts grow, the label and the supporting text wrap whole and the rows grow; the chevron’s and the icon’s boxes keep their size on the label’s first line; only a trailing text is cut; nothing scrolls sideways; raised text spacing loses nothing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, { fixtures: some('long-labels', 'all-parts', 'deep') });
    const normal = await px(row(page, 'all-parts', 'src').locator('> bdi'), 'font-size');
    const chevron = await resolveToken(page, T('chevron-size-regular'));
    await page.addStyleTag({ content: `html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; }` });
    const whole = async (when: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${when}: no sideways scroll`).toBe(true);
      // Nothing but a trailing text is cut: no label and no row clips what it holds (a glyph wider than a very narrow column reaches into the gap beside it, whole).
      const cut = await page.evaluate(() => [...document.querySelectorAll('tanrei-tree-view, tanrei-tree-view ul, tanrei-tree-view li, tanrei-tree-view li > :first-child, tanrei-tree-view bdi, tanrei-tree-view [data-supporting-text]')].filter((el) => el.checkVisibility() && getComputedStyle(el).overflow !== 'visible').map((el) => el.localName));
      expect(cut, `${when}: nothing but a trailing text is cut`).toEqual([]);
      const inside = await page.evaluate(() => [...document.querySelectorAll('tanrei-tree-view li > :first-child')].filter((r) => r.checkVisibility()).every((r) => {
        const box = r.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(r.querySelector('bdi') ?? r);
        const text = range.getBoundingClientRect();
        return text.top >= box.top - 1 && text.bottom <= box.bottom + 1 && text.left >= box.left - 1 && text.right <= box.right + 1;
      }));
      expect(inside, `${when}: every text is inside its row`).toBe(true);
    };
    expect(await px(row(page, 'all-parts', 'src').locator('> bdi'), 'font-size')).toBe(normal * 2);
    expect(await px(row(page, 'all-parts', 'src').locator('[data-supporting-text]'), 'font-size')).toBeGreaterThan(normal);
    await whole('200 %');
    // The glyphs' boxes are a token in rem here; they stay on the first line, centred.
    const d = await drawn(row(page, 'long-labels', 'swiftui/Sources/Tanrei/Generated/TanreiTokens.swift'));
    expect(d.chevron.size).toBe(await resolveToken(page, T('chevron-size-regular')));
    expect(chevron).toBeGreaterThan(0);
    near(d.chevron.top + d.chevron.size / 2, d.firstLine + d.line / 2);
    expect(d.row.height).toBeGreaterThan(d.line * 3);
    expect(await css(row(page, 'all-parts', 'src'), 'height')).not.toBe(await css(row(page, 'all-parts', 'src'), 'min-height'));
    // TRV-3 keeps half of the width for names.
    const tree = await edges(host(page, 'deep'));
    expect((await drawn(row(page, 'deep', 'With armrests'))).container.left - tree.left).toBeLessThanOrEqual(tree.width / 2 + 0.5);
    // Raised line height, letter, word and paragraph spacing (WCAG 1.4.12).
    await page.addStyleTag({ content: `${TAG} * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } ${TAG} p { margin-block-end: 2em !important; }` });
    await whole('with raised text spacing');
  });

  test('TRV-35: with forced colors the labels, texts, icons, chevrons and guides are drawn in the text color, a selected row in the selection’s colors with an edge inside its container, a disabled row in the disabled text’s color, and focus as a ring inside the row; open is still told by the chevron’s turn', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { fixtures: some('all-parts', 'disabled') });
    const system = (name: string) =>
      page.evaluate((color) => {
        const probe = document.createElement('div');
        probe.style.color = color;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const text = await system('CanvasText');
    const r = row(page, 'all-parts', 'src');
    expect(await css(r, 'color')).toBe(text);
    expect(await css(r, 'color', '::before')).toBe(text);
    expect(await css(r.locator('> .tanrei-icon'), 'color')).toBe(text);
    expect(await css(r.locator('[data-supporting-text]'), 'color')).toBe(text);
    expect(await css(r.locator('> [data-trailing-text]'), 'color')).toBe(text);
    expect(await item(page, 'all-parts', 'src').locator('> ul').evaluate((list) => getComputedStyle(list, '::before').borderLeftColor)).toBe(text);
    const chosen = row(page, 'all-parts', 'index.ts');
    expect(await css(chosen, 'background-color', '::after')).toBe(await system('SelectedItem'));
    expect(await css(chosen, 'color')).toBe(await system('SelectedItemText'));
    expect(await px(chosen, 'border-top-width', '::after')).toBeGreaterThan(0);
    expect(await css(chosen, 'border-top-color', '::after')).toBe(text);
    expect(await css(row(page, 'disabled', 'typeface'), 'color')).toBe(await system('GrayText'));
    expect(await css(row(page, 'disabled', 'typeface'), 'opacity')).toBe('1');
    await tabTo(page, row(page, 'all-parts', 'index.ts'));
    await page.keyboard.press('Home');
    expect(await css(r, 'border-top-color', '::after')).toBe(await system('Highlight'));
    expect(await px(r, 'border-top-width', '::after')).toBe(await resolveToken(page, '--tanrei-sys-focus-outer-width'));
    expect(await px(r, 'top', '::after')).toBe(0);
    expect((await drawn(r)).chevron.rotate).toBe('90deg');
    expect((await drawn(row(page, 'all-parts', 'components'))).chevron.rotate).toBe('none');
  });
});

test.describe('right to left', () => {
  test('TRV-36: in a right-to-left layout a row is mirrored — the tree’s start edge is its right edge, each level begins further to the left, the chevron’s box is at the right with the icon, the text and the trailing text after it toward the left, and the guides stand under the chevrons; a closed parent’s chevron points left and an open one’s down; Left opens and steps in, Right closes and steps out; a ripple still grows from the point of contact', async ({ page }) => {
    await mount(page, { fixtures: some('rtl', 'rtl-guides-compact'), reducedMotion: true });
    await watch(page);
    const tree = await edges(host(page, 'rtl'));
    const indent = await resolveToken(page, T('level-indent-regular'));
    const pad = await resolveToken(page, T('container-padding-inline-regular'));
    const gap = await resolveToken(page, T('container-gap-regular'));
    for (const [level, label] of ['المشروع', 'المكوّنات', 'زر'].entries()) {
      const d = await drawn(row(page, 'rtl', label));
      near(d.container.right, tree.right - indent * level);
      near(d.container.left, tree.left);
      near(d.chevron.right, d.container.right - pad);
      const glyph = await edges(row(page, 'rtl', label).locator('> .tanrei-icon'));
      near(glyph.right, d.chevron.left - gap);
      near(d.text!.right, glyph.left - gap, 1);
    }
    const readme = row(page, 'rtl', 'اقرأني');
    near((await edges(readme.locator('> [data-trailing-text]'))).left, tree.left + pad);
    // The chevron: mirrored while closed, down while open.
    const closed = (await drawn(row(page, 'rtl', 'الأنماط'))).chevron;
    const open = (await drawn(row(page, 'rtl', 'المشروع'))).chevron;
    expect(closed.scale).toBe('-1 1');
    expect(closed.rotate).toBe('none');
    expect(open.scale).toBe('-1 1');
    expect(open.rotate).toBe('-90deg');
    // The guide under the parent's chevron.
    const line = await item(page, 'rtl-guides-compact', 'المشروع')
      .locator('> ul')
      .evaluate((list) => {
        const s = getComputedStyle(list, '::before');
        return list.getBoundingClientRect().right - Number.parseFloat(s.right) - Number.parseFloat(s.borderRightWidth) / 2 - Number.parseFloat(s.borderLeftWidth) / 2;
      });
    const parent = (await drawn(row(page, 'rtl-guides-compact', 'المشروع'))).chevron;
    near(line, (parent.left + parent.right) / 2);
    // The keys follow the direction.
    await row(page, 'rtl', 'الأنماط').focus();
    await page.keyboard.press('ArrowLeft');
    expect(await events(page)).toEqual(['toggle:الأنماط:true']);
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('الألوان');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('الأنماط');
    await page.keyboard.press('ArrowRight');
    expect(await events(page)).toEqual(['toggle:الأنماط:false']);
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('اقرأني');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('المشروع');
    // The chevron's hit area is at the right; a ripple grows from the point of contact.
    const styles = await drawn(row(page, 'rtl', 'الأنماط'));
    await page.mouse.click(styles.row.right - 2, (styles.row.top + styles.row.bottom) / 2);
    expect(await events(page)).toEqual(['toggle:الأنماط:true']);
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    await page.mouse.move(styles.row.left + 30, styles.row.top + 10);
    await page.mouse.down();
    near(Number.parseFloat(await row(page, 'rtl', 'الأنماط').locator('.ripple').evaluate((el) => el.style.getPropertyValue('--_x'))), 30);
    await page.mouse.up();
  });

  test('TRV-37: the direction comes from the nearest ancestor that sets one, not from the root, and a change of it is drawn at once, with no motion, keeping the selection, every parent’s open and the focus', async ({ page }) => {
    await mount(page, { fixtures: some('single', 'rtl') });
    expect(await page.locator('html').getAttribute('dir')).toBeNull();
    expect((await drawn(row(page, 'rtl', 'المشروع'))).rtl).toBe(true);
    expect(await host(page, 'rtl').getAttribute('dir')).toBeNull();
    const r = row(page, 'single', 'checkbox.ts');
    await tabTo(page, row(page, 'single', 'checkbox.ts'));
    const before = await drawn(r);
    const tree = await edges(host(page, 'single'));
    await stage(page, 'single').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const after = await drawn(r);
    expect(after.rtl).toBe(true);
    near(after.container.right, tree.right - (before.container.left - tree.left));
    near(after.chevron.right, tree.right - (before.chevron.left - tree.left));
    expect(await moving(page)).toBe(0);
    expect(await focused(page)).toBe('checkbox.ts');
    await expect(row(page, 'single', 'checkbox.ts')).toHaveAttribute('aria-selected', 'true');
    await expect(item(page, 'single', 'components')).toHaveAttribute('data-open', '');
    expect(await shownRows(page, 'single')).toHaveLength(10);
  });

  test('TRV-38: in a right-to-left layout an icon is mirrored exactly when the icon set marks its name — arrow_forward is, settings is not — in its own box, and never when the product forbids it; the chevron’s quarter turn ends pointing down in both directions', async ({ page }) => {
    await mount(page, { fixtures: [...some('icons-rtl', 'icons'), raw('forbidden', { label: 'Forbidden' }, '<ul><li><span><span class="tanrei-icon" data-mirror="never">arrow_forward</span>لا</span></li></ul>', { direction: 'rtl' })] });
    const glyph = (id: string, label: string) => row(page, id, label).locator('> .tanrei-icon');
    await expect(glyph('icons-rtl', 'اللغة')).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(glyph('icons-rtl', 'اللغة'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(glyph('icons-rtl', 'عام'), 'transform')).toBe('none');
    expect(await css(glyph('icons-rtl', 'الملفات'), 'transform')).toBe('none');
    expect(await css(host(page, 'forbidden').locator('.tanrei-icon'), 'transform')).toBe('none');
    // In its own box: the same place and size as its unmirrored neighbour's.
    const size = await resolveToken(page, T('icon-size-regular'));
    expect((await edges(glyph('icons-rtl', 'اللغة'))).width).toBe(size);
    near((await edges(glyph('icons-rtl', 'اللغة'))).right, (await edges(glyph('icons-rtl', 'المظهر'))).right);
    // Left to right, nothing is mirrored.
    expect(await css(glyph('icons', 'src'), 'transform')).toBe('none');
    expect((await drawn(row(page, 'icons', 'src'))).chevron).toMatchObject({ scale: 'none', rotate: '90deg' });
    expect((await drawn(row(page, 'icons-rtl', 'عام'))).chevron).toMatchObject({ scale: '-1 1', rotate: '-90deg' });
  });

  test('TRV-39: a left-to-right label in a right-to-left row reads left to right and keeps its own order, with its lines on the layout’s side; its supporting text and its trailing text are each text of their own direction, and a trailing text that does not fit is cut at its own end', async ({ page, browserName }) => {
    await mount(page, {
      fixtures: [
        ...some('ltr-labels-rtl', 'rtl'),
        raw('own', { label: 'Own' }, '<ul><li><span>tokens/</span></li><li><span><bdi>قائمة<small data-supporting-text>edited by hand.</small></bdi><span data-trailing-text id="cut">a left-to-right value that is far too long for half of the row it is in.</span></span></li></ul>', { direction: 'rtl' }),
      ],
    });
    const glyphs = (locator: Locator, from: number, to: number) =>
      locator.evaluate(
        (el, [a, b]) => {
          const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()) as Text;
          const range = document.createRange();
          const at = (i: number) => {
            const index = i < 0 ? node.length + i : i;
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            return range.getBoundingClientRect().left;
          };
          return [at(a), at(b)];
        },
        [from, to] as const,
      );
    // "tokens/": the t at the left of the slash, the whole name at the right of its column.
    const r = row(page, 'ltr-labels-rtl', 'tokens/');
    const [t, slash] = await glyphs(r.locator('> bdi'), 0, -1);
    expect(t).toBeLessThan(slash);
    const d = await drawn(r);
    const icon = await edges(r.locator('> .tanrei-icon'));
    expect(d.text!.right).toBeLessThan(icon.left);
    // Its supporting text: its own order, after the label on the label's own side.
    const supporting = r.locator('[data-supporting-text]');
    expect(await css(supporting, 'unicode-bidi')).toBe('plaintext');
    const [s, last] = await glyphs(supporting, 0, -1);
    expect(s).toBeLessThan(last);
    expect(s).toBeGreaterThan(slash);
    // A wrapped name's lines stand on the layout's side: at the right.
    const wrapped = row(page, 'ltr-labels-rtl', 'generated/');
    // (The place to break before it is a box with no width, or next to none.)
    const lines = await wrapped.locator('[data-supporting-text]').evaluate((el) => [...el.getClientRects()].filter((rect) => rect.width > 1).map((rect) => Math.round(rect.right)));
    expect(lines.length).toBeGreaterThan(1);
    for (const right of lines) near(right, Math.max(...lines), 1);
    expect(await css(wrapped, 'text-align')).toBe('right');
    // English after an Arabic label: its full stop at its own end, the right.
    const second = host(page, 'own').locator('li').nth(1);
    const [e, stop] = await glyphs(second.locator('[data-supporting-text]'), 0, -1);
    expect(e).toBeLessThan(stop);
    // A trailing text is cut at the end of its own direction: its first letter is drawn, at its left.
    const cut = page.locator('#cut');
    await expect(cut).toHaveAttribute('dir', 'auto');
    expect(await css(cut, 'direction')).toBe('ltr');
    expect(await cut.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const [first] = await glyphs(cut, 0, 1);
    near(first, (await edges(cut)).left, 1);
    // A row's own text, with no element around it, takes its own direction where the browser gives an unnamed box
    // its container's: Chromium and WebKit do.
    const bare = host(page, 'own').locator('li').first().locator('> span');
    const [bt, bslash] = await glyphs(bare, 0, -1);
    if (browserName === 'firefox') expect(bt).toBeGreaterThan(bslash);
    else expect(bt).toBeLessThan(bslash);
  });

  test('TRV-39: a name that has an isolate of its own inside the label’s element, and the supporting text after it, are each a run of their own direction placed by the layout’s — the supporting text after the name on the layout’s side, the row’s gap between them, and the row’s gap before the trailing text', async ({ page }) => {
    const item = (name: string, supporting: string, trailing: string) => `<li><span><span><bdi>${name}</bdi><small data-supporting-text>${supporting}</small></span><span data-trailing-text>${trailing}</span></span></li>`;
    await mount(page, {
      fixtures: [
        raw('named-rtl', { label: 'Named' }, `<ul>${item('tokens/', 'مصدر الحقيقة', '40px')}${item('generated/', 'written by the build.', '12')}${item('قائمة', 'edited by hand.', '3')}</ul>`, { direction: 'rtl' }),
        raw('named-ltr', { label: 'Named' }, `<ul>${item('قائمة/', 'edited by hand.', '40px')}${item('tokens/', 'مصدر الحقيقة', '12')}</ul>`),
      ],
    });
    const gap = await resolveToken(page, T('container-gap-regular'));
    const parts = async (id: string, index: number) => {
      const r = host(page, id).locator('li').nth(index).locator('> :first-child');
      const letters = (locator: Locator) =>
        locator.evaluate((el) => {
          const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()) as Text;
          const range = document.createRange();
          const at = (index: number) => {
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            return range.getBoundingClientRect().left;
          };
          range.selectNodeContents(node);
          const { left, right } = range.getBoundingClientRect();
          return { left, right, first: at(0), last: at(node.length - 1) };
        });
      return { name: await letters(r.locator('bdi')), supporting: await letters(r.locator('[data-supporting-text]')), trailing: await edges(r.locator('[data-trailing-text]')), label: await edges(r.locator('> span').first()), direction: await css(r.locator('> span').first(), 'direction') };
    };
    // Right to left: the name at the right, the supporting text at its left after the gap, the trailing text at the
    // row's left end — whatever the direction of each.
    for (const index of [0, 1, 2]) {
      const p = await parts('named-rtl', index);
      expect(p.direction, String(index)).toBe('rtl');
      near(p.name.right, p.label.right, 1);
      near(p.supporting.right, p.name.left - gap, 1);
      expect(p.trailing.right, String(index)).toBeLessThanOrEqual(p.supporting.left - gap + 0.6);
    }
    // Each keeps its own order: "tokens/" and "written by the build." read from the left, the Arabic from the right.
    const [latin, english, arabic] = [await parts('named-rtl', 0), await parts('named-rtl', 1), await parts('named-rtl', 2)];
    expect(latin.name.first).toBeLessThan(latin.name.last);
    expect(latin.supporting.first).toBeGreaterThan(latin.supporting.last);
    expect(english.supporting.first).toBeLessThan(english.supporting.last);
    expect(arabic.name.first).toBeGreaterThan(arabic.name.last);
    // Left to right, mirrored: the name at the left, the supporting text at its right.
    for (const index of [0, 1]) {
      const p = await parts('named-ltr', index);
      near(p.name.left, p.label.left, 1);
      near(p.supporting.left, p.name.right + gap, 1);
      expect(p.trailing.left, String(index)).toBeGreaterThanOrEqual(p.supporting.right + gap - 0.6);
    }
  });
});

test.describe('missing, unknown, empty, changed', () => {
  test('TRV-40: while the icon set cannot draw a glyph the chevron and an icon draw nothing — never the glyph’s name — and keep their boxes, a parent opens and closes all the same, and the glyphs are drawn once the font arrives', async ({ page }) => {
    await mount(page, { fixtures: some('icons'), reducedMotion: true });
    const r = row(page, 'icons', 'styles');
    expect(await css(r, 'visibility', '::before')).toBe('visible');
    const family = await withoutIconFont(page);
    await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
    await expect(host(page, 'icons')).toHaveAttribute('data-glyphs', 'pending');
    expect(await css(r, 'visibility', '::before')).toBe('hidden');
    expect(await css(r.locator('> .tanrei-icon'), 'visibility')).toBe('hidden');
    expect(await px(r, 'width', '::before')).toBe(await resolveToken(page, T('chevron-size-regular')));
    expect((await edges(r.locator('> .tanrei-icon'))).width).toBe(await resolveToken(page, T('icon-size-regular')));
    await r.click();
    await expect(item(page, 'icons', 'styles')).toHaveAttribute('data-open', '');
    // The box the name is measured in is no item and no row.
    expect(await host(page, 'icons').getAttribute('role')).toBe('tree');
    await iconFaceArrives(page, family);
    await expect(host(page, 'icons')).not.toHaveAttribute('data-glyphs');
    expect(await css(r, 'visibility', '::before')).toBe('visible');
    await expect(host(page, 'icons').locator('[data-tanrei-glyph-probe]')).toHaveCount(0);
  });

  test('TRV-41: a density the active design system does not have is drawn as the default and a selection the tree does not define as none, each reported; a density a design system adds is drawn from its tokens; a change of selection is drawn at once, keeping every parent’s open and the focus, and emits no change', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, { fixtures: [raw('unknown', { label: 'Unknown', density: 'huge', selection: 'several', value: 'a1' }, SMALL), raw('added', { label: 'Added', density: 'roomy' }, SMALL), raw('turned', { label: 'Turned', value: 'a1' }, SMALL)] });
    await nameItems(page);
    await watch(page);
    const regular = await resolveToken(page, T('container-height-regular'));
    expect((await edges(row(page, 'unknown', 'Alpha'))).height).toBe(Math.max(regular, await resolveToken(page, '--tanrei-sys-target-pointer')));
    await expect(host(page, 'unknown').locator('[aria-selected]')).toHaveCount(0);
    await row(page, 'unknown', 'Delta').click();
    expect(await events(page)).toEqual([]);
    expect(seen.filter((text) => text.includes('TRV-41') && text.includes('"huge"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('TRV-41') && text.includes('"several"'))).toHaveLength(1);
    // A density a design system adds: its tokens, the default's where it has none.
    await override(page, { [T('container-height-roomy')]: '72px', [T('level-indent-roomy')]: '40px' });
    await host(page, 'added').evaluate((el) => {
      el.setAttribute('density', 'regular');
      el.setAttribute('density', 'roomy');
    });
    await expect.poll(async () => (await edges(row(page, 'added', 'Alpha'))).height).toBe(72);
    near((await drawn(row(page, 'added', 'Apple'))).container.left, (await edges(host(page, 'added'))).left + 40);
    expect(await css(row(page, 'added', 'Alpha'), 'font-size')).toBe(await css(row(page, 'turned', 'Alpha'), 'font-size'));
    // A change of selection.
    await tabTo(page, row(page, 'turned', 'Alpha'));
    await page.keyboard.press('ArrowDown');
    await host(page, 'turned').evaluate((el) => el.setAttribute('selection', 'single'));
    await expect(row(page, 'turned', 'Apple')).toHaveAttribute('aria-selected', 'true');
    await expect(row(page, 'turned', 'Alpha')).toHaveAttribute('aria-selected', 'false');
    expect(await focused(page)).toBe('Apple');
    await expect(item(page, 'turned', 'Alpha')).toHaveAttribute('data-open', '');
    await host(page, 'turned').evaluate((el) => el.setAttribute('selection', 'none'));
    await expect(host(page, 'turned').locator('[aria-selected]')).toHaveCount(0);
    expect(await events(page)).toEqual([]);
  });

  test('TRV-42: a tree with no items draws nothing, takes no space, exposes nothing and is no stop; an item that holds no items and is not expandable is a leaf whatever its open and loading say; items added or removed are drawn at once, without motion, keeping the selection, every other parent’s open and the focus', async ({ page }) => {
    await mount(page, { fixtures: [raw('empty', { label: 'Empty' }, ''), raw('hollow', { label: 'Hollow' }, '<ul></ul>'), raw('small', { label: 'Small', selection: 'single', value: 'a1' }, SMALL.replace('<li><span>Epsilon</span></li>', '<li data-open data-loading><span>Epsilon</span><ul></ul></li>'))] });
    await nameItems(page);
    await watch(page);
    for (const id of ['empty', 'hollow']) {
      expect((await edges(host(page, id))).height).toBe(0);
      expect(await host(page, id).getAttribute('role')).toBeNull();
      expect(await host(page, id).locator('[tabindex]').count()).toBe(0);
    }
    // A leaf, whatever it says.
    const leaf = item(page, 'small', 'Epsilon');
    expect((await drawn(row(page, 'small', 'Epsilon'))).chevron.content).not.toContain('chevron_right');
    expect(await row(page, 'small', 'Epsilon').getAttribute('aria-expanded')).toBeNull();
    expect(await row(page, 'small', 'Epsilon').getAttribute('aria-busy')).toBeNull();
    await expect(leaf.locator('tanrei-loading-indicator')).toHaveCount(0);
    expect((await edges(leaf)).height).toBe((await edges(row(page, 'small', 'Epsilon'))).height);
    // Given items, it is a parent, at once.
    await tabTo(page, row(page, 'small', 'Apple'));
    await leaf.evaluate((el) => {
      el.removeAttribute('data-loading');
      el.querySelector('ul')!.innerHTML = '<li data-value="e1" data-t="Eel"><span>Eel</span></li>';
    });
    await expect(row(page, 'small', 'Epsilon')).toHaveAttribute('aria-expanded', 'true');
    await expect(row(page, 'small', 'Eel')).toHaveAttribute('role', 'treeitem');
    await expect(row(page, 'small', 'Eel')).toBeVisible();
    expect(await moving(page)).toBe(0);
    expect((await drawn(row(page, 'small', 'Epsilon'))).chevron.content).toContain('chevron_right');
    // Added to a list that is shown; removed again: selection, open and focus are kept.
    await item(page, 'small', 'Alpha').evaluate((el) => el.querySelector('ul')!.insertAdjacentHTML('afterbegin', '<li data-value="a0" data-t="Acorn"><span>Acorn</span></li>'));
    await expect(row(page, 'small', 'Acorn')).toHaveAttribute('aria-selected', 'false');
    expect(await shownRows(page, 'small')).toEqual(['Alpha', 'Acorn', 'Apple', 'Apricot', 'Almond', 'Avocado', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Eel']);
    await item(page, 'small', 'Acorn').evaluate((el) => el.remove());
    expect(await moving(page)).toBe(0);
    expect(await focused(page)).toBe('Apple');
    await expect(row(page, 'small', 'Apple')).toHaveAttribute('aria-selected', 'true');
    await expect(item(page, 'small', 'Apricot')).toHaveAttribute('data-open', '');
    expect(await events(page)).toEqual([]);
    // The last item of a parent taken away: a leaf again.
    await item(page, 'small', 'Eel').evaluate((el) => el.remove());
    await expect.poll(() => row(page, 'small', 'Epsilon').getAttribute('aria-expanded')).toBeNull();
  });
});

test.describe('indent and disclosure', () => {
  /** Where a row's icon begins, from the tree's start edge (its left in these left-to-right fixtures). */
  const iconAt = async (page: P, id: string, label: string) => (await edges(row(page, id, label).locator('> .tanrei-icon'))).left - (await edges(host(page, id))).left;
  const chevronAt = async (page: P, id: string, label: string) => (await drawn(row(page, id, label))).chevron.left - (await edges(host(page, id))).left;

  test('TRV-43: while indent is compact a leaf keeps no chevron’s box — its icon begins where its level’s chevrons do, so that a parent’s leaves have their icons under the parent’s own icon — and a parent’s row, the step of a level and the guides are as while it is regular', async ({ page }) => {
    await mount(page, { fixtures: some('icons', 'indent-compact', 'indent-compact-dense', 'compact-guides') });
    for (const [id, density, twin] of [
      ['indent-compact', 'regular', 'icons'],
      ['indent-compact-dense', 'compact', 'compact-guides'],
    ] as const) {
      const pad = await resolveToken(page, T(`container-padding-inline-${density}`));
      const step = await resolveToken(page, T(`level-indent-${density}`));
      const chevron = await resolveToken(page, T(`chevron-size-${density}`));
      const gap = await resolveToken(page, T(`container-gap-${density}`));
      // The default step is the chevron's box and one gap: a child's chevron stands where its parent's icon begins.
      expect(step).toBe(chevron + gap);
      // A parent is drawn as it is in the regular indent: its chevron at its level's start, its icon after the box.
      near(await chevronAt(page, id, 'src'), pad);
      near(await iconAt(page, id, 'src'), pad + chevron + gap);
      near(await chevronAt(page, id, 'components'), pad + step);
      // A leaf under a parent: its icon in the column of the parent's own icon.
      near(await iconAt(page, id, 'index.ts'), await iconAt(page, id, 'src'));
      near(await iconAt(page, id, 'button.ts'), await iconAt(page, id, 'components'));
      // A leaf of the first level: its icon where the first level's chevrons are.
      near(await iconAt(page, id, 'package.json'), pad);
      expect(await css(row(page, id, 'package.json'), 'display', '::before')).toBe('none');
      // The row of a leaf is as high and its container begins where it would in the regular indent.
      expect((await edges(row(page, id, 'index.ts'))).height).toBe((await edges(row(page, twin, 'index.ts'))).height);
      near((await drawn(row(page, id, 'index.ts'))).container.left - (await edges(host(page, id))).left, (await drawn(row(page, twin, 'index.ts'))).container.left - (await edges(host(page, twin))).left);
    }
    // In the regular indent a leaf keeps the box: its icon one box and a gap further in than in the compact one.
    const chevron = await resolveToken(page, T('chevron-size-regular'));
    const gap = await resolveToken(page, T('container-gap-regular'));
    near(await iconAt(page, 'icons', 'index.ts'), (await iconAt(page, 'indent-compact', 'index.ts')) + chevron + gap);
    // The guides stand where they stand in the regular indent: under the parent's chevron.
    const guide = (id: string) => item(page, id, 'src').locator('> ul').evaluate((list) => list.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(list, '::before').left));
    near(await guide('indent-compact-dense'), await guide('compact-guides'));
  });

  test('TRV-44, TRV-5: while disclosure is icon a parent that names an icon and an open icon draws no chevron and keeps no box, shows open and closed by its glyph — changed at once — and is opened and closed by a press on it, not chosen; a leaf keeps no box; Right Arrow opens it; its expanded state is the same; a parent without an open icon keeps its chevron, reported; with disclosure chevron the open icon is drawn beside the chevron', async ({ page }) => {
    const seen = warnings(page);
    const mixed = '<ul><li data-value="f" data-open><span><i class="tanrei-icon">folder</i>Folder</span><ul><li data-value="f1"><span><i class="tanrei-icon">draft</i>Note</span></li></ul></li><li data-value="g"><span><i class="tanrei-icon">folder</i>Plain</span><ul><li><span>Inner</span></li></ul></li></ul>';
    await mount(page, { fixtures: [...some('disclosure-icon', 'disclosure-icon-compact', 'icons'), raw('mixed', { label: 'Mixed', disclosure: 'icon' }, mixed), raw('both', { label: 'Both' }, mixed.replace('<i class="tanrei-icon">folder</i>Folder', '<i class="tanrei-icon" data-open-icon="folder_open">folder</i>Folder'))] });
    await nameItems(page);
    await watch(page);
    const id = 'disclosure-icon';
    const pad = await resolveToken(page, T('container-padding-inline-regular'));
    const start = (await edges(host(page, id))).left;
    for (const label of ['src', 'components', 'styles', 'index.ts', 'test', 'package.json']) {
      expect(await css(row(page, id, label), 'display', '::before'), label).toBe('none');
    }
    // The icon begins at its level's start, where the chevron's box would be.
    near((await edges(row(page, id, 'src').locator('> .tanrei-icon'))).left - start, pad);
    near((await edges(row(page, id, 'package.json').locator('> .tanrei-icon'))).left - start, pad);
    // Open: the open glyph, in the icon's box; closed: the icon's own.
    const glyph = (label: string) => row(page, id, label).locator('> .tanrei-icon').evaluate((icon) => getComputedStyle(icon, '::before').content);
    expect(await glyph('src')).toContain('folder_open');
    expect(await glyph('styles')).not.toContain('folder_open');
    expect((await edges(row(page, id, 'src').locator('> .tanrei-icon'))).width).toBe(await resolveToken(page, T('icon-size-regular')));
    // A press on a closed parent's icon opens it and chooses nothing; at once the open glyph.
    await row(page, id, 'styles').locator('> .tanrei-icon').click();
    expect(await events(page)).toEqual(['toggle:styles:true']);
    expect(await glyph('styles')).toContain('folder_open');
    await settled(page);
    // A press on its label chooses it and opens nothing.
    await row(page, id, 'styles').locator('bdi').click();
    expect(await events(page)).toEqual(['change:{"value":"src/styles"}']);
    // The keys: Right Arrow opens a closed parent, as it does one with a chevron.
    await row(page, id, 'test').focus();
    await page.keyboard.press('ArrowRight');
    expect(await events(page)).toEqual(['toggle:test:true']);
    await settled(page);
    // The expanded state is the row's, the same as with chevrons.
    await expect(row(page, id, 'src')).toHaveAttribute('aria-expanded', 'true');
    await expect(row(page, 'icons', 'src')).toHaveAttribute('aria-expanded', 'true');
    // The guide line stands under the open parent's icon.
    const compact = 'disclosure-icon-compact';
    const iconBox = await edges(row(page, compact, 'src').locator('> .tanrei-icon'));
    const line = await item(page, compact, 'src')
      .locator('> ul')
      .evaluate((list) => list.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(list, '::before').left) + Number.parseFloat(getComputedStyle(list, '::before').borderLeftWidth) / 2);
    near(line, iconBox.left + iconBox.width / 2, 1);
    // A parent with no open icon keeps its chevron, and a debug build says so once.
    expect((await drawn(row(page, 'mixed', 'Plain'))).chevron.content).toContain('chevron_right');
    expect(await css(row(page, 'mixed', 'Folder'), 'display', '::before')).not.toBe('none');
    expect(seen.filter((text) => text.includes('TRV-44')).length).toBeGreaterThanOrEqual(1);
    // With disclosure chevron the open glyph is drawn while open, beside the chevron.
    expect((await drawn(row(page, 'both', 'Folder'))).chevron.content).toContain('chevron_right');
    expect(await row(page, 'both', 'Folder').locator('> .tanrei-icon').evaluate((el) => getComputedStyle(el, '::before').content)).toContain('folder_open');
  });

  test('TRV-41: an indent or a disclosure the tree does not define is drawn as regular and as chevron, each reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, { fixtures: [raw('odd', { label: 'Odd', indent: 'tight', disclosure: 'glyph' }, '<ul><li data-open><span><i class="tanrei-icon" data-open-icon="folder_open">folder</i>Folder</span><ul><li><span>Leaf</span></li></ul></li><li><span>Top</span></li></ul>')] });
    await nameItems(page);
    expect((await drawn(row(page, 'odd', 'Folder'))).chevron.content).toContain('chevron_right');
    expect(await css(row(page, 'odd', 'Top'), 'display', '::before')).not.toBe('none');
    expect(seen.filter((text) => text.includes('TRV-41') && text.includes('"tight"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('TRV-41') && text.includes('"glyph"'))).toHaveLength(1);
  });
});

test.describe('editing in place', () => {
  /** Every `rename` and `create` on the page, in order. */
  const watchEdits = (page: P) =>
    page.evaluate(() => {
      const w = window as unknown as { __edits: string[] };
      w.__edits = [];
      document.addEventListener('rename', (event) => {
        const d = (event as CustomEvent<{ label: string; previous: string }>).detail;
        w.__edits.push(`rename:${(event.target as Element).getAttribute('data-t')}:${d.label}:${d.previous}`);
      });
      document.addEventListener('create', (event) => {
        const d = (event as CustomEvent<{ label: string; parent: boolean; within: Element | null; after: Element | null }>).detail;
        w.__edits.push(`create:${d.label}:${d.parent}:${d.within?.getAttribute('data-t') ?? null}:${d.after?.getAttribute('data-t') ?? null}`);
      });
    });
  const edits = (page: P) => page.evaluate(() => (window as unknown as { __edits: string[] }).__edits.splice(0));
  const field = (page: P, id: string) => host(page, id).locator('tanrei-embedded-text-input');
  /** The native input of the open field, and what of it is selected. */
  const typed = (page: P, id: string) =>
    field(page, id).evaluate((el) => {
      const input = el.shadowRoot!.querySelector('input')!;
      return { value: input.value, selected: input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0), focused: el.shadowRoot!.activeElement === input, name: input.getAttribute('aria-label') };
    });
  const editable = (props: Fixture['props']) => ({ editable: true, editLabel: 'Name', ...props });

  test('TRV-45: while editable, a double-click on a row’s label, F2 on a focused row and edit() each open the field on its name; not on a disabled item or one whose label is inline content; while not editable none of them does', async ({ page }) => {
    const inline = '<ul><li data-value="x"><span><span><code>x</code> code</span></span></li><li data-value="y"><span>Yankee</span></li></ul>';
    await mount(page, { fixtures: [raw('small', editable({ label: 'Small', selection: 'single' }), SMALL), raw('fixed', { label: 'Fixed', selection: 'single' }, SMALL), raw('inline', editable({ label: 'Inline' }), inline)] });
    await nameItems(page);
    await watch(page);
    // A double-click on the label: the two presses are answered as presses (one change), then the field opens.
    const onText = async (id: string, label: string) => {
      await row(page, id, label).scrollIntoViewIfNeeded();
      const text = (await drawn(row(page, id, label))).text!;
      await page.mouse.dblclick((text.left + text.right) / 2, (text.top + text.bottom) / 2);
    };
    await onText('small', 'Delta');
    await expect(field(page, 'small')).toHaveCount(1);
    expect(await events(page)).toEqual(['change:{"value":"d"}']);
    await page.keyboard.press('Escape');
    await expect(field(page, 'small')).toHaveCount(0);
    // F2 on the focused row.
    expect(await focused(page)).toBe('Delta');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('F2');
    await expect(field(page, 'small')).toHaveCount(1);
    await expect(row(page, 'small', 'Gamma')).toHaveAttribute('data-tanrei-editing', '');
    await page.keyboard.press('Escape');
    // The method.
    expect(await host(page, 'small').evaluate((tree: HTMLElement & { edit(li: Element): boolean }) => tree.edit(tree.querySelector('li[data-t="Apple"]')!))).toBe(true);
    await expect(row(page, 'small', 'Apple')).toHaveAttribute('data-tanrei-editing', '');
    await page.keyboard.press('Escape');
    // Not on a disabled item, nor on a label of inline content.
    expect(await host(page, 'small').evaluate((tree: HTMLElement & { edit(li: Element): boolean }) => tree.edit(tree.querySelector('li[data-t="Avocado"]')!))).toBe(false);
    await row(page, 'small', 'Avocado').focus();
    await page.keyboard.press('F2');
    await expect(field(page, 'small')).toHaveCount(0);
    expect(await host(page, 'inline').evaluate((tree: HTMLElement & { edit(li: Element): boolean }) => tree.edit(tree.querySelector('li[data-value="x"]')!))).toBe(false);
    expect(await host(page, 'inline').evaluate((tree: HTMLElement & { edit(li: Element): boolean }) => tree.edit(tree.querySelector('li[data-value="y"]')!))).toBe(true);
    await page.keyboard.press('Escape');
    // Not editable: none of the three.
    await onText('fixed', 'Delta');
    await page.keyboard.press('F2');
    expect(await host(page, 'fixed').evaluate((tree: HTMLElement & { edit(li: Element): boolean }) => tree.edit(tree.querySelector('li[data-t="Apple"]')!))).toBe(false);
    await expect(field(page, 'fixed')).toHaveCount(0);
  });

  test('TRV-46, TRV-47: the field holds the label in the label’s text style with the name before its extension selected and the focus indicator around it; Enter emits one rename and keeps the old label drawn, focus back on the row; Escape and an empty or unchanged name emit nothing; leaving the field commits; the tree’s keys are the field’s; the selection and every open stay', async ({ page }) => {
    const files = '<ul><li data-value="src" data-open><span>src</span><ul><li data-value="button.ts"><span>button.ts</span></li><li data-value=".env"><span>.env</span></li></ul></li><li data-value="readme"><span>README</span></li></ul>';
    await mount(page, { fixtures: [raw('files', editable({ label: 'Files', selection: 'single', value: 'readme' }), files), raw('nameless', { label: 'Nameless', editable: true }, files)] });
    await nameItems(page);
    await watch(page);
    await watchEdits(page);
    const tree = host(page, 'files');
    const edit = (label: string) => tree.evaluate((el: HTMLElement & { edit(li: Element): boolean }, l) => el.edit(el.querySelector(`li[data-t="${l}"]`)!), label);
    await edit('button.ts');
    await expect.poll(async () => (await typed(page, 'files')).focused).toBe(true);
    const open = await typed(page, 'files');
    expect(open).toMatchObject({ value: 'button.ts', selected: 'button', name: 'Name' });
    // The label's text style, over the label's first line; the focus indicator around the field's box.
    const input = field(page, 'files');
    const inner = input.evaluate((el) => {
      const s = getComputedStyle(el.shadowRoot!.querySelector('input')!);
      return { size: s.fontSize, family: s.fontFamily };
    });
    expect((await inner).size).toBe(await css(row(page, 'files', 'button.ts'), 'font-size'));
    expect(unquoted((await inner).family)).toBe(unquoted(await css(row(page, 'files', 'button.ts'), 'font-family')));
    expect(await css(host(page, 'files').locator('[data-tanrei-edit]'), 'box-shadow')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // The tree's keys are the field's: the arrows move the caret, type-ahead types.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('x');
    expect((await typed(page, 'files')).value).toBe('buttonx.ts');
    expect(await focused(page)).toBe('tanrei-embedded-text-input');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Meta+A');
    await page.keyboard.type('  toggle.ts ');
    await page.keyboard.press('Enter');
    expect(await edits(page)).toEqual(['rename:button.ts:toggle.ts:button.ts']);
    await expect(input).toHaveCount(0);
    expect(await focused(page)).toBe('button.ts');
    // The tree changed no label, no selection and no open.
    await expect(row(page, 'files', 'button.ts')).toHaveText('button.ts');
    expect(await events(page)).toEqual([]);
    await expect(row(page, 'files', 'README')).toHaveAttribute('aria-selected', 'true');
    // A label the product sets in answer is drawn at once.
    await item(page, 'files', 'button.ts').evaluate((li) => (li.firstElementChild!.textContent = 'toggle.ts'));
    await expect(row(page, 'files', 'button.ts')).toHaveText('toggle.ts');
    // A name without an extension (a dot first is no extension): the whole label is selected.
    await edit('.env');
    await expect.poll(async () => (await typed(page, 'files')).selected).toBe('.env');
    // Escape gives nothing; focus back on the row.
    await page.keyboard.type('other');
    await page.keyboard.press('Escape');
    expect(await edits(page)).toEqual([]);
    expect(await focused(page)).toBe('.env');
    // White space alone, and the same name, give nothing.
    await page.keyboard.press('F2');
    await expect.poll(async () => (await typed(page, 'files')).focused).toBe(true);
    await page.keyboard.type('   ');
    await page.keyboard.press('Enter');
    await page.keyboard.press('F2');
    await expect.poll(async () => (await typed(page, 'files')).focused).toBe(true);
    await page.keyboard.press('Enter');
    expect(await edits(page)).toEqual([]);
    // Leaving the field by a press elsewhere gives the name, and focus stays where it went.
    await edit('README');
    await expect.poll(async () => (await typed(page, 'files')).focused).toBe(true);
    await page.keyboard.type('NOTES');
    await page.mouse.click(2, 2);
    expect(await edits(page)).toEqual(['rename:README:NOTES:README']);
    await expect(input).toHaveCount(0);
    // A parent that closes around the field closes it, giving nothing.
    await edit('.env');
    await expect.poll(async () => (await typed(page, 'files')).focused).toBe(true);
    await item(page, 'files', 'src').evaluate((li) => li.removeAttribute('data-open'));
    await expect(input).toHaveCount(0);
    expect(await edits(page)).toEqual([]);
    // TRV-32: without the product's words the field still opens, and a debug build says it has no name.
    await host(page, 'nameless').evaluate((el: HTMLElement & { edit(li: Element): boolean }) => el.edit(el.querySelector('li[data-t="README"]')!));
    await expect(field(page, 'nameless')).toHaveCount(1);
    await expect.poll(() => missingWords(page)).toContain('editLabel');
  });

  test('TRV-48: create() adds a new row after the selected item at its level, with an empty focused field; a name emits one create and takes the row away, and an item the product adds takes the focus; Escape and an empty name leave nothing; with no selection and no focus the row is the last of the first level; a new item is asked for whatever editable says', async ({ page }) => {
    await mount(page, { fixtures: [some('single')[0], raw('plain', { label: 'Plain' }, SMALL)] });
    await nameItems(page);
    await watch(page);
    await watchEdits(page);
    const id = 'single';
    const ask = (which: string, options: object) => host(page, which).evaluate((el: HTMLElement & { create(o: object): boolean }, o) => el.create(o), options);
    // The product adds what it is told, in the place it is told.
    await host(page, id).evaluate((tree) =>
      tree.addEventListener('create', (event) => {
        const d = (event as CustomEvent<{ label: string; after: Element | null }>).detail;
        const li = document.createElement('li');
        li.setAttribute('data-value', d.label);
        li.setAttribute('data-t', d.label);
        li.innerHTML = `<span>${d.label}</span>`;
        d.after!.after(li);
      }),
    );
    expect(await ask(id, { icon: 'draft' })).toBe(true);
    const fresh = host(page, id).locator('li[data-tanrei-new]');
    await expect(fresh).toHaveCount(1);
    // After checkbox.ts (the selected item), at its level, with the glyph named.
    expect(await fresh.evaluate((li) => li.previousElementSibling?.getAttribute('data-t'))).toBe('checkbox.ts');
    near((await edges(fresh.locator('> span'))).left, (await edges(row(page, id, 'checkbox.ts'))).left);
    expect(await fresh.locator('.tanrei-icon').textContent()).toBe('draft');
    await expect.poll(async () => (await typed(page, id)).focused).toBe(true);
    expect((await typed(page, id)).value).toBe('');
    // Not an item: the tree's rows are what they were.
    await expect(fresh.locator('> span')).toHaveAttribute('role', 'treeitem');
    await page.keyboard.type('switch.ts');
    await page.keyboard.press('Enter');
    expect(await edits(page)).toEqual(['create:switch.ts:false:components:checkbox.ts']);
    await expect(fresh).toHaveCount(0);
    expect(await focused(page)).toBe('switch.ts');
    expect(await events(page)).toEqual([]);
    // A parent: a closed chevron in its row. Escape leaves nothing and focus goes back.
    expect(await ask(id, { parent: true })).toBe(true);
    expect((await drawn(fresh.locator('> span'))).chevron.content).toContain('chevron_right');
    await expect.poll(async () => (await typed(page, id)).focused).toBe(true);
    await page.keyboard.type('folder');
    await page.keyboard.press('Escape');
    await expect(fresh).toHaveCount(0);
    expect(await edits(page)).toEqual([]);
    expect(await focused(page)).toBe('switch.ts');
    // An empty name leaves nothing.
    await ask(id, {});
    await expect.poll(async () => (await typed(page, id)).focused).toBe(true);
    await page.keyboard.press('Enter');
    await expect(fresh).toHaveCount(0);
    expect(await edits(page)).toEqual([]);
    // No selection and no focus: the last row of the first level. (The tree is not editable.)
    expect(await ask('plain', {})).toBe(true);
    expect(await host(page, 'plain').locator('li[data-tanrei-new]').evaluate((li) => [li.parentElement!.parentElement!.localName, li.previousElementSibling?.getAttribute('data-t')])).toEqual(['tanrei-tree-view', 'Epsilon']);
    await expect.poll(async () => (await typed(page, 'plain')).focused).toBe(true);
    await page.keyboard.type('Zeta');
    await page.keyboard.press('Enter');
    expect(await edits(page)).toEqual(['create:Zeta:false:null:Epsilon']);
    await expect(host(page, 'plain').locator('li[data-tanrei-new]')).toHaveCount(0);
  });
});

test.describe('before the element is defined, without script, in a shadow root', () => {
  test('TRV-1, TRV-9: the stylesheet alone draws the whole look — the indent, the chevrons and their turn, closed rows not shown, the guides, the room of a loading row — and nothing moves when the element is defined', async ({ page }) => {
    const fixtures = some('all-parts', 'compact-guides', 'disabled', 'loading', 'deep', 'rtl', 'long-labels', 'studio-tokens');
    const document = await fixturesDocument(spec, { icons: true, fixtures });
    const bundle = document.slice(document.lastIndexOf('<script type="module">'), document.lastIndexOf('</script>') + '</script>'.length);
    await page.setContent(document.replace(bundle, ''));
    await page.evaluate(async () => {
      await document.fonts.ready;
      const family = getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim();
      await document.fonts.load(`24px ${family}`, 'chevron_right');
    });
    await nameItems(page);
    expect(await page.evaluate(() => !!customElements.get('tanrei-tree-view'))).toBe(false);
    const geometry = () =>
      page.evaluate(() =>
        // (What is drawn: a closed list's rows are not, and a list's own box is not a row's.)
        [...document.querySelectorAll('tanrei-tree-view, tanrei-tree-view li[data-t], tanrei-tree-view li[data-t] > :first-child, tanrei-tree-view li[data-t] > :first-child > *')].filter((el) => el.checkVisibility()).map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          const before = getComputedStyle(el, '::before');
          return [el.localName, r.left, r.top, r.width, r.height, s.color, s.font, before.content, before.rotate, getComputedStyle(el, '::after').left].join('|');
        }),
      );
    // The look, with no script at all.
    expect((await edges(row(page, 'all-parts', 'package.json'))).height).toBe(48);
    const src = await drawn(row(page, 'all-parts', 'src'));
    expect(src.chevron.content).toContain('chevron_right');
    expect(src.chevron.rotate).toBe('90deg');
    expect((await drawn(row(page, 'all-parts', 'components'))).chevron.rotate).toBe('none');
    near((await drawn(row(page, 'all-parts', 'index.ts'))).container.left, src.container.left + (await resolveToken(page, T('level-indent-regular'))));
    expect(await row(page, 'all-parts', 'button.ts').evaluate((el) => el.checkVisibility())).toBe(false);
    expect(await css(row(page, 'disabled', 'typeface'), 'color')).toBe(await resolveColor(page, T('unselected-disabled-label-color')));
    expect(await item(page, 'compact-guides', 'src').locator('> ul').evaluate((list) => getComputedStyle(list, '::before').content)).not.toBe('none');
    // A selected row is the one thing drawn at upgrade: written by the server, it is drawn in the first frame.
    expect(await css(row(page, 'all-parts', 'index.ts'), 'background-color', '::after')).toMatch(CLEAR);
    await page.evaluate(() => {
      for (const tree of document.querySelectorAll('tanrei-tree-view')) {
        const values = [tree.getAttribute('value'), ...(JSON.parse(tree.getAttribute('values') ?? '[]') as string[])];
        for (const li of tree.querySelectorAll('li[data-value]')) if (values.includes(li.getAttribute('data-value'))) li.firstElementChild!.setAttribute('aria-selected', 'true');
      }
    });
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await css(row(page, 'all-parts', 'index.ts'), 'background-color', '::after')).toBe(await resolveColor(page, T('selected-container-color')));
    // Defined: nothing moves, nothing is redrawn.
    const before = await geometry();
    await page.addScriptTag({ content: bundle.slice('<script type="module">'.length, -'</script>'.length), type: 'module' });
    await page.waitForFunction(() => !!customElements.get('tanrei-tree-view'));
    await frame(page);
    expect(await geometry()).toEqual(before);
    expect(await moving(page)).toBe(0);
    await expect(item(page, 'loading', 'packages').locator('li[data-tanrei-loading]')).toHaveCount(1);
    await expect(host(page, 'all-parts')).toHaveAttribute('role', 'tree');
  });

  test('TRV-9: where script does not run every level is shown and no chevron is drawn — a nested list in the tree’s type and spacing', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const document = await fixturesDocument(spec, { icons: true, fixtures: some('all-closed') });
    await page.setContent(document);
    const seen = await page.evaluate(() => {
      const tree = document.querySelector('tanrei-tree-view')!;
      const rows = [...tree.querySelectorAll('li > :first-child')];
      return {
        scripting: matchMedia('(scripting: none)').matches,
        shown: rows.filter((r) => r.getBoundingClientRect().height > 0).length,
        all: rows.length,
        chevrons: rows.filter((r) => getComputedStyle(r, '::before').content.includes('chevron_right')).length,
        indent: rows[1].getBoundingClientRect().height > 0 ? Number.parseFloat(getComputedStyle(rows[1], '::after').left) : -1,
        font: getComputedStyle(rows[0]).fontSize,
      };
    });
    await context.close();
    test.skip(!seen.scripting, 'this browser does not answer (scripting: none) with scripting off');
    expect(seen.shown).toBe(seen.all);
    expect(seen.chevrons).toBe(0);
    expect(seen.indent).toBeGreaterThan(0);
  });

  test('TRV-11, TRV-15: inside another component’s shadow root the element adds its stylesheet to that root and is drawn, chosen and moved there as in the document', async ({ page }) => {
    await mount(page, { fixtures: some('basic') });
    await page.evaluate((lists) => {
      const outer = document.createElement('div');
      outer.id = 'shadowed';
      outer.style.inlineSize = '320px';
      outer.attachShadow({ mode: 'open' }).innerHTML = `<tanrei-tree-view label="In a shadow root" selection="single" value="a1">${lists}</tanrei-tree-view>`;
      document.querySelector('main')!.append(outer);
    }, SMALL);
    const inner = page.locator('#shadowed tanrei-tree-view');
    await expect.poll(() => css(inner.locator('li').first().locator('> span'), 'display')).toBe('grid');
    const first = inner.locator('li').first().locator('> span');
    expect((await edges(first)).height).toBe(48);
    expect(await css(inner.locator('li[data-value="a1"] > span'), 'background-color', '::after')).toBe(await resolveColor(page, T('selected-container-color')));
    near(Number.parseFloat(await css(inner.locator('li[data-value="a1"] > span'), 'left', '::after')), await resolveToken(page, T('level-indent-regular')));
    // Read in the task of the click, after the element has answered it (as TRV-11's turn is): asked for afterwards, the
    // motion may be over before a slow runner's answer.
    await inner.locator('li[data-value="b"] > ul').evaluate((el) => {
      window.addEventListener('click', () => ((window as any).movedAtClick = el.getAnimations().length), { once: true });
    });
    await inner.locator('li[data-value="b"] > span').click({ position: { x: 4, y: 10 } });
    expect(await page.evaluate(() => (window as any).movedAtClick as number)).toBe(1);
  });
});

test.describe('baselines', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
