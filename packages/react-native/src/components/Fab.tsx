import { useEffect, useMemo, type Ref } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { TanreiFabSize, TanreiFabVariant } from '../generated/vocabulary';
import { IconBox, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { hasAccessibleName } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `filled`, `tonal`, `surface` — plus whatever the product's design system added
 * (its generated file augments `TanreiFabVariantRegistry`).
 */
export type FloatingActionButtonVariant = TanreiFabVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type FloatingActionButtonSize = TanreiFabSize;

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for a FAB: the named values, plus the flattened elevation. */
type Drawn = { container: Moving<string>; icon: Moving<string>; opacity: Moving<number> } & DrawnElevation;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FloatingActionButtonRef = PressableHost;

/**
 * What a function icon receives: the icon color of the current state, the icon size of the button's size
 * (`system.components.fab.sizes.<size>.iconSize`) and the unselected glyph the icon tokens ask for (`iconGlyphStyle`).
 */
export type FloatingActionButtonIconProps = GlyphSlotProps;

export interface FloatingActionButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Emphasis: `filled` (the default) at full strength, `tonal` quieter, `surface` neutral over colored content. Unknown values render as `filled` (FAB-7). */
  variant?: FloatingActionButtonVariant;
  /** Visual size: a square of 40 / 48 / 64 in the default system. The hit area always meets the minimum target. Unknown values render as `medium` (FAB-7). */
  size?: FloatingActionButtonSize;
  /** Prevents interaction and removes the button from the focus order. Hiding a FAB whose action is unavailable is usually better. */
  disabled?: boolean;
  /** The accessible name (the spec's `label`). Required: an icon alone is not a name (FAB-14). */
  accessibilityLabel?: string;
  /** The button was activated by touch, pointer, keyboard or assistive technology (the spec's `click`). */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * The icon. A string is a glyph of the system's icon font (a ligature name such as `'add'`, or a codepoint), drawn with
   * `iconGlyphStyle` in the icon color; a function receives the color, the size and the glyph; any other node is
   * rendered as given.
   */
  icon?: GlyphSlot<FloatingActionButtonIconProps>;
  /** Layout overrides for the container (margins, `position`, `alignSelf`, …). The FAB never positions itself (FAB-13). */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<FloatingActionButtonRef>;
}

/**
 * Tanrei FloatingActionButton — spec: `specs/fab.spec.json`.
 * Anatomy: container > [elevation ring] + [ripple] + icon + focus ring. A raised square of the size's `containerSize`
 * with the size's corners; the icon is decorative and `accessibilityLabel` names the button. Every state is drawn from
 * that state's tokens — elevation included — and the component never computes how a state looks.
 */
export function FloatingActionButton({
  variant = 'filled',
  size = 'medium',
  disabled = false,
  accessibilityLabel,
  icon,
  style,
  testID,
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
}: FloatingActionButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.fab;
  // FAB-7: size and variant are open keys. A value the active system does not have is drawn from the default value's
  // tokens, and reported in development builds only.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'FloatingActionButton size');
  const appearance = lookupValue(tokens.variants, variant, 'filled', 'FloatingActionButton variant');

  // FAB-14: the button still renders without a name; development builds say it has none.
  const unnamed = !hasAccessibleName('', { accessibilityLabel, ...rest });
  useEffect(() => {
    if (__DEV__ && unnamed) {
      console.warn(`Tanrei: a FloatingActionButton${testID ? ` (testID "${testID}")` : ''} has no accessibilityLabel. An icon alone is not an accessible name; give it one.`);
    }
  }, [unnamed, testID]);

  // FAB-10: how far the container's corners ease; `borderCurveOf()` says how React Native draws it.
  const { cornerSmoothing } = theme.system.shape;

  // FAB-8 (pressed at once, held at least `duration.pressHold`), FAB-5 (the minimum target: until the first layout
  // pass, the square of this size), FAB-9 (the ripple) and FAB-3 / FAB-6: one state wins.
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerSize, height: dimensions.containerSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref,
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
  });
  const { state, under, wave } = interaction;
  // Everything drawn comes from that state's tokens. FAB-9 `ripple` (while a ripple draws) and `dim` draw no state layer
  // on the container: its color stays the one of the state under the press (`interaction.layerless`).
  const current = { ...appearance[state], ...(interaction.layerless ? { containerColor: appearance[under].containerColor } : null) };
  // FAB-11: the corners are the size's; a FAB does not change shape with its state, so every state has them.
  const { opacity } = stateShape({ ...tokens, containerShape: dimensions.containerShape }, state);
  const shape = dimensions.containerShape;
  const colors = { container: theme.resolve(current.containerColor), icon: theme.resolve(current.iconColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].containerElevation))), [theme, appearance]);
  // FAB-12: colors, opacity and elevation move with the FAB's motion tokens; the press is immediate.
  const drawn = useStateTransition(
    { ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  const box: ViewStyle = {
    // FAB-13: laid out at its own size where the layout puts it; it never positions itself.
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    // FAB-11: a square that text size never changes — an icon is not text (spec, accessibility notes).
    width: dimensions.containerSize,
    height: dimensions.containerSize,
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  // A paint that resolves to nothing draws nothing: no fill.
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: shape, opacity: drawn.opacity };

  // FAB-11: the unselected glyph at this size's icon size — the unselected family and FILL, the system's weight, opsz
  // clamped to the font's range. The provider's `resolveIconFont` maps it to a font the app loaded.
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(current.iconColor);
  const part = (name: string) => partTestID(testID, name);

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[box, surface, style]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {icon == null ? null : (
        <IconBox
          icon={glyphSlotContent(icon, { color: iconColor, size: dimensions.iconSize, glyph }, drawn.icon, part('glyph'))}
          color={iconColor}
          size={dimensions.iconSize}
          decorative
          testID={part('icon')}
        />
      )}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
