import { type PropertyDeclarations, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward } from '../../primitives/composed.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiField, type TanreiFieldRequiredMark, type TanreiFieldRequirement } from '../field/field.js';
import {
  DISABLED_DATES,
  TanreiTextInput,
  type TanreiTextInputActionDetail,
  type TanreiTextInputEntryErrorDetail,
  type TanreiTextInputPickerRequestDetail,
  type TanreiTextInputResize,
  type TanreiTextInputResizeAxis,
  type TanreiTextInputSize,
  type TanreiTextInputType,
  type TanreiTextInputVariant,
} from '../text-input/text-input.js';

// The members' own types are the text field's: it has no detail type and no type for a prop of its own.
export type {
  TanreiFieldRequiredMark,
  TanreiFieldRequirement,
  TanreiTextInputActionDetail,
  TanreiTextInputEntryErrorDetail,
  TanreiTextInputPickerRequestDetail,
  TanreiTextInputResize,
  TanreiTextInputResizeAxis,
  TanreiTextInputSize,
  TanreiTextInputType,
  TanreiTextInputVariant,
};

/** TXF-62: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'requirement', 'requiredMark', 'requiredText', 'optionalText'] as const;
/** TXF-62: the twenty-seven props that are the text input's. Its own `label`, `labelHidden`, `error` and `disabled` are never set. */
const INPUT = [
  'variant',
  'size',
  'type',
  'value',
  'placeholder',
  'readOnly',
  'multiline',
  'minRows',
  'maxRows',
  'resize',
  'resizeAxis',
  'resizeLabel',
  'noWrap',
  'maxLength',
  'counter',
  'counterText',
  'counterNoLimitText',
  'prefixText',
  'suffixText',
  'autocomplete',
  'locale',
  'min',
  'max',
  'disabledDates',
  'invalidText',
  'unavailableText',
  'segmentEmptyText',
  'picker',
  'pickerLabel',
] as const;

/**
 * W4: each member's documented parts, from the member's own list. Two names are shared — `label` and
 * `requirement-label` — and each is exported with its member's name before it, always, and under the bare name from
 * both: the two are one thing to a person and are never drawn at once. FLD-25 is the sentence that holds it — while
 * its control draws the label itself the Field draws no label row and no requirement tag — and a stacked input draws
 * neither (TXI-13, TXI-50). So `::part(label)` is the drawn label, whichever member draws it. The Field's `value-text`
 * is left out: a text field gives its Field no value text — its value is read in its box — so the part is never drawn.
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['value-text']);
const INPUT_PARTS = exported(TanreiTextInput, { label: { as: 'text-input-label', bare: true }, 'requirement-label': { as: 'text-input-requirement-label', bare: true } });

/**
 * Lets people enter and edit text as one complete field. Built from a Field (`<tanrei-field>`) and the Text input
 * (`<tanrei-text-input>`) it frames: the box under the Field's label — or, in the filled and the outlined look, with
 * the label floating in it — with the Field's help, its error and the count, tied together for assistive technology
 * and taking part in a form as one control.
 *
 * Contract: specs/text-field.spec.json. `<tanrei-text-field name="email" label="Email" type="email"
 * autocomplete="email" requirement="required" supporting-text="We never share your address."></tanrei-text-field>`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*`,
 * `--tanrei-comp-input-box-*` and `--tanrei-comp-text-input-*` value reaches the members by inheritance, and one text field is set apart by setting
 * such a property on this element. Each property is its member's, set on that member unchanged: `label`,
 * `label-hidden`, `supporting-text`, `error-text`, `error`, `disabled`, `requirement`, `required-mark`,
 * `required-text` and `optional-text` are the Field's, every other one the text input's. One level down, the same by
 * hand: `<tanrei-field label="Email" requirement="required" supporting-text="We never share your address.">
 * <tanrei-text-input name="email" type="email" autocomplete="email"></tanrei-text-input></tanrei-field>` — and the box
 * alone, where a label stands elsewhere, is `<tanrei-text-input>` with a `label` of its own.
 *
 * It is a block as wide as its place, and its box fills it (TXF-62): give it a narrower place for a narrower box.
 *
 * `value` is at every moment the text input's, and the five events are that input's own, with this element as their
 * target: `event.target.value` is the new value in every listener. It dispatches none itself. The one thing it does
 * that the pair by hand does not: while `counter` is set it gives its Field the count its text input keeps, at every
 * change (TXF-67) — by hand a product writes `field.countText = input.countText` in its `input` listener.
 *
 * Form-associated: it submits the value under `name` — nothing while disabled —, resets to its `value` attribute, is
 * restored on navigation, follows a disabled `<fieldset>`, and reports what its text input reports: a missing value
 * while `requirement` is `required` and it is empty, and a date's or a time's entry error. Enter in a single-line
 * field presses the default button of this element's form.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the input, and its name is `label` (with
 * `label-hidden` where it is not drawn), never `aria-label`. A press on the label row, on the box or on a floating
 * label focuses the input; a press on the help, the error text, the count or the gap between a row and the box does
 * nothing.
 *
 * @tag tanrei-text-field
 * @slot label-icon - => tanrei-field
 * @slot leading-icon - => tanrei-text-input
 * @slot trailing-icon - => tanrei-text-input
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart text-input - The control: the `<tanrei-text-input>` it is built from.
 * @exportparts tanrei-field label: field-label, label, requirement-label: field-requirement-label, requirement-label, -value-text
 * @exportparts tanrei-text-input label: text-input-label, label, requirement-label: text-input-requirement-label, requirement-label
 * @attr {string} form - The id of the form the text field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-text-input
 * @fires change - => tanrei-text-input
 * @fires action - => tanrei-text-input
 * @fires pickerrequest - => tanrei-text-input
 * @fires entryerror - => tanrei-text-input
 */
export class TanreiTextField extends ComposedControl<string> {
  /** TXF-63: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // TXF-62: no width of its own — as an item of a row too (a horizontal field group, a product's own flex row), where
  // a block's least width would be its native element's: the row decides, and the box fills what it is given.
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
  static readonly parts: readonly string[] = [...new Set(['field', 'text-input', ...FIELD_PARTS.names, ...INPUT_PARTS.names])];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    errorText: { type: String, attribute: 'error-text' },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    requirement: { type: String, reflect: true },
    requiredMark: { type: String, attribute: 'required-mark', reflect: true },
    requiredText: { type: String, attribute: 'required-text' },
    optionalText: { type: String, attribute: 'optional-text' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    type: { type: String, reflect: true, useDefault: true },
    value: { type: String },
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    multiline: { type: Boolean, reflect: true },
    minRows: { type: Number, attribute: 'min-rows' },
    maxRows: { type: Number, attribute: 'max-rows' },
    resize: { type: String, reflect: true },
    resizeAxis: { type: String, attribute: 'resize-axis', reflect: true },
    resizeLabel: { type: String, attribute: 'resize-label' },
    noWrap: { type: Boolean, attribute: 'no-wrap', reflect: true },
    maxLength: { type: Number, attribute: 'maxlength' },
    counter: { type: Boolean },
    counterText: { type: String, attribute: 'counter-text' },
    counterNoLimitText: { type: String, attribute: 'counter-no-limit-text' },
    prefixText: { type: String, attribute: 'prefix-text' },
    suffixText: { type: String, attribute: 'suffix-text' },
    autocomplete: { type: String },
    locale: { type: String },
    min: { type: String },
    max: { type: String },
    disabledDates: { attribute: 'disabled-dates', converter: DISABLED_DATES },
    invalidText: { type: String, attribute: 'invalid-text' },
    unavailableText: { type: String, attribute: 'unavailable-text' },
    segmentEmptyText: { type: String, attribute: 'segment-empty-text' },
    picker: { type: Boolean, reflect: true },
    pickerLabel: { type: String, attribute: 'picker-label' },
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

  /** @from tanrei-field.requirement */
  requirement: TanreiFieldRequirement = 'none';

  /** @from tanrei-field.requiredMark */
  requiredMark: TanreiFieldRequiredMark = 'auto';

  /** @from tanrei-field.requiredText */
  requiredText = '';

  /** @from tanrei-field.optionalText */
  optionalText = '';

  /** @from tanrei-text-input.variant */
  variant: TanreiTextInputVariant = 'stacked';

  /** @from tanrei-text-input.size */
  size: TanreiTextInputSize = 'medium';

  /** @from tanrei-text-input.type */
  type: TanreiTextInputType = 'text';

  /** @from tanrei-text-input.value */
  get value(): string {
    return this.memberValue('');
  }

  set value(value: string) {
    this.giveValue(value);
  }

  /** @from tanrei-text-input.placeholder */
  placeholder = '';

  /** @from tanrei-text-input.readOnly */
  readOnly = false;

  /** @from tanrei-text-input.multiline */
  multiline = false;

  /** @from tanrei-text-input.minRows */
  minRows = 2;

  /** @from tanrei-text-input.maxRows */
  maxRows = 0;

  /** @from tanrei-text-input.resize */
  resize: TanreiTextInputResize = 'auto';

  /** @from tanrei-text-input.resizeAxis */
  resizeAxis: TanreiTextInputResizeAxis = 'vertical';

  /** @from tanrei-text-input.resizeLabel */
  resizeLabel = '';

  /** @from tanrei-text-input.noWrap */
  noWrap = false;

  /** @from tanrei-text-input.maxLength */
  maxLength = 0;

  /** @from tanrei-text-input.counter */
  counter = false;

  /** @from tanrei-text-input.counterText */
  counterText = '';

  /** @from tanrei-text-input.counterNoLimitText */
  counterNoLimitText = '';

  /** @from tanrei-text-input.prefixText */
  prefixText = '';

  /** @from tanrei-text-input.suffixText */
  suffixText = '';

  /** @from tanrei-text-input.autocomplete */
  autocomplete = '';

  /** @from tanrei-text-input.locale */
  locale = '';

  /** @from tanrei-text-input.min */
  min = '';

  /** @from tanrei-text-input.max */
  max = '';

  /** @from tanrei-text-input.disabledDates */
  disabledDates: string[] = [];

  /** @from tanrei-text-input.invalidText */
  invalidText = '';

  /** @from tanrei-text-input.unavailableText */
  unavailableText = '';

  /** @from tanrei-text-input.segmentEmptyText */
  segmentEmptyText = '';

  /** @from tanrei-text-input.picker */
  picker = false;

  /** @from tanrei-text-input.pickerLabel */
  pickerLabel = '';

  protected override readonly hostNameSentence = 'TXF-62';

  protected override get valueMember(): ValueMember<string> | null {
    return this.renderRoot?.querySelector<TanreiTextInput>('tanrei-text-input') ?? null;
  }

  /** Selects the whole value, as the text input's `select()` does: a date or a time field's first segment takes focus. */
  select() {
    this.renderRoot?.querySelector<TanreiTextInput>('tanrei-text-input')?.select();
  }

  /**
   * TXF-67 (`fills`: `field.countText`): the Field is given the count its text input keeps, as the input writes it,
   * after each of the input's updates — empty while `counter` is not set. Nothing is counted, formatted or written
   * here.
   */
  protected override memberUpdated() {
    const field = this.renderRoot?.querySelector<TanreiField>('tanrei-field');
    const input = this.renderRoot?.querySelector<TanreiTextInput>('tanrei-text-input');
    if (field && input && field.countText !== input.countText) field.countText = input.countText;
  }

  // TXF-62: a Field whose one control is a text input, exactly as a product writes the two — and nothing else but the
  // passage of the Field's label glyph and of the input's two icons. No text stands between the tags: the Field's
  // control is its one child without a slot.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-text-input part="text-input" exportparts=${INPUT_PARTS.attribute} ${forward(this, INPUT)}
        >${this.pass('leading-icon')}${this.pass('trailing-icon')}</tanrei-text-input
      ></tanrei-field
    >`;
  }
}

if (!customElements.get('tanrei-text-field')) customElements.define('tanrei-text-field', TanreiTextField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-text-field': TanreiTextField;
  }
}
