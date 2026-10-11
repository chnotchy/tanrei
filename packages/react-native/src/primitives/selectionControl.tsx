import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Animated, View, type StyleProp, type TextLayoutEvent, type TextStyle, type ViewStyle } from 'react-native';
import { borderCurveOf } from '../theme/shape';
import { fillOf } from './content';
import { PressRipple, type PressRippleState } from './PressRipple';
import { useStateTransition, type StateTransitionOptions, type StateVisuals, type Transitioned } from './stateTransition';
import type { TanreiColor } from '../generated/vocabulary';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/** The host view of the state layer: what the ripple is measured in. */
export type StateLayerNode = ComponentRef<typeof View>;

// The shared shell of the selection controls — Checkbox, RadioButton, Switch: a pressable row that holds
// the control and its label, so that a press on the label is a press on the control, with the round state layer (the
// component's `container`) drawn behind the control rather than on the host. Package-internal.

/** The props React Native reads an accessible name from, besides the component's own `label`. */
export interface NameProps {
  accessibilityLabel?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  accessibilityLabelledBy?: string | string[];
}

/** Does the control have an accessible name — its `label`, or one of the props React Native reads a name from? */
export function hasAccessibleName(label: string, props: NameProps): boolean {
  const labelledBy = props['aria-labelledby'] ?? props.accessibilityLabelledBy;
  return Boolean(label.trim() || props.accessibilityLabel?.trim() || props['aria-label']?.trim() || (Array.isArray(labelledBy) ? labelledBy.length : labelledBy));
}

/**
 * CHK-16 / RAD-18 / SWT-16: a control without a name still renders; development builds say so, once per mount and
 * again when it loses its name. Release builds say nothing.
 */
export function useNamelessReport(component: string, named: boolean, testID: string | undefined): void {
  useEffect(() => {
    if (__DEV__ && !named) {
      console.warn(`Tanrei: a ${component}${testID ? ` (testID "${testID}")` : ''} has no label. Give it one — with labelHidden when it must not be drawn — so that assistive technology can name it.`);
    }
  }, [component, named, testID]);
}

/**
 * The host row: the control, then the label at its inline end `gap` away (a `row` is mirrored by React Native in a
 * right-to-left layout, so the label moves to the left). Only as wide as its content; the label wraps inside the width
 * the parent gives. Both start at the top; `useFirstLineAlignment` centers the control on the label's first line.
 */
export function selectionRow(gap: number): ViewStyle {
  return { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'flex-start', gap };
}

export interface FirstLineAlignment {
  /** Spread on the control (the container, or a switch's track). */
  control: ViewStyle;
  /** Spread on the label. */
  label: TextStyle;
  /** The label's `onTextLayout`: where its first line really is (font scale, the font's own metrics). */
  onTextLayout: (event: TextLayoutEvent) => void;
}

/**
 * CHK-15 / RAD-17 / SWT-15: the control is centered on the label's FIRST line, so a label that wraps grows downwards
 * and the control stays beside its first line. The first line's center is `lineHeight / 2` (the label's type style)
 * until the label has been laid out, then the measured one — which follows the system's text size. Whichever is
 * taller moves down by the difference: a control taller than the line pushes the label down, a taller line pushes the
 * control down. Nothing is set when they are centered already.
 */
export function useFirstLineAlignment(controlHeight: number, lineHeight: number | undefined): FirstLineAlignment {
  const [measured, setMeasured] = useState<number | null>(null);
  const onTextLayout = useCallback((event: TextLayoutEvent) => {
    const first = event.nativeEvent.lines[0];
    if (!first) return;
    const center = first.y + first.height / 2;
    setMeasured((previous) => (previous === center ? previous : center));
  }, []);
  const center = measured ?? (lineHeight ?? controlHeight) / 2;
  const shift = center - controlHeight / 2;
  return { control: shift > 0 ? { marginTop: shift } : {}, label: shift < 0 ? { marginTop: -shift } : {}, onTextLayout };
}

export interface StateLayerProps {
  /** The layer's diameter (`comp.<name>.container.size`). */
  size: number;
  /** The layer's corner radius in the current state (`<state>ContainerShape`). */
  shape: Moving<number>;
  /** The container paint of the current state, resolved; `drawn` is what the transition hands back for it. */
  resolved: TanreiColor;
  drawn: Moving<string>;
  /** The press ripple (`usePressInteraction().wave`) and the pressed container color of the condition it grows in. */
  wave: PressRippleState;
  rippleColor: string;
  cornerSmoothing: number;
  /** The node the ripple is measured in (`usePressInteraction({ rippleArea })`). */
  areaRef: RefObject<StateLayerNode | null>;
  /** Placement (a switch's layer moves with its handle: an animated `start`). */
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  testID?: string;
  /** The control, centered in the layer. */
  children?: ReactNode;
}

/**
 * The component's `container`: a round state layer behind the control that shows hover, focus and press,
 * invisible at rest (a paint that resolves to nothing sets no `backgroundColor`). The ripple, while one draws, grows in
 * it and is clipped to its shape; the control sits centered above both.
 */
export function StateLayer({ size, shape, resolved, drawn, wave, rippleColor, cornerSmoothing, areaRef, style, testID, children }: StateLayerProps) {
  const layer: ViewStyle = { width: size, height: size, alignItems: 'center', justifyContent: 'center', ...borderCurveOf(cornerSmoothing) };
  return (
    <Animated.View ref={areaRef} testID={testID} style={[layer, { borderRadius: shape, backgroundColor: fillOf(resolved, drawn) }, style]}>
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={testID ? `${testID}.ripple` : undefined} /> : null}
      {children}
    </Animated.View>
  );
}

/**
 * A number the selection transition hands back — plain when settled, an interpolation while it moves — mapped through
 * a piecewise-linear ramp, extended linearly beyond its ends as `Animated`'s interpolation is (an easing that
 * overshoots). Used for the parts of a mark that grow one after another.
 */
export function ramp(value: Moving<number>, inputRange: number[], outputRange: number[]): Moving<number> {
  if (typeof value !== 'number') return value.interpolate({ inputRange, outputRange });
  let i = 1;
  while (i < inputRange.length - 1 && value > inputRange[i]!) i += 1;
  const from = inputRange[i - 1]!;
  const to = inputRange[i]!;
  if (to === from) return value <= from ? outputRange[i - 1]! : outputRange[i]!;
  return outputRange[i - 1]! + ((outputRange[i]! - outputRange[i - 1]!) * (value - from)) / (to - from);
}

export interface ControlMotion {
  /** The component's state motion (`motionStateDuration` / `motionStateEasing`). */
  state: { duration: number; easing: StateTransitionOptions['easing'] };
  /** The component's selection motion (`motionSelectionDuration` / `motionSelectionEasing`). */
  selection: { duration: number; easing: StateTransitionOptions['easing'] };
  /** The control is in the pressed state: a change the press makes appears at once. */
  pressed: boolean;
}

/**
 * The control's own parts (box, outline, mark; ring, dot; track, handle, glyph) — CHK-5 / RAD-7 / SWT-3: a change the
 * interaction states make moves over the STATE motion, as the container does (at once under a press); a change of
 * CONDITION moves over the SELECTION motion (CHK-13 / RAD-15 / SWT-13). The motion is chosen when the drawn values
 * change and kept for that whole transition, so a press that lands in the middle of one does not restart it.
 */
export function useControlTransition<V extends StateVisuals>(target: V, condition: string, { state, selection, pressed }: ControlMotion): Transitioned<V> {
  const key = JSON.stringify(target);
  const latch = useRef<{ key: string; condition: string; options: StateTransitionOptions } | null>(null);
  const previous = latch.current;
  if (previous === null) latch.current = { key, condition, options: { ...state, immediate: pressed } };
  else if (previous.key !== key) latch.current = { key, condition, options: previous.condition !== condition ? { ...selection } : { ...state, immediate: pressed } };
  else if (previous.condition !== condition) latch.current = { ...previous, condition };
  return useStateTransition(target, latch.current!.options);
}
