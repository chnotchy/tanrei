// <tanrei-switch>, driven by specs/switch.spec.json: every behaviour id (SWT-1…25) is cited by a test title, every
// fixture has a baseline, and every condition, state and choice of kind is read back from the tokens — never from a
// number written here. A drag (SWT-19…21) is dispatched in the page, each event stamped with the time the pointer was
// there, so a release's velocity is the test's own; one test drives the real mouse, for the click that follows it.
// SWT-26: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { decodePng } from '../../../test/png.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';
import {
  type Fixture,
  acmeSystemCss,
  iconFamilies,
  loadSpec,
  mountFixtures,
  presetFontFaces,
  resolveColor as tokenColor,
  resolveToken,
  tab,
  tabTo,
  rootTokens,
} from '../../../test/harness.js';
import { clickCentre, heldPress } from '../../../test/watched-press.js';
import { motionEnded } from '../../../test/motions.js';
import { STOPPED_AFTER, flingThenHold } from '../../../test/stopped-release.js';

const spec = loadSpec('switch');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-switch`);
const input = (page: P, id: string) => host(page, id).locator('input');
const container = (page: P, id: string) => host(page, id).locator('.container');
const trackOf = (page: P, id: string) => host(page, id).locator('.track');
const handleOf = (page: P, id: string) => host(page, id).locator('.handle');
const labelOf = (page: P, id: string) => host(page, id).locator('.label');
/**
 * A color the switch mixes (SWT-19) is serialized as `color(srgb r g b / a)`, a token's own as `rgb(r, g, b)`: both are
 * read in the legacy form, so the same color is the same string.
 */
const legacy = (value: string) =>
  value.replace(/color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/g, (_, r, g, b, a) => {
    const [R, G, B] = [r, g, b].map((c) => Math.round(Math.min(1, Math.max(0, Number(c))) * 255));
    return a === undefined || Number(a) === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${Number(a)})`;
  });
const resolveColor = async (page: Page, name: string) => legacy(await tokenColor(page, name));
const css = async (locator: Locator, property: string, pseudo?: string) =>
  legacy(await locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const));
/**
 * How the switch is drawn from its one progress (SWT-13, SWT-19; switch.styles.ts): the handle's place is the thumb's
 * `translate`; a part's color is two layers — `.off` in the unselected condition's color at an opacity of 1 − progress,
 * `.on` in the selected one's at an opacity of progress, the two added (`.fill` in the track, `.paint` in the handle,
 * `.tint` in the container); the handle's size is the unselected size and a share of two rulers — what the selected size
 * is more than it, and what it is less. No custom property is registered for any of it. (A transition of a logical
 * property is told by its physical name: a ruler's `block-size` is `height`.)
 *
 * The two layers are added (`mix-blend-mode: plus-lighter` on `.on`) only while the progress is between its ends — a
 * drag holds the handle (`data-drag` on `.root`) or a travel is under way (`data-between`); at rest neither is there,
 * and one layer is drawn by itself.
 */
const rootOf = (page: P, id: string) => host(page, id).locator('.root');
const thumbOf = (page: P, id: string) => host(page, id).locator('.thumb');
const layerOf = (page: P, id: string, part: 'fill' | 'paint' | 'tint', condition: 'off' | 'on') => host(page, id).locator(`.${part}.${condition}`);
/** A ruler of the handle's size: as tall as the selected size is more than the unselected one in the current state, or less. */
const rulerOf = (page: P, id: string, which: 'more' | 'less') => host(page, id).locator(`.ruler.${which}`);
/** The share of a ruler that the progress takes: the element the selection motion moves. */
const shareOf = (page: P, id: string, which: 'more' | 'less') => host(page, id).locator(`.ruler.${which} > span`);
/** What the page reads of a part's two layers: each one's color (of `property`) and opacity. */
type Layers = { off: { color: string; opacity: number }; on: { color: string; opacity: number } };
const COLOR = /(?:color\(srgb [^)]+\)|rgba?\([^)]+\))/;
/** In the page: the two layers of `part` in a switch's shadow root. `property` is where the color stands (`box-shadow` holds one). */
const LAYERS = `(root, part, property) => {
  const read = (condition) => {
    const style = getComputedStyle(root.querySelector('.' + part + '.' + condition));
    return { color: style.getPropertyValue(property), opacity: Number(style.opacity) };
  };
  return { off: read('off'), on: read('on') };
}`;
const channels = (value: string): [number, number, number, number] => {
  const srgb = /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/.exec(value);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const rgb = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(value);
  if (!rgb) throw new Error(`not a color: ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
};
/**
 * The color two layers draw together: each premultiplied by its alpha and its opacity, and the two added — what
 * `mix-blend-mode: plus-lighter` in a group of their own paints (the pixels are read once, in SWT-19's first test).
 */
const added = (layers: Layers): [number, number, number, number] => {
  const [off, on] = [channels(COLOR.exec(layers.off.color)![0]), channels(COLOR.exec(layers.on.color)![0])];
  const [a0, a1] = [off[3] * layers.off.opacity, on[3] * layers.on.opacity];
  const alpha = a0 + a1;
  const channel = (i: number) => (alpha === 0 ? 0 : (off[i] * a0 + on[i] * a1) / alpha);
  return [channel(0), channel(1), channel(2), alpha];
};
/** The same, as a computed color reads: the one layer's own color where the other is not drawn at all. */
const addedColor = (layers: Layers): string => {
  // A color on its way from one state's to another's may be said in the space it is interpolated in (`oklab(…)`): it
  // is read as it stands, and is no token's color.
  const own = (color: string) => legacy(COLOR.exec(color)?.[0] ?? color);
  if (layers.on.opacity === 0 && layers.off.opacity === 1) return own(layers.off.color);
  if (layers.off.opacity === 0 && layers.on.opacity === 1) return own(layers.on.color);
  if (!COLOR.test(layers.off.color) || !COLOR.test(layers.on.color)) return `${layers.off.color} + ${layers.on.color}`;
  const [r, g, b, a] = added(layers);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const PARTS = { container: ['tint', 'background-color'], track: ['fill', 'background-color'], outline: ['fill', 'box-shadow'], handle: ['paint', 'background-color'] } as const;
const layersOf = (page: P, id: string, part: keyof typeof PARTS) =>
  host(page, id).evaluate((el, [read, layer, property]) => ((0, eval)(`(${read})`) as (root: ShadowRoot, part: string, property: string) => Layers)(el.shadowRoot!, layer, property), [LAYERS, ...PARTS[part]] as const);
/** The color a part is painted in, as a computed color reads: its two layers, added. */
const painted = async (page: P, id: string, part: keyof typeof PARTS) => addedColor(await layersOf(page, id, part));
/** How the selected layers of the three layered parts are blended with the unselected ones under them, and what marks the root as between its conditions. */
const blending = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    return {
      modes: ['fill', 'paint', 'tint'].map((part) => getComputedStyle(root.querySelector(`.${part}.on`)!).mixBlendMode),
      between: root.querySelector('.root')!.hasAttribute('data-between'),
      drag: root.querySelector('.root')!.hasAttribute('data-drag'),
    };
  });
const AT_REST = { modes: ['normal', 'normal', 'normal'], between: false, drag: false };
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-switch-${name}`;
const pressed = (page: P, id: string) => container(page, id).getAttribute('data-pressed');
const ripples = (page: P, id: string) => container(page, id).locator('.ripple');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const center = async (locator: Locator) => { const b = await bounds(locator); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props });
/**
 * The ink a glyph draws on a ground of one color, read from the pixels (SWT-12): `locator` as it is painted, less
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
/** The fixtures whose handle shows a glyph at rest, and which condition's layer it is. */
const GLYPHS = [['selected-icon', 'on'], ['unselected-icon', 'off']] as const;
const glyphOf = (page: P, id: string, which: 'on' | 'off') => host(page, id).locator(`.glyph.${which} .icon`);
/** The duration (ms) of the running transition of `property` on the element, or null when none runs. */
const running = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const t = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === p);
    return t ? Number(t.effect!.getTiming().duration) : null;
  }, property);
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log = ((window as any).events = { click: 0, input: 0, change: 0, carried: [] as boolean[], checkedAtInput: [] as boolean[] });
    el.addEventListener('click', () => log.click++);
    el.addEventListener('input', () => { log.input++; log.checkedAtInput.push((el as any).checked); });
    el.addEventListener('change', (event) => { log.change++; log.carried.push((event as CustomEvent).detail.checked); });
  });
const events = (page: P) => page.evaluate(() => (window as any).events as { click: number; input: number; change: number; carried: boolean[]; checkedAtInput: boolean[] });
const isOn = (locator: Locator) => locator.evaluate((el) => (el as any).checked as boolean);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/**
 * Everything a condition paints, as drawn. The elevation and the glyph are those of the condition `checked` holds: each
 * condition has its own layer (SWT-19), and at rest only that one shows. `icon` is null where the handle has no glyph
 * for that condition.
 */
const drawn = async (page: P, id: string) => {
  const d = await host(page, id).evaluate((el, read) => {
    const root = el.shadowRoot!;
    const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
    const layers = (0, eval)(`(${read})`) as (root: ShadowRoot, part: string, property: string) => Layers;
    const side = (el as any).checked ? 'on' : 'off';
    return {
      container: layers(root, 'tint', 'background-color'),
      track: layers(root, 'fill', 'background-color'),
      outline: layers(root, 'fill', 'box-shadow'),
      handle: layers(root, 'paint', 'background-color'),
      size: Number.parseFloat(s('.handle').width),
      elevation: s(`.elevation.${side}`).boxShadow,
      icon: root.querySelector(`.glyph.${side}`) ? s(`.glyph.${side} .icon`).color : null,
      label: root.querySelector('.label') ? s('.label').color : null,
    };
  }, LAYERS);
  return { ...d, container: addedColor(d.container), track: addedColor(d.track), outline: addedColor(d.outline), handle: addedColor(d.handle), label: d.label === null ? null : legacy(d.label) };
};
const expected = async (page: P, condition: string, state = '') => {
  const name = (part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  return {
    container: await resolveColor(page, name('container-color')),
    track: await resolveColor(page, name('track-color')),
    outline: await resolveColor(page, name('outline-color')),
    handle: await resolveColor(page, name('handle-color')),
    size: await resolveToken(page, name('handle-size')),
    icon: await resolveColor(page, name('icon-color')),
    label: await resolveColor(page, name('label-color')),
  };
};
/** A handle that shows a glyph in its condition is at least handle.size-with-icon (SWT-12); one without draws no icon color. */
const matches = async (page: P, id: string, condition: string, state = '') => {
  const want = await expected(page, condition, state);
  const withIcon = await resolveToken(page, T('handle-size-with-icon'));
  await expect
    .poll(async () => {
      const d = await drawn(page, id);
      const size = d.icon === null ? want.size : Math.max(want.size, withIcon);
      return { container: d.container, track: d.track, outline: d.outline.includes(want.outline), handle: d.handle, size: d.size === size, icon: d.icon ?? want.icon, label: d.label ?? want.label };
    }, `${id} draws ${condition} ${state || 'at rest'}`)
    .toEqual({ container: want.container, track: want.track, outline: true, handle: want.handle, size: true, icon: want.icon, label: want.label });
};

test.describe('behavior', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('SWT-1: pointer on the track, pointer on the label, Space, element.click() and assistive technology each switch it and emit change once with the new value', async ({ page }) => {
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    await trackOf(page, id).click({ force: true });
    expect(await events(page)).toEqual({ click: 1, input: 1, change: 1, carried: [true], checkedAtInput: [true] });
    await labelOf(page, id).click();
    expect(await events(page)).toMatchObject({ click: 2, change: 2, carried: [true, false] });
    await target.focus();
    await page.keyboard.press('Space');
    expect(await events(page)).toMatchObject({ click: 3, change: 3, carried: [true, false, true] });
    await target.evaluate((el) => (el as HTMLElement).click());
    expect(await events(page)).toMatchObject({ click: 4, change: 4, carried: [true, false, true, false] });
    await target.getByRole('switch').dispatchEvent('click');
    expect(await events(page)).toMatchObject({ input: 5, change: 5, carried: [true, false, true, false, true] });
    await target.evaluate((el) => ((el as any).checked = false));
    await expect(input(page, id)).not.toBeChecked();
    expect((await events(page)).change).toBe(5);
  });

  test('SWT-1: Enter does not switch it on the web; inside a form it submits the form', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('[data-fixture="unselected"] tanrei-switch')!;
      const form = document.createElement('form');
      el.replaceWith(form);
      form.append(el);
      (window as any).submits = 0;
      form.addEventListener('submit', (event) => { event.preventDefault(); (window as any).submits++; });
    });
    await listen(host(page, 'unselected'));
    await host(page, 'unselected').focus();
    await page.keyboard.press('Enter');
    expect((await events(page)).change).toBe(0);
    expect(await isOn(host(page, 'unselected'))).toBe(false);
    expect(await page.evaluate(() => (window as any).submits)).toBe(1);
  });

  test('SWT-2: a disabled switch neither changes nor emits change, is not focusable, ignores its label and exposes disabled', async ({ page }) => {
    for (const id of ['disabled-unselected', 'disabled-selected']) {
      const target = host(page, id);
      const before = await isOn(target);
      await listen(target);
      await trackOf(page, id).click({ force: true });
      await labelOf(page, id).click({ force: true });
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await target.focus();
      await page.keyboard.press('Space');
      expect((await events(page)).change, id).toBe(0);
      expect(await isOn(target), id).toBe(before);
      expect(await page.evaluate(() => document.activeElement?.tagName), id).not.toBe('TANREI-SWITCH');
      await expect(target.getByRole('switch', { disabled: true }), id).toHaveCount(1);
    }
  });

  test('SWT-3: hover, keyboard focus and press render the container, track, outline, handle (the pressed size under a press), icon and label from that state’s tokens of the condition (default system)', async ({ page }) => {
    // The two fixtures with a glyph show the icon color of each state: a glyph is drawn in its own condition's.
    for (const [id, condition] of [['unselected', 'unselected'], ['selected', 'selected'], ['unselected-icon', 'unselected'], ['selected-icon', 'selected']] as const) {
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
  });

  test('SWT-3: under acme, where the three states differ, pressed beats focused beats hovered — in both conditions', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    for (const [id, condition] of [['unselected', 'unselected'], ['selected', 'selected']] as const) {
      const name = (s: string) => T(`${condition}-${s ? `${s}-` : ''}container-color`);
      const bg = () => painted(page, id, 'container');
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
      await host(page, id).evaluate((el, c) => ((el as any).checked = c === 'selected'), condition);
      await expect.poll(bg, id).toBe(focused);
      await page.mouse.move(0, 0);
    }
  });

  // One page per system: in Chromium a press in a document mounted after a pressed one never hears its pointer leave.
  for (const system of [undefined, 'm3-like', 'cupertino'] as const) {
    const grows = system !== 'cupertino';
    test(`SWT-3 / SWT-18 (${system ?? 'default system'}): ${grows ? 'the handle grows to fill the track inside its outline' : 'the handle keeps its size'} at once under a press, about its center, in both conditions`, async ({ page }) => {
      if (system) await mountFixtures(page, spec, { system });
      const inside = (await resolveToken(page, T('track-height'))) - 2 * (await resolveToken(page, T('outline-width')));
      for (const [id, condition] of [['unselected', 'unselected'], ['selected', 'selected']] as const) {
        const what = `${system ?? 'tanrei'} ${id}`;
        const [rest, down] = [await resolveToken(page, T(`${condition}-handle-size`)), await resolveToken(page, T(`${condition}-pressed-handle-size`))];
        if (grows) expect([down > rest, down], what).toEqual([true, inside]);
        else expect(down, what).toBe(rest);
        await page.mouse.move(0, 0);
        await expect.poll(async () => (await drawn(page, id)).size, what).toBe(rest);
        await container(page, id).hover();
        const before = await center(handleOf(page, id));
        await page.mouse.down();
        expect((await drawn(page, id)).size, `${what}: without delay`).toBe(down);
        const during = await center(handleOf(page, id));
        expect(during.x, what).toBeCloseTo(before.x, 5);
        expect(during.y, what).toBeCloseTo(before.y, 5);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        await expect.poll(async () => (await drawn(page, id)).size, what).toBe(rest);
      }
    });
  }

  test('SWT-4: keyboard focus shows the focus ring around the track immediately; pointer focus does not', async ({ page }) => {
    await trackOf(page, 'unselected').click({ force: true });
    await expect(trackOf(page, 'unselected')).toHaveCSS('outline-style', 'none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, 'selected'));
    const track = trackOf(page, 'selected');
    await expect(track).toHaveCSS('outline-style', 'solid');
    await expect(track).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(track).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    await expect(container(page, 'selected')).toHaveCSS('outline-style', 'none');
    expect(await css(track, 'transition-property')).not.toContain('outline');
  });

  test('SWT-5: the hit area meets sys.target.pointer around the track while the track keeps its size; the whole track and the label are in it', async ({ page }) => {
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const [w, h] = [await resolveToken(page, T('track-width')), await resolveToken(page, T('track-height'))];
    const t = await bounds(trackOf(page, 'unselected'));
    expect([t.width, t.height]).toEqual([w, h]);
    const hit = await host(page, 'unselected').locator('.control').evaluate((el) => { const r = getComputedStyle(el, '::before'); return [Number.parseFloat(r.width), Number.parseFloat(r.height)]; });
    expect(hit[0]).toBeGreaterThanOrEqual(Math.max(w, pointer));
    expect(hit[1]).toBeGreaterThanOrEqual(pointer);
    await listen(host(page, 'unselected'));
    const d = (pointer - h) / 4;
    for (const [x, y] of [[t.x + t.width - 2, t.y + t.height / 2], [t.x + t.width / 2, t.y - d], [t.x + t.width / 2, t.y + t.height + d]]) await page.mouse.click(x, y);
    expect((await events(page)).change).toBe(3);
    const l = await bounds(labelOf(page, 'unselected'));
    await page.mouse.click(l.x + l.width - 1, l.y + 1);
    expect((await events(page)).change).toBe(4);
  });

  test('SWT-5: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await host(page, 'unselected').locator('.control').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBe(touch);
  });

  test('SWT-6: disabled renders from the disabled tokens of its condition — the round container stays clear, the track fades as a fill', async ({ page }) => {
    for (const [id, condition] of [['disabled-unselected', 'unselected'], ['disabled-selected', 'selected']] as const) {
      await matches(page, id, condition, 'disabled');
      expect(await css(host(page, id).locator('.root'), 'opacity'), id).toBe(await token(page, T('disabled-opacity')));
      expect((await drawn(page, id)).container, id).toBe('rgba(0, 0, 0, 0)');
      // In the Tanrei system the track is faded at the container opacity (a fill), the label at the content opacity.
      expect((await drawn(page, id)).track, id).toMatch(/0\.12\)$/);
      expect((await drawn(page, id)).label, id).toMatch(/0\.38\)$/);
    }
  });
});

test.describe('press, feedback, corners, focus style, geometry and motion', () => {
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
          log.seen ??= [c.getAttribute('data-pressed')!, s.transitionDuration.split(',')[0].trim()];
        } else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(c, { attributes: true, attributeFilter: ['data-pressed'] });
      for (const type of ['pointerup', 'keyup']) el.shadowRoot!.addEventListener(type, () => (log.up ??= performance.now()));
      for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => (log.down ??= performance.now()), true);
    });
  const CLOCK = 1;
  const pressLog = (page: P) => page.evaluate(() => (window as any).press as { down?: number; on?: number; off?: number; up?: number; seen?: string[] });

  test('SWT-7: a press that ends within a frame — Space, a click — is shown at once and for at least press-hold', async ({ page }) => {
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBe(100);
    for (const [name, activate] of [
      ['Space', () => page.keyboard.press('Space')],
      ['click', () => clickCentre(page, container(page, 'unselected'))],
    ] as const) {
      await mountFixtures(page, spec);
      await host(page, 'unselected').focus();
      await expect.poll(() => painted(page, 'unselected', 'container')).toBe(await resolveColor(page, T('unselected-focused-container-color')));
      await watchPress(page, 'unselected');
      // The press and the hold on the page's clock, held still: the press is over in no page time at all, so it is the
      // short one at the system's own hold, however long the driver takes to send the release.
      await heldPress(page, hold, activate, async () => (await pressLog(page)).off !== undefined, name);
      const log = await pressLog(page);
      expect(log.seen, name).toEqual(['overlay', '0s']);
      expect(log.up! - log.on!, name).toBeLessThan(hold);
      expect(log.off! - log.down!, name).toBeGreaterThanOrEqual(hold - CLOCK);
    }
  });

  test('SWT-7: a pointer press lasts while the pointer is down; a key press ends when focus leaves; disabled shows none', async ({ page }) => {
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
    await trackOf(page, 'disabled-selected').click({ force: true });
    expect(await pressed(page, 'disabled-selected')).toBeNull();
  });

  test('SWT-8 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    await container(page, 'selected').hover();
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('overlay');
    expect(await painted(page, 'selected', 'container')).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('SWT-8 ripple (m3-like): the pressed layer grows from the point of contact in the round container around the handle', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const c = await bounds(container(page, 'selected'));
    const hovered = await resolveColor(page, T('selected-hovered-container-color'));
    await page.mouse.move(c.x + c.width / 2 + 4, c.y + c.height / 2 - 3);
    await expect.poll(() => painted(page, 'selected', 'container')).toBe(hovered);
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, 'selected'));
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('ripple');
    const ripple = ripples(page, 'selected');
    await expect(ripple).toHaveCount(1);
    // The ripple is the pressed container color at the progress, as the container's own color is: two layers, added.
    const layer = await ripple.evaluate((el) => {
      const read = (pseudo: string) => ({ color: getComputedStyle(el, pseudo).backgroundColor, opacity: Number(getComputedStyle(el, pseudo).opacity) });
      return { x: Number.parseFloat(el.style.getPropertyValue('--_x')), y: Number.parseFloat(el.style.getPropertyValue('--_y')), color: { off: read('::before'), on: read('::after') }, own: getComputedStyle(el).backgroundColor };
    });
    expect(layer.x).toBeCloseTo(c.width / 2 + 4, 0);
    expect(layer.y).toBeCloseTo(c.height / 2 - 3, 0);
    expect(addedColor(layer.color)).toBe(await resolveColor(page, T('selected-pressed-container-color')));
    expect(legacy(layer.color.off.color), 'the unselected layer is there, and not drawn').toBe(await resolveColor(page, T('unselected-pressed-container-color')));
    expect(layer.own, 'nothing under the two layers').toBe('rgba(0, 0, 0, 0)');
    expect(await painted(page, 'selected', 'container')).toBe(hovered);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(ripple).toHaveCount(0);
  });

  test('SWT-8 ripple: Space answers from the center; reduced motion makes it appear whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await host(page, 'selected').focus();
    await page.keyboard.down('Space');
    const middle = await ripples(page, 'selected').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
    });
    expect(middle[0]).toBeCloseTo(0.5, 5);
    expect(middle[1]).toBeCloseTo(0.5, 5);
    await page.keyboard.up('Space');
    await expect(ripples(page, 'selected')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.down('Space');
    expect(await ripples(page, 'selected').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.keyboard.up('Space');
  });

  test('SWT-8 dim (cupertino): the pressed opacity on the whole control, no state layer', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, { [T('selected-hovered-container-color')]: 'rgb(0, 255, 0)', [T('selected-pressed-container-color')]: 'rgb(255, 0, 0)' });
    await container(page, 'selected').hover();
    await expect.poll(() => painted(page, 'selected', 'container')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, 'selected')).toBe('dim');
    const root = host(page, 'selected').locator('.root');
    expect(await css(root, 'opacity')).toBe(await token(page, T('pressed-opacity')));
    expect(Number(await css(root, 'opacity'))).toBeLessThan(1);
    expect(await painted(page, 'selected', 'container')).toBe('rgb(0, 255, 0)');
    expect(await ripples(page, 'selected').count()).toBe(0);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test('SWT-8 / SWT-18 none: no answer to the press — the handle keeps the size of the state under it; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    await container(page, 'selected').hover();
    await expect.poll(() => painted(page, 'selected', 'container')).toBe(await resolveColor(page, T('selected-hovered-container-color')));
    // Pressed once the hovered color has ended its motion: the poll passes on its last frames, where the color reads
    // as its end value and, a frame later, one channel a step of 1e-6 off it (Firefox).
    await motionEnded(host(page, 'selected'));
    const before = await drawn(page, 'selected');
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

  test('SWT-9 corner smoothing: the pill track and the round container are unchanged by any amount; a track below full is eased (cupertino, 0.6)', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    const t = await bounds(trackOf(page, 'selected'));
    expect(Number.parseFloat(await css(trackOf(page, 'selected'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(t.height / 2);
    expect(await css(trackOf(page, 'selected'), 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    await override(page, { [T('track-shape')]: '6px', [T('track-shape-pill')]: '0' });
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(trackOf(page, 'selected'), 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(trackOf(page, 'selected'), 'border-top-left-radius'))).toBeCloseTo(6 * 1.24, 2);
    } else {
      expect(await css(trackOf(page, 'selected'), 'border-top-left-radius')).toBe('6px');
    }
  });

  test('SWT-9 focus-style: acme shows keyboard focus as a glow around the track; the default is a ring', async ({ page }) => {
    await tabTo(page, host(page, 'selected'));
    expect(await css(trackOf(page, 'selected'), 'box-shadow', '::after')).toBe('none');
    expect(await input(page, 'selected').getAttribute('data-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, host(page, 'selected'));
    expect(await css(trackOf(page, 'selected'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(trackOf(page, 'selected'), 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await input(page, 'selected').getAttribute('data-focus-style')).toBe('glow');
  });

  test('SWT-10: the track is track.width × track.height, its outline inside its edge and its fill inside the outline; the handle sits half the track height from the start (off) or the end (on); the container is centered on it outside the layout', async ({ page }) => {
    const [w, h, ow, cs] = [T('track-width'), T('track-height'), T('outline-width'), T('container-size')];
    const [width, height, outline, side] = [await resolveToken(page, w), await resolveToken(page, h), await resolveToken(page, ow), await resolveToken(page, cs)];
    for (const [id, end] of [['unselected', false], ['selected', true]] as const) {
      const t = await bounds(trackOf(page, id));
      expect([t.width, t.height], id).toEqual([width, height]);
      // Each condition's layer of the track is the whole track: the outline inside its edge, the fill inside the outline.
      for (const condition of ['off', 'on'] as const) {
        const layer = layerOf(page, id, 'fill', condition);
        expect(await bounds(layer), `${id} ${condition}`).toEqual(t);
        expect(await css(layer, 'box-shadow'), `${id} ${condition}`).toMatch(new RegExp(`0px 0px 0px ${outline}px inset$`));
        expect(await css(layer, 'background-clip'), `${id} ${condition}`).toBe('content-box');
        expect(await css(layer, 'padding-top'), `${id} ${condition}`).toBe(`${outline}px`);
        expect(await css(layer, 'border-top-left-radius'), `${id} ${condition}`).toBe(await css(trackOf(page, id), 'border-top-left-radius'));
      }
      // And only the condition's own is drawn at rest, by itself: nothing is blended, and nothing marks a travel.
      expect(await layerOf(page, id, 'fill', end ? 'on' : 'off').evaluate((el) => getComputedStyle(el).opacity), id).toBe('1');
      expect(await layerOf(page, id, 'fill', end ? 'off' : 'on').evaluate((el) => getComputedStyle(el).opacity), id).toBe('0');
      expect(await blending(page, id), id).toEqual(AT_REST);
      const handle = await center(handleOf(page, id));
      expect(handle.y, id).toBeCloseTo(t.y + t.height / 2, 5);
      expect(handle.x, id).toBeCloseTo(end ? t.x + t.width - t.height / 2 : t.x + t.height / 2, 5);
      const c = await bounds(container(page, id));
      expect([c.width, c.height], id).toEqual([side, side]);
      expect(c.x + c.width / 2, id).toBeCloseTo(handle.x, 5);
      expect(c.y + c.height / 2, id).toBeCloseTo(handle.y, 5);
    }
    // The container reaches beyond the track without moving anything: the element is as tall as the track.
    expect((await bounds(host(page, 'label-hidden'))).height).toBe(height);
    expect((await bounds(host(page, 'label-hidden'))).width).toBe(width);
  });

  test('SWT-11: in RTL the handle sits at the right when off and the left when on, travels leftwards, and the label is mirrored', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    for (const [id, end] of [['unselected', false], ['selected', true]] as const) {
      const t = await bounds(trackOf(page, id));
      await expect.poll(async () => (await center(handleOf(page, id))).x, id).toBeCloseTo(end ? t.x + t.height / 2 : t.x + t.width - t.height / 2, 5);
    }
    const [t, l] = [await bounds(trackOf(page, 'unselected')), await bounds(labelOf(page, 'unselected'))];
    expect(t.x - (l.x + l.width)).toBeCloseTo(await resolveToken(page, T('label-gap')), 5);
    // Travelling: halfway through a slowed switch the handle is between the two ends.
    // (At 60 s, and the handle's travel held half way through its time when it is first found: read 600 ms and an answer
    // after the click at 4 s, it was read wherever the machine had let it get to.)
    await override(page, { [T('motion-selection-duration')]: '60s', [T('motion-selection-easing')]: 'linear' });
    await host(page, 'unselected').click();
    await expect
      .poll(
        () =>
          host(page, 'unselected').evaluate((el) => {
            const travel = el.shadowRoot!.getAnimations().filter((animation) => (animation as CSSTransition).transitionProperty === 'translate');
            for (const animation of travel) {
              animation.pause();
              animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
            }
            return travel.length;
          }),
        'the click begins the handle’s travel',
      )
      .toBeGreaterThan(0);
    const x = (await center(handleOf(page, 'unselected'))).x;
    expect(x).toBeLessThan(t.x + t.width - t.height / 2);
    expect(x).toBeGreaterThan(t.x + t.height / 2);
  });

  test('SWT-12: a handle showing an icon is at least handle.size-with-icon, the glyph centered at icon.size in the condition’s family and fill; the other condition’s prop decides the other glyph', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [withIcon, iconSize] = [await resolveToken(page, T('handle-size-with-icon')), await resolveToken(page, T('icon-size'))];
    // Each condition's glyph is a layer of the handle (SWT-19): at rest the condition's own is whole and the other's,
    // where its prop is set, is clear.
    const layer = (id: string, which: 'on' | 'off') => host(page, id).locator(`.glyph.${which}`);
    const shown = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.glyph')].filter((g) => getComputedStyle(g).opacity !== '0').map((g) => g.textContent!.trim()));
    for (const [id, condition, which, text] of [['selected-icon', 'selected', 'on', 'check'], ['unselected-icon', 'unselected', 'off', 'close']] as const) {
      const glyph = (_: string) => layer(id, which).locator('.icon');
      const rest = await resolveToken(page, T(`${condition}-handle-size`));
      expect((await bounds(handleOf(page, id))).width, id).toBe(Math.max(rest, withIcon));
      expect(await shown(id), id).toEqual([text]);
      expect(await css(layer(id, which), 'opacity'), id).toBe('1');
      await expect(glyph(id), id).toHaveAttribute('data-drawn', '');
      expect(await glyph(id).textContent(), id).toBe(text);
      // No mark of its own: the handle holds the icon set's ligature and nothing else — no path, shape or generated text.
      const own = await handleOf(page, id).evaluate((el) => ({
        drawings: el.querySelectorAll('svg, img, canvas').length,
        generated: [el, ...el.querySelectorAll('*')].flatMap((e) => ['::before', '::after'].map((p) => getComputedStyle(e, p).content)).filter((c) => c !== 'none' && c !== 'normal'),
      }));
      expect(own, id).toEqual({ drawings: 0, generated: [] });
      const [g, h, hc] = [await bounds(glyph(id)), await bounds(handleOf(page, id)), await center(handleOf(page, id))];
      expect([g.width, g.height], id).toEqual([iconSize, iconSize]);
      expect(g.x + g.width / 2, id).toBeCloseTo(hc.x, 5);
      expect(g.y + g.height / 2, id).toBeCloseTo(hc.y, 5);
      expect(g.x >= h.x && g.y >= h.y && g.x + g.width <= h.x + h.width && g.y + g.height <= h.y + h.height, `${id}: the glyph box lies inside the handle`).toBe(true);
      const fill = await glyph(id).evaluate((el) => /"FILL" ([\d.]+)/.exec(getComputedStyle(el).fontVariationSettings)?.[1]);
      expect(Number(fill), id).toBe(Number(await token(page, `--tanrei-sys-icon-fill-${condition}`)));
      expect(await css(glyph(id), 'color'), id).toBe(await resolveColor(page, T(`${condition}-icon-color`)));
    }
    // "Only on shows a check": switched off, the selected-icon fixture has no uncheckedIcon, so no glyph and the bare handle.
    await host(page, 'selected-icon').click();
    await expect.poll(() => shown('selected-icon')).toEqual([]);
    await expect(layer('selected-icon', 'off')).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect.poll(async () => (await bounds(handleOf(page, 'selected-icon'))).width).toBe(await resolveToken(page, T('unselected-handle-size')));
    // Switched on, the unselected-icon fixture shows its check, in the selected family and fill.
    await host(page, 'unselected-icon').click();
    await expect.poll(() => shown('unselected-icon')).toEqual(['check']);
    const fill = await layer('unselected-icon', 'on').locator('.icon').evaluate((el) => /"FILL" ([\d.]+)/.exec(getComputedStyle(el).fontVariationSettings)?.[1]);
    expect(Number(fill)).toBe(Number(await token(page, '--tanrei-sys-icon-fill-selected')));
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`SWT-12: in the ${theme} theme both glyphs are drawn at comp.switch.icon.weight, heavier than sys.icon.weight, which an icon beside the switch keeps; the weight changes the stroke only — under a layer that sets the token alone both glyphs follow it, and the glyph box, the handle and the track measure what they measured`, async ({ page }) => {
      test.setTimeout(90_000);
      await mountFixtures(page, spec, { icons: true, theme, reducedMotion: true });
      await page.mouse.move(0, 0);
      const [glyphWeight, iconWeight, iconSize] = [Number(await token(page, T('icon-weight'))), Number(await token(page, '--tanrei-sys-icon-weight')), await resolveToken(page, T('icon-size'))];
      expect(glyphWeight).toBeGreaterThan(iconWeight);
      expect(glyphWeight).toBe(Number(await token(page, '--tanrei-sys-icon-mark-weight')));
      // An icon of the icon set beside the switch: the system's icon weight, as before.
      await page.addStyleTag({ content: fs.readFileSync(new URL('../../../dist/icons.css', import.meta.url), 'utf8') });
      await page.locator('[data-fixture="selected-icon"]').evaluate((stage) => stage.insertAdjacentHTML('beforeend', '<span id="beside" class="tanrei-icon" aria-hidden="true">check</span>'));
      expect(await weightOf(page.locator('#beside'))).toBe(iconWeight);
      /** What is drawn and where: the weight, the ink on the handle, and every box the weight must not move. */
      const measure = async () =>
        Promise.all(GLYPHS.map(async ([id, which]) => {
          const [glyph, handle] = [glyphOf(page, id, which), await bounds(handleOf(page, id))];
          return {
            weight: await weightOf(glyph),
            // The handle's middle, a pixel inside the glyph box: the handle's fill is the one ground there.
            ink: await inkOn(handleOf(page, id), (handle.width - iconSize) / 2 + 1, await css(glyph, 'color')),
            boxes: { glyph: await bounds(glyph), fontSize: await css(glyph, 'font-size'), handle, track: await bounds(trackOf(page, id)), host: await bounds(host(page, id)) },
          };
        }));
      const own = await measure();
      // The other condition's glyph, clear at rest, is at the same weight (it is the one a drag or a tap fades in).
      expect(await weightOf(glyphOf(page, 'unselected-icon', 'on'))).toBe(glyphWeight);
      // What the glyphs were drawn at before they had a weight of their own, and a weight heavier than their own.
      await override(page, { [T('icon-weight')]: 'var(--tanrei-sys-icon-weight)' });
      const lighter = await measure();
      await override(page, { [T('icon-weight')]: '700' });
      const heavier = await measure();
      expect(await weightOf(glyphOf(page, 'unselected-icon', 'on'))).toBe(700);
      expect(await weightOf(page.locator('#beside')), 'the icon beside it follows no token of the switch').toBe(iconWeight);
      for (const [i, [id, which]] of GLYPHS.entries()) {
        const at = `${theme} ${id} ${which}`;
        expect([lighter[i].weight, own[i].weight, heavier[i].weight], at).toEqual([iconWeight, glyphWeight, 700]);
        // The stroke grew: the ink a column crosses, and all the ink there is.
        expect(own[i].ink.stroke, `${at}: stroke ${lighter[i].ink.stroke} → ${own[i].ink.stroke}`).toBeGreaterThan(lighter[i].ink.stroke * 1.2);
        expect(own[i].ink.area, `${at}: ink ${lighter[i].ink.area} → ${own[i].ink.area}`).toBeGreaterThan(lighter[i].ink.area * 1.2);
        expect(heavier[i].ink.stroke, at).toBeGreaterThan(own[i].ink.stroke);
        // The glyph box did not: icon.size, where it was, in the same handle on the same track.
        expect([own[i].boxes.glyph.width, own[i].boxes.glyph.height], at).toEqual([iconSize, iconSize]);
        expect(own[i].boxes.fontSize, at).toBe(`${iconSize}px`);
        expect(lighter[i].boxes, at).toEqual(own[i].boxes);
        expect(heavier[i].boxes, at).toEqual(own[i].boxes);
        // And the ink stays inside the glyph box at each weight.
        for (const m of [lighter[i], own[i], heavier[i]]) expect(m.ink.clear, `${at} at ${m.weight}`).toBeGreaterThan(0);
      }
    });

    for (const system of ['m3-like', 'm3-expressive-like', 'cupertino']) {
      test(`SWT-12 (${system}, ${theme}): a preset pins the glyphs' weight to its icon weight, and draws what it drew`, async ({ page }) => {
        // A second document, with a preset's faces, after the describe's own: slow on a machine that is busy.
        test.setTimeout(90_000);
        await mountFixtures(page, spec, { system, icons: true, theme, reducedMotion: true });
        await page.mouse.move(0, 0);
        const iconWeight = Number(await token(page, '--tanrei-sys-icon-weight'));
        expect(Number(await token(page, T('icon-weight')))).toBe(iconWeight);
        for (const [id, which] of GLYPHS) expect(await weightOf(glyphOf(page, id, which)), `${id} ${which}`).toBe(iconWeight);
        const shots = () => Promise.all(GLYPHS.map(async ([id]) => decodePng(await host(page, id).screenshot({ animations: 'disabled', scale: 'device' })).data));
        const own = await shots();
        // Pixel for pixel what the icon weight draws: the weight every glyph had before it had one of its own.
        await override(page, { [T('icon-weight')]: 'var(--tanrei-sys-icon-weight)' });
        const before = await shots();
        for (const [i, [id]] of GLYPHS.entries()) expect(Buffer.from(own[i]).equals(Buffer.from(before[i])), id).toBe(true);
      });
    }
  }

  test('SWT-12: under acme, whose icon set is static, the on glyph is in the selected family and the off glyph in the unselected one', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), icons: true });
    const families = (value: string) => value.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
    const [on, off] = [families(await token(page, '--tanrei-sys-icon-family-selected')), families(await token(page, '--tanrei-sys-icon-family-unselected'))];
    expect(on).not.toEqual(off);
    const family = (id: string, which: 'on' | 'off') => host(page, id).locator(`.icon.${which}`).evaluate((el) => getComputedStyle(el).fontFamily);
    expect(families(await family('selected-icon', 'on'))).toEqual(on);
    expect(families(await family('unselected-icon', 'off'))).toEqual(off);
  });

  test('SWT-17: while the icon set cannot draw the glyph nothing is drawn in its place — never its name — the handle keeps its size with an icon and the state is exposed; the glyph appears without motion once the font arrives', async ({ page }) => {
    // The icon set names a family no machine has (the default's may be installed locally): its font is missing, as on
    // a page that has not loaded it (yet).
    const MISSING = 'Tanrei Missing Icons';
    await override(page, { '--tanrei-sys-icon-family-selected': `"${MISSING}"`, '--tanrei-sys-icon-family-unselected': `"${MISSING}"` });
    const [withIcon, iconSize] = [await resolveToken(page, T('handle-size-with-icon')), await resolveToken(page, T('icon-size'))];
    const cases = [['selected-icon', 'selected', 'on'], ['unselected-icon', 'unselected', 'off']] as const;
    for (const [id, condition, which] of cases) {
      const icon = host(page, id).locator(`.icon.${which}`);
      await expect(icon, id).not.toHaveAttribute('data-drawn');
      // What the browser would print is the name, spelled out in a text face: far wider than a glyph.
      expect(await icon.locator('.ink').evaluate((el) => (el as HTMLElement).offsetWidth), id).toBeGreaterThan(iconSize * 1.5);
      expect(await css(icon, 'visibility'), id).toBe('hidden');
      expect((await bounds(handleOf(page, id))).width, id).toBe(Math.max(await resolveToken(page, T(`${condition}-handle-size`)), withIcon));
      await expect(host(page, id).getByRole('switch', { name: 'Wi-Fi', checked: condition === 'selected' }), id).toHaveCount(1);
    }
    const sizes = await Promise.all(cases.map(([id]) => bounds(handleOf(page, id))));
    // The font arrives: the default system's icon face, registered under the family the icon set names.
    const tokensCss = fs.readFileSync(new URL('../../../dist/tokens.css', import.meta.url), 'utf8');
    const [family] = await iconFamilies(tokensCss, '');
    await page.addStyleTag({ content: (await presetFontFaces([family])).replaceAll(family, MISSING) });
    await page.evaluate(async (name) => {
      await document.fonts.load(`16px "${name}"`, 'check');
      await document.fonts.ready;
    }, MISSING);
    for (const [i, [id, , which]] of cases.entries()) {
      const icon = host(page, id).locator(`.icon.${which}`);
      await expect(icon, id).toHaveAttribute('data-drawn', '');
      expect(await css(icon, 'visibility'), id).toBe('visible');
      expect(await icon.evaluate((el) => el.getAnimations().length), `${id}: without motion`).toBe(0);
      expect(await bounds(handleOf(page, id)), `${id}: the handle does not move`).toEqual(sizes[i]);
    }
  });

  // The handle's size is drawn from its two rulers at the progress (SWT-19); a state changes a ruler's height, over the state motion.
  test('SWT-18: the pressed handle returns over the state motion once the press and press-hold have ended', async ({ page }) => {
    // The state motion at 30 s: it is asked for, and the handle read on its way, some questions after the press look
    // has ended, and a slow runner's answers may take longer than a motion of 2.5 s. Its end is not waited for: the
    // motion is ended by hand.
    await override(page, { [T('motion-state-duration')]: '30s', [T('motion-selection-duration')]: '60s', '--tanrei-sys-motion-duration-press-hold': '200ms' });
    const [rest, down] = [await resolveToken(page, T('unselected-handle-size')), await resolveToken(page, T('unselected-pressed-handle-size'))];
    await page.mouse.move(0, 0);
    await container(page, 'unselected').hover();
    await page.mouse.down();
    expect(await running(rulerOf(page, 'unselected', 'more'), 'height'), 'no transition in').toBe(null);
    expect(await running(handleOf(page, 'unselected'), 'left'), 'no transition in').toBe(null);
    expect((await drawn(page, 'unselected')).size).toBe(down);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'unselected')).toBeNull();
    expect(await running(rulerOf(page, 'unselected', 'more'), 'height')).toBe(30000);
    // The handle's two ends move with the rulers, so it stays the size the rulers and their shares say.
    expect(await running(handleOf(page, 'unselected'), 'left')).toBe(30000);
    const between = (await drawn(page, 'unselected')).size;
    expect(between > rest && between <= down, 'returning, not returned').toBe(true);
    await settle(page, 'unselected');
    await expect.poll(async () => (await drawn(page, 'unselected')).size, { timeout: 8000 }).toBe(rest);
  });

  test('SWT-18: under reduced motion the pressed handle returns at once when the press ends', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const [rest, down] = [await resolveToken(page, T('unselected-handle-size')), await resolveToken(page, T('unselected-pressed-handle-size'))];
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '200ms' });
    await container(page, 'unselected').hover();
    await page.mouse.down();
    expect((await drawn(page, 'unselected')).size).toBe(down);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'unselected')).toBeNull();
    expect((await drawn(page, 'unselected')).size).toBe(rest);
  });

  test('SWT-18: a press that switches it carries the pressed handle along the track, and it settles to the new condition’s size after press-hold', async ({ page }) => {
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '4000ms', [T('motion-selection-duration')]: '3000ms' });
    const [down, rest] = [await resolveToken(page, T('selected-pressed-handle-size')), await resolveToken(page, T('selected-handle-size'))];
    // The travel is kept as the engine announces it, and what the click leaves — the new condition, the pressed look,
    // the handle's size — is read by the page in the task of the click, as the switch tells of its change and has rendered: a question asked
    // after the click is answered some of the hold's 4 s later, by as much as the runner is slow (570 ms an answer in
    // WebKit on Linux; the size was the fifth question).
    await watchTransitions(thumbOf(page, 'unselected'));
    await host(page, 'unselected').evaluate((el: any) => {
      el.addEventListener('change', async () => {
        await el.updateComplete;
        const root = el.shadowRoot as ShadowRoot;
        (window as any).atClick ??= { on: el.checked, pressed: root.querySelector('.container')!.getAttribute('data-pressed'), size: Number.parseFloat(getComputedStyle(root.querySelector('.handle')!).width) };
      });
    });
    await container(page, 'unselected').click();
    expect(await page.evaluate(() => (window as any).atClick), 'on, pressed, at the pressed size').toEqual({ on: true, pressed: 'overlay', size: down });
    expect(await isOn(host(page, 'unselected'))).toBe(true);
    await expect.poll(async () => (await transitionsRun(thumbOf(page, 'unselected'))).filter((run) => run.own && run.property === 'translate').map((run) => run.duration), 'travelling').toEqual([3000]);
    await expect.poll(() => pressed(page, 'unselected'), { timeout: 8000 }).toBeNull();
    await expect.poll(async () => (await drawn(page, 'unselected')).size).toBe(rest);
  });

  test('SWT-3 / SWT-13: a part a state recolors changes over the state motion; when the condition changes the progress travels over the selection motion and the part follows it, with no motion of its own', async ({ page }) => {
    await override(page, {
      [T('motion-state-duration')]: '300ms',
      [T('motion-selection-duration')]: '700ms',
      [T('unselected-hovered-handle-color')]: 'rgb(0, 0, 255)',
      [T('unselected-hovered-track-color')]: 'rgb(0, 255, 0)',
    });
    const id = 'unselected';
    const color = (part: 'fill' | 'paint', condition: 'off' | 'on') => running(layerOf(page, id, part, condition), 'background-color');
    /** What the progress is drawn by: the thumb's place, each layer's opacity, each ruler's share. */
    const carried = [
      [thumbOf(page, id), 'translate'],
      ...(['fill', 'paint', 'tint'] as const).flatMap((part) => (['off', 'on'] as const).map((condition) => [layerOf(page, id, part, condition), 'opacity'] as const)),
      ...(['off', 'on'] as const).map((condition) => [host(page, id).locator(`.elevation.${condition}`), 'opacity'] as const),
      ...(['more', 'less'] as const).map((which) => [shareOf(page, id, which), 'height'] as const),
    ] as const;
    await page.mouse.move(0, 0);
    // What a state begins is kept as the engine announces it (a motion of 300 ms may be over before a question about
    // it is answered): `fill.off background-color 300`, for every transition in the switch.
    const begun = async () => (await transitionsRun(host(page, id))).map((run) => `${run.on.split('.').slice(1).join('.')}${run.pseudo} ${run.property} ${run.duration}`);
    await watchTransitions(host(page, id));
    await container(page, id).hover();
    // A state changes the color of the current condition's layer, and that is what moves.
    await expect.poll(begun).toEqual(expect.arrayContaining(['paint.off background-color 300', 'fill.off background-color 300']));
    // Nothing the progress is drawn by moves for a state: of all that began, nothing is the progress's (700 ms).
    for (const [part, property] of carried) expect(await running(part, property), `${property} for a state`).toBe(null);
    expect((await begun()).filter((run) => !run.endsWith(' 300')), 'only state motions for a state').toEqual([]);
    await page.mouse.move(0, 0);
    await expect.poll(() => color('paint', 'off')).toBe(null);
    // A state is drawn by one layer alone: nothing is added to anything while only a state changes.
    expect(await blending(page, id)).toEqual(AT_REST);
    // The condition changes, and what the change begins is held in the task that draws it: the fifteen questions below
    // are asked of motions of 700 ms, and are then of one moment however long the answers take.
    await host(page, id).evaluate(async (el) => {
      (el as any).checked = true;
      await (el as any).updateComplete;
      for (const animation of el.shadowRoot!.getAnimations()) animation.pause();
    });
    // Everything the progress is drawn by moves, each over the selection motion…
    expect(await running(thumbOf(page, id), 'translate')).toBe(700);
    for (const [part, property] of carried) expect(await running(part, property), `${property} for the condition`).toBe(700);
    // …and all of them together: one progress, read at one moment from each of its carriers.
    const sizes = [await resolveToken(page, T('unselected-handle-size')), await resolveToken(page, T('selected-handle-size'))];
    expect(sizes[1], 'the two conditions differ in size, so the size tells the progress').toBeGreaterThan(sizes[0]);
    const at = await host(page, id).evaluate((el, sizes) => {
      const root = el.shadowRoot!;
      // Stopped a fifth of the way through its time, before the curve reaches its end: every carrier at that one moment.
      for (const animation of el.shadowRoot!.getAnimations()) {
        animation.pause();
        animation.currentTime = 140;
      }
      const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
      const track = root.querySelector('.track') as HTMLElement;
      // The size, between the two conditions' (16 and 24 in the default system): the rulers' shares, as they are drawn.
      const [more, share] = [root.querySelector('.ruler.more')!.getBoundingClientRect().height, root.querySelector('.ruler.more > span')!.getBoundingClientRect().height];
      const read = [Number.parseFloat(s('.thumb').translate) / (track.offsetWidth - track.offsetHeight), Number(s('.fill.on').opacity), 1 - Number(s('.fill.off').opacity), Number(s('.paint.on').opacity), Number(s('.tint.on').opacity), Number(s('.elevation.on').opacity), share / more - 1, (root.querySelector('.handle')!.getBoundingClientRect().width - sizes[0]) / (sizes[1] - sizes[0])];
      return read;
    }, sizes);
    expect(at[0]).toBeGreaterThan(0.1);
    expect(at[0]).toBeLessThan(1);
    for (const value of at) expect(value, `one progress: ${at.join(', ')}`).toBeCloseTo(at[0], 2);
    // No color moves for the condition: a layer keeps its own condition's color, and a ruler its own size.
    for (const part of ['fill', 'paint'] as const) for (const condition of ['off', 'on'] as const) expect(await color(part, condition), `${part} ${condition}`).toBe(null);
    for (const condition of ['off', 'on'] as const) expect(await running(layerOf(page, id, 'fill', condition), 'box-shadow'), condition).toBe(null);
    for (const which of ['more', 'less'] as const) expect(await running(rulerOf(page, id, which), 'height'), which).toBe(null);
    expect(await running(handleOf(page, id), 'left')).toBe(null);
    // On the way the two layers of a color are added; once the handle is there they are not, and the mark is gone.
    expect(await blending(page, id)).toEqual({ modes: ['plus-lighter', 'plus-lighter', 'plus-lighter'], between: true, drag: false });
    // Let go, the motions run on from that moment to their end.
    await host(page, id).evaluate((el) => el.shadowRoot!.getAnimations().forEach((animation) => animation.play()));
    await expect.poll(() => running(thumbOf(page, id), 'translate'), { timeout: 5000 }).toBe(null);
    await expect.poll(() => blending(page, id)).toEqual(AT_REST);
  });

  test('SWT-8 ripple: a press outside the container — on the label, or on the track away from the handle — grows it from the container’s center', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    for (const target of [labelOf(page, 'unselected'), trackOf(page, 'unselected')]) {
      const b = await bounds(target);
      await page.mouse.move(b.x + b.width - 3, b.y + b.height / 2);
      await page.mouse.down();
      const origin = await ripples(page, 'unselected').evaluate((el) => {
        const own = el.getBoundingClientRect();
        return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height];
      });
      expect(origin[0]).toBeCloseTo(0.5, 5);
      expect(origin[1]).toBeCloseTo(0.5, 5);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await expect(ripples(page, 'unselected')).toHaveCount(0);
    }
  });

  test('SWT-13: switching carries the progress, and with it the handle, its size and the track, outline, handle and icon colors, over selection-duration with selection-easing; reduced motion shows the new condition at once', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-selection-duration'), 'duration');
    // The handle's place is what the progress is first drawn by: the thumb's translate.
    const timing = await thumbOf(page, 'unselected').evaluate((el) => {
      const s = getComputedStyle(el);
      const at = s.transitionProperty.split(', ').indexOf('translate');
      return { at, duration: s.transitionDuration.split(', ')[at], easing: s.transitionTimingFunction.split(/, (?![^(]*\))/)[at] };
    });
    expect(timing.at).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(timing.duration) * 1000).toBe(duration);
    const easing = await page.evaluate((name) => {
      const probe = document.body.appendChild(document.createElement('div'));
      probe.style.transitionTimingFunction = `var(${name})`;
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-selection-easing'));
    expect(timing.easing).toBe(easing);
    // The progress is what travels (and so every part at once: SWT-3 / SWT-13 above reads each); switched, it runs for selection-duration.
    const travelling = await host(page, 'unselected').evaluate(async (el) => {
      (el as any).checked = true;
      await (el as any).updateComplete;
      const all = el.shadowRoot!.getAnimations().filter((a) => a instanceof CSSTransition);
      return { place: all.filter((a) => (a as CSSTransition).transitionProperty === 'translate').map((a) => Number(a.effect!.getTiming().duration)), durations: [...new Set(all.map((a) => Number(a.effect!.getTiming().duration)))], easings: [...new Set(all.map((a) => String(a.effect!.getTiming().easing)))] };
    });
    expect(travelling.place).toHaveLength(1);
    expect(travelling.place[0]).toBeCloseTo(duration, 3);
    // Every transition the change started has that one duration and that one curve.
    expect(travelling.durations).toHaveLength(1);
    expect(travelling.easings).toHaveLength(1);
    // Reduced motion: at once.
    await mountFixtures(page, spec, { reducedMotion: true });
    for (const locator of [rootOf(page, 'unselected'), trackOf(page, 'unselected'), handleOf(page, 'unselected'), host(page, 'unselected').locator('.thumb'), container(page, 'unselected'), ...(['fill', 'paint', 'tint'] as const).flatMap((part) => (['off', 'on'] as const).map((condition) => layerOf(page, 'unselected', part, condition))), rulerOf(page, 'unselected', 'more'), shareOf(page, 'unselected', 'less'), host(page, 'unselected').locator('.elevation.on'), host(page, 'unselected').locator('.sizer')]) {
      expect(await css(locator, 'transition-duration')).toBe('0s');
    }
    const t = await bounds(trackOf(page, 'unselected'));
    await host(page, 'unselected').click();
    expect((await center(handleOf(page, 'unselected'))).x).toBeCloseTo(t.x + t.width - t.height / 2, 5);
    expect(await painted(page, 'unselected', 'track')).toBe(await resolveColor(page, T('selected-track-color')));
    expect(await host(page, 'unselected').evaluate((el) => el.shadowRoot!.getAnimations().length), 'nothing is on its way').toBe(0);
  });
});

// SWT-19 … SWT-21: the drag. `at` is a place along the track as the handle's progress would be there — 0 at its
// unselected position, 1 at its selected one, beyond them toward the track's ends — so no test writes a pixel.
type RGBA = [number, number, number, number];
interface Step {
  at: number;
  /** Downward distance from the track's midline, in px. */
  dy?: number;
  /** The time since the event before, in ms. */
  dt: number;
}
/** A slow move from `from` to `to`, in eight steps 16 ms apart. */
const slow = (from: number, to: number): Step[] => Array.from({ length: 8 }, (_, i) => ({ at: from + ((to - from) * (i + 1)) / 8, dt: 16 }));
/**
 * A pointer dispatched in the page on `on` (the control: the track, the handle and the target around them): pointer down
 * at `from`, one move per step and — unless `up` is null — pointer up that many ms after the last move, where it is.
 * Returns the progress drawn in the same task as the last event — the handle's place, read from the thumb — a drag has no motion of its own.
 */
async function drag(page: P, id: string, from: number, steps: Step[], { up = 300 as number | null, pointerType = 'touch', on = '.control', down = true } = {}) {
  return host(page, id).evaluate(
    (el, { from, steps, up, pointerType, on, down }) => {
      const root = el.shadowRoot!;
      const track = root.querySelector('.track')!;
      const r = track.getBoundingClientRect();
      const rtl = getComputedStyle(track).direction === 'rtl';
      const x = (at: number) => r.left + r.height / 2 + (rtl ? 1 - at : at) * (r.width - r.height);
      const y0 = r.top + r.height / 2;
      const target = root.querySelector(on)!;
      const w = window as any;
      w.dragStamp ??= performance.now() - 5000;
      const fire = (type: string, at: number, dy = 0) => {
        const event = new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 21, pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x(at), clientY: y0 + dy });
        Object.defineProperty(event, 'timeStamp', { value: w.dragStamp });
        target.dispatchEvent(event);
      };
      // Where the pointer is stays with the page, so that a later call moves or lifts it from there.
      let last: { at: number; dy: number } = down ? { at: from, dy: 0 } : w.dragLast;
      if (down) fire('pointerdown', from);
      for (const step of steps) {
        w.dragStamp += step.dt;
        last = { at: step.at, dy: step.dy ?? 0 };
        fire('pointermove', last.at, last.dy);
      }
      if (up !== null) {
        w.dragStamp += up;
        fire('pointerup', last.at, last.dy);
      }
      w.dragLast = last;
      // Where the handle is drawn: how far the thumb's translate has carried it along its travel.
      const along = Number.parseFloat(getComputedStyle(root.querySelector('.thumb')!).translate) || 0;
      return (rtl ? -along : along) / ((track as HTMLElement).offsetWidth - (track as HTMLElement).offsetHeight);
    },
    { from, steps, up, pointerType, on, down },
  );
}
/** More moves, and maybe the release, of the pointer `drag()` left down. */
const dragOn = (page: P, id: string, steps: Step[], options: { up?: number | null; pointerType?: string } = {}) => drag(page, id, 0, steps, { up: null, ...options, down: false });
const cancelPointer = (page: P, id: string) =>
  host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.control')!.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true, pointerId: 21, pointerType: 'touch', isPrimary: true })));
/** Ends whatever the progress is doing (the return after a cancel, the rest of a release), as if its motion had run. */
const settle = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.getAnimations().forEach((a) => a.finish()));
const dragging = (page: P, id: string) => rootOf(page, id).evaluate((el) => el.hasAttribute('data-drag'));
/** The progress as it is drawn: how far the thumb's translate has carried the handle along its travel (mirrored in RTL). */
const progress = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const [thumb, track] = [el.shadowRoot!.querySelector('.thumb')!, el.shadowRoot!.querySelector('.track') as HTMLElement];
    const along = Number.parseFloat(getComputedStyle(thumb).translate) || 0;
    return (getComputedStyle(track).direction === 'rtl' ? -along : along) / (track.offsetWidth - track.offsetHeight);
  });
/** The progress a drag has written on the root (what every part is drawn from while it lasts), or null when none holds it. */
const written = (page: P, id: string) => rootOf(page, id).evaluate((el) => ((el as HTMLElement).style.getPropertyValue('--_tanrei-switch-progress') === '' ? null : Number((el as HTMLElement).style.getPropertyValue('--_tanrei-switch-progress'))));

/** A computed color as red, green, blue (0…255) and alpha. */
const rgba = (value: string): RGBA => {
  const srgb = /color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)(?: \/ ([-\d.e]+))?\)/.exec(value);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const rgb = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(value);
  if (!rgb) throw new Error(`not a color: ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
};
/** The linear interpolation of two colors in sRGB, as the browser mixes them (premultiplied by alpha). */
const mixed = (off: RGBA, on: RGBA, p: number): RGBA => {
  const alpha = off[3] * (1 - p) + on[3] * p;
  const channel = (i: number) => (alpha === 0 ? 0 : (off[i] * off[3] * (1 - p) + on[i] * on[3] * p) / alpha);
  return [channel(0), channel(1), channel(2), alpha];
};
const tokenRGBA = async (page: P, name: string) => rgba(await tokenColor(page, name));
/** Within one step of an 8-bit channel, and a hundredth of alpha. */
const sameColor = (a: RGBA, b: RGBA) => a[3] === 0 && b[3] === 0 ? true : [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) <= 1.01) && Math.abs(a[3] - b[3]) <= 0.01;
const expectColor = (actual: RGBA, wanted: RGBA, what: string) => expect(sameColor(actual, wanted), `${what}: drew ${actual.map((c) => +c.toFixed(2))}, expected ${wanted.map((c) => +c.toFixed(2))}`).toBe(true);

/** Everything the progress draws, as painted now: the handle's place along the track as a progress, its size, each mixed color, and each layer's opacity. */
const look = async (page: P, id: string) => {
  const raw = await host(page, id).evaluate((el, read) => {
    const root = el.shadowRoot!;
    const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
    const layers = (0, eval)(`(${read})`) as (root: ShadowRoot, part: string, property: string) => Layers;
    const [t, h] = [root.querySelector('.track')!.getBoundingClientRect(), root.querySelector('.handle')!.getBoundingClientRect()];
    const along = (h.left + h.width / 2 - t.left - t.height / 2) / (t.width - t.height);
    const layer = (selector: string) => (root.querySelector(selector) ? Number(s(selector).opacity) : null);
    const carried = Number.parseFloat(s('.thumb').translate) || 0;
    const track = root.querySelector('.track') as HTMLElement;
    // The handle is a circle: a radius of half its box, said as a share of it or as a length.
    const radius = s('.handle').borderTopLeftRadius;
    return {
      // The progress as the thumb's translate draws it.
      progress: (s('.track').direction === 'rtl' ? -carried : carried) / (track.offsetWidth - track.offsetHeight),
      place: s('.track').direction === 'rtl' ? 1 - along : along,
      centered: Math.abs(h.top + h.height / 2 - (t.top + t.height / 2)),
      size: h.width,
      tall: h.height,
      round: radius.endsWith('%') ? (Number.parseFloat(radius) / 100) * h.width : Number.parseFloat(radius),
      track: layers(root, 'fill', 'background-color'),
      outline: layers(root, 'fill', 'box-shadow'),
      handle: layers(root, 'paint', 'background-color'),
      container: layers(root, 'tint', 'background-color'),
      label: root.querySelector('.label') ? s('.label').color : null,
      elevation: { off: layer('.elevation.off'), on: layer('.elevation.on') },
      glyph: { off: layer('.glyph.off'), on: layer('.glyph.on') },
      glyphColor: { off: root.querySelector('.glyph.off') ? s('.glyph.off .icon').color : null, on: root.querySelector('.glyph.on') ? s('.glyph.on .icon').color : null },
      blend: ['fill', 'paint', 'tint'].map((part) => s(`.${part}.on`).mixBlendMode),
    };
  }, LAYERS);
  return { ...raw, layers: { track: raw.track, outline: raw.outline, handle: raw.handle, container: raw.container }, track: added(raw.track), outline: added(raw.outline), handle: added(raw.handle), container: added(raw.container), label: raw.label === null ? null : rgba(raw.label) };
};
/** What SWT-19 says is drawn at `p` in `state` ('pressed', or '' for the resting tokens): each part between the two conditions' tokens. */
const between = async (page: P, p: number, state: string, icons: { off: boolean; on: boolean }) => {
  const name = (condition: string, part: string) => T(`${condition}-${state ? `${state}-` : ''}${part}`);
  const color = async (part: string) => mixed(await tokenRGBA(page, name('unselected', part)), await tokenRGBA(page, name('selected', part)), p);
  const withIcon = await resolveToken(page, T('handle-size-with-icon'));
  const size = async (condition: 'unselected' | 'selected', icon: boolean) => Math.max(await resolveToken(page, name(condition, 'handle-size')), icon ? withIcon : 0);
  const [off, on] = [await size('unselected', icons.off), await size('selected', icons.on)];
  return { track: await color('track-color'), outline: await color('outline-color'), handle: await color('handle-color'), container: await color('container-color'), label: await color('label-color'), size: off + (on - off) * p };
};
/**
 * The decimals to which a frame of a transition (SWT-13) is held to one progress: a share — a layer's opacity, the
 * progress — that the browser interpolated is known only to some 1e-5 when the progress is not a round number.
 * Firefox interpolates an animated value in single precision and serializes a computed value to six significant
 * figures: a progress read back from a translate of 10.3921px over a 20 px travel is known to ±2.5e-6, an opacity to
 * ±5e-7, and the opacities of one frame, each interpolated on its own, were read up to 2e-6 apart (0.480545, 0.480546,
 * 0.480547). On CI they added up to 5.0e-6, the very edge of five decimals. Four decimals (< 5e-5)
 * are ten times that and still 1/80 of a level of an 8-bit channel the layers paint, so nothing they let through can
 * be drawn; a layer whose duration is a thousandth longer than the others' is 2e-4 off at 1200 ms of 6 s and fails,
 * and so does a held drag's glyph drawn at a thousandth past its progress. A drag's own progress is a number the
 * switch writes, and its looks keep five decimals.
 */
const FRAME_DIGITS = 4;
const expectLook = async (page: P, id: string, p: number, state: string, what: string, digits = 5) => {
  const d = await look(page, id);
  const want = await between(page, p, state, { off: d.glyph.off !== null, on: d.glyph.on !== null });
  expect(d.progress, `${what}: progress`).toBeCloseTo(p, digits);
  expect(d.place, `${what}: the handle's center is at the pointer's place`).toBeCloseTo(p, 2);
  expect(d.centered, `${what}: on the track's midline`).toBeLessThan(0.01);
  expect(d.size, `${what}: size`).toBeCloseTo(want.size, 2);
  expect(d.tall, `${what}: as tall as it is wide`).toBeCloseTo(d.size, 2);
  expect(d.round, `${what}: a circle`).toBeCloseTo(d.size / 2, 2);
  for (const part of ['track', 'outline', 'handle', 'container'] as const) {
    expectColor(d[part], want[part], `${what}: ${part}`);
    // Each layer is at the progress or its complement, and in its own condition's color whatever the progress.
    expect(d.layers[part].off.opacity, `${what}: ${part}, the unselected layer`).toBeCloseTo(1 - p, digits);
    expect(d.layers[part].on.opacity, `${what}: ${part}, the selected layer`).toBeCloseTo(p, digits);
  }
  // Between the two conditions the selected layer is added to the unselected one: the sum is the mix.
  expect(d.blend, `${what}: the layers are added`).toEqual(['plus-lighter', 'plus-lighter', 'plus-lighter']);
  if (d.label) expectColor(d.label, want.label, `${what}: label`);
  expect(d.elevation.off, `${what}: the unselected elevation`).toBeCloseTo(1 - p, digits);
  expect(d.elevation.on, `${what}: the selected elevation`).toBeCloseTo(p, digits);
  if (d.glyph.off !== null) expect(d.glyph.off, `${what}: the unselected glyph`).toBeCloseTo(1 - p, digits);
  if (d.glyph.on !== null) expect(d.glyph.on, `${what}: the selected glyph`).toBeCloseTo(p, digits);
  return d;
};

test.describe('read-only', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('before', { label: 'Before' }), ...spec.fixtures.filter((f) => f.id === 'read-only-selected'), fixture('ro-off', { readOnly: true, label: 'Bluetooth' })] });
    await page.mouse.move(0, 0);
  });

  test('SWT-25: a read-only switch is in the focus order, and no click on the track or the label, no Space, no element.click() and no dispatched click switches it or emits input or change', async ({ page }) => {
    for (const id of ['read-only-selected', 'ro-off']) {
      const target = host(page, id);
      const before = await isOn(target);
      await listen(target);
      await trackOf(page, id).click({ force: true });
      await labelOf(page, id).click();
      await target.evaluate((el) => {
        (el as HTMLElement).click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      });
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      await tabTo(page, target);
      await expect(input(page, id), id).toBeFocused();
      await page.keyboard.press('Space');
      const seen = await events(page);
      expect({ input: seen.input, change: seen.change }, id).toEqual({ input: 0, change: 0 });
      expect(await isOn(target), id).toBe(before);
      await expect(target.getByRole('switch', { checked: before }), id).toHaveCount(1);
    }
    await tabTo(page, host(page, 'before'));
    await tab(page);
    await expect(input(page, 'read-only-selected')).toBeFocused();
  });

  test('SWT-25: a drag along the track of a read-only switch is not taken: the handle stays, nothing is pressed and nothing is emitted', async ({ page }) => {
    const id = 'ro-off';
    await listen(host(page, id));
    await drag(page, id, 0, slow(0, 0.9), { up: null });
    expect(await dragging(page, id)).toBe(false);
    expect(await written(page, id)).toBeNull();
    expect(await pressed(page, id)).toBeNull();
    await dragOn(page, id, [], { up: 16 });
    await settle(page, id);
    expect(await progress(page, id)).toBe(0);
    expect(await isOn(host(page, id))).toBe(false);
    const seen = await events(page);
    expect({ input: seen.input, change: seen.change }).toEqual({ input: 0, change: 0 });
  });

  test('SWT-25: it is exposed as read-only beside on or off, and not as disabled; disabled wins over it; the product may still set checked', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures.filter((f) => f.id === 'read-only-selected'), fixture('both', { readOnly: true, disabled: true, label: 'Both' })] });
    const ro = host(page, 'read-only-selected');
    await expect(ro.getByRole('switch', { checked: true, disabled: false })).toHaveCount(1);
    await expect(input(page, 'read-only-selected')).toHaveAttribute('aria-readonly', 'true');
    await expect(host(page, 'both').getByRole('switch', { disabled: true })).toHaveCount(1);
    await expect(input(page, 'both')).not.toHaveAttribute('aria-readonly');
    await expect(ro).toHaveAttribute('readonly', '');
    await ro.evaluate((el) => ((el as any).checked = false));
    await expect(input(page, 'read-only-selected')).not.toBeChecked();
    await settle(page, 'read-only-selected');
    await page.mouse.move(0, 0);
    await matches(page, 'read-only-selected', 'unselected');
    await ro.evaluate((el) => ((el as any).readOnly = false));
    await expect(input(page, 'read-only-selected')).not.toHaveAttribute('aria-readonly');
    await trackOf(page, 'read-only-selected').click({ force: true });
    expect(await isOn(ro)).toBe(true);
  });

  test('SWT-25: it is drawn from the resting tokens of its condition — the enabled ones — with no hovered and no pressed state and no pressed handle size; keyboard focus shows the focused state', async ({ page }) => {
    const id = 'read-only-selected';
    await matches(page, id, 'selected');
    expect((await expected(page, 'selected')).track).not.toBe((await expected(page, 'selected', 'disabled')).track);
    await container(page, id).hover();
    await matches(page, id, 'selected');
    expect(await css(rootOf(page, id), 'cursor')).toBe('default');
    await page.mouse.down();
    expect(await pressed(page, id)).toBeNull();
    await matches(page, id, 'selected');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, host(page, id));
    await matches(page, id, 'selected', 'focused');
    await page.keyboard.down('Space');
    expect(await pressed(page, id)).toBeNull();
    await page.keyboard.up('Space');
    await matches(page, id, 'selected', 'focused');
  });

  test('SWT-25: a named read-only switch is submitted as it is drawn', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('wifi', { label: 'Wi-Fi', name: 'wifi', checked: true, readOnly: true }), fixture('bt', { label: 'Bluetooth', name: 'bt', readOnly: true })] });
    await page.evaluate(() => {
      const form = document.createElement('form');
      const main = document.querySelector('main')!;
      form.append(...main.querySelectorAll('.stage'));
      main.replaceWith(form);
    });
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
    expect(await data()).toEqual(['wifi=on']);
    await host(page, 'wifi').click();
    expect(await data()).toEqual(['wifi=on']);
  });
});

test.describe('drag', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
    // No catch-up unless a test asks for one: a drag taken away from the handle is at the pointer at once.
    await override(page, { [T('motion-state-duration')]: '0ms' });
  });

  test('SWT-19: a touch pressed on an off switch and held at the middle draws the handle there at its pressed size, every color the even mix of the two conditions’ pressed tokens and both glyphs at half opacity and at comp.switch.icon.weight, while checked, the exposed state and the native switch have not changed and nothing was emitted; a quarter of the way, every part is a quarter of the way', async ({ page }) => {
    const id = 'unselected-icon';
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('overlay');
    const before = await host(page, id).ariaSnapshot();
    await listen(host(page, id));
    expect(await drag(page, id, 0, slow(0, 0.5), { up: null }), 'in the task of the move').toBeCloseTo(0.5, 5);
    expect(await dragging(page, id)).toBe(true);
    expect(await pressed(page, id), 'it stays pressed').toBe('overlay');
    const middle = await expectLook(page, id, 0.5, 'pressed', 'the middle');
    // The default system's pressed handle is one size in both conditions (SWT-18), so it does not change on the way.
    expect(middle.size).toBe(await resolveToken(page, T('unselected-pressed-handle-size')));
    expect(middle.size).toBe(await resolveToken(page, T('selected-pressed-handle-size')));
    // The two ends differ, so the even mix is neither.
    expect(sameColor(middle.track, await tokenRGBA(page, T('unselected-pressed-track-color')))).toBe(false);
    expect(sameColor(middle.track, await tokenRGBA(page, T('selected-pressed-track-color')))).toBe(false);
    // The pixels, once: the fill's two layers, added, paint the even mix — read at a point of the fill that is clear of
    // the outline, of the handle and of the container around it.
    const [t, outline] = [await bounds(trackOf(page, id)), await resolveToken(page, T('outline-width'))];
    expect(middle.track[3], 'both fills are opaque, so the pixel is the mix alone').toBe(1);
    expect((await bounds(container(page, id))).x, 'clear of the container').toBeGreaterThan(t.x + outline + 3);
    const shot = decodePng(await page.screenshot({ clip: { x: t.x + outline + 1, y: t.y + t.height / 2 - 1, width: 2, height: 2 } }));
    for (const i of [0, 1, 2]) expect(Math.abs(shot.data[i] - middle.track[i]), `the painted fill, channel ${i}: ${[...shot.data.subarray(0, 3)]} against ${middle.track}`).toBeLessThanOrEqual(2);
    // Both glyphs, each in its own condition's color, family and fill, the unselected one under the selected one.
    expect(middle.glyph).toEqual({ off: 0.5, on: 0.5 });
    expect(legacy(middle.glyphColor.off!)).toBe(await resolveColor(page, T('unselected-pressed-icon-color')));
    expect(legacy(middle.glyphColor.on!)).toBe(await resolveColor(page, T('selected-pressed-icon-color')));
    expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.glyph')].map((g) => `${g.className} ${g.textContent!.trim()}`))).toEqual(['glyph off close', 'glyph on check']);
    // Both at comp.switch.icon.weight, the mark's own weight: nothing of the stroke changes on the way.
    const glyphWeight = Number(await token(page, T('icon-weight')));
    expect(glyphWeight).toBeGreaterThan(Number(await token(page, '--tanrei-sys-icon-weight')));
    expect([await weightOf(glyphOf(page, id, 'off')), await weightOf(glyphOf(page, id, 'on'))]).toEqual([glyphWeight, glyphWeight]);
    // Nothing but the drawing has changed.
    expect(await isOn(host(page, id))).toBe(false);
    await expect(input(page, id)).not.toBeChecked();
    expect(await host(page, id).ariaSnapshot()).toBe(before);
    expect(await events(page)).toMatchObject({ click: 0, input: 0, change: 0 });
    // A quarter of the way, and three quarters: no threshold, each part in proportion.
    expect(await dragOn(page, id, [{ at: 0.25, dt: 16 }])).toBeCloseTo(0.25, 5);
    await expectLook(page, id, 0.25, 'pressed', 'a quarter');
    await dragOn(page, id, [{ at: 0.75, dt: 16 }]);
    await expectLook(page, id, 0.75, 'pressed', 'three quarters');
    // Kept between its two positions.
    expect(await dragOn(page, id, [{ at: 1.6, dt: 16 }])).toBe(1);
    expect(await dragOn(page, id, [{ at: -0.7, dt: 16 }])).toBe(0);
    expect(await isOn(host(page, id))).toBe(false);
    expect(await events(page)).toMatchObject({ click: 0, input: 0, change: 0 });
  });

  test('SWT-19: no frame jumps as the handle crosses the middle — the place, the glyphs and every color move in proportion to the pointer, in both directions', async ({ page }) => {
    const id = 'unselected-icon';
    const STEP = 0.02;
    const [off, on] = [await between(page, 0, 'pressed', { off: true, on: true }), await between(page, 1, 'pressed', { off: true, on: true })];
    await drag(page, id, 0, slow(0, 0.5), { up: null });
    await dragOn(page, id, [{ at: 0.3, dt: 16 }]);
    let last = await look(page, id);
    const places = [...Array.from({ length: 20 }, (_, i) => 0.3 + STEP * (i + 1)), ...Array.from({ length: 20 }, (_, i) => 0.7 - STEP * (i + 1))];
    for (const at of places) {
      await dragOn(page, id, [{ at, dt: 16 }]);
      const now = await look(page, id);
      const what = `at ${at.toFixed(2)}`;
      expect(Math.abs(now.place - last.place), `${what}: place`).toBeCloseTo(STEP, 2);
      expect(Math.abs(now.glyph.on! - last.glyph.on!), `${what}: glyph`).toBeCloseTo(STEP, 5);
      expect(now.size, `${what}: size`).toBeCloseTo(last.size, 3);
      for (const part of ['track', 'outline', 'handle'] as const) {
        for (const i of [0, 1, 2]) {
          const span = Math.abs(on[part][i] - off[part][i]);
          expect(Math.abs(now[part][i] - last[part][i]), `${what}: ${part} channel ${i}`).toBeLessThanOrEqual(span * STEP + 0.5);
        }
      }
      last = now;
    }
    await expectLook(page, id, 0.3, 'pressed', 'back where it began');
  });

  test('SWT-19: a drag is taken past 8 px along the track with touch, a pen or a mouse, from the track, the handle or the target around them — not under the slop, not from the label, and not when it goes up or down first; the track leaves vertical panning to the page', async ({ page }) => {
    const id = 'unselected';
    const travel = (await resolveToken(page, T('track-width'))) - (await resolveToken(page, T('track-height')));
    const px = (distance: number) => distance / travel;
    for (const pointerType of ['touch', 'pen', 'mouse']) {
      // Under the slop nothing is taken; a release there is a tap's.
      expect(await drag(page, id, 0, [{ at: px(7.5), dt: 16 }], { up: null, pointerType }), pointerType).toBe(0);
      expect(await dragging(page, id), pointerType).toBe(false);
      // Past it, the handle is at the pointer.
      expect(await dragOn(page, id, [{ at: px(8.5), dt: 16 }], { pointerType }), pointerType).toBeCloseTo(px(8.5), 5);
      expect(await dragging(page, id), pointerType).toBe(true);
      await dragOn(page, id, [{ at: 0, dt: 16 }], { up: 300, pointerType });
      expect(await dragging(page, id), pointerType).toBe(false);
      expect(await isOn(host(page, id)), pointerType).toBe(false);
    }
    // From the target around the track (the control's hit area, SWT-5), beyond the handle's travel.
    expect(await drag(page, id, -0.7, slow(-0.7, 0.5), { up: null })).toBeCloseTo(0.5, 5);
    await cancelPointer(page, id);
    await settle(page, id);
    // A secondary mouse button takes none.
    await host(page, id).evaluate((el) => {
      const control = el.shadowRoot!.querySelector('.control')!;
      const box = control.getBoundingClientRect();
      const fire = (type: string, x: number) => control.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 2, buttons: 2, clientX: x, clientY: box.top + box.height / 2 }));
      fire('pointerdown', box.left + 10);
      fire('pointermove', box.left + 40);
      fire('pointerup', box.left + 40);
    });
    expect(await dragging(page, id)).toBe(false);
    // Not from the label: a press on it dragged sideways moves nothing.
    expect(await drag(page, id, 0, slow(0, 1), { up: null, on: '.label' })).toBe(0);
    expect(await dragging(page, id)).toBe(false);
    await dragOn(page, id, [], { up: 300 });
    // Further across the track than along it when it passes the slop: left to scrolling for its whole length.
    expect(await drag(page, id, 0, [{ at: px(4), dy: 12, dt: 16 }, { at: 1, dy: 14, dt: 16 }, { at: 1, dy: 0, dt: 16 }], { up: null })).toBe(0);
    expect(await dragging(page, id)).toBe(false);
    await dragOn(page, id, [], { up: 300 });
    expect(await isOn(host(page, id))).toBe(false);
    expect(await css(host(page, id).locator('.control'), 'touch-action')).toBe('pan-y');
  });

  test('SWT-19: taken with the pointer away from the handle, the handle comes to the pointer over the state motion, following it meanwhile', async ({ page }) => {
    const id = 'unselected';
    // The state motion at 60 s, and the clock of the handle's coming held at four tenths of its time, then ended by
    // hand. At 1500 ms the handle had to be found past 0.3 (500 ms in), and three more answers had to come before it
    // arrived: a runner that takes 250 ms an answer found it at the pointer.
    await override(page, { [T('motion-state-duration')]: '60s', [T('motion-state-easing')]: 'linear' });
    // A press near the on end of an off switch, dragged back a little: the handle was at 0, the pointer is at 0.9.
    const taken = await drag(page, id, 1.4, [{ at: 0.9, dt: 16 }], { up: null });
    expect(taken, 'it starts from where the handle is').toBeLessThan(0.2);
    const coming = (to: 'held' | 'ended') =>
      host(page, id).evaluate(async (el, to) => {
        // The clock is an animation without an effect on the part that carries the state motion; the handle is drawn
        // from it in the next frame.
        const clocks = el.shadowRoot!.querySelector('.sizer')!.getAnimations().filter((animation) => !(animation instanceof CSSTransition) && !(animation instanceof CSSAnimation));
        const durations = clocks.map((clock) => Number(clock.effect!.getTiming().duration));
        for (const clock of clocks) {
          if (to === 'ended') clock.finish();
          else {
            clock.pause();
            clock.currentTime = 0.4 * Number(clock.effect!.getTiming().duration);
          }
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return durations;
      }, to);
    expect(await coming('held'), 'it comes over the state motion').toEqual([60000]);
    const onItsWay = await progress(page, id);
    expect(onItsWay, 'on its way').toBeGreaterThan(0.3);
    expect(onItsWay).toBeLessThan(0.9);
    expect(onItsWay, 'four tenths of the way to the pointer at 0.9').toBeCloseTo(0.36, 2);
    // The pointer moves meanwhile: the handle heads for where the pointer is now, and never passes it.
    await dragOn(page, id, [{ at: 0.5, dt: 16 }]);
    expect(await progress(page, id)).toBeLessThan(0.5);
    await coming('ended');
    await expect.poll(() => progress(page, id), { timeout: 4000 }).toBe(0.5);
    // Caught up, it follows in the frame the pointer moves.
    expect(await dragOn(page, id, [{ at: 0.8, dt: 16 }])).toBeCloseTo(0.8, 5);
    await cancelPointer(page, id);
  });

  test('SWT-19 (cupertino): the handle keeps its size during a drag — only the colors, the elevation and the place change', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    await override(page, { [T('motion-state-duration')]: '0ms' });
    const id = 'unselected';
    const sizes = await Promise.all(['unselected-handle-size', 'unselected-pressed-handle-size', 'selected-handle-size', 'selected-pressed-handle-size'].map((name) => resolveToken(page, T(name))));
    expect(new Set(sizes).size, 'one size, pressed or not, off or on').toBe(1);
    const rest = await look(page, id);
    await drag(page, id, 0, slow(0, 0.5), { up: null });
    const middle = await expectLook(page, id, 0.5, 'pressed', 'cupertino, the middle');
    expect(middle.size).toBe(rest.size);
    expect(sameColor(middle.track, rest.track)).toBe(false);
    await cancelPointer(page, id);
  });

  test('SWT-11 / SWT-19: in RTL a drag still carries the handle to where the pointer is — the left end is on', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const id = 'unselected';
    const t = await bounds(trackOf(page, id));
    // Off is at the right. The pointer goes left by three quarters of the travel.
    await drag(page, id, 0, slow(0, 0.75), { up: null });
    await expectLook(page, id, 0.75, 'pressed', 'rtl');
    const x = (await center(handleOf(page, id))).x;
    expect(x).toBeCloseTo(t.x + t.width - t.height / 2 - 0.75 * (t.width - t.height), 1);
    // Held, then flung to the right from past the middle: toward off.
    await dragOn(page, id, [{ at: 0.75, dt: 300 }, { at: 0.65, dt: 2 }, { at: 0.55, dt: 2 }], { up: 2 });
    expect(await isOn(host(page, id))).toBe(false);
    await settle(page, id);
    // Released at the left end it is on.
    await drag(page, id, 0, slow(0, 1));
    expect(await isOn(host(page, id))).toBe(true);
  });

  test('SWT-13 / SWT-19: a frame of a tap’s transition and a drag held at the handle’s place in that frame draw the same look', async ({ page }) => {
    const id = 'unselected-icon';
    // The press itself aside (SWT-19's verify): with no answer to a press, a held drag paints the resting tokens.
    const slowly = { [T('motion-selection-duration')]: '6000ms', [T('motion-selection-easing')]: 'linear', [T('motion-state-duration')]: '0ms', '--tanrei-sys-behavior-pressed-feedback': 'none' };
    await override(page, slowly);
    // The first frame starts from rest: 1200 ms in, the progress is 0.2. The second starts from wherever the first
    // round's held drag, let go, has returned to by then (just under 0.2, by how long the runner took), so its progress
    // is no round number, and it is held to one progress at FRAME_DIGITS.
    for (const wait of [1200, 2400]) {
      // The transition A switch of `checked` starts, stopped at one of its moments.
      const stopped = await host(page, id).evaluate(async (el, time) => {
        (el as any).checked = true;
        await (el as any).updateComplete;
        // Everything the change set moving, stopped at the one moment.
        const travel = el.shadowRoot!.getAnimations();
        for (const animation of travel) {
          animation.pause();
          animation.currentTime = time;
        }
        return travel.map((animation) => (animation as CSSTransition).transitionProperty);
      }, wait);
      expect(stopped).toContain('translate');
      const frame = await look(page, id);
      expect(frame.progress).toBeGreaterThan(0.1);
      expect(frame.progress).toBeLessThan(0.9);
      await expectLook(page, id, frame.progress, '', 'a frame of the transition', FRAME_DIGITS);
      // The same switch, off again and at rest, dragged to that place and held.
      await mountFixtures(page, spec);
      await override(page, slowly);
      expect(await drag(page, id, -0.45, [{ at: frame.progress, dt: 16 }], { up: null })).toBeCloseTo(frame.progress, FRAME_DIGITS);
      expect(await pressed(page, id)).toBe('none');
      const held = await look(page, id);
      expect(held.place).toBeCloseTo(frame.place, 3);
      expect(held.size).toBeCloseTo(frame.size, 3);
      for (const part of ['track', 'outline', 'handle', 'container'] as const) expectColor(held[part], frame[part], part);
      expectColor(held.label!, frame.label!, 'label');
      expect(held.glyph.off).toBeCloseTo(frame.glyph.off!, FRAME_DIGITS);
      expect(held.glyph.on).toBeCloseTo(frame.glyph.on!, FRAME_DIGITS);
      expect(held.elevation.on).toBeCloseTo(frame.elevation.on!, FRAME_DIGITS);
      expect(held.glyphColor).toEqual(frame.glyphColor);
      await cancelPointer(page, id);
    }
  });

  test('SWT-20: released from the middle on it takes the other condition, with one input and one change carrying the new value; short of the middle it returns and emits nothing; a fling decides over the place', async ({ page }) => {
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    // Short of the middle, slowly: it stays off.
    await drag(page, id, 0, [...slow(0, 0.6), ...slow(0.6, 0.45)]);
    expect(await isOn(target)).toBe(false);
    expect(await events(page)).toMatchObject({ click: 0, input: 0, change: 0 });
    expect(await dragging(page, id)).toBe(false);
    await expect.poll(() => progress(page, id)).toBe(0);
    // Past the middle: on, heard once, `checked` already true when `input` is heard.
    await drag(page, id, 0, slow(0, 0.7));
    expect(await isOn(target)).toBe(true);
    await expect(input(page, id)).toBeChecked();
    expect(await events(page)).toEqual({ click: 0, input: 1, change: 1, carried: [true], checkedAtInput: [true] });
    expect(await target.ariaSnapshot()).toBe('- switch "Wi-Fi" [checked]');
    // On, released short of the middle from its own side: it stays on.
    await drag(page, id, 1, [...slow(1, 0.4), ...slow(0.4, 0.55)]);
    expect(await isOn(target)).toBe(true);
    // The middle itself is the other condition's, from either side.
    await drag(page, id, 1, slow(1, 0.5));
    expect(await isOn(target)).toBe(false);
    await drag(page, id, 0, slow(0, 0.5));
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toMatchObject({ click: 0, input: 3, change: 3, carried: [true, false, true] });
    await target.evaluate((el) => ((el as any).checked = false));
    await expect.poll(() => progress(page, id)).toBe(0);
    // A fling toward the on end, released short of the middle, turns it on…
    await drag(page, id, -0.5, [{ at: -0.2, dt: 8 }, { at: 0.1, dt: 8 }, { at: 0.3, dt: 8 }], { up: 4 });
    expect(await isOn(target)).toBe(true);
    await target.evaluate((el) => ((el as any).checked = false));
    // …and a fling back toward the off end, released past the middle, leaves it off.
    await drag(page, id, 1.6, [{ at: 1.3, dt: 8 }, { at: 1, dt: 8 }, { at: 0.7, dt: 8 }], { up: 4 });
    expect(await isOn(target)).toBe(false);
    // A pointer that stopped before it was lifted is not a fling: the place decides.
    await drag(page, id, -0.5, [{ at: -0.2, dt: 8 }, { at: 0.1, dt: 8 }, { at: 0.3, dt: 8 }], { up: 300 });
    expect(await isOn(target)).toBe(false);
    expect(await events(page)).toMatchObject({ click: 0, input: 4, change: 4, carried: [true, false, true, true] });
  });

  test('SWT-20: a fast drag that holds still for more than 40 ms before its release is no fling — short of the middle it stays off — and the same drag released within 40 ms of its last move turns it on', async ({ page }) => {
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    const r = await bounds(host(page, id).locator('.track'));
    // Where the handle's centre is at `at` of its travel (0 off, 1 on), on the track's middle line.
    const x = (at: number) => r.x + r.height / 2 + at * (r.width - r.height);
    const from = { x: x(-0.5), y: r.y + r.height / 2 };
    // Toward the on end, released short of the middle, each move 4 ms after the one before: only a fling turns it on.
    const moves = [-0.2, 0.1, 0.3].map((at) => ({ x: x(at), y: from.y }));
    expect((moves[2].x - moves[1].x) / 4, 'faster than 0.5 px per ms').toBeGreaterThan(0.5);
    const control = host(page, id).locator('.control');
    await flingThenHold(page, control, { from, moves, hold: STOPPED_AFTER + 1 });
    expect(await isOn(target)).toBe(false);
    await expect.poll(() => progress(page, id)).toBe(0);
    await flingThenHold(page, control, { from, moves, hold: STOPPED_AFTER });
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toMatchObject({ click: 0, input: 1, change: 1, carried: [true] });
  });

  test('SWT-20: the release ends the press and the handle finishes, or returns, over the selection motion from where the pointer left it', async ({ page }) => {
    // The selection motion at 30 s: the handle is read 'on its way' some six questions after the release, and its end
    // is not waited for (`settle` ends it).
    await override(page, { [T('motion-selection-duration')]: '30s', [T('motion-selection-easing')]: 'linear', '--tanrei-sys-motion-duration-press-hold': '0ms' });
    for (const [id, to, lands] of [['unselected', 0.7, 1], ['selected', 0.75, 1], ['label-hidden', 0.2, 0]] as const) {
      const from = id === 'unselected' ? 0 : 1;
      await drag(page, id, from, [...slow(from, 0.5), ...slow(0.5, to)], { up: null });
      expect(await pressed(page, id), id).not.toBeNull();
      const left = await dragOn(page, id, [], { up: 300 });
      expect(left, `${id}: the release itself moves nothing`).toBeCloseTo(to, 5);
      expect(await running(thumbOf(page, id), 'translate'), id).toBe(30000);
      expect(await written(page, id), `${id}: the drag has let the progress go`).toBeNull();
      await expect.poll(() => pressed(page, id), id).toBeNull();
      // On its way from where the pointer left it: past that place, and not there yet.
      await expect.poll(async () => Math.abs((await progress(page, id)) - to), id).toBeGreaterThan(0);
      const p = await progress(page, id);
      expect(p > Math.min(to, lands) && p < Math.max(to, lands), `${id}: on its way from ${to} to ${lands}, at ${p}`).toBe(true);
      expect((await blending(page, id)).between, `${id}: between its conditions on the way`).toBe(true);
      await settle(page, id);
      expect(await progress(page, id), id).toBe(lands);
      await expect.poll(() => blending(page, id), id).toEqual(AT_REST);
    }
  });

  test('SWT-20: with a mouse, the click that follows a taken drag is not an activation — one change per committed drag, none for one that returns — and the next click switches it as before', async ({ page }) => {
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    const t = await bounds(trackOf(page, id));
    const [off, on, y] = [t.x + t.height / 2, t.x + t.width - t.height / 2, t.y + t.height / 2];
    // Dragged to the on end and released: on, once. A click the release produced would have switched it back.
    await page.mouse.move(off, y);
    await page.mouse.down();
    await page.mouse.move(on, y, { steps: 6 });
    expect(await dragging(page, id)).toBe(true);
    expect(await isOn(target)).toBe(false);
    await page.waitForTimeout(150);
    await page.mouse.up();
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toEqual({ click: 0, input: 1, change: 1, carried: [true], checkedAtInput: [true] });
    // Dragged away and back, held, released where it began: it returns, nothing is heard, and the click does not switch it.
    await page.mouse.down();
    await page.mouse.move(off, y, { steps: 6 });
    await page.mouse.move(on, y, { steps: 6 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toMatchObject({ click: 0, input: 1, change: 1 });
    // The click after it is a click.
    await page.mouse.click(on, y);
    expect(await isOn(target)).toBe(false);
    expect(await events(page)).toMatchObject({ click: 1, input: 2, change: 2, carried: [true, false] });
    await labelOf(page, id).click();
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toMatchObject({ click: 2, input: 3, change: 3 });
  });

  test('SWT-21: Escape, a cancelled pointer, disabled becoming true and checked set by the product each end the drag without a change; the handle returns to the condition checked holds over the selection motion', async ({ page }) => {
    // The selection motion at 30 s: the return is asked for two questions after what ends the drag, and is ended by hand.
    await override(page, { [T('motion-selection-duration')]: '30s' });
    const id = 'unselected';
    const target = host(page, id);
    await listen(target);
    const returned = async (to: number, what: string) => {
      expect(await dragging(page, id), what).toBe(false);
      expect(await running(thumbOf(page, id), 'translate'), `${what}: over the selection motion`).toBe(30000);
      await settle(page, id);
      expect(await progress(page, id), what).toBe(to);
      await expect.poll(() => pressed(page, id), what).toBeNull();
    };
    // Escape, while a real mouse holds the handle past the middle; the click its release produces is not an activation.
    const t = await bounds(trackOf(page, id));
    const [off, y] = [t.x + t.height / 2, t.y + t.height / 2];
    await page.mouse.move(off, y);
    await page.mouse.down();
    await page.mouse.move(off + 0.8 * (t.width - t.height), y, { steps: 6 });
    expect(await progress(page, id)).toBeCloseTo(0.8, 2);
    await page.keyboard.press('Escape');
    await returned(0, 'Escape');
    await page.mouse.up();
    expect(await isOn(target)).toBe(false);
    await page.mouse.move(0, 0);
    // The platform cancels the pointer.
    await drag(page, id, 0, slow(0, 0.8), { up: null });
    await cancelPointer(page, id);
    await returned(0, 'pointercancel');
    // disabled becomes true.
    await drag(page, id, 0, slow(0, 0.8), { up: null });
    await target.evaluate(async (el) => { (el as any).disabled = true; await (el as any).updateComplete; });
    await returned(0, 'disabled');
    await dragOn(page, id, [], { up: 300 });
    expect(await isOn(target)).toBe(false);
    await target.evaluate(async (el) => { (el as any).disabled = false; await (el as any).updateComplete; });
    // The product sets checked: the drag ends, and the handle goes to the condition it has just set.
    await drag(page, id, 0, slow(0, 0.6), { up: null });
    await target.evaluate(async (el) => { (el as any).checked = true; await (el as any).updateComplete; });
    await returned(1, 'checked set by the product');
    // The pointer's later moves and its release are no longer the switch's.
    expect(await dragOn(page, id, [{ at: 0, dt: 16 }], { up: 300 })).toBe(1);
    expect(await isOn(target)).toBe(true);
    expect(await events(page)).toMatchObject({ click: 0, input: 0, change: 0 });
  });

  test('SWT-21: nothing is exposed before the release — mid-drag the accessibility snapshot and the value a form would submit are those before the press; the release changes both', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.querySelector('main')!.appendChild(document.createElement('form'));
      stage.setAttribute('data-fixture', 'form');
      stage.className = 'stage';
      stage.innerHTML = '<tanrei-switch name="wifi" label="Wi-Fi"></tanrei-switch>';
    });
    const id = 'form';
    await host(page, id).evaluate((el) => (el as any).updateComplete);
    const submitted = () => page.evaluate(() => new FormData(document.querySelector('form')!).get('wifi'));
    const before = await host(page, id).ariaSnapshot();
    expect(before).toBe('- switch "Wi-Fi"');
    expect(await submitted()).toBeNull();
    await drag(page, id, 0, slow(0, 0.9), { up: null });
    expect(await progress(page, id)).toBeCloseTo(0.9, 5);
    expect(await host(page, id).ariaSnapshot()).toBe(before);
    expect(await input(page, id).getAttribute('aria-checked')).toBeNull();
    await expect(input(page, id)).not.toBeChecked();
    expect(await submitted()).toBeNull();
    await dragOn(page, id, [], { up: 300 });
    expect(await host(page, id).ariaSnapshot()).toBe('- switch "Wi-Fi" [checked]');
    await expect.poll(submitted).toBe('on');
  });

  test('SWT-21: with motion reduced the handle is still drawn where the pointer is, at once even when the drag is taken away from it, and is at its condition’s position in the frame after the release or a cancel', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const id = 'unselected';
    // The state motion has its own duration here: only reduced motion removes the catch-up.
    expect(await resolveToken(page, T('motion-state-duration'), 'duration')).toBeGreaterThan(0);
    expect(await drag(page, id, 1.4, [{ at: 0.9, dt: 16 }], { up: null }), 'no catch-up').toBeCloseTo(0.9, 5);
    await dragOn(page, id, [{ at: 0.6, dt: 16 }]);
    await expectLook(page, id, 0.6, 'pressed', 'reduced motion, held');
    expect(await dragOn(page, id, [], { up: 300 }), 'at once').toBe(1);
    expect(await isOn(host(page, id))).toBe(true);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    // No travel began, so nothing is between anything: the mark of one is gone two frames later.
    await expect.poll(() => blending(page, id)).toEqual(AT_REST);
    const t = await bounds(trackOf(page, id));
    expect((await center(handleOf(page, id))).x).toBeCloseTo(t.x + t.width - t.height / 2, 5);
    // A cancel lands at once too.
    await drag(page, id, 1, slow(1, 0.2), { up: null });
    await cancelPointer(page, id);
    expect(await progress(page, id)).toBe(1);
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
  });
});

test.describe('accessibility', () => {
  test('SWT-14: role switch, on or off — never a checked checkbox — and the icon is not exposed', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(await host(page, 'unselected').ariaSnapshot()).toBe('- switch "Wi-Fi"');
    expect(await host(page, 'selected').ariaSnapshot()).toBe('- switch "Wi-Fi" [checked]');
    expect(await host(page, 'selected-icon').ariaSnapshot()).toBe('- switch "Wi-Fi" [checked]');
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    expect(await page.locator('main').ariaSnapshot()).not.toMatch(/text:|close|check(?!ed)/);
    await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toHaveCount(spec.fixtures.length);
  });

  test('SWT-15: the label sits at the inline end of the track, label.gap away, in label.typescale, wrapping rather than truncating, the track centered on its first line', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('long', { label: 'Share my location with people I trust' })] });
    const gap = await resolveToken(page, T('label-gap'));
    const [t, l] = [await bounds(trackOf(page, 'unselected')), await bounds(labelOf(page, 'unselected'))];
    expect(l.x - (t.x + t.width)).toBeCloseTo(gap, 5);
    expect(Number.parseFloat(await css(labelOf(page, 'unselected'), 'font-size'))).toBe(await resolveToken(page, T('label-typescale-font-size')));
    expect(await css(labelOf(page, 'unselected'), 'color')).toBe(await resolveColor(page, T('unselected-label-color')));
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="long"]')!.style.inlineSize = '150px'));
    const lines = await labelOf(page, 'long').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.y))).size;
    });
    expect(lines).toBeGreaterThan(1);
    // The track is centered on the label's first line: a short line is padded down to the track's middle…
    const firstLine = (id: string) => labelOf(page, id).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rect = range.getClientRects()[0];
      return rect.y + rect.height / 2;
    });
    expect(Math.abs((await center(trackOf(page, 'long'))).y - (await firstLine('long')))).toBeLessThanOrEqual(1);
    // …and a line taller than the track moves the track down to the line's middle.
    await override(page, { [T('label-typescale-font')]: '400 40px/1.5 Inter' });
    expect(Math.abs((await center(trackOf(page, 'long'))).y - (await firstLine('long')))).toBeLessThanOrEqual(1);
  });

  test('SWT-16: label-hidden draws no label and keeps the name; an empty label still renders and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('nameless', {})] });
    await expect(labelOf(page, 'label-hidden')).toHaveCount(0);
    await expect(host(page, 'label-hidden').getByRole('switch', { name: 'Wi-Fi', checked: true })).toHaveCount(1);
    expect((await bounds(trackOf(page, 'nameless'))).width).toBe(await resolveToken(page, T('track-width')));
    await expect.poll(() => seen.filter((w) => w.includes('SWT-16'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('SWT-16'))).toMatch(/<tanrei-switch>: label is empty/);
    await host(page, 'nameless').evaluate((el) => ((el as any).label = 'Bluetooth'));
    await expect(host(page, 'nameless').getByRole('switch', { name: 'Bluetooth' })).toHaveCount(1);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('keyboard: Tab moves through the enabled switches in order, Shift+Tab back', async ({ page }) => {
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

  test('forced colors: the track keeps a visible border where the engine has the mode', async ({ page }) => {
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
    expect(await css(trackOf(page, 'unselected'), 'border-top-style')).toBe('solid');
  });
});

test.describe('form', () => {
  test('a named switch submits its value while on and resets to its checked attribute', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('wifi', { label: 'Wi-Fi', name: 'wifi', checked: true }), fixture('bt', { label: 'Bluetooth', name: 'bt', value: 'yes' })] });
    await page.evaluate(() => {
      const form = document.createElement('form');
      const main = document.querySelector('main')!;
      form.append(...main.querySelectorAll('.stage'));
      main.replaceWith(form);
    });
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
    expect(await data()).toEqual(['wifi=on']);
    await host(page, 'bt').click();
    await host(page, 'wifi').click();
    expect(await data()).toEqual(['bt=yes']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    expect(await data()).toEqual(['wifi=on']);
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
