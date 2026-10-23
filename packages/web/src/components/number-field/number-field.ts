import { type PropertyDeclarations, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward, fieldDelegatesAria } from '../../primitives/composed.js';
import { delegatedAria } from '../../primitives/delegated-aria.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiField, type TanreiFieldRequiredMark } from '../field/field.js';
import {
  NUMBER_OR_NULL,
  TanreiNumberInput,
  type TanreiNumberInputAlign,
  type TanreiNumberInputEntryErrorDetail,
  type TanreiNumberInputInputDetail,
  type TanreiNumberInputSize,
  type TanreiNumberInputVariant,
  numberOrNull,
} from '../number-input/number-input.js';

// The members' own types are the number field's: it has no detail type and no type for a prop of its own.
export type {
  TanreiFieldRequiredMark,
  TanreiNumberInputAlign,
  TanreiNumberInputEntryErrorDetail,
  TanreiNumberInputInputDetail,
  TanreiNumberInputSize,
  TanreiNumberInputVariant,
};

/** NUM-47: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'] as const;
/** NUM-47: the nineteen props that are the number input's. Its own `label`, `labelHidden`, `error` and `disabled` are never set. */
const INPUT = [
  'variant',
  'size',
  'value',
  'placeholder',
  'readOnly',
  'min',
  'max',
  'step',
  'noSteppers',
  'incrementLabel',
  'decrementLabel',
  'prefixText',
  'suffixText',
  'valueText',
  'align',
  'minFractionDigits',
  'maxFractionDigits',
  'locale',
  'invalidText',
] as const;

/**
 * W4: each member's documented parts, from the member's own list. Two names are shared — `label` and
 * `requirement-label` — and each is exported with its member's name before it, always, and under the bare name from
 * both: the two are one thing to a person and are never drawn at once. FLD-25 is the sentence that holds it — while
 * its control draws the label itself the Field draws no label row and no requirement tag — and a stacked input draws
 * neither (NMI-7, NMI-8). So `::part(label)` is the drawn label, whichever member draws it. The Field's `counter` is
 * left out: a number input keeps no count, so the part is never drawn in a number field. `stepper` is a `<tanrei-button>`
 * that is a part of the input: it is exported one level at each step, and nothing inside the Button is.
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['counter', 'value-text']);
const INPUT_PARTS = exported(TanreiNumberInput, { label: { as: 'number-input-label', bare: true }, 'requirement-label': { as: 'number-input-requirement-label', bare: true } });

/**
 * Lets people enter a number as one complete field. Built from a Field (`<tanrei-field>`) and the Number input
 * (`<tanrei-number-input>`) it frames: the box — the number, its unit and its two steppers — under the Field's label,
 * or, in the filled and the outlined look, with the label floating in it; with the Field's requirement mark, its help
 * and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Contract: specs/number-field.spec.json. `<tanrei-number-field name="quantity" label="Quantity" min="1" max="99"
 * required supporting-text="Up to 99 per order." increment-label="Increase"
 * decrement-label="Decrease"></tanrei-number-field>`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*`,
 * `--tanrei-comp-input-box-*`, `--tanrei-comp-number-input-*` and, for the two steppers, `--tanrei-comp-button-*` value reaches the members by
 * inheritance, and one number field is set apart by setting such a property on this element. Each property is its
 * member's, set on that member unchanged: `label`, `label-hidden`, `supporting-text`, `error-text`, `error`,
 * `disabled`, `required`, `optional`, `required-mark`, `required-text` and `optional-text` are the Field's, every other one the
 * number input's. One level down, the same by hand: `<tanrei-field label="Quantity" required
 * supporting-text="Up to 99 per order."><tanrei-number-input name="quantity" min="1" max="99"
 * increment-label="Increase" decrement-label="Decrease"></tanrei-number-input></tanrei-field>` — and the box alone,
 * where a label stands elsewhere (beside a slider, in a cell of a table), is `<tanrei-number-input>` with a `label`
 * of its own.
 *
 * It is a block as wide as its place, and its box fills it (NUM-47): give it a narrower place for a narrower box.
 *
 * `value` is at every moment the number input's — a number, or null while it holds none — and the four events are
 * that input's own, with this element as their target: `event.target.value` is the new value in every listener of
 * `change`. It dispatches none itself, and coordinates nothing: the input tells its Field that it floats the label,
 * where its number's line starts and ends, and its refusal of a text that is not a number, exactly as it does one
 * level down.
 *
 * Form-associated (NUM-48): it submits the value under `name` as a plain decimal number ("12.5") whatever the locale
 * shows — nothing while disabled —, resets to its `value` attribute, is restored on navigation, follows a disabled
 * `<fieldset>`, and reports what its number input reports: a missing value while `required` is set and it
 * holds none, and a bad input while it holds a text that is not a number. Enter presses the default button of this
 * element's form.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the input, the field is one stop in the focus
 * order, and its name is `label` (with `label-hidden` where it is not drawn), never `aria-label`. A press on the label
 * row, on the box or on a floating label focuses the input; a press on a stepper steps and moves no focus; a press on
 * the help or the error text does nothing.
 *
 * @tag tanrei-number-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart number-input - The control: the `<tanrei-number-input>` it is built from.
 * @exportparts tanrei-field -counter, -value-text, label: field-label, label, requirement-label: field-requirement-label, requirement-label
 * @exportparts tanrei-number-input label: number-input-label, label, requirement-label: number-input-requirement-label, requirement-label
 * @attr {string} form - The id of the form the number field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-number-input
 * @fires change - => tanrei-number-input
 * @fires action - => tanrei-number-input
 * @fires entryerror - => tanrei-number-input
 */
export class TanreiNumberField extends ComposedControl<number | null> {
  /** NUM-48: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // NUM-47: no width of its own — as an item of a row too (a horizontal field group, a product's own flex row), where
  // a block's least width would be its content's: the row decides, and the box fills what it is given (down to the
  // least width the number input keeps for itself, NMI-36).
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
   * Its parts, once: the two members and what each exports — a name both export, once.
   *
   * @internal
   */
  static readonly parts: readonly string[] = [...new Set(['field', 'number-input', ...FIELD_PARTS.names, ...INPUT_PARTS.names])];

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
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: NUMBER_OR_NULL,
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    min: NUMBER_OR_NULL,
    max: NUMBER_OR_NULL,
    step: { type: Number },
    noSteppers: { type: Boolean, attribute: 'no-steppers', reflect: true },
    incrementLabel: { type: String, attribute: 'increment-label' },
    decrementLabel: { type: String, attribute: 'decrement-label' },
    prefixText: { type: String, attribute: 'prefix-text' },
    suffixText: { type: String, attribute: 'suffix-text' },
    valueText: { type: String, attribute: 'value-text' },
    align: { type: String, reflect: true },
    minFractionDigits: { type: Number, attribute: 'min-fraction-digits' },
    maxFractionDigits: { type: Number, attribute: 'max-fraction-digits' },
    locale: { type: String },
    invalidText: { type: String, attribute: 'invalid-text' },
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

  /** @from tanrei-number-input.variant */
  variant: TanreiNumberInputVariant = 'stacked';

  /** @from tanrei-number-input.size */
  size: TanreiNumberInputSize = 'medium';

  /** @from tanrei-number-input.value */
  get value(): number | null {
    return this.memberValue(null);
  }

  set value(value: number | null) {
    this.giveValue(value);
    // NMI-31: the value the input holds already is still the product's set there — it ends an entry error and replaces
    // a text being typed —, and no change for the element to pass on at its next render.
    const input = this.input;
    if (input && Object.is(input.value, value)) input.value = value;
  }

  /** @from tanrei-number-input.placeholder */
  placeholder = '';

  /** @from tanrei-number-input.readOnly */
  readOnly = false;

  /** @from tanrei-number-input.min */
  min: number | null = null;

  /** @from tanrei-number-input.max */
  max: number | null = null;

  /** @from tanrei-number-input.step */
  step = 1;

  /** @from tanrei-number-input.noSteppers */
  noSteppers = false;

  /** @from tanrei-number-input.incrementLabel */
  incrementLabel = '';

  /** @from tanrei-number-input.decrementLabel */
  decrementLabel = '';

  /** @from tanrei-number-input.prefixText */
  prefixText = '';

  /** @from tanrei-number-input.suffixText */
  suffixText = '';

  /** @from tanrei-number-input.valueText */
  valueText = '';

  /** @from tanrei-number-input.align */
  align: TanreiNumberInputAlign = 'start';

  /** @from tanrei-number-input.minFractionDigits */
  minFractionDigits = 0;

  /** @from tanrei-number-input.maxFractionDigits */
  maxFractionDigits = 3;

  /** @from tanrei-number-input.locale */
  locale = '';

  /** @from tanrei-number-input.invalidText */
  invalidText = '';

  private get input(): TanreiNumberInput | null {
    return this.renderRoot?.querySelector<TanreiNumberInput>('tanrei-number-input') ?? null;
  }

  protected override get valueMember(): ValueMember<number | null> | null {
    return this.input;
  }

  /** Selects the text in the input, as the number input's `select()` does. */
  select() {
    this.input?.select();
  }

  /** NUM-48 (W6, item 4): the first value is the `value` attribute, read as the number input reads it — a plain decimal number, or none. */
  protected override firstValue(): number | null {
    return numberOrNull(this.getAttribute('value'));
  }

  /**
   * NUM-48: a form's reset returns to the first value and, as in the number input placed in a form by hand, the same
   * value as the one held is still a new one — the text the person left and an entry error go.
   */
  override formResetCallback() {
    const first = this.firstValue();
    this.value = first;
    this.input?.resetTo(first);
  }

  // NUM-47: a Field whose one control is a number input, exactly as a product writes the two — and nothing else but
  // the passage of the Field's label glyph. No text stands between the tags: the Field's control is its one child
  // without a slot.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-number-input part="number-input" exportparts=${INPUT_PARTS.attribute} ${delegatedAria(this, {})} ${forward(this, INPUT)}></tanrei-number-input
    ></tanrei-field>`;
  }
}

// NUM-52: the product's ARIA on the host is its control's (src/primitives/delegated-aria.ts), but for its name, which is label (NUM-47).
fieldDelegatesAria(TanreiNumberField, TanreiNumberInput, 'NUM-52');
if (!customElements.get('tanrei-number-field')) customElements.define('tanrei-number-field', TanreiNumberField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-number-field': TanreiNumberField;
  }
}
