import { type PropertyDeclarations, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward } from '../../primitives/composed.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { TanreiField, type TanreiFieldRequiredMark, type TanreiFieldRequirement } from '../field/field.js';
import {
  TanreiColorInput,
  type TanreiColorInputEntryErrorDetail,
  type TanreiColorInputPickerRequestDetail,
  type TanreiColorInputSize,
  type TanreiColorInputVariant,
} from '../color-input/color-input.js';

// The members' own types are the color field's: it has no detail type and no type for a prop of its own.
export type { TanreiColorInputEntryErrorDetail, TanreiColorInputPickerRequestDetail, TanreiColorInputSize, TanreiColorInputVariant, TanreiFieldRequiredMark, TanreiFieldRequirement };

/** CLF-43: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'requirement', 'required', 'requiredMark', 'requiredText', 'optionalText'] as const;
/** CLF-43: the six props that are the color input's. Its own `label`, `labelHidden`, `error` and `disabled` are never set. */
const INPUT = ['variant', 'size', 'value', 'invalidText', 'picker', 'pickerLabel'] as const;

/**
 * W4: each member's documented parts, from the member's own list. Two names are shared — `label` and
 * `requirement-label` — and each is exported with its member's name before it, always, and under the bare name from
 * both: the two are one thing to a person and are never drawn at once. FLD-25 is the sentence that holds it — while
 * its control draws the label itself the Field draws no label row and no requirement tag — and a stacked input draws
 * neither (CLI-15, CLI-7). So `::part(label)` is the drawn label, whichever member draws it. The Field's `counter` is
 * left out: a color field gives its Field no count, so the part is never drawn in it.
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['counter', 'value-text']);
const INPUT_PARTS = exported(TanreiColorInput, { label: { as: 'color-input-label', bare: true }, 'requirement-label': { as: 'color-input-requirement-label', bare: true } });

/**
 * Lets people set one color as one complete field of a form. Built from a Field (`<tanrei-field>`) and the Color
 * input (`<tanrei-color-input>`) it frames: the box — a sample of the value, the value as text, a button that asks
 * for a picker — under the Field's label, or, in the filled and the outlined look, with the label floating in it,
 * with the Field's help and its error, tied together for assistive technology and taking part in a form as one
 * control. It looks and measures like a text field.
 *
 * Contract: specs/color-field.spec.json. `<tanrei-color-field name="brand" label="Brand color" value="#0f766e"
 * supporting-text="Six hexadecimal digits, like #0f766e." invalid-text="Enter six hexadecimal digits, like #0f766e."
 * picker picker-label="Choose color"></tanrei-color-field>`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*`,
 * `--tanrei-comp-input-box-*` and `--tanrei-comp-color-input-*` value reaches the members by inheritance, and one color field is set apart by setting
 * such a property on this element. Each property is its member's, set on that member unchanged: `label`,
 * `label-hidden`, `supporting-text`, `error-text`, `error`, `disabled`, `requirement`, `required-mark`,
 * `required-text` and `optional-text` are the Field's; `variant`, `size`, `value`, `invalid-text`, `picker` and
 * `picker-label` the color input's. One level down, the same by hand: `<tanrei-field label="Brand color"
 * supporting-text="Six hexadecimal digits, like #0f766e."><tanrei-color-input name="brand" value="#0f766e"
 * invalid-text="Enter six hexadecimal digits, like #0f766e." picker picker-label="Choose color"></tanrei-color-input>
 * </tanrei-field>` — and the box alone, where a row or a column names the color, is `<tanrei-color-input>` with a
 * `label` of its own.
 *
 * It is a block as wide as its place, and its box fills it (CLF-43): give it a narrower place for a narrower box.
 *
 * `value` is at every moment the color input's — a number sign and six lowercase hexadecimal digits, or empty: a
 * value set as `0F766E` is read back as `#0f766e`, and one that is not a color as empty, with no event. The four
 * events are that input's own, with this element as their target: `event.target.value` is the new value in every
 * listener, and `pickerrequest` stays cancelable. It dispatches none itself.
 *
 * Form-associated: it submits the value under `name` — nothing while disabled —, resets to its `value` attribute, is
 * restored on navigation, follows a disabled `<fieldset>`, and reports what its color input reports: a missing value
 * while `requirement` is `required` and it is empty, and a bad input while a committed text is not a color. Enter in
 * the input presses the default button of this element's form.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the input — never to the picker button —,
 * and its name is `label` (with `label-hidden` where it is not drawn), never `aria-label`. It has two focus stops,
 * its input's: the input, then the picker button while it is shown. A press on the label row, on the box, on the
 * swatch or on a floating label focuses the input; a press on the help, the error text or the gap between a row and
 * the box does nothing.
 *
 * @tag tanrei-color-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart color-input - The control: the `<tanrei-color-input>` it is built from.
 * @exportparts tanrei-field -counter, -value-text, label: field-label, label, requirement-label: field-requirement-label, requirement-label
 * @exportparts tanrei-color-input label: color-input-label, label, requirement-label: color-input-requirement-label, requirement-label
 * @attr {string} form - The id of the form the color field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-color-input
 * @fires change - => tanrei-color-input
 * @fires pickerrequest - => tanrei-color-input
 * @fires entryerror - => tanrei-color-input
 */
export class TanreiColorField extends ComposedControl<string> {
  /** CLF-44: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // CLF-43: no width of its own — as an item of a row too (a horizontal field group, a product's own flex row), where
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
  static readonly parts: readonly string[] = [...new Set(['field', 'color-input', ...FIELD_PARTS.names, ...INPUT_PARTS.names])];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    errorText: { type: String, attribute: 'error-text' },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    requirement: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    requiredMark: { type: String, attribute: 'required-mark', reflect: true },
    requiredText: { type: String, attribute: 'required-text' },
    optionalText: { type: String, attribute: 'optional-text' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: { type: String },
    invalidText: { type: String, attribute: 'invalid-text' },
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

  /** @from tanrei-field.required */
  required = false;

  /** @from tanrei-field.requiredMark */
  requiredMark: TanreiFieldRequiredMark = 'auto';

  /** @from tanrei-field.requiredText */
  requiredText = '';

  /** @from tanrei-field.optionalText */
  optionalText = '';

  /** @from tanrei-color-input.variant */
  variant: TanreiColorInputVariant = 'stacked';

  /** @from tanrei-color-input.size */
  size: TanreiColorInputSize = 'medium';

  /** @from tanrei-color-input.value */
  get value(): string {
    return this.memberValue('');
  }

  set value(value: string) {
    this.giveValue(value);
  }

  /** @from tanrei-color-input.invalidText */
  invalidText = '';

  /** @from tanrei-color-input.picker */
  picker = false;

  /** @from tanrei-color-input.pickerLabel */
  pickerLabel = '';

  protected override readonly hostNameSentence = 'CLF-43';

  protected override get valueMember(): ValueMember<string> | null {
    return this.renderRoot?.querySelector<TanreiColorInput>('tanrei-color-input') ?? null;
  }

  /**
   * CLF-44: a form's reset reaches the color input. The value is the one this element was first given — its `value`
   * attribute (W6, item 4) — and with it go the text as typed and an entry error, as they do when the input stands in
   * the form by hand: a value that is what the input already holds would otherwise leave the text as the person typed
   * it (CLI-21). The input takes it the way it takes a restored value, and its value is then this element's.
   */
  override formResetCallback() {
    if (this.valueMember) this.formStateRestoreCallback(this.firstValue(), 'restore');
    else super.formResetCallback();
  }

  /** Selects the text in the input, as the color input's `select()` does. */
  select() {
    this.renderRoot?.querySelector<TanreiColorInput>('tanrei-color-input')?.select();
  }

  // CLF-43: a Field whose one control is a color input, exactly as a product writes the two — and nothing else but the
  // passage of the Field's label glyph. No text stands between the tags: the Field's control is its one child without
  // a slot.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-color-input part="color-input" exportparts=${INPUT_PARTS.attribute} ${forward(this, INPUT)}></tanrei-color-input
    ></tanrei-field>`;
  }
}

if (!customElements.get('tanrei-color-field')) customElements.define('tanrei-color-field', TanreiColorField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-color-field': TanreiColorField;
  }
}
