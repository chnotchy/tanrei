// The reduced-motion pulse of the loading indicator's circle (LDG-4) and of what draws it — a busy Button's (BTN-36), a
// busy button with menu's leading half (SPB-39), the progress indicator's indeterminate form (PRG-7) — eases its
// opacity down to a floor and back, and is never drawn below that floor. A test that reads the animation alone would
// pass while the drawn circle vanished, so this samples one whole cycle and reads, at each sample, both the opacity
// the engine computes and the opacity the mark is painted at.
import { type Locator, type Page, expect } from '@playwright/test';
import { decodePng } from './png.js';

export interface PulseSample {
  /** The time into the cycle, in milliseconds. */
  at: number;
  /** The pulsing elements' lowest computed opacity there. */
  computed: number;
  /** The opacity the mark is painted at there, as a fraction of how far it stands from its ground at the cycle's start. */
  drawn: number;
}

/** The opacity a token resolves to, as the engine computes it. */
export function resolveOpacity(page: Page, name: string): Promise<number> {
  return page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.opacity = `var(${n})`;
    document.body.appendChild(probe);
    const value = Number(getComputedStyle(probe).opacity);
    probe.remove();
    return value;
  }, name);
}

/**
 * Samples the pulse of `pulsing` over one whole cycle of `duration` ms, at `steps + 1` evenly spaced times (the start
 * and the end included): the animations of every element it matches (a ring draws its circle twice) are paused at each
 * time, the lowest of their computed opacities is read, and `shot` is captured.
 * `mark` is a point on the mark's stroke, in CSS pixels from `shot`'s top-left corner, and `ground` what the mark is
 * drawn on: a point it does not cover, the same way, or — where the mark covers all of what it stands on (a bar over its
 * track) — that color as painted (`rgb(r, g, b)`, `paintedColor()`). The painted opacity is the mark pixel's distance from the ground pixel, on the channel where the two
 * stand furthest apart, as a fraction of that distance at the start of the cycle (where the pulse is at 1).
 */
export async function samplePulse(
  pulsing: Locator,
  shot: Locator,
  { duration, mark, ground, steps = 24 }: { duration: number; mark: readonly [number, number]; ground: readonly [number, number] | string; steps?: number },
): Promise<PulseSample[]> {
  const dpr = await shot.page().evaluate(() => devicePixelRatio);
  const px = (point: readonly [number, number]) => point.map((v) => Math.round(v * dpr)) as [number, number];
  const rgb = (value: string) => value.match(/\d+/g)!.map(Number);
  const raw: { at: number; computed: number; mark: number[]; ground: number[] }[] = [];
  for (let i = 0; i <= steps; i++) {
    const at = (duration * i) / steps;
    const computed = await pulsing.evaluateAll((els, t) => {
      for (const el of els) {
        for (const a of el.getAnimations()) {
          a.pause();
          a.currentTime = t;
        }
      }
      return Math.min(...els.map((el) => Number(getComputedStyle(el).opacity)));
    }, at);
    const pixels = decodePng(await shot.screenshot());
    raw.push({ at, computed, mark: rgb(pixels.at(...px(mark))), ground: rgb(typeof ground === 'string' ? ground : pixels.at(...px(ground))) });
  }
  const start = raw[0]!;
  const channel = [0, 1, 2].reduce((best, c) => (Math.abs(start.mark[c]! - start.ground[c]!) > Math.abs(start.mark[best]! - start.ground[best]!) ? c : best), 0);
  const span = start.mark[channel]! - start.ground[channel]!;
  expect(Math.abs(span), 'the mark is drawn apart from its ground at the start of the cycle').toBeGreaterThan(40);
  return raw.map(({ at, computed, mark: m, ground: g }) => ({ at, computed, drawn: (m[channel]! - g[channel]!) / span }));
}

/**
 * The pulse starts and ends at 1, comes down to `floor` at the middle of the cycle, and is never computed nor drawn
 * below it. The painted opacity is measured on 8-bit pixels, so it is allowed 0.03 either way.
 */
export function expectPulseKeepsFloor(samples: readonly PulseSample[], floor: number, what: string): void {
  expect(floor, `${what}: the floor is above 0`).toBeGreaterThan(0);
  const lowestComputed = Math.min(...samples.map((s) => s.computed));
  const lowestDrawn = Math.min(...samples.map((s) => s.drawn));
  const summary = samples.map((s) => `${Math.round(s.at)}ms ${s.computed.toFixed(3)}/${s.drawn.toFixed(3)}`).join(', ');
  expect(samples[0]!.computed, `${what}: at 1 at the start — ${summary}`).toBeCloseTo(1, 3);
  expect(samples.at(-1)!.computed, `${what}: at 1 at the end — ${summary}`).toBeCloseTo(1, 3);
  expect(lowestComputed, `${what}: computed never below the floor — ${summary}`).toBeGreaterThanOrEqual(floor - 1e-4);
  expect(lowestDrawn, `${what}: drawn never below the floor — ${summary}`).toBeGreaterThanOrEqual(floor - 0.03);
  const middle = samples[Math.floor(samples.length / 2)]!;
  expect(middle.computed, `${what}: at the floor at the middle of the cycle — ${summary}`).toBeCloseTo(floor, 3);
  expect(Math.abs(middle.drawn - floor), `${what}: drawn at the floor at the middle of the cycle — ${summary}`).toBeLessThanOrEqual(0.03);
}
