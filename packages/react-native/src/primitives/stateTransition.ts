import { useEffect, useMemo, useState } from 'react';
import { Animated } from 'react-native';
import type { TanreiColor, TanreiCubicBezier } from '../generated/vocabulary';
import { toEasing, useReduceMotion } from '../theme/motion';
import { formatColor, mixColors } from '../theme/paint';

type Animatable = TanreiColor | number;
export type StateVisuals = Readonly<Record<string, Animatable>>;

/** A plain value when settled or immediate; an interpolation while a transition runs. */
export type Transitioned<V extends StateVisuals> = {
  [K in keyof V]: V[K] extends number ? number | Animated.AnimatedInterpolation<number> : string | Animated.AnimatedInterpolation<string>;
};

export interface StateTransitionOptions {
  /** Component motion tokens, e.g. `button.motionStateDuration` / `button.motionStateEasing`. */
  duration: number;
  easing: TanreiCubicBezier;
  /** Apply the target in the same frame (press feedback). Reduce-motion always does. */
  immediate?: boolean;
}

interface Span<V> {
  from: V;
  to: V;
  key: string;
  progress: Animated.Value;
  /** Last known value of `progress`; read when a new target interrupts this span. */
  position: { current: number };
}

const isColor = (value: Animatable): value is TanreiColor => typeof value !== 'number';

function blend<V extends StateVisuals>(from: V, to: V, t: number): V {
  if (t >= 1) return to;
  const out: Record<string, Animatable> = {};
  for (const key of Object.keys(to)) {
    const a = from[key] ?? to[key]!;
    const b = to[key]!;
    out[key] = isColor(a) && isColor(b) ? mixColors(a, b, t) : (a as number) + ((b as number) - (a as number)) * t;
  }
  return out as V;
}

/** `Animated` interpolates channels without premultiplying, so "nothing" borrows the other end's channels. */
function colorRange(from: TanreiColor, to: TanreiColor): [string, string] {
  const start = from.a === 0 ? { ...to, a: 0 } : from;
  const end = to.a === 0 ? { ...from, a: 0 } : to;
  return [formatColor(start), formatColor(end)];
}

/**
 * Moves a component's drawn values to `target` — the values of the state it is in now — with the
 * component's motion tokens. It never decides how a state looks: `target` comes from that state's tokens.
 * Press feedback (`immediate`) and reduce-motion land in the same frame. An interrupted transition
 * continues from the values currently on screen.
 */
export function useStateTransition<V extends StateVisuals>(target: V, { duration, easing, immediate = false }: StateTransitionOptions): Transitioned<V> {
  const instant = useReduceMotion() || immediate;
  const key = JSON.stringify(target);
  const [span, setSpan] = useState<Span<V>>(() => ({ from: target, to: target, key, progress: new Animated.Value(1), position: { current: 1 } }));
  const curve = useMemo(() => toEasing(easing), [easing]);
  // Bumped when a transition arrives, so that the settled (plain) values replace the interpolations in the tree.
  const [arrived, setArrived] = useState(0);

  let current = span;
  if (span.key !== key) {
    // Derived state: the target changed, so a new span starts from what is on screen.
    const start = instant ? 1 : 0;
    current = { from: blend(span.from, span.to, span.position.current), to: target, key, progress: new Animated.Value(start), position: { current: start } };
    setSpan(current);
  }

  useEffect(() => {
    if (instant) {
      span.progress.stopAnimation();
      span.progress.setValue(1);
      span.position.current = 1;
      return undefined;
    }
    if (span.position.current >= 1) return undefined;
    const listener = span.progress.addListener(({ value }) => {
      span.position.current = value;
    });
    // Colors cannot use the native driver.
    const animation = Animated.timing(span.progress, { toValue: 1, duration, easing: curve, useNativeDriver: false });
    animation.start(({ finished }) => {
      if (!finished) return;
      span.position.current = 1;
      setArrived((count) => count + 1);
    });
    return () => {
      animation.stop();
      span.progress.removeListener(listener);
    };
  }, [span, instant, duration, curve]);

  return useMemo(() => {
    const settled = instant || current.position.current >= 1;
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(current.to)) {
      const to = current.to[name]!;
      const from = current.from[name] ?? to;
      if (settled) out[name] = isColor(to) ? formatColor(to) : to;
      else if (isColor(to) && isColor(from)) out[name] = current.progress.interpolate({ inputRange: [0, 1], outputRange: colorRange(from, to) });
      else out[name] = current.progress.interpolate({ inputRange: [0, 1], outputRange: [from as number, to as number] });
    }
    return out as Transitioned<V>;
    // `arrived` is a dependency on purpose: the span object is the same, its position is not.
  }, [current, instant, arrived]);
}
