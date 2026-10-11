import { Children, Fragment, isValidElement, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Animated, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiAppBarSize } from '../generated/vocabulary';
import { drawsColor, partTestID } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { Ring } from '../primitives/Ring';
import { useStateTransition } from '../primitives/stateTransition';
import { closedValue, lookupValue } from '../theme/lookup';
import { useTanrei, useTanreiInsets, type TanreiInsets } from '../theme/TanreiProvider';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/**
 * Open keys: the core values — `small`, `large` — plus whatever the product's design system added (its
 * generated file augments `TanreiAppBarSizeRegistry`). A size taller than `small` has an expanded title row under the
 * top row, which collapses as `large`'s does.
 */
export type AppBarSize = TanreiAppBarSize;

/** Where the top row's title sits: after the navigation button, or centred on the bar. */
export type AppBarTitleAlignment = 'start' | 'center';
const ALIGNMENTS: readonly AppBarTitleAlignment[] = ['start', 'center'];

/**
 * A scrolling view connected to the bar (`useAppBarScroll().state`): how far its content has scrolled from its top,
 * and a subscription, so that a scroll re-renders the bar and nothing else.
 */
export interface AppBarScrollState {
  /** The distance the content has scrolled from its top (never below 0). */
  readonly offset: number;
  subscribe: (listener: () => void) => () => void;
}

/** What `useAppBarScroll()` returns: `onScroll` for a `ScrollView` / `FlatList`, `state` for the bar's `scrollState`. */
export interface AppBarScroll {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  state: AppBarScrollState;
}

/**
 * Connects a scrolling view to an `AppBar` (APB-8, APB-9): pass `scroll.onScroll` to the `ScrollView` or `FlatList`
 * (with `scrollEventThrottle={16}`) and `scroll.state` to the bar's `scrollState`. The bar then sets `scrolled` itself
 * and collapses a large bar one for one with the scroll. Only the bar re-renders as the content scrolls.
 */
export function useAppBarScroll(): AppBarScroll {
  return useMemo<AppBarScroll>(() => {
    const listeners = new Set<() => void>();
    const state = {
      offset: 0,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    return {
      state,
      onScroll: (event) => {
        const next = Math.max(0, event.nativeEvent.contentOffset.y);
        if (next === state.offset) return;
        state.offset = next;
        for (const listener of listeners) listener();
      },
    };
  }, []);
}

export type AppBarRef = ComponentRef<typeof View>;

export interface AppBarProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The screen's name, and the screen's heading for assistive technology. Empty draws no title and exposes no heading. */
  title?: string;
  /** One line under the title. Empty draws none. */
  subtitle?: string;
  /** Small (one row) or large (a larger title row under the top row that collapses as the content scrolls). Unknown values render as `small` (APB-14). */
  size?: AppBarSize;
  /** Where the top row's title sits: `start` (after the navigation button) or `center` (centred on the bar). An expanded title row always starts at the start. */
  titleAlignment?: AppBarTitleAlignment;
  /** Whether content lies under the bar, when no scrolling view is connected: the scrolled look, and a large bar drawn collapsed. */
  scrolled?: boolean;
  /** A connected scrolling view (`useAppBarScroll().state`): it sets `scrolled` and the collapse, and `scrolled` is ignored. */
  scrollState?: AppBarScrollState;
  /** The navigation item: ONE `IconButton` (back, menu or close) at the start. Laid out, never restyled. */
  navigation?: ReactNode;
  /** The action items: up to three `IconButton`s at the end, in reading order (a fragment is fine). Laid out, never restyled. */
  actions?: ReactNode;
  /**
   * The system insets the bar reaches under (its color) and keeps its content inside: the top one and the side ones. Each
   * side given replaces `TanreiProvider`'s `insets` (a bar that is not at the top of the window passes `{ top: 0 }`).
   */
  insets?: TanreiInsets;
  /** Layout of the bar (margins, `position: 'absolute'` over a scrolling view); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<AppBarRef | null>;
}

/** The items of a slot, fragments opened: what APB-13 counts. */
function slotItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? slotItems(child.props.children) : [child]));
}

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const noSubscription = () => () => undefined;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const settled = (width: number | null) => width ?? 0;

type Drawn = { container: Moving<string>; outline: Moving<string> } & DrawnElevation;

/**
 * Tanrei AppBar — spec: `specs/app-bar.spec.json`.
 * Anatomy: container (reaching under the top and side insets) > top row: [navigation] + title block (title +
 * [subtitle]) + [actions]; for a size taller than `small`, the expanded title row below it; the bottom edge (outline).
 * A layout region with no role of its own and no focus: its icon buttons are the product's.
 */
export function AppBar({
  title = '',
  subtitle = '',
  size = 'small',
  titleAlignment = 'start',
  scrolled = false,
  scrollState,
  navigation,
  actions,
  insets: ownInsets,
  style,
  testID,
  ref,
  ...rest
}: AppBarProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.appBar;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  // APB-14: an open key; a value the active system does not have is drawn from `small`'s tokens (reported once).
  const dims = lookupValue(tokens.sizes, size, 'small', 'AppBar size');
  // The top row is always the small bar's (the tokens: "a large bar's top row is always the small height").
  const row = tokens.sizes.small;
  const expands = dims.containerHeight > row.containerHeight;
  const alignment = closedValue(ALIGNMENTS, titleAlignment, 'start', 'AppBar titleAlignment');
  // APB-10: the provider's insets, each side the bar's own `insets` names replacing it.
  const insets = useTanreiInsets(ownInsets);

  // APB-13: still rendered; development builds say what belongs elsewhere.
  const navigationItems = slotItems(navigation);
  const actionItems = slotItems(actions);
  const hasTitle = title.trim() !== '';
  const hasSubtitle = subtitle.trim() !== '';
  useEffect(() => {
    if (!__DEV__) return;
    if (actionItems.length > 3) console.warn(`Tanrei: an AppBar${where} holds ${actionItems.length} actions; more than three belong in an overflow menu.`);
    if (navigationItems.length > 1) console.warn(`Tanrei: an AppBar${where} holds ${navigationItems.length} navigation items; a bar has one navigation button.`);
  }, [actionItems.length, navigationItems.length, where]);

  // APB-8 / APB-9: the connected scroll view, else `scrolled`.
  const offset = useSyncExternalStore(scrollState?.subscribe ?? noSubscription, () => (scrollState ? scrollState.offset : 0));
  const connected = scrollState != null;
  // The expanded title row: its natural height and where its title is in it (measured).
  const [block, setBlock] = useState<number | null>(null);
  const [titleBox, setTitleBox] = useState<{ y: number; height: number } | null>(null);
  const onBlockLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setBlock((previous) => (previous === height ? previous : height));
  }, []);
  const onTitleLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setTitleBox((previous) => (previous && previous.y === y && previous.height === height ? previous : { y, height }));
  }, []);
  const range = expands ? (block ?? dims.containerHeight - row.containerHeight) : 0;
  const collapse = !expands ? 0 : connected ? clamp(offset, 0, range) : scrolled ? range : 0;
  const collapsed = expands && collapse >= range;
  // APB-9: while content lies under the bar — for a bar that collapses, only once it has fully collapsed.
  const isScrolled = connected ? offset > range : scrolled;
  // APB-8: the top row's title fades in with the part of the expanded title that is covered.
  let covered = collapsed ? 1 : 0;
  if (expands && !collapsed && titleBox && titleBox.height > 0) covered = clamp((collapse - titleBox.y) / titleBox.height, 0, 1);
  if (!expands) covered = 1;

  // APB-1 … APB-3: the condition's container color, elevation and bottom edge, moving over the condition motion.
  const look = lookupValue(tokens.conditions, isScrolled ? 'scrolled' : 'flat', 'flat', 'AppBar condition');
  const colors = { container: theme.resolve(look.containerColor), outline: theme.resolve(look.outlineColor) };
  const shadowCount = useMemo(() => shadowLayerCount([tokens.conditions.flat, tokens.conditions.scrolled].map((each) => theme.elevationLayers(each.containerElevation))), [theme, tokens]);
  const drawn = useStateTransition(
    { ...colors, ...elevationVisuals(theme.elevationLayers(look.containerElevation), shadowCount) },
    { duration: tokens.motionConditionDuration, easing: tokens.motionConditionEasing },
  ) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, theme.elevation(look.containerElevation), shadowCount);

  // APB-6: the slots' widths, to centre the title on the bar's whole width.
  const [navigationWidth, setNavigationWidth] = useState<number | null>(null);
  const [actionsWidth, setActionsWidth] = useState<number | null>(null);
  const measure = (setter: (width: number) => void) => (event: LayoutChangeEvent) => setter(event.nativeEvent.layout.width);
  const onNavigationLayout = useCallback(measure((width) => setNavigationWidth((previous) => (previous === width ? previous : width))), []);
  const onActionsLayout = useCallback(measure((width) => setActionsWidth((previous) => (previous === width ? previous : width))), []);

  // APB-4: the navigation item padding-inline from the start edge, the actions padding-inline from the end edge; without a
  // navigation item the title starts title.inset from the start edge (and without actions it ends title.inset from the end).
  const hasNavigation = navigationItems.length > 0;
  const hasActions = actionItems.length > 0;
  const startPad = hasNavigation ? tokens.containerPaddingInline : tokens.titleInset;
  const endPad = hasActions ? tokens.containerPaddingInline : tokens.titleInset;
  // APB-6: centred, the title block is narrowed equally on both sides so that it never runs under either slot.
  const startExtent = startPad + (hasNavigation ? settled(navigationWidth) + tokens.containerGap : 0);
  const endExtent = endPad + (hasActions ? settled(actionsWidth) + tokens.containerGap : 0);
  const centred = alignment === 'center';
  const balance: ViewStyle = centred ? { paddingStart: Math.max(0, endExtent - startExtent), paddingEnd: Math.max(0, startExtent - endExtent) } : {};

  // APB-12: the title is exposed once — the expanded one while any of it is visible, the top row's once collapsed.
  const exposeTopTitle = covered >= 1;
  const textAlign: TextStyle = centred ? { textAlign: 'center' } : {};
  const titleColor = theme.paint(tokens.titleColor);
  const subtitleColor = theme.paint(tokens.subtitleColor);
  // APB-5 / APB-15: one line each, truncated at the end; the rows grow with the text.
  const topTitle =
    hasTitle && covered > 0 ? (
      <View style={{ justifyContent: 'center', opacity: covered }} testID={part('title-block')} {...(exposeTopTitle ? null : HIDDEN)}>
        <Text role="heading" style={[theme.text(row.titleTypescale), { color: titleColor }, textAlign]} numberOfLines={1} ellipsizeMode="tail" allowFontScaling testID={part('title')}>
          {title}
        </Text>
        {hasSubtitle ? (
          <Text style={[theme.text(row.subtitleTypescale), { color: subtitleColor }, textAlign]} numberOfLines={1} ellipsizeMode="tail" allowFontScaling testID={part('subtitle')}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    ) : null;

  const topRow = (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: row.containerHeight, paddingStart: startPad, paddingEnd: endPad, gap: tokens.containerGap }}
      testID={part('top-row')}
    >
      {hasNavigation ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }} onLayout={onNavigationLayout} testID={part('navigation')}>
          {navigation}
        </View>
      ) : null}
      <View style={[{ flex: 1, justifyContent: 'center' }, balance]} testID={part('title-area')}>
        {topTitle}
      </View>
      {hasActions ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.actionsGap }} onLayout={onActionsLayout} testID={part('actions')}>
          {actions}
        </View>
      ) : null}
    </View>
  );

  // APB-7 / APB-8: the expanded title row, at least the size's height less the top row, its block ending
  // padding-block-end above the bottom edge; it moves up with the bottom edge as the bar collapses, clipped under the top
  // row. A bar drawn collapsed without a connection leaves it out.
  const showsBlock = expands && (!collapsed || connected);
  const expanded = showsBlock ? (
    <View style={collapse > 0 ? { overflow: 'hidden', height: Math.max(0, (block ?? range) - collapse) } : null} testID={part('expanded')} {...(exposeTopTitle ? HIDDEN : null)}>
      <View
        onLayout={onBlockLayout}
        style={{
          minHeight: dims.containerHeight - row.containerHeight,
          justifyContent: 'flex-end',
          paddingStart: tokens.titleInset,
          paddingEnd: tokens.titleInset,
          paddingBottom: tokens.containerPaddingBlockEnd,
          ...(collapse > 0 ? { marginTop: -collapse } : null),
        }}
        testID={part('expanded-block')}
      >
        {hasTitle ? (
          <Text role="heading" style={[theme.text(dims.titleTypescale), { color: titleColor }]} numberOfLines={1} ellipsizeMode="tail" allowFontScaling onLayout={onTitleLayout} testID={part('expanded-title')}>
            {title}
          </Text>
        ) : null}
        {hasTitle && hasSubtitle ? (
          <Text style={[theme.text(dims.subtitleTypescale), { color: subtitleColor }]} numberOfLines={1} ellipsizeMode="tail" allowFontScaling testID={part('expanded-subtitle')}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  ) : null;

  // APB-1 / APB-2: the bottom edge, inside the bar, drawn only where its color draws (or while it fades).
  const edge = drawsColor(colors.outline, drawn.outline) ? (
    <Animated.View
      style={{ position: 'absolute', start: 0, end: 0, bottom: 0, height: tokens.outlineWidth, backgroundColor: drawn.outline }}
      pointerEvents="none"
      testID={part('outline')}
      {...HIDDEN}
    />
  ) : null;
  const fill = drawsColor(colors.container, drawn.container) ? drawn.container : undefined;

  return (
    // APB-4 / APB-10: the parent's full width; the color reaches under the top and side insets, the content stays inside.
    // APB-11: no role, no focus of its own.
    <Animated.View
      {...rest}
      ref={ref}
      style={[{ alignSelf: 'stretch', paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: fill }, shadow, style]}
      testID={testID}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={0} testID={part('elevation-ring')} /> : null}
      {topRow}
      {expanded}
      {edge}
    </Animated.View>
  );
}
