import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, FieldControlController, report, syncFocusStyle } from '../../primitives/index.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { FormSays } from '../../primitives/form-says.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { type CodeState, type CodeType, furthest, readCharacter, readCode, readPermitted, readValue, removeBackward, removeForward, removeRun, replaceAll, settle, typeCharacter, typeText } from './code-text.js';
import { styles } from './one-time-code-input.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { COMPOSITION_INPUT_TYPES, CompositionEnd } from '../../primitives/composition-end.js';
import { TanreiElement } from '../../primitives/element.js';

/** What a cell takes: the digits 0 to 9, or those and the letters A to Z, held in upper case. */
export type TanreiOneTimeCodeInputType = CodeType;

/** What `input`, `change`, `complete` and `action` carry: the code as it is now. */
export interface TanreiOneTimeCodeInputDetail {
  value: string;
}

const TYPES: readonly string[] = ['numeric', 'alphanumeric'] satisfies TanreiOneTimeCodeInputType[];
const DEFAULT_LENGTH = 6;
/** OTC-16: the mark a browser's own password field draws for a character. A mark, not a word. */
const MASK = '•';

/** The kinds of native input that put text in (the rest remove it, or are an input method's). */
const INSERTS_WHOLE = new Set(['insertReplacementText', 'insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromDrop', 'insertFromYank']);
const REMOVES_BACKWARD_RUN = new Set(['deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward', 'deleteEntireSoftLine']);
const REMOVES_FORWARD_RUN = new Set(['deleteWordForward', 'deleteSoftLineForward', 'deleteHardLineForward']);
/** What an input method does to its own composing text: never stopped, never read as the person's edit (OTC-6). */

/**
 * Takes a short code sent to the person — a sign-in or verification code — as one text value drawn in separate cells,
 * so that its length and what is still missing can be seen, and the browser can fill it in one step.
 *
 * Contract: specs/one-time-code-input.spec.json. Every visual value is a `--tanrei-comp-one-time-code-input-*` token.
 *
 * One field, not one input per character: in the shadow root there is exactly one native `<input>`, laid over the row,
 * whose own text and caret are not drawn; the cells, the caret and the group marks under it are a drawing of its value
 * and are hidden from assistive technology. So it is one Tab stop and one text box whose value is the whole code, and
 * an input method, the browser's autofill (`autocomplete="one-time-code"`), the clipboard and dictation meet one text
 * input. It has no `maxlength` and no `pattern`: a code pasted as "123 456" would be cut before it could be read.
 *
 * It has no label, help or error text of its own: put it in a `<tanrei-field>`, which names it, describes it, marks it
 * required and puts it in its error condition; where the visible label is elsewhere (a dialog's headline), give
 * `label`, which is never drawn. `<tanrei-field label="Verification code"><tanrei-one-time-code-input name="code"
 * group-size="3"></tanrei-one-time-code-input></tanrei-field>`.
 *
 * A permitted character fills the active cell — replacing what it holds — and moves on; other characters are dropped.
 * Text that is pasted, dropped or filled is read whole as one code ("123 456", "123-456", "Your code is 123456.").
 * `input` fires on every change by the person, `complete` once after the `input` that leaves the value `length` long,
 * `change` when a changed value is committed (focus leaves, or Enter), `action` on Enter. Nothing else happens when the
 * code is complete: checking it is the product's.
 *
 * Form-associated: it submits the code under `name`, resets to its `value` attribute, is restored on navigation,
 * follows a disabled `<fieldset>`, and reports a missing value while its Field says it is required and it is empty.
 *
 * @tag tanrei-one-time-code-input
 * @csspart input - The one native text element, laid over the row. Its text is not drawn.
 * @csspart cell - One box per character of the code.
 * @csspart character - The character a filled cell holds, or the mark in its place while `mask` is set.
 * @csspart caret - The caret of an empty active cell.
 * @csspart separator - The mark between two groups of cells.
 * @attr {string} form - The id of the form the one-time-code input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires {CustomEvent<TanreiOneTimeCodeInputDetail>} input - The person changed the value; the element's `value` is already the new one.
 * @fires {CustomEvent<TanreiOneTimeCodeInputDetail>} change - The person committed a changed value: focus left the field, or Enter was pressed.
 * @fires {CustomEvent<TanreiOneTimeCodeInputDetail>} complete - A change by the person left the value `length` characters long. After that change's input, once.
 * @fires {CustomEvent<TanreiOneTimeCodeInputDetail>} action - The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 */
export class TanreiOneTimeCodeInput extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'one-time-code-input');
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['input', 'cell', 'character', 'caret', 'separator'];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    value: { type: String },
    length: { type: Number },
    type: { type: String },
    groupSize: { type: Number, attribute: 'group-size' },
    mask: { type: Boolean, reflect: true },
    label: { type: String },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    name: { type: String, reflect: true },
    focused: { state: true },
    state: { state: true },
    composingText: { state: true },
    formDisabled: { state: true },
  };

  /** The code entered so far: at most `length` characters, digits or — for `alphanumeric` — digits and upper-case letters, with no separator. The `value` attribute is what a form reset returns to. */
  value = '';

  /** How many characters the code has, and so how many cells are drawn. A whole number of 1 or more; anything else draws 6. */
  length = DEFAULT_LENGTH;

  /** What a cell takes: `numeric` (the default; a numeric keypad) or `alphanumeric` (digits and A to Z, held in upper case; a general keyboard). Anything else behaves as numeric. */
  type: TanreiOneTimeCodeInputType = 'numeric';

  /** Draws the cells in groups of this many, with a mark between two groups (`group-size`; 3 for a code written "123 456"). 0 draws one group. The value has no separator. */
  groupSize = 0;

  /** Draws the browser's password mark in each filled cell in place of its character, and exposes the field as a password field. Paste and autofill still work. */
  mask = false;

  /** Names the field for assistive technology where no Field frames it. Never drawn. Inside a Field leave it empty: the Field names it. */
  label = '';

  /** Draws every cell in the error condition and exposes the field as invalid. A Field sets this from its own error; set it here only where no Field frames the control. */
  error = false;

  /** Prevents entry and takes the field out of the focus order. Inside a Field, disable the Field, so that its label follows. */
  disabled = false;

  /** Keeps the field focusable and its value readable, and lets nothing change it (`readonly`): for the moment a complete code is being checked. */
  readOnly = false;

  /** Web only: the name the code is submitted under. */
  name = '';

  /** OTC-7: the native input has focus, however it was gained. */
  private focused = false;

  /** OTC-5, OTC-10: the active cell and whether the whole value is selected. Its `value` follows the element's. */
  private state: CodeState = { value: '', active: 0, all: false };

  /** OTC-6: the text an input method is composing, as the method gave it; empty while none is. */
  private composingText = '';

  /** Set by an ancestor `<fieldset disabled>`. */
  private formDisabled = false;

  private readonly internals = this.attachInternals();

  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says = new FormSays(this, this.internals);

  /**
   * What a Field around it gives it (src/primitives/field.ts): the name while it has no `label` of its own, the
   * description, the invalid, required and disabled states (OTC-17, OTC-20, OTC-22).
   */
  private readonly field = new FieldControlController(this, { errorCondition: true, named: () => !!this.label.trim() });

  /** The value the element last held by its own doing: a `value` that differs was set by the product (OTC-18). */
  private held = '';
  /** OTC-13: the value at the last commit. */
  private committed = '';
  /** OTC-6: an input method is composing; the native element is its own until it ends. */
  private composing = false;
  /** When the last composition ended: the key that committed it may be reported after the end, and is not the field's. */
  private readonly composition = new CompositionEnd();
  /** OTC-5: focus arrives by a press on a cell, which has chosen the active cell. */
  private pressing = false;
  /** Focus has arrived and the person has done nothing yet: a selection of the whole text is the browser's own (it selects a text input it tabs into), not the person's select all. */
  private fresh = false;

  private readonly rows = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.markRows());
  private observed: Element | null = null;

  private get input(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('.input');
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The element's validity: a missing value while its Field says it is required and it is empty (OTC-29). */
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

  // ─── What the props mean (OTC-19) ─────────────────────────────────────────────────────────────────────────────

  /** OTC-19: the number of cells — `length`, or 6 where it is not a whole number of 1 or more. */
  private get cells(): number {
    const length = Number(this.length);
    return Number.isInteger(length) && length >= 1 ? length : DEFAULT_LENGTH;
  }

  /** OTC-19: `type`, or numeric for a value it does not know. */
  private get kind(): TanreiOneTimeCodeInputType {
    return TYPES.includes(this.type) ? this.type : 'numeric';
  }

  /** OTC-15, OTC-19: the cells of each group — one group unless `groupSize` is a whole number from 1 to length minus 1. */
  private get groups(): number[][] {
    const cells = this.cells;
    const size = Number(this.groupSize);
    const valid = Number.isInteger(size) && size >= 1 && size <= cells - 1;
    const all = Array.from({ length: cells }, (_, index) => index);
    if (!valid) return [all];
    const groups: number[][] = [];
    for (let at = 0; at < cells; at += size) groups.push(all.slice(at, at + size));
    return groups;
  }

  private get isDisabled(): boolean {
    return this.disabled || this.formDisabled || this.field.disabled;
  }

  /** OTC-20, OTC-21: nothing the person does changes the value. */
  private get locked(): boolean {
    return this.isDisabled || this.readOnly;
  }

  private get isError(): boolean {
    return this.error || this.field.invalid;
  }

  // ─── Form (OTC-29) ────────────────────────────────────────────────────────────────────────────────────────────

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = state;
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /** The value a form submits — the code alone, or an empty string — and what its validation is told. */
  private syncForm() {
    // OTC-20: a disabled field is left out of the submission (its own attribute, a fieldset's, or its Field's).
    this.says.value(this.isDisabled ? null : this.value, this.value);
    // OTC-29: a missing value while its Field says it is required; nothing for a code shorter than length. A read-only
    // control is not validated, as a native one is not.
    const missing = this.field.required && this.value === '' && !this.locked;
    const input = this.input;
    if (missing && input) {
      const message = missingValueMessage('text', { errorText: '', requiredText: this.field.state?.requiredText ?? '', label: this.field.name(this.label) });
      this.says.validity({ valueMissing: true }, message, input);
    } else this.says.validity();
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.rows?.disconnect();
    this.observed = null;
    this.composing = false;
    this.composition.reset();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('length') && this.cells !== Number(this.length)) {
      report(this, 'OTC-19', `length ${String(this.length)} is not a whole number of 1 or more; ${DEFAULT_LENGTH} cells are drawn`);
    }
    if (changed.has('type') && !TYPES.includes(this.type)) report(this, 'OTC-19', `type "${String(this.type)}" is not a value of the one-time-code input; it behaves as "numeric"`);
    if (changed.has('groupSize') || changed.has('length')) {
      const size = Number(this.groupSize);
      if (!(Number.isInteger(size) && size >= 0 && size <= this.cells - 1)) {
        report(this, 'OTC-19', `groupSize ${String(this.groupSize)} is not a whole number from 0 to length minus 1 (${this.cells - 1}); one group is drawn`);
      }
    }
    if (changed.has('value') || changed.has('length') || changed.has('type')) {
      // OTC-18: a value the product set is read by OTC-4 and keeps its first `length` permitted characters; OTC-19: a
      // shorter length keeps the first characters. No event for either.
      const given = String(this.value ?? '');
      const fromProduct = given !== this.held;
      const { value, dropped } = readValue(given, this.cells, this.kind);
      if (fromProduct && dropped) report(this, 'OTC-18', `value "${given}" holds characters a ${this.kind} code of ${this.cells} cannot; "${value}" is shown`, { once: false });
      this.value = value;
      this.held = value;
      if (fromProduct) {
        // What the product set is the committed value: leaving the field after it is no change by the person.
        this.committed = value;
        // OTC-18: set while the field has focus, the active cell is the first empty cell, or the last.
        this.state = replaceAll(value, this.cells);
      } else this.state = settle({ ...this.state, value }, this.cells);
    }
    // OTC-22: a field without a name still renders; a debug build says what is missing.
    if ((changed.has('label') || !this.hasUpdated) && !this.label.trim() && !this.field.label) {
      report(this, 'OTC-22', 'label is empty and no field frames it, so the one-time-code input has no accessible name; put it in a field with a label, or give it a label');
    }
    // OTC-20: a disabled field has no focus and no active cell (a native element that is disabled while it has focus
    // does not always say that it lost it).
    if (this.isDisabled && this.focused) {
      this.focused = false;
      this.state = { ...this.state, all: false };
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    this.syncForm();
    this.show();
    const row = this.renderRoot.querySelector('.row');
    if (row !== this.observed) {
      this.rows?.disconnect();
      if (row) this.rows?.observe(row);
      this.observed = row;
    }
    if (changed.has('length') || changed.has('groupSize') || changed.has('type')) this.markRows();
  }

  /**
   * OTC-23: the mark of a group that begins a row is not drawn. The one thing read from the layout: whether a group
   * stands on the row of the group before it. The mark is positioned, so hiding it moves nothing.
   */
  private readonly markRows = () => {
    const groups = [...this.renderRoot.querySelectorAll<HTMLElement>('.group')];
    groups.forEach((group, index) => group.toggleAttribute('data-row-start', index === 0 || group.offsetTop !== groups[index - 1].offsetTop));
  };

  /**
   * OTC-2, OTC-5: the native element holds the value and its insertion point stands at the active cell — before its
   * character while it is filled, at the end of the value while it is empty — or the whole value is selected (OTC-10).
   * Never written into a composition: the text is the input method's until it ends.
   */
  private show() {
    const input = this.input;
    if (!input || this.composing) return;
    if (input.value !== this.value) input.value = this.value;
    if (!this.focused || this.renderRoot.querySelector(':focus') !== input) return;
    const [start, end] = this.state.all ? [0, this.value.length] : [this.state.active, this.state.active];
    if (input.selectionStart !== start || input.selectionEnd !== end) input.setSelectionRange(start, end);
  }

  // ─── Changes by the person (OTC-6, OTC-9, OTC-10, OTC-11, OTC-13, OTC-14) ───────────────────────────────────

  /**
   * Takes a state an edit produced. When it changes the value the element holds it before anyone hears of it, as a
   * native control does: `input`, then `complete` when the value is `length` long — once for the change.
   */
  private take(next: CodeState) {
    const cells = this.cells;
    const state = settle(next, cells);
    const changed = state.value !== this.value;
    this.state = state;
    if (!changed) {
      this.show();
      return;
    }
    this.held = state.value;
    this.value = state.value;
    this.syncForm();
    this.show();
    const detail: TanreiOneTimeCodeInputDetail = { value: state.value };
    this.dispatchEvent(new CustomEvent<TanreiOneTimeCodeInputDetail>('input', { bubbles: true, composed: true, detail }));
    // OTC-14: complete, and nothing else — no submission, no move of focus.
    if (this.value === state.value && state.value.length === cells) {
      this.dispatchEvent(new CustomEvent<TanreiOneTimeCodeInputDetail>('complete', { bubbles: true, composed: true, detail: { value: state.value } }));
    }
  }

  /** OTC-13: a changed value is committed — `change`, when it differs from the value at the last commit. */
  private commit() {
    if (this.locked || this.value === this.committed) return;
    this.committed = this.value;
    this.dispatchEvent(new CustomEvent<TanreiOneTimeCodeInputDetail>('change', { bubbles: true, composed: true, detail: { value: this.value } }));
  }

  /**
   * Text that arrives in the field. One character from the keyboard is typed (OTC-4, OTC-6): a permitted one fills the
   * active cell, any other is dropped. A whole text — pasted, dropped, dictated, filled — is read as one code wherever
   * the active cell is (OTC-11), and changes nothing where it holds none.
   */
  private insert(text: string, whole: boolean) {
    if (this.locked || text === '') return;
    const cells = this.cells;
    if (!whole && [...text].length === 1) {
      const char = readCharacter(text, this.kind);
      if (char !== null) this.take(typeCharacter(this.state, char, cells));
      return;
    }
    const code = readCode(text, cells, this.kind);
    if (code !== null) this.take(replaceAll(code, cells));
  }

  private onBeforeInput(event: InputEvent) {
    const type = event.inputType;
    // OTC-6: composing text is the input method's, and is read when it is committed.
    if (COMPOSITION_INPUT_TYPES.has(type) || event.isComposing || this.composing) return;
    const known = type.startsWith('insert') || type.startsWith('delete') || type.startsWith('history') || type.startsWith('format');
    // What is not known is left to the element and read from it afterwards (`onInput`).
    if (!known) return;
    // The cells are drawn from the value the element holds, so the native element never edits by itself.
    event.preventDefault();
    if (this.locked) return;
    const cells = this.cells;
    if (type === 'insertText') this.insert(event.data ?? '', false);
    else if (INSERTS_WHOLE.has(type)) this.insert(event.data ?? event.dataTransfer?.getData('text/plain') ?? '', true);
    else if (type === 'deleteContentBackward') this.take(removeBackward(this.state, cells));
    else if (type === 'deleteContentForward') this.take(removeForward(this.state, cells));
    else if (REMOVES_BACKWARD_RUN.has(type)) this.take(removeRun(this.state, 'backward', cells));
    else if (REMOVES_FORWARD_RUN.has(type)) this.take(removeRun(this.state, 'forward', cells));
    // The rest — a line break, a cut or a drag (heard as their own events), undo and redo, formatting — changes nothing here.
  }

  /**
   * The native element's own `input`: it is stopped here (the element's `input` is the composed event `take()` fires).
   * What reaches this without having been read in `beforeinput` — autofill, and input a browser does not announce or
   * does not let be stopped — is read from the element: a removal as the browser made it, one character as typed, and
   * anything else as a whole text (OTC-11).
   */
  private onInput(event: Event) {
    event.stopPropagation();
    const input = this.input;
    if (!input || this.composing || (event as InputEvent).isComposing) return;
    // The last report of a composition that has ended (Firefox's comes after the end): it was read there.
    if (COMPOSITION_INPUT_TYPES.has((event as InputEvent).inputType ?? '')) {
      this.show();
      return;
    }
    if (input.value === this.value) return;
    if (this.locked) {
      this.show();
      return;
    }
    const cells = this.cells;
    const { inputType = '', data = null } = event as InputEvent;
    if (inputType.startsWith('delete')) {
      const value = readValue(input.value, cells, this.kind).value;
      this.take({ value, active: input.selectionStart ?? value.length, all: false });
    } else if (inputType === 'insertText' && typeof data === 'string' && data !== '') this.insert(data, false);
    else this.insert(input.value, true);
    // A text that was no code changed nothing: the element shows the value again.
    this.show();
  }

  /** The browser's own `change` is not the field's (OTC-13 decides when a value is committed). */
  private onNativeChange(event: Event) {
    event.stopPropagation();
  }

  // ─── An input method (OTC-6, OTC-13) ──────────────────────────────────────────────────────────────────────────

  private onCompositionStart() {
    this.composing = true;
    this.composingText = '';
  }

  private onCompositionUpdate(event: CompositionEvent) {
    if (!this.composing) return;
    this.composingText = event.data ?? '';
  }

  /**
   * The composition ended: what it committed is read character by character, as typed text is; a cancelled one leaves
   * nothing. The engines differ in what follows — an `input` that is no longer composing (Firefox), nothing (Chromium),
   * and the `keydown` of the key that committed it, which no longer says that it composes (WebKit). Each is told by
   * what it is (`onInput`, `composition.tookKey`), never by a timer: on a busy page an engine reports the next key
   * before such a timer runs, and the person's Backspace or Enter after a commit — by a key or by a pointer — was lost.
   */
  private onCompositionEnd(event: CompositionEvent) {
    if (!this.composing) return;
    this.composing = false;
    this.composingText = '';
    this.composition.ended(event);
    const committed = readPermitted(event.data ?? '', this.kind);
    if (committed && !this.locked) this.take(typeText(this.state, committed, this.cells));
    else this.show();
  }

  // ─── Keys (OTC-8, OTC-9, OTC-10, OTC-13) ──────────────────────────────────────────────────────────────────────

  private onKeyDown(event: KeyboardEvent) {
    this.fresh = false;
    if (this.isDisabled) return;
    // OTC-13: a key an input method takes — the one that commits or cancels its text too — is not the field's.
    if (this.composing || this.composition.tookKey(event)) return;
    const cells = this.cells;
    const { value, active, all } = this.state;
    const end = furthest(value, cells);
    const jump = event.ctrlKey || event.metaKey || event.altKey;
    switch (event.key) {
      case 'Enter':
        this.act(event);
        return;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End': {
        // OTC-8, OTC-27: the cell drawn on that side, in every layout direction; the native caret never moves by itself.
        event.preventDefault();
        // OTC-10: Shift with an arrow key selects nothing.
        if (event.shiftKey) return;
        const first = event.key === 'Home' || (event.key === 'ArrowLeft' && (jump || all));
        const last = event.key === 'End' || (event.key === 'ArrowRight' && (jump || all));
        const next = first ? 0 : last ? end : event.key === 'ArrowLeft' ? Math.max(0, active - 1) : Math.min(end, active + 1);
        this.state = { value, active: next, all: false };
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
        // OTC-8: nothing in the field, and left to the page. A browser that moves its caret for them is put right.
        setTimeout(() => this.show());
        return;
      case 'Backspace':
      case 'Delete': {
        // Shift+Delete is a platform's cut: left to the browser, heard as `cut`.
        if (event.key === 'Delete' && event.shiftKey) return;
        event.preventDefault();
        if (this.locked) return;
        const backward = event.key === 'Backspace';
        if (jump) this.take(removeRun(this.state, backward ? 'backward' : 'forward', cells));
        else this.take(backward ? removeBackward(this.state, cells) : removeForward(this.state, cells));
        return;
      }
      default:
        // OTC-10: the platform's select all selects the whole value.
        if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          this.state = { value, active: end, all: value !== '' };
        }
    }
  }

  /** OTC-13: the action key — the commit, then `action`, then the form's submission unless `action` was cancelled. */
  private act(event: KeyboardEvent) {
    this.commit();
    const action = new CustomEvent<TanreiOneTimeCodeInputDetail>('action', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value } });
    const proceed = this.dispatchEvent(action);
    // Its own form, or the form of the element composed around it (src/primitives/default-button.ts, `formOf`).
    const form = proceed ? formOf(this, this.form) : null;
    if (form) {
      event.preventDefault();
      pressDefaultButton(form);
    }
  }

  // ─── Focus, presses and the selection (OTC-5, OTC-10, OTC-25) ────────────────────────────────────────────────

  private onFocus() {
    this.fresh = true;
    // OTC-5: focus that enters by the keyboard, by a Field's label or from the product makes the first empty cell (or
    // the last) active; a press on a cell has chosen already.
    if (!this.pressing) this.state = replaceAll(this.value, this.cells);
    this.focused = true;
    // OTC-7: the focus style is read when focus arrives, for a browser without style queries.
    syncFocusStyle(this, this.renderRoot.querySelector<HTMLElement>('.field'));
    // A browser selects the text of an input it tabs into, after this: the insertion point is put back.
    setTimeout(() => this.show());
  }

  private onBlur() {
    this.focused = false;
    this.fresh = false;
    this.state = { ...this.state, all: false };
    // OTC-13: focus left the field.
    this.commit();
  }

  /** The cell at a point of the window, or -1: the native element lies over the cells and takes the press. */
  private cellAt(x: number, y: number): number {
    const cells = [...this.renderRoot.querySelectorAll('.cell')];
    return cells.findIndex((cell) => {
      const box = cell.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    });
  }

  /**
   * OTC-25: a press takes focus and makes the pressed cell active while it is filled, and otherwise the first empty
   * cell. It is not an action and draws no answer. The native element's own answer to a press — its caret where the
   * unseen text is, a selection by dragging or by a second press — is not wanted (OTC-10), so the press is the
   * element's: it focuses the native element itself.
   */
  private onMouseDown(event: MouseEvent) {
    this.fresh = false;
    if (this.isDisabled) return;
    if (event.button !== 0) {
      // A secondary press (the browser's menu, with its paste) is the browser's; the insertion point is put back.
      setTimeout(() => this.show());
      return;
    }
    event.preventDefault();
    const pressed = this.cellAt(event.clientX, event.clientY);
    const active = pressed >= 0 && pressed < this.value.length ? pressed : furthest(this.value, this.cells);
    this.state = { value: this.value, active, all: false };
    const input = this.input;
    if (input && this.renderRoot.querySelector(':focus') !== input) {
      this.pressing = true;
      input.focus();
      this.pressing = false;
    }
  }

  /**
   * OTC-10: a selection of the native text. The whole value selected by the person — the browser's menu, a touch
   * keyboard's "select all" — is select all; any other selection (a part of the text, or the one a browser makes when
   * it focuses an input) is undone: the field has no selection of some cells only.
   */
  private onSelect() {
    const input = this.input;
    if (!input || !this.focused || this.composing) return;
    const whole = this.value !== '' && input.selectionStart === 0 && input.selectionEnd === input.value.length;
    if (whole && !this.fresh && !this.state.all) this.state = { ...this.state, all: true };
    else this.show();
  }

  /** OTC-10: copy takes the whole value, without group marks, whichever cell is active; nothing while mask is set. */
  private onCopy(event: ClipboardEvent) {
    event.preventDefault();
    if (this.mask || this.isDisabled) return;
    event.clipboardData?.setData('text/plain', this.value);
  }

  /** OTC-10: cut takes the whole value and empties the field; while mask is set it gives nothing and changes nothing. */
  private onCut(event: ClipboardEvent) {
    event.preventDefault();
    if (this.mask || this.locked || this.value === '') return;
    event.clipboardData?.setData('text/plain', this.value);
    this.take({ value: '', active: 0, all: false });
  }

  /** OTC-11: pasted text is read whole as one code. Never blocked, masked or not. */
  private onPaste(event: ClipboardEvent) {
    event.preventDefault();
    this.insert(event.clipboardData?.getData('text/plain') ?? '', true);
  }

  /** OTC-11: dropped text is read whole as one code, and the field takes focus as a native input does. */
  private onDrop(event: DragEvent) {
    event.preventDefault();
    if (this.locked) return;
    this.input?.focus();
    this.insert(event.dataTransfer?.getData('text/plain') ?? '', true);
  }

  // ─── Rendering ────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * What the cells draw: the value, or — while an input method composes — the value as it would be if the composing
   * text were committed now, with the cells that text fills marked (OTC-6). The value itself does not change.
   */
  private get drawn(): { state: CodeState; composing: [number, number] } {
    const cells = this.cells;
    const state = settle(this.state, cells);
    const text = this.composing ? readPermitted(this.composingText, this.kind) : '';
    if (!text) return { state, composing: [0, 0] };
    const from = state.all ? 0 : state.active;
    return { state: typeText(state, text, cells), composing: [from, Math.min(cells, from + [...text].length)] };
  }

  protected override render() {
    const disabled = this.isDisabled;
    const focused = this.focused && !disabled;
    const groups = this.groups;
    const kind = this.kind;
    const { state, composing } = this.drawn;
    const name = this.field.name(this.label);
    const description = this.field.description();
    const cell = (index: number) => {
      const char = state.value[index];
      const filled = char !== undefined;
      const active = focused && (state.all ? filled : index === state.active);
      // OTC-7: the caret stands in an empty active cell; a read-only field draws none (OTC-21).
      const caret = active && !filled && !this.readOnly;
      const fresh = index >= composing[0] && index < composing[1];
      return html`<span class="cell" part="cell" data-tanrei-shape ?data-active=${active} ?data-filled=${filled}
        >${filled
          ? html`<span class="char" part="character" ?data-composing=${fresh}>${this.mask ? MASK : char}</span>`
          : caret
            ? html`<span class="caret" part="caret"></span>`
            : nothing}</span
      >`;
    };
    return html`
      <div class="field" data-type=${kind} ?data-error=${this.isError} ?data-disabled=${disabled} ?data-focused=${focused} style="--_cells: ${this.cells}; --_groups: ${groups.length}">
        <input
          class="input"
          part="input"
          type=${this.mask ? 'password' : 'text'}
          autocomplete="one-time-code"
          inputmode=${kind === 'numeric' ? 'numeric' : 'text'}
          autocapitalize=${kind === 'numeric' ? 'off' : 'characters'}
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="done"
          aria-label=${name || nothing}
          aria-description=${description || nothing}
          aria-invalid=${this.isError ? 'true' : nothing}
          aria-required=${this.field.required ? 'true' : nothing}
          aria-readonly=${this.readOnly ? 'true' : nothing}
          ?readonly=${this.readOnly}
          ?disabled=${disabled}
          @beforeinput=${this.onBeforeInput}
          @input=${this.onInput}
          @change=${this.onNativeChange}
          @compositionstart=${this.onCompositionStart}
          @compositionupdate=${this.onCompositionUpdate}
          @compositionend=${this.onCompositionEnd}
          @keydown=${this.onKeyDown}
          @focus=${this.onFocus}
          @blur=${this.onBlur}
          @mousedown=${this.onMouseDown}
          @select=${this.onSelect}
          @copy=${this.onCopy}
          @cut=${this.onCut}
          @paste=${this.onPaste}
          @drop=${this.onDrop}
        />
        <div class="row" aria-hidden="true">
          ${groups.map(
            (indices, group) =>
              html`<span class="group" style="--_n: ${indices.length}">${group > 0 ? html`<span class="mark" part="separator"></span>` : nothing}${indices.map(cell)}</span>`,
          )}
        </div>
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiOneTimeCodeInput);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiOneTimeCodeInput);
if (!customElements.get('tanrei-one-time-code-input')) customElements.define('tanrei-one-time-code-input', TanreiOneTimeCodeInput);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-one-time-code-input': TanreiOneTimeCodeInput;
  }
}
