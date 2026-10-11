import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { partTestID } from './content';

// A container's actions (Tanrei Buttons in a slot): one row, or a column when the row does not fit — the
// dialog's (DLG-10, at the end) and the side sheet's (SSH-11, from the start). The buttons are laid out, never restyled.
// Package-internal.

/** The buttons of an actions slot, one by one: a fragment (`<>…</>`, the usual way to pass several) is looked into. */
export function actionItems(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? actionItems(child.props.children) : [child]));
}

export interface ActionRowProps {
  /** Where the row starts: the end (a dialog) or the start (a side sheet); a stacked column is aligned the same way. */
  align: 'start' | 'end';
  /** The space between neighbours, in the row and in the column. */
  gap: number;
  testID: string | undefined;
  children: ReactNode;
}

/**
 * The actions in one row, `gap` apart and in the order given; when their natural width (measured from each button's
 * own width, since a button never shrinks) is more than the row has, a column in the same order. Each button is wrapped
 * in a view `<testID>.<index>`.
 */
export function ActionRow({ align, gap, testID, children }: ActionRowProps) {
  const items = actionItems(children);
  const [available, setAvailable] = useState<number | null>(null);
  // Each button keeps its own width (it never shrinks), so the row's natural width is theirs and the gaps between.
  const [widths, setWidths] = useState<readonly (number | undefined)[]>([]);
  const count = items.length;
  useEffect(() => setWidths([]), [count]);
  const measured = widths.length === count && widths.every((width) => width !== undefined);
  const natural = measured ? (widths as number[]).reduce((sum, width) => sum + width, 0) + gap * Math.max(0, count - 1) : null;
  const stacked = available !== null && natural !== null && natural > available + 0.5;
  const onItemLayout = (index: number) => (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setWidths((previous) => {
      if (previous[index] === width) return previous;
      const next = [...previous];
      next[index] = width;
      return next;
    });
  };
  const edge = align === 'end' ? 'flex-end' : 'flex-start';
  return (
    <View
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
      style={stacked ? { flexDirection: 'column', alignItems: edge, gap } : { flexDirection: 'row', justifyContent: edge, gap }}
      testID={testID}
    >
      {items.map((item, index) => (
        <View key={index} style={{ flexShrink: 0 }} onLayout={onItemLayout(index)} testID={partTestID(testID, String(index))}>
          {item}
        </View>
      ))}
    </View>
  );
}
