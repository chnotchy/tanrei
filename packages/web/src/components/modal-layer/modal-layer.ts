import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  closeModal,
  closeRequestReason,
  deepActive,
  focusWithin,
  holdPageScroll,
  keyboardCover,
  modalLayer,
  modalSheetKeys,
  onBackdrop,
  openModal,
  readTogether,
  report,
  returnFocus,
  watchEscape,
} from '../../primitives/index.js';
import { styles } from './modal-layer.styles.js';
import { TanreiElement } from '../../primitives/element.js';
import { statesFromNextFrame } from '../../primitives/motion.js';

/** HTML's `closedby` values: `any` (Escape, back and a press on the scrim ask to close) or `none` (nothing does). */
export type TanreiModalLayerClosedBy = 'any' | 'none' | 'closerequest';
/** Why the layer asks to close (MDL-6). The web has no back of its own; Android's back gesture arrives as `back`. */
export type TanreiModalLayerCloseReason = 'escape' | 'back' | 'scrim';

/** `close`'s detail: why the layer asks to be closed. */
export interface TanreiModalLayerCloseDetail {
  reason: TanreiModalLayerCloseReason;
}

/**
 * The layer under every modal surface: it dims the window behind what it presents, makes everything there inert, moves
 * focus in, keeps it there and gives it back, and asks to close on Escape, the platform's back or a press on the dim.
 * The dialog, the modal sheets, the modal drawer, the image preview, the modal picker and the search's modal views are
 * built from it; use it alone for a modal surface Tanrei does not have (a command palette, a takeover of the window).
 *
 * Contract: specs/modal-layer.spec.json. A native `<dialog>` in the shadow root, opened with `showModal()` while `open`
 * is true: in the top layer over `::backdrop` (the scrim: `comp.modal-layer.scrim.color`, blurring what is behind by
 * `comp.modal-layer.scrim.blur`), with everything else inert and the page held from scrolling. Focus goes to the slotted
 * element marked `autofocus`, or to the container, stays inside it (Tab wraps), and returns where it was when the layer
 * closes. The container draws nothing: it is as large as its content, centred in the window's safe area; place or size
 * it with `::part(container)`.
 *
 * Controlled: the layer never closes itself. While `closedby` is not `none`, Escape, the platform's back and a press on
 * the scrim fire `close` with a reason, and you set `open` to false.
 *
 * Every visual value comes from `--tanrei-comp-modal-layer-*` tokens.
 *
 * @tag tanrei-modal-layer
 * @slot - The content: the surface you present modally. The layer draws, styles and sizes nothing of it.
 * @csspart container - The box the content is in (the native `<dialog>`; its `::backdrop` is the scrim). Place or size it here.
 * @fires {CustomEvent<TanreiModalLayerCloseDetail>} close - The layer asks to be closed: `detail.reason` is `escape`, `back` or `scrim`. Set `open` to false. Only while `closedby` is not `none`.
 */
export class TanreiModalLayer extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'modal-layer');
  static override styles = [styles, hiddenHost];

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    closedBy: { type: String, attribute: 'closedby', reflect: true },
    // The spec's `scrim`, which defaults to true, is its inverse here, `noScrim`: an HTML boolean attribute cannot default
    // to true, and the property has the attribute's name (the spec's web notes).
    noScrim: { type: Boolean, attribute: 'no-scrim', reflect: true },
    label: { type: String },
  };

  /** Whether the layer is presented. Open it; close it in answer to `close`, or from the content's own controls. */
  open = false;

  /** The spec's `dismissible`, as HTML's `closedby`: `any` (the default) lets Escape, back and the scrim ask to close; `none` does not. Give the content a way out of its own. */
  closedBy: TanreiModalLayerClosedBy = 'any';

  /** Leaves what lies behind the layer undimmed, for content that covers the whole window with a fill of its own; the layer still blocks everything behind. False (the default) dims it. */
  noScrim = false;

  /** The container's accessible name ("Export photos"): the modal dialog's name. Required; never drawn. */
  label = '';

  /** MDL-5: where focus was when it opened. */
  private opener: Element | null = null;
  /** The layer is presented (in the top layer). */
  private shown = false;
  /** It is to open with the reads of the turn (`present()`), and has not yet. */
  private presenting = false;
  private pressedScrim = false;

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  private get dismissible(): boolean {
    return this.closedBy !== 'none';
  }

  override connectedCallback() {
    super.connectedCallback();
    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    // Moved in the document while open: presented again (as mounted).
    if (this.hasUpdated && this.open) this.present();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
    if (this.shown) this.withdraw(false);
  }

  // ---- MDL-6: asking to close ----

  /** MDL-6: `close` with the reason, once, while dismissible and open. It never closes the layer itself. */
  private requestClose(reason: TanreiModalLayerCloseReason) {
    if (!this.dismissible || !this.open || !this.shown) return;
    this.dispatchEvent(new CustomEvent<TanreiModalLayerCloseDetail>('close', { detail: { reason } }));
  }

  /**
   * MDL-6, MDL-4, MDL-8, MDL-9: Escape asks to close once everything inside has heard it — not when an element inside took
   * it, nor when it belongs to an overlay opened from the content above this layer — and the browser's own close
   * request never runs; Tab stays inside.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const dialog = this.dialog;
    if (dialog) modalSheetKeys(event, dialog, () => this.requestClose('escape'));
  };

  /** MDL-6: a close request without a key the layer saw (Android's back) arrives as the native cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.requestClose(closeRequestReason(event));
  };

  /** The browser closed the dialog itself (a close request it would not let the layer cancel): ask, and stay unless closed. */
  private readonly onNativeClose = () => {
    const dialog = this.dialog;
    if (!this.shown || !dialog || dialog.open) return;
    this.requestClose('back');
    if (this.open) openModal(dialog);
  };

  /** MDL-6: a press that starts and ends on the scrim (outside the container) asks to close. */
  private readonly onPointerDown = (event: PointerEvent) => {
    this.pressedScrim = onBackdrop(event, this.dialog);
  };

  private readonly onClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && onBackdrop(event, this.dialog);
    this.pressedScrim = false;
    if (scrim) this.requestClose('scrim');
  };

  /** MDL-11: above the on-screen keyboard (the part of the layout viewport the visual viewport no longer covers). */
  private readonly onViewport = () => this.cover(keyboardCover());

  private cover(covered: number) {
    this.dialog?.style.setProperty('--_keyboard', `${covered}px`);
  }

  // ---- MDL-1 to MDL-5: presenting and focus ----

  /** MDL-3: focus to the slotted element marked `autofocus`, else the container, so its name is read first. */
  private focusInside() {
    // A layer opened above it in the same turn has focus, and everything under it is inert (MDL-8).
    const dialog = this.dialog;
    if (!dialog || modalLayer.top !== dialog) return;
    const marked = this.querySelector<HTMLElement>('[autofocus]');
    if (marked && !marked.closest('[inert]') && typeof marked.focus === 'function') {
      // `showModal()` has given focus already where it could (src/primitives/modal-exit.ts): focused again, an element
      // has the page styled for it once more.
      if (deepActive() !== marked) marked.focus();
      if (focusWithin(this)) return;
    }
    if (deepActive() !== dialog) dialog.focus();
  }

  /**
   * MDL-1, MDL-2, MDL-3, MDL-8: in the top layer (above every layer opened before it), the page held, focus in. What it
   * reads to open — the keyboard — is read with every other host's reads of the turn (src/primitives/read-phase.ts),
   * and it opens in the write that follows: still in the task, before a script that waits for the update
   * (`updateComplete`) goes on. Read after its own `showModal()`, it had the browser lay the page out once per layer.
   */
  private present() {
    const dialog = this.dialog;
    if (!dialog || this.shown || this.presenting || !this.isConnected) return;
    this.presenting = true;
    readTogether(() => {
      this.presenting = false;
      if (!this.open || this.shown || !this.isConnected || this.dialog !== dialog) return;
      const covered = keyboardCover();
      return () => {
        if (this.open && !this.shown && this.isConnected) this.show(dialog, covered);
      };
    });
  }

  /** `present()`'s write: the layer opens with what was read. */
  private show(dialog: HTMLDialogElement, covered: number) {
    watchEscape();
    this.opener = deepActive();
    this.cover(covered);
    openModal(dialog);
    this.shown = true;
    holdPageScroll(this, true);
    this.focusInside();
    // MDL-3: what the open state began inside it — the colors of what took focus — begins in the first frame drawn after
    // this task, as its entrance does (statesFromNextFrame).
    statesFromNextFrame([this]);
  }

  /** MDL-2, MDL-5, MDL-7: out of the top layer (fading), the page given back, focus back where it was. */
  private withdraw(restore: boolean) {
    if (!this.shown) return;
    this.shown = false;
    holdPageScroll(this, false);
    const dialog = this.dialog;
    if (dialog) void closeModal(dialog);
    const opener = this.opener;
    this.opener = null;
    if (restore) returnFocus(opener, this);
    // MDL-5, MDL-7: what closing began — the colors of the element focus left and of the opener it went back to — begins
    // in the first frame drawn after this task, as its exit does (statesFromNextFrame). WebKit dated it from the frame
    // drawn before the task, and where closing took longer than it lasts drew it over at once.
    statesFromNextFrame([this, restore ? opener : null]);
  }

  protected override updated(changed: PropertyValues<this>) {
    // MDL-10: a layer without a label still opens; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim() && !namedByProduct(this)) report(this, 'MDL-10', 'label is empty, so the modal dialog has no accessible name; give it a label');
    if (changed.has('open')) {
      if (this.open) this.present();
      else if (this.shown) this.withdraw(true);
    }
  }

  protected override render() {
    // MDL-10: the container is a modal dialog named by the label; the scrim is not exposed.
    return html`<dialog
      part="container"
      data-tanrei-appear
      ${delegatedAria(this, { 'aria-label': this.label })}
      tabindex="-1"
      @keydown=${this.onKeyDown}
      @cancel=${this.onNativeCancel}
      @close=${this.onNativeClose}
      @pointerdown=${this.onPointerDown}
      @click=${this.onClick}
    >
      <slot></slot>
    </dialog>`;
  }
}

// MDL-13: the product's ARIA on the host is its dialog's (src/primitives/delegated-aria.ts).
delegatesAria(TanreiModalLayer, { sentence: 'MDL-13' });
if (!customElements.get('tanrei-modal-layer')) customElements.define('tanrei-modal-layer', TanreiModalLayer);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-modal-layer': TanreiModalLayer;
  }
}
