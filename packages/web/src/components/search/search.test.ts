// <tanrei-search>, driven by specs/search.spec.json: every behaviour id (SRC-1…51) is cited by a test title, every
// fixture has a baseline, and every size, color and width is read back from the tokens — never from a number written
// here. Its clear and back buttons and the slots' buttons are real icon-only <tanrei-button>s.
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
import { opticalSize } from '../../../test/icons.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('search');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-search`);
const bar = (page: P, id: string) => host(page, id).locator('.bar');
const input = (page: P, id: string) => host(page, id).locator('.bar .input');
const headerInput = (page: P, id: string) => host(page, id).locator('.header .input');
const row = (page: P, id: string, n: number) => host(page, id).locator(`#option-${n}`);
const view = (page: P, id: string) => host(page, id).locator('.view');
const dialog = (page: P, id: string) => host(page, id).locator('.full');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (locator: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(locator, property, pseudo));
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-search-${name}`;
const S = (name: string) => T(`standard-${name}`);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
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

const SUGGESTIONS = spec.fixtures.find((f) => f.id === 'docked')!.items!;
const suggestion = (value: string, headline = value, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'suggestion', props: { value, headline, ...props } });
/** A search as a product has it: the real overlay (not drawn in place), named, with the fixture's three suggestions. */
const live = (id: string, props: Fixture['props'] = {}, items: FixtureItem[] = SUGGESTIONS): Fixture => ({
  id,
  props: { label: 'Search mail', placeholder: 'Search mail', clearLabel: 'Clear search', backLabel: 'Back', inline: false, ...props },
  items,
});
/** Mounts fixtures with a button before and after them, so focus and presses have somewhere else to go. */
async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mountFixtures(page, spec, { reducedMotion: true, icons: true, ...options, fixtures });
  await page.evaluate(() => {
    document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="before" type="button">Before</button>');
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after" type="button">After</button>');
  });
}
/** Records the search's events, with the value or detail each one carried. */
const wire = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).log = [] as string[]);
    el.addEventListener('input', () => log.push(`input:${(el as any).value}`));
    el.addEventListener('submit', (e) => log.push(`submit:${(e as CustomEvent).detail.value}`));
    el.addEventListener('select', (e) => log.push(`select:${(e as CustomEvent).detail.value}`));
    el.addEventListener('toggle', (e) => {
      const d = (e as CustomEvent).detail;
      log.push(`toggle:${d.expanded}:${d.reason}:${(el as any).expanded}`);
    });
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const prop = (locator: Locator, name: string) => locator.evaluate((el, n) => (el as any)[n], name);
const popoverOpen = (locator: Locator) => locator.evaluate((el) => el.matches(':popover-open'));
/** The deepest focused element's class and the host it is in. */
const focusedClass = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active ? `${active.localName}.${[...active.classList].join('.')}${active.id ? `#${active.id}` : ''}` : null;
  });

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
  });

  test('SRC-1: the bar is as wide as its layout, container.height high, on its color, elevation and corners; its row keeps the paddings and the gap — its action buttons container.button-gap from one another, or what SRC-34 keeps for their targets — each element centred', async ({ page }) => {
    const [height, pad, padButton, gap, buttonGap] = await Promise.all(
      ['container-height', 'container-padding-inline', 'container-padding-inline-with-button', 'container-gap', 'container-button-gap'].map((n) => resolveToken(page, T(n))),
    );
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    /** SRC-34: the space between two action buttons — the button gap, or as much more as their targets need. */
    const kept = (first: number, second: number) => Math.max(buttonGap, Math.max(0, (touch - first) / 2) + Math.max(0, (touch - second) / 2));
    for (const id of ['bar', 'bar-value', 'bar-slots', 'bar-value-slots', 'bar-disabled']) {
      const [own, stage] = [await bounds(bar(page, id)), await bounds(page.locator(`[data-fixture="${id}"]`))];
      // The verify: 328 wide, centred in a 360 × 72 stage.
      expect([own.width, stage.width, stage.height], id).toEqual([328, 360, 72]);
      expect(own.height, id).toBeCloseTo(height, 1);
      expect(own.x - stage.x, id).toBeCloseTo(16, 1);
      expect(own.y + own.height / 2 - stage.y, id).toBeCloseTo(36, 1);
    }
    expect(await css(bar(page, 'bar'), 'background-color')).toBe(await resolveColor(page, S('container-color')));
    expect(await css(bar(page, 'bar'), 'box-shadow')).toBe(await shadowOf(page, `var(${S('container-elevation')})`));
    // A pill in the default system: the corner is at least half the height.
    expect(await px(bar(page, 'bar'), 'border-top-left-radius')).toBeGreaterThanOrEqual(height / 2);

    // bar: glyph, input — the input is last, padding-inline from the end.
    const b = await bounds(bar(page, 'bar'));
    const glyph = await bounds(host(page, 'bar').locator('.glyph'));
    const field = await bounds(input(page, 'bar'));
    expect(glyph.x - b.x).toBeCloseTo(pad, 1);
    expect(field.x - (glyph.x + glyph.width)).toBeCloseTo(gap, 1);
    expect(b.x + b.width - (field.x + field.width)).toBeCloseTo(pad, 1);
    for (const box of [glyph, field]) expect(box.y + box.height / 2).toBeCloseTo(b.y + b.height / 2, 0);
    // bar-value: the clear button is last, padding-inline-with-button from the end, gap after the input.
    const v = await bounds(bar(page, 'bar-value'));
    const clear = await bounds(host(page, 'bar-value').locator('.clear'));
    const valueField = await bounds(input(page, 'bar-value'));
    expect(v.x + v.width - (clear.x + clear.width)).toBeCloseTo(padButton, 1);
    expect(clear.x - (valueField.x + valueField.width)).toBeCloseTo(gap, 1);
    expect(clear.y + clear.height / 2).toBeCloseTo(v.y + v.height / 2, 0);
    // bar-slots: the leading button in place of the glyph, padding-inline-with-button from the start; two trailing
    // buttons, the button gap apart or what their targets need (SRC-34), the last padding-inline-with-button from the end.
    const s = await bounds(bar(page, 'bar-slots'));
    const lead = await bounds(host(page, 'bar-slots').locator('tanrei-button[slot="leading"]'));
    const trail = await Promise.all([0, 1].map((n) => bounds(host(page, 'bar-slots').locator('tanrei-button[slot="trailing"]').nth(n))));
    expect(await host(page, 'bar-slots').locator('.glyph').count()).toBe(0);
    expect(lead.x - s.x).toBeCloseTo(padButton, 1);
    expect(trail[1].x - (trail[0].x + trail[0].width)).toBeCloseTo(kept(trail[0].width, trail[1].width), 1);
    expect(s.x + s.width - (trail[1].x + trail[1].width)).toBeCloseTo(padButton, 1);
    const slotsField = await bounds(input(page, 'bar-slots'));
    expect(slotsField.x - (lead.x + lead.width)).toBeCloseTo(gap, 1);
    expect(trail[0].x - (slotsField.x + slotsField.width)).toBeCloseTo(gap, 1);
    // bar-value-slots: the input, the gap, the clear button, then the trailing buttons — each centred on the row.
    const w = await bounds(bar(page, 'bar-value-slots'));
    const actions = await Promise.all([host(page, 'bar-value-slots').locator('.bar > .clear'), ...[0, 1].map((n) => host(page, 'bar-value-slots').locator('tanrei-button[slot="trailing"]').nth(n))].map(bounds));
    const wideField = await bounds(input(page, 'bar-value-slots'));
    expect(actions[0].x - (wideField.x + wideField.width)).toBeCloseTo(gap, 1);
    for (const n of [1, 2]) expect(actions[n].x - (actions[n - 1].x + actions[n - 1].width)).toBeCloseTo(kept(actions[n - 1].width, actions[n].width), 1);
    expect(w.x + w.width - (actions[2].x + actions[2].width)).toBeCloseTo(padButton, 1);
    for (const box of actions) expect(box.y + box.height / 2).toBeCloseTo(w.y + w.height / 2, 0);

    // Right to left mirrors the row.
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const r = await bounds(bar(page, 'bar-value'));
    const rGlyph = await bounds(host(page, 'bar-value').locator('.glyph'));
    const rClear = await bounds(host(page, 'bar-value').locator('.clear'));
    expect(r.x + r.width - (rGlyph.x + rGlyph.width)).toBeCloseTo(pad, 1);
    expect(rClear.x - r.x).toBeCloseTo(padButton, 1);
  });

  test('SRC-34: the bar’s action buttons — the clear button and the trailing slot’s — stand container.button-gap apart and two of them further only as far as each needs to keep sys.target.touch of length along the row: the small clear button and a medium Button 12 apart, two medium Buttons 8, two large ones touching, all three touching where the target is 0; the first still container.gap after the input and the last padding-inline-with-button from the end; no button is widened or restyled, whatever the pointer', async ({ page, browserName }) => {
    const slots = (id: string): Fixture => ({ ...spec.fixtures.find((f) => f.id === 'bar-value-slots')!, id });
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [slots('bar-value-slots'), slots('zero'), slots('large'), slots('wide-gap'), ...spec.fixtures.filter((f) => f.id === 'bar-slots' || f.id === 'bar-value')] });
    const [gap, buttonGap, padButton, touch] = [await resolveToken(page, T('container-gap')), await resolveToken(page, T('container-button-gap')), await resolveToken(page, T('container-padding-inline-with-button')), await resolveToken(page, '--tanrei-sys-target-touch')];
    // SRC-25's verify, under the default system.
    expect([gap, buttonGap, padButton, touch]).toEqual([16, 0, 8, 48]);
    const actions = (id: string) => [host(page, id).locator('.bar > .clear'), host(page, id).locator('tanrei-button[slot="trailing"]').nth(0), host(page, id).locator('tanrei-button[slot="trailing"]').nth(1)];
    const visible = (id: string) => Promise.all(actions(id).map((action) => bounds(action.locator('button'))));
    const apart = async (id: string) => {
      const boxes = await visible(id);
      return boxes.slice(1).map((box, n) => Math.round((box.x - (boxes[n].x + boxes[n].width)) * 100) / 100);
    };
    // SRC-34's verify: the small clear button (32) and the first trailing Button (40) stand 12 apart (8 + 4), and the
    // two trailing Buttons 8 apart (4 + 4), where each pair stood 16 apart.
    await expect.poll(() => apart('bar-value-slots')).toEqual([12, 8]);
    const boxes = await visible('bar-value-slots');
    expect(boxes.map((box) => box.width)).toEqual([32, 40, 40]);
    // The first action button still stands container.gap after the input, the last padding-inline-with-button from the end.
    const own = await bounds(bar(page, 'bar-value-slots'));
    const field = await bounds(input(page, 'bar-value-slots'));
    expect(boxes[0].x - (field.x + field.width)).toBeCloseTo(gap, 1);
    expect(own.x + own.width - (boxes[2].x + boxes[2].width)).toBeCloseTo(padButton, 1);
    // No button is widened, resized or restyled (SRC-25): each is its size's own square, and its element is as wide as what is seen.
    for (const [n, size] of [[0, 'small'], [1, 'medium'], [2, 'medium']] as const) {
      const side = await resolveToken(page, `--tanrei-comp-button-container-height-${size}`);
      expect([boxes[n].width, boxes[n].height]).toEqual([side, side]);
      expect((await bounds(actions('bar-value-slots')[n])).width).toBe(side);
    }
    // Without the clear button the first trailing Button is the first action button: the gap after the input, 8 to the next.
    const pair = await Promise.all([0, 1].map((n) => bounds(host(page, 'bar-slots').locator('tanrei-button[slot="trailing"]').nth(n))));
    const slotsField = await bounds(input(page, 'bar-slots'));
    expect(pair[0].x - (slotsField.x + slotsField.width)).toBeCloseTo(gap, 1);
    expect(pair[1].x - (pair[0].x + pair[0].width)).toBeCloseTo(8, 1);
    // The clear button alone: the gap after the input, and nothing kept beside it.
    const lone = await bounds(host(page, 'bar-value').locator('.bar > .clear'));
    const loneBar = await bounds(bar(page, 'bar-value'));
    expect(loneBar.x + loneBar.width - (lone.x + lone.width)).toBeCloseTo(padButton, 1);
    // The clear button comes and goes with the value: the trailing Buttons keep their 8, and the first takes the gap after the input.
    await host(page, 'bar-value-slots').evaluate(async (el: any) => { el.value = ''; await el.updateComplete; });
    await expect(host(page, 'bar-value-slots').locator('.bar > .clear')).toHaveCount(0);
    const cleared = await Promise.all([0, 1].map((n) => bounds(host(page, 'bar-value-slots').locator('tanrei-button[slot="trailing"]').nth(n))));
    const clearedField = await bounds(input(page, 'bar-value-slots'));
    expect(cleared[0].x - (clearedField.x + clearedField.width)).toBeCloseTo(gap, 1);
    expect(cleared[1].x - (cleared[0].x + cleared[0].width)).toBeCloseTo(8, 1);
    expect(cleared[1].x).toBeCloseTo(boxes[2].x, 1);
    await host(page, 'bar-value-slots').evaluate(async (el: any) => { el.value = 'invoice'; await el.updateComplete; });
    await expect.poll(() => apart('bar-value-slots')).toEqual([12, 8]);
    // Unit: with sys.target.touch set to 0 in a test layer the three buttons touch.
    await page.evaluate(() => (document.querySelector('[data-fixture="zero"]') as HTMLElement).style.setProperty('--tanrei-sys-target-touch', '0px'));
    await expect.poll(() => apart('zero')).toEqual([0, 0]);
    // Unit: with two large (56) Buttons in the trailing slot they touch under the default system; the small clear button stands its 8 from the first.
    await host(page, 'large').evaluate((el) => { for (const button of el.querySelectorAll('tanrei-button[slot="trailing"]')) button.setAttribute('size', 'large'); });
    await expect.poll(() => apart('large')).toEqual([8, 0]);
    expect((await visible('large')).map((box) => box.width)).toEqual([32, 56, 56]);
    // A layer whose button gap is wider than what the targets need (a preset's: its gap): the gap is the space.
    await page.evaluate((name) => (document.querySelector('[data-fixture="wide-gap"]') as HTMLElement).style.setProperty(name, '16px'), T('container-button-gap'));
    await expect.poll(() => apart('wide-gap')).toEqual([16, 16]);
    // The same whatever the input type.
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await apart('bar-value-slots')).toEqual([12, 8]);
      // SRC-25: under a coarse pointer every action button's hit area is at least sys.target.touch wide, and two
      // neighbours' stop where the lengths kept for them meet — they touch and never overlap.
      const hit = (action: Locator) =>
        action.locator('button').evaluate((el) => {
          const r = getComputedStyle(el, '::before');
          const box = el.getBoundingClientRect();
          const width = Number.parseFloat(r.width);
          return { left: box.left + box.width / 2 - width / 2, right: box.left + box.width / 2 + width / 2 };
        });
      const hits = await Promise.all(actions('bar-value-slots').map(hit));
      for (const area of hits) expect(area.right - area.left).toBeGreaterThanOrEqual(touch);
      for (const n of [1, 2]) expect(hits[n].left).toBeCloseTo(hits[n - 1].right, 1);
      // …and the last one's does not pass the bar's edge by more than the padding lets it: 8 + 4 inside the bar.
      const edge = await bounds(bar(page, 'bar-value-slots'));
      expect(hits[2].right).toBeLessThanOrEqual(edge.x + edge.width + 0.01);
    }
    // Right to left mirrors the row.
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await expect.poll(async () => {
      const mirrored = await visible('bar-value-slots');
      return mirrored.slice(1).map((box, n) => Math.round((mirrored[n].x - (box.x + box.width)) * 100) / 100);
    }).toEqual([12, 8]);
  });

  test('SRC-2: the search glyph is drawn at leading-icon.size in the unselected family, fill and weight, in its color, hidden from assistive technology', async ({ page }) => {
    const glyph = host(page, 'bar').locator('.glyph');
    await expect(glyph).toHaveText('search');
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(await px(glyph, 'font-size')).toBe(await resolveToken(page, T('leading-icon-size')));
    expect((await bounds(glyph)).width).toBeCloseTo(await resolveToken(page, T('leading-icon-size')), 1);
    expect(await css(glyph, 'color')).toBe(await resolveColor(page, S('leading-icon-color')));
    expect(await css(glyph, 'font-family')).toContain((await token(page, '--tanrei-ref-typeface-icon')).split(',')[0].replace(/["']/g, '').trim());
    const variation = await css(glyph, 'font-variation-settings');
    expect(variation).toContain(`"FILL" ${Number(await token(page, '--tanrei-sys-icon-fill-unselected'))}`);
    expect(variation).toContain(`"wght" ${Number(await token(page, '--tanrei-sys-icon-weight'))}`);
    // The optical size is the box's, clamped to sys.icon.optical-size (test/icons.ts).
    const opsz = await opticalSize(page, await resolveToken(page, T('leading-icon-size')));
    if (opsz === undefined) expect(variation).not.toContain('"opsz"');
    else expect(variation).toContain(`"opsz" ${opsz}`);
    expect(await css(glyph, 'font-optical-sizing')).toBe('auto');
    await expect(glyph).toHaveAttribute('data-drawn', '');
    // No path, shape or character of its own — for the search glyph, nor for the clear button's (bar-value).
    for (const id of ['bar', 'bar-value']) expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, img, canvas').length), id).toBe(0);
    await expect(host(page, 'bar-value').locator('.clear .button-glyph')).toHaveText('close');
    // Not mirrored in a right-to-left layout: laid out left to right, neither flipped nor scaled.
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    expect(await css(glyph, 'direction')).toBe('ltr');
    expect(await css(glyph, 'transform')).toBe('none');
    expect(await css(glyph, 'scale')).toBe('none');
  });

  test('SRC-3: the value is one line in input.typescale and its color, scrolling sideways; the placeholder in its color; the caret and the selection in theirs', async ({ page }) => {
    const field = input(page, 'bar-value');
    expect(await px(field, 'font-size')).toBe(await resolveToken(page, T('input-typescale-font-size')));
    expect(await css(field, 'color')).toBe(await resolveColor(page, S('input-color')));
    expect(await css(field, 'caret-color')).toBe(await resolveColor(page, S('caret-color')));
    expect(await css(input(page, 'bar'), 'color', '::placeholder')).toBe(await resolveColor(page, S('placeholder-color')));
    expect(await css(field, 'background-color', '::selection')).toBe(await resolveColor(page, '--tanrei-comp-input-box-selection-color'));
    // The text on the highlight is the pair's other half.
    expect(await css(field, 'color', '::selection')).toBe(await resolveColor(page, '--tanrei-comp-input-box-selection-content-color'));
    // A long value stays on one line and scrolls inside the input; the bar keeps its height.
    const height = (await bounds(bar(page, 'bar-value'))).height;
    await host(page, 'bar-value').evaluate((el) => ((el as any).value = 'invoices from the last quarter of the year, with attachments and the reminders'));
    await expect.poll(() => field.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect((await bounds(bar(page, 'bar-value'))).height).toBe(height);
  });

  test('SRC-16: each suggestion is one row — its minimum height and the target, its paddings, the icon column in every row, the gap, both text roles, the corners — and wraps rather than cuts; right to left mirrors it', async ({ page }) => {
    const [height, pointer, padInline, padBlock, gap, iconSize] = await Promise.all(
      ['suggestion-container-height-regular', '--tanrei-sys-target-pointer', 'suggestion-container-padding-inline-regular', 'suggestion-container-padding-block-regular', 'suggestion-container-gap-regular', 'suggestion-leading-icon-size-regular'].map((n) =>
        resolveToken(page, n.startsWith('--') ? n : T(n)),
      ),
    );
    for (const n of [0, 1, 2]) {
      const r = row(page, 'docked', n);
      const box = await bounds(r);
      expect(box.height, `row ${n}`).toBeGreaterThanOrEqual(Math.max(height, pointer) - 0.01);
      expect(await px(r, 'padding-left')).toBe(padInline);
      expect(await px(r, 'padding-top')).toBe(padBlock);
      const icon = await bounds(r.locator('.option-icon'));
      const headline = await bounds(r.locator('.headline'));
      expect(icon.x - box.x).toBeCloseTo(padInline, 1);
      expect(icon.width).toBeCloseTo(iconSize, 1);
      expect(headline.x - (icon.x + icon.width)).toBeCloseTo(gap, 1);
      expect(await px(r.locator('.headline'), 'font-size')).toBe(await resolveToken(page, T('suggestion-headline-typescale-font-size')));
      expect(await px(r, 'border-top-left-radius')).toBe(await resolveToken(page, T('suggestion-container-shape')));
    }
    // The two-line row grows by its supporting text, in its own role.
    const third = row(page, 'docked', 2);
    expect(await px(third.locator('.supporting'), 'font-size')).toBe(await resolveToken(page, T('suggestion-supporting-text-typescale-font-size')));
    expect((await bounds(third)).height).toBeGreaterThan((await bounds(row(page, 'docked', 0))).height);
    // Headlines align in every row, whatever each row's icon.
    const xs = await Promise.all([0, 1, 2].map(async (n) => (await bounds(row(page, 'docked', n).locator('.headline'))).x));
    expect(new Set(xs).size).toBe(1);
    // A long headline wraps and grows the row; nothing is cut.
    await host(page, 'docked').locator('tanrei-search-suggestion').first().evaluate((el) => ((el as any).headline = 'invoices sent to the accounting department during the last quarter of the year'));
    await expect.poll(async () => (await bounds(row(page, 'docked', 0))).height).toBeGreaterThan(height + 10);
    const headline = row(page, 'docked', 0).locator('.headline');
    expect(await headline.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Right to left: the icon at the right edge.
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    const box = await bounds(row(page, 'docked', 1));
    const icon = await bounds(row(page, 'docked', 1).locator('.option-icon'));
    expect(box.x + box.width - (icon.x + icon.width)).toBeCloseTo(padInline, 1);
  });

  test('SRC-16: with no leading icon on any suggestion no icon column is drawn; with one, every row keeps the column', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'plain', props: { label: 'Search', expanded: true }, items: [suggestion('a'), suggestion('b')] },
        { id: 'one', props: { label: 'Search', expanded: true }, items: [suggestion('a', 'a', { leadingIcon: 'history' }), suggestion('b')] },
      ],
    });
    expect(await host(page, 'plain').locator('.option-icon').count()).toBe(0);
    expect(await host(page, 'one').locator('.option-icon').count()).toBe(2);
    const [a, b] = [await bounds(row(page, 'one', 0).locator('.headline')), await bounds(row(page, 'one', 1).locator('.headline'))];
    expect(a.x).toBe(b.x);
  });

  test('SRC-52: iconSpace — auto keeps the leading icon column, empty, in every row of the view while any suggestion or result has an icon, and none while none has; always in every row; never only in a row that has an icon; the suggestions and the results are decided together; decided again when an icon changes; an unknown value is auto, reported', async ({ page }) => {
    const seen = warnings(page);
    const spaced = spec.fixtures.filter((f) => f.id.startsWith('icon-space-'));
    expect(spaced.map((f) => f.id)).toEqual(['icon-space-auto', 'icon-space-always', 'icon-space-never']);
    const result = (value: string, headline: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'result', props: { value, headline, href: `#${value}`, ...props } });
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spaced,
        { id: 'plain', props: { label: 'Search', expanded: true }, items: [suggestion('a'), suggestion('b')] },
        { id: 'plain-always', props: { label: 'Search', expanded: true, iconSpace: 'always' }, items: [suggestion('a'), suggestion('b')] },
        { id: 'mixed', props: { label: 'Search', expanded: true }, items: [suggestion('a', 'a', { leadingIcon: 'history' }), result('r', 'A result')] },
        { id: 'mixed-never', props: { label: 'Search', expanded: true, iconSpace: 'never' }, items: [suggestion('a', 'a', { leadingIcon: 'history' }), result('r', 'A result')] },
        { id: 'odd', props: { label: 'Search', expanded: true, iconSpace: 'sometimes' } as Fixture['props'], items: [suggestion('a', 'a', { leadingIcon: 'history' }), suggestion('b')] },
      ],
    });
    const pad = await resolveToken(page, T('suggestion-container-padding-inline-regular'));
    const size = await resolveToken(page, T('suggestion-leading-icon-size-regular'));
    const gap = await resolveToken(page, T('suggestion-container-gap-regular'));
    const none = pad;
    const kept = pad + size + gap;
    /** Where a suggestion's headline starts, from its row's start edge. */
    const at = async (id: string, n: number) => (await bounds(row(page, id, n).locator('.headline'))).x - (await bounds(row(page, id, n))).x;
    /** Where the first result's headline starts, from its row's start edge. */
    const resultAt = async (id: string) => {
      const r = host(page, id).locator('tanrei-search-result').first().locator('.row');
      return (await bounds(r.locator('.headline'))).x - (await bounds(r)).x;
    };
    expect(await host(page, 'icon-space-auto').evaluate((el: any) => el.iconSpace)).toBe('auto');
    // auto and always: Invoices, which has no icon, starts its headline where the history rows start theirs.
    for (const id of ['icon-space-auto', 'icon-space-always']) for (const n of [0, 1, 2]) expect(await at(id, n), `${id} ${n}`).toBeCloseTo(kept, 0);
    await expect(row(page, 'icon-space-auto', 2).locator('.option-icon.empty[aria-hidden="true"]')).toHaveCount(1);
    // never: Invoices starts at the row's padding; the others after their icon.
    expect(await at('icon-space-never', 2)).toBeCloseTo(none, 0);
    expect(await at('icon-space-never', 0)).toBeCloseTo(kept, 0);
    await expect(row(page, 'icon-space-never', 2).locator('.option-icon')).toHaveCount(0);
    // The view as a whole: no icon anywhere keeps no column (auto), and every row keeps it (always).
    for (const n of [0, 1]) {
      expect(await at('plain', n)).toBeCloseTo(none, 0);
      expect(await at('plain-always', n)).toBeCloseTo(kept, 0);
    }
    // A result keeps the column of the suggestions' icon while auto, and none of its own while never.
    expect(await resultAt('mixed')).toBeCloseTo(await at('mixed', 0), 0);
    expect(await resultAt('mixed-never')).toBeCloseTo(none, 0);
    // An unknown value is auto, reported.
    expect(await at('odd', 1)).toBeCloseTo(kept, 0);
    await expect.poll(() => seen.some((w) => w.includes('(SRC-52)') && w.includes('sometimes'))).toBe(true);
    // Decided again: an icon given to a row of a view without icons, then taken away; iconSpace changed while shown.
    await host(page, 'plain').evaluate((el) => el.querySelector('tanrei-search-suggestion')!.setAttribute('leading-icon', 'history'));
    await expect.poll(() => at('plain', 1)).toBeCloseTo(kept, 0);
    await host(page, 'plain').evaluate((el) => el.querySelector('tanrei-search-suggestion')!.removeAttribute('leading-icon'));
    await expect.poll(() => at('plain', 1)).toBeCloseTo(none, 0);
    await host(page, 'icon-space-auto').evaluate((el: any) => (el.iconSpace = 'never'));
    await expect.poll(() => at('icon-space-auto', 2)).toBeCloseTo(none, 0);
    await host(page, 'mixed-never').evaluate((el) => el.setAttribute('icon-space', 'auto'));
    await expect.poll(() => resultAt('mixed-never')).toBeCloseTo(kept, 0);
  });

  test('SRC-53: a compact search draws every row of its view — a suggestion and a result — from the compact tokens, lower, set in less, a smaller glyph, the same text, as low as its density gives for a mouse and the touch target for touch, the bar unchanged; an unknown density is regular and reported, an added one is drawn from its tokens, and a change is drawn at once', async ({ page, browserName }) => {
    const seen = warnings(page);
    const compact = spec.fixtures.find((f) => f.id === 'density-compact')!;
    const result = (value: string, headline: string): FixtureItem => ({ kind: 'result', props: { value, headline, href: `#${value}`, leadingIcon: 'description' } });
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        compact,
        { ...compact, id: 'density-regular', props: { ...compact.props, density: 'regular' } },
        { id: 'density-results', props: { label: 'Search', expanded: true, density: 'compact' }, items: [result('r', 'A result')] },
        { ...compact, id: 'density-odd', props: { ...compact.props, density: 'huge' } as Fixture['props'] },
        { ...compact, id: 'density-added', props: { ...compact.props, density: 'roomy' } as Fixture['props'] },
      ],
    });
    const sizes = async (density: string) => {
      const [height, padBlock, padInline, gap, icon] = await Promise.all(
        ['suggestion-container-height', 'suggestion-container-padding-block', 'suggestion-container-padding-inline', 'suggestion-container-gap', 'suggestion-leading-icon-size'].map((n) => resolveToken(page, T(`${n}-${density}`))),
      );
      return { height, padBlock, padInline, gap, icon };
    };
    const [regular, small] = [await sizes('regular'), await sizes('compact')];
    // The default system's compact row: the tree view's, 32 high with a 20 glyph, 8 from its edges.
    expect([small.height, small.icon, small.padInline]).toEqual([32, 20, 8]);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const drawn = async (r: Locator) => {
      const [b, icon, headline, font] = [await bounds(r), await bounds(r.locator('.option-icon, .icon').first()), await bounds(r.locator('.headline')), await px(r.locator('.headline'), 'font-size')];
      return { height: b.height, icon: icon.width, start: headline.x - b.x, font };
    };
    const first = await drawn(row(page, 'density-compact', 0));
    const firstRegular = await drawn(row(page, 'density-regular', 0));
    expect(first.height).toBeCloseTo(small.height, 0);
    expect(first.height).toBeLessThan(pointer);
    expect(first.icon).toBeCloseTo(small.icon, 0);
    expect(first.start).toBeCloseTo(small.padInline + small.icon + small.gap, 0);
    expect(firstRegular.height).toBeCloseTo(Math.max(regular.height, pointer), 0);
    // The density never changes a text style; a row with supporting text grows with it.
    expect(first.font).toBe(firstRegular.font);
    expect((await bounds(row(page, 'density-compact', 2))).height).toBeGreaterThan(first.height);
    // A result's row takes the search's density too.
    const resultRow = await drawn(host(page, 'density-results').locator('tanrei-search-result').first().locator('.row'));
    expect(resultRow.height).toBeCloseTo(small.height, 0);
    expect(resultRow.icon).toBeCloseTo(small.icon, 0);
    // The bar is the bar's, whatever the density.
    const bar = (id: string) => host(page, id).locator('.bar').first();
    expect((await bounds(bar('density-compact'))).height).toBeCloseTo((await bounds(bar('density-regular'))).height, 0);
    // An unknown density is drawn as regular, and a debug build says so.
    expect((await drawn(row(page, 'density-odd', 0))).height).toBeCloseTo(firstRegular.height, 0);
    await expect.poll(() => seen.filter((w) => w.includes('SRC-53') && w.includes('"huge"')).length).toBe(1);
    // A density a design system adds is drawn from its tokens, the default's where it has none.
    await rootTokens(page, { [T('suggestion-container-height-roomy')]: '64px', [T('suggestion-leading-icon-size-roomy')]: '28px' });
    await expect.poll(async () => (await drawn(row(page, 'density-added', 0))).height).toBeCloseTo(64, 0);
    expect((await drawn(row(page, 'density-added', 0))).icon).toBeCloseTo(28, 0);
    // A change is drawn at once.
    await host(page, 'density-regular').evaluate((el: any) => (el.density = 'compact'));
    await expect.poll(async () => (await drawn(row(page, 'density-regular', 0))).height).toBeCloseTo(first.height, 0);
    // SRC-16: for touch a compact row is the touch target.
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await expect.poll(async () => (await drawn(row(page, 'density-compact', 0))).height).toBeCloseTo(await resolveToken(page, '--tanrei-sys-target-touch'), 0);
  });

  test('SRC-7: the docked fixture draws the bar 16 from the stage’s top and sides and the view in place under it, offset away, as wide as the bar, on its color, elevation and corners, its content inset by the padding', async ({ page }) => {
    const stage = await bounds(page.locator('[data-fixture="docked"]'));
    expect([stage.width, stage.height]).toEqual([360, 320]);
    const b = await bounds(bar(page, 'docked'));
    expect([b.x - stage.x, b.y - stage.y, b.width]).toEqual([16, 16, 328]);
    const v = await bounds(view(page, 'docked'));
    expect(v.y - (b.y + b.height)).toBeCloseTo(await resolveToken(page, T('view-offset')), 1);
    expect([v.x, v.width]).toEqual([b.x, b.width]);
    expect(await css(view(page, 'docked'), 'background-color')).toBe(await resolveColor(page, T('view-container-color')));
    expect(await css(view(page, 'docked'), 'box-shadow')).toBe(await shadowOf(page, `var(${T('view-container-elevation')})`));
    expect(await px(view(page, 'docked'), 'border-top-left-radius')).toBe(await resolveToken(page, T('view-container-shape')));
    expect(await css(view(page, 'docked'), 'overflow')).toBe('hidden');
    const first = await bounds(row(page, 'docked', 0));
    expect(first.y - v.y).toBeCloseTo(await resolveToken(page, T('view-padding-block')), 1);
    expect(first.x - v.x).toBeCloseTo(await resolveToken(page, T('view-padding-inline')), 1);
  });

  test('SRC-9: the full-screen fixture fills its 360 × 480 stage in the view color: a header at least header.height high with the back button, the input and the clear button, a divider across, then the suggestions', async ({ page }) => {
    const stage = await bounds(page.locator('[data-fixture="full-screen"]'));
    expect([stage.width, stage.height]).toEqual([360, 480]);
    const d = await bounds(dialog(page, 'full-screen'));
    expect(d).toEqual(stage);
    expect(await css(dialog(page, 'full-screen'), 'background-color')).toBe(await resolveColor(page, T('view-container-color')));
    await expect(bar(page, 'full-screen')).toBeHidden();
    const header = host(page, 'full-screen').locator('.header');
    const h = await bounds(header);
    const pad = await resolveToken(page, T('header-padding-inline'));
    const gap = await resolveToken(page, T('container-gap'));
    expect(h.height).toBeGreaterThanOrEqual((await resolveToken(page, T('header-height'))) - 0.01);
    const back = await bounds(header.locator('.back'));
    const field = await bounds(headerInput(page, 'full-screen'));
    const clear = await bounds(header.locator('.clear'));
    expect(back.x - h.x).toBeCloseTo(pad, 1);
    expect(field.x - (back.x + back.width)).toBeCloseTo(gap, 1);
    expect(clear.x - (field.x + field.width)).toBeCloseTo(gap, 1);
    expect(h.x + h.width - (clear.x + clear.width)).toBeCloseTo(pad, 1);
    for (const box of [back, field, clear]) expect(box.y + box.height / 2).toBeCloseTo(h.y + h.height / 2, 0);
    const divider = host(page, 'full-screen').locator('.divider');
    const line = await bounds(divider);
    expect([line.x, line.width, line.y]).toEqual([d.x, d.width, h.y + h.height]);
    expect(line.height).toBeCloseTo(await resolveToken(page, T('divider-thickness')), 1);
    expect(await css(divider, 'background-color')).toBe(await resolveColor(page, T('divider-color')));
    expect((await bounds(row(page, 'full-screen', 0))).y).toBeGreaterThan(line.y);
    // The header's input in the resting colors of the bar's input.
    expect(await css(headerInput(page, 'full-screen'), 'color')).toBe(await resolveColor(page, S('input-color')));
  });

  test('SRC-29: the product’s own content follows the suggestions in the headline color, inset by the suggestion padding, plain text in sys.typescale.body', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [{ id: 'content', props: { label: 'Search', expanded: true }, items: [suggestion('a')], content: 'No more results' }],
    });
    const content = host(page, 'content').locator('.content');
    await expect(content).toBeVisible();
    expect(await css(content, 'color')).toBe(await resolveColor(page, S('suggestion-headline-color')));
    expect(await px(content, 'padding-left')).toBe(await resolveToken(page, T('suggestion-container-padding-inline-regular')));
    expect(await px(content, 'font-size')).toBe(await resolveToken(page, '--tanrei-sys-typescale-body-font-size'));
    expect((await bounds(content)).y).toBeGreaterThan((await bounds(row(page, 'content', 0))).y);
    // Content alone is still a view.
    await mountFixtures(page, spec, { fixtures: [{ id: 'only', props: { label: 'Search', expanded: true }, content: '<p>No results</p>' }] });
    await expect(view(page, 'only')).toBeVisible();
    await expect(host(page, 'only').locator('[role="listbox"]')).toHaveCount(0);
  });

  test('SRC-28: enlarged text grows the bar and the header (heights are minimums) with the value on one line, and suggestion rows wrap; the icon buttons do not scale', async ({ page }) => {
    const [clearBefore, height] = [await bounds(host(page, 'bar-value').locator('.clear')), (await bounds(bar(page, 'bar-value'))).height];
    const rowBefore = (await bounds(row(page, 'docked', 2))).height;
    const headerBefore = (await bounds(host(page, 'full-screen').locator('.header'))).height;
    // 300% text: every text role three times its size, as the platform's text size setting does. (At 200% the default
    // system's bar, container.height 56, already holds the input's line: its height is a minimum.)
    for (const role of ['body-large', 'body', 'body-small']) {
      const size = await resolveToken(page, `--tanrei-sys-typescale-${role}-font-size`);
      await override(page, { [`--tanrei-sys-typescale-${role}-font-size`]: `${size * 3}px` });
    }
    await expect.poll(async () => (await bounds(bar(page, 'bar-value'))).height).toBeGreaterThan(height);
    expect((await bounds(bar(page, 'bar-value'))).height).toBeGreaterThanOrEqual((await bounds(input(page, 'bar-value'))).height);
    const field = input(page, 'bar-value');
    expect(await css(field, 'white-space')).toBe('nowrap');
    expect((await bounds(field)).height, 'one line').toBeLessThanOrEqual((await px(field, 'font-size')) * 2);
    // The header is a minimum: it still holds one line of the input, and never shrinks.
    const header = await bounds(host(page, 'full-screen').locator('.header'));
    expect(header.height).toBeGreaterThanOrEqual(Math.max(headerBefore, (await bounds(headerInput(page, 'full-screen'))).height));
    expect((await bounds(row(page, 'docked', 2))).height).toBeGreaterThan(rowBefore);
    const clearAfter = await bounds(host(page, 'bar-value').locator('.clear'));
    expect([clearAfter.width, clearAfter.height]).toEqual([clearBefore.width, clearBefore.height]);
  });
});

test.describe('editing', () => {
  test('SRC-4: every edit emits input once with the new value; a value the product sets emits nothing; the input is a native search input with a search action key and the browser’s cancel button hidden', async ({ page, browserName }) => {
    await mount(page, [live('s', { value: '' })]);
    const field = input(page, 's');
    await expect(field).toHaveAttribute('type', 'search');
    await expect(field).toHaveAttribute('enterkeyhint', 'search');
    // The browser's own cancel button is hidden by the search's styles (getComputedStyle cannot read that pseudo-element).
    const hidden = await host(page, 's').evaluate((el) =>
      [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules]).some((rule) => rule.cssText.includes('::-webkit-search-cancel-button') && rule.cssText.includes('display: none')),
    );
    expect(hidden).toBe(true);
    void browserName;
    await wire(host(page, 's'));
    await field.focus();
    await page.keyboard.type('inv');
    await page.keyboard.press('Backspace');
    expect((await log(page)).filter((e) => e.startsWith('input'))).toEqual(['input:i', 'input:in', 'input:inv', 'input:in']);
    expect(await prop(host(page, 's'), 'value')).toBe('in');
    await host(page, 's').evaluate((el) => ((el as any).value = 'receipts'));
    await expect(field).toHaveValue('receipts');
    // TXF-24: `dir="auto"` once the value has a letter; an empty value keeps the layout's direction.
    await expect(field).toHaveAttribute('dir', 'auto');
    expect((await log(page)).filter((e) => e.startsWith('input')).length).toBe(4);
    // TXF-24: the typed text's own direction.
    await host(page, 's').evaluate((el) => ((el as any).value = 'مرحبا'));
    await expect.poll(() => field.evaluate((el) => el.matches(':dir(rtl)'))).toBe(true);
  });

  test('SRC-4: a composition is left to the input method — nothing written back — and a value set meanwhile waits for its end (TXF-4)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mount(page, [live('ime')]);
    const target = host(page, 'ime');
    await target.evaluate((el) => {
      const log = ((window as any).events = [] as string[]);
      el.addEventListener('input', (event) => {
        log.push(`input:${(el as any).value}:${(event as InputEvent).isComposing}`);
        (el as any).value = (el as any).value; // a controlled search echoes the value back
      });
    });
    await input(page, 'ime').focus();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['け', 'けん', 'けんさ']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    await expect(input(page, 'ime')).toHaveValue('けんさ');
    await target.evaluate((el) => ((el as any).value = 'かな'));
    await expect(input(page, 'ime')).toHaveValue('けんさ');
    await cdp.send('Input.insertText', { text: '検索' });
    await expect(input(page, 'ime')).toHaveValue('かな');
    await expect.poll(() => page.evaluate(() => (window as any).events.at(-1))).toBe('input:かな:false');
    // Typing through the input method opened the view (SRC-5).
    expect(await prop(target, 'expanded')).toBe(true);
  });

  test('SRC-10: while there is a value and it is enabled, a small icon-only text Button showing the icon set’s close, named by clearLabel; it empties the value, emits input once, keeps focus in the input and opens or closes nothing', async ({ page }) => {
    await mount(page, [live('s', { value: 'invoice' }), live('empty'), live('off', { value: 'invoice', disabled: true })]);
    await expect(host(page, 'empty').locator('.clear')).toHaveCount(0);
    await expect(host(page, 'off').locator('.clear')).toHaveCount(0);
    const clear = host(page, 's').locator('.clear');
    await expect(clear).toHaveAttribute('size', 'small');
    expect(await prop(clear, 'variant')).toBe('text');
    await expect(clear).toHaveText('close');
    await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(1);
    await wire(host(page, 's'));
    await clear.click();
    expect(await log(page)).toEqual(['input:']);
    expect(await prop(host(page, 's'), 'value')).toBe('');
    await expect(input(page, 's')).toBeFocused();
    await expect(input(page, 's')).toHaveValue('');
    await expect(clear).toHaveCount(0);
    expect(await prop(host(page, 's'), 'expanded')).toBe(false);
    // While expanded, it stays expanded.
    await host(page, 's').evaluate((el) => ((el as any).value = 'inv'));
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => prop(host(page, 's'), 'expanded')).toBe(true);
    await host(page, 's').locator('.clear').click();
    expect((await log(page)).slice(-1)).toEqual(['input:']);
    expect(await prop(host(page, 's'), 'expanded')).toBe(true);
    await expect(input(page, 's')).toBeFocused();
  });

  test('SRC-10: an empty clearLabel still shows the button, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [live('s', { value: 'x', clearLabel: '' })]);
    await expect(host(page, 's').locator('.clear')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SRC-10')).length).toBe(1);
  });

  test('SRC-12: collapsed, Escape empties a value and emits input once; with an empty value it does nothing and passes on', async ({ page }) => {
    await mount(page, [live('s', { value: 'invoice' })]);
    await wire(host(page, 's'));
    await page.evaluate(() => document.addEventListener('keydown', (e) => e.key === 'Escape' && (window as any).log.push(`page:${e.defaultPrevented}`)));
    await tabTo(page, input(page, 's'));
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['input:', 'page:true']);
    await expect(input(page, 's')).toHaveValue('');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['input:', 'page:true', 'page:false']);
    expect(await prop(host(page, 's'), 'expanded')).toBe(false);
  });
});

test.describe('opening and closing', () => {
  test('SRC-5: a press on the bar, typing or Down Arrow focuses the input and opens the view with one toggle; Tab, a slot button and the clear button do not', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' }, SUGGESTIONS)], { fixtures: undefined });
    await page.evaluate(() => {
      const button = document.createElement('tanrei-button');
      button.setAttribute('slot', 'trailing');
      button.setAttribute('variant', 'text');
      button.setAttribute('label', 'Voice');
      button.innerHTML = '<span slot="icon">mic</span>';
      document.querySelector('tanrei-search')!.append(button);
    });
    const s = host(page, 's');
    await wire(s);
    // Tab into the input: no view.
    await tabTo(page, input(page, 's'));
    expect(await prop(s, 'expanded')).toBe(false);
    // A press on a slot button or the clear button: no view.
    await s.locator('tanrei-button[slot="trailing"]').click();
    await s.locator('.clear').click();
    expect(await log(page)).toEqual(['input:']);
    // A press on the bar (its glyph): focus and one toggle.
    await page.locator('#after').focus();
    await s.locator('.glyph').click();
    await expect(input(page, 's')).toBeFocused();
    expect((await log(page)).filter((e) => e.startsWith('toggle'))).toEqual(['toggle:true:null:true']);
    expect(await s.getAttribute('expanded')).toBe('');
    // Down Arrow, and typing.
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.keyboard.type('x');
    expect((await log(page)).filter((e) => e.startsWith('toggle'))).toEqual([
      'toggle:true:null:true',
      'toggle:false:escape:false',
      'toggle:true:null:true',
      'toggle:false:escape:false',
      'toggle:true:null:true',
    ]);
    // A press on the input itself opens it too.
    await page.keyboard.press('Escape');
    await input(page, 's').click();
    await expect.poll(() => prop(s, 'expanded')).toBe(true);
  });

  test('SRC-6: Escape, a chosen suggestion, submit, a press outside, Tab, Shift+Tab and focus leaving each close the docked view once with their reason; the value stays', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    const s = host(page, 's');
    await wire(s);
    const open = async () => {
      await input(page, 's').focus();
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
    };
    const closes = async (reason: string, act: () => Promise<void>) => {
      await open();
      await page.evaluate(() => ((window as any).log.length = 0));
      await act();
      await expect.poll(() => prop(s, 'expanded'), reason).toBe(false);
      expect((await log(page)).filter((e) => e.startsWith('toggle')), reason).toEqual([`toggle:false:${reason}:false`]);
      expect(await prop(s, 'value'), reason).toBe('inv');
    };
    await closes('escape', () => page.keyboard.press('Escape'));
    await closes('select', () => row(page, 's', 1).click());
    await closes('submit', () => page.keyboard.press('Enter'));
    // A press outside also reaches the element under it (the button above the bar: the open view covers the one after it).
    await page.evaluate(() => document.querySelector('#before')!.addEventListener('click', () => (window as any).log.push('before:click')));
    await closes('outside', () => page.locator('#before').click());
    expect(await log(page)).toContain('before:click');
    // Tab and Shift+Tab: the view closes and focus moves on as it would have.
    await closes('tab', () => tab(page));
    expect(await focusedClass(page)).not.toBe('input.input');
    await closes('tab', () => tab(page, { back: true }));
    await closes('focus-out', () => page.locator('#before').evaluate((el) => (el as HTMLElement).focus()));
    await expect(view(page, 's')).toBeHidden();
  });

  test('SRC-6, SRC-11: the full-screen view closes with escape and with back (the back button, the browser’s close request); Tab and presses stay inside', async ({ page }) => {
    await mount(page, [live('s', { presentation: 'full-screen', value: 'inv' })]);
    const s = host(page, 's');
    await wire(s);
    const open = async () => {
      await s.locator('.glyph').click();
      await expect(headerInput(page, 's')).toBeFocused();
    };
    await open();
    await page.keyboard.press('Escape');
    await expect.poll(() => prop(s, 'expanded')).toBe(false);
    await open();
    await s.locator('.back').click();
    await expect.poll(() => prop(s, 'expanded')).toBe(false);
    await open();
    await dialog(page, 's').evaluate((el) => el.dispatchEvent(new Event('cancel', { cancelable: true })));
    await expect.poll(() => prop(s, 'expanded')).toBe(false);
    expect((await log(page)).filter((e) => e.startsWith('toggle:false'))).toEqual(['toggle:false:escape:false', 'toggle:false:back:false', 'toggle:false:back:false']);
    // Tab stays inside; a press on the page outside is not possible (it is inert).
    await open();
    for (let n = 0; n < 4; n++) await tab(page);
    expect(await s.evaluate((el) => el.shadowRoot!.activeElement?.closest('.full') !== null)).toBe(true);
    expect(await prop(s, 'expanded')).toBe(true);
  });

  test('SRC-7: live, the docked view is a popover in the top layer, offset below the bar and as wide as it; it flips above when the room below is smaller; it scrolls within the room left and follows the bar', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 400 });
    const many = Array.from({ length: 12 }, (_, n) => suggestion(`s${n}`, `suggestion ${n}`, { leadingIcon: 'history' }));
    await mount(page, [live('s', { value: 'inv' }, many)]);
    const s = host(page, 's');
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
    const [offset, margin] = [await resolveToken(page, T('view-offset')), await resolveToken(page, T('view-viewport-margin'))];
    let b = await bounds(bar(page, 's'));
    let v = await bounds(view(page, 's'));
    expect(v.y - (b.y + b.height)).toBeCloseTo(offset, 0);
    expect([v.x, v.width]).toEqual([b.x, b.width]);
    // Taller than the room: limited to it, scrolling.
    expect(v.y + v.height).toBeLessThanOrEqual(400 - margin + 0.5);
    expect(await s.locator('.view .scroll').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    // The bar moves: the view follows.
    await page.evaluate(() => ((document.querySelector('main') as HTMLElement).style.paddingTop = '40px'));
    await expect.poll(async () => (await bounds(view(page, 's'))).y).toBeCloseTo((await bounds(bar(page, 's'))).y + (await bounds(bar(page, 's'))).height + offset, 0);
    // Near the bottom with more room above: above the bar.
    await page.evaluate(() => ((document.querySelector('main') as HTMLElement).style.paddingTop = '300px'));
    await expect.poll(async () => (await bounds(view(page, 's'))).y + (await bounds(view(page, 's'))).height).toBeCloseTo((await bounds(bar(page, 's'))).y - offset, 0);
    b = await bounds(bar(page, 's'));
    v = await bounds(view(page, 's'));
    expect(v.y).toBeGreaterThanOrEqual(margin - 0.5);
  });

  test('SRC-7: while expanded with no content the view is not drawn and the search stays expanded', async ({ page }) => {
    await mount(page, [live('s', {}, [])]);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => prop(host(page, 's'), 'expanded')).toBe(true);
    expect(await popoverOpen(view(page, 's'))).toBe(false);
    // Suggestions arrive: the view appears.
    await host(page, 's').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-search-suggestion value="a" headline="a"></tanrei-search-suggestion>'));
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
  });

  test('SRC-8: docked, focus stays in the input while the view is open — the arrows, a press on a suggestion or on the view do not take it; nothing is inert and there is no scrim; focus stays where the person put it', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(input(page, 's')).toBeFocused();
    const v = await bounds(view(page, 's'));
    await page.mouse.click(v.x + v.width / 2, v.y + 2); // the view's padding, clear of its rounded corners
    await expect(input(page, 's')).toBeFocused();
    expect(await page.evaluate(() => [...document.querySelectorAll('*')].some((el) => (el as HTMLElement).inert))).toBe(false);
    expect(await css(view(page, 's'), 'background-color', '::backdrop')).toBe('rgba(0, 0, 0, 0)');
    await row(page, 's', 0).click();
    await expect(input(page, 's')).toBeFocused();
    expect(await prop(host(page, 's'), 'expanded')).toBe(false);
  });

  test('SRC-9: the full-screen view is modal over the whole window in the view color; focus goes to the header input with the caret at the end, stays inside, and returns to the bar’s input without reopening', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await mount(page, [live('s', { presentation: 'full-screen', value: 'invoice' })]);
    const s = host(page, 's');
    await wire(s);
    await s.locator('.glyph').click();
    await expect(headerInput(page, 's')).toBeFocused();
    expect(await headerInput(page, 's').evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([7, 7]);
    expect(await dialog(page, 's').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await bounds(dialog(page, 's'))).toEqual({ x: 0, y: 0, width: 390, height: 700 });
    expect(await css(dialog(page, 's'), 'background-color')).toBe(await resolveColor(page, T('view-container-color')));
    // Everything outside is inert: a click there does not reach it.
    await page.evaluate(() => document.querySelector('#before')!.addEventListener('click', () => (window as any).log.push('before:click')));
    await page.mouse.click(5, 5);
    expect(await log(page)).not.toContain('before:click');
    // Typing edits the same value.
    await page.keyboard.type('s');
    expect(await prop(s, 'value')).toBe('invoices');
    await expect(input(page, 's')).toHaveValue('invoices');
    await page.keyboard.press('Escape');
    await expect(input(page, 's')).toBeFocused();
    await page.waitForTimeout(100);
    expect((await log(page)).filter((e) => e.startsWith('toggle'))).toEqual(['toggle:true:null:true', 'toggle:false:escape:false']);
    expect(await dialog(page, 's').evaluate((el) => (el as HTMLDialogElement).open)).toBe(false);
  });

  test('SRC-11: the back button is a medium icon-only text Button showing the icon set’s arrow_back, mirrored in right to left, named by backLabel; empty, it is still drawn and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => f.id === 'full-screen'), { id: 'unnamed', props: { presentation: 'full-screen', label: 'Search', expanded: true } }] });
    const back = host(page, 'full-screen').locator('.back');
    await expect(back).toHaveAttribute('size', null as unknown as string).catch(() => undefined);
    expect(await prop(back, 'size')).toBe('medium');
    expect(await prop(back, 'variant')).toBe('text');
    await expect(back).toHaveText('arrow_back');
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(1);
    expect(await prop(host(page, 'full-screen').locator('.header .clear'), 'size')).toBe('medium');
    expect(await css(back, 'transform', undefined)).toBe('none');
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    // The icon helper mirrors the glyph itself, in its own box (BTN-19): the search and the Button's icon box do not.
    expect(await css(back.locator('[part~="icon"]'), 'transform')).toBe('none');
    expect(await css(back.locator('[slot="icon"]'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    // …and the clear button's close is not.
    expect(await css(host(page, 'full-screen').locator('.header .clear [slot="icon"]'), 'transform')).toBe('none');
    await expect(host(page, 'unnamed').locator('.back')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SRC-11')).length).toBe(1);
  });

  test('SRC-30: while the icon set cannot draw search, close or arrow_back nothing is drawn in their place — never their names — every glyph box keeps its size so the bar does not move, and the clear and back buttons stay operable and named; the glyphs are drawn once the font arrives', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'bar-value' || f.id === 'full-screen') });
    await withoutIconFont(page);
    const glyphs = {
      search: host(page, 'bar-value').locator('.bar .glyph'),
      close: host(page, 'bar-value').locator('.bar .clear .button-glyph'),
      'header close': host(page, 'full-screen').locator('.header .clear .button-glyph'),
      arrow_back: host(page, 'full-screen').locator('.header .back .button-glyph'),
    };
    const sizes = {
      search: await resolveToken(page, T('leading-icon-size')),
      close: await resolveToken(page, '--tanrei-comp-button-icon-size-without-label-small'),
      'header close': await resolveToken(page, '--tanrei-comp-button-icon-size-without-label-medium'),
      arrow_back: await resolveToken(page, '--tanrei-comp-button-icon-size-without-label-medium'),
    };
    for (const [name, glyph] of Object.entries(glyphs)) {
      const size = sizes[name as keyof typeof sizes];
      await expect(glyph, name).not.toHaveAttribute('data-drawn');
      // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
      expect(await glyph.locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth), name).toBeGreaterThan(size * 1.5);
      expect(await css(glyph, 'visibility'), name).toBe('hidden');
      const box = await bounds(glyph);
      expect([box.width, box.height], name).toEqual([size, size]);
    }
    const layout = async () => Promise.all([bar(page, 'bar-value'), input(page, 'bar-value'), host(page, 'bar-value').locator('.bar .clear'), host(page, 'full-screen').locator('.header .input')].map(bounds));
    const before = await layout();
    // The buttons are named, and the clear button still clears.
    for (const name of ['Back', 'Clear search']) await expect(host(page, 'full-screen').getByRole('button', { name }), name).toHaveCount(1);
    await expect(host(page, 'bar-value').getByRole('button', { name: 'Clear search' })).toHaveCount(1);
    await iconFaceArrives(page);
    for (const [name, glyph] of Object.entries(glyphs)) {
      await expect(glyph, name).toHaveAttribute('data-drawn', '');
      expect(await css(glyph, 'visibility'), name).toBe('visible');
    }
    expect(await layout(), 'the bar and the header do not move').toEqual(before);
    // Missing again (another family no machine has): the clear button, drawing nothing, still clears.
    await withoutIconFont(page, 'Tanrei Other Missing Icons');
    await expect(glyphs.close).not.toHaveAttribute('data-drawn');
    await host(page, 'bar-value').locator('.bar .clear').click();
    expect(await prop(host(page, 'bar-value'), 'value')).toBe('');
  });

  test('SRC-13: the action key with no suggestion active emits submit once, then closes the view (toggle follows submit), then submits the form unless submit was cancelled', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv', name: 'q' })]);
    await page.evaluate(() => {
      const search = document.querySelector('tanrei-search')!;
      const form = document.createElement('form');
      search.before(form);
      form.append(search);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as any).log.push(`form:${new FormData(form).get('q')}`);
      });
    });
    const s = host(page, 's');
    await wire(s);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['toggle:true:null:true', 'submit:inv', 'toggle:false:submit:false', 'form:inv']);
    // Collapsed: submit only. Cancelled: no form submission.
    await s.evaluate((el) => el.addEventListener('submit', (e) => e.preventDefault()));
    await page.evaluate(() => ((window as any).log.length = 0));
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['submit:inv']);
  });

  test('SRC-23: the docked view fades and grows in over open-duration and fades out over close-duration; the full-screen view fades; focus moves when it opens, not when the motion ends; at once where motion is reduced', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' }), live('f', { presentation: 'full-screen', value: 'inv' })], { reducedMotion: false });
    // Every motion of the view is read as the engine announces it, from before it opens: the way out is the shortest of
    // the motions and the view is taken away when it ends, so asked for after the key it may be over and gone before a
    // slow runner's answer. And an animation that getAnimations() lists may still be pending — its animationstart comes
    // at the frame it really starts, which on a loaded runner is after any later round trip.
    const started = () => view(page, 's').evaluate((el) => (el as unknown as { started: [string, number][] }).started);
    const ended = () => view(page, 's').evaluate((el) => (el as unknown as { ended: string[] }).ended);
    await view(page, 's').evaluate((el) => {
      const record = el as unknown as { started: [string, number][]; ended: string[] };
      record.started = [];
      record.ended = [];
      el.addEventListener('animationstart', (event) => {
        const animation = el.getAnimations().find((a) => (a as CSSAnimation).animationName === event.animationName);
        record.started.push([event.animationName, Math.round(Number(animation?.effect?.getComputedTiming().duration))]);
      });
      el.addEventListener('animationend', (event) => record.ended.push(event.animationName));
    });
    const [openDuration, closeDuration] = await Promise.all(['motion-open-duration', 'motion-close-duration'].map((n) => resolveToken(page, T(n), 'duration')));
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
    // Durations in whole milliseconds, as the tokens are: Firefox reports a 200 ms token as 200.000015 (a float of seconds).
    const opening = await view(page, 's').evaluate((el) => el.getAnimations().map((a) => [(a as CSSAnimation).animationName, Math.round(Number(a.effect?.getComputedTiming().duration))]));
    expect(opening).toEqual([['view-open', openDuration]]);
    expect(await css(view(page, 's'), 'transform-origin')).toMatch(/ 0px$/); // grows from its top edge, which faces the bar
    // The way in runs to its end and the view stays open; its animationend is dispatched after its animationstart, so
    // nothing of the way in can arrive after this.
    await expect.poll(ended).toEqual(['view-open']);
    expect(await popoverOpen(view(page, 's'))).toBe(true);
    expect(await started()).toEqual([['view-open', openDuration]]);
    // Escape starts the way out, over close-duration, and nothing else.
    await page.keyboard.press('Escape');
    await expect.poll(started).toEqual([['view-open', openDuration], ['view-close', closeDuration]]);
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(false);
    // Full screen: a fade over open-duration; focus is already in the header's input while it runs.
    await host(page, 'f').locator('.glyph').click();
    expect(await css(dialog(page, 'f'), 'transition-duration')).toContain(`${(await resolveToken(page, T('motion-open-duration'), 'duration')) / 1000}s`);
    const early = await host(page, 'f').evaluate((el) => [el.shadowRoot!.activeElement?.closest('.header') !== null, el.shadowRoot!.querySelector('.full')!.getAnimations().length]);
    expect(early[0]).toBe(true);
    await page.keyboard.press('Escape');
    // Reduced motion: no animation at all.
    await mount(page, [live('s', { value: 'inv' })], { reducedMotion: true });
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
    expect(await view(page, 's').evaluate((el) => el.getAnimations().length)).toBe(0);
    await page.keyboard.press('Escape');
    expect(await popoverOpen(view(page, 's'))).toBe(false);
  });
});

test.describe('suggestions', () => {
  test('SRC-14: Down and Up Arrow move the active suggestion with focus in the input — the first, stopping on the last, none above the first; typing, moving the caret or new suggestions leave none; Enter chooses the active one', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    const field = input(page, 's');
    await field.focus();
    const active = () => field.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown'); // opens
    expect(await active()).toBeNull();
    await page.keyboard.press('ArrowDown');
    await expect.poll(active).toBe('option-0');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(active).toBe('option-2');
    await page.keyboard.press('ArrowUp');
    await expect.poll(active).toBe('option-1');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect.poll(active).toBeNull();
    await expect(field).toBeFocused();
    // Typing goes on editing the value and leaves none active.
    await page.keyboard.press('ArrowDown');
    await expect.poll(active).toBe('option-0');
    await page.keyboard.type('o');
    await expect.poll(active).toBeNull();
    expect(await prop(host(page, 's'), 'value')).toBe('invo');
    // Moving the caret.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(active).toBeNull();
    // A change of the suggestions.
    await page.keyboard.press('ArrowDown');
    await host(page, 's').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-search-suggestion value="x" headline="x"></tanrei-search-suggestion>'));
    await expect.poll(active).toBeNull();
    // Enter with an active suggestion chooses it.
    await wire(host(page, 's'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['select:invoice template', 'toggle:false:select:false']);
  });

  test('SRC-14: a suggestion that becomes active while scrolled out of view is scrolled into view', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 300 });
    const many = Array.from({ length: 15 }, (_, n) => suggestion(`s${n}`, `suggestion ${n}`));
    await mount(page, [live('s', { value: 's' }, many)]);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    for (let n = 0; n < 12; n++) await page.keyboard.press('ArrowDown');
    const scroll = host(page, 's').locator('.view .scroll');
    await expect.poll(async () => {
      const [r, box] = [await bounds(row(page, 's', 11)), await bounds(scroll)];
      return r.y >= box.y - 0.5 && r.y + r.height <= box.y + box.height + 0.5;
    }).toBe(true);
    const scrolled = await scroll.evaluate((el) => el.scrollTop);
    expect(scrolled).toBeGreaterThan(0);
    // Following the bar (SRC-7) keeps the list where it is: the view is placed again when the bar moves, measured capped:
    // uncapped, it would put the list back at its top whenever the page moved under a slow run.
    const top = (await bounds(view(page, 's'))).y;
    await page.evaluate(() => {
      document.querySelector('main')!.style.paddingTop = '3px';
    });
    await expect.poll(async () => (await bounds(view(page, 's'))).y).toBeCloseTo(top + 3, 1);
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(scrolled);
  });

  test('SRC-15: a press on a suggestion emits select once with its value, then closes (toggle follows select); the value is left to the product', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    await wire(host(page, 's'));
    await input(page, 's').click();
    await row(page, 's', 2).click();
    expect(await log(page)).toEqual(['toggle:true:null:true', 'select:folder:invoices', 'toggle:false:select:false']);
    expect(await prop(host(page, 's'), 'value')).toBe('inv');
  });

  test('SRC-17: hovered, active and pressed suggestions render from their tokens, pressed over active over hovered; the active one shows the focus ring inside its row at once; the pointer never makes one active', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    await override(page, {
      [S('hovered-suggestion-headline-color')]: 'rgb(0, 0, 200)',
      [S('focused-suggestion-headline-color')]: 'rgb(0, 200, 0)',
      [S('pressed-suggestion-headline-color')]: 'rgb(200, 0, 0)',
    });
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    const r = row(page, 's', 0);
    const headline = r.locator('.headline');
    expect(await css(headline, 'color')).toBe(await resolveColor(page, S('suggestion-headline-color')));
    expect(await css(r, 'background-color')).toBe(await resolveColor(page, S('suggestion-container-color')));
    await r.hover();
    await expect.poll(() => css(headline, 'color')).toBe('rgb(0, 0, 200)');
    expect(await css(r, 'background-color')).toBe(await resolveColor(page, S('hovered-suggestion-container-color')));
    expect(await input(page, 's').getAttribute('aria-activedescendant')).toBeNull();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => css(headline, 'color')).toBe('rgb(0, 200, 0)');
    expect(await css(r, 'background-color')).toBe(await resolveColor(page, S('focused-suggestion-container-color')));
    // The ring: drawn inside the row, never transitioned.
    expect(await css(r, 'outline-style')).toBe('solid');
    expect(await px(r, 'outline-offset')).toBeLessThan(0);
    expect(await css(r, 'transition-property')).not.toContain('outline');
    await page.mouse.down();
    await expect.poll(() => css(headline, 'color')).toBe('rgb(200, 0, 0)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('SRC-19: a press on the bar and on a suggestion (pointer or Enter) shows its pressed state at once and keeps it for at least press-hold', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    const b = bar(page, 's');
    const g = await bounds(host(page, 's').locator('.glyph'));
    await page.mouse.move(g.x + 2, g.y + 2);
    const timing = await b.evaluate(async (el, h) => {
      const seen: number[] = [];
      const start = performance.now();
      const observer = new MutationObserver(() => seen.push(performance.now() - start));
      observer.observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, button: 0, pointerType: 'mouse', clientX: 1, clientY: 1 }));
      const at = (el as HTMLElement).dataset.pressed;
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerType: 'mouse' }));
      await new Promise((resolve) => setTimeout(resolve, h + 200));
      observer.disconnect();
      return { at, released: seen.at(-1)! };
    }, hold);
    expect(timing.at).toBe('overlay');
    expect(timing.released).toBeGreaterThanOrEqual(hold - 5);
    // A suggestion by Enter: pressed at once.
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const pressed = await host(page, 's').evaluate((el) => {
      const input = el.shadowRoot!.querySelector('.bar .input')!;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      return (el.shadowRoot!.querySelector('#option-0') as HTMLElement).dataset.pressed;
    });
    expect(pressed).toBe('overlay');
  });
});

test.describe('states', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss(); // built once per worker, before the tests that mount it
  });
  test('SRC-18: hovered and focused render the bar from their tokens; focus by pointer or keyboard selects focused — the outline thicker in the focus-ring color, the container at rest — and never a ring', async ({ page }) => {
    await mount(page, [live('s'), live('t')]);
    const b = bar(page, 's');
    const outline = host(page, 's').locator('.outline');
    expect(await px(outline, 'border-top-width')).toBe(await resolveToken(page, T('outline-width')));
    expect(await css(outline, 'border-top-color')).toBe(await resolveColor(page, S('outline-color')));
    await b.hover();
    await expect.poll(() => css(b, 'background-color')).toBe(await resolveColor(page, S('hovered-container-color')));
    // Pointer focus (a press opens the view as well).
    await input(page, 's').click();
    await page.mouse.move(0, 0);
    await expect.poll(() => css(outline, 'border-top-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(outline, 'border-top-width')).toBe(await resolveToken(page, T('focused-outline-width')));
    expect(await px(outline, 'border-top-width')).toBeGreaterThan(await resolveToken(page, T('outline-width')));
    expect(await css(b, 'background-color')).toBe(await resolveColor(page, S('container-color')));
    for (const target of [b, input(page, 's')]) expect(await css(target, 'outline-style')).toBe('none');
    expect(await css(b, 'content', '::after')).toBe('none');
    // Keyboard focus: the same.
    await tabTo(page, input(page, 't'));
    await expect.poll(() => css(host(page, 't').locator('.outline'), 'border-top-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await prop(host(page, 't'), 'expanded')).toBe(false);
  });

  test('SRC-18: under acme, where hovered, focused and pressed differ, pressed wins over focused over hovered, and glow draws the glow around the focused bar', async ({ page }) => {
    await mount(page, [live('s')], { system: 'acme', systemCss: await acmeSystemCss() });
    const b = bar(page, 's');
    await override(page, { [S('hovered-input-color')]: 'rgb(0, 0, 200)', [S('focused-input-color')]: 'rgb(0, 200, 0)', [S('pressed-input-color')]: 'rgb(200, 0, 0)' });
    const field = input(page, 's');
    await b.hover();
    await expect.poll(() => css(field, 'color')).toBe('rgb(0, 0, 200)');
    await field.focus();
    await expect.poll(() => css(field, 'color')).toBe('rgb(0, 200, 0)');
    await page.mouse.down();
    await expect.poll(() => css(field, 'color')).toBe('rgb(200, 0, 0)');
    await page.mouse.up();
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    await expect.poll(() => css(b, 'box-shadow', '::after')).toContain(ring);
  });

  test('SRC-18: colors and widths change over state-duration with state-easing, and at once where motion is reduced', async ({ page }) => {
    await mount(page, [live('s')], { reducedMotion: false });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const b = bar(page, 's');
    expect(await css(b, 'transition-duration')).toContain(`${duration / 1000}s`);
    expect(await css(host(page, 's').locator('.outline'), 'transition-property')).toContain('border-width');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(b, 'transition-duration')).toBe('0s');
  });

  test('SRC-20: overlay (default), ripple, dim and none each answer the press on the bar and on a row; an unknown name is the first', async ({ page }) => {
    const press = async (feedback?: string) => {
      await mount(page, [live('s', { value: 'inv' })]);
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [S('pressed-input-color')]: 'rgb(0, 0, 255)' });
      const b = bar(page, 's');
      const g = await bounds(host(page, 's').locator('.glyph'));
      await page.mouse.move(g.x + 2, g.y + 2);
      await expect.poll(() => css(b, 'background-color')).toBe(await resolveColor(page, S('hovered-container-color')));
      // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
      // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
      await motionEnded(host(page, 's'));
      await page.mouse.down();
      const result = {
        pressed: await b.getAttribute('data-pressed'),
        bg: await css(b, 'background-color'),
        input: await css(input(page, 's'), 'color'),
        ripple: await b.locator('.ripple').count(),
        opacity: await css(b, 'opacity'),
      };
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, input: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, S('pressed-container-color')));
    const ripple = await press('ripple');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, input: 'rgb(0, 0, 255)' });
    // Focus arrived with the press: the container stays with the state under it.
    expect([await resolveColor(page, S('focused-container-color')), await resolveColor(page, S('hovered-container-color'))]).toContain(ripple.bg);
    const dim = await press('dim');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, input: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press('none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.input).not.toBe('rgb(0, 0, 255)');
    expect((await press('squish')).pressed).toBe('overlay');
    // A row answers too, with its own container.
    await mount(page, [live('s', { value: 'inv' })]);
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    await input(page, 's').click();
    await row(page, 's', 0).hover();
    await page.mouse.down();
    expect(await row(page, 's', 0).getAttribute('data-pressed')).toBe('ripple');
    expect(await row(page, 's', 0).locator('.ripple').count()).toBe(1);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('SRC-21: the bar, the view and the rows ease their corners by the smoothing; the active row’s indicator follows the focus style (ring, or glow under acme)', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const supported = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(2)'));
    if (supported) {
      await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
      expect(await css(view(page, 'docked'), 'corner-shape')).toContain('superellipse');
      expect(await css(row(page, 'docked', 0), 'corner-shape')).toContain('superellipse');
      // The pill keeps round caps whatever the amount.
      expect(['round', 'superellipse(1)']).toContain(await css(bar(page, 'docked'), 'corner-shape'));
    }
    // The ring on the active row by default…
    await mount(page, [live('s', { value: 'inv' })]);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => css(row(page, 's', 0), 'outline-style')).toBe('solid');
    expect(await css(row(page, 's', 0), 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    // …the glow under acme, read from the cascade (and, without style queries, from data-focus-style).
    await mount(page, [live('s', { value: 'inv' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    await expect.poll(() => css(row(page, 's', 0), 'box-shadow', '::after')).toContain(ring);
    expect(await css(row(page, 's', 0), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await row(page, 's', 0).getAttribute('data-focus-style')).toBe('glow');
    expect(await bar(page, 's').getAttribute('data-focus-style')).toBe('glow');
    void browserName;
  });

  test('SRC-22: the bar’s hit area reaches sys.target.pointer vertically without changing its size; a coarse pointer, sys.target.touch', async ({ page, browserName }) => {
    await mount(page, [live('s')]);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const box = await bounds(bar(page, 's'));
    expect(await px(bar(page, 's'), 'height', '::before')).toBe(Math.max(box.height, pointer));
    await page.mouse.click(box.x + box.width / 2, box.y - (pointer - box.height) / 4);
    await expect(input(page, 's')).toBeFocused();
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect(await px(bar(page, 's'), 'height', '::before')).toBe(Math.max(box.height, touch));
    // Rows are as tall as the touch target (SRC-16).
    await mountFixtures(page, spec, { icons: true });
    expect((await bounds(row(page, 'docked', 0))).height).toBeGreaterThanOrEqual(touch - 0.01);
  });

  test('SRC-25: the slots’ icon buttons keep their own tokens and semantics and their own focus stops — the leading one before the input, the trailing ones after the clear button — and the full-screen header draws neither slot (their targets: SRC-34’s test)', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [
        { id: 'slots', props: { label: 'Search mail', value: 'inv', clearLabel: 'Clear search' }, slots: { leading: 'menu', trailing: ['mic', 'account_circle'] } },
        { id: 'full', props: { label: 'Search mail', value: 'inv', clearLabel: 'Clear search', backLabel: 'Back', presentation: 'full-screen', expanded: true }, slots: { leading: 'menu', trailing: ['mic'] } },
      ],
    });
    const lead = host(page, 'slots').locator('tanrei-button[slot="leading"]');
    expect(await css(lead.locator('button'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    await expect(host(page, 'slots').getByRole('button', { name: 'menu' })).toHaveCount(1);
    await tabTo(page, lead.locator('button'));
    const order: (string | null)[] = [];
    for (let n = 0; n < 4; n++) {
      await tab(page);
      order.push(
        await page.evaluate(() => {
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          const owner = (active?.getRootNode() as ShadowRoot | Document) instanceof ShadowRoot ? (active!.getRootNode() as ShadowRoot).host : null;
          return owner?.localName === 'tanrei-button' ? owner.getAttribute('label') : (active?.className ?? null);
        }),
      );
    }
    expect(order[0]).toBe('input');
    expect(order.slice(1)).toEqual(['Clear search', 'mic', 'account_circle']);
    // The header holds only the back button, the input and the clear button.
    const header = host(page, 'full').locator('.header');
    expect(await header.evaluate((el) => el.querySelectorAll('slot').length)).toBe(0);
    expect(await header.locator('tanrei-button').evaluateAll((els) => els.map((el) => el.className))).toEqual(['back', 'clear']);
  });

  test('SRC-26: disabled — not focusable, editable or expandable, no events, no clear button, exposed disabled, drawn from the disabled tokens; the slot buttons keep their own state', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [...spec.fixtures.filter((f) => f.id === 'bar-disabled'), { id: 'off', props: { label: 'Search mail', value: 'inv', disabled: true, clearLabel: 'Clear' }, slots: { trailing: 'mic' } }],
    });
    const s = host(page, 'off');
    await wire(s);
    await expect(input(page, 'off')).toBeDisabled();
    await expect(page.getByRole('searchbox', { name: 'Search mail' }).nth(1)).toBeDisabled();
    await expect(s.locator('.clear')).toHaveCount(0);
    await s.locator('.glyph').click({ force: true });
    await s.evaluate((el) => el.focus());
    expect(await focusedClass(page)).not.toBe('input.input');
    expect(await prop(s, 'expanded')).toBe(false);
    expect(await log(page)).toEqual([]);
    const b = bar(page, 'bar-disabled');
    expect(await css(b, 'background-color')).toBe(await resolveColor(page, S('disabled-container-color')));
    expect(await css(host(page, 'bar-disabled').locator('.glyph'), 'color')).toBe(await resolveColor(page, S('disabled-leading-icon-color')));
    expect(await css(input(page, 'bar-disabled'), 'color', '::placeholder')).toBe(await resolveColor(page, S('disabled-placeholder-color')));
    expect(await css(input(page, 'off'), 'color')).toBe(await resolveColor(page, S('disabled-input-color')));
    expect(await css(host(page, 'bar-disabled').locator('.outline'), 'border-top-color')).toBe(await resolveColor(page, S('disabled-outline-color')));
    expect(await css(b, 'opacity')).toBe(await token(page, T('disabled-opacity')));
    // The slot's icon button keeps its own state: enabled and focusable.
    expect(await prop(s.locator('tanrei-button[slot="trailing"]'), 'disabled')).toBe(false);
    await tabTo(page, s.locator('tanrei-button[slot="trailing"] button'));
  });

  test('SRC-27: an empty label, an unknown presentation, suggestions with an empty or repeated value or an empty headline, and more than two trailing buttons still render and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'unnamed', props: {} },
        { id: 'odd', props: { label: 'Search', presentation: 'sideways', expanded: true }, items: [suggestion('a'), suggestion('a', 'again'), suggestion('', 'no value'), suggestion('b', '')] },
        { id: 'crowded', props: { label: 'Search' }, slots: { trailing: ['mic', 'account_circle', 'more_vert'] } },
      ],
    });
    await expect(bar(page, 'unnamed')).toBeVisible();
    await expect(view(page, 'odd')).toBeVisible(); // drawn as docked: the view in place under the bar
    await expect(host(page, 'odd').locator('.option')).toHaveCount(4);
    await expect(host(page, 'crowded').locator('tanrei-button[slot="trailing"]')).toHaveCount(3);
    await expect.poll(() => seen.filter((w) => w.includes('SRC-27')).length).toBeGreaterThanOrEqual(6);
    const text = seen.join('\n');
    for (const fragment of ['label is empty', 'presentation "sideways"', 'share the value "a"', 'empty value', 'empty headline', 'trailing slot holds 3']) expect(text).toContain(fragment);
  });
});

test.describe('accessibility', () => {
  test('SRC-24: a search field named by label, never by placeholder; docked with suggestions, a combobox that controls the listbox and names the active option; options named by headline and described by supporting text; icons hidden; the full-screen view a modal dialog named by label', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' }), live('f', { presentation: 'full-screen', value: 'inv' })]);
    const field = input(page, 's');
    await expect(page.getByRole('searchbox', { name: 'Search mail' })).toHaveCount(2);
    await expect(field).toHaveAttribute('aria-label', 'Search mail');
    await expect(field).toHaveAttribute('placeholder', 'Search mail');
    await field.focus();
    await page.keyboard.press('ArrowDown');
    const combo = page.getByRole('combobox', { name: 'Search mail' });
    await expect(combo).toHaveCount(1);
    await expect(combo).toHaveAttribute('aria-autocomplete', 'list');
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    await expect(combo).toHaveAttribute('aria-controls', 'listbox');
    const listbox = page.getByRole('listbox', { name: 'Search mail' });
    await expect(listbox).toHaveCount(1);
    await expect(listbox.getByRole('option')).toHaveCount(3);
    const folder = page.getByRole('option', { name: 'Invoices', exact: true });
    await expect(folder).toHaveAccessibleDescription('Folder · 24 messages');
    await page.keyboard.press('ArrowDown');
    await expect(combo).toHaveAttribute('aria-activedescendant', 'option-0');
    await expect(page.getByRole('option', { name: 'invoices', exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(await host(page, 's').locator('.option-icon[aria-hidden="true"]').count()).toBe(3);
    // Closed: a search field again.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox')).toHaveCount(0);
    // Full screen: a modal dialog named by label, with its divider hidden.
    await host(page, 'f').locator('.glyph').click();
    const d = page.getByRole('dialog', { name: 'Search mail' });
    await expect(d).toBeVisible();
    expect(await dialog(page, 'f').evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(host(page, 'f').locator('.divider')).toHaveAttribute('aria-hidden', 'true');
    await expect(d.getByRole('button', { name: 'Back' })).toHaveCount(1);
    await expect(d.getByRole('button', { name: 'Clear search' })).toHaveCount(1);
  });

  test('no axe violations in light and dark, open and closed', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForTimeout(400); // colors transition
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`).join(', ')}`).toEqual([]);
    }
    // The live docked view, open with an active suggestion.
    await mount(page, [live('s', { value: 'inv' })]);
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => popoverOpen(view(page, 's'))).toBe(true);
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('keyboard: Tab visits the leading button, the input, the clear button and the trailing buttons; Down opens, Enter chooses or submits, Escape closes and then clears', async ({ page }) => {
    await mount(page, [live('s', { value: 'inv' })]);
    await wire(host(page, 's'));
    await tabTo(page, input(page, 's'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await input(page, 's').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual([
      'toggle:true:null:true',
      'select:invoices',
      'toggle:false:select:false',
      'submit:inv',
      'toggle:true:null:true',
      'toggle:false:escape:false',
      'input:',
    ]);
  });

  test('forced colors: the bar keeps a visible border and the active row an outline', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced-colors emulation');
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true });
    expect(await px(bar(page, 'bar'), 'border-top-width')).toBeGreaterThan(0);
    expect(await px(view(page, 'docked'), 'border-top-width')).toBeGreaterThan(0);
  });
});

// ── The search as a site search (SRC-35 … SRC-51) ───────────────────────────────────────────────────────────────────

const SITE = spec.fixtures.find((f) => f.id === 'dialog-results')!;
const MAIL = spec.fixtures.find((f) => f.id === 'docked-results')!;
/** A site search as a product has it: a trigger that opens the real dialog view, with the fixture's results. */
const site = (id: string, props: Fixture['props'] = {}, items: FixtureItem[] = SITE.items!): Fixture => ({
  id,
  props: { ...SITE.props, expanded: false, backLabel: 'Back', inline: false, ...props },
  items,
});
/** A docked search with a suggestion, a status row and a titled group of two results, live. */
const mail = (id: string, props: Fixture['props'] = {}, items: FixtureItem[] = MAIL.items!): Fixture => ({
  id,
  props: { ...MAIL.props, expanded: false, inline: false, ...props },
  items,
});
const result = (value: string, headline = value, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'result', props: { value, headline, href: `/${value}`, ...props } });
const trigger = (page: P, id: string) => host(page, id).locator('.trigger');
const hint = (page: P, id: string) => host(page, id).locator('tanrei-keyboard-shortcut.hint');
const link = (page: P, id: string, value: string) => host(page, id).locator(`tanrei-search-result[value="${value}"] .row`);
const heading = (page: P, id: string, value: string) => host(page, id).locator(`tanrei-search-result-group[value="${value}"] .group > .row`);
const statusRow = (page: P, id: string) => host(page, id).locator('.status');
const settled = (locator: Locator) => locator.evaluate((el) => (el as any).updateComplete);
/** Mounts as `mount()` does, with a text field on the page, and keeps links from leaving it: what a click did is in `nav`. */
async function mountSite(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mount(page, fixtures, options);
  await page.evaluate(() => {
    document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<input id="field" type="text" aria-label="A field" />');
    const nav = ((window as any).nav = [] as string[]);
    window.addEventListener('click', (event) => {
      const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;
      if (!anchor) return;
      nav.push(event.defaultPrevented ? 'cancelled' : `followed:${anchor.getAttribute('href')}`);
      event.preventDefault();
    });
    // The middle button's press on a link is the browser's too, and WebKit follows it — into a new context — even
    // when a script dispatched it: on Linux the page then answers nothing more. It is kept here as a click is; what
    // the search heard of it is in `log`, as ever.
    window.addEventListener('auxclick', (event) => {
      if (event.composedPath().some((node) => node instanceof HTMLAnchorElement)) event.preventDefault();
    });
  });
}
const nav = (page: P) => page.evaluate(() => (window as any).nav as string[]);
/** What has focus, through shadow roots: its tag, and the `value` of the item (or the search) whose shadow root it is in. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const root = active?.getRootNode();
    return active ? `${active.localName}${root instanceof ShadowRoot ? `@${root.host.localName.replace('tanrei-search', 'search')}:${(root.host as any).value ?? ''}` : active.id ? `#${active.id}` : ''}` : null;
  });
const toggles = async (page: P) => (await log(page)).filter((entry) => entry.startsWith('toggle'));

test.describe('trigger', () => {
  test('SRC-35: the button trigger is the bar’s container at trigger.container.height — the search glyph at trigger.leading-icon.size, the placeholder (or the label) on one line in trigger.label.typescale, cut at its end, then the hint — and the icon trigger a medium icon-only text Button; neither draws an input, a clear button or a slot', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [height, pad, gap, icon] = await Promise.all(['trigger-container-height', 'trigger-container-padding-inline', 'trigger-container-gap', 'trigger-leading-icon-size'].map((n) => resolveToken(page, T(n))));
    const t = trigger(page, 'trigger');
    const [own, stage] = [await bounds(t), await bounds(page.locator('[data-fixture="trigger"]'))];
    // The verify: 328 wide, centred in a 360 × 72 stage.
    expect([own.width, stage.width, stage.height]).toEqual([328, 360, 72]);
    expect(own.height).toBeCloseTo(height, 1);
    expect(own.y + own.height / 2 - stage.y).toBeCloseTo(36, 1);
    expect(await t.evaluate((el) => el.localName)).toBe('button');
    // Filled, raised and rounded as the bar is.
    expect(await css(t, 'background-color')).toBe(await resolveColor(page, S('container-color')));
    expect(await css(t, 'box-shadow')).toBe(await shadowOf(page, `var(${S('container-elevation')})`));
    expect(await css(t, 'border-top-left-radius')).toBe(await css(bar(page, 'bar'), 'border-top-left-radius'));
    const glyph = await bounds(t.locator('.glyph'));
    const text = t.locator('.trigger-text');
    const [label, keys] = [await bounds(text), await bounds(hint(page, 'trigger'))];
    expect(glyph.width).toBeCloseTo(icon, 1);
    expect(glyph.x - own.x).toBeCloseTo(pad, 1);
    expect(label.x - (glyph.x + glyph.width)).toBeCloseTo(gap, 1);
    expect(keys.x - (label.x + label.width)).toBeCloseTo(gap, 1);
    expect(own.x + own.width - (keys.x + keys.width)).toBeCloseTo(pad, 1);
    for (const box of [glyph, label, keys]) expect(box.y + box.height / 2).toBeCloseTo(own.y + own.height / 2, 0);
    await expect(text).toHaveText('Search');
    expect(await px(text, 'font-size')).toBe(await resolveToken(page, T('trigger-label-typescale-font-size')));
    expect(await css(text, 'color')).toBe(await resolveColor(page, S('placeholder-color')));
    expect(await css(t.locator('.glyph'), 'color')).toBe(await resolveColor(page, S('leading-icon-color')));
    await expect(t.locator('.glyph')).toHaveAttribute('aria-hidden', 'true');
    for (const absent of ['.bar', '.trigger .input', '.clear', 'slot[name="leading"]', 'slot[name="trailing"]']) await expect(host(page, 'trigger').locator(absent)).toHaveCount(0);
    // The input is in the view's header, which is not shown while collapsed — and neither is the value.
    await expect(host(page, 'trigger').locator('.input')).toBeHidden();
    // The icon trigger: one medium icon-only text Button showing search, centred in the same stage, and no drawn hint.
    const button = host(page, 'trigger-icon').locator('tanrei-button.trigger-icon');
    const [b, iconStage] = [await bounds(button), await bounds(page.locator('[data-fixture="trigger-icon"]'))];
    expect(await button.evaluate((el: any) => [el.variant, el.size, el.label])).toEqual(['text', 'medium', 'Search the docs']);
    await expect(button.locator('[slot="icon"]')).toHaveText('search');
    expect([iconStage.width, iconStage.height]).toEqual([360, 72]);
    expect(b.x + b.width / 2 - iconStage.x).toBeCloseTo(180, 0);
    expect(b.y + b.height / 2 - iconStage.y).toBeCloseTo(36, 0);
    expect(b.width).toBe(b.height);
    await expect(hint(page, 'trigger-icon')).toBeHidden();
    await expect(host(page, 'trigger-icon').locator('.input')).toBeHidden();
    // The label stands in for an empty placeholder; a text that does not fit is cut on its one line; the value is not shown.
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'named', props: { label: 'Search the docs', bar: 'button', value: 'token' } },
        { id: 'long', props: { label: 'Search', placeholder: 'Search every page, component, token and decision of the system', bar: 'button', shortcut: ['mod+k'] } },
      ],
    });
    await expect(trigger(page, 'named').locator('.trigger-text')).toHaveText('Search the docs');
    const long = trigger(page, 'long').locator('.trigger-text');
    expect(await long.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect([await css(long, 'text-overflow'), await css(long, 'white-space')]).toEqual(['ellipsis', 'nowrap']);
    expect((await bounds(trigger(page, 'long'))).height).toBeCloseTo(height, 1);
  });

  test('SRC-35: right to left mirrors the trigger’s row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, dir: 'rtl', fixtures: [spec.fixtures.find((f) => f.id === 'trigger')!] });
    const [own, glyph, keys] = [await bounds(trigger(page, 'trigger')), await bounds(trigger(page, 'trigger').locator('.glyph')), await bounds(hint(page, 'trigger'))];
    const pad = await resolveToken(page, T('trigger-container-padding-inline'));
    expect(own.x + own.width - (glyph.x + glyph.width)).toBeCloseTo(pad, 1);
    expect(keys.x - own.x).toBeCloseTo(pad, 1);
  });

  test('SRC-5, SRC-36: a trigger is a button — a press, Enter or Space opens the modal view with one toggle and focus in its header’s input; it says that it opens a dialog and whether that is open; docked with a trigger opens as the dialog, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountSite(page, [site('s'), site('k'), site('d', { presentation: 'docked' }), site('i', { bar: 'icon' }), site('f', { presentation: 'full-screen', bar: 'icon' })]);
    const t = page.getByRole('button', { name: 'Search the docs' }).first();
    await expect(trigger(page, 's')).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger(page, 's')).toHaveAttribute('aria-expanded', 'false');
    await expect(t).toHaveCount(1);
    await wire(host(page, 's'));
    await trigger(page, 's').click();
    await expect(headerInput(page, 's')).toBeFocused();
    await expect(trigger(page, 's')).toHaveAttribute('aria-expanded', 'true');
    expect(await dialog(page, 's').evaluate((el) => el.matches(':modal'))).toBe(true);
    expect(await log(page)).toEqual(['toggle:true:null:true']);
    await page.keyboard.press('Escape');
    // SRC-9: focus returns to the trigger, which does not open it again.
    await expect(trigger(page, 's')).toBeFocused();
    expect(await toggles(page)).toEqual(['toggle:true:null:true', 'toggle:false:escape:false']);
    // Enter and Space, as any button.
    for (const key of ['Enter', 'Space']) {
      await wire(host(page, 'k'));
      await trigger(page, 'k').focus();
      await page.keyboard.press(key);
      await expect(headerInput(page, 'k')).toBeFocused();
      expect(await log(page), key).toEqual(['toggle:true:null:true']);
      await page.keyboard.press('Escape');
      await expect(trigger(page, 'k')).toBeFocused();
    }
    // Docked with a trigger has no input of its own: it opens as the dialog view, and a debug build says so.
    await trigger(page, 'd').click();
    await expect(headerInput(page, 'd')).toBeFocused();
    expect(await dialog(page, 'd').evaluate((el) => [el.matches(':modal'), el.classList.contains('hung')])).toEqual([true, true]);
    await expect.poll(() => seen.filter((w) => w.includes('SRC-36')).join('\n')).toContain('presentation "docked" with a trigger');
    await page.keyboard.press('Escape');
    // The icon trigger carries the same semantics on its native button, and opens the same view; full-screen stays full-screen.
    const native = host(page, 'i').locator('tanrei-button.trigger-icon button');
    await expect(native).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(native).toHaveAttribute('aria-expanded', 'false');
    await expect(native).toHaveAttribute('aria-label', 'Search the docs');
    await native.click();
    await expect(headerInput(page, 'i')).toBeFocused();
    await expect(native).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(native).toBeFocused();
    await host(page, 'f').locator('tanrei-button.trigger-icon button').click();
    await expect(headerInput(page, 'f')).toBeFocused();
    expect(await dialog(page, 'f').evaluate((el) => el.classList.contains('hung'))).toBe(false);
    await expect(host(page, 'f').locator('.header .back')).toHaveCount(1);
    await page.keyboard.press('Escape');
  });

  test('SRC-36: hovered, keyboard-focused and pressed render the trigger from the bar’s tokens of that state — focus by its focused outline, never for focus by pointer — its press is held as the bar’s, its hit area meets the target on both axes, and disabled it cannot be focused or pressed', async ({ page, browserName }) => {
    await mountSite(page, [site('s'), site('off', { disabled: true })]);
    await override(page, { [S('hovered-container-color')]: 'rgb(1, 2, 3)', [S('pressed-container-color')]: 'rgb(9, 8, 7)' });
    const t = trigger(page, 's');
    const outline = t.locator('.outline');
    const resting = await px(outline, 'border-top-width');
    // Focus by pointer does not select the focused state, as for a Button.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await t.hover();
    await expect.poll(() => css(t, 'background-color')).toBe('rgb(1, 2, 3)');
    await page.mouse.down();
    expect(await t.getAttribute('data-pressed')).toBe('overlay');
    await expect.poll(() => css(t, 'background-color')).toBe('rgb(9, 8, 7)');
    expect(await px(outline, 'border-top-width')).toBe(await resolveToken(page, T('pressed-outline-width')));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.keyboard.press('Escape');
    // Keyboard focus: the focused outline — thicker, in the focus-ring color — and no ring around the trigger.
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await tabTo(page, t);
    await expect.poll(() => px(outline, 'border-top-width')).toBe(await resolveToken(page, T('focused-outline-width')));
    expect(await px(outline, 'border-top-width')).toBeGreaterThan(resting);
    expect(await css(outline, 'border-top-color')).toBe(await resolveColor(page, S('focused-outline-color')));
    expect(await css(t, 'outline-style')).toBe('none');
    // SRC-19: a key press is shown at once and held for press-hold.
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    const timing = await t.evaluate(async (el, h) => {
      const start = performance.now();
      let released = 0;
      const observer = new MutationObserver(() => (released = performance.now() - start));
      observer.observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      const at = (el as HTMLElement).dataset.pressed;
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, h + 200));
      observer.disconnect();
      return { at, released };
    }, hold);
    expect(timing.at).toBe('overlay');
    expect(timing.released).toBeGreaterThanOrEqual(hold - 5);
    // SRC-22: the hit area reaches the pointer target on both axes without changing the trigger's size.
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect(await px(t, 'height', '::before')).toBeGreaterThanOrEqual(Math.max(target, (await bounds(t)).height) - 0.5);
    expect(await px(t, 'width', '::before')).toBeGreaterThanOrEqual((await bounds(t)).width - 0.5);
    // Disabled: exposed, not focusable, not pressable, drawn from the disabled tokens.
    const off = trigger(page, 'off');
    await wire(host(page, 'off'));
    await expect(off).toBeDisabled();
    expect(await css(off, 'opacity')).toBe(String(Number(await token(page, T('disabled-opacity')))));
    await off.click({ force: true });
    await off.evaluate((el: HTMLElement) => el.focus());
    expect(await off.evaluate((el) => el === (el.getRootNode() as ShadowRoot).activeElement)).toBe(false);
    expect(await log(page)).toEqual([]);
    expect(await hint(page, 'off').evaluate((el: any) => el.disabled)).toBe(true);
    void browserName;
  });
});

test.describe('shortcut', () => {
  test('SRC-37: the hint is the keyboard shortcut component, hosted — its plain form, a line of text with no cap, fill or edge, small, the ambient convention, in shortcut.typescale and shortcut.color — at the end of a button trigger, and in the bar after the input only while the value is empty and the input has no focus; never on an icon trigger or in a header; it is exposed as aria-keyshortcuts and takes no press of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const h = hint(page, 'trigger');
    expect(await h.evaluate((el: any) => [el.variant, el.size, el.convention, el.hosted, el.keys, el.getAttribute('aria-hidden')])).toEqual(['plain', 'small', 'auto', true, ['mod+k'], 'true']);
    // The verify: with the apple convention the trigger ends with the text ⌘K, and bar-shortcut with the text /.
    const written = (l: Locator) => l.evaluate((el) => el.shadowRoot!.querySelector('.sequence')!.textContent!.replace(/\s+/g, ''));
    expect(await written(h)).toBe('⌘K');
    expect(await written(hint(page, 'bar-shortcut'))).toBe('/');
    const legend = h.locator('.label').first();
    expect(await px(legend, 'font-size')).toBe(await resolveToken(page, T('shortcut-typescale-font-size')));
    expect(await css(legend, 'color')).toBe(await resolveColor(page, T('shortcut-color')));
    // No cap is drawn around a key: no fill, no edge, no shadow, no room of a cap's own (KBS-7) — on the trigger and on the bar.
    for (const id of ['trigger', 'bar-shortcut']) {
      for (const key of await hint(page, id).locator('[part="container"]').all()) {
        expect(await css(key, 'background-color'), id).toBe('rgba(0, 0, 0, 0)');
        expect([await px(key, 'border-top-width'), await px(key, 'border-bottom-width'), await px(key, 'padding-left'), await px(key, 'padding-right')], id).toEqual([0, 0, 0, 0]);
        expect(await css(key, 'box-shadow'), id).toBe('none');
      }
      expect(await css(hint(page, id).locator('.label').first(), 'color'), id).toBe(await resolveColor(page, T('shortcut-color')));
    }
    await expect(trigger(page, 'trigger')).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    await expect(input(page, 'bar-shortcut')).toHaveAttribute('aria-keyshortcuts', '/');
    await expect(host(page, 'trigger-icon').locator('tanrei-button.trigger-icon button')).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    await expect(hint(page, 'trigger-icon')).toBeHidden();
    // No hint in a view's header (the dialog fixture is opened from a trigger with a shortcut).
    await expect(host(page, 'dialog-results').locator('.header tanrei-keyboard-shortcut')).toHaveCount(0);
    await expect(headerInput(page, 'dialog-results')).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    // In the bar: after the input, container.gap from it, padding-inline from the end.
    const [b, field, keys] = [await bounds(bar(page, 'bar-shortcut')), await bounds(input(page, 'bar-shortcut')), await bounds(hint(page, 'bar-shortcut'))];
    expect(keys.x - (field.x + field.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 1);
    expect(b.x + b.width - (keys.x + keys.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 1);
    expect(b.height).toBeCloseTo(await resolveToken(page, T('container-height')), 1);
    // A press on the hint is a press on the bar: it focuses the input, and the hint goes while the input has focus.
    expect(await css(hint(page, 'bar-shortcut'), 'pointer-events')).toBe('none');
    await hint(page, 'bar-shortcut').scrollIntoViewIfNeeded();
    const at = await bounds(hint(page, 'bar-shortcut'));
    await page.mouse.click(at.x + at.width / 2, at.y + at.height / 2);
    await expect(input(page, 'bar-shortcut')).toBeFocused();
    await expect(hint(page, 'bar-shortcut')).toBeHidden();
    await page.keyboard.press('Escape');
    await input(page, 'bar-shortcut').evaluate((el: HTMLElement) => el.blur());
    await expect(hint(page, 'bar-shortcut')).toBeVisible();
    // …and while there is a value.
    await host(page, 'bar-shortcut').evaluate((el: any) => (el.value = 'inv'));
    await expect(hint(page, 'bar-shortcut')).toBeHidden();
    await expect(input(page, 'bar-shortcut')).toHaveAttribute('aria-keyshortcuts', '/');
    // A press on a trigger's hint is a press on the trigger. The convention is the ambient one: standard writes Ctrl + K.
    await mountSite(page, [site('s')]);
    await host(page, 's').evaluate((el) => el.setAttribute('data-tanrei-keyboard-convention', 'standard'));
    await expect(trigger(page, 's')).toHaveAttribute('aria-keyshortcuts', 'Control+K');
    expect(await written(hint(page, 's'))).toBe('Ctrl+K');
    const cap = await bounds(hint(page, 's'));
    await page.mouse.click(cap.x + cap.width / 2, cap.y + cap.height / 2);
    await expect(headerInput(page, 's')).toBeFocused();
  });

  test('SRC-38: with bindShortcut the chord opens and closes the search from anywhere in the window, a text field included, and does nothing else; a key without a modifier types in a text field and in the search’s own input; a cancelled press, a repeating key and a composition are left alone; removed or disabled, it stops listening', async ({ page }) => {
    await mountSite(page, [site('s', { bindShortcut: true }), live('f', { shortcut: ['/'], bindShortcut: true, value: '' }, [])]);
    const s = host(page, 's');
    await wire(s);
    await page.evaluate(() => {
      (window as any).reached = [] as string[];
      window.addEventListener('keydown', (event) => (window as any).reached.push(`${event.key}:${event.defaultPrevented}`));
    });
    // From the page body.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Meta+k');
    await expect(headerInput(page, 's')).toBeFocused();
    // The press does nothing else: it is cancelled for whoever comes after.
    expect(await page.evaluate(() => (window as any).reached.at(-1))).toBe('k:true');
    // Open, the same chord closes it with the reason shortcut — from its own input, a text element, since the chord has mod.
    await page.keyboard.press('Meta+k');
    await expect(trigger(page, 's')).toBeFocused();
    expect(await toggles(page)).toEqual(['toggle:true:null:true', 'toggle:false:shortcut:false']);
    // From a text field on the page.
    await page.locator('#field').focus();
    await page.keyboard.press('Meta+k');
    await expect(headerInput(page, 's')).toBeFocused();
    await page.keyboard.press('Escape');
    // Another chord, or the key without its modifier, is not the shortcut.
    await wire(s);
    await page.keyboard.press('k');
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Meta+Shift+k');
    // A press something else has taken; a key repeating while held; an input-method composition.
    await page.evaluate(() => {
      const taken = (event: KeyboardEvent) => event.preventDefault();
      document.addEventListener('keydown', taken);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }));
      document.removeEventListener('keydown', taken);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, repeat: true, bubbles: true, cancelable: true }));
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, isComposing: true, bubbles: true, cancelable: true }));
    });
    expect(await log(page)).toEqual([]);
    // A chord without a modifier: / opens the field's search from the body — focusing its input — and types in a text field and in the search's own input.
    const f = host(page, 'f');
    await wire(f);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('/');
    await expect(input(page, 'f')).toBeFocused();
    expect(await log(page)).toEqual(['toggle:true:null:true']);
    expect(await prop(f, 'value')).toBe('');
    await page.keyboard.press('/');
    expect(await prop(f, 'value')).toBe('/');
    expect(await prop(f, 'expanded')).toBe(true);
    await page.locator('#field').focus();
    await page.keyboard.press('/');
    await expect(page.locator('#field')).toHaveValue('/');
    // Disabled, bindShortcut off, removed: it listens no more.
    await wire(s);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await s.evaluate((el: any) => (el.disabled = true));
    await page.keyboard.press('Meta+k');
    await s.evaluate((el: any) => ((el.disabled = false), (el.bindShortcut = false)));
    await settled(s);
    await page.keyboard.press('Meta+k');
    await s.evaluate((el: any) => (el.bindShortcut = true));
    await settled(s);
    await s.evaluate((el: any) => {
      (window as any).removed = el;
      el.remove();
    });
    await page.keyboard.press('Meta+k');
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).removed.expanded)).toBe(false);
    // Back in the page, it listens again.
    await page.evaluate(() => document.querySelector('[data-fixture="s"]')!.append((window as any).removed));
    await page.keyboard.press('Meta+k');
    await expect(headerInput(page, 's')).toBeFocused();
  });

  test('SRC-39: without bindShortcut the search listens for no key outside itself; with it, an empty shortcut, a sequence, or a chord another shown search already binds binds nothing and is reported — the search shown first keeps the chord', async ({ page }) => {
    const seen = warnings(page);
    await mountSite(page, [site('plain'), site('first', { bindShortcut: true }), site('second', { bindShortcut: true }), site('none', { shortcut: [], bindShortcut: true }), site('two', { shortcut: ['mod+k', 'mod+c'], bindShortcut: true })]);
    await wire(host(page, 'plain'));
    for (const id of ['first', 'second', 'none', 'two']) await host(page, id).evaluate((el) => el.addEventListener('toggle', () => (window as any).log.push(`open:${(el.parentElement as HTMLElement).dataset.fixture}`)));
    // Without bindShortcut a search adds no listener to the window; with it, one — and none is left when it is removed.
    const listeners = await page.evaluate(async () => {
      let added = 0;
      let removed = 0;
      const [add, remove] = [window.addEventListener, window.removeEventListener];
      window.addEventListener = function (this: Window, type: string, ...rest: any[]) {
        if (type === 'keydown') added += 1;
        return (add as any).call(window, type, ...rest);
      } as typeof window.addEventListener;
      window.removeEventListener = function (this: Window, type: string, ...rest: any[]) {
        if (type === 'keydown') removed += 1;
        return (remove as any).call(window, type, ...rest);
      } as typeof window.removeEventListener;
      const element = Object.assign(document.createElement('tanrei-search'), { label: 'Another', bar: 'button', shortcut: ['mod+j'] }) as any;
      document.querySelector('main')!.append(element);
      await element.updateComplete;
      const without = added;
      element.bindShortcut = true;
      await element.updateComplete;
      const bound = added;
      element.remove();
      [window.addEventListener, window.removeEventListener] = [add, remove];
      return { without, bound, removed };
    });
    expect(listeners).toEqual({ without: 0, bound: 1, removed: 1 });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Meta+k');
    await expect(headerInput(page, 'first')).toBeFocused();
    expect(await log(page)).toEqual(['open:first']);
    await page.keyboard.press('Meta+k');
    const text = () => seen.filter((w) => w.includes('SRC-39')).join('\n');
    await expect.poll(text).toContain('another search shown before this one binds the chord "mod+k"');
    expect(text()).toContain('shortcut is empty');
    expect(text()).toContain('holds 2 chords');
    // The hint and the exposed shortcut still say what the product has bound.
    await expect(trigger(page, 'plain')).toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    // When the first is removed, the chord is free and the next shown search takes it.
    await host(page, 'first').evaluate((el) => el.remove());
    await page.keyboard.press('Meta+k');
    await expect(headerInput(page, 'second')).toBeFocused();
  });
});

test.describe('dialog view', () => {
  test('SRC-40: the dialog fixtures draw the view in a 720 × 480 stage — a scrim over it, the container 640 wide, 64 below the top, on the view’s color, elevation and corners; a header with the back button of the full-screen header, the input and the medium clear button and no search glyph; a divider, then the content', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [maxWidth, offset, headerHeight, pad, headerPad, gap] = await Promise.all(
      ['view-dialog-max-width', 'view-dialog-offset', 'header-height', 'container-padding-inline', 'header-padding-inline', 'container-gap'].map((n) => resolveToken(page, T(n))),
    );
    for (const id of ['dialog-results', 'dialog-results-rtl', 'dialog-loading', 'dialog-none', 'dialog-error']) {
      const [stage, box] = [await bounds(page.locator(`[data-fixture="${id}"]`)), await bounds(dialog(page, id))];
      // The verify: the container 640 wide, its top 64 below the stage's top.
      expect([stage.width, stage.height, box.width, box.y - stage.y], id).toEqual([720, 480, 640, 64]);
      expect([box.width, box.y - stage.y], id).toEqual([maxWidth, offset]);
      expect(box.x - stage.x, id).toBe((720 - 640) / 2);
      expect(await bounds(host(page, id).locator('.scrim')), id).toEqual(stage);
      expect(await css(host(page, id).locator('.scrim'), 'background-color'), id).toBe(await resolveColor(page, T('view-scrim-color')));
      // What opened it is not drawn in the stage that stands for the window.
      await expect(trigger(page, id)).toBeHidden();
    }
    const d = dialog(page, 'dialog-results');
    expect(await css(d, 'background-color')).toBe(await resolveColor(page, T('view-container-color')));
    expect(await css(d, 'box-shadow')).toBe(await shadowOf(page, `var(${T('view-container-elevation')})`));
    expect(await px(d, 'border-top-left-radius')).toBeGreaterThan(0);
    expect(await css(d, 'overflow')).toBe('hidden');
    const header = host(page, 'dialog-results').locator('.header');
    const [h, back, field, clear] = [await bounds(header), await bounds(header.locator('.back')), await bounds(headerInput(page, 'dialog-results')), await bounds(header.locator('.clear'))];
    expect(h.height).toBeCloseTo(headerHeight, 1);
    // The back button SRC-11 describes — a medium icon-only text Button showing arrow_back, named by backLabel — header.padding-inline from the start.
    expect(back.x - h.x).toBeCloseTo(headerPad, 1);
    expect(field.x - (back.x + back.width)).toBeCloseTo(gap, 1);
    expect(await header.locator('.back').evaluate((el: any) => [el.variant, el.size, el.label, el.textContent.trim()])).toEqual(['text', 'medium', 'Back', 'arrow_back']);
    await expect(header.locator('.back button')).toHaveAccessibleName('Back');
    await expect(header.locator('.glyph')).toHaveCount(0);
    expect(clear.x - (field.x + field.width)).toBeCloseTo(gap, 1);
    expect(h.x + h.width - (clear.x + clear.width)).toBeCloseTo(headerPad, 1);
    expect(await header.locator('.clear').evaluate((el: any) => el.size)).toBe('medium');
    await expect(headerInput(page, 'dialog-results')).toHaveValue('token');
    // Right to left mirrors the header, and the icon helper mirrors the arrow (SRC-32).
    const [rh, rback] = [await bounds(host(page, 'dialog-results-rtl').locator('.header')), await bounds(host(page, 'dialog-results-rtl').locator('.header .back'))];
    expect(rh.x + rh.width - (rback.x + rback.width)).toBeCloseTo(headerPad, 1);
    expect(await css(host(page, 'dialog-results-rtl').locator('.header .back [slot="icon"]'), 'transform')).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    expect(await css(header.locator('.back [slot="icon"]'), 'transform')).toBe('none');
    // The divider across the container under the header, then the content, inset by the view's paddings.
    const divider = await bounds(host(page, 'dialog-results').locator('.divider'));
    expect([divider.x, divider.width, divider.y]).toEqual([h.x, h.width, h.y + h.height]);
    expect(divider.height).toBeCloseTo(await resolveToken(page, T('divider-thickness')), 1);
    const scroll = host(page, 'dialog-results').locator('.full .scroll');
    expect(await px(scroll, 'padding-top')).toBe(await resolveToken(page, T('view-padding-block')));
    expect(await px(scroll, 'padding-left')).toBe(await resolveToken(page, T('view-padding-inline')));
    // As tall as its content: the header alone, without a divider, when nothing is under it; the input last ends padding-inline from the edge.
    await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 'bare', props: { label: 'Search the docs', bar: 'button', presentation: 'dialog', expanded: true } }] });
    expect((await bounds(dialog(page, 'bare'))).height).toBeCloseTo(headerHeight, 1);
    await expect(host(page, 'bare').locator('.divider')).toHaveCount(0);
    const [bh, bf] = [await bounds(host(page, 'bare').locator('.header')), await bounds(headerInput(page, 'bare'))];
    expect(bh.x + bh.width - (bf.x + bf.width)).toBeCloseTo(pad, 1);
  });

  test('SRC-40: live, the dialog view is a modal dialog over a scrim — focus in its input with the caret at the end, everything outside inert, focus back to the trigger; as wide as the window allows up to its maximum, its offset given up in a short window, its height capped and scrolling, and its top where it was while its content changes', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await mountSite(page, [site('s')]);
    const s = host(page, 's');
    const d = dialog(page, 's');
    const [maxWidth, offset, margin] = await Promise.all(['view-dialog-max-width', 'view-dialog-offset', 'view-viewport-margin'].map((n) => resolveToken(page, T(n))));
    await wire(s);
    await trigger(page, 's').click();
    await expect(headerInput(page, 's')).toBeFocused();
    expect(await headerInput(page, 's').evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([5, 5]);
    expect(await d.evaluate((el) => el.matches(':modal'))).toBe(true);
    const box = await bounds(d);
    expect([box.width, box.y, box.x]).toEqual([maxWidth, offset, (1000 - maxWidth) / 2]);
    expect(await d.evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toBe(await resolveColor(page, T('view-scrim-color')));
    // Everything outside is inert: Tab stays inside, and a control outside takes no focus.
    expect(await page.evaluate(() => ((document.querySelector('#before') as HTMLElement).focus(), document.activeElement?.id))).not.toBe('before');
    // Typing edits the one value.
    await page.keyboard.type('s');
    expect(await prop(s, 'value')).toBe('tokens');
    // Its top stays where it is while its content changes; its height follows the content at once.
    await s.evaluate((el) => el.querySelectorAll('tanrei-search-result-group, tanrei-search-result').forEach((child) => child.remove()));
    await expect.poll(async () => (await bounds(d)).height).toBeLessThan(box.height);
    expect((await bounds(d)).y).toBe(box.y);
    await s.evaluate((el) => {
      for (let n = 0; n < 40; n++) el.insertAdjacentHTML('beforeend', `<tanrei-search-result value="r${n}" headline="Result ${n}" href="/r${n}">An excerpt with a <mark>match</mark>.</tanrei-search-result>`);
    });
    // Taller than the room: it keeps view.viewport-margin from the bottom and scrolls its content under the header.
    await expect.poll(async () => (await bounds(d)).height).toBeCloseTo(700 - offset - margin, 0);
    expect((await bounds(d)).y).toBe(box.y);
    expect(await s.locator('.full .scroll').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect((await bounds(s.locator('.header'))).y).toBe(box.y);
    // A window too short for the offset and one row gives the offset up, down to the margin; a narrow one keeps the margin at each side.
    const oneRow = (await resolveToken(page, T('header-height'))) + (await resolveToken(page, T('divider-thickness'))) + 2 * (await resolveToken(page, T('view-padding-block'))) + (await resolveToken(page, T('suggestion-container-height-regular')));
    const between = Math.round(oneRow + margin + (offset + margin) / 2);
    await page.setViewportSize({ width: 400, height: between });
    await expect.poll(async () => (await bounds(d)).y).toBeCloseTo(between - margin - oneRow, 0);
    expect((await bounds(d)).y).toBeLessThan(offset);
    await page.setViewportSize({ width: 400, height: Math.round(oneRow) });
    await expect.poll(async () => (await bounds(d)).y).toBe(margin);
    expect((await bounds(d)).width).toBe(400 - 2 * margin);
    expect((await bounds(d)).height).toBeLessThanOrEqual(oneRow - 2 * margin);
    await page.setViewportSize({ width: 1000, height: 700 });
    // A press on the scrim closes it with the reason outside; focus returns to the trigger.
    await wire(s);
    await page.mouse.click(20, 20);
    await expect(trigger(page, 's')).toBeFocused();
    expect(await log(page)).toEqual(['toggle:false:outside:false']);
    await expect.poll(() => d.evaluate((el: HTMLDialogElement) => el.open)).toBe(false);
    // A press that begins in the container and ends on the scrim (a selection dragged out) does not.
    await trigger(page, 's').click();
    const inside = await bounds(headerInput(page, 's'));
    await page.mouse.move(inside.x + 10, inside.y + inside.height / 2);
    await page.mouse.down();
    await page.mouse.move(20, 20);
    await page.mouse.up();
    expect(await prop(s, 'expanded')).toBe(true);
    await page.keyboard.press('Escape');
  });

  test('SRC-41: the dialog view’s scrim and container fade in over open-duration with open-easing and out over close-duration; its height follows its content without a motion; at once where motion is reduced', async ({ page }) => {
    await mountSite(page, [site('s')], { reducedMotion: false });
    const d = dialog(page, 's');
    const [open, close] = await Promise.all(['motion-open-duration', 'motion-close-duration'].map((n) => resolveToken(page, T(n), 'duration')));
    const seconds = (value: string) => value.split(',').map((part) => Math.round(Number.parseFloat(part) * 1000));
    // Closed: both wait to fade out over the close motion.
    expect(seconds(await css(d, 'transition-duration'))[0]).toBe(close);
    expect(seconds(await d.evaluate((el) => getComputedStyle(el, '::backdrop').transitionDuration))[0]).toBe(close);
    await trigger(page, 's').click();
    // Focus is already in the header's input while it fades (SRC-23).
    await expect(headerInput(page, 's')).toBeFocused();
    expect(seconds(await css(d, 'transition-duration'))[0]).toBe(open);
    expect(await css(d, 'transition-property')).toContain('opacity');
    expect(await css(d, 'transition-property')).not.toMatch(/height|block-size|all/);
    const backdrop = await d.evaluate((el) => {
      const style = getComputedStyle(el, '::backdrop');
      return [style.transitionProperty, style.transitionDuration, style.opacity];
    });
    expect(backdrop[0]).toContain('opacity');
    expect(seconds(backdrop[1])[0]).toBe(open);
    await expect.poll(() => css(d, 'opacity')).toBe('1');
    await page.keyboard.press('Escape');
    await mountSite(page, [site('s')], { reducedMotion: true });
    await trigger(page, 's').click();
    expect(await css(dialog(page, 's'), 'transition-property')).toBe('none');
    expect(await dialog(page, 's').evaluate((el) => getComputedStyle(el, '::backdrop').transitionProperty)).toBe('none');
    expect(await css(dialog(page, 's'), 'opacity')).toBe('1');
  });
});

test.describe('results', () => {
  test('SRC-42: a result’s row is a suggestion’s row, from the same tokens — its height and target, paddings, gap, the icon column kept in every row of the view, the headline and the excerpt in the suggestion’s two text styles, wrapping — and hovered, focused and pressed it renders from the suggestion tokens of that state, the focus ring inside the row', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const option = row(page, 'docked-results', 0);
    const r = link(page, 'docked-results', 'm-1');
    for (const property of ['padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'column-gap', 'min-height', 'border-top-left-radius', 'background-color', 'display', 'align-items']) {
      expect(await css(r, property), property).toBe(await css(option, property));
    }
    for (const [mine, theirs] of [['.icon', '.option-icon'], ['.headline', '.headline']] as const) {
      for (const property of ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing', 'color', 'width']) {
        if (property === 'width' && mine !== '.icon') continue;
        expect(await css(r.locator(mine), property), `${mine} ${property}`).toBe(await css(option.locator(theirs), property));
      }
    }
    expect(await px(r.locator('.excerpt'), 'font-size')).toBe(await resolveToken(page, T('suggestion-supporting-text-typescale-font-size')));
    expect(await css(r.locator('.excerpt'), 'color')).toBe(await resolveColor(page, S('suggestion-supporting-text-color')));
    // The rows of one list align: the suggestion's headline and the results' start at the same edge.
    const [a, b] = [await bounds(option.locator('.headline')), await bounds(r.locator('.headline'))];
    expect(b.x).toBe(a.x);
    // The whole row is the hit area, as wide as the view's content.
    expect((await bounds(r)).width).toBe((await bounds(option)).width);
    // The column is kept in a row without an icon while another row has one, and dropped when none has.
    await mountSite(page, [mail('some', { expanded: true }, [suggestion('a'), result('one', 'One', { leadingIcon: 'mail' }), result('two', 'Two')]), mail('none', { expanded: true }, [suggestion('a'), result('one', 'One')])]);
    await expect(row(page, 'some', 0).locator('.option-icon')).toHaveCount(1);
    await expect(link(page, 'some', 'two').locator('.icon.empty')).toHaveCount(1);
    expect((await bounds(link(page, 'some', 'two').locator('.headline'))).x).toBe((await bounds(link(page, 'some', 'one').locator('.headline'))).x);
    await expect(host(page, 'none').locator('.option-icon, tanrei-search-result .row .icon')).toHaveCount(0);
    // Wrapping grows the row rather than cutting it.
    await host(page, 'some').evaluate((el) => (el.querySelector('tanrei-search-result') as any).excerpt = ['A long passage that does not fit one line of a narrow view and so wraps onto a second and a third line of text instead of being cut.']);
    await expect.poll(async () => (await bounds(link(page, 'some', 'one'))).height).toBeGreaterThan((await bounds(link(page, 'some', 'two'))).height + 20);
    // States, from the suggestion tokens.
    await override(page, {
      [S('hovered-suggestion-headline-color')]: 'rgb(0, 0, 200)',
      [S('focused-suggestion-headline-color')]: 'rgb(0, 200, 0)',
      [S('pressed-suggestion-headline-color')]: 'rgb(200, 0, 0)',
    });
    const two = link(page, 'some', 'two');
    const headline = two.locator('.headline');
    await two.hover();
    await expect.poll(() => css(headline, 'color')).toBe('rgb(0, 0, 200)');
    expect(await css(two, 'background-color')).toBe(await resolveColor(page, S('hovered-suggestion-container-color')));
    // A pointer over a result does not move focus (SRC-49).
    expect(await focused(page)).not.toContain('result');
    await page.mouse.move(0, 0);
    await input(page, 'some').focus();
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
    await expect(two).toBeFocused();
    await expect.poll(() => css(headline, 'color')).toBe('rgb(0, 200, 0)');
    expect(await css(two, 'background-color')).toBe(await resolveColor(page, S('focused-suggestion-container-color')));
    // The ring: inside the row, never transitioned.
    expect(await css(two, 'outline-style')).toBe('solid');
    expect(await px(two, 'outline-offset')).toBeLessThan(0);
    expect(await css(two, 'transition-property')).not.toContain('outline');
    // Pressed over focused, at once (SRC-19, SRC-20): by Enter, held for press-hold, and by pointer.
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    const pressed = await two.evaluate((el) => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
      return (el as HTMLElement).dataset.pressed;
    });
    expect(pressed).toBe('overlay');
    await expect.poll(() => css(headline, 'color')).toBe('rgb(200, 0, 0)');
    await expect.poll(() => two.getAttribute('data-pressed'), { timeout: hold + 2000 }).toBeNull();
    await two.hover();
    await page.mouse.down();
    expect(await two.getAttribute('data-pressed')).toBe('overlay');
    await expect.poll(() => css(headline, 'color')).toBe('rgb(200, 0, 0)');
    await page.mouse.up();
  });

  test('SRC-43: an excerpt is runs of text, every even one a match drawn in result.mark.color with its weight raised by result.mark.emphasis over the result.mark.container.color fill (the secondary container in the default system); the product’s own <mark> child content is drawn the same; a fill moves no text; nothing is trimmed, and the whole passage is the result’s description', async ({ page }) => {
    const runs = ['', 'Tokens', ' of the button: its heights, corners and ', 'colors', ' in each state, and the motion that takes one to the next.  '];
    await mountSite(page, [
      mail('s', { expanded: true }, [
        { kind: 'result', props: { value: 'runs', headline: 'Button', href: '/button', excerpt: runs } },
        { kind: 'result', props: { value: 'plain', headline: 'Plain', href: '/plain', excerpt: ['One run alone is a passage without marks.'] } },
        { kind: 'result', props: { value: 'none', headline: 'No excerpt', href: '/none' } },
      ]),
    ]);
    await host(page, 's').evaluate((el) =>
      el.insertAdjacentHTML('beforeend', '<tanrei-search-result value="slotted" headline="Button" href="/button2"><mark>Tokens</mark> of the button: its heights, corners and <mark>colors</mark> in each state, and the motion that takes one to the next.  </tanrei-search-result>'),
    );
    const own = link(page, 's', 'runs');
    const slotted = link(page, 's', 'slotted');
    await expect(own.locator('mark')).toHaveText(['Tokens', 'colors']);
    const base = await resolveColor(page, S('suggestion-supporting-text-color'));
    const weight = Number(await token(page, '--tanrei-sys-typescale-body-small-font-weight')) + Number(await token(page, '--tanrei-sys-typescale-emphasis-body'));
    // The verify: a match differs from the excerpt around it by color, by weight and by a fill of the secondary container
    // (on-surface on the secondary container is above 7:1 in every scheme of every shipped system).
    const fill = await resolveColor(page, '--tanrei-sys-color-secondary-container');
    expect(await resolveColor(page, T('result-mark-container-color'))).toBe(fill);
    for (const mark of [own.locator('mark').first(), host(page, 's').locator('tanrei-search-result[value="slotted"] > mark').first()]) {
      expect(await css(mark, 'color')).toBe(await resolveColor(page, T('result-mark-color')));
      expect(await css(mark, 'color')).not.toBe(base);
      expect(Number(await css(mark, 'font-weight'))).toBe(weight);
      expect(Number(await css(mark, 'font-weight'))).toBeGreaterThan(Number(await css(own.locator('.excerpt'), 'font-weight')));
      expect(await css(mark, 'background-color')).toBe(fill);
      expect([await px(mark, 'padding-left'), await px(mark, 'border-top-left-radius')]).toEqual([0, 0]);
      expect(await px(mark, 'font-size')).toBe(await px(own.locator('.excerpt'), 'font-size'));
    }
    // The runs and the same passage given as child content are drawn alike: one continuous text that wraps as one.
    const [a, b] = [await bounds(own), await bounds(slotted)];
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    expect(a.height).toBeGreaterThan((await bounds(link(page, 's', 'plain'))).height);
    await expect(link(page, 's', 'plain').locator('mark')).toHaveCount(0);
    await expect(link(page, 's', 'none').locator('.excerpt')).toHaveCount(0);
    // Exposed as one text, the result's description; the headline is never marked; nothing is trimmed or shortened.
    const whole = 'Tokens of the button: its heights, corners and colors in each state, and the motion that takes one to the next.';
    await expect(page.getByRole('link', { name: 'Button', exact: true }).first()).toHaveAccessibleDescription(whole);
    await expect(slotted).toHaveAttribute('aria-description', whole);
    await expect(own.locator('.headline mark')).toHaveCount(0);
    expect(await own.locator('.excerpt').evaluate((el) => el.textContent)).toBe(runs.join(''));
    expect(await css(own.locator('.excerpt'), 'unicode-bidi')).toBe('plaintext');
    // A layer that fills the match shows the fill, and the text's line breaks do not change.
    const lines = (locator: Locator) =>
      locator.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return [...range.getClientRects()].map((rect) => `${Math.round(rect.top)}:${Math.round(rect.left)}:${Math.round(rect.width)}`).join('|');
      });
    const before = [await lines(own.locator('.excerpt')), await bounds(own), await bounds(slotted)];
    await override(page, { [T('result-mark-container-color')]: 'rgb(255, 230, 0)' });
    await expect.poll(() => css(own.locator('mark').first(), 'background-color')).toBe('rgb(255, 230, 0)');
    expect(await css(host(page, 's').locator('tanrei-search-result[value="slotted"] > mark').first(), 'background-color')).toBe('rgb(255, 230, 0)');
    expect([await lines(own.locator('.excerpt')), await bounds(own), await bounds(slotted)]).toEqual(before);
    // The product's content replaces the runs, and is followed as it changes.
    await host(page, 's').evaluate((el) => (el.querySelector('[value="plain"]')!.innerHTML = 'Now <mark>marked</mark> by the product.'));
    await expect(link(page, 's', 'plain')).toHaveAttribute('aria-description', 'Now marked by the product.');
    await expect(link(page, 's', 'plain').locator('slot')).toHaveCount(1);
  });

  test('SRC-44: a group is its heading and then its results, group.gap from what stands above and below it; without href the heading is a quiet title that takes no input, with one it is a result’s row and its results step in by group.indent, hit areas with them; right to left mirrors the inset', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [gap, indent, padInline, padBlock] = await Promise.all(['group-gap', 'group-indent', 'suggestion-container-padding-inline-regular', 'suggestion-container-padding-block-regular'].map((n) => resolveToken(page, T(n))));
    // A titled group (docked-results): the title in group-title.typescale and color, inset as a row is.
    const title = host(page, 'docked-results').locator('tanrei-search-result-group .title');
    await expect(title).toHaveText('Messages');
    expect(await px(title, 'font-size')).toBe(await resolveToken(page, T('group-title-typescale-font-size')));
    expect(await css(title, 'color')).toBe(await resolveColor(page, T('group-title-color')));
    expect([await px(title, 'padding-left'), await px(title, 'padding-top'), await px(title, 'padding-bottom')]).toEqual([padInline, padBlock, padBlock]);
    expect(await css(title, 'cursor')).toBe('auto');
    await expect(host(page, 'docked-results').locator('tanrei-search-result-group .group > .row')).toHaveCount(0);
    // It stands group.gap below the status row above it; its results are not inset.
    const [status, t0, first] = [await bounds(statusRow(page, 'docked-results')), await bounds(title), await bounds(link(page, 'docked-results', 'm-1'))];
    expect(t0.y - (status.y + status.height)).toBeCloseTo(gap, 1);
    expect(first.x).toBe(t0.x);
    expect(first.y).toBeCloseTo(t0.y + t0.height, 1);
    // A linked group (dialog-results): the heading is a result's row; its results step in by group.indent.
    const head = heading(page, 'dialog-results', '/tokens/');
    await expect(head.locator('.headline')).toHaveText('Design tokens');
    await expect(head.locator('mark')).toHaveText('tokens');
    await expect(head.locator('.icon')).toHaveText('article');
    await expect(host(page, 'dialog-results').locator('tanrei-search-result-group .title')).toHaveCount(0);
    const [h, part, loose, st] = [await bounds(head), await bounds(link(page, 'dialog-results', '/tokens/#pipeline')), await bounds(link(page, 'dialog-results', '/components/button/')), await bounds(statusRow(page, 'dialog-results'))];
    expect(part.x - h.x).toBeCloseTo(indent, 1);
    expect(h.x + h.width - (part.x + part.width)).toBeCloseTo(0, 1);
    expect(h.y - (st.y + st.height)).toBeCloseTo(gap, 1);
    const last = await bounds(link(page, 'dialog-results', '/tokens/#layers'));
    expect(loose.y - (last.y + last.height)).toBeCloseTo(gap, 1);
    expect(loose.x).toBe(h.x);
    // Right to left mirrors the inset.
    const [rh, rpart] = [await bounds(heading(page, 'dialog-results-rtl', '/tokens/')), await bounds(link(page, 'dialog-results-rtl', '/tokens/#pipeline'))];
    expect(rh.x + rh.width - (rpart.x + rpart.width)).toBeCloseTo(indent, 1);
    expect(rpart.x).toBeCloseTo(rh.x, 1);
    // Two groups that follow each other stand one gap apart; the first thing in a view stands no gap below its top.
    await mountSite(page, [
      mail('g', { expanded: true, statusText: '' }, [
        { kind: 'result-group', props: { headline: 'Pages' }, items: [result('a', 'A')] },
        { kind: 'result-group', props: { headline: 'People' }, items: [result('b', 'B')] },
      ]),
    ]);
    const titles = host(page, 'g').locator('tanrei-search-result-group .title');
    // The live view follows its bar and its content frame by frame: measure once it stands still.
    const places = async () => [await bounds(titles.nth(0)), await bounds(link(page, 'g', 'a')), await bounds(titles.nth(1)), await bounds(host(page, 'g').locator('.view .scroll'))];
    let [one, a, two, scroll] = await places();
    await expect
      .poll(async () => {
        const before = JSON.stringify([one, a, two, scroll]);
        [one, a, two, scroll] = await places();
        return JSON.stringify([one, a, two, scroll]) === before;
      })
      .toBe(true);
    expect(two.y - (a.y + a.height)).toBeCloseTo(gap, 1);
    expect(one.y - scroll.y).toBeCloseTo(await resolveToken(page, T('view-padding-block')), 1);
    // The excerpt of a linked heading may be the group's own child content, with marks, beside its results.
    await host(page, 'g').evaluate((el) =>
      el.insertAdjacentHTML('beforeend', '<tanrei-search-result-group value="/x/" headline="Page" href="/x/">A page about <mark>tokens</mark>.<tanrei-search-result value="/x/#y" headline="Part" href="/x/#y"></tanrei-search-result></tanrei-search-result-group>'),
    );
    await expect(heading(page, 'g', '/x/')).toHaveAttribute('aria-description', 'A page about tokens.');
    expect(await css(host(page, 'g').locator('tanrei-search-result-group[value="/x/"] > mark'), 'color')).toBe(await resolveColor(page, T('result-mark-color')));
    await expect(link(page, 'g', '/x/#y')).toBeVisible();
  });

  test('SRC-45: a result with an href is the browser’s own link — an anchor, never an option or a button; target new is a new context without an opener, said by targetLabel after the excerpt; activated in place it emits a cancelable select, is followed unless cancelled, and the view closes; opened any other way nothing is emitted and the view stays; without an href, or with a script, it is a button', async ({ page }) => {
    await mountSite(page, [
      site('s', {}, [
        ...SITE.items!,
        { kind: 'result', props: { value: 'ext', headline: 'Changelog', href: 'https://example.com/changelog', target: 'new', targetLabel: 'opens in a new tab', excerpt: ['What changed in ', '2.0', '.'] } },
        { kind: 'result', props: { value: 'plain', headline: 'A command', excerpt: ['Runs in the product.'] } },
        { kind: 'result', props: { value: 'script', headline: 'A script', href: 'javascript:alert(1)' } },
      ]),
    ]);
    const s = host(page, 's');
    const open = async () => {
      if (!(await prop(s, 'expanded'))) await trigger(page, 's').click();
      await expect(headerInput(page, 's')).toBeFocused();
      await wire(s);
      await page.evaluate(() => ((window as any).nav.length = 0));
    };
    await open();
    const pipeline = link(page, 's', '/tokens/#pipeline');
    expect(await pipeline.evaluate((el) => [el.localName, el.getAttribute('href'), el.getAttribute('target'), el.getAttribute('rel'), el.getAttribute('role')])).toEqual(['a', '/tokens/#pipeline', null, null, null]);
    expect(await heading(page, 's', '/tokens/').evaluate((el) => [el.localName, el.getAttribute('href')])).toEqual(['a', '/tokens/']);
    // A new context: no handle to the page that opened it, said after the excerpt, and no mark drawn for it.
    const ext = link(page, 's', 'ext');
    expect(await ext.evaluate((el) => [el.getAttribute('target'), el.getAttribute('rel')])).toEqual(['_blank', 'noopener']);
    await expect(ext).toHaveAttribute('aria-description', 'What changed in 2.0., opens in a new tab');
    await expect(ext.locator('.icon')).toHaveCount(1);
    expect(await ext.evaluate((el) => el.textContent)).not.toContain('open_in_new');
    // In place, by a press: select with its value, then the link is followed, then the view closes (toggle follows select).
    await pipeline.click();
    expect(await log(page)).toEqual(['select:/tokens/#pipeline', 'toggle:false:select:false']);
    expect(await nav(page)).toEqual(['followed:/tokens/#pipeline']);
    // By Enter: the browser's own activation of the focused link.
    await open();
    await pipeline.focus();
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['select:/tokens/#pipeline', 'toggle:false:select:false']);
    expect(await nav(page)).toEqual(['followed:/tokens/#pipeline']);
    // Space is not a link's key: nothing is emitted and the view stays.
    await open();
    await pipeline.focus();
    await page.keyboard.press('Space');
    expect([await log(page), await nav(page), await prop(s, 'expanded')]).toEqual([[], [], true]);
    // A router cancels select: the link is not followed; the view still closes.
    await s.evaluate((el) => el.addEventListener('select', (event) => event.preventDefault(), { once: true }));
    await heading(page, 's', '/tokens/').click();
    expect(await log(page)).toEqual(['select:/tokens/', 'toggle:false:select:false']);
    expect(await nav(page)).toEqual(['cancelled']);
    // Any other way — a modifier key, target new — emits nothing and keeps the view open: several results from one search.
    await open();
    // (Dispatched, so that the test does not depend on what the platform makes of Control with a press.)
    await pipeline.evaluate((el) => {
      for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, button: 0, [modifier]: true }));
    });
    await ext.click();
    expect(await log(page)).toEqual([]);
    expect(await nav(page)).toEqual([...Array(4).fill('followed:/tokens/#pipeline'), 'followed:https://example.com/changelog']);
    expect(await prop(s, 'expanded')).toBe(true);
    // The middle button is the browser's: it fires auxclick, never click, and the search hears neither.
    await pipeline.evaluate((el) => el.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, composed: true, cancelable: true, button: 1 })));
    expect([await log(page), await prop(s, 'expanded')]).toEqual([[], true]);
    // Without an href it is a button, for which select is all that happens — by a press, Enter or Space.
    const plain = link(page, 's', 'plain');
    expect(await plain.evaluate((el) => [el.localName, el.getAttribute('type'), el.hasAttribute('href')])).toEqual(['button', 'button', false]);
    await expect(plain).toHaveAttribute('aria-description', 'Runs in the product.');
    await plain.focus();
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['select:plain', 'toggle:false:select:false']);
    // An address that names a script is no destination: a button too.
    expect(await link(page, 's', 'script').evaluate((el) => [el.localName, el.hasAttribute('href')])).toEqual(['button', false]);
  });

  test('SRC-46: the view’s content is laid out from top to bottom as the suggestions, the status row, the results and groups in the product’s order, then the default slot’s content — whatever the order of the children — and an absent part takes no room', async ({ page }) => {
    await mountSite(page, [mail('s', { expanded: true })]);
    const s = host(page, 's');
    // The product's own content first among the children, a result before the group, a suggestion last.
    await s.evaluate((el) => {
      el.insertAdjacentHTML('afterbegin', '<button id="more" type="button">Load more</button>');
      el.insertAdjacentHTML('afterbegin', '<tanrei-search-result value="first" headline="First" href="/first"></tanrei-search-result>');
      el.insertAdjacentHTML('beforeend', '<tanrei-search-suggestion value="late" headline="late"></tanrei-search-suggestion>');
    });
    await settled(s);
    const tops = async () =>
      Promise.all([row(page, 's', 0), row(page, 's', 1), statusRow(page, 's'), link(page, 's', 'first'), s.locator('tanrei-search-result-group .title'), link(page, 's', 'm-2'), s.locator('#more')].map(async (locator) => (await bounds(locator)).y));
    const order = await tops();
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
    // Tab and the accessibility tree follow the same order: the results come before the product's content.
    expect(await s.evaluate((el) => [...el.shadowRoot!.querySelectorAll('.scroll > *')].map((part) => part.className.split(' ')[0]))).toEqual(['listbox', 'status', 'results', 'content']);
    // An absent part takes no room.
    await s.evaluate((el: any) => {
      el.statusText = '';
      el.querySelectorAll('tanrei-search-suggestion').forEach((child: Element) => child.remove());
    });
    await settled(s);
    expect((await bounds(statusRow(page, 's'))).height).toBe(0);
    await expect(s.locator('.listbox')).toHaveCount(0);
    expect((await bounds(link(page, 's', 'first'))).y - (await bounds(s.locator('.view .scroll'))).y).toBeCloseTo(await resolveToken(page, T('view-padding-block')), 1);
  });
});

test.describe('status', () => {
  test('SRC-47: the status row is drawn while there is statusText or the search is loading, inset as a suggestion’s row and taking no input: the text in status.typescale and status.color, in status.error.color for an error, and while loading a small loading indicator named by statusText in the text’s place, the row one line high whether or not it shows yet; the results stay usable', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const [padInline, padBlock] = await Promise.all(['suggestion-container-padding-inline-regular', 'suggestion-container-padding-block-regular'].map((n) => resolveToken(page, T(n))));
    const none = statusRow(page, 'dialog-none');
    await expect(none).toHaveText('No results for tokne');
    expect(await px(none, 'font-size')).toBe(await resolveToken(page, T('status-typescale-font-size')));
    expect(await css(none, 'color')).toBe(await resolveColor(page, T('status-color')));
    expect([await px(none, 'padding-left'), await px(none, 'padding-right'), await px(none, 'padding-top'), await px(none, 'padding-bottom')]).toEqual([padInline, padInline, padBlock, padBlock]);
    expect(await css(none, 'cursor')).toBe('auto');
    const error = statusRow(page, 'dialog-error');
    await expect(error).toHaveText('Search is unavailable. Try again in a moment.');
    expect(await css(error, 'color')).toBe(await resolveColor(page, T('status-error-color')));
    expect(await css(error, 'color')).not.toBe(await css(none, 'color'));
    // Loading: one small loading indicator at the row's start, named by statusText, and no text. The fixture's indicator
    // shows from the first frame (its show delay and entrance are 0 there).
    const loading = statusRow(page, 'dialog-loading');
    const spinner = loading.locator('tanrei-loading-indicator');
    await expect(spinner).toHaveCount(1);
    expect(await spinner.evaluate((el: any) => [el.size, el.label])).toEqual(['small', 'Searching']);
    await expect(spinner).toHaveAttribute('role', 'progressbar');
    await expect(loading).toHaveText('');
    const [row, ring] = [await bounds(loading), await bounds(spinner)];
    expect(ring.x - row.x).toBeCloseTo(padInline, 1);
    expect(ring.y + ring.height / 2).toBeCloseTo(row.y + row.height / 2, 0);
    // One line of text high, with or without the indicator: as high as a row that holds a line of text.
    expect(row.height).toBeCloseTo((await bounds(none)).height, 1);
    // The indicator waits its own show delay (LDG-11): a quick answer never flashes one, and the row does not jump.
    await mountSite(page, [mail('s', { expanded: true })]);
    const s = host(page, 's');
    const text = (await bounds(statusRow(page, 's'))).height;
    await s.evaluate((el: any) => ((el.status = 'loading'), (el.statusText = 'Searching')));
    await settled(s);
    const waiting = s.locator('.status tanrei-loading-indicator');
    await expect(waiting).toHaveAttribute('aria-hidden', 'true');
    expect((await bounds(statusRow(page, 's'))).height).toBeCloseTo(text, 1);
    await expect(waiting).toHaveAttribute('role', 'progressbar', { timeout: 5000 });
    expect((await bounds(statusRow(page, 's'))).height).toBeCloseTo(text, 1);
    // The results the product leaves in the view stay drawn and usable while it loads.
    await wire(s);
    await link(page, 's', 'm-1').click();
    expect(await log(page)).toEqual(['select:m-1', 'toggle:false:select:false']);
    // Loading without a text still draws the row; idle without a text draws none.
    await mountSite(page, [mail('l', { expanded: true, status: 'loading', statusText: '' }), mail('i', { expanded: true, statusText: '' })]);
    expect((await bounds(statusRow(page, 'l'))).height).toBeCloseTo(text, 1);
    expect((await bounds(statusRow(page, 'i'))).height).toBe(0);
  });

  test('SRC-48: the status row is a live region from the moment the view opens — statusText is in a status region while idle and in an alert while the query failed, and while loading neither says anything and the results are marked busy; the text is the product’s, never composed', async ({ page }) => {
    await mountSite(page, [site('s', { statusText: '' }, [])]);
    const s = host(page, 's');
    await trigger(page, 's').click();
    const polite = s.locator('.status [role="status"]');
    const assertive = s.locator('.status [role="alert"]');
    // Present, and empty, before the first answer.
    await expect(polite).toHaveCount(1);
    await expect(assertive).toHaveCount(1);
    expect(await polite.evaluate((el) => [el.textContent, getComputedStyle(el).display !== 'none', el.closest('[hidden], [aria-hidden="true"]')])).toEqual(['', true, null]);
    const same = await polite.elementHandle();
    await s.evaluate((el: any) => {
      el.insertAdjacentHTML('beforeend', '<tanrei-search-result value="a" headline="A" href="/a"></tanrei-search-result>');
      el.statusText = '1 result for token';
    });
    await expect(polite).toHaveText('1 result for token');
    await expect(assertive).toHaveText('');
    // The same element said it: a region that was already there.
    expect(await polite.evaluate((el, before) => el === before, same)).toBe(true);
    const list = s.locator('.results');
    await expect(list).not.toHaveAttribute('aria-busy', /.*/);
    // Loading: nothing is announced, and the results are busy until it ends.
    await s.evaluate((el: any) => ((el.status = 'loading'), (el.statusText = 'Searching')));
    await expect(polite).toHaveText('');
    await expect(assertive).toHaveText('');
    await expect(list).toHaveAttribute('aria-busy', 'true');
    // Failed: read at once.
    await s.evaluate((el: any) => ((el.status = 'error'), (el.statusText = 'Search is unavailable')));
    await expect(assertive).toHaveText('Search is unavailable');
    await expect(polite).toHaveText('');
    await expect(list).not.toHaveAttribute('aria-busy', /.*/);
    await expect(page.getByRole('alert')).toHaveText('Search is unavailable');
    // Idle again: the product's words, as given.
    await s.evaluate((el: any) => ((el.status = 'idle'), (el.statusText = '  12 results  ')));
    await expect(page.getByRole('status')).toHaveText('12 results');
    expect(await polite.evaluate((el) => el.textContent)).toBe('  12 results  ');
  });
});

test.describe('keys through results', () => {
  test('SRC-14, SRC-49: Down Arrow walks the suggestions with focus in the input and then moves real focus to the first result and on through the results, across groups — a linked heading counts, a title does not — staying on the last; Up Arrow comes back, from the first result to the input with the last suggestion active', async ({ page }) => {
    await mountSite(page, [
      mail('s', { expanded: true }, [
        suggestion('one'),
        suggestion('two'),
        { kind: 'result-group', props: { headline: 'Pages', value: '/p/', href: '/p/' }, items: [result('p1', 'Part 1'), result('p2', 'Part 2')] },
        { kind: 'result-group', props: { headline: 'People' }, items: [result('ann', 'Ann')] },
        result('last', 'Last'),
      ]),
    ]);
    const field = input(page, 's');
    await field.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(field).toHaveAttribute('aria-activedescendant', 'option-1');
    expect(await focused(page)).toBe('input@search:inv');
    // The last suggestion is active: on to the first result — the linked heading — by real focus.
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result-group:/p/');
    await expect(field).not.toHaveAttribute('aria-activedescendant', /.*/);
    await expect(host(page, 's').locator('.option[data-active]')).toHaveCount(0);
    const visited: (string | null)[] = [];
    for (let presses = 0; presses < 5; presses++) {
      await page.keyboard.press('ArrowDown');
      visited.push(await focused(page));
    }
    // Across groups; the title "People" is not a stop; it stays on the last.
    expect(visited).toEqual(['a@search-result:p1', 'a@search-result:p2', 'a@search-result:ann', 'a@search-result:last', 'a@search-result:last']);
    // The view is still open, and the focus ring is inside the focused row.
    expect(await popoverOpen(view(page, 's'))).toBe(true);
    expect(await css(link(page, 's', 'last'), 'outline-style')).toBe('solid');
    for (const expected of ['a@search-result:ann', 'a@search-result:p2', 'a@search-result:p1', 'a@search-result-group:/p/']) {
      await page.keyboard.press('ArrowUp');
      expect(await focused(page)).toBe(expected);
    }
    // From the first result back to the input, the last suggestion active.
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('input@search:inv');
    await expect(field).toHaveAttribute('aria-activedescendant', 'option-1');
    expect(await prop(host(page, 's'), 'expanded')).toBe(true);
    // With no suggestion in the view, Down Arrow in the input goes straight to the first result.
    await mountSite(page, [site('d')]);
    await trigger(page, 'd').click();
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result-group:/tokens/');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('input@search:token');
    // The arrows never reach the status row or the product's own content.
    await host(page, 'd').evaluate((el) => el.insertAdjacentHTML('beforeend', '<button id="more" type="button">Load more</button>'));
    for (let presses = 0; presses < 6; presses++) await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result:/components/button/');
  });

  test('SRC-49: a result that takes focus is scrolled into view; typing, deleting or pasting on a result returns focus to the input, where the key edits the value; Enter is the browser’s own activation of the link; Escape closes as from the input', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 400 });
    await mountSite(page, [site('s', {}, Array.from({ length: 12 }, (_, n) => result(`r${n}`, `Result ${n}`, { excerpt: ['An excerpt with a ', 'match', '.'] })))]);
    const s = host(page, 's');
    await trigger(page, 's').click();
    await wire(s);
    const scroll = s.locator('.full .scroll');
    for (let presses = 0; presses < 12; presses++) await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result:r11');
    expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const [room, last] = [await bounds(scroll), await bounds(link(page, 's', 'r11'))];
    expect(last.y).toBeGreaterThanOrEqual(room.y - 0.5);
    expect(last.y + last.height).toBeLessThanOrEqual(room.y + room.height + 0.5);
    // The verify: typing a letter returns focus to the input and the letter is in the value.
    await page.keyboard.press('x');
    expect(await focused(page)).toBe('input@search:tokenx');
    expect(await log(page)).toEqual(['input:tokenx']);
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result:r0');
    await page.keyboard.press('Backspace');
    expect(await focused(page)).toBe('input@search:token');
    // Pasting: the key goes to the input (what the clipboard holds is the platform's).
    await page.keyboard.press('ArrowDown');
    await link(page, 's', 'r0').evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, composed: true })));
    expect(await focused(page)).toBe('input@search:token');
    // The verify: Enter on a result is a native activation of the link — the search follows nothing from script.
    await page.keyboard.press('ArrowDown');
    await wire(s);
    await page.evaluate(() => ((window as any).nav.length = 0));
    const scripted = await page.evaluate(() => {
      let assigned = 0;
      const push = history.pushState;
      history.pushState = function (this: History, ...rest: Parameters<History['pushState']>) {
        assigned += 1;
        return push.apply(this, rest);
      };
      (window as any).scripted = () => assigned;
      return typeof (window as any).scripted;
    });
    expect(scripted).toBe('function');
    await page.keyboard.press('Enter');
    expect(await nav(page)).toEqual(['followed:/r0']);
    expect(await log(page)).toEqual(['select:r0', 'toggle:false:select:false']);
    expect(await page.evaluate(() => (window as any).scripted())).toBe(0);
    // Escape on a result closes the view as from the input, and focus returns to the trigger.
    await trigger(page, 's').click();
    await page.keyboard.press('ArrowDown');
    await wire(s);
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['toggle:false:escape:false']);
    await expect(trigger(page, 's')).toBeFocused();
  });

  test('SRC-6, SRC-49: Tab and Shift+Tab move through the results as through any links while the view is modal and stay inside it; docked, Tab on a result leaves the search and closes the view with the reason tab, and Escape returns focus to the input', async ({ page }) => {
    await mountSite(page, [site('m'), mail('d')]);
    await trigger(page, 'm').click();
    await expect(headerInput(page, 'm')).toBeFocused();
    const stops: (string | null)[] = [];
    for (let presses = 0; presses < 7; presses++) {
      await tab(page);
      stops.push(await focused(page));
    }
    // The header's clear button, then each link in order, then round to the header's back button (SRC-40) and the input: focus never leaves the view.
    expect(stops).toEqual(['button@tanrei-button:', 'a@search-result-group:/tokens/', 'a@search-result:/tokens/#pipeline', 'a@search-result:/tokens/#layers', 'a@search-result:/components/button/', 'button@tanrei-button:', 'input@search:token']);
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await focused(page)).toBe('a@search-result:/components/button/');
    expect(await prop(host(page, 'm'), 'expanded')).toBe(true);
    await page.keyboard.press('Escape');
    // Docked: Escape on a result closes it and focus is back in the bar's input.
    const d = host(page, 'd');
    const open = async () => {
      await input(page, 'd').focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      expect(await focused(page)).toBe('a@search-result:m-1');
      await wire(d);
    };
    await open();
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['toggle:false:escape:false']);
    await expect(input(page, 'd')).toBeFocused();
    // Docked: Tab leaves the results and closes the view; focus moves on from the input, as it would have.
    await open();
    await tab(page);
    expect(await log(page)).toEqual(['toggle:false:tab:false']);
    expect(await focused(page)).toBe('button@tanrei-button:');
    await open();
    await tab(page, { back: true });
    expect(await log(page)).toEqual(['toggle:false:tab:false']);
    expect(await focused(page)).not.toContain('search-result');
    await expect.poll(() => popoverOpen(view(page, 'd'))).toBe(false);
  });
});

test.describe('results: semantics and the product’s data', () => {
  test('SRC-24, SRC-50: the results are links in one list named by label, outside the suggestions’ listbox — each named by its headline and described by its excerpt, a group named by its headline holding its own list, a linked heading a link before it, a result without href a button; never an option; the input is a combobox only while suggestions show; the dialog view is a modal dialog named by label', async ({ page }) => {
    await mountSite(page, [site('s', {}, [...SITE.items!, { kind: 'result', props: { value: 'cmd', headline: 'A command' } }]), mail('d', { label: 'Search the mail' })]);
    await trigger(page, 's').click();
    const view = page.getByRole('dialog', { name: 'Search the docs' });
    await expect(view).toBeVisible();
    expect(await dialog(page, 's').evaluate((el) => el.matches(':modal'))).toBe(true);
    // No suggestion: a search box, not a combobox — whatever else the view holds.
    await expect(view.getByRole('searchbox', { name: 'Search the docs' })).toHaveCount(1);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(headerInput(page, 's')).not.toHaveAttribute('aria-controls', /.*/);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(page.getByRole('option')).toHaveCount(0);
    const list = host(page, 's').locator('.results');
    await expect(list).toHaveAttribute('role', 'list');
    await expect(list).toHaveAttribute('aria-label', 'Search the docs');
    // (The results are the search's own children, shown in the dialog through its slot.)
    const links = host(page, 's').getByRole('link');
    await expect(links).toHaveCount(4);
    expect(await links.evaluateAll((links) => links.map((a) => a.getAttribute('aria-label')))).toEqual(['Design tokens', 'The pipeline', 'Layers', 'Button']);
    await expect(page.getByRole('link', { name: 'The pipeline' })).toHaveAccessibleDescription('The token pipeline reads the sources and writes one file per platform.');
    await expect(page.getByRole('button', { name: 'A command' })).toHaveCount(1);
    // The structure: list > listitem (a result, or a group: group > link, list > listitem > link).
    const tree = await host(page, 's').evaluate((el) => {
      const group = el.querySelector('tanrei-search-result-group')!;
      const inner = group.shadowRoot!.querySelector('.group')!;
      return {
        items: [...el.querySelectorAll(':scope > [slot="result"]')].map((item) => `${item.localName}:${item.getAttribute('role')}`),
        group: [inner.getAttribute('role'), inner.getAttribute('aria-label'), [...inner.children].map((child) => child.getAttribute('role') ?? child.localName)],
        parts: [...group.querySelectorAll('tanrei-search-result')].map((item) => item.getAttribute('role')),
        icons: [...el.querySelectorAll('tanrei-search-result')].every((item) => item.shadowRoot!.querySelector('.icon')?.getAttribute('aria-hidden') === 'true'),
        options: [el, ...el.querySelectorAll('*')].flatMap((item) => [...(item.shadowRoot?.querySelectorAll('[role="option"]') ?? [])]).length,
      };
    });
    expect(tree).toEqual({
      items: ['tanrei-search-result-group:listitem', 'tanrei-search-result:listitem', 'tanrei-search-result:listitem'],
      group: ['group', 'Design tokens', ['a', 'list']],
      parts: ['listitem', 'listitem'],
      icons: true,
      options: 0,
    });
    await expect(page.getByRole('group', { name: 'Design tokens' }).getByRole('link')).toHaveCount(1);
    // A focused result is never the input's active descendant.
    await page.keyboard.press('ArrowDown');
    await expect(headerInput(page, 's')).not.toHaveAttribute('aria-activedescendant', /.*/);
    const axe = await new AxeBuilder({ page }).include('tanrei-search').analyze();
    expect(axe.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
    await page.keyboard.press('Escape');
    // Docked with a suggestion and results: both, each part honest — a combobox that controls the listbox only, and links in a list beside it.
    await input(page, 'd').focus();
    await page.keyboard.press('ArrowDown');
    const combo = page.getByRole('combobox', { name: 'Search the mail' });
    await expect(combo).toHaveAttribute('aria-controls', 'listbox');
    await expect(page.getByRole('listbox', { name: 'Search the mail' }).getByRole('option')).toHaveCount(1);
    await expect(page.getByRole('listbox').getByRole('link')).toHaveCount(0);
    await expect(host(page, 'd').locator('tanrei-search-result-group .title')).toHaveAttribute('aria-hidden', 'true');
    const docked = await new AxeBuilder({ page }).include('tanrei-search').analyze();
    expect(docked.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
  });

  test('SRC-51: the search never queries, waits or debounces — input is emitted once per change, at once, and what the product sets is drawn as given, replacing what was there; results set while collapsed are kept and do not open it; when the focused result is removed focus goes to the input', async ({ page }) => {
    await mountSite(page, [site('s', { value: '', statusText: '' }, [])]);
    const s = host(page, 's');
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    // Results and a status set while collapsed: kept, and it stays closed.
    await wire(s);
    await s.evaluate((el: any) => {
      el.statusText = '2 results';
      el.insertAdjacentHTML('beforeend', '<tanrei-search-result value="a" headline="A" href="/a"></tanrei-search-result><tanrei-search-result value="b" headline="B" href="/b"></tanrei-search-result>');
    });
    await settled(s);
    expect([await prop(s, 'expanded'), await log(page)]).toEqual([false, []]);
    await trigger(page, 's').click();
    await expect(link(page, 's', 'a')).toBeVisible();
    await expect(statusRow(page, 's')).toHaveText('2 results');
    // One input per change, in the same task as the keystroke: nothing is delayed or dropped.
    await wire(s);
    const stamps = await s.evaluate(async (el: any) => {
      const input = el.shadowRoot.querySelector('.header .input') as HTMLInputElement;
      const seen: number[] = [];
      el.addEventListener('input', () => seen.push(performance.now()));
      const sent: number[] = [];
      for (const letter of ['t', 'o', 'k']) {
        input.value += letter;
        sent.push(performance.now());
        input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: letter, inputType: 'insertText' }));
        sent.push(performance.now());
      }
      return seen.map((at, index) => at >= sent[index * 2] && at <= sent[index * 2 + 1]);
    });
    expect(stamps).toEqual([true, true, true]);
    expect(await log(page)).toEqual(['input:t', 'input:to', 'input:tok']);
    // The results it was given are still there: it filters nothing by the value, and sorts nothing.
    expect(await s.evaluate((el) => [...el.querySelectorAll('tanrei-search-result')].map((item) => (item as any).value))).toEqual(['a', 'b']);
    // The focused result is replaced by the product: focus goes to the input, not out of the view.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result:b');
    await s.evaluate((el: any) => {
      el.querySelectorAll('tanrei-search-result').forEach((item: Element) => item.remove());
      el.insertAdjacentHTML('beforeend', '<tanrei-search-result value="c" headline="C" href="/c"></tanrei-search-result>');
      el.statusText = '1 result';
    });
    await expect.poll(() => focused(page)).toBe('input@search:tok');
    await expect(link(page, 's', 'c')).toBeVisible();
    await expect(link(page, 's', 'a')).toHaveCount(0);
    expect(await prop(s, 'expanded')).toBe(true);
    // Replaced at once, without a motion of its own.
    expect(await link(page, 's', 'c').evaluate((el) => el.getAnimations().length + (el.getRootNode() as ShadowRoot).host.getAnimations().length)).toBe(0);
    expect(requests).toEqual([]);
  });

  test('SRC-10, SRC-46: focus() on the element goes to the input focus belongs to — the header’s while a modal view is open, dialog or full-screen, so that the product’s own content in the view can send focus back when it removes what held it; the bar’s while the view is docked or closed; the trigger while a triggered search is closed; nowhere while disabled — and neither opens nor closes anything', async ({ page }) => {
    // The host delegates focus to the first element of its shadow tree that takes it, which behind an open modal view
    // would be the dialog itself, where typing goes nowhere.
    await mountSite(page, [site('d', { value: 'tok', statusText: '' }, []), site('f', { value: 'tok', statusText: '', presentation: 'full-screen' }, []), mail('m', { statusText: '' }, [result('a', 'A')]), mail('off', { disabled: true }, [])]);
    for (const id of ['d', 'f']) {
      const s = host(page, id);
      await wire(s);
      // Closed, a triggered search has no input in the page: its trigger takes the focus, and stays closed.
      await s.evaluate((el: HTMLElement) => el.focus());
      await expect(trigger(page, id), id).toBeFocused();
      expect(await prop(s, 'expanded'), id).toBe(false);
      await trigger(page, id).click();
      await expect(headerInput(page, id), id).toBeFocused();
      // The product's own content in the view (SRC-46): a button that empties the search and goes with what it stood in.
      await s.evaluate((el: any) => {
        const own = Object.assign(document.createElement('button'), { type: 'button', className: 'own', textContent: 'Clear the search' });
        own.addEventListener('click', () => {
          el.value = '';
          own.remove();
          el.focus();
        });
        el.append(own);
      });
      await settled(s);
      const own = s.locator('> button.own');
      await own.focus();
      await expect(own, id).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(headerInput(page, id), id).toBeFocused();
      expect(await focused(page), id).toBe('input@search:');
      // What is typed next is the search's: focus is in the field, not on the dialog.
      await page.keyboard.type('ab');
      expect(await prop(s, 'value'), id).toBe('ab');
      // Nothing opened or closed for it, and the options are the platform's own (the page is not scrolled to it).
      expect(await prop(s, 'expanded'), id).toBe(true);
      expect(await toggles(page), id).toHaveLength(1);
      await page.keyboard.press('Escape');
      await expect.poll(() => prop(s, 'expanded'), id).toBe(false);
    }
    // Docked: the bar's input, open or closed — from a result too — and focus() opens nothing.
    const m = host(page, 'm');
    await wire(m);
    await m.evaluate((el: HTMLElement) => el.focus());
    await expect(input(page, 'm')).toBeFocused();
    expect([await prop(m, 'expanded'), await log(page)]).toEqual([false, []]);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => prop(m, 'expanded')).toBe(true);
    await page.keyboard.press('ArrowDown');
    await expect(link(page, 'm', 'a')).toBeFocused();
    await m.evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
    await expect(input(page, 'm')).toBeFocused();
    expect(await prop(m, 'expanded')).toBe(true);
    // Disabled: it takes no focus (SRC-25).
    const before = await focused(page);
    await host(page, 'off').evaluate((el: HTMLElement) => el.focus());
    expect(await focused(page)).toBe(before);
  });

  test('SRC-6, SRC-7, SRC-8: docked, a view that holds only a status row or only results is drawn; a press on the status row or the view keeps focus in the input, a press on a result gives it focus without closing the view, and focus that moves between the input and a result has not left the search', async ({ page }) => {
    await mountSite(page, [mail('only-status', { statusText: 'No messages' }, []), mail('only-results', { statusText: '' }, [result('a', 'A')]), mail('s')]);
    for (const id of ['only-status', 'only-results']) {
      await input(page, id).focus();
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => popoverOpen(view(page, id)), id).toBe(true);
      const [b, v] = [await bounds(bar(page, id)), await bounds(view(page, id))];
      expect([v.x, v.width], id).toEqual([b.x, b.width]);
      await page.keyboard.press('Escape');
    }
    // The verify: the fixture docked-results is drawn in a 360 × 480 stage.
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
    const stage = await bounds(page.locator('[data-fixture="docked-results"]'));
    expect([stage.width, stage.height]).toEqual([360, 480]);
    const v = await bounds(view(page, 'docked-results'));
    expect(v.y + v.height).toBeLessThanOrEqual(stage.y + stage.height);
    await mountSite(page, [mail('s')]);
    const s = host(page, 's');
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await wire(s);
    // A press on the status row and on the view's surface: focus stays in the input.
    await statusRow(page, 's').click();
    await expect(input(page, 's')).toBeFocused();
    await s.locator('tanrei-search-result-group .title').click();
    await expect(input(page, 's')).toBeFocused();
    // A press on a result: the link takes focus — still focus inside the search — so nothing closes before its click.
    const r = await bounds(link(page, 's', 'm-2'));
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    expect(await log(page)).toEqual([]);
    expect(await prop(s, 'expanded')).toBe(true);
    await page.mouse.up();
    expect(await log(page)).toEqual(['select:m-2', 'toggle:false:select:false']);
    // Arrow keys carry focus from the input to a result and back: never a focus-out.
    await input(page, 's').focus();
    await page.keyboard.press('ArrowDown');
    await wire(s);
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp']) await page.keyboard.press(key);
    expect(await focused(page)).toBe('input@search:inv');
    expect(await log(page)).toEqual([]);
    // Focus that really leaves — from a result — closes it.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.locator('#after').focus();
    expect(await log(page)).toEqual(['toggle:false:focus-out:false']);
  });

  test('SRC-9, SRC-13: the full-screen view opened from an icon trigger holds the status row and the results in order and returns focus to the trigger; Enter in the input emits submit and keeps the view open while it shows a result or a status row, and closes it when it shows neither', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await mountSite(page, [site('f', { bar: 'icon', presentation: 'full-screen' }), site('e', { statusText: '' }, []), site('st', { statusText: 'No results for tokne' }, [])]);
    const f = host(page, 'f');
    const button = f.locator('tanrei-button.trigger-icon button');
    await button.click();
    await expect(headerInput(page, 'f')).toBeFocused();
    expect(await bounds(dialog(page, 'f'))).toEqual({ x: 0, y: 0, width: 390, height: 700 });
    const [st, first] = [await bounds(statusRow(page, 'f')), await bounds(heading(page, 'f', '/tokens/'))];
    expect(st.y).toBeGreaterThan((await bounds(f.locator('.divider'))).y);
    expect(first.y).toBeGreaterThan(st.y);
    // Enter with results in the view: submit, and the view stays.
    await wire(f);
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['submit:token']);
    expect(await prop(f, 'expanded')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    // With a status row only ("No results"): it stays too.
    await trigger(page, 'st').click();
    await wire(host(page, 'st'));
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['submit:tokne'.replace('tokne', 'token')]);
    expect(await prop(host(page, 'st'), 'expanded')).toBe(true);
    await page.keyboard.press('Escape');
    // With neither: submit, then it closes (toggle follows submit).
    await trigger(page, 'e').click();
    await wire(host(page, 'e'));
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['submit:token', 'toggle:false:submit:false']);
    await expect(trigger(page, 'e')).toBeFocused();
  });

  test('SRC-27: an unknown bar is drawn as the field and an unknown status as idle, and a result with an empty headline, an empty or repeated value, or a group that holds anything but results is still rendered — each reported in a debug build', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        {
          id: 'odd',
          props: { label: 'Search', bar: 'pill', status: 'thinking', statusText: 'Thinking', expanded: true },
          items: [
            suggestion('a'),
            { kind: 'result', props: { value: 'a', headline: 'Repeats a suggestion', href: '/a' } },
            { kind: 'result', props: { value: '', headline: 'No value', href: '/b' } },
            { kind: 'result', props: { value: 'c', headline: '', href: '/c' } },
            { kind: 'result-group', props: { headline: 'Linked', href: '/g/' }, items: [{ kind: 'result', props: { value: 'c', headline: 'Repeats c', href: '/g/#c' } }] },
          ],
        },
      ],
    });
    const s = host(page, 'odd');
    await s.evaluate((el) => el.querySelector('tanrei-search-result-group')!.insertAdjacentHTML('beforeend', '<tanrei-search-result-group headline="Nested"></tanrei-search-result-group>'));
    await expect(bar(page, 'odd')).toBeVisible();
    await expect(s.locator('.trigger')).toHaveCount(0);
    await expect(view(page, 'odd')).toBeVisible();
    // Idle: the text is drawn in the status region and no indicator.
    await expect(s.locator('.status [role="status"]')).toHaveText('Thinking');
    await expect(s.locator('.status tanrei-loading-indicator')).toHaveCount(0);
    await expect(s.locator('tanrei-search-result .row')).toHaveCount(4);
    const text = () => seen.filter((w) => w.includes('SRC-27')).join('\n');
    for (const fragment of ['bar "pill"', 'status "thinking"', 'the value "a" of the result "Repeats a suggestion" repeats', 'the result "No value" has an empty value', 'the result "c" has an empty headline', 'the linked group heading "Linked" has an empty value', 'the value "c" of the result "Repeats c" repeats', 'holds <tanrei-search-result-group>']) {
      await expect.poll(text, fragment).toContain(fragment);
    }
  });
});

test.describe('site search: reach and cost', () => {
  test('SRC-40: with Tab and Enter alone — no Escape, no pointer, as switch access scans — the dialog view can be left: the back button is a stop among the input, the clear button and the links, Enter or Space on it closes the view with the reason back, and focus returns to the trigger', async ({ page }) => {
    await mountSite(page, [site('s')]);
    const s = host(page, 's');
    await tabTo(page, trigger(page, 's'));
    await page.keyboard.press('Enter');
    await expect(headerInput(page, 's')).toBeFocused();
    await wire(s);
    const stops = new Set<string>();
    for (let presses = 0; presses < 14; presses++) {
      await tab(page);
      stops.add((await focused(page)) ?? '');
    }
    // The stops are the input, the back and clear buttons and the links: two Buttons now, where there was one.
    expect([...stops].sort()).toEqual(['a@search-result-group:/tokens/', 'a@search-result:/components/button/', 'a@search-result:/tokens/#layers', 'a@search-result:/tokens/#pipeline', 'button@tanrei-button:', 'input@search:token'].sort());
    const back = s.locator('.header .back button');
    await expect(back).toHaveAccessibleName('Back');
    // Enter in the input submits and — the view showing results — keeps it open: that is not the way out.
    await tabTo(page, headerInput(page, 's'));
    await page.keyboard.press('Enter');
    expect(await prop(s, 'expanded')).toBe(true);
    expect(await toggles(page)).toEqual([]);
    // The way out that goes nowhere: Tab to the back button, Enter. The view closes with the reason back and focus is on the trigger.
    await tabTo(page, back);
    await page.keyboard.press('Enter');
    expect(await prop(s, 'expanded')).toBe(false);
    expect(await toggles(page)).toEqual(['toggle:false:back:false']);
    await expect(trigger(page, 's')).toBeFocused();
    // Space does the same, and so does the back button of a view that shows nothing but its header.
    await page.keyboard.press('Enter');
    await expect(headerInput(page, 's')).toBeFocused();
    await tabTo(page, back);
    await page.keyboard.press('Space');
    expect(await prop(s, 'expanded')).toBe(false);
    await expect(trigger(page, 's')).toBeFocused();
    // An empty backLabel still draws the button, and is reported while the dialog view is open (SRC-11).
    const seen = warnings(page);
    await mountSite(page, [site('n', { backLabel: '' })]);
    await tabTo(page, trigger(page, 'n'));
    await page.keyboard.press('Enter');
    await expect(headerInput(page, 'n')).toBeFocused();
    await expect(host(page, 'n').locator('.header .back')).toHaveCount(1);
    await expect.poll(() => seen.some((w) => w.includes('SRC-11'))).toBe(true);
  });

  test('SRC-11: the back button of a dialog view that is not open has no name to miss — the spec’s fixtures report nothing of a Button without a name when they are loaded; opened with an empty backLabel, the search reports it once, as its own (SRC-11), and the button is exposed', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec);
    await page.waitForTimeout(500);
    expect(seen.filter((w) => w.includes('BTN-16'))).toEqual([]);
    expect(seen.filter((w) => w.includes('SRC-11'))).toEqual([]);
    const back = host(page, 'trigger').locator('.header .back');
    expect(await back.getAttribute('aria-hidden'), 'not open: kept from assistive technology with its dialog').toBe('true');
    await tabTo(page, trigger(page, 'trigger'));
    await page.keyboard.press('Enter');
    await expect(headerInput(page, 'trigger')).toBeFocused();
    expect(await back.getAttribute('aria-hidden'), 'open: exposed').toBeNull();
    await expect.poll(() => seen.filter((w) => w.includes('SRC-11')).length).toBe(1);
    expect(seen.filter((w) => w.includes('BTN-16'))).toEqual([]);
  });

  test('SRC-42, SRC-45: a page of 100 results in 20 groups is drawn without a listener, an observer or a timer of its own per result — the search answers every row from the listeners it already has', async ({ page }, testInfo) => {
    await mountSite(page, [site('s', { expanded: true }, [])]);
    const measured = await host(page, 's').evaluate(async (el: any) => {
      const count = () => {
        let nodes = 0;
        let elements = 0;
        const visit = (root: Node) => {
          for (const node of root.childNodes) {
            nodes += 1;
            if (node instanceof Element) {
              elements += 1;
              if (node.shadowRoot) visit(node.shadowRoot);
            }
            visit(node);
          }
        };
        visit(el);
        visit(el.shadowRoot);
        return { nodes, elements };
      };
      let listeners = 0;
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (this: EventTarget, ...rest: Parameters<typeof add>) {
        listeners += 1;
        return add.apply(this, rest);
      };
      const observers = { mutation: 0, resize: 0 };
      const [observe, resize] = [MutationObserver.prototype.observe, ResizeObserver.prototype.observe];
      MutationObserver.prototype.observe = function (this: MutationObserver, ...rest: Parameters<typeof observe>) {
        observers.mutation += 1;
        return observe.apply(this, rest);
      };
      ResizeObserver.prototype.observe = function (this: ResizeObserver, ...rest: Parameters<typeof resize>) {
        observers.resize += 1;
        return resize.apply(this, rest);
      };
      const markup = Array.from(
        { length: 20 },
        (_, g) =>
          `<tanrei-search-result-group value="/page-${g}/" headline="Page ${g}" href="/page-${g}/" leading-icon="article">A page about <mark>tokens</mark> and other things.${Array.from(
            { length: 4 },
            (_, r) => `<tanrei-search-result value="/page-${g}/#s${r}" headline="Section ${r}" href="/page-${g}/#s${r}" leading-icon="tag">The section says that a <mark>token</mark> is a decision with a name, in ${r + 1} parts.</tanrei-search-result>`,
          ).join('')}</tanrei-search-result-group>`,
      ).join('');
      const before = count();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const start = performance.now();
      el.insertAdjacentHTML('beforeend', markup);
      el.statusText = '100 results for token';
      await el.updateComplete;
      await Promise.all([...el.querySelectorAll('tanrei-search-result, tanrei-search-result-group')].map((item: any) => item.updateComplete));
      await el.updateComplete;
      const scripted = performance.now() - start;
      el.getBoundingClientRect();
      const laidOut = performance.now() - start;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const painted = performance.now() - start;
      const after = count();
      const rows = el.querySelectorAll('tanrei-search-result, tanrei-search-result-group').length;
      const links = [...el.querySelectorAll('tanrei-search-result, tanrei-search-result-group')].filter((item: any) => item.shadowRoot.querySelector('a[href]')).length;
      EventTarget.prototype.addEventListener = add;
      MutationObserver.prototype.observe = observe;
      ResizeObserver.prototype.observe = resize;
      return { rows, links, listeners, observers, scripted: Math.round(scripted), laidOut: Math.round(laidOut), painted: Math.round(painted), nodes: after.nodes - before.nodes, elements: after.elements - before.elements };
    });
    // The numbers, for the report.
    testInfo.annotations.push({ type: 'measure', description: JSON.stringify(measured) });
    console.log(`[search] 100 results in 20 groups (${testInfo.project.name}): ${JSON.stringify(measured)}`);
    expect([measured.rows, measured.links]).toEqual([100, 100]);
    // No listener per row: what is added while a hundred rows arrive does not grow with them.
    expect(measured.listeners).toBeLessThan(10);
    expect(measured.observers).toEqual({ mutation: 0, resize: 0 });
    // And every row answers: the arrows reach the hundredth, and a press on it is one select.
    const s = host(page, 's');
    await wire(s);
    await headerInput(page, 's').focus();
    for (let presses = 0; presses < 100; presses++) await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('a@search-result:/page-19/#s3');
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['select:/page-19/#s3', 'toggle:false:select:false']);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, reducedMotion: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
