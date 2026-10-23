// <tanrei-fab-menu>, driven by specs/fab-menu.spec.json: every behaviour id (FBM-1…24) is cited by a test title, every
// fixture has a baseline, and every state, size and choice of kind is read back from the tokens — never from a number
// written here. The FAB menu lives in the m3-like layer: its fixtures are drawn under m3-like (the harness draws a
// component that lives in a layer under that layer's system), and a choice of kind another system makes is read under a
// product on that system that includes the FAB menu from m3-like (`includingSystem`), as acme does.
// FBM-28: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, iconFaceArrives, includingSystem, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('fab-menu');
type P = Page;
const T = (name: string) => `--tanrei-comp-fab-menu-${name}`;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-fab-menu`);
const toggle = (page: P, id: string) => host(page, id).locator('button.toggle');
const list = (page: P, id: string) => host(page, id).locator('.list');
const item = (page: P, id: string, label: string) => host(page, id).locator(`tanrei-fab-menu-item[label="${label}"]`);
const box = (page: P, id: string, label: string) => item(page, id, label).locator('.container');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const cssOf = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** The shadow a `shadow` token resolves to, as the browser serializes a box-shadow. */
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);
/** An easing token as the browser computes it on a real property. */
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);
/** Chromium and Firefox serialize a family with spaces in quotes, WebKit without. */
const familyToken = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('span');
    probe.style.fontFamily = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).fontFamily.replaceAll('"', '');
    probe.remove();
    return value;
  }, name);

const ITEMS = spec.fixtures[0].items!;
/** A test's own FAB menu: the real overlay (not in place), the spec's three items, the add glyph. */
const fixture = (id: string, props: Fixture['props'] = {}, items = ITEMS): Fixture => ({ id, props: { label: 'Create', inline: false, ...props }, slots: { icon: 'add' }, items });
const labelled = (...labels: string[]) => labels.map((label) => ({ kind: 'item', props: { label, icon: 'star' } }));

/**
 * The product's side, as the docs write it: it sets open from toggle and to false from close. Everything the element
 * and its items emit is logged in order, in the page.
 */
async function wire(page: P, { product = true }: { product?: boolean } = {}) {
  await page.evaluate((drive) => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-fab-menu')) {
      const menu = el as HTMLElement & { open: boolean };
      menu.addEventListener('toggle', (e) => {
        log.push(`toggle:${(e as CustomEvent).detail.open}`);
        if (drive) menu.open = (e as CustomEvent).detail.open;
      });
      menu.addEventListener('close', (e) => {
        log.push(`close:${(e as CustomEvent).detail.reason}`);
        if (drive) menu.open = false;
      });
      // A click that reaches the element is an item's: the toggle's stops at the shadow root.
      menu.addEventListener('click', (e) => log.push(`host-click:${(e.target as Element).getAttribute('label') ?? (e.target as Element).localName}`));
      for (const it of menu.querySelectorAll('tanrei-fab-menu-item')) it.addEventListener('click', () => log.push(`item:${it.getAttribute('label')}`));
    }
  }, product);
}
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
const shown = (page: P, id: string) => list(page, id).evaluate((el) => el.matches(':popover-open'));
/** The element focus is on, through shadow roots: `button.toggle`, `item[Folder]`, `button#after`. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return null;
    if (active.localName === 'tanrei-fab-menu-item') return `item[${active.getAttribute('label')}]`;
    return `${active.localName}${active.id ? `#${active.id}` : active.classList.length ? `.${active.classList[0]}` : ''}`;
  });
/** Buttons before and after the stages, for focus that goes on (FBM-15) and presses outside (FBM-14). */
const surround = (page: P) =>
  page.evaluate(() => {
    const main = document.querySelector('main')!;
    const make = (id: string) => {
      const button = document.createElement('button');
      button.id = id;
      button.textContent = id;
      button.addEventListener('click', () => ((window as any).log ??= []).push(`page:${id}`));
      return button;
    };
    main.prepend(make('before'));
    main.append(make('after'));
  });
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

test.describe('behavior', () => {
  // Building the acme fixture system, and the products that include the FAB menu, takes longer than a test's budget on a
  // busy machine: once per worker, up front.
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
    await includingSystem('tanrei', 'fab-menu', 'm3-like');
    await includingSystem('cupertino', 'fab-menu', 'm3-like');
  });

  test('FBM-1: pointer, Enter and Space on the toggle emit toggle once with the opposite of open; Down and Up Arrow ask to open a closed menu; the product opens it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await toggle(page, 'menu').click();
    expect(await log(page)).toEqual(['toggle:true']);
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    // A press on the toggle while open is the toggle's, not a press outside (FBM-15): no close.
    await toggle(page, 'menu').click();
    expect(await log(page)).toEqual(['toggle:true', 'toggle:false']);
    await expect.poll(() => shown(page, 'menu')).toBe(false);

    // The keys, on a FAB menu whose product only listens: each asks once.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('asks')] });
    await wire(page, { product: false });
    await toggle(page, 'asks').focus();
    for (const key of ['Enter', 'Space', 'ArrowDown', 'ArrowUp']) await page.keyboard.press(key);
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'toggle:true', 'toggle:true']);
    await host(page, 'asks').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await toggle(page, 'asks').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown'); // open already: nothing to ask
    await page.keyboard.press('ArrowUp');
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'toggle:true', 'toggle:true', 'toggle:false']);
    // The arrows do not scroll the page.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('FBM-2: a disabled FAB menu emits no toggle or close, takes no focus, exposes disabled, and is drawn closed with no items whatever open says', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('off', { disabled: true, open: true }), fixture('closed')] });
    await wire(page);
    await toggle(page, 'off').click({ force: true });
    await toggle(page, 'off').evaluate((el) => (el as HTMLElement).click());
    await host(page, 'off').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await page.mouse.click(2, 2);
    expect(await log(page)).toEqual([]);
    await expect(toggle(page, 'off')).toBeDisabled();
    await expect(host(page, 'off').getByRole('button', { name: 'Create', disabled: true })).toHaveCount(1);
    expect(await focused(page)).not.toBe('button#toggle');
    expect(await shown(page, 'off')).toBe(false);
    await expect(toggle(page, 'off')).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page, 'off')).not.toHaveClass(/open/);
    expect(await cssOf(toggle(page, 'off'), 'border-top-left-radius')).toBe(await cssOf(toggle(page, 'closed'), 'border-top-left-radius'));
    // Enabled again, open as it was: the items are presented.
    await host(page, 'off').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(() => shown(page, 'off')).toBe(true);
  });

  test('FBM-3: under acme, the toggle closed and open and each item render their own state from their own parts — pressed over focused over hovered; pointer focus is not focused', async ({ page }) => {
    test.setTimeout(120_000);
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss() });
    const bg = (locator: Locator) => () => cssOf(locator, 'background-color');
    const colors = async (part: string) => Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`filled-${s}${part}`))));
    const [rest, hovered, focusedColor, pressed] = await colors('container-color');
    expect(new Set([rest, hovered, focusedColor, pressed]).size).toBe(4);

    // The closed toggle.
    const closed = toggle(page, 'filled-closed');
    await closed.hover();
    await expect.poll(bg(closed)).toBe(hovered);
    await page.mouse.down(); // hovered AND pressed: pressed wins
    await expect.poll(bg(closed)).toBe(pressed);
    await page.mouse.up();
    await page.mouse.move(1, 1);
    // Focus the pointer gave is not the focused state.
    await expect.poll(bg(closed)).toBe(rest);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, closed);
    await expect.poll(bg(closed)).toBe(focusedColor);
    await closed.hover(); // hovered AND focused: focused wins
    await expect.poll(bg(closed)).toBe(focusedColor);
    await expect.poll(() => cssOf(closed, 'color')).toBe(await resolveColor(page, T('filled-focused-icon-color')));

    // The open toggle, from its open parts.
    const [openRest, openHovered] = await colors('open-container-color').then((c) => [c[0], c[1]]);
    const open = toggle(page, 'filled-open');
    expect(await bg(open)()).toBe(openRest);
    await open.hover();
    await expect.poll(bg(open)).toBe(openHovered);

    // An item, from the item parts: hovered; pressed over hovered; then the real overlay opened from the keyboard.
    const [itemRest, itemHovered, itemFocused, itemPressed] = await colors('item-container-color');
    expect(new Set([itemRest, itemHovered, itemFocused, itemPressed]).size).toBe(4);
    const folder = box(page, 'filled-open', 'Folder');
    await folder.hover();
    await expect.poll(bg(folder)).toBe(itemHovered);
    await expect.poll(() => cssOf(folder, 'color')).toBe(await resolveColor(page, T('filled-hovered-item-label-color')));
    expect(await bg(box(page, 'filled-open', 'Upload'))()).toBe(itemRest);
    await page.mouse.down();
    await expect.poll(bg(folder)).toBe(itemPressed);
    // Leaving before the release: no activation, and the pointer's focus is not the focused state.
    await page.mouse.move(1, 1);
    await page.mouse.up();
    await expect.poll(bg(folder)).toBe(itemRest);

    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fixture('real')] });
    await wire(page);
    await tabTo(page, toggle(page, 'real'));
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focused(page)).toBe('item[Document]');
    const doc = box(page, 'real', 'Document');
    await expect.poll(bg(doc)).toBe(itemFocused);
    await doc.hover(); // focused over hovered
    await expect.poll(bg(doc)).toBe(itemFocused);
    await page.keyboard.down('Space'); // pressed over both, until the key comes up
    await expect.poll(bg(doc)).toBe(itemPressed);
    await page.keyboard.up('Space');
  });

  test('FBM-4: keyboard focus shows the ring around the toggle or the item that has it, at once; pointer focus does not', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await surround(page);
    // Opened by the pointer: the first item has focus, and no ring.
    await toggle(page, 'menu').click();
    await expect.poll(() => focused(page)).toBe('item[Document]');
    expect(await cssOf(box(page, 'menu', 'Document'), 'outline-style')).toBe('none');
    expect(await cssOf(toggle(page, 'menu'), 'outline-style')).toBe('none');
    await page.keyboard.press('Escape');
    await expect.poll(() => focused(page)).toBe('button#toggle');

    await page.locator('#before').focus();
    await tabTo(page, toggle(page, 'menu'));
    const ring = async (locator: Locator) => ({
      style: await cssOf(locator, 'outline-style'),
      width: await cssOf(locator, 'outline-width'),
      offset: await cssOf(locator, 'outline-offset'),
      animated: (await cssOf(locator, 'transition-property')).includes('outline'),
    });
    const expected = { style: 'solid', width: `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`, offset: `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`, animated: false };
    expect(await ring(toggle(page, 'menu'))).toEqual(expected);
    // Opened from the keyboard: the item has the ring, around its own shape, and the toggle has none.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focused(page)).toBe('item[Document]');
    expect(await ring(box(page, 'menu', 'Document'))).toEqual(expected);
    expect(await cssOf(box(page, 'menu', 'Document'), 'border-top-left-radius', '::after')).not.toBe('0px');
    expect(await cssOf(toggle(page, 'menu'), 'outline-style')).toBe('none');
    expect(await cssOf(box(page, 'menu', 'Folder'), 'outline-style')).toBe('none');
  });

  test('FBM-5: the small toggle’s hit area meets the target on both axes without changing its size; each item is at least the target tall and its whole container is its hit area', async ({ page }) => {
    // Two stages, both inside the window, so the pointer reaches them.
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'small-closed' || f.id === 'filled-open') });
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const small = await resolveToken(page, T('container-size-small'));
    expect(small).toBeLessThan(pointer);
    const square = await bounds(toggle(page, 'small-closed'));
    expect([square.width, square.height]).toEqual([small, small]);
    const hit = await toggle(page, 'small-closed').evaluate((el) => {
      const r = getComputedStyle(el, '::before');
      return [Number.parseFloat(r.width), Number.parseFloat(r.height)];
    });
    expect(Math.min(...hit)).toBeGreaterThanOrEqual(pointer);
    // A press just outside the square, inside the target, on every side, is the toggle's.
    await wire(page, { product: false });
    const [cx, cy, d] = [square.x + square.width / 2, square.y + square.height / 2, (pointer - small) / 4];
    for (const [x, y] of [[cx, square.y - d], [cx, square.y + square.height + d], [square.x - d, cy], [square.x + square.width + d, cy]]) await page.mouse.click(x, y);
    expect(await log(page)).toEqual(['toggle:true', 'toggle:true', 'toggle:true', 'toggle:true']);

    // The items: at least item.height and the target tall; every point of the container is the item's.
    const height = await resolveToken(page, T('item-height'));
    for (const label of ['Document', 'Folder', 'Upload']) {
      const b = await bounds(box(page, 'filled-open', label));
      expect(b.height, label).toBeGreaterThanOrEqual(Math.max(height, pointer));
      const hits = await page.evaluate(
        ([points]) => points.map(([x, y]) => (document.elementFromPoint(x, y) as Element | null)?.getAttribute('label') ?? null),
        [[[b.x + 1, b.y + 1], [b.x + b.width - 1, b.y + b.height - 1], [b.x + b.width / 2, b.y + b.height / 2]]] as const,
      );
      expect(hits, label).toEqual([label, label, label]);
    }
  });

  test('FBM-5: a coarse pointer extends the toggle’s hit area to sys.target.touch and keeps each item at least that tall', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    await mountFixtures(page, spec, { icons: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await toggle(page, 'small-closed').evaluate((el) => {
      const r = getComputedStyle(el, '::before');
      return [Number.parseFloat(r.width), Number.parseFloat(r.height)];
    });
    expect(hit).toEqual([touch, touch]);
    expect((await bounds(box(page, 'filled-open', 'Folder'))).height).toBeGreaterThanOrEqual(Math.max(touch, await resolveToken(page, T('item-height'))));
  });

  test('FBM-6: disabled renders the toggle’s container, icon, elevation and opacity from the disabled tokens of its variant’s closed parts', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const drawn = await toggle(page, 'filled-disabled').evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, opacity: s.opacity };
    });
    expect(drawn).toEqual({
      bg: await resolveColor(page, T('filled-disabled-container-color')),
      color: await resolveColor(page, T('filled-disabled-icon-color')),
      shadow: await resolveShadow(page, T('filled-disabled-container-elevation')),
      opacity: await token(page, T('disabled-opacity')),
    });
  });

  test('FBM-7: a variant or size the active design system does not have renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('plain'), fixture('odd-variant', { variant: 'sparkly' }), fixture('odd-size', { size: 'colossal' })] });
    expect(await cssOf(toggle(page, 'odd-variant'), 'background-color')).toBe(await cssOf(toggle(page, 'plain'), 'background-color'));
    expect(await bounds(toggle(page, 'odd-size'))).toMatchObject({ width: (await bounds(toggle(page, 'plain'))).width, height: (await bounds(toggle(page, 'plain'))).height });
    await expect.poll(() => seen.filter((text) => text.includes('FBM-7')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/variant "sparkly" is not a value of the active design system; it is drawn as "filled" \(FBM-7\)/);
    expect(seen.join('\n')).toMatch(/size "colossal" is not a value of the active design system; it is drawn as "medium" \(FBM-7\)/);
    // The items of an unknown variant are drawn in the default's item look.
    await host(page, 'odd-variant').evaluate((el) => ((el as HTMLElement & { inline: boolean; open: boolean }).inline = true));
    await host(page, 'odd-variant').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect.poll(() => cssOf(box(page, 'odd-variant', 'Folder'), 'background-color')).toBe(await resolveColor(page, T('filled-item-container-color')));
  });

  test('FBM-11: the toggle is a square of its size’s side with its size’s corners and its icon centred at its size’s icon size; open, container.shape-open and the close glyph', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const [id, size] of [['small-closed', 'small'], ['filled-closed', 'medium'], ['large-closed', 'large']] as const) {
      const square = await bounds(toggle(page, id));
      const side = await resolveToken(page, T(`container-size-${size}`));
      expect([square.width, square.height], id).toEqual([side, side]);
      expect(Number.parseFloat(await cssOf(toggle(page, id), 'border-top-left-radius')), id).toBeCloseTo(await resolveToken(page, T(`container-shape-${size}`)), 1);
      const icon = await bounds(toggle(page, id).locator('.icon'));
      const iconSize = await resolveToken(page, T(`icon-size-${size}`));
      expect([icon.width, icon.height], id).toEqual([iconSize, iconSize]);
      expect(icon.x + icon.width / 2, id).toBeCloseTo(square.x + side / 2, 0);
      expect(icon.y + icon.height / 2, id).toBeCloseTo(square.y + side / 2, 0);
    }
    // The unselected family and fill at the system's weight; the slot's glyph shows, the close glyph does not.
    const icon = toggle(page, 'filled-closed').locator('.icon');
    expect((await cssOf(icon, 'font-family')).replaceAll('"', '')).toBe(await familyToken(page, '--tanrei-sys-icon-family-unselected'));
    expect(await cssOf(icon, 'font-variation-settings')).toMatch(new RegExp(`"FILL" ${await token(page, '--tanrei-sys-icon-fill-unselected')}\\b`));
    expect(await cssOf(icon, 'font-variation-settings')).toMatch(new RegExp(`"wght" ${await token(page, '--tanrei-sys-icon-weight')}\\b`));
    const glyphs = (id: string) => toggle(page, id).evaluate((el) => [...el.querySelectorAll('.glyph')].map((g) => [g.classList[1], getComputedStyle(g).opacity, (g as HTMLElement).innerText.trim()]));
    expect(await glyphs('filled-closed')).toEqual([['shut', '1', ''], ['close', '0', 'close']]);
    // Open: round corners (container.shape-open, the full step) and the close glyph.
    const side = await resolveToken(page, T('container-size-medium'));
    expect(Number.parseFloat(await cssOf(toggle(page, 'filled-open'), 'border-top-left-radius'))).toBeCloseTo(side / 2, 1);
    expect(await token(page, T('container-shape-open-pill'))).toBe('1');
    expect(await glyphs('filled-open')).toEqual([['shut', '0', ''], ['close', '1', 'close']]);
    expect(await host(page, 'filled-open').evaluate((el) => el.querySelector('[slot="icon"]')!.textContent)).toBe('add');
    // The close glyph is the icon set's, drawn by the icon helper: no path, shape or character of its own.
    const close = toggle(page, 'filled-open').locator('.glyph.close');
    await expect(close).toHaveAttribute('data-drawn', '');
    expect(await host(page, 'filled-open').evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, img, canvas').length)).toBe(0);
    // Not mirrored in a right-to-left layout: laid out left to right, neither flipped nor scaled.
    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    for (const part of [close, toggle(page, 'filled-open').locator('.icon')]) {
      expect(await cssOf(part, 'direction')).toBe('ltr');
      expect(await cssOf(part, 'transform')).toBe('none');
      expect(await cssOf(part, 'scale')).toBe('none');
    }
  });

  test('FBM-24: while the icon set cannot draw close, the open toggle draws nothing in its icon box — never the name — and keeps its size, colors, corners, name and expanded state; close appears without the cross-fade once the font arrives', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const look = (id: string) =>
      toggle(page, id).evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { size: [r.width, r.height], color: s.backgroundColor, radius: s.borderTopLeftRadius, icon: getComputedStyle(el.querySelector('.icon')!).color };
      });
    const drawn = await look('filled-open');
    await withoutIconFont(page);
    const close = toggle(page, 'filled-open').locator('.glyph.close');
    const iconSize = await resolveToken(page, T('icon-size-medium'));
    await expect(close).not.toHaveAttribute('data-drawn');
    // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
    expect(await close.locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth)).toBeGreaterThan(iconSize * 1.5);
    expect(await cssOf(close, 'visibility')).toBe('hidden');
    const box = await bounds(toggle(page, 'filled-open').locator('.icon'));
    expect([box.width, box.height]).toEqual([iconSize, iconSize]);
    expect(await look('filled-open')).toEqual(drawn);
    await expect(host(page, 'filled-open').getByRole('button', { name: 'Create', expanded: true })).toHaveCount(1);
    // A slow turn: a close glyph that cross-faded in would still be fading when read.
    await override(page, { [T('motion-open-duration')]: '60000ms', [T('motion-close-duration')]: '60000ms' });
    await iconFaceArrives(page);
    await expect(close).toHaveAttribute('data-drawn', '');
    expect(await cssOf(close, 'visibility')).toBe('visible');
    expect(await cssOf(close, 'opacity')).toBe('1');
    expect(await close.evaluate((el) => el.getAnimations().length), 'without the cross-fade').toBe(0);
    expect(await look('filled-open')).toEqual(drawn);
  });

  test('FBM-12: the FAB menu does not position itself — it lays out at the toggle’s size where the page puts it — and its open items move no content', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await surround(page);
    const layout = await host(page, 'menu').evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, display: s.display, inset: [s.top, s.right, s.bottom, s.left] };
    });
    // inline-flex; blockified to flex as an item of the flex stage.
    expect(layout).toEqual({ position: 'static', display: 'flex', inset: ['auto', 'auto', 'auto', 'auto'] });
    expect(await page.evaluate(() => { const probe = document.createElement('tanrei-fab-menu'); document.body.append(probe); const d = getComputedStyle(probe).display; probe.remove(); return d; })).toBe('inline-flex');
    const [hostBox, square] = [await bounds(host(page, 'menu')), await bounds(toggle(page, 'menu'))];
    expect([hostBox.width, hostBox.height]).toEqual([square.width, square.height]);
    const before = [await bounds(page.locator('#before')), await bounds(page.locator('#after')), hostBox];
    await toggle(page, 'menu').click();
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    expect([await bounds(page.locator('#before')), await bounds(page.locator('#after')), await bounds(host(page, 'menu'))]).toEqual(before);
    // The page places it: fixed at the inline-end bottom corner, it goes exactly there, and the items follow it.
    await host(page, 'menu').evaluate((el) => (el as HTMLElement).setAttribute('style', 'position: fixed; inset-inline-end: 16px; inset-block-end: 16px'));
    const viewport = page.viewportSize()!;
    const placed = await bounds(host(page, 'menu'));
    expect(placed.x + placed.width).toBe(viewport.width - 16);
    expect(placed.y + placed.height).toBe(viewport.height - 16);
    await expect.poll(async () => { const b = await bounds(box(page, 'menu', 'Upload')); return Math.round(b.x + b.width); }).toBe(Math.round(placed.x + placed.width));
  });

  test('FBM-13: open presents the items in the top layer as a column above the toggle — offset, gap, first at the top, end edges aligned — and focus moves in; closing removes them and returns focus', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toggle(page, 'menu').click();
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    await expect.poll(() => focused(page)).toBe('item[Document]');
    const offset = await resolveToken(page, T('list-offset'));
    const gap = await resolveToken(page, T('list-gap'));
    const square = await bounds(toggle(page, 'menu'));
    const [a, b, c] = [await bounds(box(page, 'menu', 'Document')), await bounds(box(page, 'menu', 'Folder')), await bounds(box(page, 'menu', 'Upload'))];
    expect(c.y + c.height).toBeCloseTo(square.y - offset, 0);
    expect(b.y - (a.y + a.height)).toBeCloseTo(gap, 0);
    expect(c.y - (b.y + b.height)).toBeCloseTo(gap, 0);
    for (const each of [a, b, c]) expect(each.x + each.width).toBeCloseTo(square.x + square.width, 0);
    // A list that changes size once placed (its label font arriving after it opened, a label changing) keeps its end
    // edge on the toggle's and its bottom `offset` above it in that same layout — read before any frame could re-place it.
    const resized = await host(page, 'menu').evaluate(async (el, [lower]) => {
      const first = el.querySelector('tanrei-fab-menu-item') as HTMLElement & { label: string; updateComplete: Promise<boolean> };
      const was = first.label;
      const read = () => {
        const t = el.shadowRoot!.querySelector('button.toggle')!.getBoundingClientRect();
        const rects = [...el.querySelectorAll('tanrei-fab-menu-item')].map((it) => it.shadowRoot!.querySelector('.container')!.getBoundingClientRect());
        return { width: rects[0].width, ends: rects.map((r) => r.right - t.right), bottom: t.top - lower - rects.at(-1)!.bottom };
      };
      const before = read();
      first.label = `${was} — ${was} — ${was}`;
      await first.updateComplete;
      const after = read();
      first.label = was;
      await first.updateComplete;
      return { grew: after.width - before.width, ends: after.ends, bottom: after.bottom };
    }, [offset]);
    expect(resized.grew).toBeGreaterThan(0);
    for (const end of resized.ends) expect(end).toBeCloseTo(0, 0);
    expect(resized.bottom).toBeCloseTo(0, 0);
    // In the top layer, as a popover the page cannot clip.
    expect(await list(page, 'menu').evaluate((el) => el.matches(':popover-open') && getComputedStyle(el).position === 'fixed')).toBe(true);
    // Closing (Escape): the items leave and focus returns to the toggle.
    await page.keyboard.press('Escape');
    await expect.poll(() => shown(page, 'menu')).toBe(false);
    expect(await focused(page)).toBe('button#toggle');
    // Up Arrow opens with focus on the last item, the one nearest the toggle.
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => focused(page)).toBe('item[Upload]');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focused(page)).toBe('item[Document]');
    // Closed from outside while focus is elsewhere: focus stays where it is.
    await surround(page);
    await page.locator('#after').focus();
    expect(await log(page)).toContain('close:focus-out');
    await expect.poll(() => shown(page, 'menu')).toBe(false);
    expect(await focused(page)).toBe('button#after');
  });

  test('FBM-13: a fixture draws its items in place above the toggle, which sits 16 in from the stage’s inline-end bottom corner', async ({ page }) => {
    // The default system's sizes, under a product on it that includes the FAB menu: the offsets below are those.
    await mountFixtures(page, spec, { icons: true, ...(await includingSystem('tanrei', 'fab-menu', 'm3-like')) });
    const stage = await bounds(page.locator('[data-fixture="filled-open"]'));
    const square = await bounds(toggle(page, 'filled-open'));
    expect(stage.x + stage.width - (square.x + square.width)).toBe(16);
    expect(stage.y + stage.height - (square.y + square.height)).toBe(16);
    const first = await bounds(box(page, 'filled-open', 'Document'));
    expect(first.y - stage.y).toBeCloseTo(320 - 232, 0);
    expect(await list(page, 'filled-open').evaluate((el) => el.matches(':popover-open'))).toBe(false);
    // Closed fixtures present nothing.
    expect(await list(page, 'filled-closed').evaluate((el) => getComputedStyle(el).display)).toBe('none');
  });

  test('FBM-14: not modal — no focus trap, nothing made inert, no scrim', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page, { product: false });
    await surround(page);
    await host(page, 'menu').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect.poll(() => focused(page)).toBe('item[Document]');
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    expect(await cssOf(list(page, 'menu'), 'background-color', '::backdrop')).toMatch(/rgba\(0, 0, 0, 0\)|^$/);
    // Tab leaves the items (the product did not close them: they stay, and nothing keeps focus in).
    await tab(page);
    expect(await focused(page)).not.toMatch(/^item/);
    // The page under and around them is still reachable by the pointer.
    await page.locator('#before').click();
    expect(await log(page)).toContain('page:before');
  });

  test('FBM-15: Escape, a press outside, Tab, Shift+Tab and focus leaving each emit close once with their reason; Tab moves on from the toggle; the press outside reaches what is under it', async ({ page }) => {
    const open = async () => {
      await toggle(page, 'menu').click();
      await expect.poll(() => focused(page)).toBe('item[Document]');
    };
    const setup = async () => {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
      await wire(page);
      await surround(page);
      await open();
    };
    await setup();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    expect(await log(page)).toEqual(['toggle:true', 'close:escape']);
    expect(await focused(page)).toBe('button#toggle');

    await open();
    await page.locator('#after').click();
    expect((await log(page)).slice(-3)).toEqual(['toggle:true', 'close:outside', 'page:after']);
    await expect.poll(() => shown(page, 'menu')).toBe(false);

    await setup();
    await tab(page);
    expect(await log(page)).toEqual(['toggle:true', 'close:tab']);
    await expect.poll(() => focused(page)).toBe('button#after');

    await setup();
    await tab(page, { back: true });
    expect(await log(page)).toEqual(['toggle:true', 'close:tab']);
    await expect.poll(() => focused(page)).toBe('button#before');

    await setup();
    await page.locator('#before').focus();
    expect(await log(page)).toEqual(['toggle:true', 'close:focus-out']);

    // A product that only listens: each request is made once, whatever follows it.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page, { product: false });
    await surround(page);
    await host(page, 'menu').evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await expect.poll(() => focused(page)).toBe('item[Document]');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.mouse.click(700, 300); // the page's own background
    expect(await log(page)).toEqual(['close:escape']);
  });

  test('FBM-16: activating an item by pointer, Enter or Space emits its click once and then close with the reason item, and focus returns to the toggle', async ({ page }) => {
    for (const [how, activate] of [
      ['pointer', async () => item(page, 'menu', 'Folder').click()],
      ['Enter', async () => { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }],
      ['Space', async () => { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); }],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
      await wire(page);
      await toggle(page, 'menu').click();
      await expect.poll(() => focused(page)).toBe('item[Document]');
      await activate();
      await expect.poll(() => log(page), how).toEqual(['toggle:true', 'item:Folder', 'host-click:Folder', 'close:item']);
      await expect.poll(() => shown(page, 'menu'), how).toBe(false);
      expect(await focused(page), how).toBe('button#toggle');
    }
  });

  test('FBM-17: Down and Up Arrow move through the items, wrapping; Home and End reach the ends; no typeahead', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await toggle(page, 'menu').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focused(page)).toBe('item[Document]');
    const seen: (string | null)[] = [];
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'f', 'd']) {
      await page.keyboard.press(key);
      seen.push(await focused(page));
    }
    expect(seen).toEqual(['item[Folder]', 'item[Upload]', 'item[Document]', 'item[Upload]', 'item[Document]', 'item[Upload]', 'item[Upload]', 'item[Upload]']);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('FBM-18: an item is at least item.height tall and as wide as its content — the icon, then the label item.gap apart, padded at each end — in its shape, type, icon size and elevation, unclipped; a long label wraps', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const container = box(page, 'filled-open', 'Document');
    const [c, icon, label] = [await bounds(container), await bounds(container.locator('.icon')), await bounds(container.locator('.label'))];
    const iconSize = await resolveToken(page, T('item-icon-size'));
    expect([icon.width, icon.height]).toEqual([iconSize, iconSize]);
    expect(c.height).toBeGreaterThanOrEqual(await resolveToken(page, T('item-height')));
    expect(icon.x - c.x).toBeCloseTo(await resolveToken(page, T('item-padding-inline-start')), 0);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(await resolveToken(page, T('item-gap')), 0);
    expect(c.x + c.width - (label.x + label.width)).toBeCloseTo(await resolveToken(page, T('item-padding-inline-end')), 0);
    expect(Number.parseFloat(await cssOf(container, 'border-top-left-radius'))).toBeCloseTo(await resolveToken(page, T('item-shape')), 1);
    expect(await cssOf(container, 'font-size')).toBe(`${await resolveToken(page, T('item-label-typescale-font-size'))}px`);
    expect(await cssOf(container, 'font-weight')).toBe(await token(page, T('item-label-typescale-font-weight')));
    expect((await cssOf(container.locator('.icon'), 'font-family')).replaceAll('"', '')).toBe(await familyToken(page, '--tanrei-sys-icon-family-unselected'));
    for (const variant of ['filled', 'tonal', 'surface']) {
      const each = box(page, `${variant}-open`, 'Folder');
      expect(await cssOf(each, 'box-shadow'), variant).toBe(await resolveShadow(page, T(`${variant}-item-container-elevation`)));
      expect(await cssOf(each, 'background-color'), variant).toBe(await resolveColor(page, T(`${variant}-item-container-color`)));
      expect(await cssOf(each, 'color'), variant).toBe(await resolveColor(page, T(`${variant}-item-label-color`)));
      expect(await cssOf(each.locator('.icon'), 'color'), variant).toBe(await resolveColor(page, T(`${variant}-item-icon-color`)));
    }
    // Nothing on the way to the page clips the items' elevation.
    for (const el of [list(page, 'filled-open'), host(page, 'filled-open'), item(page, 'filled-open', 'Folder')]) expect(await cssOf(el, 'overflow')).toBe('visible');
    // One line while it fits; a label longer than the room wraps, and the item grows with it, never truncating.
    const line = Number.parseFloat(await cssOf(container.locator('.label'), 'line-height'));
    expect(label.height).toBeCloseTo(line, 0);
    await page.setViewportSize({ width: 220, height: 600 });
    const long = 'Upload several documents from this device at once';
    // Reduced motion: measured whole, not while it grows in.
    await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [fixture('long', {}, [...labelled('Short'), { kind: 'item', props: { label: long, icon: 'upload' } }])] });
    await wire(page);
    await toggle(page, 'long').click();
    await expect.poll(() => shown(page, 'long')).toBe(true);
    const wrapped = item(page, 'long', long);
    const text = await bounds(wrapped.locator('.label'));
    expect(text.height).toBeGreaterThan(line * 1.5);
    expect((await bounds(wrapped.locator('.container'))).height).toBeGreaterThanOrEqual(text.height);
    expect(await wrapped.locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
  });

  test('FBM-19: opening turns the toggle and grows the items in one by one from the one nearest it; closing turns it back and fades them together; reduced motion changes everything at once', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    const open = await resolveToken(page, T('motion-open-duration'), 'duration');
    const close = await resolveToken(page, T('motion-close-duration'), 'duration');
    const stagger = await resolveToken(page, T('motion-stagger'), 'duration');
    expect(stagger).toBeGreaterThan(0);
    const ms = (value: string) => Number.parseFloat(value) * 1000;
    await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '0ms' });
    await toggle(page, 'menu').focus();
    // The turn and the leaving last one motion each, which a loaded machine's round trips can outlast: they are read in
    // the page as the update that `toggle` or `close` caused completes (after the product's listener set open).
    const sampleAt = (event: 'toggle' | 'close') =>
      host(page, 'menu').evaluate((el, name) => {
        (window as any).sample = new Promise((resolve) =>
          el.addEventListener(
            name,
            async () => {
              await (el as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
              const button = el.shadowRoot!.querySelector('.toggle')!;
              const glyph = button.querySelector('.glyph')!;
              const list = el.shadowRoot!.querySelector('.list')!;
              const [b, g, l] = [getComputedStyle(button), getComputedStyle(glyph), getComputedStyle(list)];
              resolve({
                toggle: { classes: button.className, property: b.transitionProperty, duration: b.transitionDuration, easing: b.transitionTimingFunction, glyph: g.transitionDuration },
                list: { name: l.animationName, duration: Number.parseFloat(l.animationDuration) * 1000, open: list.matches(':popover-open') },
              });
            },
            { once: true },
          ),
        );
      }, event);
    type Sample = { toggle: { classes: string; property: string; duration: string; easing: string; glyph: string }; list: { name: string; duration: number; open: boolean } };
    const sampled = () => page.evaluate(() => (window as any).sample as Promise<Sample>);
    await sampleAt('toggle');
    // The turn ends as the cross-fade finishes, never before it: neither the glyphs' nor the corners' motion is still
    // running then (the colors may be: a press released during the turn moves them from its own later start).
    await toggle(page, 'menu').evaluate((button) => {
      (window as any).ended = new Promise((resolve) => {
        let seen = false;
        new MutationObserver((_, observer) => {
          if (button.classList.contains('turning')) seen = true;
          else if (seen) {
            observer.disconnect();
            const running = (el: Element) => el.getAnimations().filter((a) => a.playState === 'running').map((a) => (a as CSSTransition).transitionProperty);
            resolve([...running(button).filter((p) => p.endsWith('radius')), ...[...button.querySelectorAll('.glyph')].flatMap(running)]);
          }
        }).observe(button, { attributes: true, attributeFilter: ['class'] });
      });
    });
    await page.keyboard.press('Enter');
    const turn = (await sampled()).toggle;
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    // The toggle: colors, elevation and corners over the open motion, the glyph cross-fading with them.
    expect(turn.classes).toContain('turning');
    expect(turn.property).toContain('border-radius');
    expect(ms(turn.duration)).toBe(open);
    expect(ms(turn.glyph)).toBe(open);
    expect(turn.easing).toBe(await easing(page, T('motion-open-easing')));
    // The items: faded and grown in, the one nearest the toggle (the last) first, each next a stagger later.
    const motion = await host(page, 'menu').evaluate((el) =>
      [...el.querySelectorAll('tanrei-fab-menu-item')].map((it) => {
        const s = getComputedStyle(it.shadowRoot!.querySelector('.container')!);
        // The origin and the width it is compared with, read together: the layout width (a transform never changes it).
        return { name: s.animationName, duration: Number.parseFloat(s.animationDuration) * 1000, delay: Number.parseFloat(s.animationDelay) * 1000, origin: s.transformOrigin, width: Number.parseFloat(s.width) };
      }),
    );
    expect(motion.map((m) => m.name)).toEqual(['fab-menu-item-in', 'fab-menu-item-in', 'fab-menu-item-in']);
    expect(motion.map((m) => m.duration)).toEqual([open, open, open]);
    expect(motion.map((m) => Math.round(m.delay))).toEqual([2 * stagger, stagger, 0]);
    // From the end edge: the right one, in left-to-right.
    expect(motion[0].width).toBeGreaterThan(0);
    expect(Number.parseFloat(motion[0].origin.split(' ')[0])).toBeCloseTo(motion[0].width, 0);
    await expect.poll(() => toggle(page, 'menu').evaluate((el) => el.classList.contains('turning')), { timeout: open + 2000 }).toBe(false);
    expect(await page.evaluate(() => (window as any).ended)).toEqual([]);

    // Closing: the items leave together over the close motion, and the toggle turns back over it.
    await sampleAt('close');
    await page.keyboard.press('Escape');
    const leaving = await sampled();
    expect(leaving.list).toEqual({ name: 'fab-menu-leave', duration: close, open: true });
    expect(leaving.toggle.classes).toContain('turning');
    expect(ms(leaving.toggle.duration)).toBe(close);
    expect(ms(leaving.toggle.glyph)).toBe(close);
    expect(leaving.toggle.easing).toBe(await easing(page, T('motion-close-easing')));
    await expect.poll(() => shown(page, 'menu')).toBe(false);

    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    expect(await cssOf(box(page, 'menu', 'Document'), 'animation-name')).toBe('none');
    expect(await cssOf(toggle(page, 'menu'), 'transition-duration')).toBe('0s');
    expect(await toggle(page, 'menu').evaluate((el) => el.classList.contains('turning'))).toBe(false);
    await page.keyboard.press('Escape');
    expect(await shown(page, 'menu')).toBe(false);
  });

  test('FBM-20: the toggle is a button named by label that opens a menu and says whether it is open; open, the items are a menu named by label of menu items with their positions; the icons are hidden', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    const button = host(page, 'menu').getByRole('button', { name: 'Create' });
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await toggle(page, 'menu').evaluate((el) => !!(el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-controls')!)?.matches('[role="menu"]'))).toBe(true);
    await expect(host(page, 'menu').getByRole('menu')).toHaveCount(0);
    await toggle(page, 'menu').click();
    // Open: the same name, now expanded.
    await expect(host(page, 'menu').getByRole('button', { name: 'Create' })).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu', { name: 'Create' });
    await expect(menu).toBeVisible();
    // The items are the menu's in the accessibility tree (the flat tree: slotted into the list), in order.
    await expect(page.locator('[data-fixture="menu"]')).toMatchAriaSnapshot(`
      - button "Create" [expanded]
      - menu "Create":
        - menuitem "Document"
        - menuitem "Folder"
        - menuitem "Upload"
    `);
    for (const [index, label] of ['Document', 'Folder', 'Upload'].entries()) {
      const each = host(page, 'menu').getByRole('menuitem', { name: label, exact: true });
      await expect(each).toHaveAttribute('aria-posinset', String(index + 1));
      await expect(each).toHaveAttribute('aria-setsize', '3');
    }
    expect(await host(page, 'menu').evaluate((el) => [el.shadowRoot!.querySelector('.icon')!.getAttribute('aria-hidden'), ...[...el.querySelectorAll('tanrei-fab-menu-item')].map((it) => it.shadowRoot!.querySelector('.icon')!.getAttribute('aria-hidden'))])).toEqual(['true', 'true', 'true', 'true']);
    // Nothing but the items and the toggle is exposed: no name from the glyphs.
    await expect(page.getByRole('menuitem', { name: 'description' })).toHaveCount(0);
  });

  test('FBM-21: the toggle casts its variant’s elevation, closed and open, outside itself, unclipped; colors and elevation change over the state motion, at once where reduced', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const variant of ['filled', 'tonal', 'surface']) {
      expect(await cssOf(toggle(page, `${variant}-closed`), 'box-shadow'), variant).toBe(await resolveShadow(page, T(`${variant}-container-elevation`)));
      expect(await cssOf(toggle(page, `${variant}-open`), 'box-shadow'), variant).toBe(await resolveShadow(page, T(`${variant}-open-container-elevation`)));
      expect(await cssOf(toggle(page, `${variant}-open`), 'background-color'), variant).toBe(await resolveColor(page, T(`${variant}-open-container-color`)));
      expect(await cssOf(toggle(page, `${variant}-open`), 'color'), variant).toBe(await resolveColor(page, T(`${variant}-open-icon-color`)));
    }
    for (const el of [host(page, 'filled-closed'), toggle(page, 'filled-closed')]) expect(await cssOf(el, 'overflow')).toBe('visible');
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    expect(Number.parseFloat(await cssOf(toggle(page, 'filled-closed'), 'transition-duration')) * 1000).toBe(duration);
    expect(await cssOf(toggle(page, 'filled-closed'), 'transition-timing-function')).toBe(await easing(page, T('motion-state-easing')));
    // The default system raises the toggle under hover, over the state motion.
    // Kept as the engine announces them, not asked for after the hover: on a slow runner the answer to a later question
    // can arrive when a transition of this length is over.
    await watchTransitions(toggle(page, 'filled-closed'));
    await toggle(page, 'filled-closed').hover();
    const stateEasing = await easing(page, T('motion-state-easing'));
    for (const property of ['box-shadow', 'background-color']) {
      await expect.poll(() => transitionsRun(toggle(page, 'filled-closed')), property).toContainEqual({ property, pseudo: '', own: true, on: expect.any(String), duration, easing: stateEasing });
    }
    // An item's colors too.
    expect(Number.parseFloat(await cssOf(box(page, 'filled-open', 'Folder'), 'transition-duration')) * 1000).toBe(duration);
    await page.mouse.move(0, 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await cssOf(toggle(page, 'filled-closed'), 'transition-duration')).toBe('0s');
    expect(await cssOf(box(page, 'filled-open', 'Folder'), 'transition-duration')).toBe('0s');
    await toggle(page, 'filled-closed').hover();
    expect(await cssOf(toggle(page, 'filled-closed'), 'box-shadow')).toBe(await resolveShadow(page, T('filled-hovered-container-elevation')));
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const edge of ['left', 'right'] as const) {
      test(`FBM-13: with the toggle at the window’s ${edge} edge in ${dir} the open items stay inside the window — held by the edge they would cross, every label whole — and at the other edge their end edges are the toggle’s`, async ({ page }) => {
        await mountFixtures(page, spec, { icons: true, dir, fixtures: [fixture('menu')] });
        await wire(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await host(page, 'menu').evaluate((el, side) => ((el as HTMLElement).style.cssText = `position: fixed; bottom: 16px; ${side}: 4px;`), edge);
        await toggle(page, 'menu').click();
        await expect.poll(() => shown(page, 'menu')).toBe(true);
        const [width, square] = [await page.evaluate(() => document.documentElement.clientWidth), await bounds(toggle(page, 'menu'))];
        // The items grow toward the start from the toggle's end edge: at the start edge of the window they would cross it.
        const crosses = (dir === 'ltr') === (edge === 'left');
        for (const label of ['Document', 'Folder', 'Upload']) {
          const item = await bounds(box(page, 'menu', label));
          expect(item.x, `${label}: inside at the left`).toBeGreaterThanOrEqual(-0.5);
          expect(item.x + item.width, `${label}: inside at the right`).toBeLessThanOrEqual(width + 0.5);
          expect(item.width, `${label}: wider than the toggle, so it would cross`).toBeGreaterThan(square.width + 4);
          if (!crosses) expect(dir === 'ltr' ? item.x + item.width : item.x, `${label}: its end edge on the toggle’s`).toBeCloseTo(dir === 'ltr' ? square.x + square.width : square.x, 0);
          const text = await bounds(box(page, 'menu', label).locator('.label'));
          expect(text.x).toBeGreaterThanOrEqual(0);
          expect(text.x + text.width).toBeLessThanOrEqual(width);
        }
        if (crosses) {
          const widest = Math.max(...(await Promise.all(['Document', 'Folder', 'Upload'].map(async (label) => (await bounds(box(page, 'menu', label))).width))));
          const edges = await Promise.all(['Document', 'Folder', 'Upload'].map(async (label) => bounds(box(page, 'menu', label))));
          // Held by the window's edge: the widest item begins (or ends) on it.
          expect(dir === 'ltr' ? Math.min(...edges.map((each) => each.x)) : width - Math.max(...edges.map((each) => each.x + each.width))).toBeCloseTo(0, 0);
          expect(widest).toBeLessThanOrEqual(width);
        }
      });
    }
  }

  test('FBM-22: right-to-left aligns the items’ end edges with the toggle’s left edge, mirrors each item’s icon, label and paddings, and grows a ripple from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'm3-like', fixtures: [fixture('menu')] });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await wire(page);
    await toggle(page, 'menu').click();
    await expect.poll(() => shown(page, 'menu')).toBe(true);
    await page.waitForTimeout(1000); // the items have grown in
    const square = await bounds(toggle(page, 'menu'));
    for (const label of ['Document', 'Folder', 'Upload']) expect((await bounds(box(page, 'menu', label))).x, label).toBeCloseTo(square.x, 0);
    const container = box(page, 'menu', 'Folder');
    const [c, icon, text] = [await bounds(container), await bounds(container.locator('.icon')), await bounds(container.locator('.label'))];
    expect(icon.x).toBeGreaterThan(text.x);
    expect(c.x + c.width - (icon.x + icon.width)).toBeCloseTo(await resolveToken(page, T('item-padding-inline-start')), 0);
    expect(text.x - c.x).toBeCloseTo(await resolveToken(page, T('item-padding-inline-end')), 0);
    // The ripple grows from where the item was pressed (m3-like answers with a ripple).
    await page.mouse.move(c.x + 12, c.y + 10);
    await page.mouse.down();
    const ripple = container.locator('.ripple');
    await expect(ripple).toHaveCount(1);
    const at = await ripple.evaluate((el) => {
      const own = el.getBoundingClientRect();
      const parent = el.parentElement!.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - parent.left, Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - parent.top];
    });
    expect(at[0]).toBeCloseTo(12, 0);
    expect(at[1]).toBeCloseTo(10, 0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('FBM-23: an empty label, an item without a label or an icon, and fewer than two or more than six items still render, and a debug build reports each', async ({ page }) => {
    const seen = warnings(page);
    const seven = labelled('1', '2', '3', '4', '5', '6', '7');
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'nameless', props: { inline: true, open: true }, slots: { icon: 'add' }, items: ITEMS },
        fixture('one', { inline: true, open: true }, labelled('Only')),
        fixture('seven', { inline: true, open: true }, seven),
        fixture('bare', { inline: true, open: true }, [{ kind: 'item', props: {} }, ...labelled('Named')]),
      ],
    });
    const side = await resolveToken(page, T('container-size-medium'));
    expect(await bounds(toggle(page, 'nameless'))).toMatchObject({ width: side, height: side });
    await expect(toggle(page, 'nameless')).not.toHaveAttribute('aria-label');
    await expect(host(page, 'one').locator('tanrei-fab-menu-item')).toHaveCount(1);
    await expect(host(page, 'seven').locator('tanrei-fab-menu-item')).toHaveCount(7);
    expect((await bounds(host(page, 'bare').locator('tanrei-fab-menu-item').first())).height).toBeGreaterThan(0);
    await expect.poll(() => seen.filter((w) => w.includes('FBM-23')).length).toBe(5);
    const text = seen.join('\n');
    expect(text).toMatch(/<tanrei-fab-menu>: label is empty, so the toggle and the list have no accessible name/);
    expect(text).toMatch(/<tanrei-fab-menu>: it holds 1 item; a FAB menu holds two to six \(FBM-23\)/);
    expect(text).toMatch(/<tanrei-fab-menu>: it holds 7 items; a FAB menu holds two to six \(FBM-23\)/);
    expect(text).toMatch(/<tanrei-fab-menu-item>: label is empty, so the item has no accessible name/);
    expect(text).toMatch(/<tanrei-fab-menu-item>: icon is empty/);
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
    await includingSystem('tanrei', 'fab-menu', 'm3-like');
    await includingSystem('cupertino', 'fab-menu', 'm3-like');
  });

  test('FBM-8: a press on the toggle that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    // The default system's choice of feedback (overlay), under a product on it that includes the FAB menu.
    const onTanrei = await includingSystem('tanrei', 'fab-menu', 'm3-like');
    expect(await (async () => {
      await mountFixtures(page, spec, { icons: true, ...onTanrei });
      return resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    })()).toBe(100);
    const hold = 1000;
    for (const [name, activate] of [
      ['Enter', () => page.keyboard.press('Enter')],
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => toggle(page, 'menu').click()],
    ] as const) {
      await mountFixtures(page, spec, { icons: true, ...onTanrei, fixtures: [fixture('menu')] });
      await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
      await toggle(page, 'menu').focus();
      await toggle(page, 'menu').evaluate((el) => {
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
      await expect.poll(() => page.evaluate(() => (window as any).press.off), name).toBeDefined();
      const record = await page.evaluate(() => (window as any).press);
      expect(record.seen, name).toEqual(['overlay', '0s']);
      expect(record.off - record.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('FBM-9: overlay (the default system’s), ripple (m3-like), dim (cupertino’s) and none each answer a press on the toggle and on an item; an unknown name is the first', async ({ page }) => {
    const pressedAttr = (locator: Locator) => locator.getAttribute('data-pressed');
    // overlay: the pressed tokens on the whole toggle and item at once, no layer — the default system's choice, read
    // under a product on it that includes the FAB menu.
    await mountFixtures(page, spec, { icons: true, ...(await includingSystem('tanrei', 'fab-menu', 'm3-like')) });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await toggle(page, 'filled-closed').hover();
    await page.mouse.down();
    expect(await pressedAttr(toggle(page, 'filled-closed'))).toBe('overlay');
    expect(await cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(await resolveColor(page, T('filled-pressed-container-color')));
    expect(await toggle(page, 'filled-closed').locator('.ripple').count()).toBe(0);
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await box(page, 'filled-open', 'Folder').hover();
    await page.mouse.down();
    expect(await pressedAttr(box(page, 'filled-open', 'Folder'))).toBe('overlay');
    expect(await cssOf(box(page, 'filled-open', 'Folder'), 'background-color')).toBe(await resolveColor(page, T('filled-pressed-item-container-color')));
    await page.mouse.up();
    await page.mouse.move(1, 1);

    // ripple: from the point of contact, in the pressed color of the look, clipped to the toggle; the container stays hovered.
    await mountFixtures(page, spec, { icons: true, system: 'm3-like' });
    await toggle(page, 'filled-closed').scrollIntoViewIfNeeded(); // a new page keeps the last one's scroll
    const b = await bounds(toggle(page, 'filled-closed'));
    await page.mouse.move(b.x + 10, b.y + 8);
    const hovered = await resolveColor(page, T('filled-hovered-container-color'));
    await expect.poll(() => cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(toggle(page, 'filled-closed'));
    await page.mouse.down();
    expect(await pressedAttr(toggle(page, 'filled-closed'))).toBe('ripple');
    const ripple = toggle(page, 'filled-closed').locator('.ripple');
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const own = el.getBoundingClientRect();
      const parent = el.parentElement!.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - parent.left,
        y: Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - parent.top,
        color: s.backgroundColor,
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
      };
    });
    expect(layer.x).toBeCloseTo(10, 0);
    expect(layer.y).toBeCloseTo(8, 0);
    expect(layer.color).toBe(await resolveColor(page, T('filled-pressed-container-color')));
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(await cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(hovered);
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await expect(ripple).toHaveCount(0);
    // The open toggle's ripple is its open look's pressed color; an item's, the item look's, within the item.
    await toggle(page, 'filled-open').scrollIntoViewIfNeeded();
    const openToggle = await bounds(toggle(page, 'filled-open'));
    await page.mouse.move(openToggle.x + openToggle.width / 2, openToggle.y + openToggle.height / 2);
    await page.mouse.down();
    expect(await toggle(page, 'filled-open').locator('.ripple').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, T('filled-pressed-open-container-color')));
    await page.mouse.up();
    await page.mouse.move(1, 1);
    await box(page, 'filled-open', 'Folder').hover();
    await page.mouse.down();
    expect(await pressedAttr(box(page, 'filled-open', 'Folder'))).toBe('ripple');
    expect(await box(page, 'filled-open', 'Folder').locator('.ripple').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, T('filled-pressed-item-container-color')));
    await page.mouse.up();
    await page.mouse.move(1, 1);
    // From the center for the keyboard; whole at once where motion is reduced.
    await toggle(page, 'filled-closed').focus();
    await page.keyboard.down('Enter');
    const center = await ripple.evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    expect(await ripple.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.keyboard.up('Enter');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // dim: the pressed opacity on the whole control, no layer; only the container color stays with the state under it.
    await mountFixtures(page, spec, { icons: true, ...(await includingSystem('cupertino', 'fab-menu', 'm3-like')) });
    await override(page, { [T('filled-pressed-icon-color')]: 'rgb(0, 0, 255)', [T('filled-pressed-item-label-color')]: 'rgb(0, 128, 0)' });
    const resting = await cssOf(toggle(page, 'filled-closed'), 'background-color');
    await toggle(page, 'filled-closed').hover();
    await page.mouse.down();
    expect(await pressedAttr(toggle(page, 'filled-closed'))).toBe('dim');
    expect(await cssOf(toggle(page, 'filled-closed'), 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await cssOf(toggle(page, 'filled-closed'), 'opacity'))).toBeLessThan(1);
    expect(await cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(resting);
    expect(await cssOf(toggle(page, 'filled-closed'), 'color')).toBe('rgb(0, 0, 255)');
    await page.mouse.up();
    await page.mouse.move(1, 1);
    const itemResting = await cssOf(box(page, 'filled-open', 'Folder'), 'background-color');
    await box(page, 'filled-open', 'Folder').hover();
    await page.mouse.down();
    expect(await pressedAttr(box(page, 'filled-open', 'Folder'))).toBe('dim');
    expect(await cssOf(box(page, 'filled-open', 'Folder'), 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(await cssOf(box(page, 'filled-open', 'Folder'), 'background-color')).toBe(itemResting);
    expect(await cssOf(box(page, 'filled-open', 'Folder'), 'color')).toBe('rgb(0, 128, 0)');
    await page.mouse.up();
    await page.mouse.move(1, 1);

    // none: nothing changes; an unknown name is overlay.
    await mountFixtures(page, spec, { icons: true });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await toggle(page, 'filled-closed').hover();
    await expect.poll(() => cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(await resolveColor(page, T('filled-hovered-container-color')));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(toggle(page, 'filled-closed'));
    const before = await cssOf(toggle(page, 'filled-closed'), 'background-color');
    await page.mouse.down();
    expect(await pressedAttr(toggle(page, 'filled-closed'))).toBe('none');
    expect(await cssOf(toggle(page, 'filled-closed'), 'background-color')).toBe(before);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressedAttr(toggle(page, 'filled-closed'))).toBe('overlay');
    await page.mouse.up();
  });

  test('FBM-10 corner smoothing and focus-style: cupertino eases the toggle’s and an item’s corners, the ring concentric, a pill staying round; acme shows keyboard focus as a glow on both', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(await cssOf(toggle(page, 'filled-closed'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    // cupertino's smoothing, under a product on cupertino that includes the FAB menu from m3-like.
    await mountFixtures(page, spec, { icons: true, ...(await includingSystem('cupertino', 'fab-menu', 'm3-like')), fixtures: [fixture('menu', { inline: true, open: true }), fixture('closed', { inline: true })] });
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    test.info().annotations.push({ type: 'corner-shape', description: supported ? 'eased with corner-shape' : 'not supported by this browser: circular fallback' });
    // A capsule (corner.full) stays round whatever the smoothing.
    await override(page, { [T('item-shape')]: 'var(--tanrei-sys-shape-corner-full)', [T('item-shape-pill')]: '1' });
    if (supported) expect(await cssOf(box(page, 'menu', 'Folder'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    // Square-ish corners: eased.
    await override(page, { [T('item-shape')]: '12px', [T('item-shape-pill')]: '0', [T('container-shape-medium')]: '12px', [T('container-shape-medium-pill')]: '0' });
    for (const locator of [toggle(page, 'closed'), box(page, 'menu', 'Folder')]) {
      if (supported) {
        expect(Number.parseFloat((await cssOf(locator, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
        expect(Number.parseFloat(await cssOf(locator, 'border-top-left-radius'))).toBeCloseTo(12 * 1.24, 2);
      } else expect(Number.parseFloat(await cssOf(locator, 'border-top-left-radius'))).toBe(12);
    }
    await tabTo(page, toggle(page, 'closed'));
    expect(await cssOf(toggle(page, 'closed'), 'corner-top-left-shape', '::after')).toBe(await cssOf(toggle(page, 'closed'), 'corner-top-left-shape'));

    // acme: a glow in the same two focus colors on the toggle and on an item.
    await mountFixtures(page, spec, { icons: true, system: 'acme', systemCss: await acmeSystemCss(), fixtures: [fixture('menu')] });
    await wire(page);
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await tabTo(page, toggle(page, 'menu'));
    expect(await toggle(page, 'menu').getAttribute('data-focus-style')).toBe('glow');
    expect(await cssOf(toggle(page, 'menu'), 'box-shadow', '::after')).not.toBe('none');
    expect(await cssOf(toggle(page, 'menu'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => focused(page)).toBe('item[Document]');
    expect(await item(page, 'menu', 'Document').getAttribute('data-focus-style')).toBe('glow');
    expect(await cssOf(box(page, 'menu', 'Document'), 'box-shadow', '::after')).not.toBe('none');
    expect(await cssOf(box(page, 'menu', 'Document'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, closed and open in place, and open in the top layer', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      await motionEnded(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await wire(page);
    await toggle(page, 'menu').click();
    await motionEnded(page);
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations, results.violations.map((v) => v.id).join(', ')).toEqual([]);
  });

  test('keyboard: the toggle is the only Tab stop; items take focus only from the menu', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('menu')] });
    await surround(page);
    await page.locator('#before').focus();
    await tab(page);
    expect(await focused(page)).toBe('button#toggle');
    await tab(page);
    expect(await focused(page)).toBe('button#after');
    expect(await host(page, 'menu').evaluate((el) => [...el.querySelectorAll('tanrei-fab-menu-item')].map((it) => it.getAttribute('tabindex')))).toEqual(['-1', '-1', '-1']);
  });

  test('the items grow with 200% text size and wrap instead of clipping', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const before = await bounds(box(page, 'filled-open', 'Document'));
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await bounds(box(page, 'filled-open', 'Document'));
    expect(after.width).toBeGreaterThan(before.width * 1.5);
    expect(after.height).toBeGreaterThanOrEqual(before.height * 2);
    expect(await item(page, 'filled-open', 'Document').locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});

test.describe('fixtures', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await page.mouse.move(0, 0);
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
