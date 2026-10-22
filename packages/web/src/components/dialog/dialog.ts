import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  ActionPlacement,
  AppearController,
  AvailabilityController,
  BUTTON_VARIANTS,
  CompactWindow,
  type DividerVisibilityProp,
  GlyphMirrorController,
  HOST_VARIANT,
  type VariantHost,
  assignSlot,
  closeModal,
  closeRequestReason,
  compChoice,
  deepActive,
  holdPageScroll,
  isDisabledControl,
  isDividerVisibility,
  keyboardCover,
  modalLayer,
  openModal,
  report,
  syncDividerVisibility,
  trapFocus,
  watchEscape,
} from '../../primitives/index.js';
import { styles } from './dialog.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** HTML's `closedby` values: `any` (Escape, back and a press on the scrim dismiss) or `none` (nothing does). */
export type TanreiDialogClosedBy = 'any' | 'none' | 'closerequest';

/** When the dividers are drawn while the scrolled part scrolls (DLG-24): `auto` takes `comp.dialog.divider.visibility`. */
export type TanreiDialogDividerVisibility = DividerVisibilityProp;

/** What decides the container's width outside a compact window (DLG-27): its widest part, or one of three fixed widths. */
export type TanreiDialogWidth = 'content' | 'small' | 'medium' | 'large';
const WIDTHS: readonly string[] = ['content', 'small', 'medium', 'large'];

/** How it is presented in a compact window (DLG-17): with the bottom sheet's appearance, or centred still. */
export type TanreiDialogCompactPresentation = 'sheet' | 'own';
const COMPACT_PRESENTATIONS: readonly string[] = ['sheet', 'own'];

/** Why the dialog was dismissed (DLG-5). The web has no back of its own; Android's back gesture arrives as `back`. */
export type TanreiDialogDismissReason = 'escape' | 'back' | 'scrim';

/** `cancel`'s detail: why the person asked to close the dialog. */
export interface TanreiDialogDismissDetail {
  reason: TanreiDialogDismissReason;
}

/** The dialogs open in this window, bottom to top (DLG-15). */
const stack: TanreiDialog[] = [];

const PREFIX = '--tanrei-comp-dialog';
/** The choices of kind the dialog reads (tokens/comp/dialog.tokens.json, `dev.tanrei.enum`): the first is the fallback. */
const ICON_PLACEMENTS = ['inline', 'above'] as const;
const ARRANGEMENTS = ['fill', 'end'] as const;

/**
 * Stops a person for a decision or a few details that the task cannot go on without, in a surface that dims and blocks
 * everything behind it and always offers at least one answer, until one is chosen or the dialog is dismissed.
 *
 * Contract: specs/dialog.spec.json. A native `<dialog>` in the shadow root, opened with `showModal()` while `open` is
 * true: in the top layer over `::backdrop` (the scrim, `comp.dialog.scrim.color`), with everything else inert and the page
 * held from scrolling. Focus goes to the slotted element marked `autofocus`, or to the dialog itself, stays inside it
 * (Tab wraps), and returns where it was when the dialog closes. It is an operated modal overlay.
 * Centred in the window, or — in a window narrower than `comp.dialog.compact.window-width` — with the bottom sheet's
 * appearance at its bottom edge (DLG-17, DLG-18): docked to the edge, as wide as the window up to the bottom sheet's
 * greatest width, in its color, elevation and top corners, square at the bottom, sliding up with its motion; still a
 * modal dialog, with no drag. `compact-presentation="own"` keeps it centred in every window.
 *
 * While `closedby` is not `none`, Escape, the platform's back and a press on the scrim fire `cancel`, whose
 * `detail.reason` says which (`escape`, `back`, `scrim`). It is cancelable: the dialog then closes itself unless you
 * call `preventDefault()`, as a native `<dialog>` does. Actions never close it: close it from their handlers with
 * `open = false`. `close` follows every close.
 *
 * A dialog has no close button (DLG-28): it asks for a decision, and its way out without one is a dismissive action
 * (Cancel, or Close where there is nothing to cancel). Content that needs only a way out belongs in a side sheet or a
 * bottom sheet. `width` is `content` (the default: as wide as its widest part, between the minimum and maximum width)
 * or `small`, `medium` or `large` (`comp.dialog.width.*`), never wider than the window less its margins; a compact
 * window places every width alike.
 *
 * The actions are `<tanrei-button slot="actions">` children, each marked `confirming` or `dismissive`, placed as a
 * full-width button group places them: dismissive at the start and confirming at the end of a row, confirming on top of
 * a column when they do not fit in a row. Focus and assistive technology follow that order. A Button without a
 * `variant` attribute takes the dialog's (`comp.dialog.actions.variant`, tonal in the default system).
 *
 * When the parts do not fit, the supporting text and the content scroll between the header and the actions, with a
 * divider below the header and one above the actions (DLG-11): for as long as that part scrolls while
 * `divider-visibility` is `always` (the default system's), only while content lies beyond each line while it is
 * `scroll`; `auto` takes `comp.dialog.divider.visibility` (DLG-24).
 *
 * Every visual value comes from `--tanrei-comp-dialog-*` tokens.
 *
 * @tag tanrei-dialog
 * @slot - Custom content, below the supporting text: it gets the content color, and plain text the body role.
 * @slot icon - A glyph at the headline's start (its ligature text), centred on the headline's first line; or above a centred headline where the system sets `icon.placement` to above. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot actions - The answers, one at least: Tanrei Buttons, each marked `confirming` or `dismissive`. The dialog places them and gives those without a `variant` its own.
 * @csspart container - The dialog's surface (the native `<dialog>`): its color, corners, elevation and padding.
 * @csspart icon - The box the icon is drawn in.
 * @csspart header - The row that holds the icon and the headline.
 * @csspart headline - The headline.
 * @csspart supporting-text - The supporting text.
 * @csspart content - The box the custom content is slotted into.
 * @csspart actions - The row (or column) of actions.
 * @fires {CustomEvent<TanreiDialogDismissDetail>} cancel - Escape, back or a press on the scrim asked to close it (only while `closedby` is not `none`): `detail.reason` is `escape`, `back` or `scrim`. Cancelable: `preventDefault()` keeps it open.
 * @fires close - The dialog closed, whatever closed it.
 */
export class TanreiDialog extends TanreiElement implements VariantHost {
  private readonly availability = new AvailabilityController(this, 'dialog');
  /**
   * DLG-22: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]' });
  static override styles = [styles, hiddenHost];

  // The children are assigned by hand: the actions to three slots in the order the orientation places them (BGR-15),
  // so that focus and the accessibility tree follow the placed order without CSS `order`.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    headline: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    alert: { type: Boolean, reflect: true },
    closedBy: { type: String, attribute: 'closedby', reflect: true },
    dividerVisibility: { type: String, attribute: 'divider-visibility', reflect: true },
    width: { type: String, reflect: true },
    compactPresentation: { type: String, attribute: 'compact-presentation', reflect: true },
    filled: { state: true },
  };

  /** Whether the dialog is presented. Open it; close it from an action's handler, or let a dismissal close it. */
  open = false;

  /** The question or statement ("Discard draft?"). Required: it is the accessible name. */
  headline = '';

  /** What will happen, or what the person needs to know. It is the accessible description. */
  supportingText = '';

  /** An urgent interruption: exposed as an alertdialog, read as soon as it opens. */
  alert = false;

  /** The spec's `dismissible`, as HTML's `closedby`: `any` (the default) lets Escape, back and the scrim dismiss it; `none` does not. Give a dialog that cannot be dismissed a dismissive action. */
  closedBy: TanreiDialogClosedBy = 'any';

  /**
   * When the dividers are drawn while the supporting text and the content scroll: `always` for as long as they scroll,
   * `scroll` only while content lies beyond each line; `auto` takes `comp.dialog.divider.visibility`, the design
   * system's answer (always in the default system). Reflected as `divider-visibility`.
   */
  dividerVisibility: TanreiDialogDividerVisibility = 'auto';

  /**
   * What decides the container's width outside a compact window: `content` (the default) is as wide as its widest
   * part, between `comp.dialog.container.min-width` and `max-width`; `small`, `medium` and `large` are
   * `comp.dialog.width.*`, whatever it holds. Never wider than the window less its margins. Reflected.
   */
  width: TanreiDialogWidth = 'content';

  /**
   * How it is presented in a window narrower than `comp.dialog.compact.window-width`: `sheet` (the default) with the
   * bottom sheet's appearance at the window's bottom edge, `own` centred as in every other window. Anything else is
   * `sheet` (DLG-17). The attribute is `compact-presentation`; reflected.
   */
  compactPresentation: TanreiDialogCompactPresentation = 'sheet';

  /** Which parts hold something (DLG-8: an empty part is left out). */
  private filled = { icon: false, content: false, actions: false };

  /** The children, by the slot they are assigned to; the actions by run, placed and given its variant (DLG-10, DLG-20). */
  private icons: Element[] = [];
  private content: Node[] = [];
  // DLG-10: a button that draws (or changes) its label changes whether the row fits.
  private readonly placement = new ActionPlacement(this, (action) => this.resize$?.observe(action));

  /** DLG-17: the window, matched against the resolved `compact.window-width`; crossing it re-places at once. */
  private readonly compact = new CompactWindow(() => this.layout());

  /**
   * DLG-13, DLG-18: its appearance, opened and closed (src/primitives/motion.ts): made at once before the first paint
   * (MOT-4), turned round from what it shows (MOT-2). The `<dialog>` is the surface that appears.
   */
  private readonly appear = new AppearController(this, { motion: () => this.dialog });

  /** DLG-4: where focus was when it opened. */
  private opener: Element | null = null;
  private shown = false;
  private pressedScrim = false;
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.layout());
  private readonly mutation$ = new MutationObserver(() => this.readSlots());

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  private get dismissible(): boolean {
    return this.closedBy !== 'none';
  }

  /** A choice of kind, by name, as the cascade gives it now — never cached, so a system switch is seen; unknown is the first. */
  private choice<T extends string>(token: string, values: readonly T[]): T {
    return compChoice(this, `${PREFIX}-${token}`, values);
  }

  /** @internal DLG-20: the variant it gives one of its actions whose own is not set (src/primitives/group-item.ts). */
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
      attributeFilter: ['slot', 'confirming', 'dismissive', 'disabled'],
    });
    if (this.hasUpdated) this.readSlots();
    if (this.hasUpdated && this.open) this.present();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutation$.disconnect();
    this.resize$?.disconnect();
    this.compact.stop();
    if (this.shown) this.withdraw(false);
  }

  /**
   * DLG-8, DLG-10: which child goes to which slot, and the actions' runs. A change in which parts are filled is drawn by
   * the update it requests, which assigns and lays out the slots it draws; otherwise they are assigned and laid out here.
   */
  private readSlots() {
    if (this.readChildren()) return;
    this.assign();
    this.layout();
  }

  /** DLG-8, DLG-10, DLG-20: the children by slot, the actions given their variant; true when the filled parts changed. */
  private readChildren(): boolean {
    const nodes = [...this.childNodes];
    const slotted = (node: Node, slot: string) => node instanceof Element && node.getAttribute('slot') === slot;
    this.icons = nodes.filter((node) => slotted(node, 'icon')) as Element[];
    this.content = nodes.filter(
      (node) => (node instanceof Element && !node.hasAttribute('slot')) || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()),
    );
    this.placement.read(nodes.filter((node) => slotted(node, 'actions')) as Element[]);
    this.giveVariant();
    const filled = { icon: this.icons.length > 0, content: this.content.length > 0, actions: this.placement.actions.length > 0 };
    if (filled.icon === this.filled.icon && filled.content === this.filled.content && filled.actions === this.filled.actions) return false;
    this.filled = filled;
    return true;
  }

  /** DLG-20: every action is told the dialog's variant, which it draws while its own is not set; a former action, none. */
  private giveVariant() {
    this.placement.give(this.choice('actions-variant', BUTTON_VARIANTS));
  }

  /** The slots assigned by hand: the icon, the content, and the actions in the order of the orientation (BGR-15). */
  private assign() {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    assignSlot(root.querySelector<HTMLSlotElement>('slot[name="icon"]'), this.icons);
    assignSlot(root.querySelector<HTMLSlotElement>('slot:not([name])'), this.content);
    this.placement.assign(root.querySelectorAll<HTMLSlotElement>('.actions slot'));
  }

  /** DLG-5: Escape, back or the scrim: `cancel` with the reason, and — unless it was cancelled — closing. Only the topmost dialog. */
  private requestDismiss(reason: TanreiDialogDismissReason) {
    if (!this.dismissible || !this.shown || stack[stack.length - 1] !== this) return;
    const allowed = this.dispatchEvent(new CustomEvent<TanreiDialogDismissDetail>('cancel', { cancelable: true, detail: { reason } }));
    if (allowed) this.open = false;
  }

  /** DLG-5: Escape is answered here, so the browser's own close request (and its limits) never runs. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      this.requestDismiss('escape');
      return;
    }
    if (event.key === 'Tab') this.trap(event);
  };

  /** DLG-5: the platform's back (a close request without a key: Android's back) arrives as the native cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.requestDismiss(closeRequestReason(event));
  };

  /** DLG-5: a press that starts and ends on the scrim (outside the surface) dismisses. */
  private readonly onPointerDown = (event: PointerEvent) => {
    this.pressedScrim = this.#onScrim(event);
  };

  private readonly onClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && this.#onScrim(event);
    this.pressedScrim = false;
    if (scrim) this.requestDismiss('scrim');
  };

  #onScrim(event: MouseEvent): boolean {
    const dialog = this.dialog;
    if (!dialog || event.composedPath()[0] !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  /** DLG-3: Tab from the last focusable element goes to the first, Shift+Tab from the first (or the dialog) to the last. */
  private trap(event: KeyboardEvent) {
    const dialog = this.dialog;
    if (dialog) trapFocus(event, dialog);
  }

  /** DLG-7, DLG-17: above the on-screen keyboard (the part of the layout viewport the visual viewport no longer covers). */
  private readonly onViewport = () => {
    const dialog = this.dialog;
    if (!dialog || !window.visualViewport) return;
    const covered = keyboardCover();
    dialog.style.setProperty('--_keyboard', `${covered}px`);
    dialog.classList.toggle('keyboard', covered > 0);
  };

  /**
   * DLG-17: whether it is a sheet now — a compact window (the resolved `compact.window-width`, src/primitives/
   * compact-sheet.ts), unless it keeps its own presentation. Re-read whenever the dialog lays out; crossing the width
   * lays it out at once, with no motion and focus where it is.
   */
  private readCompact(): boolean {
    const compact = this.compact.read(this.renderRoot?.querySelector('.probe'));
    return compact && this.compactPresentation !== 'own';
  }

  /** DLG-9, DLG-10, DLG-17: the choices the script reads, on the dialog — the placement, and the fallback where style queries are missing. */
  private applyChoices(dialog: HTMLDialogElement) {
    dialog.classList.toggle('compact', this.readCompact());
    dialog.dataset.iconPlacement = this.choice('icon-placement', ICON_PLACEMENTS);
    dialog.dataset.arrangement = this.choice('actions-arrangement', ARRANGEMENTS);
    // DLG-24: the divider visibility, where style queries are missing.
    syncDividerVisibility(this, dialog);
  }

  /**
   * DLG-28: a dialog has no close button. A product that still asks for one (the `closable` or `close-label`
   * attribute, or those properties written on the element) gets nothing drawn, and a debug build says what to give
   * instead.
   */
  private checkCloseButton() {
    const asked = ['closable', 'close-label'].some((name) => this.hasAttribute(name)) || ['closable', 'closeLabel'].some((name) => Object.hasOwn(this, name));
    if (asked) {
      report(this, 'DLG-28', 'a dialog has no close button, so closable and close-label draw nothing; give it a dismissive action (Cancel, or Close where there is nothing to cancel), or show the content in a side sheet or a bottom sheet');
    }
  }

  /** DLG-19: counted when it opens — no action, or (not dismissible) no enabled one, is reported as an error. */
  private checkActions() {
    const actions = this.placement.actions;
    if (!actions.length) {
      report(this, 'DLG-19', 'it opened with no action; a dialog must offer at least one: add a <tanrei-button slot="actions">', { once: false, level: 'error' });
    } else if (!this.dismissible && actions.every((action) => isDisabledControl(action))) {
      report(this, 'DLG-19', 'every action is disabled and closedby is none, which leaves the person no way out; enable a dismissive action', { once: false, level: 'error' });
    }
  }

  /** DLG-1, DLG-2, DLG-15, DLG-17: modal in the top layer, placed, the page held, focus to the marked element or the dialog. */
  private present() {
    const dialog = this.dialog;
    if (!dialog || this.shown || !this.isConnected) return;
    this.opener = deepActive();
    // DLG-5: an Escape the dialog did not see itself still reads as escape, not back.
    watchEscape();
    // Placed before it is shown, so that its entrance is the one of its placement (DLG-13, DLG-18).
    this.giveVariant();
    this.layout();
    // DLG-13: opened modally — or, still leaving, taken back where its exit has got to (MOT-2, src/primitives/modal-exit.ts).
    openModal(dialog);
    this.appear.enter();
    this.shown = true;
    // DLG-19, DLG-2: counted, and the marked element looked for, when it opens — or, in a document that is still being
    // read, once it has been. A dialog written open whose element was defined before its markup opens at its start
    // tag, and an engine that updates it there has not read its children yet (the side sheet's SSH-16): its actions
    // would be counted as none, and the element marked for focus not found.
    const reading = document.readyState === 'loading';
    if (reading) {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          if (!this.shown) return;
          this.checkActions();
          this.checkCloseButton();
          // Focus goes to the mark that has been read since, unless the person has moved it from the dialog meanwhile.
          const late = this.querySelector<HTMLElement>('[autofocus]');
          if (late && deepActive() === dialog) late.focus();
        },
        { once: true },
      );
    } else {
      this.checkActions();
      this.checkCloseButton();
    }
    stack.push(this);
    modalLayer.add(this);
    holdPageScroll(this, true);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    this.onViewport();
    this.layout();
    const marked = this.querySelector<HTMLElement>('[autofocus]');
    if (marked) marked.focus();
    else dialog.focus();
  }

  /** DLG-4, DLG-13, DLG-18: out of the top layer (fading), focus back where it was, the page given back. */
  private withdraw(restoreFocus = true) {
    const dialog = this.dialog;
    if (!this.shown) return;
    this.shown = false;
    const index = stack.indexOf(this);
    if (index >= 0) stack.splice(index, 1);
    modalLayer.delete(this);
    holdPageScroll(this, false);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    // DLG-13: no longer modal at once — the page and focus are given back now — and drawn in the top layer until its
    // exit and its scrim's have played (closeModal), in every engine.
    if (dialog) void closeModal(dialog);
    void this.appear.exit(!this.isConnected);
    const opener = this.opener as HTMLElement | null;
    this.opener = null;
    if (restoreFocus) {
      if (opener && opener.isConnected && typeof opener.focus === 'function' && !opener.closest('[inert]')) opener.focus();
      else {
        const active = deepActive() as HTMLElement | null;
        if (active && this.renderRoot.contains(active)) active.blur();
      }
    }
    this.dispatchEvent(new Event('close'));
  }

  /**
   * DLG-10, DLG-11, DLG-12, DLG-17: the placement; the actions in a row while they fit and otherwise a column, in the
   * order of each; the dividers follow the scrolled part; with no room left for it, everything scrolls together.
   */
  private layout() {
    const dialog = this.dialog;
    if (!dialog) return;
    this.applyChoices(dialog);
    this.placeActions(dialog);
    dialog.classList.remove('whole');
    const scroll = this.renderRoot.querySelector<HTMLElement>('.scroll');
    if (scroll) {
      const line = Number.parseFloat(getComputedStyle(scroll.firstElementChild ?? scroll).lineHeight) || 0;
      const cramped = scroll.scrollHeight > scroll.clientHeight + 0.5 && scroll.clientHeight < line;
      dialog.classList.toggle('whole', cramped);
    }
    this.syncDividers();
  }

  /**
   * DLG-7, DLG-10: measured at their own widths (one line each): `fill` stays a row while every label fits its equal
   * share, `end` while the row fits the inner width. The row is also the widest part the container is sized to (`--_row`),
   * stacked or not: at their own widths for `end`, and for `fill` as it draws them — equal shares, each as wide as the
   * widest action.
   */
  private placeActions(dialog: HTMLDialogElement) {
    const box = this.renderRoot.querySelector<HTMLElement>('.actions');
    if (!box) return;
    const { row, changed } = this.placement.measure(box, dialog.dataset.arrangement === 'end' ? 'packed' : 'fill');
    dialog.style.setProperty('--_row', `${row}px`);
    if (changed) this.assign();
  }

  private syncDividers() {
    const middle = this.renderRoot?.querySelector<HTMLElement>('.middle');
    const scroll = this.renderRoot?.querySelector<HTMLElement>('.scroll');
    if (!middle || !scroll) return;
    // A part that scrolls is a Tab stop, so it can be scrolled from the keyboard (WCAG 2.1.1) — unless the whole dialog
    // scrolls instead.
    const scrolls = scroll.scrollHeight > scroll.clientHeight + 0.5 && !this.dialog?.classList.contains('whole');
    if (scrolls) scroll.setAttribute('tabindex', '0');
    else scroll.removeAttribute('tabindex');
    // DLG-11, DLG-24: whether the part scrolls (always draws both dividers then), and where it is (scroll draws each
    // only while content lies beyond it).
    middle.classList.toggle('scrolls', scrolls);
    middle.classList.toggle('actioned', this.filled.actions);
    middle.classList.toggle('above', scroll.scrollTop > 0.5);
    middle.classList.toggle('below', this.filled.actions && scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 0.5);
  }

  private readonly onScroll = () => this.syncDividers();

  /**
   * The children are read before the first render, so that it draws the parts they fill. Read after it (in
   * `firstUpdated`), a change of `filled` would schedule a second update from inside the first, which Lit's development
   * build warns about (`change-in-update`). `updated` assigns them to the slots the render drew.
   */
  protected override willUpdate() {
    if (!this.hasUpdated) this.readChildren();
  }

  protected override firstUpdated() {
    const dialog = this.dialog;
    if (dialog) this.resize$?.observe(dialog);
  }

  protected override updated(changed: PropertyValues<this>) {
    const dialog = this.dialog;
    this.assign();
    const scroll = this.renderRoot.querySelector('.scroll');
    if (scroll) this.resize$?.observe(scroll);
    const actions = this.renderRoot.querySelector('.actions');
    if (actions) this.resize$?.observe(actions);
    // DLG-14: a dialog without a headline still opens; a debug build says it has no name.
    if (changed.has('headline') && !this.headline.trim() && !namedByProduct(this)) report(this, 'DLG-14', 'headline is empty, so the dialog has no accessible name; give it a headline');
    // DLG-24: a divider visibility the dialog does not define is drawn as auto (no rule matches it).
    if (changed.has('dividerVisibility') && !isDividerVisibility(this.dividerVisibility)) {
      report(this, 'DLG-24', `divider-visibility "${this.dividerVisibility}" is not a value of the dialog; it is drawn as "auto"`);
    }
    if (changed.has('dividerVisibility') && this.dialog) syncDividerVisibility(this, this.dialog);
    // DLG-17: a compact presentation the dialog does not define is a sheet.
    if (changed.has('compactPresentation') && !COMPACT_PRESENTATIONS.includes(this.compactPresentation)) {
      report(this, 'DLG-17', `compact-presentation "${this.compactPresentation}" is not one of ${COMPACT_PRESENTATIONS.join(', ')}; the dialog is a sheet in a compact window`);
    }
    // DLG-27: a width the dialog does not define is drawn as content.
    if (changed.has('width') && !WIDTHS.includes(this.width)) {
      report(this, 'DLG-27', `width "${this.width}" is not a value of the dialog; it is drawn as "content"`);
    }
    if (changed.has('open')) {
      if (this.open) this.present();
      else if (this.shown) this.withdraw();
    }
    if (dialog && this.shown) this.layout();
  }

  protected override render() {
    const icon = this.filled.icon;
    const headline = this.headline.trim();
    const supporting = this.supportingText.trim();
    const head = icon || !!headline;
    const width = WIDTHS.includes(this.width) ? this.width : 'content';
    const middle = !!supporting || this.filled.content;
    return html`
      <span class="probe" aria-hidden="true"></span>
      <dialog
        part="container"
        class="container"
        data-tanrei-appear
        role=${this.alert ? 'alertdialog' : 'dialog'}
        ${delegatedAria(this, { 'aria-labelledby': headline ? 'headline' : '', 'aria-describedby': supporting ? 'supporting' : '' })}
        tabindex="-1"
        data-tanrei-shape
        data-width=${width}
        @keydown=${this.onKeyDown}
        @cancel=${this.onNativeCancel}
        @pointerdown=${this.onPointerDown}
        @click=${this.onClick}
      >
        <div part="header" class="header" ?hidden=${!head}>
          <div class=${classMap({ head: true, 'with-icon': icon })}>
            <span class="icon-line" ?hidden=${!icon}><span part="icon" class="icon" aria-hidden="true"><slot name="icon"></slot></span></span>
            ${headline ? html`<h2 id="headline" part="headline" class="headline">${this.headline}</h2>` : nothing}
          </div>
        </div>
        <div class="middle" ?hidden=${!middle}>
          <div class="scroll" data-tanrei-shape @scroll=${this.onScroll}>
            ${supporting ? html`<p id="supporting" part="supporting-text" class="supporting">${this.supportingText}</p>` : nothing}
            <div part="content" class="content" ?hidden=${!this.filled.content}><slot></slot></div>
          </div>
          <span class="focus" data-tanrei-shape></span>
        </div>
        <div part="actions" class="actions" ?hidden=${!this.filled.actions}>
          <slot name="actions-first"></slot><slot name="actions-between"></slot><slot name="actions-last"></slot>
        </div>
      </dialog>
    `;
  }
}

// DLG-29: the product's ARIA on the host is its dialog's (src/primitives/delegated-aria.ts).
delegatesAria(TanreiDialog, { sentence: 'DLG-29' });
if (!customElements.get('tanrei-dialog')) customElements.define('tanrei-dialog', TanreiDialog);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-dialog': TanreiDialog;
  }
}
