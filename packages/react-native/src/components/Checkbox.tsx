import { useCallback, useRef, type Ref } from 'react';
import { Animated, Pressable, View, type AccessibilityState, type GestureResponderEvent, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiCoreCheckboxCondition } from '../generated/vocabulary';
import { Label, drawsColor, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { tidy } from '../primitives/Arc';
import { CheckMark, type MarkProps } from '../primitives/checkMark';
import { Ring } from '../primitives/Ring';
import { StateLayer, hasAccessibleName, selectionRow, useControlTransition, useFirstLineAlignment, useNamelessReport, type StateLayerNode } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/**
 * The condition a checkbox is drawn in: a key of `system.components.checkbox.conditions` (an open axis, but
 * no prop selects a value a layer added). CHK-4: indeterminate wins over checked, and error selects the error form of
 * whichever applies. The props are closed (three booleans), so this is a plain switch; a key is never built from a name.
 */
export function checkboxCondition(value: boolean, indeterminate: boolean, error: boolean): TanreiCoreCheckboxCondition {
  if (indeterminate) return error ? 'errorIndeterminate' : 'indeterminate';
  if (value) return error ? 'errorSelected' : 'selected';
  return error ? 'errorUnselected' : 'unselected';
}

/**
 * The dash's geometry, as fractions of the box's side (the spec's anatomy, `mark`): it runs across the middle, stroked
 * with square caps. The check is the shared `CheckMark` (src/primitives/checkMark.tsx). The mark is the glyph of the
 * condition, drawn in code like the progress arcs; its stroke (`markWidth`) and color are tokens.
 */
const DASH = { from: 0.1375, to: 0.8625 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CheckboxRef = PressableHost;

export interface CheckboxProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Whether the choice is on (the spec's `checked`). **Controlled**, as React Native's `Switch`: set it from `onValueChange`. */
  value?: boolean;
  /** Draws the choice as partly on (a parent whose children are mixed). Wins over `value` for what is drawn and announced; the caller clears it. */
  indeterminate?: boolean;
  /** Draws the error form of the condition (a required choice left unmade). The message belongs to the surrounding form. */
  error?: boolean;
  /** Prevents interaction and removes the checkbox from the focus order. */
  disabled?: boolean;
  /** The text that names the choice: drawn at the inline end of the box and used as the accessible name. */
  label?: string;
  /** Draws no label but keeps `label` as the accessible name (a row-selection checkbox in a table). */
  labelHidden?: boolean;
  /** The user switched the checkbox (the spec's `change`): the new value — `true` from indeterminate (CHK-2). */
  onValueChange?: (value: boolean) => void;
  /** Layout overrides for the row (margins, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<CheckboxRef>;
}

/**
 * Tanrei Checkbox — spec: `specs/checkbox.spec.json`.
 * Anatomy: host row > container (the round state layer) > box > [fill] + [outline] + [mark] + focus ring; then the label.
 * Every part is drawn from the tokens of its condition in the current interaction state; nothing is computed.
 */
export function Checkbox({
  value = false,
  indeterminate = false,
  error = false,
  disabled = false,
  label = '',
  labelHidden = false,
  onValueChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityState,
  onPress,
  onPressIn,
  onPressOut,
  onTouchEnd,
  onTouchCancel,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  onLayout,
  ref,
  ...rest
}: CheckboxProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.checkbox;
  // CHK-4: the props pick the condition; the holder is read through the total lookup.
  const condition = checkboxCondition(value, indeterminate, error);
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'Checkbox condition');
  const { cornerSmoothing } = theme.system.shape;

  // CHK-16: a checkbox without a name still renders; development builds say it has none.
  const name = accessibilityLabel ?? (label.trim() ? label : undefined);
  useNamelessReport('Checkbox', hasAccessibleName(label, { accessibilityLabel, ...rest }), testID);

  // CHK-1 / CHK-2: activation asks for the opposite of `value`, and for `true` from indeterminate. Pressable never
  // calls onPress while disabled (CHK-3).
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event);
      onValueChange?.(indeterminate ? true : !value);
    },
    [onPress, onValueChange, indeterminate, value],
  );

  // CHK-9 (pressed at once, held), CHK-7 (the minimum target: until the first layout pass, the container's square),
  // CHK-10 (the ripple grows in the round container, not in the row) and CHK-5: one state wins.
  const area = useRef<StateLayerNode | null>(null);
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: tokens.containerSize, height: tokens.containerSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref,
    rippleArea: { ref: area, size: { width: tokens.containerSize, height: tokens.containerSize } },
    onPress: handlePress,
    onPressIn,
    onPressOut,
    onTouchEnd,
    onTouchCancel,
    onHoverIn,
    onHoverOut,
    onFocus,
    onBlur,
    onLayout,
  });
  const { state, under, wave } = interaction;
  const current = appearance[state];
  // CHK-10: `ripple` (while one draws) and `dim` draw no layer on the container: it keeps the state under the press.
  const containerPaint = interaction.layerless ? appearance[under].containerColor : current.containerColor;
  const { opacity, shape } = stateShape(tokens, state);
  const container = theme.resolve(containerPaint);
  // The state layer, the label and the opacity move with the state motion tokens; a press is immediate.
  const drawn = useStateTransition(
    { container, label: theme.resolve(current.labelColor), opacity, shape },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as { container: Moving<string>; label: Moving<string>; opacity: Moving<number>; shape: Moving<number> };

  // CHK-5 / CHK-13: the box, its outline and the mark change over the selection motion tokens when the condition changes
  // and over the state motion tokens when a state recolors them (at once under a press); the check draws along its
  // path, the dash grows from its center, and both reverse when the mark goes away. Reduce motion shows every change at
  // once (useStateTransition).
  const checked = condition === 'selected' || condition === 'errorSelected';
  const dashed = condition === 'indeterminate' || condition === 'errorIndeterminate';
  const colors = { box: theme.resolve(current.boxColor), outline: theme.resolve(current.outlineColor), mark: theme.resolve(current.markColor) };
  const selection = { duration: tokens.motionSelectionDuration, easing: tokens.motionSelectionEasing };
  const mark = useControlTransition(colors, condition, {
    state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
    selection,
    pressed: state === 'pressed',
  }) as { box: Moving<string>; outline: Moving<string>; mark: Moving<string> };
  // One transition per mark, so that a mark moves only when its own condition changes: at rest it is a plain 0 or 1,
  // and a mark at 0 has no node at all.
  const check = useStateTransition({ progress: checked ? 1 : 0 }, selection).progress as Moving<number>;
  const dash = useStateTransition({ progress: dashed ? 1 : 0 }, selection).progress as Moving<number>;

  const part = (partName: string) => partTestID(testID, partName);
  const side = tokens.boxSize;
  const stroke = tokens.markWidth;
  const box: ViewStyle = { width: side, height: side, borderRadius: tokens.boxShape, ...borderCurveOf(cornerSmoothing) };
  // The fill sits inside the outline, never under it (CHK-12): a translucent fill and outline do not stack.
  const inset = tokens.outlineWidth;
  const fill = fillOf(colors.box, mark.box);
  const fillStyle: ViewStyle = { position: 'absolute', top: inset, right: inset, bottom: inset, left: inset, borderRadius: Math.max(0, tokens.boxShape - inset), pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
  const labelStyle: TextStyle = { ...theme.text(tokens.labelTypescale), flexShrink: 1 };
  // CHK-15: the control is centered on the label's first line.
  const labelled = Boolean(label) && !labelHidden;
  const align = useFirstLineAlignment(tokens.containerSize, typeof labelStyle.lineHeight === 'number' ? labelStyle.lineHeight : undefined);

  // CHK-14: role checkbox, checked / not checked / mixed. React Native has no invalid state (README, "Checkbox").
  const a11yState: AccessibilityState = { ...accessibilityState, disabled, checked: indeterminate ? 'mixed' : value };

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={name}
      accessibilityState={a11yState}
      style={[selectionRow(tokens.labelGap), { opacity: drawn.opacity }, style]}
    >
      <StateLayer
        size={tokens.containerSize}
        shape={drawn.shape}
        resolved={container}
        drawn={drawn.container}
        wave={wave}
        rippleColor={theme.paint(appearance.pressed.containerColor)}
        cornerSmoothing={cornerSmoothing}
        areaRef={area}
        style={labelled ? align.control : undefined}
        testID={part('container')}
      >
        <View style={box} testID={part('box')}>
          {fill === undefined ? null : <Animated.View style={[fillStyle, { backgroundColor: fill }]} testID={part('fill')} />}
          {drawsColor(colors.outline, mark.outline) ? <Ring placement="inside" width={inset} color={mark.outline} radius={tokens.boxShape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
          <CheckMark progress={check} color={mark.mark} side={side} stroke={stroke} testID={part('check')} />
          <DashMark progress={dash} color={mark.mark} side={side} stroke={stroke} testID={part('dash')} />
          <FocusRing visible={interaction.focused && !disabled} radius={tokens.boxShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
        </View>
      </StateLayer>
      {labelled ? (
        <Label style={{ ...labelStyle, ...align.label }} color={drawn.label} onTextLayout={align.onTextLayout} testID={part('label')}>
          {label}
        </Label>
      ) : null}
    </AnimatedPressable>
  );
}

/** CHK-12 / CHK-13: the dash, a horizontal stroke across the middle of the box, grown from its center by `progress`. */
function DashMark({ progress, color, side, stroke, testID }: MarkProps) {
  if (progress === 0) return null;
  const style: ViewStyle = { position: 'absolute', left: tidy(DASH.from * side - stroke / 2), top: (side - stroke) / 2, width: tidy((DASH.to - DASH.from) * side + stroke), height: stroke, pointerEvents: 'none' };
  return <Animated.View style={[style, { backgroundColor: color, transform: [{ scaleX: progress }] }]} testID={testID} />;
}
