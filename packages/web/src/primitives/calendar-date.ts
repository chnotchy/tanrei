// Gregorian calendar dates without a time or a time zone (CAL-24, DTM-38), and times of day without a date (DTM-8). A date
// is `{ year, month, day }` (month 1–12) and travels as an ISO 8601 string ("2026-09-17"), never as a `Date`: a `Date` is
// an instant, and a time zone would move it by a day. A time is `{ hour, minute }` (hour 0–23) and travels as "HH:MM".
// Pure arithmetic: the locale's names and forms are src/primitives/locale-date.ts. Shared by <tanrei-calendar>,
// <tanrei-date-time-picker> and the text field's reading of typed dates.

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
export const daysInMonth = (year: number, month: number) => [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

/** A date from its parts, or null when that day does not exist (February 30). */
export function calendarDate(year: number, month: number, day: number): CalendarDate | null {
  if (![year, month, day].every(Number.isInteger)) return null;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** An ISO 8601 calendar date ("2026-09-17"); anything else (a time, a zone, a day that does not exist) is null. */
export function parseIsoDate(text: string | null | undefined): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  return match ? calendarDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

export const isoOf = (date: CalendarDate) => `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

export const compareDates = (a: CalendarDate, b: CalendarDate) => a.year - b.year || a.month - b.month || a.day - b.day;
export const sameDate = (a: CalendarDate | null | undefined, b: CalendarDate | null | undefined) => !!a && !!b && compareDates(a, b) === 0;
export const compareMonths = (a: CalendarMonth, b: CalendarMonth) => a.year - b.year || a.month - b.month;
export const monthOf = (date: CalendarDate): CalendarMonth => ({ year: date.year, month: date.month });
export const inMonth = (date: CalendarDate | null | undefined, month: CalendarMonth) => !!date && date.year === month.year && date.month === month.month;

/** Days since 0001-01-01, for adding days without a `Date`. */
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

/** The same day number `months` later — the last day of that month when it is shorter (CAL-11, CAL-13). */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const target = addMonthsTo(date, months);
  return { ...target, day: Math.min(date.day, daysInMonth(target.year, target.month)) };
}

/** 0 = Sunday. 0001-01-01 was a Monday. */
export const weekdayOf = (date: CalendarDate): Weekday => ((ordinal(date) + 1) % 7) as Weekday;

export function clampDate(date: CalendarDate, min: CalendarDate | null, max: CalendarDate | null): CalendarDate {
  if (min && compareDates(date, min) < 0) return min;
  if (max && compareDates(date, max) > 0) return max;
  return date;
}

export function clampMonth(month: CalendarMonth, min: CalendarDate | null, max: CalendarDate | null): CalendarMonth {
  if (min && compareMonths(month, min) < 0) return monthOf(min);
  if (max && compareMonths(month, max) > 0) return monthOf(max);
  return month;
}

/** One cell of a month's grid: a day, and whether it belongs to the previous or next month. */
export interface GridDay {
  date: CalendarDate;
  adjacent: boolean;
}

/**
 * The 42 cells of a month (CAL-1, CAL-15): six rows of seven from `firstDay`, the first day of the month in its weekday's
 * column. The cells before the first day and after the last hold the neighbouring months' days while `adjacent` is
 * true, and are null otherwise. Always six rows, so the grid keeps its height.
 */
export function monthGrid(month: CalendarMonth, firstDay: Weekday, adjacent = false): (GridDay | null)[] {
  const first: CalendarDate = { ...month, day: 1 };
  const lead = (weekdayOf(first) - firstDay + 7) % 7;
  const length = daysInMonth(month.year, month.month);
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - lead + 1;
    if (day >= 1 && day <= length) return { date: { ...month, day }, adjacent: false };
    return adjacent ? { date: addDays(first, index - lead), adjacent: true } : null;
  });
}

/** The weekdays in column order from `firstDay`. */
export const weekdayColumns = (firstDay: Weekday): Weekday[] => Array.from({ length: 7 }, (_, index) => ((firstDay + index) % 7) as Weekday);

/** The device's current date in its own time zone (CAL-24, while `today` is empty). */
export function deviceToday(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Milliseconds until the device's next local midnight: when a calendar showing the device's date reads it again (CAL-24). */
export function untilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

// ── Times of day (DTM-8, DTM-16, DTM-17) ──────────────────────────────────────────────────────────────────────────

export interface ClockTime {
  /** 0–23. */
  hour: number;
  /** 0–59. */
  minute: number;
}

/** The clock in use: 1–12 with a period, or 00–23. */
export type HourCycle = 'h12' | 'h23';

/** A 24-hour "HH:MM" time ("19:30"); anything else (seconds, "7:30", "24:00") is null. */
export function parseClockTime(text: string | null | undefined): ClockTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

/** "HH:MM", 24-hour. */
export const clockText = ({ hour, minute }: ClockTime) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export const compareTimes = (a: ClockTime, b: ClockTime) => a.hour - b.hour || a.minute - b.minute;

/** The device's current local time to the minute (DTM-8, while a time is empty). */
export function deviceTime(): ClockTime {
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

/** The 12-hour clock's hour (1–12) of a 24-hour hour. */
export const shownHour12 = (hour: number) => ((hour + 11) % 12) + 1;
/** The period of a 24-hour hour: 0 before noon, 1 after. */
export const periodOf = (hour: number): 0 | 1 => (hour >= 12 ? 1 : 0);
/** A 12-hour clock's hour (1–12) in a period as a 24-hour hour. */
export const hourOf12 = (shown: number, period: 0 | 1) => (shown % 12) + 12 * period;

/** The minute steps a picker offers (DTM-17). */
export const MINUTE_STEPS = [1, 5, 10, 15, 30] as const;

/** The minutes a step offers, from 00 (DTM-17). */
export const stepMinutes = (step: number) => Array.from({ length: Math.ceil(60 / step) }, (_, index) => index * step);

/** A time with its minute rounded down to the step (DTM-8). */
export const roundDown = (time: ClockTime, step: number): ClockTime => ({ ...time, minute: time.minute - (time.minute % step) });
