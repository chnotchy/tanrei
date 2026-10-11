import { useCallback, useEffect, useMemo, useRef, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Animated, I18nManager, Pressable, View, type GestureResponderEvent, type Insets, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiSplitButtonSize, TanreiSplitButtonSizeTokens, TanreiSplitButtonTokens, TanreiSplitButtonVariant, TanreiSplitButtonVariantTokens } from '../generated/vocabulary';
import { IconBox, Label, drawsColor, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { holdReach } from '../primitives/groupItem';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { hasAccessibleName, ramp } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';
import { Menu, MenuOwnerContext, type MenuAnchor, type MenuDismissReason, type MenuEntry, type MenuOwner } from './Menu';

/**
 * Open keys: the core values — `filled`, `tonal`, `elevated`, `outlined` — plus whatever the product's design
 * system added (its generated file augments `TanreiSplitButtonVariantRegistry`).
 */
export type SplitButtonVariant = TanreiSplitButtonVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type SplitButtonSize = TanreiSplitButtonSize;

/** What a function icon receives: the leading half's label color, the icon size and the glyph (unselected). */
export type SplitButtonIconProps = GlyphSlotProps;

/** The row that holds the two halves: a `View` that is no accessibility element of its own (SPB-17). */
export type SplitButtonRef = ComponentRef<typeof View>;

export interface SplitButtonProps extends Omit<ViewProps, 'children' | 'style'> {
  /** Emphasis, as Button's variants of the same names. Unknown values render as `filled` (SPB-8). */
  variant?: SplitButtonVariant;
  /** Visual height (small, medium, large: 32 / 36 / 40 in the default system). The hit areas always meet the minimum target. Unknown values render as `medium` (SPB-8). */
  size?: SplitButtonSize;
  /** The leading half's text and accessible name ("Save"). Required. */
  label?: string;
  /** The leading half's icon: a glyph name of the system's icon font, a function or a node. */
  icon?: GlyphSlot<SplitButtonIconProps>;
  /** The spec's `menuLabel`: the trailing half's accessible name ("More save options"). Required: the chevron alone is not a name. */
  menuAccessibilityLabel?: string;
  /** The spec's `open`: whether the menu is shown. **Controlled**: set it from `onMenuToggle`, and to false from `onMenuDismiss`. */
  menuVisible?: boolean;
  /** Prevents interaction with both halves, removes them from the focus order and presents no menu. */
  disabled?: boolean;
  /** The spec's `click`: the leading half was activated. */
  onPress?: (event: GestureResponderEvent) => void;
  /** The spec's `toggle`: the trailing half asks to open (true) or close (false) the menu. */
  onMenuToggle?: (open: boolean) => void;
  /** The spec's `close`: the menu asks to be closed, with its reason (`'escape'`, `'back'`, `'outside'`, `'tab'`, `'focus-out'` or `'item'`). */
  onMenuDismiss?: (reason: MenuDismissReason) => void;
  /** The spec's `menu` slot: the `Menu`'s items (its four kinds), shown by a `Menu` on the overlay layer. */
  menuItems?: readonly MenuEntry[];
  /** Layout of the row (margins, `alignSelf`); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<SplitButtonRef>;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
type Drawn = { container: Moving<string>; label: Moving<string>; outline: Moving<string>; opacity: Moving<number> } & DrawnElevation;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EMPTY: readonly MenuEntry[] = [];
/** The trailing half's glyph by its name in the system's icon font (SPB-14): it points down, and turns up while open. */
const CHEVRON_GLYPH = 'keyboard_arrow_down';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  focus?: () => void;
}

/**
 * Tanrei SplitButton — spec: `specs/split-button.spec.json`.
 * Anatomy: a row (no element of its own) > leading half (a button: [icon] + label) + trailing half (a menu button: the
 * chevron), `containerInnerGap` apart, each with its own container, outline, elevation, state, ripple and focus ring;
 * and the Tanrei `Menu` of `menuItems`, drawn on the provider's overlay layer below the whole row (`bottom-end`).
 * Variants `filled`, `tonal`, `elevated`, `outlined`; sizes `small`, `medium`, `large`.
 */
export function SplitButton({
  variant = 'filled',
  size = 'medium',
  label = '',
  icon,
  menuAccessibilityLabel = '',
  menuVisible = false,
  disabled = false,
  onPress,
  onMenuToggle,
  onMenuDismiss,
  menuItems = EMPTY,
  style,
  testID,
  ref,
  ...rest
}: SplitButtonProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.splitButton;
  // SPB-8: open keys; a value the active system does not have is drawn from the default value's tokens (reported once).
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'SplitButton size');
  const appearance = lookupValue(tokens.variants, variant, 'filled', 'SplitButton variant');
  const rtl = I18nManager.isRTL;
  const part = (name: string) => partTestID(testID, name);
  // SPB-3: disabled presents no menu and draws no open form, whatever menuVisible says.
  const open = menuVisible && !disabled;
  const hasMenu = menuItems.length > 0;

  // SPB-20: a half without a name, and an empty menu, still render; development builds report them.
  const where = testID ? ` (testID "${testID}")` : '';
  const unnamed = !hasAccessibleName(label, {});
  const menuUnnamed = !menuAccessibilityLabel.trim();
  useEffect(() => {
    if (!__DEV__) return;
    if (unnamed) console.warn(`Tanrei: the leading half of a SplitButton${where} has no label, so it has no accessible name.`);
    if (menuUnnamed) console.warn(`Tanrei: the trailing half of a SplitButton${where} has no menuAccessibilityLabel; the chevron alone is not a name. Say what the menu offers ("More save options").`);
    if (!hasMenu) console.warn(`Tanrei: a SplitButton${where} has no menuItems; its trailing half still toggles, but no menu is presented.`);
  }, [unnamed, menuUnnamed, hasMenu, where]);

  // SPB-13: the trailing half's inner corners and the chevron's half turn follow `open` over the open motion (at once
  // where motion is reduced): plain 0 or 1 at rest.
  const turn = useStateTransition({ open: open ? 1 : 0 }, { duration: tokens.motionOpenDuration, easing: tokens.motionOpenEasing }).open as Moving<number>;

  // SPB-2: the trailing half asks for the opposite of open; Down Arrow on it asks to open a closed menu.
  const toggle = useCallback(() => onMenuToggle?.(!menuVisible), [onMenuToggle, menuVisible]);
  const onTrailingKeyDown = useCallback(
    (event: KeyDownEvent) => {
      if (disabled || menuVisible || event.nativeEvent.key !== 'ArrowDown') return;
      event.preventDefault?.();
      onMenuToggle?.(true);
    },
    [disabled, menuVisible, onMenuToggle],
  );

  // SPB-15: the menu is anchored to the whole row, and focus goes back to the trailing half when it closes.
  const row = useRef<SplitButtonRef | null>(null);
  const trailing = useRef<Measurable | null>(null);
  const setRow = useCallback(
    (node: SplitButtonRef | null) => {
      row.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );
  const anchor = useRef<MenuAnchor>({
    measureInWindow: (callback) => (row.current as unknown as Measurable | null)?.measureInWindow?.(callback),
    focus: () => trailing.current?.focus?.(),
  });
  // SPB-16: a press on the trailing half while the menu is open is the trailing half's (toggle, false), not a press
  // outside: its box in the window (its hit area included) is measured whenever it is laid out and when the menu opens.
  const trailingBox = useRef<Box | null>(null);
  const trailingSlop = useRef<Insets>({});
  const measureTrailing = useCallback(() => {
    trailing.current?.measureInWindow?.((x, y, width, height) => {
      trailingBox.current = { x, y, width, height };
    });
  }, []);
  useEffect(() => {
    if (open) measureTrailing();
  }, [open, measureTrailing]);
  const owner = useMemo<MenuOwner>(
    () => ({
      claimsOutsidePress: ({ x, y }) => {
        const box = trailingBox.current;
        if (!box) return false;
        const slop = trailingSlop.current;
        const inside = x >= box.x - (slop.left ?? 0) && x <= box.x + box.width + (slop.right ?? 0) && y >= box.y - (slop.top ?? 0) && y <= box.y + box.height + (slop.bottom ?? 0);
        if (inside) onMenuToggle?.(false);
        return inside;
      },
    }),
    [onMenuToggle],
  );

  const halfProps = { appearance, dimensions, tokens, theme, disabled, rtl };
  const shapeClosed = tokens.containerInnerShape;
  const innerTrailing = ramp(turn, [0, 1], [shapeClosed, tokens.containerInnerShapeOpen]);
  const rotate: Moving<string> = typeof turn === 'number' ? `${turn * 180}deg` : turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  // SPB-12: one row, the halves containerInnerGap apart; the trailing half as tall as the leading one.
  const rowStyle: ViewStyle = { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'stretch', gap: tokens.containerInnerGap };
  const hasIcon = icon != null && icon !== '';
  return (
    <View {...rest} ref={setRow} style={[rowStyle, style]} testID={testID}>
      <Half
        {...halfProps}
        which="leading"
        onPress={onPress}
        innerShape={shapeClosed}
        accessibilityLabel={label}
        testID={part('leading')}
        padding={{ start: hasIcon ? dimensions.leadingPaddingInlineStartWithIcon : dimensions.leadingPaddingInlineStart, end: dimensions.leadingPaddingInlineEnd }}
      >
        {(color, drawnLabel) => (
          <>
            {hasIcon ? (
              <IconBox
                icon={glyphSlotContent(icon, { color, size: dimensions.iconSize, glyph: iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont }) }, drawnLabel, part('leading.icon.glyph'))}
                color={color}
                size={dimensions.iconSize}
                decorative
                testID={part('leading.icon')}
              />
            ) : null}
            <Label style={{ ...theme.text(dimensions.labelTypescale), flexShrink: 1, textAlign: 'center' } as TextStyle} color={drawnLabel} testID={part('leading.label')}>
              {label}
            </Label>
          </>
        )}
      </Half>
      <Half
        {...halfProps}
        which="trailing"
        onPress={toggle}
        onKeyDown={onTrailingKeyDown}
        innerShape={innerTrailing}
        innerShapeSettled={open ? tokens.containerInnerShapeOpen : shapeClosed}
        accessibilityLabel={menuAccessibilityLabel}
        expanded={open}
        hostRef={trailing}
        onMeasured={measureTrailing}
        slopRef={trailingSlop}
        testID={part('trailing')}
        padding={{ start: dimensions.trailingPaddingInline, end: dimensions.trailingPaddingInline }}
      >
        {(color, drawnLabel) => (
          // SPB-14 / SPB-19: the chevron at the icon size in the trailing half's label color, never mirrored; it turns half a turn while open.
          <Animated.View style={{ transform: [{ rotate }], direction: 'ltr' }} testID={part('trailing.chevron')} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <IconBox
              icon={glyphSlotContent(CHEVRON_GLYPH, { color, size: dimensions.iconSize, glyph: iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont }) }, drawnLabel, part('trailing.chevron.glyph'))}
              color={color}
              size={dimensions.iconSize}
              decorative
            />
          </Animated.View>
        )}
      </Half>
      {/* SPB-15: the Tanrei Menu, on the provider's overlay layer — nothing is drawn here. */}
      <MenuOwnerContext.Provider value={owner}>
        <Menu visible={open && hasMenu} anchorRef={anchor} placement="bottom-end" onDismiss={onMenuDismiss} items={menuItems} accessibilityLabel={menuAccessibilityLabel} testID={part('menu')} />
      </MenuOwnerContext.Provider>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// One half

interface HalfProps {
  which: 'leading' | 'trailing';
  appearance: TanreiSplitButtonVariantTokens;
  dimensions: TanreiSplitButtonSizeTokens;
  tokens: TanreiSplitButtonTokens;
  theme: TanreiTheme;
  disabled: boolean;
  rtl: boolean;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
  onKeyDown?: (event: KeyDownEvent) => void;
  /** The corners where the halves meet: plain, or moving while the menu opens or closes (the trailing half). */
  innerShape: Moving<number>;
  /** …where they end up (the focus ring is never animated). */
  innerShapeSettled?: number;
  accessibilityLabel: string;
  /** The trailing half: whether its menu is open. */
  expanded?: boolean;
  hostRef?: { current: Measurable | null };
  onMeasured?: () => void;
  slopRef?: { current: Insets };
  padding: { start: number; end: number };
  testID: string | undefined;
  /** The half's content, drawn in its label color (settled string, and as the transition hands it back). */
  children: (color: string, drawn: Moving<string>) => ReactNode;
}

function Half({ which, appearance, dimensions, tokens, theme, disabled, rtl, onPress, onKeyDown, innerShape, innerShapeSettled, accessibilityLabel, expanded, hostRef, onMeasured, slopRef, padding, testID, children }: HalfProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const leading = which === 'leading';
  const onLayout = useCallback(() => onMeasured?.(), [onMeasured]);
  // SPB-9 (pressed at once, held), SPB-6 (the minimum target), SPB-10 (the ripple) and SPB-4: each half's own state.
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerHeight, height: dimensions.containerHeight },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: hostRef as Ref<PressableHost> | undefined,
    onPress,
    onLayout: onMeasured ? (onLayout as (event: LayoutChangeEvent) => void) : undefined,
  });
  const { state, under, wave } = interaction;
  // SPB-4 / SPB-7 / SPB-10: every part from the variant's tokens in this half's state; `ripple` (while one draws) and
  // `dim` keep the container color of the state under the press.
  const current = appearance[state];
  const containerPaint = interaction.layerless ? appearance[under].containerColor : current.containerColor;
  const { opacity, shape } = stateShape(tokens, state);
  const colors = { container: theme.resolve(containerPaint), label: theme.resolve(current.labelColor), outline: theme.resolve(current.outlineColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].containerElevation))), [theme, appearance]);
  // SPB-18: colors and elevation move over the state motion (at once under a press, and where motion is reduced).
  const drawn = useStateTransition(
    { ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  // SPB-13: the outer corners are the state's container shape, the ones where the halves meet the inner shape (the
  // trailing half's move to inner-shape-open while its menu is open). Logical: mirrored in right-to-left (SPB-19).
  const corners = leading
    ? { topStart: shape, bottomStart: shape, topEnd: innerShape, bottomEnd: innerShape }
    : { topStart: innerShape, bottomStart: innerShape, topEnd: shape, bottomEnd: shape };
  const settledInner = innerShapeSettled ?? (typeof innerShape === 'number' ? innerShape : 0);
  const focusCorners = leading
    ? { topStart: shape, bottomStart: shape, topEnd: settledInner, bottomEnd: settledInner }
    : { topStart: settledInner, bottomStart: settledInner, topEnd: shape, bottomEnd: shape };
  const radii = { borderTopStartRadius: corners.topStart, borderBottomStartRadius: corners.bottomStart, borderTopEndRadius: corners.topEnd, borderBottomEndRadius: corners.bottomEnd };

  // SPB-6: the hit area reaches toward the other half no further than the middle of the gap.
  const reach = tokens.containerInnerGap / 2;
  const hitSlop = holdReach(interaction.hostProps.hitSlop, leading ? null : reach, leading ? reach : null, rtl);
  if (slopRef) slopRef.current = hitSlop;

  const host: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // SPB-12 / SPB-14: at least the size's height; it grows with its label.
    minHeight: dimensions.containerHeight,
    paddingStart: padding.start,
    paddingEnd: padding.end,
    paddingVertical: dimensions.containerPaddingBlock,
    ...(leading ? { gap: dimensions.containerGap, flexShrink: 1 } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), ...radii, opacity: drawn.opacity };
  const outlined = dimensions.outlineWidth > 0 && drawsColor(colors.outline, drawn.outline);
  const color = theme.paint(current.labelColor);
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = onKeyDown ? ({ onKeyDown } as object) : null;

  return (
    <AnimatedPressable
      {...interaction.hostProps}
      {...keys}
      hitSlop={hitSlop}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      // SPB-17: two buttons; the trailing one says whether its menu is open.
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={leading ? { disabled } : { disabled, expanded: expanded ?? false }}
      style={[host, surface]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {outlined ? <Ring placement="inside" width={dimensions.outlineWidth} color={drawn.outline} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {children(color, drawn.label)}
      {/* SPB-5: around this half's own shape, never animated. */}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} corners={focusCorners} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
