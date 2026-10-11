import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Animated,
  I18nManager,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiCarouselTokens, TanreiColor, TanreiPaint } from '../generated/vocabulary';
import { RESTING_OPACITY, drawsColor, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { usePressInteraction } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { useRovingFocus, type FocusableNode, type KeyDownEvent } from '../primitives/rovingFocus';
import { HIDDEN_FROM_ASSISTIVE_TECHNOLOGY, SHEET_FLING_VELOCITY } from '../primitives/sheet';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { ContentColorProvider } from '../theme/contentColor';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { formatColor } from '../theme/paint';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';

/** How the row arranges its items (CRL-10, CRL-11, CRL-13). Not a token axis: the layouts are geometry. */
export type CarouselLayout = 'multi-browse' | 'hero' | 'uncontained';
const LAYOUTS: readonly CarouselLayout[] = ['multi-browse', 'hero', 'uncontained'];

export type CarouselRef = ComponentRef<typeof View>;
export type CarouselItemRef = ComponentRef<typeof Pressable>;

export interface CarouselProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The spec's `label`: names the list for assistive technology ("Recently played"). Required. */
  accessibilityLabel?: string;
  /** `multi-browse` (default), `hero` or `uncontained`. Unknown values render as `multi-browse` (CRL-24). */
  layout?: CarouselLayout;
  /**
   * A large item's width in points, for multi-browse and uncontained; `null` / absent takes the tokens'
   * `containerLargeWidth`. The hero layout ignores it. A value that is not a positive number counts as absent (CRL-24).
   */
  itemWidth?: number | null;
  /** The items: `CarouselItem` elements, in order. */
  children?: ReactNode;
  /** The carousel's own sizing (its height, margins): it is as wide as its parent and `layoutHeight` tall otherwise. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<CarouselRef>;
}

export interface CarouselItemProps {
  /** The item's accessible name: what its content shows ("Coast path, 12 photos"). Required; the content is not read. */
  label?: string;
  /** The spec's `click`: the item was activated by touch, pointer, keyboard or assistive technology. */
  onPress?: (event: GestureResponderEvent) => void;
  /** The content (an image, a poster), laid out at a large item's width and centred; it holds no interactive element. */
  children?: ReactNode;
  testID?: string;
  ref?: Ref<CarouselItemRef>;
}

// ---------------------------------------------------------------------------------------------------------------
// The arrangement (CRL-8 … CRL-13): pure, under its tests.

export interface CarouselSlot {
  /** From the inner start edge (after the start padding). */
  start: number;
  width: number;
}

export interface CarouselArrangement {
  layout: CarouselLayout;
  /** The inner width: the carousel's width less the padding at both ends. */
  inner: number;
  padding: number;
  gap: number;
  /** The large width L (the hero's large slot): what every item's content is laid out at (CRL-15). */
  large: number;
  /** Slots -1 … K, by index + 1 (`slots[0]` is slot -1, `slots[K + 1]` slot K). Empty for uncontained. */
  slots: CarouselSlot[];
  /** K: the slots in view. */
  count: number;
  /** The large slots: how many items can rest at the start at once (the scroll position's range ends at N − this). */
  largeSlots: number;
  /** One step of the scroll position p, in points: the large slot plus the gap. */
  step: number;
}

/**
 * CRL-9 … CRL-13: the slots of a carousel `width` wide (its full width, the padding included), from the tokens, the layout
 * and the product's large width. Widths are not rounded. Package-internal.
 */
export function carouselArrangement(width: number, tokens: Pick<TanreiCarouselTokens, 'containerLargeWidth' | 'containerSmallMinWidth' | 'containerSmallMaxWidth' | 'layoutGap' | 'layoutPaddingInline'>, layout: CarouselLayout, itemWidth: number | null): CarouselArrangement {
  const padding = tokens.layoutPaddingInline;
  const gap = tokens.layoutGap;
  const inner = Math.max(0, width - 2 * padding);
  const smallMin = tokens.containerSmallMinWidth;
  const smallMax = tokens.containerSmallMaxWidth;
  const around = (widths: number[]): CarouselSlot[] => {
    const inView: CarouselSlot[] = [];
    let at = 0;
    for (const each of widths) {
      inView.push({ start: at, width: each });
      at += each + gap;
    }
    const edge = widths[widths.length - 1]!;
    // Slot -1 ends at the carousel's start edge, slot K starts at its end edge, both as wide as slot K - 1.
    return [{ start: -padding - edge, width: edge }, ...inView, { start: inner + padding, width: edge }];
  };
  const one = (large: number): CarouselArrangement => ({ layout, inner, padding, gap, large, slots: around([large]), count: 1, largeSlots: 1, step: large + gap });

  // CRL-9: too narrow for a large and two small items — every layout is one slot, the inner width.
  if (inner < 3 * smallMin + 2 * gap) {
    if (layout === 'uncontained') return { layout, inner, padding, gap, large: inner, slots: [], count: 0, largeSlots: 1, step: inner + gap };
    return one(inner);
  }
  const wanted = itemWidth ?? tokens.containerLargeWidth;
  if (layout === 'uncontained') {
    const large = Math.min(wanted, inner);
    return { layout, inner, padding, gap, large, slots: [], count: 0, largeSlots: 1, step: large + gap };
  }
  if (layout === 'hero') {
    // CRL-11: one large slot and the small one at its widest; itemWidth is ignored.
    const large = inner - gap - smallMax;
    return { layout, inner, padding, gap, large, slots: around([large, smallMax]), count: 2, largeSlots: 1, step: large + gap };
  }
  // CRL-10: as many large slots as leave room for two small ones, then a medium and a small one filling the rest.
  const room = inner - 2 * (smallMin + gap);
  const large = Math.min(wanted, room);
  const n = Math.max(1, Math.floor((room + 1e-9) / (large + gap)));
  const rest = inner - n * (large + gap);
  let small = Math.min(smallMax, Math.max(smallMin, (rest - gap) / 3));
  let medium = rest - gap - small;
  if (medium > large) {
    medium = large;
    small = rest - gap - large;
  }
  const widths = [...Array.from({ length: n }, () => large), medium, small];
  return { layout, inner, padding, gap, large, slots: around(widths), count: widths.length, largeSlots: n, step: large + gap };
}

/** CRL-12: where item `index` is (from the inner start edge) and how wide, at scroll position `p`; null out of view. */
export function carouselItemAt(arrangement: CarouselArrangement, index: number, p: number): CarouselSlot | null {
  if (arrangement.layout === 'uncontained' || arrangement.count === 0) {
    const { large, gap } = arrangement;
    return { start: index * (large + gap) - p * (large + gap), width: large };
  }
  const s = index - p;
  const K = arrangement.count;
  if (s < -1 || s > K) return null;
  const below = Math.floor(s);
  const t = s - below;
  const a = arrangement.slots[below + 1]!;
  const b = arrangement.slots[Math.min(below + 2, K + 1)]!;
  return { start: a.start + (b.start - a.start) * t, width: a.width + (b.width - a.width) * t };
}

// ---------------------------------------------------------------------------------------------------------------
// The carousel

/** What the carousel tells each item (the internal channel): where it is and how it takes focus. */
interface ItemChannel {
  index: number;
  /** The item's left edge in the scroll content and its width (animated with the scroll), and its content's left inside it. */
  left: Animated.AnimatedInterpolation<number> | number;
  width: Animated.AnimatedInterpolation<number> | number;
  contentLeft: Animated.AnimatedInterpolation<number> | number;
  /** The large width: what the content is laid out at. */
  contentWidth: number;
  /** The width it rests at now, for its minimum target (CRL-4). */
  restWidth: number;
  height: number;
  tabStop: boolean;
  ref: (node: FocusableNode | null) => void;
  onFocus: () => void;
  testID: string | undefined;
}

const ItemContext = createContext<ItemChannel | null>(null);

/** The items, fragments opened. */
function carouselItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? carouselItems(child.props.children) : [child]));
}

/**
 * Tanrei Carousel — spec: `specs/carousel.spec.json`.
 * Anatomy: row (a horizontal `ScrollView` as wide as its parent, padded at both ends, whose content is as long as the
 * scroll range) > items (`CarouselItem`: a rounded container that clips its content, laid out at a large item's width and
 * centred; the focus ring inside). Multi-browse and hero place each item from the scroll offset by CRL-12's slots and
 * settle at a whole position; uncontained scrolls freely. ONE Tab stop, arrow keys inside (CRL-17).
 */
export function Carousel({ accessibilityLabel, layout: layoutProp = 'multi-browse', itemWidth: itemWidthProp = null, children, style, testID, ref, ...rest }: CarouselProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.carousel;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const rtl = I18nManager.isRTL;
  const reduce = useReduceMotion();

  // CRL-24: an unknown layout renders as multi-browse; an itemWidth that is not a positive number as null. Reported.
  const layout = closedValue(LAYOUTS, layoutProp, 'multi-browse', 'Carousel layout');
  const validWidth = itemWidthProp === null || itemWidthProp === undefined || (typeof itemWidthProp === 'number' && Number.isFinite(itemWidthProp) && itemWidthProp > 0);
  const itemWidth = validWidth ? itemWidthProp ?? null : null;
  const items = carouselItems(children);
  const count = items.length;
  const named = Boolean(accessibilityLabel?.trim());
  useEffect(() => {
    if (__DEV__ && !validWidth) console.warn(`Tanrei: a Carousel${where} has itemWidth ${String(itemWidthProp)}, which is not a positive number; using the tokens' large width.`);
  }, [validWidth, itemWidthProp, where]);
  useEffect(() => {
    if (__DEV__ && !named) console.warn(`Tanrei: a Carousel${where} has no accessibilityLabel, so its list has no name.`);
  }, [named, where]);

  // CRL-8: as wide as its parent (measured; the window's width until the first layout pass) and layout.height tall.
  const window = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box?.width ?? window.width;
  const height = box?.height ?? tokens.layoutHeight;
  const arrangement = useMemo(() => carouselArrangement(width, tokens, layout, itemWidth), [width, tokens, layout, itemWidth]);
  const uncontained = layout === 'uncontained';
  // CRL-12 / CRL-13: the scroll range — whole steps up to N − n (multi-browse, hero); the row's overflow (uncontained).
  const maxP = uncontained ? 0 : Math.max(0, count - arrangement.largeSlots);
  const range = uncontained ? Math.max(0, count * arrangement.large + Math.max(0, count - 1) * arrangement.gap - arrangement.inner) : arrangement.step * maxP;
  const content = width + range;

  // The scroll offset (physical; the row is laid out left to right and mirrored by the geometry in right-to-left, CRL-23).
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const scrollX = useRef(new Animated.Value(rtl ? range : 0)).current;
  const offset = useRef(rtl ? range : 0);
  const logical = useCallback((x: number) => (rtl ? range - x : x), [rtl, range]);
  const physical = logical;
  const positionOf = useCallback((x: number) => (uncontained ? logical(x) / arrangement.step : Math.min(maxP, Math.max(0, logical(x) / arrangement.step))), [uncontained, logical, arrangement.step, maxP]);
  // Where the row rests (re-rendered on settling, not on every frame): the tab stop and the resting widths come from it.
  const [resting, setResting] = useState(0);

  // CRL-14 / CRL-18: moves the row to an offset over the scroll motion (at once with reduce motion).
  const settling = useRef<Animated.CompositeAnimation | null>(null);
  const moveTo = useCallback(
    (target: number) => {
      settling.current?.stop();
      const bounded = Math.min(range, Math.max(0, target));
      const finish = () => {
        settling.current = null;
        offset.current = bounded;
        scrollX.setValue(bounded);
        setResting(positionOf(bounded));
      };
      if (reduce || Math.abs(bounded - offset.current) < 0.5) {
        scroll.current?.scrollTo({ x: bounded, animated: false });
        finish();
        return;
      }
      const driver = new Animated.Value(offset.current);
      const follow = driver.addListener(({ value }) => scroll.current?.scrollTo({ x: value, animated: false }));
      const animation = Animated.timing(driver, { toValue: bounded, duration: tokens.motionScrollDuration, easing: toEasing(tokens.motionScrollEasing), useNativeDriver: false });
      settling.current = animation;
      animation.start(({ finished }) => {
        driver.removeListener(follow);
        if (finished) {
          scroll.current?.scrollTo({ x: bounded, animated: false });
          finish();
        }
      });
    },
    [range, reduce, scrollX, positionOf, tokens],
  );
  const settle = useCallback(
    (velocity: number) => {
      if (uncontained) {
        setResting(positionOf(offset.current));
        return;
      }
      const p = positionOf(offset.current);
      // A fling goes on to the next whole position in its direction; a slow release to the nearest (CRL-14).
      const forward = rtl ? -velocity : velocity;
      const whole = forward > SHEET_FLING_VELOCITY ? Math.ceil(p - 1e-6) : forward < -SHEET_FLING_VELOCITY ? Math.floor(p + 1e-6) : Math.round(p);
      moveTo(physical(Math.min(maxP, Math.max(0, whole)) * arrangement.step));
    },
    [uncontained, positionOf, rtl, moveTo, physical, maxP, arrangement.step],
  );
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: false,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = event.nativeEvent.contentOffset.x;
        },
      }),
    [scrollX],
  );
  const onScrollBeginDrag = useCallback(() => {
    settling.current?.stop();
    settling.current = null;
  }, []);
  const onScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => settle(event.nativeEvent.velocity?.x ?? 0), [settle]);
  const onMomentumScrollEnd = useCallback(() => {
    if (!settling.current) settle(0);
  }, [settle]);

  // CRL-21: a new width or new items arrange the slots again and keep the item at slot 0 (first in view) where it was,
  // as far as the new range allows, without motion.
  const keys: string[] = items.map((item, index) => (isValidElement(item) && item.key != null ? String(item.key) : `#${index}`));
  const anchor = useRef<string | null>(null);
  const previous = useRef({ width, range, keys: keys.join('|') });
  useEffect(() => {
    const was = previous.current;
    const now = { width, range, keys: keys.join('|') };
    previous.current = now;
    if (was.width === now.width && was.range === now.range && was.keys === now.keys) return;
    const held = anchor.current;
    const index = held ? Math.max(0, keys.indexOf(held)) : 0;
    const p = uncontained ? index : Math.min(maxP, index);
    const target = physical(Math.min(range, Math.max(0, p * arrangement.step)));
    offset.current = target;
    scrollX.setValue(target);
    scroll.current?.scrollTo({ x: target, animated: false });
    setResting(positionOf(target));
  });
  const slotZero = uncontained ? Math.min(count - 1, Math.ceil(resting - 1e-6)) : Math.min(count - 1, Math.round(resting));
  useEffect(() => {
    const key = keys[Math.max(0, slotZero)];
    anchor.current = key ?? null;
  });

  // CRL-17: one Tab stop — the item focused last, else the item at slot 0 (the first wholly in view); Right / Left Arrow
  // (mirrored in right-to-left) to the next / previous item without wrapping, Home and End to the first and last.
  const labels = useMemo(() => items.map(() => ''), [count]);
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const roving = useRovingFocus({ labels, wrap: false, preferred: Math.max(0, slotZero), orientation: 'horizontal', rtl, typeahead: false, onKeyDown: callerKeyDown });

  // CRL-18: an item that takes focus is brought into place — to slot 0 (as near as the range allows), or wholly into view.
  const bringIntoPlace = useCallback(
    (index: number) => {
      if (uncontained) {
        const start = arrangement.padding + index * arrangement.step;
        const end = start + arrangement.large;
        const now = logical(offset.current);
        let target = now;
        if (start - arrangement.padding < now) target = start - arrangement.padding;
        else if (end + arrangement.padding > now + width) target = end + arrangement.padding - width;
        if (target !== now) moveTo(physical(target));
        return;
      }
      moveTo(physical(Math.min(maxP, index) * arrangement.step));
    },
    [uncontained, arrangement, logical, width, moveTo, physical, maxP],
  );

  // CRL-12 / CRL-13 / CRL-15 / CRL-23: each item's left edge in the scroll content, its width and its content's offset, as
  // functions of the scroll offset (piecewise linear between whole positions; clamped beyond slots -1 and K, which lie
  // outside the view).
  const { tabStop, itemRef, itemFocused } = roving;
  const channels = useMemo(
    () =>
      items.map((_item, index): ItemChannel => {
        const contentWidth = arrangement.large;
        const restSlot = carouselItemAt(arrangement, index, resting) ?? { start: 0, width: arrangement.slots[arrangement.slots.length - 1]?.width ?? arrangement.large };
        const common = {
          index,
          contentWidth,
          restWidth: restSlot.width,
          height,
          tabStop: index === tabStop,
          ref: itemRef(index),
          onFocus: () => {
            itemFocused(index);
            bringIntoPlace(index);
          },
          testID: part(`item.${index}`),
        };
        if (uncontained || arrangement.count === 0) {
          const start = arrangement.padding + index * arrangement.step;
          const left = rtl ? content - start - arrangement.large : start;
          return { ...common, left, width: arrangement.large, contentLeft: (arrangement.large - contentWidth) / 2 };
        }
        const K = arrangement.count;
        const inputs: number[] = [];
        const lefts: number[] = [];
        const widths: number[] = [];
        const contentLefts: number[] = [];
        for (let k = -1; k <= K; k += 1) {
          const slot = arrangement.slots[k + 1]!;
          // Item `index` is at slot k when p = index - k.
          const x = physical((index - k) * arrangement.step);
          const left = rtl ? x + width - (arrangement.padding + slot.start + slot.width) : x + arrangement.padding + slot.start;
          inputs.push(x);
          lefts.push(left);
          widths.push(slot.width);
          contentLefts.push((slot.width - contentWidth) / 2);
        }
        const order = inputs.map((_, i) => i).sort((a, b) => inputs[a]! - inputs[b]!);
        const pick = (values: number[]) => order.map((i) => values[i]!);
        const inputRange = pick(inputs);
        const along = (outputRange: number[]) => scrollX.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
        return { ...common, left: along(pick(lefts)), width: along(pick(widths)), contentLeft: along(pick(contentLefts)) };
      }),
    [items.length, arrangement, resting, height, tabStop, itemRef, itemFocused, bringIntoPlace, uncontained, rtl, content, width, physical, scrollX, testID],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: measured, height: tall } = event.nativeEvent.layout;
    setBox((was) => (was && was.width === measured && was.height === tall ? was : { width: measured, height: tall }));
  }, []);

  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keyHandler = { onKeyDown: roving.onKeyDown } as object;
  return (
    // CRL-19: a list named by the label; each item a button (its position is the screen reader's own count).
    <View {...rest} {...keyHandler} ref={ref} role="list" accessibilityLabel={named ? accessibilityLabel : undefined} onLayout={onLayout} style={[{ alignSelf: 'stretch', height: tokens.layoutHeight }, style]} testID={testID}>
      <Animated.ScrollView
        ref={scroll}
        horizontal
        // The row is laid out left to right whatever the direction; the geometry mirrors it (CRL-23).
        style={{ flex: 1, direction: 'ltr' }}
        contentContainerStyle={{ width: content, height: '100%' }}
        contentOffset={{ x: rtl ? range : 0, y: 0 }}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        testID={part('row')}
      >
        {items.map((item, index) => (
          <ItemContext.Provider key={keys[index]} value={channels[index]!}>
            {item}
          </ItemContext.Provider>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// An item (CRL-1 … CRL-7, CRL-15, CRL-16, CRL-19, CRL-20, CRL-22)

/**
 * CRL-16: the item's state layer — item.state-layer.color at the system's state-layer opacity of the state
 * (sys.state.hover-, focus- or pressed-state-layer-opacity), nothing at rest. The spec names both tokens and the
 * composition; nothing here decides how a state looks.
 */
function stateLayer(theme: TanreiTheme, paint: TanreiPaint, state: 'enabled' | 'hovered' | 'focused' | 'pressed'): TanreiColor {
  const color = theme.resolve(paint);
  const { hoverStateLayerOpacity, focusStateLayerOpacity, pressedStateLayerOpacity } = theme.system.state;
  switch (state) {
    case 'enabled':
      return { ...color, a: 0 };
    case 'hovered':
      return { ...color, a: color.a * hoverStateLayerOpacity };
    case 'focused':
      return { ...color, a: color.a * focusStateLayerOpacity };
    case 'pressed':
      return { ...color, a: color.a * pressedStateLayerOpacity };
  }
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * One item of a `Carousel` (the spec's item kind `item`): the content in a rounded container, one button named by
 * `label`. Only inside a `Carousel`, which places it.
 */
export function CarouselItem({ label = '', onPress, children, testID: ownTestID, ref }: CarouselItemProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.carousel;
  const { cornerSmoothing } = theme.system.shape;
  const channel = useContext(ItemContext);
  const testID = ownTestID ?? channel?.testID;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const named = label.trim() !== '';
  useEffect(() => {
    if (__DEV__ && !channel) console.warn(`Tanrei: a CarouselItem${where} is outside a Carousel, which places it; it draws nothing.`);
  }, [channel === null, where]);
  useEffect(() => {
    if (__DEV__ && channel && !named) console.warn(`Tanrei: a CarouselItem${where} (item ${(channel?.index ?? 0) + 1} of its Carousel) has no label, so it has no accessible name.`);
  }, [named, channel === null, where]);

  const appearance = lookupValue(tokens.parts, 'item', 'item', 'Carousel part');
  const estimate = { width: channel?.restWidth ?? tokens.containerSmallMinWidth, height: channel?.height ?? tokens.layoutHeight };
  const handleRef = useCallback(
    (node: CarouselItemRef | null) => {
      channel?.ref(node as FocusableNode | null);
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: CarouselItemRef | null }).current = node;
    },
    [channel?.ref, ref],
  );
  const channelFocus = channel?.onFocus;
  // CRL-1 … CRL-6: the press hold, hover, keyboard focus and the ripple; the state that wins.
  const interaction = usePressInteraction({
    disabled: false,
    estimate,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: handleRef,
    onPress,
    onFocus: channelFocus ? () => channelFocus() : undefined,
  });
  // An item is never disabled: its states are the four of the spec.
  const active = (value: typeof interaction.state) => (value === 'disabled' ? 'enabled' : value);
  const state = active(interaction.state);
  const current = appearance[state];
  // CRL-16: an item's content usually covers it (an image), so the state answer is a layer OVER the content —
  // item.state-layer.color at the sys.state opacity of the state (none at rest) — and the container under the content
  // keeps the resting fill. CRL-6: under ripple (while one draws) and dim the layer stays with the state under the press.
  const layerState = interaction.layerless ? active(interaction.under) : state;
  const layer = stateLayer(theme, appearance[layerState].stateLayerColor, layerState);
  const shapes = { containerShape: tokens.containerShape, hoveredOpacity: tokens.hoveredOpacity, hoveredContainerShape: tokens.hoveredContainerShape, focusedOpacity: tokens.focusedOpacity, focusedContainerShape: tokens.focusedContainerShape, pressedOpacity: tokens.pressedOpacity, pressedContainerShape: tokens.pressedContainerShape, disabledOpacity: RESTING_OPACITY };
  const { opacity, shape } = stateShape(shapes, state);
  const colors = { container: theme.resolve(appearance.enabled.containerColor), layer, content: theme.resolve(current.contentColor) };
  // CRL-22: the colors, the shape and the opacity move over the state motion; a press lands at once.
  const drawn = useStateTransition({ ...colors, opacity, shape }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' });
  if (!channel) return null;

  // CRL-4: the hit area is the container with half the gap on each side, never less than the target on either axis.
  const target = theme.system.measure.target.touch;
  const horizontal = Math.max(tokens.layoutGap / 2, Math.ceil((target - channel.restWidth) / 2));
  const vertical = Math.max(0, Math.ceil((target - channel.height) / 2));
  const slop: Insets = { top: vertical, bottom: vertical, left: horizontal, right: horizontal };

  const host: ViewStyle = { position: 'absolute', top: 0, bottom: 0, left: 0, ...borderCurveOf(cornerSmoothing) };
  // CRL-16: the content color of the item's state as the content's foreground (settled, as a card hands it).
  const contentColor = theme.paint(current.contentColor);
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={slop}
      testID={testID}
      focusable={channel.tabStop}
      role="button"
      accessibilityLabel={named ? label : undefined}
      style={[host, { left: channel.left, width: channel.width, backgroundColor: fillOf(colors.container, drawn.container), borderRadius: drawn.shape, opacity: drawn.opacity }]}
    >
      {/* CRL-15: the content at the large width and the full height, centred, clipped to the container's corners. */}
      <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', borderRadius: drawn.shape, ...borderCurveOf(cornerSmoothing) }} pointerEvents="none" testID={part('clip')}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: channel.contentLeft, width: channel.contentWidth }} testID={part('content')} {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY}>
          <ContentColorProvider color={contentColor}>{children}</ContentColorProvider>
        </Animated.View>
      </Animated.View>
      {/* CRL-16: the state layer and the ripple over the content, clipped to the container's corners. The layer exists only while it draws. */}
      {drawsColor(colors.layer, drawn.layer) ? (
        <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: drawn.shape, backgroundColor: drawn.layer, ...borderCurveOf(cornerSmoothing) }} pointerEvents="none" testID={part('state-layer')} {...HIDDEN_FROM_ASSISTIVE_TECHNOLOGY} />
      ) : null}
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={formatColor(stateLayer(theme, appearance.pressed.stateLayerColor, 'pressed'))} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {/* CRL-3 / CRL-7: inside the container, which the row would otherwise clip; never animated. */}
      <FocusRing visible={interaction.focused} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
