import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { GroupItemContext, type GroupItem } from '../primitives/groupItem';
import { closedValue } from '../theme/lookup';
import { useTanrei } from '../theme/TanreiProvider';
import { Button } from './Button';
import { IconButton } from './IconButton';

/** `standard` spaces the buttons apart; `connected` joins them, with tighter corners where they meet. A closed choice of layout. */
export type ButtonGroupVariant = 'standard' | 'connected';
const VARIANTS: readonly ButtonGroupVariant[] = ['standard', 'connected'];

/** The row: a `View` (with the `group` role when it has a label). */
export type ButtonGroupRef = ComponentRef<typeof View>;

export interface ButtonGroupProps extends Omit<ViewProps, 'children' | 'style'> {
  /** `standard` (the default) spaces the buttons apart; `connected` joins them for a closely related set. Unknown values render as `standard` (BGR-9). */
  variant?: ButtonGroupVariant;
  /** The spec's `label`: the group's accessible name ("Text style"). Optional: without it the group adds no accessibility element (BGR-6). */
  accessibilityLabel?: string;
  /** The items, in order: `Button` and `IconButton` elements (toggles included), each as it is anywhere. */
  children?: ReactNode;
  /** Layout of the row (margins, `alignSelf`); do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<ButtonGroupRef>;
}

/** Is `node` an item the group can join: a Tanrei `Button` or `IconButton` element? */
const isItem = (node: ReactNode) => isValidElement(node) && (node.type === Button || node.type === IconButton);
/** BGR-7: an icon button keeps its size; a Button narrows. */
const shrinks = (node: ReactNode) => isValidElement(node) && node.type === Button;

/**
 * Tanrei ButtonGroup — spec: `specs/button-group.spec.json`.
 * Anatomy: group (a row that draws nothing of its own) > items: Tanrei `Button` and `IconButton` elements, each drawn
 * from its own tokens, answering its own states, emitting its own events and being its own Tab stop (BGR-5). The group
 * reaches them through an internal context (BTN-10, ICB-10): where they sit, the inner corners and minimum width of a
 * connected group, and how far a hit area may reach toward a neighbour.
 */
export function ButtonGroup({ variant: variantProp = 'standard', accessibilityLabel, children, style, testID, onLayout, ref, ...rest }: ButtonGroupProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.buttonGroup;
  // BGR-9: a value the group does not define renders as standard; development builds report it.
  const variant = closedValue(VARIANTS, variantProp, 'standard', 'ButtonGroup variant');
  const connected = variant === 'connected';
  const gap = connected ? tokens.connectedGap : tokens.standardGap;
  const items = Children.toArray(children);
  const count = items.length;
  const where = testID ? ` (testID "${testID}")` : '';

  // BGR-10: fewer than two items, or content that is not a Tanrei Button or icon button, still renders; development
  // builds report it.
  const strays = items.map((item, index) => (isItem(item) ? null : index + 1)).filter((n): n is number => n !== null);
  const reports = [
    ...(count < 2 ? [`Tanrei: a ButtonGroup${where} holds ${count} item${count === 1 ? '' : 's'}; a group holds two or more.`] : []),
    ...strays.map((n) => `Tanrei: item ${n} of a ButtonGroup${where} is not a Tanrei Button or IconButton; the group lays it out but cannot set its corners or its target.`),
  ].join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // BGR-7: a row that still does not fit once its Buttons have narrowed is reported (development builds). The items'
  // laid-out widths, the gaps and the row's own width are compared after each layout pass.
  const widths = useRef(new Map<number, number>());
  const [overflow, setOverflow] = useState(false);
  const rowWidth = useRef<number | null>(null);
  const check = useCallback(() => {
    if (rowWidth.current === null || widths.current.size < count) return;
    let total = gap * Math.max(0, count - 1);
    for (let index = 0; index < count; index += 1) total += widths.current.get(index) ?? 0;
    setOverflow(total > rowWidth.current + 0.5);
  }, [count, gap]);
  const itemLayout = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => (event: LayoutChangeEvent) => {
        widths.current.set(index, event.nativeEvent.layout.width);
        check();
      }),
    [count, check],
  );
  useEffect(() => {
    for (const index of [...widths.current.keys()]) if (index >= count) widths.current.delete(index);
  }, [count]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      rowWidth.current = event.nativeEvent.layout.width;
      check();
      onLayout?.(event);
    },
    [check, onLayout],
  );
  useEffect(() => {
    if (__DEV__ && overflow) console.warn(`Tanrei: a ButtonGroup${where} does not fit its row even with its Buttons narrowed; it never wraps or scrolls. Give it more width or fewer items.`);
  }, [overflow, where]);

  // BGR-1 … BGR-4, BGR-8, BGR-11: what each item is told, by its place in the row (logical: React Native mirrors the row
  // and the corners in right-to-left). Recomputed on every render, so an item added, removed or disabled changes the
  // corners at once, without motion.
  const target = theme.system.measure.target.touch;
  const values = useMemo(
    () =>
      items.map(
        (item, index): GroupItem => ({
          alignSelf: connected ? 'stretch' : 'center',
          innerStart: connected && index > 0 ? tokens.connectedInnerShape : null,
          innerEnd: connected && index < count - 1 ? tokens.connectedInnerShape : null,
          minWidth: connected ? target : 0,
          reachStart: index > 0 ? gap / 2 : null,
          reachEnd: index < count - 1 ? gap / 2 : null,
          shrinks: shrinks(item),
          onLayout: itemLayout[index]!,
        }),
      ),
    // `items` is a new array each render; what the values depend on is its length and each item's type.
    [items.map((item) => (shrinks(item) ? 'b' : 'i')).join(''), connected, count, tokens.connectedInnerShape, target, gap, itemLayout],
  );

  const row: ViewStyle = { alignSelf: 'flex-start', flexDirection: 'row', flexWrap: 'nowrap', alignItems: connected ? 'stretch' : 'center', gap };
  // BGR-6: named by its label, a group that contains its items; without a label, no element of its own.
  const named = Boolean(accessibilityLabel?.trim());
  return (
    <View {...rest} ref={ref} onLayout={handleLayout} {...(named ? { role: 'group' as const, accessibilityLabel } : null)} style={[row, style]} testID={testID}>
      {items.map((item, index) => (
        <GroupItemContext.Provider key={isValidElement(item) && item.key != null ? item.key : index} value={values[index]!}>
          {item}
        </GroupItemContext.Provider>
      ))}
    </View>
  );
}
