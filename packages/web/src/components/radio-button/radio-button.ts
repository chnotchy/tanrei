import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AvailabilityController, PressController, SelectionController, markConditionChange, report, selectionRippleOrigin, syncFocusStyle } from '../../primitives/index.js';
import { styles } from './radio-button.styles.js';
import { FocusedStop, disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** What `change` carries: the value of the option that became selected. */
export interface TanreiRadioButtonChangeDetail {
  value: string;
}

/**
 * RAD-25: what a radio group (`<tanrei-radio-group>`) is to the radio buttons that stand in it. The option takes its
 * group from it — the members, and so the tab stop and each position — and tells it what changed on itself.
 */
export interface TanreiRadioButtonOwner extends HTMLElement {
  /** Its radio buttons, in the order given. */
  readonly options: TanreiRadioButton[];
  /** One of them changed its `checked` (`selection`: true), its `value` or its `disabled`. */
  optionChanged(option: TanreiRadioButton, selection: boolean): void;
  /** A person selected one of them: where it would fire its `input`, then its `change`, it tells the group instead, which fires its own. */
  optionSelected(option: TanreiRadioButton, event: 'input' | 'change'): void;
}

/** Numbers the native radios, so that each has a name of its own (see `render()`). */
let instances = 0;

/** The arrow keys and the direction each moves in a left-to-right layout (RAD-4). */
const STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * Lets people choose exactly one option from a small group shown all at once.
 *
 * Contract: specs/radio-button.spec.json. Every visual value comes from `--tanrei-comp-radio-button-*` tokens, one set
 * per condition (unselected, selected) and state: how a state looks is the active design system's decision.
 *
 * A group is the options with one `name` in the same form — or, outside any form, in the same document or shadow root —
 * as for a native radio. The options keep it themselves: selecting one clears the others (RAD-3), the arrow keys move
 * through the enabled ones and select as they go (RAD-4), and the group has one tab stop (RAD-5). Put the options in an
 * element with `role="radiogroup"` and a name (`aria-labelledby`), or in a `<fieldset>` with a `<legend>` (RAD-16).
 *
 * Form-associated: while selected it submits `value` under `name`, resets to its `checked` attribute and follows a
 * disabled `<fieldset>`. It selects itself before it fires `input` and `change`; the option it replaced fires nothing.
 *
 * @tag tanrei-radio-button
 * @csspart container - The round state layer behind the ring (hover, focus, press).
 * @csspart ring - The ring: a thin stroke while unselected, thickened inward while selected.
 * @csspart fill - What the ring leaves inside it, less the fill inset, in both conditions (clear while unselected by default).
 * @csspart label - The visible label.
 * @attr {string} form - The id of the form the radio button belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The user selected this option; `checked` is already true.
 * @fires {CustomEvent<TanreiRadioButtonChangeDetail>} change - The user selected this option; `detail.value` is its value.
 */
export class TanreiRadioButton extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'radio-button');
  /** Disabled under the focus it holds, its stop keeps its `tabindex` for one frame, as the platform's own control keeps focus (src/primitives/disabled-while-focused.ts). */
  private readonly stop = new FocusedStop(this);
  static override styles = [styles, hiddenHost];

  static formAssociated = true;

  /**
   * The parts this element documents: the one list a composed element exports from (W4, item 3), held to the
   * `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'ring', 'fill', 'label'];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    checked: { type: Boolean },
    value: { type: String },
    name: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    error: { type: Boolean, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    tabStop: { state: true },
    position: { state: true },
    groupSize: { state: true },
  };

  /** Whether this option is the one chosen in its group (the spec's `selected`, a native radio's `checked`). */
  checked = false;

  /** What this option stands for: carried by `change`, and submitted with a form. */
  value = '';

  /** The group this option belongs to: the options with this name in the same form (or root) exclude each other. */
  name = '';

  /** Prevents interaction; the option is skipped by the focus order and by the arrow keys. */
  disabled = false;

  /** Marks the option as part of an answer that was refused: the error form of its condition is drawn. A radio group or a field group in error puts its radio buttons there itself; this is for options grouped without one. It exposes no invalid state — the radio role has none; the group says it. */
  error = false;

  /** The text that names the option: drawn next to the ring and used as the accessible name. */
  label = '';

  /** Draws no visible label but keeps `label` as the accessible name (the `label-hidden` attribute). */
  labelHidden = false;

  /** RAD-5: whether this option is the group's one tab stop. Set by the group it stands in; not an attribute. */
  protected tabStop = true;

  /** RAD-16: this option's position in its group (1-based). Set by the group it stands in; not an attribute. */
  protected position = 1;

  /** RAD-16: the size of its group. Set by the group it stands in; not an attribute. */
  protected groupSize = 1;

  /** Form association, a click on the host, Enter (src/primitives/selection.ts). */
  private readonly selection = new SelectionController(this, () => this.input, {
    requiredState: false,
    // RAD-26: a field or a field group in error puts the option in its error form (FLD-8, FGR-8). It reads the frame's
    // `invalid` for that alone: the option is never exposed as invalid.
    errorCondition: true,
    named: () => !!this.label,
    // RAD-25: in a radio group that is not defined yet its frame — the field group in that group's shadow root — is not
    // drawn yet either: a field or a field group around the radio group is not asked in its place. The group asks again.
    waits: () => {
      const group = this.closest<TanreiRadioButtonOwner>('tanrei-radio-group');
      return !!group && !Array.isArray(group.options);
    },
  });

  /** RAD-11 / RAD-12: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot.querySelector('.container'),
    holdCarrier: () => this.renderRoot.querySelector('.control'),
    disabled: () => this.selection.disabled,
    keys: [' '],
    origin: selectionRippleOrigin(() => this.renderRoot.querySelector('.container')),
  });

  /**
   * The native radio's own name. Each is alone in its shadow root, so the name groups nothing and, having no form owner,
   * submits nothing; but WebKit's Tab skips a radio whose name and form equal those of the radio focus leaves — for two
   * nameless radios in shadow roots, always — so each gets a name no other has.
   */
  private readonly nativeName = `tanrei-radio-${++instances}`;

  /** Where the group was looked for while connected: the group it leaves is updated from there. */
  private root: ParentNode | null = null;

  /** Whether it was disabled — by itself, by a disabled `<fieldset>` or by its frame — when its group last set its stop. */
  private wasDisabled = false;

  /** RAD-26: whether it was drawn in error — by its own `error` or by its frame — when it was last drawn. */
  private wasInError = false;

  /** RAD-26: in error by its own `error`, or by the field, the field group or the radio group that frames it. */
  private get inError(): boolean {
    return this.error || this.selection.field.invalid;
  }

  private get input() {
    return this.renderRoot.querySelector('input');
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.selection.form;
  }

  /** RAD-25: the radio group it stands in, once that element is defined; `null` where it forms its group by `name`. */
  private get owner(): TanreiRadioButtonOwner | null {
    const group = this.closest<TanreiRadioButtonOwner>('tanrei-radio-group');
    return group && Array.isArray(group.options) ? group : null;
  }

  /**
   * RGP-9: where the browser's message for a radio group that lacks an answer points, and what it then focuses: the
   * native radio — the element itself takes no focus, and a message anchored on it is not shown.
   *
   * @internal
   */
  get validationAnchor(): HTMLElement | null {
    return this.input;
  }

  /**
   * RAD-25: the radio group it stands in has the tab stop and each position set again (its options came, left or moved).
   * @internal
   */
  regroup() {
    this.syncGroup();
  }

  /** Disabled by its own `disabled` or by a disabled `<fieldset>` around it. */
  get isDisabled(): boolean {
    return this.selection.disabled;
  }

  /** `element.click()` selects it as a person would, and does nothing while disabled. */
  override click() {
    this.selection.click();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.root = this.getRootNode() as ParentNode;
    void this.updateComplete.then(() => this.syncGroup());
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    const root = this.root;
    this.root = null;
    // The group it left: its tab stop and its size change.
    if (root && this.name) for (const other of TanreiRadioButton.named(root, this.localName, this.name)) other.syncGroup();
  }

  formAssociatedCallback() {
    this.syncGroup();
  }

  formResetCallback() {
    // RAD-25: in a radio group the group is the form's control, and returns to its own first value.
    if (this.owner) return;
    this.checked = this.hasAttribute('checked');
  }

  formStateRestoreCallback(state: string | null) {
    if (this.owner) return;
    this.checked = state === 'true';
  }

  formDisabledCallback(disabled: boolean) {
    this.selection.formDisabledCallback(disabled);
  }

  /** The options with `name` under `root`, in document order. */
  private static named(root: ParentNode, tag: string, name: string): TanreiRadioButton[] {
    return [...root.querySelectorAll(tag)].filter((el): el is TanreiRadioButton => el instanceof TanreiRadioButton && el.name === name);
  }

  /** This option's group, in document order: the options with its name in its form (or its root, outside a form). */
  private group(): TanreiRadioButton[] {
    // RAD-25: in a radio group the group is its options, whatever their `name`.
    const owner = this.owner;
    if (owner) return owner.options;
    if (!this.name || !this.isConnected) return [this];
    const form = this.form;
    // RAD-25: one of this name that stands in a radio group is that group's, not this one's.
    return TanreiRadioButton.named(this.getRootNode() as ParentNode, this.localName, this.name).filter((el) => el.form === form && !el.owner);
  }

  /** RAD-5 / RAD-16: one tab stop — the selected option, else the first enabled one — and each option's position. */
  private syncGroup() {
    const members = this.group();
    const enabled = members.filter((m) => !m.isDisabled);
    const stop = enabled.find((m) => m.checked) ?? enabled[0];
    members.forEach((member, index) => {
      member.tabStop = member === stop;
      member.position = index + 1;
      member.groupSize = members.length;
    });
  }

  /** RAD-1 / RAD-4: the user selected this option. It selects itself, then tells; nothing happens if it already was. */
  private selectByUser() {
    if (this.checked || this.isDisabled) return;
    this.checked = true;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent<TanreiRadioButtonChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
  }

  /** RAD-13: where style queries are missing, the focus style is read when focus arrives. */
  private onFocus() {
    syncFocusStyle(this, this.input);
  }

  /** RAD-4: the arrow keys move to the next or previous enabled option, wrapping, and select it; RTL mirrors left and right. */
  private onKeyDown(event: KeyboardEvent) {
    this.selection.onKeyDown(event);
    this.press.onKeyDown(event);
    const step = STEPS[event.key];
    if (!step || event.altKey || event.ctrlKey || event.metaKey) return;
    // RAD-25: a radio group keeps the arrow keys for its radio buttons (RGP-5).
    if (this.owner) return;
    event.preventDefault();
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const direction = horizontal && getComputedStyle(this).direction === 'rtl' ? -step : step;
    const enabled = this.group().filter((m) => !m.isDisabled);
    const at = enabled.indexOf(this);
    if (at < 0) return;
    const next = enabled[(at + direction + enabled.length) % enabled.length];
    next.focus();
    next.selectByUser();
  }

  /** A click on the label's text or on the target around the ring is the label's; only the input's click is let out. */
  private onRootClick(event: Event) {
    if (event.target !== this.input) event.stopPropagation();
  }

  /** The native control has already switched: mark the change of condition before anything can style it. */
  private onClick() {
    markConditionChange(this.renderRoot.querySelector('.root'));
  }

  /** RAD-1: the native radio was selected (a click, Space, assistive technology); a selected one fires nothing (RAD-2). */
  private onInput(event: Event) {
    event.stopPropagation();
    markConditionChange(this.renderRoot.querySelector('.root'));
    this.checked = true;
    // RAD-25: in a radio group its selection is reported by the group's events, and by none of its own.
    const owner = this.owner;
    if (owner) return owner.optionSelected(this, 'input');
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private onChange() {
    const owner = this.owner;
    if (owner) return owner.optionSelected(this, 'change');
    this.dispatchEvent(new CustomEvent<TanreiRadioButtonChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
  }

  /** RAD-15 / RAD-20: a change of condition takes the selection motion (src/primitives/selection.ts). */
  protected override willUpdate(changed: PropertyValues<this>) {
    // RAD-26: the error coming or going is a change of condition too — by the prop, or by the frame, which changes no
    // property.
    const inError = this.inError;
    if (this.hasUpdated && (changed.has('checked') || inError !== this.wasInError)) markConditionChange(this.renderRoot.querySelector('.root'));
    this.wasInError = inError;
  }

  protected override updated(changed: PropertyValues<this>) {
    // RAD-3: an option that became selected — by the user or by the app — clears the rest of its group, silently.
    if (changed.has('checked') && this.checked) for (const other of this.group()) if (other !== this && other.checked) other.checked = false;
    // RAD-5: the stop is the selected option while it is enabled, else the first enabled one — so it is set again when
    // this option's disabled state changes by any way: its own `disabled`, a disabled `<fieldset>` around it, or the
    // field group or radio group that frames it (which tell it by the field's connection, and change no property).
    const off = this.isDisabled;
    const offChanged = off !== this.wasDisabled;
    this.wasDisabled = off;
    if (changed.has('checked') || changed.has('name') || changed.has('disabled') || offChanged) {
      this.syncGroup();
      // The group it left when its name changed.
      const previous = changed.get('name') as string | undefined;
      if (previous && this.root) for (const other of TanreiRadioButton.named(this.root, this.localName, previous)) other.syncGroup();
    }
    this.selection.setFormValue(this.checked ? this.value : null, String(this.checked));
    // RAD-25: in a radio group it submits nothing itself, and the group is told what changed here; in no group at all —
    // neither a radio group nor a name — it is a group of one, and a debug build says so.
    const owner = this.owner;
    if (owner) {
      this.selection.internals.setFormValue(null);
      // (Its disabled state as its frame gave it, too: the group's stop is what its form's message is anchored on.)
      if (changed.has('checked') || changed.has('value') || changed.has('disabled') || offChanged) owner.optionChanged(this, changed.has('checked'));
    } else if (changed.has('name') && !this.name && !this.closest('tanrei-radio-group')) {
      report(this, 'RAD-25', 'the radio button stands in no group: put it in a tanrei-radio-group, or give the options that exclude each other one name');
    }
    // RAD-18: an option without a name still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label && !this.selection.field.label) report(this, 'RAD-18', 'label is empty, so the radio button has no accessible name; give it a label');
  }

  protected override render() {
    const visible = !!this.label && !this.labelHidden;
    // The native radio supplies the role, checked / not checked, focusability, Space and the disabled state; the options
    // keep the group's arrow keys and single tab stop themselves (each native radio is alone in its shadow root). The
    // name is `label`, visible or not; the drawn text is hidden from assistive technology so it is announced once.
    return html`
      <label
        class="root"
        ?data-error=${this.inError}
        @click=${this.onRootClick}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
      >
        <span class="control">
          <input
            class="native"
            type="radio"
            name=${this.nativeName}
            .checked=${live(this.checked)}
            ?disabled=${this.selection.disabled}
            tabindex=${this.stop.keeps(this.selection.disabled) || this.tabStop ? nothing : '-1'}
            aria-label=${this.selection.field.name(this.label) || nothing}
            aria-description=${this.selection.field.description() || nothing}
            aria-posinset=${this.position}
            aria-setsize=${this.groupSize}
            @click=${this.onClick}
            @input=${this.onInput}
            @change=${this.onChange}
            @keydown=${this.onKeyDown}
            @keyup=${this.press.onKeyUp}
            @blur=${this.press.onBlur}
            @focus=${this.onFocus}
          />
          <span part="container" class="container" data-tanrei-shape aria-hidden="true"></span>
          <span part="ring" class="ring" data-tanrei-shape aria-hidden="true"><span part="fill" class="fill"></span></span>
        </span>
        ${visible ? html`<span part="label" class="label" aria-hidden="true">${this.label}</span>` : nothing}
      </label>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiRadioButton);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiRadioButton);
if (!customElements.get('tanrei-radio-button')) customElements.define('tanrei-radio-button', TanreiRadioButton);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-radio-button': TanreiRadioButton;
  }
}
