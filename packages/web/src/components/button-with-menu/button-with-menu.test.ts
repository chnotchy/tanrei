import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { atRatio, shoot, stageBehind } from '../../../test/one-shape.js';
import { expectKeyPressOutlastsPointer } from '../../../test/key-press-pointer-leaves.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { decodePng, paintedColor } from '../../../test/png.js';
import { readSeam } from '../../../test/seam.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('button-with-menu');
type P = Page;
const T = (name: string) => `--tanrei-comp-button-with-menu-${name}`;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-button-with-menu`);
const leading = (page: P, id: string) => host(page, id).locator('button.leading');
const trailing = (page: P, id: string) => host(page, id).locator('button.trailing');
/**
 * Every half has measured its box. The size the cut of its shadows at the seam counts from is written by an observer of
 * sizes (`--_box-width`, `--_box-height`: src/primitives/group-item.ts), in the frame after the box changed — and a box
 * changes when its label's face arrives, which is when a mount returns: a reading or a picture made at once can find
 * the cut some pixels short of the seam, one frame before it is drawn there (as the button group's items were found).
 */
const measured = (page: P) =>
  page.waitForFunction(() =>
    [...document.querySelectorAll('.stage tanrei-button-with-menu')].every((element) =>
      [...element.shadowRoot!.querySelectorAll<HTMLElement>('button.leading, button.trailing')].every((half) => {
        const used = getComputedStyle(half);
        return (['width', 'height'] as const).every((side) => Math.abs(Number.parseFloat(half.style.getPropertyValue(`--_box-${side}`)) - Number.parseFloat(used[side])) < 0.01);
      }),
    ),
  );
const surface = (page: P, id: string) => host(page, id).locator('tanrei-menu').locator('.surface');
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const css = (page: P, id: string, half: 'leading' | 'trailing', property: string, pseudo?: string) =>
  host(page, id)
    .locator(`button.${half}`)
    .evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
/**
 * The shadows a half draws — its outline's ring, then its elevation: they are its `::after`'s, a box of the half's
 * shape that is cut at the seam, while the half's own box paints the fill alone (src/primitives/group-item.ts). A half
 * with keyboard focus draws them itself: its `::after` is then the focus ring.
 */
const shadows = (page: P, id: string, half: 'leading' | 'trailing') => css(page, id, half, 'box-shadow', '::after');
/** An element's box. A half's box is what is seen of it: it ends at the seam (src/primitives/group-item.ts). */
const bounds = (locator: import('@playwright/test').Locator) =>
  locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { x: box.left, y: box.top, width: box.width, height: box.height };
  });
/** The fixtures whose separation is gap, by the spec's own ids, and the rest (auto, or divider: divider under the default system). */
const GAP = spec.fixtures.filter((f) => f.props.separation === 'gap').map((f) => f.id);
/** A duration or easing token as the browser computes it on a real property. */
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);

const ITEMS = '<tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item><tanrei-menu-item slot="menu" label="Save a copy"></tanrei-menu-item>';
const fixture = (id: string, props: Fixture['props'] = {}, content?: string): Fixture => ({ id, props: { label: 'Save', menuLabel: 'More save options', ...props }, ...(content === undefined ? {} : { content }) });
/** A button with menu with a menu: two actions, as a product fills the menu slot. */
const withMenu = (id: string, props: Fixture['props'] = {}, content = ITEMS) => fixture(id, props, content);

/**
 * The product's side, as the docs page writes it: it sets open from toggle and to false from close. Everything the
 * element and its items emit is logged in order, in the page.
 */
async function wire(page: P, { product = true }: { product?: boolean } = {}) {
  await page.evaluate((drive) => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-button-with-menu')) {
      const split = el as HTMLElement & { open: boolean };
      split.addEventListener('click', () => log.push('click'));
      split.addEventListener('toggle', (e) => {
        log.push(`toggle:${(e as CustomEvent).detail.open}`);
        if (drive) split.open = (e as CustomEvent).detail.open;
      });
      split.addEventListener('close', (e) => {
        log.push(`close:${(e as CustomEvent).detail.reason}`);
        if (drive) split.open = false;
      });
      for (const item of split.querySelectorAll('tanrei-menu-item')) item.addEventListener('click', () => log.push(`item:${item.getAttribute('label')}`));
    }
  }, product);
}
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('tanrei-button-with-menu')) seen.push(message.text());
  });
  return seen;
};
const menuOpen = (page: P, id: string) => surface(page, id).evaluate((el) => el.matches(':popover-open'));
/** The element focus is on, through shadow roots. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active ? `${active.localName}${active.className ? `.${String(active.className).split(' ')[0]}` : ''}${active.getAttribute('label') ? `[${active.getAttribute('label')}]` : ''}` : null;
  });

test.beforeEach(async ({ page }) => {
  await mountFixtures(page, spec, { icons: true });
});

test.describe('behavior', () => {
  test('SPB-1: pointer, Enter and Space on the leading half each emit click exactly once, and never open or close the menu', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('menu')] });
    await wire(page);
    await leading(page, 'menu').click();
    expect(await log(page)).toEqual(['click']);
    await leading(page, 'menu').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await log(page)).toEqual(['click', 'click', 'click']);
    expect(await host(page, 'menu').evaluate((el) => (el as HTMLElement & { open: boolean }).open)).toBe(false);
    expect(await menuOpen(page, 'menu')).toBe(false);
    // element.click() is the leading half's activation.
    await host(page, 'menu').evaluate((el) => (el as HTMLElement).click());
    expect(await log(page)).toEqual(['click', 'click', 'click', 'click']);
  });

  test('SPB-2: pointer, Enter and Space on the trailing half emit toggle once with the opposite of open; Down Arrow asks to open a closed menu; the product opens it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('menu'), fixture('asks')] });
    await wire(page);
    await trailing(page, 'menu').click();
    expect(await log(page)).toEqual(['toggle:true']);
    await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
    await trailing(page, 'menu').click();
    // A press on the trailing half while open is the trailing half's, not a press outside (SPB-16): no close.
    expect(await log(page)).toEqual(['toggle:true', 'toggle:false']);
    await expect.poll(() => menuOpen(page, 'menu')).toBe(false);

    // The keys, on a button with menu whose product only listens: each asks once for the opposite of open.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('asks')] });
    await wire(page, { product: false });
    await trailing(page, 'asks').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'toggle:true']);
    await host(page, 'asks').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown'); // open already: nothing to ask
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'toggle:true', 'toggle:false']);
    // Down Arrow does not scroll the page.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('SPB-3: a disabled button with menu emits no click, toggle or close, takes no focus, exposes disabled on both halves and presents no menu, whatever open says', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('off', { disabled: true, open: true })] });
    await wire(page);
    await leading(page, 'off').click({ force: true });
    await trailing(page, 'off').click({ force: true });
    await host(page, 'off').evaluate((el) => (el as HTMLElement).click());
    await host(page, 'off').evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await leading(page, 'off').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual([]);
    await expect(leading(page, 'off')).toBeDisabled();
    await expect(trailing(page, 'off')).toBeDisabled();
    await expect(host(page, 'off').getByRole('button', { disabled: true })).toHaveCount(2);
    expect(await focused(page)).not.toMatch(/^button/);
    expect(await menuOpen(page, 'off')).toBe(false);
    await expect(trailing(page, 'off')).toHaveAttribute('aria-expanded', 'false');
    // Never opens on hover, whatever hoverOpen says.
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('off-hover', { disabled: true, hoverOpen: true, hoverDelay: 50 })] });
    await wire(page);
    await trailing(page, 'off-hover').hover({ force: true });
    await page.waitForTimeout(300);
    expect(await log(page)).toEqual([]);
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('off', { disabled: true, open: true })] });
    // Enabled again, open as it was: the menu is presented.
    await host(page, 'off').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(() => menuOpen(page, 'off')).toBe(true);
  });

  test('SPB-4: under acme, each half renders its own state — pressed over focused over hovered — and the other half stays at its own; pointer focus is not focused', async ({ page }) => {
    test.setTimeout(120_000);
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    const bg = (half: 'leading' | 'trailing') => () => css(page, 'filled-medium', half, 'background-color');
    const [rest, hovered, focusedColor, pressed] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`filled-${s}container-color`))));
    expect(new Set([rest, hovered, focusedColor, pressed]).size).toBe(4);

    await leading(page, 'filled-medium').hover();
    await expect.poll(bg('leading')).toBe(hovered);
    expect(await bg('trailing')()).toBe(rest);
    await trailing(page, 'filled-medium').hover();
    await expect.poll(bg('trailing')).toBe(hovered);
    await expect.poll(bg('leading')).toBe(rest);
    await page.mouse.down(); // hovered AND pressed: pressed wins, on this half only
    await expect.poll(bg('trailing')).toBe(pressed);
    expect(await bg('leading')()).toBe(rest);
    await page.mouse.up();
    // Focus the pointer gave is not the focused state.
    await page.mouse.move(1, 1);
    await expect.poll(bg('trailing')).toBe(rest);

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, leading(page, 'filled-medium'));
    await expect.poll(bg('leading')).toBe(focusedColor);
    expect(await bg('trailing')()).toBe(rest);
    await leading(page, 'filled-medium').hover(); // hovered AND focused: focused wins
    await expect.poll(bg('leading')).toBe(focusedColor);
    await page.keyboard.down('Enter'); // and pressed over both
    await expect.poll(bg('leading')).toBe(pressed);
    await page.keyboard.up('Enter');
    // The label follows its half's state too.
    await trailing(page, 'filled-medium').hover();
    await expect.poll(() => css(page, 'filled-medium', 'trailing', 'color')).toBe(await resolveColor(page, T('filled-hovered-label-color')));
  });

  test('SPB-5: keyboard focus shows the ring around that half, at once; pointer focus does not', async ({ page }) => {
    await leading(page, 'filled-medium').click();
    expect(await css(page, 'filled-medium', 'leading', 'outline-style')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, trailing(page, 'filled-medium'));
    expect(await css(page, 'filled-medium', 'trailing', 'outline-style')).toBe('solid');
    expect(await css(page, 'filled-medium', 'trailing', 'outline-width')).toBe(`${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    expect(await css(page, 'filled-medium', 'trailing', 'outline-offset')).toBe(`${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    expect(await css(page, 'filled-medium', 'leading', 'outline-style')).toBe('none');
    expect(await css(page, 'filled-medium', 'trailing', 'transition-property')).not.toContain('outline');
    // The ring's corners follow the half's own: its inner corners tighter than its outer ones.
    const inner = Number.parseFloat(await css(page, 'filled-medium', 'trailing', 'border-top-left-radius', '::after'));
    const outer = Number.parseFloat(await css(page, 'filled-medium', 'trailing', 'border-top-right-radius', '::after'));
    expect(inner).toBeLessThan(outer);
  });

  test('SPB-6: each half’s hit area meets the target above and below and outward, and toward the other half stops at the middle of the gap, or at the seam where they touch; a narrow trailing half reaches its target outward and is not drawn wider', async ({ page }) => {
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const gap = await resolveToken(page, T('container-inner-gap'));
    expect(gap).toBeGreaterThan(0);
    for (const id of ['filled-small', 'filled-medium', 'filled-large', 'filled-gap', 'filled-narrow-small', 'filled-narrow', 'filled-narrow-large', 'outlined-narrow', 'filled-gap-narrow', 'outlined-gap-narrow', 'filled-narrow-open']) {
      // Toward the other half: half the gap under gap, nothing past the seam under divider.
      const between = GAP.includes(id) ? gap / 2 : 0;
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      expect(b.x - (a.x + a.width), id).toBeCloseTo(between * 2, 1);
      const hit = (half: 'leading' | 'trailing') =>
        host(page, id)
          .locator(`button.${half}`)
          .evaluate((el) => {
            const r = getComputedStyle(el, '::before');
            const box = el.getBoundingClientRect();
            return { start: box.left + Number.parseFloat(r.left), end: box.right - Number.parseFloat(r.right), height: Number.parseFloat(r.height) };
          });
      // What of the hit area is the half's: under a divider the clip ends it at the seam — the leading half a hairline
      // past it, under the trailing half, which is on top.
      const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
      const [rawA, rawB] = [await hit('leading'), await hit('trailing')];
      const ha = GAP.includes(id) ? rawA : { ...rawA, end: Math.min(rawA.end, a.x + a.width + hairline) };
      const hb = GAP.includes(id) ? rawB : { ...rawB, start: Math.max(rawB.start, b.x) };
      expect(ha.height, id).toBeGreaterThanOrEqual(target);
      expect(hb.height, id).toBeGreaterThanOrEqual(target);
      // Never over each other: each stops at the middle of the gap, or at the seam (within the hairline by which the
      // leading half reaches under the trailing one, so that no page shows between them; the trailing half is on top).
      expect(ha.end, id).toBeLessThanOrEqual(a.x + a.width + between + (between ? 0.01 : hairline + 0.01));
      expect(hb.start, id).toBeGreaterThanOrEqual(b.x - between - 0.01);
      // Outward, the whole target: what the trailing half cannot reach toward the leading half, it reaches past its end.
      const inward = Math.min(between, Math.max(0, (target - b.width) / 2));
      expect(hb.end - hb.start, id).toBeGreaterThanOrEqual(Math.max(target, b.width) - 0.01);
      expect(hb.end, id).toBeCloseTo(b.x + b.width + Math.max(0, target - b.width - inward), 1);
      expect(ha.start, id).toBeCloseTo(a.x - Math.max(0, target - a.width - Math.min(between, Math.max(0, (target - a.width) / 2))), 1);
    }
    // A narrow trailing half is narrower than the target at every size (32 / 36 / 36 under the default system, its
    // outer padding included) and is drawn at its own width: under a divider it can reach nothing toward the seam, so
    // the whole of what it lacks is past its end edge, and under gap all but half the gap.
    for (const [id, width] of [['filled-narrow-small', 32], ['filled-narrow', 36], ['filled-narrow-large', 36], ['filled-gap-narrow', 36]] as const) {
      const b = await bounds(trailing(page, id));
      expect(b.width, id).toBe(width);
      expect(b.width, id).toBeLessThan(target);
      const past = await trailing(page, id).evaluate((el) => -Number.parseFloat(getComputedStyle(el, '::before').right));
      expect(past, id).toBeCloseTo(target - width - (GAP.includes(id) ? gap / 2 : 0), 1);
    }
    expect((await bounds(trailing(page, 'filled-narrow'))).width).toBeLessThan((await bounds(trailing(page, 'filled-medium'))).width);
    // Right-to-left (filled-narrow-rtl): the end is the left, so the narrow half reaches its target past its left edge
    // and stops at the seam on its right; the leading half reaches past the right edge and stops at the seam too.
    {
      const [a, b] = [await bounds(leading(page, 'filled-narrow-rtl')), await bounds(trailing(page, 'filled-narrow-rtl'))];
      expect(b.x + b.width).toBeCloseTo(a.x, 2);
      const area = (half: 'leading' | 'trailing') =>
        host(page, 'filled-narrow-rtl')
          .locator(`button.${half}`)
          .evaluate((el) => {
            const r = getComputedStyle(el, '::before');
            return { left: -Number.parseFloat(r.left), right: -Number.parseFloat(r.right), height: Number.parseFloat(r.height) };
          });
      const [ha, hb] = [await area('leading'), await area('trailing')];
      expect(hb.left).toBeCloseTo(target - b.width, 1);
      expect(hb.right).toBeCloseTo(0, 1);
      expect(ha.left).toBeCloseTo(0, 1);
      expect(ha.right).toBeCloseTo(Math.max(0, target - a.width), 1);
      expect(hb.height).toBeGreaterThanOrEqual(target);
    }
    // A press just outside the visual bounds, inside the target, is the half's. (Every stage in the window: the pointer
    // reaches what the window shows.)
    await page.setViewportSize({ width: 1280, height: 4800 });
    await wire(page, { product: false });
    for (const id of ['filled-small', 'filled-narrow']) {
      const b = await bounds(trailing(page, id));
      await page.mouse.click(b.x + b.width / 2, b.y - 1);
      await page.mouse.click(b.x + b.width + Math.max(1, target - b.width - 1), b.y + b.height / 2);
      const a = await bounds(leading(page, id));
      await page.mouse.click(a.x + a.width / 2, a.y + a.height + 1);
      // At the seam each side is its own half's: a press a pixel either side of it.
      await page.mouse.click(a.x + a.width - 1, a.y + a.height / 2);
      await page.mouse.click(b.x + 1, b.y + b.height / 2);
    }
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'click', 'click', 'toggle:true', 'toggle:true', 'toggle:true', 'click', 'click', 'toggle:true']);
  });

  test('SPB-7: disabled renders both halves from the disabled tokens of its variant, in the closed form whatever open says', async ({ page }) => {
    for (const [id, variant] of [['filled-disabled', 'filled'], ['outlined-disabled', 'outlined']] as const) {
      for (const half of ['leading', 'trailing'] as const) {
        expect(await css(page, id, half, 'background-color')).toBe(await resolveColor(page, T(`${variant}-disabled-container-color`)));
        expect(await css(page, id, half, 'color')).toBe(await resolveColor(page, T(`${variant}-disabled-label-color`)));
        expect(await css(page, id, half, 'opacity')).toBe(await token(page, T('disabled-opacity')));
      }
    }
    // The outlined one keeps a faded, visible border.
    expect(await shadows(page, 'outlined-disabled', 'trailing')).toContain(await resolveColor(page, T('outlined-disabled-outline-color')));
    const glyphs = '<span slot="chevron">more_vert</span><span slot="chevron-open">close</span>';
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('off-open', { disabled: true, open: true }), fixture('closed'), fixture('off-open-slots', { disabled: true, open: true }, glyphs), fixture('closed-slots', {}, glyphs)],
    });
    const form = (id: string) =>
      trailing(page, id).evaluate((el) => ({
        open: el.classList.contains('open'),
        turn: getComputedStyle(el.querySelector('.turn')!).transform,
        closedGlyph: getComputedStyle(el.querySelector('.turn')!).opacity,
        corner: getComputedStyle(el).borderTopLeftRadius,
      }));
    expect(await form('off-open')).toEqual(await form('closed'));
    expect((await form('off-open')).open).toBe(false);
    // The closed chevron: expand_more, or the chevron slot's glyph, unturned.
    expect(await form('off-open-slots')).toEqual(await form('closed-slots'));
    expect(await form('off-open-slots')).toMatchObject({ turn: 'none', closedGlyph: '1' });
  });

  test('SPB-8: a variant or size the active design system does not have renders as the default, a separation or a trailingWidth it does not define as that prop’s default, and a debug build reports each', async ({ page }) => {
    const seen = reports(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('plain'), fixture('odd-variant', { variant: 'sparkly' }), fixture('odd-size', { size: 'colossal' }), fixture('odd-separation', { separation: 'zipper' }), fixture('odd-width', { trailingWidth: 'enormous' })],
    });
    expect(await css(page, 'odd-variant', 'leading', 'background-color')).toBe(await css(page, 'plain', 'leading', 'background-color'));
    expect((await bounds(leading(page, 'odd-size'))).height).toBe((await bounds(leading(page, 'plain'))).height);
    // An unknown separation is auto, an unknown trailing width the default one: each draws as the plain one does.
    for (const id of ['odd-separation', 'odd-width']) {
      const [drawn, plain] = [await Promise.all([bounds(leading(page, id)), bounds(trailing(page, id))]), await Promise.all([bounds(leading(page, 'plain')), bounds(trailing(page, 'plain'))])];
      expect(drawn.map((box) => box.width), id).toEqual(plain.map((box) => box.width));
      expect(drawn[1].x - drawn[0].x - drawn[0].width, id).toBeCloseTo(plain[1].x - plain[0].x - plain[0].width, 2);
      expect(await css(page, id, 'trailing', 'border-top-left-radius'), id).toBe(await css(page, 'plain', 'trailing', 'border-top-left-radius'));
    }
    await expect.poll(() => seen.filter((text) => text.includes('SPB-8')).length).toBe(4);
    expect(seen.join('\n')).toMatch(/variant "sparkly" is not a value of the active design system; it is drawn as "filled" \(SPB-8\)/);
    expect(seen.join('\n')).toMatch(/size "colossal" is not a value of the active design system; it is drawn as "medium" \(SPB-8\)/);
    expect(seen.join('\n')).toMatch(/separation "zipper" is not a value of the button with menu; it is drawn as "auto" \(SPB-8\)/);
    expect(seen.join('\n')).toMatch(/trailingWidth "enormous" is not a value of the button with menu; it is drawn as "default" \(SPB-8\)/);
  });

  test('SPB-9: a press on either half that ends within a frame is shown at once and for at least press-hold', async ({ page }) => {
    expect(await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration')).toBe(100);
    const hold = 1000;
    for (const [half, activate] of [
      ['leading', async () => leading(page, 'filled-medium').click()],
      ['trailing', async () => page.keyboard.press('Enter')],
      ['trailing', async () => trailing(page, 'filled-medium').click()],
    ] as const) {
      await mountFixtures(page, spec, { icons: true });
      await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await host(page, 'filled-medium').locator(`button.${half}`).focus();
      await host(page, 'filled-medium')
        .locator(`button.${half}`)
        .evaluate((el) => {
          const record: { down?: number; on?: number; off?: number; seen?: string[] } = ((window as any).press = {});
          new MutationObserver(() => {
            if (el.hasAttribute('data-pressed')) {
              record.on ??= performance.now();
              record.seen ??= [el.getAttribute('data-pressed')!, getComputedStyle(el).transitionDuration.split(',')[0]];
            } else if (record.on !== undefined) record.off ??= performance.now();
          }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
          for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (record.down ??= performance.now()), true);
        });
      await activate();
      await expect.poll(() => page.evaluate(() => (window as any).press.off), half).toBeDefined();
      const record = await page.evaluate(() => (window as any).press);
      expect(record.seen, half).toEqual(['overlay', '0s']);
      expect(record.off - record.down, half).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('SPB-9: the trailing half pressed by Space stays pressed while the key is down, though the pointer resting over it leaves; the keyup ends it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await expectKeyPressOutlastsPointer(page, { control: trailing(page, 'filled-medium') });
  });

  test('SPB-10: overlay (default), ripple (m3-like), dim (cupertino) and none each answer a press on a half; an unknown name is the first', async ({ page }) => {
    const pressedAttr = (half: 'leading' | 'trailing') => host(page, 'filled-medium').locator(`button.${half}`).getAttribute('data-pressed');
    const ripple = (half: 'leading' | 'trailing') => host(page, 'filled-medium').locator(`button.${half} .ripple`);
    // overlay: the pressed tokens on the whole half at once, no layer.
    await trailing(page, 'filled-medium').hover();
    await page.mouse.down();
    expect(await pressedAttr('trailing')).toBe('overlay');
    expect(await css(page, 'filled-medium', 'trailing', 'background-color')).toBe(await resolveColor(page, T('filled-pressed-container-color')));
    expect(await ripple('trailing').count()).toBe(0);
    await page.mouse.up();

    // ripple: from the point of contact, in the pressed color, clipped to the half; the container stays hovered.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    const b = await bounds(trailing(page, 'filled-medium'));
    // Firefox and WebKit put the pointer on a whole pixel: aim at one, and expect the layer where the pointer landed.
    const at = { x: Math.round(b.x + 8), y: Math.round(b.y + 10) };
    await page.mouse.move(at.x, at.y);
    const hovered = await resolveColor(page, T('filled-hovered-container-color'));
    await expect.poll(() => css(page, 'filled-medium', 'trailing', 'background-color')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, 'filled-medium'));
    await page.mouse.down();
    expect(await pressedAttr('trailing')).toBe('ripple');
    await expect(ripple('trailing')).toHaveCount(1);
    const layer = await ripple('trailing').evaluate((el) => {
      const own = el.getBoundingClientRect();
      const half = el.parentElement!.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - half.left,
        y: Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - half.top,
        color: s.backgroundColor,
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
        end: s.borderTopRightRadius,
        start: s.borderTopLeftRadius,
      };
    });
    expect(layer.x).toBeCloseTo(at.x - b.x, 0);
    expect(layer.y).toBeCloseTo(at.y - b.y, 0);
    expect(layer.color).toBe(await resolveColor(page, T('filled-pressed-container-color')));
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    // Clipped to the half's own shape: a round outer end, a tight inner corner.
    expect(Number.parseFloat(layer.end)).toBeGreaterThan(Number.parseFloat(layer.start));
    expect(await css(page, 'filled-medium', 'trailing', 'background-color')).toBe(hovered);
    expect(await ripple('leading').count()).toBe(0);
    await page.mouse.up();
    await expect(ripple('trailing')).toHaveCount(0);
    // From the center for the keyboard.
    await leading(page, 'filled-medium').focus();
    await page.keyboard.down('Enter');
    const center = await ripple('leading').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await expect(ripple('leading')).toHaveCount(0);
    // Reduced motion: the whole layer at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await ripple('leading').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.keyboard.up('Enter');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // dim: the pressed opacity on the whole half, no layer; only the container color stays with the state under the press.
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    await rootTokens(page, { '--tanrei-comp-button-with-menu-filled-pressed-label-color': 'rgb(0, 0, 255)' });
    const resting = await css(page, 'filled-medium', 'leading', 'background-color');
    await leading(page, 'filled-medium').hover();
    await page.mouse.down();
    expect(await pressedAttr('leading')).toBe('dim');
    expect(await css(page, 'filled-medium', 'leading', 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(page, 'filled-medium', 'leading', 'opacity'))).toBeLessThan(1);
    expect(await css(page, 'filled-medium', 'leading', 'background-color')).toBe(resting);
    expect(await css(page, 'filled-medium', 'leading', 'color')).toBe('rgb(0, 0, 255)');
    expect(await css(page, 'filled-medium', 'trailing', 'opacity')).toBe('1');
    await page.mouse.up();

    // none: nothing changes; an unknown name is overlay.
    await mountFixtures(page, spec, { icons: true });
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await leading(page, 'filled-medium').hover();
    await expect.poll(() => css(page, 'filled-medium', 'leading', 'background-color')).toBe(await resolveColor(page, T('filled-hovered-container-color')));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, 'filled-medium'));
    const before = await css(page, 'filled-medium', 'leading', 'background-color');
    await page.mouse.down();
    expect(await pressedAttr('leading')).toBe('none');
    expect(await css(page, 'filled-medium', 'leading', 'background-color')).toBe(before);
    await page.mouse.up();
    await rootTokens(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressedAttr('leading')).toBe('overlay');
    await page.mouse.up();
  });

  test('SPB-11 corner smoothing and focus-style: cupertino eases each half’s corners, the ring concentric; acme shows keyboard focus as a glow', async ({ page }) => {
    test.setTimeout(120_000);
    expect(await css(page, 'filled-medium', 'leading', 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback' });
    // Capped at half the half's height (SPB-13) before it is eased.
    const outer = Math.min(await resolveToken(page, T('container-shape')), (await bounds(leading(page, 'filled-medium'))).height / 2);
    if (supported) {
      for (const half of ['leading', 'trailing'] as const) {
        expect(Number.parseFloat((await css(page, 'filled-medium', half, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, '')), half).toBeCloseTo(Math.log2(2.6), 3);
      }
      expect(Number.parseFloat(await css(page, 'filled-medium', 'leading', 'border-top-left-radius'))).toBeCloseTo(outer * 1.24, 2);
      await tabTo(page, trailing(page, 'filled-medium'));
      expect(await css(page, 'filled-medium', 'trailing', 'corner-top-left-shape', '::after')).toBe(await css(page, 'filled-medium', 'trailing', 'corner-top-left-shape'));
    } else {
      expect(Number.parseFloat(await css(page, 'filled-medium', 'leading', 'border-top-left-radius'))).toBe(outer);
    }

    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await tabTo(page, trailing(page, 'filled-medium'));
    expect(await trailing(page, 'filled-medium').getAttribute('data-focus-style')).toBe('glow');
    expect(await css(page, 'filled-medium', 'trailing', 'box-shadow', '::after')).not.toBe('none');
    expect(await css(page, 'filled-medium', 'trailing', 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    // The half without focus draws no halo: its ::after is its own shadows' box, under its content.
    expect(await css(page, 'filled-medium', 'leading', 'z-index', '::after')).toBe('-1');
    expect(await shadows(page, 'filled-medium', 'leading')).not.toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
  });

  test('SPB-12: one row, never stacked: the leading half at its size’s height, padded by its tokens (the with-icon start with an icon), icon and label gap apart; the trailing half as tall, the chevron between its paddings — the narrow ones while narrow; each then takes the outer padding of SPB-32, a narrow trailing half too; start-aligned and centred on the stage', async ({ page }) => {
    const outer = await resolveToken(page, T('container-outer-inset'));
    /** How far a part is from the left and right of what is seen of its half. */
    const insets = async (id: string, half: 'leading' | 'trailing', part: string) => {
      const [box, own] = [await bounds(host(page, id).locator(`button.${half}`)), await bounds(host(page, id).locator(part))];
      return { left: Math.round((own.x - box.x) * 100) / 100, right: Math.round((box.x + box.width - own.x - own.width) * 100) / 100 };
    };
    /** A narrow icon-only Button of a size, drawn on the same page: how wide its container is. */
    const narrowButton = (size: string) =>
      page.evaluate(async (s) => {
        const button = document.createElement('tanrei-button') as HTMLElement & { updateComplete: Promise<unknown> };
        for (const [name, value] of [['size', s], ['width', 'narrow'], ['label', 'Favorite']]) button.setAttribute(name, value);
        button.innerHTML = '<span slot="icon">favorite</span>';
        document.querySelector('main')!.append(button);
        await button.updateComplete;
        const width = button.shadowRoot!.querySelector('button')!.getBoundingClientRect().width;
        button.remove();
        return width;
      }, size);
    for (const size of ['small', 'medium', 'large'] as const) {
      const id = `filled-${size}`;
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      expect(a.height, id).toBe(await resolveToken(page, T(`container-height-${size}`)));
      expect(b.height, id).toBe(a.height);
      expect(b.y, id).toBe(a.y);
      // The leading half: the label between its start padding — and the outer padding (SPB-32) — and its end padding.
      const label = await insets(id, 'leading', '.label');
      expect(label.left, id).toBeCloseTo((await resolveToken(page, T(`leading-padding-inline-start-${size}`))) + outer, 1);
      expect(label.right, id).toBeCloseTo(await resolveToken(page, T(`leading-padding-inline-end-${size}`)), 1);
      expect(await css(page, id, 'leading', 'padding-top'), id).toBe(`${await resolveToken(page, T(`container-padding-block-${size}`))}px`);
      // The trailing half: the chevron between trailing.padding-inline on each side, then the outer padding at its end.
      const pad = await resolveToken(page, T(`trailing-padding-inline-${size}`));
      const chevron = await insets(id, 'trailing', '.turn .chevron');
      expect(chevron.left, id).toBeCloseTo(pad, 1);
      expect(chevron.right, id).toBeCloseTo(pad + outer, 1);
      const icon = await resolveToken(page, T(`icon-size-${size}`));
      expect((await bounds(host(page, id).locator('.turn .chevron'))).width, id).toBe(icon);
      // SPB-12's verify: under the default system the chevron is held in a square of the height, 4 wider for the outer padding.
      expect(b.width - outer, id).toBeCloseTo(b.height, 1);
      // Narrow: between trailing.padding-inline-narrow, then the outer padding at its end (SPB-32) — 32 / 36 / 36 in
      // the default system: the chevron, 4 on each side and 4 more at the end. It reads its own token, and where that
      // agrees with the Button's, as here, the half is a narrow icon-only Button of its size (BTN-12) and the outer padding.
      const narrow = `filled-narrow${size === 'medium' ? '' : `-${size}`}`;
      const narrowPad = await resolveToken(page, T(`trailing-padding-inline-narrow-${size}`));
      expect(narrowPad, narrow).toBeLessThan(pad);
      const slim = await insets(narrow, 'trailing', '.turn .chevron');
      expect(slim.left, narrow).toBeCloseTo(narrowPad, 1);
      expect(slim.right, narrow).toBeCloseTo(narrowPad + outer, 1);
      const slimBox = await bounds(trailing(page, narrow));
      expect(slimBox.width, narrow).toBeCloseTo(icon + 2 * narrowPad + outer, 1);
      expect(slimBox.width, narrow).toBe({ small: 32, medium: 36, large: 36 }[size]);
      expect(slimBox.width - outer, `${narrow}: a narrow icon-only Button's width, by its tokens, and the outer padding`).toBe(
        (await resolveToken(page, `--tanrei-comp-button-icon-size-without-label-${size}`)) + 2 * (await resolveToken(page, `--tanrei-comp-button-container-padding-inline-narrow-${size}`)),
      );
      expect(slimBox.width - outer, `${narrow}: and as a narrow icon-only Button is drawn`).toBe(await narrowButton(size));
      expect(slimBox.height, narrow).toBe(b.height);
      // The leading half is the same at either trailing width.
      expect((await bounds(leading(page, narrow))).width, narrow).toBeCloseTo(a.width, 1);
      // With an icon: the icon-side start padding (a step tighter in the default system, as Button's), before the outer padding.
      const withIcon = `filled-icon${size === 'medium' ? '' : `-${size}`}`;
      const startIcon = await resolveToken(page, T(`leading-padding-inline-start-with-icon-${size}`));
      expect(startIcon, withIcon).toBeLessThan(await resolveToken(page, T(`leading-padding-inline-start-${size}`)));
      expect(startIcon, withIcon).toBe(await resolveToken(page, `--tanrei-comp-button-container-padding-inline-start-with-icon-${size}`));
      expect((await insets(withIcon, 'leading', '.icon')).left, withIcon).toBeCloseTo(startIcon + outer, 1);
    }
    // The with-icon padding is its own token, and no other half reads it.
    await rootTokens(page, { '--tanrei-comp-button-with-menu-leading-padding-inline-start-with-icon-medium': '6px' });
    expect((await insets('filled-icon', 'leading', '.icon')).left).toBeCloseTo(6 + outer, 1);
    expect((await insets('filled-medium', 'leading', '.label')).left).toBeCloseTo((await resolveToken(page, T('leading-padding-inline-start-medium'))) + outer, 1);
    const icon = await bounds(host(page, 'filled-icon').locator('.icon'));
    const label = await bounds(host(page, 'filled-icon').locator('.label'));
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(await resolveToken(page, T('container-gap-medium')), 1);
    // No vertical form: there is no orientation, and an attribute of that name changes nothing.
    const row = await bounds(host(page, 'filled-medium'));
    await host(page, 'filled-medium').evaluate((el) => el.setAttribute('orientation', 'vertical'));
    expect(await bounds(host(page, 'filled-medium'))).toEqual(row);
    expect(await host(page, 'filled-medium').locator('.row').evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
    // The stage: natural width, start-aligned, vertically centred in 320 × 96.
    const stage = await bounds(page.locator('[data-fixture="filled-medium"]'));
    expect(row.x - stage.x).toBe(16);
    expect(row.y + row.height / 2).toBeCloseTo(stage.y + stage.height / 2, 0);
    expect(row.width).toBeLessThan(320);
  });

  test('SPB-13: outer corners from container.shape; under gap the facing corners from inner-shape and the open trailing half’s from inner-shape-open — the same corners in the default system, so the open half keeps its shape; under divider they are square, open or not; the chevron turns over the open motion, at once where reduced', async ({ page }) => {
    // Each capped at half that half's height: the default system's corner.full draws round ends.
    const cap = (await bounds(leading(page, 'filled-medium'))).height / 2;
    const [outer, inner, innerOpen] = (await Promise.all(['container-shape', 'container-inner-shape', 'container-inner-shape-open'].map((name) => resolveToken(page, T(name))))).map((value) => Math.min(value, cap));
    expect(outer).toBe(cap);
    expect(inner).toBe(await resolveToken(page, '--tanrei-sys-shape-corner-small'));
    // The default system: the open corners are the closed ones.
    expect(innerOpen).toBe(inner);
    const radius = async (id: string, half: 'leading' | 'trailing', corner: string) => Number.parseFloat(await css(page, id, half, `border-${corner}-radius`));
    const corners = async (id: string) => ({
      leading: [await radius(id, 'leading', 'top-left'), await radius(id, 'leading', 'bottom-left'), await radius(id, 'leading', 'top-right'), await radius(id, 'leading', 'bottom-right')],
      trailing: [await radius(id, 'trailing', 'top-left'), await radius(id, 'trailing', 'bottom-left'), await radius(id, 'trailing', 'top-right'), await radius(id, 'trailing', 'bottom-right')],
    });
    // Under gap: round outer ends, the inner shape where the halves face each other — closed and open alike.
    for (const id of ['filled-gap', 'filled-gap-open', 'elevated-gap', 'elevated-gap-open']) expect(await corners(id), id).toEqual({ leading: [outer, outer, inner, inner], trailing: [inner, inner, outer, outer] });
    // Under divider: square where they touch — closed and open alike.
    for (const id of ['filled-medium', 'filled-open', 'outlined-open', 'filled-narrow-open', 'filled-divider']) expect(await corners(id), id).toEqual({ leading: [outer, outer, 0, 0], trailing: [0, 0, outer, outer] });
    // The chevron shows the open state.
    const turn = (id: string) => host(page, id).locator('.turn').evaluate((el) => getComputedStyle(el).transform);
    expect(await turn('filled-medium')).toBe('none');
    for (const id of ['filled-open', 'filled-gap-open']) expect(await turn(id), id).toMatch(/^matrix\(-1, [-0-9.e]+, [-0-9.e]+, -1, 0, 0\)$/);
    // The trailing half keeps its shape and its size while the menu is open.
    for (const [closed, open] of [['filled-medium', 'filled-open'], ['filled-gap', 'filled-gap-open'], ['filled-narrow', 'filled-narrow-open']] as const) {
      const [c, o] = [await bounds(trailing(page, closed)), await bounds(trailing(page, open))];
      expect([o.width, o.height], open).toEqual([c.width, c.height]);
    }

    // The change: over comp.button-with-menu.motion.open-duration with open-easing, for the chevron.
    const duration = await resolveToken(page, T('motion-open-duration'), 'duration');
    const curve = await easing(page, T('motion-open-easing'));
    const motion = await host(page, 'filled-gap').locator('.turn').evaluate((el) => {
      const s = getComputedStyle(el);
      return { duration: Number.parseFloat(s.transitionDuration) * 1000, curve: s.transitionTimingFunction.split(/,\s*(?=cubic|ease|linear|steps)/)[0], property: s.transitionProperty };
    });
    expect(motion).toEqual({ duration, curve, property: 'transform, opacity' });
    /** Opens the fixture and samples the update that starts the turn: whether it is turning, and how many corners move. */
    const opening = (id: string) =>
      host(page, id).evaluate(async (el) => {
        const split = el as HTMLElement & { open: boolean; updateComplete: Promise<boolean> };
        split.open = true;
        await split.updateComplete;
        const button = split.shadowRoot!.querySelector('button.trailing')!;
        const radius = () => button.getAnimations().filter((a) => (a as CSSTransition).transitionProperty?.startsWith('border-')).length;
        const turn = split.shadowRoot!.querySelector('.turn')!.getAnimations().length;
        const during = { turning: button.classList.contains('turning'), corners: radius(), chevron: turn };
        await new Promise<void>((resolve) => {
          const check = () => (button.classList.contains('turning') ? requestAnimationFrame(check) : resolve());
          check();
        });
        return { during, after: radius() };
      });
    // The default system: the chevron turns, and no corner moves — the two tokens have one value.
    for (const id of ['filled-gap', 'filled-medium']) {
      const turned = await opening(id);
      expect(turned.during.turning, id).toBe(true);
      expect(turned.during.chevron, id).toBeGreaterThan(0);
      expect(turned.during.corners, id).toBe(0);
      expect(await radius(id, 'trailing', 'top-left'), id).toBe(id === 'filled-gap' ? inner : 0);
    }
    // Nothing else changes a half's shape: no corner of the leading half is ever in a transition.
    expect(await css(page, 'filled-gap', 'leading', 'transition-property')).not.toContain('radius');
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page, 'filled-gap').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await expect(trailing(page, 'filled-gap')).not.toHaveClass(/turning/);
    expect(await host(page, 'filled-gap').locator('.turn').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(await turn('filled-gap')).toBe('none');
  });

  test('SPB-13: a system whose open corners differ (m3-like sets them to the outer shape) rounds the open trailing half, over the open motion with the chevron; under divider it stays square', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    const cap = (await bounds(leading(page, 'filled-medium'))).height / 2;
    const [inner, innerOpen] = (await Promise.all(['container-inner-shape', 'container-inner-shape-open'].map((name) => resolveToken(page, T(name))))).map((value) => Math.min(value, cap));
    expect(innerOpen).toBe(cap);
    expect(inner).toBeLessThan(cap);
    const radius = async (id: string, corner: string) => Number.parseFloat(await css(page, id, 'trailing', `border-${corner}-radius`));
    // m3-like's separation is gap: every fixture that leaves it auto is the gap form.
    for (const id of ['filled-medium', 'filled-gap']) expect([await radius(id, 'top-left'), await radius(id, 'bottom-left')], id).toEqual([inner, inner]);
    for (const id of ['filled-open', 'filled-gap-open', 'elevated-gap-open']) expect([await radius(id, 'top-left'), await radius(id, 'bottom-left')], id).toEqual([innerOpen, innerOpen]);
    // Round at both ends while open: its open corners are half its height.
    expect(innerOpen).toBe((await bounds(trailing(page, 'filled-open'))).height / 2);
    // Under divider the corners are square, open or not, whatever the token says.
    await host(page, 'filled-open').evaluate((el) => el.setAttribute('separation', 'divider'));
    expect([await radius('filled-open', 'top-left'), await radius('filled-open', 'bottom-left')]).toEqual([0, 0]);
    // The corners move with the chevron, over the open motion, and only then.
    const duration = await resolveToken(page, T('motion-open-duration'), 'duration');
    const curve = await easing(page, T('motion-open-easing'));
    const turned = await host(page, 'filled-medium').evaluate(async (el) => {
      const split = el as HTMLElement & { open: boolean; updateComplete: Promise<boolean> };
      split.open = true;
      await split.updateComplete;
      const button = split.shadowRoot!.querySelector('button.trailing')!;
      const moving = () => button.getAnimations().filter((a) => (a as CSSTransition).transitionProperty?.startsWith('border-')).length;
      const during = { turning: button.classList.contains('turning'), corners: moving() };
      await new Promise<void>((resolve) => {
        const check = () => (button.classList.contains('turning') ? requestAnimationFrame(check) : resolve());
        check();
      });
      return { during, after: moving() };
    });
    expect(turned.during.turning).toBe(true);
    expect(turned.during.corners).toBeGreaterThan(0);
    expect(turned.after).toBe(0);
    await host(page, 'filled-medium').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await expect(trailing(page, 'filled-medium')).not.toHaveClass(/turning/);
    await host(page, 'filled-medium').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect(trailing(page, 'filled-medium')).toHaveClass(/turning/);
    const corners = await trailing(page, 'filled-medium').evaluate((el) => {
      const s = getComputedStyle(el);
      const properties = s.transitionProperty.split(', ');
      const at = properties.indexOf('border-radius');
      return { duration: Number.parseFloat(s.transitionDuration.split(', ')[at]) * 1000, curve: s.transitionTimingFunction.split(/,\s*(?=cubic|ease|linear|steps)/)[at] };
    });
    expect(corners).toEqual({ duration, curve });
    await expect(trailing(page, 'filled-medium')).not.toHaveClass(/turning/);
    expect(await radius('filled-medium', 'top-left')).toBe(innerOpen);
    expect(await css(page, 'filled-medium', 'leading', 'transition-property')).not.toContain('radius');
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page, 'filled-medium').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await expect(trailing(page, 'filled-medium')).not.toHaveClass(/turning/);
    expect(await radius('filled-medium', 'top-left')).toBe(inner);
  });

  test('SPB-14: the label in its size’s text style and its half’s label color, never truncated; the icon and the chevron (expand_more) at the icon size in their own half’s label color, unselected', async ({ page }) => {
    const label = host(page, 'filled-icon').locator('.label');
    expect(await label.evaluate((el) => getComputedStyle(el).fontSize)).toBe(`${await resolveToken(page, T('label-typescale-medium-font-size'))}px`);
    expect(await label.evaluate((el) => getComputedStyle(el).color)).toBe(await resolveColor(page, T('filled-label-color')));
    const glyph = (selector: string) =>
      host(page, 'filled-icon')
        .locator(selector)
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return { color: s.color, family: s.fontFamily, size: el.getBoundingClientRect().width, text: el.textContent?.trim() ?? '' };
        });
    const family = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim());
    const icon = await glyph('.icon');
    // The closed glyph's box: the trailing half has a second chevron box, for a chevron-open glyph (SPB-21).
    const chevron = await glyph('.turn .chevron');
    expect(chevron.text).toBe('expand_more');
    for (const drawn of [icon, chevron]) {
      expect(drawn.color).toBe(await resolveColor(page, T('filled-label-color')));
      expect(drawn.size).toBe(await resolveToken(page, T('icon-size-medium')));
      expect(drawn.family.replaceAll('"', '')).toBe(family.replaceAll('"', ''));
    }
    // Each glyph takes its own half's state.
    await trailing(page, 'filled-icon').hover();
    await page.mouse.down();
    await expect.poll(async () => (await glyph('.turn .chevron')).color).toBe(await resolveColor(page, T('filled-pressed-label-color')));
    await page.mouse.up();
    // Not truncated: one line while it fits; given less width it wraps, and both halves grow together.
    const one = await bounds(leading(page, 'filled-medium'));
    await host(page, 'filled-medium').evaluate((el) => {
      el.setAttribute('label', 'Save everything to the archive');
      (el as HTMLElement).style.inlineSize = 'min-content';
    });
    await expect.poll(async () => (await bounds(leading(page, 'filled-medium'))).height).toBeGreaterThan(one.height);
    const [a, b] = [await bounds(leading(page, 'filled-medium')), await bounds(trailing(page, 'filled-medium'))];
    expect(b.height).toBe(a.height);
    expect(await leading(page, 'filled-medium').locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth + 0.5 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
  });

  test('SPB-15: open presents the items as a Tanrei Menu below the whole button with menu, end-aligned, flipping above when there is no room; focus moves in, and back to the trailing half when it closes', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('menu')] });
    await wire(page);
    // Room at the start, so that the end-aligned surface (wider than the button with menu) is not shifted into the window.
    await page.evaluate(() => (document.body.style.paddingInlineStart = '300px'));
    await tabTo(page, trailing(page, 'menu'));
    await page.keyboard.press('Enter');
    await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
    await expect.poll(() => focused(page)).toBe('tanrei-menu-item[Save as…]');
    await expect(host(page, 'menu').getByRole('menuitem')).toHaveCount(2);
    const row = await bounds(host(page, 'menu').locator('div.row:not(.p)'));
    const s = await bounds(surface(page, 'menu'));
    const offset = await resolveToken(page, '--tanrei-comp-menu-surface-offset');
    expect(s.y).toBeCloseTo(row.y + row.height + offset, 0);
    expect(s.x + s.width).toBeCloseTo(row.x + row.width, 0);
    // Not modal: the menu is labelled by the trailing half.
    await expect(host(page, 'menu').locator('tanrei-menu')).toHaveAttribute('aria-labelledby', 'trailing');
    await page.keyboard.press('Escape');
    await expect.poll(() => menuOpen(page, 'menu')).toBe(false);
    await expect(trailing(page, 'menu')).toBeFocused();

    // Near the bottom of the window it flips above.
    await page.evaluate(() => (document.body.style.paddingTop = `${window.innerHeight - 110}px`));
    await trailing(page, 'menu').click();
    await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
    const [row2, above] = [await bounds(host(page, 'menu').locator('div.row:not(.p)')), await bounds(surface(page, 'menu'))];
    expect(above.y + above.height).toBeLessThanOrEqual(row2.y + 0.5);
    await trailing(page, 'menu').click();
    await expect.poll(() => menuOpen(page, 'menu')).toBe(false);
  });

  test('SPB-15: the menu slot holds the menu’s own item kinds — a group is divided from what is next to it, and a radio item sets its group', async ({ page }) => {
    const content = `<tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item><tanrei-menu-group slot="menu" label="Format" value="pdf"><tanrei-menu-radio-item value="pdf" label="PDF"></tanrei-menu-radio-item><tanrei-menu-radio-item value="png" label="PNG"></tanrei-menu-radio-item></tanrei-menu-group><tanrei-menu-checkbox-item slot="menu" label="Compress"></tanrei-menu-checkbox-item>`;
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('kinds', {}, content)] });
    await wire(page);
    await trailing(page, 'kinds').click();
    await expect.poll(() => menuOpen(page, 'kinds')).toBe(true);
    await expect(host(page, 'kinds').locator('tanrei-menu').locator('.divider')).toHaveCount(2);
    await expect(host(page, 'kinds').getByRole('menuitemradio', { name: 'PDF' })).toHaveAttribute('aria-checked', 'true');
    await expect(host(page, 'kinds').getByRole('menuitem', { name: 'Save as…' })).toHaveAttribute('aria-setsize', '4');
    const changes = await host(page, 'kinds').evaluate((el) => {
      const seen: string[] = [];
      el.querySelector('tanrei-menu-group')!.addEventListener('change', (e) => seen.push((e as CustomEvent).detail.value));
      (window as any).changes = seen;
      return seen.length;
    });
    expect(changes).toBe(0);
    await host(page, 'kinds').getByRole('menuitemradio', { name: 'PNG' }).click();
    expect(await page.evaluate(() => (window as any).changes)).toEqual(['png']);
    await expect(host(page, 'kinds').getByRole('menuitemradio', { name: 'PNG' })).toHaveAttribute('aria-checked', 'true');
    // The radio item's activation asked to close the menu, and the product closed it: it is gone once it has faded out
    // (while it fades it still shows, so a closed menu is read only after that).
    expect(await log(page)).toEqual(['toggle:true', 'close:item']);
    await expect.poll(() => menuOpen(page, 'kinds')).toBe(false);
    // An item added later is the menu's too.
    await host(page, 'kinds').evaluate((el) => {
      const item = document.createElement('tanrei-menu-item');
      item.setAttribute('label', 'Save a copy');
      item.slot = 'menu';
      el.append(item);
    });
    // One press opens it again.
    await trailing(page, 'kinds').click();
    expect(await log(page)).toEqual(['toggle:true', 'close:item', 'toggle:true']);
    await expect.poll(() => menuOpen(page, 'kinds')).toBe(true);
    await expect(host(page, 'kinds').getByRole('menuitem', { name: 'Save a copy' })).toHaveAttribute('aria-setsize', '5');
  });

  test('SPB-16: the menu’s requests to close emit close once with its reason; an item’s click comes first; a press on the trailing half while open is a toggle, not a press outside', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('menu')] });
    await wire(page);
    const reset = () => page.evaluate(() => ((window as any).log.length = 0));
    const open = async () => {
      await trailing(page, 'menu').click();
      await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
      await expect.poll(() => focused(page)).toBe('tanrei-menu-item[Save as…]');
      await reset();
    };
    await open();
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['close:escape']);
    await expect.poll(() => menuOpen(page, 'menu')).toBe(false);

    await open();
    await host(page, 'menu').getByRole('menuitem', { name: 'Save a copy' }).click();
    // The item's own click first, then close; the item's click never reaches the element's listeners.
    expect(await log(page)).toEqual(['item:Save a copy', 'close:item']);

    await open();
    await page.keyboard.press('Enter');
    expect(await log(page)).toEqual(['item:Save as…', 'close:item']);

    await open();
    await trailing(page, 'menu').click();
    expect(await log(page)).toEqual(['toggle:false']);
    await expect.poll(() => menuOpen(page, 'menu')).toBe(false);

    await open();
    await page.mouse.click(300, 5);
    expect(await log(page)).toEqual(['close:outside']);

    await open();
    await tab(page);
    expect(await log(page)).toEqual(['close:tab']);
  });

  test('SPB-17: two buttons in reading order, each a tab stop, named by label and menuLabel; the trailing half says it opens a menu and whether it is open; the icon and the chevron hidden; nothing around them', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...withMenu('menu'), content: `<span slot="icon">save</span>${ITEMS}` }] });
    await wire(page);
    const buttons = host(page, 'menu').getByRole('button');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.nth(0)).toHaveAccessibleName('Save');
    await expect(buttons.nth(1)).toHaveAccessibleName('More save options');
    await expect(trailing(page, 'menu')).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trailing(page, 'menu')).toHaveAttribute('aria-expanded', 'false');
    await expect(trailing(page, 'menu')).toHaveAttribute('aria-controls', (await host(page, 'menu').locator('tanrei-menu').getAttribute('id'))!);
    await expect(host(page, 'menu').locator('.icon')).toHaveAttribute('aria-hidden', 'true');
    await expect(host(page, 'menu').locator('.chevrons')).toHaveAttribute('aria-hidden', 'true');
    // A chevron slot's glyph is hidden too, and names nothing.
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...withMenu('slots'), content: `<span slot="chevron">more_vert</span><span slot="chevron-open">close</span>${ITEMS}` }] });
    await expect(host(page, 'slots').getByRole('button')).toHaveCount(2);
    await expect(host(page, 'slots').getByRole('button').nth(1)).toHaveAccessibleName('More save options');
    await expect(host(page, 'slots').locator('.chevrons')).toHaveAttribute('aria-hidden', 'true');
    await mountFixtures(page, spec, { icons: true, fixtures: [{ ...withMenu('menu'), content: `<span slot="icon">save</span>${ITEMS}` }] });
    await wire(page);
    expect(await host(page, 'menu').getAttribute('role')).toBeNull();
    expect(await host(page, 'menu').locator('div.row:not(.p)').getAttribute('role')).toBeNull();
    // Tab: the leading half, then the trailing half.
    await tabTo(page, leading(page, 'menu'));
    await tab(page);
    await expect(trailing(page, 'menu')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(trailing(page, 'menu')).toHaveAttribute('aria-expanded', 'true');
  });

  test('SPB-18: each half casts its elevation’s blurred layers outside itself, unclipped, and colors and elevation change over the state motion, at once where reduced', async ({ page }) => {
    const shadow = await shadows(page, 'elevated-medium', 'leading');
    const level = await token(page, T('elevated-container-elevation'));
    expect(level).not.toBe('');
    expect(shadow.split(/,(?![^(]*\))/).length).toBeGreaterThan(1); // the inset outline and the elevation's layers
    expect(await host(page, 'elevated-medium').evaluate((el) => [getComputedStyle(el).overflow, getComputedStyle(el.shadowRoot!.querySelector('.row')!).overflow])).toEqual(['visible', 'visible']);
    const motion = await leading(page, 'elevated-medium').evaluate((el) => {
      const s = getComputedStyle(el);
      return { property: s.transitionProperty, duration: Number.parseFloat(s.transitionDuration) * 1000 };
    });
    expect(motion.property).toContain('background-color');
    // The elevation is drawn by the half's ::after, and changes there, over the same motion.
    expect(await css(page, 'elevated-medium', 'leading', 'transition-property', '::after')).toBe('box-shadow');
    expect(Number.parseFloat(await css(page, 'elevated-medium', 'leading', 'transition-duration', '::after')) * 1000).toBe(motion.duration);
    expect(motion.duration).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(page, 'elevated-medium', 'leading', 'transition-duration')).toBe('0s');
  });

  test('SPB-19: right-to-left puts the trailing half on the left, mirrors the icon, label and paddings, keeps the chevron, and grows a ripple from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    await page.locator('[data-fixture="filled-icon"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await host(page, 'filled-icon').scrollIntoViewIfNeeded();
    const [a, b] = [await bounds(leading(page, 'filled-icon')), await bounds(trailing(page, 'filled-icon'))];
    expect(b.x + b.width).toBeLessThan(a.x);
    const [icon, label] = [await bounds(host(page, 'filled-icon').locator('.icon')), await bounds(host(page, 'filled-icon').locator('.label'))];
    expect(icon.x).toBeGreaterThan(label.x);
    expect(await css(page, 'filled-icon', 'leading', 'padding-right')).toBe(`${await resolveToken(page, T('leading-padding-inline-start-with-icon-medium'))}px`);
    // The outer corners are on the physical other side now.
    expect(Number.parseFloat(await css(page, 'filled-icon', 'trailing', 'border-top-left-radius'))).toBeGreaterThan(Number.parseFloat(await css(page, 'filled-icon', 'trailing', 'border-top-right-radius')));
    expect(await host(page, 'filled-icon').locator('.turn .chevron').evaluate((el) => [getComputedStyle(el).direction, getComputedStyle(el.parentElement!).transform])).toEqual(['ltr', 'none']);
    // Whole pixels: Firefox and WebKit drop a pointer's fraction.
    const [px, py] = [Math.round(b.x + 6), Math.round(b.y + 9)];
    await page.mouse.move(px, py);
    await page.mouse.down();
    const at = await trailing(page, 'filled-icon')
      .locator('.ripple')
      .evaluate((el) => {
        const own = el.getBoundingClientRect();
        const half = el.parentElement!.getBoundingClientRect();
        return [Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - half.left, Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - half.top];
      });
    expect(at[0]).toBeCloseTo(px - b.x, 0);
    expect(at[1]).toBeCloseTo(py - b.y, 0);
    await page.mouse.up();
    // The hit areas mirror too: toward the other half still no further than the middle of the gap.
    const gap = await resolveToken(page, T('container-inner-gap'));
    const reach = await trailing(page, 'filled-icon').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').right));
    expect(-reach).toBeLessThanOrEqual(gap / 2 + 0.01);
  });

  test('SPB-19: fixture filled-narrow-rtl — the narrow trailing half is at the left with its round end at the left, the seam and its divider on its right, and the label’s outer padding at the right; every other fixture is left-to-right', async ({ page }) => {
    const id = 'filled-narrow-rtl';
    // The fixture's own direction: `dir` on its stage, and on no other.
    expect(await page.locator('.stage[dir]').evaluateAll((stages) => stages.map((el) => [el.getAttribute('data-fixture'), el.getAttribute('dir')]))).toEqual([[id, 'rtl']]);
    expect(spec.fixtures.filter((f) => f.direction).map((f) => f.id)).toEqual([id]);
    const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
    // The narrow half is at the left, 36 wide as in left-to-right, and the leading half begins where it ends.
    expect(b.x).toBeLessThan(a.x);
    expect(b.width).toBe(36);
    expect(b.width).toBe((await bounds(trailing(page, 'filled-narrow'))).width);
    expect(a.width).toBeCloseTo((await bounds(leading(page, 'filled-narrow'))).width, 2);
    expect(b.x + b.width).toBeCloseTo(a.x, 2);
    // Its round end is the left, and its right — the seam — is square (divider under the default system); the leading
    // half is the other way round.
    const radii = (half: 'leading' | 'trailing') => Promise.all(['border-top-left-radius', 'border-bottom-left-radius', 'border-top-right-radius', 'border-bottom-right-radius'].map(async (name) => Number.parseFloat(await css(page, id, half, name))));
    const round = (await bounds(trailing(page, id))).height / 2;
    expect(await radii('trailing')).toEqual([round, round, 0, 0]);
    expect(await radii('leading')).toEqual([0, 0, round, round]);
    // The divider's rule is on the seam, centred on it.
    const rule = await host(page, id)
      .locator('.divider')
      .evaluate((el) => {
        const [box, line] = [el.getBoundingClientRect(), getComputedStyle(el, '::before')];
        return { x: box.left, width: box.width, thickness: Number.parseFloat(line.width), display: getComputedStyle(el).display };
      });
    expect(rule.display).not.toBe('none');
    expect(rule.x).toBeCloseTo(b.x + b.width, 2);
    expect(rule.width).toBe(0);
    expect(rule.thickness).toBe(await resolveToken(page, T('divider-thickness')));
    // The chevron 16 from the seam, and the outer padding at the left end: 20 from the end edge.
    const chevron = await bounds(host(page, id).locator('.turn .chevron'));
    expect(chevron.x + chevron.width / 2 - b.x).toBeCloseTo(20, 2);
    expect(b.x + b.width - chevron.x - chevron.width / 2).toBeCloseTo(16, 2);
    expect(await host(page, id).locator('.turn .chevron').evaluate((el) => getComputedStyle(el.parentElement!).transform)).toBe('none');
    // The label's outer padding is at the right: start padding and container.outer-inset from the right edge.
    const label = await bounds(host(page, id).locator('.label'));
    expect(a.x + a.width - label.x - label.width).toBeCloseTo((await resolveToken(page, T('leading-padding-inline-start-medium'))) + (await resolveToken(page, T('container-outer-inset'))), 1);
    expect(label.x - a.x).toBeCloseTo(await resolveToken(page, T('leading-padding-inline-end-medium')), 1);
  });

  test('SPB-20: an empty label or menuLabel still renders and is reported; an open button with menu with no item draws its open form, still emits toggle and presents no menu', async ({ page }) => {
    const seen = reports(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('no-label', { label: '' }), withMenu('no-menu-label', { menuLabel: '' }), fixture('empty', { open: true })] });
    for (const id of ['no-label', 'no-menu-label']) {
      expect((await bounds(leading(page, id))).height).toBe(await resolveToken(page, T('container-height-medium')));
      expect((await bounds(trailing(page, id))).width).toBeGreaterThan(0);
    }
    await expect.poll(() => seen.filter((text) => /accessible name/.test(text)).length).toBe(2);
    expect(seen.join('\n')).toMatch(/label is empty, so the leading half has no accessible name; give it a label \(SPB-20\)/);
    expect(seen.join('\n')).toMatch(/menuLabel is empty, so the trailing half has no accessible name/);
    await expect(trailing(page, 'empty')).toHaveClass(/open/);
    expect(await menuOpen(page, 'empty')).toBe(false);
    await expect(trailing(page, 'empty')).toHaveAttribute('aria-expanded', 'false');
    await wire(page, { product: false });
    await trailing(page, 'empty').click();
    expect(await log(page)).toEqual(['toggle:false']);
  });

  test('SPB-20: a debug build reports an empty menu slot once its children have settled, and again each time it becomes empty — never on every render', async ({ page }) => {
    const seen = reports(page);
    const empties = () => seen.filter((text) => text.includes('the menu slot holds no item') && text.includes('(SPB-20)')).length;
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('empty'), withMenu('filled')] });
    // Only the one without items, whatever its open says.
    await expect.poll(empties).toBe(1);
    // Rendering again is not becoming empty again.
    await host(page, 'empty').evaluate(async (el) => {
      const split = el as HTMLElement & { open: boolean; label: string; updateComplete: Promise<boolean> };
      split.open = true;
      await split.updateComplete;
      split.label = 'Save now';
      await split.updateComplete;
      split.open = false;
      await split.updateComplete;
    });
    await page.waitForTimeout(100);
    expect(empties()).toBe(1);
    // The filled one emptied: reported; filled again: nothing; emptied again: reported again.
    const items = (op: 'remove' | 'add') =>
      host(page, 'filled').evaluate((el, o) => {
        if (o === 'remove') for (const item of el.querySelectorAll('[slot="menu"]')) item.remove();
        else el.insertAdjacentHTML('beforeend', '<tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item>');
      }, op);
    await items('remove');
    await expect.poll(empties).toBe(2);
    await items('add');
    await page.waitForTimeout(100);
    expect(empties()).toBe(2);
    await items('remove');
    await expect.poll(empties).toBe(3);
    // Children appended after the element connected (as a parser or a framework does) are judged once settled.
    await page.evaluate(() => {
      const split = document.createElement('tanrei-button-with-menu');
      split.setAttribute('label', 'Late');
      split.setAttribute('menu-label', 'More');
      document.querySelector('main')!.append(split);
      split.insertAdjacentHTML('beforeend', '<tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item>');
    });
    await page.waitForTimeout(100);
    expect(empties()).toBe(3);
  });

  test('SPB-21: expand_more turns while open; a chevron slot glyph alone turns the same way; with chevron-open the two cross-fade unturned; each slot draws its first glyph and reports the rest', async ({ page }) => {
    const seen = reports(page);
    const turned = /^matrix\(-1, [-0-9.e]+, [-0-9.e]+, -1, 0, 0\)$/;
    const look = (id: string) =>
      trailing(page, id).evaluate((el) => {
        const turn = el.querySelector<HTMLElement>('.turn')!;
        const open = el.querySelector<HTMLElement>('.glyph-open')!;
        const drawn = (box: HTMLElement) => {
          const slot = box.querySelector('slot')!;
          const assigned = slot.assignedElements();
          return assigned.length ? assigned.map((node) => node.textContent?.trim()).join(' ') : slot.textContent?.trim();
        };
        return {
          closed: drawn(turn),
          open: getComputedStyle(open).display === 'none' ? null : drawn(open),
          transform: getComputedStyle(turn).transform,
          closedOpacity: getComputedStyle(turn).opacity,
          openOpacity: getComputedStyle(open).opacity,
        };
      });
    // The spec's fixtures: expand_more (turned while open), a chevron glyph alone (turned), and the two slots (unturned).
    expect(await look('filled-medium')).toMatchObject({ closed: 'expand_more', open: null, transform: 'none' });
    expect((await look('filled-open')).transform).toMatch(turned);
    const alone = await look('filled-chevron-turned-open');
    expect(alone).toMatchObject({ closed: 'arrow_drop_down', open: null, closedOpacity: '1' });
    expect(alone.transform).toMatch(turned);
    expect(await look('filled-chevron-custom')).toEqual({ closed: 'more_vert', open: 'close', transform: 'none', closedOpacity: '1', openOpacity: '0' });
    expect(await look('filled-chevron-custom-open')).toEqual({ closed: 'more_vert', open: 'close', transform: 'none', closedOpacity: '0', openOpacity: '1' });
    // The cross-fade runs over the open motion, with the corners; at once where motion is reduced.
    const duration = await resolveToken(page, T('motion-open-duration'), 'duration');
    const fade = await host(page, 'filled-chevron-custom').locator('.glyph-open').evaluate((el) => {
      const s = getComputedStyle(el);
      return { property: s.transitionProperty, duration: Number.parseFloat(s.transitionDuration) * 1000 };
    });
    expect(fade).toEqual({ property: 'opacity', duration });
    await host(page, 'filled-chevron-custom').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect(trailing(page, 'filled-chevron-custom')).toHaveClass(/turning/);
    await expect(trailing(page, 'filled-chevron-custom')).not.toHaveClass(/turning/);
    expect(await look('filled-chevron-custom')).toMatchObject({ transform: 'none', closedOpacity: '0', openOpacity: '1' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await host(page, 'filled-chevron-custom').locator('.glyph-open').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // The glyphs are drawn at the icon size, in the trailing half's label color.
    const glyph = await host(page, 'filled-chevron-custom').locator('[slot="chevron"]').evaluate((el) => ({ color: getComputedStyle(el).color, size: Number.parseFloat(getComputedStyle(el).fontSize) }));
    expect(glyph).toEqual({ color: await resolveColor(page, T('filled-label-color')), size: await resolveToken(page, T('icon-size-medium')) });
    // More than one glyph in a slot: the first is drawn, the rest reported.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('two', {}, '<span slot="chevron">more_vert</span><span slot="chevron">menu</span>')] });
    expect((await look('two')).closed).toBe('more_vert');
    await expect.poll(() => seen.some((text) => /the chevron slot holds 2 glyphs; only the first is drawn \(SPB-21\)/.test(text))).toBe(true);
  });

  test('SPB-22: with hoverOpen, a mouse resting on the trailing half for hoverDelay asks toggle(true) once; the menu then opens without taking focus, items hover without focus; leaving early, a press or open by other means cancels the wait; touch never opens it', async ({ page }) => {
    const seen = reports(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [withMenu('hover', { hoverOpen: true, hoverDelay: 600 }), withMenu('token', { hoverOpen: true }), withMenu('odd', { hoverOpen: true, hoverDelay: -5 }), withMenu('plain')],
    });
    await wire(page);
    const reset = () => page.evaluate(() => ((window as any).log.length = 0));
    // Focus is somewhere else: in the leading half of another button with menu, by the keyboard.
    await tabTo(page, leading(page, 'plain'));
    const before = await focused(page);
    // The wait runs on the page's clock, held still and moved on by the test: nothing at 599 ms, the toggle at 600.
    await holdClock(page);
    await trailing(page, 'hover').hover();
    await page.clock.runFor(599);
    expect(await log(page)).toEqual([]);
    await page.clock.runFor(1);
    expect(await log(page)).toEqual(['toggle:true']);
    await releaseClock(page);
    await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
    // Open from hover: focus stays where it was, the trailing half says the menu is open.
    expect(await focused(page)).toBe(before);
    await expect(trailing(page, 'hover')).toHaveAttribute('aria-expanded', 'true');
    // A pointer on an item draws it hovered and leaves focus where it was.
    const item = host(page, 'hover').getByRole('menuitem', { name: 'Save as…' });
    await item.hover();
    await expect.poll(() => item.evaluate((el) => el.shadowRoot!.querySelector('.row')!.matches(':hover'))).toBe(true);
    expect(await focused(page)).toBe(before);
    // A press on an item still activates it, and leaves focus where it was.
    await item.click();
    await expect.poll(() => log(page)).toEqual(['toggle:true', 'item:Save as…', 'close:item']);
    await expect.poll(() => menuOpen(page, 'hover')).toBe(false);
    expect(await focused(page)).toBe(before);
    await reset();

    // Leaving before the wait is over — one millisecond before — cancels it. (The page's clock again, from here on.)
    await holdClock(page);
    await trailing(page, 'hover').hover();
    await page.clock.runFor(599);
    await page.mouse.move(1, 1);
    await page.clock.runFor(700);
    expect(await log(page)).toEqual([]);
    // A press on either half cancels it: the press's own toggle, and none from hover.
    await trailing(page, 'hover').hover();
    await page.clock.runFor(599);
    await page.mouse.down();
    await page.mouse.up();
    await page.clock.runFor(800);
    expect(await log(page)).toEqual(['toggle:true']);
    await trailing(page, 'hover').click();
    await page.mouse.move(1, 1);
    await page.clock.runFor(800);
    await reset();
    await trailing(page, 'hover').hover();
    await page.clock.runFor(599);
    await leading(page, 'hover').click();
    await page.clock.runFor(800);
    expect(await log(page)).toEqual(['click']);
    await page.mouse.move(1, 1);
    await reset();
    // Open becoming true by other means cancels it (and the menu is then an ordinary one).
    await trailing(page, 'hover').hover();
    await page.clock.runFor(599);
    await host(page, 'hover').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await page.clock.runFor(800);
    expect(await log(page)).toEqual([]);
    await host(page, 'hover').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await page.mouse.move(1, 1);
    await page.clock.runFor(800);

    // Unset (null) and a negative delay take the token; the negative one is reported.
    const token = await resolveToken(page, T('motion-hover-open-delay'), 'duration');
    expect(token).toBeGreaterThan(0);
    await expect.poll(() => seen.some((text) => /hoverDelay -5 is not a number of milliseconds/.test(text) && text.includes('(SPB-22)'))).toBe(true);
    for (const id of ['token', 'odd']) {
      await reset();
      await trailing(page, id).hover();
      await page.clock.runFor(token - 1);
      expect(await log(page), id).toEqual([]);
      await page.clock.runFor(1);
      expect(await log(page), id).toEqual(['toggle:true']);
      await page.mouse.move(1, 1);
      await releaseClock(page);
      await expect.poll(() => menuOpen(page, id), { timeout: 3000 }).toBe(false);
      await holdClock(page);
    }

    // Touch — and pointer events synthesised from touch — never open it.
    await reset();
    await trailing(page, 'hover').evaluate((el) => {
      for (const type of ['pointerover', 'pointerenter', 'pointermove']) el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: type !== 'pointerenter', composed: true }));
    });
    await page.clock.runFor(900);
    expect(await log(page)).toEqual([]);
    // Without hoverOpen, hovering does nothing.
    await trailing(page, 'plain').hover();
    await page.clock.runFor(900);
    expect(await log(page)).toEqual([]);
  });

  test('SPB-23: a menu open from hover asks toggle(false) once the pointer has been off the trailing half and the menu for hover-close-delay; coming back in time keeps it; a menu opened any other way stays', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('hover', { hoverOpen: true, hoverDelay: 0 })] });
    await rootTokens(page, { '--tanrei-comp-button-with-menu-motion-hover-close-delay': '400ms' });
    await wire(page);
    const reset = () => page.evaluate(() => ((window as any).log.length = 0));
    const openFromHover = async () => {
      await trailing(page, 'hover').hover();
      await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
      await reset();
    };
    await openFromHover();
    // Off both, and back onto the menu within the grace: still open.
    const b = await bounds(trailing(page, 'hover'));
    // The grace runs on the page's clock, held still and moved on by the test: back one millisecond before its end.
    await holdClock(page);
    await page.mouse.move(b.x + b.width / 2, b.y - 30);
    await page.clock.runFor(399);
    await surface(page, 'hover').hover();
    await page.clock.runFor(600);
    expect(await log(page)).toEqual([]);
    expect(await menuOpen(page, 'hover')).toBe(true);
    // Off both for the grace: toggle(false), once, focus not moved — nothing at 399 ms, the toggle at 400.
    const before = await focused(page);
    await page.mouse.move(1, 1);
    await page.clock.runFor(399);
    expect(await log(page)).toEqual([]);
    await page.clock.runFor(1);
    expect(await log(page)).toEqual(['toggle:false']);
    await page.clock.runFor(500);
    expect(await log(page)).toEqual(['toggle:false']);
    await releaseClock(page);
    await expect.poll(() => menuOpen(page, 'hover')).toBe(false);
    expect(await focused(page)).toBe(before);
    // A press outside closes it as MNU-5 says.
    await openFromHover();
    await page.mouse.click(300, 5);
    expect((await log(page))[0]).toBe('close:outside');
    await expect.poll(() => menuOpen(page, 'hover')).toBe(false);
    // A menu the product opened stays when the pointer leaves.
    await reset();
    await page.mouse.move(1, 1);
    await host(page, 'hover').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
    await trailing(page, 'hover').hover();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(800);
    expect(await log(page)).toEqual([]);
    expect(await menuOpen(page, 'hover')).toBe(true);
  });

  test('SPB-24: pointer, Enter, Space or Down Arrow on the trailing half of a menu open from hover emit no toggle, keep it open and move focus in; from then on it is an ordinary menu', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('hover', { hoverOpen: true, hoverDelay: 0 })] });
    await rootTokens(page, { '--tanrei-comp-button-with-menu-motion-hover-close-delay': '200ms' });
    await wire(page);
    const reset = () => page.evaluate(() => ((window as any).log.length = 0));
    const openFromHover = async () => {
      await page.mouse.move(1, 1);
      await trailing(page, 'hover').hover();
      await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
      await reset();
    };
    // A press.
    await openFromHover();
    await trailing(page, 'hover').click();
    expect(await log(page)).toEqual([]);
    await expect.poll(() => focused(page)).toBe('tanrei-menu-item[Save as…]');
    // The pointer leaving no longer closes it; MNU-8 applies again (focus follows the pointer).
    await page.mouse.move(1, 1);
    await page.waitForTimeout(500);
    expect(await menuOpen(page, 'hover')).toBe(true);
    await host(page, 'hover').getByRole('menuitem', { name: 'Save a copy' }).hover();
    await expect.poll(() => focused(page)).toBe('tanrei-menu-item[Save a copy]');
    // The next activation of the trailing half asks toggle(false).
    await trailing(page, 'hover').click();
    expect(await log(page)).toEqual(['toggle:false']);
    await expect.poll(() => menuOpen(page, 'hover')).toBe(false);

    // The keys, with keyboard focus on the trailing half while the pointer rests on it.
    for (const key of ['Enter', ' ', 'ArrowDown']) {
      await page.mouse.move(1, 1);
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, trailing(page, 'hover'));
      await openFromHover();
      await expect(trailing(page, 'hover')).toBeFocused();
      await page.keyboard.press(key);
      expect(await log(page), key).toEqual([]);
      await expect.poll(() => focused(page), key).toBe('tanrei-menu-item[Save as…]');
      expect(await menuOpen(page, 'hover'), key).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(() => menuOpen(page, 'hover'), key).toBe(false);
      // An ordinary menu's Escape: focus back to the trailing half.
      await expect(trailing(page, 'hover')).toBeFocused();
    }
  });

  test('SPB-25: Escape closes a menu open from hover wherever focus is — close(escape) once, focus left where it was, the key reaching nothing else; a later Escape reaches the page', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('hover', { hoverOpen: true, hoverDelay: 0 }), fixture('plain')] });
    await wire(page);
    await page.evaluate(() => {
      const seen: string[] = ((window as any).page = []);
      document.addEventListener('keydown', (e) => seen.push(`document:${e.key}`));
      window.addEventListener('keydown', (e) => seen.push(`window:${e.key}`));
    });
    await tabTo(page, leading(page, 'plain'));
    // The Tab presses that brought the focus there reached the page, as they should; what follows is about Escape.
    await page.evaluate(() => ((window as any).page.length = 0));
    const before = await focused(page);
    await trailing(page, 'hover').hover();
    await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['toggle:true', 'close:escape']);
    await expect.poll(() => menuOpen(page, 'hover')).toBe(false);
    expect(await focused(page)).toBe(before);
    expect(await page.evaluate(() => (window as any).page)).toEqual([]);
    // The next Escape is the page's.
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as any).page)).toEqual(['document:Escape', 'window:Escape']);
    expect(await log(page)).toEqual(['toggle:true', 'close:escape']);
    // A product that does not close it: the button with menu still takes only that one Escape.
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('hover', { hoverOpen: true, hoverDelay: 0 })] });
    await wire(page, { product: false });
    await host(page, 'hover').evaluate((el) =>
      el.addEventListener('toggle', (e) => ((el as HTMLElement & { open: boolean }).open = (e as CustomEvent).detail.open || (el as HTMLElement & { open: boolean }).open)),
    );
    await page.evaluate(() => {
      const seen: string[] = ((window as any).page = []);
      document.addEventListener('keydown', (e) => seen.push(`document:${e.key}`));
    });
    // The pointer is where the first half of the test left it — on this trailing half's place — and a pointer that
    // has not moved enters nothing: it comes from elsewhere.
    await page.mouse.move(1, 1);
    await trailing(page, 'hover').hover();
    await expect.poll(() => menuOpen(page, 'hover')).toBe(true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    expect((await log(page)).filter((entry) => entry.startsWith('close'))).toEqual(['close:escape']);
    expect(await page.evaluate(() => (window as any).page)).toEqual(['document:Escape']);
  });

  test('SPB-26: each half draws its outline and its elevation’s ring inside its own edge, the outline over the ring; nothing spreads outward, so under gap no ring or outline reaches the gap', async ({ page }) => {
    const layers = (value: string) => value.split(/,\s*(?![^(]*\))/).map((layer) => layer.trim());
    // The spread of a layer, and whether it is inset, from the computed value (`<color> <x> <y> <blur> <spread> [inset]`).
    const parse = (layer: string) => {
      const lengths = layer.replace(/rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)/g, '').match(/-?[\d.]+px/g)!.map(Number.parseFloat);
      return { inset: /\binset\b/.test(layer), x: lengths[0], y: lengths[1], blur: lengths[2] ?? 0, spread: lengths[3] ?? 0 };
    };
    const width = await resolveToken(page, T('outline-width-medium'));
    for (const [id, variant] of [['elevated-gap', 'elevated'], ['elevated-gap-open', 'elevated'], ['outlined-gap', 'outlined'], ['elevated-medium', 'elevated'], ['elevated-open', 'elevated'], ['outlined-medium', 'outlined']] as const) {
      const outline = await resolveColor(page, T(`${variant}-outline-color`));
      for (const half of ['leading', 'trailing'] as const) {
        const shadow = layers(await shadows(page, id, half));
        // The outline first (over everything else), inset, the size's width, in the variant's outline color.
        expect(shadow[0], `${id} ${half}`).toBe(`${outline} 0px 0px 0px ${width}px inset`);
        // Nothing spreads outward: a layer without offset and blur (a ring) is inset.
        for (const layer of shadow.map(parse)) {
          if (layer.x === 0 && layer.y === 0 && layer.blur === 0 && layer.spread > 0) expect(layer.inset, `${id} ${half}: ${JSON.stringify(layer)}`).toBe(true);
        }
      }
    }
    // The default system's elevated half has a ring: it is inside, in the ring color.
    const ring = await resolveColor(page, '--tanrei-sys-color-elevation-ring');
    expect(await shadows(page, 'elevated-medium', 'leading')).toContain(`${ring} 0px 0px 0px 1px inset`);
    // Hovered, whose elevation may differ: still inside.
    await trailing(page, 'elevated-medium').hover();
    await page.waitForTimeout(300);
    for (const layer of layers(await shadows(page, 'elevated-medium', 'trailing')).map(parse)) {
      if (layer.x === 0 && layer.y === 0 && layer.blur === 0 && layer.spread > 0) expect(layer.inset).toBe(true);
    }
    // Under gap the halves' edges never meet: the gap between their boxes stays open, and a column of pixels through its
    // middle shows no ring and no outline along its whole height — only the stage (and, for the elevated one, its soft
    // shadow, which is no ring: it is fainter than the ring everywhere).
    await page.mouse.move(1, 1);
    const gap = await resolveToken(page, T('container-inner-gap'));
    const scale = await page.evaluate(() => devicePixelRatio);
    const stageColor = await paintedColor(page, 'transparent');
    const ringColor = await paintedColor(page, ring);
    for (const id of ['elevated-gap', 'elevated-gap-open', 'outlined-gap']) {
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      expect(b.x - (a.x + a.width), id).toBeCloseTo(gap, 2);
      const origin = await bounds(page.locator(`[data-fixture="${id}"]`));
      const shot = decodePng(await page.locator(`[data-fixture="${id}"]`).screenshot({ animations: 'disabled' }));
      const x = Math.floor((a.x + a.width + gap / 2 - origin.x) * scale);
      const column = new Set<string>();
      for (let y = Math.round((a.y - origin.y + 2) * scale); y < Math.round((a.y + a.height - origin.y - 2) * scale); y++) column.add(shot.at(x, y));
      if (id === 'outlined-gap') expect([...column], id).toEqual([stageColor]);
      expect([...column], id).not.toContain(ringColor);
      expect([...column], id).not.toContain(await paintedColor(page, await resolveColor(page, T('outlined-outline-color'))));
    }
    // The halves read the elevation's `-inset-ring` companion, part of the web's token surface (README, "Elevation"): an
    // elevation a product overrides by hand reaches them through its companion, overridden with it.
    const elevation = T('elevated-container-elevation');
    await rootTokens(page, { [elevation]: '0 0 0 3px var(--tanrei-sys-color-elevation-ring)', [`${elevation}-inset-ring`]: 'inset 0 0 0 3px var(--tanrei-sys-color-elevation-ring)' });
    await expect.poll(() => shadows(page, 'elevated-medium', 'leading')).toContain(`${ring} 0px 0px 0px 3px inset`);
  });

  test('SPB-26 / SPB-31: under divider neither half draws its outline or its ring along the seam — a column of pixels through the seam shows the divider in its middle and nothing but the halves’ fill above and below it', async ({ page }) => {
    await measured(page);
    const inset = await resolveToken(page, T('divider-inset'));
    const scale = await page.evaluate(() => devicePixelRatio);
    const surfaceColor = await paintedColor(page, 'transparent');
    const channels = (color: string) => color.match(/\d+/g)!.map(Number);
    const near = (color: string, other: string) => channels(color).every((value, k) => Math.abs(value - channels(other)[k]) <= 2);
    for (const [id, variant, state] of [['outlined-medium', 'outlined', ''], ['elevated-medium', 'elevated', ''], ['filled-medium', 'filled', ''], ['tonal-medium', 'tonal', ''], ['outlined-open', 'outlined', ''], ['filled-narrow', 'filled', ''], ['outlined-disabled', 'outlined', 'disabled-']] as const) {
      const fill = await paintedColor(page, await resolveColor(page, T(`${variant}-${state}container-color`)));
      const line = await paintedColor(page, await resolveColor(page, T(`${variant}-${state}divider-color`)), fill);
      const origin = await bounds(page.locator(`[data-fixture="${id}"]`));
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      // The halves touch.
      expect(b.x, id).toBeCloseTo(a.x + a.width, 1);
      const shot = decodePng(await page.locator(`[data-fixture="${id}"]`).screenshot({ animations: 'disabled' }));
      const seam = Math.round((a.x + a.width - origin.x) * scale);
      const [top, bottom] = [a.y - origin.y, a.y + a.height - origin.y];
      const colors = { edge: new Set<string>(), middle: new Set<string>() };
      for (let x = seam - 2; x < seam + 2; x++) {
        for (let y = Math.round((top + 3) * scale); y < Math.round((top + inset - 2) * scale); y++) colors.edge.add(shot.at(x, y));
        for (let y = Math.round((bottom - inset + 2) * scale); y < Math.round((bottom - 3) * scale); y++) colors.edge.add(shot.at(x, y));
        for (let y = Math.round((top + inset + 2) * scale); y < Math.round((bottom - inset - 2) * scale); y++) colors.middle.add(shot.at(x, y));
      }
      expect([...colors.edge].filter((color) => !near(color, fill)), `${id}: beside the divider's ends, only the fill`).toEqual([]);
      expect([...colors.middle].filter((color) => !near(color, fill) && !near(color, line)), `${id}: the divider and the fill`).toEqual([]);
      expect([...colors.middle].some((color) => near(color, line)), `${id}: the divider is drawn`).toBe(true);
      // The outline still runs once around the joined shape: the top edge, on both sides of the seam.
      if (variant === 'outlined' && state === '') {
        const outline = await paintedColor(page, await resolveColor(page, T('outlined-outline-color')));
        expect(outline).not.toBe(surfaceColor);
        for (const x of [seam - 6, seam + 6]) expect(shot.at(x, Math.round(top * scale)), `${id}: the outline at ${x}`).toBe(outline);
      }
    }
  });

  test('SPB-21: under the default system the closed and the open form differ in the chevron alone — the same halves, the same shapes, the same rule', async ({ page }) => {
    const form = async (id: string) => {
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      const stage = await bounds(page.locator(`[data-fixture="${id}"]`));
      const shape = await Promise.all((['leading', 'trailing'] as const).map((half) => css(page, id, half, 'border-radius')));
      return { leading: [a.x - stage.x, a.width, a.height], trailing: [b.x - stage.x, b.width, b.height], shape, fill: await css(page, id, 'trailing', 'background-color'), shadow: await shadows(page, id, 'trailing') };
    };
    for (const [closed, open] of [['filled-medium', 'filled-open'], ['filled-gap', 'filled-gap-open'], ['elevated-gap', 'elevated-gap-open'], ['filled-narrow', 'filled-narrow-open']] as const) {
      expect(await form(open), open).toEqual(await form(closed));
      // Painted: outside the chevron's box the two stages are the same picture.
      const [origin, glyph] = [await bounds(page.locator(`[data-fixture="${open}"]`)), await bounds(host(page, open).locator('.turn .chevron'))];
      const scale = await page.evaluate(() => devicePixelRatio);
      const [one, other] = await Promise.all([closed, open].map(async (id) => decodePng(await page.locator(`[data-fixture="${id}"]`).screenshot({ animations: 'disabled' }))));
      expect([other.width, other.height]).toEqual([one.width, one.height]);
      const box = { left: (glyph.x - origin.x) * scale - 1, right: (glyph.x + glyph.width - origin.x) * scale + 1, top: (glyph.y - origin.y) * scale - 1, bottom: (glyph.y + glyph.height - origin.y) * scale + 1 };
      let different = 0;
      let turned = 0;
      for (let y = 0; y < one.height; y++) {
        for (let x = 0; x < one.width; x++) {
          if (one.at(x, y) === other.at(x, y)) continue;
          if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) turned++;
          else different++;
        }
      }
      expect(different, `${open}: outside the chevron`).toBe(0);
      expect(turned, `${open}: the chevron`).toBeGreaterThan(0);
    }
  });
});

test.describe('separation', () => {
  test('SPB-26, SPB-31: in the default system the outlined edge and the divider on an outlined, a tonal and an elevated container are the hairline — the color of the divider’s line, each from its own token — and stay it while disabled; a filled container keeps the stronger line; the presets keep what they drew', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const hairline = await resolveColor(page, '--tanrei-sys-color-outline-variant');
    const strong = await resolveColor(page, '--tanrei-sys-color-outline');
    expect(hairline).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
    expect(hairline).not.toBe(strong);
    for (const name of ['outlined-outline-color', 'outlined-disabled-outline-color', 'outlined-divider-color', 'tonal-divider-color', 'elevated-divider-color', 'outlined-disabled-divider-color', 'tonal-disabled-divider-color', 'elevated-disabled-divider-color']) {
      expect(await resolveColor(page, T(name)), name).toBe(hairline);
    }
    // On a filled container the stronger line stays, and its disabled line is disabled content.
    expect(await resolveColor(page, T('filled-divider-color'))).toBe(strong);
    expect(await resolveColor(page, T('filled-disabled-divider-color'))).not.toBe(hairline);
    // Drawn: the divider's line and the halves' inset ring read those tokens.
    const line = (id: string) => host(page, id).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.divider')!, '::before').backgroundColor);
    for (const id of ['outlined-medium', 'outlined-disabled', 'outlined-narrow', 'outlined-open', 'tonal-medium', 'elevated-medium', 'elevated-open']) expect(await line(id), id).toBe(hairline);
    expect(await line('filled-medium')).toBe(strong);
    for (const id of ['outlined-medium', 'outlined-disabled', 'outlined-gap']) {
      for (const half of ['leading', 'trailing'] as const) {
        const shadow = await shadows(page, id, half);
        expect(shadow.startsWith(hairline), `${id} ${half}: the outline is the first layer, in the hairline`).toBe(true);
        expect(shadow, `${id} ${half}`).not.toContain(strong);
      }
    }
    // A disabled tonal and a disabled elevated one keep the hairline too (no fixture: set here).
    for (const id of ['tonal-medium', 'elevated-medium']) {
      await host(page, id).evaluate((el: any) => (el.disabled = true));
      await expect.poll(() => line(id), id).toBe(hairline);
    }
    // The presets pin the outline role on the edge and the rules, and their faded disabled ones.
    for (const system of ['m3-like', 'cupertino']) {
      await mountFixtures(page, spec, { icons: true, system });
      for (const name of ['outlined-outline-color', 'tonal-divider-color', 'elevated-divider-color', 'filled-divider-color']) expect(await resolveColor(page, T(name)), `${system} ${name}`).toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
      expect(await resolveColor(page, T('outlined-disabled-outline-color')), system).not.toBe(await resolveColor(page, T('outlined-outline-color')));
      expect(await resolveColor(page, T('tonal-disabled-divider-color')), system).not.toBe(await resolveColor(page, T('tonal-divider-color')));
    }
  });

  /**
   * The space between the halves, the radius where they face each other, and whether the divider is drawn. In a
   * right-to-left fixture (filled-narrow-rtl) the halves face each other the other way round.
   */
  const form = async (page: P, id: string) => {
    const rtl = await host(page, id).evaluate((el) => getComputedStyle(el).direction === 'rtl');
    const [first, second, a, b] = rtl ? [trailing(page, id), leading(page, id), 'trailing', 'leading'] as const : [leading(page, id), trailing(page, id), 'leading', 'trailing'] as const;
    const [left, right] = [await bounds(first), await bounds(second)];
    return {
      gap: Math.round((right.x - left.x - left.width) * 100) / 100 || 0,
      facing: rtl
        ? [Number.parseFloat(await css(page, id, b, 'border-top-left-radius')), Number.parseFloat(await css(page, id, a, 'border-top-right-radius'))]
        : [Number.parseFloat(await css(page, id, a, 'border-top-right-radius')), Number.parseFloat(await css(page, id, b, 'border-top-left-radius'))],
      divider: await host(page, id).locator('.divider').evaluate((el) => getComputedStyle(el).display !== 'none'),
    };
  };
  const choice = (page: P) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-behavior-separation').trim());

  test('SPB-30: auto takes comp.button-with-menu.container.separation, which follows the system’s choice — divider in the default system, gap in m3-like; an explicit value wins whatever the tokens say', async ({ page }) => {
    const innerGap = await resolveToken(page, T('container-inner-gap'));
    const inner = await resolveToken(page, T('container-inner-shape'));
    const divider = { gap: 0, facing: [0, 0], divider: true };
    const gap = { gap: innerGap, facing: [inner, inner], divider: false };
    expect(await choice(page)).toBe('divider');
    // SPB-30's verify: the -gap fixtures and filled-divider set the prop; every other fixture leaves it auto.
    for (const f of spec.fixtures.filter((f) => !f.props.open)) expect(await form(page, f.id), f.id).toEqual(f.props.separation === 'gap' ? gap : divider);
    expect(spec.fixtures.filter((f) => f.props.separation === 'gap').map((f) => f.id)).toEqual(spec.fixtures.filter((f) => /-gap(-|$)/.test(f.id)).map((f) => f.id));

    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    expect(await choice(page)).toBe('gap');
    const [m3Gap, m3Inner] = [await resolveToken(page, T('container-inner-gap')), await resolveToken(page, T('container-inner-shape'))];
    for (const f of spec.fixtures.filter((f) => !f.props.open)) expect(await form(page, f.id), f.id).toEqual(f.props.separation === 'divider' ? divider : { gap: m3Gap, facing: [m3Inner, m3Inner], divider: false });
  });

  test('SPB-30: auto under a system that sets the component token apart from the system’s choice draws the component’s; an unknown name is divider', async ({ page }) => {
    // The component token is set where a layer sets it: in the cascade, here on the element itself.
    const apart = (name: string) => ({ style: `${T('container-separation')}: ${name}` });
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('apart-gap', apart('gap')), fixture('apart-gap-divider', { ...apart('gap'), separation: 'divider' }), fixture('unknown', apart('zipper'))] });
    expect(await choice(page)).toBe('divider');
    expect((await form(page, 'apart-gap')).divider).toBe(false);
    expect((await form(page, 'apart-gap')).gap).toBe(await resolveToken(page, T('container-inner-gap')));
    expect(await form(page, 'apart-gap-divider')).toEqual({ gap: 0, facing: [0, 0], divider: true });
    expect(await form(page, 'unknown')).toEqual({ gap: 0, facing: [0, 0], divider: true });
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: [fixture('apart-divider', apart('divider')), fixture('apart-divider-gap', { ...apart('divider'), separation: 'gap' })] });
    expect(await choice(page)).toBe('gap');
    expect(await form(page, 'apart-divider')).toEqual({ gap: 0, facing: [0, 0], divider: true });
    expect((await form(page, 'apart-divider-gap')).divider).toBe(false);
  });

  test('SPB-30: a change of separation, or of the system it follows, draws the other form at once, without animation, keeping its open state and its focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: [withMenu('menu', { open: true }), fixture('plain')] });
    await wire(page);
    await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
    const innerGap = await resolveToken(page, T('container-inner-gap'));
    expect((await form(page, 'menu')).gap).toBe(innerGap);
    const where = await focused(page);
    const changed = await host(page, 'menu').evaluate(async (el: any) => {
      el.separation = 'divider';
      await el.updateComplete;
      const [a, b] = [...el.shadowRoot.querySelectorAll('button')];
      const seen = (button: HTMLElement) => {
        const [box, style] = [button.getBoundingClientRect(), getComputedStyle(button)];
        return { left: box.left - Math.min(0, Number.parseFloat(style.marginLeft)), right: box.right + Math.min(0, Number.parseFloat(style.marginRight)) };
      };
      return { gap: seen(b).left - seen(a).right, running: [a, b].flatMap((button: HTMLElement) => button.getAnimations()).filter((animation: any) => /radius|margin|padding|clip|gap/.test(animation.transitionProperty ?? '')).length };
    });
    expect(changed).toEqual({ gap: 0, running: 0 });
    expect(await menuOpen(page, 'menu')).toBe(true);
    expect(await focused(page)).toBe(where);
    await host(page, 'menu').evaluate((el: any) => (el.separation = 'auto'));
    await expect.poll(async () => (await form(page, 'menu')).gap).toBe(innerGap);
    // The token it follows: the page leaves m3-like for the default system, whose choice is divider.
    await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-system'));
    await expect.poll(async () => (await form(page, 'plain')).gap).toBe(0);
    expect((await form(page, 'plain')).divider).toBe(true);
    expect(await host(page, 'menu').evaluate((el: any) => el.open)).toBe(true);
    expect(await focused(page)).toBe(where);
  });

  test('SPB-31: the divider — one line on the seam, divider.thickness thick in its variant’s divider color, centred on the seam, divider.inset short of the top and of the bottom; no space, no press, no semantics; its resting color whatever state a half is in, and the disabled color while disabled', async ({ page }) => {
    const thickness = await resolveToken(page, T('divider-thickness'));
    const inset = await resolveToken(page, T('divider-inset'));
    expect(thickness).toBeGreaterThan(0);
    const line = (id: string) =>
      host(page, id)
        .locator('.divider')
        .evaluate((el) => {
          const [box, drawn] = [el.getBoundingClientRect(), getComputedStyle(el, '::before')];
          return { x: box.left + Number.parseFloat(drawn.left), y: box.top + Number.parseFloat(drawn.top), width: Number.parseFloat(drawn.width), height: Number.parseFloat(drawn.height), space: box.width, color: drawn.backgroundColor, hidden: el.getAttribute('aria-hidden'), press: getComputedStyle(el).pointerEvents };
        });
    // SPB-31's verify: one rule on the seam, 8 short of the top and of the bottom, in sys.color.outline (the outlined one
    // in its own outline color; the disabled one faded as disabled content is).
    for (const [id, variant, state] of [['filled-medium', 'filled', ''], ['tonal-medium', 'tonal', ''], ['elevated-medium', 'elevated', ''], ['outlined-medium', 'outlined', ''], ['filled-large', 'filled', ''], ['filled-open', 'filled', ''], ['filled-disabled', 'filled', 'disabled-'], ['outlined-disabled', 'outlined', 'disabled-']] as const) {
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      const drawn = await line(id);
      const seam = a.x + a.width;
      expect(b.x, id).toBeCloseTo(seam, 1);
      expect(drawn.x + drawn.width / 2, `${id}: centred on the seam`).toBeCloseTo(seam, 1);
      expect(drawn.width, id).toBeCloseTo(thickness, 2);
      expect(drawn.y, id).toBeCloseTo(a.y + inset, 1);
      expect(drawn.height, id).toBeCloseTo(a.height - 2 * inset, 1);
      expect(drawn, id).toMatchObject({ space: 0, hidden: 'true', press: 'none', color: await resolveColor(page, T(`${variant}-${state}divider-color`)) });
    }
    expect(await resolveColor(page, T('filled-divider-color'))).toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
    expect(await resolveColor(page, T('outlined-divider-color'))).toBe(await resolveColor(page, T('outlined-outline-color')));
    expect(await resolveColor(page, T('filled-disabled-divider-color'))).not.toBe(await resolveColor(page, T('filled-divider-color')));
    // Its resting color while a half is hovered, pressed or focused.
    const rest = await resolveColor(page, T('filled-divider-color'));
    await trailing(page, 'filled-medium').hover();
    await page.mouse.down();
    expect((await line('filled-medium')).color).toBe(rest);
    await page.mouse.up();
    await tabTo(page, leading(page, 'filled-medium'));
    expect((await line('filled-medium')).color).toBe(rest);
    // Disabled later: the disabled color.
    await host(page, 'filled-medium').evaluate((el: any) => (el.disabled = true));
    await expect.poll(async () => (await line('filled-medium')).color).toBe(await resolveColor(page, T('filled-disabled-divider-color')));
    // Not in the accessibility tree: two buttons, and nothing between or around them.
    expect(await page.locator('[data-fixture="tonal-medium"]').ariaSnapshot()).toBe('- button "Save"\n- button "More save options"');
    // Under gap none is drawn.
    for (const id of GAP) expect(await host(page, id).locator('.divider').evaluate((el) => getComputedStyle(el).display), id).toBe('none');
  });

  test('SPB-31 / SPB-5: a half’s state layer and focus ring still follow its own shape under divider — the focused half is whole, drawn over the other half and the divider', async ({ page }) => {
    await trailing(page, 'filled-medium').hover();
    await expect.poll(() => css(page, 'filled-medium', 'trailing', 'background-color')).toBe(await resolveColor(page, T('filled-hovered-container-color')));
    expect(await css(page, 'filled-medium', 'leading', 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    await page.mouse.move(1, 1);
    await tabTo(page, trailing(page, 'filled-medium'));
    // The focused half draws its shadows itself, whole: its ::after is the ring, and nothing of it is cut.
    expect(await css(page, 'filled-medium', 'trailing', 'box-shadow')).toBe(await trailing(page, 'filled-medium').evaluate((el) => { const probe = document.createElement('i'); probe.style.boxShadow = getComputedStyle(el).getPropertyValue('--_shadow'); el.append(probe); const drawn = getComputedStyle(probe).boxShadow; probe.remove(); return drawn; }));
    expect(await css(page, 'filled-medium', 'trailing', 'clip', '::after')).toBe('auto');
    expect(Number(await css(page, 'filled-medium', 'trailing', 'z-index'))).toBeGreaterThan(Number(await host(page, 'filled-medium').locator('.divider').evaluate((el) => getComputedStyle(el).zIndex)));
    expect(await css(page, 'filled-medium', 'trailing', 'outline-style')).toBe('solid');
    // The ring's corners are the half's own: square at the seam, round at the outer end.
    const edge = (await resolveToken(page, '--tanrei-sys-focus-offset')) + (await resolveToken(page, '--tanrei-sys-focus-inner-width'));
    expect(Number.parseFloat(await css(page, 'filled-medium', 'trailing', 'border-top-left-radius', '::after'))).toBe(edge);
    expect(Number.parseFloat(await css(page, 'filled-medium', 'trailing', 'border-top-right-radius', '::after'))).toBeGreaterThan(edge);
    // The other half's shadows are still cut at the seam, and it draws none itself.
    expect(await css(page, 'filled-medium', 'leading', 'clip', '::after')).toMatch(/^rect\(/);
    expect(await css(page, 'filled-medium', 'leading', 'box-shadow')).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
    // What is seen of the focused half is what was seen of it before: the label and the chevron do not move.
    const focusedBox = await bounds(trailing(page, 'filled-medium'));
    const chevron = await bounds(host(page, 'filled-medium').locator('.turn .chevron'));
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    expect(await bounds(trailing(page, 'filled-medium'))).toEqual(focusedBox);
    expect(await bounds(host(page, 'filled-medium').locator('.turn .chevron'))).toEqual(chevron);
  });

  test('SPB-32: container.outer-inset is added to the leading half’s start padding, under either separation and at either trailing width, and to the trailing half’s end padding at either width; a narrow trailing half is the chevron’s box, trailing.padding-inline-narrow on each side and the outer padding — a narrow icon-only Button’s width and the outer padding; mirrored in right-to-left; a system sets it to 0', async ({ page }) => {
    const outer = await resolveToken(page, T('container-outer-inset'));
    expect(outer).toBeGreaterThan(0);
    const [start, end, pad, narrowPad, icon] = await Promise.all(['leading-padding-inline-start-medium', 'leading-padding-inline-end-medium', 'trailing-padding-inline-medium', 'trailing-padding-inline-narrow-medium', 'icon-size-medium'].map((name) => resolveToken(page, T(name))));
    const measure = async (id: string) => {
      const [a, b] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      const [label, chevron] = [await bounds(host(page, id).locator('.label')), await bounds(host(page, id).locator('.turn .chevron'))];
      const round = (value: number) => Math.round(value * 100) / 100;
      return {
        labelFromStart: round(label.x - a.x),
        labelFromSeam: round(a.x + a.width - label.x - label.width),
        trailing: round(b.width),
        chevronFromSeam: round(chevron.x + chevron.width / 2 - b.x),
        chevronFromEnd: round(b.x + b.width - chevron.x - chevron.width / 2),
      };
    };
    // SPB-32's verify, filled-medium: the label 20 from the start edge and 16 from the leading half's end edge; the
    // trailing half 44 wide, its chevron's centre 20 from the seam and 24 from the end edge.
    const wide = { labelFromStart: start + outer, labelFromSeam: end, trailing: icon + 2 * pad + outer, chevronFromSeam: pad + icon / 2, chevronFromEnd: pad + icon / 2 + outer };
    expect(wide).toEqual({ labelFromStart: 20, labelFromSeam: 16, trailing: 44, chevronFromSeam: 20, chevronFromEnd: 24 });
    // filled-narrow, outlined-narrow, filled-gap-narrow and outlined-gap-narrow: the trailing half is 36 wide — the
    // outer padding included — and its chevron's centre 16 from the seam (or from the gap) and 20 from the end edge; the
    // leading half is as in filled-medium.
    const narrow = { ...wide, trailing: icon + 2 * narrowPad + outer, chevronFromSeam: narrowPad + icon / 2, chevronFromEnd: narrowPad + icon / 2 + outer };
    expect(narrow).toEqual({ labelFromStart: 20, labelFromSeam: 16, trailing: 36, chevronFromSeam: 16, chevronFromEnd: 20 });
    for (const id of ['filled-medium', 'filled-divider', 'filled-gap', 'outlined-medium', 'outlined-gap', 'filled-open', 'filled-disabled']) expect(await measure(id), id).toEqual(wide);
    for (const id of ['filled-narrow', 'outlined-narrow', 'filled-gap-narrow', 'outlined-gap-narrow', 'filled-narrow-open']) expect(await measure(id), id).toEqual(narrow);
    // The width of the Button fixture filled-icon-narrow — glyph and inset twice, by the Button's own tokens — and the outer padding.
    expect(narrow.trailing - outer).toBe((await resolveToken(page, '--tanrei-comp-button-icon-size-without-label-medium')) + 2 * (await resolveToken(page, '--tanrei-comp-button-container-padding-inline-narrow-medium')));
    // The two separations draw it at one width; under gap the halves stand inner-gap apart and the narrow half's inner
    // corners are the inner shape, its outline closed on its own (outlined-gap-narrow).
    {
      const gap = await resolveToken(page, T('container-inner-gap'));
      for (const [divider, gapped] of [['filled-narrow', 'filled-gap-narrow'], ['outlined-narrow', 'outlined-gap-narrow']] as const) {
        const [a, b] = [await bounds(leading(page, gapped)), await bounds(trailing(page, gapped))];
        expect(b.x - a.x - a.width, gapped).toBeCloseTo(gap, 2);
        expect(b.width, gapped).toBe((await bounds(trailing(page, divider))).width);
        expect((await bounds(host(page, gapped))).width - (await bounds(host(page, divider))).width, gapped).toBeCloseTo(gap, 2);
        expect(await css(page, divider, 'trailing', 'border-top-left-radius'), divider).toBe('0px');
        expect(await css(page, gapped, 'trailing', 'border-top-left-radius'), gapped).toBe(`${await resolveToken(page, T('container-inner-shape'))}px`);
      }
      // Under gap no edge is a seam, so the narrow half's outline — an inset ring — is whole and closes on its own.
      expect(await css(page, 'outlined-gap-narrow', 'trailing', '--tanrei-group-seam-start')).toBe('');
      expect(await shadows(page, 'outlined-gap-narrow', 'trailing')).toContain('inset');
    }
    // The narrow half follows the outer padding as the leading half does: at 0 it is a narrow icon-only Button's width.
    {
      const name = T('container-outer-inset');
      const slim = (value: number) => ({ ...narrow, labelFromStart: start + value, trailing: icon + 2 * narrowPad + value, chevronFromEnd: narrowPad + icon / 2 + value });
      await host(page, 'filled-narrow').evaluate((el, n) => (el as HTMLElement).style.setProperty(n, '12px'), name);
      expect(await measure('filled-narrow')).toEqual(slim(12));
      await host(page, 'filled-narrow').evaluate((el, n) => (el as HTMLElement).style.setProperty(n, '0px'), name);
      expect(await measure('filled-narrow')).toEqual(slim(0));
      await host(page, 'filled-narrow').evaluate((el, n) => (el as HTMLElement).style.removeProperty(n), name);
      // Its inset is its own token: a system that wants a wider handle raises it, and the chevron stays at the centre.
      await host(page, 'filled-narrow').evaluate((el, n) => (el as HTMLElement).style.setProperty(n, '10px'), T('trailing-padding-inline-narrow-medium'));
      expect(await measure('filled-narrow')).toEqual({ ...narrow, trailing: icon + 20 + outer, chevronFromSeam: 10 + icon / 2, chevronFromEnd: 10 + icon / 2 + outer });
      await host(page, 'filled-narrow').evaluate((el, n) => (el as HTMLElement).style.removeProperty(n), T('trailing-padding-inline-narrow-medium'));
    }
    // filled-narrow-rtl: the same, mirrored — the start is the right, the narrow half at the left.
    {
      const id = 'filled-narrow-rtl';
      const [a, t] = [await bounds(leading(page, id)), await bounds(trailing(page, id))];
      const [label, chevron] = [await bounds(host(page, id).locator('.label')), await bounds(host(page, id).locator('.turn .chevron'))];
      const round = (value: number) => Math.round(value * 100) / 100;
      expect({
        labelFromStart: round(a.x + a.width - label.x - label.width),
        labelFromSeam: round(label.x - a.x),
        trailing: round(t.width),
        chevronFromSeam: round(t.x + t.width - chevron.x - chevron.width / 2),
        chevronFromEnd: round(chevron.x + chevron.width / 2 - t.x),
      }).toEqual(narrow);
      expect(t.x).toBeLessThan(a.x);
    }
    // The chevron sits half the padding nearer the seam than the middle of its half.
    const b = await bounds(trailing(page, 'filled-medium'));
    expect(b.width / 2 - (await measure('filled-medium')).chevronFromSeam).toBeCloseTo(outer / 2, 2);
    // Right-to-left: the start is the right.
    await page.locator('[data-fixture="filled-gap"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const [a, t] = [await bounds(leading(page, 'filled-gap')), await bounds(trailing(page, 'filled-gap'))];
    const [label, chevron] = [await bounds(host(page, 'filled-gap').locator('.label')), await bounds(host(page, 'filled-gap').locator('.turn .chevron'))];
    expect(t.x).toBeLessThan(a.x);
    expect(a.x + a.width - label.x - label.width).toBeCloseTo(start + outer, 1);
    expect(chevron.x - t.x).toBeCloseTo(pad + outer, 1);
    // A system whose ends are no rounder than its inner corners sets the token to 0 (cupertino and the m3 presets do).
    await host(page, 'filled-medium').evaluate((el, name) => (el as HTMLElement).style.setProperty(name, '0px'), T('container-outer-inset'));
    expect(await measure('filled-medium')).toEqual({ ...wide, labelFromStart: start, trailing: icon + 2 * pad, chevronFromEnd: pad + icon / 2 });
  });
});

// ── React (packages/react): the wrappers are generated from the manifest (scripts/generate.js) ────────────────────
// packages/react has no browser tests and the workspace has no react-dom, so the two ways a wrapper delivers an event are
// reproduced exactly as they reach the DOM. @lit/react's createComponent adds a listener ON THE ELEMENT for every prop
// in its `events` map (create-component.js, `addOrUpdateEventListener`); every other `on*` prop — `onClick` of a
// wrapper that does not map it — goes to React, which delivers it from the one listener React 17+ puts on its root
// container, dispatching along its own tree from the event's target. The test checks the generated map, then drives
// both paths in the page.
// What is painted where the halves meet under a divider, read from the pixels (test/seam.ts): every fixture here sets
// `separation="divider"`, so it draws the same under a preset whose own choice is gap.
test.describe('seams', () => {
  const divided = (id: string, props: Fixture['props'], direction?: 'rtl'): Fixture => ({ ...fixture(id, { separation: 'divider', ...props }), ...(direction ? { direction } : {}) });
  const SEAMS: Fixture[] = [
    divided('seam-filled', { variant: 'filled' }),
    divided('seam-filled-disabled', { variant: 'filled', disabled: true }),
    divided('seam-tonal', { variant: 'tonal' }),
    divided('seam-tonal-disabled', { variant: 'tonal', disabled: true }),
    divided('seam-outlined', { variant: 'outlined' }),
    divided('seam-outlined-open', { variant: 'outlined', open: true }),
    divided('seam-outlined-disabled', { variant: 'outlined', disabled: true }),
    // The elevation's ring is inside each half (SPB-26): it runs through the seam with the outline.
    divided('seam-elevated', { variant: 'elevated' }),
    divided('seam-elevated-disabled', { variant: 'elevated', disabled: true }),
    // The narrow trailing half (SPB-32): 32 / 36 / 36 wide with its outer padding, its round end
    // beginning 16 past the seam at small and medium and 8 past it at large.
    divided('seam-outlined-narrow', { variant: 'outlined', trailingWidth: 'narrow' }),
    divided('seam-filled-narrow', { variant: 'filled', trailingWidth: 'narrow' }),
    divided('seam-filled-narrow-disabled', { variant: 'filled', trailingWidth: 'narrow', disabled: true }),
    divided('seam-elevated-narrow', { variant: 'elevated', trailingWidth: 'narrow' }),
    divided('seam-outlined-narrow-open', { variant: 'outlined', trailingWidth: 'narrow', open: true }),
    divided('seam-outlined-narrow-small', { variant: 'outlined', trailingWidth: 'narrow', size: 'small' }),
    divided('seam-outlined-narrow-large', { variant: 'outlined', trailingWidth: 'narrow', size: 'large' }),
    divided('seam-tonal-narrow-large-disabled', { variant: 'tonal', trailingWidth: 'narrow', size: 'large', disabled: true }),
    divided('seam-rtl-outlined-narrow', { variant: 'outlined', trailingWidth: 'narrow' }, 'rtl'),
    divided('seam-rtl-filled-narrow-disabled', { variant: 'filled', trailingWidth: 'narrow', disabled: true }, 'rtl'),
    divided('seam-outlined-small', { variant: 'outlined', size: 'small' }),
    divided('seam-filled-large-disabled', { variant: 'filled', size: 'large', disabled: true }),
    divided('seam-rtl-outlined', { variant: 'outlined' }, 'rtl'),
    divided('seam-rtl-filled-disabled', { variant: 'filled', disabled: true }, 'rtl'),
  ];
  const VIEW = { width: 480, height: 2400 };
  /** Draws the fixtures on the page a seam is read on and reads each one's seam; returns what was off. */
  const read = async (page: P, options: { theme: 'light' | 'dark'; system?: string; offset: number }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: SEAMS, theme: options.theme, ...(options.system ? { system: options.system } : {}) });
    await stageBehind(page, options.offset);
    await measured(page);
    const inset = await resolveToken(page, T('divider-inset'));
    const shot = await shoot(page);
    const off: string[] = [];
    let lines = 0;
    for (const f of SEAMS) {
      const [first, second] = [await shot.box(leading(page, f.id)), await shot.box(trailing(page, f.id))];
      // A half is straight from the seam to where its outer end begins to turn: its width less its outer corner's
      // radius (a round cap's is half its height). A part's own color is read no further from the seam than that: a
      // large narrow trailing half of the default system (36 wide, 56 high) is straight for 8, and a preset's narrow
      // half (26 wide, 40 high under m3-like) for 6.
      const straight = await host(page, f.id).evaluate((el) =>
        Math.min(
          ...[...el.shadowRoot!.querySelectorAll('button.leading, button.trailing')].map((half) => {
            const [own, style] = [half.getBoundingClientRect(), getComputedStyle(half)];
            const radius = Math.max(...['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => Number.parseFloat(style.getPropertyValue(`border-${corner}-radius`)) || 0));
            return own.width - Math.min(radius, own.height / 2);
          }),
        ),
      );
      const reference = Math.floor(straight - 0.5);
      const result = readSeam(shot, first, second, { inset: inset * shot.ratio, expect: 'one', reference });
      lines += result.lines;
      off.push(...result.off.map((what) => `${f.id}: ${what}`));
    }
    return { off, lines, inset };
  };

  test('SPB-26, SPB-31: no pixel of a fill, of the outline or of the elevation’s ring is painted twice where the halves meet, and none of the page shows there — a line of pixels through the seam, above and below the rule, is one color (filled, tonal, outlined, elevated; disabled, whose fills are translucent; open; narrow; each size), so the outline and the ring run through the seam in one even color; left-to-right and right-to-left, light and dark, at 1, 2 and 3 device pixels per pixel and half a device pixel off the grid', async ({ browser }) => {
    test.slow();
    for (const theme of ['light', 'dark'] as const) {
      for (const ratio of [1, 2, 3]) {
        for (const offset of [0, 0.5]) {
          const result = await atRatio(browser, ratio, (page) => read(page, { theme, offset }), VIEW);
          expect(result.inset, 'the rule stops short of the edge, so there are lines to read').toBeGreaterThan(2);
          expect(result.lines).toBeGreaterThan(0);
          expect(result.off, `${theme}, ${ratio}x, ${offset} off the grid`).toEqual([]);
        }
      }
    }
  });

  for (const system of ['cupertino', 'm3-like', 'm3-expressive-like']) {
    test(`SPB-26, SPB-31: the same under ${system} — its outline widths, its corners, its fills and its elevation meet at the seam without a pixel painted twice`, async ({ browser }) => {
      // Four pages of two dozen seams each, at two device pixels per pixel.
      test.slow();
      for (const theme of ['light', 'dark'] as const) {
        for (const offset of [0, 0.5]) {
          const result = await atRatio(browser, 2, (page) => read(page, { theme, system, offset }), VIEW);
          expect(result.lines).toBeGreaterThan(0);
          expect(result.off, `${system}, ${theme}, ${offset} off the grid`).toEqual([]);
        }
      }
    });
  }

  test('SPB-26: a half under a divider is a box that ends at the seam and paints its fill; its outline and its elevation are its ::after’s, which reaches past the seam and is cut there — mirrored in right-to-left; under gap nothing is cut', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...SEAMS, fixture('seam-gap', { variant: 'outlined', separation: 'gap' })] });
    await measured(page);
    const drawn = (id: string, half: 'leading' | 'trailing') =>
      host(page, id)
        .locator(`button.${half}`)
        .evaluate((el) => {
          const [own, after, box] = [getComputedStyle(el), getComputedStyle(el, '::after'), el.getBoundingClientRect()];
          const rect = /rect\((.+)\)/.exec(after.clip)?.[1].split(/,\s*/).map(Number.parseFloat) ?? null;
          const [top, right, bottom, left] = ['top', 'right', 'bottom', 'left'].map((side) => Number.parseFloat(after.getPropertyValue(side)));
          // The cut, as distances from the half's own edges: 0 is the edge itself (the seam), negative is beyond it.
          const cut = rect && { top: rect[0] + top, left: rect[3] + left, right: box.width - left - rect[1], bottom: box.height - top - rect[2] };
          return { own: own.boxShadow, after: after.boxShadow, margins: [own.marginLeft, own.marginRight], past: { top, right, bottom, left }, cut };
        });
    const bleed = await resolveToken(page, '--tanrei-sys-space-space50');
    const reach = await resolveToken(page, '--tanrei-sys-target-touch');
    for (const [id, seams] of [['seam-outlined', { leading: 'right', trailing: 'left' }], ['seam-rtl-outlined', { leading: 'left', trailing: 'right' }], ['seam-elevated', { leading: 'right', trailing: 'left' }]] as const) {
      for (const half of ['leading', 'trailing'] as const) {
        const part = await drawn(id, half);
        expect(part.own, `${id} ${half}: the half draws no shadow`).toMatch(/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/);
        expect(part.after, `${id} ${half}: its ::after draws the outline`).toContain('inset');
        expect(part.margins, `${id} ${half}: the half's box ends at the seam`).toEqual(['0px', '0px']);
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          const seam = seams[half] === side;
          expect(part.past[side], `${id} ${half} ${side}: reaches past the seam`).toBeCloseTo(seam ? -bleed : 0, 2);
          if (seam) expect(Math.abs(part.cut![side]), `${id} ${half} ${side}: cut at the seam`).toBeLessThan(0.01);
          else expect(part.cut![side], `${id} ${half} ${side}: room for the elevation`).toBeLessThan(-reach + 0.01);
        }
      }
    }
    // The halves touch: the trailing half begins where the leading one ends.
    const [a, b] = [await bounds(leading(page, 'seam-outlined')), await bounds(trailing(page, 'seam-outlined'))];
    expect(b.x).toBeCloseTo(a.x + a.width, 3);
    // Under gap no edge is a seam.
    for (const half of ['leading', 'trailing'] as const) {
      const part = await drawn('seam-gap', half);
      expect(part.past).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
      for (const side of ['top', 'right', 'bottom', 'left'] as const) expect(part.cut![side]).toBeLessThan(-reach + 0.01);
    }
    // The measured size follows the half: a longer label moves the cut with the seam.
    await host(page, 'seam-outlined').evaluate((el) => el.setAttribute('label', 'Save every open document'));
    await expect.poll(async () => Math.abs((await drawn('seam-outlined', 'leading')).cut!.right)).toBeLessThan(0.01);
  });
});

test.describe('React wrappers', () => {
  // Each wrapper is generated into a module of its own, named after its tag without the prefix (MenuItem: menu-item.ts).
  const wrapper = (name: string) =>
    fs.readFileSync(new URL(`../../../../react/src/generated/wrappers/${name.replace(/(?<!^)[A-Z]/g, (letter) => `-${letter}`).toLowerCase()}.ts`, import.meta.url), 'utf8');

  test('SPB-16: a MenuItem’s onClick inside a ButtonWithMenu fires (a listener on the item), ButtonWithMenu’s onClick does not fire for an item, and an ordinary Menu works as before', async ({ page }) => {
    // The map: the menu item kinds listen to click on the element; nothing else does. What is asserted is the entry of
    // the events map (the prop and the native event it listens to), not how the event is typed: the handler's type is
    // the generator's and is checked where it is used (packages/react/test/types.tsx).
    for (const name of ['MenuItem', 'MenuCheckboxItem', 'MenuRadioItem']) expect(wrapper(name), name).toMatch(/^ {4}onClick: 'click' as EventName<.+>,$/m);
    for (const name of ['Menu', 'MenuGroup', 'Button', 'ButtonWithMenu']) expect(wrapper(name), name).not.toContain("onClick: 'click'");

    const content = `${ITEMS}<tanrei-menu-checkbox-item slot="menu" label="Compress"></tanrei-menu-checkbox-item>`;
    await mountFixtures(page, spec, { icons: true, fixtures: [withMenu('menu', {}, content)] });
    await page.evaluate(() => {
      const log: string[] = ((window as any).log = []);
      const main = document.querySelector('main')!;
      // React's root listener: a synthetic onClick is dispatched from the event's target up React's tree, so the
      // ButtonWithMenu's onClick would run for any click the root sees whose target is the button with menu or inside it.
      main.addEventListener('click', (e) => {
        const target = e.target as Element;
        log.push(`root:${target.localName}${target.getAttribute('label') ? `[${target.getAttribute('label')}]` : ''}`);
      });
      const split = main.querySelector('tanrei-button-with-menu') as HTMLElement & { open: boolean };
      // The events the ButtonWithMenu wrapper maps (custom events), as the product sets open from them.
      split.addEventListener('toggle', (e) => (split.open = (e as CustomEvent).detail.open));
      split.addEventListener('close', () => (split.open = false));
      // The mapped onClick of each item: a listener on the element.
      for (const item of split.querySelectorAll('[slot="menu"]')) item.addEventListener('click', () => log.push(`onClick:${item.getAttribute('label')}`));
    });
    const reset = () => page.evaluate(() => ((window as any).log.length = 0));
    await leading(page, 'menu').click();
    expect(await log(page)).toEqual(['root:tanrei-button-with-menu[Save]']); // ButtonWithMenu's onClick: the leading half
    for (const label of ['Save a copy', 'Compress']) {
      await reset();
      await trailing(page, 'menu').click();
      await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
      await host(page, 'menu').locator(`[label="${label}"]`).click();
      // The item's onClick fires; nothing reaches the root, so ButtonWithMenu's onClick cannot run for it.
      expect(await log(page), label).toEqual([`onClick:${label}`]);
    }

    // An ordinary Menu: the item's click reaches its own listener and, as before, the root too.
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.innerHTML = '<button id="plain-anchor" type="button">Edit</button><tanrei-menu anchor="plain-anchor"><tanrei-menu-item label="Copy"></tanrei-menu-item></tanrei-menu>';
      document.querySelector('main')!.append(stage);
      const menu = stage.querySelector('tanrei-menu') as HTMLElement & { open: boolean };
      menu.addEventListener('close', () => (menu.open = false));
      const item = stage.querySelector('tanrei-menu-item')!;
      item.addEventListener('click', () => (window as any).log.push('onClick:Copy'));
      menu.open = true;
    });
    await reset();
    await page.locator('tanrei-menu-item[label="Copy"]').click();
    expect(await log(page)).toEqual(['onClick:Copy', 'root:tanrei-menu-item[Copy]']);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, closed and with the menu open', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
    // Reduced motion: the surface is whole at once, not measured mid-fade.
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [withMenu('menu')] });
    await wire(page);
    await trailing(page, 'menu').click();
    await expect.poll(() => menuOpen(page, 'menu')).toBe(true);
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations, results.violations.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('the halves grow together with 200% text size instead of clipping', async ({ page }) => {
    const before = await bounds(leading(page, 'filled-medium'));
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const [a, b] = [await bounds(leading(page, 'filled-medium')), await bounds(trailing(page, 'filled-medium'))];
    expect(a.height).toBeGreaterThanOrEqual(before.height * 2);
    expect(b.height).toBe(a.height);
    expect(await leading(page, 'filled-medium').locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});

test.describe('fixtures', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
