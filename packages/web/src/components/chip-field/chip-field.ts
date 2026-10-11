import { type PropertyDeclarations, type PropertyValues, css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { wordPlaces } from '../../generated/words.js';
import { ComposedElement, composedHost, exported, forward } from '../../primitives/composed.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { fillPlaces, placeFaults, reportPlaces } from '../../primitives/places.js';
import { report } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import { TanreiChip } from '../chip/chip.js';
import { TanreiField, type TanreiFieldRequiredMark, type TanreiFieldRequirement } from '../field/field.js';
import { TanreiTextInput, type TanreiTextInputActionDetail, type TanreiTextInputSize, type TanreiTextInputType, type TanreiTextInputVariant } from '../text-input/text-input.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';

// The members' own types are the chip field's for what it takes from them.
export type { TanreiFieldRequiredMark, TanreiFieldRequirement, TanreiTextInputActionDetail, TanreiTextInputSize, TanreiTextInputType, TanreiTextInputVariant };

/** Why a candidate entry was refused: the product's check, the same text already in the list, or a full list. */
export type TanreiChipFieldRejectReason = 'invalid' | 'duplicate' | 'limit';

/** What `change` carries: the new list, and what the person's act added to it and took from it. */
export interface TanreiChipFieldChangeDetail {
  value: string[];
  added: string[];
  removed: string[];
}

/**
 * What `check` carries: the candidate's text and the entries so far. `event.preventDefault()` refuses the candidate;
 * `reason`, set by the listener, gives the words shown for it. Read when the event returns, never later.
 */
export interface TanreiChipFieldCheckDetail {
  text: string;
  values: string[];
  reason?: string;
}

/** What `reject` carries: the refused text, why, and the words shown for it (empty where nobody gave any). */
export interface TanreiChipFieldRejectDetail {
  text: string;
  reason: TanreiChipFieldRejectReason;
  message: string;
}

/** CHF-1: the props that are the Field's, given to it unchanged. `disabled`, `error` and `errorText` are the Field's too, each joined with what the chip field holds (W2, W6). */
const FIELD = ['label', 'labelHidden', 'supportingText', 'requirement', 'requiredMark', 'requiredText', 'optionalText'] as const;
/** CHF-1: the props that are the Text input's, given to it unchanged. `type`, `placeholder` and `inputValue` are its too (CHF-26, CHF-17, CHF-3). */
const INPUT = ['variant', 'size', 'readOnly', 'autocomplete'] as const;

/** CHF-26: the types the Text input draws as one line of plain text — what an entry of a list can be. */
const LINE_TYPES: readonly string[] = ['text', 'email', 'tel', 'url'];

/**
 * W4: each member's documented parts, from the member's own list. `label` and `requirement-label` are the Field's in
 * the stacked look and the Text input's in a floating one, never both (FLD-25): each under its member's name, and
 * bare from both. The Chip's leave under the prefix `entry-` — its `label` is a third thing, drawn beside the others.
 * Left out, because a chip field never draws them: the Field's count; the Text input's segments, affixes, icons,
 * picker button and grip (none is forwarded); the Chip's icon, check and avatar (CHF-2).
 */
const FIELD_PARTS = exported(TanreiField, { label: { as: 'field-label', bare: true }, 'requirement-label': { as: 'field-requirement-label', bare: true } }, ['counter', 'value-text']);
const INPUT_PARTS = exported(TanreiTextInput, { label: { as: 'text-input-label', bare: true }, 'requirement-label': { as: 'text-input-requirement-label', bare: true } }, [
  'segment',
  'prefix',
  'suffix',
  'leading-icon',
  'trailing-icon',
  'picker-button',
  'resize-grip',
]);
const CHIP_PARTS = exported(TanreiChip, { container: { as: 'entry-container' }, label: { as: 'entry-label' }, remove: { as: 'entry-remove' } }, ['icon', 'check', 'avatar']);

/** A list of texts as a property: its attribute is read as a JSON array of strings, and is never written. */
const STRINGS = {
  fromAttribute: (value: string | null): string[] => {
    try {
      const read: unknown = JSON.parse(value ?? '[]');
      return Array.isArray(read) ? read.map((entry) => String(entry)) : [];
    } catch {
      return [];
    }
  },
};

/** An edit that is typing: the piece after the last separator stays typed text (CHF-8). */
const TYPED = /^(insertText|insertCompositionText|insertFromComposition|delete)/;

interface Refused {
  text: string;
  reason: TanreiChipFieldRejectReason;
  message: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The prop that reads each of the four words with places (the spec's `words`): what a report names. */
const WORD_PROPS = { entryRemoveLabel: 'removeLabel', entryAddedText: 'addedText', entriesAddedText: 'addedCountText', entryRemovedText: 'removedText' } as const;

/**
 * Collects a list of short texts — e-mail addresses, telephone numbers, keywords — typed one after another in one
 * field. Built from a Field (`<tanrei-field>`), the Text input it frames (`<tanrei-text-input>`) and one Chip
 * (`<tanrei-chip>`) for each entry, standing in the Text input's box before the typing part: each text the product's
 * check accepts becomes a chip that can be removed or taken back, and the list is the field's one value.
 *
 * Contract: specs/chip-field.spec.json. `<tanrei-chip-field name="to" label="Recipients" type="email"
 * remove-label="Remove {entry}"></tanrei-chip-field>`, with `field.separators = [',', ';', ' ']` (or the attribute
 * `separators='[",", ";", " "]'`).
 *
 * Composed (`src/primitives/composed.ts`): its shadow root holds the members' own elements, so it draws
 * nothing of its own and has no token — every `--tanrei-comp-field-*`, `--tanrei-comp-input-box-*`,
 * `--tanrei-comp-text-input-*` and `--tanrei-comp-chip-*` value reaches the members by inheritance, and one chip field is set apart by setting such a
 * property on this element. One level down, the same picture by hand: `<tanrei-field label="Recipients">
 * <tanrei-text-input type="email"><tanrei-chip slot="entries" kind="input" size="small" label="ada@example.com"
 * remove-label="Remove ada@example.com"></tanrei-chip></tanrei-text-input></tanrei-field>`. What the chip field adds
 * to that: making entries, the keys among them, the one Tab stop, the announcements, and the list as one form value.
 *
 * **An entry is made** of the typed text by Enter, by a separator the product lists (`separators`; none by default),
 * by focus leaving the field, and from pasted text that holds a separator or a line break. Each candidate is trimmed,
 * refused where the list holds the same text (`duplicate`) or is full (`maxEntries`: `limit`), and otherwise asked of
 * the product with `check`: `event.preventDefault()` refuses it (`invalid`), and `event.detail.reason = '…'` gives the
 * words. The chip field knows no grammar: what an e-mail address is, is the product's check. A refused text stays in
 * the typing part, and while it does the field is in error with the words of the refusal — `error` and `errorText`
 * themselves do not change.
 *
 * **Keys.** The typing part is the one Tab stop. Backspace, or the arrow that points to the line's start, at the start
 * of the text moves focus to the last entry; there the arrows, Home and End move among the entries, Backspace and
 * Delete remove the one that has focus, Enter and Space take it back into the typing part to be changed, Escape and
 * Tab return to the typing part.
 *
 * `value` is an array of strings (assign a new array to change it); the `value` attribute is read once, as a JSON
 * array. `inputValue` is the text being typed. Form-associated: it submits one value per entry under `name` — none
 * while the list is empty, never the typed text —, resets to the list it was first given, is restored on navigation,
 * follows a disabled `<fieldset>`, and reports a missing value while `requirement` is `required` and the list is empty.
 *
 * The element is not focusable itself and has no role: `focus()` goes to the typing part, and its name is `label`.
 *
 * @tag tanrei-chip-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart text-input - The control: the `<tanrei-text-input>` it is built from.
 * @csspart chip - One entry: a `<tanrei-chip>` it is built from.
 * @exportparts tanrei-field label: field-label, label, requirement-label: field-requirement-label, requirement-label, -counter, -value-text
 * @exportparts tanrei-text-input label: text-input-label, label, requirement-label: text-input-requirement-label, requirement-label, -segment, -prefix, -suffix, -leading-icon, -trailing-icon, -picker-button, -resize-grip
 * @exportparts tanrei-chip container: entry-container, label: entry-label, remove: entry-remove, -icon, -check, -avatar
 * @attr {string} form - The id of the form the chip field belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires {CustomEvent<TanreiChipFieldChangeDetail>} change - The list changed by the person: an entry was made, several were made from pasted text, one was removed, or one was taken back to be changed. `detail.value` (and the element's `value`) is the new list, `detail.added` and `detail.removed` what the act added and took away. Never fired when the product sets `value`, nor for typed text.
 * @fires input - => tanrei-text-input
 * @fires {CustomEvent<TanreiChipFieldCheckDetail>} check - Asked once for each candidate entry, before it is made: `detail.text` and `detail.values`, the entries so far. Cancelable: `preventDefault()` refuses the candidate, and `detail.reason`, set by the listener, gives the words shown. Read when the event returns; an answer given later is not read.
 * @fires {CustomEvent<TanreiChipFieldRejectDetail>} reject - A candidate entry was refused: `detail.text`, `detail.reason` (`invalid`, `duplicate` or `limit`) and `detail.message`, the words shown. Once for each refused candidate.
 * @fires action - => tanrei-text-input
 */
export class TanreiChipField extends ComposedElement {
  /** CHF-24: the one control the form meets. Its members stand in its shadow root, outside every form. */
  static formAssociated = true;

  // CHF-1: a block with no width of its own. What it adds to its members' elements is drawn nowhere: the list and its
  // items have no box (their chips stand in the Text input's own lines), and the live region is hidden.
  static override styles = [
    composedHost,
    hiddenHost,
    css`
      :host {
        position: relative;
        min-inline-size: 0;
      }
      .list,
      .item {
        display: contents;
      }
      .announcer {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    `,
  ];

  /**
   * Its parts, once: the three members and what each exports — a name two export, once.
   *
   * @internal
   */
  static readonly parts: readonly string[] = [...new Set(['field', 'text-input', 'chip', ...FIELD_PARTS.names, ...INPUT_PARTS.names, ...CHIP_PARTS.names])];

  static override properties: PropertyDeclarations = {
    value: { attribute: 'value', converter: STRINGS },
    inputValue: { type: String, attribute: 'input-value' },
    separators: { attribute: 'separators', converter: STRINGS },
    maxEntries: { type: Number, attribute: 'max-entries' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    type: { type: String, reflect: true, useDefault: true },
    placeholder: { type: String },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    autocomplete: { type: String },
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
    invalidText: { type: String, attribute: 'invalid-text' },
    duplicateText: { type: String, attribute: 'duplicate-text' },
    limitText: { type: String, attribute: 'limit-text' },
    removeLabel: { type: String, attribute: 'remove-label' },
    addedText: { type: String, attribute: 'added-text' },
    addedCountText: { type: String, attribute: 'added-count-text' },
    removedText: { type: String, attribute: 'removed-text' },
    name: { type: String, reflect: true },
    refusal: { state: true },
    formDisabled: { state: true },
  };

  /**
   * The entries, in the order they were made: the one value the chip field holds. Each is a text; none is empty. The
   * chip field writes it as the person makes, removes and takes back entries, and fires `change`. What the product
   * sets is shown as given and is not checked — assign a new array — and fires nothing; an entry that is empty or only
   * white space is left out. The `value` attribute is read once, as a JSON array of strings, and is what a form reset
   * returns to.
   */
  get value(): string[] {
    return this.list;
  }

  set value(value: string[]) {
    const given = Array.isArray(value) ? value.map((entry) => String(entry)) : [];
    const kept = given.filter((entry) => entry.trim() !== '');
    // CHF-3: an entry that is empty or only white space is left out.
    if (kept.length !== given.length) report(this, 'CHF-3', 'value holds an entry that is empty or only white space; it is left out');
    // CHF-3: focus on an entry that is no longer in the list goes to the typing part, before its chip leaves.
    const focused = this.focusedChip;
    if (focused && !kept.includes(focused.label)) this.input?.focus();
    this.list = kept.length === given.length ? given : kept;
    this.refusal = null;
  }

  /** The list the element holds: what the product set, or what the person made of it. */
  private list: string[] = [];

  /** @from tanrei-text-input.value */
  get inputValue(): string {
    return this.typed ?? this.input?.value ?? '';
  }

  set inputValue(value: string) {
    this.typed = value;
    // CHF-6: the entry error ends when the product sets the text.
    this.refusal = null;
  }

  /** W5: the text last set on the element, while the Text input has not taken it. */
  private typed: string | undefined;

  /**
   * The texts that end an entry when they are typed or found in what is pasted, as the product names them for what
   * its entries are: `[',', ';', ' ']` for e-mail addresses, `[',']` for keywords that may hold a space. The
   * attribute is read as a JSON array. Empty, the default: Enter and a line break alone make an entry — a name such as
   * "Lovelace, Ada" must not be cut in two by a default. A line break always ends an entry.
   */
  separators: string[] = [];

  /** The most entries the list may hold (`max-entries`); 0 is no limit. An entry that would exceed it is refused with the reason `limit`; the typing part stays usable. It never cuts a list the product sets. */
  maxEntries = 0;

  /** @from tanrei-text-input.variant */
  variant: TanreiTextInputVariant = 'stacked';

  /** @from tanrei-text-input.size */
  size: TanreiTextInputSize = 'medium';

  /** @from tanrei-text-input.type */
  type: TanreiTextInputType = 'text';

  /** @from tanrei-text-input.placeholder */
  placeholder = '';

  /** @from tanrei-text-input.readOnly */
  readOnly = false;

  /** @from tanrei-text-input.autocomplete */
  autocomplete = '';

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

  /** @from tanrei-field.requirement */
  requirement: TanreiFieldRequirement = 'none';

  /** @from tanrei-field.requiredMark */
  requiredMark: TanreiFieldRequiredMark = 'auto';

  /** @from tanrei-field.requiredText */
  requiredText = '';

  /** @from tanrei-field.optionalText */
  optionalText = '';

  /** The error text shown while an entry was refused by the product's check and the check gave no reason of its own (`invalid-text`). This field's own: it reads no word of the product's. Empty, `errorText` is shown. */
  invalidText = '';

  /** The error text shown while an entry was refused because the list already holds the same text (`duplicate-text`): this instance's words, else the product's (`setWords({ duplicateEntryText })`); with neither, `errorText` is shown. */
  duplicateText = '';

  /** The error text shown while an entry was refused because the list holds `maxEntries` already (`limit-text`): this instance's words, else the product's (`setWords({ entryLimitText })`); with neither, `errorText` is shown. */
  limitText = '';

  /** The accessible name of each entry's remove action (`remove-label`): the whole name in your language, with the place `{entry}` that the chip field fills with that entry's text. This instance's words, else the product's (`setWords({ entryRemoveLabel })`); with neither the action is drawn, works and has no name. */
  removeLabel = '';

  /** The sentence assistive technology is told when one entry is made (`added-text`), with the place `{entry}`: this instance's words, else the product's (`setWords({ entryAddedText })`); with neither nothing is said. */
  addedText = '';

  /** The sentence assistive technology is told when several entries are made at once (`added-count-text`), with the place `{count}`: this instance's words, else the product's (`setWords({ entriesAddedText })`); with neither, `addedText` is said for the last of them. */
  addedCountText = '';

  /** The sentence assistive technology is told when an entry is removed (`removed-text`), with the place `{entry}`: this instance's words, else the product's (`setWords({ entryRemovedText })`); with neither nothing is said. */
  removedText = '';

  /** Web only: the name each entry is submitted under. */
  name = '';

  /** CHF-6: the entry error while it lasts — the first refused candidate of the last offer, and the words shown for it. */
  protected refusal: Refused | null = null;

  /** W6, item 6: a disabled `<fieldset>` around the element, or its own `disabled` attribute, as the platform says it. */
  protected formDisabled = false;

  protected override readonly hostNameSentence = 'CHF-21';

  private readonly internals = this.attachInternals();

  /** CHF-23: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** The `value` attribute has been read: it is read once. */
  private attributeRead = false;
  /** CHF-24: the list it was first given, where no `value` attribute says it. */
  private first: string[] | null = null;
  /** CHF-7: an input method is composing in the typing part. */
  private composing = false;
  /** CHF-9: the text of the typing part as the chip field last read or wrote it: what an edit is compared with. */
  private seen = '';
  /** CHF-14: the key that is being pressed on an entry, while its Chip answers it. */
  private key = '';
  /** CHF-6: the caret is put at the end of the typing part's text once it is drawn. */
  private caretToEnd = false;

  constructor() {
    super();
    // CHF-4: focus left the chip field — a move between the typing part and an entry never arrives here, since both
    // are the element itself to a listener on it. Heard on its way in (capturing), before the Text input hears that
    // it lost focus: the text that became an entry is gone from it by then, and it has no change of its own to tell.
    this.addEventListener('blur', (event) => this.onLeave(event), true);
  }

  private get input(): TanreiTextInput | null {
    return this.renderRoot?.querySelector<TanreiTextInput>('tanrei-text-input') ?? null;
  }

  /** The typing part itself: the Text input's native element, by its documented part. */
  private get native(): HTMLInputElement | null {
    return this.input?.shadowRoot?.querySelector<HTMLInputElement>('[part~="input"]') ?? null;
  }

  private get chips(): TanreiChip[] {
    return [...(this.renderRoot?.querySelectorAll<TanreiChip>('tanrei-chip') ?? [])];
  }

  private get focusedChip(): TanreiChip | null {
    const active = this.shadowRoot?.activeElement;
    return active instanceof TanreiChip ? active : null;
  }

  protected override get control(): HTMLElement | null {
    return this.input;
  }

  /** CHF-19: its own `disabled`, or a disabled fieldset's. */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** CHF-10: `maxEntries` as a whole number of 0 or more; anything else is no limit. */
  private get limit(): number {
    return Number.isInteger(this.maxEntries) && this.maxEntries > 0 ? this.maxEntries : 0;
  }

  /** CHF-9: the separators the product lists, the longest first; an empty one is none. */
  private get cuts(): string[] {
    return (Array.isArray(this.separators) ? this.separators : []).filter((separator) => typeof separator === 'string' && separator !== '').sort((a, b) => b.length - a.length);
  }

  /** CHF-9: where a text is cut — at every line break, and at every separator. */
  private get cutter(): RegExp {
    return new RegExp(['\\r\\n', '\\r', '\\n', ...this.cuts.map(escape)].join('|'), 'g');
  }

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  // ── The form (CHF-24, CHF-25) ────────────────────────────────────────────────────────────────────────────────

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

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

  /** CHF-24: the `value` attribute is read once — for markup — and is what a reset returns to. */
  override attributeChangedCallback(name: string, old: string | null, value: string | null) {
    if (name === 'value') {
      if (this.attributeRead) return;
      this.attributeRead = true;
    }
    super.attributeChangedCallback(name, old, value);
  }

  /** CHF-24: the list it was first given, an empty typing part and no entry error. */
  formResetCallback() {
    this.value = this.hasAttribute('value') ? STRINGS.fromAttribute(this.getAttribute('value')) : [...(this.first ?? [])];
    this.inputValue = '';
  }

  /** CHF-24: the list the platform kept for it. */
  formStateRestoreCallback(state: File | string | FormData | null) {
    if (typeof state === 'string') this.value = STRINGS.fromAttribute(state);
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /**
   * CHF-24: one value for each entry under its name, in order — none while the list is empty or the field disabled,
   * and never the typed text. CHF-25: an empty required list is a missing value, said where the person types.
   */
  private tellForm() {
    if (this.inert_ || !this.name) this.internals.setFormValue(null, JSON.stringify(this.list));
    else {
      const data = new FormData();
      for (const entry of this.list) data.append(this.name, entry);
      this.internals.setFormValue(data, JSON.stringify(this.list));
    }
    if (this.requirement === 'required' && this.list.length === 0 && !this.inert_) {
      const message = missingValueMessage('text', { errorText: this.errorText, requiredText: this.words.get('requiredText', this.requiredText), label: this.label });
      const anchor = this.native;
      if (anchor) this.internals.setValidity({ valueMissing: true }, message, anchor);
      else this.internals.setValidity({ valueMissing: true }, message);
    } else this.internals.setValidity({});
  }

  // ── Making entries (CHF-4 to CHF-10) ─────────────────────────────────────────────────────────────────────────

  /** CHF-6: the words shown for a refusal — the check's own; the reason's; `errorText`. */
  private wordsOf(reason: TanreiChipFieldRejectReason, given: string): string {
    const byReason = reason === 'invalid' ? this.invalidText : reason === 'duplicate' ? this.words.get('duplicateEntryText', this.duplicateText) : this.words.get('entryLimitText', this.limitText);
    return [given, byReason, this.errorText].find((text) => typeof text === 'string' && text.trim() !== '') ?? '';
  }

  /**
   * CHF-5: decides each candidate in order, against the list as it grows — the same text, the limit, then the
   * product's check, answered before the event returns. Changes nothing: the caller applies what was decided.
   */
  private decide(candidates: string[]): { list: string[]; added: string[]; refused: Refused[] } {
    const list = [...this.list];
    const added: string[] = [];
    const refused: Refused[] = [];
    const limit = this.limit;
    for (const candidate of candidates) {
      const text = candidate.trim();
      // CHF-4: an empty candidate makes nothing and is refused to no one.
      if (!text) continue;
      if (list.includes(text)) {
        refused.push({ text, reason: 'duplicate', message: this.wordsOf('duplicate', '') });
        continue;
      }
      if (limit > 0 && list.length >= limit) {
        refused.push({ text, reason: 'limit', message: this.wordsOf('limit', '') });
        continue;
      }
      const check = new CustomEvent<TanreiChipFieldCheckDetail>('check', { bubbles: true, composed: true, cancelable: true, detail: { text, values: [...list] } });
      if (!this.dispatchEvent(check)) {
        refused.push({ text, reason: 'invalid', message: this.wordsOf('invalid', typeof check.detail.reason === 'string' ? check.detail.reason : '') });
        continue;
      }
      list.push(text);
      added.push(text);
    }
    return { list, added, refused };
  }

  /**
   * CHF-4, CHF-8: reads `text` as a row of candidates and offers each. `tail`: the piece after the last separator
   * stays typed text (it was typed) — otherwise it is offered with the others. The accepted become entries, with one
   * `change` and one announcement; the refused stay in the typing part, joined, under the entry error of the first,
   * with one `reject` each. Returns whether nothing was refused.
   */
  private offer(text: string, { tail = false, removed = [] as string[], then }: { tail?: boolean; removed?: string[]; then?: (list: string[]) => { list: string[]; text: string } | null } = {}): boolean {
    const pieces = text.split(this.cutter);
    const rest = tail ? (pieces.pop() ?? '') : '';
    const single = pieces.length === 1;
    const { list, added, refused } = this.decide(pieces);
    // CHF-6: one refused text that is all there was stays as the person wrote it; several are joined by the first
    // separator and a space, or by one space (CHF-8), and typed text follows them.
    const joiner = this.cuts.length ? `${(this.separators.find((separator) => separator !== '') ?? '')} ` : ' ';
    let left = refused.length === 0 ? rest : single && !tail ? text : [...refused.map((one) => one.text), ...(rest ? [rest] : [])].join(joiner);
    let next = list;
    // CHF-15: what follows an offer that refused nothing — the entry taken back.
    const after = refused.length === 0 ? then?.(list) : null;
    if (after) {
      next = after.list;
      left = after.text;
    }
    const changed = added.length > 0 || !!after;
    if (changed) this.list = next;
    this.typed = left;
    this.seen = left;
    // The Text input holds the text at once (its own render draws it): what it then tells of its text is true.
    const input = this.input;
    if (input && input.value !== left) input.value = left;
    this.refusal = refused[0] ?? null;
    this.caretToEnd = refused.length > 0 || !!after;
    this.requestUpdate();
    if (changed) {
      this.dispatchEvent(new CustomEvent<TanreiChipFieldChangeDetail>('change', { bubbles: true, composed: true, detail: { value: next, added, removed: after ? removed : [] } }));
      this.announceAdded(added);
    }
    for (const one of refused) {
      // CHF-6: a refusal nobody gave words for still marks the typing part invalid.
      if (!one.message) report(this, 'CHF-6', `an entry was refused (${one.reason}) and no words say why: give invalidText, duplicateText, limitText or errorText, or a reason in check`);
      this.dispatchEvent(new CustomEvent<TanreiChipFieldRejectDetail>('reject', { bubbles: true, composed: true, detail: { text: one.text, reason: one.reason, message: one.message } }));
    }
    return refused.length === 0;
  }

  /** The typing part's own events arrive with the Text input as their target; an entry's with its Chip. */
  private fromTyping(event: Event): boolean {
    return event.target === this.input;
  }

  /**
   * CHF-4: the action key on text makes an entry — before the Text input hears the key, so that it emits no `action`
   * and submits no form. On an empty typing part the key is the Text input's (CHF-16), and so it is while an input
   * method composes (CHF-7) and in a read-only field (CHF-20).
   */
  private readonly onTypingKeyFirst = {
    capture: true,
    handleEvent: (event: KeyboardEvent) => {
      if (!this.fromTyping(event) || event.isComposing || this.composing || event.keyCode === 229) return;
      if (event.key !== 'Enter') return this.onTypingKey(event);
      if (this.inert_ || this.readOnly || this.inputValue === '') return;
      event.preventDefault();
      event.stopPropagation();
      this.offer(this.inputValue);
    },
  };

  /**
   * CHF-12: at the start of the text, with nothing selected, Backspace or the arrow that points to where the line
   * starts moves focus to the last entry and removes nothing. Never for the repeats of a held key, and never while
   * the list is empty.
   */
  private onTypingKey(event: KeyboardEvent) {
    if (event.repeat || this.inert_ || this.list.length === 0) return;
    if (event.key !== 'Backspace' && event.key !== (this.rtl ? 'ArrowRight' : 'ArrowLeft')) return;
    if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const native = this.native;
    if (!native || native.selectionStart !== 0 || native.selectionEnd !== 0) return;
    event.preventDefault();
    this.chips.at(-1)?.focus();
  }

  /**
   * CHF-8: text that is pasted or dropped is read before the single line of the typing part loses its line breaks.
   * Where it holds a line break or a separator, it is read with the text already there as a row of candidates, each
   * offered; text that holds neither is the Text input's own to take.
   */
  private onBeforeInput(event: InputEvent) {
    if (!this.fromTyping(event) || this.inert_ || this.readOnly || event.isComposing || this.composing) return;
    if (event.inputType !== 'insertFromPaste' && event.inputType !== 'insertFromDrop') return;
    const data = event.data ?? event.dataTransfer?.getData('text/plain') ?? '';
    if (!data || !this.cutter.test(data)) return;
    event.preventDefault();
    const native = this.native;
    const text = this.inputValue;
    const [start, end] = [native?.selectionStart ?? text.length, native?.selectionEnd ?? text.length];
    this.offer(`${text.slice(0, start)}${data}${text.slice(end)}`);
  }

  /**
   * CHF-9: a separator that came to stand in the typing part — by a key, a touch keyboard, a committed composition,
   * dictation, or what the platform filled in — is found in the text, in what the edit added, never by the key. The
   * text before it is offered and the text after it stays typed; filled-in text is offered whole (CHF-8). CHF-6: an
   * edit of the text ends the entry error.
   */
  private onInput(event: Event) {
    if (!this.fromTyping(event)) return;
    if ((event as InputEvent).isComposing || this.composing) return;
    const text = this.inputValue;
    const before = this.seen;
    this.seen = text;
    if (text !== before) this.refusal = null;
    if (this.inert_ || this.readOnly) return;
    // What the edit added: the text between what the two share at their start and at their end.
    let [from, to] = [0, text.length];
    while (from < text.length && from < before.length && text[from] === before[from]) from++;
    while (to > from && before.length - (text.length - to) > from && text[to - 1] === before[before.length - (text.length - to) - 1]) to--;
    // …and, for a separator of several characters, as many around it as could complete one with it.
    const reach = Math.max(1, ...this.cuts.map((cut) => cut.length)) - 1;
    if (!this.cutter.test(text.slice(Math.max(0, from - reach), to + reach))) return;
    this.offer(text, { tail: TYPED.test((event as InputEvent).inputType ?? '') });
  }

  private onCompositionStart(event: Event) {
    if (this.fromTyping(event)) this.composing = true;
  }

  private onCompositionEnd(event: Event) {
    if (this.fromTyping(event)) this.composing = false;
  }

  /**
   * CHF-4: focus left the chip field for another part of the product: what was typed is offered. Not when the window
   * itself lost focus, and never bringing focus back.
   */
  private onLeave(event: FocusEvent) {
    const to = event.relatedTarget;
    if (to instanceof Node && (to === this || this.contains(to))) return;
    if (!to && !this.ownerDocument.hasFocus()) return;
    if (this.inert_ || this.readOnly || this.composing) return;
    const text = this.inputValue;
    if (text === '') return;
    this.offer(text);
    // CHF-6: the caret is the person's where they went; nothing here asks for focus.
    this.caretToEnd = false;
  }

  /** CHF-16: the Text input's own `change` — of its text — is not the chip field's, whose `change` is of the list. */
  private onMemberEvent(event: Event) {
    if (event.target === this.input) event.stopPropagation();
  }

  // ── The entries (CHF-11 to CHF-15) ───────────────────────────────────────────────────────────────────────────

  private readonly onEntryKeyFirst = {
    capture: true,
    handleEvent: (event: KeyboardEvent) => {
      this.key = event.repeat ? '' : event.key;
    },
  };

  /** CHF-13: the keys among the entries. Each arrow moves the way it points; nothing is activated or removed here. */
  private onEntryKey(event: KeyboardEvent) {
    this.key = '';
    const chips = this.chips;
    const index = chips.findIndex((chip) => chip === event.target);
    if (index < 0) return;
    // CHF-11: Tab from an entry is the typing part — with the modifier too by which a platform walks every control —
    // and Shift+Tab leaves backwards, as the platform has it.
    if (event.key === 'Tab') {
      if (event.shiftKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      this.focusTyping();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const forward = this.rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = this.rtl ? 'ArrowRight' : 'ArrowLeft';
    switch (event.key) {
      case forward:
        event.preventDefault();
        if (chips[index + 1]) chips[index + 1]!.focus();
        else this.focusTyping('start');
        return;
      case backward:
        event.preventDefault();
        chips[index - 1]?.focus();
        return;
      case 'Home':
        event.preventDefault();
        chips[0]!.focus();
        return;
      case 'End':
        event.preventDefault();
        chips.at(-1)!.focus();
        return;
      case 'ArrowUp':
      case 'ArrowDown':
        // One row in its order, however many lines draw it.
        event.preventDefault();
        return;
      case 'Escape':
        event.preventDefault();
        this.focusTyping();
        return;
      default:
        // A character: typed in the typing part, where the key's text then goes. Enter and Space are the Chip's own.
        if (event.key.length === 1 && event.key !== ' ' && !event.isComposing) this.focusTyping();
    }
  }

  /** Focus to the typing part; `caret` puts the caret at the start of its text (CHF-13) — otherwise where it was. */
  private focusTyping(caret?: 'start') {
    this.input?.focus();
    if (caret === 'start') this.placeCaret(0);
  }

  private placeCaret(at: number) {
    try {
      this.native?.setSelectionRange(at, at);
    } catch {
      // A native element without a selection: the caret stays where the browser has it.
    }
  }

  /**
   * CHF-14: an entry's Chip asked for its removal (CHP-22 leaves the removing and the focus to its owner). Focus goes
   * first, while the chip is still there: after Backspace to the entry before, or the one after where it was the
   * first; after Delete or the remove action to the entry after; to the typing part where there is none.
   */
  private onEntryRemove(event: Event) {
    event.stopPropagation();
    const key = this.key;
    this.key = '';
    if (this.inert_ || this.readOnly) return;
    const chips = this.chips;
    const index = chips.indexOf(event.currentTarget as TanreiChip);
    const entry = this.list[index];
    if (entry === undefined) return;
    const to = key === 'Backspace' ? (chips[index - 1] ?? chips[index + 1]) : chips[index + 1];
    if (to) to.focus();
    else this.focusTyping();
    this.list = this.list.filter((_, at) => at !== index);
    this.refusal = null;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent<TanreiChipFieldChangeDetail>('change', { bubbles: true, composed: true, detail: { value: this.list, added: [], removed: [entry] } }));
    this.announce('entryRemovedText', this.removedText, { entry }, 'nothing is said when an entry is removed');
  }

  /**
   * CHF-15: the Chip itself was activated — the entry is taken back to be changed. What is typed is offered first; if
   * it is refused nothing more happens. Then the entry leaves the list and its text stands in the typing part, with
   * focus and the caret at its end, and `change` is fired once.
   */
  private onEntryClick(event: Event) {
    if (this.inert_ || this.readOnly) return;
    const index = this.chips.indexOf(event.currentTarget as TanreiChip);
    const entry = this.list[index];
    if (entry === undefined) return;
    this.input?.focus();
    // What the offer adds stands after the entries that were there: the entry's place is still its own.
    this.offer(this.inputValue, { removed: [entry], then: (list) => ({ list: list.filter((_, at) => at !== index), text: entry }) });
  }

  // ── What is said (CHF-22, CHF-23) ────────────────────────────────────────────────────────────────────────────

  private announceAdded(added: string[]) {
    if (added.length === 0) return;
    if (added.length > 1 && this.words.get('entriesAddedText', this.addedCountText)) {
      const count = new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0 }).format(added.length);
      this.announce('entriesAddedText', this.addedCountText, { count }, '');
    } else this.announce('entryAddedText', this.addedText, { entry: added.at(-1)! }, 'nothing is said when an entry is made');
  }

  /**
   * CHF-22: one sentence of the product's in the live region, in place of what it held. With no sentence nothing is said.
   * CHF-23: another text between braces and a brace that opens or closes nothing are said as written, and reported.
   */
  private announce(key: 'entryAddedText' | 'entriesAddedText' | 'entryRemovedText', own: string, places: Record<string, string>, effect: string) {
    const region = this.renderRoot.querySelector('.announcer');
    if (!region) return;
    const sentence = this.words.get(key, own);
    if (!sentence) {
      region.replaceChildren();
      if (effect) this.words.missing(key, { id: 'CHF-23', effect });
      return;
    }
    this.reportWord(key, sentence, 'it is said as it is written');
    region.replaceChildren(
      ...fillPlaces(sentence, places).runs.map((run) => {
        if (run.place !== 'entry') return run.text;
        // An entry is text of its own direction inside the product's sentence, isolated from it.
        const entry = document.createElement('bdi');
        entry.textContent = run.text;
        return entry;
      }),
    );
  }

  /** CHF-23: reports what of a sentence is not a place of its word, and a brace that opens or closes nothing. */
  private reportWord(key: keyof typeof WORD_PROPS, sentence: string, effect: string) {
    reportPlaces(this, 'CHF-23', WORD_PROPS[key], sentence, wordPlaces[key] ?? [], effect);
  }

  /**
   * CHF-2, CHF-23: the name of one entry's remove action — the product's sentence with its place filled. A plain
   * string: nothing is added to a name for the entry's direction.
   */
  private removeName(sentence: string, entry: string): string {
    return fillPlaces(sentence, { entry })
      .runs.map((run) => run.text)
      .join('');
  }

  // ── Updates ──────────────────────────────────────────────────────────────────────────────────────────────────

  protected override firstUpdated() {
    // CHF-24: the list it was first given, where markup did not say it.
    this.first = [...this.list];
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    // W5: the render that has just ended gave the Text input the text that was set; from here the text is its own.
    if (this.typed !== undefined) {
      this.seen = this.typed;
      this.typed = undefined;
    }
    this.tellForm();
    // The typing part is drawn by the Text input's own update: the anchor of a missing value, and the caret, are its.
    if (!this.native || this.caretToEnd) {
      const caret = this.caretToEnd;
      this.caretToEnd = false;
      void this.input?.updateComplete.then(() => {
        if (!this.isConnected) return;
        this.tellForm();
        if (caret && this.shadowRoot?.activeElement === this.input) this.placeCaret(this.inputValue.length);
      });
    }
    // CHF-26: only a type the Text input draws as one line of plain text is an entry of a list.
    if (changed.has('type') && !LINE_TYPES.includes(this.type)) report(this, 'CHF-26', `type "${this.type}" is not a type of an entry (text, email, tel, url); the typing part behaves as "text"`);
    // CHF-10: a limit that is no whole number of 0 or more is no limit.
    if (changed.has('maxEntries') && !(Number.isInteger(this.maxEntries) && this.maxEntries >= 0)) report(this, 'CHF-10', `maxEntries ${String(this.maxEntries)} is not a whole number of 0 or more; there is no limit`);
    // CHF-9: an empty separator would end an entry at every character.
    if (changed.has('separators') && Array.isArray(this.separators) && this.separators.some((separator) => separator === '')) report(this, 'CHF-9', 'separators holds an empty text, which is ignored');
    // CHF-23: the remove actions are drawn and work without a name; two of them with one name cannot be told apart.
    if (this.list.length && !this.readOnly && this.isConnected) {
      const sentence = this.words.get('entryRemoveLabel', this.removeLabel);
      if (!sentence) this.words.missing('entryRemoveLabel', { id: 'CHF-23', effect: 'each entry\'s remove action is drawn and works, and has no accessible name' });
      else {
        this.reportWord('entryRemoveLabel', sentence, 'each remove action is named with it as it is written');
        // The one place of any word that is needed (the spec's `required`): without it two actions have one name.
        for (const name of placeFaults(sentence, wordPlaces.entryRemoveLabel ?? []).absent) report(this, 'CHF-23', `removeLabel has no place {${name}}, so every remove action has the same name; write it as "Remove {${name}}"`);
      }
    }
  }

  // CHF-1: a Field whose one control is a Text input, with a Chip for each entry in the Text input's entries slot —
  // exactly as a product writes the three. What is added is drawn nowhere: the list around the chips (CHF-21) and the
  // live region (CHF-22). No text stands between the Field's tags: its control is its one child without a slot.
  protected override render() {
    const inert = this.inert_;
    const sentence = this.words.get('entryRemoveLabel', this.removeLabel);
    const refusal = this.refusal;
    // CHF-21: the entries are one list named by the label, each an item that holds its Chip; no list while it is empty.
    // CHF-11: every Chip, and with it its remove action, is out of the Tab order (CHP-23: a host that delegates focus
    // and has a negative tabindex), and stays focusable by the keys, by pointer and by assistive technology.
    // An entry is known by its text, and by which of several of one text it is (what a product sets is not checked).
    const met = new Map<string, number>();
    const keys = this.list.map((entry) => {
      met.set(entry, (met.get(entry) ?? 0) + 1);
      return `${met.get(entry)}:${entry}`;
    });
    const entries = this.list.length
      ? html`<div slot="entries" class="list" role="list" aria-label=${this.label || nothing} @keydown=${this.onEntryKeyFirst}
          >${repeat(
            this.list,
            (_, index) => keys[index],
            (entry) =>
              html`<div class="item" role="listitem"
                ><tanrei-chip
                  part="chip"
                  exportparts=${CHIP_PARTS.attribute}
                  tabindex="-1"
                  kind="input"
                  size="small"
                  .label=${entry}
                  .removeLabel=${this.removeName(sentence, entry)}
                  .disabled=${inert}
                  .removable=${!this.readOnly}
                  @keydown=${this.onEntryKey}
                  @click=${this.onEntryClick}
                  @remove=${this.onEntryRemove}
                ></tanrei-chip
              ></div>`,
          )}</div
        >`
      : nothing;
    return html`<tanrei-field
        part="field"
        exportparts=${FIELD_PARTS.attribute}
        ${forward(this, FIELD)}
        .disabled=${inert}
        .error=${this.error || !!refusal}
        .errorText=${refusal?.message || this.errorText}
        >${this.pass('label-icon')}<tanrei-text-input
          part="text-input"
          exportparts=${INPUT_PARTS.attribute}
          ${forward(this, INPUT)}
          .type=${LINE_TYPES.includes(this.type) ? this.type : 'text'}
          .placeholder=${this.list.length ? '' : this.placeholder}
          .value=${live(this.inputValue)}
          @keydown=${this.onTypingKeyFirst}
          @beforeinput=${this.onBeforeInput}
          @input=${this.onInput}
          @compositionstart=${this.onCompositionStart}
          @compositionend=${this.onCompositionEnd}
          @change=${this.onMemberEvent}
          @pickerrequest=${this.onMemberEvent}
          @entryerror=${this.onMemberEvent}
          >${entries}</tanrei-text-input
        ></tanrei-field
      ><span class="announcer" aria-live="polite"></span>`;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiChipField);
if (!customElements.get('tanrei-chip-field')) customElements.define('tanrei-chip-field', TanreiChipField);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-chip-field': TanreiChipField;
  }
}
