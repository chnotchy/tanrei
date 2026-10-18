import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { NativeTextController, report } from '../../primitives/index.js';
import { AutoHeight } from '../../primitives/auto-height.js';
import { pressDefaultButton } from '../../primitives/default-button.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { FormSays } from '../../primitives/form-says.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { styles } from './embedded-text-input.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { CompositionEnd } from '../../primitives/composition-end.js';

/** What the value is: the keyboard, autocorrection and autocapitalization, and nothing else (ETI-17). */
export type TanreiEmbeddedTextInputType = 'text' | 'search' | 'email' | 'url' | 'tel';
/** What Enter does on a hardware keyboard in a multi-line input (ETI-6). */
export type TanreiEmbeddedTextInputEnterKey = 'line-break' | 'action';
/** What the form asks of the input, in a Field's words (ETI-29): `required` behaves as `required` true. */
export type TanreiEmbeddedTextInputRequirement = 'none' | 'required' | 'optional';
const REQUIREMENTS: readonly string[] = ['none', 'required', 'optional'];

/** `action`: the value when the person asked for the action of whatever holds the input. */
export interface TanreiEmbeddedTextInputActionDetail {
  value: string;
}
/** `rowschange`: the number of lines the input is going to show, and whether text scrolls inside it. */
export interface TanreiEmbeddedTextInputRowsChangeDetail {
  rows: number;
  scrolling: boolean;
}

type Native = HTMLInputElement | HTMLTextAreaElement;

/**
 * ETI-17: each type as the native element's attributes. A text area has no `type`: there the keyboard is asked for with
 * `inputmode` alone. An address is plain — neither capitalized nor corrected — and, with a telephone number, laid out
 * left to right (ETI-20).
 */
const TYPES: Record<TanreiEmbeddedTextInputType, { type: string; inputmode?: string; plain?: boolean; ltr?: boolean }> = {
  text: { type: 'text' },
  search: { type: 'search', inputmode: 'search' },
  email: { type: 'text', inputmode: 'email', plain: true, ltr: true },
  url: { type: 'text', inputmode: 'url', plain: true, ltr: true },
  tel: { type: 'tel', inputmode: 'tel', ltr: true },
};
const ENTER_KEYS: readonly string[] = ['line-break', 'action'];

/** ETI-20: a letter is what a text's own direction is told by. */
const STRONG = /\p{L}/u;

/** ETI-6: an on-screen keyboard cannot be told from a hardware one by any web API. The guess: the primary pointer is coarse and cannot hover. */
const onScreenKeyboard = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse) and (hover: none)').matches;

/** The faces the page has asked for have arrived: the text may wrap otherwise then. One promise for every input of a turn. */
let faces: Promise<unknown> | null | undefined;
function facesArrived(): Promise<unknown> | null {
  if (faces === undefined) {
    faces = typeof document === 'undefined' ? null : (document.fonts?.ready ?? null);
    queueMicrotask(() => (faces = undefined));
  }
  return faces;
}

/**
 * The typing alone, for a box that something else draws: the text, a placeholder, the caret and the selection — on one
 * line, or (`multiline`) on lines that wrap, as tall as its lines between `min-rows` and `max-rows` and changing its
 * height with a motion. **It draws no container, fill, edge, padding, label or message, and no focus indication**:
 * whatever holds it — a Tanrei component built from it, or the product's own box — draws the box, shows the focus on
 * the box (`:focus-within`), marks an error, pads the text, names the input (`label`, required: nothing else names it)
 * and decides what its action is. A holder that shows no focus on its box fails WCAG 2.4.7. Where the box is a text
 * field's box, use `<tanrei-text-input>` (or `<tanrei-text-field>`).
 *
 * Contract: specs/embedded-text-input.spec.json.
 *
 * ```html
 * <div class="capsule">
 *   <tanrei-embedded-text-input label="Message" placeholder="Write a message" multiline max-rows="6"></tanrei-embedded-text-input>
 * </div>
 * ```
 *
 * Enter: in a single-line input it emits `action`; in a multi-line one it begins a new line, or — `enter-key="action"`
 * — emits `action`, with Shift+Enter for a new line. Ctrl+Enter and Command+Enter emit `action` under both. An input
 * method's Enter never does, and where the primary pointer is coarse and cannot hover Enter is taken for the return
 * key of an on-screen keyboard and begins a new line. `action` carries the value and does nothing more: the input
 * keeps its value, its selection and its focus. Every `keydown` reaches the page before the input reads it, and one
 * whose default was prevented is not read.
 *
 * The height it takes in its layout is the animated one at every frame, so a holder that sizes itself to its content
 * follows without script. `rowschange` says, before the motion, how many lines it is going to show; `rows` reads that
 * number at any time.
 *
 * The name (`label`), the description (`description`), `error`, `required`, `readonly` and `disabled` are plain props
 * written on the native element; it asks no `<tanrei-field>` for any of them. `focusin` and `focusout` are the
 * platform's and leave the element, and the host matches `:focus-within` while it has focus. `focusAt(x, y)` gives it
 * focus with the caret at the point of the text nearest to a point of the window, for a holder that passes a press on
 * its own padding on; `selectionStart`, `selectionEnd`, `setSelectionRange()`, `setRangeText()` and `select()` are the
 * native element's.
 *
 * Form-associated where it stands in a form itself: it submits its value under its `name`, resets to its `value`
 * attribute, is restored, follows a disabled `<fieldset>` and reports a missing value while `required`; a single-line
 * input then submits the form after `action`, unless that was cancelled. In the shadow root of a holder it has no form.
 *
 * Without script, and until the element is defined, a `<textarea>` or an `<input>` the product wrote as its child is
 * the control; when the element is defined it takes that child's text as its first value where `value` was not given,
 * and hides and disables the child.
 *
 * @tag tanrei-embedded-text-input
 * @csspart input - The native text element: an `<input>`, or a `<textarea>` while `multiline`.
 * @attr {string} form - The id of the form the input belongs to, where it stands outside it: the platform's own attribute. The `form` property is read-only and returns the form element.
 * @fires input - The person changed the value: the native element's own `input` event, which leaves the element as it is. Read the new value from `event.target.value`. Never when `value` is set.
 * @fires change - The person committed a changed value: focus left the input, or `action` was emitted. Bubbles.
 * @fires {CustomEvent<TanreiEmbeddedTextInputActionDetail>} action - The person asked for the action of whatever holds the input, by Enter as `enter-key` says or by Ctrl+Enter or Command+Enter. `detail.value` is the value. Bubbles; cancelable — a cancelled one keeps a single-line input from submitting its form.
 * @fires {CustomEvent<TanreiEmbeddedTextInputRowsChangeDetail>} rowschange - The number of lines the input shows is about to change, or it was first drawn: `detail.rows`, and `detail.scrolling` where the text has more lines and scrolls inside. Once per change, before the height moves. Bubbles.
 */
export class TanreiEmbeddedTextInput extends LitElement {
  static override styles = [styles, hiddenHost];

  /** ETI-19: a control of the form it stands in. */
  static formAssociated = true;

  /** Every point of the element is its text: a press anywhere in it, and `focus()`, reach the native element. */
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /**
   * Its documented parts, once: what an element composed around it exports them from (src/primitives/composed.ts, W4).
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['input'];

  static override properties: PropertyDeclarations = {
    // The default is not reflected, as the text input's is not: nothing reads the attribute, and `type` is a name
    // `:has()` asks about on a page with prose, where a change to it would restyle the subtree.
    type: { type: String, reflect: true, useDefault: true },
    value: { type: String },
    label: { type: String },
    description: { type: String },
    placeholder: { type: String },
    multiline: { type: Boolean, reflect: true },
    minRows: { type: Number, attribute: 'min-rows' },
    maxRows: { type: Number, attribute: 'max-rows' },
    enterKey: { type: String, attribute: 'enter-key' },
    error: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    requirement: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    autocomplete: { type: String },
    name: { type: String, reflect: true },
    formDisabled: { state: true },
  };

  /** What the value is: chooses the keyboard, autocorrection and autocapitalization, and nothing else. It never validates and never obscures. `search` makes the action key of an on-screen keyboard read as search. A value it does not know behaves as `text`. */
  type: 'text' | 'search' | 'email' | 'url' | 'tel' = 'text';

  /** The text. Setting it shows it and fires nothing. The `value` attribute is what a form reset returns to. */
  // An accessor, not a field: the value is the person's at every moment. The native `input` event
  // is composed, and a capturing listener on an ancestor hears it before the element's own listener has run — so what
  // the person has just done to the native element is read from that element.
  get value(): string {
    const native = this.native_;
    return native && native.value !== this.seen ? native.value : this.held;
  }

  set value(value: string) {
    // (Lit wraps this accessor and asks for the update itself.)
    this.held = value === null || value === undefined ? '' : String(value);
  }

  /** The value the element holds: what was set, or the person's last edit as the element took it. */
  private held = '';
  /** The native element, once drawn, and what it held when the element last wrote to it or took from it. */
  private native_: Native | null = null;
  private seen: string | undefined;

  /** The accessible name. Required: the input draws no label and asks no Field for one, so this is the only name it has. Never drawn. */
  label = '';

  /** The accessible description, as text: what a help line, an error text or a count that its holder draws says about what is typed. Never drawn. */
  description = '';

  /** A hint drawn while the value is empty. Never the name. A multi-line input is as tall as the placeholder's lines, within `min-rows` and `max-rows`. */
  placeholder = '';

  /** False: one line that scrolls sideways inside itself. True: lines that wrap, and a height that follows them between `min-rows` and `max-rows`, changed with a motion. */
  multiline = false;

  /** The fewest lines a multi-line input is tall (`min-rows`). Anything below 1 is 1. */
  minRows = 1;

  /** The most lines a multi-line input is tall (`max-rows`); beyond it the text scrolls inside. 0 is no limit; one below `min-rows` is `min-rows`. */
  maxRows = 0;

  /** What Enter does on a hardware keyboard in a multi-line input (`enter-key`). `line-break`: it begins a new line. `action`: it emits `action` and inserts nothing, and Shift+Enter begins a new line. Under both, Ctrl+Enter and Command+Enter emit `action`. A single-line input ignores it: its Enter always emits `action`. A value it does not know behaves as `line-break`. */
  enterKey: 'line-break' | 'action' = 'line-break';

  /** Exposes the input as invalid. It draws nothing: marking an error is the drawing of the holder's box. */
  error = false;

  /** Exposes the input as required and, in a form of its own, reports a missing value. It draws nothing and validates nothing else. */
  required = false;

  /** What the form asks of the input, in a Field's words: `required` behaves as `required` true; `optional` and `none` change nothing, because the input draws no mark (ETI-29). An unknown value behaves as `none` and is reported in a debug build. */
  requirement: TanreiEmbeddedTextInputRequirement = 'none';

  /** ETI-29: required by its own prop, or by `requirement`. */
  private get isRequired(): boolean {
    return this.required || this.requirement === 'required';
  }

  /** Not focusable and not editable; the text and the placeholder read as disabled content. The disabled look of the box is its holder's. */
  disabled = false;

  /** Focusable, selectable and copyable, not editable (the `readonly` attribute). Drawn as an enabled input. */
  readOnly = false;

  /** The browser's autofill hint for the value (an HTML autocomplete token). Empty: the browser decides. */
  autocomplete = '';

  /** Web only: the name the value is submitted under, in a form the input stands in itself. */
  name = '';

  /** Set by an ancestor `<fieldset disabled>`, or by the element's own attribute (`formDisabledCallback`). */
  protected formDisabled = false;

  private readonly internals = this.attachInternals();
  /** What it tells its form, said where an element composed around it could hear it (src/primitives/form-says.ts). */
  private readonly says = new FormSays(this, this.internals);

  /** ETI-2, ETI-4: the value and the native element kept in step around an input method (src/primitives/native-text.ts). */
  private readonly text = new NativeTextController({
    input: () => this.input,
    value: () => this.shownValue,
    setValue: (text) => this.take(text),
    settled: () => this.height.fit(true),
  });

  /** ETI-7 to ETI-10: the height that follows the lines (src/primitives/auto-height.ts). */
  private readonly height = new AutoHeight({
    box: () => this.renderRoot?.querySelector<HTMLElement>('.box') ?? null,
    input: () => this.textarea,
    placeholder: () => this.renderRoot?.querySelector<HTMLElement>('.hint') ?? null,
    min: () => this.minRows,
    max: () => this.maxRows,
    still: () => this.pressed,
    rows: (rows, scrolling) => {
      this.dispatchEvent(new CustomEvent<TanreiEmbeddedTextInputRowsChangeDetail>('rowschange', { bubbles: true, composed: true, detail: { rows, scrolling } }));
    },
  });

  /** ETI-3: the value last committed (when focus arrived, or at the last change). */
  private committed = '';
  /** ETI-9: a pointer or a touch is held down in the text. */
  private pressed = false;
  /** ETI-4: when the last composition ended — the key that committed it may be reported after the end. */
  private readonly composition = new CompositionEnd();
  /** ETI-25: the selection of the native element that `multiline` is about to replace, where it had focus. */
  private carried: { start: number; end: number } | null = null;
  private sizes: ResizeObserver | undefined;
  private watched: Element | null = null;
  /** ETI-27: the product's own text element, written as a child for a page without script. */
  private readonly children$ = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.adopt());
  /** ETI-27: `value` was given — as an attribute or as a property — so a child's text is not taken. */
  private valueGiven = false;
  private drawn = false;

  constructor() {
    super();
    this.addEventListener('pointerdown', this.onHostPointerDown);
    this.addEventListener('mousedown', this.onHostMouseDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** The native text element, once rendered. */
  private get input(): Native | null {
    return this.renderRoot?.querySelector<Native>('.input') ?? null;
  }

  private get textarea(): HTMLTextAreaElement | null {
    const input = this.input;
    return input instanceof HTMLTextAreaElement ? input : null;
  }

  /** ETI-15: disabled by its own `disabled` or by its form. */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** ETI-17: the type it behaves as; one it does not know is text. */
  private get kind() {
    return TYPES[this.type] ?? TYPES.text;
  }

  /**
   * The value as the native element holds it: a single-line element keeps no line break and a text area writes every
   * line break as one character. The element's own value is not changed for it (ETI-25: the line breaks are there
   * again when `multiline` returns).
   */
  private get shownValue(): string {
    return this.multiline ? this.held.replace(/\r\n?/g, '\n') : this.held.replace(/[\r\n]/g, '');
  }

  /** The number of lines the input shows, or is on its way to show: what the last `rowschange` carried. 1 for a single-line input. Read-only. */
  get rows(): number {
    return this.height.rows || 1;
  }

  // ─── The selection (ETI-21) ───────────────────────────────────────────────────────────────────────────────────

  /** Where the selection begins, as the native element's `selectionStart`: the caret's place where nothing is selected. */
  get selectionStart(): number | null {
    return this.input?.selectionStart ?? null;
  }

  set selectionStart(value: number | null) {
    const input = this.input;
    if (input) input.selectionStart = value;
  }

  /** Where the selection ends, as the native element's `selectionEnd`. */
  get selectionEnd(): number | null {
    return this.input?.selectionEnd ?? null;
  }

  set selectionEnd(value: number | null) {
    const input = this.input;
    if (input) input.selectionEnd = value;
  }

  /** Sets the selection, as the native element's `setSelectionRange()`. */
  setSelectionRange(start: number | null, end: number | null, direction?: 'forward' | 'backward' | 'none') {
    this.input?.setSelectionRange(start, end, direction);
  }

  /**
   * Replaces a range of the text — the selection, where no range is given — as the native element's `setRangeText()`:
   * what an action of the holder's inserts at the caret. The value is then the product's: no `input` is emitted.
   */
  setRangeText(replacement: string, start?: number, end?: number, selectionMode?: SelectionMode) {
    const input = this.input;
    if (!input) return;
    if (start === undefined || end === undefined) input.setRangeText(replacement);
    else input.setRangeText(replacement, start, end, selectionMode);
    this.take(input.value);
    this.height.fit(true);
    this.sync();
  }

  /** Selects the whole value, as the native element's `select()`. */
  select() {
    this.input?.select();
  }

  /**
   * ETI-12: gives the input focus and places the caret at the point of its text nearest to a point of the window
   * (`clientX`, `clientY`) — what a holder calls for a press on its own box outside its other controls. Where the
   * browser cannot say which character stands at a point, the caret goes to the start of the text for a point above
   * or before it and to its end otherwise. Does nothing while disabled.
   */
  focusAt(clientX: number, clientY: number) {
    const input = this.input;
    if (!input || this.inert_) return;
    input.focus();
    const box = input.getBoundingClientRect();
    if (!box.width || !box.height) return;
    // The nearest point of the text's own box: for a point above or below it, the middle of its first or its last line.
    const half = Math.min(box.height, Number.parseFloat(getComputedStyle(input).lineHeight) || box.height) / 2;
    const x = Math.min(Math.max(clientX, box.left + 1), box.right - 1);
    const y = Math.min(Math.max(clientY, box.top + half), box.bottom - half);
    let offset: number | null = null;
    const doc = this.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number, options?: { shadowRoots: ShadowRoot[] }) => { offsetNode: Node; offset: number } | null };
    try {
      const at = this.shadowRoot ? doc.caretPositionFromPoint?.(x, y, { shadowRoots: [this.shadowRoot] }) : null;
      if (at && at.offsetNode === input) offset = at.offset;
    } catch {
      // A browser that cannot say: the fallback below.
    }
    if (offset === null) {
      const rtl = getComputedStyle(input).direction === 'rtl';
      const before = clientY < box.top || (clientY <= box.bottom && (rtl ? clientX > box.right : clientX < box.left));
      offset = before ? 0 : input.value.length;
    }
    try {
      input.setSelectionRange(offset, offset);
    } catch {
      // A type without a selection API: the browser keeps the caret where it can.
    }
  }

  // ─── Form (ETI-19) ────────────────────────────────────────────────────────────────────────────────────────────

  /** The form it belongs to, if any: none in the shadow root of a holder. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while it is required and empty. */
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

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
    this.committed = this.held;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? state : '';
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** ETI-19: what it submits and what it is restored from, and a missing value while it is required and empty. */
  private sync() {
    const value = this.value;
    this.says.value(this.inert_ ? null : value, value);
    const input = this.input;
    if (!this.isRequired || value || this.inert_ || this.readOnly) this.says.validity();
    else this.says.validity({ valueMissing: true }, missingValueMessage('text', { errorText: '', requiredText: '', label: this.label }), input ?? undefined);
  }

  // ─── The native element's events ──────────────────────────────────────────────────────────────────────────────

  /** ETI-2: the person gave the native element this text; it is the value. */
  private take(text: string) {
    this.seen = this.input?.value;
    const before = this.held;
    this.held = text;
    this.requestUpdate('value', before);
  }

  /**
   * ETI-2: the person changed the value. The native `input` event is composed, so it leaves the shadow root by itself,
   * after the element has taken the new value. ETI-4: during a composition the value follows the element and nothing
   * is written back.
   */
  private readonly onInput = (event: Event) => {
    const input = event.target as Native;
    if (this.text.composingInput(event)) return;
    this.take(input.value);
    // ETI-8: a height that follows the value moves — at once while a pointer is held down in the text (ETI-9).
    this.height.fit(true);
    this.sync();
  };

  /** The browser's own `change` is not the input's (ETI-3 decides when a value is committed). */
  private readonly onNativeChange = (event: Event) => event.stopPropagation();

  private readonly onFocusIn = () => {
    this.committed = this.value;
    this.ownerDocument.defaultView?.addEventListener('keydown', this.onKey);
  };

  /** ETI-3: focus left with a changed value — `change`, once. */
  private readonly onFocusOut = () => {
    this.ownerDocument.defaultView?.removeEventListener('keydown', this.onKey);
    this.commit();
  };

  /** ETI-3: `change` when the value differs from the one last committed. Never while disabled or read-only (ETI-15, ETI-16), and never during a composition (ETI-4). */
  private commit() {
    if (this.inert_ || this.readOnly || this.text.composing) return;
    const value = this.value;
    if (value === this.committed) return;
    this.committed = value;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private readonly onCompositionStart = () => this.text.onCompositionStart();

  /**
   * ETI-4: where the platform reports the committing Enter only after the composition has ended, it is still the
   * composition's: it was pressed no later than the end, or carries the platform's mark of a key an input method took.
   * Never "until a timer runs": on a busy page an engine reports a key before such a timer, and the first Enter pressed
   * after a composition committed by a pointer would be lost.
   */
  private readonly onCompositionEnd = (event: CompositionEvent) => {
    this.text.onCompositionEnd(event);
    this.composition.ended(event);
  };

  /**
   * ETI-6, ETI-21: a key pressed in the input, read where it has passed every element around it — at the window, the
   * last place it reaches — so that whatever holds the input has seen it first; one a holder cancelled is not read.
   * The input gives a meaning to Enter alone: Tab moves focus as the platform has it, and Escape does nothing.
   */
  private readonly onKey = (event: KeyboardEvent) => {
    const input = this.input;
    if (event.key !== 'Enter' || event.defaultPrevented || !input || !event.composedPath().includes(input)) return;
    // ETI-4: an input method's Enter chooses a candidate or commits; it is never a request for the action.
    if (this.text.composing || this.composition.tookKey(event)) return;
    // ETI-15, ETI-16: no key of a disabled or a read-only input asks for the action.
    if (this.inert_ || this.readOnly) return;
    const chord = event.ctrlKey || event.metaKey;
    if (this.multiline) {
      const acts = chord || (this.enterKey === 'action' && !event.shiftKey && !event.altKey && !onScreenKeyboard());
      if (!acts) return;
      // The action inserts nothing.
      event.preventDefault();
      this.act();
      return;
    }
    // A single line: its action key. Then, as a control of a form itself, the form's submission through its default
    // button (BTN-30), unless the action was cancelled. In the shadow root of a holder it has no form.
    const proceed = this.act();
    const form = proceed ? this.internals.form : null;
    if (form) {
      event.preventDefault();
      pressDefaultButton(form);
    }
  };

  /** ETI-6: the change it causes, then `action` with the value — and nothing else: the value, the selection and the focus stay. Answers whether the action was let through. */
  private act(): boolean {
    this.commit();
    this.sync();
    return this.dispatchEvent(new CustomEvent<TanreiEmbeddedTextInputActionDetail>('action', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value } }));
  }

  // ─── Presses (ETI-9, ETI-12) ──────────────────────────────────────────────────────────────────────────────────

  private readonly onPointerUp = () => {
    this.pressed = false;
    const view = this.ownerDocument.defaultView;
    view?.removeEventListener('pointerup', this.onPointerUp, true);
    view?.removeEventListener('pointercancel', this.onPointerUp, true);
  };

  /** ETI-9: while a pointer or a touch is held down in the text its height changes at once. */
  private readonly onHostPointerDown = () => {
    if (this.inert_) return;
    this.pressed = true;
    const view = this.ownerDocument.defaultView;
    view?.addEventListener('pointerup', this.onPointerUp, true);
    view?.addEventListener('pointercancel', this.onPointerUp, true);
  };

  /**
   * ETI-12: a press in the hit area beyond the lines — whose target is the host itself — is a press on the text: focus,
   * and the caret at the nearest point. No pressed state and no feedback: a press on a place to type is not an action.
   * The press would give the native element focus by itself (the shadow root delegates it) and leave the caret where
   * it last stood: its default is prevented and the caret is placed here.
   */
  private readonly onHostMouseDown = (event: MouseEvent) => {
    if (this.inert_ || event.button !== 0 || event.composedPath()[0] !== this) return;
    event.preventDefault();
    this.focusAt(event.clientX, event.clientY);
  };

  // ─── Without script (ETI-27) ──────────────────────────────────────────────────────────────────────────────────

  /**
   * ETI-27: the platform's own text element that the product wrote as a child is the control until the element is
   * defined. Now its text is the first value where `value` was not given, and it is hidden and disabled, so that the
   * form submits the input alone.
   */
  private adopt() {
    for (const child of this.children) {
      if (!(child instanceof HTMLTextAreaElement || child instanceof HTMLInputElement) || child.hasAttribute('data-tanrei-adopted')) continue;
      child.setAttribute('data-tanrei-adopted', '');
      if (!this.valueGiven && !this.held && child.value) {
        this.value = child.value;
        this.committed = this.held;
      }
      child.hidden = true;
      child.disabled = true;
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    this.valueGiven ||= this.hasAttribute('value');
    this.adopt();
    this.children$?.observe(this, { childList: true });
    // ETI-19: a control of its form from the moment it stands in it, as the platform's own are — before it first draws.
    this.sync();
    // Drawn again after it was taken out: its native element is watched again.
    if (this.hasUpdated) this.watch();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$?.disconnect();
    this.sizes?.disconnect();
    this.watched = null;
    this.composition.reset();
    this.ownerDocument.defaultView?.removeEventListener('keydown', this.onKey);
    this.onPointerUp();
  }

  /** ETI-9: a width, a text size or a text style that changed is a height that changes at once; so is being shown again. */
  private watch() {
    const input = this.textarea;
    if (input === this.watched) return;
    this.sizes?.disconnect();
    this.watched = input;
    if (!input || typeof ResizeObserver === 'undefined') return;
    this.sizes ??= new ResizeObserver(() => this.height.relaid());
    this.sizes.observe(input);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('value') && this.hasUpdated) this.valueGiven = true;
    // ETI-25: `multiline` replaces the native element; the selection and the focus of the one that leaves go to the next.
    if (changed.has('multiline') && this.hasUpdated) {
      const input = this.input;
      const focused = !!input && this.shadowRoot?.activeElement === input;
      this.carried = focused ? { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 } : null;
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('requirement') && !REQUIREMENTS.includes(this.requirement)) report(this, 'ETI-29', `requirement "${this.requirement}" is not none, required or optional; it behaves as "none"`);
    const input = this.input;
    const replaced = input !== this.native_;
    // ETI-4: never written into a composition; a value set meanwhile waits for its end.
    const written = this.text.show();
    this.native_ = input;
    this.seen = input?.value;
    if (input && written && !replaced && this.shadowRoot?.activeElement === input) {
      // ETI-2: a value set while it has focus leaves the caret at its end.
      const end = input.value.length;
      try {
        input.setSelectionRange(end, end);
      } catch {
        // A type without a selection API.
      }
    }
    if (input && replaced && this.carried) {
      const { start, end } = this.carried;
      input.focus();
      try {
        input.setSelectionRange(Math.min(start, input.value.length), Math.min(end, input.value.length));
      } catch {
        // A type without a selection API.
      }
    }
    this.carried = null;
    // ETI-8, ETI-9: a height that follows the value moves; the first one, and one that follows anything else, does not.
    if (!this.textarea) this.height.single();
    else if (replaced || !this.drawn || changed.has('minRows') || changed.has('maxRows') || changed.has('multiline') || changed.has('placeholder') || changed.has('type')) this.height.fit(false);
    else if (written) this.height.fit(true);
    this.watch();
    if (!this.drawn) {
      this.drawn = true;
      // The text may be laid out again when its face arrives: the height follows, at once.
      if (this.textarea) void facesArrived()?.then(() => this.isConnected && this.height.fit(false));
    }
    this.sync();
    this.reports(changed);
  }

  private reports(changed: PropertyValues<this>) {
    if (changed.has('type') && !(this.type in TYPES)) report(this, 'ETI-17', `type "${String(this.type)}" is not a type of the embedded text input; it behaves as "text"`);
    if (changed.has('enterKey') && !ENTER_KEYS.includes(this.enterKey)) report(this, 'ETI-6', `enter-key "${String(this.enterKey)}" is not a value of enterKey; Enter begins a new line, as with "line-break"`);
    if (!this.label.trim()) report(this, 'ETI-13', 'label is empty, so the input has no accessible name: nothing is drawn that could name it and it asks no field; give it a label');
    if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) report(this, 'ETI-13', 'aria-label and aria-labelledby on the element name nothing: it has no role; name it with label');
  }

  protected override render() {
    const kind = this.kind;
    const inert = this.inert_;
    // ETI-20: typed text is laid out by its own direction once it has a letter to tell it by. Until then the input
    // keeps the layout's direction, so the caret and the placeholder stand at the start edge (an empty dir="auto"
    // element is left to right in every layout). An address and a telephone number are left to right.
    const own = kind.ltr ? 'ltr' : STRONG.test(this.held) ? 'auto' : undefined;
    const label = this.label.trim();
    const description = this.description.trim();
    const multiline = this.multiline;
    // ETI-7: the fewest lines, for the frame before the routine has measured.
    const least = Number.isFinite(Number(this.minRows)) && Number(this.minRows) >= 1 ? Math.floor(Number(this.minRows)) : 1;
    const control = multiline
      ? html`<textarea
          part="input"
          class="input"
          rows="1"
          style=${`--_rows-min: ${least}`}
          inputmode=${ifDefined(kind.inputmode)}
          enterkeyhint="enter"
          autocapitalize=${kind.plain ? 'none' : nothing}
          autocorrect=${kind.plain ? 'off' : nothing}
          spellcheck=${kind.plain ? 'false' : nothing}
          dir=${ifDefined(own)}
          .placeholder=${this.placeholder}
          ?disabled=${inert}
          ?readonly=${this.readOnly}
          aria-label=${label || nothing}
          aria-description=${description || nothing}
          aria-invalid=${this.error ? 'true' : nothing}
          aria-required=${this.isRequired ? 'true' : nothing}
          aria-readonly=${this.readOnly ? 'true' : nothing}
          autocomplete=${this.autocomplete || nothing}
          @input=${this.onInput}
          @change=${this.onNativeChange}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
        ></textarea>`
      : html`<input
          part="input"
          class="input"
          type=${kind.type}
          inputmode=${ifDefined(kind.type === 'text' ? kind.inputmode : undefined)}
          autocapitalize=${kind.plain ? 'none' : nothing}
          autocorrect=${kind.plain ? 'off' : nothing}
          spellcheck=${kind.plain ? 'false' : nothing}
          dir=${ifDefined(own)}
          .placeholder=${this.placeholder}
          ?disabled=${inert}
          ?readonly=${this.readOnly}
          aria-label=${label || nothing}
          aria-description=${description || nothing}
          aria-invalid=${this.error ? 'true' : nothing}
          aria-required=${this.isRequired ? 'true' : nothing}
          aria-readonly=${this.readOnly ? 'true' : nothing}
          autocomplete=${this.autocomplete || nothing}
          @input=${this.onInput}
          @change=${this.onNativeChange}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
        />`;
    // ETI-22: the placeholder's lines are measured on a copy, which is drawn nowhere and read by nothing.
    const hint = multiline && this.placeholder ? html`<div class="hint" aria-hidden="true">${this.placeholder}</div>` : nothing;
    return html`<div class="box" @transitionend=${this.height.ended} @transitioncancel=${this.height.ended}>${control}${hint}</div>`;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiEmbeddedTextInput);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiEmbeddedTextInput);
if (!customElements.get('tanrei-embedded-text-input')) customElements.define('tanrei-embedded-text-input', TanreiEmbeddedTextInput);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-embedded-text-input': TanreiEmbeddedTextInput;
  }
}
