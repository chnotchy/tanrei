import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  PressController,
  SelectionController,
  markConditionChange,
  report,
  selectionRippleOrigin,
  syncFocusStyle,
} from '../../primitives/index.js';
import { styles } from './checkbox.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** CHK-12: the glyphs of the icon set the checkbox draws — the spec's names, not values. */
const CHECK_GLYPH = 'check';
const DASH_GLYPH = 'remove';

/** What `change` carries: the new value of `checked` (`indeterminate` is then false). */
export interface TanreiCheckboxChangeDetail {
  checked: boolean;
}

/**
 * CHK-23: what a checkbox group is to the checkboxes that stand in it (`<tanrei-checkbox-group>`). A checkbox in one
 * takes `checked` from it, fires nothing of its own and tells it instead.
 */
export interface TanreiCheckboxOwner extends HTMLElement {
  /**
   * A person switched `member`: told where the checkbox would have fired its `input` — with what its native checkbox
   * then says — and again where it would have fired its `change`.
   */
  memberSwitched(member: TanreiCheckbox, event: 'input' | 'change', checked?: boolean): void;
  /** `member` changed: its `checked` (`checked` is true), or its value or its `disabled`. */
  memberChanged(member: TanreiCheckbox, checked: boolean): void;
}

/** The elements that hold a set of controls: the nearest one around a checkbox says whose it is (CHK-23, CKG-11). */
const SETS = 'tanrei-checkbox-group, tanrei-field-group, tanrei-radio-group';
const GROUP = 'tanrei-checkbox-group';
/** What a checkbox submits where no `value` was given: the platform's own word, which is no entry of a group's list. */
const NO_VALUE = 'on';

/**
 * Lets people turn one independent choice on or off, show a parent choice that is only partly on, and mark a required
 * choice left unmade.
 *
 * Contract: specs/checkbox.spec.json. Every visual value comes from `--tanrei-comp-checkbox-*` tokens, one set per
 * condition (unselected, selected, indeterminate and their `error-` forms) and state: how a state looks is the active
 * design system's decision. How a press is answered and how keyboard focus is drawn are the system's choices of kind
 * (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * Form-associated: with a `name` it submits `value` (default "on") while checked, resets to its `checked` attribute,
 * honours `required` and a disabled `<fieldset>`, as a native checkbox does. It switches its own `checked` (and clears
 * `indeterminate`) before it fires `input` and `change`. The semantics are a native checkbox in the shadow root, named
 * by `label`; a click on the visible label toggles it.
 *
 * Inside a `<tanrei-checkbox-group>` (CHK-23) it is a choice of that set: its `checked` is the group's — whether the
 * group's list holds its `value` —, it submits nothing itself whatever `name` it carries, `required` is not read, and
 * it fires no `input` and no `change`: the group fires one `change` with the list. A checkbox that carries no `value`
 * has none there (the "on" a bare checkbox submits is not read). Taken out of the group it is as it is anywhere.
 *
 * @tag tanrei-checkbox
 * @csspart container - The round state layer behind the box (hover, focus, press).
 * @csspart box - The box: its fill and outline.
 * @csspart mark - The check and the dash: the icon set's `check` and `remove` glyphs, centered on the box.
 * @csspart label - The visible label.
 * @attr {string} form - The id of the form the checkbox belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The user switched it; `checked` is already the new value.
 * @fires {CustomEvent<TanreiCheckboxChangeDetail>} change - The user switched it; `detail.checked` (and the element's `checked`) is the new value.
 */
export class TanreiCheckbox extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'checkbox');
  static override styles = [styles, hiddenHost];

  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'box', 'mark', 'label'];

  static override properties: PropertyDeclarations = {
    checked: { type: Boolean },
    indeterminate: { type: Boolean, reflect: true },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    required: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String },
  };

  /** Whether the choice is on. The `checked` attribute is the default a form reset returns to (as on a native checkbox). */
  checked = false;

  /** Shows the choice as partly on. Wins over `checked` for what is drawn and announced; activation clears it (CHK-2). */
  indeterminate = false;

  /** Marks the choice as invalid: the error form of the condition is drawn and it is exposed as invalid. */
  error = false;

  /** Prevents interaction and removes the checkbox from the focus order. */
  disabled = false;

  /** The text that names the choice: drawn next to the box and used as the accessible name. */
  label = '';

  /** Draws no visible label but keeps `label` as the accessible name (the `label-hidden` attribute). */
  labelHidden = false;

  /** Web only: the form cannot be submitted while this is unchecked (native constraint validation). */
  required = false;

  /** Web only: the name it is submitted under. */
  name = '';

  /** Web only: what it submits while checked. */
  value = 'on';

  /** Form association, a click on the host, Enter (src/primitives/selection.ts). */
  private readonly selection = new SelectionController(this, () => this.input, {
    errorCondition: true,
    named: () => !!this.label,
    // CHK-23: in a checkbox group that is not defined yet its frame — the field group in that group's shadow root — is
    // not drawn yet either: a field group around the checkbox group is not asked in its place. The group asks again.
    waits: () => {
      const set = this.closest<TanreiCheckboxOwner>(SETS);
      return !!set && set.localName === GROUP && typeof set.memberSwitched !== 'function';
    },
  });

  /** CHK-9 / CHK-10: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot.querySelector('.container'),
    holdCarrier: () => this.renderRoot.querySelector('.control'),
    disabled: () => this.selection.disabled,
    keys: [' '],
    origin: selectionRippleOrigin(() => this.renderRoot.querySelector('.container')),
  });

  /** CHK-19: a glyph is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.mark'));

  private get input() {
    return this.renderRoot.querySelector('input');
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.selection.form;
  }

  /**
   * CHK-23: the checkbox group it stands in, once that element is defined — the nearest set of controls around it,
   * where that is a checkbox group; `null` where it is a checkbox of its own.
   */
  private get owner(): TanreiCheckboxOwner | null {
    let set: Element | null = this.closest(SETS);
    // The checkbox a group brings itself — its select-all checkbox — stands in the group's shadow root, in the field
    // group that frames the set: the group is the element that shadow root belongs to (CKG-8, CKG-12).
    const root = set?.getRootNode();
    if (set && set.localName !== GROUP && root instanceof ShadowRoot && root.host.localName === GROUP && set.parentNode === root) set = root.host;
    return set && set.localName === GROUP && typeof (set as TanreiCheckboxOwner).memberSwitched === 'function' ? (set as TanreiCheckboxOwner) : null;
  }

  /**
   * CHK-23, CKG-2: the entry of a group's list it stands for — the `value` it was given — or `null` where it was given
   * none: neither the attribute nor a value other than the "on" every checkbox has.
   *
   * @internal
   */
  get entry(): string | null {
    return this.value !== '' && (this.value !== NO_VALUE || this.hasAttribute('value')) ? this.value : null;
  }

  /**
   * CKG-8: where the browser's message for a group that lacks an answer points, and what it then focuses: the native
   * checkbox, as for the checkbox's own message.
   *
   * @internal
   */
  get validationAnchor(): HTMLElement | null {
    return this.input;
  }

  /** CHK-23: put in a group, or taken out of one, it is the other kind of checkbox from then on. */
  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.requestUpdate();
  }

  /** `element.click()` switches it as a person would, and does nothing while disabled. */
  override click() {
    this.selection.click();
  }

  formResetCallback() {
    // CHK-23: in a group the reset is the group's, which returns to its first value.
    if (this.owner) return;
    this.checked = this.hasAttribute('checked');
  }

  formStateRestoreCallback(state: string | null) {
    // CHK-23: in a group the group's list is what is restored.
    if (this.owner) return;
    this.checked = state === 'true';
  }

  formDisabledCallback(disabled: boolean) {
    this.selection.formDisabledCallback(disabled);
  }

  /** CHK-11: where style queries are missing, the focus style is read when focus arrives. */
  private onFocus() {
    syncFocusStyle(this, this.input);
  }

  private onKeyDown(event: KeyboardEvent) {
    this.selection.onKeyDown(event);
    this.press.onKeyDown(event);
  }

  /**
   * A click on the label's text or on the target around the box is the label's; the browser turns it into the input's
   * click, which is the one the element lets out, so a listener hears one click per activation.
   */
  private onRootClick(event: Event) {
    if (event.target !== this.input) event.stopPropagation();
  }

  /** CHK-2: activation of an indeterminate checkbox checks it, whatever `checked` was (the native one would flip it). */
  private onClick() {
    // The native checkbox has already switched: mark the change before anything can style it.
    markConditionChange(this.renderRoot.querySelector('.root'));
    const input = this.input;
    if (input && this.indeterminate) input.checked = true;
  }

  /** CHK-1: the native input switched; the element takes the new value before anyone hears of it. */
  private onInput(event: Event) {
    event.stopPropagation();
    markConditionChange(this.renderRoot.querySelector('.root'));
    const owner = this.owner;
    if (owner) {
      // CHK-23: `checked` is the group's. It is told what the native checkbox now says and sets `checked` where its
      // list took the entry; where it did not (a checkbox with no value), the native checkbox is drawn back.
      const checked = this.input!.checked;
      owner.memberSwitched(this, 'input', checked);
      if (this.checked === checked) this.indeterminate = false;
      this.requestUpdate();
      return;
    }
    this.checked = this.input!.checked;
    this.indeterminate = false;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private onChange() {
    // CHK-23: the group fires the one `change`.
    const owner = this.owner;
    if (owner) return owner.memberSwitched(this, 'change');
    this.dispatchEvent(new CustomEvent<TanreiCheckboxChangeDetail>('change', { bubbles: true, detail: { checked: this.checked } }));
  }

  /** CHK-13: a change of condition takes the selection motion (src/primitives/selection.ts). */
  protected override willUpdate(changed: PropertyValues<this>) {
    if (this.hasUpdated && (changed.has('checked') || changed.has('indeterminate') || changed.has('error'))) markConditionChange(this.renderRoot.querySelector('.root'));
  }

  protected override updated(changed: PropertyValues<this>) {
    // CHK-23: in a group nothing is submitted, whatever name it carries: the entry is the group's.
    const owner = this.owner;
    this.selection.setFormValue(this.checked && !owner ? this.value : null, String(this.checked));
    this.selection.syncValidity();
    if (owner && (changed.has('checked') || changed.has('value') || changed.has('disabled'))) owner.memberChanged(this, changed.has('checked'));
    // CHK-16: a checkbox without a name still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label && !this.selection.field.label) report(this, 'CHK-16', 'label is empty, so the checkbox has no accessible name; give it a label');
  }

  protected override render() {
    const visible = !!this.label && !this.labelHidden;
    // The native checkbox supplies the role, checked / not checked / mixed, focusability, Space and the disabled state;
    // the <label> around everything makes a click on the visible label (and on the target around the box) its click.
    // The name is `label`, visible or not (CHK-16): the drawn text is hidden from assistive technology so that it is
    // announced once, as the checkbox's name, and not a second time as text.
    // A field or a field group around it gives the name while the checkbox has none, the description, the required
    // state and its error condition (FLD-8, FLD-10, FLD-11, FGR-8): `data-error` draws the error form for either.
    const field = this.selection.field;
    const error = this.error || field.invalid;
    return html`
      <label
        class="root"
        ?data-error=${error}
        @click=${this.onRootClick}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
      >
        <span class="control">
          <input
            class="native"
            type="checkbox"
            .checked=${live(this.checked)}
            .indeterminate=${live(this.indeterminate)}
            ?disabled=${this.selection.disabled}
            ?required=${this.required && !this.owner}
            aria-label=${field.name(this.label) || nothing}
            aria-description=${field.description() || nothing}
            aria-invalid=${error ? 'true' : nothing}
            aria-required=${field.required && !(this.required && !this.owner) ? 'true' : nothing}
            @click=${this.onClick}
            @input=${this.onInput}
            @change=${this.onChange}
            @keydown=${this.onKeyDown}
            @keyup=${this.press.onKeyUp}
            @blur=${this.press.onBlur}
            @focus=${this.onFocus}
          />
          <span part="container" class="container" data-tanrei-shape aria-hidden="true"></span>
          <span part="box" class="box" data-tanrei-shape aria-hidden="true">
            <span class="fill"></span>
            <span part="mark" class="mark check"><span class="ink">${CHECK_GLYPH}</span></span>
            <span part="mark" class="mark dash"><span class="ink">${DASH_GLYPH}</span></span>
          </span>
        </span>
        ${visible ? html`<span part="label" class="label" aria-hidden="true">${this.label}</span>` : nothing}
      </label>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiCheckbox);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiCheckbox);
if (!customElements.get('tanrei-checkbox')) customElements.define('tanrei-checkbox', TanreiCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-checkbox': TanreiCheckbox;
  }
}
