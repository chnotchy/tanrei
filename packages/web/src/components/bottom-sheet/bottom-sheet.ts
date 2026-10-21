import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  BUTTON_VARIANTS,
  type DividerVisibilityProp,
  SHEET_FLING_VELOCITY,
  SheetDrag,
  closeRequestReason,
  compChoice,
  deepActive,
  focusWithin,
  giveVariant,
  holdPageScroll,
  isDividerVisibility,
  keyboardCover,
  modalLayer,
  modalSheetKeys,
  onBackdrop,
  report,
  returnFocus,
  syncDividerVisibility,
  watchEscape,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import '../handle/handle.js';
import { styles } from './bottom-sheet.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** Standard sits over the lower part of its parent while the content above stays usable; modal dims and blocks the rest of the window. */
export type TanreiBottomSheetVariant = 'standard' | 'modal';
/** The height the sheet rests at while its content is taller than it. */
export type TanreiBottomSheetDetent = 'partial' | 'full';
/** HTML's `closedby` values: `any` (a drag, Escape, back and the scrim ask to close) or `none` (nothing does). */
export type TanreiBottomSheetClosedBy = 'any' | 'none' | 'closerequest';
/** Why the sheet asks to close (BSH-5, BSH-29). The web has no back of its own; Android's back gesture arrives as `back`. */
export type TanreiBottomSheetCloseReason = 'close' | 'drag' | 'scrim' | 'escape' | 'back';
/** When the divider below the header is drawn (BSH-28): `auto` takes `comp.bottom-sheet.divider.visibility`. */
export type TanreiBottomSheetDividerVisibility = DividerVisibilityProp;

/** `close`'s detail: why the sheet asks to be closed. */
export interface TanreiBottomSheetCloseDetail {
  reason: TanreiBottomSheetCloseReason;
}

/** `detentchange`'s detail: the height the person moved the sheet to (the element's `detent` already holds it). */
export interface TanreiBottomSheetDetentChangeDetail {
  detent: TanreiBottomSheetDetent;
}

const PREFIX = '--tanrei-comp-bottom-sheet';
const VARIANTS: readonly string[] = ['standard', 'modal'];
const DETENTS: readonly string[] = ['partial', 'full'];

/** BSH-6: the sheet's heights in its area — each the content's own, bounded by its detent — and whether they differ. */
export interface TanreiBottomSheetHeights {
  partial: number;
  full: number;
  two: boolean;
}

/**
 * BSH-9: where a released drag goes — `close` (below half the lowest height, or a downward fling with no height below
 * it), else the next height in the direction of a fling, else the nearest. `position` is the sheet's visible height at
 * the release, `velocity` its vertical speed in px per ms (positive: down).
 */
export function bottomSheetRelease(position: number, velocity: number, heights: TanreiBottomSheetHeights): 'close' | TanreiBottomSheetDetent {
  const stops: { detent: TanreiBottomSheetDetent; height: number }[] = heights.two
    ? [
        { detent: 'partial', height: heights.partial },
        { detent: 'full', height: heights.full },
      ]
    : [{ detent: 'partial', height: heights.partial }];
  const lowest = stops[0];
  if (velocity > SHEET_FLING_VELOCITY) {
    const below = stops.filter((stop) => stop.height < position - 0.5);
    return below.length > 0 ? below[below.length - 1].detent : 'close';
  }
  if (position < lowest.height / 2) return 'close';
  if (velocity < -SHEET_FLING_VELOCITY) return (stops.find((stop) => stop.height > position + 0.5) ?? stops[stops.length - 1]).detent;
  return stops.reduce((best, stop) => (Math.abs(stop.height - position) < Math.abs(best.height - position) ? stop : best)).detent;
}

/** The sheet's height and its downward offset as drawn right now (mid-motion included). */
interface Drawn {
  height: number;
  offset: number;
}

/**
 * Shows supplementary content or a short task in a surface that rises from the bottom edge: `standard`, over the lower
 * part of its parent while the content above stays usable (a layout region), or `modal`, a modal step that dims
 * and blocks everything else until it is dismissed (a modal overlay).
 *
 * Contract: specs/bottom-sheet.spec.json. The content is the default slot. The sheet is as tall as its drag handle's row
 * and its content, up to its `detent`: `partial` takes `container.partial-fraction` of the area, `full` reaches up to
 * `container.margin-block-start` below its top. The person moves it between the two by dragging (the handle's row, the
 * content's padding, or the content where it lets the drag through) or with the drag handle, a button while there are
 * two heights; the element sets `detent` and fires `detentchange`.
 *
 * A header below the handle's row holds `headline` (a heading, which names the sheet where `label` is empty) and, while
 * `closable`, an icon-only `<tanrei-button>` of the small size showing the close glyph, named by `close-label`, in the
 * variant `comp.bottom-sheet.close-button.variant` names (tonal in the default system), as every host's close button
 * is; a divider below it as `divider-visibility` says (BSH-28, BSH-29). The header stays while the content scrolls.
 *
 * Controlled: the sheet never closes itself. While `closedby` is not `none` it fires `close` with a reason — a released
 * drag below its lowest height and, for a modal sheet, a press on the scrim, Escape or the platform's back — and you set
 * `open` to false. The close button fires `close` with the reason `close` whatever `closedby` says. A product that does
 * not close it sees it settle back.
 *
 * Modal: a native `<dialog>` in the shadow root opened with `showModal()`: in the top layer over `::backdrop` (the scrim),
 * docked to the window's bottom edge, everything else inert, the page held from scrolling and focus kept inside. Focus
 * goes to the slotted element marked `autofocus`, else the sheet (also when it is mounted open), and returns where it was
 * when it closes. Standard: a `<section>` named by `label`, docked to the bottom of its containing block — the host fills
 * the nearest positioned ancestor, so give the parent that holds the sheet and the content `position: relative` — with
 * presses above it reaching the content; opening it moves focus in, closing it gives focus back, and Tab leaves it open.
 *
 * Every visual value comes from `--tanrei-comp-bottom-sheet-*` tokens. The color reaches under
 * `env(safe-area-inset-bottom)`; the sheet sits on the on-screen keyboard (`visualViewport`).
 *
 * @tag tanrei-bottom-sheet
 * @slot - The content: it gets `content.color` as its color, and plain text the body role.
 * @csspart container - The sheet: the `<dialog>` of a modal sheet (its `::backdrop` is the scrim), the `<section>` of a standard one.
 * @csspart handle - The drag handle's box: the `container` of its `<tanrei-handle>`, a button while the sheet has two heights, drawn at rest otherwise.
 * @csspart grip - The grip drawn in the handle's box: the `line` of its `<tanrei-handle>` (hidden from assistive technology).
 * @csspart header - The row that holds the headline and the close button, while there is one.
 * @csspart headline - The headline (a heading).
 * @csspart close-button - The close button, an icon-only `<tanrei-button>`.
 * @csspart divider - The hairline below the header, drawn as `divider-visibility` says (hidden from assistive technology).
 * @csspart content - The box that insets, clips and scrolls the content.
 * @fires {CustomEvent<TanreiBottomSheetCloseDetail>} close - The sheet asks to be closed: `detail.reason` is `close` (its close button, whatever `closedby` says), or `drag`, `scrim`, `escape` or `back` (only while `closedby` is not `none`). Set `open` to false.
 * @fires {CustomEvent<TanreiBottomSheetDetentChangeDetail>} detentchange - The person moved the sheet to its other height, by a drag or with the handle: `detail.detent` (and `detent`) is the new one. Not fired when you set `detent`.
 */
export class TanreiBottomSheet extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'bottom-sheet');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    detent: { type: String },
    closedBy: { type: String, attribute: 'closedby', reflect: true },
    // An HTML boolean attribute cannot default to true: the attributes are the inverses, `no-handle` and `flush`.
    handle: {
      attribute: 'no-handle',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    handleLabel: { type: String, attribute: 'handle-label' },
    inset: {
      attribute: 'flush',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    label: { type: String },
    headline: { type: String },
    closable: { type: Boolean, reflect: true },
    closeLabel: { type: String, attribute: 'close-label' },
    dividerVisibility: { type: String, attribute: 'divider-visibility', reflect: true },
    two: { state: true },
  };

  /** `modal` (the default) dims and blocks everything else; `standard` covers the bottom of its parent with no scrim. Any other value is `modal`, reported (BSH-25). Reflected. */
  variant: TanreiBottomSheetVariant = 'modal';

  /** Whether the sheet is shown. Controlled: set it to false in answer to `close` (or from the sheet's own controls). Reflected. */
  open = false;

  /**
   * The height it rests at while its content is taller than its partial height: `partial` (the default) or `full`. The
   * element sets it when the person changes the height (and fires `detentchange`); setting it moves the sheet without an
   * event. Any other value is `partial`, reported (BSH-25).
   */
  detent: TanreiBottomSheetDetent = 'partial';

  /** The spec's `dismissible`, as HTML's own attribute: `none` ignores a drag below the lowest height, Escape, back and the scrim; any other value is `any`. Reflected. */
  closedBy: TanreiBottomSheetClosedBy = 'any';

  /** Draws the drag handle. False (the `no-handle` attribute) draws none; the sheet can still be dragged by its content. */
  handle = true;

  /** The drag handle's accessible name ("Resize sheet"), required while it is a button (BSH-11). */
  handleLabel = '';

  /** Insets the content by `container.padding`. False (the `flush` attribute) lets it reach the edges (a list with its own padding). */
  inset = true;

  /** Names the modal dialog, or the standard sheet's region ("Share photo"). Required unless `headline` names it (BSH-22). */
  label = '';

  /** What the sheet is about ("Share photo"), drawn in its header; it names the sheet where `label` is empty (BSH-28). */
  headline = '';

  /** Draws the close button at the end of the header (BSH-29). False by default: the handle and the scrim are the sheet's ways out. Reflected. */
  closable = false;

  /** The close button's accessible name ("Close sharing"). Required while `closable` (BSH-29). The attribute is `close-label`. */
  closeLabel = '';

  /**
   * When the divider below the header is drawn: `always` whenever the header is, `scroll` only while the content is
   * scrolled from its top; `auto` takes `comp.bottom-sheet.divider.visibility`, the design system's answer (always in the
   * default system). Reflected as `divider-visibility`.
   */
  dividerVisibility: TanreiBottomSheetDividerVisibility = 'auto';

  /** BSH-6, BSH-11: whether the content is taller than the partial height (two heights: the handle is a button). */
  private two = false;

  private heights: TanreiBottomSheetHeights | null = null;
  /** Where focus was when the sheet opened (BSH-3). */
  private opener: Element | null = null;
  /** A modal sheet is presented (in the top layer). */
  private shown = false;
  private pressedScrim = false;
  private dragged = false;
  private drag: SheetDrag | null = null;
  private dragOnContent = false;
  /** BSH-13: the drag began on the handle, which holds the pointer (and its pressed state) while the drag lasts. */
  private dragOnHandle = false;
  /** The sheet's visible height while it follows a drag. */
  private position = 0;
  private settling: Animation | null = null;
  /** The sheet changed `detent` itself (a drag, the handle): no product move follows. */
  private choosing = false;
  /** Where a product's change of `detent` starts from (BSH-21). */
  private movingFrom: Drawn | null = null;
  /** Whether focus was inside a standard sheet that is closing (read before the render makes it inert). */
  private closingWithFocus = false;
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());

  private get modal(): boolean {
    return this.variant !== 'standard';
  }

  private get dismissible(): boolean {
    return this.closedBy !== 'none';
  }

  /** The detent drawn: an unknown value is `partial` (BSH-25). */
  private get resting(): TanreiBottomSheetDetent {
    return this.detent === 'full' ? 'full' : 'partial';
  }

  /** BSH-11: the handle is a control only while the sheet has two heights. */
  private get interactive(): boolean {
    return this.handle && this.two;
  }

  private get sheet(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.sheet') ?? null;
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  private get content(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.content') ?? null;
  }

  override connectedCallback() {
    super.connectedCallback();
    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    // Moved in the document while open: presented again, in place (as mounted).
    if (this.hasUpdated && this.open && this.modal) this.present(true);
    // A Button that reconnects lets go of the variant its host gave it; the next update gives it again (BSH-29).
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
    this.resize$?.disconnect();
    this.drag = null;
    this.listenToDrag(false);
    this.cancelSettle();
    if (this.shown) this.withdraw(false);
  }

  // ---- BSH-5: asking to close ----

  /** BSH-5: `close` with the reason, once, while dismissible; a standard sheet answers only a drag. BSH-29: the close button asks always. */
  private requestClose(reason: TanreiBottomSheetCloseReason) {
    if (!this.open) return;
    if (reason !== 'close') {
      if (!this.dismissible) return;
      if (!this.modal && reason !== 'drag') return;
    }
    this.dispatchEvent(new CustomEvent<TanreiBottomSheetCloseDetail>('close', { detail: { reason } }));
  }

  /** BSH-29: the close button asks once for each activation (a click that ends a drag is swallowed before it). */
  private readonly onCloseClick = () => {
    if (this.dragged) return;
    this.requestClose('close');
  };

  /** BSH-5, BSH-2: Escape asks to close (only the topmost overlay answers it); Tab stays inside. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const dialog = this.dialog;
    // BSH-23: an overlay opened from the content above this one answers its own Escape; the browser's own close request
    // never runs (the product closes the sheet).
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
    if (this.open && this.modal) dialog.showModal();
  };

  private readonly onClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && onBackdrop(event, this.dialog);
    this.pressedScrim = false;
    if (scrim) this.requestClose('scrim');
  };

  // ---- BSH-9, BSH-10, BSH-20: the drag ----

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pressedScrim = this.modal && onBackdrop(event, this.dialog);
    if (this.pressedScrim || !this.open || (this.modal && !this.shown)) return;
    if (this.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.drag = new SheetDrag(event, 'y');
    const content = this.content;
    this.dragOnContent = !!content && event.composedPath().includes(content);
    const handle = this.renderRoot.querySelector('.handle');
    this.dragOnHandle = !!handle && this.interactive && event.composedPath().includes(handle);
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
    if (!drag || event.pointerId !== drag.id) return;
    const step = drag.move(event);
    if (step === 'wait') return;
    if (step === 'start') this.startFollowing(event);
    this.follow(drag.delta(event));
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (drag && event.pointerId !== drag.id) return;
    this.drag = null;
    this.listenToDrag(false);
    const sheet = this.sheet;
    if (!drag || !sheet || !drag.following) return;
    sheet.classList.remove('dragging');
    // The click that ends a drag activates nothing.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    const heights = this.heights;
    if (!heights) return;
    const velocity = event.type === 'pointercancel' ? 0 : drag.velocity(event);
    const decision = bottomSheetRelease(this.position, velocity, heights);
    if (decision !== 'close') {
      this.settleTo(decision);
      return;
    }
    // BSH-5: a sheet that cannot be dismissed settles at its lowest height.
    if (!this.dismissible) {
      this.settleTo('partial');
      return;
    }
    // BSH-20: ask, hold where the drag left it for one frame, then slide out (open false) or settle back (declined).
    this.requestClose('drag');
    requestAnimationFrame(() => {
      if (this.open && this.isConnected) this.settleTo('partial');
    });
  };

  /** Swallows the click that ends a drag, before it reaches the handle or the content. */
  private readonly onClickCapture = {
    capture: true,
    handleEvent: (event: MouseEvent) => {
      if (!this.dragged) return;
      event.stopPropagation();
      event.preventDefault();
    },
  };

  /** The drag has passed the slop: the sheet follows it from where it is drawn (mid-motion included). */
  private startFollowing(event: PointerEvent) {
    const sheet = this.sheet;
    if (!sheet) return;
    this.measure();
    const drawn = this.drawn();
    this.cancelSettle();
    this.position = drawn.height - drawn.offset;
    sheet.classList.add('dragging');
    // BSH-13: a drag that began on the handle stays the handle's press, held while the drag lasts (HDL-11): the handle
    // keeps the pointer. Any other drag is captured by the sheet.
    if (!this.dragOnHandle) {
      try {
        sheet.setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer the browser no longer counts as active cannot be captured; the window still follows it.
      }
    }
    this.place(this.position);
  }

  /**
   * BSH-9, BSH-10: follows a move of `dy` (positive: down), never above the highest height. On the content, a move up
   * first raises the sheet to its full height and then scrolls the content; a move down first scrolls the content to its
   * top and then lowers the sheet.
   */
  private follow(dy: number) {
    const heights = this.heights;
    const content = this.content;
    if (!heights || !content) return;
    const highest = heights.two ? heights.full : heights.partial;
    if (dy < 0) {
      const raised = Math.min(Math.max(0, highest - this.position), -dy);
      this.position += raised;
      const rest = -dy - raised;
      if (rest > 0 && this.dragOnContent) content.scrollTop += rest;
    } else if (dy > 0) {
      let rest = dy;
      if (this.dragOnContent && content.scrollTop > 0) {
        const scrolled = Math.min(content.scrollTop, rest);
        content.scrollTop -= scrolled;
        rest -= scrolled;
      }
      this.position = Math.max(0, this.position - rest);
    }
    this.place(this.position);
  }

  /** Draws the sheet `position` high: above its lowest height by its own height, below it by an offset down. */
  private place(position: number) {
    const sheet = this.sheet;
    const heights = this.heights;
    if (!sheet || !heights) return;
    const lowest = heights.partial;
    sheet.style.maxBlockSize = 'none';
    sheet.style.blockSize = `${Math.max(position, lowest)}px`;
    sheet.style.setProperty('--_drag', `${Math.max(0, lowest - position)}px`);
  }

  /**
   * The sheet as drawn: its height, and how far below the area's bottom edge (where it rests) its bottom edge is —
   * whatever is moving it (a drag, a settle, the enter or exit motion).
   */
  private drawn(): Drawn {
    const sheet = this.sheet;
    const area = this.renderRoot?.querySelector('.area');
    if (!sheet || !area) return { height: 0, offset: 0 };
    const box = sheet.getBoundingClientRect();
    return { height: box.height, offset: Math.max(0, box.bottom - area.getBoundingClientRect().bottom) };
  }

  /** Back to the resting layout: no drawn height or offset of the sheet's own. */
  private clearPlacement() {
    const sheet = this.sheet;
    if (!sheet) return;
    sheet.style.removeProperty('max-block-size');
    sheet.style.removeProperty('block-size');
    sheet.style.removeProperty('--_drag');
  }

  private cancelSettle() {
    const running = this.settling;
    this.settling = null;
    running?.cancel();
    this.sheet?.classList.remove('settling');
  }

  /**
   * BSH-9, BSH-11: settles at `detent` — and, where the sheet has two heights and it is not the one it rests at, the
   * sheet sets `detent` to it and fires `detentchange` once.
   */
  private settleTo(detent: TanreiBottomSheetDetent) {
    const heights = this.heights;
    if (!heights) return;
    const from = this.drawn();
    const target = heights.two && detent === 'full' ? heights.full : heights.partial;
    if (heights.two && detent !== this.resting) this.choose(detent);
    this.settle(from, target);
  }

  /** The person chose a height: the sheet keeps it (BSH-21) and says so once. */
  private choose(detent: TanreiBottomSheetDetent) {
    this.choosing = true;
    this.detent = detent;
    this.dispatchEvent(new CustomEvent<TanreiBottomSheetDetentChangeDetail>('detentchange', { detail: { detent } }));
  }

  /**
   * Moves the sheet from where it is drawn to its resting height `target` over the enter motion (BSH-9, BSH-11, BSH-21),
   * at once where motion is reduced. The resting layout is set first; the motion is an animation over it.
   */
  private settle(from: Drawn, target: number) {
    const sheet = this.sheet;
    if (!sheet) return;
    // Read before anything changes: reading a computed style applies every change made so far.
    const timing = this.renderRoot.querySelector('.timing');
    const style = timing ? getComputedStyle(timing) : null;
    const duration = style ? Number.parseFloat(style.transitionDuration) * 1000 : 0;
    const easing = style?.transitionTimingFunction || 'ease';
    const moves = Math.abs(from.height - target) >= 0.5 || from.offset >= 0.5;
    const animate = moves && duration > 0 && typeof sheet.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cancelSettle();
    // No transition of the sheet's own may start from the resting layout: the motion is the animation below.
    sheet.classList.add('settling');
    this.clearPlacement();
    if (!animate) {
      getComputedStyle(sheet).translate;
      sheet.classList.remove('settling');
      return;
    }
    const animation = sheet.animate(
      [
        { blockSize: `${from.height}px`, maxBlockSize: 'none', translate: `0 ${from.offset}px` },
        { blockSize: `${target}px`, maxBlockSize: 'none', translate: '0 0px' },
      ],
      { duration, easing },
    );
    this.settling = animation;
    animation.finished.then(
      () => {
        if (this.settling !== animation) return;
        this.settling = null;
        sheet.classList.remove('settling');
      },
      () => undefined,
    );
  }

  // ---- BSH-11: the drag handle ----

  /** BSH-11: the handle activated without a drag (HDL-7) moves the sheet to its other height. */
  private readonly onHandleActivate = () => {
    if (this.dragged || !this.interactive) return;
    this.settleTo(this.resting === 'full' ? 'partial' : 'full');
  };

  // ---- BSH-6, BSH-7, BSH-10: the area, the heights and the keyboard ----

  /** BSH-6: the heights, from the area's caps and the content's own height; BSH-10: whether the content scrolls. */
  private measure() {
    const sheet = this.sheet;
    const content = this.content;
    const partialCap = this.renderRoot?.querySelector('.cap.partial');
    const fullCap = this.renderRoot?.querySelector('.cap.full');
    if (!sheet || !content || !partialCap || !fullCap) return;
    if (sheet.getClientRects().length === 0) return;
    const row = this.renderRoot.querySelector('.row')?.getBoundingClientRect().height ?? 0;
    const header = this.renderRoot.querySelector('.header')?.getBoundingClientRect().height ?? 0;
    const end = Number.parseFloat(getComputedStyle(sheet).paddingBlockEnd) || 0;
    const natural = row + header + content.scrollHeight + end;
    const partial = Math.min(natural, partialCap.getBoundingClientRect().height);
    const full = Math.min(natural, fullCap.getBoundingClientRect().height);
    this.heights = { partial, full, two: full - partial > 0.5 };
    if (this.two !== this.heights.two) this.two = this.heights.two;
    // BSH-10: a content that scrolls is a Tab stop, so the keyboard can scroll it.
    if (content.scrollHeight > content.clientHeight + 0.5) content.setAttribute('tabindex', '0');
    else content.removeAttribute('tabindex');
    this.syncTouch();
  }

  /**
   * BSH-10 on touch, where the browser decides who takes a drag when it begins: below its highest height the sheet takes
   * every vertical drag on the content; at it, a drag up scrolls the content, and a drag down lowers the sheet once the
   * content is at its top.
   */
  private syncTouch() {
    const content = this.content;
    if (!content) return;
    const highest = !this.heights?.two || this.resting === 'full';
    content.dataset.touch = !highest ? 'sheet' : content.scrollTop <= 0 ? 'pan-down' : 'scroll';
  }

  private readonly onScroll = () => {
    this.syncTouch();
    this.syncHeaderDivider();
  };

  /**
   * BSH-28: the divider below the header — whenever the header is drawn under always, while the content is scrolled away
   * from its top under scroll (`scrolled`); at once, without motion.
   */
  private syncHeaderDivider() {
    const header = this.renderRoot?.querySelector<HTMLElement>('.header');
    const content = this.content;
    if (header && content) header.classList.toggle('scrolled', content.scrollTop > 0.5);
    syncDividerVisibility(this, header);
  }

  /** BSH-6, BSH-7: the area ends at the on-screen keyboard, and nothing is under the bottom inset while it is shown. */
  private readonly onViewport = () => {
    const cover = this.modal ? keyboardCover() : keyboardCover(this.getBoundingClientRect().bottom);
    for (const element of this.renderRoot?.querySelectorAll<HTMLElement>('.sheet, .area') ?? []) element.style.setProperty('--_keyboard', `${cover}px`);
    this.sheet?.classList.toggle('keyboard', cover > 0);
  };

  // ---- BSH-2, BSH-3: presenting and focus ----

  /** BSH-3: focus to the slotted element marked `autofocus`, else the sheet itself, so its label is read first. */
  private focusInside() {
    const marked = this.querySelector<HTMLElement>('[autofocus]');
    if (marked && !marked.closest('[inert]')) marked.focus();
    else this.sheet?.focus();
  }

  /** BSH-3: focus back where it was when the sheet opened — or dropped, where that element is gone. */
  private restoreFocus() {
    const opener = this.opener;
    this.opener = null;
    returnFocus(opener, this);
  }

  /** Whether focus is inside the sheet (its content or its shadow root). */
  private hasFocus(): boolean {
    return focusWithin(this);
  }

  /** BSH-1, BSH-2, BSH-3: in the top layer, the page held, focus in. Mounted open, it appears in place without motion. */
  private present(mounted: boolean) {
    const dialog = this.dialog;
    if (!dialog || this.shown || !this.isConnected) return;
    watchEscape();
    this.cancelSettle();
    this.clearPlacement();
    this.opener = deepActive();
    if (mounted) {
      dialog.classList.add('instant');
      requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.remove('instant')));
    }
    if (!dialog.open) dialog.showModal();
    this.shown = true;
    modalLayer.add(this);
    holdPageScroll(this, true);
    this.onViewport();
    this.measure();
    this.focusInside();
  }

  /** BSH-1, BSH-3: out of the top layer (sliding from where it is drawn), the page given back, focus back where it was. */
  private withdraw(restore: boolean) {
    if (!this.shown) return;
    this.shown = false;
    // A settle in progress stops where it is drawn, and the exit starts from there.
    if (this.settling) {
      const drawn = this.drawn();
      this.cancelSettle();
      this.placeDrawn(drawn);
    }
    modalLayer.delete(this);
    holdPageScroll(this, false);
    const hadFocus = this.hasFocus();
    const dialog = this.dialog;
    if (dialog?.open) dialog.close();
    if (restore && hadFocus) this.restoreFocus();
    else this.opener = null;
  }

  private placeDrawn(drawn: Drawn) {
    const sheet = this.sheet;
    if (!sheet) return;
    sheet.style.maxBlockSize = 'none';
    sheet.style.blockSize = `${drawn.height}px`;
    sheet.style.setProperty('--_drag', `${drawn.offset}px`);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('open') && changed.get('open') === true && !this.open && !this.modal) this.closingWithFocus = this.hasFocus();
    // BSH-21: a product's change of detent moves the sheet from where it is drawn.
    if (changed.has('detent') && changed.get('detent') !== undefined && !this.choosing && this.open && this.hasUpdated) this.movingFrom = this.drawn();
  }

  protected override firstUpdated() {
    const area = this.renderRoot.querySelector('.area');
    if (area) this.resize$?.observe(area);
  }

  protected override updated(changed: PropertyValues<this>) {
    this.observe();
    // BSH-22, BSH-11, BSH-25: what a debug build reports.
    if ((changed.has('label') || changed.has('headline') || changed.has('variant')) && !this.label.trim() && !this.headline.trim()) {
      report(this, 'BSH-22', `label and headline are empty, so the ${this.modal ? 'modal dialog' : 'region'} has no accessible name; give it a label or a headline`);
    }
    if ((changed.has('closable') || changed.has('closeLabel')) && this.closable && this.words.lacks('closeLabel', this.closeLabel)) {
      report(this, 'BSH-29', 'close-label is empty, so the close button has no accessible name; give it a close-label');
    }
    if ((changed.has('handle') || changed.has('closedBy') || changed.has('closable')) && !this.handle && this.dismissible && !this.closable) {
      report(this, 'BSH-30', 'it has no drag handle and no close button, so it shows no way out a person can see; set closable (with a close-label) or put a Close button in its content');
    }
    if (changed.has('dividerVisibility') && !isDividerVisibility(this.dividerVisibility)) {
      report(this, 'BSH-28', `divider-visibility "${this.dividerVisibility}" is not a value of the bottom sheet; it is drawn as "auto"`);
    }
    // BSH-29: the variant its token names, read at each update (a system switch is seen at the next one).
    giveVariant(this.renderRoot.querySelector('tanrei-button.close'), compChoice(this, `${PREFIX}-close-button-variant`, BUTTON_VARIANTS));
    this.syncHeaderDivider();
    if ((changed.has('handleLabel') || changed.has('two' as keyof TanreiBottomSheet) || changed.has('handle')) && this.interactive && this.words.lacks('handleLabel', this.handleLabel)) {
      report(this, 'BSH-11', 'handle-label is empty, so the drag handle has no accessible name; give it a handle-label');
    }
    if (changed.has('variant') && !VARIANTS.includes(this.variant)) report(this, 'BSH-25', `variant "${this.variant}" is not defined; the sheet is drawn as modal`);
    if (changed.has('detent') && !DETENTS.includes(this.detent)) report(this, 'BSH-25', `detent "${this.detent}" is not defined; the sheet rests at partial`);

    const variantChanged = changed.has('variant') && changed.get('variant') !== undefined;
    if (variantChanged && this.shown && !this.modal) this.withdraw(false);
    if (changed.has('open') || variantChanged) {
      const mounted = changed.has('open') && changed.get('open') === undefined;
      const was = changed.has('open') ? changed.get('open') === true : this.open;
      if (this.modal) {
        if (this.open) this.present(mounted || variantChanged);
        else if (this.shown) this.withdraw(true);
      } else if (changed.has('open') && !mounted) {
        // BSH-3: a standard sheet opened moves focus in; closed with focus inside, it gives it back. Mounted open, it
        // leaves focus where it is (it makes nothing unfocusable).
        if (this.open && !was) {
          this.cancelSettle();
          this.clearPlacement();
          this.opener = deepActive();
          this.focusInside();
        } else if (!this.open && was && this.closingWithFocus) {
          this.closingWithFocus = false;
          this.restoreFocus();
        }
      }
      if (this.open) this.onViewport();
    }
    if (changed.has('handle') || changed.has('inset') || changed.has('headline') || changed.has('closable')) this.measure();
    if (this.choosing) this.choosing = false;
    else if (changed.has('detent')) {
      const from = this.movingFrom;
      this.movingFrom = null;
      this.measure();
      if (from && this.heights) this.settle(from, this.heights.two && this.resting === 'full' ? this.heights.full : this.heights.partial);
    }
    this.syncTouch();
  }

  /** What changes the heights: the area, the content box and the content itself. */
  private observe() {
    const resize = this.resize$;
    if (!resize) return;
    for (const selector of ['.area', '.content', '.inner', '.row', '.header']) {
      const element = this.renderRoot.querySelector(selector);
      if (element) resize.observe(element);
    }
  }

  /**
   * BSH-11, BSH-12: the drag handle, a Handle drawn with the sheet's tokens (the styles give it them): a button with
   * the expanded state while the sheet has two heights; at one height drawn at rest and nothing to focus, to a press or
   * to assistive technology (inert).
   */
  private handleTemplate() {
    const interactive = this.interactive;
    return html`<tanrei-handle
      class="handle"
      exportparts="container: handle, line: grip"
      revealed
      label=${interactive ? this.words.get('handleLabel', this.handleLabel) : ''}
      .expanded=${interactive ? this.resting === 'full' : null}
      ?inert=${!interactive}
      aria-hidden=${interactive ? nothing : 'true'}
      @activate=${this.onHandleActivate}
    ></tanrei-handle>`;
  }

  /** BSH-28, BSH-29: the header — the headline and, while closable, the close button; the divider below it. */
  private headerTemplate() {
    const headline = this.headline.trim() ? this.headline : '';
    if (!headline && !this.closable) return nothing;
    return html`<div part="header" class=${classMap({ header: true, closable: this.closable })} @click=${this.onClickCapture}>
      ${headline ? html`<h2 part="headline" class="headline">${headline}</h2>` : nothing}
      ${this.closable
        ? html`<tanrei-button part="close-button" class="close" size="small" label=${this.words.get('closeLabel', this.closeLabel)} @click=${this.onCloseClick}><span slot="icon">close</span></tanrei-button>`
        : nothing}
      <div part="divider" class="divider" aria-hidden="true"></div>
    </div>`;
  }

  private body() {
    return html`
      ${this.handle ? html`<div class="row" @click=${this.onClickCapture}>${this.handleTemplate()}</div>` : nothing}
      ${this.headerTemplate()}
      <div class="middle">
        <div part="content" class=${classMap({ content: true, inset: this.inset })} data-tanrei-shape @scroll=${this.onScroll} @click=${this.onClickCapture}>
          <div class="inner"><slot @slotchange=${() => this.measure()}></slot></div>
        </div>
        <span class="focus" data-tanrei-shape></span>
      </div>
    `;
  }

  protected override render() {
    // BSH-22, BSH-28: named by label, or by the headline where label is empty.
    const label = this.label || this.headline.trim() || nothing;
    const classes = classMap({ sheet: true, standard: !this.modal, 'has-handle': this.handle, 'has-header': !!this.headline.trim() || this.closable });
    const area = html`<div class="area" aria-hidden="true"><div class="cap partial"></div><div class="cap full"></div></div>
      <div class="timing" aria-hidden="true"></div>`;
    if (this.modal) {
      // BSH-22: a modal dialog named by the label.
      return html`${area}<dialog
          part="container"
          class=${classes}
          data-tanrei-appear
          data-detent=${this.resting}
          aria-label=${label}
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
    // BSH-4, BSH-22: a region named by the label; closed, out of the focus order and the accessibility tree (inert).
    return html`${area}<section
        part="container"
        class=${classes}
        data-detent=${this.resting}
        aria-label=${label}
        tabindex="-1"
        ?inert=${!this.open}
        data-tanrei-shape
        @pointerdown=${this.onPointerDown}
      >
        ${this.body()}
      </section>`;
  }
}

if (!customElements.get('tanrei-bottom-sheet')) customElements.define('tanrei-bottom-sheet', TanreiBottomSheet);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-bottom-sheet': TanreiBottomSheet;
  }
}
