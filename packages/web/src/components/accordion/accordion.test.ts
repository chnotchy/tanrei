// <tanrei-accordion> and accordion.css, driven by specs/accordion.spec.json: every behaviour id (ACC-1…36) is cited by a
// test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here (the heights and insets of ACC-2's verify are the spec's own numbers for the default system).
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import {
  type Fixture,
  acmeSystemCss,
  fixturesDocument,
  iconFaceArrives,
  loadSpec,
  mountFixtures,
  resolveColor,
  resolveToken,
  tab,
  tabTo,
  withoutIconFont,
  rootTokens,
} from '../../../test/harness.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { drawnOpticalSize, opticalSize } from '../../../test/icons.js';
import { expectPressHeldAtEveryMoment } from '../../../test/held-press.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';

const spec = loadSpec('accordion');
type P = Page;
const TAG = 'tanrei-accordion';
const T = (name: string) => `--tanrei-comp-accordion-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** An item of a fixture's own accordion, counted from 1. */
const item = (page: P, id: string, n: number) => host(page, id).locator(`> details:nth-of-type(${n})`);
const header = (page: P, id: string, n: number) => item(page, id, n).locator('> summary');
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** Where the label's text is drawn: the box of the summary's own text nodes, or of its label element. */
const labelBox = (summary: Locator) =>
  summary.evaluate((el) => {
    const range = document.createRange();
    const node = [...el.childNodes].find((n) => (n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()) || (n instanceof Element && !n.matches('.tanrei-icon, [data-supporting-text], [data-trailing-text], .ripple')))!;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const r = range.getBoundingClientRect();
    const tops: number[] = [];
    for (const rect of rects) if (!tops.some((top) => Math.abs(top - rect.top) < rect.height / 2)) tops.push(rect.top);
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, lines: tops.length, first: rects[0] ? { top: rects[0].top, bottom: rects[0].bottom } : null };
  });
/** Where an item's content is drawn: the box of everything after its summary. */
const contentBox = (details: Locator) =>
  details.evaluate((el) => {
    const range = document.createRange();
    range.setStartAfter(el.querySelector(':scope > summary')!);
    range.setEndAfter(el.lastChild!);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** The box of the chevron: the summary's last grid area, from the pseudo-element's own size. */
const chevronBox = (summary: Locator) =>
  summary.evaluate((el) => {
    const s = getComputedStyle(el);
    const c = getComputedStyle(el, '::after');
    const r = el.getBoundingClientRect();
    const size = Number.parseFloat(c.width);
    const rtl = s.direction === 'rtl';
    const pad = Number.parseFloat(rtl ? s.paddingLeft : s.paddingRight);
    const top = r.top + Number.parseFloat(s.paddingTop) + Number.parseFloat(c.marginTop) + (r.height - Number.parseFloat(s.paddingTop) - Number.parseFloat(s.paddingBottom) - rowsHeight(el)) / 2;
    function rowsHeight(element: Element) {
      return getComputedStyle(element)
        .gridTemplateRows.split(' ')
        .reduce((sum, row) => sum + (Number.parseFloat(row) || 0), 0);
    }
    return { size, left: rtl ? r.left + pad : r.right - pad - size, right: rtl ? r.left + pad + size : r.right - pad, top, bottom: top + size };
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
/** Every `toggle` of every details on the page, in order: `<fixture>/<item's label>:<new state>`. */
const watchToggles = (page: P) =>
  page.evaluate(() => {
    const w = window as unknown as { __toggles: string[] };
    w.__toggles = [];
    for (const details of document.querySelectorAll('details')) {
      details.addEventListener('toggle', (event) => w.__toggles.push(`${details.id || [...details.parentElement!.children].indexOf(details) + 1}:${(event as ToggleEvent).newState}`));
    }
  });
/** The toggles seen so far (the event is a task of its own: two frames have passed when this answers). */
const toggles = async (page: P) => {
  await frame(page);
  return page.evaluate(() => (window as unknown as { __toggles: string[] }).__toggles.splice(0));
};
/** The motions of the accordions that are running now: an item's clock and a chevron's turn (not a header's state colors). */
const motions = (page: P) => page.evaluate(() => document.getAnimations().filter((a) => ['--_acc-open', 'rotate'].includes((a as CSSTransition).transitionProperty)).length);
/** No motion of any accordion is running. */
const settled = (page: P) => expect.poll(() => motions(page), { timeout: 5000 }).toBe(0);
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
/** A fixture whose items are written by the test. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
/** No fill: a transparent color, however the browser writes one (a `color-mix()` of two is not `rgba()`). */
const CLEAR = /^(rgba\(0, 0, 0, 0\)|transparent|.*\/ 0\))$/;
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const THREE = `<details id="a" open><summary>One</summary>First content.</details><details id="b"><summary>Two</summary>Second content.</details><details id="c"><summary>Three</summary>Third content.</details>`;

// The `acme` fixture layer is built once per worker, outside any test's own time: the build takes longer than a test
// has on a busy machine.
test.beforeAll(async () => {
  test.setTimeout(240_000);
  await acmeSystemCss();
});

test.describe('the column, the header and its parts', () => {
  test('ACC-1: one column of items in the order given, each as wide as the accordion and the accordion as wide as its layout, with no space, size, scroll, role or name of its own; one item is a disclosure and differs in nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('all-closed', 'single', 'all-open') });
    const [outer, box] = [await edges(stage(page, 'all-closed')), await edges(host(page, 'all-closed'))];
    near(box.width, outer.width - 32);
    near(box.left, outer.left + 16);
    const labels = fixture('all-closed').items!.map((i) => String(i.props.label));
    expect((await host(page, 'all-closed').locator('> details > summary').allTextContents()).map((text) => text.trim())).toEqual(labels);
    let bottom = box.top;
    for (let n = 1; n <= 3; n++) {
      const row = await edges(item(page, 'all-closed', n));
      near(row.left, box.left);
      near(row.width, box.width);
      near(row.top, bottom);
      bottom = row.bottom;
    }
    // As tall as its headers and its open content; nothing around them.
    near(bottom, box.bottom);
    const drawn = await host(page, 'all-open').evaluate((el) => {
      const s = getComputedStyle(el);
      return { margin: s.margin, padding: s.padding, min: s.minWidth, max: s.maxWidth, overflow: s.overflowY, role: el.getAttribute('role'), label: el.getAttribute('aria-label'), fill: s.backgroundColor };
    });
    expect(drawn).toEqual({ margin: '0px', padding: '0px', min: expect.stringMatching(/^(0px|auto)$/), max: 'none', overflow: 'visible', role: null, label: null, fill: expect.stringMatching(CLEAR) });
    // One item is drawn as the first item of a set is.
    const [single, first] = [await edges(header(page, 'single', 1)), await edges(header(page, 'all-closed', 1))];
    expect([single.width, single.height]).toEqual([first.width, first.height]);
    expect(await css(header(page, 'single', 1), 'font')).toBe(await css(header(page, 'all-closed', 1), 'font'));
  });

  test('ACC-2: a header is one row across the item — 56 high with the label 16 from the start and the chevron’s box 16 from the end at regular, 48 with 12 and 12 at compact (a navigation drawer row’s) — its parts container.gap apart, the icon, trailing text and chevron on the label’s first line, and any height beyond its text shared above and below', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain', 'compact', 'all-parts', 'long-label') });
    for (const [id, height, inset, density] of [
      ['plain', 56, 16, 'regular'],
      ['compact', 48, 12, 'compact'],
    ] as const) {
      const row = await edges(header(page, id, 2));
      expect(row.height, id).toBe(height);
      expect(await resolveToken(page, T(`container-height-${density}`))).toBe(height);
      expect(await resolveToken(page, T(`container-padding-inline-${density}`))).toBe(inset);
      near(row.width, (await edges(item(page, id, 2))).width);
      const label = await labelBox(header(page, id, 2));
      near(label.left, row.left + inset);
      const chevron = await chevronBox(header(page, id, 2));
      near(chevron.right, row.right - inset);
      expect(chevron.size).toBe(await resolveToken(page, T(`chevron-size-${density}`)));
      // The text is centred in the row: what the height has beyond it is shared.
      near(label.top - row.top, row.bottom - label.bottom, 1);
    }
    // The compact header is a navigation drawer's row: its height, its text style, its chevron.
    expect(await resolveToken(page, T('container-height-compact'))).toBe(await resolveToken(page, '--tanrei-comp-navigation-drawer-item-container-height'));
    expect(await resolveToken(page, T('chevron-size-compact'))).toBe(await resolveToken(page, '--tanrei-comp-navigation-drawer-item-trailing-icon-size'));
    // Every part, container.gap apart.
    const gap = await resolveToken(page, T('container-gap'));
    const all = header(page, 'all-parts', 1);
    const [icon, label, trailing, chevron, row] = [await edges(all.locator('> .tanrei-icon')), await labelBox(all), await edges(all.locator('> [data-trailing-text]')), await chevronBox(all), await edges(all)];
    near(label.left, icon.right + gap);
    near(chevron.left, trailing.right + gap);
    expect(trailing.left).toBeGreaterThanOrEqual(label.right + gap - 0.6);
    // A label of three lines: the row grows by its padding, and the chevron stays on the first line.
    const long = header(page, 'long-label', 1);
    const [text, tall, mark] = [await labelBox(long), await edges(long), await chevronBox(long)];
    expect(text.lines).toBeGreaterThan(1);
    // The row is its lines and the padding above the first and below the last.
    const pad = await resolveToken(page, T('container-padding-block-regular'));
    near(tall.height, text.lines * (await px(long, 'line-height')) + 2 * pad);
    near(text.top - tall.top, tall.bottom - text.bottom, 1);
    near((mark.top + mark.bottom) / 2, (text.first!.top + text.first!.bottom) / 2, 1);
    const cut = header(page, 'long-label', 2).locator('> [data-trailing-text]');
    const [cutBox, cutLabel] = [await edges(cut), await labelBox(header(page, 'long-label', 2))];
    near((cutBox.top + cutBox.bottom) / 2, (cutLabel.first!.top + cutLabel.first!.bottom) / 2, 1);
    void row;
  });

  test('ACC-3: the label is drawn in its density’s text style and its look’s color, wraps and is never cut; a heading in the label slot is drawn as any label and keeps its role and its level (2 and 4); a control in it is still rendered and reported', async ({ page }) => {
    const seen = warnings(page);
    const own = raw(
      'headings',
      {},
      `<details><summary><h2>Level two</h2></summary>A.</details><details><summary><h4>Level four</h4></summary>B.</details><details><summary><span>With <code>code</code> inside</span></summary>C.</details><details id="control"><summary><span>Open <a href="#x">the guide</a></span></summary>D.</details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('plain', 'compact', 'outlined', 'long-label'), own] });
    for (const [id, density, variant] of [
      ['plain', 'regular', 'plain'],
      ['compact', 'compact', 'plain'],
      ['outlined', 'regular', 'outlined'],
    ] as const) {
      const summary = header(page, id, 1);
      expect(await px(summary, 'font-size'), id).toBe(await resolveToken(page, T(`label-typescale-${density}-font-size`)));
      expect(await css(summary, 'font-weight')).toBe(String(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T(`label-typescale-${density}-font-weight`))) || (await css(summary, 'font-weight')));
      expect(await css(summary, 'color')).toBe(await resolveColor(page, T(`${variant}-label-color`)));
    }
    expect(await px(header(page, 'plain', 1), 'font-size')).toBe(16);
    expect(await px(header(page, 'compact', 1), 'font-size')).toBe(14);
    // It wraps, whole.
    const long = header(page, 'long-label', 1);
    expect((await labelBox(long)).lines).toBeGreaterThan(1);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    // A heading is the label: the label's style, its own role and level.
    const reference = await header(page, 'plain', 1).evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily, s.color, s.letterSpacing];
    });
    for (const [n, level] of [
      [1, 2],
      [2, 4],
    ] as const) {
      const heading = header(page, 'headings', n).locator(`> h${level}`);
      expect(
        await heading.evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily, s.color, s.letterSpacing];
        }),
      ).toEqual(reference);
      expect(await css(heading, 'margin')).toBe('0px');
      await expect(stage(page, 'headings').getByRole('heading', { level, name: level === 2 ? 'Level two' : 'Level four' })).toHaveCount(1);
      expect(await heading.getAttribute('role')).toBeNull();
      expect((await edges(header(page, 'headings', n))).height).toBe(56);
    }
    // Inline content in one span is one label.
    expect((await labelBox(header(page, 'headings', 3))).lines).toBe(1);
    // A control is rendered, and reported.
    await expect(header(page, 'headings', 4).locator('a')).toBeVisible();
    expect(seen.filter((text) => text.includes('ACC-3') && text.includes('holds a control'))).toHaveLength(1);
  });

  test('ACC-4: the supporting text is under the label in its own text style and color and wraps; the trailing text is one line between the text and the chevron, and is cut with an ellipsis where it would take more than half of the header’s inner width', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('supporting-text', 'trailing-text', 'all-parts-compact', 'long-label') });
    for (const [id, density] of [
      ['supporting-text', 'regular'],
      ['all-parts-compact', 'compact'],
    ] as const) {
      const summary = header(page, id, 1);
      const supporting = summary.locator('> [data-supporting-text]');
      const [label, under] = [await labelBox(summary), await edges(supporting)];
      const row = await edges(summary);
      const pad = (row.height - (await px(summary, 'line-height')) - under.height) / 2;
      near(under.top, row.top + pad + (await px(summary, 'line-height')));
      expect(under.top).toBeGreaterThan(label.top);
      near(under.left, label.left);
      expect(await px(supporting, 'font-size')).toBe(await resolveToken(page, T(`supporting-text-typescale-${density}-font-size`)));
      expect(await css(supporting, 'color')).toBe(await resolveColor(page, T('plain-supporting-text-color')));
      expect(await css(supporting, 'white-space')).toBe('normal');
      // The header grew to hold it.
      expect((await edges(summary)).height).toBeGreaterThan(await resolveToken(page, T(`container-height-${density}`)));
    }
    const trailing = header(page, 'trailing-text', 1).locator('> [data-trailing-text]');
    expect(await px(trailing, 'font-size')).toBe(await resolveToken(page, T('trailing-text-typescale-regular-font-size')));
    expect(await css(trailing, 'color')).toBe(await resolveColor(page, T('plain-trailing-text-color')));
    expect(await css(trailing, 'white-space')).toBe('nowrap');
    expect(await trailing.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // The long one is cut at half of the inner width, and the label keeps the rest.
    const summary = header(page, 'long-label', 2);
    const cut = summary.locator('> [data-trailing-text]');
    const inner = (await edges(summary)).width - 2 * (await resolveToken(page, T('container-padding-inline-regular')));
    expect(await cut.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await css(cut, 'text-overflow')).toBe('ellipsis');
    // Half of what the chevron and the gaps leave: never more than half of the inner width, and the label has as much.
    const left = inner - (await resolveToken(page, T('chevron-size-regular'))) - 2 * (await resolveToken(page, T('container-gap')));
    near((await edges(cut)).width, left / 2, 1);
    expect((await edges(cut)).width).toBeLessThanOrEqual(inner / 2);
    expect((await labelBox(summary)).right).toBeLessThanOrEqual((await edges(cut)).left);
  });

  test('ACC-5: an icon is the glyph of that name at the start of the header in the density’s box and the look’s icon color, outlined and hidden from assistive technology; with no icon no room is kept; it is the same glyph open and closed', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('icon', 'all-parts-compact', 'plain') });
    for (const [id, density] of [
      ['icon', 'regular'],
      ['all-parts-compact', 'compact'],
    ] as const) {
      const summary = header(page, id, 1);
      const glyph = summary.locator('> .tanrei-icon');
      const size = await resolveToken(page, T(`icon-size-${density}`));
      const [box, row] = [await edges(glyph), await edges(summary)];
      expect([box.width, box.height]).toEqual([size, size]);
      near(box.left, row.left + (await resolveToken(page, T(`container-padding-inline-${density}`))));
      expect(await css(glyph, 'color')).toBe(await resolveColor(page, T('plain-icon-color')));
      expect(await css(glyph, 'font-variation-settings')).toContain('"FILL" 0');
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
      const first = (await labelBox(summary)).first!;
      near((box.top + box.bottom) / 2, (first.top + first.bottom) / 2, 1);
    }
    // The glyph of an open item and of a closed one are drawn alike.
    expect(await css(header(page, 'icon', 1).locator('> .tanrei-icon'), 'font-family')).toBe(await css(header(page, 'icon', 2).locator('> .tanrei-icon'), 'font-family'));
    await expect(header(page, 'icon', 1).locator('> .tanrei-icon')).toHaveText('palette');
    // No icon: the label starts at the start padding.
    near((await labelBox(header(page, 'plain', 1))).left, (await edges(header(page, 'plain', 1))).left + 16);
  });

  test('ACC-6: the chevron is expand_more at the end of every header in the density’s box and the look’s chevron color, turned half a turn while the item is open and hidden from assistive technology; nothing else about a header says open, and a disabled item keeps it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain', 'compact', 'disabled') });
    await settled(page);
    for (const [id, density] of [
      ['plain', 'regular'],
      ['compact', 'compact'],
    ] as const) {
      const [open, closed] = [header(page, id, 1), header(page, id, 2)];
      expect(await css(open, 'content', '::after')).toContain('expand_more');
      expect(await px(open, 'width', '::after')).toBe(await resolveToken(page, T(`chevron-size-${density}`)));
      // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
      expect(await drawnOpticalSize(open, '::after'), id).toBe(await opticalSize(page, await resolveToken(page, T(`chevron-size-${density}`))));
      expect(await css(open, 'font-optical-sizing', '::after')).toBe('auto');
      expect(await css(open, 'color', '::after')).toBe(await resolveColor(page, T('plain-chevron-color')));
      expect(await css(open, 'rotate', '::after')).toBe('180deg');
      expect(await css(closed, 'rotate', '::after')).toBe('none');
      // The header is the same open and closed.
      const look = (summary: Locator) =>
        summary.evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.backgroundColor, s.color, s.font, s.opacity, s.height];
        });
      expect(await look(open)).toEqual(await look(closed));
    }
    // A compact chevron is a drawer group's: the same half turn.
    expect(await resolveToken(page, T('chevron-size-compact'))).toBe(20);
    for (const n of [2, 3]) expect(await css(header(page, 'disabled', n), 'content', '::after')).toContain('expand_more');
    expect(await css(header(page, 'disabled', 3), 'rotate', '::after')).toBe('180deg');
  });
});

test.describe('open and closed, the looks, the separation', () => {
  test('ACC-7: open is the state of that item alone; closed content is not drawn, takes no space and cannot take focus; the first frame is drawn as the items say, without motion and without toggle; a field in a closed item keeps its value and stays in the document and in its form', async ({ page }) => {
    const own = raw(
      'fields',
      {},
      `<form id="form"><tanrei-accordion><details id="one" open><summary>Account</summary><label>Name <input name="name" /></label></details><details id="two"><summary>More</summary><label>City <input name="city" value="Kyoto" /></label></details></tanrei-accordion></form>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('plain'), { ...own, content: undefined, props: {} }] });
    // (The form is written around an accordion of the test's own.)
    await stage(page, 'fields').evaluate((el, html) => (el.innerHTML = html), own.content!);
    // Drawn as the items say, in the first frame: nothing moves. (The browser itself sends `toggle` for a details
    // element that is parsed open; the element adds none.)
    expect(await motions(page)).toBe(0);
    await frame(page);
    await watchToggles(page);
    expect(await toggles(page)).toEqual([]);
    // The fixture: the first open, the others closed and taking no space.
    expect(await item(page, 'plain', 1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    expect((await edges(item(page, 'plain', 2))).height).toBe(56);
    expect((await edges(item(page, 'plain', 1))).height).toBeGreaterThan(56);
    await expect(item(page, 'plain', 2)).toContainText('Web Components, SwiftUI');
    expect(await item(page, 'plain', 2).evaluate((el) => (el as HTMLElement).innerText.includes('SwiftUI'))).toBe(false);
    // A field keeps what was typed while its item is closed, and is sent with its form.
    const name = page.locator('#one input');
    await name.fill('Ada');
    await page.locator('#one > summary').click();
    await settled(page);
    expect(await page.locator('#one').evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${String(v)}`))).toEqual(['name=Ada', 'city=Kyoto']);
    // Closed content cannot take focus.
    await page.locator('#one > summary').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.closest('details')?.id)).toBe('two');
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('summary');
    await page.locator('#one > summary').click();
    await settled(page);
    await expect(name).toHaveValue('Ada');
    expect(await name.evaluate((el) => el.isConnected)).toBe(true);
  });

  test('ACC-8: the content is under its header, inset at both ends by the header’s inline padding, with no space above it and content.padding-block-end below; it takes its text style and color from where the accordion stands, and a hover of its open item draws the hovered container under it and changes nothing else', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain', 'compact', 'outlined') });
    for (const [id, density] of [
      ['plain', 'regular'],
      ['compact', 'compact'],
      ['outlined', 'regular'],
    ] as const) {
      const [details, summary] = [item(page, id, 1), header(page, id, 1)];
      const [content, row, whole] = [await contentBox(details), await edges(summary), await edges(details)];
      const inset = await resolveToken(page, T(`container-padding-inline-${density}`));
      near(content.left, row.left + inset);
      expect(content.right).toBeLessThanOrEqual(row.right - inset + 0.6);
      near(content.left, (await labelBox(summary)).left);
      // Nothing above it and the density's space below: the item is its header, the content's lines and that space.
      const lines = (whole.height - row.height - (await resolveToken(page, T(`content-padding-block-end-${density}`)))) / (await px(details, 'line-height'));
      near(lines, Math.round(lines), 0.03);
      expect(Math.round(lines)).toBeGreaterThan(0);
      expect(content.top).toBeGreaterThanOrEqual(row.bottom);
      expect(content.top - row.bottom).toBeLessThan(await px(details, 'line-height'));
    }
    // The content's text is the stage's, not the header's.
    const contentStyle = await item(page, 'plain', 1).evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.fontSize, s.fontWeight, s.color];
    });
    expect(contentStyle).toEqual(
      await stage(page, 'plain').evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.fontSize, s.fontWeight, s.color];
      }),
    );
    expect(contentStyle[0]).not.toBe(await css(header(page, 'plain', 1), 'font-size'));
    // Hovered, the open item is one target (ACC-36): the hovered container is drawn under the whole item, and the
    // content keeps its box, its text style and its color.
    const before = await contentBox(item(page, 'plain', 1));
    expect(await css(item(page, 'plain', 1), 'background-color')).toMatch(CLEAR);
    await header(page, 'plain', 1).hover();
    expect(await contentBox(item(page, 'plain', 1))).toEqual(before);
    const hovered = await resolveColor(page, T('plain-hovered-container-color'));
    await expect.poll(() => css(item(page, 'plain', 1), 'background-color')).toBe(hovered);
    expect(await item(page, 'plain', 1).evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).color])).toEqual([contentStyle[0], contentStyle[2]]);
  });

  test('ACC-9: plain draws no edge and no fill; outlined draws one edge of outline.width in outline.color with the corners of outline.shape, inside the size of what it bounds and moving nothing, and clips to it; the variant changes the edge and the colors and nothing else', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain-divider', 'outlined-divider', 'outlined-gap', 'plain-gap') });
    for (const n of [1, 2, 3]) expect(await css(item(page, 'plain-divider', n), 'content', '::after')).toBe('none');
    const width = await resolveToken(page, T('outline-width'));
    const radius = await resolveToken(page, T('outline-shape'));
    const color = await resolveColor(page, T('outline-color'));
    /** The widths of an item's edge (top, right, bottom, left) and its corners (top left, bottom left). */
    const edge = (id: string, n: number) =>
      item(page, id, n).evaluate((el) => {
        const s = getComputedStyle(el, '::after');
        const own = getComputedStyle(el);
        return { widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(Number.parseFloat), corners: [own.borderTopLeftRadius, own.borderBottomLeftRadius].map(Number.parseFloat), color: s.borderLeftColor, style: s.borderLeftStyle, position: s.position, clip: own.overflowX };
      });
    // One edge around the whole set: the sides on every item, the top on the first and the bottom on the last, with
    // the set's corners there — drawn over the items, out of the flow.
    expect(await edge('outlined-divider', 1)).toEqual({ widths: [width, width, 0, width], corners: [radius, 0], color, style: 'solid', position: 'absolute', clip: 'clip' });
    expect(await edge('outlined-divider', 2)).toEqual({ widths: [0, width, 0, width], corners: [0, 0], color, style: 'solid', position: 'absolute', clip: 'clip' });
    expect(await edge('outlined-divider', 3)).toEqual({ widths: [0, width, width, width], corners: [0, radius], color, style: 'solid', position: 'absolute', clip: 'clip' });
    // The edge is on the accordion's own box, and takes no room: plain and outlined lay everything out alike.
    for (const [plain, outlined] of [
      ['plain-divider', 'outlined-divider'],
      ['plain-gap', 'outlined-gap'],
    ]) {
      for (let n = 1; n <= 3; n++) {
        const relative = async (id: string) => {
          const [box, row, label] = [await edges(host(page, id)), await edges(header(page, id, n)), await labelBox(header(page, id, n))];
          return [row.top - box.top, row.height, row.width, label.left - box.left].map((v) => Math.round(v * 10) / 10);
        };
        expect(await relative(outlined), `${outlined} ${n}`).toEqual(await relative(plain));
      }
      expect((await edges(host(page, outlined))).height).toBe((await edges(host(page, plain))).height);
    }
    // gap: an edge around each item, to whose corners the item is cut.
    for (let n = 1; n <= 3; n++) expect(await edge('outlined-gap', n)).toEqual({ widths: [width, width, width, width], corners: [radius, radius], color, style: 'solid', position: 'absolute', clip: 'clip' });
    expect(await css(header(page, 'outlined-divider', 2), 'color')).toBe(await resolveColor(page, T('outlined-label-color')));
    expect(await css(header(page, 'outlined-divider', 2), 'background-color')).toMatch(CLEAR);
  });

  test('ACC-10: divider is one line of divider.thickness between two items and none above the first or below the last, adding no height; gap is item.gap of space and no line; auto follows comp.accordion.separation and so the system’s choice; a named form is drawn whatever the tokens say; a change is drawn at once and keeps what is open; an unknown value is auto, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain', 'outlined', 'plain-divider', 'plain-gap', 'outlined-divider', 'outlined-gap') });
    const line = (id: string, n: number) => px(item(page, id, n), 'border-top-width', '::before');
    const between = async (id: string, n: number) => (await edges(item(page, id, n))).top - (await edges(item(page, id, n - 1))).bottom;
    const thickness = await resolveToken(page, T('divider-thickness'));
    const gap = await resolveToken(page, T('item-gap'));
    const isDivider = async (id: string) => {
      expect(await line(id, 1), id).toBe(0);
      for (const n of [2, 3]) {
        expect(await line(id, n), id).toBe(thickness);
        expect(await css(item(page, id, n), 'border-top-color', '::before')).toBe(await resolveColor(page, T('divider-color')));
        expect(await between(id, n)).toBe(0);
      }
      // The line is over the item's first pixels: no item is taller for it.
      expect((await edges(item(page, id, 2))).height).toBe(56);
      const [row, mark] = [await edges(item(page, id, 2)), await item(page, id, 2).evaluate((el) => getComputedStyle(el, '::before').width)];
      near(Number.parseFloat(mark), row.width);
    };
    const isGap = async (id: string) => {
      for (const n of [1, 2, 3]) expect(await line(id, n), id).toBe(0);
      for (const n of [2, 3]) near(await between(id, n), gap);
      expect(await px(item(page, id, 1), 'margin-top')).toBe(0);
      expect(await px(item(page, id, 3), 'margin-bottom')).toBe(0);
    };
    for (const id of ['plain', 'outlined', 'plain-divider', 'outlined-divider']) await isDivider(id);
    for (const id of ['plain-gap', 'outlined-gap']) await isGap(id);
    // One edge bounds three items in outlined-divider; each of the three has its own in outlined-gap.
    const top = (id: string, n: number) => px(item(page, id, n), 'border-top-width', '::after');
    expect([await top('outlined-divider', 1), await top('outlined-divider', 2), await top('outlined-divider', 3)]).toEqual([thickness, 0, 0]);
    expect([await top('outlined-gap', 1), await top('outlined-gap', 2), await top('outlined-gap', 3)]).toEqual([thickness, thickness, thickness]);
    // The system chooses gap: the fixtures that follow it change, at once, and the named ones do not.
    await override(page, { '--tanrei-sys-behavior-separation': 'gap' });
    for (const id of ['plain', 'outlined']) await host(page, id).evaluate((el) => (el as unknown as { requestUpdate(): void }).requestUpdate());
    await frame(page);
    await isGap('plain');
    await isGap('outlined');
    await isDivider('plain-divider');
    await isDivider('outlined-divider');
    expect(await item(page, 'plain', 1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    expect(await motions(page)).toBe(0);
    // The attribute over the token, both ways; an unknown value is auto.
    await host(page, 'plain').evaluate((el) => el.setAttribute('separation', 'divider'));
    await frame(page);
    await isDivider('plain');
    await host(page, 'plain').evaluate((el) => el.setAttribute('separation', 'sideways'));
    await frame(page);
    await isGap('plain');
    expect(seen.filter((text) => text.includes('ACC-10') && text.includes('sideways'))).toHaveLength(1);
  });
});

test.describe('opening and closing', () => {
  test('ACC-11: a click, a touch, Enter and Space on a header each emit one toggle with the new state and set open; Right opens a closed item and does nothing more, Left closes an open one; Down, Up, Home and End are left to the page; in right-to-left Left opens and Right closes; focus stays on the header and never moves to another', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('keys', {}, THREE), raw('keys-rtl', {}, THREE.replaceAll('id="', 'id="r'), { direction: 'rtl' })] });
    await watchToggles(page);
    const two = header(page, 'keys', 2);
    const open = () => item(page, 'keys', 2).evaluate((el: HTMLDetailsElement) => el.open);
    await two.click();
    expect(await toggles(page)).toEqual(['b:open']);
    expect(await open()).toBe(true);
    await two.click();
    expect(await toggles(page)).toEqual(['b:closed']);
    // A touch (Chromium can send one; the others answer the tap's click alike).
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      const at = await edges(two);
      const point = { x: at.left + 40, y: at.top + at.height / 2 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      expect(await toggles(page)).toEqual(['b:open']);
      await two.click();
      await toggles(page);
    }
    await tabTo(page, two);
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      expect(await toggles(page), key).toEqual([`b:${key === 'Enter' ? 'open' : 'closed'}`]);
      expect(await two.evaluate((el) => el === document.activeElement)).toBe(true);
    }
    await page.keyboard.press('ArrowRight');
    expect(await toggles(page)).toEqual(['b:open']);
    await page.keyboard.press('ArrowRight');
    expect(await toggles(page)).toEqual([]);
    expect(await two.evaluate((el) => el === document.activeElement)).toBe(true);
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual(['b:closed']);
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual([]);
    // The page's keys: not prevented, nothing toggled, focus where it was.
    await page.evaluate(() => {
      const w = window as unknown as { __prevented: string[] };
      w.__prevented = [];
      document.addEventListener('keydown', (event) => event.defaultPrevented && w.__prevented.push(event.key));
    });
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Shift+ArrowRight']) await page.keyboard.press(key);
    expect(await toggles(page)).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __prevented: string[] }).__prevented)).toEqual([]);
    expect(await two.evaluate((el) => el === document.activeElement)).toBe(true);
    // Right to left: the arrows follow the direction (ACC-28).
    const rtl = header(page, 'keys-rtl', 2);
    await rtl.focus();
    await page.keyboard.press('ArrowRight');
    expect(await toggles(page)).toEqual([]);
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual(['rb:open']);
    await page.keyboard.press('ArrowRight');
    expect(await toggles(page)).toEqual(['rb:closed']);
  });

  test('ACC-12: exclusive keeps at most one of its own items open — opening the third closes the first, with one toggle from each — an open item still closes by its own header; given two open the first in order is drawn open, and reported; an accordion nested in an item keeps its own; without exclusive every item opens by itself', async ({ page }) => {
    const seen = warnings(page);
    const nested = raw(
      'nested',
      { exclusive: true },
      `<details id="outer1" open><summary>Outer one</summary><tanrei-accordion><details id="inner1"><summary>Inner one</summary>x</details><details id="inner2"><summary>Inner two</summary>y</details></tanrei-accordion></details><details id="outer2"><summary>Outer two</summary>z</details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('exclusive', 'exclusive-two-open', 'plain'), nested] });
    const state = (id: string) => host(page, id).evaluate((el) => [...el.querySelectorAll<HTMLDetailsElement>(':scope > details')].map((d) => d.open));
    expect(await state('exclusive-two-open')).toEqual([false, true, false]);
    expect(seen.filter((text) => text.includes('ACC-12'))).toHaveLength(1);
    await watchToggles(page);
    await header(page, 'exclusive', 3).click();
    expect((await toggles(page)).sort()).toEqual(['1:closed', '3:open']);
    expect(await state('exclusive')).toEqual([false, false, true]);
    await header(page, 'exclusive', 3).click();
    expect(await toggles(page)).toEqual(['3:closed']);
    expect(await state('exclusive')).toEqual([false, false, false]);
    // The product sets open: the same.
    await item(page, 'exclusive', 1).evaluate((el: HTMLDetailsElement) => (el.open = true));
    await item(page, 'exclusive', 2).evaluate((el: HTMLDetailsElement) => (el.open = true));
    expect((await toggles(page)).sort()).toEqual(['1:closed', '1:open', '2:open'].sort());
    expect(await state('exclusive')).toEqual([false, true, false]);
    // The name is the accordion's own, and each accordion has another.
    const names = await page.evaluate(() => [...document.querySelectorAll('tanrei-accordion[exclusive]')].map((el) => el.querySelector('details')!.getAttribute('name')));
    expect(new Set(names).size).toBe(names.length);
    expect(await page.locator('#inner1').getAttribute('name')).toBeNull();
    // The nested accordion opens and closes without closing its parent's items.
    await page.locator('#inner1 > summary').click();
    await page.locator('#inner2 > summary').click();
    expect(await toggles(page)).toEqual(['inner1:open', 'inner2:open']);
    expect(await page.locator('#outer1').evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    // Not exclusive: every item by itself; exclusive from now on: the first open one stays.
    await header(page, 'plain', 2).click();
    await header(page, 'plain', 3).click();
    expect(await state('plain')).toEqual([true, true, true]);
    await settled(page);
    await host(page, 'plain').evaluate((el) => el.setAttribute('exclusive', ''));
    await frame(page);
    expect(await state('plain')).toEqual([true, false, false]);
    expect(await motions(page)).toBe(0);
    await host(page, 'plain').evaluate((el) => el.removeAttribute('exclusive'));
    await frame(page);
    expect(await item(page, 'plain', 1).getAttribute('name')).toBeNull();
  });

  test('ACC-13: a change of open reveals or hides the content from the header downward and turns the chevron over motion.disclosure-duration with its easing — one height motion and one turn per change, the content laid out once — and at once where motion is reduced; closing content stays drawn until the end and leaves the focus order when the motion begins; a second change on the way goes on from where the motion is; toggle is emitted when the change begins; a navigation drawer’s group moves over the same duration and curve', async ({ page }) => {
    const own = raw('motion', {}, `<details id="m"><summary>Item</summary><div id="inside" style="block-size: 200px">Tall <button id="within">inside</button></div></details><details id="n"><summary>After</summary>after</details>`);
    await mountFixtures(page, spec, { icons: true, fixtures: [own] });
    // The duration is stretched so that the middle of the motion can be seen on a busy machine; the curve is linear.
    // The height's own motion is a transition of `::details-content`, which no engine lists among the page's
    // animations, so it cannot be held or moved to a moment and is watched as it runs — by the page, frame by frame
    // from the click on (`watch` below), and not by questions: an answer takes a slow runner half a second, ten of them
    // stood between the click that closes the item and the click that turns it back, and the item had closed. What is
    // left to the machine is one frame drawn between a fifth of the way and the end: 3.2 s of the 4.
    await override(page, { [T('motion-disclosure-duration')]: '4000ms', [T('motion-disclosure-easing')]: 'linear' });
    const duration = await resolveToken(page, T('motion-disclosure-duration'), 'duration');
    expect(duration).toBe(4000);
    const details = page.locator('#m');
    const summary = details.locator('> summary');
    const closed = (await edges(details)).height;
    await watchToggles(page);
    const moving = () =>
      details.evaluate((el) => ({
        clock: el.getAnimations().map((a) => [(a as CSSTransition).transitionProperty, a.effect!.getTiming().duration]),
        chevron: el.querySelector('summary')!.getAnimations({ subtree: true }).filter((a) => (a as CSSTransition).transitionProperty === 'rotate').map((a) => [(a.effect as KeyframeEffect).pseudoElement, a.effect!.getTiming().duration]),
        height: el.getBoundingClientRect().height,
        inside: document.getElementById('inside')!.getBoundingClientRect().height,
        after: document.getElementById('n')!.getBoundingClientRect().top - el.getBoundingClientRect().top,
      }));
    interface Frame { height: number; inside: number; after: number; open: boolean; drawn: boolean }
    interface Watched {
      /** What moves when the item's `toggle` arrives: its clock and its chevron's turn. */
      atToggle?: { clock: [string, number][]; chevron: [string, number][] };
      /** Every frame from the click until the clock has ended. */
      frames: Frame[];
      /** Whether focus could be put inside the content, in the first frame found between `turnBetween`. */
      focusable?: boolean;
      /** The height as the page turned the item back in that frame, and in the task after the `toggle` that followed. */
      turn?: { before: number; after?: number };
      done: boolean;
    }
    /**
     * Watches the next change of the item, in the page: what moves at its `toggle`, and every frame until its clock has
     * ended. With `turnBetween`, in the first frame whose height lies between the two the page tries to focus the
     * content and then activates the header again, so the motion is turned back where it is.
     */
    const watch = (turnBetween?: [number, number]) =>
      details.evaluate((el, turnBetween) => {
        const seen: Watched = ((window as unknown as { __watched: Watched }).__watched = { frames: [], done: false });
        const [inside, next, header] = [document.getElementById('inside')!, document.getElementById('n')!, el.querySelector('summary')!];
        const list = (animations: Animation[]) => animations.map((a) => [(a as CSSTransition).transitionProperty, Number(a.effect!.getTiming().duration)] as [string, number]);
        el.addEventListener(
          'toggle',
          () => {
            seen.atToggle = {
              clock: list(el.getAnimations()),
              chevron: header.getAnimations({ subtree: true }).filter((a) => (a as CSSTransition).transitionProperty === 'rotate').map((a) => [String((a.effect as KeyframeEffect).pseudoElement), Number(a.effect!.getTiming().duration)] as [string, number]),
            };
          },
          { once: true },
        );
        let began = false;
        const frame = () => {
          const height = el.getBoundingClientRect().height;
          const running = el.getAnimations().length > 0;
          began ||= running;
          seen.frames.push({ height, inside: inside.getBoundingClientRect().height, after: next.getBoundingClientRect().top - el.getBoundingClientRect().top, open: (el as HTMLDetailsElement).open, drawn: inside.checkVisibility({ contentVisibilityAuto: true }) });
          if (turnBetween && !seen.turn && height > turnBetween[0] && height < turnBetween[1]) {
            const within = document.getElementById('within')!;
            const held = document.activeElement as HTMLElement | null;
            within.focus();
            seen.focusable = document.activeElement === within;
            held?.focus();
            const turn: { before: number; after?: number } = (seen.turn = { before: height });
            el.addEventListener('toggle', () => setTimeout(() => (turn.after = el.getBoundingClientRect().height)), { once: true });
            header.click();
          }
          if (began && !running) seen.done = true;
          else requestAnimationFrame(frame);
        };
        window.addEventListener('click', () => requestAnimationFrame(frame), { capture: true, once: true });
      }, turnBetween);
    const watched = async () => {
      await expect.poll(() => page.evaluate(() => (window as unknown as { __watched: Watched }).__watched.done), { message: 'the change was watched to its end', timeout: 15_000 }).toBe(true);
      return page.evaluate(() => (window as unknown as { __watched: Watched }).__watched);
    };
    await watch();
    await summary.click();
    const opening = await watched();
    // One motion of the item and one turn of the chevron, of the chosen duration — and toggle was emitted while the
    // motion runs, not at its end.
    expect(opening.atToggle).toEqual({ clock: [['--_acc-open', duration]], chevron: [['::after', duration]] });
    expect(await page.evaluate(() => (window as unknown as { __toggles: string[] }).__toggles.length)).toBe(1);
    // On the way: more than closed, less than open, in one reading.
    const mids = opening.frames.filter((frame) => frame.height > closed + 40 && frame.height < closed + 200);
    expect(mids.length, `a frame on the way, of ${opening.frames.map((frame) => Math.round(frame.height)).join(', ')}`).toBeGreaterThan(0);
    // The content is laid out once, at its size: only how much of it is seen changes; what follows moves with the edge.
    for (const mid of mids) {
      expect(mid.inside).toBe(200);
      near(mid.after, mid.height, 1);
    }
    await settled(page);
    const open = (await edges(details)).height;
    expect(open).toBeGreaterThanOrEqual(closed + 200);
    expect(await details.evaluate((el) => [el.getAttribute('data-tanrei-moving'), (el as HTMLElement).style.getPropertyValue('--_acc-size')])).toEqual([null, '']);
    // Closing: the content stays drawn while the item shrinks, and is out of the focus order from the first frame.
    // Half way back the header is activated again (by the page, in the frame that finds the item there): the motion
    // goes on from where it is, without a jump. The height is read in that frame and again in the task after the
    // item's `toggle`: two readings a round trip apart would differ by what the machine took to answer, not by a jump.
    await watch([closed, open - 40]);
    await summary.click();
    const closing = await watched();
    const shrinking = closing.frames.slice(0, closing.frames.findIndex((frame) => frame.height > closed && frame.height < open - 40) + 1);
    expect(shrinking.length, 'a frame of the closing').toBeGreaterThan(0);
    for (const frame of shrinking) expect([frame.inside, frame.open, frame.drawn], `closing, at ${frame.height}`).toEqual([200, false, true]);
    expect(closing.focusable, 'the closing content takes no focus').toBe(false);
    const { before, after } = closing.turn as { before: number; after: number };
    expect(Math.abs(after - before)).toBeLessThan(60);
    expect(after).toBeGreaterThan(closed);
    expect(after).toBeLessThan(open);
    await settled(page);
    near((await edges(details)).height, open);
    expect(await page.locator('#inside').evaluate((el) => (el as HTMLElement).inert)).toBe(false);
    await summary.click();
    // (Closing or closed, whichever the machine has reached: the content is passed over either way.)
    await summary.focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('within');
    expect(await page.evaluate(() => document.activeElement?.closest('details')?.id)).toBe('n');
    await settled(page);
    near((await edges(details)).height, closed);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await summary.click();
    const reduced = await moving();
    expect([reduced.clock, reduced.chevron]).toEqual([[], []]);
    near(reduced.height, open);
    await summary.click();
    near((await moving()).height, closed);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // The default system: a drawer's group and an item move over the same duration with the same curve.
    await page.evaluate(() => document.documentElement.removeAttribute('style'));
    expect(await resolveToken(page, T('motion-disclosure-duration'), 'duration')).toBe(await resolveToken(page, '--tanrei-comp-navigation-drawer-motion-disclosure-duration', 'duration'));
    const curve = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
    const resolved = async (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.transitionTimingFunction = `var(${n})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).transitionTimingFunction;
        probe.remove();
        return value;
      }, name);
    void curve;
    expect(await resolved(T('motion-disclosure-easing'))).toBe(await resolved('--tanrei-comp-navigation-drawer-motion-disclosure-easing'));
  });

  test('ACC-14: in a page 600 high, with the first item of an exclusive accordion open and the third header at 400 from the top, activating the third header leaves it at 400 while the first closes; an item that opens is not scrolled into view', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    const tall = raw(
      'tall',
      { exclusive: true },
      `<details id="t1" open><summary>One</summary><div style="block-size: 500px">tall</div></details><details id="t2"><summary>Two</summary>two</details><details id="t3"><summary>Three</summary><div style="block-size: 900px">three</div></details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [tall] });
    await page.addStyleTag({ content: 'main { padding-block: 1000px 2000px; }' });
    const third = page.locator('#t3 > summary');
    const top = async () => (await edges(third)).top;
    await page.evaluate((y) => window.scrollTo(0, y), (await top()) - 400);
    near(await top(), 400, 1);
    const scrolled = await page.evaluate(() => window.scrollY);
    await third.click();
    // While the first item closes, and after.
    for (let i = 0; i < 6; i++) {
      await frame(page);
      near(await top(), 400, 2);
    }
    await settled(page);
    await frame(page);
    near(await top(), 400, 1.5);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(scrolled - 400);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await page.locator('#t1').evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
    // The open content reaches below the view; nothing brought it in.
    expect((await edges(page.locator('#t3'))).bottom).toBeGreaterThan(600);
    // By the keyboard as well: the second header, with the third open below it, stays where it is.
    const second = page.locator('#t2 > summary');
    await second.focus();
    const at = (await edges(second)).top;
    await page.keyboard.press('ArrowRight');
    await settled(page);
    near((await edges(second)).top, at, 1.5);
  });

  test('ACC-15: an item that closes while keyboard focus is inside its content gives focus to its header; a disabled one leaves it to the browser; closing while focus is elsewhere moves nothing', async ({ page }) => {
    const own = raw(
      'focus',
      {},
      `<details id="f1" open><summary>One</summary><button id="in1">inside one</button></details><details id="f2" open><summary aria-disabled="true" tabindex="-1">Two</summary><button id="in2">inside two</button></details><details id="f3" open><summary>Three</summary>three</details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [own] });
    await page.locator('#in1').focus();
    await page.locator('#f1').evaluate((el: HTMLDetailsElement) => (el.open = false));
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('details')?.id + ':' + document.activeElement?.localName)).toBe('f1:summary');
    // Elsewhere: not moved.
    await page.locator('#f3').evaluate((el: HTMLDetailsElement) => (el.open = false));
    await frame(page);
    expect(await page.evaluate(() => document.activeElement?.closest('details')?.id)).toBe('f1');
    // Disabled: not given to its header.
    await page.locator('#in2').focus();
    await page.locator('#f2').evaluate((el: HTMLDetailsElement) => (el.open = false));
    await frame(page);
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#f2 > summary'))).toBe(false);
  });

  test('ACC-16: a link to a place inside a closed item opens it — and every closed item around it, a disabled one too — at once, with one toggle of true from each, and exclusive closes the other; the browser’s own search of the page opens an item where the engine reveals a details element for it', async ({ page, browserName }) => {
    const own = raw(
      'found',
      { exclusive: true },
      `<details id="g1" open><summary>One</summary>first</details><details id="g2"><summary aria-disabled="true" tabindex="-1">Two</summary><tanrei-accordion><details id="g2a"><summary>Inner</summary><p id="place">The quokka paragraph.</p></details></tanrei-accordion></details><details id="g3"><summary>Three</summary><p id="other">A wombat sentence.</p></details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [own] });
    await override(page, { [T('motion-disclosure-duration')]: '1000ms' });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<a id="jump" href="#place">Jump</a>'));
    await watchToggles(page);
    const open = () => page.evaluate(() => ['g1', 'g2', 'g2a', 'g3'].map((id) => (document.getElementById(id) as HTMLDetailsElement).open));
    await page.locator('#jump').click();
    await expect.poll(open).toEqual([false, true, true, false]);
    // At once: no motion of the items that the fragment opened.
    expect(await page.evaluate(() => ['g2', 'g2a'].map((id) => document.getElementById(id)!.getAnimations().length))).toEqual([0, 0]);
    expect((await edges(page.locator('#place'))).height).toBeGreaterThan(0);
    expect((await toggles(page)).sort()).toEqual(['g1:closed', 'g2:open', 'g2a:open']);
    // The browser's own search. No engine lets a test drive its find bar; `window.find()` is the one script door to it,
    // and only Firefox's goes through the search that reveals closed content. What each engine did is recorded.
    await page.locator('#g2').evaluate((el: HTMLDetailsElement) => (el.open = false));
    await settled(page);
    await toggles(page);
    const found = await page.evaluate(() => (window as unknown as { find?: (text: string) => boolean }).find?.('wombat'));
    await frame(page);
    const revealed = (await open())[3];
    test.info().annotations.push({ type: 'ACC-16', description: `${browserName}: window.find() ${found ? 'found' : 'did not find'} the word of a closed item and ${revealed ? 'opened' : 'did not open'} the item` });
    if (browserName === 'firefox') {
      expect(revealed).toBe(true);
      expect(await toggles(page)).toEqual(['g3:open']);
    }
    // What the accordion does for it is the same in every engine: the item is opened by the browser, and the others close.
    expect(await page.evaluate(() => 'onbeforematch' in window)).toBe(true);
  });

  test('ACC-36: a click on an open item’s content — its text, or the space under its last line — closes it with one toggle, as its header does, and exclusive closes nothing else; a link, a button, a field, a label, a tab index, a widget role and a pointer-cursor box keep their press, and a click the product cancels closes nothing; a text selection, a drag past the slop, a modifier key, another button, a second click and a script’s click() close nothing, a press moved within the slop does; a nested item’s content closes that item only and a nested header toggles its own; a disabled item stays open; the open item is one target — hovered, pressed and focused as a whole, with the pointer cursor wherever a press closes it and a control’s own cursor and no state of the item’s over the control — and the content gets no role and no tab index, and the keys on the header are as they were', async ({ page }) => {
    const own = raw(
      'content',
      { exclusive: true },
      `<details id="o" open><summary>Outer</summary><p id="text">Reading text, long enough that a word of it can be selected.</p>` +
        `<p><a id="link" href="#nowhere">a link</a> <button id="btn">a button</button> <input id="field" aria-label="A field"> <label id="lab"><input type="checkbox"> a label</label> ` +
        `<span id="tabbed" tabindex="-1">a tab index</span> <span id="roled" role="switch" aria-checked="false">a switch</span> <span id="pointer" style="cursor: pointer">a box of the product’s</span> <span id="cancelled">a span whose click the product cancels</span></p>` +
        `<tanrei-accordion><details id="i1" open><summary>Inner one</summary><p id="itext">Inner content.</p></details><details id="i2"><summary>Inner two</summary>y</details></tanrei-accordion>` +
        `<p id="last">The last line.</p></details><details id="n"><summary>Next</summary>Next content.</details>`,
    );
    const off = raw('content-disabled', {}, `<details id="d" open><summary aria-disabled="true" tabindex="-1">Disabled</summary><p id="dtext">Disabled content.</p></details>`);
    await mountFixtures(page, spec, { icons: true, fixtures: [own, off], system: 'acme', systemCss: await acmeSystemCss() });
    for (const id of ['link', 'cancelled']) await page.locator(`#${id}`).evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    const attributes = () => page.locator('#o').evaluate((el) => [...el.querySelectorAll(':scope > :not(summary), :scope > :not(summary) *')].map((node) => [...node.attributes].map((a) => a.name).filter((name) => name !== 'open').join(' ')).join('|'));
    const before = await attributes();
    await watchToggles(page);
    const isOpen = (id: string) => page.locator(`#${id}`).evaluate((el: HTMLDetailsElement) => el.open);
    /** Opens an item again and forgets its toggle. */
    const reopen = async (id: string) => {
      await page.locator(`#${id}`).evaluate((el: HTMLDetailsElement) => (el.open = true));
      await settled(page);
      await toggles(page);
    };
    /** Nothing closed: a task for the deferred decision, then the toggles. */
    const unchanged = async () => {
      await page.waitForTimeout(50);
      expect(await toggles(page)).toEqual([]);
      expect(await isOpen('o')).toBe(true);
    };

    // The text: closed, one toggle, nothing else opened by exclusive.
    await page.locator('#text').click();
    await expect.poll(() => isOpen('o')).toBe(false);
    expect(await toggles(page)).toEqual(['o:closed']);
    expect(await isOpen('n')).toBe(false);
    await reopen('o');
    // The space under the last line: the item's own box.
    const box = await edges(page.locator('#o'));
    const last = await edges(page.locator('#last'));
    expect(box.bottom - last.bottom).toBeGreaterThan(4);
    await page.mouse.click(box.left + 2, box.bottom - 2);
    await expect.poll(() => isOpen('o')).toBe(false);
    expect(await toggles(page)).toEqual(['o:closed']);
    await reopen('o');

    // What takes a press itself keeps it.
    for (const id of ['link', 'btn', 'field', 'lab', 'tabbed', 'roled', 'pointer', 'cancelled']) {
      await page.locator(`#${id}`).click();
      await unchanged();
    }
    await page.locator('#btn').blur();

    // A text selection that the release ends: selected while the button is held, with no move.
    const word = await edges(page.locator('#text'));
    await page.mouse.move(word.left + 20, word.top + word.height / 2);
    await page.mouse.down();
    await page.evaluate(() => getSelection()!.selectAllChildren(document.getElementById('text')!));
    await page.mouse.up();
    await unchanged();
    // A word selected by dragging over it (a press on selected text would drag that text instead).
    await page.evaluate(() => getSelection()!.removeAllRanges());
    await page.mouse.move(word.left + 2, word.top + word.height / 2);
    await page.mouse.down();
    await page.mouse.move(word.left + 80, word.top + word.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => getSelection()!.toString().length)).toBeGreaterThan(0);
    await unchanged();
    await page.evaluate(() => getSelection()!.removeAllRanges());
    // A drag past the slop where there is no text to select; one within the slop is a press.
    const y = box.bottom - 2;
    await page.mouse.move(box.left + 2, y);
    await page.mouse.down();
    await page.mouse.move(box.left + 22, y, { steps: 4 });
    await page.mouse.up();
    await unchanged();
    await page.mouse.move(box.left + 2, y);
    await page.mouse.down();
    await page.mouse.move(box.left + 6, y, { steps: 2 });
    await page.mouse.up();
    await expect.poll(() => isOpen('o')).toBe(false);
    expect(await toggles(page)).toEqual(['o:closed']);
    await reopen('o');

    // A modifier key, another button, a second click, a script's click().
    for (const modifier of ['Control', 'Meta', 'Shift', 'Alt'] as const) {
      await page.locator('#last').click({ modifiers: [modifier] });
      await unchanged();
      await page.evaluate(() => getSelection()!.removeAllRanges());
    }
    await page.locator('#last').click({ button: 'middle' });
    await unchanged();
    await page.locator('#last').click({ button: 'right' });
    await page.keyboard.press('Escape');
    await unchanged();
    await page.locator('#last').evaluate((el: HTMLElement) => el.click());
    await unchanged();
    await page.locator('#last').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at = { bubbles: true, cancelable: true, composed: true, clientX: r.left + 2, clientY: r.top + 2, button: 0 };
      el.dispatchEvent(new PointerEvent('pointerdown', { ...at, isPrimary: true, pointerType: 'mouse', pointerId: 1 }));
      el.dispatchEvent(new MouseEvent('click', { ...at, detail: 2 }));
    });
    await unchanged();

    // Nested: the innermost item's.
    await page.locator('#itext').click();
    await expect.poll(() => isOpen('i1')).toBe(false);
    expect(await toggles(page)).toEqual(['i1:closed']);
    expect(await isOpen('o')).toBe(true);
    await page.locator('#i1 > summary').click();
    expect(await toggles(page)).toEqual(['i1:open']);
    await page.locator('#i2 > summary').click();
    expect(await toggles(page)).toEqual(['i2:open']);
    expect(await isOpen('o')).toBe(true);
    await settled(page);

    // Disabled: stays open.
    await page.locator('#dtext').click();
    await page.waitForTimeout(50);
    expect(await toggles(page)).toEqual([]);
    expect(await isOpen('d')).toBe(true);

    // One target, as a whole card is: under a fine pointer the open item is hovered as a whole — header and content —
    // with the pointer cursor, wherever a press would close it; over what takes a press itself, that thing's own cursor
    // and no state of the item's; a press paints the pressed state on the whole item; keyboard focus rings the item.
    await page.addStyleTag({ content: `${TAG} > details { --_acc-item-time: 0s !important; } ${TAG} > details > summary { transition: none !important; }` });
    const o = page.locator('#o');
    const oHeader = page.locator('#o > summary');
    const states = {
      hovered: await resolveColor(page, T('plain-hovered-container-color')),
      focused: await resolveColor(page, T('plain-focused-container-color')),
      pressed: await resolveColor(page, T('plain-pressed-container-color')),
    };
    expect(new Set(Object.values(states)).size).toBe(3);
    await page.mouse.move(0, 0);
    expect(await css(o, 'background-color')).toMatch(CLEAR);
    expect(await css(page.locator('#text'), 'cursor')).toBe('auto');
    await page.locator('#text').hover();
    expect(await o.getAttribute('data-tanrei-hit')).toBe('');
    expect(await css(page.locator('#text'), 'cursor')).toBe('pointer');
    expect(await css(o, 'background-color')).toBe(states.hovered);
    expect(await css(oHeader, 'background-color')).toMatch(CLEAR);
    expect(await css(oHeader, 'color')).toBe(await resolveColor(page, T('plain-hovered-label-color')));
    await oHeader.hover();
    expect(await css(o, 'background-color')).toBe(states.hovered);
    // The space under the last line is the item's too.
    const whole = await edges(o);
    await page.mouse.move(whole.left + 2, whole.bottom - 2);
    expect(await o.getAttribute('data-tanrei-hit')).toBe('');
    expect(await css(o, 'background-color')).toBe(states.hovered);
    for (const [id, own] of [
      ['field', 'auto'],
      ['link', 'pointer'],
      ['btn', 'default'],
    ] as const) {
      await page.locator(`#${id}`).hover();
      expect(await o.getAttribute('data-tanrei-hit')).toBeNull();
      expect([own, 'auto', 'text', 'default']).toContain(await css(page.locator(`#${id}`), 'cursor'));
      if (id !== 'link') expect(await css(page.locator(`#${id}`), 'cursor')).not.toBe('pointer');
      expect(await css(o, 'background-color')).toMatch(CLEAR);
    }
    await page.locator('#itext').hover();
    expect(await o.getAttribute('data-tanrei-hit')).toBeNull();
    expect(await page.locator('#i1').getAttribute('data-tanrei-hit')).toBe('');
    // A press on the content: the pressed state at once on the whole item; past the slop it lets go and closes nothing.
    const line = await edges(page.locator('#last'));
    await page.mouse.move(line.left + 4, line.top + line.height / 2);
    await page.mouse.down();
    await expect(oHeader).toHaveAttribute('data-pressed', 'overlay');
    expect(await css(o, 'background-color')).toBe(states.pressed);
    await page.mouse.move(line.left + 4, line.top + line.height / 2 + 30, { steps: 4 });
    await page.mouse.up();
    await unchanged();
    await expect.poll(() => oHeader.getAttribute('data-pressed')).toBeNull();
    await page.evaluate(() => getSelection()!.removeAllRanges());
    // Keyboard focus: the focused container and the ring on the whole item, the header's own outline none.
    await page.mouse.move(0, 0);
    await page.locator('#link').focus();
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#o > summary'))).toBe(true);
    expect(await css(o, 'outline-style')).toBe('solid');
    expect(await css(oHeader, 'outline-style')).toBe('none');
    expect(await css(o, 'background-color')).toBe(states.focused);

    // No role, no tab index, no attribute at all in the content; the header is the one button and its keys are unchanged.
    expect(await attributes()).toBe(before);
    await page.locator('#o > summary').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link');
    await page.locator('#o > summary').focus();
    await page.keyboard.press('Enter');
    expect(await toggles(page)).toEqual(['o:closed']);
    await page.keyboard.press('Enter');
    expect(await toggles(page)).toEqual(['o:open']);
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual(['o:closed']);
    expect(await page.evaluate(() => document.activeElement === document.querySelector('#o > summary'))).toBe(true);
  });
});

test.describe('states', () => {
  test('ACC-17: under the acme system a hovered, a focused and a pressed header are drawn from their own tokens, pressed over focused over hovered, on the whole row; focus by a pointer is not the focused state; the edge and the lines do not change (an open item is drawn as a whole: ACC-36)', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined'), system: 'acme', systemCss: await acmeSystemCss() });
    const summary = header(page, 'outlined', 2);
    const fill = () => css(summary, 'background-color');
    const colors = { hovered: await resolveColor(page, T('outlined-hovered-container-color')), focused: await resolveColor(page, T('outlined-focused-container-color')), pressed: await resolveColor(page, T('outlined-pressed-container-color')) };
    expect(new Set(Object.values(colors)).size).toBe(3);
    const line = await css(item(page, 'outlined', 2), 'border-top-color', '::before');
    await page.addStyleTag({ content: `${TAG} > details > summary { transition: none !important; }` });
    // Hover over the far end of the row answers on the whole container.
    const row = await edges(summary);
    await page.mouse.move(row.right - 4, row.top + 4);
    expect(await fill()).toBe(colors.hovered);
    expect(await css(summary, 'color')).toBe(await resolveColor(page, T('outlined-hovered-label-color')));
    // Focus by the keyboard, with the pointer still over it: focused wins.
    await tabTo(page, summary);
    expect(await fill()).toBe(colors.focused);
    // Pressed wins over both.
    await page.mouse.down();
    expect(await fill()).toBe(colors.pressed);
    expect(await css(item(page, 'outlined', 2), 'border-top-color', '::before')).toBe(line);
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => summary.getAttribute('data-pressed')).toBeNull();
    // Focus gained by the pointer is not the focused state.
    await header(page, 'outlined', 3).click();
    await page.mouse.move(0, 0);
    await expect.poll(() => header(page, 'outlined', 3).getAttribute('data-pressed')).toBeNull();
    expect(await css(header(page, 'outlined', 3), 'background-color')).toMatch(CLEAR);
  });

  test('ACC-18: a header focused by the keyboard shows the focus ring inside its row while its item is closed, and around the whole item, inside its edge and following its corners, while it is open; without animation; focus by a pointer shows none', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined', 'plain') });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const ringColor = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    // Open (the first item): the ring is the whole item's — the outer stroke on the item's edge, the inner stroke's box
    // the item's inset by the outer stroke, its corners the set's at the top of the first item.
    const opened = item(page, 'outlined', 1);
    await tabTo(page, header(page, 'outlined', 1));
    expect(await px(opened, 'outline-width')).toBe(outer);
    expect(await css(opened, 'outline-style')).toBe('solid');
    expect(await css(opened, 'outline-color')).toBe(ringColor);
    expect(await px(opened, 'outline-offset')).toBe(-outer);
    expect(await css(header(page, 'outlined', 1), 'outline-style')).toBe('none');
    const box = await edges(opened);
    near(await px(header(page, 'outlined', 1), 'width', '::before'), box.width - outer * 2, 1);
    near(await px(header(page, 'outlined', 1), 'height', '::before'), box.height - outer * 2, 1);
    expect((await edges(header(page, 'outlined', 1))).height).toBeLessThan(box.height - outer * 2);
    near(await px(header(page, 'outlined', 1), 'border-top-left-radius', '::before'), Math.max(0, (await resolveToken(page, T('outline-shape'))) - outer), 1);
    expect(await px(header(page, 'outlined', 1), 'border-bottom-left-radius', '::before')).toBe(0);
    expect(await css(opened, 'transition-property')).not.toContain('outline');
    // Closed (the second item): the header's own ring, as before.
    const summary = header(page, 'outlined', 2);
    await tabTo(page, summary);
    expect(await px(summary, 'outline-width')).toBe(outer);
    expect(await css(summary, 'outline-style')).toBe('solid');
    expect(await css(summary, 'outline-color')).toBe(ringColor);
    // Inside: the stroke's outer edge is the row's edge.
    expect(await px(summary, 'outline-offset')).toBe(-outer);
    expect(await css(summary, 'transition-property')).not.toContain('outline');
    // It follows container.shape — and, in a corner of the outlined edge, that corner, so that the edge does not cut it.
    expect(await px(header(page, 'outlined', 2), 'border-top-left-radius')).toBeCloseTo(await resolveToken(page, T('container-shape')), 1);
    expect(await px(header(page, 'outlined', 1), 'border-top-left-radius')).toBeCloseTo(await resolveToken(page, T('outline-shape')), 1);
    expect(await px(header(page, 'outlined', 1), 'border-bottom-left-radius')).toBeCloseTo(await resolveToken(page, T('container-shape')), 1);
    expect(await px(header(page, 'outlined', 3), 'border-bottom-left-radius')).toBeCloseTo(await resolveToken(page, T('outline-shape')), 1);
    await header(page, 'plain', 2).click();
    expect(await css(header(page, 'plain', 2), 'outline-style')).toBe('none');
    expect(await css(item(page, 'plain', 2), 'outline-style')).toBe('none');
  });

  test('ACC-19: both densities hold the touch target in the default system; under a layer that sets the compact height to 32 a header is 44 high for a fine pointer and 48 for touch, and the whole row is the hit area', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('compact', 'plain') });
    expect((await edges(header(page, 'plain', 2))).height).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-touch'));
    expect((await edges(header(page, 'compact', 2))).height).toBeGreaterThanOrEqual(await resolveToken(page, '--tanrei-sys-target-touch'));
    await override(page, { [T('container-height-compact')]: '32px', [T('container-padding-block-compact')]: '4px' });
    expect(await resolveToken(page, '--tanrei-sys-target-pointer')).toBe(44);
    expect((await edges(header(page, 'compact', 2))).height).toBe(44);
    // The whole row: its first and its last pixels toggle it.
    await watchToggles(page);
    const row = await edges(header(page, 'compact', 2));
    await page.mouse.click(row.left + 1, row.top + 1);
    expect(await toggles(page)).toEqual(['2:open']);
    await page.mouse.click(row.right - 1, row.bottom - 1);
    expect(await toggles(page)).toEqual(['2:closed']);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await resolveToken(page, '--tanrei-sys-target-touch')).toBe(48);
    await expect.poll(async () => (await edges(header(page, 'compact', 2))).height).toBe(48);
  });

  test('ACC-20: a disabled header is drawn from the disabled tokens with no fill, is exposed as disabled, is not focusable and is not toggled by a press, a key or a script’s click; its item keeps its place and its open, its open content stays usable, and the product may still set open', async ({ page }) => {
    const own = raw(
      'off',
      {},
      `<details id="d1"><summary>One</summary>one</details><details id="d2"><summary aria-disabled="true">Two</summary>two</details><details id="d3" open><summary aria-disabled="true" tabindex="-1">Three</summary><button id="usable">Usable</button></details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('disabled', 'disabled-outlined'), own] });
    for (const [id, n, variant] of [
      ['disabled', 2, 'plain'],
      ['disabled', 3, 'plain'],
      ['disabled-outlined', 2, 'outlined'],
    ] as const) {
      const summary = header(page, id, n);
      await expect(summary).toHaveAttribute('aria-disabled', 'true');
      expect(await css(summary, 'color')).toBe(await resolveColor(page, T(`${variant}-disabled-label-color`)));
      expect(await css(summary, 'color', '::after')).toBe(await resolveColor(page, T(`${variant}-disabled-chevron-color`)));
      expect(await css(summary, 'background-color')).toMatch(CLEAR);
      expect(await css(summary, 'pointer-events')).toBe('none');
    }
    const glyph = header(page, 'disabled-outlined', 2).locator('> .tanrei-icon');
    expect(await css(glyph, 'color')).toBe(await resolveColor(page, T('outlined-disabled-icon-color')));
    expect(await css(header(page, 'disabled-outlined', 2).locator('> [data-trailing-text]'), 'color')).toBe(await resolveColor(page, T('outlined-disabled-trailing-text-color')));
    // The third item of the fixture is open and disabled: its content is shown.
    expect((await edges(item(page, 'disabled', 3))).height).toBeGreaterThan(56);
    // The element takes a disabled header out of the focus order where the markup did not.
    await expect(page.locator('#d2 > summary')).toHaveAttribute('tabindex', '-1');
    await watchToggles(page);
    await page.locator('#d2 > summary').click({ force: true });
    await page.locator('#d2 > summary').evaluate((el: HTMLElement) => el.click());
    await page.locator('#d2 > summary').evaluate((el: HTMLElement) => el.focus());
    for (const key of ['Enter', 'Space', 'ArrowRight']) await page.keyboard.press(key);
    expect(await toggles(page)).toEqual([]);
    expect(await page.locator('#d2').evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
    // Tab passes from the first header to the content of the third item.
    await page.locator('#d1 > summary').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('usable');
    // The product may still set its open; enabled again, it is focusable again.
    await page.locator('#d2').evaluate((el: HTMLDetailsElement) => (el.open = true));
    expect(await toggles(page)).toEqual(['d2:open']);
    await page.locator('#d2 > summary').evaluate((el) => el.removeAttribute('aria-disabled'));
    await frame(page);
    expect(await page.locator('#d2 > summary').getAttribute('tabindex')).toBeNull();
  });

  test('ACC-21: a press by pointer, Enter or Space shows the pressed state without delay and keeps it for at least sys.motion.duration.press-hold, even when the press ends sooner', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('press', {}, THREE)] });
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    const summary = header(page, 'press', 2);
    // Shown in the turn of the event that pressed, and there for press-hold from that event on (test/watched-press.ts):
    // the press begins with the event, not with the moment an observer is told of the attribute — that is a microtask
    // later, 1 to 2 ms in Firefox and more on a slow machine, and neither the delay nor the hold is counted from it.
    for (const [name, act] of [['click', () => summary.click()], ['Enter', () => summary.press('Enter')], ['Space', () => summary.press('Space')]] as const) {
      await watchPress(summary);
      await act();
      await expectPressShownAndHeld(page, hold, name);
    }
    expect(await css(summary, 'background-color')).not.toBe('');
  });

  test('ACC-22: a press is answered as sys.behavior.pressed-feedback names — overlay paints the pressed tokens on the whole row at once (the default), ripple grows the pressed layer from the point of contact and from the centre for a key (m3-like), dim applies the pressed opacity and no layer (cupertino), none draws nothing — and the ripple appears whole where motion is reduced', async ({ page }) => {
    const fixtures = some('outlined');
    const summaryOf = () => header(page, 'outlined', 2);
    const down = async () => {
      const row = await edges(summaryOf());
      await page.mouse.move(row.left + 30, row.top + 20);
      await page.mouse.down();
      return row;
    };
    const up = async () => {
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await expect.poll(() => summaryOf().getAttribute('data-pressed')).toBeNull();
    };
    // overlay
    await mountFixtures(page, spec, { icons: true, fixtures });
    await down();
    await expect(summaryOf()).toHaveAttribute('data-pressed', 'overlay');
    expect(await css(summaryOf(), 'background-color')).toBe(await resolveColor(page, T('outlined-pressed-container-color')));
    await expect(summaryOf().locator('.ripple')).toHaveCount(0);
    await up();
    // ripple
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'm3-like' });
    const row = await down();
    await expect(summaryOf()).toHaveAttribute('data-pressed', 'ripple');
    const ripple = summaryOf().locator('> .ripple');
    await expect(ripple).toHaveCount(1);
    expect(await ripple.evaluate((el) => [(el as HTMLElement).style.getPropertyValue('--_x'), (el as HTMLElement).style.getPropertyValue('--_y')].map((v) => Math.round(Number.parseFloat(v))))).toEqual([30, 20]);
    expect(await css(ripple, 'background-color')).toBe(await resolveColor(page, T('outlined-pressed-container-color')));
    expect(await css(ripple, 'position')).toBe('absolute');
    expect(await css(ripple, 'animation-duration')).toBe(`${(await resolveToken(page, T('motion-feedback-duration'), 'duration')) / 1000}s`);
    // The row's own fill stays with the state under the press; the ripple is not a part of the header's row.
    expect(await css(summaryOf(), 'background-color')).not.toBe(await resolveColor(page, T('outlined-pressed-container-color')));
    near((await edges(summaryOf())).height, row.height);
    await up();
    await expect(ripple).toHaveCount(0);
    await summaryOf().focus();
    await page.keyboard.down('Enter');
    const fromKey = await summaryOf().locator('> .ripple').evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x')));
    near(fromKey, row.width / 2, 1);
    await page.keyboard.up('Enter');
    await expect.poll(() => summaryOf().getAttribute('data-pressed')).toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await down();
    expect(await css(summaryOf().locator('> .ripple'), 'animation-name')).toBe('none');
    await up();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // An open item is one target (ACC-36): a press on its content grows the ripple from the point of contact over the
    // whole item, under its header and its content.
    const openItem = item(page, 'outlined', 1);
    const content = await contentBox(openItem);
    await page.mouse.move(content.left + 10, content.top + 10);
    await page.mouse.down();
    await expect(header(page, 'outlined', 1)).toHaveAttribute('data-pressed', 'ripple');
    const itemRipple = header(page, 'outlined', 1).locator('> .ripple');
    const [rippleBox, itemBox] = [await edges(itemRipple), await edges(openItem)];
    for (const side of ['left', 'top', 'width', 'height'] as const) near(rippleBox[side], itemBox[side], 1);
    // (The point of contact is the pointer's, which an engine may give in whole pixels: within one.)
    near(await itemRipple.evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_y'))), content.top + 10 - itemBox.top, 1);
    await page.mouse.move(content.left + 10, content.top + 60, { steps: 4 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => header(page, 'outlined', 1).getAttribute('data-pressed')).toBeNull();
    // dim
    await mountFixtures(page, spec, { icons: true, fixtures, system: 'cupertino' });
    await page.addStyleTag({ content: `${TAG} > details > summary { transition: none !important; }` });
    const rest = await css(summaryOf(), 'background-color');
    await down();
    await expect(summaryOf()).toHaveAttribute('data-pressed', 'dim');
    expect(Number(await css(summaryOf(), 'opacity'))).toBeCloseTo(Number(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('pressed-opacity'))), 2);
    await expect(summaryOf().locator('.ripple')).toHaveCount(0);
    void rest;
    await up();
    // none
    await mountFixtures(page, spec, { icons: true, fixtures });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await page.addStyleTag({ content: `${TAG} > details > summary { transition: none !important; } ${TAG} > details { --_acc-item-time: 0s !important; }` });
    const before = await summaryOf().evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).opacity, getComputedStyle(el).color]);
    await page.mouse.move(0, 0);
    await tabTo(page, summaryOf());
    const focused = await summaryOf().evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).opacity, getComputedStyle(el).color]);
    await page.keyboard.down('Enter');
    await expect(summaryOf()).toHaveAttribute('data-pressed', 'none');
    // Enter opened the item, whose state is now drawn on the whole item (ACC-36): the focused container under it all,
    // and the header's parts and opacity still the focused ones — nothing of the press.
    expect(await summaryOf().evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).color])).toEqual(focused.slice(1));
    expect(await css(item(page, 'outlined', 2), 'background-color')).toBe(focused[0]);
    await page.keyboard.up('Enter');
    void before;
  });

  test('ACC-23: the corners of a header and of the outlined look are eased by sys.shape.corner-smoothing (cupertino is continuous) where the browser can, and keyboard focus is drawn as sys.behavior.focus-style names — a ring, or a glow under the acme system', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined', 'outlined-gap'), system: 'cupertino' });
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(1)'));
    const shapes = await page.evaluate(() => [document.querySelector('[data-fixture="outlined"] details')!, document.querySelector('[data-fixture="outlined-gap"] details')!].map((el) => [getComputedStyle(el).getPropertyValue('corner-shape'), getComputedStyle(el, '::after').getPropertyValue('corner-shape')]));
    for (const [own, edge] of shapes) {
      if (smooth) {
        expect(own).toContain('superellipse');
        expect(edge).toBe(own);
      } else expect(own).toBe('');
    }
    // The radius is the token's, scaled with the smoothing where it is drawn.
    const radius = await resolveToken(page, T('outline-shape'));
    const drawn = await px(item(page, 'outlined', 1), 'border-top-left-radius');
    if (smooth) expect(drawn).toBeGreaterThan(radius);
    else expect(drawn).toBeCloseTo(radius, 1);
    // ring (the default) and glow (acme), on a closed item's header and around an open item (the first).
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined') });
    await tabTo(page, header(page, 'outlined', 1));
    expect(await css(item(page, 'outlined', 1), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await css(header(page, 'outlined', 1), 'box-shadow', '::before')).toBe('none');
    await tabTo(page, header(page, 'outlined', 2));
    expect(await css(header(page, 'outlined', 2), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined'), system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, header(page, 'outlined', 1));
    expect(await css(item(page, 'outlined', 1), 'outline-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await css(header(page, 'outlined', 1), 'box-shadow', '::before')).not.toBe('none');
    // The glow is inside the item: its box is inset from the item's edge, and reaches below the header.
    expect(await px(header(page, 'outlined', 1), 'top', '::before')).toBeGreaterThan(0);
    expect(await px(header(page, 'outlined', 1), 'height', '::before')).toBeGreaterThan((await edges(header(page, 'outlined', 1))).height);
    await tabTo(page, header(page, 'outlined', 2));
    expect(await css(header(page, 'outlined', 2), 'outline-color')).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(await px(header(page, 'outlined', 2), 'top', '::before')).toBeGreaterThan(0);
  });
});

test.describe('accessibility', () => {
  test('ACC-24: each header is the summary of a details element — one button with the expanded state — named by its label, described by its supporting and then its trailing text, its icon and chevron hidden; the content follows its header and is no region; the accordion has no role and no name; a header without a name is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('plain', 'supporting-text', 'all-parts'), raw('nameless', {}, '<details id="nameless"><summary></summary>content</details>')] });
    const labels = fixture('plain').items!.map((i) => String(i.props.label));
    for (let n = 1; n <= 3; n++) {
      const summary = header(page, 'plain', n);
      await expect(summary).toHaveAccessibleName(labels[n - 1]);
      expect(await item(page, 'plain', n).evaluate((el: HTMLDetailsElement) => el.open)).toBe(n === 1);
      expect(await summary.getAttribute('role')).toBeNull();
      expect(await summary.evaluate((el) => el.tabIndex)).toBe(0);
    }
    // The supporting text, then the trailing text, are the description — and not part of the name.
    await expect(header(page, 'supporting-text', 1)).toHaveAccessibleName('Colors');
    await expect(header(page, 'supporting-text', 1)).toHaveAccessibleDescription('Roles, palettes and the six schemes');
    await expect(header(page, 'all-parts', 1)).toHaveAccessibleName('Colors');
    await expect(header(page, 'all-parts', 1)).toHaveAccessibleDescription('Roles, palettes and the six schemes 48 roles');
    await expect(header(page, 'all-parts', 1).locator('> .tanrei-icon')).toHaveAttribute('aria-hidden', 'true');
    // The chevron has no text for assistive technology (where the browser reads the alternative of `content`).
    expect(await css(header(page, 'plain', 1), 'content', '::after')).toMatch(/expand_more/);
    // No region, no landmark, no role or name of the accordion's own.
    expect(await page.locator(`${TAG} [role="region"], ${TAG}[role], ${TAG}[aria-label], ${TAG} section[aria-label]`).count()).toBe(0);
    expect(await item(page, 'plain', 1).evaluate((el) => el.firstElementChild?.localName)).toBe('summary');
    expect(seen.filter((text) => text.includes('ACC-24') && text.includes('no accessible name'))).toHaveLength(1);
    await expect(page.locator('#nameless > summary')).toBeVisible();
    // What the engine itself exposes can be read in Chromium alone (the DevTools protocol).
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const exposed = nodes.filter((node) => node.role?.value === 'DisclosureTriangle').map((node) => ({ name: node.name?.value, expanded: node.properties?.find((p) => p.name === 'expanded')?.value.value, description: node.description?.value ?? '' }));
    expect(exposed.slice(0, 3)).toEqual([
      { name: labels[0], expanded: true, description: '' },
      { name: labels[1], expanded: false, description: '' },
      { name: labels[2], expanded: false, description: '' },
    ]);
    expect(exposed.find((node) => node.description === 'Roles, palettes and the six schemes 48 roles')?.name).toBe('Colors');
    expect(nodes.filter((node) => node.role?.value === 'region')).toHaveLength(0);
  });

  test('ACC-24: what the engine exposes for a heading inside a summary is recorded', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('heading', {}, '<details id="h"><summary><h3>Billing</h3></summary>content</details>')] });
    // In every engine the heading is an element of the document with its level, and the summary is named by its text.
    await expect(page.getByRole('heading', { level: 3, name: 'Billing' })).toHaveCount(1);
    await expect(page.locator('#h > summary')).toHaveAccessibleName('Billing');
    test.skip(browserName !== 'chromium', 'the engine’s own accessibility tree is read over the DevTools protocol; Playwright 1.63 has no door to Firefox’s or WebKit’s');
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const button = nodes.find((node) => node.role?.value === 'DisclosureTriangle')!;
    const heading = nodes.find((node) => node.role?.value === 'heading');
    test.info().annotations.push({
      type: 'heading in the summary',
      description: `chromium: the summary is "${button.role?.value}" named "${button.name?.value}"; a heading node ${heading ? `is exposed inside it (level ${heading.properties?.find((p) => p.name === 'level')?.value.value}, ignored: ${heading.ignored})` : 'is not exposed'}`,
    });
    expect(button.name?.value).toBe('Billing');
    // Chromium keeps the heading in its tree, as a child of the button, with its level.
    expect(heading?.ignored).toBe(false);
    expect(heading?.properties?.find((p) => p.name === 'level')?.value.value).toBe(3);
    expect(button.childIds).toContain(heading!.nodeId);
  });

  test('ACC-25: opening and closing announce nothing — no live region, no alert, no status — and move neither keyboard focus nor anything else into the content', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('quiet', {}, `<details id="q"><summary>One</summary><button>inside</button></details>`)] });
    const summary = page.locator('#q > summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await settled(page);
    expect(await summary.evaluate((el) => el === document.activeElement)).toBe(true);
    expect(await page.locator('[aria-live], [role="status"], [role="alert"], [role="log"], output').count()).toBe(0);
    await page.keyboard.press('Enter');
    await settled(page);
    expect(await summary.evaluate((el) => el === document.activeElement)).toBe(true);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });

  test('ACC-26: at 200 % text in a stage 320 wide the labels and the supporting text grow and wrap whole, the headers grow, the icon’s and the chevron’s boxes keep their size on the label’s first line, only a trailing text is cut, nothing overlaps or scrolls sideways, and raised text spacing loses nothing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec, { icons: true, fixtures: some('long-label', 'all-parts') });
    const normal = await px(header(page, 'all-parts', 1), 'font-size');
    // (The space under an open item's content is a token in rem: it would move to its new value over the disclosure motion.)
    await page.addStyleTag({ content: `html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } ${TAG} > details::details-content { transition: none !important; }` });
    const whole = async (when: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${when}: no sideways scroll`).toBe(true);
      for (const [id, count] of [
        ['long-label', 2],
        ['all-parts', 3],
      ] as const) {
        for (let n = 1; n <= count; n++) {
          const summary = header(page, id, n);
          const [row, label, chevron] = [await edges(summary), await labelBox(summary), await chevronBox(summary)];
          // Every word of the label is inside the row, before the chevron (or the trailing text).
          expect(label.left, `${when} ${id} ${n}`).toBeGreaterThanOrEqual(row.left);
          expect(label.right).toBeLessThanOrEqual(chevron.left + 0.6);
          expect(label.top).toBeGreaterThanOrEqual(row.top);
          expect(label.bottom).toBeLessThanOrEqual(row.bottom + 0.6);
          expect(await summary.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          // On the label's first line: the middle of the chevron's box is the middle of that line's box.
          near((chevron.top + chevron.bottom) / 2, row.top + (await px(summary, 'padding-top')) + (await px(summary, 'line-height')) / 2, 1);
          const supporting = summary.locator('> [data-supporting-text]');
          if (await supporting.count()) {
            const under = await edges(supporting);
            expect(under.top).toBeGreaterThanOrEqual(label.bottom - 0.6);
            expect(under.bottom).toBeLessThanOrEqual(row.bottom + 0.6);
            expect(await supporting.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          }
        }
      }
    };
    await whole('200 %');
    expect(await px(header(page, 'all-parts', 1), 'font-size')).toBe(normal * 2);
    expect((await labelBox(header(page, 'long-label', 1))).lines).toBeGreaterThan(3);
    // The glyph boxes keep their token sizes, and the paddings stay.
    expect(await px(header(page, 'all-parts', 1).locator('> .tanrei-icon'), 'width')).toBe(await resolveToken(page, T('icon-size-regular')));
    expect(await px(header(page, 'all-parts', 1), 'width', '::after')).toBe(await resolveToken(page, T('chevron-size-regular')));
    expect(await px(header(page, 'all-parts', 1), 'padding-left')).toBe(await resolveToken(page, T('container-padding-inline-regular')));
    expect(await css(header(page, 'all-parts', 1), 'height')).not.toBe('56px');
    // WCAG 1.4.12: raised text spacing.
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
    await whole('text spacing');
  });

  test('ACC-27: with forced colors the outlined edge and the lines are drawn in the text color, a disabled header in the disabled text’s color, a focused header shows a ring in the highlight, and open is still told by the chevron’s turn', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: some('outlined', 'disabled', 'outlined-gap') });
    const system = (keyword: string) =>
      page.evaluate((k) => {
        const probe = document.createElement('div');
        probe.style.cssText = `color: ${k}; forced-color-adjust: none`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, keyword);
    const [text, gray, highlight] = [await system('CanvasText'), await system('GrayText'), await system('Highlight')];
    expect(await css(item(page, 'outlined', 1), 'border-top-color', '::after')).toBe(text);
    expect(await px(item(page, 'outlined', 1), 'border-top-width', '::after')).toBeGreaterThan(0);
    for (const n of [2, 3]) expect(await css(item(page, 'outlined', n), 'border-top-color', '::before')).toBe(text);
    expect(await css(item(page, 'outlined-gap', 2), 'border-top-color', '::after')).toBe(text);
    expect(await css(header(page, 'outlined', 1), 'color')).toBe(text);
    expect(await css(header(page, 'outlined', 1), 'color', '::after')).toBe(text);
    for (const n of [2, 3]) {
      expect(await css(header(page, 'disabled', n), 'color')).toBe(gray);
      expect(await css(header(page, 'disabled', n), 'color', '::after')).toBe(gray);
    }
    await tabTo(page, header(page, 'outlined', 2));
    expect(await css(header(page, 'outlined', 2), 'outline-color')).toBe(highlight);
    expect(await px(header(page, 'outlined', 2), 'outline-offset')).toBeLessThan(0);
    await settled(page);
    expect(await css(header(page, 'outlined', 1), 'rotate', '::after')).toBe('180deg');
    expect(await css(header(page, 'outlined', 2), 'rotate', '::after')).toBe('none');
  });
});

test.describe('right to left', () => {
  test('ACC-28: in a right-to-left layout the header’s order is mirrored — the icon at the right, the trailing text and the chevron at the left — the content is inset by the same paddings, the chevron’s half turn is the same, Left opens and Right closes, and a ripple still grows from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain-rtl', 'outlined-gap-rtl', 'icon-rtl'), system: 'm3-like' });
    await settled(page);
    const summary = header(page, 'icon-rtl', 2);
    const [row, icon, label, chevron] = [await edges(summary), await edges(summary.locator('> .tanrei-icon')), await labelBox(summary), await chevronBox(summary)];
    const inset = await resolveToken(page, T('container-padding-inline-regular'));
    near(icon.right, row.right - inset);
    expect(label.right).toBeLessThanOrEqual(icon.left);
    near(chevron.left, row.left + inset);
    expect(await px(summary, 'margin-left', '::after')).toBe(0);
    const trailing = await edges(header(page, 'outlined-gap-rtl', 1).locator('> [data-trailing-text]'));
    near(trailing.left, (await chevronBox(header(page, 'outlined-gap-rtl', 1))).right + (await resolveToken(page, T('container-gap'))));
    // The content, inset alike.
    const content = await contentBox(item(page, 'plain-rtl', 1));
    const first = await edges(header(page, 'plain-rtl', 1));
    near(content.right, first.right - inset);
    expect(content.left).toBeGreaterThanOrEqual(first.left + inset - 0.6);
    // The same half turn, not mirrored.
    expect(await css(header(page, 'plain-rtl', 1), 'rotate', '::after')).toBe('180deg');
    expect(await css(header(page, 'plain-rtl', 1), 'transform', '::after')).toBe('none');
    // The keys follow the direction.
    await watchToggles(page);
    await header(page, 'plain-rtl', 2).focus();
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual(['2:open']);
    await page.keyboard.press('ArrowRight');
    expect(await toggles(page)).toEqual(['2:closed']);
    await settled(page);
    // The ripple, from where the pointer is.
    const at = await edges(header(page, 'plain-rtl', 3));
    await page.mouse.move(at.right - 40, at.top + 10);
    await page.mouse.down();
    const origin = await header(page, 'plain-rtl', 3).locator('> .ripple').evaluate((el) => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--_x')));
    near(origin, at.width - 40, 1);
    await page.mouse.up();
  });

  test('ACC-29: the direction comes from the nearest ancestor that sets one, not from the root, and a change of it is drawn at once, with no motion, keeping every item’s open and the focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('icon', 'plain-rtl') });
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('');
    // The fixture's direction is its stage's.
    expect(await css(host(page, 'plain-rtl'), 'direction')).toBe('rtl');
    const summary = header(page, 'icon', 1);
    const before = { icon: await edges(summary.locator('> .tanrei-icon')), chevron: await chevronBox(summary), row: await edges(summary) };
    near(before.icon.left, before.row.left + 16);
    await settled(page);
    await summary.focus();
    await stage(page, 'icon').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const after = { icon: await edges(summary.locator('> .tanrei-icon')), chevron: await chevronBox(summary), row: await edges(summary) };
    near(after.icon.right, after.row.right - 16);
    near(after.chevron.left, after.row.left + 16);
    expect(await motions(page)).toBe(0);
    expect(await item(page, 'icon', 1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    expect(await summary.evaluate((el) => el === document.activeElement)).toBe(true);
    // The keys read the direction at the moment of the key.
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => item(page, 'icon', 1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
  });

  test('ACC-30: in a right-to-left layout an icon is mirrored exactly when the icon set marks its name — arrow_forward is, settings is not — in its own box, and the chevron never is', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('icon-rtl', 'icon') });
    const glyph = (n: number) => header(page, 'icon-rtl', n).locator('> .tanrei-icon');
    await expect(glyph(1)).toHaveText('arrow_forward');
    await expect.poll(() => glyph(1).evaluate((el) => el.hasAttribute('data-tanrei-mirrored'))).toBe(true);
    expect(await css(glyph(1), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await glyph(2).evaluate((el) => el.hasAttribute('data-tanrei-mirrored'))).toBe(false);
    expect(await css(glyph(2), 'transform')).toBe('none');
    // Its place, size and color are those of an unmirrored one.
    expect((await edges(glyph(1))).width).toBe((await edges(glyph(2))).width);
    expect(await css(glyph(1), 'color')).toBe(await css(glyph(2), 'color'));
    for (const n of [1, 2]) expect(await css(header(page, 'icon-rtl', n), 'transform', '::after')).toBe('none');
    // The product's word for one use.
    await glyph(1).evaluate((el) => el.setAttribute('data-mirror', 'never'));
    expect(await css(glyph(1), 'transform')).toBe('none');
  });

  test('ACC-31: a left-to-right label in a right-to-left header begins at the right edge of the text column and reads left to right, with the chevron at the left; the supporting and the trailing text are each text of their own direction, placed by the layout’s, and a trailing text is cut at the end of its own', async ({ page }) => {
    const own = raw(
      'mixed',
      {},
      `<details><summary><span>Tanrei 0.1.0!</span><span data-supporting-text>Released (stable).</span><span data-trailing-text>A long left-to-right value that cannot fit in half of the row at all</span></summary>x</details>`,
      { direction: 'rtl' },
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('ltr-label-rtl'), own] });
    const summary = header(page, 'ltr-label-rtl', 1);
    const [row, label, chevron] = [await edges(summary), await labelBox(summary), await chevronBox(summary)];
    near(label.right, row.right - 16);
    near(chevron.left, row.left + 16);
    // It reads left to right: the "T" is at the left end of the label's own box.
    const order = await summary.evaluate((el) => {
      const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('Tanrei'))!;
      const at = (i: number) => {
        const range = document.createRange();
        const start = text.textContent!.indexOf('Tanrei') + i;
        range.setStart(text, start);
        range.setEnd(text, start + 1);
        return range.getBoundingClientRect().left;
      };
      return at(0) < at(5);
    });
    expect(order).toBe(true);
    // The parts of the test's own header: each of its own direction, isolated; placed by the layout's.
    const mixed = header(page, 'mixed', 1);
    for (const part of [mixed.locator('> span:not([data-supporting-text], [data-trailing-text])'), mixed.locator('> [data-supporting-text]')]) {
      expect(await css(part, 'unicode-bidi')).toMatch(/plaintext|isolate/);
      // The closing mark stays at the right of its left-to-right sentence.
      const marks = await part.evaluate((el) => {
        const text = el.firstChild!;
        const at = (i: number) => {
          const range = document.createRange();
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          return range.getBoundingClientRect().left;
        };
        return at(text.textContent!.length - 1) > at(0);
      });
      expect(marks).toBe(true);
      near((await edges(part)).right, (await edges(mixed)).right - 16);
    }
    const trailing = mixed.locator('> [data-trailing-text]');
    await expect(trailing).toHaveAttribute('dir', 'auto');
    expect(await css(trailing, 'direction')).toBe('ltr');
    expect(await trailing.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // Cut at its own end: its first letter is drawn, at the left of its box.
    const firstLetter = await trailing.evaluate((el) => {
      const range = document.createRange();
      range.setStart(el.firstChild!, 0);
      range.setEnd(el.firstChild!, 1);
      return range.getBoundingClientRect().left - el.getBoundingClientRect().left;
    });
    near(firstLetter, 0, 1);
  });
});

test.describe('nested, missing, unknown, empty', () => {
  test('ACC-32: an accordion in an item’s content is laid out inside the item’s inset with its own variant, density and exclusive; its headers answer the keys for its own items only; closing and opening the outer item leaves the inner items as their open said; more than three levels are still drawn, and reported', async ({ page }) => {
    const seen = warnings(page);
    const level = (n: number, inner: string) => `<tanrei-accordion id="level${n}"><details open><summary>Level ${n}</summary>${inner}</details></tanrei-accordion>`;
    const own = raw(
      'nest',
      { variant: 'outlined' },
      `<details id="o1" open><summary>Outer</summary><tanrei-accordion id="inner" density="compact" exclusive><details id="i1" open><summary>Inner one</summary>one</details><details id="i2"><summary>Inner two</summary>two</details></tanrei-accordion></details><details id="o2"><summary>Deep</summary>${level(2, level(3, level(4, 'deepest')))}</details>`,
    );
    await mountFixtures(page, spec, { icons: true, fixtures: [own] });
    const [outer, inner] = [await edges(page.locator('#o1 > summary')), await edges(page.locator('#inner'))];
    near(inner.left, outer.left + 16);
    near(inner.right, outer.right - 16);
    // Its own density and look.
    expect((await edges(page.locator('#i2 > summary'))).height).toBe(48);
    expect(await css(page.locator('#i1'), 'content', '::after')).toBe('none');
    expect(await css(page.locator('#i1 > summary'), 'color')).toBe(await resolveColor(page, T('plain-label-color')));
    // The keys: an inner header opens its own item and nothing of the outer accordion.
    await watchToggles(page);
    await page.locator('#i2 > summary').focus();
    await page.keyboard.press('ArrowRight');
    expect((await toggles(page)).sort()).toEqual(['i1:closed', 'i2:open']);
    expect(await page.locator('#o1').evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    await page.keyboard.press('ArrowLeft');
    expect(await toggles(page)).toEqual(['i2:closed']);
    expect(await page.locator('#o1').evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    // The outer item closed and opened again: the inner items are as they were.
    await page.locator('#i1 > summary').click();
    await settled(page);
    await page.locator('#o1 > summary').click();
    await settled(page);
    await page.locator('#o1 > summary').click();
    await settled(page);
    expect(await page.evaluate(() => ['i1', 'i2'].map((id) => (document.getElementById(id) as HTMLDetailsElement).open))).toEqual([true, false]);
    // Four levels deep: drawn, and said.
    await page.locator('#o2 > summary').click();
    await expect(page.locator('#level4 summary')).toBeVisible();
    expect(seen.filter((text) => text.includes('ACC-32'))).toHaveLength(1);
  });

  test('ACC-33: while the icon set cannot draw a glyph the chevron and an icon draw nothing — never the glyph’s name — and keep their boxes, the header opens and closes all the same, and the glyphs are drawn once the font arrives', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('icon') });
    const summary = header(page, 'icon', 2);
    expect(await css(summary, 'visibility', '::after')).toBe('visible');
    const family = await withoutIconFont(page);
    await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
    await expect(host(page, 'icon')).toHaveAttribute('data-glyphs', 'pending');
    expect(await css(summary, 'visibility', '::after')).toBe('hidden');
    expect(await css(summary.locator('> .tanrei-icon'), 'visibility')).toBe('hidden');
    // The boxes are kept.
    expect(await px(summary, 'width', '::after')).toBe(await resolveToken(page, T('chevron-size-regular')));
    expect((await edges(summary.locator('> .tanrei-icon'))).width).toBe(await resolveToken(page, T('icon-size-regular')));
    expect((await edges(summary)).height).toBe(56);
    await summary.click();
    expect(await item(page, 'icon', 2).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    await iconFaceArrives(page, family);
    await expect(host(page, 'icon')).not.toHaveAttribute('data-glyphs');
    expect(await css(summary, 'visibility', '::after')).toBe('visible');
  });

  test('ACC-34: a variant or a density the active design system does not have is drawn as the default and reported; one a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('plain'), raw('unknown', { variant: 'floating', density: 'roomy' }, THREE), raw('added', { density: 'dense' }, THREE.replaceAll('id="', 'id="x'))] });
    await override(page, { [T('container-height-dense')]: '64px', [T('container-padding-inline-dense')]: '20px' });
    await host(page, 'added').evaluate((el) => ((el as unknown as { density: string }).density = 'regular'));
    await frame(page);
    await host(page, 'added').evaluate((el) => ((el as unknown as { density: string }).density = 'dense'));
    await frame(page);
    const reference = await header(page, 'plain', 2).evaluate((el) => [getComputedStyle(el).height, getComputedStyle(el).font, getComputedStyle(el).color, getComputedStyle(el).paddingLeft]);
    expect(await header(page, 'unknown', 2).evaluate((el) => [getComputedStyle(el).height, getComputedStyle(el).font, getComputedStyle(el).color, getComputedStyle(el).paddingLeft])).toEqual(reference);
    expect(await css(item(page, 'unknown', 1), 'content', '::after')).toBe('none');
    expect(seen.filter((text) => text.includes('ACC-34') && text.includes('variant "floating"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('ACC-34') && text.includes('density "roomy"'))).toHaveLength(1);
    // The added density: its own height and padding, the default's text style where it names none.
    expect((await edges(header(page, 'added', 2))).height).toBe(64);
    expect(await px(header(page, 'added', 2), 'padding-left')).toBe(20);
    expect(await css(header(page, 'added', 2), 'font')).toBe(reference[1]);
  });

  test('ACC-35: an accordion with no items draws nothing and takes no space; an item with no content still renders its header, which opens onto the space under the content alone, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [raw('none', { variant: 'outlined' }, ''), raw('hollow', {}, '<details id="hollow"><summary>Nothing inside</summary></details>')] });
    expect(await css(host(page, 'none'), 'display')).toBe('none');
    expect((await edges(stage(page, 'none'))).height).toBe(32);
    const hollow = page.locator('#hollow');
    expect((await edges(hollow.locator('> summary'))).height).toBe(56);
    await hollow.locator('> summary').click();
    await settled(page);
    near((await edges(hollow)).height, 56 + (await resolveToken(page, T('content-padding-block-end-regular'))));
    expect(seen.filter((text) => text.includes('ACC-35'))).toHaveLength(1);
    // Items given later are drawn.
    await host(page, 'none').evaluate((el) => (el.innerHTML = '<details><summary>Now</summary>here</details>'));
    expect(await css(host(page, 'none'), 'display')).toBe('grid');
  });
});

test.describe('before the element is defined, and without script', () => {
  test('ACC-1, ACC-7, ACC-21: the stylesheet alone draws the whole look and every state — an item opens, closes and is focusable, hover and focus are drawn, a press is the overlay held for press-hold — and nothing moves when the element is defined', async ({ page }) => {
    const fixtures = some('plain', 'outlined-gap', 'all-parts-compact', 'disabled', 'icon-rtl');
    const document = await fixturesDocument(spec, { icons: true, fixtures });
    const bundle = document.slice(document.lastIndexOf('<script type="module">'), document.lastIndexOf('</script>') + '</script>'.length);
    await page.setContent(document.replace(bundle, ''));
    await page.evaluate(async () => {
      await document.fonts.ready;
      const family = getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim();
      await document.fonts.load(`24px ${family}`, 'expand_more');
    });
    expect(await page.evaluate(() => !!customElements.get('tanrei-accordion'))).toBe(false);
    const geometry = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('tanrei-accordion, details, summary, summary > *')].map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return [el.localName, r.left, r.top, r.width, r.height, s.color, s.font, getComputedStyle(el, '::after').content, getComputedStyle(el, '::before').content].join('|');
        }),
      );
    // The look, with no script at all.
    expect((await edges(header(page, 'plain', 2))).height).toBe(56);
    expect(await css(header(page, 'plain', 1), 'content', '::after')).toContain('expand_more');
    expect(await css(header(page, 'plain', 1), 'rotate', '::after')).toBe('180deg');
    expect(await css(item(page, 'outlined-gap', 1), 'content', '::after')).not.toBe('none');
    expect(await css(header(page, 'disabled', 2), 'color')).toBe(await resolveColor(page, T('plain-disabled-label-color')));
    // It works: a click opens, the keyboard reaches it, hover and focus are drawn.
    const summary = header(page, 'plain', 2);
    await summary.click();
    expect(await item(page, 'plain', 2).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    await summary.click();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.addStyleTag({ content: `${TAG} > details > summary { transition-duration: 0s, 0s, 0s, 0s !important; }` });
    await summary.hover();
    expect(await css(summary, 'background-color')).toBe(await resolveColor(page, T('plain-hovered-container-color')));
    // ACC-36: without the script an open item's content is not a target — no pointer cursor and no state over it,
    // and a press there closes nothing.
    const content = await contentBox(item(page, 'plain', 1));
    const at = { x: content.left + 4, y: content.top + content.height / 2 };
    await page.mouse.move(at.x, at.y);
    expect(await page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, at)).not.toBe('pointer');
    expect(await css(item(page, 'plain', 1), 'background-color')).toMatch(CLEAR);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(50);
    expect(await item(page, 'plain', 1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true);
    await summary.hover();
    // A press: the pressed container at once, in the state's place, drawn in every frame of press-hold after the
    // release — nothing fades while it is held — and then gone.
    await expectPressHeldAtEveryMoment(page, summary, { pressed: await resolveColor(page, T('plain-pressed-container-color')) });
    await page.mouse.move(0, 0);
    await expect.poll(() => css(summary, 'background-color'), { intervals: [10] }).toMatch(CLEAR);
    await summary.click();
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    // Defined: nothing moves, nothing is redrawn.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const before = await geometry();
    await page.addScriptTag({ content: bundle.slice('<script type="module">'.length, -'</script>'.length), type: 'module' });
    await page.waitForFunction(() => !!customElements.get('tanrei-accordion'));
    await frame(page);
    expect(await geometry()).toEqual(before);
    expect(await motions(page)).toBe(0);
  });

  test('ACC-9, ACC-13: inside another component’s shadow root the element adds its stylesheet to that root and is drawn and moved there as in the document', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('plain') });
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'shadowed';
      outer.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-accordion variant="outlined"><details open><summary>In a shadow root</summary>content</details><details><summary>Two</summary>two</details></tanrei-accordion>';
      document.querySelector('main')!.append(outer);
    });
    const inner = page.locator('#shadowed tanrei-accordion');
    await expect.poll(() => css(inner, 'display')).toBe('grid');
    expect(await px(inner.locator('details').first(), 'border-top-width', '::after')).toBe(await resolveToken(page, T('outline-width')));
    expect((await edges(inner.locator('summary').nth(1))).height).toBe(56);
    // The item's clock, kept as the engine announces it: asked for after the click, it may be over before a slow
    // runner's answer.
    const second = inner.locator('details').nth(1);
    await watchTransitions(second);
    // (The item, opened under the pointer, is hovered as one target too — ACC-36 — a change of its color, not a clock.)
    await inner.locator('summary').nth(1).click();
    const clocks = async () => (await transitionsRun(second)).filter((run) => run.own && run.pseudo === '' && run.property !== 'background-color').map((run) => [run.property, run.duration]);
    await expect.poll(clocks).toEqual([['--_acc-open', await resolveToken(page, T('motion-disclosure-duration'), 'duration')]]);
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
