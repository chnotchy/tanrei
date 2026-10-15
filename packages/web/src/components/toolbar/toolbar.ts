import { LitElement, type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, GROUP_AVAILABILITY, GROUP_ITEM, GROUP_PLACE, type GroupItem, type GroupPlace, KeptLengths, OpenAxesController, type PlacingGroup, RovingKeys, hostAria, isDisabledControl, report } from '../../primitives/index.js';
import { AXES, styles } from './toolbar.styles.js';

/**
 * Where the toolbar sits: across the bottom edge (`docked`) or over the content (`floating`), plus any variant a design
 * system adds, which is drawn with the docked structure and its own values (TBR-13).
 */
export type TanreiToolbarVariant = 'docked' | 'floating' | (string & {});
/** The direction the items run. A docked toolbar is always horizontal (TBR-6). */
export type TanreiToolbarOrientation = 'horizontal' | 'vertical';

const ORIENTATIONS: readonly string[] = ['horizontal', 'vertical'];
/** The items a toolbar holds (the spec's `action` and `button` kinds): the Tanrei icon button and Button. */
const ITEMS = ['tanrei-button'];

type Item = HTMLElement & { disabled?: boolean } & Partial<GroupItem>;

/** Rounded to a hundredth of a pixel, so that a measurement that did not change does not re-render an item. */
const hundredths = (value: number) => Math.round(value * 100) / 100;

/**
 * Holds a short row of actions for the current screen or selection, docked across the bottom edge or floating over the
 * content.
 *
 * Contract: specs/toolbar.spec.json. Every value it reads is a `--tanrei-comp-toolbar-*` token of its variant: the
 * container's color, elevation, corners, cross-axis size, end padding and minimum gap, and the edge's color and width.
 * It draws no text, glyph or state of its own. Its items are the product's `<tanrei-button>` children,
 * icon-only or labelled, drawn from their own tokens with their own states, events and semantics (TBR-9); the toolbar lays them out,
 * scrolls them when they do not fit (TBR-8) and makes them one Tab stop moved through with the arrow keys (TBR-10).
 *
 * The roving Tab stop is the items' `tabindex` (0 on the stop, -1 on the other enabled items; none on a disabled one):
 * both items delegate focus to the native button in their shadow root, which a host whose tabindex is -1 takes out of the
 * Tab order. Between two items each item's hit area stops at the middle of the gap, which the toolbar measures and gives
 * its items through an internal channel (src/primitives/group-item.ts) — not a styling API.
 *
 * A floating toolbar lays its items `container.gap.floating` apart — 0 in the default system — and keeps for each a
 * length of `sys.target.touch` along its axis that its neighbour's does not reach into (TBR-16): two medium Buttons (40)
 * stand 8 apart, two large ones (56) touch. It measures its items for that and lays the space between two items as an
 * element of its own container (src/primitives/kept-length.ts): it writes nothing on the items, and a page's reset
 * (`* { margin: 0 }`) leaves the spacing as it is.
 *
 * @tag tanrei-toolbar
 * @slot - The items, in reading order: `<tanrei-button>` elements — an icon-only one for an action (a toggle such as
 * Bold is one with `toggle`), a labelled one for a text action. Anything else is still laid out, and reported in debug builds (TBR-12).
 * @csspart container - The surface: the variant's fill, elevation, corners and edge, holding the items (it scrolls them
 * along its axis when they do not fit).
 */
export class TanreiToolbar extends LitElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'toolbar');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    label: { type: String },
    scrolls: { state: true },
    only: { state: true },
  };

  /**
   * `docked` spans the bottom edge of the screen, flush with it, its color reaching under the bottom inset; `floating` is a
   * rounded, raised surface over the content, as long as its items, placed by the layout that holds it. A value a design
   * system adds is drawn with the docked structure and its own values; a value the active system does not have is drawn
   * as `docked` (reported in debug builds, TBR-13).
   */
  variant: TanreiToolbarVariant = 'docked';

  /**
   * The direction the items run. `vertical` is for a floating toolbar beside the content on a large screen; a docked
   * toolbar is always horizontal (reported in debug builds, TBR-6). Anything else is horizontal (TBR-13).
   */
  orientation: TanreiToolbarOrientation = 'horizontal';

  /** The toolbar's accessible name ("Formatting", "Message actions"). Never drawn. Required (TBR-12). */
  label = '';

  /** TBR-8: the items need more length than the toolbar has, so the container scrolls them. */
  private scrolls = false;

  /** TBR-2: it holds one element, which the container centres (its own box, not a margin on the item). */
  private only = false;

  /** TBR-13: variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'toolbar', behavior: 'TBR-13', axes: AXES });

  /** TBR-10: the next and previous enabled item, wrapping, and the first and last (no typeahead is passed to it). */
  private readonly keys = new RovingKeys({ wrap: true });
  /** TBR-10: the item that had focus last — the Tab stop while it is here and enabled. */
  private last: Element | null = null;
  /** The items whose `tabindex` the toolbar set, so that it can take it back when one leaves. */
  private readonly roved = new Set<HTMLElement>();
  /** TBR-9: where each item was placed last, with its reach toward its neighbours. */
  private readonly places = new Map<Element, GroupPlace>();

  /**
   * TBR-16: the lengths a floating toolbar's items keep along its axis; what follows from them is measured again. The
   * space between two items is a spacer in the container, never a margin on the product's item.
   */
  private readonly kept = new KeptLengths(
    () => this.measure(),
    () => this.container,
  );

  private resize: ResizeObserver | null = null;
  private mutations: MutationObserver | null = null;

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
  }

  /** The structure it draws: only `floating` floats; every other value is docked (TBR-13). */
  private get floating() {
    return this.variant === 'floating';
  }

  /** The axis its items run along: a column only for a vertical floating toolbar (TBR-6). */
  private get axis(): 'inline' | 'block' {
    return this.floating && this.orientation === 'vertical' ? 'block' : 'inline';
  }

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector('.container') ?? null;
  }

  private items(): Item[] {
    return [...this.children].filter((child) => ITEMS.includes(child.localName)) as Item[];
  }

  /** TBR-10: an item a key can reach — not disabled by itself, nor by a disabled fieldset around it (BTN-32). */
  private enabled(item: Item) {
    return !isDisabledControl(item);
  }

  /** @internal TBR-10: the platform disabled or enabled one of its items (a fieldset around it): the Tab stop is read again. */
  [GROUP_AVAILABILITY](child: Element) {
    if (child.parentElement === this) this.rove();
  }

  /** @internal TBR-9: where the toolbar places one of its children (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    if (child.parentElement !== this || !ITEMS.includes(child.localName)) return null;
    return this.places.get(child) ?? { variant: 'row', first: child === this.firstElementChild, last: child === this.lastElementChild, axis: this.axis, reachStart: null, reachEnd: null };
  }

  override connectedCallback() {
    super.connectedCallback();
    this.resize ??= new ResizeObserver(() => this.measure());
    // TBR-10: an item that becomes disabled leaves the arrow keys' order (and the Tab stop, which moves on).
    this.mutations ??= new MutationObserver(() => this.rove());
    this.mutations.observe(this, { attributes: true, attributeFilter: ['disabled'], subtree: true });
    if (this.hasUpdated) this.observe();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    this.mutations?.disconnect();
    this.kept.clear();
  }

  protected override firstUpdated() {
    this.observe();
    // An empty slot fires no slotchange: the content is checked once the element's children had a frame to arrive.
    requestAnimationFrame(() => {
      if (this.isConnected) this.checkContent();
    });
  }

  /** The container and every child are observed: a gap, an item's size or the room the toolbar has may change. */
  private observe() {
    const resize = this.resize;
    const container = this.container;
    if (!resize || !container) return;
    resize.disconnect();
    resize.observe(container);
    for (const child of this.children) resize.observe(child);
    this.keep();
  }

  /** TBR-16: only a floating toolbar keeps a target's length for each item; a docked one spreads them (TBR-2). */
  private keep() {
    this.kept.set(this.floating ? ([...this.children].filter((child) => child instanceof HTMLElement) as HTMLElement[]) : [], this.axis);
  }

  private readonly onSlotChange = () => {
    this.only = this.children.length === 1;
    for (const place of [...this.places.keys()]) if (place.parentElement !== this) this.places.delete(place);
    this.observe();
    this.rove();
    this.checkContent();
    this.measure();
  };

  /**
   * TBR-10: one Tab stop — the item focused last while it is here and enabled, else the first enabled item — at tabindex
   * 0, every other enabled item at -1, a disabled one untouched (it takes no focus, BTN-2 / BTN-2). An item that left the
   * toolbar gets its tabindex back.
   */
  private rove() {
    const items = this.items();
    const stop = this.last && items.includes(this.last as Item) && this.enabled(this.last as Item) ? this.last : (items.find((item) => this.enabled(item)) ?? null);
    for (const item of items) {
      if (!this.enabled(item)) {
        if (this.roved.delete(item)) item.removeAttribute('tabindex');
        continue;
      }
      const value = item === stop ? '0' : '-1';
      if (item.getAttribute('tabindex') !== value) item.setAttribute('tabindex', value);
      this.roved.add(item);
    }
    for (const element of [...this.roved]) {
      if (element.parentElement === this) continue;
      element.removeAttribute('tabindex');
      this.roved.delete(element);
    }
  }

  /** The toolbar's item an event came from (the child whose shadow root holds the native button), or null. */
  private itemOf(event: Event): Item | null {
    const child = event.composedPath().find((node) => node instanceof Element && node.parentElement === this) as Element | undefined;
    return child && ITEMS.includes(child.localName) ? (child as Item) : null;
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    const item = this.itemOf(event);
    if (!item) return;
    this.last = item;
    this.rove();
    this.reveal(item);
  };

  /**
   * TBR-10: Right / Left Arrow (mirrored in right-to-left) in a row, Down / Up Arrow in a column, move to the next and
   * previous enabled item, wrapping; Home and End to the first and last. Moving focus never activates: Enter and Space
   * are the focused item's own. Other keys, and keys with a modifier, are left alone.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const item = this.itemOf(event);
    if (!item) return;
    let key: string | null = null;
    if (event.key === 'Home' || event.key === 'End') key = event.key;
    else if (this.axis === 'block') key = event.key === 'ArrowDown' || event.key === 'ArrowUp' ? event.key : null;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const forward = (event.key === 'ArrowRight') !== (getComputedStyle(this).direction === 'rtl');
      key = forward ? 'ArrowDown' : 'ArrowUp';
    }
    if (!key) return;
    const items = this.items();
    const index = this.keys.target(key, items.indexOf(item), items.map((i) => ({ focusable: this.enabled(i), label: '' })));
    if (index === null) return;
    event.preventDefault();
    const next = items[index];
    this.last = next;
    this.rove();
    next.focus({ preventScroll: true });
    this.reveal(next);
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

  /**
   * TBR-9: each item's hit area reaches toward a neighbour no further than the middle of the gap between their visible
   * bounds (measured: a docked toolbar spreads its items), and as far as its target where it has none. TBR-8: whether the
   * items need more length than the toolbar has — their own sizes, the minimum gap and the paddings.
   */
  private measure() {
    const container = this.container;
    if (!container) return;
    const block = this.axis === 'block';
    const rtl = getComputedStyle(this).direction === 'rtl';
    const laid = [...this.children]
      .map((child) => ({ child, box: child.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 || box.height > 0);
    const gaps = laid.slice(1).map(({ box: b }, n) => {
      const a = laid[n].box;
      return Math.max(0, block ? b.top - a.bottom : rtl ? a.left - b.right : b.left - a.right);
    });
    laid.forEach(({ child }, n) => {
      if (!ITEMS.includes(child.localName)) return;
      const place: GroupPlace = {
        variant: 'row',
        first: n === 0,
        last: n === laid.length - 1,
        axis: this.axis,
        reachStart: n > 0 ? hundredths(gaps[n - 1] / 2) : null,
        reachEnd: n < laid.length - 1 ? hundredths(gaps[n] / 2) : null,
      };
      this.places.set(child, place);
      (child as Item)[GROUP_ITEM]?.set(place);
    });

    const style = getComputedStyle(container);
    const length = laid.reduce((sum, { box }) => sum + (block ? box.height : box.width), 0);
    const gap = Number.parseFloat(block ? style.rowGap : style.columnGap) || 0;
    const padding = block
      ? Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
      : Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    // Docked, the least space between two items is the gap; floating, it is what TBR-16 lays between them — exactly
    // what was measured, since a floating toolbar packs its items.
    const between = this.floating ? gaps.reduce((sum, value) => sum + value, 0) : gap * Math.max(0, laid.length - 1);
    const needed = length + between + padding;
    const has = block ? container.clientHeight : container.clientWidth;
    const scrolls = has > 0 && needed > has + 0.5;
    if (scrolls === this.scrolls) return;
    this.scrolls = scrolls;
    // Reported when it begins to scroll (again), not on every resize while it does.
    if (scrolls) {
      report(this, 'TBR-8', `its items need ${Math.round(needed)} px along its axis but it has ${Math.round(has)} px, so they scroll; the extra actions belong in an overflow menu the product provides (a <tanrei-menu> anchored to a "More" icon-only <tanrei-button>)`, { once: false });
    }
  }

  /** TBR-12: a toolbar with no item, or with content that is not an icon button or a Button, still lays it out, and says so. */
  private checkContent() {
    const children = [...this.children];
    if (!children.some((child) => ITEMS.includes(child.localName))) report(this, 'TBR-12', 'it holds no item; a toolbar holds <tanrei-button> elements');
    for (const child of children.filter((c) => !ITEMS.includes(c.localName))) {
      report(this, 'TBR-12', `it holds <${child.localName}>, which is not a <tanrei-button>; it is laid out, but a field or a slider would take the arrow keys the toolbar moves focus with`);
    }
  }

  protected override willUpdate() {
    // The first render already centres a single item: the light-DOM children are there before a slot says so.
    if (!this.hasUpdated) this.only = this.children.length === 1;
  }

  protected override updated(changed: PropertyValues<this>) {
    // TBR-11: a toolbar named by its label, with its orientation; its items keep their own name, role and state.
    hostAria(this, { role: 'toolbar', 'aria-label': this.label || null, 'aria-orientation': this.axis === 'block' ? 'vertical' : 'horizontal' });
    if (changed.has('label') && !this.label) report(this, 'TBR-12', 'label is empty, so the toolbar has no accessible name; give it a label ("Formatting", "Message actions")');
    if (changed.has('orientation') || changed.has('variant')) {
      // TBR-13: an orientation the component does not define is horizontal. TBR-6: a docked toolbar is horizontal.
      if (!ORIENTATIONS.includes(this.orientation)) report(this, 'TBR-13', `orientation "${this.orientation}" is not a value of the toolbar; it is drawn as "horizontal"`);
      else if (this.orientation === 'vertical' && !this.floating) report(this, 'TBR-6', `a ${this.variant} toolbar is horizontal; orientation "vertical" is for a floating toolbar`);
      // The axis may have changed: the items are measured again along it (TBR-16: and their kept lengths).
      this.keep();
      if (this.hasUpdated) requestAnimationFrame(() => this.measure());
    }
  }

  protected override render() {
    return html`<div part="container" class=${classMap({ container: true, scrolls: this.scrolls, only: this.only })} data-tanrei-shape><slot @slotchange=${this.onSlotChange}></slot></div>`;
  }
}

if (!customElements.get('tanrei-toolbar')) customElements.define('tanrei-toolbar', TanreiToolbar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-toolbar': TanreiToolbar;
  }
}
