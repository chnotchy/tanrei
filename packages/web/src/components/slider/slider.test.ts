// <tanrei-slider>, driven by specs/slider.spec.json: every behaviour id (SLD-1…24) is cited by a test title, every
// fixture has a baseline, and every part, state and choice of kind is read back from the tokens — never from a number
// written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';

const spec = loadSpec('slider');
// Every fixture fits in the window (they are stacked, 96 tall each and the vertical one 240): a press lands where it aims.
test.use({ viewport: { width: 1280, height: 1200 } });
type P = Page;
type Id = 'start' | 'end';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-slider`);
const thumbOf = (page: P, id: string, which: Id = 'end') => host(page, id).locator(`.thumb[data-handle="${which}"]`);
const handleOf = (page: P, id: string, which: Id = 'end') => thumbOf(page, id, which).locator('.handle');
const containerOf = (page: P, id: string, which: Id = 'end') => thumbOf(page, id, which).locator('.container');
const indicatorOf = (page: P, id: string, which: Id = 'end') => thumbOf(page, id, which).locator('.value-indicator');
const rootOf = (page: P, id: string) => host(page, id).locator('.root');
const activeOf = (page: P, id: string) => host(page, id).locator('.piece.active');
const css = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const T = (name: string) => `--tanrei-comp-slider-${name}`;
const S = (state: string, part: string) => T(`standard-${state ? `${state}-` : ''}${part}`);
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props });
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const rect = (locator: Locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const center = async (locator: Locator) => { const r = await rect(locator); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const values = (page: P, id: string) => host(page, id).evaluate((el) => [(el as any).startValue, (el as any).value] as [number, number]);
/** The values rounded to whole numbers: a press on a continuous slider lands within a pixel of its aim. */
const rounded = async (page: P, id: string) => (await values(page, id)).map((v) => Math.round(v));
const valueOf = async (page: P, id: string) => (await values(page, id))[1];
const pressed = (page: P, id: string, which: Id = 'end') => containerOf(page, id, which).getAttribute('data-pressed');
const ripples = (page: P, id: string) => containerOf(page, id).locator('.ripple');
/** The viewport point of a value on the travel (the rail): horizontal from the inline start, vertical from the bottom. */
async function at(page: P, id: string, value: number, { min = 0, max = 100, rtl = false, vertical = false } = {}) {
  const r = await rect(host(page, id).locator('.rail'));
  const f = (value - min) / (max - min);
  if (vertical) return { x: r.x, y: r.bottom - f * r.height };
  return { x: rtl ? r.right - f * r.width : r.x + f * r.width, y: r.y };
}
/** Records input and change on the element, with the values the element holds at each. */
const listen = (locator: Locator) =>
  locator.evaluate((el) => {
    const log: string[] = ((window as any).log = []);
    for (const type of ['input', 'change']) {
      el.addEventListener(type, (event) => {
        const d = (event as CustomEvent).detail;
        log.push(`${type}:${d.startValue === undefined ? '' : `${d.startValue}-`}${d.value}:${(el as any).value}`);
      });
    }
  });
const log = (page: P) => page.evaluate(() => (window as any).log as string[]);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
/** Everything a handle and the slider paint, as drawn. */
const drawn = (page: P, id: string, which: Id = 'end') =>
  host(page, id).evaluate((el, w) => {
    const root = el.shadowRoot!;
    const s = (selector: string) => getComputedStyle(root.querySelector(selector)!);
    const thumb = `.thumb[data-handle="${w}"]`;
    return {
      container: s(`${thumb} .container`).backgroundColor,
      handle: s(`${thumb} .handle`).backgroundColor,
      outline: getComputedStyle(root.querySelector(`${thumb} .handle`)!, '::before').borderTopColor,
      track: s('.piece:not(.active)').backgroundColor,
      active: s('.piece.active').backgroundColor,
      opacity: s('.root').opacity,
    };
  }, which);
const expected = async (page: P, state = '') => ({
  container: await resolveColor(page, S(state, 'container-color')),
  handle: await resolveColor(page, S(state, 'handle-color')),
  outline: await resolveColor(page, S(state, 'handle-outline-color')),
  track: await resolveColor(page, S(state, 'track-color')),
  active: await resolveColor(page, S(state, 'active-track-color')),
  opacity: state ? await token(page, T(`${state}-opacity`)) : '1',
});
const matches = async (page: P, id: string, state = '', which: Id = 'end') => {
  const want = await expected(page, state);
  await expect.poll(() => drawn(page, id, which), `${id} draws ${state || 'at rest'}`).toEqual(want);
};
/** The duration (ms) of the running transition of `property` on the element, or null when none runs. */
const running = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const t = el.getAnimations().find((a) => (a as CSSTransition).transitionProperty === p);
    return t ? Math.round(Number(t.effect!.getTiming().duration)) : null;
  }, property);
const settle = (page: P) => page.waitForTimeout(700);
/**
 * The durations (ms) of the transitions of `property` the element itself has begun since `watchTransitions(locator)` —
 * kept as the engine announces them, where `running` asks a round trip later for one that may be over by then.
 */
const begun = async (locator: Locator, property: string) => (await transitionsRun(locator)).filter((run) => run.own && run.pseudo === '' && run.property === property).map((run) => run.duration);
/** SLD-8: how far from a handle's center the tracks stop — 0 while track.gap is 0 (they meet under it), else past its edge by the gap. */
const cutAt = async (page: P) => {
  const gap = await resolveToken(page, T('track-gap'));
  return gap > 0 ? (await resolveToken(page, S('', 'handle-width'))) / 2 + gap : 0;
};
/** Colors in a screenshot are compared within antialiasing noise. */
const near = (a: string, b: string, within = 12) => {
  const [x, y] = [a, b].map((c) => c.match(/\d+/g)!.map(Number));
  return x.slice(0, 3).every((v, i) => Math.abs(v - y[i]) <= within);
};
/** The screenshot of a fixture's slider, read at CSS-pixel points relative to the viewport. */
async function pixels(page: P, id: string) {
  const box = await rect(host(page, id));
  const shot = decodePng(await host(page, id).screenshot({ animations: 'disabled' }));
  const dpr = await page.evaluate(() => devicePixelRatio);
  return (x: number, y: number) => shot.at(Math.round((x - box.x) * dpr), Math.round((y - box.y) * dpr));
}

test.describe('values, pointer and keys', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  test('SLD-1: a stepped slider takes only min plus whole multiples of step up to max, the nearest; a continuous one any value between min and max', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('stepped', { label: 'Stepped', min: 3, max: 50, step: 10, value: 3 }), fixture('continuous', { label: 'Continuous', value: 0 })],
    });
    // 3 + 10k ≤ 50: 3, 13, 23, 33, 43 — a press near 50 takes 43, never 50.
    for (const [value, want] of [[17, 13], [19, 23], [49, 43], [-10, 3]] as const) {
      const p = await at(page, 'stepped', Math.max(3, Math.min(50, value)), { min: 3, max: 50 });
      await page.mouse.click(value < 3 ? p.x - 10 : p.x, p.y);
      expect(await valueOf(page, 'stepped'), `pressed at ${value}`).toBe(want);
    }
    const p = await at(page, 'continuous', 37.5);
    await page.mouse.click(p.x, p.y);
    const taken = await valueOf(page, 'continuous');
    expect(taken).toBeGreaterThan(36);
    expect(taken).toBeLessThan(39);
    // Beyond either end: clamped.
    const r = await rect(host(page, 'continuous'));
    await page.mouse.click(r.right - 2, r.y + r.height / 2);
    expect(await valueOf(page, 'continuous')).toBe(100);
    await page.mouse.click(r.x + 2, r.y + r.height / 2);
    expect(await valueOf(page, 'continuous')).toBe(0);
  });

  test('SLD-2: a pointer press moves the nearer handle to the value under it at once; a drag follows, input once per change, change once after the last input', async ({ page }) => {
    const id = 'discrete-stops';
    await listen(host(page, id));
    const from = await at(page, id, 70);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    expect(await valueOf(page, id)).toBe(70);
    expect(await log(page)).toEqual(['input:70:70']);
    for (const v of [72, 80, 81, 90]) {
      const p = await at(page, id, v);
      await page.mouse.move(p.x, p.y);
    }
    expect(await log(page)).toEqual(['input:70:70', 'input:80:80', 'input:90:90']);
    await page.mouse.up();
    expect(await log(page)).toEqual(['input:70:70', 'input:80:80', 'input:90:90', 'change:90:90']);
    // A press that ends where it began changes nothing and emits nothing more.
    const same = await at(page, id, 90);
    await page.mouse.click(same.x, same.y);
    expect((await log(page)).length).toBe(4);
    // A press that moves away and back ends with the value it started with: no change.
    await page.mouse.move(same.x, same.y);
    await page.mouse.down();
    const away = await at(page, id, 50);
    await page.mouse.move(away.x, away.y);
    await page.mouse.move(same.x, same.y);
    await page.mouse.up();
    expect(await log(page)).toEqual(['input:70:70', 'input:80:80', 'input:90:90', 'change:90:90', 'input:50:50', 'input:90:90']);
  });

  test('SLD-2: in a range the press moves the nearer handle; where the two meet, the one that can move toward the press', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('met', { range: true, step: 1, startValue: 50, value: 50, label: 'Maximum', startLabel: 'Minimum' })] });
    const p = await at(page, 'range', 25);
    await page.mouse.click(p.x, p.y);
    expect(await rounded(page, 'range')).toEqual([25, 60]);
    const q = await at(page, 'range', 50);
    await page.mouse.click(q.x, q.y);
    expect(await rounded(page, 'range')).toEqual([25, 50]);
    // Below the spec's fixtures: in view before it is pressed.
    await page.locator('[data-fixture="met"]').scrollIntoViewIfNeeded();
    const below = await at(page, 'met', 40);
    await page.mouse.click(below.x, below.y);
    expect(await rounded(page, 'met')).toEqual([40, 50]);
    await host(page, 'met').evaluate((el) => ((el as any).startValue = 50));
    const above = await at(page, 'met', 70);
    await page.mouse.click(above.x, above.y);
    expect(await rounded(page, 'met')).toEqual([50, 70]);
  });

  test('SLD-2: touch — a tap moves the handle when it ends, a drag along the track moves it once past the slop, a press that first travels across the track changes nothing', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is dispatched over CDP');
    const context = await browser.newContext({ hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await mountFixtures(page, spec);
    const cdp = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const id = 'continuous';
    await listen(host(page, id));
    // A tap: nothing while it is down, the value under it when it ends.
    const tap = await at(page, id, 80);
    await touch('touchStart', tap.x, tap.y);
    expect(await valueOf(page, id)).toBe(40);
    expect(await pressed(page, id)).not.toBeNull();
    await touch('touchEnd', tap.x, tap.y);
    await expect.poll(() => valueOf(page, id)).toBeCloseTo(80, 0);
    expect((await log(page)).map((e) => e.split(':')[0])).toEqual(['input', 'change']);
    // A drag along: nothing within the slop, then the handle follows.
    const start = await at(page, id, 50);
    await touch('touchStart', start.x, start.y);
    await touch('touchMove', start.x + 4, start.y);
    expect((await log(page)).length).toBe(2);
    await touch('touchMove', start.x + 40, start.y);
    await expect.poll(async () => (await log(page)).length).toBeGreaterThan(2);
    await touch('touchEnd', start.x + 40, start.y);
    await expect.poll(async () => (await log(page)).at(-1)!.split(':')[0]).toBe('change');
    const before = await log(page);
    const value = await valueOf(page, id);
    // Across first: left to the page's scroll.
    const across = await at(page, id, 20);
    await touch('touchStart', across.x, across.y);
    await touch('touchMove', across.x, across.y + 20);
    await touch('touchMove', across.x + 40, across.y + 40);
    await touch('touchEnd', across.x + 40, across.y + 40);
    await page.waitForTimeout(100);
    expect(await log(page)).toEqual(before);
    expect(await valueOf(page, id)).toBe(value);
    await context.close();
  });

  test('SLD-3: arrows move one keyboard step, Page Up / Down ten, Home / End to the ends; each change emits input then change; a key that changes nothing emits nothing', async ({ page }) => {
    const id = 'discrete-stops';
    await tabTo(page, handleOf(page, id));
    await listen(host(page, id));
    const press = async (key: string, want: number) => {
      await page.keyboard.press(key);
      expect(await valueOf(page, id), key).toBe(want);
    };
    await press('ArrowRight', 40);
    await press('ArrowUp', 50);
    await press('ArrowLeft', 40);
    await press('ArrowDown', 30);
    await press('PageUp', 100);
    await press('PageDown', 0);
    await press('End', 100);
    await press('Home', 0);
    expect(await log(page)).toEqual(['40', '50', '40', '30', '100', '0', '100', '0'].flatMap((v) => [`input:${v}:${v}`, `change:${v}:${v}`]));
    await press('ArrowLeft', 0);
    await press('Home', 0);
    expect((await log(page)).length).toBe(16);
    // Continuous: one hundredth of max − min.
    await tabTo(page, handleOf(page, 'centered'));
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'centered')).toBe(21);
    await page.keyboard.press('PageDown');
    expect(await valueOf(page, 'centered')).toBe(11);
  });

  test('SLD-4: an assistive-technology increment or decrement (the arrow key the browser dispatches to the slider) moves one keyboard step and emits input then change', async ({ page }) => {
    const id = 'continuous';
    await listen(host(page, id));
    const adjust = (key: string) =>
      handleOf(page, id).evaluate((el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true })), key);
    await adjust('ArrowUp');
    expect(await valueOf(page, id)).toBe(41);
    await adjust('ArrowDown');
    await adjust('ArrowDown');
    expect(await valueOf(page, id)).toBe(39);
    expect(await log(page)).toEqual(['input:41:41', 'change:41:41', 'input:40:40', 'change:40:40', 'input:39:39', 'change:39:39']);
  });

  test('SLD-5: a range draws a start handle at startValue and an end handle at value, stops each at the other, and makes each its own Tab stop and slider, start first', async ({ page }) => {
    const id = 'range';
    const r = await rect(host(page, id).locator('.rail'));
    expect((await center(handleOf(page, id, 'start'))).x).toBeCloseTo(r.x + 0.2 * r.width, 1);
    expect((await center(handleOf(page, id, 'end'))).x).toBeCloseTo(r.x + 0.6 * r.width, 1);
    await expect(host(page, id).getByRole('slider')).toHaveCount(2);
    // Dragging the start handle past the end stops at the end.
    const s = await center(handleOf(page, id, 'start'));
    await page.mouse.move(s.x, s.y);
    await page.mouse.down();
    const far = await at(page, id, 90);
    await page.mouse.move(far.x, far.y, { steps: 4 });
    await page.mouse.up();
    expect(await values(page, id)).toEqual([60, 60]);
    // Keys too: End on the start handle goes as far as the end handle.
    await host(page, id).evaluate((el) => ((el as any).startValue = 20));
    await tabTo(page, handleOf(page, id, 'start'));
    await page.keyboard.press('End');
    expect(await values(page, id)).toEqual([60, 60]);
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    await expect(handleOf(page, id, 'end')).toBeFocused();
    await page.keyboard.press('Home');
    expect(await values(page, id)).toEqual([0, 0]);
  });

  test('SLD-6: the active track runs from min (origin null) or from origin to the value, on either side; in a range between the two handles', async ({ page }) => {
    const rail = async (id: string) => rect(host(page, id).locator('.rail'));
    const cut = (_id: string) => cutAt(page);
    const thickness = await resolveToken(page, T('track-thickness-small'));
    // From min: the active track starts at the track's start.
    let r = await rail('continuous');
    let a = await rect(activeOf(page, 'continuous'));
    expect(a.x).toBeCloseTo(r.x - thickness / 2, 1);
    expect(a.right).toBeCloseTo(r.x + 0.4 * r.width - (await cut('continuous')), 1);
    // From the origin (0 of −50…50, the middle) to 20: on the right of it…
    r = await rail('centered');
    a = await rect(activeOf(page, 'centered'));
    expect(a.x).toBeCloseTo(r.x + 0.5 * r.width, 1);
    expect(a.right).toBeCloseTo(r.x + 0.7 * r.width - (await cut('centered')), 1);
    // …and on the left of it for a value below it.
    await host(page, 'centered').evaluate((el) => ((el as any).value = -30));
    await settle(page);
    a = await rect(activeOf(page, 'centered'));
    expect(a.x).toBeCloseTo(r.x + 0.2 * r.width + (await cut('centered')), 1);
    expect(a.right).toBeCloseTo(r.x + 0.5 * r.width, 1);
    // A range: between its handles.
    r = await rail('range');
    a = await rect(activeOf(page, 'range'));
    expect(a.x).toBeCloseTo(r.x + 0.2 * r.width + (await cut('range')), 1);
    expect(a.right).toBeCloseTo(r.x + 0.6 * r.width - (await cut('range')), 1);
  });
});

test.describe('geometry and paint', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  test('SLD-7: as long as its layout gives it and as thick as the larger of container.size and handle.height; the track inset by half the container size; the handle travels between its rounded ends; the whole slider is the hit area, sys.target across it', async ({ page }) => {
    const cs = await resolveToken(page, T('container-size'));
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    for (const size of ['small', 'medium', 'large']) {
      const id = size === 'small' ? 'continuous' : size;
      const [thickness, height] = [await resolveToken(page, T(`track-thickness-${size}`)), await resolveToken(page, T(`handle-height-${size}`))];
      const h = await rect(host(page, id));
      expect([h.width, h.height], id).toEqual([320, Math.max(cs, height)]);
      const track = await rect(host(page, id).locator('.travel'));
      expect(track.height, id).toBeCloseTo(thickness, 2);
      expect(track.y + track.height / 2, id).toBeCloseTo(h.y + h.height / 2, 2);
      // The travel of a handle's center: half the container size and half the thickness in from each end.
      expect(track.x, id).toBeCloseTo(h.x + cs / 2 + thickness / 2, 2);
      expect(track.right, id).toBeCloseTo(h.right - cs / 2 - thickness / 2, 2);
    }
    const hit = await rootOf(page, 'continuous').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBe(Math.max(cs, pointer));
    // A press anywhere on the hit area moves the handle there: above the slider's box but inside the target.
    const h = await rect(host(page, 'continuous'));
    const p = await at(page, 'continuous', 75);
    await page.mouse.click(p.x, h.y - (pointer - h.height) / 2 + 1);
    expect(await valueOf(page, 'continuous')).toBeCloseTo(75, 0);
    // The minimum value puts the handle's center half the thickness in from the track's start.
    await host(page, 'continuous').evaluate((el) => ((el as any).value = 0));
    await settle(page);
    const t = await rect(host(page, 'continuous').locator('.piece').first());
    expect((await center(handleOf(page, 'continuous'))).x).toBeCloseTo(h.x + cs / 2 + (await resolveToken(page, T('track-thickness-small'))) / 2, 1);
    expect(t.x).toBeCloseTo(h.x + cs / 2, 1);
  });

  test('SLD-7: a coarse pointer extends the hit area to sys.target.touch', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const hit = await rootOf(page, 'continuous').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    expect(hit).toBe(touch);
  });

  test('SLD-7: a handle drawn smaller than the target does not make the hit area smaller — each of a range’s handles takes a press anywhere across the target beside it, the round handle and Material’s bar alike', async ({ page }) => {
    for (const system of [undefined, 'm3-like'] as const) {
      await mountFixtures(page, spec, system ? { system } : {});
      const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
      const h = await rect(host(page, 'range'));
      const [top, bottom] = [h.y + h.height / 2 - pointer / 2 + 1, h.y + h.height / 2 + pointer / 2 - 1];
      const handle = await rect(handleOf(page, 'range', 'start'));
      // Beside the drawn handle along the axis, at the target's edges across it: outside the handle's box, inside the target.
      const beside = await at(page, 'range', 26);
      expect(beside.x > handle.right, `${system ?? 'tanrei'}: the press is beside the handle`).toBe(true);
      await page.mouse.click(beside.x, top);
      expect(await rounded(page, 'range'), `${system ?? 'tanrei'}: start, at the target's top`).toEqual([26, 60]);
      const below = await at(page, 'range', 54);
      await page.mouse.click(below.x, bottom);
      expect(await rounded(page, 'range'), `${system ?? 'tanrei'}: end, at the target's bottom`).toEqual([26, 54]);
    }
  });

  test('SLD-8: track and active track in their colors, rounded at the track’s ends; the handle handle.width × handle.height, centered on the midline; while track.gap is 0 the tracks run under the handle and meet square at its center, above 0 they stop the gap from its edge, rounded there', async ({ page }) => {
    await matches(page, 'continuous');
    const [w, hh] = [await resolveToken(page, S('', 'handle-width')), await resolveToken(page, T('handle-height-small'))];
    const handle = await rect(handleOf(page, 'continuous'));
    expect([handle.width, handle.height]).toEqual([w, hh]);
    const track = await rect(host(page, 'continuous').locator('.travel'));
    expect(handle.y + handle.height / 2).toBeCloseTo(track.y + track.height / 2, 2);
    // Gap 0 (the default system): both pieces reach the handle's center, square there.
    expect(await resolveToken(page, T('track-gap'))).toBe(0);
    const middle = handle.x + handle.width / 2;
    const [toHandle, fromHandle] = [await rect(activeOf(page, 'continuous')), await rect(host(page, 'continuous').locator('.piece').last())];
    expect(toHandle.right).toBeCloseTo(middle, 1);
    expect(fromHandle.x).toBeCloseTo(middle, 1);
    expect(await css(activeOf(page, 'continuous'), 'border-top-right-radius')).toBe('0px');
    expect(await css(host(page, 'continuous').locator('.piece').last(), 'border-top-left-radius')).toBe('0px');
    // Seen: from the active track into the outline there is nothing but the active track's color (no track, no
    // background, across the track's whole thickness), and past the handle the track starts at the outline.
    const px = await pixels(page, 'continuous');
    const mid = track.y + track.height / 2;
    const [activeColor, trackColor, outline] = [await resolveColor(page, S('', 'active-track-color')), await resolveColor(page, S('', 'track-color')), await resolveColor(page, S('', 'handle-outline-color'))];
    expect(outline).toBe(activeColor);
    for (const y of [mid - track.height / 2 + 0.75, mid, mid + track.height / 2 - 0.75]) {
      for (let x = handle.x - 4; x <= handle.x + 1; x += 0.5) expect(near(px(x, y), activeColor), `into the handle at ${x - handle.x}, ${y - mid}: ${px(x, y)}`).toBe(true);
    }
    expect(near(px(handle.right - 1, mid), outline), 'the outline past the center').toBe(true);
    expect(near(px(handle.right + 1.5, mid), trackColor), 'the track past the handle').toBe(true);
    const elevation = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.boxShadow = `var(${n})`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).boxShadow;
      probe.remove();
      return value;
    }, S('', 'handle-elevation'));
    expect(await css(handleOf(page, 'continuous'), 'box-shadow')).toBe(elevation);
    // A round handle (handle.shape is full, clamped to half its side) and round track ends.
    expect(Number.parseFloat(await css(handleOf(page, 'continuous'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(hh / 2);
    expect(Number.parseFloat(await css(activeOf(page, 'continuous'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(track.height / 2);
    // With a gap: the tracks stop that far from the handle's edge, and their ends there are rounded.
    await override(page, { [T('track-gap')]: '6px' });
    await settle(page);
    const edge = await rect(handleOf(page, 'continuous'));
    const active = await rect(activeOf(page, 'continuous'));
    const after = await rect(host(page, 'continuous').locator('.piece').last());
    expect(edge.x - active.right).toBeCloseTo(6, 1);
    expect(after.x - edge.right).toBeCloseTo(6, 1);
    expect(Number.parseFloat(await css(activeOf(page, 'continuous'), 'border-top-right-radius'))).toBeGreaterThan(0);
    // Back to 0: under the handle again, square at its center.
    await override(page, { [T('track-gap')]: '0px' });
    await settle(page);
    expect(await css(activeOf(page, 'continuous'), 'border-top-right-radius')).toBe('0px');
    expect((await rect(activeOf(page, 'continuous'))).right).toBeCloseTo(middle, 1);
  });

  test('SLD-8 (m3-like): Material’s bar — handle.width × handle.height, the tracks stopping track.gap from each side of it and rounded there, the pressed bar narrower with the tracks following it', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    await page.mouse.move(0, 0);
    const [w, hh, gap, pw] = await Promise.all([S('', 'handle-width'), T('handle-height-small'), T('track-gap'), S('pressed', 'handle-width')].map((n) => resolveToken(page, n)));
    expect(gap).toBeGreaterThan(0);
    expect(w).toBeLessThan(hh);
    for (const [id, which] of [['continuous', 'end'], ['range', 'start'], ['range', 'end']] as const) {
      const bar = await rect(handleOf(page, id, which));
      expect([bar.width, bar.height], `${id} ${which}`).toEqual([w, hh]);
    }
    const bar = await rect(handleOf(page, 'continuous'));
    const [before, after] = [await rect(activeOf(page, 'continuous')), await rect(host(page, 'continuous').locator('.piece').last())];
    expect(bar.x - before.right).toBeCloseTo(gap, 1);
    expect(after.x - bar.right).toBeCloseTo(gap, 1);
    const thickness = (await rect(host(page, 'continuous').locator('.travel'))).height;
    expect(Number.parseFloat(await css(activeOf(page, 'continuous'), 'border-top-right-radius'))).toBeGreaterThanOrEqual(thickness / 2);
    expect(Number.parseFloat(await css(host(page, 'continuous').locator('.piece').last(), 'border-top-left-radius'))).toBeGreaterThanOrEqual(thickness / 2);
    // A range: the active track between the two bars, the gap from each.
    const [s, e, between] = [await rect(handleOf(page, 'range', 'start')), await rect(handleOf(page, 'range', 'end')), await rect(activeOf(page, 'range'))];
    expect(between.x - s.right).toBeCloseTo(gap, 1);
    expect(e.x - between.right).toBeCloseTo(gap, 1);
    // Pressed, the bar narrows and the tracks stay the gap from it.
    const c = await center(handleOf(page, 'continuous'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await expect.poll(async () => (await rect(handleOf(page, 'continuous'))).width).toBeCloseTo(pw, 1);
    // The press also takes the value to the pointer (a fraction of a pixel from where the handle stood), so the bar
    // goes on moving after its width has settled: the bar and the tracks are read together, at the same moment, each
    // time — never the tracks against a box of the bar read earlier.
    const gaps = () =>
      host(page, 'continuous').evaluate((el) => {
        const box = (selector: string, last = false) => {
          const all = el.shadowRoot!.querySelectorAll(selector);
          return all[last ? all.length - 1 : 0]!.getBoundingClientRect();
        };
        const [bar, active, rest] = [box('.thumb[data-handle="end"] .handle'), box('.piece.active'), box('.piece', true)];
        return [bar.x - active.right, rest.x - bar.right];
      });
    await expect.poll(async () => (await gaps())[0], 'the active track stops track.gap before the pressed bar').toBeCloseTo(gap, 1);
    await expect.poll(async () => (await gaps())[1], 'and the track starts track.gap after it').toBeCloseTo(gap, 1);
    expect((await rect(handleOf(page, 'continuous'))).width, 'the bar is still the pressed width').toBeCloseTo(pw, 1);
    await page.mouse.up();
  });

  test('SLD-9: a dot of the size’s stop-indicator.size at each end of the travel that lies on the track, and with stops at every step — in the track’s or the active track’s dot color, none under a handle, none at size 0', async ({ page }) => {
    const size = await resolveToken(page, T('stop-indicator-size-small'));
    const visibleDots = (id: string) =>
      host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        return [...root.querySelectorAll('.dot')]
          .filter((dot) => {
            const d = dot.getBoundingClientRect();
            // A piece's dots are clipped to it: the piece drawn just before its dot layer.
            const p = dot.closest('.dots')!.previousElementSibling!.getBoundingClientRect();
            return d.left >= p.left - 0.5 && d.right <= p.right + 0.5 && p.width > 0;
          })
          .map((dot) => ({ at: Number((dot as HTMLElement).style.getPropertyValue('--_at')), active: dot.closest('.dots')!.classList.contains('active'), color: getComputedStyle(dot).backgroundColor, width: dot.getBoundingClientRect().width }))
          .sort((a, b) => a.at - b.at);
      });
    const [stop, activeStop] = [await resolveColor(page, S('', 'stop-indicator-color')), await resolveColor(page, S('', 'active-stop-indicator-color'))];
    // Continuous from min: only the far end lies on the track.
    expect((await visibleDots('continuous')).map((d) => [d.at, d.color, d.width])).toEqual([[1, stop, size]]);
    // Centered: both ends lie on the track.
    expect((await visibleDots('centered')).map((d) => d.at)).toEqual([0, 1]);
    // A range: both ends too.
    expect((await visibleDots('range')).map((d) => d.at)).toEqual([0, 1]);
    // Stops: every step, the one under the handle (30) not drawn; on the active track in its own color.
    const dots = await visibleDots('discrete-stops');
    expect(dots.map((d) => d.at)).toEqual([0, 0.1, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    for (const d of dots) expect(d.color, String(d.at)).toBe(d.at < 0.3 ? activeStop : stop);
    for (const d of dots) expect(d.width, String(d.at)).toBe(size);
    // Per size: the dot at the end of the travel in the medium and large fixtures; in the default system each is half
    // the track's thickness (2 / 3 / 4).
    for (const s of ['small', 'medium', 'large'] as const) {
      const want = await resolveToken(page, T(`stop-indicator-size-${s}`));
      expect(want, s).toBe((await resolveToken(page, T(`track-thickness-${s}`))) / 2);
      if (s !== 'small') expect((await visibleDots(s)).map((d) => [d.at, d.width]), s).toEqual([[1, want]]);
    }
    // Centered on the track's midline.
    const dot = await rect(host(page, 'large').locator('.dots:not(.active) .dot').last());
    const travel = await rect(host(page, 'large').locator('.travel'));
    expect(dot.y + dot.height / 2).toBeCloseTo(travel.y + travel.height / 2, 2);
    // A size of 0 draws none.
    await override(page, { [T('stop-indicator-size-small')]: '0px' });
    expect((await visibleDots('discrete-stops')).every((d) => d.width === 0)).toBe(true);
  });

  test('SLD-10: each handle’s container is container.size across, container.shape, centered on the handle and moving with it, clear at rest, behind the handle and outside the layout', async ({ page }) => {
    const cs = await resolveToken(page, T('container-size'));
    for (const [id, which] of [['continuous', 'end'], ['range', 'start'], ['range', 'end']] as const) {
      const c = await rect(containerOf(page, id, which));
      const h = await center(handleOf(page, id, which));
      expect([c.width, c.height], id).toEqual([cs, cs]);
      expect(c.x + c.width / 2, id).toBeCloseTo(h.x, 2);
      expect(c.y + c.height / 2, id).toBeCloseTo(h.y, 2);
      expect(await css(containerOf(page, id, which), 'background-color')).toBe(await resolveColor(page, S('', 'container-color')));
    }
    expect(Number.parseFloat(await css(containerOf(page, 'continuous'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(cs / 2);
    // Behind the handle: the handle comes later among its siblings.
    expect(await thumbOf(page, 'continuous').locator('.knob > *').evaluateAll((els) => els.map((e) => e.className))).toEqual(['container', 'handle', 'value-indicator']);
    // Size 0 draws none.
    await override(page, { [T('container-size')]: '0px' });
    expect((await rect(containerOf(page, 'continuous'))).width).toBe(0);
  });

  test('SLD-11: hover (the handle a press would move), keyboard focus and press paint that handle from their tokens, and the tracks and opacity from the slider’s highest state; pointer focus is not the focused state', async ({ page }) => {
    const id = 'range';
    await matches(page, id, '', 'end');
    // Hover near the end handle: only it is hovered.
    const near = await at(page, id, 65);
    await page.mouse.move(near.x, near.y);
    await matches(page, id, 'hovered', 'end');
    expect((await drawn(page, id, 'start')).container).toBe(await resolveColor(page, S('', 'container-color')));
    // Move toward the start handle: it takes the hover.
    const other = await at(page, id, 15);
    await page.mouse.move(other.x, other.y);
    await matches(page, id, 'hovered', 'start');
    await expect.poll(async () => (await drawn(page, id, 'end')).container).toBe(await resolveColor(page, S('', 'container-color')));
    // A press: pressed, at once.
    await page.mouse.down();
    expect((await drawn(page, id, 'start')).container).toBe(await resolveColor(page, S('pressed', 'container-color')));
    await page.mouse.up();
    // The press focused the handle, but that is not keyboard focus.
    await page.mouse.move(0, 0);
    await expect(handleOf(page, id, 'start')).toBeFocused();
    await matches(page, id, '', 'start');
    // Keyboard focus is.
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, handleOf(page, id, 'end'));
    await matches(page, id, 'focused', 'end');
  });

  test('SLD-11: under acme, where the three states differ, pressed beats focused beats hovered on the handle', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    const id = 'continuous';
    const bg = () => css(containerOf(page, id), 'background-color');
    const [rest, hovered, focused, down] = await Promise.all(['', 'hovered', 'focused', 'pressed'].map((s) => resolveColor(page, S(s, 'container-color'))));
    expect(new Set([rest, hovered, focused, down]).size).toBe(4);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(rest);
    const h = await center(handleOf(page, id));
    await page.mouse.move(h.x, h.y);
    await expect.poll(bg).toBe(hovered);
    await tabTo(page, handleOf(page, id));
    await expect.poll(bg).toBe(focused);
    await page.mouse.down();
    await expect.poll(bg).toBe(down);
    await page.mouse.up();
    await page.mouse.move(0, 0);
  });

  test('SLD-11: colors change over motion.state-duration; where motion is reduced, at once', async ({ page }) => {
    await override(page, { [T('motion-state-duration')]: '300ms', [S('hovered', 'handle-color')]: 'rgb(0, 0, 255)' });
    const h = await center(handleOf(page, 'continuous'));
    await watchTransitions(handleOf(page, 'continuous'));
    await watchTransitions(containerOf(page, 'continuous'));
    await page.mouse.move(h.x, h.y);
    await expect.poll(() => begun(handleOf(page, 'continuous'), 'background-color')).toEqual([300]);
    await expect.poll(() => begun(containerOf(page, 'continuous'), 'background-color')).toEqual([300]);
    await page.mouse.move(0, 0);
    await mountFixtures(page, spec, { reducedMotion: true });
    for (const locator of [handleOf(page, 'continuous'), containerOf(page, 'continuous'), activeOf(page, 'continuous')]) {
      expect((await css(locator, 'transition-duration')).split(',').every((d) => d.trim() === '0s')).toBe(true);
    }
  });

  test('SLD-12: keyboard focus shows the focus ring around the handle, not animated; focus by a press does not', async ({ page }) => {
    const p = await at(page, 'continuous', 60);
    await page.mouse.click(p.x, p.y);
    await expect(handleOf(page, 'continuous')).toBeFocused();
    await expect(handleOf(page, 'continuous')).toHaveCSS('outline-style', 'none');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await tabTo(page, handleOf(page, 'range', 'start'));
    const handle = handleOf(page, 'range', 'start');
    await expect(handle).toHaveCSS('outline-style', 'solid');
    await expect(handle).toHaveCSS('outline-color', await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    await expect(handle).toHaveCSS('outline-offset', `${await resolveToken(page, '--tanrei-sys-focus-offset')}px`);
    expect(await css(handle, 'transition-property')).not.toContain('outline');
    await expect(handleOf(page, 'range', 'end')).toHaveCSS('outline-style', 'none');
    // After a press, a key that operates the slider makes the focus keyboard focus, as the browser's own heuristic does.
    await page.mouse.click(p.x, p.y);
    await expect(handleOf(page, 'continuous')).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('ArrowRight');
    await expect(handleOf(page, 'continuous')).toHaveCSS('outline-style', 'solid');
  });
});

test.describe('press, feedback, corners, focus style and motion', () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await acmeSystemCss();
  });
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  test('SLD-13: a press shows the pressed state of the handle it moves at once, for as long as it lasts and for at least press-hold; a key shows none', async ({ page }) => {
    const hold = 1000;
    await override(page, { '--tanrei-sys-motion-duration-press-hold': `${hold}ms` });
    await containerOf(page, 'continuous').evaluate((c) => {
      const log: { on?: number; off?: number; down?: number } = ((window as any).press = {});
      window.addEventListener('pointerdown', () => (log.down ??= performance.now()), true);
      new MutationObserver(() => {
        if (c.hasAttribute('data-pressed')) log.on ??= performance.now();
        else if (log.on !== undefined) log.off ??= performance.now();
      }).observe(c, { attributes: true, attributeFilter: ['data-pressed'] });
    });
    const p = await at(page, 'continuous', 70);
    await page.mouse.click(p.x, p.y);
    expect(await pressed(page, 'continuous')).toBe('overlay');
    await expect.poll(() => page.evaluate(() => (window as any).press.off), { timeout: 5000 }).toBeDefined();
    const log = await page.evaluate(() => (window as any).press);
    expect(log.off - log.down).toBeGreaterThanOrEqual(hold - 1);
    // A long press lasts as long as the pointer is down.
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '50ms' });
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(300);
    expect(await pressed(page, 'continuous')).toBe('overlay');
    await page.mouse.up();
    await expect.poll(() => pressed(page, 'continuous')).toBeNull();
    // Keys change the value but are not a press.
    await tabTo(page, handleOf(page, 'continuous'));
    await page.keyboard.down('ArrowRight');
    expect(await pressed(page, 'continuous')).toBeNull();
    await page.keyboard.up('ArrowRight');
  });

  test('SLD-14 overlay (the default system): the pressed tokens on the whole container at once, no layer', async ({ page }) => {
    const p = await at(page, 'continuous', 40);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    expect(await pressed(page, 'continuous')).toBe('overlay');
    expect(await css(containerOf(page, 'continuous'), 'background-color')).toBe(await resolveColor(page, S('pressed', 'container-color')));
    expect(await ripples(page, 'continuous').count()).toBe(0);
    await page.mouse.up();
  });

  test('SLD-14 ripple (m3-like): the pressed layer grows from the pressed handle’s center; the container keeps the state under the press; reduced motion makes it whole', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('ripple');
    const h = await center(handleOf(page, 'continuous'));
    const hovered = await resolveColor(page, S('hovered', 'container-color'));
    await page.mouse.move(h.x + 3, h.y - 2);
    await expect.poll(() => css(containerOf(page, 'continuous'), 'background-color')).toBe(hovered);
    await page.mouse.down();
    expect(await pressed(page, 'continuous')).toBe('ripple');
    await expect(ripples(page, 'continuous')).toHaveCount(1);
    const origin = await ripples(page, 'continuous').evaluate((el) => {
      const own = el.getBoundingClientRect();
      return [Number.parseFloat(el.style.getPropertyValue('--_x')) / own.width, Number.parseFloat(el.style.getPropertyValue('--_y')) / own.height, getComputedStyle(el).backgroundColor];
    });
    expect(origin[0]).toBeCloseTo(0.5, 5);
    expect(origin[1]).toBeCloseTo(0.5, 5);
    expect(origin[2]).toBe(await resolveColor(page, S('pressed', 'container-color')));
    expect(await css(containerOf(page, 'continuous'), 'background-color')).toBe(hovered);
    await page.mouse.up();
    await expect(ripples(page, 'continuous')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.down();
    expect(await ripples(page, 'continuous').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.mouse.up();
  });

  test('SLD-14 dim (cupertino): the pressed opacity on the whole slider, no layer; the container keeps the state under the press', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-behavior-pressed-feedback')).toBe('dim');
    await override(page, { [T('pressed-opacity')]: '0.5', [S('hovered', 'container-color')]: 'rgb(0, 255, 0)', [S('pressed', 'container-color')]: 'rgb(255, 0, 0)' });
    const h = await center(handleOf(page, 'continuous'));
    await page.mouse.move(h.x, h.y);
    await expect.poll(() => css(containerOf(page, 'continuous'), 'background-color')).toBe('rgb(0, 255, 0)');
    await page.mouse.down();
    expect(await pressed(page, 'continuous')).toBe('dim');
    expect(await css(rootOf(page, 'continuous'), 'opacity')).toBe('0.5');
    expect(await css(containerOf(page, 'continuous'), 'background-color')).toBe('rgb(0, 255, 0)');
    expect(await ripples(page, 'continuous').count()).toBe(0);
    await page.mouse.up();
    // Cupertino's own pressed opacity is 1: a drag does not dim its slider.
    await override(page, { [T('pressed-opacity')]: '' });
    expect(await token(page, T('pressed-opacity'))).toBe('1');
  });

  test('SLD-14 none: no answer to the press; an unknown name is answered as the first value', async ({ page }) => {
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'none' });
    const h = await center(handleOf(page, 'continuous'));
    await page.mouse.move(h.x, h.y);
    await matches(page, 'continuous', 'hovered');
    await page.mouse.down();
    expect(await pressed(page, 'continuous')).toBe('none');
    expect(await drawn(page, 'continuous')).toEqual(await expected(page, 'hovered'));
    await page.mouse.up();
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'sparkle' });
    await page.mouse.down();
    expect(await pressed(page, 'continuous')).toBe('overlay');
    await page.mouse.up();
  });

  test('SLD-15 corner smoothing: round handles, containers and track ends are unchanged by any amount; a smaller corner is eased (cupertino, 0.6)', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'cupertino' });
    expect(await token(page, '--tanrei-sys-shape-corner-smoothing')).toBe('0.6');
    for (const locator of [handleOf(page, 'continuous'), containerOf(page, 'continuous'), activeOf(page, 'continuous')]) {
      expect(await css(locator, 'corner-top-left-shape')).toMatch(/^(round|superellipse\(1\)|)$/);
    }
    await override(page, { [T('handle-shape')]: '6px', [T('handle-shape-pill')]: '0' });
    const handle = handleOf(page, 'continuous');
    if (await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'))) {
      expect(Number.parseFloat((await css(handle, 'corner-top-left-shape')).replace(/^superellipse\(|\)$/g, ''))).toBeCloseTo(Math.log2(2.6), 3);
      expect(Number.parseFloat(await css(handle, 'border-top-left-radius'))).toBeCloseTo(6 * 1.24, 2);
    } else {
      expect(await css(handle, 'border-top-left-radius')).toBe('6px');
    }
  });

  test('SLD-15 focus-style: acme shows keyboard focus as a glow around the handle; the default is a ring', async ({ page }) => {
    await tabTo(page, handleOf(page, 'continuous'));
    expect(await css(handleOf(page, 'continuous'), 'box-shadow', '::after')).toBe('none');
    expect(await handleOf(page, 'continuous').getAttribute('data-focus-style')).toBe('ring');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() });
    await tabTo(page, handleOf(page, 'continuous'));
    expect(await css(handleOf(page, 'continuous'), 'outline-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await css(handleOf(page, 'continuous'), 'box-shadow', '::after')).toContain(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await handleOf(page, 'continuous').getAttribute('data-focus-style')).toBe('glow');
  });

  test('SLD-16: a value set by the product, a key or a press on the track moves over motion.value-duration and emits nothing when the product set it; a drag follows at once; reduced motion shows every change at once', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-value-duration'), 'duration');
    expect(duration).toBeGreaterThan(0);
    await listen(host(page, 'continuous'));
    await watchTransitions(thumbOf(page, 'continuous'));
    await watchTransitions(activeOf(page, 'continuous'));
    await host(page, 'continuous').evaluate((el) => ((el as any).value = 90));
    await expect.poll(() => begun(thumbOf(page, 'continuous'), 'left')).toEqual([duration]);
    await expect.poll(() => begun(activeOf(page, 'continuous'), 'right')).toEqual([duration]);
    expect(await log(page)).toEqual([]);
    await settle(page);
    // A key.
    await tabTo(page, handleOf(page, 'continuous'));
    await watchTransitions(thumbOf(page, 'continuous'));
    await page.keyboard.press('PageDown');
    await expect.poll(() => begun(thumbOf(page, 'continuous'), 'left')).toEqual([duration]);
    await settle(page);
    // A drag: no motion while the press moves the handle.
    const p = await at(page, 'continuous', 50);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const q = await at(page, 'continuous', 20);
    await page.mouse.move(q.x, q.y);
    expect(await css(thumbOf(page, 'continuous'), 'transition-duration')).toBe('0s');
    expect(Math.abs((await center(handleOf(page, 'continuous'))).x - q.x)).toBeLessThanOrEqual(1);
    await page.mouse.up();
    // Reduced motion.
    await mountFixtures(page, spec, { reducedMotion: true });
    await host(page, 'continuous').evaluate((el) => ((el as any).value = 90));
    const r = await at(page, 'continuous', 90);
    expect((await center(handleOf(page, 'continuous'))).x).toBeCloseTo(r.x, 1);
  });

  test('SLD-17: the value indicator — always, or while pressed or keyboard-focused — offset above the handle, centered on it, value text in its role and colors, at least its height and never narrower; no focus, no input, hidden from assistive technology; faded over state-duration', async ({ page }) => {
    const ind = indicatorOf(page, 'value-indicator');
    await expect(ind).toBeVisible();
    await expect(ind).toHaveText('40');
    await expect(ind).toHaveAttribute('aria-hidden', 'true');
    expect(await css(ind, 'pointer-events')).toBe('none');
    const [offset, height, padding] = [await resolveToken(page, T('value-indicator-offset')), await resolveToken(page, T('value-indicator-container-height')), await resolveToken(page, T('value-indicator-container-padding-inline'))];
    const b = await rect(ind);
    const h = await rect(handleOf(page, 'value-indicator'));
    expect(h.y - b.bottom).toBeCloseTo(offset, 1);
    expect(b.x + b.width / 2).toBeCloseTo(h.x + h.width / 2, 0);
    expect(b.height).toBeGreaterThanOrEqual(height);
    expect(b.width).toBeGreaterThanOrEqual(b.height);
    expect(await css(ind, 'padding-left')).toBe(`${padding}px`);
    expect(await css(ind, 'background-color')).toBe(await resolveColor(page, T('value-indicator-container-color')));
    expect(await css(ind, 'color')).toBe(await resolveColor(page, T('value-indicator-label-color')));
    expect(Number.parseFloat(await css(ind, 'font-size'))).toBe(await resolveToken(page, T('value-indicator-label-typescale-font-size')));
    // It is not in the accessibility tree and takes no focus.
    expect(await host(page, 'value-indicator').ariaSnapshot()).toBe('- slider "Volume"');
    // None by default; `active` while keyboard-focused or pressed.
    await expect(indicatorOf(page, 'continuous')).toBeHidden();
    await host(page, 'continuous').evaluate((el) => ((el as any).valueIndicator = 'active'));
    await expect(indicatorOf(page, 'continuous')).toBeHidden();
    await override(page, { [T('motion-state-duration')]: '600ms' });
    await watchTransitions(indicatorOf(page, 'continuous'));
    await tabTo(page, handleOf(page, 'continuous'));
    await expect.poll(() => begun(indicatorOf(page, 'continuous'), 'opacity')).toEqual([600]);
    await expect(indicatorOf(page, 'continuous')).toBeVisible();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await expect(indicatorOf(page, 'continuous')).toBeHidden();
    const p = await at(page, 'continuous', 40);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect(indicatorOf(page, 'continuous')).toBeVisible();
    await page.mouse.up();
    await page.mouse.move(0, 0);
  });

  test('SLD-17: the indicator’s lower edge is value-indicator.offset beyond the handle’s outer edge — half handle.height from the midline, outline included — centered on the handle, above the handle and its container (default: 18 above the midline, drawn over the state layer; m3-like: above the bar)', async ({ page }) => {
    for (const system of [undefined, 'm3-like'] as const) {
      await mountFixtures(page, spec, system ? { system } : {});
      const label = system ?? 'tanrei';
      const [offset, hh, cs] = await Promise.all([T('value-indicator-offset'), T('handle-height-small'), T('container-size')].map((n) => resolveToken(page, n)));
      const ind = await rect(indicatorOf(page, 'value-indicator'));
      const handle = await rect(handleOf(page, 'value-indicator'));
      const travel = await rect(host(page, 'value-indicator').locator('.travel'));
      const mid = travel.y + travel.height / 2;
      // The handle's outer edge is its box, the outline drawn inside it.
      expect(await handleOf(page, 'value-indicator').evaluate((el) => { const b = getComputedStyle(el, '::before'); return [b.top, b.left, b.boxSizing]; }), label).toEqual(['0px', '0px', 'border-box']);
      expect(handle.height, label).toBe(hh);
      expect(mid - ind.bottom, label).toBeCloseTo(hh / 2 + offset, 1);
      expect(handle.y - ind.bottom, label).toBeCloseTo(offset, 1);
      expect(ind.x + ind.width / 2, label).toBeCloseTo(handle.x + handle.width / 2, 0);
      if (!system) {
        // The handle's radius, 10, plus the offset, 8.
        expect(mid - ind.bottom).toBeCloseTo(18, 1);
        // SLD-17 places the indicator from the handle's outer edge, not from the state layer. The round state layer is
        // container.size across — 40 in the default system — so the indicator's lower edge lies inside the layer's top, and is drawn over it: the
        // stacking order read below. How far inside is the tokens' to say, and is only read here.
        expect(cs).toBe(await resolveToken(page, T('container-size')));
        expect(cs / 2 - (mid - ind.bottom)).toBeCloseTo(cs / 2 - hh / 2 - offset, 1);
      }
      // Above the handle and its container: a later sibling with a z-index, in the handle's own stacking context.
      expect(await thumbOf(page, 'value-indicator').locator('.knob > *').evaluateAll((els) => els.map((e) => [e.className, getComputedStyle(e).zIndex])), label).toEqual([
        ['container', 'auto'],
        ['handle', 'auto'],
        ['value-indicator', '1'],
      ]);
    }
  });

  test('SLD-17: the value indicator is shifted along the axis to stay inside the window, drawn above its neighbours without layout; a vertical one sits at the handle’s inline start', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('edge', { value: 0, valueIndicator: 'always', valueText: 'A long value text', label: 'Edge' }), fixture('upright', { orientation: 'vertical', value: 50, valueIndicator: 'always', label: 'Upright' })],
    });
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-fixture="edge"]')!.style.marginInlineStart = '-16px'));
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect.poll(async () => (await rect(indicatorOf(page, 'edge'))).x).toBeGreaterThanOrEqual(0);
    expect((await rect(indicatorOf(page, 'edge'))).x).toBeLessThan(1);
    // No room is taken: the stage is as tall as before.
    expect((await rect(page.locator('[data-fixture="edge"]'))).height).toBe(96);
    expect(await css(indicatorOf(page, 'edge'), 'z-index')).toBe('1');
    const [ind, handle] = [await rect(indicatorOf(page, 'upright')), await rect(handleOf(page, 'upright'))];
    expect(handle.x - ind.right).toBeCloseTo(await resolveToken(page, T('value-indicator-offset')), 1);
    expect(ind.y + ind.height / 2).toBeCloseTo(handle.y + handle.height / 2, 1);
  });

  test('SLD-17: the shift keeps the indicator inside the window at its right edge, in a right-to-left slider, at the top edge for a vertical one — and inside an ancestor that is scaled, where the window’s pixels are not the indicator’s own', async ({ page }) => {
    const long = { valueIndicator: 'always', valueText: 'A long value text' } as const;
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('left', { value: 0, label: 'Left', ...long }),
        fixture('right', { value: 100, label: 'Right', ...long }),
        fixture('mirrored', { value: 0, label: 'Mirrored', ...long }),
        fixture('upright', { orientation: 'vertical', value: 100, label: 'Upright', ...long }),
      ],
    });
    await page.locator('[data-fixture="mirrored"]').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    /** Moves a stage so that its handle's centre is at `x` (or `y`) of the window, scaled by `scale` about its own start corner. */
    const put = async (id: string, to: { x?: number; y?: number }, scale = 1) => {
      await page.locator(`[data-fixture="${id}"]`).evaluate((el, s) => Object.assign((el as HTMLElement).style, { position: 'relative', left: '0px', top: '0px', transformOrigin: '0 0', transform: s === 1 ? 'none' : `scale(${s})` }), scale);
      const at = await center(handleOf(page, id));
      await page.locator(`[data-fixture="${id}"]`).evaluate((el, [dx, dy]) => Object.assign((el as HTMLElement).style, { left: `${dx}px`, top: `${dy}px` }), [to.x === undefined ? 0 : to.x - at.x, to.y === undefined ? 0 : to.y - at.y]);
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    };
    const inside = async (id: string, edge: 'left' | 'right' | 'top', message: string) => {
      const drawn = async () => {
        const r = await rect(indicatorOf(page, id));
        // How far the indicator's edge is inside the window's: 0 when it is clamped to it.
        return edge === 'left' ? r.x : edge === 'right' ? width - r.right : r.y;
      };
      await expect.poll(async () => Math.abs(await drawn()), message).toBeLessThan(0.5);
    };
    for (const scale of [1, 0.5, 1.5]) {
      const at = `scaled by ${scale}`;
      await put('left', { x: 4 }, scale);
      await inside('left', 'left', `the left edge, ${at}`);
      await put('right', { x: width - 4 }, scale);
      await inside('right', 'right', `the right edge, ${at}`);
      await put('mirrored', { x: width - 4 }, scale);
      await inside('mirrored', 'right', `right-to-left at the right edge, ${at}`);
      await put('upright', { y: 4 }, scale);
      await inside('upright', 'top', `a vertical one at the top edge, ${at}`);
      // Unshifted otherwise: back in the middle of the window, the indicator is centred on its handle again.
      await put('left', { x: width / 2 }, scale);
      await expect.poll(async () => Math.abs((await center(indicatorOf(page, 'left'))).x - (await center(handleOf(page, 'left'))).x), `centred again, ${at}`).toBeLessThan(0.5);
    }
  });
});

test.describe('handle paint', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  /** The handle's fill and outline, as drawn: its background, and the border of its ::before. */
  const paint = (page: P, id: string) =>
    handleOf(page, id).evaluate((el) => {
      const [h, o] = [getComputedStyle(el), getComputedStyle(el, '::before')];
      const box = el.getBoundingClientRect();
      return { fill: h.backgroundColor, clip: h.backgroundClip, inner: Number.parseFloat(h.paddingTop), outline: o.borderTopColor, width: Number.parseFloat(o.borderTopWidth), style: o.borderTopStyle, inset: [o.top, o.right, o.bottom, o.left], size: [box.width, box.height], sizing: o.boxSizing };
    });

  test('SLD-24: the fill covers the handle’s shape and the outline is drawn over it, handle-outline.width inside the edge, so the handle keeps its size; elevation raises it; width 0 draws none', async ({ page }) => {
    const [w, hh, ow] = await Promise.all([S('', 'handle-width'), T('handle-height-small'), T('handle-outline-width')].map((n) => resolveToken(page, n)));
    const p = await paint(page, 'continuous');
    expect(p).toEqual({
      fill: await resolveColor(page, S('', 'handle-color')),
      // Under the outline to within a quarter of its width of the edge, so the fill never shows through the outline's
      // anti-aliased outer edge.
      clip: 'content-box',
      inner: ow / 4,
      outline: await resolveColor(page, S('', 'handle-outline-color')),
      width: ow,
      style: 'solid',
      inset: ['0px', '0px', '0px', '0px'],
      size: [w, hh],
      sizing: 'border-box',
    });
    // In the default system: a 20 circle, the surface's color inside a 3 outline in the active track's color — the
    // outline grows inward, so the handle is still 20 and the disc of fill it leaves is 14.
    expect([w, hh, ow]).toEqual([20, 20, 3]);
    expect(hh - 2 * ow).toBe(14);
    expect(p.fill).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    expect(p.outline).toBe(await resolveColor(page, S('', 'active-track-color')));
    // The outline follows the handle's corners.
    expect(await handleOf(page, 'continuous').evaluate((el) => getComputedStyle(el, '::before').borderTopLeftRadius)).toBe(await css(handleOf(page, 'continuous'), 'border-top-left-radius'));
    // Seen: the fill hides the tracks where they meet under it (and a stop dot under it), the outline rings it.
    for (const id of ['continuous', 'discrete-stops']) {
      const px = await pixels(page, id);
      const c = await center(handleOf(page, id));
      const surface = await resolveColor(page, '--tanrei-sys-color-surface');
      for (const [dx, dy] of [[0, 0], [-4, 0], [4, 0], [0, 1.5], [-6, -1.5]]) expect(near(px(c.x + dx, c.y + dy), surface), `${id}: fill at ${dx}, ${dy}`).toBe(true);
      for (const [dx, dy] of [[0, -hh / 2 + ow / 2], [0, hh / 2 - ow / 2], [-w / 2 + ow / 2, 0], [w / 2 - ow / 2, 0]]) expect(near(px(c.x + dx, c.y + dy), p.outline), `${id}: outline at ${dx}, ${dy}`).toBe(true);
      // Where the two meet, handle-outline.width inside the edge: the outline just outside the disc of fill, the fill just inside it.
      const meet = hh / 2 - ow;
      for (const sign of [-1, 1]) {
        expect(near(px(c.x, c.y + sign * (meet + 1.25)), p.outline), `${id}: outline ${sign * (meet + 1.25)} from the center`).toBe(true);
        expect(near(px(c.x, c.y + sign * (meet - 1.25)), surface), `${id}: fill ${sign * (meet - 1.25)} from the center`).toBe(true);
      }
    }
    // Width 0 draws no outline, the fill reaches the edge, and the handle keeps its size — a bare 0 (as a layer's
    // generated CSS writes it) too.
    for (const zero of ['0px', '0']) {
      await override(page, { [T('handle-outline-width')]: zero });
      const none = await paint(page, 'continuous');
      expect([none.width, none.inner, none.size], zero).toEqual([0, 0, [w, hh]]);
    }
  });

  test('SLD-24: disabled, the fill stays the resting fill and the outline fades with the active track; the focus ring is placed from the handle’s edge', async ({ page }) => {
    for (const id of ['disabled', 'disabled-stops']) {
      const p = await paint(page, id);
      expect(p.fill, id).toBe(await resolveColor(page, S('', 'handle-color')));
      expect(p.fill, id).toBe(await resolveColor(page, S('disabled', 'handle-color')));
      expect(p.outline, id).toBe(await resolveColor(page, S('disabled', 'handle-outline-color')));
      expect(p.outline, id).toBe(await resolveColor(page, S('disabled', 'active-track-color')));
    }
    // The ring's inner stroke is placed from the handle's border box: the outline is not a border of the handle itself.
    await tabTo(page, handleOf(page, 'continuous'));
    expect(await css(handleOf(page, 'continuous'), 'border-top-width')).toBe('0px');
    const edge = await resolveToken(page, '--tanrei-sys-focus-offset');
    const inner = await resolveToken(page, '--tanrei-sys-focus-inner-width');
    const [ring, handle] = [await handleOf(page, 'continuous').evaluate((el) => getComputedStyle(el, '::after').top), await rect(handleOf(page, 'continuous'))];
    expect(Number.parseFloat(ring)).toBeCloseTo(-(edge + inner), 2);
    expect(handle.width).toBe(await resolveToken(page, S('', 'handle-width')));
  });

  test('SLD-24 (presets): m3-like draws a solid bar (outline width 0), its disabled fill faded; cupertino a white thumb without an outline, raised by its elevation', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like' });
    let p = await paint(page, 'continuous');
    expect([p.width, p.inner]).toEqual([0, 0]);
    expect(p.fill).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
    expect((await paint(page, 'disabled')).fill).toBe(await resolveColor(page, S('disabled', 'handle-color')));
    await mountFixtures(page, spec, { system: 'cupertino' });
    p = await paint(page, 'continuous');
    expect(p.width).toBe(0);
    expect(p.fill).toBe(await resolveColor(page, S('', 'handle-color')));
    expect(await css(handleOf(page, 'continuous'), 'box-shadow')).not.toBe('none');
  });
});

test.describe('accessibility', () => {
  test('SLD-18: the value text is valueText, or the value in the page’s locale with the keyboard step’s fraction digits, at most two; read as the value and shown by the indicator', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('words', { value: 40, valueText: '40 %', valueIndicator: 'always', label: 'Volume' }),
        fixture('half', { min: 0, max: 5, step: 0.5, value: 2.5, valueIndicator: 'always', label: 'Rating' }),
        fixture('fine', { min: 0, max: 1, value: 0.25, label: 'Opacity' }),
        fixture('thousands', { min: 0, max: 5000, step: 250, value: 2500, label: 'Price' }),
      ],
    });
    await expect(handleOf(page, 'words')).toHaveAttribute('aria-valuetext', '40 %');
    await expect(indicatorOf(page, 'words')).toHaveText('40 %');
    await expect(handleOf(page, 'half')).toHaveAttribute('aria-valuetext', '2.5');
    await expect(handleOf(page, 'fine')).toHaveAttribute('aria-valuetext', '0.25');
    await expect(handleOf(page, 'thousands')).toHaveAttribute('aria-valuetext', '2,500');
    // The page's locale.
    await page.evaluate(() => document.querySelector('[data-fixture="half"]')!.setAttribute('lang', 'de'));
    await host(page, 'half').evaluate((el) => ((el as any).value = 3));
    await expect(handleOf(page, 'half')).toHaveAttribute('aria-valuetext', '3,0');
    await expect(indicatorOf(page, 'half')).toHaveText('3,0');
  });

  test('SLD-18: where neither valueText nor startValueText is given, the value text of each handle is what the product’s function writes — a property, never an attribute — asked again at every change of a value and when the function changes; an empty answer is no answer; the product’s strings win; a change of the words alone announces nothing; the words are read back from the slider, and in a shadow root the locale is still the page’s', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('one', { value: 40, valueIndicator: 'always', label: 'Volume' }),
        fixture('pair', { range: true, min: 0, max: 500, startValue: 100, value: 300, valueIndicator: 'always', label: 'Maximum price', startLabel: 'Minimum price' }),
        fixture('words', { value: 40, valueText: 'Forty', label: 'Volume' }),
      ],
    });
    type Slider = HTMLElement & { formatValue: ((value: number) => string) | null; value: number; shownValueText: string; shownStartValueText: string; updateComplete: Promise<unknown> };
    const give = (id: string, source: string | null) =>
      host(page, id).evaluate(async (el, text) => {
        (el as Slider).formatValue = text === null ? null : ((0, eval)(text) as (value: number) => string);
        await (el as Slider).updateComplete;
      }, source);
    const shown = (id: string) => host(page, id).evaluate((el) => [(el as Slider).shownStartValueText, (el as Slider).shownValueText]);
    // Never an attribute, and null by default.
    expect(await host(page, 'one').evaluate((el) => [(el as Slider).formatValue, (el.constructor as unknown as { elementProperties: Map<string, { attribute?: unknown }> }).elementProperties.get('formatValue')?.attribute, el.hasAttribute('format-value')])).toEqual([null, false, false]);
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '40');
    expect(await shown('one')).toEqual(['', '40']);
    // When the function is set: asked for the handle's value.
    await give('one', '(value) => value + " %"');
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '40 %');
    await expect(indicatorOf(page, 'one')).toHaveText('40 %');
    expect(await shown('one')).toEqual(['', '40 %']);
    // At every change of a value: by a key, and because the product set it.
    await tabTo(page, host(page, 'one'));
    await page.keyboard.press('ArrowRight');
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '41 %');
    await host(page, 'one').evaluate((el) => ((el as Slider).value = 70));
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '70 %');
    await expect(indicatorOf(page, 'one')).toHaveText('70 %');
    // When the function itself changes.
    await give('one', '(value) => "level " + value');
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', 'level 70');
    // An empty answer is no answer: the number in the page's locale.
    await give('one', '(value) => (value === 70 ? "  " : "v" + value)');
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '70');
    await give('one', null);
    await expect(handleOf(page, 'one')).toHaveAttribute('aria-valuetext', '70');
    // No live region and no status in the slider: a change of the words alone is announced by nothing.
    expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length)).toBe(0);
    // Each handle of a range is asked for its own value.
    await give('pair', '(value) => "$" + value');
    await expect(handleOf(page, 'pair', 'start')).toHaveAttribute('aria-valuetext', '$100');
    await expect(handleOf(page, 'pair', 'end')).toHaveAttribute('aria-valuetext', '$300');
    expect(await shown('pair')).toEqual(['$100', '$300']);
    // The product's own strings win over the function.
    await give('words', '(value) => value + " %"');
    await expect(handleOf(page, 'words')).toHaveAttribute('aria-valuetext', 'Forty');
    expect(await shown('words')).toEqual(['', 'Forty']);
    // The page's locale reaches a slider that stands in a shadow root.
    const inRoot = await page.evaluate(async () => {
      const outer = document.createElement('div');
      outer.lang = 'de';
      const inner = document.createElement('div');
      outer.append(inner);
      document.body.append(outer);
      inner.attachShadow({ mode: 'open' }).innerHTML = '<tanrei-slider label="Rating" min="0" max="5" step="0.5" value="2.5"></tanrei-slider>';
      const slider = inner.shadowRoot!.querySelector('tanrei-slider') as HTMLElement & { updateComplete: Promise<unknown>; shownValueText: string };
      await slider.updateComplete;
      return [slider.shownValueText, slider.shadowRoot!.querySelector('[role="slider"]')!.getAttribute('aria-valuetext')];
    });
    expect(inRoot).toEqual(['2,5', '2,5']);
  });

  test('SLD-4: change leaves a shadow root the slider stands in, as input does: both are composed, so an element composed around the slider hears them as its own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fixture('one', { value: 40, label: 'Volume' })] });
    await page.evaluate(() => {
      const heard: string[] = ((window as any).heard = []);
      for (const type of ['input', 'change']) document.addEventListener(type, (event) => heard.push(`${event.type}:${event.composed}:${event.bubbles}`));
    });
    await tabTo(page, host(page, 'one'));
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => (window as any).heard)).toEqual(['input:true:true', 'change:true:true']);
  });

  test('SLD-19: each handle is a slider named by label (a range’s start by startLabel) with its value, text, bounds (the other handle in a range), orientation; the rest is hidden', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await host(page, 'continuous').ariaSnapshot()).toBe('- slider "Volume"');
    expect(await host(page, 'range').ariaSnapshot()).toBe('- slider "Minimum price"\n- slider "Maximum price"');
    const attrs = (locator: Locator) => locator.evaluate((el) => Object.fromEntries(['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-orientation'].map((a) => [a, el.getAttribute(a)])));
    expect(await attrs(handleOf(page, 'range', 'start'))).toEqual({ 'aria-valuemin': '0', 'aria-valuemax': '60', 'aria-valuenow': '20', 'aria-valuetext': '20', 'aria-orientation': 'horizontal' });
    expect(await attrs(handleOf(page, 'range', 'end'))).toEqual({ 'aria-valuemin': '20', 'aria-valuemax': '100', 'aria-valuenow': '60', 'aria-valuetext': '60', 'aria-orientation': 'horizontal' });
    expect((await attrs(handleOf(page, 'vertical')))['aria-orientation']).toBe('vertical');
    await expect(host(page, 'continuous').locator('.travel')).toHaveAttribute('aria-hidden', 'true');
    await expect(containerOf(page, 'continuous')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('slider')).toHaveCount(spec.fixtures.length + 1);
  });

  test('SLD-19: without a label (or a range’s startLabel) it still renders, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('nameless', { value: 10 }), fixture('half-named', { range: true, value: 60, label: 'Maximum' })] });
    expect((await rect(host(page, 'nameless'))).width).toBe(320);
    await expect.poll(() => seen.filter((w) => w.includes('SLD-19'))).toHaveLength(2);
    expect(seen.find((w) => w.includes('SLD-19'))).toMatch(/<tanrei-slider>: label is empty/);
    expect(seen.join('\n')).toMatch(/startLabel is empty/);
  });

  test('SLD-20: disabled changes nothing and emits nothing, is not focusable, shows no value indicator, exposes disabled and paints from the disabled tokens', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const id of ['disabled', 'disabled-stops']) {
      const before = await valueOf(page, id);
      await listen(host(page, id));
      const r = await rect(host(page, id));
      await page.mouse.click(r.x + r.width - 10, r.y + r.height / 2);
      await handleOf(page, id).evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true })));
      expect(await valueOf(page, id), id).toBe(before);
      expect(await log(page), id).toEqual([]);
      await expect(handleOf(page, id)).not.toHaveAttribute('tabindex');
      await expect(host(page, id).getByRole('slider', { disabled: true })).toHaveCount(1);
      await matches(page, id, 'disabled');
      // The track fades as a fill, the active track and the handle as content.
      expect((await drawn(page, id)).track).toMatch(/0\.12\)$/);
      expect((await drawn(page, id)).active).toMatch(/0\.38\)$/);
    }
    await host(page, 'disabled').evaluate((el) => ((el as any).valueIndicator = 'always'));
    await expect(indicatorOf(page, 'disabled')).toBeHidden();
    expect(await pressed(page, 'disabled')).toBeNull();
    // A dot on the disabled active track takes its own color.
    const dot = host(page, 'disabled-stops').locator('.dots.active .dot').nth(1);
    expect(await css(dot, 'background-color')).toBe(await resolveColor(page, S('disabled', 'active-stop-indicator-color')));
    // A disabled fieldset disables it too.
    await page.evaluate(() => {
      const el = document.querySelector('[data-fixture="continuous"] tanrei-slider')!;
      const fieldset = document.createElement('fieldset');
      fieldset.disabled = true;
      el.replaceWith(fieldset);
      fieldset.append(el);
    });
    await expect(host(page, 'continuous').getByRole('slider', { disabled: true })).toHaveCount(1);
  });

  test('SLD-21: a vertical slider runs from the bottom up and is as tall as its layout; a right-to-left horizontal one runs from the right with the arrows swapped; a vertical one is not mirrored', async ({ page }) => {
    await mountFixtures(page, spec);
    const v = await rect(host(page, 'vertical'));
    expect(v.height).toBe(240);
    expect(v.width).toBe(Math.max(await resolveToken(page, T('container-size')), await resolveToken(page, T('handle-height-small'))));
    const p = await at(page, 'vertical', 60, { vertical: true });
    expect((await center(handleOf(page, 'vertical'))).y).toBeCloseTo(p.y, 1);
    const a = await rect(activeOf(page, 'vertical'));
    expect(a.bottom).toBeGreaterThan(p.y);
    const q = await at(page, 'vertical', 25, { vertical: true });
    await page.mouse.click(q.x, q.y);
    const pressedAt = await valueOf(page, 'vertical');
    expect(pressedAt).toBeCloseTo(25, 0);
    await page.keyboard.press('ArrowUp');
    expect(await valueOf(page, 'vertical')).toBeCloseTo(pressedAt + 1, 5);
    // Right to left.
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await settle(page);
    const r = await at(page, 'continuous', 40, { rtl: true });
    await expect.poll(async () => (await center(handleOf(page, 'continuous'))).x).toBeCloseTo(r.x, 1);
    const act = await rect(activeOf(page, 'continuous'));
    // The active track runs from the right to the handle (to its center while track.gap is 0, SLD-8).
    expect(act.x).toBeCloseTo(r.x + (await cutAt(page)), 1);
    expect(act.right).toBeGreaterThan(r.x);
    const dots = await host(page, 'continuous').locator('.dots:not(.active) .dot').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
    expect(Math.min(...dots)).toBeLessThan(r.x);
    const s = await at(page, 'continuous', 75, { rtl: true });
    await page.mouse.click(s.x, s.y);
    const rtlAt = await valueOf(page, 'continuous');
    expect(rtlAt).toBeCloseTo(75, 0);
    await page.keyboard.press('ArrowLeft');
    expect(await valueOf(page, 'continuous')).toBeCloseTo(rtlAt + 1, 5);
    await page.keyboard.press('ArrowRight');
    expect(await valueOf(page, 'continuous')).toBeCloseTo(rtlAt, 5);
    // A vertical slider is the same in RTL.
    await expect.poll(async () => (await center(handleOf(page, 'vertical'))).y).toBeCloseTo((await at(page, 'vertical', pressedAt + 1, { vertical: true })).y, 1);
  });

  test('SLD-22: a value outside min…max or off a step is drawn and exposed clamped and snapped, emitting nothing; a start past the value draws both at the value; max ≤ min draws the handles at the start and takes no input; a step below 0 is 0 — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('over', { value: 150, label: 'Over' }),
        fixture('off-step', { value: 33, step: 10, label: 'Off' }),
        fixture('crossed', { range: true, startValue: 80, value: 30, label: 'Max', startLabel: 'Min' }),
        fixture('empty', { min: 10, max: 10, value: 5, label: 'Empty' }),
        fixture('negative', { step: -5, value: 42, label: 'Negative' }),
        fixture('far-origin', { origin: 500, value: 50, label: 'Origin' }),
      ],
    });
    await expect(handleOf(page, 'over')).toHaveAttribute('aria-valuenow', '100');
    await expect(handleOf(page, 'off-step')).toHaveAttribute('aria-valuenow', '30');
    await expect(handleOf(page, 'crossed', 'start')).toHaveAttribute('aria-valuenow', '30');
    await expect(handleOf(page, 'crossed', 'end')).toHaveAttribute('aria-valuenow', '30');
    await expect(handleOf(page, 'empty')).toHaveAttribute('aria-valuenow', '10');
    await expect(handleOf(page, 'negative')).toHaveAttribute('aria-valuenow', '42');
    const rail = await rect(host(page, 'empty').locator('.rail'));
    expect((await center(handleOf(page, 'empty'))).x).toBeCloseTo(rail.x, 1);
    await listen(host(page, 'empty'));
    await page.mouse.click(rail.right - 5, rail.y);
    await tabTo(page, handleOf(page, 'empty'));
    await page.keyboard.press('End');
    expect(await log(page)).toEqual([]);
    // The origin, clamped to max: the active track reaches the track's end.
    const far = await rect(host(page, 'far-origin').locator('.rail'));
    expect((await rect(activeOf(page, 'far-origin'))).right).toBeCloseTo(far.right + (await resolveToken(page, T('track-thickness-small'))) / 2, 1);
    const reports = seen.filter((w) => w.includes('SLD-22')).join('\n');
    for (const pattern of [/value 150 is outside/, /value 33 is outside 0…100 or off a step/, /startValue 80 is greater than value 30/, /max 10 is not greater than min 10/, /step -5 is below 0/, /origin 500 is outside/]) {
      expect(reports).toMatch(pattern);
    }
  });

  test('SLD-23: an unknown size, orientation or valueIndicator renders the default (small, horizontal, none) and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('odd', { size: 'huge', orientation: 'diagonal', valueIndicator: 'sometimes', value: 40, label: 'Odd' }), fixture('plain', { value: 40, label: 'Plain' })] });
    const [odd, plain] = [await rect(host(page, 'odd')), await rect(host(page, 'plain'))];
    expect([odd.width, odd.height]).toEqual([plain.width, plain.height]);
    expect((await rect(host(page, 'odd').locator('.travel'))).height).toBe(await resolveToken(page, T('track-thickness-small')));
    await expect(indicatorOf(page, 'odd')).toBeHidden();
    await expect(handleOf(page, 'odd')).toHaveAttribute('aria-orientation', 'horizontal');
    const reports = seen.filter((w) => w.includes('SLD-23')).join('\n');
    expect(reports).toMatch(/size "huge" is not a value of the active design system; it is drawn as "small"/);
    expect(reports).toMatch(/orientation "diagonal"/);
    expect(reports).toMatch(/valueIndicator "sometimes"/);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('keyboard: Tab moves through the enabled handles in order (a range’s start first), Shift+Tab back', async ({ page }) => {
    await mountFixtures(page, spec);
    const order = spec.fixtures.filter((f) => !f.props.disabled).flatMap((f) => (f.props.range ? [[f.id, 'start'], [f.id, 'end']] : [[f.id, 'end']]) as [string, Id][]);
    await tabTo(page, handleOf(page, order[0][0], order[0][1]));
    for (const [id, which] of order.slice(1)) {
      await tab(page);
      await expect(handleOf(page, id, which), `${id} ${which}`).toBeFocused();
    }
  });

  test('forced colors: the handle and the active track keep system colors where the engine has the mode', async ({ page }) => {
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
    expect(await css(handleOf(page, 'continuous'), 'forced-color-adjust')).toBe('none');
    const highlight = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'forced-color-adjust: none; background-color: Highlight';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });
    await expect.poll(() => css(handleOf(page, 'continuous'), 'background-color')).toBe(highlight);
    await expect.poll(() => css(activeOf(page, 'continuous'), 'background-color')).toBe(highlight);
  });
});

test.describe('form', () => {
  test('a named slider submits its value, a range both values under one name, and a reset returns to the attributes', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('volume', { label: 'Volume', name: 'volume', value: 40 }), fixture('price', { range: true, name: 'price', startValue: 20, value: 60, label: 'Max', startLabel: 'Min' })],
    });
    await page.evaluate(() => {
      const form = document.createElement('form');
      const main = document.querySelector('main')!;
      form.append(...main.querySelectorAll('.stage'));
      main.replaceWith(form);
    });
    const data = () => page.evaluate(() => [...new FormData(document.querySelector('form')!).entries()].map(([k, v]) => `${k}=${v}`));
    expect(await data()).toEqual(['volume=40', 'price=20', 'price=60']);
    await tabTo(page, handleOf(page, 'volume'));
    await page.keyboard.press('End');
    await tabTo(page, handleOf(page, 'price', 'start'));
    await page.keyboard.press('Home');
    expect(await data()).toEqual(['volume=100', 'price=0', 'price=60']);
    await page.evaluate(() => document.querySelector('form')!.reset());
    expect(await data()).toEqual(['volume=40', 'price=20', 'price=60']);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
    await page.mouse.move(0, 0);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
