import { type PropertyDeclarations, type PropertyValues, css, html } from 'lit';
import { ComposedControl, type ValueMember, composedHost, exported, forward, fieldDelegatesAria } from '../../primitives/composed.js';
import { delegatedAria } from '../../primitives/delegated-aria.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { OPTION_GROUP_TAG, OPTION_TAG } from '../../primitives/option-list.js';
import { report } from '../../primitives/report.js';
import { TanreiField, type TanreiFieldRequiredMark } from '../field/field.js';
import { TanreiSelect, type TanreiSelectDensity, type TanreiSelectIconSpace, type TanreiSelectSeparation, type TanreiSelectSize, type TanreiSelectStatus, type TanreiSelectToggleDetail, type TanreiSelectToggleReason, type TanreiSelectVariant } from '../select/select.js';

// The members' own types are the select field's: it has no detail type and no type for a prop of its own.
export type { TanreiFieldRequiredMark, TanreiSelectIconSpace, TanreiSelectSeparation, TanreiSelectSize, TanreiSelectStatus, TanreiSelectToggleDetail, TanreiSelectToggleReason, TanreiSelectVariant };

/** SEF-1: the props that are the Field's, given to it unchanged. `disabled` is the Field's too, joined with a disabled fieldset's (W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'] as const;
/**
 * SEF-1: the eleven props that are the select's. Its own `label`, `labelHidden`, `error` and `disabled` are never set:
 * they reach the select through its Field's connection.
 */
const SELECT = ['variant', 'size', 'value', 'placeholder', 'readOnly', 'clearable', 'clearLabel', 'open', 'separation', 'iconSpace', 'density', 'status', 'statusText', 'emptyText'] as const;

/**
 * W4: each member's documented parts, from the member's own list. Two names are shared — `label` and
 * `requirement-label` — and each is exported with its member's name before it, always, and under the bare name from
 * both: the two are one thing to a person and are never drawn at once. FLD-25 is the sentence that holds it — while
 * its control draws the label itself the Field draws no label row and no requirement tag — and a stacked select draws
 * neither (SEL-15, SEL-7). So `::part(label)` is the drawn label, whichever member draws it. The Field's `value-text` is
 * left out: a select shows its value itself and the select field has no such prop, so the part is no part of it;
 * `counter` is exported as the spec's note lists it, and is never drawn here.
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['value-text']);
const SELECT_PARTS = exported(TanreiSelect, { label: { as: 'select-label', bare: true }, 'requirement-label': { as: 'select-requirement-label', bare: true } });

/** What a child of the element may be: an option, a group of options, or a child for one of its two named slots. */
const PASSED_SLOTS = ['label-icon', 'leading-icon'];

/**
 * Lets people choose one value from a closed list as one complete field of a form. Built from a Field
 * (`<tanrei-field>`) and the Select (`<tanrei-select>`) it frames: the trigger and its list under the Field's label —
 * or, in the filled and the outlined look, with the label floating in the box — with the Field's help and its error,
 * tied together for assistive technology and taking part in a form as one control.
 *
 * Contract: specs/select-field.spec.json.
 *
 * ```html
 * <tanrei-select-field name="country" label="Country" required supporting-text="Where your invoices are addressed.">
 *   <tanrei-option value="jp">Japan</tanrei-option>
 *   <tanrei-option value="ke">Kenya</tanrei-option>
 * </tanrei-select-field>
 * ```
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the two members' own elements and nothing
 * else, so it draws nothing of its own and has no token — every `--tanrei-comp-field-*`,
 * `--tanrei-comp-input-box-*` and `--tanrei-comp-select-*` value reaches the members by inheritance, and one select field is set apart by setting such a property on this
 * element. Each property is its member's, set on that member unchanged: `label`, `label-hidden`, `supporting-text`,
 * `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text` and `optional-text` are the
 * Field's, every other one the select's. One level down, the same by hand: `<tanrei-field label="Country"
 * required><tanrei-select name="country">…options…</tanrei-select></tanrei-field>` — and the box alone,
 * where a label stands elsewhere (a bar, a toolbar, a column of a table), is `<tanrei-select>` with a `label` of its
 * own.
 *
 * The options are its `<tanrei-option>` and `<tanrei-option-group>` children, exactly as a select's: they stay the
 * product's, are never moved or copied, and reach the select inside through the default slot, which the select reads.
 * Replacing them by hand works as on a select.
 *
 * It is a block as wide as its place, and its box fills it (SEF-1): give it a narrower place for a narrower box.
 *
 * `value` and `open` are at every moment the select's, read through to it and never copied, and the two events are
 * that select's own, with this element as their target: `event.target.value` and `event.target.open` are new in every
 * listener. It dispatches none itself. `toggle` is composed and does not bubble: it is heard on this element and by no
 * ancestor.
 *
 * Form-associated: it submits the value under `name` — nothing while disabled —, resets to its `value` attribute, is
 * restored on navigation, follows a disabled `<fieldset>`, and reports a missing value while `required` is
 * set and the value is empty.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the select's trigger, and its name is `label`
 * (with `label-hidden` where it is not drawn), never `aria-label`. A press on the label row focuses the trigger and
 * opens nothing; a press on the trigger opens the list; a press on the help or the error text does nothing.
 *
 * @tag tanrei-select-field
 * @slot - => tanrei-select
 * @slot leading-icon - => tanrei-select
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart select - The control: the `<tanrei-select>` it is built from.
 * @exportparts tanrei-field label: field-label, label, requirement-label: field-requirement-label, requirement-label, -value-text
 * @exportparts tanrei-select label: select-label, label, requirement-label: select-requirement-label, requirement-label
 * @attr {boolean} inline - For tests and fixtures: the select's own attribute of that name, passed on. It draws the open list in place below the trigger and not in the top layer, so that an open fixture and its twin are staged alike. No prop of the component.
 * @attr {string} form - The id of the form the select field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires change - => tanrei-select
 * @fires toggle - => tanrei-select
 */
export class TanreiSelectField extends ComposedControl<string> {
  /** SEF-2: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // SEF-1: no width of its own — as an item of a row too (a horizontal field group, a product's own flex row): the row
  // decides, and the box fills what it is given.
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
  static readonly parts: readonly string[] = [...new Set(['field', 'select', ...FIELD_PARTS.names, ...SELECT_PARTS.names])];

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
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    clearable: { type: Boolean, reflect: true },
    clearLabel: { type: String, attribute: 'clear-label' },
    open: { type: Boolean, reflect: true },
    separation: { type: String, reflect: true },
    iconSpace: { type: String, attribute: 'icon-space', reflect: true },
    density: { type: String, reflect: true, useDefault: true },
    status: { type: String, reflect: true },
    statusText: { type: String, attribute: 'status-text' },
    emptyText: { type: String, attribute: 'empty-text' },
  };

  /**
   * `inline` is the select's attribute for tests and fixtures, and no prop of the component: the element has no
   * property for it. It watches the attribute and gives its select what the attribute says, so that an open fixture
   * and its twin are staged alike.
   */
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'inline'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === 'inline') this.requestUpdate();
    else super.attributeChangedCallback(name, old, value);
  }

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

  /** @from tanrei-select.variant */
  variant: TanreiSelectVariant = 'stacked';

  /** @from tanrei-select.size */
  size: TanreiSelectSize = 'medium';

  /** @from tanrei-select.value */
  get value(): string {
    return this.memberValue('');
  }

  set value(value: string) {
    this.giveValue(value);
  }

  /** @from tanrei-select.placeholder */
  placeholder = '';

  /** @from tanrei-select.readOnly */
  readOnly = false;

  /** @from tanrei-select.clearable */
  clearable = false;

  /** @from tanrei-select.clearLabel */
  clearLabel = '';

  /**
   * W5: `open` is the select's at every moment, as `value` is — what was last set on the element until the select has
   * taken it (the element's next render), and from then on what the select holds. So it is already new in every
   * listener of `toggle`, and when the select takes it back with no event (disabled, read-only or without its last
   * option while open: SEL-36).
   */
  private openGiven: boolean | undefined;

  /** @from tanrei-select.open */
  get open(): boolean {
    return this.openGiven ?? this.select?.open ?? false;
  }

  set open(open: boolean) {
    const select = this.select;
    if (this.openGiven === undefined && select && select.open === open) return;
    this.openGiven = open;
  }

  /** @from tanrei-select.separation */
  separation: TanreiSelectSeparation = 'auto';

  /** @from tanrei-select.iconSpace */
  iconSpace: TanreiSelectIconSpace = 'auto';

  /** @from tanrei-select.density */
  density: TanreiSelectDensity = 'regular';

  /** @from tanrei-select.status */
  status: TanreiSelectStatus = 'idle';

  /** @from tanrei-select.statusText */
  statusText = '';

  /** @from tanrei-select.emptyText */
  emptyText = '';

  private get select(): TanreiSelect | null {
    return this.renderRoot?.querySelector<TanreiSelect>('tanrei-select') ?? null;
  }

  protected override get valueMember(): ValueMember<string> | null {
    return this.select;
  }

  /**
   * The reflected `open` follows the select's: the select tells its form after each of its updates, and where its
   * `open` is no longer what this element's attribute says — the person opened or closed the list, or the select took
   * `open` back — the element reflects it again, from the select. Nothing is copied: the property reads through.
   */
  protected override memberUpdated() {
    const select = this.select;
    if (select && this.hasUpdated && this.openGiven === undefined && this.hasAttribute('open') !== select.open) this.requestUpdate('open', !select.open);
  }

  protected override updated(changed: PropertyValues) {
    // W5: the render that has just ended gave the select what was set; from here `open` is the select's.
    this.openGiven = undefined;
    super.updated(changed);
    // O9: a child that is neither an option, a group of options nor a child for one of the two named slots is not
    // rendered; said once for the element.
    if (!this.strayReported) {
      const stray = [...this.children].find((child) => child.localName !== OPTION_TAG && child.localName !== OPTION_GROUP_TAG && !PASSED_SLOTS.includes(child.slot));
      if (stray) {
        this.strayReported = true;
        report(
          this,
          'SEF-1',
          `<${stray.localName}${stray.slot ? ` slot="${stray.slot}"` : ''}> is not drawn: a select field's children are its options (<${OPTION_TAG}>, <${OPTION_GROUP_TAG}>) and a glyph for the label-icon or the leading-icon slot`,
        );
      }
    }
  }

  private strayReported = false;

  // SEF-1: a Field whose one control is a select, exactly as a product writes the two — and nothing else but the
  // passage of the Field's label glyph, of the select's leading glyph, and of the options: the default slot stands
  // among the select's children, always, and the select reads the product's children through it.
  // No text stands between the tags: the Field's control is its one child without a slot.
  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-select part="select" exportparts=${SELECT_PARTS.attribute} ${delegatedAria(this, {})} ${forward(this, SELECT)} .inline=${this.hasAttribute('inline')}
        ><slot></slot>${this.pass('leading-icon')}</tanrei-select
      ></tanrei-field
    >`;
  }
}

// SEF-6: the product's ARIA on the host is its control's (src/primitives/delegated-aria.ts), but for its name, which is label (SEF-1).
fieldDelegatesAria(TanreiSelectField, TanreiSelect, 'SEF-6');
if (!customElements.get('tanrei-select-field')) customElements.define('tanrei-select-field', TanreiSelectField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-select-field': TanreiSelectField;
  }
}
