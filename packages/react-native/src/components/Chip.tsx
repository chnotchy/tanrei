import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  Animated,
  I18nManager,
  Image,
  Pressable,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type ImageStyle,
  type Insets,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { TanreiChipSize, TanreiChipVariant, TanreiChipVariantStateTokens, TanreiElevationLevel, TanreiPaint } from '../generated/vocabulary';
import { IconBox, Label, drawsColor, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES, resolveInteractionState } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { hasAccessibleName, ramp, useControlTransition, type StateLayerNode } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/** What the chip does (the spec's `kind`): a closed choice of role and parts, not a look. */
export type ChipKind = 'action' | 'filter' | 'input';
const KINDS: readonly ChipKind[] = ['action', 'filter', 'input'];

/**
 * Open keys: the core values — `outlined`, `elevated` — plus whatever the product's design system added (its
 * generated file augments `TanreiChipVariantRegistry`).
 */
export type ChipVariant = TanreiChipVariant;
/** Open keys: the core values — `small`, `medium` — plus whatever the product's design system added. */
export type ChipSize = TanreiChipSize;

/**
 * The glyphs the chip draws itself, by their names in the system's icon font (CHP-13, CHP-14): the check of a filter
 * chip that is on, and the remove action's close glyph. Names, like the ones a caller passes as `icon`.
 */
const CHECK_GLYPH = 'check';
const REMOVE_GLYPH = 'close';

/**
 * Which parts of a variant a chip is drawn from (CHP-12): a filter chip that is on reads its variant's
 * `selected.` parts; every other chip reads the variant's own parts. A condition, not a state.
 */
type Look = 'plain' | 'selected';

/** The parts of one look in one state. Looks are closed (the spec's conditions), so this switch stays. */
function lookParts(tokens: TanreiChipVariantStateTokens, look: Look): { container: TanreiPaint; elevation: TanreiElevationLevel; outline: TanreiPaint; label: TanreiPaint; icon: TanreiPaint } {
  switch (look) {
    case 'plain':
      return { container: tokens.containerColor, elevation: tokens.containerElevation, outline: tokens.outlineColor, label: tokens.labelColor, icon: tokens.iconColor };
    case 'selected':
      return { container: tokens.selectedContainerColor, elevation: tokens.selectedContainerElevation, outline: tokens.selectedOutlineColor, label: tokens.selectedLabelColor, icon: tokens.selectedIconColor };
  }
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What the chip's transition hands back: the named values, plus the flattened elevation. */
type Drawn = { container: Moving<string>; outline: Moving<string>; label: Moving<string>; icon: Moving<string>; opacity: Moving<number> } & DrawnElevation;
/** …and the remove action's. */
type DrawnRemove = { container: Moving<string>; icon: Moving<string>; opacity: Moving<number> };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The chip itself: the accessible `Pressable` that holds its leading element and label. */
export type ChipRef = PressableHost;

/** What a function icon receives: the icon color of the current state and look, the size's icon size and the glyph of the chip's selection. */
export type ChipIconProps = GlyphSlotProps;

/** What a key event carries on a renderer that delivers one (`onKeyDown`). */
interface KeyDownEvent {
  nativeEvent: { key: string };
  preventDefault?: () => void;
}

export interface ChipProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** What the chip does: `action` (a button), `filter` (on or off) or `input` (an entered item the user can remove). Decides the role and the parts, not the look. */
  kind?: ChipKind;
  /** Look: `outlined` flat on a plain surface, `elevated` raised over media or a busy background. Unknown values render as `outlined` (CHP-7). */
  variant?: ChipVariant;
  /** Visual height 24 / 32 in the default system. The hit area always meets the minimum target. Unknown values render as `medium` (CHP-7). */
  size?: ChipSize;
  /** Whether a filter chip is on. **Controlled**: activation calls `onSelectedChange(!selected)`. Ignored unless `kind` is `filter`. */
  selected?: boolean;
  /** Prevents interaction and removes the chip, and its remove action, from the focus order. */
  disabled?: boolean;
  /** The visible text and the accessible name. One line: it ends in an ellipsis only when the layout gives the chip less width (CHP-17). */
  label?: string;
  /** Overrides the chip's accessible name (by default `label`). */
  accessibilityLabel?: string;
  /** The accessible name of an input chip's remove action — name the item ("Remove Ada Lovelace"). Required for `input` (CHP-26). */
  removeAccessibilityLabel?: string;
  /** The chip itself was activated (the spec's `click`) — never by its remove action. */
  onPress?: (event: GestureResponderEvent) => void;
  /** A filter chip was activated: the new value of `selected` (the spec's `change`). */
  onSelectedChange?: (selected: boolean) => void;
  /** The user asked to remove an input chip — its remove action, or Backspace / Delete on the focused chip (the spec's `remove`). The chip does not remove itself. */
  onRemove?: () => void;
  /**
   * The leading icon. A string is a glyph of the system's icon font (`'event'`), drawn in the icon color of the look; a
   * function receives the color, the size and the glyph; any other node is rendered as given. A filter chip that is on
   * shows a check in its place.
   */
  icon?: GlyphSlot<ChipIconProps>;
  /** An input chip's leading image (a person, a file), in place of an icon. Decorative. Ignored for other kinds (CHP-15). */
  avatar?: ImageSourcePropType;
  /** Layout overrides for the chip's container (margins, `alignSelf`, `maxWidth`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the chip's `Pressable` (a host `View`). */
  ref?: Ref<ChipRef>;
}

/**
 * Tanrei Chip — spec: `specs/chip.spec.json`.
 * Anatomy: container (a View that draws the chip: fill, elevation, outline, ripple, focus ring) > [chip: the accessible
 * Pressable — leading icon, check or avatar, then the label] + [remove: a second accessible Pressable — the close glyph
 * on its round container]. Two siblings, because an accessible element hides the elements inside it from VoiceOver;
 * the remove action must be its own element (CHP-18).
 */
export function Chip({
  kind: kindProp = 'action',
  variant = 'outlined',
  size = 'medium',
  selected = false,
  disabled = false,
  label = '',
  accessibilityLabel,
  removeAccessibilityLabel = '',
  onSelectedChange,
  onRemove,
  icon,
  avatar,
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
}: ChipProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.chip;
  const kind = closedValue(KINDS, kindProp, 'action', 'Chip kind');
  // CHP-7: size and variant are open keys. A value the active system does not have is drawn from the default value's
  // tokens, and reported in development builds only.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'Chip size');
  const appearance = lookupValue(tokens.variants, variant, 'outlined', 'Chip variant');
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);

  // CHP-11 / CHP-12: only a filter chip has a selected condition.
  const filter = kind === 'filter';
  const input = kind === 'input';
  const on = filter && selected;
  const look: Look = on ? 'selected' : 'plain';

  // CHP-26: a chip (and an input chip's remove action) without a name still renders; development builds say so.
  const unnamed = !hasAccessibleName(label, { accessibilityLabel, ...rest });
  const removeUnnamed = input && !removeAccessibilityLabel.trim();
  // CHP-15: an avatar belongs to an input chip; on another kind it is ignored, and development builds say so.
  const strayAvatar = avatar != null && !input;
  useEffect(() => {
    if (!__DEV__) return;
    const where = testID ? ` (testID "${testID}")` : '';
    if (unnamed) console.warn(`Tanrei: a Chip${where} has no label. Give it one: it is the visible text and the accessible name.`);
    if (removeUnnamed) console.warn(`Tanrei: an input Chip${where} has no removeAccessibilityLabel, so its remove action has no accessible name. Name the item ("Remove …").`);
    if (strayAvatar) console.warn(`Tanrei: a Chip${where} of kind "${kind}" was given an avatar; only an input chip draws one, so it is ignored.`);
  }, [unnamed, removeUnnamed, strayAvatar, kind, testID]);

  // CHP-11: a filter chip's activation is a click, then a change to the opposite of `selected`. Pressable never calls
  // onPress while disabled (CHP-2).
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event);
      if (filter) onSelectedChange?.(!selected);
    },
    [onPress, filter, selected, onSelectedChange],
  );

  // The container's laid-out size: the ripple grows in the whole container (a bare click from its center, CHP-9).
  const containerRef = useRef<StateLayerNode | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);

  // CHP-8 (pressed at once, held), CHP-5 (the minimum target: until the first layout pass, a square of the height),
  // CHP-9 (the ripple, in the container) and CHP-3 / CHP-6: one state wins.
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerHeight, height: dimensions.containerHeight },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref,
    rippleArea: { ref: containerRef, size: containerSize ?? { width: dimensions.containerHeight, height: dimensions.containerHeight } },
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
  // CHP-18 / CHP-20 / CHP-21: the remove action — its own press, hover, focus, target and ripple, in its round container.
  const removeCircle = useRef<StateLayerNode | null>(null);
  const removeSide = dimensions.removeContainerSize;
  const removeInteraction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.iconSize, height: dimensions.iconSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    rippleArea: { ref: removeCircle, size: { width: removeSide, height: removeSide } },
    onPress: useCallback(() => onRemove?.(), [onRemove]),
  });
  const removeState = removeInteraction.state;
  const removeContainerPaint = removeInteraction.layerless ? appearance[removeInteraction.under].removeContainerColor : appearance[removeState].removeContainerColor;
  const removeColors = { container: theme.resolve(removeContainerPaint), icon: theme.resolve(appearance[removeState].removeIconColor) };
  const removeDrawn = useStateTransition(
    { ...removeColors, opacity: stateShape(tokens, removeState).opacity },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: removeState === 'pressed' },
  ) as DrawnRemove;

  // CHP-20: while the pointer or a press is on the remove action, the chip itself is neither hovered nor pressed — it
  // keeps its own state otherwise (its keyboard focus, its disabled state). The remove action is a sibling of the chip's
  // Pressable, so this also covers a pointer that reaches the remove action's hit area inside the chip's bounds.
  const onRemoveAction = input && (removeInteraction.hovered || removeInteraction.pressed);
  const state = onRemoveAction ? resolveInteractionState({ disabled, focused: interaction.focused }) : interaction.state;
  const under = onRemoveAction ? state : interaction.under;
  const layerless = !onRemoveAction && interaction.layerless;
  const { wave } = interaction;
  // Everything drawn comes from that state's tokens, of this look. CHP-9 `ripple` (while a ripple draws) and `dim` draw
  // no state layer on the container: its color stays the one of the state under the press.
  const parts = lookParts(appearance[state], look);
  const containerPaint = layerless ? lookParts(appearance[under], look).container : parts.container;
  const { opacity } = stateShape(tokens, state);
  const shape = tokens.containerShape;
  const colors = { container: theme.resolve(containerPaint), outline: theme.resolve(parts.outline), label: theme.resolve(parts.label), icon: theme.resolve(parts.icon) };
  const elevation = theme.elevation(parts.elevation);
  const shadowCount = useMemo(
    () => shadowLayerCount(INTERACTION_STATES.flatMap((name) => (['plain', 'selected'] as const).map((each) => theme.elevationLayers(lookParts(appearance[name], each).elevation)))),
    [theme, appearance],
  );
  // CHP-24: a state moves the colors and the elevation over the state motion (at once under a press); CHP-13: a change
  // of selection moves them over the selection motion. Reduce motion changes both at once.
  const selection = { duration: tokens.motionSelectionDuration, easing: tokens.motionSelectionEasing };
  const drawn = useControlTransition({ ...colors, opacity, ...elevationVisuals(theme.elevationLayers(parts.elevation), shadowCount) }, look, {
    state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
    selection,
    pressed: state === 'pressed',
  }) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);


  // CHP-19: Backspace or Delete on the focused input chip asks to remove it. CHP-23: no other key is handled here.
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      callerKeyDown?.(event);
      if (!input || disabled) return;
      if (event.nativeEvent.key === 'Backspace' || event.nativeEvent.key === 'Delete') {
        event.preventDefault?.();
        onRemove?.();
      }
    },
    [callerKeyDown, input, disabled, onRemove],
  );

  // CHP-14: every glyph at the size's icon size, in the family and FILL of the chip's selection.
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: on, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(parts.icon);

  // CHP-13: a filter chip's check moves over the selection motion — plain 0 or 1 at rest, no node at 0.
  const check = useStateTransition({ progress: on ? 1 : 0 }, selection).progress as Moving<number>;
  const showAvatar = input && avatar != null;
  const hasIcon = icon != null && !showAvatar;
  // The leading element: an avatar (input), else the check while it shows (filter; it replaces the icon), else the icon.
  const checking = filter && check !== 0;
  const glyphLead = hasIcon || checking;
  // CHP-16: where the chip starts. A check that grows in or out of a chip without an icon moves the padding with it.
  const startPadding = showAvatar
    ? dimensions.containerPaddingInlineWithAvatar
    : hasIcon
      ? dimensions.containerPaddingInlineWithIcon
      : checking
        ? ramp(check, [0, 1], [dimensions.containerPaddingInline, dimensions.containerPaddingInlineWithIcon])
        : dimensions.containerPaddingInline;

  let leading = null;
  if (showAvatar) {
    // CHP-15: an image of the avatar size clipped to the avatar shape, hidden from assistive technology; CHP-6: disabled,
    // at the disabled content opacity.
    const image: ImageStyle = { width: dimensions.avatarSize, height: dimensions.avatarSize, borderRadius: tokens.avatarShape, overflow: 'hidden', ...(disabled ? { opacity: theme.system.state.disabledContentOpacity } : null) };
    leading = (
      <View style={{ marginEnd: dimensions.containerGap }} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={part('avatar')}>
        <Image source={avatar} style={image} accessible={false} testID={part('avatar.image')} />
      </View>
    );
  } else if (glyphLead) {
    const content = checking ? glyphSlotContent(CHECK_GLYPH, { color: iconColor, size: dimensions.iconSize, glyph }, drawn.icon, part('check.glyph')) : glyphSlotContent(icon, { color: iconColor, size: dimensions.iconSize, glyph }, drawn.icon, part('glyph'));
    const box = <IconBox icon={content} color={iconColor} size={dimensions.iconSize} decorative testID={checking ? part('check') : part('icon')} />;
    // A check that grows into a chip without an icon: its box widens from nothing, and fades in (the reverse going out).
    leading =
      checking && !hasIcon && typeof check !== 'number' ? (
        <Animated.View style={{ width: ramp(check, [0, 1], [0, dimensions.iconSize]), marginEnd: ramp(check, [0, 1], [0, dimensions.containerGap]), opacity: check, overflow: 'hidden' }}>{box}</Animated.View>
      ) : (
        <View style={{ marginEnd: dimensions.containerGap }}>{box}</View>
      );
  }

  // CHP-17: one line, in the size's type style and the look's label color; an ellipsis only when there is no room.
  const labelStyle: TextStyle = { ...theme.text(dimensions.labelTypescale), flexShrink: 1 };

  const container: ViewStyle = {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    // CHP-16: at least the height; the chip grows in height with larger text.
    minHeight: dimensions.containerHeight,
    // The end the remove action holds is padded as a glyph end (CHP-16); the chip's own end pads its label.
    ...(input ? { paddingEnd: dimensions.containerPaddingInlineWithIcon } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  // A paint that resolves to nothing draws nothing: no fill, no outline element.
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: shape, opacity: drawn.opacity };
  const outlined = tokens.outlineWidth > 0 && drawsColor(colors.outline, drawn.outline);
  // The chip itself: from the container's start to the remove action (or the container's end), so the whole chip but
  // the remove action activates it (CHP-21). Its paddings are logical, so the row mirrors in right-to-left (CHP-25).
  const body: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingEnd: input ? dimensions.containerGap : dimensions.containerPaddingInline,
    paddingVertical: dimensions.containerPaddingBlock,
  };

  // CHP-11: only a filter chip exposes a selected (pressed) state; the others never do, whatever the caller's state says.
  const { selected: _callerSelected, ...callerState } = accessibilityState ?? {};
  const a11yState: AccessibilityState = { ...callerState, disabled, ...(filter ? { selected } : null) };
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown } as object;

  let remove = null;
  if (input) {
    // CHP-21: at least the touch target on both axes, around the glyph; toward the label no further than the gap, so it
    // never covers the label — the rest goes to the inline end, beyond the chip where needed. `hitSlop` is physical.
    const target = theme.system.measure.target.touch;
    const vertical = Math.max(0, Math.ceil((target - dimensions.iconSize) / 2));
    const towardLabel = Math.min(vertical, dimensions.containerGap);
    const outward = Math.max(0, target - dimensions.iconSize - towardLabel);
    const hitSlop: Insets = I18nManager.isRTL ? { top: vertical, bottom: vertical, left: outward, right: towardLabel } : { top: vertical, bottom: vertical, left: towardLabel, right: outward };
    const removeGlyph = glyphSlotContent(REMOVE_GLYPH, { color: theme.paint(appearance[removeState].removeIconColor), size: dimensions.iconSize, glyph }, removeDrawn.icon, part('remove.glyph'));
    // The round container is centered on the glyph (it may reach into the gap and the padding): it draws the remove
    // action's state, its ripple and its focus ring.
    const offset = (dimensions.iconSize - removeSide) / 2;
    const circle: ViewStyle = { position: 'absolute', top: offset, start: offset, width: removeSide, height: removeSide, borderRadius: tokens.removeContainerShape, pointerEvents: 'none', ...borderCurveOf(cornerSmoothing) };
    remove = (
      <AnimatedPressable
        {...removeInteraction.hostProps}
        hitSlop={hitSlop}
        testID={part('remove')}
        disabled={disabled}
        focusable={!disabled}
        accessibilityRole="button"
        accessibilityLabel={removeAccessibilityLabel}
        accessibilityState={{ disabled }}
        style={{ alignSelf: 'center', width: dimensions.iconSize, height: dimensions.iconSize, opacity: removeDrawn.opacity }}
      >
        <Animated.View ref={removeCircle} style={[circle, { backgroundColor: fillOf(removeColors.container, removeDrawn.container) }]} testID={part('remove.container')}>
          {removeInteraction.wave.ripple ? (
            <PressRipple ripple={removeInteraction.wave.ripple} color={theme.paint(appearance.pressed.removeContainerColor)} radius={tokens.removeContainerShape} cornerSmoothing={cornerSmoothing} testID={part('remove.ripple')} />
          ) : null}
          <FocusRing visible={removeInteraction.focused && !disabled} radius={tokens.removeContainerShape} cornerSmoothing={cornerSmoothing} testID={part('remove.focus-ring')} />
        </Animated.View>
        <IconBox icon={removeGlyph} color={theme.paint(appearance[removeState].removeIconColor)} size={dimensions.iconSize} decorative testID={part('remove.icon')} />
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View ref={containerRef} onLayout={onContainerLayout} style={[container, surface, style]} testID={part('container')}>
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {outlined ? <Ring placement="inside" width={tokens.outlineWidth} color={drawn.outline} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(lookParts(appearance.pressed, look).container)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      <AnimatedPressable
        {...rest}
        {...keys}
        {...interaction.hostProps}
        testID={testID}
        disabled={disabled}
        focusable={!disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={a11yState}
        style={[body, { paddingStart: startPadding }]}
      >
        {leading}
        <Label style={labelStyle} color={drawn.label} numberOfLines={1} testID={part('label')}>
          {label}
        </Label>
      </AnimatedPressable>
      {remove}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </Animated.View>
  );
}
