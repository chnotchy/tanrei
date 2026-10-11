import { Children, Fragment, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { I18nManager, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiToolbarVariant } from '../generated/vocabulary';
import { partTestID } from '../primitives/content';
import { Ring } from '../primitives/Ring';
import { useRovingFocus, type KeyDownEvent } from '../primitives/rovingFocus';
import { RovingItemContext, type RovingItem } from '../primitives/rovingItem';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, useTanreiInsets, type TanreiInsets } from '../theme/TanreiProvider';
import { Button } from './Button';
import { IconButton } from './IconButton';

/**
 * Open keys: the core values — `docked`, `floating` — plus whatever the product's design system added (its
 * generated file augments `TanreiToolbarVariantRegistry`).
 */
export type ToolbarVariant = TanreiToolbarVariant;

/** The direction the items run. A docked toolbar is always horizontal. */
export type ToolbarOrientation = 'horizontal' | 'vertical';
const ORIENTATIONS: readonly ToolbarOrientation[] = ['horizontal', 'vertical'];

/** The toolbar's outer view (`role="toolbar"`). */
export type ToolbarRef = ComponentRef<typeof View>;

export interface ToolbarProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `docked` (the default) spans the bottom edge; `floating` is a rounded, raised surface over the content. Unknown values render as `docked` (TBR-13). */
  variant?: ToolbarVariant;
  /** `horizontal` (the default) or `vertical` (a floating toolbar beside the content). A docked toolbar is always horizontal (TBR-6). */
  orientation?: ToolbarOrientation;
  /** The spec's `label`: names the toolbar for assistive technology ("Formatting"). Never drawn. Required (TBR-12). */
  accessibilityLabel?: string;
  /**
   * The system insets a DOCKED toolbar reaches under (its color) and keeps its items inside: the bottom one and the side
   * ones. Each side given replaces `TanreiProvider`'s `insets` (a toolbar that is not at the bottom of the window passes
   * `{ bottom: 0 }`). A floating toolbar reads none (TBR-5).
   */
  insets?: TanreiInsets;
  /** The items, in reading order: `IconButton` elements (the spec's `action`) and `Button` elements (`button`). Laid out, never restyled. */
  children?: ReactNode;
  /** Layout of the toolbar (margins, `alignSelf`, `position` — a floating toolbar is placed by its layout); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ToolbarRef>;
}

/** The items, fragments opened: what the toolbar lays out and counts. */
function toolbarItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? toolbarItems(child.props.children) : [child]));
}

/** Is `node` an item the toolbar can hold: a Tanrei `IconButton` (an `action`) or `Button` (a `button`) element? */
const isItem = (node: ReactNode) => isValidElement(node) && (node.type === IconButton || node.type === Button);
/** Does an item take focus: a Tanrei item that is not disabled (TBR-10: "a disabled item SHALL NOT take focus"). */
const takesFocus = (node: ReactNode) => isItem(node) && !(node as { props: { disabled?: boolean } }).props.disabled;

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

type Box = { x: number; y: number; width: number; height: number };

/**
 * Tanrei Toolbar — spec: `specs/toolbar.spec.json`.
 * Anatomy: container (docked: across the bottom edge, reaching under the bottom and side insets; floating: a rounded,
 * raised surface) > the items, in a row (or a column) that scrolls when they do not fit + the outline (docked: the top
 * edge; floating: around the whole shape). The items are the product's `IconButton`s and `Button`s, laid out and never
 * restyled; the toolbar is ONE Tab stop over them (WAI-ARIA toolbar), through an internal channel to each item.
 */
export function Toolbar({
  variant = 'docked',
  orientation: orientationProp = 'horizontal',
  accessibilityLabel,
  insets: ownInsets,
  children,
  style,
  testID,
  ref,
  ...rest
}: ToolbarProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.toolbar;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // TBR-13: variant is an open key (a value the active system does not have is drawn from `docked`'s tokens); orientation
  // is closed (a value the component does not define is horizontal). Both are reported once in development builds.
  const dims = lookupValue(tokens.variants, variant, 'docked', 'Toolbar variant');
  // TBR-13: the structure is not a value a layer can set. Floating hugs its items; every other value — docked, one a
  // layer adds (with its own values), or one the system does not have — takes the docked structure.
  const docked = variant !== 'floating';
  const asked = closedValue(ORIENTATIONS, orientationProp, 'horizontal', 'Toolbar orientation');
  // TBR-6: a docked toolbar is horizontal whatever it is asked (reported below).
  const orientation: ToolbarOrientation = docked ? 'horizontal' : asked;
  const horizontal = orientation === 'horizontal';
  const rtl = I18nManager.isRTL;
  // TBR-3: the provider's insets, each side the toolbar's own `insets` names replacing it. Only a docked toolbar reads them.
  const insets = useTanreiInsets(ownInsets);

  const items = toolbarItems(children);
  const count = items.length;

  // TBR-6, TBR-12: still rendered; development builds say what is wrong.
  const named = Boolean(accessibilityLabel?.trim());
  const strays = items.map((item, index) => (isItem(item) ? null : index + 1)).filter((n): n is number => n !== null);
  const reports = [
    ...(named ? [] : [`Tanrei: a Toolbar${where} has no accessibilityLabel. Name it for assistive technology ("Formatting", "Message actions").`]),
    ...(count === 0 ? [`Tanrei: a Toolbar${where} holds no item; it holds IconButtons and Buttons.`] : []),
    ...strays.map((n) => `Tanrei: item ${n} of a Toolbar${where} is not a Tanrei IconButton or Button; a field or a slider would take the arrow keys the toolbar moves focus with.`),
    ...(docked && asked === 'vertical' ? [`Tanrei: a docked Toolbar${where} is horizontal; orientation "vertical" is for a floating toolbar.`] : []),
  ].join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // TBR-10: one Tab stop — the item focused last, else the first item that is not disabled. Right / Left Arrow
  // (mirrored in right-to-left) or Down / Up Arrow move focus to the next / previous such item, wrapping; Home and End to
  // the first and last. Moving focus never activates: Enter and Space reach the focused item's Pressable as its click.
  const labels = useMemo(() => items.map((item) => (takesFocus(item) ? '' : null)), [items.map((item) => (takesFocus(item) ? '1' : '0')).join('')]);
  const firstEnabled = labels.findIndex((label) => label !== null);
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const roving = useRovingFocus({ labels, wrap: true, preferred: firstEnabled, orientation, rtl, typeahead: false, onKeyDown: callerKeyDown });

  // TBR-8: the row scrolls when the items need more length than the toolbar has; a focused item is brought fully into
  // view, and development builds say the extra actions belong in an overflow menu.
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const viewport = useRef({ offset: 0, length: 0 });
  const boxes = useRef(new Map<number, Box>());
  // TBR-9: the gap after each item, measured once every item is laid out (a docked toolbar spreads its items, so a gap
  // can be wider than the token); until then the token's, the least a gap can be — neighbours never overlap.
  const [gaps, setGaps] = useState<readonly number[]>([]);
  const measureGaps = useCallback(() => {
    const laid = Array.from({ length: count }, (_, index) => boxes.current.get(index));
    if (laid.some((box) => !box)) return;
    const span = (box: Box) => (horizontal ? { start: box.x, end: box.x + box.width } : { start: box.y, end: box.y + box.height });
    const next = laid.slice(1).map((box, index) => {
      const [a, b] = [span(laid[index]!), span(box!)];
      // Physical order: in a right-to-left row the next item lies to the left.
      return Math.max(0, a.start <= b.start ? b.start - a.end : a.start - b.end);
    });
    setGaps((previous) => (previous.length === next.length && previous.every((gap, index) => gap === next[index]) ? previous : next));
  }, [count, horizontal]);
  const [overflow, setOverflow] = useState({ viewport: 0, content: 0 });
  const overflows = overflow.viewport > 0 && overflow.content > overflow.viewport + 0.5;
  useEffect(() => {
    if (__DEV__ && overflows) console.warn(`Tanrei: the items of a Toolbar${where} do not fit it and scroll; the extra actions belong in an overflow menu (a Menu anchored to a "More" IconButton).`);
  }, [overflows, where]);
  const reveal = useCallback(
    (index: number) => {
      const box = boxes.current.get(index);
      const { offset, length } = viewport.current;
      if (!box || length <= 0) return;
      const start = horizontal ? box.x : box.y;
      const extent = horizontal ? box.width : box.height;
      let target = offset;
      if (start < offset) target = start;
      else if (start + extent > offset + length) target = start + extent - length;
      if (target === offset) return;
      // The toolbar has no motion tokens: it scrolls at once.
      scroll.current?.scrollTo(horizontal ? { x: target, animated: false } : { y: target, animated: false });
      viewport.current.offset = target;
    },
    [horizontal],
  );

  // What each item is told (the internal channel, src/primitives/rovingItem.ts): whether it is the Tab stop, its ref,
  // that it took focus, where it is.
  const { tabStop, itemRef, itemFocused } = roving;
  const channel = useMemo(
    () =>
      Array.from(
        { length: count },
        (_, index): RovingItem => ({
          alignSelf: 'center',
          tabStop: index === tabStop,
          ref: itemRef(index),
          onFocus: () => {
            itemFocused(index);
            reveal(index);
          },
          onLayout: (event: LayoutChangeEvent) => {
            boxes.current.set(index, event.nativeEvent.layout);
            measureGaps();
          },
          // TBR-9: half the gap toward each neighbour; the ends keep their full target.
          reachStart: index > 0 ? (gaps[index - 1] ?? dims.containerGap) / 2 : null,
          reachEnd: index < count - 1 ? (gaps[index] ?? dims.containerGap) / 2 : null,
          axis: orientation,
        }),
      ),
    [count, tabStop, itemRef, itemFocused, reveal, measureGaps, gaps, dims.containerGap, orientation],
  );
  useEffect(() => {
    for (const index of [...boxes.current.keys()]) if (index >= count) boxes.current.delete(index);
    setGaps([]);
  }, [count]);

  // TBR-1 / TBR-4: the variant's color, elevation, corners and edge. No states: nothing moves.
  const { cornerSmoothing } = theme.system.shape;
  const fill = theme.resolve(dims.containerColor);
  const edge = theme.resolve(dims.outlineColor);
  const elevation = theme.elevation(dims.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const container: ViewStyle = {
    // TBR-1: a docked toolbar spans its parent's width; TBR-5: a floating one lays out at its own size where its layout
    // places it (`style`), as a Button does.
    alignSelf: docked ? 'stretch' : 'flex-start',
    ...(fill.a > 0 ? { backgroundColor: theme.paint(dims.containerColor) } : null),
    borderRadius: dims.containerShape,
    // TBR-3: the color reaches under the bottom and side insets; the items stay inside them.
    ...(docked ? { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right } : null),
    ...shadow,
    ...(docked ? null : borderCurveOf(cornerSmoothing)),
  };

  // TBR-2 / TBR-4 / TBR-6: the items in one row (or column) along the axis, centered across it, the size a minimum across
  // it (TBR-14). Docked: padding-inline at both ends, the items spread with at least the gap between them, one item
  // centered. Floating: packed, the gap between them.
  const along = horizontal ? { paddingStart: dims.containerPaddingInline, paddingEnd: dims.containerPaddingInline } : { paddingTop: dims.containerPaddingInline, paddingBottom: dims.containerPaddingInline };
  const content: ViewStyle = {
    flexGrow: 1,
    flexDirection: horizontal ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: docked && count > 1 ? 'space-between' : 'center',
    gap: dims.containerGap,
    ...along,
    ...(horizontal ? { minHeight: dims.containerSize } : { minWidth: dims.containerSize }),
  };

  // The outline: a docked toolbar's top edge, a floating toolbar's edge around its whole shape — only where it draws.
  const outline = edge.a === 0 ? null : docked ? (
    <View style={{ position: 'absolute', top: 0, start: 0, end: 0, height: tokens.outlineWidth, backgroundColor: theme.paint(dims.outlineColor) }} pointerEvents="none" testID={part('outline')} {...HIDDEN} />
  ) : (
    <Ring placement="inside" width={tokens.outlineWidth} color={theme.paint(dims.outlineColor)} radius={dims.containerShape} cornerSmoothing={cornerSmoothing} testID={part('outline')} />
  );

  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: roving.onKeyDown } as object;
  return (
    // TBR-11: a toolbar named by its label; each item keeps its own name, role and state.
    <View {...rest} {...keys} ref={ref} role="toolbar" accessibilityLabel={accessibilityLabel} style={[container, style]} testID={testID}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={dims.containerShape} cornerSmoothing={docked ? 0 : cornerSmoothing} testID={part('elevation-ring')} /> : null}
      <ScrollView
        ref={scroll}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          viewport.current.length = horizontal ? width : height;
          setOverflow((previous) => (previous.viewport === viewport.current.length ? previous : { ...previous, viewport: viewport.current.length }));
        }}
        onContentSizeChange={(width: number, height: number) => {
          const length = horizontal ? width : height;
          setOverflow((previous) => (previous.content === length ? previous : { ...previous, content: length }));
        }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          viewport.current.offset = horizontal ? event.nativeEvent.contentOffset.x : event.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={content}
        testID={part('scroll')}
      >
        {items.map((item, index) => (
          <RovingItemContext.Provider key={isValidElement(item) && item.key != null ? item.key : index} value={isItem(item) ? channel[index]! : null}>
            {item}
          </RovingItemContext.Provider>
        ))}
      </ScrollView>
      {outline}
    </View>
  );
}
