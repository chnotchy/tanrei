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
//  - `KeptLengths` measures (a ResizeObserver, as GroupItemController measures a joined item's height) and writes
//    lengths as custom properties: an element's own length along the row (`--tanrei-kept-length`), and the length of
//    the one before it (`--tanrei-kept-before`). Lengths only: no token is read in script, so nothing can go stale
//    when the design system, the gap or the target changes.
//  - A rule reads them, in one of two places:
//      - `keptLength()`, for the elements of the host's own shadow tree (a number input's steppers): the space as the
//        element's margin toward the one before it, which `KeptLengths` flags with `--tanrei-kept-follows: 1`.
//      - `keptSpaces()`, for the product's elements, slotted into a box of the host's (a toolbar's items, a search
//        bar's trailing buttons): the box lays them out, and the space before each is an element of the box's own —
//        a spacer `KeptLengths` puts in the box, in the cell before that element's — never a margin on the product's
//        element. A page's rules beat the rules a shadow root gives what it slots (`::slotted()`), whatever their
//        layer, so a reset such as `* { margin: 0 }` would take such a margin away; the box and its spacers are out of
//        the page's reach. The box lays out what its slot holds as it is flattened (a product's own slot may forward
//        its children to it), text among the elements included: a spacer's cell counts the cells of those other
//        items, so the space stands right before its element wherever text stands.
//    The row's own `gap` between these elements is 0 (the gap token is inside the margin or the spacer). Until the
//    lengths arrive a spacer is the gap and a margin is none.
//
// An internal contract between a Tanrei element and what it lays out, not a styling API.

const LENGTH = '--tanrei-kept-length';
const BEFORE = '--tanrei-kept-before';
const FOLLOWS = '--tanrei-kept-follows';
const PROPERTIES = [LENGTH, BEFORE, FOLLOWS] as const;

const TOUCH = 'var(--tanrei-sys-target-touch)';
/** Half of what a length lacks of the touch target; nothing where it is not known yet. */
const lack = (length: string) => `max(0px, calc((${TOUCH} - var(${length}, ${TOUCH})) / 2))`;

const SPACER = 'data-tanrei-kept-space';
/** The space between two neighbours: `gap`, or as much more as the two need to keep their targets apart. */
const space = (gap: string) => `max(${gap}, calc(${lack(LENGTH)} + ${lack(BEFORE)}))`;

/**
 * The space between an element of the row (`selector`) and the one before it: `gap` (a length expression — the row's
 * gap token), or as much more as the two need to keep their targets apart. Along the inline axis, or — `block` — a
 * column. The first element of the row gets none. For elements of the host's own shadow tree only: a margin on an
 * element the product slotted is the page's to take away (`keptSpaces()` is for those).
 */
export function keptLength(selector: string, { gap, axis = 'inline' }: { gap: string; axis?: 'inline' | 'block' }): CSSResult {
  return unsafeCSS(`
  ${selector} {
    margin-${axis}-start: calc(var(${FOLLOWS}, 0) * ${space(gap)});
  }
`);
}

/**
 * The box (`selector`, an element of the host's shadow tree that holds the slot) lays the product's elements out along
 * the row — or, `block`, a column — each as long as it is, centred across the box, and the spacers `KeptLengths` puts in
 * it (`spaces`) between them: each one the space between its two neighbours. Give the same `gap` as the row's gap token.
 */
export function keptSpaces(selector: string, { gap, axis = 'inline' }: { gap: string; axis?: 'inline' | 'block' }): CSSResult {
  const along = axis === 'block' ? 'row' : 'column';
  const across = axis === 'block' ? 'column' : 'row';
  return unsafeCSS(`
  ${selector} {
    display: grid;
    grid-auto-flow: ${along};
    grid-auto-${along}s: max-content;
    grid-template-${across}s: 1fr;
    gap: 0;
    ${axis === 'block' ? 'justify-items' : 'align-items'}: center;
  }
  ${selector} > [${SPACER}] {
    grid-${across}-start: 1;
    ${axis === 'block' ? 'block-size' : 'inline-size'}: ${space(gap)};
    pointer-events: none;
  }
`);
}

/**
 * Whether a box lays this text out: a grid or a flex box draws a run of text that is not only white space as an
 * anonymous item of its own, and nothing for one that is. A product's slot that forwards its children to a box's slot
 * brings their text along, which no slot of a name takes otherwise.
 */
export const drawnText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE && /[^ \t\n\r\f]/.test((node as Text).data);

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
 * `spaces` is the box of the host's that `keptSpaces()` lays out: the space before each element slotted into it is a
 * spacer of the box's, and nothing is written on the product's element.
 */
export class KeptLengths {
  private row: HTMLElement[] = [];
  private axis: 'inline' | 'block' = 'inline';
  private readonly lengths = new Map<HTMLElement, number>();
  private readonly spacers: HTMLElement[] = [];

  constructor(
    readonly changed?: Changed,
    private readonly spaces?: () => HTMLElement | null,
  ) {}

  set(row: readonly HTMLElement[], axis: 'inline' | 'block' = 'inline') {
    if (axis === this.axis && row.length === this.row.length && row.every((element, i) => element === this.row[i])) {
      // The same row, but what else the box lays out among its elements (text) may have changed: the spacers' cells follow.
      if (this.spaces && this.row.length && observer) this.write();
      return;
    }
    for (const element of this.row) if (!row.includes(element)) this.forget(element);
    const before = this.row;
    this.row = [...row];
    if (axis !== this.axis) this.lengths.clear();
    // Every element of the row is reported anew, as a row given to an observer of its own was.
    for (const element of before) this.unobserve(element);
    this.axis = axis;
    if (!row.length || !observer) {
      this.place([]);
      return;
    }
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
    const box = this.spaces?.() ?? null;
    // The spacers the box needs: the cell each stands in (counted along the box, the cells of its elements and of the
    // other items it lays out included) and the lengths of its two neighbours.
    const others = box ? this.othersBefore(box) : null;
    const spacers: Spacer[] = [];
    let cell = 0;
    let counted = 0;
    let before: HTMLElement | null = null;
    for (const element of this.row) {
      // An element that takes no room is not laid out: it keeps nothing and is no one's neighbour.
      if (this.lengths.get(element) === 0) {
        for (const property of PROPERTIES) put(element, property, null);
        continue;
      }
      const ahead = others?.get(element);
      if (ahead !== undefined) {
        for (const property of PROPERTIES) put(element, property, null);
        cell += ahead - counted;
        counted = ahead;
        if (before) spacers.push({ cell: ++cell, length: px(element), before: px(before) });
        cell += 1;
      } else {
        put(element, LENGTH, px(element));
        put(element, FOLLOWS, before ? '1' : null);
        put(element, BEFORE, before ? px(before) : null);
      }
      before = element;
    }
    if (this.place(spacers, box, put)) wrote = true;
    return wrote;
  }

  /**
   * For each element of the row that the box lays out, how many of the box's other items come before it: an item that
   * is no element of the row's takes a cell of its own, which the spacers' cells must count. Such an item is a run of
   * text — the box makes one anonymous item of each run of text that is not only white space, as a product's slot
   * forwards it, or an element of `display: contents` holds it — or an element of the box that takes no length along
   * the row or that the row does not hold. The box's children are read as it lays them out: a slot, and an element of
   * `display: contents`, give way to what they hold. An element's style is read only where its length cannot tell.
   */
  private othersBefore(box: HTMLElement): Map<HTMLElement, number> {
    const before = new Map<HTMLElement, number>();
    const row = new Set(this.row);
    let others = 0;
    let text = false;
    const walk = (parent: Node) => {
      const children = parent instanceof HTMLSlotElement && parent.assignedNodes().length ? parent.assignedNodes() : ((parent as Element).shadowRoot ?? parent).childNodes;
      for (const node of children) {
        if (node instanceof HTMLSlotElement) walk(node);
        else if (node instanceof Text) {
          if (!drawnText(node)) continue;
          if (!text) others += 1;
          text = true;
        } else if (node instanceof Element && !this.spacers.includes(node as HTMLElement)) {
          const length = this.lengths.get(node as HTMLElement);
          if (row.has(node as HTMLElement) && length !== 0) {
            before.set(node as HTMLElement, others);
          } else {
            const display = getComputedStyle(node).display;
            if (display === 'none') continue;
            if (display === 'contents') {
              walk(node);
              continue;
            }
            others += 1;
          }
          text = false;
        }
      }
    };
    walk(box);
    return before;
  }

  /** The box's spacers made, placed and given their neighbours' lengths; the ones it no longer needs taken out. */
  private place(wanted: readonly Spacer[], box: HTMLElement | null = null, put?: (element: HTMLElement, property: string, value: string | null) => void): boolean {
    let changed = false;
    const along = this.axis === 'block' ? 'grid-row-start' : 'grid-column-start';
    const across = this.axis === 'block' ? 'grid-column-start' : 'grid-row-start';
    wanted.forEach((spacer, i) => {
      let element = this.spacers[i];
      if (!element) {
        element = document.createElement('span');
        element.setAttribute(SPACER, '');
        element.setAttribute('aria-hidden', 'true');
        this.spacers.push(element);
      }
      if (element.parentNode !== box) {
        box!.append(element);
        changed = true;
      }
      put!(element, along, String(spacer.cell));
      put!(element, across, null);
      put!(element, LENGTH, spacer.length);
      put!(element, BEFORE, spacer.before);
    });
    for (const element of this.spacers.splice(wanted.length)) {
      element.remove();
      changed = true;
    }
    return changed;
  }
}

/** A spacer of the box: the cell it stands in, and the lengths of the elements after and before it (null: not known yet). */
interface Spacer {
  cell: number;
  length: string | null;
  before: string | null;
}
