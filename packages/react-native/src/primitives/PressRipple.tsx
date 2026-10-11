import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import type { TanreiCubicBezier } from '../generated/vocabulary';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import type { VisualSize } from './minimumTarget';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

export interface RipplePoint {
  x: number;
  y: number;
}

/** The radius a circle around `origin` needs to cover a `size` box: the distance to the farthest corner. */
export function rippleRadius(origin: RipplePoint, size: VisualSize): number {
  return Math.hypot(Math.max(origin.x, size.width - origin.x), Math.max(origin.y, size.height - origin.y));
}

/** A point of contact, kept inside the box; no point (keyboard or assistive activation) means the center. */
export function rippleOrigin(point: RipplePoint | null, size: VisualSize): RipplePoint {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return { x: size.width / 2, y: size.height / 2 };
  return { x: Math.min(size.width, Math.max(0, point.x)), y: Math.min(size.height, Math.max(0, point.y)) };
}

interface ActiveRipple {
  origin: RipplePoint;
  size: VisualSize;
  progress: Animated.Value;
  opacity: Animated.Value;
}

export interface PressRippleOptions {
  /** `system.behavior.pressedFeedback === 'ripple'`. When false the hook does nothing and `ripple` stays null. */
  enabled: boolean;
  /** The held pressed flag (`usePressHold().pressed`): the ripple fades when it turns off. */
  pressed: boolean;
  /** How long the layer takes to grow: the component's feedback duration (`comp.button.motion.feedback-duration`) — one rule on every platform. */
  growDuration: number;
  /** How long it takes to fade once the press is over: the component's state duration. */
  fadeDuration: number;
  /** The component's state easing: the curve the container color moves with. */
  easing: TanreiCubicBezier;
}

export interface PressRippleState {
  /** Non-null while a ripple is on screen: pass it to `<PressRipple>`. Null at rest — no node is rendered. */
  ripple: ActiveRipple | null;
  /** True when a press must be drawn as a growing ripple (enabled, and motion is allowed). */
  draws: boolean;
  /** Start a ripple at a point of contact in the host's coordinates (null = center) in a host of `size`. */
  start: (point: RipplePoint | null, size: VisualSize) => void;
}

/**
 * A token-driven ripple in JavaScript, the same on iOS and Android (`android_ripple` exists on Android only, takes
 * no duration or easing, and does not follow a continuous or animated shape). With reduce-motion on nothing grows:
 * `draws` is false and the component shows the pressed state at once, as `overlay` does.
 */
export function usePressRipple({ enabled, pressed, growDuration, fadeDuration, easing }: PressRippleOptions): PressRippleState {
  const reduce = useReduceMotion();
  const draws = enabled && !reduce;
  const [ripple, setRipple] = useState<ActiveRipple | null>(null);
  // Made on first use: a system that does not ripple never builds the curve.
  const curve = useMemo(() => (draws ? toEasing(easing) : undefined), [draws, easing]);
  const current = useRef<ActiveRipple | null>(null);

  const start = useCallback(
    (point: RipplePoint | null, size: VisualSize) => {
      if (!draws || !curve || size.width <= 0 || size.height <= 0) return;
      const next: ActiveRipple = { origin: rippleOrigin(point, size), size, progress: new Animated.Value(0), opacity: new Animated.Value(1) };
      current.current = next;
      setRipple(next);
      Animated.timing(next.progress, { toValue: 1, duration: growDuration, easing: curve, useNativeDriver: true }).start();
    },
    [draws, growDuration, curve],
  );

  // The press (held at least `press-hold`) is over: the layer fades, then its node goes away.
  useEffect(() => {
    if (pressed || !ripple || !curve) return undefined;
    const fade = Animated.timing(ripple.opacity, { toValue: 0, duration: fadeDuration, easing: curve, useNativeDriver: true });
    fade.start(({ finished }) => {
      if (finished && current.current === ripple) {
        current.current = null;
        setRipple(null);
      }
    });
    return () => fade.stop();
  }, [pressed, ripple, fadeDuration, curve]);

  // Reduce-motion turned on, or the system changed, while a ripple was on screen.
  useEffect(() => {
    if (!draws && current.current) {
      current.current = null;
      setRipple(null);
    }
  }, [draws]);

  return { ripple: draws ? ripple : null, draws, start };
}

export interface PressRippleProps {
  ripple: ActiveRipple;
  /** The pressed container color of the tokens: inside the circle the container looks exactly as `overlay` draws it. */
  color: string;
  /** Corner radius and corner smoothing of the host (`system.shape.cornerSmoothing`): the ripple is clipped to the container shape. */
  radius: number | Animated.AnimatedInterpolation<number>;
  /** Per-corner radii of a host whose corners differ (a segmented button's end segments), logical: they replace `radius`. */
  corners?: { topStart: Moving<number>; topEnd: Moving<number>; bottomStart: Moving<number>; bottomEnd: Moving<number> };
  cornerSmoothing?: number;
  testID?: string;
}

/** The pressed state layer as a circle that grows from the point of contact, clipped to the host's shape. Below the content. */
export function PressRipple({ ripple, color, radius, corners, cornerSmoothing = 0, testID }: PressRippleProps) {
  const reach = rippleRadius(ripple.origin, ripple.size);
  const clip: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
  const circle: ViewStyle = { position: 'absolute', left: ripple.origin.x - reach, top: ripple.origin.y - reach, width: reach * 2, height: reach * 2, borderRadius: reach, backgroundColor: color };
  return (
    <Animated.View
      testID={testID}
      style={[clip, corners ? { borderTopStartRadius: corners.topStart, borderTopEndRadius: corners.topEnd, borderBottomStartRadius: corners.bottomStart, borderBottomEndRadius: corners.bottomEnd } : { borderRadius: radius }]}
      accessible={false}
      importantForAccessibility="no"
    >
      <Animated.View testID={testID ? `${testID}.wave` : undefined} style={[circle, { opacity: ripple.opacity, transform: [{ scale: ripple.progress }] }]} />
    </Animated.View>
  );
}
