import { Children, cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Text, View, type AccessibilityValue, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { drawsColor, partTestID } from '../primitives/content';
import { Ring } from '../primitives/Ring';
import { iconGlyphStyle } from '../theme/icon';
import { useTanrei } from '../theme/TanreiProvider';

/** The spec default of `max` (BDG-4), and what a `max` below 1 falls back to (BDG-14). */
const DEFAULT_MAX = 999;

export interface BadgeProps extends Omit<ViewProps, 'children' | 'style'> {
  /** How many things are waiting. `null` / `undefined` draws the dot; 0 (or less) draws nothing; above 0 draws the number. */
  count?: number | null;
  /** The largest count shown as it is; a larger one shows as `max` followed by a plus sign (`999+`). Below 1: 999 (BDG-14). */
  max?: number;
  /**
   * What assistive technology reads after the anchor's own name (`"3 unread"`), appended to the anchor's
   * `accessibilityValue.text`. Empty reads the displayed count; a dot needs one (BDG-9).
   */
  label?: string;
  /**
   * The anchor: one element (an `IconButton`, an icon, an avatar) that receives the description as its
   * `accessibilityValue.text`. A string is a glyph of the system's icon font (`'notifications'`) at `measure.icon.large`,
   * named by its glyph name (the spec's fixtures).
   */
  children?: ReactNode;
  /** Layout overrides for the anchor's box (margins, `alignSelf`). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
}

/** What a badge shows for `count` and `max`, after BDG-14's corrections; `problems` is what development builds report. */
interface Shown {
  form: 'none' | 'dot' | 'count';
  /** The drawn text (locale digits, no grouping; `max+` when capped). */
  text: string;
  problems: string[];
}

/** BDG-12: the current locale's digits, no grouping separator. */
function formatCount(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, { useGrouping: false, maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

/** BDG-1 … BDG-5, BDG-14: the badge's form and text. Pure. */
export function badgeContent(count: number | null | undefined, max: number): Shown {
  const problems: string[] = [];
  if (count === null || count === undefined) return { form: 'dot', text: '', problems };
  let whole = count;
  // BDG-14: not a number (NaN, or a value of another type from untyped code) renders as for 0.
  if (typeof whole !== 'number' || Number.isNaN(whole)) {
    problems.push(`count ${String(count)} is not a number; drawing nothing, as for 0`);
    return { form: 'none', text: '', problems };
  }
  // Infinity is a count above any max: it shows `max+`.
  if (Number.isFinite(whole) && !Number.isInteger(whole)) {
    whole = Math.floor(whole);
    problems.push(`count ${count} is not a whole number; using ${whole}`);
  }
  if (whole < 0) {
    problems.push(`count ${count} is negative; drawing nothing, as for 0`);
    return { form: 'none', text: '', problems };
  }
  if (whole === 0) return { form: 'none', text: '', problems };
  let cap = max;
  if (!Number.isFinite(cap) || cap < 1) {
    problems.push(`max ${max} is below 1; using ${DEFAULT_MAX}`);
    cap = DEFAULT_MAX;
  } else if (!Number.isInteger(cap)) {
    cap = Math.floor(cap);
    problems.push(`max ${max} is not a whole number; using ${cap}`);
  }
  return { form: 'count', text: whole > cap ? `${formatCount(cap)}+` : formatCount(whole), problems };
}

/** BDG-8: the anchor's value text with the badge's description appended. */
function describe(value: AccessibilityValue | undefined, description: string): AccessibilityValue {
  const own = value?.text?.trim();
  return { ...value, text: own ? `${own}, ${description}` : description };
}

/** Unicode first-strong isolate … pop directional isolate (BDG-11). */
const FSI = '\u2068';
const PDI = '\u2069';

/** The badge's drawing is never read: the anchor's description says it (BDG-8). */
const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/**
 * Tanrei Badge — spec: `specs/badge.spec.json`.
 * Anatomy: anchor (children) + [dot | container > label] + outline. The badge wraps its anchor in a box of the anchor's
 * size and draws itself absolutely over the anchor's top-end corner: it takes no space and no input, and it is hidden
 * from assistive technology — its label (or the displayed count) is appended to the anchor's `accessibilityValue.text`.
 */
export function Badge({ count = null, max = DEFAULT_MAX, label = '', children, style, testID, ...rest }: BadgeProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.badge;
  const shown = badgeContent(count, max);
  // BDG-3 / BDG-13: the pill's drawn height, measured; `container.height` (its minimum) until measured.
  const [measured, setMeasured] = useState<number | null>(null);
  const drawnHeight = Math.max(tokens.containerHeight, measured ?? 0);
  const measure = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setMeasured((current) => (current === height ? current : height));
  };

  // BDG-9: a dot with no label tells assistive technology nothing. BDG-14: corrected values. Development builds only.
  const silentDot = shown.form === 'dot' && !label.trim();
  const problems = shown.problems.join('; ');
  useEffect(() => {
    if (!__DEV__) return;
    const where = testID ? ` (testID "${testID}")` : '';
    if (silentDot) console.warn(`Tanrei: a Badge${where} draws a dot with no label. A dot tells assistive technology nothing; give it a label ("New messages").`);
    if (problems) console.warn(`Tanrei: a Badge${where}: ${problems}.`);
  }, [silentDot, problems, testID]);

  // BDG-8 / BDG-10: the label, else the displayed count, joins the anchor's description; a count of 0 adds nothing
  // (BDG-5). Nothing is announced: the description changes and assistive technology reads it when it reaches the anchor.
  const description = shown.form === 'none' ? '' : label.trim() || shown.text;
  const anchor = describedAnchor(children, description, theme);

  const part = (name: string) => partTestID(testID, name);
  const color = theme.paint(tokens.containerColor);
  const outlineColor = theme.resolve(tokens.outlineColor);
  // BDG-6: outside the edge, never changing the badge's size or place; a paint that resolves to nothing draws nothing.
  const outlined = tokens.outlineWidth > 0 && drawsColor(outlineColor, theme.paint(tokens.outlineColor));
  const outline = (radius: number) =>
    outlined ? <Ring placement="outside" width={tokens.outlineWidth} color={theme.paint(tokens.outlineColor)} radius={radius} testID={part('outline')} /> : null;
  const fill = theme.resolve(tokens.containerColor).a === 0 ? undefined : color;

  let badge: ReactElement | null = null;
  if (shown.form === 'dot') {
    // BDG-1: a circle of `dot.size` — whatever corners the container has — its center `dot.offset` inside the anchor's
    // top-end corner on both axes. BDG-13: it keeps its size.
    const reach = tokens.dotOffset - tokens.dotSize / 2;
    badge = (
      <View
        {...HIDDEN}
        testID={part('dot')}
        style={{ position: 'absolute', top: reach, end: reach, width: tokens.dotSize, height: tokens.dotSize, borderRadius: tokens.dotSize / 2, backgroundColor: fill, pointerEvents: 'none' }}
      >
        {outline(tokens.dotSize / 2)}
      </View>
    );
  } else if (shown.form === 'count') {
    // BDG-3 / BDG-13: the center of the leading circle — a square of the pill's DRAWN height at its start — sits
    // `container.offset` inside the anchor's top-end corner; the pill starts there and grows toward the end, away from
    // the anchor. The drawn height is `container.height` until the first layout pass says otherwise (enlarged text).
    const lead = tokens.containerOffset - drawnHeight / 2;
    badge = (
      <View
        {...HIDDEN}
        testID={part('container')}
        onLayout={measure}
        style={{
          position: 'absolute',
          top: lead,
          start: '100%',
          marginStart: -(tokens.containerOffset + drawnHeight / 2),
          // BDG-2 / BDG-13: minimums — the pill grows with enlarged text, and is never narrower than it is high.
          minHeight: tokens.containerHeight,
          minWidth: drawnHeight,
          paddingStart: tokens.containerPaddingInline,
          paddingEnd: tokens.containerPaddingInline,
          borderRadius: tokens.containerShape,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {outline(tokens.containerShape)}
        {/* BDG-11: isolated, so a capped count keeps its plus sign after the digits in right-to-left layouts. BDG-12: tabular figures. */}
        <Text style={[theme.text(tokens.labelTypescale), { color: theme.paint(tokens.labelColor), textAlign: 'center', fontVariant: ['tabular-nums'] }]} allowFontScaling testID={part('label')}>
          {`${FSI}${shown.text}${PDI}`}
        </Text>
      </View>
    );
  }

  // BDG-7: the box is the anchor's own size (no padding, no border); the badge is absolute over it. A row, because Yoga
  // constrains an absolute child of a COLUMN to the column's width (`AbsoluteLayout.cpp`: "allows text within the
  // absolute child to wrap to the size of its owner"): over a 20-wide icon, "999+" would wrap. In a row it takes the
  // width of its text.
  return (
    <View {...rest} testID={testID} style={[{ alignSelf: 'flex-start', flexDirection: 'row' }, style]}>
      {anchor}
      {badge}
    </View>
  );
}

/**
 * The anchor with the description appended to its `accessibilityValue.text` (BDG-8). One element is cloned with it; a
 * string is drawn as a glyph of the system's icon font and described the same way; anything else is returned as is,
 * wrapped in one accessible element that carries the description.
 */
function describedAnchor(children: ReactNode, description: string, theme: ReturnType<typeof useTanrei>): ReactNode {
  if (typeof children === 'string') {
    // The spec's fixtures (the default slot): the glyph the content names, at sys.icon.large in on-surface-variant,
    // named by its glyph name ("mail"); the badge's label is its value ("mail, 3 unread"), never its name as well.
    const size = theme.system.measure.icon.large;
    const glyph = iconGlyphStyle(theme.system.icon, size, { resolveFont: theme.resolveIconFont });
    return (
      // An icon is not text: drawn at the icon size, whatever the system's font scale.
      <Text
        accessible
        accessibilityLabel={children}
        style={[glyph.style, { color: theme.color('onSurfaceVariant') }]}
        allowFontScaling={false}
        accessibilityValue={description ? { text: description } : undefined}
      >
        {children}
      </Text>
    );
  }
  if (!description) return children;
  const only = Children.count(children) === 1 ? Children.toArray(children)[0] : undefined;
  if (isValidElement<{ accessibilityValue?: AccessibilityValue }>(only)) {
    return cloneElement(only, { accessibilityValue: describe(only.props.accessibilityValue, description) });
  }
  return (
    <View accessible accessibilityValue={{ text: description }}>
      {children}
    </View>
  );
}
