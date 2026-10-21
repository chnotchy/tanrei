import { type PropertyDeclaration, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  FieldControlController,
  type FieldSays,
  GlyphDrawnController,
  KeptLengths,
  NativeTextController,
  OpenAxesController,
  ambientLocale,
  report,
  supportedLocale,
  syncFocusStyle,
  WordsController,
} from '../../primitives/index.js';
import { missingValueMessage } from '../../primitives/missing-value.js';
import { FloatingLabelController, floatingAsterisk, floatingLabel, triggerEdges } from '../../primitives/field-trigger.js';
import type { TanreiInputBoxSizeRegistry, TanreiInputBoxVariantRegistry } from '../../registry.js';
import '../button/button.js';
import { formOf, pressDefaultButton } from '../../primitives/default-button.js';
import { takeFormDisabled } from '../../primitives/form-disabled.js';
import { FormSays } from '../../primitives/form-says.js';
import { AXES, INSET, styles } from './number-input.styles.js';
import { runDirection } from '../../styles/product-text.js';
import { type Decimal, type NumberForm, type Reading, ZERO, canonical, clamp, compare, decimalFromString, decimalOf, format, numberForm, numberOf, read, round, stepped } from './number-text.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The three looks of the input box (`comp.input-box`): a filled box whose label is the row of its Field (`stacked`), or the label floating inside a `filled` or `outlined` box. A design system may leave some out or add values. */
export type TanreiNumberInputVariant = keyof TanreiInputBoxVariantRegistry;
/** The container's minimum height: the box's `medium` and `large` (`small` is a size of the box this control does not offer). A design system may add values. */
export type TanreiNumberInputSize = Exclude<keyof TanreiInputBoxSizeRegistry, 'small'>;
/** Where the number stands in the input: at the field's start edge, or at its end edge. */
export type TanreiNumberInputAlign = 'start' | 'end';
/** `input`'s detail: the number the text reads as — not clamped, not rounded — or null while it reads as none. */
export interface TanreiNumberInputInputDetail {
  value: number | null;
}
/** `entryerror`'s detail: why the text was not taken, and the input's own words for it — `invalidText`, empty where the product gave none. */
export interface TanreiNumberInputEntryErrorDetail {
  reason: 'invalid';
  text: string;
}

type Layout = 'stacked' | 'filled' | 'outlined';
const ALIGNS: readonly string[] = ['start', 'end'];
/**
 * NMI-37: whether a number input's steppers stand on a row of their own, below its input's line. One observer for every
 * number input of the page, told when a container or an input's line changes size: every host reads, then every host
 * writes, so the inputs of a page cost one layout between them.
 */
const wrapReaders = new WeakMap<Element, () => (() => void) | undefined>();
const wrapObserver =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        const readers = new Set<() => (() => void) | undefined>();
        for (const entry of entries) {
          const reader = wrapReaders.get(entry.target);
          if (reader) readers.add(reader);
        }
        const writes = [...readers].map((reader) => reader());
        for (const write of writes) write?.();
      });

/** NMI-23: Page Up and Page Down step ten steps: ten times the step, on the step's own grid. */
const PAGE = 10;
/** NMI-27: after its tenth repeated step a hold steps at the fast interval. */
const FAST_AFTER = 10;
/** The most digits after the separator a number is written with (what `Intl` itself allows). */
const MOST_DIGITS = 20;

/** A finite number, or null: what `value`, `min` and `max` are whatever they were given (a string of an attribute, undefined, NaN). */
export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : typeof value === 'string' ? (decimalFromString(value) ? Number(value) : Number.NaN) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

/** An attribute that holds a plain decimal number ("12.5"), or nothing: a property that is a number or null. */
export const NUMBER_OR_NULL: PropertyDeclaration = { converter: { fromAttribute: (value: string | null) => numberOrNull(value) } };

/** NMI-16: a platform whose decimal keypad has no minus sign (iOS and iPadOS, which may report itself as a Mac). */
function keypadWithoutMinus(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (/Mac/.test(navigator.platform ?? '') && navigator.maxTouchPoints > 1);
}

/** Runs `task` once the document has been read: an element upgraded while its children are still being parsed has none yet. */
function whenParsed(task: () => void) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', task, { once: true });
  else task();
}

/**
 * The box of a number: lets people enter a number as a number — typed in their locale's form or stepped by a key or a
 * button, kept within limits, with its unit beside it — and draws no row around it. A `<tanrei-field>` frames it with
 * a label, a requirement mark, help and an error, or the product names it with `label` where its visible label is
 * elsewhere: the head of a table's column, a toolbar, the title of a row that also holds a slider.
 * `<tanrei-number-field>` is the two as one element.
 *
 * Contract: specs/number-input.spec.json. Every visual value is a token: the box is drawn from
 * `--tanrei-comp-input-box-*`, the one set every input box is drawn from (NMI-47), and where the steppers stand and how
 * a hold repeats from `--tanrei-comp-number-input-*`; the steppers are `<tanrei-button>`s, drawn from
 * Button's own tokens.
 *
 * ```html
 * <tanrei-number-input label="Scale" value="1.5" min="0.25" max="4" step="0.05" suffix-text="×" value-text="1.5 times" align="end" no-steppers></tanrei-number-input>
 * ```
 *
 * `value` is a number, or null while the input holds none. It changes on a **commit** — focus leaves, Enter, a step —
 * and never while the person types: the text is theirs until then, and nothing typed is refused, reformatted, clamped
 * or rounded. `input` carries what the text reads as meanwhile (what a slider beside the input follows). A commit
 * raises the number to `min`, lowers it to `max`, rounds it to `maxFractionDigits` and writes it back in the locale's
 * form — its digits and its decimal separator, no grouping separators. A text that is not a number is kept, marked as
 * an error, reported with `entryerror` and told to the Field that frames it, which shows `invalidText`.
 *
 * `step` is how far Up Arrow, Down Arrow and a stepper move the number (Page Up and Page Down ten times as far), to
 * the next number on the step's grid counted from `min`; it does not limit what may be typed. Home and End stay the
 * caret's, and the wheel never changes the number.
 *
 * It is a block as wide as its place, with no width of its own: give it a narrower place for a narrower box. In a
 * Field it takes the Field's name, description and required, invalid and disabled states, floats the Field's label
 * in the filled and the outlined look, and tells the Field where its number's line starts and ends. It is a
 * form-associated element: it takes `name`, submits its value as a plain decimal number ("12.5") whatever the locale
 * shows, resets to the `value` attribute, is restored on navigation, follows `<fieldset disabled>` and reports
 * `valueMissing` while its Field says it is required and it holds no value, and `badInput` while it holds a text that
 * is not a number.
 *
 * To assistive technology it is a spin button: its value the committed number, its limits `min` and `max`, its value
 * text `valueText` or the number as shown with its prefix and suffix. The two steppers are named buttons outside the
 * focus order.
 *
 * @tag tanrei-number-input
 * @csspart container - The input's box.
 * @csspart outline - A stacked number input's inner line, or an outlined one's border.
 * @csspart active-indicator - The line along the bottom of a filled number input.
 * @csspart label - The label floating in a filled or an outlined number input.
 * @csspart requirement-label - The required asterisk after a floating label.
 * @csspart input - The native `<input>`: the spin button.
 * @csspart prefix - The fixed text before the number.
 * @csspart suffix - The fixed text after the number.
 * @csspart stepper - One of the two steppers, a `<tanrei-button>`: first the one that steps down, then the one that steps up.
 * @attr {string} form - The id of the form the number input belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires {CustomEvent<TanreiNumberInputInputDetail>} input - The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * @fires change - A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * @fires action - The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 * @fires {CustomEvent<TanreiNumberInputEntryErrorDetail>} entryerror - The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 */
export class TanreiNumberInput extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'number-input');
  static override styles = styles;

  static formAssociated = true;

  /**
   * Its documented parts, once: what an element composed around it exports (src/primitives/composed.ts). Held equal to
   * the `@csspart` lines above by src/primitives/composed.test.ts.
   *
   * @internal
   */
  static readonly parts: readonly string[] = ['container', 'outline', 'active-indicator', 'label', 'requirement-label', 'input', 'prefix', 'suffix', 'stepper'];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: NUMBER_OR_NULL,
    name: { type: String, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    placeholder: { type: String },
    error: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    min: NUMBER_OR_NULL,
    max: NUMBER_OR_NULL,
    step: { type: Number },
    noSteppers: { type: Boolean, attribute: 'no-steppers', reflect: true },
    incrementLabel: { type: String, attribute: 'increment-label' },
    decrementLabel: { type: String, attribute: 'decrement-label' },
    prefixText: { type: String, attribute: 'prefix-text' },
    suffixText: { type: String, attribute: 'suffix-text' },
    valueText: { type: String, attribute: 'value-text' },
    align: { type: String, reflect: true },
    minFractionDigits: { type: Number, attribute: 'min-fraction-digits' },
    maxFractionDigits: { type: Number, attribute: 'max-fraction-digits' },
    locale: { type: String },
    invalidText: { type: String, attribute: 'invalid-text' },
    text: { state: true },
    entryError: { state: true },
    pressing: { state: true },
    focused: { state: true },
    formDisabled: { state: true },
  };

  /** The look, as the text inputs beside it: `stacked` is a filled box whose label is the row of its Field; `filled` and `outlined` float the label inside the box. Use one style per form. A value the number input does not know by name is laid out as stacked. Reflected. */
  variant: TanreiNumberInputVariant = 'stacked';

  /** The container's minimum height: `medium` or `large` (48 / 56 in the default system), the text input's two sizes. The hit area always meets the minimum target. Reflected. */
  size: TanreiNumberInputSize = 'medium';

  /** The committed number, or null while the input holds none. It changes when the person commits — focus leaves, Enter, a step — not on every keystroke; `input` carries what is being typed. The `value` attribute is a plain decimal number ("12.5"), and the value a form reset returns to. */
  get value(): number | null {
    return this.given;
  }

  // NMI-31: a value the product sets replaces the text and ends an entry error — also where it is the value held
  // already, which is no change of the property and so no update: an entry error leaves the value empty (NMI-21), and
  // the product that clears the field sets it empty. What the input makes the value itself goes through `keep()`.
  set value(value: number | null) {
    this.given = value;
    if ((this.edited || this.entryError) && numberOrNull(value) === this.ownValue) {
      this.took(this.ownValue);
      this.requestUpdate();
    }
  }

  /** The name the value is submitted under in a form. Reflected. */
  name = '';

  /** Names the number input where no Field does, or where its visible label is elsewhere: it wins over the Field's label as the accessible name, and is what a filled or an outlined input floats. Never drawn by a stacked input. */
  label = '';

  /** Does not draw the floating label of a filled or an outlined input, which stays the accessible name (`label-hidden`). The Field that frames it says the same with its own `labelHidden`. */
  labelHidden = false;

  /** A hint shown while the input is empty and the label is not in the input line. Never a replacement for `label`. */
  placeholder = '';

  /** Puts the number input in the error condition: every part of its box is drawn from the error parts and it is exposed as invalid. The Field that frames it sets the same through its own `error`. The number input never sets this itself; it enters an error of its own while the text it was left with is not a number. */
  error = false;

  /** Prevents focus, editing, stepping and form submission. */
  disabled = false;

  /** The number can be focused, selected and copied, and is submitted, but not changed: no key steps it and no stepper is drawn. The attribute is `readonly`. */
  readOnly = false;

  /** The lowest number a commit keeps; a lower one is raised to it. Null for no limit. It is also where the steps are counted from. */
  min: number | null = null;

  /** The highest number a commit keeps; a higher one is lowered to it. Null for no limit. A `max` below `min` is no limit. */
  max: number | null = null;

  /** How far Up Arrow, Down Arrow and a stepper move the number; Page Up and Page Down move ten times as far. It does not limit what may be typed. 0 or less, or not a number, steps by 1. */
  step = 1;

  /** Draws no steppers (`no-steppers`: the spec's `steppers`, inverted, because a boolean attribute cannot default to true): for an input in a row too narrow for them, or beside a slider that does their work. The keys still step. Reflected. */
  noSteppers = false;

  /** The accessible name of the stepper that steps up (`increment-label`): this instance's words, else the product's (`setWords({ incrementLabel })`). Tanrei has none: without them the stepper is drawn, works for a pointer and is kept from assistive technology, where the spin button steps by itself. */
  incrementLabel = '';

  /** The accessible name of the stepper that steps down (`decrement-label`): this instance's words, else the product's (`setWords({ decrementLabel })`). Tanrei has none: without them the stepper is drawn, works for a pointer and is kept from assistive technology, where the spin button steps by itself. */
  decrementLabel = '';

  /** Fixed text before the number, not part of the value (`prefix-text`): a currency sign. Written before the number along the direction of the run the two affixes make — that of their first strong character, the prefix asked first, and left-to-right where they have none — in every layout direction. */
  prefixText = '';

  /** Fixed text after the number, not part of the value (`suffix-text`): the unit. Read to assistive technology with the number. Written after the number along the run's direction: at its right for a unit in Latin letters or signs, at its left for one in a right-to-left script or one that begins with a right-to-left mark (U+200F). */
  suffixText = '';

  /** The value as words (`value-text`: "12 pixels"), given to assistive technology in place of the number with its prefix and suffix. The same text a slider beside the field takes. */
  valueText = '';

  /** Where the number stands in the input: at the `start`, the field's start edge, as the text of every other field; or at the `end` of the number's run — the edge at which the suffix stands or would stand, the right for a number alone or with a unit in Latin letters or signs in every layout direction — for a number against its unit or in a column of numbers. Anything else is `start`. Reflected. */
  align: TanreiNumberInputAlign = 'start';

  /** The fewest digits shown after the decimal separator; zeros fill them (`min-fraction-digits`: 2 for an amount of money). */
  minFractionDigits = 0;

  /** The most digits kept after the decimal separator (`max-fraction-digits`): a commit rounds to it. 0 makes the field hold whole numbers and asks for a keyboard without a separator. */
  maxFractionDigits = 3;

  /** A BCP 47 language tag ("de-DE", "ar-EG") for how the number is shown and read: its digits and its decimal separator. Empty reads the nearest `lang` attribute, then the browser's language. The value itself is a number in every locale. */
  locale = '';

  /** The words of the refusal of a text that is not a number (`invalid-text`: "Enter a number"): what the Field that frames the input shows in its supporting row while the entry error lasts — its own `errorText` while this is empty — and the input's description where no Field frames it. */
  invalidText = '';

  /** The text in the input: the person's while they edit, the committed number in the locale's form otherwise (NMI-16, NMI-17). */
  protected text = '';
  /** NMI-21: the field was committed with a text that is not a number, and holds it still. */
  protected entryError = false;
  /** What `value` holds: what the product set last, or what the input made the value since. */
  private given: number | null = null;
  /** NMI-15: the input has focus, however it was gained. */
  protected focused = false;
  /** Set by an ancestor `<fieldset disabled>` (the element's `formDisabledCallback`). */
  protected formDisabled = false;

  private readonly internals: ElementInternals;
  /** What it tells its form, said where an element composed around it hears it (src/primitives/form-says.ts). */
  private readonly says: FormSays;
  /** The value the number input committed or took from the product last: another `value` is the product's (NMI-31). */
  private ownValue: number | null = null;
  /** NMI-20: the value last committed — when the product set it, or at the last `change`. */
  private base: number | null = null;
  /** NMI-16: the person changed the text since it was last written. */
  private edited = false;
  /** NMI-31: the product set a value while an input method was composing: its text is written when the composition ends, and is not the person's. */
  private awaited = false;
  /** NMI-22: a step wrote the text: the caret goes to its end and all of it is kept in view, once it is drawn. */
  private reveal = false;
  /** NMI-27: the stepper that is held down, and its next step. */
  private hold: { direction: 1 | -1; timer: ReturnType<typeof setTimeout> | undefined; repeats: number; interval: number; fast: number } | null = null;
  /** NMI-26: a press of a pointer stepped already; the `click` that ends it is not another step. */
  private pressed = false;
  /**
   * NMI-26: the stepper whose press has begun and whose `mousedown` is still to come (0: none). The step is taken at
   * `pointerdown`; a step that reaches the limit does not disable that stepper before the `mousedown` of the same
   * press has been heard — at once for a mouse, at the release for a touch — because that event is where the field
   * keeps focus where it is (`#onContainerPress`), and a control disabled in between is not sent it: focus left the
   * input, or the control it was on, for the page.
   */
  protected pressing: 1 | -1 | 0 = 0;

  /** NMI-43: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'number-input', behavior: 'NMI-43', axes: AXES });
  /**
   * NMI-45: the input's side of the exchange with the Field that frames it (src/primitives/field.ts). It takes the
   * Field's name, description and states, whether the label is hidden and whether an asterisk follows it; and it says
   * what only it knows — that it draws the label, how far its number's line is inset, its own refusal of an entry. It
   * has an error condition of its own (NMI-10). No Field: it is drawn as a bare input (NMI-46).
   */
  private readonly frame = new FieldControlController(this, {
    errorCondition: true,
    named: () => !!this.label.trim(),
    says: () => this.saysToField,
    changed: () => (this.frameChanged = true),
  });
  /** The Field's answer changed since the last update: the floating label may have other lines (NMI-8). */
  private frameChanged = false;
  /** NMI-16, NMI-31: the text and the native element kept in step without breaking an input method (src/primitives/native-text.ts). */
  private readonly native = new NativeTextController({
    input: () => this.input,
    value: () => this.text,
    // What an input method is composing is not read (NMI-16): the text follows the element and nothing is said. A
    // value the product set meanwhile is the text that waits for the composition's end (NMI-31).
    setValue: (text) => {
      if (text === this.text || this.awaited) return;
      this.text = text;
      this.edited = true;
    },
  });
  /** NMI-8: a floating label that does not fit on one line is given the room its lines take. */
  private readonly floating = new FloatingLabelController(this);
  /** A glyph the number input draws by name is drawn once the icon set can draw it; until then nothing stands in its place. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.stepper-glyph'));
  /**
   * NMI-25: the two steppers keep the touch target's length along the row each (src/primitives/kept-length.ts). NMI-8:
   * the length the pair takes is what a floating label must end before (`--_steppers`).
   */
  private readonly kept = new KeptLengths(() => this.measureSteppers());
  /** NMI-37: the container and the input's line have been given to the observer of wrapping once. */
  private hasWatchedWrap = false;

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

  /** NMI-32: disabled by its own `disabled`, a fieldset's, or the Field or the field group that frames it. */
  private get inert_(): boolean {
    return this.disabled || this.formDisabled || this.frame.disabled;
  }

  /** How the variant is laid out: filled and outlined by name, every other value as stacked (NMI-43). */
  private get layout(): Layout {
    return this.variant === 'filled' || this.variant === 'outlined' ? this.variant : 'stacked';
  }

  /** NMI-44: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /** NMI-12: the accessible name — its own label, else the label of the Field that frames it. */
  private get name_(): string {
    return this.frame.name(this.label.trim() ? this.label : '');
  }

  /** NMI-8: the label floats in the box — a filled or an outlined input with a name, unless its own `labelHidden` or its Field's says to draw none. */
  private get labelled(): boolean {
    return this.layout !== 'stacked' && !!this.name_ && !this.labelHidden && !this.frame.labelHidden;
  }

  /** NMI-10, NMI-21: in the error condition — its own `error`, its Field's, or an entry error. */
  private get wrong(): boolean {
    return this.error || this.frame.invalid || this.entryError;
  }

  /**
   * NMI-45: what the input says to the Field that frames it. That it draws the label while its look floats one — the
   * Field draws no label row either way (FLD-25). How far the line of its number stands from its start edge and from
   * its end edge: its inline padding at each, with and without steppers (`INSET`, in the styles; FLD-26). And an
   * entry error, with its words (FLD-28).
   */
  private get saysToField(): FieldSays {
    return {
      drawsLabel: this.layout !== 'stacked',
      inset: INSET(/^[a-z0-9][a-z0-9-]*$/.test(this.size) ? this.size : 'medium'),
      refusal: this.entryError ? { text: this.invalidText } : null,
    };
  }

  /**
   * NMI-12, NMI-21: what the input is described by — `invalidText` while an entry error lasts and no Field frames it
   * (a Field shows the words and gives them back as its own description, FLD-28), then the description its Field gives.
   */
  private get described(): string {
    return [this.entryError && !this.frame.framed ? this.invalidText : '', this.frame.description()].filter(Boolean).join(' ');
  }

  /** NMI-25: the steppers are drawn. */
  private get steppers(): boolean {
    return !this.noSteppers && !this.readOnly;
  }

  // ── NMI-17, NMI-18, NMI-30, NMI-43: the limits, the digits and the form ───────────────────────────────────────

  /** NMI-30: the limits as decimals; a `max` below `min` is no limit. */
  private get limits(): { min: Decimal | null; max: Decimal | null } {
    const low = numberOrNull(this.min);
    const high = numberOrNull(this.max);
    const min = low === null ? null : decimalOf(low);
    const max = high === null || (low !== null && low > high) ? null : decimalOf(high);
    return { min, max };
  }

  /** NMI-30: the digits after the separator: the most a commit keeps, and the fewest shown — never more than the most. */
  private get digits(): { min: number; max: number } {
    const whole = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), MOST_DIGITS) : fallback);
    const max = whole(this.maxFractionDigits, 3);
    return { min: Math.min(whole(this.minFractionDigits, 0), max), max };
  }

  /** NMI-22: the step as a decimal; 0 or less, or not a number, is 1. */
  private get stepNow(): Decimal {
    const step = typeof this.step === 'number' && Number.isFinite(this.step) && this.step > 0 ? decimalOf(this.step) : null;
    return step ?? decimalOf(1)!;
  }

  /** NMI-17, NMI-43: the locale's form — `locale`, or where it is empty or no tag the browser knows, the nearest `lang` attribute, then the browser's language. */
  private get form_(): NumberForm {
    return numberForm((this.locale && supportedLocale(this.locale)) || ambientLocale(this));
  }

  /** NMI-17: a number as the input shows it; an empty value is an empty input. */
  private shown(value: number | null): string {
    const decimal = value === null ? null : decimalOf(value);
    if (!decimal) return '';
    const { min, max } = this.digits;
    return format(decimal, this.form_, min, max);
  }

  /** NMI-18: what a text reads as, by the locale's form, without the prefix and the suffix where they were typed with it. */
  private reading(text: string): Reading {
    return read(text, this.form_, { prefix: this.prefixText, suffix: this.suffixText });
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The native constraint validity: `valueMissing` while its Field says it is required and it holds no value, `badInput` while it holds a text that is not a number. */
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

  /** Moves focus to the input: the number input's one stop in the focus order. */
  override focus(options?: FocusOptions) {
    this.input?.focus(options);
  }

  override blur() {
    this.input?.blur();
  }

  /** Selects the text in the input. */
  select() {
    this.input?.select();
  }

  formResetCallback() {
    this.resetTo(numberOrNull(this.getAttribute('value')));
  }

  /**
   * NMI-35: a form's reset — the value it was first given is written back. The same value as the one held is still a
   * new one: the text and an entry error go. An element composed around this one, which is then the form's control and
   * holds the `value` attribute, calls it with its own first value.
   *
   * @internal
   */
  resetTo(value: number | null) {
    this.value = value;
    this.took(value);
    this.requestUpdate();
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this.value = typeof state === 'string' ? numberOrNull(state) : null;
    this.took(numberOrNull(this.value));
    this.requestUpdate();
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this, disabled, (value) => (this.formDisabled = value));
  }

  /**
   * NMI-35: the form's view — the committed value as a plain decimal number, whatever the locale shows, or an empty
   * string; left out while disabled. A missing value while its Field says it is required, and a bad input while an entry
   * error lasts (NMI-12, NMI-21). Said through `FormSays`, where an element composed around it hears it. Said when the number input is drawn, and at once when it commits: a listener of `change`
   * or `action`, and the form Enter submits, already see the new value.
   */
  private syncForm() {
    const decimal = this.ownValue === null ? null : decimalOf(this.ownValue);
    const plain = decimal ? canonical(decimal) : '';
    this.says.value(this.inert_ ? null : plain, plain);
    const missing = this.frame.required && this.ownValue === null;
    if ((this.entryError || missing) && !this.inert_ && !this.readOnly) {
      const missingMessage = missingValueMessage('text', { errorText: '', requiredText: this.frame.state?.requiredText ?? '', label: this.name_ });
      // The words of the refusal: the input's own, else what its Field shows for it (its errorText, or its help).
      const message = this.entryError ? this.invalidText || this.frame.description() || missingMessage : missingMessage;
      this.says.validity({ badInput: this.entryError, valueMissing: missing }, message, this.input ?? undefined);
    } else this.says.validity();
  }

  // ── NMI-16, NMI-19 … NMI-21, NMI-31: the text and the value ───────────────────────────────────────────────────

  /** NMI-31: the product gave a value: it is written into the input, whatever was typed, an entry error ends, and nothing is said. */
  private took(value: number | null) {
    this.ownValue = value;
    this.base = value;
    this.edited = false;
    this.entryError = false;
    this.text = this.shown(value);
    this.awaited = this.native.composing;
  }

  /** The number input makes `value` the value itself. */
  private keep(value: number | null) {
    const before = this.given;
    this.given = value;
    this.ownValue = value;
    this.requestUpdate('value', before);
  }

  /** NMI-20: `change`, once, while the value differs from the one last committed. `value` is already the new one. */
  private changed() {
    if (this.ownValue === this.base) return;
    this.base = this.ownValue;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private said(value: number | null) {
    this.dispatchEvent(new CustomEvent<TanreiNumberInputInputDetail>('input', { bubbles: true, composed: true, detail: { value } }));
  }

  /**
   * NMI-16, NMI-19, NMI-21: the person changed the text. Nothing is rewritten: the text is theirs. `input` carries the
   * number it reads as, or null; `value` stays the committed number. A text that became a number, or empty, ends an
   * entry error.
   */
  private typed(text: string) {
    if (this.awaited) {
      // The composition ended on the product's value: it is shown, and nothing is said.
      this.awaited = false;
      return;
    }
    this.text = text;
    this.edited = true;
    const reading = this.reading(text);
    if (reading.kind !== 'invalid') this.entryError = false;
    this.said(reading.kind === 'number' ? numberOf(reading.value) : null);
  }

  #onInput(event: Event) {
    // The native element's own `input` stops at the shadow root: the number input's carries a number (NMI-19).
    event.stopPropagation();
    // NMI-16: a composition is left to the native element; the text is read when it ends.
    if (this.native.composingInput(event)) return;
    this.typed((event.target as HTMLInputElement).value);
  }

  /**
   * NMI-20, NMI-21: commits the text. A number is raised to `min`, lowered to `max`, rounded to `maxFractionDigits`,
   * made the value and written back in the locale's form; an empty text makes the value empty; a text that is not a
   * number is kept, makes the value empty and enters the entry error (`entryerror`). Then `change`, once, while the
   * value differs from the one last committed. A text the person did not change commits nothing.
   */
  private commit() {
    if (!this.edited || this.inert_ || this.readOnly) return;
    this.edited = false;
    const reading = this.reading(this.text);
    if (reading.kind === 'invalid') {
      this.keep(null);
      this.entryError = true;
      this.syncForm();
      this.dispatchEvent(new CustomEvent<TanreiNumberInputEntryErrorDetail>('entryerror', { bubbles: true, composed: true, detail: { reason: 'invalid', text: this.invalidText } }));
    } else {
      this.entryError = false;
      if (reading.kind === 'empty') {
        this.keep(null);
        this.text = '';
      } else {
        const { min, max } = this.limits;
        const decimal = round(clamp(reading.value, min, max), this.digits.max);
        this.keep(numberOf(decimal));
        this.text = this.shown(this.ownValue);
      }
      this.syncForm();
    }
    this.changed();
  }

  // ── NMI-22, NMI-23, NMI-26, NMI-27: stepping ──────────────────────────────────────────────────────────────────

  /**
   * NMI-22: steps `direction` by `factor` steps. From the number the text reads as — or from the value where the
   * person did not change the text, or changed it into what is not a number — to the `factor`th number that is `min`
   * (or zero) plus a whole multiple of the step (NMI-23: a page key's ten steps stay on the step's grid), held within the limits and computed in decimal; a field that holds no
   * value takes the number nearest to zero the limits allow, and nothing more. The result is a commit's: rounded to
   * `maxFractionDigits`, made the value and written into the input. `input`, then `change` — or, while a stepper is
   * held, `change` when the hold ends. A step that would not change the value says nothing. Returns whether it stepped.
   */
  private stepBy(direction: 1 | -1, factor: number, held = false): boolean {
    if (this.inert_ || this.readOnly) return false;
    const reading = this.edited ? this.reading(this.text) : null;
    const from = reading?.kind === 'number' ? reading.value : reading?.kind === 'empty' || this.ownValue === null ? null : decimalOf(this.ownValue);
    const { min, max } = this.limits;
    const target = from ? stepped(from, min ?? ZERO, this.stepNow, direction, factor) : ZERO;
    const next = numberOf(round(clamp(target, min, max), this.digits.max));
    const moved = next !== this.ownValue;
    // Up at max, down at min: nothing is done. (A text the person had changed is still made the value's.)
    if (!moved && !this.edited && !this.entryError) return false;
    this.keep(next);
    this.text = this.shown(next);
    this.edited = false;
    this.entryError = false;
    this.reveal = true;
    this.syncForm();
    if (!moved) return false;
    this.said(next);
    if (!held) this.changed();
    return true;
  }

  /** NMI-25: the stepper of `direction` has nowhere to go: the value is at or past that limit, or the field is disabled. */
  private atLimit(direction: 1 | -1): boolean {
    if (this.inert_) return true;
    const value = this.ownValue === null ? null : decimalOf(this.ownValue);
    const { min, max } = this.limits;
    if (!value) return false;
    return direction > 0 ? !!max && compare(value, max) >= 0 : !!min && compare(value, min) <= 0;
  }

  /** NMI-27: the three waiting times of a hold, in milliseconds: before the first repeat, between repeats, and between them after the tenth. */
  private holdTimes(): [number, number, number] {
    const box = this.renderRoot.querySelector('.steppers');
    const times = box
      ? getComputedStyle(box)
          .transitionDelay.split(',')
          .map((time) => {
            const seconds = Number.parseFloat(time);
            return Number.isFinite(seconds) ? (time.trim().endsWith('ms') ? seconds : seconds * 1000) : 0;
          })
      : [];
    return [times[0] ?? 0, times[1] ?? 0, times[2] ?? times[1] ?? 0];
  }

  /**
   * NMI-26, NMI-27: a press on a stepper steps once when it begins, and takes no focus (the container's `mousedown`
   * keeps it where it is). Held, it steps again after `motion.repeat-delay`, then once every `motion.repeat-interval`,
   * and after its tenth repeated step once every `motion.repeat-interval-fast`, until the press ends, the pointer
   * leaves the stepper, or the value reaches the limit. Every step is one step; `change` follows once, when it ends.
   */
  #onStepperDown(event: PointerEvent, direction: 1 | -1) {
    if (!event.isPrimary || event.button !== 0) return;
    this.release();
    this.pressed = true;
    this.pressing = direction;
    window.addEventListener('pointerup', this.onPointerEnd, true);
    window.addEventListener('pointercancel', this.onPointerEnd, true);
    if (this.inert_ || this.readOnly || this.atLimit(direction)) return;
    // A touch is captured by what it lands on: without the capture, leaving the stepper is heard (NMI-27).
    const target = event.composedPath()[0];
    if (target instanceof Element && target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.stepBy(direction, 1, true);
    if (this.atLimit(direction)) {
      this.changed();
      return;
    }
    const [delay, interval, fast] = this.holdTimes();
    this.hold = { direction, timer: undefined, repeats: 0, interval, fast };
    this.hold.timer = setTimeout(this.repeat, delay);
  }

  private readonly repeat = () => {
    const hold = this.hold;
    if (!hold) return;
    const moved = this.stepBy(hold.direction, 1, true);
    hold.repeats++;
    if (!moved || this.atLimit(hold.direction)) this.release();
    else hold.timer = setTimeout(this.repeat, hold.repeats >= FAST_AFTER ? hold.fast : hold.interval);
  };

  /** NMI-27: the hold ends: no more steps, and `change` once while the value differs from the one last committed. */
  private release() {
    if (!this.hold) return;
    clearTimeout(this.hold.timer);
    this.hold = null;
    if (this.isConnected) this.changed();
  }

  private readonly onPointerEnd = () => {
    window.removeEventListener('pointerup', this.onPointerEnd, true);
    window.removeEventListener('pointercancel', this.onPointerEnd, true);
    this.release();
    // The `click` that ends this press follows at once; one that comes later is assistive technology's. A touch's
    // `mousedown` comes with it.
    setTimeout(() => {
      this.pressed = false;
      this.pressing = 0;
    });
  };

  /** NMI-26: a stepper activated through assistive technology — a `click` no press of a pointer began — steps once. */
  #onStepperClick(event: MouseEvent, direction: 1 | -1) {
    const pointer = this.pressed && event.detail > 0;
    this.pressed = false;
    if (!pointer) this.stepBy(direction, 1);
  }

  /**
   * NMI-20, NMI-23: the input's keys. Up Arrow and Down Arrow step by `step`, Page Up and Page Down by ten times it —
   * once for each repeat of a held key; Enter commits, fires `action` after any `change`, and asks the form to submit
   * unless `action` was cancelled. Home, End, Left Arrow and Right Arrow, and every arrow or page key with a modifier,
   * are the text's. While an input method composes, every key is its own.
   */
  #onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || this.inert_) return;
    if (event.isComposing || this.native.composing || event.keyCode === 229) return;
    const { key } = event;
    if (key === 'Enter') {
      this.commit();
      // Its own form, or the form of the element composed around it (src/primitives/default-button.ts, `formOf`).
      const form = this.dispatchEvent(new Event('action', { bubbles: true, composed: true, cancelable: true })) ? formOf(this, this.form) : null;
      if (form) {
        event.preventDefault();
        pressDefaultButton(form);
      }
      return;
    }
    if (this.readOnly || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const step: [1 | -1, number] | null = key === 'ArrowUp' ? [1, 1] : key === 'ArrowDown' ? [-1, 1] : key === 'PageUp' ? [1, PAGE] : key === 'PageDown' ? [-1, PAGE] : null;
    if (!step) return;
    event.preventDefault();
    this.stepBy(step[0], step[1]);
  }

  #onFocus() {
    this.focused = true;
    // NMI-15: where style queries are missing, the focus style is read when focus arrives.
    syncFocusStyle(this, this.renderRoot.querySelector<HTMLElement>('.field'));
  }

  /** NMI-20: the input lost focus: the text is committed. */
  #onBlur() {
    this.focused = false;
    this.commit();
  }

  /**
   * NMI-14: a press on the container's padding, on a floating label, on the prefix or on the suffix moves focus to the input and does
   * nothing else. A press in the input places the caret. NMI-26: a press on a stepper moves no focus: a field that was
   * not focused stays unfocused, and a focused input keeps its focus and its caret.
   */
  #onContainerPress(event: MouseEvent) {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest('.input')) return;
    event.preventDefault();
    // NMI-26: the press's `mousedown` has been heard: a stepper that reached the limit is disabled from here on.
    if (target.closest('.steppers')) this.pressing = 0;
    else if (!this.inert_) this.focus();
  }

  /**
   * NMI-8: the length the steppers take, for a floating label to end before. Read now; what is returned writes it
   * (nothing where it is what the field has): the fields of a page are all read before any of them is written
   * (src/primitives/kept-length.ts).
   */
  private measureSteppers(): (() => void) | undefined {
    const field = this.renderRoot.querySelector<HTMLElement>('.field');
    const box = this.renderRoot.querySelector<HTMLElement>('.steppers');
    if (!field) return undefined;
    const length = box ? `${Math.round(box.getBoundingClientRect().width * 100) / 100}px` : '';
    if (field.style.getPropertyValue('--_steppers') === length) return undefined;
    return () => {
      if (length) field.style.setProperty('--_steppers', length);
      else field.style.removeProperty('--_steppers');
    };
  }

  /**
   * NMI-36, NMI-37: where the input's line and the steppers do not fit on one row the container wraps them, and the
   * steppers stand on a row of their own (`data-wrapped` on the field, which places them and the label). Read now;
   * what is returned writes it (nothing where it is what the field has).
   */
  private readonly readWrap = (): (() => void) | undefined => {
    const field = this.renderRoot.querySelector<HTMLElement>('.field');
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    const steppers = this.renderRoot.querySelector<HTMLElement>('.steppers');
    if (!field || !body) return undefined;
    const wrapped = !!steppers && steppers.getBoundingClientRect().top >= body.getBoundingClientRect().bottom - 0.5;
    if (field.hasAttribute('data-wrapped') === wrapped) return undefined;
    return () => field.toggleAttribute('data-wrapped', wrapped);
  };

  /** NMI-37: the container and the input's line are watched while the number input is on the page. */
  private watchWrap(on: boolean) {
    for (const selector of ['.container', '.body']) {
      const element = this.renderRoot?.querySelector<HTMLElement>(selector);
      if (!element || !wrapObserver) continue;
      if (on) {
        wrapReaders.set(element, this.readWrap);
        wrapObserver.observe(element);
      } else {
        wrapReaders.delete(element);
        wrapObserver.unobserve(element);
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.watchWrap(true);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('pointerup', this.onPointerEnd, true);
    window.removeEventListener('pointercancel', this.onPointerEnd, true);
    this.release();
    this.pressing = 0;
    this.kept.clear();
    this.watchWrap(false);
    this.focused = false;
  }

  protected override willUpdate(changed: PropertyValues) {
    if (this.inert_) this.focused = false;

    // NMI-31: a value the product set is written into the input whatever the person had typed, ends an entry error and
    // says nothing. NMI-30: it is shown as it is, never corrected by the limits.
    const value = numberOrNull(this.value);
    if (changed.has('value') && value !== this.ownValue) this.took(value);
    // NMI-17, NMI-31: the limits, the step, the digits or the locale changed: the value is shown again in the new form,
    // and is not changed. A text the person is editing, or was left with, is never touched.
    else if (!this.edited && !this.entryError && (!this.hasUpdated || ['minFractionDigits', 'maxFractionDigits', 'locale'].some((name) => changed.has(name)))) this.text = this.shown(this.ownValue);
  }

  protected override updated(changed: PropertyValues) {
    // NMI-16, NMI-31: the text is shown in the element — never into a composition.
    this.native.show();
    const input = this.input;
    if (this.reveal && input && !this.native.composing) {
      this.reveal = false;
      // NMI-22: the caret at the end of the stepped number, and all of it kept in view.
      if (this.focused) {
        input.setSelectionRange(input.value.length, input.value.length);
        input.scrollLeft = input.scrollWidth;
      }
    }
    // NMI-8: the label's lines follow its text — the Field's, where it gives the name —, the asterisk and the size.
    if (this.frameChanged || changed.has('label') || changed.has('labelHidden') || changed.has('variant') || changed.has('size')) this.floating.measure();
    this.frameChanged = false;
    // NMI-37: the steppers stand on a row of their own where the row cannot hold them beside the input's line. The
    // observer reports the first layout (and every later change of the container's or the line's size), so nothing is
    // read here — but for steppers taken away, which may leave both sizes as they were.
    if (!this.hasWatchedWrap) {
      this.hasWatchedWrap = true;
      this.watchWrap(true);
    } else if (changed.has('steppers') && !this.steppers) this.readWrap()?.();
    // NMI-25: the steppers that are drawn keep their targets apart.
    this.kept.set([...this.renderRoot.querySelectorAll<HTMLElement>('.stepper')]);
    if (!this.steppers) this.measureSteppers()?.();
    // NMI-25, NMI-26: a stepper that held focus itself — given by a script or by assistive technology, never by Tab or
    // a press — and is disabled now: focus goes to the input, the one stop, before it would go to nothing.
    const holder = this.shadowRoot?.activeElement;
    if (!this.inert_ && holder?.classList.contains('stepper') && (holder as Element & { disabled?: boolean }).disabled) this.focus();

    this.syncForm();

    whenParsed(() => this.reports(changed));
  }

  /** What a debug build tells the developer; the number input still renders. */
  private reports(changed: PropertyValues) {
    if (!this.isConnected) return;
    // NMI-12: an input no Field names, with no label of its own, still renders. (A Field with an empty label says so itself: FLD-10.)
    if (!this.label.trim() && !this.frame.state) report(this, 'NMI-12', 'label is empty and no field frames it, so the number input has no accessible name; put it in a field with a label, or give it a label');
    // NMI-44: a stepper nobody named is kept from assistive technology, and said to the developer.
    if (this.steppers && !this.words.get('incrementLabel', this.incrementLabel)) {
      this.words.missing('incrementLabel', { id: 'NMI-44', effect: 'the stepper that steps up has no name and is kept from assistive technology; the spin button still steps' });
    }
    if (this.steppers && !this.words.get('decrementLabel', this.decrementLabel)) {
      this.words.missing('decrementLabel', { id: 'NMI-44', effect: 'the stepper that steps down has no name and is kept from assistive technology; the spin button still steps' });
    }
    if (changed.has('step') && !(typeof this.step === 'number' && Number.isFinite(this.step) && this.step > 0)) report(this, 'NMI-22', `step "${String(this.step)}" is not a number above 0; the number input steps by 1`);
    const low = numberOrNull(this.min);
    const high = numberOrNull(this.max);
    if ((changed.has('min') || changed.has('max')) && low !== null && high !== null && low > high) report(this, 'NMI-30', `min (${low}) is above max (${high}); max is treated as empty`);
    if ((changed.has('minFractionDigits') || changed.has('maxFractionDigits')) && this.minFractionDigits > this.maxFractionDigits) {
      report(this, 'NMI-30', `minFractionDigits (${this.minFractionDigits}) is above maxFractionDigits (${this.maxFractionDigits}); maxFractionDigits is used for both`);
    }
    if (changed.has('align') && !ALIGNS.includes(this.align)) report(this, 'NMI-43', `align "${this.align}" is not start or end; it behaves as "start"`);
    if (changed.has('locale') && this.locale && !supportedLocale(this.locale)) report(this, 'NMI-43', `locale "${this.locale}" is not a language tag the browser knows; the number is shown and read in the form of the page's language`);
  }

  protected override render() {
    const layout = this.layout;
    const stacked = layout === 'stacked';
    const labelled = this.labelled;
    const inert = this.inert_;
    const name = this.name_;
    const described = this.described;
    const wrong = this.wrong;
    const steppers = this.steppers;
    // NMI-44: the steppers' names — the instance's, else the product's words; a stepper without one is kept from assistive technology.
    const incrementLabel = this.words.get('incrementLabel', this.incrementLabel);
    const decrementLabel = this.words.get('decrementLabel', this.decrementLabel);
    // NMI-7: the asterisk follows a floating label while the Field says so (FLD-25); never outside a Field.
    const asterisk = labelled && this.frame.requiredMark === 'asterisk' ? floatingAsterisk('asterisk') : nothing;
    // NMI-34: the spin button's value is the committed number, its limits `min` and `max` while each is given, and
    // its value text `valueText`, or the number as shown with the prefix before it and the suffix after it, each parted
    // from it by a space. A field that holds no value exposes neither.
    const value = this.ownValue === null ? null : decimalOf(this.ownValue);
    const { min, max } = this.limits;
    const valueText = value ? this.valueText || [this.prefixText.trim(), this.shown(this.ownValue), this.suffixText.trim()].filter(Boolean).join(' ') : '';
    // NMI-39: the prefix, the number and the suffix are one run of writing, in the direction of the affixes' first strong
    // character and left-to-right where they have none — the `dir` of the box that holds the three, in every layout
    // direction. Read from the two props alone, so nothing changes sides while the person types. The container, the
    // steppers and the floating label keep the layout's direction. NMI-29: `align` end is the end of that run.
    const run = runDirection(this.prefixText, this.suffixText);
    // NMI-16: a numeric keyboard — with a decimal separator while a fraction may be typed, and one that has a minus
    // sign while a negative number may be.
    const negative = !min || min.int < 0n;
    const inputmode = negative && keypadWithoutMinus() ? 'text' : this.digits.max > 0 ? 'decimal' : 'numeric';
    // NMI-12: the input is named by its own label, else by its Field's — drawn or not, and never by the placeholder —
    // and described by what its Field gives (and by invalidText while an entry error lasts and no Field frames it).
    // It names itself (`aria-label`): an id cannot cross a shadow root, and a name taken from a text that is not
    // drawn is no name to a checker. The floating label, the glyphs, the prefix and the suffix are kept from
    // assistive technology: the name and the value text say them.
    return html`
      <div
        class="field"
        data-layout=${layout}
        data-align=${this.align === 'end' ? 'end' : 'start'}
        data-run=${run}
        ?data-error=${wrong}
        ?data-disabled=${inert}
        ?data-focused=${this.focused && !inert}
        ?data-labelled=${labelled}
        ?data-has-value=${this.text !== ''}
        ?data-steppers=${steppers}
      >
        <div part="container" class="container" data-tanrei-shape aria-disabled=${inert ? 'true' : nothing} @mousedown=${this.#onContainerPress}>
          <div class="body" dir=${run}>
            <span part="prefix" class="prefix" aria-hidden="true">${this.prefixText}</span>
            <input
              id="input"
              part="input"
              class="input"
              type="text"
              role="spinbutton"
              inputmode=${inputmode}
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              .placeholder=${this.placeholder}
              ?disabled=${inert}
              ?readonly=${this.readOnly}
              aria-label=${name || nothing}
              aria-describedby=${described ? 'description' : nothing}
              aria-invalid=${wrong ? 'true' : nothing}
              aria-required=${this.frame.required ? 'true' : nothing}
              aria-readonly=${this.readOnly ? 'true' : nothing}
              aria-valuenow=${value ? canonical(value) : nothing}
              aria-valuemin=${min ? canonical(min) : nothing}
              aria-valuemax=${max ? canonical(max) : nothing}
              aria-valuetext=${valueText || nothing}
              @input=${this.#onInput}
              @keydown=${this.#onKeyDown}
              @focus=${this.#onFocus}
              @blur=${this.#onBlur}
              @compositionstart=${this.native.onCompositionStart}
              @compositionend=${this.native.onCompositionEnd}
            />
            <span part="suffix" class="suffix" aria-hidden="true">${this.suffixText}</span>
          </div>
          ${steppers
            ? html`<span class="steppers"
                ><tanrei-button
                  part="stepper"
                  class="stepper down"
                  variant="text"
                  label=${decrementLabel}
                  aria-hidden=${decrementLabel ? nothing : 'true'}
                  .outsideFocusOrder=${true}
                  ?disabled=${this.atLimit(-1) && this.pressing !== -1}
                  @pointerdown=${(event: PointerEvent) => this.#onStepperDown(event, -1)}
                  @pointerleave=${this.release}
                  @click=${(event: MouseEvent) => this.#onStepperClick(event, -1)}
                  ><span slot="icon" class="stepper-glyph"><span class="ink">remove</span></span></tanrei-button
                ><tanrei-button
                  part="stepper"
                  class="stepper up"
                  variant="text"
                  label=${incrementLabel}
                  aria-hidden=${incrementLabel ? nothing : 'true'}
                  .outsideFocusOrder=${true}
                  ?disabled=${this.atLimit(1) && this.pressing !== 1}
                  @pointerdown=${(event: PointerEvent) => this.#onStepperDown(event, 1)}
                  @pointerleave=${this.release}
                  @click=${(event: MouseEvent) => this.#onStepperClick(event, 1)}
                  ><span slot="icon" class="stepper-glyph"><span class="ink">add</span></span></tanrei-button
                ></span
              >`
            : nothing}
          ${floatingLabel({ floating: labelled, label: name, asterisk })} ${triggerEdges({ stacked, floating: labelled, label: name, asterisk })}
        </div>
        ${described ? html`<span id="description" hidden>${described}</span>` : nothing}
      </div>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiNumberInput);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiNumberInput);
if (!customElements.get('tanrei-number-input')) customElements.define('tanrei-number-input', TanreiNumberInput);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-number-input': TanreiNumberInput;
  }
}
