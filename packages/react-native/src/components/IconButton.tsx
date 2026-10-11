import { useCallback, useEffect, type ReactNode, type Ref } from 'react';
import { Animated, I18nManager, Pressable, type AccessibilityState, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { TanreiIconButtonSize, TanreiIconButtonVariant, TanreiIconButtonVariantStateTokens, TanreiPaint } from '../generated/vocabulary';
import { IconBox, drawsColor, fillOf, partTestID, textContent, type IconSlotProps } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { cornerRadii, groupCorners, groupHitSlop, useGroupItem } from '../primitives/groupItem';
import { rovingHitSlop, useRovingItem, useRovingItemHandlers } from '../primitives/rovingItem';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle, type TanreiIconGlyph } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `standard`, `filled`, `tonal`, `outlined` — plus whatever the product's design
 * system added (its generated file augments `TanreiIconButtonVariantRegistry`).
 */
export type IconButtonVariant = TanreiIconButtonVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type IconButtonSize = TanreiIconButtonSize;

/**
 * Which parts of a variant an icon button is drawn from (ICB-12): a plain button reads the variant's own
 * parts, a toggle reads its `unselected.` or `selected.` parts. A condition, not a state: every interaction state has all three.
 */
type Look = 'plain' | 'unselected' | 'selected';

/** The paints of one look in one state. Looks are closed (the spec's conditions), so this switch stays. */
function lookPaints(tokens: TanreiIconButtonVariantStateTokens, look: Look): { container: TanreiPaint; icon: TanreiPaint; outline: TanreiPaint } {
  switch (look) {
    case 'plain':
      return { container: tokens.containerColor, icon: tokens.iconColor, outline: tokens.outlineColor };
    case 'unselected':
      return { container: tokens.unselectedContainerColor, icon: tokens.unselectedIconColor, outline: tokens.unselectedOutlineColor };
    case 'selected':
      return { container: tokens.selectedContainerColor, icon: tokens.selectedIconColor, outline: tokens.selectedOutlineColor };
  }
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for an icon button. */
type Drawn = { container: Moving<string>; icon: Moving<string>; outline: Moving<string>; opacity: Moving<number>; shape: Moving<number> };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type IconButtonRef = PressableHost;

/**
 * What a function icon receives: the icon color of the current state and look, the icon size of the button's size
 * (`system.components.iconButton.sizes.<size>.iconSize`), whether the icon is drawn SELECTED (a toggle that is on),
 * and the glyph the icon tokens ask for (`iconGlyphStyle`: family of the selection state, FILL, wght, clamped opsz) —
 * for a renderer that draws its own glyph, an SVG or a static font instance.
 */
export interface IconButtonIconProps extends IconSlotProps {
  selected: boolean;
  glyph: TanreiIconGlyph;
}

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Emphasis. `standard` is the quiet default; `filled` marks the one most important icon action in a view. Unknown values render as `standard` (ICB-7). */
  variant?: IconButtonVariant;
  /** Visual size (a square). The hit area always meets the minimum target. Unknown values render as `medium` (ICB-7). */
  size?: IconButtonSize;
  /** A two-state control: activation calls `onSelectedChange(!selected)`, and assistive technology hears selected / not selected. */
  toggle?: boolean;
  /** Whether a toggle is on. Controlled, as `Switch`'s `value` is: the button never changes it itself. Ignored unless `toggle`. */
  selected?: boolean;
  /** Prevents interaction and removes the button from the focus order. */
  disabled?: boolean;
  /** The accessible name (the spec's `label`). Required: an icon alone is not a name (ICB-14). */
  accessibilityLabel?: string;
  /** The button was activated by touch, pointer, keyboard or assistive technology (the spec's `click`). */
  onPress?: (event: GestureResponderEvent) => void;
  /** A toggle was activated: the new value of `selected` (the spec's `change`). */
  onSelectedChange?: (selected: boolean) => void;
  /**
   * The icon. A string is a glyph of the system's icon font (a ligature name such as `'favorite'`, or a codepoint),
   * drawn with `iconGlyphStyle` in the icon color; a function receives the color, the size, `selected` and the glyph;
   * any other node is rendered as given.
   */
  children?: ReactNode | ((props: IconButtonIconProps) => ReactNode);
  /** Layout overrides for the container (margins, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<IconButtonRef>;
}

/** An accessible name, from any of the props React Native reads one from. */
function hasName(props: { accessibilityLabel?: string; 'aria-label'?: string; 'aria-labelledby'?: string; accessibilityLabelledBy?: string | string[] }): boolean {
  const labelledBy = props['aria-labelledby'] ?? props.accessibilityLabelledBy;
  return Boolean(props.accessibilityLabel?.trim() || props['aria-label']?.trim() || (Array.isArray(labelledBy) ? labelledBy.length : labelledBy));
}

/**
 * Tanrei IconButton — spec: `specs/icon-button.spec.json`.
 * Anatomy: container > [outline] + icon + focus ring. A square of the size's `containerSize`; the icon is decorative and
 * `accessibilityLabel` names the button. Every state is drawn from that state's tokens, of the look its toggle is in.
 */
export function IconButton({
  variant = 'standard',
  size = 'medium',
  toggle = false,
  selected = false,
  disabled = false,
  accessibilityLabel,
  onSelectedChange,
  children,
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
}: IconButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.iconButton;
  // ICB-7: size and variant are open keys. A value the active system does not have is drawn from the default value's
  // tokens, and reported in development builds only.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'IconButton size');
  const appearance = lookupValue(tokens.variants, variant, 'standard', 'IconButton variant');
  // ICB-12: a plain button reads the variant's own parts; a toggle its `selected.` or `unselected.` parts.
  const look: Look = toggle ? (selected ? 'selected' : 'unselected') : 'plain';
  // ICB-13: the icon is drawn SELECTED only when the button is a toggle and it is on.
  const iconSelected = toggle && selected;

  // ICB-14: the button still renders without a name; development builds say it has none.
  const unnamed = !hasName({ accessibilityLabel, ...rest });
  useEffect(() => {
    if (__DEV__ && unnamed) {
      console.warn(`Tanrei: an IconButton${testID ? ` (testID "${testID}")` : ''} has no accessibilityLabel. An icon alone is not an accessible name; give it one.`);
    }
  }, [unnamed, testID]);

  // ICB-10: how far the container's corners ease; `borderCurveOf()` says how React Native draws it.
  const { cornerSmoothing } = theme.system.shape;
  // ICB-10 (BGR-1 … BGR-4): inside a button group, the group sets where the button sits in the row, its inner corners
  // and minimum width (connected) and how far its hit area reaches toward a neighbour — an internal channel, not a
  // prop. Outside a group this is null and nothing changes.
  const group = useGroupItem();
  const groupLayout = group?.onLayout;
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      groupLayout?.(event);
      onLayout?.(event);
    },
    [groupLayout, onLayout],
  );

  // ICB-11: a toggle's activation asks for the opposite of `selected`, after the click. Pressable never calls onPress
  // while disabled (ICB-2).
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event);
      if (toggle) onSelectedChange?.(!selected);
    },
    [onPress, toggle, selected, onSelectedChange],
  );

  // ICB-8 (pressed at once, held at least `duration.pressHold`), ICB-5 (the minimum target: until the first layout
  // pass, the square of this size), ICB-9 (the ripple) and ICB-3 / ICB-6: one state wins.
  // TBR-10: inside a toolbar the toolbar is ONE Tab stop over its items — an internal channel, not a prop: only its Tab
  // stop is focusable, the arrow keys move focus among the others, and a focused item is brought into view. Outside a
  // toolbar this is null and nothing changes.
  const roving = useRovingItem();
  const own = useRovingItemHandlers(roving, { ref, onFocus, onLayout: group ? handleLayout : onLayout });

  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerSize, height: dimensions.containerSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: own.ref,
    onPress: handlePress,
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
  // Everything drawn comes from that state's tokens, of this look. ICB-9 `ripple` (while a ripple draws) and `dim` draw
  // no state layer on the container: its color stays the one of the state under the press.
  const paints = lookPaints(appearance[state], look);
  const container = interaction.layerless ? lookPaints(appearance[under], look).container : paints.container;
  const { opacity, shape } = stateShape(tokens, state);
  const colors = { container: theme.resolve(container), icon: theme.resolve(paints.icon), outline: theme.resolve(paints.outline) };
  // Press feedback is immediate; every other change — a toggle switching look included — uses the motion tokens.
  const drawn = useStateTransition(
    { ...colors, opacity, shape },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;

  const box: ViewStyle = {
    alignSelf: group?.alignSelf ?? roving?.alignSelf ?? 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    // A square that text size never changes: an icon is not text (spec, accessibility notes). In a connected group
    // (BGR-1, BGR-3) it is at least a target wide, its icon centred, and as tall as the tallest item.
    width: Math.max(dimensions.containerSize, group?.minWidth ?? 0),
    ...(group?.alignSelf === 'stretch' ? { minHeight: dimensions.containerSize } : { height: dimensions.containerSize }),
    ...borderCurveOf(cornerSmoothing),
  };
  // A paint that resolves to nothing draws nothing: no fill, no outline element.
  // BGR-2: in a connected group the corners toward a neighbour are the group's; the fill, outline, ripple and focus
  // ring follow them (the outer ones are the state's shape, without a morph).
  const corners = groupCorners(group, shape) ?? undefined;
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), ...(corners ? cornerRadii(corners) : { borderRadius: drawn.shape }), opacity: drawn.opacity };
  const outlined = dimensions.outlineWidth > 0 && drawsColor(colors.outline, drawn.outline);

  // ICB-13: the glyph of the selection state at this size's icon size — family and FILL of the selection, the system's
  // weight, opsz clamped to the font's range. The provider's `resolveIconFont` maps it to a font the app loaded.
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: iconSelected, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(paints.icon);
  const content = typeof children === 'function' ? null : textContent(children);
  const icon: ReactNode =
    typeof children === 'function' ? (
      children({ color: iconColor, size: dimensions.iconSize, selected: iconSelected, glyph })
    ) : content?.textOnly ? (
      // Font scaling off: the glyph is the icon, drawn at the icon size, not text that grows.
      <Animated.Text style={[glyph.style, { color: drawn.icon, textAlign: 'center' }]} allowFontScaling={false} testID={partTestID(testID, 'glyph')}>
        {content.text}
      </Animated.Text>
    ) : (
      children
    );

  // ICB-11: only a toggle exposes a selected state; a plain button never does, whatever the caller's state says.
  const { selected: _callerSelected, ...callerState } = accessibilityState ?? {};
  const a11yState: AccessibilityState = { ...callerState, disabled, ...(toggle ? { selected } : null) };
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
      accessibilityLabel={accessibilityLabel}
      accessibilityState={a11yState}
      style={[box, surface, style]}
    >
      {outlined ? <Ring placement="inside" width={dimensions.outlineWidth} color={drawn.outline} radius={drawn.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(lookPaints(appearance.pressed, look).container)} radius={drawn.shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {children == null ? null : <IconBox icon={icon} color={iconColor} size={dimensions.iconSize} decorative testID={part('icon')} />}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
