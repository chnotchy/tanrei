import { PixelRatio, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { fillOf, partTestID } from '../primitives/content';
import { closedValue } from '../theme/lookup';
import { useTanrei } from '../theme/TanreiProvider';

/** Horizontal separates stacked content (in a column); vertical separates content in a row. */
export type DividerOrientation = 'horizontal' | 'vertical';
/** How the line is shortened: `none` (full length), `start` (at its start), `both` (at both ends, a middle divider). */
export type DividerInset = 'none' | 'start' | 'both';

const ORIENTATIONS: readonly DividerOrientation[] = ['horizontal', 'vertical'];
const INSETS: readonly DividerInset[] = ['none', 'start', 'both'];

export interface DividerProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `horizontal` spans the width of a column; `vertical` spans the height of a row. Unknown values render as `horizontal` (DIV-7). */
  orientation?: DividerOrientation;
  /** Shortens the line by `divider.lineInset` at its start (`start`) or at both ends (`both`). Unknown values render as `none` (DIV-7). */
  inset?: DividerInset;
  /** Hidden from assistive technology (the default). `false` exposes a separator, for groups whose grouping is meaningful. */
  decorative?: boolean;
  /** Layout overrides (margins, `alignSelf`, a fixed length). The divider has no margin of its own; do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

/**
 * DIV-8: a length on the device pixel grid, never thinner than one device pixel. Yoga rounds every layout position to
 * the same grid, so a line of a whole number of device pixels never straddles two rows or columns of pixels.
 */
function onPixelGrid(length: number, atLeastOnePixel: boolean): number {
  const snapped = PixelRatio.roundToNearestPixel(length);
  return atLeastOnePixel ? Math.max(snapped, 1 / PixelRatio.get()) : snapped;
}

/** Accessibility of a decorative divider (DIV-5): not an element, hidden with everything in it, on iOS and Android. */
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei Divider — spec: `specs/divider.spec.json`.
 * Anatomy: line. The host spans the full length its layout gives it (`alignSelf: 'stretch'`) and exactly the line's
 * thickness across; the line inside it is shortened by the inset. No margin, no padding: the space around a divider
 * belongs to the layout that places it (DIV-2).
 */
export function Divider({ orientation = 'horizontal', inset = 'none', decorative = true, style, testID, ...rest }: DividerProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.divider;
  // DIV-7: orientation and inset are closed (drawn by code, not token axes); an unknown value is the default, reported
  // in development builds only.
  const axis = closedValue(ORIENTATIONS, orientation, 'horizontal', 'Divider orientation');
  const shortened = closedValue(INSETS, inset, 'none', 'Divider inset');

  // DIV-1 / DIV-8: the thickness and the inset, snapped to the device pixel grid.
  const thickness = onPixelGrid(tokens.lineThickness, true);
  const length = onPixelGrid(tokens.lineInset, false);
  // DIV-3: the inset stretch draws nothing.
  const atStart = shortened === 'none' ? 0 : length;
  const atEnd = shortened === 'both' ? length : 0;
  const horizontal = axis === 'horizontal';

  // DIV-1 / DIV-2: the full length of the container, exactly the thickness across.
  const host: ViewStyle = horizontal ? { alignSelf: 'stretch', height: thickness } : { alignSelf: 'stretch', width: thickness };
  // DIV-4: a horizontal line is shortened at its logical start (`start` / `end`: the right end in right-to-left); a
  // vertical line at its top, whatever the direction.
  const placement: ViewStyle = horizontal ? { top: 0, bottom: 0, start: atStart, end: atEnd } : { start: 0, end: 0, top: atStart, bottom: atEnd };
  // A paint that resolves to nothing draws nothing.
  const color = theme.resolve(tokens.lineColor);
  const line: ViewStyle = { position: 'absolute', pointerEvents: 'none', ...placement, backgroundColor: fillOf(color, theme.paint(tokens.lineColor)) as string | undefined };

  // DIV-5 / DIV-6: decorative, it is not in the accessibility tree; otherwise a separator with no name of its own.
  // Never focusable: a focusable separator is a splitter, another component.
  const a11y = decorative ? HIDDEN : ({ accessible: true, role: 'separator' } as const);

  return (
    <View {...rest} {...a11y} testID={testID} focusable={false} style={[host, style]}>
      <View style={line} testID={partTestID(testID, 'line')} />
    </View>
  );
}
