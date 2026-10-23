import { type PropertyDeclarations, type PropertyValues, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward, fieldDelegatesAria } from '../../primitives/composed.js';
import { delegatedAria } from '../../primitives/delegated-aria.js';
import type { FormEntry } from '../../primitives/form-says.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { report } from '../../primitives/report.js';
import { TanreiField, type TanreiFieldRequiredMark } from '../field/field.js';
import { TanreiSlider, type TanreiSliderChangeDetail, type TanreiSliderSize, type TanreiSliderValueIndicator } from '../slider/slider.js';

// The members' own types are the slider field's: it has no detail type and no type for a prop of its own.
export type { TanreiFieldRequiredMark, TanreiSliderChangeDetail, TanreiSliderSize, TanreiSliderValueIndicator };

/** SLF-2: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'] as const;
/**
 * SLF-2: the props that are the Slider's, and the product's function for a value's words (SLD-18). `endLabel` is the
 * Slider's `label` and is given in the template. The Slider's own `disabled` and `orientation` are never set.
 */
const SLIDER = ['value', 'startValue', 'range', 'min', 'max', 'step', 'origin', 'stops', 'size', 'valueIndicator', 'valueText', 'startValueText', 'startLabel', 'formatValue'] as const;

/**
 * W4: each member's documented parts, from the member's own list. No name is shared by the two. The Field's `counter`
 * is left out: a slider field gives its Field no count, so the part is never drawn in it.
 */
const FIELD_PARTS = exported(TanreiField, {}, ['counter']);
const SLIDER_PARTS = exported(TanreiSlider);

/**
 * SLF-3: each of a range's two value texts is a run of its own direction — a first-strong isolate (U+2068 … U+2069),
 * which is what `<bdi>` is in a text: the Field's value text is one string. A run that is a plain number is one
 * left-to-right run in a paragraph of either direction already — digits, with a separator or a sign between two of
 * them and a currency or percent sign against them, which the bidirectional algorithm resolves to the digits' own
 * class (UAX #9, W4 and W5) — and is written as it is: isolating it would change nothing of its order, and the text
 * is then, character for character, what a product writes by hand ("$100 – $300"). An en dash with a space on each
 * side stands between the two.
 */
const PLAIN_NUMBER = /^[\p{Sc}#%]*[0-9]+(?:[.,:/+\-\u00a0\u202f][0-9]+)*[\p{Sc}#%]*$/u;
const isolated = (text: string) => (PLAIN_NUMBER.test(text) ? text : `\u2068${text}\u2069`);
const BETWEEN = ' – ';

/**
 * Lets people choose a value, or a range of values, on a scale as one complete field. Built from a Field
 * (`<tanrei-field>`) and the Slider (`<tanrei-slider>`) it frames: the track under the Field's label, with the value
 * in words at the end of the label row, the Field's help and its error, tied together for assistive technology and
 * taking part in a form as one control.
 *
 * Contract: specs/slider-field.spec.json. `<tanrei-slider-field name="text-size" label="Text size"
 * supporting-text="Applies to every page." min="50" max="200" step="10" value="120"></tanrei-slider-field>`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*` and `--tanrei-comp-slider-*`
 * value reaches the members by inheritance, and one slider field is set apart by setting such a property on this
 * element. Each property is its member's, set on that member unchanged: `label`, `label-hidden`, `supporting-text`,
 * `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text` and `optional-text` are the
 * Field's, every other one the Slider's — `end-label` is the Slider's `label`, the name of a range's end handle,
 * because `label` is the visible name here. It has no orientation: the track runs along the line. One level down, the
 * same by hand: `<tanrei-field label="Text size" value-text="120"><tanrei-slider name="text-size" min="50" max="200"
 * step="10" value="120"></tanrei-slider></tanrei-field>`, with the product writing the Field's `value-text` at each
 * `input` (`field.valueText = slider.shownValueText`).
 *
 * That is the one thing it does that the pair by hand does not: unless `value-hidden` is set it gives its Field, as
 * the value text at the end of the label row, the words its Slider gives each handle — `value-text` (and
 * `start-value-text`), or what `formatValue` writes, or the number in the page's locale — at every change, a range's
 * two in reading order with an en dash between. `formatValue` is a property, never an attribute: a function the
 * product gives once, from a value to its words (`field.formatValue = (value) => percent.format(value / 100)`). It
 * writes no number, unit or word itself.
 *
 * It is a block as wide as its place, and its track fills it: give it a narrower place for a shorter track.
 *
 * `value` and `startValue` are at every moment the Slider's, and the two events are that Slider's own, with this
 * element as their target: `event.target.value` is the new value in every listener. It dispatches none itself.
 *
 * Form-associated: it submits the value under `name` — a range the start value and then the value, under the one name;
 * nothing while disabled —, resets to its `value` and `start-value` attributes, is restored on navigation and follows a
 * disabled `<fieldset>`.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the handle — a range's start handle — and its
 * name is `label` (with `label-hidden` where it is not drawn), never `aria-label`. A range's two handles are named by
 * `start-label` and `end-label`. A press on the label row focuses the handle and changes no value; a press on the
 * help or the error text does nothing.
 *
 * @tag tanrei-slider-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart slider - The control: the `<tanrei-slider>` it is built from.
 * @exportparts tanrei-field -counter
 * @exportparts tanrei-slider
 * @attr {string} form - The id of the form the slider field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-slider
 * @fires change - => tanrei-slider
 */
export class TanreiSliderField extends ComposedControl<number> {
  /** SLF-6: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // SLF-13: no width of its own — as an item of a row too (a product's own flex row), where a block's least width
  // would be its content's: the row decides, and the track fills what it is given.
  static override styles = [
    composedHost,
    hiddenHost,
    css`
      :host {
        min-inline-size: 0;
      }
    `,
  ];

  /**
   * Its parts, once: the two members and what each exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['field', 'slider', ...FIELD_PARTS.names, ...SLIDER_PARTS.names];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    errorText: { type: String, attribute: 'error-text' },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    optional: { type: Boolean, reflect: true },
    requiredMark: { type: String, attribute: 'required-mark', reflect: true },
    requiredText: { type: String, attribute: 'required-text' },
    optionalText: { type: String, attribute: 'optional-text' },
    value: { type: Number },
    startValue: { type: Number, attribute: 'start-value' },
    range: { type: Boolean, reflect: true },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    origin: { type: Number },
    stops: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    valueIndicator: { type: String, attribute: 'value-indicator', reflect: true },
    valueText: { type: String, attribute: 'value-text' },
    startValueText: { type: String, attribute: 'start-value-text' },
    startLabel: { type: String, attribute: 'start-label' },
    endLabel: { type: String, attribute: 'end-label' },
    formatValue: { attribute: false },
    valueHidden: { type: Boolean, attribute: 'value-hidden', reflect: true },
  };

  /** @from tanrei-field.label */
  label = '';

  /** @from tanrei-field.labelHidden */
  labelHidden = false;

  /** @from tanrei-field.supportingText */
  supportingText = '';

  /** @from tanrei-field.errorText */
  errorText = '';

  /** @from tanrei-field.error */
  error = false;

  /** @from tanrei-field.disabled */
  disabled = false;

  /** @from tanrei-field.required */
  required = false;

  /** @from tanrei-field.optional */
  optional = false;

  /** @from tanrei-field.requiredMark */
  requiredMark: TanreiFieldRequiredMark = 'auto';

  /** @from tanrei-field.requiredText */
  requiredText = '';

  /** @from tanrei-field.optionalText */
  optionalText = '';

  /** @from tanrei-slider.value */
  get value(): number {
    return this.memberValue(0);
  }

  set value(value: number) {
    this.giveValue(value);
  }

  /** @from tanrei-slider.startValue */
  get startValue(): number {
    if (this.startPending) return this.startGiven as number;
    return this.slider?.startValue ?? 0;
  }

  set startValue(value: number) {
    const slider = this.slider;
    if (!this.startPending && slider && Object.is(slider.startValue, value)) return;
    this.startGiven = value;
    this.startPending = true;
  }

  /** @from tanrei-slider.range */
  range = false;

  /** @from tanrei-slider.min */
  min = 0;

  /** @from tanrei-slider.max */
  max = 100;

  /** @from tanrei-slider.step */
  step = 0;

  /** @from tanrei-slider.origin */
  origin: number | null = null;

  /** @from tanrei-slider.stops */
  stops = false;

  /** @from tanrei-slider.size */
  size: TanreiSliderSize = 'small';

  /** @from tanrei-slider.valueIndicator */
  valueIndicator: TanreiSliderValueIndicator = 'none';

  /** @from tanrei-slider.valueText */
  valueText = '';

  /** @from tanrei-slider.startValueText */
  startValueText = '';

  /** @from tanrei-slider.startLabel */
  startLabel = '';

  /** @from tanrei-slider.label */
  endLabel = '';

  /** @from tanrei-slider.formatValue */
  formatValue: ((value: number) => string) | null = null;

  /** Does not draw the value at the end of the label row (`value-hidden`). For a slider set by feel, whose number means nothing to the person (a volume, a brightness). The handle still says its value to assistive technology, and `value-indicator` still shows it. */
  valueHidden = false;

  /** W5, for the second value of a range: the start value last set on the element, while the Slider has not taken it. */
  private startGiven: number | undefined;
  private startPending = false;

  private get slider(): TanreiSlider | null {
    return this.renderRoot?.querySelector<TanreiSlider>('tanrei-slider') ?? null;
  }

  protected override get valueMember(): ValueMember<number> | null {
    return this.slider;
  }

  /** W6, item 4: the value a form's reset returns to — the `value` attribute, as a number; 0 without one, as the Slider's. */
  protected override firstValue(): number {
    return this.hasAttribute('value') ? Number(this.getAttribute('value')) : 0;
  }

  /** W6, item 4: a range resets its start value too, to the `start-value` attribute. */
  override formResetCallback() {
    super.formResetCallback();
    this.startValue = this.hasAttribute('start-value') ? Number(this.getAttribute('start-value')) : 0;
  }

  /** W6, item 5: the Slider restores both values; both are then the Slider's. */
  override formStateRestoreCallback(state: FormEntry, mode: 'restore' | 'autocomplete') {
    super.formStateRestoreCallback(state, mode);
    if (!this.slider) return;
    this.startPending = false;
    this.startGiven = undefined;
  }

  /**
   * SLF-3, SLF-4 (`fills`: `field.valueText`): the Field is given the words the Slider gives each handle, as the Slider
   * writes them — after each of the Slider's updates, and after each of this element's own. A range's two are each a
   * run of its own direction (`isolated()`), in reading order, with an en dash between. Nothing while `valueHidden` is
   * set. No number, unit or word is written here.
   */
  private fill() {
    const field = this.renderRoot?.querySelector<TanreiField>('tanrei-field');
    const slider = this.slider;
    if (!field || !slider) return;
    const text = this.valueHidden ? '' : slider.range ? `${isolated(slider.shownStartValueText)}${BETWEEN}${isolated(slider.shownValueText)}` : slider.shownValueText;
    if (field.valueText !== text) field.valueText = text;
  }

  protected override memberUpdated() {
    this.fill();
  }

  protected override updated(changed: PropertyValues) {
    // W5: the render that has just ended gave the Slider the start value that was set; from here it is the Slider's.
    this.startPending = false;
    this.startGiven = undefined;
    super.updated(changed);
    this.fill();
    // SLF-5: a range's end handle with no name of its own is named by `label`, as the start handle is (which the
    // Slider reports itself, SLD-19); a debug build says so.
    if ((changed.has('range') || changed.has('endLabel')) && this.range && !this.endLabel.trim()) {
      report(this, 'SLF-5', 'endLabel is empty, so the range’s end handle has no name of its own and is named by label, as the other handle may be; give it an end-label that holds the words of label');
    }
  }

  // SLF-1, SLF-2: a Field whose one control is a Slider, exactly as a product writes the two — and nothing else but
  // the passage of the Field's label glyph. No text stands between the tags: the Field's control is its one child
  // without a slot. The Slider carries the element's `name` because a range's two entries are said under it (W6, item
  // 2); it stands in a shadow root, outside every form, and submits nothing itself.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-slider part="slider" exportparts=${SLIDER_PARTS.attribute} ${delegatedAria(this, {})} ${forward(this, SLIDER)} .label=${this.range ? this.endLabel : ''} .name=${this.name}></tanrei-slider
    ></tanrei-field>`;
  }
}

// SLF-14: the product's ARIA on the host is its control's (src/primitives/delegated-aria.ts), but for its name, which is label (SLF-5).
fieldDelegatesAria(TanreiSliderField, TanreiSlider, 'SLF-14');
if (!customElements.get('tanrei-slider-field')) customElements.define('tanrei-slider-field', TanreiSliderField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-slider-field': TanreiSliderField;
  }
}
