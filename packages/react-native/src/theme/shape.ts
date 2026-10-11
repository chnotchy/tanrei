import { Platform, type ViewStyle } from 'react-native';

/**
 * `system.shape.cornerSmoothing` (0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous
 * corner, 1 the most eased) → the `borderCurve` a view sets. React Native has only the OS's curve, and only on iOS:
 * the amount rounds to it — `continuous` for any amount above 0. At 0 nothing is set (the default, a circular arc),
 * so a system that smooths nothing adds nothing to the render tree. Android has no `borderCurve` and stays circular.
 */
export function borderCurveOf(cornerSmoothing: number): { borderCurve: NonNullable<ViewStyle['borderCurve']> } | null {
  return cornerSmoothing > 0 && Platform.OS === 'ios' ? { borderCurve: 'continuous' } : null;
}
