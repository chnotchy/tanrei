import { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type Ref } from 'react';
import {
  Animated,
  I18nManager,
  Platform,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import type { TanreiTooltipTokens } from '../generated/vocabulary';
import { Label, partTestID } from '../primitives/content';
import { Ring } from '../primitives/Ring';
import type { KeyDownEvent } from '../primitives/rovingFocus';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayPortal } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { NO_INSETS, TanreiThemeScope, useTanrei, useTanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';

/** Plain: one short phrase on the inverse surface. Rich: an optional title and a few sentences on a raised surface. A structural choice, not a token axis. */
export type TooltipVariant = 'plain' | 'rich';
const VARIANTS: readonly TooltipVariant[] = ['plain', 'rich'];

/** The side of the anchor the tooltip prefers; `start` and `end` follow the layout direction. */
export type TooltipPlacement = 'top' | 'bottom' | 'start' | 'end';
const PLACEMENTS: readonly TooltipPlacement[] = ['top', 'bottom', 'start', 'end'];

export interface TooltipProps {
  /** Plain (the default) or rich. Unknown values render as `plain`, reported in development builds. */
  variant?: TooltipVariant;
  /** The description. Required: while it is empty the tooltip never opens and adds nothing to the anchor (TIP-16). */
  text: string;
  /** A heading above the text of a rich tooltip. A plain tooltip ignores it (reported in development builds). */
  title?: string;
  /** The side it prefers; it flips when that side has no room. Unknown values render as `top`, reported in development builds. */
  placement?: TooltipPlacement;
  /**
   * The text is the anchor's accessibility hint (its description), whether or not the tooltip is open. Set it to false
   * when the text repeats the anchor's own name (an icon button whose tooltip shows its label).
   */
  describes?: boolean;
  /** Shows or hides the tooltip from the product (a first-run hint); the tooltip still opens and closes itself after. */
  open?: boolean;
  /** The spec's `toggle`: the tooltip opened or closed by itself (hover, focus, long-press, Escape, the timeout, another tooltip). */
  onOpenChange?: (open: boolean) => void;
  /**
   * The anchor: ONE element that takes the props of a `Pressable` (a Tanrei `IconButton`, `Button`, your own
   * `Pressable`). The tooltip adds its handlers, its ref and — while `describes` — its `accessibilityHint`, and calls
   * the anchor's own handlers first.
   */
  children: ReactElement;
  /** The drawn tooltip's test id (`<testID>.container`, `.title`, `.text`). */
  testID?: string;
  /**
   * Tests and the gallery only (the spec's snapshot harness): draws the anchor and, while open, the tooltip beside it in
   * place — on the placement's side, `offset` away — without the overlay layer, measuring, motion or timers.
   */
  inline?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Placement (TIP-9): a pure function of the anchor's box, the tooltip's size and the room.

export interface TooltipBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TooltipPosition {
  top: number;
  left: number;
  /** The physical side of the anchor it is on, after a flip. */
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Where the tooltip goes (TIP-9): `offset` from the anchor on the placement's side (start and end mirrored in
 * right-to-left), centred on the anchor along that side; flipped to the opposite side when this one has no room within
 * `margin` of the area's edges and the other has; on the side with more room when neither has; then shifted along the
 * side to stay `margin` inside the area. `insets` (the provider's) move each edge of the area in by that side's inset.
 */
export function placeTooltip(input: { anchor: TooltipBox; size: { width: number; height: number }; area: { width: number; height: number }; placement: TooltipPlacement; offset: number; margin: number; rtl: boolean; insets?: TanreiResolvedInsets }): TooltipPosition {
  const { anchor, size, area, placement, offset, margin: base, rtl, insets = NO_INSETS } = input;
  // The margin is kept from the safe area's edges: the window's less the provider's insets.
  const margin = { top: base + insets.top, bottom: base + insets.bottom, left: base + insets.left, right: base + insets.right };
  let side: TooltipPosition['side'];
  switch (placement) {
    case 'top':
      side = 'top';
      break;
    case 'bottom':
      side = 'bottom';
      break;
    case 'start':
      side = rtl ? 'right' : 'left';
      break;
    case 'end':
      side = rtl ? 'left' : 'right';
      break;
  }
  const room = {
    top: anchor.y - offset - margin.top,
    bottom: area.height - margin.bottom - (anchor.y + anchor.height + offset),
    left: anchor.x - offset - margin.left,
    right: area.width - margin.right - (anchor.x + anchor.width + offset),
  };
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
  const needed = side === 'top' || side === 'bottom' ? size.height : size.width;
  if (room[side] < needed) {
    const other = opposite[side];
    if (room[other] >= needed || room[other] > room[side]) side = other;
  }
  const clamp = (value: number, extent: number, start: number, end: number, limit: number) => Math.max(start, Math.min(value, limit - end - extent));
  if (side === 'top' || side === 'bottom') {
    const top = side === 'top' ? anchor.y - offset - size.height : anchor.y + anchor.height + offset;
    const left = clamp(anchor.x + (anchor.width - size.width) / 2, size.width, margin.left, margin.right, area.width);
    return { top, left, side };
  }
  const left = side === 'left' ? anchor.x - offset - size.width : anchor.x + anchor.width + offset;
  const top = clamp(anchor.y + (anchor.height - size.height) / 2, size.height, margin.top, margin.bottom, area.height);
  return { top, left, side };
}

// ---------------------------------------------------------------------------------------------------------------
// TIP-8: at most one tooltip is open in a window; the next one opens without the delay.

let activeTooltip: { owner: number; close: () => void } | null = null;
let nextTooltipId = 1;

/** What the tooltip adds to its anchor, and what it reads of the anchor's own props. */
interface AnchorProps {
  ref?: Ref<unknown>;
  accessibilityHint?: string;
  onHoverIn?: (event: unknown) => void;
  onHoverOut?: (event: unknown) => void;
  onFocus?: (event: unknown) => void;
  onBlur?: (event: unknown) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onPress?: (event: GestureResponderEvent) => void;
  onKeyDown?: (event: KeyDownEvent & { stopPropagation?: () => void }) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** The description the anchor carries (TIP-14): the title first for a rich tooltip, then the text. */
export function tooltipDescription(variant: TooltipVariant, title: string, text: string): string {
  return [variant === 'rich' ? title.trim() : '', text.trim()].filter(Boolean).join(', ');
}

/**
 * Tanrei Tooltip — spec: `specs/tooltip.spec.json`.
 * Anatomy: anchor (your element, `children`) + container > [title] + supporting text. A read overlay: it
 * takes no focus and holds nothing pressable, and is drawn in the overlay layer `TanreiProvider` renders above the app
 * (not a `Modal`, which would block the screen). The text is the anchor's accessibility hint.
 */
export function Tooltip({
  variant: variantProp = 'plain',
  text,
  title = '',
  placement: placementProp = 'top',
  describes = true,
  open = false,
  onOpenChange,
  children,
  testID,
  inline = false,
}: TooltipProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.tooltip;
  const variant = closedValue(VARIANTS, variantProp, 'plain', 'Tooltip variant');
  const placement = closedValue(PLACEMENTS, placementProp, 'top', 'Tooltip placement');
  // TIP-16: without text it never opens and adds nothing; a plain tooltip ignores a title. Both reported in development.
  const hasText = text.trim() !== '';
  const where = testID ? ` (testID "${testID}")` : '';
  useEffect(() => {
    if (!__DEV__) return;
    if (!hasText) console.warn(`Tanrei: a Tooltip${where} has no text, so it never opens and describes nothing.`);
    if (variant === 'plain' && title.trim()) console.warn(`Tanrei: a plain Tooltip${where} ignores its title "${title}"; use variant "rich" to draw it.`);
  }, [hasText, variant, title, where]);

  // ---- Open state (TIP-1 … TIP-8)
  const [shown, setShown] = useState(open);
  const shownRef = useRef(open);
  const owner = useRef(0);
  if (owner.current === 0) owner.current = nextTooltipId++;
  const timers = useRef<{ show?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout>; touch?: ReturnType<typeof setTimeout> }>({});
  const input = useRef({ overAnchor: false, overTooltip: false, keyboard: false, pressing: false, longPressed: false, dismissed: false, activated: false });
  const clearTimer = (name: 'show' | 'hide' | 'touch') => {
    const timer = timers.current[name];
    if (timer !== undefined) clearTimeout(timer);
    timers.current[name] = undefined;
  };

  const report = useRef(onOpenChange);
  report.current = onOpenChange;
  /** Shows or hides the tooltip; `self` changes are reported (TIP-7), the product's are not. */
  const setOpen = useCallback((next: boolean, self: boolean) => {
    // TIP-16: without text it never opens.
    if (next && !hasTextRef.current) return;
    if (shownRef.current === next) return;
    shownRef.current = next;
    setShown(next);
    // The in-place drawing of the snapshot harness takes no part in the window's one open tooltip.
    if (inlineRef.current) {
      if (self) report.current?.(next);
      return;
    }
    if (next) {
      // TIP-8: the other tooltip closes at once.
      if (activeTooltip && activeTooltip.owner !== owner.current) activeTooltip.close();
      activeTooltip = { owner: owner.current, close: () => closeSelf() };
    } else if (activeTooltip?.owner === owner.current) activeTooltip = null;
    if (self) report.current?.(next);
  }, []);
  const closeSelf = () => {
    for (const name of ['show', 'hide', 'touch'] as const) clearTimer(name);
    setOpen(false, true);
  };
  const hasTextRef = useRef(hasText);
  hasTextRef.current = hasText;
  const inlineRef = useRef(inline);
  inlineRef.current = inline;

  // TIP-7: the product's `open` shows or hides it without a toggle.
  const previousOpen = useRef(open);
  useEffect(() => {
    if (previousOpen.current === open) return;
    previousOpen.current = open;
    setOpen(open, false);
  }, [open, setOpen]);
  useEffect(() => {
    // Shown by the product from the start: it is the window's open tooltip (TIP-8).
    if (shownRef.current && hasTextRef.current && !inlineRef.current) {
      if (activeTooltip && activeTooltip.owner !== owner.current) activeTooltip.close();
      activeTooltip = { owner: owner.current, close: () => closeSelf() };
    }
    return () => {
      for (const name of ['show', 'hide', 'touch'] as const) clearTimer(name);
      if (activeTooltip?.owner === owner.current) activeTooltip = null;
    };
  }, []);

  const openNow = () => {
    clearTimer('show');
    clearTimer('hide');
    setOpen(true, true);
  };
  /** TIP-1: after the show delay — at once while another tooltip is open (TIP-8). */
  const openSoon = () => {
    clearTimer('hide');
    if (shownRef.current) return;
    if (activeTooltip && activeTooltip.owner !== owner.current) {
      openNow();
      return;
    }
    clearTimer('show');
    timers.current.show = setTimeout(openNow, tokens.motionShowDelay);
  };
  /** TIP-1 / TIP-5: closes after the hide delay unless the pointer is back on the anchor or the tooltip, or the anchor has keyboard focus. */
  const closeSoon = () => {
    clearTimer('show');
    clearTimer('hide');
    timers.current.hide = setTimeout(() => {
      const now = input.current;
      if (!now.overAnchor && !now.overTooltip && !now.keyboard) closeSelf();
    }, tokens.motionHideDelay);
  };

  // ---- The anchor's input
  const anchor = Children.only(children);
  const own = (isValidElement(anchor) ? anchor.props : {}) as AnchorProps;
  const anchorNode = useRef<Measurable | null>(null);
  const [anchorBox, setAnchorBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const handlers: AnchorProps = {
    onHoverIn: (event) => {
      own.onHoverIn?.(event);
      const now = input.current;
      now.overAnchor = true;
      now.dismissed = false;
      if (now.activated) return;
      openSoon();
    },
    onHoverOut: (event) => {
      own.onHoverOut?.(event);
      const now = input.current;
      now.overAnchor = false;
      // TIP-6: a new hover may open it again.
      now.activated = false;
      if (!now.keyboard) closeSoon();
    },
    onPressIn: (event) => {
      own.onPressIn?.(event);
      input.current.pressing = true;
      input.current.longPressed = false;
    },
    onPressOut: (event) => {
      own.onPressOut?.(event);
      const now = input.current;
      now.pressing = false;
      // TIP-3: after a long-press it stays for the touch timeout once the finger lifts.
      if (now.longPressed && shownRef.current) {
        clearTimer('touch');
        timers.current.touch = setTimeout(closeSelf, tokens.timeoutTouch);
      }
    },
    onLongPress: (event) => {
      own.onLongPress?.(event);
      input.current.longPressed = true;
      input.current.dismissed = false;
      openNow();
    },
    onPress: (event) => {
      own.onPress?.(event);
      // TIP-6: an activation closes it, and the same hover does not open it again.
      input.current.activated = input.current.overAnchor;
      closeSelf();
    },
    onFocus: (event) => {
      own.onFocus?.(event);
      const now = input.current;
      // TIP-2: keyboard focus (not a press's) opens it at once.
      if (now.pressing) return;
      now.keyboard = true;
      now.dismissed = false;
      openNow();
    },
    onBlur: (event) => {
      own.onBlur?.(event);
      const now = input.current;
      now.keyboard = false;
      if (!now.overAnchor && !now.overTooltip) closeSelf();
    },
    onKeyDown: (event) => {
      own.onKeyDown?.(event);
      // TIP-4: Escape closes it without moving focus and goes no further.
      if (event.nativeEvent.key === 'Escape' && shownRef.current) {
        event.preventDefault?.();
        event.stopPropagation?.();
        input.current.dismissed = true;
        closeSelf();
      }
    },
    onLayout: (event) => {
      own.onLayout?.(event);
      measureAnchor();
    },
  };
  const ownRef = own.ref;
  const setAnchor = useCallback(
    (node: Measurable | null) => {
      anchorNode.current = node;
      if (typeof ownRef === 'function') ownRef(node);
      else if (ownRef && typeof ownRef === 'object') (ownRef as { current: unknown }).current = node;
    },
    [ownRef],
  );

  // TIP-14: the description, whether or not the tooltip is open; the anchor's own hint (if any) comes first.
  const description = describes && hasText ? tooltipDescription(variant, title, text) : '';
  const hint = [own.accessibilityHint, description].filter(Boolean).join(', ') || undefined;
  const cloned = isValidElement(anchor) ? cloneElement(anchor as ReactElement<AnchorProps>, { ...handlers, ref: setAnchor, accessibilityHint: hint }) : anchor;

  // ---- Where it goes (TIP-9)
  const window = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const drawn = shown && hasText;
  const portalRef = useRef<{ layer: { current: Measurable | null } | null }>({ layer: null });
  function measureAnchor() {
    const node = anchorNode.current;
    if (!drawn || inline || !node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      const layer = portalRef.current.layer?.current;
      const place = (ox: number, oy: number) =>
        setAnchorBox((previous) => {
          const next = { x: x - ox, y: y - oy, width, height };
          return previous && previous.x === next.x && previous.y === next.y && previous.width === next.width && previous.height === next.height ? previous : next;
        });
      if (layer?.measureInWindow) layer.measureInWindow((ox, oy) => place(ox, oy));
      else place(0, 0);
    });
  }
  useEffect(() => {
    if (drawn) measureAnchor();
    // Measured when it opens and whenever the window changes (rotation, split view).
  }, [drawn, window.width, window.height]);
  const onTooltipLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  // TIP-9: inside the window's safe area — TanreiProvider's insets.
  const insets = useTanreiInsets();
  const position = anchorBox && size ? placeTooltip({ anchor: anchorBox, size, area: window, placement, offset: tokens.offset, margin: tokens.windowMargin, rtl: I18nManager.isRTL, insets }) : null;

  // ---- Motion (TIP-15): a fade in and out, never a move or a scale.
  const reduce = useReduceMotion();
  const [present, setPresent] = useState(drawn);
  const fade = useRef(new Animated.Value(drawn ? 1 : 0)).current;
  const placed = position !== null;
  useEffect(() => {
    if (inline) return undefined;
    if (drawn) setPresent(true);
    if (drawn && !placed) return undefined;
    const target = drawn ? 1 : 0;
    // Android's reduced-motion setting removes every animation: at once there; elsewhere the fade stays.
    if (reduce && Platform.OS === 'android') {
      fade.setValue(target);
      if (!drawn) setPresent(false);
      return undefined;
    }
    const animation = Animated.timing(fade, {
      toValue: target,
      duration: drawn ? tokens.motionEnterDuration : tokens.motionExitDuration,
      easing: toEasing(drawn ? tokens.motionEnterEasing : tokens.motionExitEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !drawn) setPresent(false);
    });
    return () => animation.stop();
  }, [drawn, placed, reduce, inline, fade, tokens]);

  const surface = (
    <TooltipSurface
      variant={variant}
      title={title}
      text={text}
      tokens={tokens}
      theme={theme}
      testID={testID}
      onPointerEnter={() => {
        input.current.overTooltip = true;
        clearTimer('hide');
      }}
      onPointerLeave={() => {
        input.current.overTooltip = false;
        if (!input.current.overAnchor && !input.current.keyboard) closeSoon();
      }}
      onPressed={closeSelf}
    />
  );

  // TIP-9 / TIP-13 / TIP-15: in the overlay layer, placed against the anchor, unseen until placed, fading.
  const overlay = useMemo(
    () =>
      !inline && (present || drawn) ? (
        <TanreiThemeScope theme={theme}>
          <Animated.View
            onLayout={onTooltipLayout}
            pointerEvents={drawn ? 'auto' : 'none'}
            style={{ position: 'absolute', top: position?.top ?? 0, left: position?.left ?? 0, opacity: placed ? fade : 0 }}
            testID={partTestID(testID, 'placement')}
            {...HIDDEN}
          >
            {surface}
          </Animated.View>
        </TanreiThemeScope>
      ) : null,
    // The surface is rebuilt from these.
    [inline, present, drawn, theme, position?.top, position?.left, placed, variant, title, text, tokens, testID],
  );
  const portal = useOverlayPortal('tooltip', overlay);
  portalRef.current.layer = portal.layer as { current: Measurable | null } | null;
  // The overlay layer is TanreiProvider's: without one there is nowhere to draw.
  const unhosted = drawn && !inline && !portal.hosted;
  useEffect(() => {
    if (__DEV__ && unhosted) console.warn(`Tanrei: a Tooltip${where} opened outside a TanreiProvider, which hosts the overlay layer it is drawn in; it is not drawn.`);
  }, [unhosted, where]);

  if (!inline) return cloned;
  // The snapshot harness: the tooltip beside its anchor, in place.
  const horizontal = placement === 'start' || placement === 'end';
  const before = placement === 'top' || placement === 'start';
  const tooltip = drawn ? <View {...HIDDEN}>{surface}</View> : null;
  return (
    <View style={{ flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', gap: tokens.offset }} testID={partTestID(testID, 'inline')}>
      {before ? tooltip : null}
      {/* Its own box, so that an anchor that aligns itself (alignSelf) is still centred against the tooltip. */}
      <View>{cloned}</View>
      {before ? null : tooltip}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The drawn tooltip (TIP-10 … TIP-13)

interface TooltipSurfaceProps {
  variant: TooltipVariant;
  title: string;
  text: string;
  tokens: TanreiTooltipTokens;
  theme: TanreiTheme;
  testID: string | undefined;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPressed: () => void;
}

function TooltipSurface({ variant, title, text, tokens, theme, testID, onPointerEnter, onPointerLeave, onPressed }: TooltipSurfaceProps) {
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const rich = variant === 'rich';
  const shape = rich ? tokens.richContainerShape : tokens.plainContainerShape;
  const elevation = theme.elevation(rich ? tokens.richContainerElevation : tokens.plainContainerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const color = rich ? tokens.richContainerColor : tokens.plainContainerColor;
  const container: ViewStyle = rich
    ? { maxWidth: tokens.richContainerMaxWidth, paddingHorizontal: tokens.richContainerPaddingInline, paddingVertical: tokens.richContainerPaddingBlock, gap: tokens.richContainerGap }
    : { maxWidth: tokens.plainContainerMaxWidth, minHeight: tokens.plainContainerMinHeight, paddingHorizontal: tokens.plainContainerPaddingInline, paddingVertical: tokens.plainContainerPaddingBlock, justifyContent: 'center' };
  const titleText = rich && title.trim() ? title : '';
  return (
    <View
      // TIP-13: a press on it closes it and reaches nothing under it; it holds nothing pressable or focusable.
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPressed}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
        alignSelf: 'flex-start',
        borderRadius: shape,
        ...(theme.resolve(color).a > 0 ? { backgroundColor: theme.paint(color) } : null),
        ...container,
        ...shadow,
        ...borderCurveOf(cornerSmoothing),
      }}
      testID={part('container')}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {titleText ? (
        <Label style={theme.text(tokens.richTitleTypescale)} color={theme.paint(tokens.richTitleColor)} testID={part('title')}>
          {titleText}
        </Label>
      ) : null}
      {/* TIP-12: start-aligned by the layout direction (React Native's default), growing with the text. */}
      <Label style={theme.text(rich ? tokens.richSupportingTextTypescale : tokens.plainSupportingTextTypescale)} color={theme.paint(rich ? tokens.richSupportingTextColor : tokens.plainSupportingTextColor)} testID={part('text')}>
        {text}
      </Label>
    </View>
  );
}

