// <tanrei-loading-indicator>, driven by specs/loading-indicator.spec.json: every behaviour id (LDG-1…16) is cited by a
// test title, every fixture has a baseline (recorded with reduced motion, LDG-4's verify, and with no show delay or
// entrance, LDG-11's), and every length, color, duration and easing is read back from the tokens — never from a number
// written here, except the per-instance times a test gives the element itself.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';

const spec = loadSpec('loading-indicator');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-loading-indicator`);
const indicator = (page: P, id: string) => host(page, id).locator('.indicator');
const container = (page: P, id: string) => host(page, id).locator('.container');
const circle = (page: P, id: string) => host(page, id).locator('circle');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-loading-indicator-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
/** An element's own layout size — the turning indicator's bounding box grows with its rotation. */
const laidOut = (locator: Locator) => locator.evaluate((el) => { const s = getComputedStyle(el); return { width: Number.parseFloat(s.width), height: Number.parseFloat(s.height) }; });
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);
/** The color a box-shadow token resolves to, as the browser serializes it. */
const shadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.boxShadow = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Loading', ...props } });
const animations = (locator: Locator) =>
  locator.evaluate((el) =>
    el.getAnimations().filter((a) => a instanceof CSSAnimation).map((a) => ({
      name: (a as CSSAnimation).animationName,
      duration: Math.round(Number(a.effect!.getComputedTiming().duration) * 1000) / 1000,
      easing: (a.effect as KeyframeEffect).getKeyframes()[0]?.easing,
      state: a.playState,
    })),
  );
const at = (locator: Locator, ms: number, property: string) =>
  locator.evaluate((el, [t, p]) => {
    for (const a of el.getAnimations()) { a.pause(); a.currentTime = t as number; }
    return getComputedStyle(el).getPropertyValue(p as string);
  }, [ms, property] as const);
const near = (a: string, b: string, within = 10) => {
  const [x, y] = [a, b].map((c) => c.match(/\d+/g)!.map(Number));
  return x.every((v, i) => Math.abs(v - y[i]) <= within);
};
/** Pixels on the middle of the arc's stroke at the given turns (0 = the top, clockwise), with the rotation at 0. */
async function arcAt(page: P, id: string, turns: number[]) {
  await at(indicator(page, id), 0, 'rotate');
  const shot = decodePng(await indicator(page, id).screenshot());
  const dpr = await page.evaluate(() => devicePixelRatio);
  const size = shot.width / dpr;
  const stroke = Number.parseFloat(await css(circle(page, id), 'stroke-width'));
  const r = (size - stroke) / 2;
  return turns.map((t) => shot.at(Math.round((size / 2 + r * Math.sin(2 * Math.PI * t)) * dpr), Math.round((size / 2 - r * Math.cos(2 * Math.PI * t)) * dpr)));
}
const SIZES = [['small', 'small'], ['medium', 'medium'], ['large', 'large']] as const;

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
  });

  test('LDG-1: a quarter arc with round caps, its outer edge on the indicator’s square, turning clockwise once per cycle at constant speed; no track', async ({ page }) => {
    for (const [id, size] of SIZES) {
      const side = await resolveToken(page, T(`indicator-size-${size}`));
      const stroke = await resolveToken(page, T(`indicator-thickness-${size}`));
      expect(await laidOut(indicator(page, id)), id).toEqual({ width: side, height: side });
      expect(Number.parseFloat(await css(circle(page, id), 'stroke-width')), id).toBe(stroke);
      expect(await circle(page, id).evaluate((el) => (el as SVGCircleElement).getTotalLength() / (2 * Math.PI)), id).toBeCloseTo((side - stroke) / 2, 0);
      expect(await css(circle(page, id), 'stroke-linecap'), id).toBe('round');
      // One circle: no track.
      await expect(circle(page, id), id).toHaveCount(1);
    }
    // A quarter, caps included: the dash plus one stroke width (two half caps) is a quarter of the circumference.
    const [dash, c, stroke] = await circle(page, 'large').evaluate((el) => {
      const probe = (v: string) => { const d = document.createElement('div'); d.style.width = v; el.parentElement!.parentElement!.appendChild(d); const w = Number.parseFloat(getComputedStyle(d).width); d.remove(); return w; };
      return [Number.parseFloat(getComputedStyle(el).strokeDasharray), probe(getComputedStyle(el).getPropertyValue('--_c')), Number.parseFloat(getComputedStyle(el).strokeWidth)];
    });
    expect(dash + stroke).toBeCloseTo(c / 4, 2);
    // From the top to three o'clock, at rotation 0.
    const color = await paintedColor(page, `var(${T('indicator-color')})`);
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const [a, b, c2, d] = await arcAt(page, 'large', [0.05, 0.2, 0.5, 0.75]);
    expect([near(a, color), near(b, color), c2, d], `${a} ${b}`).toEqual([true, true, surface, surface]);
    // The turn: clockwise, at constant speed.
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    expect(await animations(indicator(page, 'medium'))).toEqual([{ name: 'ring-turn', duration, easing: await easing(page, '--tanrei-sys-motion-easing-linear'), state: 'running' }]);
    expect(await at(indicator(page, 'medium'), duration / 4, 'rotate')).toBe('90deg');
    expect(await at(indicator(page, 'medium'), duration / 2, 'rotate')).toBe('180deg');
    expect(await at(indicator(page, 'medium'), (duration * 3) / 4, 'rotate')).toBe('270deg');
  });

  test('LDG-2: not contained, it takes exactly its indicator square, draws no container, and the arc is indicator.color', async ({ page }) => {
    for (const [id, size] of SIZES) {
      const side = await resolveToken(page, T(`indicator-size-${size}`));
      expect(await laidOut(host(page, id)), id).toEqual({ width: side, height: side });
      expect(await css(container(page, id), 'background-color'), id).toBe('rgba(0, 0, 0, 0)');
      expect(await css(container(page, id), 'box-shadow'), id).toBe('none');
      expect(await css(circle(page, id), 'stroke'), id).toBe(await resolveColor(page, T('indicator-color')));
    }
  });

  test('LDG-3: contained, a container of container.size with container.shape, filled and raised by the contained tokens, the arc centered in contained.indicator.color', async ({ page }) => {
    for (const [size] of SIZES) {
      const id = `contained-${size}`;
      const side = await resolveToken(page, T(`container-size-${size}`));
      expect(await laidOut(host(page, id)), id).toEqual({ width: side, height: side });
      expect(await laidOut(container(page, id)), id).toEqual({ width: side, height: side });
      expect(await css(container(page, id), 'background-color'), id).toBe(await resolveColor(page, T('contained-container-color')));
      expect(await css(container(page, id), 'box-shadow'), id).toBe(await shadow(page, T('contained-container-elevation')));
      expect(Number.parseFloat(await css(container(page, id), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(side / 2);
      expect(await css(circle(page, id), 'stroke'), id).toBe(await resolveColor(page, T('contained-indicator-color')));
      const [outer, inner] = [await box(container(page, id)), await box(indicator(page, id))];
      expect((await laidOut(indicator(page, id))).width, id).toBe(await resolveToken(page, T(`indicator-size-${size}`)));
      expect(inner.x - outer.x, id).toBeCloseTo(outer.x + outer.width - (inner.x + inner.width), 3);
      expect(inner.y - outer.y, id).toBeCloseTo(outer.y + outer.height - (inner.y + inner.height), 3);
    }
  });

  test('LDG-4: under reduced motion it does not turn — the whole circle pulses its opacity once per cycle with easing.standard; a container stays still and opaque', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    for (const id of ['medium', 'contained-medium']) {
      expect(await animations(indicator(page, id)), id).toEqual([{ name: 'pulse', duration, easing: await easing(page, '--tanrei-sys-motion-easing-standard'), state: 'running' }]);
      expect(await css(circle(page, id), 'stroke-dasharray'), id).toBe('none');
      const opacity = async (ms: number) => Number(await at(indicator(page, id), ms, 'opacity'));
      expect(await opacity(0), id).toBe(1);
      expect(await opacity(duration / 2), id).toBeCloseTo(0, 5);
      expect(await opacity(duration), id).toBe(1);
      expect(await at(indicator(page, id), duration / 4, 'rotate'), id).toBe('none');
    }
    expect(await animations(container(page, 'contained-medium'))).toEqual([]);
    expect(await css(container(page, 'contained-medium'), 'opacity')).toBe('1');
    // The whole circle, at the indicator's size and stroke.
    const color = await paintedColor(page, `var(${T('indicator-color')})`);
    expect((await arcAt(page, 'large', [0.1, 0.35, 0.6, 0.85])).map((p) => near(p, color))).toEqual([true, true, true, true]);
  });

  test('LDG-5: shown, a progressbar named by label, with no current value, busy', async ({ page }) => {
    await expect(page.getByRole('progressbar', { name: 'Loading' })).toHaveCount(spec.fixtures.length);
    for (const { id } of spec.fixtures) {
      await expect(host(page, id), id).toHaveAttribute('aria-busy', 'true');
      for (const name of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext']) await expect(host(page, id), `${id} ${name}`).not.toHaveAttribute(name);
    }
    await host(page, 'medium').evaluate((el) => ((el as any).label = 'Loading messages'));
    await expect(host(page, 'medium')).toHaveAccessibleName('Loading messages');
  });

  test('LDG-6: never focusable, and never announces itself', async ({ page }) => {
    for (const { id } of spec.fixtures) {
      await host(page, id).evaluate((el) => (el as HTMLElement).focus());
      expect(await page.evaluate(() => document.activeElement?.localName), id).not.toBe('tanrei-loading-indicator');
      await expect(host(page, id), id).not.toHaveAttribute('tabindex');
      await expect(host(page, id), id).not.toHaveAttribute('aria-live');
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role]').length), id).toBe(0);
    }
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.body.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
      document.getElementById('before')!.focus();
    });
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
  });

  test('LDG-7: off screen the animation is paused, and it resumes when it is seen again', async ({ page }) => {
    const states = async () => (await Promise.all(spec.fixtures.map(({ id }) => animations(indicator(page, id))))).flat().map((a) => a.state);
    await expect.poll(states).toEqual(spec.fixtures.map(() => 'running'));
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div style="block-size: 300vh"></div>'));
    await expect.poll(states).toEqual(spec.fixtures.map(() => 'paused'));
    await host(page, 'contained-large').scrollIntoViewIfNeeded();
    await expect.poll(async () => (await animations(indicator(page, 'contained-large'))).map((a) => a.state)).toEqual(['running']);
    // The reduced-motion pulse pauses too.
    await mountFixtures(page, spec, { reducedMotion: true });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div style="block-size: 300vh"></div>'));
    await expect.poll(async () => (await animations(indicator(page, 'medium'))).map((a) => `${a.name} ${a.state}`)).toEqual(['pulse paused']);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('LDG-8: in RTL it is not mirrored — it still turns clockwise from the top', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const color = await paintedColor(page, `var(${T('indicator-color')})`);
    const [right, left] = await arcAt(page, 'large', [0.12, 0.88]);
    expect([near(right, color), near(left, color)]).toEqual([true, false]);
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    expect(await at(indicator(page, 'large'), duration / 4, 'rotate')).toBe('90deg');
  });

  test('LDG-9: a size the active system does not have renders with medium’s tokens and is reported; a size a layer adds renders from its tokens', async ({ page }) => {
    test.setTimeout(120_000); // builds a layer
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('huge', { size: 'huge' }), fixture('contained-huge', { size: 'huge', contained: true })] });
    expect((await box(host(page, 'huge'))).width).toBe(await resolveToken(page, T('indicator-size-medium')));
    expect((await box(host(page, 'contained-huge'))).width).toBe(await resolveToken(page, T('container-size-medium')));
    await expect.poll(() => seen.filter((w) => w.includes('LDG-9')).length).toBe(2);
    expect(seen.find((w) => w.includes('LDG-9'))).toMatch(/size "huge" is not a value of the active design system; it is drawn as "medium" \(LDG-9\)/);

    const layer = {
      id: 'roomy',
      name: 'Roomy',
      extends: 'tanrei',
      description: 'A test layer that adds a loading-indicator size.',
      vocabulary: { 'tanrei.comp.loading-indicator.size.xl': { from: 'large', scale: 1.5, rationale: 'An empty page.' } },
      tokens: {},
    };
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const systemCss = emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    const again = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss, fixtures: [fixture('xl', { size: 'xl' }), fixture('contained-xl', { size: 'xl', contained: true })] });
    expect((await box(host(page, 'xl'))).width).toBe(60); // large (40) × 1.5
    expect((await box(host(page, 'contained-xl'))).width).toBe(await resolveToken(page, T('container-size-xl')));
    expect(again.filter((w) => w.includes('LDG-9'))).toEqual([]);
  });

  test('LDG-10: a loading indicator without a label still renders, and a debug build reports that it has no accessible name', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [{ id: 'nameless', props: {} }] });
    expect((await box(host(page, 'nameless'))).width).toBe(await resolveToken(page, T('indicator-size-medium')));
    await expect(host(page, 'nameless')).not.toHaveAttribute('aria-label');
    await expect.poll(() => seen.filter((w) => w.includes('LDG-10'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('LDG-10'))).toMatch(/<tanrei-loading-indicator>: label is empty/);
    await host(page, 'nameless').evaluate((el) => ((el as any).label = 'Loading'));
    await expect(host(page, 'nameless')).toHaveAccessibleName('Loading');
    expect(seen.filter((w) => w.includes('LDG-10'))).toHaveLength(1);
  });
});

/**
 * An empty page whose timers (`setTimeout`) hold still until the test moves them with `page.clock.runFor()`; CSS
 * animations and the entrance keep the document's own timeline. Every time an indicator's `role`, `aria-label` or
 * `aria-busy` is set it is logged (`window.exposed`), so a test can say it never was.
 */
async function blank(page: P) {
  await mountFixtures(page, spec, { fixtures: [], reducedMotion: false });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  // A long entrance, so that one is still running when a test looks at it.
  await rootTokens(page, { [T('motion-enter-duration')]: '60000ms' });
  await page.evaluate(() => {
    const seen: string[] = ((window as any).exposed = []);
    new MutationObserver((records) => {
      for (const r of records) if (r.oldValue === null) seen.push(`${(r.target as Element).id}:${r.attributeName}`);
    }).observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['role', 'aria-label', 'aria-busy'] });
  });
}
const reduceMotion = (page: P, reduce = true) => page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
const exposed = (page: P) => page.evaluate(() => (window as any).exposed as string[]);
/** Inserts a labelled indicator into `into`, and says what it exposes as it is inserted, before any frame. */
const insert = (page: P, id: string, attributes: Record<string, string> = {}, into = 'main') =>
  page.evaluate(
    ([id, attributes, into]) => {
      const el = document.createElement('tanrei-loading-indicator');
      el.id = id;
      el.setAttribute('label', 'Loading');
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      document.querySelector(into)!.append(el);
      return { role: el.getAttribute('role'), hidden: el.getAttribute('aria-hidden') };
    },
    [id, attributes, into] as const,
  );
const byId = (page: P, id: string) => page.locator(`#${id}`);
/** What an indicator exposes, whether its parts are drawn, and what runs in it (a CSS animation by name, an entrance by id). */
const state = (page: P, id: string) =>
  byId(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    return {
      role: el.getAttribute('role'),
      label: el.getAttribute('aria-label'),
      busy: el.getAttribute('aria-busy'),
      hidden: el.getAttribute('aria-hidden'),
      drawn: ['.container', '.indicator', 'circle'].map((s) => getComputedStyle(root.querySelector(s)!).visibility),
      running: root.getAnimations().map((a) => (a instanceof CSSAnimation ? a.animationName : a.id)).sort(),
    };
  });
const WAITING = { role: null, label: null, busy: null, hidden: 'true', drawn: ['hidden', 'hidden', 'hidden'], running: [] };
const exposure = async (page: P, id: string) => {
  const { role, label, busy, hidden } = await state(page, id);
  return { role, label, busy, hidden };
};
const WAITING_EXPOSURE = { role: null, label: null, busy: null, hidden: 'true' };
const SHOWN = { role: 'progressbar', label: 'Loading', busy: 'true', hidden: null };
/** The entrance running on the container: its id (enter-fade, enter-grow), duration, curve and state. */
const entry = (page: P, id: string) =>
  byId(page, id)
    .locator('.container')
    .evaluate((el) => el.getAnimations().map((a) => ({ id: a.id, duration: Number(a.effect!.getTiming().duration), easing: a.effect!.getTiming().easing, state: a.playState })));

test.describe('show delay and entrance', () => {
  test('LDG-11: from its insertion it waits its show delay with its box kept, drawing, running and exposing nothing; a show delay of 0 shows it as it is inserted', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, T('motion-show-delay'), 'duration');
    expect(delay).toBeGreaterThan(0);
    expect(await insert(page, 'plain')).toEqual({ role: null, hidden: 'true' });
    expect(await insert(page, 'held', { contained: '', size: 'large' })).toEqual({ role: null, hidden: 'true' });
    for (const id of ['plain', 'held']) expect(await state(page, id), id).toEqual(WAITING);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    // The box it takes when shown (LDG-2, LDG-3).
    const medium = await resolveToken(page, T('indicator-size-medium'));
    const large = await resolveToken(page, T('container-size-large'));
    expect(await laidOut(byId(page, 'plain'))).toEqual({ width: medium, height: medium });
    expect(await laidOut(byId(page, 'held'))).toEqual({ width: large, height: large });
    // Nothing painted — no arc, no container, no shadow: the page's surface in and around both boxes.
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const shot = decodePng(await page.screenshot({ clip: { x: 0, y: 0, width: large + 32, height: medium + large + 32 } }));
    const painted = new Set<string>();
    for (let y = 0; y < shot.height; y++) for (let x = 0; x < shot.width; x++) painted.add(shot.at(x, y));
    expect([...painted]).toEqual([surface]);

    await page.clock.runFor(delay - 1);
    expect(await state(page, 'plain')).toEqual(WAITING);
    await page.clock.runFor(1);
    expect(await exposure(page, 'plain')).toEqual(SHOWN);
    expect((await state(page, 'held')).drawn).toEqual(['visible', 'visible', 'visible']);

    // 0: shown, and exposed, as it is inserted.
    expect(await insert(page, 'at-once', { 'show-delay': '0' })).toEqual({ role: 'progressbar', hidden: null });
    expect((await state(page, 'at-once')).drawn).toEqual(['visible', 'visible', 'visible']);
  });

  test('LDG-12: when its delay ends it is exposed as LDG-5 says without announcing itself, starts its entrance, and turns from the start of a cycle', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, T('motion-show-delay'), 'duration');
    await insert(page, 'subject');
    const before = await page.evaluate(() => Number(document.timeline.currentTime));
    await page.clock.runFor(delay);
    expect(await exposure(page, 'subject')).toEqual(SHOWN);
    await expect(page.getByRole('progressbar', { name: 'Loading' })).toHaveCount(1);
    for (const name of ['aria-live', 'tabindex', 'aria-valuenow']) await expect(byId(page, 'subject'), name).not.toHaveAttribute(name);
    expect((await state(page, 'subject')).running).toEqual(['enter-fade', 'ring-turn']);
    // The turn did not run during the delay (LDG-11): it begins now, at the start of its cycle.
    const started = (id: string) => byId(page, id).locator('.indicator').evaluate((el) => Number(el.getAnimations()[0].startTime ?? document.timeline.currentTime));
    expect(await started('subject')).toBeGreaterThanOrEqual(before);
    // The reduced-motion pulse likewise starts at the beginning of its cycle, at full opacity.
    await reduceMotion(page);
    await insert(page, 'pulsing');
    const later = await page.evaluate(() => Number(document.timeline.currentTime));
    await page.clock.runFor(delay);
    expect((await state(page, 'pulsing')).running).toEqual(['enter-fade', 'pulse']);
    expect(await started('pulsing')).toBeGreaterThanOrEqual(later);
  });

  test('LDG-13: fade eases the whole component in over enter-duration on enter-easing; grow also scales it from its center; drawn only; 0 is at once; reduced motion turns grow into fade; it runs to its end off screen', async ({ page }) => {
    await blank(page);
    const duration = await resolveToken(page, T('motion-enter-duration'), 'duration');
    const curve = await easing(page, T('motion-enter-easing'));
    const opacity = async (id: string, ms: number) => Number(await at(byId(page, id).locator('.container'), ms, 'opacity'));

    // Fade, the default kind: the whole component — the container and its shadow with it.
    await insert(page, 'fade', { 'show-delay': '0', contained: '' });
    expect(await entry(page, 'fade')).toEqual([{ id: 'enter-fade', duration, easing: curve, state: 'running' }]);
    expect(await opacity('fade', 0)).toBe(0);
    const half = await opacity('fade', duration / 2);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    expect(await at(byId(page, 'fade').locator('.container'), duration / 2, 'transform')).toBe('none');

    // Grow: the same fade while it scales from nothing about its center; the box keeps its size.
    await insert(page, 'grow', { 'show-delay': '0', entrance: 'grow', contained: '' });
    expect(await entry(page, 'grow')).toEqual([{ id: 'enter-grow', duration, easing: curve, state: 'running' }]);
    const container = byId(page, 'grow').locator('.container');
    expect(await at(container, 0, 'transform')).toBe('matrix(0, 0, 0, 0, 0, 0)');
    const [scale] = (await at(container, duration / 2, 'transform')).match(/[\d.]+/)!.map(Number);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);
    const side = await resolveToken(page, T('container-size-medium'));
    expect(await laidOut(byId(page, 'grow'))).toEqual({ width: side, height: side });
    expect(await laidOut(container)).toEqual({ width: side, height: side });
    const origin = await container.evaluate((el) => getComputedStyle(el).transformOrigin);
    expect(origin).toBe(`${side / 2}px ${side / 2}px`);

    // auto takes the system's kind, by name; an unknown name is the first kind.
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('beforeend', `<div id="grows" style="--tanrei-comp-loading-indicator-motion-entrance: grow"></div><div id="spins" style="--tanrei-comp-loading-indicator-motion-entrance: spin"></div>`);
    });
    await insert(page, 'system-grow', { 'show-delay': '0' }, '#grows');
    await insert(page, 'system-spin', { 'show-delay': '0' }, '#spins');
    expect((await entry(page, 'system-grow')).map((a) => a.id)).toEqual(['enter-grow']);
    expect((await entry(page, 'system-spin')).map((a) => a.id)).toEqual(['enter-fade']);

    // An enter duration of 0: whole at once.
    await insert(page, 'whole', { 'show-delay': '0', 'enter-duration': '0', entrance: 'grow' });
    expect(await entry(page, 'whole')).toEqual([]);
    expect(await css(byId(page, 'whole').locator('.container'), 'opacity')).toBe('1');

    // Off screen, the turn pauses (LDG-7) and the entrance runs on.
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div style="block-size: 300vh"></div>'));
    await insert(page, 'below', { 'show-delay': '0', 'enter-duration': '60000' });
    await expect.poll(async () => (await animations(byId(page, 'below').locator('.indicator'))).map((a) => a.state)).toEqual(['paused']);
    expect((await entry(page, 'below')).map((a) => a.state)).toEqual(['running']);

    // Reduced motion: nothing scales, so grow enters as fade.
    await reduceMotion(page);
    await insert(page, 'still', { 'show-delay': '0', entrance: 'grow' });
    expect((await entry(page, 'still')).map((a) => a.id)).toEqual(['enter-fade']);
  });

  test('LDG-14: showDelay and enterDuration in milliseconds as given, entrance by name; null or auto takes the token; a negative, non-finite or empty value, or an unknown kind, takes the token and is reported', async ({ page }) => {
    await blank(page);
    const seen = warnings(page);
    const delay = await resolveToken(page, T('motion-show-delay'), 'duration');
    const duration = await resolveToken(page, T('motion-enter-duration'), 'duration');

    // As given.
    await insert(page, 'longer', { 'show-delay': String(delay + 500), 'enter-duration': String(duration + 500), entrance: 'grow' });
    await page.clock.runFor(delay + 499);
    expect(await exposure(page, 'longer')).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    expect(await exposure(page, 'longer')).toEqual(SHOWN);
    expect((await entry(page, 'longer')).map(({ id, duration: d }) => [id, d])).toEqual([['enter-grow', duration + 500]]);
    await expect(byId(page, 'longer')).toHaveJSProperty('showDelay', delay + 500);

    // Null (the property's default, or set) takes the tokens.
    await page.evaluate(() => {
      const el = document.createElement('tanrei-loading-indicator') as any;
      Object.assign(el, { id: 'nulls', label: 'Loading', showDelay: null, enterDuration: null, entrance: 'auto' });
      document.querySelector('main')!.append(el);
    });
    // Values it cannot use take the tokens too.
    const invalid = { empty: { 'show-delay': '' }, negative: { 'show-delay': '-5' }, word: { 'show-delay': 'soon' }, endless: { 'enter-duration': 'Infinity', 'show-delay': 'NaN' }, spin: { entrance: 'spin' } };
    for (const [id, attributes] of Object.entries(invalid)) await insert(page, id, attributes);
    const ids = ['nulls', ...Object.keys(invalid)];
    await page.clock.runFor(delay - 1);
    for (const id of ids) expect(await exposure(page, id), id).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    for (const id of ids) {
      expect(await exposure(page, id), id).toEqual(SHOWN);
      expect(await entry(page, id), id).toEqual([{ id: 'enter-fade', duration, easing: await easing(page, T('motion-enter-easing')), state: 'running' }]);
    }
    const reports = seen.filter((w) => w.includes('LDG-14'));
    for (const value of ['showDelay ""', 'showDelay -5', 'showDelay "soon"', 'showDelay "NaN"', 'enterDuration Infinity', 'entrance "spin"']) {
      expect(reports.some((w) => w.includes(`: ${value} is not`)), value).toBe(true);
    }
    expect(reports).toHaveLength(6);
  });

  test('LDG-15: the delay is a wait, not motion — kept under reduced motion, and counted while the indicator cannot be seen', async ({ page }) => {
    await blank(page);
    await reduceMotion(page);
    const delay = await resolveToken(page, T('motion-show-delay'), 'duration');
    await insert(page, 'reduced');
    await page.clock.runFor(delay - 1);
    expect(await state(page, 'reduced')).toEqual(WAITING);
    await page.clock.runFor(1);
    expect(await exposure(page, 'reduced')).toEqual(SHOWN);
    await reduceMotion(page, false);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div id="closed" hidden></div><div style="block-size: 300vh"></div><div id="far"></div>'));
    await insert(page, 'in-hidden', {}, '#closed');
    await insert(page, 'off-screen', {}, '#far');
    await insert(page, 'self-hidden');
    await byId(page, 'self-hidden').evaluate((el) => ((el as HTMLElement).hidden = true));
    await page.clock.runFor(delay);
    for (const id of ['in-hidden', 'off-screen', 'self-hidden']) expect(await exposure(page, id), id).toEqual(SHOWN);
    // Seen again, it is simply there: no second wait.
    await page.evaluate(() => { document.getElementById('closed')!.hidden = false; document.getElementById('self-hidden')!.hidden = false; });
    for (const id of ['in-hidden', 'self-hidden']) expect((await state(page, id)).drawn, id).toEqual(['visible', 'visible', 'visible']);
  });

  test('LDG-16: removed during the delay it has exposed nothing; removed while shown it is gone at once; inserted again it waits the whole delay; hiding neither restarts nor pauses it; a change mid-wait applies from the next insertion', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, T('motion-show-delay'), 'duration');
    const duration = await resolveToken(page, T('motion-enter-duration'), 'duration');

    // Removed before the delay ends: nothing was ever exposed, and nothing is later.
    await insert(page, 'brief');
    await page.clock.runFor(delay / 2);
    await byId(page, 'brief').evaluate((el) => { (window as any).brief = el; el.remove(); });
    await page.clock.runFor(delay * 2);
    expect(await page.evaluate(() => (window as any).brief.getAttribute('role'))).toBeNull();
    expect((await exposed(page)).filter((e) => e.startsWith('brief:'))).toEqual([]);

    // Inserted again: the whole delay again.
    expect(await page.evaluate(() => { document.querySelector('main')!.append((window as any).brief); return (window as any).brief.getAttribute('aria-hidden'); })).toBe('true');
    await page.clock.runFor(delay - 1);
    expect(await state(page, 'brief')).toEqual(WAITING);
    await page.clock.runFor(1);
    expect(await exposure(page, 'brief')).toEqual(SHOWN);

    // Removed while shown, during its entrance: gone at once, nothing left running. Moved within the document, it waits again.
    await insert(page, 'moved', { 'show-delay': '0', 'enter-duration': '60000' });
    const stopped = await byId(page, 'moved').evaluate((el) => {
      const running = el.shadowRoot!.getAnimations().filter((a) => !(a instanceof CSSAnimation));
      el.remove();
      return running.map((a) => `${a.id} ${a.playState}`);
    });
    expect(stopped).toEqual(['enter-fade idle']);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<section id="elsewhere"></section>'));
    await insert(page, 'mover');
    await page.clock.runFor(delay);
    expect(await exposure(page, 'mover')).toEqual(SHOWN);
    await byId(page, 'mover').evaluate((el) => document.getElementById('elsewhere')!.append(el));
    expect(await state(page, 'mover')).toEqual(WAITING);
    await page.clock.runFor(delay);
    expect(await exposure(page, 'mover')).toEqual(SHOWN);

    // Hidden without being removed: the delay neither restarts nor pauses.
    await insert(page, 'hidden-mid');
    await page.clock.runFor(delay / 2);
    await byId(page, 'hidden-mid').evaluate((el) => ((el as HTMLElement).hidden = true));
    await page.clock.runFor(delay / 4);
    await byId(page, 'hidden-mid').evaluate((el) => ((el as HTMLElement).hidden = false));
    await page.clock.runFor(delay / 4);
    expect(await exposure(page, 'hidden-mid')).toEqual(SHOWN);

    // Changed mid-wait: the running delay and the entrance finish as they started; the new values apply from the next insertion.
    await insert(page, 'changed');
    await page.clock.runFor(delay / 2);
    await byId(page, 'changed').evaluate((el: any, d) => Object.assign(el, { showDelay: 0, entrance: 'grow', enterDuration: d + 500 }), duration);
    expect(await state(page, 'changed')).toEqual(WAITING);
    await page.clock.runFor(delay / 2);
    expect(await exposure(page, 'changed')).toEqual(SHOWN);
    expect((await entry(page, 'changed')).map(({ id, duration: d }) => [id, d])).toEqual([['enter-fade', duration]]);
    await byId(page, 'changed').evaluate((el: any) => Object.assign(el, { entrance: 'fade', enterDuration: 0 }));
    expect((await entry(page, 'changed')).map(({ id, duration: d }) => [id, d])).toEqual([['enter-fade', duration]]);
    const next = await byId(page, 'changed').evaluate((el: any) => {
      Object.assign(el, { entrance: 'grow', enterDuration: 50000 });
      el.remove();
      document.querySelector('main')!.append(el);
      return el.getAttribute('role');
    });
    expect(next).toBe('progressbar');
    expect((await entry(page, 'changed')).map(({ id, duration: d }) => [id, d])).toEqual([['enter-grow', 50000]]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, reducedMotion: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('the indicator is not text: at 200% text size the square stays at its token (which follows rem on the web)', async ({ page }) => {
    await mountFixtures(page, spec);
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await box(host(page, 'medium'));
    // dial.size.unit is rem on the web, so the square follows the root size as every Tanrei size does (as an icon-only Button's).
    expect(after.width).toBeCloseTo(await resolveToken(page, T('indicator-size-medium')), 3);
    expect(after.width).toBeCloseTo(after.height, 3);
  });

  test('forced colors: the arc is drawn in the system’s text color where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
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
    expect(await css(circle(page, 'medium'), 'stroke')).not.toBe(await resolveColor(page, T('indicator-color')));
  });
});

test.describe('fixtures', () => {
  // LDG-4's verify: fixtures are recorded with reduced motion requested, at the start of a cycle (opacity 1).
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
