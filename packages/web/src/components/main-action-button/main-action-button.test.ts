// <tanrei-main-action-button>, driven by specs/main-action-button.spec.json: every behaviour id (MAB-1…20) is cited by a
// test title, every fixture has a baseline, and every state, size, form and choice of kind is read back from the tokens —
// never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { decodePng } from '../../../test/png.js';
import { opticalSize } from '../../../test/icons.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { holdTransitions, stepTransitions } from '../../../test/stepped-transitions.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('main-action-button');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-main-action-button`);
const inner = (page: P, id: string) => host(page, id).locator('button');
const glyphBox = (page: P, id: string) => host(page, id).locator('.icon');
const labelOf = (page: P, id: string) => host(page, id).locator('.label');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const style = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const css = (page: P, id: string, property: string, pseudo?: string) => style(inner(page, id), property, pseudo);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-main-action-button-${name}`;
const pressed = (page: P, id: string) => inner(page, id).getAttribute('data-pressed');
const ripples = (page: P, id: string) => inner(page, id).locator('.ripple');
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
/** A property as a token makes it compute on a probe (a font weight, an easing). */
const resolveAs = (page: P, property: string, name: string) =>
  page.evaluate(([p, n]) => {
    const probe = document.createElement('div');
    probe.style.setProperty(p, `var(${n})`);
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).getPropertyValue(p);
    probe.remove();
    return value;
  }, [property, name] as const);
/** The font's axes as drawn: `"FILL" 1, "wght" 300, "GRAD" 0` → { FILL: 1, wght: 300, GRAD: 0 }. */
// Axis values to 1/1000: Firefox serializes an opsz computed as tan(atan2(48px, 1px)) as 47.9999.
const axes = (locator: Locator) =>
  locator.evaluate((el) => Object.fromEntries([...getComputedStyle(el).fontVariationSettings.matchAll(/"(\w+)" ([\d.]+)/g)].map((m) => [m[1], Math.round(Number(m[2]) * 1000) / 1000])));
/** Chromium and Firefox serialize a family with spaces in quotes, WebKit without. */
const family = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).fontFamily.replaceAll('"', ''));
const familyToken = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('span');
    probe.style.fontFamily = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).fontFamily.replaceAll('"', '');
    probe.remove();
    return value;
  }, name);
/** The label's text as laid out (its own box is the label's block, which may be wider). */
const textBox = (page: P, id: string) =>
  labelOf(page, id).evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
/** Counts the element's click events. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = { click: 0 });
    el.addEventListener('click', () => log.click++);
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { click: number });
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/** A fixture; `icon: null` is one without an icon. */
const fixture = (id: string, props: Fixture['props'], icon: string | null = 'edit'): Fixture => ({ id, props, ...(icon === null ? {} : { slots: { icon } }) });
/** What the container draws: its color, the label color, the elevation and the opacity. */
const drawn = (page: P, id: string) =>
  inner(page, id).evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, opacity: s.opacity }; });
/** What the tokens of a variant and a state (`''` at rest, `'hovered-'`…) say it draws. */
const expected = async (page: P, variant: string, state: string) => ({
  bg: await resolveColor(page, T(`${variant}-${state}container-color`)),
  color: await resolveColor(page, T(`${variant}-${state}label-color`)),
  shadow: await resolveShadow(page, T(`${variant}-${state}container-elevation`)),
  opacity: state ? await token(page, T(`${state}opacity`)) : '1',
});
/** Whether the icon is centered in the container on both axes. */
const iconCentered = async (page: P, id: string) => {
  const [square, icon] = [await bounds(inner(page, id)), await bounds(glyphBox(page, id))];
  expect(icon.x - square.x, `${id}: inline`).toBeCloseTo(square.x + square.width - (icon.x + icon.width), 1);
  expect(icon.y - square.y, `${id}: block`).toBeCloseTo(square.y + square.height - (icon.y + icon.height), 1);
};

test.describe('behavior', () => {
  // Building the acme fixture system takes longer than a test's budget on a busy machine: once per worker, up front.
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('MAB-1: pointer, Enter and Space each emit click exactly once — extended, collapsed and without an icon', async ({ page }) => {
    for (const id of ['filled-extended', 'filled-collapsed', 'filled-label-only']) {
      await mountFixtures(page, spec);
      await listen(host(page, id));
      await host(page, id).click();
      expect((await events(page)).click, `${id}: pointer`).toBe(1);
      await host(page, id).focus();
      await page.keyboard.press('Enter');
      expect((await events(page)).click, `${id}: Enter`).toBe(2);
      await page.keyboard.press('Space');
      expect((await events(page)).click, `${id}: Space`).toBe(3);
      await host(page, id).evaluate((el) => (el as HTMLElement).click());
      expect((await events(page)).click, `${id}: element.click()`).toBe(4);
    }
  });

  test('MAB-2: a disabled main action button emits no click, is not focusable and exposes disabled', async ({ page }) => {
    const target = host(page, 'filled-disabled');
    await listen(target);
    await target.evaluate((el) => {
      (el as HTMLElement).click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    });
    await target.click({ force: true });
    await target.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect((await events(page)).click).toBe(0);
    expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('tanrei-main-action-button');
    await expect(target.getByRole('button', { name: 'Compose', disabled: true })).toHaveCount(1);
    // Tab passes over it: the fixture before it is the last stop.
    await tabTo(page, host(page, 'filled-large-collapsed'));
    await tab(page);
    await expect(inner(page, 'filled-disabled')).not.toBeFocused();
    expect(await target.evaluate((el) => el.matches(':focus-within'))).toBe(false);
  });

  test('MAB-3: each state renders the container, label, icon, elevation and opacity from that state’s tokens; the default system raises it under hover', async ({ page }) => {
    const id = 'tonal-extended';
    const look = () => drawn(page, id);
    expect(await look()).toEqual(await expected(page, 'tonal', ''));
    expect(await resolveShadow(page, T('tonal-hovered-container-elevation'))).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level4'));
    expect(await resolveShadow(page, T('tonal-container-elevation'))).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level3'));
    await host(page, id).hover();
    await expect.poll(look).toEqual(await expected(page, 'tonal', 'hovered-'));
    // The icon is drawn in the label color of the state (MAB-12).
    expect(await style(glyphBox(page, id), 'color')).toBe((await look()).color);
    await page.mouse.down(); // hovered AND pressed: pressed wins
    await expect.poll(look).toEqual(await expected(page, 'tonal', 'pressed-'));
    await page.mouse.up();
    await page.mouse.move(0, 0);
    expect(await inner(page, id).evaluate((el) => el.matches(':focus-visible'))).toBe(false);
    await expect.poll(look).toEqual(await expected(page, 'tonal', ''));
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    await expect.poll(look).toEqual(await expected(page, 'tonal', 'focused-'));
    expect(await host(page, id).locator('.state-layer').count()).toBe(0);
  });

  test('MAB-3: under acme, where the three states differ, pressed beats focused beats hovered — in either form', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const id of ['filled-extended', 'filled-collapsed']) {
      const bg = () => css(page, id, 'background-color');
      const [rest, hovered, focused, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`filled-${s}container-color`))));
      expect(new Set([rest, hovered, focused, down]).size, id).toBe(4);
      await page.mouse.move(0, 0);
      await expect.poll(bg, id).toBe(rest);
      await host(page, id).hover();
      await expect.poll(bg, id).toBe(hovered);
      await tabTo(page, host(page, id));
      await expect.poll(bg, id).toBe(focused);
      await page.keyboard.down('Space');
      await expect.poll(bg, id).toBe(down);
      await page.keyboard.up('Space');
      await expect.poll(bg, id).toBe(focused);
      await page.mouse.down();
      await expect.poll(bg, id).toBe(down);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
  });

  test('MAB-4: keyboard focus shows the focus ring immediately; pointer focus does not', async ({ page }) => {
    const target = inner(page, 'filled-extended');
    await host(page, 'filled-extended').click();
    await expect(target).toHaveCSS('outline-style', 'none');
    expect(await css(page, 'filled-extended', 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, 'filled-extended'));
    await expect(target).toHaveCSS('outline-style', 'solid');
    await expect(target).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(target).toHaveCSS('outline-width', `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    await expect(target).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    expect(await css(page, 'filled-extended', 'transition-property')).not.toContain('outline');
  });

  test('MAB-5: the hit area meets sys.target.pointer on both axes while the container keeps its size', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    // The small one is below the target in the default system: the test must exercise the extension.
    expect(await resolveToken(page, T('container-height-small'))).toBeLessThan(pointer);
    for (const [id, size] of [['filled-small-extended', 'small'], ['filled-small-collapsed', 'small'], ['filled-extended', 'medium'], ['filled-collapsed', 'medium']] as const) {
      const box = await bounds(inner(page, id));
      expect(box.height, id).toBe(await resolveToken(page, T(`container-height-${size}`)));
      const hit = await inner(page, id).evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
      expect(Math.min(...hit), id).toBeGreaterThanOrEqual(pointer);
      expect(hit[0], id).toBeGreaterThanOrEqual(box.width);
    }
    // A click just outside the small collapsed square, inside the target, still activates — on each axis. The fixture
    // is below the fold of the page of fixtures, and a mouse position is a point of the viewport: bring it in first.
    await inner(page, 'filled-small-collapsed').scrollIntoViewIfNeeded();
    const box = await bounds(inner(page, 'filled-small-collapsed'));
    await listen(host(page, 'filled-small-collapsed'));
    const d = (pointer - box.height) / 4;
    await page.mouse.click(box.x + box.width / 2, box.y - d);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + d);
    await page.mouse.click(box.x - d, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width + d, box.y + box.height / 2);
    expect((await events(page)).click).toBe(4);
  });

  test('MAB-5: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await inner(page, 'filled-small-collapsed').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit).toEqual([touch, touch]);
  });

  test('MAB-6: disabled renders the container, label, icon, elevation and opacity from the disabled tokens of its variant', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...spec.fixtures, fixture('tonal-disabled', { variant: 'tonal', disabled: true, label: 'Compose' }), fixture('surface-disabled', { variant: 'surface', disabled: true, label: 'Compose' })],
    });
    for (const variant of ['filled', 'tonal', 'surface']) {
      const id = `${variant}-disabled`;
      expect(await drawn(page, id), id).toEqual(await expected(page, variant, 'disabled-'));
      expect(await style(glyphBox(page, id), 'color'), id).toBe((await drawn(page, id)).color);
      expect(await resolveShadow(page, T(`${variant}-disabled-container-elevation`))).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level0'));
    }
  });

  test('MAB-11: extended, the container is the size’s height with its corners; paddings, gap and width come from the size’s tokens', async ({ page }) => {
    for (const [id, size] of [['filled-small-extended', 'small'], ['filled-extended', 'medium'], ['filled-large-extended', 'large']] as const) {
      const [button, icon, text] = [await bounds(inner(page, id)), await bounds(glyphBox(page, id)), await textBox(page, id)];
      const t = async (name: string) => resolveToken(page, T(`container-${name}-${size}`));
      expect(button.height, id).toBe(await t('height'));
      expect(await css(page, id, 'border-top-left-radius'), id).toBe(await css(page, id, 'border-bottom-right-radius'));
      expect(icon.x - button.x, `${id}: start with icon`).toBeCloseTo(await t('padding-inline-start-with-icon'), 1);
      expect(text.x - (icon.x + icon.width), `${id}: gap`).toBeCloseTo(await t('gap'), 0);
      expect(button.x + button.width - (text.x + text.width), `${id}: end`).toBeCloseTo(await t('padding-inline-end'), 0);
      expect(Number.parseFloat(await css(page, id, 'padding-top')), `${id}: block`).toBe(await t('padding-block'));
    }
    // A trailing icon: the label first, then the gap, the icon, and the end padded by padding-inline-end-with-icon.
    {
      const id = 'filled-icon-trailing';
      const [button, icon, text] = [await bounds(inner(page, id)), await bounds(glyphBox(page, id)), await textBox(page, id)];
      expect(text.x - button.x, `${id}: start`).toBeCloseTo(await resolveToken(page, T('container-padding-inline-start-medium')), 0);
      expect(icon.x - (text.x + text.width), `${id}: gap`).toBeCloseTo(await resolveToken(page, T('container-gap-medium')), 0);
      expect(button.x + button.width - (icon.x + icon.width), `${id}: end with icon`).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end-with-icon-medium')), 1);
    }
    // Without an icon both ends take the paddings without an icon.
    {
      const id = 'filled-label-only';
      const [button, text] = [await bounds(inner(page, id)), await textBox(page, id)];
      expect(text.x - button.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-start-medium')), 0);
      expect(button.x + button.width - (text.x + text.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end-medium')), 0);
      expect(await glyphBox(page, id).isVisible()).toBe(false);
    }
    // As wide as the content: the host is exactly the button.
    expect((await bounds(host(page, 'filled-extended'))).width).toBe((await bounds(inner(page, 'filled-extended'))).width);
  });

  test('MAB-11, MAB-13: the corners come from the size’s shape token, full in the default system — a pill extended, a circle collapsed', async ({ page }) => {
    for (const size of ['small', 'medium', 'large']) expect(await token(page, T(`container-shape-${size}-pill`)), size).toBe('1');
    for (const id of ['filled-small-extended', 'filled-extended', 'filled-large-extended', 'filled-small-collapsed', 'filled-collapsed', 'filled-large-collapsed']) {
      expect(Number.parseFloat(await css(page, id, 'border-top-left-radius')), id).toBeGreaterThanOrEqual((await bounds(inner(page, id))).height / 2);
    }
  });

  test('MAB-12: the label is set in its size’s text role and label color; the icon in the same color at its size’s icon size, unselected', async ({ page }) => {
    for (const [id, size] of [['filled-small-extended', 'small'], ['filled-extended', 'medium'], ['filled-large-extended', 'large']] as const) {
      const label = labelOf(page, id);
      expect(Number.parseFloat(await style(label, 'font-size')), id).toBe(await resolveToken(page, T(`label-typescale-${size}-font-size`)));
      expect(await style(label, 'font-weight'), id).toBe(await resolveAs(page, 'font-weight', T(`label-typescale-${size}-font-weight`)));
      expect(await style(label, 'letter-spacing'), id).toBe(await resolveAs(page, 'letter-spacing', T(`label-typescale-${size}-letter-spacing`)));
      expect(await family(label), id).toBe(await familyToken(page, T(`label-typescale-${size}-font-family`)));
    }
    // The icon size of each size, in either form.
    for (const size of ['small', 'medium', 'large']) {
      const icon = await resolveToken(page, T(`icon-size-${size}`));
      for (const id of size === 'medium' ? ['filled-extended', 'filled-collapsed'] : [`filled-${size}-extended`, `filled-${size}-collapsed`]) {
        const box = await bounds(glyphBox(page, id));
        expect([box.width, box.height], id).toEqual([icon, icon]);
        expect(Number.parseFloat(await style(glyphBox(page, id), 'font-size')), id).toBe(icon);
        expect((await axes(glyphBox(page, id))).opsz, id).toBe(await opticalSize(page, icon));
      }
    }
    for (const variant of ['filled', 'tonal', 'surface']) {
      for (const id of [`${variant}-extended`, `${variant}-collapsed`]) {
        expect(await style(labelOf(page, id), 'color'), id).toBe(await resolveColor(page, T(`${variant}-label-color`)));
        expect(await style(glyphBox(page, id), 'color'), id).toBe(await resolveColor(page, T(`${variant}-label-color`)));
      }
    }
    const id = 'filled-extended';
    expect(await family(glyphBox(page, id))).toBe(await familyToken(page, '--tanrei-sys-icon-family-unselected'));
    expect(await axes(glyphBox(page, id))).toEqual({ FILL: Number(await token(page, '--tanrei-sys-icon-fill-unselected')), wght: Number(await token(page, '--tanrei-sys-icon-weight')), GRAD: 0, opsz: await opticalSize(page, await resolveToken(page, T('icon-size-medium'))) });
    expect(await style(glyphBox(page, id), 'font-optical-sizing')).toBe('auto');
    // The icon is centered on the label's line, leading or trailing.
    // (The text's own box is the font's content area, which sits up to half a pixel off the line's middle.)
    for (const one of ['filled-extended', 'filled-icon-trailing']) {
      const [icon, text] = [await bounds(glyphBox(page, one)), await textBox(page, one)];
      expect(Math.abs(icon.y + icon.height / 2 - (text.y + text.height / 2)), one).toBeLessThanOrEqual(1);
    }
  });

  test('MAB-12: the label never truncates — it wraps when the layout gives less width, the container grows, and the icon stays on the first line', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('long', { label: 'Compose a very long message' }), fixture('long-trailing', { label: 'Compose a very long message', iconPosition: 'trailing' }, 'arrow_forward')] });
    for (const id of ['long', 'long-trailing']) {
      const one = await bounds(inner(page, id));
      await page.locator(`[data-fixture="${id}"]`).evaluate((el) => (el.style.inlineSize = '160px'));
      const narrow = await bounds(inner(page, id));
      expect(narrow.width, id).toBeLessThan(one.width);
      expect(narrow.height, id).toBeGreaterThan(one.height);
      const label = labelOf(page, id);
      // Nothing is cut off: no ellipsis and no clipped text.
      expect(await style(label, 'text-overflow')).toBe('clip');
      expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), id).toBe(true);
      const lines = await label.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects().length; });
      expect(lines, id).toBeGreaterThan(1);
      // The icon is centered on the first line, not on the block of lines.
      const [icon, first] = [await bounds(glyphBox(page, id)), await label.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); const f = r.getClientRects()[0]; return { y: f.y, height: f.height }; })];
      const lineHeight = Number.parseFloat(await style(label, 'line-height'));
      expect(Math.abs(icon.y + icon.height / 2 - (first.y + first.height / 2)), id).toBeLessThanOrEqual(1);
      expect(first.height, id).toBeLessThanOrEqual(lineHeight + 1);
    }
  });

  test('MAB-13: collapsed, it is a square of its size’s height with the icon centered whichever side it is on, and label stays the name', async ({ page }) => {
    for (const [id, size] of [['filled-small-collapsed', 'small'], ['filled-collapsed', 'medium'], ['filled-large-collapsed', 'large']] as const) {
      const square = await bounds(inner(page, id));
      const side = await resolveToken(page, T(`container-height-${size}`));
      expect([square.width, square.height], id).toEqual([side, side]);
      await iconCentered(page, id);
    }
    // A trailing icon is centered too.
    await host(page, 'filled-icon-trailing').evaluate(async (el) => { (el as any).extended = false; await (el as any).updateComplete; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(async () => (await bounds(inner(page, 'filled-icon-trailing'))).width).toBe(await resolveToken(page, T('container-height-medium')));
    await iconCentered(page, 'filled-icon-trailing');
    // The label is not seen, and is still the accessible name; the role is still button.
    const id = 'filled-collapsed';
    expect(await style(host(page, id).locator('.label-box'), 'opacity')).toBe('0');
    expect((await bounds(host(page, id).locator('.label-clip'))).width).toBe(0);
    await expect(host(page, id).getByRole('button', { name: 'Compose' })).toHaveCount(1);
    expect(await host(page, id).ariaSnapshot()).toBe('- button "Compose"');
    // The property and the attribute agree (the attribute is the inverse, `collapsed`).
    expect(await host(page, id).evaluate((el) => (el as any).extended)).toBe(false);
    await host(page, id).evaluate((el) => ((el as any).extended = true));
    await expect(host(page, id)).not.toHaveAttribute('collapsed');
    await host(page, 'filled-extended').evaluate((el) => el.setAttribute('collapsed', ''));
    expect(await host(page, 'filled-extended').evaluate((el) => (el as any).extended)).toBe(false);
  });

  test('MAB-13: collapsed, it is a square of its height with the size’s corners and the icon centered in every shipped system', async ({ page }) => {
    const sizes = ['small', 'medium', 'large'] as const;
    for (const system of [undefined, 'm3-like', 'm3-expressive-like', 'cupertino']) {
      await mountFixtures(page, spec, { ...(system ? { system } : {}), reducedMotion: true, fixtures: sizes.map((size) => fixture(`collapsed-${size}`, { size, extended: false, label: 'Compose' })) });
      for (const size of sizes) {
        const id = `collapsed-${size}`;
        const where = `${system ?? 'tanrei'} ${size}`;
        const square = await bounds(inner(page, id));
        const side = await resolveToken(page, T(`container-height-${size}`));
        expect([square.width, square.height], where).toEqual([side, side]);
        const pill = (await token(page, T(`container-shape-${size}-pill`))) === '1';
        const radius = Number.parseFloat(await css(page, id, 'border-top-left-radius'));
        if (pill) expect(radius, where).toBeGreaterThanOrEqual(side / 2);
        else if ((await token(page, '--tanrei-sys-shape-corner-smoothing')) === '0') expect(radius, where).toBe(await resolveToken(page, T(`container-shape-${size}`)));
        await iconCentered(page, id);
      }
    }
  });

  test('MAB-14: the width changes between the two forms over the resize motion, the label fading with it, and at once where motion is reduced', async ({ page }) => {
    const id = 'filled-extended';
    const duration = await resolveToken(page, T('motion-resize-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    const easing = await resolveAs(page, 'transition-timing-function', T('motion-resize-easing'));
    expect(easing).toBe(await resolveAs(page, 'transition-timing-function', '--tanrei-sys-motion-spring-standard-default-spatial-easing'));
    const box = host(page, id).locator('.label-box');
    expect(await style(box, 'transition-property')).toBe('grid-template-columns, opacity');
    expect((await style(box, 'transition-duration')).split(', ').map((d) => Number.parseFloat(d) * 1000)).toEqual([duration, duration]);
    expect(await style(box, 'transition-timing-function')).toBe(`${easing}, ${easing}`);
    const [wide, side] = [(await bounds(inner(page, id))).width, await resolveToken(page, T('container-height-medium'))];
    // The motions are held at their start as the change begins them and read at tenths of their duration
    // (`stepTransitions`): the same moments on any machine, however late it draws. The one-line hold of the label is a
    // timer of the same duration, on the page's clock, held still meanwhile so that it ends with the motion and not
    // while the test reads the middle of it.
    await holdClock(page);
    await holdTransitions(host(page, id));
    await host(page, id).evaluate(async (el) => {
      (el as any).extended = false;
      await (el as any).updateComplete;
    });
    // The paddings move with it, on the same motion (the collapsed form's own transition).
    const paddings = await host(page, id).evaluate((el) => {
      const s = getComputedStyle(el.shadowRoot!.querySelector('button')!);
      const props = s.transitionProperty.split(', ');
      const durations = s.transitionDuration.split(', ');
      return ['padding-inline-start', 'padding-inline-end'].map((p) => Number.parseFloat(durations[props.indexOf(p)]) * 1000);
    });
    const { held, moments, rest } = await stepTransitions(
      host(page, id),
      () =>
        host(page, id).evaluate((el) => {
          const r = el.shadowRoot!.querySelector('button')!.getBoundingClientRect();
          return { width: r.width, height: r.height, opacity: Number(getComputedStyle(el.shadowRoot!.querySelector('.label-box')!).opacity), oneLine: el.shadowRoot!.querySelector('button')!.hasAttribute('data-resizing') };
        }),
      { count: 3 },
    );
    await releaseClock(page);
    // What moves: the label box's columns and its opacity, and the button's end padding (left to right), each over the
    // resize motion.
    expect(held.map(({ property, duration }) => [property, duration]).sort()).toEqual([['grid-template-columns', duration], ['opacity', duration], ['padding-right', duration]]);
    const samples = [...moments, rest];
    expect(paddings).toEqual([duration, duration]);
    // It narrows through widths in between, the label fading out, and ends a square; the height never moves.
    expect(samples.some((s) => s.width < wide - 1 && s.width > side + 1)).toBe(true);
    expect(samples.some((s) => s.opacity > 0 && s.opacity < 1)).toBe(true);
    expect(samples.at(-1)).toMatchObject({ width: side, height: side, opacity: 0 });
    expect(new Set(samples.map((s) => s.height))).toEqual(new Set([side]));
    // While it resizes, the label keeps one line; once it is done, it may wrap again.
    expect(moments.map((s) => s.oneLine)).toEqual(moments.map(() => true));
    await expect(inner(page, id)).not.toHaveAttribute('data-resizing');
    await host(page, id).evaluate((el) => ((el as any).extended = true));
    await expect(inner(page, id)).toHaveAttribute('data-resizing', '');
    await expect(inner(page, id)).not.toHaveAttribute('data-resizing');
    await expect.poll(async () => (await bounds(inner(page, id))).width).toBe(wide);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page, id).evaluate((el) => ((el as any).extended = false));
    expect((await bounds(inner(page, id))).width).toBe(side);
    await expect(inner(page, id)).not.toHaveAttribute('data-resizing');
    await host(page, id).evaluate((el) => ((el as any).extended = true));
    expect((await bounds(inner(page, id))).width).toBe(wide);
  });

  test('MAB-15: without an icon it stays extended when extended is false, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('plain', { label: 'Compose' }, null), fixture('no-icon-collapsed', { label: 'Compose', extended: false }, null)] });
    expect(await bounds(inner(page, 'no-icon-collapsed'))).toMatchObject({ width: (await bounds(inner(page, 'plain'))).width });
    expect(await style(host(page, 'no-icon-collapsed').locator('.label-box'), 'opacity')).toBe('1');
    await expect.poll(() => seen.filter((w) => w.includes('MAB-15'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('MAB-15'))).toMatch(/<tanrei-main-action-button>: extended is false but there is no icon/);
    // Given an icon later, it collapses.
    await host(page, 'no-icon-collapsed').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="icon">edit</span>'));
    await expect.poll(async () => (await bounds(inner(page, 'no-icon-collapsed'))).width).toBe(await resolveToken(page, T('container-height-medium')));
    expect(seen.filter((w) => w.includes('MAB-15'))).toHaveLength(1);
  });

  test('MAB-16: without a label it draws the collapsed form whatever extended says, and a debug build reports that it has no name — over MAB-15 when it has no icon either', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [fixture('nameless', {}), fixture('nameless-empty', {}, null)] });
    const side = await resolveToken(page, T('container-height-medium'));
    for (const id of ['nameless', 'nameless-empty']) {
      expect(await host(page, id).evaluate((el) => (el as any).extended), id).toBe(true);
      const box = await bounds(inner(page, id));
      expect([box.width, box.height], id).toEqual([side, side]);
    }
    await iconCentered(page, 'nameless');
    await expect.poll(() => seen.filter((w) => w.includes('MAB-16'))).toHaveLength(2);
    expect(seen.find((w) => w.includes('MAB-16'))).toMatch(/<tanrei-main-action-button>: label is empty/);
    expect(seen.filter((w) => w.includes('MAB-15'))).toHaveLength(0);
    // Given a label, it extends, and it is named by it.
    await host(page, 'nameless').evaluate((el) => ((el as any).label = 'Share'));
    await expect(host(page, 'nameless').getByRole('button', { name: 'Share' })).toHaveCount(1);
    await expect.poll(async () => (await bounds(inner(page, 'nameless'))).width).toBeGreaterThan(side);
    expect(seen.filter((w) => w.includes('MAB-16'))).toHaveLength(2);
  });

  test('MAB-24: full width, it is as wide as its container, extended whatever extended says, its icon and label centred as one row; a debug build reports a full-width button told to collapse', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { reducedMotion: true });
    const height = await resolveToken(page, T('container-height-medium'));
    for (const id of ['filled-full-width', 'filled-full-width-collapsed']) {
      const stage = await page.locator(`[data-fixture="${id}"]`).evaluate((el) => {
        const s = getComputedStyle(el);
        return el.getBoundingClientRect().width - Number.parseFloat(s.paddingLeft) - Number.parseFloat(s.paddingRight);
      });
      const box = await bounds(inner(page, id));
      expect(Math.abs(box.width - stage), id).toBeLessThan(0.5);
      expect(Math.abs(box.height - height), id).toBeLessThan(0.5);
      expect(await style(host(page, id).locator('.label-box'), 'opacity'), id).toBe('1');
      const centred = await inner(page, id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const icon = el.querySelector('.icon-box')!.getBoundingClientRect();
        const label = el.querySelector('.label')!.getBoundingClientRect();
        return { before: icon.left - (r.left + Number.parseFloat(s.paddingLeft)), after: r.right - Number.parseFloat(s.paddingRight) - label.right };
      });
      expect(Math.abs(centred.before - centred.after), id).toBeLessThan(1);
      expect(centred.before, id).toBeGreaterThan(0);
    }
    await expect.poll(() => seen.filter((w) => w.includes('MAB-24'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('MAB-24'))).toMatch(/<tanrei-main-action-button>: extended is false but the button is full width/);
    // Taken off, the collapsed one collapses to its square, and the other one is as wide as its content again.
    await host(page, 'filled-full-width-collapsed').evaluate((el) => ((el as any).fullWidth = false));
    await expect.poll(async () => (await bounds(inner(page, 'filled-full-width-collapsed'))).width).toBe(height);
    await host(page, 'filled-full-width').evaluate((el) => ((el as any).fullWidth = false));
    await expect.poll(async () => (await bounds(inner(page, 'filled-full-width'))).width).toBe((await bounds(inner(page, 'filled-extended'))).width);
  });

  test('MAB-24: a full-width button narrower than its label wraps it, its lines centred, inside its container', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('long-full', { label: 'Compose a very long message', fullWidth: true })] });
    await page.locator('[data-fixture="long-full"]').evaluate((el) => ((el as HTMLElement).style.inlineSize = '160px'));
    const drawn = await inner(page, 'long-full').evaluate((el) => {
      const label = el.querySelector('.label')!;
      return { width: el.getBoundingClientRect().width, align: getComputedStyle(label).textAlign, lines: label.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(label).lineHeight) };
    });
    expect(drawn.width).toBeLessThanOrEqual(160.5);
    expect(drawn.align).toBe('center');
    expect(drawn.lines).toBeGreaterThan(1.5);
  });

  test('MAB-17: the elevation of the variant and state is cast outside the container, unclipped, in either form', async ({ page }) => {
    for (const variant of ['filled', 'tonal', 'surface']) {
      for (const id of [`${variant}-extended`, `${variant}-collapsed`]) {
        expect(await css(page, id, 'box-shadow'), id).toBe(await resolveShadow(page, T(`${variant}-container-elevation`)));
      }
    }
    for (const id of ['filled-extended', 'filled-collapsed']) {
      for (const el of [host(page, id), inner(page, id)]) expect(await el.evaluate((e) => getComputedStyle(e).overflow), id).toBe('visible');
      const stage = page.locator(`[data-fixture="${id}"]`);
      const [square, origin] = [await bounds(inner(page, id)), await bounds(stage)];
      const shot = decodePng(await stage.screenshot({ animations: 'disabled', scale: 'css' }));
      const surface = await resolveColor(page, '--tanrei-sys-color-surface');
      expect(shot.at(Math.round(square.x - origin.x + square.width / 2), Math.round(square.y - origin.y + square.height + 4)), id).not.toBe(surface);
      expect(shot.at(1, 1), id).toBe(surface);
    }
  });

  test('MAB-17: colors and elevation change over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    const id = 'filled-extended';
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const easing = await resolveAs(page, 'transition-timing-function', T('motion-state-easing'));
    expect(await css(page, id, 'transition-property')).toBe('background-color, color, box-shadow, opacity');
    expect(Number.parseFloat(await css(page, id, 'transition-duration')) * 1000).toBe(duration);
    expect(await css(page, id, 'transition-timing-function')).toBe(easing);
    // Kept as the engine announces them, not asked for after the hover: on a slow runner the answer to a later question
    // can arrive when a transition of this length is over.
    await watchTransitions(inner(page, id));
    await host(page, id).hover();
    await expect.poll(() => transitionsRun(inner(page, id))).toContainEqual({ property: 'box-shadow', pseudo: '', own: true, on: expect.any(String), duration, easing });
    await page.mouse.move(0, 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(page, id, 'transition-duration')).toBe('0s');
    await host(page, id).hover();
    expect(await css(page, id, 'box-shadow')).toBe(await resolveShadow(page, T('filled-hovered-container-elevation')));
  });

  test('MAB-18: it does not position itself — inline, at its own size, where the page puts it, with no scrim', async ({ page }) => {
    const id = 'filled-extended';
    const layout = await host(page, id).evaluate((el) => { const s = getComputedStyle(el); return { position: s.position, display: s.display, inset: [s.top, s.right, s.bottom, s.left] }; });
    expect(layout).toEqual({ position: 'static', display: 'inline-flex', inset: ['auto', 'auto', 'auto', 'auto'] });
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.children].filter((c) => c.localName !== 'style').map((c) => c.localName))).toEqual(['button']);
    // The layout decides which edge stays put: anchored at the inline end, it collapses toward that end.
    await host(page, id).evaluate((el) => (el as HTMLElement).setAttribute('style', 'position: fixed; inset-inline-end: 16px; inset-block-end: 16px'));
    const viewport = page.viewportSize()!;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const extended of [true, false]) {
      await host(page, id).evaluate((el, e) => ((el as any).extended = e), extended);
      const placed = await bounds(inner(page, id));
      expect(placed.x + placed.width, `extended ${extended}`).toBe(viewport.width - 16);
      expect(placed.y + placed.height, `extended ${extended}`).toBe(viewport.height - 16);
    }
  });

  test('MAB-19: in RTL the icon and label mirror on either side, the paddings are logical, the glyph is not flipped, and a ripple grows from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    // A change of direction is not a resize: nothing animates.
    expect(await inner(page, 'filled-extended').evaluate((el) => el.getAnimations().length)).toBe(0);
    {
      const id = 'filled-extended';
      const [button, icon, text] = [await bounds(inner(page, id)), await bounds(glyphBox(page, id)), await textBox(page, id)];
      expect(icon.x).toBeGreaterThan(text.x); // a leading icon is at the right, the start
      expect(button.x + button.width - (icon.x + icon.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-start-with-icon-medium')), 1);
      expect(text.x - button.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end-medium')), 0);
    }
    {
      const id = 'filled-icon-trailing';
      const [button, icon, text] = [await bounds(inner(page, id)), await bounds(glyphBox(page, id)), await textBox(page, id)];
      expect(icon.x).toBeLessThan(text.x); // a trailing icon is at the left, the end
      expect(icon.x - button.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-end-with-icon-medium')), 1);
      expect(button.x + button.width - (text.x + text.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-start-medium')), 0);
      // The glyph itself is drawn as in LTR: no mirroring transform on it or its box.
      for (const el of [glyphBox(page, id), host(page, id).locator('.icon-box')]) expect(await style(el, 'transform')).toBe('none');
    }
    // A ripple from where the pointer went down, as in LTR.
    // (A pointer lands on whole pixels; the button, right-aligned, may not start on one.)
    const id = 'filled-extended';
    const button = await bounds(inner(page, id));
    const [mx, my] = [Math.round(button.x + 12), Math.round(button.y + 10)];
    await page.mouse.move(mx, my);
    await page.mouse.down();
    const at = await ripples(page, id).evaluate((el) => {
      const own = el.getBoundingClientRect();
      const container = el.parentElement!.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - container.left, Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - container.top];
    });
    expect(at[0]).toBeCloseTo(mx - button.x, 0);
    expect(at[1]).toBeCloseTo(my - button.y, 0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('MAB-20: a plain button named by label, with no pressed, selected, checked or expanded state; changing extended keeps role, name and focus and announces nothing', async ({ page }) => {
    const id = 'filled-extended';
    // On the native button and on the host alike.
    const states = () =>
      inner(page, id).evaluate((el) => {
        const owner = (el.getRootNode() as ShadowRoot).host;
        return ['aria-pressed', 'aria-selected', 'aria-checked', 'aria-expanded'].flatMap((a) => [el.getAttribute(a), owner.getAttribute(a)]).filter((v) => v !== null);
      });
    expect(await states()).toEqual([]);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length)).toBe(0);
    await tabTo(page, host(page, id));
    for (const extended of [false, true, false]) {
      await host(page, id).evaluate(async (el, e) => { (el as any).extended = e; await (el as any).updateComplete; }, extended);
      await expect(inner(page, id), `extended ${extended}`).toBeFocused();
      expect(await host(page, id).ariaSnapshot(), `extended ${extended}`).toBe('- button "Compose"');
      expect(await states(), `extended ${extended}`).toEqual([]);
    }
    // Activating it performs the action and does not change its form: it is not a toggle.
    await listen(host(page, id));
    await page.keyboard.press('Enter');
    expect((await events(page)).click).toBe(1);
    expect(await host(page, id).evaluate((el) => (el as any).extended)).toBe(false);
    await host(page, 'filled-collapsed').click();
    expect(await host(page, 'filled-collapsed').evaluate((el) => (el as any).extended)).toBe(false);
  });
});

// ── Choices of kind and the press itself ─────────────────────────────────────────────
/** A cupertino whose medium main action button is not a capsule (MAB-10), built the way a product builds its layer. */
let squareCupertinoCss: Promise<string> | undefined;
const squareCupertino = () =>
  (squareCupertinoCss ??= (async () => {
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const layer = { id: 'square-cupertino', name: 'Square cupertino', extends: 'cupertino', description: 'A test layer.', tokens: { 'tanrei.comp.main-action-button.container.shape.medium': { $value: '{tanrei.sys.shape.corner.large}' } } };
    return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
  })());

test.describe('press, feedback, corners and focus style', () => {
  // The fixture systems are built once per worker, up front, outside any test's budget.
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
    await squareCupertino();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  const watchPress = (page: P, id: string) =>
    inner(page, id).evaluate((el) => {
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (el.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(el);
          log.seen ??= [el.getAttribute('data-pressed')!, s.transitionDuration, s.backgroundColor];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) el.addEventListener(type, () => (log.up ??= performance.now()));
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  const CLOCK = 1;
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('MAB-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    // The keys first, the clicks last: after a click WebKit takes the page for a pointer's — across a new document —
    // and neither draws a scripted focus() as keyboard focus nor moves focus by Tab.
    for (const name of ['Enter', 'Space', 'click'] as const) {
      for (const id of ['filled-extended', 'filled-collapsed']) {
        await mountFixtures(page, spec);
        // The state the press comes from is settled first — keyboard focus for a key, the pointer's hover for a click:
        // in the default system it has the pressed state's color, and a transition already running towards that
        // color is, correctly, not restarted by the press.
        if (name === 'click') {
          await host(page, id).hover();
          await expect.poll(() => css(page, id, 'background-color')).toBe(await resolveColor(page, T('filled-hovered-container-color')));
        } else {
          await tabTo(page, host(page, id));
          await expect.poll(() => css(page, id, 'background-color')).toBe(await resolveColor(page, T('filled-focused-container-color')));
        }
        await watchPress(page, id);
        // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is
        // the short one at the system's own hold, however long the driver takes to send the release.
        const activate = () => (name === 'click' ? clickCentre(page, host(page, id)) : page.keyboard.press(name));
        await heldPress(page, hold, activate, async () => (await pressLog(page)).off !== undefined, `${id} ${name}`);
        const log = await pressLog(page);
        expect(log.seen, `${id} ${name}`).toEqual(['overlay', '0s', await resolveColor(page, T('filled-pressed-container-color'))]);
        expect(log.up! - log.on!, `${id} ${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
        expect(log.off! - log.down!, `${id} ${name}`).toBeGreaterThanOrEqual(hold - CLOCK);
      }
    }
  });

  test('MAB-8: a pointer press lasts while the pointer is down, even when focus leaves; a key press ends when focus leaves; disabled shows none', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    const id = 'filled-extended';
    await host(page, id).focus();
    await host(page, id).hover();
    await page.mouse.down();
    await inner(page, id).evaluate((el) => el.blur());
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, id)).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, id)).toBeNull();
    await host(page, id).focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, id)).toBe('overlay');
    await inner(page, id).evaluate((el) => el.blur());
    await expect.poll(() => pressed(page, id)).toBeNull();
    await page.keyboard.up('Space');
    await host(page, 'filled-disabled').click({ force: true });
    expect(await pressed(page, 'filled-disabled')).toBeNull();
  });

  test('MAB-8: a press is never a selection of the label nor the start of a drag — a press held on the button inside a selection of the page that reaches across it ends with the pointer', async ({ page }) => {
    const id = 'filled-extended';
    await page.evaluate(() => {
      const seen: string[] = ((window as any).seen = []);
      for (const type of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(type, () => seen.push(type), true);
      // The drag an engine would begin, had the button not refused it.
      window.addEventListener('dragstart', (event) => seen.push(event.defaultPrevented ? 'dragstart:refused' : 'dragstart'));
    });
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => {
      el.insertAdjacentHTML('beforebegin', '<p id="before">Text of the page before the button</p>');
      el.insertAdjacentHTML('afterend', '<p id="after">Text of the page after the button</p>');
    });
    // A selection swept by the pointer from the text before the button to the text after it takes none of the button's
    // (WebKit took the label and the icon's name: `user-select` alone).
    await page.locator('#after').scrollIntoViewIfNeeded();
    const [from, to] = [await bounds(page.locator('#before')), await bounds(page.locator('#after'))];
    await page.mouse.move(from.x + 1, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + 30, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    const selected = await page.evaluate(() => String(getSelection()));
    expect(selected).toContain('before the button');
    expect(selected).not.toMatch(/Compose|edit/);
    await page.evaluate(() => (window as any).seen.splice(0));
    // A press held on the button inside that selection — longer than an engine waits before it takes a press for a
    // drag of the selected text — is a press: it ends where the pointer ends it.
    await host(page, id).hover();
    await page.mouse.down();
    await expect.poll(() => pressed(page, id)).toBe('overlay');
    await page.waitForTimeout(400);
    await page.mouse.move(0, 0, { steps: 4 });
    await page.mouse.up();
    await expect.poll(() => pressed(page, id)).toBeNull();
    expect((await page.evaluate(() => (window as any).seen.join(' '))).replace(' dragstart:refused', '')).toBe('pointerdown pointerup');
  });

  test('MAB-9 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    for (const variant of ['tonal', 'surface']) {
      for (const id of [`${variant}-extended`, `${variant}-collapsed`]) {
        await host(page, id).hover();
        await page.mouse.down();
        expect(await pressed(page, id)).toBe('overlay');
        expect(await drawn(page, id), id).toEqual(await expected(page, variant, 'pressed-'));
        expect(await ripples(page, id).count()).toBe(0);
        await page.mouse.move(0, 0);
        await page.mouse.up();
      }
    }
  });

  test('MAB-9 ripple (m3-like): the pressed layer grows from the point of contact, clipped to the container; label, icon and elevation take their pressed tokens at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'tonal-extended';
    const box = await bounds(inner(page, id));
    const hovered = await resolveColor(page, T('tonal-hovered-container-color'));
    await override(page, { [T('tonal-pressed-label-color')]: 'rgb(0, 0, 255)', [T('tonal-pressed-container-elevation')]: 'var(--tanrei-sys-elevation-level1)' });
    await page.mouse.move(box.x + 30, box.y + 8);
    await expect.poll(() => css(page, id, 'background-color')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, id));
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('ripple');
    const ripple = ripples(page, id);
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      const container = el.parentElement!.getBoundingClientRect();
      const own = el.getBoundingClientRect();
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - container.left,
        y: Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - container.top,
        color: s.backgroundColor,
        animation: s.animationName,
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
        behind: s.zIndex,
      };
    });
    expect(layer.x).toBeCloseTo(30, 0);
    expect(layer.y).toBeCloseTo(8, 0);
    expect(layer.color).toBe(await resolveColor(page, T('tonal-pressed-container-color')));
    expect(layer).toMatchObject({ animation: 'ripple-grow', behind: '-1' });
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(await css(page, id, 'background-color')).toBe(hovered);
    expect(await css(page, id, 'color')).toBe('rgb(0, 0, 255)');
    expect(await style(glyphBox(page, id), 'color')).toBe('rgb(0, 0, 255)');
    expect(await css(page, id, 'box-shadow')).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level1'));
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
  });

  test('MAB-9 ripple: keyboard activation answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    const id = 'filled-collapsed';
    await host(page, id).focus();
    await page.keyboard.down('Enter');
    const center = await ripples(page, id).evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await expect(ripples(page, id)).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    const still = await ripples(page, id).evaluate((el) => { const s = getComputedStyle(el); return { animation: s.animationName, transition: s.transitionDuration }; });
    expect(still).toEqual({ animation: 'none', transition: '0s' });
    await page.keyboard.up('Enter');
    await expect(ripples(page, id)).toHaveCount(0);
  });

  test('MAB-9 dim (cupertino): the pressed opacity on the whole control, no state layer; the label takes its pressed color', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    const id = 'filled-extended';
    await override(page, { [T('filled-pressed-container-color')]: 'rgb(255, 0, 0)', [T('filled-hovered-container-color')]: 'rgb(0, 255, 0)', [T('filled-pressed-label-color')]: 'rgb(0, 0, 255)' });
    await host(page, id).hover();
    await expect.poll(() => css(page, id, 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('dim');
    expect(await css(page, id, 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(page, id, 'opacity'))).toBeLessThan(1);
    expect(await css(page, id, 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await css(page, id, 'color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, id).count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('MAB-9 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    const id = 'filled-extended';
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await host(page, id).hover();
    await expect.poll(() => drawn(page, id)).toEqual(await expected(page, 'filled', 'hovered-'));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, id));
    const before = await drawn(page, id);
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('none');
    expect(await drawn(page, id)).toEqual(before);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('overlay');
    await page.mouse.up();
  });

  test('MAB-10 corner smoothing: a full corner stays round in cupertino in either form; a non-round corner is eased', async ({ page }) => {
    const radius = (id: string, pseudo?: string) => css(page, id, 'border-top-left-radius', pseudo).then(Number.parseFloat);
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0');

    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    for (const [id, size] of [['filled-small-extended', 'small'], ['filled-extended', 'medium'], ['filled-large-extended', 'large'], ['filled-collapsed', 'medium']] as const) {
      expect(await token(page, T(`container-shape-${size}-pill`)), id).toBe('1');
      expect(await radius(id), id).toBeGreaterThanOrEqual((await bounds(inner(page, id))).height / 2);
      expect(await css(page, id, 'corner-top-left-shape'), id).toMatch(/^(round|superellipse\(1\)|)$/);
    }

    await mountFixtures(page, spec, { system: 'square-cupertino', systemCss: await squareCupertino() });
    const shape = await resolveToken(page, T('container-shape-medium'));
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    if (supported) {
      expect(Number.parseFloat((await css(page, 'filled-extended', 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(await radius('filled-extended')).toBeCloseTo(shape * 1.24, 2);
      await tabTo(page, host(page, 'filled-extended'));
      expect(await css(page, 'filled-extended', 'corner-top-left-shape', '::after')).toBe(await css(page, 'filled-extended', 'corner-top-left-shape'));
    } else {
      expect(await css(page, 'filled-extended', 'corner-top-left-shape')).toBe('');
      expect(await radius('filled-extended')).toBe(shape);
    }
  });

  test('MAB-10 focus-style: acme shows keyboard focus as a glow in the same two focus colors; the default is a ring', async ({ page }) => {
    const id = 'filled-extended';
    await tabTo(page, host(page, id));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(page, id, 'box-shadow', '::after')).toBe('none');
    expect(await inner(page, id).getAttribute('data-focus-style')).toBe('ring');

    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    await host(page, id).click();
    expect(await css(page, id, 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    const outer = await resolveToken(page, '--tanrei-sys-focus-outer-width');
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    expect(await css(page, id, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(page, id, 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${ring} 0px 0px ${outer}px ${outer + 1}px`);
    expect(await inner(page, id).getAttribute('data-focus-style')).toBe('glow');
  });
});

// ── A design system may add sizes and variants ───────────────────────────────────────
test.describe('values a design system adds', () => {
  const layer = {
    id: 'wide',
    name: 'Wide',
    extends: 'tanrei',
    description: 'A test layer that adds a main action button size and variant.',
    vocabulary: {
      'tanrei.comp.main-action-button.size.xl': { from: 'large', scale: 1.5, rationale: 'A hero action.' },
      'tanrei.comp.main-action-button.variant.danger': { from: 'filled', rationale: 'A destructive main action.' },
    },
    tokens: {
      'tanrei.comp.main-action-button.danger.container.color': { $value: '{tanrei.sys.color.error}' },
      'tanrei.comp.main-action-button.danger.label.color': { $value: '{tanrei.sys.color.on-error}' },
    },
  };
  let layerCss: Promise<string> | undefined;
  const sheet = () =>
    (layerCss ??= (async () => {
      const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
      const { emitCss } = await import('@tanrei/tokens-build/emit/css');
      return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    })());
  const fixtures = [
    fixture('size-xl', { size: 'xl', label: 'Add' }),
    fixture('size-xl-collapsed', { size: 'xl', extended: false, label: 'Add' }),
    fixture('variant-danger', { variant: 'danger', label: 'Delete' }),
    fixture('size-unknown', { size: 'colossal', label: 'Add' }),
    fixture('variant-unknown', { variant: 'sparkly', label: 'Add' }),
    fixture('plain', { label: 'Add' }),
  ];
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await sheet();
  });

  test('a size and a variant a layer adds render from their tokens, in either form, with no report', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures, reducedMotion: true });
    const side = await resolveToken(page, T('container-height-xl'));
    expect((await bounds(inner(page, 'size-xl'))).height).toBe(side);
    const collapsed = await bounds(inner(page, 'size-xl-collapsed'));
    expect([collapsed.width, collapsed.height]).toEqual([side, side]);
    expect(await css(page, 'variant-danger', 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    expect(await css(page, 'variant-danger', 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-on-error'));
    expect(seen.filter((w) => /size "xl"|variant "danger"/.test(w))).toEqual([]);
  });

  test('MAB-7: a value the active design system does not have renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures });
    expect(await bounds(inner(page, 'size-unknown'))).toMatchObject({ width: (await bounds(inner(page, 'plain'))).width, height: (await bounds(inner(page, 'plain'))).height });
    expect(await drawn(page, 'variant-unknown')).toEqual(await drawn(page, 'plain'));
    await expect.poll(() => seen.filter((w) => w.includes('MAB-7')).length).toBe(2);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/size "colossal" is not a value of the active design system; it is drawn as "medium" \(MAB-7\)/),
      expect.stringMatching(/variant "sparkly" is not a value of the active design system; it is drawn as "filled" \(MAB-7\)/),
    ]));
    const again = warnings(page);
    await mountFixtures(page, spec, { fixtures });
    expect((await bounds(inner(page, 'size-xl'))).height).toBe((await bounds(inner(page, 'plain'))).height);
    expect(await drawn(page, 'variant-danger')).toEqual(await drawn(page, 'plain'));
    await expect.poll(() => again.filter((w) => /size "xl"|variant "danger"/.test(w)).length).toBe(3);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('the name is the label, never the glyph — extended or collapsed; the role is button', async ({ page }) => {
    await mountFixtures(page, spec);
    await expect(page.getByRole('button', { name: 'Compose', exact: true })).toHaveCount(spec.fixtures.filter((f) => f.props.label === 'Compose').length);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /edit|arrow_forward/ })).toHaveCount(0);
    expect(await host(page, 'filled-extended').ariaSnapshot()).toBe('- button "Compose"');
    expect(await host(page, 'filled-collapsed').ariaSnapshot()).toBe('- button "Compose"');
    expect(await host(page, 'filled-disabled').ariaSnapshot()).toBe('- button "Compose" [disabled]');
  });

  test('keyboard: Tab moves focus through the enabled main action buttons in order, Shift+Tab back', async ({ page }) => {
    await mountFixtures(page, spec);
    const enabled = spec.fixtures.filter((f) => !f.props.disabled).map((f) => f.id);
    await tabTo(page, host(page, enabled[0]));
    for (const id of enabled.slice(1)) {
      await tab(page);
      await expect(inner(page, id), id).toBeFocused();
    }
    await tab(page, { back: true });
    await expect(inner(page, enabled.at(-2)!)).toBeFocused();
  });

  test('at 200% text size the label stays whole and the container grows with it; collapsed, the square grows and stays square', async ({ page }) => {
    await mountFixtures(page, spec);
    const [before, square] = [await bounds(inner(page, 'filled-extended')), await bounds(inner(page, 'filled-collapsed'))];
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const [after, grown] = [await bounds(inner(page, 'filled-extended')), await bounds(inner(page, 'filled-collapsed'))];
    expect(after.width).toBeGreaterThan(before.width);
    expect(after.height).toBeGreaterThan(before.height);
    expect(await labelOf(page, 'filled-extended').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(host(page, 'filled-extended').getByRole('button', { name: 'Compose' })).toHaveCount(1);
    expect(grown.height).toBeGreaterThan(square.height);
    expect(grown.width).toBe(grown.height);
  });

  test('forced colors: the container keeps a visible border where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    expect(await css(page, 'filled-extended', 'border-top-style')).toBe('solid');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('the icon faces are loaded, so every baseline draws glyphs, not ligature text', async ({ page }) => {
    for (const { id, slots } of spec.fixtures) {
      if (!slots?.icon) continue;
      const [text, box] = await glyphBox(page, id).evaluate((el) => {
        const node = el.querySelector('slot')!.assignedElements()[0];
        const range = document.createRange();
        range.selectNodeContents(node);
        return [range.getBoundingClientRect().width, el.getBoundingClientRect().width];
      });
      expect(text, id).toBeCloseTo(box, 0);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
