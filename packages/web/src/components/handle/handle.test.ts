// <tanrei-handle>, driven by specs/handle.spec.json: every behaviour id (HDL-1…25) is cited by a test title, every
// fixture has a baseline, and every value is read back from the tokens.
// HDL-26: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { bounds, css, override, warnings } from '../../../test/destinations.js';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, tab, tabTo } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('handle');
type P = Page;
const T = (name: string) => `--tanrei-comp-handle-${name}`;
const fixtureOf = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Resize message', ...props }, ...extra });

const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-handle`);
const box = (page: P, id: string) => host(page, id).locator('.container');
const capsule = (page: P, id: string) => host(page, id).locator('.capsule');
const arc = (page: P, id: string) => host(page, id).locator('.arc');
const circle = (page: P, id: string) => host(page, id).locator('.arc circle');
const owner = (page: P, id: string) => page.locator(`[data-fixture="${id}"] .owner`);
const px = (page: P, name: string) => resolveToken(page, name);
const ms = (page: P, name: string) => resolveToken(page, name, 'duration');
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);
const opacity = async (locator: Locator) => Number(await css(locator, 'opacity'));
const centreOf = async (locator: Locator) => {
  const b = await bounds(locator);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function mount(page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) {
  await mountFixtures(page, spec, { fixtures, ...options });
}

/** Every event the handles of the page emit, in order, with its detail. */
const listen = (page: P) =>
  page.evaluate(() => {
    const log: string[] = ((window as any).log = []);
    for (const el of document.querySelectorAll('tanrei-handle')) {
      for (const type of ['resizestart', 'resize', 'resizeend', 'step', 'activate']) {
        el.addEventListener(type, (e) => log.push(`${type}${(e as CustomEvent).detail === null || (e as CustomEvent).detail === undefined ? '' : ` ${JSON.stringify((e as CustomEvent).detail)}`}`));
      }
    }
  });
const log = (page: P): Promise<string[]> => page.evaluate(() => (window as any).log);
const clear = (page: P) => page.evaluate(() => ((window as any).log.length = 0));

/** The pointer is taken off every handle: to the page's top corner, which no stage covers. */
const away = (page: P) => page.mouse.move(1, 1);

test.describe('the drawing', () => {
  test('HDL-1: one axis is a capsule with round ends, line.length × line.thickness of its size, across the axis it resizes, centred in its box, in the resting line color', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('horizontal'), fixtureOf('small'), fixtureOf('small-horizontal')]);
    for (const [id, size, upright] of [['revealed', 'medium', false], ['horizontal', 'medium', true], ['small', 'small', false], ['small-horizontal', 'small', true]] as const) {
      const [len, thk] = await Promise.all([px(page, T(`line-length-${size}`)), px(page, T(`line-thickness-${size}`))]);
      const line = await bounds(capsule(page, id));
      expect([line.width, line.height], id).toEqual(upright ? [thk, len] : [len, thk]);
      const b = await bounds(box(page, id));
      expect(line.x + line.width / 2, id).toBeCloseTo(b.x + b.width / 2, 1);
      expect(line.y + line.height / 2, id).toBeCloseTo(b.y + b.height / 2, 1);
      expect(Number.parseFloat(await css(capsule(page, id), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(thk / 2);
      await expect(capsule(page, id)).toHaveCSS('background-color', await resolveColor(page, T('standard-line-color')));
      await expect(host(page, id).locator('svg')).toHaveCount(0);
    }
  });

  test('HDL-2: two axes are a quarter-circle arc of arc.radius, line.thickness thick with round ends, bowed toward its corner, its centre arc.radius plus inset in from both of its edges', async ({ page }) => {
    const ids = ['both-bottom-end', 'both-bottom-start', 'both-top-end', 'both-top-start', 'small-both'];
    await mount(page, ids.map(fixtureOf));
    const inset = await px(page, T('inset'));
    for (const id of ids) {
      const size = id === 'small-both' ? 'small' : 'medium';
      const [r, thk] = await Promise.all([px(page, T(`arc-radius-${size}`)), px(page, T(`line-thickness-${size}`))]);
      await expect(circle(page, id)).toHaveCSS('r', `${r}px`);
      await expect(circle(page, id)).toHaveCSS('stroke-width', `${thk}px`);
      await expect(circle(page, id)).toHaveCSS('stroke-linecap', 'round');
      await expect(circle(page, id)).toHaveCSS('stroke', await resolveColor(page, T('standard-line-color')));
      // A quarter of the circle is drawn: the dash is a quarter of its length.
      const dash = Number.parseFloat((await css(circle(page, id), 'stroke-dasharray')).split(/[ ,]+/)[0]!);
      expect(dash, id).toBeCloseTo((Math.PI * r) / 2, 1);
      // The centre (the middle of the whole circle as drawn) stands arc.radius + inset in from the corner's two edges.
      const c = await centreOf(circle(page, id));
      const b = await bounds(box(page, id));
      const corner = id === 'small-both' ? 'bottom-end' : id.slice('both-'.length);
      const [vertical, horizontal] = corner.split('-');
      expect(vertical === 'bottom' ? b.y + b.height - c.y : c.y - b.y, `${id} from its ${vertical} edge`).toBeCloseTo(r + inset, 1);
      expect(horizontal === 'end' ? b.x + b.width - c.x : c.x - b.x, `${id} from its ${horizontal} edge`).toBeCloseTo(r + inset, 1);
      // Bowed toward the corner: the drawn quarter lies between the centre and the corner.
      const drawn = await host(page, id).evaluate((el) => {
        const svg = el.shadowRoot!.querySelector('svg')!;
        const ring = svg.querySelector('circle')!;
        const length = ring.getTotalLength();
        const matrix = (ring.getScreenCTM?.() ?? svg.getScreenCTM())!;
        return [0.05, 0.5, 0.95].map((at) => {
          const p = ring.getPointAtLength(length * 0.25 * at).matrixTransform(matrix);
          return { x: p.x, y: p.y };
        });
      });
      for (const p of drawn) {
        expect(vertical === 'bottom' ? p.y >= c.y - 0.5 : p.y <= c.y + 0.5, `${id}: the arc bows toward its ${vertical} edge`).toBe(true);
        expect(horizontal === 'end' ? p.x >= c.x - 0.5 : p.x <= c.x + 0.5, `${id}: the arc bows toward its ${horizontal} edge`).toBe(true);
      }
      // The arc shares its centre with the stage's corner, whose radius is arc.radius + inset (HDL-2's concentric corner).
      expect(Number.parseFloat(await css(owner(page, id), 'border-top-left-radius')), id).toBeCloseTo(r + inset, 1);
      await expect(host(page, id).locator('.capsule')).toHaveCount(0);
    }
  });

  test('HDL-3: the box is container.length × container.breadth across the line, turned for a width, a square of container.breadth for an arc; its corners are container.shape, it is clear at rest and raises nothing', async ({ page }) => {
    await mount(page, ['revealed', 'horizontal', 'both-bottom-end', 'small', 'small-both'].map(fixtureOf));
    for (const [id, size, form] of [['revealed', 'medium', 'across'], ['horizontal', 'medium', 'upright'], ['both-bottom-end', 'medium', 'square'], ['small', 'small', 'across'], ['small-both', 'small', 'square']] as const) {
      const [len, br] = await Promise.all([px(page, T(`container-length-${size}`)), px(page, T(`container-breadth-${size}`))]);
      const b = await bounds(box(page, id));
      expect([b.width, b.height], id).toEqual(form === 'across' ? [len, br] : form === 'upright' ? [br, len] : [br, br]);
      // The host takes no room but its box's.
      const h = await bounds(host(page, id));
      expect([h.width, h.height], id).toEqual([b.width, b.height]);
      expect(Number.parseFloat(await css(box(page, id), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(Math.min(b.width, b.height) / 2);
    }
    await away(page);
    await expect(box(page, 'revealed')).toHaveCSS('background-color', await resolveColor(page, T('standard-container-color')));
    expect(await resolveColor(page, T('standard-container-color'))).toBe('rgba(0, 0, 0, 0)');
    await expect(box(page, 'revealed')).toHaveCSS('box-shadow', 'none');
  });

  test('HDL-19: enlarged text leaves the line, the box and the target at the sizes of their size', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('both-bottom-end')]);
    const before = await Promise.all(['revealed', 'both-bottom-end'].map(async (id) => [await bounds(box(page, id)), await bounds(host(page, id).locator('.capsule, .arc circle'))]));
    const target = () => box(page, 'revealed').evaluate((el) => getComputedStyle(el, '::before').width);
    const targetBefore = await target();
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--tanrei-dial-type-base').trim())).toBe('32px');
    const after = await Promise.all(['revealed', 'both-bottom-end'].map(async (id) => [await bounds(box(page, id)), await bounds(host(page, id).locator('.capsule, .arc circle'))]));
    expect(after).toEqual(before);
    expect(await target()).toBe(targetBefore);
  });
});

test.describe('states', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await acmeSystemCss();
  });

  test('HDL-4: a mouse over it and a press draw the line active-length long and active-thickness thick, grown about its centre (the arc only thicker), in the state’s line and box colors, pressed over focused over hovered; a press takes no focus', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('both-bottom-end')]);
    const [len, thk, lenA, thkA] = await Promise.all(['line-length-medium', 'line-thickness-medium', 'line-active-length-medium', 'line-active-thickness-medium'].map((n) => px(page, T(n))));
    expect(lenA).toBeGreaterThan(len);
    expect(thkA).toBeGreaterThan(thk);
    const drawn = (id: string) =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const container = root.querySelector('.container')!;
        const line = root.querySelector('.capsule') ?? root.querySelector('circle')!;
        const style = getComputedStyle(line);
        const r = line.getBoundingClientRect();
        return { box: getComputedStyle(container).backgroundColor, line: line.localName === 'circle' ? style.stroke : style.backgroundColor, w: r.width, h: r.height, stroke: style.strokeWidth, cx: r.x + r.width / 2 };
      });
    const colors = async (state = '') => ({ box: await resolveColor(page, T(`standard-${state ? `${state}-` : ''}container-color`)), line: await resolveColor(page, T(`standard-${state ? `${state}-` : ''}line-color`)) });
    await away(page);
    const rest = await drawn('revealed');
    expect(rest).toMatchObject({ ...(await colors()), w: len, h: thk });
    await box(page, 'revealed').hover();
    await expect.poll(() => drawn('revealed')).toMatchObject({ ...(await colors('hovered')), w: lenA, h: thkA });
    expect((await drawn('revealed')).cx).toBeCloseTo(rest.cx, 1);
    await page.mouse.down();
    await expect.poll(() => drawn('revealed')).toMatchObject({ ...(await colors('pressed')), w: lenA, h: thkA });
    await page.mouse.up();
    // The press took no focus.
    await expect(box(page, 'revealed')).not.toBeFocused();
    await away(page);
    await expect.poll(() => drawn('revealed')).toMatchObject({ ...(await colors()), w: len, h: thk });
    // The arc grows thicker at the same radius.
    const r = await css(circle(page, 'both-bottom-end'), 'r');
    await box(page, 'both-bottom-end').hover();
    await expect.poll(async () => (await drawn('both-bottom-end')).stroke).toBe(`${thkA}px`);
    expect(await css(circle(page, 'both-bottom-end'), 'r')).toBe(r);
    // Keyboard focus is the focused state, at the resting length.
    await away(page);
    await tabTo(page, box(page, 'revealed'));
    await expect.poll(() => drawn('revealed')).toMatchObject({ ...(await colors('focused')), w: len, h: thk });

    // Under acme the three states differ: pressed beats focused beats hovered.
    await mount(page, [fixtureOf('revealed')], { system: 'acme', systemCss: await acmeSystemCss() });
    const bg = () => css(box(page, 'revealed'), 'background-color');
    const [r0, h, f, p] = await Promise.all(['', 'hovered-', 'focused-', 'pressed-'].map((s) => resolveColor(page, T(`standard-${s}container-color`))));
    expect(new Set([r0, h, f, p]).size).toBe(4);
    await away(page);
    await expect.poll(bg).toBe(r0);
    await box(page, 'revealed').hover();
    await expect.poll(bg).toBe(h);
    await tabTo(page, box(page, 'revealed'));
    await expect.poll(bg).toBe(f);
    await page.keyboard.down('Space');
    await expect.poll(bg).toBe(p);
    await page.keyboard.up('Space');
  });

  test('HDL-4: the line’s length, thickness and colors and the box’s color move over motion.state-duration with motion.state-easing, and at once where motion is reduced', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('both-bottom-end')]);
    const [duration, curve] = await Promise.all([ms(page, T('motion-state-duration')), easing(page, T('motion-state-easing'))]);
    await away(page);
    await watchTransitions(host(page, 'revealed'));
    await box(page, 'revealed').hover();
    // A logical size moves under its physical name in a horizontal writing mode (Chromium names it so).
    const physical = (property: string) => ({ 'inline-size': 'width', 'block-size': 'height' })[property] ?? property;
    await expect.poll(async () => (await transitionsRun(host(page, 'revealed'))).map((run) => physical(run.property))).toEqual(expect.arrayContaining(['background-color', 'height', 'width']));
    for (const run of await transitionsRun(host(page, 'revealed'))) {
      expect(run.duration, run.property).toBe(duration);
      expect(run.easing, run.property).toBe(curve);
    }
    await away(page);
    await watchTransitions(host(page, 'both-bottom-end'));
    await box(page, 'both-bottom-end').hover();
    await expect.poll(async () => (await transitionsRun(host(page, 'both-bottom-end'))).map((run) => run.property)).toEqual(expect.arrayContaining(['stroke-width']));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const part of [box(page, 'revealed'), capsule(page, 'revealed'), circle(page, 'both-bottom-end'), arc(page, 'both-bottom-end')]) await expect(part).toHaveCSS('transition-duration', '0s');
  });

  test('HDL-11: a press that ends within a frame — Enter, Space, a click — is shown at once and for at least press-hold, and a drag keeps it for as long as it lasts', async ({ page }) => {
    // A drag (first, on a page whose clock the presses below have not held): pressed from the press to the release, wherever the pointer goes.
    await mount(page, [fixtureOf('revealed')]);
    const at = await centreOf(box(page, 'revealed'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 120, at.y + 200, { steps: 4 });
    await expect(box(page, 'revealed')).toHaveAttribute('data-pressed', 'overlay');
    await page.mouse.up();
    await expect.poll(() => box(page, 'revealed').getAttribute('data-pressed')).toBeNull();
    for (const [name, id, activate] of [
      ['Enter on a separator', 'horizontal', () => page.keyboard.press('Enter')],
      ['Space on a button', 'revealed', () => page.keyboard.press('Space')],
      ['a click', 'revealed', () => clickCentre(page, box(page, 'revealed'))],
    ] as const) {
      await mount(page, [fixtureOf(id)]);
      const hold = await ms(page, '--tanrei-sys-motion-duration-press-hold');
      await box(page, id).evaluate((el: HTMLElement) => el.focus());
      await box(page, id).evaluate((el) => {
        const l: { down?: number; on?: number; off?: number; up?: number } = ((window as any).press = {});
        new MutationObserver(() => {
          if (el.hasAttribute('data-pressed')) l.on ??= performance.now();
          else if (l.on !== undefined) l.off ??= performance.now();
        }).observe(el, { attributes: true, attributeFilter: ['data-pressed'] });
        for (const type of ['pointerup', 'keyup']) window.addEventListener(type, () => (l.up ??= performance.now()), true);
        for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (l.down ??= performance.now()), true);
      });
      await heldPress(page, hold, activate, async () => (await page.evaluate(() => (window as any).press.off)) !== undefined, name);
      const logged = await page.evaluate(() => (window as any).press);
      expect(logged.up - logged.on, name).toBeLessThan(hold);
      expect(logged.off - logged.down, name).toBeGreaterThanOrEqual(hold - 1);
    }
  });

  test('HDL-12: overlay (default), ripple (m3-like), dim (cupertino) and none each answer the press; an unknown name is the first', async ({ page }) => {
    const press = async (system?: string, feedback?: string) => {
      await mount(page, [fixtureOf('revealed')], system ? { system } : {});
      if (feedback) await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback });
      await override(page, { [T('standard-pressed-line-color')]: 'rgb(0, 0, 255)' });
      const b = box(page, 'revealed');
      await b.hover();
      await expect.poll(() => css(b, 'background-color')).toBe(await resolveColor(page, T('standard-hovered-container-color')));
      await motionEnded(b);
      const hovered = await css(b, 'background-color');
      await page.mouse.down();
      const result = { pressed: await b.getAttribute('data-pressed'), bg: await css(b, 'background-color'), hovered, line: await css(capsule(page, 'revealed'), 'background-color'), ripple: await b.locator('.ripple').count(), opacity: await css(b, 'opacity') };
      await page.mouse.up();
      return result;
    };
    const overlay = await press();
    expect(overlay).toMatchObject({ pressed: 'overlay', ripple: 0, line: 'rgb(0, 0, 255)' });
    expect(overlay.bg).toBe(await resolveColor(page, T('standard-pressed-container-color')));
    const ripple = await press('m3-like');
    expect(ripple).toMatchObject({ pressed: 'ripple', ripple: 1, line: 'rgb(0, 0, 255)' });
    expect(ripple.bg).toBe(ripple.hovered);
    const dim = await press('cupertino');
    expect(dim).toMatchObject({ pressed: 'dim', ripple: 0, line: 'rgb(0, 0, 255)' });
    expect(dim.opacity).toBe(await token(page, T('pressed-opacity')));
    const none = await press(undefined, 'none');
    expect(none).toMatchObject({ pressed: 'none', ripple: 0 });
    expect(none.bg).toBe(none.hovered);
    expect((await press(undefined, 'sparkle')).pressed).toBe('overlay');
  });

  test('HDL-12: under ripple a keyboard press grows the layer from the centre over feedback-duration, and it fades over state-duration', async ({ page }) => {
    // A page of its own: in WebKit a document written (setContent) over one whose last press refused its mousedown has
    // no focus (document.hasFocus() is false) and Tab stays on the body. A real page is not written over.
    await mount(page, [fixtureOf('horizontal')], { system: 'm3-like' });
    await away(page);
    await tabTo(page, box(page, 'horizontal'));
    await page.keyboard.down('Enter');
    const layer = await box(page, 'horizontal')
      .locator('.ripple')
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { y: Number.parseFloat(el.style.getPropertyValue('--_y')) / el.getBoundingClientRect().height, grow: Number.parseFloat(s.animationDuration) * 1000, fade: Number.parseFloat(s.transitionDuration) * 1000 };
      });
    await page.keyboard.up('Enter');
    expect(layer.y).toBeCloseTo(0.5, 5);
    expect(layer.grow).toBe(await ms(page, T('motion-feedback-duration')));
    expect(layer.fade).toBe(await ms(page, T('motion-state-duration')));
  });

  test('HDL-13 corner smoothing and focus-style: the box is eased by the corner rule (a pill stays round); acme shows its focus as a glow', async ({ page }) => {
    await mount(page, [fixtureOf('revealed')], { system: 'cupertino' });
    await expect(box(page, 'revealed')).toHaveAttribute('data-tanrei-shape', '');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) expect(await css(box(page, 'revealed'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\))$/);
    await mount(page, [fixtureOf('revealed')], { system: 'acme', systemCss: await acmeSystemCss() });
    expect(await token(page, '--tanrei-sys-behavior-focus-style')).toBe('glow');
    await override(page, { '--tanrei-sys-focus-inner-width': '1px', '--tanrei-sys-color-focus-ring-inner': 'rgb(255, 255, 255)' });
    const outer = await px(page, '--tanrei-sys-focus-outer-width');
    await tabTo(page, box(page, 'revealed'));
    expect(await css(box(page, 'revealed'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(box(page, 'revealed'), 'box-shadow', '::after')).toBe(`rgb(255, 255, 255) 0px 0px 1px 1px, ${await resolveColor(page, '--tanrei-sys-color-focus-ring')} 0px 0px ${outer}px ${outer + 1}px`);
    await expect(box(page, 'revealed')).toHaveAttribute('data-focus-style', 'glow');
  });

  test('HDL-14: keyboard focus shows the ring around the box, sys.focus.offset outside it, without animation; a pointer press does not', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('horizontal')]);
    const [outerW, offset, inner] = await Promise.all(['--tanrei-sys-focus-outer-width', '--tanrei-sys-focus-offset', '--tanrei-sys-focus-inner-width'].map((n) => px(page, n)));
    await clickCentre(page, box(page, 'horizontal'));
    await expect(box(page, 'horizontal')).toHaveCSS('outline-style', 'none');
    await away(page);
    for (const id of ['revealed', 'horizontal']) {
      await tabTo(page, box(page, id));
      await expect(box(page, id)).toHaveCSS('outline-style', 'solid');
      await expect(box(page, id)).toHaveCSS('outline-width', `${outerW}px`);
      await expect(box(page, id)).toHaveCSS('outline-offset', `${offset + inner}px`);
      expect(await css(box(page, id), 'transition-property')).not.toContain('outline');
    }
  });

  test('HDL-15: disabled draws from the disabled tokens, takes no focus, no press and no drag, emits nothing, shows no resize cursor and is exposed as disabled', async ({ page }) => {
    await mount(page, [fixtureOf('disabled'), fx('button', { disabled: true, revealed: true }), fx('after', { value: 1, revealed: true })]);
    await listen(page);
    await expect(capsule(page, 'disabled')).toHaveCSS('background-color', await resolveColor(page, T('standard-disabled-line-color')));
    await expect(box(page, 'disabled')).toHaveCSS('background-color', await resolveColor(page, T('standard-disabled-container-color')));
    await expect(box(page, 'disabled')).toHaveCSS('cursor', 'default');
    await expect(page.getByRole('separator', { name: 'Resize preview' })).toHaveAttribute('aria-disabled', 'true');
    await expect(host(page, 'button').getByRole('button')).toBeDisabled();
    await expect(box(page, 'disabled')).not.toHaveAttribute('tabindex');
    // Tab passes over both to the next handle.
    await tabTo(page, box(page, 'after'));
    await tab(page, { back: true });
    for (const id of ['disabled', 'button']) await expect(box(page, id)).not.toBeFocused();
    for (const id of ['disabled', 'button']) {
      const at = await centreOf(box(page, id));
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x + 40, at.y + 40, { steps: 3 });
      await page.mouse.up();
      await page.mouse.click(at.x, at.y);
      await expect(box(page, id)).not.toHaveAttribute('data-pressed');
      // No hover state either: the line keeps its disabled color under the pointer.
      await page.mouse.move(at.x, at.y);
      await expect(capsule(page, id)).toHaveCSS('background-color', await resolveColor(page, T('standard-disabled-line-color')));
    }
    expect(await log(page)).toEqual([]);
  });

  test('HDL-16: under forced colors the line is ButtonText, Highlight under a mouse and a press, GrayText while disabled; the box draws no fill; focus is in Highlight', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('both-bottom-end'), fixtureOf('disabled')], { reducedMotion: true });
    await page.emulateMedia({ forcedColors: 'active' });
    test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), 'forced colors are not emulated by this browser');
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.cssText = `forced-color-adjust: none; color: ${n}`;
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [text, highlight, gray] = await Promise.all(['ButtonText', 'Highlight', 'GrayText'].map(system));
    await away(page);
    await expect(capsule(page, 'revealed')).toHaveCSS('background-color', text);
    await expect(circle(page, 'both-bottom-end')).toHaveCSS('stroke', text);
    await expect(capsule(page, 'disabled')).toHaveCSS('background-color', gray);
    await box(page, 'revealed').hover();
    await expect(capsule(page, 'revealed')).toHaveCSS('background-color', highlight);
    // Forced colors keep a color's alpha: the box's fill stays fully transparent.
    expect(await css(box(page, 'revealed'), 'background-color')).toMatch(/^rgba\(\d+, \d+, \d+, 0\)$/);
    await page.mouse.down();
    await expect(capsule(page, 'revealed')).toHaveCSS('background-color', highlight);
    await page.mouse.up();
    await away(page);
    await tabTo(page, box(page, 'both-bottom-end'));
    await expect(box(page, 'both-bottom-end')).toHaveCSS('outline-color', highlight);
  });
});

test.describe('target and cursor', () => {
  test('HDL-5: the target reaches sys.target.pointer for a fine pointer, centred on the box, without changing what is drawn; the resize cursor is the axis’s, diagonal through the corner for an arc', async ({ page }) => {
    const ids = ['revealed', 'horizontal', 'small', 'both-bottom-end', 'both-bottom-start', 'both-top-end', 'both-top-start'];
    await mount(page, ids.map(fixtureOf));
    const pointer = await px(page, '--tanrei-sys-target-pointer');
    for (const id of ids) {
      await box(page, id).scrollIntoViewIfNeeded();
      const b = await bounds(box(page, id));
      const before = (p: string) => box(page, id).evaluate((el, q) => Number.parseFloat(getComputedStyle(el, '::before').getPropertyValue(q)), p);
      expect(await before('width'), id).toBe(Math.max(b.width, pointer));
      expect(await before('height'), id).toBe(Math.max(b.height, pointer));
      // A point inside the target and outside the drawn box is the handle's.
      const hit = await host(page, id).evaluate((el, [x, y]) => !!el.shadowRoot!.elementFromPoint(x, y)?.closest('.container'), [b.x + b.width / 2, b.y + b.height / 2 - pointer / 2 + 1]);
      expect(hit, id).toBe(true);
    }
    const cursors = { revealed: 'ns-resize', horizontal: 'ew-resize', small: 'ns-resize', 'both-bottom-end': 'nwse-resize', 'both-bottom-start': 'nesw-resize', 'both-top-end': 'nesw-resize', 'both-top-start': 'nwse-resize' } as const;
    for (const [id, cursor] of Object.entries(cursors)) await expect(box(page, id), id).toHaveCSS('cursor', cursor);
  });

  test('HDL-5: a coarse pointer’s target reaches sys.target.touch', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium emulates a touch device whose primary pointer is coarse');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 400, height: 700 } });
    const page = await context.newPage();
    await mount(page, [fixtureOf('small')]);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const touch = await px(page, '--tanrei-sys-target-touch');
    expect(await box(page, 'small').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))).toBe(touch);
    expect(await box(page, 'small').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').width))).toBe(touch);
    await context.close();
  });
});

test.describe('the drag', () => {
  test('HDL-6: a press that moves past the touch slop emits resizestart once, resize with the distance from the press as it moves — past the window’s edge too — and resizeend once; it changes no size, selects no text and takes no focus', async ({ page, browserName }) => {
    await mount(page, [fixtureOf('both-bottom-end'), fx('field', { value: 1, revealed: true })], { lead: '<p id="text">Some text before the handles</p><input id="input" aria-label="Field" />' });
    await listen(page);
    await page.locator('#input').focus();
    const before = await bounds(owner(page, 'both-bottom-end'));
    const at = await centreOf(box(page, 'both-bottom-end'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    // Within the slop: nothing yet.
    await page.mouse.move(at.x + 3, at.y + 3);
    expect(await log(page)).toEqual([]);
    await page.mouse.move(at.x + 30, at.y + 20);
    await page.mouse.move(at.x - 15, at.y + 50);
    // Past the window's edge: the press is still the handle's. (Firefox's driver sends no pointer outside the viewport:
    // there the drag goes to the window's last pixel.)
    const viewport = page.viewportSize()!;
    const edge = browserName === 'firefox' ? { x: viewport.width - 1, y: viewport.height - 1 } : { x: viewport.width + 50, y: viewport.height + 60 };
    await page.mouse.move(edge.x, edge.y);
    await page.mouse.up();
    const seen = await log(page);
    expect(seen.slice(0, 3)).toEqual(['resizestart {"pointerType":"mouse"}', 'resize {"inline":30,"block":20}', 'resize {"inline":-15,"block":50}']);
    expect(seen).toHaveLength(5);
    const [last, end] = [seen[3]!, seen[4]!].map((entry) => JSON.parse(entry.slice(entry.indexOf(' ') + 1)));
    expect(seen[3]!.startsWith('resize ') && seen[4]!.startsWith('resizeend ')).toBe(true);
    for (const reported of [last, end]) {
      expect(reported.inline).toBeCloseTo(edge.x - at.x, 0);
      expect(reported.block).toBeCloseTo(edge.y - at.y, 0);
    }
    expect(end.cancelled).toBe(false);
    expect(await bounds(owner(page, 'both-bottom-end'))).toEqual(before);
    expect(await page.evaluate(() => String(getSelection()))).toBe('');
    await expect(page.locator('#input')).toBeFocused();
  });

  test('HDL-6: a press the platform cancels ends the drag once, with cancelled; a handle taken out of the page mid-drag ends it too', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('horizontal')]);
    await listen(page);
    await box(page, 'revealed').evaluate((el) => el.addEventListener('pointerdown', (e) => ((window as any).pointer = (e as PointerEvent).pointerId)));
    const at = await centreOf(box(page, 'revealed'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y + 40);
    await box(page, 'revealed').evaluate((el) => el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: (window as any).pointer, bubbles: true })));
    await page.mouse.move(at.x, at.y + 80);
    await page.mouse.up();
    expect(await log(page)).toEqual(['resizestart {"pointerType":"mouse"}', 'resize {"inline":0,"block":40}', 'resizeend {"inline":0,"block":40,"cancelled":true}']);
    await clear(page);
    const h = await centreOf(box(page, 'horizontal'));
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    await page.mouse.move(h.x + 40, h.y);
    await host(page, 'horizontal').evaluate((el) => {
      const keep = el;
      (window as any).removed = keep;
      el.remove();
    });
    await page.mouse.up();
    expect(await log(page)).toEqual(['resizestart {"pointerType":"mouse"}', 'resize {"inline":40,"block":0}', 'resizeend {"inline":40,"block":0,"cancelled":true}']);
  });

  test('HDL-6: the drag keeps going over an embedded document, which its owner keeps from taking the pointer while the drag lasts', async ({ page }) => {
    await mount(page, [fixtureOf('horizontal')], { lead: '<iframe id="frame" title="Preview" srcdoc="<p>Preview</p>" style="position:absolute; inset-block-start:0; inset-inline-start:260px; inline-size:300px; block-size:300px; border:0"></iframe>' });
    await listen(page);
    // The owner, as the spec's web note says: pointer-events: none on its iframe from resizestart to resizeend.
    await host(page, 'horizontal').evaluate((el) => {
      const frame = document.getElementById('frame') as HTMLIFrameElement;
      el.addEventListener('resizestart', () => (frame.style.pointerEvents = 'none'));
      el.addEventListener('resizeend', () => (frame.style.pointerEvents = ''));
    });
    const at = await centreOf(box(page, 'horizontal'));
    const frame = await bounds(page.locator('#frame'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 20, at.y);
    for (const x of [frame.x + 40, frame.x + 150, frame.x + 260]) await page.mouse.move(x, at.y);
    await page.mouse.up();
    const seen = await log(page);
    expect(seen.filter((e) => e.startsWith('resize '))).toEqual([20, frame.x + 40 - at.x, frame.x + 150 - at.x, frame.x + 260 - at.x].map((inline) => `resize ${JSON.stringify({ inline, block: 0 })}`));
    expect(seen.at(-1)).toBe(`resizeend ${JSON.stringify({ inline: frame.x + 260 - at.x, block: 0, cancelled: false })}`);
    expect(await page.locator('#frame').evaluate((el: HTMLElement) => el.style.pointerEvents)).toBe('');
  });

  test('HDL-7: a press released within the slop, Enter or Space activates the handle once and emits no resize; the release of a drag does not', async ({ page }) => {
    await mount(page, [fixtureOf('revealed'), fixtureOf('horizontal'), fixtureOf('button-expanded')]);
    await listen(page);
    for (const id of ['revealed', 'horizontal']) {
      const at = await centreOf(box(page, id));
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x + 4, at.y + 4);
      await page.mouse.up();
      expect(await log(page), `${id}: a click`).toEqual(['activate']);
      await clear(page);
      await page.mouse.down();
      await page.mouse.move(at.x + 4, at.y + 60);
      await page.mouse.up();
      expect((await log(page)).filter((e) => e === 'activate'), `${id}: a drag`).toEqual([]);
      await clear(page);
      await away(page);
      await tabTo(page, box(page, id));
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      expect(await log(page), `${id}: the keys`).toEqual(['activate', 'activate']);
      await clear(page);
    }
    // Assistive technology's click (no pointer) activates the button form.
    await host(page, 'button-expanded').getByRole('button').evaluate((el: HTMLElement) => el.click());
    expect(await log(page)).toEqual(['activate']);
    // The owner switches what it shows; the handle tells the new state as it is given.
    await host(page, 'button-expanded').evaluate((el: any) => (el.expanded = false));
    await expect(host(page, 'button-expanded').getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  test('HDL-17: in right-to-left the inline distance is positive toward the left; the capsule is drawn as in left-to-right', async ({ page }) => {
    await mount(page, [fx('rtl', { axis: 'horizontal', value: 1, revealed: true }, { direction: 'rtl' }), fx('ltr', { axis: 'horizontal', value: 1, revealed: true })]);
    await listen(page);
    const at = await centreOf(box(page, 'rtl'));
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    // Toward the left, as far as the window lets a driver go (the end edge is at the left, the handle against it).
    await page.mouse.move(at.x - 12, at.y + 10);
    await page.mouse.up();
    expect(await log(page)).toEqual(['resizestart {"pointerType":"mouse"}', 'resize {"inline":12,"block":10}', 'resizeend {"inline":12,"block":10,"cancelled":false}']);
    await away(page);
    await expect.poll(() => box(page, 'rtl').getAttribute('data-pressed')).toBeNull();
    await motionEnded(host(page, 'rtl'));
    const [l, r] = await Promise.all([bounds(capsule(page, 'ltr')), bounds(capsule(page, 'rtl'))]);
    expect([r.width, r.height]).toEqual([l.width, l.height]);
  });
});

test.describe('keys and semantics', () => {
  test('HDL-8: with a value it is one focusable separator named by label, with its value, range, value text and its line’s orientation; without one, a button with its expanded state; the line is hidden; an empty label renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fixtureOf('both-bottom-end'), fixtureOf('horizontal'), fixtureOf('button-expanded'), fixtureOf('revealed'), fx('nameless', { label: '', value: 2, revealed: true })]);
    const both = page.getByRole('separator', { name: 'Resize message' }).first();
    await expect(both).toHaveAttribute('aria-valuenow', '6');
    await expect(both).toHaveAttribute('aria-valuemin', '3');
    await expect(both).toHaveAttribute('aria-valuemax', '12');
    await expect(both).toHaveAttribute('aria-valuetext', '6 lines');
    await expect(both).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(both).toHaveAttribute('tabindex', '0');
    const width = page.getByRole('separator', { name: 'Resize preview' });
    await expect(width).toHaveAttribute('aria-orientation', 'vertical');
    await expect(width).not.toHaveAttribute('aria-valuetext');
    await expect(page.getByRole('button', { name: 'Sheet height' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Resize sheet' })).not.toHaveAttribute('aria-expanded');
    for (const id of ['both-bottom-end', 'revealed']) await expect(host(page, id).locator('[part="line"]')).toHaveAttribute('aria-hidden', 'true');
    await expect(capsule(page, 'nameless')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('HDL-8')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/label is empty, so the handle has no accessible name/);
    // One stop each.
    await away(page);
    await tabTo(page, box(page, 'both-bottom-end'));
    await tab(page);
    await expect(box(page, 'horizontal')).toBeFocused();
  });

  test('HDL-9: the arrow keys of its axis ask for one step (Shift a large one), Page Up and Page Down a large one, Home and End the limits; other keys pass, and a button takes none', async ({ page }) => {
    await mount(page, [fx('v', { value: 1, revealed: true }), fx('h', { axis: 'horizontal', value: 1, revealed: true }), fx('b', { axis: 'both', value: 1, revealed: true }), fx('btn', { revealed: true })]);
    await listen(page);
    await page.evaluate(() => document.addEventListener('keydown', (e) => (window as any).log.push(`${e.key}${e.defaultPrevented ? ' taken' : ''}`)));
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Shift+ArrowDown', 'Shift+ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', 'a'];
    const step = (axis: string, direction: number, amount: string) => `step ${JSON.stringify({ axis, direction, amount })}`;
    const expected: Record<string, string[]> = {
      v: [step('block', 1, 'one'), 'ArrowDown taken', step('block', -1, 'one'), 'ArrowUp taken', 'ArrowRight', 'ArrowLeft', 'Shift', step('block', 1, 'large'), 'ArrowDown taken', 'Shift', 'ArrowRight', step('block', 1, 'large'), 'PageDown taken', step('block', -1, 'large'), 'PageUp taken', step('block', -1, 'limit'), 'Home taken', step('block', 1, 'limit'), 'End taken', 'a'],
      h: ['ArrowDown', 'ArrowUp', step('inline', 1, 'one'), 'ArrowRight taken', step('inline', -1, 'one'), 'ArrowLeft taken', 'Shift', 'ArrowDown', 'Shift', step('inline', 1, 'large'), 'ArrowRight taken', step('inline', 1, 'large'), 'PageDown taken', step('inline', -1, 'large'), 'PageUp taken', step('inline', -1, 'limit'), 'Home taken', step('inline', 1, 'limit'), 'End taken', 'a'],
      b: [step('block', 1, 'one'), 'ArrowDown taken', step('block', -1, 'one'), 'ArrowUp taken', step('inline', 1, 'one'), 'ArrowRight taken', step('inline', -1, 'one'), 'ArrowLeft taken', 'Shift', step('block', 1, 'large'), 'ArrowDown taken', 'Shift', step('inline', 1, 'large'), 'ArrowRight taken', step('block', 1, 'large'), 'PageDown taken', step('block', -1, 'large'), 'PageUp taken', step('block', -1, 'limit'), 'Home taken', step('block', 1, 'limit'), 'End taken', 'a'],
      btn: ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Shift', 'ArrowDown', 'Shift', 'ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', 'a'],
    };
    for (const [id, events] of Object.entries(expected)) {
      await tabTo(page, box(page, id));
      await clear(page);
      for (const key of keys) await page.keyboard.press(key);
      expect(await log(page), id).toEqual(events);
    }
  });

  test('HDL-10: on the web, assistive technology adjusts a separator with the arrow keys, which ask for steps along the block axis (the inline one for a width); the value it needs is exposed', async ({ page }) => {
    await mount(page, [fx('v', { value: 4, min: 1, max: 9, revealed: true }), fx('h', { axis: 'horizontal', value: 40, revealed: true })]);
    await listen(page);
    const sep = page.getByRole('separator').first();
    await expect(sep).toHaveAttribute('aria-valuenow', '4');
    await expect(sep).toHaveAttribute('aria-valuemin', '1');
    await expect(sep).toHaveAttribute('aria-valuemax', '9');
    await tabTo(page, box(page, 'v'));
    await page.keyboard.press('ArrowDown');
    await tabTo(page, box(page, 'h'));
    await page.keyboard.press('ArrowRight');
    expect(await log(page)).toEqual([`step ${JSON.stringify({ axis: 'block', direction: 1, amount: 'one' })}`, `step ${JSON.stringify({ axis: 'inline', direction: 1, amount: 'one' })}`]);
  });

  test('HDL-17: in right-to-left the arrow toward the end edge is Left Arrow; an arc’s end corners are at the left, and its diagonal cursor is mirrored', async ({ page }) => {
    await mount(page, [fixtureOf('rtl-both'), fx('rtl-top-start', { axis: 'both', corner: 'top-start', value: 1, revealed: true }, { direction: 'rtl' })]);
    await listen(page);
    await tabTo(page, box(page, 'rtl-both'));
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    expect(await log(page)).toEqual([`step ${JSON.stringify({ axis: 'inline', direction: 1, amount: 'one' })}`, `step ${JSON.stringify({ axis: 'inline', direction: -1, amount: 'one' })}`]);
    const inset = await px(page, T('inset'));
    const r = await px(page, T('arc-radius-medium'));
    const c = await centreOf(circle(page, 'rtl-both'));
    const b = await bounds(box(page, 'rtl-both'));
    expect(c.x - b.x).toBeCloseTo(r + inset, 1);
    expect(b.y + b.height - c.y).toBeCloseTo(r + inset, 1);
    const o = await bounds(owner(page, 'rtl-both'));
    expect(b.x).toBeCloseTo(o.x, 1);
    await expect(box(page, 'rtl-both')).toHaveCSS('cursor', 'nesw-resize');
    const t = await centreOf(circle(page, 'rtl-top-start'));
    const tb = await bounds(box(page, 'rtl-top-start'));
    expect(tb.x + tb.width - t.x).toBeCloseTo(r + inset, 1);
    expect(t.y - tb.y).toBeCloseTo(r + inset, 1);
    await expect(box(page, 'rtl-top-start')).toHaveCSS('cursor', 'nesw-resize');
  });

  test('HDL-18: the direction comes from an ancestor; changed while it is shown, the arc, the cursor and the keys follow at once', async ({ page }) => {
    await mount(page, [fixtureOf('both-bottom-end')]);
    await listen(page);
    const stage = page.locator('[data-fixture="both-bottom-end"]');
    const r = await px(page, T('arc-radius-medium'));
    const inset = await px(page, T('inset'));
    const fromLeft = async () => (await centreOf(circle(page, 'both-bottom-end'))).x - (await bounds(box(page, 'both-bottom-end'))).x;
    expect(await fromLeft()).toBeCloseTo((await bounds(box(page, 'both-bottom-end'))).width - r - inset, 1);
    await stage.evaluate((el) => (el.dir = 'rtl'));
    expect(await fromLeft()).toBeCloseTo(r + inset, 1);
    await expect(box(page, 'both-bottom-end')).toHaveCSS('cursor', 'nesw-resize');
    // The turn has no motion of its own: nothing moves the arc's transform.
    expect(await css(arc(page, 'both-bottom-end'), 'transition-property')).not.toMatch(/transform|scale|all/);
    await tabTo(page, box(page, 'both-bottom-end'));
    await page.keyboard.press('ArrowLeft');
    expect(await log(page)).toEqual([`step ${JSON.stringify({ axis: 'inline', direction: 1, amount: 'one' })}`]);
  });

  test('HDL-20: a size the active system does not have, or an axis or a corner the handle does not define, is drawn as the default and reported; a size a layer adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('size', { size: 'colossal', value: 1, revealed: true }), fx('axis', { axis: 'diagonal', value: 1, revealed: true }), fx('corner', { axis: 'both', corner: 'middle', value: 1, revealed: true }), fx('plain', { value: 1, revealed: true }), fx('added', { size: 'huge', value: 1, revealed: true })], {
      // A layer that adds `huge`: its tokens, as its stylesheet would define them.
      lead: `<style>:root { ${T('container-length-huge')}: 64px; ${T('container-breadth-huge')}: 32px; ${T('line-length-huge')}: 48px; ${T('line-thickness-huge')}: 8px; }</style>`,
    });
    await expect.poll(() => seen.filter((w) => w.includes('HDL-20')).length).toBe(3);
    expect(seen.join('\n')).toMatch(/size "colossal" is not a value of the active design system; it is drawn as "medium"/);
    expect(seen.join('\n')).toMatch(/axis "diagonal" is not a value of the handle/);
    expect(seen.join('\n')).toMatch(/corner "middle" is not a value of the handle/);
    const plain = await bounds(box(page, 'plain'));
    for (const id of ['size', 'axis']) expect(await bounds(box(page, id)).then((b) => [b.width, b.height]), id).toEqual([plain.width, plain.height]);
    await expect(box(page, 'corner')).toHaveCSS('cursor', 'nwse-resize');
    expect((await bounds(box(page, 'added'))).width).toBe(64);
    expect((await bounds(capsule(page, 'added'))).height).toBe(8);
  });

  test('HDL-21: the handle has no words of its own and reads none of the product’s: its name is its label alone', async ({ page }) => {
    await mount(page, [fx('a', { label: '', value: 1, revealed: true }), fx('b', { label: 'Resize notes', value: 1, valueText: '', revealed: true })]);
    for (const id of ['a', 'b']) expect(await host(page, id).evaluate((el) => el.shadowRoot!.textContent!.trim()), id).toBe('');
    await expect(box(page, 'a')).not.toHaveAttribute('aria-label');
    await expect(box(page, 'b')).toHaveAttribute('aria-label', 'Resize notes');
  });

  test('HDL-22: a changed value, range, value text or expanded state is exposed at once, and nothing is announced by the handle itself', async ({ page }) => {
    await mount(page, [fixtureOf('both-bottom-end'), fixtureOf('button-expanded')]);
    await host(page, 'both-bottom-end').evaluate((el: any) => Object.assign(el, { value: 7, min: 2, max: 10, valueText: '7 lines' }));
    const sep = page.getByRole('separator');
    await expect(sep).toHaveAttribute('aria-valuenow', '7');
    await expect(sep).toHaveAttribute('aria-valuemin', '2');
    await expect(sep).toHaveAttribute('aria-valuemax', '10');
    await expect(sep).toHaveAttribute('aria-valuetext', '7 lines');
    await host(page, 'button-expanded').evaluate((el: any) => (el.expanded = null));
    await expect(page.getByRole('button')).not.toHaveAttribute('aria-expanded');
    for (const id of ['both-bottom-end', 'button-expanded']) await expect(host(page, id).locator('[aria-live], [role="status"], [role="alert"]')).toHaveCount(0);
    // Taken from a value to none, it is a button.
    await host(page, 'both-bottom-end').evaluate((el: any) => (el.value = null));
    await expect(host(page, 'both-bottom-end').getByRole('button', { name: 'Resize message' })).toHaveCount(1);
  });
});

test.describe('out of sight until used', () => {
  test('HDL-23: without revealed, where the pointer hovers, nothing is drawn at rest; a mouse over it, keyboard focus and a press bring it into sight over motion.state-duration, and it goes once the press-hold has passed', async ({ page }) => {
    await mount(page, [fixtureOf('default'), fx('arc', { axis: 'both', value: 1 })]);
    await away(page);
    const [duration, curve] = await Promise.all([ms(page, T('motion-state-duration')), easing(page, T('motion-state-easing'))]);
    expect(await opacity(capsule(page, 'default'))).toBe(0);
    expect(await opacity(arc(page, 'arc'))).toBe(0);
    await expect(box(page, 'default')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await watchTransitions(host(page, 'default'));
    await box(page, 'default').hover();
    await expect.poll(() => opacity(capsule(page, 'default'))).toBe(1);
    const shown = (await transitionsRun(host(page, 'default'))).find((run) => run.property === 'opacity' && run.on.includes('capsule'));
    expect(shown).toMatchObject({ duration, easing: curve });
    await away(page);
    await expect.poll(() => opacity(capsule(page, 'default'))).toBe(0);
    await tabTo(page, box(page, 'arc'));
    await expect.poll(() => opacity(arc(page, 'arc'))).toBe(1);
    await tab(page, { back: true });
    await expect.poll(() => opacity(arc(page, 'arc'))).toBe(0);
    // A tap that ends within a frame keeps it in sight for press-hold, then it goes (the pointer has left).
    const hold = await ms(page, '--tanrei-sys-motion-duration-press-hold');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect.poll(() => opacity(capsule(page, 'default'))).toBe(0);
    const at = await centreOf(box(page, 'default'));
    await holdClock(page);
    try {
      await page.mouse.click(at.x, at.y);
      await page.mouse.move(1, 1);
      expect(await opacity(capsule(page, 'default'))).toBe(1);
      await page.clock.runFor(hold - 1);
      expect(await opacity(capsule(page, 'default'))).toBe(1);
      await page.clock.runFor(1);
      await expect.poll(() => opacity(capsule(page, 'default'))).toBe(0);
    } finally {
      await releaseClock(page);
    }
    // Revealed: drawn at rest.
    await mount(page, [fixtureOf('revealed')]);
    await away(page);
    expect(await opacity(capsule(page, 'revealed'))).toBe(1);
  });

  test('HDL-24: out of sight it is still one Tab stop with its name and value, its target and resize cursor, and its drag, keys and activation', async ({ page }) => {
    await mount(page, [fx('hidden', { value: 3 })]);
    await listen(page);
    await away(page);
    expect(await opacity(capsule(page, 'hidden'))).toBe(0);
    await expect(page.getByRole('separator', { name: 'Resize message' })).toHaveAttribute('aria-valuenow', '3');
    await expect(box(page, 'hidden')).toHaveCSS('cursor', 'ns-resize');
    const at = await centreOf(box(page, 'hidden'));
    expect(await host(page, 'hidden').evaluate((el, [x, y]) => !!el.shadowRoot!.elementFromPoint(x, y)?.closest('.container'), [at.x, at.y])).toBe(true);
    await tabTo(page, box(page, 'hidden'));
    await expect(box(page, 'hidden')).toHaveCSS('outline-style', 'solid');
    await expect.poll(() => opacity(capsule(page, 'hidden'))).toBe(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await tab(page, { back: true });
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y + 30);
    await page.mouse.up();
    expect(await log(page)).toEqual([`step ${JSON.stringify({ axis: 'block', direction: 1, amount: 'one' })}`, 'activate', 'resizestart {"pointerType":"mouse"}', 'resize {"inline":0,"block":30}', 'resizeend {"inline":0,"block":30,"cancelled":false}']);
  });

  test('HDL-25: where the primary pointer cannot hover (a touch screen) the line is drawn at rest', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium emulates a touch device whose primary pointer cannot hover');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 400, height: 700 } });
    const page = await context.newPage();
    await mount(page, [fixtureOf('default'), fx('arc', { axis: 'both', value: 1 })]);
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
    expect(await opacity(capsule(page, 'default'))).toBe(1);
    expect(await opacity(arc(page, 'arc'))).toBe(1);
    await context.close();
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test('every axis, corner and size of the spec has a fixture', () => {
    const seen = new Set(spec.fixtures.flatMap((f) => [`axis:${f.props.axis ?? 'vertical'}`, `size:${f.props.size ?? 'medium'}`, ...(f.props.axis === 'both' ? [`corner:${f.props.corner ?? 'bottom-end'}`] : [])]));
    for (const name of ['axis:vertical', 'axis:horizontal', 'axis:both', 'size:small', 'size:medium', 'corner:bottom-end', 'corner:bottom-start', 'corner:top-end', 'corner:top-start']) expect(seen.has(name), name).toBe(true);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f);
      await away(page);
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
