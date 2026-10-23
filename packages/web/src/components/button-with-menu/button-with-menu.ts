import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GlyphMirrorController,
  GroupItemController,
  type GroupPlace,
  OpenAxesController,
  PressController,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  report,
  syncFocusStyle,
  syncSeparation,
  delegatedAria,
  delegatesAria,
} from '../../primitives/index.js';
import type { TanreiButtonWithMenuSizeRegistry, TanreiButtonWithMenuVariantRegistry } from '../../registry.js';
import { TanreiMenu, type TanreiMenuCloseDetail, type TanreiMenuCloseReason } from '../menu/menu.js';
import { AXES, TRAILING_WIDTHS, styles } from './button-with-menu.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (filled, tonal, elevated, outlined), plus any a design system's generated `.d.ts` registers. */
export type TanreiButtonWithMenuVariant = keyof TanreiButtonWithMenuVariantRegistry;
/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiButtonWithMenuSize = keyof TanreiButtonWithMenuSizeRegistry;
/** How the two halves are joined: `auto` takes the design system's answer, `divider` and `gap` say it for this one. */
export type TanreiButtonWithMenuSeparation = SeparationProp;
/** How wide the trailing half is: a square of the height around the chevron and the outer padding, or the chevron and a small inset on each side — as wide as a narrow icon-only Button. A closed set. */
export type TanreiButtonWithMenuTrailingWidth = 'default' | 'narrow';
/** What `toggle` carries: the value of `open` the trailing half asks for. */
export interface TanreiButtonWithMenuToggleDetail {
  open: boolean;
}
/** What `close` carries: why the menu asks to be closed (the menu's reasons; the web never sends `back`). */
export interface TanreiButtonWithMenuCloseDetail {
  reason: TanreiMenuCloseReason;
}

/** The menu's item kinds, as the menu spec defines them: what the menu slot presents. */
const MENU_CONTENT = 'tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu';

/**
 * SPB-33: the internal channel by which a component that keeps one Tab stop among its items makes each half a stop of
 * its own (a toolbar, TBR-25): which half is its Tab stop (0 the leading, 1 the trailing, null neither), and the two
 * halves to move focus to. Not part of the public surface.
 */
export const ROVING_HALVES = Symbol.for('tanrei.roving-halves');
export interface RovingHalves {
  /** The two halves, leading first; empty before the first render. */
  halves(): HTMLElement[];
  /** Which half is the Tab stop: 0, 1, null for neither, or undefined to leave both in the Tab order (SPB-17). */
  setStop(stop: 0 | 1 | null | undefined): void;
}

/** SPB-22: the pointers that hover — a mouse, a trackpad, a pen. Touch, and what a platform synthesises from it, never do. */
const hovers = (event: PointerEvent) => event.pointerType === 'mouse' || event.pointerType === 'pen';

/**
 * A half's place is its own — joined to the other half — never a button group's: the connected corners of a group item
 * (src/primitives/group-item.ts), which hold a pill's corners to half the half's measured height and make the fill, the
 * ripple and the ring follow each corner (SPB-13).
 */
class JoinedHalf extends GroupItemController {
  constructor(
    host: ConstructorParameters<typeof GroupItemController>[0],
    container: () => HTMLElement | null,
    private readonly own: GroupPlace,
  ) {
    super(host, container);
  }

  override hostConnected() {
    this.set(this.own);
  }
}

/**
 * Performs a main action with one press, and offers related actions in a menu from a second, joined button beside it.
 *
 * Contract: specs/button-with-menu.spec.json. Two native buttons in one row: the leading half (the optional icon and the
 * label) performs the main action and fires `click`; the trailing half (the chevron) asks to open or close the menu and
 * fires `toggle`. The menu is a Tanrei Menu in the shadow root, holding the `menu` slot's items, placed below the whole
 * button with menu with the end edges aligned; focus returns to the trailing half when it closes. It never opens or closes
 * itself: set `open` from `toggle`, and to false from `close`.
 *
 * With `hover-open`, a mouse or a pen resting on the trailing half for `hover-delay` ms (unset: the
 * `comp.button-with-menu.motion.hover-open-delay` token) asks to open it too, through the same `toggle`. A menu open from
 * hover takes no focus, asks to close (`toggle` with false) once the pointer has been off the trailing half and the menu
 * for `motion.hover-close-delay`, and closes on Escape wherever focus is; a press or a key on the trailing half keeps it
 * open and moves focus in, as if that activation had opened it.
 *
 * The halves are joined as `separation` names (SPB-30): under `divider` they touch, with square corners where they meet
 * and a line on the seam, and neither half draws its outline or its elevation's ring along the seam; under `gap` they
 * stand `container.inner-gap` apart with `container.inner-shape` corners. `auto` — the default — takes
 * `comp.button-with-menu.container.separation`, which follows the design system's `sys.behavior.separation`. They are
 * never stacked. `trailing-width="narrow"` draws a slim trailing half: the chevron and a small inset on each side, with
 * no padding added at its round end — as wide as a narrow icon-only Button (SPB-32).
 *
 * Every visual value comes from `--tanrei-comp-button-with-menu-*` tokens, one set per variant shared by both halves, each
 * half drawn in its own state: how a state looks is the active design system's decision, not this component's. How a
 * press is answered and how keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`),
 * and how far its corners ease is the system's amount (`--tanrei-sys-shape-corner-smoothing`); all
 * are read from the cascade, so they follow `data-tanrei-system`.
 *
 * @tag tanrei-button-with-menu
 * @slot icon - The leading half's icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot chevron - The trailing half's glyph in place of `expand_more` (one glyph of the icon set). Alone, it turns half a turn while open; with `chevron-open` it is the closed form only.
 * @slot chevron-open - The trailing half's glyph while open (one glyph of the icon set): the trailing half then cross-fades between the closed glyph and this one instead of turning. A glyph of either chevron slot that the icon set flags is mirrored in right-to-left (`data-mirror` decides for one use); `expand_more` never is.
 * @slot menu - The menu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>` and `<tanrei-menu-group>` children, each with `slot="menu"`. Their events are theirs, as in any menu.
 * @csspart container - Both halves: each is a native button carrying its own state, shape and elevation.
 * @csspart leading - The leading half.
 * @csspart trailing - The trailing half.
 * @csspart icon - The box the leading icon is drawn in (hidden from assistive technology).
 * @csspart label - The label text.
 * @csspart divider - The line on the seam between the halves under `divider` (decoration: not exposed, takes no press).
 * @csspart chevron - The box each of the trailing half's glyphs is drawn in, closed and open (hidden from assistive technology).
 * @fires click - The leading half was activated by pointer, touch, keyboard or assistive technology. Only the leading half's click reaches listeners on the element.
 * @fires {CustomEvent<TanreiButtonWithMenuToggleDetail>} toggle - The trailing half asks to open or close the menu — by a press, a key or, with `hover-open`, a hover: `detail.open` is the value asked for. Set `open` to it.
 * @fires {CustomEvent<TanreiButtonWithMenuCloseDetail>} close - The menu asks to be closed: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export class TanreiButtonWithMenu extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'button-with-menu');
  static override styles = [styles, hiddenHost];

  // Two tab stops: focus() on the host goes to the leading half. The menu's items are assigned by hand, each to a slot
  // of its own inside the menu, so that the menu draws its dividers between them (MNU-23).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    destructive: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    separation: { type: String, reflect: true },
    trailingWidth: { type: String, reflect: true, attribute: 'trailing-width' },
    label: { type: String },
    menuLabel: { type: String, attribute: 'menu-label' },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    hoverOpen: { type: Boolean, attribute: 'hover-open', reflect: true },
    hoverDelay: { type: Number, attribute: 'hover-delay' },
    iconChildren: { state: true },
    chevronChildren: { state: true },
    chevronOpenChildren: { state: true },
    menuChildren: { state: true },
    turning: { state: true },
    fromHover: { state: true },
    rovingStop: { state: true },
  };

  /** Emphasis, as Button's variants of the same names. */
  variant: TanreiButtonWithMenuVariant = 'filled';

  /**
   * SPB-34, SPB-35: the main action deletes or discards something a person may not get back. Both halves keep their
   * variant's emphasis in the error role's color, as a destructive Button does; nothing more is exposed to assistive
   * technology, so the label says what is destroyed. The menu's items are not marked by it: an item that deletes
   * carries its own `destructive`.
   */
  destructive = false;

  /** Visual height (small 32 / medium 40 / large 56 in the default system), Button's heights. The hit areas always meet the minimum target. */
  size: TanreiButtonWithMenuSize = 'medium';

  /**
   * How the two halves are joined. `divider`: they touch, and a line is drawn on the seam. `gap`: they stand a narrow gap
   * apart, with tighter corners where they face each other. `auto` takes `comp.button-with-menu.container.separation`,
   * the design system's answer (divider in the default system). The halves always sit side by side. Anything else is
   * `auto` (reported in debug builds, SPB-8).
   */
  separation: TanreiButtonWithMenuSeparation = 'auto';

  /**
   * How wide the trailing half is: `default` holds the chevron in a square of the height (32 / 40 / 56) and adds the
   * padding of the rounded outer end (36 / 44 / 60 in the default system); `narrow` is the chevron and
   * `trailing.padding-inline-narrow` on each side of it, with no outer padding (28 / 32 / 32: the width of a narrow
   * icon-only Button, SPB-32). The hit area meets the minimum target at both: a narrow half reaches it past its end
   * edge and is not drawn wider. The `trailing-width` attribute. Anything else is `default` (reported in debug
   * builds, SPB-8).
   */
  trailingWidth: TanreiButtonWithMenuTrailingWidth = 'default';

  /** The leading half's visible text and accessible name ("Save"). Required. */
  label = '';

  /** The trailing half's accessible name ("More save options"): say what the menu offers. Required — the chevron alone is not a name. */
  menuLabel = '';

  /** Whether the menu is shown. Set it from `toggle`, and to false from `close`: the button with menu only asks. */
  open = false;

  /** Prevents interaction with both halves, removes them from the focus order and presents no menu. */
  disabled = false;

  /** Also asks to open the menu when a mouse or a pen rests on the trailing half for `hoverDelay`; never for touch. A press and the keys still open it. */
  hoverOpen = false;

  /** How long, in ms, the pointer rests on the trailing half before the menu opens on hover. Unset (null) takes `comp.button-with-menu.motion.hover-open-delay`. */
  hoverDelay: number | null = null;

  /** The children in the icon slot. */
  protected iconChildren: Element[] = [];

  /** SPB-21: the children in the chevron slots; each slot draws its first. */
  protected chevronChildren: Element[] = [];
  protected chevronOpenChildren: Element[] = [];

  /** The children in the menu slot, each forwarded into the menu through a slot of its own. */
  protected menuChildren: Element[] = [];

  /** SPB-13, SPB-21: the open form is changing; the trailing half's corners move over the open motion until it is done. */
  protected turning = false;

  /** SPB-22: the menu is open from hover — presented without taking focus, closed when the pointer leaves (SPB-23). */
  protected fromHover = false;

  /** SPB-33: which half the component that places it made its Tab stop; undefined while none does (both are stops, SPB-17). */
  protected rovingStop: 0 | 1 | null | undefined = undefined;

  /** @internal SPB-33: the channel a toolbar makes each half a stop of its own by (TBR-25). */
  [ROVING_HALVES]: RovingHalves = {
    halves: () => [...(this.renderRoot?.querySelectorAll<HTMLElement>('.row > button') ?? [])],
    setStop: (stop) => {
      this.rovingStop = stop;
    },
  };

  /** Counts the turns, so that a turn replaced by the next ends nothing. */
  private turn = 0;

  /** SPB-22, SPB-23: the wait before opening, and the grace before closing, on hover. */
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  /** SPB-22: toggle asked for true from hover, and open has not become true since. */
  private hoverAsked = false;
  /** SPB-23: where a fine pointer is. */
  private onTrailing = false;
  private onMenu = false;
  /** SPB-25: the one Escape a menu open from hover takes has been taken. */
  private escapeTaken = false;
  private listeningForEscape = false;

  /** SPB-20: whether the children have settled since connecting, and whether the menu slot was empty when last seen. */
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private menuSettled = false;
  private menuWasEmpty: boolean | null = null;

  /** SPB-8: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'button-with-menu', behavior: 'SPB-8', axes: AXES });

  /**
   * SPB-9 / SPB-10: each half's pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). The
   * leading half's label carries press-hold for both: it is always rendered and has no transition of its own.
   */
  /**
   * SPB-28: the glyphs the product gave — the icon's, the chevron's and the open chevron's — are marked when the icon set
   * mirrors their name in right-to-left, or their `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()`
   * draws the mark, inside the box that turns (SPB-21). The chevron the button with menu draws itself, expand_more, is the
   * slot's fallback text: no element of the product's, and not a name the icon set mirrors.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot.icon-slot, slot.chevron-slot, slot.chevron-open-slot' });

  private readonly leadingPress = new PressController(this, {
    container: () => this.leading,
    holdCarrier: () => this.labelElement,
    disabled: () => this.disabled,
  });

  private readonly trailingPress = new PressController(this, {
    container: () => this.trailing,
    holdCarrier: () => this.labelElement,
    disabled: () => this.disabled,
  });

  /** SPB-30: where a browser has no style queries, the separation is read when it renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /** SPB-13: each half's joined corners, a pill's held to half its height. */
  private readonly leadingPlace = new JoinedHalf(this, () => this.leading, { variant: 'connected', first: true, last: false });
  private readonly trailingPlace = new JoinedHalf(this, () => this.trailing, { variant: 'connected', first: false, last: true });

  /** Which children go into which slot: the icon, and each menu child. */
  private readonly children$ = new MutationObserver((records) => this.readChildren(records));

  private get leading() {
    return this.renderRoot?.querySelector<HTMLButtonElement>('button.leading') ?? null;
  }

  private get trailing() {
    return this.renderRoot?.querySelector<HTMLButtonElement>('button.trailing') ?? null;
  }

  private get labelElement() {
    return this.renderRoot?.querySelector('.label') ?? null;
  }

  private get menu() {
    return this.renderRoot?.querySelector<TanreiMenu>('tanrei-menu') ?? null;
  }

  /** SPB-15 / SPB-20: whether the menu slot holds an item (directly or in a group). */
  private get hasItems() {
    return this.menuChildren.some((child) => child.matches(MENU_CONTENT) || !!child.querySelector(MENU_CONTENT));
  }

  /** SPB-3 / SPB-7: the open form is drawn while open, except while disabled. */
  private get openForm() {
    return this.open && !this.disabled;
  }

  constructor() {
    super();
    // SPB-3: a disabled native button already swallows its own clicks; this also covers a click dispatched on the host.
    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    // Only the leading half's click reaches listeners on the element (the spec's web note): the trailing half's (its
    // `toggle`), a menu item's (the item's own, which the menu has answered by now) and a press between the halves stop
    // at the shadow root.
    root.addEventListener('click', (event) => {
      const leading = this.leading;
      if (!leading || !event.composedPath().includes(leading)) event.stopPropagation();
    });
    return root;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
    this.readChildren();
    // SPB-20: a parser or a framework may append the children after the element connects; the menu slot is judged
    // once they have settled (the next task), and again whenever it changes.
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.menuSettled = true;
      this.checkEmptyMenu();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    clearTimeout(this.settleTimer);
    this.menuSettled = false;
    this.menuWasEmpty = null;
    this.turn++;
    this.turning = false;
    this.fromHover = false;
    this.cancelHover();
    this.onTrailing = this.onMenu = false;
    this.listenForEscape(false);
  }

  /** `element.click()` activates the leading half as a person would — through the native button — and does nothing while disabled. */
  override click() {
    const leading = this.leading;
    if (leading) leading.click();
    else if (!this.disabled) super.click();
  }

  /** The children by the slot they name. A change inside a menu child (an item added to a group) is the menu's news. */
  private readChildren(records: MutationRecord[] = []) {
    const direct = [...this.children];
    const icon = direct.filter((child) => child.slot === 'icon');
    const chevron = direct.filter((child) => child.slot === 'chevron');
    const chevronOpen = direct.filter((child) => child.slot === 'chevron-open');
    const menu = direct.filter((child) => child.slot === 'menu');
    const same = (a: Element[], b: Element[]) => a.length === b.length && a.every((el, i) => el === b[i]);
    if (!same(icon, this.iconChildren)) this.iconChildren = icon;
    if (!same(chevron, this.chevronChildren)) this.chevronChildren = chevron;
    if (!same(chevronOpen, this.chevronOpenChildren)) this.chevronOpenChildren = chevronOpen;
    if (!same(menu, this.menuChildren)) this.menuChildren = menu;
    else if (records.some((record) => record.target !== this)) {
      // Tell the menu, through its own channel, that what it holds changed.
      this.menu?.dispatchEvent(new Event('tanrei-menu-item-update'));
      this.requestUpdate();
    }
    this.checkEmptyMenu();
  }

  /**
   * SPB-20: while the menu slot holds no item the trailing half still toggles and draws its open form, and no menu is
   * presented. A debug build says so once the children have settled, and again each time the slot becomes empty —
   * never on every render.
   */
  private checkEmptyMenu() {
    if (!this.menuSettled) return;
    const empty = !this.hasItems;
    if (empty && this.menuWasEmpty !== true) {
      report(this, 'SPB-20', 'the menu slot holds no item, so the trailing half toggles but no menu is presented; give it tanrei-menu-item children with slot="menu"', { once: false });
    }
    this.menuWasEmpty = empty;
  }

  /** SPB-5 / SPB-11: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = (event: FocusEvent) => {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  };

  private toggle(open: boolean) {
    this.dispatchEvent(new CustomEvent<TanreiButtonWithMenuToggleDetail>('toggle', { detail: { open } }));
  }

  /**
   * SPB-24: a press or a key on the trailing half while the menu is open from hover keeps it open and makes it a menu
   * that activation opened: focus moves to its first enabled item (MNU-1), and the pointer leaving no longer closes it.
   */
  private adopt() {
    this.fromHover = false;
    this.cancelHover();
    this.listenForEscape(false);
    const menu = this.menu;
    if (!menu) return;
    menu.focusless = false;
    if (this.hasItems) menu.focusFirstItem();
  }

  /** SPB-2: the trailing half asks for the opposite of open; SPB-24: a menu open from hover is kept open instead. */
  private readonly onTrailingClick = () => {
    if (this.disabled) return;
    this.cancelOpenWait();
    if (this.fromHover && this.open) {
      this.adopt();
      return;
    }
    this.hoverAsked = false;
    this.toggle(!this.open);
  };

  /** SPB-2: Down Arrow on the trailing half asks to open a closed menu (SPB-24: adopts one open from hover). The press keys are the PressController's. */
  private readonly onTrailingKeyDown = (event: KeyboardEvent) => {
    this.trailingPress.onKeyDown(event);
    if (event.key !== 'ArrowDown' || this.disabled) return;
    if (this.fromHover && this.open) {
      event.preventDefault();
      this.adopt();
      return;
    }
    if (this.open) return;
    event.preventDefault();
    this.cancelOpenWait();
    this.hoverAsked = false;
    this.toggle(true);
  };

  /** SPB-16: the menu asks to be closed; the button with menu asks the product, with the menu's reason. */
  private readonly onMenuClose = (event: CustomEvent<TanreiMenuCloseDetail>) => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent<TanreiButtonWithMenuCloseDetail>('close', { detail: { reason: event.detail.reason } }));
  };

  // ── Hover (SPB-22 to SPB-25) ────────────────────────────────────────────────────────────────────────────────────

  /** SPB-22, SPB-23: the token delays, in ms, as they resolve now — read through the inert `.timing` element's real properties. */
  private timing() {
    const probe = this.renderRoot?.querySelector('.timing');
    if (!probe) return { open: 0, close: 0 };
    const style = getComputedStyle(probe);
    const ms = (value: string) => (Number.parseFloat(value) || 0) * 1000;
    return { open: ms(style.transitionDelay), close: ms(style.transitionDuration) };
  }

  /** SPB-22: whether hoverDelay is a wait the button with menu can use (a number of ms, 0 or more). */
  private get validHoverDelay() {
    return typeof this.hoverDelay === 'number' && Number.isFinite(this.hoverDelay) && this.hoverDelay >= 0;
  }

  private cancelOpenWait() {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  private cancelCloseGrace() {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }

  private cancelHover() {
    this.cancelOpenWait();
    this.cancelCloseGrace();
    this.hoverAsked = false;
  }

  /** SPB-22: a mouse or a pen on the trailing half of a closed, enabled button with menu starts the wait. */
  private readonly onTrailingEnter = (event: PointerEvent) => {
    if (!hovers(event)) return;
    this.onTrailing = true;
    this.cancelCloseGrace();
    if (!this.hoverOpen || this.disabled || this.open) return;
    this.cancelOpenWait();
    const wait = this.validHoverDelay ? (this.hoverDelay as number) : this.timing().open;
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      if (!this.onTrailing || !this.hoverOpen || this.disabled || this.open) return;
      this.hoverAsked = true;
      this.toggle(true);
    }, wait);
  };

  /** SPB-22: leaving before the wait is over cancels it; SPB-23: leaving a menu open from hover starts the grace. */
  private readonly onTrailingLeave = (event: PointerEvent) => {
    this.trailingPress.release(event);
    if (!hovers(event)) return;
    this.onTrailing = false;
    this.cancelOpenWait();
    this.startCloseGrace();
  };

  /** SPB-22: a press on either half cancels the wait. */
  private readonly onHalfPointerDown = (event: PointerEvent) => {
    this.cancelOpenWait();
    if (event.currentTarget === this.trailing) this.trailingPress.onPointerDown(event);
    else this.leadingPress.onPointerDown(event);
  };

  /** SPB-23: the pointer on the menu's surface keeps a menu open from hover open. */
  private readonly onMenuEnter = (event: PointerEvent) => {
    if (!hovers(event)) return;
    this.onMenu = true;
    this.cancelCloseGrace();
  };

  private readonly onMenuLeave = (event: PointerEvent) => {
    if (!hovers(event)) return;
    this.onMenu = false;
    this.startCloseGrace();
  };

  /** SPB-23: off both the trailing half and the menu for motion.hover-close-delay, a menu open from hover asks to close, once. */
  private startCloseGrace() {
    if (!this.fromHover || !this.open || this.onTrailing || this.onMenu || this.closeTimer !== undefined) return;
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      if (!this.fromHover || !this.open || this.onTrailing || this.onMenu) return;
      this.toggle(false);
    }, this.timing().close);
  }

  /** SPB-25: Escape closes a menu open from hover wherever focus is, once, and reaches nothing else. */
  private readonly onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.isComposing || !this.fromHover || !this.open || this.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.escapeTaken = true;
    this.listenForEscape(false);
    this.cancelHover();
    this.dispatchEvent(new CustomEvent<TanreiButtonWithMenuCloseDetail>('close', { detail: { reason: 'escape' } }));
  };

  private listenForEscape(on: boolean) {
    if (on === this.listeningForEscape) return;
    this.listeningForEscape = on;
    if (on) document.addEventListener('keydown', this.onDocumentKeyDown, { capture: true });
    else document.removeEventListener('keydown', this.onDocumentKeyDown, { capture: true });
  }

  // ── The open form's motion (SPB-13, SPB-21) ─────────────────────────────────────────────────────────────────────

  /**
   * SPB-13, SPB-21: the open form's change — the chevron's turn or cross-fade, over comp.button-with-menu.motion.open-duration
   * (0 where motion is reduced) — and for as long, the trailing half's corners move with it. It ends when the
   * transitions this update started have finished, not on a timer; a turn replaced by the next ends nothing.
   */
  private startTurn() {
    const turn = ++this.turn;
    const moving = [...this.renderRoot.querySelectorAll<HTMLElement>('.turn, .glyph-open'), this.trailing].filter((el): el is HTMLElement => !!el);
    // getAnimations() brings style up to date first, so the transitions this update started are among them.
    const running = moving.flatMap((el) => el.getAnimations());
    const end = () => {
      if (turn === this.turn) this.turning = false;
    };
    if (running.length === 0) end();
    else void Promise.allSettled(running.map((animation) => animation.finished)).then(end);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SPB-22: a hoverDelay the button with menu cannot use waits for the token; a debug build says so.
    if (changed.has('hoverDelay') && this.hoverDelay !== null && this.hoverDelay !== undefined && !this.validHoverDelay) {
      report(this, 'SPB-22', `hoverDelay ${String(this.hoverDelay)} is not a number of milliseconds of 0 or more; the menu opens on hover after comp.button-with-menu.motion.hover-open-delay`);
    }
    if (changed.has('open')) {
      // SPB-22: open becoming true — from hover or by other means — ends the wait; it is open from hover only when hover asked.
      this.cancelOpenWait();
      if (this.open) this.fromHover = this.hoverAsked && !this.disabled;
      else this.fromHover = false;
      this.hoverAsked = false;
      this.escapeTaken = false;
    }
    // SPB-3: disabled never opens on hover; a hover wait or grace in progress ends.
    if (this.disabled || !this.hoverOpen) {
      this.cancelOpenWait();
      this.hoverAsked = false;
    }
    if (this.disabled) this.fromHover = false;
    if (!this.fromHover) this.cancelCloseGrace();
    if (!this.hasUpdated) return;
    if (changed.has('open') || changed.has('disabled')) {
      const was = (changed.has('open') ? (changed.get('open') as boolean) : this.open) && !(changed.has('disabled') ? (changed.get('disabled') as boolean) : this.disabled);
      if (was !== this.openForm) this.turning = true;
    }
  }

  protected override firstUpdated() {
    // SPB-15: the menu is placed against the whole button with menu; its anchor — focus return, name, ARIA states — is the
    // trailing half.
    const menu = this.menu;
    if (menu) menu.positionAnchor = this.renderRoot.querySelector('.row');
  }

  protected override updated(changed: PropertyValues) {
    // The slots are assigned by hand: the icon's, each chevron slot's first glyph (SPB-21), and one per menu child.
    const assign = (selector: string, nodes: Element[]) => {
      const slot = this.renderRoot.querySelector<HTMLSlotElement>(selector);
      if (slot && !sameNodes(slot.assignedNodes(), nodes)) slot.assign(...nodes);
    };
    assign('slot.icon-slot', this.iconChildren);
    assign('slot.chevron-slot', this.chevronChildren.slice(0, 1));
    assign('slot.chevron-open-slot', this.chevronOpenChildren.slice(0, 1));
    this.renderRoot.querySelectorAll<HTMLSlotElement>('slot.menu-slot').forEach((slot, i) => {
      const child = this.menuChildren[i];
      if (child && !sameNodes(slot.assignedNodes(), [child])) slot.assign(child);
    });
    // SPB-21: each chevron slot draws its first glyph; a debug build reports the rest.
    for (const [key, name] of [['chevronChildren', 'chevron'], ['chevronOpenChildren', 'chevron-open']] as const) {
      if (changed.has(key) && this[key].length > 1) report(this, 'SPB-21', `the ${name} slot holds ${this[key].length} glyphs; only the first is drawn`);
    }
    if (this.turning && (changed.has('open') || changed.has('disabled'))) this.startTurn();
    // SPB-8: a separation or a trailing width it does not define is drawn as the default (no rule matches it) and reported.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'SPB-8', `separation "${this.separation}" is not a value of the button with menu; it is drawn as "auto"`);
    }
    if (changed.has('trailingWidth') && !(TRAILING_WIDTHS as readonly string[]).includes(this.trailingWidth)) {
      report(this, 'SPB-8', `trailingWidth "${this.trailingWidth}" is not a value of the button with menu; it is drawn as "default"`);
    }
    // SPB-30: without style queries, the name the cascade gives now is written for the styles to match.
    syncSeparation(this, this.renderRoot.querySelector<HTMLElement>('.row'));
    // SPB-25: while the menu is open from hover, the button with menu listens for its one Escape wherever focus is.
    this.listenForEscape(this.fromHover && this.openForm && !this.escapeTaken);
    // SPB-23: a menu that opened from hover after the pointer had already left starts its grace at once.
    if (changed.has('fromHover')) this.startCloseGrace();
    // SPB-20: a half without a name still renders; a debug build says so (the empty menu: checkEmptyMenu()).
    if (changed.has('label') && !this.label.trim()) report(this, 'SPB-20', 'label is empty, so the leading half has no accessible name; give it a label');
    if (changed.has('menuLabel') && !this.menuLabel.trim()) {
      report(this, 'SPB-20', 'menuLabel is empty, so the trailing half has no accessible name; say what the menu offers ("More save options")');
    }
  }

  protected override render() {
    const open = this.openForm;
    // SPB-3, SPB-15, SPB-20: the menu is presented while open, enabled and holding an item.
    const presented = open && this.hasItems;
    // SPB-17: two native buttons in reading order, each its own tab stop — unless the component that places it keeps one
    // Tab stop among its items and says which half it is (SPB-33) — and no element of its own around them. The
    // leading half is named by its label; the trailing half by menuLabel, and the menu tells it that it opens a menu,
    // whether it is open and which (aria-haspopup, aria-expanded, aria-controls). The icon and the chevron are hidden.
    // SPB-21: the closed glyph is the chevron slot's, or the icon set's expand_more when it is empty; with a chevron-open
    // glyph the two cross-fade (`swap`), else the closed one turns.
    const swap = this.chevronOpenChildren.length > 0;
    return html`
      <div class="row">
        <button
          part="container leading"
          type="button"
          data-tanrei-shape
          class=${classMap({ leading: true, 'with-icon': this.iconChildren.length > 0, ...this.leadingPlace.classes() })}
          tabindex=${this.rovingStop === undefined ? nothing : this.rovingStop === 0 ? '0' : '-1'}
          ${delegatedAria(this, {})}
          ?disabled=${this.disabled}
          @pointerdown=${this.onHalfPointerDown}
          @pointerup=${this.leadingPress.release}
          @pointercancel=${this.leadingPress.release}
          @pointerleave=${this.leadingPress.release}
          @keydown=${this.leadingPress.onKeyDown}
          @keyup=${this.leadingPress.onKeyUp}
          @blur=${this.leadingPress.onBlur}
          @focus=${this.onFocus}
        >
          <span part="icon" class="icon" aria-hidden="true"><slot class="icon-slot" name="icon"></slot></span>
          <span part="label" class="label">${this.label}</span>
        </button>
        <span part="divider" class="divider" aria-hidden="true"></span>
        <button
          part="container trailing"
          type="button"
          id="trailing"
          data-tanrei-shape
          class=${classMap({ trailing: true, open, swap, turning: this.turning, ...this.trailingPlace.classes() })}
          aria-label=${this.menuLabel || nothing}
          tabindex=${this.rovingStop === undefined ? nothing : this.rovingStop === 1 ? '0' : '-1'}
          ?disabled=${this.disabled}
          @click=${this.onTrailingClick}
          @pointerdown=${this.onHalfPointerDown}
          @pointerup=${this.trailingPress.release}
          @pointercancel=${this.trailingPress.release}
          @pointerenter=${this.onTrailingEnter}
          @pointerleave=${this.onTrailingLeave}
          @keydown=${this.onTrailingKeyDown}
          @keyup=${this.trailingPress.onKeyUp}
          @blur=${this.trailingPress.onBlur}
          @focus=${this.onFocus}
        >
          <span class="chevrons" aria-hidden="true">
            <span class="turn"><span part="chevron" class="chevron"><slot class="chevron-slot" name="chevron">expand_more</slot></span></span>
            <span class="glyph-open"><span part="chevron" class="chevron"><slot class="chevron-open-slot" name="chevron-open"></slot></span></span>
          </span>
        </button>
      </div>
      <tanrei-menu
        anchor="trailing"
        placement="bottom-end"
        .focusless=${this.fromHover}
        .open=${presented}
        @close=${this.onMenuClose}
        @pointerenter=${this.onMenuEnter}
        @pointerleave=${this.onMenuLeave}
      >
        ${this.menuChildren.map(() => html`<slot class="menu-slot" name="menu"></slot>`)}
      </tanrei-menu>
      <span class="timing"></span>
    `;
  }
}

const sameNodes = (a: readonly Node[], b: readonly Node[]) => a.length === b.length && a.every((node, i) => node === b[i]);

// SPB-15: the menu it presents is the Tanrei Menu, registered with it.
if (!customElements.get('tanrei-menu')) customElements.define('tanrei-menu', TanreiMenu);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiButtonWithMenu);
// The product's ARIA on the host is the element's that carries the role; the leading half, its action, takes it; the menu the trailing half opens and the disabled state are its own.
delegatesAria(TanreiButtonWithMenu, { owns: ['aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-disabled'] });
if (!customElements.get('tanrei-button-with-menu')) customElements.define('tanrei-button-with-menu', TanreiButtonWithMenu);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-button-with-menu': TanreiButtonWithMenu;
  }
}
