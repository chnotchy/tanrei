// <tanrei-progress-indicator>, driven by specs/progress-indicator.spec.json: every behaviour id (PRG-1…17) is cited by a
// test title, every fixture has a baseline, and every length, color, duration and easing is read back from the tokens —
// never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';

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

  test('PRG-7: under reduced motion a value change shows at once, and indeterminate pulses the whole indicator’s opacity once per cycle over a still track', async ({ page }) => {
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
    expect(await opacity(duration / 2)).toBeCloseTo(0, 5);
    expect(await opacity(duration * 0.75)).toBeGreaterThan(0);
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

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
