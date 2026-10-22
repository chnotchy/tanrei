// What a surface that appears (src/primitives/motion.ts: appearStyles + AppearController) draws in each frame, and
// what its entrance and its exit must draw: the claims every overlay that adopts the one appearance is held to, so
// that a menu, a tooltip, a dialog, a sheet and a snackbar prove them alike.
//
//   await mountFixtures(page, spec, { … });   // returns once the page counts itself painted: what opens now enters (MOT-4)
//   const seen = await sampleFrames(page, () => open(), { probe: appearProbe });
//   expectAppearStart(seen.frames[0], { opacity: 0, scale: 0.96 });      // or freezeFirstFrame(…).frame
//   expectNoFlicker(seen);
//   const gone = await sampleFrames(page, () => close(), { probe: appearProbe });
//   expectExitEnd(gone, { duration: 250, easing: [0.3, 0, 1, 1] });     // the accelerating exit's last frame
//
// The probe reads the surface's motion element — the first element carrying `data-tanrei-appear` (which the
// controller sets on it) in the root, through shadow roots — so a test names no part of a component's shadow root.
import { type Locator, type Page, expect } from '@playwright/test';
import type { Frame, Frames, Probe } from './frames.js';

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

/** What `turnHeld()` read: the surface held, and turned round. */
export interface Turn {
  /** Its opacity and its scale on each axis where its motion was held. */
  held: { opacity: number; sx: number; sy: number };
  /** The same, read in the task that turned it, before a frame has passed. */
  turned: { opacity: number; sx: number; sy: number };
  /** The properties of the appearance's transitions it carries once turned, sorted: one the turn left beside the one that replaced it is listed twice. */
  moving: string[];
  /** Those of them that were there before the turn — the motions it turned from, still there — as `listed` names them. */
  kept: string[];
  /** Every animation it carries once turned — property, pseudo-element, state, keyframes — for a failure message. */
  listed: string;
}

/**
 * A surface turned round carries the motions it turns to and none of those it turns from (MOT-2): no transition from
 * before the turn is left, and no property has two. `opacity` and `scale` are always among them: they draw something
 * under every appearance (the distance and the blur may be nothing, and then a transition of theirs moves nothing).
 */
export function expectTurnedAlone(turn: Turn): void {
  expect(turn.kept, turn.listed).toEqual([]);
  expect(turn.moving, turn.listed).toEqual([...new Set(turn.moving)]);
  expect(turn.moving, turn.listed).toEqual(expect.arrayContaining(['opacity', 'scale']));
}

/**
 * Turns the surface of `host` round where its motion is held (MOT-2): holds every transition of the appearance on its
 * motion element (the first element carrying `data-tanrei-appear` in its shadow root) at half its length, sets the
 * host's `open` to `to`, and reads in the same task, before a frame has passed. The transitions it carries then are
 * left paused. A turn is read where the motion is held, not where a clock has let it get to, so a slow machine reads
 * the same turn as a fast one.
 */
export const turnHeld = (host: Locator, to: boolean): Promise<Turn> =>
  host.evaluate(async (el, open) => {
    const find = (node: ParentNode): HTMLElement | null => {
      for (const child of Array.from(node.children)) {
        if (child.hasAttribute('data-tanrei-appear')) return child as HTMLElement;
        const inside = (child.shadowRoot && find(child.shadowRoot)) || find(child);
        if (inside) return inside;
      }
      return null;
    };
    const motion = (el.shadowRoot && find(el.shadowRoot)) || find(el);
    if (!motion) throw new Error(`no element with data-tanrei-appear in ${el.localName}`);
    const APPEAR = ['opacity', 'scale', 'translate', 'filter', 'transform'];
    const read = () => {
      const style = getComputedStyle(motion);
      const [sx = '1', sy = sx] = style.scale === 'none' ? [] : style.scale.split(' ');
      return { opacity: Number(style.opacity), sx: Number(sx), sy: Number(sy) };
    };
    const own = () => motion.getAnimations().filter((animation) => APPEAR.includes((animation as CSSTransition).transitionProperty));
    const describe = (animation: Animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const property = (animation as CSSTransition).transitionProperty ?? (animation as CSSAnimation).animationName ?? animation.id;
      const values = effect?.getKeyframes().map((keyframe) => String(keyframe[property] ?? '')) ?? [];
      return `${property} ${JSON.stringify(effect?.pseudoElement ?? null)} ${animation.playState} ${values.join(' → ')}`;
    };
    const before = own();
    for (const animation of before) {
      animation.pause();
      animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) / 2;
    }
    const held = read();
    Object.assign(el, { open });
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const turned = own();
    for (const animation of turned) animation.pause();
    return {
      held,
      turned: read(),
      moving: turned.map((animation) => (animation as CSSTransition).transitionProperty).sort(),
      kept: turned.filter((animation) => before.includes(animation)).map(describe),
      listed: motion.getAnimations().map(describe).join('; '),
    };
  }, to);
