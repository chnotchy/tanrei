import { type CSSResult, unsafeCSS } from 'lit';
import { TARGET_CAPS } from './target.js';

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
//        the page's reach. `KeptLengths` reads the box's elements from the box itself, as it lays them out: what its
//        slot holds flattened (a product's own slot may forward its children to it), an element of `display:
//        contents` opened (the elements it holds are the box's, and spaced as they are), text among them included —
//        a spacer's cell counts the cells of the other items, so the space stands right before its element wherever
//        text stands. While it keeps such spaces it watches what the box lays out (a MutationObserver), so text that
//        comes, changes or goes, and elements written into an element of `display: contents`, move the spacers at
//        once, though the slot's own content did not change.
//    The row's own `gap` between these elements is 0 (the gap token is inside the margin or the spacer). Until the
//    lengths arrive a spacer is the gap and a margin is none.
//
// An internal contract between a Tanrei element and what it lays out, not a styling API.

const LENGTH = '--tanrei-kept-length';
const BEFORE = '--tanrei-kept-before';
const FOLLOWS = '--tanrei-kept-follows';
const PROPERTIES = [LENGTH, BEFORE, FOLLOWS] as const;
const CAP = TARGET_CAPS.start;

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
const drawnText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE && /[^ \t\n\r\f]/.test((node as Text).data);

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

/** What a box lays out, in its order: one of the row's elements, a run of text, or another item (`'other'`). */
type Item = HTMLElement | 'text' | 'other';
/**
 * What a box lays out, as it was read: every element it lays out (an element of `display: contents` is opened, so the
 * elements it holds are counted and it is not), and every text that is not only white space, each in its order.
 */
export interface LaidOut {
  readonly elements: readonly Element[];
  readonly texts: readonly Text[];
}
/** What a host does with what its box lays out: read again whatever brought it there (a slotchange, a resize, a change the box watches). */
type Read = (laidOut: LaidOut) => void;
/** What a change is watched for: a run of text's data, the children an element (or a slot's host) holds, or all it holds. */
type Watch = { node: Node; options: MutationObserverInit };
const TEXT_DATA: MutationObserverInit = { characterData: true };
const CHILDREN: MutationObserverInit = { childList: true };
const EVERYTHING: MutationObserverInit = { childList: true, characterData: true, subtree: true };

/**
 * The measuring half: give it the host's own elements of the row — in the order they are laid out — with `set()`,
 * again whenever they or the axis change, and `clear()` when the host leaves the page. An element that takes no room
 * (hidden) is no one's neighbour. `changed` is called after lengths were written, for a host that measures what follows
 * from them: it reads there and then, and returns what it writes — the writes of every host follow the reads of them
 * all. `spaces` is the box of the host's that `keptSpaces()` lays out: the elements it lays out follow the host's in
 * the row, read from the box itself (`set()` reads it again, and so does any change of what it lays out); the space
 * before each is a spacer of the box's, and nothing of the row is written on the product's element. `cap`, with a box,
 * is how far the first element the box lays out may reach toward the row's start (BTN-5) where none of the host's
 * elements stands before it: written as that element's `TARGET_CAPS.start`, and taken off when another one is first.
 * `laidOut`, with a box, is told what the box lays out after every read of it that found something else than the read
 * before (each element and the text of each run): one place for a host to look at all of it, whatever brought it — a
 * slotchange, or a change only the box watches (a run's text, what an element of `display: contents` holds).
 */
export class KeptLengths {
  /** The host's own elements, as `set()` gave them. */
  private given: HTMLElement[] = [];
  /** Every element observed: the host's, then the elements the box holds (those it lays out, and those it opens or hides). */
  private row: HTMLElement[] = [];
  private axis: 'inline' | 'block' = 'inline';
  private readonly lengths = new Map<HTMLElement, number>();
  private readonly spacers: HTMLElement[] = [];
  /** What the box lays out, in order, as it was read last. */
  private items: Item[] = [];
  /** The elements the box holds, laid out or not. */
  private held = new Set<HTMLElement>();
  /** The product's elements that carry the cap, each with the cap it had of its own before (`''`: none). */
  private readonly capped = new Map<HTMLElement, string>();
  private mutations: MutationObserver | null = null;
  private watched: Watch[] = [];
  /** What `laidOut` was told last: the elements, and each run's text. */
  private told: { elements: readonly Element[]; texts: readonly string[] } = { elements: [], texts: [] };

  constructor(
    readonly changed?: Changed,
    private readonly spaces?: () => HTMLElement | null,
    private readonly cap?: string,
    private readonly laidOut?: Read,
  ) {}

  set(row: readonly HTMLElement[], axis: 'inline' | 'block' = 'inline') {
    if (axis === this.axis && row.length === this.given.length && row.every((element, i) => element === this.given[i])) {
      // The same elements of the host's; what the box lays out may have changed (the slot's content): it is read again.
      if (this.spaces && observer) this.write();
      return;
    }
    const before = this.row;
    if (axis !== this.axis) this.lengths.clear();
    this.given = [...row];
    this.axis = axis;
    // Every element of the row is reported anew, as a row given to an observer of its own was.
    for (const element of before) this.unobserve(element);
    this.row = [];
    if (observer) this.write();
    else this.place([]);
    for (const element of before) if (!this.row.includes(element)) this.forget(element);
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
    for (const element of this.row) {
      this.unobserve(element);
      this.forget(element);
    }
    this.given = [];
    this.row = [];
    this.items = [];
    this.held = new Set();
    this.told = { elements: [], texts: [] };
    this.watch([]);
    this.place([]);
  }

  private forget(element: HTMLElement) {
    this.lengths.delete(element);
    for (const property of PROPERTIES) element.style.removeProperty(property);
    if (this.capped.has(element)) {
      const own = this.capped.get(element)!;
      this.capped.delete(element);
      if (own) element.style.setProperty(CAP, own);
      else element.style.removeProperty(CAP);
    }
  }

  /** The row read again (what the box lays out), what each element reads written where it differs; whether anything was written. */
  write() {
    const box = this.spaces?.() ?? null;
    this.read(box);
    let wrote = false;
    const put = (element: HTMLElement, property: string, value: string | null) => {
      if (element.style.getPropertyValue(property) === (value ?? '')) return;
      if (value === null) element.style.removeProperty(property);
      else element.style.setProperty(property, value);
      wrote = true;
    };
    const px = (element: HTMLElement) => (this.lengths.has(element) ? `${this.lengths.get(element)}px` : null);
    let before: HTMLElement | null = null;
    // The host's own elements: the space before each is its margin, flagged.
    for (const element of this.given) {
      if (this.held.has(element)) continue;
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
    // The box's: the spacers it needs, each in the cell right before its element (counted along the box, the cells of
    // the other items it lays out included) with the lengths of its two neighbours; the first element, where nothing of
    // the row stands before it, takes the cap.
    const spacers: Spacer[] = [];
    let first: HTMLElement | null = null;
    let cell = 0;
    for (const item of this.items) {
      if (typeof item !== 'string' && this.lengths.get(item) !== 0) {
        if (before) spacers.push({ cell: ++cell, length: px(item), before: px(before) });
        else first = item;
        before = item;
      }
      cell += 1;
    }
    for (const element of this.held) {
      for (const property of PROPERTIES) put(element, property, null);
      if (element === first && this.cap) {
        if (!this.capped.has(element)) this.capped.set(element, element.style.getPropertyValue(CAP));
        put(element, CAP, this.cap);
      } else if (this.capped.has(element)) {
        put(element, CAP, this.capped.get(element) || null);
        this.capped.delete(element);
      }
    }
    if (this.place(spacers, box, put)) wrote = true;
    return wrote;
  }

  /**
   * What the box lays out, read as it lays it out, and the row observed to match: the box's children, a slot giving way
   * to what it holds and an element of `display: contents` to what it holds, are its items — each element, each run of
   * text that is not only white space (the box makes one anonymous item of a run, as a product's slot forwards it or
   * an element of `display: contents` holds it), and anything else that takes a cell. An element's style is read only
   * where its length cannot tell. What a change of the slot's content would not announce is watched (`watch()`): the
   * runs of text, white space included, and what the elements of `display: contents` hold. Without a box the row is
   * the host's elements alone, and nothing is watched. What the box lays out goes to `laidOut` where it changed.
   */
  private read(box: HTMLElement | null) {
    const items: Item[] = [];
    const elements: Element[] = [];
    const texts: Text[] = [];
    const held = new Set<HTMLElement>();
    const watched: Watch[] = [];
    const root = box?.getRootNode();
    let text = false;
    /** `within`: the children are inside what is watched already (a subtree watched whole). */
    const walk = (children: Iterable<Node>, within: boolean) => {
      for (const node of children) {
        if (node instanceof HTMLSlotElement) {
          const own = node.getRootNode() === root;
          const assigned = node.assignedNodes();
          if (assigned.length) {
            // A slot of the product's own forwards its host's children: a change of which it forwards reaches the box's
            // slot as a slotchange, but the data of a run of text it forwards does not.
            const host = (node.getRootNode() as ShadowRoot).host;
            if (!own && host) watched.push({ node: host, options: CHILDREN });
            walk(assigned, false);
          } else {
            if (!own && !within) watched.push({ node, options: EVERYTHING });
            walk(node.childNodes, true);
          }
        } else if (node instanceof Text) {
          if (!within) watched.push({ node, options: TEXT_DATA });
          if (!drawnText(node)) continue;
          texts.push(node);
          if (!text) items.push('text');
          text = true;
        } else if (node instanceof Element && !this.spacers.includes(node as HTMLElement)) {
          const element = node instanceof HTMLElement ? node : null;
          if (element) held.add(element);
          const display = element && this.lengths.get(element) ? null : getComputedStyle(node).display;
          if (display === 'none') continue;
          if (display === 'contents') {
            // What it holds is laid out in its place, and may change without a slotchange.
            const inside = node.shadowRoot ?? node;
            if (node.shadowRoot || !within) watched.push({ node: inside, options: EVERYTHING });
            walk(inside.childNodes, true);
            continue;
          }
          items.push(element ?? 'other');
          elements.push(node);
          text = false;
        }
      }
    };
    if (box) walk(box.childNodes, false);
    this.items = items;
    // The row: the host's elements the box does not hold, then the box's — each one observed once.
    const row = [...this.given.filter((element) => !held.has(element)), ...held];
    for (const element of this.row) {
      if (row.includes(element)) continue;
      this.unobserve(element);
      this.forget(element);
    }
    for (const element of row) {
      if (rows.get(element) === this) continue;
      rows.set(element, this);
      observer?.observe(element);
    }
    this.row = row;
    this.held = held;
    this.watch(watched);
    if (box && this.laidOut) this.tell(elements, texts);
  }

  /** What the box lays out, told to `laidOut` where it is not what was told last. */
  private tell(elements: readonly Element[], texts: readonly Text[]) {
    const data = texts.map((node) => node.data);
    const told = this.told;
    if (elements.length === told.elements.length && elements.every((element, i) => element === told.elements[i]) && data.length === told.texts.length && data.every((d, i) => d === told.texts[i])) return;
    this.told = { elements, texts: data };
    this.laidOut!({ elements, texts });
  }

  /**
   * What the box lays out, watched while there are spaces to keep (only a host with a box has any), so a change the
   * slot does not announce reads the box again. The watch is made again only when what is watched changes.
   */
  private watch(watched: Watch[]) {
    if (watched.length === this.watched.length && watched.every((w, i) => w.node === this.watched[i].node && w.options === this.watched[i].options)) return;
    this.watched = watched;
    this.mutations?.disconnect();
    if (!watched.length || typeof MutationObserver === 'undefined') return;
    this.mutations ??= new MutationObserver(() => {
      if (this.write()) this.changed?.()?.();
    });
    for (const { node, options } of watched) this.mutations.observe(node, options);
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
