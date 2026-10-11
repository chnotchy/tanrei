import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, type AccessibilityValue, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiProgressIndicatorSize } from '../generated/vocabulary';
import { Arc, tidy, type Angle } from '../primitives/Arc';
import { partTestID } from '../primitives/content';
import { useLoop } from '../primitives/loop';
import { useStateTransition } from '../primitives/stateTransition';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotionSetting } from '../theme/motion';
import { useTanrei } from '../theme/TanreiProvider';

/** Linear: a bar that fills the width its layout gives it. Circular: a ring of a fixed size. Drawn by code, not a token axis. */
export type ProgressIndicatorVariant = 'linear' | 'circular';
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type ProgressIndicatorSize = TanreiProgressIndicatorSize;

const VARIANTS: readonly ProgressIndicatorVariant[] = ['linear', 'circular'];

/** PRG-2: the moving segment of an indeterminate bar is two fifths of the track long. */
const SEGMENT = 0.4;
/** PRG-2: the moving arc of an indeterminate ring is a quarter of the circle. */
const QUARTER = 90;

export interface ProgressIndicatorProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `linear` (default) or `circular`. Unknown values render as `linear` (PRG-12). */
  variant?: ProgressIndicatorVariant;
  /** The bar's thickness or the ring's box. Unknown values render as `medium` (PRG-12). */
  size?: ProgressIndicatorSize;
  /** How far the task has come, between `min` and `max`. `null` / `undefined` is indeterminate. */
  value?: number | null;
  /** The value at which nothing is done. Default 0. */
  min?: number;
  /** The value at which the task is done. Default 1. */
  max?: number;
  /** The accessible name (the spec's `label`): what is in progress. Required; without it development builds warn (PRG-15). */
  accessibilityLabel?: string;
  /** How assistive technology reads the value when a percentage is not the natural reading (`"3 of 10 files"`). */
  valueText?: string;
  /** Layout overrides (margins, `alignSelf`, a width for a bar). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

/** What a determinate indicator draws and exposes, after PRG-11's corrections. */
export interface ProgressReading {
  /** The fraction drawn, 0–1; 0 when the range is empty. */
  fraction: number;
  /** What assistive technology is told. */
  value: { min: number; max: number; now: number };
  /** What development builds report. */
  problems: string[];
}

/** PRG-1 / PRG-11: the fraction and the exposed value of a determinate indicator. Pure. */
export function progressReading(value: number, min: number, max: number): ProgressReading {
  if (!(max > min)) return { fraction: 0, value: { min: 0, max: 1, now: 0 }, problems: [`max ${max} is not greater than min ${min}; drawing the track only and exposing 0 of 0–1`] };
  const problems: string[] = [];
  let now = value;
  if (value < min) {
    now = min;
    problems.push(`value ${value} is below min ${min}; using ${min}`);
  } else if (value > max) {
    now = max;
    problems.push(`value ${value} is above max ${max}; using ${max}`);
  }
  return { fraction: (now - min) / (max - min), value: { min, max, now }, problems };
}

const percent = (fraction: number) => `${tidy(fraction * 100)}%`;
type Moving = number | Animated.AnimatedInterpolation<number>;
/** A fraction as a width: a plain percentage when settled, an interpolation while it moves. */
const widthOf = (fraction: Moving): ViewStyle['width'] =>
  (typeof fraction === 'number' ? percent(fraction) : fraction.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })) as ViewStyle['width'];
/** `fraction × scale + shift` in degrees. */
const degreesOf = (fraction: Moving, scale: number, shift = 0): Angle =>
  typeof fraction === 'number' ? tidy(fraction * scale + shift) : fraction.interpolate({ inputRange: [0, 1], outputRange: [shift, scale + shift] });

/**
 * Tanrei ProgressIndicator — spec: `specs/progress-indicator.spec.json`.
 * Anatomy: track + indicator (+ stop indicator, a bar's). A bar stretches across its layout at the size's
 * `linearThickness`; a ring fills a `circularSize` square with a `circularThickness` stroke. Exposed as a progressbar
 * with `accessibilityValue` when determinate, busy when not; never focusable.
 */
export function ProgressIndicator({ variant = 'linear', size = 'medium', value = null, min = 0, max = 1, accessibilityLabel, valueText = '', style, testID, ...rest }: ProgressIndicatorProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.progressIndicator;
  // PRG-12: size is an open key; variant is closed. Unknown values draw the defaults, reported in development builds.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'ProgressIndicator size');
  const form = closedValue(VARIANTS, variant, 'linear', 'ProgressIndicator variant');
  const determinate = typeof value === 'number';
  const reading = determinate ? progressReading(value, min, max) : null;
  // Null until the platform has answered: no loop starts before then (PRG-7 — a person who asked for less motion never
  // sees it start); the still form of the motion is drawn meanwhile.
  const motionSetting = useReduceMotionSetting();
  const reduceMotion = motionSetting === true;

  // PRG-11 / PRG-15: development builds report corrected values and a missing name.
  const problems = reading?.problems.join('; ') ?? '';
  const unnamed = !accessibilityLabel?.trim() && !rest['aria-label']?.trim();
  useEffect(() => {
    if (!__DEV__) return;
    const where = testID ? ` (testID "${testID}")` : '';
    if (problems) console.warn(`Tanrei: a ProgressIndicator${where}: ${problems}.`);
    if (unnamed) console.warn(`Tanrei: a ProgressIndicator${where} has no accessibilityLabel. Say what is in progress ("Uploading report.pdf").`);
  }, [problems, unnamed, testID]);

  // PRG-6: a value change eases with the value motion tokens; reduced motion (PRG-7) and a switch between determinate
  // and indeterminate take effect at once.
  const wasDeterminate = useRef(determinate);
  const switched = wasDeterminate.current !== determinate;
  useEffect(() => {
    wasDeterminate.current = determinate;
  });
  const { fraction } = useStateTransition(
    { fraction: reading?.fraction ?? 0 },
    { duration: tokens.motionValueDuration, easing: tokens.motionValueEasing, immediate: switched || !determinate },
  ) as { fraction: Moving };

  // PRG-2 / PRG-7 / PRG-14: one loop while indeterminate — a moving segment or a turning arc, or, under reduced motion,
  // an opacity pulse — that runs only while the app is in the foreground. Determinate: no loop.
  const cycle = tokens.motionCycleDuration;
  const loop = determinate || motionSetting === null ? null : reduceMotion ? `pulse:${cycle}:${tokens.motionCycleEasing}` : `${form}:${cycle}:${tokens.motionCycleEasing}`;
  const progress = useLoop(loop, (at) => {
    if (reduceMotion) {
      // PRG-7: from 1 to 0 and back to 1 once per cycle, with the cycle easing.
      const half = { duration: cycle / 2, easing: toEasing(tokens.motionCycleEasing), useNativeDriver: true };
      return Animated.sequence([Animated.timing(at, { ...half, toValue: 0 }), Animated.timing(at, { ...half, toValue: 1 })]);
    }
    // PRG-2: a bar's segment eases across with the cycle easing (a layout value: JavaScript-driven); a ring turns at
    // constant speed (a transform: the native driver).
    return form === 'linear'
      ? Animated.timing(at, { toValue: 1, duration: cycle, easing: toEasing(tokens.motionCycleEasing), useNativeDriver: false })
      : Animated.timing(at, { toValue: 1, duration: cycle, easing: toEasing(theme.system.motion.easing.linear), useNativeDriver: true });
  }, reduceMotion ? 1 : 0);

  const trackColor = theme.resolve(tokens.trackColor).a === 0 ? undefined : theme.paint(tokens.trackColor);
  const indicatorColor = theme.resolve(tokens.indicatorColor).a === 0 ? undefined : theme.paint(tokens.indicatorColor);
  const part = (name: string) => partTestID(testID, name);
  // PRG-5: the gap only while the value lies strictly between the ends.
  const between = reading !== null && reading.fraction > 0 && reading.fraction < 1;
  const gap = between ? tokens.trackGap : 0;

  let drawing: ReactNode;
  let box: ViewStyle;
  if (form === 'linear') {
    const thickness = dimensions.linearThickness;
    // PRG-4: the ends are rounded by track.shape, clamped to half the thickness.
    const radius = Math.min(tokens.trackShape, thickness / 2);
    // PRG-3 / PRG-13: across the full inline size its layout gives it, filled from the logical start.
    box = { alignSelf: 'stretch', height: thickness, flexDirection: 'row' };
    if (reading) {
      const stop = tokens.stopIndicatorSize;
      const inset = (thickness - stop) / 2;
      drawing = (
        <>
          {/* Without a gap the track runs the whole length under the indicator; with one it is the rest after the gap. */}
          {gap > 0 ? null : <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, borderRadius: radius, backgroundColor: trackColor }} testID={part('track')} />}
          <Animated.View style={{ width: widthOf(fraction), borderRadius: radius, backgroundColor: indicatorColor }} testID={part('indicator')} />
          {gap > 0 ? <View style={{ flex: 1, marginStart: gap, borderRadius: radius, backgroundColor: trackColor }} testID={part('track')} /> : null}
          {/* PRG-5: the stop indicator, centered in the thickness with its center half the thickness before the track's
              end (concentric with the rounded end); a size of 0 draws none. */}
          {stop > 0 ? <View style={{ position: 'absolute', top: inset, end: inset, width: stop, height: stop, borderRadius: Math.min(tokens.trackShape, stop / 2), backgroundColor: indicatorColor }} testID={part('stop-indicator')} /> : null}
        </>
      );
    } else {
      // PRG-2: a segment two fifths long from beyond the start to beyond the end; PRG-7: the whole track, pulsing.
      const moving: ViewStyle = reduceMotion
        ? { start: 0, end: 0, opacity: progress as unknown as number }
        : { width: percent(SEGMENT), start: progress.interpolate({ inputRange: [0, 1], outputRange: [`-${percent(SEGMENT)}`, '100%'] }) as unknown as number };
      box = { ...box, overflow: 'hidden', borderRadius: radius };
      drawing = (
        <>
          <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, borderRadius: radius, backgroundColor: trackColor }} testID={part('track')} />
          <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: radius, backgroundColor: indicatorColor, ...moving }} testID={part('indicator')} />
        </>
      );
    }
  } else {
    const { circularSize: ring, circularThickness: stroke } = dimensions;
    // PRG-4: round caps unless the track's shape is none.
    const caps = tokens.trackShape > 0;
    box = { alignSelf: 'flex-start', width: ring, height: ring };
    if (reading) {
      // PRG-5: on a ring the gap is at BOTH ends of the indicator's arc. It is empty space along the center line; round
      // caps reach half a stroke past each end, so the track is shortened by that too.
      const centerline = (ring - stroke) / 2;
      const gapDegrees = gap > 0 ? ((gap + (caps ? stroke : 0)) / centerline) * (180 / Math.PI) : 0;
      drawing = (
        <>
          {gap > 0 ? (
            <Arc size={ring} thickness={stroke} color={trackColor} from={degreesOf(fraction, 360, gapDegrees)} sweep={degreesOf(fraction, -360, 360 - 2 * gapDegrees)} roundCaps={caps} testID={part('track')} />
          ) : (
            <Arc size={ring} thickness={stroke} color={trackColor} from={0} sweep={360} testID={part('track')} />
          )}
          {/* PRG-1: from the top, clockwise. */}
          <Arc size={ring} thickness={stroke} color={indicatorColor} from={0} sweep={degreesOf(fraction, 360)} roundCaps={caps} testID={part('indicator')} />
        </>
      );
    } else {
      // PRG-2: a quarter arc turning clockwise at constant speed; PRG-7: the whole circle, pulsing. The ring is never mirrored.
      const motion: ViewStyle = reduceMotion ? { opacity: progress as unknown as number } : { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) as unknown as string }] };
      drawing = (
        <>
          <Arc size={ring} thickness={stroke} color={trackColor} from={0} sweep={360} testID={part('track')} />
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, width: ring, height: ring, ...motion }} testID={part('motion')}>
            <Arc size={ring} thickness={stroke} color={indicatorColor} from={0} sweep={reduceMotion ? 360 : QUARTER} roundCaps={caps} testID={part('indicator')} />
          </Animated.View>
        </>
      );
    }
  }

  // PRG-8 / PRG-9 / PRG-10: a progressbar named by the label; determinate with its range and clamped value (and
  // valueText), indeterminate busy with no value. Never focusable; nothing is announced by the component.
  const a11yValue: AccessibilityValue | undefined = reading ? { ...reading.value, ...(valueText ? { text: valueText } : null) } : undefined;
  return (
    <View
      {...rest}
      testID={testID}
      accessible
      focusable={false}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={a11yValue}
      accessibilityState={determinate ? undefined : { busy: true }}
      style={[box, style]}
    >
      {drawing}
    </View>
  );
}
