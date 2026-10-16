// <tanrei-checkbox>, driven by specs/checkbox.spec.json: every behaviour id (CHK-1…19) is cited by a test title, every
// fixture has a baseline, and every condition, state and choice of kind is read back from the tokens — never from a
// number written here.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, presetFontFaces, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { RATIOS, atRatio, endMotion, holdMotionAt, paintedBehind, shoot, stageBehind, worst } from '../../../test/one-shape.js';
import { decodePng } from '../../../test/png.js';
import { opticalSizeAxis } from '../../../test/icons.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('checkbox');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-checkbox`);
const input = (page: P, id: string) => host(page, id).locator('input');
const container = (page: P, id: string) => host(page, id).locator('.container');
const boxOf = (page: P, id: string) => host(page, id).locator('.box');
/** The box's fill: a layer of the box, beside its outline (the box's ::before) — CHK-22. */
const fillOf = (page: P, id: string) => host(page, id).locator('.fill');
const labelOf = (page: P, id: string) => host(page, id).locator('.label');
const check = (page: P, id: string) => host(page, id).locator('.check');
const dash = (page: P, id: string) => host(page, id).locator('.dash');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-checkbox-${name}`;
const pressed = (page: P, id: string) => container(page, id).getAttribute('data-pressed');
const ripples = (page: P, id: string) => container(page, id).locator('.ripple');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** Counts the element's click, input and change events, and what each change carried. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = { click: 0, input: 0, change: 0, carried: [] as boolean[], checkedAtInput: [] as boolean[] });
    el.addEventListener('click', () => log.click++);
    el.addEventListener('input', () => { log.input++; log.checkedAtInput.push((el as any).checked); });
    el.addEventListener('change', (event) => { log.change++; log.carried.push((event as CustomEvent).detail.checked); });
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { click: number; input: number; change: number; carried: boolean[]; checkedAtInput: boolean[] });
const checked = (locator: Locator) => locator.evaluate((el) => ({ checked: (el as any).checked as boolean, indeterminate: (el as any).indeterminate as boolean }));
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props });
/**
 * From now on, records the duration (ms) of every transition of `property` that starts on the element, read from the
 * transition itself when it announces that it runs; `recorded()` returns them. A poll for a running transition misses
 * one that a loaded machine starts and ends between two samples, or one that starts before the poll does.
 */
const recordTransitions = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    (el as any).stopRecording?.();
    const stop = new AbortController();
    (el as any).stopRecording = () => stop.abort();
    const log: number[] = ((el as any).recorded = []);
    el.addEventListener('transitionrun', (event) => {
      if (event.target !== el || (event as TransitionEvent).propertyName !== p) return;
      const t = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === p);
      log.push(t ? Number(t.effect!.getTiming().duration) : Number.NaN); // NaN: it ended before a frame let it announce itself
    }, { signal: stop.signal });
  }, property);
const recorded = (locator: Locator) => locator.evaluate((el) => (el as any).recorded as number[]);
/**
 * Ends every transition running on the element now — and on what it contains, its pseudo-elements too (the box's fill
 * and outline are layers of it, CHK-22) — on its own timeline, so that the next step starts at rest.
 */
const finishTransitions = (locator: Locator) => locator.evaluate((el) => { for (const a of el.getAnimations({ subtree: true })) a.finish(); });
/**
 * Gives the element `conditionMotion()`: the durations (ms) of the transitions a change of condition has started on the
 * box's color, its outline and the mark. Read in the same task as the change (after the element's update;
 * `getAnimations()` styles the new condition and creates them), no wall-clock delay can let them end — or a later state
 * change replace them — first. Each `change` it emits stores them as `motionAtChange`, read the same way.
 */
const watchConditionMotion = (locator: Locator) =>
  locator.evaluate((el: any) => {
    const root = el.shadowRoot as ShadowRoot;
    // The outline is the box's ::before (CHK-22): its transition is the box's subtree's, on that pseudo-element.
    const of = (selector: string, p: string, pseudo: string | null = null) => {
      const t = root.querySelector(selector)!.getAnimations({ subtree: true }).find((a) => (a as CSSTransition).transitionProperty === p && (a.effect as KeyframeEffect).target === root.querySelector(selector) && (a.effect as KeyframeEffect).pseudoElement === pseudo);
      return t ? Number(t.effect!.getTiming().duration) : null;
    };
    el.conditionMotion = () => ({ box: of('.fill', 'background-color'), outline: of('.box', 'background-color', '::before'), mark: of('.check', 'color') });
    el.addEventListener('change', async () => {
      await el.updateComplete;
      el.motionAtChange = el.conditionMotion();
    });
  });
/** The duration (ms) the element's computed style gives a transition of `property` it would start now. */
const timingOf = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const s = getComputedStyle(el);
    return Number.parseFloat(s.transitionDuration.split(', ')[s.transitionProperty.split(', ').indexOf(p)]) * 1000;
  }, property);
/** Which condition each fixture draws (CHK-4). */
const CONDITION: Record<string, string> = {
  unselected: 'unselected',
  selected: 'selected',
  indeterminate: 'indeterminate',
  'error-unselected': 'error-unselected',
  'error-selected': 'error-selected',
  'error-indeterminate': 'error-indeterminate',
  'disabled-unselected': 'unselected',
  'disabled-selected': 'selected',
  'disabled-indeterminate': 'indeterminate',
  'label-hidden': 'selected',
};
/** Everything a condition paints, as drawn. */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
    return {
      container: s('.container').backgroundColor,
      box: s('.fill').backgroundColor,
      outline: getComputedStyle(root.querySelector('.box')!, '::before').backgroundColor,
      mark: s('.check').color,
      label: root.querySelector('.label') ? s('.label').color : null,
    };
  });
const expected = async (page: P, condition: string, state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    container: await resolveColor(page, name('container-color')),
    box: await resolveColor(page, name('box-color')),
    outline: await resolveColor(page, name('outline-color')),
    mark: await resolveColor(page, name('mark-color')),
    label: await resolveColor(page, name('label-color')),
  };
};
const matches = async (page: P, id: string, condition: string, state = '') => {
  const want = await expected(page, condition, state);
  await expect
    .poll(async () => {
      const d = await drawn(page, id);
      return { container: d.container, box: d.box, mark: d.mark, outline: d.outline.includes(want.outline), label: d.label ?? want.label };
    }, `${id} draws ${condition} ${state || 'at rest'}`)
    .toEqual({ container: want.container, box: want.box, mark: want.mark, outline: true, label: want.label });
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

  test('CHK-1: pointer on the box, pointer on the label, Space and element.click() each switch it and emit change once with the new value', async ({ page }) => {
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    await container(page, id).click();
    expect(await events(page)).toEqual({ click: 1, input: 1, change: 1, carried: [true], checkedAtInput: [true] });
    await labelOf(page, id).click();
    expect(await events(page)).toMatchObject({ click: 2, change: 2, carried: [true, false] });
    await target.focus();
    await page.keyboard.press('Space');
    expect(await events(page)).toMatchObject({ click: 3, change: 3, carried: [true, false, true] });
    await target.evaluate((el) => (el as HTMLElement).click());
    expect(await events(page)).toMatchObject({ click: 4, input: 4, change: 4, carried: [true, false, true, false] });
    // Assistive technology activates the native checkbox itself (its default action is a click on it).
    await target.getByRole('checkbox').dispatchEvent('click');
    expect(await events(page)).toMatchObject({ change: 5, carried: [true, false, true, false, true] });
    expect(await checked(target)).toEqual({ checked: true, indeterminate: false });
    // Setting the property is the app's own change: no event.
    await target.evaluate((el) => ((el as any).checked = false));
    await expect(input(page, id)).not.toBeChecked();
    expect((await events(page)).change).toBe(5);
  });

  test('CHK-1: a light-DOM <label for> and a click dispatched on the element switch it once', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('plain', {})] });
    await page.evaluate(() => {
      const el = document.querySelector('tanrei-checkbox')!;
      el.id = 'terms';
      el.insertAdjacentHTML('afterend', '<label for="terms" id="outside">Accept</label>');
    });
    const target = host(page, 'plain');
    await listen(target);
    await page.locator('#outside').click();
    expect(await events(page)).toMatchObject({ click: 1, change: 1, carried: [true] });
    await target.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })));
    expect(await events(page)).toMatchObject({ change: 2, carried: [true, false] });
  });

  test('CHK-1: Enter does not switch it on the web; inside a form it submits the form', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('plain', { label: 'Email me updates', name: 'updates' })] });
    await page.evaluate(() => {
      const el = document.querySelector('tanrei-checkbox')!;
      const form = document.createElement('form');
      el.replaceWith(form);
      form.append(el);
      (window as any).submits = 0;
      form.addEventListener('submit', (event) => { event.preventDefault(); (window as any).submits++; });
    });
    const target = host(page, 'plain');
    await listen(target);
    await target.focus();
    await page.keyboard.press('Enter');
    expect((await events(page)).change).toBe(0);
    expect(await checked(target)).toEqual({ checked: false, indeterminate: false });
    expect(await page.evaluate(() => (window as any).submits)).toBe(1);
    // …and it is not pressed by Enter either: the key does nothing to the control.
    await page.keyboard.down('Enter');
    expect(await pressed(page, 'plain')).toBeNull();
    await page.keyboard.up('Enter');
  });

  test('CHK-2: activating an indeterminate checkbox checks it, clears indeterminate and emits change with true — whatever checked was', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('mixed-on', { indeterminate: true, checked: true, label: 'Select all' })] });
    for (const id of ['indeterminate', 'mixed-on']) {
      const target = host(page, id);
      await listen(target);
      await target.click();
      expect(await events(page), id).toMatchObject({ change: 1, carried: [true], checkedAtInput: [true] });
      expect(await checked(target), id).toEqual({ checked: true, indeterminate: false });
      await expect(target, id).not.toHaveAttribute('indeterminate');
      await expect(target.getByRole('checkbox', { checked: true }), id).toHaveCount(1);
    }
  });

  test('CHK-3: a disabled checkbox neither changes nor emits change, is not focusable, ignores its label and exposes disabled', async ({ page }) => {
    for (const id of ['disabled-unselected', 'disabled-selected', 'disabled-indeterminate']) {
      const target = host(page, id);
      const before = await checked(target);
      await listen(target);
      await container(page, id).click({ force: true });
      await labelOf(page, id).click({ force: true });
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await target.focus();
      await page.keyboard.press('Space');
      expect((await events(page)).change, id).toBe(0);
      expect(await checked(target), id).toEqual(before);
      expect(await page.evaluate(() => document.activeElement?.tagName), id).not.toBe('TANREI-CHECKBOX');
      await expect(target.getByRole('checkbox', { disabled: true }), id).toHaveCount(1);
    }
    // Tab passes over them: from the last enabled fixture before them straight to the one after them.
    await tabTo(page, host(page, 'error-indeterminate'));
    await tab(page);
    await expect(input(page, 'label-hidden')).toBeFocused();
  });

  test('CHK-3: a disabled <fieldset> disables it as it disables a native checkbox', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('plain', { label: 'Email me updates' })] });
    await page.evaluate(() => {
      const el = document.querySelector('tanrei-checkbox')!;
      const fieldset = document.createElement('fieldset');
      el.replaceWith(fieldset);
      fieldset.append(el);
      fieldset.disabled = true;
    });
    const target = host(page, 'plain');
    await expect(target.getByRole('checkbox', { disabled: true })).toHaveCount(1);
    await target.click({ force: true });
    expect((await checked(target)).checked).toBe(false);
    await page.evaluate(() => (document.querySelector('fieldset')!.disabled = false));
    await target.click();
    expect((await checked(target)).checked).toBe(true);
  });

  test('CHK-4: each fixture draws its condition — indeterminate over checked, error prefixing it — from that condition’s tokens', async ({ page }) => {
    await page.mouse.move(0, 0);
    for (const id of ['unselected', 'selected', 'indeterminate', 'error-unselected', 'error-selected', 'error-indeterminate', 'label-hidden']) {
      await matches(page, id, CONDITION[id]);
    }
    // Checked and indeterminate together draw indeterminate; the error prefix follows the prop both ways.
    await mountFixtures(page, spec, { fixtures: [fixture('both', { checked: true, indeterminate: true, label: 'Select all' })] });
    await matches(page, 'both', 'indeterminate');
    await host(page, 'both').evaluate((el) => ((el as any).error = true));
    await matches(page, 'both', 'error-indeterminate');
    await host(page, 'both').evaluate((el) => ((el as any).indeterminate = false));
    await matches(page, 'both', 'error-selected');
    await host(page, 'both').evaluate((el) => ((el as any).error = false));
    await matches(page, 'both', 'selected');
    // The conditions are told apart in the default system: fill for on, outline color for error.
    expect((await expected(page, 'selected')).box).not.toBe((await expected(page, 'unselected')).box);
    expect((await expected(page, 'error-unselected')).outline).not.toBe((await expected(page, 'unselected')).outline);
  });

  test('CHK-5: hover, keyboard focus and press render the container from that state’s tokens of the condition; box, mark, outline and label keep theirs (default system)', async ({ page }) => {
    // One mount for both: Chromium stops sending pointerleave to a page mounted with setContent after keyboard focus
    // moved in the page it replaced, and a pointer press would then never end (seen while writing this test).
    for (const [id, condition] of [['unselected', 'unselected'], ['error-selected', 'error-selected']] as const) {
      await page.mouse.move(0, 0);
      await matches(page, id, condition);
      await container(page, id).hover();
      await matches(page, id, condition, 'hovered');
      expect((await drawn(page, id)).container, id).not.toBe((await expected(page, condition)).container);
      await page.mouse.down(); // hovered AND pressed: pressed wins
      await matches(page, id, condition, 'pressed');
      await page.mouse.move(0, 0);
      await page.mouse.up();
      // Focus gained by the pointer does not select the focused state.
      expect(await input(page, id).evaluate((el) => el.matches(':focus-visible'))).toBe(false);
      await matches(page, id, condition);
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, host(page, id));
      await matches(page, id, condition, 'focused');
    }
    // The label is part of the control: hovering it shows the state layer too.
    await page.mouse.move(0, 0);
    await labelOf(page, 'selected').hover();
    await matches(page, 'selected', 'selected', 'hovered');
    // Opacity is the state's.
    expect(await css(host(page, 'selected').locator('.root'), 'opacity')).toBe(await token(page, T('hovered-opacity')));
  });

  test('CHK-5: under acme, where the three states differ, pressed beats focused beats hovered — in every condition', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const [id, condition] of [['unselected', 'unselected'], ['indeterminate', 'indeterminate'], ['error-selected', 'error-selected']] as const) {
      const name = (s: string) => T(`${condition}-${s ? `${s}-` : ''}container-color`);
      const bg = () => css(container(page, id), 'background-color');
      const [rest, hovered, focused, down] = await Promise.all(['', 'hovered', 'focused', 'pressed'].map((s) => resolveColor(page, name(s))));
      expect(new Set([rest, hovered, focused, down]).size, id).toBe(4);
      await page.mouse.move(0, 0);
      await expect.poll(bg, id).toBe(rest);
      await container(page, id).hover();
      await expect.poll(bg, id).toBe(hovered);
      await tabTo(page, host(page, id)); // hovered AND keyboard-focused: focused wins
      await expect.poll(bg, id).toBe(focused);
      await page.keyboard.down('Space'); // hovered AND focused AND pressed: pressed wins
      await expect.poll(bg, id).toBe(down);
      await page.keyboard.up('Space');
      // The key-up switched it; switch it back to the condition under test.
      await host(page, id).evaluate((el, c) => {
        (el as any).checked = c.endsWith('selected') && !c.endsWith('unselected');
        (el as any).indeterminate = c.endsWith('indeterminate');
      }, condition);
      await expect.poll(bg, id).toBe(focused);
      await page.mouse.down();
      await expect.poll(bg, id).toBe(down);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
  });

  test('CHK-6: keyboard focus shows the focus ring around the box immediately; pointer focus does not', async ({ page }) => {
    const box = boxOf(page, 'unselected');
    await host(page, 'unselected').click();
    await expect(box).toHaveCSS('outline-style', 'none');
    expect(await css(box, 'content', '::after')).toBe('none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, 'unselected'));
    await expect(box).toHaveCSS('outline-style', 'solid');
    await expect(box).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(box).toHaveCSS('outline-width', `${await resolveToken(page, '--tanrei-sys-focus-outer-width')}px`);
    await expect(box).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    // Around the box, not the round container, and never animated.
    await expect(container(page, 'unselected')).toHaveCSS('outline-style', 'none');
    expect(await css(box, 'transition-property')).not.toContain('outline');
  });

  test('CHK-7: the hit area meets sys.target.pointer around the container while the container and box keep their size; the label is in it', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const side = await resolveToken(page, T('container-size'));
    const c = await bounds(container(page, 'unselected'));
    expect([c.width, c.height]).toEqual([side, side]);
    const control = host(page, 'unselected').locator('.control');
    const hit = await control.evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(Math.min(...hit)).toBeGreaterThanOrEqual(pointer);
    // Just outside the container, inside the target, above, below and before it: each click switches it.
    await listen(host(page, 'unselected'));
    const d = (Math.max(side, pointer) - side) / 4;
    const [cx, cy] = [c.x + c.width / 2, c.y + c.height / 2];
    for (const [x, y] of [[cx, c.y - d], [cx, c.y + c.height + d], [c.x - d, cy]]) await page.mouse.click(x, y);
    expect((await events(page)).change).toBe(3);
    // The label's whole box is in it, not only its text.
    const l = await bounds(labelOf(page, 'unselected'));
    await page.mouse.click(l.x + l.width - 1, l.y + 1);
    expect((await events(page)).change).toBe(4);
  });

  test('CHK-7: in RTL the hit area stays centered on the container', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const c = await bounds(container(page, 'unselected'));
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    await listen(host(page, 'unselected'));
    const cy = c.y + c.height / 2;
    const d = (pointer - c.width) / 4;
    await page.mouse.click(c.x + c.width + d, cy); // the inline-start side in RTL: outside the label
    expect((await events(page)).change).toBe(1);
    await page.mouse.click(c.x + c.width / 2 + pointer / 2 + 3, cy); // beyond the target
    expect((await events(page)).change).toBe(1);
  });

  test('CHK-7: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await host(page, 'unselected').locator('.control').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit).toEqual([touch, touch]);
  });

  test('CHK-8: disabled renders from the disabled tokens of its condition — the round container stays clear', async ({ page }) => {
    for (const id of ['disabled-unselected', 'disabled-selected', 'disabled-indeterminate']) {
      await matches(page, id, CONDITION[id], 'disabled');
      expect(await css(host(page, id).locator('.root'), 'opacity'), id).toBe(await token(page, T('disabled-opacity')));
      // In the Tanrei system: no disc behind a disabled checkbox, and a faded outline.
      expect((await drawn(page, id)).container, id).toBe('rgba(0, 0, 0, 0)');
      expect((await drawn(page, id)).outline, id).toMatch(/0\.38\)/);
    }
    // An unchecked box stays unfilled when disabled.
    expect((await drawn(page, 'disabled-unselected')).box).toBe('rgba(0, 0, 0, 0)');
  });

  test('CHK-8: a disabled error checkbox draws the disabled tokens of its error condition', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('disabled-error', { disabled: true, error: true, checked: true, label: 'I accept the terms' })] });
    await matches(page, 'disabled-error', 'error-selected', 'disabled');
  });
});

// ── The press, the choices of kind, the geometry and the motion ─────────────────────
test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  /** Records, inside the page, when data-pressed appears and disappears on the container, and when the press ends. */
  const watchPress = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const c = el.shadowRoot!.querySelector('.container')!;
      const log: { down?: number; on?: number; off?: number; up?: number; seen?: string[] } = ((window as any).press = {});
      new MutationObserver(() => {
        if (c.hasAttribute('data-pressed')) {
          log.on ??= performance.now();
          const s = getComputedStyle(c);
          log.seen ??= [c.getAttribute('data-pressed')!, s.transitionDuration.split(',')[0].trim(), s.backgroundColor];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(c, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) el.shadowRoot!.addEventListener(type, () => (log.up ??= performance.now()));
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  const CLOCK = 1;
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('CHK-9: a press that ends within a frame — Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, activate] of [
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, container(page, 'unselected'))],
    ] as const) {
      await mountFixtures(page, spec);
      await host(page, 'unselected').focus();
      // Let the focused state settle first: in the default system it has the pressed state's strength.
      await expect.poll(() => css(container(page, 'unselected'), 'background-color')).toBe(await resolveColor(page, T('unselected-focused-container-color')));
      await watchPress(page, 'unselected');
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await pressLog(page)).off !== undefined, name);
      const log = await pressLog(page);
      // Without delay: the pressed container with no transition in. (The press also switched it: the pressed color is
      // the one of the condition it was in when the press began, or the new one — both are the pressed state.)
      expect(log.seen!.slice(0, 2), name).toEqual(['overlay', '0s']);
      expect([await resolveColor(page, T('unselected-pressed-container-color')), await resolveColor(page, T('selected-pressed-container-color'))], name).toContain(log.seen![2]);
      expect(log.up! - log.on!, `${name}: the press itself was shorter than press-hold`).toBeLessThan(hold);
      expect(log.off! - log.down!, name).toBeGreaterThanOrEqual(hold - CLOCK);
    }
  });

  test('CHK-9: a pointer press lasts while the pointer is down, even when focus leaves; a key press ends when focus leaves; disabled shows none', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await container(page, 'unselected').hover();
    await page.mouse.down();
    await input(page, 'unselected').evaluate((el) => el.blur());
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, 'unselected')).toBe('overlay');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'unselected')).toBeNull();

    await host(page, 'unselected').focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, 'unselected')).toBe('overlay');
    await input(page, 'unselected').evaluate((el) => el.blur());
    await expect.poll(() => pressed(page, 'unselected')).toBeNull();
    await page.keyboard.up('Space');

    await container(page, 'disabled-selected').click({ force: true });
    expect(await pressed(page, 'disabled-selected')).toBeNull();
  });

  test('CHK-10 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await container(page, 'selected').hover();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('overlay');
    expect(await css(container(page, 'selected'), 'background-color')).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHK-10 ripple (m3-like): the pressed layer grows from the point of contact inside the round container; the box takes its pressed color at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'selected';
    const c = await bounds(container(page, id));
    const hovered = await resolveColor(page, T('selected-hovered-container-color'));
    await override(page, { [T('selected-pressed-box-color')]: 'rgb(0, 0, 255)' });
    await page.mouse.move(c.x + 12, c.y + 10);
    await expect.poll(() => css(container(page, id), 'background-color')).toBe(hovered);
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('ripple');
    const ripple = ripples(page, id);
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => {
      const s = getComputedStyle(el);
      const own = el.getBoundingClientRect();
      return {
        x: Number.parseFloat(el.style.getPropertyValue('--_x')),
        y: Number.parseFloat(el.style.getPropertyValue('--_y')),
        color: s.backgroundColor,
        radius: Number.parseFloat(s.borderTopLeftRadius),
        animation: s.animationName,
        grow: Number.parseFloat(s.animationDuration) * 1000,
        fade: Number.parseFloat(s.transitionDuration) * 1000,
        width: own.width,
      };
    });
    expect(layer.x).toBeCloseTo(12, 0);
    expect(layer.y).toBeCloseTo(10, 0);
    expect(layer.color).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(layer.animation).toBe('ripple-grow');
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(layer.fade).toBe(await resolveToken(page, T('motion-state-duration'), 'duration'));
    expect(layer.radius).toBeGreaterThanOrEqual(layer.width / 2 - 1); // round, like the container
    // The container stays with the state under the press; the box is the pressed box.
    expect(await css(container(page, id), 'background-color')).toBe(hovered);
    await expect.poll(() => css(fillOf(page, id), 'background-color')).toBe('rgb(0, 0, 255)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
  });

  test('CHK-10 ripple: Space answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await host(page, 'unselected').focus();
    await page.keyboard.down('Space');
    const center = await ripples(page, 'unselected').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Space');
    await expect(ripples(page, 'unselected')).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Space');
    const still = await ripples(page, 'unselected').evaluate((el) => ({ animation: getComputedStyle(el).animationName, transition: getComputedStyle(el).transitionDuration }));
    expect(still).toEqual({ animation: 'none', transition: '0s' });
    await page.keyboard.up('Space');
    await expect(ripples(page, 'unselected')).toHaveCount(0);
  });

  test('CHK-10 dim (cupertino): the pressed opacity on the whole control, no state layer; the box takes its pressed color', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, {
      [T('selected-pressed-container-color')]: 'rgb(255, 0, 0)',
      [T('selected-hovered-container-color')]: 'rgb(0, 255, 0)',
      [T('selected-pressed-box-color')]: 'rgb(0, 0, 255)',
    });
    await container(page, 'selected').hover();
    await expect.poll(() => css(container(page, 'selected'), 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('dim');
    const root = host(page, 'selected').locator('.root');
    expect(await css(root, 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(root, 'opacity'))).toBeLessThan(1);
    expect(await css(container(page, 'selected'), 'background-color')).toBe('rgb(0, 255, 0)');
    await expect.poll(() => css(fillOf(page, 'selected'), 'background-color')).toBe('rgb(0, 0, 255)');
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHK-10 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await container(page, 'selected').hover();
    await expect.poll(() => css(container(page, 'selected'), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-container-color')));
    const all = () => drawn(page, 'selected');
    const before = await all();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('none');
    expect(await all()).toEqual(before);
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await container(page, 'selected').hover();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('overlay');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('CHK-11 corner smoothing: the box at its token radius by default; cupertino eases the box and keeps the round container round', async ({ page }) => {
    const radius = (locator: Locator, pseudo?: string) => css(locator, 'border-top-left-radius', pseudo).then(Number.parseFloat);
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0');
    expect(await radius(boxOf(page, 'selected'))).toBe(await resolveToken(page, T('box-shape')));
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const box = boxOf(page, 'selected');
    const shape = await resolveToken(page, T('box-shape'));
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    if (supported) {
      expect(Number.parseFloat((await css(box, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(await radius(box)).toBeCloseTo(shape * 1.24, 2);
      // The focus ring follows the box: the same curve, concentric.
      await tabTo(page, host(page, 'selected'));
      expect(await css(box, 'corner-top-left-shape', '::after')).toBe(await css(box, 'corner-top-left-shape'));
    } else {
      expect(await radius(box)).toBe(shape);
    }
    // The container is the full step: round whatever the amount.
    const c = await bounds(container(page, 'selected'));
    expect(await radius(container(page, 'selected'))).toBeGreaterThanOrEqual(c.width / 2);
    expect(await css(container(page, 'selected'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
  });

  test('CHK-11 focus-style: acme shows keyboard focus as a glow around the box; the default is a ring', async ({ page }) => {
    await tabTo(page, host(page, 'unselected'));
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('ring');
    expect(await css(boxOf(page, 'unselected'), 'box-shadow', '::after')).toBe('none');
    expect(await input(page, 'unselected').getAttribute('data-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await tabTo(page, host(page, 'unselected'));
    const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
    expect(await css(boxOf(page, 'unselected'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(boxOf(page, 'unselected'), 'box-shadow', '::after')).toContain(ring);
    expect(await input(page, 'unselected').getAttribute('data-focus-style')).toBe('glow');
  });

  test('CHK-5 / CHK-13: a part a state recolors changes over the state motion; the same part changes over the selection motion when the condition changes', async ({ page }) => {
    // Two different timings, so that one cannot pass for the other; and a box a hover recolors. Both are long enough that
    // a transition is still running when the next frame announces it, however slow the machine.
    const [state, selection] = [1000, 2500];
    await override(page, {
      [T('motion-state-duration')]: `${state}ms`,
      [T('motion-selection-duration')]: `${selection}ms`,
      [T('unselected-hovered-box-color')]: 'rgb(0, 0, 255)',
    });
    const box = fillOf(page, 'unselected');
    const rest = await resolveColor(page, T('unselected-box-color'));
    await page.mouse.move(0, 0);
    await recordTransitions(box, 'background-color');
    await container(page, 'unselected').hover();
    await expect.poll(() => recorded(box)).toEqual([state]);
    await page.mouse.move(0, 0);
    // At rest again: whatever the hover left running is ended on its own timeline.
    await expect.poll(() => box.evaluate((el) => { for (const a of el.getAnimations()) a.finish(); return getComputedStyle(el).backgroundColor; })).toBe(rest);
    // A change of condition — by the app, or by Space — takes the selection motion, for the box, its outline and the mark.
    await watchConditionMotion(host(page, 'unselected'));
    const byApp = await host(page, 'unselected').evaluate(async (el: any) => {
      el.checked = true;
      await el.updateComplete;
      return el.conditionMotion();
    });
    expect(byApp).toEqual({ box: selection, outline: selection, mark: selection });
    // Ended, not waited for: Space starting while it still ran would reverse it, over a shortened duration.
    await finishTransitions(boxOf(page, 'unselected'));
    await host(page, 'unselected').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => host(page, 'unselected').evaluate((el: any) => el.motionAtChange ?? null)).toEqual({ box: selection, outline: selection, mark: selection });
    await finishTransitions(boxOf(page, 'unselected'));
    // …and the mark comes back to the state motion afterwards: a hover right after it is a state change again.
    await expect.poll(() => timingOf(box, 'background-color')).toBe(state);
    await input(page, 'unselected').evaluate((el) => el.blur()); // focused would win over hovered
    await recordTransitions(box, 'background-color');
    await container(page, 'unselected').hover();
    await expect.poll(() => recorded(box)).toEqual([state]);
  });

  test('CHK-10 ripple: a press on the label, outside the container, grows it from the container’s center', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    const l = await bounds(labelOf(page, 'unselected'));
    await page.mouse.move(l.x + l.width - 4, l.y + 4);
    await page.mouse.down();
    const origin = await ripples(page, 'unselected').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(origin[0]).toBeCloseTo(0.5, 5);
    expect(origin[1]).toBeCloseTo(0.5, 5);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

});

// ── The glyph (CHK-12), its motion (CHK-13, CHK-17, CHK-18) and a missing icon font (CHK-19) ─────────────────────
/**
 * Gives the page `marks(el)`: what the element draws of each glyph — whether the icon set can draw it (`data-drawn`),
 * whether it is visible, its opacity and scale, and which transitions run on it — and its box's fill. Read in the task
 * that changed the element (after its update), no wall-clock delay can let a transition end before it is seen.
 */
const installMarks = (page: P) =>
  page.evaluate(() => {
    const scale = (v: string) => (v === 'none' ? 1 : Number.parseFloat(v));
    (window as any).marks = (el: Element) => {
      const root = el.shadowRoot!;
      const one = (selector: string) => {
        const m = root.querySelector<HTMLElement>(selector)!;
        const s = getComputedStyle(m);
        const running = m.getAnimations().map((a) => (a as CSSTransition).transitionProperty).sort();
        return { drawn: m.hasAttribute('data-drawn'), visible: s.visibility === 'visible', opacity: Number(s.opacity), scale: scale(s.scale), running };
      };
      // The box's color is its fill layer's (CHK-22); what runs on the box is what runs on it, its fill and its outline.
      const box = root.querySelector('.box')!;
      const ofBox = box.getAnimations({ subtree: true }).filter((a) => [box, root.querySelector('.fill')].includes((a.effect as KeyframeEffect).target as Element));
      return { check: one('.check'), dash: one('.dash'), box: getComputedStyle(root.querySelector('.fill')!).backgroundColor, boxRunning: ofBox.length };
    };
  });
type Mark = { drawn: boolean; visible: boolean; opacity: number; scale: number; running: string[] };
type Marks = { check: Mark; dash: Mark; box: string; boxRunning: number };
const marks = (locator: Locator) => locator.evaluate((el) => (window as any).marks(el) as Marks);
/** The easing a cubicBezier token resolves to, as the browser serializes a transition-timing-function. */
const easingOf = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);
/** What a probe computes for `property: value` — a token expression as the browser resolves it. */
const computedAs = (page: P, property: string, value: string) =>
  page.evaluate(([p, v]) => {
    const probe = document.createElement('div');
    probe.style.setProperty(p, v);
    document.body.append(probe);
    const out = getComputedStyle(probe).getPropertyValue(p);
    probe.remove();
    return out;
  }, [property, value] as const);
const glyphBox = (page: P, id: string, which: 'check' | 'dash') => bounds(host(page, id).locator(`.${which}`));
/**
 * The ink a glyph draws on a ground of one color, read from the pixels (CHK-12): `locator` as it is painted, less
 * `inset` CSS px on each side, so that the ground and the glyph are all there is in it. A pixel's coverage is how far it
 * lies from the ground (the region's first pixel) towards `color`. `area` is the sum of the coverages, `stroke` the ink
 * a column of pixels crosses (the median of the columns that cross any: a horizontal stroke's width, and more than a
 * slanted one's by its slant), `width` and `height` the box of the pixels covered by a quarter or more, and `clear` the
 * least distance from that box to the region's edge — all in CSS px.
 */
const inkOn = async (locator: Locator, inset: number, color: string) => {
  const shot = decodePng(await locator.screenshot({ animations: 'disabled', scale: 'device' }));
  const ratio = shot.width / (await bounds(locator)).width;
  const [x0, y0] = [Math.round(inset * ratio), Math.round(inset * ratio)];
  const [x1, y1] = [shot.width - x0, shot.height - y0];
  const px = (x: number, y: number) => [0, 1, 2].map((c) => shot.data[(y * shot.width + x) * 4 + c]);
  const ground = px(x0, y0);
  const towards = color.match(/[\d.]+/g)!.slice(0, 3).map((v, c) => Number(v) - ground[c]);
  const length = towards.reduce((sum, v) => sum + v * v, 0);
  const coverage = (x: number, y: number) => Math.min(1, Math.max(0, px(x, y).reduce((sum, v, c) => sum + (v - ground[c]) * towards[c], 0) / length));
  const columns: number[] = [];
  const box = { left: x1, top: y1, right: x0, bottom: y0 };
  for (let x = x0; x < x1; x++) {
    let column = 0;
    for (let y = y0; y < y1; y++) {
      const c = coverage(x, y);
      column += c;
      if (c >= 0.25) Object.assign(box, { left: Math.min(box.left, x), top: Math.min(box.top, y), right: Math.max(box.right, x + 1), bottom: Math.max(box.bottom, y + 1) });
    }
    columns.push(column);
  }
  const crossed = columns.filter((c) => c >= 0.25).sort((a, b) => a - b);
  return {
    area: columns.reduce((sum, c) => sum + c, 0) / ratio ** 2,
    stroke: (crossed[Math.floor(crossed.length / 2)] ?? 0) / ratio,
    width: Math.max(0, box.right - box.left) / ratio,
    height: Math.max(0, box.bottom - box.top) / ratio,
    clear: Math.min(box.left - x0, box.top - y0, x1 - box.right, y1 - box.bottom) / ratio,
  };
};
/** The weight a glyph is drawn at: the `wght` of its computed variation settings. */
const weightOf = (locator: Locator) => locator.evaluate((el) => Number(/["']wght["'] ([\d.]+)/.exec(getComputedStyle(el).fontVariationSettings)?.[1]));
/** The condition each fixture's glyph is drawn in, and which glyph it is. */
const MARKS = [['selected', 'check'], ['indeterminate', 'dash']] as const;

test.describe('glyph and selection motion', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await installMarks(page);
  });

  test('CHK-12: the box is box.size, centered in a round container.size; the outline lies inside its edge and the fill inside the outline', async ({ page }) => {
    const [side, box, outline] = [await resolveToken(page, T('container-size')), await resolveToken(page, T('box-size')), await resolveToken(page, T('outline-width'))];
    for (const id of ['unselected', 'selected', 'indeterminate']) {
      const [c, b] = [await bounds(container(page, id)), await bounds(boxOf(page, id))];
      expect([c.width, c.height], id).toEqual([side, side]);
      expect([b.width, b.height], id).toEqual([box, box]);
      expect(b.x + b.width / 2, id).toBeCloseTo(c.x + c.width / 2, 5);
      expect(b.y + b.height / 2, id).toBeCloseTo(c.y + c.height / 2, 5);
      // Two layers of the box, each the whole box with a padding of outline.width: the outline is cut to everything but
      // its content box and the fill to that content box, so the fill lies inside the outline and never under it
      // (CHK-22 reads the pixels).
      expect(await css(boxOf(page, id), 'box-shadow'), id).toBe('none');
      expect(await css(boxOf(page, id), 'background-color'), id).toBe('rgba(0, 0, 0, 0)');
      for (const [layer, pseudo] of [[boxOf(page, id), '::before'], [fillOf(page, id), undefined]] as const) {
        for (const side of ['top', 'right', 'bottom', 'left']) {
          expect(await css(layer, `padding-${side}`, pseudo), `${id} ${pseudo ?? 'fill'} ${side}`).toBe(`${outline}px`);
          expect(await css(layer, side, pseudo), `${id} ${pseudo ?? 'fill'} ${side}`).toBe('0px');
        }
        expect(await css(layer, 'border-top-left-radius', pseudo), id).toBe(await css(boxOf(page, id), 'border-top-left-radius'));
        expect(await css(layer, 'mask-clip', pseudo), id).toBe('content-box, no-clip');
      }
      expect((await bounds(fillOf(page, id))), id).toEqual(b);
    }
  });

  test('CHK-12: the mark is the icon set’s check (selected) or remove (indeterminate) at mark.size, centered on the box and not clipped, in the selected family and fill at comp.checkbox.mark.weight, its ink inside the box; no mark of its own', async ({ page }) => {
    const [size, box] = [await resolveToken(page, T('mark-size')), await resolveToken(page, T('box-size'))];
    const family = await computedAs(page, 'font-family', 'var(--tanrei-sys-icon-family-selected)');
    const variation = await computedAs(page, 'font-variation-settings', `'FILL' var(--tanrei-sys-icon-fill-selected), 'wght' var(--tanrei-comp-checkbox-mark-weight), 'GRAD' 0${await opticalSizeAxis(page, size)}`);
    for (const id of ['unselected', 'selected', 'indeterminate']) {
      const b = await bounds(boxOf(page, id));
      for (const which of ['check', 'dash'] as const) {
        const glyph = host(page, id).locator(`.${which}`);
        expect(await glyph.textContent(), `${id} ${which}`).toBe(which === 'check' ? 'check' : 'remove');
        expect(Number.parseFloat(await css(glyph, 'font-size')), `${id} ${which}`).toBe(size);
        expect(await css(glyph, 'font-family'), `${id} ${which}`).toBe(family);
        expect(await css(glyph, 'font-variation-settings'), `${id} ${which}`).toBe(variation);
        // The glyph box is mark.size, laid out at its full size, centered on the box whatever its scale.
        expect(await glyph.evaluate((el) => [(el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight]), `${id} ${which}`).toEqual([size, size]);
        const g = await glyphBox(page, id, which);
        expect(g.x + g.width / 2, `${id} ${which}`).toBeCloseTo(b.x + b.width / 2, 2);
        expect(g.y + g.height / 2, `${id} ${which}`).toBeCloseTo(b.y + b.height / 2, 2);
      }
      // Not clipped by the box, nor by the control around it.
      for (const part of [boxOf(page, id), host(page, id).locator('.control')]) {
        expect(await css(part, 'overflow'), id).toBe('visible');
        expect(await css(part, 'clip-path'), id).toBe('none');
      }
      // No path, shape or character of its own: the only marks are the two glyphs.
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('svg, path, img, canvas').length), id).toBe(0);
    }
    // Only the condition's glyph is drawn: the check while selected, the dash while indeterminate, neither while unselected.
    const shown = async (id: string) => {
      const m = await marks(host(page, id));
      return { check: m.check.opacity === 1 && m.check.scale === 1, dash: m.dash.opacity === 1 && m.dash.scale === 1, anyUnselected: m.check.opacity + m.dash.opacity };
    };
    expect(await shown('selected')).toMatchObject({ check: true, dash: false });
    expect(await shown('indeterminate')).toMatchObject({ check: false, dash: true });
    expect((await shown('unselected')).anyUnselected).toBe(0);
    // Hidden from assistive technology: the name is the label, the state is the state, never "check" or "remove".
    expect(await host(page, 'selected').ariaSnapshot()).toBe('- checkbox "Email me updates" [checked]');
    expect(await host(page, 'indeterminate').ariaSnapshot()).toBe('- checkbox "Select all" [checked=mixed]');
    // The ligature is formed: one glyph, about an em wide (canvas measures the font's default instance; the advance of
    // an icon is the same at every weight).
    const advances = await page.evaluate(({ f, s }) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${s}px ${f}`;
      return ['check', 'remove'].map((name) => ctx.measureText(name).width);
    }, { f: family, s: size });
    for (const advance of advances) expect(advance, 'the ligature is formed (one glyph, about an em)').toBeLessThanOrEqual(size * 1.5);
    // Its ink lies inside the box, at the weight it is drawn at: read from the pixels of the box less its outline, where
    // the fill is the one ground. (The font's default instance, 400, is lighter than the mark and bounds nothing.)
    const outline = await resolveToken(page, T('outline-width'));
    for (const [id, which] of MARKS) {
      const ink = await inkOn(boxOf(page, id), outline, await css(host(page, id).locator(`.${which}`), 'color'));
      expect(ink.area, `${id}: the ${which} is drawn`).toBeGreaterThan(0);
      expect(ink.clear, `${id}: the ${which}'s ink, ${ink.width} × ${ink.height}, keeps clear of the box's outline`).toBeGreaterThan(0);
      expect(Math.max(ink.width, ink.height), id).toBeLessThan(box - 2 * outline);
    }
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`CHK-12: in the ${theme} theme the mark is drawn at comp.checkbox.mark.weight, heavier than sys.icon.weight, which an icon beside the checkbox keeps; the weight changes the stroke only — under a layer that sets the token alone the glyph follows it, and the glyph box, the box and the container measure what they measured`, async ({ page }) => {
      test.setTimeout(90_000);
      await mountFixtures(page, spec, { icons: true, theme, reducedMotion: true });
      const [markWeight, iconWeight] = [Number(await token(page, T('mark-weight'))), Number(await token(page, '--tanrei-sys-icon-weight'))];
      expect(markWeight).toBeGreaterThan(iconWeight);
      expect(markWeight).toBe(Number(await token(page, '--tanrei-sys-icon-mark-weight')));
      // An icon of the icon set beside the checkbox: the system's icon weight, as before.
      await page.addStyleTag({ content: fs.readFileSync(new URL('../../../dist/icons.css', import.meta.url), 'utf8') });
      await page.locator('[data-fixture="selected"]').evaluate((stage) => stage.insertAdjacentHTML('beforeend', '<span id="beside" class="tanrei-icon" aria-hidden="true">check</span>'));
      expect(await weightOf(page.locator('#beside'))).toBe(iconWeight);
      const outline = await resolveToken(page, T('outline-width'));
      /** What is drawn and where: the weight, the ink, and every box the weight must not move. */
      const measure = async () =>
        Promise.all(MARKS.map(async ([id, which]) => {
          const glyph = host(page, id).locator(`.${which}`);
          return {
            weight: await weightOf(glyph),
            ink: await inkOn(boxOf(page, id), outline, await css(glyph, 'color')),
            boxes: { glyph: await bounds(glyph), fontSize: await css(glyph, 'font-size'), box: await bounds(boxOf(page, id)), container: await bounds(container(page, id)), host: await bounds(host(page, id)) },
          };
        }));
      const own = await measure();
      const [size, box] = [await resolveToken(page, T('mark-size')), await resolveToken(page, T('box-size'))];
      // What the mark was drawn at before it had a weight of its own, and a weight heavier than its own.
      await override(page, { [T('mark-weight')]: 'var(--tanrei-sys-icon-weight)' });
      const lighter = await measure();
      await override(page, { [T('mark-weight')]: '700' });
      const heavier = await measure();
      expect(await weightOf(page.locator('#beside')), 'the icon beside it follows no token of the checkbox').toBe(iconWeight);
      for (const [i, [id, which]] of MARKS.entries()) {
        const at = `${theme} ${id} ${which}`;
        expect([lighter[i].weight, own[i].weight, heavier[i].weight], at).toEqual([iconWeight, markWeight, 700]);
        // The stroke grew: the ink a column crosses, and all the ink there is.
        expect(own[i].ink.stroke, `${at}: stroke ${lighter[i].ink.stroke} → ${own[i].ink.stroke}`).toBeGreaterThan(lighter[i].ink.stroke * 1.25);
        expect(own[i].ink.area, `${at}: ink ${lighter[i].ink.area} → ${own[i].ink.area}`).toBeGreaterThan(lighter[i].ink.area * 1.25);
        expect(heavier[i].ink.stroke, at).toBeGreaterThan(own[i].ink.stroke);
        // The glyph box did not: mark.size, where it was, on the same box in the same container.
        expect([own[i].boxes.glyph.width, own[i].boxes.glyph.height, own[i].boxes.box.width], at).toEqual([size, size, box]);
        expect(own[i].boxes.fontSize, at).toBe(`${size}px`);
        expect(lighter[i].boxes, at).toEqual(own[i].boxes);
        expect(heavier[i].boxes, at).toEqual(own[i].boxes);
        // And the ink stays inside the box at each weight.
        for (const m of [lighter[i], own[i], heavier[i]]) expect(m.ink.clear, `${at} at ${m.weight}`).toBeGreaterThan(0);
      }
    });

    for (const system of ['m3-like', 'm3-expressive-like', 'cupertino']) {
      test(`CHK-12 (${system}, ${theme}): a preset pins the mark's weight to its icon weight, and draws what it drew`, async ({ page }) => {
        // A second document, with a preset's faces, after the describe's own: slow on a machine that is busy.
        test.setTimeout(90_000);
        await mountFixtures(page, spec, { system, icons: true, theme, reducedMotion: true });
        const iconWeight = Number(await token(page, '--tanrei-sys-icon-weight'));
        expect(Number(await token(page, T('mark-weight')))).toBe(iconWeight);
        const shots = () => Promise.all(MARKS.map(async ([id]) => decodePng(await host(page, id).screenshot({ animations: 'disabled', scale: 'device' })).data));
        for (const [id, which] of MARKS) expect(await weightOf(host(page, id).locator(`.${which}`)), `${id} ${which}`).toBe(iconWeight);
        const own = await shots();
        // Pixel for pixel what the icon weight draws: the weight every mark had before it had one of its own.
        await override(page, { [T('mark-weight')]: 'var(--tanrei-sys-icon-weight)' });
        const before = await shots();
        for (const [i, [id]] of MARKS.entries()) expect(Buffer.from(own[i]).equals(Buffer.from(before[i])), id).toBe(true);
      });
    }
  }

  test('CHK-12: under acme, whose icon set is static (a family per selection state), the glyph is drawn in the selected family', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const [selected, unselected] = [
      await computedAs(page, 'font-family', 'var(--tanrei-sys-icon-family-selected)'),
      await computedAs(page, 'font-family', 'var(--tanrei-sys-icon-family-unselected)'),
    ];
    expect(selected).not.toBe(unselected);
    for (const id of ['selected', 'indeterminate', 'unselected']) {
      expect(await css(check(page, id), 'font-family'), id).toBe(selected);
      expect(await css(dash(page, id), 'font-family'), id).toBe(selected);
    }
  });

  test('CHK-13: a change of condition fades the glyph over selection-* and grows it from mark-enter-scale over mark-scale-*; the box and outline recolor over selection-*', async ({ page }) => {
    const [selection, scaleDuration, enter] = [
      await resolveToken(page, T('motion-selection-duration'), 'duration'),
      await resolveToken(page, T('motion-mark-scale-duration'), 'duration'),
      Number(await token(page, T('motion-mark-enter-scale'))),
    ];
    // The curves: opacity and color on the effects curve, scale on the spatial one.
    const curves = await check(page, 'unselected').evaluate((el) => {
      const s = getComputedStyle(el);
      const properties = s.transitionProperty.split(', ');
      const easings = s.transitionTimingFunction.split(/,\s*(?![^(]*\))/);
      return Object.fromEntries(properties.map((p, i) => [p, easings[i]]));
    });
    expect(curves.opacity).toBe(await easingOf(page, T('motion-selection-easing')));
    expect(curves.scale).toBe(await easingOf(page, T('motion-mark-scale-easing')));
    // At rest before the change: no check.
    expect((await marks(host(page, 'unselected'))).check).toMatchObject({ opacity: 0, scale: enter });
    const sample = await host(page, 'unselected').evaluate(async (el: any, midway: number) => {
      el.checked = true;
      await el.updateComplete;
      const root = el.shadowRoot as ShadowRoot;
      const box = root.querySelector('.box')!;
      // The box's two layers (CHK-22): its fill (.fill) and its outline (the box's ::before), not the glyphs inside it.
      const fill = root.querySelector('.fill')!;
      const ofBox = box.getAnimations({ subtree: true }).filter((a) => [box, fill].includes((a.effect as KeyframeEffect).target as Element));
      const running = [...root.querySelector('.check')!.getAnimations(), ...ofBox] as CSSTransition[];
      const part = (a: CSSTransition) => ((a.effect as KeyframeEffect).target === fill ? 'box' : (a.effect as KeyframeEffect).target === box ? 'outline' : 'check');
      const durations = Object.fromEntries(running.map((a) => [`${part(a)} ${a.transitionProperty}`, Number(a.effect!.getTiming().duration)]));
      for (const a of running) {
        a.pause();
        a.currentTime = midway;
      }
      const mid = (window as any).marks(el);
      for (const a of running) a.finish();
      return { durations, mid, end: (window as any).marks(el) };
    }, selection / 2);
    expect(sample.durations).toMatchObject({
      'check opacity': selection,
      // A duration token is an expression: the engine's product may differ from the token's in the last bit (350.00000000000006).
      'check scale': expect.closeTo(scaleDuration, 6),
      'check color': selection,
      'box background-color': selection,
      'outline background-color': selection,
    });
    // Midway: part-way faded in and part-way grown about the box's center; after it, whole.
    expect(sample.mid.check.opacity).toBeGreaterThan(0);
    expect(sample.mid.check.opacity).toBeLessThan(1);
    expect(sample.mid.check.scale).toBeGreaterThan(enter);
    expect(sample.mid.check.scale).toBeLessThan(1);
    expect(sample.end.check).toMatchObject({ opacity: 1, scale: 1, running: [] });
    expect(sample.end.box).toBe(await resolveColor(page, T('selected-box-color')));
    // A glyph that goes fades out and shrinks to mark-enter-scale the same way.
    const out = await host(page, 'unselected').evaluate(async (el: any) => {
      el.checked = false;
      await el.updateComplete;
      const m = (window as any).marks(el);
      for (const a of el.shadowRoot.querySelector('.check').getAnimations()) a.finish();
      return { running: m.check.running, end: (window as any).marks(el).check };
    });
    expect(out.running).toEqual(expect.arrayContaining(['opacity', 'scale']));
    expect(out.end).toMatchObject({ opacity: 0, scale: enter });
  });

  test('CHK-13: between checked and indeterminate the check goes as the dash comes; an error change only recolors; neither box nor container moves', async ({ page }) => {
    const enter = Number(await token(page, T('motion-mark-enter-scale')));
    const swap = await host(page, 'selected').evaluate(async (el: any) => {
      const root = el.shadowRoot as ShadowRoot;
      const geometry = () => ['.box', '.container'].map((s) => { const r = root.querySelector(s)!.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      const before = geometry();
      el.indeterminate = true;
      await el.updateComplete;
      const during = (window as any).marks(el);
      const moved = JSON.stringify(geometry()) !== JSON.stringify(before);
      for (const s of ['.check', '.dash', '.box']) for (const a of root.querySelector(s)!.getAnimations({ subtree: true })) a.finish();
      return { during, moved, end: (window as any).marks(el) };
    });
    // At once: both glyphs are in motion in the same frame, one going and one coming.
    expect(swap.during.check.running).toEqual(expect.arrayContaining(['opacity', 'scale']));
    expect(swap.during.dash.running).toEqual(expect.arrayContaining(['opacity', 'scale']));
    expect(swap.end.check).toMatchObject({ opacity: 0, scale: enter });
    expect(swap.end.dash).toMatchObject({ opacity: 1, scale: 1 });
    expect(swap.moved, 'the box and the container keep their size and place').toBe(false);
    // An error change alone recolors: no glyph fades or scales.
    const error = await host(page, 'selected').evaluate(async (el: any) => {
      el.error = true;
      await el.updateComplete;
      return (window as any).marks(el);
    });
    for (const glyph of [error.check, error.dash]) {
      expect(glyph.running).not.toContain('opacity');
      expect(glyph.running).not.toContain('scale');
    }
    expect(error.dash).toMatchObject({ opacity: 1, scale: 1 });
  });

  test('CHK-13: a checkbox drawn for the first time shows its condition at once — mounted checked, the check is whole in its first frame', async ({ page }) => {
    const first = await page.evaluate(async () => {
      const el = document.createElement('tanrei-checkbox') as any;
      el.checked = true;
      el.label = 'Mounted checked';
      document.querySelector('.stage')!.append(el);
      await el.updateComplete;
      await new Promise(requestAnimationFrame);
      return (window as any).marks(el);
    });
    expect(first.check).toEqual({ drawn: true, visible: true, opacity: 1, scale: 1, running: [] });
    expect(first.boxRunning).toBe(0);
  });

  test('CHK-17: where motion is reduced the new condition is drawn whole in the first frame after the change — colors, the new glyph at full size and opacity, the old one gone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const enter = Number(await token(page, T('motion-mark-enter-scale')));
    const step = (change: string) =>
      host(page, 'unselected').evaluate(async (el: any, how: string) => {
        if (how === 'click') el.click();
        else el.indeterminate = true;
        await el.updateComplete;
        await new Promise(requestAnimationFrame);
        return (window as any).marks(el);
      }, change);
    const on = await step('click');
    expect(on.check).toMatchObject({ visible: true, opacity: 1, scale: 1, running: [] });
    expect(on.dash).toMatchObject({ opacity: 0, running: [] });
    expect(on.box).toBe(await resolveColor(page, T('selected-box-color')));
    expect(on.boxRunning).toBe(0);
    const mixed = await step('indeterminate');
    expect(mixed.dash).toMatchObject({ visible: true, opacity: 1, scale: 1, running: [] });
    expect(mixed.check).toMatchObject({ opacity: 0, scale: enter, running: [] });
    expect(mixed.box).toBe(await resolveColor(page, T('indeterminate-box-color')));
    for (const part of [boxOf(page, 'unselected'), check(page, 'unselected'), dash(page, 'unselected'), container(page, 'unselected')]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
    }
  });

  test('CHK-17: a change that arrives under reduced motion while a selection motion still runs ends it in the same frame', async ({ page }) => {
    await override(page, { [T('motion-selection-duration')]: '4000ms', [T('motion-mark-scale-duration')]: '8000ms' });
    const started = await host(page, 'unselected').evaluate(async (el: any) => {
      el.checked = true;
      await el.updateComplete;
      return (window as any).marks(el);
    });
    expect(started.check.running).toEqual(expect.arrayContaining(['opacity', 'scale']));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const after = await host(page, 'unselected').evaluate(async (el: any) => {
      el.indeterminate = true;
      await el.updateComplete;
      await new Promise(requestAnimationFrame);
      return (window as any).marks(el);
    });
    expect(after.check).toMatchObject({ opacity: 0, running: [] });
    expect(after.dash).toMatchObject({ opacity: 1, scale: 1, running: [] });
    expect(after.boxRunning).toBe(0);
    expect(after.box).toBe(await resolveColor(page, T('indeterminate-box-color')));
  });

  test('CHK-18: a change during a change continues from what is drawn, never from the end of the earlier change, and ends on the latest condition alone', async ({ page }) => {
    const enter = Number(await token(page, T('motion-mark-enter-scale')));
    await override(page, {
      [T('motion-selection-duration')]: '4000ms',
      [T('motion-mark-scale-duration')]: '8000ms',
      [T('motion-selection-easing')]: 'linear',
      [T('motion-mark-scale-easing')]: 'linear',
    });
    const [unselectedBox, selectedBox] = [await resolveColor(page, T('unselected-box-color')), await resolveColor(page, T('selected-box-color'))];
    const run = await host(page, 'unselected').evaluate(async (el: any) => {
      const root = el.shadowRoot as ShadowRoot;
      const all = () => ['.check', '.dash', '.box'].flatMap((s) => root.querySelector(s)!.getAnimations({ subtree: true }));
      const holdAt = (ms: number) => { for (const a of all()) { a.pause(); a.currentTime = ms; } };
      el.checked = true;
      await el.updateComplete;
      holdAt(2000); // halfway through the fade, a quarter through the growth
      const mid = (window as any).marks(el);
      el.checked = false; // back, before the first change has ended
      await el.updateComplete;
      holdAt(0);
      const back = (window as any).marks(el);
      el.indeterminate = true; // and on to a third condition
      await el.updateComplete;
      holdAt(0);
      const third = (window as any).marks(el);
      for (const a of all()) a.finish();
      return { mid, back, third, end: (window as any).marks(el) };
    });
    expect(run.mid.check.opacity).toBeCloseTo(0.5, 1);
    expect(run.mid.check.scale).toBeCloseTo(enter + (1 - enter) / 4, 1);
    // The reversal starts from what was drawn: not from opacity 1 and full size, which the first change never reached.
    expect(run.back.check.opacity).toBeCloseTo(run.mid.check.opacity, 2);
    expect(run.back.check.scale).toBeCloseTo(run.mid.check.scale, 2);
    expect(run.back.box).not.toBe(selectedBox);
    expect(run.back.box).not.toBe(unselectedBox);
    // The third condition takes over from there too.
    expect(run.third.check.opacity).toBeCloseTo(run.back.check.opacity, 2);
    expect(run.third.dash.opacity).toBe(0);
    // It ends on the latest condition's colors and glyph alone.
    expect(run.end.dash).toMatchObject({ opacity: 1, scale: 1, running: [] });
    expect(run.end.check).toMatchObject({ opacity: 0, scale: enter, running: [] });
    expect(run.end.box).toBe(await resolveColor(page, T('indeterminate-box-color')));
  });

  test('CHK-19: while the icon set cannot draw the glyph, nothing is drawn in its place — never its name — and the box, its fill, its outline and the state stay', async ({ page }) => {
    await mountFixtures(page, spec);
    await installMarks(page);
    // A family no machine has: the browser would spell "check" in a fallback face.
    await override(page, { '--tanrei-sys-icon-family-selected': '"Tanrei Missing Icons"' });
    for (const id of ['selected', 'indeterminate', 'error-selected', 'disabled-indeterminate']) {
      await expect.poll(async () => (await marks(host(page, id))).check.drawn, id).toBe(false);
      const m = await marks(host(page, id));
      expect(m.check, id).toMatchObject({ drawn: false, visible: false });
      expect(m.dash, id).toMatchObject({ drawn: false, visible: false });
      expect(m.box, id).toBe(await resolveColor(page, T(`${CONDITION[id]}-${id.startsWith('disabled') ? 'disabled-' : ''}box-color`)));
      expect((await drawn(page, id)).outline, id).toBe(await resolveColor(page, T(`${CONDITION[id]}-${id.startsWith('disabled') ? 'disabled-' : ''}outline-color`)));
    }
    // The state is still exposed, and no glyph name is announced.
    expect(await host(page, 'selected').ariaSnapshot()).toBe('- checkbox "Email me updates" [checked]');
    expect(await host(page, 'indeterminate').ariaSnapshot()).toBe('- checkbox "Select all" [checked=mixed]');
  });

  test('CHK-19: once the icon set can draw it, the glyph appears without the selection motion', async ({ page }) => {
    await mountFixtures(page, spec);
    await installMarks(page);
    const family = 'Tanrei Late Icons';
    await override(page, {
      '--tanrei-sys-icon-family-selected': `"${family}"`,
      [T('motion-selection-duration')]: '4000ms',
      [T('motion-mark-scale-duration')]: '8000ms',
    });
    // Switched while the font is missing: the motion starts, unseen.
    const missing = await host(page, 'unselected').evaluate(async (el: any) => {
      el.checked = true;
      await el.updateComplete;
      return (window as any).marks(el);
    });
    expect(missing.check).toMatchObject({ drawn: false, visible: false });
    expect(missing.check.running).toEqual(expect.arrayContaining(['opacity', 'scale']));
    // The font arrives (the default system's icon face, registered under the family the system names).
    const faces = (await presetFontFaces(['Material Symbols Rounded'])).replaceAll('Material Symbols Rounded', family);
    await page.addStyleTag({ content: faces });
    await expect.poll(async () => (await marks(host(page, 'unselected'))).check.drawn).toBe(true);
    // Whole at once: the motion that started while it could not be drawn is not shown.
    expect((await marks(host(page, 'unselected'))).check).toEqual({ drawn: true, visible: true, opacity: 1, scale: 1, running: [] });
  });
});

test.describe('accessibility', () => {
  test('CHK-14: role checkbox with checked, not checked or mixed; invalid while error', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await host(page, 'unselected').ariaSnapshot()).toBe('- checkbox "Email me updates"');
    expect(await host(page, 'selected').ariaSnapshot()).toBe('- checkbox "Email me updates" [checked]');
    expect(await host(page, 'indeterminate').ariaSnapshot()).toBe('- checkbox "Select all" [checked=mixed]');
    await expect(host(page, 'indeterminate').getByRole('checkbox', { checked: 'mixed' as any })).toHaveCount(1);
    await expect(input(page, 'error-selected')).toHaveAttribute('aria-invalid', 'true');
    await expect(input(page, 'selected')).not.toHaveAttribute('aria-invalid');
    expect(await input(page, 'error-unselected').evaluate((el) => (el as HTMLInputElement).matches('[aria-invalid="true"]'))).toBe(true);
    // Everything but the native checkbox is hidden from assistive technology: the name is the label, once.
    await expect(page.getByRole('checkbox', { name: 'Email me updates' })).toHaveCount(4);
  });

  test('CHK-15: the label sits at the inline end of the container, label.gap away, in label.typescale, wrapping rather than truncating, the control centered on its first line; RTL mirrors it', async ({ page }) => {
    await mountFixtures(page, spec);
    const gap = await resolveToken(page, T('label-gap'));
    const [c, l] = [await bounds(container(page, 'unselected')), await bounds(labelOf(page, 'unselected'))];
    expect(l.x - (c.x + c.width)).toBeCloseTo(gap, 5);
    expect(Number.parseFloat(await css(labelOf(page, 'unselected'), 'font-size'))).toBe(await resolveToken(page, T('label-typescale-font-size')));
    expect(await css(labelOf(page, 'unselected'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    // The first line is centered on the container.
    const lineHeight = await labelOf(page, 'unselected').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = range.getClientRects()[0];
      return rect.y + rect.height / 2;
    });
    expect(Math.abs(lineHeight - (c.y + c.height / 2))).toBeLessThanOrEqual(1);
    // Narrow: it wraps onto more lines, all of it shown, the box staying put at the first line.
    await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('.stage')) el.style.inlineSize = '120px'; });
    const lines = await labelOf(page, 'error-unselected').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.y))).size;
    });
    expect(lines).toBeGreaterThan(1);
    expect(await labelOf(page, 'error-unselected').evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    // A line taller than the control: the control moves down to the middle of the label's first line.
    await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('.stage')) el.style.inlineSize = ''; });
    await override(page, { [T('label-typescale-font')]: '400 40px/1.5 Inter' });
    const [tall, first] = [await bounds(container(page, 'unselected')), await labelOf(page, 'unselected').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = range.getClientRects()[0];
      return rect.y + rect.height / 2;
    })];
    expect(Math.abs(tall.y + tall.height / 2 - first)).toBeLessThanOrEqual(1);
    await override(page, { [T('label-typescale-font')]: '' });
    // RTL: the label is at the inline end, which is the left.
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [rc, rl] = [await bounds(container(page, 'unselected')), await bounds(labelOf(page, 'unselected'))];
    expect(rc.x - (rl.x + rl.width)).toBeCloseTo(gap, 5);
  });

  test('CHK-16: label-hidden draws no label and keeps the name; an empty label still renders and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('nameless', {})] });
    await expect(labelOf(page, 'label-hidden')).toHaveCount(0);
    await expect(host(page, 'label-hidden').getByRole('checkbox', { name: 'Select row', checked: true })).toHaveCount(1);
    expect((await bounds(host(page, 'label-hidden'))).width).toBe(await resolveToken(page, T('container-size')));
    const c = await bounds(container(page, 'nameless'));
    expect(c.width).toBe(await resolveToken(page, T('container-size')));
    await expect.poll(() => seen.filter((w) => w.includes('CHK-16'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('CHK-16'))).toMatch(/<tanrei-checkbox>: label is empty/);
    await host(page, 'nameless').evaluate((el) => ((el as any).label = 'Remember me'));
    await expect(host(page, 'nameless').getByRole('checkbox', { name: 'Remember me' })).toHaveCount(1);
    expect(seen.filter((w) => w.includes('CHK-16'))).toHaveLength(1);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('keyboard: Tab moves through the enabled checkboxes in order, Shift+Tab back', async ({ page }) => {
    await mountFixtures(page, spec);
    const enabled = spec.fixtures.filter((f) => !f.props.disabled).map((f) => f.id);
    await tabTo(page, host(page, enabled[0]));
    for (const id of enabled.slice(1)) {
      await tab(page);
      await expect(input(page, id), id).toBeFocused();
    }
    await tab(page, { back: true });
    await expect(input(page, enabled.at(-2)!)).toBeFocused();
  });

  test('forced colors: the box keeps a visible border where the engine has the mode', async ({ page }) => {
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
    expect(await css(boxOf(page, 'unselected'), 'border-top-style')).toBe('solid');
  });

  // The spec's note says the box does not grow with text. On the web every size derives from `dial.size.unit`, which is
  // 0.25rem: the root text size scales the box and its label together.
  test('at 200% text size the label wraps and the name stays; the box stays centered in the container', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const [c, b] = [await bounds(container(page, 'selected')), await bounds(boxOf(page, 'selected'))];
    expect(b.x + b.width / 2).toBeCloseTo(c.x + c.width / 2, 5);
    await expect(host(page, 'selected').getByRole('checkbox', { name: 'Email me updates' })).toHaveCount(1);
  });
});

// CHK-22: what the box paints where its outline and its fill meet, read from the pixels (test/one-shape.ts).
test.describe('one shape', () => {
  // The verify's fixtures: every filled condition, and the one whose colors are translucent (an overlap shows there).
  const FILLED = ['selected', 'indeterminate', 'error-selected', 'disabled-selected'];
  // What a seam shows is up to a quarter of what is behind (64 levels of a channel here); two shares each rounded to
  // 8 bits and then summed may be 2 levels off.
  const TOLERANCE = 3;
  const mount = async (page: P, offset: number) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => FILLED.includes(f.id)) });
    await stageBehind(page, offset);
    // "Outside the glyph": the glyph is taken away, so every pixel of the box can be read, from its edge to its center.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('tanrei-checkbox')) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('.mark { visibility: hidden !important; }');
        el.shadowRoot!.adoptedStyleSheets = [...el.shadowRoot!.adoptedStyleSheets, sheet];
      }
    });
    await page.mouse.move(0, 0);
  };
  /** The two colors the box paints at this moment, and its corner radius (CSS px). */
  const parts = (page: P, id: string) =>
    boxOf(page, id).evaluate((el) => ({
      fill: getComputedStyle(el.querySelector('.fill')!).backgroundColor,
      outline: getComputedStyle(el, '::before').backgroundColor,
      radius: Number.parseFloat(getComputedStyle(el).borderTopLeftRadius),
    }));
  /** The pixel of the box farthest from a mix of its outline's and its fill's colors, each composited once on what is behind. */
  const read = async (page: P, id: string) => {
    const p = await parts(page, id);
    const [outline, fill] = [await paintedBehind(page, p.outline), await paintedBehind(page, p.fill)];
    const shot = await shoot(page);
    return { ...worst(shot, await shot.box(boxOf(page, id)), p.radius * shot.ratio, outline, fill), outline, fill };
  };

  for (const ratio of RATIOS) {
    test(`CHK-22: at a device pixel ratio of ${ratio}, on the pixel grid and half a device pixel off it, every pixel inside a filled box is its one color composited once — no seam between outline and fill, and no overlap`, async ({ browser }) => {
      test.setTimeout(90_000);
      await atRatio(browser, ratio, async (page) => {
        for (const offset of [0, 0.5]) {
          await mount(page, offset);
          for (const id of FILLED) {
            const r = await read(page, id);
            // In the default system a filled condition's outline and fill are one role: one color, evenly.
            expect(r.outline, `${id}: outline and fill alias one role`).toEqual(r.fill);
            expect(r.read, `${id} at +${offset}`).toBeGreaterThan(0);
            expect(r.off, `${id} at +${offset}: ${r.pixel} at ${r.at}, expected ${r.fill}`).toBeLessThanOrEqual(TOLERANCE);
          }
        }
      });
    });
  }

  for (const ratio of [1.25, 1.5]) {
    test(`CHK-22: at a device pixel ratio of ${ratio}, in every frame read of a change of condition, each pixel inside the box is the outline's color, the fill's, or a share of the two — never what is behind`, async ({ browser }) => {
      test.setTimeout(90_000);
      await atRatio(browser, ratio, async (page) => {
        await mount(page, 0.5);
        const el = host(page, 'selected');
        for (const checked of [false, true]) {
          await el.evaluate(async (node: any, value: boolean) => {
            node.checked = value;
            await node.updateComplete;
          }, checked);
          for (const share of [0.2, 0.5, 0.8]) {
            await holdMotionAt(el, share);
            const r = await read(page, 'selected');
            // Mid-motion the two differ (the outline's color leaves or reaches the fill's).
            expect(r.read).toBeGreaterThan(0);
            expect(r.off, `${checked ? 'selecting' : 'unselecting'} at ${share}: ${r.pixel} at ${r.at}, between ${r.outline} and ${r.fill}`).toBeLessThanOrEqual(TOLERANCE);
          }
          await endMotion(el);
        }
      });
    });
  }
});

test.describe('form', () => {
  test('a named checkbox submits its value while checked, resets to its checked attribute, and honours required', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('plain', { label: 'Email me updates', name: 'updates', value: 'weekly', checked: true }), fixture('terms', { label: 'I accept the terms', name: 'terms', required: true })],
    });
    await page.evaluate(() => {
      const form = document.createElement('form');
      const main = document.querySelector('main')!;
      form.append(...main.querySelectorAll('.stage'));
      main.replaceWith(form);
    });
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
    expect(await data()).toEqual(['updates=weekly']);
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(false);
    await host(page, 'terms').click();
    expect(await data()).toEqual(['updates=weekly', 'terms=on']);
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity())).toBe(true);
    await host(page, 'plain').click();
    expect(await data()).toEqual(['terms=on']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    expect(await checked(host(page, 'plain'))).toEqual({ checked: true, indeterminate: false });
    expect(await checked(host(page, 'terms'))).toEqual({ checked: false, indeterminate: false });
    expect(await data()).toEqual(['updates=weekly']);
  });
});

test.describe('in a checkbox group', () => {
  const PAGE = `<form id="f">
      <tanrei-checkbox-group id="g" name="notify" label="Notify me by">
        <tanrei-checkbox id="in" name="own" value="email" label="Email" required></tanrei-checkbox>
        <tanrei-checkbox id="bare" name="bare" label="No value" checked></tanrei-checkbox>
      </tanrei-checkbox-group>
      <tanrei-checkbox id="out" name="out" value="yes" label="Outside"></tanrei-checkbox>
    </form>`;
  async function own(page: P) {
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${fs.readFileSync(new URL('../../../dist/tokens.css', import.meta.url), 'utf8')}</style></head>
      <body>${PAGE}<script type="module">${fs.readFileSync(new URL('../../../dist/tanrei.bundle.js', import.meta.url), 'utf8')}</script></body></html>`);
    await page.waitForFunction(() => !!customElements.get('tanrei-checkbox-group'));
    await settle(page);
    // Every `input` and `change` an element dispatches, heard where it would reach a second listener: on the group, on
    // the form and — capturing — on the document. (The native checkbox's own `input` is the browser's event; it is
    // composed, and passes a capturing listener before any checkbox stops it, in a group or not.)
    await page.evaluate(() => {
      const heard: string[] = [];
      (window as any).heard = heard;
      const from = (event: Event) => (event.target as Element).id;
      for (const name of ['input', 'change']) {
        document.addEventListener(name, (event) => !event.isTrusted && heard.push(`document, capturing: ${name} from ${from(event)}`), true);
        document.querySelector('#g')!.addEventListener(name, (event) => heard.push(`group: ${name} from ${from(event)}`));
        document.querySelector('#f')!.addEventListener(name, (event) => heard.push(`form: ${name} from ${from(event)}`));
        for (const each of document.querySelectorAll('tanrei-checkbox')) each.addEventListener(name, (event) => event.target === each && heard.push(`checkbox: ${name} on ${each.id}`));
      }
    });
  }
  const settle = (page: P) =>
    page.evaluate(async () => {
      for (let round = 0; round < 3; round++) await Promise.all([...document.querySelectorAll('*')].map((el) => (el as any).updateComplete));
    });
  const heard = (page: P) => page.evaluate(() => ((window as any).heard as string[]).splice(0));
  const data = (page: P) => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
  const state = (page: P, id: string) => page.locator(`#${id}`).evaluate((el) => ({ checked: (el as any).checked as boolean, native: el.shadowRoot!.querySelector('input')!.checked, required: el.shadowRoot!.querySelector('input')!.required }));

  test('CHK-23: in a checkbox group it takes checked from the group\'s value and from its own value, submits nothing of its own whatever name it carries, does not read required, and fires no input and no change of its own — the group fires them; a checkbox that carries no value has none there, not "on"; the same checkbox outside a group is as it is anywhere', async ({ page }) => {
    await own(page);
    // Checked from the group: the list is empty, so neither is — though one says checked itself, having no value to stand for.
    expect(await state(page, 'in')).toEqual({ checked: false, native: false, required: false });
    expect(await state(page, 'bare')).toEqual({ checked: false, native: false, required: false });
    expect(await data(page)).toEqual([]);
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity()), 'required is not read in a group').toBe(true);
    // Switched by the person: the group's entry, the group's events, and none of the checkbox's.
    await page.locator('#in').click();
    expect(await state(page, 'in')).toMatchObject({ checked: true, native: true });
    expect(await data(page)).toEqual(['notify=email']);
    expect(await heard(page)).toEqual(['document, capturing: input from g', 'group: input from g', 'form: input from g', 'document, capturing: change from g', 'group: change from g', 'form: change from g']);
    // The group's value sets it.
    await page.locator('#g').evaluate((el) => ((el as any).value = []));
    await settle(page);
    expect(await state(page, 'in')).toMatchObject({ checked: false, native: false });
    // No value: a press changes nothing, and "on" is no entry.
    await page.locator('#bare').click();
    await settle(page);
    expect(await state(page, 'bare')).toMatchObject({ checked: false, native: false });
    expect(await data(page)).toEqual([]);
    expect(await heard(page)).toEqual([]);
    // Outside a group: checked is its own, change is its own, and it submits its own entry under its own name.
    await page.locator('#out').click();
    expect(await state(page, 'out')).toMatchObject({ checked: true, native: true });
    expect(await data(page)).toEqual(['out=yes']);
    expect(await heard(page)).toEqual(['document, capturing: input from out', 'checkbox: input on out', 'form: input from out', 'document, capturing: change from out', 'checkbox: change on out', 'form: change from out']);
  });

  test('CHK-23: a checkbox taken out of a checkbox group submits its own entry and fires its own change again, and one put into a group at run time is the group\'s from then on — each side cleanly', async ({ page }) => {
    await own(page);
    await page.locator('#in').click();
    await heard(page);
    expect(await data(page)).toEqual(['notify=email']);
    // Out of the group: it keeps what it showed, as its own; the group keeps its entry (CKG-10).
    await page.evaluate(() => document.querySelector('#f')!.append(document.querySelector('#in')!));
    await settle(page);
    expect(await state(page, 'in')).toEqual({ checked: true, native: true, required: true });
    expect(await data(page)).toEqual(['notify=email', 'own=email']);
    await page.locator('#in').click();
    expect(await heard(page)).toEqual(['document, capturing: input from in', 'checkbox: input on in', 'form: input from in', 'document, capturing: change from in', 'checkbox: change on in', 'form: change from in']);
    expect(await data(page)).toEqual(['notify=email']);
    expect(await page.evaluate(() => document.querySelector('form')!.checkValidity()), 'required is its own again').toBe(false);
    await page.locator('#in').click();
    expect(await data(page)).toEqual(['notify=email', 'own=email']);
    await heard(page);
    // Into the group: the one from outside, checked by the person before. The markup is still the group's first value,
    // so a checkbox that arrives checked adds its value (CKG-3) — and it is the group's from then on: no entry of its
    // own, no event of its own.
    await page.locator('#out').click();
    expect(await data(page)).toEqual(['notify=email', 'out=yes', 'own=email']);
    await heard(page);
    await page.evaluate(() => document.querySelector('#g')!.append(document.querySelector('#out')!));
    await settle(page);
    expect(await data(page)).toEqual(['notify=yes', 'notify=email', 'own=email']);
    expect(await state(page, 'out')).toMatchObject({ checked: true, native: true });
    expect(await heard(page), 'arriving emits nothing').toEqual([]);
    await page.locator('#out').click();
    expect(await heard(page)).toEqual(['document, capturing: input from g', 'group: input from g', 'form: input from g', 'document, capturing: change from g', 'group: change from g', 'form: change from g']);
    expect(await data(page)).toEqual(['notify=email', 'own=email']);
    await page.locator('#out').click();
    await heard(page);
    // And back in: the first one is the group's again, checked by the entry the group kept.
    await page.evaluate(() => document.querySelector('#g')!.prepend(document.querySelector('#in')!));
    await settle(page);
    expect(await data(page)).toEqual(['notify=email', 'notify=yes']);
    expect(await state(page, 'in')).toEqual({ checked: true, native: true, required: false });
    // Where the product has set the group's value, the value decides: a checkbox that arrives checked is shown as it says.
    await page.evaluate(() => {
      const group = document.querySelector('#g') as any;
      const out = document.querySelector('#out')!;
      document.querySelector('#f')!.append(out);
      group.value = ['email'];
    });
    await settle(page);
    expect(await state(page, 'out'), 'outside again, checked is its own').toMatchObject({ checked: true, native: true });
    expect(await data(page)).toEqual(['notify=email', 'out=yes']);
    await page.evaluate(() => document.querySelector('#g')!.append(document.querySelector('#out')!));
    await settle(page);
    expect(await state(page, 'out')).toMatchObject({ checked: false, native: false });
    expect(await data(page)).toEqual(['notify=email']);
    // A form reset is the group's: back to what the markup says, and nothing of a checkbox's own.
    await page.evaluate(() => document.querySelector('form')!.reset());
    await settle(page);
    expect(await data(page)).toEqual([]);
    expect(await heard(page)).toEqual([]);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.mouse.move(0, 0);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
