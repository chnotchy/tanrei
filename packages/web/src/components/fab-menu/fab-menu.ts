import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  FollowController,
  GlyphDrawnController,
  GlyphMirrorController,
  OpenAxesController,
  PressController,
  RovingKeys,
  afterClick,
  deepActive,
  hostAria,
  report,
  syncFocusStyle,
} from '../../primitives/index.js';
import type { TanreiFabMenuSizeRegistry, TanreiFabMenuVariantRegistry } from '../../registry.js';
import type { TanreiMenuCloseReason } from '../menu/menu.js';
import { AXES, itemStyles, menuStyles } from './fab-menu.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';

/** FBM-11: the glyph of the system's icon set the open toggle draws — the spec's name, not a value. */
const CLOSE_GLYPH = 'close';

/** The core variants (filled, tonal, surface), plus any a design system's generated `.d.ts` registers. */
export type TanreiFabMenuVariant = keyof TanreiFabMenuVariantRegistry;
/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiFabMenuSize = keyof TanreiFabMenuSizeRegistry;
/** What `toggle` carries: the value of `open` the toggle asks for. */
export interface TanreiFabMenuToggleDetail {
  open: boolean;
}
/**
 * Why the FAB menu asks to be closed (FBM-15, FBM-16), by the spec's names — the menu's reasons. The web has no back
 * gesture of its own: Escape is its close request, so `back` is never sent here.
 */
export type TanreiFabMenuCloseReason = TanreiMenuCloseReason;
/** What `close` carries: why the FAB menu asks to be closed. */
export interface TanreiFabMenuCloseDetail {
  reason: TanreiFabMenuCloseReason;
}

/** How many items a FAB menu holds (FBM-23): fewer or more still render, and a debug build reports it. */
const FEWEST = 2;
const MOST = 6;

// ── The item ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the FAB menu tells each item: its position among the items and how many there are. */
interface ItemContext {
  position: number;
  size: number;
}

/**
 * One action of a FAB menu — the spec's item kind `item`: an icon and a label on a raised container. The host carries
 * the item's semantics (a menu item named by its label, with its position) and takes focus from the FAB menu; it is
 * never a Tab stop. Its colors are the item parts of the FAB menu's variant, which it inherits from the menu.
 *
 * @tag tanrei-fab-menu-item
 * @csspart container - The raised container: its color, corners, elevation, every state, the ripple and the focus ring.
 * @csspart icon - The glyph before the label (hidden from assistive technology).
 * @csspart label - The item's text.
 * @fires click - The item was activated by pointer, touch, keyboard or assistive technology; it bubbles. The FAB menu then emits `close` with the reason `item`.
 */
export class TanreiFabMenuItem extends LitElement {
  static override styles = [itemStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    icon: { type: String },
    context: { state: true },
  };

  /** The item's text and its accessible name. Required. */
  label = '';

  /** The name of the item's glyph in the system's icon set (its ligature text, `upload`). Required. A name the icon set flags is drawn mirrored in right-to-left. */
  icon = '';

  /** What the FAB menu says about this item. */
  protected context: ItemContext = { position: 0, size: 0 };

  /**
   * FBM-26: the item's glyph is marked when the icon set mirrors its name in right-to-left (src/primitives/glyph-mirror.ts);
   * `iconGlyph()` draws the mark, in the glyph's own box.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  /** FBM-8 / FBM-9 for an item: the pressed state, press-hold and the answer the system chooses. */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot?.querySelector('.label') ?? null,
    disabled: () => false,
  });

  private spaceDown = false;

  private get container() {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('keyup', this.onKeyUp);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  override connectedCallback() {
    super.connectedCallback();
    // FBM-17: every item takes focus from the FAB menu and none is a Tab stop (Tab closes the menu, FBM-15).
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
  }

  /** @internal The FAB menu's side: the item's position and the number of items. */
  setMenuContext(context: ItemContext) {
    if (context.position === this.context.position && context.size === this.context.size) return;
    this.context = context;
  }

  /**
   * @internal FBM-19: grows in, `order` motion.stagger after the first (0 is the item nearest the toggle); `null`
   * shows it at once (in place, or a menu that is not animating).
   */
  async enter(order: number | null) {
    await this.updateComplete;
    const container = this.container;
    if (!container) return;
    container.classList.remove('entering');
    if (order === null) return;
    container.style.setProperty('--_order', String(order));
    void container.offsetWidth; // restart the animation
    container.classList.add('entering');
  }

  /** Enter activates on key-down and Space on key-up, as a native button does. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== this) return;
    if (event.key === ' ') event.preventDefault(); // Space would scroll the page.
    this.press.onKeyDown(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) this.click();
    } else if (event.key === ' ') this.spaceDown = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== this) return;
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    this.click();
  };

  /** FBM-10: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (event.composedPath()[0] === this) syncFocusStyle(this, this);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    if (event.composedPath()[0] !== this) return;
    this.spaceDown = false;
    this.press.onBlur();
  };

  protected override updated(changed: PropertyValues<this>) {
    // FBM-20: a menu item named by its label, with its position and the number of items.
    hostAria(this, {
      role: 'menuitem',
      'aria-label': this.label || null,
      'aria-posinset': this.context.position ? String(this.context.position) : null,
      'aria-setsize': this.context.size ? String(this.context.size) : null,
    });
    // FBM-23: an item without a label or an icon still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label.trim()) report(this, 'FBM-23', 'label is empty, so the item has no accessible name; give it a label');
    if (changed.has('icon') && !this.icon.trim()) report(this, 'FBM-23', 'icon is empty; give the item the name of a glyph of the icon set');
  }

  protected override render() {
    return html`
      <div
        part="container"
        class="container p"
        data-tanrei-shape
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
      >
        <span part="icon" class=${classMap({ icon: true, empty: !this.icon.trim() })} aria-hidden="true">${this.icon}</span>
        <span part="label" class="label">${this.label}</span>
      </div>
    `;
  }
}

// ── The FAB menu ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Where the list goes (FBM-13, FBM-22): its bottom edge `offset` above the toggle's top edge, its end edge on the
 * toggle's end edge (the left one in right-to-left), kept inside the viewport's inline extent. The answer is the fixed
 * box's insets from the viewport's edges, each measured from the edge the list is held by — its bottom, and the
 * toggle's end edge (or the viewport's edge the list would cross) — so the list's own size never enters a length: a
 * list that changes size after it was placed (its label font arriving, a label changing) keeps its bottom and end edges
 * where they were put, in the same layout, with no frame in between. The size only decides which edge holds it.
 */
export function placeFabMenu(input: { toggle: { x: number; y: number; width: number; height: number }; list: { width: number; height: number }; viewport: { width: number; height: number }; offset: number; rtl: boolean }) {
  const { toggle, list, viewport, offset, rtl } = input;
  const bottom = viewport.height - (toggle.y - offset);
  const end = toggle.x + toggle.width;
  // Held by the viewport's left edge when the list would cross it, by its right edge when it would cross that.
  const left = rtl ? toggle.x : end - list.width;
  if (left < 0) return { bottom, left: 0, right: null };
  if (left + list.width > viewport.width) return { bottom, left: null, right: 0 };
  return rtl ? { bottom, left: toggle.x, right: null } : { bottom, left: null, right: viewport.width - end };
}

/**
 * Opens a short list of related actions from a floating action button, which turns into the list's close button while
 * they show.
 *
 * Contract: specs/fab-menu.spec.json. The toggle is a native `<button>` in the shadow root, drawn as a collapsed main
 * action button of the variant and size: it says it opens a menu (`aria-haspopup`, `aria-expanded`, `aria-controls`), and while open takes the
 * variant's open look, round corners and the close glyph. The items are `<tanrei-fab-menu-item>` children, presented as
 * a column above the toggle in a manual popover — the top layer, so nothing clips them and no content moves — with role
 * `menu`. The FAB menu is an operated overlay that is not modal: it moves focus to the first item when it
 * opens (to the last, the one nearest the toggle, when Up Arrow opened it) and back to the toggle when it closes, never
 * traps focus and draws no scrim. It never opens or closes itself: set `open` from `toggle`, and to false from `close`.
 *
 * Every visual value comes from `--tanrei-comp-fab-menu-*` tokens: per variant three looks (the closed toggle, the open
 * toggle, the items), each in every state. How a press is answered and how keyboard focus is drawn are the system's
 * choices of kind (`--tanrei-sys-behavior-*`), and how far corners ease is its amount.
 *
 * The element does not position itself (FBM-12): it is inline, at the toggle's size, and the page places it — as a main action button.
 * The `inline` attribute, for tests and documentation, draws the open items in place above the toggle instead: with
 * their elevation, without the top layer, open motion, focus on opening or light dismiss (FBM-13).
 *
 * @tag tanrei-fab-menu
 * @slot icon - The toggle's glyph while closed: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot - The items: `<tanrei-fab-menu-item>` children, two to six, the first drawn at the top.
 * @csspart container - The toggle: the native button, which carries every state and casts the elevation.
 * @csspart icon - The box the toggle's glyph is drawn in (hidden from assistive technology).
 * @csspart list - The column of items (the popover); it draws nothing of its own.
 * @fires {CustomEvent<TanreiFabMenuToggleDetail>} toggle - The toggle asks to open or close the menu: `detail.open` is the value asked for. Set `open` to it.
 * @fires {CustomEvent<TanreiFabMenuCloseDetail>} close - The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export class TanreiFabMenu extends LitElement {
  private readonly availability = new AvailabilityController(this, 'fab-menu');
  static override styles = [menuStyles, hiddenHost];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
    inline: { type: Boolean, reflect: true },
    turning: { state: true },
  };

  /** Emphasis, as the main action button's variants of the same names: it colors the toggle and the items. */
  variant: TanreiFabMenuVariant = 'filled';

  /** The toggle's size (small 40 / medium 48 / large 64 in the default system, square), as the collapsed main action button's. The items keep one size. */
  size: TanreiFabMenuSize = 'medium';

  /** Whether the items are shown. Set it from `toggle`, and to false from `close`: the FAB menu only asks. */
  open = false;

  /** The accessible name of the toggle and of the list ("Create"). Required: an icon alone is not a name. */
  label = '';

  /** Prevents opening and removes the toggle from the focus order; the toggle is drawn closed and no item is presented. */
  disabled = false;

  /** For tests and documentation: draws the open items in place above the toggle (FBM-13), without the overlay's behaviour. */
  inline = false;

  /** FBM-19: the toggle is turning between closed and open; its colors and corners move over the open or close motion. */
  protected turning = false;

  /** FBM-7: sizes and variants a design system adds, and a value the active system does not have. */
  private readonly axes = new OpenAxesController(this, { component: 'fab-menu', behavior: 'FBM-7', axes: AXES });

  /** FBM-8 / FBM-9: the toggle's pressed state, press-hold and the answer the system chooses. */
  private readonly press = new PressController(this, {
    container: () => this.toggleButton,
    holdCarrier: () => this.renderRoot?.querySelector('slot[name="icon"]') ?? null,
    disabled: () => this.disabled,
  });

  /**
   * FBM-26: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark. The close glyph of the open
   * toggle is not named to the controller: it is never mirrored (FBM-11).
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]' });

  /** FBM-24: the open toggle's close is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.glyph.close'));

  private readonly keys = new RovingKeys({ wrap: true });
  /** FBM-13: which item takes focus when the menu opens — the last one when Up Arrow opened it. */
  private entry: 'first' | 'last' = 'first';
  private closeRequested = false;
  /** Whether the items are presented now (in the top layer or in place). */
  private presented = false;
  private lastLayout = '';
  /** FBM-19: counts the turns, so that the end of one that another has replaced ends nothing. */
  private turn = 0;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private settled = false;
  private readonly children$ = new MutationObserver(() => this.sync());

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('click', this.onClick);
    this.addEventListener('focusout', this.onFocusOut);
  }

  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    // The toggle's activation is `toggle`: its native click stops at the shadow root, so a click that reaches listeners
    // on the element is an item's (which bubbles from the item, a child of the element).
    root.addEventListener('click', (event) => {
      const toggle = this.toggleButton;
      if (toggle && event.composedPath().includes(toggle)) event.stopPropagation();
    });
    return root;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.sync();
    // FBM-23: a parser or a framework may append the items after the element connects; they are counted once they
    // have settled (the next task), and again whenever they change.
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settled = true;
      this.sync();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    clearTimeout(this.settleTimer);
    this.turn++;
    this.settled = false;
    this.turning = false;
    this.stopFollowing();
  }

  private get toggleButton() {
    return this.renderRoot?.querySelector<HTMLButtonElement>('button.toggle') ?? null;
  }

  private get list() {
    return this.renderRoot?.querySelector<HTMLElement>('.list') ?? null;
  }

  /** The items, in order: the element's `<tanrei-fab-menu-item>` children. */
  private get items(): TanreiFabMenuItem[] {
    return [...this.children].filter((child): child is TanreiFabMenuItem => child instanceof TanreiFabMenuItem);
  }

  /** FBM-2 / FBM-6: the open look and the items, while open and enabled. */
  private get openForm() {
    return this.open && !this.disabled;
  }

  /** The item an event came from. */
  private itemOf(event: Event): TanreiFabMenuItem | null {
    for (const node of event.composedPath()) {
      if (node === this) return null;
      if (node instanceof TanreiFabMenuItem && node.parentElement === this) return node;
    }
    return null;
  }

  /** Tells every item its position (FBM-20) and reports a menu of fewer than two or more than six items (FBM-23). */
  private sync() {
    const items = this.items;
    items.forEach((item, index) => item.setMenuContext({ position: index + 1, size: items.length }));
    if (this.settled && (items.length < FEWEST || items.length > MOST)) {
      report(this, 'FBM-23', `it holds ${items.length} item${items.length === 1 ? '' : 's'}; a FAB menu holds two to six`);
    }
  }

  /** FBM-15 / FBM-16: asks the product to close the menu, once, with the reason. Nothing is asked of a closed menu. */
  private requestClose(reason: TanreiFabMenuCloseReason) {
    if (!this.openForm || this.closeRequested) return;
    this.closeRequested = true;
    this.dispatchEvent(new CustomEvent<TanreiFabMenuCloseDetail>('close', { detail: { reason } }));
  }

  private askToggle(open: boolean, entry: 'first' | 'last' = 'first') {
    if (this.disabled) return;
    this.entry = entry;
    this.dispatchEvent(new CustomEvent<TanreiFabMenuToggleDetail>('toggle', { detail: { open } }));
  }

  /** FBM-1: the toggle asks for the opposite of open (pointer, touch, Enter, Space — the native click). */
  private readonly onToggleClick = () => this.askToggle(!this.open);

  /** FBM-1: Down or Up Arrow on the toggle asks to open a closed menu; Up Arrow sends focus to the last item. */
  private readonly onToggleKeyDown = (event: KeyboardEvent) => {
    this.press.onKeyDown(event);
    if ((event.key !== 'ArrowDown' && event.key !== 'ArrowUp') || this.disabled || this.open) return;
    event.preventDefault();
    this.askToggle(true, event.key === 'ArrowUp' ? 'last' : 'first');
  };

  /** FBM-4 / FBM-10: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onToggleFocus = () => syncFocusStyle(this, this.toggleButton);

  /** FBM-15: Escape asks to close; FBM-15: Tab on an item asks to close; FBM-17: the arrows, Home and End move focus. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.openForm) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.requestClose('escape');
      return;
    }
    const item = this.itemOf(event);
    if (!item || event.composedPath()[0] !== item) return;
    if (event.key === 'Tab') {
      // Focus goes to the toggle first, so that the Tab's own move goes on from there, as it would have from the toggle.
      this.requestClose('tab');
      this.toggleButton?.focus();
      return;
    }
    // No typeahead: six items at most are reached with the arrow keys.
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const items = this.items;
    const current = items.indexOf(item);
    const target = this.keys.target(
      event.key,
      current,
      items.map((each) => ({ focusable: true, label: each.label })),
    );
    if (target === null) return;
    event.preventDefault();
    event.stopPropagation();
    if (target !== current) items[target].focus();
  };

  /** FBM-16: an item's activation — its click — is followed, once the click has gone through the page, by close. */
  private readonly onClick = (event: MouseEvent) => {
    if (!this.itemOf(event) || !this.openForm || this.closeRequested) return;
    this.closeRequested = true;
    afterClick(() => this.dispatchEvent(new CustomEvent<TanreiFabMenuCloseDetail>('close', { detail: { reason: 'item' } })));
  };

  /** FBM-15: focus moving out of the items and the toggle asks to close. */
  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.openForm || this.inline) return;
    // Focus that goes nowhere (a press on something that takes no focus) is not focus leaving: the press decides.
    const to = event.relatedTarget as Node | null;
    if (!to || to === this || this.contains(to) || this.renderRoot.contains(to)) return;
    this.requestClose('focus-out');
  };

  /** FBM-15: a press outside the items and the toggle asks to close; the press also reaches what is under it. */
  private readonly onOutsidePress = (event: PointerEvent) => {
    if (event.composedPath().includes(this)) return;
    this.requestClose('outside');
  };

  /** FBM-13: places the list above the toggle, in viewport coordinates. */
  private place() {
    const list = this.list;
    const toggle = this.toggleButton;
    if (!list || !toggle || this.inline || !this.presented) return;
    const offset = Number.parseFloat(getComputedStyle(list).scrollMarginBlockStart) || 0;
    // The list's own fractional size (offsetWidth is snapped to whole pixels); it only picks the edge that holds the
    // list — the lengths are the toggle's and the viewport's, so the items' end edges stay on the toggle's end edge
    // however the list's width changes after this (FBM-13).
    const size = list.getBoundingClientRect();
    const at = placeFabMenu({
      toggle: toggle.getBoundingClientRect(),
      list: { width: size.width, height: size.height },
      // The fixed box's containing block: the viewport without its scrollbars.
      viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
      offset,
      rtl: getComputedStyle(this).direction === 'rtl',
    });
    list.style.top = 'auto';
    list.style.bottom = `${at.bottom}px`;
    list.style.left = at.left === null ? 'auto' : `${at.left}px`;
    list.style.right = at.right === null ? 'auto' : `${at.right}px`;
  }

  /**
   * FBM-13: follows the toggle while it moves (scrolling, layout, the viewport) for as long as it is open — asked by
   * FollowController when something can have moved, frame by frame only while something does.
   */
  private readonly follow = (): boolean => {
    const box = this.toggleButton?.getBoundingClientRect();
    // The list's width only decides which edge holds it (placeFabMenu); the viewport's height is where its bottom is.
    const width = this.list?.getBoundingClientRect().width;
    const root = document.documentElement;
    const layout = `${box?.x},${box?.y},${box?.width},${box?.height},${root.clientWidth},${root.clientHeight},${width},${getComputedStyle(this).direction}`;
    if (layout === this.lastLayout) return false;
    this.lastLayout = layout;
    this.place();
    return true;
  };

  private readonly following = new FollowController(this, {
    followed: () => [this.toggleButton],
    sized: () => [this.list],
    check: this.follow,
  });

  private stopFollowing() {
    this.following.stop();
    this.lastLayout = '';
    document.removeEventListener('pointerdown', this.onOutsidePress, true);
  }

  /** FBM-13, FBM-19: the items into the top layer (or in place), placed, growing in one by one; focus to the entry item. */
  private show() {
    const list = this.list;
    if (!list) return;
    this.presented = true;
    list.classList.remove('leaving');
    const items = this.items;
    if (this.inline) {
      for (const item of items) void item.enter(null);
      return;
    }
    if (!list.matches(':popover-open')) list.showPopover();
    this.place();
    this.following.start();
    document.addEventListener('pointerdown', this.onOutsidePress, true);
    // The item nearest the toggle (the last) first, each next one a stagger later.
    items.forEach((item, index) => void item.enter(items.length - 1 - index));
    const entry = this.entry === 'last' ? items.at(-1) : items[0];
    this.entry = 'first';
    entry?.focus();
  }

  /** FBM-13, FBM-19: focus back to the toggle if it was in the items; all items fading out together, then removed. */
  private hide() {
    const list = this.list;
    this.stopFollowing();
    if (!list || !this.presented) return;
    this.presented = false;
    const active = deepActive();
    if (active && this.items.some((item) => item === active || item.contains(active) || item.shadowRoot?.contains(active))) this.toggleButton?.focus();
    if (!list.matches(':popover-open')) return;
    list.classList.add('leaving');
    const finish = () => {
      if (this.presented || !list.classList.contains('leaving')) return;
      list.classList.remove('leaving');
      if (list.matches(':popover-open')) list.hidePopover();
    };
    const running = list.getAnimations();
    if (running.length === 0) finish();
    else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // FBM-19: the toggle turns when its open form changes (not on the first render).
    if (!this.hasUpdated || !(changed.has('open') || changed.has('disabled'))) return;
    const wasOpen = changed.has('open') ? (changed.get('open') as boolean) : this.open;
    const wasDisabled = changed.has('disabled') ? (changed.get('disabled') as boolean) : this.disabled;
    if ((wasOpen && !wasDisabled) !== this.openForm) this.turning = true;
  }

  protected override updated(changed: PropertyValues<this>) {
    // FBM-23: a FAB menu without a label still renders; a debug build says it has no accessible name.
    if (changed.has('label') && !this.label.trim()) report(this, 'FBM-23', 'label is empty, so the toggle and the list have no accessible name; give it a label ("Create")');
    if (this.turning && (changed.has('open') || changed.has('disabled'))) this.startTurn();
    if (changed.has('open') || changed.has('disabled') || changed.has('inline')) {
      this.closeRequested = false;
      // Switching between in place and the top layer while presented: present again the other way.
      if (changed.has('inline') && this.presented) this.hide();
      if (this.openForm !== this.presented) {
        if (this.openForm) this.show();
        else this.hide();
      }
    }
    this.sync();
  }

  /**
   * FBM-19: the turn lasts the glyph's cross-fade — the open or close motion, started with the toggle's colors and
   * corners, none where motion is reduced — and ends when that cross-fade finishes on the timeline it runs on. A timer
   * would not: on a loaded page it can fire before the transitions' last frames, and ending the turn then takes the
   * corners out of the transition mid-way, so they would jump.
   */
  private startTurn() {
    const turn = ++this.turn;
    const glyphs = [...this.renderRoot.querySelectorAll<HTMLElement>('.glyph')];
    const seconds = glyphs.length ? Number.parseFloat(getComputedStyle(glyphs[0]).transitionDuration) : 0;
    // getAnimations() brings style up to date first, so the cross-fade this update started is among them.
    const running = seconds > 0 ? glyphs.flatMap((glyph) => glyph.getAnimations()) : [];
    const end = () => {
      if (turn === this.turn) this.turning = false;
    };
    if (running.length === 0) end();
    else void Promise.allSettled(running.map((animation) => animation.finished)).then(end);
  }

  protected override render() {
    const open = this.openForm;
    // FBM-20: a button named by label that opens a menu and says whether it is open; the list a menu named by label.
    // The glyphs are hidden.
    return html`
      <button
        part="container"
        type="button"
        class=${classMap({ toggle: true, open, turning: this.turning })}
        data-tanrei-shape
        aria-label=${this.label || nothing}
        aria-haspopup="menu"
        aria-expanded=${String(open)}
        aria-controls="list"
        ?disabled=${this.disabled}
        @click=${this.onToggleClick}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.onToggleKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.press.onBlur}
        @focus=${this.onToggleFocus}
      >
        <span part="icon" class="icon" aria-hidden="true">
          <span class="glyph shut"><slot name="icon"></slot></span>
          <span class="glyph close"><span class="ink">${CLOSE_GLYPH}</span></span>
        </span>
      </button>
      <div
        part="list"
        id="list"
        class=${classMap({ list: true, inline: this.inline, presented: open })}
        role="menu"
        aria-label=${this.label || nothing}
        popover=${this.inline ? nothing : 'manual'}
      >
        <slot></slot>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-fab-menu-item')) customElements.define('tanrei-fab-menu-item', TanreiFabMenuItem);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiFabMenu);
if (!customElements.get('tanrei-fab-menu')) customElements.define('tanrei-fab-menu', TanreiFabMenu);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-fab-menu': TanreiFabMenu;
    'tanrei-fab-menu-item': TanreiFabMenuItem;
  }
}
