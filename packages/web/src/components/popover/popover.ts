import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  ANCHORED_PLACEMENTS,
  ActionPlacement,
  type AnchoredPlacement,
  AnchoredSurfaceController,
  AvailabilityController,
  BUTTON_VARIANTS,
  CompactWindow,
  DismissController,
  type DismissReason,
  type DividerVisibilityProp,
  GROUP_ITEM,
  GROUP_PLACE,
  type GroupItem,
  type GroupPlace,
  HOST_VARIANT,
  type PlacingGroup,
  type VariantHost,
  assignSlot,
  choiceAttribute,
  closeRequestReason,
  compChoice,
  crossOffsetAttribute,
  deepActive,
  documentPainted,
  focusOverlay,
  focusWithin,
  giveVariant,
  holdPageScroll,
  hostAria,
  isDividerVisibility,
  keepOverlayFocusAfterPress,
  keyboardCover,
  modalLayer,
  modalSheetKeys,
  numericAttribute,
  onBackdrop,
  overlayDepth,
  registerOverlay,
  report,
  returnOverlayFocus,
  shadeFilter,
  syncDividerVisibility,
  syncFocusStyle,
  tabThroughOverlay,
  usableLength,
  watchEscape,
  watchInput,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import { ARRANGEMENTS, ARROW_PROPERTY, CHOICE, PREFIX, styles } from './popover.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/**
 * Where the popover prefers to stand (POP-2): a side of the anchor (`top`, `bottom`, `start`, `end`), alone to centre it
 * there or with the edge it lines up with (`bottom-start`, `end-top`), or `auto` for the first side with room (POP-3).
 * The tooltip's thirteen values, read the same way.
 */
export type TanreiPopoverPlacement = AnchoredPlacement;
/** What decides the container's width: its content, or its anchor (POP-7). */
export type TanreiPopoverWidth = 'content' | 'anchor';
/** When the dividers are drawn while the content scrolls (POP-38): `auto` takes `comp.popover.divider.visibility`. */
export type TanreiPopoverDividerVisibility = DividerVisibilityProp;
/** Where focus is when the popover has opened: in it, or left where it is (POP-19). */
export type TanreiPopoverInitialFocus = 'popover' | 'anchor';
/** How it is presented in a compact window: with the bottom sheet's appearance, or as a popover still (POP-39, POP-43). */
export type TanreiPopoverCompactPresentation = 'sheet' | 'own';
/** Why the popover asks to be closed (POP-21). The web has no back of its own, so it never sends `back`. */
export type TanreiPopoverCloseReason = 'escape' | 'back' | 'outside' | 'focus-out' | 'close' | 'anchor-hidden';
/** `close`'s detail: why the popover asks to be closed. */
export interface TanreiPopoverCloseDetail {
  reason: TanreiPopoverCloseReason;
}

const PLACEMENTS: readonly TanreiPopoverPlacement[] = ANCHORED_PLACEMENTS;
const DEFAULT_PLACEMENT: TanreiPopoverPlacement = 'bottom-start';
const WIDTHS: readonly TanreiPopoverWidth[] = ['content', 'anchor'];
const INITIAL_FOCUS: readonly TanreiPopoverInitialFocus[] = ['popover', 'anchor'];
const COMPACT_PRESENTATIONS: readonly TanreiPopoverCompactPresentation[] = ['sheet', 'own'];
/** POP-24: a popover in a popover is the most a product should need; a third level is reported. */
const DEEP = 3;
/**
 * POP-30: what an action is told through the Button's internal channel (src/primitives/group-item.ts) — the one thing a
 * button group's standard item has that a Button alone has not: its label may wrap when its share of the row, or the
 * column, gives it less than one line needs. First and last, so its hit area reaches as far as it would alone.
 */
const ACTION_PLACE: GroupPlace = { variant: 'standard', first: true, last: true };

let ids = 0;

/**
 * Shows content a person can read and operate on a small surface that opens beside the control they pressed and stays
 * with it, without dimming or blocking the rest of the page.
 *
 * Contract: specs/popover.spec.json. The product owns the control: `anchor` is the id of the element the popover stands
 * beside, in the popover's own tree (`anchorElement` for an element an id cannot reach), and that element is also the
 * opener — the one that carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` and takes focus back —
 * unless `opener` / `openerElement` names another (a field that anchors the surface, with a button inside it that
 * opens it). The product sets `open` when the opener is pressed, and to false when the popover fires `close`: the
 * popover never opens or closes by itself, on hover, on focus or after a time.
 *
 * The drawn popover is a `popover="manual"` element in the shadow root, in the top layer (above an open modal
 * `<dialog>` the element stands in), holding a `role="dialog"` container that is not modal: no scrim, no focus trap,
 * nothing behind it inert. It is placed against the anchor by script — the side and the alignment `placement` names,
 * `offset` away and moved along the side by `crossOffset`; flipped to the opposite side, limited to the room where
 * neither side has enough (its content then scrolls between the header and the actions), shifted along the side and,
 * in a window smaller than its least size, moved back over the anchor — and follows the anchor while open. When
 * nothing of the anchor can be seen it fires `close` with the reason `anchor-hidden`.
 *
 * Focus: opening moves focus to the slotted element marked `autofocus`, else to the container (`initialFocus="anchor"`
 * leaves it where it is). The popover stands in the focus order directly after its opener wherever it is in the
 * document: Tab on the opener enters it, Shift+Tab from its first element returns to the opener, Tab from its last
 * element moves on to what follows the opener. Escape, a press outside, focus leaving, the close button and the
 * anchor going out of sight each fire `close` once, with the reason; an action never does. An overlay opened from an
 * element inside it (a menu, a tooltip, another popover, a dialog) is its own: a press or focus in it is not outside,
 * Escape closes it first, and it closes with the popover. Closing returns focus to the opener if it was inside.
 *
 * The actions are `<tanrei-button slot="actions">` children, each marked `confirming` or `dismissive` where it is one,
 * placed as a Button group places them; a Button without a `variant` attribute takes the popover's
 * (`comp.popover.actions.variant`). `arrow` draws a triangle that points at the anchor, one shape with the container
 * (unset, the system's `comp.popover.arrow.visible` decides).
 *
 * Content taller than the room scrolls between the header and the actions, with a divider below the header and one above
 * the actions (POP-8): for as long as it scrolls while `divider-visibility` is `always` (the default system's), only
 * while content lies beyond each line while it is `scroll`; `auto` takes `comp.popover.divider.visibility` (POP-38).
 *
 * In a window narrower than `comp.popover.compact.window-width` (600 in the default system) it takes the bottom
 * sheet's appearance instead (POP-39 to POP-42): a native `<dialog>` opened with `showModal()`, docked to the window's
 * bottom edge in the bottom sheet's color, elevation and top corners, sliding up over the bottom sheet's scrim — a modal
 * dialog, with everything behind it inert and focus kept in; Escape, a press on the scrim and the close button fire
 * `close`. `compact-presentation="own"` keeps it beside its anchor in every window, as `initial-focus="anchor"` always
 * does. Crossing the width while open changes the presentation at once, focus kept.
 *
 * Every visual value comes from `--tanrei-comp-popover-*` tokens, and as a sheet from `--tanrei-comp-bottom-sheet-*`.
 *
 * @tag tanrei-popover
 * @slot - The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * @slot actions - Tanrei Buttons, each marked `confirming` or `dismissive` where it is one. The popover places them and gives those without a `variant` its own; it never restyles them.
 * @csspart container - The raised surface: its color, corners and elevation. It is the dialog (a native `<dialog>` while it is a sheet).
 * @csspart arrow - The triangle that points at the anchor, while one is drawn.
 * @csspart header - The row that holds the headline and the close button.
 * @csspart headline - The headline (a heading).
 * @csspart close-button - The close button, an icon-only `<tanrei-button>`.
 * @csspart content - The scrolling box that holds the content.
 * @csspart divider - A hairline below the header and above the actions, while the content scrolls, as `divider-visibility` says (hidden from assistive technology).
 * @csspart actions - The row (or column) of actions.
 * @fires {CustomEvent<TanreiPopoverCloseDetail>} close - The popover asks to be closed: `detail.reason` is `escape`, `outside` (as a sheet, a press on its scrim), `focus-out`, `close` (its close button) or `anchor-hidden`. Set `open` to false.
 */
export class TanreiPopover extends TanreiElement implements VariantHost, PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'popover');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = [styles, hiddenHost];

  // The children are assigned by hand: the content to the default slot, the actions to three slots in the order the
  // orientation places them (BGR-15), so that focus and the accessibility tree follow the placed order without CSS `order`.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true },
    offset: { converter: numericAttribute },
    crossOffset: { attribute: 'cross-offset', converter: crossOffsetAttribute },
    arrow: { reflect: true, converter: choiceAttribute },
    width: { type: String, reflect: true },
    compactPresentation: { type: String, attribute: 'compact-presentation', reflect: true },
    inset: {
      type: Boolean,
      attribute: 'no-inset',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    initialFocus: { type: String, attribute: 'initial-focus' },
    headline: { type: String },
    label: { type: String },
    closable: { type: Boolean, reflect: true },
    closeLabel: { type: String, attribute: 'close-label' },
    dividerVisibility: { type: String, attribute: 'divider-visibility', reflect: true },
    anchor: { type: String },
    anchorElement: { attribute: false },
    opener: { type: String },
    openerElement: { attribute: false },
    inline: { type: Boolean, reflect: true },
    hasActions: { state: true },
    hasContent: { state: true },
    sheet: { state: true },
  };

  /** Whether the popover is shown. Controlled: set it when the opener is pressed, and to false in answer to `close`. Reflected. */
  open = false;

  /**
   * Where it prefers to stand: a side of the anchor and how it lines up along it, or `auto`. It flips to the opposite
   * side when that one has no room, keeping the alignment. Anything else is placed as `bottom-start` (POP-37). Reflected.
   */
  placement: TanreiPopoverPlacement = DEFAULT_PLACEMENT;

  /** The distance from the anchor's edge, in CSS pixels; 0 lets them touch. Null takes `offset`, the token. */
  offset: number | null = null;

  /**
   * How far it moves along the side it stands on, in CSS pixels: positive towards the end above or below the anchor,
   * towards the bottom beside it. It never moves the popover off the anchor's side. The attribute is `cross-offset`.
   */
  crossOffset = 0;

  /**
   * Whether it draws an arrow that points at the anchor. Null, the default, takes the system's choice
   * (`arrow.visible`, off in the default system). The attribute: absent is null, `arrow` is true, `arrow="false"` is false.
   */
  arrow: boolean | null = null;

  /** `content`: as wide as its content, between its least and greatest width. `anchor`: as wide as the anchor. Anything else is `content` (POP-37). Reflected. */
  width: TanreiPopoverWidth = 'content';

  /**
   * How it is presented in a window narrower than `comp.popover.compact.window-width`: `sheet` (the default) with the
   * bottom sheet's appearance at the window's bottom edge, as a modal dialog; `own` beside its anchor, as in every other
   * window. `initial-focus="anchor"` always keeps it beside its anchor. Anything else is `sheet` (POP-43). The attribute
   * is `compact-presentation`; reflected.
   */
  compactPresentation: TanreiPopoverCompactPresentation = 'sheet';

  /** Insets the content by the container's paddings. False — the attribute `no-inset` — lets content that pads itself reach the edges. */
  inset = true;

  /**
   * `popover`: focus moves into it when it opens. `anchor`: focus stays where it is (a surface under a field the person
   * is typing in). Anything else is `popover` (POP-37). The attribute is `initial-focus`.
   */
  initialFocus: TanreiPopoverInitialFocus = 'popover';

  /** What the popover is about, drawn in its header and used as its accessible name. Empty draws none; the popover is then named by `label`. */
  headline = '';

  /** Names the popover for assistive technology where it draws no headline. Never drawn; ignored while `headline` is given. */
  label = '';

  /** Draws the close button at the end of the header. Reflected. */
  closable = false;

  /** The close button's accessible name ("Close filters"). Required while `closable` (POP-13). The attribute is `close-label`. */
  closeLabel = '';

  /**
   * When the dividers are drawn while the content scrolls: `always` for as long as it scrolls, `scroll` only while
   * content lies beyond each line; `auto` takes `comp.popover.divider.visibility`, the design system's answer (always in
   * the default system). Reflected as `divider-visibility`.
   */
  dividerVisibility: TanreiPopoverDividerVisibility = 'auto';

  /** The id of the anchor — the element the popover stands beside — in the popover's own tree (its document or shadow root). */
  anchor = '';

  /** The anchor as an element, for one an id cannot reach (another shadow root). It wins over `anchor`. */
  anchorElement: HTMLElement | null = null;

  /** The id of the opener, where it is not the anchor: the element that is pressed, carries the open state and takes focus back. */
  opener = '';

  /** The opener as an element, for one an id cannot reach. It wins over `opener`. */
  openerElement: HTMLElement | null = null;

  /** For tests: draws the open container in place — inside its positioned ancestor, which stands for the window — not in the top layer; it then answers no dismissal and moves no focus. */
  inline = false;

  /** POP-39: whether it is drawn as a sheet — decided when it opens and when the window crosses the width, kept while it closes. */
  private sheet = false;
  /** How it is presented now: beside its anchor, as a sheet, or not at all. */
  private presentedAs: 'anchored' | 'sheet' | null = null;
  /** POP-42: the element in it that had focus before it was drawn in the other presentation. */
  private heldFocus: Element | null = null;
  /** POP-39: the window, matched against the resolved `compact.window-width`. */
  private readonly compact = new CompactWindow(() => this.requestUpdate());
  /** POP-40: a press that started on the scrim. */
  private pressedScrim = false;
  /** POP-42: how far the content was scrolled before it was drawn in the other presentation. */
  private heldScroll = 0;

  /** POP-9: whether the popover has at least one action, and any content. */
  private hasActions = false;
  private hasContent = false;

  /** POP-14: the content children, assigned to the default slot. */
  private content: Node[] = [];
  /** POP-15, POP-16: the actions, by run, placed and given the popover's variant. */
  private readonly placement$ = new ActionPlacement(this, (action) => this.resize$?.observe(action));
  /** POP-30: the actions that were told their place. */
  private placed = new Set<Element>();
  private readonly mutation$ = new MutationObserver(() => this.readSlots());
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#onResize());
  /** Whether the surface is presented: open, with an anchor and something to show. */
  private presented = false;
  private first = true;
  /** The reason of the last `close` it fired (POP-22: a press outside may leave focus nowhere). */
  private lastReason: TanreiPopoverCloseReason | null = null;
  /** POP-18: the element it wrote the opener's ARIA states on. */
  private stated: HTMLElement | null = null;
  private unregister: (() => void) | null = null;

  private get surface(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null;
  }

  /** The dialog: the painted box, which takes focus when the popover opens. */
  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  private find<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.renderRoot?.querySelector<T>(selector) ?? null;
  }

  private byId(id: string): HTMLElement | null {
    if (!id) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return (root.getElementById?.(id) as HTMLElement | null) ?? null;
  }

  /** The element the popover stands beside. */
  private get anchorNode(): HTMLElement | null {
    return this.anchorElement ?? this.byId(this.anchor);
  }

  /** POP-18: the element that opens it — the anchor, unless the product names another. */
  private get openerNode(): HTMLElement | null {
    return this.openerElement ?? this.byId(this.opener) ?? this.anchorNode;
  }

  /** Where the opener's ARIA states go: the opener, or the button a custom element draws in its open shadow root. */
  private get openerTarget(): HTMLElement | null {
    const opener = this.openerNode;
    return opener?.shadowRoot?.querySelector<HTMLElement>('button, [role="button"]') ?? opener;
  }

  /** A choice of kind, by name, as the cascade gives it now — never cached, so a system switch is seen; unknown is the first. */
  private choice<T extends string>(token: string, values: readonly T[]): T {
    return compChoice(this, `${PREFIX}-${token}`, values);
  }

  /** POP-10: whether an arrow is asked for right now: `arrow` when it is true or false, else the system's choice. */
  private get wantsArrow(): boolean {
    return compChoice(this, ARROW_PROPERTY, CHOICE) === 'on';
  }

  /** @internal POP-30: where an action stands, for the Button that asks when it connects (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    return child.parentElement === this && child.getAttribute('slot') === 'actions' ? ACTION_PLACE : null;
  }

  /** POP-30: every action is told its place, and one that is an action no more is told it has none. */
  private place() {
    const actions = new Set(this.placement$.actions);
    for (const gone of this.placed) if (!actions.has(gone) && gone.parentElement === this) (gone as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(null);
    for (const action of actions) (action as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(ACTION_PLACE);
    this.placed = actions;
  }

  /** @internal POP-16: the variant it gives one of its actions whose own is not set (src/primitives/group-item.ts). */
  [HOST_VARIANT](child: Element): string | null {
    return child.parentElement === this && child.getAttribute('slot') === 'actions' ? this.choice('actions-variant', BUTTON_VARIANTS) : null;
  }

  /** POP-1 to POP-5, POP-7, POP-8, POP-10, POP-26, POP-27, POP-36: where the surface is (src/primitives/anchored.ts). */
  private readonly anchored = new AnchoredSurfaceController(this, {
    surface: () => this.surface,
    motion: () => this.find('.motion'),
    box: () => this.container,
    anchor: () => this.anchorNode,
    placement: () => this.placement,
    fallback: DEFAULT_PLACEMENT,
    // POP-3: bottom, top, end, start, with start edges (top edges, beside the anchor) together.
    auto: ['bottom', 'top', 'end', 'start'],
    autoAlign: 'start',
    offset: () => this.offset,
    crossOffset: () => this.crossOffset,
    arrow: () => this.wantsArrow,
    matchWidth: () => this.width === 'anchor',
    inline: () => this.inline,
    // POP-5: its least size — the least width, and the parts that do not scroll.
    least: () => ({
      width: Number.parseFloat(getComputedStyle(this.find('.shade') ?? this).scrollMarginBlockStart) || 0,
      height: (this.find('.header')?.offsetHeight ?? 0) + (this.hasActions ? (this.find('.footer')?.offsetHeight ?? 0) : 0),
    }),
    scroller: () => this.find('.content'),
    shade: () => this.find('.shade'),
    gone: () => this.requestClose('anchor-hidden'),
    arrange: () => this.arrange(),
    placed: () => this.syncScroll(),
    depends: () => getComputedStyle(this).getPropertyValue(ARROW_PROPERTY).trim(),
  });

  /** POP-21, POP-23, POP-24: Escape, a press outside and focus leaving (src/primitives/dismiss.ts); POP-20: Tab at its ends. */
  private readonly dismiss = new DismissController(this, {
    related: () => [this.anchorNode, this.openerNode],
    request: (reason: DismissReason) => this.requestClose(reason),
    tab: (event) => {
      const surface = this.container;
      if (surface) tabThroughOverlay(event, { surface, host: this, opener: this.openerNode });
    },
  });

  override connectedCallback() {
    super.connectedCallback();
    // POP-19: whether it is opened by a key or by a press is seen from now on.
    watchInput();
    this.mutation$.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'confirming', 'dismissive'],
    });
    // POP-24: what opened it, for the surface it was opened from; when that surface closes, this one asks to be closed
    // with it — its anchor is going out of sight — and the product closes it, as for every other reason.
    this.unregister = registerOverlay(this, {
      openers: () => [this.anchorNode, this.openerNode],
      open: () => this.presented,
      // POP-40: as a sheet it is modal, and stays open when the surface it was opened from closes.
      modal: () => this.presentedAs === 'sheet',
      close: () => this.requestClose('anchor-hidden'),
      kind: 'popover',
    });
    if (this.hasUpdated) {
      this.readSlots();
      this.observe();
      // Put back in the page while open: presented again, as mounted.
      this.requestUpdate();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutation$.disconnect();
    this.resize$?.disconnect();
    this.unregister?.();
    this.unregister = null;
    // The controllers take the surface out of the top layer and stop listening; POP-40: a sheet gives the page back.
    // POP-18: what it wrote on the opener goes.
    if (this.presentedAs === 'sheet') this.releaseSheet();
    this.compact.stop();
    this.presented = false;
    this.presentedAs = null;
    this.first = true;
    this.state(null);
  }

  // ---- POP-21: asking to close ----

  /** POP-21: `close` with the reason, while it is shown. The product sets `open` to false. */
  private requestClose(reason: TanreiPopoverCloseReason) {
    if (!this.open || !this.presented) return;
    this.lastReason = reason;
    this.dispatchEvent(new CustomEvent<TanreiPopoverCloseDetail>('close', { detail: { reason } }));
  }

  /** POP-13: the close button asks once for each activation. */
  private readonly onCloseClick = () => this.requestClose('close');

  // ---- POP-18: the opener ----

  /** POP-18: the opener says that it opens a dialog, whether that dialog is open, and which it is; what was written is taken back. */
  private state(target: HTMLElement | null) {
    const was = this.stated;
    if (was && was !== target) hostAria(was, { 'aria-haspopup': null, 'aria-expanded': null, 'aria-controls': null });
    this.stated = target;
    if (!target) return;
    if (!this.id) this.id = `tanrei-popover-${++ids}`;
    hostAria(target, {
      'aria-haspopup': 'dialog',
      'aria-expanded': String(this.presented),
      'aria-controls': target.getRootNode() === this.getRootNode() ? this.id : null,
    });
  }

  // ---- POP-8, POP-9, POP-15, POP-16: the parts and their layout ----

  /** POP-9, POP-15: which child goes to which slot, and the actions' runs (BGR-13, BGR-14, BGR-18). */
  private readSlots() {
    const nodes = [...this.childNodes];
    this.content = nodes.filter((node) => (node instanceof Element && !node.hasAttribute('slot')) || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
    this.placement$.read(nodes.filter((node) => node instanceof Element && node.getAttribute('slot') === 'actions') as Element[]);
    this.placement$.give(this.choice('actions-variant', BUTTON_VARIANTS));
    this.place();
    const [actions, content] = [this.placement$.actions.length > 0, this.content.length > 0];
    if (actions !== this.hasActions || content !== this.hasContent) {
      this.hasActions = actions;
      this.hasContent = content;
    } else {
      this.assign();
      this.#onResize();
    }
  }

  /** The slots assigned by hand: the content, and the actions in the order of the orientation (BGR-15). */
  private assign() {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    assignSlot(root.querySelector<HTMLSlotElement>('slot:not([name])'), this.content);
    this.placement$.assign(root.querySelectorAll<HTMLSlotElement>('.actions slot'));
  }

  /**
   * POP-13, POP-15, POP-16: the variants the popover's tokens name, read now (a system switch is seen at the next
   * layout), and the actions as the system's arrangement places them — `fill` a row while every label fits its equal
   * share, `end` while the row at their own widths fits the inner width, and a column otherwise.
   */
  private arrange() {
    const container = this.container;
    if (!container) return;
    giveVariant(this.find('tanrei-button.close'), this.choice('close-button-variant', BUTTON_VARIANTS));
    this.placement$.give(this.choice('actions-variant', BUTTON_VARIANTS));
    const arrangement = this.choice('actions-arrangement', ARRANGEMENTS);
    if (container.dataset.arrangement !== arrangement) container.dataset.arrangement = arrangement;
    const actions = this.find('.actions');
    if (actions && this.hasActions && actions.getClientRects().length) {
      // POP-7: the container is at least as wide as its actions in one row at their own widths — whether they are a
      // row or a column, so that the width the decision is made for does not depend on what was decided before.
      container.style.removeProperty('--_actions-row');
      const { changed, natural } = this.placement$.measure(actions, arrangement === 'end' ? 'packed' : 'fill');
      // Turned to a column or back to a row, the actions are assigned again — which WebKit draws the surface anew for.
      if (changed) this.anchored.keep(() => this.assign());
      const style = getComputedStyle(actions);
      container.style.setProperty('--_actions-row', `${natural + (Number.parseFloat(style.paddingInlineStart) || 0) + (Number.parseFloat(style.paddingInlineEnd) || 0)}px`);
    } else if (container.style.getPropertyValue('--_actions-row')) container.style.removeProperty('--_actions-row');
  }

  /**
   * POP-8, POP-38: what scrolls, and the dividers. The content scrolls between the header and the actions — a Tab stop
   * while it does, so the keyboard can scroll it — with a divider below the header and one above the actions: for as
   * long as it scrolls under always (`data-scrolls`), and under scroll the first while it is scrolled away from its top
   * (`data-scrolled`) and the second while more of it lies below (`data-more`); where the header and the actions alone
   * leave no room for it, everything scrolls together and no divider is drawn. At once, without motion.
   */
  private syncScroll() {
    const clip = this.find('.clip');
    const content = this.find('.content');
    if (!clip || !content) return;
    const header = this.find('.header');
    const footer = this.hasActions ? this.find('.footer') : null;
    const fixed = (header?.offsetHeight ?? 0) + (footer?.offsetHeight ?? 0);
    const room = clip.clientHeight;
    const crowded = this.hasContent && fixed > 0 && fixed + content.scrollHeight > room + 0.5 && fixed >= room - 0.5;
    if (clip.classList.contains('crowded') !== crowded) clip.classList.toggle('crowded', crowded);
    const stop = (element: HTMLElement, on: boolean) => {
      if (on && element.getAttribute('tabindex') !== '0') element.setAttribute('tabindex', '0');
      else if (!on && element.hasAttribute('tabindex')) element.removeAttribute('tabindex');
    };
    const scrolls = (element: HTMLElement) => element.scrollHeight > element.clientHeight + 0.5;
    stop(content, !crowded && scrolls(content));
    stop(clip, crowded && scrolls(clip));
    const ruled = !crowded && (!!header || !!footer) && scrolls(content);
    if (clip.hasAttribute('data-scrolls') !== ruled) clip.toggleAttribute('data-scrolls', ruled);
    syncDividerVisibility(this, clip);
    const scrolled = !crowded && !!header && content.scrollTop > 0.5;
    const more = !crowded && !!footer && content.scrollTop + content.clientHeight < content.scrollHeight - 0.5;
    if (clip.hasAttribute('data-scrolled') !== scrolled) clip.toggleAttribute('data-scrolled', scrolled);
    if (clip.hasAttribute('data-more') !== more) clip.toggleAttribute('data-more', more);
  }

  private readonly onScroll = () => this.syncScroll();

  /** A part changed size (its text, the text size, the window): the actions are placed again, and the surface with them. */
  #onResize() {
    if (!this.presented) return;
    this.arrange();
    this.syncScroll();
    this.anchored.request();
  }

  /** What changes whether the actions fit and whether the content scrolls: the container, the content and the row. */
  private observe() {
    for (const selector of ['.container', '.header', '.content', '.inner', '.actions']) {
      const element = this.find(selector);
      if (element) this.resize$?.observe(element);
    }
  }

  // ---- POP-1, POP-19, POP-22, POP-24: presenting and focus ----

  /** POP-29: whether it has anything to draw. */
  private get empty(): boolean {
    return !this.hasContent && !this.hasActions && !this.headline.trim();
  }

  /**
   * POP-1, POP-19: into the top layer beside the anchor, and focus in — to the slotted element marked `autofocus`, else
   * to the container — unless it is mounted open, drawn in place, or `initialFocus` is `anchor`. `instant`: drawn whole
   * at once, with no entrance (POP-42).
   */
  private present(moveFocus: boolean, instant = false) {
    if (this.sheet) {
      // MOT-4: before the document's first paint a sheet mounted open is there at once.
      this.presentSheet(instant || !documentPainted());
      // POP-40: a sheet takes focus even mounted open, because everything behind it is inert — mounted, with no
      // indicator of its own (POP-19: only a popover opened from the keyboard shows one).
      if (this.presented && !this.inline) this.focusIn(!moveFocus);
      return;
    }
    const before = deepActive();
    if (!this.anchored.show(instant)) return;
    this.presented = true;
    this.presentedAs = 'anchored';
    this.lastReason = null;
    this.syncScroll();
    if (this.inline) return;
    this.dismiss.start();
    const container = this.container;
    if (moveFocus && this.initialFocus !== 'anchor' && container) focusOverlay(this, container);
    else if (deepActive() !== before) {
      // The browser's own popover steps focus an `autofocus` element: focus stays where it was.
      if (before instanceof HTMLElement && before !== document.body) before.focus({ preventScroll: true });
      else (deepActive() as HTMLElement | null)?.blur?.();
    }
    // POP-24: nesting works at any depth; a third level is reported.
    const depth = overlayDepth(this, 'popover');
    if (depth >= DEEP) report(this, 'POP-24', `it is the popover at depth ${depth} of popovers opened from inside popovers; one popover inside a popover is the most a product should need`, { once: false });
  }

  /**
   * POP-1, POP-22, POP-24, POP-27: every overlay opened from inside closes with it; focus goes back to the opener if it
   * was inside or lost, and stays where the person put it otherwise; the surface fades out, taking no pointer and no
   * focus, and leaves the top layer.
   */
  private withdraw() {
    if (!this.presented) return;
    if (this.presentedAs === 'sheet') {
      // POP-22, POP-24, POP-41: what was opened from inside closes; it slides out; focus goes back to the opener.
      const opener = this.openerNode;
      this.dismiss.closeOwned();
      this.withdrawSheet(true);
      returnOverlayFocus(opener, (node) => this.dismiss.owns(node));
      this.lastReason = null;
      return;
    }
    this.presented = false;
    this.presentedAs = null;
    if (!this.inline && this.dismiss.active) {
      const opener = this.openerNode;
      this.dismiss.closeOwned();
      returnOverlayFocus(opener, (node) => this.dismiss.owns(node));
      if (this.lastReason === 'outside') keepOverlayFocusAfterPress(opener);
      this.dismiss.stop();
    }
    this.lastReason = null;
    this.anchored.hide();
  }

  // ---- POP-39 to POP-43: a compact window ----

  /** POP-39, POP-43: whether it is drawn as a sheet now, were it open: a compact window, unless it keeps its own presentation. */
  private wantsSheet(): boolean {
    if (this.inline || this.initialFocus === 'anchor' || this.compactPresentation === 'own') return false;
    return this.compact.read(this.find('.probe'));
  }

  /** The dialog of the sheet form, while it is drawn. */
  private get sheetDialog(): HTMLDialogElement | null {
    return this.find<HTMLDialogElement>('dialog.sheet');
  }

  /** POP-19, POP-40: focus in — to the slotted element marked `autofocus`, else to the container (`quiet`: without its indicator). */
  private focusIn(quiet = false) {
    const container = this.container;
    if (!container) return;
    focusOverlay(this, container);
    if (quiet) container.setAttribute('data-focus-quiet', '');
  }

  /**
   * POP-39, POP-40, POP-41: as a sheet — a modal `<dialog>` in the top layer over the bottom sheet's scrim, the page inert
   * and held from scrolling — sliding up, or at once (`instant`, POP-42).
   */
  private presentSheet(instant: boolean) {
    const dialog = this.sheetDialog;
    if (!dialog || !this.isConnected || !this.anchorNode?.isConnected) return;
    // POP-40: an Escape the sheet did not see itself still reads as escape, not back.
    watchEscape();
    this.presented = true;
    this.presentedAs = 'sheet';
    this.lastReason = null;
    this.arrange();
    dialog.classList.toggle('instant', instant);
    if (!dialog.open) dialog.showModal();
    modalLayer.add(this);
    holdPageScroll(this, true);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    this.onViewport();
    this.syncScroll();
    if (instant) {
      // The first style is drawn without a transition; the motions come back for the next change.
      void getComputedStyle(dialog).translate;
      requestAnimationFrame(() => dialog.classList.remove('instant'));
    }
  }

  /** POP-40: the modal layer, the page's scroll and the keyboard are given back (the sheet left the page or closed). */
  private releaseSheet() {
    modalLayer.delete(this);
    holdPageScroll(this, false);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
  }

  /** POP-41: out of the top layer, sliding down (or at once). */
  private withdrawSheet(slide: boolean) {
    this.presented = false;
    this.presentedAs = null;
    this.releaseSheet();
    const dialog = this.sheetDialog;
    if (!dialog?.open) return;
    dialog.classList.toggle('instant', !slide);
    dialog.close();
    if (!slide) requestAnimationFrame(() => dialog.classList.remove('instant'));
  }

  /**
   * POP-42: the window crossed the width, or a prop changed the presentation, while it is open — the other one at once,
   * with no motion and no event; the element that had focus in it has it again, and focus outside it (on the opener) is
   * moved into a sheet, whose opener is inert.
   */
  private switchPresentation() {
    const held = this.heldFocus as HTMLElement | null;
    const scrolled = this.heldScroll;
    this.heldFocus = null;
    this.heldScroll = 0;
    if (this.presentedAs === 'sheet') {
      // The dialog went with the old presentation; the page is given back, and the popover stands beside its anchor.
      this.presented = false;
      this.presentedAs = null;
      this.releaseSheet();
      this.present(false, true);
    } else {
      this.dismiss.stop();
      this.anchored.hide(false);
      this.presented = false;
      this.presentedAs = null;
      this.presentSheet(true);
    }
    if (!this.presented) return;
    const content = this.find('.content');
    if (content && scrolled) content.scrollTop = scrolled;
    if (held && held.isConnected && !held.closest('[inert]') && typeof held.focus === 'function') held.focus({ preventScroll: true });
    else if (held || this.presentedAs === 'sheet') this.focusIn();
    this.syncScroll();
  }

  /** POP-39: above the on-screen keyboard (the part of the layout viewport the visual viewport no longer covers). */
  private readonly onViewport = () => {
    const dialog = this.sheetDialog;
    if (!dialog) return;
    const cover = keyboardCover();
    dialog.style.setProperty('--_keyboard', `${cover}px`);
    dialog.classList.toggle('keyboard', cover > 0);
  };

  /** POP-40, POP-23: Escape asks once (unless something inside took it), and Tab stays inside. */
  private readonly onSheetKeyDown = (event: KeyboardEvent) => {
    const dialog = this.sheetDialog;
    if (dialog) modalSheetKeys(event, dialog, () => this.requestClose('escape'));
  };

  /** POP-40: the platform's back (a close request without a key) arrives as the native cancel; the browser never closes it. */
  private readonly onSheetCancel = (event: Event) => {
    event.preventDefault();
    this.requestClose(closeRequestReason(event));
  };

  /** POP-40: a press that starts and ends on the scrim asks to close, with the reason outside. */
  private readonly onSheetPointerDown = (event: PointerEvent) => {
    this.pressedScrim = onBackdrop(event, this.sheetDialog);
  };

  private readonly onSheetClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && onBackdrop(event, this.sheetDialog);
    this.pressedScrim = false;
    if (scrim) this.requestClose('outside');
  };

  protected override willUpdate() {
    // POP-39, POP-42: the presentation is decided while it is open, and kept while it closes (its exit is drawn in it).
    if (!this.open || !this.hasUpdated) return;
    const sheet = this.wantsSheet();
    if (sheet === this.sheet) return;
    // POP-42: the element in it that has focus, and how far its content is scrolled, for the other presentation.
    this.heldFocus = this.presented && focusWithin(this) ? deepActive() : null;
    this.heldScroll = this.presented ? (this.find('.content')?.scrollTop ?? 0) : 0;
    this.sheet = sheet;
  }

  protected override firstUpdated() {
    this.readSlots();
    this.observe();
    // POP-39: the probe is drawn now; a popover mounted open in a compact window is drawn as a sheet (in the next update).
    if (this.open && this.wantsSheet()) this.sheet = true;
  }

  protected override updated(changed: PropertyValues<this>) {
    // Before it is presented or measured: the slots of the element just rendered hold their children.
    this.assign();
    this.reportProps(changed);

    const opening = changed.has('open') && this.open;
    const anchor = this.anchorNode;
    const want = this.open && this.isConnected && !!anchor && !this.empty;
    if (opening && !anchor && this.first && document.readyState === 'loading') {
      // Its anchor may stand after it in a document that is still being read: looked for again once it has been.
      document.addEventListener('DOMContentLoaded', () => this.requestUpdate(), { once: true });
    } else if (opening && !want) {
      // POP-29: it stays closed, emits nothing, and says why.
      if (!anchor) report(this, 'POP-29', this.anchor || this.anchorElement ? `no element with the id "${this.anchor}" was found in its tree, so it stays closed; give it the id of its anchor` : 'it has no anchor, so it stays closed; set anchor to the id of the element it stands beside', { once: false });
      else if (this.empty) report(this, 'POP-29', 'it opened with no content, no headline and no action, so it draws nothing; give it content', { once: false });
    }
    const mode = changed.has('inline') && this.presented;
    if (mode) {
      // Another presentation: taken out at once, and presented again below as mounted.
      this.dismiss.stop();
      if (this.presentedAs === 'sheet') this.withdrawSheet(false);
      else this.anchored.hide(false);
      this.presented = false;
      this.presentedAs = null;
    } else if (want && this.presented && this.presentedAs !== (this.sheet ? 'sheet' : 'anchored')) {
      // POP-42: drawn in the other presentation since it was presented.
      this.switchPresentation();
    }
    if (want && !this.presented) {
      // POP-19: a popover mounted with open true (or shown again by anything but `open`) moves no focus.
      this.present(opening && !this.first && !mode);
      if (this.presented) this.observe();
    } else if (!want && this.presented) this.withdraw();
    else if (this.presented) {
      // POP-2, POP-33: a prop that decides the place takes effect at once; the parts are laid out for what was drawn.
      this.arrange();
      this.anchored.place();
      this.syncScroll();
    }
    this.state(this.openerTarget);
    this.first = false;
  }

  /** What a debug build reports (POP-4, POP-13, POP-29, POP-37, POP-38). */
  private reportProps(changed: PropertyValues<this>) {
    if (changed.has('dividerVisibility') && !isDividerVisibility(this.dividerVisibility)) {
      report(this, 'POP-38', `divider-visibility "${String(this.dividerVisibility)}" is not a value of the popover; it is drawn as "auto"`);
    }
    if (changed.has('placement') && !PLACEMENTS.includes(this.placement)) {
      report(this, 'POP-37', `placement "${String(this.placement)}" is not one of ${PLACEMENTS.join(', ')}; the popover is placed as "${DEFAULT_PLACEMENT}"`);
    }
    if (changed.has('compactPresentation') && !COMPACT_PRESENTATIONS.includes(this.compactPresentation)) {
      report(this, 'POP-43', `compact-presentation "${String(this.compactPresentation)}" is not one of ${COMPACT_PRESENTATIONS.join(', ')}; the popover is a sheet in a compact window`);
    }
    if (changed.has('width') && !WIDTHS.includes(this.width)) report(this, 'POP-37', `width "${String(this.width)}" is not one of ${WIDTHS.join(', ')}; the popover is as wide as its content`);
    if (changed.has('initialFocus') && !INITIAL_FOCUS.includes(this.initialFocus)) {
      report(this, 'POP-37', `initial-focus "${String(this.initialFocus)}" is not one of ${INITIAL_FOCUS.join(', ')}; focus moves into the popover`);
    }
    const offset: unknown = this.offset;
    if (changed.has('offset') && offset !== null && offset !== undefined && !usableLength(offset)) {
      const why = typeof offset === 'number' && Number.isFinite(offset) ? 'is negative' : 'is not a finite number';
      report(this, 'POP-4', `offset ${JSON.stringify(String(offset))} ${why}; comp.popover.offset is used in its place`);
    }
    const cross: unknown = this.crossOffset;
    if (changed.has('crossOffset') && cross !== null && cross !== undefined && !Number.isFinite(cross)) {
      report(this, 'POP-4', `cross-offset ${JSON.stringify(String(cross))} is not a finite number; 0 is used in its place`);
    }
    if ((changed.has('closable') || changed.has('closeLabel')) && this.closable && this.words.lacks('closeLabel', this.closeLabel)) {
      report(this, 'POP-13', 'close-label is empty, so the close button has no accessible name; give it a close-label');
    }
    if (changed.has('open') && this.open && !this.headline.trim() && !this.label.trim() && !this.empty) {
      report(this, 'POP-29', 'headline and label are both empty, so the dialog has no accessible name; give it a headline, or a label where it draws none');
    }
  }

  protected override render() {
    const headline = this.headline.trim() ? this.headline : '';
    const header = !!headline || this.closable;
    // POP-28: a dialog named by the headline, or by label where it draws none — not modal beside its anchor, modal as a
    // sheet (POP-40).
    const name = headline || this.label.trim() || nothing;
    const focus = (event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement);
    const parts = html`
      <div class="clip" data-tanrei-shape @focus=${focus}>
        ${header
          ? html`<div part="header" class=${classMap({ header: true, closable: this.closable, last: !this.hasContent && !this.hasActions })}>
              ${headline ? html`<h2 part="headline" class="headline">${headline}</h2>` : nothing}
              ${this.closable
                ? html`<span class="close-box"
                    ><tanrei-button part="close-button" class="close" size="small" label=${this.words.get('closeLabel', this.closeLabel)} @click=${this.onCloseClick}><span slot="icon">close</span></tanrei-button></span
                  >`
                : nothing}
              <div part="divider" class="divider below-header" aria-hidden="true"></div>
            </div>`
          : nothing}
        <div class=${classMap({ middle: true, empty: !this.hasContent })}>
          <div
            part="content"
            class=${classMap({ content: true, top: !header, bottom: !this.hasActions, empty: !this.hasContent })}
            data-tanrei-shape
            @scroll=${this.onScroll}
            @focus=${focus}
          >
            <div class="inner"><slot @slotchange=${() => this.#onResize()}></slot></div>
          </div>
          <span class="focus" data-tanrei-shape></span>
        </div>
        <div class="footer" ?hidden=${!this.hasActions}>
          <div part="divider" class="divider above-actions" aria-hidden="true"></div>
          <div part="actions" class="actions"><slot name="actions-first"></slot><slot name="actions-between"></slot><slot name="actions-last"></slot></div>
        </div>
      </div>
      <span class="focus whole" data-tanrei-shape></span>
    `;
    // POP-39: the resolved compact.window-width, which the script matches the window against.
    const probe = html`<span class="probe" aria-hidden="true"></span>`;
    if (this.sheet) {
      // POP-39, POP-40: the bottom sheet's appearance — a native modal <dialog> over the bottom sheet's scrim. It is the
      // surface that appears (POP-41, MOT-4): settling leaves its slide alone, as a dialog's and a bottom sheet's.
      return html`${probe}
        <dialog
          part="container"
          class="container sheet"
          data-tanrei-appear
          role="dialog"
          aria-modal="true"
          aria-label=${name}
          tabindex="-1"
          data-tanrei-shape
          @focus=${focus}
          @keydown=${this.onSheetKeyDown}
          @cancel=${this.onSheetCancel}
          @pointerdown=${this.onSheetPointerDown}
          @click=${this.onSheetClick}
        >
          ${parts}
        </dialog>`;
    }
    // POP-19: a value the popover does not define moves focus in (POP-37).
    return html`${probe}
      <div class="surface" popover=${this.inline ? nothing : 'manual'} role="none">
        <div class="motion" data-tanrei-appear>
          <span part="arrow" class="arrow" aria-hidden="true"></span>
          <div part="container" class="container" role="dialog" aria-label=${name} tabindex="-1" data-tanrei-shape @focus=${focus}>${parts}</div>
        </div>
        <span class="shade" aria-hidden="true"></span>
        ${shadeFilter(this.anchored.layers)}
      </div>
    `;
  }
}

if (!customElements.get('tanrei-popover')) customElements.define('tanrei-popover', TanreiPopover);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-popover': TanreiPopover;
  }
}
