// <tanrei-toolbar>, driven by specs/toolbar.spec.json: every behaviour id (TBR-1…16) is cited by a test title, every
// fixture has a baseline, and every size, color and edge is read back from the tokens — never from a number written
// here. Its items are the real <tanrei-button>s, icon-only and labelled, so these tests also show that the toolbar leaves
// them as they are (TBR-9).
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('toolbar');
type P = Page;
const bar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-toolbar`);
const item = (page: P, id: string, n: number) => bar(page, id).locator(':scope > *').nth(n);
const inner = (page: P, id: string, n: number) => item(page, id, n).locator('button');
const container = (page: P, id: string) => bar(page, id).locator('.container');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const T = (name: string) => `--tanrei-comp-toolbar-${name}`;
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** The box-shadow a list of layers resolves to, as the browser serializes it (a probe element). */
const shadowOf = (page: P, value: string) =>
  page.evaluate((v) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:${v}`;
    document.body.appendChild(probe);
    const shadow = getComputedStyle(probe).boxShadow;
    probe.remove();
    return shadow;
  }, value);
/**
 * TBR-16: the space between two neighbours of a floating toolbar, between their visible bounds — the gap, or as much
 * more as the two need to keep a touch target's length each along the axis.
 */
const kept = (gap: number, touch: number, first: number, second: number) => Math.max(gap, Math.max(0, (touch - first) / 2) + Math.max(0, (touch - second) / 2));
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);

// Items, as a fixture lists them.
const a = (content: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'action', props: { label: content, ...props }, content });
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { label: id, ...props }, items });
const GLYPHS = ['archive', 'delete', 'mark_email_unread', 'drive_file_move', 'label', 'flag', 'snooze', 'print', 'share', 'star'];

/** Logs every click and change the items fire, by their text. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-toolbar > *')) {
      el.addEventListener('click', () => log.push(`click:${el.textContent}`));
      el.addEventListener('change', (e) => log.push(`change:${el.textContent}:${(e as CustomEvent).detail.selected}`));
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
/** The item that has keyboard focus (its text), or null. */
const focused = (page: P) => page.evaluate(() => (document.activeElement?.closest('tanrei-toolbar > *') ? document.activeElement.textContent : null));

test.describe('layout', () => {
  test('TBR-1: docked — the parent’s full width, container.size.docked high, on its color, elevation and corners, with a top edge outline.width thick in outline.color.docked', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const size = await resolveToken(page, T('container-size-docked'));
    const width = await resolveToken(page, T('outline-width'));
    for (const id of ['docked', 'docked-button', 'docked-one-item', 'docked-disabled-item']) {
      const [own, stage] = [await bounds(bar(page, id)), await bounds(page.locator(`[data-fixture="${id}"]`))];
      expect([own.x, own.width], id).toEqual([stage.x, stage.width]);
      expect(own.height, id).toBeCloseTo(size, 1);
      expect(await bounds(container(page, id)), id).toEqual(own);
    }
    expect(await css(container(page, 'docked'), 'background-color')).toBe(await resolveColor(page, T('container-color-docked')));
    expect(await px(container(page, 'docked'), 'border-top-left-radius')).toBe(await resolveToken(page, T('container-shape-docked')));
    expect(await css(container(page, 'docked'), 'box-shadow')).toBe(await shadowOf(page, `var(${T('container-elevation-docked')}), inset 0 var(${T('outline-width')}) 0 0 var(${T('outline-color-docked')})`));
    // The edge is drawn: its color is not transparent in the default system, and it is a hairline at the top only.
    expect(await css(container(page, 'docked'), 'box-shadow')).toMatch(new RegExp(` 0px ${width}px 0px 0px inset$`));
    expect(await resolveColor(page, T('outline-color-docked'))).not.toBe('rgba(0, 0, 0, 0)');
    // In a wider parent it is as wide as the parent.
    await page.addStyleTag({ content: `.stage[data-fixture='docked'] { inline-size: 520px; }` });
    expect((await bounds(bar(page, 'docked'))).width).toBe(520);
  });

  test('TBR-2: docked — one row in reading order, padding-inline from each edge, equal space between neighbours (never less than the gap), each centred across the row; one item is centred; a disabled item keeps its place', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const pad = await resolveToken(page, T('container-padding-inline-docked'));
    const gap = await resolveToken(page, T('container-gap-docked'));
    for (const [id, count] of [['docked', 4], ['docked-button', 4], ['docked-disabled-item', 4]] as const) {
      const own = await bounds(bar(page, id));
      const boxes = await Promise.all(Array.from({ length: count }, (_, n) => bounds(inner(page, id, n))));
      expect(boxes[0].x - own.x, id).toBeCloseTo(pad, 1);
      expect(own.x + own.width - (boxes[count - 1].x + boxes[count - 1].width), id).toBeCloseTo(pad, 1);
      const spaces = boxes.slice(1).map((box, n) => box.x - (boxes[n].x + boxes[n].width));
      for (const space of spaces) {
        expect(space, id).toBeCloseTo(spaces[0], 0);
        expect(space, id).toBeGreaterThanOrEqual(gap);
      }
      for (const box of boxes) expect(box.y + box.height / 2, id).toBeCloseTo(own.y + own.height / 2, 1);
    }
    await expect(item(page, 'docked', 0)).toHaveText('archive');
    await expect(item(page, 'docked-button', 3)).toHaveText('Send');
    // A disabled item keeps its place: the same positions as the fixture without it.
    const plain = await Promise.all([0, 1, 2, 3].map((n) => bounds(inner(page, 'docked', n))));
    const disabled = await Promise.all([0, 1, 2, 3].map((n) => bounds(inner(page, 'docked-disabled-item', n))));
    expect(disabled.map((box) => box.x)).toEqual(plain.map((box) => box.x));
    // One item: centred.
    const [own, one] = [await bounds(bar(page, 'docked-one-item')), await bounds(inner(page, 'docked-one-item', 0))];
    expect(one.x + one.width / 2).toBeCloseTo(own.x + own.width / 2, 1);
    expect(one.y + one.height / 2).toBeCloseTo(own.y + own.height / 2, 1);
  });

  test('TBR-3: docked — the color reaches under the bottom and side insets (env(safe-area-inset-*)), the items stay above and inside them', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const sheet = await bar(page, 'docked').evaluate((el) => (el.constructor as any).styles.cssText as string);
    for (const side of ['bottom', 'left', 'right']) expect(sheet).toContain(`env(safe-area-inset-${side}, 0px)`);
    const size = await resolveToken(page, T('container-size-docked'));
    const pad = await resolveToken(page, T('container-padding-inline-docked'));
    const before = await bounds(bar(page, 'docked'));
    await bar(page, 'docked').evaluate((el) => el.setAttribute('style', '--_inset-bottom: 34px; --_inset-left: 12px; --_inset-right: 20px'));
    const own = await bounds(bar(page, 'docked'));
    expect(own.height).toBe(before.height + 34);
    expect(await bounds(container(page, 'docked'))).toEqual(own);
    const first = await bounds(inner(page, 'docked', 0));
    const last = await bounds(inner(page, 'docked', 3));
    // Above the bottom inset, centred in the toolbar's own size; inside the side insets by the padding.
    expect(first.y + first.height / 2).toBeCloseTo(own.y + size / 2, 1);
    expect(first.x - own.x).toBeCloseTo(12 + pad, 1);
    expect(own.x + own.width - (last.x + last.width)).toBeCloseTo(20 + pad, 1);
  });

  test('TBR-4: floating — its color, elevation, corners and edge; as long as its items (padding-inline at each end, the gap between them or as much more as TBR-16 keeps for their targets), container.size.floating across, every item centred', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const size = await resolveToken(page, T('container-size-floating'));
    const pad = await resolveToken(page, T('container-padding-inline-floating'));
    const gap = await resolveToken(page, T('container-gap-floating'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    for (const id of ['floating', 'floating-filled-action']) {
      const own = await bounds(bar(page, id));
      const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(inner(page, id, n))));
      expect(own.height, id).toBeCloseTo(size, 1);
      expect(boxes[0].x - own.x, id).toBeCloseTo(pad, 1);
      expect(own.x + own.width - (boxes[3].x + boxes[3].width), id).toBeCloseTo(pad, 1);
      for (const n of [1, 2, 3]) expect(boxes[n].x - (boxes[n - 1].x + boxes[n - 1].width), id).toBeCloseTo(kept(gap, touch, boxes[n - 1].width, boxes[n].width), 1);
      // As long as its items need, and no longer.
      expect(own.width, id).toBeCloseTo(2 * pad + boxes.reduce((sum, box) => sum + box.width, 0) + [1, 2, 3].reduce((sum, n) => sum + kept(gap, touch, boxes[n - 1].width, boxes[n].width), 0), 1);
      for (const box of boxes) expect(box.y + box.height / 2, id).toBeCloseTo(own.y + own.height / 2, 1);
    }
    const surface = container(page, 'floating');
    expect(await css(surface, 'background-color')).toBe(await resolveColor(page, T('container-color-floating')));
    expect(await css(surface, 'box-shadow')).toBe(await shadowOf(page, `var(${T('container-elevation-floating')}), inset 0 0 0 var(${T('outline-width')}) var(${T('outline-color-floating')})`));
    // corner.full: a pill, drawn round whatever the smoothing (the emitter's pill mark).
    expect(await px(surface, 'border-top-left-radius')).toBe(await resolveToken(page, T('container-shape-floating')));
    expect(await surface.getAttribute('data-tanrei-shape')).toBe('');
    expect((await css(surface, '--tanrei-corner-pill')).trim()).toBe('1');
    // The docked and floating toolbars differ at rest.
    expect(await css(surface, 'box-shadow')).not.toBe(await css(container(page, 'docked'), 'box-shadow'));
  });

  test('TBR-4: a floating toolbar whose corners are not a pill eases them by sys.shape.corner-smoothing (cupertino)', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    await override(page, { [T('container-shape-floating')]: '12px', [T('container-shape-floating-pill')]: '0' });
    const smoothing = Number.parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-shape-corner-smoothing')));
    expect(smoothing).toBeGreaterThan(0);
    const surface = container(page, 'floating');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(await px(surface, 'border-top-left-radius')).toBeCloseTo(12 * (1 + 0.4 * smoothing), 2);
      expect(await css(surface, 'corner-top-left-shape')).toMatch(/^superellipse/);
    } else {
      expect(await px(surface, 'border-top-left-radius')).toBeCloseTo(12, 2);
    }
  });

  test('TBR-5: floating — laid out at its own size where its layout places it, with no scrim, reading no inset', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const own = await bounds(bar(page, 'floating'));
    const stage = await bounds(page.locator('[data-fixture="floating"]'));
    // The stage centres it: it neither positions nor stretches itself.
    expect(await css(bar(page, 'floating'), 'position')).toBe('static');
    expect(own.width).toBeLessThan(stage.width);
    expect(own.x + own.width / 2).toBeCloseTo(stage.x + stage.width / 2, 1);
    expect(own.y + own.height / 2).toBeCloseTo(stage.y + stage.height / 2, 1);
    // Nothing but its surface and its slot: no scrim.
    expect(await bar(page, 'floating').evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].map((n) => n.localName))).toEqual(['div', 'slot']);
    // No inset reaches it.
    await bar(page, 'floating').evaluate((el) => el.setAttribute('style', '--_inset-bottom: 34px; --_inset-left: 12px; --_inset-right: 20px'));
    expect(await bounds(bar(page, 'floating'))).toEqual(own);
  });

  test('TBR-6: vertical floating — the items stacked top to bottom in order, the paddings and gap along the column, container.size.floating wide; a docked toolbar stays horizontal and a debug build says so', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures, fixture('docked-vertical', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'docked', orientation: 'vertical' })],
    });
    const size = await resolveToken(page, T('container-size-floating'));
    const pad = await resolveToken(page, T('container-padding-inline-floating'));
    const gap = await resolveToken(page, T('container-gap-floating'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const own = await bounds(bar(page, 'floating-vertical'));
    const boxes = await Promise.all([0, 1, 2].map((n) => bounds(inner(page, 'floating-vertical', n))));
    expect(own.width).toBeCloseTo(size, 1);
    expect(boxes[0].y - own.y).toBeCloseTo(pad, 1);
    expect(own.y + own.height - (boxes[2].y + boxes[2].height)).toBeCloseTo(pad, 1);
    // TBR-16: the gap, or what the items' targets need, along the column.
    for (const n of [1, 2]) expect(boxes[n].y - (boxes[n - 1].y + boxes[n - 1].height)).toBeCloseTo(kept(gap, touch, boxes[n - 1].height, boxes[n].height), 1);
    expect(own.height).toBeCloseTo(2 * pad + boxes.reduce((sum, box) => sum + box.height, 0) + 2 * kept(gap, touch, boxes[0].height, boxes[1].height), 1);
    for (const box of boxes) expect(box.x + box.width / 2).toBeCloseTo(own.x + own.width / 2, 1);
    await expect(item(page, 'floating-vertical', 0)).toHaveText('add');
    // Centred in its 96 × 240 stage.
    const stage = await bounds(page.locator('[data-fixture="floating-vertical"]'));
    expect([stage.width, stage.height]).toEqual([96, 240]);
    expect(own.y + own.height / 2).toBeCloseTo(stage.y + stage.height / 2, 1);
    // Docked and vertical: laid out as a horizontal docked toolbar, and reported.
    const docked = await Promise.all([0, 1, 2].map((n) => bounds(inner(page, 'docked-vertical', n))));
    for (const box of docked) expect(box.y).toBeCloseTo(docked[0].y, 1);
    expect((await bounds(bar(page, 'docked-vertical'))).height).toBeCloseTo(await resolveToken(page, T('container-size-docked')), 1);
    await expect(bar(page, 'docked-vertical')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect.poll(() => seen.filter((w) => w.includes('TBR-6')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/a docked toolbar is horizontal; orientation "vertical" is for a floating toolbar \(TBR-6\)/);
  });

  test('TBR-7: right-to-left lays a horizontal toolbar’s items out from the right, in reading order; a vertical toolbar keeps its top-to-bottom order', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const pad = await resolveToken(page, T('container-padding-inline-docked'));
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    for (const id of ['docked', 'floating']) {
      const xs = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(inner(page, id, n))).x));
      expect([...xs].sort((p, q) => q - p), id).toEqual(xs);
    }
    const own = await bounds(bar(page, 'docked'));
    const first = await bounds(inner(page, 'docked', 0));
    expect(own.x + own.width - (first.x + first.width)).toBeCloseTo(pad, 1);
    const ys = await Promise.all([0, 1, 2].map(async (n) => (await bounds(inner(page, 'floating-vertical', n))).y));
    expect([...ys].sort((p, q) => p - q)).toEqual(ys);
  });

  test('TBR-8: items that need more length than the toolbar has keep their size and the minimum gap, never wrap, scroll along its axis, and a focused item is brought fully into view; a debug build points to an overflow menu', async ({ page }) => {
    const seen = warnings(page);
    const many = GLYPHS.map((g) => a(g));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('crowded', many, { variant: 'docked' }), fixture('crowded-floating', many, { variant: 'floating' }), fixture('crowded-vertical', many.slice(0, 7), { variant: 'floating', orientation: 'vertical' })],
    });
    // A floating toolbar is as long as its items, never longer than its container: here a 200 px block.
    await page.addStyleTag({ content: `.stage[data-fixture='crowded'] { inline-size: 200px; } .stage[data-fixture='crowded-floating'] { display: block !important; inline-size: 200px !important; }` });
    const size = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    // The least space between two items: docked, the gap; floating, what TBR-16 lays between them.
    const least = { crowded: await resolveToken(page, T('container-gap-docked')), 'crowded-floating': kept(await resolveToken(page, T('container-gap-floating')), touch, size, size) };
    for (const id of ['crowded', 'crowded-floating'] as const) {
      const gap = least[id];
      await expect.poll(async () => (await bounds(bar(page, id))).width, id).toBeLessThanOrEqual(200);
      const boxes = await Promise.all(GLYPHS.map((_, n) => bounds(inner(page, id, n))));
      for (const box of boxes) {
        expect(box.width, id).toBeCloseTo(size, 1);
        expect(box.y, id).toBeCloseTo(boxes[0].y, 1);
      }
      for (const n of [1, 2, 3]) expect(boxes[n].x - (boxes[n - 1].x + boxes[n - 1].width), id).toBeCloseTo(gap, 1);
      const surface = container(page, id);
      await expect.poll(() => css(surface, 'overflow-x'), id).toBe('auto');
      expect(await surface.evaluate((el) => el.scrollWidth - el.clientWidth), id).toBeGreaterThan(0);
    }
    // Focus moved to the last item scrolls it fully into view, inside the padding; Home brings the first back.
    const pad = await resolveToken(page, T('container-padding-inline-docked'));
    await tabTo(page, item(page, 'crowded', 0));
    await page.keyboard.press('End');
    await expect(item(page, 'crowded', GLYPHS.length - 1)).toBeFocused();
    const port = await bounds(container(page, 'crowded'));
    const last = await bounds(inner(page, 'crowded', GLYPHS.length - 1));
    expect(last.x + last.width).toBeLessThanOrEqual(port.x + port.width - pad + 0.5);
    expect(last.x).toBeGreaterThanOrEqual(port.x);
    await page.keyboard.press('Home');
    await expect(item(page, 'crowded', 0)).toBeFocused();
    const first = await bounds(inner(page, 'crowded', 0));
    expect(first.x).toBeGreaterThanOrEqual(port.x + pad - 0.5);
    // A column scrolls too.
    const column = container(page, 'crowded-vertical');
    await expect.poll(() => css(column, 'overflow-y')).toBe('auto');
    await tabTo(page, item(page, 'crowded-vertical', 0));
    await page.keyboard.press('End');
    const [colPort, colLast] = [await bounds(column), await bounds(inner(page, 'crowded-vertical', 6))];
    expect(colLast.y + colLast.height).toBeLessThanOrEqual(colPort.y + colPort.height + 0.5);
    // Reported once per toolbar; the fixtures that fit are not.
    await expect.poll(() => seen.filter((w) => w.includes('TBR-8')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/they scroll; the extra actions belong in an overflow menu the product provides.*\(TBR-8\)/);
  });

  test('TBR-8: a toolbar whose items fit does not scroll and clips nothing', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) expect(await css(container(page, f.id), 'overflow-x'), f.id).toBe('visible');
  });

  test('TBR-14: enlarged text grows the toolbar across its axis to hold its items (its size is a minimum); it scales none of them itself', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const before = { bar: await bounds(bar(page, 'docked-button')), send: await bounds(inner(page, 'docked-button', 3)), icon: await bounds(inner(page, 'docked-button', 0)) };
    await override(page, { '--tanrei-dial-type-base': '48px' });
    await expect.poll(async () => (await bounds(inner(page, 'docked-button', 3))).height).toBeGreaterThan(before.send.height);
    const after = { bar: await bounds(bar(page, 'docked-button')), send: await bounds(inner(page, 'docked-button', 3)), icon: await bounds(inner(page, 'docked-button', 0)) };
    const pad = await resolveToken(page, T('container-padding-inline-docked'));
    expect(after.bar.height).toBeGreaterThanOrEqual(after.send.height);
    expect(after.bar.height).toBeGreaterThan(before.bar.height);
    expect([after.icon.width, after.icon.height]).toEqual([before.icon.width, before.icon.height]);
    // Still inside: the Button's end at the padding.
    expect(after.bar.x + after.bar.width - (after.send.x + after.send.width)).toBeCloseTo(pad, 1);
  });
});

test.describe('items', () => {
  test('TBR-9: each item renders as the icon button or Button it is, from its own tokens, variant and size, with its own press, toggle, disabled behaviour and events', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const iconSize = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    expect((await bounds(inner(page, 'floating', 1))).width).toBeCloseTo(iconSize, 1);
    expect(await css(inner(page, 'floating-filled-action', 3), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    expect(await css(inner(page, 'floating', 0), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-text-selected-container-color'));
    expect(await css(inner(page, 'docked-button', 3), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-filled-container-color'));
    expect(await css(inner(page, 'docked-one-item', 0), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
    expect((await bounds(inner(page, 'docked-button', 3))).height).toBeCloseTo(await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 1);
    expect(await px(inner(page, 'docked-button', 3), 'border-top-left-radius')).toBe(await resolveToken(page, '--tanrei-comp-button-container-shape'));
    // A Button's label stays on one line (the toolbar never narrows or wraps an item).
    expect(await css(inner(page, 'docked-button', 3), 'white-space')).toBe('nowrap');
    await inner(page, 'floating', 2).hover();
    // Underline is a toggle that is off: its hovered fill is its unselected look's (BTN-15).
    await expect.poll(() => css(inner(page, 'floating', 2), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-text-hovered-unselected-container-color'));
    await wire(page);
    await inner(page, 'floating', 1).click();
    await inner(page, 'docked-button', 3).click();
    await inner(page, 'docked-disabled-item', 1).click({ force: true });
    expect(await log(page)).toEqual(['click:format_italic', 'change:format_italic:true', 'click:Send']);
    await expect(inner(page, 'floating', 1)).toHaveAttribute('aria-pressed', 'true');
    await expect(inner(page, 'floating', 0)).toHaveAttribute('aria-pressed', 'true');
    await expect(inner(page, 'docked-disabled-item', 1)).toBeDisabled();
  });

  test('TBR-9: between two items the hit areas never overlap — in a floating toolbar they meet where the lengths TBR-16 keeps for the two items meet, in a docked one at the middle of the gap; an item reaches its whole target where it has no neighbour, and along a spread docked row', async ({ page }) => {
    const small = ['edit', 'ink_highlighter', 'ink_eraser'].map((g) => a(g, { size: 'small' }));
    await mountFixtures(page, spec, {
      icons: true,
      // The stages a pointer is moved over come first, inside the window.
      fixtures: [fixture('close', small, { variant: 'floating' }), fixture('close-vertical', small, { variant: 'floating', orientation: 'vertical' }), fixture('small', small, { variant: 'floating' }), ...spec.fixtures],
    });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = (id: string, n: number) =>
      inner(page, id, n).evaluate((el) => {
        const r = getComputedStyle(el, '::before');
        const box = el.getBoundingClientRect();
        return { left: box.left + Number.parseFloat(r.left), right: box.right - Number.parseFloat(r.right), top: box.top + Number.parseFloat(r.top), bottom: box.bottom - Number.parseFloat(r.bottom) };
      });
    // The default system: the small items stand what they lack of the touch target apart, and their hit areas — as far
    // as a fine pointer's target reaches — never pass the middle of that space.
    const [p, q] = [await bounds(inner(page, 'small', 0)), await bounds(inner(page, 'small', 1))];
    const apart = q.x - (p.x + p.width);
    expect(apart).toBeCloseTo(touch - p.width, 1);
    const reach = Math.max(0, (pointer - p.width) / 2);
    await expect.poll(async () => (await hit('small', 0)).right).toBeCloseTo(p.x + p.width + Math.min(reach, apart / 2), 1);
    expect((await hit('small', 1)).left).toBeCloseTo(q.x - Math.min(reach, apart / 2), 1);
    expect((await hit('small', 0)).right).toBeLessThanOrEqual((await hit('small', 1)).left + 0.01);
    // A layer in which the items keep no length (sys.target.touch 0) while a fine pointer's target is wider than an
    // item: they touch, each would reach over its neighbour alone, and each stops at the seam.
    await page.evaluate(() => {
      for (const id of ['close', 'close-vertical']) (document.querySelector(`[data-fixture="${id}"]`) as HTMLElement).style.setProperty('--tanrei-sys-target-touch', '0px');
    });
    await expect.poll(async () => (await bounds(inner(page, 'close', 1))).x - (await bounds(inner(page, 'close', 0))).x).toBeCloseTo(p.width, 1);
    const [s0, s1] = [await bounds(inner(page, 'close', 0)), await bounds(inner(page, 'close', 1))];
    expect(reach, 'a fine pointer’s target is wider than a small item').toBeGreaterThan(0);
    await expect.poll(async () => (await hit('close', 0)).right).toBeCloseTo(s0.x + s0.width, 1);
    const [h0, h1] = [await hit('close', 0), await hit('close', 1)];
    expect(h1.left).toBeCloseTo(s1.x, 1);
    expect(h0.left).toBeCloseTo(s0.x - reach, 1);
    // Across the row the target is whole.
    expect(h0.bottom - h0.top).toBeCloseTo(pointer, 1);
    await wire(page);
    const y = s0.y + s0.height / 2;
    await page.mouse.click(s0.x + s0.width - 1, y); // beside the seam, in the first
    await page.mouse.click(s1.x + 1, y); // beside the seam, in the second
    await page.mouse.click(s0.x - reach + 1, y); // the first's outer end, as far as it reaches alone
    expect(await log(page)).toEqual(['click:edit', 'click:ink_highlighter', 'click:edit']);
    // A column caps above and below, and is whole across.
    const [v0, v1] = [await bounds(inner(page, 'close-vertical', 0)), await bounds(inner(page, 'close-vertical', 1))];
    expect(v1.y).toBeCloseTo(v0.y + v0.height, 1);
    const [c0, c1] = [await hit('close-vertical', 0), await hit('close-vertical', 1)];
    expect(c0.bottom).toBeCloseTo(v0.y + v0.height, 1);
    expect(c1.top).toBeCloseTo(v1.y, 1);
    expect(c0.top).toBeCloseTo(v0.y - reach, 1);
    expect(c0.right - c0.left).toBeCloseTo(pointer, 1);
    // A spread docked row leaves room: each item reaches its whole target along the row.
    const d = await bounds(inner(page, 'docked', 1));
    const hd = await hit('docked', 1);
    expect(hd.right - hd.left).toBeCloseTo(Math.max(pointer, d.width), 1);
    // RTL mirrors the caps: the first item's capped side is now its left.
    await page.evaluate(() => document.querySelector('[data-fixture="close"]')!.setAttribute('dir', 'rtl'));
    await expect.poll(async () => {
      const [r0, rb] = [await hit('close', 0), await bounds(inner(page, 'close', 0))];
      return Math.round((rb.x - r0.left) * 100) / 100;
    }).toBeCloseTo(0, 1);
    expect((await hit('close', 0)).right).toBeCloseTo((await bounds(inner(page, 'close', 0))).x + s0.width + reach, 1);
  });

  test('TBR-9: under a coarse pointer every item of a floating toolbar keeps its whole touch target in the default system — the hit areas of two neighbours meet where their kept lengths meet — whatever its size', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch emulation through CDP');
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fixture('small', ['edit', 'ink_highlighter', 'ink_eraser'].map((g) => a(g, { size: 'small' })), { variant: 'floating' })] });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = (id: string, n: number) =>
      inner(page, id, n).evaluate((el) => {
        const r = getComputedStyle(el, '::before');
        const box = el.getBoundingClientRect();
        return { left: box.left + Number.parseFloat(r.left), right: box.right - Number.parseFloat(r.right), top: box.top + Number.parseFloat(r.top), bottom: box.bottom - Number.parseFloat(r.bottom) };
      });
    // TBR-9's verify: every item is at least the touch target along the axis and across it, the middle ones too.
    for (const [id, count] of [['floating', 4], ['floating-filled-action', 4], ['small', 3]] as const) {
      for (let n = 0; n < count; n++) {
        await expect.poll(async () => { const h = await hit(id, n); return h.right - h.left; }, `${id} ${n}`).toBeGreaterThanOrEqual(touch - 0.5);
        const h = await hit(id, n);
        expect(h.bottom - h.top, `${id} ${n}`).toBeGreaterThanOrEqual(touch - 0.5);
        // …and stops where its neighbour's begins: they meet, and never overlap.
        if (n > 0) expect(h.left, `${id} ${n}`).toBeCloseTo((await hit(id, n - 1)).right, 1);
      }
    }
    for (let n = 0; n < 3; n++) {
      const h = await hit('floating-vertical', n);
      expect(h.bottom - h.top, `column ${n}`).toBeGreaterThanOrEqual(touch - 0.5);
      if (n > 0) expect(h.top, `column ${n}`).toBeCloseTo((await hit('floating-vertical', n - 1)).bottom, 1);
    }
    for (const id of ['docked', 'docked-button']) for (const n of [0, 1, 2, 3]) { const h = await hit(id, n); expect(h.right - h.left, `${id} ${n}`).toBeGreaterThanOrEqual(touch - 0.5); }
  });

  test('TBR-16: a floating toolbar lays its items container.gap.floating apart and moves two neighbours further only as far as each needs to keep sys.target.touch of length along the axis — medium items 8 apart and the toolbar 208 long in the default system, large ones touching, small ones 16 apart, every size touching where the target is 0 — along the column when vertical, the same for every pointer, with nothing of an item changed; a docked toolbar is unchanged', async ({ page }) => {
    const row = (size: string, count = 3) => GLYPHS.slice(0, count).map((g) => a(g, { size }));
    const fixtures = [
      ...spec.fixtures,
      fixture('large', row('large'), { variant: 'floating' }),
      fixture('small', row('small'), { variant: 'floating' }),
      fixture('mixed', [a('edit', { size: 'small' }), a('link'), a('add', { size: 'large' }), a('remove', { size: 'small' })], { variant: 'floating' }),
      fixture('small-vertical', row('small'), { variant: 'floating', orientation: 'vertical' }),
      fixture('text', [{ kind: 'button', props: { variant: 'text', size: 'small' }, content: 'OK' }, a('link'), { kind: 'button', props: { variant: 'filled' }, content: 'Publish' }], { variant: 'floating' }),
      ...['medium', 'large', 'small'].map((size) => fixture(`zero-${size}`, row(size), { variant: 'floating' })),
      fixture('wide-gap', row('medium'), { variant: 'floating' }),
      fixture('docked-small', row('small', 4), { variant: 'docked' }),
    ] as Fixture[];
    await mountFixtures(page, spec, { icons: true, fixtures });
    const gap = await resolveToken(page, T('container-gap-floating'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const pad = await resolveToken(page, T('container-padding-inline-floating'));
    // The default system: the gap is 0 and the target 48.
    expect([gap, touch, pad]).toEqual([0, 48, 12]);
    const along = async (id: string, count: number, column = false) => {
      const boxes = await Promise.all(Array.from({ length: count }, (_, n) => bounds(inner(page, id, n))));
      return { lengths: boxes.map((box) => (column ? box.height : box.width)), apart: boxes.slice(1).map((box, n) => (column ? box.y - (boxes[n].y + boxes[n].height) : box.x - (boxes[n].x + boxes[n].width))) };
    };
    const settled = (id: string, count: number, expected: number[], column = false) => expect.poll(async () => (await along(id, count, column)).apart.map((value) => Math.round(value * 100) / 100), id).toEqual(expected);
    // TBR-16's verify: four medium icon-only Buttons (40) stand 8 apart (4 + 4), and the toolbar is 208 long.
    await settled('floating', 4, [8, 8, 8]);
    expect((await along('floating', 4)).lengths).toEqual([40, 40, 40, 40]);
    expect((await bounds(bar(page, 'floating'))).width).toBe(208);
    expect((await bounds(bar(page, 'floating'))).width).toBe(4 * 40 + 3 * 8 + 2 * pad);
    await settled('floating-filled-action', 4, [8, 8, 8]);
    // The same along the column.
    await settled('floating-vertical', 3, [8, 8], true);
    expect((await bounds(bar(page, 'floating-vertical'))).height).toBe(3 * 40 + 2 * 8 + 2 * pad);
    // Large (56) Buttons touch; small (32) ones stand 16 apart, in a row and in a column.
    await settled('large', 3, [0, 0, ]);
    expect((await along('large', 3)).lengths).toEqual([56, 56, 56]);
    await settled('small', 3, [16, 16]);
    await settled('small-vertical', 3, [16, 16], true);
    // Neighbours of two sizes: each stands half of what it lacks away — small · medium 8 + 4, medium · large 4 + 0,
    // large · small 0 + 8.
    await settled('mixed', 4, [12, 4, 8]);
    // A labelled Button is measured as it is: one longer than the target lacks nothing, so the medium icon-only Button
    // between two of them stands its own 4 from each.
    const text = await along('text', 3);
    expect(Math.min(text.lengths[0], text.lengths[2])).toBeGreaterThan(touch);
    await settled('text', 3, [kept(gap, touch, text.lengths[0], text.lengths[1]), kept(gap, touch, text.lengths[1], text.lengths[2])].map((value) => Math.round(value * 100) / 100));
    expect(text.apart).toEqual([4, 4]);
    // Nothing of an item is widened, resized or restyled to do so (TBR-9): its box is its own, and so is its element's.
    for (const [id, n, size] of [['floating', 1, 'medium'], ['small', 1, 'small'], ['large', 1, 'large']] as const) {
      const height = await resolveToken(page, `--tanrei-comp-button-container-height-${size}`);
      const box = await bounds(inner(page, id, n));
      expect([box.width, box.height], id).toEqual([height, height]);
      expect((await bounds(item(page, id, n))).width, `${id}: the element is as wide as what is seen`).toBe(height);
    }
    // With sys.target.touch 0 in a test layer every size touches.
    await page.evaluate(() => {
      for (const stage of document.querySelectorAll<HTMLElement>('[data-fixture^="zero-"]')) stage.style.setProperty('--tanrei-sys-target-touch', '0px');
    });
    for (const size of ['medium', 'large', 'small']) await settled(`zero-${size}`, 3, [0, 0]);
    expect((await bounds(bar(page, 'zero-medium'))).width).toBe(3 * 40 + 2 * pad);
    // A layer with a gap wider than what the targets need: the gap is the space, and nothing is added to it.
    await page.evaluate((name) => (document.querySelector('[data-fixture="wide-gap"]') as HTMLElement).style.setProperty(name, '20px'), T('container-gap-floating'));
    await settled('wide-gap', 3, [20, 20]);
    // The space is the same whatever the pointer: nothing in it reads the input type.
    const before = await along('small', 3);
    const cdp = page.context().browser()?.browserType().name() === 'chromium' ? await page.context().newCDPSession(page) : null;
    if (cdp) {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await along('small', 3)).toEqual(before);
      expect((await along('floating', 4)).apart).toEqual([8, 8, 8]);
    }
    // Right-to-left: the same spaces, mirrored.
    await page.evaluate(() => document.querySelector('[data-fixture="mixed"]')!.setAttribute('dir', 'rtl'));
    await expect.poll(async () => {
      const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(inner(page, 'mixed', n))));
      return boxes.slice(1).map((box, n) => Math.round((boxes[n].x - (box.x + box.width)) * 100) / 100);
    }).toEqual([12, 4, 8]);
    // An item that comes or goes is followed: the fourth medium item removed, the three stand as they did; one added small, 12 from the last.
    await bar(page, 'floating').evaluate((el) => {
      const next = document.createElement('tanrei-button');
      next.setAttribute('variant', 'text');
      next.setAttribute('size', 'small');
      next.setAttribute('label', 'More');
      next.innerHTML = '<span slot="icon" class="tanrei-icon">more_vert</span>';
      el.append(next);
    });
    await settled('floating', 5, [8, 8, 8, 12]);
    await bar(page, 'floating').evaluate((el) => el.firstElementChild!.remove());
    await settled('floating', 4, [8, 8, 12]);
    expect(await item(page, 'floating', 0).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--tanrei-kept-follows')), 'the new first item follows nothing').toBe('');
    // Docked: unchanged — the items spread across the width with container.gap.docked as the least space, and no item
    // is given a margin.
    const dockedGap = await resolveToken(page, T('container-gap-docked'));
    expect(dockedGap).toBe(16);
    for (const id of ['docked', 'docked-small']) {
      const own = await bounds(container(page, id));
      const boxes = await Promise.all([0, 1, 2, 3].map((n) => bounds(inner(page, id, n))));
      const spaces = boxes.slice(1).map((box, n) => box.x - (boxes[n].x + boxes[n].width));
      for (const space of spaces) expect(space, id).toBeCloseTo(spaces[0], 1);
      expect(spaces[0], id).toBeGreaterThanOrEqual(dockedGap);
      expect(spaces[0], `${id}: spread across the width`).toBeCloseTo((own.width - 2 * (boxes[0].x - own.x) - boxes.reduce((sum, box) => sum + box.width, 0)) / 3, 1);
      expect(await bar(page, id).evaluate((el) => [...el.children].map((child) => getComputedStyle(child).marginInlineStart)), id).toEqual(['0px', '0px', '0px', '0px']);
    }
  });
});

test.describe('keyboard and semantics', () => {
  test('TBR-10: one Tab stop — the first enabled item, then the one focused last; Tab leaves the toolbar', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await tabTo(page, item(page, 'docked', 0));
    // Only one item is in the Tab order.
    expect(await bar(page, 'docked').evaluate((el) => [...el.children].map((c) => c.getAttribute('tabindex')))).toEqual(['0', '-1', '-1', '-1']);
    await tab(page);
    // The next Tab stop is the next toolbar's.
    await expect(item(page, 'docked-button', 0)).toBeFocused();
    await tab(page, { back: true });
    await expect(item(page, 'docked', 0)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'docked', 2)).toBeFocused();
    await tab(page);
    await expect(item(page, 'docked-button', 0)).toBeFocused();
    await tab(page, { back: true });
    // Back in at the item focused last.
    await expect(item(page, 'docked', 2)).toBeFocused();
    expect(await bar(page, 'docked').evaluate((el) => [...el.children].map((c) => c.getAttribute('tabindex')))).toEqual(['-1', '-1', '0', '-1']);
  });

  test('TBR-10: Right and Left Arrow move to the next and previous enabled item and wrap, Home and End go to the ends; a disabled item is skipped and never takes focus; moving never activates', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    await tabTo(page, item(page, 'docked-disabled-item', 0));
    await page.keyboard.press('ArrowRight');
    // Delete is disabled: skipped.
    await expect(item(page, 'docked-disabled-item', 2)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'docked-disabled-item', 3)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'docked-disabled-item', 0)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'docked-disabled-item', 3)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(item(page, 'docked-disabled-item', 0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(item(page, 'docked-disabled-item', 3)).toBeFocused();
    // Up and Down are not a row's keys.
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'docked-disabled-item', 3)).toBeFocused();
    expect(await log(page)).toEqual([]);
    expect(await item(page, 'docked-disabled-item', 1).getAttribute('tabindex')).toBeNull();
    // An item that becomes disabled while it is the Tab stop gives the stop to the first enabled item.
    await item(page, 'docked-disabled-item', 3).evaluate((el: any) => (el.disabled = true));
    await expect.poll(() => item(page, 'docked-disabled-item', 0).getAttribute('tabindex')).toBe('0');
    await expect(item(page, 'docked-disabled-item', 3)).not.toHaveAttribute('tabindex');
  });

  test('TBR-10: Enter and Space act on the focused item as that item does — a toggle switches, a Button clicks', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await wire(page);
    await tabTo(page, item(page, 'floating', 0));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(inner(page, 'floating', 1)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(inner(page, 'floating', 1)).toHaveAttribute('aria-pressed', 'false');
    await tabTo(page, item(page, 'docked-button', 0));
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['click:format_italic', 'change:format_italic:true', 'click:format_italic', 'change:format_italic:false', 'click:Send']);
  });

  test('TBR-10: right-to-left mirrors Left and Right; a vertical toolbar moves with Down and Up and ignores Left and Right; a click makes an item the Tab stop', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.evaluate(() => document.querySelector('[data-fixture="floating"]')!.setAttribute('dir', 'rtl'));
    await tabTo(page, item(page, 'floating', 0));
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'floating', 1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'floating', 0)).toBeFocused();
    await tabTo(page, item(page, 'floating-vertical', 0));
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'floating-vertical', 1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'floating-vertical', 1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(item(page, 'floating-vertical', 2)).toBeFocused();
    // Focus that arrives another way — a click, or focus() — moves the Tab stop too.
    await item(page, 'docked', 3).evaluate((el) => (el as HTMLElement).focus());
    await expect.poll(() => item(page, 'docked', 3).getAttribute('tabindex')).toBe('0');
    expect(await item(page, 'docked', 0).getAttribute('tabindex')).toBe('-1');
    expect(await focused(page)).toBe('drive_file_move');
  });

  test('TBR-10: an item added becomes part of the roving order; one removed gets its tabindex back', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const tabindexes = () => bar(page, 'floating-vertical').evaluate((el) => [...el.children].map((c) => c.getAttribute('tabindex')));
    await bar(page, 'floating-vertical').evaluate((el) => {
      const extra = document.createElement('tanrei-button');
      extra.setAttribute('variant', 'text');
      extra.setAttribute('label', 'Layers');
      extra.innerHTML = '<span slot="icon">layers</span>';
      el.append(extra);
    });
    await expect.poll(tabindexes).toEqual(['0', '-1', '-1', '-1']);
    const removed = await bar(page, 'floating-vertical').evaluate(async (el) => {
      const first = el.firstElementChild!;
      first.remove();
      await new Promise(requestAnimationFrame);
      document.body.append(first);
      return first.getAttribute('tabindex');
    });
    expect(removed).toBeNull();
    await expect.poll(tabindexes).toEqual(['0', '-1', '-1']);
  });

  test('TBR-11: a toolbar named by its label, with its orientation; each item keeps its own name, role and state, and the toolbar adds nothing to them', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const formatting = page.getByRole('toolbar', { name: 'Formatting' });
    await expect(formatting).toHaveCount(1);
    await expect(formatting).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(formatting.getByRole('button')).toHaveCount(4);
    await expect(formatting.getByRole('button', { name: 'Bold', pressed: true })).toHaveCount(1);
    await expect(formatting.getByRole('button', { name: 'Italic', pressed: false })).toHaveCount(1);
    await expect(page.getByRole('toolbar', { name: 'Map controls' })).toHaveAttribute('aria-orientation', 'vertical');
    await expect(page.getByRole('toolbar', { name: 'Compose' }).getByRole('button', { name: 'Send' })).toHaveCount(1);
    await expect(page.getByRole('toolbar', { name: 'Message actions' }).first().getByRole('button', { name: 'Delete' })).toBeEnabled();
    await expect(page.getByRole('toolbar', { name: 'Message actions' }).nth(1).getByRole('button', { name: 'Delete' })).toBeDisabled();
    // Nothing added to the items but the roving tabindex.
    const added = await bar(page, 'floating').evaluate((el) => [...el.children].flatMap((c) => c.getAttributeNames().filter((n) => n === 'role' || n.startsWith('aria-'))));
    expect(added).toEqual([]);
    expect(await inner(page, 'floating', 0).evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-pressed')])).toEqual(['Bold', 'true']);
    // The label follows the property.
    await bar(page, 'floating').evaluate((el: any) => (el.label = 'Text'));
    await expect(page.getByRole('toolbar', { name: 'Text', exact: true })).toHaveCount(1);
  });

  test('TBR-12: an empty label still renders and is reported; so is a toolbar with no item, and one holding something that is not an icon button or a Button, which is still laid out', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('unnamed', [a('archive')], { label: '' }),
        fixture('empty', []),
        { id: 'foreign', props: { variant: 'floating', label: 'Foreign' }, content: '<tanrei-button variant="text" label="Pen"><span slot="icon">edit</span></tanrei-button><input class="other" aria-label="Size" /><tanrei-button variant="text" label="Eraser"><span slot="icon">ink_eraser</span></tanrei-button>' },
      ],
    });
    await expect(inner(page, 'unnamed', 0)).toBeVisible();
    await expect(bar(page, 'unnamed')).not.toHaveAttribute('aria-label');
    await expect(bar(page, 'empty')).toBeVisible();
    const [pen, other, eraser] = [await bounds(inner(page, 'foreign', 0)), await bounds(page.locator('[data-fixture="foreign"] .other')), await bounds(inner(page, 'foreign', 2))];
    expect(other.x).toBeGreaterThan(pen.x + pen.width);
    expect(eraser.x).toBeGreaterThan(other.x + other.width);
    // The field keeps its own arrow keys: the toolbar does not take them from it.
    await page.locator('[data-fixture="foreign"] .other').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-fixture="foreign"] .other')).toBeFocused();
    await expect.poll(() => seen.filter((w) => w.includes('TBR-12')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/label is empty, so the toolbar has no accessible name.*\(TBR-12\)/);
    expect(seen.join('\n')).toMatch(/it holds no item; a toolbar holds <tanrei-button> elements \(TBR-12\)/);
    expect(seen.join('\n')).toMatch(/it holds <input>, which is not a <tanrei-button>.*\(TBR-12\)/);
  });

  test('TBR-13: a variant the system does not have renders as docked, an orientation the component does not define as horizontal, and a debug build reports both', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('odd', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'diagonal' }), fixture('sideways', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'floating', orientation: 'sideways' })],
    });
    const own = await bounds(bar(page, 'odd'));
    expect(own.width).toBe(360);
    expect(own.height).toBeCloseTo(await resolveToken(page, T('container-size-docked')), 1);
    expect(await css(container(page, 'odd'), 'background-color')).toBe(await resolveColor(page, T('container-color-docked')));
    const boxes = await Promise.all([0, 1, 2].map((n) => bounds(inner(page, 'sideways', n))));
    for (const box of boxes) expect(box.y).toBeCloseTo(boxes[0].y, 1);
    await expect(bar(page, 'sideways')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect.poll(() => seen.filter((w) => w.includes('TBR-13')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/variant "diagonal" is not a value of the active design system; it is drawn as "docked" \(TBR-13\)/);
    expect(seen.join('\n')).toMatch(/orientation "sideways" is not a value of the toolbar; it is drawn as "horizontal" \(TBR-13\)/);
  });

  test('TBR-13: a variant a layer adds takes the docked structure with its own values, and is not reported', async ({ page }) => {
    const seen = warnings(page);
    const layer = `:root { ${T('container-color-sheet')}: rgb(10, 20, 30); ${T('container-size-sheet')}: 72px; ${T('container-padding-inline-sheet')}: 20px; }`;
    await mountFixtures(page, spec, { icons: true, system: 'layer', systemCss: layer, fixtures: [fixture('sheet', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'sheet' })] });
    const own = await bounds(bar(page, 'sheet'));
    expect([own.width, own.height]).toEqual([360, 72]);
    expect(await css(container(page, 'sheet'), 'background-color')).toBe('rgb(10, 20, 30)');
    const [first, last] = [await bounds(inner(page, 'sheet', 0)), await bounds(inner(page, 'sheet', 2))];
    expect(first.x - own.x).toBeCloseTo(20, 1);
    expect(own.x + own.width - (last.x + last.width)).toBeCloseTo(20, 1);
    // The members it does not set are docked's: the top edge.
    expect(await css(container(page, 'sheet'), 'box-shadow')).toBe(await shadowOf(page, `var(${T('container-elevation-docked')}), inset 0 var(${T('outline-width')}) 0 0 var(${T('outline-color-docked')})`));
    await page.waitForTimeout(100);
    expect(seen.filter((w) => w.includes('TBR-13'))).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(400); // the items' colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });

  test('forced colors: the docked edge and the floating surface are drawn in CanvasText', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true });
    expect(await px(container(page, 'docked'), 'border-top-width')).toBe(await resolveToken(page, T('outline-width')));
    expect(await px(container(page, 'floating'), 'border-left-width')).toBe(await resolveToken(page, T('outline-width')));
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
