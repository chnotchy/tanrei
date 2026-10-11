import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type Ref } from 'react';
import {
  Animated,
  I18nManager,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiSliderConditionStateTokens, TanreiSliderSize } from '../generated/vocabulary';
import { fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { resolveInteractionState, type InteractionState } from '../primitives/interaction';
import { usePressHold } from '../primitives/pressHold';
import { PressRipple, usePressRipple, type PressRippleState } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added
 * (its generated file augments `TanreiSliderSizeRegistry`).
 */
export type SliderSize = TanreiSliderSize;
/** Horizontal runs from the inline start (min) to the inline end (max); vertical from the bottom (min) to the top (max). */
export type SliderOrientation = 'horizontal' | 'vertical';
/** Whether a handle shows its value beside it: never, while it is pressed or has keyboard focus, or all the time. */
export type SliderValueIndicator = 'none' | 'active' | 'always';
const ORIENTATIONS: readonly SliderOrientation[] = ['horizontal', 'vertical'];
const INDICATORS: readonly SliderValueIndicator[] = ['none', 'active', 'always'];

/**
 * How far a touch travels before it is a drag along the track or a scroll across it (SLD-2: "the platform's touch
 * slop"). React Native does not expose the platform's value; this is Android's `ViewConfiguration` default (8 dp), below
 * iOS's pan threshold. A behaviour of the platform, not a design value: no system re-values it.
 */
export const TOUCH_SLOP = 8;

/** The slider's outer view: the whole slider is the hit area. */
export type SliderRef = ComponentRef<typeof View>;

export interface SliderProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The track's weight. Unknown values render as `small` (SLD-23). */
  size?: SliderSize;
  /** `horizontal` (the default) or `vertical`. Unknown values render as `horizontal` (SLD-23). */
  orientation?: SliderOrientation;
  /** The value of the only handle, or of a range's end handle. **Controlled**: set it from `onValueChange`. */
  value?: number;
  /** The value of a range's start handle. Ignored unless `range`. */
  startValue?: number;
  /** Two handles, choosing the range from `startValue` to `value`. */
  range?: boolean;
  /** The spec's `min`: the lowest value, at the track's start. */
  minimumValue?: number;
  /** The spec's `max`: the highest value, at the track's end. */
  maximumValue?: number;
  /** 0 is continuous; above 0 the values are `minimumValue` plus whole multiples of `step`, up to `maximumValue`. */
  step?: number;
  /** Where the active track starts: null (the default) starts it at `minimumValue`; a value inside the range makes a centered slider. Ignored for a range. */
  origin?: number | null;
  /** A stop dot at every value a discrete slider can take. Ignored while `step` is 0. */
  stops?: boolean;
  /** `none` (the default), `active` (while a handle is pressed or has keyboard focus) or `always`. Unknown values render as `none` (SLD-23). */
  valueIndicator?: SliderValueIndicator;
  /** Prevents interaction and removes the handles from the focus order. */
  disabled?: boolean;
  /** The spec's `label`: names the slider (a range's end handle). Never drawn. Required (SLD-19). */
  accessibilityLabel?: string;
  /** The spec's `startLabel`: names a range's start handle ("Minimum price"). Required while `range`. */
  startAccessibilityLabel?: string;
  /** The value as words ("40 %"), spoken and shown by the value indicator in place of the number. For a range, the end handle's. */
  valueText?: string;
  /** The start handle's `valueText`, for a range. */
  startValueText?: string;
  /**
   * The spec's `input`: the person changed a value — every change during a drag, and each key or assistive-technology
   * step. A range also receives `startValue`. Never called when the product sets a value.
   */
  onValueChange?: (value: number, startValue?: number) => void;
  /** The spec's `change`: the person finished changing a value (the press ended, or a key or assistive step); always after the input it follows. */
  onSlidingComplete?: (value: number, startValue?: number) => void;
  /** Layout of the slider (margins, `flex`, a width or height); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<SliderRef>;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
type HandleId = 'start' | 'end';
type Values = { start: number; end: number };

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
/** Rounds away floating-point noise (0.1 + 0.2), so that a snapped value compares equal to its step. */
const tidy = (value: number) => Math.round(value * 1e10) / 1e10;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
/** `-value`, without a negative zero. */
const negate = (value: number) => (value === 0 ? 0 : -value);
/** Fraction digits of a number, as written (at most 10). */
const decimals = (value: number) => {
  const text = String(tidy(Math.abs(value)));
  const [, fraction = ''] = text.split('.');
  return text.includes('e-') ? 10 : fraction.length;
};

/**
 * The slider's numbers (SLD-1, SLD-3, SLD-22): the range, the keyboard step, and the snap of a value — clamped between
 * min and max, and while `step` is above 0 on min plus a whole multiple of step that does not exceed max, the nearest.
 */
export function sliderScale(min: number, max: number, step: number) {
  const valid = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const stepping = Number.isFinite(step) && step > 0 ? step : 0;
  const keyStep = stepping > 0 ? stepping : valid ? (max - min) / 100 : 0;
  const snap = (value: number, low = min, high = max): number => {
    if (!valid) return min;
    let next = clamp(Number.isFinite(value) ? value : low, low, high);
    if (stepping > 0) {
      next = min + Math.round((next - min) / stepping) * stepping;
      if (next > high + 1e-9) next -= stepping;
      if (next < low - 1e-9) next += stepping;
      next = clamp(next, low, high);
    }
    return tidy(next);
  };
  const fraction = (value: number) => (valid ? clamp((value - min) / (max - min), 0, 1) : 0);
  // SLD-18: as many fraction digits as the keyboard step has, at most two.
  const digits = Math.min(2, decimals(keyStep));
  return { valid, step: stepping, keyStep, snap, fraction, digits };
}

/** SLD-18: a value as a number in the platform's locale, with `digits` fraction digits. */
export function formatSliderValue(value: number, digits: number): string {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

/** A fraction (plain or moving) as a percentage of the travel. */
const percent = (fraction: Moving<number>, reverse = false): Moving<string> =>
  typeof fraction === 'number' ? `${tidy((reverse ? 1 - fraction : fraction) * 100)}%` : fraction.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['100%', '0%'] : ['0%', '100%'] });

/** A point on the travel: `fraction` of it, then `offset` points further toward max. */
type Point = { fraction: Moving<number>; offset: number };

/**
 * Tanrei Slider — spec: `specs/slider.spec.json`. React Native has no slider in its core; this one is controlled, in the
 * community slider's idiom (`value`, `minimumValue`, `maximumValue`, `step`, `onValueChange`, `onSlidingComplete`).
 * Anatomy: host (the hit area; the responder) > track (inactive and active pieces, stop dots) > per handle: the round
 * container (state layer, ripple) + the handle (+ focus ring) + the value indicator. Each handle is an adjustable
 * element and its own Tab stop. Positions along the track are percentages of the handles' travel, so the drawing needs
 * no layout pass; the press is turned into a value with the laid-out length.
 */
export function Slider({
  size = 'small',
  orientation: orientationProp = 'horizontal',
  value = 0,
  startValue = 0,
  range = false,
  minimumValue = 0,
  maximumValue = 100,
  step: stepProp = 0,
  origin = null,
  stops = false,
  valueIndicator: indicatorProp = 'none',
  disabled = false,
  accessibilityLabel,
  startAccessibilityLabel,
  valueText = '',
  startValueText = '',
  onValueChange,
  onSlidingComplete,
  style,
  testID,
  onLayout,
  ref,
  ...rest
}: SliderProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.slider;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // SLD-23: size is an open key (unknown → small's tokens); orientation and valueIndicator are closed. Each is reported once.
  const dimensions = lookupValue(tokens.sizes, size, 'small', 'Slider size');
  const orientation = closedValue(ORIENTATIONS, orientationProp, 'horizontal', 'Slider orientation');
  const indicator = closedValue(INDICATORS, indicatorProp, 'none', 'Slider valueIndicator');
  const appearance = lookupValue(tokens.conditions, 'standard', 'standard', 'Slider condition');
  const horizontal = orientation === 'horizontal';
  const rtl = I18nManager.isRTL;
  const { cornerSmoothing } = theme.system.shape;
  const { pressedFeedback } = theme.system.behavior;

  // SLD-1, SLD-22: the numbers, clamped and snapped; a start above the end draws both at the end.
  const scale = useMemo(() => sliderScale(minimumValue, maximumValue, stepProp), [minimumValue, maximumValue, stepProp]);
  const endValue = scale.snap(value);
  const startDrawn = range ? Math.min(scale.snap(startValue), endValue) : scale.snap(minimumValue);
  const interactive = !disabled && scale.valid;
  const reports = [
    ...(!scale.valid ? [`Tanrei: a Slider${where} has maximumValue (${maximumValue}) not greater than minimumValue (${minimumValue}); it draws its handles at the start and takes no input.`] : []),
    ...(stepProp < 0 ? [`Tanrei: a Slider${where} has a negative step (${stepProp}); it is treated as 0.`] : []),
    ...(scale.valid && tidy(value) !== endValue ? [`Tanrei: a Slider${where} value ${value} is outside ${minimumValue}–${maximumValue} or off a step; it is drawn as ${endValue}.`] : []),
    ...(scale.valid && range && tidy(startValue) !== scale.snap(startValue) ? [`Tanrei: a Slider${where} startValue ${startValue} is outside ${minimumValue}–${maximumValue} or off a step; it is drawn as ${scale.snap(startValue)}.`] : []),
    ...(scale.valid && range && scale.snap(startValue) > endValue ? [`Tanrei: a Slider${where} startValue ${startValue} is greater than value ${value}; both handles are drawn at ${endValue}.`] : []),
    ...(scale.valid && !range && origin !== null && tidy(origin) !== scale.snap(origin) ? [`Tanrei: a Slider${where} origin ${origin} is outside ${minimumValue}–${maximumValue} or off a step; it is drawn as ${scale.snap(origin)}.`] : []),
    ...(accessibilityLabel?.trim() ? [] : [`Tanrei: a Slider${where} has no accessibilityLabel. Name it for assistive technology, in the words of its visible label.`]),
    ...(range && !startAccessibilityLabel?.trim() ? [`Tanrei: a range Slider${where} has no startAccessibilityLabel. Name its start handle ("Minimum price").`] : []),
  ].join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  const handles: readonly HandleId[] = range ? ['start', 'end'] : ['end'];
  const valueOf = (values: Values, handle: HandleId) => (handle === 'start' ? values.start : values.end);
  const drawnValues: Values = { start: startDrawn, end: endValue };
  // SLD-5: each handle stops at the other's value.
  const bounds = (values: Values, handle: HandleId): [number, number] =>
    !range ? [minimumValue, maximumValue] : handle === 'start' ? [minimumValue, values.end] : [values.start, maximumValue];
  const handleBounds = (handle: HandleId) => {
    const [low, high] = bounds(drawnValues, handle);
    return [scale.snap(low), scale.snap(high)] as const;
  };

  // The values the person is changing: the product's, until a change of ours arrives (it is controlled). Input and change
  // compare with these, not with props that may not have caught up yet.
  const live = useRef<Values>(drawnValues);
  const pressing = useRef(false);
  if (!pressing.current) live.current = drawnValues;
  const emit = useCallback(
    (next: Values, complete: boolean) => {
      const args: [number, number?] = range ? [next.end, next.start] : [next.end];
      if (complete) onSlidingComplete?.(...args);
      else onValueChange?.(...args);
    },
    [range, onValueChange, onSlidingComplete],
  );
  /** Sets one handle to `target` (snapped within its bounds) and emits input when that changes it. True when it changed. */
  const move = useCallback(
    (handle: HandleId, target: number): boolean => {
      const current = live.current;
      const [low, high] = bounds(current, handle);
      const next = scale.snap(target, low, high);
      if (next === valueOf(current, handle)) return false;
      live.current = handle === 'start' ? { ...current, start: next } : { ...current, end: next };
      emit(live.current, false);
      return true;
    },
    // `bounds` and `valueOf` read `range`, `minimumValue`, `maximumValue`.
    [scale, emit, range, minimumValue, maximumValue],
  );

  // ---------------------------------------------------------------------------------------------------------------
  // Layout: the travel of a handle's center, along the axis (SLD-7).

  const cs = tokens.containerSize;
  const thickness = dimensions.trackThickness;
  const across = Math.max(cs, dimensions.handleHeight);
  const inset = cs / 2;
  const [length, setLength] = useState<number | null>(null);
  const travel = length === null ? null : Math.max(0, length - 2 * inset - thickness);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      const next = horizontal ? width : height;
      setLength((previous) => (previous === next ? previous : next));
      onLayout?.(event);
    },
    [horizontal, onLayout],
  );
  /** A position on the host along the axis (physical, from the left or the top) → a value. */
  const valueAt = useCallback(
    (position: number) => {
      if (length === null || travel === null || travel <= 0) return null;
      const from = inset + thickness / 2;
      let fraction = clamp((position - from) / travel, 0, 1);
      // SLD-21: right-to-left mirrors a horizontal track; a vertical one runs from the bottom up.
      if (horizontal ? rtl : true) fraction = 1 - fraction;
      return minimumValue + fraction * (maximumValue - minimumValue);
    },
    [length, travel, inset, thickness, horizontal, rtl, minimumValue, maximumValue],
  );

  // ---------------------------------------------------------------------------------------------------------------
  // Interaction: press (SLD-2, SLD-13, SLD-14), keyboard focus (SLD-12), hover (SLD-11).

  const press = usePressHold(theme.system.motion.duration.pressHold);
  const [pressedHandle, setPressedHandle] = useState<HandleId | null>(null);
  const [focusedHandle, setFocusedHandle] = useState<HandleId | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null);
  const [dragging, setDragging] = useState(false);
  const rippleOptions = { pressed: press.pressed, growDuration: tokens.motionFeedbackDuration, fadeDuration: tokens.motionStateDuration, easing: tokens.motionStateEasing };
  const waves: Record<HandleId, PressRippleState> = {
    start: usePressRipple({ ...rippleOptions, enabled: pressedFeedback === 'ripple' && interactive, pressed: press.pressed && pressedHandle === 'start' }),
    end: usePressRipple({ ...rippleOptions, enabled: pressedFeedback === 'ripple' && interactive, pressed: press.pressed && pressedHandle === 'end' }),
  };

  /** The handle a press at `target` moves (SLD-2): the nearer one; where they meet, the one that can move toward it. */
  const nearer = (target: number | null): HandleId => {
    if (!range || target === null) return 'end';
    const { start, end } = live.current;
    if (start === end) return target < start ? 'start' : 'end';
    return Math.abs(target - start) < Math.abs(target - end) ? 'start' : 'end';
  };
  const gesture = useRef({ handle: 'end' as HandleId, origin: 0, page: 0, pageAcross: 0, dragging: false, yielded: false, before: drawnValues });
  const positionOf = (event: GestureResponderEvent) => {
    const native = event.nativeEvent as { locationX?: number; locationY?: number; pageX?: number; pageY?: number };
    return {
      location: (horizontal ? native.locationX : native.locationY) ?? 0,
      page: (horizontal ? native.pageX : native.pageY) ?? 0,
      pageAcross: (horizontal ? native.pageY : native.pageX) ?? 0,
    };
  };
  const endPress = (event: GestureResponderEvent | null) => {
    pressing.current = false;
    press.touchEnd(event);
    press.pressOut();
    setDragging(false);
    const { before } = gesture.current;
    const now = live.current;
    if (now.start !== before.start || now.end !== before.end) emit(now, true);
  };
  const responder = interactive
    ? {
        onStartShouldSetResponder: () => true,
        // SLD-2: a press that has become a drag along the track keeps the responder; before that, a scroll view may take it.
        onResponderTerminationRequest: () => !gesture.current.dragging,
        onResponderGrant: (event: GestureResponderEvent) => {
          const at = positionOf(event);
          const handle = nearer(valueAt(at.location));
          gesture.current = { handle, origin: at.location, page: at.page, pageAcross: at.pageAcross, dragging: false, yielded: false, before: live.current };
          pressing.current = true;
          setPressedHandle(handle);
          press.pressIn(event);
          // SLD-14: the ripple grows from the pressed handle's center.
          waves[handle].start(null, { width: cs, height: cs });
        },
        onResponderMove: (event: GestureResponderEvent) => {
          const state = gesture.current;
          if (state.yielded) return;
          const at = positionOf(event);
          const along = at.page - state.page;
          const crosswise = at.pageAcross - state.pageAcross;
          if (!state.dragging) {
            // SLD-2: a press that first travels across the track is left to an enclosing scroll view.
            if (Math.abs(crosswise) >= TOUCH_SLOP && Math.abs(crosswise) > Math.abs(along)) {
              state.yielded = true;
              return;
            }
            if (Math.abs(along) < TOUCH_SLOP) return;
            state.dragging = true;
            setDragging(true);
          }
          const target = valueAt(state.origin + along);
          if (target !== null) move(state.handle, target);
        },
        onResponderRelease: (event: GestureResponderEvent) => {
          const state = gesture.current;
          // SLD-2: a press that did not move moves the handle to the value under it when it ends.
          if (!state.dragging && !state.yielded) {
            const target = valueAt(state.origin);
            if (target !== null) move(state.handle, target);
          }
          endPress(event);
        },
        onResponderTerminate: (event: GestureResponderEvent) => endPress(event),
      }
    : {};

  // SLD-11: a fine pointer over the slider hovers the handle a press there would move.
  type PointerAt = { nativeEvent: { offsetX?: number; offsetY?: number } };
  const hovering = (event: PointerAt) => {
    const at = horizontal ? event.nativeEvent.offsetX : event.nativeEvent.offsetY;
    const next = nearer(typeof at === 'number' ? valueAt(at) : null);
    setHoveredHandle((previous) => (previous === next ? previous : next));
  };
  const pointer = interactive
    ? {
        onPointerEnter: hovering,
        onPointerMove: hovering,
        onPointerLeave: () => setHoveredHandle(null),
      }
    : {};

  /** SLD-3 / SLD-4: one change by a key or an assistive action — input, then change; nothing when it changes nothing. */
  const step = useCallback(
    (handle: HandleId, to: (current: number, low: number, high: number) => number) => {
      if (!interactive) return false;
      const current = live.current;
      const [low, high] = bounds(current, handle);
      if (!move(handle, to(valueOf(current, handle), low, high))) return false;
      emit(live.current, true);
      return true;
    },
    [interactive, move, emit, range, minimumValue, maximumValue],
  );
  const keyDown = (handle: HandleId) => (event: KeyDownEvent) => {
    const { key } = event.nativeEvent;
    const k = scale.keyStep;
    // SLD-3 / SLD-21: Right and Left are swapped in a right-to-left horizontal slider; Up always increases.
    const forward = horizontal && rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = horizontal && rtl ? 'ArrowRight' : 'ArrowLeft';
    let to: ((current: number, low: number, high: number) => number) | null = null;
    if (key === forward || key === 'ArrowUp') to = (current) => current + k;
    else if (key === backward || key === 'ArrowDown') to = (current) => current - k;
    else if (key === 'PageUp') to = (current) => current + 10 * k;
    else if (key === 'PageDown') to = (current) => current - 10 * k;
    else if (key === 'Home') to = (_current, low) => low;
    else if (key === 'End') to = (_current, _low, high) => high;
    if (!to) return;
    event.preventDefault?.();
    step(handle, to);
  };
  const accessibilityAction = (handle: HandleId) => (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') step(handle, (current) => current + scale.keyStep);
    else if (event.nativeEvent.actionName === 'decrement') step(handle, (current) => current - scale.keyStep);
  };

  // ---------------------------------------------------------------------------------------------------------------
  // States (SLD-11, SLD-14, SLD-20): each handle's, and the slider's (the highest of any handle's).

  const flags = (handle: HandleId) => ({ disabled, focused: focusedHandle === handle, hovered: hoveredHandle === handle });
  const handleState = (handle: HandleId): { state: InteractionState; under: InteractionState } => {
    const under = resolveInteractionState(flags(handle));
    const pressed = press.pressed && pressedHandle === handle;
    return { under, state: pressedFeedback === 'none' ? under : resolveInteractionState({ ...flags(handle), pressed }) };
  };
  const any = { disabled, focused: focusedHandle !== null, hovered: hoveredHandle !== null };
  const sliderState = pressedFeedback === 'none' ? resolveInteractionState(any) : resolveInteractionState({ ...any, pressed: press.pressed && pressedHandle !== null });
  const overall = appearance[sliderState];
  const { opacity } = stateShape(tokens, sliderState);
  // Colors move over the state motion (at once under a press); a value over the value motion, at once while dragged.
  const drawnColors = useStateTransition(
    { track: theme.resolve(overall.trackColor), active: theme.resolve(overall.activeTrackColor), stop: theme.resolve(overall.stopIndicatorColor), activeStop: theme.resolve(overall.activeStopIndicatorColor), opacity },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: sliderState === 'pressed' },
  ) as { track: Moving<string>; active: Moving<string>; stop: Moving<string>; activeStop: Moving<string>; opacity: Moving<number> };
  const fractions = { start: scale.fraction(startDrawn), end: scale.fraction(endValue) };
  const drawnFractions = useStateTransition(fractions, { duration: tokens.motionValueDuration, easing: tokens.motionValueEasing, immediate: dragging }) as { start: Moving<number>; end: Moving<number> };

  // ---------------------------------------------------------------------------------------------------------------
  // The track (SLD-6, SLD-8, SLD-9), in the travel's coordinates: a point is a fraction of the travel plus an offset.

  const trackShape = Math.min(dimensions.trackShape, thickness / 2);
  const originFraction = origin === null ? 0 : scale.fraction(scale.snap(origin));
  const handleWidthAt = (handle: HandleId) => appearance[handleState(handle).state].handleWidth;
  const cut = (handle: HandleId) => handleWidthAt(handle) / 2 + tokens.trackGap;
  const trackStart: Point = { fraction: 0, offset: -thickness / 2 };
  const trackEnd: Point = { fraction: 1, offset: thickness / 2 };
  type Piece = { from: Point; to: Point; active: boolean; key: string };
  const pieces: Piece[] = [];
  const endAt = drawnFractions.end;
  if (range) {
    const startAt = drawnFractions.start;
    pieces.push({ from: trackStart, to: { fraction: startAt, offset: -cut('start') }, active: false, key: 'before' });
    pieces.push({ from: { fraction: startAt, offset: cut('start') }, to: { fraction: endAt, offset: -cut('end') }, active: true, key: 'between' });
    pieces.push({ from: { fraction: endAt, offset: cut('end') }, to: trackEnd, active: false, key: 'after' });
  } else {
    // SLD-6: the active track between origin and value, on whichever side value lies; an origin at an end reaches the
    // track's rounded end.
    const originPoint = (at: number): Point => (at <= 0 ? trackStart : at >= 1 ? trackEnd : { fraction: at, offset: 0 });
    const below = fractions.end >= originFraction;
    if (below) {
      if (originFraction > 0) pieces.push({ from: trackStart, to: originPoint(originFraction), active: false, key: 'before' });
      pieces.push({ from: originPoint(originFraction), to: { fraction: endAt, offset: -cut('end') }, active: true, key: 'active' });
      pieces.push({ from: { fraction: endAt, offset: cut('end') }, to: trackEnd, active: false, key: 'after' });
    } else {
      pieces.push({ from: trackStart, to: { fraction: endAt, offset: -cut('end') }, active: false, key: 'before' });
      pieces.push({ from: { fraction: endAt, offset: cut('end') }, to: originPoint(originFraction), active: true, key: 'active' });
      if (originFraction < 1) pieces.push({ from: originPoint(originFraction), to: trackEnd, active: false, key: 'after' });
    }
  }
  const activeFrom = range ? fractions.start : Math.min(originFraction, fractions.end);
  const activeTo = range ? fractions.end : Math.max(originFraction, fractions.end);
  // A piece that settled values show to be empty (the handles meet, or cover it) is not drawn.
  const settledLength = (piece: Piece) => {
    const at = (point: Point) => (typeof point.fraction === 'number' ? point.fraction : null);
    const from = at(piece.from);
    const to = at(piece.to);
    if (from === null || to === null) return Infinity;
    // Before the first layout pass the travel's length is unknown: a piece between two different fractions is drawn.
    if (travel === null && to > from) return Infinity;
    return (to - from) * (travel ?? 0) + piece.to.offset - piece.from.offset;
  };

  /** A span of the travel from `from` to `to`, as absolute offsets (logical in a horizontal slider, from the bottom in a vertical one). */
  const span = (from: Point, to: Point): Animated.WithAnimatedValue<ViewStyle> =>
    horizontal
      ? { position: 'absolute', top: 0, bottom: 0, start: percent(from.fraction), marginStart: from.offset, end: percent(to.fraction, true), marginEnd: negate(to.offset) }
      : { position: 'absolute', left: 0, right: 0, bottom: percent(from.fraction), marginBottom: from.offset, top: percent(to.fraction, true), marginTop: negate(to.offset) };
  /** A point of the travel, for a zero-size anchor. */
  const anchorAt = (fraction: Moving<number>): Animated.WithAnimatedValue<ViewStyle> =>
    horizontal ? { position: 'absolute', start: percent(fraction), top: '50%', width: 0, height: 0 } : { position: 'absolute', bottom: percent(fraction), left: '50%', width: 0, height: 0 };

  // SLD-9: the dots — at an end of the travel that lies on the track, and at every step while `stops`; none under a
  // handle or its gap; none at size 0.
  const dotSize = tokens.stopIndicatorSize;
  const stopFractions: number[] = [];
  if (dotSize > 0 && scale.valid) {
    const candidates = new Set<number>([0, 1]);
    if (stops && scale.step > 0) for (let at = minimumValue; at <= maximumValue + 1e-9; at = tidy(at + scale.step)) candidates.add(scale.fraction(at));
    for (const at of [...candidates].sort((a, b) => a - b)) {
      const onActive = at >= activeFrom - 1e-9 && at <= activeTo + 1e-9;
      const isEnd = at === 0 || at === 1;
      if (isEnd && onActive && !(stops && scale.step > 0)) continue;
      const covered = handles.some((handle) => {
        const distance = Math.abs(at - fractions[handle]);
        return travel ? distance * travel < cut(handle) + dotSize / 2 : distance < 1e-9;
      });
      if (!covered) stopFractions.push(at);
    }
  }
  const dotStyle = (at: number): ViewStyle =>
    horizontal
      ? { position: 'absolute', start: `${tidy(at * 100)}%`, marginStart: -dotSize / 2, top: (thickness - dotSize) / 2, width: dotSize, height: dotSize, borderRadius: dotSize / 2 }
      : { position: 'absolute', bottom: `${tidy(at * 100)}%`, marginBottom: -dotSize / 2, left: (thickness - dotSize) / 2, width: dotSize, height: dotSize, borderRadius: dotSize / 2 };

  const trackColor = theme.resolve(overall.trackColor);
  const activeColor = theme.resolve(overall.activeTrackColor);
  const stopColor = theme.resolve(overall.stopIndicatorColor);
  const activeStopColor = theme.resolve(overall.activeStopIndicatorColor);
  const trackBox: ViewStyle = horizontal
    ? { position: 'absolute', start: inset, end: inset, top: (across - thickness) / 2, height: thickness }
    : { position: 'absolute', top: inset, bottom: inset, left: (across - thickness) / 2, width: thickness };
  const travelBox: ViewStyle = horizontal
    ? { position: 'absolute', start: thickness / 2, end: thickness / 2, top: 0, bottom: 0 }
    : { position: 'absolute', top: thickness / 2, bottom: thickness / 2, left: 0, right: 0 };
  const handleBox: ViewStyle = horizontal
    ? { position: 'absolute', start: inset + thickness / 2, end: inset + thickness / 2, top: 0, bottom: 0 }
    : { position: 'absolute', top: inset + thickness / 2, bottom: inset + thickness / 2, left: 0, right: 0 };

  const track = (
    <View style={trackBox} pointerEvents="none" testID={part('track')} {...HIDDEN}>
      <View style={travelBox}>
        {pieces
          .filter((piece) => settledLength(piece) > 0)
          .map((piece) => {
            const color = piece.active ? activeColor : trackColor;
            const drawn = piece.active ? drawnColors.active : drawnColors.track;
            return (
              <Animated.View
                key={piece.key}
                style={[span(piece.from, piece.to), { borderRadius: trackShape, backgroundColor: fillOf(color, drawn), ...borderCurveOf(cornerSmoothing) }]}
                testID={part(`track.${piece.active ? 'active' : 'inactive'}.${piece.key}`)}
              />
            );
          })}
        {stopFractions.map((at) => {
          const onActive = at >= activeFrom - 1e-9 && at <= activeTo + 1e-9;
          const color = onActive ? activeStopColor : stopColor;
          const drawn = onActive ? drawnColors.activeStop : drawnColors.stop;
          return <Animated.View key={at} style={[dotStyle(at), { backgroundColor: fillOf(color, drawn) }]} testID={part(`track.stop.${Math.round(at * 1000) / 1000}`)} />;
        })}
      </View>
    </View>
  );

  // SLD-7: across the axis, the larger of the container and the handle; along it, what the layout gives. The hit area
  // reaches the minimum target across the axis (React Native cannot tell touch from a fine pointer: touch).
  const target = theme.system.measure.target.touch;
  const reach = Math.max(0, Math.ceil((target - across) / 2));
  const host: ViewStyle = horizontal ? { alignSelf: 'stretch', height: across } : { height: '100%', width: across };
  const hitSlop = horizontal ? { top: reach, bottom: reach, left: 0, right: 0 } : { left: reach, right: reach, top: 0, bottom: 0 };

  return (
    <Animated.View
      {...rest}
      {...responder}
      {...(pointer as object)}
      ref={ref}
      hitSlop={hitSlop}
      onLayout={handleLayout}
      style={[host, { opacity: drawnColors.opacity }, style]}
      testID={testID}
    >
      {track}
      <View style={handleBox} pointerEvents="box-none" testID={part('handles')}>
        {handles.map((handle) => {
          const { state, under } = handleState(handle);
          const [low, high] = handleBounds(handle);
          const current = valueOf(drawnValues, handle);
          const words = (handle === 'start' ? startValueText : valueText).trim() || formatSliderValue(current, scale.digits);
          const showsIndicator = !disabled && scale.valid && (indicator === 'always' || (indicator === 'active' && ((press.pressed && pressedHandle === handle) || focusedHandle === handle)));
          return (
              <SliderHandle
                key={handle}
                handle={handle}
                fraction={handle === 'start' ? drawnFractions.start : drawnFractions.end}
                anchorAt={anchorAt}
                state={state}
                under={under}
                appearance={appearance[state]}
                underAppearance={appearance[under]}
                pressedAppearance={appearance.pressed}
                tokens={tokens}
                handleHeight={dimensions.handleHeight}
                theme={theme}
                wave={waves[handle]}
                layerless={state === 'pressed' && (pressedFeedback === 'dim' || waves[handle].ripple !== null)}
                focused={focusedHandle === handle}
                disabled={disabled}
                interactive={interactive}
                horizontal={horizontal}
                label={handle === 'start' ? startAccessibilityLabel : accessibilityLabel}
                accessibilityValue={{ min: low, max: high, now: current, text: words }}
                valueWords={words}
                showsIndicator={showsIndicator}
                sliderLength={length}
                travel={travel}
                travelStart={inset + thickness / 2}
                settledFraction={fractions[handle]}
                onKeyDown={keyDown(handle)}
                onAccessibilityAction={accessibilityAction(handle)}
                onFocus={() => {
                  // SLD-11 / SLD-12: focus that comes with a press is not keyboard focus.
                  if (!pressing.current) setFocusedHandle(handle);
                }}
                onBlur={() => setFocusedHandle((previous) => (previous === handle ? null : previous))}
                testID={part(handle === 'start' ? 'handle.start' : 'handle')}
              />
          );
        })}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// One handle: its container (state layer), the handle, the focus ring and the value indicator (SLD-8, SLD-10, SLD-12,
// SLD-17, SLD-19).

interface SliderHandleProps {
  handle: HandleId;
  fraction: Moving<number>;
  anchorAt: (fraction: Moving<number>) => Animated.WithAnimatedValue<ViewStyle>;
  state: InteractionState;
  under: InteractionState;
  appearance: TanreiSliderConditionStateTokens;
  underAppearance: TanreiSliderConditionStateTokens;
  pressedAppearance: TanreiSliderConditionStateTokens;
  tokens: TanreiTheme['system']['components']['slider'];
  handleHeight: number;
  theme: TanreiTheme;
  wave: PressRippleState;
  layerless: boolean;
  focused: boolean;
  disabled: boolean;
  interactive: boolean;
  horizontal: boolean;
  label: string | undefined;
  accessibilityValue: { min: number; max: number; now: number; text: string };
  valueWords: string;
  showsIndicator: boolean;
  sliderLength: number | null;
  travel: number | null;
  travelStart: number;
  settledFraction: number;
  onKeyDown: (event: KeyDownEvent) => void;
  onAccessibilityAction: (event: AccessibilityActionEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  testID: string | undefined;
}

function SliderHandle({
  fraction,
  anchorAt,
  state,
  appearance,
  underAppearance,
  pressedAppearance,
  tokens,
  handleHeight,
  theme,
  wave,
  layerless,
  focused,
  disabled,
  interactive,
  horizontal,
  label,
  accessibilityValue,
  valueWords,
  showsIndicator,
  sliderLength,
  travel,
  travelStart,
  settledFraction,
  onKeyDown,
  onAccessibilityAction,
  onFocus,
  onBlur,
  testID,
}: SliderHandleProps) {
  const part = (name: string) => partTestID(testID, name);
  const { cornerSmoothing } = theme.system.shape;
  const cs = tokens.containerSize;
  const width = appearance.handleWidth;
  const radius = Math.min(tokens.handleShape, Math.min(width, handleHeight) / 2);
  const containerShape = Math.min(tokens.containerShape, cs / 2);
  // SLD-14: under `ripple` (while one draws) and `dim` the container keeps the state under the press.
  const containerPaint = layerless ? underAppearance.containerColor : appearance.containerColor;
  const colors = { container: theme.resolve(containerPaint), handle: theme.resolve(appearance.handleColor) };
  const drawn = useStateTransition(colors, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' }) as { container: Moving<string>; handle: Moving<string> };
  const elevation = theme.elevation(appearance.handleElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  // The element assistive technology and the keyboard reach: a square around the handle, as large as its container.
  const box = Math.max(cs, width, handleHeight);

  // SLD-17: the value indicator, faded in and out over the state motion.
  const shown = useStateTransition({ opacity: showsIndicator ? 1 : 0 }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing }) as { opacity: Moving<number> };
  const [indicatorSize, setIndicatorSize] = useState<{ width: number; height: number } | null>(null);
  const onIndicatorLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setIndicatorSize((previous) => (previous && previous.width === w && previous.height === h ? previous : { width: w, height: h }));
  }, []);
  const indicatorVisible = showsIndicator || typeof shown.opacity !== 'number' || shown.opacity > 0;
  const estimate = { width: indicatorSize?.width ?? tokens.valueIndicatorContainerHeight, height: indicatorSize?.height ?? tokens.valueIndicatorContainerHeight };
  // Kept inside the slider along its axis (and so inside the window, when the slider is): measured, so only after layout.
  let shift = 0;
  if (horizontal && sliderLength !== null && travel !== null) {
    const center = travelStart + settledFraction * travel;
    const physical = I18nManager.isRTL ? sliderLength - center : center;
    const left = physical - estimate.width / 2;
    if (left < 0) shift = -left;
    else if (left + estimate.width > sliderLength) shift = sliderLength - (left + estimate.width);
    if (I18nManager.isRTL) shift = -shift;
  }
  const offset = tokens.valueIndicatorOffset;
  const indicatorPlace: ViewStyle = horizontal
    ? { position: 'absolute', bottom: handleHeight / 2 + offset, start: -estimate.width / 2 + shift }
    : { position: 'absolute', end: handleHeight / 2 + offset, top: -estimate.height / 2 };
  const valueIndicator = indicatorVisible ? (
    <Animated.View
      onLayout={onIndicatorLayout}
      pointerEvents="none"
      style={[
        indicatorPlace,
        {
          zIndex: 1,
          opacity: shown.opacity,
          minHeight: tokens.valueIndicatorContainerHeight,
          minWidth: tokens.valueIndicatorContainerHeight,
          paddingHorizontal: tokens.valueIndicatorContainerPaddingInline,
          borderRadius: tokens.valueIndicatorContainerShape,
          alignItems: 'center',
          justifyContent: 'center',
          ...(theme.resolve(tokens.valueIndicatorContainerColor).a > 0 ? { backgroundColor: theme.paint(tokens.valueIndicatorContainerColor) } : null),
          ...borderCurveOf(cornerSmoothing),
        },
      ]}
      testID={part('value-indicator')}
      {...HIDDEN}
    >
      <Text style={[theme.text(tokens.valueIndicatorLabelTypescale), { color: theme.paint(tokens.valueIndicatorLabelColor) }]} numberOfLines={1} allowFontScaling testID={part('value-indicator.label')}>
        {valueWords}
      </Text>
    </Animated.View>
  ) : null;

  const keys = { onKeyDown } as object;
  const actions = interactive ? { accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }], onAccessibilityAction } : {};
  return (
    <Animated.View style={[anchorAt(fraction), { position: 'absolute' }]} pointerEvents="box-none">
      <View
        {...keys}
        {...actions}
        accessible
        focusable={interactive}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={accessibilityValue}
        accessibilityState={{ disabled }}
        onFocus={onFocus}
        onBlur={onBlur}
        pointerEvents="none"
        style={{ position: 'absolute', left: -box / 2, top: -box / 2, width: box, height: box, alignItems: 'center', justifyContent: 'center' }}
        testID={testID}
      >
        {cs > 0 ? (
          <Animated.View
            style={{ position: 'absolute', width: cs, height: cs, borderRadius: containerShape, backgroundColor: fillOf(colors.container, drawn.container), ...borderCurveOf(cornerSmoothing) }}
            testID={part('container')}
            {...HIDDEN}
          >
            {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(pressedAppearance.containerColor)} radius={containerShape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
          </Animated.View>
        ) : null}
        <Animated.View style={{ width, height: handleHeight, borderRadius: radius, backgroundColor: fillOf(colors.handle, drawn.handle), ...shadow, ...borderCurveOf(cornerSmoothing) }} testID={part('thumb')} {...HIDDEN}>
          {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={radius} cornerSmoothing={cornerSmoothing} testID={part('thumb.elevation-ring')} /> : null}
          <FocusRing visible={focused && !disabled} radius={radius} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
        </Animated.View>
      </View>
      {valueIndicator}
    </Animated.View>
  );
}

