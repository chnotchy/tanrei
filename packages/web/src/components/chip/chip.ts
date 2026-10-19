import { LitElement, type PropertyDeclarations, type PropertyValues, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { html, literal } from 'lit/static-html.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GlyphMirrorController,
  LINK_MARK,
  LinkController,
  OpenAxesController,
  PressController,
  type TanreiLinkTarget,
  afterClick,
  linkAttributes,
  markConditionChange,
  report,
  selectionRippleOrigin,
  syncFocusStyle,
} from '../../primitives/index.js';
import type { TanreiChipSizeRegistry, TanreiChipVariantRegistry } from '../../registry.js';
import { AXES, styles } from './chip.styles.js';
import { ownDirection } from '../../styles/product-text.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** What the chip does: a button (action), an on / off toggle (filter) or an item the user entered and can remove (input). A closed set. */
export type TanreiChipKind = 'action' | 'filter' | 'input';
/** The core variants (outlined, elevated), plus any a design system's generated `.d.ts` registers. */
export type TanreiChipVariant = keyof TanreiChipVariantRegistry;
/** The core sizes (small, medium), plus any a design system's generated `.d.ts` registers. */
export type TanreiChipSize = keyof TanreiChipSizeRegistry;

/** What `change` carries: the new value of `selected`. */
export interface TanreiChipChangeDetail {
  selected: boolean;
}

const KINDS: readonly TanreiChipKind[] = ['action', 'filter', 'input'];

/**
 * The glyphs of the system's icon set the chip draws itself, by the names the spec gives them (CHP-13, CHP-18): the
 * check of a filter chip that is on, and the remove action's cancel glyph. A system that wants other marks chooses
 * another icon set.
 */
const CHECK_GLYPH = 'check';
const REMOVE_GLYPH = 'cancel';

/**
 * Shows a compact choice, a suggested action or an item the user entered as a small labelled control.
 *
 * Contract: specs/chip.spec.json. Every visual value comes from `--tanrei-comp-chip-*` tokens, one set per variant, look
 * (plain, or `selected.` for a filter chip that is on) and state, and the `remove.` parts of an input chip's remove
 * action in its own states: how a state looks is the active design system's decision, not this component's. How a
 * press is answered and how keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`),
 * and how far its corners ease is the system's amount (`--tanrei-sys-shape-corner-smoothing`).
 *
 * `kind` decides what the chip does and its parts; `variant` only how it looks. An action chip is a button. A filter chip
 * is a button with a pressed state: activation switches `selected` and fires `change`, and when on it shows a check in
 * its leading position. An input chip has a remove action, a second button named by `removeLabel`, pressed by pointer,
 * touch or assistive technology and not a Tab stop: an input chip is one stop, and Backspace or Delete on it removes it,
 * which the chip tells assistive technology with `aria-keyshortcuts`. Both fire `remove` — the chip never removes itself
 * (the page does, and moves focus). With `destructiveRemove` (the attribute `destructive-remove`) the remove action reads
 * as destructive: it looks the same at rest and takes the error color while it is hovered, focused or pressed — a color
 * only, never a change of name, glyph or size. It is off by default. The label is the visible text and the
 * accessible name; the icon (the `icon` slot) and the avatar (the `avatar` slot, input chips only) are decorative.
 *
 * An action chip with `href` is a link and not a button (CHP-33): the shadow root holds an `<a href>` in place
 * of the `<button>`, drawn from the same tokens in every state. Enter activates it and Space does not; `click` fires
 * first and cancelling it cancels the navigation. `target="new"` opens a new tab, safely (`noopener`), draws the icon
 * set's `open_in_new` at the chip's inline end and reads `target-label` as the link's description. A filter chip and an
 * input chip take no destination.
 *
 * @tag tanrei-chip
 * @slot icon - The leading icon: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot avatar - The leading image of an input chip (an `<img>`), in place of the icon. Ignored for other kinds.
 * @csspart container - The chip's native button — with `href`, the anchor in its place: its shape, colors, outline and elevation, and every state of the chip.
 * @csspart icon - The box the leading icon is drawn in (hidden from assistive technology).
 * @csspart check - The check a filter chip that is on shows in the leading position (hidden from assistive technology).
 * @csspart avatar - The box that clips the avatar to comp.chip.avatar.shape.
 * @csspart label - The label text.
 * @csspart remove - An input chip's remove action: the native button on its round container, with its own states (the cancel glyph, filled).
 * @fires click - The chip itself was activated by pointer, touch, keyboard or assistive technology. Never fired by the remove action. A link chip fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 * @fires {CustomEvent<TanreiChipChangeDetail>} change - A filter chip was activated; fired after its `click`, as a native checkbox does. `detail.selected` (and the element's `selected`) is the new value.
 * @fires remove - The user asked to remove an input chip, with its remove action or with Backspace or Delete. The chip stays until the page removes it.
 */
export class TanreiChip extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'chip');
  static override styles = [styles, hiddenHost];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /**
   * Its documented parts, once: what an element composed of it exports (src/primitives/composed.ts, W4).
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'icon', 'check', 'avatar', 'label', 'remove'];

  static override properties: PropertyDeclarations = {
    kind: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    removeLabel: { type: String, attribute: 'remove-label', reflect: true },
    destructiveRemove: { type: Boolean, attribute: 'destructive-remove', reflect: true },
    removable: {
      type: Boolean,
      attribute: 'not-removable',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    hasIcon: { state: true },
    hasAvatar: { state: true },
  };

  /** What the chip does: action (a button), filter (on or off) or input (an entered item the user can remove). Kind decides the role and the parts, not the look. */
  kind: TanreiChipKind = 'action';

  /** Look: outlined sits flat on a plain surface; elevated is raised for chips over media or a busy background. */
  variant: TanreiChipVariant = 'outlined';

  /** Visual height (small 24 / medium 32 in the default system). The hit area always meets the minimum target. */
  size: TanreiChipSize = 'medium';

  /** Whether a filter chip is on. Ignored unless `kind` is filter. */
  selected = false;

  /** Prevents interaction and removes the chip, and its remove action, from the focus order. */
  disabled = false;

  /** The visible text and the accessible name. */
  label = '';

  /** The accessible name of an input chip's remove action; it should name the item ("Remove Ada Lovelace"). Required when `kind` is input. */
  removeLabel = '';

  /**
   * Whether an input chip's remove action reads as destructive: the same at rest, the error color while hovered,
   * keyboard-focused or pressed. Set `destructive-remove` where removing loses something that cannot be put back in a
   * step (an attachment, a recipient already invited); leave it off where the person can put the item back in one step
   * (an applied filter, a search term). Color only: the name, glyph, size and behaviour are the same either way. Ignored
   * unless `kind` is input.
   */
  destructiveRemove = false;

  /**
   * Whether an input chip draws its remove action. Set `not-removable` for an entry that cannot be taken away now (a
   * read-only field's): no remove action is drawn, so none stands there doing nothing, none is a stop, Backspace and
   * Delete ask for nothing, and the chip is padded as one without a remove action (CHP-38). Ignored unless `kind` is input.
   */
  removable = true;

  /**
   * The destination of an action chip: a URL, a path or a fragment. Not empty, the chip is a link and not a button
   * (CHP-33): the link role, an `<a href>` in the shadow root, activated by Enter and not by Space, drawn exactly as the
   * action chip it would otherwise be. Ignored unless `kind` is action; white space is no destination, and a
   * `javascript:` address or one that cannot be read is refused and reported in debug builds (CHP-37).
   */
  href = '';

  /**
   * Where the destination opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the chip marks
   * with the glyph `open_in_new` after its label and says through `targetLabel` (CHP-35). HTML's `_self` and `_blank`
   * are read as those two; anything else is `same` and reported. Ignored without `href`.
   */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads after the link's name while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `target="new"` adds `noopener` to it. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own). Ignored without `href`. */
  download: string | null = null;

  /** Whether the icon slot has content. */
  protected hasIcon = false;

  /** Whether the avatar slot has content. */
  protected hasAvatar = false;

  /** CHP-7: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'chip', behavior: 'CHP-7', axes: AXES });

  /**
   * CHP-30: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark. The check and the remove glyph
   * the chip draws itself are not named to the controller: they are never mirrored. CHP-35: the mark of a link that
   * opens a new context is named — the icon set mirrors `open_in_new`.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.mark' });

  /**
   * CHP-33 … CHP-37: the link an action chip is while it has a destination, what its anchor carries, and what a debug
   * build is told (src/primitives/link.ts). A filter chip holds a state and an input chip a second action:
   * neither takes one (CHP-37).
   */
  private readonly link = new LinkController(this, {
    ids: { refused: 'CHP-37', newContext: 'CHP-35' },
    disabled: () => this.disabled,
    holds: () => (this.effectiveKind === 'action' ? null : this.effectiveKind === 'filter' ? 'a filter chip' : 'an input chip'),
  });

  /**
   * CHP-8 / CHP-9: the chip's pressed state, press-hold and the answer the system chooses (src/primitives/press.ts).
   * CHP-34: a link chip is pressed by Enter alone; Space is the browser's.
   */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot.querySelector('.label'),
    disabled: () => this.disabled,
    keys: () => this.link.pressKeys,
  });

  /**
   * CHP-20: the remove action's own press, within its round container; a press in its hit area outside the round
   * container grows the ripple from the container's center (src/primitives/selection.ts).
   */
  private readonly removePress = new PressController(this, {
    container: () => this.removeButton,
    holdCarrier: () => this.renderRoot.querySelector('.remove .hold'),
    disabled: () => this.disabled || !this.removes,
    origin: selectionRippleOrigin(() => this.removeButton),
  });

  /** The chip's native button, or the anchor of its link form: the one styled part (CHP-33). */
  private get container() {
    return this.renderRoot.querySelector<HTMLElement>('.container');
  }

  private get removeButton() {
    return this.renderRoot.querySelector<HTMLButtonElement>('.remove');
  }

  /** A kind the chip does not know is drawn and behaves as an action chip. */
  private get effectiveKind(): TanreiChipKind {
    return KINDS.includes(this.kind) ? this.kind : 'action';
  }

  /** CHP-18, CHP-38: an input chip has its remove action unless it is not removable. */
  private get removes() {
    return this.effectiveKind === 'input' && this.removable;
  }

  /** CHP-11: selected counts only on a filter chip. */
  private get on() {
    return this.effectiveKind === 'filter' && this.selected;
  }

  constructor() {
    super();
    // A disabled native button already swallows its own clicks; this also covers clicks that land on the host
    // (a click event dispatched on it), so CHP-2 holds.
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
    this.addEventListener('mousedown', this.onMouseDown);
  }

  /**
   * CHP-39: a press anywhere on an input chip but its remove action never gives the remove action focus. An engine that
   * gives a pressed `<button>` no focus (Safari on macOS) hands the press on to the host's focus delegate: the first
   * element of the shadow root that a click focuses, which is one with a tabindex (HTML, "click focusable") — the remove
   * action, not the chip's own button. So for that press the remove action has no tabindex: there the press focuses
   * nothing in the chip, as on an action chip, and elsewhere the chip's own button, as before. The tabindex is back
   * once the press has placed focus — in the next task, or at the next key or press if it comes first: a busy engine
   * runs input before timers, and Tab moves focus in its keydown — so the Tab order (CHP-23) is as it was. Focus moved
   * to the remove action by assistive technology or by script needs no tabindex. It is the mouse event, not the
   * pointer's, that focuses: a touch's compatibility `mousedown` comes after the touch has ended.
   */
  private readonly onMouseDown = (event: MouseEvent) => {
    this.restoreRemoveStop?.();
    const remove = this.removeButton;
    if (!remove || !this.removes || event.composedPath().includes(remove)) return;
    remove.removeAttribute('tabindex');
    const restore = () => {
      if (this.restoreRemoveStop !== restore) return;
      this.restoreRemoveStop = null;
      window.removeEventListener('keydown', restore, true);
      remove.setAttribute('tabindex', '-1');
    };
    this.restoreRemoveStop = restore;
    window.addEventListener('keydown', restore, true);
    setTimeout(restore);
  };

  /** CHP-39: puts the remove action's tabindex back after a press elsewhere on the chip took it away; null when it is there. */
  private restoreRemoveStop: (() => void) | null = null;

  /** `element.click()` activates the chip as a person would — through its native button, or its anchor, so a link is followed — and does nothing while disabled. */
  override click() {
    const container = this.container;
    if (container) container.click();
    else if (!this.disabled) super.click();
  }

  /** CHP-10: where style queries are missing, the focus style is read when focus arrives. */
  private onFocus(event: FocusEvent) {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  }

  /**
   * CHP-11: a filter chip switches its own `selected`, then fires `click`, then `change` — the order and timing of a
   * native checkbox's: the state has already switched when `click` listeners run, and `change` follows once the click
   * has finished its way through the page. Its last stop is the window, so `change` is fired from a listener added
   * there for this click; a listener that stops the click on its way still gets its `change`, in the next task.
   */
  private onClick() {
    if (this.effectiveKind !== 'filter' || this.disabled) return;
    this.selected = !this.selected;
    const detail = { selected: this.selected };
    afterClick(() => this.dispatchEvent(new CustomEvent<TanreiChipChangeDetail>('change', { bubbles: true, detail })));
  }

  /** CHP-19: Backspace or Delete on a focused input chip asks for its removal, once per press. */
  private onKeyDown(event: KeyboardEvent) {
    this.press.onKeyDown(event);
    if (!this.removes || this.disabled || event.repeat) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.requestRemove();
    }
  }

  /**
   * CHP-18: the remove action fires `remove`, never `click`: its native click stops at the remove button, inside the
   * shadow root, so it never reaches the element's listeners.
   */
  private onRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled || !this.removes) return;
    this.requestRemove();
  }

  /** CHP-22: the chip asks; the page removes it and moves focus. */
  private requestRemove() {
    this.dispatchEvent(new Event('remove', { bubbles: true }));
  }

  private onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  private onAvatarSlotChange(event: Event) {
    this.hasAvatar = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the right leading element: the light-DOM children are there before the slots say so.
    if (!this.hasUpdated) {
      const slots = [...this.children].map((child) => child.slot);
      this.hasIcon = slots.includes('icon');
      this.hasAvatar = slots.includes('avatar');
      return;
    }
    // CHP-13: a change of condition takes the selection motion.
    if (changed.has('selected') || changed.has('kind')) markConditionChange(this.renderRoot.querySelector('.root'));
  }

  protected override updated(changed: PropertyValues) {
    // CHP-7: a kind this spec does not have is an action chip.
    if (changed.has('kind') && !KINDS.includes(this.kind)) {
      report(this, 'CHP-7', `kind "${this.kind}" is not a kind of chip; it is drawn and behaves as "action"`);
    }
    // CHP-26: the label is the name, and an input chip's remove action is named by removeLabel. It still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label) report(this, 'CHP-26', 'label is empty, so the chip has no accessible name; give it a label');
    if ((changed.has('removeLabel') || changed.has('kind') || changed.has('removable')) && this.removes && !this.removeLabel) {
      report(this, 'CHP-26', 'removeLabel is empty, so the remove action has no accessible name; give it one that names the item');
    }
    // CHP-15: only an input chip draws an avatar.
    if ((changed.has('hasAvatar') || changed.has('kind')) && this.hasAvatar && this.effectiveKind !== 'input') {
      report(this, 'CHP-15', `an avatar is given to a ${this.effectiveKind} chip, which ignores it; only an input chip draws one`);
    }
  }

  protected override render() {
    const kind = this.effectiveKind;
    const avatar = kind === 'input' && this.hasAvatar;
    const checked = this.on;
    // The chip is a native <button> (role, focus, Enter / Space, disabled); a filter chip's is a toggle (aria-pressed).
    // An input chip's remove action is a second, sibling <button>: nested buttons are not allowed, and a sibling's hover,
    // focus and press stay its own (CHP-20). It is out of the Tab order (CHP-18): the keyboard removes through the chip's
    // own button, Backspace or Delete (CHP-19), and the chip's button says so with aria-keyshortcuts.
    // CHP-33: an action chip with a destination is an anchor in the button's place — the same classes, part and
    // listeners — whose attributes are the link primitive's; a disabled one is the anchor without `href` (CHP-36).
    const link = this.link.form;
    const tag = link ? literal`a` : literal`button`;
    return html`
      <span
        class="root ${classMap({
          'has-lead': avatar || this.hasIcon || checked,
          'lead-avatar': avatar,
          checked,
          input: this.removes,
          destructive: this.removes && this.destructiveRemove,
          'link-new': !!link?.opensNew,
        })}"
      >
        <${tag}
          part="container"
          class="container"
          type=${link ? nothing : 'button'}
          data-tanrei-shape
          ${linkAttributes(link)}
          aria-description=${this.link.describe() ?? nothing}
          aria-pressed=${kind === 'filter' ? String(this.selected) : nothing}
          aria-keyshortcuts=${this.removes && !this.disabled ? 'Delete Backspace' : nothing}
          ?disabled=${!link && this.disabled}
          @click=${this.onClick}
          @pointerdown=${this.press.onPointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @pointerleave=${this.press.release}
          @keydown=${this.onKeyDown}
          @keyup=${this.press.onKeyUp}
          @blur=${this.press.onBlur}
          @focus=${this.onFocus}
        >
          <span class="lead" aria-hidden="true">
            <span class="lead-clip">
              <span class="lead-item">
                <span part="avatar" class="avatar" data-tanrei-shape><slot name="avatar" @slotchange=${this.onAvatarSlotChange}></slot></span>
                <span class="glyphs">
                  <span part="icon" class="glyph icon"><slot name="icon" @slotchange=${this.onIconSlotChange}></slot></span>
                  <span part="check" class="glyph check">${CHECK_GLYPH}</span>
                </span>
              </span>
            </span>
          </span>
          <span part="label" class="label" dir=${ownDirection(this.label)}>${this.label}</span>
          <span class="trail" aria-hidden="true">${link?.opensNew ? html`<span class="glyph mark">${LINK_MARK}</span>` : nothing}</span>
        </${tag}>
        <button
          part="remove"
          class="remove"
          type="button"
          data-tanrei-shape
          tabindex="-1"
          aria-label=${this.removeLabel || nothing}
          ?disabled=${this.disabled}
          ?hidden=${!this.removes}
          @click=${this.onRemoveClick}
          @pointerdown=${this.removePress.onPointerDown}
          @pointerup=${this.removePress.release}
          @pointercancel=${this.removePress.release}
          @pointerleave=${this.removePress.release}
          @keydown=${this.removePress.onKeyDown}
          @keyup=${this.removePress.onKeyUp}
          @blur=${this.removePress.onBlur}
          @focus=${this.onFocus}
        >
          <span class="glyph" aria-hidden="true">${REMOVE_GLYPH}</span><span class="hold"></span>
        </button>
      </span>
    `;
  }
}

// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiChip);
if (!customElements.get('tanrei-chip')) customElements.define('tanrei-chip', TanreiChip);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-chip': TanreiChip;
  }
}
