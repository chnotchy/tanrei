import { Children, Fragment, isValidElement, useCallback, useEffect, useMemo, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Animated, I18nManager, ScrollView, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { partTestID } from '../primitives/content';
import { DestinationCell, destinationModel, type Destination, type DestinationIconProps } from '../primitives/destination';
import { Ring } from '../primitives/Ring';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue } from '../theme/lookup';
import { useTanrei, useTanreiInsets, type TanreiInsets } from '../theme/TanreiProvider';

/**
 * One destination of the rail (the spec's item kind `destination`): the same shape as
 * `NavigationBarDestination` — `{ value, label, icon, disabled?, badge?: { count?, label? } }` — so that a product switches
 * between bar and rail without touching its data.
 */
export type NavigationRailDestination = Destination;
/** What a destination's icon given as a function receives: the icon color, the size and the glyph. */
export type NavigationRailIconProps = DestinationIconProps;

/** Which destinations draw their label: all, only the selected one, or none. A label not drawn is still the name. */
export type NavigationRailLabelVisibility = 'always' | 'selected' | 'never';
const LABEL_VISIBILITIES: readonly NavigationRailLabelVisibility[] = ['always', 'selected', 'never'];

export type NavigationRailRef = ComponentRef<typeof View>;

export interface NavigationRailProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The destinations, in order: three to seven. */
  destinations: readonly NavigationRailDestination[];
  /** The selected destination's value. **Controlled**: move it from `onValueChange`. Empty selects none. */
  value?: string;
  /** The spec's `change`: the user activated a destination that is not the selected one; its value. */
  onValueChange?: (value: string) => void;
  /** The spec's `reselect`: the user activated the selected destination; its value. */
  onReselect?: (value: string) => void;
  /** Which destinations draw their label. Unknown values render as `always`, reported in development builds. */
  labelVisibility?: NavigationRailLabelVisibility;
  /**
   * The header, above the destinations: the header-button items — `IconButton`s (a menu button) — and the product's
   * floating action button, stacked and centred in that order. Laid out, never restyled; first in reading and focus order.
   */
  header?: ReactNode;
  /** The spec's `label`: names the rail itself ("Main"). */
  accessibilityLabel?: string;
  /** How a destination's position is announced. Default: `"2 of 4"` (English). */
  positionText?: (position: number, count: number) => string;
  /**
   * The system insets the rail reaches under (its color) and keeps its header and destinations inside: the top, the
   * bottom and the one at its start edge. Each side given replaces `TanreiProvider`'s `insets`.
   */
  insets?: TanreiInsets;
  /** Layout of the rail (margins); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<NavigationRailRef | null>;
}

/** The items of a slot, fragments opened. */
function slotItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? slotItems(child.props.children) : [child]));
}

const englishPosition = (position: number, count: number) => `${position} of ${count}`;
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei NavigationRail — spec: `specs/navigation-rail.spec.json`.
 * Anatomy: container (the start edge, the parent's full height, reaching under the start, top and bottom insets) > the
 * end edge (outline) + [header] + the destinations (scrolling when they do not fit): item container (the state layer and
 * the active indicator, the icon and its badge, the focus ring) + [label]. A tab bar: the rail has the `tablist` role
 * and each destination the `tab` role.
 */
export function NavigationRail({
  destinations,
  value = '',
  onValueChange,
  onReselect,
  labelVisibility: labelVisibilityProp = 'always',
  header,
  accessibilityLabel,
  positionText = englishPosition,
  insets: ownInsets,
  style,
  testID,
  ref,
  ...rest
}: NavigationRailProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.navigationRail;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const labelVisibility = closedValue(LABEL_VISIBILITIES, labelVisibilityProp, 'always', 'NavigationRail labelVisibility');
  // NVR-19: the provider's insets, each side the rail's own `insets` names replacing it. The rail is at the start edge.
  const insets = useTanreiInsets(ownInsets);
  const startInset = I18nManager.isRTL ? insets.right : insets.left;

  // NVR-3, NVR-18, NVR-21, NVR-23: the selection and the development reports.
  const model = useMemo(() => {
    const built = destinationModel(destinations, value, 'NavigationRail', where);
    if (destinations.length < 3 || destinations.length > 7) built.reports.push(`Tanrei: a NavigationRail${where} holds ${destinations.length} destinations; a rail holds three to seven.`);
    return built;
  }, [destinations, value, where]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // NVR-1 / NVR-2: change for another destination, reselect for the selected one, nothing for a disabled one.
  const activate = useCallback(
    (index: number) => {
      const destination = destinations[index];
      if (!destination || destination.disabled) return;
      if (index === model.selected) onReselect?.(destination.value);
      else onValueChange?.(destination.value);
    },
    [destinations, model.selected, onValueChange, onReselect],
  );

  // NVR-6: each cell the rail's full width and the destination's height with half the gap above and below (so that two
  // destinations are container.gap apart), at least the touch target high.
  const target = theme.system.measure.target.touch;
  const half = tokens.containerGap / 2;
  const cell: ViewStyle = { alignSelf: 'stretch', paddingVertical: half, minHeight: target };
  const count = destinations.length;
  const cells = destinations.map((destination, index) => {
    const selected = index === model.selected;
    // NVR-14: always, only the selected one, or none.
    const labelShown = labelVisibility === 'always' || (labelVisibility === 'selected' && selected);
    return (
      <DestinationCell
        key={index}
        destination={destination}
        index={index}
        count={count}
        selected={selected}
        labelShown={labelShown}
        labelFollowsSelection={labelVisibility === 'selected'}
        labelLines={2}
        tokens={tokens}
        component="NavigationRail"
        theme={theme}
        onActivate={activate}
        positionText={positionText}
        cellStyle={cell}
        testID={destination.testID ?? partTestID(testID, `destination.${index}`)}
      />
    );
  });

  // NVR-12: the header centred and stacked container.padding-block below the top; the destinations header.gap below it
  // (container.padding-block below the top without one) — less the half gap each cell carries above its destination.
  const headerItems = slotItems(header);
  const hasHeader = headerItems.length > 0;
  const headerNode = hasHeader ? (
    <View style={{ alignSelf: 'stretch', gap: tokens.containerGap, paddingTop: tokens.containerPaddingBlock }} testID={part('header')}>
      {/* Each centred in a row of its own: an icon button aligns itself to the start of a column. */}
      {headerItems.map((item, index) => (
        <View key={index} style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {item}
        </View>
      ))}
    </View>
  ) : null;
  const lead = Math.max(0, (hasHeader ? tokens.headerGap : tokens.containerPaddingBlock) - half);

  // NVR-11 / NVR-19: its color and elevation, the end edge; the color under the start, top and bottom insets.
  const elevation = theme.elevation(tokens.containerElevation);
  const fill = theme.resolve(tokens.containerColor);
  const outline = theme.resolve(tokens.outlineColor);
  const container: ViewStyle = {
    alignSelf: 'stretch',
    width: tokens.containerWidth + startInset,
    paddingStart: startInset,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...(supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : null) : elevation.legacy),
  };
  return (
    // NVR-20: the rail is the tab bar (the spec's React Native notes), named by its label.
    <Animated.View {...rest} ref={ref} role="tablist" accessibilityLabel={accessibilityLabel} style={[container, style]} testID={testID}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={0} testID={part('elevation-ring')} /> : null}
      {outline.a > 0 ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, end: 0, width: tokens.outlineWidth, backgroundColor: theme.paint(tokens.outlineColor) }} pointerEvents="none" testID={part('outline')} {...HIDDEN} />
      ) : null}
      {/* NVR-20: the header's content first in reading and focus order, with its own semantics. */}
      {headerNode}
      {/* NVR-18: the destinations scroll when the rail is too short; the header stays. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: lead, paddingBottom: Math.max(0, tokens.containerPaddingBlock - half) }} showsVerticalScrollIndicator={false} bounces={false} testID={part('scroll')}>
        {cells}
      </ScrollView>
    </Animated.View>
  );
}
