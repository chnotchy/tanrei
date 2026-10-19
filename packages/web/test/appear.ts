// What a surface that appears (src/primitives/motion.ts: appearStyles + AppearController) draws in each frame, and
// what its entrance and its exit must draw: the claims every overlay that adopts the one appearance is held to, so
// that a menu, a tooltip, a dialog, a sheet and a snackbar prove them alike.
//
//   await mountFixtures(page, spec, { … }); await documentPainted(page);   // or no entrance is played (MOT-4)
//   const seen = await sampleFrames(page, () => open(), { probe: appearProbe });
//   expectAppearStart(seen.frames[0], { opacity: 0, scale: 0.96 });      // or freezeFirstFrame(…).frame
//   expectNoFlicker(seen);
//   const gone = await sampleFrames(page, () => close(), { probe: appearProbe });
//   expectExitEnd(gone, { duration: 250, easing: [0.3, 0, 1, 1] });     // the accelerating exit's last frame
//
// The probe reads the surface's motion element — the first element carrying `data-tanrei-appear` (which the
// controller sets on it) in the root, through shadow roots — so a test names no part of a component's shadow root.
import { type Page, expect } from '@playwright/test';
import type { Frame, Frames, Probe } from './frames.js';

/**
 * Resolves once the document has been painted as a surface that appears counts it (`documentPainted()`,
 * src/primitives/motion.ts): from the second frame callback after the bundle ran. A surface told to open before then
 * appears at once, without its entrance (MOT-4), so a test that opens one right after mounting reads a first frame
 * already at rest wherever the page's first frames come late: WebKit draws the second frame of a document just written
 * about 90 ms after its first even on an idle Mac, and a combobox test that mounted, focused and pressed a key at once
 * pressed it only some 70 ms after that frame. The two frames asked for here come no earlier than the bundle's own two,
 * which it asked for while the page was mounted. Wait before holding the page clock: a held clock holds
 * `requestAnimationFrame` too.
 */
export const documentPainted = (page: Page): Promise<void> =>
  page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/**
 * The motion element of the first surface in `root` (through shadow roots): its opacity, its scale on each axis, its
 * translation, its blur and its transform origin; `{}` where there is none. Self-contained: it is sent as its source.
 */
export const appearProbe: Probe = (root) => {
  const find = (node: ParentNode): Element | null => {
    for (const child of Array.from(node.children)) {
      if (child.hasAttribute('data-tanrei-appear')) return child;
      const inside = (child.shadowRoot && find(child.shadowRoot)) || find(child);
      if (inside) return inside;
    }
    return null;
  };
  const start = root.hasAttribute('data-tanrei-appear') ? root : (root.shadowRoot && find(root.shadowRoot)) || find(root);
  if (!start) return {};
  const style = getComputedStyle(start);
  const [sx = '1', sy = sx] = style.scale === 'none' ? [] : style.scale.split(' ');
  const [tx = '0px', ty = '0px'] = style.translate === 'none' ? [] : style.translate.split(' ');
  const blur = /blur\(([^)]+)\)/.exec(style.filter)?.[1] ?? '0px';
  return { opacity: Number(style.opacity), sx: Number(sx), sy: Number(sy), tx: Number.parseFloat(tx), ty: Number.parseFloat(ty), blur: Number.parseFloat(blur), origin: style.transformOrigin };
};

/** The surface in a frame as the probe read it. */
const surface = (frame: Frame) => {
  const { opacity, sx, sy } = frame.probe;
  if (typeof opacity !== 'number') throw new Error(`no surface (no element with data-tanrei-appear) in frame ${frame.index}: ${JSON.stringify(frame.probe)}`);
  return { opacity, sx: sx as number, sy: sy as number };
};

/**
 * The first frame of an entrance is where the appearance starts it: `opacity`, and `scale` on both axes — or, under
 * `unfold`, along `axis` only (the other whole).
 */
export function expectAppearStart(frame: Frame, { opacity, scale, axis }: { opacity: number; scale: number; axis?: 'x' | 'y' }): void {
  const { opacity: o, sx, sy } = surface(frame);
  expect({ opacity: o, sx, sy }, 'the first frame of the entrance is where the appearance starts it').toEqual({
    opacity,
    sx: axis === 'y' ? 1 : scale,
    sy: axis === 'x' ? 1 : scale,
  });
}

/** A curve token as the engine serializes it in `transition-timing-function` (`cubic-bezier(0.3, 0, 1, 1)`). */
export const resolveEasing = (page: Page, name: string): Promise<string> =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `transition-timing-function: var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).transitionTimingFunction;
    probe.remove();
    return value;
  }, name);

/** The four numbers of a serialized `cubic-bezier()` (`ease`, `linear` and the rest as theirs). */
export function bezierOf(easing: string): [number, number, number, number] {
  const named: Record<string, [number, number, number, number]> = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
  const numbers = /^cubic-bezier\(([^)]+)\)$/.exec(easing.trim())?.[1]!.split(',').map(Number);
  const curve = numbers?.length === 4 ? (numbers as [number, number, number, number]) : named[easing.trim()];
  if (!curve) throw new Error(`not a cubic Bézier curve: ${easing}`);
  return curve;
}

/** `y` of a CSS `cubic-bezier(x1, y1, x2, y2)` at `x`. */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number], x: number): number {
  const at = (a: number, b: number, t: number) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

/**
 * The share of an exit's change still to go on the last frame drawn before it ends: the frame `step` ms apart that
 * comes last before `duration`, on `easing`. An accelerating exit leaves a little there (standard-accelerate: 9.3 %
 * at 250 ms) — the one jump MOT-2 allows, at the very end; a decelerating one leaves almost nothing.
 */
export function lastFrameLeft(duration: number, easing: readonly [number, number, number, number], step = 1000 / 60): number {
  // (Less a hair: a duration of a whole number of frames, 250 ms, is not read one frame longer.)
  const last = Math.ceil(duration / step - 1 - 1e-9) * step;
  return 1 - cubicBezier(easing, last / duration);
}

/**
 * The exit fades the surface out to nothing, and on its last frame drawn before it ends leaves no more of its
 * opacity than `easing` over `duration` does (`lastFrameLeft`, plus `tolerance`): it is not cut short.
 */
export function expectExitEnd(seen: Frames, { duration, easing, tolerance = 0.01 }: { duration: number; easing: readonly [number, number, number, number]; tolerance?: number }): void {
  const opacities = [...seen.frames, seen.rest].map((frame) => frame.probe.opacity).filter((value): value is number => typeof value === 'number');
  expect(opacities.at(-1), 'the exit ends at nothing').toBe(0);
  const lastDrawn = opacities.filter((value) => value > 0).at(-1) ?? 0;
  const bound = lastFrameLeft(duration, easing) * (opacities[0] ?? 1);
  expect(lastDrawn, `the last frame of the exit leaves ${lastDrawn} of the opacity: at most ${bound.toFixed(3)} (+${tolerance}) for ${duration} ms on cubic-bezier(${easing.join(', ')})`).toBeLessThanOrEqual(bound + tolerance);
}
