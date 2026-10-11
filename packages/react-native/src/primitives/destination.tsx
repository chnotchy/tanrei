import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Pressable, View, useWindowDimensions, type Insets, type LayoutChangeEvent, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiCubicBezier, TanreiPaint, TanreiTypescaleRole } from '../generated/vocabulary';
import { Badge, badgeContent } from '../components/Badge';
import { iconGlyphStyle } from '../theme/icon';
import { lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import type { TanreiTheme } from '../theme/TanreiProvider';
import { IconBox, Label, fillOf, glyphSlotContent, partTestID, type GlyphSlot, type GlyphSlotProps } from './content';
import { FocusRing } from './FocusRing';
import type { InteractionState } from './interaction';
import { useItemRow } from './itemRow';
import { PressRipple } from './PressRipple';
import { stateShape } from './stateShape';

// A navigation destination drawn as an icon over a label — the navigation bar's and the navigation rail's item kind
// `destination`. The cell is the hit area; its item container is the state layer's box AND the active
// indicator, so that the press answer, the focus ring and the ripple sit on it. Package-internal: the bar
// lays its cells out in a row, the rail in a column; this is what they share.

/** What a destination's icon given as a function receives: the icon color of its condition and state, the size, the glyph. */
export type DestinationIconProps = GlyphSlotProps;

/**
 * One destination (the spec's item kind `destination`): the element type of a bar's or a rail's `destinations`. The
 * same shape for both, so that a product switches between them without touching its data.
 */
export interface Destination {
  /** Identifies the destination: the bar's `value` selects it, `onValueChange` and `onReselect` carry it. Unique; required. */
  value: string;
  /** Its name, drawn under the icon (see `labelVisibility`) and always its accessible name. Required. */
  label: string;
  /** The glyph's name in the system's icon font (a function or a node also works), outlined while unselected, filled while selected. Required. */
  icon: GlyphSlot<DestinationIconProps>;
  /** Keeps its place, draws its disabled look, cannot be activated and leaves the focus order. */
  disabled?: boolean;
  /**
   * A Tanrei `Badge` on the icon (the spec's `badge`, `badgeCount`, `badgeLabel`): `count` as the badge's (`null` or left
   * out draws the dot, 0 nothing, above 0 the number), `label` what assistive technology reads after the destination's
   * name and state. Absent: no badge.
   */
  badge?: { count?: number | null; label?: string };
  /** The destination's test id (default: `<bar testID>.destination.<n>`); its parts are `<testID>.<part>`. */
  testID?: string;
}

/** The tokens a destination reads: the navigation bar's and the navigation rail's share these names (structural). */
export interface DestinationTokens {
  readonly itemContainerWidth: number;
  readonly itemContainerHeight: number;
  readonly itemContainerShape: number;
  readonly itemGap: number;
  readonly itemIconSize: number;
  readonly itemLabelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly hoveredOpacity: number;
  readonly focusedOpacity: number;
  readonly pressedOpacity: number;
  readonly disabledOpacity: number;
  readonly conditions: object;
}

/** What one condition of a destination is drawn from in one interaction state. */
interface DestinationStateTokens {
  readonly itemContainerColor: TanreiPaint;
  readonly itemIconColor: TanreiPaint;
  readonly itemLabelColor: TanreiPaint;
}
type DestinationCondition = Readonly<Record<InteractionState, DestinationStateTokens>>;
type Part = 'icon' | 'label';

export interface DestinationModel {
  /** The selected destination's index, or -1 when none is (an empty value, or one no destination has). */
  selected: number;
  reports: string[];
}

/**
 * The selection of a set of destinations (NVB-3 / NVB-22, NVR-3 / NVR-23, NVD-3 / NVD-29) and the development reports
 * every navigation component shares: a value no destination has selects none; a repeated value selects the first; a
 * destination without a label still renders.
 */
export function destinationModel(destinations: readonly { value: string; label: string }[], value: string, component: string, where: string): DestinationModel {
  const reports: string[] = [];
  const byValue = new Map<string, number>();
  destinations.forEach((destination, index) => {
    const n = index + 1;
    if (byValue.has(destination.value)) reports.push(`Tanrei: destination ${n} of a ${component}${where} repeats the value "${destination.value}" of destination ${byValue.get(destination.value)! + 1}; the first of them is the one the value selects.`);
    else byValue.set(destination.value, index);
    if (!destination.label?.trim()) reports.push(`Tanrei: destination ${n} of a ${component}${where} has no label, so it has no accessible name.`);
  });
  let selected = -1;
  if (value !== '') {
    selected = byValue.get(value) ?? -1;
    if (selected < 0) reports.push(`Tanrei: a ${component}${where} has the value "${value}", which no destination has; none is selected.`);
  }
  return { selected, reports };
}

/** The badge's description (NVB-16 / NVR-17): its label, else the count it displays; nothing for no badge or a count of 0. */
export function badgeDescription(badge: Destination['badge']): string {
  if (!badge) return '';
  const shown = badgeContent(badge.count ?? null, 999);
  if (shown.form === 'none') return '';
  return badge.label?.trim() || shown.text;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export interface DestinationProps {
  destination: Destination;
  index: number;
  count: number;
  selected: boolean;
  /** Whether the label is drawn (the component's `labelVisibility` and this destination's selection). */
  labelShown: boolean;
  /** The labels appear and disappear with the selection (`labelVisibility: 'selected'`): they move over the selection motion. */
  labelFollowsSelection: boolean;
  /** At most this many lines, truncated at the end after that (the bar: 1, the rail: 2). */
  labelLines: number;
  tokens: DestinationTokens;
  /** The component's name in reports (`Navigation bar`). */
  component: string;
  theme: TanreiTheme;
  onActivate: (index: number) => void;
  positionText: (position: number, count: number) => string;
  /** The cell's layout in the component (the bar's equal share of the row, the rail's full width). */
  cellStyle: ViewStyle;
  testID: string | undefined;
}

/**
 * One destination cell: the whole cell is the pressable (the hit area), holding the item container — the fill (the state
 * layer and the active indicator), the ripple, the icon with its badge, the focus ring — and the label under it.
 */
export function DestinationCell({ destination, index, count, selected, labelShown, labelFollowsSelection, labelLines, tokens, component, theme, onActivate, positionText, cellStyle, testID }: DestinationProps) {
  const { label = '', icon, disabled = false, badge } = destination;
  const { cornerSmoothing } = theme.system.shape;
  const part = (name: string) => partTestID(testID, name);
  const reduce = useReduceMotion();
  const condition = selected ? 'selected' : 'unselected';
  // A condition the active system does not have falls back to `unselected`; conditions are closed today, the holder is open.
  const look = lookupValue(tokens.conditions as Record<'unselected' | 'selected', DestinationCondition>, condition, 'unselected', `${component} condition`);
  const size = { width: tokens.itemContainerWidth, height: tokens.itemContainerHeight };
  const area = useRef<ComponentRef<typeof View> | null>(null);
  const handlePress = useCallback(() => onActivate(index), [onActivate, index]);

  // The state that wins, its tokens in the destination's condition, the press hold, the ripple grown in the item
  // container (from the point of contact, or its centre for a press on the label or a keyboard activation), and one
  // transition: a state change over the state motion (a press at once), a change of selection over the selection motion.
  const drawnRow = useItemRow<Part>({
    pressable: true,
    disabled,
    condition,
    paints: (state) => ({ container: look[state].itemContainerColor, icon: look[state].itemIconColor, label: look[state].itemLabelColor }),
    shapes: { containerShape: tokens.itemContainerShape, hoveredOpacity: tokens.hoveredOpacity, focusedOpacity: tokens.focusedOpacity, pressedOpacity: tokens.pressedOpacity, disabledOpacity: tokens.disabledOpacity },
    motion: {
      feedbackDuration: tokens.motionFeedbackDuration,
      stateDuration: tokens.motionStateDuration,
      stateEasing: tokens.motionStateEasing,
      selectionDuration: tokens.motionSelectionDuration,
      selectionEasing: tokens.motionSelectionEasing,
    },
    estimate: size,
    rippleArea: { ref: area, size },
    onPress: handlePress,
  });
  const { drawn, colors, interaction, state } = drawnRow;
  const shape = stateShape({ containerShape: tokens.itemContainerShape, hoveredOpacity: tokens.hoveredOpacity, focusedOpacity: tokens.focusedOpacity, pressedOpacity: tokens.pressedOpacity, disabledOpacity: tokens.disabledOpacity }, state).shape;

  // The selection motion (NVB-15 / NVR-16, spec change 6c8a6cf): the new destination's indicator grows in width only,
  // from the centre of its item container (scaleX from 0 about the centre), at its full height throughout; the previous
  // one fades (its color, above); a label that follows the selection appears or
  // disappears, moving the item container. At once where motion is reduced.
  const previous = useRef(selected);
  const [grow, setGrow] = useState<Animated.Value | null>(null);
  const [labelMotion, setLabelMotion] = useState<{ progress: Animated.Value; showing: boolean } | null>(null);
  useEffect(() => {
    if (previous.current === selected) return undefined;
    previous.current = selected;
    if (reduce) {
      setGrow(null);
      setLabelMotion(null);
      return undefined;
    }
    const timing = (value: Animated.Value, toValue: number, native: boolean) =>
      Animated.timing(value, { toValue, duration: tokens.motionSelectionDuration, easing: toEasing(tokens.motionSelectionEasing), useNativeDriver: native });
    const running: Animated.CompositeAnimation[] = [];
    if (selected) {
      const value = new Animated.Value(0);
      setGrow(value);
      // JS-driven: the same view's color moves with the JS driver, and one view cannot mix the two.
      const animation = timing(value, 1, false);
      running.push(animation);
      animation.start(({ finished }) => finished && setGrow((current) => (current === value ? null : current)));
    }
    if (labelFollowsSelection) {
      const progress = new Animated.Value(selected ? 0 : 1);
      const motion = { progress, showing: selected };
      setLabelMotion(motion);
      const animation = timing(progress, selected ? 1 : 0, false);
      running.push(animation);
      animation.start(({ finished }) => finished && setLabelMotion((current) => (current === motion ? null : current)));
    }
    return () => {
      for (const each of running) each.stop();
    };
  }, [selected]);

  // NVB-14 / NVR-15: the glyph of the destination's selection (family and fill) at the icon size.
  const glyph = iconGlyphStyle(theme.system.icon, tokens.itemIconSize, { selected, resolveFont: theme.resolveIconFont });
  const iconBox = (
    <IconBox icon={glyphSlotContent(icon, { color: colors.icon, size: tokens.itemIconSize, glyph }, drawn.icon, part('icon.glyph'))} color={colors.icon} size={tokens.itemIconSize} decorative testID={part('icon')} />
  );
  // NVB-16 / NVR-17: a Tanrei badge on the icon, kept while disabled; its description joins the destination's.
  const iconNode = badge ? (
    // Centred in the item container (a badge's box aligns itself to the start by default).
    <Badge count={badge.count ?? null} label={badge.label ?? ''} style={{ alignSelf: 'center' }} testID={part('badge')}>
      {iconBox}
    </Badge>
  ) : (
    iconBox
  );

  // The label: under the item container, `itemGap` away, centred, in the label's type style, at most `labelLines` lines.
  const { fontScale } = useWindowDimensions();
  const labelStyle: TextStyle = { ...theme.text(tokens.itemLabelTypescale), textAlign: 'center' };
  const [labelHeight, setLabelHeight] = useState<number | null>(null);
  const onLabelLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setLabelHeight((current) => (current === height ? current : height));
  }, []);
  const drawsLabel = labelShown || labelMotion !== null;
  const labelNode = drawsLabel ? (
    <Label style={labelStyle} color={drawn.label} numberOfLines={labelLines} onLayout={onLabelLayout} testID={part('label')}>
      {label}
    </Label>
  ) : null;
  const estimated = (typeof labelStyle.lineHeight === 'number' ? labelStyle.lineHeight : tokens.itemIconSize) * fontScale;
  const labelSlot = labelMotion ? (
    <Animated.View
      style={{
        overflow: 'hidden',
        opacity: labelMotion.progress,
        height: labelMotion.progress.interpolate({ inputRange: [0, 1], outputRange: [0, tokens.itemGap + (labelHeight ?? estimated)] }),
        paddingTop: tokens.itemGap,
        alignSelf: 'stretch',
      }}
      testID={part('label-slot')}
    >
      {labelNode}
    </Animated.View>
  ) : labelNode ? (
    <View style={{ paddingTop: tokens.itemGap, alignSelf: 'stretch' }} testID={part('label-slot')}>
      {labelNode}
    </View>
  ) : null;

  // The fill of the item container: the state layer and, while selected, the active indicator.
  const fill = fillOf(drawnRow.container, drawn.container);
  const fillNode =
    fill !== undefined ? (
      <Animated.View
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: drawn.shape, backgroundColor: fill, ...borderCurveOf(cornerSmoothing), ...(grow ? { transform: [{ scaleX: grow }] } : null) }}
        pointerEvents="none"
        testID={part('fill')}
      />
    ) : null;

  const container: ViewStyle = { width: tokens.itemContainerWidth, height: tokens.itemContainerHeight, alignItems: 'center', justifyContent: 'center', borderRadius: shape, ...borderCurveOf(cornerSmoothing) };
  const description = [positionText(index + 1, count), badgeDescription(badge)].filter(Boolean).join(', ');
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      // The cell is the hit area; neighbours touch, so it reaches no further.
      hitSlop={NO_SLOP}
      testID={testID}
      disabled={disabled}
      // Each destination that is not disabled is a tab stop.
      focusable={!disabled}
      // A tab of a tab bar, named by its label (drawn or not), with its selected state, its position and its badge.
      role="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      accessibilityValue={{ text: description }}
      style={[{ alignItems: 'center', justifyContent: 'center' }, cellStyle, { opacity: drawn.opacity }]}
    >
      <View style={{ alignItems: 'center', alignSelf: 'stretch' }} testID={part('group')}>
        <View ref={area} style={container} testID={part('container')}>
          {fillNode}
          {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={drawnRow.rippleColor} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
          {iconNode}
          <FocusRing visible={interaction.focused && !disabled} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
        </View>
        {labelSlot}
      </View>
    </AnimatedPressable>
  );
}
