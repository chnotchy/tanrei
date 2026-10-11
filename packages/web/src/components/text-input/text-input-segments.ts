// The row of segments a date, time or date-time field is entered in (TXF-42 … TXF-47): what each segment holds, shows
// and says, and what a step, a digit and a Backspace do to it. Everything here is pure — the element in text-field.ts
// owns the focus, the events and the value; the locale's order, digits and names come from src/primitives/locale-date.ts.
import {
  type DateKind,
  type RowPart,
  type SegmentUnit,
  daysInMonth,
  hourOf12,
  hourText,
  isoValue,
  localeHourCycle,
  minuteText,
  monthName,
  numberText,
  periodNames,
  periodOf,
  shownHour12,
  unitName,
  valueRow,
  yearText,
} from '../../primitives/index.js';

/**
 * What the segments hold. A year is its digits as typed — it counts as filled only with four of them (TXF-45: a short
 * year is never guessed into a century); an hour is the number its segment shows (1 to 12 beside a day period, 0 to 23
 * without one); every other number is its value, and null is an empty segment.
 */
export interface Segments {
  year: string;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  period: 0 | 1 | null;
}
export const EMPTY_SEGMENTS: Segments = { year: '', month: null, day: null, hour: null, minute: null, period: null };

/** The row of one locale and kind: its parts in order (TXF-42), its units, and whether its clock is the 12-hour one. */
export interface Row {
  locale: string;
  kind: DateKind;
  parts: readonly RowPart[];
  units: readonly SegmentUnit[];
  h12: boolean;
}

const rows = new Map<string, Row>();
export function rowOf(locale: string, kind: DateKind): Row {
  const key = `${locale}|${kind}`;
  let row = rows.get(key);
  if (!row) {
    const parts = valueRow(locale, kind);
    const units = parts.flatMap((part) => (part.unit ? [part.unit] : []));
    row = { locale, kind, parts, units, h12: kind !== 'date' && localeHourCycle(locale) === 'h12' && units.includes('period') };
    rows.set(key, row);
  }
  return row;
}

/** What an empty segment shows (TXF-42): yyyy, mm, dd, hh and mm; for the day period, the locale's name for the morning. */
const LETTERS: Readonly<Record<Exclude<SegmentUnit, 'period'>, string>> = { year: 'yyyy', month: 'mm', day: 'dd', hour: 'hh', minute: 'mm' };
export const placeholderOf = (row: Row, unit: SegmentUnit) => (unit === 'period' ? periodNames(row.locale)[0] : LETTERS[unit]);

/** The year the segments give, or null while it has fewer than four digits (or is 0000). */
const fullYear = (segments: Segments) => (segments.year.length === 4 && Number(segments.year) >= 1 ? Number(segments.year) : null);

/** A segment holds something (TXF-43's "first empty segment"); a year with one digit does, though it gives no value yet. */
export const holds = (segments: Segments, unit: SegmentUnit) => (unit === 'year' ? segments.year !== '' : segments[unit] !== null);

/** The range a segment steps and types in (TXF-44), or null for a day period (its two names). */
export function rangeOf(row: Row, segments: Segments, unit: SegmentUnit): [number, number] {
  if (unit === 'year') return [1, 9999];
  if (unit === 'month') return [1, 12];
  if (unit === 'day') {
    // 31 while the month is empty, 29 for a February whose year is empty (or not yet whole).
    if (segments.month === null) return [1, 31];
    return [1, daysInMonth(fullYear(segments) ?? 2000, segments.month)];
  }
  if (unit === 'hour') return row.h12 ? [1, 12] : [0, 23];
  if (unit === 'minute') return [0, 59];
  return [0, 1];
}

/** TXF-44: a day beyond the last day of a newly chosen month or year becomes that last day. */
function settleDay(row: Row, segments: Segments): Segments {
  if (segments.day === null) return segments;
  const last = rangeOf(row, segments, 'day')[1];
  return segments.day > last ? { ...segments, day: last } : segments;
}

/** The segments of an ISO value of the row's kind (TXF-31); every segment empty for an empty or malformed one. */
export function segmentsOf(row: Row, value: string): Segments {
  if (!value || !isoValue(row.kind, value)) return EMPTY_SEGMENTS;
  const [date, time] = row.kind === 'time' ? ['', value] : value.split('T');
  const out: Segments = { ...EMPTY_SEGMENTS };
  if (date) {
    const [year, month, day] = date.split('-');
    Object.assign(out, { year, month: Number(month), day: Number(day) });
  }
  if (time) {
    const [hour, minute] = time.split(':').map(Number);
    out.minute = minute;
    out.hour = row.h12 ? shownHour12(hour) : hour;
    out.period = row.h12 ? periodOf(hour) : null;
  }
  return out;
}

/** TXF-28, TXF-46: the ISO 8601 form of what the segments give, or empty while one of the row's is empty. */
export function valueOf(row: Row, segments: Segments): string {
  const two = (n: number) => String(n).padStart(2, '0');
  let date = '';
  let time = '';
  if (row.kind !== 'time') {
    const year = fullYear(segments);
    if (year === null || segments.month === null || segments.day === null) return '';
    date = `${segments.year}-${two(segments.month)}-${two(segments.day)}`;
  }
  if (row.kind !== 'date') {
    if (segments.hour === null || segments.minute === null || (row.h12 && segments.period === null)) return '';
    time = `${two(row.h12 ? hourOf12(segments.hour, segments.period!) : segments.hour)}:${two(segments.minute)}`;
  }
  const value = row.kind === 'date' ? date : row.kind === 'time' ? time : `${date}T${time}`;
  return isoValue(row.kind, value) ?? '';
}

/** How many of the row's segments hold something, and how many there are (TXF-30: half-filled is some, not all). */
export function fill(row: Row, segments: Segments): { held: number; whole: number; of: number } {
  const whole = row.units.filter((unit) => (unit === 'year' ? fullYear(segments) !== null : segments[unit] !== null)).length;
  return { held: row.units.filter((unit) => holds(segments, unit)).length, whole, of: row.units.length };
}

/** What a segment shows while it holds something (TXF-42), in the locale's digits; empty for an empty one. */
export function shownOf(row: Row, segments: Segments, unit: SegmentUnit): string {
  const { locale } = row;
  if (!holds(segments, unit)) return '';
  if (unit === 'year') return yearText(locale, Number(segments.year));
  if (unit === 'month') return numberText(locale, segments.month!, 2);
  if (unit === 'day') return numberText(locale, segments.day!, 2);
  if (unit === 'minute') return minuteText(locale, segments.minute!);
  if (unit === 'hour') return row.h12 ? hourText(locale, 'h12', hourOf12(segments.hour!, 0)) : hourText(locale, 'h23', segments.hour!);
  return periodNames(locale)[segments.period!];
}

/**
 * What a segment's cell is as wide as (TXF-42): the widest of these copies, none of which is drawn. Its filled form —
 * two digits, four for a year, either name of a day period — so that it keeps that width while it is half typed and
 * while it is empty; and, while it is empty, its placeholder, because "mm" is wider than two digits in most faces and
 * would otherwise run into the separators beside it (so a row shifts by that difference, and by no more, when such a
 * segment takes its first digit). An hour is written as the locale writes it, one digit or two: a filled one is as wide
 * as itself, so the row starts where the input text starts ("2:30 PM").
 */
export function sizersOf(row: Row, segments: Segments, unit: SegmentUnit): string[] {
  if (unit === 'period') return [...periodNames(row.locale)];
  if (unit === 'hour' && segments.hour !== null) return [shownOf(row, segments, unit)];
  const filled = numberText(row.locale, 0, unit === 'year' ? 4 : 2);
  return holds(segments, unit) ? [filled] : [filled, placeholderOf(row, unit)];
}

/** TXF-29, TXF-30: the row's text as drawn — the locale's form, an empty segment's placeholder left out. */
export const rowText = (row: Row, segments: Segments) => (fill(row, segments).held === 0 ? '' : row.parts.map((part) => (part.unit ? shownOf(row, segments, part.unit) : part.literal)).join(''));

/** TXF-47: a segment as assistive technology hears it. */
export function spoken(row: Row, segments: Segments, unit: SegmentUnit, emptyText: string): { name: string; min: number; max: number; now: number | null; text: string | null } {
  const { locale } = row;
  const [min, max] = rangeOf(row, segments, unit);
  const name = unitName(locale, unit);
  if (!holds(segments, unit)) return { name, min, max, now: null, text: emptyText || null };
  if (unit === 'period') return { name, min, max, now: segments.period, text: periodNames(locale)[segments.period!] };
  if (unit === 'year') return { name, min, max, now: Number(segments.year), text: null };
  const now = segments[unit]!;
  if (unit === 'month') return { name, min, max, now, text: `${numberText(locale, now)} – ${monthName(locale, now)}` };
  if (unit === 'hour' && row.h12 && segments.period !== null) return { name, min, max, now, text: `${numberText(locale, now)} ${periodNames(locale)[segments.period]}` };
  return { name, min, max, now, text: null };
}

/** TXF-44: what Page Up and Page Down step by. */
export const PAGE: Readonly<Record<SegmentUnit, number>> = { year: 5, month: 2, day: 7, hour: 2, minute: 15, period: 1 };

/** The device's clock, as a segment of `unit` holds it. */
function current(row: Row, unit: SegmentUnit, now: Date): string | number {
  if (unit === 'year') return String(now.getFullYear()).padStart(4, '0');
  if (unit === 'month') return now.getMonth() + 1;
  if (unit === 'day') return now.getDate();
  if (unit === 'hour') return row.h12 ? shownHour12(now.getHours()) : now.getHours();
  if (unit === 'minute') return now.getMinutes();
  return periodOf(now.getHours());
}

/**
 * TXF-44: a segment raised or lowered by `by` within its own range, wrapping from the last value to the first and
 * back; an empty one is filled from the device's clock instead. No other segment changes, except a day beyond the last
 * day of the month and year the row now gives.
 */
export function stepped(row: Row, segments: Segments, unit: SegmentUnit, by: number, now: Date): Segments {
  if (!holds(segments, unit)) {
    const filled = { ...segments, [unit]: current(row, unit, now) } as Segments;
    // The clock's day may not exist in the month the row already holds.
    return settleDay(row, filled);
  }
  const [min, max] = rangeOf(row, segments, unit);
  const from = unit === 'year' ? Number(segments.year) : (segments[unit] as number);
  const span = max - min + 1;
  const to = min + ((((Math.min(Math.max(from, min), max) - min + by) % span) + span) % span);
  return settleDay(row, { ...segments, [unit]: unit === 'year' ? String(to).padStart(4, '0') : to } as Segments);
}

/** TXF-44: Home and End set a month, day, hour or minute to the first and the last value of its range. */
export function edged(row: Row, segments: Segments, unit: SegmentUnit, edge: 'first' | 'last'): Segments {
  if (unit === 'year' || unit === 'period') return segments;
  const [min, max] = rangeOf(row, segments, unit);
  return settleDay(row, { ...segments, [unit]: edge === 'first' ? min : max });
}

/**
 * TXF-45: a digit typed on a number segment. `typed` is the digits typed since the segment took focus: the digit is the
 * number's next one while they still form a number in the segment's range, and starts the number again otherwise. A
 * leading zero of a month, day or 12-hour hour waits for its second digit ("09"). `advance` says that no further digit
 * could extend the number.
 */
export function typed(row: Row, segments: Segments, unit: Exclude<SegmentUnit, 'period'>, typedSoFar: string, digit: string): { segments: Segments; typed: string; advance: boolean } {
  if (unit === 'year') {
    let text = typedSoFar.length < 4 ? typedSoFar + digit : digit;
    if (text.length === 4 && Number(text) < 1) text = digit;
    return { segments: settleDay(row, { ...segments, year: text }), typed: text, advance: text.length === 4 };
  }
  const [min, max] = rangeOf(row, segments, unit);
  const fits = (text: string) => text.length <= 2 && Number(text) <= max && (Number(text) >= min || text === '0');
  const text = fits(typedSoFar + digit) ? typedSoFar + digit : digit;
  const number = Number(text);
  const value = number >= min && number <= max ? number : null;
  const next = settleDay(row, { ...segments, [unit]: value } as Segments);
  return { segments: next, typed: text, advance: value !== null && (text.length === 2 || number * 10 > max) };
}

/** TXF-45: Backspace or Delete removes the last digit of a number segment, or the whole of a day period. */
export function erased(row: Row, segments: Segments, unit: SegmentUnit): { segments: Segments; typed: string } {
  if (unit === 'period') return { segments: { ...segments, period: null }, typed: '' };
  if (unit === 'year') {
    const year = segments.year.slice(0, -1);
    return { segments: settleDay(row, { ...segments, year }), typed: year };
  }
  const value = segments[unit];
  const rest = value === null ? '' : String(value).slice(0, -1);
  return { segments: settleDay(row, { ...segments, [unit]: rest ? Number(rest) : null } as Segments), typed: rest };
}

/**
 * TXF-45: a letter typed on a day-period segment — the first letter of the locale's name for the morning or for the
 * afternoon (where the two differ), or a or p in any case. Null for any other character.
 */
export function periodTyped(row: Row, character: string): 0 | 1 | null {
  const letter = character.toLocaleLowerCase();
  const [am, pm] = periodNames(row.locale).map((name) => name.trim().toLocaleLowerCase().slice(0, 1));
  if (am !== pm && letter === am) return 0;
  if (am !== pm && letter === pm) return 1;
  return letter === 'a' ? 0 : letter === 'p' ? 1 : null;
}

/** TXF-45: the characters that move on from a segment that is not empty: a separator's. */
export const SEPARATORS: ReadonlySet<string> = new Set(['/', '.', '-', ':', ' ']);
