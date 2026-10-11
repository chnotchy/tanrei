import { useCallback, useEffect, useMemo, type ComponentRef, type RefObject } from 'react';
import { Animated, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { partTestID } from '../primitives/content';
import { DestinationCell, destinationModel, type Destination, type DestinationIconProps } from '../primitives/destination';
import { Ring } from '../primitives/Ring';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue } from '../theme/lookup';
import { useTanrei, useTanreiInsets, type TanreiInsets } from '../theme/TanreiProvider';

/**
 * One destination of the bar (the spec's item kind `destination`): `{ value, label, icon, disabled?, badge? }`,
 * where `icon` is the glyph's name and `badge?: { count?: number | null; label?: string }` (absent: no badge) is drawn as
 * a `Badge` on the icon. The same shape as `NavigationRailDestination`.
 */
export type NavigationBarDestination = Destination;
/** What a destination's icon given as a function receives: the icon color, the size and the glyph. */
export type NavigationBarIconProps = DestinationIconProps;

/** Which destinations draw their label: all, only the selected one, or none. A label not drawn is still the name. */
export type NavigationBarLabelVisibility = 'always' | 'selected' | 'never';
const LABEL_VISIBILITIES: readonly NavigationBarLabelVisibility[] = ['always', 'selected', 'never'];

export type NavigationBarRef = ComponentRef<typeof View>;

export interface NavigationBarProps extends Omit<ViewProps, 'children' | 'style'> {
  /** The destinations, in order: three to five. */
  destinations: readonly NavigationBarDestination[];
  /** The selected destination's value. **Controlled**: move it from `onValueChange`. Empty selects none. */
  value?: string;
  /** The spec's `change`: the user activated a destination that is not the selected one; its value. */
  onValueChange?: (value: string) => void;
  /** The spec's `reselect`: the user activated the selected destination (scroll that screen to its top); its value. */
  onReselect?: (value: string) => void;
  /** Which destinations draw their label. Unknown values render as `always`, reported in development builds. */
  labelVisibility?: NavigationBarLabelVisibility;
  /** The spec's `label`: names the bar itself ("Main"). */
  accessibilityLabel?: string;
  /** How a destination's position is announced. Default: `"2 of 4"` (English). */
  positionText?: (position: number, count: number) => string;
  /**
   * The system insets the bar reaches under (its color) and keeps its destinations above and inside: the bottom one and
   * the side ones. Each side given replaces `TanreiProvider`'s `insets`.
   */
  insets?: TanreiInsets;
  /** Layout of the bar (margins); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: RefObject<NavigationBarRef | null>;
}

const englishPosition = (position: number, count: number) => `${position} of ${count}`;
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei NavigationBar — spec: `specs/navigation-bar.spec.json`.
 * Anatomy: container (reaching under the bottom and side insets) > the top edge (outline) + one cell per destination:
 * item container (the state layer and the active indicator, the icon and its badge, the focus ring) + [label]. A tab bar:
 * the bar has the `tablist` role and each destination the `tab` role.
 */
export function NavigationBar({
  destinations,
  value = '',
  onValueChange,
  onReselect,
  labelVisibility: labelVisibilityProp = 'always',
  accessibilityLabel,
  positionText = englishPosition,
  insets: ownInsets,
  style,
  testID,
  ref,
  ...rest
}: NavigationBarProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.navigationBar;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const labelVisibility = closedValue(LABEL_VISIBILITIES, labelVisibilityProp, 'always', 'NavigationBar labelVisibility');
  // NVB-18: the provider's insets, each side the bar's own `insets` names replacing it.
  const insets = useTanreiInsets(ownInsets);

  // NVB-3, NVB-17, NVB-20, NVB-22: the selection and the development reports.
  const model = useMemo(() => {
    const built = destinationModel(destinations, value, 'NavigationBar', where);
    if (destinations.length < 3 || destinations.length > 5) built.reports.push(`Tanrei: a NavigationBar${where} holds ${destinations.length} destinations; a bar holds three to five.`);
    return built;
  }, [destinations, value, where]);
  const reports = model.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // NVB-1 / NVB-2: change for another destination, reselect for the selected one, nothing for a disabled one.
  const activate = useCallback(
    (index: number) => {
      const destination = destinations[index];
      if (!destination || destination.disabled) return;
      if (index === model.selected) onReselect?.(destination.value);
      else onValueChange?.(destination.value);
    },
    [destinations, model.selected, onValueChange, onReselect],
  );

  // NVB-11: equal cells in reading order (a row, which React Native mirrors in right-to-left), the bar's full height.
  const target = theme.system.measure.target.touch;
  const cell: ViewStyle = { flexGrow: 1, flexBasis: 0, alignSelf: 'stretch', minHeight: target, minWidth: target };
  const count = destinations.length;
  const cells = destinations.map((destination, index) => {
    const selected = index === model.selected;
    // NVB-13: always, only the selected one, or none.
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
        labelLines={1}
        tokens={tokens}
        component="NavigationBar"
        theme={theme}
        onActivate={activate}
        positionText={positionText}
        cellStyle={cell}
        testID={destination.testID ?? partTestID(testID, `destination.${index}`)}
      />
    );
  });

  // NVB-11: its color and elevation, the top edge; NVB-18: the color under the bottom and side insets, the cells inside.
  const elevation = theme.elevation(tokens.containerElevation);
  const fill = theme.resolve(tokens.containerColor);
  const outline = theme.resolve(tokens.outlineColor);
  const container: ViewStyle = {
    alignSelf: 'stretch',
    flexDirection: 'row',
    minHeight: tokens.containerHeight + insets.bottom,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...(supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : null) : elevation.legacy),
  };
  return (
    <Animated.View {...rest} ref={ref} role="tablist" accessibilityLabel={accessibilityLabel} style={[container, style]} testID={testID}>
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={0} testID={part('elevation-ring')} /> : null}
      {outline.a > 0 ? (
        <View style={{ position: 'absolute', top: 0, start: 0, end: 0, height: tokens.outlineWidth, backgroundColor: theme.paint(tokens.outlineColor) }} pointerEvents="none" testID={part('outline')} {...HIDDEN} />
      ) : null}
      {cells}
    </Animated.View>
  );
}
