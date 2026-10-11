import { Animated, View, type ViewStyle } from 'react-native';
import { tidy } from './Arc';
import { ramp } from './selectionControl';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/**
 * The check's geometry, as fractions of its box's side — the checkbox spec's anatomy (`mark`), which the list's and the
 * menu's checks follow: the check runs from its start down to the corner and up to its end, stroked with square caps
 * (each end extends half a stroke past its point). Drawn in code like the progress arcs; its box side, stroke and color
 * are the component's tokens.
 */
export const CHECK = { start: { x: 0.2, y: 0.5 }, corner: { x: 0.4, y: 0.7 }, end: { x: 0.8, y: 0.3 } } as const;

export interface MarkProps {
  /** 0 = not drawn (no node at all), 1 = whole; plain when settled, an interpolation while it moves. */
  progress: Moving<number>;
  color: Moving<string>;
  /** The side of the box the mark is drawn in. */
  side: number;
  /** The stroke width. */
  stroke: number;
  testID?: string;
}

/** A stroke from `from` to `to` (in the box's coordinates) with square caps, `drawn` of its length drawn from its start. */
function Leg({ from, to, drawn, color, stroke }: { from: { x: number; y: number }; to: { x: number; y: number }; drawn: Moving<number>; color: Moving<string>; stroke: number }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  // A square cap: the stroke starts half a stroke before its point (and ends half a stroke after the other one).
  const back = stroke / 2;
  const style: ViewStyle = {
    position: 'absolute',
    left: tidy(from.x - back * Math.cos(angle)),
    top: tidy(from.y - back * Math.sin(angle) - back),
    height: stroke,
    transform: [{ rotate: `${tidy((angle * 180) / Math.PI)}deg` }],
    transformOrigin: [0, back, 0],
  };
  return <Animated.View style={[style, { width: drawn, backgroundColor: color }]} />;
}

/**
 * The check — the short leg, then the long one — drawn along its path by `progress` (CHK-12 / CHK-13; the list's
 * LST-21 and the menu's MNU-22 draw the same check). It fills its parent (absolutely positioned), never mirrors
 * (`direction: 'ltr'`: a check is not a directional glyph), and takes no touches.
 */
export function CheckMark({ progress, color, side, stroke, testID }: MarkProps) {
  if (progress === 0) return null;
  const at = (point: { x: number; y: number }) => ({ x: point.x * side, y: point.y * side });
  const [start, corner, end] = [at(CHECK.start), at(CHECK.corner), at(CHECK.end)];
  const first = tidy(Math.hypot(corner.x - start.x, corner.y - start.y) + stroke);
  const second = tidy(Math.hypot(end.x - corner.x, end.y - corner.y) + stroke);
  const split = tidy(first / (first + second));
  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, direction: 'ltr', pointerEvents: 'none' }} testID={testID}>
      <Leg from={start} to={corner} drawn={ramp(progress, [0, split, 1], [0, first, first])} color={color} stroke={stroke} />
      <Leg from={corner} to={end} drawn={ramp(progress, [0, split, 1], [0, 0, second])} color={color} stroke={stroke} />
    </View>
  );
}
