import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  ActionPlacement,
  AvailabilityController,
  BUTTON_VARIANTS,
  type DividerVisibilityProp,
  HOST_VARIANT,
  OpenAxesController,
  type VariantHost,
  assignSlot,
  closeModal,
  compChoice,
  containedWheel,
  giveVariant,
  SHEET_FLING_VELOCITY,
  SheetDrag,
  closeRequestReason,
  deepActive,
  focusWithin,
  holdPageScroll,
  isDividerVisibility,
  keyboardCover,
  modalLayer,
  modalSheetKeys,
  onBackdrop,
  openModal,
  report,
  returnFocus,
  syncDividerVisibility,
  watchEscape,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import { AXES, styles } from './side-sheet.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (standard, modal), plus any a design system adds: only `modal` is presented as a modal overlay. */
export type TanreiSideSheetVariant = 'standard' | 'modal' | (string & {});

/** When the divider below the header is drawn (SSH-23): `auto` takes `comp.side-sheet.divider.visibility`. */
export type TanreiSideSheetDividerVisibility = DividerVisibilityProp;
/** Why the sheet asks to close (SSH-4, SSH-5). The web has no back of its own; Android's back gesture arrives as `back`. */
export type TanreiSideSheetCloseReason = 'close' | 'scrim' | 'escape' | 'back' | 'drag';

/** `close`'s detail: why the sheet asks to be closed. */
export interface TanreiSideSheetCloseDetail {
  reason: TanreiSideSheetCloseReason;
}

/**
 * SSH-4: whether a released drag asks to close — past half the sheet's width toward its end edge, or flung that way.
 * `distance` is how far the sheet is drawn from where it rests, toward the end edge; `velocity` the pointer's speed that
 * way at the release, in px per ms.
 */
export function sideSheetRelease(distance: number, velocity: number, width: number): boolean {
  return distance > width / 2 || velocity > SHEET_FLING_VELOCITY;
}

const PREFIX = '--tanrei-comp-side-sheet';
/** SSH-11: how the actions sit (tokens/comp/side-sheet.tokens.json, `dev.tanrei.enum`): the first is the fallback. */
const ARRANGEMENTS = ['fill', 'start'] as const;

/**
 * Shows supplementary content or a secondary task in a panel at the end edge, with a headline, a close button and
 * actions: `standard`, beside the content in the layout (a layout region), where actions are optional, or
 * `modal`, over the content with a scrim, holding focus until it closes (a modal overlay), with at least one
 * action (SSH-16).
 *
 * Contract: specs/side-sheet.spec.json. The content is the default slot. The header holds `headline` (the sheet's
 * accessible name, a heading) and, while `closable` (the default; the attribute `not-closable` turns it off), an
 * icon-only `<tanrei-button>` of the small size showing the close glyph, named by `close-label`, in the variant
 * `comp.side-sheet.close-button.variant` names (tonal in the default system), as every host's close button is.
 *
 * The actions are `<tanrei-button slot="actions">` children, each marked `confirming` or `dismissive`, placed below a
 * divider as a full-width Button group places them: dismissive at the start and confirming at the end of a row the
 * actions share equally, confirming on top of a column when a label does not fit its share (or, where the system's
 * `actions.arrangement` is `start`, at their own widths from the start edge). Focus and assistive technology follow that
 * order. A Button without a `variant` attribute takes the sheet's (`comp.side-sheet.actions.variant`, tonal in the
 * default system). Actions never close the sheet: close it from their handlers.
 *
 * Controlled: the sheet never closes itself. It fires `close` with a reason — its close button in either variant, and for
 * a modal sheet a press on the scrim, Escape, the platform's back or a drag toward its end edge — and you set `open` to
 * false. A product that does not close it after a drag sees it slide back.
 *
 * Standard: an `<aside>` (a complementary landmark) named by the headline; place it as the last item of a flex row (the
 * full height of that row). Its width animates while open changes, the content beside it resizing. Opening it moves focus
 * in, closing it with focus inside gives focus back, Tab leaves it open, and Escape and drags do nothing.
 *
 * Modal: a native `<dialog>` in the shadow root opened with `showModal()`, at the window's end edge in the top layer over
 * `::backdrop` (the scrim), everything else inert, the page held from scrolling and focus kept inside. Focus goes to the
 * slotted element marked `autofocus`, else the sheet (also when it is mounted open), and returns where it was when it
 * closes.
 *
 * The content scrolls between the header and the actions. The divider below the header is drawn whenever the header is
 * while `divider-visibility` is `always` (the default system's), as the one above the actions is, and only while the
 * content is scrolled from its top while it is `scroll`; `auto` takes `comp.side-sheet.divider.visibility` (SSH-19,
 * SSH-23). While the on-screen keyboard covers the bottom of the sheet, the actions sit directly above it (the
 * `visualViewport`).
 *
 * Every visual value comes from `--tanrei-comp-side-sheet-*` tokens. The color reaches under
 * `env(safe-area-inset-*)` at the end, top and bottom.
 *
 * @tag tanrei-side-sheet
 * @slot - The content: it gets `content.color` as its color, and plain text the body role; it scrolls between the header and the actions.
 * @slot actions - Tanrei Buttons, each marked `confirming` or `dismissive`; at least one in a modal sheet. The sheet places them and gives those without a `variant` its own; it never restyles them.
 * @csspart container - The panel: the `<aside>` of a standard sheet, the `<dialog>` of a modal one (its `::backdrop` is the scrim).
 * @csspart outline - The start edge.
 * @csspart header - The row that holds the headline and the close button.
 * @csspart headline - The headline (a heading).
 * @csspart close-button - The close button, an icon-only `<tanrei-button>`.
 * @csspart content - The box that insets and scrolls the content.
 * @csspart divider - A hairline: above the actions while there are actions, and below the header as `divider-visibility` says (hidden from assistive technology).
 * @csspart actions - The row (or column) of actions.
 * @fires {CustomEvent<TanreiSideSheetCloseDetail>} close - The sheet asks to be closed: `detail.reason` is `close` (its close button), or for a modal sheet `scrim`, `escape`, `back` or `drag`. Set `open` to false.
 */
export class TanreiSideSheet extends TanreiElement implements VariantHost {
  private readonly availability = new AvailabilityController(this, 'side-sheet');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  // The children are assigned by hand: the content to the default slot, the actions to three slots in the order the
  // orientation places them (BGR-15), so that focus and the accessibility tree follow the placed order without CSS `order`.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    headline: { type: String },
    // An HTML boolean attribute cannot default to true: the attribute is the inverse, `not-closable` (as the chip's
    // `not-removable`).
    closable: {
      type: Boolean,
      attribute: 'not-closable',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    closeLabel: { type: String, attribute: 'close-label' },
    dividerVisibility: { type: String, attribute: 'divider-visibility', reflect: true },
    hasActions: { state: true },
  };

  /** `standard` (the default) sits beside the content; `modal` slides over it with a scrim and holds focus. A value the active system does not have is drawn as `standard`, reported (SSH-13). Reflected. */
  variant: TanreiSideSheetVariant = 'standard';

  /** Whether the sheet is shown: a standard one takes its width in the layout, a modal one is presented. Controlled: set it to false in answer to `close`. Reflected. */
  open = false;

  /** What the sheet is about ("Filters"), drawn in its header and used as its accessible name. Required (SSH-12). */
  headline = '';

  /** Draws the close button at the end of the header (SSH-5). True by default; false (the `not-closable` attribute) only where your own control or one of the sheet's actions closes it. Reflected. */
  closable = true;

  /** The close button's accessible name ("Close filters"). Required while `closable`, the default (SSH-5). */
  closeLabel = '';

  /**
   * When the divider below the header is drawn: `always` whenever the header is, `scroll` only while the content is
   * scrolled from its top; `auto` takes `comp.side-sheet.divider.visibility`, the design system's answer (always in the
   * default system). Reflected as `divider-visibility`.
   */
  dividerVisibility: TanreiSideSheetDividerVisibility = 'auto';

  /** SSH-11, SSH-16: whether the sheet has at least one action. */
  private hasActions = false;

  /** SSH-10: the content children, assigned to the default slot. */
  private content: Node[] = [];
  /** SSH-11, SSH-17: the actions, by run, placed and given the sheet's variant. */
  private readonly placement = new ActionPlacement(this, (action) => this.resize$?.observe(action));
  private readonly mutation$ = new MutationObserver(() => this.readSlots());
  /** SSH-20: how much of the sheet the on-screen keyboard covers, as last applied. */
  private keyboard = 0;

  /** SSH-13: variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'side-sheet', behavior: 'SSH-13', axes: AXES });

  /** Where focus was when the sheet opened (SSH-3). */
  private opener: Element | null = null;
  /** A modal sheet is presented (in the top layer). */
  private shown = false;
  private pressedScrim = false;
  private dragged = false;
  private drag: SheetDrag | null = null;
  /** How far the sheet was drawn from where it rests, toward its end edge, when the drag began to follow. */
  private dragFrom = 0;
  /** How far it is drawn from where it rests while it follows a drag. */
  private offset = 0;
  /** Whether focus was inside a standard sheet that is closing (read before the render makes it inert). */
  private closingWithFocus = false;
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.layout());

  private get modal(): boolean {
    return this.variant === 'modal';
  }

  private get sheet(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.sheet') ?? null;
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  /** A choice of kind, by name, as the cascade gives it now — never cached, so a system switch is seen; unknown is the first. */
  private choice<T extends string>(token: string, values: readonly T[]): T {
    return compChoice(this, `${PREFIX}-${token}`, values);
  }

  /** @internal SSH-17: the variant it gives one of its actions whose own is not set (src/primitives/group-item.ts). */
  [HOST_VARIANT](child: Element): string | null {
    return child.parentElement === this && child.getAttribute('slot') === 'actions' ? this.choice('actions-variant', BUTTON_VARIANTS) : null;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.mutation$.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'confirming', 'dismissive'],
    });
    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    if (this.hasUpdated) this.readSlots();
    // Moved in the document while open: presented again, in place (as mounted).
    if (this.hasUpdated && this.open && this.modal) this.present(true);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutation$.disconnect();
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
    this.resize$?.disconnect();
    this.drag = null;
    this.listenToDrag(false);
    if (this.shown) this.withdraw(false);
  }

  // ---- SSH-4, SSH-5: asking to close ----

  /** SSH-4, SSH-5: `close` with the reason, once, while open; a standard sheet answers only its close button. */
  private requestClose(reason: TanreiSideSheetCloseReason) {
    if (!this.open) return;
    if (!this.modal && reason !== 'close') return;
    this.dispatchEvent(new CustomEvent<TanreiSideSheetCloseDetail>('close', { detail: { reason } }));
  }

  private readonly onCloseClick = () => {
    if (this.dragged) return;
    this.requestClose('close');
  };

  /** SSH-4, SSH-2, SSH-15: Escape asks to close (only the topmost overlay answers it); Tab stays inside. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const dialog = this.dialog;
    if (dialog) modalSheetKeys(event, dialog, () => this.requestClose('escape'));
  };

  /** A close request without a key the sheet saw (Android's back) arrives as the native cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.requestClose(closeRequestReason(event));
  };

  /** The browser closed the dialog itself (a close request it would not let the sheet cancel): ask, and stay unless closed. */
  private readonly onNativeClose = () => {
    const dialog = this.dialog;
    if (!this.shown || !dialog || dialog.open) return;
    this.requestClose('back');
    if (this.open && this.modal) openModal(dialog);
  };

  /**
   * On the way down (capture): the click that ends a drag activates nothing — not the close button, the content or the
   * actions; a press that began and ended on the scrim asks to close.
   */
  private readonly onClick = {
    capture: true,
    handleEvent: (event: MouseEvent) => {
      if (this.dragged) {
        event.stopPropagation();
        event.preventDefault();
        this.pressedScrim = false;
        return;
      }
      const scrim = this.pressedScrim && onBackdrop(event, this.dialog);
      this.pressedScrim = false;
      if (scrim) this.requestClose('scrim');
    },
  };

  // ---- SSH-4, SSH-6: the drag toward the end edge ----

  /** The distance `dx` (px, rightward positive) toward the end edge, whatever the direction of the text. */
  private towardEnd(dx: number): number {
    return getComputedStyle(this).direction === 'rtl' ? -dx : dx;
  }

  /** How far the modal sheet is drawn from where it rests, toward its end edge (whatever is moving it). */
  private drawnOffset(): number {
    const dialog = this.dialog;
    if (!dialog) return 0;
    const box = dialog.getBoundingClientRect();
    const rtl = getComputedStyle(this).direction === 'rtl';
    return Math.max(0, rtl ? -box.left : box.right - document.documentElement.clientWidth);
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pressedScrim = onBackdrop(event, this.dialog);
    if (this.pressedScrim || !this.open || !this.shown) return;
    if (this.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.drag = new SheetDrag(event, 'x');
    // The drag is followed through the window, wherever the pointer goes (pointer capture alone can fail to take).
    this.listenToDrag(true);
  };

  private listenToDrag(on: boolean) {
    const listeners: [keyof WindowEventMap, (event: PointerEvent) => void][] = [
      ['pointermove', this.onPointerMove],
      ['pointerup', this.onPointerUp],
      ['pointercancel', this.onPointerUp],
    ];
    for (const [type, listener] of listeners) {
      if (on) window.addEventListener(type, listener as EventListener, true);
      else window.removeEventListener(type, listener as EventListener, true);
    }
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    const dialog = this.dialog;
    if (!drag || !dialog || event.pointerId !== drag.id) return;
    const step = drag.move(event);
    if (step === 'wait') return;
    if (step === 'start') {
      // From where it is drawn (a slide back in progress included); nothing transitions while it follows.
      this.dragFrom = this.drawnOffset();
      dialog.classList.add('dragging');
      try {
        dialog.setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer the browser no longer counts as active cannot be captured; the window still follows it.
      }
    }
    this.place(Math.max(0, this.dragFrom + this.towardEnd(drag.distance(event))));
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (drag && event.pointerId !== drag.id) return;
    this.drag = null;
    this.listenToDrag(false);
    const dialog = this.dialog;
    if (!drag || !dialog || !drag.following) return;
    // The click that ends a drag activates nothing.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    // It stays where the drag left it (no transition runs on removing the class, the offset being unchanged).
    dialog.classList.remove('dragging');
    const velocity = event.type === 'pointercancel' ? 0 : this.towardEnd(drag.velocity(event));
    if (!sideSheetRelease(this.offset, velocity, dialog.getBoundingClientRect().width)) {
      this.slideBack();
      return;
    }
    // SSH-6: ask, hold where the drag left it for one frame, then slide out from there (the product closed it: the exit
    // motion starts from the offset) or slide back (it declined).
    this.requestClose('drag');
    requestAnimationFrame(() => {
      if (this.open && this.shown) this.slideBack();
    });
  };

  /** Draws the modal sheet `offset` from where it rests, toward its end edge. */
  private place(offset: number) {
    this.offset = offset;
    const rtl = getComputedStyle(this).direction === 'rtl';
    if (offset > 0) this.dialog?.style.setProperty('--_drag', `${rtl ? -offset : offset}px`);
    else this.dialog?.style.removeProperty('--_drag');
  }

  /** SSH-4: back to where it rests, over the enter motion (the open dialog's transition), at once where motion is reduced. */
  private slideBack() {
    this.place(0);
  }

  // ---- SSH-8, SSH-10, SSH-11, SSH-17, SSH-19, SSH-20: the parts and their layout ----

  /** SSH-10, SSH-11: which child goes to which slot, and the actions' runs (BGR-13, BGR-14, BGR-18). */
  private readSlots() {
    const nodes = [...this.childNodes];
    this.content = nodes.filter(
      (node) => (node instanceof Element && !node.hasAttribute('slot')) || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()),
    );
    this.placement.read(nodes.filter((node) => node instanceof Element && node.getAttribute('slot') === 'actions') as Element[]);
    this.placement.give(this.choice('actions-variant', BUTTON_VARIANTS));
    const filled = this.placement.actions.length > 0;
    if (filled !== this.hasActions) this.hasActions = filled;
    else {
      this.assign();
      this.layout();
    }
  }

  /** The slots assigned by hand: the content, and the actions in the order of the orientation (BGR-15). */
  private assign() {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    assignSlot(root.querySelector<HTMLSlotElement>('slot:not([name])'), this.content);
    this.placement.assign(root.querySelectorAll<HTMLSlotElement>('.actions slot'));
  }

  /**
   * SSH-5, SSH-17: the variants the sheet's tokens name, read now (a system switch is seen at the next layout): the close
   * button's, and the one every action without its own draws.
   */
  private giveVariants() {
    giveVariant(this.renderRoot?.querySelector('tanrei-button.close'), this.choice('close-button-variant', BUTTON_VARIANTS));
    this.placement.give(this.choice('actions-variant', BUTTON_VARIANTS));
  }

  /**
   * SSH-11: the actions as the system's arrangement places them — `fill` a row while every label fits its equal share,
   * `start` while the row at their own widths fits the inner width, and a column otherwise; SSH-10: a content that
   * scrolls is a Tab stop, so the keyboard can scroll it; SSH-19: the divider below the header.
   */
  private layout() {
    const sheet = this.sheet;
    if (!sheet) return;
    this.giveVariants();
    const arrangement = this.choice('actions-arrangement', ARRANGEMENTS);
    sheet.dataset.arrangement = arrangement;
    const actions = this.renderRoot.querySelector<HTMLElement>('.actions');
    if (actions && this.hasActions) {
      const { changed } = this.placement.measure(actions, arrangement === 'start' ? 'packed' : 'fill');
      if (changed) this.assign();
    }
    const content = this.renderRoot.querySelector<HTMLElement>('.content');
    if (content) {
      if (content.scrollHeight > content.clientHeight + 0.5) content.setAttribute('tabindex', '0');
      else content.removeAttribute('tabindex');
    }
    this.syncHeaderDivider();
  }

  /**
   * SSH-19, SSH-23: the divider below the header — whenever the header is drawn under always, while the content is
   * scrolled away from its top under scroll (`scrolled`); at once, without motion.
   */
  private syncHeaderDivider() {
    const header = this.renderRoot?.querySelector<HTMLElement>('.header');
    const content = this.renderRoot?.querySelector<HTMLElement>('.content');
    if (header && content) header.classList.toggle('scrolled', content.scrollTop > 0.5);
    syncDividerVisibility(this, header);
  }

  private readonly onScroll = () => this.syncHeaderDivider();

  /**
   * SSH-20: while the on-screen keyboard covers the bottom of the sheet (the part of it below the visual viewport), the
   * divider and the actions sit directly above it and the content scrolls in the room left, the focused element scrolled
   * into it; the header stays. At once: the web moves nothing for its keyboard.
   */
  private readonly onViewport = () => {
    const sheet = this.sheet;
    const cover = sheet && this.open ? Math.round(this.modal ? keyboardCover() : keyboardCover(sheet.getBoundingClientRect().bottom)) : 0;
    if (cover === this.keyboard) return;
    this.keyboard = cover;
    if (cover > 0) sheet?.style.setProperty('--_keyboard', `${cover}px`);
    else sheet?.style.removeProperty('--_keyboard');
    if (cover <= 0) return;
    const active = deepActive() as HTMLElement | null;
    const content = this.renderRoot.querySelector('.content');
    const inContent = !!active && this.content.some((node) => node === active || node.contains(active) || (node instanceof Element && focusWithin(node)));
    if (inContent && content) active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // ---- SSH-1, SSH-2, SSH-3: presenting and focus ----

  /** SSH-3: focus to the slotted element marked `autofocus`, else the sheet itself, so its headline is read first. */
  private focusInside() {
    const marked = this.querySelector<HTMLElement>('[autofocus]');
    if (marked && !marked.closest('[inert]')) marked.focus();
    else this.sheet?.focus();
  }

  /** SSH-3: focus back where it was when the sheet opened — or dropped, where that element is gone. */
  private restoreFocus() {
    const opener = this.opener;
    this.opener = null;
    returnFocus(opener, this);
  }

  /** SSH-2, SSH-3: in the top layer, the page held, focus in. Mounted open, it appears in place without motion. */
  private present(mounted: boolean) {
    const dialog = this.dialog;
    if (!dialog || this.shown || !this.isConnected) return;
    watchEscape();
    this.place(0);
    this.opener = deepActive();
    if (mounted) {
      dialog.classList.add('instant');
      requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.remove('instant')));
    }
    // SSH-16: counted when it opens — or, in a document that is still being read, once it has been: its actions stand
    // after its start tag, and a sheet whose element was defined before its markup opens before they are there.
    const count = () => {
      if (this.shown && !this.placement.actions.length) {
        report(this, 'SSH-16', 'a modal side sheet opened with no action; it must offer at least one: add a <tanrei-button slot="actions">', { once: false, level: 'error' });
      }
    };
    openModal(dialog);
    this.shown = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', count, { once: true });
    else count();
    modalLayer.add(this);
    holdPageScroll(this, true);
    this.layout();
    this.onViewport();
    this.focusInside();
  }

  /** SSH-2, SSH-3: out of the top layer (sliding from where it is drawn), the page given back, focus back where it was. */
  private withdraw(restore: boolean) {
    if (!this.shown) return;
    this.shown = false;
    this.drag = null;
    this.listenToDrag(false);
    modalLayer.delete(this);
    holdPageScroll(this, false);
    const hadFocus = focusWithin(this);
    const dialog = this.dialog;
    dialog?.classList.remove('dragging');
    if (dialog) void closeModal(dialog);
    if (restore && hadFocus) this.restoreFocus();
    else this.opener = null;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('open') && changed.get('open') === true && !this.open && !this.modal) this.closingWithFocus = focusWithin(this);
  }

  /** What changes whether the actions fit and whether the content scrolls: the content box, the content and the row. */
  private observe() {
    for (const selector of ['.sheet', '.content', '.inner', '.actions']) {
      const element = this.renderRoot.querySelector(selector);
      if (element) this.resize$?.observe(element);
    }
  }

  protected override firstUpdated() {
    this.readSlots();
    this.observe();
  }

  protected override updated(changed: PropertyValues<this>) {
    // Before it is presented or measured: the slots of the element just rendered hold their children.
    this.assign();
    // SSH-12, SSH-5: what a debug build reports.
    if ((changed.has('headline') || changed.has('variant')) && !this.headline.trim() && !namedByProduct(this)) {
      report(this, 'SSH-12', `headline is empty, so the ${this.modal ? 'modal dialog' : 'complementary region'} has no accessible name; give it a headline`);
    }
    if ((changed.has('closable') || changed.has('closeLabel')) && this.closable && this.words.lacks('closeLabel', this.closeLabel)) {
      report(this, 'SSH-5', 'close-label is empty, so the close button has no accessible name; give it a close-label');
    }
    // SSH-23: a divider visibility the sheet does not define is drawn as auto (no rule matches it).
    if (changed.has('dividerVisibility')) {
      if (!isDividerVisibility(this.dividerVisibility)) report(this, 'SSH-23', `divider-visibility "${this.dividerVisibility}" is not a value of the side sheet; it is drawn as "auto"`);
      this.syncHeaderDivider();
    }

    const variantChanged = changed.has('variant') && changed.get('variant') !== undefined;
    if (variantChanged) {
      // Another element holds the panel now: observe it, and lay it out before it is presented.
      this.observe();
      this.keyboard = -1;
      this.layout();
      if (this.shown && !this.modal) this.withdraw(false);
    }
    if (changed.has('open') || variantChanged) {
      const mounted = changed.has('open') && changed.get('open') === undefined;
      const was = changed.has('open') ? changed.get('open') === true : this.open;
      if (this.modal) {
        // SSH-3: a modal sheet mounted open takes focus as if it had just opened.
        if (this.open) this.present(mounted || variantChanged);
        else if (this.shown) this.withdraw(true);
      } else if (changed.has('open') && !mounted) {
        // SSH-3: a standard sheet opened moves focus in; closed with focus inside, it gives it back. Mounted open, it
        // leaves focus where it is (it makes nothing unfocusable).
        if (this.open && !was) {
          this.opener = deepActive();
          this.focusInside();
        } else if (!this.open && was && this.closingWithFocus) {
          this.closingWithFocus = false;
          this.restoreFocus();
        }
      }
    }
    // A footer drawn anew, a close button, or the sheet opening: observed, laid out and given the variants the tokens
    // name now.
    if (changed.has('hasActions' as keyof TanreiSideSheet) || changed.has('closable') || changed.has('headline') || changed.has('open') || variantChanged) {
      this.observe();
      this.layout();
    }
    if (changed.has('open')) this.onViewport();
  }

  private body() {
    const headline = this.headline.trim() ? this.headline : '';
    const header = !!headline || this.closable;
    return html`
      <div part="outline" class="edge" aria-hidden="true"></div>
      ${header
        ? html`<div part="header" class=${classMap({ header: true, closable: this.closable })}>
            ${headline ? html`<h2 part="headline" class="headline">${headline}</h2>` : nothing}
            ${this.closable
              ? html`<tanrei-button part="close-button" class="close" size="small" label=${this.words.get('closeLabel', this.closeLabel)} @click=${this.onCloseClick}><span slot="icon">close</span></tanrei-button>`
              : nothing}
            <div part="divider" class="divider below-header" aria-hidden="true"></div>
          </div>`
        : nothing}
      <div class="middle">
        <div part="content" class=${classMap({ content: true, top: !header, bottom: !this.hasActions })} data-tanrei-shape @scroll=${this.onScroll} @wheel=${containedWheel}>
          <div class="inner"><slot @slotchange=${() => this.layout()}></slot></div>
        </div>
        <span class="focus" data-tanrei-shape></span>
      </div>
      <div class="footer" ?hidden=${!this.hasActions}>
        <div part="divider" class="divider above-actions" aria-hidden="true"></div>
        <div part="actions" class="actions"><slot name="actions-first"></slot><slot name="actions-between"></slot><slot name="actions-last"></slot></div>
      </div>
    `;
  }

  protected override render() {
    const label = this.headline.trim();
    if (this.modal) {
      // SSH-12: a modal dialog named by the headline.
      return html`<dialog
        part="container"
        class="sheet"
        data-tanrei-appear
        ${delegatedAria(this, { 'aria-label': label })}
        tabindex="-1"
        data-tanrei-shape
        @keydown=${this.onKeyDown}
        @cancel=${this.onNativeCancel}
        @close=${this.onNativeClose}
        @pointerdown=${this.onPointerDown}
        @click=${this.onClick}
      >
        ${this.body()}
      </dialog>`;
    }
    // SSH-1, SSH-12: a complementary region named by the headline; closed, out of the focus order and the accessibility
    // tree at once (inert), and hidden once it has slid out.
    return html`<aside part="container" class="sheet standard" ${delegatedAria(this, { 'aria-label': label })} tabindex="-1" ?inert=${!this.open} data-tanrei-shape>${this.body()}</aside>`;
  }
}

// SSH-24: the product's ARIA on the host is its dialog's, or its complementary region's (src/primitives/delegated-aria.ts).
delegatesAria(TanreiSideSheet, { sentence: 'SSH-24' });
if (!customElements.get('tanrei-side-sheet')) customElements.define('tanrei-side-sheet', TanreiSideSheet);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-side-sheet': TanreiSideSheet;
  }
}
