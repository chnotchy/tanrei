import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, GlyphMirrorController, OpenAxesController, report } from '../../primitives/index.js';
import type { TanreiTagSizeRegistry, TanreiTagVariantRegistry } from '../../registry.js';
import { AXES, STATUSES, styles } from './tag.styles.js';
import { ownDirection } from '../../styles/product-text.js';

/** The core variants (tonal, outlined, filled), plus any a design system's generated `.d.ts` registers. */
export type TanreiTagVariant = keyof TanreiTagVariantRegistry;
/** The core sizes (small, medium), plus any a design system's generated `.d.ts` registers. */
export type TanreiTagSize = keyof TanreiTagSizeRegistry;
/** What the tag reports, in the snackbar's names. A closed set. */
export type TanreiTagStatus = 'default' | 'info' | 'warning' | 'error' | 'success';

const isStatus = (status: string): status is (typeof STATUSES)[number] => (STATUSES as readonly string[]).includes(status);

/**
 * Names a category or a status with a short static label, quietly, outlined or filled, in the colors of a status where
 * it has one. It is text, never a control.
 *
 * Contract: specs/tag.spec.json. `<tanrei-tag label="Beta"></tanrei-tag>`, with a glyph of the icon set in the `icon`
 * slot (`<span slot="icon">sell</span>`) or a `dot` before the label. Every visual value is a `--tanrei-comp-tag-*`
 * token, one set per variant and status; how far its corners ease is the system's amount
 * (`--tanrei-sys-shape-corner-smoothing`).
 *
 * A tag has no role, no name, no state and no event: its label is read where it sits, as text. It takes no input and no
 * focus, and input over it reaches the element that holds it — a link, a button, a list item — which draws its own
 * states. A label that must be pressed, switched or removed is a chip; one that leads somewhere is a link; a dot or a
 * count on another element is a badge. Inside something disabled — a disabled field's label, a disabled row — `disabled`
 * draws it in its look's disabled colors, so that it fades with what holds it; it changes nothing else.
 *
 * A status changes colors only, and color alone never says it: the label does ("Failed"), or `statusLabel` adds it in
 * words for assistive technology ("Error", read as "Error, 3 builds") without drawing it. An outlined tag with a status
 * always draws the dot, because nothing else in that look shows the status. The glyph and the dot are decorative.
 *
 * The label is one line. It is cut with an ellipsis when the layout gives the tag less room than it needs, and is still
 * read in full; the tag has no hover to show the rest, so give it room. A tag with no label draws nothing.
 *
 * @tag tanrei-tag
 * @slot icon - The leading glyph: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. It takes the dot's place. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The shape that holds the label: its fill, its edge in the outlined look, its corners and paddings.
 * @csspart icon - The box the glyph is drawn in (hidden from assistive technology).
 * @csspart dot - The dot (hidden from assistive technology).
 * @csspart label - The label text.
 */
export class TanreiTag extends LitElement {
  private readonly availability = new AvailabilityController(this, 'tag');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    label: { type: String },
    variant: { type: String, reflect: true },
    status: { type: String, reflect: true },
    statusLabel: { type: String, attribute: 'status-label', reflect: true },
    size: { type: String, reflect: true },
    dot: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    hasIcon: { state: true },
  };

  /** The tag's text: a word or a short phrase ("Beta", "Out of stock"). It is what the tag draws and what assistive technology reads. */
  label = '';

  /** How much the tag weighs: tonal is a quiet fill, outlined has no fill and one hairline, filled is a full fill for the chosen one among its neighbours. */
  variant: TanreiTagVariant = 'tonal';

  /** What the tag reports: default (a category or a neutral state), info, warning, error or success. It changes colors only. */
  status: TanreiTagStatus = 'default';

  /** The status in words ("Error"), read by assistive technology before the label and not drawn. For a tag whose label does not itself say the status. Ignored while `status` is default. */
  statusLabel = '';

  /** Small (20 high, 12 text) follows a field's label, a table cell or a line of body text; medium (24 high, 14 text) stands beside a heading or by itself. */
  size: TanreiTagSize = 'medium';

  /** Draws the dot before the label, in the look's mark color. A glyph in the icon slot takes its place; an outlined tag with a status draws it whatever this says. */
  dot = false;

  /**
   * Draws the tag as part of something disabled — the label of a disabled field, a disabled row of a list — in its
   * look's disabled colors, so that it fades with what it stands in (TAG-21). It changes nothing else: the tag takes no
   * input and no focus whatever this says, and exposes no disabled state of its own, because what assistive technology
   * hears of it, it hears from the element the tag stands in. The component that holds the tag sets it (a field does,
   * for its requirement tag); set it yourself on a tag you place in a disabled element of your own.
   */
  disabled = false;

  /** Whether the icon slot has content. */
  protected hasIcon = false;

  /** TAG-19: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'tag', behavior: 'TAG-19', axes: AXES });

  /**
   * TAG-17: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark. The tag mirrors nothing itself.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]' });

  /** TAG-20: the custom state the styles read to take an empty tag out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /** TAG-20: a label with nothing to read is no label. */
  private get empty(): boolean {
    return !this.label || this.label.trim() === '';
  }

  /** TAG-19: a status this spec does not have is `default`. */
  private get effectiveStatus(): TanreiTagStatus {
    return isStatus(this.status) ? this.status : 'default';
  }

  private onIconSlotChange(event: Event) {
    this.hasIcon = (event.target as HTMLSlotElement).assignedElements().length > 0;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render, and the first one after an empty label (which renders no slot), already draws the right leading
    // element: the light-DOM children are there before the slot says so.
    if (!this.hasUpdated || changed.has('label')) this.hasIcon = [...this.children].some((child) => child.slot === 'icon');
    // TAG-20: no label, no tag.
    try {
      if (this.empty) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty tag is an empty inline box.
    }
  }

  protected override updated(changed: PropertyValues) {
    // TAG-19: a status this spec does not have is drawn as default. (An unknown size or variant is the axes' to report.)
    if (changed.has('status') && this.status !== 'default' && !isStatus(this.status)) {
      report(this, 'TAG-19', `status "${this.status}" is not a status of a tag; it is drawn as "default"`);
    }
    // TAG-20: it still renders nothing; a debug build says what is missing.
    if (changed.has('label') && this.empty) report(this, 'TAG-20', 'label is empty, so the tag draws nothing; a glyph or a dot alone is not a tag');
    if ((changed.has('statusLabel') || changed.has('status')) && this.statusLabel && this.effectiveStatus === 'default') {
      report(this, 'TAG-20', `statusLabel "${this.statusLabel}" is ignored while status is default; give the tag a status, or put the words in its label`);
    }
  }

  protected override render() {
    // TAG-20: nothing is drawn and nothing is exposed.
    if (this.empty) return nothing;
    const status = this.effectiveStatus;
    // TAG-7, TAG-8: the dot where the product asks for it, and always on an outlined tag that has a status; TAG-6: a
    // glyph takes its place.
    const dot = !this.hasIcon && (this.dot || (this.variant === 'outlined' && status !== 'default'));
    // TAG-11: the status in words, then the label — two phrases of one text ("Error, 3 builds"). Not while status is default.
    const spoken = status !== 'default' && this.statusLabel ? this.statusLabel : '';
    // TAG-18: the label is one run of its own direction — `dir="auto"`, the direction of its first strong character —
    // so the BOX that cuts it has that direction and its ellipsis is at the label's own end in every engine
    // (`unicode-bidi: plaintext` alone orders the text, but WebKit then cuts it at the layout's end and Firefox draws no
    // ellipsis). A label with no strong character carries no `dir` (`ownDirection()`): its box keeps the layout's direction
    // and its text is left to right, as `plaintext` lays out a text without a letter.
    // No role, no tabindex, no listener of a pointer or a key (TAG-9): spans of text. The glyph and the dot are hidden.
    return html`
      <span part="container" class="container ${classMap({ 'has-lead': this.hasIcon || dot, 'has-icon': this.hasIcon })}" data-tanrei-shape>
        <span class="row">
          <span class="lead" aria-hidden="true">
            <span part="icon" class="icon"><slot name="icon" @slotchange=${this.onIconSlotChange}></slot></span>
            ${dot ? html`<span part="dot" class="dot"></span>` : nothing}
          </span>
          ${spoken ? html`<span class="status">${spoken}, </span>` : nothing}<span part="label" class="label" dir=${ownDirection(this.label)}>${this.label}</span>
        </span>
      </span>
    `;
  }
}

if (!customElements.get('tanrei-tag')) customElements.define('tanrei-tag', TanreiTag);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tag': TanreiTag;
  }
}
