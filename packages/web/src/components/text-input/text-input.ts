import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  GlyphMirrorController,
  type DateKind,
  FALLBACK_LOCALE,
  NativeTextController,
  FieldControlController,
  type FieldSays,
  OpenAxesController,
  type SegmentUnit,
  ambientLocale,
  asciiDigits,
  hostAria,
  isoValue,
  parseValues,
  readText,
  report,
  supportedLocale,
  syncFocusStyle,
  withinRange,
  WordsController,
} from '../../primitives/index.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import type { TanreiInputBoxSizeRegistry, TanreiInputBoxVariantRegistry } from '../../registry.js';
import {
  EMPTY_SEGMENTS,
  PAGE,
  type Row,
  SEPARATORS,
  type Segments,
  edged,
  erased,
  fill,
  holds,
  periodTyped,
  placeholderOf,
  rowOf,
  rowText,
  segmentsOf,
  shownOf,
  sizersOf,
  spoken,
  stepped,
  typed,
  valueOf,
} from './text-input-segments.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { FormSays } from '../../primitives/form-says.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { AXES, INSET, styles } from './text-input.styles.js';
import { runDirection } from '../../styles/product-text.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { fillPlaces, reportPlaces } from '../../primitives/places.js';
import { wordPlaces } from '../../generated/words.js';

/** The looks of the input box (stacked, filled, outlined), plus any a design system's generated `.d.ts` registers for the box. */
export type TanreiTextInputVariant = keyof TanreiInputBoxVariantRegistry;
/** The box's sizes a text input offers (medium, large — `small` is a size of the box it does not offer), plus any a design system's generated `.d.ts` registers. */
export type TanreiTextInputSize = Exclude<keyof TanreiInputBoxSizeRegistry, 'small'>;
/** What the value is: the keyboard, autocorrection, obscured entry and semantics (TXI-20). */
export type TanreiTextInputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'code' | 'date' | 'time' | 'date-time';

/** How a multi-line field gets its height (TXI-17). */
export type TanreiTextInputResize = 'auto' | 'manual' | 'fixed';
/** What the person can resize by hand (TXI-39). */
export type TanreiTextInputResizeAxis = 'vertical' | 'both';

/** `disabled-dates`: a space-separated list or a JSON array (src/primitives/values.ts). An element composed around the input declares the same converter. */
export const DISABLED_DATES = { fromAttribute: parseValues, toAttribute: (value: string[]) => value.join(' ') };
const RESIZES: readonly TanreiTextInputResize[] = ['auto', 'manual', 'fixed'];
const RESIZE_AXES: readonly TanreiTextInputResizeAxis[] = ['vertical', 'both'];
/** A press on the resize grip that ends within this many pixels of where it began is a click, not a drag (TXI-41). */
const DRAG_SLOP = 3;

/** What `action` carries: the value when the action key was pressed. */
export interface TanreiTextInputActionDetail {
  value: string;
}

/** What `pickerrequest` carries (TXI-33): the value — empty while the row is half-filled or not available — and what the picker needs. */
export interface TanreiTextInputPickerRequestDetail {
  /** The ISO 8601 value, or empty. */
  value: string;
  type: DateKind;
  /** The earliest value the field accepts from the person, ISO 8601, or empty. */
  min: string;
  /** The latest value the field accepts from the person, ISO 8601, or empty. */
  max: string;
}

/** What `entryerror` carries (TXI-30): why the committed row gives no available value, and its text as drawn. */
export interface TanreiTextInputEntryErrorDetail {
  /** `invalid`: some segments are empty; `unavailable`: a value before `min`, after `max` or listed in `disabledDates`. */
  reason: 'invalid' | 'unavailable';
  text: string;
}

/** An entry error while it lasts (TXI-30): its reason, the row's text it was committed with, and what made it unavailable. */
interface EntryError extends TanreiTextInputEntryErrorDetail {
  side?: 'under' | 'over' | 'listed';
}

/** The variants the field lays out by name; any other value is laid out as stacked, the default (TXI-9). */
type Layout = 'stacked' | 'filled' | 'outlined';
/** The Button sizes every design system has: the picker button takes the field's size name where Button has it (TXI-32). */
const BUTTON_SIZES = new Set(['small', 'medium', 'large']);

/**
 * TXI-20: how each type is given to the browser. The native element's own type is used only where it adds nothing the
 * field must not do: an `email` or `url` input would validate and trim the value, and a `number` input would parse it,
 * so those are text inputs with the matching keyboard (`inputmode`). Values that read left to right are laid out so in
 * a right-to-left field (TXI-24). `code` (TXI-53 to TXI-55) is the general case of a value that is not prose: a general
 * keyboard, nothing the browser would do to words, and an input line that is left to right and begins at the left.
 */
const TYPES: Record<TanreiTextInputType, { type: string; inputmode?: string; enterkeyhint?: string; plain?: boolean; ltr?: boolean; code?: boolean; date?: DateKind }> = {
  text: { type: 'text' },
  email: { type: 'text', inputmode: 'email', plain: true, ltr: true },
  password: { type: 'password', plain: true, ltr: true },
  number: { type: 'text', inputmode: 'decimal', ltr: true },
  search: { type: 'search', enterkeyhint: 'search' },
  tel: { type: 'tel', inputmode: 'tel', ltr: true },
  url: { type: 'text', inputmode: 'url', plain: true, ltr: true },
  code: { type: 'text', plain: true, ltr: true, code: true },
  // TXI-20, TXI-28: a row of segments in the locale's numeric form, never the native date and time inputs (the web's note).
  date: { type: 'text', plain: true, date: 'date' },
  time: { type: 'text', plain: true, date: 'time' },
  'date-time': { type: 'text', plain: true, date: 'date-time' },
};

type Segmenter = { segment(input: string): Iterable<{ segment: string }> };
let segmenter: Segmenter | null | undefined;
/** The user-perceived characters of a string (grapheme clusters: an emoji, or a letter with its accents, is one). */
function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    const Intl_ = Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: string }) => Segmenter };
    segmenter = Intl_.Segmenter ? new Intl_.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  }
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

/**
 * TXI-18: the value an edit from `before` to `after` may leave under a limit of `max` user-perceived characters. The edit
 * is what differs between the two (the text between their common start and common end); what it inserted is cut to the
 * characters that still fit — nothing, for a keystroke at the limit — so a paste is shortened and a keystroke refused.
 */
function fit(before: string, after: string, max: number): { value: string; caret: number } {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  // Never split a character: move the edges out to whole grapheme boundaries of the new value.
  const bounds = [0];
  for (const g of graphemes(after)) bounds.push(bounds[bounds.length - 1] + g.length);
  start = Math.max(...bounds.filter((b) => b <= start));
  const tail = Math.min(...bounds.filter((b) => b >= after.length - end));
  const head = after.slice(0, start);
  const rest = after.slice(tail);
  const room = Math.max(0, max - graphemes(head).length - graphemes(rest).length);
  const inserted = graphemes(after.slice(start, tail)).slice(0, room).join('');
  return { value: head + inserted + rest, caret: head.length + inserted.length };
}

/**
 * The promise of the page's faces (`document.fonts.ready`), taken once for all the fields of a turn: the getter has the
 * browser bring the page's style up to date, and each field asked in its own first update, after writing its own
 * shadow tree — one style pass and one layout for each field.
 */
/** A scroll height is a whole number of pixels and a line may not be: within a twentieth of a line it is that many lines. */
const wholeLines = (lines: number) => (Math.abs(lines - Math.round(lines)) < 0.05 ? Math.max(1, Math.round(lines)) : Math.max(1, lines));

/**
 * TXI-17, TXI-38: the fields whose height is fitted without motion in this turn — the first height of each, one that
 * follows a prop, one that follows the faces' arrival — fitted together: every field takes one step of `fitting()`
 * before any takes the next, so all of them read, then all write. Still in the task that drew them, before any frame.
 */
const toFit = new Set<TanreiTextInput>();
function fitTogether(field: TanreiTextInput) {
  if (!toFit.size) {
    queueMicrotask(() => {
      let fits = [...toFit].filter((each) => each.isConnected).map((each) => each.fitting(false));
      toFit.clear();
      while (fits.length) fits = fits.filter((fit) => !fit.next().done);
    });
  }
  toFit.add(field);
}

let faces: Promise<unknown> | null | undefined;
function facesArrived(): Promise<unknown> | null {
  if (faces === undefined) {
    faces = typeof document === 'undefined' ? null : (document.fonts?.ready ?? null);
    queueMicrotask(() => (faces = undefined));
  }
  return faces;
}

/**
 * TXI-13: the lines a copy of the label is laid out in, and the width of the widest, in the copy's own (untransformed)
 * pixels. Each line is the run of text fragments that share a vertical band; a field that is not laid out has one line.
 */
function labelLines(copy: HTMLElement | null): { count: number; widest: number } {
  if (!copy) return { count: 1, widest: 0 };
  const range = document.createRange();
  range.selectNodeContents(copy);
  const lines: { top: number; bottom: number; left: number; right: number }[] = [];
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.top - b.top);
  for (const rect of rects) {
    const middle = (rect.top + rect.bottom) / 2;
    const line = lines.find((l) => middle >= l.top && middle <= l.bottom);
    if (line) {
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
    } else lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
  }
  // An ancestor may be scaled (a dialog opening): the widths are wanted in the copy's own pixels.
  const box = copy.getBoundingClientRect().width;
  const own = Number.parseFloat(getComputedStyle(copy).width);
  const scale = box > 0 && own > 0 ? box / own : 1;
  return { count: Math.max(1, lines.length), widest: Math.max(0, ...lines.map((l) => (l.right - l.left) / scale)) };
}


/**
 * The box people type in, and everything typed in it — one line, or several that follow the text or are resized by
 * hand, or a date or a time entered unit by unit in the locale's form — with optional icons, a prefix and a suffix, a
 * picker button, and, in the two looks that have one, the label that floats inside the box. It has no label row, no
 * help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use
 * `<tanrei-text-field>`, which is the two as one element. Bare, it is for a place whose label stands elsewhere: a
 * filter in a toolbar, a cell of a table, a row with its label beside it; give it `label` there.
 *
 * Contract: specs/text-input.spec.json. `<tanrei-field label="Email"><tanrei-text-input name="email" type="email">
 * </tanrei-text-input></tanrei-field>`, or bare: `<tanrei-text-input name="q" type="search" label="Filter tokens">
 * </tanrei-text-input>`. The box is drawn from `--tanrei-comp-input-box-*`, the one set of
 * tokens every input box is drawn from (TXI-68), one set per variant, look (plain or error) and state — how a state
 * looks is the active design system's decision — and what a text input alone draws (the resize grip, a segment, the
 * code face, the entries place) from `--tanrei-comp-text-input-*`. The text is edited in a native
 * `<input>` — a `<textarea>` while `multiline` — in the shadow root, so input methods, autofill,
 * selection and the clipboard work as the browser does. The name (its own `label`, else its Field's), the description
 * (the prefix and the suffix while shown, the count, then what its Field gives) and the invalid, required, read-only
 * and disabled states are set on that element.
 *
 * It is a block as wide as its place, framed and bare alike (TXI-63): it has no width of its own. A narrower box is a
 * narrower place.
 *
 * It tells the Field around it what only it knows, through the Field's own connection (`src/primitives/field.ts`):
 * that it draws the label itself while its look floats one, how far its text stands from its edges — the Field's
 * supporting row starts and ends there — and its own refusal of a date or a time, with its words (TXI-62). It takes
 * from that Field its name, its description, the required, invalid and disabled states, whether the label is hidden,
 * and whether an asterisk or the optional word follows a floating label. `countText` is the count it keeps while `counter` is set, as text
 * ("12/40"): it describes and announces the count and draws none — a Field draws it, given it as `count-text`.
 *
 * `stacked` (the default) draws no label — the label above it is its Field's row — and marks focus and error with a
 * line inside the container's edge; `filled` and `outlined` float the label inside the box. A design system may leave some out
 *: they still work, and a debug build says so.
 *
 * `multiline` with `resize="auto"` (the default) follows its lines between `min-rows` and `max-rows` with an animated
 * height; `resize="manual"` draws a grip in the bottom end corner that is dragged, moved with the arrow keys, or
 * activated to fit the text (`resize-axis="both"` resizes the width too); `resize="fixed"` stays at `min-rows`.
 *
 * `type="code"` is a field whose value is written for a machine — a pattern, a key, a snippet of configuration — on one
 * line or, with `multiline`, on many: the input line (prefix, value, placeholder, suffix) is one left-to-right row in
 * the code face that begins at the left in every layout direction, while the label, the icons, the messages and the
 * grip follow the page; the browser is asked not to correct, capitalise, spell-check, translate or complete it; a paste
 * is plain text, character for character; Tab still moves focus. `no-wrap` keeps each line of a multi-line code field
 * on one row and scrolls it sideways inside the container. It is a field, not an editor: no syntax colors, no line
 * numbers, no Tab that indents.
 *
 * `date`, `time` and `date-time` are the stated exception to the native element: a row of segments — one spin button
 * per unit, in the locale's order — that are focused, stepped, typed into and cleared on their own, held as ISO 8601
 * (`2026-09-27`, `14:30`, `2026-09-27T14:30`) or empty while a segment is empty or the value is not available. A whole
 * date can be pasted. With `picker`, the field shows a picker button that asks the product to present a picker
 * (`pickerrequest`); the field presents none itself.
 *
 * Form-associated: with a `name` it submits `value`, resets to its `value` attribute, restores on navigation, joins
 * constraint validation (a missing value while its Field says it is required; a date or time field's entry error as badInput,
 * rangeUnderflow, rangeOverflow or a custom error) and is left out while disabled — its own or a `<fieldset>`'s.
 *
 * @tag tanrei-text-input
 * @slot leading-icon - An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot trailing-icon - An icon at the end of the field, or the product's own icon-only Button (clear, reveal password). A date or time field's picker button comes after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 * @slot entries - What was entered already — the product's own elements, or the chips of a component that holds the input (a chip field): laid out inside the box before the typing part, in lines that wrap (TXI-64). The text input gives them no role, no focus order and no key (TXI-66).
 * @csspart container - The box around the input: its fill, corners and hover state layer.
 * @csspart outline - The outlined variant's border (with the gap for the floated label); a stacked field's inner line.
 * @csspart active-indicator - The filled variant's bottom line.
 * @csspart label - The label that floats in a filled or an outlined box.
 * @csspart requirement-label - The required asterisk, or the optional word, after a floating label.
 * @csspart input - The native `<input>` or `<textarea>`; a date, time or date-time field's row of segments.
 * @csspart entries - What was entered already, before the typing part: the content of the `entries` slot. The text input lays it out and draws none of it, so the part has no box of its own.
 * @csspart segment - One unit of a date or a time: a spin button in the row.
 * @csspart prefix - The fixed text before the value.
 * @csspart suffix - The fixed text after the value.
 * @csspart leading-icon - The box of the leading icon.
 * @csspart trailing-icon - The box of the trailing icon.
 * @csspart picker-button - The picker button, a `<tanrei-button>` (TXI-32).
 * @csspart resize-grip - The grip of a multi-line field resized by hand (TXI-39).
 * @attr {string} form - The id of the form the text input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The user changed the value (typing, deleting, pasting, dictation, autofill, an input method); `value` is already the new one. A date or time field fires it when its value changes — its last segment is filled, a filled row is edited, or it is emptied — not for a segment that leaves the value empty. Never fired when the product sets `value`.
 * @fires change - The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * @fires {CustomEvent<TanreiTextInputActionDetail>} action - The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 * @fires {CustomEvent<TanreiTextInputPickerRequestDetail>} pickerrequest - The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * @fires {CustomEvent<TanreiTextInputEntryErrorDetail>} entryerror - The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 */
export class TanreiTextInput extends LitElement {
  private readonly availability = new AvailabilityController(this, 'text-input');
  /**
   * TXI-35: the glyphs in the leading-icon and trailing-icon slots are marked when the icon set mirrors
   * their names in right-to-left, or the product's `data-mirror` says so (src/primitives/glyph-mirror.ts);
   * `iconGlyph()` draws the mark. The picker button's glyph is its Button's (TXI-32) and is not one the icon set flags,
   * and the resize grip's glyphs are never marked.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="leading-icon"], slot[name="trailing-icon"]' });
  /**
   * TXI-22, TXI-39: the resize grip's glyph is drawn once the icon set can draw it; until then nothing stands in its
   * place — not its name spelled out in a text face (src/primitives/glyph.ts).
   */
  private readonly gripGlyph = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.grip-glyph'));
  /**
   * TXI-62: the input's side of the exchange with the Field that frames it (src/primitives/field.ts). It takes the
   * Field's name, description and states, whether the label is hidden and whether an asterisk follows it; and it says
   * what only it knows — that it draws the label, how far its text is inset, its own refusal of an entry. It has an
   * error condition of its own (TXI-11). No Field: it is drawn as a bare input.
   */
  private readonly frame = new FieldControlController(this, {
    errorCondition: true,
    named: () => !!this.label.trim(),
    says: () => this.saysToField,
    changed: () => (this.frameChanged = true),
  });
  /** The Field's answer changed since the last update: the floating label may have other lines (TXI-13). */
  private frameChanged = false;
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'outline', 'active-indicator', 'label', 'requirement-label', 'input', 'entries', 'segment', 'prefix', 'suffix', 'leading-icon', 'trailing-icon', 'picker-button', 'resize-grip'];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    // The default is not reflected: a field that is written without `type` is not given `type="text"` when it is
    // defined. Nothing reads the attribute, and writing it is not free: `type` is a name `:has()` asks about on a page
    // with prose (`li:has(> input[type='checkbox'])`), so a browser walks up from every element that writes it and asks
    // every `:has()` on the way again — a product's `:root:has(…)` is then asked of the whole document, once per field.
    type: { type: String, reflect: true, useDefault: true },
    value: { type: String },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    placeholder: { type: String },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    multiline: { type: Boolean, reflect: true },
    minRows: { type: Number, attribute: 'min-rows' },
    maxRows: { type: Number, attribute: 'max-rows' },
    resize: { type: String, reflect: true },
    resizeAxis: { type: String, attribute: 'resize-axis', reflect: true },
    resizeLabel: { type: String, attribute: 'resize-label' },
    counterText: { type: String, attribute: 'counter-text' },
    counterNoLimitText: { type: String, attribute: 'counter-no-limit-text' },
    noWrap: { type: Boolean, attribute: 'no-wrap', reflect: true },
    maxLength: { type: Number, attribute: 'maxlength' },
    counter: { type: Boolean },
    prefixText: { type: String, attribute: 'prefix-text' },
    suffixText: { type: String, attribute: 'suffix-text' },
    autocomplete: { type: String },
    locale: { type: String },
    min: { type: String },
    max: { type: String },
    disabledDates: { attribute: 'disabled-dates', converter: DISABLED_DATES },
    invalidText: { type: String, attribute: 'invalid-text' },
    unavailableText: { type: String, attribute: 'unavailable-text' },
    segmentEmptyText: { type: String, attribute: 'segment-empty-text' },
    picker: { type: Boolean, reflect: true },
    pickerLabel: { type: String, attribute: 'picker-label' },
    name: { type: String, reflect: true },
    hasLeading: { state: true },
    hasTrailing: { state: true },
    hasEntries: { state: true },
    focused: { state: true },
    formDisabled: { state: true },
    segments: { state: true },
    entryError: { state: true },
  };

  /**
   * Stacked is a filled box that shows focus and error with a line inside its edge, under the label its Field draws
   * above it; filled and outlined float the label inside the box, marked by a tinted box and a bottom line, or by a
   * border. Use one style
   * per form. A design system may leave some out (the default system ships stacked only) or add values.
   */
  variant: TanreiTextInputVariant = 'stacked';

  /** Minimum height of a single-line field's container (48 / 56 in the default system). The hit area always meets the minimum target. */
  size: TanreiTextInputSize = 'medium';

  /**
   * What the value is: chooses the keyboard, autocorrection, obscured entry and semantics. `code` is text written for
   * a machine rather than for a reader — a snippet of configuration, a pattern, an identifier, a query, a key: a
   * left-to-right run in the code face that the browser does not correct, capitalise, check for spelling or complete,
   * on one line or, with `multiline`, on many. `date`, `time` and `date-time` are entered segment by segment in the
   * locale's numeric form. The value is always a string.
   */
  // The union is written out (it is `TanreiTextInputType`): the manifest then lists the values this build reads, and
  // what draws a spec's fixtures can tell a value the build does not know yet from one it does.
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'code' | 'date' | 'time' | 'date-time' = 'text';

  /**
   * The text in the field; for date, time and date-time, the ISO 8601 form of what its segments give (2026-09-27, 14:30,
   * 2026-09-27T14:30), or empty while a segment is empty or the value is not available. Setting it shows it and fires
   * nothing. The `value` attribute is what a form reset returns to.
   */
  // An accessor, not a field: the value is the person's at every moment. The native `input` event
  // is the browser's own and composed — a capturing listener on an ancestor hears it before the element's own listener
  // has run — so what the person has just done to the native element and the element has not taken yet is read from
  // that element, cut as the element is about to cut it (TXI-18). `event.target.value` is then the new value in every
  // listener, and in every listener of an element composed around this one.
  get value(): string {
    const native = this.nativeInput;
    return native && native.value !== this.nativeSeen ? this.afterEdit(native.value) : this.held;
  }

  set value(value: string) {
    this.held = value;
  }

  /** The value the element holds: what the product set, or the person's last edit as the element took it. */
  private held = '';
  /** The native text element, once drawn (none for a row of segments), and what it held when the element last wrote to it or took from it. */
  private nativeInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private nativeSeen: string | undefined;

  /** TXI-18: what an edit that left `text` in the native element becomes — itself, or what of it fits under maxLength. A composition is the platform's (TXI-4). */
  private afterEdit(text: string): string {
    if (this.native.composing || this.maxLength <= 0 || graphemes(text).length <= this.maxLength) return text;
    return fit(this.held, text, this.maxLength).value;
  }

  /** The input's own accessible name, for an input no Field frames or one whose visible label is elsewhere; a filled or an outlined input draws it floating. Inside a Field leave it empty: the Field's label names the input, and its own would win. */
  label = '';

  /** Does not draw the floating label of a filled or an outlined input, which stays the accessible name (the `label-hidden` attribute). Inside a Field, hide the label on the Field. */
  labelHidden = false;

  /**
   * A hint shown while the value is empty and the label is not in the input line (above, floated or hidden). Never a
   * replacement for `label`. In a code field it is an example of the code and is drawn as code; a hint in words
   * belongs in its Field's `supportingText`. Ignored by a date, time or date-time field, whose empty segments each show their own.
   */
  placeholder = '';

  /**
   * Puts the input in the error condition: its error parts are drawn and it is exposed as invalid. For a bare input;
   * inside a Field set `error` on the Field, which marks the input and shows the words. Validation is the product's:
   * the input never sets this itself.
   */
  error = false;

  /** Prevents focus, editing and form submission. Inside a Field, disable the Field, so that its label follows. */
  disabled = false;

  /** The value can be focused, selected and copied, but not changed (the `readonly` attribute). */
  readOnly = false;

  /** Accepts line breaks and shows several lines, sized as `resize` says. Ignored for password, date, time and date-time. */
  multiline = false;

  /**
   * The fewest lines a multi-line field shows (`min-rows`): the height of an empty auto-resized field, the starting and
   * smallest height of a manually resized one, and the height of a fixed one.
   */
  minRows = 2;

  /**
   * The most lines an auto-resized field grows to before it scrolls, and the tallest a manually resized one can be made
   * (`max-rows`); 0 is no limit. Ignored while `resize` is fixed.
   */
  maxRows = 0;

  /**
   * How a multi-line field gets its height. `auto`: it follows the number of lines between `minRows` and `maxRows`, with
   * an animated change, and has no grip. `manual`: it starts at `minRows` lines and the person resizes it with the grip
   * in its bottom end corner. `fixed`: it stays at `minRows` lines, with no grip.
   */
  resize: TanreiTextInputResize = 'auto';

  /** What the person can resize by hand (`resize-axis`): the height only, or the height and the width. Ignored unless `resize` is manual. */
  resizeAxis: TanreiTextInputResizeAxis = 'vertical';

  /** The accessible name of the resize grip (`resize-label`): this instance's words, else the product's (`setWords({ resizeLabel })`). Tanrei has none: without them the grip is drawn and works, and has no name. */
  resizeLabel = '';

  /**
   * Keeps every line of a multi-line code field on one row (`no-wrap`; the spec's `wrap: false`): a line wider than the
   * input scrolls sideways inside the container, and widens nothing. Without it a line that does not fit continues on
   * following rows; the value is the same either way. Read only while `type` is `code` and `multiline` is set: prose
   * always wraps, and a single line always scrolls in its line (reported in debug builds).
   */
  noWrap = false;

  /** The most user-perceived characters the user can enter; 0 is no limit (the `maxlength` attribute). Ignored for date, time and date-time. */
  maxLength = 0;

  /** Keeps a character count (with `maxLength`, when set: "12/40"): part of the description, announced when typing pauses, and readable as `countText`. The input draws none: a Field draws it at the end of its supporting row, given it as `count-text` — which `<tanrei-text-field>` does by itself. */
  counter = false;

  /**
   * The count said to assistive technology while `counter` is set and `maxLength` is above 0 (`counter-text`): your
   * sentence with the places `{count}`, `{limit}` and `{remaining}` ("{remaining} characters left"). Empty reads the
   * product's words (`setWords({ characterCountText })`); with neither the count is said as its digits ("12/40"). It is
   * drawn as digits whatever is said: `countText` stays "12/40".
   */
  counterText = '';

  /** The count said while `counter` is set and there is no `maxLength` (`counter-no-limit-text`): your sentence with the place `{count}` ("{count} characters"). Empty reads the product's words (`setWords({ characterCountNoLimitText })`); with neither, the digits. */
  counterNoLimitText = '';

  /** Fixed text before the value, not part of it (`prefix-text`). Beside one line of email, url, tel, number or password it is written before the value along the direction of the run the two affixes make — that of their first strong character, left-to-right where they have none — in every layout direction; beside any other value it stands at the field's start edge. In a code field it is code: in the code face, at the left of the value in every layout direction. Ignored for date, time and date-time. */
  prefixText = '';

  /** Fixed text after the value, not part of it (`suffix-text`). Beside one line of email, url, tel, number or password it is written after the value along the run's direction (see `prefixText`); beside any other value it stands at the field's end edge. In a code field it is code: in the code face, at the right of the value in every layout direction. Ignored for date, time and date-time. */
  suffixText = '';

  /** The autofill hint, as an HTML autofill field name (email, current-password, one-time-code…). A code field left without one asks the browser to offer no remembered entry. */
  autocomplete = '';

  /**
   * A BCP 47 tag ("en-US", "ja-JP") for how a date, time or date-time field shows and reads its value: the order of its
   * segments, the separators, the clock, the digits and the names of the units. Empty uses the nearest `lang`
   * attribute, then the browser's language. The calendar is the Gregorian calendar in every locale.
   */
  locale = '';

  /** The earliest value a date, time or date-time field accepts from the person, ISO 8601; empty for no limit. */
  min = '';

  /** The latest value a date, time or date-time field accepts from the person, ISO 8601; empty for no limit. */
  max = '';

  /**
   * Dates inside `min` and `max` that a date or date-time field does not accept from the person, as ISO 8601 calendar
   * dates — the same list the product gives its date-time picker. The `disabled-dates` attribute is a space-separated
   * list or a JSON array. Ignored by a time field.
   */
  disabledDates: string[] = [];

  /** The words of the refusal of a date, time or date-time input committed with some segments filled and others empty (`invalid-text`): shown by the Field that frames it as its error text, and part of a bare input's description. */
  invalidText = '';

  /** The words of the refusal of a date, time or date-time input committed with a value before `min`, after `max` or listed in `disabledDates` (`unavailable-text`): shown and described as `invalidText` is. */
  unavailableText = '';

  /** What assistive technology reads as the value of a date or time segment that holds nothing yet (`segment-empty-text`): this instance's words, else the product's (`setWords({ segmentEmptyText })`). Tanrei has none: without them an empty segment has no value text. */
  segmentEmptyText = '';

  /**
   * Shows the picker button in a date, time or date-time field. The field presents no picker itself: it fires
   * `pickerrequest`, and the product presents one and sets `value` to what was picked.
   */
  picker = false;

  /** The accessible name of the picker button ("Choose date", `picker-label`). Required while the button is shown. */
  pickerLabel = '';

  /** Web only: the name it is submitted under. */
  name = '';

  protected hasLeading = false;
  protected hasTrailing = false;
  /** TXI-64, TXI-65: whether the entries slot holds content. */
  protected hasEntries = false;
  protected focused = false;
  /** Set by an ancestor `<fieldset disabled>` (the element's `formDisabledCallback`). */
  protected formDisabled = false;
  /** What a date or time field's segments hold (TXI-42 … TXI-46). */
  protected segments: Segments = EMPTY_SEGMENTS;
  /** A date or time field's entry error, while it lasts (TXI-30). */
  protected entryError: EntryError | null = null;
  private readonly internals = this.attachInternals();
  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says = new FormSays(this, this.internals);

  /** TXI-9: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'text-input', behavior: 'TXI-9', axes: AXES });

  /**
   * TXI-1, TXI-4: the value and the native element kept in step around an input method (src/primitives/native-text.ts).
   * A committed composition is cut to maxLength (TXI-18) from the value it began with. A date or time field has no
   * native element: its segments take what an input method commits (TXI-45).
   */
  private readonly native = new NativeTextController({
    input: () => this.input,
    value: () => this.value,
    setValue: (text) => this.takeText(text),
    commit: (input, from) => {
      if (this.maxLength <= 0 || graphemes(input.value).length <= this.maxLength) return;
      const allowed = fit(from, input.value, this.maxLength);
      input.value = allowed.value;
      this.place(input, allowed.caret);
    },
    settled: () => {
      this.fitHeight(true);
      this.scheduleCount();
    },
  });
  /** TXI-2: the value last committed (when focus arrived, at the last change, or as the product last set it). */
  private committed = '';
  /** The value the person's last edit gave the field: a `value` that differs from it was set by the product. */
  private userValue: string | undefined;
  private countTimer: ReturnType<typeof setTimeout> | undefined;

  /** TXI-45: the digits typed since the focused segment took focus. */
  private typedDigits = '';
  /** TXI-45: an input method is composing on a segment; nothing is taken until it commits. */
  private composing = false;
  /** TXI-43: focus is on one of the field's segments or on its picker button. */
  private within = false;
  /** TXI-33: the picker was asked for; focus leaving for it raises no entry error. */
  private pickerAsked = false;

  /** TXI-39: the lines the person gave a manually resized field; null is minRows. */
  private manualLines: number | null = null;
  /** The lines the input shows (the grip's value, TXI-41). */
  private lines = 0;
  /** The textarea whose height was last written: a new one is sized without motion (TXI-38). */
  private sized: Element | null = null;
  /** TXI-39: a width the person gave the field is on the host's inline style; what it replaced is put back. */
  private manualWidth: { inlineSize: string; maxInlineSize: string } | null = null;
  private drag: { id: number; x: number; y: number; lines: number; width: number; line: number; rtl: boolean; moved: boolean } | null = null;
  private sizeObserver: ResizeObserver | undefined;
  private observedInput: Element | null = null;
  private lastBox = { width: -1, line: -1 };
  /** TXI-58: the room a sideways scrollbar takes of the input's height, which an auto-resized field adds to its lines. */
  private bar = 0;

  private get input() {
    return this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>('.input');
  }

  private get textarea(): HTMLTextAreaElement | null {
    const input = this.input;
    return input instanceof HTMLTextAreaElement ? input : null;
  }

  /** The kind of a date, time or date-time field, or null for every other type. */
  private get dateKind(): DateKind | null {
    return (TYPES[this.type] ?? TYPES.text).date ?? null;
  }

  /** TXI-42: the row of segments of a date, time or date-time field in its locale, or null for every other type. */
  private get row(): Row | null {
    const kind = this.dateKind;
    return kind ? rowOf(this.resolvedLocale, kind) : null;
  }

  private get isMultiline() {
    return this.multiline && this.type !== 'password' && !this.dateKind;
  }

  /** TXI-53: the field holds code — its input line is one left-to-right row in the code face. */
  private get isCode() {
    return this.type === 'code';
  }

  /** TXI-57, TXI-58: the lines of the code are not wrapped — read only by a multi-line code field. */
  private get unwrapped() {
    return this.noWrap && this.isCode && this.isMultiline;
  }

  private get inert_() {
    return this.disabled || this.formDisabled || this.frame.disabled;
  }

  /** How the variant is laid out: filled and outlined by name, every other value as stacked (TXI-9). */
  private get layout(): Layout {
    return this.variant === 'filled' || this.variant === 'outlined' ? this.variant : 'stacked';
  }

  /** TXI-17: how a multi-line field gets its height; a value the field does not know is auto. */
  private get resizeMode(): TanreiTextInputResize {
    return RESIZES.includes(this.resize) ? this.resize : 'auto';
  }

  /** TXI-17: what the grip resizes; a value the field does not know is vertical. */
  private get axis(): TanreiTextInputResizeAxis {
    return RESIZE_AXES.includes(this.resizeAxis) ? this.resizeAxis : 'vertical';
  }

  /** TXI-39: a multi-line field resized by hand draws the grip, read-only too — not while disabled. */
  private get gripShown() {
    return this.isMultiline && this.resizeMode === 'manual' && !this.inert_;
  }

  /** TXI-17: the fewest lines; a minRows below 1 is 1. */
  private get minLines() {
    return Math.max(1, Number(this.minRows) || 1);
  }

  /** TXI-37, TXI-39: the most lines, or 0 for no limit; never fewer than minRows, and minRows itself while fixed. */
  private get maxLines() {
    if (this.resizeMode === 'fixed') return this.minLines;
    return this.maxRows > 0 ? Math.max(this.minLines, Number(this.maxRows)) : 0;
  }

  /** TXI-52: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** TXI-41, TXI-52: the grip's name — the instance's, else the product's words, else nothing. */
  private get gripName(): string {
    return this.words.get('resizeLabel', this.resizeLabel).trim();
  }

  /** TXI-23: the validity message of a date or a time its Field says is required, left empty — the browser's, else the Field's words. */
  private missingMessage(): string {
    return missingValueMessage('text', { errorText: '', requiredText: this.frame.state?.requiredText ?? '', label: this.name_ });
  }

  /** TXI-23: the accessible name — its own label, else the label of the Field that frames it. */
  private get name_(): string {
    return this.frame.name(this.label.trim() ? this.label : '');
  }

  /** TXI-23: its Field says it is required. It has no requirement of its own. */
  private get required_(): boolean {
    return this.frame.required;
  }

  /** TXI-13: the label floats in the box — a filled or an outlined input with a name, unless its own `labelHidden` or its Field's says to draw none. */
  private get labelled() {
    return this.layout !== 'stacked' && !!this.name_ && !this.labelHidden && !this.frame.labelHidden;
  }

  /** TXI-50: an asterisk follows the floating label — the Field's answer (FLD-25); never outside a Field. */
  private get asterisked(): boolean {
    return this.labelled && this.frame.requiredMark === 'asterisk';
  }

  /** TXI-50: the optional word after the floating label — the Field's (FLD-25); never outside a Field. */
  private get optionalWord(): string {
    return this.labelled ? this.frame.optionalText : '';
  }

  /**
   * TXI-62: what the input says to the Field that frames it. That it draws the label while its look floats one — its
   * name, or nothing while the label is hidden; the Field draws no label row either way. How far its text stands from
   * its start edge and the padding it keeps at its end edge, as lengths of its own tokens (`INSET`, in the styles).
   * And an entry error, with its words.
   */
  private get saysToField(): FieldSays {
    const size = /^[a-z0-9][a-z0-9-]*$/.test(this.size) ? this.size : 'medium';
    return {
      drawsLabel: this.layout !== 'stacked',
      inset: INSET(size, { leading: this.hasLeading, trailing: this.hasTrailing || this.pickerShown, lead: this.iconBoxes.lead }),
      refusal: this.entryError ? { text: this.refusalText } : null,
    };
  }

  /** TXI-30: the words of an entry error while it lasts — invalidText or unavailableText; empty where the product gave none. */
  private get refusalText(): string {
    return this.entryError ? (this.entryError.reason === 'invalid' ? this.invalidText : this.unavailableText) : '';
  }

  /**
   * TXI-23, TXI-30: what the input adds to its own description (the prefix, the suffix and the count are named by id):
   * the words of an entry error while no Field frames it — a Field shows them and gives them back as its own
   * description (FLD-28) — and then the description its Field gives.
   */
  private get described(): string {
    return [this.frame.framed ? '' : this.refusalText, this.frame.description()].filter(Boolean).join(' ');
  }

  /** What the field shows as text: a date or time field's row as drawn, every other field's value. */
  private get shownValue() {
    const row = this.row;
    return row ? rowText(row, this.segments) : this.value;
  }

  /** The locale a date or time field reads and writes in (TXI-28): `locale`, else the nearest `lang`, else the browser's. */
  private get resolvedLocale(): string {
    const tag = this.locale.trim();
    if (!tag) return ambientLocale(this);
    return supportedLocale(tag) ?? FALLBACK_LOCALE;
  }

  /** `min` and `max` as ISO values of the kind, or empty (TXI-31: anything else is treated as empty). */
  private limit(which: 'min' | 'max'): string {
    const kind = this.dateKind;
    const text = this[which];
    return kind && text && isoValue(kind, text) ? text : '';
  }

  /** TXI-31: the entries of `disabledDates` that are ISO 8601 calendar dates; a time field has none. */
  private get listedDates(): ReadonlySet<string> {
    if (!this.dateKind || this.dateKind === 'time') return new Set();
    return new Set((this.disabledDates ?? []).filter((entry) => typeof entry === 'string' && isoValue('date', entry)));
  }

  /** TXI-46: why an ISO value the row gives is not available — before min, after max, a listed date — or null when it is. */
  private unavailable(value: string): 'under' | 'over' | 'listed' | null {
    const [min, max] = [this.limit('min'), this.limit('max')];
    if (min && value < min) return 'under';
    if (max && value > max) return 'over';
    if (!withinRange(value, min, max)) return 'over';
    return this.listedDates.has(value.slice(0, 10)) ? 'listed' : null;
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity (a required field's missing value; a date or time field's entry error), as a form sees it. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /** The message of an invalid input, as a form shows it. */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /** Whether the input is validated with its form: not while disabled. */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  checkValidity() {
    return this.internals.checkValidity();
  }

  reportValidity() {
    return this.internals.reportValidity();
  }

  /** TXI-8, TXI-43: focus given to the element goes to what takes the typing — the native element, or the segment a press would focus. */
  override focus(options?: FocusOptions) {
    const target = this.inert_ ? null : this.entryTarget;
    if (target) target.focus(options);
    else super.focus(options);
  }

  /** Selects the whole value, as a native input's `select()` does. A date or time field has nothing to select: its first segment takes focus. */
  select() {
    if (this.row) this.renderRoot.querySelector<HTMLElement>('.segment')?.focus();
    else this.input?.select();
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
    this.showValue();
    this.committed = this.value;
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? state : '';
    this.showValue();
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  // ── Dates and times (TXI-28 … TXI-33, TXI-42 … TXI-47) ────────────────────────────────────────────────────────

  /** TXI-28, TXI-31: the value as the product set it fills every segment (an empty one empties them); any entry error ends. */
  private showValue() {
    this.userValue = undefined;
    this.entryError = null;
    const row = this.row;
    if (!row) return;
    this.segments = segmentsOf(row, this.value);
    this.typedDigits = '';
  }

  /** TXI-1: the person gave the native element this text; it is the value. */
  private takeText(text: string) {
    this.nativeSeen = this.nativeInput?.value;
    this.value = text;
    this.userValue = text;
  }

  /**
   * TXI-45, TXI-46: an edit of a segment. The entry error ends with it (TXI-30); the value is the ISO form of what the
   * row now gives while every segment is filled and that is available, and empty otherwise; `input` is emitted once
   * when — and only when — the value changed.
   */
  private edit(next: Segments, typedDigits = '') {
    const row = this.row;
    if (!row || this.readOnly || this.inert_) return;
    this.typedDigits = typedDigits;
    this.segments = next;
    this.entryError = null;
    const given = valueOf(row, next);
    const value = given && !this.unavailable(given) ? given : '';
    if (value === this.value) return;
    this.value = value;
    this.userValue = value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.scheduleCount();
  }

  /**
   * TXI-30: a committed date or time field. A row with some segments filled and others empty, or a whole one whose
   * value is not available, keeps its segments and begins an entry error; an empty row, and a row that gives an
   * available value, begin none. Returns the entry error that began, if one did (a commit of the same row again begins none).
   */
  private commitEntry(): EntryError | null {
    const row = this.row;
    if (!row) return null;
    const { held } = fill(row, this.segments);
    if (held === 0) return null;
    const given = valueOf(row, this.segments);
    // A value the product set is not checked (TXI-31): only a row the person left without a value is.
    if (given && this.value) return null;
    const side = given ? (this.unavailable(given) ?? undefined) : undefined;
    if (given && !side) return null;
    const next: EntryError = { reason: given ? 'unavailable' : 'invalid', text: rowText(row, this.segments), side };
    if (this.entryError?.text === next.text && this.entryError.reason === next.reason) return null;
    this.entryError = next;
    return next;
  }

  private get segmentElements(): HTMLElement[] {
    return Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.segment'));
  }

  /** The segment that has focus, if one has. */
  private get activeSegment(): HTMLElement | null {
    const active = (this.renderRoot as ShadowRoot).activeElement;
    return active instanceof HTMLElement && active.classList.contains('segment') ? active : null;
  }

  /** TXI-43: focus moves to the segment `by` places along the row, stopping at its ends; returns the segment it moved to. */
  private moveFocus(from: HTMLElement, by: number): HTMLElement | null {
    const all = this.segmentElements;
    const to = all[all.indexOf(from) + by] ?? null;
    to?.focus();
    return to;
  }

  /**
   * TXI-42: each segment's text is written by the field alone — never by a template the browser's editing could
   * disagree with, and never into a composition (TXI-45).
   */
  private paintSegments() {
    const row = this.row;
    if (!row || this.composing) return;
    for (const element of this.segmentElements) {
      const text = shownOf(row, this.segments, element.dataset.unit as SegmentUnit);
      if (element.textContent !== text) element.textContent = text;
    }
    const active = this.activeSegment;
    if (active) this.placeCaret(active);
  }

  /** The (invisible) caret at the end of the focused segment's text, so a touch keyboard's Backspace has something to delete. */
  private placeCaret(segment: HTMLElement) {
    if (segment.contentEditable !== 'true') return;
    try {
      const selection = (this.renderRoot as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? getSelection();
      selection?.collapse(segment, segment.childNodes.length);
    } catch {
      // A browser that cannot place a selection in a shadow root keeps the caret where it put it.
    }
  }

  /** TXI-29: text handed to the field whole — pasted, dictated, autofilled — fills every segment when it reads as a value of the type. */
  private takeWhole(text: string): boolean {
    const row = this.row;
    if (!row || this.readOnly || this.inert_) return false;
    const value = readText(row.locale, row.kind, text.trim());
    if (!value) return false;
    this.edit(segmentsOf(row, value));
    this.segmentElements.at(-1)?.focus();
    return true;
  }

  /**
   * TXI-45: one character on a segment (the focused one). A digit is the next digit of its number, and focus moves on
   * once no further digit could extend it; a separator's character moves on from a segment that is not empty; a or p, or
   * the first letter of the locale's names, set a day period. Every other character is ignored. Returns the segment the
   * next character goes to.
   */
  private typeCharacter(character: string, segment = this.activeSegment): HTMLElement | null {
    const row = this.row;
    if (!row || !segment || this.readOnly || this.inert_) return segment;
    const unit = segment.dataset.unit as SegmentUnit;
    // Focus moves on only from the segment that has it (text an input method commits may arrive after focus left).
    const onward = () => (segment === this.activeSegment ? (this.moveFocus(segment, 1) ?? segment) : segment);
    if (unit !== 'period' && /^[0-9]$/.test(character)) {
      const result = typed(row, this.segments, unit, this.typedDigits, character);
      this.edit(result.segments, result.typed);
      return result.advance ? onward() : segment;
    }
    const following = row.parts[row.parts.findIndex((part) => part.unit === unit) + 1]?.literal ?? '';
    if ((SEPARATORS.has(character) || (character.trim() && following.includes(character))) && holds(this.segments, unit)) return onward();
    if (unit === 'period') {
      const period = periodTyped(row, character);
      if (period !== null) this.edit({ ...this.segments, period });
    }
    return segment;
  }

  /** The characters of text as typed: full-width and the locale's digits as ASCII ones. */
  private characters(text: string): string[] {
    const row = this.row;
    return Array.from(asciiDigits(row?.locale ?? FALLBACK_LOCALE, text.normalize('NFKC')));
  }

  /**
   * TXI-45: the browser is about to edit a segment. Nothing it would write is kept — the segment's text is the field's
   * — and what it carries is read instead: a character is typed, several at once are a whole text (TXI-29: dictation,
   * autofill, a paste the clipboard event did not bring), a deletion removes a digit. A composition cannot be cancelled
   * and is left to the input method until it commits.
   */
  private onBeforeInput(event: InputEvent) {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains('segment')) return;
    if (event.isComposing || this.composing || /Composition/.test(event.inputType)) return;
    event.preventDefault();
    if (this.readOnly || this.inert_) return;
    const segment = event.target;
    const unit = segment.dataset.unit as SegmentUnit;
    if (event.inputType.startsWith('delete')) {
      this.eraseOn(segment, unit, event.inputType === 'deleteContentBackward');
      return;
    }
    const text = event.data ?? event.dataTransfer?.getData('text/plain') ?? '';
    const characters = this.characters(text);
    if (characters.length === 1) this.typeCharacter(characters[0]);
    else if (characters.length > 1) this.takeWhole(text);
  }

  /** TXI-45: Backspace or Delete removes the focused segment's last digit; Backspace on an empty one moves to the previous segment. */
  private eraseOn(segment: HTMLElement, unit: SegmentUnit, backward: boolean) {
    const row = this.row;
    if (!row || this.readOnly) return;
    if (holds(this.segments, unit)) {
      const result = erased(row, this.segments, unit);
      this.edit(result.segments, result.typed);
    } else if (this.typedDigits) this.typedDigits = '';
    else if (backward) this.moveFocus(segment, -1);
  }

  /**
   * TXI-43, TXI-44, TXI-45: the keys of a segment. Left and Right Arrow move to the segment drawn on that side — the
   * same in a right-to-left layout, where the row runs left to right too; Up and Down Arrow step by one, Page Up and
   * Page Down by more, Home and End go to the ends of the range; Backspace and Delete remove a digit; Enter is the
   * action key (TXI-3). Digits and letters arrive as `beforeinput`.
   */
  private onSegmentKeyDown(event: KeyboardEvent) {
    const segment = event.target;
    const row = this.row;
    if (!row || !(segment instanceof HTMLElement) || !segment.classList.contains('segment')) return;
    if (event.isComposing || this.composing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.act(event);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const unit = segment.dataset.unit as SegmentUnit;
    const step = (by: number) => {
      if (!this.readOnly) this.edit(stepped(row, this.segments, unit, by, new Date()));
    };
    switch (event.key) {
      case 'ArrowRight':
        this.moveFocus(segment, 1);
        break;
      case 'ArrowLeft':
        this.moveFocus(segment, -1);
        break;
      case 'ArrowUp':
        step(1);
        break;
      case 'ArrowDown':
        step(-1);
        break;
      case 'PageUp':
        step(PAGE[unit]);
        break;
      case 'PageDown':
        step(-PAGE[unit]);
        break;
      case 'Home':
      case 'End':
        if (!this.readOnly) this.edit(edged(row, this.segments, unit, event.key === 'Home' ? 'first' : 'last'));
        break;
      case 'Backspace':
      case 'Delete':
        this.eraseOn(segment, unit, event.key === 'Backspace');
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private onSegmentCompositionStart() {
    this.composing = true;
  }

  /**
   * TXI-45: an input method committed text on a segment. Its digits are taken one by one, as typed (full-width ones
   * too); any other text is read whole (TXI-29). What the composition drew in the segment is replaced by the field's own text.
   */
  private onSegmentCompositionEnd(event: CompositionEvent) {
    const segment = event.target instanceof HTMLElement && event.target.classList.contains('segment') ? event.target : null;
    const text = event.data ?? '';
    // After the event, not in it: the browser is still ending the composition — its last `input` is to come — and a
    // focus moved from inside this event (a number that is complete moves on) would end the composition a second time.
    setTimeout(() => {
      this.composing = false;
      this.paintSegments();
      const characters = this.characters(text);
      if (!segment || !segment.isConnected || !characters.length) return;
      if (characters.every((character) => /^[0-9]$/.test(character) || SEPARATORS.has(character))) {
        let at: HTMLElement | null = segment;
        for (const character of characters) at = this.typeCharacter(character, at);
      } else if (characters.length === 1) this.typeCharacter(characters[0], segment);
      else this.takeWhole(text);
    });
  }

  /** The browser's own `input` on a segment (a composition's) is not the field's: the value's change is (TXI-46). */
  private onSegmentInput(event: Event) {
    event.stopPropagation();
    if (!(event as InputEvent).isComposing) this.paintSegments();
  }

  /** TXI-29: copy puts the whole row on the clipboard as drawn, whichever segment has focus. */
  private onCopy(event: ClipboardEvent) {
    const row = this.row;
    if (!row) return;
    event.preventDefault();
    event.clipboardData?.setData('text/plain', rowText(row, this.segments));
  }

  /** TXI-29: cut copies the whole row and then empties every segment, unless the field is read-only. */
  private onCut(event: ClipboardEvent) {
    this.onCopy(event);
    if (this.row && fill(this.row, this.segments).held > 0) this.edit(EMPTY_SEGMENTS);
  }

  /** TXI-29: pasted text is read whole, whichever segment has focus; text that reads as nothing changes nothing. */
  private onPaste(event: ClipboardEvent) {
    if (!this.row) return;
    event.preventDefault();
    this.takeWhole(event.clipboardData?.getData('text/plain') ?? '');
  }

  /** A node of the field's own that focus may move between without committing (TXI-43): a segment, or the picker button. */
  private keepsEntry(node: EventTarget | null): boolean {
    return node instanceof Element && this.renderRoot.contains(node) && (node.classList.contains('segment') || !!node.closest('.picker'));
  }

  /** TXI-43: focus arrived on a segment or on the picker button of a date or time field. */
  private onEntryFocusIn(event: FocusEvent) {
    if (!this.row || !this.keepsEntry(event.target)) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains('segment')) {
      this.typedDigits = '';
      this.focused = true;
      syncFocusStyle(this, this.renderRoot.querySelector('.field'));
      this.placeCaret(target);
    }
    if (!this.within) {
      this.within = true;
      this.committed = this.value;
    }
    this.pickerAsked = false;
  }

  /**
   * TXI-43: focus left a segment or the picker button. Moving between them commits nothing; leaving them for anything
   * else commits the field (TXI-2, TXI-30) — without the entry error when it leaves for the picker it asked for (TXI-33).
   */
  private onEntryFocusOut(event: FocusEvent) {
    if (!this.row || !this.keepsEntry(event.target)) return;
    const to = event.relatedTarget;
    if ((event.target as HTMLElement).classList.contains('segment')) this.focused = to instanceof Element && to.classList.contains('segment') && this.renderRoot.contains(to);
    if (this.keepsEntry(to)) return;
    this.within = false;
    this.commit({ quiet: this.pickerAsked });
  }

  // ── The native element's events ────────────────────────────────────────────────────────────────────────────

  /**
   * TXI-1, TXI-18: the user changed the value. The native `input` event is composed, so it leaves the shadow root by
   * itself — after the element has taken the new value. An edit past maxLength is cut to fit; one that changes nothing
   * then (a keystroke at the limit) is refused and heard by no one.
   */
  private onInput(event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    // TXI-4: the composition is the platform's; the value follows it, and nothing is written back.
    if (this.native.composingInput(event)) return;
    if (this.maxLength > 0 && graphemes(input.value).length > this.maxLength) {
      const allowed = fit(this.held, input.value, this.maxLength);
      if (allowed.value === this.held) {
        const caret = allowed.caret;
        input.value = this.held;
        this.nativeSeen = input.value;
        this.place(input, caret);
        event.stopImmediatePropagation();
        return;
      }
      input.value = allowed.value;
      this.place(input, allowed.caret);
    }
    this.takeText(input.value);
    this.fitHeight(true);
    this.scheduleCount();
  }

  private place(input: HTMLInputElement | HTMLTextAreaElement, caret: number) {
    try {
      input.setSelectionRange(caret, caret);
    } catch {
      // A type without a selection API: the browser keeps the caret where it can.
    }
  }

  private onFocus() {
    this.focused = true;
    this.committed = this.value;
    syncFocusStyle(this, this.renderRoot.querySelector('.field'));
  }

  /** TXI-2: focus left with a changed value — `change`, once. */
  private onBlur() {
    this.focused = false;
    this.commit();
  }

  /**
   * TXI-2, TXI-30: a commit — `change` when the value differs from the one last committed, then, for a date or time
   * field left half-filled or with a value that is not available, `entryerror` (not when `quiet`: TXI-33).
   */
  private commit({ quiet = false }: { quiet?: boolean } = {}) {
    if (this.inert_) return;
    const began = this.readOnly || quiet ? null : this.commitEntry();
    // The form's constraint validation sees the entry error at once: the action key may submit the form next (TXI-3).
    this.syncValidity();
    if (this.value !== this.committed) {
      this.committed = this.value;
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
    if (began) {
      this.dispatchEvent(
        new CustomEvent<TanreiTextInputEntryErrorDetail>('entryerror', { bubbles: true, composed: true, detail: { reason: began.reason, text: began.text } }),
      );
    }
  }

  /** The browser's own `change` is not the field's (TXI-2 decides when a value is committed). */
  private onNativeChange(event: Event) {
    event.stopPropagation();
  }

  /**
   * TXI-2, TXI-3: Enter in a single-line field commits the value and fires `action`; then, inside a form and unless
   * `action` was cancelled, it requests the form's submission as a native input does. Not while composing: there Enter
   * commits the composition. In a multi-line field Enter is a line break.
   */
  private onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || this.isMultiline || event.isComposing || this.native.composing || event.keyCode === 229) return;
    this.act(event);
  }

  /** TXI-3: the action key — the commit, then `action`, then the form's submission unless `action` was cancelled. */
  private act(event: KeyboardEvent) {
    if (this.inert_) return;
    this.commit();
    const action = new CustomEvent<TanreiTextInputActionDetail>('action', { bubbles: true, composed: true, cancelable: true, detail: { value: this.value } });
    const proceed = this.dispatchEvent(action);
    // Its own form, or the form of the element composed around it (src/primitives/default-button.ts, `formOf`).
    const form = proceed ? formOf(this, this.form) : null;
    if (form) {
      event.preventDefault();
      pressDefaultButton(form);
    }
  }

  /**
   * TXI-33: the picker button asks the product for a picker and changes nothing itself: no value, no focus, nothing
   * presented, nothing committed — the value it carries is empty while the row is half-filled or not available, and no
   * entry error is raised for that, because the picker is about to give a whole value.
   */
  private onPickerClick() {
    const kind = this.dateKind;
    if (!kind || this.inert_ || this.readOnly) return;
    this.pickerAsked = true;
    const detail: TanreiTextInputPickerRequestDetail = { value: this.value, type: kind, min: this.limit('min'), max: this.limit('max') };
    this.dispatchEvent(new CustomEvent<TanreiTextInputPickerRequestDetail>('pickerrequest', { bubbles: true, composed: true, detail }));
  }

  /**
   * TXI-33: a press on the picker button is already the request, as far as the entry error goes: where a press on a
   * button moves focus to nothing (Safari), focus leaves the segments before the click arrives.
   */
  private onPickerPress() {
    if (this.dateKind && !this.inert_ && !this.readOnly) this.pickerAsked = true;
  }

  /** TXI-8, TXI-43: what a press on the field focuses: the input; in a date or time field the first empty segment, or the last while none is empty. */
  private get entryTarget(): HTMLElement | null {
    const row = this.row;
    if (!row) return this.input;
    const all = this.segmentElements;
    const empty = row.units.findIndex((unit) => !holds(this.segments, unit));
    return all[empty < 0 ? all.length - 1 : empty] ?? null;
  }

  /**
   * TXI-8: a press anywhere on the box — its padding, a floating label, the prefix, the suffix, a decorative icon, the
   * text between two segments — focuses the input (TXI-43: a segment). An
   * interactive element in a slot, a segment, the picker button and the resize grip keep their own press.
   */
  private onFieldMouseDown(event: MouseEvent) {
    const input = this.entryTarget;
    if (!input || this.inert_ || event.button !== 0) return;
    const path = event.composedPath();
    if (path.includes(input)) return;
    for (const node of path) {
      if (node === this.renderRoot) break;
      if (node instanceof HTMLElement && node.matches('a[href], button, input, select, textarea, [tabindex], [contenteditable]')) return;
      if (node instanceof HTMLElement && node.shadowRoot?.delegatesFocus) return;
    }
    event.preventDefault();
    input.focus();
  }

  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const filled = slot.assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim());
    if (slot.name === 'leading-icon') this.hasLeading = filled;
    else if (slot.name === 'entries') this.hasEntries = filled;
    else this.hasTrailing = filled;
  }

  // ── The count and its announcement (TXI-19) ───────────────────────────────────────────────────────────────────────

  /** Something to be read once, politely, by assistive technology (a live region drawn nowhere). */
  private announce(text: string) {
    const region = this.renderRoot.querySelector('.announcer');
    if (!region || !text) return;
    region.textContent = '';
    // A new text node in a cleared region is announced even when it repeats the last one.
    requestAnimationFrame(() => (region.textContent = text));
  }

  /** TXI-19: the count is announced once typing has paused for a second, never on every keystroke. */
  private scheduleCount() {
    if (!this.counter) return;
    clearTimeout(this.countTimer);
    this.countTimer = setTimeout(() => this.announce(this.spokenCount), 1000);
  }

  /**
   * TXI-19: the count as it is said — in the description and the announcement: the product's sentence with its places
   * filled, every number in the locale's digits (`counter-text` while there is a limit, `counter-no-limit-text` while
   * there is none); the digits of `countText` where there is no sentence, or while the value is longer than the limit
   * (a value the product set), which a sentence of how many are left cannot say.
   */
  private get spokenCount(): string {
    const digits = this.countText;
    if (!digits) return '';
    const limited = this.maxLength > 0 && !this.dateKind;
    const count = this.count;
    if (limited && count > this.maxLength) return digits;
    const key = limited ? 'characterCountText' : 'characterCountNoLimitText';
    const sentence = this.words.get(key, limited ? this.counterText : this.counterNoLimitText).trim();
    if (!sentence) return digits;
    const number = new Intl.NumberFormat(this.resolvedLocale, { maximumFractionDigits: 0 });
    const places: Record<string, string> = limited ? { count: number.format(count), limit: number.format(this.maxLength), remaining: number.format(this.maxLength - count) } : { count: number.format(count) };
    reportPlaces(this, 'TXI-19', limited ? 'counterText' : 'counterNoLimitText', sentence, wordPlaces[key] ?? [], 'it is said as it is written');
    return fillPlaces(sentence, places)
      .runs.map((run) => run.text)
      .join('');
  }

  private get count() {
    return graphemes(this.shownValue).length;
  }

  /**
   * TXI-19: the count the input keeps, as text — the user-perceived characters of the value, then a slash and
   * `maxLength` while there is one ("12/40") — and empty while `counter` is not set. Read-only, and new with every
   * change of the value or of `maxLength`: a product that frames the input by hand gives it to its Field's
   * `countText` in its own `input` listener, and `<tanrei-text-field>` does so by itself.
   */
  get countText(): string {
    if (!this.counter) return '';
    return this.maxLength > 0 && !this.dateKind ? `${this.count}/${this.maxLength}` : `${this.count}`;
  }

  /** The input is in the error condition: its own `error`, its Field's (FLD-8), or a date or time input's entry error (TXI-11, TXI-30). */
  private get inError() {
    return this.error || this.frame.invalid || !!this.entryError;
  }

  // ── The height of a multi-line field (TXI-17, TXI-37 … TXI-41) ───────────────────────────────────────────────

  private clampLines(lines: number) {
    return Math.min(Math.max(lines, this.minLines), this.maxLines || Number.POSITIVE_INFINITY);
  }

  /** One line of the input's text style, in px (a duration or a length token is an expression: the element resolves it). */
  private lineOf(input: HTMLTextAreaElement) {
    return Number.parseFloat(getComputedStyle(input).lineHeight) || 1;
  }

  /**
   * The lines the input shows now — during a motion, the height then shown (TXI-38): the room it takes in the
   * container, which is its box and, while a change of height is moving, what its bottom margin still adds or takes back.
   */
  private shownLines(input: HTMLTextAreaElement) {
    const style = getComputedStyle(input);
    // (TXI-58: not the room of a sideways scrollbar, which is no line.)
    return (Number.parseFloat(style.height) - this.bar + (Number.parseFloat(style.marginBottom) || 0)) / this.lineOf(input) || 0;
  }

  /** The lines the text needs in the width the input has — a line the text wraps onto counts as one. */
  private textLines(input: HTMLTextAreaElement) {
    const { blockSize, minBlockSize } = input.style;
    input.style.blockSize = '0px';
    input.style.minBlockSize = '0px';
    // TXI-53: the room a right-to-left code field keeps after its last line for the grip is scrolling room, not a line.
    const lines = (input.scrollHeight - (Number.parseFloat(getComputedStyle(input).paddingBottom) || 0)) / this.lineOf(input);
    input.style.blockSize = blockSize;
    input.style.minBlockSize = minBlockSize;
    return wholeLines(lines);
  }

  /**
   * TXI-38: the input shows `target` lines. With `animate` — a change that follows the value, the grip's keys or its
   * activation — the height moves there from the one shown over motion.resize-* (the styles; at once where motion is
   * reduced), continuing from wherever a running change had brought it; otherwise it changes at once.
   *
   * TXI-51: what moves is the room the input takes, never its text. The native element is `target` lines high at once —
   * a box as tall as its text has nothing to scroll, so the browser cannot scroll the first line away to show the caret
   * on a line the box does not hold yet (which is what shook) — and `--_lag`, the lines the room shown still differs by,
   * goes to 0 over the motion: as a bottom margin that takes the new lines back or still holds the removed ones, and as
   * a clip that uncovers a new line from its top as the container's bottom edge passes it.
   */
  private showLines(input: HTMLTextAreaElement, shown: number, target: number, animate: boolean) {
    input.removeAttribute('data-resizing');
    input.style.setProperty('--_rows', String(target));
    if (animate && this.sized === input && Math.abs(shown - target) > 0.01) {
      // The room shown before the change, with the new box: the styles' starting point, drawn without a transition…
      input.style.setProperty('--_lag', String(shown - target));
      input.setAttribute('data-resizing', 'from');
      void input.offsetHeight;
      // …and from there to no difference, over the motion.
      input.setAttribute('data-resizing', '');
    }
    input.style.removeProperty('--_lag');
    this.sized = input;
    this.lines = target;
    // TXI-41: the grip's value is the number of lines the input shows.
    this.renderRoot.querySelector('.grip')?.setAttribute('aria-valuenow', String(Math.round(target)));
  }

  /**
   * TXI-17, TXI-37: the height `resize` names. Auto: exactly the lines of the text, between minRows and maxRows, and it
   * scrolls only beyond maxRows. Manual: the lines the person gave it, from minRows. Fixed: minRows.
   */
  private fitHeight(animate: boolean) {
    for (const _ of this.fitting(animate)) void _;
  }

  /**
   * @internal The steps of `fitHeight()`, each ending where reading turns to writing or writing to reading: run
   * through, they fit this field; taken a step at a time for many fields (`fitTogether`), every field reads before any
   * writes, and the fields of a page cost three layouts between them where each cost five.
   */
  *fitting(animate: boolean): Generator<void, void, void> {
    const input = this.textarea;
    if (!input) return;
    const shown = this.shownLines(input);
    yield; // ── written from here
    input.removeAttribute('data-resizing');
    const mode = this.resizeMode;
    let target = this.minLines;
    let overflows = false;
    if (mode === 'auto') {
      // The lines the text needs (`textLines`), its two halves apart.
      const { blockSize, minBlockSize } = input.style;
      input.style.blockSize = '0px';
      input.style.minBlockSize = '0px';
      yield; // ── read from here
      const lines = input.scrollHeight / this.lineOf(input);
      yield; // ── written from here
      input.style.blockSize = blockSize;
      input.style.minBlockSize = minBlockSize;
      const needed = wholeLines(lines);
      target = this.clampLines(needed);
      overflows = needed > target + 0.01;
    } else if (mode === 'manual') target = this.clampLines(this.manualLines ?? this.minLines);
    input.toggleAttribute('data-overflows', overflows);
    this.showLines(input, shown, target, animate);
    yield; // ── read from here
    this.lastBox = { width: input.clientWidth, line: this.lineOf(input) };
    // TXI-58: where the browser draws a sideways scrollbar that takes room (a classic one; an overlay one takes none),
    // an auto-resized field whose lines do not wrap is taller by that room, so that no line stands under the scrollbar
    // and none is scrolled up or down for its sake. The room is what the input's box holds beyond its content and
    // padding; it is written once more only where it changed. Every other field has none, and reads nothing for it.
    if (!this.unwrapped && !this.bar) return;
    const bar = this.unwrapped && mode === 'auto' ? Math.max(0, input.offsetHeight - input.clientHeight) : 0;
    if (bar === this.bar) return;
    yield; // ── written from here
    this.bar = bar;
    if (bar) input.style.setProperty('--_bar', `${bar}px`);
    else input.style.removeProperty('--_bar');
  }

  /** TXI-39, TXI-41: the person gives a manually resized field `lines` lines, within minRows and maxRows. */
  private resizeTo(lines: number, animate: boolean) {
    const input = this.textarea;
    if (!input) return;
    const shown = this.shownLines(input);
    this.manualLines = this.clampLines(lines);
    this.showLines(input, shown, this.manualLines, animate);
  }

  /**
   * TXI-41: the grip activated without a drag — the input becomes as tall as its text needs, within minRows and
   * maxRows, and returns to minRows when it is already that tall; where it resizes both ways its width alternates too.
   */
  private fitToText() {
    const input = this.textarea;
    if (!input) return;
    const shown = this.shownLines(input);
    input.removeAttribute('data-resizing');
    const fits = this.clampLines(this.textLines(input));
    this.manualLines = Math.abs(this.lines - fits) < 0.01 ? this.minLines : fits;
    this.showLines(input, shown, this.manualLines, true);
    if (this.axis === 'both') this.toggleWidth();
  }

  /**
   * TXI-41: where the field resizes both ways, an activation of the grip also makes it as wide as its layout allows —
   * its own max-inline-size, or its containing block where it has none — and gives back the width it had before the
   * person resized it when it already is that wide: the width, too, never depends on a drag (WCAG 2.5.7). At once,
   * as a drag is.
   */
  private toggleWidth() {
    const widest = this.manualWidth && this.style.inlineSize === '100%';
    if (widest) {
      const { inlineSize, maxInlineSize } = this.manualWidth!;
      this.style.inlineSize = inlineSize;
      this.style.maxInlineSize = maxInlineSize;
      this.manualWidth = null;
      return;
    }
    if (!this.manualWidth) {
      this.manualWidth = { inlineSize: this.style.inlineSize, maxInlineSize: this.style.maxInlineSize };
      if (getComputedStyle(this).maxInlineSize === 'none') this.style.maxInlineSize = '100%';
    }
    this.style.inlineSize = '100%';
  }

  /**
   * TXI-39: the field's own width, as the person gives it — written as the host's inline size, never narrower than its
   * inline paddings, its icons and sys.target.touch, and no wider than its layout allows (its own max-inline-size, or
   * its containing block where it has none).
   */
  private resizeWidth(width: number) {
    const input = this.textarea;
    if (!input) return;
    const touch = this.renderRoot.querySelector('.touch-probe')?.getBoundingClientRect().width ?? 0;
    const least = this.getBoundingClientRect().width - input.getBoundingClientRect().width + touch;
    if (!this.manualWidth) {
      this.manualWidth = { inlineSize: this.style.inlineSize, maxInlineSize: this.style.maxInlineSize };
      if (getComputedStyle(this).maxInlineSize === 'none') this.style.maxInlineSize = '100%';
    }
    this.style.inlineSize = `${Math.max(width, least)}px`;
  }

  /** TXI-39: the size the person gave the field is kept until resize, resizeAxis, minRows or maxRows changes. */
  private releaseSize() {
    this.manualLines = null;
    if (!this.manualWidth) return;
    this.style.inlineSize = this.manualWidth.inlineSize;
    this.style.maxInlineSize = this.manualWidth.maxInlineSize;
    this.manualWidth = null;
  }

  /**
   * TXI-39, TXI-40: a press that begins on the grip's hit area belongs to the grip — it does not place the caret,
   * select text or take focus from the input — and a drag follows the pointer without motion.
   */
  private onGripPointerDown(event: PointerEvent) {
    const input = this.textarea;
    if (!input || event.button !== 0) return;
    event.preventDefault();
    const grip = event.currentTarget as HTMLElement;
    grip.setPointerCapture?.(event.pointerId);
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lines: this.shownLines(input),
      width: this.getBoundingClientRect().width,
      line: this.lineOf(input),
      rtl: getComputedStyle(this).direction === 'rtl',
      moved: false,
    };
  }

  private onGripPointerMove(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const [dx, dy] = [event.clientX - drag.x, event.clientY - drag.y];
    if (!drag.moved && Math.hypot(dx, dy) <= DRAG_SLOP) return;
    drag.moved = true;
    this.resizeTo(drag.lines + dy / drag.line, false);
    // TXI-24: the end edge follows the pointer — to the left in a right-to-left layout.
    if (this.axis === 'both') this.resizeWidth(drag.width + (drag.rtl ? -dx : dx));
  }

  private onGripPointerUp(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    this.drag = null;
    // TXI-41: a click or a tap that ends where it began fits the height to the text.
    if (!drag.moved) this.fitToText();
  }

  private onGripPointerCancel() {
    this.drag = null;
  }

  private onGripMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  /** TXI-41: an activation that came with no pointer (a click assistive technology makes) fits the height to the text too. */
  private onGripClick(event: MouseEvent) {
    if (event.detail === 0) this.fitToText();
  }

  /**
   * TXI-41: Down Arrow makes the input one line taller and Up Arrow one line shorter, Home returns it to minRows and
   * End takes it to maxRows (without one, to the height that shows every line); where the field resizes both ways the
   * horizontal arrow that points to its end edge widens it by one line height and the other narrows it; Enter and
   * Space fit the height to the text. Each change moves as TXI-38 says.
   */
  private onGripKeyDown(event: KeyboardEvent) {
    const input = this.textarea;
    if (!input || event.altKey || event.ctrlKey || event.metaKey) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const widen = (by: number) => {
      if (this.axis === 'both') this.resizeWidth(this.getBoundingClientRect().width + by * this.lineOf(input));
    };
    switch (event.key) {
      case 'ArrowDown':
        this.resizeTo(Math.round(this.lines) + 1, true);
        break;
      case 'ArrowUp':
        this.resizeTo(Math.round(this.lines) - 1, true);
        break;
      case 'Home':
        this.resizeTo(this.minLines, true);
        break;
      case 'End': {
        const shown = this.shownLines(input);
        input.removeAttribute('data-resizing');
        this.manualLines = this.maxLines || this.clampLines(this.textLines(input));
        this.showLines(input, shown, this.manualLines, true);
        break;
      }
      case 'ArrowRight':
        if (this.axis !== 'both') return;
        widen(rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        if (this.axis !== 'both') return;
        widen(rtl ? 1 : -1);
        break;
      case 'Enter':
      case ' ':
        this.fitToText();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private onGripFocus(event: FocusEvent) {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  }

  private onResizeEnd(event: TransitionEvent) {
    const input = event.currentTarget as HTMLElement;
    if (event.target === input && /^margin-(block-end|bottom)$/.test(event.propertyName)) input.removeAttribute('data-resizing');
  }

  /**
   * TXI-37, TXI-38: the height follows a changed width and enlarged text too — at once, without the motion. The
   * textarea's own box says both: its width, and (its height being a number of lines) the line of its text style.
   */
  private observeSize() {
    const input = this.textarea;
    if (input === this.observedInput) return;
    this.sizeObserver ??= typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => this.sizeChanged());
    this.sizeObserver?.disconnect();
    this.observedInput = input;
    if (input) this.sizeObserver?.observe(input);
  }

  private sizeChanged() {
    const input = this.textarea;
    if (!input || this.drag) return;
    const [width, line] = [input.clientWidth, this.lineOf(input)];
    if (width === this.lastBox.width && line === this.lastBox.line) return;
    this.fitHeight(false);
  }

  /**
   * The form's view of the input: a missing value while its Field says it is required; a date or time field's entry error as badInput
   * (a half-filled row), rangeUnderflow or rangeOverflow (a value before min or after max) or a custom error (a listed
   * date) while it lasts (TXI-30). A requirement never validates beyond that (TXI-23).
   */
  private syncValidity() {
    const input = this.input;
    const entry = this.entryError;
    const anchor = input ?? this.renderRoot.querySelector<HTMLElement>('.segment') ?? undefined;
    if (entry) {
      const flag = entry.reason === 'invalid' ? 'badInput' : entry.side === 'under' ? 'rangeUnderflow' : entry.side === 'listed' ? 'customError' : 'rangeOverflow';
      this.says.validity({ [flag]: true }, this.refusalText || this.frame.description() || entry.reason, anchor);
      return;
    }
    if (this.row) {
      if (this.required_ && !this.value && !this.inert_) this.says.validity({ valueMissing: true }, this.missingMessage(), anchor);
      else this.says.validity();
      return;
    }
    if (!input || input.validity.valid) this.says.validity();
    else this.says.validity({ valueMissing: input.validity.valueMissing }, input.validationMessage, input);
  }

  // ── TXI-13, TXI-22, TXI-62: a slotted element wider than an icon ─────────────────────────────────────────

  private iconObserver: ResizeObserver | undefined;
  private observedIcons: Element[] = [];
  /** The measured length of each icon box while what it holds is wider than an icon; empty while it is an icon's. */
  private iconBoxes = { lead: '', trail: '' };

  /** Watches the two icon boxes: an element the product slotted there keeps its own size (TXI-22). */
  private observeIcons() {
    if (typeof ResizeObserver === 'undefined') return;
    const boxes = Array.from(this.renderRoot.querySelectorAll('.icon.leading, .icon.trailing'));
    if (boxes.length === this.observedIcons.length && boxes.every((box, i) => box === this.observedIcons[i])) return;
    this.iconObserver ??= new ResizeObserver((entries) => this.measureIcons(entries));
    this.iconObserver.disconnect();
    for (const box of boxes) this.iconObserver.observe(box);
    this.observedIcons = boxes;
  }

  /**
   * TXI-13, TXI-62: the text starts after the leading box and ends before the trailing one as they are laid out; the
   * label, its copies and the Field's supporting row are placed by a sum of lengths, which takes the icon's size for
   * the box's. While a box is wider than that — the product's icon button — its measured length is written into the
   * sum (`--_lead`, `--_trail`) and said to the Field; a glyph, an icon wide, writes nothing and the field is laid out
   * from its tokens alone.
   */
  private measureIcons(entries: ResizeObserverEntry[]) {
    const field = this.renderRoot.querySelector<HTMLElement>('.field');
    if (!field) return;
    let changed = false;
    for (const entry of entries) {
      const box = entry.target as HTMLElement;
      const side = box.classList.contains('leading') ? 'lead' : 'trail';
      const size = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      // The box is never narrower than an icon (its least length); half a pixel is the rounding of a layout.
      const wider = size > 0 && size - Number.parseFloat(getComputedStyle(box).minInlineSize) > 0.5;
      const length = wider ? `${Math.round(size * 100) / 100}px` : '';
      if (this.iconBoxes[side] === length) continue;
      this.iconBoxes[side] = length;
      if (length) field.style.setProperty(`--_${side}`, length);
      else field.style.removeProperty(`--_${side}`);
      changed = true;
    }
    // TXI-62: what the input says to its Field has changed — it is said again after the update.
    if (changed) this.requestUpdate();
  }

  // ── TXI-13: a label that does not fit on one line ─────────────────────────────────────────────────────────

  /** Watches the two copies of the label that are never drawn, one in each position, for a change in their lines. */
  private labelObserver: ResizeObserver | undefined;
  private observedCopies: Element[] = [];

  /** Returns whether copies are watched from now on that were not before: the observer reports each of them once, after the next layout. */
  private observeLabel(): boolean {
    const copies = Array.from(this.renderRoot.querySelectorAll('.measure'));
    if (copies.length === this.observedCopies.length && copies.every((copy, i) => copy === this.observedCopies[i])) return false;
    this.labelObserver ??= new ResizeObserver(() => this.measureLabel());
    this.labelObserver.disconnect();
    for (const copy of copies) this.labelObserver.observe(copy);
    const had = this.observedCopies.length > 0;
    this.observedCopies = copies;
    // No copy any more (the label left, or stands above the container now): what the last measure wrote is taken back.
    if (!copies.length && had) this.measureLabel();
    return copies.length > 0;
  }

  /**
   * TXI-13: how many lines a floating label takes resting and floated, in the width it is given in each position, and
   * the width of the widest floated line. The copies are laid out as the drawn label is in each position and never
   * drawn. While both take one line nothing is set and the field is laid out as it always was; once either wraps, the
   * field marks it (`data-label-wraps`) and the styles give the lines their room: a taller container, a filled field's
   * taller band, an outlined field's room above its container, and a gap as wide as the widest line. A stacked label
   * stands above the container in the flow and wraps there by itself (TXI-25).
   */
  private measureLabel() {
    const field = this.renderRoot.querySelector<HTMLElement>('.field');
    if (!field) return;
    const resting = labelLines(this.renderRoot.querySelector('.measure-resting'));
    const floated = labelLines(this.renderRoot.querySelector('.measure-floated'));
    const wraps = resting.count > 1 || floated.count > 1;
    field.toggleAttribute('data-label-wraps', wraps);
    if (wraps) {
      field.style.setProperty('--_rest-lines', String(resting.count));
      field.style.setProperty('--_float-lines', String(floated.count));
      field.style.setProperty('--_float-widest', `${floated.widest}px`);
    } else {
      for (const name of ['--_rest-lines', '--_float-lines', '--_float-widest']) field.style.removeProperty(name);
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.observeLabel();
      this.observeSize();
      this.observeIcons();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.countTimer);
    this.labelObserver?.disconnect();
    this.observedCopies = [];
    this.iconObserver?.disconnect();
    this.observedIcons = [];
    this.sizeObserver?.disconnect();
    this.observedInput = null;
    this.drag = null;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    const kind = this.dateKind;
    if (changed.has('locale') && this.locale.trim() && !supportedLocale(this.locale.trim())) {
      report(this, 'TXI-28', `locale "${this.locale}" is not a BCP 47 tag this browser knows; it uses "${FALLBACK_LOCALE}"`);
    }
    // TXI-31: a value, min or max that is not the ISO form of a date or time field's type is treated as empty.
    if (kind && (changed.has('value') || changed.has('type')) && this.value && !isoValue(kind, this.value)) {
      report(this, 'TXI-31', `value "${this.value}" is not the ISO 8601 form of a ${kind}; it is treated as empty`);
      this.value = '';
      this.userValue = undefined;
    }
    const byProduct = changed.has('value') && this.value !== this.userValue;
    if (byProduct) {
      // TXI-2: what the product sets while the field is not being edited is what a later commit compares with.
      if (!this.focused) this.committed = this.value;
      // TXI-31: a date or time field fills every segment from the value, and ends any entry error. (A value set to what
      // the value already is never arrives here, so a half-filled row an echoing product sees stays: TXI-46.)
      this.showValue();
    } else if (kind && (changed.has('type') || changed.has('locale'))) {
      // A new kind or locale draws the value anew; without a value, a new kind starts empty and a new locale keeps what
      // the date's segments hold (an hour is of one clock: it does not carry over).
      const row = this.row!;
      if (this.value) this.segments = segmentsOf(row, this.value);
      else if (changed.has('type')) this.segments = EMPTY_SEGMENTS;
      else this.segments = { ...this.segments, hour: null, period: null };
      this.typedDigits = '';
    }
    if (changed.has('min') || changed.has('max') || changed.has('type')) {
      for (const which of ['min', 'max'] as const) {
        if (kind && this[which] && !isoValue(kind, this[which])) report(this, 'TXI-31', `${which} "${this[which]}" is not the ISO 8601 form of a ${kind}; it is treated as empty`);
      }
      const [min, max] = [this.limit('min'), this.limit('max')];
      if (min && max && min > max) report(this, 'TXI-31', `min "${min}" is later than max "${max}"`);
    }
    if ((changed as PropertyValues).has('disabledDates') || changed.has('type')) {
      for (const entry of kind && kind !== 'time' ? (this.disabledDates ?? []) : []) {
        if (typeof entry !== 'string' || !isoValue('date', entry)) report(this, 'TXI-31', `the entry "${String(entry)}" of disabledDates is not an ISO 8601 calendar date; it is ignored`);
      }
    }
    // TXI-39: the size the person gave the field lasts until one of these changes.
    if (this.hasUpdated && (changed.has('resize') || changed.has('resizeAxis') || changed.has('minRows') || changed.has('maxRows') || changed.has('multiline') || changed.has('type'))) this.releaseSize();
  }

  /** Whether the first update has drawn (the first height is shown without motion, TXI-38). */
  private drawn = false;

  protected override updated(changed: PropertyValues<this>) {
    // TXI-4: never written into a composition; a value the product sets meanwhile waits for its end.
    const written = this.native.show();
    // What the native element holds now is what the element gave it, or took from it (see `value`).
    this.nativeInput = this.input;
    this.nativeSeen = this.nativeInput?.value;
    const input = this.textarea;
    if (input) {
      const laidOut = ['multiline', 'type', 'noWrap', 'minRows', 'maxRows', 'resize', 'resizeAxis', 'size', 'variant'] as const;
      // TXI-38: a height that follows the value moves; the first one, and one that follows anything else, does not.
      if (input !== this.sized || laidOut.some((name) => changed.has(name))) fitTogether(this);
      else if (written) this.fitHeight(true);
    } else {
      this.sized = null;
      this.bar = 0;
    }
    this.observeSize();
    // TXI-41: a grip drawn anew says the lines the input shows.
    const grip = this.renderRoot.querySelector('.grip');
    if (grip && !grip.hasAttribute('aria-valuenow')) grip.setAttribute('aria-valuenow', String(Math.round(this.lines || this.minLines)));
    if (!this.drawn && input) {
      this.drawn = true;
      // The text may be laid out again when its face arrives: the height follows, without motion. Only a field that
      // has a height to fit asks (asking has the browser bring the page's style up to date: `facesArrived`).
      void facesArrived()?.then(() => this.isConnected && fitTogether(this));
    }
    // TXI-42: the segments' text is the field's to write.
    this.paintSegments();
    // TXI-13: the copies of the label are watched for their lines; a new text may break differently in the same box.
    const newlyWatched = this.observeLabel();
    // TXI-22: the icon boxes are watched for an element wider than an icon.
    this.observeIcons();
    // A copy that is watched from this update on is measured when the observer first reports it — after the layout of
    // the frame it is first drawn in, with every other field's — and not here, in this field's own turn, where the
    // read would have the page laid out once for each field.
    const labelChanged = changed.has('label') || changed.has('labelHidden') || changed.has('variant') || this.frameChanged;
    this.frameChanged = false;
    if (labelChanged && !newlyWatched) this.measureLabel();
    // TXI-5: a disabled input is left out of the submission — its own attribute, a fieldset's, or its Field's.
    this.says.value(this.inert_ ? null : this.value, this.value);
    this.syncValidity();
    // TXI-32: the picker button says it opens a dialog, on the native button that carries its semantics.
    const pickerButton = this.renderRoot.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>('.picker-button');
    if (pickerButton) {
      void pickerButton.updateComplete.then(() => {
        const native = pickerButton.shadowRoot?.querySelector('button');
        if (native) hostAria(native, { 'aria-haspopup': 'dialog' });
      });
    }
    this.reportMisuse(changed);
  }

  /** What a debug build reports (TXI-9, TXI-17, TXI-23, TXI-28, TXI-32, TXI-41, TXI-57). */
  private reportMisuse(changed: PropertyValues<this>) {
    const kind = this.dateKind;
    const any = (...names: string[]) => names.some((name) => (changed as PropertyValues).has(name));
    // TXI-23: an input no Field names, with no label of its own, still renders. (A Field with an empty label says so itself: FLD-10.)
    if ((changed.has('label') || !this.hasUpdated) && !this.label.trim() && !this.frame.state) {
      report(this, 'TXI-23', 'label is empty and no field frames it, so the text input has no accessible name; put it in a field with a label, or give it a label');
    }
    if (changed.has('type') && !(this.type in TYPES)) report(this, 'TXI-9', `type "${this.type}" is not a type of the text input; it behaves as "text"`);
    if (any('type', 'multiline') && this.multiline && (this.type === 'password' || kind)) {
      report(this, 'TXI-17', `a ${this.type} field stays single-line; multiline is ignored`);
    }
    // TXI-57: wrap false is read by a multi-line code field alone — prose always wraps, a single line scrolls in its line.
    if (any('noWrap', 'type', 'multiline') && this.noWrap && !this.unwrapped) {
      report(this, 'TXI-57', 'no-wrap is ignored: it is read only by a multi-line code field (type="code" with multiline)');
    }
    if (changed.has('resize') && !RESIZES.includes(this.resize)) report(this, 'TXI-17', `resize "${this.resize}" is not a way the text input is resized; it behaves as "auto"`);
    if (changed.has('resizeAxis') && !RESIZE_AXES.includes(this.resizeAxis)) report(this, 'TXI-17', `resizeAxis "${this.resizeAxis}" is not an axis the text input resizes; it behaves as "vertical"`);
    // TXI-41, TXI-52: a grip nobody named is drawn and works; the developer is told.
    if (this.gripShown && !this.gripName) this.words.missing('resizeLabel', { id: 'TXI-41', effect: 'the resize grip is drawn and works, and has no accessible name' });
    // TXI-28: what a date, time or date-time field ignores, because every empty segment shows its own placeholder and the row is not free text.
    if (kind && any('type', 'placeholder', 'maxLength', 'prefixText', 'suffixText')) {
      const ignored = { placeholder: !!this.placeholder, maxLength: this.maxLength > 0, prefixText: !!this.prefixText, suffixText: !!this.suffixText };
      for (const [name, set] of Object.entries(ignored)) if (set) report(this, 'TXI-28', `${name} is ignored by a ${kind} field: its segments each show their own placeholder, and the row is not free text`);
    }
    if (any('type', 'picker') && this.picker && !kind) {
      report(this, 'TXI-32', `picker is ignored: the type "${this.type}" is not date, time or date-time`);
    }
    if (any('picker', 'pickerLabel', 'type', 'readOnly') && this.pickerShown && !this.pickerLabel.trim()) {
      report(this, 'TXI-32', 'pickerLabel is empty, so the picker button has no accessible name; give it one ("Choose date")');
    }
  }

  /** TXI-32: a date, time or date-time field with `picker`, not read-only, draws the picker button. */
  private get pickerShown() {
    return !!this.dateKind && this.picker && !this.readOnly;
  }

  /** TXI-32: the Button size with the field's size name, or Button's default for a size Button does not have. */
  private get pickerSize(): string {
    if (BUTTON_SIZES.has(this.size)) return this.size;
    const own = /^[a-z0-9][a-z0-9-]*$/.test(this.size) && getComputedStyle(this).getPropertyValue(`--tanrei-comp-button-container-height-${this.size}`).trim();
    return own ? this.size : 'medium';
  }

  private renderPicker() {
    if (!this.pickerShown) return nothing;
    // TXI-32: calendar_month for a date and a date-time, schedule for a time.
    const glyph = this.dateKind === 'time' ? 'schedule' : 'calendar_month';
    return html`<span class="picker" @pointerdown=${this.onPickerPress}
      ><tanrei-button
        part="picker-button"
        class="picker-button"
        variant="text"
        size=${this.pickerSize}
        label=${this.pickerLabel}
        ?disabled=${this.inert_}
        @click=${this.onPickerClick}
        ><span slot="icon">${glyph}</span></tanrei-button
      ></span>`;
  }

  /**
   * TXI-42, TXI-47: the row of segments — a group named by the label, in one left-to-right run; each segment a spin
   * button named by its unit and the label, with its range, its value and its value text (segmentEmptyText while it is
   * empty); the text between them, their placeholders and the copies that give each its width kept from assistive
   * technology. The shown supporting or error text describes the first segment, and every segment while the field is
   * in error. A segment's own text is written by `paintSegments()`.
   */
  private renderRow(row: Row, describedBy: string | undefined) {
    const inert = this.inert_;
    const error = this.inError;
    const last = row.units[row.units.length - 1];
    let first = true;
    const segment = (unit: SegmentUnit) => {
      const said = spoken(row, this.segments, unit, this.words.get('segmentEmptyText', this.segmentEmptyText));
      // TXI-52: an empty segment nobody gave words for has no value and no value text.
      if (said.now === null && said.text === null) this.words.missing('segmentEmptyText', { id: 'TXI-52', effect: 'an empty date or time segment has no value text' });
      const described = first || error ? describedBy : undefined;
      first = false;
      return html`<span class="unit"
        >${sizersOf(row, this.segments, unit).map((text) => html`<span class="sizer" aria-hidden="true">${text}</span>`)}<span
          part="segment"
          class="segment"
          role="spinbutton"
          data-unit=${unit}
          data-placeholder=${placeholderOf(row, unit)}
          tabindex=${inert ? nothing : '0'}
          contenteditable=${inert || this.readOnly ? 'false' : 'true'}
          inputmode=${unit === 'period' ? nothing : 'numeric'}
          enterkeyhint=${unit === last ? 'done' : 'next'}
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          dir=${unit === 'period' ? 'auto' : nothing}
          aria-label=${ifDefined([said.name, this.name_].filter(Boolean).join(', ') || undefined)}
          aria-valuemin=${said.min}
          aria-valuemax=${said.max}
          aria-valuenow=${ifDefined(said.now ?? undefined)}
          aria-valuetext=${ifDefined(said.text ?? undefined)}
          aria-describedby=${ifDefined(described)}
          aria-invalid=${ifDefined(error ? 'true' : undefined)}
          aria-required=${ifDefined(this.required_ ? 'true' : undefined)}
          aria-readonly=${ifDefined(this.readOnly ? 'true' : undefined)}
          aria-disabled=${ifDefined(inert ? 'true' : undefined)}
        ></span
      ></span>`;
    };
    return html`<div
      id="input"
      part="input"
      class="row"
      role="group"
      dir="ltr"
      aria-label=${ifDefined(this.name_ || undefined)}
      aria-disabled=${ifDefined(inert ? 'true' : undefined)}
      ?data-empty=${fill(row, this.segments).held === 0}
      @keydown=${this.onSegmentKeyDown}
      @beforeinput=${this.onBeforeInput}
      @input=${this.onSegmentInput}
      @compositionstart=${this.onSegmentCompositionStart}
      @compositionend=${this.onSegmentCompositionEnd}
      @copy=${this.onCopy}
      @cut=${this.onCut}
      @paste=${this.onPaste}
    >
      ${row.parts.map((part) => (part.unit ? segment(part.unit) : html`<span class="literal" aria-hidden="true">${part.literal}</span>`))}
    </div>`;
  }

  /** TXI-39, TXI-41: the resize grip — a focusable separator whose value is the lines the input shows (`showLines()` writes it). */
  private renderGrip() {
    if (!this.gripShown) return nothing;
    const max = this.maxLines;
    return html`<div
        part="resize-grip"
        class="grip"
        role="separator"
        tabindex="0"
        data-tanrei-shape
        aria-orientation="horizontal"
        aria-controls="input"
        aria-label=${ifDefined(this.gripName || undefined)}
        aria-valuemin=${this.minLines}
        aria-valuemax=${ifDefined(max || undefined)}
        @pointerdown=${this.onGripPointerDown}
        @pointermove=${this.onGripPointerMove}
        @pointerup=${this.onGripPointerUp}
        @pointercancel=${this.onGripPointerCancel}
        @mousedown=${this.onGripMouseDown}
        @click=${this.onGripClick}
        @keydown=${this.onGripKeyDown}
        @focus=${this.onGripFocus}
      >
        <span class="grip-glyph" aria-hidden="true"><span class="ink">${this.axis === 'both' ? 'drag_indicator' : 'drag_handle'}</span></span>
      </div>
      ${this.axis === 'both' ? html`<span class="touch-probe" aria-hidden="true"></span>` : nothing}`;
  }

  protected override render() {
    const kind = TYPES[this.type] ?? TYPES.text;
    const row = this.row;
    const layout = this.layout;
    const labelled = this.labelled;
    const stacked = layout === 'stacked';
    // TXI-65: while the entries slot holds content the input is not empty for its label.
    const hasValue = this.shownValue !== '' || this.hasEntries;
    const affixesShown = !row && (!labelled || hasValue || this.focused);
    const name = this.name_;
    const required = this.required_;
    const described = this.described;
    const count = this.spokenCount;
    const describedBy =
      [
        affixesShown && this.prefixText ? 'prefix' : '',
        affixesShown && this.suffixText ? 'suffix' : '',
        count ? 'counter' : '',
        described ? 'description' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined;
    const rows = this.minLines;
    const max = this.maxLines;
    const common = {
      label: name || undefined,
      invalid: this.inError ? 'true' : undefined,
      autocomplete: this.autocomplete || undefined,
    };
    const onEvents = {
      input: this.onInput,
      change: this.onNativeChange,
      focus: this.onFocus,
      blur: this.onBlur,
      keydown: this.onKeyDown,
      compositionstart: this.native.onCompositionStart,
      compositionend: this.native.onCompositionEnd,
    };
    // The semantics are the native element's: role (textbox, or searchbox for search), the name (its own `label`, else
    // its Field's, drawn or not — never the placeholder), the description (the prefix, the suffix and the count, each
    // by its id, then what its Field gives), invalid, required, read-only and disabled (TXI-11, TXI-19, TXI-23).
    // TXI-24: typed text is laid out by its own direction (`dir="auto"`) once it has a letter to tell it by. Until then
    // — an empty field, digits, punctuation — the input keeps the layout's direction, so the caret and the placeholder
    // stand at the field's start edge (an empty `dir="auto"` input is left to right in every layout). In a multiline
    // field the styles then give each paragraph its own direction (`textarea.input[dir='auto']`).
    // TXI-53: never a code field, whose base direction is left-to-right whatever its first strong character is: empty,
    // holding one bracket or beginning with a string in a right-to-left script, it is laid out alike.
    const code = !!kind.code;
    const own = code ? 'ltr' : /\p{L}/u.test(this.value) ? 'auto' : undefined;
    // TXI-67: beside a value that is always left-to-right — one line of email, url, tel, number or password — the prefix,
    // the value and the suffix are one run of writing, in the direction of the affixes' first strong character and
    // left-to-right where they have none: the row's own `dir`, in every layout direction and never read from the value.
    // A code field's row is left-to-right whatever it holds (TXI-53); every other row is the layout's (TXI-24) — and so
    // is a row that holds entries, whose lines begin at the field's start edge whatever is typed after them (TXI-64).
    const run = code ? 'ltr' : kind.ltr && !row && !this.isMultiline && !this.hasEntries ? runDirection(this.prefixText, this.suffixText) : undefined;
    // TXI-55: what the browser is asked not to do to code, on the native element itself — nothing promises that a host's
    // attribute reaches an element in a shadow root. No remembered entry while the product names no autofill hint.
    if (code) common.autocomplete ??= 'off';
    const control = row
      ? this.renderRow(row, describedBy)
      : this.isMultiline
        ? html`<textarea
            id="input"
            part="input"
            class="input"
            rows=${rows}
            .placeholder=${this.hasEntries ? '' : this.placeholder}
            ?disabled=${this.inert_}
            ?readonly=${this.readOnly}
            ?required=${required}
            dir=${ifDefined(own)}
            wrap=${this.unwrapped ? 'off' : nothing}
            autocapitalize=${code ? 'none' : nothing}
            autocorrect=${code ? 'off' : nothing}
            spellcheck=${code ? 'false' : nothing}
            translate=${code ? 'no' : nothing}
            aria-label=${ifDefined(common.label)}
            aria-describedby=${ifDefined(describedBy)}
            aria-invalid=${ifDefined(common.invalid)}
            autocomplete=${ifDefined(common.autocomplete)}
            @input=${onEvents.input}
            @change=${onEvents.change}
            @focus=${onEvents.focus}
            @blur=${onEvents.blur}
            @keydown=${onEvents.keydown}
            @compositionstart=${onEvents.compositionstart}
            @compositionend=${onEvents.compositionend}
            @transitionend=${this.onResizeEnd}
            @transitioncancel=${this.onResizeEnd}
          ></textarea>`
        : html`<input
            id="input"
            part="input"
            class="input"
            type=${kind.type}
            inputmode=${ifDefined(kind.inputmode)}
            enterkeyhint=${ifDefined(kind.enterkeyhint)}
            autocapitalize=${kind.plain ? 'none' : nothing}
            autocorrect=${kind.plain ? 'off' : nothing}
            spellcheck=${kind.plain ? 'false' : nothing}
            translate=${code ? 'no' : nothing}
            dir=${ifDefined(kind.ltr ? 'ltr' : own)}
            .placeholder=${this.hasEntries ? '' : this.placeholder}
            ?disabled=${this.inert_}
            ?readonly=${this.readOnly}
            ?required=${required}
            aria-label=${ifDefined(common.label)}
            aria-describedby=${ifDefined(describedBy)}
            aria-invalid=${ifDefined(common.invalid)}
            autocomplete=${ifDefined(common.autocomplete)}
            @input=${onEvents.input}
            @change=${onEvents.change}
            @focus=${onEvents.focus}
            @blur=${onEvents.blur}
            @keydown=${onEvents.keydown}
            @compositionstart=${onEvents.compositionstart}
            @compositionend=${onEvents.compositionend}
          />`;
    const floating = !stacked;
    // TXI-50: the asterisk follows a floating label while the Field says so (FLD-25); hidden from assistive technology,
    // because the required state already says it.
    // TXI-50: and the optional word, while the Field gives one (FLD-25): one word space after the label's text, in its
    // style and color — part of the label as drawn — and kept from assistive technology, which hears it in the description.
    const asterisk = this.asterisked
      ? html`<span part="requirement-label" class="asterisk" aria-hidden="true">*</span>`
      : this.optionalWord
        ? html`<span part="requirement-label" class="optional" aria-hidden="true"> ${this.optionalWord}</span>`
        : nothing;
    // The edge: a stacked field's inner line (TXI-26); an outlined field's three-piece outline with the gap for the floated
    // label, and a filled field's active indicator (TXI-13).
    const edges = floating
      ? html`<span part="outline" class="outline" aria-hidden="true"
            ><span class="outline-start"></span
            ><span class="outline-notch">${labelled ? html`<span class="notch-label">${name}${asterisk}</span>` : nothing}</span
            ><span class="outline-end"></span></span
          ><span part="active-indicator" class="indicator" aria-hidden="true"></span>`
      : html`<span part="outline" class="edge" aria-hidden="true"></span>`;
    return html`
      <div
        class="field"
        data-layout=${layout}
        data-resize=${this.isMultiline ? this.resizeMode : nothing}
        data-axis=${this.gripShown ? this.axis : nothing}
        ?data-error=${this.inError}
        ?data-disabled=${this.inert_}
        ?data-labelled=${labelled}
        ?data-has-value=${hasValue}
        ?data-leading=${this.hasLeading}
        ?data-trailing=${this.hasTrailing}
        ?data-entries=${this.hasEntries}
        ?data-no-typing=${this.hasEntries && this.readOnly && this.shownValue === ''}
        ?data-picker=${this.pickerShown}
        ?data-multiline=${this.isMultiline}
        ?data-code=${code && !row}
        ?data-nowrap=${this.unwrapped}
      >
        <div
          part="container"
          class="container"
          data-tanrei-shape
          style=${this.isMultiline ? `--_rows-min: ${rows};${max ? ` --_rows-max: ${max};` : ''}` : nothing}
          @mousedown=${this.onFieldMouseDown}
          @focusin=${this.onEntryFocusIn}
          @focusout=${this.onEntryFocusOut}
        >
          <span part="leading-icon" class="icon leading"><slot name="leading-icon" @slotchange=${this.onSlotChange}></slot></span>
          <div class="body" dir=${(!row && run) || nothing}>
            <span part="entries" class="entries"><slot name="entries" @slotchange=${this.onSlotChange}></slot></span>
            <span part="prefix" class="prefix" id="prefix">${row ? nothing : this.prefixText}</span>
            ${control}
            <span part="suffix" class="suffix" id="suffix">${row ? nothing : this.suffixText}</span>
          </div>
          <span part="trailing-icon" class="icon trailing"><slot name="trailing-icon" @slotchange=${this.onSlotChange}></slot></span>
          ${this.renderPicker()}
          ${floating && labelled ? html`<label part="label" class="label" for="input" aria-hidden="true">${name}${asterisk}</label>` : nothing}
          ${floating && labelled
            ? html`<span class="measure measure-resting" aria-hidden="true">${name}${asterisk}</span
                ><span class="measure measure-floated" aria-hidden="true">${name}${asterisk}</span>`
            : nothing}
          ${edges} ${this.renderGrip()}
        </div>
        ${count ? html`<span id="counter" hidden>${count}</span>` : nothing}${described ? html`<span id="description" hidden>${described}</span>` : nothing}
        <span class="announcer" role="status" aria-live="polite"></span>
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiTextInput);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiTextInput);
if (!customElements.get('tanrei-text-input')) customElements.define('tanrei-text-input', TanreiTextInput);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-text-input': TanreiTextInput;
  }
}
