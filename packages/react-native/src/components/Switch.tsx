import { useCallback, useMemo, useRef, type Ref } from 'react';
import { Animated, Pressable, View, type AccessibilityState, type GestureResponderEvent, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiCoreSwitchCondition } from '../generated/vocabulary';
import { IconBox, Label, drawsColor, fillOf, partTestID } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { Ring } from '../primitives/Ring';
import { StateLayer, hasAccessibleName, selectionRow, useControlTransition, useFirstLineAlignment, useNamelessReport, type StateLayerNode } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type SwitchRef = PressableHost;

export interface SwitchProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Whether the setting is on (the spec's `selected`). **Controlled**, as React Native's own `Switch`: set it from `onValueChange`. */
  value?: boolean;
  /** Prevents interaction and removes the switch from the focus order. */
  disabled?: boolean;
  /** The text that names the setting: drawn at the inline end of the track and used as the accessible name. */
  label?: string;
  /** Draws no label but keeps `label` as the accessible name (a switch in a list row whose headline names it). */
  labelHidden?: boolean;
  /** The glyph (a name in the system's icon font, e.g. `'check'`) the handle shows while on. Empty shows none. */
  selectedIcon?: string;
  /** The glyph the handle shows while off. Empty shows none. */
  unselectedIcon?: string;
  /** The user switched it (the spec's `change`): the new value. */
  onValueChange?: (value: boolean) => void;
  /** Layout overrides for the row (margins, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<SwitchRef>;
}

/** What the selection transition hands back for a switch: the track and the handle, and the handle's elevation. */
type DrawnSelection = { track: Moving<string>; outline: Moving<string>; handle: Moving<string>; icon: Moving<string>; size: Moving<number>; radius: Moving<number>; start: Moving<number> } & DrawnElevation;

/**
 * Tanrei Switch — spec: `specs/switch.spec.json`. Not React Native's core `Switch`, which cannot draw these tokens.
 * Anatomy: host row > track > [fill] + [outline] + container (the round state layer, centered on the handle and moving
 * with it) > handle > [icon]; the focus ring around the track; then the label. Every part is drawn from the tokens of
 * its condition (selected or unselected) in the current interaction state.
 */
export function Switch({
  value = false,
  disabled = false,
  label = '',
  labelHidden = false,
  selectedIcon = '',
  unselectedIcon = '',
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
}: SwitchProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.switch;
  const condition: TanreiCoreSwitchCondition = value ? 'selected' : 'unselected';
  const appearance = lookupValue(tokens.conditions, condition, 'unselected', 'Switch condition');
  const { cornerSmoothing } = theme.system.shape;

  // SWT-16: a switch without a name still renders; development builds say it has none.
  const name = accessibilityLabel ?? (label.trim() ? label : undefined);
  useNamelessReport('Switch', hasAccessibleName(label, { accessibilityLabel, ...rest }), testID);

  // SWT-1: activation asks for the opposite of `value`. Pressable never calls onPress while disabled (SWT-2).
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event);
      onValueChange?.(!value);
    },
    [onPress, onValueChange, value],
  );

  // SWT-7 (pressed at once, held), SWT-5 (the minimum target: until the first layout pass, the track), SWT-8 (the
  // ripple grows in the round container around the handle) and SWT-3: one state wins.
  const area = useRef<StateLayerNode | null>(null);
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: tokens.trackWidth, height: tokens.trackHeight },
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
  // SWT-8: `ripple` (while one draws) and `dim` draw no layer on the container: it keeps the state under the press.
  const containerPaint = interaction.layerless ? appearance[under].containerColor : current.containerColor;
  const { opacity, shape } = stateShape(tokens, state);
  const container = theme.resolve(containerPaint);
  const drawn = useStateTransition(
    { container, label: theme.resolve(current.labelColor), opacity, shape },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as { container: Moving<string>; label: Moving<string>; opacity: Moving<number>; shape: Moving<number> };

  // SWT-12: the glyph of the condition, when that condition has one; the handle is then at least size-with-icon.
  const glyphName = value ? selectedIcon : unselectedIcon;
  const handleSize = glyphName ? Math.max(current.handleSize, tokens.handleSizeWithIcon) : current.handleSize;
  // SWT-10: the handle's center lies on the track's midline, half the track height from the inline-start end (off) or
  // the inline-end end (on). The container is centered on it; `start` is logical, so right-to-left mirrors the
  // positions and the travel (SWT-11).
  const center = value ? tokens.trackWidth - tokens.trackHeight / 2 : tokens.trackHeight / 2;
  // SWT-13: when the condition changes, position, size, colors and elevation of the handle, and the track's colors, move
  // together over the selection motion tokens (the switch's spring); SWT-3: when a state changes them (a handle that grows
  // under a press), over the state motion tokens, at once under a press. Reduce motion shows every change at once.
  const shadowCount = useMemo(
    () => shadowLayerCount(Object.values(tokens.conditions).flatMap((each) => INTERACTION_STATES.map((name) => theme.elevationLayers(each[name].handleElevation)))),
    [theme, tokens.conditions],
  );
  const colors = { track: theme.resolve(current.trackColor), outline: theme.resolve(current.outlineColor), handle: theme.resolve(current.handleColor) };
  const selection = useControlTransition(
    { ...colors, icon: theme.resolve(current.iconColor), size: handleSize, radius: handleSize / 2, start: center - tokens.containerSize / 2, ...elevationVisuals(theme.elevationLayers(current.handleElevation), shadowCount) },
    condition,
    {
      state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
      selection: { duration: tokens.motionSelectionDuration, easing: tokens.motionSelectionEasing },
      pressed: state === 'pressed',
    },
  ) as DrawnSelection;
  const elevation = useElevationDrawing(selection, theme.elevation(current.handleElevation), shadowCount);

  const part = (partName: string) => partTestID(testID, partName);
  const inset = tokens.outlineWidth;
  const track: ViewStyle = { width: tokens.trackWidth, height: tokens.trackHeight, borderRadius: tokens.trackShape, ...borderCurveOf(cornerSmoothing) };
  // The fill sits inside the outline, never under it (SWT-10).
  const trackFill = fillOf(colors.track, selection.track);
  const fillStyle: ViewStyle = { position: 'absolute', top: inset, right: inset, bottom: inset, left: inset, borderRadius: Math.max(0, tokens.trackShape - inset), pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
  // The round container may extend beyond the track without affecting layout: it is absolute.
  const layerPosition: ViewStyle = { position: 'absolute', top: (tokens.trackHeight - tokens.containerSize) / 2 };
  const handleStyle: ViewStyle = { alignItems: 'center', justifyContent: 'center', ...elevation.shadow };
  const labelStyle: TextStyle = { ...theme.text(tokens.labelTypescale), flexShrink: 1 };
  // SWT-15: the track is centered on the label's first line.
  const labelled = Boolean(label) && !labelHidden;
  const align = useFirstLineAlignment(tokens.trackHeight, typeof labelStyle.lineHeight === 'number' ? labelStyle.lineHeight : undefined);

  // SWT-12: the family and fill of the condition, the system's weight, the optical size clamped to the font's range.
  const glyph = glyphName ? iconGlyphStyle(theme.system.icon, tokens.iconSize, { selected: value, resolveFont: theme.resolveIconFont }) : null;

  // SWT-14: role switch with checked (on / off) — never a checkbox. The icon is not exposed.
  const a11yState: AccessibilityState = { ...accessibilityState, disabled, checked: value };

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      accessibilityRole="switch"
      accessibilityLabel={name}
      accessibilityState={a11yState}
      style={[selectionRow(tokens.labelGap), { opacity: drawn.opacity }, style]}
    >
      <View style={[track, labelled ? align.control : null]} testID={part('track')}>
        {trackFill === undefined ? null : <Animated.View style={[fillStyle, { backgroundColor: trackFill }]} testID={part('track.fill')} />}
        {drawsColor(colors.outline, selection.outline) ? <Ring placement="inside" width={inset} color={selection.outline} radius={tokens.trackShape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
        <StateLayer
          size={tokens.containerSize}
          shape={drawn.shape}
          resolved={container}
          drawn={drawn.container}
          wave={wave}
          rippleColor={theme.paint(appearance.pressed.containerColor)}
          cornerSmoothing={cornerSmoothing}
          areaRef={area}
          style={[layerPosition, { start: selection.start }]}
          testID={part('container')}
        >
          <Animated.View style={[handleStyle, { width: selection.size, height: selection.size, borderRadius: selection.radius, backgroundColor: fillOf(colors.handle, selection.handle) }]} testID={part('handle')}>
            {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={selection.radius} testID={part('handle.elevation-ring')} /> : null}
            {glyph ? (
              <IconBox
                icon={
                  <Animated.Text style={[glyph.style, { color: selection.icon, textAlign: 'center' }]} allowFontScaling={false} testID={part('glyph')}>
                    {glyphName}
                  </Animated.Text>
                }
                color={theme.paint(current.iconColor)}
                size={tokens.iconSize}
                decorative
                testID={part('icon')}
              />
            ) : null}
          </Animated.View>
        </StateLayer>
        <FocusRing visible={interaction.focused && !disabled} radius={tokens.trackShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
      </View>
      {labelled ? (
        <Label style={{ ...labelStyle, ...align.label }} color={drawn.label} onTextLayout={align.onTextLayout} testID={part('label')}>
          {label}
        </Label>
      ) : null}
    </AnimatedPressable>
  );
}
