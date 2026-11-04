import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  GROUP_AVAILABILITY,
  GROUP_ITEM,
  GROUP_PLACE,
  type GroupItem,
  type GroupPlace,
  OpenAxesController,
  type PlacingGroup,
  RovingKeys,
  SEPARATION_VALUES,
  type SeparationProp,
  containedWheel,
  deepActive,
  flatParent,
  hostAria,
  isDisabledControl,
  report,
  syncSeparation,
} from '../../primitives/index.js';
import { WordsController } from '../../primitives/words.js';
import { TanreiElement } from '../../primitives/element.js';
import { holdsProductName, nameHost, namedByProduct } from '../../primitives/delegated-aria.js';
import '../button/button.js';
import '../menu/menu.js';
import type { TanreiMenu } from '../menu/menu.js';
import { TOOLBAR_CHILDREN, TOOLBAR_GROUP, type ToolbarGroupChannel } from './toolbar-group.js';
// The group is the toolbar's own element, defined and exported with it (`@tanrei/web/components/toolbar`).
export { TanreiToolbarGroup } from './toolbar-group.js';
import { AXES, styles } from './toolbar.styles.js';

/**
 * Where the toolbar stands: in place in the content (`inline`, the default), across the bottom edge (`docked`) or over
 * the content (`floating`), plus any variant a design system adds, which is drawn with the inline structure and its own
 * values (TBR-13).
 */
export type TanreiToolbarVariant = 'inline' | 'docked' | 'floating' | (string & {});
/** The direction the items run. A docked toolbar is always horizontal (TBR-6). */
export type TanreiToolbarOrientation = 'horizontal' | 'vertical';
/** What happens when the items do not fit: `menu` hides items from the end into an overflow menu, `scroll` scrolls them. */
export type TanreiToolbarOverflow = 'menu' | 'scroll';
/** How two groups, or a separator item, set items apart: `auto` takes `comp.toolbar.separation`. */
export type TanreiToolbarSeparation = SeparationProp;

const ORIENTATIONS: readonly string[] = ['horizontal', 'vertical'];
const OVERFLOWS: readonly string[] = ['menu', 'scroll'];
/** The item kinds' elements (`action`, `button`, `menu-button`: a Tanrei Button; `button-with-menu`). */
const BUTTON = 'tanrei-button';
const BUTTON_WITH_MENU = 'tanrei-button-with-menu';
const GROUP = 'tanrei-toolbar-group';
const SEPARATOR = 'tanrei-divider';
const MENU = 'tanrei-menu';
/** The menu's item kinds, which an item's Menu holds and the overflow menu repeats (TBR-20). */
const MENU_ROWS = 'tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu, tanrei-menu-group';

/**
 * SPB-33: how a Button with menu is told which half is the Tab stop (src/components/button-with-menu/button-with-menu.ts),
 * under a registered key, so that the toolbar does not load the Button with menu to place one.
 */
const ROVING_HALVES = Symbol.for('tanrei.roving-halves');
interface RovingHalves {
  halves(): HTMLElement[];
  setStop(stop: 0 | 1 | null | undefined): void;
}

type Item = HTMLElement & { disabled?: boolean; label?: string; toggle?: boolean; selected?: boolean; menuLabel?: string } & Partial<GroupItem> & Partial<{ [ROVING_HALVES]: RovingHalves }>;

/** One element of the toolbar's line, in order, a group's units in place of the group (TBR-22). */
interface Unit {
  kind: 'item' | 'other' | 'space' | 'sep' | 'overflow';
  /** What is shown or not: the slot an item is assigned to, a space, a line, the overflow button. */
  node: HTMLElement;
  /** The product's element, for an item or for content that is not an item. */
  item?: Element;
  /** The space before the overflow button. */
  last?: boolean;
}

/** A stop of the arrow keys (TBR-10): an item, a half of a Button with menu (TBR-25), or the overflow button (TBR-21). */
interface Stop {
  element: HTMLElement;
  owner: Element;
  half?: 0 | 1;
}

/** Rounded to a hundredth of a pixel, so that a measurement that did not change does not re-render an item. */
const hundredths = (value: number) => Math.round(value * 100) / 100;
const isItem = (element: Element) => element.localName === BUTTON || element.localName === BUTTON_WITH_MENU;

/**
 * Holds a set of related controls — actions, toggles, a menu — as one Tab stop: inline where its content needs it, docked
 * across the bottom edge, or floating over the content.
 *
 * Contract: specs/toolbar.spec.json. Every value it reads is a `--tanrei-comp-toolbar-*` token: per variant the container's
 * color, elevation, corners, cross-axis size, end padding and minimum gap and the edge's color, the edge's width, and the
 * space, the line and the choice between them that set groups apart. It draws no text, glyph or state of its own. Its
 * items are the product's `<tanrei-button>` and `<tanrei-button-with-menu>` children, alone or in `<tanrei-toolbar-group>`s,
 * drawn from their own tokens with their own states, events and semantics (TBR-9); the toolbar lays them out, draws the
 * separation between groups and where a `<tanrei-divider>` separator stands (TBR-23), hides from the end what does not fit
 * into an overflow menu (TBR-18 … TBR-21) — or scrolls (`overflow="scroll"`, TBR-8) — and makes them one Tab stop moved
 * through with the arrow keys (TBR-10, TBR-25).
 *
 * Each child is assigned to a slot of its own (and a group's items each to one of the group's), so that the toolbar draws
 * the space and the lines between them as elements of its own, never as a margin on the product's element, and leaves a
 * hidden item out of the line while it stays in the page with its listeners and its state. What is hidden is decided
 * before a frame is drawn — when the toolbar is first laid out, and in the frame its length or its items change
 * (TBR-19) — from the lengths measured then, with no motion.
 *
 * The roving Tab stop is the items' `tabindex` (0 on the stop, -1 on the other enabled items; none on a disabled one); a
 * Button with menu is told which half is the stop (SPB-33). Between two items each item's hit area stops at the middle of
 * the gap, which the toolbar measures and gives its items through an internal channel (src/primitives/group-item.ts) — not
 * a styling API.
 *
 * @tag tanrei-toolbar
 * @slot - The items, in reading order: `<tanrei-button>` elements — an icon-only one for an action (a toggle such as Bold
 * is one with `toggle`), a labelled one, one with a `<tanrei-menu anchor="<its id>">` beside it for a menu button —
 * `<tanrei-button-with-menu>` elements, `<tanrei-toolbar-group>`s holding them and `<tanrei-divider>` separators. An item
 * with `toolbar-overflow="never"` is never hidden. Anything else is still laid out, and reported in debug builds (TBR-12).
 * @csspart container - The surface: the variant's fill, elevation, corners and edge, holding the items.
 * @csspart separator - A line between two groups or where a separator stands (TBR-23); empty space under a gap separation.
 * @csspart overflow-button - The icon-only Button at the end that opens the menu of the hidden items (TBR-18).
 * @csspart overflow-menu - The Tanrei Menu of the hidden items (TBR-20).
 */
export class TanreiToolbar extends TanreiElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'toolbar');
  static override styles = styles;
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    label: { type: String },
    overflow: { type: String, reflect: true },
    overflowLabel: { type: String, attribute: 'overflow-label' },
    separation: { type: String, reflect: true },
    laid: { state: true },
    held: { state: true },
    overflowWanted: { state: true },
  };

  /**
   * `inline` (the default) stands in place where the layout puts it, as long as its items need and never longer than the
   * layout allows, with no surface, shadow or edge of its own in the default system; `docked` spans the bottom edge of the
   * screen, flush with it, its color reaching under the bottom inset; `floating` is a rounded, raised surface over the
   * content, as long as its items, placed by the layout that holds it. A value a design system adds is drawn with the
   * inline structure and its own values; a value the active system does not have is drawn as `inline` (reported in debug
   * builds, TBR-13).
   */
  variant: TanreiToolbarVariant = 'inline';

  /**
   * The direction the items run. `vertical` is for an inline or a floating toolbar beside the content; a docked toolbar
   * is always horizontal (reported in debug builds, TBR-6). Anything else is horizontal (TBR-13).
   */
  orientation: TanreiToolbarOrientation = 'horizontal';

  /** The toolbar's accessible name ("Formatting", "Message actions"). Never drawn. Required (TBR-12). */
  label = '';

  /**
   * When the items do not fit: `menu` (the default) hides items from the end, one at a time, into a menu opened from an
   * overflow button at the end (TBR-18); `scroll` keeps every item and scrolls them (TBR-8). Anything else is `menu`.
   */
  overflow: TanreiToolbarOverflow = 'menu';

  /** The overflow button's accessible name ("More actions"). Never drawn. Empty takes the product's word `toolbarOverflowLabel`. */
  overflowLabel = '';

  /**
   * How two groups, or a separator item, set items apart: `divider` draws a line with space on each side, `gap` leaves
   * empty space and no line. `auto` takes `comp.toolbar.separation`, the design system's answer (divider in the default
   * system). Anything else is `auto` (reported in debug builds).
   */
  separation: TanreiToolbarSeparation = 'auto';

  /** The children laid out in the line, in order (the anchored menus are not). */
  private laid: Element[] = [];
  /** The menus anchored to an item, held out of the line (TBR-24). */
  private held: Element[] = [];
  /** TBR-18: the overflow button is drawn from the first time an item had to be hidden. */
  private overflowWanted = false;

  /** TBR-13: variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'toolbar', behavior: 'TBR-13', axes: AXES });
  /** TBR-18: the product's words, read where the instance gives no overflow label. */
  private readonly words = new WordsController(this);

  /** TBR-10: the next and previous enabled stop, wrapping, and the first and last (no typeahead is passed to it). */
  private readonly keys = new RovingKeys({ wrap: true });
  /** TBR-10: the stop that had focus last — the Tab stop while it is here and enabled. */
  private last: HTMLElement | null = null;
  /** The items whose `tabindex` the toolbar set, so that it can take it back when one leaves or is hidden. */
  private readonly roved = new Set<HTMLElement>();
  /** The Buttons with menu the toolbar made each half of a stop (SPB-33). */
  private readonly halved = new Set<Item>();
  /** TBR-9: where each item was placed last, with its reach toward its neighbours. */
  private readonly places = new Map<Element, GroupPlace>();
  /** TBR-18: the items hidden into the overflow menu now. */
  private folded = new Set<Element>();
  /** TBR-8: the items need more length than the toolbar has, and it scrolls them. */
  private scrolls = false;
  /** The items observed for their length (shown ones only: a hidden item is drawn as nothing). */
  private readonly watched = new Set<Element>();
  /** The boxes that hold the toolbar, up to the root, each with its length along the axis when last reported (see `watch`). */
  private readonly watchedAncestors = new Map<Element, number | null>();
  private watchedContainer: Element | null = null;
  /** Between a change made in the observer's callback and the next frame, nothing is observed (see `observed`). */
  private resting = false;

  private resize: ResizeObserver | null = null;
  private mutations: MutationObserver | null = null;

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
  }

  // ── Structure ──

  /** The structure it draws: docked and floating by name; every other value is inline (TBR-13). */
  private get docked() {
    return this.variant === 'docked';
  }

  /** The axis its items run along: a column for a vertical toolbar that is not docked (TBR-6). */
  private get axis(): 'inline' | 'block' {
    return !this.docked && this.orientation === 'vertical' ? 'block' : 'inline';
  }

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector('.container') ?? null;
  }

  private get overflowButton(): Item | null {
    return this.renderRoot?.querySelector<Item>('.overflow') ?? null;
  }

  private get overflowMenu(): TanreiMenu | null {
    return this.renderRoot?.querySelector<TanreiMenu>('.overflow-menu') ?? null;
  }

  /** The element whose id `id` is, among the toolbar's descendants. */
  private byId(id: string): Element | null {
    return this.querySelector(`[id="${CSS.escape(id)}"]`);
  }

  /** TBR-24: a Menu anchored to one of the toolbar's elements, which is held out of the line. */
  private isAnchoredMenu(element: Element) {
    if (element.localName !== MENU) return false;
    const anchor = element.getAttribute('anchor');
    const target = anchor ? this.byId(anchor) : null;
    return !!target && target !== element;
  }

  /** TBR-24, TBR-20: the Menu anchored to an item, if any. */
  private menuOf(item: Element): TanreiMenu | null {
    if (!item.id) return null;
    const scope = item.parentElement ?? this;
    for (const child of [...scope.children, ...this.children]) {
      if (child.localName === MENU && child.getAttribute('anchor') === item.id) return child as TanreiMenu;
    }
    return null;
  }

  /** The groups among the toolbar's children. */
  private groups(): (HTMLElement & { [TOOLBAR_GROUP]?: ToolbarGroupChannel })[] {
    return this.laid.filter((child) => child.localName === GROUP) as (HTMLElement & { [TOOLBAR_GROUP]?: ToolbarGroupChannel })[];
  }

  /** @internal A group's children changed: what the toolbar lays out is read again (TBR-22). */
  [TOOLBAR_CHILDREN] = () => {
    if (this.hasUpdated) void this.settle();
  };

  private readChildren() {
    const children = [...this.children];
    const held = children.filter((child) => this.isAnchoredMenu(child));
    const laid = children.filter((child) => !held.includes(child));
    const same = (a: Element[], b: Element[]) => a.length === b.length && a.every((element, i) => element === b[i]);
    if (!same(laid, this.laid)) this.laid = laid;
    if (!same(held, this.held)) this.held = held;
    if (this.hasUpdated) void this.settle();
  }

  // ── The group channel (src/primitives/group-item.ts) ──

  /** An item of this toolbar: a child, or a child of one of its groups. */
  private owns(child: Element) {
    const parent = child.parentElement;
    return isItem(child) && (parent === this || (parent?.localName === GROUP && parent.parentElement === this));
  }

  /** @internal TBR-10: the platform disabled or enabled one of its items (a fieldset around it): the Tab stop is read again. */
  [GROUP_AVAILABILITY](child: Element) {
    if (this.owns(child)) this.rove();
  }

  /** @internal TBR-9: where the toolbar places one of its items (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    if (!this.owns(child) || child.localName !== BUTTON) return null;
    return this.places.get(child) ?? { variant: 'row', first: false, last: false, axis: this.axis, reachStart: null, reachEnd: null };
  }

  // ── Lifecycle ──

  override connectedCallback() {
    super.connectedCallback();
    this.resize ??= new ResizeObserver(this.observed);
    // TBR-10: an item that becomes disabled leaves the arrow keys' order. TBR-18: an item's own length, its kind and
    // whether it may be hidden decide what is shown.
    this.mutations ??= new MutationObserver((records) => this.mutated(records));
    this.mutations.observe(this, { childList: true, attributes: true, attributeFilter: ['disabled', 'toolbar-overflow', 'anchor', 'id', 'hidden', 'toggle', 'label'], subtree: true });
    this.readChildren();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    this.watched.clear();
    this.watchedAncestors.clear();
    this.watchedContainer = null;
    this.mutations?.disconnect();
  }

  private mutated(records: MutationRecord[]) {
    // What changes inside a product's Menu (its items) is the Menu's; the overflow menu is built when it opens.
    const relevant = records.filter((record) => !(record.target instanceof Element && record.target.closest(MENU) && record.target.localName !== MENU));
    if (!relevant.length) return;
    if (relevant.some((record) => record.type === 'childList' && record.target === this) || relevant.some((record) => record.attributeName === 'anchor' || record.attributeName === 'id')) this.readChildren();
    else if (this.hasUpdated) void this.settle();
    if (relevant.some((record) => record.attributeName === 'disabled')) this.rove();
  }

  protected override firstUpdated() {
    void this.settle();
    // An empty toolbar has nothing to settle: the content is checked once the element's children had a frame to arrive.
    requestAnimationFrame(() => {
      if (this.isConnected) this.checkContent();
    });
  }

  protected override updated(changed: PropertyValues<this>) {
    // TBR-11: a toolbar named by its label, with its orientation; its items keep their own name, role and state.
    // TBR-26: its label is its whole name over the product's, which names it while the label is empty.
    nameHost(this, this.label);
    hostAria(this, { role: 'toolbar', 'aria-orientation': this.axis === 'block' ? 'vertical' : 'horizontal' });
    if (changed.has('label') && !this.label && !namedByProduct(this)) report(this, 'TBR-12', 'label is empty, so the toolbar has no accessible name; give it a label ("Formatting", "Message actions")');
    if (changed.has('orientation') || changed.has('variant')) {
      // TBR-13: an orientation the component does not define is horizontal. TBR-6: a docked toolbar is horizontal.
      if (!ORIENTATIONS.includes(this.orientation)) report(this, 'TBR-13', `orientation "${this.orientation}" is not a value of the toolbar; it is drawn as "horizontal"`);
      else if (this.orientation === 'vertical' && this.docked) report(this, 'TBR-6', 'a docked toolbar is horizontal; orientation "vertical" is for an inline or a floating toolbar');
    }
    if (changed.has('overflow') && !OVERFLOWS.includes(this.overflow)) report(this, 'TBR-13', `overflow "${this.overflow}" is not a value of the toolbar; it is drawn as "menu"`);
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) report(this, 'TBR-13', `separation "${this.separation}" is not a value of the toolbar; it is drawn as "auto"`);
    // TBR-23: without style queries, the name the cascade gives now is written for the styles to match.
    syncSeparation(this, this.container);
    // Each child in a slot of its own; the anchored menus out of the line (TBR-24).
    const slots = [...(this.renderRoot.querySelectorAll<HTMLSlotElement>('.container > slot.unit') ?? [])];
    const placed = this.laid.filter((child) => child.localName !== SEPARATOR);
    slots.forEach((slot, i) => {
      const child = placed[i];
      const nodes = slot.assignedNodes();
      if (child && (nodes.length !== 1 || nodes[0] !== child)) slot.assign(child);
    });
    this.renderRoot.querySelector<HTMLSlotElement>('slot.menus-slot')?.assign(...this.held);
    if (this.hasUpdated) void this.settle();
  }

  /**
   * TBR-19: what is shown is decided once every item the toolbar lays out has drawn itself — still before the frame,
   * since every element renders in a microtask — and again whenever a length changes (the observer, before the frame).
   */
  private settling = false;
  private async settle() {
    if (this.settling) return;
    this.settling = true;
    try {
      await this.updateComplete;
      const pending = [...this.groups(), ...this.querySelectorAll(`${BUTTON}, ${BUTTON_WITH_MENU}`), this.overflowButton].map((element) => (element as Partial<LitElement> | null)?.updateComplete);
      await Promise.all(pending);
      // A group draws its slots after its own update: its items are read from what it drew.
      await Promise.all(this.groups().map((group) => (group as Partial<LitElement>).updateComplete));
    } finally {
      this.settling = false;
    }
    if (this.isConnected) {
      this.fit();
      this.checkContent();
    }
  }

  // ── The line (TBR-17, TBR-18, TBR-22, TBR-23) ──

  /** The toolbar's line in order: its own spaces, lines and slots, a group's units in place of the group, the overflow button. */
  private units(): Unit[] {
    const container = this.container;
    if (!container) return [];
    const units: Unit[] = [];
    for (const node of container.children) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains('space')) units.push({ kind: 'space', node, last: node.classList.contains('before-overflow') });
      else if (node.classList.contains('sep')) units.push({ kind: 'sep', node });
      else if (node.classList.contains('overflow')) units.push({ kind: 'overflow', node });
      else if (node instanceof HTMLSlotElement) {
        const child = node.assignedElements()[0];
        if (!child) continue;
        const channel = (child as HTMLElement & { [TOOLBAR_GROUP]?: ToolbarGroupChannel })[TOOLBAR_GROUP];
        if (child.localName === GROUP && channel) {
          for (const unit of channel.units()) {
            if (unit.kind === 'space') units.push({ kind: 'space', node: unit.node });
            else if (unit.item) units.push({ kind: isItem(unit.item) ? 'item' : 'other', node: unit.node, item: unit.item });
          }
        } else units.push({ kind: isItem(child) ? 'item' : 'other', node, item: child });
      }
    }
    return units;
  }

  /**
   * Shows the line with `hidden` left out: an item's slot is off while it is hidden; between two neighbouring things that
   * are shown, one line where a line stands between them (TBR-23: never two side by side, none at either end), else one
   * space; before the overflow button, a space only. Returns the units in order with what is shown.
   */
  private show(units: Unit[], hidden: ReadonlySet<Element>, overflowing: boolean): Unit[] {
    const content = (unit: Unit) => unit.kind === 'item' || unit.kind === 'other' || unit.kind === 'overflow';
    const present = (unit: Unit) => {
      if (unit.kind === 'overflow') return overflowing;
      return !!unit.item && !hidden.has(unit.item) && !(unit.item as HTMLElement).hidden;
    };
    const on = new Set<Unit>();
    for (const unit of units) if (content(unit) && present(unit)) on.add(unit);
    let previous = -1;
    units.forEach((unit, i) => {
      if (!on.has(unit)) return;
      if (previous >= 0) {
        const between = units.slice(previous + 1, i);
        const toOverflow = unit.kind === 'overflow';
        const line = toOverflow ? undefined : between.find((u) => u.kind === 'sep');
        const space = toOverflow ? between.find((u) => u.last) : [...between].reverse().find((u) => u.kind === 'space');
        if (line) on.add(line);
        else if (space) on.add(space);
      }
      previous = i;
    });
    for (const unit of units) {
      const off = !on.has(unit);
      if (unit.node.hasAttribute('data-off') !== off) unit.node.toggleAttribute('data-off', off);
    }
    return units.filter((unit) => on.has(unit));
  }

  /** The length of an element's box along the toolbar's axis. */
  private lengthOf(element: Element) {
    const box = element.getBoundingClientRect();
    return this.axis === 'block' ? box.height : box.width;
  }

  /**
   * TBR-16, TBR-17: each space shown is told the lengths of its two neighbours, from which its rule keeps their targets
   * apart (docked spaces ignore them: they share the free length).
   */
  private tellSpaces(shown: Unit[]) {
    shown.forEach((unit, i) => {
      if (unit.kind !== 'space') return;
      const before = shown[i - 1];
      const after = shown[i + 1];
      const put = (name: string, element: Element | undefined) => {
        const value = element ? `${hundredths(this.lengthOf(element))}px` : '';
        if (unit.node.style.getPropertyValue(name) !== value) {
          if (value) unit.node.style.setProperty(name, value);
          else unit.node.style.removeProperty(name);
        }
      };
      put('--_b', before && (before.item ?? before.node));
      put('--_a', after && (after.item ?? after.node));
    });
  }

  /** Whether what is shown needs more length along the axis than the toolbar has (TBR-8, TBR-18), half a pixel spared. */
  private overflows(shown: Unit[]) {
    const container = this.container;
    if (!container || !shown.length) return false;
    const block = this.axis === 'block';
    const boxes = shown.map((unit) => (unit.item && unit.kind !== 'space' && unit.kind !== 'sep' ? unit.item : unit.node).getBoundingClientRect());
    const start = Math.min(...boxes.map((box) => (block ? box.top : box.left)));
    const end = Math.max(...boxes.map((box) => (block ? box.bottom : box.right)));
    const style = getComputedStyle(container);
    const padding = block ? Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom) : Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    const has = block ? container.clientHeight : container.clientWidth;
    return has > 0 && end - start + padding > has + 0.5;
  }

  /**
   * TBR-18, TBR-19: decides what is shown, at once — every item shown; then, while they need more length than the toolbar
   * has and the overflow is a menu, the overflow button, and items hidden from the end one at a time, skipping those whose
   * overflow is never. TBR-8: what still does not fit scrolls. Then the hit areas (TBR-9), the Tab stop (TBR-21) and the
   * observed lengths follow.
   */
  private fitting = false;
  private fit() {
    const container = this.container;
    if (!container || this.fitting || !this.isConnected) return;
    this.fitting = true;
    try {
      const units = this.units();
      let shown = this.show(units, new Set(), false);
      this.tellSpaces(shown);
      const hidden = new Set<Element>();
      let over = this.overflows(shown);
      if (over && this.overflow !== 'scroll') {
        // The first time: the button is drawn, and this is decided again once it is (before the frame: TBR-19).
        if (!this.overflowButton) this.overflowWanted = true;
        shown = this.show(units, hidden, true);
        this.tellSpaces(shown);
        const candidates = units
          .filter((unit) => unit.kind === 'item' && unit.item && !(unit.item as HTMLElement).hidden && unit.item.getAttribute('toolbar-overflow') !== 'never')
          .map((unit) => unit.item!)
          .reverse();
        over = this.overflows(shown);
        for (const item of candidates) {
          if (!over) break;
          hidden.add(item);
          shown = this.show(units, hidden, true);
          this.tellSpaces(shown);
          over = this.overflows(shown);
        }
      }
      // TBR-2: a docked toolbar with one thing in it centres it.
      container.classList.toggle('only', shown.length === 1);
      // TBR-8: what does not fit scrolls — with overflow scroll, or what remains of a menu's (items that are never hidden).
      this.scrolls = over;
      container.classList.toggle('scrolls', over);
      const before = this.folded;
      this.folded = hidden;
      this.watch(units.filter((unit) => unit.item && !hidden.has(unit.item)).map((unit) => unit.item!));
      this.placeItems(shown);
      const changed = before.size !== hidden.size || [...hidden].some((item) => !before.has(item));
      if (changed) this.hiddenChanged(before);
      // TBR-18: without a name the overflow button is drawn and works, is exposed unnamed, and the missing word is reported once.
      if (hidden.size && !this.words.get('toolbarOverflowLabel', this.overflowLabel)) {
        this.words.missing('toolbarOverflowLabel', { prop: 'overflowLabel', id: 'TBR-18', effect: 'the overflow button is drawn and works, and has no accessible name' });
      }
      this.rove();
    } finally {
      this.fitting = false;
    }
  }

  /** What the toolbar shows now: what is hidden, which spaces and lines are drawn and how long, its container's form. */
  private state() {
    return `${this.container?.className}|${this.units()
      .map((unit) => `${unit.node.hasAttribute('data-off') ? 0 : 1}${unit.node.getAttribute('style') ?? ''}`)
      .join(',')}`;
  }

  /**
   * A length changed: what is shown is decided again, before the frame (TBR-19). What that changes may resize an element
   * the observer watches at a depth it has already reported in this frame — the container — which it would report only
   * in the next frame, with a loop error. So after a change the observation is laid down, and taken up again in the next
   * frame, where its first report decides once more and finds nothing to change. A box that holds the toolbar matters
   * only by its length along the axis: a report of its other length alone decides nothing.
   */
  private readonly observed = (entries: ResizeObserverEntry[]) => {
    let moved = false;
    for (const entry of entries) {
      if (!this.watchedAncestors.has(entry.target)) {
        moved = true;
        continue;
      }
      const length = this.axis === 'block' ? entry.contentRect.height : entry.contentRect.width;
      if (this.watchedAncestors.get(entry.target) !== length) moved = true;
      this.watchedAncestors.set(entry.target, length);
    }
    if (!moved) return;
    const before = this.state();
    this.fit();
    if (this.state() === before || !this.resize) return;
    this.resize.disconnect();
    this.watched.clear();
    this.watchedAncestors.clear();
    this.watchedContainer = null;
    this.resting = true;
    requestAnimationFrame(() => {
      this.resting = false;
      if (this.isConnected) this.fit();
    });
  };

  /**
   * The lengths the toolbar watches: its container (whose length follows the spaces, which follow the tokens), each item
   * shown — a hidden one is drawn as nothing and is not watched — and every box that holds it, up to the root, whose
   * lengths are the room an inline or a floating toolbar may take (TBR-18). The parent alone is not enough: a parent as
   * long as its content (an inline-block, a flex item, a float, an absolutely placed box) is as long as the items still
   * shown, and stays so when a box further up is given more room — the toolbar would never show its items again. Which
   * box first has a length of its own cannot be read from the styles (a flex or grid item, `fit-content`, a table cell
   * all depend on the layout around them), so each one is watched: a box whose length follows the toolbar's is reported
   * only with it, and its other length is ignored (`observed`). The boxes are those of the flat tree — the slot a
   * toolbar is assigned to, then the boxes of that shadow root — since those are what lay it out.
   */
  private watch(items: Element[]) {
    const resize = this.resize;
    if (!resize || this.resting) return;
    const container = this.container;
    if (container !== this.watchedContainer) {
      if (this.watchedContainer) resize.unobserve(this.watchedContainer);
      if (container) resize.observe(container);
      this.watchedContainer = container;
    }
    for (const element of [...this.watched]) {
      if (items.includes(element)) continue;
      resize.unobserve(element);
      this.watched.delete(element);
    }
    for (const element of items) {
      if (this.watched.has(element)) continue;
      resize.observe(element);
      this.watched.add(element);
    }
    const holders = new Set<Element>();
    for (let box = flatParent(this); box; box = flatParent(box)) holders.add(box);
    for (const box of [...this.watchedAncestors.keys()]) {
      if (holders.has(box)) continue;
      resize.unobserve(box);
      this.watchedAncestors.delete(box);
    }
    for (const box of holders) {
      if (this.watchedAncestors.has(box)) continue;
      resize.observe(box);
      this.watchedAncestors.set(box, null);
    }
  }

  /**
   * TBR-9: each item's hit area reaches toward a neighbour no further than the middle of the gap between their visible
   * bounds (measured: a docked toolbar spreads its items), and as far as its target where it has none.
   */
  private placeItems(shown: Unit[]) {
    const block = this.axis === 'block';
    const rtl = getComputedStyle(this).direction === 'rtl';
    const laid = shown
      .filter((unit) => unit.kind === 'item' || unit.kind === 'other' || unit.kind === 'overflow')
      .map((unit) => ({ element: (unit.item ?? unit.node) as Element, box: (unit.item ?? unit.node).getBoundingClientRect() }));
    const gaps = laid.slice(1).map(({ box: b }, n) => {
      const a = laid[n].box;
      return Math.max(0, block ? b.top - a.bottom : rtl ? a.left - b.right : b.left - a.right);
    });
    laid.forEach(({ element }, n) => {
      if (element.localName !== BUTTON || !this.owns(element)) return;
      const place: GroupPlace = {
        variant: 'row',
        first: n === 0,
        last: n === laid.length - 1,
        axis: this.axis,
        reachStart: n > 0 ? hundredths(gaps[n - 1] / 2) : null,
        reachEnd: n < laid.length - 1 ? hundredths(gaps[n] / 2) : null,
      };
      const was = this.places.get(element);
      if (was && JSON.stringify(was) === JSON.stringify(place)) return;
      this.places.set(element, place);
      (element as Item)[GROUP_ITEM]?.set(place);
    });
    for (const element of [...this.places.keys()]) if (!this.owns(element)) this.places.delete(element);
  }

  /**
   * TBR-21: an item that was the Tab stop, or had focus, and is now hidden hands both to the overflow button. TBR-20:
   * the overflow menu that is open while what it holds changes is closed.
   */
  private hiddenChanged(before: ReadonlySet<Element>) {
    const overflow = this.overflowButton;
    const active = deepActive();
    const focusedHidden = [...this.folded].some((item) => !before.has(item) && active instanceof Node && (item === active || item.contains(active) || item.shadowRoot?.contains(active)));
    const lastHidden = this.last && [...this.folded].some((item) => item === this.last || item.contains(this.last) || item.shadowRoot?.contains(this.last));
    if ((focusedHidden || lastHidden) && overflow) this.last = overflow;
    if (focusedHidden && overflow) {
      this.rove();
      overflow.focus({ preventScroll: true });
    }
    const menu = this.overflowMenu;
    if (menu?.open) menu.open = false;
  }

  // ── Keyboard (TBR-10, TBR-21, TBR-24, TBR-25) ──

  /** The stops of the arrow keys in order: each item shown, both halves of a Button with menu, the overflow button last. */
  private stops(): Stop[] {
    const stops: Stop[] = [];
    for (const unit of this.units()) {
      if (unit.kind === 'overflow') {
        if (this.folded.size && unit.node.hasAttribute('data-off') === false) stops.push({ element: unit.node, owner: unit.node });
        continue;
      }
      if (unit.kind !== 'item' || !unit.item || this.folded.has(unit.item) || (unit.item as HTMLElement).hidden) continue;
      const item = unit.item as Item;
      if (item.localName === BUTTON_WITH_MENU) {
        const halves = item[ROVING_HALVES]?.halves() ?? [];
        halves.forEach((half, i) => stops.push({ element: half, owner: item, half: i as 0 | 1 }));
      } else stops.push({ element: item, owner: item });
    }
    return stops;
  }

  /** TBR-10: a stop a key can reach — not disabled by itself, nor by a disabled fieldset around it (BTN-32). */
  private enabled(stop: Stop) {
    if (stop.half !== undefined) return !isDisabledControl(stop.owner as Item) && !(stop.element as HTMLButtonElement).disabled;
    return !isDisabledControl(stop.element as Item);
  }

  /**
   * TBR-10: one Tab stop — the stop focused last while it is here and enabled, else the first enabled one — at tabindex
   * 0, every other enabled stop at -1, a disabled one untouched (it takes no focus, BTN-2). An item that left the toolbar,
   * or is hidden, gets its tabindex back; a Button with menu that left is given both halves back (SPB-33).
   */
  private rove() {
    const stops = this.stops();
    const current = stops.find((stop) => stop.element === this.last && this.enabled(stop)) ?? stops.find((stop) => this.enabled(stop)) ?? null;
    const halves = new Map<Item, 0 | 1 | null>();
    const seen = new Set<HTMLElement>();
    for (const stop of stops) {
      if (stop.half !== undefined) {
        const owner = stop.owner as Item;
        if (!halves.has(owner)) halves.set(owner, null);
        if (stop === current) halves.set(owner, stop.half);
        continue;
      }
      const element = stop.element;
      if (!this.enabled(stop)) {
        if (this.roved.delete(element)) element.removeAttribute('tabindex');
        continue;
      }
      const value = stop === current ? '0' : '-1';
      if (element.getAttribute('tabindex') !== value) element.setAttribute('tabindex', value);
      this.roved.add(element);
      seen.add(element);
    }
    for (const element of [...this.roved]) {
      if (seen.has(element)) continue;
      element.removeAttribute('tabindex');
      this.roved.delete(element);
    }
    for (const [owner, half] of halves) {
      owner[ROVING_HALVES]?.setStop(half);
      this.halved.add(owner);
    }
    for (const owner of [...this.halved]) {
      if (halves.has(owner)) continue;
      owner[ROVING_HALVES]?.setStop(undefined);
      this.halved.delete(owner);
    }
  }

  /** The stop an event came from (an item, a half, the overflow button), or null — never from inside a Menu. */
  private stopOf(event: Event): Stop | null {
    const path = event.composedPath();
    return this.stops().find((stop) => path.includes(stop.element)) ?? null;
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    const stop = this.stopOf(event);
    if (!stop) return;
    this.last = stop.element;
    this.rove();
    this.reveal(stop.owner);
  };

  /**
   * TBR-10: Right / Left Arrow (mirrored in right-to-left) in a row, Down / Up Arrow in a column, move to the next and
   * previous enabled stop, wrapping; Home and End to the first and last. Moving focus never activates: Enter and Space
   * are the focused item's own. Other keys, keys with a modifier, and keys inside a Menu (TBR-24) are left alone.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const stop = this.stopOf(event);
    if (!stop) return;
    let key: string | null = null;
    if (event.key === 'Home' || event.key === 'End') key = event.key;
    else if (this.axis === 'block') key = event.key === 'ArrowDown' || event.key === 'ArrowUp' ? event.key : null;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const forward = (event.key === 'ArrowRight') !== (getComputedStyle(this).direction === 'rtl');
      key = forward ? 'ArrowDown' : 'ArrowUp';
    }
    if (!key) return;
    const stops = this.stops();
    const index = this.keys.target(
      key,
      stops.findIndex((s) => s.element === stop.element),
      stops.map((s) => ({ focusable: this.enabled(s), label: '' })),
    );
    if (index === null) return;
    event.preventDefault();
    const next = stops[index];
    this.last = next.element;
    this.rove();
    next.element.focus({ preventScroll: true });
    this.reveal(next.owner);
  };

  /** TBR-8: an item that takes focus is brought fully into view, inside the container's padding, at once (no motion). */
  private reveal(item: Element) {
    const container = this.container;
    if (!container || !this.scrolls) return;
    const box = item.getBoundingClientRect();
    const port = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    if (this.axis === 'block') {
      const start = port.top + container.clientTop + Number.parseFloat(style.paddingTop);
      const end = port.top + container.clientTop + container.clientHeight - Number.parseFloat(style.paddingBottom);
      const delta = box.top < start ? box.top - start : box.bottom > end ? box.bottom - end : 0;
      if (delta) container.scrollBy({ top: delta, behavior: 'instant' });
    } else {
      const start = port.left + container.clientLeft + Number.parseFloat(style.paddingLeft);
      const end = port.left + container.clientLeft + container.clientWidth - Number.parseFloat(style.paddingRight);
      const delta = box.left < start ? box.left - start : box.right > end ? box.right - end : 0;
      if (delta) container.scrollBy({ left: delta, behavior: 'instant' });
    }
  }

  // ── The overflow menu (TBR-20) ──

  private readonly onOverflowClick = () => {
    const menu = this.overflowMenu;
    if (!menu) return;
    if (menu.open) {
      menu.open = false;
      return;
    }
    this.buildOverflowMenu(menu);
    menu.open = true;
  };

  private readonly onOverflowMenuClose = () => {
    const menu = this.overflowMenu;
    if (menu) menu.open = false;
  };

  /** What the overflow menu's rows fire stays in the toolbar: what a row does is the hidden item's own event (TBR-20). */
  private readonly onOverflowMenuEvent = (event: Event) => {
    event.stopPropagation();
  };

  /**
   * TBR-20: the hidden items in reading order, each run between two lines (a group, the items between two separators) a
   * group of the menu, which the menu sets apart as its separation says.
   */
  private buildOverflowMenu(menu: TanreiMenu) {
    menu.replaceChildren();
    const runs: Element[][] = [[]];
    for (const unit of this.units()) {
      if (unit.kind === 'sep') {
        if (runs[runs.length - 1].length) runs.push([]);
        continue;
      }
      if (unit.kind === 'item' && unit.item && this.folded.has(unit.item)) {
        const group = unit.item.parentElement?.localName === GROUP ? unit.item.parentElement : null;
        const run = runs[runs.length - 1];
        const runGroup = run.length ? (run[0].parentElement?.localName === GROUP ? run[0].parentElement : null) : group;
        if (run.length && runGroup !== group) runs.push([]);
        runs[runs.length - 1].push(unit.item);
      }
    }
    for (const run of runs.filter((r) => r.length)) {
      const group = document.createElement('tanrei-menu-group');
      for (const item of run) group.append(...this.rowsFor(item as Item));
      menu.append(group);
    }
  }

  /** The glyph an item shows in its icon slot, by the icon set's name; empty for a drawing of the product's own. */
  private glyphOf(item: Element) {
    const icon = item.querySelector(':scope > [slot="icon"]');
    if (!icon || icon.children.length) return '';
    return (icon.textContent ?? '').trim();
  }

  /** An item's label: its `label`, else its text without its icon. */
  private labelOf(item: Item) {
    if (item.label) return item.label;
    return [...item.childNodes]
      .filter((node) => !(node instanceof Element && node.hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
  }

  /** TBR-20: the rows of the overflow menu that stand for one hidden item. */
  private rowsFor(item: Item): Element[] {
    const disabled = isDisabledControl(item);
    const glyph = this.glyphOf(item);
    if (item.localName === BUTTON_WITH_MENU) {
      const main = document.createElement('tanrei-menu-item');
      main.setAttribute('label', item.label ?? '');
      if (glyph) main.setAttribute('leading-icon', glyph);
      main.toggleAttribute('disabled', disabled);
      main.addEventListener('click', () => (item[ROVING_HALVES]?.halves()[0] as HTMLElement | undefined)?.click());
      const sub = document.createElement('tanrei-submenu');
      sub.setAttribute('label', item.menuLabel ?? '');
      sub.toggleAttribute('disabled', disabled);
      sub.append(...this.copies([...item.querySelectorAll(':scope > [slot="menu"]')]));
      return [main, sub];
    }
    const own = this.menuOf(item);
    if (own) {
      const sub = document.createElement('tanrei-submenu');
      sub.setAttribute('label', this.labelOf(item));
      if (glyph) sub.setAttribute('leading-icon', glyph);
      sub.toggleAttribute('disabled', disabled);
      sub.append(...this.copies([...own.children].filter((child) => child.matches(MENU_ROWS))));
      return [sub];
    }
    const row = document.createElement(item.toggle ? 'tanrei-menu-checkbox-item' : 'tanrei-menu-item');
    row.setAttribute('label', this.labelOf(item));
    if (glyph) row.setAttribute('leading-icon', glyph);
    if (item.toggle) row.toggleAttribute('checked', !!item.selected);
    row.toggleAttribute('disabled', disabled);
    // The hidden item is activated as a person would: its own button, so that it fires its own click (and change).
    row.addEventListener('click', () => (item.shadowRoot?.querySelector('[part~="container"]') as HTMLElement | null)?.click());
    return [row];
  }

  /** TBR-20: a Menu's rows repeated in the overflow menu; activating a copy activates the row it repeats. */
  private copies(rows: Element[]): Element[] {
    return rows.map((row) => {
      const copy = row.cloneNode(true) as Element;
      const originals = [row, ...row.querySelectorAll(MENU_ROWS)];
      const copied = [copy, ...copy.querySelectorAll(MENU_ROWS)];
      copied.forEach((element, i) => {
        element.removeAttribute('slot');
        element.removeAttribute('id');
        const original = originals[i] as HTMLElement;
        if (element.localName === 'tanrei-submenu' || element.localName === 'tanrei-menu-group') return;
        element.addEventListener('click', (event) => {
          if (event.target === element) original.click();
        });
      });
      return copy;
    });
  }

  // ── Content ──

  /** TBR-12: a toolbar with no item, or with content that is none of its kinds, still lays it out, and says so. */
  private checkContent() {
    const children = [...this.children];
    const kinds = (child: Element) => isItem(child) || child.localName === GROUP || child.localName === SEPARATOR || this.isAnchoredMenu(child);
    const items = [...this.querySelectorAll(`:scope > ${BUTTON}, :scope > ${BUTTON_WITH_MENU}, :scope > ${GROUP} > ${BUTTON}, :scope > ${GROUP} > ${BUTTON_WITH_MENU}`)];
    if (!items.length) report(this, 'TBR-12', 'it holds no item; a toolbar holds <tanrei-button> and <tanrei-button-with-menu> elements, alone or in <tanrei-toolbar-group>s');
    for (const child of children.filter((c) => !kinds(c))) {
      report(this, 'TBR-12', `it holds <${child.localName}>, which is none of its item kinds; it is laid out, but a field or a slider would take the arrow keys the toolbar moves focus with`);
    }
    for (const group of this.groups()) {
      for (const child of [...group.children].filter((c) => !isItem(c) && !this.isAnchoredMenu(c))) {
        report(this, 'TBR-12', `a group holds <${child.localName}>, which is none of its item kinds; it is laid out, but a field or a slider would take the arrow keys the toolbar moves focus with`);
      }
    }
  }

  protected override render() {
    const vertical = this.axis === 'block';
    // TBR-23: a separator stands across the axis.
    const line = html`<span part="separator" class="sep" role="separator" aria-orientation=${vertical ? 'horizontal' : 'vertical'}></span>`;
    const parts = this.laid.map((child, i) => {
      if (child.localName === SEPARATOR) return line;
      const previous = this.laid[i - 1];
      // Between two neighbours: a line where a group or a separator meets them (the separator draws its own), else a space.
      const before = !previous || previous.localName === SEPARATOR ? nothing : previous.localName === GROUP || child.localName === GROUP ? line : html`<span class="space" aria-hidden="true"></span>`;
      return html`${before}<slot class="unit"></slot>`;
    });
    const name = this.words.get('toolbarOverflowLabel', this.overflowLabel);
    // TBR-18: the overflow button, and the menu it opens (TBR-20), from the first time an item had to be hidden.
    const overflow = this.overflowWanted
      ? html`<span class="space before-overflow" aria-hidden="true" data-off></span
          ><tanrei-button part="overflow-button" class="overflow" id="overflow" variant="text" size="medium" label=${name} data-off @click=${this.onOverflowClick}
            ><span slot="icon">${vertical ? 'more_vert' : 'more_horiz'}</span></tanrei-button
          >`
      : nothing;
    const menu = this.overflowWanted
      ? html`<tanrei-menu
          part="overflow-menu"
          class="overflow-menu"
          anchor="overflow"
          placement="bottom-end"
          @close=${this.onOverflowMenuClose}
          @click=${this.onOverflowMenuEvent}
          @change=${this.onOverflowMenuEvent}
          @toggle=${this.onOverflowMenuEvent}
        ></tanrei-menu>`
      : nothing;
    return html`<div part="container" class="container" data-tanrei-shape @wheel=${containedWheel}>${parts}${overflow}</div>
      <span class="menus"><slot class="menus-slot"></slot>${menu}</span>`;
  }

}

// TBR-26: the host carries the role, and holds the product's name while its label names it.
holdsProductName(TanreiToolbar);
if (!customElements.get('tanrei-toolbar')) customElements.define('tanrei-toolbar', TanreiToolbar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-toolbar': TanreiToolbar;
  }
}
