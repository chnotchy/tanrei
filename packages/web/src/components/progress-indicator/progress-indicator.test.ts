// <tanrei-progress-indicator>, driven by specs/progress-indicator.spec.json: a test's title cites each behaviour
// id it checks, every fixture has a baseline, and every length, color, duration and easing is read back from the tokens —
// never from a number written here, except the per-instance delays a test gives the element itself. Fixtures are
// rendered with no show delay (PRG-19's verify), so their first frame is the shown indicator.
// PRG-18: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';
import { HOLD_NOW, motionCount } from '../../../test/motions.js';
import { expectBaseline } from '../../../test/baseline.js';
import { expectPulseKeepsFloor, resolveOpacity, samplePulse } from '../../../test/pulse-floor.js';

const spec = loadSpec('progress-indicator');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-progress-indicator`);
/**
 * A part of the drawing, by its class. The track is drawn twice — whole under the indicator (divider) and after the gap
 * (gap) — and the separation shows one (PRG-17): `track` is the one that is drawn.
 */
const part = (page: P, id: string, name: string) => (name === 'track' ? host(page, id).locator('.track').filter({ visible: true }).first() : host(page, id).locator(`.${name}`).first());
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-progress-indicator-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const token = (page: P, name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
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
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Uploading', ...props } });
/** The running CSS animations of an element in the shadow root, with the name, timing and play state of each. */
const animations = (locator: Locator) =>
  locator.evaluate((el) =>
    el.getAnimations().filter((a) => a instanceof CSSAnimation).map((a) => {
      const timing = a.effect!.getComputedTiming();
      return { name: (a as CSSAnimation).animationName, duration: Math.round(Number(timing.duration) * 1000) / 1000, easing: (a.effect as KeyframeEffect).getKeyframes()[0]?.easing, state: a.playState };
    }),
  );
/** Holds the element's CSS animation at `ms` into its cycle and returns the given computed properties. */
const at = (locator: Locator, ms: number, properties: string[]) =>
  locator.evaluate((el, [t, props]) => {
    for (const a of el.getAnimations()) { a.pause(); a.currentTime = t as number; }
    const s = getComputedStyle(el);
    return Object.fromEntries((props as string[]).map((p) => [p, s.getPropertyValue(p)]));
  }, [ms, properties] as const);
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
const LINEAR = spec.fixtures.filter((f) => f.props.variant === 'linear').map((f) => f.id);
const CIRCULAR = spec.fixtures.filter((f) => f.props.variant === 'circular').map((f) => f.id);

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: false });
  });

  test('PRG-1: determinate draws the indicator over (value − min) / (max − min) of the track, from the inline-start of a bar and the top of a ring, clockwise', async ({ page }) => {
    for (const [id, fraction] of [['linear-determinate', 0.4], ['linear-range', 0.3], ['linear-empty', 0], ['linear-full', 1]] as const) {
      const [bar, indicator] = [await box(host(page, id)), await box(part(page, id, 'indicator'))];
      expect(indicator.x, id).toBe(bar.x);
      expect(indicator.width, id).toBeCloseTo(bar.width * fraction, 1);
    }
    // A quarter: indicator from twelve to three o'clock, track from three to twelve.
    await mountFixtures(page, spec, { fixtures: [fixture('quarter', { variant: 'circular', size: 'large', value: 0.25 })] });
    const [indicator, track] = [await paintedColor(page, `var(${T('indicator-color')})`), await paintedColor(page, `var(${T('track-color')})`)];
    const [early, late, back, left] = await ringAt(page, 'quarter', [0.06, 0.19, 0.3, 0.8]);
    expect([near(early, indicator), near(late, indicator), near(back, track), near(left, track)], `${early} ${late} ${back} ${left}`).toEqual([true, true, true, true]);
  });

  test('PRG-2: indeterminate — a bar moves a two-fifths segment across the track once per cycle with cycle-easing; a ring turns a quarter arc clockwise at constant speed', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    const bar = part(page, 'linear-indeterminate', 'indicator');
    const [run] = await animations(bar);
    expect(run).toMatchObject({ name: 'bar-cross', duration, easing: await easing(page, T('motion-cycle-easing')), state: 'running' });
    const width = (await box(host(page, 'linear-indeterminate'))).width;
    expect((await box(bar)).width).toBeCloseTo(width * 0.4, 1);
    const track = (await box(host(page, 'linear-indeterminate'))).x;
    await at(bar, 0, []);
    expect((await box(bar)).x - track).toBeCloseTo(-0.4 * width, 1);
    await at(bar, duration - 0.001, []);
    expect((await box(bar)).x - track).toBeCloseTo(width, 0);
    // Moved by a transform alone: a frame of it lays nothing out (an animated inset would, for as long as the bar is shown).
    expect(await bar.evaluate((el) => [...new Set(el.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k))))].filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)))).toEqual(['transform']);
    // Clipped to the track.
    expect(await css(part(page, 'linear-indeterminate', 'bar'), 'overflow')).toBe('hidden');

    const spin = part(page, 'circular-indeterminate', 'spin');
    const [turn] = await animations(spin);
    expect(turn).toMatchObject({ name: 'ring-turn', duration, easing: await easing(page, '--tanrei-sys-motion-easing-linear'), state: 'running' });
    expect((await at(spin, duration / 4, ['rotate'])).rotate).toBe('90deg');
    expect((await at(spin, duration / 2, ['rotate'])).rotate).toBe('180deg');
    // The arc is a quarter of the circle, caps included.
    const circle = host(page, 'circular-indeterminate').locator('.caps circle.indicator');
    const [dash, cap, c] = await circle.evaluate((el) => {
      const ring = getComputedStyle(el.closest('.ring')!);
      const probe = (v: string) => { const d = document.createElement('div'); d.style.width = v; el.closest('.ring')!.appendChild(d); const w = Number.parseFloat(getComputedStyle(d).width); d.remove(); return w; };
      return [Number.parseFloat(getComputedStyle(el).strokeDasharray), probe(ring.getPropertyValue('--_cap')), probe(getComputedStyle(el).getPropertyValue('--_c'))];
    });
    expect(dash + cap).toBeCloseTo(c / 4, 2);
  });

  test('PRG-3: a bar is linear.thickness high across its layout’s inline size; a ring fills circular.size with a circular.thickness stroke', async ({ page }) => {
    for (const id of LINEAR) {
      const size = (spec.fixtures.find((f) => f.id === id)!.props.size as string) ?? 'medium';
      const [own, room] = [await box(host(page, id)), await box(stage(page, id))];
      expect(own.height, id).toBe(await resolveToken(page, T(`linear-thickness-${size}`)));
      expect(own.width, id).toBe(room.width - 32); // the stage's padding
    }
    for (const id of CIRCULAR) {
      const size = (spec.fixtures.find((f) => f.id === id)!.props.size as string) ?? 'medium';
      const side = await resolveToken(page, T(`circular-size-${size}`));
      const stroke = await resolveToken(page, T(`circular-thickness-${size}`));
      expect(await box(host(page, id)), id).toMatchObject({ width: side, height: side });
      const circle = host(page, id).locator('circle.indicator').first();
      expect(Number.parseFloat(await css(circle, 'stroke-width')), id).toBe(stroke);
      // The outer edge touches the square: radius + half the stroke = half the side (the length is of the engine's
      // Bézier approximation of the circle, within a few hundredths).
      expect(await circle.evaluate((el) => (el as SVGCircleElement).getTotalLength() / (2 * Math.PI)), id).toBeCloseTo((side - stroke) / 2, 0);
    }
  });

  test('PRG-4: the track in track.color and the indicator in indicator.color; the bar’s ends are rounded by track.shape; the ring’s caps are round unless track.shape is none', async ({ page }) => {
    const [trackColor, indicatorColor] = [await resolveColor(page, T('track-color')), await resolveColor(page, T('indicator-color'))];
    expect(await css(part(page, 'linear-determinate', 'track'), 'background-color')).toBe(trackColor);
    expect(await css(part(page, 'linear-determinate', 'indicator'), 'background-color')).toBe(indicatorColor);
    const circle = (id: string, name: string) => host(page, id).locator(`circle.${name}`).first();
    expect(await css(circle('circular-determinate', 'track'), 'stroke')).toBe(trackColor);
    expect(await css(circle('circular-determinate', 'indicator'), 'stroke')).toBe(indicatorColor);
    // The bar's ends: track.shape (full), which the browser clamps to half the thickness — the corner pixel is empty.
    const thickness = (await box(host(page, 'linear-large'))).height;
    expect(await css(part(page, 'linear-large', 'track'), 'border-top-left-radius')).toBe(`${await resolveToken(page, T('track-shape'))}px`);
    const shot = decodePng(await host(page, 'linear-large').screenshot());
    expect(shot.at(0, 0)).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    expect(near(shot.at(Math.round(thickness), Math.round(thickness)), await paintedColor(page, `var(${T('indicator-color')})`))).toBe(true);
    // Round caps: the round-capped drawing is shown in full.
    const caps = host(page, 'circular-large').locator('.caps');
    expect((await box(caps)).width).toBe((await box(host(page, 'circular-large'))).width);
    expect(await css(caps.locator('circle').first(), 'stroke-linecap')).toBe('round');
    // track.shape none: square ends and square caps.
    await override(page, { [T('track-shape')]: 'var(--tanrei-sys-shape-corner-none)' });
    expect((await caps.boundingBox())?.width ?? 0).toBe(0);
    expect(await css(host(page, 'circular-large').locator('svg > circle').first(), 'stroke-linecap')).toBe('butt');
    expect(await css(part(page, 'linear-large', 'track'), 'border-top-left-radius')).toBe('0px');
  });

  test('PRG-5: under divider the indicator is drawn on the track, touching it; under gap track.gap is left after a bar’s indicator and at both ends of a ring’s arc while strictly between min and max; a determinate bar draws the stop indicator by its size alone, under either separation — never larger than it is thick, not at max, and none at 0 (the default system’s size)', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const gap = await resolveToken(page, T('track-gap'));
    expect(gap).toBeGreaterThan(0);
    const bars = ['linear-determinate', 'linear-small', 'linear-large', 'linear-range', 'linear-divider', 'linear-gap', 'linear-gap-small', 'linear-gap-large'];
    const dotWidth = async (id: string) => (await part(page, id, 'stop').boundingBox())?.width ?? 0;
    // The default system gives the stop indicator no size: no bar draws a dot, under divider or under gap.
    expect(await resolveToken(page, T('stop-indicator-size'))).toBe(0);
    for (const id of bars) expect(await dotWidth(id), id).toBe(0);
    // Divider (the default system's choice, and linear-divider's own): the track runs on under the indicator from the
    // bar's start, whatever the gap token says.
    for (const id of ['linear-determinate', 'linear-small', 'linear-large', 'linear-range', 'linear-divider']) {
      expect((await box(part(page, id, 'track'))).x, id).toBe((await box(host(page, id))).x);
      expect((await box(part(page, id, 'track'))).width, id).toBe((await box(host(page, id))).width);
      await expect(host(page, id).locator('.track.after'), id).toBeHidden();
    }
    // Gap: track.gap of empty space between the indicator's end and the track; the track still ends at the bar's end.
    for (const id of ['linear-gap', 'linear-gap-small', 'linear-gap-large']) {
      const [bar, indicator, track] = await Promise.all(['bar', 'indicator', 'track'].map((n) => box(part(page, id, n))));
      expect(track.x - (indicator.x + indicator.width), id).toBeCloseTo(gap, 3);
      expect(track.x + track.width, id).toBe(bar.x + bar.width);
      await expect(host(page, id).locator('.track.under'), id).toBeHidden();
    }
    // A system that gives the stop indicator a size: every determinate bar below max draws the dot, under divider as
    // under gap — stop-indicator.size and no larger than the bar is thick, in the indicator color, centered in the
    // thickness with its center half the thickness before the track's end.
    await override(page, { [T('stop-indicator-size')]: 'var(--tanrei-sys-space-space50)' });
    const stop = await resolveToken(page, T('stop-indicator-size'));
    expect(stop).toBeGreaterThan(0);
    const sizes: Record<string, string> = { 'linear-small': 'small', 'linear-large': 'large', 'linear-gap-small': 'small', 'linear-gap-large': 'large' };
    for (const id of bars) {
      const [bar, dot] = await Promise.all(['bar', 'stop'].map((n) => box(part(page, id, n))));
      const thickness = await resolveToken(page, T(`linear-thickness-${sizes[id] ?? 'medium'}`));
      const drawn = Math.min(stop, thickness);
      expect([dot.width, dot.height], id).toEqual([drawn, drawn]);
      expect(dot.y + dot.height / 2, id).toBeCloseTo(bar.y + bar.height / 2, 3);
      expect(dot.x + dot.width / 2, id).toBeCloseTo(bar.x + bar.width - bar.height / 2, 3);
      expect(await css(part(page, id, 'stop'), 'background-color'), id).toBe(await resolveColor(page, T('indicator-color')));
    }
    // The dot does not change the separation's form: divider still touches, gap still leaves track.gap.
    expect((await box(part(page, 'linear-divider', 'track'))).x).toBe((await box(host(page, 'linear-divider'))).x);
    const [gapIndicator, gapTrack] = [await box(part(page, 'linear-gap', 'indicator')), await box(part(page, 'linear-gap', 'track'))];
    expect(gapTrack.x - (gapIndicator.x + gapIndicator.width)).toBeCloseTo(gap, 3);
    // Never larger than the bar is thick: smaller than the size in a small bar, smaller than a large bar's thickness.
    for (const id of ['linear-small', 'linear-gap-small']) expect((await box(part(page, id, 'stop'))).width, id).toBeLessThan(stop);
    for (const id of ['linear-large', 'linear-gap-large']) expect((await box(part(page, id, 'stop'))).width, id).toBeLessThan((await box(host(page, id))).height);
    // At max the indicator covers the track's end: no gap and no dot, under either separation; at min the dot is drawn.
    expect((await box(part(page, 'linear-gap-full', 'track'))).x).toBe((await box(host(page, 'linear-gap-full'))).x);
    for (const id of ['linear-full', 'linear-gap-full']) expect(await css(part(page, id, 'stop'), 'display'), id).toBe('none');
    expect(await dotWidth('linear-empty')).toBe(Math.min(stop, await resolveToken(page, T('linear-thickness-medium'))));
    await host(page, 'linear-gap').evaluate((el: any) => (el.value = 0));
    await expect.poll(async () => (await box(part(page, 'linear-gap', 'track'))).x).toBe((await box(host(page, 'linear-gap'))).x);
    // A size of 0 draws none.
    await host(page, 'linear-gap').evaluate((el, name) => (el as HTMLElement).style.setProperty(name, '0px'), T('stop-indicator-size'));
    expect(await dotWidth('linear-gap')).toBe(0);
    // Indeterminate has no stop indicator and no gap, under either separation.
    await expect(host(page, 'linear-indeterminate').locator('.stop')).toHaveCount(0);
    // The ring under gap: the track starts a gap (plus the round caps' reach) after the indicator's end, and stops a gap
    // before its start — the gap is at both ends of the arc.
    const arc = (id: string) =>
      host(page, id)
        .locator('.caps circle.track')
        .filter({ visible: true })
        .evaluate((el) => {
          const ring = el.closest('.ring')!;
          const probe = (v: string) => { const d = document.createElement('div'); d.style.width = v; ring.appendChild(d); const w = Number.parseFloat(getComputedStyle(d).width); d.remove(); return w; };
          const s = getComputedStyle(ring);
          return { offset: -Number.parseFloat(getComputedStyle(el).strokeDashoffset), dash: Number.parseFloat(getComputedStyle(el).strokeDasharray), c: probe(getComputedStyle(el).getPropertyValue('--_c')), cap: probe(s.getPropertyValue('--_cap')) };
        });
    for (const id of ['circular-gap', 'circular-gap-large']) {
      const drawn = await arc(id);
      expect(drawn.offset, id).toBeCloseTo(0.4 * drawn.c + gap + drawn.cap / 2, 2);
      // Drawn with its caps, the track ends at offset + dash + cap / 2 = one full turn less the gap.
      expect(drawn.offset + drawn.dash + drawn.cap / 2, id).toBeCloseTo(drawn.c - gap, 1);
    }
    // The ring under divider: the track is the whole circle, under the indicator.
    for (const id of ['circular-determinate', 'circular-small', 'circular-large']) {
      const drawn = await arc(id);
      expect(drawn.offset, id).toBeCloseTo(0, 3);
      expect(drawn.dash, id).toBeCloseTo(drawn.c, 1);
    }
    // Painted: between the arc's end and the track there is the stage under gap, and the track at once under divider.
    const [indicatorColor, trackColor, surfaceColor] = [await paintedColor(page, `var(${T('indicator-color')})`), await paintedColor(page, `var(${T('track-color')})`), await paintedColor(page, 'transparent')];
    const side = await resolveToken(page, T('circular-size-large'));
    const strokeWidth = await resolveToken(page, T('circular-thickness-large'));
    const circumference = Math.PI * (side - strokeWidth);
    // The middle of the gap after the arc's end (0.4 of a turn), and the middle of the gap before its start.
    const turnOf = (length: number) => length / circumference;
    const [afterEnd, beforeStart, onArc, onTrack] = [0.4 + turnOf(gap / 2), 1 - turnOf(gap / 2), 0.2, 0.7];
    const gapped = await ringAt(page, 'circular-gap-large', [afterEnd, beforeStart, onArc, onTrack]);
    expect([near(gapped[0], surfaceColor), near(gapped[1], surfaceColor), near(gapped[2], indicatorColor), near(gapped[3], trackColor)], gapped.join(' ')).toEqual([true, true, true, true]);
    const touching = await ringAt(page, 'circular-large', [0.4 + turnOf(strokeWidth / 2 + gap), onArc, onTrack]);
    expect([near(touching[0], trackColor), near(touching[1], indicatorColor), near(touching[2], trackColor)], touching.join(' ')).toEqual([true, true, true]);
  });

  test('PRG-17: auto takes comp.progress-indicator.track.separation, which follows the system’s choice — divider in the default system, gap in m3-like; an explicit value wins whatever the tokens say; an unknown name is divider', async ({ page }) => {
    const choice = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-behavior-separation').trim());
    /** What a determinate bar draws: the space between its indicator and its track, and whether the dot is drawn (which the separation does not decide: PRG-5). */
    const form = async (id: string) => {
      const [indicator, track] = [await box(part(page, id, 'indicator')), await box(part(page, id, 'track'))];
      const bar = await box(host(page, id));
      return { gap: track.x === bar.x ? 0 : Math.round((track.x - indicator.x - indicator.width) * 1000) / 1000, dot: ((await part(page, id, 'stop').boundingBox())?.width ?? 0) > 0 };
    };
    const apart = (name: string) => ({ style: `${T('track-separation')}: ${name}` });
    const extra = [fixture('linear-apart-gap', { ...apart('gap'), value: 0.4 }), fixture('linear-apart-gap-divider', { ...apart('gap'), separation: 'divider', value: 0.4 }), fixture('linear-apart-divider', { ...apart('divider'), value: 0.4 }), fixture('linear-apart-divider-gap', { ...apart('divider'), separation: 'gap', value: 0.4 }), fixture('linear-unknown', { ...apart('zipper'), value: 0.4 })];
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [...spec.fixtures, ...extra] });
    const gap = await resolveToken(page, T('track-gap'));
    const [divider, gapped] = [{ gap: 0, dot: false }, { gap, dot: false }];
    expect(await choice()).toBe('divider');
    expect(await form('linear-determinate')).toEqual(divider);
    expect(await form('linear-divider')).toEqual(divider);
    expect(await form('linear-gap')).toEqual(gapped);
    // The component token set apart from the system's choice, where a layer sets it; the instance over the token.
    expect(await form('linear-apart-gap')).toEqual(gapped);
    expect(await form('linear-apart-gap-divider')).toEqual(divider);
    expect(await form('linear-apart-divider-gap')).toEqual(gapped);
    expect(await form('linear-unknown')).toEqual(divider);

    await mountFixtures(page, spec, { reducedMotion: true, system: 'm3-like', fixtures: [...spec.fixtures, ...extra] });
    expect(await choice()).toBe('gap');
    // m3-like gives the stop indicator a size, so its bars draw the dot under divider too (PRG-5).
    const [m3, m3Divider] = [{ gap: await resolveToken(page, T('track-gap')), dot: true }, { gap: 0, dot: true }];
    expect(await form('linear-determinate')).toEqual(m3);
    expect(await form('linear-gap')).toEqual(m3);
    expect(await form('linear-divider')).toEqual(m3Divider);
    expect(await form('linear-apart-divider')).toEqual(m3Divider);
    expect(await form('linear-apart-divider-gap')).toEqual(m3);
  });

  test('PRG-17: a change of separation, or of the system it follows, draws the other form at once, without animation, keeping its value; an indeterminate indicator is drawn the same under either', async ({ page }) => {
    await mountFixtures(page, spec, { system: 'm3-like', fixtures: spec.fixtures.filter((f) => ['linear-determinate', 'circular-determinate', 'linear-indeterminate', 'circular-indeterminate'].includes(f.id)) });
    const gap = await resolveToken(page, T('track-gap'));
    const offset = async (id: string) => {
      const [indicator, track, bar] = [await box(part(page, id, 'indicator')), await box(part(page, id, 'track')), await box(host(page, id))];
      return track.x === bar.x ? 0 : Math.round((track.x - indicator.x - indicator.width) * 1000) / 1000;
    };
    expect(await offset('linear-determinate')).toBe(gap);
    // The attribute: the other form in the frame it renders, with no transition running on the track or the indicator.
    for (const [separation, expected] of [['divider', 0], ['gap', gap], ['divider', 0], ['auto', gap]] as const) {
      const now = await host(page, 'linear-determinate').evaluate(async (el: any, value) => {
        el.separation = value;
        await el.updateComplete;
        const drawn = [...el.shadowRoot.querySelectorAll('.track')].find((track: any) => getComputedStyle(track).display !== 'none') as HTMLElement;
        const [track, indicator, bar] = [drawn.getBoundingClientRect(), el.shadowRoot.querySelector('.indicator').getBoundingClientRect(), el.getBoundingClientRect()];
        return { gap: track.left === bar.left ? 0 : Math.round((track.left - indicator.right) * 1000) / 1000, running: [...el.shadowRoot.querySelectorAll('.track, .indicator, .stop')].flatMap((part: any) => part.getAnimations()).length, value: el.value, now: el.getAttribute('aria-valuenow') };
      }, separation);
      expect(now, separation).toEqual({ gap: expected, running: 0, value: 0.4, now: '0.4' });
    }
    // The ring: the same, on its dashes.
    const ring = await host(page, 'circular-determinate').evaluate(async (el: any) => {
      const dash = () => {
        const drawn = [...el.shadowRoot.querySelectorAll('.caps circle.track')].find((track: any) => getComputedStyle(track).display !== 'none') as SVGElement;
        return Number.parseFloat(getComputedStyle(drawn).strokeDashoffset);
      };
      const before = dash();
      el.separation = 'divider';
      await el.updateComplete;
      return { before, after: dash(), running: [...el.shadowRoot.querySelectorAll('circle')].flatMap((part: any) => part.getAnimations()).length };
    });
    expect(ring.before).not.toBe(0);
    expect(ring).toMatchObject({ after: 0, running: 0 });
    // A value change still moves over the value motion, in either form (PRG-6).
    expect(await css(part(page, 'linear-determinate', 'track'), 'transition-property')).toContain('inset-inline-start');
    // The token it follows: the page leaves m3-like for the default system, whose choice is divider.
    await host(page, 'circular-determinate').evaluate((el: any) => (el.separation = 'auto'));
    await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-system'));
    await expect.poll(() => offset('linear-determinate')).toBe(0);
    await expect(host(page, 'linear-determinate')).toHaveAttribute('aria-valuenow', '0.4');
    // Indeterminate: the same drawing under either — the whole track, no dot, the same moving segment.
    for (const id of ['linear-indeterminate', 'circular-indeterminate']) {
      const drawing = () =>
        host(page, id).evaluate((el) => {
          const tracks = [...el.shadowRoot!.querySelectorAll('.track')].map((track) => getComputedStyle(track).display !== 'none');
          const indicator = el.shadowRoot!.querySelector('.indicator')!;
          return { tracks, stop: el.shadowRoot!.querySelectorAll('.stop').length, animation: getComputedStyle(indicator).animationName, gap: getComputedStyle(el.shadowRoot!.querySelector('.bar, .ring')!).getPropertyValue('--_gap').trim() };
        });
      const auto = await drawing();
      for (const separation of ['gap', 'divider']) {
        await host(page, id).evaluate(async (el: any, value) => { el.separation = value; await el.updateComplete; }, separation);
        expect(await drawing(), `${id} ${separation}`).toEqual(auto);
      }
      expect(auto.stop, id).toBe(0);
      expect(auto.gap, id).toBe('0px');
    }
  });

  test('PRG-6: a value change moves the indicator’s end over value-duration with value-easing; a switch of mode takes effect at once', async ({ page }) => {
    const duration = await resolveToken(page, T('motion-value-duration'), 'duration');
    const indicator = part(page, 'linear-determinate', 'indicator');
    expect(await css(indicator, 'transition-duration')).toBe(`${duration / 1000}s`);
    expect(await css(indicator, 'transition-timing-function')).toContain(await easing(page, T('motion-value-easing')));
    const width = (await box(host(page, 'linear-determinate'))).width;
    // The end is sampled on the transition's own timeline, a third of the way in — never after a wall-clock sleep, which
    // on a loaded machine can outlast the whole transition.
    const { durations, moving } = await host(page, 'linear-determinate').evaluate(async (el, t) => {
      (el as any).value = 0.9;
      await (el as any).updateComplete;
      const bar = el.shadowRoot!.querySelector('.indicator')!;
      const transitions = bar.getAnimations().filter((a) => a instanceof CSSTransition);
      for (const a of transitions) { a.pause(); a.currentTime = t; }
      const sampled = bar.getBoundingClientRect().width;
      for (const a of transitions) a.play();
      // Whole milliseconds, as the token is: Firefox reports a token of 200 ms as 200.000015 (a float of seconds).
      return { durations: transitions.map((a) => Math.round(Number(a.effect!.getTiming().duration))), moving: sampled };
    }, duration / 3);
    expect(durations).toEqual([duration]);
    expect(moving).toBeGreaterThan(width * 0.4 + 1);
    expect(moving).toBeLessThan(width * 0.9 - 1);
    await expect.poll(async () => (await box(indicator)).width).toBeCloseTo(width * 0.9, 1);
    // The ring's arc transitions too.
    expect(await css(host(page, 'circular-determinate').locator('circle.indicator').first(), 'transition-property')).toContain('stroke-dasharray');
    // Determinate → indeterminate and back: a new drawing, nothing transitions.
    await host(page, 'linear-determinate').evaluate((el) => ((el as any).value = null));
    expect(await part(page, 'linear-determinate', 'indicator').evaluate((el) => el.getAnimations().filter((a) => a instanceof CSSTransition).length)).toBe(0);
    expect((await box(part(page, 'linear-determinate', 'indicator'))).width).toBeCloseTo(width * 0.4, 1);
    await host(page, 'linear-determinate').evaluate((el) => ((el as any).value = 0.2));
    expect(await part(page, 'linear-determinate', 'indicator').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect((await box(part(page, 'linear-determinate', 'indicator'))).width).toBeCloseTo(width * 0.2, 1);
  });

  test('PRG-7: under reduced motion a value change shows at once, and indeterminate pulses the whole indicator’s opacity from 1 down to the floor and back once per cycle over a still track', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const width = (await box(host(page, 'linear-determinate'))).width;
    await host(page, 'linear-determinate').evaluate((el) => ((el as any).value = 0.9));
    expect((await box(part(page, 'linear-determinate', 'indicator'))).width).toBeCloseTo(width * 0.9, 1);
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    const cycleEasing = await easing(page, T('motion-cycle-easing'));
    // The bar: the indicator over the whole track.
    const bar = part(page, 'linear-indeterminate', 'indicator');
    expect(await box(bar)).toEqual(await box(host(page, 'linear-indeterminate')));
    expect(await animations(bar)).toEqual([{ name: 'pulse', duration, easing: cycleEasing, state: 'running' }]);
    const opacity = async (ms: number) => Number((await at(bar, ms, ['opacity'])).opacity);
    expect(await opacity(0)).toBe(1);
    expect(await opacity(duration / 2)).toBeCloseTo(await resolveOpacity(page, T('motion-pulse-floor-opacity')), 5);
    expect(await opacity(duration * 0.75)).toBeGreaterThan(await opacity(duration / 2));
    expect(await opacity(duration)).toBe(1);
    expect(await animations(part(page, 'linear-indeterminate', 'track'))).toEqual([]);
    // The ring: the whole circle, still.
    const circle = host(page, 'circular-indeterminate').locator('.spin > svg > circle.indicator');
    expect(await css(circle, 'stroke-dasharray')).toBe('none');
    expect(await animations(circle)).toEqual([{ name: 'pulse', duration, easing: cycleEasing, state: 'running' }]);
    expect(await animations(part(page, 'circular-indeterminate', 'spin'))).toEqual([]);
    const [top, bottom] = await ringAt(page, 'circular-indeterminate', [0.5, 0.9]);
    const indicator = await paintedColor(page, `var(${T('indicator-color')})`);
    expect([near(top, indicator), near(bottom, indicator)]).toEqual([true, true]);
  });

  test('PRG-7: under reduced motion the indeterminate indicator is never drawn below the pulse floor — sampled over a whole cycle, computed and painted, bar and ring', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    const floor = await resolveOpacity(page, T('motion-pulse-floor-opacity'));
    // The indicator covers its track whole, so what it is drawn on is the track as painted.
    const track = await paintedColor(page, `var(${T('track-color')})`);
    const bar = host(page, 'linear-indeterminate');
    const { width, height } = await box(bar);
    expectPulseKeepsFloor(await samplePulse(part(page, 'linear-indeterminate', 'indicator'), bar, { duration, mark: [width / 2, height / 2], ground: track }), floor, 'bar');
    const ring = host(page, 'circular-indeterminate');
    const size = (await box(ring)).width;
    const stroke = Number.parseFloat(await css(ring.locator('.spin > svg > circle.indicator'), 'stroke-width'));
    // The top of the circle, on the middle of its stroke; every circle that draws the indicator pulses.
    expectPulseKeepsFloor(await samplePulse(ring.locator('circle.indicator'), ring, { duration, mark: [size / 2, stroke / 2], ground: track }), floor, 'ring');
  });

  test('PRG-8: determinate is a progressbar named by label, with min, max, the clamped value and valueText', async ({ page }) => {
    await expect(page.getByRole('progressbar', { name: 'Uploading' })).toHaveCount(spec.fixtures.length);
    const range = host(page, 'linear-range');
    for (const [name, value] of [['role', 'progressbar'], ['aria-valuemin', '0'], ['aria-valuemax', '10'], ['aria-valuenow', '3'], ['aria-valuetext', '3 of 10 files']]) {
      await expect(range, name).toHaveAttribute(name, value);
    }
    await expect(host(page, 'linear-determinate')).toHaveAttribute('aria-valuenow', '0.4');
    await expect(host(page, 'linear-determinate')).toHaveAttribute('aria-valuemax', '1');
    await expect(host(page, 'linear-determinate')).not.toHaveAttribute('aria-valuetext');
    await expect(host(page, 'linear-determinate')).not.toHaveAttribute('aria-busy');
    await expect(range).toHaveAccessibleName('Uploading');
    // valueText is the value-text attribute.
    await range.evaluate((el) => el.setAttribute('value-text', '4 of 10 files'));
    await expect(range).toHaveAttribute('aria-valuetext', '4 of 10 files');
  });

  test('PRG-9: indeterminate is a progressbar named by label, with no current value, busy', async ({ page }) => {
    for (const id of ['linear-indeterminate', 'circular-indeterminate']) {
      await expect(host(page, id), id).toHaveAttribute('role', 'progressbar');
      await expect(host(page, id), id).toHaveAttribute('aria-busy', 'true');
      for (const name of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext']) await expect(host(page, id), `${id} ${name}`).not.toHaveAttribute(name);
      await expect(host(page, id), id).toHaveAccessibleName('Uploading');
    }
    // Removing the value attribute makes it indeterminate, as <progress> does.
    await host(page, 'linear-determinate').evaluate((el) => el.removeAttribute('value'));
    await expect(host(page, 'linear-determinate')).toHaveAttribute('aria-busy', 'true');
    await expect(host(page, 'linear-determinate')).not.toHaveAttribute('aria-valuenow');
  });

  test('PRG-10: never focusable, and never a live region — the value is read when assistive technology reaches it', async ({ page }) => {
    for (const { id } of spec.fixtures) {
      await host(page, id).evaluate((el) => (el as HTMLElement).focus());
      expect(await page.evaluate(() => document.activeElement?.localName), id).not.toBe('tanrei-progress-indicator');
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
    await host(page, 'linear-determinate').evaluate((el) => ((el as any).value = 0.5));
    await expect(host(page, 'linear-determinate')).toHaveAttribute('aria-valuenow', '0.5');
  });

  test('PRG-11: a value outside min…max is drawn and exposed clamped; max not above min draws the track only and exposes 0 of 0…1 — each reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      reducedMotion: true,
      fixtures: [fixture('linear-over', { value: 2 }), fixture('linear-under', { value: -1 }), fixture('linear-inverted', { value: 3, min: 5, max: 5 }), fixture('ring-over', { variant: 'circular', value: 7, max: 5 })],
    });
    await expect(host(page, 'linear-over')).toHaveAttribute('aria-valuenow', '1');
    expect((await box(part(page, 'linear-over', 'indicator'))).width).toBe((await box(host(page, 'linear-over'))).width);
    await expect(host(page, 'linear-under')).toHaveAttribute('aria-valuenow', '0');
    await expect(part(page, 'linear-under', 'indicator')).toBeHidden();
    await expect(host(page, 'ring-over')).toHaveAttribute('aria-valuenow', '5');
    for (const [name, value] of [['aria-valuemin', '0'], ['aria-valuemax', '1'], ['aria-valuenow', '0']]) await expect(host(page, 'linear-inverted'), name).toHaveAttribute(name, value);
    await expect(part(page, 'linear-inverted', 'indicator')).toBeHidden();
    await expect(part(page, 'linear-inverted', 'track')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('PRG-11')).length).toBe(4);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/value 2 is outside 0…1; it is drawn and exposed as 1 \(PRG-11\)/),
      expect.stringMatching(/max 5 is not greater than min 5; the track is drawn with no indicator/),
    ]));
  });

  test('PRG-12: a separation the component does not define renders as auto, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [fixture('linear-plain', { value: 0.4 }), fixture('linear-odd', { separation: 'zipper', value: 0.4 })] });
    const drawn = (id: string) => host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.track, .stop')].map((part) => [part.className, getComputedStyle(part).display, (part as HTMLElement).getBoundingClientRect().width]));
    expect(await drawn('linear-odd')).toEqual(await drawn('linear-plain'));
    await expect.poll(() => seen.filter((w) => w.includes('PRG-12')).length).toBe(1);
    expect(seen.join('\n')).toMatch(/separation "zipper" is not a value of the progress indicator; it is drawn as "auto" \(PRG-12\)/);
    // m3-like, whose auto is gap: the unknown value is still auto.
    await mountFixtures(page, spec, { system: 'm3-like', fixtures: [fixture('linear-plain', { value: 0.4 }), fixture('linear-odd', { separation: 'zipper', value: 0.4 })] });
    expect(await drawn('linear-odd')).toEqual(await drawn('linear-plain'));
    await expect(host(page, 'linear-odd').locator('.track.after')).toBeVisible();
  });

  test('PRG-12: a size the active system does not have, or a variant the component does not define, renders as medium / linear and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [fixture('linear-plain', { value: 0.5 }), fixture('linear-huge', { size: 'huge', value: 0.5 }), fixture('linear-wavy', { variant: 'wavy', value: 0.5 }), fixture('ring-huge', { variant: 'circular', size: 'huge', value: 0.5 })],
    });
    expect((await box(host(page, 'linear-huge'))).height).toBe((await box(host(page, 'linear-plain'))).height);
    expect(await box(host(page, 'linear-wavy'))).toEqual({ ...(await box(host(page, 'linear-plain'))), y: (await box(host(page, 'linear-wavy'))).y });
    expect((await box(host(page, 'ring-huge'))).width).toBe(await resolveToken(page, T('circular-size-medium')));
    await expect.poll(() => seen.filter((w) => w.includes('PRG-12')).length).toBe(3);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/size "huge" is not a value of the active design system; it is drawn as "medium" \(PRG-12\)/),
      expect.stringMatching(/variant "wavy" is not a value of the progress indicator; it is drawn as "linear" \(PRG-12\)/),
    ]));
  });

  test('PRG-12: a size a design system adds renders from its tokens, with no report', async ({ page }) => {
    test.setTimeout(120_000); // builds a layer
    const layer = {
      id: 'thick',
      name: 'Thick',
      extends: 'tanrei',
      description: 'A test layer that adds a progress-indicator size.',
      vocabulary: { 'tanrei.comp.progress-indicator.size.xl': { from: 'large', scale: 1.5, rationale: 'A hero upload.' } },
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
    expect(seen.filter((w) => w.includes('PRG-12'))).toEqual([]);
  });

  test('PRG-13: in RTL a bar fills from the right and its segment moves right to left; a ring is not mirrored', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [bar, indicator] = [await box(host(page, 'linear-determinate')), await box(part(page, 'linear-determinate', 'indicator'))];
    expect(indicator.x + indicator.width).toBe(bar.x + bar.width);
    expect(indicator.width).toBeCloseTo(bar.width * 0.4, 1);
    const segment = part(page, 'linear-indeterminate', 'indicator');
    const whole = await box(host(page, 'linear-indeterminate'));
    await at(segment, 0, []);
    const first = await box(segment);
    expect(first.x).toBeGreaterThanOrEqual(whole.x + whole.width - 1); // beyond the right end
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    await at(segment, duration - 0.001, []);
    expect((await box(segment)).x + (await box(segment)).width).toBeLessThanOrEqual(whole.x + 1); // beyond the left end
    // The ring: a quarter still runs from twelve to three o'clock.
    await mountFixtures(page, spec, { fixtures: [fixture('quarter', { variant: 'circular', size: 'large', value: 0.25 })] });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const indicatorColor = await paintedColor(page, `var(${T('indicator-color')})`);
    const [right, left] = await ringAt(page, 'quarter', [0.12, 0.88]);
    expect([near(right, indicatorColor), near(left, indicatorColor)]).toEqual([true, false]);
    expect(await css(part(page, 'quarter', 'ring'), 'direction')).toBe('rtl'); // the direction is there, and ignored
  });

  test('PRG-16: the direction is the nearest ancestor’s — not the root’s and not a setting of the indicator’s own; when it changes while the indicator is shown it is drawn for the new direction at once, without a motion, keeping its value and the place of an indeterminate segment in its cycle', async ({ page }) => {
    const of = (id: string) => spec.fixtures.find((f) => f.id === id)!;
    const ids = ['linear-rtl-determinate', 'linear-rtl-gap', 'linear-rtl-indeterminate', 'rtl-ring'];
    // The verify: the direction set on an ancestor inside the page (each fixture's stage), not on the root.
    await mountFixtures(page, spec, {
      reducedMotion: false,
      fixtures: [
        { ...of('linear-determinate'), id: 'linear-rtl-determinate', direction: 'rtl' },
        { ...of('linear-gap'), id: 'linear-rtl-gap', direction: 'rtl' },
        { ...of('linear-indeterminate'), id: 'linear-rtl-indeterminate', direction: 'rtl' },
        { ...of('circular-indeterminate'), id: 'rtl-ring', direction: 'rtl' },
      ],
    });
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    const told: Record<string, string> = {};
    for (const id of ids) {
      expect(await host(page, id).evaluate((el) => [el.getAttribute('dir'), el.matches(':dir(rtl)'), Object.keys((el.constructor as unknown as { properties: object }).properties).some((p) => /^dir|direction/i.test(p))]), id).toEqual([null, true, false]);
      told[id] = await stage(page, id).ariaSnapshot();
    }
    /** The indicator's distance from the bar's left and right edges, and its width over the bar's. */
    const filled = async (id: string) => {
      const [bar, indicator] = [await box(host(page, id)), await box(part(page, id, 'indicator'))];
      return { left: indicator.x - bar.x, right: bar.x + bar.width - (indicator.x + indicator.width), fraction: indicator.width / bar.width };
    };
    for (const id of ['linear-rtl-determinate', 'linear-rtl-gap']) {
      const rtl = await filled(id);
      expect(rtl.right, `${id}: right-to-left fills from the right`).toBeCloseTo(0, 1);
      expect(rtl.fraction, id).toBeCloseTo(0.4, 2);
    }
    // Turning and crossing, some way into their cycles.
    for (const [id, name] of [['linear-rtl-indeterminate', 'indicator'], ['rtl-ring', 'spin']] as const) {
      await expect.poll(async () => part(page, id, name).evaluate((el) => el.getAnimations().map((a) => [a.playState, Number(a.currentTime) > 0]).join()), id).toBe('running,true');
    }
    // Changed on the ancestors after the first render. In the first frames drawn after it, each bar is already where it
    // rests in left-to-right — the track after the gap too, not on its way from its right-to-left place — and no
    // transition is left running; each segment's motion is the same animation, gone on from where it was.
    const duration = await resolveToken(page, T('motion-cycle-duration'), 'duration');
    const drawn = await page.evaluate(async (list) => {
      const hosts = list.map((id) => document.querySelector(`[data-fixture="${id}"] tanrei-progress-indicator`)!);
      const moving = ['linear-rtl-indeterminate', 'rtl-ring'].map((id) => {
        const el = document.querySelector(`[data-fixture="${id}"] tanrei-progress-indicator`)!.shadowRoot!.querySelector(id === 'rtl-ring' ? '.spin' : '.indicator')!;
        const [animation] = el.getAnimations();
        return { el, animation, time: Number(animation.currentTime) };
      });
      for (const el of hosts) el.closest('.stage')!.setAttribute('dir', 'ltr');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const boxes = hosts.slice(0, 2).map((el) => {
        const bar = el.getBoundingClientRect();
        return [...el.shadowRoot!.querySelectorAll('.bar > *')]
          .filter((p) => getComputedStyle(p).display !== 'none')
          .map((p) => {
            const r = p.getBoundingClientRect();
            return [p.className, Math.round((r.left - bar.left) * 100) / 100, Math.round(r.width * 100) / 100] as const;
          });
      });
      return { boxes, cycles: moving.map(({ el, animation, time }) => [el.getAnimations().includes(animation), Number(animation.currentTime) - time, animation.playState] as const) };
    }, ids);
    // Nothing moves but the two cycles: no transition is left running.
    for (const id of ids) expect(await motionCount(host(page, id)), id).toBe(['linear-rtl-determinate', 'linear-rtl-gap'].includes(id) ? 0 : 1);
    for (const [same, on, state] of drawn.cycles) {
      expect([same, state]).toEqual([true, 'running']);
      expect(on).toBeGreaterThanOrEqual(0);
      expect(on).toBeLessThan(duration);
    }
    const [width, gap] = [(await box(host(page, 'linear-rtl-gap'))).width, await resolveToken(page, T('track-gap'))];
    for (const [i, id] of ['linear-rtl-determinate', 'linear-rtl-gap'].entries()) {
      const indicator = drawn.boxes[i].find(([name]) => name === 'indicator')!;
      expect(indicator[1], `${id}: left-to-right fills from the left`).toBe(0);
      expect(indicator[2], id).toBeCloseTo(width * 0.4, 1);
      const after = drawn.boxes[i].find(([name]) => name === 'track after');
      expect(!!after, id).toBe(id === 'linear-rtl-gap');
      if (after) expect(after[1], `${id}: the track after the gap already at rest`).toBeCloseTo(width * 0.4 + gap, 1);
    }
    // Keeping the value and what assistive technology is told.
    for (const id of ['linear-rtl-determinate', 'linear-rtl-gap']) {
      const ltr = await filled(id);
      expect(ltr.left, id).toBeCloseTo(0, 1);
      expect(ltr.fraction, id).toBeCloseTo(0.4, 2);
      expect(await host(page, id).evaluate((el) => (el as HTMLElement & { value: number }).value), id).toBe(0.4);
    }
    for (const id of ids) expect(await stage(page, id).ariaSnapshot(), id).toBe(told[id]);
    // The segment's place in its cycle: at one time of its animation, it stands as far from the bar's left end in
    // left-to-right as from its right end in right-to-left. The animation is held at that time while both places are
    // read (`HOLD_NOW`): in one task a running transform is still read at the moment of each read, so two reads a
    // direction change apart see the segment a little further on.
    const place = await host(page, 'linear-rtl-indeterminate').evaluate((el, holdNow) => {
      const hold = (0, eval)(holdNow) as (motions: Animation[]) => () => void;
      const segment = el.shadowRoot!.querySelector('.indicator')!;
      const [animation] = segment.getAnimations();
      const measure = () => {
        const [bar, r] = [el.getBoundingClientRect(), segment.getBoundingClientRect()];
        return { time: Number(animation.currentTime), fromLeft: r.left - bar.left, fromRight: bar.right - r.right, width: r.width };
      };
      const resume = hold([animation]);
      const ltr = measure();
      el.closest('.stage')!.setAttribute('dir', 'rtl');
      const rtl = measure();
      const same = segment.getAnimations()[0] === animation;
      resume();
      return { ltr, rtl, same, resumed: animation.playState };
    }, HOLD_NOW);
    expect(place.ltr.time).toBeGreaterThan(0);
    expect([place.same, place.resumed]).toEqual([true, 'running']);
    expect(place.rtl.time).toBe(place.ltr.time);
    expect(place.rtl.fromRight).toBeCloseTo(place.ltr.fromLeft, 1);
    expect(place.rtl.width).toBeCloseTo(place.ltr.width, 1);
  });

  test('PRG-14: off screen the indeterminate animation is paused, and it resumes when it is seen again', async ({ page }) => {
    // The two indeterminate fixtures alone, so that both are in the window together (the spec has more stages than a
    // window holds).
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: spec.fixtures.filter((f) => f.id.endsWith('-indeterminate')) });
    const running = async () => [...(await animations(part(page, 'linear-indeterminate', 'indicator'))), ...(await animations(part(page, 'circular-indeterminate', 'spin')))].map((a) => a.state);
    await expect.poll(running).toEqual(['running', 'running']);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<div id="spacer" style="block-size: 300vh"></div>'));
    await expect.poll(running).toEqual(['paused', 'paused']);
    await host(page, 'circular-indeterminate').scrollIntoViewIfNeeded();
    await expect.poll(running).toEqual(['running', 'running']);
    // Hidden with display: none, then shown again.
    await stage(page, 'linear-indeterminate').evaluate((el) => ((el as HTMLElement).style.display = 'none'));
    await stage(page, 'linear-indeterminate').evaluate((el) => ((el as HTMLElement).style.display = ''));
    await expect.poll(async () => (await animations(part(page, 'linear-indeterminate', 'indicator'))).map((a) => a.state)).toEqual(['running']);
  });

  test('PRG-15: a progress indicator without a label still renders, and a debug build reports that it has no accessible name', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [{ id: 'linear-nameless', props: { value: 0.5 } }] });
    expect((await box(host(page, 'linear-nameless'))).height).toBe(await resolveToken(page, T('linear-thickness-medium')));
    await expect(host(page, 'linear-nameless')).not.toHaveAttribute('aria-label');
    await expect.poll(() => seen.filter((w) => w.includes('PRG-15'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('PRG-15'))).toMatch(/<tanrei-progress-indicator>: label is empty/);
    await host(page, 'linear-nameless').evaluate((el) => ((el as any).label = 'Saving'));
    await expect(host(page, 'linear-nameless')).toHaveAccessibleName('Saving');
  });
});

/**
 * An empty page whose timers (`setTimeout`) hold still until the test moves them with `page.clock.runFor()`; CSS
 * animations and transitions keep the document's own timeline. Every time an indicator's `role`, `aria-label`,
 * `aria-busy` or `aria-valuenow` is set it is logged (`window.exposed`), so a test can say it never was.
 */
async function blank(page: P) {
  await mountFixtures(page, spec, { fixtures: [], reducedMotion: false });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.evaluate(() => {
    const seen: string[] = ((window as any).exposed = []);
    new MutationObserver((records) => {
      for (const r of records) if (r.oldValue === null) seen.push(`${(r.target as Element).id}:${r.attributeName}`);
    }).observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['role', 'aria-label', 'aria-busy', 'aria-valuenow'] });
  });
}
/** The show delay a progress indicator takes when it is given none (PRG-21). */
const SHOW_DELAY = T('motion-show-delay');
const reduceMotion = (page: P, reduce = true) => page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
const exposed = (page: P) => page.evaluate(() => (window as any).exposed as string[]);
/** Inserts a labelled indicator into `into`, and says what it exposes as it is inserted, before any frame. */
const insert = (page: P, id: string, attributes: Record<string, string> = {}, into = 'main') =>
  page.evaluate(
    ([id, attributes, into]) => {
      const el = document.createElement('tanrei-progress-indicator');
      el.id = id;
      el.setAttribute('label', 'Uploading');
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      document.querySelector(into)!.append(el);
      return { role: el.getAttribute('role'), hidden: el.getAttribute('aria-hidden') };
    },
    [id, attributes, into] as const,
  );
const byId = (page: P, id: string) => page.locator(`#${id}`);
/**
 * What an indicator exposes, whether its drawing (the bar or the ring), its indicator and its track are drawn, and what
 * runs in it: a CSS animation by its name, a transition by the property it moves.
 */
const state = (page: P, id: string) =>
  byId(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    return {
      role: el.getAttribute('role'),
      label: el.getAttribute('aria-label'),
      busy: el.getAttribute('aria-busy'),
      now: el.getAttribute('aria-valuenow'),
      hidden: el.getAttribute('aria-hidden'),
      drawn: ['.bar, .ring', '.indicator', '.track'].map((s) => getComputedStyle(root.querySelector(s)!).visibility),
      running: root.getAnimations().map((a) => (a instanceof CSSAnimation ? a.animationName : a instanceof CSSTransition ? `transition ${a.transitionProperty}` : a.id)).sort(),
    };
  });
const WAITING = { role: null, label: null, busy: null, now: null, hidden: 'true', drawn: ['hidden', 'hidden', 'hidden'], running: [] };
const exposure = async (page: P, id: string) => {
  const { role, label, busy, now, hidden } = await state(page, id);
  return { role, label, busy, now, hidden };
};
const WAITING_EXPOSURE = { role: null, label: null, busy: null, now: null, hidden: 'true' };
/** Shown: determinate with the value it has (`now`), or indeterminate (busy). */
const SHOWN = (now: string | null = '0.4') => ({ role: 'progressbar', label: 'Uploading', busy: now === null ? 'true' : null, now, hidden: null });
/** The share of the track the indicator covers, as drawn. */
const drawnShare = (page: P, id: string) =>
  byId(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    return root.querySelector('.indicator')!.getBoundingClientRect().width / root.querySelector('.bar')!.getBoundingClientRect().width;
  });

/**
 * Watches an inserted indicator for the moment it is shown, and looks at its drawing in that same task, once it has
 * rendered — before any frame can pass: what runs in it (each animation's name, current time and progress through its
 * cycle, and each transition's property). A start time is no measure of when an animation began: an engine sets it to
 * the time of a frame, so it is the current time, at the moment of showing, that says the cycle starts at its beginning.
 */
const watchStart = (page: P, id: string) =>
  byId(page, id).evaluate((el) => {
    new MutationObserver((_, observer) => {
      if (el.getAttribute('role') !== 'progressbar') return;
      observer.disconnect();
      void (el as any).updateComplete.then(() => {
        const running = el.shadowRoot!.getAnimations();
        const animations = running.filter((a) => a instanceof CSSAnimation).map((a) => ({ name: (a as CSSAnimation).animationName, time: a.currentTime, progress: a.effect!.getComputedTiming().progress }));
        const transitions = running.filter((a) => a instanceof CSSTransition).map((a) => (a as CSSTransition).transitionProperty);
        (window as any).starts = { ...(window as any).starts, [el.id]: { animations, transitions } };
      });
    }).observe(el, { attributes: true, attributeFilter: ['role'] });
  });
/** What `watchStart` saw as the indicator was shown. */
const started = (page: P, id: string) =>
  page.evaluate((id) => ((window as any).starts?.[id] ?? null) as { animations: { name: string; time: number | null; progress: number | null }[]; transitions: string[] } | null, id);

test.describe('show delay', () => {
  test('PRG-19: from its insertion it waits its show delay with its box kept, drawing, running and exposing nothing; a show delay of 0 shows it as it is inserted', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, SHOW_DELAY, 'duration');
    expect(delay).toBeGreaterThan(0);
    expect(await insert(page, 'bar', { value: '0.4' })).toEqual({ role: null, hidden: 'true' });
    expect(await insert(page, 'ring', { value: '0.4', variant: 'circular', size: 'large' })).toEqual({ role: null, hidden: 'true' });
    expect(await insert(page, 'busy')).toEqual({ role: null, hidden: 'true' });
    expect(await insert(page, 'turning', { variant: 'circular' })).toEqual({ role: null, hidden: 'true' });
    for (const id of ['bar', 'ring', 'busy', 'turning']) expect(await state(page, id), id).toEqual(WAITING);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    // The box it takes when shown (PRG-3), compared again once it is shown.
    const thickness = await resolveToken(page, T('linear-thickness-medium'));
    const ring = await resolveToken(page, T('circular-size-large'));
    const boxes = async () => Promise.all(['bar', 'ring', 'busy'].map((id) => box(byId(page, id))));
    const waiting = await boxes();
    expect(waiting.map(({ height }) => height)).toEqual([thickness, ring, thickness]);
    expect(waiting[1].width).toBe(ring);
    expect(waiting[0].width).toBeGreaterThan(ring);
    // Nothing painted — no track, no indicator: the page's surface in each box.
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    for (const [n, id] of ['bar', 'ring', 'busy'].entries()) {
      const shot = decodePng(await page.screenshot({ clip: waiting[n] }));
      const painted = new Set<string>();
      for (let y = 0; y < shot.height; y++) for (let x = 0; x < shot.width; x++) painted.add(shot.at(x, y));
      expect([...painted], id).toEqual([surface]);
    }

    await page.clock.runFor(delay - 1);
    for (const id of ['bar', 'ring', 'busy', 'turning']) expect(await state(page, id), id).toEqual(WAITING);
    await page.clock.runFor(1);
    for (const id of ['bar', 'ring']) expect(await exposure(page, id), id).toEqual(SHOWN());
    for (const id of ['busy', 'turning']) expect(await exposure(page, id), id).toEqual(SHOWN(null));
    for (const id of ['bar', 'ring', 'busy']) expect((await state(page, id)).drawn, id).toEqual(['visible', 'visible', 'visible']);
    expect(await boxes()).toEqual(waiting);

    // 0: shown, and exposed, as it is inserted.
    expect(await insert(page, 'at-once', { 'show-delay': '0', value: '0.4' })).toEqual({ role: 'progressbar', hidden: null });
    expect((await state(page, 'at-once')).drawn).toEqual(['visible', 'visible', 'visible']);
  });

  test('PRG-20: when its delay ends it is shown at once and exposed as PRG-8 or PRG-9 says, without announcing itself; a value changed during the delay is drawn at once, and an indeterminate cycle starts at its beginning', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, SHOW_DELAY, 'duration');
    // A value that changes during the delay runs no transition while it waits, and is not moved to when it is shown.
    await insert(page, 'moved', { value: '0.2' });
    await watchStart(page, 'moved');
    await page.clock.runFor(delay / 2);
    await byId(page, 'moved').evaluate(async (el: any) => { el.value = 0.7; await el.updateComplete; });
    expect(await state(page, 'moved')).toEqual(WAITING);
    await page.clock.runFor(delay / 2);
    expect(await exposure(page, 'moved')).toEqual(SHOWN('0.7'));
    expect(await started(page, 'moved')).toEqual({ animations: [], transitions: [] });
    expect(await drawnShare(page, 'moved')).toBeCloseTo(0.7, 2);
    await expect(page.getByRole('progressbar', { name: 'Uploading' })).toHaveCount(1);
    for (const name of ['aria-live', 'tabindex']) await expect(byId(page, 'moved'), name).not.toHaveAttribute(name);
    // Shown, a value change moves as PRG-6 says.
    await byId(page, 'moved').evaluate(async (el: any) => { el.value = 0.9; await el.updateComplete; });
    // (An engine names the transition by the physical property the logical one maps to.)
    expect((await state(page, 'moved')).running.some((name) => name.startsWith('transition '))).toBe(true);

    // Indeterminate: nothing runs to the delay's last millisecond, and the cycle begins as it is shown — in the task that
    // shows it, the motion is new, at 0 ms and no way into its cycle.
    await insert(page, 'bar');
    await insert(page, 'ring', { variant: 'circular' });
    for (const id of ['bar', 'ring']) await watchStart(page, id);
    await page.clock.runFor(delay - 1);
    for (const id of ['bar', 'ring']) expect(await state(page, id), id).toEqual(WAITING);
    await page.clock.runFor(1);
    for (const id of ['bar', 'ring']) expect(await exposure(page, id), id).toEqual(SHOWN(null));
    expect(await started(page, 'bar')).toEqual({ animations: [{ name: 'bar-cross', time: 0, progress: 0 }], transitions: [] });
    expect(await started(page, 'ring')).toEqual({ animations: [{ name: 'ring-turn', time: 0, progress: 0 }], transitions: [] });
    // The reduced-motion pulse likewise starts at the beginning of its cycle.
    await reduceMotion(page);
    await insert(page, 'pulsing');
    await watchStart(page, 'pulsing');
    await page.clock.runFor(delay - 1);
    expect(await state(page, 'pulsing')).toEqual(WAITING);
    await page.clock.runFor(1);
    expect(await started(page, 'pulsing')).toEqual({ animations: [{ name: 'pulse', time: 0, progress: 0 }], transitions: [] });
  });

  test('PRG-21: showDelay in milliseconds as given; null takes motion.show-delay, which follows the show-delay role; a negative, non-finite or empty value takes the token and is reported', async ({ page }) => {
    await blank(page);
    const seen = warnings(page);
    const delay = await resolveToken(page, SHOW_DELAY, 'duration');
    // The component's own token, which aliases the role the loading indicator's follows too.
    expect(delay).toBe(await resolveToken(page, '--tanrei-sys-motion-role-show-delay', 'duration'));

    // As given.
    await insert(page, 'longer', { 'show-delay': String(delay + 500), value: '0.4' });
    await page.clock.runFor(delay + 499);
    expect(await exposure(page, 'longer')).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    expect(await exposure(page, 'longer')).toEqual(SHOWN());
    await expect(byId(page, 'longer')).toHaveJSProperty('showDelay', delay + 500);

    // The token is read as it resolves: a system that sets it apart is followed, and the loading indicator's is not read.
    await rootTokens(page, { [SHOW_DELAY]: `${delay + 200}ms`, '--tanrei-comp-loading-indicator-motion-show-delay': '0ms' });
    await insert(page, 'system', { value: '0.4' });
    await page.clock.runFor(delay + 199);
    expect(await exposure(page, 'system')).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    expect(await exposure(page, 'system')).toEqual(SHOWN());
    await rootTokens(page, { [SHOW_DELAY]: '', '--tanrei-comp-loading-indicator-motion-show-delay': '' });

    // Null (the property's default, or set) takes the token.
    await page.evaluate(() => {
      const el = document.createElement('tanrei-progress-indicator') as any;
      Object.assign(el, { id: 'nulls', label: 'Uploading', value: 0.4, showDelay: null });
      document.querySelector('main')!.append(el);
    });
    // Values it cannot use take the token too.
    const invalid = { empty: { 'show-delay': '' }, negative: { 'show-delay': '-5' }, word: { 'show-delay': 'soon' }, nan: { 'show-delay': 'NaN' }, endless: { 'show-delay': 'Infinity' } };
    for (const [id, attributes] of Object.entries(invalid)) await insert(page, id, { ...attributes, value: '0.4' });
    const ids = ['nulls', ...Object.keys(invalid)];
    await page.clock.runFor(delay - 1);
    for (const id of ids) expect(await exposure(page, id), id).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    for (const id of ids) expect(await exposure(page, id), id).toEqual(SHOWN());
    const reports = seen.filter((w) => w.includes('PRG-21'));
    for (const value of ['showDelay ""', 'showDelay -5', 'showDelay "soon"', 'showDelay "NaN"', 'showDelay Infinity']) {
      expect(reports.some((w) => w.includes(`: ${value} is not`)), value).toBe(true);
    }
    expect(reports).toHaveLength(5);
  });

  test('PRG-22: the delay is a wait, not motion — kept under reduced motion, and counted while the indicator cannot be seen', async ({ page }) => {
    await blank(page);
    await reduceMotion(page);
    const delay = await resolveToken(page, SHOW_DELAY, 'duration');
    await insert(page, 'reduced', { value: '0.4' });
    await page.clock.runFor(delay - 1);
    expect(await state(page, 'reduced')).toEqual(WAITING);
    await page.clock.runFor(1);
    expect(await exposure(page, 'reduced')).toEqual(SHOWN());
    await reduceMotion(page, false);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div id="closed" hidden></div><div style="block-size: 300vh"></div><div id="far"></div>'));
    await insert(page, 'in-hidden', { value: '0.4' }, '#closed');
    await insert(page, 'off-screen', { value: '0.4' }, '#far');
    await insert(page, 'self-hidden', { value: '0.4' });
    await byId(page, 'self-hidden').evaluate((el) => ((el as HTMLElement).hidden = true));
    await page.clock.runFor(delay);
    for (const id of ['in-hidden', 'off-screen', 'self-hidden']) expect(await exposure(page, id), id).toEqual(SHOWN());
    // Seen again, it is simply there: no second wait.
    await page.evaluate(() => { document.getElementById('closed')!.hidden = false; document.getElementById('self-hidden')!.hidden = false; });
    for (const id of ['in-hidden', 'self-hidden']) expect((await state(page, id)).drawn, id).toEqual(['visible', 'visible', 'visible']);
  });

  test('PRG-23: removed during the delay it has exposed nothing; inserted again it waits the whole delay; hiding neither restarts nor pauses it; a change of showDelay mid-wait applies from the next insertion; a change of value mid-wait, to max included, neither ends nor restarts it', async ({ page }) => {
    await blank(page);
    const delay = await resolveToken(page, SHOW_DELAY, 'duration');

    // Removed before the delay ends: nothing was ever exposed, and nothing is later.
    await insert(page, 'brief', { value: '0.4' });
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
    expect(await exposure(page, 'brief')).toEqual(SHOWN());

    // Removed while shown, its cycle running: gone at once, nothing left running. Moved within the document, it waits again.
    await insert(page, 'gone', { 'show-delay': '0' });
    const left = await byId(page, 'gone').evaluate((el) => {
      const root = el.shadowRoot!;
      const before = root.getAnimations().map((a) => (a as CSSAnimation).animationName);
      el.remove();
      return { before, after: root.getAnimations().map((a) => a.playState) };
    });
    expect(left).toEqual({ before: ['bar-cross'], after: [] });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<section id="elsewhere"></section>'));
    await insert(page, 'mover', { value: '0.4' });
    await page.clock.runFor(delay);
    expect(await exposure(page, 'mover')).toEqual(SHOWN());
    await byId(page, 'mover').evaluate((el) => document.getElementById('elsewhere')!.append(el));
    expect(await state(page, 'mover')).toEqual(WAITING);
    await page.clock.runFor(delay);
    expect(await exposure(page, 'mover')).toEqual(SHOWN());

    // Hidden without being removed: the delay neither restarts nor pauses.
    await insert(page, 'hidden-mid', { value: '0.4' });
    await page.clock.runFor(delay / 2);
    await byId(page, 'hidden-mid').evaluate((el) => ((el as HTMLElement).hidden = true));
    await page.clock.runFor(delay / 4);
    await byId(page, 'hidden-mid').evaluate((el) => ((el as HTMLElement).hidden = false));
    await page.clock.runFor(delay / 4);
    expect(await exposure(page, 'hidden-mid')).toEqual(SHOWN());

    // showDelay changed mid-wait: the running delay finishes as it started; the new value applies from the next insertion.
    await insert(page, 'changed', { value: '0.4' });
    await page.clock.runFor(delay / 2);
    await byId(page, 'changed').evaluate((el: any) => { el.showDelay = 0; });
    expect(await state(page, 'changed')).toEqual(WAITING);
    await page.clock.runFor(delay / 2);
    expect(await exposure(page, 'changed')).toEqual(SHOWN());
    const next = await byId(page, 'changed').evaluate((el: any) => {
      el.remove();
      document.querySelector('main')!.append(el);
      return el.getAttribute('role');
    });
    expect(next).toBe('progressbar');

    // The value changed mid-wait — to max, the task done, and from indeterminate — and other props: it keeps waiting,
    // and is shown with the props it has when the delay ends.
    await insert(page, 'done', { value: '0.4' });
    await insert(page, 'measured');
    await page.clock.runFor(delay / 2);
    await byId(page, 'done').evaluate(async (el: any) => { el.value = 1; await el.updateComplete; });
    await byId(page, 'measured').evaluate(async (el: any) => { Object.assign(el, { value: 3, max: 10, variant: 'circular' }); await el.updateComplete; });
    for (const id of ['done', 'measured']) expect(await state(page, id), id).toEqual(WAITING);
    await page.clock.runFor(delay / 2 - 1);
    for (const id of ['done', 'measured']) expect(await exposure(page, id), id).toEqual(WAITING_EXPOSURE);
    await page.clock.runFor(1);
    expect(await exposure(page, 'done')).toEqual(SHOWN('1'));
    expect(await drawnShare(page, 'done')).toBeCloseTo(1, 2);
    expect(await exposure(page, 'measured')).toEqual(SHOWN('3'));
    await expect(byId(page, 'measured')).toHaveAttribute('aria-valuemax', '10');
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

  test('forced colors: the track and the indicator stay apart in system colors where the engine has the mode', async ({ page }) => {
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
    const [track, indicator] = [await css(part(page, 'linear-determinate', 'track'), 'background-color'), await css(part(page, 'linear-determinate', 'indicator'), 'background-color')];
    expect(track).not.toBe(indicator);
    expect(indicator).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('fixtures', () => {
  // PRG-7's verify: indeterminate fixtures are recorded with reduced motion requested, at the start of a cycle.
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true });
  });

  test('a fixture that names a surface is drawn on a stage of that color role; the others on the surface', async ({ page }) => {
    const named = spec.fixtures.filter((f) => (f as Fixture & { surface?: string }).surface);
    expect(named.map((f) => f.id)).toEqual(['linear-on-container-highest']);
    const stage = (id: string) => page.locator(`[data-fixture="${id}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await stage('linear-on-container-highest')).toBe(await resolveColor(page, '--tanrei-sys-color-surface-container-highest'));
    expect(await stage('linear-determinate')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expectBaseline(stage(page, f.id), [spec.name, `${f.id}.png`]);
    });
  }
});
