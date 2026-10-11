import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Animated,
  I18nManager,
  Platform,
  Pressable,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type PressableProps,
  type StyleProp,
  type TargetedEvent,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiCoreRadioButtonCondition } from '../generated/vocabulary';
import { Label, drawsColor, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { Ring } from '../primitives/Ring';
import { StateLayer, hasAccessibleName, selectionRow, useControlTransition, useFirstLineAlignment, useNamelessReport, type StateLayerNode } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { lookupValue } from '../theme/lookup';
import { useTanrei } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

// ---------------------------------------------------------------------------------------------------------------
// The group (RAD-3, RAD-4, RAD-5, RAD-16). React Native has no group idiom: `RadioGroup` is the spec's `name`. It draws
// nothing and has no tokens.

/** What an option tells its group, kept current on every render. */
interface OptionEntry {
  value: string;
  selected: boolean;
  disabled: boolean;
  focus: () => void;
  select: () => void;
}

interface OptionState {
  /** The option's `useId()`. */
  uid: string;
  selected: boolean;
  disabled: boolean;
}

interface GroupContext {
  /** Adds an option (in the order options mount) and returns its removal. */
  register: (id: string, entry: { current: OptionEntry }) => () => void;
  /** An option's selection or disabled flag changed. */
  update: (id: string, selected: boolean, disabled: boolean) => void;
  /** An option gained (id) or lost (null) focus. */
  focused: (id: string | null) => void;
  options: readonly OptionState[];
  /** RAD-5: the one option in the tab order — the selected one, else the first enabled one. */
  tabStop: string | undefined;
  positionText: (position: number, count: number) => string;
}

const RadioGroupContext = createContext<GroupContext | null>(null);

/** An English default; a product in another language passes its own `positionText`. */
const englishPosition = (position: number, count: number) => `${position} of ${count}`;

/** The keys that move within a group (RAD-4), as `KeyboardEvent.key` names them; `1` is the next option. */
function step(key: string, rtl: boolean): 1 | -1 | 0 {
  switch (key) {
    case 'ArrowDown':
      return 1;
    case 'ArrowUp':
      return -1;
    case 'ArrowRight':
      return rtl ? -1 : 1;
    case 'ArrowLeft':
      return rtl ? 1 : -1;
    default:
      return 0;
  }
}

/** What a key event carries on a renderer that delivers one (`onKeyDown`). */
interface KeyDownEvent {
  nativeEvent: { key: string };
  preventDefault?: () => void;
}

export interface RadioGroupProps extends ViewProps {
  /** The group's accessible name: the question its options answer. */
  accessibilityLabel?: string;
  /** How an option's position is announced (RAD-16). Default: `"2 of 3"`. */
  positionText?: (position: number, count: number) => string;
  children?: ReactNode;
}

/**
 * The group of radio buttons — the spec's `name` (`specs/radio-button.spec.json`, RAD-3 … RAD-5, RAD-16): role
 * radiogroup with the product's name, each option's position and the group's size, one tab stop, and the arrow keys
 * on a renderer that delivers key events. The options are controlled: each one's `onSelect` fires, and the caller moves
 * `selected` (RAD-3). Order is the order in which options mount.
 */
export function RadioGroup({ accessibilityLabel, positionText = englishPosition, children, ...rest }: RadioGroupProps) {
  const [options, setOptions] = useState<readonly OptionState[]>([]);
  const entries = useRef(new Map<string, { current: OptionEntry }>());
  const focusedId = useRef<string | null>(null);

  const register = useCallback((id: string, entry: { current: OptionEntry }) => {
    entries.current.set(id, entry);
    setOptions((previous) => [...previous.filter((option) => option.uid !== id), { uid: id, selected: entry.current.selected, disabled: entry.current.disabled }]);
    return () => {
      entries.current.delete(id);
      if (focusedId.current === id) focusedId.current = null;
      setOptions((previous) => previous.filter((option) => option.uid !== id));
    };
  }, []);
  const update = useCallback((id: string, selected: boolean, disabled: boolean) => {
    setOptions((previous) => (previous.some((option) => option.uid === id && (option.selected !== selected || option.disabled !== disabled)) ? previous.map((option) => (option.uid === id ? { uid: id, selected, disabled } : option)) : previous));
  }, []);
  const focused = useCallback((id: string | null) => {
    focusedId.current = id;
  }, []);

  const tabStop = (options.find((option) => option.selected && !option.disabled) ?? options.find((option) => !option.disabled))?.uid;

  // RAD-4: the arrow keys move focus to the next (previous) enabled option, wrapping, and select it. Disabled options
  // are skipped (RAD-6). Right-to-left swaps Left and Right.
  // The caller's own handler, when it passed one (untyped: see below), is called first.
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      callerKeyDown?.(event);
      const direction = step(event.nativeEvent.key, I18nManager.isRTL);
      if (direction === 0) return;
      const enabled = options.filter((option) => !option.disabled);
      if (enabled.length === 0) return;
      const from = enabled.findIndex((option) => option.uid === (focusedId.current ?? tabStop));
      const next = enabled[(from + direction + enabled.length) % enabled.length]!;
      event.preventDefault?.();
      const entry = entries.current.get(next.uid)?.current;
      entry?.focus();
      entry?.select();
    },
    [callerKeyDown, options, tabStop],
  );

  const context = useMemo<GroupContext>(() => ({ register, update, focused, options, tabStop, positionText }), [register, update, focused, options, tabStop, positionText]);
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown } as object;
  return (
    <RadioGroupContext.Provider value={context}>
      <View {...rest} {...keys} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The option

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type RadioButtonRef = PressableHost;

export interface RadioButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Whether this option is the one chosen in its group. **Controlled**: set it from `onSelect`. */
  selected?: boolean;
  /** What this option stands for: `onSelect` receives it. */
  value?: string;
  /** Prevents interaction; the option is skipped by the focus order and by the arrow keys. */
  disabled?: boolean;
  /** The text that names the option: drawn at the inline end of the ring and used as the accessible name. */
  label?: string;
  /** Draws no label but keeps `label` as the accessible name. */
  labelHidden?: boolean;
  /** This option became selected by the user (the spec's `change`): its `value`. Never called for an option already selected (RAD-2). */
  onSelect?: (value: string) => void;
  /** Layout overrides for the row (margins, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<RadioButtonRef>;
}

/**
 * Tanrei RadioButton — spec: `specs/radio-button.spec.json`. One option; put the options of one question in a
 * `RadioGroup`. Anatomy: host row > container (the round state layer) > ring > [dot] + focus ring; then the label.
 * Every part is drawn from the tokens of its condition (selected or unselected) in the current interaction state.
 */
export function RadioButton({
  selected = false,
  value = '',
  disabled = false,
  label = '',
  labelHidden = false,
  onSelect,
  style,
  testID,
  accessibilityLabel,
  accessibilityState,
  accessibilityValue,
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
}: RadioButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.radioButton;
  const condition: TanreiCoreRadioButtonCondition = selected ? 'selected' : 'unselected';
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'RadioButton condition');
  const { cornerSmoothing } = theme.system.shape;
  const group = useContext(RadioGroupContext);
  const id = useId();

  // RAD-18: an option without a name still renders; development builds say it has none.
  const name = accessibilityLabel ?? (label.trim() ? label : undefined);
  useNamelessReport('RadioButton', hasAccessibleName(label, { accessibilityLabel, ...rest }), testID);

  // RAD-1 / RAD-2: activation selects; an option already selected stays selected and says nothing. Pressable never
  // calls onPress while disabled (RAD-6).
  const select = useCallback(() => {
    if (!selected && !disabled) onSelect?.(value);
  }, [selected, disabled, onSelect, value]);
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event);
      select();
    },
    [onPress, select],
  );

  // The host, for the group to move focus to (RAD-4); the caller's ref gets it too.
  const host = useRef<PressableHost | null>(null);
  const hostRef = useCallback(
    (node: PressableHost | null) => {
      host.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );
  const entry = useRef<OptionEntry>({ value, selected, disabled, focus: () => undefined, select });
  entry.current = { value, selected, disabled, focus: () => host.current?.focus?.(), select };
  useLayoutEffect(() => group?.register(id, entry), [group?.register, id]);
  useLayoutEffect(() => group?.update(id, selected, disabled), [group?.update, id, selected, disabled]);
  const handleFocus = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      group?.focused(id);
      onFocus?.(event);
    },
    [group?.focused, id, onFocus],
  );
  const handleBlur = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      group?.focused(null);
      onBlur?.(event);
    },
    [group?.focused, onBlur],
  );

  // RAD-11 (pressed at once, held), RAD-9 (the minimum target), RAD-12 (the ripple grows in the round container) and
  // RAD-7: one state wins.
  const area = useRef<StateLayerNode | null>(null);
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: tokens.containerSize, height: tokens.containerSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: hostRef,
    rippleArea: { ref: area, size: { width: tokens.containerSize, height: tokens.containerSize } },
    onPress: handlePress,
    onPressIn,
    onPressOut,
    onTouchEnd,
    onTouchCancel,
    onHoverIn,
    onHoverOut,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onLayout,
  });
  const { state, under, wave } = interaction;
  const current = appearance[state];
  // RAD-12: `ripple` (while one draws) and `dim` draw no layer on the container: it keeps the state under the press.
  const containerPaint = interaction.layerless ? appearance[under].containerColor : current.containerColor;
  const { opacity, shape } = stateShape(tokens, state);
  const container = theme.resolve(containerPaint);
  const drawn = useStateTransition(
    { container, label: theme.resolve(current.labelColor), opacity, shape },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as { container: Moving<string>; label: Moving<string>; opacity: Moving<number>; shape: Moving<number> };

  // RAD-7 / RAD-14 / RAD-15: the ring's and the dot's colors move over the selection motion tokens when the condition
  // changes and over the state motion tokens when a state recolors them (at once under a press); the dot grows from the
  // ring's center over the selection motion. Reduce motion shows every change at once.
  const ringColor = theme.resolve(current.ringColor);
  const dotColor = theme.resolve(current.dotColor);
  const selection = { duration: tokens.motionSelectionDuration, easing: tokens.motionSelectionEasing };
  const colors = useControlTransition({ ring: ringColor, dot: dotColor }, condition, {
    state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
    selection,
    pressed: state === 'pressed',
  }) as { ring: Moving<string>; dot: Moving<string> };
  const dot = useStateTransition({ scale: selected ? 1 : 0 }, selection).scale as Moving<number>;

  // RAD-16: role radio with checked / not checked; iOS has no radio trait, so it also hears the selected trait there.
  // Inside a group: the position and the group's size, as the value.
  const a11yState: AccessibilityState = { ...accessibilityState, disabled, checked: selected, ...(Platform.OS === 'ios' ? { selected } : null) };
  const position = group ? group.options.findIndex((option) => option.uid === id) : -1;
  const a11yValue = group && position >= 0 ? { ...accessibilityValue, text: group.positionText(position + 1, group.options.length) } : accessibilityValue;
  // RAD-5: inside a group only its tab stop is focusable; RAD-6: a disabled option never is.
  const focusable = !disabled && (group === null || group.tabStop === id);

  const part = (partName: string) => partTestID(testID, partName);
  const ringSize = tokens.ringSize;
  const radius = ringSize / 2;
  const ring: ViewStyle = { width: ringSize, height: ringSize, borderRadius: radius, alignItems: 'center', justifyContent: 'center' };
  const dotStyle: ViewStyle = { width: tokens.dotSize, height: tokens.dotSize, borderRadius: tokens.dotSize / 2, pointerEvents: 'none' };
  const labelStyle: TextStyle = { ...theme.text(tokens.labelTypescale), flexShrink: 1 };
  // RAD-17: the control is centered on the label's first line.
  const labelled = Boolean(label) && !labelHidden;
  const align = useFirstLineAlignment(tokens.containerSize, typeof labelStyle.lineHeight === 'number' ? labelStyle.lineHeight : undefined);

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={focusable}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={a11yState}
      accessibilityValue={a11yValue}
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
        <View style={ring} testID={part('ring')}>
          {drawsColor(ringColor, colors.ring) ? <Ring placement="inside" width={tokens.ringWidth} color={colors.ring} radius={radius} testID={part('ring.stroke')} /> : null}
          {dot === 0 ? null : <Animated.View style={[dotStyle, { backgroundColor: colors.dot, transform: [{ scale: dot }] }]} testID={part('dot')} />}
          <FocusRing visible={interaction.focused && !disabled} radius={radius} testID={part('focus-ring')} />
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
