import { useCallback, useMemo, useRef, useState } from 'react';
import { View, type BoxShadowValue, type ViewStyle } from 'react-native';
import { supportsBoxShadow } from '../theme/elevation';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';
import { Ring } from './Ring';

export interface FocusRingProps {
  /** Pass the `focused` flag of `useKeyboardFocus()`. */
  visible: boolean;
  /** Corner radius of the host. */
  radius: number;
  /** How the host's corners ease (`system.shape.cornerSmoothing`): the indicator follows the same curve. */
  cornerSmoothing?: number;
  /**
   * Draws the indicator INSIDE the host: its outer edge on the host's edge, the inner stroke within it (a row of a list
   * or a menu, which a scrolling ancestor or the menu's surface would otherwise clip — LST-4, MNU-11). The token offset
   * is then the room the strokes leave the host's content, so it is not applied twice. Default: outside, at the offset.
   */
  inside?: boolean;
  /**
   * Drawn inside (`inside`), this much further in: the room a part drawn over the host's edge takes (a segmented
   * button's outline over its segments, SEG-5), so that it never covers the indicator. Default 0.
   */
  inset?: number;
  /**
   * Per-corner radii of a host whose corners differ (the end segments of a segmented button, SEG-13), logical: they
   * replace `radius`, and each is grown or shrunk by the indicator's distance from the edge as `radius` is.
   */
  corners?: { topStart: number; topEnd: number; bottomStart: number; bottomEnd: number };
  /** The outer stroke gets this id; the inner stroke, when the system has one, gets `<testID>.inner`. */
  testID?: string;
}

/**
 * The focus indicator, from the control outwards (`system.measure.focus`): a signed `offset`
 * (negative = inside the control), an optional inner stroke (`innerWidth`, role `focusRingInner`;
 * 0 = none), then the outer stroke (`outerWidth`, role `focusRing`). Never animated.
 *
 * `system.behavior.focusStyle` chooses how they are drawn: `ring` — hard strokes; `glow` — the same two colors over the
 * same reach as a soft halo (each blurred by its own width), ONE node with a `boxShadow`. A renderer without
 * `boxShadow` (old architecture) cannot draw a glow and draws the ring: a focus indicator must never be invisible.
 */
export function FocusRing({ visible, radius, cornerSmoothing = 0, inside = false, inset = 0, corners, testID }: FocusRingProps) {
  const { system, color } = useTanrei();
  if (!visible) return null;
  const { innerWidth, outerWidth } = system.measure.focus;
  // Inside: the whole indicator moves in until its outer edge lies on the host's edge.
  const offset = inside ? -(innerWidth + outerWidth + inset) : system.measure.focus.offset;
  if (system.behavior.focusStyle === 'glow' && supportsBoxShadow()) {
    // First in the list = on top, as in CSS: the inner color sits over the start of the outer one.
    const halo = (width: number, reach: number, role: 'focusRing' | 'focusRingInner'): BoxShadowValue => ({ offsetX: 0, offsetY: 0, blurRadius: width, spreadDistance: reach, color: color(role) });
    const boxShadow = [...(innerWidth > 0 ? [halo(innerWidth, innerWidth, 'focusRingInner')] : []), halo(outerWidth, innerWidth + outerWidth, 'focusRing')];
    const edge = offset === 0 ? 0 : -offset;
    const grown = (value: number) => (value > 0 ? Math.max(0, value + offset) : 0);
    const rounding: ViewStyle = corners
      ? { borderTopStartRadius: grown(corners.topStart), borderTopEndRadius: grown(corners.topEnd), borderBottomStartRadius: grown(corners.bottomStart), borderBottomEndRadius: grown(corners.bottomEnd) }
      : { borderRadius: Math.max(0, radius + offset) };
    const glow: ViewStyle = { position: 'absolute', top: edge, right: edge, bottom: edge, left: edge, ...rounding, boxShadow, pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
    return <View testID={testID} style={glow} accessible={false} importantForAccessibility="no" />;
  }
  return (
    <>
      {innerWidth > 0 ? (
        <Ring placement="outside" gap={offset} width={innerWidth} color={color('focusRingInner')} radius={radius} corners={corners} cornerSmoothing={cornerSmoothing} testID={testID ? `${testID}.inner` : undefined} />
      ) : null}
      <Ring placement="outside" gap={offset + innerWidth} width={outerWidth} color={color('focusRing')} radius={radius} corners={corners} cornerSmoothing={cornerSmoothing} testID={testID} />
    </>
  );
}

export interface KeyboardFocus {
  /** True only while the host has focus that did not come from a press. */
  focused: boolean;
  /** Call these from the host `Pressable`'s handlers of the same name. */
  handlers: { onPressIn: () => void; onPressOut: () => void; onFocus: () => void; onBlur: () => void };
}

/**
 * React Native has no `:focus-visible`. Focus that arrives while a press is in progress came from
 * a pointer or touch; any other focus came from a keyboard, D-pad or switch control.
 */
export function useKeyboardFocus(): KeyboardFocus {
  const pressing = useRef(false);
  const [focused, setFocused] = useState(false);
  const onPressIn = useCallback(() => void (pressing.current = true), []);
  const onPressOut = useCallback(() => void (pressing.current = false), []);
  const onFocus = useCallback(() => setFocused(!pressing.current), []);
  const onBlur = useCallback(() => setFocused(false), []);
  const handlers = useMemo(() => ({ onPressIn, onPressOut, onFocus, onBlur }), [onPressIn, onPressOut, onFocus, onBlur]);
  return { focused, handlers };
}
