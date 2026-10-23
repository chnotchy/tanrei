import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, GlyphDrawnController, PressController, report, styleQueries, syncFocusStyle } from '../../primitives/index.js';
import { LINK_KEYS } from '../../primitives/link.js';
import { debugBuild } from '../../primitives/report.js';
import type { TanreiTableOfContentsDensityRegistry } from '../../registry.js';
import { ownDirection } from '../../styles/product-text.js';
import { styles } from './table-of-contents.styles.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiElement } from '../../primitives/element.js';
import { flatParent } from '../../primitives/flat-tree.js';

/** How the table of contents stands (TOC-1, TOC-25): the title and the whole list, or one row that opens the list. */
export type TanreiTableOfContentsPresentation = 'list' | 'compact';
/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiTableOfContentsDensity = keyof TanreiTableOfContentsDensityRegistry;
/** Who decides which item is current (TOC-9, TOC-15): the element, from where the targets are, or the product. */
export type TanreiTableOfContentsTracking = 'auto' | 'manual';
/** `currentchange` (TOC-9 to TOC-16): the new current item's `href`, or an empty string when no item is current. */
export interface TanreiTableOfContentsCurrentChangeDetail {
  href: string;
}
/** `select` (TOC-12): the `href` of the item that was activated. Cancel it to keep the browser from following the link. */
export interface TanreiTableOfContentsSelectDetail {
  href: string;
}
/** `toggle` (TOC-26): the compact presentation's new `open`. */
export interface TanreiTableOfContentsToggleDetail {
  open: boolean;
}

// The text of src/styles/table-of-contents.css — the stylesheet that draws the product's list — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. Read once; a build that wrote
// nothing leaves it empty, and the list is then drawn by the page's own copy of `@tanrei/web/table-of-contents.css`.
declare const TANREI_TABLE_OF_CONTENTS_CSS: string;
const LIST_CSS: string = (() => {
  try {
    return TANREI_TABLE_OF_CONTENTS_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-table-of-contents';
const PREFIX = '--tanrei-comp-table-of-contents';
const PRESENTATIONS: readonly string[] = ['list', 'compact'];
const TRACKINGS: readonly string[] = ['auto', 'manual'];
const CORE_DENSITIES: readonly string[] = ['regular', 'compact'];
const DEFAULT_DENSITY = 'regular';
/** The members of the density axis (`dev.tanrei.axes.density.members`) as table-of-contents.css names them. */
const DENSITY_MEMBERS: readonly (readonly [string, string])[] = [
  ['--_toc-row-height', 'row-height-*'],
  ['--_toc-row-pad', 'row-padding-block-*'],
];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** What the element wrote on the product's elements (see table-of-contents.css). */
const LABEL = 'data-tanrei-label';
const EMPTY = 'data-tanrei-empty';
const NEUTRAL = 'data-tanrei-neutral';
/** A character with a direction of its own: a letter of any script (digits, signs and spaces have none). */
const STRONG = /\p{L}/u;
/** TOC-39: deeper than this is reported. */
const MAX_DEPTH = 3;
/** TOC-9: a target has reached the line when it is less than one unit of layout short of it. */
const UNIT = 1;
/** A row moved by less than this has not moved: boxes are laid out on fractions of a pixel. */
const SLACK = 0.5;
/**
 * TOC-12: how long the view must have been still, after an item was chosen or the address named one, before the move
 * to the target is taken to be over — from then on the person's next scrolling ends the hold. Not a design value: the
 * time between two `scroll` events of one glide is a frame, and this is several.
 */
const STILL_MS = 150;
/** The keys that scroll a view (TOC-12: "a key"). */
const SCROLL_KEYS: readonly string[] = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

type Root = Document | ShadowRoot;
/** What an item's href leads to: an element of the page, the top of the page (TOC-10), or nothing (TOC-16). */
type Target = Element | 'top' | null;

/** One item: the product's `<li>` and its anchor. */
interface Item {
  li: HTMLElement;
  a: HTMLAnchorElement;
  /** The anchor's `href` attribute as it was written: what `current`, `select` and `currentchange` carry. */
  href: string;
  label: string;
  depth: number;
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
      // A browser that cannot construct it: the page's own copy of table-of-contents.css draws the list.
    }
    sheets.set(id, made);
  }
  return made;
}

/** TOC-39: a density a design system added — the default's rules, read from that density's tokens. */
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

const decoded = (fragment: string) => {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
};

/** The fragment an anchor names on the page it is on (`#install` → `install`), or null where it leads elsewhere. */
function fragmentOf(a: HTMLAnchorElement): string | null {
  const address = a.href;
  const at = address.indexOf('#');
  if (at < 0 || address.slice(0, at) !== location.href.split('#')[0]) return null;
  return decoded(address.slice(at + 1));
}

/**
 * Where a fragment leads, as the browser reads it: the element with that id, else the anchor with that name, else —
 * for the empty fragment and for `top` — the top of the document (TOC-10); nothing otherwise (TOC-16).
 */
function targetOf(fragment: string | null): Target {
  if (fragment === null) return null;
  if (fragment === '') return 'top';
  const named = document.getElementById(fragment) ?? [...document.getElementsByName(fragment)].find((element) => element.localName === 'a') ?? null;
  return named ?? (fragment.toLowerCase() === 'top' ? 'top' : null);
}

/** A length of a computed style in pixels: `auto` and anything unreadable are 0, a percentage is of `whole`. */
function pixels(value: string, whole: number): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith('%') ? (number / 100) * whole : number;
}

const scrolls = (element: Element) => /^(auto|scroll|overlay)$/.test(getComputedStyle(element).overflowY) && element.scrollHeight - element.clientHeight > UNIT;
const isPage = (element: Element) => element === document.documentElement || element === document.body;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lists the headings of the page being read as links to them and marks the one whose section is being read.
 *
 * Sub-headings are set in under their heading; where there is no room beside the text, the compact presentation is one
 * row that names the current section and opens the same list.
 *
 * Contract: specs/table-of-contents.spec.json. The items are the product's own nested list of anchors, which stay in
 * the document (TOC-6): before the element is defined, and with scripting off, the page holds a plain list of links
 * that work.
 *
 * ```html
 * <tanrei-table-of-contents label="On this page">
 *   <ul>
 *     <li><a href="#install">Install</a>
 *       <ul>
 *         <li><a href="#npm">npm</a></li>
 *       </ul>
 *     </li>
 *     <li><a href="#configure">Configure</a></li>
 *   </ul>
 * </tanrei-table-of-contents>
 * ```
 *
 * An item is an `<li>` whose first child is its anchor — `href` is the anchor's own attribute and the label its text —
 * and the item's own items are a list after the anchor, inside the same `<li>`. Everything drawn on the list is
 * `@tanrei/web/table-of-contents.css` (every value a `--tanrei-comp-table-of-contents-*` token), which draws it before
 * and without this script; the element adds the same sheet to the root it is connected to. The shadow root holds only
 * what the product did not write: a `<nav>` named by `label`, the title, and the compact presentation's block and row.
 *
 * Which item is current (`tracking="auto"`, TOC-9 to TOC-16): the last item, in the page's order, whose target has
 * reached the line — where the browser itself rests a target it is sent to: the top of the view that scrolls the
 * targets, plus that view's `scroll-padding-block-start`, plus the target's own `scroll-margin-block-start`. So a
 * fixed header and the space a heading keeps above itself are declared once, in CSS, and never passed to the element.
 * It reads the view on `scroll` (one passive listener, coalesced to a frame), on `resize` and when what it holds
 * changes size; at rest it runs nothing. It never scrolls the view that holds the targets, never writes the address
 * and never focuses anything in the content.
 *
 * @tag tanrei-table-of-contents
 * @slot - The items: the product's own nested list (`<ul>` of `<li>`, each with its `<a href>` first). It stays in the document.
 * @slot title - The product's own title in place of the label's text: a heading of the level the page's outline needs. Drawn in the title's text style whatever its level; `label` still names the landmark and the compact row.
 * @csspart nav - The navigation landmark; in the compact presentation the filled block.
 * @csspart title - The title above the list (list presentation).
 * @csspart disclosure-row - The compact presentation's row: a button that shows and hides the list.
 * @csspart icon - The row's chevron (hidden from assistive technology).
 * @csspart list - The box that holds the list; in the compact presentation the part that scrolls where the block is held to less than the list needs.
 * @fires {CustomEvent<TanreiTableOfContentsCurrentChangeDetail>} currentchange - The current item changed while tracking is auto; `detail.href` is the new item's href, or an empty string. Never for a value the product set, never while tracking is manual.
 * @fires {CustomEvent<TanreiTableOfContentsSelectDetail>} select - An item was activated; `detail.href` is its href. Dispatched from the anchor's click, before the browser follows the link; cancelable, cancelling the click with it.
 * @fires {CustomEvent<TanreiTableOfContentsToggleDetail>} toggle - The compact presentation's list was shown or hidden by the user (the row, an item chosen, Escape); `detail.open` is the new state.
 */
export class TanreiTableOfContents extends TanreiElement {
  static override styles = styles;

  private readonly availability = new AvailabilityController(this, 'table-of-contents');

  static override properties: PropertyDeclarations = {
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    // The defaults are not reflected: a table of contents that is defined is the one that was written.
    presentation: { type: String, reflect: true, useDefault: true },
    density: { type: String, reflect: true, useDefault: true },
    open: { type: Boolean, reflect: true },
    current: { type: String },
    tracking: { type: String, reflect: true, useDefault: true },
  };

  /** The title, in the product's language ("On this page"): drawn above the list and in the compact row, and the accessible name of the navigation landmark. Required. */
  label = '';

  /** Draws no title above the list and keeps `label` as the landmark's name. The compact row always shows the title. */
  labelHidden = false;

  /** How it stands: `list` is the title and the whole list; `compact` is one row that names the current section and opens the list below it. Which one a window gets is the layout's that places it. */
  presentation: TanreiTableOfContentsPresentation = 'list';

  /** How tall a row of the list is: `regular` holds the pointer target; `compact` is lower, for a long list beside the text of a product read with a pointer. For touch a row is the touch target in both. A design system may add values. */
  density: TanreiTableOfContentsDensity = 'regular';

  /** In the compact presentation, whether the list is shown below the row. The element sets it when the user opens, closes or chooses. Ignored in the list presentation. */
  open = false;

  /** The `href` of the item whose section the person is in; empty while none is. Set by the element while `tracking` is `auto`, by the product while it is `manual`. */
  current = '';

  /** Who decides which item is current: `auto` — the element, from where the items' targets are in the view that scrolls them; `manual` — the product, through `current`. */
  tracking: TanreiTableOfContentsTracking = 'auto';

  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.chevron') ?? []);
  private readonly rowPress = new PressController(this, {
    container: () => this.row,
    holdCarrier: () => this.renderRoot?.querySelector('.row-current') ?? null,
    disabled: () => false,
  });

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.mutated(records));
  /** The items, in the page's order; and those that can be current — the first of each href (TOC-39). */
  private items: Item[] = [];
  private trackable: Item[] = [];
  private itemsStale = true;
  /** The anchors whose `aria-current` this element wrote: only that is taken off again while the product decides. */
  private readonly wrote = new WeakSet<Element>();
  /** The anchors this element gave their text's direction. */
  private readonly directed = new WeakSet<Element>();
  /** The lists this element gave the list role. */
  private readonly listed = new WeakSet<Element>();
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<PressController>();
  private heldPress: PressController | null = null;
  private heldAnchor: HTMLElement | null = null;

  /** What the rule last gave: a `current` that differs from it was set by the product (TOC-15). */
  private given = '';
  /** TOC-12, TOC-13: the item that is kept current — chosen, or named by the address — until the person next scrolls. */
  private held: string | null = null;
  /** Whether the move to the held item's target is over: from then on the person's own scrolling ends the hold. */
  private arrived = false;
  private stillTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private frame = 0;
  /** What is listened to and observed while the rule runs: the view that scrolls the targets (null: the window's). */
  private watching: { view: Element | null; source: EventTarget; sizes: ResizeObserver | null } | null = null;
  /** Each target's `scroll-margin-block-start`, until something is resized or the items change. */
  private margins = new WeakMap<Element, number>();
  /** TOC-27: the list is being shown, and its current row is kept in its visible part until its height has settled. */
  private opening: ResizeObserver | null = null;
  /** TOC-30: where focus was when the presentation changed. */
  private focusWasInList = false;
  private drawAtOnce = false;

  private get row(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.row') ?? null;
  }

  private get compact(): boolean {
    return this.presentation === 'compact';
  }

  /** TOC-39: a tracking it does not have is auto. */
  private get auto(): boolean {
    return this.tracking !== 'manual';
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('table-of-contents', () => LIST_CSS), '--_toc-row-height');
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
    for (const [type, listener] of this.pressListeners) this.addEventListener(type, listener, true);
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
    this.itemsStale = true;
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    for (const [type, listener] of this.pressListeners) this.removeEventListener(type, listener, true);
    this.mutations?.disconnect();
    this.unwatch();
    this.release({ decide: false });
    clearTimeout(this.closeTimer);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.opening?.disconnect();
    this.opening = null;
    for (const press of this.pressControllers) press.hostDisconnected();
    this.heldPress = null;
    this.heldAnchor = null;
  }

  // ── The items ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /** What the observer saw. The ripple's layer is this package's own: its coming and going is not a change of the items. */
  private mutated(records: MutationRecord[]) {
    const ripple = (node: Node) => node instanceof Element && node.classList.contains('ripple');
    if (records.every((record) => record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(ripple))) return;
    this.itemsStale = true;
    this.margins = new WeakMap();
    this.requestUpdate();
  }

  /**
   * Reads the product's list: every `<li>` of this element whose first anchor is its label. Writes what the stylesheet
   * needs of them (the label's text, an item without one) and the list role on a list that has none; only what
   * differs, so it settles.
   */
  private readItems() {
    this.itemsStale = false;
    const items: Item[] = [];
    const empty: Element[] = [];
    for (const a of this.querySelectorAll<HTMLAnchorElement>('li > a')) {
      const li = a.parentElement as HTMLElement;
      if (a.closest(TAG) !== this || li.querySelector(':scope > a') !== a) continue;
      // TOC-40: an item without a label is not drawn, and neither are its items.
      if (empty.some((outer) => outer.contains(li))) continue;
      const label = (a.textContent ?? '').replace(/\s+/g, ' ').trim();
      mark(li, EMPTY, label ? null : '');
      mark(li, LABEL, label || null);
      // TOC-37: a label is text of its own direction. With a letter in it the anchor takes that direction as its own
      // (`dir="auto"`, unless the product named one), so that every engine lays its lines out alike; without one it
      // has no direction of its own, and is laid out in the layout's.
      const strong = STRONG.test(label);
      mark(li, NEUTRAL, label && !strong ? '' : null);
      if (strong && !a.hasAttribute('dir')) {
        a.setAttribute('dir', 'auto');
        this.directed.add(a);
      } else if (!strong && this.directed.has(a)) {
        this.directed.delete(a);
        a.removeAttribute('dir');
      }
      if (!label) {
        empty.push(li);
        report(this, 'TOC-40', `the item for "${a.getAttribute('href') ?? ''}" has no label; it is not drawn, and neither are its items`);
        continue;
      }
      let depth = 1;
      for (let outer = li.parentElement?.closest('li'); outer && this.contains(outer); outer = outer.parentElement?.closest('li')) depth++;
      items.push({ li, a, href: a.getAttribute('href') ?? '', label, depth });
    }
    // TOC-31: a list without markers is still a list to every engine's assistive technology.
    for (const list of this.querySelectorAll('ul, ol')) {
      if (list.closest(TAG) !== this || list.hasAttribute('role')) continue;
      list.setAttribute('role', 'list');
      this.listed.add(list);
    }
    this.items = items;
    // TOC-39: of two items with one href, the first is the one that can be current.
    const seen = new Set<string>();
    this.trackable = items.filter((item) => !seen.has(item.href) && !!seen.add(item.href));
    if (debugBuild()) this.check();
  }

  /** What a debug build says about a table of contents it still draws (TOC-39, TOC-40). */
  private check() {
    // A list that is still being parsed is read again when it is whole.
    if (document.readyState === 'loading') return;
    if (this.items.length && !this.label.trim() && !namedByProduct(this)) report(this, 'TOC-40', 'label is empty: the navigation landmark and the compact row have no name; give it the words ("On this page")');
    const seen = new Set<string>();
    for (const item of this.items) {
      if (seen.has(item.href)) report(this, 'TOC-39', `two items have the href "${item.href}"; both are drawn, and the first is the one that can be current`);
      seen.add(item.href);
    }
    const depth = Math.max(0, ...this.items.map((item) => item.depth));
    if (depth > MAX_DEPTH) report(this, 'TOC-39', `the items are nested ${depth} levels deep; more than ${MAX_DEPTH} is hard to follow in a narrow column`);
  }

  /** The item that is drawn as current: `current`'s, or — while the product decides and names none — the anchor it marked itself. */
  private currentItem(): Item | null {
    if (this.current) return this.trackable.find((item) => item.href === this.current) ?? null;
    if (this.auto) return null;
    return this.items.find((item) => !this.wrote.has(item.a) && item.a.hasAttribute('aria-current') && item.a.getAttribute('aria-current') !== 'false') ?? null;
  }

  private itemOf(event: Event): Item | null {
    const path = event.composedPath();
    return this.items.find((item) => path.includes(item.a)) ?? null;
  }

  // ── The rule (TOC-9 to TOC-16) ────────────────────────────────────────────────────────────────────────────────────

  /** The view that scrolls the targets: the nearest ancestor of the first target that scrolls, else the window's (null). */
  private findView(): Element | null {
    for (const item of this.trackable) {
      const target = targetOf(fragmentOf(item.a));
      if (!(target instanceof Element)) continue;
      for (let outer = target.parentElement; outer && !isPage(outer); outer = outer.parentElement) if (scrolls(outer)) return outer;
      return null;
    }
    return null;
  }

  /**
   * TOC-9 to TOC-11: the last item, in the page's order, whose target has reached the line; the item for the top of
   * the page has always reached it; at the end of a view that has room to scroll, the last item. The line is where the
   * browser rests a target: the view's start edge, its scroll padding, and the target's own scroll margin.
   */
  private byRule(): string {
    const view = this.watching?.view ?? this.findView();
    const page = document.scrollingElement ?? document.documentElement;
    const scroller = view ?? page;
    const styled = getComputedStyle(view ?? document.documentElement);
    const edge = view ? view.getBoundingClientRect().top + view.clientTop : 0;
    const line = edge + pixels(styled.scrollPaddingTop, scroller.clientHeight);
    const room = scroller.scrollHeight - scroller.clientHeight;
    const atEnd = room > UNIT && scroller.scrollTop >= room - UNIT;
    const loaded = document.readyState === 'complete';
    for (let index = this.trackable.length - 1; index >= 0; index--) {
      const item = this.trackable[index]!;
      const target = targetOf(fragmentOf(item.a));
      if (!target) {
        // TOC-16: an item whose href leads to no place is still a link, and is never current by the rule.
        if (loaded) report(this, 'TOC-16', `the href "${item.href}" leads to no place on this page; the item is still a link, and is never current`);
        continue;
      }
      if (target === 'top') return item.href;
      // A target that is not drawn — in a fold that is closed, a tab that is not shown — is at no place: never reached.
      const box = target.getBoundingClientRect();
      if (!box.width && !box.height && !target.getClientRects().length) continue;
      // TOC-11: a last section shorter than the view can never reach the line.
      if (atEnd) return item.href;
      let margin = this.margins.get(target);
      if (margin === undefined) {
        margin = pixels(getComputedStyle(target).scrollMarginTop, 0);
        this.margins.set(target, margin);
      }
      if (box.top - (line + margin) < UNIT) return item.href;
    }
    return '';
  }

  /** Decides the current item again (TOC-16), keeping an item that is held (TOC-12, TOC-13). */
  private decide() {
    if (!this.isConnected || !this.auto) return;
    if (this.held !== null) {
      if (this.items.some((item) => item.href === this.held)) {
        this.give(this.held);
        return;
      }
      this.release({ decide: false });
    }
    // TOC-13: while the page is still arriving and its address names a place, no other item is shown first.
    if (document.readyState === 'loading' && location.hash.length > 1) {
      document.addEventListener('DOMContentLoaded', this.onParsed, { once: true });
      return;
    }
    this.give(this.byRule());
  }

  /** The elements whose rule is read in this turn (`decideTogether`). */
  private static readonly deciding = new Set<TanreiTableOfContents>();

  /** Whether deciding now reads the page: not while an item is held, nor while the page is still arriving at an address (`decide`). */
  private get reads(): boolean {
    return this.isConnected && this.auto && this.held === null && !(document.readyState === 'loading' && location.hash.length > 1);
  }

  /**
   * `decide()` as an update asks for it — the first drawing, `tracking`, the items. A decision that reads nothing
   * (an item is held: TOC-13's, in the first drawing) is made at once. One that reads where the targets are is made
   * in ONE microtask after the updates of the turn, for every element that asked: the rule is read for them all —
   * one layout — and only then is each given its item, which it draws in an update of its own, still in the task
   * that drew it and before any frame. Read in its own update, between the writes of the one before it and its own,
   * each element had the page styled and laid out for itself (fifty at once: 51 style passes and 51 layouts).
   */
  private decideTogether() {
    if (!this.reads) {
      this.decide();
      return;
    }
    const due = TanreiTableOfContents.deciding;
    if (!due.size) {
      queueMicrotask(() => {
        const all = [...due];
        due.clear();
        const ruled = all.map((each) => (each.reads ? each.byRule() : null));
        all.forEach((each, index) => {
          const href = ruled[index];
          // What changed in between (an item held, the element gone) decides as it always does.
          if (href !== null && each.reads) each.give(href);
          else each.decide();
        });
      });
    }
    due.add(this);
  }

  private readonly onParsed = () => {
    if (!this.isConnected) return;
    this.readItems();
    this.addressed();
    this.decide();
    this.requestUpdate();
  };

  /** The rule's answer becomes `current`, and the product is told — once per change (TOC-9). */
  private give(href: string) {
    this.given = href;
    if (this.current === href) return;
    this.current = href;
    this.dispatchEvent(new CustomEvent<TanreiTableOfContentsCurrentChangeDetail>('currentchange', { bubbles: true, detail: { href } }));
  }

  /** One decision in the next frame, however many events asked for it. Nothing is asked for at rest. */
  private schedule() {
    if (this.frame || !this.isConnected) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.watch();
      this.decide();
    });
  }

  /** TOC-13: the address names the target of one of the items — that item is held as a chosen one is. */
  private addressed(): boolean {
    if (!this.auto || location.hash.length <= 1) return false;
    const fragment = decoded(location.hash.slice(1));
    const item = this.trackable.find((candidate) => fragmentOf(candidate.a) === fragment && targetOf(fragment) !== null);
    if (!item) return false;
    this.hold(item.href);
    return true;
  }

  /** TOC-12: `href` stays current while the view moves to its target and after, until the person next scrolls. */
  private hold(href: string) {
    this.unlistenForScrolling();
    this.held = href;
    this.arrived = false;
    this.stillSoon();
  }

  private stillSoon() {
    clearTimeout(this.stillTimer);
    this.stillTimer = setTimeout(this.still, STILL_MS);
  }

  /** The view has stopped: from here the person's own scrolling ends the hold. */
  private readonly still = () => {
    if (this.held === null || this.arrived) return;
    this.arrived = true;
    for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown', 'mousedown']) window.addEventListener(type, this.onOwnScrolling, { capture: true, passive: true });
  };

  private unlistenForScrolling() {
    clearTimeout(this.stillTimer);
    for (const type of ['wheel', 'touchmove', 'keydown', 'pointerdown', 'mousedown']) window.removeEventListener(type, this.onOwnScrolling, { capture: true });
  }

  private release({ decide = true } = {}) {
    this.unlistenForScrolling();
    this.held = null;
    this.arrived = false;
    if (decide) this.schedule();
  }

  /** A wheel, a drag, a scrolling key or a press on the scroll bar: the person moves the view by their own hand (TOC-12). */
  private readonly onOwnScrolling = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      const on = event.target instanceof Element ? event.target : null;
      // Space on a control is that control's; a key in a field is the field's.
      if (!SCROLL_KEYS.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (on?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') || (event.key === ' ' && on?.closest('button, summary, [role="button"]'))) return;
    } else if (event.type === 'pointerdown' || event.type === 'mousedown') {
      // A press that is on the scroll bar: on the view itself, outside the box its content is laid out in.
      const pointer = event as MouseEvent;
      const view = this.watching?.view ?? null;
      if (view) {
        const box = view.getBoundingClientRect();
        const inside = pointer.clientX - box.left - view.clientLeft < view.clientWidth && pointer.clientY - box.top - view.clientTop < view.clientHeight;
        if (event.target !== view || inside) return;
      } else if (pointer.clientX < document.documentElement.clientWidth && pointer.clientY < document.documentElement.clientHeight) return;
    } else if (event.composedPath().includes(this)) {
      // A wheel or a drag over the list moves the list's own region, not the view that holds the targets.
      return;
    }
    this.release();
  };

  private readonly onScroll = () => {
    if (this.held !== null) {
      // The view is still on its way to the target: the items it passes are not marked.
      if (!this.arrived) this.stillSoon();
      return;
    }
    this.schedule();
  };

  /** TOC-16: the place of a target may have changed without the person scrolling. */
  private readonly onMoved = () => {
    this.margins = new WeakMap();
    this.schedule();
  };

  private readonly onAddress = () => {
    if (this.addressed()) this.decide();
  };

  /** Listens to the view that scrolls the targets, and to what may move them, while the rule runs. */
  private watch() {
    if (!this.isConnected || !this.auto || !this.trackable.length) {
      this.unwatch();
      return;
    }
    const view = this.findView();
    if (this.watching && this.watching.view === view) return;
    this.unwatch();
    const source: EventTarget = view ?? document;
    source.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onMoved, { passive: true });
    window.addEventListener('hashchange', this.onAddress);
    window.addEventListener('popstate', this.onAddress);
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(this.onMoved);
    if (sizes) {
      // What the view scrolls, and the boxes the targets stand in: content that loads or folds changes their size.
      const boxes = new Set<Element>(view ? [view, ...view.children] : [document.documentElement, ...(document.body ? [document.body] : [])]);
      for (const item of this.trackable) {
        const target = targetOf(fragmentOf(item.a));
        if (target instanceof Element && target.parentElement) boxes.add(target.parentElement);
      }
      for (const box of boxes) sizes.observe(box);
    }
    this.watching = { view, source, sizes };
  }

  private unwatch() {
    if (!this.watching) return;
    this.watching.source.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onMoved);
    window.removeEventListener('hashchange', this.onAddress);
    window.removeEventListener('popstate', this.onAddress);
    this.watching.sizes?.disconnect();
    this.watching = null;
  }

  // ── The current row kept in view (TOC-17, TOC-27) ─────────────────────────────────────────────────────────────────

  /** The scrolling region that holds the list: the element's own in the compact presentation, else the layout's — never the view that holds the targets, never the page. */
  private listRegion(): Element | null {
    const own = this.compact ? (this.renderRoot?.querySelector('.scroller') ?? null) : null;
    if (own && scrolls(own)) return own;
    const view = this.watching?.view ?? null;
    for (let outer = flatParent(this); outer; outer = flatParent(outer)) {
      if (isPage(outer) || outer === view) return null;
      if (scrolls(outer)) return view && outer.contains(view) ? null : outer;
    }
    return null;
  }

  /** Scrolls the list's region, and no other, by the least distance that shows `row` whole. */
  private showRow(row: Element, { atOnce = false } = {}) {
    const region = this.listRegion();
    if (!region) return;
    const [box, around] = [row.getBoundingClientRect(), region.getBoundingClientRect()];
    const top = around.top + region.clientTop;
    const bottom = top + region.clientHeight;
    // A row taller than the region is shown from its start.
    const by = box.top < top || box.height > region.clientHeight ? box.top - top : box.bottom > bottom ? box.bottom - bottom : 0;
    if (Math.abs(by) < SLACK) return;
    region.scrollTo({ top: region.scrollTop + by, behavior: atOnce || reducedMotion() ? 'instant' : 'smooth' });
  }

  /** TOC-27: the list is shown — its current row is brought into its visible part without a motion, and kept there while the list's height moves. */
  private revealOnOpen() {
    this.opening?.disconnect();
    this.opening = null;
    const clip = this.renderRoot?.querySelector('.clip');
    const reveal = () => {
      const item = this.currentItem();
      if (item) this.showRow(item.a, { atOnce: true });
    };
    reveal();
    if (!clip || typeof ResizeObserver === 'undefined') return;
    // Heard only while the height moves: once no motion of the list runs, the observer is gone.
    const observer = new ResizeObserver(() => {
      reveal();
      if (!clip.getAnimations().length) {
        observer.disconnect();
        if (this.opening === observer) this.opening = null;
      }
    });
    this.opening = observer;
    observer.observe(clip);
  }

  // ── The compact presentation (TOC-26, TOC-28, TOC-29) ─────────────────────────────────────────────────────────────

  /** The user shows or hides the list: `open` changes, and `toggle` says so once, as the change begins. */
  private setOpen(open: boolean) {
    if (this.open === open) return;
    this.open = open;
    this.dispatchEvent(new CustomEvent<TanreiTableOfContentsToggleDetail>('toggle', { bubbles: true, detail: { open } }));
  }

  private readonly onRowClick = () => this.setOpen(!this.open);

  // TOC-22: where the browser has no style queries, the focus style is read when focus arrives.
  private readonly onRowFocus = () => {
    if (!styleQueries()) syncFocusStyle(this, this.row);
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    // TOC-29: Escape hides the shown list, and focus that was inside it goes to the row.
    if (event.key !== 'Escape' || !this.compact || !this.open || event.defaultPrevented) return;
    const active = (this.getRootNode() as Root).activeElement;
    const inList = !!active && active !== this && this.contains(active);
    event.preventDefault();
    this.setOpen(false);
    if (inList) this.row?.focus();
  };

  /**
   * TOC-12, TOC-28: an item was activated. `select` is dispatched from the anchor's own click, before the browser
   * follows the link, and cancels the click with it; the item is current at once and held; the compact list is hidden
   * once the browser has taken the navigation — which is what leaves the next Tab at the chosen section. A click that
   * opens the link elsewhere (a modifier, another button) is the browser's alone.
   */
  private readonly onClick = (event: MouseEvent) => {
    const item = this.itemOf(event);
    if (!item || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const select = new CustomEvent<TanreiTableOfContentsSelectDetail>('select', { bubbles: true, cancelable: true, detail: { href: item.href } });
    if (!this.dispatchEvent(select)) event.preventDefault();
    if (this.auto) {
      this.hold(item.href);
      this.give(item.href);
    }
    if (this.compact && this.open) {
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => {
        if (this.isConnected && this.compact) this.setOpen(false);
      });
    }
  };

  // ── A row's press and focus (TOC-20 to TOC-22): the shared primitives, on the product's anchors ───────────────────

  private pressOf(a: HTMLElement): PressController {
    let press = this.presses.get(a);
    if (!press) {
      press = new PressController(a, {
        container: () => a,
        // The anchor's first transition is the hold (table-of-contents.css), so its delay is press-hold as a time.
        holdCarrier: () => a,
        disabled: () => false,
        // TOC-20: Enter presses a link; Space does what it does on any link and shows no pressed state.
        keys: LINK_KEYS,
      });
      this.presses.set(a, press);
      this.pressControllers.add(press);
    }
    return press;
  }

  /** The press is this script's from here: the stylesheet's own answer to `:active` stands down for an anchor that carries `data-pressed`. */
  private answered(a: HTMLElement) {
    if (!a.hasAttribute('data-pressed')) a.dataset.pressed = 'none';
  }

  private readonly releasePress = (event?: Event) => {
    this.heldPress?.release(event);
    this.heldPress = null;
    this.heldAnchor = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const item = this.itemOf(event);
    const pointer = event as PointerEvent;
    if (!item || (pointer.button !== 0 && pointer.pointerType === 'mouse')) return;
    this.answered(item.a);
    this.heldPress = this.pressOf(item.a);
    this.heldAnchor = item.a;
    this.heldPress.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the row it holds.
  private readonly onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (this.heldAnchor && !(to instanceof Node && this.heldAnchor.contains(to))) this.releasePress(event);
  };

  private readonly onRowKeyDown = (event: Event) => {
    const item = this.itemOf(event);
    const key = event as KeyboardEvent;
    if (!item || key.repeat || key.key !== 'Enter') return;
    this.answered(item.a);
    this.pressOf(item.a).onKeyDown(key);
  };

  private readonly onRowKeyUp = (event: Event) => {
    const item = this.itemOf(event);
    if (item) this.presses.get(item.a)?.onKeyUp(event as KeyboardEvent);
  };

  private readonly onFocusIn = (event: Event) => {
    const item = this.itemOf(event);
    if (item && !styleQueries()) syncFocusStyle(item.a, item.a);
  };

  private readonly onFocusOut = (event: Event) => {
    const item = this.itemOf(event);
    if (item) this.presses.get(item.a)?.onBlur();
  };

  private readonly pressListeners: [string, (event: Event) => void][] = [
    ['pointerdown', this.onPointerDown],
    ['pointerup', this.releasePress],
    ['pointercancel', this.releasePress],
    ['pointerout', this.onPointerOut],
    ['dragstart', this.releasePress],
    ['keydown', this.onRowKeyDown],
    ['keyup', this.onRowKeyUp],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
  ];

  // ── Drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues) {
    const first = !this.hasUpdated;
    const itemsChanged = this.itemsStale;
    if (itemsChanged) this.readItems();
    // TOC-15: a `current` the rule did not give was set by the product — it is drawn until the rule next gives another.
    if (changed.has('current') && this.current !== this.given && !first) this.release({ decide: false });
    // TOC-30: a change of presentation keeps the current item, is drawn at once, and closes the list without `toggle`.
    if (changed.has('presentation') && !first) {
      const active = (this.getRootNode() as Root).activeElement;
      this.focusWasInList = !!active && active !== this && this.contains(active);
      this.drawAtOnce = true;
      this.open = false;
      clearTimeout(this.closeTimer);
    }
    if (!this.auto) {
      if (changed.has('tracking')) this.release({ decide: false });
    } else if (first || changed.has('tracking')) {
      // TOC-13: an item the address names is current in the first drawing, and no other is shown first.
      this.addressed();
      this.decideTogether();
    } else if (itemsChanged) {
      // TOC-16: an item was added or removed.
      this.decideTogether();
    }
  }

  protected override updated(changed: PropertyValues) {
    const item = this.currentItem();
    // TOC-7, TOC-8: the current item carries the current-location state, and no other does.
    for (const other of this.items) {
      if (other === item && this.current) {
        if (other.a.getAttribute('aria-current') !== 'location') {
          other.a.setAttribute('aria-current', 'location');
          this.wrote.add(other.a);
        }
      } else if (other.a.hasAttribute('aria-current') && (this.auto || this.current || this.wrote.has(other.a))) {
        other.a.removeAttribute('aria-current');
        this.wrote.delete(other.a);
      }
    }
    // TOC-32: no items — nothing is drawn and nothing is exposed.
    mark(this, 'data-empty', this.items.length ? null : '');

    if (changed.has('density')) this.readDensity();
    if (changed.has('presentation') && !PRESENTATIONS.includes(this.presentation)) {
      report(this, 'TOC-39', `presentation "${this.presentation}" is not a value it defines ("list" or "compact"); it is drawn as "list"`);
    }
    if (changed.has('tracking') && !TRACKINGS.includes(this.tracking)) {
      report(this, 'TOC-39', `tracking "${this.tracking}" is not a value it defines ("auto" or "manual"); it behaves as "auto"`);
    }
    if (!this.auto && this.current && !item && document.readyState !== 'loading') {
      report(this, 'TOC-39', `current "${this.current}" is no item's href; no item is drawn as current`);
    }

    if (this.drawAtOnce) {
      // TOC-30: the new presentation at once — its styles are computed once with their transitions off — and focus
      // that was on an item which is no longer shown goes to the row.
      this.drawAtOnce = false;
      const nav = this.renderRoot.querySelector('nav');
      if (nav) {
        nav.setAttribute('data-at-once', '');
        void getComputedStyle(this.renderRoot.querySelector('.clip') ?? nav).visibility;
        nav.removeAttribute('data-at-once');
      }
      if (this.focusWasInList && this.compact) this.row?.focus();
      this.focusWasInList = false;
    }
    if (this.compact && this.open && (changed.has('open') || changed.has('presentation'))) this.revealOnOpen();
    else if (changed.has('current') && item && !(this.compact && !this.open)) {
      // TOC-17: the new current row is shown whole in a scrolling region that holds the list — but a row is never
      // moved from under a hand: not while the pointer is over the list, nor while keyboard focus is inside it.
      if (!this.matches(':hover') && !this.matches(':focus-within')) this.showRow(item.a);
    }
    this.watch();
  }

  /** TOC-39: a density the core does not have was added by a design system — its rules are added to the root — or is unknown to the active one, which a debug build says. */
  private readDensity() {
    const density = String(this.density ?? '');
    if (CORE_DENSITIES.includes(density)) return;
    const known = KEY.test(density);
    if (known) adopt(this.getRootNode() as Root, sheet(`table-of-contents:density:${density}`, () => densityRules(density)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-row-height-${density}`).trim() === '') {
      report(this, 'TOC-39', `density "${density}" is not a value of the active design system; it is drawn as "${DEFAULT_DENSITY}"`);
    }
  }

  protected override render() {
    const compact = this.compact;
    const open = compact && this.open;
    const label = this.label ?? '';
    const name = this.currentItem()?.label ?? '';
    const titled = !!label.trim() || !!this.querySelector(':scope > [slot="title"]');
    // TOC-41: while label is empty a name the product gives names the landmark, and the compact row by that name and
    // the current item it shows.
    const productNamed = !label.trim() && namedByProduct(this);
    return html`
      <nav id="nav" part="nav" class=${classMap({ compact, open })} ${delegatedAria(this, { 'aria-label': label.trim() })} ?data-tanrei-shape=${compact}>
        ${compact
          ? html`<button
              part="disclosure-row"
              class="row"
              type="button"
              data-tanrei-shape
              aria-expanded=${open ? 'true' : 'false'}
              aria-controls="list"
              aria-describedby=${label.trim() && name ? 'current' : nothing}
              aria-labelledby=${productNamed ? (name ? 'nav current' : 'nav') : nothing}
              @click=${this.onRowClick}
              @pointerdown=${this.rowPress.onPointerDown}
              @pointerup=${this.rowPress.release}
              @pointercancel=${this.rowPress.release}
              @pointerleave=${this.rowPress.release}
              @keydown=${this.rowPress.onKeyDown}
              @keyup=${this.rowPress.onKeyUp}
              @blur=${this.rowPress.onBlur}
              @focus=${this.onRowFocus}
            >
              ${label.trim() ? html`<span class="row-title">${label}</span>` : nothing}
              <span id="current" class="row-current" aria-hidden=${label.trim() ? 'true' : nothing} dir=${ownDirection(name)}>${name}</span>
              <span part="icon" class="chevron" aria-hidden="true"><span class="ink">expand_more</span></span>
            </button>`
          : this.labelHidden || !titled
            ? nothing
            : html`<div part="title" class="title"><slot name="title"><span aria-hidden="true">${label}</span></slot></div>`}
        <div part="list" id="list" class="scroller" ?inert=${compact && !open}>
          <div class="clip"><div class="inner"><slot></slot></div></div>
        </div>
      </nav>
    `;
  }
}

// TOC-41: the product's ARIA on the host is its navigation landmark's (src/primitives/delegated-aria.ts).
delegatesAria(TanreiTableOfContents, { sentence: 'TOC-41' });
if (!customElements.get('tanrei-table-of-contents')) customElements.define('tanrei-table-of-contents', TanreiTableOfContents);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-table-of-contents': TanreiTableOfContents;
  }
}
