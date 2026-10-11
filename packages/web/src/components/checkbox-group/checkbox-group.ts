import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { ComposedElement, exported, forward } from '../../primitives/composed.js';
import { FIELD_CONNECT, FIELD_CONTROL, FieldControlController, type FieldConnection } from '../../primitives/field.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { report } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import { TanreiCheckbox, type TanreiCheckboxOwner } from '../checkbox/checkbox.js';
import { TanreiFieldGroup, type TanreiFieldGroupOrientation, type TanreiFieldGroupRequiredMark, type TanreiFieldGroupRequirement } from '../field-group/field-group.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';

// The field group's own types are the checkbox group's: it has none of its own for the props it passes on.
export type { TanreiFieldGroupOrientation, TanreiFieldGroupRequiredMark, TanreiFieldGroupRequirement };

/** What `change` carries: the list after the change, which the group already holds — a copy. */
export interface TanreiCheckboxGroupChangeDetail {
  value: string[];
}

/** CKG-1: the props that are the field group's, given to it unchanged. `disabled` is the field group's too, joined with a disabled fieldset's (W6). */
const GROUP = ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'requirement', 'requiredMark', 'requiredText', 'optionalText', 'orientation'] as const;

/** W4: the field group's documented parts, under its own names (`::part(label)` is the set's label, as one level down). */
const GROUP_PARTS = exported(TanreiFieldGroup);
/**
 * W4: the select-all checkbox's documented parts. Each is exported with the part's own name after `select-all-`: the
 * field group has a `label` too, drawn at the same time, and a bare `box` would read as every box of the set — whose
 * checkboxes are the product's own elements, styled as they are anywhere (`tanrei-checkbox::part(box)`).
 */
const SELECT_ALL_PARTS = exported(TanreiCheckbox, Object.fromEntries(TanreiCheckbox.parts.map((part) => [part, { as: `select-all-${part}` }])));

/** CKG-11: what can be operated and is not a Tanrei control, among the product's own elements. */
const OTHER_CONTROLS = 'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';
/** The elements that hold a set of controls: the nearest one around a checkbox says whose it is (CHK-23, CKG-11). */
const SETS = 'tanrei-checkbox-group, tanrei-field-group, tanrei-radio-group';

type Asking = Record<symbol, { ask?: () => void } | undefined>;

/** W8: under the key a control keeps its side of the field's connection, what a frame defined later calls to be asked again. */
function keepAsking(host: Element, ask: () => void) {
  (host as unknown as Asking)[FIELD_CONTROL] = { ask };
}

/**
 * Asks one question that may have several answers among a few choices shown all at once. Built from a field group
 * (`<tanrei-field-group>`) and checkboxes (`<tanrei-checkbox>`): the field group's label, requirement, description and
 * one error around the product's own checkboxes, whose checked values the group holds as one list under one name, and —
 * where `select-all-label` is given — one more checkbox before the first that checks them all.
 *
 * Contract: specs/checkbox-group.spec.json. `<tanrei-checkbox-group name="notify" label="Notify me by"><tanrei-checkbox
 * value="email" label="Email" checked></tanrei-checkbox>…</tanrei-checkbox-group>`: the checkboxes are the element's
 * children and stay in the product's light DOM; each stands for its `value`.
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the field group's own element around the
 * select-all checkbox and a slot, so it draws nothing of its own and has no token — every
 * `--tanrei-comp-field-group-*` and `--tanrei-comp-checkbox-*` value reaches the members by inheritance, and one
 * instance is set apart by setting such a property on this element. Each of the eleven props of the frame is the
 * field group's, set on it unchanged. One level down, the same by hand: `<tanrei-field-group label="Notify me by">
 * <tanrei-checkbox name="notify" value="email" label="Email" checked></tanrei-checkbox>…</tanrei-field-group>` — for
 * checkboxes that each need a name of their own, a set that holds something else, or another rule for "all".
 *
 * `value` is a property only: an array of the checked values, in the order of the checkboxes, followed by the entries
 * no checkbox stands for, which are kept; it is copied in and out. The first value is written as `checked` on the
 * children; once the product has set `value`, `value` decides. A person's switch — of one checkbox, or of the select-all
 * checkbox — sets `value` and fires `input` and one `change`; the checkboxes fire nothing of their own.
 *
 * Form-associated: it submits one entry per value under `name` — what checkboxes of one name submit — and its
 * checkboxes submit nothing; a checkbox disabled by itself keeps its entry; a disabled group submits nothing. It
 * returns to its first value when the form is reset, is restored on navigation, follows `<fieldset disabled>`, and
 * reports `valueMissing` while `requirement="required"` and the list is empty, with `error-text`, else the required
 * text, else `label` as its message. It never sets `error` itself.
 *
 * The element is not focusable itself and has no role: every checkbox is a stop of its own, `focus()` goes to the first
 * enabled one, and the group, its name and its description are the field group's (`label`, never `aria-label`).
 *
 * @tag tanrei-checkbox-group
 * @slot - The checkboxes of the set, in the order given: `<tanrei-checkbox value="…">` elements.
 * @csspart field-group - The frame: the `<tanrei-field-group>` it is built from.
 * @csspart select-all - The select-all checkbox: the `<tanrei-checkbox>` the group brings while `select-all-label` is given.
 * @exportparts tanrei-field-group
 * @exportparts tanrei-checkbox container: select-all-container, box: select-all-box, mark: select-all-mark, label: select-all-label
 * @attr {string} form - The id of the form the checkbox group belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The person switched a checkbox of the set, or the select-all checkbox; `value` is already the new list.
 * @fires {CustomEvent<TanreiCheckboxGroupChangeDetail>} change - The person switched a checkbox of the set, or the select-all checkbox; `detail.value` is a copy of the new list, which the group already holds. Fired once per action, by the group and not by its checkboxes.
 */
export class TanreiCheckboxGroup extends ComposedElement implements TanreiCheckboxOwner {
  /** CKG-8: the one control the form meets; its checkboxes submit nothing. */
  static formAssociated = true;

  /**
   * Its parts, once: the two members and what each exports.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['field-group', 'select-all', ...GROUP_PARTS.names, ...SELECT_ALL_PARTS.names];

  static override properties: PropertyDeclarations = {
    value: { attribute: false },
    name: { type: String, reflect: true },
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
    orientation: { type: String, reflect: true },
    selectAllLabel: { type: String, attribute: 'select-all-label' },
    formDisabled: { state: true },
  };

  /**
   * The values of the checked checkboxes: an array of strings, empty while none is checked — in the order of the
   * checkboxes, followed by the entries that are the value of no checkbox, which are kept. A property only: the first
   * value is written as `checked` on the children. The group sets it when a person switches a checkbox, and fires
   * `change`; once the product has set it, it decides which checkboxes are checked. It is copied in and out.
   */
  get value(): string[] {
    return this.ordered();
  }

  set value(value: string[]) {
    const given = Array.isArray(value) ? value.map(String) : [];
    // CKG-2: an entry held twice is held once.
    if (new Set(given).size !== given.length) report(this, 'CKG-2', 'value holds an entry twice; it is held once');
    this.list = [...new Set(given)];
    // CKG-3: from here `value` decides, and a checkbox that arrives marked `checked` against it is shown as it says.
    this.decided = true;
    // CKG-8: what the product gave before the group was first drawn is its first value, which a reset returns to.
    if (!this.hasUpdated) this.first = [...this.list];
    this.requestUpdate('value');
  }

  /** Web only: the name each entry of the list is submitted under. */
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

  /** @from tanrei-field-group.requirement */
  requirement: TanreiFieldGroupRequirement = 'none';

  /** @from tanrei-field-group.requiredMark */
  requiredMark: TanreiFieldGroupRequiredMark = 'auto';

  /** @from tanrei-field-group.requiredText */
  requiredText = '';

  /** @from tanrei-field-group.optionalText */
  optionalText = '';

  /** @from tanrei-field-group.orientation */
  orientation: TanreiFieldGroupOrientation = 'vertical';

  /** Not empty: the group brings one more checkbox before the first, labelled by this text ("All of these"), that checks or unchecks every checkbox of the set a person can switch and shows checked, unchecked or indeterminate from them (`select-all-label`). Empty: there is none. The instance's own words: it is never read from the product's words. */
  selectAllLabel = '';

  /** W6, item 6: a disabled `<fieldset>` around the element, or its own `disabled` attribute, as the platform says it. */
  protected formDisabled = false;

  protected override readonly hostNameSentence = 'CKG-9';

  private readonly internals = this.attachInternals();

  /** CKG-2: the list — each entry once, in the order it was given or added. `value` gives it in the order of the checkboxes. */
  private list: string[] = [];

  /** CKG-3: the product has set `value`. */
  private decided = false;

  /** CKG-8: the value the product gave before the group was first drawn; `null` where the first value is `checked` on the children. */
  private first: string[] | null = null;

  /** CKG-3, CKG-10: the checkboxes the group has checked by value at least once: one that arrives marked `checked` is not yet among them. */
  private readonly known = new WeakSet<TanreiCheckbox>();

  /** CKG-3: the `checked` the group last gave each checkbox: another one is the product's own word. */
  private readonly gave = new WeakMap<TanreiCheckbox, boolean>();

  /** CKG-4: a person's switch has set `value`, and its `change` is still to be fired. */
  private switching = false;

  /** CKG-10: checkboxes that come, leave or move, however deep in the product's own elements. */
  private readonly observer = new MutationObserver(() => this.requestUpdate());

  /** FGR-15: inside a field group it follows that group's `disabled`, as the field group in its shadow root does itself; here for what a form is told (CKG-8). */
  private readonly outer = new FieldControlController(this, { takes: 'disabled', framed: true, named: () => true });

  /** CKG-8: the required text in the product's words, where the instance gives none: what the form's validation says. */
  private readonly words = new WordsController(this);

  constructor() {
    super();
    // W8: a frame defined after the group has the group ask again — the group itself, and the field group inside it.
    keepAsking(this, () => {
      this.outer.ask();
      for (const member of this.members) (member as unknown as Asking)[FIELD_CONTROL]?.ask?.();
    });
    this.addEventListener(FIELD_CONNECT, this.onEarlyQuestion as EventListener);
  }

  /**
   * W8, read for members the product places: a checkbox of the set asks its frame when it is connected, which may be
   * before the group has drawn the field group that answers it. A question that reaches the host from the product's own
   * elements was answered by nobody inside: it goes no further — a field or a field group around the checkbox group is
   * not the frame of its checkboxes — and is asked again once the field group is there (`askAgain`). The questions of
   * the group itself and of the field group in its shadow root, to a frame around the group, pass.
   */
  private readonly onEarlyQuestion = (event: CustomEvent<FieldConnection>) => {
    const control = event.detail?.control;
    if (!control || control === this || control.getRootNode() === this.shadowRoot) return;
    event.stopPropagation();
  };

  /** W8: every control among the product's own elements that has no frame yet asks the field group, now that it is drawn. */
  private askAgain() {
    for (const element of this.querySelectorAll('*')) (element as unknown as Asking)[FIELD_CONTROL]?.ask?.();
  }

  /** The select-all checkbox, while it is drawn. */
  private get selectAll(): TanreiCheckbox | null {
    return this.renderRoot?.querySelector<TanreiCheckbox>('tanrei-checkbox') ?? null;
  }

  /**
   * The checkboxes of the set, in the order given: those whose nearest set of controls this group is — none of a
   * group, of whatever kind, inside it (CKG-11).
   *
   * @internal
   */
  get checkboxes(): TanreiCheckbox[] {
    return [...this.querySelectorAll('tanrei-checkbox')].filter((checkbox): checkbox is TanreiCheckbox => checkbox instanceof TanreiCheckbox && checkbox.closest(SETS) === this);
  }

  /** Disabled by its own `disabled`, by a disabled `<fieldset>` around it, or by a field group around it. */
  private get isDisabled(): boolean {
    return this.disabled || this.formDisabled || this.outer.disabled;
  }

  /** CKG-4: the list as `value` gives it — the entries of the checkboxes in the order of the checkboxes, then those of no checkbox, in the order they had. */
  private ordered(checkboxes = this.checkboxes): string[] {
    const held = new Set(this.list);
    const first: string[] = [];
    for (const checkbox of checkboxes) {
      const entry = checkbox.entry;
      if (entry !== null && held.delete(entry)) first.push(entry);
    }
    return [...first, ...this.list.filter((entry) => held.has(entry))];
  }

  /** CKG-12: the checkboxes the select-all checkbox stands for — those the product did not disable one by one, and that stand for an entry. */
  private switchable(checkboxes = this.checkboxes): TanreiCheckbox[] {
    return checkboxes.filter((checkbox) => !checkbox.disabled && checkbox.entry !== null);
  }

  /** CKG-5, W7: the first enabled checkbox it shows — the select-all checkbox where one is drawn. */
  protected override get control(): HTMLElement | null {
    if (this.isDisabled) return null;
    const all = this.selectAll;
    if (all && !all.disabled) return all;
    return this.checkboxes.find((checkbox) => !checkbox.disabled) ?? null;
  }

  /** W7, item 2: what has focus among its checkboxes loses it — they are the product's children, outside the shadow root. */
  override blur() {
    let active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (!active || !this.contains(active)) return super.blur();
    while (active.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    (active as HTMLElement).blur();
  }

  /** The form the group belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while the group is required and its list is empty. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.internals.reportValidity();
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
    // CKG-8: back to the value it was first given, without a change — the list the product gave before the group was
    // drawn, or, where it gave none, what the markup says: `checked` on the children, as a native checkbox resets.
    if (this.first) {
      this.list = [...this.first];
      this.decided = true;
    } else {
      this.list = [...new Set(this.checkboxes.filter((checkbox) => checkbox.hasAttribute('checked') && checkbox.entry !== null).map((checkbox) => checkbox.entry!))];
      this.decided = false;
    }
    this.requestUpdate('value');
  }

  formStateRestoreCallback(restored: string | File | FormData | null) {
    let list: unknown = [];
    try {
      list = typeof restored === 'string' ? JSON.parse(restored) : [];
    } catch {
      list = [];
    }
    this.list = Array.isArray(list) ? [...new Set(list.map(String))] : [];
    // What is restored is the answer the person had given: it decides, as a value the product set does.
    this.decided = true;
    this.requestUpdate('value');
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** CKG-2: checks and unchecks by the list; each checkbox takes its own selection motion (CHK-13). */
  private check(checkboxes: TanreiCheckbox[]) {
    const held = new Set(this.list);
    for (const checkbox of checkboxes) {
      const entry = checkbox.entry;
      // A checkbox without a value stands for no entry: it is drawn unchecked.
      const checked = entry !== null && held.has(entry);
      this.known.add(checkbox);
      this.gave.set(checkbox, checked);
      if (checkbox.checked !== checked) checkbox.checked = checked;
    }
  }

  /** CKG-4, CKG-13: the list changed by a person — the checkboxes follow at once, the form is told, and `input` is fired. */
  private switched() {
    const checkboxes = this.checkboxes;
    this.check(checkboxes);
    this.syncForm(checkboxes);
    this.requestUpdate('value');
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private fireChange() {
    this.dispatchEvent(new CustomEvent<TanreiCheckboxGroupChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
  }

  /**
   * CKG-4, CHK-23: a person switched a checkbox of the set, which fires nothing itself and tells the group where it
   * would have fired its `input`, then its `change`. The group takes the entry into its list or out of it before
   * anyone is told, then fires `input` and one `change`.
   * @internal
   */
  memberSwitched(member: TanreiCheckbox, event: 'input' | 'change', checked = false) {
    if (event === 'change') {
      if (!this.switching) return;
      this.switching = false;
      this.fireChange();
      return;
    }
    // CKG-13: the checkbox the group brings itself.
    if (member === this.selectAll) return this.switchAll();
    const entry = member.entry;
    // CKG-2: a checkbox without a value stands for no entry — nothing changes and nothing is emitted. CKG-6: nor while disabled.
    if (entry === null || this.isDisabled) return;
    if (checked === this.list.includes(entry)) return;
    this.list = checked ? [...this.list, entry] : this.list.filter((held) => held !== entry);
    this.switching = true;
    this.switched();
  }

  /**
   * CHK-23: a checkbox of the set changed. CKG-3: `checked` set or cleared on one by the product adds its value to the
   * list or takes it out; anything else — its value, its `disabled` — is checked by value again (CKG-10).
   * @internal
   */
  memberChanged(member: TanreiCheckbox, checked: boolean) {
    // The select-all checkbox is set by the group alone, from the set (CKG-12).
    if (member === this.selectAll) return;
    const entry = member.entry;
    // What the group gave it itself comes back here too, and is no word of the product's.
    if (checked && entry !== null && this.known.has(member) && this.gave.get(member) !== member.checked) {
      this.list = member.checked ? [...this.list.filter((held) => held !== entry), entry] : this.list.filter((held) => held !== entry);
    }
    this.requestUpdate('value');
  }

  /**
   * CKG-13: the person activated the select-all checkbox. While every checkbox a person can switch is checked they are
   * all unchecked, otherwise all checked; a checkbox the product disabled and an entry of no checkbox stay as they are.
   * The select-all checkbox fires nothing of its own (CHK-23): the `input` and the one `change` are the group's.
   */
  private switchAll() {
    if (this.isDisabled) return;
    const entries = [...new Set(this.switchable().map((checkbox) => checkbox.entry!))];
    if (!entries.length) return;
    const held = new Set(this.list);
    const all = entries.every((entry) => held.has(entry));
    this.list = all ? this.list.filter((entry) => !entries.includes(entry)) : [...this.list, ...entries.filter((entry) => !held.has(entry))];
    this.switching = true;
    this.switched();
  }

  /** CKG-8: the entries the form submits, what it restores, and whether an answer is missing. */
  private syncForm(checkboxes = this.checkboxes) {
    const off = this.isDisabled;
    const value = this.ordered(checkboxes);
    let entries: FormData | null = null;
    if (!off && this.name && value.length) {
      entries = new FormData();
      for (const entry of value) entries.append(this.name, entry);
    }
    this.internals.setFormValue(entries, JSON.stringify(value));
    if (!off && this.requirement === 'required' && !value.length) {
      // The product's words: a browser has a sentence for one unchecked box and none for a set. The
      // last resort is the required mark itself, a mark and not a word, so that the flag is never refused.
      const message = [this.errorText, this.words.get('requiredText', this.requiredText), this.label].find((text) => text.trim() !== '') ?? '*';
      // W6, item 3: anchored on the first enabled checkbox — its own native element, which is what takes focus.
      const anchor = (this.control as TanreiCheckbox | null)?.validationAnchor;
      if (anchor) this.internals.setValidity({ valueMissing: true }, message, anchor);
      else this.internals.setValidity({ valueMissing: true }, message);
    } else this.internals.setValidity({});
  }

  /** The group has updated when its checkboxes have: what it gave them, they have taken. */
  protected override async getUpdateComplete(): Promise<boolean> {
    const done = await super.getUpdateComplete();
    await Promise.all(this.checkboxes.map((checkbox) => checkbox.updateComplete));
    return done;
  }

  protected override willUpdate() {
    // CKG-3, CKG-10: a checkbox that arrives marked `checked` adds its value to the list while the product has not set
    // `value`; where it has, `value` decides and the checkbox is shown as it says.
    if (this.decided) return;
    for (const checkbox of this.checkboxes) {
      if (this.known.has(checkbox)) continue;
      const entry = checkbox.entry;
      if (checkbox.checked && entry !== null && !this.list.includes(entry)) this.list = [...this.list, entry];
    }
  }

  protected override updated(changed: PropertyValues) {
    const checkboxes = this.checkboxes;
    const fresh = checkboxes.filter((checkbox) => !this.known.has(checkbox));
    // CKG-2, CKG-10: checked by value.
    this.check(checkboxes);
    // CHK-23: a checkbox that was drawn before the group was defined is the group's from here.
    for (const checkbox of fresh) checkbox.requestUpdate();
    // W8: the checkboxes that asked before the field group was drawn ask it now.
    this.askAgain();
    this.syncForm(checkboxes);
    this.reports(checkboxes);
    super.updated(changed);
  }

  /** What a debug build tells the developer; the group still renders. */
  private reports(checkboxes: TanreiCheckbox[]) {
    // CKG-11: a set without a checkbox still draws its rows.
    if (!checkboxes.length) report(this, 'CKG-11', 'the checkbox group holds no checkbox; put tanrei-checkbox elements, each with a value, in it');
    // CKG-11: checkboxes and nothing else that can be operated.
    const others = [...this.querySelectorAll('*')].some((element) => {
      if (element instanceof TanreiCheckbox && checkboxes.includes(element)) return false;
      // Inside a control or a set of the product's own, the outermost one is what is reported.
      if (element.parentElement?.closest(SETS) !== this) return false;
      return FIELD_CONTROL in element || element.matches(OTHER_CONTROLS);
    });
    if (others) report(this, 'CKG-11', 'the checkbox group holds a control that is not a checkbox of the set; it holds checkboxes and nothing else that can be operated, and makes no entry of its value from another');
    // CKG-2: values the list cannot stand for.
    if (checkboxes.some((checkbox) => checkbox.entry === null)) report(this, 'CKG-2', 'a checkbox of the checkbox group has no value, so it cannot be checked: give each a value that is unique in the group');
    const seen = new Set<string>();
    for (const checkbox of checkboxes) {
      const entry = checkbox.entry;
      if (entry === null) continue;
      if (seen.has(entry)) report(this, 'CKG-2', `two checkboxes share the value "${entry}"; they are checked and unchecked together`);
      seen.add(entry);
    }
  }

  // CKG-1: the field group's own element, around the select-all checkbox while one is asked for and the slot the
  // product's checkboxes pass through — exactly as a product writes a field group of checkboxes.
  protected override render() {
    const switchable = this.switchable();
    const held = new Set(this.list);
    const on = switchable.filter((checkbox) => held.has(checkbox.entry!)).length;
    // CKG-12: checked while each is, indeterminate while some are, unchecked while none is, disabled while there is none.
    const all = switchable.length > 0 && on === switchable.length;
    const selectAll = this.selectAllLabel
      ? html`<tanrei-checkbox
          part="select-all"
          exportparts=${SELECT_ALL_PARTS.attribute}
          .label=${this.selectAllLabel}
          .checked=${live(all)}
          .indeterminate=${live(on > 0 && !all)}
          .disabled=${switchable.length === 0}
        ></tanrei-checkbox>`
      : nothing;
    return html`<tanrei-field-group part="field-group" exportparts=${GROUP_PARTS.attribute} spacing="controls" ${forward(this, GROUP)} .disabled=${this.disabled || this.formDisabled}
      >${selectAll}<slot></slot
    ></tanrei-field-group>`;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiCheckboxGroup);
if (!customElements.get('tanrei-checkbox-group')) customElements.define('tanrei-checkbox-group', TanreiCheckboxGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-checkbox-group': TanreiCheckboxGroup;
  }
}
