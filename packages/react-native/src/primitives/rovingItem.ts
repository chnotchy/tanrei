import { createContext, useCallback, useContext, type Ref } from 'react';
import type { Insets, LayoutChangeEvent, NativeSyntheticEvent, TargetedEvent } from 'react-native';
import { holdReach } from './groupItem';
import type { FocusableNode } from './rovingFocus';

// The internal channel between a container that is ONE Tab stop over items that are other components (a Toolbar over
// its IconButtons and Buttons, TBR-10) and those items. The container provides one value per item; an item outside such
// a container reads null and is its own Tab stop exactly as it always was. Package-internal: not exported by
// src/index.ts. (A container that draws its own items — tabs, a list, a menu — needs no channel: it wires them itself.)

export interface RovingItem {
  /** Where the item sits across the container's axis (TBR-2, TBR-4: centered), in place of its own `flex-start`. */
  alignSelf: 'center';
  /** The item is the container's Tab stop: the only focusable one. The others take focus from the arrow keys only. */
  tabStop: boolean;
  /** The item's host, for the container to move focus to (`useRovingFocus().itemRef(index)`). */
  ref: (node: FocusableNode | null) => void;
  /** The item took focus: it becomes the Tab stop, and the container brings it into view. */
  onFocus: () => void;
  /** The item's laid-out box in the container's content, to bring it into view. */
  onLayout: (event: LayoutChangeEvent) => void;
  /**
   * TBR-9: how far the item's hit area may reach toward the previous (`reachStart`) and the next item (`reachEnd`) — half
   * the gap between them, so that two neighbours' hit areas meet at the middle of the gap and never overlap (as BGR-4).
   * null: no neighbour on that side, where the item keeps its full target.
   */
  reachStart: number | null;
  reachEnd: number | null;
  /** The axis the items run along: the reach holds the item's start and end sides (horizontal) or its top and bottom (vertical). */
  axis: 'horizontal' | 'vertical';
}

export const RovingItemContext = createContext<RovingItem | null>(null);

/** The roving container this item is in, or null: an item outside one is its own Tab stop. */
export function useRovingItem(): RovingItem | null {
  return useContext(RovingItemContext);
}

/**
 * What an item hands `usePressInteraction` when it is in a roving container: the caller's ref and the container's, one
 * `onFocus` and one `onLayout` calling both. Outside one, the caller's own, unchanged (the same functions, so nothing
 * else changes).
 */
export function useRovingItemHandlers<Node>(
  roving: RovingItem | null,
  own: {
    ref?: Ref<Node>;
    onFocus?: ((event: NativeSyntheticEvent<TargetedEvent>) => void) | null;
    onLayout?: ((event: LayoutChangeEvent) => void) | null;
  },
) {
  const { ref, onFocus, onLayout } = own;
  const rovingRef = roving?.ref;
  const rovingFocus = roving?.onFocus;
  const rovingLayout = roving?.onLayout;
  const mergedRef = useCallback(
    (node: Node | null) => {
      rovingRef?.(node as FocusableNode | null);
      if (typeof ref === 'function') return ref(node);
      if (ref) (ref as { current: Node | null }).current = node;
      return undefined;
    },
    [ref, rovingRef],
  );
  const mergedFocus = useCallback(
    (event: NativeSyntheticEvent<TargetedEvent>) => {
      rovingFocus?.();
      onFocus?.(event);
    },
    [rovingFocus, onFocus],
  );
  const mergedLayout = useCallback(
    (event: LayoutChangeEvent) => {
      rovingLayout?.(event);
      onLayout?.(event);
    },
    [rovingLayout, onLayout],
  );
  if (!roving) return { ref, onFocus, onLayout };
  return { ref: mergedRef as Ref<Node>, onFocus: mergedFocus, onLayout: mergedLayout };
}

/** TBR-9: the item's `hitSlop` with its sides toward a neighbour held to half the gap (`hitSlop` is physical: `rtl` mirrors a row). */
export function rovingHitSlop(slop: Insets, roving: RovingItem | null, rtl: boolean): Insets {
  if (!roving) return slop;
  if (roving.axis === 'horizontal') return holdReach(slop, roving.reachStart, roving.reachEnd, rtl);
  const hold = (value: number | undefined, reach: number | null) => (reach === null ? value : Math.min(value ?? 0, reach));
  return { ...slop, top: hold(slop.top, roving.reachStart), bottom: hold(slop.bottom, roving.reachEnd) };
}
