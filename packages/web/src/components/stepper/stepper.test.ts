// <tanrei-stepper> and <tanrei-stepper-step>, driven by specs/stepper.spec.json: every behaviour id (SPR-1…27) is
// cited by a test title, every fixture has a baseline, and every condition, state and choice of kind is read back from
// the tokens — never from a number written here.
// SPR-28: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import {
  type Fixture,
  type FixtureItem,
  acmeSystemCss,
  iconFaceArrives,
  loadSpec,
  missingWords,
  mountFixtureAsInAll,
  mountFixtures,
  resolveColor,
  resolveToken,
  rootTokens,
  setWords,
  tab,
  tabTo,
  withoutIconFont,
} from '../../../test/harness.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { motionEnded, settledCss } from '../../../test/motions.js';

const spec = loadSpec('stepper');
type P = Page;
const stepper = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-stepper`);
const steps = (page: P, id: string) => stepper(page, id).locator('tanrei-stepper-step');
const step = (page: P, id: string, n: number) => steps(page, id).nth(n);
const box = (page: P, id: string, n: number) => step(page, id, n).locator('.container');
const btn = (page: P, id: string, n: number) => step(page, id, n).locator('button.container');
const marker = (page: P, id: string, n: number) => step(page, id, n).locator('.marker');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-stepper-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const fx = (id: string) => spec.fixtures.find((f) => f.id === id)!;
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const WORDS = { completedText: 'Completed', errorText: 'Has an error' };
const s = (value: string, label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'step', props: { value, label, ...props } });
const ABCD = [s('a', 'Account'), s('b', 'Shipping'), s('c', 'Payment'), s('d', 'Review')];
const fixture = (id: string, items: FixtureItem[], props: Fixture['props'] = {}): Fixture => ({ id, props: { label: 'Checkout', ...WORDS, ...props }, items });

/** What a step draws: its container fill, marker fill, ring, content, label, description and opacity. */
const drawn = (page: P, id: string, n: number) =>
  step(page, id, n).evaluate((el) => {
    const root = el.shadowRoot!;
    const c = getComputedStyle(root.querySelector('.container')!);
    const m = getComputedStyle(root.querySelector('.marker')!);
    const description = root.querySelector('.description');
    return {
      bg: c.backgroundColor,
      marker: m.backgroundColor,
      ring: m.borderTopColor,
      content: m.color,
      label: getComputedStyle(root.querySelector('.label')!).color,
      description: description ? getComputedStyle(description).color : null,
      opacity: c.opacity,
    };
  });
const expected = async (page: P, condition: string, state = '', description = true) => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    bg: await resolveColor(page, name('container-color')),
    marker: await resolveColor(page, name('marker-color')),
    ring: await resolveColor(page, name('marker-outline-color')),
    content: await resolveColor(page, name('marker-content-color')),
    label: await resolveColor(page, name('label-color')),
    description: description ? await resolveColor(page, name('description-color')) : null,
    opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
  };
};
/** Logs every select the steppers fire, with the value it carried and the stepper's value after it. */
const wire = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const r of document.querySelectorAll<any>('tanrei-stepper')) r.addEventListener('select', (e: CustomEvent) => log.push(`${e.detail.value}:${r.value}`));
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);

test.describe('conditions, marker, text and layout', () => {
  test('SPR-1: each step is in one condition — current by value, error kept by its status, complete before the current step by auto, incomplete after it — and a change of value or status is drawn at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const conditions = (id: string) => steps(page, id).evaluateAll((all) => all.map((el: any) => el.condition));
    expect(await conditions('horizontal')).toEqual(['complete', 'complete', 'current', 'incomplete']);
    expect(await conditions('horizontal-error')).toEqual(['complete', 'error', 'current', 'incomplete']);
    expect(await conditions('current-error')).toEqual(['complete', 'complete', 'error', 'incomplete']);
    expect(await conditions('finished')).toEqual(['complete', 'complete', 'complete']);
    expect(await conditions('pressable-disabled')).toEqual(['complete', 'current', 'complete', 'incomplete']);
    // The current step's aria-current goes where the value goes.
    await expect(step(page, 'horizontal', 2)).toHaveAttribute('aria-current', 'step');
    await stepper(page, 'horizontal').evaluate((el: any) => (el.value = 'account'));
    await expect.poll(() => conditions('horizontal')).toEqual(['current', 'incomplete', 'incomplete', 'incomplete']);
    await expect(step(page, 'horizontal', 0)).toHaveAttribute('aria-current', 'step');
    await expect(step(page, 'horizontal', 2)).not.toHaveAttribute('aria-current');
    await step(page, 'horizontal', 2).evaluate((el: any) => (el.status = 'complete'));
    await expect.poll(() => conditions('horizontal')).toEqual(['current', 'incomplete', 'complete', 'incomplete']);
    await stepper(page, 'horizontal').evaluate((el: any) => (el.value = ''));
    await expect.poll(() => conditions('horizontal')).toEqual(['incomplete', 'incomplete', 'complete', 'incomplete']);
  });

  test('SPR-2: the marker is a circle of at least marker.size with its condition’s fill, ring and content — the number for incomplete and current, check for complete, priority_high for error — drawn by the icon helper, and no mark of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal-error')] });
    const size = await resolveToken(page, T('marker-size'));
    const ring = await resolveToken(page, T('marker-outline-width'));
    const conditions = ['complete', 'error', 'current', 'incomplete'];
    for (const [n, condition] of conditions.entries()) {
      const m = marker(page, 'horizontal-error', n);
      const b = await bounds(m);
      expect(b.width, condition).toBeGreaterThanOrEqual(size - 0.5);
      expect(b.height, condition).toBeGreaterThanOrEqual(size - 0.5);
      await expect.poll(() => settledCss(m, 'background-color'), condition).toBe(await resolveColor(page, T(`${condition}-marker-color`)));
      expect(await css(m, 'border-top-color'), condition).toBe(await resolveColor(page, T(`${condition}-marker-outline-color`)));
      expect(await px(m, 'border-top-width'), condition).toBeCloseTo(ring, 1);
      expect(await css(m, 'color'), condition).toBe(await resolveColor(page, T(`${condition}-marker-content-color`)));
      expect(Number.parseFloat(await css(m, 'border-top-left-radius'))).toBeGreaterThanOrEqual(b.height / 2 - 0.5);
    }
    await expect(marker(page, 'horizontal-error', 0)).toHaveText('check');
    await expect(marker(page, 'horizontal-error', 1)).toHaveText('priority_high');
    await expect(marker(page, 'horizontal-error', 2)).toHaveText('3');
    await expect(marker(page, 'horizontal-error', 3)).toHaveText('4');
    expect(await css(marker(page, 'horizontal-error', 2), 'font-size')).toBe(`${await resolveToken(page, T('marker-label-typescale-font-size'))}px`);
    const glyph = marker(page, 'horizontal-error', 0).locator('.glyph');
    expect((await bounds(glyph)).width).toBeCloseTo(await resolveToken(page, T('marker-icon-size')), 1);
    const weight = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.fontWeight = `var(${n})`;
      document.body.append(probe);
      const out = getComputedStyle(probe).fontWeight;
      probe.remove();
      return out;
    }, T('marker-icon-weight'));
    expect(await css(glyph, 'font-variation-settings')).toContain(`"wght" ${weight}`);
    // No svg, no path, no drawn mark.
    expect(await step(page, 'horizontal-error', 0).evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, canvas').length)).toBe(0);
  });

  test('SPR-3: the label in label.typescale and the description description.gap under it in description.typescale, in their condition’s colors; both wrap and are never cut; the label’s style is the same in every condition', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal-error'), fx('long-labels')] });
    const label = step(page, 'horizontal-error', 1).locator('.label');
    const description = step(page, 'horizontal-error', 1).locator('.description');
    expect(await css(label, 'font-size')).toBe(`${await resolveToken(page, T('label-typescale-font-size'))}px`);
    expect(await css(description, 'font-size')).toBe(`${await resolveToken(page, T('description-typescale-font-size'))}px`);
    expect((await bounds(description)).y - ((await bounds(label)).y + (await bounds(label)).height)).toBeCloseTo(await resolveToken(page, T('description-gap')), 0);
    await expect.poll(() => settledCss(label, 'color')).toBe(await resolveColor(page, T('error-label-color')));
    expect(await css(description, 'color')).toBe(await resolveColor(page, T('error-description-color')));
    const fonts = await steps(page, 'horizontal-error').evaluateAll((all) => all.map((el) => getComputedStyle(el.shadowRoot!.querySelector('.label')!).font));
    expect(new Set(fonts).size).toBe(1);
    // A long label wraps inside its column; nothing is cut.
    const long = step(page, 'long-labels', 1).locator('.label');
    const lineHeight = await px(long, 'line-height');
    expect((await bounds(long)).height).toBeGreaterThan(lineHeight * 1.5);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow !== 'hidden')).toBe(true);
    expect((await bounds(long)).x + (await bounds(long)).width).toBeLessThanOrEqual((await bounds(step(page, 'long-labels', 1))).x + (await bounds(step(page, 'long-labels', 1))).width + 0.5);
  });

  test('SPR-4: horizontal — one row of equal columns as wide as the stage, each marker at its container’s start, container.padding in, the text under it marker.gap below, every marker on one line', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal'), fx('horizontal-descriptions')] });
    const pad = await resolveToken(page, T('container-padding'));
    const gap = await resolveToken(page, T('marker-gap'));
    const row = await bounds(stepper(page, 'horizontal'));
    expect(row.width).toBeCloseTo(600, 0);
    const widths = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(step(page, 'horizontal', n))).width));
    for (const w of widths) expect(w).toBeCloseTo(150, 0);
    const tops = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(marker(page, 'horizontal-descriptions', n))).y));
    expect(new Set(tops.map((y) => Math.round(y))).size).toBe(1);
    for (const n of [0, 1, 2, 3]) {
      const [c, m, l] = [await bounds(box(page, 'horizontal', n)), await bounds(marker(page, 'horizontal', n)), await bounds(step(page, 'horizontal', n).locator('.label'))];
      expect(m.x - c.x).toBeCloseTo(pad, 0);
      expect(m.y - c.y).toBeCloseTo(pad, 0);
      expect(l.x).toBeCloseTo(m.x, 0);
      expect(l.y - (m.y + m.height)).toBeCloseTo(gap, 0);
    }
  });

  test('SPR-5: vertical — one column of steps as wide as the stepper, the marker at the start and the text beside it marker.gap away, the marker centred on the label’s first line', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('vertical')] });
    const gap = await resolveToken(page, T('marker-gap'));
    const lineHeight = await px(step(page, 'vertical', 0).locator('.label'), 'line-height');
    const all = await bounds(stepper(page, 'vertical'));
    for (const n of [0, 1, 2, 3]) {
      const [st, m, l] = [await bounds(step(page, 'vertical', n)), await bounds(marker(page, 'vertical', n)), await bounds(step(page, 'vertical', n).locator('.label'))];
      expect(st.width).toBeCloseTo(all.width, 0);
      expect(l.x - (m.x + m.width)).toBeCloseTo(gap, 0);
      expect(m.y + m.height / 2).toBeCloseTo(l.y + lineHeight / 2, 0);
      if (n) expect(st.y).toBeGreaterThan((await bounds(step(page, 'vertical', n - 1))).y);
    }
  });

  test('SPR-6: compact — the bar of one segment per step filled through the current one, the position under it and the current step’s label; a horizontal stepper turns compact by the width it is given, and back; with no current step the bar is empty and no text is drawn', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('compact'), fx('compact-error'), fx('horizontal')] });
    const compact = stepper(page, 'compact');
    const segments = compact.locator('.segment');
    await expect(segments).toHaveCount(5);
    const fills = await segments.evaluateAll((all) => all.map((el) => getComputedStyle(el).backgroundColor));
    const [on, off] = [await resolveColor(page, T('bar-filled-color')), await resolveColor(page, T('bar-color'))];
    expect(fills).toEqual([on, on, off, off, off]);
    const bar = await bounds(compact.locator('.bar'));
    expect(bar.width).toBeCloseTo(320, 0);
    expect((await bounds(segments.nth(0))).height).toBeCloseTo(await resolveToken(page, T('bar-thickness')), 1);
    expect((await bounds(segments.nth(1))).x - ((await bounds(segments.nth(0))).x + (await bounds(segments.nth(0))).width)).toBeCloseTo(await resolveToken(page, T('bar-gap')), 0);
    const position = compact.locator('.position');
    await expect(position).toHaveText('Step 2 of 5');
    expect((await bounds(position)).y - (bar.y + bar.height)).toBeCloseTo(await resolveToken(page, T('position-gap')), 0);
    expect(await css(position, 'color')).toBe(await resolveColor(page, T('position-color')));
    await expect(compact.locator('.compact .current .label')).toHaveText('Shipping');
    expect(await css(compact.locator('.compact .current'), 'color')).toBe(await resolveColor(page, T('current-label-color')));
    // The steps are not drawn.
    await expect(compact.locator('.steps')).toBeHidden();
    // The current step with an error: its glyph before the label, in the error label color.
    const error = stepper(page, 'compact-error').locator('.compact .current');
    await expect(error.locator('.glyph')).toHaveText('priority_high');
    expect(await css(error, 'color')).toBe(await resolveColor(page, T('error-label-color')));
    // The width decides: 4 steps × step.min-width.
    const least = (await resolveToken(page, T('step-min-width'))) * 4;
    const stage = page.locator('[data-fixture="horizontal"]');
    const horizontal = stepper(page, 'horizontal');
    await stage.evaluate((el, w) => (el.style.inlineSize = `${w - 1}px`), least);
    await expect(horizontal.locator('.compact')).toBeVisible();
    await expect(horizontal.locator('.steps')).toBeHidden();
    expect(await horizontal.evaluate((el: any) => el.value)).toBe('payment');
    await stage.evaluate((el, w) => (el.style.inlineSize = `${w}px`), least);
    await expect(horizontal.locator('.compact')).toHaveCount(0);
    await expect(horizontal.locator('.steps')).toBeVisible();
    // No current step.
    await compact.evaluate((el: any) => (el.value = ''));
    await expect.poll(() => segments.evaluateAll((all) => all.map((el) => getComputedStyle(el).backgroundColor))).toEqual([off, off, off, off, off]);
    await expect(compact.locator('.position')).toHaveCount(0);
    await expect(compact.locator('.compact .current')).toHaveCount(0);
  });

  test('SPR-7: the position fills {position} and {count} as the platform writes a whole number in the element’s language and does nothing else; a sentence without {position} is drawn as written and reported once', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('slash', ABCD, { layout: 'compact', value: 'c', positionText: '{position}/{count}' }),
        fixture('none', ABCD, { layout: 'compact', value: 'c', positionText: 'Where you are' }),
        fixture('ar', ABCD, { layout: 'compact', value: 'b', positionText: '{position} — {count}', lang: 'ar-EG' }),
      ],
    });
    await expect(stepper(page, 'slash').locator('.position')).toHaveText('3/4');
    await expect(stepper(page, 'none').locator('.position')).toHaveText('Where you are');
    const arabic = await page.evaluate(() => [new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(2), new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(4)]);
    await expect(stepper(page, 'ar').locator('.position')).toHaveText(`${arabic[0]} — ${arabic[1]}`);
    await expect.poll(() => seen.filter((w) => w.includes('SPR-7')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/position-text has no place \{position\}/);
  });

  test('SPR-8: a connector from each marker but the last to the next, connector.gap from both, on the markers’ centre line, connector.thickness thick, in the complete color after a complete step; above every container and hidden', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal'), fx('vertical')] });
    const [gap, thick] = [await resolveToken(page, T('connector-gap')), await resolveToken(page, T('connector-thickness'))];
    const [done, rest] = [await resolveColor(page, T('connector-complete-color')), await resolveColor(page, T('connector-color'))];
    await expect(step(page, 'horizontal', 3).locator('.connector')).toHaveCount(0);
    for (const [n, color] of [done, done, rest].entries()) {
      const line = step(page, 'horizontal', n).locator('.connector');
      const [l, a, b] = [await bounds(line), await bounds(marker(page, 'horizontal', n)), await bounds(marker(page, 'horizontal', n + 1))];
      expect(l.height).toBeCloseTo(thick, 1);
      expect(l.x - (a.x + a.width)).toBeCloseTo(gap, 0);
      expect(b.x - (l.x + l.width)).toBeCloseTo(gap, 0);
      expect(l.y + l.height / 2).toBeCloseTo(a.y + a.height / 2, 0);
      await expect.poll(() => settledCss(line, 'background-color')).toBe(color);
      await expect(line).toHaveAttribute('aria-hidden', 'true');
      expect(Number(await css(line, 'z-index'))).toBeGreaterThan(0);
    }
    const down = step(page, 'vertical', 0).locator('.connector');
    const [l, a, b] = [await bounds(down), await bounds(marker(page, 'vertical', 0)), await bounds(marker(page, 'vertical', 1))];
    expect(l.width).toBeCloseTo(thick, 1);
    expect(l.y - (a.y + a.height)).toBeCloseTo(gap, 0);
    expect(b.y - (l.y + l.height)).toBeCloseTo(gap, 0);
    expect(l.x + l.width / 2).toBeCloseTo(a.x + a.width / 2, 0);
  });

  test('SPR-22: with the text size enlarged the labels, descriptions, numbers and position grow, the marker grows with its number and keeps marker.size as its least, gaps and padding stay, nothing is cut and the page does not scroll sideways', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [fx('vertical'), fx('compact')] });
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      return {
        label: await px(step(page, 'vertical', 1).locator('.label'), 'font-size'),
        number: await px(marker(page, 'vertical', 1), 'font-size'),
        marker: (await bounds(marker(page, 'vertical', 1))).height,
        position: await px(stepper(page, 'compact').locator('.position'), 'font-size'),
        pad: [await px(box(page, 'vertical', 1), 'padding-top'), await resolveToken(page, T('container-padding'))],
        gap: [await px(box(page, 'vertical', 1), 'column-gap'), await resolveToken(page, T('marker-gap'))],
        cut: await steps(page, 'vertical').evaluateAll((all) => all.some((el) => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.label, .description')].some((t) => t.scrollWidth > t.clientWidth + 1))),
        sideways: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      };
    };
    const [plain, big] = [await measure(false), await measure(true)];
    expect(big.label).toBeGreaterThan(plain.label * 1.5);
    expect(big.number).toBeGreaterThan(plain.number * 1.5);
    expect(big.position).toBeGreaterThan(plain.position * 1.5);
    expect(big.marker).toBeGreaterThanOrEqual(await resolveToken(page, T('marker-size')) - 0.5);
    expect(big.pad[0]).toBeCloseTo(big.pad[1], 1);
    expect(big.gap[0]).toBeCloseTo(big.gap[1], 1);
    expect(big.cut).toBe(false);
    expect(big.sideways).toBe(false);
  });
});

test.describe('pressing a step', () => {
  test('SPR-9: visited makes the complete and error steps that are not current pressable buttons, in order in the focus order; all makes every step but the current; none and the compact form make none; a plain step takes no focus and draws no state', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fx('pressable-visited'),
        fixture('error', [s('a', 'A'), s('b', 'B', { status: 'error' }), s('c', 'C'), s('d', 'D', { status: 'error' })], { value: 'c', pressable: 'visited' }),
        fixture('all', ABCD, { value: 'b', pressable: 'all' }),
        fixture('compact', ABCD, { value: 'c', pressable: 'all', layout: 'compact', positionText: '{position}' }),
        fx('horizontal'),
      ],
    });
    const pressable = (id: string) => steps(page, id).evaluateAll((all) => all.map((el) => !!el.shadowRoot!.querySelector('button.container')));
    expect(await pressable('pressable-visited')).toEqual([true, true, false, false]);
    expect(await pressable('error')).toEqual([true, true, false, true]);
    expect(await pressable('all')).toEqual([true, false, true, true]);
    expect(await pressable('horizontal')).toEqual([false, false, false, false]);
    await expect(stepper(page, 'compact').getByRole('button')).toHaveCount(0);
    // The focus order: Account, Shipping, then on to the next stepper's first button.
    await tabTo(page, step(page, 'pressable-visited', 0));
    await tab(page);
    expect(await step(page, 'pressable-visited', 1).evaluate((el) => el.matches(':focus-within'))).toBe(true);
    await tab(page);
    expect(await step(page, 'error', 0).evaluate((el) => el.matches(':focus-within'))).toBe(true);
    // A plain step answers no hover.
    const plain = box(page, 'horizontal', 0);
    const rest = await settledCss(plain, 'background-color');
    await plain.hover();
    expect(await settledCss(plain, 'background-color')).toBe(rest);
    expect(await plain.evaluate((el) => el.tabIndex)).toBeLessThan(0);
  });

  test('SPR-10: a click, Enter, Space and element.click() on a pressable step each emit select once with its value; value is never changed by the stepper', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
    await wire(page);
    await btn(page, 'pressable-visited', 0).click();
    await step(page, 'pressable-visited', 1).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await step(page, 'pressable-visited', 0).evaluate((el) => (el as HTMLElement).click());
    // A step that is not pressable fires nothing.
    await box(page, 'pressable-visited', 3).click();
    await step(page, 'pressable-visited', 2).evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['account:payment', 'shipping:payment', 'shipping:payment', 'account:payment']);
  });

  test('SPR-11: a disabled step of a pressable stepper is drawn from its condition’s disabled tokens and exposed as a disabled button; in a stepper that presses nothing it is drawn as any other; the current step stays current and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fx('pressable-disabled'), fixture('none', [s('a', 'A'), s('b', 'B', { disabled: true, status: 'complete' }), s('c', 'C')], { value: 'c' }), fixture('cur', [s('a', 'A'), s('b', 'B', { disabled: true })], { value: 'b', pressable: 'all' })],
    });
    const billing = btn(page, 'pressable-disabled', 3);
    await expect(billing).toBeDisabled();
    await expect(stepper(page, 'pressable-disabled').getByRole('button', { name: /Billing/, disabled: true })).toHaveCount(1);
    await expect.poll(() => drawn(page, 'pressable-disabled', 3)).toEqual(await expected(page, 'incomplete', 'disabled'));
    // The default keeps the marker's fill: none stays none.
    expect(await resolveColor(page, T('complete-disabled-marker-color'))).toBe(await resolveColor(page, T('complete-marker-color')));
    await expect(btn(page, 'none', 1)).toHaveCount(0);
    await expect.poll(() => drawn(page, 'none', 1)).toEqual(await expected(page, 'complete', '', false));
    await expect(step(page, 'cur', 1)).toHaveAttribute('aria-current', 'step');
    await expect.poll(() => seen.filter((w) => w.includes('SPR-11')).length).toBe(1);
  });

  test('SPR-12: each state renders a pressable step from that state’s tokens of its condition; pointer focus is not the focused state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
    const b = btn(page, 'pressable-visited', 0);
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(page, 'pressable-visited', 0)).toEqual(await expected(page, 'complete', '', false));
    await b.hover();
    await expect.poll(() => drawn(page, 'pressable-visited', 0)).toEqual(await expected(page, 'complete', 'hovered', false));
    await page.mouse.down();
    await expect.poll(() => drawn(page, 'pressable-visited', 0)).toEqual(await expected(page, 'complete', 'pressed', false));
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(page, 'pressable-visited', 0), 'pointer focus').toEqual(await expected(page, 'complete', '', false));
    await tabTo(page, step(page, 'pressable-visited', 1));
    await expect.poll(() => drawn(page, 'pressable-visited', 1)).toEqual(await expected(page, 'complete', 'focused', false));
  });

  test('SPR-12: under acme, where the three states differ, pressed beats focused beats hovered', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fx('pressable-visited')] });
    const b = btn(page, 'pressable-visited', 0);
    const bg = () => css(b, 'background-color');
    const [rest, hovered, focus, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((st) => resolveColor(page, T(`complete-${st}container-color`))));
    expect(new Set([rest, hovered, focus, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    await b.hover();
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, step(page, 'pressable-visited', 0));
    await expect.poll(bg).toBe(focus);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(down);
    await page.keyboard.up('Space');
  });

  test('SPR-13: keyboard focus shows the ring around the container without animation; pointer focus does not', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
    const b = btn(page, 'pressable-visited', 0);
    await b.click();
    await expect(b).toHaveCSS('outline-style', 'none');
    await tabTo(page, step(page, 'pressable-visited', 0));
    await expect(b).toHaveCSS('outline-style', 'solid');
    expect(await css(b, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(b, 'outline-offset')).toBe(await resolveToken(page, '--tanrei-sys-focus-offset'));
    expect(await css(b, 'transition-property')).not.toContain('outline');
  });

  test('SPR-14: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, btn(page, 'pressable-visited', 0))],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
      const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
      expect(hold, name).toBe(100);
      await step(page, 'pressable-visited', 0).focus();
      await btn(page, 'pressable-visited', 0).evaluate((el) => {
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

  // A step is drawn without motion for its first two frames (`.still`). The rule that turns its transitions off must
  // not reach press-hold, which the step's `.hold` carries as a transition-delay: the `transition` shorthand would set
  // that delay to 0s, and a press in those frames would end with the key. The page's clock is held, so the first frames
  // never pass: the press lands in them on any machine, as a fast one in WebKit did on a loaded one.
  test('SPR-14: a step pressed in its first frames, while it is drawn without motion, is held for press-hold too', async ({ page }) => {
    const hold = 1000;
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, btn(page, 'pressable-visited', 0))],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
      await holdClock(page);
      try {
        // The product draws the stepper anew, with its own press-hold on the root.
        await page.locator('[data-fixture="pressable-visited"]').evaluate((stage) => {
          stage.innerHTML = stage.innerHTML;
        });
        await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
        const b = btn(page, 'pressable-visited', 0);
        expect(await b.evaluate((el) => el.classList.contains('still')), `${name}: the step is in its first frames`).toBe(true);
        await step(page, 'pressable-visited', 0).focus();
        const pressed = () => b.evaluate((el) => el.hasAttribute('data-pressed'));
        await activate();
        expect(await pressed(), `${name}: still held when the press is over`).toBe(true);
        await page.clock.runFor(hold - 1);
        expect(await pressed(), `${name}: still held at press-hold − 1 ms`).toBe(true);
        await page.clock.runFor(1);
        await expect.poll(pressed, { message: `${name}: over at press-hold` }).toBe(false);
      } finally {
        await releaseClock(page);
      }
    }
  });

  test('SPR-15: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')], ...(system ? { system } : {}) });
      if (feedback) await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await rootTokens(page, { [T('complete-pressed-label-color')]: 'rgb(0, 0, 255)' });
      const b = btn(page, 'pressable-visited', 0);
      await b.hover();
      await expect.poll(() => settledCss(b, 'background-color')).toBe(await resolveColor(page, T('complete-hovered-container-color')));
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
    expect(overlay.bg).toBe(await resolveColor(page, T('complete-pressed-container-color')));
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
    // The ripple grows from the center for a key, over the feedback duration, and fades over the state duration.
    await mountFixtures(page, spec, { system: 'm3-like', icons: true, fixtures: [fx('pressable-visited')] });
    await step(page, 'pressable-visited', 0).focus();
    await page.keyboard.down('Enter');
    const layer = await btn(page, 'pressable-visited', 0)
      .locator('.ripple')
      .evaluate((el) => {
        const st = getComputedStyle(el);
        return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) / el.getBoundingClientRect().width, grow: Number.parseFloat(st.animationDuration) * 1000, fade: Number.parseFloat(st.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(layer.x).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await css(btn(page, 'pressable-visited', 0).locator('.ripple'), 'animation-name')).toBe('none');
    await page.keyboard.up('Enter');
  });

  test('SPR-16 corner smoothing and focus-style: cupertino eases the container’s corners; acme shows focus as a glow', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino', icons: true, fixtures: [fx('pressable-visited')] });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const b = btn(page, 'pressable-visited', 0);
    const shape = await resolveToken(page, T('container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(b, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBeCloseTo(shape * 1.24, 2);
    } else expect(Number.parseFloat(await css(b, 'border-top-left-radius'))).toBe(shape);
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fx('pressable-visited')] });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await tabTo(page, step(page, 'pressable-visited', 0));
    const g = btn(page, 'pressable-visited', 0);
    expect(await css(g, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    await expect(g).toHaveAttribute('data-focus-style', 'glow');
  });

  test('SPR-17: colors change over the state motion between states and between conditions, and at once where motion is reduced; a glyph that replaces a number does so at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const b = btn(page, 'pressable-visited', 0);
    await expect(b).not.toHaveClass(/\bstill\b/);
    const properties = (await css(b, 'transition-property')).split(', ');
    const durations = (await css(b, 'transition-duration')).split(', ').map((v) => Number.parseFloat(v) * 1000);
    for (const p of ['background-color', 'color']) {
      expect(properties, p).toContain(p);
      // A list shorter than the properties repeats (CSS Transitions §2).
      expect(durations[properties.indexOf(p) % durations.length], p).toBe(duration);
    }
    expect(Number.parseFloat(await css(marker(page, 'pressable-visited', 0), 'transition-duration')) * 1000).toBe(duration);
    // A change of condition runs the marker's fill over the state motion.
    await rootTokens(page, { [T('motion-state-duration')]: '60000ms' });
    await stepper(page, 'pressable-visited').evaluate((el: any) => (el.value = 'account'));
    await expect(marker(page, 'pressable-visited', 0)).toHaveText('1');
    // The step became current, so its button became a plain box: the old colors are run out all the same.
    const running = (n: number) => marker(page, 'pressable-visited', n).evaluate((el) => el.getAnimations().map((a) => Number(a.effect!.getComputedTiming().duration)));
    expect(await running(0)).toContain(60000);
    // Shipping, complete before, is incomplete now, and also no longer pressable.
    expect(await running(1)).toContain(60000);
    // A step that stays plain transitions as any element does.
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal')] });
    await expect(box(page, 'horizontal', 1)).not.toHaveClass(/\bstill\b/);
    await rootTokens(page, { [T('motion-state-duration')]: '60000ms' });
    await stepper(page, 'horizontal').evaluate((el: any) => (el.value = 'account'));
    await expect.poll(() => marker(page, 'horizontal', 1).evaluate((el) => el.getAnimations().some((a) => (a as CSSTransition).transitionProperty === 'background-color'))).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(box(page, 'horizontal', 0), 'transition-duration')).toMatch(/^0s/);
    expect(await css(marker(page, 'horizontal', 1), 'transition-duration')).toMatch(/^0s/);
  });

  test('SPR-18: every step’s container is at least the minimum target — pointer, and touch for a coarse pointer — the room added after its content', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('vertical-error'), fx('horizontal')] });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const n of [0, 1, 2, 3]) expect((await bounds(box(page, 'vertical-error', n))).height).toBeGreaterThanOrEqual(pointer - 0.5);
    // The marker stays at the container's top: the room is below.
    expect((await bounds(marker(page, 'vertical-error', 0))).y - (await bounds(box(page, 'vertical-error', 0))).y).toBeCloseTo(await resolveToken(page, T('container-padding')), 0);
    // Pressable and plain steps stand alike.
    expect((await bounds(box(page, 'vertical-error', 0))).height).toBe((await bounds(box(page, 'vertical-error', 3))).height);
    expect((await bounds(box(page, 'horizontal', 0))).width).toBeGreaterThanOrEqual(pointer);
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    await expect.poll(async () => (await bounds(box(page, 'vertical-error', 3))).height).toBeGreaterThanOrEqual(touch - 0.5);
  });
});

test.describe('accessibility, words, direction', () => {
  test('SPR-19: an ordered list named by label; each step an item read as its label, its condition’s word and its description; the current step is the current step; markers, connectors and the bar are hidden; the compact form is one group reading what is drawn', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal-error'), fx('compact-error'), fx('pressable-visited')] });
    await expect(stepper(page, 'horizontal-error')).toHaveAttribute('role', 'list');
    await expect(stepper(page, 'horizontal-error')).toHaveAttribute('aria-label', 'Checkout');
    const list = page.getByRole('list', { name: 'Checkout' }).first();
    await expect(list.getByRole('listitem')).toHaveCount(4);
    const snapshot = await page.locator('[data-fixture="horizontal-error"]').ariaSnapshot();
    expect(snapshot).toContain('Account Completed');
    expect(snapshot).toContain('Shipping Has an error Postcode missing');
    expect(snapshot).not.toMatch(/check|priority_high|\b3\b|\b4\b/);
    await expect(step(page, 'horizontal-error', 2)).toHaveAttribute('aria-current', 'step');
    for (const n of [0, 1, 2, 3]) await expect(step(page, 'horizontal-error', n).locator('.marker-cell')).toHaveAttribute('aria-hidden', 'true');
    // A pressable step is a button named by its label and its word.
    await expect(stepper(page, 'pressable-visited').getByRole('button', { name: 'Account Completed' })).toHaveCount(1);
    // Compact: one group reading the position, the current label and its error word.
    const compact = stepper(page, 'compact-error');
    await expect(compact).toHaveAttribute('role', 'group');
    await expect(compact.locator('.bar')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('[data-fixture="compact-error"]').ariaSnapshot()).toMatch(/Step 3 of 4[\s\S]*Payment Has an error/);
    await expect(compact.getByRole('listitem')).toHaveCount(0);
  });

  test('SPR-20: no words of its own — without the words a complete step is read as its label alone, the compact form draws no position, and the missing words are recorded; the product’s words are used where the prop is empty', async ({ page }) => {
    const plain = (id: string, props: Fixture['props'] = {}): Fixture => ({ id, props: { label: 'Checkout', value: 'c', ...props }, items: ABCD });
    await mountFixtures(page, spec, { icons: true, fixtures: [plain('bare'), plain('compact', { layout: 'compact' })] });
    expect(await page.locator('[data-fixture="bare"]').ariaSnapshot()).toMatch(/listitem: Account\n/);
    await expect(stepper(page, 'compact').locator('.position')).toHaveCount(0);
    await expect(stepper(page, 'compact').locator('.compact .current .label')).toHaveText('Payment');
    expect(await missingWords(page)).toEqual(expect.arrayContaining(['stepCompletedText', 'stepPositionText']));
    await setWords(page, { stepCompletedText: 'Done', stepPositionText: '{position} / {count}' });
    await expect.poll(() => page.locator('[data-fixture="bare"]').ariaSnapshot()).toContain('Account Done');
    await expect(stepper(page, 'compact').locator('.position')).toHaveText('3 / 4');
  });

  test('SPR-21: a value that names no step, an empty or repeated step value, an empty label or step label and fewer than two steps still render and are reported; an empty value is not', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('nowhere', ABCD, { value: 'zzz' }),
        fixture('repeat', [s('a', 'A'), s('a', 'Again'), s('', 'Blank'), s('d', '')], { value: 'a', label: '' }),
        fixture('one', [s('a', 'A')], { value: 'a' }),
        fixture('empty', ABCD, { value: '' }),
      ],
    });
    await expect(steps(page, 'repeat')).toHaveCount(4);
    await expect(step(page, 'repeat', 0)).toHaveAttribute('aria-current', 'step');
    await expect(step(page, 'repeat', 1)).not.toHaveAttribute('aria-current');
    await expect(steps(page, 'nowhere').locator('[aria-current]')).toHaveCount(0);
    const text = () => seen.filter((w) => w.includes('SPR-21')).join('\n');
    await expect.poll(() => seen.filter((w) => w.includes('SPR-21')).length).toBe(6);
    expect(text()).toMatch(/the value "zzz" names no step/);
    expect(text()).toMatch(/the value "a" is given to more than one step/);
    expect(text()).toMatch(/step 3 \("Blank"\) has an empty value/);
    expect(text()).toMatch(/step 4 \(value "d"\) has an empty label/);
    expect(text()).toMatch(/label is empty, so the stepper has no accessible name/);
    expect(text()).toMatch(/it holds 1 step; a stepper is made for two or more/);
  });

  test('SPR-23: under forced colors every ring, connector and text is the text color, a pressable label the button text color, the current marker the highlight, and the focus ring the highlight', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited'), fx('compact')] });
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.cssText = `color: ${keyword}; forced-color-adjust: none`;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, name);
    const [text, highlight, buttonText] = [await system('CanvasText'), await system('Highlight'), await system('ButtonText')];
    expect(await css(marker(page, 'pressable-visited', 2), 'background-color')).toBe(highlight);
    expect(await css(marker(page, 'pressable-visited', 3), 'border-top-color')).toBe(text);
    expect(await css(step(page, 'pressable-visited', 0).locator('.connector'), 'background-color')).toBe(text);
    expect(await css(step(page, 'pressable-visited', 0).locator('.label'), 'color')).toBe(buttonText);
    expect(await css(step(page, 'pressable-visited', 3).locator('.label'), 'color')).toBe(text);
    expect(await css(stepper(page, 'compact').locator('.segment.filled').first(), 'background-color')).toBe(highlight);
    await tabTo(page, step(page, 'pressable-visited', 0));
    expect(await css(btn(page, 'pressable-visited', 0), 'outline-color')).toBe(highlight);
  });

  test('SPR-24: the stepper takes its direction from an ancestor inside the page and has none of its own; a change while it is shown is drawn at once, keeping focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('pressable-visited')] });
    const stage = page.locator('[data-fixture="pressable-visited"]');
    await stage.evaluate((el) => (el.dir = 'rtl'));
    expect(await stepper(page, 'pressable-visited').evaluate((el) => el.hasAttribute('dir'))).toBe(false);
    expect((await bounds(step(page, 'pressable-visited', 0))).x).toBeGreaterThan((await bounds(step(page, 'pressable-visited', 1))).x);
    await tabTo(page, step(page, 'pressable-visited', 1));
    await stage.evaluate((el) => (el.dir = 'ltr'));
    expect((await bounds(step(page, 'pressable-visited', 0))).x).toBeLessThan((await bounds(step(page, 'pressable-visited', 1))).x);
    expect(await step(page, 'pressable-visited', 1).evaluate((el) => el.matches(':focus-within'))).toBe(true);
  });

  test('SPR-25: right-to-left mirrors the layout — the first step at the right, the connector toward the left, the bar filled from the right — keeps the order first to last, and mirrors no glyph', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal-rtl'), fx('compact-rtl')] });
    const xs = await Promise.all([0, 1, 2, 3].map(async (n) => (await bounds(step(page, 'horizontal-rtl', n))).x));
    expect(xs).toEqual([...xs].sort((a, b) => b - a));
    const [line, m0, m1] = [await bounds(step(page, 'horizontal-rtl', 0).locator('.connector')), await bounds(marker(page, 'horizontal-rtl', 0)), await bounds(marker(page, 'horizontal-rtl', 1))];
    expect(line.x + line.width).toBeLessThan(m0.x);
    expect(line.x).toBeGreaterThan(m1.x + m1.width);
    expect(await css(marker(page, 'horizontal-rtl', 0).locator('.glyph'), 'transform')).toBe('none');
    const segments = stepper(page, 'compact-rtl').locator('.segment');
    const [first, last] = [await bounds(segments.nth(0)), await bounds(segments.nth(3))];
    expect(first.x).toBeGreaterThan(last.x);
    expect(await css(segments.nth(0), 'background-color')).toBe(await resolveColor(page, T('bar-filled-color')));
    // The order stays first to last.
    expect(await page.locator('[data-fixture="horizontal-rtl"]').ariaSnapshot()).toMatch(/الحساب[\s\S]*الشحن[\s\S]*الدفع[\s\S]*المراجعة/);
  });

  test('SPR-26: each label, description and the position is text of its own direction — a left-to-right description keeps its order in a right-to-left stepper — placed and aligned by the layout', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('horizontal-rtl'), fx('compact-rtl')] });
    const description = step(page, 'horizontal-rtl', 1).locator('.description');
    expect(await css(description, 'unicode-bidi')).toBe('plaintext');
    expect(await css(step(page, 'horizontal-rtl', 1).locator('.label'), 'unicode-bidi')).toBe('plaintext');
    expect(await css(stepper(page, 'compact-rtl').locator('.position'), 'unicode-bidi')).toBe('plaintext');
    // Aligned by the layout: the description's right edge on its label's right edge.
    const [d, l] = [await bounds(description), await bounds(step(page, 'horizontal-rtl', 1).locator('.label'))];
    expect(d.x + d.width).toBeCloseTo(l.x + l.width, 0);
  });

  test('SPR-27: while the icon set cannot draw a marker’s glyph nothing is drawn in its place — never its name — the marker keeps its size, fill and ring, the condition is still said; the glyph appears once the font arrives', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('horizontal-error')] });
    await withoutIconFont(page);
    const glyph = marker(page, 'horizontal-error', 0).locator('.glyph');
    await expect(glyph).not.toHaveAttribute('data-drawn');
    expect(await css(glyph, 'visibility')).toBe('hidden');
    expect((await bounds(marker(page, 'horizontal-error', 0))).width).toBeCloseTo(await resolveToken(page, T('marker-size')), 0);
    expect(await page.locator('[data-fixture="horizontal-error"]').ariaSnapshot()).toContain('Account Completed');
    await iconFaceArrives(page);
    await expect(glyph).toHaveAttribute('data-drawn', '');
    expect(await css(glyph, 'visibility')).toBe('visible');
  });

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await motionEnded(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
