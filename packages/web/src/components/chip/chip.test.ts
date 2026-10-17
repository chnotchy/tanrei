// <tanrei-chip>, driven by specs/chip.spec.json: every behaviour id (CHP-1…28) is cited by a test title, every fixture
// has a baseline, and every state, look, kind and choice of kind is read back from the tokens — never from a number
// written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { MIRRORED, anchorOf, expectDisabledLink, expectDrawnAlike, expectLinkActivation, expectNewContext, expectRefusals, expectTargetLabel, markOf, settledPaint } from '../../../test/links.js';
import { opticalSize } from '../../../test/icons.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { simulateMacClickFocus } from '../../../test/click-focus.js';

const spec = loadSpec('chip');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-chip`);
const inner = (page: P, id: string) => host(page, id).locator('.container');
const removeOf = (page: P, id: string) => host(page, id).locator('.remove');
const labelOf = (page: P, id: string) => host(page, id).locator('.label');
const iconOf = (page: P, id: string) => host(page, id).locator('.icon');
const checkOf = (page: P, id: string) => host(page, id).locator('.check');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const style = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const css = (page: P, id: string, property: string, pseudo?: string) => style(inner(page, id), property, pseudo);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-chip-${name}`;
const pressed = (locator: Locator) => locator.getAttribute('data-pressed');
/**
 * Keyboard focus on an input chip's remove action. It is not a Tab stop (CHP-18): Tab reaches the chip, and script moves
 * focus on to the remove action — as assistive technology does — so that it is keyboard focus that arrives there.
 */
const keyFocusRemove = async (page: P, id: string) => {
  await tabTo(page, inner(page, id));
  await removeOf(page, id).focus();
};
// A token the root already declares, written alone, is restyled for seconds in WebKit (README, "A single token set on
// the root from script"): six such writes took
// CHP-8's test to its time limit on a busy machine. `rootTokens()` changes the number of names with the write, which is not compared.
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
/** Counts the element's click, change and remove events, and the `selected` each change carried. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = { click: 0, change: 0, remove: 0, carried: [] as boolean[], selectedAtClick: [] as boolean[] });
    el.addEventListener('click', () => { log.click++; log.selectedAtClick.push((el as any).selected); });
    el.addEventListener('change', (event) => { log.change++; log.carried.push((event as CustomEvent).detail.selected); });
    el.addEventListener('remove', () => log.remove++);
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { click: number; change: number; remove: number; carried: boolean[]; selectedAtClick: boolean[] });
/**
 * Waits until the page has not scrolled for six frames in a row. Space on a page whose focus stayed on the body scrolls it,
 * and Firefox scrolls smoothly: a pointer action measured while that scroll runs lands on whatever has moved under it.
 */
const stillPage = (page: P) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = scrollY;
        let still = 0;
        const frame = () => {
          still = scrollY === last ? still + 1 : 0;
          last = scrollY;
          if (still >= 6) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
/** Whether focus is on the element or anywhere in its shadow root. */
const holdsFocus = (locator: Locator) => locator.evaluate((el) => document.activeElement === el || el.shadowRoot!.activeElement !== null);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/** A fixture; `content: null` is one without a leading element. */
const fixture = (id: string, props: Fixture['props'], content: string | null = null): Fixture => ({ id, props, ...(content === null ? {} : { content }) });
/** What the chip's container draws: its color, label color, icon color, box-shadow (outline and elevation) and opacity. */
const drawn = (page: P, id: string) =>
  inner(page, id).evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, opacity: s.opacity };
  });
/** What the tokens of a variant, a state (`''`, `'hovered-'`…) and a look (`''` or `'selected-'`) say the chip draws. */
const expected = async (page: P, variant: string, state: string, look = '') => {
  const outline = await resolveColor(page, T(`${variant}-${state}${look}outline-color`));
  const width = await resolveToken(page, T('outline-width'));
  const elevation = await resolveShadow(page, T(`${variant}-${state}${look}container-elevation`));
  return {
    bg: await resolveColor(page, T(`${variant}-${state}${look}container-color`)),
    color: await resolveColor(page, T(`${variant}-${state}${look}label-color`)),
    shadow: `${outline} 0px 0px 0px ${width}px inset, ${elevation}`,
    opacity: state ? await token(page, T(`${state}opacity`)) : '1',
  };
};
const textBox = (locator: Locator) => locator.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });

test.describe('behavior', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('CHP-1: pointer, Enter and Space on the chip each emit click exactly once, for every kind', async ({ page }) => {
    for (const id of ['action-outlined', 'filter-unselected', 'input']) {
      await mountFixtures(page, spec);
      await listen(host(page, id));
      await labelOf(page, id).click();
      expect((await events(page)).click, `${id}: pointer`).toBe(1);
      await host(page, id).focus();
      await page.keyboard.press('Enter');
      expect((await events(page)).click, `${id}: Enter`).toBe(2);
      await page.keyboard.press('Space');
      expect((await events(page)).click, `${id}: Space`).toBe(3);
      await host(page, id).evaluate((el) => (el as HTMLElement).click());
      expect((await events(page)).click, `${id}: element.click()`).toBe(4);
      expect((await events(page)).remove, id).toBe(0);
    }
  });

  test('CHP-2: a disabled chip emits no click, change or remove, is not focusable (nor its remove action) and exposes disabled', async ({ page }) => {
    for (const id of ['action-disabled', 'filter-selected-disabled', 'input-disabled']) {
      const target = host(page, id);
      await listen(target);
      // The previous chip's Space scrolled the page (its focus stayed on the body); a click measured mid-scroll would land on the next chip.
      await stillPage(page);
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await inner(page, id).click({ force: true });
      if (id === 'input-disabled') await removeOf(page, id).click({ force: true });
      await target.focus();
      for (const key of ['Enter', 'Space', 'Backspace', 'Delete']) await page.keyboard.press(key);
      expect(await events(page), id).toMatchObject({ click: 0, change: 0, remove: 0 });
      // This chip — not whichever chip is focused: a pointer that missed would focus a neighbour, and that says nothing about this one.
      expect(await holdsFocus(target), id).toBe(false);
      await expect(target.getByRole('button', { disabled: true }), id).toHaveCount(id === 'input-disabled' ? 2 : 1);
    }
    expect(await host(page, 'filter-selected-disabled').evaluate((el) => (el as any).selected)).toBe(true);
    // Tab passes over the disabled chip and its remove action: from the chip before it straight to the one after it.
    await tabTo(page, inner(page, 'input-small'));
    await tab(page);
    await expect(inner(page, 'input-disabled')).not.toBeFocused();
    await expect(removeOf(page, 'input-disabled')).not.toBeFocused();
    // A disabled input chip offers no key to assistive technology: it removes nothing (CHP-19).
    await expect(inner(page, 'input-disabled')).not.toHaveAttribute('aria-keyshortcuts', /.*/);
  });

  test('CHP-3: each state renders the container, outline, label, icon, elevation and opacity from that state’s tokens; the elevated chip rises under hover', async ({ page }) => {
    const id = 'action-outlined';
    const look = () => drawn(page, id);
    expect(await look()).toEqual(await expected(page, 'outlined', ''));
    expect(await style(iconOf(page, id), 'color')).toBe(await resolveColor(page, T('outlined-icon-color')));
    await host(page, id).hover();
    await expect.poll(look).toEqual(await expected(page, 'outlined', 'hovered-'));
    expect((await look()).bg).not.toBe((await expected(page, 'outlined', '')).bg);
    expect(await style(iconOf(page, id), 'color')).toBe(await resolveColor(page, T('outlined-hovered-icon-color')));
    await page.mouse.down();
    await expect.poll(look).toEqual(await expected(page, 'outlined', 'pressed-'));
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await expect.poll(look).toEqual(await expected(page, 'outlined', ''));
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    await expect.poll(look).toEqual(await expected(page, 'outlined', 'focused-'));
    // The default system raises the elevated chip one level on hover (level3 against level2).
    expect(await resolveShadow(page, T('elevated-hovered-container-elevation'))).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level3'));
    expect(await resolveShadow(page, T('elevated-container-elevation'))).toBe(await resolveShadow(page, '--tanrei-sys-elevation-level2'));
    await host(page, 'action-elevated').hover();
    await expect.poll(() => drawn(page, 'action-elevated')).toEqual(await expected(page, 'elevated', 'hovered-'));
    expect(await host(page, id).locator('.state-layer').count()).toBe(0);
  });

  test('CHP-3: under acme, where the three states differ, pressed beats focused beats hovered — for a selected filter chip too', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const [id, look] of [['action-outlined', ''], ['filter-elevated-selected', 'selected-']] as const) {
      const variant = id === 'action-outlined' ? 'outlined' : 'elevated';
      const bg = () => css(page, id, 'background-color');
      const [rest, hovered, focused, down] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`${variant}-${s}${look}container-color`))));
      expect(new Set([rest, hovered, focused, down]).size, id).toBe(4);
      await page.mouse.move(0, 0);
      await expect.poll(bg, id).toBe(rest);
      await inner(page, id).hover();
      await expect.poll(bg, id).toBe(hovered);
      await tabTo(page, inner(page, id));
      await expect.poll(bg, id).toBe(focused);
      await page.keyboard.down('Space');
      await expect.poll(bg, id).toBe(down);
      await page.keyboard.up('Space');
      if (look) await page.keyboard.press('Space'); // the key-up switched it off: switch it back on
      await expect.poll(bg, id).toBe(focused);
      await page.mouse.down();
      await expect.poll(bg, id).toBe(down);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
  });

  test('CHP-4: keyboard focus shows the focus ring immediately; pointer focus does not', async ({ page }) => {
    const target = inner(page, 'action-outlined');
    await target.click();
    await expect(target).toHaveCSS('outline-style', 'none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, target);
    await expect(target).toHaveCSS('outline-style', 'solid');
    await expect(target).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(target).toHaveCSS('outline-width', `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    await expect(target).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    expect(await css(page, 'action-outlined', 'transition-property')).not.toContain('outline');
  });

  test('CHP-5: the chip’s hit area meets sys.target.pointer on both axes while the chip keeps its size', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [id, size] of [['action-small', 'small'], ['action-outlined', 'medium']] as const) {
      const box = await bounds(inner(page, id));
      expect(box.height, id).toBe(await resolveToken(page, T(`container-height-${size}`)));
      expect(box.height, id).toBeLessThan(pointer);
      const hit = await inner(page, id).evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
      expect(Math.min(...hit), id).toBeGreaterThanOrEqual(pointer);
      await listen(host(page, id));
      const d = (pointer - box.height) / 4;
      await page.mouse.click(box.x + box.width / 2, box.y - d);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height + d);
      expect((await events(page)).click, id).toBe(2);
    }
  });

  test('CHP-5: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    expect(Number.parseFloat(await css(page, 'action-small', 'height', '::before'))).toBe(touch);
    const hit = await removeOf(page, 'input').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(Math.min(...hit)).toBeGreaterThanOrEqual(touch);
  });

  test('CHP-6: disabled renders every part, the remove action included, from the disabled tokens of its variant and selection; the avatar at the disabled content opacity', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('input-avatar-disabled', { kind: 'input', disabled: true, label: 'Ada Lovelace', removeLabel: 'Remove Ada Lovelace' }, 'avatar')] });
    expect(await drawn(page, 'action-disabled')).toEqual(await expected(page, 'outlined', 'disabled-'));
    expect(await style(iconOf(page, 'action-disabled'), 'color')).toBe(await resolveColor(page, T('outlined-disabled-icon-color')));
    expect(await drawn(page, 'filter-selected-disabled')).toEqual(await expected(page, 'outlined', 'disabled-', 'selected-'));
    expect(await style(checkOf(page, 'filter-selected-disabled'), 'color')).toBe(await resolveColor(page, T('outlined-disabled-selected-icon-color')));
    // A selected chip has no border, and disabled it grows none; an outlined chip keeps no fill.
    expect(await resolveColor(page, T('outlined-disabled-selected-outline-color'))).toBe('rgba(0, 0, 0, 0)');
    expect(await resolveColor(page, T('outlined-disabled-container-color'))).toBe('rgba(0, 0, 0, 0)');
    // The remove action (plain by default, CHP-27): its glyph reads as disabled content; its round container stays
    // invisible — as a destructive remove action's does.
    const remove = await removeOf(page, 'input-disabled').evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color]; });
    expect(remove).toEqual([await resolveColor(page, T('outlined-disabled-remove-container-color')), await resolveColor(page, T('outlined-disabled-remove-icon-color'))]);
    expect(remove).toEqual([await resolveColor(page, T('outlined-disabled-destructive-remove-container-color')), await resolveColor(page, T('outlined-disabled-destructive-remove-icon-color'))]);
    expect(remove[0]).toBe('rgba(0, 0, 0, 0)');
    expect(remove[1]).toMatch(/0\.38\)$/);
    expect(Number(await style(host(page, 'input-avatar-disabled').locator('.avatar'), 'opacity'))).toBe(Number(await token(page, '--tanrei-sys-state-disabled-content-opacity')));
    expect(Number(await style(host(page, 'input-avatar').locator('.avatar'), 'opacity'))).toBe(1);
  });

  test('CHP-11: a filter chip switches selected, emits change with the new value and click, and exposes pressed', async ({ page }) => {
    const id = 'filter-unselected';
    await expect(host(page, id).getByRole('button', { name: 'Vegetarian', pressed: false })).toHaveCount(1);
    await listen(host(page, id));
    await inner(page, id).click();
    expect(await events(page)).toMatchObject({ click: 1, change: 1, carried: [true], selectedAtClick: [true] });
    await expect(host(page, id)).toHaveAttribute('selected', '');
    await expect(host(page, id).getByRole('button', { name: 'Vegetarian', pressed: true })).toHaveCount(1);
    await host(page, id).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(await events(page)).toMatchObject({ click: 3, change: 3, carried: [true, false, true] });
    // Setting it from script fires nothing.
    await host(page, id).evaluate((el) => ((el as any).selected = false));
    await expect(inner(page, id)).toHaveAttribute('aria-pressed', 'false');
    expect((await events(page)).change).toBe(3);
  });

  test('CHP-11: a filter chip emits click, then change — by pointer, keyboard and element.click() — and click already sees the new value', async ({ page }) => {
    const id = 'filter-unselected';
    await host(page, id).evaluate((el) => {
      const order: string[] = ((window as any).order = []);
      el.addEventListener('click', () => order.push(`click:${(el as any).selected}`));
      el.addEventListener('change', (event) => order.push(`change:${(event as CustomEvent).detail.selected}`));
      // A page listener further up the path still hears click before change.
      document.addEventListener('click', () => order.push('document-click'));
    });
    await inner(page, id).click();
    await host(page, id).focus();
    await page.keyboard.press('Space');
    await host(page, id).evaluate((el) => (el as HTMLElement).click());
    expect(await page.evaluate(() => (window as any).order)).toEqual([
      'click:true', 'document-click', 'change:true',
      'click:false', 'document-click', 'change:false',
      'click:true', 'document-click', 'change:true',
    ]);
    // A listener that stops the click on its way still leaves the change to come, after it.
    await host(page, id).evaluate((el) => el.addEventListener('click', (event) => event.stopPropagation()));
    await inner(page, id).click();
    await expect.poll(() => page.evaluate(() => (window as any).order.slice(9))).toEqual(['click:false', 'change:false']);
  });

  test('CHP-11: WHILE kind is not filter the chip ignores selected and exposes no pressed state', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('action-selected', { kind: 'action', selected: true, label: 'Go' }), fixture('input-selected', { kind: 'input', selected: true, label: 'Ada', removeLabel: 'Remove Ada' })] });
    for (const id of ['action-selected', 'input-selected']) {
      await expect(inner(page, id), id).not.toHaveAttribute('aria-pressed');
      expect(await drawn(page, id), id).toEqual(await expected(page, 'outlined', ''));
      await expect(checkOf(page, id), id).toHaveCSS('opacity', '0');
      await listen(host(page, id));
      // On the label: a short input chip's middle can be inside its remove action's hit area (CHP-21).
      await labelOf(page, id).click();
      expect(await events(page), id).toMatchObject({ click: 1, change: 0 });
      expect(await host(page, id).ariaSnapshot(), id).not.toContain('pressed');
    }
  });

  test('CHP-12: a filter chip that is on paints its variant’s selected parts; otherwise the variant’s own', async ({ page }) => {
    for (const [id, variant, look] of [
      ['filter-unselected', 'outlined', ''],
      ['filter-selected', 'outlined', 'selected-'],
      ['filter-elevated-unselected', 'elevated', ''],
      ['filter-elevated-selected', 'elevated', 'selected-'],
    ] as const) {
      expect(await drawn(page, id), id).toEqual(await expected(page, variant, '', look));
    }
    // Off and on are told apart in the default system.
    expect((await expected(page, 'outlined', '', 'selected-')).bg).not.toBe((await expected(page, 'outlined', '')).bg);
    // A state of the selected look reads the selected look's state tokens.
    await inner(page, 'filter-selected').hover();
    await expect.poll(() => drawn(page, 'filter-selected')).toEqual(await expected(page, 'outlined', 'hovered-', 'selected-'));
    // Switching moves between the looks.
    await inner(page, 'filter-selected').click();
    await page.mouse.move(0, 0);
    await expect.poll(() => drawn(page, 'filter-selected')).toEqual(await expected(page, 'outlined', ''));
  });

  test('CHP-13: a filter chip that is on shows the icon set’s check glyph in the leading position — in place of its icon, no mark of its own — and its width changes with it over the selection motion', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('filter-icon', { kind: 'filter', label: 'Vegetarian' }, 'eco')] });
    await expect(checkOf(page, 'filter-unselected')).toHaveCSS('opacity', '0');
    await expect(checkOf(page, 'filter-selected')).toHaveCSS('opacity', '1');
    // The glyph `check` of the system's icon set, drawn by the icon font: no path, no image of the chip's own.
    expect(await checkOf(page, 'filter-selected').textContent()).toBe('check');
    expect(await host(page, 'filter-selected').evaluate((el) => el.shadowRoot!.querySelectorAll('svg, img, path').length)).toBe(0);
    expect(await family(checkOf(page, 'filter-selected'))).toBe(await familyToken(page, '--tanrei-sys-icon-family-selected'));
    // The check is in the leading position, before the label.
    expect((await bounds(checkOf(page, 'filter-selected'))).x).toBeLessThan((await textBox(labelOf(page, 'filter-selected'))).x);
    const [off, on] = [(await bounds(inner(page, 'filter-unselected'))).width, (await bounds(inner(page, 'filter-selected'))).width];
    const icon = await resolveToken(page, T('icon-size-medium'));
    const [pad, padIcon, gap] = await Promise.all(['padding-inline-medium', 'padding-inline-with-icon-medium', 'gap-medium'].map((n) => resolveToken(page, T(`container-${n}`))));
    expect(on - off).toBeCloseTo(padIcon + icon + gap - pad, 1);
    // With an icon, the check takes its place: the width does not change.
    const withIcon = (await bounds(inner(page, 'filter-icon'))).width;
    await inner(page, 'filter-icon').click();
    await expect(iconOf(page, 'filter-icon')).toHaveCSS('opacity', '0');
    await expect(checkOf(page, 'filter-icon')).toHaveCSS('opacity', '1');
    expect((await bounds(inner(page, 'filter-icon'))).width).toBe(withIcon);
    // The motion: the leading column, its fade and the colors of a condition change run on the selection motion.
    const duration = await resolveToken(page, T('motion-selection-duration'), 'duration');
    const easing = await resolveAs(page, 'transition-timing-function', T('motion-selection-easing'));
    const lead = host(page, 'filter-unselected').locator('.lead');
    expect(await style(lead, 'transition-property')).toBe('grid-template-columns, opacity');
    expect((await style(lead, 'transition-duration')).split(', ').map((d) => Number.parseFloat(d) * 1000)).toEqual([duration, duration]);
    expect(await style(lead, 'transition-timing-function')).toBe(`${easing}, ${easing}`);
    // The width is sampled on the leading column's own transition timeline — held at points through its duration — not
    // on the wall clock, so a slow machine cannot finish the motion between two samples.
    const seen = await host(page, 'filter-unselected').evaluate(async (el: any, ms) => {
      const button = el.shadowRoot!.querySelector('.container')!;
      const lead = el.shadowRoot!.querySelector('.lead')!;
      (button as HTMLElement).click();
      await el.updateComplete;
      // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
      const timing = (a: Animation) => [(a as CSSTransition).transitionProperty, Math.round(Number(a.effect!.getTiming().duration))] as [string, number];
      const running = button.getAnimations().map(timing);
      const moves = lead.getAnimations().filter((a: Animation) => a instanceof CSSTransition) as CSSTransition[];
      const widths: number[] = [];
      for (const f of [0.25, 0.5, 0.75]) {
        for (const a of moves) { a.pause(); a.currentTime = ms * f; }
        widths.push(button.getBoundingClientRect().width);
      }
      for (const a of moves) a.play();
      await Promise.all(moves.map((a) => a.finished));
      return { running, moves: moves.map(timing), widths, end: button.getBoundingClientRect().width };
    }, duration);
    expect(seen.moves).toContainEqual(['grid-template-columns', duration]);
    expect(seen.widths.some((width) => width > off + 1 && width < on - 1)).toBe(true);
    expect(seen.end).toBeCloseTo(on, 1);
    expect(seen.running).toContainEqual(['background-color', duration]);
    // Where motion is reduced it changes at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await inner(page, 'filter-unselected').click();
    expect((await bounds(inner(page, 'filter-unselected'))).width).toBe(off);
    await expect(checkOf(page, 'filter-unselected')).toHaveCSS('opacity', '0');
  });

  test('CHP-14: the icon, the check and the remove glyph are drawn at the size’s icon size, the check at its own mark weight; icon and check in the family and fill of the selection, the remove glyph always filled; each in the colors of its parts', async ({ page }) => {
    for (const [id, size] of [['action-outlined', 'medium'], ['action-small', 'small']] as const) {
      const side = await resolveToken(page, T(`icon-size-${size}`));
      const box = await bounds(iconOf(page, id));
      expect([box.width, box.height], id).toEqual([side, side]);
    }
    // The default system's steps: 24 at medium, 20 at small (sys.icon.medium / .small).
    expect(await resolveToken(page, T('icon-size-medium'))).toBe(await resolveToken(page, '--tanrei-sys-icon-medium'));
    expect(await resolveToken(page, T('icon-size-small'))).toBe(await resolveToken(page, '--tanrei-sys-icon-small'));
    const side = await resolveToken(page, T('icon-size-medium'));
    // (Firefox lays the absolutely placed remove action out in 1/60 px units.)
    expect((await bounds(checkOf(page, 'filter-selected'))).width).toBe(side);
    for (const [id, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
      const box = await bounds(host(page, id).locator('.remove .glyph'));
      const want = await resolveToken(page, T(`icon-size-${size}`));
      expect(box.width, id).toBeCloseTo(want, 3);
      expect(box.height, id).toBeCloseTo(want, 3);
    }
    const [offFill, onFill] = [Number(await token(page, '--tanrei-sys-icon-fill-unselected')), Number(await token(page, '--tanrei-sys-icon-fill-selected'))];
    const weight = Number(await token(page, '--tanrei-sys-icon-weight'));
    expect(await family(iconOf(page, 'action-outlined'))).toBe(await familyToken(page, '--tanrei-sys-icon-family-unselected'));
    // The optical size is the box's, clamped to sys.icon.optical-size (test/icons.ts).
    expect(await axes(iconOf(page, 'action-outlined'))).toEqual({ FILL: offFill, wght: weight, GRAD: 0, opsz: await opticalSize(page, side) });
    expect((await axes(iconOf(page, 'action-small'))).opsz).toBe(await opticalSize(page, await resolveToken(page, T('icon-size-small'))));
    // The check is a control's own mark (comp.chip.check.weight): in the default system the checkbox's mark weight,
    // heavier than sys.icon.weight, which the icon and the remove glyph keep.
    const checkWeight = Number(await token(page, T('check-weight')));
    expect(checkWeight).toBe(Number(await token(page, '--tanrei-comp-checkbox-mark-weight')));
    expect(checkWeight).toBeGreaterThan(weight);
    expect(await axes(checkOf(page, 'filter-selected'))).toEqual({ FILL: onFill, wght: checkWeight, GRAD: 0, opsz: await opticalSize(page, side) });
    expect(await family(checkOf(page, 'filter-selected'))).toBe(await familyToken(page, '--tanrei-sys-icon-family-selected'));
    // The remove glyph is always filled, in the selected family — on a chip that is never selected — with or without destructiveRemove.
    for (const id of ['input', 'input-plain-remove', 'input-small']) {
      const glyph = host(page, id).locator('.remove .glyph');
      const opsz = await opticalSize(page, await resolveToken(page, T(`icon-size-${id === 'input-small' ? 'small' : 'medium'}`)));
      expect(await axes(glyph), id).toEqual({ FILL: onFill, wght: weight, GRAD: 0, opsz });
      expect(await family(glyph), id).toBe(await familyToken(page, '--tanrei-sys-icon-family-selected'));
    }
    expect(onFill).not.toBe(offFill);
    expect(await style(iconOf(page, 'action-outlined'), 'font-optical-sizing')).toBe('auto');
    // Colors: the icon and the check take the look's icon color, the remove glyph that of the parts CHP-20 / CHP-27 name.
    expect(await style(checkOf(page, 'filter-selected'), 'color')).toBe(await resolveColor(page, T('outlined-selected-icon-color')));
    expect(await style(iconOf(page, 'action-elevated'), 'color')).toBe(await resolveColor(page, T('elevated-icon-color')));
    expect(await style(removeOf(page, 'input'), 'color')).toBe(await resolveColor(page, T('outlined-remove-icon-color')));
    expect(await style(removeOf(page, 'input-destructive-remove'), 'color')).toBe(await resolveColor(page, T('outlined-destructive-remove-icon-color')));
  });

  test('CHP-15: an input chip draws its avatar in the leading position at the size’s avatar size, clipped to avatar.shape, hidden from assistive technology', async ({ page }) => {
    const avatar = host(page, 'input-avatar').locator('.avatar');
    const side = await resolveToken(page, T('avatar-size-medium'));
    const box = await bounds(avatar);
    expect([box.width, box.height]).toEqual([side, side]);
    expect(Number.parseFloat(await style(avatar, 'border-top-left-radius'))).toBeGreaterThanOrEqual(side / 2);
    expect(await style(avatar, 'overflow')).toBe('hidden');
    expect(box.x).toBeLessThan((await textBox(labelOf(page, 'input-avatar'))).x);
    expect(box.x - (await bounds(inner(page, 'input-avatar'))).x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-avatar-medium')), 1);
    expect(await host(page, 'input-avatar').ariaSnapshot()).toBe('- button "Ada Lovelace"\n- button "Remove Ada Lovelace"');
  });

  test('CHP-15: a chip that is not an input chip ignores an avatar and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('action-avatar', { kind: 'action', label: 'Go' }, 'avatar'), fixture('plain', { kind: 'action', label: 'Go' })] });
    await expect(host(page, 'action-avatar').locator('.avatar')).toBeHidden();
    expect((await bounds(inner(page, 'action-avatar'))).width).toBe((await bounds(inner(page, 'plain'))).width);
    await expect.poll(() => seen.filter((w) => w.includes('CHP-15'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('CHP-15'))).toMatch(/an avatar is given to a action chip/);
  });

  test('CHP-16: the container is the size’s height with its corners and a hairline outline inside the edge; each end is padded by what it holds, the gap between', async ({ page }) => {
    for (const size of ['medium', 'small'] as const) {
      const id = size === 'medium' ? 'action-outlined' : 'action-small';
      const t = (name: string) => resolveToken(page, T(`container-${name}-${size}`));
      const [chip, icon, text] = [await bounds(inner(page, id)), await bounds(iconOf(page, id)), await textBox(labelOf(page, id))];
      expect(chip.height, id).toBe(await t('height'));
      expect(icon.x - chip.x, `${id}: glyph end`).toBeCloseTo(await t('padding-inline-with-icon'), 1);
      expect(text.x - (icon.x + icon.width), `${id}: gap`).toBeCloseTo(await t('gap'), 0);
      expect(chip.x + chip.width - (text.x + text.width), `${id}: label end`).toBeCloseTo(await t('padding-inline'), 0);
      expect(Number.parseFloat(await css(page, id, 'padding-top')), id).toBe(await t('padding-block'));
    }
    const [chip, text] = [await bounds(inner(page, 'action-no-icon')), await textBox(labelOf(page, 'action-no-icon'))];
    const pad = await resolveToken(page, T('container-padding-inline-medium'));
    expect(text.x - chip.x).toBeCloseTo(pad, 0);
    expect(chip.x + chip.width - (text.x + text.width)).toBeCloseTo(pad, 0);
    // The remove glyph holds the end: the remove end's own padding after it (not the padding of a bare icon), the gap before it.
    for (const [id, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
      const [input, label, glyph] = [await bounds(inner(page, id)), await textBox(labelOf(page, id)), await bounds(host(page, id).locator('.remove .glyph'))];
      const [withRemove, withIcon] = [await resolveToken(page, T(`container-padding-inline-with-remove-${size}`)), await resolveToken(page, T(`container-padding-inline-with-icon-${size}`))];
      expect(withRemove, `${id}: the default system pads the remove end by less than an icon's`).toBeLessThan(withIcon);
      expect(input.x + input.width - (glyph.x + glyph.width), id).toBeCloseTo(withRemove, 1);
      expect(glyph.x - (label.x + label.width), id).toBeCloseTo(await resolveToken(page, T(`container-gap-${size}`)), 0);
    }
    expect(Number.parseFloat(await css(page, 'action-outlined', 'border-top-left-radius'))).toBe(await resolveToken(page, T('container-shape')));
    expect(await css(page, 'action-outlined', 'box-shadow')).toContain(`${await resolveToken(page, T('outline-width'))}px inset`);
  });

  test('CHP-16: a pill at any height — the corner is capped at half the height, marked pill; the block padding is around the row’s tallest item, a glyph’s box included; the remove action’s round container takes no part in the layout', async ({ page }) => {
    // The default system's corner is sys.shape.corner.full, drawn as round caps (the emitter's pill mark).
    expect(await token(page, T('container-shape-pill'))).toBe('1');
    const pill = async (id: string) => {
      const box = await bounds(inner(page, id));
      const radius = Number.parseFloat(await css(page, id, 'border-top-left-radius'));
      return { height: box.height, radius, pill: await css(page, id, '--tanrei-corner-pill') };
    };
    for (const id of ['action-outlined', 'action-small', 'input']) {
      const p = await pill(id);
      expect(p.radius, id).toBeGreaterThanOrEqual(p.height / 2);
      expect(p.pill.trim(), id).toBe('1');
    }
    // The tallest item is the glyph's box: the icon plus the block padding above and below is the whole height, at each size.
    for (const [id, size] of [['action-outlined', 'medium'], ['action-small', 'small'], ['input', 'medium'], ['input-small', 'small']] as const) {
      const [height, icon, padBlock] = await Promise.all([T(`container-height-${size}`), T(`icon-size-${size}`), T(`container-padding-block-${size}`)].map((n) => resolveToken(page, n)));
      expect(icon + 2 * padBlock, `${id}: glyph + padding-block`).toBe(height);
      expect((await bounds(inner(page, id))).height, id).toBe(height);
      // The trailing room holds the remove glyph's box, so an input chip without an icon counts it too.
      if (id.startsWith('input')) expect((await bounds(host(page, id).locator('.trail'))).height, id).toBe(icon);
    }
    // The remove action's round container is larger than the glyph and outside the layout: the chip's width is its
    // label, the gap and the glyph's box between the two ends' paddings — the container adds nothing.
    for (const [id, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
      const [pad, padRemove, gap, icon, remove, height] = await Promise.all(
        ['container-padding-inline', 'container-padding-inline-with-remove', 'container-gap', 'icon-size', 'remove-container-size', 'container-height'].map((n) => resolveToken(page, T(`${n}-${size}`))),
      );
      expect(remove, id).toBe(icon + 4);
      expect(remove, id).toBeLessThanOrEqual(height);
      const [chip, label, box] = [await bounds(inner(page, id)), await textBox(labelOf(page, id)), await bounds(removeOf(page, id))];
      expect(chip.width, id).toBeCloseTo(pad + label.width + gap + icon + padRemove, 0);
      expect(box.width, id).toBeCloseTo(remove, 3);
      // Inside the chip's bounds, at its end too (CHP-32 says how far in).
      expect(box.y, id).toBeGreaterThanOrEqual(chip.y - 0.01);
      expect(box.y + box.height, id).toBeLessThanOrEqual(chip.y + chip.height + 0.01);
      expect(box.x + box.width, id).toBeLessThanOrEqual(chip.x + chip.width + 0.01);
    }
    // An avatar at the start is concentric with the pill's round end: (height − avatar) / 2 from the edge, at each size.
    for (const size of ['small', 'medium'] as const) {
      const [height, avatar, padAvatar] = await Promise.all([T(`container-height-${size}`), T(`avatar-size-${size}`), T(`container-padding-inline-with-avatar-${size}`)].map((n) => resolveToken(page, n)));
      expect(padAvatar, size).toBe((height - avatar) / 2);
    }
    // With enlarged text the chip grows taller and stays a pill.
    const before = await pill('input');
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await pill('input');
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.radius).toBeGreaterThanOrEqual(after.height / 2);
  });

  test('CHP-17: the label is set on one line in the size’s text role, truncated with an ellipsis only when the layout gives less width; the full label is the name; it grows with larger text', async ({ page }) => {
    for (const [id, size] of [['action-outlined', 'medium'], ['action-small', 'small']] as const) {
      const label = labelOf(page, id);
      expect(Number.parseFloat(await style(label, 'font-size')), id).toBe(await resolveToken(page, T(`label-typescale-${size}-font-size`)));
      expect(await style(label, 'font-weight'), id).toBe(await resolveAs(page, 'font-weight', T(`label-typescale-${size}-font-weight`)));
      expect(await family(label), id).toBe(await familyToken(page, T(`label-typescale-${size}-font-family`)));
      expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth), id).toBe(true);
    }
    expect(await style(labelOf(page, 'action-outlined'), 'color')).toBe(await resolveColor(page, T('outlined-label-color')));
    const before = await bounds(inner(page, 'action-outlined'));
    await page.locator('[data-fixture="action-outlined"]').evaluate((el) => (el.style.inlineSize = '120px'));
    const narrow = await bounds(inner(page, 'action-outlined'));
    expect(narrow.width).toBeLessThan(before.width);
    expect(narrow.height).toBe(before.height); // still one line
    expect(await style(labelOf(page, 'action-outlined'), 'text-overflow')).toBe('ellipsis');
    expect(await labelOf(page, 'action-outlined').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(host(page, 'action-outlined').getByRole('button', { name: 'Add to calendar', exact: true })).toHaveCount(1);
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect((await bounds(inner(page, 'action-no-icon'))).height).toBeGreaterThan(before.height);
  });

  test('CHP-18: an input chip’s remove action is the icon set’s cancel glyph centred on a larger round container at its inline end, a separate button named by removeLabel that is not a Tab stop; pressed by pointer, Enter or Space it emits remove once and never click', async ({ page }) => {
    const id = 'input';
    const remove = removeOf(page, id);
    for (const [target, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
      const side = await resolveToken(page, T(`remove-container-size-${size}`));
      const box = await bounds(removeOf(page, target));
      expect(box.width, target).toBeCloseTo(side, 3);
      expect(box.height, target).toBeCloseTo(side, 3);
      expect(Number.parseFloat(await style(removeOf(page, target), 'border-top-left-radius')), target).toBeGreaterThanOrEqual(side / 2);
      const glyph = await bounds(removeOf(page, target).locator('.glyph'));
      // Centred on the round container, which is larger than the glyph's box on both axes.
      expect(glyph.x + glyph.width / 2, target).toBeCloseTo(box.x + box.width / 2, 1);
      expect(glyph.y + glyph.height / 2, target).toBeCloseTo(box.y + box.height / 2, 1);
      expect(box.width, target).toBeGreaterThan(glyph.width);
      // The glyph `cancel` of the system's icon set, drawn by the icon font: no path, no image of the chip's own.
      expect(await removeOf(page, target).locator('.glyph').textContent(), target).toBe('cancel');
      expect(await removeOf(page, target).evaluate((el) => el.querySelectorAll('svg, img, path').length), target).toBe(0);
    }
    await expect(host(page, id).getByRole('button', { name: 'Remove Ada Lovelace' })).toHaveCount(1);
    // Out of the Tab order: Tab from the chip goes on to the next chip, past the remove action.
    await expect(remove).toHaveAttribute('tabindex', '-1');
    await tabTo(page, inner(page, id));
    await tab(page);
    await expect(remove).not.toBeFocused();
    await expect(inner(page, 'input-avatar')).toBeFocused();
    // Still focusable by script — what assistive technology and an owner's keys do — and then Enter and Space press it.
    await remove.focus();
    await expect(remove).toBeFocused();
    await listen(host(page, id));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await remove.click();
    expect(await events(page)).toMatchObject({ click: 0, remove: 3 });
    // Other kinds have no remove action at all.
    await expect(removeOf(page, 'action-outlined')).toBeHidden();
    await expect(host(page, 'filter-selected').getByRole('button')).toHaveCount(1);
  });

  test('CHP-19: Backspace or Delete on a focused input chip emits remove exactly once, and once for a key held down; the chip tells assistive technology of the two keys with aria-keyshortcuts while it removes; on other kinds nothing', async ({ page }) => {
    await expect(inner(page, 'input')).toHaveAttribute('aria-keyshortcuts', 'Delete Backspace');
    await expect(removeOf(page, 'input')).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    for (const id of ['action-outlined', 'filter-selected', 'action-link']) await expect(inner(page, id), id).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    await listen(host(page, 'input'));
    await host(page, 'input').focus();
    await expect(inner(page, 'input')).toBeFocused();
    await page.keyboard.press('Backspace');
    expect((await events(page)).remove).toBe(1);
    await page.keyboard.press('Delete');
    expect(await events(page)).toMatchObject({ remove: 2, click: 0 });
    // A held key asks once: its repeats are not answered.
    await page.keyboard.down('Delete');
    for (let repeat = 0; repeat < 4; repeat++) await page.keyboard.down('Delete');
    await page.keyboard.up('Delete');
    expect(await events(page)).toMatchObject({ remove: 3, click: 0 });
    // Not removable, it offers no key (CHP-38), and has it back when removable again.
    await host(page, 'input').evaluate((el) => Object.assign(el, { removable: false }));
    await expect(inner(page, 'input')).not.toHaveAttribute('aria-keyshortcuts', /.*/);
    await host(page, 'input').evaluate((el) => Object.assign(el, { removable: true }));
    await expect(inner(page, 'input')).toHaveAttribute('aria-keyshortcuts', 'Delete Backspace');
    await listen(host(page, 'action-outlined'));
    await host(page, 'action-outlined').focus();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    expect(await events(page)).toMatchObject({ remove: 0, click: 0 });
  });

  for (const [id, parts] of [['input-plain-remove', 'remove'], ['input-destructive-remove', 'destructive-remove']] as const) {
    test(`CHP-20: the remove action’s hover, focus and press paint its own ${parts} parts; the chip stays at its own state; the ring goes around the remove action (${id})`, async ({ page }) => {
      const remove = removeOf(page, id);
      // Read once the remove action's running transitions have ended on their own timeline: after focus leaves it, its
      // paint goes back to rest over the state duration, which a poll on the chip's own hover does not wait for.
      const paint = () => remove.evaluate(async (el) => { await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))); const s = getComputedStyle(el); return [s.backgroundColor, s.color]; });
      const want = async (state: string) => [await resolveColor(page, T(`outlined-${state}${parts}-container-color`)), await resolveColor(page, T(`outlined-${state}${parts}-icon-color`))];
      await host(page, id).scrollIntoViewIfNeeded();
      expect(await paint()).toEqual(await want(''));
      // The chip's own paint is read once it has settled: a state it left goes back to rest over the state duration.
      const chipAtRest = await expected(page, 'outlined', '');
      await remove.hover();
      await expect.poll(paint).toEqual(await want('hovered-'));
      await expect.poll(() => drawn(page, id)).toEqual(chipAtRest);
      await page.mouse.down();
      await expect.poll(paint).toEqual(await want('pressed-'));
      expect(await pressed(remove)).toBe('overlay');
      expect(await pressed(inner(page, id))).toBeNull();
      await expect.poll(() => drawn(page, id)).toEqual(chipAtRest);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await keyFocusRemove(page, id);
      await expect.poll(paint).toEqual(await want('focused-'));
      await expect(remove).toHaveCSS('outline-style', 'solid');
      await expect(inner(page, id)).toHaveCSS('outline-style', 'none');
      await expect.poll(() => drawn(page, id)).toEqual(chipAtRest);
      // And the other way round: hovering the chip leaves the remove action at rest.
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await labelOf(page, id).hover();
      await expect.poll(() => drawn(page, id)).toEqual(await expected(page, 'outlined', 'hovered-'));
      expect(await paint()).toEqual(await want(''));
    });
  }

  test('CHP-20: under ripple (m3-like) a press of the remove action grows within its round container — from the center for a press outside it — and the chip’s container stays', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    const id = 'input-destructive-remove';
    const remove = removeOf(page, id);
    await host(page, id).scrollIntoViewIfNeeded();
    const box = await bounds(remove);
    const chipBefore = await drawn(page, id);
    const [mx, my] = [Math.round(box.x + box.width / 2 + 2), Math.round(box.y + box.height / 2 + 1)]; // a pointer lands on whole pixels
    await page.mouse.move(mx, my);
    await page.mouse.down();
    const ripple = remove.locator('.ripple');
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => { const s = getComputedStyle(el); const own = el.getBoundingClientRect(); return { color: s.backgroundColor, width: own.width, radius: Number.parseFloat(s.borderTopLeftRadius), x: Number.parseFloat(el.style.getPropertyValue('--_x')) }; });
    expect(layer.color).toBe(await resolveColor(page, T('outlined-pressed-destructive-remove-container-color')));
    expect(layer.width).toBeCloseTo(box.width, 3);
    expect(layer.radius).toBeGreaterThanOrEqual(box.width / 2);
    expect(layer.x).toBeCloseTo(mx - box.x, 0);
    expect(await inner(page, id).locator('.ripple').count()).toBe(0);
    expect((await drawn(page, id)).bg).toBe(chipBefore.bg);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
    // A press in the hit area outside the round container grows from its center.
    await page.mouse.move(box.x + box.width + 6, box.y + box.height / 2);
    await page.mouse.down();
    expect(Number.parseFloat(await remove.locator('.ripple').evaluate((el) => el.style.getPropertyValue('--_x')))).toBeCloseTo(box.width / 2, 1);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  // The fixtures CHP-32's verify names, and the size each is.
  const REMOVE_FIXTURES = [['input', 'medium'], ['input-avatar', 'medium'], ['input-disabled', 'medium'], ['input-destructive-remove', 'medium'], ['input-plain-remove', 'medium'], ['input-small', 'small']] as const;
  for (const dir of ['ltr', 'rtl'] as const) {
    test(`CHP-32 (${dir}): the remove action’s round container is centered on its glyph on the chip’s midline, as far from the chip’s inline end as from its top and its bottom — its center the center of the chip’s round end; its states and its focus ring are drawn there`, async ({ page }) => {
      await mountFixtures(page, spec, { dir });
      const half = 0.5 / (await page.evaluate(() => devicePixelRatio));
      for (const [id, size] of REMOVE_FIXTURES) {
        const [height, side, icon, pad] = [
          await resolveToken(page, T(`container-height-${size}`)),
          await resolveToken(page, T(`remove-container-size-${size}`)),
          await resolveToken(page, T(`icon-size-${size}`)),
          await resolveToken(page, T(`container-padding-inline-with-remove-${size}`)),
        ];
        const remove = removeOf(page, id);
        // Hovered, so that the round container shows (a disabled one answers nothing: it is measured where it lies).
        await host(page, id).scrollIntoViewIfNeeded();
        await remove.hover({ force: true });
        const [chip, box, glyph] = [await bounds(inner(page, id)), await bounds(remove), await bounds(remove.locator('.glyph'))];
        expect(chip.height, id).toBe(height);
        const top = box.y - chip.y;
        const bottom = chip.y + chip.height - (box.y + box.height);
        const end = dir === 'ltr' ? chip.x + chip.width - (box.x + box.width) : box.x - chip.x;
        // The spec's sentence: the padding less half of what the container exceeds the glyph by, never less than nothing.
        expect(end, `${id}: from the inline end`).toBeCloseTo(Math.max(0, pad - (side - icon) / 2), 3);
        // The three distances, equal within half a device pixel: 2, 2 and 2 at medium; 0, 0 and 0 at small.
        expect(Math.abs(top - bottom), `${id}: top ${top}, bottom ${bottom}`).toBeLessThanOrEqual(half);
        expect(Math.abs(end - top), `${id}: end ${end}, top ${top}`).toBeLessThanOrEqual(half);
        expect(Math.abs(end - bottom), `${id}: end ${end}, bottom ${bottom}`).toBeLessThanOrEqual(half);
        expect(top, id).toBeCloseTo((height - side) / 2, 3);
        // Centered on the glyph, and its center is the center of the chip's round end: half the height from the end, on the midline.
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        expect(center.x, id).toBeCloseTo(glyph.x + glyph.width / 2, 3);
        expect(center.y, id).toBeCloseTo(glyph.y + glyph.height / 2, 3);
        expect(center.y, id).toBeCloseTo(chip.y + chip.height / 2, 3);
        expect(dir === 'ltr' ? chip.x + chip.width - center.x : center.x - chip.x, `${id}: the end cap's center`).toBeCloseTo(height / 2, 3);
        // The chip's end is that half circle, and the remove container a circle inside it: concentric.
        expect(Number.parseFloat(await css(page, id, dir === 'ltr' ? 'border-top-right-radius' : 'border-top-left-radius')), id).toBeGreaterThanOrEqual(height / 2);
        expect(Number.parseFloat(await style(remove, 'border-top-left-radius')), id).toBeGreaterThanOrEqual(side / 2);
        await page.mouse.move(0, 0);
      }
      // Its states and its focus ring are drawn in that same place: the element that paints them is that box.
      const place = async (id: string) => {
        const [chip, box] = [await bounds(inner(page, id)), await bounds(removeOf(page, id))];
        return [box.x - chip.x, box.y - chip.y, box.width, box.height];
      };
      for (const id of ['input', 'input-small']) {
        const before = await place(id);
        await removeOf(page, id).hover();
        await expect.poll(() => style(removeOf(page, id), 'background-color'), id).not.toBe('rgba(0, 0, 0, 0)');
        expect(await place(id), `${id} hovered`).toEqual(before);
        await page.mouse.move(0, 0);
        await keyFocusRemove(page, id);
        await expect(removeOf(page, id)).toBeFocused();
        expect(await style(removeOf(page, id), 'outline-style'), id).toBe('solid');
        expect(await place(id), `${id} focused`).toEqual(before);
      }
    });
  }

  test('CHP-32: m3-like and cupertino pin the remove end’s padding to the padding they had, so their remove glyph is where it was; a padding smaller than the overhang leaves the round container at the chip’s end, never past it', async ({ page }) => {
    for (const system of ['m3-like', 'cupertino']) {
      await mountFixtures(page, spec, { system });
      for (const [id, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
        const [withRemove, withIcon] = [await resolveToken(page, T(`container-padding-inline-with-remove-${size}`)), await resolveToken(page, T(`container-padding-inline-with-icon-${size}`))];
        expect(withRemove, `${system} ${size}`).toBe(withIcon);
        const [chip, glyph] = [await bounds(inner(page, id)), await bounds(removeOf(page, id).locator('.glyph'))];
        expect(chip.x + chip.width - (glyph.x + glyph.width), `${system} ${id}`).toBeCloseTo(withIcon, 1);
      }
    }
    await mountFixtures(page, spec);
    await override(page, { [T('container-padding-inline-with-remove-medium')]: '0px' });
    const [chip, box] = [await bounds(inner(page, 'input')), await bounds(removeOf(page, 'input'))];
    expect(chip.x + chip.width - (box.x + box.width)).toBeCloseTo(0, 3);
  });

  test('CHP-21: the remove hit area is at least the minimum target on both axes around its glyph, reaches toward the label no further than the gap, extends outward past the chip, and never covers the label; the rest of the chip activates the chip', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const [id, size] of [['input', 'medium'], ['input-small', 'small']] as const) {
      const remove = removeOf(page, id);
      await host(page, id).scrollIntoViewIfNeeded(); // the mouse only reaches what is in the viewport
      const hit = await remove.evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el, '::before'); const w = Number.parseFloat(s.width); const h = Number.parseFloat(s.height); const start = Number.parseFloat(s.insetInlineStart); return { left: r.left + start, width: w, height: h, top: r.top + r.height / 2 - h / 2 }; });
      const [chip, glyph, label] = [await bounds(inner(page, id)), await bounds(remove.locator('.glyph')), await textBox(labelOf(page, id))];
      const gap = await resolveToken(page, T(`container-gap-${size}`));
      expect(Math.min(hit.width, hit.height), id).toBeGreaterThanOrEqual(pointer);
      // Around the glyph: it contains it on both axes.
      expect(hit.left, id).toBeLessThanOrEqual(glyph.x);
      expect(hit.left + hit.width, id).toBeGreaterThanOrEqual(glyph.x + glyph.width);
      // Toward the label: no further than the gap before the glyph — never over the label.
      expect(hit.left, id).toBeCloseTo(glyph.x - gap, 1);
      expect(hit.left, id).toBeGreaterThanOrEqual(label.x + label.width - 0.5);
      // Outward: past the chip's edge, as far as it needs.
      expect(hit.left + hit.width, id).toBeGreaterThan(chip.x + chip.width);
      // Pointer checks: just past the chip's end removes; on the label's last letters it is the chip.
      await listen(host(page, id));
      await page.mouse.click(chip.x + chip.width + 2, glyph.y + glyph.height / 2);
      await page.mouse.click(glyph.x - gap / 2, glyph.y + glyph.height / 2);
      expect(await events(page), id).toMatchObject({ remove: 2, click: 0 });
      await page.mouse.click(label.x + label.width - 1, label.y + label.height / 2);
      await page.mouse.click(chip.x + 2, chip.y + 2);
      expect(await events(page), id).toMatchObject({ remove: 2, click: 2 });
    }
  });

  test('CHP-22: emitting remove neither removes the chip nor moves focus — the owner does', async ({ page }) => {
    await host(page, 'input').focus();
    await page.keyboard.press('Backspace');
    await expect(host(page, 'input')).toHaveCount(1);
    await expect(inner(page, 'input')).toBeFocused();
    await removeOf(page, 'input').focus();
    await page.keyboard.press('Enter');
    await expect(host(page, 'input')).toHaveCount(1);
    await expect(removeOf(page, 'input')).toBeFocused();
    // The owner's way: remove the element and move focus to a neighbour.
    await host(page, 'input').evaluate((el) => el.addEventListener('remove', () => { const next = document.querySelector('[data-fixture="input-avatar"] tanrei-chip') as HTMLElement; el.remove(); next.focus(); }));
    await page.keyboard.press('Enter');
    await expect(host(page, 'input')).toHaveCount(0);
    await expect(inner(page, 'input-avatar')).toBeFocused();
  });

  test('CHP-23: one tab stop per chip, an input chip one too — its remove action is passed; arrow keys do nothing', async ({ page }) => {
    await tabTo(page, inner(page, 'filter-selected-small'));
    await tab(page);
    await expect(inner(page, 'input')).toBeFocused();
    await tab(page);
    await expect(removeOf(page, 'input')).not.toBeFocused();
    await expect(inner(page, 'input-avatar')).toBeFocused();
    await tab(page, { back: true });
    await expect(inner(page, 'input')).toBeFocused();
    await tab(page);
    await expect(inner(page, 'input-avatar')).toBeFocused();
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
      await page.keyboard.press(key);
      await expect(inner(page, 'input-avatar'), key).toBeFocused();
    }
  });

  // Safari on macOS gives a pressed button no focus and hands the press to the first part a click focuses, which the
  // remove action (tabindex="-1") would be; the other engines focus the pressed button. The second run simulates the
  // Mac's rule (test/click-focus.ts), so that the defect fails this test in every engine, on Linux too.
  for (const mac of [false, true]) {
    test(`CHP-39: a press on an input chip anywhere but its remove action never gives the remove action focus — focus is where the same press puts it on an action chip, Enter on the chip then emits click, and the Tab order is unchanged${mac ? ' (the click focus of Safari on macOS, simulated)' : ''}`, async ({ page }) => {
      if (mac) await simulateMacClickFocus(page);
      // The page's timers held: what puts the remove action's tabindex back must not be a timer that a busy engine runs
      // after the next key (input runs first).
      await holdClock(page);
      const away = () => page.locator('body').click({ position: { x: 1, y: 1 } });
      const removeHoldsFocus = (id: string) => host(page, id).evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('remove') ?? false);
      const buttonHoldsFocus = (id: string) => host(page, id).evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('container') ?? false);
      // Where this engine puts the focus of a press on a chip: its button, or — where a pressed button takes none — nowhere.
      await away();
      await labelOf(page, 'action-outlined').click();
      const pressFocuses = await buttonHoldsFocus('action-outlined');
      const presses = [
        ['input', 'the label', () => labelOf(page, 'input').click()],
        ['input-avatar', 'the avatar', () => host(page, 'input-avatar').locator('.avatar').click()],
        ['input', 'the inline-start padding', async () => inner(page, 'input').click({ position: { x: 3, y: (await bounds(inner(page, 'input'))).height / 2 } })],
      ] as const;
      for (const [id, where, press] of presses) {
        await away();
        await listen(host(page, id));
        await press();
        expect(await removeHoldsFocus(id), `${where}: the remove action`).toBe(false);
        expect(await buttonHoldsFocus(id), `${where}: the chip's button, as an action chip's`).toBe(pressFocuses);
        await host(page, id).focus();
        await page.keyboard.press('Enter');
        expect(await events(page), `${where}: the press, then Enter`).toMatchObject({ click: 2, remove: 0 });
        await tab(page);
        expect(await removeHoldsFocus(id), `${where}: Tab after the press passes the remove action`).toBe(false);
      }
      // The remove action still takes focus from a press of its own, and from focus() — as assistive technology moves it.
      await away();
      await removeOf(page, 'input').click();
      expect(await removeHoldsFocus('input'), 'a press on the remove action').toBe(true);
      await away();
      await removeOf(page, 'input').focus();
      expect(await removeHoldsFocus('input'), 'focus() on the remove action').toBe(true);
      // With no key and no press after it, the tabindex is back once the press's task has passed.
      await away();
      await labelOf(page, 'input').click();
      await releaseClock(page);
      await expect(removeOf(page, 'input')).toHaveAttribute('tabindex', '-1');
    });
  }

  test('CHP-24: colors and elevation change over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    const id = 'action-elevated';
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const easing = await resolveAs(page, 'transition-timing-function', T('motion-state-easing'));
    expect(await css(page, id, 'transition-property')).toBe('background-color, color, box-shadow, opacity');
    expect((await css(page, id, 'transition-duration')).split(', ').map((d) => Number.parseFloat(d) * 1000)).toEqual([duration, duration, duration, duration]);
    expect(new Set((await css(page, id, 'transition-timing-function')).split(/,\s(?![^(]*\))/))).toEqual(new Set([easing]));
    // Kept as the engine announces them, not asked for after the hover: on a slow runner the answer to a later question
    // can arrive when a transition of this length is over.
    await watchTransitions(inner(page, id));
    await inner(page, id).hover();
    await expect.poll(() => transitionsRun(inner(page, id))).toContainEqual({ property: 'box-shadow', pseudo: '', own: true, on: expect.any(String), duration, easing });
    expect(Number.parseFloat(await style(removeOf(page, 'input'), 'transition-duration')) * 1000).toBe(duration);
    await page.mouse.move(0, 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(page, id, 'transition-duration')).toBe('0s');
    await inner(page, id).hover();
    expect(await drawn(page, id)).toEqual(await expected(page, 'elevated', 'hovered-'));
  });

  test('CHP-25: in RTL the content mirrors — the remove action at the left — with logical paddings, and a ripple grows from the point of contact', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await host(page, 'input').scrollIntoViewIfNeeded();
    const [chip, label, glyph] = [await bounds(inner(page, 'input')), await textBox(labelOf(page, 'input')), await bounds(removeOf(page, 'input').locator('.glyph'))];
    expect(glyph.x).toBeLessThan(label.x);
    expect(glyph.x - chip.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    await host(page, 'action-outlined').scrollIntoViewIfNeeded();
    const [action, icon, text] = [await bounds(inner(page, 'action-outlined')), await bounds(iconOf(page, 'action-outlined')), await textBox(labelOf(page, 'action-outlined'))];
    expect(icon.x).toBeGreaterThan(text.x);
    expect(action.x + action.width - (icon.x + icon.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    expect(text.x - action.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-medium')), 0);
    const [mx, my] = [Math.round(action.x + 20), Math.round(action.y + 10)];
    await page.mouse.move(mx, my);
    await page.mouse.down();
    const at = await inner(page, 'action-outlined').locator('.ripple').evaluate((el) => { const own = el.getBoundingClientRect(); const c = el.parentElement!.getBoundingClientRect(); return [Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - c.left, Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - c.top]; });
    expect(at[0]).toBeCloseTo(mx - action.x, 0);
    expect(at[1]).toBeCloseTo(my - action.y, 0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHP-26: a chip without a label, or an input chip without a removeLabel, still renders, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('nameless', { kind: 'action' }), fixture('unnamed-remove', { kind: 'input', label: 'Ada' })] });
    expect((await bounds(inner(page, 'nameless'))).height).toBe(await resolveToken(page, T('container-height-medium')));
    await expect(removeOf(page, 'unnamed-remove')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('CHP-26'))).toHaveLength(2);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/label is empty/), expect.stringMatching(/removeLabel is empty/)]));
    await host(page, 'unnamed-remove').evaluate((el) => ((el as any).removeLabel = 'Remove Ada'));
    await expect(host(page, 'unnamed-remove').getByRole('button', { name: 'Remove Ada' })).toHaveCount(1);
    expect(seen.filter((w) => w.includes('CHP-26'))).toHaveLength(2);
  });

  test('CHP-7: a kind this spec does not have renders and behaves as an action chip, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('kind-unknown', { kind: 'toggle', label: 'Go', removeLabel: 'Remove Go' }, 'event'), fixture('plain', { kind: 'action', label: 'Go' }, 'event')] });
    expect(await bounds(inner(page, 'kind-unknown'))).toMatchObject({ width: (await bounds(inner(page, 'plain'))).width, height: (await bounds(inner(page, 'plain'))).height });
    expect(await drawn(page, 'kind-unknown')).toEqual(await drawn(page, 'plain'));
    expect(await host(page, 'kind-unknown').ariaSnapshot()).toBe(await host(page, 'plain').ariaSnapshot());
    await expect(removeOf(page, 'kind-unknown')).toBeHidden();
    await expect(inner(page, 'kind-unknown')).not.toHaveAttribute('aria-pressed');
    await listen(host(page, 'kind-unknown'));
    await inner(page, 'kind-unknown').click();
    await host(page, 'kind-unknown').focus();
    await page.keyboard.press('Backspace');
    expect(await events(page)).toMatchObject({ click: 1, change: 0, remove: 0 });
    await expect.poll(() => seen.filter((w) => w.includes('CHP-7'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('CHP-7'))).toMatch(/kind "toggle" is not a kind of chip; it is drawn and behaves as "action"/);
  });

  test('CHP-27: destructiveRemove is a property that defaults to false, reflected as the destructive-remove attribute', async ({ page }) => {
    const [on, off] = [host(page, 'input-destructive-remove'), host(page, 'input-plain-remove')];
    expect(await host(page, 'input').evaluate((el) => (el as any).destructiveRemove)).toBe(false);
    await expect(host(page, 'input')).not.toHaveAttribute('destructive-remove');
    expect(await on.evaluate((el) => (el as any).destructiveRemove)).toBe(true);
    await expect(on).toHaveAttribute('destructive-remove', '');
    expect(await off.evaluate((el) => (el as any).destructiveRemove)).toBe(false);
    await expect(off).not.toHaveAttribute('destructive-remove');
    // The attribute that turned it off while it defaulted to true is gone: it is an unknown attribute now.
    await off.evaluate((el) => el.setAttribute('no-destructive-remove', ''));
    expect(await off.evaluate((el) => (el as any).destructiveRemove)).toBe(false);
    await off.evaluate((el) => ((el as any).destructiveRemove = true));
    await expect(off).toHaveAttribute('destructive-remove', '');
    await off.evaluate((el) => el.removeAttribute('destructive-remove'));
    expect(await off.evaluate((el) => (el as any).destructiveRemove)).toBe(false);
  });

  test('CHP-27: under acme, with destructiveRemove true and false the remove action renders alike at rest and disabled, and differs hovered, focused and pressed — each from its own parts', async ({ page }) => {
    const input = { kind: 'input', label: 'Ada Lovelace', removeLabel: 'Remove Ada Lovelace' } as const;
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: [...spec.fixtures, fixture('input-destructive-disabled', { ...input, destructiveRemove: true, disabled: true })] });
    const paint = (id: string) => removeOf(page, id).evaluate(async (el) => { await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined))); const s = getComputedStyle(el); return [s.backgroundColor, s.color]; });
    const want = async (parts: string, state: string) => [await resolveColor(page, T(`outlined-${state}${parts}-container-color`)), await resolveColor(page, T(`outlined-${state}${parts}-icon-color`))];
    // At rest and while disabled the two look alike.
    expect(await paint('input-destructive-remove')).toEqual(await paint('input-plain-remove'));
    expect(await paint('input-destructive-remove')).toEqual(await want('destructive-remove', ''));
    expect(await paint('input-disabled')).toEqual(await paint('input-destructive-disabled'));
    expect(await paint('input-destructive-disabled')).toEqual(await want('destructive-remove', 'disabled-'));
    const seen: Record<string, Record<string, string[]>> = {};
    for (const [id, parts] of [['input-destructive-remove', 'destructive-remove'], ['input-plain-remove', 'remove']] as const) {
      const remove = removeOf(page, id);
      await host(page, id).scrollIntoViewIfNeeded();
      seen[id] = {};
      await remove.hover();
      await expect.poll(() => paint(id), `${id} hovered`).toEqual(await want(parts, 'hovered-'));
      seen[id].hovered = await paint(id);
      await page.mouse.down();
      await expect.poll(() => paint(id), `${id} pressed`).toEqual(await want(parts, 'pressed-'));
      seen[id].pressed = await paint(id);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await keyFocusRemove(page, id);
      await expect.poll(() => paint(id), `${id} focused`).toEqual(await want(parts, 'focused-'));
      seen[id].focused = await paint(id);
      await page.locator('body').click({ position: { x: 1, y: 1 } });
    }
    for (const state of ['hovered', 'focused', 'pressed']) {
      const [destructive, plain] = [seen['input-destructive-remove'][state], seen['input-plain-remove'][state]];
      expect(destructive[0], `${state}: round container`).not.toBe(plain[0]);
      expect(destructive[1], `${state}: glyph`).not.toBe(plain[1]);
    }
    // acme's three strengths tell the destructive states apart too.
    expect(new Set(['hovered', 'focused', 'pressed'].map((s) => seen['input-destructive-remove'][s][0])).size).toBe(3);
  });

  test('CHP-27: in the default system the hovered, focused and pressed destructive glyph is the error role and its round container mixes error; the plain one does not', async ({ page }) => {
    const error = await resolveColor(page, '--tanrei-sys-color-error');
    expect(await resolveColor(page, T('outlined-destructive-remove-state-layer-color'))).toBe(error);
    expect(await resolveColor(page, T('elevated-destructive-remove-state-layer-color'))).toBe(error);
    for (const variant of ['outlined', 'elevated']) {
      // At rest the destructive glyph is the plain one's color.
      expect(await resolveColor(page, T(`${variant}-destructive-remove-icon-color`)), variant).toBe(await resolveColor(page, T(`${variant}-remove-icon-color`)));
      for (const state of ['hovered-', 'focused-', 'pressed-']) {
        expect(await resolveColor(page, T(`${variant}-${state}destructive-remove-icon-color`)), `${variant} ${state}`).toBe(error);
        expect(await resolveColor(page, T(`${variant}-${state}remove-icon-color`)), `${variant} ${state}`).not.toBe(error);
        expect(await resolveColor(page, T(`${variant}-${state}destructive-remove-container-color`)), `${variant} ${state}`).not.toBe(await resolveColor(page, T(`${variant}-${state}remove-container-color`)));
      }
    }
    // Scrolled into view first, so that the pointer stays on the remove action it was moved to.
    await host(page, 'input-destructive-remove').scrollIntoViewIfNeeded();
    await removeOf(page, 'input-destructive-remove').hover();
    await expect.poll(() => style(removeOf(page, 'input-destructive-remove'), 'color')).toBe(error);
    // By default the remove action is plain: hovered, focused and pressed, its glyph and its round container never take
    // the error color.
    const plain = async (state: string) => [await resolveColor(page, T(`outlined-${state}remove-container-color`)), await resolveColor(page, T(`outlined-${state}remove-icon-color`))];
    const paint = async () => { await motionEnded(removeOf(page, 'input')); return removeOf(page, 'input').evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color]; }); };
    await host(page, 'input').scrollIntoViewIfNeeded();
    await removeOf(page, 'input').hover();
    await expect.poll(paint).toEqual(await plain('hovered-'));
    expect((await paint())[1]).not.toBe(error);
    await page.mouse.down();
    await expect.poll(paint).toEqual(await plain('pressed-'));
    expect((await paint())[1]).not.toBe(error);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await keyFocusRemove(page, 'input');
    await expect.poll(paint).toEqual(await plain('focused-'));
    expect((await paint())[1]).not.toBe(error);
  });

  test('CHP-27: a chip that is not an input chip ignores destructiveRemove', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('action-default', { kind: 'action', label: 'Go' }, 'event'),
        fixture('action-flagged', { kind: 'action', destructiveRemove: true, label: 'Go' }, 'event'),
        fixture('filter-default', { kind: 'filter', selected: true, label: 'Go' }),
        fixture('filter-flagged', { kind: 'filter', selected: true, destructiveRemove: true, label: 'Go' }),
      ],
    });
    for (const [on, off] of [['action-default', 'action-flagged'], ['filter-default', 'filter-flagged']]) {
      await expect(host(page, off)).toHaveAttribute('destructive-remove', '');
      expect(await drawn(page, off), off).toEqual(await drawn(page, on));
      expect(await bounds(inner(page, off)), off).toMatchObject({ width: (await bounds(inner(page, on))).width, height: (await bounds(inner(page, on))).height });
      expect(await host(page, off).ariaSnapshot(), off).toBe(await host(page, on).ariaSnapshot());
      await expect(removeOf(page, off), off).toBeHidden();
    }
  });

  test('CHP-28: whatever destructiveRemove is, the remove action keeps its role, name, glyph, size and hit area, and announces nothing more or less', async ({ page }) => {
    const [on, off] = ['input-destructive-remove', 'input-plain-remove'];
    const describe = (id: string) =>
      removeOf(page, id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = getComputedStyle(el, '::before');
        const glyph = el.querySelector('.glyph')!;
        const g = glyph.getBoundingClientRect();
        const attrs = [...el.attributes].map((a) => a.name).filter((n) => n.startsWith('aria-') || n === 'role').sort();
        return { size: [r.width, r.height], hit: [hit.width, hit.height, hit.insetInlineStart], glyph: glyph.textContent, glyphBox: [g.width, g.height, g.x - r.x, g.y - r.y], attrs, label: el.getAttribute('aria-label') };
      });
    expect(await describe(off)).toEqual(await describe(on));
    expect((await describe(on)).label).toBe('Remove Ada Lovelace');
    expect(await host(page, off).ariaSnapshot()).toBe(await host(page, on).ariaSnapshot());
    expect(await host(page, on).ariaSnapshot()).toBe('- button "Ada Lovelace"\n- button "Remove Ada Lovelace"');
    expect(await bounds(inner(page, off))).toMatchObject({ width: (await bounds(inner(page, on))).width, height: (await bounds(inner(page, on))).height });
    // Nothing more is announced while it shows the error color, either.
    await removeOf(page, on).hover();
    await expect.poll(() => style(removeOf(page, on), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    expect(await host(page, on).ariaSnapshot()).toBe('- button "Ada Lovelace"\n- button "Remove Ada Lovelace"');
    await keyFocusRemove(page, on);
    expect(await host(page, on).ariaSnapshot()).toBe('- button "Ada Lovelace"\n- button "Remove Ada Lovelace"');
    // And it behaves the same: one remove, no click, for pointer and keys.
    for (const id of [on, off]) {
      await listen(host(page, id));
      await removeOf(page, id).focus();
      await page.keyboard.press('Enter');
      await removeOf(page, id).click();
      expect(await events(page), id).toMatchObject({ click: 0, remove: 2 });
    }
  });
});

// ── Choices of kind and the press itself ─────────────────────────────────────────────
/** A cupertino whose chip is not a capsule (CHP-10), built the way a product builds its layer. */
let squareCupertinoCss: Promise<string> | undefined;
const squareCupertino = () =>
  (squareCupertinoCss ??= (async () => {
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const layer = { id: 'square-cupertino', name: 'Square cupertino', extends: 'cupertino', description: 'A test layer.', tokens: { 'tanrei.comp.chip.container.shape': { $value: '{tanrei.sys.shape.corner.medium}' } } };
    return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
  })());

test.describe('the outline', () => {
  test('CHP-3: an outlined chip’s edge is the hairline in the default system — the color of the divider’s line, read from the chip’s own token — at rest and while disabled, in every outlined fixture that is not selected; cupertino keeps the outline role', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const hairline = await resolveColor(page, '--tanrei-sys-color-outline-variant');
    expect(hairline).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
    expect(hairline).not.toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
    for (const name of ['outlined-outline-color', 'outlined-disabled-outline-color', 'outlined-hovered-outline-color', 'outlined-pressed-outline-color']) expect(await resolveColor(page, T(name)), name).toBe(hairline);
    for (const id of ['action-outlined', 'action-small', 'action-no-icon', 'action-disabled', 'filter-unselected', 'input', 'input-avatar', 'input-small', 'input-disabled', 'input-destructive-remove', 'input-plain-remove']) {
      const shadow = await css(page, id, 'box-shadow');
      expect(shadow, id).toContain(hairline);
      expect(shadow, id).not.toContain(await resolveColor(page, '--tanrei-sys-color-outline'));
    }
    await mountFixtures(page, spec, { icons: true, system: 'cupertino' });
    expect(await resolveColor(page, T('outlined-outline-color'))).toBe(await resolveColor(page, '--tanrei-sys-color-outline'));
    expect(await resolveColor(page, T('outlined-disabled-outline-color'))).not.toBe(await resolveColor(page, T('outlined-outline-color')));
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
    await squareCupertino();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('CHP-8: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold, on the chip and on its remove action', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, target] of [['chip', (p: P) => inner(p, 'input')], ['remove', (p: P) => removeOf(p, 'input')]] as const) {
      for (const key of ['Enter', 'Space', 'click']) {
        await mountFixtures(page, spec);
        await target(page).focus();
        await target(page).evaluate((el) => {
          const log: { down?: number; on?: number; off?: number; up?: number; seen?: string } = ((window as any).press = {});
          new MutationObserver(() => {
            if (el.hasAttribute('data-pressed')) { log.on ??= performance.now(); log.seen ??= `${el.getAttribute('data-pressed')} ${getComputedStyle(el).transitionDuration.split(',')[0]}`; }
            else if (log.on !== undefined) log.off ??= performance.now();
          }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
          for (const type of ['pointerup', 'keyup']) el.addEventListener(type, () => (log.up ??= performance.now()));
          for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
        });
        // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is
        // the short one at the system's own hold, however long the driver takes to send the release.
        const activate = () => (key === 'click' ? clickCentre(page, target(page)) : page.keyboard.press(key));
        await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press)).off !== undefined, `${name} ${key}`);
        const log = await page.evaluate(() => (window as any).press);
        expect(log.seen, `${name} ${key}`).toBe('overlay 0s');
        expect(log.up - log.on, `${name} ${key}`).toBeLessThan(hold);
        expect(log.off - log.down, `${name} ${key}`).toBeGreaterThanOrEqual(hold - 1);
      }
    }
  });

  test('CHP-8: a disabled chip shows no pressed state', async ({ page }) => {
    await inner(page, 'input-disabled').click({ force: true });
    await removeOf(page, 'input-disabled').click({ force: true });
    expect(await pressed(inner(page, 'input-disabled'))).toBeNull();
    expect(await pressed(removeOf(page, 'input-disabled'))).toBeNull();
  });

  test('CHP-9 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await inner(page, 'filter-selected').hover();
    await page.mouse.down();
    expect(await pressed(inner(page, 'filter-selected'))).toBe('overlay');
    expect(await drawn(page, 'filter-selected')).toEqual(await expected(page, 'outlined', 'pressed-', 'selected-'));
    expect(await inner(page, 'filter-selected').locator('.ripple').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHP-9 ripple (m3-like): the pressed layer grows from the point of contact inside the outline; label, icon, outline and elevation take their pressed tokens at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'action-elevated';
    const box = await bounds(inner(page, id));
    const hovered = await resolveColor(page, T('elevated-hovered-container-color'));
    await override(page, { [T('elevated-pressed-label-color')]: 'rgb(0, 0, 255)', [T('elevated-pressed-icon-color')]: 'rgb(0, 128, 0)' });
    await page.mouse.move(box.x + 30, box.y + 10);
    await expect.poll(() => css(page, id, 'background-color')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, id));
    await page.mouse.down();
    expect(await pressed(inner(page, id))).toBe('ripple');
    const ripple = inner(page, id).locator('.ripple');
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      const c = el.parentElement!.getBoundingClientRect();
      const own = el.getBoundingClientRect();
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')) + own.left - c.left, y: Number.parseFloat(el.style.getPropertyValue('--_y')) + own.top - c.top, color: s.backgroundColor, inset: own.left - c.left, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
    });
    expect(layer.x).toBeCloseTo(30, 0);
    expect(layer.y).toBeCloseTo(10, 0);
    expect(layer.color).toBe(await resolveColor(page, T('elevated-pressed-container-color')));
    expect(layer.inset).toBeCloseTo(await resolveToken(page, T('outline-width')), 1);
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(await css(page, id, 'background-color')).toBe(hovered);
    expect(await css(page, id, 'color')).toBe('rgb(0, 0, 255)');
    expect(await style(iconOf(page, id), 'color')).toBe('rgb(0, 128, 0)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
  });

  test('CHP-9 ripple: keyboard activation answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await host(page, 'action-outlined').focus();
    await page.keyboard.down('Enter');
    const center = await inner(page, 'action-outlined').locator('.ripple').evaluate((el) => { const own = el.getBoundingClientRect(); return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height]; });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Enter');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Enter');
    const still = await inner(page, 'action-outlined').locator('.ripple').last().evaluate((el) => { const s = getComputedStyle(el); return [s.animationName, s.transitionDuration]; });
    expect(still).toEqual(['none', '0s']);
    await page.keyboard.up('Enter');
  });

  test('CHP-9 dim (cupertino): the pressed opacity on the whole control, the remove action with it, no state layer', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, { [T('outlined-pressed-container-color')]: 'rgb(255, 0, 0)', [T('outlined-hovered-container-color')]: 'rgb(0, 255, 0)' });
    await labelOf(page, 'input').hover();
    await expect.poll(() => css(page, 'input', 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(inner(page, 'input'))).toBe('dim');
    const opacity = await token(page, T('pressed-opacity'));
    expect(Number(opacity)).toBeLessThan(1);
    expect(await css(page, 'input', 'opacity')).toBe(opacity);
    expect(await style(removeOf(page, 'input'), 'opacity')).toBe(opacity);
    expect(await css(page, 'input', 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await inner(page, 'input').locator('.ripple').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHP-9 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await inner(page, 'action-outlined').hover();
    await expect.poll(() => drawn(page, 'action-outlined')).toEqual(await expected(page, 'outlined', 'hovered-'));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, 'action-outlined'));
    const before = await drawn(page, 'action-outlined');
    await page.mouse.down();
    expect(await pressed(inner(page, 'action-outlined'))).toBe('none');
    expect(await drawn(page, 'action-outlined')).toEqual(before);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(inner(page, 'action-outlined'))).toBe('overlay');
    await page.mouse.up();
  });

  test('CHP-10 corner smoothing: a quarter circle at the token radius by default; cupertino’s capsule and the round remove action stay round; a non-round corner is eased', async ({ page }) => {
    const radius = (locator: Locator, pseudo?: string) => style(locator, 'border-top-left-radius', pseudo).then(Number.parseFloat);
    expect(await radius(inner(page, 'action-outlined'))).toBe(await resolveToken(page, T('container-shape')));
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    expect(await token(page, T('container-shape-pill'))).toBe('1');
    expect(await radius(inner(page, 'input'))).toBeGreaterThanOrEqual((await bounds(inner(page, 'input'))).height / 2);
    for (const el of [inner(page, 'input'), removeOf(page, 'input')]) expect(await style(el, 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    await mountFixtures(page, spec, { system: 'square-cupertino', systemCss: await squareCupertino() });
    const shape = await resolveToken(page, T('container-shape'));
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(page, 'action-outlined', 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(await radius(inner(page, 'action-outlined'))).toBeCloseTo(shape * 1.24, 2);
      expect(await style(removeOf(page, 'input'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    } else {
      expect(await radius(inner(page, 'action-outlined'))).toBe(shape);
    }
  });

  test('CHP-10 focus-style: acme shows keyboard focus as a glow — around the chip and around the remove action; the default is a ring', async ({ page }) => {
    await tabTo(page, inner(page, 'action-outlined'));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await inner(page, 'action-outlined').getAttribute('data-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    for (const [target, onRemove] of [[inner(page, 'input'), false], [removeOf(page, 'input'), true]] as const) {
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      if (onRemove) await keyFocusRemove(page, 'input');
      else await tabTo(page, target);
      expect(await style(target, 'outline-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await style(target, 'box-shadow', '::after')).toContain(ring);
      expect(await target.getAttribute('data-focus-style')).toBe('glow');
    }
  });
});

// ── A design system may add sizes and variants ───────────────────────────────────────
test.describe('values a design system adds', () => {
  const layer = {
    id: 'wide',
    name: 'Wide',
    extends: 'tanrei',
    description: 'A test layer that adds a chip size and variant.',
    vocabulary: {
      'tanrei.comp.chip.size.large': { from: 'medium', scale: 1.25, rationale: 'Chips on a kiosk.' },
      'tanrei.comp.chip.variant.tinted': { from: 'outlined', rationale: 'A brand-tinted chip.' },
    },
    tokens: { 'tanrei.comp.chip.tinted.container.color': { $value: '{tanrei.sys.color.primary-container}' } },
  };
  let layerCss: Promise<string> | undefined;
  const sheet = () =>
    (layerCss ??= (async () => {
      const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
      const { emitCss } = await import('@tanrei/tokens-build/emit/css');
      return emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    })());
  const fixtures = [
    fixture('size-large', { size: 'large', label: 'Kiosk' }),
    fixture('variant-tinted', { variant: 'tinted', label: 'Brand' }),
    fixture('size-unknown', { size: 'colossal', label: 'Go' }),
    fixture('variant-unknown', { variant: 'sparkly', label: 'Go' }),
    fixture('plain', { label: 'Go' }),
  ];
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await sheet();
  });

  test('a size and a variant a layer adds render from their tokens, with no report', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures });
    expect((await bounds(inner(page, 'size-large'))).height).toBe(await resolveToken(page, T('container-height-large')));
    expect(await css(page, 'variant-tinted', 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-primary-container'));
    expect(seen.filter((w) => /size "large"|variant "tinted"/.test(w))).toEqual([]);
  });

  test('CHP-7: a value the active design system does not have renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss: await sheet(), fixtures });
    expect(await bounds(inner(page, 'size-unknown'))).toMatchObject({ height: (await bounds(inner(page, 'plain'))).height, width: (await bounds(inner(page, 'plain'))).width });
    expect(await drawn(page, 'variant-unknown')).toEqual(await drawn(page, 'plain'));
    await expect.poll(() => seen.filter((w) => w.includes('CHP-7')).length).toBe(2);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/size "colossal" is not a value of the active design system; it is drawn as "medium" \(CHP-7\)/),
      expect.stringMatching(/variant "sparkly" is not a value of the active design system; it is drawn as "outlined" \(CHP-7\)/),
    ]));
    const again = warnings(page);
    await mountFixtures(page, spec, { fixtures });
    expect((await bounds(inner(page, 'size-large'))).height).toBe((await bounds(inner(page, 'plain'))).height);
    expect(await drawn(page, 'variant-tinted')).toEqual(await drawn(page, 'plain'));
    await expect.poll(() => again.filter((w) => /size "large"|variant "tinted"/.test(w)).length).toBe(2);
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

  test('semantics: the chip is a button named by its label (a filter chip a toggle button), an input chip adds a remove button; icon, check and avatar are not announced', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await host(page, 'action-outlined').ariaSnapshot()).toBe('- button "Add to calendar"');
    expect(await host(page, 'filter-selected').ariaSnapshot()).toBe('- button "Vegetarian" [pressed]');
    expect(await host(page, 'filter-unselected').ariaSnapshot()).toBe('- button "Vegetarian"');
    await expect(host(page, 'filter-unselected').getByRole('button', { pressed: false })).toHaveCount(1);
    expect(await host(page, 'input').ariaSnapshot()).toBe('- button "Ada Lovelace"\n- button "Remove Ada Lovelace"');
    expect(await host(page, 'input-disabled').ariaSnapshot()).toBe('- button "Ada Lovelace" [disabled]\n- button "Remove Ada Lovelace" [disabled]');
    await expect(page.getByRole('button', { name: /event|check|close|cancel/ })).toHaveCount(0);
  });

  test('forced colors: the chip keeps a visible border where the engine has the mode', async ({ page }) => {
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
    expect(await css(page, 'action-elevated', 'border-top-style')).toBe('solid');
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('the icon faces are loaded, so every baseline draws glyphs, not ligature text', async ({ page }) => {
    for (const { id } of spec.fixtures) {
      for (const glyph of await host(page, id).locator('.glyph').all()) {
        if (!(await glyph.isVisible())) continue;
        const [text, box] = await glyph.evaluate((el) => {
          const slot = el.querySelector('slot');
          const node = slot ? slot.assignedElements()[0] : el;
          if (!node) return [0, 0];
          const range = document.createRange();
          range.selectNodeContents(node);
          return [range.getBoundingClientRect().width, el.getBoundingClientRect().width];
        });
        if (box) expect(text, id).toBeCloseTo(box, 0);
      }
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});

// ── An action chip with a destination is a link ────────────────────────
test.describe('link form', () => {
  const spec$ = (id: string) => spec.fixtures.find((f) => f.id === id)!;
  /** The same action chip without a destination: what a link chip must be drawn as (CHP-33). */
  const twin = (id: string): Fixture => {
    const { href: _href, target: _target, targetLabel: _targetLabel, ...props } = spec$(id).props;
    return { ...spec$(id), id: `${id}-twin`, props };
  };
  const NEW = { href: 'https://example.com/tanrei', target: 'new', targetLabel: 'opens in a new tab' };
  const markOfChip = (page: P, id: string) => markOf(host(page, id), '.mark');

  test('CHP-33: an action chip with href holds an anchor to it in place of the button — the link role, named by label, with no pressed state — drawn in every state exactly as the action chip it would otherwise be', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('action-link'), twin('action-link'), fixture('elevated-link', { kind: 'action', variant: 'elevated', label: 'Directions', href: '/map/' }, 'event'), fixture('elevated-link-twin', { kind: 'action', variant: 'elevated', label: 'Directions' }, 'event')] });
    const link = host(page, 'action-link');
    expect(await anchorOf(link)).toMatchObject({ tag: 'a', href: '/calendar/', target: null, rel: null, role: null, disabled: null, pressed: null, description: null });
    await expect(link.getByRole('link')).toHaveAccessibleName('Open in calendar');
    await expect(link.getByRole('button')).toHaveCount(0);
    // One anchor, and the remove action stays hidden: an action chip has none.
    expect(await link.evaluate((el) => el.shadowRoot!.querySelectorAll('a[href]').length)).toBe(1);
    await expect(removeOf(page, 'action-link')).toBeHidden();
    for (const id of ['action-link', 'elevated-link']) {
      await expectDrawnAlike(page, host(page, id), host(page, `${id}-twin`));
      // The icon, its color and the label are where and as the twin's are.
      expect(await style(iconOf(page, id), 'color'), id).toBe(await style(iconOf(page, `${id}-twin`), 'color'));
      expect((await bounds(iconOf(page, id))).x - (await bounds(inner(page, id))).x, id).toBe((await bounds(iconOf(page, `${id}-twin`))).x - (await bounds(inner(page, `${id}-twin`))).x);
    }
    await expect.poll(() => drawn(page, 'action-link')).toEqual(await expected(page, 'outlined', ''));
    // Keyboard focus: the same ring and the same focused paint, on the anchor.
    await tabTo(page, link);
    await expect(inner(page, 'action-link')).toHaveCSS('outline-style', 'solid');
    const focused = await settledPaint(link);
    await tabTo(page, host(page, 'action-link-twin'));
    expect(focused).toEqual(await settledPaint(host(page, 'action-link-twin')));
    // The hit area is the chip's.
    expect(await css(page, 'action-link', 'block-size', '::before')).toBe(await css(page, 'action-link-twin', 'block-size', '::before'));
  });

  test('CHP-1, CHP-34: a link chip emits click exactly once for a pointer and for Enter and then follows href, at once; a cancelled click opens nothing; Space emits no click, shows no press and scrolls the page; a modified or a middle click is the browser’s', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('action-link')] });
    await expectLinkActivation(page, host(page, 'action-link'));
  });

  test('CHP-35: target new opens a new context that has no handle to its opener, and exposes targetLabel as the description; an empty one is reported; target same draws no mark and ignores it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('action-link-new'), spec$('action-link')] });
    const link = host(page, 'action-link-new');
    expect(await anchorOf(link)).toMatchObject({ tag: 'a', href: 'https://example.com/tanrei', target: '_blank', rel: 'noopener', description: 'opens in a new tab' });
    await expect(link.getByRole('link', { name: 'Open in calendar' })).toHaveAccessibleDescription('opens in a new tab');
    expect(await markOfChip(page, 'action-link')).toBeNull();
    expect(await anchorOf(host(page, 'action-link'))).toMatchObject({ target: null, description: null });
    await expectTargetLabel(page, link, seen, 'CHP-35');
    expect(await markOfChip(page, 'action-link-new'), 'the mark stays without the words').not.toBeNull();
    await expectNewContext(page, link);
  });

  test('CHP-35: the mark open_in_new is drawn at the inline end where an input chip’s remove glyph is laid out — container.gap after the label, at icon.size, the end padded by padding-inline-with-icon, in the icon color, hidden from assistive technology — at both sizes and with or without a leading icon', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [spec$('action-link-new'), spec$('action-link-new-small'), fixture('new-no-icon', { kind: 'action', label: 'Directions', ...NEW }), fixture('elevated-new', { kind: 'action', variant: 'elevated', label: 'Directions', ...NEW }, 'event'), spec$('action-outlined')],
    });
    for (const [id, size] of [['action-link-new', 'medium'], ['action-link-new-small', 'small'], ['new-no-icon', 'medium'], ['elevated-new', 'medium']] as const) {
      const t = (name: string) => resolveToken(page, T(`${name}-${size}`));
      const [chip, text, mark] = [await bounds(inner(page, id)), await textBox(labelOf(page, id)), (await markOfChip(page, id))!];
      expect(mark.glyph, id).toBe('open_in_new');
      expect(mark.hidden, id).toBe(true);
      expect([mark.width, mark.height], id).toEqual([await t('icon-size'), await t('icon-size')]);
      expect(mark.right, `${id}: the end`).toBeCloseTo(await t('container-padding-inline-with-icon'), 1);
      expect(mark.left - (text.x + text.width - chip.x), `${id}: the gap`).toBeCloseTo(await t('container-gap'), 0);
      expect(chip.height, `${id}: the mark's box is no taller than the row`).toBe(await t('container-height'));
      expect(mark.mirrored, `${id}: the icon set marks its name`).toBe(true);
      expect(mark.transform, `${id}: left-to-right draws it as it is`).toBe('none');
    }
    // The default system's medium values, as the spec's verify gives them: 24 large, 8 from the label, 8 from the end.
    const medium = (await markOfChip(page, 'action-link-new'))!;
    expect([medium.width, medium.right]).toEqual([24, 8]);
    expect(await resolveToken(page, T('container-gap-medium'))).toBe(8);
    // The icon color of its look and state: at rest the variant's, hovered the hovered one — the leading icon's color.
    expect(medium.color).toBe(await resolveColor(page, T('outlined-icon-color')));
    expect((await markOfChip(page, 'elevated-new'))!.color).toBe(await resolveColor(page, T('elevated-icon-color')));
    await host(page, 'action-link-new').hover();
    await expect.poll(async () => (await markOfChip(page, 'action-link-new'))!.color).toBe(await resolveColor(page, T('outlined-hovered-icon-color')));
    expect((await markOfChip(page, 'action-link-new'))!.color).toBe(await style(iconOf(page, 'action-link-new'), 'color'));
    await page.mouse.move(1, 1);
    // The leading side is an action chip's own: the icon where it is without a destination.
    expect((await bounds(iconOf(page, 'action-link-new'))).x - (await bounds(inner(page, 'action-link-new'))).x).toBe((await bounds(iconOf(page, 'action-outlined'))).x - (await bounds(inner(page, 'action-outlined'))).x);
  });

  test('CHP-35: in a right-to-left layout the mark stands at the left, mirrored by the icon helper', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('action-link-new-rtl')] });
    const [chip, text, mark] = [await bounds(inner(page, 'action-link-new-rtl')), await textBox(labelOf(page, 'action-link-new-rtl')), (await markOfChip(page, 'action-link-new-rtl'))!];
    expect(mark.left).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    expect(text.x - chip.x - (mark.left + mark.width)).toBeCloseTo(await resolveToken(page, T('container-gap-medium')), 0);
    expect(mark.mirrored).toBe(true);
    expect(mark.transform).toBe(MIRRORED);
    // The leading icon is at the right.
    expect((await bounds(iconOf(page, 'action-link-new-rtl'))).x).toBeGreaterThan(text.x + text.width);
  });

  test('CHP-2, CHP-36: a disabled link chip is an anchor without href — the link role, disabled — that Tab passes, that emits no click and opens nothing, drawn as a disabled action chip with its mark in the disabled icon color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [spec$('action-outlined'), spec$('action-link-new-disabled'), twin('action-link-new-disabled'), spec$('action-no-icon')] });
    const link = host(page, 'action-link-new-disabled');
    await expectDisabledLink(page, link);
    expect(await holdsFocus(link)).toBe(false);
    await link.focus();
    expect(await holdsFocus(link)).toBe(false);
    // CHP-6: the disabled tokens of its variant.
    expect(await drawn(page, 'action-link-new-disabled')).toEqual(await expected(page, 'outlined', 'disabled-'));
    expect(await drawn(page, 'action-link-new-disabled')).toEqual(await drawn(page, 'action-link-new-disabled-twin'));
    expect(await css(page, 'action-link-new-disabled', 'cursor')).toBe('default');
    const mark = (await markOfChip(page, 'action-link-new-disabled'))!;
    expect(mark.glyph).toBe('open_in_new');
    expect(mark.color).toBe(await resolveColor(page, T('outlined-disabled-icon-color')));
    expect(mark.color).toBe(await style(iconOf(page, 'action-link-new-disabled'), 'color'));
    expect(await anchorOf(link)).toMatchObject({ description: 'opens in a new tab' });
    // Tab goes from the chip before it past it and its (button) twin to the chip after them.
    await tabTo(page, host(page, 'action-outlined'));
    await tab(page);
    await expect(inner(page, 'action-no-icon')).toBeFocused();
  });

  test('CHP-37: a filter chip and an input chip ignore href, target and targetLabel and stay what their kind makes them, reported; an unknown target is same, reported; white space is no destination; a javascript: address and one that cannot be read are refused and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('filter', { kind: 'filter', selected: true, label: 'Vegetarian', ...NEW }),
        fixture('input', { kind: 'input', label: 'Ada Lovelace', removeLabel: 'Remove Ada Lovelace', ...NEW }),
        fixture('plain', { kind: 'action', label: 'Go', href: '/somewhere/' }),
      ],
    });
    expect(await anchorOf(host(page, 'filter'))).toMatchObject({ tag: 'button', href: null, target: null, rel: null, pressed: 'true', description: null });
    expect(await anchorOf(host(page, 'input'))).toMatchObject({ tag: 'button', href: null, target: null, rel: null, pressed: null, description: null });
    for (const id of ['filter', 'input']) expect(await markOfChip(page, id), id).toBeNull();
    await expect(host(page, 'filter').getByRole('button', { pressed: true })).toHaveAccessibleName('Vegetarian');
    await expect(host(page, 'input').getByRole('button')).toHaveCount(2);
    await expect(host(page, 'filter').getByRole('link')).toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('(CHP-37)') && w.includes('a filter chip cannot be a link')).length).toBe(1);
    await expect.poll(() => seen.filter((w) => w.includes('(CHP-37)') && w.includes('an input chip cannot be a link')).length).toBe(1);
    // They still do what their kind does: a filter chip switches on Space, an input chip asks to be removed.
    await listen(host(page, 'filter'));
    await host(page, 'filter').focus();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await events(page)).change).toBe(1);
    await expect(host(page, 'filter')).toHaveJSProperty('selected', false);
    await listen(host(page, 'input'));
    await removeOf(page, 'input').click();
    expect(await events(page)).toMatchObject({ click: 0, remove: 1 });

    await expectRefusals(page, host(page, 'plain'), seen, 'CHP-37', { tag: 'button' });
    // Refused, it is an action chip without a destination: a button that Space activates.
    await host(page, 'plain').evaluate((el) => Object.assign(el, { href: 'javascript:alert(1)' }));
    await expect.poll(async () => (await anchorOf(host(page, 'plain'))).tag).toBe('button');
    await listen(host(page, 'plain'));
    await host(page, 'plain').focus();
    await page.keyboard.press('Space');
    expect((await events(page)).click).toBe(1);
    // Becoming a filter chip takes the destination away, and coming back gives it again.
    await host(page, 'plain').evaluate((el) => Object.assign(el, { href: '/somewhere/', kind: 'filter' }));
    await expect.poll(async () => (await anchorOf(host(page, 'plain'))).tag).toBe('button');
    await host(page, 'plain').evaluate((el) => Object.assign(el, { kind: 'action' }));
    await expect.poll(async () => (await anchorOf(host(page, 'plain'))).href).toBe('/somewhere/');
  });

  test('CHP-38: an input chip that is not removable draws no remove action, has no stop for one, emits no remove and is padded as a chip without one; the attribute is the inverse, not-removable; a chip of another kind ignores it', async ({ page }) => {
    await mountFixtures(page, spec);
    const id = 'input';
    const withAction = (await bounds(inner(page, id))).width;
    await expect(host(page, id)).toHaveJSProperty('removable', true);
    await host(page, id).evaluate((el) => el.setAttribute('not-removable', ''));
    await expect(host(page, id)).toHaveJSProperty('removable', false);
    await expect(removeOf(page, id)).toBeHidden();
    await expect(host(page, id).getByRole('button')).toHaveCount(1);
    // Padded as a chip that has no remove action: as the action chip of the same label and size is.
    const plain = await page.evaluate(async () => {
      const twin = Object.assign(document.createElement('tanrei-chip'), { label: 'Ada Lovelace' }) as HTMLElement & { updateComplete: Promise<unknown> };
      document.querySelector('[data-fixture="input"]')!.append(twin);
      await twin.updateComplete;
      const width = twin.shadowRoot!.querySelector('.container')!.getBoundingClientRect().width;
      twin.remove();
      return width;
    });
    const without = (await bounds(inner(page, id))).width;
    expect(without).toBeCloseTo(plain, 1);
    expect(without).toBeLessThan(withAction);
    // No stop for a remove action, and Backspace and Delete ask for nothing.
    await listen(host(page, id));
    await tabTo(page, inner(page, id));
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Delete');
    expect(await events(page)).toMatchObject({ remove: 0 });
    await tab(page);
    await expect(inner(page, 'input-avatar')).toBeFocused();
    // The property writes the attribute, and removable again it has its action back.
    await host(page, id).evaluate((el) => Object.assign(el, { removable: true }));
    await expect(host(page, id)).not.toHaveAttribute('not-removable', /.*/);
    await expect(removeOf(page, id)).toBeVisible();
    await removeOf(page, id).click();
    expect(await events(page)).toMatchObject({ remove: 1 });
    // Another kind ignores it.
    const before = await bounds(inner(page, 'action-no-icon'));
    await host(page, 'action-no-icon').evaluate((el) => Object.assign(el, { removable: false }));
    await expect(host(page, 'action-no-icon').getByRole('button')).toHaveCount(1);
    expect((await bounds(inner(page, 'action-no-icon'))).width).toBe(before.width);
  });

  test('CHP-23: a component that holds chips as a set gives the set one stop — on a chip whose element it gave a negative tabindex neither the chip nor its remove action is a Tab stop, and both stay focusable and pressable', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.locator('tanrei-chip[kind="input"]').evaluateAll((all) => all.forEach((one) => one.setAttribute('tabindex', '-1')));
    await tabTo(page, inner(page, 'filter-selected-small'));
    await tab(page);
    const stop = await page.evaluate(() => document.activeElement?.closest('[data-fixture]')?.getAttribute('data-fixture'));
    expect(stop, 'the input chips are passed').not.toMatch(/^input/);
    // Focusable by script (what the holder's keys do), and by a pointer; the remove action still asks.
    await host(page, 'input').evaluate((el: HTMLElement) => el.focus());
    await expect(inner(page, 'input')).toBeFocused();
    await listen(host(page, 'input'));
    await removeOf(page, 'input').click();
    expect(await events(page)).toMatchObject({ click: 0, remove: 1 });
  });
});
