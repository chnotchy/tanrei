// <tanrei-meter>, driven by specs/meter.spec.json: every behaviour id (MTR-1…15) is cited by a test title, every
// fixture has a baseline, and every length, color, duration and easing is read back from the tokens — never from a
// number written here.
// MTR-16: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, rootTokens, tab } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';
import { motionEnded } from '../../../test/motions.js';
import { transitionsRun, watchTransitions } from '../../../test/transitions.js';

const spec = loadSpec('meter');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-meter`);
/** A part of the drawing, by its class. The track is drawn twice (one per separation): `track` is the one drawn. */
const part = (page: P, id: string, name: string) => (name === 'track' ? host(page, id).locator('.track').filter({ visible: true }).first() : host(page, id).locator(`.${name}`).first());
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-meter-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
/** A token's easing as the browser serializes a timing function. */
const easing = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.transitionTimingFunction = `var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Storage used', ...props } });
/** Colors in a screenshot are compared within antialiasing and compositing noise. */
const near = (a: string, b: string, within = 10) => {
  const [x, y] = [a, b].map((c) => c.match(/\d+/g)!.map(Number));
  return x.every((v, i) => Math.abs(v - y[i]) <= within);
};
/** The pixel of the ring at `turn` (0 = the top, 0.25 = three o'clock, clockwise) on the middle of its stroke. */
async function ringAt(page: P, id: string, turns: number[]) {
  const shot = decodePng(await host(page, id).screenshot({ animations: 'disabled' }));
  const dpr = await page.evaluate(() => devicePixelRatio);
  const [size, stroke] = [shot.width / dpr, Number.parseFloat(await css(host(page, id).locator('circle').first(), 'stroke-width'))];
  const r = (size - stroke) / 2;
  return turns.map((t) => shot.at(Math.round((size / 2 + r * Math.sin(2 * Math.PI * t)) * dpr), Math.round((size / 2 - r * Math.cos(2 * Math.PI * t)) * dpr)));
}
/** The color token of a status's indicator. */
const indicatorToken = (status: string) => (status === 'default' ? T('indicator-color') : T(`${status}-indicator-color`));
const STATUSES = ['default', 'info', 'success', 'warning', 'error'];
const LINEAR = spec.fixtures.filter((f) => f.props.variant !== 'circular').map((f) => f.id);
const CIRCULAR = spec.fixtures.filter((f) => f.props.variant === 'circular').map((f) => f.id);

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
  });

  test('MTR-1: the indicator is drawn over (value − min) / (max − min) of the track, from the inline-start of a bar and the top of a ring, clockwise', async ({ page }) => {
    for (const [id, fraction] of [['linear', 0.62], ['linear-range', 37 / 50], ['linear-empty', 0], ['linear-full', 1]] as const) {
      const [bar, indicator] = [await box(host(page, id)), await box(part(page, id, 'indicator'))];
      expect(indicator.x, id).toBe(bar.x);
      expect(indicator.width, id).toBeCloseTo(bar.width * fraction, 1);
    }
    await expect(part(page, 'linear-empty', 'indicator')).toBeHidden();
    // A quarter: indicator from twelve to three o'clock, track from three to twelve.
    await mountFixtures(page, spec, { fixtures: [fixture('quarter', { variant: 'circular', size: 'large', value: 0.25 })] });
    const [indicator, track] = [await paintedColor(page, `var(${T('indicator-color')})`), await paintedColor(page, `var(${T('track-color')})`)];
    const [early, late, back, left] = await ringAt(page, 'quarter', [0.06, 0.19, 0.3, 0.8]);
    expect([near(early, indicator), near(late, indicator), near(back, track), near(left, track)], `${early} ${late} ${back} ${left}`).toEqual([true, true, true, true]);
  });

  test('MTR-2: a bar is linear.thickness high across its layout’s inline size; a ring fills circular.size with a circular.thickness stroke — the progress indicator’s sizes by default', async ({ page }) => {
    for (const id of LINEAR) {
      const size = (spec.fixtures.find((f) => f.id === id)!.props.size as string) ?? 'medium';
      const [own, room] = [await box(host(page, id)), await box(stage(page, id))];
      expect(own.height, id).toBe(await resolveToken(page, T(`linear-thickness-${size}`)));
      expect(own.height, id).toBe(await resolveToken(page, `--tanrei-comp-progress-indicator-linear-thickness-${size}`));
      expect(own.width, id).toBe(room.width - 32); // the stage's padding
    }
    for (const id of CIRCULAR) {
      const size = (spec.fixtures.find((f) => f.id === id)!.props.size as string) ?? 'medium';
      const side = await resolveToken(page, T(`circular-size-${size}`));
      const stroke = await resolveToken(page, T(`circular-thickness-${size}`));
      expect(side, id).toBe(await resolveToken(page, `--tanrei-comp-progress-indicator-circular-size-${size}`));
      expect(await box(host(page, id)), id).toMatchObject({ width: side, height: side });
      const circle = host(page, id).locator('circle.indicator').first();
      expect(Number.parseFloat(await css(circle, 'stroke-width')), id).toBe(stroke);
      expect(await circle.evaluate((el) => (el as SVGCircleElement).getTotalLength() / (2 * Math.PI)), id).toBeCloseTo((side - stroke) / 2, 0);
    }
  });

  test('MTR-3: the track in track.color and the indicator in the indicator color of its status, on a bar and on a ring; ends rounded by track.shape, round caps unless it is none', async ({ page }) => {
    const trackColor = await resolveColor(page, T('track-color'));
    for (const [id, status] of [['linear', 'default'], ['linear-info', 'info'], ['linear-success', 'success'], ['linear-warning', 'warning'], ['linear-error', 'error']] as const) {
      expect(await css(part(page, id, 'track'), 'background-color'), id).toBe(trackColor);
      expect(await css(part(page, id, 'indicator'), 'background-color'), id).toBe(await resolveColor(page, indicatorToken(status)));
    }
    // The five colors are five: no status is drawn in another's color.
    expect(new Set(await Promise.all(STATUSES.map((status) => resolveColor(page, indicatorToken(status))))).size).toBe(5);
    // The default is the progress indicator's indicator color, and the track its track color.
    expect(await resolveColor(page, T('indicator-color'))).toBe(await resolveColor(page, '--tanrei-comp-progress-indicator-indicator-color'));
    expect(trackColor).toBe(await resolveColor(page, '--tanrei-comp-progress-indicator-track-color'));
    const circle = (id: string, name: string) => host(page, id).locator(`circle.${name}`).first();
    expect(await css(circle('circular', 'track'), 'stroke')).toBe(trackColor);
    expect(await css(circle('circular', 'indicator'), 'stroke')).toBe(await resolveColor(page, T('indicator-color')));
    expect(await css(circle('circular-warning', 'indicator'), 'stroke')).toBe(await resolveColor(page, T('warning-indicator-color')));
    // The bar's ends: track.shape (full), clamped to half the thickness — the corner pixel is the stage's.
    const thickness = (await box(host(page, 'linear-large'))).height;
    expect(await css(part(page, 'linear-large', 'track'), 'border-top-left-radius')).toBe(`${await resolveToken(page, T('track-shape'))}px`);
    const shot = decodePng(await host(page, 'linear-large').screenshot());
    expect(shot.at(0, 0)).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    expect(near(shot.at(Math.round(thickness), Math.round(thickness)), await paintedColor(page, `var(${T('indicator-color')})`))).toBe(true);
    // Round caps, and square ones where track.shape is none.
    const caps = host(page, 'circular-large').locator('.caps');
    expect((await box(caps)).width).toBe((await box(host(page, 'circular-large'))).width);
    await rootTokens(page, { [T('track-shape')]: 'var(--tanrei-sys-shape-corner-none)' });
    expect((await caps.boundingBox())?.width ?? 0).toBe(0);
    expect(await css(part(page, 'linear-large', 'track'), 'border-top-left-radius')).toBe('0px');
  });

  test('MTR-4: divider draws the indicator on the track; gap leaves track.gap after a bar’s indicator and at both ends of a ring’s arc while strictly between min and max; auto follows comp.meter.track.separation', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [...spec.fixtures, fixture('circular-gap', { variant: 'circular', size: 'large', separation: 'gap', value: 0.62 })] });
    const gap = await resolveToken(page, T('track-gap'));
    expect(gap).toBeGreaterThan(0);
    const offset = async (id: string) => (await box(part(page, id, 'track'))).x - ((await box(part(page, id, 'indicator'))).x + (await box(part(page, id, 'indicator'))).width);
    // gap: the track starts track.gap after the indicator's end.
    expect(await offset('linear-gap')).toBeCloseTo(gap, 1);
    // divider (the attribute, and auto in the default system): the whole track runs on under the indicator.
    for (const id of ['linear-divider', 'linear']) {
      expect((await box(part(page, id, 'track'))).x, id).toBe((await box(host(page, id))).x);
    }
    // A ring under gap: the track's dash is shorter than the rest of the circle by a gap at each end.
    const dash = (id: string) => host(page, id).locator('svg > circle.track').filter({ visible: true }).first().evaluate((el) => Number.parseFloat(getComputedStyle(el).strokeDasharray));
    const ringGapDash = await dash('circular-gap');
    await host(page, 'circular-gap').evaluate(async (el: any) => { el.separation = 'divider'; await el.updateComplete; });
    expect(await dash('circular-gap')).toBeGreaterThan(ringGapDash + 2 * gap - 0.5);
    // auto follows the component token, which follows the progress indicator's and so the system's: gap in m3-like.
    await mountFixtures(page, spec, { reducedMotion: true, system: 'm3-like', fixtures: spec.fixtures.filter((f) => ['linear', 'linear-divider'].includes(f.id)) });
    expect(await offset('linear')).toBeCloseTo(await resolveToken(page, T('track-gap')), 1);
    expect((await box(part(page, 'linear-divider', 'track'))).x).toBe((await box(host(page, 'linear-divider'))).x);
    // A token set apart from the progress indicator's: the meter follows its own.
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: spec.fixtures.filter((f) => f.id === 'linear') });
    await rootTokens(page, { [T('track-separation')]: 'gap' });
    await expect.poll(() => offset('linear')).toBeCloseTo(gap, 1);
  });

  test('MTR-5: a bar draws the stop indicator, a dot of stop-indicator.size in its status’s color at the track’s end, only while that size is above 0; a ring draws none', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    // The default system's size is 0, the progress indicator's: no dot.
    expect(await resolveToken(page, T('stop-indicator-size'))).toBe(0);
    expect((await part(page, 'linear', 'stop').boundingBox())?.width ?? 0).toBe(0);
    await rootTokens(page, { [T('stop-indicator-size')]: '4px' });
    for (const [id, status] of [['linear', 'default'], ['linear-warning', 'warning']] as const) {
      const [dot, bar] = [await box(part(page, id, 'stop')), await box(host(page, id))];
      expect(dot.width, id).toBe(4);
      expect(dot.x + dot.width / 2, id).toBeCloseTo(bar.x + bar.width - bar.height / 2, 1);
      expect(await css(part(page, id, 'stop'), 'background-color'), id).toBe(await resolveColor(page, indicatorToken(status)));
    }
    // Covered by the indicator at max; never on a ring.
    await expect(part(page, 'linear-full', 'stop')).toBeHidden();
    expect(await host(page, 'circular').locator('.stop').count()).toBe(0);
  });

  test('MTR-6: a change of value moves the end, and a change of status changes the color, over value-duration with value-easing; a change during the motion goes on from where it is', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-value-duration'), 'duration');
    expect(duration).toBe(await resolveToken(page, '--tanrei-comp-progress-indicator-motion-value-duration', 'duration'));
    const ease = await easing(page, T('motion-value-easing'));
    const width = (await box(host(page, 'linear'))).width;
    // The end is sampled on the transition's own timeline, a third of the way in, and the value changed again there.
    const { durations, easings, moving, restart } = await host(page, 'linear').evaluate(async (el: any, t) => {
      el.value = 0.9;
      await el.updateComplete;
      const indicator = el.shadowRoot.querySelector('.indicator');
      const transitions = indicator.getAnimations().filter((a: Animation) => a instanceof CSSTransition);
      for (const a of transitions) { a.pause(); a.currentTime = t; }
      const sampled = indicator.getBoundingClientRect().width;
      el.value = 0.2;
      await el.updateComplete;
      const next = indicator.getAnimations().filter((a: Animation) => a instanceof CSSTransition);
      for (const a of next) { a.pause(); a.currentTime = 0; }
      const from = indicator.getBoundingClientRect().width;
      for (const a of next) a.play();
      return {
        durations: transitions.map((a: Animation) => Math.round(Number(a.effect!.getTiming().duration))),
        easings: transitions.map((a: Animation) => a.effect!.getTiming().easing),
        moving: sampled,
        restart: from,
      };
    }, duration / 3);
    expect(durations).toEqual([duration]);
    expect(easings[0]).toContain(ease.replace(/^cubic-bezier/, ''));
    expect(moving).toBeGreaterThan(width * 0.62 + 1);
    expect(moving).toBeLessThan(width * 0.9 - 1);
    expect(restart).toBeCloseTo(moving, 0);
    await expect.poll(async () => (await box(part(page, 'linear', 'indicator'))).width).toBeCloseTo(width * 0.2, 1);
    // A change of status fades the indicator's color — on a bar and on a ring — over the same motion.
    for (const id of ['linear', 'circular']) {
      await watchTransitions(host(page, id));
      await host(page, id).evaluate((el: any) => (el.status = 'error'));
      const property = id === 'linear' ? 'background-color' : 'stroke';
      await expect.poll(() => transitionsRun(host(page, id)), id).toContainEqual(expect.objectContaining({ property, duration, on: expect.stringContaining('indicator') }));
    }
    // min and max move it too.
    await watchTransitions(host(page, 'linear-range'));
    await host(page, 'linear-range').evaluate((el: any) => (el.max = 100));
    await expect.poll(() => transitionsRun(host(page, 'linear-range'))).toContainEqual(expect.objectContaining({ duration, on: expect.stringContaining('indicator') }));
  });

  test('MTR-6: the first frame is drawn at its value and in its status’s color, without a motion', async ({ page }) => {
    const ran = await page.evaluate(async () => {
      const holder = document.querySelector('[data-fixture="linear"]')!;
      const runs: string[] = [];
      holder.addEventListener('transitionrun', (e) => runs.push((e as TransitionEvent).propertyName), true);
      const meter = document.createElement('tanrei-meter') as HTMLElement & { updateComplete: Promise<unknown> };
      Object.assign(meter, { label: 'Battery', value: 0.8, status: 'warning' });
      meter.shadowRoot?.addEventListener('transitionrun', (e) => runs.push((e as TransitionEvent).propertyName));
      holder.appendChild(meter);
      await meter.updateComplete;
      meter.shadowRoot!.addEventListener('transitionrun', (e) => runs.push((e as TransitionEvent).propertyName));
      // Two frames: the first is drawn and the next would have announced any transition the first started.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const indicator = meter.shadowRoot!.querySelector('.indicator')!;
      return { runs, ratio: indicator.getBoundingClientRect().width / meter.getBoundingClientRect().width, color: getComputedStyle(indicator).backgroundColor };
    });
    expect(ran.runs).toEqual([]);
    expect(ran.ratio).toBeCloseTo(0.8, 2);
    expect(ran.color).toBe(await resolveColor(page, T('warning-indicator-color')));
  });

  test('MTR-6: where motion is reduced the end moves at once and the change of color is still a fade', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const duration = await resolveToken(page, T('motion-value-duration'), 'duration');
    const width = (await box(host(page, 'linear'))).width;
    await watchTransitions(host(page, 'linear'));
    const moved = await host(page, 'linear').evaluate(async (el: any) => {
      el.value = 0.9;
      await el.updateComplete;
      return el.shadowRoot.querySelector('.indicator').getBoundingClientRect().width;
    });
    expect(moved).toBeCloseTo(width * 0.9, 1);
    await host(page, 'linear').evaluate((el: any) => (el.status = 'success'));
    await expect.poll(() => transitionsRun(host(page, 'linear'))).toContainEqual(expect.objectContaining({ property: 'background-color', duration, on: expect.stringContaining('indicator') }));
    expect((await transitionsRun(host(page, 'linear'))).map((run) => run.property)).not.toContain('width');
  });

  test('MTR-7: a meter named by label, with min, max, the clamped value and valueText — never a progressbar, never busy', async ({ page }) => {
    await expect(page.getByRole('meter')).toHaveCount(spec.fixtures.length);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    const range = host(page, 'linear-range');
    for (const [name, value] of [['role', 'meter'], ['aria-valuemin', '0'], ['aria-valuemax', '50'], ['aria-valuenow', '37'], ['aria-valuetext', '37 of 50 seats']]) {
      await expect(range, name).toHaveAttribute(name, value);
    }
    await expect(range).toHaveAccessibleName('Seats taken');
    await expect(page.getByRole('meter', { name: 'Seats taken' })).toHaveCount(1);
    await expect(host(page, 'linear')).toHaveAttribute('aria-valuetext', '9.3 GB of 15 GB');
    // Without valueText the platform reads its percentage: no aria-valuetext.
    await expect(host(page, 'linear-info')).toHaveAttribute('aria-valuenow', '0.4');
    await expect(host(page, 'linear-info')).not.toHaveAttribute('aria-valuetext');
    for (const { id } of spec.fixtures) await expect(host(page, id), id).not.toHaveAttribute('aria-busy');
    // valueText is the value-text attribute, and follows it.
    await range.evaluate((el) => el.setAttribute('value-text', '38 of 50 seats'));
    await expect(range).toHaveAttribute('aria-valuetext', '38 of 50 seats');
    await range.evaluate((el) => el.removeAttribute('value-text'));
    await expect(range).not.toHaveAttribute('aria-valuetext');
    // The accessibility tree says meter (the role is not overridden anywhere on the way).
    expect(await page.locator('[data-fixture="linear-range"]').ariaSnapshot()).toMatch(/- meter "Seats taken"/);
  });

  test('MTR-8: never focusable, takes no input, and never a live region — the value is read when assistive technology reaches it', async ({ page }) => {
    for (const { id } of spec.fixtures) {
      await host(page, id).evaluate((el) => (el as HTMLElement).focus());
      expect(await page.evaluate(() => document.activeElement?.localName), id).not.toBe('tanrei-meter');
      await expect(host(page, id), id).not.toHaveAttribute('aria-live');
      await expect(host(page, id), id).not.toHaveAttribute('tabindex');
    }
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.body.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
      document.getElementById('before')!.focus();
    });
    await tab(page);
    await expect(page.locator('#after')).toBeFocused();
    await host(page, 'linear').evaluate((el: any) => { el.value = 0.5; el.status = 'warning'; });
    await expect(host(page, 'linear')).toHaveAttribute('aria-valuenow', '0.5');
    await expect(host(page, 'linear')).not.toHaveAttribute('aria-live');
  });

  test('MTR-9: status changes the indicator’s color and nothing else — nothing of it is exposed', async ({ page }) => {
    const exposed = (id: string) =>
      host(page, id).evaluate((el) => [...el.attributes].filter((a) => a.name === 'role' || a.name.startsWith('aria-')).map((a) => `${a.name}=${a.value}`).sort());
    const before = await exposed('linear');
    const tree = await stage(page, 'linear').ariaSnapshot();
    for (const status of ['info', 'success', 'warning', 'error']) {
      await host(page, 'linear').evaluate(async (el: any, s) => { el.status = s; await el.updateComplete; }, status);
      expect(await exposed('linear'), status).toEqual(before);
      expect(await stage(page, 'linear').ariaSnapshot(), status).toBe(tree);
    }
    // The drawing is the same but for the color: the same boxes in every status.
    const boxes = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.track, .indicator, .stop')].map((p) => { const r = p.getBoundingClientRect(); return [p.className, r.width, r.height, getComputedStyle(p).display]; }));
    const warned = await boxes('linear');
    await host(page, 'linear').evaluate(async (el: any) => { el.status = 'default'; await el.updateComplete; });
    expect(await boxes('linear')).toEqual(warned);
  });

  test('MTR-10: a value outside min…max is drawn and exposed clamped, one that is not a finite number as min, and max not above min draws the track only and exposes 0 of 0…1 — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [fixture('linear-over', { value: 2 }), fixture('linear-under', { value: -1 }), fixture('linear-inverted', { value: 3, min: 5, max: 5 }), fixture('ring-over', { variant: 'circular', value: 7, max: 5 }), fixture('linear-nan', { value: 0.5, min: 0.25 })],
    });
    await expect(host(page, 'linear-over')).toHaveAttribute('aria-valuenow', '1');
    expect((await box(part(page, 'linear-over', 'indicator'))).width).toBe((await box(host(page, 'linear-over'))).width);
    await expect(host(page, 'linear-under')).toHaveAttribute('aria-valuenow', '0');
    await expect(part(page, 'linear-under', 'indicator')).toBeHidden();
    await expect(host(page, 'ring-over')).toHaveAttribute('aria-valuenow', '5');
    for (const [name, value] of [['aria-valuemin', '0'], ['aria-valuemax', '1'], ['aria-valuenow', '0']]) await expect(host(page, 'linear-inverted'), name).toHaveAttribute(name, value);
    await expect(part(page, 'linear-inverted', 'indicator')).toBeHidden();
    await expect(part(page, 'linear-inverted', 'track')).toBeVisible();
    // Not a finite number: drawn and exposed as min.
    await host(page, 'linear-nan').evaluate(async (el: any) => { el.setAttribute('value', 'lots'); await el.updateComplete; });
    await expect(host(page, 'linear-nan')).toHaveAttribute('aria-valuenow', '0.25');
    await expect(part(page, 'linear-nan', 'indicator')).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('MTR-10')).length).toBe(5);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/value 2 is outside 0…1; it is drawn and exposed as 1 \(MTR-10\)/),
      expect.stringMatching(/max 5 is not greater than min 5; the track is drawn with no indicator/),
      expect.stringMatching(/value NaN is not a finite number; it is drawn and exposed as min, 0.25 \(MTR-10\)/),
    ]));
  });

  test('MTR-11: a size the active system does not have, or a variant, separation or status the meter does not define, renders as medium, linear, auto and default, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [
        fixture('linear-plain', { value: 0.5 }),
        fixture('linear-huge', { size: 'huge', value: 0.5 }),
        fixture('linear-wavy', { variant: 'wavy', value: 0.5 }),
        fixture('linear-zipper', { separation: 'zipper', value: 0.5 }),
        fixture('linear-alarm', { status: 'alarm', value: 0.5 }),
        fixture('ring-huge', { variant: 'circular', size: 'huge', value: 0.5 }),
      ],
    });
    const drawn = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.track, .indicator, .stop')].map((p) => [p.className, getComputedStyle(p).display, getComputedStyle(p).backgroundColor, (p as HTMLElement).getBoundingClientRect().width, (p as HTMLElement).getBoundingClientRect().height]));
    const plain = await drawn('linear-plain');
    for (const id of ['linear-huge', 'linear-wavy', 'linear-zipper', 'linear-alarm']) expect(await drawn(id), id).toEqual(plain);
    expect((await box(host(page, 'ring-huge'))).width).toBe(await resolveToken(page, T('circular-size-medium')));
    await expect.poll(() => seen.filter((w) => w.includes('MTR-11')).length).toBe(5);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/size "huge" is not a value of the active design system; it is drawn as "medium" \(MTR-11\)/),
      expect.stringMatching(/variant "wavy" is not a value of the meter; it is drawn as "linear" \(MTR-11\)/),
      expect.stringMatching(/separation "zipper" is not a value of the meter; it is drawn as "auto" \(MTR-11\)/),
      expect.stringMatching(/status "alarm" is not a value of the meter; it is drawn as "default" \(MTR-11\)/),
    ]));
  });

  test('MTR-11: a size a design system adds renders from its tokens, with no report', async ({ page }) => {
    test.setTimeout(120_000); // builds a layer
    const layer = {
      id: 'roomy',
      name: 'Roomy',
      extends: 'tanrei',
      description: 'A test layer that adds a meter size.',
      vocabulary: { 'tanrei.comp.meter.size.xl': { from: 'large', scale: 1.5, rationale: 'A storage page’s headline meter.' } },
      tokens: {},
    };
    const { resolveSystem } = await import('@tanrei/tokens-build/resolve');
    const { emitCss } = await import('@tanrei/tokens-build/emit/css');
    const systemCss = emitCss(await (await resolveSystem({ layers: [layer] })).model(), { scope: layer.id }) as string;
    const seen = warnings(page);
    await mountFixtures(page, spec, { system: layer.id, systemCss, fixtures: [fixture('linear-xl', { size: 'xl', value: 0.5 }), fixture('ring-xl', { variant: 'circular', size: 'xl', value: 0.5 })] });
    expect((await box(host(page, 'linear-xl'))).height).toBe(await resolveToken(page, T('linear-thickness-xl')));
    expect((await box(host(page, 'linear-xl'))).height).toBe(12); // large (8) × 1.5
    expect((await box(host(page, 'ring-xl'))).width).toBe(await resolveToken(page, T('circular-size-xl')));
    expect(seen.filter((w) => w.includes('MTR-11'))).toEqual([]);
  });

  test('MTR-12: right to left, a bar fills from the right and draws its stop indicator at the left; a ring is not mirrored', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    // The fixture's stage carries dir="rtl": the direction of an ancestor, not of the document.
    await expect(stage(page, 'linear-rtl')).toHaveAttribute('dir', 'rtl');
    const [bar, indicator] = [await box(host(page, 'linear-rtl')), await box(part(page, 'linear-rtl', 'indicator'))];
    expect(indicator.x + indicator.width).toBe(bar.x + bar.width);
    expect(indicator.width).toBeCloseTo(bar.width * 0.62, 1);
    await rootTokens(page, { [T('stop-indicator-size')]: '4px' });
    const dot = await box(part(page, 'linear-rtl', 'stop'));
    expect(dot.x + dot.width / 2).toBeCloseTo(bar.x + bar.height / 2, 1);
    // The ring: a quarter still runs from twelve to three o'clock.
    await mountFixtures(page, spec, { fixtures: [{ ...fixture('quarter', { variant: 'circular', size: 'large', value: 0.25 }), direction: 'rtl' }] });
    const indicatorColor = await paintedColor(page, `var(${T('indicator-color')})`);
    const [right, left] = await ringAt(page, 'quarter', [0.12, 0.88]);
    expect([near(right, indicatorColor), near(left, indicatorColor)]).toEqual([true, false]);
  });

  test('MTR-13: when the direction around it changes while it is shown, the meter is drawn for the new direction at once, without a motion, keeping its value', async ({ page }) => {
    // Under gap the track after the indicator starts at a physical inset that a flip of direction moves: the case
    // where the value's transition would run.
    for (const id of ['linear-gap', 'linear']) {
      const drawn = await stage(page, id).evaluate(async (holder) => {
        const meter = holder.querySelector('tanrei-meter')!;
        const parts = [...meter.shadowRoot!.querySelectorAll('.bar *')];
        holder.setAttribute('dir', 'rtl');
        // The first frame drawn after the change, and the next.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const bar = meter.getBoundingClientRect();
        const visible = parts.filter((p) => getComputedStyle(p).display !== 'none');
        return {
          boxes: visible.map((p) => { const r = p.getBoundingClientRect(); return [p.className, Math.round((bar.right - r.right) * 100) / 100, Math.round(r.width * 100) / 100]; }),
          now: meter.getAttribute('aria-valuenow'),
        };
      });
      expect(drawn.now, id).toBe('0.62');
      // At rest in right to left: the indicator from the right edge, the track after it (and its gap) to the left.
      const width = (await box(host(page, id))).width;
      const indicator = drawn.boxes.find(([name]) => name === 'indicator')!;
      expect(indicator[1], id).toBe(0);
      expect(indicator[2] as number, id).toBeCloseTo(width * 0.62, 1);
      // Under gap, the track after the gap: already where it rests, not on its way from the old direction's place.
      const after = drawn.boxes.find(([name]) => name === 'track after');
      expect(!!after, id).toBe(id === 'linear-gap');
      if (after) expect(after[1] as number, id).toBeCloseTo(width * 0.62 + (await resolveToken(page, T('track-gap'))), 1);
    }
  });

  test('MTR-14: a meter without a label still renders, and a debug build reports that it has no accessible name', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [{ id: 'linear-nameless', props: { value: 0.5 } }] });
    expect((await box(host(page, 'linear-nameless'))).height).toBe(await resolveToken(page, T('linear-thickness-medium')));
    await expect(host(page, 'linear-nameless')).not.toHaveAttribute('aria-label');
    await expect.poll(() => seen.filter((w) => w.includes('MTR-14'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('MTR-14'))).toMatch(/<tanrei-meter>: label is empty/);
    await host(page, 'linear-nameless').evaluate((el: any) => (el.label = 'Storage used'));
    await expect(host(page, 'linear-nameless')).toHaveAccessibleName('Storage used');
  });

  test('MTR-15: with forced colors the track is a hairline edge and the indicator is filled, both in the text color, whatever the status', async ({ page }) => {
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
    // The colors change when the mode is turned on, and a change of color fades (MTR-6): read them at rest.
    await motionEnded(page);
    const text = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'forced-color-adjust: none; background-color: CanvasText';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    for (const id of ['linear', 'linear-info', 'linear-success', 'linear-warning', 'linear-error']) {
      expect(await css(part(page, id, 'indicator'), 'background-color'), id).toBe(text);
      // An edge: one inset ring of the hairline's width in the text color (engines order the parts differently).
      const edge = await css(part(page, id, 'track'), 'box-shadow');
      expect(edge, id).toContain('inset');
      expect(edge, id).toContain(`0px 0px 0px ${hairline}px`);
      expect(edge, id).toContain(text);
    }
    for (const id of ['circular', 'circular-warning']) {
      expect(await css(host(page, id).locator('circle.indicator').first(), 'stroke'), id).toBe(text);
      expect(await css(host(page, id).locator('circle.track').first(), 'stroke'), id).toBe(text);
      expect(Number.parseFloat(await css(host(page, id).locator('circle.track').first(), 'stroke-width')), id).toBe(hairline);
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, in every status', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, reducedMotion: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  test('every status has a fixture, and a fixture that names a surface is drawn on a stage of that color role', async ({ page }) => {
    expect(new Set(spec.fixtures.map((f) => (f.props.status as string) ?? 'default'))).toEqual(new Set(STATUSES));
    const named = spec.fixtures.filter((f) => (f as Fixture & { surface?: string }).surface);
    expect(named.map((f) => f.id)).toEqual(['linear-on-container-highest']);
    const color = (id: string) => stage(page, id).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await color('linear-on-container-highest')).toBe(await resolveColor(page, '--tanrei-sys-color-surface-container-highest'));
    expect(await color('linear')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
