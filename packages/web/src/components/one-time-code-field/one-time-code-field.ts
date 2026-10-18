import { type PropertyDeclarations, html } from 'lit';
import { ComposedControl, type ValueMember, exported, forward } from '../../primitives/composed.js';
import { TanreiField, type TanreiFieldRequiredMark } from '../field/field.js';
import { TanreiOneTimeCodeInput, type TanreiOneTimeCodeInputDetail, type TanreiOneTimeCodeInputType } from '../one-time-code-input/one-time-code-input.js';

// The members' own types are the one-time-code field's: it has no detail type and no type for `type` of its own.
export type { TanreiFieldRequiredMark, TanreiOneTimeCodeInputDetail, TanreiOneTimeCodeInputType };

/** OTF-2: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'] as const;
/** OTF-2: the props that are the One-time-code input's. Its own `label`, `error` and `disabled` are never set. */
const INPUT = ['value', 'length', 'type', 'groupSize', 'mask', 'readOnly'] as const;

/**
 * W4: each member's documented parts, from the member's own list. No name is shared by the two. The Field's `counter`
 * and `value-text` are left out: a one-time-code field gives its Field no count and no value text, so neither part is
 * ever drawn in it.
 */
const FIELD_PARTS = exported(TanreiField, {}, ['counter', 'value-text']);
const INPUT_PARTS = exported(TanreiOneTimeCodeInput);

/**
 * Asks for a short code sent to the person as one complete field. Built from a Field (`<tanrei-field>`) and the
 * One-time-code input (`<tanrei-one-time-code-input>`) it frames: the input under the Field's label, with the Field's
 * help and its error, tied together for assistive technology and taking part in a form as one control.
 *
 * Contract: specs/one-time-code-field.spec.json. `<tanrei-one-time-code-field name="code" label="Verification code"
 * supporting-text="Enter the 6-digit code we sent to your phone." group-size="3"></tanrei-one-time-code-field>`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*` and
 * `--tanrei-comp-one-time-code-input-*` value reaches the members by inheritance, and one instance is set apart by
 * setting such a property on this element. Each property is its member's, set on that member unchanged. One level
 * down, the same by hand: `<tanrei-field label="Verification code"><tanrei-one-time-code-input name="code"
 * group-size="3"></tanrei-one-time-code-input></tanrei-field>` — for something of the product's own inside the frame.
 *
 * `value` is at every moment the One-time-code input's, and the four events are that input's own, with this element
 * as their target: `event.target.value` is the code in every listener. It dispatches none itself.
 *
 * Form-associated: it submits the code under `name` — nothing while disabled —, resets to its `value` attribute, is
 * restored on navigation, follows a disabled `<fieldset>`, and reports a missing value while `required` is
 * set and it is empty. Enter in the cells presses the default button of this element's form.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the cells, and its name is `label` (with
 * `label-hidden` where it is not drawn), never `aria-label`.
 *
 * @tag tanrei-one-time-code-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart one-time-code-input - The control: the `<tanrei-one-time-code-input>` it is built from.
 * @exportparts tanrei-field -counter, -value-text
 * @exportparts tanrei-one-time-code-input
 * @attr {string} form - The id of the form the one-time-code field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-one-time-code-input
 * @fires change - => tanrei-one-time-code-input
 * @fires complete - => tanrei-one-time-code-input
 * @fires action - => tanrei-one-time-code-input
 */
export class TanreiOneTimeCodeField extends ComposedControl<string> {
  /** OTF-4: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  /**
   * Its parts, once: the two members and what each exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['field', 'one-time-code-input', ...FIELD_PARTS.names, ...INPUT_PARTS.names];

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
    value: { type: String },
    length: { type: Number },
    type: { type: String },
    groupSize: { type: Number, attribute: 'group-size' },
    mask: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
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

  /** @from tanrei-one-time-code-input.value */
  get value(): string {
    return this.memberValue('');
  }

  set value(value: string) {
    this.giveValue(value);
  }

  /** @from tanrei-one-time-code-input.length */
  length = 6;

  /** @from tanrei-one-time-code-input.type */
  type: TanreiOneTimeCodeInputType = 'numeric';

  /** @from tanrei-one-time-code-input.groupSize */
  groupSize = 0;

  /** @from tanrei-one-time-code-input.mask */
  mask = false;

  /** @from tanrei-one-time-code-input.readOnly */
  readOnly = false;

  protected override readonly hostNameSentence = 'OTF-1';

  protected override get valueMember(): ValueMember<string> | null {
    return this.renderRoot?.querySelector<TanreiOneTimeCodeInput>('tanrei-one-time-code-input') ?? null;
  }

  // OTF-1: a Field whose one control is a One-time-code input, exactly as a product writes the two — and nothing else
  // but the passage of the Field's label glyph (OTF-6). No text stands between the tags: the Field's control is its
  // one child.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-one-time-code-input part="one-time-code-input" exportparts=${INPUT_PARTS.attribute} ${forward(this, INPUT)}></tanrei-one-time-code-input
    ></tanrei-field>`;
  }
}

if (!customElements.get('tanrei-one-time-code-field')) customElements.define('tanrei-one-time-code-field', TanreiOneTimeCodeField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-one-time-code-field': TanreiOneTimeCodeField;
  }
}
