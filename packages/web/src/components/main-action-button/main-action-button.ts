import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AvailabilityController, GlyphMirrorController, OpenAxesController, PressController, report, delegatedAria, delegatesAria, syncFocusStyle } from '../../primitives/index.js';
import type { TanreiMainActionButtonSizeRegistry, TanreiMainActionButtonVariantRegistry } from '../../registry.js';
import { AXES, styles } from './main-action-button.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (filled, tonal, surface), plus any a design system's generated `.d.ts` registers. */
export type TanreiMainActionButtonVariant = keyof TanreiMainActionButtonVariantRegistry;
/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiMainActionButtonSize = keyof TanreiMainActionButtonSizeRegistry;
/** The side of the label the icon is on, in the reading direction. */
export type TanreiMainActionButtonIconPosition = 'leading' | 'trailing';

/**
 * MAB-13, MAB-15, MAB-16, MAB-24: the form it draws. No label: collapsed, whatever else; no icon, or full width:
 * extended; otherwise as asked.
 */
const isCollapsed = (extended: boolean, hasIcon: boolean, label: string, fullWidth = false) => !label || (!extended && hasIcon && !fullWidth);

/**
 * Performs the single most important action of a screen on a raised container that floats above the content, showing
 * its icon and its written name (extended), or collapsing to its icon alone.
 *
 * Contract: specs/main-action-button.spec.json. Every visual value comes from `--tanrei-comp-main-action-button-*`
 * tokens, one set per variant and state — the container color, the label color (the icon's too) and the elevation: how
 * a state looks is the active design system's decision, not this component's. How a press is answered and how keyboard
 * focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`), and how far its corners ease is
 * the system's amount (`--tanrei-sys-shape-corner-smoothing`); all are read from the cascade, so they follow
 * `data-tanrei-system`.
 *
 * `label` is the visible text while extended and the accessible name in either form. The icon is the `icon` slot: a
 * glyph of the system's icon set, given as its ligature text (`<span slot="icon">edit</span>`), drawn in the label color
 * at the size's icon size, on the side `iconPosition` names. `extended = false` (the `collapsed` attribute) collapses the
 * button to a square holding only the icon, over the resize motion. Without an icon it stays extended; without a label
 * it never extends (both reported in debug builds). It is an action, never a toggle: it has no pressed, selected or
 * expanded state, and collapsing changes no role, name or focus.
 *
 * The element does not position itself (MAB-18): it is inline, at its own size, and the page places it; which edge stays
 * put while it collapses is the layout's decision too (an element anchored at the inline end collapses toward it).
 *
 * @tag tanrei-main-action-button
 * @slot icon - The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. Required to collapse. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The native button: the raised shape that carries every state and casts the elevation.
 * @csspart icon - The box the icon is drawn in (hidden from assistive technology).
 * @csspart label - The label text.
 * @fires click - The button was activated by pointer, touch, keyboard or assistive technology.
 */
export class TanreiMainActionButton extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'main-action-button');
  static override styles = [styles, hiddenHost];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    // An HTML boolean attribute cannot default to true: the attribute is the inverse, `collapsed` (the spec's web notes).
    extended: {
      attribute: 'collapsed',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    iconPosition: { type: String, attribute: 'icon-position', reflect: true },
    fullWidth: { type: Boolean, attribute: 'full-width', reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    hasIcon: { state: true },
    resizing: { state: true },
  };

  /** Emphasis: filled is the screen's main action at full strength; tonal is quieter; surface keeps the container neutral over colored content (a map, a photo). */
  variant: TanreiMainActionButtonVariant = 'filled';

  /** Visual height (small 40 / medium 48 / large 64 in the default system), which is also the side of the collapsed form. The hit area always meets the minimum target. */
  size: TanreiMainActionButtonSize = 'medium';

  /** Shows the label beside the icon. False (the `collapsed` attribute) collapses the button to its icon; the label stays the accessible name. Not a toggle. */
  extended = true;

  /**
   * Takes the whole width its container gives it, its icon and label centred (the `full-width` attribute, MAB-24): the
   * one action of a screen held across its foot on a narrow screen. A full-width button is always drawn extended, so
   * `extended` is ignored while it is set (reported in debug builds).
   */
  fullWidth = false;

  /** The side of the label the icon is on, in the reading direction (the `icon-position` attribute). Collapsed, the icon is centered either way. */
  iconPosition: TanreiMainActionButtonIconPosition = 'leading';

  /** Prevents interaction and removes the button from the focus order. Hiding it when its action is unavailable is usually better. */
  disabled = false;

  /** The visible text while extended, and the accessible name in either form. Required: an icon alone is not a name. */
  label = '';

  /** Whether the icon slot has content: the icon selects its side's padding, and is what it collapses to. */
  protected hasIcon = false;

  /** MAB-14: the width is changing between the two forms; the label keeps one line until it is done. */
  protected resizing = false;

  private resizeTimer: ReturnType<typeof setTimeout> | undefined;

  /** MAB-7: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'main-action-button', behavior: 'MAB-7', axes: AXES });

  /**
   * MAB-22: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]' });

  /** MAB-8 / MAB-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot.querySelector('.label'),
    disabled: () => this.disabled,
  });

  private get container() {
    return this.renderRoot.querySelector('button') as HTMLButtonElement | null;
  }

  private get collapsed() {
    return isCollapsed(this.extended, this.hasIcon, this.label, this.fullWidth);
  }

  constructor() {
    super();
    // A disabled native button already swallows its own clicks; this also covers clicks that land on the host
    // (a click event dispatched on it), so MAB-2 holds.
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

  /** `element.click()` activates the button as a person would — through the native button — and does nothing while disabled. */
  override click() {
    const container = this.container;
    if (container) container.click();
    else if (!this.disabled) super.click();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.resizeTimer);
    this.resizing = false;
  }

  /** MAB-10: where style queries are missing, the focus style is read when focus arrives. */
  #onFocus() {
    syncFocusStyle(this, this.container);
  }

  #onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  /**
   * MAB-14: the resize runs over the label box's transition (comp.main-action-button.motion.resize-duration, 0 where
   * motion is reduced); for that long the label keeps one line.
   */
  private startResize() {
    clearTimeout(this.resizeTimer);
    const box = this.renderRoot.querySelector('.label-box');
    const seconds = box ? Number.parseFloat(getComputedStyle(box).transitionDuration) : 0;
    if (!(seconds > 0)) {
      this.resizing = false;
      return;
    }
    this.resizing = true;
    this.resizeTimer = setTimeout(() => (this.resizing = false), seconds * 1000);
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the right form: the icon's light-DOM element is there before the slot says so
    // (its slotchange comes after the render), so a collapsed element never animates in from extended.
    if (!this.hasUpdated) {
      this.hasIcon = [...this.children].some((child) => child.slot === 'icon');
      return;
    }
    // The form changes when `extended`, the icon or the label changes what it can be.
    if (changed.has('extended') || changed.has('hasIcon') || changed.has('label') || changed.has('fullWidth')) {
      const before = <T>(key: string, now: T) => (changed.has(key) ? (changed.get(key) as T) : now);
      const was = isCollapsed(before('extended', this.extended), before('hasIcon', this.hasIcon), before('label', this.label) ?? '', before('fullWidth', this.fullWidth) ?? false);
      if (was !== this.collapsed) this.startResize();
    }
  }

  protected override updated(changed: PropertyValues) {
    // MAB-16: the label is the name; without one it never extends. It still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label) report(this, 'MAB-16', 'label is empty, so the button has no accessible name and stays collapsed; give it a label');
    // MAB-15: without an icon there is nothing to collapse to — it stays extended, and a debug build says why.
    if ((changed.has('extended') || changed.has('hasIcon') || changed.has('label')) && !this.extended && !this.hasIcon && this.label) {
      report(this, 'MAB-15', 'extended is false but there is no icon, so it cannot collapse; it stays extended — give it an icon');
    }
    // MAB-24: a full-width button does not collapse — it stays extended, and a debug build says why.
    if ((changed.has('extended') || changed.has('fullWidth')) && this.fullWidth && !this.extended && this.label) {
      report(this, 'MAB-24', 'extended is false but the button is full width, which does not collapse; it stays extended — take off full-width to collapse it');
    }
  }

  protected override render() {
    // The native <button> supplies role, focusability, Enter/Space activation and the disabled state, so assistive
    // technology and test tools see real semantics. The label is its content — its name in either form (MAB-13) — and
    // nothing here changes with the form but what is drawn: no aria-expanded, no aria-pressed, no live region (MAB-20).
    const side = this.iconPosition === 'trailing' ? 'trailing' : 'leading';
    return html`
      <button
        part="container"
        type="button"
        data-tanrei-shape
        class=${classMap({ [side]: this.hasIcon, collapsed: this.collapsed, 'full-width': this.fullWidth && !this.collapsed })}
        ?data-resizing=${this.resizing}
        ${delegatedAria(this, {})}
        ?disabled=${this.disabled}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.press.onKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.press.onBlur}
        @focus=${this.#onFocus}
      >
        <span class="content">
          <span class="icon-box"><span part="icon" class="icon" aria-hidden="true"><slot name="icon" @slotchange=${this.#onIconSlotChange}></slot></span></span>
          <span class="label-box"><span class="label-clip"><span part="label" class="label">${this.label}</span></span></span>
        </span>
      </button>
    `;
  }
}

// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiMainActionButton);
// The product's ARIA on the host is the native element's; the disabled state is its own.
delegatesAria(TanreiMainActionButton, { owns: ['aria-disabled'] });
if (!customElements.get('tanrei-main-action-button')) customElements.define('tanrei-main-action-button', TanreiMainActionButton);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-main-action-button': TanreiMainActionButton;
  }
}
