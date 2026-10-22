// <tanrei-segmented-button> and <tanrei-segment>, driven by specs/segmented-button.spec.json: every behaviour id
// (SEG-1…25) is cited by a test title, every fixture has a baseline, and every state, condition and choice of kind is read
// back from the tokens — never from a number written here.
// SEG-29: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import {
  type Fixture,
  type FixtureItem,
  acmeSystemCss,
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
import { opticalSizeAxis } from '../../../test/icons.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('segmented-button');
type P = Page;
const set = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-segmented-button`);
const segs = (page: P, id: string) => set(page, id).locator('tanrei-segment');
const seg = (page: P, id: string, n: number) => segs(page, id).nth(n);
const btn = (page: P, id: string, n: number) => seg(page, id, n).locator('.container');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
/**
 * The element's computed `property` once every transition and animation running on it has reached its end on its own
 * timeline. A color read mid-transition can serialize like its end value (Firefox writes an interpolated color in the end
 * value's space, alpha already rounded to it) and differ from it in the last digit a frame later.
 */
const settledCss = (locator: Locator, property: string) =>
  locator.evaluate(async (el, p) => {
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
    return getComputedStyle(el).getPropertyValue(p);
  }, property);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-segmented-button-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** A shadow resolved through a real property, as the browser serializes it. */
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);

// Segments, as a fixture lists them.
const s = (value: string, label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'segment', props: { value, label, ...props } });
const DWM = [s('day', 'Day'), s('week', 'Week'), s('month', 'Month')];
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { label: 'Range', ...props }, items });

/** Logs every change the sets fire, with the detail it carried and what the set held when it fired. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const r of document.querySelectorAll<any>('tanrei-segmented-button')) {
      r.addEventListener('change', (e: CustomEvent) => log.push('values' in e.detail ? `[${e.detail.values.join(',')}]:[${r.values.join(',')}]` : `${e.detail.value}:${r.value}`));
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const focused = (page: P) =>
  page.evaluate(() => {
    const active = document.activeElement as any;
    return active?.localName === 'tanrei-segment' ? active.value : (active?.id ?? null);
  });

/** What a segment draws: its container, elevation, label, icon (or check) and opacity. */
const drawn = (page: P, id: string, n: number) =>
  seg(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const c = getComputedStyle(root.querySelector('.container')!);
    const glyph = root.querySelector('.glyph');
    return { bg: c.backgroundColor, shadow: c.boxShadow, label: c.color, icon: glyph ? getComputedStyle(glyph).color : null, opacity: c.opacity };
  });
const expected = async (page: P, condition: 'unselected' | 'selected', state = '', glyph = true) => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    shadow: await resolveShadow(page, name('container-elevation')),
    label: await resolveColor(page, name('label-color')),
    icon: glyph ? await resolveColor(page, name('icon-color')) : null,
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};

test.describe('selection', () => {
  test('SEG-1: single — a pointer, Enter, Space or segment.click() on another enabled segment selects it and emits change once; the selected segment changes and emits nothing', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('r', DWM, { selection: 'single', value: 'week' })] });
    await wire(page);
    await btn(page, 'r', 0).click();
    await btn(page, 'r', 0).click(); // already selected: nothing
    await seg(page, 'r', 2).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await seg(page, 'r', 1).focus();
    await page.keyboard.press('Space');
    await seg(page, 'r', 0).evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['day:day', 'month:month', 'week:week', 'day:day']);
    await expect(btn(page, 'r', 0)).toHaveAttribute('aria-checked', 'true');
    for (const n of [1, 2]) await expect(btn(page, 'r', n)).toHaveAttribute('aria-checked', 'false');
    // The product sets value: no change.
    await set(page, 'r').evaluate((el: any) => (el.value = 'month'));
    await expect(btn(page, 'r', 2)).toHaveAttribute('aria-checked', 'true');
    await expect(btn(page, 'r', 0)).toHaveAttribute('aria-checked', 'false');
    expect(await log(page)).toHaveLength(4);
  });

  test('SEG-2: multiple — each activation adds or removes the segment’s value and emits change once with the new values, which may become empty', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('m', [s('a', 'A'), s('b', 'B'), s('c', 'C')], { selection: 'multiple', values: ['a'] })] });
    await wire(page);
    await btn(page, 'm', 1).click();
    await seg(page, 'm', 2).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await btn(page, 'm', 0).click();
    await seg(page, 'm', 1).evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['[a,b]:[a,b]', '[a,b,c]:[a,b,c]', '[a,b]:[a,b]', '[b]:[b]', '[]:[]']);
    for (const n of [0, 1, 2]) await expect(btn(page, 'm', n)).toHaveAttribute('aria-pressed', 'false');
    await set(page, 'm').evaluate((el: any) => (el.values = ['c']));
    await expect(btn(page, 'm', 2)).toHaveAttribute('aria-pressed', 'true');
    expect(await log(page)).toHaveLength(5);
  });

  test('SEG-3: a disabled segment is never selected or cleared, emits nothing, is skipped by the arrows, is never the Tab stop and is exposed as disabled', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...spec.fixtures, fixture('m', [s('a', 'A'), s('b', 'B', { disabled: true }), s('c', 'C')], { selection: 'multiple', values: ['b'] })],
    });
    await wire(page);
    const month = seg(page, 'disabled', 2);
    await expect(btn(page, 'disabled', 2)).toBeDisabled();
    await expect(page.locator('[data-fixture="disabled"]').getByRole('radio', { name: 'Month' })).toBeDisabled();
    await btn(page, 'disabled', 2).click({ force: true });
    await month.evaluate((el) => (el as HTMLElement).click());
    await month.dispatchEvent('click');
    // A selected disabled segment is not cleared (multiple), and a disabled one is not selected (single).
    await btn(page, 'm', 1).click({ force: true });
    expect(await log(page)).toEqual([]);
    await expect(btn(page, 'm', 1)).toHaveAttribute('aria-pressed', 'true');
    // The arrows skip it: Week → (Month skipped) → Day.
    await seg(page, 'disabled', 1).focus();
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('day');
    // A selected segment that is disabled is not the Tab stop: the first enabled segment is.
    await expect(btn(page, 'selected-disabled', 2)).toHaveAttribute('aria-checked', 'true');
    await expect(btn(page, 'selected-disabled', 0)).toHaveAttribute('tabindex', '0');
    await expect(btn(page, 'selected-disabled', 2)).toBeDisabled();
  });

  test('SEG-12: the selected segment — the first with the value — is drawn from the selected condition, the others from the unselected; a value naming no segment selects nothing; empty and repeated values are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fixture('none', DWM, { value: 'year' }),
        fixture('odd', [s('', 'Empty'), s('x', 'First x'), s('x', 'Second x')], { value: 'x' }),
        fixture('many', [s('a', 'A'), s('b', 'B'), s('c', 'C')], { selection: 'multiple', values: ['a', 'zzz', 'c'] }),
      ],
    });
    await expect.poll(() => drawn(page, 'single', 1)).toEqual(await expected(page, 'selected'));
    await expect.poll(() => drawn(page, 'single', 0)).toEqual(await expected(page, 'unselected'));
    await expect.poll(() => drawn(page, 'multiple', 3)).toEqual(await expected(page, 'selected'));
    await expect.poll(() => drawn(page, 'multiple', 2)).toEqual(await expected(page, 'unselected'));
    await expect(segs(page, 'none').locator('.container.selected')).toHaveCount(0);
    await expect(seg(page, 'odd', 0)).toBeVisible();
    await expect(btn(page, 'odd', 1)).toHaveAttribute('aria-checked', 'true');
    await expect(btn(page, 'odd', 2)).toHaveAttribute('aria-checked', 'false');
    await expect(btn(page, 'many', 0)).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'many', 1)).toHaveAttribute('aria-pressed', 'false');
    await expect(btn(page, 'many', 2)).toHaveAttribute('aria-pressed', 'true');
    const text = () => seen.filter((w) => w.includes('SEG-12')).join('\n');
    await expect.poll(() => seen.filter((w) => w.includes('SEG-12')).length).toBe(4);
    expect(text()).toMatch(/the value "year" names no segment; nothing is selected for it \(SEG-12\)/);
    expect(text()).toMatch(/the value "zzz" names no segment/);
    expect(text()).toMatch(/segment 1 \("Empty"\) has an empty value/);
    expect(text()).toMatch(/the value "x" is given to more than one segment; the first of them is the one it selects/);
  });
});

test.describe('keyboard and semantics', () => {
  test('SEG-18: single — one Tab stop, the selected segment or the first enabled one; the arrows move, wrap over enabled segments and select; Home and End; mirrored in RTL', async ({ page }) => {
    const items = [s('a', 'A'), s('b', 'B', { disabled: true }), s('c', 'C'), s('d', 'D')];
    await mountFixtures(page, spec, { fixtures: [fixture('r', items, { value: 'c' }), fixture('none', [s('x', 'X', { disabled: true }), s('y', 'Y'), s('z', 'Z')])] });
    await page.evaluate(() => document.body.prepend(Object.assign(document.createElement('button'), { id: 'before', textContent: 'Before' })));
    await wire(page);
    await expect(btn(page, 'r', 2)).toHaveAttribute('tabindex', '0');
    for (const n of [0, 3]) await expect(btn(page, 'r', n)).toHaveAttribute('tabindex', '-1');
    await expect(btn(page, 'none', 1)).toHaveAttribute('tabindex', '0');
    await page.locator('#before').focus();
    await tab(page);
    expect(await focused(page)).toBe('c');
    const order: string[] = [];
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'Home', 'End']) {
      await page.keyboard.press(key);
      order.push((await focused(page)) as string);
    }
    expect(order).toEqual(['d', 'a', 'c', 'a', 'd', 'a', 'd']);
    expect((await log(page)).filter((entry) => !entry.startsWith('['))).toEqual(['d:d', 'a:a', 'c:c', 'a:a', 'd:d', 'a:a', 'd:d']);
    await expect(btn(page, 'r', 3)).toHaveAttribute('tabindex', '0');
    // Tab leaves the set: it is one stop.
    await tab(page);
    expect(await focused(page)).not.toBe('a');
    expect(['a', 'c', 'd']).not.toContain(await focused(page));
    // Right-to-left: Left Arrow is next, Right Arrow previous.
    await page.locator('[data-fixture="r"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await seg(page, 'r', 3).focus();
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('a');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('d');
  });

  test('SEG-19: multiple — one Tab stop, the last focused segment, else the first selected, else the first enabled; the arrows only move; Space and Enter switch; mirrored in RTL', async ({ page }) => {
    const items = [s('a', 'A'), s('b', 'B'), s('c', 'C', { disabled: true }), s('d', 'D')];
    await mountFixtures(page, spec, { fixtures: [fixture('m', items, { selection: 'multiple', values: ['b', 'd'] }), fixture('empty', [s('x', 'X', { disabled: true }), s('y', 'Y')], { selection: 'multiple' })] });
    await page.evaluate(() => document.body.prepend(Object.assign(document.createElement('button'), { id: 'before', textContent: 'Before' })));
    await wire(page);
    await expect(btn(page, 'm', 1)).toHaveAttribute('tabindex', '0');
    await expect(btn(page, 'empty', 1)).toHaveAttribute('tabindex', '0');
    await page.locator('#before').focus();
    await tab(page);
    expect(await focused(page)).toBe('b');
    const order: string[] = [];
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'End', 'Home']) {
      await page.keyboard.press(key);
      order.push((await focused(page)) as string);
    }
    expect(order).toEqual(['d', 'a', 'b', 'a', 'd', 'd', 'a']);
    expect(await log(page)).toEqual([]);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['[b,d,a]:[b,d,a]', '[d,a]:[d,a]']);
    // The last focused segment is the Tab stop.
    await expect(btn(page, 'm', 1)).toHaveAttribute('tabindex', '0');
    await page.locator('#before').focus();
    await seg(page, 'm', 3).focus();
    await expect(btn(page, 'm', 3)).toHaveAttribute('tabindex', '0');
    await expect(btn(page, 'm', 1)).toHaveAttribute('tabindex', '-1');
    await page.locator('[data-fixture="m"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await page.keyboard.press('ArrowLeft');
    expect(await focused(page)).toBe('a');
    await page.keyboard.press('ArrowRight');
    expect(await focused(page)).toBe('d');
  });

  test('SEG-20: single is a radio group of radios, multiple a group of toggle buttons; each named by its label, drawn or not, with its position; the glyphs, check, dividers and outline hidden', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await expect(page.getByRole('radiogroup', { name: 'Range' })).toHaveCount(6);
    await expect(page.getByRole('radiogroup', { name: 'Text alignment' })).toHaveCount(1);
    const single = page.locator('[data-fixture="single"]');
    await expect(single.getByRole('radio', { name: 'Week', checked: true })).toHaveCount(1);
    await expect(single.getByRole('radio', { name: 'Day', checked: false })).toHaveCount(1);
    await expect(btn(page, 'single', 1)).toHaveAttribute('aria-posinset', '2');
    await expect(btn(page, 'single', 1)).toHaveAttribute('aria-setsize', '3');
    // Icon-only: named by its label, which is not drawn.
    await expect(page.locator('[data-fixture="icon-only"]').getByRole('radio', { name: 'Align left' })).toHaveCount(1);
    await expect(seg(page, 'icon-only', 0).locator('.label')).toHaveCount(0);
    // Multiple: a group of toggle buttons, whose positions its list gives.
    const multiple = page.locator('[data-fixture="multiple"]');
    await expect(page.getByRole('group', { name: 'Days' })).toHaveCount(1);
    await expect(multiple.getByRole('button', { name: 'Tue', pressed: true })).toHaveCount(1);
    await expect(multiple.getByRole('button', { name: 'Wed', pressed: false })).toHaveCount(1);
    await expect(multiple.getByRole('list')).toHaveCount(1);
    await expect(seg(page, 'multiple', 2)).toHaveAttribute('role', 'listitem');
    await expect(seg(page, 'multiple', 2)).toHaveAttribute('aria-posinset', '3');
    await expect(seg(page, 'multiple', 2)).toHaveAttribute('aria-setsize', '4');
    await expect(multiple.getByRole('radio')).toHaveCount(0);
    // Decorative parts.
    await expect(seg(page, 'icons', 1).locator('.lead')).toHaveAttribute('aria-hidden', 'true');
    await expect(seg(page, 'icons', 1).locator('.divider')).toHaveAttribute('aria-hidden', 'true');
    await expect(seg(page, 'icons', 1).locator('.sizer')).toHaveAttribute('aria-hidden', 'true');
    // The outline is a pseudo-element: nothing to announce. The accessible names carry no glyph names.
    const snapshot = await page.locator('[data-fixture="icons"]').ariaSnapshot();
    expect(snapshot).not.toMatch(/grid_view|view_list|check(?!ed)/);
  });
});

test.describe('layout', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  test('SEG-13: one row in a set at least the size’s height, filled with set.color, set.shape corners, the outline inside its edge over the segments, the segments inset by set.padding; end segments’ outer corners are the set’s less the padding, the others container.shape', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino', icons: true });
    const inner = set(page, 'single').locator('.set');
    const [padding, shape, containerShape, outline] = await Promise.all(['set-padding', 'set-shape', 'container-shape', 'outline-width'].map((n) => resolveToken(page, T(n))));
    expect(padding).toBeGreaterThan(0); // cupertino insets its segments in a track
    for (const size of ['small', 'medium', 'large']) {
      const id = size === 'medium' ? 'single' : size;
      expect((await bounds(set(page, id))).height).toBeGreaterThanOrEqual((await resolveToken(page, T(`container-height-${size}`))) - 0.5);
    }
    expect(await css(inner, 'background-color')).toBe(await resolveColor(page, T('set-color')));
    const smooth = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    const scale = smooth ? 1 + 0.4 * Number(await token(page, '--tanrei-sys-shape-corner-smoothing')) : 1;
    expect(Number.parseFloat(await css(inner, 'border-top-left-radius'))).toBeCloseTo(shape * scale, 1);
    expect(await css(inner, 'border-top-width', '::after')).toBe(`${outline}px`);
    expect(await css(inner, 'border-top-color', '::after')).toBe(await resolveColor(page, T('outline-color')));
    expect(Number(await css(inner, 'z-index', '::after'))).toBeGreaterThan(Number((await css(seg(page, 'single', 1), 'z-index')) || 0));
    // One row, inset by the padding.
    const [r, a, b, c] = [await bounds(set(page, 'single')), await bounds(seg(page, 'single', 0)), await bounds(seg(page, 'single', 1)), await bounds(seg(page, 'single', 2))];
    expect([a.y, b.y, c.y]).toEqual([expect.closeTo(r.y + padding, 1), expect.closeTo(r.y + padding, 1), expect.closeTo(r.y + padding, 1)]);
    expect(a.x).toBeCloseTo(r.x + padding, 1);
    expect(c.x + c.width).toBeCloseTo(r.x + r.width - padding, 1);
    expect(a.height).toBeCloseTo(r.height - 2 * padding, 1);
    // The first segment's outer (left) corners are the set's less the padding; its inner ones container.shape.
    const first = btn(page, 'single', 0);
    const segScale = scale;
    expect(Number.parseFloat(await css(first, 'border-top-left-radius'))).toBeCloseTo((shape - padding) * segScale, 1);
    expect(Number.parseFloat(await css(first, 'border-bottom-left-radius'))).toBeCloseTo((shape - padding) * segScale, 1);
    expect(Number.parseFloat(await css(first, 'border-top-right-radius'))).toBeCloseTo(containerShape * segScale, 1);
    expect(Number.parseFloat(await css(btn(page, 'single', 2), 'border-bottom-right-radius'))).toBeCloseTo((shape - padding) * segScale, 1);
    expect(Number.parseFloat(await css(btn(page, 'single', 1), 'border-top-left-radius'))).toBeCloseTo(containerShape * segScale, 1);
    // The set clips nothing (a segment's elevation shows outside it).
    expect(await css(inner, 'overflow')).toBe('visible');
    // In the default system, the segments meet the edge under the outline and the set has no fill.
    await mountFixtures(page, spec);
    expect(await css(set(page, 'single').locator('.set'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    const [dr, da] = [await bounds(set(page, 'single')), await bounds(seg(page, 'single', 0))];
    expect([da.x, da.y]).toEqual([expect.closeTo(dr.x, 1), expect.closeTo(dr.y, 1)]);
    expect(dr.height).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
  });

  test('SEG-14: every segment is as wide as the widest content (measured as if selected) plus the padding; selecting never changes a width; more room is shared equally; less room is shared equally and labels wrap, every segment growing to the tallest', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        { ...fixture('wide', DWM, { value: 'week' }), id: 'wide' },
        fixture('narrow', [s('a', 'A label that is long enough to wrap'), s('b', 'B'), s('c', 'C')], { value: 'b' }),
      ],
    });
    await page.addStyleTag({ content: '[data-fixture="wide"] tanrei-segmented-button { inline-size: 380px; } [data-fixture="narrow"] tanrei-segmented-button { inline-size: 240px; }' });
    const [pad, gap, check] = await Promise.all(['container-padding-inline-medium', 'container-gap-medium', 'check-size-medium'].map((n) => resolveToken(page, T(n))));
    const widths = async (id: string) => Promise.all([0, 1, 2].map(async (n) => (await bounds(seg(page, id, n))).width));
    const natural = await widths('single-none');
    expect(new Set(natural.map((w) => w.toFixed(1))).size).toBe(1);
    // The widest is Month, measured with the check: padding, check, gap, label, padding.
    const month = await seg(page, 'single-none', 2).locator('.label').evaluate((el) => el.getBoundingClientRect().width);
    expect(natural[0]).toBeCloseTo(pad + check + gap + month + pad, 0);
    // Selecting a segment (the check comes) changes no width.
    await set(page, 'single-none').evaluate((el: any) => (el.value = 'month'));
    await page.waitForTimeout(400);
    expect(await widths('single-none')).toEqual(natural);
    // More room: shared equally.
    const wide = await widths('wide');
    expect(new Set(wide.map((w) => w.toFixed(1))).size).toBe(1);
    expect(wide[0]).toBeGreaterThan(natural[0]);
    // Less room: shared equally, the long label wraps, every segment as tall as the tallest, with padding-block around it.
    const narrow = await widths('narrow');
    expect(new Set(narrow.map((w) => w.toFixed(1))).size).toBe(1);
    const heights = await Promise.all([0, 1, 2].map(async (n) => (await bounds(seg(page, 'narrow', n))).height));
    expect(new Set(heights.map((h) => h.toFixed(1))).size).toBe(1);
    const label = await bounds(seg(page, 'narrow', 0).locator('.label'));
    const line = Number.parseFloat(await css(seg(page, 'narrow', 0).locator('.label'), 'line-height'));
    expect(label.height).toBeGreaterThan(line * 1.5);
    const block = await resolveToken(page, T('container-padding-block-medium'));
    expect(heights[0]).toBeGreaterThanOrEqual(label.height + 2 * block - 0.5);
    expect(await css(seg(page, 'narrow', 0).locator('.label'), 'text-overflow')).not.toBe('ellipsis');
  });

  test('SEG-15: the content is centred, glyph first; the label in the size’s label style and its condition’s color; the icon at the size’s icon size in the icon color and the family and fill of its condition', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const size of ['small', 'medium', 'large']) {
      const id = size === 'medium' ? 'single' : size;
      expect(await css(seg(page, id, 0).locator('.label'), 'font-size'), size).toBe(`${await resolveToken(page, T(`label-typescale-${size}-font-size`))}px`);
    }
    const [b, icon, label] = [await bounds(btn(page, 'icons', 0)), await bounds(seg(page, 'icons', 0).locator('.icon')), await bounds(seg(page, 'icons', 0).locator('.label'))];
    expect(icon.x).toBeLessThan(label.x);
    expect(icon.width).toBeCloseTo(await resolveToken(page, T('icon-size-medium')), 1);
    // Centred: the space before the glyph equals the space after the label.
    expect(icon.x - b.x).toBeCloseTo(b.x + b.width - (label.x + label.width), 0);
    expect(icon.y + icon.height / 2).toBeCloseTo(label.y + label.height / 2, 0);
    expect(await css(seg(page, 'icons', 0).locator('.icon'), 'color')).toBe(await resolveColor(page, T('unselected-icon-color')));
    expect(await css(seg(page, 'icons', 0).locator('.label'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    const fill = (id: string, n: number) => css(seg(page, id, n).locator('.icon'), '--tanrei-icon-fill').then((v) => v.trim());
    const family = (id: string, n: number) => css(seg(page, id, n).locator('.icon'), '--tanrei-icon-family').then((v) => v.trim());
    expect(await fill('icon-only', 1)).toBe(await token(page, '--tanrei-sys-icon-fill-selected'));
    expect(await fill('icon-only', 0)).toBe(await token(page, '--tanrei-sys-icon-fill-unselected'));
    expect(await family('icon-only', 1)).toBe(await token(page, '--tanrei-sys-icon-family-selected'));
    expect(await css(seg(page, 'icon-only', 1).locator('.icon'), 'color')).toBe(await resolveColor(page, T('selected-icon-color')));
  });

  test('SEG-16: a selected segment with a drawn label shows the check before it, in place of its icon, at the check size in the selected icon color; an icon-only one keeps its icon; check size 0 draws none and reserves no room; the change takes the selection motion, at once where motion is reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const shown = (id: string, n: number, part: string) => css(seg(page, id, n).locator(part), 'opacity').then(Number);
    await expect.poll(() => shown('single', 1, '.check')).toBe(1);
    expect(await shown('single', 0, '.check')).toBe(0);
    expect((await bounds(seg(page, 'single', 1).locator('.check'))).width).toBeCloseTo(await resolveToken(page, T('check-size-medium')), 1);
    expect(await css(seg(page, 'single', 1).locator('.check'), 'color')).toBe(await resolveColor(page, T('selected-icon-color')));
    await expect(btn(page, 'single', 1)).toHaveClass(/checked/);
    await expect.poll(() => shown('icons', 1, '.check')).toBe(1);
    expect(await shown('icons', 1, '.icon')).toBe(0);
    expect(await shown('icons', 0, '.icon')).toBe(1);
    // Icon-only: the icon stays and no check is drawn.
    await expect(btn(page, 'icon-only', 1)).not.toHaveClass(/checked/);
    expect(await shown('icon-only', 1, '.icon')).toBe(1);
    // An unselected segment without an icon keeps no room for the check: its label is centred.
    const [b, l] = [await bounds(btn(page, 'single', 0)), await bounds(seg(page, 'single', 0).locator('.label'))];
    expect(l.x - b.x).toBeCloseTo(b.x + b.width - (l.x + l.width), 0);
    // The selection motion.
    const duration = await resolveToken(page, T('motion-selection-duration'), 'duration');
    expect(Number.parseFloat(await css(seg(page, 'single', 0).locator('.lead'), 'transition-duration')) * 1000).toBeCloseTo(duration, 0);
    // The change of condition is marked on the container for two frames only (markConditionChange), so the mark and the
    // timing it gives are read in the same task as the change, once the set and the segment have updated — a separate
    // round trip can land after those two frames on a loaded machine and find the mark already gone.
    const change = await set(page, 'single').evaluate(async (el: any) => {
      el.value = 'day';
      await el.updateComplete;
      const segment = el.querySelector('tanrei-segment');
      await segment.updateComplete;
      const container = segment.shadowRoot.querySelector('.container');
      return { marked: container.getAttribute('data-condition-change'), duration: getComputedStyle(container).transitionDuration };
    });
    expect(change.marked).not.toBeNull();
    expect(Number.parseFloat(change.duration) * 1000).toBeCloseTo(duration, 0);
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await set(page, 'single').evaluate((el: any) => (el.value = 'month'));
    expect(await css(seg(page, 'single', 2).locator('.lead'), 'transition-duration')).toBe('0s');
    expect(await shown('single', 2, '.check')).toBe(1);
    // cupertino sets the check size to 0: no check and no room for one; the icon stays.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mountFixtures(page, spec, { system: 'cupertino', icons: true });
    expect(await resolveToken(page, T('check-size-medium'))).toBe(0);
    await expect(btn(page, 'single', 1)).not.toHaveClass(/checked/);
    await expect(seg(page, 'single', 1).locator('.check')).toHaveCount(0);
    const [cb, cl] = [await bounds(btn(page, 'single', 1)), await bounds(seg(page, 'single', 1).locator('.label'))];
    expect(cl.x - cb.x).toBeCloseTo(cb.x + cb.width - (cl.x + cl.width), 0);
    expect(await shown('icons', 1, '.icon')).toBe(1);
  });

  test('SEG-16: the check is the icon set’s check, in the selected family and fill at comp.segmented-button.check.weight (heavier than sys.icon.weight in the default system), never mirrored — under acme in its selected family; no mark of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const check = seg(page, 'single', 1).locator('.check');
    await expect(check).toHaveText('check');
    await expect(check).toHaveAttribute('data-drawn', '');
    const probe = (property: string, value: string) =>
      page.evaluate(([p, v]) => {
        const el = document.createElement('div');
        el.style.setProperty(p, v);
        document.body.append(el);
        const out = getComputedStyle(el).getPropertyValue(p);
        el.remove();
        return out;
      }, [property, value] as const);
    expect(await css(check, 'font-family')).toBe(await probe('font-family', 'var(--tanrei-sys-icon-family-selected)'));
    const axis = await opticalSizeAxis(page, await resolveToken(page, T('check-size-medium')));
    expect(await css(check, 'font-variation-settings')).toBe(await probe('font-variation-settings', `'FILL' var(--tanrei-sys-icon-fill-selected), 'wght' var(${T('check-weight')}), 'GRAD' 0${axis}`));
    // The check is a control's own mark: in the default system it is drawn at the checkbox's mark weight, heavier than
    // sys.icon.weight, which a segment's icon keeps.
    const [checkWeight, iconWeight] = [Number(await token(page, T('check-weight'))), Number(await token(page, '--tanrei-sys-icon-weight'))];
    expect(checkWeight).toBe(Number(await token(page, '--tanrei-comp-checkbox-mark-weight')));
    expect(checkWeight).toBeGreaterThan(iconWeight);
    expect(await css(seg(page, 'icons', 0).locator('.icon'), 'font-variation-settings')).toContain(`"wght" ${iconWeight}`);
    expect(Number.parseFloat(await css(check, 'font-size'))).toBe(await resolveToken(page, T('check-size-medium')));
    // No path, shape or character of its own, in any segment.
    for (const n of [0, 1, 2]) expect(await seg(page, 'single', n).evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, img, canvas').length)).toBe(0);
    // Not mirrored in a right-to-left layout: laid out left to right, neither flipped nor scaled.
    await set(page, 'single').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await css(check, 'direction')).toBe('ltr');
    expect(await css(check, 'transform')).toBe('none');
    expect(await css(check, 'scale')).toBe('none');
    // Under acme, whose icon set is static, the check is in acme's selected family.
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), icons: true });
    const families = (value: string) => value.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
    const selected = families(await token(page, '--tanrei-sys-icon-family-selected'));
    expect(selected).not.toEqual(families(await token(page, '--tanrei-sys-icon-family-unselected')));
    expect(families(await css(seg(page, 'single', 1).locator('.check'), 'font-family'))).toEqual(selected);
  });

  test('SEG-25: while the icon set cannot draw the check nothing is drawn in its place — never its name — the room SEG-14 measured is kept and the selection exposed; the check appears without the selection motion once the font arrives', async ({ page }) => {
    await mountFixtures(page, spec);
    await withoutIconFont(page);
    const size = await resolveToken(page, T('check-size-medium'));
    const check = seg(page, 'single', 1).locator('.check');
    await expect(check).not.toHaveAttribute('data-drawn');
    // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
    expect(await check.locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeGreaterThan(size * 1.5);
    expect(await css(check, 'visibility')).toBe('hidden');
    expect((await bounds(check)).width).toBeCloseTo(size, 1);
    await expect(set(page, 'single').getByRole('radio', { name: 'Week', checked: true })).toHaveCount(1);
    const widths = async () => Promise.all([0, 1, 2].map(async (n) => (await bounds(seg(page, 'single', n))).width));
    const [before, label] = [await widths(), await bounds(seg(page, 'single', 1).locator('.label'))];
    // A slow selection motion: an appearing check that faded would still be fading when read.
    await override(page, { [T('motion-selection-duration')]: '60000ms' });
    await iconFaceArrives(page);
    await expect(check).toHaveAttribute('data-drawn', '');
    expect(await css(check, 'visibility')).toBe('visible');
    expect(await css(check, 'opacity')).toBe('1');
    expect(await check.evaluate((el) => el.getAnimations().length), 'without motion').toBe(0);
    expect(await widths(), 'no width changes').toEqual(before);
    expect(await bounds(seg(page, 'single', 1).locator('.label')), 'the label does not move').toEqual(label);
  });

  test('SEG-17: a divider of divider.width in divider.color in the gap between neighbours, from the set’s top padding to its bottom padding, whatever the state or condition, hidden from assistive technology', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    const [width, padding] = await Promise.all([resolveToken(page, T('divider-width')), resolveToken(page, T('set-padding'))]);
    await expect(seg(page, 'single', 0).locator('.divider')).toHaveCount(0);
    const d = seg(page, 'single', 1).locator('.divider');
    const [db, a, b, r] = [await bounds(d), await bounds(seg(page, 'single', 0)), await bounds(seg(page, 'single', 1)), await bounds(set(page, 'single'))];
    expect(db.width).toBeCloseTo(width, 1);
    expect(db.x).toBeCloseTo(a.x + a.width, 1);
    expect(db.x + db.width).toBeCloseTo(b.x, 1);
    expect(db.y).toBeCloseTo(r.y + padding, 1);
    expect(db.y + db.height).toBeCloseTo(r.y + r.height - padding, 1);
    await expect(d).toHaveAttribute('aria-hidden', 'true');
    // Beside a disabled segment dimmed by its opacity, the divider keeps its color and full opacity.
    await override(page, { [T('disabled-opacity')]: '0.3' });
    const beside = seg(page, 'disabled', 2).locator('.divider');
    expect(await css(beside, 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    await expect.poll(() => css(btn(page, 'disabled', 2), 'opacity')).toBe('0.3');
    expect(await beside.evaluate((el) => getComputedStyle(el).opacity === '1' && getComputedStyle(el.getRootNode() instanceof ShadowRoot ? (el.getRootNode() as ShadowRoot).host : el).opacity === '1')).toBe(true);
  });

  test('SEG-21: right-to-left orders the segments from the right, puts the glyph to the right of the label and applies the paddings by start and end; a ripple still grows from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like', icons: true });
    await page.locator('main').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const [a, b] = [await bounds(seg(page, 'icons', 0)), await bounds(seg(page, 'icons', 1))];
    expect(a.x).toBeGreaterThan(b.x);
    const [icon, label] = [await bounds(seg(page, 'icons', 0).locator('.icon')), await bounds(seg(page, 'icons', 0).locator('.label'))];
    expect(icon.x).toBeGreaterThan(label.x);
    // The first segment's outer corners are on its right.
    const first = btn(page, 'icons', 0);
    expect(Number.parseFloat(await css(first, 'border-top-right-radius'))).toBeGreaterThan(Number.parseFloat(await css(first, 'border-top-left-radius')));
    // A press near the right edge of a segment grows the ripple from there.
    const box = await bounds(btn(page, 'icons', 2));
    await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2);
    await page.mouse.down();
    const x = await btn(page, 'icons', 2)
      .locator('.ripple')
      .evaluate((el) => Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width);
    await page.mouse.up();
    expect(x).toBeGreaterThan(0.8);
  });

  test('SEG-22: an empty label, a hidden label without an icon, an empty set label and fewer than two or more than five segments still render, and a debug build reports each', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('r', [s('a', ''), s('b', 'Bare', { labelHidden: true }), s('c', 'C')], { label: '' }),
        fixture('one', [s('a', 'A')]),
        fixture('six', 'abcdef'.split('').map((c) => s(c, c.toUpperCase()))),
      ],
    });
    await expect(segs(page, 'r')).toHaveCount(3);
    for (const n of [0, 1, 2]) await expect(seg(page, 'r', n)).toBeVisible();
    await expect(seg(page, 'r', 1).locator('.label')).toHaveText('Bare');
    await expect(seg(page, 'one', 0)).toBeVisible();
    await expect(segs(page, 'six')).toHaveCount(6);
    const text = () => seen.filter((w) => w.includes('SEG-22')).join('\n');
    await expect.poll(() => seen.filter((w) => w.includes('SEG-22')).length).toBe(5);
    expect(text()).toMatch(/segment 1 \(value "a"\) has an empty label, so it has no accessible name/);
    expect(text()).toMatch(/segment 2 \("Bare"\) hides its label but has no icon, so its label is drawn anyway/);
    expect(text()).toMatch(/label is empty, so the set has no accessible name/);
    expect(text()).toMatch(/it holds 1 segments; it is made for 2 to 5/);
    expect(text()).toMatch(/it holds 6 segments; it is made for 2 to 5/);
  });

  test('SEG-24: a selected segment casts its condition’s elevation outside itself and above its neighbours (cupertino raises it; the default raises none); the set draws nothing else outside itself', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    const elevation = await resolveShadow(page, T('selected-container-elevation'));
    await expect.poll(() => css(btn(page, 'single', 1), 'box-shadow')).toBe(elevation);
    const shadow = await css(btn(page, 'single', 1), 'box-shadow');
    expect(shadow).not.toMatch(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)$/);
    expect(Number(await css(seg(page, 'single', 1), 'z-index'))).toBeGreaterThan(Number((await css(seg(page, 'single', 0), 'z-index')).replace('auto', '0')));
    expect(await css(set(page, 'single').locator('.set'), 'overflow')).toBe('visible');
    // The focus ring is drawn inside the segment, not outside the set.
    await tabTo(page, seg(page, 'single', 1));
    expect(await css(btn(page, 'single', 1), 'outline-offset')).toBe(`${-(await resolveToken(page, '--tanrei-sys-focus-outer-width'))}px`);
    await mountFixtures(page, spec);
    expect(await css(btn(page, 'single', 1), 'box-shadow')).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level0'));
  });
});

test.describe('states, press, target, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('SEG-4: each state renders the segment from that state’s tokens of its condition; pointer focus is not the focused state (default system)', async ({ page }) => {
    const icons = spec.fixtures.find((f) => f.id === 'icons')!;
    for (const [n, condition] of [
      [0, 'unselected'],
      [1, 'selected'],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: [icons] });
      await page.mouse.move(0, 0);
      await expect.poll(() => drawn(page, 'icons', n), condition).toEqual(await expected(page, condition));
      await btn(page, 'icons', n).hover();
      await expect.poll(() => drawn(page, 'icons', n), `${condition} hovered`).toEqual(await expected(page, condition, 'hovered'));
      await page.mouse.down();
      await expect.poll(() => drawn(page, 'icons', n), `${condition} pressed`).toEqual(await expected(page, condition, 'pressed'));
      await page.mouse.up();
      await page.mouse.move(0, 0);
      // The click selected it (single); the pointer focused it, which is not the focused state.
      await expect.poll(() => drawn(page, 'icons', n), `${condition} pointer focus`).toEqual(await expected(page, 'selected'));
      // Keyboard focus, in a multiple-choice set (the arrows do not select there).
      await mountFixtures(page, spec, { icons: true, fixtures: [{ ...icons, props: { selection: 'multiple', values: ['grid'], label: 'View' } }] });
      await tabTo(page, seg(page, 'icons', 1));
      if (n !== 1) await page.keyboard.press('ArrowLeft');
      await expect.poll(() => drawn(page, 'icons', n), `${condition} focused`).toEqual(await expected(page, condition, 'focused'));
    }
  });

  test('SEG-4: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(btn(page, 'single', 1), 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((st) => resolveColor(page, T(`selected-${st}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await btn(page, 'single', 1).hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, seg(page, 'single', 1)); // hovered AND keyboard-focused: focused wins
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('SEG-5: keyboard focus shows the ring inside the segment, above the set’s outline and its neighbours, without animation; pointer focus does not', async ({ page }) => {
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await btn(page, 'single', 0).click();
    await expect(btn(page, 'single', 0)).toHaveCSS('outline-style', 'none');
    expect(await css(seg(page, 'single', 0), 'z-index')).not.toBe('3');
    await tabTo(page, seg(page, 'single', 0));
    const b = btn(page, 'single', 0);
    await expect(b).toHaveCSS('outline-style', 'solid');
    await expect(b).toHaveCSS('outline-offset', `${-outer}px`);
    expect(await css(b, 'top', '::after')).toBe(`${outer}px`);
    expect(await css(b, 'transition-property')).not.toContain('outline');
    // Above the outline (z-index 2 in the set) and above a selected neighbour (1).
    expect(await css(seg(page, 'single', 0), 'z-index')).toBe('3');
    expect(Number(await css(set(page, 'single').locator('.set'), 'z-index', '::after'))).toBeLessThan(3);
    // The ring's corners follow the segment's own (the outer ones rounded, the inner ones square).
    const radius = Number.parseFloat(await css(b, 'border-top-left-radius'));
    expect(Number.parseFloat(await css(b, 'border-top-left-radius', '::after'))).toBeCloseTo(Math.max(0, radius - outer), 1);
    expect(await css(b, 'border-top-right-radius', '::after')).toBe('0px');
  });

  test('SEG-6: each segment’s hit area reaches the minimum target above and below the set without changing its size, and each segment is at least the target wide — pointer, and touch for a coarse pointer', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const b = await bounds(btn(page, 'icon-only', 1));
    expect(b.height).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
    expect(b.width).toBeGreaterThanOrEqual(pointer - 0.5);
    const target = await btn(page, 'icon-only', 1).evaluate((el) => {
      const r = getComputedStyle(el, '::before');
      return { width: Number.parseFloat(r.width), height: Number.parseFloat(r.height) };
    });
    expect(target.height).toBeCloseTo(pointer, 1);
    expect(target.width).toBeCloseTo(b.width, 1);
    // A click just above the set lands on the segment.
    await page.mouse.click(b.x + b.width / 2, b.y - (pointer - b.height) / 2 + 1);
    await expect(btn(page, 'icon-only', 1)).toHaveAttribute('aria-checked', 'true');
    await page.mouse.click(b.x + b.width / 2 + b.width, b.y + b.height + (pointer - b.height) / 2 - 1);
    await expect(btn(page, 'icon-only', 2)).toHaveAttribute('aria-checked', 'true');
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(async () => Number.parseFloat(await css(btn(page, 'icon-only', 1), 'height', '::before'))).toBeCloseTo(touch, 1);
    expect((await bounds(btn(page, 'icon-only', 1))).width).toBeGreaterThanOrEqual(touch - 0.5);
  });

  test('SEG-7: a disabled segment renders from the disabled tokens of its condition; the outline and the dividers keep their colors', async ({ page }) => {
    await expect.poll(() => drawn(page, 'disabled', 2)).toEqual(await expected(page, 'unselected', 'disabled'));
    await expect.poll(() => drawn(page, 'selected-disabled', 2)).toEqual(await expected(page, 'selected', 'disabled'));
    expect(await css(set(page, 'disabled').locator('.set'), 'border-top-color', '::after')).toBe(await resolveColor(page, T('outline-color')));
    expect(await css(seg(page, 'disabled', 2).locator('.divider'), 'background-color')).toBe(await resolveColor(page, T('divider-color')));
  });

  test('SEG-8: a size the system does not have renders with the default’s tokens, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('odd', DWM, { size: 'huge', value: 'week' })] });
    expect((await bounds(set(page, 'odd'))).height).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
    expect(await css(seg(page, 'odd', 0).locator('.label'), 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-medium-font-size'))}px`);
    await expect.poll(() => seen.filter((w) => w.includes('SEG-8')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/size "huge" is not a value of the active design system; it is drawn as "medium" \(SEG-8\)/);
  });

  test('SEG-9: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, btn(page, 'multiple', 1))],
    ] as const) {
      await mountFixtures(page, spec);
      await seg(page, 'multiple', 1).focus();
      await btn(page, 'multiple', 1).evaluate((el) => {
        const log: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) log.on ??= performance.now();
          else if (log.on !== undefined) log.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (log.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
      });
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, name);
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('SEG-10: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('unselected-pressed-label-color')]: 'rgb(0, 0, 255)' });
      const b = btn(page, 'single', 0);
      await b.hover();
      // The hovered color once its transition has ended: a ripple or none press does not change the container color, so
      // it does not cancel that transition, and a frame of its tail would be read against the next one after the press.
      await expect.poll(() => settledCss(b, 'background-color')).toBe(await resolveColor(page, T('unselected-hovered-container-color')));
      const hovered = await css(b, 'background-color');
      await page.mouse.down();
      const result = {
        pressed: await b.getAttribute('data-pressed'),
        bg: await css(b, 'background-color'),
        hovered,
        label: await css(b.locator('.label'), 'color'),
        ripple: await b.locator('.ripple').count(),
        opacity: await css(b, 'opacity'),
      };
      await page.mouse.move(0, 0);
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, label: 'rgb(0, 0, 255)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, label: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
    // The ripple grows over the feedback duration and fades over the state duration, from the center for a key, clipped
    // to the segment's corners.
    await mountFixtures(page, spec, { system: 'm3-like' });
    await seg(page, 'multiple', 0).focus();
    await page.keyboard.down('Enter');
    const layer = await btn(page, 'multiple', 0)
      .locator('.ripple')
      .evaluate((el) => {
        const st = getComputedStyle(el);
        return {
          x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width,
          grow: Number.parseFloat(st.animationDuration) * 1000,
          fade: Number.parseFloat(st.transitionDuration) * 1000,
          start: st.borderTopLeftRadius,
          end: st.borderTopRightRadius,
          container: getComputedStyle(el.parentElement!).borderTopLeftRadius,
        };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration-medium'), 'duration'));
    expect(layer.start).toBe(layer.container);
    expect(layer.end).toBe('0px');
    // Reduced motion: the ripple appears whole.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await css(btn(page, 'multiple', 0).locator('.ripple'), 'animation-name')).toBe('none');
    await page.keyboard.up('Enter');
  });

  test('SEG-11 corner smoothing and focus-style: cupertino eases the end segments’ corners, the ring concentric; acme shows focus as a glow inside the segment', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const b = btn(page, 'single', 0);
    const [shape, padding] = await Promise.all([resolveToken(page, T('set-shape')), resolveToken(page, T('set-padding'))]);
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(b, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBeCloseTo((shape - padding) * 1.24, 2);
      await tabTo(page, seg(page, 'single', 1));
      await page.keyboard.press('ArrowLeft');
      expect(await css(b, 'corner-top-left-shape', '::after')).toBe(await css(b, 'corner-top-left-shape'));
    } else expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBe(shape - padding);

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    await tabTo(page, seg(page, 'multiple', 0));
    await page.keyboard.press('ArrowRight');
    const g = btn(page, 'multiple', 1);
    expect(await css(g, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(g, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    expect(await css(g, 'top', '::after')).toBe(`${(1 + outer) * 2}px`);
    await expect(g).toHaveAttribute('data-focus-style', 'glow');
  });

  test('SEG-23: colors and elevation change over the state motion between states, and at once where motion is reduced', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-state-duration-medium'), 'duration');
    const b = btn(page, 'single', 0);
    // The first condition a segment is told is drawn without motion until two frames after it connected (`.still`); a
    // loaded machine can reach this line before those frames, so wait for them rather than read the still transition.
    await expect(b).not.toHaveClass(/\bstill\b/);
    const properties = (await css(b, 'transition-property')).split(', ');
    const durations = (await css(b, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000);
    for (const p of ['background-color', 'box-shadow', 'color', 'opacity']) expect(durations[properties.indexOf(p)], p).toBe(duration);
    // (60 s: the pointer starts the motion, and it is held in a later answer — a motion of 800 ms was over where the
    // hover and the question take a slow runner a second; it is ended by hand below.)
    await override(page, { [T('motion-state-duration-medium')]: '60000ms' });
    const hovered = await resolveColor(page, T('unselected-hovered-container-color'));
    await b.hover();
    // Sampled on the transition's own timeline, not the wall clock: the background runs over the overridden state
    // duration, is not yet the hovered color 100 ms into it, and ends at it.
    const recolor = (step: 'sample' | 'finish') =>
      b.evaluate((el, s) => {
        const t = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === 'background-color') as CSSTransition | undefined;
        if (!t) return null;
        const duration = Number(t.effect!.getComputedTiming().duration);
        if (s === 'sample') {
          t.pause();
          t.currentTime = 100;
        } else t.finish();
        return { duration, color: getComputedStyle(el).backgroundColor };
      }, step);
    const sample = await recolor('sample');
    expect(sample?.duration, 'the background transitions over the state duration').toBe(60000);
    expect(sample!.color).not.toBe(hovered);
    expect((await recolor('finish'))!.color).toBe(hovered);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(b, 'transition-duration')).toBe('0s');
    expect(await css(seg(page, 'single', 1).locator('.check'), 'transition-duration')).toBe('0s');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(400); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
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
