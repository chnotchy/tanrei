import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, FocusedStop, GlyphMirrorController, OpenAxesController, PressController, disabledWaitsWhileFocused, namedByProduct, report, syncFocusStyle } from '../../primitives/index.js';
import { FormDisabledController } from '../../primitives/form-disabled.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiElement } from '../../primitives/element.js';
import { AXES, styles } from './rating.styles.js';

/** The core sizes (small, medium, large), plus any a design system adds. */
export type TanreiRatingSize = 'small' | 'medium' | 'large' | (string & {});

/** What `change` carries: the new score. */
export interface TanreiRatingChangeDetail {
  value: number;
}

/** What `preview` carries: the score a fine pointer would give, or `null` when it leaves the rating. */
export interface TanreiRatingPreviewDetail {
  value: number | null;
}

/** RAT-1: the glyph of the system's icon set every mark draws while `icon` is empty. */
const STAR_GLYPH = 'star';

/** RAT-3, RAT-4: a radio group suits up to this many choices of whole marks (WAI-ARIA APG); with more, a slider. */
const MOST_RADIOS = 7;

/** RAT-3: the arrow keys and the mark each moves to in a left-to-right layout. */
const RADIO_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** What the rating is to assistive technology (RAT-3, RAT-4, RAT-5). */
type Mode = 'radio' | 'slider' | 'img';

/** The `option-labels` attribute: a JSON array of strings; anything else is none. */
function parseLabels(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
}

/**
 * Lets a person give a score out of a few marks — stars by default — or shows a score already given, a whole mark or,
 * where the product allows it, a half mark at a time.
 *
 * Contract: specs/rating.spec.json. Every visual value comes from `--tanrei-comp-rating-*` tokens: per size the mark's
 * glyph box and the round container behind it, and per condition (unselected, selected) and state the container and
 * mark colors. How a press is answered and how keyboard focus is drawn are the system's choices of kind
 * (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * What it is to assistive technology follows the number of choices (WAI-ARIA APG): whole marks up to seven are a radio
 * group, one radio per mark, with the radio group's keys (arrows check the next or previous mark and wrap, Space checks
 * the focused one); halves, or more than seven marks, are one slider (arrows by one step, Page Up and Page Down by a
 * mark, Home and End); read-only, one image named by `label` and described by `value-text`. Enter submits its form. No
 * input takes a score back to 0: a press on the score already given changes nothing.
 *
 * Form-associated: it submits `value` under `name` while it is above 0, resets to the value it was first given,
 * restores it on navigation and follows a disabled `<fieldset>`.
 *
 * @tag tanrei-rating
 * @csspart row - The row of marks: the radio group, the slider or the image; the slider's focus ring is drawn around it.
 * @csspart container - The round container behind each mark: the state layer, the ripple and a radio's focus ring.
 * @csspart mark - The glyph box of each mark, holding its selected and unselected forms (hidden from assistive technology).
 * @attr {string} form - The id of the form the rating belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element.
 * @fires {CustomEvent<TanreiRatingChangeDetail>} change - The person changed the score, by a press or a key; `detail.value` is the new score, which `value` already holds. Not fired when the product sets `value`.
 * @fires {CustomEvent<TanreiRatingPreviewDetail>} preview - A fine pointer moved onto a mark (`detail.value` is the score it would give) or off the rating (`null`).
 */
export class TanreiRating extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'rating');
  static override styles = [styles, hiddenHost];

  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    value: { type: Number },
    max: { type: Number },
    allowHalf: { type: Boolean, attribute: 'allow-half', reflect: true },
    size: { type: String, reflect: true },
    icon: { type: String },
    label: { type: String },
    optionLabels: { attribute: 'option-labels', converter: { fromAttribute: parseLabels } },
    valueText: { type: String, attribute: 'value-text' },
    readOnly: { type: Boolean, attribute: 'read-only', reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    hovered: { state: true },
    preview: { state: true },
  };

  /** The score: a number of marks from 0 to `max`, whole or — while `allowHalf` — in halves. 0 is no score yet. */
  value = 0;

  /** How many marks are drawn: the highest score. A whole number from 1. */
  max = 5;

  /** Lets a person give a score that ends on a half mark: a press on a mark's inline-start half gives that mark less a half, and the keys move by a half (the `allow-half` attribute). A read-only rating shows halves whatever it says. */
  allowHalf = false;

  /** The size of each mark (20 / 24 / 32) and of the round container behind it (28 / 32 / 40). The hit area always meets the minimum target. A design system may add values. */
  size: TanreiRatingSize = 'medium';

  /** The name of the glyph of one mark in the system's icon set (`favorite`, `thumb_up`); empty draws `star`. A name the icon set mirrors in right-to-left is drawn mirrored. */
  icon = '';

  /** Names the rating for assistive technology ("Your rating of this recipe"). Required. Never drawn. */
  label = '';

  /** The name of each score a person can give, from the lowest (one mark, or a half while `allowHalf`): ["Poor", "Fair", …]. Empty names each score by its number in the element's language. The `option-labels` attribute is a JSON array. */
  optionLabels: string[] = [];

  /** How assistive technology reads a read-only rating's score ("4.5 out of 5 stars"), in the product's language (the `value-text` attribute). */
  valueText = '';

  /** Shows a score that cannot be changed — an average, a review's score — as one image with a name: not focusable and not pressable (the `read-only` attribute). */
  readOnly = false;

  /** Shows the rating as unavailable: drawn in the disabled colors, not focusable, taking no input and left out of form submission. */
  disabled = false;

  /** The name the score is submitted under with a form. */
  name = '';

  /** RAT-7: the mark the fine pointer is over, drawn hovered. */
  private hovered: number | null = null;

  /** RAT-7: the score the fine pointer would give, drawn in place of `value` while it is over a mark. */
  private preview: number | null = null;

  private readonly fieldset = new FormDisabledController(this);
  /** A disabled `<fieldset>` around the element, as the platform says it (src/primitives/form-disabled.ts). */
  private get formDisabled(): boolean {
    return this.fieldset.byFieldset;
  }

  private readonly internals = this.attachInternals();

  /** RAT-18: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'rating', behavior: 'RAT-18', axes: AXES });

  /** RAT-16: the glyph is marked when the icon set mirrors its name in right-to-left (src/primitives/glyph-mirror.ts). */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.glyph' });

  /** Disabled under the focus it holds, its stop keeps its `tabindex` for one frame (src/primitives/disabled-while-focused.ts). */
  private readonly stop = new FocusedStop(this);

  /** RAT-9, RAT-10: one press controller per mark, each holding that mark's pressed state and ripple. */
  private readonly presses: PressController[] = [];

  /** The mark a pointer is pressing now. */
  private pressing: number | null = null;

  /** RAT-15: the value it was first given, which a form's reset returns it to. */
  private initialValue: number | null = null;

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** Disabled by its own `disabled` or by a disabled `<fieldset>` around it. */
  private get isDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** RAT-14: `max` as drawn — the whole number below it, at least 1. */
  private get count(): number {
    const max = Math.floor(Number(this.max));
    return Number.isFinite(max) && max >= 1 ? max : 1;
  }

  /** RAT-4, RAT-14: the smallest change of score: a half while `allowHalf`, a whole mark otherwise; a read-only rating shows halves whatever `allowHalf` says. */
  private get step(): number {
    return this.allowHalf || (this.readOnly && !this.isDisabled) ? 0.5 : 1;
  }

  /** RAT-14: `value` as drawn and exposed — clamped to 0…max and to the nearest score it can show. */
  private get score(): number {
    const value = Number(this.value);
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.min(Math.max(value, 0), this.count);
    return Math.min(Math.round(clamped / this.step) * this.step, this.count);
  }

  /** RAT-3, RAT-4, RAT-5: a radio group, a slider or an image. */
  private get mode(): Mode {
    if (this.readOnly && !this.isDisabled) return 'img';
    return this.allowHalf || this.count > MOST_RADIOS ? 'slider' : 'radio';
  }

  /** Whether a person can change the score now. */
  private get interactive(): boolean {
    return !this.isDisabled && !this.readOnly;
  }

  /** RAT-3, RAT-5: a number written as the platform writes it in the language of the element. */
  private numberText(value: number): string {
    return new Intl.NumberFormat(ambientLocale(this)).format(value);
  }

  /** RAT-3, RAT-4: the step between the scores a person can give, which `optionLabels` names one by one. */
  private get givenStep(): number {
    return this.allowHalf ? 0.5 : 1;
  }

  /** RAT-3, RAT-4: the entry of `optionLabels` for a score, if there is one. */
  private entryFor(score: number): string {
    const index = score / this.givenStep - 1;
    if (score <= 0 || !Number.isInteger(index)) return '';
    return this.optionLabels?.[index] ?? '';
  }

  /** RAT-3: a score's name — its entry, or its number. */
  private scoreName(score: number): string {
    return this.entryFor(score) || this.numberText(score);
  }

  /** The press controller of mark `index`. */
  private pressOf(index: number): PressController {
    let press = this.presses[index];
    if (!press) {
      press = new PressController(this, {
        container: () => this.items()[index] ?? null,
        holdCarrier: () => this.items()[index]?.querySelector('.mark') ?? null,
        disabled: () => !this.interactive,
        keys: [' '],
      });
      this.presses[index] = press;
    }
    return press;
  }

  private items(): HTMLElement[] {
    return [...(this.renderRoot?.querySelectorAll<HTMLElement>('.item') ?? [])];
  }

  private get row(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.row') ?? null;
  }

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  /**
   * RAT-6, RAT-8: the score a point gives. The containers touch, so the mark whose centre is nearer a point is the one
   * whose slot of the row holds it — the row is divided at the middle between marks — and a point past either end of the
   * row (the hit area reaches beyond it) belongs to the end mark. While halves are allowed, a point on a mark's
   * inline-start half gives that mark less a half.
   */
  private scoreAt(x: number): number {
    const row = this.row;
    if (!row) return 0;
    const box = row.getBoundingClientRect();
    const count = this.count;
    const each = box.width / count;
    const offset = this.rtl ? box.right - x : x - box.left;
    const index = Math.min(Math.max(Math.floor(offset / each), 0), count - 1);
    const half = this.allowHalf && offset - index * each < each / 2;
    return index + 1 - (half ? 0.5 : 0);
  }

  /** RAT-6: the person gave `score`; nothing happens if it is the score already given. */
  private give(score: number) {
    if (!this.interactive || score === this.score) return;
    this.value = score;
    this.dispatchEvent(new CustomEvent<TanreiRatingChangeDetail>('change', { bubbles: true, detail: { value: score } }));
  }

  /** RAT-7: the score shown while a fine pointer points, and the event that says it. */
  private showPreview(score: number | null) {
    if (score === this.preview) return;
    this.preview = score;
    this.dispatchEvent(new CustomEvent<TanreiRatingPreviewDetail>('preview', { bubbles: true, detail: { value: score } }));
  }

  /** The element that holds the focus stop: the checked radio (or the first), or the slider. */
  private get stopElement(): HTMLElement | null {
    if (this.mode === 'slider') return this.row;
    if (this.mode === 'img') return null;
    const score = this.score;
    return this.items()[score > 0 ? Math.ceil(score) - 1 : 0] ?? null;
  }

  /** `element.focus()` focuses the rating's stop: the checked mark, or the first, or the slider. */
  override focus(options?: FocusOptions) {
    if (!this.hasUpdated) return super.focus(options);
    this.stopElement?.focus(options);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.initialValue === null) this.initialValue = this.value;
  }

  formResetCallback() {
    this.value = this.initialValue ?? 0;
  }

  formStateRestoreCallback(state: string | null) {
    const value = Number(state);
    this.value = Number.isFinite(value) ? value : 0;
  }

  formDisabledCallback() {
    this.fieldset.formDisabledCallback();
  }

  /** The mark an event came from, by its index; `null` from the row itself. */
  private indexOf(event: Event): number | null {
    for (const node of event.composedPath()) {
      if (node === this.row) return null;
      if (node instanceof HTMLElement && node.classList.contains('item')) return Number(node.dataset.index);
    }
    return null;
  }

  /** RAT-7: a fine pointer over the rating draws the score it would give, and hovers that score's mark. */
  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.interactive || event.pointerType === 'touch') return;
    const score = this.scoreAt(event.clientX);
    this.hovered = Math.ceil(score) - 1;
    this.showPreview(score);
  };

  /** RAT-7: the pointer left: the value is drawn again, and preview says null once. */
  private readonly onPointerLeave = (event: PointerEvent) => {
    this.onPointerUp(event);
    this.hovered = null;
    if (this.preview !== null) this.showPreview(null);
  };

  /** RAT-9: a press shows on the mark the point belongs to (RAT-8), without delay. */
  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.interactive || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const index = Math.ceil(this.scoreAt(event.clientX)) - 1;
    this.pressing = index;
    this.pressOf(index).onPointerDown(event);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.pressing === null) return;
    this.presses[this.pressing]?.release(event);
    this.pressing = null;
  };

  /**
   * RAT-6: a press gives the score its point gives (RAT-8). A click with no pointer behind it — assistive technology's,
   * or `click()` on a mark — gives that mark's whole score.
   */
  private readonly onClick = (event: MouseEvent) => {
    if (!this.interactive) return;
    const index = this.indexOf(event);
    const score = event.detail === 0 && index !== null ? index + 1 : this.scoreAt(event.clientX);
    this.give(score);
    // A radio pressed takes focus, as the platform's own does; the slider took it on the press already.
    if (this.mode === 'radio') void this.updateComplete.then(() => this.items()[Math.ceil(score) - 1]?.focus());
  };

  /** RAT-3, RAT-4, RAT-15: the keys of a radio group or of a slider; Enter submits the form. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.interactive || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter') {
      if (event.repeat) return;
      event.preventDefault();
      const form = formOf(this, this.form);
      if (form) pressDefaultButton(form);
      return;
    }
    if (this.mode === 'radio') this.radioKey(event);
    else this.sliderKey(event);
  };

  /** RAT-3: arrows check the next or previous mark, wrapping (Left and Right exchanged in right-to-left); Space checks the focused one. */
  private radioKey(event: KeyboardEvent) {
    const count = this.count;
    const focused = this.indexOf(event) ?? (this.score > 0 ? this.score - 1 : 0);
    if (event.key === ' ') {
      event.preventDefault();
      this.pressOf(focused).onKeyDown(event);
      this.give(focused + 1);
      return;
    }
    const step = RADIO_STEPS[event.key];
    if (!step || event.shiftKey) return;
    event.preventDefault();
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const direction = horizontal && this.rtl ? -step : step;
    const next = (focused + direction + count) % count;
    this.give(next + 1);
    void this.updateComplete.then(() => this.items()[next]?.focus());
  }

  /**
   * RAT-4: Right and Up raise by one step, Left and Down lower by one (Right and Left exchanged in right-to-left), Page Up
   * and Page Down by a whole mark, Home to one step and End to max — never below one step and never above max. From no
   * score, a key that lowers gives none.
   */
  private sliderKey(event: KeyboardEvent) {
    const [step, count, score] = [this.step, this.count, this.score];
    const back = this.rtl ? -1 : 1;
    const moves: Record<string, number> = { ArrowRight: step * back, ArrowLeft: -step * back, ArrowUp: step, ArrowDown: -step, PageUp: 1, PageDown: -1 };
    let next: number;
    if (event.key === 'Home') next = step;
    else if (event.key === 'End') next = count;
    else if (event.key in moves) {
      const move = moves[event.key]!;
      next = score === 0 && move < 0 ? 0 : Math.min(Math.max(score + move, step), count);
    } else return;
    event.preventDefault();
    this.give(next);
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== ' ') return;
    const index = this.indexOf(event);
    if (index !== null) this.presses[index]?.onKeyUp(event);
  };

  /** RAT-11: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement) syncFocusStyle(this, target);
  };

  private readonly onFocusOut = () => {
    for (const press of this.presses) press?.onBlur();
  };

  protected override willUpdate(changed: PropertyValues<this>) {
    // RAT-7: a rating that can no longer be changed draws its value, unhovered.
    if (!this.interactive) {
      this.hovered = null;
      this.preview = null;
    }
    if (changed.has('max') || changed.has('allowHalf')) this.presses.length = Math.min(this.presses.length, this.count);
  }

  protected override updated(changed: PropertyValues<this>) {
    const score = this.score;
    // RAT-15: the score above 0 is submitted under `name`, read-only too; disabled, nothing.
    this.internals.setFormValue(!this.isDisabled && score > 0 ? String(score) : null, String(score));
    // RAT-14: what cannot be shown is drawn and exposed as the nearest that can, and reported.
    if ((changed.has('value') || changed.has('max') || changed.has('allowHalf')) && Number(this.value) !== score) {
      report(this, 'RAT-14', `value ${this.value} is not a score of 0 to ${this.count} in ${this.step < 1 ? 'halves' : 'whole marks'}; it is drawn and exposed as ${score}`);
    }
    if (changed.has('max') && Number(this.max) !== this.count) report(this, 'RAT-14', `max ${this.max} is not a whole number from 1; it is drawn as ${this.count}`);
    // RAT-18: what a debug build says of a rating that still renders.
    if (changed.has('label') && !this.label.trim() && !namedByProduct(this)) report(this, 'RAT-18', 'label is empty, so the rating has no accessible name; give it a label');
    const scores = Math.round(this.count / this.givenStep);
    const entries = this.optionLabels?.length ?? 0;
    if ((changed.has('optionLabels') || changed.has('max') || changed.has('allowHalf')) && entries > 0 && entries !== scores) {
      report(this, 'RAT-18', `optionLabels holds ${entries} entries for ${scores} scores; the scores without an entry are named by their numbers`);
    }
    // RAT-5: a read-only rating with nothing to say.
    if (this.mode === 'img' && !this.valueText && score === 0) report(this, 'RAT-5', 'the read-only rating has neither valueText nor a value above 0, so nothing describes its score; give it valueText');
  }

  protected override render() {
    const mode = this.mode;
    const count = this.count;
    const score = this.score;
    const shown = this.preview ?? score;
    const off = this.isDisabled;
    const interactive = this.interactive;
    const keep = this.stop.keeps(off);
    const focusable = !off || keep;
    const stop = score > 0 ? Math.ceil(score) - 1 : 0;
    const glyph = this.icon || STAR_GLYPH;
    const label = this.label || nothing;

    const marks = Array.from({ length: count }, (_, index) => {
      const fill = Math.min(Math.max(shown - index, 0), 1);
      const radio = mode === 'radio';
      return html`<span
        part="container"
        class="item"
        data-index=${index}
        data-fill=${fill >= 1 ? 'full' : fill > 0 ? 'half' : 'empty'}
        ?data-selected=${fill > 0}
        ?data-hovered=${interactive && this.hovered === index}
        ?data-disabled=${off}
        data-tanrei-shape
        role=${radio ? 'radio' : nothing}
        aria-checked=${radio ? String(score === index + 1) : nothing}
        aria-label=${radio ? this.scoreName(index + 1) : nothing}
        aria-disabled=${radio && off ? 'true' : nothing}
        tabindex=${radio && focusable ? (index === stop ? '0' : '-1') : nothing}
      >
        <span part="mark" class="mark" aria-hidden="true">
          <span class="layer off"><span class="glyph">${glyph}</span></span>
          <span class="layer on"><span class="glyph">${glyph}</span></span>
        </span>
      </span>`;
    });

    if (mode === 'img') {
      const description = this.valueText || (score > 0 ? this.scoreName(score) : '');
      return html`<div part="row" class="row" data-tanrei-shape role="img" aria-label=${label} aria-description=${description || nothing}>${marks}</div>`;
    }
    const slider = mode === 'slider';
    return html`<div
      part="row"
      class="row"
      data-tanrei-shape
      ?data-interactive=${interactive}
      role=${slider ? 'slider' : 'radiogroup'}
      aria-label=${label}
      aria-disabled=${off ? 'true' : nothing}
      aria-valuemin=${slider ? '0' : nothing}
      aria-valuemax=${slider ? String(count) : nothing}
      aria-valuenow=${slider ? String(score) : nothing}
      aria-valuetext=${slider && this.entryFor(score) ? this.entryFor(score) : nothing}
      tabindex=${slider && focusable ? '0' : nothing}
      @pointermove=${this.onPointerMove}
      @pointerleave=${this.onPointerLeave}
      @pointerdown=${this.onPointerDown}
      @pointerup=${this.onPointerUp}
      @pointercancel=${this.onPointerUp}
      @click=${this.onClick}
      @keydown=${this.onKeyDown}
      @keyup=${this.onKeyUp}
      @focusin=${this.onFocusIn}
      @focusout=${this.onFocusOut}
    >
      ${marks}
    </div>`;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiRating);
if (!customElements.get('tanrei-rating')) customElements.define('tanrei-rating', TanreiRating);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-rating': TanreiRating;
  }
}
