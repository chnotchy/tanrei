import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react';
import {
  Animated,
  I18nManager,
  Pressable,
  ScrollView,
  View,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import type { TanreiPaint, TanreiTabsTokens, TanreiTabsVariant, TanreiTabsVariantStateTokens } from '../generated/vocabulary';
import { IconBox, Label, drawsColor, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import type { InteractionState } from '../primitives/interaction';
import { useItemRow } from '../primitives/itemRow';
import type { PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { useRovingFocus, type FocusableNode, type KeyDownEvent } from '../primitives/rovingFocus';
import { stateShape } from '../primitives/stateShape';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `primary`, `secondary` — plus whatever the product's design system added (its
 * generated file augments `TanreiTabsVariantRegistry`). A value it added is laid out as a primary tab (icon above the
 * label, the indicator under the content); only `secondary` puts the icon before the label and the indicator under the
 * whole tab.
 */
export type TabsVariant = TanreiTabsVariant;

/** What a tab's icon given as a function receives: the icon color of its look and state, the size, the glyph. */
export type TabIconProps = GlyphSlotProps;

/**
 * One tab of the row (the spec's item kind `tab`): the element type of `items`.
 */
export interface Tab {
  /** Identifies the tab: the row's `value` names the selected tab by it, and `onValueChange` carries it. Unique; required. */
  value: string;
  /** The tab's text and its accessible name. Required, even when `labelHidden` is true. */
  label: string;
  /** An icon: a glyph name of the system's icon font, a function or a node. Give every tab of a row an icon, or none. */
  icon?: GlyphSlot<TabIconProps>;
  /** Draws the icon alone and keeps `label` as the accessible name (an icon-only tab). */
  labelHidden?: boolean;
  /** Prevents selecting the tab; the arrow keys skip it and it is never the tab stop. */
  disabled?: boolean;
  /** The tab's test id (default: `<tabs testID>.tab.<n>`); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** The row: a `View` with the `tablist` role. */
export type TabsRef = ComponentRef<typeof View>;

export interface TabsProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The tabs, in order. */
  items: readonly Tab[];
  /**
   * The spec's `selected`: the value of the selected tab. **Controlled**: move it from `onValueChange`. `null` (or left
   * out) selects the first enabled tab; a value no tab has selects none (TAB-11).
   */
  value?: string | null;
  /** The spec's `change`: the user selected another tab (pointer, touch, Enter, Space or an arrow key); its value. */
  onValueChange?: (value: string) => void;
  /** Primary tabs switch the main views of a screen; secondary tabs switch within one of them. Unknown values render as `primary` (TAB-7). */
  variant?: TabsVariant;
  /** False divides the row's width equally among the tabs; true sizes each tab to its content and scrolls the row sideways. */
  scrollable?: boolean;
  /** The spec's `label`: the row's accessible name — what the views are views of. */
  accessibilityLabel?: string;
  /** How a tab's position is announced. Default: `"2 of 5"` (English). */
  positionText?: (position: number, count: number) => string;
  /** Layout of the row (margins, width); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<TabsRef | null>;
}

// ---------------------------------------------------------------------------------------------------------------
// The row's model (TAB-11, TAB-19, TAB-22): which tab is selected, which is the tab stop, and the reports.

interface TabsModel {
  /** The selected tab's index, or -1 when none is (a value no tab has). */
  selected: number;
  /** The tab stop: the selected tab when it is enabled, else the first enabled tab (-1: none). */
  tabStop: number;
  reports: string[];
}

export function buildTabs(items: readonly Tab[], value: string | null | undefined, where: string): TabsModel {
  const reports: string[] = [];
  const byValue = new Map<string, number>();
  items.forEach((tab, index) => {
    const n = index + 1;
    if (!tab.value) reports.push(`Tanrei: tab ${n} of a Tabs${where} has no value, so the row's value cannot select it.`);
    else if (byValue.has(tab.value)) reports.push(`Tanrei: tab ${n} of a Tabs${where} repeats the value "${tab.value}" of tab ${byValue.get(tab.value)! + 1}; the first of them is the one it selects.`);
    if (!byValue.has(tab.value)) byValue.set(tab.value, index);
    if (!tab.label?.trim()) reports.push(`Tanrei: tab ${n} of a Tabs${where} has no label, so it has no accessible name.`);
    if (tab.labelHidden && (tab.icon == null || tab.icon === '')) reports.push(`Tanrei: tab ${n} of a Tabs${where} hides its label but has no icon; the label is drawn.`);
  });
  const firstEnabled = items.findIndex((tab) => !tab.disabled);
  let selected: number;
  if (value == null) selected = firstEnabled;
  else {
    selected = byValue.get(value) ?? -1;
    if (selected < 0) reports.push(`Tanrei: a Tabs${where} has the value "${value}", which no tab has; no tab is selected.`);
  }
  const tabStop = selected >= 0 && !items[selected]!.disabled ? selected : firstEnabled;
  return { selected, tabStop, reports };
}

/** The paints of a tab's look (selected or not) in one state. Looks are closed (the spec's two), so this switch stays. */
function lookPaints(tokens: TanreiTabsVariantStateTokens, selected: boolean): Record<'container' | TabPart, TanreiPaint> {
  return selected
    ? { container: tokens.selectedContainerColor, label: tokens.selectedLabelColor, icon: tokens.selectedIconColor, indicator: tokens.selectedActiveIndicatorColor }
    : { container: tokens.containerColor, label: tokens.labelColor, icon: tokens.iconColor, indicator: tokens.activeIndicatorColor };
}

type TabPart = 'label' | 'icon' | 'indicator';

/** Where a tab's indicator is, in the row's content: under its content (primary) or under the whole tab (secondary). */
interface Span {
  x: number;
  width: number;
}

const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const englishPosition = (position: number, count: number) => `${position} of ${count}`;
const hasGlyph = (slot: GlyphSlot<TabIconProps> | undefined) => slot != null && slot !== '';

/**
 * Tanrei Tabs — spec: `specs/tabs.spec.json`.
 * Anatomy: tablist (the row: the divider along its bottom, the tabs fixed or scrolling) > tabs: container (the state
 * layer, the hit area) > [icon] + [label], the active indicator on the bottom edge, the focus ring inside. The
 * selected tab's panel is the product's: render it below the row (React Native has no tab panel role).
 */
export function Tabs({
  items,
  value = null,
  onValueChange,
  variant = 'primary',
  scrollable = false,
  accessibilityLabel,
  positionText = englishPosition,
  style,
  testID,
  ref,
  ...rest
}: TabsProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.tabs;
  const reduce = useReduceMotion();
  const rtl = I18nManager.isRTL;
  // TAB-7: an open key; a value the active system does not have is drawn from `primary`'s tokens (reported once).
  const appearance = lookupValue(tokens.variants, variant, 'primary', 'Tabs variant');
  // The spec's two structures: secondary's icon beside the label and its indicator under the whole tab.
  const inline = variant === 'secondary';
  const where = testID ? ` (testID "${testID}")` : '';
  const model = useMemo(() => buildTabs(items, value, where), [items, value, where]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // TAB-1 / TAB-2: selecting an enabled tab that is not selected emits change once; the selected one emits nothing.
  const select = useCallback(
    (index: number) => {
      const tab = items[index];
      if (!tab || tab.disabled || index === model.selected) return;
      onValueChange?.(tab.value);
    },
    [items, model.selected, onValueChange],
  );

  // TAB-12: one tab stop (the selected tab); Right and Left Arrow (mirrored in right-to-left), Home and End move focus
  // to the next, previous, first and last ENABLED tab, wrapping, and select it (automatic activation).
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const roving = useRovingFocus({
    labels: items.map((tab) => (tab.disabled ? null : tab.label ?? '')),
    wrap: true,
    preferred: model.tabStop,
    orientation: 'horizontal',
    rtl,
    typeahead: false,
    tabStopFollows: 'preferred',
    onMove: select,
    onKeyDown: callerKeyDown,
  });

  // Where each tab is in the row's content, and where its indicator is (TAB-15, TAB-16, TAB-17).
  const [boxes, setBoxes] = useState<ReadonlyMap<number, Span>>(new Map());
  const [spans, setSpans] = useState<ReadonlyMap<number, Span>>(new Map());
  const record = (setter: typeof setBoxes) => (index: number, span: Span) =>
    setter((previous) => {
      const known = previous.get(index);
      if (known && known.x === span.x && known.width === span.width) return previous;
      const next = new Map(previous);
      next.set(index, span);
      return next;
    });
  const onTabLayout = useCallback(record(setBoxes), []);
  const onSpanLayout = useCallback(record(setSpans), []);
  /** The indicator's span of tab `index` in the row's content: under its content (primary), or the whole tab. */
  const indicatorSpan = (index: number): Span | null => {
    const box = boxes.get(index);
    if (!box) return null;
    if (inline) return box;
    const span = spans.get(index);
    return span ? { x: box.x + span.x, width: span.width } : null;
  };

  // TAB-17: WHEN the selection changes, the indicator slides and resizes from the old tab to the new one over the
  // indicator motion; at once where motion is reduced (and before both tabs have been laid out: nothing to slide from).
  const [slide, setSlide] = useState<{ from: Span; to: Span; hide: readonly number[] } | null>(null);
  const slideProgress = useRef(new Animated.Value(1)).current;
  const previousSelected = useRef(model.selected);
  useEffect(() => {
    const from = previousSelected.current;
    const to = model.selected;
    previousSelected.current = to;
    if (from === to) return undefined;
    const start = from >= 0 ? indicatorSpan(from) : null;
    const end = to >= 0 ? indicatorSpan(to) : null;
    if (reduce || !start || !end) {
      setSlide(null);
      return undefined;
    }
    setSlide({ from: start, to: end, hide: [from, to] });
    slideProgress.setValue(0);
    const animation = Animated.timing(slideProgress, { toValue: 1, duration: tokens.motionIndicatorDuration, easing: toEasing(tokens.motionIndicatorEasing), useNativeDriver: false });
    animation.start(({ finished }) => {
      if (finished) setSlide(null);
    });
    return () => animation.stop();
    // Only a change of selection starts a slide; the spans are read as they are then.
  }, [model.selected]);

  // TAB-15: a tab that becomes selected or gets keyboard focus while part of it is out of view is scrolled into view
  // over the indicator motion (at once where motion is reduced).
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const viewport = useRef({ offset: 0, width: 0 });
  const scrollAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const reveal = useCallback(
    (index: number) => {
      if (!scrollable) return;
      const box = boxes.get(index);
      const { offset, width } = viewport.current;
      if (!box || width <= 0) return;
      let target = offset;
      if (box.x < offset) target = box.x;
      else if (box.x + box.width > offset + width) target = box.x + box.width - width;
      if (target === offset) return;
      scrollAnimation.current?.stop();
      if (reduce) {
        scroll.current?.scrollTo({ x: target, animated: false });
        viewport.current.offset = target;
        return;
      }
      const position = new Animated.Value(offset);
      position.addListener(({ value: x }) => scroll.current?.scrollTo({ x, animated: false }));
      const animation = Animated.timing(position, { toValue: target, duration: tokens.motionIndicatorDuration, easing: toEasing(tokens.motionIndicatorEasing), useNativeDriver: false });
      scrollAnimation.current = animation;
      animation.start(() => position.removeAllListeners());
    },
    [scrollable, boxes, reduce, tokens.motionIndicatorDuration, tokens.motionIndicatorEasing],
  );
  useEffect(() => {
    if (model.selected >= 0) reveal(model.selected);
    // Only when the selection changes.
  }, [model.selected]);
  // TAB-15 (spec change 1c12655): when the row first appears with its selected tab partly or wholly out of view, it is
  // scrolled into view at once — once the viewport and the tab have been laid out.
  const revealedFirst = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    if (!scrollable || revealedFirst.current || viewportWidth <= 0) return;
    const box = model.selected >= 0 ? boxes.get(model.selected) : undefined;
    if (model.selected >= 0 && !box) return;
    revealedFirst.current = true;
    if (!box) return;
    const { offset } = viewport.current;
    let target = offset;
    if (box.x < offset) target = box.x;
    else if (box.x + box.width > offset + viewportWidth) target = box.x + box.width - viewportWidth;
    if (target === offset) return;
    scroll.current?.scrollTo({ x: target, animated: false });
    viewport.current.offset = target;
  }, [scrollable, viewportWidth, boxes, model.selected]);
  useEffect(() => () => scrollAnimation.current?.stop(), []);
  const onKeyboardFocus = useCallback(
    (index: number) => {
      roving.itemFocused(index);
      reveal(index);
    },
    [roving.itemFocused, reveal],
  );

  const part = (name: string) => partTestID(testID, name);
  const count = items.length;
  const tabs = items.map((tab, index) => (
    <TabView
      key={index}
      tab={tab}
      index={index}
      count={count}
      selected={index === model.selected}
      tabStop={index === roving.tabStop}
      fixed={!scrollable}
      inline={inline}
      stackedRow={!inline && items.some((each) => hasGlyph(each.icon) && !each.labelHidden)}
      appearance={appearance}
      tokens={tokens}
      theme={theme}
      hideIndicator={slide !== null && slide.hide.includes(index)}
      focusRef={roving.itemRef(index)}
      onSelect={select}
      onKeyboardFocus={onKeyboardFocus}
      onTabLayout={onTabLayout}
      onSpanLayout={onSpanLayout}
      positionText={positionText}
      testID={tab.testID ?? partTestID(testID, `tab.${index}`)}
    />
  ));

  // TAB-17: the sliding indicator, drawn in the row's content while it moves, in the selected look's indicator color.
  const selectedPaints = model.selected >= 0 ? lookPaints(appearance[items[model.selected]!.disabled ? 'disabled' : 'enabled'], true) : null;
  const slider =
    slide && selectedPaints ? (
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: slideProgress.interpolate({ inputRange: [0, 1], outputRange: [slide.from.x, slide.to.x] }),
          width: slideProgress.interpolate({ inputRange: [0, 1], outputRange: [slide.from.width, slide.to.width] }),
          height: appearance.enabled.activeIndicatorThickness,
          borderTopLeftRadius: appearance.enabled.activeIndicatorShape,
          borderTopRightRadius: appearance.enabled.activeIndicatorShape,
          backgroundColor: theme.paint(selectedPaints.indicator),
        }}
        pointerEvents="none"
        testID={part('slider')}
        {...HIDDEN}
      />
    ) : null;

  // TAB-14: fixed — the tabs share the row's width equally and grow to the tallest; scrollable — each as wide as its
  // content, the row scrolling sideways from its start edge (React Native mirrors a row in right-to-left, TAB-21).
  const rowStyle: ViewStyle = { flexDirection: 'row', alignItems: 'stretch' };
  const row = scrollable ? (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      scrollEventThrottle={16}
      onLayout={(event: LayoutChangeEvent) => {
        viewport.current.width = event.nativeEvent.layout.width;
        setViewportWidth(event.nativeEvent.layout.width);
      }}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        viewport.current.offset = event.nativeEvent.contentOffset.x;
      }}
      contentContainerStyle={rowStyle}
      testID={part('scroll')}
    >
      {tabs}
      {slider}
    </ScrollView>
  ) : (
    <View style={rowStyle} testID={part('row')}>
      {tabs}
      {slider}
    </View>
  );

  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: roving.onKeyDown } as object;
  return (
    <View {...rest} {...keys} ref={ref} role="tablist" accessibilityLabel={accessibilityLabel} style={style} testID={testID}>
      {/* TAB-20: the hairline along the whole row's bottom, under the tabs and the indicator, even while it scrolls. */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tokens.dividerThickness, ...(theme.resolve(tokens.dividerColor).a > 0 ? { backgroundColor: theme.paint(tokens.dividerColor) } : null) }}
        pointerEvents="none"
        testID={part('divider')}
        {...HIDDEN}
      />
      {row}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// One tab

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabViewProps {
  tab: Tab;
  index: number;
  count: number;
  selected: boolean;
  tabStop: boolean;
  fixed: boolean;
  inline: boolean;
  /** Some primary tab of the row stacks an icon above a drawn label: every tab of the row is that tall. */
  stackedRow: boolean;
  appearance: TanreiTabsTokens['variants']['primary'];
  tokens: TanreiTabsTokens;
  theme: TanreiTheme;
  hideIndicator: boolean;
  focusRef: (node: FocusableNode | null) => void;
  onSelect: (index: number) => void;
  onKeyboardFocus: (index: number) => void;
  onTabLayout: (index: number, span: Span) => void;
  onSpanLayout: (index: number, span: Span) => void;
  positionText: (position: number, count: number) => string;
  testID: string | undefined;
}

function TabView({ tab, index, count, selected, tabStop, fixed, inline, stackedRow, appearance, tokens, theme, hideIndicator, focusRef, onSelect, onKeyboardFocus, onTabLayout, onSpanLayout, positionText, testID }: TabViewProps) {
  const { label = '', icon, labelHidden = false, disabled = false } = tab;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const drawsIcon = hasGlyph(icon);
  // TAB-19: an icon-only tab draws its icon alone; without an icon its label is drawn anyway.
  const drawsLabel = !(labelHidden && drawsIcon);
  // TAB-18: at least the tab height; a primary row with a stacked icon and label is the taller height. TAB-5: at least
  // the touch target both ways — tabs touch their neighbours and the panel, so the hit area cannot extend over them.
  const target = theme.system.measure.target.touch;
  const minHeight = Math.max(stackedRow ? tokens.containerHeightWithIcon : tokens.containerHeight, target);

  const handlePress = useCallback(() => onSelect(index), [onSelect, index]);
  const keyboard = useRef(false);
  // TAB-1 … TAB-6, TAB-8, TAB-9, TAB-23: the state that wins, its tokens in the tab's look, the press hold, the ripple,
  // and one transition over the state motion (a change of look included).
  const drawnTab = useItemRow<TabPart>({
    pressable: true,
    disabled,
    condition: selected ? 'selected' : 'unselected',
    paints: (state: InteractionState) => lookPaints(appearance[state], selected),
    shapes: tokens,
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: target, height: minHeight },
    ref: focusRef as unknown as RefObject<PressableHost>,
    onPress: handlePress,
    onLayout: (event: LayoutChangeEvent) => onTabLayout(index, { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width }),
  });
  const { drawn, colors, interaction, state } = drawnTab;
  // TAB-15: keyboard focus (not a press's) reveals the tab.
  useEffect(() => {
    if (interaction.focused === keyboard.current) return;
    keyboard.current = interaction.focused;
    if (interaction.focused) onKeyboardFocus(index);
  }, [interaction.focused, onKeyboardFocus, index]);
  const shape = stateShape(tokens, state).shape;
  const indicator = appearance[state];

  // TAB-18: the glyph of the tab's selection (family and fill) at the icon size.
  const glyph = iconGlyphStyle(theme.system.icon, tokens.iconSize, { selected, resolveFont: theme.resolveIconFont });
  const iconNode = drawsIcon ? (
    <IconBox icon={glyphSlotContent(icon, { color: colors.icon, size: tokens.iconSize, glyph }, drawn.icon, part('icon.glyph'))} color={colors.icon} size={tokens.iconSize} decorative testID={part('icon')} />
  ) : null;
  const labelNode = drawsLabel ? (
    // TAB-14: a fixed tab's label wraps; a scrollable tab's stays on one line (the tab is as wide as it).
    <Label style={{ ...theme.text(tokens.labelTypescale), textAlign: 'center' }} color={drawn.label} numberOfLines={fixed ? undefined : 1} testID={part('label')}>
      {label}
    </Label>
  ) : null;

  // TAB-16: on the bottom edge, its thickness and top corners from the variant; drawn only where its color draws.
  const indicatorResolved = theme.resolve(lookPaints(appearance[state], selected).indicator);
  const indicatorNode =
    !hideIndicator && drawsColor(indicatorResolved, drawn.indicator) ? (
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: indicator.activeIndicatorThickness,
          borderTopLeftRadius: indicator.activeIndicatorShape,
          borderTopRightRadius: indicator.activeIndicatorShape,
          backgroundColor: drawn.indicator,
        }}
        pointerEvents="none"
        testID={part('indicator')}
        {...HIDDEN}
      />
    ) : null;

  // TAB-18: primary stacks the icon above the label; secondary puts it before the label; both `containerGap` apart.
  // TAB-16 (spec change 1c12655): the content keeps the indicator's thickness from the tab's top and bottom edges, so a
  // label that wraps grows the tab instead of running under the indicator; a centred line stays where it was.
  const content = (
    <View style={{ flexDirection: inline ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: tokens.containerGap, flexShrink: 1, paddingVertical: indicator.activeIndicatorThickness }} testID={part('content')}>
      {iconNode}
      {labelNode}
    </View>
  );

  const hostStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    minHeight,
    minWidth: target,
    paddingStart: tokens.containerPaddingInline,
    paddingEnd: tokens.containerPaddingInline,
    ...(fixed ? { flexGrow: 1, flexBasis: 0 } : null),
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(drawnTab.container, drawn.container), borderRadius: drawn.shape, opacity: drawn.opacity };

  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={NO_SLOP}
      testID={testID}
      disabled={disabled}
      // TAB-2 / TAB-12: only the tab stop is focusable; a disabled tab never is.
      focusable={tabStop && !disabled}
      // TAB-13: the tab role, named by its label (drawn or not), its selected state and its position.
      role="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      accessibilityValue={{ text: positionText(index + 1, count) }}
      style={[hostStyle, surface]}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={drawnTab.rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {inline ? (
        <View style={{ justifyContent: 'center', flexShrink: 1 }}>{content}</View>
      ) : (
        // TAB-16: primary's indicator spans the content (the label, or the icon when it is wider or the label hidden).
        <View
          style={{ justifyContent: 'center', flexShrink: 1 }}
          onLayout={(event: LayoutChangeEvent) => onSpanLayout(index, { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width })}
          testID={part('extent')}
        >
          {content}
          {indicatorNode}
        </View>
      )}
      {inline ? indicatorNode : null}
      {/* TAB-4: inside the tab, which a scrolling row would otherwise clip; never animated. */}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} inside testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

