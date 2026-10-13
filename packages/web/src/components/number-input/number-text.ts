// A number as a number input holds it, reads it and writes it (NMI-17, NMI-18, NMI-20, NMI-22). Nothing here touches
// the page: it is arithmetic and text, so that every rule can be tested by itself.
//
//   the arithmetic   a decimal held exactly — a whole number of units of 10^-scale — so that 0.1 stepped by 0.2 is 0.3
//                    and a half is rounded away from zero as the digits a person typed say, never as the nearest
//                    binary fraction does.
//   the form         a locale's digits, its decimal separator, its grouping separator and its minus sign, asked of
//                    `Intl.NumberFormat` once per locale.
//   writing          the number in that form: no grouping, no exponent, a fixed range of digits after the separator.
//   reading          a text as a number, leniently, by that form — and never by a guess between two locales' forms.

/** A decimal number, exactly: `int` × 10^-`scale`. Always normalised: no trailing zero in `int` while `scale` is above 0. */
export interface Decimal {
  int: bigint;
  scale: number;
}

const pow10 = (exponent: number) => 10n ** BigInt(exponent);

function normalise(int: bigint, scale: number): Decimal {
  while (scale > 0 && int % 10n === 0n) {
    int /= 10n;
    scale--;
  }
  return { int, scale };
}

export const ZERO: Decimal = { int: 0n, scale: 0 };

/**
 * A plain decimal string — ASCII digits, a period, an optional sign and exponent ("12.5", "-0.25", "1e-7") — as a
 * decimal; null for anything else. The form of the `value` attribute, of a form's value, and of a number as JavaScript
 * writes it.
 */
export function decimalFromString(text: string): Decimal | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text.trim());
  if (!match || (!match[2] && !match[3])) return null;
  const fraction = match[3] ?? '';
  let int = BigInt(`${match[2]}${fraction}` || '0');
  let scale = fraction.length - Number(match[4] ?? 0);
  // A scale no number a person means has: not worth the digits.
  if (Math.abs(scale) > 400) return null;
  if (scale < 0) {
    int *= pow10(-scale);
    scale = 0;
  }
  return normalise(match[1] === '-' ? -int : int, scale);
}

/** A number as the decimal its shortest text names (0.1 is one tenth, not the binary fraction nearest to it); null for what is not a finite number. */
export const decimalOf = (value: number): Decimal | null => (Number.isFinite(value) ? decimalFromString(String(value)) : null);

/** The digits of a decimal's magnitude: before the separator, and after it. */
function digitsOf({ int, scale }: Decimal): { negative: boolean; whole: string; fraction: string } {
  const negative = int < 0n;
  const digits = (negative ? -int : int).toString().padStart(scale + 1, '0');
  return { negative, whole: digits.slice(0, digits.length - scale), fraction: scale ? digits.slice(digits.length - scale) : '' };
}

/** The plain decimal string of a decimal: ASCII digits and a period, never an exponent, never the locale's form ("12.5"). */
export function canonical(decimal: Decimal): string {
  const { negative, whole, fraction } = digitsOf(decimal);
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** The number a decimal is (the nearest one a JavaScript number can hold). */
export const numberOf = (decimal: Decimal): number => Number(canonical(decimal));

/** Two decimals as whole numbers of one unit. */
function aligned(a: Decimal, b: Decimal): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [a.int * pow10(scale - a.scale), b.int * pow10(scale - b.scale), scale];
}

export function compare(a: Decimal, b: Decimal): number {
  const [x, y] = aligned(a, b);
  return x < y ? -1 : x > y ? 1 : 0;
}


/** NMI-20: held within the limits — raised to `min`, lowered to `max` — where each is given. */
export function clamp(decimal: Decimal, min: Decimal | null, max: Decimal | null): Decimal {
  if (min && compare(decimal, min) < 0) return min;
  if (max && compare(decimal, max) > 0) return max;
  return decimal;
}

/** NMI-20: rounded to `digits` digits after the separator, a half away from zero. */
export function round(decimal: Decimal, digits: number): Decimal {
  if (decimal.scale <= digits) return decimal;
  const unit = pow10(decimal.scale - digits);
  const negative = decimal.int < 0n;
  const magnitude = negative ? -decimal.int : decimal.int;
  const rounded = (magnitude + unit / 2n) / unit;
  return normalise(negative ? -rounded : rounded, digits);
}

const floorDivide = (a: bigint, b: bigint) => (a >= 0n ? a / b : -((-a + b - 1n) / b));
const ceilDivide = (a: bigint, b: bigint) => -floorDivide(-a, b);

/**
 * NMI-22: the `count`th number from `from`, in `direction`, that is `base` plus a whole multiple of `amount` (which is
 * above zero) — so a number between two such numbers goes to the nearer one in that direction, and not past it, and
 * each further count is one more `amount` (NMI-23: a page key's ten steps stay on the step's grid, 42 → 62 by 2).
 */
export function stepped(from: Decimal, base: Decimal, amount: Decimal, direction: 1 | -1, count = 1): Decimal {
  const scale = Math.max(from.scale, base.scale, amount.scale);
  const unit = (decimal: Decimal) => decimal.int * pow10(scale - decimal.scale);
  const offset = unit(from) - unit(base);
  const size = unit(amount);
  const further = BigInt(Math.max(1, Math.trunc(count)) - 1);
  const multiple = direction > 0 ? floorDivide(offset, size) + 1n + further : ceilDivide(offset, size) - 1n - further;
  return normalise(unit(base) + multiple * size, scale);
}

/** How a locale writes a number: what the field writes with, and what it reads by. */
export interface NumberForm {
  /** The locale's ten digits, zero first. */
  digits: readonly string[];
  /** Its decimal separator. */
  decimal: string;
  /** Its grouping separator: read between two digits, never written. Empty where the locale has none. */
  group: string;
  /** Its minus sign, without the marks that turn it in a run of text: the field lays its number out left to right itself (NMI-39). */
  minus: string;
}

/** Characters that carry a direction and nothing else: they are no part of a number. */
const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/gu;

const forms = new Map<string, NumberForm>();

/** The form of a locale `Intl` knows (a tag `supportedLocale()` of src/primitives/locale-date.ts returned). */
export function numberForm(locale: string): NumberForm {
  let form = forms.get(locale);
  if (!form) {
    const plain = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
    const parts = new Intl.NumberFormat(locale, { useGrouping: true, minimumFractionDigits: 1 }).formatToParts(-1234567.5);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    form = {
      digits: Array.from({ length: 10 }, (_, digit) => plain.format(digit)),
      decimal: part('decimal') || '.',
      group: part('group'),
      minus: part('minusSign').replace(DIRECTION_MARKS, '') || '-',
    };
    forms.set(locale, form);
  }
  return form;
}

/**
 * NMI-17: the number in the locale's form — its digits and its decimal separator, its minus sign before a negative
 * number, at least `minDigits` and at most `maxDigits` digits after the separator with no other trailing zeros, no
 * exponent and no grouping separators: what is shown can be typed back.
 */
export function format(decimal: Decimal, form: NumberForm, minDigits: number, maxDigits: number): string {
  const { negative, whole, fraction } = digitsOf(round(decimal, maxDigits));
  const local = (digits: string) => Array.from(digits, (digit) => form.digits[Number(digit)]).join('');
  const shown = fraction.padEnd(minDigits, '0');
  // A number that rounds to zero is written without a sign.
  const signed = negative && /[1-9]/.test(whole + shown);
  return `${signed ? form.minus : ''}${local(whole)}${shown ? `${form.decimal}${local(shown)}` : ''}`;
}

/** What a text reads as (NMI-18): a number, no value (an empty text), or not a number. */
export type Reading = { kind: 'number'; value: Decimal } | { kind: 'empty' } | { kind: 'invalid' };

const EMPTY: Reading = { kind: 'empty' };
const INVALID: Reading = { kind: 'invalid' };

/** A hyphen-minus, a minus sign, and their full-width and small forms; a plus sign and its full-width form. */
const MINUS = new Set(['-', '−', '－', '﹣']);
const PLUS = new Set(['+', '＋']);

/**
 * The zeros of the scripts whose ten digits stand in a row: ASCII, full-width, and the decimal digits a person's
 * keyboard may give whatever the product's locale is (Arabic-Indic and its eastern form, Devanagari, Bengali, Gurmukhi,
 * Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam, Thai, Lao, Tibetan, Myanmar, Khmer, Mongolian). A digit is a
 * digit in every locale: reading one is no guess.
 */
const ZEROS = [0x30, 0xff10, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xed0, 0xf20, 0x1040, 0x17e0, 0x1810];

function digitOf(character: string, form: NumberForm): number {
  const own = form.digits.indexOf(character);
  if (own >= 0) return own;
  const code = character.codePointAt(0)!;
  for (const zero of ZEROS) if (code >= zero && code <= zero + 9) return code - zero;
  return -1;
}

/** A character and its full-width form are one character to a reader of numbers. */
const narrow = (character: string) => character.normalize('NFKC');

/** Without the marks of direction and without spaces — around the number or inside it. */
const squeeze = (text: string) => text.replace(DIRECTION_MARKS, '').replace(/\s+/gu, '');

/** Whether `text` begins (or, `end`, ends) with `affix`, compared as written and then without regard to case. */
function hasAffix(text: string, affix: string, end: boolean): boolean {
  if (!affix || affix.length > text.length) return false;
  const piece = end ? text.slice(text.length - affix.length) : text.slice(0, affix.length);
  return piece === affix || piece.toLowerCase() === affix.toLowerCase();
}

/**
 * NMI-18: reads a text as a number, leniently, by the locale's form.
 *
 * - Spaces, around the number and inside it, and marks of direction are ignored.
 * - A hyphen-minus or a minus sign before the digits, or a plus sign, is its sign — before or after a prefix.
 * - `prefix` before the number and `suffix` after it are ignored where they were typed or pasted with it.
 * - ASCII digits, the locale's own, full-width digits and the decimal digits of other scripts are digits.
 * - The locale's decimal separator, once, is the separator. So is a period, the separator of a plain decimal number,
 *   wherever the locale does not group with it: a period in a locale that groups with periods is a grouping separator
 *   ("1.500" is 1500 in German), and never a guess.
 * - The locale's grouping separator is ignored wherever it stands between two digits before the separator.
 * - An empty text, or one of spaces only, is no value. Anything else is not a number.
 */
export function read(text: string, form: NumberForm, affixes: { prefix?: string; suffix?: string } = {}): Reading {
  let rest = squeeze(text);
  if (!rest) return EMPTY;
  let negative = false;
  let signed = false;
  const sign = () => {
    const first = rest[0];
    if (signed || !(MINUS.has(first) || PLUS.has(first))) return;
    signed = true;
    negative = MINUS.has(first);
    rest = rest.slice(1);
  };
  sign();
  const prefix = squeeze(affixes.prefix ?? '');
  const suffix = squeeze(affixes.suffix ?? '');
  if (hasAffix(rest, prefix, false)) rest = rest.slice(prefix.length);
  sign();
  if (hasAffix(rest, suffix, true)) rest = rest.slice(0, rest.length - suffix.length);

  const group = narrow(form.group);
  const decimal = narrow(form.decimal);
  const isDecimal = (character: string) => character === form.decimal || narrow(character) === decimal || (narrow(character) === '.' && group !== '.');
  const isGroup = (character: string) => !!group && (character === form.group || narrow(character) === group || (form.group === '’' && character === "'"));
  const characters = Array.from(rest);
  let whole = '';
  let fraction = '';
  let separated = false;
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index];
    const digit = digitOf(character, form);
    if (digit >= 0) {
      if (separated) fraction += digit;
      else whole += digit;
    } else if (!separated && isGroup(character) && index > 0 && digitOf(characters[index - 1], form) >= 0 && index + 1 < characters.length && digitOf(characters[index + 1], form) >= 0) {
      // A grouping separator between two digits says nothing.
    } else if (!separated && isDecimal(character)) separated = true;
    else return INVALID;
  }
  if (!whole && !fraction) return INVALID;
  const magnitude = BigInt(whole + fraction);
  const value = normalise(negative ? -magnitude : magnitude, fraction.length);
  return Number.isFinite(numberOf(value)) ? { kind: 'number', value } : INVALID;
}
