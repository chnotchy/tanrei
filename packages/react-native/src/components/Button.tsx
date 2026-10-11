import { useCallback, useMemo, type ReactNode, type Ref } from 'react';
import { Animated, I18nManager, Pressable, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiButtonSize, TanreiButtonVariant } from '../generated/vocabulary';
import { IconBox, Label, drawsColor, fillOf, partTestID, textContent, type IconSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { cornerRadii, groupCorners, groupHitSlop, useGroupItem } from '../primitives/groupItem';
import { INTERACTION_STATES } from '../primitives/interaction';
import { rovingHitSlop, useRovingItem, useRovingItemHandlers } from '../primitives/rovingItem';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `filled`, `tonal`, `elevated`, `outlined`, `text` — plus whatever the
 * product's design system added (its generated file augments `TanreiButtonVariantRegistry`).
 */
export type ButtonVariant = TanreiButtonVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type ButtonSize = TanreiButtonSize;

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for a Button: the named values, plus the flattened elevation. */
type Drawn = { container: Moving<string>; label: Moving<string>; outline: Moving<string>; opacity: Moving<number>; shape: Moving<number> } & DrawnElevation;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonRef = PressableHost;

/** What a function `icon` receives: the label color of the current state, and `iconSize` of the button's size (`system.components.button.sizes.<size>.iconSize`). */
export type ButtonIconProps = IconSlotProps;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Emphasis level. Use one filled button per view for the main action. A value the active system does not have renders as `filled` (BTN-7). */
  variant?: ButtonVariant;
  /** Visual height. The hit area always meets the minimum target. A value the active system does not have renders as `medium` (BTN-7). */
  size?: ButtonSize;
  /** Prevents interaction and removes the button from the focus order. */
  disabled?: boolean;
  /** The button was activated by touch, pointer, keyboard or assistive technology. */
  onPress?: (event: GestureResponderEvent) => void;
  /** Leading icon: a node, or a function that receives the label color and the icon size. */
  icon?: ReactNode | ((props: ButtonIconProps) => ReactNode);
  /** Label. Strings and numbers are rendered in the label type style; other nodes are rendered as given. */
  children?: ReactNode;
  /** Layout overrides for the container (margins, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<ButtonRef>;
}

/**
 * Tanrei Button — spec: `specs/button.spec.json`.
 * Anatomy: container > [elevation ring | outline] + icon + label + focus ring.
 * Every state is drawn from that state's tokens; the component never computes how a state looks.
 */
export function Button({
  variant = 'filled',
  size = 'medium',
  disabled = false,
  icon,
  children,
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
}: ButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.button;
  // BTN-7: size and variant are open keys. A value the active system does not have is drawn from the default
  // value's tokens, and reported in development builds only.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'Button size');
  const appearance = lookupValue(tokens.variants, variant, 'filled', 'Button variant');

  // BTN-10: how far the container's corners ease — 0 a quarter circle, 0.6 the iOS continuous corner. iOS has
  // only the OS's curve and draws it for any amount above 0; Android stays circular. `borderCurveOf()` says how.
  const { cornerSmoothing } = theme.system.shape;
  // BTN-10 (BGR-1 … BGR-4, BGR-7): inside a button group, the group sets where the button sits in the row, its inner
  // corners and minimum width (connected) and how far its hit area reaches toward a neighbour — an internal channel,
  // not a prop. Outside a group this is null and nothing changes.
  const group = useGroupItem();
  const groupLayout = group?.onLayout;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      groupLayout?.(event);
      onLayout?.(event);
    },
    [groupLayout, onLayout],
  );

  // BTN-8 (pressed at once, held at least `duration.pressHold`), BTN-5 (the minimum target; until the first layout pass,
  // assume the smallest box this size can have), BTN-9 (`ripple`: grows over the component's feedback duration with the
  // state easing, fades over the state duration once the held press is over), and BTN-3 / BTN-6: one state wins.
  // TBR-10: inside a toolbar the toolbar is ONE Tab stop over its items — an internal channel, not a prop: only its Tab
  // stop is focusable, the arrow keys move focus among the others, and a focused item is brought into view. Outside a
  // toolbar this is null and nothing changes.
  const roving = useRovingItem();
  const own = useRovingItemHandlers(roving, { ref, onFocus, onLayout: group ? handleLayout : onLayout });

  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerHeight, height: dimensions.containerHeight },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: own.ref,
    onPress,
    onPressIn,
    onPressOut,
    onTouchEnd,
    onTouchCancel,
    onHoverIn,
    onHoverOut,
    onFocus: own.onFocus,
    onBlur,
    onLayout: own.onLayout,
  });
  const { state, under, wave } = interaction;
  // Everything drawn comes from that state's tokens. BTN-9 `ripple` (while a ripple draws) and `dim` draw no state
  // layer on the container: its color stays the one of the state under the press (`interaction.layerless`).
  const current = { ...appearance[state], ...stateShape(tokens, state), ...(interaction.layerless ? { containerColor: appearance[under].containerColor } : null) };
  const colors = { container: theme.resolve(current.containerColor), label: theme.resolve(current.labelColor), outline: theme.resolve(current.outlineColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].containerElevation))), [theme, appearance]);
  // Press feedback is immediate; every other change uses the component's motion tokens — elevation included.
  const drawn = useStateTransition(
    { ...colors, opacity: current.opacity, shape: current.shape, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;
  const labelColor = theme.paint(current.labelColor);
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  const container: ViewStyle = {
    alignSelf: group?.alignSelf ?? roving?.alignSelf ?? 'flex-start',
    ...(group && group.minWidth > 0 ? { minWidth: group.minWidth } : null),
    ...(group?.shrinks ? { flexShrink: 1 } : null),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: dimensions.containerGap,
    // A minimum: the container grows with the label at larger font scales.
    minHeight: dimensions.containerHeight,
    paddingStart: icon == null ? dimensions.containerPaddingInlineStart : dimensions.containerPaddingInlineStartWithIcon,
    paddingEnd: dimensions.containerPaddingInlineEnd,
    paddingVertical: dimensions.containerPaddingBlock,
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  // A paint that resolves to nothing draws nothing: no fill, no outline element.
  // BGR-2: in a connected group the corners toward a neighbour are the group's; the fill, rings, ripple and focus ring
  // follow them (the outer ones are the state's shape, without a morph).
  const corners = groupCorners(group, current.shape) ?? undefined;
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), ...(corners ? cornerRadii(corners) : { borderRadius: drawn.shape }), opacity: drawn.opacity };
  const outlined = dimensions.outlineWidth > 0 && drawsColor(colors.outline, drawn.outline);
  const label: TextStyle = { ...theme.text(dimensions.labelTypescale), flexShrink: 1, textAlign: 'center' };

  const content = textContent(children);
  const part = (name: string) => partTestID(testID, name);

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      hitSlop={rovingHitSlop(groupHitSlop(interaction.hostProps.hitSlop, group, I18nManager.isRTL), roving, I18nManager.isRTL)}
      testID={testID}
      disabled={disabled}
      focusable={!disabled && (roving?.tabStop ?? true)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? content.text}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[container, surface, style]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={drawn.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {outlined ? <Ring placement="inside" width={dimensions.outlineWidth} color={drawn.outline} radius={drawn.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={drawn.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {icon == null ? null : <IconBox icon={icon} color={labelColor} size={dimensions.iconSize} testID={part('icon')} />}
      {content.textOnly ? (
        <Label style={label} color={drawn.label} testID={part('label')}>
          {children}
        </Label>
      ) : (
        children
      )}
      <FocusRing visible={interaction.focused && !disabled} radius={current.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
