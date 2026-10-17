// <tanrei-radio-button>, driven by specs/radio-button.spec.json: every behaviour id (RAD-1…27) is cited by a test title,
// every fixture has a baseline, and every condition, state and choice of kind is read back from the tokens — never from
// a number written here. Each spec fixture is staged as its own group (test/harness.ts); the group tests build one.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { BEHIND, INSIDE, RATIOS, atRatio, depth, endMotion, holdMotionAt, offLine, paintedBehind, shoot, stageBehind, worst } from '../../../test/one-shape.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import { motionEnded, settledCss } from '../../../test/motions.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';

const spec = loadSpec('radio-button');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-radio-button`);
const input = (page: P, id: string) => host(page, id).locator('input');
const container = (page: P, id: string) => host(page, id).locator('.container');
const ringOf = (page: P, id: string) => host(page, id).locator('.ring');
const fillOf = (page: P, id: string) => host(page, id).locator('.fill');
const labelOf = (page: P, id: string) => host(page, id).locator('.label');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-radio-button-${name}`;
const pressed = (page: P, id: string) => container(page, id).getAttribute('data-pressed');
const ripples = (page: P, id: string) => container(page, id).locator('.ripple');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props });
/** The duration (ms) of the running transition of `property` on the element, or null when none runs. */
const running = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const t = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === p);
    return t ? Number(t.effect!.getTiming().duration) : null;
  }, property);
/** A fill color token as the fill draws it: at comp.radio-button.fill.opacity (RAD-19). */
const resolveFill = (page: P, name: string) =>
  page.evaluate(
    ([n, o]) => {
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;visibility:hidden;background-color:color-mix(in srgb, var(${n}) calc(var(${o}) * 100%), transparent)`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    },
    [name, T('fill-opacity')] as const,
  );
/**
 * The ring's stroke as drawn (px): the ring is the `.ring` box's ::before, painted everywhere but its content box, so
 * its stroke is that layer's padding (RAD-24).
 */
const strokeOf = async (locator: Locator) => Number.parseFloat(await css(locator, 'padding-top', '::before'));
/** The ring's color as drawn: its layer's. */
const ringColor = (locator: Locator) => css(locator, 'background-color', '::before');
/** The duration (ms) of the transition of `property` running on the ring's layer, or null when none runs. */
const ringRunning = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const t = el.getAnimations({ subtree: true }).find((a) => (a as CSSTransition).transitionProperty === p && (a.effect as KeyframeEffect).target === el && (a.effect as KeyframeEffect).pseudoElement === '::before');
    return t ? Number(t.effect!.getTiming().duration) : null;
  }, property);
/**
 * The transitions the option's ring (its `::before` layer) and its fill have begun since `watchTransitions(host)`, as
 * `ring padding-top 700` — kept as the engine announces them, so a slow answer to the test cannot miss one that is over.
 */
const begun = async (page: P, id: string) =>
  (await transitionsRun(host(page, id))).flatMap((run) => {
    const classes = run.on.split('.');
    const part = classes.includes('ring') && run.pseudo === '::before' ? 'ring' : classes.includes('fill') && run.pseudo === '' ? 'fill' : null;
    return part ? [`${part} ${run.property} ${run.duration}`] : [];
  });
/**
 * The disc the fill paints: the `.fill` layer is the ring's box less fill.inset, painted on its content box alone, and
 * its padding is the ring's stroke (RAD-19, RAD-24).
 */
const fillDisc = (locator: Locator) =>
  locator.evaluate((el) => {
    const [r, s] = [el.getBoundingClientRect(), getComputedStyle(el)];
    const [top, right, bottom, left] = ['Top', 'Right', 'Bottom', 'Left'].map((side) => Number.parseFloat(s.getPropertyValue(`padding-${side.toLowerCase()}`)));
    return { x: r.x + left, y: r.y + top, width: Math.max(0, r.width - left - right), height: Math.max(0, r.height - top - bottom) };
  });
/** Waits until every transition and animation in the element's shadow tree has ended. */
const settle = (page: P, id: string) => host(page, id).evaluate(async (el) => { await Promise.all(el.shadowRoot!.getAnimations().map((a) => a.finished.catch(() => undefined))); });
/**
 * A CSS color as 8-bit, unpremultiplied RGBA, whatever space the browser serializes it in (an interpolated color may be
 * written in oklab): painted onto a canvas and read back.
 */
const RGBA_SOURCE = `(color) => {
  const canvas = (window.__rgbaCanvas ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = 'rgb(0 0 0 / 0)';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}`;
type Rgba = { r: number; g: number; b: number; a: number };
const rgba = (page: P, color: string) => page.evaluate(([source, c]) => (0, eval)(source)(c) as Rgba, [RGBA_SOURCE, color] as const);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/** Counts every option's click, input and change events on the page, and what each change carried and from whom. */
const listenAll = (page: P) =>
  page.evaluate(() => {
    const log = ((window as any).events = { click: 0, input: 0, change: [] as string[] });
    for (const el of document.querySelectorAll('tanrei-radio-button')) {
      el.addEventListener('click', () => log.click++);
      el.addEventListener('input', () => log.input++);
      el.addEventListener('change', (event) => log.change.push(`${(event as CustomEvent).detail.value}:${(el as any).checked}`));
    }
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { click: number; input: number; change: string[] });
const selected = (page: P) => page.evaluate(() => [...document.querySelectorAll('tanrei-radio-button')].filter((el) => (el as any).checked).map((el) => (el as any).value));

/**
 * One group: the options given, each in its own stage (so `host(page, id)` finds it), all with the name "size" and no
 * form around them, inside one element with role radiogroup; a button before and after it for Tab.
 */
async function mountGroup(page: P, options: Fixture['props'][], { dir = 'ltr' }: { dir?: 'ltr' | 'rtl' } = {}) {
  await mountFixtures(page, spec, { fixtures: options.map((props, i) => fixture(`o${i}`, { name: 'size', value: `v${i}`, label: `Option ${i}`, ...props })) });
  await page.evaluate((d) => {
    document.documentElement.dir = d;
    for (const form of document.querySelectorAll('.stage form')) form.replaceWith(form.querySelector('tanrei-radio-button')!);
    const main = document.querySelector('main')!;
    const group = document.createElement('div');
    group.id = 'group';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Size');
    group.append(...main.children);
    main.append(group);
    main.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
    main.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
  }, dir);
}
/** Everything a condition paints, as drawn. */
const drawn = (page: P, id: string, { settled = false } = {}) =>
  host(page, id).evaluate(async (el, settle) => {
    const root = el.shadowRoot!;
    // Settled: once every transition running in the shadow tree has reached its end (see settledCss).
    if (settle) await Promise.all(root.getAnimations().map((a) => a.finished.catch(() => undefined)));
    const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
    return { container: s('.container').backgroundColor, ring: getComputedStyle(root.querySelector('.ring')!, '::before').backgroundColor, fill: s('.fill').backgroundColor, label: root.querySelector('.label') ? s('.label').color : null };
  }, settled);
const expected = async (page: P, condition: string, state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    container: await resolveColor(page, name('container-color')),
    ring: await resolveColor(page, name('ring-color')),
    fill: await resolveFill(page, name('fill-color')),
    label: await resolveColor(page, name('label-color')),
  };
};
const matches = async (page: P, id: string, condition: string, state = '') => {
  const want = await expected(page, condition, state);
  await expect
    .poll(async () => {
      const d = await drawn(page, id);
      return { container: d.container, fill: d.fill, ring: d.ring.includes(want.ring), label: d.label ?? want.label };
    }, `${id} draws ${condition} ${state || 'at rest'}`)
    .toEqual({ container: want.container, fill: want.fill, ring: true, label: want.label });
};

test.describe('behavior', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('RAD-1: pointer on the ring, pointer on the label, Space, element.click() and assistive technology each select it and emit change once with its value', async ({ page }) => {
    const activations: [string, (id: string) => Promise<unknown>][] = [
      ['ring', (id) => container(page, id).click()],
      ['label', (id) => labelOf(page, id).click()],
      ['Space', async (id) => { await host(page, id).focus(); await page.keyboard.press('Space'); }],
      ['element.click()', (id) => host(page, id).evaluate((el) => (el as HTMLElement).click())],
      ['assistive technology', (id) => input(page, id).dispatchEvent('click')],
    ];
    for (const [name, activate] of activations) {
      await mountGroup(page, [{}, {}]);
      await listenAll(page);
      await activate('o1');
      expect(await events(page), name).toEqual({ click: 1, input: 1, change: ['v1:true'] });
      expect(await selected(page), name).toEqual(['v1']);
    }
  });

  test('RAD-1: Enter does not select it on the web; inside a form it submits the form', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).submits = 0;
      document.querySelector('[data-fixture="unselected"] form')!.addEventListener('submit', (event) => { event.preventDefault(); (window as any).submits++; });
    });
    await listenAll(page);
    await host(page, 'unselected').focus();
    await page.keyboard.press('Enter');
    expect((await events(page)).change).toEqual([]);
    expect(await host(page, 'unselected').evaluate((el) => (el as any).checked)).toBe(false);
    expect(await page.evaluate(() => (window as any).submits)).toBe(1);
  });

  test('RAD-2: activating the selected option keeps it selected and emits nothing', async ({ page }) => {
    await mountGroup(page, [{ checked: true }, {}]);
    await listenAll(page);
    await container(page, 'o0').click();
    await labelOf(page, 'o0').click();
    await host(page, 'o0').focus();
    await page.keyboard.press('Space');
    await host(page, 'o0').evaluate((el) => (el as HTMLElement).click());
    expect((await events(page)).change).toEqual([]);
    expect((await events(page)).input).toBe(0);
    expect(await selected(page)).toEqual(['v0']);
  });

  test('RAD-3: selecting an option clears the others of its group without their emitting change; other names and forms are other groups', async ({ page }) => {
    await mountGroup(page, [{ checked: true }, {}, {}, { name: 'other', checked: true }]);
    await listenAll(page);
    await container(page, 'o2').click();
    expect(await selected(page)).toEqual(['v2', 'v3']);
    expect((await events(page)).change).toEqual(['v2:true']);
    // The app's own selection clears the others too — and nothing is emitted.
    await host(page, 'o0').evaluate((el) => ((el as any).checked = true));
    await expect.poll(() => selected(page)).toEqual(['v0', 'v3']);
    expect((await events(page)).change).toEqual(['v2:true']);
    await expect(input(page, 'o2')).not.toBeChecked();
    // The spec's fixtures are one group each, in a form each: four of them are selected at once.
    await mountFixtures(page, spec);
    expect((await selected(page)).length).toBe(4);
  });

  test('RAD-4: Down and Right move to the next enabled option and select it, Up and Left to the previous, wrapping, skipping disabled ones', async ({ page }) => {
    await mountGroup(page, [{ checked: true }, { disabled: true }, {}, {}]);
    await listenAll(page);
    await tabTo(page, host(page, 'o0'));
    await page.keyboard.press('ArrowDown'); // skips the disabled one
    await expect(input(page, 'o2')).toBeFocused();
    expect(await selected(page)).toEqual(['v2']);
    await page.keyboard.press('ArrowRight');
    await expect(input(page, 'o3')).toBeFocused();
    await page.keyboard.press('ArrowDown'); // wraps to the first
    await expect(input(page, 'o0')).toBeFocused();
    await page.keyboard.press('ArrowUp'); // wraps to the last
    await expect(input(page, 'o3')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(input(page, 'o2')).toBeFocused();
    expect(await selected(page)).toEqual(['v2']);
    // Each move selected the option it reached, and only that one told.
    expect((await events(page)).change).toEqual(['v2:true', 'v3:true', 'v0:true', 'v3:true', 'v2:true']);
  });

  test('RAD-4: in a right-to-left layout Right Arrow moves to the previous option and Left Arrow to the next', async ({ page }) => {
    await mountGroup(page, [{}, { checked: true }, {}], { dir: 'rtl' });
    await tabTo(page, host(page, 'o1'));
    await page.keyboard.press('ArrowRight');
    await expect(input(page, 'o0')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(input(page, 'o1')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(input(page, 'o2')).toBeFocused();
    await page.keyboard.press('ArrowDown'); // Down is still the next, wrapping
    await expect(input(page, 'o0')).toBeFocused();
    expect(await selected(page)).toEqual(['v0']);
  });

  test('RAD-5: the group has one tab stop — the selected option, else the first enabled one — and Tab leaves the group', async ({ page }) => {
    await mountGroup(page, [{ disabled: true }, {}, {}, {}]);
    await page.locator('#before').focus();
    await tab(page);
    await expect(input(page, 'o1')).toBeFocused(); // the first enabled one, none selected
    await tab(page);
    await expect(page.locator('#after')).toBeFocused(); // Tab left the group
    await host(page, 'o3').evaluate((el) => ((el as any).checked = true));
    await tab(page, { back: true });
    await expect(input(page, 'o3')).toBeFocused(); // Shift+Tab comes back to the selected one
    await tab(page, { back: true });
    await expect(page.locator('#before')).toBeFocused();
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-radio-button')].map((el) => el.shadowRoot!.querySelector('input')!.tabIndex))).toEqual([-1, -1, -1, 0]);
    // An option added to or removed from the group moves the tab stop with it.
    await host(page, 'o3').evaluate((el) => el.remove());
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('tanrei-radio-button')].map((el) => el.shadowRoot!.querySelector('input')!.tabIndex))).toEqual([-1, 0, -1]);
  });

  test('RAD-5: the stop is set again when an option is disabled or enabled from outside itself — by a disabled fieldset around the group, or by the field group that frames it — so a group that was disabled has its stop back when it is enabled', async ({ page }) => {
    await mountGroup(page, [{}, {}, {}]);
    const stops = () => page.evaluate(() => [...document.querySelectorAll('tanrei-radio-button')].map((el) => { const native = el.shadowRoot!.querySelector('input')!; return !native.disabled && native.tabIndex === 0; }));
    const settle = () => page.evaluate(async () => {
      for (let pass = 0; pass < 3; pass++) {
        for (const el of document.querySelectorAll('tanrei-radio-button, tanrei-field-group')) await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });
    expect(await stops()).toEqual([true, false, false]);
    // A disabled fieldset around the options, then enabled again.
    await page.evaluate(() => {
      const first = document.querySelector('tanrei-radio-button')!;
      const set = document.createElement('fieldset');
      set.id = 'set';
      first.closest('main')!.before(set);
      set.append(first.closest('main')!);
      set.disabled = true;
    });
    await settle();
    expect(await stops()).toEqual([false, false, false]);
    await page.evaluate(() => ((document.querySelector('#set') as HTMLFieldSetElement).disabled = false));
    await settle();
    expect(await stops()).toEqual([true, false, false]);
    // A field group in its radio-group kind around options of one name gives and takes `disabled` the same way.
    await page.evaluate(() => {
      const frame = document.createElement('tanrei-field-group');
      frame.id = 'frame';
      frame.setAttribute('kind', 'radio-group');
      frame.setAttribute('label', 'Framed');
      frame.setAttribute('disabled', '');
      frame.innerHTML = '<tanrei-radio-button class="framed" name="framed" value="a" label="A"></tanrei-radio-button><tanrei-radio-button class="framed" name="framed" value="b" label="B" checked></tanrei-radio-button>';
      document.body.append(frame);
    });
    await settle();
    const framed = () => page.evaluate(() => [...document.querySelectorAll('.framed')].map((el) => { const native = el.shadowRoot!.querySelector('input')!; return !native.disabled && native.tabIndex === 0; }));
    expect(await framed()).toEqual([false, false]);
    await page.evaluate(() => document.querySelector('#frame')!.removeAttribute('disabled'));
    await settle();
    expect(await framed(), 'the selected one is the stop again').toEqual([false, true]);
  });

  test('RAD-6: a disabled option neither changes nor emits change, is not focusable, is skipped by the arrows, ignores its label and exposes disabled', async ({ page }) => {
    for (const id of ['disabled-unselected', 'disabled-selected']) {
      const target = host(page, id);
      const before = await target.evaluate((el) => (el as any).checked);
      await listenAll(page);
      await container(page, id).click({ force: true });
      await labelOf(page, id).click({ force: true });
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await target.focus();
      await page.keyboard.press('Space');
      expect((await events(page)).change, id).toEqual([]);
      expect(await target.evaluate((el) => (el as any).checked), id).toBe(before);
      expect(await page.evaluate(() => document.activeElement?.tagName), id).not.toBe('TANREI-RADIO-BUTTON');
      await expect(target.getByRole('radio', { disabled: true }), id).toHaveCount(1);
    }
  });

  test('RAD-7: hover, keyboard focus and press render the container from that state’s tokens of the condition — its error form while it is in error; ring, fill and label keep theirs (default system)', async ({ page }) => {
    for (const [id, condition] of [['unselected', 'unselected'], ['selected', 'selected'], ['error-unselected', 'error-unselected'], ['error-selected', 'error-selected']] as const) {
      await page.mouse.move(0, 0);
      await matches(page, id, condition);
      await container(page, id).hover();
      await matches(page, id, condition, 'hovered');
      expect((await drawn(page, id)).container, id).not.toBe((await expected(page, condition)).container);
      await page.mouse.down();
      await matches(page, id, condition, 'pressed');
      await page.mouse.move(0, 0);
      await page.mouse.up();
      expect(await input(page, id).evaluate((el) => el.matches(':focus-visible'))).toBe(false);
      await matches(page, id, condition);
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, host(page, id));
      await matches(page, id, condition, 'focused');
    }
    expect(await css(host(page, 'selected').locator('.root'), 'opacity')).toBe(await token(page, T('focused-opacity')));
  });

  test('RAD-7: under acme, where the three states differ, pressed beats focused beats hovered — in both conditions and in their error forms', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const [id, condition] of [['unselected', 'unselected'], ['selected', 'selected'], ['error-unselected', 'error-unselected'], ['error-selected', 'error-selected']] as const) {
      const name = (s: string) => T(`${condition}-${s ? `${s}-` : ''}container-color`);
      const bg = () => css(container(page, id), 'background-color');
      const [rest, hovered, focused, down] = await Promise.all(['', 'hovered', 'focused', 'pressed'].map((s) => resolveColor(page, name(s))));
      expect(new Set([rest, hovered, focused, down]).size, id).toBe(4);
      await page.mouse.move(0, 0);
      await expect.poll(bg, id).toBe(rest);
      await container(page, id).hover();
      await expect.poll(bg, id).toBe(hovered);
      await tabTo(page, host(page, id));
      await expect.poll(bg, id).toBe(focused);
      await page.keyboard.down('Space');
      await expect.poll(bg, id).toBe(down);
      await page.keyboard.up('Space');
      await host(page, id).evaluate((el, c) => ((el as any).checked = c === 'selected' || c === 'error-selected'), condition);
      await expect.poll(bg, id).toBe(focused);
      await page.mouse.down();
      await expect.poll(bg, id).toBe(down);
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
  });

  test('RAD-26: while error is true each part is drawn from the error form of its condition — the ring in the error form’s color, the fill in its own, the label unchanged — and nothing but color differs from the plain form: the stroke still says the selection; the option exposes no invalid state', async ({ page }) => {
    for (const [id, plain] of [['error-unselected', 'unselected'], ['error-selected', 'selected']] as const) {
      await page.mouse.move(0, 0);
      await matches(page, id, id);
      expect(await host(page, id).evaluate((el) => [(el as any).error, el.hasAttribute('error'), el.shadowRoot!.querySelector('.root')!.hasAttribute('data-error')]), id).toEqual([true, true, true]);
      // The ring takes the error role under the default system; the label is the plain form's.
      expect((await drawn(page, id)).ring, id).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
      expect((await drawn(page, id)).ring, id).not.toBe((await drawn(page, plain)).ring);
      expect((await drawn(page, id)).label, id).toBe((await drawn(page, plain)).label);
      // Nothing changes size or moves: the stroke, each layer's box and the option's own box are the plain form's.
      expect(await strokeOf(ringOf(page, id)), `${id}: the stroke`).toBe(await strokeOf(ringOf(page, plain)));
      for (const layer of [container, ringOf, fillOf, labelOf]) {
        const [a, b, stageA, stageB] = [await bounds(layer(page, id)), await bounds(layer(page, plain)), await bounds(host(page, id)), await bounds(host(page, plain))];
        expect([a.x - stageA.x, a.y - stageA.y, a.width, a.height], id).toEqual([b.x - stageB.x, b.y - stageB.y, b.width, b.height]);
      }
      // No invalid state of its own: the radio role has none, and a group says it (RGP-10).
      expect(await input(page, id).getAttribute('aria-invalid'), id).toBeNull();
      expect(await input(page, id).evaluate((el: HTMLInputElement) => el.validity.valid), id).toBe(true);
    }
    // The selection is told by the stroke's weight in error as out of it.
    expect(await strokeOf(ringOf(page, 'error-selected'))).toBeGreaterThan(await strokeOf(ringOf(page, 'error-unselected')));
    // Keyboard focus keeps the focus indication of RAD-8: the accent is the focus ring alone.
    const focus = async (id: string) => {
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, host(page, id));
      return [await css(ringOf(page, id), 'outline-color'), await css(ringOf(page, id), 'outline-width'), await css(ringOf(page, id), 'box-shadow')];
    };
    expect(await focus('error-selected')).toEqual(await focus('selected'));
  });

  test('RAD-26: selecting in error thickens the stroke and runs the colors between the two error forms over the selection motion; error alone coming or going recolors the ring and the fill over the selection motion and moves nothing, and at once where motion is reduced', async ({ page }) => {
    await mountGroup(page, [{ error: true }, { error: true }, {}]);
    await override(page, { [T('motion-state-duration')]: '300ms', [T('motion-selection-duration')]: '700ms' });
    await page.mouse.move(0, 0);
    await matches(page, 'o0', 'error-unselected');
    const thin = await strokeOf(ringOf(page, 'o0'));
    // Becoming selected in error: the stroke and both colors, over the selection motion, to the selected error form.
    await watchTransitions(host(page, 'o0'));
    await host(page, 'o0').evaluate((el) => ((el as any).checked = true));
    await expect.poll(() => begun(page, 'o0')).toEqual(expect.arrayContaining(['ring padding-top 700', 'fill background-color 700']));
    await settle(page, 'o0');
    await matches(page, 'o0', 'error-selected');
    expect(await strokeOf(ringOf(page, 'o0'))).toBeGreaterThan(thin);
    // Error alone going, then coming: the ring recolors over the selection motion; the stroke does not move.
    const [stroke, box] = [await strokeOf(ringOf(page, 'o0')), await bounds(ringOf(page, 'o0'))];
    await watchTransitions(host(page, 'o0'));
    await host(page, 'o0').evaluate((el) => ((el as any).error = false));
    await expect.poll(() => begun(page, 'o0')).toContain('ring background-color 700');
    // (The engine announces what one change starts together: the stroke's would be in the list by now.)
    expect((await begun(page, 'o0')).filter((run) => run.startsWith('ring padding-top')), 'the stroke does not move').toEqual([]);
    await settle(page, 'o0');
    await matches(page, 'o0', 'selected');
    expect(await strokeOf(ringOf(page, 'o0'))).toBe(stroke);
    expect(await bounds(ringOf(page, 'o0'))).toEqual(box);
    await watchTransitions(host(page, 'o2'));
    await host(page, 'o2').evaluate((el) => ((el as any).error = true));
    await expect.poll(() => begun(page, 'o2')).toContain('ring background-color 700');
    await settle(page, 'o2');
    await matches(page, 'o2', 'error-unselected');
    // Reduced motion: the new colors in the next frame, with no transition.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page, 'o2').evaluate((el) => ((el as any).error = false));
    await host(page, 'o2').evaluate(async (el) => {
      await (el as any).updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(await ringRunning(ringOf(page, 'o2'), 'background-color')).toBe(null);
    expect((await drawn(page, 'o2')).ring).toBe((await expected(page, 'unselected')).ring);
  });

  test('RAD-26: a field, a field group in error and a radio group in error put the radio button in its error form through the frame’s connection — no prop is set on it, no invalid state and no description from a group is written on it — and it keeps the error the product gave it when the frame is not in error', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('own', { error: true, value: 'a', name: 'own', label: 'Own' })] });
    await page.evaluate(async () => {
      const main = document.querySelector('main')!;
      main.insertAdjacentHTML(
        'beforeend',
        `<tanrei-field-group id="fg" label="Delivery" kind="radio-group" error error-text="Choose one."><tanrei-radio-button name="fg" value="a" label="A"></tanrei-radio-button><tanrei-radio-button name="fg" value="b" label="B" checked></tanrei-radio-button><tanrei-radio-button name="fg" value="c" label="C" disabled></tanrei-radio-button></tanrei-field-group>
         <tanrei-radio-group id="rg" label="Delivery" error error-text="Choose one." value="b"><tanrei-radio-button value="a" label="A"></tanrei-radio-button><tanrei-radio-button value="b" label="B"></tanrei-radio-button></tanrei-radio-group>
         <tanrei-field id="fd" error error-text="Wrong." supporting-text="Help."><tanrei-radio-button name="fd" value="a" label="A"></tanrei-radio-button></tanrei-field>
         <tanrei-field-group id="ok" label="Delivery" kind="radio-group"><tanrei-radio-button name="ok" value="a" label="A" error></tanrei-radio-button><tanrei-radio-button name="ok" value="b" label="B"></tanrei-radio-button></tanrei-field-group>`,
      );
      await Promise.all(['tanrei-field-group', 'tanrei-radio-group', 'tanrei-field'].map((tag) => customElements.whenDefined(tag)));
      for (let round = 0; round < 3; round++) for (const el of main.querySelectorAll('*')) await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const read = (id: string) =>
      page.locator(`#${id} > tanrei-radio-button`).evaluateAll(async (all) => {
        await Promise.all(all.flatMap((el) => el.shadowRoot!.getAnimations().map((a) => a.finished.catch(() => undefined))));
        return all.map((el) => {
          const native = el.shadowRoot!.querySelector('input')!;
          return {
            drawn: el.shadowRoot!.querySelector('.root')!.hasAttribute('data-error'),
            prop: (el as any).error as boolean,
            attribute: el.hasAttribute('error'),
            invalid: native.getAttribute('aria-invalid'),
            description: native.getAttribute('aria-description'),
            ring: getComputedStyle(el.shadowRoot!.querySelector('.ring')!, '::before').backgroundColor,
          };
        });
      });
    const [unselected, selected] = [await resolveColor(page, T('error-unselected-ring-color')), await resolveColor(page, T('error-selected-ring-color'))];
    for (const id of ['fg', 'rg']) {
      const options = await read(id);
      expect(options.map((o) => [o.drawn, o.prop, o.attribute, o.invalid, o.description]), id).toEqual(options.map(() => [true, false, false, null, null]));
      expect(options[0]!.ring, `${id}: the unselected error form`).toBe(unselected);
      expect(options[1]!.ring, `${id}: the selected error form`).toBe(selected);
    }
    // Disabled wins: the disabled option of the group in error is drawn from the disabled tokens, which show no error color.
    expect((await read('fg'))[2]!.ring).toBe(await resolveColor(page, T('unselected-disabled-ring-color')));
    // A field in error marks its control the same way (FLD-8), and still describes it; the option is never invalid.
    expect((await read('fd')).map((o) => [o.drawn, o.prop, o.invalid, o.description])).toEqual([[true, false, null, 'Wrong.']]);
    // With no error on the frame an option keeps the error the product gave it, and its neighbour none.
    expect((await read('ok')).map((o) => [o.drawn, o.prop])).toEqual([[true, true], [false, false]]);
    // The frame's error going takes the error form away; coming back, it returns — no property of the option changes.
    await page.evaluate(async () => {
      for (const id of ['fg', 'rg']) (document.getElementById(id) as HTMLElement & { error: boolean }).error = false;
      for (let round = 0; round < 3; round++) for (const el of document.querySelectorAll('main *')) await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
    });
    for (const id of ['fg', 'rg']) expect((await read(id)).map((o) => o.drawn), id).toEqual((await read(id)).map(() => false));
    // The option's own error form is the group's: the same pixels' worth of color.
    expect((await drawn(page, 'own')).ring).toBe(unselected);
  });

  test('RAD-8: keyboard focus shows the focus ring around the ring immediately; pointer focus does not', async ({ page }) => {
    const ring = ringOf(page, 'unselected');
    await container(page, 'unselected').click();
    await expect(ring).toHaveCSS('outline-style', 'none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, 'selected'));
    await expect(ringOf(page, 'selected')).toHaveCSS('outline-style', 'solid');
    await expect(ringOf(page, 'selected')).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(ringOf(page, 'selected')).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    // Round, around the ring; not on the container; never animated.
    const size = await resolveToken(page, T('ring-size'));
    expect(Number.parseFloat(await css(ringOf(page, 'selected'), 'border-top-left-radius'))).toBe(size / 2);
    await expect(container(page, 'selected')).toHaveCSS('outline-style', 'none');
    expect(await css(ringOf(page, 'selected'), 'transition-property')).not.toContain('outline');
  });

  test('RAD-9: the hit area meets sys.target.pointer around the container while its size stays; the label is in it', async ({ page }) => {
    await mountGroup(page, [{}, {}]);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const side = await resolveToken(page, T('container-size'));
    const c = await bounds(container(page, 'o0'));
    expect([c.width, c.height]).toEqual([side, side]);
    const hit = await host(page, 'o0').locator('.control').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(Math.min(...hit)).toBeGreaterThanOrEqual(pointer);
    await listenAll(page);
    const d = (Math.max(side, pointer) - side) / 4;
    await page.mouse.click(c.x - d, c.y + c.height / 2); // before the container, inside the target
    expect((await events(page)).change).toEqual(['v0:true']);
    const l = await bounds(labelOf(page, 'o1'));
    await page.mouse.click(l.x + l.width - 1, l.y + 1);
    expect((await events(page)).change).toEqual(['v0:true', 'v1:true']);
  });

  test('RAD-9: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await host(page, 'unselected').locator('.control').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit).toEqual([touch, touch]);
  });

  test('RAD-10: disabled renders from the disabled tokens of its condition — the round container stays clear — and of its error form while it is in error, which are those of the plain form: disabled wins', async ({ page }) => {
    const option = { value: 'weekly', name: 'frequency', label: 'Weekly', disabled: true, error: true };
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('disabled-error-unselected', option), fixture('disabled-error-selected', { ...option, selected: true })] });
    for (const [id, condition] of [['disabled-unselected', 'unselected'], ['disabled-selected', 'selected'], ['disabled-error-unselected', 'error-unselected'], ['disabled-error-selected', 'error-selected']] as const) {
      await matches(page, id, condition, 'disabled');
      // In error and disabled: every part is what the same option out of error draws (RAD-26).
      if (id.includes('error')) expect(await drawn(page, id, { settled: true }), id).toEqual(await drawn(page, id.replace('-error', ''), { settled: true }));
      expect(await css(host(page, id).locator('.root'), 'opacity'), id).toBe(await token(page, T('disabled-opacity')));
      expect((await drawn(page, id)).container, id).toBe('rgba(0, 0, 0, 0)');
      expect((await drawn(page, id)).ring, id).toMatch(/0\.38\)/);
    }
  });
});

test.describe('press, feedback, corners and focus style', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

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

  test('RAD-11: a press that ends within a frame — Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, activate] of [
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, container(page, 'selected'))],
    ] as const) {
      await mountFixtures(page, spec);
      await host(page, 'selected').focus();
      await expect.poll(() => css(container(page, 'selected'), 'background-color')).toBe(await resolveColor(page, T('selected-focused-container-color')));
      await watchPress(page, 'selected');
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await pressLog(page)).off !== undefined, name);
      const log = await pressLog(page);
      expect(log.seen, name).toEqual(['overlay', '0s', await resolveColor(page, T('selected-pressed-container-color'))]);
      expect(log.up! - log.on!, name).toBeLessThan(hold);
      expect(log.off! - log.down!, name).toBeGreaterThanOrEqual(hold - CLOCK);
    }
  });

  test('RAD-11: a pointer press lasts while the pointer is down; a key press ends when focus leaves; disabled shows none', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    await container(page, 'unselected').hover();
    await page.mouse.down();
    await input(page, 'unselected').evaluate((el) => el.blur());
    await page.waitForTimeout(hold * 3);
    expect(await pressed(page, 'unselected')).toBe('overlay');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'unselected')).toBeNull();
    await host(page, 'selected').focus();
    await page.keyboard.down('Space');
    expect(await pressed(page, 'selected')).toBe('overlay');
    await input(page, 'selected').evaluate((el) => el.blur());
    await expect.poll(() => pressed(page, 'selected')).toBeNull();
    await page.keyboard.up('Space');
    await container(page, 'disabled-selected').click({ force: true });
    expect(await pressed(page, 'disabled-selected')).toBeNull();
  });

  test('RAD-12 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    await container(page, 'selected').hover();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('overlay');
    expect(await css(container(page, 'selected'), 'background-color')).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('RAD-12 ripple (m3-like): the pressed layer grows from the point of contact inside the round container; the ring takes its pressed color at once', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const id = 'selected';
    const c = await bounds(container(page, id));
    const hovered = await resolveColor(page, T('selected-hovered-container-color'));
    await override(page, { [T('selected-pressed-ring-color')]: 'rgb(0, 0, 255)' });
    await page.mouse.move(c.x + 12, c.y + 10);
    // The press starts from the hovered state at rest: its transition in has ended (a running one would go on through
    // the ripple press, which does not change the container color, and the read below would catch a later frame of it).
    await expect.poll(() => settledCss(container(page, id), 'background-color')).toBe(hovered);
    await page.mouse.down();
    expect(await pressed(page, id)).toBe('ripple');
    const ripple = ripples(page, id);
    await expect(ripple).toHaveCount(1);
    const layer = await ripple.evaluate((el) => ({
      x: Number.parseFloat(el.style.getPropertyValue('--_x')),
      y: Number.parseFloat(el.style.getPropertyValue('--_y')),
      color: getComputedStyle(el).backgroundColor,
      grow: Number.parseFloat(getComputedStyle(el).animationDuration) * 1000,
    }));
    expect(layer.x).toBeCloseTo(12, 0);
    expect(layer.y).toBeCloseTo(10, 0);
    expect(layer.color).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(layer.grow).toBe(await resolveToken(page, T('motion-feedback-duration'), 'duration'));
    expect(await css(container(page, id), 'background-color')).toBe(hovered);
    await expect.poll(() => ringColor(ringOf(page, id))).toContain('rgb(0, 0, 255)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
  });

  test('RAD-12 ripple: Space answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await host(page, 'selected').focus();
    await page.keyboard.down('Space');
    const center = await ripples(page, 'selected').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(center[0]).toBeCloseTo(0.5, 5);
    expect(center[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Space');
    await expect(ripples(page, 'selected')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Space');
    expect(await ripples(page, 'selected').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.keyboard.up('Space');
  });

  test('RAD-12 dim (cupertino): the pressed opacity on the whole control, no state layer', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, { [T('selected-hovered-container-color')]: 'rgb(0, 255, 0)', [T('selected-pressed-container-color')]: 'rgb(255, 0, 0)' });
    await container(page, 'selected').hover();
    // Hovered at rest before the press: a dim press changes the control's opacity, not the container's running transition.
    await expect.poll(() => settledCss(container(page, 'selected'), 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('dim');
    const root = host(page, 'selected').locator('.root');
    expect(await css(root, 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(root, 'opacity'))).toBeLessThan(1);
    expect(await css(container(page, 'selected'), 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('RAD-12 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await container(page, 'selected').hover();
    // Hovered at rest before the press (every part's transition in has ended), so a later frame of it is not read as
    // an answer to the press.
    await expect.poll(() => settledCss(container(page, 'selected'), 'background-color')).toBe(await resolveColor(page, T('selected-hovered-container-color')));
    const before = await drawn(page, 'selected', { settled: true });
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('none');
    expect(await drawn(page, 'selected')).toEqual(before);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await container(page, 'selected').hover();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('overlay');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('RAD-13 corner smoothing: the round container is unchanged by any amount; a container below full is eased (cupertino, 0.6)', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const c = await bounds(container(page, 'selected'));
    expect(Number.parseFloat(await css(container(page, 'selected'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(c.width / 2);
    expect(await css(container(page, 'selected'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    // A system whose container is a rounded square (the shape token below full, and so not a pill).
    await override(page, { [T('container-shape')]: '8px', [T('container-shape-pill')]: '0' });
    const supported = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    if (supported) {
      expect(Number.parseFloat((await css(container(page, 'selected'), 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      // The radius transitions with the state duration: wait for it to arrive.
      await expect.poll(async () => Math.round(Number.parseFloat(await css(container(page, 'selected'), 'border-top-left-radius')) * 100) / 100).toBe(Math.round(8 * 1.24 * 100) / 100);
    } else {
      await expect.poll(() => css(container(page, 'selected'), 'border-top-left-radius')).toBe('8px');
    }
  });

  test('RAD-13 focus-style: acme shows keyboard focus as a glow around the ring; the default is a ring', async ({ page }) => {
    await tabTo(page, host(page, 'selected'));
    expect(await css(ringOf(page, 'selected'), 'box-shadow', '::after')).toBe('none');
    expect(await input(page, 'selected').getAttribute('data-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, host(page, 'selected'));
    expect(await css(ringOf(page, 'selected'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(ringOf(page, 'selected'), 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await input(page, 'selected').getAttribute('data-focus-style')).toBe('glow');
  });

  test('RAD-14: a ring of ring.size in both conditions, centered in a round container.size; stroked inward at ring.width unselected, at selected-width-share of the radius (never below ring.width) selected; no dot', async ({ page }) => {
    const [s, r, w] = [await resolveToken(page, T('container-size')), await resolveToken(page, T('ring-size')), await resolveToken(page, T('ring-width'))];
    const share = Number(await token(page, T('ring-selected-width-share')));
    const selectedStroke = Math.max(w, (share * r) / 2);
    expect(selectedStroke, 'the default system thickens the selected stroke').toBeGreaterThan(w);
    for (const [id, stroke] of [['unselected', w], ['selected', selectedStroke]] as const) {
      const [c, g] = [await bounds(container(page, id)), await bounds(ringOf(page, id))];
      expect([c.width, c.height], id).toEqual([s, s]);
      expect([g.width, g.height], id).toEqual([r, r]); // the outer diameter is the same in both conditions
      expect(g.x + g.width / 2, id).toBeCloseTo(c.x + c.width / 2, 5);
      expect(g.y + g.height / 2, id).toBeCloseTo(c.y + c.height / 2, 5);
      // An inset stroke: it grows inward from the outer diameter — the ring's layer is the whole box, and its padding,
      // the same on every side, is what it paints.
      expect(await strokeOf(ringOf(page, id)), id).toBeCloseTo(stroke, 3);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        expect(await css(ringOf(page, id), side, '::before'), `${id} ${side}`).toBe('0px');
        expect(await css(ringOf(page, id), `padding-${side}`, '::before'), `${id} ${side}`).toBe(await css(ringOf(page, id), 'padding-top', '::before'));
      }
      expect(await css(ringOf(page, id), 'box-shadow'), id).toBe('none');
      expect(Number.parseFloat(await css(ringOf(page, id), 'border-top-left-radius')), id).toBe(r / 2);
      await expect(host(page, id).locator('.dot, [part~="dot"]'), id).toHaveCount(0);
    }
    // A share whose stroke is narrower than ring.width draws ring.width; 1 is a stroke as wide as the radius, a solid disc.
    for (const [value, want] of [['0', w], ['1', r / 2]] as const) {
      await override(page, { [T('ring-selected-width-share')]: value });
      await settle(page, 'selected');
      expect(await strokeOf(ringOf(page, 'selected')), `share ${value}`).toBeCloseTo(want, 3);
      expect(await bounds(ringOf(page, 'selected')), `share ${value}`).toMatchObject({ width: r, height: r });
    }
  });

  test('RAD-19: the fill is drawn in both conditions and in their error forms, inside the ring’s inner edge less fill.inset, in its condition’s fill color at fill.opacity; an inset that leaves nothing draws nothing', async ({ page }) => {
    const [r, w] = [await resolveToken(page, T('ring-size')), await resolveToken(page, T('ring-width'))];
    const opacity = Number(await token(page, T('fill-opacity')));
    const fillBox = async (id: string) => {
      const [f, g, stroke] = [await fillDisc(fillOf(page, id)), await bounds(ringOf(page, id)), await strokeOf(ringOf(page, id))];
      return { f, g, stroke };
    };
    // Both conditions, at rest and disabled: the fill exists, fills the inside of the ring (inset 0 by default), and
    // takes its condition's fill color at the fill opacity.
    const inset0 = await resolveToken(page, T('fill-inset'));
    for (const [id, condition, state] of [['unselected', 'unselected', ''], ['selected', 'selected', ''], ['error-unselected', 'error-unselected', ''], ['error-selected', 'error-selected', ''], ['disabled-unselected', 'unselected', 'disabled'], ['disabled-selected', 'selected', 'disabled']] as const) {
      await expect(fillOf(page, id), id).toHaveCount(1);
      const { f, g, stroke } = await fillBox(id);
      const inner = r - 2 * stroke - 2 * inset0;
      expect(f.width, id).toBeCloseTo(inner, 1);
      expect(f.height, id).toBeCloseTo(inner, 1);
      // Never under the ring: its edge is the ring's inner edge (plus the inset).
      expect(f.x - g.x, id).toBeCloseTo(stroke + inset0, 1);
      expect(f.y - g.y, id).toBeCloseTo(stroke + inset0, 1);
      const name = T(`${condition}-${state ? `${state}-` : ''}fill-color`);
      expect((await drawn(page, id)).fill, id).toBe(await resolveFill(page, name));
      const [painted, color] = [await rgba(page, (await drawn(page, id)).fill), await rgba(page, await resolveColor(page, name))];
      expect(painted.a, id).toBeCloseTo(color.a * opacity, 1);
    }
    // The default system leaves the unselected inside clear.
    expect((await rgba(page, (await drawn(page, 'unselected')).fill)).a).toBe(0);
    expect((await rgba(page, (await drawn(page, 'selected')).fill)).a).toBeGreaterThan(0);
    // The error forms likewise: no fill while unselected, and the selected fill is the error ring's color at fill.opacity.
    expect((await rgba(page, (await drawn(page, 'error-unselected')).fill)).a).toBe(0);
    expect((await drawn(page, 'error-selected')).fill).toBe(await resolveFill(page, T('error-selected-ring-color')));
    // A layer that colors the unselected fill sees it drawn, at fill.opacity, inside the thin ring.
    await override(page, { [T('unselected-fill-color')]: 'rgb(0, 128, 0)', [T('fill-inset')]: '3px' });
    await settle(page, 'unselected');
    await settle(page, 'selected');
    // The color is compared as the engine computes it, not as a canvas hands it back: a canvas keeps a translucent
    // color multiplied by its alpha in 8 bits, and dividing it out again gives 127 for 128 in Firefox (the computed
    // color is `color(srgb 0 0.501961 0 / 0.5)` in every engine). The canvas is asked for the alpha alone.
    expect(await resolveColor(page, T('unselected-fill-color')), 'the layer’s color is the token’s').toBe('rgb(0, 128, 0)');
    const greenFill = (await drawn(page, 'unselected')).fill;
    expect(greenFill, 'the token’s color at fill.opacity, exactly').toBe(await resolveFill(page, T('unselected-fill-color')));
    expect(greenFill, 'and that color is the green, not another').toBe(await page.evaluate((o) => {
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;visibility:hidden;background-color:color-mix(in srgb, rgb(0, 128, 0) ${o * 100}%, transparent)`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    }, opacity));
    expect((await rgba(page, greenFill)).a).toBeCloseTo(opacity, 1);
    for (const id of ['unselected', 'selected']) {
      const { f, g, stroke } = await fillBox(id);
      expect(f.width, `${id} inset 3`).toBeCloseTo(r - 2 * stroke - 6, 1);
      expect(f.x - g.x, `${id} inset 3`).toBeCloseTo(stroke + 3, 1);
    }
    expect((await fillBox('unselected')).stroke).toBeCloseTo(w, 3);
    // An inset as large as the ring's radius leaves a fill of no size: nothing is drawn.
    await override(page, { [T('fill-inset')]: `${r / 2}px` });
    await settle(page, 'selected');
    const none = await fillDisc(fillOf(page, 'selected'));
    expect(none.width === 0 || none.height === 0).toBe(true);
  });

  test('RAD-7 / RAD-15: a part a state recolors changes over the state motion; the same part changes over the selection motion when the condition changes', async ({ page }) => {
    await mountGroup(page, [{}, {}]);
    await override(page, {
      [T('motion-state-duration')]: '300ms',
      [T('motion-selection-duration')]: '700ms',
      [T('unselected-hovered-ring-color')]: 'rgb(0, 0, 255)',
    });
    await page.mouse.move(0, 0);
    // Each motion is counted as the engine announces it, not asked for a round trip after the change that began it.
    await watchTransitions(host(page, 'o0'));
    await container(page, 'o0').hover();
    await expect.poll(() => begun(page, 'o0')).toContain('ring background-color 300');
    await page.mouse.move(0, 0);
    await expect.poll(() => ringRunning(ringOf(page, 'o0'), 'background-color')).toBe(null);
    await watchTransitions(host(page, 'o0'));
    await host(page, 'o0').evaluate((el) => ((el as any).checked = true));
    // The stroke (the padding of both layers, RAD-24) and both colors, together.
    await expect.poll(() => begun(page, 'o0')).toEqual(expect.arrayContaining(['ring padding-top 700', 'ring background-color 700', 'fill padding-top 700', 'fill background-color 700']));
    // The option it replaced changes over the selection motion as well: it changed condition too. The motions of the
    // check are over first (waited for, not timed: one still running would be turned back, and a transition turned back
    // part of the way is shortened to the part it goes back).
    await motionEnded(host(page, 'o0'));
    await tabTo(page, host(page, 'o0'));
    await watchTransitions(host(page, 'o0'));
    await watchTransitions(host(page, 'o1'));
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => begun(page, 'o0')).toContain('ring padding-top 700');
    await expect.poll(() => begun(page, 'o1')).toContain('fill background-color 700');
  });

  test('RAD-12 ripple: a press on the label, outside the container, grows it from the container’s center', async ({ page }) => {
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

  /**
   * Samples one option at 41 moments from now to `ms`, while `checked` is set at the times given: the ring's stroke, its
   * color, the fill's color (8-bit RGBA) and the fill's size and offset from the ring. The moments are not the frames
   * the machine happens to draw (an engine that paints without a GPU draws two or three in a second): every transition
   * of the option is held and set to the time since it began, and the option is read there — what a frame drawn at
   * that moment would show, and as many of them on a slow machine as on a fast one.
   */
  const sample = (page: P, id: string, ms: number, acts: [number, boolean][]) =>
    host(page, id).evaluate(
      async (el, [source, total, steps]) => {
        const toRgba = (0, eval)(source) as (c: string) => Rgba;
        const root = el.shadowRoot!;
        const [ring, fill] = [root.querySelector('.ring')!, root.querySelector('.fill')!];
        const frames: { t: number; stroke: number; ring: string; fill: Rgba; size: number; offset: number }[] = [];
        const began = new WeakMap<Animation, number>();
        const due = [...steps];
        const moments = 40;
        for (let i = 0; i <= moments; i++) {
          const t = (total * i) / moments;
          while (due.length > 0 && due[0]![0] <= t) {
            (el as any).checked = due.shift()![1];
            await (el as any).updateComplete;
          }
          // A transition a change has just begun starts here; one begun earlier is where its own time has got to. One
          // that a later change replaced is no longer listed: the new one began from the value this one was held at.
          for (const animation of root.getAnimations()) {
            if (!began.has(animation)) began.set(animation, t);
            animation.pause();
            animation.currentTime = Math.min(t - began.get(animation)!, Number(animation.effect!.getComputedTiming().endTime));
          }
          // The ring is the box's ::before and its stroke that layer's padding; the fill paints its own content box,
          // inside its own padding (RAD-24): the two paddings are one value on one timeline.
          const [layer, own] = [getComputedStyle(ring, '::before'), getComputedStyle(fill)];
          const [g, f, pad] = [ring.getBoundingClientRect(), fill.getBoundingClientRect(), Number.parseFloat(own.paddingLeft)];
          frames.push({ t, stroke: Number.parseFloat(layer.paddingTop), ring: layer.backgroundColor, fill: toRgba(own.backgroundColor), size: Math.max(0, f.width - 2 * pad), offset: f.left + pad - g.left });
        }
        for (const animation of root.getAnimations()) animation.finish();
        return frames;
      },
      [RGBA_SOURCE, ms, acts] as const,
    );

  test('RAD-15: becoming selected thickens the stroke inward, recolors the ring and runs the fill’s color from none to the fill color — its edge on the ring, never growing — and the reverse; reduced motion shows it at once and in full', async ({ page }) => {
    await mountGroup(page, [{}, {}]);
    const [r, w] = [await resolveToken(page, T('ring-size')), await resolveToken(page, T('ring-width'))];
    const S = Math.max(w, (Number(await token(page, T('ring-selected-width-share'))) * r) / 2);
    const inset = await resolveToken(page, T('fill-inset'));
    // The selection motion's own tokens, read while a change of condition runs.
    const duration = await resolveToken(page, T('motion-selection-duration'), 'duration');
    await watchTransitions(host(page, 'o0'));
    await host(page, 'o0').evaluate((el) => ((el as any).checked = true));
    await expect.poll(() => begun(page, 'o0')).toEqual(expect.arrayContaining([`ring padding-top ${duration}`, `ring background-color ${duration}`, `fill background-color ${duration}`]));
    await host(page, 'o0').evaluate((el) => ((el as any).checked = false));
    await settle(page, 'o0');
    // A fill color that would show a pass through black: blue, fading from the transparent unselected fill. At half
    // opacity: the default system's light tint (16 %) leaves a frame's channels a few levels of 8-bit precision, which
    // WebKit rounds before it un-premultiplies them, and the path of the color is what is read here, not its strength.
    await override(page, { [T('motion-selection-duration')]: '1200ms', [T('motion-selection-easing')]: 'linear', [T('selected-fill-color')]: 'rgb(0, 0, 255)', [T('fill-opacity')]: '0.5' });
    const opacity = Number(await token(page, T('fill-opacity')));
    const select = await sample(page, 'o0', 1500, [[0, true]]);
    const middle = select.filter((f) => f.stroke > w + 0.2 && f.stroke < S - 0.2);
    expect(middle.length, 'frames between the two strokes').toBeGreaterThan(2);
    for (const f of middle) {
      // The fill's edge is the ring's inner edge at that moment (less the inset): the ring covers more of the inside,
      // the fill does not scale towards the center.
      expect(f.size, `t=${f.t}`).toBeCloseTo(r - 2 * f.stroke - 2 * inset, 0);
      expect(f.offset, `t=${f.t}`).toBeCloseTo(f.stroke + inset, 0);
      // Its opacity fades in; its color is the fill color throughout.
      expect(f.fill.a, `t=${f.t}`).toBeGreaterThan(0);
      expect(f.fill.a, `t=${f.t}`).toBeLessThan(opacity);
      if (f.fill.a > 0.1) expect([f.fill.r, f.fill.g, Math.abs(f.fill.b - 255) <= 8], `t=${f.t}`).toEqual([0, 0, true]);
    }
    // The stroke only thickens; the ring's color is between the two while it does.
    for (let i = 1; i < select.length; i++) expect(select[i].stroke).toBeGreaterThanOrEqual(select[i - 1].stroke - 0.01);
    const [unselectedRing, selectedRing] = [await resolveColor(page, T('unselected-ring-color')), await resolveColor(page, T('selected-ring-color'))];
    expect(middle.some((f) => !f.ring.includes(unselectedRing) && !f.ring.includes(selectedRing)), 'the ring color moves').toBe(true);
    const end = select.at(-1)!;
    expect(end.stroke).toBeCloseTo(S, 3);
    expect(end.fill.a).toBeCloseTo(opacity, 1);
    // The reverse: the stroke thins back towards the outer diameter, the fill fades out without darkening.
    const unselect = await sample(page, 'o0', 1500, [[0, false]]);
    const back = unselect.filter((f) => f.stroke > w + 0.2 && f.stroke < S - 0.2);
    expect(back.length).toBeGreaterThan(2);
    for (const f of back) {
      expect(f.size, `t=${f.t}`).toBeCloseTo(r - 2 * f.stroke - 2 * inset, 0);
      if (f.fill.a > 0.1) expect([f.fill.r, f.fill.g, Math.abs(f.fill.b - 255) <= 8], `t=${f.t}`).toEqual([0, 0, true]);
    }
    for (let i = 1; i < unselect.length; i++) expect(unselect[i].stroke).toBeLessThanOrEqual(unselect[i - 1].stroke + 0.01);
    expect(unselect.at(-1)!.stroke).toBeCloseTo(w, 3);
    expect(unselect.at(-1)!.fill.a).toBe(0);
    // Reduced motion: the new condition in the first frame, in full — no frame in between.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const instant = await sample(page, 'o0', 300, [[0, true]]);
    const after = instant.filter((f) => f.stroke !== w);
    expect(after.length).toBeGreaterThan(0);
    for (const f of after) {
      expect(f.stroke).toBeCloseTo(S, 3);
      expect(f.fill.a).toBeCloseTo(opacity, 1);
    }
    expect(await ringOf(page, 'o0').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  });

  test('RAD-20: a change of condition before the selection motion ends turns back from the stroke and colors it has reached, without a jump to either end', async ({ page }) => {
    await mountGroup(page, [{}, {}]);
    const [r, w] = [await resolveToken(page, T('ring-size')), await resolveToken(page, T('ring-width'))];
    const S = Math.max(w, (Number(await token(page, T('ring-selected-width-share'))) * r) / 2);
    const opacity = Number(await token(page, T('fill-opacity')));
    const duration = 1600;
    await override(page, { [T('motion-selection-duration')]: `${duration}ms`, [T('motion-selection-easing')]: 'linear', [T('selected-fill-color')]: 'rgb(0, 0, 255)' });
    // Select, and unselect again within half the selection duration.
    const frames = await sample(page, 'o0', duration * 1.5, [[0, true], [duration * 0.35, false]]);
    const peak = Math.max(...frames.map((f) => f.stroke));
    expect(peak, 'turned back before the selected end').toBeLessThan(S - 0.2);
    expect(peak, 'the motion had started').toBeGreaterThan(w + 0.2);
    expect(Math.max(...frames.map((f) => f.fill.a)), 'the fill never reached its full color').toBeLessThan(opacity - 0.02);
    // No jump: the stroke and the fill's opacity move by little from one frame to the next — a jump to either end
    // would move the stroke by the whole distance left, or the fill to full or none, at once.
    const steps = frames.slice(1).map((f, i) => ({ stroke: Math.abs(f.stroke - frames[i].stroke), alpha: Math.abs(f.fill.a - frames[i].fill.a), t: f.t }));
    for (const s of steps) {
      expect(s.stroke, `t=${s.t}`).toBeLessThan((S - w) / 4);
      expect(s.alpha, `t=${s.t}`).toBeLessThan(opacity / 4);
    }
    // It went back from where it was: the frames after the peak thin, down to the unselected stroke.
    const top = frames.findIndex((f) => f.stroke === peak);
    for (let i = top + 1; i < frames.length; i++) expect(frames[i].stroke).toBeLessThanOrEqual(frames[i - 1].stroke + 0.01);
    expect(frames.at(-1)!.stroke).toBeCloseTo(w, 3);
    expect(frames.at(-1)!.fill.a).toBe(0);
  });
});

test.describe('layout', () => {
  test('RAD-21: each option takes option.min-height in layout, the container centered; stacked with no gap, each hit area is its own and a press on a boundary selects exactly one; a lower token packs them to it', async ({ page }) => {
    await mountGroup(page, [{}, {}, {}]);
    // Stacked with no space between them: the options themselves are the column's items. Each is still inside its
    // fixture's stage, whose padding (16 above and below) is the harness's and would stand between two options; the
    // stage is taken out of the layout, so that an option meets the next one as it does in a product's group.
    await page.evaluate(() => {
      Object.assign(document.querySelector<HTMLElement>('#group')!.style, { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' });
      for (const stage of document.querySelectorAll<HTMLElement>('#group > .stage')) stage.style.display = 'contents';
    });
    expect(await page.locator('#group > .stage > tanrei-radio-button').count()).toBe(3);
    const tall = await resolveToken(page, T('option-min-height'));
    expect(tall).toBe(await resolveToken(page, '--tanrei-sys-target-touch'));
    const boxes = await Promise.all(['o0', 'o1', 'o2'].map((id) => bounds(host(page, id))));
    for (const [i, b] of boxes.entries()) {
      expect(b.height, `o${i}`).toBeCloseTo(tall, 3);
      const c = await bounds(container(page, `o${i}`));
      expect(c.y + c.height / 2, `o${i}: the container is centered`).toBeCloseTo(b.y + b.height / 2, 3);
      if (i) expect(b.y, `o${i} meets o${i - 1}`).toBeCloseTo(boxes[i - 1].y + boxes[i - 1].height, 3);
    }
    // Each option's whole height is its own hit area: the top and bottom rows of each hit that option.
    const c0 = await bounds(container(page, 'o0'));
    const x = c0.x + c0.width / 2;
    const hitAt = (y: number) => page.evaluate(([px, py]) => (document.elementFromPoint(px, py) as any)?.value ?? null, [x, y] as const);
    // (A whole pixel row inside each edge: a point half a pixel from an edge is rounded to a row before it is hit-tested,
    // and half a pixel above an option's last edge rounds onto the next option's first row.)
    for (const [i, b] of boxes.entries()) {
      expect(await hitAt(Math.ceil(b.y)), `o${i} top`).toBe(`v${i}`);
      expect(await hitAt(Math.floor(b.y + b.height) - 1), `o${i} bottom`).toBe(`v${i}`);
    }
    // A press on each side of a boundary selects exactly the option it is in.
    await listenAll(page);
    const boundary = boxes[1].y;
    await page.mouse.click(x, boundary - 1);
    expect(await selected(page)).toEqual(['v0']);
    await page.mouse.click(x, boundary + 1);
    expect(await selected(page)).toEqual(['v1']);
    expect((await events(page)).change).toEqual(['v0:true', 'v1:true']);
    // A layer that lowers the token packs the options to it.
    const side = await resolveToken(page, T('container-size'));
    const lower = (side + tall) / 2;
    await override(page, { [T('option-min-height')]: `${lower}px` });
    const packed = await Promise.all(['o0', 'o1', 'o2'].map((id) => bounds(host(page, id))));
    for (const [i, b] of packed.entries()) {
      expect(b.height, `o${i} packed`).toBeCloseTo(lower, 3);
      if (i) expect(b.y, `o${i} packed`).toBeCloseTo(packed[i - 1].y + lower, 3);
    }
  });
});

test.describe('accessibility', () => {
  test('RAD-16: role radio with checked or not, its position in its group and the group’s size; the group is a named radio group', async ({ page }) => {
    await mountGroup(page, [{}, { checked: true }, { disabled: true }]);
    expect(await page.locator('#group').ariaSnapshot()).toBe(
      ['- radiogroup "Size":', '  - radio "Option 0"', '  - radio "Option 1" [checked]', '  - radio "Option 2" [disabled]'].join('\n'),
    );
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-radio-button')].map((el) => { const i = el.shadowRoot!.querySelector('input')!; return `${i.getAttribute('aria-posinset')}/${i.getAttribute('aria-setsize')}`; }))).toEqual(['1/3', '2/3', '3/3']);
    await expect(page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: 'Option 1', checked: true })).toHaveCount(1);
  });

  test('RAD-17: the label sits at the inline end of the container, label.gap away, in label.typescale, wrapping, the control centered on its first line; RTL mirrors it', async ({ page }) => {
    await mountFixtures(page, spec);
    const gap = await resolveToken(page, T('label-gap'));
    const [c, l] = [await bounds(container(page, 'unselected')), await bounds(labelOf(page, 'unselected'))];
    expect(l.x - (c.x + c.width)).toBeCloseTo(gap, 5);
    expect(Number.parseFloat(await css(labelOf(page, 'unselected'), 'font-size'))).toBe(await resolveToken(page, T('label-typescale-font-size')));
    expect(await css(labelOf(page, 'unselected'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    await mountFixtures(page, spec, { fixtures: [fixture('long', { name: 'n', value: 'x', label: 'Every other week, on the first working day' })] });
    await page.evaluate(() => (document.querySelector<HTMLElement>('.stage')!.style.inlineSize = '140px'));
    const lines = await labelOf(page, 'long').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.y))).size;
    });
    expect(lines).toBeGreaterThan(1);
    // The control is centered on the label's first line, also when the line is taller than the control.
    await override(page, { [T('label-typescale-font')]: '400 40px/1.5 Inter' });
    const first = await labelOf(page, 'long').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = range.getClientRects()[0];
      return rect.y + rect.height / 2;
    });
    const tall = await bounds(container(page, 'long'));
    expect(Math.abs(tall.y + tall.height / 2 - first)).toBeLessThanOrEqual(1);
    await override(page, { [T('label-typescale-font')]: '' });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [rc, rl] = [await bounds(container(page, 'long')), await bounds(labelOf(page, 'long'))];
    expect(rc.x - (rl.x + rl.width)).toBeCloseTo(gap, 5);
  });

  test('RAD-18: label-hidden draws no label and keeps the name; an empty label still renders and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('nameless', { name: 'x', value: 'y' })] });
    await expect(labelOf(page, 'label-hidden')).toHaveCount(0);
    await expect(host(page, 'label-hidden').getByRole('radio', { name: 'Weekly', checked: true })).toHaveCount(1);
    expect((await bounds(host(page, 'label-hidden'))).width).toBe(await resolveToken(page, T('container-size')));
    expect((await bounds(container(page, 'nameless'))).width).toBe(await resolveToken(page, T('container-size')));
    await expect.poll(() => seen.filter((w) => w.includes('RAD-18'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('RAD-18'))).toMatch(/<tanrei-radio-button>: label is empty/);
  });

  test('RAD-25: in a radio group the radio button takes its group from it and from nothing else — selected follows the group’s value, name is ignored, it is disabled while the group is, and its selection is reported by the group’s change and by no event of its own; outside one, the radio buttons of one name form a group as before; one in no group at all still renders, is selectable as a group of one, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [] });
    await page.evaluate(async () => {
      document.querySelector('main')!.innerHTML = `
        <form id="in">
          <tanrei-radio-group id="group" label="Delivery" name="delivery" value="express">
            <tanrei-radio-button name="mine" value="standard" label="Standard" checked></tanrei-radio-button>
            <tanrei-radio-button name="other" value="express" label="Express"></tanrei-radio-button>
            <tanrei-radio-button value="pickup" label="Pick up"></tanrei-radio-button>
          </tanrei-radio-group>
          <tanrei-radio-button name="mine" value="outside" label="Outside the group" checked></tanrei-radio-button>
          <tanrei-radio-button name="mine" value="beside" label="Beside it"></tanrei-radio-button>
        </form>
        <tanrei-radio-button id="alone" value="alone" label="Alone"></tanrei-radio-button>`;
      for (const el of document.querySelectorAll('main *')) await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const log: string[] = ((window as unknown as { heard: string[] }).heard = []);
      // `change` is heard in the capture phase, where nothing can have stopped it yet; `input` as it bubbles (the native
      // control's own `input` crosses the shadow root on its way down, inside a group and outside one).
      for (const type of ['input', 'change']) document.addEventListener(type, (event) => log.push(`${type} ${(event.target as Element).localName} ${(event as CustomEvent<{ value?: string }>).detail?.value ?? ''}`.trim()), type === 'change');
    });
    const inside = page.locator('#group tanrei-radio-button');
    const outside = page.locator('#in > tanrei-radio-button');
    const state = (all: Locator) => all.evaluateAll((els) => els.map((el) => { const native = el.shadowRoot!.querySelector('input')!; return `${(el as HTMLElement & { checked: boolean }).checked ? 'on' : 'off'} ${native.getAttribute('aria-posinset')}/${native.getAttribute('aria-setsize')} ${native.tabIndex}${native.disabled ? ' disabled' : ''}`; }));
    const entries = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#in')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    // In the group: selected follows the group's value (not its own attribute), its position and its tab stop are the
    // group's, whatever its name; it submits nothing itself.
    expect(await state(inside)).toEqual(['off 1/3 -1', 'on 2/3 0', 'off 3/3 -1']);
    // Outside it, the two of one name are a group as before — and the one of that name inside the group is not in it.
    expect(await state(outside)).toEqual(['on 1/2 0', 'off 2/2 -1']);
    expect(await entries()).toEqual(['delivery=express', 'mine=outside']);
    // Its selection by the person: the group's events, and none of its own.
    await inside.nth(0).locator('.container').click();
    await expect.poll(() => state(inside)).toEqual(['on 1/3 0', 'off 2/3 -1', 'off 3/3 -1']);
    expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(['input tanrei-radio-group', 'change tanrei-radio-group standard']);
    expect(await state(outside), 'selecting "mine" inside the group clears nothing of that name outside it').toEqual(['on 1/2 0', 'off 2/2 -1']);
    expect(await entries()).toEqual(['delivery=standard', 'mine=outside']);
    // The arrow keys are the group's inside it, and the name's outside it.
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => state(inside)).toEqual(['off 1/3 -1', 'on 2/3 0', 'off 3/3 -1']);
    await outside.nth(0).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => state(outside)).toEqual(['off 1/2 -1', 'on 2/2 0']);
    expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard.slice(2))).toEqual(['input tanrei-radio-group', 'change tanrei-radio-group express', 'input tanrei-radio-button', 'change tanrei-radio-button beside']);
    // A form reset is the group's inside it (its first value), the radio button's own outside it (its attribute).
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#in')!.reset());
    await expect.poll(() => state(inside)).toEqual(['off 1/3 -1', 'on 2/3 0', 'off 3/3 -1']);
    await expect.poll(() => state(outside)).toEqual(['on 1/2 0', 'off 2/2 -1']);
    // Disabled while the group is, and enabled again with it.
    await page.locator('#group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect.poll(() => state(inside)).toEqual(['off 1/3 -1 disabled', 'on 2/3 -1 disabled', 'off 3/3 -1 disabled']);
    expect(await state(outside)).toEqual(['on 1/2 0', 'off 2/2 -1']);
    await page.locator('#group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(() => state(inside)).toEqual(['off 1/3 -1', 'on 2/3 0', 'off 3/3 -1']);
    // In no group at all: it renders, is a group of one, can be selected, and is reported — the others are not.
    const alone = page.locator('#alone');
    await expect(alone).toBeVisible();
    expect(await state(alone)).toEqual(['off 1/1 0']);
    await alone.locator('.container').click();
    expect(await state(alone)).toEqual(['on 1/1 0']);
    expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard.slice(-2))).toEqual(['input tanrei-radio-button', 'change tanrei-radio-button alone']);
    const reports = seen.filter((w) => w.includes('<tanrei-radio-button>') && w.includes('RAD-25'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatch(/<tanrei-radio-button>: the radio button stands in no group/);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
    await mountGroup(page, [{}, { checked: true }, { disabled: true }]);
    const results = await new AxeBuilder({ page }).include('main').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('forced colors: the ring keeps a visible stroke, thicker when selected, where the engine has the mode; the fill is not drawn', async ({ page }) => {
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
    expect((await rgba(page, await ringColor(ringOf(page, 'unselected')))).a).toBe(1);
    expect(await strokeOf(ringOf(page, 'unselected'))).toBeGreaterThan(0);
    expect(await strokeOf(ringOf(page, 'selected'))).toBeGreaterThan(await strokeOf(ringOf(page, 'unselected')));
    // Settled: the mode arrived after the fixture was drawn, and the fill's color leaves over the state motion.
    expect((await rgba(page, await settledCss(fillOf(page, 'selected'), 'background-color'))).a).toBe(0);
  });

  test('RAD-27: in forced colors the error forms are drawn exactly as the same condition out of error — the ring in the platform’s colors, the stroke’s weight carrying the selection — and show no error color: the two error fixtures are the pixels of unselected and selected', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    for (const [id, plain] of [['error-unselected', 'unselected'], ['error-selected', 'selected']] as const) {
      await settle(page, id);
      await settle(page, plain);
      expect(await ringColor(ringOf(page, id)), `${id}: the ring’s color`).toBe(await ringColor(ringOf(page, plain)));
      expect(await strokeOf(ringOf(page, id)), `${id}: the stroke`).toBe(await strokeOf(ringOf(page, plain)));
      expect((await rgba(page, await settledCss(fillOf(page, id), 'background-color'))).a, `${id}: no fill`).toBe(0);
      expect(await css(labelOf(page, id), 'color'), `${id}: the label`).toBe(await css(labelOf(page, plain), 'color'));
      const [a, b] = [await page.locator(`[data-fixture="${id}"]`).screenshot({ animations: 'disabled' }), await page.locator(`[data-fixture="${plain}"]`).screenshot({ animations: 'disabled' })];
      expect(a.equals(b), `${id} is the pixels of ${plain}`).toBe(true);
    }
    expect(await strokeOf(ringOf(page, 'error-selected'))).toBeGreaterThan(await strokeOf(ringOf(page, 'error-unselected')));
  });
});

// RAD-24: what the radio button paints where its ring and its fill meet, read from the pixels (test/one-shape.ts).
test.describe('one shape', () => {
  const SELECTED = ['selected', 'disabled-selected'];
  // What a gap shows is what is behind, a pixel wide at worst (255 levels of a channel here) and never less than a
  // quarter of it; two shares each rounded to 8 bits and then summed may be 2 levels off.
  const TOLERANCE = 3;
  const mount = async (page: P, offset: number, options: Parameters<typeof mountFixtures>[2] = {}) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => SELECTED.includes(f.id)), ...options });
    await stageBehind(page, offset);
    await page.mouse.move(0, 0);
  };
  /** The two colors the radio button paints at this moment. */
  const parts = (page: P, id: string) => ringOf(page, id).evaluate((el) => ({ ring: getComputedStyle(el, '::before').backgroundColor, fill: getComputedStyle(el.querySelector('.fill')!).backgroundColor }));
  /** The pixel inside the ring's outer diameter farthest from a mix of the ring's and the fill's colors, each composited once on what is behind. */
  const read = async (page: P, id: string) => {
    const p = await parts(page, id);
    const [ring, fill] = [await paintedBehind(page, p.ring), await paintedBehind(page, p.fill)];
    const shot = await shoot(page);
    return { ...worst(shot, await shot.box(ringOf(page, id)), Number.POSITIVE_INFINITY, ring, fill), ring, fill };
  };

  for (const ratio of RATIOS) {
    test(`RAD-24: at a device pixel ratio of ${ratio}, on the pixel grid and half a device pixel off it, every pixel inside the ring's outer edge is the ring's color, the fill's, or a share of the two — nothing behind shows between them, and neither is over the other`, async ({ browser }) => {
      test.setTimeout(90_000);
      await atRatio(browser, ratio, async (page) => {
        for (const offset of [0, 0.5]) {
          await mount(page, offset);
          for (const id of SELECTED) {
            const r = await read(page, id);
            // The two differ (the fill is the ring's color at fill.opacity), so a pixel is on the line between them.
            expect(r.ring, id).not.toEqual(r.fill);
            expect(r.read, `${id} at +${offset}`).toBeGreaterThan(0);
            expect(r.off, `${id} at +${offset}: ${r.pixel} at ${r.at}, between ${r.ring} and ${r.fill}`).toBeLessThanOrEqual(TOLERANCE);
          }
        }
      });
    });
  }

  for (const ratio of [1.25, 1.5]) {
    test(`RAD-24: at a device pixel ratio of ${ratio}, in every frame read of the selection motion, both ways, the fill's edge is the ring's inner edge: no pixel between them shows what is behind`, async ({ browser }) => {
      test.setTimeout(90_000);
      await atRatio(browser, ratio, async (page) => {
        await mount(page, 0.5);
        // A fill that is there in both conditions, so that the edge the two share can be read all the way.
        await override(page, { [T('unselected-fill-color')]: 'rgb(0, 128, 0)' });
        const el = host(page, 'selected');
        await endMotion(el);
        for (const checked of [false, true]) {
          await el.evaluate(async (node: any, value: boolean) => {
            node.checked = value;
            await node.updateComplete;
          }, checked);
          const strokes: number[] = [];
          for (const share of [0.2, 0.5, 0.8]) {
            await holdMotionAt(el, share);
            strokes.push(await strokeOf(ringOf(page, 'selected')));
            // One padding on one timeline: the fill's is the ring's in this frame.
            expect(await css(fillOf(page, 'selected'), 'padding-top')).toBe(await css(ringOf(page, 'selected'), 'padding-top', '::before'));
            const r = await read(page, 'selected');
            expect(r.read).toBeGreaterThan(0);
            expect(r.off, `${checked ? 'selecting' : 'unselecting'} at ${share}: ${r.pixel} at ${r.at}, between ${r.ring} and ${r.fill}`).toBeLessThanOrEqual(TOLERANCE);
          }
          // The frames were frames of the motion: the stroke was on its way.
          expect(new Set(strokes).size, `${strokes}`).toBe(3);
          await endMotion(el);
        }
      });
    });
  }

  test('RAD-24: under m3-like, whose fill.inset is above 0, the space between the ring and the dot shows what is behind, as wide as the inset all round', async ({ browser }) => {
    test.setTimeout(90_000);
    // Whole ratios: the dot's layer is placed by a margin, which an engine snaps to the pixel grid on its own, so at a
    // fractional ratio the dot may sit half a device pixel off the ring's center (it never touches the ring).
    for (const ratio of [2, 3]) {
      await atRatio(browser, ratio, async (page) => {
        await mount(page, 0, { system: 'm3-like' });
        const [inset, stroke, size] = [await resolveToken(page, T('fill-inset')), await strokeOf(ringOf(page, 'selected')), await resolveToken(page, T('ring-size'))];
        expect(inset).toBeGreaterThan(0);
        const behind = await paintedBehind(page, BEHIND);
        const shot = await shoot(page);
        const box = await shot.box(ringOf(page, 'selected'));
        // Every pixel wholly inside the space — clear of the antialiasing of the ring's inner edge and of the dot's
        // edge — is what is behind; and the space is there on every side of the dot.
        const [outer, inner] = [stroke * shot.ratio + INSIDE, (stroke + inset) * shot.ratio - INSIDE];
        expect(inner - outer, 'the space is wide enough to read').toBeGreaterThan(1);
        const seen = { top: 0, right: 0, bottom: 0, left: 0 };
        for (let y = Math.floor(box.y); y < Math.ceil(box.y + box.height); y++) {
          for (let x = Math.floor(box.x); x < Math.ceil(box.x + box.width); x++) {
            const d = depth(box, x, y, Number.POSITIVE_INFINITY);
            if (d <= outer || d >= inner) continue;
            expect(offLine(shot.rgb(x, y), behind, behind), `ratio ${ratio}: ${shot.rgb(x, y)} at ${x},${y}, ${d} inside`).toBeLessThanOrEqual(TOLERANCE);
            const [dx, dy] = [x + 0.5 - (box.x + box.width / 2), y + 0.5 - (box.y + box.height / 2)];
            seen[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top']++;
          }
        }
        for (const [side, count] of Object.entries(seen)) expect(count, `ratio ${ratio}: ${side}`).toBeGreaterThan(0);
        expect(Math.max(...Object.values(seen)) - Math.min(...Object.values(seen)), `ratio ${ratio}: ${JSON.stringify(seen)}`).toBeLessThanOrEqual(Math.ceil(size * shot.ratio * 0.15));
        // The dot inside it is the fill, whole: the center is the fill's color.
        const fill = await paintedBehind(page, (await parts(page, 'selected')).fill);
        expect(offLine(shot.rgb(Math.floor(box.x + box.width / 2), Math.floor(box.y + box.height / 2)), fill, fill)).toBeLessThanOrEqual(TOLERANCE);
      });
    }
  });
});

test.describe('form', () => {
  test('the selected option of a named group submits its value; a reset returns every option to its checked attribute', async ({ page }) => {
    await mountGroup(page, [{}, { checked: true }, {}]);
    await page.evaluate(() => {
      const form = document.createElement('form');
      const group = document.querySelector('#group')!;
      group.replaceWith(form);
      form.append(group);
    });
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
    await expect.poll(data).toEqual(['size=v1']);
    await container(page, 'o2').click();
    expect(await data()).toEqual(['size=v2']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    await expect.poll(() => selected(page)).toEqual(['v1']);
    expect(await data()).toEqual(['size=v1']);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  test('every fixture is mounted and visible, in the condition, the error form and the state the spec gives it', async ({ page }) => {
    // Five, and the two error forms.
    expect(spec.fixtures.map((f) => f.id)).toEqual(['unselected', 'selected', 'error-unselected', 'error-selected', 'disabled-unselected', 'disabled-selected', 'label-hidden']);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      expect(await host(page, f.id).evaluate((el) => [(el as any).checked, (el as any).error, (el as any).disabled, el.shadowRoot!.querySelector('.root')!.hasAttribute('data-error')]), f.id).toEqual([f.props.selected === true, f.props.error === true, f.props.disabled === true, f.props.error === true]);
      await expect(labelOf(page, f.id), f.id).toHaveCount(f.props.labelHidden ? 0 : 1);
      await expect(page.locator(`[data-fixture="${f.id}"]`).getByRole('radio', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
