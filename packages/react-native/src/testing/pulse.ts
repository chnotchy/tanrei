// The reduced-motion pulse of the loading indicator (LDG-4) and of the progress indicator's indeterminate form (PRG-7)
// eases the opacity from 1 down to a floor and back, and never below it. The pulse is two native-driven timings, which
// Jest does not run; this replays them as the driver would — each half from where the last one left the value, on its
// own easing — over a whole cycle, and checks every sampled opacity.
import type { Animated } from 'react-native';

/** Replays the halves of a pulse that starts at 1 and checks it never falls below `floor`, reaching it half way. */
export function expectPulseKeepsFloor(halves: readonly Animated.TimingAnimationConfig[], floor: number, steps = 100): void {
  let from = 1;
  const seen: number[] = [];
  for (const half of halves) {
    const to = half.toValue as number;
    const ease = half.easing ?? ((t: number) => t);
    for (let i = 0; i <= steps; i++) seen.push(from + (to - from) * ease(i / steps));
    from = to;
  }
  expect(seen[0]).toBe(1);
  expect(seen.at(-1)).toBeCloseTo(1, 10);
  expect(Math.min(...seen)).toBeGreaterThanOrEqual(floor - 1e-9);
  expect(seen[steps]).toBeCloseTo(floor, 10);
}
