import { LitElement, type PropertyDeclarations, type PropertyValues, nothing } from 'lit';
import { html, literal } from 'lit/static-html.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AvailabilityController, LinkController, OpenAxesController, PressController, type TanreiLinkTarget, linkAttributes, report, slottedInteractive, syncFocusStyle } from '../../primitives/index.js';
import type { TanreiCardVariantRegistry } from '../../registry.js';
import { AXES, styles } from './card.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (elevated, filled, outlined), plus any a design system's generated `.d.ts` registers. */
export type TanreiCardVariant = keyof TanreiCardVariantRegistry;

/**
 * Sets a group of related content apart from its background, and can be one action that opens what it shows.
 *
 * Contract: specs/card.spec.json. Every visual value comes from `--tanrei-comp-card-*` tokens, one set per variant and
 * state: how a state looks is the active design system's decision, not this component's. How a press is answered and
 * how keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`), and how far its
 * corners ease is the system's amount (`--tanrei-sys-shape-corner-smoothing`), read from the cascade.
 *
 * The content is the default slot: any layout. The card insets it by `comp.card.container.padding` (not with `flush`),
 * clips it to its corners and hands it the variant's content color as the inherited `color`. With `interactive` the
 * whole card is one action with the button role — its content must then hold nothing interactive (reported in debug
 * builds) — and it can be `disabled`, which dims it as a whole. Without `interactive` it has no role (a named group
 * with `label`) and leaves its content's semantics alone.
 *
 * With `href` the whole card is one link — a link card (CRD-19), whether `interactive` is set or not: the
 * shadow root holds an `<a href>` around the slot in place of the element with the button role, drawn as an interactive
 * card is. Enter activates it and Space does not; `click` fires first and cancelling it cancels the navigation.
 * `target="new"` opens a new tab, safely (`noopener`), and reads `target-label` as the link's description; the card
 * draws no mark, because its content is yours — put the icon set's `open_in_new` in it. Its content must hold nothing
 * interactive, as an interactive card's.
 *
 * @tag tanrei-card
 * @slot - The content: any layout of media, text and — only when the card is neither interactive nor a link — actions.
 * @csspart container - The card's shape: its color, elevation, corners and, when interactive or a link, every state and the button or link semantics.
 * @csspart content - The box that insets the content and clips it to the corners.
 * @csspart outline - The outlined variant's edge, drawn above the content.
 * @fires click - An interactive card or a link card was activated by pointer, touch, keyboard or assistive technology. A link card fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 */
export class TanreiCard extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'card');
  static override styles = [styles, hiddenHost];

  // `element.focus()` focuses an interactive card; a card that is not an action has nothing to focus (CRD-11). Only the
  // shadow tree is searched for a delegate, never the slotted content, so a click on a plain card never focuses its content.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    interactive: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    // An HTML boolean attribute cannot default to true: the attribute is the inverse, `flush` (the spec's web notes).
    inset: {
      attribute: 'flush',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    label: { type: String },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
  };

  /** How the card separates from its background: by depth (elevated), by tone (filled) or by an edge (outlined). Pick by the background. */
  variant: TanreiCardVariant = 'outlined';

  /** Makes the whole card one pressable action with the button role (it emits click). Its content must then hold nothing interactive. */
  interactive = false;

  /** Prevents interaction and removes an interactive card or a link card from the focus order. Ignored for a card that is neither. */
  disabled = false;

  /**
   * Insets the content by the card's padding. False (the `flush` attribute) lets content reach the card's edges — a
   * photo on top — and that content pads its own text (`--tanrei-comp-card-container-padding`).
   */
  inset = true;

  /** The accessible name: of the action or the link when interactive or a link card (normally its heading's text), of a named group otherwise. */
  label = '';

  /**
   * The destination: a URL, a path or a fragment. Not empty, the whole card is one link (CRD-19) whether `interactive`
   * is set or not: the link role, one tab stop, an `<a href>` around the content, activated by Enter and not by Space.
   * White space is no destination, and a `javascript:` address or one that cannot be read is refused and reported in
   * debug builds (CRD-23).
   */
  href = '';

  /**
   * Where the destination opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the card says
   * through `targetLabel`; it draws no mark (CRD-21). HTML's `_self` and `_blank` are read as those two; anything else is
   * `same` and reported. Ignored without `href`.
   */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads after the link's name while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `target="new"` adds `noopener` to it. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own). Ignored without `href`. */
  download: string | null = null;

  /** CRD-7: variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'card', behavior: 'CRD-7', axes: AXES });

  /**
   * CRD-19 … CRD-23: the link the card is while it has a destination, what its anchor carries, and what a debug build
   * is told (src/primitives/link.ts).
   */
  private readonly link = new LinkController(this, { ids: { refused: 'CRD-23', newContext: 'CRD-21' }, disabled: () => this.disabled });

  /**
   * CRD-8 / CRD-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). CRD-20: a
   * link card is pressed by Enter alone; Space is the browser's.
   */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot.querySelector('.clip'),
    disabled: () => !this.active,
    keys: () => this.link.pressKeys,
  });

  /** Space activates on key-up, as a native button does, and only when the key went down on the card. */
  private spaceDown = false;

  private get container() {
    return this.renderRoot.querySelector<HTMLElement>('.container');
  }

  /** Whether the card is one pressable thing: an action (`interactive`) or a link (CRD-19). */
  private get pressable() {
    return this.interactive || !!this.link.form;
  }

  /** Whether the card is an action or a link that can be taken now. */
  private get active() {
    return this.pressable && !this.disabled;
  }

  constructor() {
    super();
    // CRD-2, CRD-22: a disabled interactive card or link card swallows every click that reaches it, from its content or
    // dispatched on it.
    this.addEventListener(
      'click',
      (event) => {
        if (this.pressable && this.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  /** `element.click()` activates an interactive card as a person would, and follows a link card; otherwise it does nothing (CRD-2, CRD-11). */
  override click() {
    if (this.active) this.container?.click();
  }

  /** CRD-10: where style queries are missing, the focus style is read when focus arrives. */
  #onFocus() {
    syncFocusStyle(this, this.container);
  }

  /** CRD-1: Enter activates on key-down and Space on key-up, as a native button does. */
  #onKeyDown(event: KeyboardEvent) {
    if (!this.active || event.target !== this.container) return;
    this.press.onKeyDown(event);
    // CRD-20: a link card's keys are the anchor's own — Enter fires its click and follows it, Space scrolls the page.
    if (this.link.form) return;
    if (event.key === 'Enter') {
      if (!event.repeat) this.container?.click();
    } else if (event.key === ' ') {
      // Space would scroll the page.
      event.preventDefault();
      this.spaceDown = true;
    }
  }

  #onKeyUp(event: KeyboardEvent) {
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    if (this.active) this.container?.click();
  }

  #onBlur() {
    // A Space whose key-up arrives somewhere else does not activate, as on a native button.
    this.spaceDown = false;
    this.press.onBlur();
  }

  /** CRD-15: an interactive card's or a link card's content holds nothing interactive; a debug build names what it found, on every slot change. */
  private async inspectContent() {
    if (!this.pressable) return;
    const found = await slottedInteractive(this.renderRoot.querySelector('slot'));
    if (!found) return;
    if (this.link.form) {
      report(this, 'CRD-15', `a link card holds an interactive element (<${found.localName}>), which assistive technology cannot reach and whose press would also follow the card's link; give the card no href and let that element be its link`);
    } else {
      report(this, 'CRD-15', `an interactive card holds an interactive element (<${found.localName}>), which assistive technology cannot reach and whose press would also activate the card; make the card non-interactive and let that element be its action`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // CRD-14: an interactive card or a link card without a label is named by its whole content; a debug build says so.
    if ((changed.has('label') || changed.has('interactive') || changed.has('href')) && this.pressable && !this.label) {
      report(this, 'CRD-14', `${this.link.form ? 'a link' : 'an interactive'} card has no label, so its whole content is its accessible name; give it a label (normally its heading’s text)`);
    }
    if ((changed.has('interactive') || changed.has('href')) && this.hasUpdated) void this.inspectContent();
    if (changed.has('disabled') && this.disabled) this.spaceDown = false;
  }

  protected override render() {
    // An interactive card is a shadow element with the button role (not a <button>, whose content model forbids block
    // content): Enter, Space and the click come from this element. A card that is not interactive has no role of its
    // own — or is a named group — and no press or focus handling at all (CRD-11, CRD-14).
    // CRD-19: a link card is an anchor around the slot instead — HTML allows one around block content that holds nothing
    // interactive — with the same class, parts and listeners; its role, its focusability and its address are the
    // anchor's own, written by the link primitive (a disabled one is the anchor without `href`, CRD-22).
    const link = this.link.form;
    const tag = link ? literal`a` : literal`div`;
    const role = link ? nothing : this.interactive ? 'button' : this.label ? 'group' : nothing;
    return html`
      <${tag}
        part="container"
        class="container"
        data-tanrei-shape
        role=${role}
        ${linkAttributes(link)}
        tabindex=${!link && this.active ? '0' : nothing}
        aria-label=${this.label || nothing}
        aria-description=${this.link.describe() ?? nothing}
        aria-disabled=${!link && this.interactive && this.disabled ? 'true' : nothing}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.#onKeyDown}
        @keyup=${this.#onKeyUp}
        @blur=${this.#onBlur}
        @focus=${this.#onFocus}
      >
        <div part="content" class="clip"><slot @slotchange=${this.inspectContent}></slot></div>
        <span part="outline" class="outline" aria-hidden="true"></span>
      </${tag}>
    `;
  }
}

// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiCard);
if (!customElements.get('tanrei-card')) customElements.define('tanrei-card', TanreiCard);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-card': TanreiCard;
  }
}
