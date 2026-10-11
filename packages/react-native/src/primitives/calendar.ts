// Gregorian calendar dates without a time or a time zone (DTP-37), and the locale forms the date picker draws them in.
// A date is `{ year, month, day }` (month 1–12) and travels as an ISO 8601 string ("2026-09-17"), never as a `Date`
// object: a `Date` is an instant, and a time zone would move it by a day. Where a `Date` is needed to format, it is the
// UTC midnight of the date, formatted in UTC. Package-internal.
import { dateFormatter, formatInteger, partsOf, toAsciiDigits, type FormatPart } from './locale';

export interface CalendarDate {
  year: number;
  /** 1 (January) … 12. */
  month: number;
  day: number;
}

/** A displayed month. */
export interface CalendarMonth {
  year: number;
  month: number;
}

/** Sunday … Saturday, as `Date.getUTCDay()` counts them. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
export const daysInMonth = (year: number, month: number) => [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;

/** The UTC midnight of a date: what `Intl` formats (in UTC). */
export const utcOf = (date: CalendarDate) => {
  const at = new Date(Date.UTC(2000, date.month - 1, date.day));
  at.setUTCFullYear(date.year);
  return at;
};

/** A date from its parts, or null when that day does not exist (February 30). */
export function calendarDate(year: number, month: number, day: number): CalendarDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** An ISO 8601 calendar date ("2026-09-17") as a date; anything else (a time, a zone, a day that does not exist) is null. */
export function parseIsoDate(text: string | undefined | null): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export const isoOf = (date: CalendarDate) => `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

export const compareDates = (a: CalendarDate, b: CalendarDate) => a.year - b.year || a.month - b.month || a.day - b.day;
export const sameDate = (a: CalendarDate | null, b: CalendarDate | null) => a !== null && b !== null && compareDates(a, b) === 0;
export const compareMonths = (a: CalendarMonth, b: CalendarMonth) => a.year - b.year || a.month - b.month;
export const monthOf = (date: CalendarDate): CalendarMonth => ({ year: date.year, month: date.month });

/** Days since 0001-01-01 (a count, for adding days without a `Date`). */
function ordinal({ year, month, day }: CalendarDate): number {
  const y = year - 1;
  let days = y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  for (let m = 1; m < month; m += 1) days += daysInMonth(year, m);
  return days + day - 1;
}

function fromOrdinal(count: number): CalendarDate {
  let year = Math.floor(count / 365.2425) + 1;
  while (ordinal({ year, month: 1, day: 1 }) > count) year -= 1;
  while (ordinal({ year: year + 1, month: 1, day: 1 }) <= count) year += 1;
  let rest = count - ordinal({ year, month: 1, day: 1 });
  let month = 1;
  while (rest >= daysInMonth(year, month)) {
    rest -= daysInMonth(year, month);
    month += 1;
  }
  return { year, month, day: rest + 1 };
}

export const addDays = (date: CalendarDate, days: number): CalendarDate => fromOrdinal(ordinal(date) + days);

/** The month `months` after `of`. */
export function addMonthsTo(of: CalendarMonth, months: number): CalendarMonth {
  const index = of.year * 12 + (of.month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** The same day number `months` later, the last day of that month when it is shorter (DTP-18, DTP-20). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const target = addMonthsTo(date, months);
  return { ...target, day: Math.min(date.day, daysInMonth(target.year, target.month)) };
}

/** 0 = Sunday. 0001-01-01 was a Monday. */
export const weekdayOf = (date: CalendarDate): Weekday => ((ordinal(date) + 1) % 7) as Weekday;

export const clampDate = (date: CalendarDate, min: CalendarDate | null, max: CalendarDate | null): CalendarDate => {
  if (min && compareDates(date, min) < 0) return min;
  if (max && compareDates(date, max) > 0) return max;
  return date;
};

export const clampMonth = (month: CalendarMonth, min: CalendarDate | null, max: CalendarDate | null): CalendarMonth => {
  if (min && compareMonths(month, min) < 0) return monthOf(min);
  if (max && compareMonths(month, max) > 0) return monthOf(max);
  return month;
};

/**
 * The 42 cells of a month (DTP-11): six rows of seven from `firstDay`; the first day of the month sits in its
 * weekday's column, cells before it and after the month's last day are null. Six rows always, so the grid keeps its
 * height.
 */
export function monthGrid(month: CalendarMonth, firstDay: Weekday): (CalendarDate | null)[] {
  const lead = (weekdayOf({ ...month, day: 1 }) - firstDay + 7) % 7;
  const length = daysInMonth(month.year, month.month);
  return Array.from({ length: 42 }, (_unused, index) => {
    const day = index - lead + 1;
    return day >= 1 && day <= length ? { ...month, day } : null;
  });
}

/** The weekdays in column order from `firstDay`. */
export const weekdayColumns = (firstDay: Weekday): Weekday[] => Array.from({ length: 7 }, (_unused, index) => ((firstDay + index) % 7) as Weekday);

// ---------------------------------------------------------------------------------------------------------------
// The first day of the week (DTP-37): CLDR's weekData `firstDay`, embedded because Hermes has no `Intl.Locale` week
// information. Regions not listed start on Monday (CLDR's "001").

const FIRST_DAY_BY_REGION: Readonly<Record<string, Weekday>> = (() => {
  const table: Record<string, Weekday> = {};
  const sunday = 'AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW';
  const saturday = 'AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY';
  for (const region of sunday.split(' ')) table[region] = 0;
  for (const region of saturday.split(' ')) table[region] = 6;
  table.MV = 5;
  return table;
})();

/** The region a language is most often written in, for a tag without one (CLDR's likely subtags, the common languages). */
const LIKELY_REGION: Readonly<Record<string, string>> = {
  en: 'US', ja: 'JP', zh: 'CN', ko: 'KR', ar: 'EG', he: 'IL', iw: 'IL', fa: 'IR', hi: 'IN', bn: 'BD', th: 'TH', id: 'ID', ms: 'MY', vi: 'VN',
  pt: 'BR', es: 'ES', fr: 'FR', de: 'DE', it: 'IT', nl: 'NL', ru: 'RU', uk: 'UA', pl: 'PL', tr: 'TR', sv: 'SE', da: 'DK', nb: 'NO', fi: 'FI',
  cs: 'CZ', el: 'GR', hu: 'HU', ro: 'RO', ur: 'PK', am: 'ET', my: 'MM', km: 'KH', lo: 'LA', ne: 'NP', fil: 'PH', sw: 'KE', zu: 'ZA', af: 'ZA',
};

/** The region subtag of a BCP 47 tag (a two-letter or three-digit subtag after the language and script), else the likely one. */
export function regionOf(locale: string): string | null {
  const subtags = locale.split(/[-_]/);
  for (const subtag of subtags.slice(1)) {
    if (subtag.length === 1) break; // an extension begins
    if (/^[A-Za-z]{2}$/.test(subtag) || /^\d{3}$/.test(subtag)) return subtag.toUpperCase();
  }
  return LIKELY_REGION[subtags[0]!.toLowerCase()] ?? null;
}

/** The locale's first day of the week, from CLDR's weekData. */
export function localeFirstDay(locale: string): Weekday {
  const region = regionOf(locale);
  return region !== null ? FIRST_DAY_BY_REGION[region] ?? 1 : 1;
}

// ---------------------------------------------------------------------------------------------------------------
// Locale forms (DTP-12, DTP-13, DTP-15, DTP-23, DTP-25, DTP-26, DTP-36)

/** A week whose Sunday is 2026-09-13: any week gives the weekday names. */
const SUNDAY: CalendarDate = { year: 2026, month: 9, day: 13 };

/** The weekdays' narrow names ("S", "M" in English; "日", "月" in Japanese), Sunday first. */
export const narrowWeekdays = (locale: string) => Array.from({ length: 7 }, (_unused, index) => dateFormatter(locale, { weekday: 'narrow' }).format(utcOf(addDays(SUNDAY, index))));
/** The weekdays' full names ("Sunday"), Sunday first: the column headers' names. */
export const longWeekdays = (locale: string) => Array.from({ length: 7 }, (_unused, index) => dateFormatter(locale, { weekday: 'long' }).format(utcOf(addDays(SUNDAY, index))));

/** The month and year in the locale's form ("September 2026", "2026年9月"). */
export const monthYearText = (locale: string, month: CalendarMonth) => dateFormatter(locale, { year: 'numeric', month: 'long' }).format(utcOf({ ...month, day: 1 }));

/** The full date ("Thursday, September 17, 2026"): a day's accessible name. */
export const fullDateText = (locale: string, date: CalendarDate) => dateFormatter(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(utcOf(date));

/** A header's date: the abbreviated weekday, month and day ("Thu, Sep 17"), with the year when it is not `currentYear`. */
export const headerDateText = (locale: string, date: CalendarDate, currentYear: number) =>
  dateFormatter(locale, date.year === currentYear ? { weekday: 'short', month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(utcOf(date));

/** A header's range end: the abbreviated month and day ("Sep 10"), with the year when it is not `currentYear`. */
export const headerRangeText = (locale: string, date: CalendarDate, currentYear: number) =>
  dateFormatter(locale, date.year === currentYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(utcOf(date));

/** A day number or a year in the locale's digits. */
export const numberText = (locale: string, value: number) => formatInteger(locale, value);

/** A probe whose year, month and day are told apart by their values: 2033-11-22. */
const PROBE: CalendarDate = { year: 2033, month: 11, day: 22 };

/**
 * The locale's numeric date as parts (DTP-25): its year, month and day fields in the locale's order and the literals
 * between them ("09/17/2026" in en-US: month, "/", day, "/", year; "2026/09/17" in ja-JP; "17.09.2026" in de-DE).
 */
export function numericDateParts(locale: string): FormatPart[] {
  const formatter = dateFormatter(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const numeric = { year: formatInteger(locale, PROBE.year, 4), month: formatInteger(locale, PROBE.month, 2), day: formatInteger(locale, PROBE.day, 2) };
  const parts = partsOf(formatter, utcOf(PROBE), numeric).filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day' || part.type === 'literal');
  const fields = parts.filter((part) => part.type !== 'literal').map((part) => part.type);
  // Three fields, each once: anything else (an engine's surprise) is the English form.
  if (fields.length !== 3 || new Set(fields).size !== 3) {
    return [
      { type: 'month', value: '' },
      { type: 'literal', value: '/' },
      { type: 'day', value: '' },
      { type: 'literal', value: '/' },
      { type: 'year', value: '' },
    ];
  }
  return parts;
}

/** The order of the numeric date's fields. */
export const numericDateOrder = (locale: string) => numericDateParts(locale).flatMap((part) => (part.type === 'literal' ? [] : [part.type as 'year' | 'month' | 'day']));

/** The field placeholder (DTP-25): the pattern written with yyyy, mm and dd in the locale's order ("mm/dd/yyyy"). */
export function numericDatePattern(locale: string): string {
  const letters = { year: 'yyyy', month: 'mm', day: 'dd' } as Record<string, string>;
  return numericDateParts(locale)
    .map((part) => (part.type === 'literal' ? part.value : letters[part.type]))
    .join('');
}

/** A date in the locale's numeric form with a two-digit day and month and a four-digit year (DTP-26: "09/17/2026"). */
export function numericDateText(locale: string, date: CalendarDate): string {
  const values = { year: formatInteger(locale, date.year, 4), month: formatInteger(locale, date.month, 2), day: formatInteger(locale, date.day, 2) } as Record<string, string>;
  return numericDateParts(locale)
    .map((part) => (part.type === 'literal' ? part.value : values[part.type]))
    .join('');
}

/**
 * Reads a field's text as a date (DTP-26): exactly three groups of digits (ASCII or the locale's), separated by one or
 * more other characters, in the order of the locale's numeric form, with a four-digit year and a month and day that
 * exist in that year; leading zeros optional. Anything else is null.
 */
export function parseNumericDate(locale: string, text: string): CalendarDate | null {
  const ascii = toAsciiDigits(text, locale);
  const groups = ascii.match(/[0-9]+/g) ?? [];
  if (groups.length !== 3) return null;
  const order = numericDateOrder(locale);
  const values: Record<string, string> = {};
  order.forEach((field, index) => {
    values[field] = groups[index]!;
  });
  const { year, month, day } = values as { year: string; month: string; day: string };
  if (year.length !== 4 || month.length > 2 || day.length > 2) return null;
  return calendarDate(Number(year), Number(month), Number(day));
}

/** The device's current date in its own time zone (DTP-37: `today` empty). */
export function deviceToday(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
