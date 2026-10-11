import { Animated, View, type ViewStyle } from 'react-native';
import { borderCurveOf } from '../theme/shape';

type AnimatedNumber = Animated.AnimatedInterpolation<number> | Animated.AnimatedAddition;

export interface RingProps {
  /**
   * `inside`: drawn on the host's edge, inside its bounds (an outline that never changes the box size).
   * `outside`: drawn around the host, its inner edge `gap` away from the host's edge (elevation ring,
   * focus indicator). A negative `gap` moves the ring inside the host.
   */
  placement: 'inside' | 'outside';
  width: number;
  /** A color string, or an interpolation while the host transitions between states. */
  color: string | Animated.AnimatedInterpolation<string>;
  /** Corner radius of the host. The ring grows it by its own distance from the edge. */
  radius: number | Animated.AnimatedInterpolation<number>;
  /**
   * Per-corner radii of a host whose corners differ (a modal drawer's end corners), logical: they replace `radius`, each
   * grown by the ring's distance from the edge as `radius` is. A corner may be animated (a split button's trailing half
   * while its menu opens); it is then grown with `Animated.add`, unclamped.
   */
  corners?: { topStart: number | AnimatedNumber; topEnd: number | AnimatedNumber; bottomStart: number | AnimatedNumber; bottomEnd: number | AnimatedNumber };
  /** Signed distance between the host's edge and the inner edge of an outside ring. */
  gap?: number;
  /** `system.shape.cornerSmoothing`: the ring follows the host's corner curve — the OS's continuous corner on iOS for any amount above 0; circular elsewhere. */
  cornerSmoothing?: number;
  testID?: string;
}

/**
 * A non-interactive, absolutely positioned ring. The host must be a positioned view
 * (every React Native view is) without `overflow: 'hidden'`, and must not use a real border,
 * so that the ring's insets are measured from the host's outer edge.
 */
export function Ring({ placement, width, color, radius, corners, gap = 0, cornerSmoothing = 0, testID }: RingProps) {
  const reach = placement === 'outside' ? gap + width : 0;
  const inset = reach === 0 ? 0 : -reach;
  if (corners) {
    const grow = (value: number | AnimatedNumber) => (typeof value !== 'number' ? (reach === 0 ? value : Animated.add(value, reach)) : value > 0 ? Math.max(0, value + reach) : 0);
    const frame: Animated.WithAnimatedValue<ViewStyle> = {
      position: 'absolute',
      top: inset,
      right: inset,
      bottom: inset,
      left: inset,
      borderWidth: width,
      pointerEvents: 'none',
      borderTopStartRadius: grow(corners.topStart),
      borderTopEndRadius: grow(corners.topEnd),
      borderBottomStartRadius: grow(corners.bottomStart),
      borderBottomEndRadius: grow(corners.bottomEnd),
      ...borderCurveOf(cornerSmoothing),
    };
    return <Animated.View testID={testID} style={{ ...frame, borderColor: color }} accessible={false} importantForAccessibility="no" />;
  }
  const animated = typeof color !== 'string' || typeof radius !== 'number';
  const borderRadius: number | AnimatedNumber = typeof radius === 'number' ? Math.max(0, radius + reach) : reach === 0 ? radius : Animated.add(radius, reach);
  const frame: ViewStyle = { position: 'absolute', top: inset, right: inset, bottom: inset, left: inset, borderWidth: width, pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
  if (animated) {
    return <Animated.View testID={testID} style={{ ...frame, borderColor: color, borderRadius }} accessible={false} importantForAccessibility="no" />;
  }
  return <View testID={testID} style={{ ...frame, borderColor: color, borderRadius: borderRadius as number }} accessible={false} importantForAccessibility="no" />;
}
