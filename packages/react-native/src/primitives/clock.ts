// A time of day without a date, seconds or a time zone (TMP-5, TMP-6), and the locale forms the time picker draws it in
// (TMP-9, TMP-10, TMP-27). A time is `{ hour, minute }` (hour 0–23) and travels as a 24-hour "HH:MM" string. Formatting
// goes through the UTC instant of that time on a fixed day, in UTC. Package-internal.
import { dateFormatter, formatInteger, partsOf, toAsciiDigits, type FormatPart } from './locale';

export interface ClockTime {
  /** 0–23. */
  hour: number;
  minute: number;
}

/** The clock in use: 1–12 with a period, or 00–23. */
export type HourCycle = 'h12' | 'h23';

/** A 24-hour "HH:MM" time ("19:30"); anything else (seconds, "7:30", "24:00") is null. */
export function parseClockTime(text: string | undefined | null): ClockTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export const clockText = ({ hour, minute }: ClockTime) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/** The device's current local time to the minute (TMP-5: value empty). */
export function deviceTime(): ClockTime {
  const now = new Date();
  return { hour: now.getHours(), minute: now.getMinutes() };
}

/** The UTC instant of a time on a fixed day: what `Intl` formats (in UTC). */
const instantOf = ({ hour, minute }: ClockTime) => new Date(Date.UTC(2026, 0, 5, hour, minute));

/**
 * The locale's preferred clock (TMP-6): `resolvedOptions().hourCycle` of an hour format, a locale that counts 0 to 11
 * taken as h12 and one that counts 1 to 24 as h23. An engine that does not say (no `hourCycle`) is asked whether 13:00
 * carries a day period.
 */
export function localeHourCycle(locale: string): HourCycle {
  const formatter = dateFormatter(locale, { hour: 'numeric' });
  const cycle = (formatter.resolvedOptions() as { hourCycle?: string; hour12?: boolean }).hourCycle;
  if (cycle === 'h11' || cycle === 'h12') return 'h12';
  if (cycle === 'h23' || cycle === 'h24') return 'h23';
  const hour12 = (formatter.resolvedOptions() as { hour12?: boolean }).hour12;
  if (typeof hour12 === 'boolean') return hour12 ? 'h12' : 'h23';
  return partsOf(formatter, instantOf({ hour: 13, minute: 0 })).some((part) => part.type === 'dayPeriod') ? 'h12' : 'h23';
}

/** The hour and minute of a time in `cycle`, as parts (`formatToParts` with that clock). */
function timeParts(locale: string, cycle: HourCycle, time: ClockTime): FormatPart[] {
  // `hourCycle` alone: `hour12: true` would pick the locale's own 12-hour cycle, which is 0–11 in Japanese.
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hourCycle: cycle };
  const shown = cycle === 'h12' ? ((time.hour + 11) % 12) + 1 : time.hour;
  return partsOf(dateFormatter(locale, options), instantOf(time), { hour: formatInteger(locale, shown), minute: formatInteger(locale, time.minute, 2) });
}

/** An hour as the locale writes it on the clock in use (TMP-9: "7" in en-US with h12, "07" with h23). */
export function hourText(locale: string, cycle: HourCycle, hour: number): string {
  if (cycle === 'h12') return formatInteger(locale, shownHour12(hour));
  // Whether a 24-hour hour has a leading zero is the locale's ("07" in en-US, "7" in ja-JP).
  const part = timeParts(locale, 'h23', { hour, minute: 0 }).find((each) => each.type === 'hour');
  const written = part ? toAsciiDigits(part.value, locale) : '';
  return /^[0-9]{1,2}$/.test(written) && Number(written) === hour ? part!.value : formatInteger(locale, hour, 2);
}

/** A minute with two digits in the locale's digits. */
export const minuteText = (locale: string, minute: number) => formatInteger(locale, minute, 2);

/** The locale's separator between hours and minutes (":" in most; "." in Finnish). */
export function timeSeparator(locale: string): string {
  const parts = timeParts(locale, 'h23', { hour: 7, minute: 5 });
  const hour = parts.findIndex((part) => part.type === 'hour');
  const minute = parts.findIndex((part) => part.type === 'minute');
  const between = hour >= 0 && minute > hour ? parts.slice(hour + 1, minute).map((part) => part.value).join('') : '';
  return between.trim() || ':';
}

/** The locale's names of the periods, before and after noon ("AM" and "PM"; "午前" and "午後"). */
export function periodNames(locale: string): [string, string] {
  const name = (hour: number) => timeParts(locale, 'h12', { hour, minute: 5 }).find((part) => part.type === 'dayPeriod')?.value;
  return [name(7) ?? 'AM', name(19) ?? 'PM'];
}

/**
 * Where the locale's 12-hour pattern writes the period (TMP-10): `before` the hour ("aK:mm" in ja, "ah:mm" in zh,
 * "a h:mm" in ko) or `after` the minutes ("h:mm a" in en) — read from the order of the parts, never from a list of
 * locales.
 */
export function periodPlace(locale: string): 'before' | 'after' {
  const parts = timeParts(locale, 'h12', { hour: 7, minute: 5 });
  const period = parts.findIndex((part) => part.type === 'dayPeriod');
  const hour = parts.findIndex((part) => part.type === 'hour');
  return period >= 0 && hour >= 0 && period < hour ? 'before' : 'after';
}

/**
 * A field's text as a whole number (TMP-23): ASCII or the locale's digits, nothing else (surrounding spaces aside).
 * Null for anything else, empty included.
 */
export function wholeNumber(locale: string, text: string): number | null {
  const ascii = toAsciiDigits(text.trim(), locale);
  return /^[0-9]+$/.test(ascii) ? Number(ascii) : null;
}

/** An hour of a 12-hour clock (1–12) in a period (0 before noon, 1 after) as a 24-hour hour. */
export const hourOf12 = (shown: number, period: 0 | 1) => (shown % 12) + 12 * period;
/** The 12-hour clock's shown hour (1–12) of a 24-hour hour. */
export const shownHour12 = (hour: number) => ((hour + 11) % 12) + 1;
/** The period of a 24-hour hour: 0 before noon, 1 after. */
export const periodOf = (hour: number): 0 | 1 => (hour >= 12 ? 1 : 0);
