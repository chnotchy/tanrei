import { createContext, useContext } from 'react';
import type { Insets, LayoutChangeEvent } from 'react-native';

// The internal channel between a ButtonGroup and the Buttons and IconButtons in it (BGR-1 … BGR-4, BGR-7; BTN-10 and
// ICB-10: "through an internal channel that is not part of its public surface"). The group provides one value per item;
// an item outside a group reads null and draws exactly as it always did. Package-internal: not exported by src/index.ts.

/** Logical corner radii of an item whose corners differ: its own at the outer ends, the group's where it meets a neighbour. */
export interface ItemCorners {
  topStart: number;
  topEnd: number;
  bottomStart: number;
  bottomEnd: number;
}

export interface GroupItem {
  /** Where the item sits across the row: centred on its middle (standard) or stretched to the tallest item (connected). */
  alignSelf: 'center' | 'stretch';
  /**
   * Connected (BGR-2): the radius of the corners on the item's start side, which faces the previous item; null where the
   * item keeps its own corners (the first item's start, a standard group).
   */
  innerStart: number | null;
  /** …and on its end side, which faces the next item; null for the last item and in a standard group. */
  innerEnd: number | null;
  /** Connected (BGR-3): the item is at least this wide (an icon button widens its container around its icon). 0: its own width. */
  minWidth: number;
  /**
   * BGR-3 / BGR-4: how far the item's hit area may reach toward a neighbour — half the gap, so that a press between two
   * items goes to the nearer one and never over a neighbour's visible bounds. null: no neighbour on that side.
   */
  reachStart: number | null;
  reachEnd: number | null;
  /** BGR-7: the item narrows (a Button, whose label wraps) when the row does not fit; an icon button keeps its size. */
  shrinks: boolean;
  /** The item's laid-out box, for the group's "still does not fit" report (BGR-7). */
  onLayout: (event: LayoutChangeEvent) => void;
}

export const GroupItemContext = createContext<GroupItem | null>(null);

/** The group this item is in, or null: an item outside a group draws as it always did. */
export function useGroupItem(): GroupItem | null {
  return useContext(GroupItemContext);
}

/** BGR-2: the item's corners — its own (`own`, the state's container shape) outside, the group's inner shape toward a neighbour. Null when none differs. */
export function groupCorners(group: GroupItem | null, own: number): ItemCorners | null {
  if (!group || (group.innerStart === null && group.innerEnd === null)) return null;
  const start = group.innerStart ?? own;
  const end = group.innerEnd ?? own;
  return { topStart: start, bottomStart: start, topEnd: end, bottomEnd: end };
}

/** A view's style for `corners`: logical radii, which React Native mirrors in right-to-left (BGR-8). */
export function cornerRadii(corners: ItemCorners) {
  return { borderTopStartRadius: corners.topStart, borderTopEndRadius: corners.topEnd, borderBottomStartRadius: corners.bottomStart, borderBottomEndRadius: corners.bottomEnd };
}

/**
 * A `hitSlop` whose logical start and end are held to `reachStart` / `reachEnd` (null: as it is) — `hitSlop` is physical,
 * so `rtl` mirrors them. Two neighbours that each hold their facing side to half the gap between them never overlap
 * (BGR-4, SPB-6).
 */
export function holdReach(slop: Insets, reachStart: number | null, reachEnd: number | null, rtl: boolean): Insets {
  const start = rtl ? 'right' : 'left';
  const end = rtl ? 'left' : 'right';
  const hold = (value: number | undefined, reach: number | null) => (reach === null ? value : Math.min(value ?? 0, reach));
  return { ...slop, [start]: hold(slop[start], reachStart), [end]: hold(slop[end], reachEnd) };
}

/** BGR-3 / BGR-4: the item's `hitSlop` with its sides toward a neighbour held to `reach`. */
export function groupHitSlop(slop: Insets, group: GroupItem | null, rtl: boolean): Insets {
  return group ? holdReach(slop, group.reachStart, group.reachEnd, rtl) : slop;
}
