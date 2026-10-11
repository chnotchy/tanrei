import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Animated,
  BackHandler,
  I18nManager,
  Pressable,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiElevationLevel, TanreiFabMenuSize, TanreiFabMenuTokens, TanreiFabMenuVariant, TanreiFabMenuVariantStateTokens, TanreiFabMenuVariantTokens, TanreiPaint } from '../generated/vocabulary';
import { IconBox, Label, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { useRovingFocus, type FocusableNode, type KeyDownEvent } from '../primitives/rovingFocus';
import { hasAccessibleName, ramp, useControlTransition } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayPortal } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { TanreiThemeScope, useTanrei, type TanreiTheme } from '../theme/TanreiProvider';
import type { MenuDismissReason } from './Menu';

/**
 * Open keys: the core values — `filled`, `tonal`, `surface` — plus whatever the product's design system
 * added (its generated file augments `TanreiFabMenuVariantRegistry`).
 */
export type FabMenuVariant = TanreiFabMenuVariant;
/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type FabMenuSize = TanreiFabMenuSize;
/** Why the FAB menu asks to be closed (the spec's `close`), by the spec's names — the menu's reasons. */
export type FabMenuDismissReason = MenuDismissReason;

/** What a glyph given as a function receives: the icon color of the part and state, the size and the glyph (unselected). */
export type FabMenuIconProps = GlyphSlotProps;

/** One action (the spec's item kind `item`): the element type of `items`. */
export interface FabMenuItem {
  /** The item's text and its accessible name. Required. */
  label: string;
  /** The item's icon: a glyph name of the system's icon font, a function or a node. Required. */
  icon: GlyphSlot<FabMenuIconProps>;
  /** The spec's item `click`. The FAB menu then calls `onDismiss('item')`. */
  onPress?: (event: GestureResponderEvent) => void;
  /** The item's test id (default: `<testID>.item.<n>`); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** The toggle: an (animated) `Pressable`, a host `View` underneath. */
export type FabMenuRef = PressableHost;

export interface FabMenuProps extends Omit<ViewProps, 'children' | 'style'> {
  /** Emphasis, as the FAB's variants: it colors the toggle and the items. Unknown values render as `filled` (FBM-7). */
  variant?: FabMenuVariant;
  /** The toggle's size (small, medium, large: 40 / 48 / 64 in the default system). The items keep one size. Unknown values render as `medium` (FBM-7). */
  size?: FabMenuSize;
  /** The spec's `open`: whether the items are shown. **Controlled**: set it from `onToggle`, and to false from `onDismiss`. */
  visible?: boolean;
  /** The spec's `label`: the toggle's and the list's accessible name ("Create"). Required. */
  accessibilityLabel?: string;
  /** Prevents opening and removes the toggle from the focus order. */
  disabled?: boolean;
  /** The toggle's glyph while closed (the spec's `icon` slot): a glyph name, a function or a node. */
  icon?: GlyphSlot<FabMenuIconProps>;
  /** The spec's `toggle`: the toggle asks to open (true) or close (false). */
  onToggle?: (open: boolean) => void;
  /** The spec's `close`: the FAB menu asks to be closed, with its reason. */
  onDismiss?: (reason: FabMenuDismissReason) => void;
  /** The actions, first at the top: two to six. */
  items: readonly FabMenuItem[];
  /** How an item's position is announced. Default: `"2 of 3"` (English). */
  positionText?: (position: number, count: number) => string;
  /**
   * Test and gallery only (FBM-13's `verify`): draws the open items in place above the toggle, settled, with their
   * elevation — without the overlay layer, placement, motion or focus moves.
   */
  inline?: boolean;
  /** Layout of the toggle (its place: the caller positions it); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<FabMenuRef>;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
type DrawnToggle = { container: Moving<string>; icon: Moving<string>; opacity: Moving<number> } & DrawnElevation;
type DrawnItem = { container: Moving<string>; label: Moving<string>; icon: Moving<string>; opacity: Moving<number> } & DrawnElevation;

/** The toggle's two looks (FBM-3): its closed parts and its `open.` parts. Closed looks, so this switch stays. */
function togglePaints(tokens: TanreiFabMenuVariantStateTokens, open: boolean): { container: TanreiPaint; icon: TanreiPaint; elevation: TanreiElevationLevel } {
  return open
    ? { container: tokens.openContainerColor, icon: tokens.openIconColor, elevation: tokens.openContainerElevation }
    : { container: tokens.containerColor, icon: tokens.iconColor, elevation: tokens.containerElevation };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
/** The toggle's glyph while open (FBM-11), by its name in the system's icon font. */
const CLOSE_GLYPH = 'close';
const englishPosition = (position: number, count: number) => `${position} of ${count}`;

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
 * Tanrei FabMenu — spec: `specs/fab-menu.spec.json`.
 * Anatomy: container (the toggle: a FAB whose look turns to its `open.` parts, its corners to `containerShapeOpen`, its
 * glyph to the close glyph) + list (a column of items above it, end-aligned, drawn on `TanreiProvider`'s overlay layer) >
 * items (a raised container: icon, then label). Variants `filled`, `tonal`, `surface`; sizes `small`, `medium`, `large`.
 */
export function FabMenu({
  variant = 'filled',
  size = 'medium',
  visible = false,
  accessibilityLabel = '',
  disabled = false,
  icon,
  onToggle,
  onDismiss,
  items,
  positionText = englishPosition,
  inline = false,
  style,
  testID,
  ref,
  ...rest
}: FabMenuProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.fabMenu;
  // FBM-7: open keys; a value the active system does not have is drawn from the default value's tokens (reported once).
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'FabMenu size');
  const appearance = lookupValue(tokens.variants, variant, 'filled', 'FabMenu variant');
  const reduce = useReduceMotion();
  const rtl = I18nManager.isRTL;
  const part = (name: string) => partTestID(testID, name);
  const { cornerSmoothing } = theme.system.shape;
  // FBM-2: disabled draws the toggle closed and presents no items, whatever visible says.
  const open = visible && !disabled;
  const count = items.length;

  // FBM-23: a missing name, an item without a label or an icon, and fewer than two or more than six items still render;
  // development builds report each.
  const where = testID ? ` (testID "${testID}")` : '';
  const reports = [
    ...(hasAccessibleName(accessibilityLabel, rest) ? [] : [`Tanrei: a FabMenu${where} has no accessibilityLabel. An icon alone is not a name; it names the toggle and the list.`]),
    ...(count < 2 || count > 6 ? [`Tanrei: a FabMenu${where} holds ${count} items; a FAB menu holds two to six.`] : []),
    ...items.flatMap((item, index) => [
      ...(item.label?.trim() ? [] : [`Tanrei: item ${index + 1} of a FabMenu${where} has no label, so it has no accessible name.`]),
      ...(item.icon == null || item.icon === '' ? [`Tanrei: item ${index + 1} of a FabMenu${where} has no icon.`] : []),
    ]),
  ].join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // Close requests are counted, so that a blur that follows one (Tab, an activation) is not also 'focus-out'; focus
  // that was in the items when one was asked for goes back to the toggle when the menu closes.
  const requests = useRef(0);
  const focusInside = useRef(false);
  const toggleFocused = useRef(false);
  const returnFocus = useRef(false);
  const dismiss = useCallback(
    (reason: FabMenuDismissReason) => {
      if (disabled) return;
      requests.current += 1;
      if (focusInside.current) returnFocus.current = true;
      onDismiss?.(reason);
    },
    [disabled, onDismiss],
  );

  // FBM-17: Down and Up Arrow move through the items, wrapping, Home and End to the ends. FBM-15: Escape and Tab ask to close.
  const onItemsKeyDown = useCallback(
    (event: KeyDownEvent) => {
      const { key } = event.nativeEvent;
      if (key === 'Escape' || key === 'Tab') {
        event.preventDefault?.();
        dismiss(key === 'Escape' ? 'escape' : 'tab');
      }
    },
    [dismiss],
  );
  const roving = useRovingFocus({ labels: items.map((item) => item.label ?? ''), wrap: true, preferred: 0, typeahead: false, onKeyDown: onItemsKeyDown });

  // FBM-1: the toggle asks for the opposite of visible; Down or Up Arrow on a closed toggle asks to open (FBM-13: Up
  // Arrow then focuses the last item, the one nearest the toggle).
  const openedBy = useRef<'up' | null>(null);
  const toggleHost = useRef<Measurable | null>(null);
  const setToggle = useCallback(
    (node: FabMenuRef | null) => {
      toggleHost.current = node as unknown as Measurable | null;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
      return undefined;
    },
    [ref],
  );
  const onToggleKeyDown = useCallback(
    (event: KeyDownEvent) => {
      const { key } = event.nativeEvent;
      if (disabled || visible || (key !== 'ArrowDown' && key !== 'ArrowUp')) return;
      event.preventDefault?.();
      openedBy.current = key === 'ArrowUp' ? 'up' : null;
      onToggle?.(true);
    },
    [disabled, visible, onToggle],
  );
  const handleTogglePress = useCallback(() => {
    openedBy.current = null;
    onToggle?.(!visible);
  }, [onToggle, visible]);

  // FBM-13: focus moves to the first item (the last after Up Arrow) once the items are placed, and back to the toggle
  // when they close if it was in them. FBM-15: focus that leaves the items and the toggle asks to close.
  const visibleNow = useRef(open);
  visibleNow.current = open;
  const focusedAt = useRef(0);
  const onItemFocus = useCallback(
    (index: number) => {
      focusInside.current = true;
      focusedAt.current = requests.current;
      roving.itemFocused(index);
    },
    [roving.itemFocused],
  );
  const onItemBlur = useCallback(() => {
    focusInside.current = false;
    if (inline) return;
    const since = focusedAt.current;
    setTimeout(() => {
      if (!focusInside.current && !toggleFocused.current && visibleNow.current && requests.current === since) dismiss('focus-out');
    }, 0);
  }, [inline, dismiss]);
  const focusIn = useCallback(() => {
    if (count === 0) return;
    roving.focusItem(openedBy.current === 'up' ? count - 1 : 0);
    openedBy.current = null;
  }, [count, roving.focusItem]);
  const opened = useRef(false);
  useEffect(() => {
    if (inline) return;
    if (!open && opened.current) {
      opened.current = false;
      if (focusInside.current || returnFocus.current) toggleHost.current?.focus?.();
      focusInside.current = false;
      returnFocus.current = false;
    }
    if (open) opened.current = true;
  }, [open, inline]);

  // FBM-16: an item's click, then close with 'item'.
  const activate = useCallback(
    (index: number, event: GestureResponderEvent) => {
      items[index]?.onPress?.(event);
      dismiss('item');
    },
    [items, dismiss],
  );

  // FBM-19: the toggle's look, corners and glyph move over the open motion when it opens and the close motion when it
  // closes (at once where motion is reduced).
  const toggleMotion = open ? { duration: tokens.motionOpenDuration, easing: tokens.motionOpenEasing } : { duration: tokens.motionCloseDuration, easing: tokens.motionCloseEasing };
  const turn = useStateTransition({ open: open ? 1 : 0 }, toggleMotion).open as Moving<number>;

  const itemsNode = (placedStyle: StyleProp<ViewStyle> | null) => (
    <FabMenuList
      items={items}
      appearance={appearance}
      tokens={tokens}
      theme={theme}
      open={open}
      inline={inline}
      reduce={reduce}
      rtl={rtl}
      label={accessibilityLabel}
      positionText={positionText}
      tabStop={roving.tabStop}
      itemRef={roving.itemRef}
      onItemFocus={onItemFocus}
      onItemBlur={onItemBlur}
      onActivate={activate}
      keyHandler={roving.onKeyDown}
      style={placedStyle}
      testID={testID}
    />
  );

  const toggle = (
    <Toggle
      rest={rest}
      hostRef={setToggle}
      appearance={appearance}
      tokens={tokens}
      dimensions={dimensions}
      theme={theme}
      open={open}
      turn={turn}
      disabled={disabled}
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      onPress={handleTogglePress}
      onKeyDown={onToggleKeyDown}
      onFocusChange={(focused) => {
        toggleFocused.current = focused;
      }}
      cornerSmoothing={cornerSmoothing}
      // In place, the toggle sits under the items' end edges.
      style={inline ? [{ alignSelf: 'flex-end' }, style] : style}
      testID={testID}
    />
  );

  if (inline) {
    // FBM-13's verify: the open items in place above the toggle, end-aligned, list.offset from its top edge.
    return (
      <View style={{ alignItems: 'flex-end' }} testID={part('stage')}>
        {open ? <View style={{ marginBottom: tokens.listOffset }}>{itemsNode(null)}</View> : null}
        {toggle}
      </View>
    );
  }
  return (
    <>
      {toggle}
      <FabMenuOverlay open={open} toggleRef={toggleHost} tokens={tokens} theme={theme} rtl={rtl} onDismiss={dismiss} onToggle={onToggle} onPlaced={focusIn} testID={testID} where={where}>
        {(placement) => itemsNode(placement)}
      </FabMenuOverlay>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The toggle (FBM-1 … FBM-11, FBM-19 … FBM-21)

interface ToggleProps {
  rest: Omit<ViewProps, 'children' | 'style'>;
  hostRef: (node: FabMenuRef | null) => void;
  appearance: TanreiFabMenuVariantTokens;
  tokens: TanreiFabMenuTokens;
  dimensions: { containerSize: number; containerShape: number; iconSize: number };
  theme: TanreiTheme;
  open: boolean;
  turn: Moving<number>;
  disabled: boolean;
  icon: GlyphSlot<FabMenuIconProps> | undefined;
  accessibilityLabel: string;
  onPress: () => void;
  onKeyDown: (event: KeyDownEvent) => void;
  onFocusChange: (focused: boolean) => void;
  cornerSmoothing: number;
  style: StyleProp<ViewStyle>;
  testID: string | undefined;
}

function Toggle({ rest, hostRef, appearance, tokens, dimensions, theme, open, turn, disabled, icon, accessibilityLabel, onPress, onKeyDown, onFocusChange, cornerSmoothing, style, testID }: ToggleProps) {
  const part = (name: string) => partTestID(testID, name);
  // FBM-8 (pressed at once, held), FBM-5 (the minimum target: until the first layout pass, the square of its size),
  // FBM-9 (the ripple) and FBM-3: one state wins.
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: dimensions.containerSize, height: dimensions.containerSize },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: hostRef,
    onPress,
    onFocus: useCallback(() => onFocusChange(true), [onFocusChange]),
    onBlur: useCallback(() => onFocusChange(false), [onFocusChange]),
  });
  const { state, under, wave } = interaction;
  // FBM-3 / FBM-6: the closed parts (the open. parts while open) of the variant in the state that wins; FBM-9: ripple
  // and dim keep the container color of the state under the press.
  const current = togglePaints(appearance[state], open);
  const containerPaint = interaction.layerless ? togglePaints(appearance[under], open).container : current.container;
  const { opacity } = stateShape({ ...tokens, containerShape: dimensions.containerShape }, state);
  const colors = { container: theme.resolve(containerPaint), icon: theme.resolve(current.icon) };
  const elevation = theme.elevation(current.elevation);
  const shadowCount = useMemo(
    () => shadowLayerCount(INTERACTION_STATES.flatMap((name) => [false, true].map((each) => theme.elevationLayers(togglePaints(appearance[name], each).elevation)))),
    [theme, appearance],
  );
  // FBM-21: a state moves colors and elevation over the state motion (at once under a press); FBM-19: opening and closing
  // move them over the open and close motion.
  const openMotion = open ? { duration: tokens.motionOpenDuration, easing: tokens.motionOpenEasing } : { duration: tokens.motionCloseDuration, easing: tokens.motionCloseEasing };
  const drawn = useControlTransition({ ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.elevation), shadowCount) }, open ? 'open' : 'closed', {
    state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
    selection: openMotion,
    pressed: state === 'pressed',
  }) as DrawnToggle;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  // FBM-11: the size's corners while closed, containerShapeOpen while open (moving with the toggle); a radius beyond
  // half the side draws the same circle, so both ends are held to it for the corners to move evenly.
  const round = (value: number) => Math.min(value, dimensions.containerSize / 2);
  const shape = ramp(turn, [0, 1], [round(dimensions.containerShape), round(tokens.containerShapeOpen)]);
  const settledShape = open ? round(tokens.containerShapeOpen) : round(dimensions.containerShape);

  // FBM-11 / FBM-19: the icon slot's glyph while closed, the close glyph while open, cross-faded while it moves.
  const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(current.icon);
  const glyphProps = { color: iconColor, size: dimensions.iconSize, glyph };
  const moving = typeof turn !== 'number';
  const showsOwn = moving || turn === 0;
  const showsClose = moving || turn === 1;
  const layer: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' };
  const glyphs = (
    <View style={{ width: dimensions.iconSize, height: dimensions.iconSize }} testID={part('icon')} {...HIDDEN}>
      {showsOwn && icon != null ? (
        <Animated.View style={[layer, moving ? { opacity: ramp(turn, [0, 1], [1, 0]) } : null]}>{glyphSlotContent(icon, glyphProps, drawn.icon, part('glyph'))}</Animated.View>
      ) : null}
      {showsClose ? <Animated.View style={[layer, moving ? { opacity: turn } : null]}>{glyphSlotContent(CLOSE_GLYPH, glyphProps, drawn.icon, part('close.glyph'))}</Animated.View> : null}
    </View>
  );

  const box: ViewStyle = {
    // FBM-12: laid out at its own size where the layout puts it; it never positions itself.
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    width: dimensions.containerSize,
    height: dimensions.containerSize,
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: shape, opacity: drawn.opacity };
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown } as object;

  return (
    <AnimatedPressable
      {...rest}
      {...keys}
      {...interaction.hostProps}
      testID={testID}
      disabled={disabled}
      focusable={!disabled}
      // FBM-20: a button named by label, with whether its menu is open.
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, expanded: open }}
      style={[box, surface, style]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(togglePaints(appearance.pressed, open).container)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {glyphs}
      {/* FBM-4: around the toggle's own shape, never animated. */}
      <FocusRing visible={interaction.focused && !disabled} radius={settledShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The overlay (FBM-12 … FBM-15): the items on the provider's layer, above the toggle.

interface FabMenuOverlayProps {
  open: boolean;
  toggleRef: { current: Measurable | null };
  tokens: TanreiFabMenuTokens;
  theme: TanreiTheme;
  rtl: boolean;
  onDismiss: (reason: FabMenuDismissReason) => void;
  onToggle: ((open: boolean) => void) | undefined;
  onPlaced: () => void;
  testID: string | undefined;
  where: string;
  children: (placement: StyleProp<ViewStyle>) => ReactNode;
}

function FabMenuOverlay({ open, toggleRef, tokens, theme, rtl, onDismiss, onToggle, onPlaced, testID, where, children }: FabMenuOverlayProps) {
  const window = useWindowDimensions();
  const reduce = useReduceMotion();
  const part = (name: string) => partTestID(testID, name);
  const [present, setPresent] = useState(open);
  const [toggle, setToggleBox] = useState<Box | null>(null);
  const [area, setArea] = useState<Box | null>(null);
  const layerRef = useRef<{ current: Measurable | null } | null>(null);
  const same = (a: Box | null, b: Box) => a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  // FBM-13: the toggle (and the layer the items are drawn in) is measured when the menu opens and when the window changes.
  const measure = useCallback(() => {
    const node = toggleRef.current;
    if (node?.measureInWindow) node.measureInWindow((x, y, width, height) => setToggleBox((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
    const layer = layerRef.current?.current;
    if (layer?.measureInWindow) layer.measureInWindow((x, y, width, height) => setArea((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
  }, [toggleRef]);
  useEffect(() => {
    if (!open) return;
    setPresent(true);
    measure();
  }, [open, measure, window.width, window.height]);
  // The list stays drawn until its items have faded out.
  const closedAfter = open ? 0 : reduce ? 0 : tokens.motionCloseDuration;
  useEffect(() => {
    if (open || !present) return undefined;
    const timer = setTimeout(() => {
      setPresent(false);
      // Measured again when it next opens (the toggle may have moved).
      setToggleBox(null);
    }, closedAfter);
    return () => clearTimeout(timer);
  }, [open, present, closedAfter]);

  // FBM-15: Android's back button asks to close while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss('back');
      return true;
    });
    return () => subscription.remove();
  }, [open, onDismiss]);

  const box = area ?? { x: 0, y: 0, width: window.width, height: window.height };
  const placed = toggle !== null;
  // FBM-13 / FBM-22: a column above the toggle, list.offset from its top edge, every item's end edge on the toggle's
  // (its right edge; its left edge in right-to-left). Layer coordinates: physical.
  const placement: ViewStyle | null = toggle
    ? {
        position: 'absolute',
        bottom: box.height - (toggle.y - box.y) + tokens.listOffset,
        ...(rtl ? { left: toggle.x - box.x } : { right: box.width - (toggle.x - box.x + toggle.width) }),
      }
    : null;
  const placedOnce = useRef(false);
  useEffect(() => {
    if (!open) placedOnce.current = false;
    else if (placed && !placedOnce.current) {
      placedOnce.current = true;
      onPlaced();
    }
  }, [open, placed, onPlaced]);

  // FBM-14 / FBM-15: no scrim and no trap; a press outside the items asks to close — unless it is on the toggle, which
  // is the toggle's (FBM-1: toggle to false, no close).
  const onOutside = (event: GestureResponderEvent) => {
    const touch = event?.nativeEvent;
    if (toggle && touch && typeof touch.pageX === 'number' && touch.pageX >= toggle.x && touch.pageX <= toggle.x + toggle.width && touch.pageY >= toggle.y && touch.pageY <= toggle.y + toggle.height) {
      onToggle?.(false);
      return;
    }
    onDismiss('outside');
  };
  const node =
    present && placement ? (
      <TanreiThemeScope theme={theme}>
        <View style={FILL} pointerEvents="box-none" testID={part('overlay')}>
          <Pressable
            style={FILL}
            onPress={onOutside}
            accessible={false}
            focusable={false}
            importantForAccessibility="no"
            accessibilityElementsHidden
            pointerEvents={open ? 'auto' : 'none'}
            testID={part('outside')}
          />
          {children(placement)}
        </View>
      </TanreiThemeScope>
    ) : null;
  const portal = useOverlayPortal('menu', node);
  layerRef.current = portal.layer as { current: Measurable | null } | null;
  const unhosted = open && !portal.hosted;
  useEffect(() => {
    if (__DEV__ && unhosted) console.warn(`Tanrei: a FabMenu${where} opened outside a TanreiProvider, which hosts the overlay layer its items are drawn in; they are not drawn.`);
  }, [unhosted, where]);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The list and its items (FBM-3 … FBM-5, FBM-9, FBM-10, FBM-16 … FBM-22)

interface FabMenuListProps {
  items: readonly FabMenuItem[];
  appearance: TanreiFabMenuVariantTokens;
  tokens: TanreiFabMenuTokens;
  theme: TanreiTheme;
  open: boolean;
  inline: boolean;
  reduce: boolean;
  rtl: boolean;
  label: string;
  positionText: (position: number, count: number) => string;
  tabStop: number;
  itemRef: (index: number) => (node: FocusableNode | null) => void;
  onItemFocus: (index: number) => void;
  onItemBlur: () => void;
  onActivate: (index: number, event: GestureResponderEvent) => void;
  keyHandler: (event: KeyDownEvent) => void;
  style: StyleProp<ViewStyle>;
  testID: string | undefined;
}

function FabMenuList({ items, appearance, tokens, theme, open, inline, reduce, rtl, label, positionText, tabStop, itemRef, onItemFocus, onItemBlur, onActivate, keyHandler, style, testID }: FabMenuListProps) {
  const count = items.length;
  // FBM-19: each item fades and grows in from its end edge over the open motion, the one nearest the toggle first and
  // each next one motion.stagger later; all fade out together over the close motion. In place (inline) and where motion
  // is reduced, at once.
  const values = useRef<Animated.Value[]>([]);
  while (values.current.length < count) values.current.push(new Animated.Value(inline || reduce ? 1 : 0));
  const [settled, setSettled] = useState(inline || reduce);
  useEffect(() => {
    if (inline) return undefined;
    const target = open ? 1 : 0;
    if (reduce) {
      for (const value of values.current) value.setValue(target);
      setSettled(true);
      return undefined;
    }
    setSettled(false);
    const animation = open
      ? Animated.parallel(
          values.current.slice(0, count).map((value, index) =>
            Animated.timing(value, { toValue: 1, duration: tokens.motionOpenDuration, delay: tokens.motionStagger * (count - 1 - index), easing: toEasing(tokens.motionOpenEasing), useNativeDriver: true }),
          ),
        )
      : Animated.parallel(values.current.slice(0, count).map((value) => Animated.timing(value, { toValue: 0, duration: tokens.motionCloseDuration, easing: toEasing(tokens.motionCloseEasing), useNativeDriver: true })));
    animation.start(({ finished }) => {
      if (finished && open) setSettled(true);
    });
    return () => animation.stop();
  }, [open, inline, reduce, count, tokens]);

  const part = (name: string) => partTestID(testID, name);
  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: keyHandler } as object;
  // FBM-20: a menu named by label; FBM-13: a column, list.gap apart, first at the top, end-aligned.
  return (
    <View {...keys} role="menu" accessibilityLabel={label} style={[{ alignItems: 'flex-end', gap: tokens.listGap }, style]} pointerEvents={open ? 'box-none' : 'none'} testID={part('list')}>
      {items.map((item, index) => (
        <ItemView
          key={index}
          item={item}
          index={index}
          count={count}
          appearance={appearance}
          tokens={tokens}
          theme={theme}
          tabStop={tabStop === index}
          focusRef={itemRef(index)}
          onFocused={onItemFocus}
          onBlurred={onItemBlur}
          onActivate={onActivate}
          entrance={settled ? null : values.current[index]!}
          rtl={rtl}
          positionText={positionText}
          testID={item.testID ?? partTestID(testID, `item.${index}`)}
        />
      ))}
    </View>
  );
}

interface ItemViewProps {
  item: FabMenuItem;
  index: number;
  count: number;
  appearance: TanreiFabMenuVariantTokens;
  tokens: TanreiFabMenuTokens;
  theme: TanreiTheme;
  tabStop: boolean;
  focusRef: (node: FocusableNode | null) => void;
  onFocused: (index: number) => void;
  onBlurred: () => void;
  onActivate: (index: number, event: GestureResponderEvent) => void;
  /** The item's entrance progress while it moves; null when settled (no transform, no opacity). */
  entrance: Animated.Value | null;
  rtl: boolean;
  positionText: (position: number, count: number) => string;
  testID: string | undefined;
}

function ItemView({ item, index, count, appearance, tokens, theme, tabStop, focusRef, onFocused, onBlurred, onActivate, entrance, rtl, positionText, testID }: ItemViewProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const target = theme.system.measure.target.touch;
  // FBM-5: at least the target tall; stacked items extend no hit area over each other.
  const height = Math.max(tokens.itemHeight, target);
  const handlePress = useCallback((event: GestureResponderEvent) => onActivate(index, event), [onActivate, index]);
  const interaction = usePressInteraction({
    disabled: false,
    estimate: { width: height, height },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: focusRef as unknown as Ref<PressableHost>,
    onPress: handlePress,
    onFocus: useCallback(() => onFocused(index), [onFocused, index]),
    onBlur: onBlurred,
  });
  const { state, under, wave } = interaction;
  // FBM-3 / FBM-9: the item parts of the variant in the item's own state.
  const current = appearance[state];
  const containerPaint = interaction.layerless ? appearance[under].itemContainerColor : current.itemContainerColor;
  const { opacity } = stateShape({ ...tokens, containerShape: tokens.itemShape }, state);
  const colors = { container: theme.resolve(containerPaint), label: theme.resolve(current.itemLabelColor), icon: theme.resolve(current.itemIconColor) };
  const elevation = theme.elevation(current.itemContainerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].itemContainerElevation))), [theme, appearance]);
  // FBM-21: over the state motion, at once under a press.
  const drawn = useStateTransition(
    { ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.itemContainerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as DrawnItem;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);

  // FBM-18: the icon at item.icon.size (unselected), then the label in item.label.typescale, item.gap apart; logical
  // paddings (mirrored in right-to-left, FBM-22).
  const glyph = iconGlyphStyle(theme.system.icon, tokens.itemIconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const iconColor = theme.paint(current.itemIconColor);
  const host: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: height,
    gap: tokens.itemGap,
    paddingStart: tokens.itemPaddingInlineStart,
    paddingEnd: tokens.itemPaddingInlineEnd,
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: tokens.itemShape, opacity: drawn.opacity };
  const grow: ViewStyle | null = entrance ? ({ transform: [{ scale: entrance }], transformOrigin: rtl ? 'left' : 'right' } as unknown as ViewStyle) : null;

  const pressable = (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={NO_SLOP}
      testID={testID}
      focusable={tabStop}
      // FBM-20: a menu item named by its label, with its position.
      role="menuitem"
      accessibilityLabel={item.label}
      accessibilityValue={{ text: positionText(index + 1, count) }}
      style={[host, surface]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={tokens.itemShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.itemContainerColor)} radius={tokens.itemShape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      <IconBox icon={glyphSlotContent(item.icon, { color: iconColor, size: tokens.itemIconSize, glyph }, drawn.icon, part('icon.glyph'))} color={iconColor} size={tokens.itemIconSize} decorative testID={part('icon')} />
      <Label style={{ ...theme.text(tokens.itemLabelTypescale), flexShrink: 1 }} color={drawn.label} testID={part('label')}>
        {item.label}
      </Label>
      <FocusRing visible={interaction.focused} radius={tokens.itemShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
  return entrance ? (
    <Animated.View style={[{ opacity: entrance }, grow]} testID={part('entrance')}>
      {pressable}
    </Animated.View>
  ) : (
    pressable
  );
}
