// Dates and times in the locale's forms (TXF-28 … TXF-31, CAL-24, DTM-38). Everything here is pure: the locale comes in
// as a BCP 47 tag, a value as its ISO 8601 text or as parts (src/primitives/calendar-date.ts), and the calendar is the
// Gregorian calendar in every locale. The text field draws its row of segments and reads pasted dates with it; <tanrei-calendar> and
// <tanrei-date-time-picker> take their names, digits, date and time forms, first day of the week and clock from it.
// Every name, digit and form comes from `Intl`; the one table here is CLDR's weekData, for the browsers without
// `Intl.Locale`'s week information (CAL-24).
import { type CalendarDate, type CalendarMonth, type ClockTime, type HourCycle, type Weekday, addDays, daysInMonth, shownHour12 } from './calendar-date.js';

/** What a date, time or date-time value is (TXF-28). */
export type DateKind = 'date' | 'time' | 'date-time';
export const DATE_KINDS: ReadonlySet<string> = new Set<DateKind>(['date', 'time', 'date-time']);

/** The locale every fallback uses. */
export const FALLBACK_LOCALE = 'en-US';

/** `tag` when the browser's `Intl` knows it, otherwise null. */
export function supportedLocale(tag: string): string | null {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0 ? tag : null;
  } catch {
    return null;
  }
}

/** The nearest `lang` attribute around `element` (through shadow roots), else the browser's language, else English. */
export function ambientLocale(element: Element): string {
  let tag = '';
  for (let at: Node | null = element; at && !tag; ) {
    if (at instanceof Element && at.hasAttribute('lang')) tag = at.getAttribute('lang')!.trim();
    const root: Node = at.getRootNode();
    at = at instanceof Element && at.parentElement ? at.parentElement : root instanceof ShadowRoot ? root.host : null;
  }
  tag ||= (typeof navigator !== 'undefined' && navigator.language) || FALLBACK_LOCALE;
  return supportedLocale(tag) ?? FALLBACK_LOCALE;
}

/** The scripts written right to left, for engines whose `Intl.Locale` has no text information. */
const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mand', 'Samr']);
type TextInfoLocale = Intl.Locale & { getTextInfo?: () => { direction?: string }; textInfo?: { direction?: string } };

/** The direction the locale writes in: its text is laid out in it (TXF-24). */
export function localeDirection(locale: string): 'ltr' | 'rtl' {
  try {
    const tag = new Intl.Locale(locale) as TextInfoLocale;
    const info = typeof tag.getTextInfo === 'function' ? tag.getTextInfo() : tag.textInfo;
    if (info?.direction === 'rtl' || info?.direction === 'ltr') return info.direction;
    const script = tag.maximize().script;
    return script && RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

// ── ISO 8601 values ─────────────────────────────────────────────────────────────────────────────────────────────

interface DateParts {
  year: number;
  month: number;
  day: number;
}
interface TimeParts {
  hour: number;
  minute: number;
}

const validDate = (year: number, month: number, day: number): DateParts | null =>
  year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month) ? { year, month, day } : null;
const two = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: DateParts) => `${String(d.year).padStart(4, '0')}-${two(d.month)}-${two(d.day)}`;
const isoTime = (t: TimeParts) => `${two(t.hour)}:${two(t.minute)}`;

function parseIsoDate(text: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? validDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}
function parseIsoTime(text: string): TimeParts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

/**
 * `text` when it is the ISO 8601 form of `kind` — a calendar date (2026-09-27), hours and minutes on the 24-hour clock
 * (14:30), or both joined by T (2026-09-27T14:30), with no time zone — otherwise null (TXF-31).
 */
export function isoValue(kind: DateKind, text: string): string | null {
  if (kind === 'date') return parseIsoDate(text) ? text : null;
  if (kind === 'time') return parseIsoTime(text) ? text : null;
  const [date, time, ...rest] = text.split('T');
  return !rest.length && time !== undefined && parseIsoDate(date) && parseIsoTime(time) ? text : null;
}

/** Whether an ISO value lies between `min` and `max` (each ISO or empty for no limit): the fixed-width forms compare as text. */
export const withinRange = (value: string, min: string, max: string) => (!min || value >= min) && (!max || value <= max);

// ── The locale's numeric form ────────────────────────────────────────────────────────────────────────────────────

const formatters = new Map<string, Intl.DateTimeFormat>();
/** A cached formatter for `locale`, in UTC and the Gregorian calendar. */
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC', calendar: 'gregory' });
    formatters.set(key, format);
  }
  return format;
}

function utc(date: DateParts, time: TimeParts = { hour: 0, minute: 0 }): Date {
  const at = new Date(Date.UTC(2000, date.month - 1, date.day, time.hour, time.minute));
  at.setUTCFullYear(date.year);
  return at;
}

const digitsCache = new Map<string, readonly string[]>();
/** The locale's ten digits ("0"…"9"; "٠"…"٩" in Arabic as Egypt writes it). */
export function localeDigits(locale: string): readonly string[] {
  let digits = digitsCache.get(locale);
  if (!digits) {
    const format = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 });
    digits = Array.from({ length: 10 }, (_, digit) => format.format(digit));
    digitsCache.set(locale, digits);
  }
  return digits;
}
const localeNumber = (locale: string, value: number, width: number) => {
  const digits = localeDigits(locale);
  return String(value).padStart(width, '0').replace(/[0-9]/g, (d) => digits[Number(d)]);
};
/** An integer in the locale's digits, at least `minimumDigits` long ("09" for 9 at two digits). */
export const numberText = (locale: string, value: number, minimumDigits = 1) => localeNumber(locale, Math.trunc(Math.abs(value)), minimumDigits);

/** `text` with the locale's digits written as ASCII ones. */
export function asciiDigits(locale: string, text: string): string {
  const digits = localeDigits(locale);
  let out = '';
  for (const char of text) {
    const own = digits.indexOf(char);
    out += own >= 0 ? String(own) : char;
  }
  return out;
}

/**
 * The narrow no-break space that recent CLDR puts before a day period ("2:30 PM") is written as a plain space: the text
 * is one the person edits, and a character they cannot type or see would stay in it.
 */
const plainSpaces = (text: string) => text.replace(/ /g, ' ');

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

/** A date's fields in the locale's order and the literals between them, from `formatToParts` (English's form when an engine surprises). */
function dateParts(locale: string): Intl.DateTimeFormatPart[] {
  const parts = formatter(locale, DATE_OPTIONS)
    .formatToParts(utc({ year: 2033, month: 11, day: 22 }))
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day' || part.type === 'literal');
  const fields = parts.filter((part) => part.type !== 'literal').map((part) => part.type);
  if (fields.length === 3 && new Set(fields).size === 3) return parts;
  return [
    { type: 'month', value: '' },
    { type: 'literal', value: '/' },
    { type: 'day', value: '' },
    { type: 'literal', value: '/' },
    { type: 'year', value: '' },
  ];
}

/** The date's fields written in the locale's digits, a four-digit year and a two-digit month and day. */
const dateField = (locale: string, date: DateParts, type: string): string | null =>
  type === 'year' ? localeNumber(locale, date.year, 4) : type === 'month' ? localeNumber(locale, date.month, 2) : type === 'day' ? localeNumber(locale, date.day, 2) : null;

/**
 * An ISO value in the locale's numeric form (TXF-28): "09/27/2026", "2026/09/27", "27.09.2026"; "2:30 PM", "14:30";
 * "09/27/2026, 2:30 PM" — with a four-digit year and a two-digit month and day, the locale's clock and digits. An
 * empty or malformed value is the empty text.
 */
export function formatValue(locale: string, kind: DateKind, value: string): string {
  if (!isoValue(kind, value)) return '';
  if (kind === 'date') {
    const date = parseIsoDate(value)!;
    return dateParts(locale)
      .map((part) => dateField(locale, date, part.type) ?? part.value)
      .join('');
  }
  if (kind === 'time') {
    const time = parseIsoTime(value)!;
    return plainSpaces(formatter(locale, TIME_OPTIONS).format(utc({ year: 2000, month: 1, day: 1 }, time)));
  }
  const [dateText, timeText] = value.split('T');
  const date = parseIsoDate(dateText)!;
  const time = parseIsoTime(timeText)!;
  return plainSpaces(
    formatter(locale, { ...DATE_OPTIONS, ...TIME_OPTIONS })
      .formatToParts(utc(date, time))
      .map((part) => dateField(locale, date, part.type) ?? part.value)
      .join(''),
  );
}

/**
 * The placeholder of an empty field (TXF-28): the date pattern written with yyyy, mm and dd in the locale's order and with
 * its separators ("mm/dd/yyyy"), hh:mm for a time, and the two joined by a space for a date-time.
 */
export function valuePattern(locale: string, kind: DateKind): string {
  const letters: Record<string, string> = { year: 'yyyy', month: 'mm', day: 'dd' };
  const date = dateParts(locale)
    .map((part) => letters[part.type] ?? part.value)
    .join('');
  return kind === 'date' ? date : kind === 'time' ? 'hh:mm' : `${date} hh:mm`;
}

// ── The row of segments (TXF-42, TXF-47) ─────────────────────────────────────────────────────────────────────────

/** One unit of a date or a time that a segment holds (TXF-42). */
export type SegmentUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'period';
/** A piece of the row a date, time or date-time is drawn as: a unit's segment, or the text between two of them. */
export type RowPart = { unit: SegmentUnit; literal?: undefined } | { literal: string; unit?: undefined };

const UNIT_OF: Readonly<Record<string, SegmentUnit>> = { year: 'year', month: 'month', day: 'day', hour: 'hour', minute: 'minute', dayPeriod: 'period' };
/** The marks an engine writes into a format to steer its direction: the row is one left-to-right run without them (TXF-42). */
const BIDI_MARKS = /[‎‏؜]/g;

const rowCache = new Map<string, readonly RowPart[]>();
/**
 * The row of a `kind` in the locale's numeric form (TXF-42): its units in the locale's order and the text between them
 * — month, day, year with "/" in en-US; year, month, day in ja-JP; hour, minute and, on a 12-hour clock, the day
 * period where the locale writes it; a date-time's date, the text the locale joins them with, then its time. The text
 * has plain spaces and no direction marks. Text before the first unit or after the last ("2026. 09. 27.") stays.
 */
export function valueRow(locale: string, kind: DateKind): readonly RowPart[] {
  const key = `${locale}|${kind}`;
  let row = rowCache.get(key);
  if (!row) {
    const cycle = localeHourCycle(locale);
    const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hourCycle: cycle };
    const options = kind === 'date' ? DATE_OPTIONS : kind === 'time' ? time : { ...DATE_OPTIONS, ...time };
    const parts = kind === 'date' ? dateParts(locale) : formatter(locale, options).formatToParts(utc({ year: 2033, month: 11, day: 22 }, { hour: 15, minute: 45 }));
    const out: RowPart[] = [];
    for (const part of parts) {
      const unit = UNIT_OF[part.type];
      // A 24-hour clock has no period, whatever the format says.
      if (unit && !(unit === 'period' && cycle !== 'h12')) out.push({ unit });
      else if (part.type === 'literal') {
        const literal = plainSpaces(part.value).replace(BIDI_MARKS, '');
        const last = out[out.length - 1];
        if (!literal) continue;
        if (last && last.literal !== undefined) out[out.length - 1] = { literal: last.literal + literal };
        else out.push({ literal });
      }
    }
    const wanted: SegmentUnit[] = kind === 'date' ? ['year', 'month', 'day'] : kind === 'time' ? ['hour', 'minute'] : ['year', 'month', 'day', 'hour', 'minute'];
    const units = out.flatMap((part) => (part.unit ? [part.unit] : []));
    // An engine that surprises (a unit missing or twice): English's form.
    row = wanted.every((unit) => units.filter((u) => u === unit).length === 1) ? out : locale === FALLBACK_LOCALE ? out : valueRow(FALLBACK_LOCALE, kind);
    rowCache.set(key, row);
  }
  return row;
}

const unitNames = new Map<string, string>();
/**
 * The locale's own name for a unit ("year", "month", "AM/PM"; "年", "月", "午前/午後"): a segment's accessible name
 * (TXF-47), and the hour's, the minute's and the period's in a picker (DTM-48). It is the platform's locale data and
 * nothing else: an engine without the names of date and time fields gives the empty string, and no
 * language's names stand in.
 */
export function unitName(locale: string, unit: SegmentUnit): string {
  const key = `${locale}|${unit}`;
  let name = unitNames.get(key);
  if (name === undefined) {
    try {
      const names = new (Intl as unknown as { DisplayNames: new (locale: string, options: { type: string }) => { of(code: string): string | undefined } }).DisplayNames(locale, { type: 'dateTimeField' });
      name = names.of(unit === 'period' ? 'dayPeriod' : unit) ?? '';
    } catch {
      name = '';
    }
    unitNames.set(key, name);
  }
  return name;
}

const todayNames = new Map<string, string>();
/**
 * The locale's own word for the present day ("today", "今日", "aujourd’hui"): what a calendar and a picker say of the
 * current year where the product gave no word (CAL-35, DTM-48). The platform's locale data — the relative form of
 * "in 0 days" — and nothing else: empty where an engine has none.
 */
export function todayName(locale: string): string {
  let name = todayNames.get(locale);
  if (name === undefined) {
    try {
      name = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day');
      // An engine that has no word writes the number ("in 0 days"): that is a phrase built from locale data, not the word.
      if (/\p{Nd}/u.test(name)) name = '';
    } catch {
      name = '';
    }
    todayNames.set(locale, name);
  }
  return name;
}

/** A month's name in the locale ("September", "9月"): part of the month segment's value text (TXF-47). */
export const monthName = (locale: string, month: number) => formatter(locale, { month: 'long' }).format(utc({ year: 2026, month, day: 1 }));

/** A year with four digits, in the locale's digits ("2026", "0987"). */
export const yearText = (locale: string, year: number) => localeNumber(locale, year, 4);

// ── Reading typed text (TXF-29) ──────────────────────────────────────────────────────────────────────────────────

/** Three groups of digits in the locale's order — or year, month, day when the first has four digits. */
function readDate(locale: string, text: string): DateParts | null {
  const groups = text.match(/[0-9]+/g) ?? [];
  if (groups.length !== 3) return null;
  const order = groups[0].length === 4 ? ['year', 'month', 'day'] : dateParts(locale).flatMap((part) => (part.type === 'literal' ? [] : [part.type]));
  const values: Record<string, string> = {};
  order.forEach((field, index) => (values[field] = groups[index]));
  const { year = '', month = '', day = '' } = values;
  if (year.length !== 4 || month.length > 2 || day.length > 2) return null;
  return validDate(Number(year), Number(month), Number(day));
}

const periodCache = new Map<string, { am: string[]; pm: string[] }>();
/** A day period as compared: lower case, without spaces or dots ("a. m." → "am"). */
const periodKey = (text: string) => text.toLocaleLowerCase().replace(/[\s.]/g, '');
/** The locale's names for the morning and the afternoon, and a, p, am and pm in every locale. */
function dayPeriods(locale: string): { am: string[]; pm: string[] } {
  let periods = periodCache.get(locale);
  if (!periods) {
    const name = (hour: number) =>
      formatter(locale, { hour: 'numeric', hour12: true })
        .formatToParts(utc({ year: 2000, month: 1, day: 1 }, { hour, minute: 0 }))
        .find((part) => part.type === 'dayPeriod')?.value;
    const [am, pm] = [name(1), name(13)].map((n) => (n ? periodKey(n) : ''));
    periods = { am: ['a', 'am', ...(am ? [am] : [])], pm: ['p', 'pm', ...(pm ? [pm] : [])] };
    periodCache.set(locale, periods);
  }
  return periods;
}

/**
 * An hour and minutes as two groups of digits separated by other characters: the hour 0–23, or 1–12 when a day period
 * comes before or after them ("2:30 pm", "午後2:30", "14:30", "12:05 AM" → 00:05).
 */
function readTime(locale: string, text: string): TimeParts | null {
  const match = /^([^0-9]*)([0-9]{1,2})([^0-9]+)([0-9]{1,2})([^0-9]*)$/s.exec(text);
  if (!match) return null;
  const [before, after] = [periodKey(match[1]), periodKey(match[5])];
  if (before && after) return null;
  const word = before || after;
  const periods = dayPeriods(locale);
  const period = !word ? null : periods.am.includes(word) ? 'am' : periods.pm.includes(word) ? 'pm' : undefined;
  if (period === undefined) return null;
  const [hour, minute] = [Number(match[2]), Number(match[4])];
  if (minute > 59) return null;
  if (!period) return hour <= 23 ? { hour, minute } : null;
  if (hour < 1 || hour > 12) return null;
  return { hour: (hour % 12) + (period === 'pm' ? 12 : 0), minute };
}

/**
 * What typed text reads as (TXF-29), as an ISO value, or null: a date, a time, or a date and then a time separated by
 * white space, a comma or T. The locale's digits read as ASCII ones; a two-digit year is not read.
 */
export function readText(locale: string, kind: DateKind, typed: string): string | null {
  const text = asciiDigits(locale, typed);
  if (kind === 'date') {
    const date = readDate(locale, text);
    return date ? isoDate(date) : null;
  }
  if (kind === 'time') {
    const time = readTime(locale, text);
    return time ? isoTime(time) : null;
  }
  const runs = [...text.matchAll(/[0-9]+/g)];
  if (runs.length !== 5) return null;
  const dateEnd = runs[2].index! + runs[2][0].length;
  const between = text.slice(dateEnd, runs[3].index);
  // The date's own trailing literal ("2026. 09. 27.") may come first; then white space, a comma or a T.
  const separator = /[\s,]+|T/i.exec(between);
  if (!separator || /[\p{L}\p{N}]/u.test(between.slice(0, separator.index))) return null;
  const date = readDate(locale, text.slice(0, dateEnd));
  const time = readTime(locale, between.slice(separator.index + separator[0].length) + text.slice(runs[3].index));
  return date && time ? `${isoDate(date)}T${isoTime(time)}` : null;
}

// ── The calendar's locale (CAL-4, CAL-6, CAL-23, CAL-24) ────────────────────────────────────────────────────────

/**
 * CLDR's weekData `firstDay` by region, for the browsers whose `Intl.Locale` has no week information (Firefox). Regions
 * not listed start on Monday (CLDR's "001").
 */
const FIRST_DAY_BY_REGION: Readonly<Record<string, Weekday>> = (() => {
  const table: Record<string, Weekday> = {};
  const sunday =
    'AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW';
  const saturday = 'AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY';
  for (const region of sunday.split(' ')) table[region] = 0;
  for (const region of saturday.split(' ')) table[region] = 6;
  table.MV = 5;
  return table;
})();

type WeekInfoLocale = Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };

/**
 * The locale's first day of the week (CAL-24): `Intl.Locale`'s week information where the browser has it (it honours a
 * `-u-fw-` extension), otherwise CLDR's weekData for the locale's region — the region `Intl.Locale.maximize()` gives a
 * tag without one.
 */
export function localeFirstDay(locale: string): Weekday {
  try {
    const tag = new Intl.Locale(locale) as WeekInfoLocale;
    const info = typeof tag.getWeekInfo === 'function' ? tag.getWeekInfo() : tag.weekInfo;
    if (info && Number.isInteger(info.firstDay)) return (info.firstDay % 7) as Weekday;
    const region = tag.region ?? tag.maximize().region;
    return region ? (FIRST_DAY_BY_REGION[region] ?? 1) : 1;
  } catch {
    return 0;
  }
}

/** A week whose Sunday is 2026-09-13: any week gives the weekday names. */
const SUNDAY: CalendarDate = { year: 2026, month: 9, day: 13 };

/** The weekdays' narrow names ("S", "M" in English; "日", "月" in Japanese), Sunday first (CAL-4). */
export const narrowWeekdays = (locale: string) => Array.from({ length: 7 }, (_, i) => formatter(locale, { weekday: 'narrow' }).format(utc(addDays(SUNDAY, i))));
/** The weekdays' full names ("Sunday"), Sunday first: the column headers' names (CAL-4). */
export const longWeekdays = (locale: string) => Array.from({ length: 7 }, (_, i) => formatter(locale, { weekday: 'long' }).format(utc(addDays(SUNDAY, i))));

/** The month and year in the locale's form ("September 2026", "2026年9月"): the view toggle and the grid's name (CAL-6). */
export const monthYearText = (locale: string, month: CalendarMonth) => formatter(locale, { year: 'numeric', month: 'long' }).format(utc({ ...month, day: 1 }));

/** The full date ("Thursday, September 17, 2026"): a day's accessible name (CAL-23). */
export const fullDateText = (locale: string, date: CalendarDate) => formatter(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(utc(date));

// ── The clock's locale (DTM-14, DTM-16, DTM-18, DTM-21, DTM-38) ───────────────────────────────────────────────────

const ON_A_DAY: DateParts = { year: 2026, month: 1, day: 5 };

/** The hour and the minute of a time in `cycle`, as `formatToParts` gives them (`hourCycle` alone: `hour12` would pick 0–11 in Japanese). */
const timeParts = (locale: string, cycle: HourCycle, time: ClockTime) => formatter(locale, { hour: 'numeric', minute: '2-digit', hourCycle: cycle }).formatToParts(utc(ON_A_DAY, time));

/**
 * The locale's preferred clock (DTM-16): `resolvedOptions().hourCycle` of an hour format, a locale that counts 0 to 11
 * taken as h12 and one that counts 1 to 24 as h23. The web does not report a device-wide 12/24-hour choice, so the
 * locale alone decides.
 */
export function localeHourCycle(locale: string): HourCycle {
  const options = formatter(locale, { hour: 'numeric' }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string };
  if (options.hourCycle === 'h23' || options.hourCycle === 'h24') return 'h23';
  return clockFor(locale, options.hourCycle === 'h11' || options.hourCycle === 'h12' || options.hour12 ? 'h12' : 'h23');
}

/**
 * The clock a locale can draw: a 12-hour clock needs the names of its two periods, which are the platform's locale
 * data and nobody else's — a locale without them draws the 24-hour clock, whatever was asked.
 */
export const clockFor = (locale: string, cycle: HourCycle): HourCycle => (cycle === 'h12' && periodNames(locale).some((name) => !name) ? 'h23' : cycle);

/**
 * An hour as the locale writes an hour of the clock in use (DTM-18, DTM-21): "7" in en-US with h12, "07" with h23 — the
 * hour part of the locale's own hour-and-minute format, in its digits.
 */
export function hourText(locale: string, cycle: HourCycle, hour: number): string {
  const shown = cycle === 'h12' ? shownHour12(hour) : hour;
  const part = timeParts(locale, cycle, { hour, minute: 5 }).find((each) => each.type === 'hour')?.value;
  // A format that writes the hour in other digits than a number's (or not at all) is not trusted: the number is.
  if (part && Number(asciiDigits(locale, part)) === shown) return part;
  return localeNumber(locale, shown, cycle === 'h23' ? 2 : 1);
}

/** A minute with two digits, in the locale's digits. */
export const minuteText = (locale: string, minute: number) => localeNumber(locale, minute, 2);

/** The locale's separator between hours and minutes (":" in most). */
export function timeSeparator(locale: string): string {
  const parts = timeParts(locale, 'h23', { hour: 7, minute: 5 });
  const hour = parts.findIndex((part) => part.type === 'hour');
  const minute = parts.findIndex((part) => part.type === 'minute');
  const between =
    hour >= 0 && minute > hour
      ? parts
          .slice(hour + 1, minute)
          .map((part) => part.value)
          .join('')
      : '';
  return between.trim() || ':';
}

/**
 * The locale's names of the periods, before and after noon ("AM" and "PM"; "午前" and "午後") (DTM-14) — the platform's
 * locale data; empty where it has none, and then the clock is the 24-hour one (`clockFor()`).
 */
export function periodNames(locale: string): [string, string] {
  const name = (hour: number) => timeParts(locale, 'h12', { hour, minute: 5 }).find((part) => part.type === 'dayPeriod')?.value;
  return [name(7) ?? '', name(19) ?? ''];
}

/**
 * Where the locale's 12-hour pattern writes the period: `before` the hour ("午後7:30") or `after` the minutes ("7:30 PM"),
 * from the order of the `dayPeriod` part — what an hour's spoken value follows (DTM-20).
 */
export function periodPlace(locale: string): 'before' | 'after' {
  const parts = timeParts(locale, 'h12', { hour: 7, minute: 5 });
  const period = parts.findIndex((part) => part.type === 'dayPeriod');
  const hour = parts.findIndex((part) => part.type === 'hour');
  return period >= 0 && hour >= 0 && period < hour ? 'before' : 'after';
}

/** A time as the locale writes it in the clock in use ("7:30 PM", "19:30", "午後7:30"), with plain spaces (DTM-15). */
export const timeText = (locale: string, cycle: HourCycle, time: ClockTime) => plainSpaces(formatter(locale, { hour: 'numeric', minute: '2-digit', hourCycle: cycle }).format(utc(ON_A_DAY, time)));

/** A date and a time on which the numeric form of every locale shows its own join. */
const JOINED: [DateParts, ClockTime] = [{ year: 2026, month: 9, day: 17 }, { hour: 19, minute: 30 }];
const joins = new Map<string, string | null>();

/**
 * What the locale puts between a date and a time (", " in English, " " in Japanese), read from its plain numeric form —
 * the whole text less the date at its start and the time at its end. The numeric form is asked because every engine
 * agrees on it: for a date with a month's name one engine joins with a word ("Sep 17 at 7:30 PM") where another writes
 * the comma, and the header would read differently from browser to browser (DTM-10). `null` where the locale does not
 * write the date first and the time last, or the engine's parts do not add up: the caller keeps the engine's own text.
 */
function dateTimeJoin(locale: string, cycle: HourCycle): string | null {
  const key = `${locale}|${cycle}`;
  const known = joins.get(key);
  if (known !== undefined) return known;
  const day: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const clock: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hourCycle: cycle };
  const at = utc(...JOINED);
  const [whole, date, time] = [{ ...day, ...clock }, day, clock].map((options) => plainSpaces(formatter(locale, options).format(at)));
  const fits = whole.length > date.length + time.length && whole.startsWith(date) && whole.endsWith(time);
  const join = fits ? whole.slice(date.length, whole.length - time.length) : null;
  // A join with a letter in it is a word, which belongs to one form of the date and not to every one.
  const found = join !== null && !/\p{L}/u.test(join) ? join : null;
  joins.set(key, found);
  return found;
}

/**
 * A date in the picker's header (DTM-10): the abbreviated weekday, month and day ("Thu, Sep 17", "9月17日(木)") — or, for
 * a range's end, the abbreviated month and day ("Sep 10") — with the year when it is not `currentYear`, and with the time
 * in the clock in use when one is given ("Thu, Sep 17, 7:30 PM"): the date as the locale writes it, the locale's join
 * and the time as the locale writes it (`timeText`), put together here so that every engine draws the same text.
 */
export function headerDateText(locale: string, date: CalendarDate, currentYear: number, { weekday = true, time = null as ClockTime | null, cycle = 'h12' as HourCycle } = {}): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', ...(weekday ? { weekday: 'short' } : {}), ...(date.year === currentYear ? {} : { year: 'numeric' }) };
  if (!time) return formatter(locale, options).format(utc(date));
  const join = dateTimeJoin(locale, cycle);
  if (join !== null) return `${plainSpaces(formatter(locale, options).format(utc(date)))}${join}${timeText(locale, cycle, time)}`;
  return plainSpaces(formatter(locale, { ...options, hour: 'numeric', minute: '2-digit', hourCycle: cycle }).format(utc(date, time)));
}
