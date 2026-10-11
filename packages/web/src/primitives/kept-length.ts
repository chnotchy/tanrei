import { type CSSResult, unsafeCSS } from 'lit';

// A row of controls that stand close together (SRC-34: a search bar's action buttons; TBR-16: a floating toolbar's
// items). The row lays them a gap apart, measured between their visible bounds, and moves two neighbours further apart
// only as far as each needs in order to keep, centred on itself, a length of `sys.target.touch` along the row that its
// neighbour's does not reach into: controls this close cannot extend a hit area over each other (as BGR-3). So the
// space between two neighbours is
//
//   max(gap, lack(a) + lack(b))      where lack(x) = max(0, (sys.target.touch − x's length) / 2)
//
// — with a gap of 0, two medium Buttons (40) stand 8 apart, a small one (32) and a medium one 12, and two that are at
// least the target long touch. Nothing is widened, resized or restyled, and it is the touch target for every pointer, so
// the row does not change with the input type.
//
// CSS cannot see a neighbour's length, nor an element's own from a rule of its parent's. So there are two halves:
//
//  - `KeptLengths` measures (a ResizeObserver, as GroupItemController measures a joined item's height) and writes on
//    each element of the row, as custom properties: its own length along the row (`--tanrei-kept-length`), and — on
//    every element that follows another — a flag (`--tanrei-kept-follows: 1`) and the length of the one before it
//    (`--tanrei-kept-before`). Lengths only: no token is read in script, so nothing can go stale when the design
//    system, the gap or the target changes.
//  - `keptLength()` is the rule that reads them: the space above as the element's margin toward the one before it.
//    The row's own `gap` between these elements is 0 (the gap token is inside the margin). Until the lengths arrive
//    the space is the gap.
//
// An internal contract between a Tanrei element and what it lays out, not a styling API.

const LENGTH = '--tanrei-kept-length';
const BEFORE = '--tanrei-kept-before';
const FOLLOWS = '--tanrei-kept-follows';
const PROPERTIES = [LENGTH, BEFORE, FOLLOWS] as const;

const TOUCH = 'var(--tanrei-sys-target-touch)';
/** Half of what a length lacks of the touch target; nothing where it is not known yet. */
const lack = (length: string) => `max(0px, calc((${TOUCH} - var(${length}, ${TOUCH})) / 2))`;

/**
 * The space between an element of the row (`selector`) and the one before it: `gap` (a length expression — the row's
 * gap token), or as much more as the two need to keep their targets apart. Along the inline axis, or — `block` — a
 * column. The first element of the row gets none.
 */
export function keptLength(selector: string, { gap, axis = 'inline' }: { gap: string; axis?: 'inline' | 'block' }): CSSResult {
  return unsafeCSS(`
  ${selector} {
    margin-${axis}-start: calc(var(${FOLLOWS}, 0) * max(${gap}, calc(${lack(LENGTH)} + ${lack(BEFORE)})));
  }
`);
}

/** Rounded to a hundredth of a pixel, so that a measurement that did not change writes nothing. */
const hundredths = (value: number) => Math.round(value * 100) / 100;

/** What a host does once lengths were written: it may read at once and hand back what it then writes. */
type Changed = () => (() => void) | void;

/**
 * One observer for every row of the page. It is told of all the elements whose length changed after a layout; every
 * row writes its lengths, then every host whose row changed READS what follows from them (`changed`), and only then
 * do the hosts write what they read — so the rows of a page cost one layout between them, not one for each host
 * (fifty number fields drawn at once: fifty layouts, each field measuring its steppers after writing their lengths).
 */
const rows = new WeakMap<Element, KeptLengths>();
const observer =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        const told = new Set<KeptLengths>();
        for (const entry of entries) {
          const row = rows.get(entry.target);
          if (!row) continue;
          row.took(entry);
          told.add(row);
        }
        const writes = [...told].filter((row) => row.write()).map((row) => row.changed?.());
        for (const write of writes) write?.();
      });

/**
 * The measuring half: give it the row — its elements in the order they are laid out — with `set()`, again whenever the
 * row or its axis changes, and `clear()` when the host leaves the page. An element that takes no room (hidden) is no
 * one's neighbour. `changed` is called after lengths were written, for a host that measures what follows from them:
 * it reads there and then, and returns what it writes — the writes of every host follow the reads of them all.
 */
export class KeptLengths {
  private row: HTMLElement[] = [];
  private axis: 'inline' | 'block' = 'inline';
  private readonly lengths = new Map<HTMLElement, number>();

  constructor(readonly changed?: Changed) {}

  set(row: readonly HTMLElement[], axis: 'inline' | 'block' = 'inline') {
    if (axis === this.axis && row.length === this.row.length && row.every((element, i) => element === this.row[i])) return;
    for (const element of this.row) if (!row.includes(element)) this.forget(element);
    const before = this.row;
    this.row = [...row];
    if (axis !== this.axis) this.lengths.clear();
    // Every element of the row is reported anew, as a row given to an observer of its own was.
    for (const element of before) this.unobserve(element);
    this.axis = axis;
    if (!row.length || !observer) return;
    for (const element of this.row) {
      rows.set(element, this);
      observer.observe(element);
    }
    this.write();
  }

  /** The observer's report of one element of the row. */
  took(entry: ResizeObserverEntry) {
    const box = entry.borderBoxSize?.[0];
    const rect = box ? null : entry.target.getBoundingClientRect();
    const length = this.axis === 'block' ? (box?.blockSize ?? rect?.height ?? 0) : (box?.inlineSize ?? rect?.width ?? 0);
    this.lengths.set(entry.target as HTMLElement, hundredths(length));
  }

  private unobserve(element: HTMLElement) {
    if (rows.get(element) !== this) return;
    rows.delete(element);
    observer?.unobserve(element);
  }

  clear() {
    this.set([], this.axis);
  }

  private forget(element: HTMLElement) {
    this.lengths.delete(element);
    for (const property of PROPERTIES) element.style.removeProperty(property);
  }

  /** What each element reads, written where it differs; whether anything was written. */
  write() {
    let wrote = false;
    const put = (element: HTMLElement, property: string, value: string | null) => {
      if (element.style.getPropertyValue(property) === (value ?? '')) return;
      if (value === null) element.style.removeProperty(property);
      else element.style.setProperty(property, value);
      wrote = true;
    };
    const px = (element: HTMLElement) => (this.lengths.has(element) ? `${this.lengths.get(element)}px` : null);
    let before: HTMLElement | null = null;
    for (const element of this.row) {
      // An element that takes no room is not laid out: it keeps nothing and is no one's neighbour.
      if (this.lengths.get(element) === 0) {
        for (const property of PROPERTIES) put(element, property, null);
        continue;
      }
      put(element, LENGTH, px(element));
      put(element, FOLLOWS, before ? '1' : null);
      put(element, BEFORE, before ? px(before) : null);
      before = element;
    }
    return wrote;
  }
}
