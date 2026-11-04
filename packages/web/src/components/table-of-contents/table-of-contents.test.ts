// <tanrei-table-of-contents> and table-of-contents.css, driven by specs/table-of-contents.spec.json: every behaviour id
// (TOC-1…40) is cited by a test title, every fixture has a baseline, and every length and color is read back from the
// tokens — never from a number written here (the heights and insets of TOC-3's and TOC-24's verify are the spec's own
// numbers for the default system). The rule (TOC-9 to TOC-17) cannot be shown by a fixture: its tests build the pages
// its `verify` texts describe (`reading()`).
// TOC-41: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { expectPressHeldAtEveryMoment } from '../../../test/held-press.js';
import { expectPressShownAndHeld, watchPress, watchedPress } from '../../../test/watched-press.js';
import { expectWheelKeptFromPage } from '../../../test/contained-wheel.js';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, fixturesDocument, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('table-of-contents');
type P = Page;
const TAG = 'tanrei-table-of-contents';
const T = (name: string) => `--tanrei-comp-table-of-contents-${name}`;
const ROW = `${TAG} li > a`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** The anchor of the item with this href, in a fixture's own list. */
const row = (page: P, id: string, href: string) => host(page, id).locator(`a[href="${href}"]`).first();
const rows = (page: P, id: string) => host(page, id).locator('li > a');
const list = (page: P, id: string) => host(page, id).locator('> ul');
const nav = (page: P, id: string) => host(page, id).locator('nav');
const title = (page: P, id: string) => host(page, id).locator('.title');
const button = (page: P, id: string) => host(page, id).locator('button.row');
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** Where an element's own text is drawn, and on how many lines. */
const textBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const r = range.getBoundingClientRect();
    const tops: number[] = [];
    for (const rect of rects) if (!tops.some((top) => Math.abs(top - rect.top) < rect.height / 2)) tops.push(rect.top);
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, lines: tops.length };
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
const updated = (locator: Locator) => locator.evaluate((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete);
const prop = <V>(locator: Locator, name: string) => locator.evaluate((el, n) => (el as unknown as Record<string, V>)[n]!, name);
const set = async (locator: Locator, values: Record<string, unknown>) => {
  await locator.evaluate((el, v) => Object.assign(el, v), values);
  await updated(locator);
};
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
/** A fixture whose list is written by the test. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
/** No fill: a transparent color, however the browser writes one. */
const CLEAR = /^(rgba\(0, 0, 0, 0\)|transparent|.*\/ 0\))$/;
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const THREE = '<ul><li><a href="#one">One</a></li><li><a href="#two">Two</a><ul><li><a href="#two-a">Two A</a></li></ul></li><li><a href="#three">Three</a></li></ul>';
const LABEL = { label: 'On this page' };
/** The events of every table of contents on the page, in order: `<type>:<detail>`. */
const watchEvents = (page: P) =>
  page.evaluate((tag) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    for (const el of document.querySelectorAll(tag)) {
      for (const type of ['currentchange', 'select', 'toggle']) {
        el.addEventListener(type, (event) => {
          const detail = (event as CustomEvent<{ href?: string; open?: boolean }>).detail;
          w.__events.push(`${type}:${detail.href ?? detail.open}`);
        });
      }
    }
  }, TAG);
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** The system color a keyword names, as the browser draws it. */
const systemColor = (page: P, keyword: string) =>
  page.evaluate((k) => {
    const probe = document.createElement('div');
    probe.style.cssText = `color: ${k}; forced-color-adjust: none`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, keyword);

// ── A page that is read (TOC-9 to TOC-17): a bar fixed at the top, headings a known distance apart, and the table of
// contents kept beside them. The page says where a target rests in CSS alone — `scroll-padding-top` for the bar, and
// each heading's own `scroll-margin-top` — and the element is never told.
interface Reading {
  /** How many sections; or each section's height. */
  sections?: number | number[];
  bar?: number;
  margin?: number;
  props?: Fixture['props'];
  /** An item for the top of the page, before the others (TOC-10). */
  top?: boolean;
  smooth?: boolean;
  /** A folded block before the first section (TOC-16). */
  fold?: boolean;
  /** The list, where it is not one item per section. */
  list?: string;
  /** More rules for the page. */
  styles?: string;
}
const GAP = 600;
const BAR = 64;
const sectionList = (count: number, top = false) =>
  `<ul>${top ? '<li><a href="#top">Overview</a></li>' : ''}${Array.from({ length: count }, (_, i) => `<li><a href="#s${i + 1}">Section ${i + 1}</a></li>`).join('')}</ul>`;
async function reading(page: P, options: Reading = {}) {
  const heights = typeof options.sections === 'object' ? options.sections : Array.from({ length: options.sections ?? 8 }, () => GAP);
  const bar = options.bar ?? BAR;
  const document = await fixturesDocument(spec, { fixtures: [raw('reading', { ...LABEL, ...options.props }, options.list ?? sectionList(heights.length, options.top))] });
  // Every change of `aria-current` on the page, from before the element is defined (TOC-13).
  const marks = `<script>window.__marks = []; new MutationObserver((records) => { for (const record of records) if (record.target.getAttribute('aria-current')) window.__marks.push(record.target.getAttribute('href')); }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });</script>`;
  const styles = `<style>
    html { scroll-padding-top: ${bar}px; ${options.smooth ? 'scroll-behavior: smooth;' : ''} }
    main { display: block !important; }
    .stage { position: fixed; inset: ${bar}px 0 auto auto; z-index: 1; }
    #bar { position: fixed; inset: 0 0 auto 0; z-index: 2; block-size: ${bar}px; }
    article { margin-inline-end: 300px; }
    article h2 { margin: 0; block-size: 32px; scroll-margin-top: ${options.margin ?? 0}px; }
    ${options.styles ?? ''}
  </style>`;
  const article = `<div id="bar"></div><article><div style="block-size: 300px"></div>${options.fold ? '<details id="fold"><summary>More</summary><div style="block-size: 200px"></div></details>' : ''}${heights
    .map((height, i) => `<section style="block-size: ${height}px"><h2 id="s${i + 1}">Section ${i + 1}</h2><button type="button" id="b${i + 1}">In section ${i + 1}</button></section>`)
    .join('')}</article>`;
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.setContent(document.replace('<body><main>', `<body>${marks}${styles}${article}<main>`));
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await frame(page);
  await watchEvents(page);
}
const toc = (page: P) => host(page, 'reading');
const current = (page: P) => prop<string>(toc(page), 'current');
/** Where the page is scrolled to when this heading rests at the line. */
const rest = (page: P, id: string) =>
  page.evaluate((target) => {
    const el = document.getElementById(target)!;
    return el.getBoundingClientRect().top + window.scrollY - Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) - Number.parseFloat(getComputedStyle(el).scrollMarginTop);
  }, id);
/** The page scrolled by script — as the person's own scrolling moves it, with no motion — and the frame after it. */
const scrollPage = async (page: P, top: number) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await frame(page);
};
/** A notch of the wheel over the text. */
const wheel = async (page: P, by: number) => {
  await page.mouse.move(300, 400);
  await page.mouse.wheel(0, by);
  await frame(page);
};

test.describe('the list', () => {
  test('TOC-1: the title and, container.gap below it, the items in one column in the order given, each item’s own items directly after it; as wide as a 240 and a 400 column; no fill, edge, padding, place or width of its own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('nested'), { ...fixture('nested'), id: 'wide' }] });
    await page.addStyleTag({ content: '[data-fixture="wide"] { inline-size: 432px !important; }' });
    for (const [id, width] of [
      ['nested', 240],
      ['wide', 400],
    ] as const) {
      const box = await edges(host(page, id));
      near(box.width, width);
      near((await edges(list(page, id))).width, width);
      for (const anchor of await rows(page, id).all()) near((await edges(anchor)).width, width);
    }
    expect(await rows(page, 'nested').allTextContents()).toEqual(['When to use', 'Anatomy', 'Container', 'Label', 'Behaviour', 'States', 'Keyboard', 'Accessibility']);
    // One column: every row starts where the one before it ends.
    let bottom = (await edges(list(page, 'nested'))).top;
    for (const anchor of await rows(page, 'nested').all()) {
      const box = await edges(anchor);
      near(box.top, bottom);
      bottom = box.bottom;
    }
    near((await edges(list(page, 'nested'))).top - (await edges(title(page, 'nested'))).bottom, await resolveToken(page, T('container-gap')));
    near((await edges(title(page, 'nested'))).top, (await edges(host(page, 'nested'))).top);
    near(bottom, (await edges(host(page, 'nested'))).bottom);
    const drawn = await host(page, 'nested').evaluate((el) => {
      const s = getComputedStyle(el);
      return { margin: s.margin, padding: s.padding, border: s.borderTopWidth, max: s.maxWidth, position: s.position, overflow: s.overflowY, fill: s.backgroundColor };
    });
    expect(drawn).toEqual({ margin: '0px', padding: '0px', border: '0px', max: 'none', position: 'static', overflow: 'visible', fill: expect.stringMatching(CLEAR) });
    expect(await css(nav(page, 'nested'), 'background-color')).toMatch(CLEAR);
    // It has no prop for a position or a breakpoint: the window's width changes nothing about its presentation.
    await page.setViewportSize({ width: 320, height: 800 });
    await frame(page);
    expect(await prop(host(page, 'nested'), 'presentation')).toBe('list');
    await expect(button(page, 'nested')).toHaveCount(0);
  });

  test('TOC-2: the title is drawn above the list in title.typescale and title.color — the label’s text, or the product’s heading in the title slot, in the same style whatever its level and keeping its role and level; labelHidden draws none and still names the landmark', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('flat', 'label-hidden'), raw('slotted', LABEL, `<h3 slot="title">Contents</h3>${THREE}`)] });
    const style = {
      size: await resolveToken(page, T('title-typescale-font-size')),
      weight: await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('title-typescale-font-weight')),
      color: await resolveColor(page, T('title-color')),
    };
    expect(await title(page, 'flat').textContent()).toContain('On this page');
    near(await px(title(page, 'flat'), 'font-size'), style.size, 0.01);
    expect(await css(title(page, 'flat'), 'color')).toBe(style.color);
    const heading = host(page, 'slotted').locator('h3');
    near(await px(heading, 'font-size'), style.size, 0.01);
    expect(await css(heading, 'font-weight')).toBe(await css(title(page, 'flat'), 'font-weight'));
    expect(await css(heading, 'color')).toBe(style.color);
    expect(await css(heading, 'margin-top')).toBe('0px');
    near((await edges(heading)).height, (await edges(title(page, 'flat'))).height);
    await expect(host(page, 'slotted').getByRole('heading', { level: 3, name: 'Contents' })).toHaveCount(1);
    await expect(nav(page, 'slotted')).toHaveAttribute('aria-label', 'On this page');
    void style.weight;
    // labelHidden: no title, the list at the top, the landmark still named.
    await expect(title(page, 'label-hidden')).toHaveCount(0);
    near((await edges(list(page, 'label-hidden'))).top, (await edges(host(page, 'label-hidden'))).top);
    await expect(nav(page, 'label-hidden')).toHaveAttribute('aria-label', 'On this page');
  });

  test('TOC-3: a row runs from the rail to the list’s end edge at every level — 44 high with the labels of three levels 12, 24 and 36 from the rail at regular, 32 high with the labels at the same places at compact — in label.typescale with corners row.shape and no space between rows; density changes the height and nothing else', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('three-levels', 'density-compact-three-levels') });
    const levels = ['#tokens', '#color', '#roles'];
    const starts: number[][] = [];
    for (const [id, height] of [
      ['three-levels', 44],
      ['density-compact-three-levels', 32],
    ] as const) {
      const rail = (await edges(list(page, id))).left;
      const end = (await edges(list(page, id))).right;
      const here: number[] = [];
      for (const href of levels) {
        const box = await edges(row(page, id, href));
        expect(box.height).toBe(height);
        // The container starts at the rail and ends at the list's end edge, whatever the level.
        near(box.left, rail);
        near(box.right, end);
        here.push((await textBox(row(page, id, href))).left - rail);
      }
      starts.push(here);
      expect(here.map((x) => Math.round(x))).toEqual([12, 24, 36]);
      for (const anchor of await rows(page, id).all()) expect((await edges(anchor)).height).toBe(height);
      near(await px(row(page, id, '#tokens'), 'border-top-left-radius'), await resolveToken(page, T('row-shape')), 0.1);
      near(await px(row(page, id, '#tokens'), 'padding-right'), await resolveToken(page, T('row-padding-inline')), 0.01);
      near(await px(row(page, id, '#tokens'), 'font-size'), await resolveToken(page, T('label-typescale-font-size')), 0.01);
    }
    expect(starts[0]).toEqual(starts[1]);
    expect(await resolveToken(page, T('row-indent'))).toBe(12);
    near(await px(row(page, 'three-levels', '#tokens'), 'padding-top'), await resolveToken(page, T('row-padding-block-regular')), 0.01);
    near(await px(row(page, 'density-compact-three-levels', '#tokens'), 'padding-top'), await resolveToken(page, T('row-padding-block-compact')), 0.01);
    expect(await css(row(page, 'three-levels', '#roles'), 'font')).toBe(await css(row(page, 'density-compact-three-levels', '#roles'), 'font'));
    // A hovered row's state layer starts at the rail: the fill is the anchor's own box.
    await page.addStyleTag({ content: `${ROW} { transition: none !important; }` });
    await row(page, 'three-levels', '#roles').hover();
    expect(await css(row(page, 'three-levels', '#roles'), 'background-color')).toBe(await resolveColor(page, T('item-hovered-container-color')));
    // No place between two rows takes no press.
    const [first, second] = [await edges(row(page, 'three-levels', '#tokens')), await edges(row(page, 'three-levels', '#color'))];
    near(first.bottom, second.top, 0.01);
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.getAttribute('href'), [first.left + 2, first.bottom - 1])).toBe('#tokens');
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.getAttribute('href'), [first.left + 2, first.bottom + 1])).toBe('#color');
  });

  test('TOC-4: a label wider than its row wraps onto lines that start where its first does, breaks inside a run with no place to break, is never cut and never scrolls sideways, and the row grows by its lines', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('long-labels', 'japanese') });
    const edge = (await edges(stage(page, 'long-labels'))).right - 16;
    for (const anchor of await rows(page, 'long-labels').all()) {
      const [box, text] = [await edges(anchor), await textBox(anchor)];
      expect(text.right).toBeLessThanOrEqual(edge + 0.6);
      expect(text.left).toBeGreaterThanOrEqual(box.left);
      expect(text.bottom).toBeLessThanOrEqual(box.bottom + 0.6);
      expect(await anchor.evaluate((el) => [el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el).textOverflow, getComputedStyle(el).overflowX, getComputedStyle(el).whiteSpace])).toEqual([true, 'clip', 'visible', 'normal']);
    }
    expect(await host(page, 'long-labels').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const why = row(page, 'long-labels', '#why');
    expect((await textBox(why)).lines).toBeGreaterThanOrEqual(3);
    near((await edges(row(page, 'long-labels', '#derived'))).top, (await edges(why)).bottom);
    expect((await edges(why)).height).toBeGreaterThan(44);
    // An identifier with no place to break is broken inside the run, and stays inside the row.
    const identifier = row(page, 'long-labels', '#identifier');
    expect((await textBox(identifier)).lines).toBeGreaterThan(1);
    expect((await textBox(identifier)).right).toBeLessThanOrEqual(edge + 0.6);
    // Japanese wraps without spaces.
    expect((await textBox(row(page, 'japanese', '#states'))).lines).toBeGreaterThan(1);
  });

  test('TOC-5: the rail is one line along the list’s start edge, from the top of the first row to the bottom of the last, rail.width wide in rail.color, once for the whole list and hidden from assistive technology', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('nested', 'rtl') });
    const top = list(page, 'nested');
    expect(await css(top, 'content', '::before')).not.toBe('none');
    near(await px(top, 'border-left-width', '::before'), await resolveToken(page, T('rail-width')), 0.01);
    expect(await css(top, 'border-left-color', '::before')).toBe(await resolveColor(page, T('rail-color')));
    expect(await css(top, 'left', '::before')).toBe('0px');
    near(await px(top, 'height', '::before'), (await edges(top)).height);
    near((await edges(top)).top, (await edges(rows(page, 'nested').first())).top);
    near((await edges(top)).bottom, (await edges(rows(page, 'nested').last())).bottom);
    // Once: a nested list draws none. It takes no room: the first row starts at the list's edge.
    expect(await css(host(page, 'nested').locator('ul ul').first(), 'content', '::before')).toBe('none');
    near((await edges(rows(page, 'nested').first())).left, (await edges(top)).left);
    // A pseudo-element of a list: nothing of it reaches assistive technology.
    expect(await top.evaluate((el) => el.children.length)).toBe(4);
    // At the right edge in a right-to-left layout.
    near(await px(list(page, 'rtl'), 'border-right-width', '::before'), await resolveToken(page, T('rail-width')), 0.01);
    expect(await css(list(page, 'rtl'), 'right', '::before')).toBe('0px');
  });

  test('TOC-6: each item is the product’s own anchor in the document — not copied into the shadow root — with the link role, followed by a click and by Enter; its label has no underline and no visited look', async ({ page }) => {
    await reading(page, { sections: 4 });
    expect(await toc(page).evaluate((el) => [el.querySelectorAll('li > a[href]').length, el.shadowRoot!.querySelectorAll('a').length])).toEqual([4, 0]);
    await expect(toc(page).getByRole('link')).toHaveCount(4);
    for (const anchor of await toc(page).locator('li > a').all()) expect(await css(anchor, 'text-decoration-line')).toBe('none');
    await toc(page).locator('a[href="#s2"]').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#s2');
    await expect.poll(async () => Math.round(await page.evaluate(() => document.getElementById('s2')!.getBoundingClientRect().top))).toBe(BAR);
    await toc(page).locator('a[href="#s3"]').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#s3');
    // A link that was followed is drawn as any other item: the item part's color, whatever the browser's visited rule.
    await page.mouse.move(300, 400);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await expect.poll(() => css(toc(page).locator('a[href="#s2"]'), 'color')).toBe(await resolveColor(page, T('item-label-color')));
  });
});

test.describe('the current item', () => {
  test('TOC-7: the current row is drawn from the current part’s tokens with the label at the emphasized weight and the marker on the rail beside it, as high as the row, marker.width wide in marker.color, covering the rail; one item at most, its ancestors as any other item; in a 180 column no row breaks its height and the list keeps its height whichever item is current; the two rows change over motion.state-duration, at once where motion is reduced, and the marker does not travel', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('current-top-level', 'current-nested', 'current-third-level', 'long-labels') });
    const [regular, emphasized] = await page.evaluate(
      (names) =>
        names.map((n) => {
          const probe = document.createElement('div');
          probe.style.fontWeight = `var(${n})`;
          document.body.append(probe);
          const weight = getComputedStyle(probe).fontWeight;
          probe.remove();
          return weight;
        }),
      [T('label-typescale-font-weight'), T('label-typescale-font-weight-emphasized')],
    );
    expect(emphasized).not.toBe(regular);
    for (const [id, href, ancestors] of [
      ['current-top-level', '#anatomy', []],
      ['current-nested', '#label', ['#anatomy']],
      ['current-third-level', '#schemes', ['#color', '#tokens']],
    ] as const) {
      const anchor = row(page, id, href);
      expect(await css(anchor, 'font-weight')).toBe(emphasized);
      expect(await css(anchor, 'color')).toBe(await resolveColor(page, T('current-label-color')));
      expect(await css(anchor, 'background-color')).toMatch(CLEAR);
      // The marker: on the rail (the list's start edge), as high as the row, over the rail.
      near(await px(anchor, 'border-left-width', '::before'), await resolveToken(page, T('marker-width')), 0.01);
      expect(await css(anchor, 'border-left-color', '::before')).toBe(await resolveColor(page, T('marker-color')));
      expect(await css(anchor, 'opacity', '::before')).toBe('1');
      expect(await css(anchor, 'left', '::before')).toBe('0px');
      near(await px(anchor, 'height', '::before'), (await edges(anchor)).height);
      near((await edges(anchor)).left, (await edges(list(page, id))).left);
      expect(await resolveToken(page, T('marker-width'))).toBeGreaterThan(await resolveToken(page, T('rail-width')));
      // One item at most; an item that holds the current one is drawn as any other.
      await expect(host(page, id).locator('a[aria-current]')).toHaveCount(1);
      for (const outer of ancestors) {
        expect(await css(row(page, id, outer), 'font-weight')).toBe(regular);
        expect(await css(row(page, id, outer), 'color')).toBe(await resolveColor(page, T('item-label-color')));
        expect(await css(row(page, id, outer), 'opacity', '::before')).toBe('0');
      }
    }
    // The list does not move: in a 180 column, whichever item is current.
    await page.addStyleTag({ content: '[data-fixture="long-labels"] { inline-size: 212px !important; }' });
    const long = host(page, 'long-labels');
    const measure = async () => ({ height: (await edges(long)).height, rows: await Promise.all((await rows(page, 'long-labels').all()).map(async (anchor) => (await edges(anchor)).height)) });
    await set(long, { current: '' });
    const before = await measure();
    for (const item of ['#why', '#derived', '#generated', '#identifier', '#short']) {
      await set(long, { current: item });
      expect(await css(row(page, 'long-labels', item), 'font-weight')).toBe(emphasized);
      expect(await measure(), item).toEqual(before);
    }
    // Over motion.state-duration, and at once where motion is reduced; the marker appears where it is, and is not moved.
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const anchor = row(page, 'current-nested', '#label');
    // (The first two are the hold of a press that no script answers: two names that step, table-of-contents.css.)
    expect((await css(anchor, 'transition-property')).split(', ').slice(2)).toEqual(['background-color', 'color', 'opacity']);
    expect((await css(anchor, 'transition-duration')).split(', ').slice(2)).toEqual([duration, duration, duration]);
    expect(await css(anchor, 'transition-property', '::before')).toBe('opacity');
    expect(await css(anchor, 'transition-duration', '::before')).toBe(duration);
    expect(await css(anchor, 'transform', '::before')).toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(anchor, 'transition-duration', '::before')).toBe('0s');
    expect((await css(anchor, 'transition-property')).split(', ')).toEqual(['--_toc-held-image', '--_toc-held-clip']);
  });

  test('TOC-8: the current item carries aria-current="location" and no other item carries the state; a change of it announces nothing — no live region, no status, no alert', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('current-nested') });
    const h = host(page, 'current-nested');
    expect(await h.evaluate((el) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('aria-current')))).toEqual([null, null, null, 'location', null]);
    await set(h, { current: '#anatomy' });
    expect(await h.evaluate((el) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('aria-current')))).toEqual([null, 'location', null, null, null]);
    await set(h, { current: '' });
    await expect(h.locator('[aria-current]')).toHaveCount(0);
    expect(await h.evaluate((el) => [...el.querySelectorAll('*'), ...el.shadowRoot!.querySelectorAll('*')].filter((n) => n.matches('[aria-live], [role="status"], [role="alert"], [role="log"], output')).length)).toBe(0);
  });
});

test.describe('which item is current', () => {
  test('TOC-9: with headings 600 apart under a 64 high bar the current item is the last whose target has reached the line — one unit short of it leaves the item before current, the next unit makes it current, two back the one before again — none while no target has reached it, never an item whose target is merely in view, each change told once by currentchange; a heading’s own scroll margin moves its line', async ({ page }) => {
    await reading(page);
    // The first two headings are in view at the top of the page, and neither has reached the line.
    expect(await page.evaluate(() => document.getElementById('s1')!.getBoundingClientRect().top < innerHeight)).toBe(true);
    expect(await current(page)).toBe('');
    await expect(toc(page).locator('[aria-current]')).toHaveCount(0);
    const second = await rest(page, 's2');
    await scrollPage(page, second - GAP);
    expect(await current(page)).toBe('#s1');
    await scrollPage(page, second - 1);
    expect(await page.evaluate(() => document.getElementById('s2')!.getBoundingClientRect().top)).toBe(BAR + 1);
    expect(await current(page)).toBe('#s1');
    await scrollPage(page, second);
    expect(await current(page)).toBe('#s2');
    await expect(toc(page).locator('a[href="#s2"]')).toHaveAttribute('aria-current', 'location');
    await scrollPage(page, second - 2);
    expect(await current(page)).toBe('#s1');
    await scrollPage(page, 0);
    expect(await current(page)).toBe('');
    expect(await events(page)).toEqual(['currentchange:#s1', 'currentchange:#s2', 'currentchange:#s1', 'currentchange:']);
    // The space a heading keeps before itself is part of where it rests.
    await reading(page, { margin: 24 });
    const withMargin = await rest(page, 's2');
    await scrollPage(page, withMargin - 1);
    expect(await page.evaluate(() => document.getElementById('s2')!.getBoundingClientRect().top)).toBe(BAR + 24 + 1);
    expect(await current(page)).toBe('#s1');
    await scrollPage(page, withMargin);
    expect(await current(page)).toBe('#s2');
  });

  test('TOC-9: the view is the nearest scrolling ancestor of the targets — a region of the page that scrolls its own sections — and its own scroll padding is its line', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [raw('reading', LABEL, sectionList(4))] });
    await page.evaluate(() => {
      const view = document.createElement('div');
      view.id = 'view';
      view.style.cssText = 'block-size: 400px; inline-size: 400px; overflow-y: auto; scroll-padding-top: 20px; border: 5px solid transparent';
      view.innerHTML = `<div style="block-size: 150px"></div>${[1, 2, 3, 4].map((n) => `<section style="block-size: 500px"><h2 id="s${n}" style="margin: 0">Section ${n}</h2></section>`).join('')}`;
      document.querySelector('main')!.prepend(view);
    });
    await frame(page);
    expect(await current(page)).toBe('');
    const to = (id: string, short: number) =>
      page.evaluate(
        ([target, by]) => {
          const view = document.getElementById('view')!;
          view.scrollTop += document.getElementById(target!)!.getBoundingClientRect().top - (view.getBoundingClientRect().top + view.clientTop + 20) - by!;
        },
        [id, short] as const,
      );
    await to('s2', 1);
    await frame(page);
    expect(await current(page)).toBe('#s1');
    await to('s2', 0);
    await frame(page);
    expect(await current(page)).toBe('#s2');
    // The page's own scrolling is not what moves these targets.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('TOC-10: an item whose destination is the top of the page has always reached the line — current from the start of the page until the first heading reaches it; the fixture top-item draws it', async ({ page }) => {
    await reading(page, { top: true });
    expect(await current(page)).toBe('#top');
    await expect(toc(page).locator('a[href="#top"]')).toHaveAttribute('aria-current', 'location');
    const first = await rest(page, 's1');
    await scrollPage(page, first - 1);
    expect(await current(page)).toBe('#top');
    await scrollPage(page, first);
    expect(await current(page)).toBe('#s1');
    await scrollPage(page, 0);
    expect(await current(page)).toBe('#top');
    await mountFixtures(page, spec, { fixtures: some('top-item') });
    await expect(row(page, 'top-item', '#top')).toHaveAttribute('aria-current', 'location');
    await expect(row(page, 'top-item', '#top')).toHaveText('Overview');
  });

  test('TOC-11: at the end of a view that has room to scroll the last item is current although its 200 high section cannot reach the line; leaving the end the rule applies again; a page shorter than the view shows no current item, or the item for the top where it has one', async ({ page }) => {
    await reading(page, { sections: [600, 600, 600, 200] });
    const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await scrollPage(page, end);
    expect(await page.evaluate(() => document.getElementById('s4')!.getBoundingClientRect().top)).toBeGreaterThan(BAR + 1);
    expect(await current(page)).toBe('#s4');
    await scrollPage(page, end - 10);
    expect(await current(page)).toBe('#s3');
    await scrollPage(page, end);
    expect(await current(page)).toBe('#s4');
    // No room to scroll: TOC-9 and TOC-10 alone.
    await reading(page, { sections: [100, 100] });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    expect(await current(page)).toBe('');
    await reading(page, { sections: [100, 100], top: true });
    expect(await current(page)).toBe('#top');
  });

  test('TOC-12: with smooth scrolling on, choosing the eighth item emits select once with its href, makes it current at once with one currentchange, lets the browser move the view and the address without the element scrolling anything or waiting for press-hold, and marks none of the items the view passes; cancelling select keeps the browser from following; a click with a modifier is the browser’s alone', async ({ page }) => {
    await reading(page, { smooth: true, sections: 12 });
    await scrollPage(page, await rest(page, 's1'));
    expect(await current(page)).toBe('#s1');
    await events(page);
    await page.evaluate(() => {
      const w = window as unknown as { __scrolled: string[] };
      w.__scrolled = [];
      for (const name of ['scrollTo', 'scrollBy', 'scroll'] as const) {
        const own = window[name].bind(window) as (...args: unknown[]) => void;
        (window as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => (w.__scrolled.push(name), own(...args));
      }
      const into = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (...args) {
        w.__scrolled.push('scrollIntoView');
        return into.apply(this, args);
      };
    });
    await page.evaluate(() => ((window as unknown as { __marks: string[] }).__marks = []));
    await toc(page).locator('a[href="#s8"]').click();
    // At once: before the view has arrived.
    expect(await current(page)).toBe('#s8');
    expect(await page.evaluate(() => location.hash)).toBe('#s8');
    await expect.poll(async () => Math.round(await page.evaluate(() => document.getElementById('s8')!.getBoundingClientRect().top)), { timeout: 15_000 }).toBe(BAR);
    await page.waitForTimeout(300);
    await frame(page);
    expect(await events(page)).toEqual(['select:#s8', 'currentchange:#s8']);
    expect(await page.evaluate(() => (window as unknown as { __marks: string[] }).__marks)).toEqual(['#s8']);
    expect(await page.evaluate(() => (window as unknown as { __scrolled: string[] }).__scrolled)).toEqual([]);
    // Cancelled: the product moves the view itself — the browser follows nothing, and the item is still the current one.
    await toc(page).evaluate((el) => el.addEventListener('select', (event) => event.preventDefault(), { once: true }));
    await toc(page).locator('a[href="#s3"]').click();
    expect(await page.evaluate(() => location.hash)).toBe('#s8');
    expect(await current(page)).toBe('#s3');
    expect(await events(page)).toEqual(['select:#s3', 'currentchange:#s3']);
    // A click that opens the link elsewhere is not an activation here.
    await toc(page).locator('a[href="#s5"]').evaluate((el) => {
      el.addEventListener('click', (event) => event.preventDefault(), { once: true });
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ctrlKey: true }));
    });
    expect(await events(page)).toEqual([]);
    expect(await current(page)).toBe('#s3');
  });

  test('TOC-12: the item before the last, chosen on a page whose last two sections are shorter than the view, stays current after the view has stopped at the end — where the rule would give the last — and one notch of the wheel makes the rule apply again; a wheel over the list itself does not', async ({ page }) => {
    await reading(page, { sections: [600, 600, 600, 200, 200] });
    await toc(page).locator('a[href="#s4"]').click();
    expect(await current(page)).toBe('#s4');
    const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(end));
    // Still the chosen item, after the view has been still for a while.
    await page.waitForTimeout(400);
    await frame(page);
    expect(await current(page)).toBe('#s4');
    // A change of layout does not end the hold (TOC-16).
    await page.setViewportSize({ width: 1000, height: 790 });
    await frame(page);
    expect(await current(page)).toBe('#s4');
    // A wheel over the list moves the list's own region, not the view.
    const over = await edges(toc(page));
    await page.mouse.move(over.left + 20, over.top + 20);
    await page.mouse.wheel(0, 100);
    await frame(page);
    expect(await current(page)).toBe('#s4');
    await wheel(page, 100);
    await expect.poll(() => current(page)).toBe('#s5');
    expect(await events(page)).toEqual(['select:#s4', 'currentchange:#s4', 'currentchange:#s5']);
  });

  test('TOC-13: loaded at the fragment of its fifth heading the fifth item is current in the first drawing and no other row is marked before it; an address that comes to name a target while it is shown — a link elsewhere, a step back in the history — makes that item current and holds it as a chosen one', async ({ page, browserName }) => {
    await page.goto('about:blank#s5');
    await reading(page);
    expect(await page.evaluate(() => location.hash)).toBe('#s5');
    expect(await current(page)).toBe('#s5');
    expect(await page.evaluate(() => (window as unknown as { __marks: string[] }).__marks)).toEqual(['#s5']);
    // Held as a chosen item is: a change of layout keeps it, the person's own scrolling ends it.
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 1000, height: 780 });
    await frame(page);
    expect(await current(page)).toBe('#s5');
    await scrollPage(page, 0);
    expect(await current(page)).toBe('#s5');
    await wheel(page, 100);
    await expect.poll(() => current(page)).toBe('');
    // The address comes to name a target: a link elsewhere on the page.
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '#s3';
      link.id = 'elsewhere';
      link.textContent = 'Section 3';
      document.querySelector('article')!.prepend(link);
    });
    await events(page);
    await page.evaluate(() => document.getElementById('elsewhere')!.click());
    await expect.poll(() => current(page)).toBe('#s3');
    await page.evaluate(() => (location.hash = '#s7'));
    await expect.poll(() => current(page)).toBe('#s7');
    expect(await events(page)).toEqual(['currentchange:#s3', 'currentchange:#s7']);
    // A step back in the history. (WebKit keeps no history of the fragments of a page written into about:blank: there
    // is no step to take back in this harness.)
    if (browserName === 'webkit') return;
    await page.evaluate(() => history.back());
    await expect.poll(() => current(page)).toBe('#s3');
    expect(await events(page)).toEqual(['currentchange:#s3']);
  });

  test('TOC-14: the element adds no motion of the view and never writes the address or the history — scrolling through every section changes neither, and whether the view glides or jumps to a chosen item is the page’s own scroll behaviour', async ({ page }) => {
    await reading(page);
    const length = await page.evaluate(() => history.length);
    await page.evaluate(() => {
      const w = window as unknown as { __written: string[] };
      w.__written = [];
      for (const name of ['pushState', 'replaceState'] as const) {
        const own = history[name].bind(history);
        history[name] = (...args: Parameters<History['pushState']>) => (w.__written.push(name), own(...args));
      }
      const view = window.scrollTo.bind(window) as (...args: unknown[]) => void;
      (window as unknown as { scrollTo: unknown }).scrollTo = (...args: unknown[]) => (w.__written.push('scrollTo'), view(...args));
    });
    for (let n = 1; n <= 8; n++) {
      // (The page is moved here as a person's scrolling moves it; the element is not asked.)
      await page.evaluate((y) => document.documentElement.scrollTo({ top: y, behavior: 'instant' }), await rest(page, `s${n}`));
      await frame(page);
      expect(await current(page)).toBe(`#s${n}`);
    }
    expect(await page.evaluate(() => [location.hash, history.length, (window as unknown as { __written: string[] }).__written])).toEqual(['', length, []]);
    // A jump: the page has no smooth scrolling, and the element adds none.
    await toc(page).locator('a[href="#s2"]').click();
    expect(await page.evaluate(() => Math.round(document.getElementById('s2')!.getBoundingClientRect().top))).toBe(BAR);
    expect(await page.evaluate(() => (window as unknown as { __written: string[] }).__written)).toEqual([]);
    expect(await css(toc(page), 'scroll-behavior')).toBe('auto');
  });

  test('TOC-15: while tracking is manual the item whose href equals current is drawn and exposed as current, none while it is empty, the view is not observed and currentchange is never emitted, select is still emitted and the link followed; an anchor the product marked itself is left as it is; while tracking is auto a current the product sets is drawn until the rule next gives another', async ({ page }) => {
    await reading(page, { props: { tracking: 'manual', current: '#s6' } });
    await expect(toc(page).locator('a[href="#s6"]')).toHaveAttribute('aria-current', 'location');
    await scrollPage(page, await rest(page, 's3'));
    await page.waitForTimeout(100);
    expect(await current(page)).toBe('#s6');
    await toc(page).locator('a[href="#s2"]').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#s2');
    expect(await current(page)).toBe('#s6');
    expect(await events(page)).toEqual(['select:#s2']);
    await set(toc(page), { current: '' });
    await expect(toc(page).locator('[aria-current]')).toHaveCount(0);
    // The product writes the state itself: it is drawn, and not taken off.
    await toc(page).locator('a[href="#s4"]').evaluate((el) => el.setAttribute('aria-current', 'location'));
    await set(toc(page), { labelHidden: true });
    await expect(toc(page).locator('a[href="#s4"]')).toHaveAttribute('aria-current', 'location');
    await expect.poll(() => css(toc(page).locator('a[href="#s4"]'), 'opacity', '::before')).toBe('1');
    // auto: the product's value stands until the rule next gives another.
    await reading(page);
    await scrollPage(page, await rest(page, 's2'));
    expect(await current(page)).toBe('#s2');
    await events(page);
    await set(toc(page), { current: '#s7' });
    await frame(page);
    await expect(toc(page).locator('a[href="#s7"]')).toHaveAttribute('aria-current', 'location');
    expect(await events(page)).toEqual([]);
    await scrollPage(page, await rest(page, 's3'));
    expect(await current(page)).toBe('#s3');
    expect(await events(page)).toEqual(['currentchange:#s3']);
  });

  test('TOC-16: a folded block opened above the current heading moves it past the line and the item before it becomes current with no scroll event from the person; a text size, a window size and an item added or removed decide again; an item whose href leads to no place is still a link, is never current by the rule, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await reading(page, { fold: true, list: `${sectionList(4).slice(0, -5)}<li><a href="#nowhere">Nowhere</a></li></ul>` });
    await scrollPage(page, await rest(page, 's2'));
    expect(await current(page)).toBe('#s2');
    await page.evaluate(() => {
      const w = window as unknown as { __scrolls: number };
      w.__scrolls = 0;
      // (Scroll anchoring would move the view with the content, which is a scroll of the browser's own.)
      document.documentElement.style.overflowAnchor = 'none';
      document.addEventListener('scroll', () => w.__scrolls++);
    });
    await page.evaluate(() => ((document.getElementById('fold') as HTMLDetailsElement).open = true));
    await expect.poll(() => current(page)).toBe('#s1');
    expect(await page.evaluate(() => (window as unknown as { __scrolls: number }).__scrolls)).toBe(0);
    await page.evaluate(() => ((document.getElementById('fold') as HTMLDetailsElement).open = false));
    await expect.poll(() => current(page)).toBe('#s2');
    // An item removed, and added again.
    await toc(page).evaluate((el) => el.querySelector('a[href="#s2"]')!.parentElement!.remove());
    await expect.poll(() => current(page)).toBe('#s1');
    await toc(page).evaluate((el) => el.querySelector('a[href="#s1"]')!.parentElement!.insertAdjacentHTML('afterend', '<li><a href="#s2">Section 2</a></li>'));
    await expect.poll(() => current(page)).toBe('#s2');
    await expect(toc(page).locator('a[href="#s2"]')).toHaveAttribute('aria-current', 'location');
    // A target that is not drawn (a fold that is closed, a tab that is not shown) is at no place: it is passed over.
    const third = await rest(page, 's3');
    await page.evaluate(() => (document.getElementById('s3')!.style.display = 'none'));
    await scrollPage(page, third + 10);
    expect(await current(page)).toBe('#s2');
    await page.evaluate(() => (document.getElementById('s3')!.style.display = ''));
    await scrollPage(page, third + 11);
    expect(await current(page)).toBe('#s3');
    // The item that leads nowhere: a link all the same, never current — not even at the end of the page — and reported.
    await expect(toc(page).getByRole('link', { name: 'Nowhere' })).toHaveCount(1);
    await scrollPage(page, await page.evaluate(() => document.documentElement.scrollHeight));
    expect(await current(page)).toBe('#s4');
    expect(seen.filter((text) => text.includes('TOC-16') && text.includes('#nowhere'))).toHaveLength(1);
  });

  test('TOC-17: in a 300 high scrolling column holding forty items, scrolling the page to its last section scrolls the column, and no other, until the current row is whole in view — by the least distance, at once where motion is reduced — and leaves the page where it is; a row is not moved while the pointer is over the list or keyboard focus is inside it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await reading(page, { sections: Array.from({ length: 40 }, () => 300), styles: '.stage { box-sizing: border-box; block-size: 300px; overflow-y: auto; padding: 0 !important; }' });
    const column = stage(page, 'reading');
    const inView = (href: string) =>
      page.evaluate((h) => {
        const box = document.querySelector('.stage')!.getBoundingClientRect();
        const r = document.querySelector(`.stage a[href="${h}"]`)!.getBoundingClientRect();
        return r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
      }, href);
    expect(await inView('#s40')).toBe(false);
    const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await scrollPage(page, end);
    expect(await current(page)).toBe('#s40');
    await expect.poll(() => inView('#s40')).toBe(true);
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(end));
    // The least distance: the last row's bottom is at the column's bottom edge.
    near((await edges(toc(page).locator('a[href="#s40"]'))).bottom, (await edges(column)).bottom, 1);
    // Back to a row above what is shown: its top comes to the column's top edge.
    await scrollPage(page, await rest(page, 's20'));
    expect(await current(page)).toBe('#s20');
    await expect.poll(async () => Math.abs((await edges(toc(page).locator('a[href="#s20"]'))).top - (await edges(column)).top) < 1).toBe(true);
    // Not from under a hand.
    const at = await column.evaluate((el) => el.scrollTop);
    const over = await edges(column);
    await page.mouse.move(over.left + 40, over.top + 40);
    await scrollPage(page, await rest(page, 's2'));
    expect(await current(page)).toBe('#s2');
    await page.waitForTimeout(100);
    expect(await column.evaluate((el) => el.scrollTop)).toBe(at);
    await page.mouse.move(300, 400);
    await toc(page).locator('a[href="#s20"]').focus();
    await scrollPage(page, await rest(page, 's38'));
    expect(await current(page)).toBe('#s38');
    await page.waitForTimeout(100);
    expect(await inView('#s38')).toBe(false);
    // With motion, the column glides: it still arrives.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await scrollPage(page, await rest(page, 's39'));
    await expect.poll(() => inView('#s39')).toBe(true);
  });
});

test.describe('states', () => {
  test('TOC-18: under the acme system a hovered, a focused and a pressed row are drawn from their own tokens of their part — item, current and disclosure — pressed over focused over hovered, on the whole row; focus by a pointer is not the focused state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('current-nested', 'compact-closed'), system: 'acme', systemCss: await acmeSystemCss() });
    await page.addStyleTag({ content: `${ROW} { transition: none !important; }` });
    await host(page, 'compact-closed').evaluate((el) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.row { transition: none !important; }');
      el.shadowRoot!.adoptedStyleSheets = [...el.shadowRoot!.adoptedStyleSheets, sheet];
    });
    for (const [part, target] of [
      ['item', row(page, 'current-nested', '#container')],
      ['current', row(page, 'current-nested', '#label')],
      ['disclosure', button(page, 'compact-closed')],
    ] as const) {
      const fill = () => css(target, 'background-color');
      const colors = { hovered: await resolveColor(page, T(`${part}-hovered-container-color`)), focused: await resolveColor(page, T(`${part}-focused-container-color`)), pressed: await resolveColor(page, T(`${part}-pressed-container-color`)) };
      expect(new Set(Object.values(colors)).size, part).toBe(3);
      // Hover at the far end of the row answers on the whole container.
      const box = await edges(target);
      await page.mouse.move(box.right - 4, box.top + 4);
      expect(await fill(), `${part} hovered`).toBe(colors.hovered);
      expect(await css(target, 'color')).toBe(await resolveColor(page, T(`${part}-hovered-label-color`)));
      await tabTo(page, target);
      expect(await fill(), `${part} focused`).toBe(colors.focused);
      await page.mouse.down();
      expect(await fill(), `${part} pressed`).toBe(colors.pressed);
      // (Let go where it was pressed: a link that is held and moved is dragged, which is the browser's own gesture.)
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
      await page.evaluate(() => ((document.activeElement as HTMLElement | null)?.blur(), (document.activeElement?.shadowRoot?.activeElement as HTMLElement | null)?.blur()));
    }
    // Focus gained by the pointer is not the focused state.
    const other = row(page, 'current-nested', '#when-to-use');
    await other.click();
    await page.mouse.move(0, 0);
    await expect.poll(() => other.getAttribute('data-pressed')).toBeNull();
    expect(await css(other, 'background-color')).toMatch(CLEAR);
    expect(await css(other, 'outline-style')).toBe('none');
  });

  test('TOC-19: a row focused by the keyboard — an item, and the disclosure row — shows the focus ring inside its container, sys.focus.outer-width wide with the inner stroke within it, following row.shape, without animation; focus by a pointer shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'compact-closed') });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    for (const target of [row(page, 'nested', '#container'), button(page, 'compact-closed')]) {
      await tabTo(page, target);
      expect(await px(target, 'outline-width')).toBe(outer);
      expect(await css(target, 'outline-style')).toBe('solid');
      expect(await css(target, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      // Inside: the stroke's outer edge is the row's edge, so no neighbour and no scrolling region cuts it.
      expect(await px(target, 'outline-offset')).toBe(-outer);
      expect(await css(target, 'transition-property')).not.toContain('outline');
      expect(await css(target, 'content', '::after')).not.toBe('none');
      near(await px(target, 'border-top-width', '::after'), await resolveToken(page, '--tanrei-sys-focus-inner-width'), 0.01);
      expect(await css(target, 'border-top-color', '::after')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring-inner'));
      near(await px(target, 'top', '::after'), outer, 0.01);
      near(await px(target, 'border-top-left-radius'), await resolveToken(page, T('row-shape')), 0.1);
    }
    await row(page, 'nested', '#anatomy').evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await row(page, 'nested', '#anatomy').click();
    expect(await css(row(page, 'nested', '#anatomy'), 'outline-style')).toBe('none');
  });

  test('TOC-20: a press on an item by pointer or Enter, and on the disclosure row by pointer, Enter or Space, shows the pressed state without delay and keeps it for at least sys.motion.duration.press-hold, even when the press ends sooner; Space on an item shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('press', { ...LABEL, tracking: 'manual' }, THREE), fixture('compact-closed')] });
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    // Shown in the turn of the event that pressed, and there for press-hold from that event on (test/watched-press.ts).
    const item = row(page, 'press', '#two');
    for (const act of [() => item.click(), () => item.press('Enter')]) {
      await watchPress(item);
      await act();
      await expectPressShownAndHeld(page, hold);
    }
    // Space on an item does what it does on any link, and shows no pressed state.
    await watchPress(item);
    await item.press('Space');
    await page.waitForTimeout(hold + 60);
    expect(await watchedPress(page)).toEqual({});
    await expect(item).not.toHaveAttribute('data-pressed');
    // The element does not hold the navigation back: the address is the item's when the click is over.
    expect(await page.evaluate(() => location.hash)).toBe('#two');
    const disclosure = button(page, 'compact-closed');
    for (const act of [() => disclosure.click(), () => disclosure.press('Enter'), () => disclosure.press('Space')]) {
      await watchPress(disclosure);
      await act();
      await expectPressShownAndHeld(page, hold);
    }
  });

  test('TOC-21: a press is answered as sys.behavior.pressed-feedback names — overlay paints the pressed tokens on the whole row at once (the default), ripple grows the pressed layer from the point of contact and from the centre for a key (m3-like), dim applies the pressed opacity and no layer (cupertino), none draws nothing — on an item and on the disclosure row, and the ripple appears whole where motion is reduced', async ({ page }) => {
    const fixtures = [raw('press', { ...LABEL, tracking: 'manual' }, THREE), fixture('compact-closed')];
    const item = () => row(page, 'press', '#two');
    const disclosure = () => button(page, 'compact-closed');
    const down = async (target: Locator) => {
      const box = await edges(target);
      await page.mouse.move(box.left + 30, box.top + 20);
      await page.mouse.down();
      return box;
    };
    const up = async (target: Locator) => {
      // (Let go where it was pressed: a link that is held and moved is dragged, which is the browser's own gesture.)
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => target.getAttribute('data-pressed')).toBeNull();
    };
    // overlay
    await mountFixtures(page, spec, { icons: true, fixtures });
    for (const [part, target] of [
      ['item', item()],
      ['disclosure', disclosure()],
    ] as const) {
      await down(target);
      await expect(target).toHaveAttribute('data-pressed', 'overlay');
      expect(await css(target, 'background-color')).toBe(await resolveColor(page, T(`${part}-pressed-container-color`)));
      await expect(target.locator('.ripple')).toHaveCount(0);
      await up(target);
    }
    // ripple
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'm3-like' });
    for (const [part, target] of [
      ['item', item()],
      ['disclosure', disclosure()],
    ] as const) {
      const box = await down(target);
      await expect(target).toHaveAttribute('data-pressed', 'ripple');
      const ripple = target.locator('> .ripple');
      await expect(ripple).toHaveCount(1);
      expect(await ripple.evaluate((el) => [(el as HTMLElement).style.getPropertyValue('--_x'), (el as HTMLElement).style.getPropertyValue('--_y')].map((v) => Math.round(Number.parseFloat(v))))).toEqual([30, 20]);
      expect(await css(ripple, 'background-color')).toBe(await resolveColor(page, T(`${part}-pressed-container-color`)));
      expect(await css(ripple, 'position')).toBe('absolute');
      expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
      // The row's own fill stays with the state under the press, and the layer is no part of its layout.
      expect(await css(target, 'background-color')).not.toBe(await resolveColor(page, T(`${part}-pressed-container-color`)));
      near((await edges(target)).height, box.height);
      await up(target);
      await expect(ripple).toHaveCount(0);
    }
    await item().focus();
    await page.keyboard.down('Enter');
    const fromKey = await item().locator('> .ripple').evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x')));
    near(fromKey, (await edges(item())).width / 2, 1);
    await page.keyboard.up('Enter');
    await expect.poll(() => item().getAttribute('data-pressed')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await down(item());
    expect(await css(item().locator('> .ripple'), 'animation-name')).toBe('none');
    await up(item());
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // dim
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'cupertino' });
    await page.addStyleTag({ content: `${ROW} { transition: none !important; }` });
    await down(item());
    await expect(item()).toHaveAttribute('data-pressed', 'dim');
    expect(Number(await css(item(), 'opacity'))).toBeCloseTo(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('pressed-opacity'))), 2);
    await expect(item().locator('.ripple')).toHaveCount(0);
    await up(item());
    // none
    await mountFixtures(page, spec, { icons: true, fixtures });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await page.addStyleTag({ content: `${ROW} { transition: none !important; }` });
    await tabTo(page, item());
    const focused = await item().evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).opacity, getComputedStyle(el).color]);
    await page.keyboard.down('Enter');
    await expect(item()).toHaveAttribute('data-pressed', 'none');
    expect(await item().evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).opacity, getComputedStyle(el).color])).toEqual(focused);
    await page.keyboard.up('Enter');
  });

  test('TOC-22: a row’s corners and the compact form’s are eased by sys.shape.corner-smoothing (cupertino is continuous) where the browser can, and keyboard focus is drawn as sys.behavior.focus-style names — a ring, or a glow under the acme system — on an item and on the disclosure row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'compact-closed'), system: 'cupertino' });
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(1)'));
    for (const [target, token] of [
      [row(page, 'nested', '#anatomy'), 'row-shape'],
      [nav(page, 'compact-closed'), 'compact-container-shape'],
      [button(page, 'compact-closed'), 'row-shape'],
    ] as const) {
      const own = await css(target, 'corner-shape');
      if (smooth) expect(own).toContain('superellipse');
      else expect(own).toBe('');
      const [radius, drawn] = [await resolveToken(page, T(token)), await px(target, 'border-top-left-radius')];
      if (smooth) expect(drawn).toBeGreaterThan(radius);
      else expect(drawn).toBeCloseTo(radius, 1);
    }
    // ring (the default) and glow (acme).
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'compact-closed') });
    for (const target of [row(page, 'nested', '#anatomy'), button(page, 'compact-closed')]) {
      await tabTo(page, target);
      expect(await css(target, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
      expect(await css(target, 'box-shadow', '::after')).toBe('none');
    }
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'compact-closed'), system: 'acme', systemCss: await acmeSystemCss() });
    for (const target of [row(page, 'nested', '#anatomy'), button(page, 'compact-closed')]) {
      await tabTo(page, target);
      expect(await css(target, 'outline-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
      expect(await css(target, 'box-shadow', '::after')).not.toBe('none');
      // The glow is inside the row: its box is inset from the row's edge.
      expect(await px(target, 'top', '::after')).toBeGreaterThan(0);
    }
  });

  test('TOC-23: a row changes between its states over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'compact-closed') });
    const duration = `${(await resolveToken(page, T('motion-state-duration'), 'duration')) / 1000}s`;
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    const anchor = row(page, 'nested', '#anatomy');
    expect((await css(anchor, 'transition-duration')).split(', ').slice(2)).toEqual([duration, duration, duration]);
    expect((await css(anchor, 'transition-timing-function')).split(/, (?![^(]*\))/).slice(2)).toEqual([easing, easing, easing]);
    expect(await css(button(page, 'compact-closed'), 'transition-property')).toBe('background-color, color, opacity');
    expect(await css(button(page, 'compact-closed'), 'transition-duration')).toBe(duration);
    expect(await css(button(page, 'compact-closed'), 'transition-timing-function')).toBe(easing);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await css(anchor, 'transition-property')).split(', ')).toEqual(['--_toc-held-image', '--_toc-held-clip']);
    expect(await css(button(page, 'compact-closed'), 'transition-duration')).toBe('0s');
  });

  test('TOC-24: a row is its hit area across the list’s whole width with no gap between two — a press on the indent before a nested label follows that item; with a mouse a regular row is 44 high, the pointer target, and a compact one 32; for touch both are 48; the disclosure row is 48 and never lower than the target', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('nested', 'density-compact-nested', 'compact-closed') });
    expect(await resolveToken(page, '--tanrei-sys-target-pointer')).toBe(44);
    expect(await resolveToken(page, T('row-height-regular'))).toBe(await resolveToken(page, '--tanrei-sys-target-pointer'));
    for (const anchor of await rows(page, 'nested').all()) expect((await edges(anchor)).height).toBe(44);
    for (const anchor of await rows(page, 'density-compact-nested').all()) expect((await edges(anchor)).height).toBe(32);
    expect((await edges(button(page, 'compact-closed'))).height).toBe(48);
    expect(await resolveToken(page, T('compact-row-height'))).toBe(48);
    // A regular row is never lower than the pointer target, whatever its tokens say.
    await override(page, { [T('row-height-regular')]: '20px', [T('row-padding-block-regular')]: '0px' });
    expect((await edges(row(page, 'nested', '#anatomy'))).height).toBe(44);
    await override(page, { [T('row-height-regular')]: '', [T('row-padding-block-regular')]: '' });
    // A press on the indent before a nested label, and at the row's far end, follows that item.
    const nested = row(page, 'nested', '#container');
    const box = await edges(nested);
    expect((await textBox(nested)).left - box.left).toBeGreaterThan(20);
    await page.mouse.click(box.left + 3, box.top + box.height / 2);
    expect(await page.evaluate(() => location.hash)).toBe('#container');
    const far = await edges(row(page, 'nested', '#label'));
    await page.mouse.click(far.right - 2, far.bottom - 1);
    expect(await page.evaluate(() => location.hash)).toBe('#label');
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await resolveToken(page, '--tanrei-sys-target-touch')).toBe(48);
    await expect.poll(async () => (await edges(row(page, 'nested', '#anatomy'))).height).toBe(48);
    for (const anchor of await rows(page, 'density-compact-nested').all()) expect((await edges(anchor)).height).toBe(48);
    expect((await edges(button(page, 'compact-closed'))).height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('the compact presentation', () => {
  test('TOC-25: one block as wide as its layout, filled with compact.container.color with corners compact.container.shape, holding the row — 48 high, padded 16 at both ends, its parts 8 apart: the title in title.typescale and the disclosure label color, the current item’s label in the supporting text’s style on one line and cut with an ellipsis, the chevron in its box at the end, turned half a turn while open; with no current item the title and the chevron alone; the title is never cut before the name', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact-closed', 'compact-closed-no-current', 'compact-long-current', 'compact-open') });
    const id = 'compact-closed';
    const block = nav(page, id);
    near((await edges(block)).width, 240);
    expect(await css(block, 'background-color')).toBe(await resolveColor(page, T('compact-container-color')));
    near(await px(block, 'border-top-left-radius'), await resolveToken(page, T('compact-container-shape')), 0.1);
    const disclosure = button(page, id);
    const [box, name, heading, chevron] = [await edges(disclosure), disclosure.locator('.row-current'), disclosure.locator('.row-title'), disclosure.locator('.chevron')];
    expect(box.height).toBe(await resolveToken(page, T('compact-row-height')));
    near(box.width, 240);
    near((await edges(block)).height, box.height);
    const [pad, gap] = [await resolveToken(page, T('compact-row-padding-inline')), await resolveToken(page, T('compact-row-gap'))];
    near((await edges(heading)).left - box.left, pad);
    near(box.right - (await edges(chevron)).right, pad);
    near((await edges(name)).left - (await edges(heading)).right, gap);
    near((await edges(chevron)).left - (await edges(name)).right, gap);
    await expect(heading).toHaveText('On this page');
    near(await px(heading, 'font-size'), await resolveToken(page, T('title-typescale-font-size')), 0.01);
    expect(await css(heading, 'color')).toBe(await resolveColor(page, T('disclosure-label-color')));
    await expect(name).toHaveText('Label');
    near(await px(name, 'font-size'), await resolveToken(page, T('compact-supporting-text-typescale-font-size')), 0.01);
    expect(await css(name, 'color')).toBe(await resolveColor(page, T('compact-supporting-text-color')));
    expect(await name.evaluate((el) => [getComputedStyle(el).whiteSpace, getComputedStyle(el).textOverflow, getComputedStyle(el).overflowX])).toEqual(['nowrap', 'ellipsis', 'hidden']);
    const size = await resolveToken(page, T('compact-icon-size'));
    expect([(await edges(chevron)).width, (await edges(chevron)).height]).toEqual([size, size]);
    expect(await css(chevron, 'color')).toBe(await resolveColor(page, T('compact-icon-color')));
    await expect(chevron).toHaveText('expand_more');
    await expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(await css(chevron, 'rotate')).toBe('none');
    expect(await css(button(page, 'compact-open').locator('.chevron'), 'rotate')).toBe('180deg');
    // No current item: the title and the chevron alone.
    await expect(button(page, 'compact-closed-no-current').locator('.row-current')).toHaveText('');
    await expect(button(page, 'compact-closed-no-current')).not.toHaveAttribute('aria-describedby');
    // A name too long for the row is cut, on one line; the title is whole.
    const long = button(page, 'compact-long-current');
    expect((await edges(long)).height).toBe(48);
    expect(await long.locator('.row-current').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await long.locator('.row-title').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect((await textBox(long.locator('.row-title'))).lines).toBe(1);
    // …down to nothing: in a row with room for the title alone, the name has no width and the title is still whole.
    await page.addStyleTag({ content: '[data-fixture="compact-long-current"] { inline-size: 187px !important; }' });
    expect((await edges(long.locator('.row-current'))).width).toBeLessThan(8);
    expect((await textBox(long.locator('.row-title'))).lines).toBe(1);
    expect(await long.locator('.row-title').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('TOC-26: the row activated by pointer, Enter or Space emits toggle once with the new open and shows or hides the list — drawn below the row inside the block, compact.list.padding-inline from its edges with compact.list.padding-block below, the block growing and what follows moving — over motion.disclosure-duration with the chevron, at once where motion is reduced; closed, the list is not drawn, not exposed and not focusable: Tab from the row reaches what follows the table of contents; no scrim, no kept focus, and a press outside does not close it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact-closed', 'compact-open') });
    await page.evaluate(() => document.querySelector('[data-fixture="compact-closed"]')!.insertAdjacentHTML('beforeend', '<button type="button" id="after">After</button>'));
    await watchEvents(page);
    const [h, disclosure, block] = [host(page, 'compact-closed'), button(page, 'compact-closed'), nav(page, 'compact-closed')];
    const clip = h.locator('.clip');
    // Closed: as high as its row; the list not drawn, not exposed, not focusable.
    near((await edges(block)).height, (await edges(disclosure)).height);
    expect(await css(clip, 'visibility')).toBe('hidden');
    expect((await edges(clip)).height).toBe(0);
    await expect(h.getByRole('link')).toHaveCount(0);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await tabTo(page, disclosure);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    // Opened by each of the three, closed by each.
    const duration = await resolveToken(page, T('motion-disclosure-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    expect((await css(clip, 'transition-property')).split(', ')).toEqual(['grid-template-rows', 'visibility']);
    expect(Number.parseFloat(await css(clip, 'transition-duration')) * 1000).toBeCloseTo(duration, 0);
    expect(Number.parseFloat(await css(disclosure.locator('.chevron'), 'transition-duration')) * 1000).toBeCloseTo(duration, 0);
    const below = (await edges(page.locator('#after'))).top;
    await disclosure.click();
    expect(await events(page)).toEqual(['toggle:true']);
    expect(await prop(h, 'open')).toBe(true);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => page.evaluate(() => document.querySelector('[data-fixture="compact-closed"] > *')!.shadowRoot!.querySelector('.clip')!.getAnimations().length)).toBe(0);
    await expect(h.getByRole('link')).toHaveCount(5);
    const [outer, inner] = [await edges(block), await edges(h.locator('> ul'))];
    near(inner.left - outer.left, await resolveToken(page, T('compact-list-padding-inline')));
    near(outer.right - inner.right, await resolveToken(page, T('compact-list-padding-inline')));
    near(outer.bottom - inner.bottom, await resolveToken(page, T('compact-list-padding-block')));
    near(inner.top, (await edges(disclosure)).bottom);
    expect((await edges(page.locator('#after'))).top).toBeGreaterThan(below + 100);
    // No scrim, and nothing is kept: a press outside changes nothing, and Tab leaves through the items.
    expect(await h.evaluate((el) => !!el.shadowRoot!.querySelector('dialog, [popover], .scrim'))).toBe(false);
    await page.mouse.click(900, 700);
    expect(await prop(h, 'open')).toBe(true);
    expect(await events(page)).toEqual([]);
    await tabTo(page, page.locator('#after'));
    expect(await prop(h, 'open')).toBe(true);
    await disclosure.focus();
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['toggle:false']);
    await expect(h.getByRole('link')).toHaveCount(0);
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual(['toggle:true']);
    await page.keyboard.press('Space');
    expect(await events(page)).toEqual(['toggle:false']);
    // The product sets open: drawn, and no toggle.
    await set(h, { open: true });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(await events(page)).toEqual([]);
    // At once where motion is reduced.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(clip, 'transition-duration')).toBe('0s');
    expect(await css(disclosure.locator('.chevron'), 'transition-duration')).toBe('0s');
    await disclosure.click();
    expect(await css(clip, 'visibility')).toBe('hidden');
    near((await edges(block)).height, (await edges(disclosure)).height);
  });

  test('TOC-27: an open block is never taller than the room its layout gives it — the list scrolls inside while the row stays in place — and when the list is shown its current row is brought into its visible part without a motion', async ({ page }) => {
    const items = `<ul>${Array.from({ length: 20 }, (_, i) => `<li><a href="#i${i + 1}">Item ${i + 1}</a></li>`).join('')}</ul>`;
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('held', { ...LABEL, presentation: 'compact', tracking: 'manual', current: '#i17' }, items)] });
    await page.addStyleTag({ content: `[data-fixture="held"] > ${TAG} { max-block-size: 240px; }` });
    const [h, disclosure] = [host(page, 'held'), button(page, 'held')];
    const top = (await edges(disclosure)).top;
    await disclosure.click();
    const scroller = h.locator('.scroller');
    await expect.poll(() => h.evaluate((el) => el.shadowRoot!.querySelector('.clip')!.getAnimations().length)).toBe(0);
    near((await edges(h)).height, 240);
    near((await edges(nav(page, 'held'))).height, 240);
    expect(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // The current row is whole inside the part that scrolls, under the row, which has not moved.
    const [shown, currentRow] = [await edges(scroller), await edges(row(page, 'held', '#i17'))];
    expect(currentRow.top).toBeGreaterThanOrEqual(shown.top - 0.6);
    expect(currentRow.bottom).toBeLessThanOrEqual(shown.bottom + 0.6);
    near((await edges(disclosure)).top, top);
    near(shown.top, (await edges(disclosure)).bottom);
    expect(await css(scroller, 'scroll-behavior')).toBe('auto');
    // The list scrolls inside; the row stays.
    await scroller.evaluate((el) => (el.scrollTop = 0));
    near((await edges(disclosure)).top, top);
    expect((await edges(row(page, 'held', '#i1'))).top).toBeGreaterThanOrEqual(shown.top - 0.6);
    // Shown again, at once: the current row is in view in the frame the list is whole.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await disclosure.click();
    await disclosure.click();
    await frame(page);
    const again = await edges(row(page, 'held', '#i17'));
    expect(again.top).toBeGreaterThanOrEqual(shown.top - 0.6);
    expect(again.bottom).toBeLessThanOrEqual(shown.bottom + 0.6);
  });

  test('TOC-27: a wheel turned on past the end of an open compact list that scrolls, and turned again after a pause, leaves the page behind where it was', async ({ page }) => {
    const items = `<ul>${Array.from({ length: 20 }, (_, i) => `<li><a href="#i${i + 1}">Item ${i + 1}</a></li>`).join('')}</ul>`;
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('held', { ...LABEL, presentation: 'compact', tracking: 'manual', current: '#i17' }, items)], reducedMotion: true });
    await page.addStyleTag({ content: `[data-fixture="held"] > ${TAG} { max-block-size: 240px; }` });
    await button(page, 'held').click();
    const scroller = host(page, 'held').locator('.scroller');
    await expect.poll(() => scroller.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expectWheelKeptFromPage(page, scroller, 'block');
  });

  test('TOC-28: choosing the third item of an open compact list with Enter hides the list with toggle false, follows the link, and leaves keyboard focus with the page — the next Tab is on the first focusable element after the third heading, not on the disclosure row and not at the start of the page', async ({ page }) => {
    await reading(page, { props: { presentation: 'compact' }, styles: '.stage { inset: 64px 0 auto auto; }' });
    await page.evaluate(() => document.querySelector('article')!.insertAdjacentHTML('afterbegin', '<button type="button" id="first">First of the page</button>'));
    const disclosure = button(page, 'reading');
    await disclosure.focus();
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['toggle:true']);
    await toc(page).locator('a[href="#s3"]').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => prop(toc(page), 'open')).toBe(false);
    expect(await page.evaluate(() => location.hash)).toBe('#s3');
    expect(await events(page)).toEqual(['select:#s3', 'currentchange:#s3', 'toggle:false']);
    await expect(disclosure.locator('.row-current')).toHaveText('Section 3');
    // Focus was not pulled back to the row.
    expect(await toc(page).evaluate((el) => el.shadowRoot!.activeElement)).toBeNull();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('b3');
  });

  test('TOC-29: Escape with focus on the disclosure row or inside the shown list hides the list, emits toggle with false, and moves focus to the row where it was inside the list; moving focus out by Tab does not hide it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact-open') });
    await page.evaluate(() => document.querySelector('[data-fixture="compact-open"]')!.insertAdjacentHTML('beforeend', '<button type="button" id="after">After</button>'));
    await watchEvents(page);
    const [h, disclosure] = [host(page, 'compact-open'), button(page, 'compact-open')];
    await row(page, 'compact-open', '#container').focus();
    await page.keyboard.press('Escape');
    expect(await prop(h, 'open')).toBe(false);
    expect(await events(page)).toEqual(['toggle:false']);
    expect(await h.evaluate((el) => el.shadowRoot!.activeElement?.className)).toBe('row');
    // On the row.
    await page.keyboard.press('Enter');
    expect(await events(page)).toEqual(['toggle:true']);
    await page.keyboard.press('Escape');
    expect(await events(page)).toEqual(['toggle:false']);
    expect(await h.evaluate((el) => el.shadowRoot!.activeElement?.className)).toBe('row');
    // Closed: Escape is not this element's.
    await page.keyboard.press('Escape');
    expect(await events(page)).toEqual([]);
    // Tab out of an open one does not close it.
    await disclosure.click();
    await events(page);
    await tabTo(page, page.locator('#after'));
    expect(await prop(h, 'open')).toBe(true);
    expect(await events(page)).toEqual([]);
  });

  test('TOC-30: a change of presentation keeps the current item, draws the new presentation at once with no motion of its own, sets open to false without toggle, keeps keyboard focus on an item that is still shown and moves it to the disclosure row where the item is not', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact-open', 'current-nested') });
    await watchEvents(page);
    // compact, open, focus on an item → list: the item is still shown, and keeps the focus.
    const open = host(page, 'compact-open');
    await row(page, 'compact-open', '#container').focus();
    await set(open, { presentation: 'list' });
    expect(await prop(open, 'open')).toBe(false);
    expect(await prop(open, 'current')).toBe('#label');
    await expect(row(page, 'compact-open', '#label')).toHaveAttribute('aria-current', 'location');
    await expect(button(page, 'compact-open')).toHaveCount(0);
    await expect(title(page, 'compact-open')).toHaveCount(1);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe('#container');
    expect(await open.evaluate((el) => el.shadowRoot!.querySelector('.clip')!.getAnimations().length)).toBe(0);
    expect(await css(nav(page, 'compact-open'), 'background-color')).toMatch(CLEAR);
    // list, focus on an item → compact: closed, the item is no longer shown, and focus is on the row.
    const listed = host(page, 'current-nested');
    await row(page, 'current-nested', '#anatomy').focus();
    await set(listed, { presentation: 'compact' });
    expect(await prop(listed, 'open')).toBe(false);
    expect(await prop(listed, 'current')).toBe('#label');
    expect(await listed.evaluate((el) => el.shadowRoot!.activeElement?.className)).toBe('row');
    await expect(button(page, 'current-nested').locator('.row-current')).toHaveText('Label');
    // (The row that took the focus changes to its focused state, which is a state's own motion: TOC-23.)
    expect(await listed.evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].filter((node) => !node.matches('.row')).flatMap((node) => node.getAnimations()).length)).toBe(0);
    expect(await css(listed.locator('.clip'), 'visibility')).toBe('hidden');
    await expect(listed.getByRole('link')).toHaveCount(0);
    expect(await events(page)).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test('TOC-31: a navigation landmark named by label holding nested lists of links, each named by its label; the rail, the marker and the chevron hidden; in the compact presentation the row is one button named by label, described by the current item’s label, with its expanded state, controlling the list; the title is exposed once — as the landmark’s name, and as a heading only where the product gave one', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('current-nested', 'compact-open', 'compact-closed-no-current'), raw('slotted', LABEL, `<h2 slot="title">On this page</h2>${THREE}`)] });
    const h = host(page, 'current-nested');
    await expect(h.getByRole('navigation', { name: 'On this page' })).toHaveCount(1);
    expect(await nav(page, 'current-nested').evaluate((el) => el.localName)).toBe('nav');
    await expect(h.getByRole('list')).toHaveCount(2);
    await expect(h.getByRole('listitem')).toHaveCount(5);
    expect(await h.evaluate((el) => [...el.querySelectorAll('ul')].map((ul) => [ul.parentElement!.localName, ul.getAttribute('role'), ul.children.length]))).toEqual([
      ['tanrei-table-of-contents', 'list', 3],
      ['li', 'list', 2],
    ]);
    expect(await h.getByRole('link').allTextContents()).toEqual(['When to use', 'Anatomy', 'Container', 'Label', 'Accessibility']);
    await expect(h.getByRole('link', { name: 'Label', exact: true })).toHaveAttribute('aria-current', 'location');
    // The title is drawn text: the landmark's name, and nothing else of it is exposed.
    await expect(title(page, 'current-nested').locator('span')).toHaveAttribute('aria-hidden', 'true');
    await expect(h.getByRole('heading')).toHaveCount(0);
    await expect(host(page, 'slotted').getByRole('heading', { level: 2, name: 'On this page' })).toHaveCount(1);
    await expect(host(page, 'slotted').locator('.title span[aria-hidden]')).toBeHidden();
    // The compact form's row.
    const open = host(page, 'compact-open');
    const disclosure = open.getByRole('button', { name: 'On this page', exact: true });
    await expect(disclosure).toHaveCount(1);
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(await disclosure.evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-controls')!)!.contains((el.getRootNode() as ShadowRoot).querySelector('slot:not([name])')))).toBe(true);
    expect(await disclosure.evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-describedby')!)!.textContent)).toBe('Label');
    await expect(disclosure.locator('.chevron')).toHaveAttribute('aria-hidden', 'true');
    await expect(open.getByRole('navigation', { name: 'On this page' })).toHaveCount(1);
    await expect(host(page, 'compact-closed-no-current').getByRole('button', { name: 'On this page', exact: true })).toHaveAttribute('aria-expanded', 'false');
  });

  test('TOC-31: no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      // A page has one landmark of a kind per name: each is named after its fixture as well, as two tables of contents
      // on one page of a product are told apart (the spec's labeling).
      await page.evaluate(async (tag) => {
        const named = [...document.querySelectorAll(`[data-fixture] > ${tag}`)] as (HTMLElement & { label: string; updateComplete: Promise<unknown> })[];
        for (const el of named) el.label = `${el.label} (${el.parentElement!.dataset.fixture})`;
        await Promise.all(named.map((el) => el.updateComplete));
      }, TAG);
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });

  test('TOC-32: with no items nothing is drawn, no space is taken and nothing is exposed, in either presentation — no title, no landmark, no row; one item renders as several do', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('none', LABEL, ''), raw('empty-list', LABEL, '<ul></ul>'), raw('none-compact', { ...LABEL, presentation: 'compact' }, ''), fixture('single'), fixture('flat')] });
    for (const id of ['none', 'empty-list', 'none-compact']) {
      expect(await css(host(page, id), 'display'), id).toBe('none');
      expect((await edges(host(page, id))).height).toBe(0);
      await expect(host(page, id).getByRole('navigation')).toHaveCount(0);
      await expect(host(page, id).getByRole('button')).toHaveCount(0);
    }
    // An item arrives: it is drawn.
    await host(page, 'none').evaluate((el) => (el.innerHTML = '<ul><li><a href="#a">A</a></li></ul>'));
    await expect.poll(() => css(host(page, 'none'), 'display')).toBe('block');
    await expect(host(page, 'none').getByRole('navigation', { name: 'On this page' })).toHaveCount(1);
    // One item is the first row of several.
    const [one, first] = [await edges(row(page, 'single', '#usage')), await edges(row(page, 'flat', '#install'))];
    expect([one.width, one.height]).toEqual([first.width, first.height]);
    near(one.top - (await edges(host(page, 'single'))).top, first.top - (await edges(host(page, 'flat'))).top);
    await expect(title(page, 'single')).toHaveCount(1);
  });

  test('TOC-33: at 200 % text in a 240 column the title, the labels and the row’s texts grow, the paddings, the indent, the rail and the marker keep their size, the labels wrap whole and the rows grow; every word of every label of three-levels is shown, and raised text spacing loses nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('three-levels', 'current-third-level', 'compact-long-current', 'long-labels') });
    const normal = { label: await px(row(page, 'three-levels', '#roles'), 'font-size'), title: await px(title(page, 'three-levels'), 'font-size'), name: await px(button(page, 'compact-long-current').locator('.row-current'), 'font-size') };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    expect(await px(row(page, 'three-levels', '#roles'), 'font-size')).toBe(normal.label * 2);
    expect(await px(title(page, 'three-levels'), 'font-size')).toBe(normal.title * 2);
    expect(await px(button(page, 'compact-long-current').locator('.row-current'), 'font-size')).toBe(normal.name * 2);
    const whole = async (when: string) => {
      for (const id of ['three-levels', 'long-labels']) {
        const edge = (await edges(list(page, id))).right;
        for (const anchor of await rows(page, id).all()) {
          const [box, text] = [await edges(anchor), await textBox(anchor)];
          expect(text.right, `${when} ${id}`).toBeLessThanOrEqual(edge + 0.6);
          expect(text.left).toBeGreaterThanOrEqual(box.left);
          expect(text.top).toBeGreaterThanOrEqual(box.top - 0.6);
          expect(text.bottom).toBeLessThanOrEqual(box.bottom + 0.6);
          expect(await anchor.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        }
        near((await edges(list(page, id))).width, 240);
      }
    };
    await whole('200 %');
    // The measures that are not text keep their size.
    const after = await Promise.all(['#tokens', '#color', '#roles'].map(async (href) => (await textBox(row(page, 'three-levels', href))).left - (await edges(list(page, 'three-levels'))).left));
    // (The system's spaces are measured in the root's text size: each is still its token, read now.)
    const [pad, indent] = [await resolveToken(page, T('row-padding-inline')), await resolveToken(page, T('row-indent'))];
    expect(after.map((x) => Math.round(x))).toEqual([pad, pad + indent, pad + indent * 2].map((x) => Math.round(x)));
    near(await px(row(page, 'three-levels', '#tokens'), 'padding-top'), await resolveToken(page, T('row-padding-block-regular')), 0.01);
    near(await px(list(page, 'three-levels'), 'border-left-width', '::before'), await resolveToken(page, T('rail-width')), 0.01);
    near(await px(row(page, 'current-third-level', '#schemes'), 'border-left-width', '::before'), await resolveToken(page, T('marker-width')), 0.01);
    expect((await edges(row(page, 'three-levels', '#tokens'))).height).toBeGreaterThan(44);
    expect((await edges(button(page, 'compact-long-current'))).height).toBeGreaterThanOrEqual(48);
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }' });
    await whole('text spacing');
  });

  test('TOC-34: with forced colors the items’ labels are in the link color, the current label, the title and the row’s texts in the text color, the rail and the marker strokes in the text color with the marker kept marker.width wide, the compact form has an edge in the text color, and a focused row shows a ring in the highlight', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: some('current-nested', 'compact-closed') });
    const [text, link, highlight] = [await systemColor(page, 'CanvasText'), await systemColor(page, 'LinkText'), await systemColor(page, 'Highlight')];
    expect(await css(row(page, 'current-nested', '#anatomy'), 'color')).toBe(link);
    expect(await css(row(page, 'current-nested', '#label'), 'color')).toBe(text);
    expect(await css(title(page, 'current-nested'), 'color')).toBe(text);
    expect(await css(list(page, 'current-nested'), 'border-left-color', '::before')).toBe(text);
    const marker = row(page, 'current-nested', '#label');
    expect(await css(marker, 'border-left-color', '::before')).toBe(text);
    expect(await css(marker, 'border-left-style', '::before')).toBe('solid');
    near(await px(marker, 'border-left-width', '::before'), await resolveToken(page, T('marker-width')), 0.01);
    expect(await css(marker, 'opacity', '::before')).toBe('1');
    // No marker is drawn beside another row: its stroke is there, and not seen.
    expect(await css(row(page, 'current-nested', '#anatomy'), 'opacity', '::before')).toBe('0');
    const block = nav(page, 'compact-closed');
    expect(await px(block, 'border-top-width')).toBeGreaterThan(0);
    expect(await css(block, 'border-top-color')).toBe(text);
    expect(await css(button(page, 'compact-closed'), 'color')).toBe(text);
    expect(await css(button(page, 'compact-closed').locator('.row-current'), 'color')).toBe(text);
    for (const target of [row(page, 'current-nested', '#anatomy'), button(page, 'compact-closed')]) {
      await tabTo(page, target);
      expect(await css(target, 'outline-color')).toBe(highlight);
      expect(await px(target, 'outline-offset')).toBeLessThan(0);
    }
  });
});

test.describe('right to left', () => {
  test('TOC-35: in a right-to-left layout the rail and the marker are at the right edge, each level’s label is set in further from the right with its lines aligned to the right, and in the disclosure row the title is at the right, the current item’s label after it and the chevron at the left — turned, never mirrored', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('rtl', 'density-compact-rtl', 'rtl-compact-closed', 'rtl-compact-open') });
    for (const id of ['rtl', 'density-compact-rtl']) {
      const box = await edges(list(page, id));
      const [outer, inner, marked] = [row(page, id, '#anatomy'), row(page, id, '#container'), row(page, id, '#label')];
      near((await edges(outer)).right, box.right);
      near(box.right - (await textBox(outer)).right, await resolveToken(page, T('row-padding-inline')), 1);
      near(box.right - (await textBox(inner)).right, (await resolveToken(page, T('row-padding-inline'))) + (await resolveToken(page, T('row-indent'))), 1);
      expect(await css(marked, 'right', '::before')).toBe('0px');
      near(await px(marked, 'border-right-width', '::before'), await resolveToken(page, T('marker-width')), 0.01);
      expect(await px(marked, 'border-left-width', '::before')).toBe(0);
      // A label of several lines: every line ends at the same right edge.
      expect((await textBox(marked)).lines).toBeGreaterThan(1);
      expect(await css(marked, 'text-align')).toBe('right');
      near(await px(marked, 'padding-left'), await resolveToken(page, T('row-padding-inline')), 0.01);
    }
    for (const id of ['rtl-compact-closed', 'rtl-compact-open']) {
      const disclosure = button(page, id);
      const [box, heading, name, chevron] = [await edges(disclosure), await edges(disclosure.locator('.row-title')), await edges(disclosure.locator('.row-current')), disclosure.locator('.chevron')];
      near(box.right - heading.right, await resolveToken(page, T('compact-row-padding-inline')));
      expect(name.right).toBeLessThan(heading.left);
      near((await edges(chevron)).left - box.left, await resolveToken(page, T('compact-row-padding-inline')));
      expect(await css(chevron, 'transform')).toBe('none');
      expect(await css(chevron, 'direction')).toBe('ltr');
      expect(await css(chevron, 'rotate')).toBe(id.endsWith('open') ? '180deg' : 'none');
    }
    const [block, inside] = [await edges(nav(page, 'rtl-compact-open')), await edges(list(page, 'rtl-compact-open'))];
    near(block.right - inside.right, await resolveToken(page, T('compact-list-padding-inline')));
    expect(await css(list(page, 'rtl-compact-open'), 'right', '::before')).toBe('0px');
  });

  test('TOC-36: the direction comes from the nearest ancestor that sets one, not from the root or a setting of its own, and a change of it is drawn at once with no motion, keeping the current item, open and the focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, dir: 'rtl', fixtures: [{ ...fixture('compact-open'), direction: 'ltr' }, fixture('current-nested')] });
    // The root is right-to-left; the stage of the first says left-to-right.
    expect(await css(host(page, 'compact-open'), 'direction')).toBe('ltr');
    expect(await css(host(page, 'current-nested'), 'direction')).toBe('rtl');
    expect(await prop(host(page, 'compact-open'), 'dir')).toBe('');
    const ltr = await edges(list(page, 'compact-open'));
    near((await edges(row(page, 'compact-open', '#container'))).left, ltr.left);
    expect((await textBox(row(page, 'compact-open', '#container'))).left - ltr.left).toBeGreaterThan(20);
    await watchEvents(page);
    await row(page, 'compact-open', '#container').focus();
    const moving = () => host(page, 'compact-open').evaluate((el) => [...el.shadowRoot!.querySelectorAll('*'), ...el.querySelectorAll('*')].flatMap((node) => node.getAnimations()).length);
    await expect.poll(moving).toBe(0);
    await stage(page, 'compact-open').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await edges(list(page, 'compact-open'));
    expect(rtl.right - (await textBox(row(page, 'compact-open', '#container'))).right).toBeGreaterThan(20);
    expect(await css(list(page, 'compact-open'), 'right', '::before')).toBe('0px');
    const disclosure = button(page, 'compact-open');
    expect((await edges(disclosure.locator('.chevron'))).left).toBeLessThan((await edges(disclosure.locator('.row-title'))).left);
    expect(await moving()).toBe(0);
    expect(await prop(host(page, 'compact-open'), 'open')).toBe(true);
    expect(await prop(host(page, 'compact-open'), 'current')).toBe('#label');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe('#container');
    expect(await events(page)).toEqual([]);
  });

  test('TOC-37: the title, each label and the current item’s label in the row are each text of its own direction, isolated — in rtl-ltr-labels `tanrei.config.json` and `2.0` read left to right and start at the right edge with their level — and a left-to-right name in a right-to-left row begins beside the title and is cut at its own end', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('rtl-ltr-labels'), raw('row', { label: 'في هذه الصفحة', presentation: 'compact', tracking: 'manual', current: '#config' }, '<ul><li><a href="#config">tanrei.config.json and every other file the generators read</a></li></ul>', { direction: 'rtl' })] });
    const id = 'rtl-ltr-labels';
    const box = await edges(list(page, id));
    const [pad, indent] = [await resolveToken(page, T('row-padding-inline')), await resolveToken(page, T('row-indent'))];
    for (const [href, level] of [
      ['#setup', 0],
      ['#config', 0],
      ['#v2', 1],
      ['#cli', 1],
    ] as const) {
      const anchor = row(page, id, href);
      // A label with a letter is isolated, with its own direction; one without (`2.0`) has none, and is the layout's.
      expect(await css(anchor, 'unicode-bidi')).toBe(href === '#v2' ? 'normal' : 'plaintext');
      expect(await anchor.getAttribute('dir')).toBe(href === '#v2' ? null : 'auto');
      expect(await css(anchor, 'direction')).toBe(href === '#setup' || href === '#v2' ? 'rtl' : 'ltr');
      expect(await css(anchor, 'text-align')).toBe('right');
      near(box.right - (await textBox(anchor)).right, pad + indent * level, 1);
    }
    // Left to right inside: the first character of `tanrei.config.json` is at the left end of its text.
    const first = await row(page, id, '#config').evaluate((el) => {
      const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE)!;
      const at = (i: number) => {
        const range = document.createRange();
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        return range.getBoundingClientRect().left;
      };
      return [at(0), at(text.textContent!.length - 1)];
    });
    expect(first[0]).toBeLessThan(first[1]!);
    expect(await css(title(page, id), 'unicode-bidi')).toBe('plaintext');
    // The row's name: its own direction, beside the title, cut at its own (right) end.
    const name = button(page, 'row').locator('.row-current');
    await expect(name).toHaveAttribute('dir', 'auto');
    expect(await css(name, 'direction')).toBe('ltr');
    expect(await name.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await edges(name)).right).toBeLessThan((await edges(button(page, 'row').locator('.row-title'))).left);
    const start = await name.evaluate((el) => {
      const range = document.createRange();
      range.setStart(el.firstChild!.nodeType === Node.TEXT_NODE ? el.firstChild! : el.childNodes[1]!, 0);
      range.setEnd(range.startContainer, 1);
      return range.getBoundingClientRect().left - el.getBoundingClientRect().left;
    });
    near(start, 0, 1);
  });
});

test.describe('missing, unknown, empty', () => {
  test('TOC-38: while the icon set cannot draw the chevron nothing is drawn in its place — never the glyph’s name — and its box is kept, so the row’s texts do not move when the glyph appears', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact-closed') });
    const disclosure = button(page, 'compact-closed');
    const chevron = disclosure.locator('.chevron');
    await expect(chevron).toHaveAttribute('data-drawn', '');
    const family = await withoutIconFont(page);
    await expect(chevron).not.toHaveAttribute('data-drawn');
    expect(await css(chevron, 'visibility')).toBe('hidden');
    const size = await resolveToken(page, T('compact-icon-size'));
    expect([(await edges(chevron)).width, (await edges(chevron)).height]).toEqual([size, size]);
    const before = [await edges(disclosure.locator('.row-title')), await edges(disclosure.locator('.row-current'))];
    // The row works all the same.
    await disclosure.click();
    expect(await prop(host(page, 'compact-closed'), 'open')).toBe(true);
    await disclosure.click();
    await iconFaceArrives(page, family);
    await expect(chevron).toHaveAttribute('data-drawn', '');
    expect(await css(chevron, 'visibility')).toBe('visible');
    expect([await edges(disclosure.locator('.row-title')), await edges(disclosure.locator('.row-current'))]).toEqual(before);
  });

  test('TOC-39: a presentation or a tracking it does not have behaves as list and auto, and a density the active system does not have is drawn with the default’s tokens, each reported; one a design system adds is drawn from its tokens; a change of density draws the new heights at once, keeping the current item, open and the focus; a manual current that names no item draws none, and is reported; of two items with one href both are drawn and the first is the one that can be current; more than three levels are still drawn, each set in by one indent, and reported', async ({ page }) => {
    const seen = warnings(page);
    const four = '<ul><li><a href="#a">A</a><ul><li><a href="#b">B</a><ul><li><a href="#c">C</a><ul><li><a href="#d">D</a></li></ul></li></ul></li></ul></li></ul>';
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        raw('unknown', { ...LABEL, presentation: 'sheet', tracking: 'sometimes', density: 'cosy' }, THREE),
        raw('added', { ...LABEL, density: 'roomy', tracking: 'manual' }, THREE),
        raw('no-such', { ...LABEL, tracking: 'manual', current: '#nine' }, THREE),
        raw('twice', { ...LABEL, tracking: 'manual', current: '#one' }, '<ul><li><a href="#one">One</a></li><li><a href="#one">One again</a></li></ul>'),
        raw('deep', { ...LABEL, tracking: 'manual' }, four),
        fixture('compact-open'),
      ],
    });
    await frame(page);
    // Unknown values: the list presentation, auto tracking, the default density.
    await expect(title(page, 'unknown')).toHaveCount(1);
    await expect(button(page, 'unknown')).toHaveCount(0);
    expect((await edges(row(page, 'unknown', '#one'))).height).toBe(44);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('presentation "sheet"'))).toBe(true);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('tracking "sometimes"'))).toBe(true);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('density "cosy"'))).toBe(true);
    // (auto: with nothing to read, no item is current — and choosing one makes it so.)
    await row(page, 'unknown', '#two').click();
    expect(await prop(host(page, 'unknown'), 'current')).toBe('#two');
    // A density a design system added is drawn from its tokens.
    await override(page, { [T('row-height-roomy')]: '60px', [T('row-padding-block-roomy')]: '20px' });
    await set(host(page, 'added'), { density: 'regular' });
    await set(host(page, 'added'), { density: 'roomy' });
    expect((await edges(row(page, 'added', '#one'))).height).toBe(60);
    expect(await px(row(page, 'added', '#one'), 'padding-top')).toBe(20);
    // A change of density: the new heights at once, with the current item, open and the focus kept.
    const open = host(page, 'compact-open');
    await row(page, 'compact-open', '#container').focus();
    expect((await edges(row(page, 'compact-open', '#container'))).height).toBe(44);
    await set(open, { density: 'compact' });
    expect((await edges(row(page, 'compact-open', '#container'))).height).toBe(32);
    expect(await css(row(page, 'compact-open', '#container'), 'transition-property')).not.toContain('block-size');
    expect([await prop(open, 'open'), await prop(open, 'current'), await page.evaluate(() => document.activeElement?.getAttribute('href'))]).toEqual([true, '#label', '#container']);
    // current names no item.
    await expect(host(page, 'no-such').locator('[aria-current]')).toHaveCount(0);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('current "#nine"'))).toBe(true);
    // Two items with one href.
    await expect(rows(page, 'twice')).toHaveCount(2);
    expect(await host(page, 'twice').evaluate((el) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('aria-current')))).toEqual(['location', null]);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('two items have the href "#one"'))).toBe(true);
    // Four levels: each one indent further in.
    const rail = (await edges(list(page, 'deep'))).left;
    const starts = await Promise.all(['#a', '#b', '#c', '#d'].map(async (href) => Math.round((await textBox(row(page, 'deep', href))).left - rail)));
    expect(starts).toEqual([12, 24, 36, 48]);
    expect(seen.some((text) => text.includes('TOC-39') && text.includes('4 levels deep'))).toBe(true);
  });

  test('TOC-40: with an empty label it still renders — no title, and a compact row that shows the current item’s label alone — and reports that the landmark and the row have no name; an item whose label is empty is not drawn, nor are its items, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        raw('unnamed', { tracking: 'manual', current: '#two' }, THREE),
        raw('unnamed-row', { presentation: 'compact', tracking: 'manual', current: '#two' }, THREE),
        raw('blank', { ...LABEL, tracking: 'manual' }, '<ul><li><a href="#one">One</a></li><li><a href="#blank">  </a><ul><li><a href="#under">Under a blank</a></li></ul></li><li><a href="#none"></a></li><li><a href="#three">Three</a></li></ul>'),
      ],
    });
    await frame(page);
    await expect(title(page, 'unnamed')).toHaveCount(0);
    await expect(rows(page, 'unnamed')).toHaveCount(4);
    near((await edges(list(page, 'unnamed'))).top, (await edges(host(page, 'unnamed'))).top);
    await expect(nav(page, 'unnamed')).not.toHaveAttribute('aria-label');
    const disclosure = button(page, 'unnamed-row');
    await expect(disclosure.locator('.row-title')).toHaveCount(0);
    await expect(disclosure.locator('.row-current')).toHaveText('Two');
    near((await edges(disclosure.locator('.row-current'))).left - (await edges(disclosure)).left, await resolveToken(page, T('compact-row-padding-inline')));
    expect(seen.filter((text) => text.includes('TOC-40') && text.includes('label is empty')).length).toBe(2);
    // The items without a label, and what is under one.
    expect(await host(page, 'blank').evaluate((el) => [...el.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height > 0).map((a) => a.getAttribute('href')))).toEqual(['#one', '#three']);
    near((await edges(row(page, 'blank', '#three'))).top, (await edges(row(page, 'blank', '#one'))).bottom);
    expect(seen.some((text) => text.includes('TOC-40') && text.includes('"#blank"'))).toBe(true);
    expect(seen.some((text) => text.includes('TOC-40') && text.includes('"#none"'))).toBe(true);
  });
});

test.describe('before the element is defined, and without script', () => {
  test('TOC-1, TOC-2, TOC-6, TOC-20: the stylesheet alone draws the title and the list — a plain nested list of anchors with the items’ hrefs, each followed by a click and by Enter, hover and focus drawn, a press the overlay held for press-hold — and nothing of the list presentation moves when the element is defined', async ({ page }) => {
    const fixtures = [...some('nested', 'density-compact-three-levels', 'flat'), raw('marked', { ...LABEL, tracking: 'manual' }, THREE.replace('href="#two"', 'href="#two" aria-current="location"')), raw('slotted', LABEL, `<h3 slot="title">Contents</h3>${THREE}`)];
    const document = await fixturesDocument(spec, { icons: true, fixtures });
    const bundle = document.slice(document.lastIndexOf('<script type="module">'), document.lastIndexOf('</script>') + '</script>'.length);
    await page.setContent(document.replace(bundle, ''));
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate((tag) => !!customElements.get(tag), TAG)).toBe(false);
    const geometry = () =>
      page.evaluate((tag) =>
        [...document.querySelectorAll(`${tag}, ${tag} ul, ${tag} li, ${tag} a, ${tag} h3`)].map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return [el.localName, r.left, r.top, r.width, r.height, s.color, s.font].join('|');
        }),
      TAG);
    // The page holds a plain nested list of links, drawn.
    expect(await host(page, 'nested').evaluate((el) => [...el.querySelectorAll('ul a')].map((a) => a.getAttribute('href')))).toEqual(['#when-to-use', '#anatomy', '#container', '#label', '#behaviour', '#states', '#keyboard', '#accessibility']);
    await expect(host(page, 'nested').getByRole('link')).toHaveCount(8);
    expect((await edges(row(page, 'nested', '#anatomy'))).height).toBe(44);
    expect((await edges(row(page, 'density-compact-three-levels', '#roles'))).height).toBe(32);
    expect(Math.round((await textBox(row(page, 'density-compact-three-levels', '#roles'))).left - (await edges(list(page, 'density-compact-three-levels'))).left)).toBe(36);
    expect(await css(list(page, 'nested'), 'border-left-color', '::before')).toBe(await resolveColor(page, T('rail-color')));
    expect(await css(row(page, 'nested', '#anatomy'), 'text-decoration-line')).toBe('none');
    // The title, from the label attribute, where the element will draw it.
    expect(await css(host(page, 'nested'), 'content', '::before')).toBe('"On this page"');
    expect(await css(host(page, 'nested'), 'color', '::before')).toBe(await resolveColor(page, T('title-color')));
    // A current item the page marked itself is drawn.
    expect(await css(row(page, 'marked', '#two'), 'opacity', '::before')).toBe('1');
    expect(await css(row(page, 'marked', '#two'), 'color')).toBe(await resolveColor(page, T('current-label-color')));
    // It works: a click and Enter follow the link; hover and focus are drawn; a press is the overlay, held.
    await row(page, 'nested', '#container').click();
    expect(await page.evaluate(() => location.hash)).toBe('#container');
    await row(page, 'nested', '#states').focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => location.hash)).toBe('#states');
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.addStyleTag({ content: `${ROW} { transition-duration: 0s, 0s, 0s, 0s !important; }` });
    const anchor = row(page, 'nested', '#anatomy');
    await anchor.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await anchor.hover();
    expect(await css(anchor, 'background-color')).toBe(await resolveColor(page, T('item-hovered-container-color')));
    // A press: the pressed container at once, in the state's place, drawn in every frame of press-hold after the
    // release — nothing fades while it is held — and then gone.
    await expectPressHeldAtEveryMoment(page, anchor, { pressed: await resolveColor(page, T('item-pressed-container-color')) });
    await page.mouse.move(0, 0);
    await expect.poll(() => css(anchor, 'background-color'), { intervals: [10] }).toMatch(CLEAR);
    await page.keyboard.press('Tab');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    // Defined: nothing of the list presentation moves, nothing is redrawn.
    const before = await geometry();
    await page.addScriptTag({ content: bundle.slice('<script type="module">'.length, -'</script>'.length), type: 'module' });
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await frame(page);
    expect(await geometry()).toEqual(before);
    expect(await css(host(page, 'nested'), 'content', '::before')).toBe('none');
    await expect(title(page, 'nested')).toHaveCount(1);
  });

  test('TOC-3, TOC-7: inside another component’s shadow root the element adds its stylesheet to that root, and the list is drawn there as in the document', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('flat') });
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'shadowed';
      outer.attachShadow({ mode: 'open' }).innerHTML =
        '<tanrei-table-of-contents label="On this page" tracking="manual" current="#b" density="compact"><ul><li><a href="#a">A</a><ul><li><a href="#b">B</a></li></ul></li></ul></tanrei-table-of-contents>';
      document.querySelector('main')!.append(outer);
    });
    const inner = page.locator('#shadowed tanrei-table-of-contents');
    await expect(inner.locator('a[href="#b"]')).toHaveAttribute('aria-current', 'location');
    expect((await edges(inner.locator('a[href="#a"]'))).height).toBe(32);
    expect(await css(inner.locator('a[href="#b"]'), 'opacity', '::before')).toBe('1');
    expect(Math.round((await textBox(inner.locator('a[href="#b"]'))).left - (await edges(inner.locator('> ul'))).left)).toBe(24);
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
