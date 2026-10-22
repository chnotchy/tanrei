import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { AvailabilityController, FieldControlController, type FieldSays, GlyphDrawnController, NativeTextController, OpenAxesController, hostAria, report, syncFocusStyle, delegatedAria, delegatesAria } from '../../primitives/index.js';
import { FloatingLabelController, floatingAsterisk, floatingLabel, triggerEdges } from '../../primitives/field-trigger.js';
import type { TanreiInputBoxSizeRegistry, TanreiInputBoxVariantRegistry } from '../../registry.js';
import '../button/button.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { FormSays } from '../../primitives/form-says.js';
import { browserMissingMessage } from '../../primitives/missing-value.js';
import { AXES, INSET, styles } from './color-input.styles.js';
import { PICKER_START, given, picked, read, readCommitted } from './color-text.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The three looks of the input box (`comp.input-box`): a filled box that draws no label (`stacked`), or the label floating inside a `filled` or `outlined` box. A design system may leave some out or add values. */
export type TanreiColorInputVariant = keyof TanreiInputBoxVariantRegistry;
/** The container's minimum height: the box's `medium` and `large` (`small` is a size of the box this control does not offer). A design system may add values. */
export type TanreiColorInputSize = Exclude<keyof TanreiInputBoxSizeRegistry, 'small'>;
/** `pickerrequest`'s detail: the value the input holds — a color, or the empty string. */
export interface TanreiColorInputPickerRequestDetail {
  value: string;
}
/** `entryerror`'s detail: the text as the person left it, and `invalidText`, the words the input has for it (empty while the product gave none). */
export interface TanreiColorInputEntryErrorDetail {
  text: string;
  message: string;
}

type Layout = 'stacked' | 'filled' | 'outlined';
/** The Button sizes every design system has: the picker button takes the input's size name where Button has it (CLI-27). */
const BUTTON_SIZES = new Set(['small', 'medium', 'large']);

const platformMessages = new Map<string, string>();
/**
 * The browser's own words, in its language, for a constraint a form found unmet: a required control left empty, or a
 * text that is not in the form asked for. They are the platform's words, read from a native input that is never
 * drawn; the color input has none of its own.
 */
function platformMessage(kind: 'missing' | 'format'): string {
  if (kind === 'missing') return browserMissingMessage('text');
  let message = platformMessages.get(kind);
  if (message === undefined) {
    const probe = document.createElement('input');
    probe.pattern = '#[0-9a-f]{6}';
    probe.value = '-';
    message = probe.validationMessage;
    platformMessages.set(kind, message);
  }
  return message;
}

/** Runs `task` once the document has been read: an element upgraded while its children are still being parsed has none yet. */
function whenParsed(task: () => void) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', task, { once: true });
  else task();
}

/** The element that has focus, through every shadow root. */
function deepActiveElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/**
 * The box in which people set one color: a text value they can read, type and paste, a sample of it beside the text, a
 * button that asks for a picker and — in the looks that float one — its label inside the box. It looks and measures
 * like a text input. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which
 * names it, describes it and marks it — or use `<tanrei-color-field>`, which is the two together.
 *
 * Contract: specs/color-input.spec.json. Every visual value is a token: the box is drawn from
 * `--tanrei-comp-input-box-*`, the one set every input box is drawn from (CLI-45) — the swatch has the box's icon
 * size — and the swatch's shape and hairline from `--tanrei-comp-color-input-*`; the swatch's fill is the value itself; the picker
 * button is a `<tanrei-button>`, drawn from Button's own tokens.
 *
 * ```html
 * <!-- A row of a list of colors that names each: the box alone, named by its own label. -->
 * <tanrei-color-input label="Primary, tone 40" value="#0f766e" picker picker-label="Choose the color of Primary, tone 40"></tanrei-color-input>
 *
 * <tanrei-field label="Brand color" supporting-text="Six hexadecimal digits, like #0f766e.">
 *   <tanrei-color-input name="brand" value="#0f766e" invalid-text="Enter six hexadecimal digits, like #0f766e."></tanrei-color-input>
 * </tanrei-field>
 * ```
 *
 * `value` is a number sign and six hexadecimal digits in lowercase (`#0f766e`) — an opaque sRGB color — or the empty
 * string for no color, and never anything else. The text is the person's: nothing typed is refused, replaced or
 * reformatted. It is read on every edit — six hexadecimal digits in either case, with or without the number sign, the
 * white space around them left out — and `value` is the color it reads as, or empty. `input` fires when that changes
 * `value`. When focus leaves or Enter is pressed the input commits: a color is rewritten in the value's own form and
 * `change` fires if the value differs from the one last committed; a text that is not a color is kept, marked as an
 * error and reported with `entryerror` — and to the Field that frames it, which shows `invalidText` (FLD-28).
 *
 * With `picker`, a button at the end asks for a picker: it fires a cancelable `pickerrequest` and, unless that was
 * cancelled, presents the browser's own color picker. A pick is an edit by the person. The input draws no picker
 * surface of its own: a product that has one cancels the request, presents it and sets `value`.
 *
 * Inside a `<tanrei-field>` it takes the Field's name, description and states — required, invalid, disabled — through
 * the connection every framed control uses (`src/primitives/field.ts`), and says what only it knows: that it draws the
 * label itself while its look floats one, how far its value's text is inset — past the swatch — and its own refusal
 * of a text that is not a color, with its words (CLI-43). Bare, `label` names it, and a filled or outlined input
 * draws that label floating.
 *
 * It is a block as wide as its place, and exactly as tall as its box (CLI-44). It is a form-associated element: it
 * takes `name`, submits its value, resets to the `value` attribute, is restored on navigation, follows
 * `<fieldset disabled>` and reports `valueMissing` while its Field says it is required and `value` is empty, and
 * `badInput` while an entry error lasts.
 *
 * It has no words of its own: `invalidText`, `pickerLabel` and `label` are the product's, in the product's language.
 *
 * @tag tanrei-color-input
 * @csspart container - The input's box.
 * @csspart outline - A stacked color input's inner line, or an outlined one's border.
 * @csspart active-indicator - The line along the bottom of a filled color input.
 * @csspart label - The label that floats in a filled or an outlined color input.
 * @csspart requirement-label - The required asterisk after a floating label.
 * @csspart swatch - The sample of the value: a square filled with exactly the value's color. Decorative.
 * @csspart input - The native `<input>`: the value as text.
 * @csspart picker-button - The picker button, a `<tanrei-button>`.
 * @attr {string} form - The id of the form the color input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The person changed the value: an edit of the text made it a color, another color or no color, or a color was picked in the browser's picker. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`, nor for an edit that leaves `value` as it was.
 * @fires change - The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * @fires {CustomEvent<TanreiColorInputPickerRequestDetail>} pickerrequest - The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 * @fires {CustomEvent<TanreiColorInputEntryErrorDetail>} entryerror - The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 */
export class TanreiColorInput extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'color-input');
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'outline', 'active-indicator', 'label', 'requirement-label', 'swatch', 'input', 'picker-button'];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: { type: String },
    name: { type: String, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    invalidText: { type: String, attribute: 'invalid-text' },
    picker: { type: Boolean, reflect: true },
    pickerLabel: { type: String, attribute: 'picker-label' },
    text: { state: true },
    entryError: { state: true },
    focused: { state: true },
    formDisabled: { state: true },
  };

  /** The look, as the text inputs beside it: `stacked` is a filled box that draws no label — the label of the Field that frames it stands above it; `filled` and `outlined` float the label inside the box. Use one style per form. A value the color input does not know by name is laid out as stacked. Reflected. */
  variant: TanreiColorInputVariant = 'stacked';

  /** The container's minimum height: `medium` or `large` (48 / 56 in the default system), the text input's two sizes. The hit area always meets the minimum target. Reflected. */
  size: TanreiColorInputSize = 'medium';

  /** The color the input holds: a number sign and six hexadecimal digits in lowercase (`#0f766e`), an opaque sRGB color; or empty for no color. It is never a half-typed text: while the input holds something that is not a color, `value` is empty. A text set in capitals or without its number sign is held in the value's own form; one that is not a color is treated as empty. The `value` attribute is also the value a form reset returns to. */
  // An accessor, not a field: the value is the person's at every moment. The `input` of an edit is
  // the browser's own event of the native text element — or of the browser's color input, for a pick — and is
  // composed: a capturing listener on an ancestor hears it before the element's own listener has run. So what the
  // person has just done to the native element and the element has not taken yet is read from that element, as the
  // element is about to read it (CLI-18, CLI-29). `event.target.value` is then the new value in every listener, and
  // in every listener of an element composed around this one.
  get value(): string {
    if (this.awaited || this.native.composing) return this.held;
    const text = this.nativeInput;
    if (text && text.value !== this.nativeSeen) {
      const reading = read(text.value);
      return reading.kind === 'color' ? reading.value : '';
    }
    const well = this.picking ? this.nativePicker : null;
    if (well && well.value !== this.pickSeen) return picked(well.value) ?? this.held;
    return this.held;
  }

  set value(value: string) {
    this.held = value;
  }

  /** The value the element holds: what the product set, or the person's last edit or pick as the element took it. */
  private held = '';
  /** The native text element, once drawn, and what it held when the element last wrote to it or took from it. */
  private nativeInput: HTMLInputElement | null = null;
  private nativeSeen: string | undefined;
  /** What the browser's color input held when the element last wrote to it or took a pick from it. */
  private pickSeen: string | undefined;

  /** The name the value is submitted under in a form. Reflected. */
  name = '';

  /** Names the input for assistive technology where no Field frames it; a filled or outlined input also draws it, as the label that floats in its box. Inside a Field leave it empty: the Field's label names the input, and is what floats. */
  label = '';

  /** Does not draw the floating label of a filled or outlined input, which stays the accessible name (`label-hidden`). Inside a Field, hide the label on the Field. A stacked input draws no label, so this changes nothing there. */
  labelHidden = false;

  /** Draws the input in its error condition and exposes it as invalid. A Field sets it from its own error; set it here only where no Field frames the input. What a color means is the product's to validate; the input never sets this itself, and enters an error of its own only while the text it was left with is not a color. */
  error = false;

  /** Prevents focus, editing, the picker button and form submission. Inside a Field, disable the Field, so that its label follows. */
  disabled = false;

  /** The words for an input committed with a text that is not a color (`invalid-text`), in the product's language: given to the Field that frames the input, which shows them as its error text. While it is empty that Field shows its own `errorText`. Where no Field frames the input they are its description while the error lasts. */
  invalidText = '';

  /** Shows the picker button. Activated, it fires `pickerrequest` and, unless that was cancelled, presents the browser's own color picker. Reflected. */
  picker = false;

  /** The accessible name of the picker button, in the product's language (`picker-label`). Required while `picker` is set. */
  pickerLabel = '';

  /** The text in the input: the person's while they edit, the value in its own form otherwise (CLI-17, CLI-19). */
  protected text = '';
  /** CLI-20: the input was committed with a text that is not a color, and holds it still. */
  protected entryError = false;
  /** CLI-22: the input has focus, however it was gained. The picker button's focus is its own. */
  protected focused = false;
  /** Set by the platform (the element's `formDisabledCallback`): an ancestor `<fieldset disabled>`, or its own `disabled` attribute. */
  protected formDisabled = false;

  private readonly internals: ElementInternals;
  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says: FormSays;
  /** The value the color input made or took from the product last: another `value` is the product's (CLI-21). */
  private ownValue = '';
  /** CLI-19: the value last committed — when the product set it, or at the last `change`. */
  private base = '';
  /** CLI-19: the person changed the text since it was last committed or written. */
  private edited = false;
  /** CLI-21: the product set a value while an input method was composing: its text is written when the composition ends, and is not the person's. */
  private awaited = false;
  /** CLI-29: the browser's picker was presented and no sign of its closing has been seen yet. */
  private picking = false;
  /** The Field's answer changed since the last update: the floating label may have other lines (CLI-15). */
  private frameChanged = false;

  /** CLI-41: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'color-input', behavior: 'CLI-41', axes: AXES });
  /**
   * CLI-43: the input's side of the exchange with the Field that frames it (src/primitives/field.ts). It takes the
   * Field's name, description and states, whether the label is hidden and whether an asterisk follows it; and it says
   * what only it knows — that it draws the label, how far its value's text is inset, its own refusal of an entry. It
   * has an error condition of its own (CLI-9). No Field: it is drawn as a bare input.
   */
  private readonly frame = new FieldControlController(this, {
    errorCondition: true,
    named: () => !!this.label.trim(),
    says: () => this.saysToField,
    changed: () => (this.frameChanged = true),
  });
  /** CLI-17, CLI-21: the text and the native element kept in step without breaking an input method (src/primitives/native-text.ts). */
  private readonly native = new NativeTextController({
    input: () => this.input,
    value: () => this.text,
    // What an input method is composing is not read (CLI-17): the text follows the element and nothing is said. A
    // value the product set meanwhile is the text that waits for the composition's end (CLI-21).
    setValue: (text) => {
      if (text === this.text || this.awaited) return;
      this.text = text;
      this.edited = true;
    },
  });
  /** CLI-15: a floating label that does not fit on one line is given the room its lines take. */
  private readonly floating = new FloatingLabelController(this);
  /** A glyph the color input draws by name is drawn once the icon set can draw it; until then nothing stands in its place. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.picker-glyph'));

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.says = new FormSays(this, this.internals);
    // A `<label for>` of the page activates the element itself: its input takes focus, and nothing changes.
    this.addEventListener('click', (event) => {
      if (event.composedPath()[0] === this) this.focus();
    });
  }

  private get input(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.input') ?? null;
  }

  private get nativePicker(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.native-picker') ?? null;
  }

  private get pickerButton(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.picker-button') ?? null;
  }

  /** CLI-31: disabled by its own `disabled`, a fieldset's, or the Field's or the field group's around it. */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled || this.frame.disabled;
  }

  /** How the variant is laid out: filled and outlined by name, every other value as stacked (CLI-41). */
  private get layout(): Layout {
    return this.variant === 'filled' || this.variant === 'outlined' ? this.variant : 'stacked';
  }

  /** CLI-11: the accessible name — its own label, else the label of the Field that frames it. */
  private get name_(): string {
    return this.frame.name(this.label.trim() ? this.label : '');
  }

  /** CLI-11: its Field says it is required. It has no requirement of its own. */
  private get required_(): boolean {
    return this.frame.required;
  }

  /** CLI-9: in error — its own `error`, its Field's, or an entry error while it lasts. */
  private get inError(): boolean {
    return this.error || this.frame.invalid || this.entryError;
  }

  /** CLI-15: the label floats in the box — a filled or an outlined input with a name, unless its own `labelHidden` or its Field's says to draw none. */
  private get labelled(): boolean {
    return this.layout !== 'stacked' && !!this.name_ && !this.labelHidden && !this.frame.labelHidden;
  }

  /** CLI-20: the words of an entry error while it lasts — `invalidText`; empty where the product gave none. */
  private get refusalText(): string {
    return this.entryError ? this.invalidText : '';
  }

  /**
   * CLI-43: what the input says to the Field that frames it. That it draws the label while its look floats one — its
   * name, or nothing while the label is hidden; the Field draws no label row either way. How far the value's text
   * stands from its start edge — past the padding beside the swatch, the swatch and the gap — and the text padding it
   * keeps at its end edge, with or without the picker button, as lengths of the box's tokens (`INSET`, in the styles).
   * And an entry error, with its words. No count: a color has one length.
   */
  private get saysToField(): FieldSays {
    const size = /^[a-z0-9][a-z0-9-]*$/.test(this.size) ? this.size : 'medium';
    return {
      drawsLabel: this.layout !== 'stacked',
      inset: INSET(size),
      refusal: this.entryError ? { text: this.refusalText } : null,
    };
  }

  /**
   * CLI-11, CLI-20: the input's description — the words of an entry error while no Field frames it (a Field shows
   * them and gives them back as its own description, FLD-28), and then the description its Field gives.
   */
  private get described(): string {
    return [this.frame.framed ? '' : this.refusalText, this.frame.description()].filter(Boolean).join(' ');
  }

  /** CLI-27: the Button size with the input's size name, or Button's default for a size Button does not have. */
  private get pickerSize(): string {
    if (BUTTON_SIZES.has(this.size)) return this.size;
    const own = /^[a-z0-9][a-z0-9-]*$/.test(this.size) && getComputedStyle(this).getPropertyValue(`--tanrei-comp-button-container-height-${this.size}`).trim();
    return own ? this.size : 'medium';
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while its Field says the color input is required and `value` is empty, `badInput` while it holds a committed text that is not a color. */
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

  /** Moves focus to the input — never to the picker button. */
  override focus(options?: FocusOptions) {
    if (this.keepFocusUntilRendered(options)) return;
    this.input?.focus(options);
  }

  override blur() {
    this.forgetKeptFocus();
    this.input?.blur();
  }

  /** Selects the text in the input. */
  select() {
    this.input?.select();
  }

  formResetCallback() {
    const { value } = given(this.getAttribute('value'));
    this.value = value;
    // The same value as the one held is still a new one: the text and an entry error go.
    this.took(value);
    this.requestUpdate();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    const value = typeof state === 'string' ? given(state).value : '';
    this.value = value;
    this.took(value);
    this.requestUpdate();
  }

  /**
   * The platform's word on whether the element is disabled: by a `<fieldset disabled>` around it, and by its own
   * `disabled` attribute too. Lit writes that attribute in the middle of an update, where a change of state would not
   * be drawn: it is taken once that update is over, so an input whose `disabled` was unset is drawn enabled again.
   */
  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /**
   * The form's view: the value — a color in its own form, or the empty string — left out while disabled (CLI-31); a
   * missing value while its Field says it is required (CLI-11), and a bad input while an entry error lasts (CLI-20).
   * Said when the color input is drawn, and at once when its value changes: a listener of `input` or `change`, and the
   * form Enter submits, already see the new value. The message of an entry error is `invalidText`, else what its Field
   * shows for it, else the browser's own words; of a missing value, the browser's own words. Said through `FormSays`,
   * so that an element composed around the input repeats it (src/primitives/form-says.ts).
   */
  private syncForm() {
    this.says.value(this.inert_ ? null : this.ownValue, this.ownValue);
    const missing = this.required_ && this.ownValue === '';
    if ((this.entryError || missing) && !this.inert_) {
      const message = (this.entryError ? this.refusalText || this.frame.description() || platformMessage('format') : '') || platformMessage('missing') || this.frame.state?.requiredText || this.name_ || '#rrggbb';
      this.says.validity({ badInput: this.entryError, valueMissing: missing }, message, this.input ?? undefined);
    } else this.says.validity();
  }

  // ── CLI-16 … CLI-21: the text and the value ───────────────────────────────────────────────────────────────────

  /** CLI-21: the product gave a value: it is shown in the input and the swatch, an entry error ends, and nothing is said. */
  private took(value: string) {
    this.ownValue = value;
    this.base = value;
    this.edited = false;
    this.entryError = false;
    this.text = value;
    this.awaited = this.native.composing;
  }

  /** The color input makes `value` the value itself, and the form sees it at once. */
  private keep(value: string) {
    this.value = value;
    this.ownValue = value;
    this.syncForm();
  }

  /**
   * CLI-17, CLI-29: `input`, once, when an edit or a pick changed the value; `value` is already the new one. The event
   * is the browser's own, of the native element the person edited or picked in, where that event leaves the shadow
   * root by itself — it is composed and bubbles, and outside its target is this element. It is then left to pass, and
   * nothing is dispatched in its place: a second event would be heard twice by a capturing listener on an ancestor.
   * Where it would not leave — a pick taken as the picker closes, from its `change` — the element dispatches one.
   */
  private said(native: Event) {
    if (native.type === 'input' && native.bubbles && native.composed) return;
    native.stopPropagation();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /** CLI-19, CLI-29: `change`, once, while the value differs from the one last committed. `value` is already the new one. */
  private changed() {
    if (this.ownValue === this.base) return;
    this.base = this.ownValue;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * CLI-17, CLI-18, CLI-20: the person changed the text. Nothing is rewritten: the text is theirs. The whole text is
   * read, and `value` becomes the color it reads as, or empty. An entry error ends with the edit. Returns whether the
   * edit changed `value`: `input` is heard for such an edit, and for no other.
   */
  private typed(text: string): boolean {
    this.nativeSeen = this.nativeInput?.value;
    if (this.awaited) {
      // The composition ended on the product's value: it is shown, and nothing is said.
      this.awaited = false;
      return false;
    }
    this.text = text;
    this.edited = true;
    this.entryError = false;
    const reading = read(text);
    const value = reading.kind === 'color' ? reading.value : '';
    if (value === this.ownValue) {
      this.syncForm();
      return false;
    }
    this.keep(value);
    return true;
  }

  #onInput(event: Event) {
    // CLI-17: a composition is left to the native element; the text is read when it ends, and nothing is said meanwhile.
    // An edit that leaves `value` as it was says nothing either: the native element's own `input` stops here, at the
    // shadow root. The `input` of an edit that changed `value` is the color input's (`said()`).
    if (this.native.composingInput(event) || !this.typed((event.target as HTMLInputElement).value)) event.stopPropagation();
    else this.said(event);
  }

  /**
   * CLI-19, CLI-20: commits the text. A color is rewritten in the value's own form — the number sign added, the digits
   * in lowercase, the white space gone; a text of white space alone is no color and is cleared; a text that is not
   * empty and not a color is kept as typed and enters the entry error (`entryerror`, with `invalidText`). Then
   * `change`, once, while the value differs from the one last committed. A text the person did not change since the
   * last commit commits nothing. A commit also reads three digits (#fff) as the six they stand for (#ffffff): the
   * value becomes that color, `input` says so, and then `change`.
   */
  private commit() {
    if (!this.edited || this.inert_) return;
    this.edited = false;
    const reading = readCommitted(this.text);
    if (reading.kind === 'invalid') {
      this.entryError = true;
      this.syncForm();
      this.dispatchEvent(new CustomEvent<TanreiColorInputEntryErrorDetail>('entryerror', { bubbles: true, composed: true, detail: { text: this.text, message: this.invalidText } }));
    } else {
      this.entryError = false;
      this.text = reading.kind === 'color' ? reading.value : '';
      const value = reading.kind === 'color' ? reading.value : '';
      if (value !== this.ownValue) {
        this.keep(value);
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      } else this.syncForm();
    }
    this.changed();
  }

  /**
   * CLI-19: the action key commits and, inside a form, then asks for its submission, as a native input does — its own
   * form, or the form of the element composed around it (src/primitives/default-button.ts, `formOf`). While an input
   * method composes, every key is its own (CLI-17).
   */
  #onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || this.inert_) return;
    if (event.isComposing || this.native.composing || event.keyCode === 229) return;
    if (event.key !== 'Enter') return;
    this.commit();
    const form = formOf(this, this.form);
    if (form) {
      event.preventDefault();
      pressDefaultButton(form);
    }
  }

  #onFocus() {
    this.focused = true;
    // CLI-23: where style queries are missing, the focus style is read when focus arrives.
    syncFocusStyle(this, this.renderRoot.querySelector<HTMLElement>('.field'));
  }

  /** CLI-19: the input lost focus: the text is committed. */
  #onBlur() {
    this.focused = false;
    this.commit();
  }

  // ── CLI-27 … CLI-29: the picker ───────────────────────────────────────────────────────────────────────────────

  /**
   * CLI-28: the picker button asks for a picker — `pickerrequest`, once, with the value — and then, unless the product
   * cancelled the request, presents the browser's own color picker showing the value, or black while the input holds
   * none, inside the same user activation. Where the browser has none to present, nothing is presented, nothing
   * changes and no focus moves.
   */
  #onPickerClick() {
    if (this.inert_) return;
    const request = new CustomEvent<TanreiColorInputPickerRequestDetail>('pickerrequest', { bubbles: true, composed: true, cancelable: true, detail: { value: this.ownValue } });
    if (!this.dispatchEvent(request)) return;
    const native = this.nativePicker;
    if (!native) return;
    native.value = this.ownValue || PICKER_START;
    this.pickSeen = native.value;
    try {
      if (typeof native.showPicker === 'function') native.showPicker();
      else native.click();
    } catch {
      return;
    }
    this.picking = true;
    window.addEventListener('focus', this.onPageFocus);
    document.addEventListener('focusin', this.onPageFocus, true);
  }

  /**
   * CLI-29: a pick in the browser's picker is an edit by the person: the color is written into the input in the value's
   * own form, the swatch drawn in it, an entry error ended, and `input` fired when it changed the value — for every
   * pick the browser reports, a drag across the picker included.
   */
  #onPick(event: Event) {
    const well = event.target as HTMLInputElement;
    const value = this.inert_ ? null : picked(well.value);
    this.pickSeen = well.value;
    // A report that is no pick, or a pick of the value it holds already, says nothing: the browser's event stops here.
    if (value === null || value === this.ownValue) event.stopPropagation();
    if (value === null) return;
    this.text = value;
    this.edited = false;
    this.entryError = false;
    if (value === this.ownValue) {
      this.syncForm();
      return;
    }
    this.keep(value);
    this.said(event);
  }

  /** CLI-29: the browser's picker closed: its `change`, or — where a browser gives none — the page's next focus. */
  #onPickerChange(event: Event) {
    // A browser that reports a pick only when its picker closes: the pick is taken first. The browser's own `change`
    // stops here: the color input's is fired by `pickerClosed`, while the value differs from the one last committed.
    this.#onPick(event);
    event.stopPropagation();
    this.pickerClosed('picker');
  }

  /**
   * Where a browser gives no sign that its picker closed (nothing was picked, or it tells no one), the next focus of
   * the page counts as one: the window's, when a picker that is a window of its own goes, or any element's.
   */
  private readonly onPageFocus = () => this.pickerClosed('page');

  private unwatchPage() {
    window.removeEventListener('focus', this.onPageFocus);
    document.removeEventListener('focusin', this.onPageFocus, true);
  }

  /**
   * CLI-29: when the picker closes, `change` once while the value differs from the one last committed, and focus on
   * the picker button, as a popover returns focus to its opener. Focus is never taken from where the person has put it
   * since: the button takes it only while nothing else in the page has it, or what has it is this input's own native
   * picker.
   */
  private pickerClosed(signal: 'picker' | 'page') {
    if (signal === 'page' && !this.picking) return;
    this.picking = false;
    this.unwatchPage();
    if (!this.isConnected) return;
    this.changed();
    const active = deepActiveElement();
    const nowhere = !active || active === document.body || active === document.documentElement;
    const mine = !!active && (active === this.nativePicker || active === this);
    if (nowhere || mine) this.pickerButton?.focus();
  }

  /**
   * CLI-24: a press on the container's padding, on the swatch or on a floating label moves focus to the input and does
   * nothing else. A press in the input places the caret; the picker button keeps its own press. CLI-25: while the
   * picker button is shown a press on the swatch is the picker button's instead (`#onSwatchClick`), and moves no focus.
   */
  #onContainerPress(event: MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest('.input, .picker')) return;
    event.preventDefault();
    if (this.picker && target.closest('.swatch')) return;
    if (!this.inert_) this.focus();
  }

  /**
   * CLI-25: while the picker button is shown, a press on the swatch — by pointer or touch — does what a press on the
   * picker button does (CLI-28), as a label passes its press to its control: the swatch takes no focus and draws no
   * answer of its own, and the keyboard's way stays the picker button.
   */
  #onSwatchClick(event: MouseEvent) {
    if (!this.picker || this.inert_ || event.button !== 0) return;
    this.#onPickerClick();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatchPage();
    this.picking = false;
    this.focused = false;
  }

  protected override willUpdate(changed: PropertyValues) {
    if (this.inert_) this.focused = false;

    // CLI-21: a value the product set is held in the value's own form, shown in the input and the swatch, ends an entry
    // error and says nothing. One that is what the value already is leaves the text as the person typed it.
    if (changed.has('value')) {
      const set = this.held;
      const { value, valid } = given(set);
      if (!valid) whenParsed(() => report(this, 'CLI-21', `value "${String(set)}" is not a color (a number sign and six hexadecimal digits, like #0f766e); it is treated as empty`, { once: false }));
      if (set !== value) this.value = value;
      if (value !== this.ownValue) this.took(value);
    }
  }

  protected override updated(changed: PropertyValues) {
    // CLI-17, CLI-21: the text is shown in the element — never into a composition.
    this.native.show();
    // What the native element holds now is what the element gave it, or took from it (see `value`).
    this.nativeInput = this.input;
    this.nativeSeen = this.nativeInput?.value;
    // CLI-15: the label's lines follow its text — its own, or the name its Field gives —, the asterisk, the look, the size and the picker button.
    if (this.frameChanged || changed.has('label') || changed.has('labelHidden') || changed.has('variant') || changed.has('size') || changed.has('picker')) this.floating.measure();
    this.frameChanged = false;
    // CLI-27: the picker button says it opens a dialog, on the native button that carries its semantics.
    const button = this.pickerButton as (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
    if (button) {
      void button.updateComplete?.then(() => {
        const native = button.shadowRoot?.querySelector('button');
        if (native) hostAria(native, { 'aria-haspopup': 'dialog' });
      });
    }

    this.syncForm();
    whenParsed(() => this.reports());
  }

  /** What a debug build tells the developer; the color input still renders. */
  private reports() {
    if (!this.isConnected) return;
    // CLI-11: an input no Field names, with no label of its own, still renders. (A Field with an empty label says so itself: FLD-10.)
    if (!this.label.trim() && !this.frame.state) report(this, 'CLI-11', 'label is empty and no field frames it, so the color input has no accessible name; put it in a field with a label, or give it a label');
    if (this.picker && !this.pickerLabel.trim()) report(this, 'CLI-27', 'pickerLabel is empty, so the picker button has no accessible name; give it one in the product’s language');
    // CLI-20: framed, the Field reports a refusal it has no words for (FLD-28).
    if (this.entryError && !this.invalidText && !this.frame.framed) report(this, 'CLI-20', 'the text is not a color and invalidText does not say so; give the color input an invalidText that says the form the value takes');
  }

  protected override render() {
    const layout = this.layout;
    const stacked = layout === 'stacked';
    const inert = this.inert_;
    const name = this.name_;
    const described = this.described;
    const wrong = this.inError;
    const floating = this.labelled;
    // CLI-7: the asterisk follows a floating label while the Field says so (FLD-25); never outside a Field.
    const asterisk = floating && this.frame.requiredMark === 'asterisk' ? floatingAsterisk('asterisk') : nothing;
    // CLI-11, CLI-30: the input is a text box named by its own label or its Field's — drawn or not — whose value is the
    // text it shows, described by what its Field gives. It names itself (`aria-label`): a name taken from a text that
    // is not drawn is no name to a checker. The description is a hidden element of this shadow root: an id cannot
    // cross to the Field's rows. The floating label, the glyph and the swatch are kept from assistive technology: the
    // name and the value's text say them.
    return html`
      <div
        class="field"
        data-layout=${layout}
        ?data-error=${wrong}
        ?data-disabled=${inert}
        ?data-focused=${this.focused && !inert}
        ?data-labelled=${floating}
        ?data-has-value=${this.text !== ''}
        ?data-picker=${this.picker}
      >
        <div part="container" class="container" data-tanrei-shape aria-disabled=${inert ? 'true' : nothing} @mousedown=${this.#onContainerPress}>
          <span part="swatch" class="swatch" data-tanrei-shape aria-hidden="true" @click=${this.#onSwatchClick} ?data-filled=${this.ownValue !== ''} style=${styleMap({ '--_value': this.ownValue || null })}></span>
          <div class="body">
            <input
              id="input"
              part="input"
              class="input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              dir="ltr"
              ?disabled=${inert}
              ${delegatedAria(this, { 'aria-label': name, 'aria-describedby': described && 'description', 'aria-invalid': wrong && 'true', 'aria-required': this.required_ && 'true' })}
              @input=${this.#onInput}
              @keydown=${this.#onKeyDown}
              @focus=${this.#onFocus}
              @blur=${this.#onBlur}
              @compositionstart=${this.native.onCompositionStart}
              @compositionend=${this.native.onCompositionEnd}
            />
          </div>
          ${this.picker
            ? html`<span class="picker"
                ><input
                  class="native-picker"
                  type="color"
                  tabindex="-1"
                  aria-hidden="true"
                  ?disabled=${inert}
                  @input=${this.#onPick}
                  @change=${this.#onPickerChange}
                  @click=${(event: Event) => event.stopPropagation()}
                /><tanrei-button part="picker-button" class="picker-button" variant="text" size=${this.pickerSize} label=${this.pickerLabel} ?disabled=${inert} @click=${this.#onPickerClick}
                  ><span slot="icon" class="picker-glyph"><span class="ink">palette</span></span></tanrei-button
                ></span
              >`
            : nothing}
          ${floatingLabel({ floating, label: name, asterisk })} ${triggerEdges({ stacked, floating, label: name, asterisk })}
        </div>
        ${described ? html`<span id="description" hidden>${described}</span>` : nothing}
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiColorInput);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiColorInput);
// The product's ARIA on the host is the element's that carries the role; the disabled state is its own.
delegatesAria(TanreiColorInput, { owns: ['aria-disabled'], sentence: 'CLI-46' });
if (!customElements.get('tanrei-color-input')) customElements.define('tanrei-color-input', TanreiColorInput);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-color-input': TanreiColorInput;
  }
}
