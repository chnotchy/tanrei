import { Animated, View, type ViewStyle } from 'react-native';

/** An angle in degrees, clockwise from the top: a number, or an animated value while it moves. */
export type Angle = number | Animated.AnimatedInterpolation<number>;

export interface ArcProps {
  /** The square box the ring fills: its outer edge touches the box. */
  size: number;
  /** The stroke width, measured inward from the box. */
  thickness: number;
  /** A color string; `undefined` draws nothing (a paint that resolves to nothing). */
  color: string | undefined;
  /** Where the arc starts, in degrees clockwise from the top. */
  from: Angle;
  /** How long the arc is, in degrees (0–360). 360 is the whole circle. */
  sweep: Angle;
  /** Round caps (a dot of the stroke's width at each end); butt ends otherwise. Never on a whole circle. */
  roundCaps?: boolean;
  testID?: string;
}

/** Numbers in the drawing are rounded to a ten-thousandth, so that `0.4 * 360` is 144, not 144.00000000000003. */
export const tidy = (n: number) => Math.round(n * 1e4) / 1e4;

const rotation = (degrees: number) => `${tidy(degrees)}deg`;

/** `angle + shift` as a rotation; an animated angle stays animated. */
function turn(angle: Angle, shift = 0): string | Animated.AnimatedInterpolation<string> {
  if (typeof angle === 'number') return rotation(angle + shift);
  return angle.interpolate({ inputRange: [0, 360], outputRange: [`${shift}deg`, `${360 + shift}deg`] });
}

/** The inner rotation of a half: `clamp(sweep − start, 0, 180) − 180` degrees. */
function halfTurn(sweep: Angle, start: number): string | Animated.AnimatedInterpolation<string> {
  if (typeof sweep === 'number') return rotation(Math.min(180, Math.max(0, sweep - start)) - 180);
  return sweep.interpolate({ inputRange: [start, start + 180], outputRange: ['-180deg', '0deg'], extrapolate: 'clamp' });
}

/**
 * One half of the arc: the ring clipped to the half-plane that starts at `frame`, inside a frame turned so that a
 * second half-plane ends where the arc ends. Their intersection is the arc: `[frame, frame + length]`, length ≤ 180.
 * Every border of the ring is one color, so no platform has to join two border colors.
 */
function Half({ size, thickness, color, frame, inner, testID }: { size: number; thickness: number; color: string; frame: string | Animated.AnimatedInterpolation<string>; inner: string | Animated.AnimatedInterpolation<string>; testID?: string }) {
  const c = size / 2;
  const box: ViewStyle = { position: 'absolute', top: 0, left: 0, width: size, height: size };
  const clip: ViewStyle = { position: 'absolute', top: 0, left: c, width: c, height: size, overflow: 'hidden' };
  const back: ViewStyle = { position: 'absolute', top: 0, left: -c, width: size, height: size };
  return (
    <Animated.View style={[box, { transform: [{ rotate: frame }] }]} testID={testID}>
      <View style={clip}>
        <Animated.View style={[back, { transform: [{ rotate: inner }] }]}>
          <View style={clip}>
            <View style={[back, { borderRadius: c, borderWidth: thickness, borderColor: color }]} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** A dot of the stroke's width on the ring's center line, at `angle`. */
function Cap({ size, thickness, color, angle, testID }: { size: number; thickness: number; color: string; angle: Angle; testID?: string }) {
  const box: ViewStyle = { position: 'absolute', top: 0, left: 0, width: size, height: size };
  const dot: ViewStyle = { position: 'absolute', top: 0, left: size / 2 - thickness / 2, width: thickness, height: thickness, borderRadius: thickness / 2, backgroundColor: color };
  return (
    <Animated.View style={[box, { transform: [{ rotate: turn(angle) }] }]} testID={testID}>
      <View style={dot} />
    </Animated.View>
  );
}

/** `a + b`; animated when either is (the identity interpolation turns the sum back into an `Angle`). */
const sum = (a: Angle, b: Angle): Angle =>
  typeof a === 'number' && typeof b === 'number' ? a + b : Animated.add(a, b).interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

/**
 * A stroked arc of a circle, drawn with views only (the package takes no SVG): the whole circle is a bordered circle;
 * a part of it is one or two halves, each a bordered circle clipped by two half-planes. Absolutely positioned over its
 * parent's `size` square; it never mirrors — `direction: 'ltr'` — because a clock turns clockwise in every language.
 * Non-interactive and invisible to assistive technology.
 */
export function Arc({ size, thickness, color, from, sweep, roundCaps = false, testID }: ArcProps) {
  if (color === undefined) return null;
  if (typeof sweep === 'number' && sweep <= 0) return null;
  const root: ViewStyle = { position: 'absolute', top: 0, left: 0, width: size, height: size, direction: 'ltr', pointerEvents: 'none' };
  if (typeof sweep === 'number' && sweep >= 360) {
    return (
      <View style={root} testID={testID} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, borderWidth: thickness, borderColor: color }} />
      </View>
    );
  }
  const second = typeof sweep !== 'number' || sweep > 180;
  const part = (name: string) => (testID ? `${testID}.${name}` : undefined);
  return (
    <View style={root} testID={testID} accessible={false} importantForAccessibility="no-hide-descendants">
      <Half size={size} thickness={thickness} color={color} frame={turn(from)} inner={halfTurn(sweep, 0)} testID={part('first')} />
      {second ? <Half size={size} thickness={thickness} color={color} frame={turn(from, 180)} inner={halfTurn(sweep, 180)} testID={part('second')} /> : null}
      {roundCaps ? <Cap size={size} thickness={thickness} color={color} angle={from} testID={part('start-cap')} /> : null}
      {roundCaps ? <Cap size={size} thickness={thickness} color={color} angle={sum(from, sweep)} testID={part('end-cap')} /> : null}
    </View>
  );
}
