import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * How long typed characters add up to one typeahead search (LST-15, MNU-7: "within one second of each other"). A
 * behaviour of the spec, not a design value: no system re-values it.
 */
export const TYPEAHEAD_WINDOW = 1000;

/** What a key event carries on a renderer that delivers one (`onKeyDown`, a View prop React Native's types do not list yet). */
export interface KeyDownEvent {
  nativeEvent: { key: string };
  preventDefault?: () => void;
}

/** A node focus can be moved to: any host view. */
export interface FocusableNode {
  focus?: () => void;
}

export interface RovingFocusOptions {
  /** The text each item starts with, for typeahead (a list item's headline, a menu item's label); `null`: the item takes no focus. */
  labels: readonly (string | null)[];
  /** Up and Down Arrow wrap at the ends (a menu) or stop there (a list). */
  wrap: boolean;
  /** The item that is the tab stop while none has had focus yet (the first selected option, else the first item that takes focus). */
  preferred: number;
  /** The caller's own `onKeyDown`, called first. */
  onKeyDown?: (event: KeyDownEvent) => void;
  /**
   * The axis the arrow keys move along: `vertical` (Down / Up Arrow: a list, a menu; the default) or `horizontal`
   * (Right / Left Arrow: tabs), where `rtl` swaps them so that the key pointing to the next item moves to it, or
   * `both` (a segmented button, SEG-18: Right and Down Arrow move to the next item, Left and Up Arrow to the previous
   * one; `rtl` swaps Left and Right only).
   */
  orientation?: 'vertical' | 'horizontal' | 'both';
  rtl?: boolean;
  /** Printable characters move to the item whose text begins with them (a list, a menu; the default). */
  typeahead?: boolean;
  /**
   * Which item is the tab stop: the one focused last (a list, a menu; the default) or always `preferred` (tabs: the
   * selected tab, whatever had focus before).
   */
  tabStopFollows?: 'focus' | 'preferred';
  /** Called when a key moves focus to item `index` (tabs select it: automatic activation). */
  onMove?: (index: number) => void;
}

export interface RovingFocus {
  /** The one item in the tab order: the item focused last, else `preferred` (-1: none). */
  tabStop: number;
  /** The ref callback of item `index`'s host (focus is moved by calling `focus()` on it). */
  itemRef: (index: number) => (node: FocusableNode | null) => void;
  /** Call from item `index`'s `onFocus`: it becomes the tab stop. */
  itemFocused: (index: number) => void;
  /** Moves focus to item `index` (and makes it the tab stop). */
  focusItem: (index: number) => void;
  /** Spread on the container: Up / Down Arrow, Home / End and typeahead. */
  onKeyDown: (event: KeyDownEvent) => void;
}

/**
 * The keyboard model of a column of items that is ONE tab stop (a list with interactive items or options, LST-15; an
 * open menu, MNU-7): only the tab stop is focusable; Down and Up Arrow move focus to the next and previous item that
 * takes focus (disabled ones included: they are reachable, not activatable), wrapping or not; Home and End to the first
 * and last; printable characters typed within `TYPEAHEAD_WINDOW` of each other to the next item whose text begins
 * with them (case-insensitive). Moving focus never activates or selects: Space and Enter reach the focused
 * `Pressable` as its own click. Key events arrive where the renderer delivers them (a hardware keyboard).
 */
export function useRovingFocus({ labels, wrap, preferred, onKeyDown: callerKeyDown, orientation = 'vertical', rtl = false, typeahead = true, tabStopFollows = 'focus', onMove }: RovingFocusOptions): RovingFocus {
  const [last, setLast] = useState<number | null>(null);
  const nodes = useRef(new Map<number, FocusableNode>());
  const refs = useRef(new Map<number, (node: FocusableNode | null) => void>());
  // Focus is moved after the render that made the target focusable.
  const [pending, setPending] = useState<{ index: number } | null>(null);
  const typed = useRef({ text: '', at: -Infinity });

  const focusable = labels.map((label) => label !== null);
  const count = labels.length;
  // An item removed since it was focused: fall back to the preferred one.
  const tabStop = tabStopFollows === 'focus' && last !== null && last < count && focusable[last] ? last : preferred;

  const itemRef = useCallback((index: number) => {
    let ref = refs.current.get(index);
    if (!ref) {
      ref = (node: FocusableNode | null) => {
        if (node) nodes.current.set(index, node);
        else nodes.current.delete(index);
      };
      refs.current.set(index, ref);
    }
    return ref;
  }, []);
  const itemFocused = useCallback((index: number) => setLast(index), []);
  const focusItem = useCallback((index: number) => {
    setLast(index);
    setPending({ index });
  }, []);

  useEffect(() => {
    if (pending === null) return;
    nodes.current.get(pending.index)?.focus?.();
  }, [pending]);

  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      callerKeyDown?.(event);
      const order = focusable.flatMap((takes, index) => (takes ? [index] : []));
      if (order.length === 0) return;
      const at = order.indexOf(tabStop);
      const { key: pressed } = event.nativeEvent;
      // One vocabulary below: ArrowDown moves to the next item, ArrowUp to the previous one.
      const horizontal: Record<string, string> = rtl ? { ArrowLeft: 'ArrowDown', ArrowRight: 'ArrowUp' } : { ArrowRight: 'ArrowDown', ArrowLeft: 'ArrowUp' };
      const key =
        orientation === 'horizontal' ? (pressed === 'ArrowDown' || pressed === 'ArrowUp' ? '' : horizontal[pressed] ?? pressed) : orientation === 'both' ? horizontal[pressed] ?? pressed : pressed;
      let next: number | undefined;
      if (key === 'ArrowDown') next = at < 0 ? order[0] : wrap ? order[(at + 1) % order.length] : order[Math.min(at + 1, order.length - 1)];
      else if (key === 'ArrowUp') next = at < 0 ? order[order.length - 1] : wrap ? order[(at - 1 + order.length) % order.length] : order[Math.max(at - 1, 0)];
      else if (key === 'Home') next = order[0];
      else if (key === 'End') next = order[order.length - 1];
      else if (typeahead && key.length === 1) {
        // Typeahead: a new search starts after the current item; a longer one keeps matching from it. A Space that does
        // not continue a search is the activation key (the focused Pressable's own click).
        const now = Date.now();
        const continues = now - typed.current.at <= TYPEAHEAD_WINDOW;
        if (key === ' ' && !continues) return;
        const text = continues ? typed.current.text + key.toLowerCase() : key.toLowerCase();
        typed.current = { text, at: now };
        const from = at < 0 ? 0 : text.length === 1 ? at + 1 : at;
        for (let step = 0; step < order.length; step += 1) {
          const index = order[(from + step) % order.length]!;
          if ((labels[index] ?? '').trim().toLowerCase().startsWith(text)) {
            next = index;
            break;
          }
        }
        if (next === undefined) return;
      } else return;
      event.preventDefault?.();
      if (next !== undefined) {
        focusItem(next);
        onMove?.(next);
      }
    },
    // `focusable` and `order` derive from `labels`.
    [callerKeyDown, labels, tabStop, wrap, focusItem, orientation, rtl, typeahead, onMove],
  );

  return { tabStop, itemRef, itemFocused, focusItem, onKeyDown };
}
