import { type PropertyDeclarations, type PropertyValues, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward } from '../../primitives/composed.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  TanreiCombobox,
  type TanreiComboboxChangeDetail,
  type TanreiComboboxFilter,
  type TanreiComboboxSeparation,
  type TanreiComboboxSize,
  type TanreiComboboxStatus,
  type TanreiComboboxToggleDetail,
  type TanreiComboboxToggleReason,
  type TanreiComboboxVariant,
} from '../combobox/combobox.js';
import { TanreiField, type TanreiFieldRequiredMark } from '../field/field.js';

// The members' own types are the combobox field's: it has no detail type and no type for a prop of its own.
export type {
  TanreiComboboxChangeDetail,
  TanreiComboboxFilter,
  TanreiComboboxSeparation,
  TanreiComboboxSize,
  TanreiComboboxStatus,
  TanreiComboboxToggleDetail,
  TanreiComboboxToggleReason,
  TanreiComboboxVariant,
  TanreiFieldRequiredMark,
};

/** CBF-1: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'] as const;
/**
 * CBF-1: the sixteen props that are the combobox's, and `inline`, its web-only attribute that draws an open list in
 * place (a fixture and its twin are then staged alike). Its own `label`, `labelHidden`, `error` and `disabled` are
 * never set. `value`, `inputValue` and `open` are the three the combobox writes itself: what is set here is what the
 * combobox holds already, unless the product has just set another (CBF-3).
 */
const COMBOBOX = [
  'variant',
  'size',
  'value',
  'inputValue',
  'placeholder',
  'readOnly',
  'open',
  'allowCustomValue',
  'filter',
  'noChevron',
  'clearable',
  'clearLabel',
  'status',
  'statusText',
  'emptyText',
  'separation',
  'inline',
] as const;

/**
 * W4: each member's documented parts, from the member's own list. Two names are shared — `label` and
 * `requirement-label` — and each is exported with its member's name before it, always, and under the bare name from
 * both: the two are one thing to a person and are never drawn at once. FLD-25 is the sentence that holds it — while
 * its control draws the label itself the Field draws no label row and no requirement tag — and a stacked combobox
 * draws neither (CMB-7, CMB-8). So `::part(label)` is the drawn label, whichever member draws it. The Field's
 * `counter` is left out: a combobox keeps no count (CMB-61), so the part is never drawn in a combobox field.
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['counter', 'value-text']);
const COMBOBOX_PARTS = exported(TanreiCombobox, { label: { as: 'combobox-label', bare: true }, 'requirement-label': { as: 'combobox-requirement-label', bare: true } });

/**
 * Lets people find one value by typing, as one complete field of a form. Built from a Field (`<tanrei-field>`) and
 * the Combobox (`<tanrei-combobox>`) it frames: the box with its list of options under the Field's label — or, in the
 * filled and the outlined look, with the label floating in it — with the Field's requirement mark, its help and its
 * error, tied together for assistive technology and taking part in a form as one control.
 *
 * Contract: specs/combobox-field.spec.json.
 *
 * ```html
 * <tanrei-combobox-field name="city" label="City" required supporting-text="Where the order is sent." value="tokyo">
 *   <tanrei-option value="kyoto">Kyoto</tanrei-option>
 *   <tanrei-option value="tokyo">Tokyo</tanrei-option>
 * </tanrei-combobox-field>
 * ```
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*`,
 * `--tanrei-comp-input-box-*` and `--tanrei-comp-combobox-*` value reaches the members by inheritance, and one combobox field is set apart by setting
 * such a property on this element. Each property is its member's, set on that member unchanged: `label`,
 * `label-hidden`, `supporting-text`, `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`,
 * `required-text` and `optional-text` are the Field's, every other one the combobox's. One level down, the same by
 * hand: `<tanrei-field label="City" required supporting-text="Where the order is sent."><tanrei-combobox
 * name="city" value="tokyo"><tanrei-option value="kyoto">Kyoto</tanrei-option>…</tanrei-combobox></tanrei-field>` — and
 * the box alone, where a label stands elsewhere, is `<tanrei-combobox>` with a `label` of its own.
 *
 * **The options are this element's own children** — `<tanrei-option>`, optionally in `<tanrei-option-group>` — and
 * they stay there: nothing moves, copies or reads them here. They reach the combobox through a slot, and the combobox
 * reads them as its own, again whenever one is added, removed or changed (CBF-2).
 *
 * It is a block as wide as its place, and its box fills it (CBF-1): give it a narrower place for a narrower box.
 *
 * `value`, `inputValue` and `open` are at every moment the combobox's (CBF-3): this element keeps no copy, so each is
 * the new one in every listener and where the combobox writes it with no event (a text given up on leaving). The four
 * events are the combobox's own, with this element as their target; `toggle` does not bubble. It dispatches none
 * itself.
 *
 * Form-associated: it submits the committed value under `name` — never the text of an edit, and nothing while
 * disabled —, resets to its `value` attribute, is restored on navigation, follows a disabled `<fieldset>`, and reports
 * a missing value while `required` is set and the value is empty. Enter with no option active presses the
 * default button of this element's form.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the input, and its name is `label` (with
 * `label-hidden` where it is not drawn), never `aria-label`. A press on the label row or on the box focuses the input;
 * a press on the label row while the list is open is a press outside the combobox, and closes the list; a press on
 * the help or the error text does nothing.
 *
 * @tag tanrei-combobox-field
 * @slot - => tanrei-combobox
 * @slot label-icon - => tanrei-field
 * @slot leading-icon - => tanrei-combobox
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart combobox - The control: the `<tanrei-combobox>` it is built from.
 * @exportparts tanrei-field label: field-label, label, requirement-label: field-requirement-label, requirement-label, -counter, -value-text
 * @exportparts tanrei-combobox label: combobox-label, label, requirement-label: combobox-requirement-label, requirement-label
 * @attr {string} form - The id of the form the combobox field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - => tanrei-combobox
 * @fires change - => tanrei-combobox
 * @fires toggle - => tanrei-combobox
 * @fires action - => tanrei-combobox
 */
export class TanreiComboboxField extends ComposedControl<string> {
  /** CBF-4: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // CBF-1: no width of its own — as an item of a row too (a horizontal field group, a product's own flex row), where a
  // block's least width would be its native element's: the row decides, and the box fills what it is given.
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
  static readonly parts: readonly string[] = [...new Set(['field', 'combobox', ...FIELD_PARTS.names, ...COMBOBOX_PARTS.names])];

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
    value: { type: String },
    inputValue: { type: String, attribute: 'input-value' },
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    open: { type: Boolean, reflect: true },
    allowCustomValue: { type: Boolean, attribute: 'allow-custom-value', reflect: true },
    filter: { type: String, reflect: true },
    noChevron: { type: Boolean, attribute: 'no-chevron', reflect: true },
    clearable: { type: Boolean, reflect: true },
    clearLabel: { type: String, attribute: 'clear-label' },
    status: { type: String, reflect: true },
    statusText: { type: String, attribute: 'status-text' },
    emptyText: { type: String, attribute: 'empty-text' },
    separation: { type: String, reflect: true },
    inline: { type: Boolean, reflect: true },
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

  /** @from tanrei-combobox.variant */
  variant: TanreiComboboxVariant = 'stacked';

  /** @from tanrei-combobox.size */
  size: TanreiComboboxSize = 'medium';

  /** @from tanrei-combobox.value */
  get value(): string {
    return this.memberValue('');
  }

  set value(value: string) {
    this.giveValue(value);
  }

  // CBF-3: the text and the open state are the combobox's at every moment too — the combobox writes both itself, the
  // text with no event when a commit is given up (CMB-29) and `open` with none when it is taken back (CMB-57). Each
  // is an accessor over the member's property: what the product has just set here until the element's next render
  // has given it to the combobox, and from then on what the combobox holds. No copy is kept.

  /** @from tanrei-combobox.inputValue */
  get inputValue(): string {
    return this.asked.inputValue ?? this.combobox?.inputValue ?? '';
  }

  set inputValue(text: string) {
    if (this.asked.inputValue === undefined && this.combobox?.inputValue === text) return;
    this.asked.inputValue = text;
  }

  /** @from tanrei-combobox.placeholder */
  placeholder = '';

  /** @from tanrei-combobox.readOnly */
  readOnly = false;

  /** @from tanrei-combobox.open */
  get open(): boolean {
    return this.asked.open ?? this.combobox?.open ?? false;
  }

  set open(open: boolean) {
    if (this.asked.open === undefined && this.combobox?.open === open) return;
    this.asked.open = open;
  }

  /** @from tanrei-combobox.allowCustomValue */
  allowCustomValue = false;

  /** @from tanrei-combobox.filter */
  filter: TanreiComboboxFilter = 'contains';

  /** @from tanrei-combobox.noChevron */
  noChevron = false;

  /** @from tanrei-combobox.clearable */
  clearable = false;

  /** @from tanrei-combobox.clearLabel */
  clearLabel = '';

  /** @from tanrei-combobox.status */
  status: TanreiComboboxStatus = 'idle';

  /** @from tanrei-combobox.statusText */
  statusText = '';

  /** @from tanrei-combobox.emptyText */
  emptyText = '';

  /** @from tanrei-combobox.separation */
  separation: TanreiComboboxSeparation = 'auto';

  /**
   * Web only, for fixtures and tests: its combobox's `inline`, which draws the open list in place. No prop of the spec:
   * a fixture and its twin are staged alike by it.
   *
   * @internal
   */
  inline = false;

  protected override readonly hostNameSentence = 'CBF-1';

  /** CBF-3: what the product set on the element and the combobox has not been given yet. */
  private readonly asked: { inputValue?: string; open?: boolean } = {};

  private get combobox(): TanreiCombobox | null {
    return this.renderRoot?.querySelector<TanreiCombobox>('tanrei-combobox') ?? null;
  }

  protected override get valueMember(): ValueMember<string> | null {
    return this.combobox;
  }

  /** Selects the text in the input, as the combobox's `select()` does. */
  select() {
    this.combobox?.select();
  }

  protected override updated(changed: PropertyValues) {
    // CBF-3: the render that has just ended gave the combobox what was set; from here the two are the combobox's.
    this.asked.inputValue = undefined;
    this.asked.open = undefined;
    super.updated(changed);
  }

  /**
   * CBF-3: `open` is reflected on the host as it is on the combobox. The combobox opens and closes its list itself, so
   * the host's attribute follows what the combobox holds after each of its updates — which is when it tells its form,
   * and so this element (`ComposedControl.memberUpdated`).
   */
  protected override memberUpdated() {
    const open = this.combobox?.open ?? false;
    if (this.asked.open === undefined && this.hasAttribute('open') !== open) this.requestUpdate('open', !open);
  }

  // CBF-1, CBF-2: a Field whose one control is a combobox, exactly as a product writes the two. The unnamed slot is the
  // combobox's child and is always there — the product's options are assigned to it and the combobox reads through it
  // (web-options.md, O2) — beside the passage of the Field's label glyph and of the combobox's leading glyph. No text
  // stands between the tags: the Field's control is its one child without a slot.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-combobox part="combobox" exportparts=${COMBOBOX_PARTS.attribute} ${forward(this, COMBOBOX)}
        ><slot></slot>${this.pass('leading-icon')}</tanrei-combobox
      ></tanrei-field
    >`;
  }
}

if (!customElements.get('tanrei-combobox-field')) customElements.define('tanrei-combobox-field', TanreiComboboxField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-combobox-field': TanreiComboboxField;
  }
}
