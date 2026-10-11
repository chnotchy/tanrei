import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, GlyphDrawnController, GlyphMirrorController, LINK_MARK, LinkController, PressController, RovingKeys, type TanreiLinkTarget, WordsController, afterClick, deepActive, hostAria, linkRel, readTarget, report, syncFocusStyle } from '../../primitives/index.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { FORWARDED_ROWS, type TanreiMenu, type TanreiMenuBarChannel, type TanreiMenuCloseDetail, type TanreiSubmenuToggleDetail } from '../menu/menu.js';
import { barStyles, itemStyles, menuStyles } from './menubar.styles.js';

/** What a bar menu's `toggle` carries: its new `open`. */
export interface TanreiMenubarMenuToggleDetail {
  open: boolean;
}

/** MBR-21: the glyph of the overflow item, by its name in the system's icon set. */
const OVERFLOW_GLYPH = 'more_horiz';
/** The menu's item kinds that are rows, as the menu spec defines them: what makes a bar's menu not empty (MBR-20). */
const ROWS = 'tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu';

/** The overflow item among the bar's titles (MBR-22): the one title that is not an entry of the product's. */
const OVERFLOW = 'overflow';
/** MBR-32: an entry the product gave the bar — a menu, whose title opens it, or a bar item, which acts by itself. */
type Row = TanreiMenubarMenu | TanreiMenubarItem;
/** A title of the bar: one of its entries, in the row, or the overflow item. A bar item is a title in every respect but that it has no menu (MBR-32). */
type Title = Row | typeof OVERFLOW;
/** What the bar shows: a menu of its own (in the row, or folded and then a submenu of the overflow item's menu), the overflow item's menu alone, or nothing. */
type Shown = TanreiMenubarMenu | typeof OVERFLOW | null;
/** MBR-36: an activation the bar answers — the primary button and no modifier key. Any other click on a link is the browser's. */
const plain = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
/** The attributes of the product's anchor a link item is read from: when one changes the bar item is drawn again and the row laid out again (MBR-30). */
const ANCHOR_ATTRIBUTES = ['href', 'target', 'aria-current', 'rel', 'download', 'aria-description'];
/** MBR-9: where focus goes when a menu opens, and whether without the focus ring. */
type Entry = TanreiMenuBarChannel['entry'];

/** What the bar tells each of its entries: where it is drawn, and what its title is among the bar's titles. */
interface Place {
  /** MBR-21: the entry is folded out of the row — a menu drawn as a submenu item of the overflow item's menu, a bar item as an item of it (MBR-43). */
  folded: boolean;
  /** MBR-19: its title's position among the bar's titles, from 1, and their number. */
  position: number;
  size: number;
  /** MBR-12: its title is the bar's Tab stop. */
  stop: boolean;
  /** The bar draws its open menu in place (for tests). */
  inline: boolean;
}
const NOWHERE: Place = { folded: false, position: 0, size: 0, stop: false, inline: false };

/** Each child in a slot of its own; only a changed assignment is written (assigning again re-slots the child, which blurs a focused item). */
function assignEach(slots: Iterable<HTMLSlotElement>, nodes: readonly Element[]) {
  let i = 0;
  for (const slot of slots) {
    const node = nodes[i++];
    const now = slot.assignedNodes();
    if (node ? now.length !== 1 || now[0] !== node : now.length > 0) slot.assign(...(node ? [node] : []));
  }
}

/** A node's parent in the flat tree: the slot it is assigned to, else its parent, and a shadow root's host. */
const flatParent = (node: Node): Node | null => {
  const slot = (node as Element | Text).assignedSlot;
  if (slot) return slot;
  const parent = node.parentNode;
  return parent instanceof ShadowRoot ? parent.host : parent;
};

/**
 * One menu of a menubar — the spec's item kind `menu`: its title in the bar's row, and the items that open below it.
 *
 * It holds the menu's own item elements as its children, exactly as `<tanrei-menu>` holds them, and forwards them — each
 * in a slot of its own, none of them moved — into a Tanrei Menu in its shadow root, a manual popover in the top layer
 * placed below its title. The host is the title: `role="menuitem"` with `aria-haspopup="menu"`, `aria-expanded`,
 * `aria-disabled`, its position among the bar's titles, and the bar's roving `tabindex`; it draws its label in its shadow
 * root from the `--tanrei-comp-menubar-*` tokens of its condition (unselected, or expanded while its menu is open) and
 * state. The bar it is in does the rest: the keys, the pointer, which menu is open, and folding it into the overflow
 * item when the row has no room — it is then drawn as a submenu item of the overflow item's menu, with the same label
 * and the same items, and `open` and `toggle` mean the same there.
 *
 * `open` is its own: the bar sets it when the person opens or closes the menu and fires `toggle`; the product may set it
 * to open or close the menu itself, which fires none. The items' own `click`, `change` and `toggle` bubble through it.
 *
 * @tag tanrei-menubar-menu
 * @slot - The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 * @csspart container - The title's container: its fill, corners, every state, the ripple and the focus ring.
 * @csspart label - The title's text.
 * @fires {CustomEvent<TanreiMenubarMenuToggleDetail>} toggle - The person opened or closed the menu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes to `open` fires none. A submenu item's `toggle` bubbles through the element too: tell them apart by the event's target.
 */
export class TanreiMenubarMenu extends LitElement {
  static override styles = menuStyles;

  // Each child in a slot of its own, forwarded into the menu, which draws its dividers between them (MNU-23).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    blocks: { state: true },
    place: { state: true },
    pointerFocused: { state: true },
  };

  /** The title's text, and the name of the title and of the menu it opens ("File"). Required. One or two words. */
  label = '';

  /**
   * Whether this menu is shown. The bar sets it when the person opens or closes the menu and fires `toggle`; the
   * product may set it to open or close the menu itself. At most one menu of a bar is open.
   */
  open = false;

  /** Prevents the menu from opening. The title stays in the row and reachable with the arrow keys. */
  disabled = false;

  /** The menu's children, each in a slot of its own. */
  private blocks: Element[] = [];
  /** What the bar says about this menu. */
  private place: Place = NOWHERE;
  /** MBR-4, MBR-5: focus a pointer's act gave the title, which is not the focused state and draws no ring. */
  private pointerFocused = false;
  private readonly children$ = new MutationObserver(() => this.readChildren());

  /**
   * What the bar tells the menu this element shows (src/components/menu/menu.ts): the bar itself, the inline arrow keys
   * the menu hands back (MBR-13), where focus goes on opening (MBR-9), and whether the surface comes and goes without
   * its motion (MBR-29).
   * @internal
   */
  readonly channel: TanreiMenuBarChannel = {
    ground: this,
    inlineKey: (towardsEnd) => this.bar?.travel(this, towardsEnd),
    entry: { end: 'first', quiet: false },
    quick: false,
    fold: false,
  };

  /** MBR-6, MBR-7: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.containerElement,
    holdCarrier: () => this.renderRoot?.querySelector('.content') ?? null,
    disabled: () => this.disabled,
  });

  constructor() {
    super();
    this.addEventListener('focus', () => syncFocusStyle(this, this));
    this.addEventListener('blur', () => {
      this.pointerFocused = false;
      this.press.onBlur();
    });
    // MBR-6: Enter and Space press the title; what they do is the bar's (MBR-9).
    this.addEventListener('keydown', (event) => {
      if (event.composedPath()[0] === this) this.press.onKeyDown(event);
    });
    this.addEventListener('keyup', (event) => {
      if (event.composedPath()[0] === this) this.press.onKeyUp(event);
    });
    // MBR-9, MBR-10: a press or a tap on the title — or an activation by assistive technology, a click on the host
    // itself — opens its menu, and closes it when it is open. A click inside its menu is an item's.
    this.addEventListener('click', (event) => {
      if (this.place.folded) return;
      const first = event.composedPath()[0] as Node;
      const title = this.renderRoot?.querySelector('.title');
      if (first === this || (title && (first === title || title.contains(first)))) this.bar?.pressed(this);
    });
  }

  /** The bar this menu is one of. */
  private get bar(): TanreiMenubar | null {
    const parent = this.parentElement;
    return parent instanceof TanreiMenubar ? parent : null;
  }

  /** @internal The title's container, which the menu is placed against. */
  get containerElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /** @internal Whether the menu holds an item (MBR-20). */
  get hasItems(): boolean {
    return !!this.querySelector(ROWS);
  }

  /** @internal MBR-22: folded, the element stands in the overflow item's menu for the submenu item it draws. */
  [FORWARDED_ROWS](): Element[] {
    const submenu = this.place.folded ? this.renderRoot?.querySelector('tanrei-submenu') : null;
    return submenu ? [submenu] : [];
  }

  /** @internal The bar's side: where the menu is drawn, and its title's place among the bar's titles. */
  setBarContext(place: Place) {
    const now = this.place;
    if ((Object.keys(place) as (keyof Place)[]).every((key) => place[key] === now[key])) return;
    this.place = place;
  }

  /** @internal Focus to the title; `quiet` where a pointer's act moved it, which draws no ring (MBR-5). */
  focusTitle(quiet: boolean) {
    if (this.matches(':focus')) {
      if (!quiet) this.pointerFocused = false;
      return;
    }
    // The class is drawn in the next render; nothing is painted in between.
    this.pointerFocused = quiet;
    this.renderRoot?.querySelector('.title')?.classList.toggle('pf', quiet);
    this.focus({ preventScroll: true });
  }

  /** @internal MBR-9: focus into the open menu from its title, to its first or its last enabled item. */
  focusMenu(end: Entry['end']) {
    this.channel.entry = { end, quiet: false };
    this.renderRoot?.querySelector<TanreiMenu>('tanrei-menu')?.focusFirstItem();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true });
    this.readChildren();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
  }

  private readChildren() {
    const now = [...this.children];
    if (now.length !== this.blocks.length || now.some((child, i) => child !== this.blocks[i])) this.blocks = now;
    this.checkItems();
  }

  /** MBR-20: a menu with no item still opens its surface, empty; a debug build says so each time it becomes empty. */
  private empty = false;
  private checkItems() {
    const empty = !this.hasItems;
    if (empty === this.empty) return;
    this.empty = empty;
    if (empty && this.hasUpdated) this.reportEmpty();
  }

  private reportEmpty() {
    report(this, 'MBR-20', `the menu "${this.label}" holds no item, so its title opens an empty surface; give it tanrei-menu-item children`, { once: false });
  }

  /** MBR-11: while a menu of the bar is open, a pointer that can hover moves the open menu along with it. */
  private readonly onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') this.bar?.hovered(this);
  };

  /** MBR-14, MBR-15: the menu asks to be closed; the bar answers. */
  private readonly onMenuClose = (event: CustomEvent<TanreiMenuCloseDetail>) => {
    this.bar?.closeRequested(this, event.detail.reason);
  };

  /** MBR-22: folded, the menu's submenu item was opened or closed by the person — the same `open`, the same `toggle`. */
  private readonly onSubmenuToggle = (event: CustomEvent<TanreiSubmenuToggleDetail>) => {
    // A submenu among the items fires its own, which is the product's to hear.
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    this.bar?.foldedToggled(this, event.detail.open);
  };

  protected override willUpdate(changed: PropertyValues<this>) {
    // MBR-10, MBR-18: whoever changed open or disabled, the bar shows at most one menu and never a disabled one.
    if (changed.has('open') || changed.has('disabled')) this.bar?.reconcile();
  }

  protected override firstUpdated() {
    // The children may arrive after the element connects: an empty menu is judged once they had a frame to.
    requestAnimationFrame(() => {
      if (this.isConnected && this.empty) this.reportEmpty();
    });
    // Folded, what the submenu item says about itself (its items, its surface) is the overflow item's menu's to hear.
    this.renderRoot.addEventListener('tanrei-menu-item-update', () => this.bar?.foldedUpdated());
  }

  protected override updated(changed: PropertyValues<this>) {
    assignEach(this.renderRoot.querySelectorAll('slot'), this.blocks);
    const { folded, position, size, stop } = this.place;
    const shown = this.open && !this.disabled;
    // MBR-19: the host is the title — a menu item that opens a menu, named by the label, with whether its menu is open,
    // its disabled state and its place among the bar's titles; the bar's Tab stop is its tabindex (MBR-12). Folded, the
    // host is nothing: the submenu item it draws in the overflow item's menu says all of it.
    hostAria(
      this,
      folded
        ? { role: 'none', 'aria-haspopup': null, 'aria-expanded': null, 'aria-disabled': null, 'aria-label': null, 'aria-posinset': null, 'aria-setsize': null, tabindex: null, 'data-tanrei-folded': '' }
        : {
            role: 'menuitem',
            'aria-haspopup': 'menu',
            'aria-expanded': String(shown),
            'aria-disabled': this.disabled ? 'true' : null,
            'aria-label': this.label || null,
            'aria-posinset': position ? String(position) : null,
            'aria-setsize': size ? String(size) : null,
            tabindex: stop ? '0' : '-1',
            'data-tanrei-folded': null,
          },
    );
    // MBR-9: the menu is placed against the title's container, below it with their start edges together.
    const menu = this.renderRoot.querySelector<TanreiMenu>('tanrei-menu');
    if (menu) menu.positionAnchor = this.containerElement;
    // MBR-20: a title without a label still renders and works; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim()) report(this, 'MBR-20', 'label is empty, so the title and the menu it opens have no accessible name; give the menu a label ("File")');
    // MBR-44: a destination is a bar item's alone; one written on a menu is ignored, and the menu stays what it is.
    if (this.hasAttribute('href')) report(this, 'MBR-44', 'href is written on a menu, which opens and goes nowhere; it is ignored — a destination is a bar item\'s: <tanrei-menubar-item><a href="…">…</a></tanrei-menubar-item>');
    // MBR-21, MBR-30: the bar measures the title again, and lays its row out for what changed.
    if (changed.has('label') || changed.has('disabled') || (changed as Map<PropertyKey, unknown>).has('place')) this.bar?.entryUpdated();
  }

  protected override render() {
    const slots = this.blocks.map(() => html`<slot></slot>`);
    const shown = this.open && !this.disabled;
    // In place (the bar's inline) only while it is shown: a closed menu's surface is a popover, which draws nothing.
    // MBR-22: folded, a submenu item of the overflow item's menu — the same label, the same items, a disabled menu a
    // disabled submenu item — which that menu operates as it does any submenu (MNU-42 … MNU-52).
    if (this.place.folded) {
      return html`<tanrei-submenu label=${this.label} ?disabled=${this.disabled} .open=${shown} @toggle=${this.onSubmenuToggle}>${slots}</tanrei-submenu>`;
    }
    return html`<span
        class=${classMap({ title: true, p: true, d: this.disabled, expanded: shown, pf: this.pointerFocused })}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @pointerenter=${this.onPointerEnter}
        ><span part="container" class="container" data-tanrei-shape
          ><span class="content"><span part="label" class="label">${this.label}</span></span></span
        ></span
      ><tanrei-menu class="menu" aria-label=${this.label || nothing} .bar=${this.channel} .open=${shown} ?inline=${this.place.inline && shown} @close=${this.onMenuClose}>${slots}</tanrei-menu>`;
  }
}

/**
 * A bar item of a menubar — the spec's item kind `item`: an entry of the row that acts by itself instead of opening a
 * menu. It is drawn exactly as a menu's title is and reached by the same keys; nothing at rest tells them apart but
 * their words, so name an action with a verb ("Run") and a link with its place ("Documentation").
 *
 * **An action** is written with a `label`: `<tanrei-menubar-item label="Run"></tanrei-menubar-item>`. The host is the
 * entry — `role="menuitem"` with neither `aria-haspopup` nor `aria-expanded`, `aria-disabled`, its position among the
 * bar's entries and the bar's roving `tabindex` — and `click` is the host's own: a press, Enter, Space (on key up, as a
 * button) and assistive technology produce it, once, after the menu of the bar that was open has closed.
 *
 * **A link item** is the same element around the product's own anchor, which stays in the document:
 * `<tanrei-menubar-item><a href="/docs/">Documentation</a></tanrei-menubar-item>`. The anchor is the entry: the element
 * writes `role="menuitem"`, the roving `tabindex` and the position on it and `role="none"` on the host, and draws the
 * title around it. Everything a link is, is the anchor's — its text is the label, `href`, `target` (`_blank` opens a new
 * context: the element adds `noopener` to `rel` and draws the icon set's `open_in_new` after the label),
 * `aria-current="page"` (drawn at the emphasized weight, with no fill), `rel`, `download` — and the properties `label`,
 * `href`, `target` and `current` of the host read the anchor and write it. `click` is the anchor's own click:
 * `preventDefault()` cancels the navigation, a click with a modifier key or the middle button is the browser's, and so
 * is Enter with a modifier key; Space follows the link as Enter does. The link works before the element is defined and
 * where script does not run (`@tanrei/web/menubar.css` lays it out there).
 *
 * `disabled` on the host is the one statement that the entry is disabled; a disabled link item's anchor is written
 * without `href`. Folded into the overflow item, a bar item is an item of that menu, which it draws of itself; its
 * `click` is the same event of the same element.
 *
 * @tag tanrei-menubar-item
 * @slot - A link item's anchor: one `<a href>` child of the product's own. An action has no child.
 * @csspart container - The entry's container: its fill, corners, every state, the ripple and the focus ring.
 * @csspart label - The entry's text: an action's label, or the box a link item's anchor stands in.
 * @csspart mark - The `open_in_new` glyph of a link item that opens a new context (hidden from assistive technology).
 * @fires click - The bar item was activated by pointer, touch, Enter, Space or assistive technology — in the row, after the open menu of the bar has closed, or folded, in the overflow item's menu, before that menu closes. An action's is the host's own click; a link item's is its anchor's, before the link is followed: `preventDefault()` stops the navigation.
 */
export class TanreiMenubarItem extends LitElement {
  static override styles = [itemStyles, hiddenHost];

  // The anchor alone is drawn, in the label's place: nothing else the element holds is.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String, noAccessor: true },
    disabled: { type: Boolean, reflect: true },
    href: { attribute: false, noAccessor: true },
    target: { attribute: false, noAccessor: true },
    targetLabel: { type: String, attribute: 'target-label' },
    current: { attribute: false, noAccessor: true },
    place: { state: true },
    pointerFocused: { state: true },
  };

  /** An action's label, as its attribute or the product gave it; a link item's is its anchor's text. */
  private ownLabel = '';

  /**
   * The bar item's text and its accessible name ("Run", "Documentation"). Required. An action's is this attribute; a
   * link item's is its anchor's text, which the property reads and writes — a `label` attribute on an element that
   * holds an anchor is ignored.
   */
  get label(): string {
    const anchor = this.anchor;
    return anchor ? (anchor.textContent ?? '').trim() : this.ownLabel;
  }

  set label(value: string) {
    const text = value ?? '';
    const anchor = this.anchor;
    if (!anchor) this.ownLabel = text;
    else if ((anchor.textContent ?? '').trim() !== text) anchor.textContent = text;
    this.requestUpdate();
  }

  /** Prevents activation. The bar item stays in the row and reachable with the arrow keys. A disabled link item's anchor is written without `href`. */
  disabled = false;

  /**
   * A link item's destination: its anchor's `href`, read from it and written to it. Empty for an action. Setting it on
   * an element that holds no anchor does nothing: the destination is the anchor's, so that the link exists before the
   * element is defined.
   */
  get href(): string {
    return this.anchor?.getAttribute('href') ?? '';
  }

  set href(value: string) {
    const anchor = this.anchor;
    if (!anchor) return;
    hostAria(anchor, { href: value ? value : null });
    this.requestUpdate();
  }

  /** Where a link item opens: `same`, or `new` — its anchor's `target="_blank"`, read from it and written to it. Anything else the anchor names is `same`. */
  get target(): TanreiLinkTarget {
    return readTarget(this.anchor?.getAttribute('target')).target;
  }

  set target(value: TanreiLinkTarget) {
    const anchor = this.anchor;
    if (!anchor) return;
    hostAria(anchor, { target: readTarget(value).target === 'new' ? '_blank' : null });
    this.requestUpdate();
  }

  /** What assistive technology reads after a link item's name while it opens a new context ("opens in a new tab"): your words. Empty takes the product's words (`targetLabel`). Written as the anchor's `aria-description` unless the product wrote one there. */
  targetLabel = '';

  /** The link item names the page the person is on: its anchor's `aria-current="page"`, read from it and written to it. The bar never sets it. */
  get current(): boolean {
    const value = this.anchor?.getAttribute('aria-current');
    return value != null && value !== 'false';
  }

  set current(value: boolean) {
    const anchor = this.anchor;
    if (!anchor) return;
    hostAria(anchor, { 'aria-current': value ? 'page' : null });
    this.requestUpdate();
  }

  /** @internal The anchor's own `rel`, for the link primitive. */
  get rel(): string | null {
    return this.anchor?.getAttribute('rel') ?? null;
  }

  /** @internal The anchor's own `download`, for the link primitive. */
  get download(): string | null {
    return this.anchor?.getAttribute('download') ?? null;
  }

  /** What the bar says about this entry. */
  private place: Place = NOWHERE;
  /** MBR-4, MBR-5: focus a pointer's act gave the entry, which is not the focused state and draws no ring. */
  private pointerFocused = false;
  /** MBR-36: Space is down on the entry; it activates when the key comes up, as on a button. */
  private spaceDown = false;
  /** The description the element last wrote on the anchor: one the product wrote there is left as it is (MBR-37). */
  private described: string | null = null;
  /** What the bar measures of this entry, as it was last drawn (MBR-21, MBR-30, MBR-38). */
  private drawn = '';
  private readonly children$ = new MutationObserver(() => this.requestUpdate());
  private settled = false;

  /**
   * MBR-35, MBR-37, MBR-44: whether the anchor names a destination, whether it opens a new context and what is said of
   * that, and what a debug build is told of an address that is none (src/primitives/link.ts). The anchor is
   * the product's: the element writes no address on it.
   */
  private readonly link = new LinkController(this, { ids: { refused: 'MBR-44', newContext: 'MBR-37' }, disabled: () => this.disabled, role: 'menuitem' });

  /** MBR-6, MBR-7, MBR-36: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.container') ?? null,
    holdCarrier: () => this.renderRoot?.querySelector('.content') ?? null,
    disabled: () => this.disabled,
  });

  /** MBR-37: nothing is drawn in the mark's place until the icon set can draw it — never its name. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon') ?? []);
  /** MBR-37: the mark is mirrored exactly when the icon set marks its name, by the icon helper. */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  constructor() {
    super();
    this.addEventListener('focusin', (event) => {
      if (!this.isEntry(event)) return;
      syncFocusStyle(this, this);
      // MBR-5, MBR-8: a link item's keyboard focus is its anchor's; the ring is the container's, so the host says it.
      const anchor = this.anchor;
      this.toggleAttribute('data-tanrei-focus', !!anchor && anchor.matches(':focus-visible'));
    });
    this.addEventListener('focusout', (event) => {
      if (!this.isEntry(event)) return;
      this.pointerFocused = false;
      this.spaceDown = false;
      this.removeAttribute('data-tanrei-focus');
      this.press.onBlur();
    });
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('keyup', this.onKeyUp);
    this.addEventListener('click', this.onClickCapture, { capture: true });
    this.addEventListener('click', this.onClick);
  }

  /** The bar this entry is one of. */
  private get bar(): TanreiMenubar | null {
    const parent = this.parentElement;
    return parent instanceof TanreiMenubar ? parent : null;
  }

  /** The product's own anchor: the first `<a>` child. With one, the entry is the anchor (MBR-35, MBR-45). */
  private get anchor(): HTMLAnchorElement | null {
    for (const child of this.children) if (child instanceof HTMLAnchorElement) return child;
    return null;
  }

  /** @internal The element that is the entry: the anchor of a link item, else the host. It takes the bar's focus and carries the entry's semantics. */
  get entryElement(): HTMLElement {
    return this.anchor ?? this;
  }

  /** @internal MBR-38: the link item names the current page (ignored without a destination). */
  get isCurrent(): boolean {
    return !!this.link.form && this.current;
  }

  /** @internal MBR-37: the link item opens a new context, so it ends in the mark. */
  get marked(): boolean {
    return !!this.link.form?.opensNew;
  }

  private isEntry(event: Event): boolean {
    return !this.place.folded && event.composedPath()[0] === this.entryElement;
  }

  /** @internal MBR-43: folded, the element stands in the overflow item's menu for the item it draws. */
  [FORWARDED_ROWS](): Element[] {
    const row = this.place.folded ? this.renderRoot?.querySelector('tanrei-menu-item') : null;
    return row ? [row] : [];
  }

  /** @internal The bar's side: where the entry is drawn, and its place among the bar's titles. */
  setBarContext(place: Place) {
    const now = this.place;
    if ((Object.keys(place) as (keyof Place)[]).every((key) => place[key] === now[key])) return;
    this.place = place;
  }

  /** @internal Focus to the entry; `quiet` where a pointer's act moved it, which draws no ring (MBR-5). */
  focusTitle(quiet: boolean) {
    const entry = this.entryElement;
    if (entry.matches(':focus')) {
      if (!quiet) this.pointerFocused = false;
      return;
    }
    // The class is drawn in the next render; nothing is painted in between.
    this.pointerFocused = quiet;
    this.renderRoot?.querySelector('.title')?.classList.toggle('pf', quiet);
    entry.focus({ preventScroll: true });
  }

  /** Focus goes to the element that is the entry: the host, or the anchor of a link item (MBR-35). */
  override focus(options?: FocusOptions) {
    const entry = this.entryElement;
    if (entry === this) super.focus(options);
    else entry.focus(options);
  }

  /** `element.click()` activates the bar item as a pointer would — a link item through its anchor; a disabled one does nothing (MBR-39). */
  override click() {
    if (this.disabled) return;
    const anchor = this.anchor;
    if (anchor) anchor.click();
    else super.click();
  }

  // A `label` attribute is an action's: on an element that holds an anchor it is kept and not written to the anchor.
  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name !== 'label') {
      super.attributeChangedCallback(name, old, value);
      return;
    }
    this.ownLabel = value ?? '';
    this.requestUpdate();
  }

  override connectedCallback() {
    super.connectedCallback();
    // MBR-30: the anchor arriving, leaving, or changing its text or what it says of itself is drawn at once.
    this.children$.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ANCHOR_ATTRIBUTES });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
  }

  /**
   * MBR-33, MBR-36: Enter activates on key down and Space on key up, as a button's keys do — a handler that moves focus
   * on Space would otherwise hand the key's release to what it focused. Enter on a link item is the browser's own: it
   * fires the anchor's click and follows the link, with a modifier key in another tab or window, so nothing is
   * prevented or replaced there; a held key activates once. Space scrolls nothing.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.isEntry(event)) return;
    this.press.onKeyDown(event);
    if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat && !this.disabled) this.spaceDown = true;
      return;
    }
    if (event.key !== 'Enter') return;
    if (this.anchor?.hasAttribute('href')) {
      if (event.repeat) event.preventDefault();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) this.click();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.isEntry(event)) return;
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    // MBR-36: Space activates a link item as Enter does — with the anchor's own click — unless a modifier key is down.
    if (event.altKey || event.ctrlKey || event.metaKey || (this.link.form && event.shiftKey)) return;
    this.click();
  };

  /**
   * Every click that reaches the element, before anything inside it or the product hears it. A disabled bar item
   * swallows it (MBR-39). In the row: a click on the title that is not on the anchor is handed to the anchor, so that
   * the product hears one click on its own element; a click the browser opens elsewhere — a modifier key, another
   * button — is left to it and closes nothing (MBR-36); any other is an activation, for which the bar closes its open
   * menu first (MBR-33).
   */
  private readonly onClickCapture = (event: MouseEvent) => {
    if (this.disabled) {
      event.stopImmediatePropagation();
      if (plain(event)) event.preventDefault();
      return;
    }
    if (this.place.folded) return;
    const anchor = this.anchor;
    if (anchor) {
      const first = event.composedPath()[0] as Node;
      if (first !== anchor && !anchor.contains(first)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        anchor.click();
        return;
      }
      if (this.link.form && !plain(event)) return;
    }
    this.bar?.activating(this);
  };

  /** MBR-44: an anchor whose address is no destination — white space, a script — is an action: nothing is followed or run. */
  private readonly onClick = (event: MouseEvent) => {
    if (this.anchor?.hasAttribute('href') && !this.link.form) event.preventDefault();
  };

  /**
   * MBR-43: a plain activation of the row a folded link item draws is one click on the product's own anchor. The row's
   * own click goes no further and follows nothing; the anchor's `click()` is what the product hears — and may cancel —
   * and what navigates, while the overflow item's menu is still shown; the bar closes it after. A click the browser
   * opens elsewhere is left to the row's own anchor, which has the same address (MNU-54). An action's row needs none
   * of this: its click leaves the shadow root as the host's own.
   */
  private readonly onFoldedClick = (event: Event) => {
    const anchor = this.anchor;
    if (!this.place.folded || !anchor || this.disabled) return;
    // The anchor's own click — the one sent below — passes here too, on its way out.
    const row = this.renderRoot.querySelector('tanrei-menu-item');
    if (!row || !event.composedPath().includes(row)) return;
    if (this.link.form && !plain(event as MouseEvent)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.bar?.foldedActivated();
    anchor.click();
  };

  /**
   * MBR-5, MBR-33: focus a press gives the entry is the pointer's, and draws no ring — said here, as the press begins,
   * because an engine may call focus that a mouse gave an element visible when a key moved focus just before. A press
   * that leaves the entry without focus (it ended elsewhere; an engine that does not focus a link on a press) says
   * nothing: the bar gives it focus, quietly, once its click has gone through the page.
   */
  private readonly onPointerDown = (event: PointerEvent) => {
    this.press.onPointerDown(event);
    if (this.disabled || (event.button !== 0 && event.pointerType === 'mouse')) return;
    this.pointerFocused = true;
    this.renderRoot.querySelector('.title')?.classList.add('pf');
  };

  private readonly onPointerEnd = () => {
    this.press.release();
    if (this.pointerFocused && !this.entryElement.matches(':focus')) this.pointerFocused = false;
  };

  /** MBR-35: a link item's address is the browser's to drag, and the press ends there; an action is never the start of a drag. */
  private readonly onDragStart = (event: DragEvent) => {
    if (this.link.form) this.press.release();
    else event.preventDefault();
  };

  protected override firstUpdated() {
    this.renderRoot.addEventListener('click', this.onFoldedClick, { capture: true });
    // The anchor may arrive after the element connects: what a bar item lacks is judged once its children had a frame to.
    requestAnimationFrame(() => {
      this.settled = true;
      if (this.isConnected) this.check(this.anchor);
    });
    // Folded, what the row says about itself is the overflow item's menu's to hear.
    this.renderRoot.addEventListener('tanrei-menu-item-update', () => this.bar?.foldedUpdated());
  }

  protected override updated(changed: PropertyValues<this>) {
    const anchor = this.anchor;
    const slot = this.renderRoot.querySelector('slot');
    if (slot) {
      const now = slot.assignedNodes();
      if (anchor ? now.length !== 1 || now[0] !== anchor : now.length > 0) slot.assign(...(anchor ? [anchor] : []));
    }
    const { folded, position, size, stop } = this.place;
    const form = this.link.form;
    // MBR-42: the entry is a menu item that opens nothing — no aria-haspopup and no aria-expanded, in any value — with
    // its disabled state and its place among the bar's entries; the bar's Tab stop is its tabindex (MBR-12). MBR-35:
    // of a link item all of it is said on the anchor, and the host is nothing. Folded, the row it draws in the overflow
    // item's menu says it, and the anchor, which nothing displays, takes no focus.
    const said = {
      role: 'menuitem',
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-posinset': position ? String(position) : null,
      'aria-setsize': size ? String(size) : null,
      tabindex: stop ? '0' : '-1',
    };
    const nothingSaid = { role: 'none', 'aria-disabled': null, 'aria-label': null, 'aria-posinset': null, 'aria-setsize': null, tabindex: null };
    if (folded) {
      hostAria(this, { ...nothingSaid, 'data-tanrei-folded': '', 'data-tanrei-focus': null });
      if (anchor) hostAria(anchor, { ...said, 'aria-posinset': null, 'aria-setsize': null, tabindex: '-1' });
    } else if (anchor) {
      hostAria(this, { ...nothingSaid, 'data-tanrei-folded': null });
      hostAria(anchor, said);
    } else hostAria(this, { ...said, 'aria-label': this.label || null, 'data-tanrei-folded': null, 'data-tanrei-focus': null });
    if (anchor) {
      // MBR-37: what a new context is said with — the description, unless the product wrote its own on the anchor — and
      // no handle for the page it opens to the one that opened it.
      const want = form?.targetLabel ?? null;
      const have = anchor.getAttribute('aria-description');
      if (have === null || have === this.described) {
        hostAria(anchor, { 'aria-description': want });
        this.described = want;
      }
      if (form?.opensNew) hostAria(anchor, { rel: linkRel(anchor.getAttribute('rel'), 'new') });
    }
    if (this.settled) this.check(anchor);
    // MBR-21, MBR-30, MBR-38: the bar measures the entry again, and lays its row out for what changed.
    const drawn = [this.label, this.disabled, !!form, this.marked, this.isCurrent].join('\u0000');
    if (drawn !== this.drawn || (changed as Map<PropertyKey, unknown>).has('place')) {
      this.drawn = drawn;
      this.bar?.entryUpdated();
    }
  }

  /** What a debug build is told of a bar item the element survives (MBR-38, MBR-39, MBR-44, MBR-45); the link primitive says the rest. */
  private check(anchor: HTMLAnchorElement | null) {
    if (!this.label.trim()) report(this, 'MBR-44', 'label is empty, so the bar item has no accessible name; give an action a label ("Run"), a link item\'s anchor its text');
    if (!anchor) {
      if (this.hasAttribute('href')) report(this, 'MBR-45', 'href is written on the element, which holds no anchor; it is ignored and the bar item is an action — a link item is the product\'s own anchor inside the element, <tanrei-menubar-item><a href="…">…</a></tanrei-menubar-item>, so that the link exists before the element is defined');
      return;
    }
    const address = anchor.hasAttribute('href');
    if (this.disabled && address) report(this, 'MBR-39', 'it is disabled and its anchor still has an href: it is drawn and exposed disabled, emits no click and has its plain activation prevented, but the browser still gives the address a new tab, a context menu and a drag; write the anchor without href while the bar item is disabled');
    if (!this.disabled && !address) report(this, 'MBR-44', 'its anchor has no href, so it is an action whose entry is the anchor; write an action with label instead, <tanrei-menubar-item label="…">');
    const target = anchor.getAttribute('target');
    if (!readTarget(target).known) report(this, 'MBR-44', `its anchor's target "${target}" is not one a bar item defines ("_blank" for a new context); it is drawn and described as one that opens where the person is`);
    if (this.current && !this.link.form) report(this, 'MBR-38', 'its anchor says aria-current and names no destination; current is ignored');
  }

  protected override render() {
    const form = this.link.form;
    const current = this.isCurrent;
    // MBR-43: folded, an item of the overflow item's menu — the same label, a disabled bar item a disabled row, a link
    // item the menu's own link item with the same address, target and words, and the current page said and drawn.
    if (this.place.folded) {
      // The product's anchor keeps its place in the tree that is drawn — in a slot nothing displays — so that its click
      // goes through the page as any click does (an engine sends the event of a child that is in no slot to nobody else).
      return html`<tanrei-menu-item
          class=${classMap({ current })}
          label=${this.label}
          ?disabled=${this.disabled}
          href=${form ? this.href : nothing}
          target=${form?.opensNew ? 'new' : nothing}
          target-label=${form?.opensNew && this.targetLabel ? this.targetLabel : nothing}
          .rel=${form ? this.rel : null}
          .download=${form ? this.download : null}
          .barCurrent=${current}
        ></tanrei-menu-item
        ><span class="kept"><slot></slot></span>`;
    }
    // MBR-32: a title in every respect — the same boxes, by the same rules, always unselected. MBR-35: the anchor of a
    // link item is slotted into the label, and is given the whole title by the styles.
    return html`<span
      class=${classMap({ title: true, p: true, d: this.disabled, pf: this.pointerFocused, link: !!form, current })}
      @pointerdown=${this.onPointerDown}
      @pointerup=${this.onPointerEnd}
      @pointercancel=${this.onPointerEnd}
      @pointerleave=${this.onPointerEnd}
      @dragstart=${this.onDragStart}
      ><span part="container" class="container" data-tanrei-shape
        ><span class="content"
          ><span part="label" class="label">${this.anchor ? html`<slot></slot>` : this.label}</span>${this.marked
            ? html`<span part="mark" class="icon" aria-hidden="true"><span class="ink">${LINK_MARK}</span></span>`
            : nothing}</span
        ></span
      ></span
    >`;
  }
}

/**
 * Keeps an application's commands within reach in one persistent row of named menus (File, Edit, View…), each opening
 * a menu below its title, with the arrow keys moving along the row and into each menu.
 *
 * Contract: specs/menubar.spec.json. The host is `role="menubar"`, named by `label`; its children are
 * `<tanrei-menubar-menu>` elements, each of which is its title and holds its menu's items, and — for the one or two
 * entries that act by themselves — `<tanrei-menubar-item>` elements, an action or the product's own anchor as a link
 * item, drawn and reached as the titles are (a press, Enter or Space runs or follows one; the block arrow keys do
 * nothing on it; from a menu the inline arrow keys land on it and open nothing). The bar is one Tab stop: the
 * inline arrow keys, Home, End and a typed character move along the titles; Enter, Space and the block arrow keys open
 * a title's menu; from inside a menu the inline arrow keys go on to the neighbouring menu; Escape returns to the title
 * and Tab leaves the bar. While one menu is open a pointer that moves onto another title opens that one at once. It
 * shows one menu at a time, sets each menu's `open` and fires its `toggle`.
 *
 * Titles that the row has no room for are folded whole, from the end, into one overflow item — the icon set's
 * `more_horiz`, named by `overflow-label` — whose menu holds each folded menu as a submenu. The bar measures what fits
 * and decides again when its size, its menus, a label, the text size or the direction changes. It draws no position,
 * edge or elevation of its own: you place it. Every visual value comes from `--tanrei-comp-menubar-*` tokens; the
 * surfaces the titles open are Menus, drawn from `--tanrei-comp-menu-*`.
 *
 * The `inline` attribute, for tests and documentation, draws an open menu in place below its title instead of in the
 * top layer, as the menu's own does: without placement, open motion, focus on opening or light dismiss.
 *
 * @tag tanrei-menubar
 * @slot - The entries, in the order given: `<tanrei-menubar-menu>` and `<tanrei-menubar-item>` elements. Anything else gets no title, no key and no place in the row, and is reported in debug builds (MBR-20).
 * @csspart bar - The row: its fill, paddings and the gap between titles.
 * @csspart overflow-item - The overflow item, the last title of a row that cannot hold every title.
 * @csspart container - The overflow item's container: its fill, corners, every state, the ripple and the focus ring.
 * @csspart icon - The overflow item's glyph (hidden from assistive technology).
 */
export class TanreiMenubar extends LitElement {
  private readonly availability = new AvailabilityController(this, 'menubar');
  static override styles = barStyles;

  // The titles in the row and the folded menus in the overflow item's menu are assigned by hand: a menu is in the one
  // or the other, where the product wrote it either way (MBR-22).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    overflowLabel: { type: String, attribute: 'overflow-label' },
    inline: { type: Boolean, reflect: true },
    items: { state: true },
    folds: { state: true },
    overflowOpen: { state: true },
    stop: { state: true },
    overflowQuiet: { state: true },
  };

  /** Names the bar for assistive technology ("Application menu"), in the product's language. Never drawn. Required. It is this bar's own name and is not read from the product's words. */
  label = '';

  /**
   * The accessible name of the overflow item ("More menus"), in the product's language. Never drawn. Empty takes the
   * product's words (`menubarOverflowLabel`); needed whenever the bar may be narrower than its titles.
   */
  overflowLabel = '';

  /** For tests and documentation: draws an open menu in place below its title, without the overlay's behaviour. */
  inline = false;

  /** MBR-23: the overflow item's name is the instance's, else the product's word; Tanrei has none of its own. */
  private readonly words = new WordsController(this);

  /** The bar's entries — its menus and its bar items (MBR-32) — in the order given. */
  private items: Row[] = [];
  /** MBR-21: how many entries are folded out of the row, from its end. */
  private folds = 0;
  /** MBR-22: whether the overflow item's menu is shown. */
  private overflowOpen = false;
  /** MBR-10: the menu the bar shows now — in the row, or as a submenu of the overflow item's menu. */
  private current: TanreiMenubarMenu | null = null;
  /** MBR-12: the title the Tab stop stands on: the one focused last or whose menu was opened last, whichever came later. */
  private stop: Title | null = null;
  /** The title that holds focus now, as far as the bar was told (MBR-30: a removed element tells nobody). */
  private focused: Title | null = null;
  /** MBR-4: focus a pointer's act gave the overflow item. */
  private overflowQuiet = false;
  /** What the person last acted with on the bar: a menu opened by a pointer takes focus without the ring (MBR-9). */
  private input: 'key' | 'pointer' = 'key';
  /** MBR-12: the next and the previous title, wrapping, and the first and the last (the typeahead is the bar's own: one character). */
  private readonly keys = new RovingKeys({ wrap: true });
  /** MBR-21: the inline sizes the fold is decided from, as the observer last reported them. */
  private readonly sizes = new Map<Element, number>();
  private resize: ResizeObserver | null = null;
  private readonly children$ = new MutationObserver(() => this.readChildren());
  private settled = false;

  /** What the bar tells the overflow item's menu (src/components/menu/menu.ts): as each menu's own channel, and that its own level is the fold's (MBR-22). */
  private readonly overflowChannel: TanreiMenuBarChannel = {
    ground: this,
    inlineKey: (towardsEnd) => this.travel(OVERFLOW, towardsEnd),
    entry: { end: 'first', quiet: false },
    quick: false,
    fold: true,
  };

  /** MBR-6, MBR-7, MBR-22: the overflow item is pressed as any title is. */
  private readonly press = new PressController(this, {
    container: () => this.overflowElement?.querySelector<HTMLElement>('.container') ?? null,
    holdCarrier: () => this.overflowElement?.querySelector('.content') ?? null,
    disabled: () => false,
  });

  /** MBR-21: nothing is drawn in the glyph's place until the icon set can draw it — never its name. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.overflow .icon') ?? []);
  /** MBR-25: the glyph is mirrored exactly when the icon set marks its name, by the icon helper. */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  constructor() {
    super();
    this.addEventListener('keydown', () => (this.input = 'key'), { capture: true });
    this.addEventListener('pointerdown', () => (this.input = 'pointer'), { capture: true });
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.resize ??= new ResizeObserver((entries) => this.measured(entries));
    this.children$.observe(this, { childList: true });
    this.readChildren();
    if (this.hasUpdated) this.observe();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.resize?.disconnect();
    this.sizes.clear();
  }

  // ── The titles ──

  private get overflowElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.overflow') ?? null;
  }

  private get overflowMenu(): TanreiMenu | null {
    return this.renderRoot?.querySelector<TanreiMenu>('.overflow > tanrei-menu') ?? null;
  }

  /** MBR-21: the entries in the row. */
  private get visible(): Row[] {
    return this.items.slice(0, this.items.length - this.folds);
  }

  /** MBR-21, MBR-43: the entries folded into the overflow item, in the order given. */
  private get folded(): Row[] {
    return this.items.slice(this.items.length - this.folds);
  }

  /** The bar's menus, in the order given: the entries that open. */
  private get menus(): TanreiMenubarMenu[] {
    return this.items.filter((row): row is TanreiMenubarMenu => row instanceof TanreiMenubarMenu);
  }

  /** The bar's titles, in order: the entries in the row, then the overflow item while something is folded (MBR-22). */
  private titles(): Title[] {
    return [...this.visible, ...(this.folds > 0 ? [OVERFLOW as Title] : [])];
  }

  /** The title an entry is reached from: its own, or the overflow item where it is folded. */
  private titleFor(row: Row): Title {
    return this.folded.includes(row) ? OVERFLOW : row;
  }

  /** The title whose menu is open now. */
  private openTitle(): TanreiMenubarMenu | typeof OVERFLOW | null {
    if (this.overflowOpen) return OVERFLOW;
    return this.current && !this.folded.includes(this.current) ? this.current : null;
  }

  private disabledTitle(title: Title): boolean {
    return title !== OVERFLOW && title.disabled;
  }

  private labelOf(title: Title): string {
    return title === OVERFLOW ? this.words.get('menubarOverflowLabel', this.overflowLabel) : title.label;
  }

  /** Whether `node` is in the bar: its menus and their items, wherever they are drawn, or its own shadow root. */
  private holds(node: Node | null): boolean {
    for (let at = node; at; at = flatParent(at)) if (at === this) return true;
    return false;
  }

  /** The title a key or focus event is on: the host of a menu in the row, or the overflow item — not something inside a menu. */
  private titleOf(event: Event): Title | null {
    return this.titleAt(event.composedPath()[0] as Node | null);
  }

  private titleAt(node: Node | null | undefined): Title | null {
    if (!node) return null;
    if (node === this.overflowElement) return OVERFLOW;
    if (node instanceof TanreiMenubarMenu) return this.visible.includes(node) ? node : null;
    // MBR-35: a bar item's entry is its host, or the product's anchor inside it.
    const item = node instanceof TanreiMenubarItem ? node : node.parentNode instanceof TanreiMenubarItem ? node.parentNode : null;
    return item && item.entryElement === node && this.visible.includes(item) ? item : null;
  }

  private focusTitle(title: Title, quiet: boolean) {
    if (title === OVERFLOW) {
      const element = this.overflowElement;
      if (!element) return;
      this.overflowQuiet = element.matches(':focus') ? quiet && this.overflowQuiet : quiet;
      element.querySelector('.title')?.classList.toggle('pf', this.overflowQuiet);
      element.focus({ preventScroll: true });
    } else title.focusTitle(quiet);
  }

  /** MBR-12: the Tab stop is one of the titles there are — a folded menu's is the overflow item, and with none it is the first title. */
  private stopNow(): Title | null {
    const titles = this.titles();
    if (this.stop && titles.includes(this.stop)) return this.stop;
    if (this.stop && this.stop !== OVERFLOW && this.folded.includes(this.stop)) return OVERFLOW;
    return titles[0] ?? null;
  }

  /** Tells each entry where it is drawn and what its title is among the bar's titles (MBR-12, MBR-19, MBR-21, MBR-42). */
  private place() {
    const titles = this.titles();
    const stop = this.stopNow();
    for (const row of this.items) {
      const folded = this.folded.includes(row);
      if (row instanceof TanreiMenubarMenu) row.channel.ground = this;
      row.setBarContext({ folded, position: folded ? 0 : titles.indexOf(row) + 1, size: folded ? 0 : titles.length, stop: row === stop, inline: this.inline });
    }
  }

  // ── The menus the bar holds (MBR-20, MBR-30) ──

  private readChildren() {
    const before = this.items;
    const now = [...this.children].filter(isRow);
    if (this.settled) this.checkContent();
    if (now.length === before.length && now.every((menu, i) => menu === before[i])) return;
    const removed = before.filter((menu) => !now.includes(menu));
    // MBR-30: where focus was — on a removed title, or inside a removed menu that was open — it must not fall out of
    // the bar; a removed element is no longer focused, so the bar remembers where focus was.
    const nowhere = !deepActive() || deepActive() === document.body;
    const lost = nowhere ? (removed.find((menu) => this.focused === menu || this.current === menu) ?? null) : null;
    const follower = (menu: Row): Row | null => now[Math.min(before.indexOf(menu) - removed.filter((each) => before.indexOf(each) < before.indexOf(menu)).length, now.length - 1)] ?? null;
    for (const menu of removed) {
      // MBR-30: a menu removed while open is closed without its toggle.
      if (menu instanceof TanreiMenubarMenu && this.current === menu) {
        this.current = null;
        menu.channel.quick = false;
        if (menu.open) menu.open = false;
      }
      if (this.stop === menu) this.stop = follower(menu);
      if (this.focused === menu) this.focused = null;
      menu.setBarContext(NOWHERE);
    }
    this.items = now;
    // The fold is decided again from the copies of the titles there are now; until then no more are folded than there are.
    this.folds = Math.min(this.folds, now.length);
    if (this.folds === 0 && this.overflowOpen) this.overflowOpen = false;
    this.place();
    this.reconcile();
    if (lost) {
      const next = follower(lost);
      if (next) void this.updateComplete.then(() => this.focusTitle(this.titleFor(next), this.input === 'pointer'));
    }
  }

  /**
   * MBR-20: a bar with no entry, and anything in it that is neither a menu nor a bar item, are reported; such a thing
   * gets no place in the row. MBR-44: a bar of bar items alone is drawn and works, and is reported.
   */
  private checkContent() {
    const children = [...this.children];
    const rows = children.filter(isRow);
    if (rows.length === 0) report(this, 'MBR-20', 'it holds neither a menu nor a bar item, so the bar is drawn with nothing on it and takes no focus; a menubar holds <tanrei-menubar-menu> elements, and <tanrei-menubar-item> elements beside them', { once: false });
    else if (!rows.some((row) => row instanceof TanreiMenubarMenu)) report(this, 'MBR-44', 'it holds bar items and no menu: a row of actions alone is a toolbar, and a row of links alone is navigation; it is still drawn and works');
    for (const child of children) {
      if (isRow(child)) continue;
      report(this, 'MBR-20', `it holds <${child.localName}>, which is neither a <tanrei-menubar-menu> nor a <tanrei-menubar-item>; it gets no title, no key and no place in the row — a field, a control of the product's own or an entry that holds a state would take the keys the bar moves focus with and would not be a menu item`);
    }
  }

  // ── Which menu is shown (MBR-9, MBR-10, MBR-18, MBR-22, MBR-29) ──

  private fire(menu: TanreiMenubarMenu, open: boolean) {
    menu.dispatchEvent(new CustomEvent<TanreiMenubarMenuToggleDetail>('toggle', { bubbles: true, detail: { open } }));
  }

  /**
   * Shows `next` — a menu, the overflow item's menu alone, or nothing — in place of what is shown (MBR-10: at most one):
   * the menu that was open closes first, its `open` set and its `toggle` fired (`closes`), then the new one opens, its
   * `open` set and its `toggle` fired (`opens`). Where one title's menu takes the place of another's neither moves
   * (MBR-29). Focus goes into the new menu as `entry` says (MBR-9) — the menu's own doing — or to its title where it
   * holds no item (MBR-20).
   */
  private present(next: Shown, { entry = { end: 'first', quiet: false }, closes = true, opens = true }: { entry?: Entry; closes?: boolean; opens?: boolean } = {}) {
    const was = this.openTitle();
    const menu = next === OVERFLOW ? null : next;
    const title = next === null ? null : next === OVERFLOW ? OVERFLOW : this.titleFor(next);
    // MBR-29: one title's menu in place of another's — both at once, with neither motion.
    const quick = !!was && !!title && was !== title;
    const before = this.current;
    if (before && before !== menu) {
      before.channel.quick = quick;
      this.current = null;
      if (before.open) before.open = false;
      if (closes) this.fire(before, false);
    }
    if (this.overflowOpen && title !== OVERFLOW) {
      this.overflowChannel.quick = quick;
      this.overflowOpen = false;
    }
    if (title === OVERFLOW) {
      if (!this.overflowOpen) {
        this.overflowChannel.quick = quick;
        this.overflowChannel.entry = entry;
        this.overflowOpen = true;
      }
    }
    if (menu && this.current !== menu) {
      menu.channel.quick = quick;
      menu.channel.entry = entry;
      this.current = menu;
      if (!menu.open) menu.open = true;
      if (opens) this.fire(menu, true);
    }
    // MBR-12: the Tab stop follows the menu opened last, by any input.
    if (title) {
      this.stop = title;
      this.place();
      // MBR-20: a menu with no item takes no focus; its title keeps it, or takes it from the menu that closed.
      if (title !== OVERFLOW && menu && !menu.hasItems && !this.inline && (was !== null || this.holds(deepActive()))) this.focusTitle(title, entry.quiet);
    }
  }

  /**
   * MBR-10, MBR-18: a menu's `open` or `disabled` changed — the person's doing through the bar, which is already in
   * step, or the product's: a disabled menu is closed; a menu the product closed is closed, without its toggle; a menu
   * the product opened is opened as an activation would, without its toggle, and the menu that was open closes with
   * its own; of several the product opened the first is shown.
   * @internal
   */
  reconcile() {
    for (const menu of this.menus) {
      if (!menu.open || !menu.disabled) continue;
      // MBR-18: a disabled menu is closed; one that was shown says so.
      const shown = this.current === menu;
      if (shown) this.current = null;
      menu.channel.quick = false;
      menu.open = false;
      if (shown) this.fire(menu, false);
    }
    if (this.current && !this.current.open) {
      // The product closed it: as an activation would, so focus that was inside returns to the title it is reached from.
      const closed = this.current;
      const title = this.titleFor(closed);
      closed.channel.quick = false;
      this.current = null;
      const active = deepActive();
      if (title !== OVERFLOW && closed.isConnected && this.holds(active) && !this.titleAt(active) && active !== this) this.focusTitle(title, this.input === 'pointer');
    }
    const fresh = this.menus.filter((menu) => menu.open && menu !== this.current);
    if (fresh.length === 0) return;
    if (fresh.length > 1) report(this, 'MBR-10', `open is set on ${fresh.length} menus; a bar shows one menu at a time, so the first of them is shown`, { once: false });
    for (const menu of fresh.slice(1)) menu.open = false;
    this.present(fresh[0], { opens: false });
  }

  /** @internal MBR-22: a folded menu's submenu item was opened or closed by the person, as a submenu of the overflow item's menu. */
  foldedToggled(menu: TanreiMenubarMenu, open: boolean) {
    if (open) {
      if (this.current && this.current !== menu) {
        const before = this.current;
        this.current = null;
        if (before.open) {
          before.open = false;
          this.fire(before, false);
        }
      }
      this.current = menu;
      this.stop = OVERFLOW;
      if (!menu.open) menu.open = true;
      this.fire(menu, true);
    } else {
      if (this.current === menu) this.current = null;
      if (menu.open) {
        menu.open = false;
        this.fire(menu, false);
      }
    }
  }

  /** @internal What a folded menu draws in the overflow item's menu changed: that menu reads its items again. */
  foldedUpdated() {
    const menu = this.overflowMenu;
    if (!menu) return;
    menu.requestUpdate();
    menu.dispatchEvent(new Event('tanrei-menu-item-update'));
  }

  /** @internal MBR-21, MBR-30, MBR-38: an entry's label, disabled value, mark, weight or place changed: its copy is measured again by the observer; a folded one is read again. */
  entryUpdated() {
    this.requestUpdate();
    if (this.folds > 0) this.foldedUpdated();
    // What changed may be drawn nowhere but in the copy the fold is measured from — a folded entry's label or weight
    // (MBR-38: the current page that is no longer current, MBR-30) — and the copy is never painted. An engine that
    // draws a frame only when something painted changed (WebKit on Linux) then reports the copy's new size to the
    // observer with the next frame the page happens to draw, and until then the row stays folded as it was. One frame
    // is asked for, so that what fits is decided again now; it does nothing itself.
    requestAnimationFrame(() => {});
    // MBR-38: each is drawn and exposed as given; at most one bar item of a bar names the current page.
    const current = this.items.filter((row) => row instanceof TanreiMenubarItem && row.isCurrent).length;
    if (current > 1) report(this, 'MBR-38', `${current} bar items say they are the current page; each is drawn and exposed as given — at most one names the page the person is on`);
  }

  // ── A bar item's activation (MBR-33, MBR-36, MBR-43) ──

  /**
   * @internal MBR-33, MBR-36: a bar item in the row is being activated — the click is on its way to the product. The
   * menu of the bar that is open, another entry's, closes first, with its toggle, as it does when another title is
   * pressed (MBR-10); the Tab stop is the bar item (MBR-12); and once the click has gone through the page focus rests
   * on the bar item — without the ring where the input was a pointer — unless the product moved it elsewhere.
   */
  activating(item: TanreiMenubarItem) {
    if (this.inline) return;
    if (this.openTitle() || this.current) this.present(null);
    this.stop = item;
    this.place();
    const quiet = this.input === 'pointer';
    afterClick(() => {
      const active = deepActive();
      const moved = !!active && active !== document.body && !this.holds(active);
      if (!moved && this.visible.includes(item) && this.titleAt(active) !== item) this.focusTitle(item, quiet);
    });
  }

  /** @internal MBR-43: a folded link item's row was activated: its click is heard while the overflow item's menu is still shown, which closes after it (MBR-15). */
  foldedActivated() {
    this.closeRequested(OVERFLOW, 'item');
  }

  // ── The pointer (MBR-9, MBR-10, MBR-11) ──

  /** @internal MBR-9, MBR-10: a press or a tap on a title opens its menu, and closes it where it is open, focus staying on the title. */
  pressed(title: TanreiMenubarMenu | typeof OVERFLOW) {
    if (this.disabledTitle(title)) return;
    const quiet = this.input === 'pointer';
    if (this.openTitle() === title) {
      this.present(null);
      this.focusTitle(title, quiet);
    } else this.present(title, { entry: { end: 'first', quiet } });
  }

  /** @internal MBR-11: while a menu is open, a pointer that can hover on another enabled title opens that one at once. */
  hovered(title: TanreiMenubarMenu | typeof OVERFLOW) {
    const open = this.openTitle();
    if (!open || open === title || this.disabledTitle(title) || this.inline) return;
    this.present(title, { entry: { end: 'first', quiet: true } });
    // The overflow item's menu always holds rows; a menu's own takes focus itself, or its title does (present()).
  }

  // ── The keys (MBR-9, MBR-12, MBR-13, MBR-14) ──

  /**
   * MBR-13: from inside an open menu — or on the title of an open menu that holds no item (MBR-20) — the inline arrow
   * key closes it and opens the next or the previous enabled title's menu, wrapping, passing over disabled titles,
   * with focus on its first enabled item and the ring shown. With one enabled title it does nothing.
   * @internal
   */
  travel(from: TanreiMenubarMenu | typeof OVERFLOW, towardsEnd: boolean) {
    const enabled = this.titles().filter((title) => !this.disabledTitle(title));
    // A folded menu's own channel is never asked: its items are rows of the overflow item's menu.
    const at = enabled.indexOf(from === OVERFLOW ? OVERFLOW : this.titleFor(from));
    if (at < 0 || enabled.length < 2) return;
    const next = enabled[(at + (towardsEnd ? 1 : -1) + enabled.length) % enabled.length];
    if (next instanceof TanreiMenubarItem) {
      // MBR-40: a bar item has no menu to show: it takes focus, with the ring, the open menu closes with its toggle,
      // and nothing opens or runs. No menu is then open, so the bar's keys go on along the row (MBR-12) and open none.
      this.stop = next;
      this.place();
      this.focusTitle(next, false);
      this.present(null);
      return;
    }
    this.present(next, { entry: { end: 'first', quiet: false } });
  }

  /**
   * MBR-14, MBR-15: the open menu asks to be closed. Escape returns focus to its title; Tab closes it and lets focus go
   * on out of the bar, from its title; a press outside the bar and focus leaving it close it and take no focus back; an
   * item's activation closes it after the item's own event has gone through the page, and returns focus to the title
   * unless the product moved it meanwhile.
   * @internal
   */
  closeRequested(from: TanreiMenubarMenu | typeof OVERFLOW, reason: TanreiMenuCloseDetail['reason']) {
    if (this.inline) return;
    const title = from === OVERFLOW ? OVERFLOW : this.titleFor(from);
    if (this.openTitle() !== title) return;
    if (reason === 'escape' || reason === 'back') {
      this.present(null);
      this.focusTitle(title, false);
    } else if (reason === 'tab') {
      // Focus goes to the title first — the bar's one Tab stop — so that the key's own move goes on from there, out of
      // the bar in either direction and never to another title.
      this.stop = title;
      this.place();
      this.focusTitle(title, false);
      this.present(null);
    } else if (reason === 'item') {
      const quiet = this.input === 'pointer';
      afterClick(() => {
        if (this.openTitle() !== title) return;
        const active = deepActive();
        // MBR-15: focus the product moved elsewhere while handling the item's event stays where it put it.
        const moved = !!active && active !== document.body && !this.holds(active);
        this.present(null);
        if (!moved && this.isConnected) this.focusTitle(title, quiet);
      });
    } else this.present(null);
  }

  private readonly onOverflowClose = (event: CustomEvent<TanreiMenuCloseDetail>) => this.closeRequested(OVERFLOW, event.detail.reason);

  /** MBR-12: focus on a title makes it the Tab stop; where style queries are missing the focus style is read as focus arrives (MBR-8). */
  private readonly onFocusIn = (event: FocusEvent) => {
    const title = this.titleOf(event);
    if (!title) return;
    this.focused = title;
    if (title === OVERFLOW) syncFocusStyle(this, this.overflowElement);
    if (this.stop === title) return;
    this.stop = title;
    this.place();
  };

  /** MBR-14: focus leaving the bar and its open menu closes the menu, and the bar takes no focus back. */
  private readonly onFocusOut = (event: FocusEvent) => {
    const title = this.titleOf(event);
    const to = event.relatedTarget as Node | null;
    if (title) {
      if (title === OVERFLOW) {
        this.overflowQuiet = false;
        this.press.onBlur();
      }
      // A title that was removed is not blurred by the person: the bar still knows focus was there when it reads its
      // children again (MBR-30). Whether this blur is a removal's is known once the script that caused it has ended:
      // the title is then no longer the bar's.
      if (to) {
        if (this.focused === title) this.focused = null;
      } else {
        queueMicrotask(() => {
          const here = title === OVERFLOW ? this.folds > 0 : title.parentElement === this;
          if (this.focused === title && here && this.titleAt(deepActive()) !== title) this.focused = null;
        });
      }
    }
    if (!to || this.holds(to) || this.inline) return;
    if (this.openTitle() || this.current) this.present(null);
  };

  /**
   * MBR-9, MBR-12, MBR-14, MBR-20: the keys on a title. With no menu open: the inline arrow keys, Home, End and one
   * typed character move focus along the bar and open nothing; Enter, Space and Down Arrow open the title's menu with
   * focus on its first enabled item, Up Arrow on its last; nothing else is handled — not Escape. On a title while a
   * menu is open (a menu that holds no item keeps focus on its title): the inline arrow keys travel as MBR-13 says,
   * Escape closes it, Tab closes it and moves on, and the keys that open a menu act on the focused title.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const title = this.titleOf(event);
    if (!title || event.defaultPrevented) return;
    const open = this.openTitle();
    const { key } = event;
    if (key === 'Tab') {
      // The focused title is the Tab stop, so the key's own move leaves the bar (MBR-12, MBR-14).
      if (open) this.present(null);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (key === 'Escape') {
      // MBR-14: with no menu open the key is not the bar's.
      if (!open) return;
      handled();
      this.present(null);
      return;
    }
    const titles = this.titles();
    const at = titles.indexOf(title);
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      handled();
      const towardsEnd = (key === 'ArrowRight') !== (getComputedStyle(this).direction === 'rtl');
      if (open) this.travel(open, towardsEnd);
      else this.move(titles, this.keys.target(towardsEnd ? 'ArrowDown' : 'ArrowUp', at, titles.map(() => ({ focusable: true, label: '' }))));
      return;
    }
    if (title instanceof TanreiMenubarItem) {
      // MBR-34: a bar item has no menu to open: the block arrow keys are taken and do nothing, so that the same keys
      // never open a menu on one entry and move the page on the next. Enter and Space are the bar item's own
      // (MBR-33, MBR-36) — on a link item Enter is the browser's.
      if (key === 'ArrowDown' || key === 'ArrowUp') handled();
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') return;
    } else if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      handled();
      if (event.repeat || this.disabledTitle(title)) return;
      const end = key === 'ArrowUp' ? 'last' : 'first';
      if (open !== title) this.present(title, { entry: { end, quiet: false } });
      else if (key === 'Enter' || key === ' ') this.present(null);
      else if (title !== OVERFLOW) title.focusMenu(end);
      else {
        this.overflowChannel.entry = { end, quiet: false };
        this.overflowMenu?.focusFirstItem();
      }
      return;
    }
    if (open) return;
    if (key === 'Home' || key === 'End') {
      handled();
      this.move(titles, this.keys.target(key, at, titles.map(() => ({ focusable: true, label: '' }))));
      return;
    }
    // MBR-12: one printable character, with no modifier but Shift: the next title after the focused one, wrapping,
    // whose label begins with it, whatever its letter case; nowhere when none does.
    if ([...key].length !== 1) return;
    handled();
    const typed = key.toLocaleLowerCase();
    for (let step = 1; step <= titles.length; step += 1) {
      const index = (at + step) % titles.length;
      if (this.labelOf(titles[index]).trim().toLocaleLowerCase().startsWith(typed)) {
        this.move(titles, index);
        return;
      }
    }
  };

  /** MBR-12: focus to the title at `index`, which becomes the Tab stop; nothing opens. */
  private move(titles: readonly Title[], index: number | null) {
    const title = index === null ? undefined : titles[index];
    if (!title) return;
    this.stop = title;
    this.place();
    this.focusTitle(title, false);
  }

  // ── The fold (MBR-21, MBR-22, MBR-27) ──

  /** The row, the copy of every title and of the overflow item, and the gap are observed: any of them may change what fits. */
  private observe() {
    const resize = this.resize;
    if (!resize) return;
    const wanted = new Set<Element>(this.renderRoot.querySelectorAll('.bar, .ruler > *'));
    let fewer = false;
    for (const element of [...this.sizes.keys()]) {
      if (wanted.has(element)) continue;
      resize.unobserve(element);
      this.sizes.delete(element);
      fewer = true;
    }
    // A title that left changes no size the observer watches: what fits is decided from the sizes there are (MBR-30).
    if (fewer) this.decide();
    for (const element of wanted) {
      if (this.sizes.has(element)) continue;
      // Not measured yet: nothing is decided from it until the observer has reported it.
      this.sizes.set(element, Number.NaN);
      resize.observe(element);
    }
  }

  /**
   * MBR-21: what fits, from the sizes the observer reports after a layout — the row's inner inline size, each title's
   * copy, the overflow item's and the gap — so that deciding it asks the page for no layout of its own. Every title
   * keeps its size; menus fold from the end, as few as make the rest fit beside the overflow item; where the first
   * title does not fit beside it, every menu folds.
   */
  private measured(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      if (!this.sizes.has(entry.target)) continue;
      const bar = entry.target.classList.contains('bar');
      const box = bar ? entry.contentBoxSize?.[0] : entry.borderBoxSize?.[0];
      this.sizes.set(entry.target, box ? box.inlineSize : entry.contentRect.width);
    }
    this.decide();
  }

  /** MBR-21: decides the fold from the sizes reported so far; nothing is decided while one of them is still awaited. */
  private decide() {
    const size = (selector: string) => this.sizes.get(this.renderRoot.querySelector(selector) as Element) ?? Number.NaN;
    const room = size('.bar');
    const gap = size('.ruler > .gap');
    const overflow = size('.ruler > .overflow-copy');
    const titles = [...this.renderRoot.querySelectorAll('.ruler > .menu-copy')].map((copy) => this.sizes.get(copy) ?? Number.NaN);
    if ([room, gap, overflow, ...titles].some((value) => Number.isNaN(value)) || titles.length !== this.items.length) return;
    // Half a pixel of slack: a row that fits exactly is laid out from rounded sizes.
    const fits = (length: number) => length <= room + 0.5;
    const all = titles.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, titles.length - 1);
    let kept = titles.length;
    if (!fits(all)) {
      let length = 0;
      kept = 0;
      for (let n = 0; n < titles.length - 1; n += 1) {
        length += titles[n] + gap;
        if (!fits(length + overflow)) break;
        kept = n + 1;
      }
    }
    this.fold(titles.length - kept);
  }

  /**
   * MBR-21, MBR-22: folds `count` menus from the end, at once. Where that folds or unfolds the menu that is open, or
   * changes the overflow item's menu while it is shown, it is closed first; focus that was inside it, or on a title
   * that is no longer drawn, moves to the title the menu is now reached from.
   */
  private fold(count: number) {
    if (count === this.folds) return;
    const willFold = (menu: Row) => this.items.indexOf(menu) >= this.items.length - count;
    const open = this.current;
    const active = deepActive();
    const onTitle = this.titleAt(active);
    const inside = !onTitle && this.holds(active) && active !== this;
    const closing = this.overflowOpen || (!!open && this.folded.includes(open) !== willFold(open));
    if (closing) this.present(null);
    // Where focus goes once the row is drawn again: the title its menu is now reached from.
    let refocus: Title | null = null;
    if (closing && inside) refocus = open ? (willFold(open) ? OVERFLOW : open) : count > 0 ? OVERFLOW : (this.items.at(-1) ?? null);
    else if (onTitle === OVERFLOW && count === 0) refocus = this.items.at(-1) ?? null;
    else if (onTitle && onTitle !== OVERFLOW && willFold(onTitle)) refocus = OVERFLOW;
    this.folds = count;
    this.place();
    if (refocus) {
      const quiet = this.input === 'pointer';
      const title = refocus;
      this.stop = title;
      void this.updateComplete.then(() => this.focusTitle(title, quiet));
    }
  }

  // ── The overflow item (MBR-22) ──

  private readonly onOverflowKeyDown = (event: KeyboardEvent) => {
    if (event.composedPath()[0] === this.overflowElement) this.press.onKeyDown(event);
  };

  private readonly onOverflowKeyUp = (event: KeyboardEvent) => {
    if (event.composedPath()[0] === this.overflowElement) this.press.onKeyUp(event);
  };

  private readonly onOverflowClick = (event: MouseEvent) => {
    // A click inside its menu is an item's.
    const first = event.composedPath()[0] as Node;
    const title = this.overflowElement?.querySelector('.title');
    if (first === this.overflowElement || (title && (first === title || title.contains(first)))) this.pressed(OVERFLOW);
  };

  private readonly onOverflowEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') this.hovered(OVERFLOW);
  };

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('inline')) this.place();
  }

  protected override firstUpdated() {
    this.observe();
    // An empty bar fires no slotchange: the content is checked once the children had a frame to arrive.
    requestAnimationFrame(() => {
      this.settled = true;
      if (this.isConnected) this.checkContent();
    });
  }

  protected override updated(changed: PropertyValues<this>) {
    // MBR-19: a menubar named by its label, horizontal; each title says the rest about itself.
    hostAria(this, { role: 'menubar', 'aria-label': this.label || null, 'aria-orientation': 'horizontal' });
    // MBR-20: a bar without a label still renders and works; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim()) report(this, 'MBR-20', 'label is empty, so the menubar has no accessible name; give it a label ("Application menu")');
    // MBR-21, MBR-22: the menus in the row and the folded ones, each where it is drawn now, none of them moved.
    const row = this.renderRoot.querySelector<HTMLSlotElement>('slot.row');
    const visible = this.visible;
    if (row) {
      const now = row.assignedNodes();
      if (now.length !== visible.length || now.some((node, i) => node !== visible[i])) row.assign(...visible);
    }
    assignEach(this.renderRoot.querySelectorAll<HTMLSlotElement>('.overflow > tanrei-menu > slot'), this.folded);
    const menu = this.overflowMenu;
    if (menu) menu.positionAnchor = this.overflowElement?.querySelector('.container') ?? null;
    this.observe();
    // MBR-22: without a name the overflow item is drawn and works, is exposed unnamed, and the missing word is reported once.
    if (this.folds > 0 && !this.words.get('menubarOverflowLabel', this.overflowLabel)) {
      this.words.missing('menubarOverflowLabel', { prop: 'overflowLabel', id: 'MBR-22', effect: 'the overflow item is drawn and works, and has no accessible name' });
    }
  }

  /** The copy of a title the fold is measured from: the same boxes, drawn by the same rules, never shown. */
  private copy(content: unknown, kind: string, glyph = false) {
    return html`<span class="title ${kind}"><span class=${classMap({ container: true, glyph })}><span class="content">${content}</span></span></span>`;
  }

  protected override render() {
    const titles = this.titles();
    const name = this.words.get('menubarOverflowLabel', this.overflowLabel);
    const glyph = html`<span part="icon" class="icon" aria-hidden="true"><span class="ink">${OVERFLOW_GLYPH}</span></span>`;
    // MBR-21, MBR-22: the overflow item is drawn only while something is folded — a title in every respect, its menu
    // the folded menus, each the submenu item it draws of itself.
    const overflow =
      this.folds > 0
        ? html`<div
            part="overflow-item"
            class="overflow"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded=${String(this.overflowOpen)}
            aria-label=${name || nothing}
            aria-posinset=${titles.length}
            aria-setsize=${titles.length}
            tabindex=${this.stopNow() === OVERFLOW ? '0' : '-1'}
            @keydown=${this.onOverflowKeyDown}
            @keyup=${this.onOverflowKeyUp}
            @click=${this.onOverflowClick}
          >
            <span
              class=${classMap({ title: true, p: true, expanded: this.overflowOpen, pf: this.overflowQuiet })}
              @pointerdown=${this.press.onPointerDown}
              @pointerup=${this.press.release}
              @pointercancel=${this.press.release}
              @pointerleave=${this.press.release}
              @pointerenter=${this.onOverflowEnter}
              ><span part="container" class="container glyph" data-tanrei-shape><span class="content">${glyph}</span></span></span
            ><tanrei-menu class="menu" aria-label=${name || nothing} .bar=${this.overflowChannel} .open=${this.overflowOpen} ?inline=${this.inline && this.overflowOpen} @close=${this.onOverflowClose}
              >${this.folded.map(() => html`<slot></slot>`)}</tanrei-menu
            >
          </div>`
        : nothing;
    return html`<div part="bar" class="bar"><slot class="row"></slot>${overflow}</div>
      <div class="ruler" aria-hidden="true">
        ${this.items.map((row) =>
          row instanceof TanreiMenubarItem
            ? this.copy(html`<span class="label">${row.label}</span>${row.marked ? html`<span class="icon"><span class="ink">${LINK_MARK}</span></span>` : nothing}`, row.isCurrent ? 'menu-copy current' : 'menu-copy')
            : this.copy(html`<span class="label">${row.label}</span>`, 'menu-copy'),
        )}${this.copy(html`<span class="icon"><span class="ink">${OVERFLOW_GLYPH}</span></span>`, 'overflow-copy apart', true)}<span class="gap apart"></span>
      </div>`;
  }
}

/** MBR-32: whether a child of the bar is one of its entries. */
function isRow(child: Element): child is Row {
  return child instanceof TanreiMenubarMenu || child instanceof TanreiMenubarItem;
}

if (!customElements.get('tanrei-menubar-menu')) customElements.define('tanrei-menubar-menu', TanreiMenubarMenu);
if (!customElements.get('tanrei-menubar-item')) customElements.define('tanrei-menubar-item', TanreiMenubarItem);
if (!customElements.get('tanrei-menubar')) customElements.define('tanrei-menubar', TanreiMenubar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-menubar': TanreiMenubar;
    'tanrei-menubar-menu': TanreiMenubarMenu;
    'tanrei-menubar-item': TanreiMenubarItem;
  }
}
