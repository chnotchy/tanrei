import { useCallback, useEffect, useMemo, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Animated, I18nManager, Platform, Pressable, View, useWindowDimensions, type AccessibilityState, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import type { TanreiSegmentedButtonSize, TanreiSegmentedButtonSizeTokens, TanreiSegmentedButtonTokens } from '../generated/vocabulary';
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
import { closedValue, lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, type TanreiTheme } from '../theme/TanreiProvider';

/** Open keys: the core values — `small`, `medium`, `large` — plus whatever the product's design system added. */
export type SegmentedButtonSize = TanreiSegmentedButtonSize;

/** The spec's `selection`: `single` (one choice, a radio group) or `multiple` (toggle buttons). A closed choice of behaviour. */
export type SegmentedButtonSelectionMode = 'single' | 'multiple';
const SELECTION_MODES: readonly SegmentedButtonSelectionMode[] = ['single', 'multiple'];

/** What a segment's icon given as a function receives: the icon color of its condition and state, the size, the glyph. */
export type SegmentIconProps = GlyphSlotProps;

/**
 * One option of the set (the spec's item kind `segment`): the element type of `items`.
 */
export interface Segment {
  /** Identifies the segment: the set's `value` / `values` name it by this, and `onSelectionChange` carries it. Unique; required. */
  value: string;
  /** The segment's text and its accessible name. Required, even when `labelHidden` is true. */
  label: string;
  /** An icon: a glyph name of the system's icon font, a function or a node. Give every segment of a set an icon, or none. */
  icon?: GlyphSlot<SegmentIconProps>;
  /** Draws the icon alone and keeps `label` as the accessible name (an icon-only segment). */
  labelHidden?: boolean;
  /** Prevents choosing or clearing the segment; the arrow keys skip it and it is never the tab stop. */
  disabled?: boolean;
  /** The segment's test id (default: `<set testID>.segment.<n>`); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** The set: a `View` with the `radiogroup` (single) or `group` (multiple) role. */
export type SegmentedButtonRef = ComponentRef<typeof View>;

interface SegmentedButtonBaseProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The segments, in order: two to five. */
  items: readonly Segment[];
  /** Visual height (small, medium, large: 32 / 36 / 40 in the default system). The hit area always meets the minimum target. Unknown values render as `medium` (SEG-8). */
  size?: SegmentedButtonSize;
  /** The spec's `label`: the set's accessible name — the question its options answer ("Range"). Required. */
  accessibilityLabel?: string;
  /** How a segment's position is announced. Default: `"2 of 3"` (English). */
  positionText?: (position: number, count: number) => string;
  /** Layout of the set (margins, `alignSelf: 'stretch'` to divide a wider row equally); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<SegmentedButtonRef>;
}

/** One choice at a time, as a radio group. */
export interface SingleSegmentedButtonProps extends SegmentedButtonBaseProps {
  selectionMode?: 'single';
  /** The selected segment's value. **Controlled**: move it from `onSelectionChange`. `null` (or left out) selects none. */
  value?: string | null;
  values?: undefined;
  /** The spec's `change`: the user chose another segment; its value. Never for the selected segment or a disabled one. */
  onSelectionChange?: (value: string) => void;
}

/** Several choices, each switched on and off, as toggle buttons. */
export interface MultipleSegmentedButtonProps extends SegmentedButtonBaseProps {
  selectionMode: 'multiple';
  value?: undefined;
  /** The selected segments' values. **Controlled**: move them from `onSelectionChange`. Empty selects none. */
  values?: readonly string[];
  /** The spec's `change`: the user switched a segment; the values after the change (possibly empty). */
  onSelectionChange?: (values: string[]) => void;
}

export type SegmentedButtonProps = SingleSegmentedButtonProps | MultipleSegmentedButtonProps;

/** Every prop of either form, as the implementation reads them. */
type AnyProps = SegmentedButtonBaseProps & {
  selectionMode?: string;
  value?: string | null;
  values?: readonly string[];
  onSelectionChange?: (selection: string & string[]) => void;
};

// ---------------------------------------------------------------------------------------------------------------
// The set's model (SEG-12, SEG-18, SEG-19, SEG-22): which segments are selected, which one is the preferred tab stop,
// and the reports.

interface SegmentsModel {
  selected: readonly boolean[];
  /** The tab stop while no segment has had focus (single: always): the selected segment, else the first enabled one. */
  preferred: number;
  reports: string[];
}

const hasGlyph = (slot: GlyphSlot<SegmentIconProps> | undefined) => slot != null && slot !== '';
/** SEG-22: an icon-only segment draws its icon alone; without an icon its label is drawn anyway. */
const drawsLabelOf = (segment: Segment) => !(segment.labelHidden && hasGlyph(segment.icon));

export function buildSegments(items: readonly Segment[], multiple: boolean, value: string | null, values: readonly string[], named: boolean, where: string): SegmentsModel {
  const reports: string[] = [];
  const byValue = new Map<string, number>();
  if (!named) reports.push(`Tanrei: a SegmentedButton${where} has no accessibilityLabel. Name the set by the question its options answer.`);
  if (items.length < 2 || items.length > 5) reports.push(`Tanrei: a SegmentedButton${where} holds ${items.length} segments; a set holds two to five.`);
  items.forEach((segment, index) => {
    const n = index + 1;
    if (!segment.value) reports.push(`Tanrei: segment ${n} of a SegmentedButton${where} has no value, so the set's value cannot select it.`);
    else if (byValue.has(segment.value)) reports.push(`Tanrei: segment ${n} of a SegmentedButton${where} repeats the value "${segment.value}" of segment ${byValue.get(segment.value)! + 1}; the first of them is the one it selects.`);
    else byValue.set(segment.value, index);
    if (!segment.label?.trim()) reports.push(`Tanrei: segment ${n} of a SegmentedButton${where} has no label, so it has no accessible name.`);
    if (segment.labelHidden && !hasGlyph(segment.icon)) reports.push(`Tanrei: segment ${n} of a SegmentedButton${where} hides its label but has no icon; the label is drawn.`);
  });
  const selected = items.map(() => false);
  const names = multiple ? values : value == null ? [] : [value];
  for (const name of names) {
    const index = byValue.get(name);
    if (index === undefined) reports.push(`Tanrei: a SegmentedButton${where} has the value "${name}", which no segment has; it selects nothing.`);
    else selected[index] = true;
  }
  const firstEnabled = items.findIndex((segment) => !segment.disabled);
  const firstSelected = items.findIndex((segment, index) => selected[index] && !segment.disabled);
  return { selected, preferred: firstSelected >= 0 ? firstSelected : firstEnabled, reports };
}

const englishPosition = (position: number, count: number) => `${position} of ${count}`;
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
const EMPTY: readonly string[] = [];
/** The glyph of the check a selected segment shows before its label (SEG-16), by its name in the system's icon font, as the filter chip's. */
const CHECK_GLYPH = 'check';

/**
 * Tanrei SegmentedButton — spec: `specs/segmented-button.spec.json`.
 * Anatomy: set (the row: its fill, outer corners and padding) > [segment: container (the state layer, the fill of its
 * condition, the elevation) > check or icon + label, focus ring inside] with a divider between each two, then the
 * outline over the set's edge. Sizes `small`, `medium` and `large`; `selectionMode` `single` or `multiple`.
 */
export function SegmentedButton(props: SegmentedButtonProps) {
  const {
    items,
    selectionMode: modeProp = 'single',
    value = null,
    values = EMPTY,
    onSelectionChange,
    size = 'medium',
    accessibilityLabel,
    positionText = englishPosition,
    style,
    testID,
    ref,
    ...rest
  } = props as AnyProps;
  const theme = useTanrei();
  const tokens = theme.system.components.segmentedButton;
  const rtl = I18nManager.isRTL;
  const multiple = closedValue(SELECTION_MODES, modeProp, 'single', 'SegmentedButton selectionMode') === 'multiple';
  // SEG-8: an open key; a value the active system does not have is drawn from `medium`'s tokens (reported once).
  const dimensions = lookupValue(tokens.sizes, size, 'medium', 'SegmentedButton size');
  const where = testID ? ` (testID "${testID}")` : '';
  const named = hasAccessibleName('', { accessibilityLabel, ...(rest as object) });
  const model = useMemo(() => buildSegments(items, multiple, multiple ? null : value, multiple ? values : EMPTY, named, where), [items, multiple, value, values, named, where]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // SEG-1 / SEG-2 / SEG-3: activating an enabled segment. Single: a segment that is not the value becomes it, and change
  // carries it once; the selected one changes nothing. Multiple: the segment's value is added or removed.
  const activate = useCallback(
    (index: number) => {
      const segment = items[index];
      if (!segment || segment.disabled) return;
      const emit = onSelectionChange as ((selection: string | string[]) => void) | undefined;
      if (multiple) emit?.(values.includes(segment.value) ? values.filter((each) => each !== segment.value) : [...values, segment.value]);
      else if (value !== segment.value) emit?.(segment.value);
    },
    [items, multiple, values, value, onSelectionChange],
  );

  // SEG-18 / SEG-19: one tab stop; Right and Down Arrow move to the next ENABLED segment, Left and Up Arrow to the
  // previous one, wrapping (Left and Right swapped in right-to-left), Home and End to the ends. Single: each move
  // selects (SEG-18) and the tab stop is the selected segment; multiple: moves only, the tab stop is the last focused one.
  const callerKeyDown = (rest as { onKeyDown?: (event: KeyDownEvent) => void }).onKeyDown;
  const roving = useRovingFocus({
    labels: items.map((segment) => (segment.disabled ? null : segment.label ?? '')),
    wrap: true,
    preferred: model.preferred,
    orientation: 'both',
    rtl,
    typeahead: false,
    tabStopFollows: multiple ? 'focus' : 'preferred',
    onMove: multiple ? undefined : activate,
    onKeyDown: callerKeyDown,
  });

  // SEG-14: every segment as wide as the widest content — its leading glyph as if selected (the check where one would
  // be drawn, else its icon), the gap, its label — plus the size's padding on each side. A label's natural width is
  // measured while the segments lie at their natural widths; once every drawn label is known the segments share one
  // basis, grow equally into a wider set and shrink equally in a narrower one (their labels wrap).
  const { fontScale } = useWindowDimensions();
  const labelStyle: TextStyle = { ...theme.text(dimensions.labelTypescale), flexShrink: 1, textAlign: 'center' };
  const measureKey = (segment: Segment) => JSON.stringify([segment.label, labelStyle.fontFamily, labelStyle.fontSize, labelStyle.fontWeight, labelStyle.letterSpacing, fontScale]);
  const [naturals, setNaturals] = useState<ReadonlyMap<number, { key: string; width: number }>>(new Map());
  const onLabelMeasured = useCallback((index: number, key: string, width: number) => {
    setNaturals((previous) => {
      const known = previous.get(index);
      if (known && known.key === key && known.width === width) return previous;
      const next = new Map(previous);
      next.set(index, { key, width });
      return next;
    });
  }, []);
  const target = theme.system.measure.target.touch;
  const labelWidths = items.map((segment, index) => {
    if (!drawsLabelOf(segment)) return 0;
    const known = naturals.get(index);
    return known && known.key === measureKey(segment) ? known.width : null;
  });
  const basis = labelWidths.every((width) => width !== null)
    ? Math.max(
        target,
        ...items.map((segment, index) => {
          const labelled = drawsLabelOf(segment);
          const lead = labelled ? (dimensions.checkSize > 0 ? dimensions.checkSize : hasGlyph(segment.icon) ? dimensions.iconSize : 0) : dimensions.iconSize;
          return lead + (labelled && lead > 0 ? dimensions.containerGap : 0) + labelWidths[index]! + 2 * dimensions.containerPaddingInline;
        }),
      )
    : null;

  // SEG-13: the set — at least the size's height, filled with set.color, its outer corners set.shape, the segments
  // set.padding in from its edge — and the outline over its edge, above the segments.
  const { cornerSmoothing } = theme.system.shape;
  const outlineColor = theme.resolve(tokens.outlineColor);
  const outlined = tokens.outlineWidth > 0 && outlineColor.a > 0;
  const setColor = theme.resolve(tokens.setColor);
  const setStyle: ViewStyle = {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: dimensions.containerHeight,
    padding: tokens.setPadding,
    borderRadius: tokens.setShape,
    ...(setColor.a > 0 ? { backgroundColor: theme.paint(tokens.setColor) } : null),
    ...borderCurveOf(cornerSmoothing),
  };
  // SEG-17: a line between each two neighbours, in its own width, from the set's top padding to its bottom padding.
  const divider = theme.resolve(tokens.dividerColor);
  const dividerStyle: ViewStyle = { width: tokens.dividerWidth, ...(divider.a > 0 ? { backgroundColor: theme.paint(tokens.dividerColor) } : null) };

  const part = (name: string) => partTestID(testID, name);
  const count = items.length;
  const children: ReactNode[] = [];
  items.forEach((segment, index) => {
    if (index > 0 && tokens.dividerWidth > 0) children.push(<View key={`divider.${index}`} style={dividerStyle} pointerEvents="none" testID={part(`divider.${index - 1}`)} {...HIDDEN} />);
    children.push(
      <SegmentView
        key={`segment.${index}`}
        segment={segment}
        index={index}
        count={count}
        multiple={multiple}
        selected={model.selected[index]!}
        tabStop={index === roving.tabStop}
        basis={basis}
        dimensions={dimensions}
        tokens={tokens}
        theme={theme}
        focusInset={outlined ? Math.max(0, tokens.outlineWidth - tokens.setPadding) : 0}
        labelStyle={labelStyle}
        measureKey={labelWidths[index] === null ? measureKey(segment) : null}
        onLabelMeasured={onLabelMeasured}
        focusRef={roving.itemRef(index)}
        onFocused={roving.itemFocused}
        onActivate={activate}
        positionText={positionText}
        testID={segment.testID ?? part(`segment.${index}`)}
      />,
    );
  });

  // `onKeyDown` is a View prop of the renderers that deliver key events; React Native's type definitions do not list it yet.
  const keys = { onKeyDown: roving.onKeyDown } as object;
  return (
    <View {...rest} {...keys} ref={ref} role={multiple ? 'group' : 'radiogroup'} accessibilityLabel={accessibilityLabel} style={[setStyle, style]} testID={testID}>
      {children}
      {outlined ? <Ring placement="inside" width={tokens.outlineWidth} color={theme.paint(tokens.outlineColor)} radius={tokens.setShape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// One segment

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
type Drawn = { container: Moving<string>; label: Moving<string>; icon: Moving<string>; opacity: Moving<number> } & DrawnElevation;

interface SegmentViewProps {
  segment: Segment;
  index: number;
  count: number;
  multiple: boolean;
  selected: boolean;
  tabStop: boolean;
  /** The shared width (SEG-14), or null while labels are measured. */
  basis: number | null;
  dimensions: TanreiSegmentedButtonSizeTokens;
  tokens: TanreiSegmentedButtonTokens;
  theme: TanreiTheme;
  /** How far the focus ring keeps from the segment's edge beyond its own offset: the outline drawn over it (SEG-5). */
  focusInset: number;
  labelStyle: TextStyle;
  /** The key of the label's natural width while it must be measured; null when it is known. */
  measureKey: string | null;
  onLabelMeasured: (index: number, key: string, width: number) => void;
  focusRef: (node: FocusableNode | null) => void;
  onFocused: (index: number) => void;
  onActivate: (index: number) => void;
  positionText: (position: number, count: number) => string;
  testID: string | undefined;
}

function SegmentView({ segment, index, count, multiple, selected, tabStop, basis, dimensions, tokens, theme, focusInset, labelStyle, measureKey, onLabelMeasured, focusRef, onFocused, onActivate, positionText, testID }: SegmentViewProps) {
  const { label = '', icon, disabled = false } = segment;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const drawsIcon = hasGlyph(icon);
  const drawsLabel = drawsLabelOf(segment);
  const condition = selected ? 'selected' : 'unselected';
  const conditionTokens = lookupValue(tokens.conditions, condition, 'unselected', 'SegmentedButton condition');
  const target = theme.system.measure.target.touch;
  const height = Math.max(0, dimensions.containerHeight - 2 * tokens.setPadding);

  // SEG-9 (pressed at once, held), SEG-6 (the hit area: above and below only — neighbours cannot extend over each
  // other, so the segment itself is at least a target wide), SEG-10 (the ripple) and SEG-4: one state wins.
  const handlePress = useCallback(() => onActivate(index), [onActivate, index]);
  const handleFocus = useCallback(() => onFocused(index), [onFocused, index]);
  const interaction = usePressInteraction({
    disabled,
    estimate: { width: target, height },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref: focusRef as unknown as Ref<PressableHost>,
    onPress: handlePress,
    onFocus: handleFocus,
  });
  const { state, under, wave } = interaction;

  // SEG-4 / SEG-7 / SEG-12: every part from the tokens of the segment's condition in the state that wins. SEG-10:
  // `ripple` (while one draws) and `dim` keep the container color of the state under the press.
  const current = conditionTokens[state];
  const containerPaint = interaction.layerless ? conditionTokens[under].containerColor : current.containerColor;
  const { opacity, shape } = stateShape(tokens, state);
  const colors = { container: theme.resolve(containerPaint), label: theme.resolve(current.labelColor), icon: theme.resolve(current.iconColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(
    () => shadowLayerCount(INTERACTION_STATES.flatMap((name) => [tokens.conditions.unselected, tokens.conditions.selected].map((each) => theme.elevationLayers(each[name].containerElevation)))),
    [theme, tokens],
  );
  // SEG-23: a state change moves colors and elevation over the state motion (at once under a press); SEG-16: a change of
  // condition over the selection motion. Reduced motion: at once.
  const selection = { duration: tokens.motionSelectionDuration, easing: tokens.motionSelectionEasing };
  const drawn = useControlTransition({ ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) }, condition, {
    state: { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing },
    selection,
    pressed: state === 'pressed',
  }) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);
  // SEG-24: a raised segment casts its elevation above its neighbours.
  const lifted = theme.elevationLayers(current.containerElevation).shadows.length > 0 || ring !== null;

  // SEG-13: the end segments' outer corners are the set's less set.padding (concentric); every other corner is the
  // container shape of the state.
  const outer = Math.max(0, tokens.setShape - tokens.setPadding);
  const first = index === 0;
  const last = index === count - 1;
  const corners = { topStart: first ? outer : shape, bottomStart: first ? outer : shape, topEnd: last ? outer : shape, bottomEnd: last ? outer : shape };
  const rounding: ViewStyle = { borderTopStartRadius: corners.topStart, borderBottomStartRadius: corners.bottomStart, borderTopEndRadius: corners.topEnd, borderBottomEndRadius: corners.bottomEnd };

  // SEG-16: the check before the label of a selected segment (in place of its icon), at the size's check size in the
  // selected icon color; none in an icon-only segment, none where the check size is 0. It comes and goes over the
  // selection motion, re-centring the content; plain 0 or 1 at rest, no node at 0.
  const checks = drawsLabel && dimensions.checkSize > 0;
  const check = useStateTransition({ progress: selected && checks ? 1 : 0 }, selection).progress as Moving<number>;
  const checking = checks && check !== 0;
  const iconColor = theme.paint(current.iconColor);
  let leading = null;
  if (checking) {
    const glyph = iconGlyphStyle(theme.system.icon, dimensions.checkSize, { selected: true, resolveFont: theme.resolveIconFont });
    const box = (
      <IconBox icon={glyphSlotContent(CHECK_GLYPH, { color: iconColor, size: dimensions.checkSize, glyph }, drawn.icon, part('check.glyph'))} color={iconColor} size={dimensions.checkSize} decorative testID={part('check')} />
    );
    // A check that grows into a segment without an icon: its box widens from nothing and fades in (the reverse going out).
    leading =
      !drawsIcon && typeof check !== 'number' ? (
        <Animated.View style={{ width: ramp(check, [0, 1], [0, dimensions.checkSize]), marginEnd: ramp(check, [0, 1], [0, dimensions.containerGap]), opacity: check, overflow: 'hidden' }}>{box}</Animated.View>
      ) : (
        <View style={{ marginEnd: dimensions.containerGap }}>{box}</View>
      );
  } else if (drawsIcon) {
    // SEG-15: the icon at the size's icon size, in the family and fill of the segment's condition.
    const glyph = iconGlyphStyle(theme.system.icon, dimensions.iconSize, { selected, resolveFont: theme.resolveIconFont });
    const box = <IconBox icon={glyphSlotContent(icon, { color: iconColor, size: dimensions.iconSize, glyph }, drawn.icon, part('icon.glyph'))} color={iconColor} size={dimensions.iconSize} decorative testID={part('icon')} />;
    leading = drawsLabel ? <View style={{ marginEnd: dimensions.containerGap }}>{box}</View> : box;
  }

  const onLabelLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (measureKey !== null) onLabelMeasured(index, measureKey, event.nativeEvent.layout.width);
    },
    [measureKey, onLabelMeasured, index],
  );

  // SEG-14 / SEG-15: content centred, the size's paddings (logical: mirrored in right-to-left, SEG-21), at least the
  // padding-block above and below a label that wraps; SEG-6: at least a target wide.
  const hostStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: target,
    paddingStart: dimensions.containerPaddingInline,
    paddingEnd: dimensions.containerPaddingInline,
    paddingVertical: dimensions.containerPaddingBlock,
    ...(basis === null ? { flexShrink: 0 } : { flexGrow: 1, flexShrink: 1, flexBasis: basis }),
    ...rounding,
    ...shadow,
    ...(lifted ? { zIndex: 1 } : null),
    ...borderCurveOf(cornerSmoothing),
  };
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), opacity: drawn.opacity };

  // SEG-20: single — the radio role with its checked state (iOS has no radio trait: it hears selected too); multiple —
  // a toggle button with its selected (pressed) state. Named by its label, drawn or not; its position as the value.
  const a11yState: AccessibilityState = multiple ? { disabled, selected } : { disabled, checked: selected, ...(Platform.OS === 'ios' ? { selected } : null) };
  const hitSlop = { ...interaction.hostProps.hitSlop, left: 0, right: 0 };

  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={hitSlop}
      testID={testID}
      disabled={disabled}
      // SEG-3 / SEG-18 / SEG-19: only the tab stop is focusable; a disabled segment never is.
      focusable={tabStop && !disabled}
      accessibilityRole={multiple ? 'button' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={a11yState}
      accessibilityValue={{ text: positionText(index + 1, count) }}
      style={[hostStyle, surface]}
    >
      {ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(conditionTokens.pressed.containerColor)} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {leading}
      {drawsLabel ? (
        <Label style={labelStyle} color={drawn.label} onLayout={measureKey === null ? undefined : onLabelLayout} testID={part('label')}>
          {label}
        </Label>
      ) : null}
      {/* SEG-5: inside the segment, clear of the set's outline and the neighbours; never animated. */}
      <FocusRing visible={interaction.focused && !disabled} radius={shape} corners={corners} inside inset={focusInset} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
