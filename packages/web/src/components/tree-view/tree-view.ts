import type { PropertyDeclarations, PropertyValues } from 'lit';
import { AvailabilityController, PressController, RovingKeys, findInteractive, lineArrow, report, styleQueries, syncFocusStyle } from '../../primitives/index.js';
import { PendingGlyphs, isGlyphProbe } from '../../primitives/glyph-pending.js';
import { type CutTextContent, CutTextTip, isCut } from '../../primitives/cut-text.js';
import { TanreiTooltip } from '../tooltip/tooltip.js';
import { debugBuild } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import type { TanreiTreeViewDensityRegistry } from '../../registry.js';
import '../loading-indicator/loading-indicator.js';
import { TanreiEmbeddedTextInput } from '../embedded-text-input/embedded-text-input.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiLightElement } from '../../primitives/element.js';
import { holdsProductName, nameHost, namedByProduct } from '../../primitives/delegated-aria.js';

/** Whether people choose items: none (read and opened), single (one item), multiple (any number, each by itself). */
export type TanreiTreeViewSelection = 'none' | 'single' | 'multiple';
/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiTreeViewDensity = keyof TanreiTreeViewDensityRegistry;
/** Where a parent's chevron stands: at the start of its row, at its very end, or nowhere (TRV-4, TRV-44). */
export type TanreiTreeViewChevron = 'start' | 'end' | 'none';
/** Whether the guide lines are drawn: never, always, or while a pointer or focus is in the tree (TRV-8). */
export type TanreiTreeViewGuides = 'none' | 'shown' | 'hover';
/** Whether a row without an icon keeps an icon's room (TRV-43). */
export type TanreiTreeViewIconSpace = 'auto' | 'always' | 'never';
/** How far a row's fill reaches: from its level, or across the whole tree (TRV-51). */
export type TanreiTreeViewHighlight = 'indented' | 'full';
/** What `change` carries: `value` while selection is single, `values` while it is multiple, after the change. */
export interface TanreiTreeViewChangeDetail {
  value?: string | null;
  values?: string[];
}
/** What an item's `toggle` carries: its new open state. */
export interface TanreiTreeViewToggleDetail {
  open: boolean;
}
/** What an item's `rename` carries: the name the user gave (not empty, trimmed, not the old one) and the label it had. */
export interface TanreiTreeViewRenameDetail {
  label: string;
  previous: string;
}
/** What `create` carries: the new item's name, whether it is a parent, and the items it goes under and follows (or null). */
export interface TanreiTreeViewCreateDetail {
  label: string;
  parent: boolean;
  within: HTMLLIElement | null;
  after: HTMLLIElement | null;
}
/** What `create()` takes: whether the new item is a parent (a folder) or a leaf, and the glyph its new row shows. */
export interface TanreiTreeViewCreateOptions {
  parent?: boolean;
  icon?: string;
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
const CHEVRONS: readonly string[] = ['start', 'end', 'none'];
const GUIDES: readonly string[] = ['none', 'shown', 'hover'];
const ICON_SPACES: readonly string[] = ['auto', 'always', 'never'];
const HIGHLIGHTS: readonly string[] = ['indented', 'full'];
/** A boolean that is on unless the attribute says `false` (expandable, sticky-parents). */
const onUnlessFalse = {
  fromAttribute: (value: string | null) => value !== 'false',
  toAttribute: (value: boolean) => (value ? null : 'false'),
};
/** A number of points, or null for auto (indent, icon-gap): `auto`, nothing, or what is not a number of zero or more is auto. */
const pointsOrAuto = {
  fromAttribute: (value: string | null) => {
    if (value === null || value.trim() === '' || value.trim() === 'auto') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
  },
};
/** guides: the bare attribute and `true` are shown; nothing, `false` and `none` are none. */
const guidesConverter = {
  fromAttribute: (value: string | null) => (value === null || value === 'false' || value === 'none' ? 'none' : value === '' || value === 'true' ? 'shown' : value),
  toAttribute: (value: unknown) => (value === true ? 'shown' : value === false || value === 'none' ? null : String(value)),
};
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
  ['--_trv-label-size', 'label-typescale-*-font-size'],
  ['--_trv-label-line', 'label-typescale-*-line-height'],
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
/** The new row the element adds while a new item is named (TRV-48), the edit field's box, and a row that holds one (TRV-46). */
const NEW = 'data-tanrei-new';
/** A row pinned at the top of the scrolling box (TRV-53), with its offset; the tooltip of a cut text (TRV-50). */
const PINNED = 'data-tanrei-pinned';
const TIP = 'data-tanrei-tip';
const EDIT = 'data-tanrei-edit';
const EDITING = 'data-tanrei-editing';
/** The parts of a row that are not its label. */
const PARTS = '.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text], [data-tanrei-loading-box], .ripple, [data-tanrei-tip]';
/** What an item says: a change of any is read again. */
const ITEM_ATTRIBUTES = ['data-open', 'data-value', 'data-disabled', 'data-loading', 'data-expandable'];

type Root = Document | ShadowRoot;
type Item = HTMLLIElement;
/** An open edit field (TRV-46): the `<li>` it stands in, the item it renames (null in a new row), and for a new row what `create` will say (TRV-48). */
interface Editing {
  li: HTMLLIElement;
  item: Item | null;
  box: HTMLElement;
  field: TanreiEmbeddedTextInput;
  previous: string;
  create?: { parent: boolean; within: Item | null; after: Item | null; back: Item | null };
}

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
const isItem = (node: EventTarget | null | undefined): node is Item => node instanceof HTMLLIElement && !node.hasAttribute(LOADING) && !node.hasAttribute(NEW);
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
/** TRV-49: a tree that is not expandable shows every parent open. */
const fixedOpen = (item: Element) => item.closest(TAG)?.getAttribute('expandable') === 'false';
const isOpen = (item: Element) => isParent(item) && (item.hasAttribute('data-open') || fixedOpen(item));
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
 * A hierarchy of items that open and close: rows that begin further in at each level, a chevron at the start or the end
 * of every row that holds others (or none, the folder glyph opening), names on one line shown whole in a tooltip where
 * they are cut, the rows of the open parents above what is shown pinned at the top of the scrolling box; read and
 * opened only, or with one item or several chosen. One stop in the focus order, moved through with the arrow keys. A
 * file tree in a page, the tokens of a design system, the folders of a product.
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
 * browser's find-in-page, editing names in place and naming new items (`editable`, `edit()`, `create()`), and the debug
 * reports. Only the rows that are shown are read: a closed parent's items are
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
 * @fires {CustomEvent<TanreiTreeViewRenameDetail>} rename - Dispatched on an item's `<li>` (it bubbles): the user gave it a new name in place; `detail.label` is the name (trimmed, not empty, not the old one) and `detail.previous` the label it had. The tree changes no label: set it to rename the item.
 * @fires {CustomEvent<TanreiTreeViewCreateDetail>} create - The user named the new item `create()` asked for: `detail.label`, `detail.parent`, and the `<li>` it goes under (`detail.within`, null at the first level) and follows (`detail.after`, null where it is first). The tree's own row is gone; add the item, and the tree moves focus to it.
 */
export class TanreiTreeView extends TanreiLightElement {
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
    chevron: { type: String, reflect: true, useDefault: true },
    expandable: { reflect: true, converter: onUnlessFalse, useDefault: true },
    guides: { reflect: true, converter: guidesConverter, useDefault: true },
    indent: { converter: pointsOrAuto },
    iconSpace: { type: String, reflect: true, attribute: 'icon-space', useDefault: true },
    iconGap: { converter: pointsOrAuto, attribute: 'icon-gap' },
    highlight: { type: String, reflect: true, useDefault: true },
    labelWrap: { type: Boolean, reflect: true, attribute: 'label-wrap' },
    supportingWrap: { type: Boolean, reflect: true, attribute: 'supporting-wrap' },
    stickyParents: { reflect: true, converter: onUnlessFalse, attribute: 'sticky-parents', useDefault: true },
    stickyMax: { type: Number, attribute: 'sticky-max' },
    editable: { type: Boolean, reflect: true },
    editLabel: { type: String, attribute: 'edit-label' },
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

  /** Where a parent's chevron stands: start (before the icon), end (after the trailing content), none (a parent opens by its icon, its open icon showing the state, and by the arrow keys). */
  chevron: TanreiTreeViewChevron = 'start';

  /** Whether parents open and close at all; false shows every parent open, with no chevron and no toggle. The attribute `expandable="false"` turns it off. */
  expandable = true;

  /** Hairlines down from each open parent beside the rows it holds: none, shown, or hover (while a pointer or focus is in the tree). The bare attribute is shown. Decorative. */
  guides: TanreiTreeViewGuides = 'none';

  /** How far each level steps in, in pixels; null (`auto`) puts a child's start where its parent's label begins. 0 steps in nothing. */
  indent: number | null = null;

  /** Whether a row without an icon keeps an icon's room: auto (while another row of its level has an icon), always, never. */
  iconSpace: TanreiTreeViewIconSpace = 'auto';

  /** The room between the icon and the label, in pixels; null (`auto`) is the token, which no density changes. */
  iconGap: number | null = null;

  /** How far a row's fill, state layers and focus ring reach: indented (from its level), full (across the tree). */
  highlight: TanreiTreeViewHighlight = 'indented';

  /** Labels wrap instead of being one line cut with an ellipsis (and shown whole in a tooltip). */
  labelWrap = false;

  /** Supporting texts below their labels wrap instead of being one line cut with an ellipsis. */
  supportingWrap = false;

  /** Pins the rows of the open parents above what is shown at the top of the scrolling box. On by default; `sticky-parents="false"` turns it off. */
  stickyParents = true;

  /** The most rows pinned at once, the innermost parents winning. */
  stickyMax = 2;

  /** Lets people rename items in place: a double-click on a row's label, or F2, opens a text field; the tree emits `rename` and the product sets the label. */
  editable = false;

  /** The accessible name of the field in which a name is edited or a new item named ("Name"). Tanrei ships none. */
  editLabel = '';

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
    if (!this.hasUpdated) this.drawStates();
    this.adoptSheet();
    for (const [type, listener] of this.listeners) this.addEventListener(type, listener);
    this.mutations?.observe(this, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ITEM_ATTRIBUTES });
    this.glyphs.connect();
    if (this.hasUpdated) {
      this.read();
      this.watchScroll();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    for (const [type, listener] of this.listeners) this.removeEventListener(type, listener);
    this.mutations?.disconnect();
    this.glyphs.disconnect();
    this.cutTip.hide();
    this.unwatchScroll();
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

  protected override willUpdate() {
    if (!this.hasUpdated) this.drawStates();
  }

  /**
   * TRV-15, TRV-9: the rows' states — selected, expanded — as the first frame draws them. They are written when the
   * tree is first connected, before anything asks for style (`adoptSheet`'s question, a product that measures what it
   * inserted), and again before the first update for a value set in between: a row styled once without its
   * `aria-selected` would move into the selected condition over TRV-31's motion, as if the selection had changed.
   */
  private drawStates() {
    for (const root of this.roots()) for (let item = firstItem(root); item; item = this.nextShown(item)) this.readState(item);
  }

  protected override updated(changed: PropertyValues) {
    // TRV-41: a selection the tree does not define is none (no rule matches the attribute); a debug build says so.
    if (changed.has('selection') && !SELECTIONS.includes(this.selection)) {
      report(this, 'TRV-41', `selection "${this.selection}" is not a value the tree view defines; it is drawn as "none"`);
    }
    if (changed.has('density')) this.readDensity(String(this.density ?? ''));
    // TRV-41: a value the tree does not define is the default's (no rule matches the attribute); a debug build says so.
    for (const [name, values, fallback] of [
      ['chevron', CHEVRONS, 'start'],
      ['guides', GUIDES, 'none'],
      ['iconSpace', ICON_SPACES, 'auto'],
      ['highlight', HIGHLIGHTS, 'indented'],
    ] as const) {
      const value = String(this[name]);
      if (changed.has(name) && !values.includes(value)) report(this, 'TRV-41', `${name} "${value}" is not a value the tree view defines; it is drawn as "${fallback}"`);
    }
    // TRV-3, TRV-2: a number of points the product chose, written where tree-view.css reads it.
    if (changed.has('indent')) this.writeLength('indent', '--_trv-indent-own', this.indent);
    if (changed.has('iconGap')) this.writeLength('iconGap', '--_trv-icon-gap-own', this.iconGap);
    if (changed.has('indent')) mark(this, 'data-tanrei-flat', this.indent === 0 ? '' : null);
    if (changed.has('stickyMax') && !(Number.isFinite(this.stickyMax) && this.stickyMax >= 0)) report(this, 'TRV-41', `sticky-max "${this.stickyMax}" is not a number of zero or more; it is drawn as 2`);
    // TRV-49: every parent open, or as its open says, at once.
    if (changed.has('expandable') && changed.get('expandable') !== undefined) this.reexpand();
    if (changed.has('chevron') && changed.get('chevron') !== undefined && this.chevron === 'none') for (const item of this.querySelectorAll<Item>('li[role="none"]')) if (isItem(item)) this.checkChevronless(item);
    if (changed.has('stickyParents') || changed.has('stickyMax')) this.watchScroll();
    if (changed.has('label') || !this.named) {
      this.named = true;
      // TRV-54: its label is its whole name over the product's, which names it while the label is empty.
      nameHost(this, this.label);
      // TRV-32: still rendered; a debug build says that the tree has no accessible name.
      if (!this.label && !namedByProduct(this)) report(this, 'TRV-32', 'the tree has no accessible name; give it a label');
    }
    // (No property changed: the product's words did — src/primitives/words.ts.)
    if (changed.has('loadingLabel') || changed.size === 0) for (const loader of this.querySelectorAll<HTMLLIElement>(`li[${LOADING}]`)) this.writeLoader(loader);
    // TRV-41: the new form at once, every parent's open and the focus kept, and no change for it.
    if (changed.has('selection')) this.restate();
    // TRV-46: a field on an item's name closes, giving nothing, when the tree stops being editable.
    if (changed.has('editable') && !this.editable && this.editing?.item) this.closeEdit(false);
    if (changed.has('editLabel') && this.editing) this.nameField(this.editing.field);
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
    return !isDisabled(item) && (this.canChoose(item) || (isParent(item) && this.expandable));
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
    const fixed = !this.expandable;
    for (let above = this.parentOf(item); above; above = this.parentOf(above)) if (!fixed && !above.hasAttribute('data-open')) return false;
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
    this.schedulePin();
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
      mark(row, 'aria-expanded', parent && this.expandable ? String(item.hasAttribute('data-open')) : null);
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
    this.checkChevronless(item);
    // TRV-6: a label written as the row's own text cannot be cut with an ellipsis: it wraps. Said once a tree.
    if (!this.labelWrap && !this.bareReported && [...row.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && !!node.nodeValue?.trim())) {
      this.bareReported = true;
      report(this, 'TRV-6', 'a row’s label is the row’s own text: it wraps instead of being cut to one line; put the label in its element (a <bdi> or a <span>)');
    }
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

  /** The icon of a parent whose chevron is none: a press on it opens and closes the parent (TRV-44). Null otherwise. */
  private toggleIcon(item: Item): HTMLElement | null {
    if (this.chevron !== 'none' || !isParent(item)) return null;
    const icon = rowOf(item)?.querySelector<HTMLElement>(':scope > .tanrei-icon');
    return icon && icon.textContent?.trim() ? icon : null;
  }

  /** TRV-44: with no chevron, a parent with no icon shows nothing of its state on screen; a debug build says so, once. */
  private checkChevronless(item: Item) {
    if (this.chevron !== 'none' || !this.expandable || !isParent(item) || this.toggleIcon(item) || this.chevronlessReported.has(item)) return;
    this.chevronlessReported.add(item);
    report(item, 'TRV-44', 'the tree’s chevron is none and this parent has no icon: nothing on screen shows whether it is open (the arrow keys still open it); give it an icon and an open icon (data-open-icon)');
  }
  private readonly chevronlessReported = new WeakSet<Element>();
  private bareReported = false;

  /** TRV-3, TRV-2: writes a length the product chose, or takes it away for auto; one that is no number of zero or more is auto, reported. */
  private writeLength(name: string, property: string, value: number | null) {
    if (value === null || value === undefined) this.style.removeProperty(property);
    else if (Number.isFinite(value) && value >= 0) this.style.setProperty(property, `${value}px`);
    else {
      this.style.removeProperty(property);
      report(this, 'TRV-41', `${name} "${value}" is not a number of zero or more; it is drawn as auto`);
    }
  }

  /** TRV-49: the tree became expandable or stopped being so: every parent is drawn as it now counts, at once. */
  private reexpand() {
    for (const item of this.querySelectorAll<Item>('li[role="none"]')) {
      if (!isItem(item) || item.closest(TAG) !== this) continue;
      this.readState(item);
      const list = listOf(item);
      if (!list) continue;
      if (isOpen(item)) {
        this.rest(list, true);
        this.readList(list, true);
      } else this.rest(list, false);
    }
    this.readStop();
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
    const own = (node: Node) => isGlyphProbe(node) || (node instanceof Element && (node.classList.contains('ripple') || node.hasAttribute(LOADING) || node.hasAttribute(OWN_LIST) || node.hasAttribute(NEW) || node.hasAttribute(EDIT) || node.hasAttribute(TIP)));
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
    // TRV-46: the item whose name is edited went away, or became disabled: the field closes, giving nothing.
    const edited = this.editing?.item;
    if (edited && (!edited.isConnected || !this.contains(edited) || isDisabled(edited))) this.closeEdit(false);
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
    if (!this.expandable || item.hasAttribute('data-open') === open) return;
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
    // TRV-46: a parent that closes around an open field closes it, giving nothing.
    if (!open && list && this.editing && list.contains(this.editing.li)) this.closeEdit(false);
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
    this.schedulePin();
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

  // ── Editing in place (TRV-45 to TRV-48) ──────────────────────────────────────────────────────────────────────

  /** The field that is open, on an item's name or on a new row's: one at a time. */
  private editing: Editing | null = null;

  /**
   * Opens the edit field on an item's name (TRV-45), as F2 and a double-click on its label do: only while the tree is
   * `editable`, and not on a disabled item or one whose label is the product's own inline content. Returns whether it
   * opened one.
   */
  edit(item: HTMLLIElement): boolean {
    if (!this.editable || !isItem(item) || item.closest(TAG) !== this || isDisabled(item) || !this.shown(item)) return false;
    const row = rowOf(item);
    if (!row || !plainLabel(row)) return false;
    if (this.editing?.item === item) return true;
    if (this.editing) this.commitEdit(false);
    const previous = labelOf(item);
    this.cutTip.hide();
    const field = this.openField(item, row, previous, item);
    // The name without its extension, for a leaf whose label has one (Finder, Explorer, VS Code); else the whole label.
    const dot = isParent(item) ? -1 : previous.lastIndexOf('.');
    void field.updateComplete.then(() => {
      if (this.editing?.field !== field) return;
      if (dot > 0) field.setSelectionRange(0, dot);
      else field.select();
    });
    return true;
  }

  /**
   * Asks for a new item (TRV-48): a row of the tree's own, at the level of the selected item and after its rows, with
   * an empty field in which the user names it. `create` carries the name; the product adds the item. Returns whether
   * the row was added (a tree with no list has nowhere to put it).
   */
  create(options: TanreiTreeViewCreateOptions = {}): boolean {
    if (this.editing) this.commitEdit(false);
    const reference = this.reference();
    const list = reference ? reference.parentElement : (this.roots()[0] ?? null);
    if (!list) return false;
    const parent = !!options.parent;
    const back = this.active ?? this.last;
    const li = document.createElement('li');
    li.setAttribute(NEW, '');
    li.setAttribute('role', 'none');
    if (parent) li.setAttribute('data-expandable', '');
    const row = document.createElement('span');
    row.setAttribute('role', 'treeitem');
    if (parent) row.setAttribute('aria-expanded', 'false');
    if (options.icon) {
      const icon = document.createElement('span');
      icon.className = 'tanrei-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = options.icon;
      row.append(icon);
    }
    li.append(row);
    // After the rows the reference shows: its own `<li>` holds them. (Before a loading row, which stays last.)
    if (reference) list.insertBefore(li, reference.nextSibling);
    else list.insertBefore(li, list.querySelector(`:scope > li[${LOADING}]`));
    // (The item it follows: the reference, or else the last item of the first level.)
    const after = reference ?? lastItem(list);
    this.openField(li, row, '', null, { parent, within: reference ? this.parentOf(reference) : null, after: after === li ? null : after, back });
    return true;
  }

  /**
   * TRV-48: the item a new row stands beside — the first of these that is shown: the selected item (single: the one
   * value names; multiple: the focused row where it is selected, else the first selected in the order drawn), the row
   * that has or last had focus, and none.
   */
  private reference(): Item | null {
    const mode = this.mode;
    if (mode === 'multiple' && this.last && this.selected.has(this.last) && this.shown(this.last)) return this.last;
    if (mode !== 'none') {
      let first: Item | null = null;
      for (const item of this.selected) {
        if (!this.shown(item)) continue;
        if (!first || item.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) first = item as Item;
      }
      if (first) return first;
    }
    const focused = this.active ?? this.last;
    return this.shown(focused) ? focused : null;
  }

  /** Puts an edit field in a row: in the label's place, with focus, named by the product's words (TRV-46, TRV-32). */
  private openField(li: HTMLLIElement, row: HTMLElement, text: string, item: Item | null, create?: Editing['create']): TanreiEmbeddedTextInput {
    const box = document.createElement('span');
    box.setAttribute(EDIT, '');
    const field = document.createElement('tanrei-embedded-text-input') as TanreiEmbeddedTextInput;
    field.value = text;
    field.autocomplete = 'off';
    this.nameField(field);
    box.append(field);
    row.append(box);
    row.setAttribute(EDITING, '');
    this.editing = { li, item, box, field, previous: text, create };
    // The field's own events stay in its row: its `change` is not the tree's.
    for (const type of ['change', 'input', 'rowschange']) box.addEventListener(type, (event) => event.stopPropagation());
    box.addEventListener('action', (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (this.editing?.box === box) this.commitEdit(true);
    });
    box.addEventListener('keydown', (event) => {
      const key = event as KeyboardEvent;
      if (key.key !== 'Escape' || key.isComposing) return;
      key.preventDefault();
      key.stopPropagation();
      if (this.editing?.box === box) this.takeField(true);
    });
    // Leaving the field by any other means gives the name (TRV-46): Tab, a press elsewhere, the window losing focus.
    box.addEventListener('focusout', (event) => {
      const to = (event as FocusEvent).relatedTarget;
      if (to instanceof Node && box.contains(to)) return;
      if (this.editing?.box === box) this.commitEdit(false);
    });
    void field.updateComplete.then(() => {
      if (this.editing?.field === field) field.focus();
    });
    return field;
  }

  /** The field's name: the product's words (TRV-32). Opened all the same without them, and a debug build says so. */
  private nameField(field: TanreiEmbeddedTextInput) {
    const name = this.words.get('editLabel', this.editLabel);
    field.label = name;
    if (!name) this.words.missing('editLabel', { id: 'TRV-32', effect: 'the edit field opens and works, and has no accessible name' });
  }

  /**
   * Takes the field away (and a new row with it). On Enter or Escape focus goes back to the item's row (TRV-46), or
   * from a new row to the row that had it (TRV-48); a field that lost focus leaves focus where it went.
   */
  private takeField(back: boolean): Editing | null {
    const editing = this.editing;
    if (!editing) return null;
    this.editing = null;
    const row = editing.box.parentElement;
    const hadFocus = editing.box.contains(document.activeElement);
    const to = editing.item ?? editing.create?.back ?? null;
    if (back && hadFocus && to && this.shown(to)) this.focusRow(to, false);
    editing.box.remove();
    row?.removeAttribute(EDITING);
    if (!editing.item) editing.li.remove();
    return editing;
  }

  /** A field that must close, giving nothing (TRV-46): its item went, became disabled or hidden, or the tree stopped being editable. */
  private closeEdit(back: boolean) {
    this.takeField(back);
  }

  /** Enter, or focus that left the field: the name is given where it is one (TRV-46, TRV-48). */
  private commitEdit(back: boolean) {
    const editing = this.editing;
    if (!editing) return;
    const label = editing.field.value.trim();
    if (editing.item) {
      const item = editing.item;
      this.takeField(back);
      if (label && label !== editing.previous) item.dispatchEvent(new CustomEvent<TanreiTreeViewRenameDetail>('rename', { bubbles: true, detail: { label, previous: editing.previous } }));
      return;
    }
    const create = editing.create!;
    // An empty name gives nothing: the row goes, and focus goes back to where it was.
    if (!label) {
      this.takeField(back);
      return;
    }
    const list = editing.li.parentElement;
    const before = new Set(list ? [...list.children] : []);
    const hadFocus = editing.box.contains(document.activeElement);
    this.takeField(false);
    this.dispatchEvent(new CustomEvent<TanreiTreeViewCreateDetail>('create', { bubbles: true, detail: { label, parent: create.parent, within: create.within, after: create.after } }));
    // The item the product added in the new row's place, in answer, takes the focus the field had.
    const added = list ? [...list.children].find((child): child is Item => !before.has(child) && isItem(child)) : undefined;
    if (added && hadFocus) {
      if (this.mutations) this.mutated(this.mutations.takeRecords());
      if (this.shown(added)) this.focusRow(added);
    } else if (back && hadFocus && create.back && this.shown(create.back)) this.focusRow(create.back, false);
  }

  /** TRV-45: a double-click on a row's label opens the field on its name, where the tree is editable. */
  private readonly onDoubleClick = (event: Event) => {
    if (!this.editable || inField(event.target)) return;
    const click = event as MouseEvent;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!item || !row || !onLabel(row, click.clientX, click.clientY)) return;
    this.edit(item);
  };

  // ── The tooltip of a cut text (TRV-50) ────────────────────────────────────────────────────────────────────────

  /** The row whose text the tooltip shows, or would show. */
  private tipRow: HTMLElement | null = null;
  private tipElement: TanreiTooltip | null = null;
  private readonly cutTip = new CutTextTip({
    // (Made and moved into a row only to be opened: a focus that moves changes no row's children.)
    tip: () => this.tipElement,
    place: () => void this.placeTip(),
    content: () => this.cutContent(),
    // tree-view.css writes the tooltip's waits as a transition of the tree.
    clock: () => this,
  });

  /** The tree's one tooltip, in the row whose text it shows: an empty tooltip over the text (tree-view.css), opened by script. */
  private placeTip(): TanreiTooltip | null {
    const row = this.tipRow;
    let tip = this.tipElement;
    if (!row || !row.isConnected) return tip;
    if (!tip) {
      tip = document.createElement('tanrei-tooltip') as TanreiTooltip;
      tip.setAttribute(TIP, '');
      tip.setAttribute('no-describe', '');
      tip.setAttribute('aria-hidden', 'true');
      this.tipElement = tip;
    }
    if (tip.parentElement !== row) {
      if (tip.open) tip.open = false;
      row.append(tip);
    }
    return tip;
  }

  /** What is cut in the row the tooltip is for: its label, or the label and its supporting text below it. */
  private cutContent(): CutTextContent | null {
    const row = this.tipRow;
    const item = row?.parentElement;
    if (!row || !isItem(item) || row.hasAttribute(EDITING)) return null;
    const label = [...row.children].find((child) => !child.matches(`${PARTS}, [${EDIT}]`)) ?? null;
    const supporting = row.querySelector<HTMLElement>('[data-supporting-text]');
    const below = !!supporting && getComputedStyle(supporting).display === 'block';
    if (!isCut(label) && !(below && isCut(supporting))) return null;
    const name = labelOf(item);
    const note = supporting?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return note ? { title: name, text: note } : { text: name };
  }

  // ── Choosing several (TRV-52) ─────────────────────────────────────────────────────────────────────────────────

  /** The item a range is measured from: the one last chosen or unchosen by itself. */
  private anchor: Item | null = null;
  /** The values held before the range now being drawn began: a range that shrinks gives back what it took. */
  private rangeBase: string[] | null = null;

  /** The multi-select model's keys; true where the key was one of them (and is spent). */
  private multiKey(key: KeyboardEvent, item: Item): boolean {
    if (key.altKey) return false;
    const primary = key.ctrlKey || key.metaKey;
    const spend = () => {
      key.preventDefault();
      return true;
    };
    if (key.shiftKey && !primary && (key.key === 'ArrowDown' || key.key === 'ArrowUp')) {
      const to = key.key === 'ArrowDown' ? this.nextShown(item) : this.previousShown(item);
      if (to) {
        this.focusRow(to);
        this.selectRange(this.anchor ?? item, to);
      }
      return spend();
    }
    if (key.shiftKey && !primary && key.key === ' ') {
      this.selectRange(this.anchor ?? item, item);
      return spend();
    }
    if (key.shiftKey && primary && (key.key === 'Home' || key.key === 'End')) {
      const to = key.key === 'Home' ? this.firstShown() : this.lastShown();
      if (to) {
        this.anchor = item;
        this.rangeBase = null;
        this.focusRow(to);
        this.selectRange(item, to);
      }
      return spend();
    }
    if (primary && !key.shiftKey && key.key.toLowerCase() === 'a') {
      this.selectAll();
      return spend();
    }
    return false;
  }

  /** The rows shown, in the order drawn. */
  private shownRows(): Item[] {
    const rows: Item[] = [];
    for (let at = this.firstShown(); at; at = this.nextShown(at)) rows.push(at);
    return rows;
  }

  /** Selects every item that can be chosen from `from` to `to`, on what was held before the range began; one change. */
  private selectRange(from: Item, to: Item) {
    this.anchor ??= from;
    const rows = this.shownRows();
    let a = rows.indexOf(from);
    let b = rows.indexOf(to);
    if (a < 0 || b < 0) return;
    if (a > b) [a, b] = [b, a];
    const range = rows.slice(a, b + 1).filter((row) => this.canChoose(row)).map(valueOf);
    const base = this.rangeBase ?? [...this.values];
    this.rangeBase = base;
    this.setValues([...new Set([...base, ...range])]);
  }

  /** Selects every item that can be chosen among the rows shown, keeping what is held; one change. */
  private selectAll() {
    this.rangeBase = null;
    const all = this.shownRows().filter((row) => this.canChoose(row)).map(valueOf);
    this.setValues([...new Set([...this.values, ...all])]);
  }

  /** The new values, drawn and told once where they differ. */
  private setValues(next: string[]) {
    if (next.length === this.values.length && next.every((value, index) => value === this.values[index])) return;
    this.values = next;
    this.readSelection();
    this.dispatchEvent(new CustomEvent<TanreiTreeViewChangeDetail>('change', { bubbles: true, detail: { values: [...this.values] } }));
  }

  // ── Pinned parent rows (TRV-53) ───────────────────────────────────────────────────────────────────────────────

  /** The scrolling box the tree stands in, the rows pinned in it now, and the frame that will pin them again. */
  private scroller: Element | null = null;
  private pinned: HTMLElement[] = [];
  private pinFrame = 0;
  /** A scroll anywhere in the tree's root: the box that scrolled, where it holds the tree, is the tree's scrolling box (it may have become one after the tree was drawn). */
  private readonly onScroll = (event: Event) => {
    const box = event.target;
    if (box instanceof Element && box !== document.documentElement && box !== document.body && box.contains(this)) {
      if (!this.scroller || box.contains(this.scroller)) this.scroller = this.scroller && box.contains(this.scroller) && this.scroller !== box ? this.scroller : box;
      this.schedulePin();
    }
  };
  private scrollRoot: Document | ShadowRoot | null = null;

  /** Finds the scrolling box and follows its scroll, or pins nothing where there is none or pinning is off. */
  private watchScroll() {
    this.unwatchScroll();
    if (!this.isConnected || !this.stickyParents || !(this.stickyMax > 0)) return;
    this.scroller = scrollBoxOf(this);
    this.scrollRoot = this.getRootNode() as Document | ShadowRoot;
    this.scrollRoot.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    this.schedulePin();
  }

  private unwatchScroll() {
    this.scrollRoot?.removeEventListener('scroll', this.onScroll, { capture: true });
    this.scrollRoot = null;
    this.scroller = null;
    if (this.pinFrame) cancelAnimationFrame(this.pinFrame);
    this.pinFrame = 0;
    this.unpin();
  }

  private schedulePin() {
    if (this.pinFrame || !this.scroller || typeof requestAnimationFrame !== 'function') return;
    this.pinFrame = requestAnimationFrame(() => {
      this.pinFrame = 0;
      this.pin();
    });
  }

  private unpin() {
    for (const row of this.pinned) {
      row.removeAttribute(PINNED);
      row.style.removeProperty('--_trv-pin-top');
    }
    this.pinned = [];
  }

  /**
   * Pins the rows of the innermost `stickyMax` open parents of the topmost row shown below the pinned rows, each at
   * the height of the ones above it. Measured twice: the rows the pinned ones cover are not the top's.
   */
  private pin() {
    const box = this.scroller;
    const max = Math.floor(this.stickyMax);
    if (!box || !box.isConnected || !this.stickyParents || !(max > 0)) return this.unpin();
    // (A pinned row sticks to the box's content edge: inside its padding.)
    const top = box.getBoundingClientRect().top + box.clientTop + (Number.parseFloat(getComputedStyle(box).paddingTop) || 0);
    let chain = this.pinChain(top, max);
    const covered = chain.reduce((sum, item) => sum + (rowOf(item)?.offsetHeight ?? 0), 0);
    if (covered) chain = this.pinChain(top + covered, max);
    const rows = chain.map((item) => rowOf(item)).filter((row): row is HTMLElement => !!row);
    for (const row of this.pinned) {
      if (rows.includes(row)) continue;
      row.removeAttribute(PINNED);
      row.style.removeProperty('--_trv-pin-top');
    }
    let offset = 0;
    rows.forEach((row, index) => {
      mark(row, PINNED, index === rows.length - 1 ? 'last' : '');
      row.style.setProperty('--_trv-pin-top', `${offset}px`);
      offset += row.offsetHeight;
    });
    this.pinned = rows;
  }

  /** The open parents above the topmost row whose own line reaches below `y`, outer first, the innermost `max` of them. */
  private pinChain(y: number, max: number): Item[] {
    let items = this.roots().flatMap((root) => itemsIn(root));
    let at: Item | null = null;
    for (;;) {
      const li = firstBelow(items, y);
      if (!li) break;
      at = li;
      const liTop = li.getBoundingClientRect().top;
      const rowBottom = liTop + (rowOf(li)?.offsetHeight ?? 0);
      if (rowBottom > y || !isOpen(li)) break;
      items = itemsIn(listOf(li));
      if (!items.length) break;
    }
    if (!at) return [];
    const chain: Item[] = [];
    // The row itself, where it is an open parent that has scrolled under the top: its items are what is shown.
    if (isOpen(at) && at.getBoundingClientRect().top < y && firstItem(listOf(at))) chain.push(at);
    for (let above = this.parentOf(at); above; above = this.parentOf(above)) chain.push(above);
    return chain.slice(0, max).reverse();
  }

  /** TRV-12, TRV-53: a focused row under the pinned rows is brought into view below them. */
  private belowPinned(row: HTMLElement) {
    const box = this.scroller;
    if (!box || !this.pinned.length || this.pinned.includes(row)) return;
    const covered = this.pinned.reduce((sum, pinned) => sum + pinned.offsetHeight, 0);
    const limit = box.getBoundingClientRect().top + box.clientTop + (Number.parseFloat(getComputedStyle(box).paddingTop) || 0) + covered;
    const rowTop = row.getBoundingClientRect().top;
    if (rowTop < limit) box.scrollTop -= limit - rowTop;
    this.schedulePin();
  }

  // ── Focus (TRV-12, TRV-19) ────────────────────────────────────────────────────────────────────────────────────

  /** Moves focus to an item's row, and brings the row into view by the least distance that shows it whole (TRV-12). */
  private focusRow(item: Item, reveal = true) {
    this.last = item;
    this.readStop();
    const row = rowOf(item);
    row?.focus({ preventScroll: true });
    if (reveal && row) {
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.belowPinned(row);
    }
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
    // TRV-50: keyboard focus shows a cut text whole.
    const row = event.target as HTMLElement;
    if (row !== this.tipRow) {
      this.cutTip.hide();
      this.tipRow = row;
    }
    this.cutTip.focus(row.matches(':focus-visible'));
    // TRV-30: where the browser has no style queries, the focus style is read when focus arrives.
    if (!styleQueries()) syncFocusStyle(this, event.target as HTMLElement);
  };

  private readonly onFocusOut = (event: Event) => {
    const item = this.rowItem(event.target) ?? ((event.target as Element | null)?.parentElement as Item | null);
    if (!isItem(item)) return;
    this.presses.get(event.target as HTMLElement)?.onBlur();
    this.cutTip.blur();
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
    if (key.isComposing) return;
    // TRV-50: Escape hides the tooltip of a cut text, and does nothing else then.
    if (key.key === 'Escape' && this.cutTip.escape()) {
      key.preventDefault();
      return;
    }
    // TRV-52: the multi-select model's keys.
    if (this.mode === 'multiple' && this.multiKey(key, item)) return;
    // TRV-22: a key pressed with a modifier is the platform's (Shift alone types a character).
    if (key.altKey || key.ctrlKey || key.metaKey) return;
    this.checkDepth();
    const move = (to: Item | null) => {
      key.preventDefault();
      if (to && to !== item) this.focusRow(to);
    };
    // TRV-45: F2 opens the field on the focused row's name, where the tree is editable.
    if (key.key === 'F2' && !key.shiftKey && this.editable) {
      key.preventDefault();
      this.edit(item);
      return;
    }
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
        } else if (open && !isDisabled(item) && this.expandable) this.toggle(item, false);
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
        this.cutTip.press();
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
    this.anchor = item;
    this.rangeBase = null;
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
  #onChevron(item: Item, row: HTMLElement, x: number): boolean {
    const style = getComputedStyle(row);
    const rtl = style.direction === 'rtl';
    const box = row.getBoundingClientRect();
    // The least width is the tree's own, read where the stylesheet has a real property compute it.
    const { target } = treeLengths(this);
    const least = target > 0 ? target : 0;
    const fromStart = rtl ? box.right - x : x - box.left;
    if (this.chevron === 'none') {
      // TRV-44: the icon's hit area, from the row's start edge to the middle of the gap after the icon.
      const icon = this.toggleIcon(item);
      if (!icon) return false;
      const glyph = icon.getBoundingClientRect();
      const after = Number.parseFloat(getComputedStyle(icon)[rtl ? 'marginLeft' : 'marginRight']) || 0;
      return fromStart <= Math.max((rtl ? box.right - glyph.left : glyph.right - box.left) + after / 2, least);
    }
    if (this.chevron === 'end') {
      // TRV-26: from the middle of the gap before the chevron's box to the row's end edge.
      const mark = getComputedStyle(row, '::before');
      const reach = Number.parseFloat(rtl ? style.paddingLeft : style.paddingRight) + Number.parseFloat(mark.width) + Number.parseFloat(rtl ? mark.marginRight : mark.marginLeft) / 2;
      return box.width - fromStart <= Math.max(reach, least);
    }
    const mark = getComputedStyle(row, '::before');
    const reach = Math.max(
      Number.parseFloat(rtl ? style.paddingRight : style.paddingLeft) + Number.parseFloat(mark.width) + (Number.parseFloat(mark.marginLeft) + Number.parseFloat(mark.marginRight)) / 2,
      least,
    );
    return fromStart <= reach;
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

  private readonly releasePress = (event?: Event) => {
    this.held?.release(event);
    this.held = null;
    this.heldRow = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const pointer = event as PointerEvent;
    // TRV-46: a press in the edit field is the field's.
    if (inField(event.target)) return;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!item || !row || (pointer.button !== 0 && pointer.pointerType === 'mouse')) return;
    this.cutTip.press();
    this.checkDepth();
    if (!this.answers(item)) return;
    this.held = this.pressOf(item, row);
    this.heldRow = row;
    this.held.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the row it holds.
  private readonly onPointerOut = (event: Event) => {
    const pointer = event as PointerEvent;
    const to = pointer.relatedTarget;
    if (this.heldRow && !(to instanceof Node && this.heldRow.contains(to))) this.releasePress(event);
    // TRV-50: the pointer left the row whose text the tooltip shows (the tooltip stands in the row: over it is in it).
    if (this.tipRow && !(to instanceof Node && this.tipRow.contains(to)) && this.tipRow.contains(pointer.target as Node)) this.cutTip.pointerLeave(pointer.pointerType);
  };

  private readonly onPointerOver = (event: Event) => {
    const pointer = event as PointerEvent;
    if (inField(event.target)) return;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!row) return;
    const from = pointer.relatedTarget;
    if (from instanceof Node && row.contains(from)) return;
    if (row !== this.tipRow) {
      this.cutTip.hide();
      this.tipRow = row;
    }
    this.cutTip.pointerEnter(pointer.pointerType);
  };

  private readonly onClick = (event: Event) => {
    const click = event as MouseEvent;
    if (inField(event.target)) return;
    const item = this.itemOf(event.target);
    const row = item ? rowOf(item) : null;
    if (!item || !row || click.button !== 0 || !this.answers(item)) return;
    // (A click that names no place — one made by script — is a press on the row.)
    const placed = click.detail > 0 || click.clientX !== 0 || click.clientY !== 0;
    const chevron = placed && isParent(item) && this.canChoose(item) && this.#onChevron(item, row, click.clientX);
    // TRV-52: a press with Shift selects from the anchor to the pressed row.
    if (!chevron && click.shiftKey && this.mode === 'multiple' && this.canChoose(item)) {
      this.selectRange(this.anchor ?? this.active ?? item, item);
      return;
    }
    this.activate(item, chevron);
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
    ['pointerover', this.onPointerOver],
    ['dragstart', this.releasePress],
    ['click', this.onClick],
    ['keydown', this.onKeyDown],
    ['keyup', this.onKeyUp],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
    ['beforematch', this.onBeforeMatch],
    ['dblclick', this.onDoubleClick],
  ];
}

/** The nodes of a row that are its label: what is not one of its other parts (TRV-6). */
const labelNodes = (row: Element) => [...row.childNodes].filter((node) => (node.nodeType === Node.TEXT_NODE && !!node.nodeValue?.trim()) || (node instanceof Element && !node.matches(`${PARTS}, [${EDIT}]`)));

/** TRV-45: a label of plain text — the row's own text, or one element around text — and not the product's inline content. */
function plainLabel(row: Element): boolean {
  return labelNodes(row).every((node) => !(node instanceof Element) || [...node.children].every((child) => child.hasAttribute('data-supporting-text')));
}

/** TRV-45: whether a point is on the text of a row's label (its supporting text included: the same block of text). */
function onLabel(row: Element, x: number, y: number): boolean {
  const range = document.createRange();
  for (const node of labelNodes(row)) {
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

/** The items of a list (not its loading row, nor a new row). */
const itemsIn = (list: Element | null): Item[] => (list ? [...list.children].filter((child): child is Item => isItem(child)) : []);

/** TRV-53: the first of `items` (in the order drawn) whose box reaches below `y`; an item's box holds its rows. */
function firstBelow(items: Item[], y: number): Item | null {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (items[middle].getBoundingClientRect().bottom > y) high = middle;
    else low = middle + 1;
  }
  return items[low] ?? null;
}

/** TRV-53: the scrolling box an element stands in — the nearest ancestor (across shadow roots) that scrolls its content; the page's own scrolling is not one. */
function scrollBoxOf(element: Element): Element | null {
  for (let at: Element | null = element.parentElement ?? ((element.getRootNode() as ShadowRoot).host ?? null); at; at = at.parentElement ?? ((at.getRootNode() as ShadowRoot).host ?? null)) {
    if (at === document.body || at === document.documentElement) return null;
    const overflow = getComputedStyle(at).overflowY;
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') return at;
  }
  return null;
}

/** Whether an event happened in an edit field's box (TRV-46): the field's, not the row's. */
const inField = (target: EventTarget | null) => target instanceof Element && !!target.closest(`[${EDIT}]`);

/** The order a row's parts are read in as its description (TRV-32): supporting text, trailing content, trailing text. */
function order(part: Element): number {
  return part.hasAttribute('data-supporting-text') ? 0 : part.hasAttribute('data-trailing') ? 1 : part.hasAttribute('data-trailing-text') ? 2 : 3;
}

// TRV-46, TRV-50: the edit field and the tooltip of a cut text are those components' own, defined here where a bundle
// would otherwise drop their modules as having no side effects.
if (!customElements.get('tanrei-embedded-text-input')) customElements.define('tanrei-embedded-text-input', TanreiEmbeddedTextInput);
if (!customElements.get('tanrei-tooltip')) customElements.define('tanrei-tooltip', TanreiTooltip);
// TRV-54: the host carries the tree role, and holds the product's name while its label names it.
holdsProductName(TanreiTreeView);
if (!customElements.get('tanrei-tree-view')) customElements.define('tanrei-tree-view', TanreiTreeView);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tree-view': TanreiTreeView;
  }
}
