import { useCallback, useEffect, useMemo, useState, type Ref } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiExtendedFabSize, TanreiExtendedFabVariant } from '../generated/vocabulary';
import { IconBox, Label, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { hasAccessibleName, ramp } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `filled`, `tonal`, `surface` — plus whatever the product's design system added
 * (its generated file augments `TanreiExtendedFabVariantRegistry`).
 */
export type ExtendedFloatingActionButtonVariant = TanreiExtendedFabVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type ExtendedFloatingActionButtonSize = TanreiExtendedFabSize;

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for an extended FAB: the named values, plus the flattened elevation. */
type Drawn = { container: Moving<string>; label: Moving<string>; opacity: Moving<number> } & DrawnElevation;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ExtendedFloatingActionButtonRef = PressableHost;

/**
 * What a function icon receives: the LABEL color of the current state (the icon takes it, as Button's does), the icon
 * size of the button's size (`system.components.extendedFab.sizes.<size>.iconSize`) and the unselected glyph.
 */
export type ExtendedFloatingActionButtonIconProps = GlyphSlotProps;

export interface ExtendedFloatingActionButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Emphasis, with the FloatingActionButton's meanings. Unknown values render as `filled` (EFB-7). */
  variant?: ExtendedFloatingActionButtonVariant;
  /** Height 40 / 48 / 64 in the default system — a collapsed one matches the FAB of its size. Unknown values render as `medium` (EFB-7). */
  size?: ExtendedFloatingActionButtonSize;
  /**
   * Shows the label. `false` collapses the button to a square that holds only its icon (while the content scrolls, for
   * example); `label` stays the accessible name. Without an icon it cannot collapse and stays expanded (EFB-15).
   */
  expanded?: boolean;
  /** Prevents interaction and removes the button from the focus order. Hiding it is usually better. */
  disabled?: boolean;
  /** The visible text and the accessible name. Never truncated: it wraps when the layout gives it less width (EFB-12). */
  label?: string;
  /** Overrides the accessible name (by default `label`). */
  accessibilityLabel?: string;
  /** The button was activated by touch, pointer, keyboard or assistive technology (the spec's `click`). */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * The leading icon, in the label color. A string is a glyph of the system's icon font (`'edit'`), drawn with
   * `iconGlyphStyle`; a function receives the color, the size and the glyph; any other node is rendered as given.
   * Required to collapse.
   */
  icon?: GlyphSlot<ExtendedFloatingActionButtonIconProps>;
  /** Layout overrides for the container (margins, `position`, `alignSelf`, …). It never positions itself (EFB-17). */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the underlying `Pressable` (a host `View`). */
  ref?: Ref<ExtendedFloatingActionButtonRef>;
}

/**
 * Tanrei ExtendedFloatingActionButton — spec: `specs/extended-fab.spec.json`.
 * Anatomy: container > [elevation ring] + [ripple] + icon + label + focus ring. Button's geometry on the FAB's raised
 * container: a minimum height, logical paddings that depend on the icon, a gap, a label style per size. Collapsed, a
 * square of the height holding the icon. Every state is drawn from that state's tokens.
 */
export function ExtendedFloatingActionButton({
  variant = 'filled',
  size = 'medium',
  expanded = true,
  disabled = false,
  label = '',
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
}: ExtendedFloatingActionButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.extendedFab;
  // EFB-7: size and variant are open keys. A value the active system does not have is drawn from the default value's
  // tokens, and reported in development builds only.
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'ExtendedFloatingActionButton size');
  const appearance = lookupValue(tokens.variants, variant, 'filled', 'ExtendedFloatingActionButton variant');

  // EFB-19: the button still renders without a name; development builds say it has none.
  const unnamed = !hasAccessibleName(label, { accessibilityLabel, ...rest });
  useEffect(() => {
    if (__DEV__ && unnamed) {
      console.warn(`Tanrei: an ExtendedFloatingActionButton${testID ? ` (testID "${testID}")` : ''} has no label. Give it one: it is the visible text and the accessible name.`);
    }
  }, [unnamed, testID]);

  // EFB-15: collapsing needs an icon. Without one the button stays expanded, and development builds say why.
  const hasIcon = icon != null;
  const cannotCollapse = !expanded && !hasIcon;
  useEffect(() => {
    if (__DEV__ && cannotCollapse) {
      console.warn(`Tanrei: an ExtendedFloatingActionButton${testID ? ` (testID "${testID}")` : ''} has expanded={false} but no icon. It cannot collapse without one, so it stays expanded.`);
    }
  }, [cannotCollapse, testID]);
  const open = expanded || !hasIcon;

  // EFB-10: how far the container's corners ease; `borderCurveOf()` says how React Native draws it.
  const { cornerSmoothing } = theme.system.shape;

  // EFB-8 (pressed at once, held at least `duration.pressHold`), EFB-5 (the minimum target: until the first layout pass,
  // the square of this size, the smallest box it can have), EFB-9 (the ripple) and EFB-3 / EFB-6: one state wins.
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerHeight, height: dimensions.containerHeight },
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
  // Everything drawn comes from that state's tokens. EFB-9 `ripple` (while a ripple draws) and `dim` draw no state layer
  // on the container: its color stays the one of the state under the press (`interaction.layerless`).
  const current = { ...appearance[state], ...(interaction.layerless ? { containerColor: appearance[under].containerColor } : null) };
  // EFB-11: the corners are the size's in every state.
  const shape = dimensions.containerShape;
  const { opacity } = stateShape({ ...tokens, containerShape: shape }, state);
  const colors = { container: theme.resolve(current.containerColor), label: theme.resolve(current.labelColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].containerElevation))), [theme, appearance]);
  // EFB-16: colors, opacity and elevation move with the state motion tokens; the press is immediate.
  const drawn = useStateTransition(
    { ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  // EFB-14: the width changes over the resize motion (the spatial spring's curve), at once where motion is reduced.
  // `expansion` is 1 expanded, 0 collapsed: a plain number when settled, an interpolation while it moves.
  const { expansion } = useStateTransition({ expansion: open ? 1 : 0 }, { duration: tokens.motionResizeDuration, easing: tokens.motionResizeEasing });
  const moving = typeof expansion !== 'number';
  const collapsed = expansion === 0;

  // The width the label takes, measured when it is laid out — so that the width can move between the two forms. It
  // belongs to one text in one style; a new label or size is measured again (while it moves, off the flow).
  const measureKey = `${dimensions.labelTypescale}|${label}`;
  const [measured, setMeasured] = useState<{ key: string; width: number } | null>(null);
  const labelWidth = measured?.key === measureKey ? measured.width : null;
  const onLabelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      setMeasured((previous) => (previous?.key === measureKey && previous.width === width ? previous : { key: measureKey, width }));
    },
    [measureKey],
  );

  // EFB-13: collapsed, a square of the height with the icon centered — the inset that centers the icon box in it.
  const collapsedInset = (dimensions.containerHeight - dimensions.iconSize) / 2;
  const expandedStart = hasIcon ? dimensions.containerPaddingInlineStartWithIcon : dimensions.containerPaddingInlineStart;
  const container: ViewStyle = {
    // EFB-17: laid out at its own size where the layout puts it; it never positions itself.
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(collapsed
      ? // EFB-13: a square that text size never changes (the label is not drawn).
        { width: dimensions.containerHeight, height: dimensions.containerHeight }
      : // EFB-11: at least the height; the paddings are logical, so they follow right-to-left (EFB-18).
        { minHeight: dimensions.containerHeight, paddingVertical: dimensions.containerPaddingBlock }),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const spacing = moving
    ? {
        paddingStart: ramp(expansion, [0, 1], [collapsedInset, expandedStart]),
        paddingEnd: ramp(expansion, [0, 1], [collapsedInset, dimensions.containerPaddingInlineEnd]),
        gap: ramp(expansion, [0, 1], [0, dimensions.containerGap]),
      }
    : collapsed
      ? null
      : { paddingStart: expandedStart, paddingEnd: dimensions.containerPaddingInlineEnd, gap: dimensions.containerGap };
  // A paint that resolves to nothing draws nothing: no fill.
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: shape, opacity: drawn.opacity };

  // EFB-12: the label in the size's type style and the state's label color, never truncated.
  const labelStyle: TextStyle = { ...theme.text(dimensions.labelTypescale), flexShrink: 1, textAlign: 'center' };
  const labelColor = theme.paint(current.labelColor);
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const part = (name: string) => partTestID(testID, name);

  let text = null;
  if (moving) {
    // EFB-14: while the width moves, the label is clipped by a box whose width moves with it, and fades. The label keeps
    // its own width inside it (off the flow, so it never wraps to the clip's): measured here when it was not yet.
    const clip = { alignSelf: 'stretch' as const, justifyContent: 'center' as const, overflow: 'hidden' as const, width: ramp(expansion, [0, 1], [0, labelWidth ?? 0]), opacity: ramp(expansion, [0, 1], [0, 1]) };
    text = (
      <Animated.View style={clip} testID={part('label-clip')}>
        <Label style={{ ...labelStyle, position: 'absolute', start: 0, ...(labelWidth === null ? null : { width: labelWidth }) }} color={drawn.label} onLayout={labelWidth === null ? onLabelLayout : undefined} testID={part('label')}>
          {label}
        </Label>
      </Animated.View>
    );
  } else if (!collapsed) {
    text = (
      <Label style={labelStyle} color={drawn.label} onLayout={onLabelLayout} testID={part('label')}>
        {label}
      </Label>
    );
  }

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      accessibilityRole="button"
      // EFB-13: the label is the name whether it is shown or collapsed away.
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled }}
      style={[container, spacing, surface, style]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {hasIcon ? (
        <IconBox
          icon={glyphSlotContent(icon, { color: labelColor, size: dimensions.iconSize, glyph }, drawn.label, part('glyph'))}
          color={labelColor}
          size={dimensions.iconSize}
          decorative
          testID={part('icon')}
        />
      ) : null}
      {text}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
