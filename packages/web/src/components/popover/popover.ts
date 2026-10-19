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
  compChoice,
  crossOffsetAttribute,
  deepActive,
  focusOverlay,
  giveVariant,
  hostAria,
  isDividerVisibility,
  keepOverlayFocusAfterPress,
  numericAttribute,
  overlayDepth,
  registerOverlay,
  report,
  returnOverlayFocus,
  shadeFilter,
  syncDividerVisibility,
  syncFocusStyle,
  tabThroughOverlay,
  usableLength,
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
 * Every visual value comes from `--tanrei-comp-popover-*` tokens.
 *
 * @tag tanrei-popover
 * @slot - The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * @slot actions - Tanrei Buttons, each marked `confirming` or `dismissive` where it is one. The popover places them and gives those without a `variant` its own; it never restyles them.
 * @csspart container - The raised surface: its color, corners and elevation. It is the dialog.
 * @csspart arrow - The triangle that points at the anchor, while one is drawn.
 * @csspart header - The row that holds the headline and the close button.
 * @csspart headline - The headline (a heading).
 * @csspart close-button - The close button, an icon-only `<tanrei-button>`.
 * @csspart content - The scrolling box that holds the content.
 * @csspart divider - A hairline below the header and above the actions, while the content scrolls, as `divider-visibility` says (hidden from assistive technology).
 * @csspart actions - The row (or column) of actions.
 * @fires {CustomEvent<TanreiPopoverCloseDetail>} close - The popover asks to be closed: `detail.reason` is `escape`, `outside`, `focus-out`, `close` (its close button) or `anchor-hidden`. Set `open` to false.
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
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.onResize());
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
    // The controllers take the surface out of the top layer and stop listening; POP-18: what it wrote on the opener goes.
    this.presented = false;
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
      this.onResize();
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
  private onResize() {
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
   * to the container — unless it is mounted open, drawn in place, or `initialFocus` is `anchor`.
   */
  private present(moveFocus: boolean) {
    const before = deepActive();
    if (!this.anchored.show()) return;
    this.presented = true;
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
    this.presented = false;
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

  protected override firstUpdated() {
    this.readSlots();
    this.observe();
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
      this.presented = false;
      this.dismiss.stop();
      this.anchored.hide(false);
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
    // POP-28: a dialog that is not modal (no aria-modal), named by the headline, or by label where it draws none.
    const name = headline || this.label.trim() || nothing;
    // POP-19: a value the popover does not define moves focus in (POP-37).
    return html`
      <div class="surface" popover=${this.inline ? nothing : 'manual'} role="none">
        <div class="motion" data-tanrei-appear>
          <span part="arrow" class="arrow" aria-hidden="true"></span>
          <div
            part="container"
            class="container"
            role="dialog"
            aria-label=${name}
            tabindex="-1"
            data-tanrei-shape
            @focus=${(event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement)}
          >
            <div class="clip" data-tanrei-shape @focus=${(event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement)}>
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
                  @focus=${(event: FocusEvent) => syncFocusStyle(this, event.currentTarget as HTMLElement)}
                >
                  <div class="inner"><slot @slotchange=${() => this.onResize()}></slot></div>
                </div>
                <span class="focus" data-tanrei-shape></span>
              </div>
              <div class="footer" ?hidden=${!this.hasActions}>
                <div part="divider" class="divider above-actions" aria-hidden="true"></div>
                <div part="actions" class="actions"><slot name="actions-first"></slot><slot name="actions-between"></slot><slot name="actions-last"></slot></div>
              </div>
            </div>
            <span class="focus whole" data-tanrei-shape></span>
          </div>
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
