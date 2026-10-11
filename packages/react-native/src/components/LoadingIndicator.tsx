import { useEffect } from 'react';
import { Animated, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiLoadingIndicatorSize } from '../generated/vocabulary';
import { Arc } from '../primitives/Arc';
import { partTestID } from '../primitives/content';
import { useLoop } from '../primitives/loop';
import { Ring } from '../primitives/Ring';
import { supportsBoxShadow } from '../theme/elevation';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotionSetting } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type LoadingIndicatorSize = TanreiLoadingIndicatorSize;

/** LDG-1: the turning mark is a quarter of the circle. */
const QUARTER = 90;

export interface LoadingIndicatorProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The indicator's box: small replaces an icon in a control, medium sits next to text, large fills a section. Unknown values render as `medium` (LDG-9). */
  size?: LoadingIndicatorSize;
  /** Draws the indicator on a raised container of its own, for places where it floats over content. */
  contained?: boolean;
  /** The accessible name (the spec's `label`): what is loading. Required; without it development builds warn (LDG-10). */
  accessibilityLabel?: string;
  /** Layout overrides (margins, `alignSelf`, a position over content). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Tanrei LoadingIndicator — spec: `specs/loading-indicator.spec.json`.
 * Anatomy: indicator (+ container when contained). A quarter arc with round caps that turns clockwise, in a square of the
 * size's `indicatorSize`; contained, on a raised circle of its `containerSize`. Exposed as a busy progressbar with no
 * value; never focusable. Not React Native's `ActivityIndicator`, which draws the platform's spinner and cannot follow
 * the tokens.
 */
export function LoadingIndicator({ size = 'medium', contained = false, accessibilityLabel, style, testID, ...rest }: LoadingIndicatorProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.loadingIndicator;
  // LDG-9: size is an open key; a value the active system does not have draws medium, reported in development builds.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'LoadingIndicator size');

  // LDG-10: development builds report a missing name.
  const unnamed = !accessibilityLabel?.trim() && !rest['aria-label']?.trim();
  useEffect(() => {
    if (__DEV__ && unnamed) console.warn(`Tanrei: a LoadingIndicator${testID ? ` (testID "${testID}")` : ''} has no accessibilityLabel. Say what is loading ("Loading messages").`);
  }, [unnamed, testID]);

  // LDG-1 / LDG-4 / LDG-7: one loop — the turn at constant speed, or under reduced motion the opacity pulse with
  // sys.motion.easing.standard — only while the app is in the foreground, and not before the platform has said whether
  // motion is reduced (a person who asked for less motion never sees it start).
  const motionSetting = useReduceMotionSetting();
  const reduceMotion = motionSetting === true;
  const cycle = tokens.motionCycleDuration;
  const { linear, standard } = theme.system.motion.easing;
  const loop = motionSetting === null ? null : reduceMotion ? `pulse:${cycle}:${standard}` : `turn:${cycle}:${linear}`;
  const progress = useLoop(
    loop,
    (at) => {
      if (reduceMotion) {
        const half = { duration: cycle / 2, easing: toEasing(standard), useNativeDriver: true };
        return Animated.sequence([Animated.timing(at, { ...half, toValue: 0 }), Animated.timing(at, { ...half, toValue: 1 })]);
      }
      return Animated.timing(at, { toValue: 1, duration: cycle, easing: toEasing(linear), useNativeDriver: true });
    },
    reduceMotion ? 1 : 0,
  );

  const { indicatorSize: mark, indicatorThickness: stroke, containerSize } = dimensions;
  // LDG-2 / LDG-3: the arc's color on the surface behind it, or on the container.
  const paint = contained ? tokens.containedIndicatorColor : tokens.indicatorColor;
  const color = theme.resolve(paint).a === 0 ? undefined : theme.paint(paint);
  const part = (name: string) => partTestID(testID, name);
  // LDG-1: turning clockwise; LDG-4: the whole circle, pulsing, and still. LDG-8: never mirrored (the arc is laid out ltr).
  const motion: ViewStyle = reduceMotion ? { opacity: progress as unknown as number } : { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) as unknown as string }] };
  const indicator = (
    <Animated.View style={{ width: mark, height: mark, ...motion }} testID={part('motion')}>
      <Arc size={mark} thickness={stroke} color={color} from={0} sweep={reduceMotion ? 360 : QUARTER} roundCaps testID={part('indicator')} />
    </Animated.View>
  );

  let box: ViewStyle;
  let ring = null;
  if (contained) {
    // LDG-3: a filled, raised container of containerSize with container.shape, the indicator centered in it; it never
    // moves or fades (LDG-4). A paint that resolves to nothing draws no fill; level0 draws no shadow.
    const fill = theme.resolve(tokens.containedContainerColor).a === 0 ? undefined : theme.paint(tokens.containedContainerColor);
    const elevation = theme.elevation(tokens.containedContainerElevation);
    const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
    const { cornerSmoothing } = theme.system.shape;
    box = { width: containerSize, height: containerSize, borderRadius: tokens.containerShape, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', ...borderCurveOf(cornerSmoothing), ...shadow };
    ring = elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.containerShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null;
  } else {
    // LDG-2: exactly the indicator's square, no container.
    box = { width: mark, height: mark };
  }

  // LDG-5 / LDG-6: a progressbar named by the label, busy, with no value; not focusable, announces nothing.
  return (
    <View
      {...rest}
      testID={testID}
      accessible
      focusable={false}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[{ alignSelf: 'flex-start' }, box, style]}
    >
      {ring}
      {indicator}
    </View>
  );
}
