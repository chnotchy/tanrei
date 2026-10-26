// <tanrei-toolbar>, driven by specs/toolbar.spec.json: every behaviour id (TBR-1…25) is cited by a test title, every
// fixture has a baseline, and every size, color and edge is read back from the tokens — never from a number written
// here. Its items are the real <tanrei-button>s, icon-only and labelled, so these tests also show that the toolbar leaves
// them as they are (TBR-9).
// TBR-26: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { expectWheelKeptFromPage } from '../../../test/contained-wheel.js';
import { type Fixture, type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, rootTokens, setWords, tab, tabTo } from '../../../test/harness.js';

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
    const sheet = await bar(page, 'docked').evaluate((el) => [(el.constructor as any).styles].flat(Infinity).map((style: { cssText: string }) => style.cssText).join('\n'));
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
    // Nothing but its surface, a slot for each item, the spaces between them (TBR-16) and the box that holds an
    // anchored menu out of the line (TBR-24): no scrim.
    expect(await bar(page, 'floating').evaluate((el) => [...new Set([...el.shadowRoot!.querySelectorAll('*')].map((n) => `${n.localName}.${n.className}`))])).toEqual(['div.container', 'slot.unit', 'span.space', 'span.menus', 'slot.menus-slot']);
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
    expect(seen.join('\n')).toMatch(/a docked toolbar is horizontal; orientation "vertical" is for an inline or a floating toolbar \(TBR-6\)/);
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

  test('TBR-8: with overflow scroll, items that need more length than the toolbar has keep their size and the minimum gap, never wrap, scroll along its axis, and a focused item is brought fully into view; nothing is hidden and nothing is reported', async ({ page }) => {
    const seen = warnings(page);
    const many = GLYPHS.map((g) => a(g));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('crowded', many, { variant: 'docked', overflow: 'scroll' }), fixture('crowded-floating', many, { variant: 'floating', overflow: 'scroll' }), fixture('crowded-vertical', many.slice(0, 7), { variant: 'floating', orientation: 'vertical', overflow: 'scroll' })],
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
    // Nothing is hidden: no overflow button is drawn. The toolbar has its overflow menu now, so nothing is reported.
    for (const id of ['crowded', 'crowded-floating', 'crowded-vertical']) expect(await bar(page, id).evaluate((el) => el.shadowRoot!.querySelector('.overflow')), id).toBeNull();
    expect(seen.filter((w) => w.includes('TBR-8'))).toEqual([]);
  });

  test('TBR-8: a wheel turned on past the end of a toolbar that scrolls, along its axis, and turned again after a pause, leaves the page behind where it was', async ({ page }) => {
    const many = GLYPHS.map((g) => a(g));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('crowded', many, { variant: 'docked', overflow: 'scroll' }), fixture('crowded-vertical', many.slice(0, 7), { variant: 'floating', orientation: 'vertical', overflow: 'scroll' })],
    });
    await page.addStyleTag({ content: `.stage[data-fixture='crowded'] { inline-size: 200px; }` });
    await expect.poll(() => css(container(page, 'crowded'), 'overflow-x')).toBe('auto');
    await expectWheelKeptFromPage(page, container(page, 'crowded'), 'inline');
    await expect.poll(() => css(container(page, 'crowded-vertical'), 'overflow-y')).toBe('auto');
    await expectWheelKeptFromPage(page, container(page, 'crowded-vertical'), 'block');
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
    // The spaces are the container's own elements, one between two items; nothing is written on the items.
    expect(await container(page, 'floating').evaluate((el) => el.querySelectorAll(':scope > .space:not([data-off])').length), 'one space between two items').toBe(3);
    expect(await bar(page, 'floating').evaluate((el) => [...el.children].map((child) => (child as HTMLElement).style.cssText)), 'nothing on the items').toEqual(['', '', '', '']);
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
    const formatting = page.locator('[data-fixture="floating"]').getByRole('toolbar', { name: 'Formatting' });
    await expect(formatting).toHaveCount(1);
    await expect(formatting).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(formatting.getByRole('button')).toHaveCount(4);
    await expect(formatting.getByRole('button', { name: 'Bold', pressed: true })).toHaveCount(1);
    await expect(formatting.getByRole('button', { name: 'Italic', pressed: false })).toHaveCount(1);
    await expect(page.locator('[data-fixture="floating-vertical"]').getByRole('toolbar', { name: 'Map controls' })).toHaveAttribute('aria-orientation', 'vertical');
    await expect(page.locator('[data-fixture="docked-button"]').getByRole('toolbar', { name: 'Compose' }).getByRole('button', { name: 'Send' })).toHaveCount(1);
    await expect(page.getByRole('toolbar', { name: 'Message actions' }).first().getByRole('button', { name: 'Delete' })).toBeEnabled();
    await expect(page.getByRole('toolbar', { name: 'Message actions' }).nth(1).getByRole('button', { name: 'Delete' })).toBeDisabled();
    // Nothing added to the items but the roving tabindex.
    const added = await bar(page, 'floating').evaluate((el) => [...el.children].flatMap((c) => c.getAttributeNames().filter((n) => n === 'role' || n.startsWith('aria-'))));
    expect(added).toEqual([]);
    expect(await inner(page, 'floating', 0).evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-pressed')])).toEqual(['Bold', 'true']);
    // The label follows the property.
    await bar(page, 'floating').evaluate((el: any) => (el.label = 'Text'));
    await expect(page.getByRole('toolbar', { name: 'Text', exact: true })).toHaveCount(1);
    // TBR-22: a group with a label is a group named by it; one without is nothing, its items the toolbar's.
    await expect(page.locator('[data-fixture="inline-formatting"]').getByRole('group', { name: 'Text style' }).getByRole('button')).toHaveCount(3);
    await expect(page.locator('[data-fixture="inline-formatting"] tanrei-toolbar-group').nth(1)).not.toHaveAttribute('role');
  });

  test('TBR-12: an empty label still renders and is reported; so is a toolbar with no item, and one holding something that is none of its item kinds, which is still laid out', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('unnamed', [a('archive')], { label: '' }),
        fixture('empty', [], { variant: 'docked' }),
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
    expect(seen.join('\n')).toMatch(/it holds no item; a toolbar holds <tanrei-button> and <tanrei-button-with-menu> elements, alone or in <tanrei-toolbar-group>s \(TBR-12\)/);
    expect(seen.join('\n')).toMatch(/it holds <input>, which is none of its item kinds.*\(TBR-12\)/);
  });

  test('TBR-13: a variant the system does not have renders as inline, an orientation the component does not define as horizontal, an overflow and a separation it does not define as menu and auto, and a debug build reports each', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('odd', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'diagonal' }),
        fixture('sideways', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'floating', orientation: 'sideways' }),
        fixture('wrapping', GLYPHS.map((g) => a(g)), { overflow: 'wrap', separation: 'dotted' }),
      ],
    });
    // Inline: as long as its items, inline.size high, on inline's (transparent) color.
    const own = await bounds(bar(page, 'odd'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const medium = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    expect(own.width).toBeCloseTo(3 * medium + 2 * kept(await resolveToken(page, T('container-gap-inline')), touch, medium, medium), 1);
    expect(own.height).toBeCloseTo(await resolveToken(page, T('container-size-inline')), 1);
    expect(await css(container(page, 'odd'), 'background-color')).toBe(await resolveColor(page, T('container-color-inline')));
    // An unknown overflow is a menu: what does not fit is hidden behind the overflow button.
    await expect(bar(page, 'wrapping').locator('.overflow')).toBeVisible();
    const boxes = await Promise.all([0, 1, 2].map((n) => bounds(inner(page, 'sideways', n))));
    for (const box of boxes) expect(box.y).toBeCloseTo(boxes[0].y, 1);
    await expect(bar(page, 'sideways')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect.poll(() => seen.filter((w) => w.includes('TBR-13')).length).toBe(4);
    expect(seen.join('\n')).toMatch(/variant "diagonal" is not a value of the active design system; it is drawn as "inline" \(TBR-13\)/);
    expect(seen.join('\n')).toMatch(/overflow "wrap" is not a value of the toolbar; it is drawn as "menu" \(TBR-13\)/);
    expect(seen.join('\n')).toMatch(/separation "dotted" is not a value of the toolbar; it is drawn as "auto" \(TBR-13\)/);
    expect(seen.join('\n')).toMatch(/orientation "sideways" is not a value of the toolbar; it is drawn as "horizontal" \(TBR-13\)/);
  });

  test('TBR-13: a variant a layer adds takes the inline structure with its own values, and is not reported', async ({ page }) => {
    const seen = warnings(page);
    const layer = `:root { ${T('container-color-sheet')}: rgb(10, 20, 30); ${T('container-size-sheet')}: 72px; ${T('container-padding-inline-sheet')}: 20px; }`;
    await mountFixtures(page, spec, { icons: true, system: 'layer', systemCss: layer, fixtures: [fixture('sheet', GLYPHS.slice(0, 3).map((g) => a(g)), { variant: 'sheet' })] });
    const own = await bounds(bar(page, 'sheet'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const medium = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
    // As long as its items (the inline structure), not the stage's width; its own height and color.
    expect(own.width).toBeCloseTo(2 * 20 + 3 * medium + 2 * kept(await resolveToken(page, T('container-gap-inline')), touch, medium, medium), 1);
    expect(own.height).toBe(72);
    expect(await css(container(page, 'sheet'), 'background-color')).toBe('rgb(10, 20, 30)');
    const [first, last] = [await bounds(inner(page, 'sheet', 0)), await bounds(inner(page, 'sheet', 2))];
    expect(first.x - own.x).toBeCloseTo(20, 1);
    expect(own.x + own.width - (last.x + last.width)).toBeCloseTo(20, 1);
    // The members it does not set are inline's: no shadow, and a transparent edge around the whole shape.
    expect(await css(container(page, 'sheet'), 'box-shadow')).toBe(await shadowOf(page, `var(${T('container-elevation-inline')}), inset 0 0 0 var(${T('outline-width')}) var(${T('outline-color-inline')})`));
    await page.waitForTimeout(100);
    expect(seen.filter((w) => w.includes('TBR-13'))).toEqual([]);
  });
});

/** An icon-only text Button, as a product writes one in a toolbar. */
const B = (label: string, glyph: string, extra = '') => `<tanrei-button variant="text" label="${label}"${extra ? ` ${extra}` : ''}><span slot="icon">${glyph}</span></tanrei-button>`;
/** Whether an element is drawn (a hidden item is in no slot that is drawn: its box is empty). */
const drawn = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().width > 0);
const lines = (page: P, id: string) => bar(page, id).locator('.sep:not([data-off])');
const overflowButton = (page: P, id: string) => bar(page, id).locator('.overflow');
const overflowMenu = (page: P, id: string) => bar(page, id).locator('.overflow-menu');

test.describe('inline, groups, separators and the overflow menu', () => {
  test('TBR-17: inline — in place, as long as its items need and never longer than the layout allows; padding-inline.inline at each end, gap.inline between neighbours spaced as a floating toolbar’s, inline.size across; its color, elevation, corners and edge are inline’s (none in the default system); no inset is read and nothing is spread', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const size = await resolveToken(page, T('container-size-inline'));
    const pad = await resolveToken(page, T('container-padding-inline-inline'));
    const gap = await resolveToken(page, T('container-gap-inline'));
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect([size, pad, gap]).toEqual([40, 0, 4]);
    const id = 'inline-formatting';
    const own = await bounds(bar(page, id));
    const stage = await bounds(page.locator(`[data-fixture="${id}"]`));
    expect(own.height).toBeCloseTo(size, 1);
    expect(own.x).toBe(stage.x);
    expect(own.width, 'as long as its items, not the stage').toBeLessThan(stage.width);
    // The first group: three medium icon-only Buttons, each pair as far apart as their targets need (8), more than the gap.
    const group = bar(page, id).locator('tanrei-toolbar-group').first().locator('tanrei-button');
    const boxes = await Promise.all([0, 1, 2].map((n) => bounds(group.nth(n).locator('button'))));
    expect(boxes[0].x - own.x).toBeCloseTo(pad, 1);
    for (const n of [1, 2]) expect(boxes[n].x - (boxes[n - 1].x + boxes[n - 1].width)).toBeCloseTo(kept(gap, touch, boxes[n - 1].width, boxes[n].width), 1);
    expect(boxes[1].x - (boxes[0].x + boxes[0].width)).toBeCloseTo(8, 1);
    for (const box of boxes) expect(box.y + box.height / 2).toBeCloseTo(own.y + own.height / 2, 1);
    // No surface of its own in the default system.
    const surface = container(page, id);
    expect(await css(surface, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(surface, 'background-color')).toBe(await resolveColor(page, T('container-color-inline')));
    expect(await css(surface, 'box-shadow')).toBe(await shadowOf(page, `var(${T('container-elevation-inline')}), inset 0 0 0 var(${T('outline-width')}) var(${T('outline-color-inline')})`));
    expect(await resolveColor(page, T('outline-color-inline'))).toBe('rgba(0, 0, 0, 0)');
    expect(await px(surface, 'border-top-left-radius')).toBe(await resolveToken(page, T('container-shape-inline')));
    // No inset reaches it, and it does not position itself.
    await bar(page, id).evaluate((el) => el.setAttribute('style', '--_inset-bottom: 34px; --_inset-left: 12px; --_inset-right: 20px'));
    expect(await bounds(bar(page, id))).toEqual(own);
    expect(await css(bar(page, id), 'position')).toBe('static');
    // Never longer than the layout allows: in a 200-wide box it is 200 wide at most.
    await page.addStyleTag({ content: `.stage[data-fixture='${id}'] { inline-size: 200px; }` });
    await expect.poll(async () => (await bounds(bar(page, id))).width).toBeLessThanOrEqual(200);
    // Vertical: the items in a column, inline.size wide.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('inline-vertical', GLYPHS.slice(0, 3).map((g) => a(g)), { orientation: 'vertical' })] });
    await page.addStyleTag({ content: `.stage[data-fixture='inline-vertical'] { block-size: 240px !important; }` });
    await expect.poll(() => drawn(item(page, 'inline-vertical', 2))).toBe(true);
    const column = await Promise.all([0, 1, 2].map((n) => bounds(inner(page, 'inline-vertical', n))));
    for (const box of column) expect(box.x).toBeCloseTo(column[0].x, 1);
    expect(column[1].y - (column[0].y + column[0].height)).toBeCloseTo(kept(gap, touch, column[0].height, column[1].height), 1);
    expect((await bounds(bar(page, 'inline-vertical'))).width).toBeCloseTo(size, 1);
    await expect(bar(page, 'inline-vertical')).toHaveAttribute('aria-orientation', 'vertical');
  });

  test('TBR-18: items that do not fit are hidden from the end, one at a time, skipping those whose overflow is never; the overflow button — an icon-only text Button showing more_horiz (more_vert in a column), named by overflowLabel or the product’s words, a button that opens a menu — stands after the last item that remains; right-to-left from the right', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures.filter((f) => f.id.includes('overflow')),
        fixture('unnamed-overflow', GLYPHS.map((g) => a(g))),
        fixture('column-overflow', GLYPHS.slice(0, 7).map((g) => a(g)), { orientation: 'vertical', overflowLabel: 'More actions' }),
      ],
    });
    await page.addStyleTag({ content: `.stage[data-fixture='unnamed-overflow'] { inline-size: 240px; } .stage[data-fixture='column-overflow'] { block-size: 200px; display: block; }` });
    for (const id of ['inline-overflow', 'rtl-inline-overflow']) {
      const stage = await bounds(page.locator(`[data-fixture="${id}"]`));
      const shown = await Promise.all(GLYPHS.slice(0, 8).map((_, n) => drawn(item(page, id, n))));
      // Hidden from the end: the first ones stay, in order.
      const count = shown.filter(Boolean).length;
      expect(shown, id).toEqual(GLYPHS.slice(0, 8).map((_, n) => n < count));
      expect(count, id).toBeGreaterThan(0);
      expect(count, id).toBeLessThan(8);
      const button = overflowButton(page, id);
      await expect(button, id).toBeVisible();
      const own = await bounds(button);
      const last = await bounds(inner(page, id, count - 1));
      if (id.startsWith('rtl')) {
        expect(own.x + own.width, `${id}: after the last item, to its left`).toBeLessThanOrEqual(last.x + 0.5);
        expect(own.x).toBeGreaterThanOrEqual(stage.x - 0.5);
      } else {
        expect(own.x, `${id}: after the last item`).toBeGreaterThanOrEqual(last.x + last.width - 0.5);
        expect(own.x + own.width).toBeLessThanOrEqual(stage.x + stage.width + 0.5);
      }
      // One more item would not fit beside the button: it hides as few as it must.
      const medium = await resolveToken(page, '--tanrei-comp-button-container-height-medium');
      const touch = await resolveToken(page, '--tanrei-sys-target-touch');
      expect(count * medium + count * kept(4, touch, medium, medium) + medium).toBeLessThanOrEqual(stage.width + 0.5);
      expect((count + 1) * medium + (count + 1) * kept(4, touch, medium, medium) + medium).toBeGreaterThan(stage.width);
      // The Button it is: icon-only, text, medium, the glyph more_horiz; named, and a button that opens a menu.
      await expect(button).toHaveAttribute('variant', 'text');
      await expect(button).toHaveAttribute('size', 'medium');
      await expect(button.locator('[slot="icon"]')).toHaveText('more_horiz');
      const native = button.locator('button');
      await expect(native).toHaveAttribute('aria-label', 'More actions');
      await expect(native).toHaveAttribute('aria-haspopup', 'menu');
      await expect(native).toHaveAttribute('aria-expanded', 'false');
      // Neither the toolbar nor its items change size across its axis.
      expect((await bounds(bar(page, id))).height).toBeCloseTo(await resolveToken(page, T('container-size-inline')), 1);
    }
    // Send is never hidden: the items before it are.
    const pinned = 'inline-overflow-pinned';
    const send = page.locator(`[data-fixture="${pinned}"] tanrei-button`, { hasText: 'Send' });
    await expect(send).toBeVisible();
    expect(await drawn(item(page, pinned, 4))).toBe(false);
    expect(await drawn(item(page, pinned, 0))).toBe(true);
    // A column: more_vert, the items hidden from the bottom.
    await expect(overflowButton(page, 'column-overflow').locator('[slot="icon"]')).toHaveText('more_vert');
    expect(await drawn(item(page, 'column-overflow', 6))).toBe(false);
    // No overflow label and no word: drawn and working, unnamed, and the missing word reported once.
    await expect(overflowButton(page, 'unnamed-overflow')).toBeVisible();
    await expect.poll(() => missingWords(page)).toContain('toolbarOverflowLabel');
    expect(seen.filter((w) => w.includes('toolbarOverflowLabel') && w.includes('TBR-18'))).toHaveLength(1);
    await setWords(page, { toolbarOverflowLabel: 'More' });
    await expect(overflowButton(page, 'unnamed-overflow').locator('button')).toHaveAttribute('aria-label', 'More');
    // Room again: every item comes back and the button goes.
    await page.addStyleTag({ content: `.stage[data-fixture='inline-overflow'] { inline-size: 600px !important; }` });
    await expect.poll(() => drawn(item(page, 'inline-overflow', 7))).toBe(true);
    await expect(overflowButton(page, 'inline-overflow')).toBeHidden();
  });

  test('TBR-18, TBR-19: in a parent as long as its content — an inline-block, two of them nested, a flex item, a float, an absolutely placed box, a box in a shadow root — the items hidden come back when the layout offers more room further up, in the frame it does, and go again when it offers less', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'inline-overflow') });
    const result = await page.evaluate(async () => {
      const errors: string[] = [];
      window.addEventListener('error', (event) => errors.push(event.message));
      // A box of the product's whose shadow root lays out what it is given in an inline-block.
      if (!customElements.get('shrink-wrap-probe')) {
        customElements.define(
          'shrink-wrap-probe',
          class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' }).innerHTML = '<div style="display:inline-block;max-inline-size:100%"><slot></slot></div>';
            }
          },
        );
      }
      const glyphs = ['archive', 'delete', 'mark_email_unread', 'drive_file_move', 'label', 'flag', 'snooze', 'print', 'share', 'star'];
      const make = () => {
        const toolbar = document.createElement('tanrei-toolbar');
        toolbar.setAttribute('label', 'Actions');
        toolbar.setAttribute('overflow-label', 'More actions');
        toolbar.innerHTML = glyphs.map((g) => `<tanrei-button variant="text" label="${g}"><span slot="icon">${g}</span></tanrei-button>`).join('');
        return toolbar;
      };
      const box = (tag: string, style: string) => Object.assign(document.createElement(tag), { style });
      const shrinkWrapped = 'display:inline-block;max-inline-size:100%';
      // Each case puts a parent as long as its content in the box whose length the test changes, and returns it.
      const cases: Record<string, (holder: HTMLElement) => HTMLElement> = {
        'inline-block': (holder) => holder.appendChild(box('div', shrinkWrapped)),
        nested: (holder) => holder.appendChild(box('span', shrinkWrapped)).appendChild(box('div', shrinkWrapped)),
        'flex item': (holder) => {
          holder.style.display = 'flex';
          return holder.appendChild(box('div', 'flex:0 1 auto;min-inline-size:0'));
        },
        float: (holder) => {
          holder.style.display = 'flow-root';
          return holder.appendChild(box('div', 'float:inline-start;max-inline-size:100%'));
        },
        absolute: (holder) => {
          holder.style.position = 'relative';
          holder.style.blockSize = '64px';
          return holder.appendChild(box('div', 'position:absolute;inset-block-start:0;inset-inline-start:0;max-inline-size:100%'));
        },
        'shadow root': (holder) => holder.appendChild(document.createElement('shrink-wrap-probe')),
      };
      const count = (toolbar: Element) => [...toolbar.children].filter((child) => child.getBoundingClientRect().width > 0).length;
      const frame = () => new Promise<number>(requestAnimationFrame);
      const out: Record<string, { at240: number; at600: number; settled600: number; length600: number; at320: number; again600: number }> = {};
      for (const [name, place] of Object.entries(cases)) {
        const holder = document.createElement('div');
        holder.style.inlineSize = '240px';
        document.body.append(holder);
        const toolbar = make();
        place(holder).append(toolbar);
        await frame();
        await frame();
        const at240 = count(toolbar);
        // Each count is read in the frame after the change: it is already the final one (TBR-19).
        holder.style.inlineSize = '600px';
        await frame();
        const at600 = count(toolbar);
        await frame();
        await frame();
        const settled600 = count(toolbar);
        const length600 = Math.round(toolbar.getBoundingClientRect().width);
        holder.style.inlineSize = '320px';
        await frame();
        const at320 = count(toolbar);
        holder.style.inlineSize = '600px';
        await frame();
        const again600 = count(toolbar);
        out[name] = { at240, at600, settled600, length600, at320, again600 };
        holder.remove();
      }
      return { out, errors };
    });
    for (const [name, seen] of Object.entries(result.out)) {
      const at = `${name} ${JSON.stringify(seen)}`;
      expect(seen.at240, `${at}: 240 hides some`).toBeLessThan(10);
      expect(seen.at240, at).toBeGreaterThan(0);
      expect(seen.at600, `${at}: 600 shows every item, in the next frame`).toBe(10);
      expect(seen.settled600, at).toBe(10);
      expect(seen.length600, `${at}: no longer than its items`).toBeLessThan(600);
      expect(seen.at320, `${at}: 320 hides some again`).toBeLessThan(10);
      expect(seen.at320, at).toBeGreaterThanOrEqual(seen.at240);
      expect(seen.again600, at).toBe(10);
    }
    expect(result.errors).toEqual([]);
  });

  test('TBR-19: what is hidden is decided before the first frame and in the frame the length changes — no item is drawn and then hidden, nothing moves for it, and nothing is animated', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'inline-overflow') });
    const result = await page.evaluate(async () => {
      // Hiding an item in the observer's callback is no change the observer reports again: no loop error.
      const errors: string[] = [];
      window.addEventListener('error', (event) => errors.push(event.message));
      const holder = document.createElement('div');
      holder.style.inlineSize = '600px';
      document.body.append(holder);
      const glyphs = ['archive', 'delete', 'mark_email_unread', 'drive_file_move', 'label', 'flag', 'snooze', 'print', 'share', 'star'];
      const make = () => {
        const toolbar = document.createElement('tanrei-toolbar');
        toolbar.setAttribute('label', 'Actions');
        toolbar.setAttribute('overflow-label', 'More actions');
        toolbar.innerHTML = glyphs.map((g) => `<tanrei-button variant="text" label="${g}"><span slot="icon">${g}</span></tanrei-button>`).join('');
        return toolbar;
      };
      const count = (toolbar: Element) => [...toolbar.children].filter((child) => child.getBoundingClientRect().width > 0).length;
      const frame = () => new Promise<number>(requestAnimationFrame);
      // First frame: inserted in a narrow box.
      holder.style.inlineSize = '240px';
      const toolbar = make();
      holder.append(toolbar);
      await frame();
      const first = count(toolbar);
      await frame();
      await frame();
      const settled = count(toolbar);
      // Width changes: 600 → 320 → 600, each in a frame; the count read in the next frame is already the final one.
      const shifts: number[] = [];
      const observer = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('layout-shift') ? new PerformanceObserver((list) => list.getEntries().forEach((entry) => shifts.push((entry as PerformanceEntry & { value: number }).value))) : null;
      observer?.observe({ type: 'layout-shift' });
      const heights = new Set<number>();
      const steps: [number, number, number][] = [];
      for (const width of [600, 320, 600]) {
        holder.style.inlineSize = `${width}px`;
        await frame();
        const now = count(toolbar);
        heights.add(Math.round(toolbar.getBoundingClientRect().height));
        await frame();
        await frame();
        steps.push([width, now, count(toolbar)]);
      }
      observer?.disconnect();
      const animations = toolbar.shadowRoot!.getAnimations?.().length ?? 0;
      holder.remove();
      return { first, settled, steps, shifts: shifts.reduce((sum, value) => sum + value, 0), heights: [...heights], animations, layoutShift: !!observer, errors };
    });
    expect(result.first, 'the first frame shows what the last one does').toBe(result.settled);
    expect(result.settled).toBeLessThan(10);
    for (const [width, now, later] of result.steps) expect(now, `${width}`).toBe(later);
    expect(result.steps[0][1]).toBe(10);
    expect(result.steps[1][1]).toBeLessThan(10);
    expect(result.heights).toHaveLength(1);
    expect(result.animations).toBe(0);
    expect(result.errors).toEqual([]);
    if (browserName === 'chromium') {
      expect(result.layoutShift).toBe(true);
      expect(result.shifts).toBe(0);
    }
  });

  test('TBR-20: the overflow button opens a Tanrei Menu anchored to it, bottom-end, with the hidden items in reading order — an action as an item with its label and icon, disabled while it is; a toggle as a checkbox item with its state; a menu button as a submenu of its menu’s items; a Button with menu as its main action and a submenu named by its menuLabel; groups and separators as the menu’s separation — and a row does what the item does, once, from that item, and closes the menu', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        {
          id: 'everything',
          props: { label: 'Editor', overflowLabel: 'More actions' },
          content: [
            B('Undo', 'undo'),
            `<tanrei-toolbar-group label="Text style">${B('Bold', 'format_bold', 'toggle selected')}${B('Italic', 'format_italic', 'toggle')}</tanrei-toolbar-group>`,
            `<tanrei-toolbar-group>${B('Insert link', 'link')}${B('Insert image', 'image', 'disabled')}</tanrei-toolbar-group>`,
            '<tanrei-divider></tanrei-divider>',
            `${B('Sort', 'sort', 'id="everything-sort"')}<tanrei-menu anchor="everything-sort"><tanrei-menu-item label="Name"></tanrei-menu-item><tanrei-menu-item label="Size"></tanrei-menu-item></tanrei-menu>`,
            '<tanrei-button-with-menu label="Save" menu-label="More save options" variant="tonal"><tanrei-menu-item slot="menu" label="Save as"></tanrei-menu-item></tanrei-button-with-menu>',
          ].join(''),
        },
      ],
    });
    await page.addStyleTag({ content: `.stage[data-fixture='everything'] { inline-size: 120px; margin-inline-start: 400px; }` });
    const id = 'everything';
    await expect(overflowButton(page, id)).toBeVisible();
    await page.evaluate(() => {
      const log: string[] = ((window as any).log = []);
      const toolbar = document.querySelector('[data-fixture="everything"] tanrei-toolbar')!;
      for (const el of toolbar.querySelectorAll('tanrei-button, tanrei-button-with-menu, tanrei-menu-item')) {
        el.addEventListener('click', (event) => log.push(`click:${el.getAttribute('label')}:${event.target === el}`));
        el.addEventListener('change', (e) => log.push(`change:${el.getAttribute('label')}:${(e as CustomEvent).detail.selected}`));
      }
      // What the overflow menu's own rows fire must not reach the page: only the hidden item's own events do.
      for (const type of ['click', 'change', 'toggle']) toolbar.addEventListener(type, (event) => {
        if (event.composedPath().some((node) => (node as Element).classList?.contains('overflow-menu'))) log.push(`leak:${type}`);
      });
    });
    await overflowButton(page, id).click();
    const menu = overflowMenu(page, id);
    await expect(menu).toHaveAttribute('open', '');
    await expect(overflowButton(page, id).locator('button')).toHaveAttribute('aria-expanded', 'true');
    // Bottom-end: below the button, the end edges aligned.
    const [button, surface] = [await bounds(overflowButton(page, id)), await bounds(menu.locator('.surface').first())];
    expect(surface.y).toBeGreaterThanOrEqual(button.y + button.height - 0.5);
    expect(surface.x + surface.width).toBeCloseTo(button.x + button.width, 0);
    // The rows, in reading order, a group of the menu for each run between two lines.
    const rows = await menu.evaluate((el) =>
      [...el.children].map((group) => [...group.children].map((row) => `${row.localName}:${row.getAttribute('label')}:${row.getAttribute('leading-icon') ?? ''}:${row.hasAttribute('checked') ? 'checked' : ''}:${row.hasAttribute('disabled') ? 'disabled' : ''}:${row.children.length}`)),
    );
    const hidden = await bar(page, id).evaluate((el) => [...el.querySelectorAll('tanrei-button, tanrei-button-with-menu')].filter((item) => item.getBoundingClientRect().width === 0).map((item) => item.getAttribute('label')));
    expect(hidden.length).toBeGreaterThanOrEqual(5);
    expect(rows.flat().map((row) => row.split(':')[1])).toEqual(hidden.flatMap((label) => (label === 'Save' ? ['Save', 'More save options'] : [label])));
    const all = rows.flat();
    expect(all).toContain('tanrei-menu-checkbox-item:Italic:format_italic:::0');
    if (hidden.includes('Bold')) expect(all).toContain('tanrei-menu-checkbox-item:Bold:format_bold:checked::0');
    expect(all).toContain('tanrei-menu-item:Insert link:link:::0');
    expect(all).toContain('tanrei-menu-item:Insert image:image::disabled:0');
    expect(all).toContain('tanrei-submenu:Sort:sort:::2');
    expect(all).toContain('tanrei-menu-item:Save::::0');
    expect(all).toContain('tanrei-submenu:More save options::::1');
    // The separator and the groups part the rows: Sort and Save stand in a run of their own after the separator.
    expect(rows.at(-1)!.map((row) => row.split(':')[1])).toEqual(['Sort', 'Save', 'More save options']);
    // A row does what its item does: Insert link's own click, once, from that item; the menu closes.
    await menu.locator('tanrei-menu-item[label="Insert link"]').click();
    await expect(menu).not.toHaveAttribute('open');
    expect(await page.evaluate(() => (window as any).log)).toEqual(['click:Insert link:true']);
    // A toggle's row switches the toggle, which fires its own click and change.
    await overflowButton(page, id).click();
    await menu.locator('tanrei-menu-checkbox-item[label="Italic"]').click();
    expect(await page.evaluate(() => (window as any).log)).toEqual(['click:Insert link:true', 'click:Italic:true', 'change:Italic:true']);
    await expect(bar(page, id).locator('tanrei-button[label="Italic"]')).toHaveAttribute('selected', '');
    // The Button with menu's main action is its leading half's click.
    await overflowButton(page, id).click();
    await menu.locator('tanrei-menu-item[label="Save"]').click();
    expect((await page.evaluate(() => (window as any).log)).at(-1)).toBe('click:Save:true');
    // A row of the menu button's menu activates the row it repeats.
    await overflowButton(page, id).click();
    await menu.locator('tanrei-submenu[label="Sort"]').click();
    await menu.locator('tanrei-submenu[label="Sort"] tanrei-menu-item[label="Size"]').click();
    expect((await page.evaluate(() => (window as any).log)).at(-1)).toBe('click:Size:true');
    // The rows' own events never reach the toolbar's listeners.
    expect((await page.evaluate(() => (window as any).log as string[])).filter((entry) => entry.startsWith('leak:'))).toEqual([]);
  });

  test('TBR-21: the item that was the Tab stop, or had focus, hands both to the overflow button when it is hidden; the overflow button is the last stop of the arrow keys', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('narrowing', GLYPHS.map((g) => a(g)), { overflowLabel: 'More actions' })] });
    await page.addStyleTag({ content: `.stage[data-fixture='narrowing'] { inline-size: 600px; }` });
    await expect.poll(() => drawn(item(page, 'narrowing', 9))).toBe(true);
    await tabTo(page, item(page, 'narrowing', 0));
    await page.keyboard.press('End');
    await expect(item(page, 'narrowing', 9)).toBeFocused();
    await page.addStyleTag({ content: `.stage[data-fixture='narrowing'] { inline-size: 200px !important; }` });
    const button = overflowButton(page, 'narrowing');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('tabindex', '0');
    await expect(item(page, 'narrowing', 9)).not.toHaveAttribute('tabindex');
    // The last stop: Home goes to the first item, End back to the overflow button, Right wraps to the first.
    await page.keyboard.press('Home');
    await expect(item(page, 'narrowing', 0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(button).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'narrowing', 0)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(button).toBeFocused();
    // Enter opens the menu; Escape closes it and focus comes back to the button.
    await page.keyboard.press('Enter');
    await expect(overflowMenu(page, 'narrowing')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(overflowMenu(page, 'narrowing')).not.toHaveAttribute('open');
    await expect(button).toBeFocused();
  });

  test('TBR-22, TBR-23: a group’s items are laid out in the toolbar’s line; two groups — or a group and an item — are set apart by a line divider.thickness thick, divider.length long, in divider.color, group.gap from each side, exposed as a separator and never a stop; a separator item is drawn the same; never at either end, never two side by side; under gap, twice group.gap of empty space', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures.filter((f) => f.id === 'inline-formatting' || f.id === 'inline-separation-gap'),
        { id: 'edges', props: { label: 'Edges' }, content: `<tanrei-divider></tanrei-divider><tanrei-toolbar-group>${B('Bold', 'format_bold')}</tanrei-toolbar-group><tanrei-divider></tanrei-divider><tanrei-toolbar-group>${B('Italic', 'format_italic')}</tanrei-toolbar-group><tanrei-divider></tanrei-divider>` },
      ],
    });
    const thickness = await resolveToken(page, T('divider-thickness'));
    const length = await resolveToken(page, T('divider-length'));
    const space = await resolveToken(page, T('group-gap'));
    expect([thickness, length, space]).toEqual([1, 24, 8]);
    const id = 'inline-formatting';
    await expect(lines(page, id)).toHaveCount(2);
    const own = await bounds(bar(page, id));
    const items = bar(page, id).locator('tanrei-button');
    await expect(items).toHaveCount(6);
    const boxes = await Promise.all([0, 1, 2, 3, 4, 5].map((n) => bounds(items.nth(n).locator('button'))));
    // One line, in order; every item centred across it.
    for (const n of [1, 2, 3, 4, 5]) expect(boxes[n].x).toBeGreaterThan(boxes[n - 1].x + boxes[n - 1].width - 0.5);
    for (const box of boxes) expect(box.y + box.height / 2).toBeCloseTo(own.y + own.height / 2, 1);
    // The line between the groups: after Underline (2) and before Insert link (3).
    const line = lines(page, id).first();
    const drawnLine = await line.evaluate((el) => {
      const style = getComputedStyle(el, '::before');
      return { width: Number.parseFloat(style.borderInlineStartWidth), height: Number.parseFloat(style.blockSize), color: style.borderInlineStartColor };
    });
    expect(drawnLine.width).toBe(thickness);
    expect(drawnLine.height).toBe(length);
    expect(drawnLine.color).toBe(await resolveColor(page, T('divider-color')));
    // The line's box is the space on each side and the line between: group.gap, thickness, group.gap.
    const lineBox = await bounds(line);
    expect(lineBox.x).toBeCloseTo(boxes[2].x + boxes[2].width, 1);
    expect(lineBox.width).toBeCloseTo(2 * space + thickness, 1);
    expect(boxes[3].x).toBeCloseTo(lineBox.x + lineBox.width, 1);
    expect(await line.evaluate((el) => getComputedStyle(el).paddingInlineStart)).toBe(`${space}px`);
    // The separator item: drawn the same, between Insert image (4) and Clear formatting (5).
    const second = await bounds(lines(page, id).nth(1));
    expect(second.x).toBeCloseTo(boxes[4].x + boxes[4].width, 1);
    expect(boxes[5].x).toBeCloseTo(second.x + second.width, 1);
    // Exposed as separators, across the axis; never a stop of the arrow keys.
    await expect(page.locator(`[data-fixture="${id}"]`).getByRole('separator')).toHaveCount(2);
    await expect(lines(page, id).first()).toHaveAttribute('aria-orientation', 'vertical');
    await tabTo(page, items.nth(0));
    for (let n = 1; n < 6; n += 1) {
      await page.keyboard.press('ArrowRight');
      await expect(items.nth(n)).toBeFocused();
    }
    // Never at either end, never two side by side.
    await expect(lines(page, 'edges')).toHaveCount(1);
    // Gap: no line, and twice group.gap between the groups.
    const gapItems = bar(page, 'inline-separation-gap').locator('tanrei-button');
    const [underline, link] = [await bounds(gapItems.nth(2).locator('button')), await bounds(gapItems.nth(3).locator('button'))];
    expect(link.x - (underline.x + underline.width)).toBeCloseTo(2 * space, 1);
    expect(await lines(page, 'inline-separation-gap').first().evaluate((el) => getComputedStyle(el, '::before').display)).toBe('none');
    // The system's choice by default; the attribute over it.
    await bar(page, id).evaluate((el) => el.setAttribute('separation', 'gap'));
    await expect.poll(() => lines(page, id).first().evaluate((el) => getComputedStyle(el, '::before').display)).toBe('none');
    await override(page, { '--tanrei-sys-behavior-separation': 'gap' });
    await bar(page, id).evaluate((el) => el.setAttribute('separation', 'divider'));
    await expect.poll(() => lines(page, id).first().evaluate((el) => getComputedStyle(el, '::before').display)).not.toBe('none');
    // A divider, a group and a Menu anchored to an item are kinds of the toolbar: nothing is reported.
    expect(seen.filter((w) => w.includes('TBR-12'))).toEqual([]);
  });

  test('TBR-24: a menu button stays an item of the arrow keys; its Menu is neither laid out nor counted; while it is open its keys are the Menu’s, and when it closes focus returns to the anchor, which stays the Tab stop', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'inline-menu-button') });
    const id = 'inline-menu-button';
    const sort = bar(page, id).locator('tanrei-button').nth(1);
    const menu = bar(page, id).locator('tanrei-menu');
    await page.evaluate(() => {
      const toolbar = document.querySelector('[data-fixture="inline-menu-button"] tanrei-toolbar')!;
      const menu = toolbar.querySelector('tanrei-menu') as HTMLElement & { open: boolean };
      toolbar.querySelectorAll('tanrei-button')[1].addEventListener('click', () => (menu.open = !menu.open));
      menu.addEventListener('close', () => (menu.open = false));
    });
    // Not laid out: the three items stand as three items do.
    const boxes = await Promise.all([0, 1, 2].map((n) => bounds(bar(page, id).locator('tanrei-button').nth(n).locator('button'))));
    expect(boxes[1].x - (boxes[0].x + boxes[0].width)).toBeCloseTo(8, 1);
    expect(boxes[2].x - (boxes[1].x + boxes[1].width)).toBeCloseTo(8, 1);
    await tabTo(page, bar(page, id).locator('tanrei-button').first());
    await page.keyboard.press('ArrowRight');
    await expect(sort).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.locator('tanrei-menu-item').first()).toBeFocused();
    // The Menu's keys: Down moves within it, not the toolbar.
    await page.keyboard.press('ArrowDown');
    await expect(menu.locator('tanrei-menu-item').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(menu.locator('tanrei-menu-item').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open');
    await expect(sort).toBeFocused();
    await expect(sort).toHaveAttribute('tabindex', '0');
  });

  test('TBR-25, SPB-33: each half of a Button with menu is a stop of its own, the leading half first, each with its own name, role and state; the toolbar keeps one Tab stop', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'inline-button-with-menu') });
    const id = 'inline-button-with-menu';
    await page.evaluate(() => document.body.append(Object.assign(document.createElement('button'), { textContent: 'After' })));
    const save = bar(page, id).locator('tanrei-button-with-menu');
    const leading = save.locator('button.leading');
    const trailing = save.locator('button.trailing');
    await expect(page.locator(`[data-fixture="${id}"]`).getByRole('button', { name: 'Save', exact: true })).toHaveCount(1);
    await expect(page.locator(`[data-fixture="${id}"]`).getByRole('button', { name: 'More save options' })).toHaveAttribute('aria-haspopup', 'menu');
    await tabTo(page, item(page, id, 0));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(leading).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(trailing).toBeFocused();
    expect(await Promise.all([leading.getAttribute('tabindex'), trailing.getAttribute('tabindex')])).toEqual(['-1', '0']);
    await page.keyboard.press('ArrowRight');
    await expect(item(page, id, 0)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(trailing).toBeFocused();
    // One Tab stop: out and back in at the trailing half.
    await tab(page);
    await expect(trailing).not.toBeFocused();
    await tab(page, { back: true });
    await expect(trailing).toBeFocused();
    // Out of the toolbar, both halves are Tab stops again (SPB-17).
    await page.evaluate(() => document.body.append(document.querySelector('[data-fixture="inline-button-with-menu"] tanrei-button-with-menu')!));
    const moved = page.locator('body > tanrei-button-with-menu');
    await expect.poll(() => moved.locator('button.leading').getAttribute('tabindex')).toBeNull();
    expect(await moved.locator('button.trailing').getAttribute('tabindex')).toBeNull();
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
