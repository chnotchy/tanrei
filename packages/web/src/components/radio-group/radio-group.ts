import { type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { AvailabilityController } from '../../primitives/availability.js';
import { ComposedElement, exported, forward } from '../../primitives/composed.js';
import { FIELD_CONNECT, FIELD_CONTROL, FieldControlController, type FieldConnection } from '../../primitives/field.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { report } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import { TanreiFieldGroup, type TanreiFieldGroupOrientation, type TanreiFieldGroupRequiredMark } from '../field-group/field-group.js';
import { TanreiRadioButton, type TanreiRadioButtonOwner } from '../radio-button/radio-button.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';

// The field group's own types are the radio group's, under the names it had before it was built from that element.
/** What the form asks of the set: nothing, an answer, or that it may be left out. */
/** How a required set is marked: the design system's answer (auto), a tag, an asterisk, or nothing. */
export type TanreiRadioGroupRequiredMark = TanreiFieldGroupRequiredMark;
/** A column, or a row that wraps. */
export type TanreiRadioGroupOrientation = TanreiFieldGroupOrientation;
/** What `change` carries: the value of the option that became selected, which the group already holds. */
export interface TanreiRadioGroupChangeDetail {
  value: string;
}

/** RGP-1: the props that are the field group's, given to it unchanged. `disabled` is the field group's too, joined with what the host takes from outside (W6). */
const GROUP = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText', 'orientation'] as const;

/** W4: the field group's documented parts, under its own names — the names this element's parts had before it was built from the field group's element. */
const GROUP_PARTS = exported(TanreiFieldGroup);

type Asking = Record<symbol, { ask?: () => void } | undefined>;

/** W8: under the key a control keeps its side of the field's connection, what a frame defined later calls to be asked again. */
function keepAsking(host: Element, ask: () => void) {
  (host as unknown as Asking)[FIELD_CONTROL] = { ask };
}

/** The arrow keys and the direction each moves in a left-to-right layout (RGP-5). */
const STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** RGP-12: what can be operated and is not a radio button, among the product's own elements. */
const OTHER_CONTROLS = 'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

/**
 * Asks one question that has exactly one answer among a few options shown all at once. Built from a field group
 * (`<tanrei-field-group>`) and radio buttons (`<tanrei-radio-button>`): the field group itself, in its radio-group
 * kind — its label, requirement, description and one error — around the product's own radio buttons, whose chosen
 * value the group holds under one name.
 *
 * Contract: specs/radio-group.spec.json. `<tanrei-radio-group label="Delivery" name="delivery" value="express">
 * <tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button>…</tanrei-radio-group>`: the radio
 * buttons are the element's children and stay in the product's light DOM; inside the group they need no `name`
 * (RAD-25).
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the field group's own element, with
 * `kind="radio-group"` and `spacing="controls"`, around a slot, so it draws nothing of its own and has no token — every
 * `--tanrei-comp-field-group-*` and `--tanrei-comp-radio-button-*` value reaches the members by inheritance, and one
 * instance is set apart by setting such a property on this element. Each of the eleven props of the frame is the field
 * group's, set on it unchanged. One level down, the same by hand: `<tanrei-field-group kind="radio-group"
 * label="Delivery"><tanrei-radio-button name="delivery" value="standard" label="Standard"></tanrei-radio-button>…
 * </tanrei-field-group>` — the same picture and the same radio group, without the one value, the one `change` and the
 * place in a form as one control.
 *
 * It holds one value. `value` decides which radio button is selected; a person's selection sets `value` and fires
 * `input` and one `change`, and the radio buttons inside it fire nothing of their own. The arrow keys move through the
 * enabled radio buttons, wrapping, and select as they go; the group is one stop in the focus order — the selected
 * radio button, or the first enabled one.
 *
 * Form-associated: it submits `value` under `name` — also while the radio button of that value is one the product
 * disabled by itself — returns to its `value` attribute when the form is reset, is restored on navigation, follows
 * `<fieldset disabled>`, and reports `valueMissing` while `required` and `value` is empty, in the
 * browser's own words for an unanswered set of radio buttons. It never sets `error` itself.
 *
 * Read-only (`readonly`, RGP-20): it is still entered at its stop and the arrow keys still move focus among the enabled
 * radio buttons, but nothing a person does changes `value` — each radio button is read-only while the group is (RAD-28)
 * —, it is submitted, reports no missing value, and its radiogroup says `aria-readonly`.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the radio button that is the stop, and the
 * radio group that assistive technology is told of — its name, its description and its required, invalid and disabled
 * states and its orientation — is the field group's own element (`label`, never `aria-label` on this one).
 *
 * @tag tanrei-radio-group
 * @slot - The radio buttons of the set, in the order given: `<tanrei-radio-button value="…">` elements.
 * @csspart field-group - The frame: the `<tanrei-field-group>` it is built from.
 * @exportparts tanrei-field-group
 * @attr {string} form - The id of the form the radio group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The person selected another option; `value` is already the new one.
 * @fires {CustomEvent<TanreiRadioGroupChangeDetail>} change - The person selected another option; `detail.value` is the new value, which the group already holds.
 */
export class TanreiRadioGroup extends ComposedElement implements TanreiRadioButtonOwner {
  private readonly availability = new AvailabilityController(this, 'radio-group');

  /** RGP-9: the one control the form meets; its radio buttons submit nothing. */
  static formAssociated = true;

  /**
   * Its parts, once: the member in its shadow root and what it exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['field-group', ...GROUP_PARTS.names];

  static override properties: PropertyDeclarations = {
    value: { type: String },
    name: { type: String, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    errorText: { type: String, attribute: 'error-text' },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    required: { type: Boolean, reflect: true },
    optional: { type: Boolean, reflect: true },
    requiredMark: { type: String, attribute: 'required-mark', reflect: true },
    requiredText: { type: String, attribute: 'required-text' },
    optionalText: { type: String, attribute: 'optional-text' },
    orientation: { type: String, reflect: true },
    formDisabled: { state: true },
  };

  /** The value of the selected radio button; the empty string while none is selected. The `value` attribute is the first value and what a form reset returns to. */
  value = '';

  /** The name the value is submitted under. A web attribute, not a prop of the spec. */
  name = '';

  /** @from tanrei-field-group.label */
  label = '';

  /** @from tanrei-field-group.labelHidden */
  labelHidden = false;

  /** @from tanrei-field-group.supportingText */
  supportingText = '';

  /** @from tanrei-field-group.errorText */
  errorText = '';

  /** @from tanrei-field-group.error */
  error = false;

  /** @from tanrei-field-group.disabled */
  disabled = false;

  /**
   * Shows the answer and keeps it (RGP-20): the group is focused and read and its value submitted, but a person cannot
   * change it. The `readonly` attribute. `disabled` wins over it.
   */
  readOnly = false;

  /** @from tanrei-field-group.required */
  required = false;

  /** @from tanrei-field-group.optional */
  optional = false;

  /** @from tanrei-field-group.requiredMark */
  requiredMark: TanreiFieldGroupRequiredMark = 'auto';

  /** @from tanrei-field-group.requiredText */
  requiredText = '';

  /** @from tanrei-field-group.optionalText */
  optionalText = '';

  /** @from tanrei-field-group.orientation */
  orientation: TanreiFieldGroupOrientation = 'vertical';

  /** W6, item 6: a disabled `<fieldset>` around the element, or its own `disabled` attribute, as the platform says it. */
  protected formDisabled = false;

  protected override readonly hostNameSentence = 'RGP-10';

  private readonly internals = this.attachInternals();

  /** The radio buttons the group has selected by value at least once: one that arrives marked selected is not yet among them (RGP-3, RGP-11). */
  private readonly known = new WeakSet<TanreiRadioButton>();

  /** RGP-4: the person's selection has set `value`, and its `change` is still to be fired. */
  private selecting = false;

  /** RGP-11: radio buttons that come, leave or move, however deep in the product's own elements. */
  private readonly observer = new MutationObserver(() => this.requestUpdate());

  /**
   * FGR-15: inside a field group the radio group is one member and follows that group's `disabled`, and takes nothing
   * else from it. The host asks, and not the field group in its shadow root (below): what a form is told is the host's
   * to say (RGP-9), and the field group inside is given the three together (W6, item 6).
   */
  private readonly outer = new FieldControlController(this, { takes: 'disabled', framed: true, named: () => true });

  /** RGP-9: the required text in the product's words, where the instance gives none — what the form's validation says where the browser has no sentence of its own. */
  private readonly words = new WordsController(this);

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    // W8: a frame defined after the group has the group itself ask again. The field group inside asks nobody (below).
    keepAsking(this, () => this.outer.ask());
    this.addEventListener(FIELD_CONNECT, this.onQuestion as EventListener);
  }

  /**
   * W8, read for this element (the spec's web note). Two questions end at the host, and the host's own passes:
   *
   * - the field group's in its shadow root, to a group around the radio group. Let through, an outer field group would
   *   count two members — the radio group and a field group — where it holds one; the host gives the field group
   *   `disabled` itself, with its own and a disabled fieldset's;
   * - a radio button's, asked before the group has drawn the field group that answers it (a radio button is connected
   *   first). Nobody inside answered: a field or a field group around the radio group is not the frame of its radio
   *   buttons, and the question is asked again once the field group is there (`askAgain`).
   */
  private readonly onQuestion = (event: CustomEvent<FieldConnection>) => {
    const control = event.detail?.control;
    if (!control || control === this) return;
    event.stopPropagation();
  };

  /** W8: every control among the product's own elements that has no frame yet asks the field group, now that it is drawn. */
  private askAgain() {
    for (const element of this.querySelectorAll('*')) (element as unknown as Asking)[FIELD_CONTROL]?.ask?.();
  }

  /** Disabled by its own `disabled`, by a disabled `<fieldset>` around it, or by a field group around it. */
  private get isDisabled(): boolean {
    return this.disabled || this.formDisabled || this.outer.disabled;
  }

  /** The radio buttons of the set, in the order given: those that stand in this group and in no radio group inside it. */
  get options(): TanreiRadioButton[] {
    return [...this.querySelectorAll('tanrei-radio-button')].filter((option): option is TanreiRadioButton => option instanceof TanreiRadioButton && option.closest(this.localName) === this);
  }

  /** RGP-3: the radio button `value` selects — the first of that value, and none while `value` is the empty string. */
  private selected(options = this.options): TanreiRadioButton | undefined {
    return this.value === '' ? undefined : options.find((option) => option.value === this.value);
  }

  /** RGP-6: the group's one stop — the selected radio button while it is enabled, otherwise the first enabled one. */
  private stop(options = this.options): TanreiRadioButton | undefined {
    const enabled = options.filter((option) => !option.isDisabled);
    return enabled.find((option) => option.checked) ?? enabled[0];
  }

  /** The form the group belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while the group is required and its value is empty. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity() {
    return this.internals.checkValidity();
  }

  reportValidity() {
    return this.internals.reportValidity();
  }

  /** RGP-6, W7: focus asked of the group goes to the radio button that is its stop; the group itself is never one. */
  protected override get control(): HTMLElement | null {
    return this.stop() ?? null;
  }

  /** W7, item 2: what has focus among its radio buttons loses it — they are the product's children, outside the shadow root. */
  override blur() {
    this.forgetKeptFocus();
    let active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || !this.contains(active)) return super.blur();
    while (active.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    (active as HTMLElement).blur();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.observer.observe(this, { childList: true, subtree: true });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
  }

  formResetCallback() {
    // RGP-9: back to the value it was first given, without a change.
    this.value = this.getAttribute('value') ?? '';
  }

  formStateRestoreCallback(restored: string | File | FormData | null) {
    this.value = typeof restored === 'string' ? restored : '';
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** The radio button of the group an event came from, if it came from one. */
  private optionOf(event: Event): TanreiRadioButton | null {
    const from = event.composedPath().find((node): node is TanreiRadioButton => node instanceof TanreiRadioButton);
    return from && from.closest(this.localName) === this ? from : null;
  }

  /**
   * RGP-4, RAD-25: a person selected a radio button of the group, which fires nothing itself and tells the group where
   * it would have fired its `input`, then its `change`. The group takes its value before anyone is told, then fires
   * `input` and one `change`; a radio button that is already selected says nothing (RAD-2).
   * @internal
   */
  optionSelected(option: TanreiRadioButton, event: 'input' | 'change') {
    if (event === 'input') {
      // A radio button without a value cannot be the answer: `value` would say "none selected" (RGP-3).
      if (this.isDisabled || option.value === '' || option.value === this.value) return void this.requestUpdate();
      this.value = option.value;
      this.selecting = true;
      this.syncForm();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    } else if (this.selecting) {
      this.selecting = false;
      this.dispatchEvent(new CustomEvent<TanreiRadioGroupChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
    }
  }

  /**
   * RGP-5: the arrow keys move to the next or previous enabled radio button in the order given, wrapping, and select
   * it; right-to-left exchanges Left and Right and leaves Up and Down. The direction is read at the key (RGP-16).
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const step = STEPS[event.key];
    if (!step || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const from = this.optionOf(event);
    if (!from) return;
    event.preventDefault();
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const direction = horizontal && getComputedStyle(this).direction === 'rtl' ? -step : step;
    const enabled = this.options.filter((option) => !option.isDisabled);
    const at = enabled.indexOf(from);
    // Nothing to move to while the focused one is the only enabled one.
    if (at < 0 || enabled.length < 2) return;
    const next = enabled[(at + direction + enabled.length) % enabled.length];
    next.focus();
    // RGP-20, RAD-28: in a read-only group, or on a read-only radio button, the arrow key moves focus and selects nothing.
    if (next.isReadOnly) return;
    // Selected as a person selects it: the radio button tells the group, which fires `input` and `change` (RGP-4).
    next.click();
  };

  /**
   * RAD-25: a radio button of the group changed. RGP-3: `selected` set on one by the product is the group's value from
   * then on; anything else — its value, its `disabled` — is selected by value again (RGP-11).
   * @internal
   */
  optionChanged(option: TanreiRadioButton, selection: boolean) {
    if (selection && this.known.has(option) && option.checked && option.value !== '' && option !== this.selected()) this.value = option.value;
    this.requestUpdate();
  }

  /** RGP-9: the value the form submits, what it restores, and whether an answer is missing. */
  private syncForm(options = this.options) {
    const off = this.isDisabled;
    this.internals.setFormValue(off || this.value === '' ? null : this.value, this.value);
    // RGP-20: a read-only group reports no missing value — a person cannot give one.
    if (!off && !this.readOnly && this.required && this.value === '') {
      // The browser's own words for an unanswered set of radio buttons; where it has none, the product's.
      const message = missingValueMessage('radio', { errorText: this.errorText, requiredText: this.words.get('requiredText', this.requiredText), label: this.label });
      // W6, item 3: anchored on the radio button that is the stop — its own native element, which is what takes focus.
      const anchor = this.stop(options)?.validationAnchor;
      if (anchor) this.internals.setValidity({ valueMissing: true }, message, anchor);
      else this.internals.setValidity({ valueMissing: true }, message);
    } else this.internals.setValidity({});
  }

  /** The group has updated when its radio buttons have: what it gave them, they have taken. */
  protected override async getUpdateComplete(): Promise<boolean> {
    const done = await super.getUpdateComplete();
    await Promise.all(this.options.map((option) => option.updateComplete));
    return done;
  }

  protected override willUpdate() {
    // RGP-3, RGP-11: a radio button that arrives marked selected gives the group its value only while the group has
    // none — where both are given, `value` decides. Of several, the last, as among radio buttons grouped by name.
    for (const option of this.options) {
      if (this.known.has(option)) continue;
      if (option.checked && option.value !== '' && this.value === '') this.value = option.value;
    }
  }

  protected override updated(changed: PropertyValues) {
    const options = this.options;
    // RGP-3: the radio button of the group's value is selected, and no other; each takes the radio button's own
    // selection motion (RAD-15).
    const selected = this.selected(options);
    for (const option of options) {
      this.known.add(option);
      if (option.checked !== (option === selected)) option.checked = option === selected;
    }
    // W8: the radio buttons that asked before the field group was drawn ask it now; it gives each `disabled`, and takes
    // it back from one that left (RGP-7, RGP-11; FGR-14, FGR-23).
    this.askAgain();
    // RGP-6, RGP-10: the tab stop and each position, from the selection and the disabled states as they are now.
    options[0]?.regroup();
    // RAD-28: each radio button draws itself read-only while the group is.
    if (changed.has('readOnly')) for (const option of options) option.requestUpdate();
    this.syncForm(options);
    this.reports(options);
    void this.exposeReadOnly();
    super.updated(changed);
  }

  /**
   * What a debug build tells the developer; the group still renders. An unknown value of a frame's prop, missing words
   * and an empty label are the field group's to report (RGP-10, RGP-18, RGP-19: FGR-10, FGR-22, FGR-24).
   */
  /**
   * RGP-10, RGP-20: the radio group assistive technology is told of is the field group's own element, which carries the
   * role's other states; a field group has no read-only state of its own, so the radio group writes `aria-readonly` on
   * that element once the field group has drawn it.
   */
  private async exposeReadOnly() {
    const frame = this.renderRoot.querySelector<TanreiFieldGroup>('tanrei-field-group');
    if (!frame) return;
    await frame.updateComplete;
    const group = frame.shadowRoot?.querySelector('[role="radiogroup"]');
    if (!group) return;
    if (this.readOnly && !this.isDisabled) group.setAttribute('aria-readonly', 'true');
    else group.removeAttribute('aria-readonly');
  }

  private reports(options: TanreiRadioButton[]) {
    // RGP-12: a set without a radio button still draws its rows.
    if (!options.length) report(this, 'RGP-12', 'the radio group holds no radio button; put tanrei-radio-button elements in its default slot');
    // RGP-12: radio buttons and nothing else that can be operated.
    const others = [...this.querySelectorAll('*')].some((element) => !(element instanceof TanreiRadioButton) && element.closest(this.localName) === this && (FIELD_CONTROL in element || element.matches(OTHER_CONTROLS)));
    if (others) report(this, 'RGP-12', 'the radio group holds a control that is not a radio button; it holds radio buttons and nothing else that can be operated');
    if (options.some((option) => option.name)) report(this, 'RGP-12', 'a radio button of the radio group has a name of its own, which is ignored: the group is its group (RAD-25)');
    // RGP-3: values the group cannot select by.
    if (options.some((option) => option.value === '')) report(this, 'RGP-3', 'a radio button of the radio group has no value, so it cannot be selected: give each a value that is unique in the group');
    const seen = new Set<string>();
    for (const option of options) {
      if (option.value !== '' && seen.has(option.value)) report(this, 'RGP-3', `two radio buttons share the value "${option.value}"; the first is the one it selects`);
      seen.add(option.value);
    }
    if (this.value !== '' && options.length && !seen.has(this.value)) report(this, 'RGP-3', `value "${this.value}" is the value of no radio button, so none is selected; the value is kept`);
  }

  // RGP-1: the field group's own element, in its radio-group kind, around the slot the product's radio buttons pass
  // through — exactly as a product writes a field group of radio buttons. RGP-10: it is the one radio group.
  protected override render() {
    return html`<tanrei-field-group part="field-group" exportparts=${GROUP_PARTS.attribute} kind="radio-group" spacing="controls" ${forward(this, GROUP)} .disabled=${this.isDisabled}><slot></slot></tanrei-field-group>`;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiRadioGroup);
if (!customElements.get('tanrei-radio-group')) customElements.define('tanrei-radio-group', TanreiRadioGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-radio-group': TanreiRadioGroup;
  }
}
