// Locale data for the pickers (DTP-37, the time picker's locale rules), from the JavaScript engine's `Intl`: Hermes
// ships `Intl.DateTimeFormat` (with `formatToParts`) and `Intl.NumberFormat`, and nothing here needs more. Every date
// is formatted as a UTC instant of a Gregorian calendar date, so no time zone and no other calendar enters. What the
// engine cannot say (`formatToParts` missing, an unknown tag) falls back to English forms, never to a crash.
// Package-internal: the date picker and the time picker read it; nothing here is a design value.

/** The tag every fallback uses: the spec's words have English defaults, so its locale data does too. */
export const FALLBACK_LOCALE = 'en-US';

const formatters = new Map<string, Intl.DateTimeFormat>();
const numbers = new Map<string, Intl.NumberFormat>();
const resolved = new Map<string, string>();

/**
 * The BCP 47 tag the pickers format with: `tag` when the engine supports it, the platform's current locale while `tag`
 * is empty, else `en-US`. Development builds report a tag the engine does not know.
 */
export function resolveLocale(tag: string | undefined, what = 'locale'): string {
  const key = tag?.trim() ?? '';
  const known = resolved.get(key);
  if (known) return known;
  let result = FALLBACK_LOCALE;
  try {
    if (key === '') result = new Intl.DateTimeFormat().resolvedOptions().locale || FALLBACK_LOCALE;
    else if (Intl.DateTimeFormat.supportedLocalesOf([key]).length > 0) result = key;
    else if (__DEV__) console.warn(`Tanrei: the ${what} "${key}" is not supported by this JavaScript engine's Intl; using "${FALLBACK_LOCALE}".`);
  } catch {
    if (__DEV__ && key) console.warn(`Tanrei: the ${what} "${key}" is not a BCP 47 language tag; using "${FALLBACK_LOCALE}".`);
  }
  resolved.set(key, result);
  return result;
}

/** A cached `Intl.DateTimeFormat` for `locale`, in UTC and the Gregorian calendar (the only calendar the pickers draw). */
export function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const full: Intl.DateTimeFormatOptions = { ...options, timeZone: 'UTC', calendar: 'gregory' } as Intl.DateTimeFormatOptions;
    try {
      formatter = new Intl.DateTimeFormat(locale, full);
    } catch {
      // An engine that rejects the calendar option (or the tag): the same options without it, then English.
      try {
        formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
      } catch {
        formatter = new Intl.DateTimeFormat(FALLBACK_LOCALE, { ...options, timeZone: 'UTC' });
      }
    }
    formatters.set(key, formatter);
  }
  return formatter;
}

/** One part of a formatted date or time, as `formatToParts` names it. */
export interface FormatPart {
  type: string;
  value: string;
}

/**
 * `formatToParts` where the engine has it. Without it, the parts are recovered from `format()` by finding the numeric
 * fields' own formatted values in the text (`numeric` names the fields that were asked for as numbers, with the values
 * they have in `date`); whatever lies between them is a literal.
 */
export function partsOf(formatter: Intl.DateTimeFormat, date: Date, numeric: Readonly<Record<string, string>> = {}): FormatPart[] {
  if (typeof formatter.formatToParts === 'function') return formatter.formatToParts(date) as FormatPart[];
  const text = formatter.format(date);
  const found = Object.entries(numeric)
    .map(([type, value]) => ({ type, value, at: text.indexOf(value) }))
    .filter((each) => each.at >= 0)
    .sort((a, b) => a.at - b.at);
  const parts: FormatPart[] = [];
  let cursor = 0;
  for (const each of found) {
    if (each.at < cursor) continue;
    if (each.at > cursor) parts.push({ type: 'literal', value: text.slice(cursor, each.at) });
    parts.push({ type: each.type, value: each.value });
    cursor = each.at + each.value.length;
  }
  if (cursor < text.length) parts.push({ type: 'literal', value: text.slice(cursor) });
  return parts;
}

function numberFormatter(locale: string): Intl.NumberFormat {
  let formatter = numbers.get(locale);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
    } catch {
      formatter = new Intl.NumberFormat(FALLBACK_LOCALE, { useGrouping: false, maximumFractionDigits: 0 });
    }
    numbers.set(locale, formatter);
  }
  return formatter;
}

/** The locale's ten digits, 0 to 9 ("0"…"9" in English, "٠"…"٩" in Arabic as Egypt writes it). */
export function localeDigits(locale: string): readonly string[] {
  const formatter = numberFormatter(locale);
  return Array.from({ length: 10 }, (_unused, digit) => formatter.format(digit));
}

/** An integer in the locale's digits, at least `minimumDigits` long ("09" for 9 at two digits). */
export function formatInteger(locale: string, value: number, minimumDigits = 1): string {
  const digits = localeDigits(locale);
  return String(Math.trunc(Math.abs(value)))
    .padStart(minimumDigits, '0')
    .replace(/[0-9]/g, (digit) => digits[Number(digit)]!);
}

/** `text` with the locale's digits written as ASCII ones (ASCII digits stay as they are). */
export function toAsciiDigits(text: string, locale: string): string {
  const digits = localeDigits(locale);
  let out = '';
  for (const char of text) {
    const own = digits.indexOf(char);
    if (own >= 0) out += String(own);
    else out += char;
  }
  return out;
}
