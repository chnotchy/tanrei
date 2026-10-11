import { type PropertyDeclarations, type PropertyValues, ReactiveElement } from 'lit';
import { AvailabilityController, PressController, RovingKeys, findInteractive, lineArrow, report, styleQueries, syncFocusStyle } from '../../primitives/index.js';
import { PendingGlyphs, isGlyphProbe } from '../../primitives/glyph-pending.js';
import { debugBuild } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import type { TanreiTreeViewDensityRegistry } from '../../registry.js';
import '../loading-indicator/loading-indicator.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';

/** Whether people choose items: none (read and opened), single (one item), multiple (any number, each by itself). */
export type TanreiTreeViewSelection = 'none' | 'single' | 'multiple';
/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiTreeViewDensity = keyof TanreiTreeViewDensityRegistry;
/** What `change` carries: `value` while selection is single, `values` while it is multiple, after the change. */
export interface TanreiTreeViewChangeDetail {
  value?: string | null;
  values?: string[];
}
/** What an item's `toggle` carries: its new open state. */
export interface TanreiTreeViewToggleDetail {
  open: boolean;
}

// The text of src/styles/tree-view.css — the stylesheet that draws the tree — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. Read once; a build that wrote
// nothing leaves it empty, and the tree is then drawn by the page's own copy of `@tanrei/web/tree-view.css` alone.
declare const TANREI_TREE_VIEW_CSS: string;
const TREE_VIEW_CSS: string = (() => {
  try {
    return TANREI_TREE_VIEW_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-tree-view';
const PREFIX = '--tanrei-comp-tree-view';
const SELECTIONS: readonly string[] = ['none', 'single', 'multiple'];
const CORE_DENSITIES: readonly string[] = ['regular', 'compact'];
const DEFAULT_DENSITY = 'regular';
/** The members of the density axis (`dev.tanrei.axes.density.members`) as tree-view.css names them. */
const DENSITY_MEMBERS: readonly (readonly [string, string])[] = [
  ['--_trv-height', 'container-height-*'],
  ['--_trv-pad-block', 'container-padding-block-*'],
  ['--_trv-pad-inline', 'container-padding-inline-*'],
  ['--_trv-gap', 'container-gap-*'],
  ['--_trv-indent', 'level-indent-*'],
  ['--_trv-label-font', 'label-typescale-*-font'],
  ['--_trv-label-tracking', 'label-typescale-*-letter-spacing'],
  ['--_trv-icon-size', 'icon-size-*'],
  ['--_trv-chevron-size', 'chevron-size-*'],
];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** What the element writes on the product's lists and items (tree-view.css reads each). */
const MOVING = 'data-tanrei-moving';
const AT_ONCE = 'data-tanrei-at-once';
const LEAF = 'data-tanrei-leaf';
const LOADING = 'data-tanrei-loading';
const OWN_LIST = 'data-tanrei-loading-list';
/** The parts of a row that are not its label. */
const PARTS = '.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text], [data-tanrei-loading-box], .ripple';
/** What an item says: a change of any is read again. */
const ITEM_ATTRIBUTES = ['data-open', 'data-value', 'data-disabled', 'data-loading', 'data-expandable'];

type Root = Document | ShadowRoot;
type Item = HTMLLIElement;

const sheets = new Map<string, CSSStyleSheet>();
/** A stylesheet of the page, made once and shared by every root that needs it. */
function sheet(id: string, text: () => string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === 'undefined') return null;
  let made = sheets.get(id);
  if (!made) {
    made = new CSSStyleSheet();
    try {
      made.replaceSync(text());
    } catch {
      // A browser that cannot construct it: the page's own copy of tree-view.css draws the tree.
    }
    sheets.set(id, made);
  }
  return made;
}

/**
 * The two lengths the element reads as the cascade computes them: tree-view.css says them in `object-position` on
 * the tree — a real property, which computes a token's expression to a length and draws nothing on an element that
 * is not a replaced one — the indent of one level first, the least width of a chevron's hit area second. (No custom property
 * of the stylesheet is registered: src/styles/registered-properties.ts.)
 */
function treeLengths(tree: Element): { indent: number; target: number } {
  const [indent, target] = getComputedStyle(tree)
    .objectPosition.split(/\s+/)
    .map((length) => (length.endsWith('px') ? Number.parseFloat(length) : Number.NaN));
  return { indent: indent ?? Number.NaN, target: target ?? Number.NaN };
}

/** TRV-41: a density a design system added — the default's rules, read from that density's tokens. */
const densityRules = (density: string) =>
  `@layer tanrei.components { :where(${TAG}[density='${density}']) { ${DENSITY_MEMBERS.map(
    ([name, token]) => `${name}: var(${PREFIX}-${token.replace('*', density)}, var(${PREFIX}-${token.replace('*', DEFAULT_DENSITY)}));`,
  ).join(' ')} } }`;

/** Writes an attribute only when it differs: what is written here may be observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Whether the browser's find-in-page looks into a closed list and says so (`hidden="until-found"`, TRV-14). */
const UNTIL_FOUND = typeof HTMLElement !== 'undefined' && 'onbeforematch' in HTMLElement.prototype;

const isList = (node: EventTarget | null | undefined): node is HTMLElement => node instanceof HTMLElement && (node.localName === 'ul' || node.localName === 'ol');
/** An item: an `<li>` of the product's. The loading row is an `<li>` of the element's own and is not one (TRV-13). */
const isItem = (node: EventTarget | null | undefined): node is Item => node instanceof HTMLLIElement && !node.hasAttribute(LOADING);
/** An item's row: its first child element, where that is not a list. */
const rowOf = (item: Element): HTMLElement | null => {
  const first = item.firstElementChild;
  return first instanceof HTMLElement && !isList(first) ? first : null;
};
/** The list an item holds: the product's own, or else the one the element made for a loading row. */
function listOf(item: Element): HTMLElement | null {
  let own: HTMLElement | null = null;
  for (let child = item.firstElementChild; child; child = child.nextElementSibling) {
    if (!isList(child)) continue;
    if (!child.hasAttribute(OWN_LIST)) return child;
    own = child;
  }
  return own;
}
const firstItem = (list: Element | null): Item | null => {
  for (let child = list?.firstElementChild; child; child = child.nextElementSibling) if (isItem(child)) return child;
  return null;
};
const lastItem = (list: Element | null): Item | null => {
  for (let child = list?.lastElementChild; child; child = child.previousElementSibling) if (isItem(child)) return child;
  return null;
};
const nextItem = (item: Element): Item | null => {
  for (let sibling = item.nextElementSibling; sibling; sibling = sibling.nextElementSibling) if (isItem(sibling)) return sibling;
  return null;
};
const previousItem = (item: Element): Item | null => {
  for (let sibling = item.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (isItem(sibling)) return sibling;
  return null;
};
/** An item that holds items, or says it will, is a parent; every other item is a leaf (TRV-4, TRV-42). */
const isParent = (item: Element) => item.hasAttribute('data-expandable') || !!firstItem(listOf(item));
const isOpen = (item: Element) => item.hasAttribute('data-open') && isParent(item);
const isDisabled = (item: Element) => item.hasAttribute('data-disabled');
const valueOf = (item: Element) => item.getAttribute('data-value') ?? '';

/** The text of `node` without the supporting text a label's own element may hold. */
function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
  if (!(node instanceof Element) || node.matches(PARTS)) return '';
  let text = '';
  for (const child of node.childNodes) text += textOf(child);
  return text;
}
/** An item's label: the text of its row that is not one of the row's other parts (TRV-6, TRV-23, TRV-32). */
function labelOf(item: Element): string {
  const row = rowOf(item);
  let text = '';
  if (row) for (const child of row.childNodes) text += textOf(child);
  return text.replace(/\s+/g, ' ').trim();
}

let descriptions = 0;

/**
 * A hierarchy of items that open and close: rows that begin further in at each level, a chevron at the start of every
 * row that holds others; read and opened only, or with one item or several chosen. One stop in the focus order, moved
 * through with the arrow keys. A file tree in a page, the tokens of a design system, the folders of a product.
 *
 * Contract: specs/tree-view.spec.json. The element has **no shadow root**: its items are the product's own nested
 * lists, which stay in the document. Without script the page shows the whole hierarchy as the nested list
 * it is.
 *
 * ```html
 * <tanrei-tree-view label="Project files" selection="single" value="src/index.ts">
 *   <ul>
 *     <li data-value="src" data-open>
 *       <span>
 *         <i class="tanrei-icon">folder</i>
 *         <bdi>src<small data-supporting-text>what is published</small></bdi>
 *         <span data-trailing-text>12 files</span>
 *       </span>
 *       <ul>
 *         <li data-value="src/index.ts"><span>index.ts</span></li>
 *       </ul>
 *     </li>
 *     <li data-expandable><span>node_modules</span></li>
 *   </ul>
 * </tanrei-tree-view>
 * ```
 *
 * An item is an `<li>` whose FIRST child element is its row and whose `<ul>` holds its items. In the row, a
 * `.tanrei-icon` is the icon, an element with `data-trailing` the trailing content, one with `data-trailing-text` the
 * trailing text, and the rest is the label: the row's own text, or ONE element around it (a `<bdi>`: text with inline
 * content, a name whose direction is not the layout's). An element with `data-supporting-text` is the supporting text,
 * inside the label's element or directly in the row. On the `<li>`: `data-value` (what identifies it; without one it
 * cannot be chosen), `data-open`, `data-expandable` (it will hold items: give them at `toggle`), `data-loading`,
 * `data-disabled`. The element sets and removes `data-open` itself when the user opens or closes a parent.
 *
 * Everything drawn is `@tanrei/web/tree-view.css` — every value a `--tanrei-comp-tree-view-*` token — which draws the
 * whole look before this script runs; the element adds the same sheet to the root it is connected to. The script adds
 * what a stylesheet cannot: the tree's roles and states, the single tab stop and the keys, the selection, `change` and
 * `toggle`, the answer to a press, the motion of a list that is revealed or hidden, the loading row, opening for the
 * browser's find-in-page, and the debug reports. Only the rows that are shown are read: a closed parent's items are
 * read when it first opens, so a tree costs what it shows.
 *
 * The ROW is the tree item (`role="treeitem"`, `aria-selected`, `aria-expanded`, the tab stop and the focus); its
 * `<li>` has no role and a nested list is a `group`, so the level comes from the nesting. An `<li>` holds every row
 * under it, so what changes while the tree is used is said on the row: one row's change styles that row alone. A
 * server that draws the selection in the first frame writes `aria-selected="true"` on the row.
 *
 * @tag tanrei-tree-view
 * @slot - The items: the product's own nested lists (`<ul>` of `<li>`). They are children in the document, not slotted nodes: the element has no shadow root.
 * @fires {CustomEvent<TanreiTreeViewChangeDetail>} change - The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change.
 * @fires {CustomEvent<TanreiTreeViewToggleDetail>} toggle - Dispatched on an item's `<li>` (it bubbles): the user, or the browser's find-in-page, opened or closed it; `detail.open` is its new state. The moment to give the items of an `data-expandable` parent.
 */
export class TanreiTreeView extends ReactiveElement {
  private readonly availability = new AvailabilityController(this, 'tree-view');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  static override properties: PropertyDeclarations = {
    label: { type: String },
    // The defaults are not reflected: a tree that is defined is the tree that was written.
    selection: { type: String, reflect: true, useDefault: true },
    value: { type: String },
    values: {
      converter: {
        fromAttribute: (text: string | null) => {
          try {
            const parsed: unknown = JSON.parse(text ?? '[]');
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        },
      },
    },
    density: { type: String, reflect: true, useDefault: true },
    guides: { type: Boolean, reflect: true },
    loadingLabel: { type: String, attribute: 'loading-label' },
  };

  /** The accessible name of the tree: what the hierarchy is ("Project files"). Required. */
  label = '';

  /** Whether people choose items: none (a tree that is read and opened), single (one item), multiple (any number, each by itself). */
  selection: TanreiTreeViewSelection = 'none';

  /** The value of the selected item while selection is single; null selects none. Set by the tree when an item is chosen, with `change`. */
  value: string | null = null;

  /** The values of the selected items while selection is multiple. The attribute is a JSON array (a value may hold a space). */
  values: string[] = [];

  /** How much room a row takes: regular for a product used by touch as well, compact for a tool and for a small tree inside text. A design system may add values. */
  density: TanreiTreeViewDensity = 'regular';

  /** Draws a hairline down from each open parent beside the rows it holds. Decorative. */
  guides = false;

  /** The words of a loading row ("Loading…"), and the name of its indicator. Tanrei ships none. */
  loadingLabel = '';

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.mutated(records));
  /** The lists whose items are read: the ones that are shown, or were. */
  private readonly live = new WeakSet<Element>();
  /** Each read item's `open` as it was last drawn: a change from it is what opens and closes. */
  private readonly opens = new WeakMap<Element, boolean>();
  /** What this element wrote on the product's elements: only that is taken off again. */
  private readonly hiddenParts = new WeakSet<Element>();
  private readonly described = new WeakSet<Element>();
  private readonly labelled = new WeakSet<Element>();
  private readonly inerted = new WeakSet<Element>();
  private readonly loaders = new WeakMap<Element, HTMLLIElement>();
  private readonly motions = new WeakMap<Element, Animation>();
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<PressController>();
  private held: PressController | null = null;
  private heldRow: HTMLElement | null = null;
  /** The items drawn as selected. */
  private selected = new Set<Element>();
  /** The one item in the focus order (TRV-19), the row that had focus last, and the one that has it now. */
  private stop: Item | null = null;
  private last: Item | null = null;
  private active: Item | null = null;
  /** The row that lost focus in this task: taken away in the same task, it is the row that had focus (TRV-12). */
  private left: Item | null = null;
  private leftTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly keys = new RovingKeys({ wrap: false, repeat: true });
  private readonly glyphs = new PendingGlyphs(this, 'chevron_right');
  private named = false;
  private checking = false;
  private depthChecked = false;

  /** No shadow root: the lists are the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.adoptSheet();
    for (const [type, listener] of this.listeners) this.addEventListener(type, listener);
    this.mutations?.observe(this, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ITEM_ATTRIBUTES });
    this.glyphs.connect();
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const [type, listener] of this.listeners) this.removeEventListener(type, listener);
    this.mutations?.disconnect();
    this.glyphs.disconnect();
    for (const press of this.pressControllers) press.hostDisconnected();
    this.held = null;
    this.heldRow = null;
    clearTimeout(this.leftTimer);
    this.left = null;
  }

  /**
   * The stylesheet is added to the root the tree stands in — unless that root draws the tree already: a page that
   * loads `@tanrei/web/tree-view.css` (as it must, to draw the tree before this script runs) has every rule of it, and
   * a second copy would only have the browser style every row of the tree again. Asked of the tree itself: a name the
   * stylesheet sets on it (src/primitives/sheets.ts).
   */
  private adoptSheet() {
    adoptUnlessDrawn(this, sheet('tree-view', () => TREE_VIEW_CSS), '--_trv-gap');
  }

  protected override updated(changed: PropertyValues) {
    // TRV-41: a selection the tree does not define is none (no rule matches the attribute); a debug build says so.
    if (changed.has('selection') && !SELECTIONS.includes(this.selection)) {
      report(this, 'TRV-41', `selection "${this.selection}" is not a value the tree view defines; it is drawn as "none"`);
    }
    if (changed.has('density')) this.readDensity(String(this.density ?? ''));
    if (changed.has('label') || !this.named) {
      this.named = true;
      mark(this, 'aria-label', this.label || null);
      // TRV-32: still rendered; a debug build says that the tree has no accessible name.
      if (!this.label && !this.hasAttribute('aria-labelledby')) report(this, 'TRV-32', 'the tree has no accessible name; give it a label');
    }
    // (No property changed: the product's words did — src/primitives/words.ts.)
    if (changed.has('loadingLabel') || changed.size === 0) for (const loader of this.querySelectorAll<HTMLLIElement>(`li[${LOADING}]`)) this.writeLoader(loader);
    // TRV-41: the new form at once, every parent's open and the focus kept, and no change for it.
    if (changed.has('selection')) this.restate();
    this.read();
    if (changed.has('selection') || changed.has('value') || changed.has('values')) this.readSelection();
  }

  /** How the tree chooses now: an unknown selection is none (TRV-41). */
  private get mode(): TanreiTreeViewSelection {
    return this.selection === 'single' || this.selection === 'multiple' ? this.selection : 'none';
  }

  /**
   * The item whose row a pointer's event is in: this tree's own, never a tree's inside one of its rows. (A press that
   * began in one row and ended in another reaches the list around both, which is no row.)
   */
  private itemOf(node: EventTarget | null): Item | null {
    const item = node instanceof Element ? node.closest('li') : null;
    if (!isItem(item) || item.closest(TAG) !== this) return null;
    return rowOf(item)?.contains(node as Node) ? item : null;
  }

  /** The parent of an item, where it has one. */
  private parentOf(item: Element): Item | null {
    const above = item.parentElement?.parentElement;
    return isItem(above) && this.contains(above) ? above : null;
  }

  /** The lists directly in the tree. */
  private roots(): HTMLElement[] {
    return [...this.children].filter(isList);
  }

  /** TRV-15: an item can be chosen while the tree chooses, it has a value and it is not disabled. */
  private canChoose(item: Element): boolean {
    return this.mode !== 'none' && valueOf(item) !== '' && !isDisabled(item);
  }

  /** TRV-18: a row answers where its item can be chosen, or opens and closes. */
  private answers(item: Element): boolean {
    return !isDisabled(item) && (this.canChoose(item) || isParent(item));
  }

  // ── The rows that are shown, in the order they are drawn (TRV-20) ─────────────────────────────────────────────

  private firstShown(): Item | null {
    for (const root of this.roots()) {
      const item = firstItem(root);
      if (item) return item;
    }
    return null;
  }

  /** The last row shown in the subtree of `item`: itself, or the last under its last open descendant. */
  private lastUnder(item: Item): Item {
    let at = item;
    for (let inner = isOpen(at) ? lastItem(listOf(at)) : null; inner; inner = isOpen(at) ? lastItem(listOf(at)) : null) at = inner;
    return at;
  }

  private lastShown(): Item | null {
    const roots = this.roots();
    for (let index = roots.length - 1; index >= 0; index -= 1) {
      const item = lastItem(roots[index]);
      if (item) return this.lastUnder(item);
    }
    return null;
  }

  private nextShown(item: Item): Item | null {
    const inner = isOpen(item) ? firstItem(listOf(item)) : null;
    if (inner) return inner;
    for (let at: Item | null = item; at; at = this.parentOf(at)) {
      const sibling = nextItem(at);
      if (sibling) return sibling;
    }
    return null;
  }

  private previousShown(item: Item): Item | null {
    const sibling = previousItem(item);
    return sibling ? this.lastUnder(sibling) : this.parentOf(item);
  }

  /** Whether an item's row is drawn: every parent above it is open. */
  private shown(item: Element | null): item is Item {
    if (!isItem(item) || !this.contains(item)) return false;
    for (let above = this.parentOf(item); above; above = this.parentOf(above)) if (!above.hasAttribute('data-open')) return false;
    return true;
  }

  // ── Reading the lists: roles, states and the tab stop ─────────────────────────────────────────────────────────

  /**
   * Reads what the tree shows and writes what follows from it. Called when a property changes and when the lists do; it
   * writes only what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    const roots = this.roots();
    // TRV-42: a tree with no items exposes nothing.
    const any = roots.some((root) => !!firstItem(root));
    mark(this, 'role', any ? 'tree' : null);
    mark(this, 'aria-multiselectable', any && this.mode === 'multiple' ? 'true' : null);
    for (const root of roots) this.readList(root, false);
    this.readStop();
    this.glyphs.read();
    this.check();
  }

  /** A list that is shown: its role, and each of its items. */
  private readList(list: HTMLElement, nested: boolean) {
    mark(list, 'role', nested ? 'group' : 'none');
    if (this.live.has(list)) return;
    this.live.add(list);
    for (let child = list.firstElementChild; child; child = child.nextElementSibling) if (isItem(child)) this.readItem(child);
  }

  /** One item, read for the first time: its role, its states, its row's parts, and the list it holds. */
  private readItem(item: Item) {
    // The row is the tree item: what an item says of itself — selected, focused, expanded — is written on its row, so
    // that a change of it styles that row again and not the rows under the item (they are inside the `<li>`).
    mark(item, 'role', 'none');
    const row = rowOf(item);
    if (row) {
      mark(row, 'role', 'treeitem');
      if (item !== this.stop) mark(row, 'tabindex', '-1');
    }
    if (!this.opens.has(item)) this.opens.set(item, item.hasAttribute('data-open'));
    this.readState(item);
    this.readRow(item);
    this.readLoading(item);
    const list = listOf(item);
    if (!list) return;
    mark(list, 'role', 'group');
    // TRV-9: every parent is drawn as its open says, in the first frame; a closed one's items are read when it opens.
    if (isOpen(item)) this.readList(list, true);
    else this.rest(list, false);
  }

  /** An item's states (TRV-32): expanded or collapsed for a parent, disabled, busy, and — in a tree that chooses — selected. */
  private readState(item: Item) {
    const parent = isParent(item);
    const row = rowOf(item);
    if (row) {
      mark(row, 'aria-expanded', parent ? String(item.hasAttribute('data-open')) : null);
      mark(row, 'aria-disabled', isDisabled(item) ? 'true' : null);
      // TRV-13: busy while it is loading, open or closed.
      mark(row, 'aria-busy', parent && item.hasAttribute('data-loading') ? 'true' : null);
    }
    // TRV-42: an item that holds a list with no item in it is a leaf.
    mark(item, LEAF, !parent && listOf(item) ? '' : null);
    this.readSelected(item);
  }

  /** TRV-15, TRV-32: selected or not for an item that can be chosen, no state for one that cannot; a selected item is drawn so even while disabled (TRV-27). */
  private readSelected(item: Item) {
    const value = valueOf(item);
    const chosen = value !== '' && (this.mode === 'single' ? this.value === value : this.mode === 'multiple' && this.values.includes(value));
    const row = rowOf(item);
    if (row) mark(row, 'aria-selected', chosen ? 'true' : this.canChoose(item) ? 'false' : null);
    if (chosen) this.selected.add(item);
    else this.selected.delete(item);
  }

  /**
   * A row's parts (TRV-32). The label is the item's name. The supporting text, the trailing content and the trailing
   * text are its description, in that order: each is hidden from the name and named by `aria-describedby`, which reads
   * what it points to even where that is hidden. The trailing text is text of its own direction (TRV-39): `dir="auto"`,
   * unless the product named one, so that it is cut at its own end. The icon is decorative.
   *
   * A supporting text that stands directly in the row has no box of its own (tree-view.css), and an engine does not
   * hide such an element from a name: the item is then named by its label in words (`aria-label`), written again when
   * the row changes.
   */
  private readRow(item: Item) {
    const row = rowOf(item);
    if (!row) {
      report(item, 'TRV-32', 'the item has no row: its first child element is its row, with its label; wrap the item’s own text in a <span>');
      return;
    }
    const ids: string[] = [];
    const parts = row.querySelectorAll<HTMLElement>('.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text]');
    const ordered = [...parts].sort((a, b) => order(a) - order(b));
    for (const part of ordered) {
      if (!part.hasAttribute('aria-hidden')) {
        part.setAttribute('aria-hidden', 'true');
        this.hiddenParts.add(part);
      }
      if (part.classList.contains('tanrei-icon')) continue;
      if (part.hasAttribute('data-trailing-text') && !part.hasAttribute('dir')) part.setAttribute('dir', 'auto');
      if (!this.hiddenParts.has(part) || !part.textContent?.trim()) continue;
      if (!part.id) part.id = `tanrei-tree-view-description-${++descriptions}`;
      ids.push(part.id);
    }
    if (ids.length && (!row.hasAttribute('aria-describedby') || this.described.has(row))) {
      this.described.add(row);
      mark(row, 'aria-describedby', ids.join(' '));
    } else if (!ids.length && this.described.has(row)) {
      this.described.delete(row);
      row.removeAttribute('aria-describedby');
    }
    const boxless = [...row.children].some((part) => part.hasAttribute('data-supporting-text'));
    if (boxless && (!row.hasAttribute('aria-label') || this.labelled.has(row)) && !row.hasAttribute('aria-labelledby')) {
      this.labelled.add(row);
      mark(row, 'aria-label', labelOf(item));
    } else if (!boxless && this.labelled.has(row)) {
      this.labelled.delete(row);
      row.removeAttribute('aria-label');
    }
    if (!debugBuild()) return;
    // TRV-32: an item with no label. TRV-6: a row holds no control.
    if (!labelOf(item) && !row.getAttribute('aria-label') && !row.hasAttribute('aria-labelledby')) report(item, 'TRV-32', 'the item has no accessible name; give its row a label');
    let control: Element | null = null;
    for (const child of row.children) control ??= child.classList.contains('ripple') ? null : findInteractive(child);
    if (control) report(item, 'TRV-6', `the row holds a control (<${control.localName}>): a row is one item of the tree and holds no control; answer change, or put the action beside the tree`);
  }

  /**
   * TRV-19: the one row in the focus order — the row that had focus last, or else the first selected item that is
   * shown, or else the first row. None while the tree shows no row.
   */
  private readStop() {
    let stop: Item | null = this.shown(this.last) ? this.last : null;
    if (!stop) {
      for (const item of this.selected) {
        if (!this.shown(item)) continue;
        if (!stop || item.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) stop = item;
      }
    }
    stop ??= this.firstShown();
    const row = stop ? rowOf(stop) : null;
    if (stop === this.stop && (!row || row.tabIndex === 0)) return;
    const before = this.stop && this.stop !== stop && this.stop.isConnected ? rowOf(this.stop) : null;
    this.stop = stop;
    if (before) mark(before, 'tabindex', '-1');
    if (row) mark(row, 'tabindex', '0');
  }

  /** TRV-41: the selection's form changed — every read item says again whether it is selected. */
  private restate() {
    this.selected = new Set();
    for (const item of this.querySelectorAll<Item>('li[role="none"]')) if (isItem(item) && item.closest(TAG) === this) this.readSelected(item);
  }

  /**
   * TRV-15: the items the tree's value or values name are drawn as selected — the row of each, and no other. The
   * items are found by their value in the document, read or not: one that is under a closed parent is selected all the
   * same, and is not shown for it.
   */
  private readSelection() {
    const mode = this.mode;
    const names = mode === 'single' ? (this.value === null || this.value === '' ? [] : [this.value]) : mode === 'multiple' ? this.values.filter((value) => value !== '') : [];
    const now = new Set<Element>();
    if (names.length > 8) {
      const wanted = new Set(names);
      const found = new Map<string, number>();
      for (const item of this.querySelectorAll<Item>('li[data-value]')) {
        const value = valueOf(item);
        if (!wanted.has(value) || item.closest(TAG) !== this) continue;
        now.add(item);
        found.set(value, (found.get(value) ?? 0) + 1);
      }
      for (const name of names) this.reportNamed(name, found.get(name) ?? 0);
    } else {
      for (const name of names) {
        const items = [...this.querySelectorAll<Item>(`li[data-value="${CSS.escape(name)}"]`)].filter((item) => isItem(item) && item.closest(TAG) === this);
        for (const item of items) now.add(item);
        this.reportNamed(name, items.length);
      }
    }
    const before = this.selected;
    this.selected = new Set();
    for (const item of before) if (!now.has(item) && item.isConnected) this.readSelected(item as Item);
    for (const item of now) this.readSelected(item as Item);
    this.readStop();
  }

  /** TRV-15: a value that names no item selects nothing; two items with one value are both selected. A debug build says each. */
  private reportNamed(name: string, count: number) {
    // (A tree that is still being parsed may not hold the item yet: it is selected when it arrives.)
    if (count === 0 && document.readyState !== 'loading') report(this, 'TRV-15', `the selection names "${name}", which is the value of no item; nothing is selected for it`);
    if (count > 1) report(this, 'TRV-15', `${count} items carry the value "${name}"; each is drawn as selected, and a value should be unique within the tree`);
  }

  /** TRV-41: a density the core does not have was added by a design system, or is unknown to the active one. */
  private readDensity(value: string) {
    if (CORE_DENSITIES.includes(value)) return;
    const known = KEY.test(value);
    if (known) adopt(this.getRootNode() as Root, sheet(`density:${value}`, () => densityRules(value)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-container-height-${value}`).trim() === '') {
      report(this, 'TRV-41', `density "${value}" is not a value of the active design system; it is drawn as "${DEFAULT_DENSITY}"`);
    }
  }

  /** What a debug build says about a tree it still draws, once what changed has settled (TRV-13). */
  private check() {
    if (!debugBuild() || this.checking) return;
    this.checking = true;
    queueMicrotask(() => {
      this.checking = false;
      if (!this.isConnected) return;
      if (this.querySelector(`li[${LOADING}]`) && this.words.lacks('loadingLabel', this.loadingLabel)) report(this, 'TRV-13', 'an item is loading and the tree has no loading-label: the loading indicator has no name');
    });
  }

  /** TRV-3: a level whose indent takes more than half of the tree's width is drawn where the deepest one that fits begins; a debug build says the depth, once. Read when the user first acts: it reads the layout. */
  private checkDepth() {
    if (this.depthChecked || !debugBuild()) return;
    this.depthChecked = true;
    const step = treeLengths(this).indent;
    const width = this.clientWidth;
    if (!(step > 0) || !(width > 0)) return;
    let deepest = 0;
    for (const list of this.querySelectorAll('ul[role="group"], ol[role="group"]')) {
      let depth = 1;
      for (let above = list.parentElement?.closest('ul, ol'); above && this.contains(above); above = above.parentElement?.closest('ul, ol')) depth += 1;
      deepest = Math.max(deepest, depth);
    }
    if (deepest * step > width / 2) report(this, 'TRV-3', `the tree is ${deepest + 1} levels deep and ${Math.round(width)} wide: the levels past ${Math.floor(width / 2 / step) + 1} begin where that one does, so that names keep half of the width`);
  }

  // ── What the observer saw ─────────────────────────────────────────────────────────────────────────────────────

  private mutated(records: MutationRecord[]) {
    const own = (node: Node) => isGlyphProbe(node) || (node instanceof Element && (node.classList.contains('ripple') || node.hasAttribute(LOADING) || node.hasAttribute(OWN_LIST)));
    const items = new Set<Item>();
    let structure = false;
    for (const record of records) {
      if (record.type === 'attributes') {
        const item = record.target;
        if (!isItem(item) || !this.opens.has(item) || item.closest(TAG) !== this) continue;
        if (record.attributeName === 'data-open') this.opened(item);
        else items.add(item);
        continue;
      }
      if (record.type === 'characterData') {
        // A row's text changed: its item is read again (its name, where the element wrote one).
        const item = record.target.parentElement?.closest('li');
        if (isItem(item) && this.opens.has(item) && item.closest(TAG) === this) items.add(item);
        continue;
      }
      if ([...record.addedNodes, ...record.removedNodes].every(own)) continue;
      structure = true;
      const target = record.target as Element;
      if (target === this) continue;
      if (isList(target)) {
        // Items came or went: the item that holds the list may have become a parent or a leaf, and new items are read.
        const holder = target.parentElement;
        if (isItem(holder) && this.opens.has(holder)) items.add(holder);
        if (this.live.has(target)) for (const node of record.addedNodes) if (isItem(node)) this.readItem(node);
      } else {
        // A row, a part of one, or an item that was given its row or its list.
        const item = target instanceof HTMLLIElement ? target : target.closest('li');
        if (isItem(item) && this.opens.has(item) && item.closest(TAG) === this) items.add(item);
      }
    }
    for (const item of items) {
      if (!item.isConnected) continue;
      this.readState(item);
      this.readRow(item);
      this.readLoading(item);
      const list = listOf(item);
      if (list) {
        mark(list, 'role', 'group');
        if (isOpen(item)) {
          if (!this.motions.has(list)) this.rest(list, true);
          this.readList(list, true);
        } else if (!this.motions.has(list)) this.rest(list, false);
      }
    }
    if (!structure && !items.size) return;
    if (structure) {
      this.depthChecked = false;
      this.refocus();
      this.read();
      if (this.mode !== 'none') this.readSelection();
    } else this.readStop();
  }

  /**
   * TRV-12: the row that had focus was taken away. Focus goes to the row that follows where it was or, where none
   * does, the one before it — the parent's row where its items are gone.
   */
  private refocus() {
    // (An engine may tell the row that it lost focus as it is taken away: that row is the one that left in this task.)
    const gone = this.active ?? this.left;
    this.left = null;
    if (this.last && !this.contains(this.last)) this.last = null;
    if (this.stop && !this.contains(this.stop)) this.stop = null;
    if (!gone || this.contains(gone)) return;
    this.active = null;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    const place = this.places.get(gone);
    this.places.delete(gone);
    const next = [place?.next, place?.previous && this.shown(place.previous) ? this.lastUnder(place.previous) : null, place?.parent].find((item) => this.shown(item ?? null)) ?? this.firstShown();
    if (next) this.focusRow(next);
  }

  /** Where the focused row stands, noted when focus arrives: what is beside it when it is taken away. */
  private readonly places = new WeakMap<Element, { next: Item | null; previous: Item | null; parent: Item | null }>();

  // ── Opening and closing (TRV-9 to TRV-12, TRV-14) ─────────────────────────────────────────────────────────────

  /** The product set or removed `data-open` on a read item: it is drawn, with the motion, and nothing is emitted. */
  private opened(item: Item) {
    const open = item.hasAttribute('data-open');
    if (this.opens.get(item) === open) return;
    this.opens.set(item, open);
    this.draw(item, open, false);
  }

  /** The user (or the browser's search) opens or closes a parent: its `data-open`, its drawing, and its `toggle`, once. */
  private toggle(item: Item, open: boolean, atOnce = false) {
    if (item.hasAttribute('data-open') === open) return;
    this.opens.set(item, open);
    item.toggleAttribute('data-open', open);
    this.draw(item, open, atOnce);
    // TRV-11: when the change begins, not when the motion ends.
    item.dispatchEvent(new CustomEvent<TanreiTreeViewToggleDetail>('toggle', { bubbles: true, detail: { open } }));
  }

  /** Draws a change of an item's open: its state, its list revealed or hidden, and the focus kept (TRV-12). */
  private draw(item: Item, open: boolean, atOnce: boolean) {
    this.readState(item);
    const list = listOf(item);
    if (open && list) this.readList(list, true);
    // TRV-12: a parent that closes around the focus takes it.
    if (!open && list) {
      if (this.active && this.active !== item && item.contains(this.active)) this.focusRow(item, false);
      if (this.last && this.last !== item && item.contains(this.last)) this.last = item;
    }
    if (atOnce) {
      // The chevron's turn is drawn at once too: its style is computed with the transition off.
      const row = rowOf(item);
      item.setAttribute(AT_ONCE, '');
      if (row) void getComputedStyle(row, '::before').rotate;
    }
    if (list) this.move(list, open, atOnce);
    if (atOnce) {
      const row = rowOf(item);
      if (row) void getComputedStyle(row, '::before').rotate;
      item.removeAttribute(AT_ONCE);
    }
    this.readStop();
  }

  /** A list at rest: shown, or closed — where the browser can, still searched by its find-in-page (TRV-14). */
  private rest(list: HTMLElement, open: boolean) {
    list.removeAttribute(MOVING);
    if (this.inerted.has(list)) {
      this.inerted.delete(list);
      list.inert = false;
    }
    if (open) {
      if (list.getAttribute('hidden') === 'until-found') list.removeAttribute('hidden');
    } else if (UNTIL_FOUND && !list.hasAttribute('hidden')) list.setAttribute('hidden', 'until-found');
  }

  /**
   * TRV-11: the list is revealed from its item's row downward, or hidden toward it. Its rows are laid out once, at
   * their size, and one animation moves the height it is seen through, between nothing and that size — measured once,
   * when the change begins. A list that is being hidden stays drawn until the end and leaves the keys and assistive
   * technology at once. A change on the way goes on from where the height is.
   */
  private move(list: HTMLElement, open: boolean, atOnce: boolean) {
    const running = this.motions.get(list);
    const from = running ? list.getBoundingClientRect().height : null;
    if (running) {
      this.motions.delete(list);
      running.cancel();
    }
    if (atOnce || typeof list.animate !== 'function' || !list.isConnected) {
      this.rest(list, open);
      return;
    }
    // (The list's own transition holds the disclosure's time and curve as the cascade computes them.)
    const style = getComputedStyle(list);
    const duration = Number.parseFloat(style.transitionDuration) * 1000;
    if (!(duration > 0)) {
      this.rest(list, open);
      return;
    }
    if (list.getAttribute('hidden') === 'until-found') list.removeAttribute('hidden');
    list.setAttribute(MOVING, open ? 'opening' : 'closing');
    if (!open && !list.inert) {
      list.inert = true;
      this.inerted.add(list);
    } else if (open && this.inerted.has(list)) {
      this.inerted.delete(list);
      list.inert = false;
    }
    const size = list.getBoundingClientRect().height;
    const frames = { blockSize: [`${from ?? (open ? 0 : size)}px`, `${open ? size : 0}px`] };
    let motion: Animation;
    try {
      motion = list.animate(frames, { duration, fill: 'forwards', easing: style.transitionTimingFunction.split(/,(?![^(]*\))/)[0].trim() || 'ease' });
    } catch {
      motion = list.animate(frames, { duration, fill: 'forwards', easing: 'ease' });
    }
    this.motions.set(list, motion);
    // (Held at its end until the list is at rest, so that no frame shows it between the two.)
    const done = () => {
      if (this.motions.get(list) !== motion) return;
      this.motions.delete(list);
      this.rest(list, open);
      motion.cancel();
    };
    motion.finished.then(done, () => {});
  }

  // ── The loading row (TRV-13) ──────────────────────────────────────────────────────────────────────────────────

  /**
   * A loading parent holds one loading row, the last thing in its list — after the rows it already holds, one level
   * further in, shown and hidden with them. A parent that holds no list yet is given one of the element's own for it.
   * It is an `<li>` that is not an item: no role, no focus, not counted.
   */
  private readLoading(item: Item) {
    const want = isParent(item) && item.hasAttribute('data-loading');
    let loader = this.loaders.get(item) ?? null;
    const made = item.querySelector<HTMLElement>(`:scope > [${OWN_LIST}]`);
    if (!want) {
      if (loader) {
        this.loaders.delete(item);
        loader.remove();
      }
      made?.remove();
      return;
    }
    let list = listOf(item);
    if (!list) {
      list = document.createElement('ul');
      list.setAttribute(OWN_LIST, '');
      list.setAttribute('role', 'group');
      item.append(list);
      this.live.add(list);
      this.rest(list, isOpen(item));
    } else if (made && list !== made) made.remove();
    if (!loader) {
      loader = document.createElement('li');
      loader.setAttribute(LOADING, '');
      // A tree holds tree items and their groups, and nothing else: the row is kept from assistive technology, which
      // is told that the parent is busy (TRV-13, TRV-32). The indicator is still named, as the component asks.
      loader.setAttribute('role', 'none');
      loader.setAttribute('aria-hidden', 'true');
      const row = document.createElement('span');
      const box = document.createElement('span');
      box.setAttribute('data-tanrei-loading-box', '');
      const indicator = document.createElement('tanrei-loading-indicator');
      indicator.setAttribute('size', 'small');
      box.append(indicator);
      const words = document.createElement('span');
      words.setAttribute('data-tanrei-loading-label', '');
      words.setAttribute('dir', 'auto');
      row.append(box, words);
      loader.append(row);
      this.loaders.set(item, loader);
      this.writeLoader(loader);
    }
    if (list.lastElementChild !== loader) list.append(loader);
    this.check();
  }

  /** The words of a loading row, and the name of its indicator: the tree's `loadingLabel`. */
  private writeLoader(loader: HTMLLIElement) {
    const indicator = loader.querySelector('tanrei-loading-indicator');
    const words = loader.querySelector('[data-tanrei-loading-label]');
    // The tree's own `loadingLabel`, else the product's words.
    const loading = this.words.get('loadingLabel', this.loadingLabel);
    if (indicator && indicator.getAttribute('label') !== loading) indicator.setAttribute('label', loading);
    if (words && words.textContent !== loading) words.textContent = loading;
  }

  // ── Focus (TRV-12, TRV-19) ────────────────────────────────────────────────────────────────────────────────────

  /** Moves focus to an item's row, and brings the row into view by the least distance that shows it whole (TRV-12). */
  private focusRow(item: Item, reveal = true) {
    this.last = item;
    this.readStop();
    const row = rowOf(item);
    row?.focus({ preventScroll: true });
    if (reveal) row?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** The item whose row has an event of the keyboard or of focus: the row is what takes focus. */
  private rowItem(row: EventTarget | null): Item | null {
    const item = row instanceof HTMLElement ? row.parentElement : null;
    return isItem(item) && rowOf(item) === row && item.closest(TAG) === this ? item : null;
  }

  private readonly onFocusIn = (event: Event) => {
    const item = this.rowItem(event.target);
    if (!item) return;
    this.active = item;
    this.last = item;
    this.places.set(item, { next: nextItem(item), previous: previousItem(item), parent: this.parentOf(item) });
    this.readStop();
    // TRV-30: where the browser has no style queries, the focus style is read when focus arrives.
    if (!styleQueries()) syncFocusStyle(this, event.target as HTMLElement);
  };

  private readonly onFocusOut = (event: Event) => {
    const item = this.rowItem(event.target) ?? ((event.target as Element | null)?.parentElement as Item | null);
    if (!isItem(item)) return;
    this.presses.get(event.target as HTMLElement)?.onBlur();
    // (A row that is taken away while it has focus is still the one that had it: see refocus().)
    if (!item.isConnected || !this.contains(item)) return;
    this.active = null;
    this.left = item;
    clearTimeout(this.leftTimer);
    this.leftTimer = setTimeout(() => (this.left = null));
  };

  // ── Keys (TRV-20 to TRV-23) ───────────────────────────────────────────────────────────────────────────────────

  private readonly onKeyDown = (event: Event) => {
    const key = event as KeyboardEvent;
    const item = this.rowItem(key.target);
    // TRV-20: the keys are the tree's only while focus is on one of its rows.
    if (!item) return;
    // TRV-22: a key pressed with a modifier is the platform's (Shift alone types a character).
    if (key.altKey || key.ctrlKey || key.metaKey || key.isComposing) return;
    this.checkDepth();
    const move = (to: Item | null) => {
      key.preventDefault();
      if (to && to !== item) this.focusRow(to);
    };
    if (!key.shiftKey) {
      switch (key.key) {
        case 'ArrowDown':
          return move(this.nextShown(item));
        case 'ArrowUp':
          return move(this.previousShown(item));
        case 'Home':
          return move(this.firstShown());
        case 'End':
          return move(this.lastShown());
      }
      // TRV-21: the arrow toward the end of the line opens, then steps in; the one toward its start closes, then steps out.
      const arrow = lineArrow(key.key, item);
      if (arrow) {
        key.preventDefault();
        const open = isOpen(item);
        if (arrow === 'end') {
          if (open) {
            const inner = firstItem(listOf(item));
            if (inner) this.focusRow(inner);
          } else if (isParent(item) && !isDisabled(item)) this.toggle(item, true);
        } else if (open && !isDisabled(item)) this.toggle(item, false);
        else {
          const parent = this.parentOf(item);
          if (parent) this.focusRow(parent);
        }
        return;
      }
      // TRV-22: Enter, and a Space that is not part of a typed search, do what a press on the row does.
      if (key.key === 'Enter' || (key.key === ' ' && !this.keys.searching())) {
        key.preventDefault();
        if (key.repeat || !this.answers(item)) return;
        const row = rowOf(item);
        if (row) this.pressOf(item, row).press(null);
        this.activate(item, false);
        return;
      }
    }
    // TRV-22: the asterisk opens every closed parent among the focused row's siblings, itself included.
    if (key.key === '*') {
      key.preventDefault();
      for (let sibling = firstItem(item.parentElement); sibling; sibling = nextItem(sibling)) if (isParent(sibling) && !isDisabled(sibling)) this.toggle(sibling, true);
      return;
    }
    // TRV-23: printable characters move focus to the next shown row whose label begins with them.
    if ([...key.key].length !== 1) return;
    const rows: Item[] = [];
    for (let at = this.firstShown(); at; at = this.nextShown(at)) rows.push(at);
    const to = this.keys.target(
      key.key,
      rows.indexOf(item),
      rows.map((row) => ({
        focusable: true,
        get label() {
          return labelOf(row);
        },
      })),
    );
    if (to === null) return;
    key.preventDefault();
    if (rows[to] !== item) this.focusRow(rows[to]);
  };

  private readonly onKeyUp = (event: Event) => {
    if (event.target instanceof HTMLElement) this.presses.get(event.target)?.onKeyUp(event as KeyboardEvent);
  };

  // ── Presses (TRV-10, TRV-16, TRV-17, TRV-26, TRV-28, TRV-29) ──────────────────────────────────────────────────

  /**
   * What a press on a row does (TRV-10, TRV-22): the chevron of a parent opens and closes it; the row of an item that
   * can be chosen chooses it; the row of a parent that cannot opens and closes it; a leaf that cannot be chosen, and a
   * disabled item, answer nothing. One press never does two things.
   */
  private activate(item: Item, chevron: boolean) {
    if (isDisabled(item)) return;
    if (!chevron && this.canChoose(item)) this.choose(item);
    else if (isParent(item)) this.toggle(item, !item.hasAttribute('data-open'));
  }

  /** TRV-16, TRV-17: the user chooses an item; `change`, exactly once, where the selection changed. */
  private choose(item: Item) {
    const value = valueOf(item);
    if (this.mode === 'single') {
      // A single choice is never cleared by its own item.
      if (this.value === value) return;
      this.value = value;
      this.readSelection();
      this.dispatchEvent(new CustomEvent<TanreiTreeViewChangeDetail>('change', { bubbles: true, detail: { value } }));
    } else {
      this.values = this.values.includes(value) ? this.values.filter((held) => held !== value) : [...this.values, value];
      this.readSelection();
      this.dispatchEvent(new CustomEvent<TanreiTreeViewChangeDetail>('change', { bubbles: true, detail: { values: [...this.values] } }));
    }
  }

  /**
   * TRV-26: whether a press at `x` is on the chevron of a parent that can be chosen — from the tree's start edge to
   * the middle of the gap after the chevron's box, and at least the target wide. The lengths are the row's own, as the
   * cascade computes them.
   */
  private onChevron(row: HTMLElement, x: number): boolean {
    const style = getComputedStyle(row);
    const chevron = getComputedStyle(row, '::before');
    const rtl = style.direction === 'rtl';
    const box = row.getBoundingClientRect();
    // The least width is the tree's own, read where the stylesheet has a real property compute it.
    const { target } = treeLengths(this);
    const reach = Math.max(
      Number.parseFloat(rtl ? style.paddingRight : style.paddingLeft) + Number.parseFloat(chevron.width) + (Number.parseFloat(chevron.marginLeft) + Number.parseFloat(chevron.marginRight)) / 2,
      target > 0 ? target : 0,
    );
    return (rtl ? box.right - x : x - box.left) <= reach;
  }

  /** The press of one row (the shared primitive), made when it is first pressed. */
  private pressOf(item: Item, row: HTMLElement): PressController {
    let press = this.presses.get(row);
    if (!press) {
      press = new PressController(row, {
        container: () => row,
        // The row's first transition is the hold (tree-view.css), so its delay is press-hold as a time.
        holdCarrier: () => row,
        disabled: () => !this.answers(item),
      });
      this.presses.set(row, press);
      this.pressControllers.add(press);
    }
    return press;
  }

  private readonly releasePress = () => {
    this.held?.release();
    this.held = null;
    this.heldRow = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const pointer = event as PointerEvent;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!item || !row || (pointer.button !== 0 && pointer.pointerType === 'mouse')) return;
    this.checkDepth();
    if (!this.answers(item)) return;
    this.held = this.pressOf(item, row);
    this.heldRow = row;
    this.held.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the row it holds.
  private readonly onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (this.heldRow && !(to instanceof Node && this.heldRow.contains(to))) this.releasePress();
  };

  private readonly onClick = (event: Event) => {
    const click = event as MouseEvent;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!item || !row || click.button !== 0 || !this.answers(item)) return;
    // (A click that names no place — one made by script — is a press on the row.)
    const placed = click.detail > 0 || click.clientX !== 0 || click.clientY !== 0;
    this.activate(item, placed && isParent(item) && this.canChoose(item) && this.onChevron(row, click.clientX));
  };

  // TRV-14: the browser's find-in-page found text in a closed list — that parent opens, at once, with its toggle.
  // (The browser asks each closed list above it in turn, and brings the match into view itself.)
  private readonly onBeforeMatch = (event: Event) => {
    const list = event.target;
    const item = isList(list) ? list.parentElement : null;
    if (isItem(item) && item.closest(TAG) === this && isParent(item)) this.toggle(item, true, true);
  };

  private readonly listeners: [string, (event: Event) => void][] = [
    ['pointerdown', this.onPointerDown],
    ['pointerup', this.releasePress],
    ['pointercancel', this.releasePress],
    ['pointerout', this.onPointerOut],
    ['dragstart', this.releasePress],
    ['click', this.onClick],
    ['keydown', this.onKeyDown],
    ['keyup', this.onKeyUp],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
    ['beforematch', this.onBeforeMatch],
  ];
}

/** The order a row's parts are read in as its description (TRV-32): supporting text, trailing content, trailing text. */
function order(part: Element): number {
  return part.hasAttribute('data-supporting-text') ? 0 : part.hasAttribute('data-trailing') ? 1 : part.hasAttribute('data-trailing-text') ? 2 : 3;
}

if (!customElements.get('tanrei-tree-view')) customElements.define('tanrei-tree-view', TanreiTreeView);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tree-view': TanreiTreeView;
  }
}
