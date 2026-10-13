// What a color field knows about colors, with no DOM in it (specs/color-field.spec.json, CLF-16, CLF-18, CLF-19,
// CLF-21, CLF-29): the one form its value takes, what a text reads as, and how a pick of the platform's picker is held.
// It is the whole of the field's notation, so it can be tested by itself, in Node.
//
// The value has ONE form: a number sign and six hexadecimal digits in lowercase, two each for red, green and blue — an
// opaque sRGB color — or the empty string for no color. Nothing else is ever a value: no alpha, no three-digit form, no
// color name, no functional notation, no other color space (CLF-16). The string is the seam for more: a later revision widens what `read()` takes and what `VALUE` matches, here and nowhere else.

/** The value's own form (CLF-16): `#` and six lowercase hexadecimal digits. */
const VALUE = /^#[0-9a-f]{6}$/;
/** What reads as a color (CLF-18): six hexadecimal digits in either case, with or without one number sign before them. */
const TYPED = /^#?([0-9a-fA-F]{6})$/;

/** What a text reads as: nothing was entered, a color (in the value's own form), or something that is not a color. */
export type Reading = { kind: 'empty' } | { kind: 'color'; value: string } | { kind: 'invalid' };

/**
 * CLF-18: reads a text. The white space before and after it is left out; what remains is a color when it is exactly
 * six hexadecimal digits in either case, with or without one number sign before them, and the color is those digits in
 * lowercase after a number sign. Nothing at all is `empty`; every other text — fewer or more digits, a three-digit
 * form, an alpha, a name, a functional notation, any other character — is `invalid`.
 *
 * It is the one rule: what is typed, what is pasted and what the product sets are all read by it.
 */
export function read(text: string): Reading {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };
  const match = TYPED.exec(trimmed);
  return match ? { kind: 'color', value: `#${match[1].toLowerCase()}` } : { kind: 'invalid' };
}

/** What a commit also reads as a color (CLI-19): three hexadecimal digits in either case, with or without a number sign. */
const SHORT = /^#?([0-9a-fA-F]{3})$/;

/**
 * CLI-19: reads a text as a commit does. The rule of `read()`, and besides it the three-digit form CSS has (#fff, fff):
 * the color whose six digits are each of the three written twice (#ffffff). Only a commit reads it: while the person
 * types, three digits are on their way to six and read as no color (CLI-18), so the swatch does not flash a color
 * that was never meant.
 */
export function readCommitted(text: string): Reading {
  const reading = read(text);
  if (reading.kind !== 'invalid') return reading;
  const match = SHORT.exec(text.trim());
  if (!match) return reading;
  return { kind: 'color', value: `#${[...match[1].toLowerCase()].map((digit) => digit + digit).join('')}` };
}

/** CLF-17: the value a text makes — the color it reads as, or the empty string while it reads as no color. */
export function valueOf(text: string): string {
  const reading = read(text);
  return reading.kind === 'color' ? reading.value : '';
}

/** CLF-16: `value` is in the value's own form — a color, or the empty string. */
export const isValue = (value: string): boolean => value === '' || VALUE.test(value);

/**
 * CLF-16: two values are the same color exactly when they are the same string, because the value has one form. (A text
 * in capitals or without its number sign is the same color as its lowercase form: compare what `valueOf()` gives.)
 */
export const sameColor = (a: string, b: string): boolean => valueOf(a) === valueOf(b);

/**
 * CLF-21: what the product set, as the field holds it. A text that reads as a color is held in the value's own form;
 * an empty one is no color; anything else — not a string, or a text that is not a color — is treated as empty, and
 * `valid` says that it was (the field reports it in a debug build).
 */
export function given(value: unknown): { value: string; valid: boolean } {
  if (value === null || value === undefined) return { value: '', valid: true };
  if (typeof value !== 'string') return { value: '', valid: false };
  const reading = read(value);
  return { value: reading.kind === 'color' ? reading.value : '', valid: reading.kind !== 'invalid' };
}

/** The three channels of a value, 0 to 255 each; null for no color. */
export function channels(value: string): [red: number, green: number, blue: number] | null {
  if (!VALUE.test(value)) return null;
  return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
}

/** A value from three channels: each is rounded and held within 0 and 255. */
export function fromChannels(red: number, green: number, blue: number): string {
  const hex = (channel: number) => {
    const whole = Number.isFinite(channel) ? Math.min(255, Math.max(0, Math.round(channel))) : 0;
    return whole.toString(16).padStart(2, '0');
  };
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

/** CLF-28: the color the platform's picker shows while the field holds none: the picker's own starting color, black. */
export const PICKER_START = '#000000';

/**
 * CLF-29: a pick of the platform's picker, as the value holds it. The platform reports an opaque sRGB color as a number
 * sign and six digits (it has converted a pick with an alpha, or one outside sRGB, already); the field reads it by its
 * own rule, so capitals are taken too. A report it cannot read is no pick: null, and nothing changes.
 */
export function picked(reported: string): string | null {
  const reading = read(reported);
  return reading.kind === 'color' ? reading.value : null;
}
