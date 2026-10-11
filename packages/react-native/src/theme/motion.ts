import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing, type EasingFunction } from 'react-native';
import type { TanreiCubicBezier } from '../generated/vocabulary';

/** Easing token (cubic-bezier control points) → `Animated` easing function. */
export function toEasing(bezier: TanreiCubicBezier): EasingFunction {
  return Easing.bezier(bezier[0], bezier[1], bezier[2], bezier[3]);
}

/** Tracks the system "reduce motion" setting. */
export function useReduceMotion(): boolean {
  return useReduceMotionSetting() ?? false;
}

/**
 * The system "reduce motion" setting, or `null` until the platform has answered (the query is asynchronous). A looping
 * animation waits for the answer, so that a person who asked for less motion never sees it start. Package-internal.
 */
export function useReduceMotionSetting(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => mounted && setReduce(value),
      () => undefined,
    );
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);
  return reduce;
}
