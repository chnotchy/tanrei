// <tanrei-list-row>, driven by specs/list-row.spec.json: every behaviour id (LRW-1…16) is cited by a test title, every
// fixture has a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, rootTokens, setWords, tabTo, withoutIconFont } from '../../../test/harness.js';

const spec = loadSpec('list-row');
type P = Page;
const TAG = 'tanrei-list-row';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const row = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`).first();
const part = (host: Locator, name: string) => host.locator(`.${name}`).first();
const T = (name: string) => `--tanrei-comp-list-row-${name}`;
const L = (name: string) => `--tanrei-comp-list-${name}`;
const token = (page: P, name: string) => resolveToken(page, name);
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
const byId = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const mount = (page: P, fixtures: Fixture[] = spec.fixtures) => mountFixtures(page, spec, { fixtures, icons: true });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
const settled = async (page: P) => {
  await page.evaluate(() =>
    Promise.all([...document.querySelectorAll('tanrei-list-row, tanrei-list-item, tanrei-list')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete)),
  );
  await frames(page, 2);
};
/** Markup of the test's own, each piece in a stage of its own, on a page that has the tokens, the faces and the elements. */
async function mountHtml(page: P, stages: Record<string, string>) {
  await mount(page, []);
  await page.evaluate((entries) => {
    document.querySelector('main')!.innerHTML = entries.map(([id, markup]) => `<div class="stage" data-fixture="${id}" style="inline-size: 360px">${markup}</div>`).join('');
  }, Object.entries(stages));
  await settled(page);
  await page.evaluate(async () => {
    const style = getComputedStyle(document.documentElement);
    await document.fonts.load(`24px ${style.getPropertyValue('--tanrei-sys-icon-family-unselected').trim()}`, 'wifi');
  });
  await settled(page);
}
/** The row of three lines, in each kind of list item. */
const ROW = '<tanrei-list-row leading-icon="wifi" overline="Network" headline="Wi-Fi" supporting-text="Connected to Harbour"></tanrei-list-row>';
const TWO = '<tanrei-list-row leading-icon="wifi" headline="Wi-Fi" supporting-text="Connected to Harbour"></tanrei-list-row>';
const listOf = (attributes: string, items: string[]) => `<tanrei-list ${attributes} style="inline-size: 360px">${items.join('')}</tanrei-list>`;

test.describe('behavior', () => {
  test('LRW-1: the parts from the start edge, the gap apart, inside the paddings; as wide as the layout; no fill, no edge, no focus', async ({ page }) => {
    await mount(page);
    const host = row(page, 'all-parts');
    const b = await box(host);
    expect(b.width).toBe(360);
    const [gap, start, end] = await Promise.all([token(page, T('container-gap')), token(page, T('container-padding-inline-start')), token(page, T('container-padding-inline-end'))]);
    const icon = await box(part(host, 'leading-icon'));
    const text = await box(part(host, 'text'));
    const value = await box(part(host, 'trailing-text'));
    const chevron = await box(part(host, 'trailing-icon'));
    near(icon.x - b.x, start, 'start padding');
    near(text.x - (icon.x + icon.width), gap, 'gap after the glyph');
    near(value.x - (text.x + text.width), gap, 'gap after the text');
    near(chevron.x - (value.x + value.width), gap, 'gap after the value');
    near(b.x + b.width - (chevron.x + chevron.width), end, 'end padding');
    const container = part(host, 'row');
    expect(await css(container, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(container, 'border-top-width')).toBe('0px');
    expect(await host.evaluate((el) => el.tabIndex)).toBe(-1);
    // Inside a box that sizes it to its content, as wide as its parts on one line, never cut.
    await page.evaluate(() => {
      const s = document.querySelector('[data-fixture="all-parts"]') as HTMLElement;
      s.style.cssText += ';display:flex';
      (s.firstElementChild as HTMLElement).style.inlineSize = 'max-content';
    });
    await settled(page);
    expect(await part(host, 'headline').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('LRW-2: the headline and the overline on one line, the supporting text on supportingLines lines, cut with an ellipsis; a number neither 1 nor 2 is the nearer and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures, fx('lines-odd', { headline: 'Odd', supportingText: byId('supporting-two-lines').props.supportingText, supportingLines: 7 })]);
    const long = row(page, 'long-text');
    for (const name of ['headline', 'supporting']) {
      const el = part(long, name);
      expect(await el.evaluate((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight), name).toBe(true);
    }
    // One line ends in text-overflow's ellipsis; a clamped block in the line clamp's.
    expect(await css(part(long, 'headline'), 'text-overflow')).toContain('ellipsis');
    expect(await css(part(long, 'supporting'), '-webkit-line-clamp')).toBe('1');
    const lineHeight = Number.parseFloat(await css(part(long, 'supporting'), 'line-height'));
    near((await box(part(long, 'supporting'))).height, lineHeight, 'one line');
    near((await box(part(row(page, 'supporting-two-lines'), 'supporting'))).height, 2 * lineHeight, 'two lines');
    near((await box(part(row(page, 'lines-odd'), 'supporting'))).height, 2 * lineHeight, '7 is read as 2');
    expect(seen.some((w) => w.includes('LRW-2'))).toBe(true);
    // The text styles and colors.
    const three = row(page, 'three-line');
    expect(await css(part(three, 'headline'), 'color')).toBe(await resolveColor(page, T('headline-color')));
    expect(await css(part(three, 'overline'), 'color')).toBe(await resolveColor(page, T('overline-color')));
    expect(await css(part(three, 'supporting'), 'color')).toBe(await resolveColor(page, T('supporting-text-color')));
    near(Number.parseFloat(await css(part(three, 'headline'), 'font-size')), await token(page, T('headline-typescale-font-size')), 'headline size');
    // The lines follow one another with no space between them.
    const [o, h, s] = await Promise.all(['overline', 'headline', 'supporting'].map((n) => box(part(three, n))));
    near(h.y, o.y + o.height, 'headline under the overline');
    near(s.y, h.y + h.height, 'supporting under the headline');
  });

  test('LRW-3: one, two and three lines are their heights in each density, the parts centred on two lines and at the top of three', async ({ page }) => {
    await mount(page);
    for (const [id, lines, density] of [
      ['one-line', 'one', 'regular'],
      ['two-line', 'two', 'regular'],
      ['three-line', 'three', 'regular'],
      ['supporting-two-lines', 'three', 'regular'],
      ['compact-one-line', 'one', 'compact'],
      ['compact', 'two', 'compact'],
    ] as const) {
      near((await box(row(page, id))).height, await token(page, T(`container-height-${lines}-line-${density}`)), id);
    }
    const two = row(page, 'leading-icon');
    const icon = await box(part(two, 'leading-icon'));
    const text = await box(part(two, 'text'));
    near(icon.y + icon.height / 2, text.y + text.height / 2, 'centred on two lines');
    await page.evaluate(() => document.querySelector('[data-fixture="leading-icon"] tanrei-list-row')!.setAttribute('overline', 'Network'));
    await settled(page);
    const three = { icon: await box(part(two, 'leading-icon')), text: await box(part(two, 'text')) };
    near(three.icon.y, three.text.y, 'at the top of three');
  });

  test('LRW-4: the leading slot’s content in place of the glyph, reported when both are given; the glyph in its box and color, hidden', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures, fx('both', { headline: 'Mira', leadingIcon: 'person' }, { slots: { leading: 'MO' } })]);
    const icon = part(row(page, 'leading-icon'), 'leading-icon');
    const size = await token(page, T('leading-icon-size'));
    expect((await box(icon)).width).toBe(size);
    expect(await icon.getAttribute('aria-hidden')).toBe('true');
    expect(await css(icon, 'color')).toBe(await resolveColor(page, T('leading-icon-color')));
    expect(await part(row(page, 'leading-picture'), 'leading-icon').count()).toBe(0);
    expect(await part(row(page, 'both'), 'leading-icon').count()).toBe(0);
    expect(seen.some((w) => w.includes('LRW-4'))).toBe(true);
    // Nothing in the glyph's place until the icon set can draw it.
    await withoutIconFont(page);
    await page.evaluate(() => document.querySelector('[data-fixture="leading-icon"] tanrei-list-row')!.setAttribute('leading-icon', 'home'));
    await settled(page);
    expect(await css(part(row(page, 'leading-icon'), 'leading-icon'), 'visibility')).toBe('hidden');
  });

  test('LRW-16: without a leading part the text begins at the start padding and without a trailing part it reaches the end padding; where its List asks for it the row keeps a glyph’s room, empty, before its text; standing alone, or drawing a leading part, it keeps none', async ({ page }) => {
    await mount(page);
    const host = row(page, 'one-line');
    const b = await box(host);
    const text = await box(part(host, 'text'));
    near(text.x - b.x, await token(page, T('container-padding-inline-start')), 'start');
    near(b.x + b.width - (text.x + text.width), await token(page, T('container-padding-inline-end')), 'end');
    await expect(host.locator('.leading-room')).toHaveCount(0);
    await mountHtml(page, {
      alone: '<tanrei-list-row headline="About"></tanrei-list-row>',
      listed: listOf('', [`<tanrei-list-item>${TWO}</tanrei-list-item>`, '<tanrei-list-item><tanrei-list-row headline="About"></tanrei-list-row></tanrei-list-item>', '<tanrei-list-item><tanrei-list-row headline="Mira"><span slot="leading">MO</span></tanrei-list-row></tanrei-list-item>']),
    });
    await expect(row(page, 'alone').locator('.leading-room')).toHaveCount(0);
    const rows = page.locator('[data-fixture="listed"] tanrei-list-row');
    const kept = rows.nth(1);
    const room = await box(part(kept, 'leading-room'));
    near(room.width, await token(page, T('leading-icon-size')), 'the room is a glyph’s box');
    near((await box(part(kept, 'headline'))).x - (room.x + room.width), await token(page, T('container-gap')), 'the gap after it');
    near((await box(part(kept, 'headline'))).x, (await box(part(rows.nth(0), 'headline'))).x, 'its headline starts where the glyph row’s does');
    await expect(part(kept, 'leading-room')).toHaveAttribute('aria-hidden', 'true');
    expect(await part(kept, 'leading-room').evaluate((el) => [el.childNodes.length, getComputedStyle(el).backgroundColor])).toEqual([0, 'rgba(0, 0, 0, 0)']);
    // A row with content in its leading slot draws that content and no room besides it.
    await expect(rows.nth(2).locator('.leading-room')).toHaveCount(0);
  });

  test('LRW-17: in an item of a list the row draws the list’s density and not its own; taken out of the list it draws its own; a change of the list’s density is drawn at once', async ({ page }) => {
    await mountHtml(page, {
      compact: listOf('density="compact"', [`<tanrei-list-item>${TWO.replace('<tanrei-list-row ', '<tanrei-list-row density="regular" ')}</tanrei-list-item>`]),
      regular: listOf('', [`<tanrei-list-item>${TWO.replace('<tanrei-list-row ', '<tanrei-list-row density="compact" ')}</tanrei-list-item>`]),
      out: '<div id="out"></div>',
    });
    const [regular, compact] = [await token(page, T('container-height-two-line-regular')), await token(page, T('container-height-two-line-compact'))];
    near((await box(row(page, 'compact'))).height, compact, 'a regular row in a compact list');
    near((await box(row(page, 'regular'))).height, regular, 'a compact row in a regular list');
    // Out of the list, its own density.
    await page.evaluate(() => document.querySelector('#out')!.append(document.querySelector('[data-fixture="compact"] tanrei-list-row')!));
    await settled(page);
    near((await box(page.locator('#out tanrei-list-row'))).height, regular, 'standing alone');
    // The list's density changed: its rows follow at once.
    await page.evaluate(() => ((document.querySelector('[data-fixture="regular"] tanrei-list') as HTMLElement & { density: string }).density = 'compact'));
    await settled(page);
    near((await box(row(page, 'regular'))).height, compact, 'the list made compact');
  });

  test('LRW-6: the trailing text, the slot’s content and the glyph, in that order at the end; the value never more than half of the row; the chevron mirrored in right-to-left', async ({ page }) => {
    await mount(page, [...spec.fixtures, fx('both-ends', { headline: 'Display', trailingText: '12 GB', trailingIcon: 'chevron_right' }, { slots: { trailing: 'more_vert' } }), fx('long-value', { headline: 'Name', trailingText: 'A very long value that would take far more than half of the row by itself' })]);
    const host = row(page, 'both-ends');
    const value = await box(part(host, 'trailing-text'));
    const slot = await box(host.locator('tanrei-button'));
    const chevron = await box(part(host, 'trailing-icon'));
    expect(value.x + value.width).toBeLessThanOrEqual(slot.x + 0.6);
    expect(slot.x + slot.width).toBeLessThanOrEqual(chevron.x + 0.6);
    const gap = await token(page, T('container-gap'));
    near(slot.x - (value.x + value.width), gap, 'value to slot');
    expect(await css(part(host, 'trailing-text'), 'color')).toBe(await resolveColor(page, T('trailing-text-color')));
    expect(await css(part(host, 'trailing-icon'), 'color')).toBe(await resolveColor(page, T('trailing-icon-color')));
    expect(await part(host, 'trailing-icon').getAttribute('aria-hidden')).toBe('true');
    const long = row(page, 'long-value');
    const inner = (await box(long)).width - (await token(page, T('container-padding-inline-start'))) - (await token(page, T('container-padding-inline-end')));
    expect((await box(part(long, 'trailing-text'))).width).toBeLessThanOrEqual(inner / 2 + 0.6);
    expect(await part(long, 'trailing-text').evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
    // Right-to-left: the chevron is mirrored and stands at the left end.
    const rtl = row(page, 'rtl');
    const r = await box(rtl);
    const mirrored = part(rtl, 'trailing-icon');
    expect(await css(mirrored, 'transform')).not.toBe('none');
    near((await box(mirrored)).x - r.x, await token(page, T('container-padding-inline-end')), 'chevron at the left');
  });

  test('LRW-7: a cut headline or supporting text shows whole in a tooltip on hover and on the item’s keyboard focus; Escape hides it; none where nothing is cut', async ({ page }) => {
    await rootTokens(page, {});
    await mount(page);
    // Short waits, so the test reads the behaviour and not the clock.
    await rootTokens(page, { '--tanrei-comp-tooltip-motion-show-delay': '0ms', '--tanrei-comp-tooltip-motion-hide-delay': '0ms' });
    const tip = (host: Locator) => host.locator('tanrei-tooltip');
    const long = row(page, 'long-text');
    await part(long, 'headline').hover();
    await expect.poll(() => tip(long).evaluate((t) => (t as HTMLElement & { open: boolean }).open).catch(() => false)).toBe(true);
    const shown = await tip(long).evaluate((t) => ({ title: (t as any).title, text: (t as any).text, hidden: t.getAttribute('aria-hidden'), variant: (t as any).variant }));
    expect(shown).toEqual({ title: byId('long-text').props.headline, text: byId('long-text').props.supportingText, hidden: 'true', variant: 'rich' });
    await page.keyboard.press('Escape');
    await expect.poll(() => tip(long).evaluate((t) => (t as any).open)).toBe(false);
    await page.mouse.move(0, 0);
    // Nothing cut: no tooltip.
    await part(row(page, 'one-line'), 'headline').hover();
    await frames(page, 4);
    expect(await tip(row(page, 'one-line')).count()).toBe(0);
    // The pointer leaves the page, so that only the keyboard opens the next one.
    await page.mouse.move(1000, 1000);
    // The keyboard focus of the interactive item the row is in.
    await mountHtml(page, { focus: listOf('', [`<tanrei-list-item interactive><tanrei-list-row headline="${byId('long-text').props.headline}"></tanrei-list-row></tanrei-list-item>`]) });
    await rootTokens(page, { '--tanrei-comp-tooltip-motion-show-delay': '0ms', '--tanrei-comp-tooltip-motion-hide-delay': '0ms' });
    const inItem = page.locator('[data-fixture="focus"] tanrei-list-row');
    await tabTo(page, page.locator('[data-fixture="focus"] tanrei-list-item').locator('.row.p'));
    await expect.poll(() => tip(inItem).evaluate((t) => (t as any).open).catch(() => false)).toBe(true);
    expect(await tip(inItem).evaluate((t) => ({ title: (t as any).title, text: (t as any).text, variant: (t as any).variant }))).toEqual({ title: '', text: byId('long-text').props.headline, variant: 'plain' });
    await page.keyboard.press('Escape');
    await expect.poll(() => tip(inItem).evaluate((t) => (t as any).open)).toBe(false);
  });

  test('LRW-8: in an action, a link or an option the item’s paddings are the row’s and the item keeps the row’s height; in a static or reorderable item the row pads itself', async ({ page }) => {
    await mountHtml(page, {
      alone: TWO,
      mixed: listOf('', [`<tanrei-list-item>${TWO}</tanrei-list-item>`, `<tanrei-list-item interactive>${TWO}</tanrei-list-item>`, `<tanrei-list-item href="#a">${TWO}</tanrei-list-item>`]),
      options: listOf('selection="single" label="Network"', [`<tanrei-list-item value="a">${TWO}</tanrei-list-item>`]),
      reorder: listOf('reorderable label="Networks" drag-handle-label="Reorder {label}"', [`<tanrei-list-item>${TWO}</tanrei-list-item>`, `<tanrei-list-item>${TWO}</tanrei-list-item>`]),
      line: listOf('orientation="horizontal"', [`<tanrei-list-item interactive>${TWO}</tanrei-list-item>`]),
    });
    const height = await token(page, T('container-height-two-line-regular'));
    near((await box(page.locator('[data-fixture="alone"] tanrei-list-row'))).height, height, 'alone');
    const items = page.locator('[data-fixture="mixed"] tanrei-list-item, [data-fixture="options"] tanrei-list-item');
    for (let n = 0; n < (await items.count()); n++) near((await box(items.nth(n))).height, height, `item ${n}`);
    const padStart = await token(page, L('container-padding-inline-start'));
    for (const n of [1, 2]) {
      const item = page.locator('[data-fixture="mixed"] tanrei-list-item').nth(n);
      const glyph = await box(item.locator('tanrei-list-row .leading-icon'));
      near(glyph.x - (await box(item)).x, padStart, `item ${n}: the item's padding`);
      expect(await css(item.locator('tanrei-list-row .row'), 'padding-left')).toBe('0px');
    }
    const staticRow = page.locator('[data-fixture="mixed"] tanrei-list-row').first();
    expect(await css(staticRow.locator('.row'), 'padding-left')).toBe(`${await token(page, T('container-padding-inline-start'))}px`);
    // Reorderable: the handle stands before the row's glyph; the row pads itself.
    const reorderItem = page.locator('[data-fixture="reorder"] tanrei-list-item').first();
    const handle = await box(reorderItem.locator('.handle'));
    const glyph = await box(reorderItem.locator('tanrei-list-row .leading-icon'));
    expect(handle.x + handle.width).toBeLessThan(glyph.x);
    // The handle and the item's gap stand in place of the row's start padding.
    near(glyph.x - (handle.x + handle.width), await token(page, L('container-gap')), 'the item gap after the handle');
    near((await box(reorderItem)).height, height, 'reorderable item');
    // In a line, as wide as its parts and never cut.
    const inLine = page.locator('[data-fixture="line"] tanrei-list-row');
    expect(await inLine.locator('.supporting').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  });

  test('LRW-9: in a selected option every text and glyph is the item’s selected content color; in the others, the row’s own', async ({ page }) => {
    await mountHtml(page, { options: listOf('selection="single" label="Network" value="a"', [`<tanrei-list-item value="a">${ROW}</tanrei-list-item>`, `<tanrei-list-item value="b">${ROW}</tanrei-list-item>`]) });
    const [selected, unselected] = [0, 1].map((n) => page.locator('[data-fixture="options"] tanrei-list-row').nth(n));
    const content = await page.locator('[data-fixture="options"] tanrei-list-item').first().evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.content')!).color);
    for (const name of ['overline', 'headline', 'supporting', 'leading-icon']) expect(await css(part(selected, name), 'color'), name).toBe(content);
    expect(await css(part(unselected, 'supporting'), 'color')).toBe(await resolveColor(page, T('supporting-text-color')));
    expect(await css(part(unselected, 'headline'), 'color')).toBe(await resolveColor(page, T('headline-color')));
    // A disabled item's opacity applies to the whole row.
    await page.evaluate(() => document.querySelectorAll('[data-fixture="options"] tanrei-list-item')[1].setAttribute('disabled', ''));
    await settled(page);
    const opacity = await page.locator('[data-fixture="options"] tanrei-list-item').nth(1).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.row')!).opacity);
    expect(Number(opacity)).toBeLessThan(1);
  });

  test('LRW-10: the texts in the order drawn, whole; the glyphs hidden; no role of its own; an empty headline is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures, fx('no-headline', { supportingText: 'Nothing above' })]);
    const host = row(page, 'all-parts');
    expect(await host.getAttribute('role')).toBeNull();
    const snapshot = await page.locator('[data-fixture="all-parts"]').ariaSnapshot();
    const order = ['Shared', 'Harbour photos', '48 items, edited today', '2.4 GB'].map((t) => snapshot.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(snapshot).not.toContain('folder');
    expect(snapshot).not.toContain('chevron_right');
    // A cut text is whole in what assistive technology is given.
    expect(await page.locator('[data-fixture="long-text"]').ariaSnapshot()).toContain(String(byId('long-text').props.headline));
    expect(seen.some((w) => w.includes('LRW-10'))).toBe(true);
    // In an interactive item: a button named by the headline and described by the other texts.
    await mountHtml(page, { item: listOf('', [`<tanrei-list-item interactive>${ROW}</tanrei-list-item>`]) });
    const button = page.locator('[data-fixture="item"] tanrei-list-item').locator('.row.p');
    expect(await button.getAttribute('role')).toBe('button');
    expect(await button.getAttribute('aria-label')).toBe('Wi-Fi');
    expect(await button.getAttribute('aria-description')).toBe('Network Connected to Harbour');
  });

  test('LRW-11: a control in a static row keeps its own focus and press, in a list and in a reorderable list after the handle', async ({ page }) => {
    await mount(page);
    const control = row(page, 'trailing-control').locator('tanrei-button');
    await control.evaluate((el) => el.addEventListener('click', () => ((window as any).pressed = true), { once: true }));
    await tabTo(page, control);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).pressed === true)).toBe(true);
    await mountHtml(page, {
      reorder: listOf('reorderable label="Files" drag-handle-label="Reorder {label}"', [
        '<tanrei-list-item><tanrei-list-row headline="brief.pdf"><tanrei-button slot="trailing" variant="text" label="Remove brief.pdf"><span slot="icon">close</span></tanrei-button></tanrei-list-row></tanrei-list-item>',
        '<tanrei-list-item><tanrei-list-row headline="plan.png"></tanrei-list-row></tanrei-list-item>',
      ]),
    });
    const remove = page.locator('[data-fixture="reorder"] tanrei-button[slot="trailing"]');
    await tabTo(page, remove);
    const handleBox = await box(page.locator('[data-fixture="reorder"] tanrei-list-item').first().locator('.handle'));
    expect(handleBox.x).toBeLessThan((await box(remove)).x);
    await remove.evaluate((el) => el.addEventListener('click', () => ((window as any).removed = true), { once: true }));
    await remove.click();
    await expect.poll(() => page.evaluate(() => (window as any).removed === true)).toBe(true);
  });

  test('LRW-12: each text isolated in its own direction, the parts placed and aligned by the layout direction', async ({ page }) => {
    await mount(page);
    const host = row(page, 'rtl');
    const b = await box(host);
    const icon = await box(part(host, 'leading-icon'));
    near(b.x + b.width - (icon.x + icon.width), await token(page, T('container-padding-inline-start')), 'glyph at the right edge');
    expect(await css(part(host, 'headline'), 'text-align')).toMatch(/start|right/);
    expect(await part(host, 'trailing-text').locator('bdi').count()).toBe(1);
    const value = await box(part(host, 'trailing-text'));
    expect(value.x).toBeLessThan(icon.x);
  });

  test('LRW-13: at 200 % text in a 320 wide box the row grows, needs no horizontal scrolling, and keeps the whole headline for assistive technology', async ({ page }) => {
    await mount(page, [byId('all-parts')]);
    const before = (await box(row(page, 'all-parts'))).height;
    // Every text of the row at twice its size, the way a reader's enlarged text reaches it.
    const fonts: Record<string, string> = {};
    for (const name of ['headline', 'overline', 'supporting-text', 'trailing-text']) {
      const size = await token(page, T(`${name}-typescale-font-size`));
      fonts[T(`${name}-typescale-font`)] = `400 ${size * 2}px/1.5 sans-serif`;
    }
    await rootTokens(page, fonts);
    await page.evaluate(() => {
      const s = document.querySelector('[data-fixture="all-parts"]') as HTMLElement;
      s.style.inlineSize = '320px';
      (s.firstElementChild as HTMLElement).style.inlineSize = '100%';
    });
    await settled(page);
    const host = row(page, 'all-parts');
    expect((await box(host)).height).toBeGreaterThan(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await page.locator('[data-fixture="all-parts"]').ariaSnapshot()).toContain('Harbour photos');
  });

  test('LRW-14: an unknown density is drawn as regular and reported; a density a system adds is drawn from its tokens; a change is drawn at once', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('unknown', { headline: 'Wi-Fi', density: 'roomy' }), fx('change', { headline: 'Wi-Fi' })]);
    near((await box(row(page, 'unknown'))).height, await token(page, T('container-height-one-line-regular')), 'unknown');
    expect(seen.some((w) => w.includes('LRW-14'))).toBe(true);
    await rootTokens(page, {
      [T('container-height-one-line-roomy')]: '96px',
      [T('container-height-two-line-roomy')]: '104px',
      [T('container-height-three-line-roomy')]: '112px',
      [T('container-padding-block-roomy')]: '20px',
    });
    await page.evaluate(() => {
      const el = document.querySelector('[data-fixture="unknown"] tanrei-list-row') as HTMLElement & { density: string };
      el.density = 'regular';
    });
    await settled(page);
    await page.evaluate(() => {
      const el = document.querySelector('[data-fixture="unknown"] tanrei-list-row') as HTMLElement & { density: string };
      el.density = 'roomy';
    });
    await settled(page);
    near((await box(row(page, 'unknown'))).height, 96, 'added density');
    await page.evaluate(() => document.querySelector('[data-fixture="change"] tanrei-list-row')!.setAttribute('supporting-text', 'Connected'));
    await settled(page);
    near((await box(row(page, 'change'))).height, await token(page, T('container-height-two-line-regular')), 'changed at once');
  });

  test('LRW-15: in forced colors the texts are the system text color, and its disabled color in a disabled item', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountHtml(page, { alone: ROW, disabled: listOf('', [`<tanrei-list-item interactive disabled>${ROW}</tanrei-list-item>`]) });
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    const grayText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'GrayText';
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    expect(await css(page.locator('[data-fixture="alone"] tanrei-list-row .supporting'), 'color')).toBe(canvasText);
    expect(await css(page.locator('[data-fixture="disabled"] tanrei-list-row .headline'), 'color')).toBe(grayText);
    await page.emulateMedia({ forcedColors: 'none' });
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, alone and in each kind of list item', async ({ page }) => {
    await setWords(page, {}).catch(() => undefined);
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await mount(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, scheme).toEqual([]);
    }
    await mountHtml(page, {
      lists: listOf('dividers', [`<tanrei-list-item>${ROW}</tanrei-list-item>`, `<tanrei-list-item interactive>${TWO}</tanrei-list-item>`, `<tanrei-list-item href="#x">${TWO}</tanrei-list-item>`]),
      options: listOf('selection="multiple" label="Networks"', [`<tanrei-list-item value="a">${ROW}</tanrei-list-item>`, `<tanrei-list-item value="b">${TWO}</tanrei-list-item>`]),
    });
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('fixtures', () => {
  test('every density of the spec has a fixture, and every fixture is the height of its lines', async ({ page }) => {
    await mount(page);
    const densities = new Set(spec.fixtures.map((f) => String(f.props.density ?? 'regular')));
    for (const density of ['regular', 'compact']) expect(densities.has(density), density).toBe(true);
    for (const f of spec.fixtures) {
      const p = f.props;
      const overline = !!p.overline;
      const supporting = !!p.supportingText;
      const lines = supporting && (overline || p.supportingLines === 2) ? 'three' : overline || supporting ? 'two' : 'one';
      const h = await token(page, T(`container-height-${lines}-line-${p.density ?? 'regular'}`));
      expect((await box(row(page, f.id))).height, f.id).toBeGreaterThanOrEqual(h - 0.6);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
