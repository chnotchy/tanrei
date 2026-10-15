import { LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  ActionPlacement,
  AvailabilityController,
  BUTTON_VARIANTS,
  type CalendarDate,
  type ClockTime,
  FALLBACK_LOCALE,
  FollowController,
  type HourCycle,
  MINUTE_STEPS,
  PressController,
  SHEET_TOUCH_SLOP,
  SystemWatchController,
  WEEKDAY_NAMES,
  addDays,
  ambientLocale,
  asciiDigits,
  clockText,
  closeRequestReason,
  compChoice,
  compareDates,
  deepActive,
  deviceTime,
  headerDateText,
  holdPageScroll,
  hostAria,
  hourOf12,
  hourText,
  isoOf,
  keyboardCover,
  clockFor,
  localeHourCycle,
  minuteText,
  modalLayer,
  layoutSize,
  naturalHeight,
  numberText,
  parseClockTime,
  parseIsoDate,
  parseValues,
  periodNames,
  periodOf,
  periodPlace,
  report,
  roundDown,
  shownHour12,
  stepMinutes,
  supportedLocale,
  syncFocusStyle,
  tabbables,
  timeSeparator,
  timeText,
  trapFocus,
  unitName,
  watchEscape,
  type WordKey,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import '../calendar/calendar.js';
import type { TanreiCalendar, TanreiCalendarChangeDetail } from '../calendar/calendar.js';
import { placeMenu } from '../menu/menu.js';
import '../tabs/tabs.js';
import { styles } from './date-time-picker.styles.js';

/** modal: a dialog over a scrim, committed by OK. docked: a surface below its anchor. */
export type TanreiDateTimePickerPresentation = 'modal' | 'docked';
/** What is chosen: a calendar date, a time of day, or both. */
export type TanreiDateTimePickerMode = 'date' | 'time' | 'date-time';
/** The clock (DTM-16): `h12` (1–12 and a period), `h23` (00–23), or `locale` (the locale's preferred clock). */
export type TanreiDateTimePickerHourCycle = 'locale' | 'h12' | 'h23';
/** How the time is set when the picker opens: on wheels or on a clock dial. */
export type TanreiDateTimePickerEntryMode = 'wheels' | 'dial';
/** Dial mode: the unit the dial shows, and the selector that takes focus, when the picker opens. */
export type TanreiDateTimePickerUnit = 'hour' | 'minute';
/** DTM-9: the calendar above the time section, beside it, or chosen by the window. */
export type TanreiDateTimePickerLayout = 'auto' | 'vertical' | 'horizontal';
/**
 * Why the picker asks to be closed (DTM-5). The web has no back gesture of its own: a modal picker's close request
 * without a key (Android's back) arrives as the native dialog's `cancel` and is sent as `back`; one an Escape key caused
 * is sent as `escape`.
 */
export type TanreiDateTimePickerCloseReason = 'escape' | 'back' | 'outside' | 'tab' | 'focus-out' | 'cancel' | 'confirm' | 'select';
export interface TanreiDateTimePickerCloseDetail {
  reason: TanreiDateTimePickerCloseReason;
}
/** What `change` carries, in the mode's form: `value` without a range, `start` and `end` with one; `""` where none. */
export interface TanreiDateTimePickerChangeDetail {
  value: string;
  start: string;
  end: string;
}

const PRESENTATIONS: readonly TanreiDateTimePickerPresentation[] = ['modal', 'docked'];
const MODES: readonly TanreiDateTimePickerMode[] = ['date', 'time', 'date-time'];
const HOUR_CYCLES: readonly TanreiDateTimePickerHourCycle[] = ['locale', 'h12', 'h23'];
const ENTRY_MODES: readonly TanreiDateTimePickerEntryMode[] = ['wheels', 'dial'];
const UNITS: readonly TanreiDateTimePickerUnit[] = ['hour', 'minute'];
const LAYOUTS: readonly TanreiDateTimePickerLayout[] = ['auto', 'vertical', 'horizontal'];
const FIRST_DAYS = ['locale', ...WEEKDAY_NAMES] as const;
const START_VIEWS = ['day', 'year'] as const;

const PREFIX = '--tanrei-comp-date-time-picker';
/** The choices of kind the picker reads from the cascade: their values are the names. */
const OFFERED = ['both', 'wheels', 'dial'] as const;
const ARRANGEMENTS = ['fill', 'end'] as const;
/** DTM-18: a selection container for each wheel, or one band behind both. */
const SPANS = ['each', 'joined'] as const;

/** The glyphs of the entry-mode tabs (DTM-13), by the icon set's names: the keyboard for the wheels, the clock face for the dial. */
const ENTRY_GLYPHS = { wheels: 'keyboard', dial: 'schedule' } as const;

/** DTM-48: the glyphs that say Cancel and OK without a word, by the icon set's names, where neither the instance nor the product's words gave one. */
const ACTION_GLYPHS = { cancel: 'close', confirm: 'check' } as const;

/** DTM-48: what stands where words that nobody gave would be drawn — a zero-width space, so that the place keeps the height of its line. */
const HOLDS_A_LINE = '\u200b';

/** DTM-44: what, typed on the hour, ends its entry and moves on to the minute, besides the locale's own separator. */
const SEPARATORS = [':', '.', ' '];

/** A wheel's quiet time that ends a scroll of it (DTM-19). */
const WHEEL_QUIET = 150;
/** How far back a release's velocity looks, in ms. */
const VELOCITY_WINDOW = 80;

type End = 'value' | 'start' | 'end';
type Unit = TanreiDateTimePickerUnit;
/** One end of a range, as its range field names it (DTM-15). */
type RangeEnd = 'start' | 'end';

/** One end of the choice: its date (modes with a date) and its time (modes with a time). */
interface Moment {
  date: CalendarDate | null;
  time: ClockTime | null;
}
const EMPTY: Moment = { date: null, time: null };
type Choice = Record<End, Moment>;
const NO_CHOICE: Choice = { value: EMPTY, start: EMPTY, end: EMPTY };

/**
 * A bound of min or max (DTM-49): its date (empty in mode time) and its time as minutes of the day — null where the
 * bound is a calendar date, which bounds the dates alone.
 */
interface Bound {
  date: string;
  minutes: number | null;
}
/** The last minute of a day. */
const DAY_END = 24 * 60 - 1;
const minutesOf = (time: ClockTime) => time.hour * 60 + time.minute;
const timeAt = (minutes: number): ClockTime => ({ hour: Math.floor(minutes / 60), minute: minutes % 60 });

/** The props, read once per update: unknown values replaced by the defaults, malformed values dropped (DTM-40). */
interface Config {
  presentation: TanreiDateTimePickerPresentation;
  mode: TanreiDateTimePickerMode;
  range: boolean;
  cycle: HourCycle;
  step: number;
  entryMode: TanreiDateTimePickerEntryMode;
  unit: Unit;
  layout: TanreiDateTimePickerLayout;
  locale: string;
  /** The calendar's bounds: the dates of min and max (DTM-11, DTM-49); empty in mode time. */
  min: string;
  max: string;
  /** DTM-49: the earliest and the latest time offered, min rounded up and max down to minuteStep; null for no bound. */
  low: Bound | null;
  high: Bound | null;
  today: string;
  disabledDates: string[];
  firstDayOfWeek: string;
  startView: string;
  committed: Choice;
}

/** A direction on the dial for `degrees` clockwise from the top: x right, y down, unit length. */
const direction = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.round(Math.sin(radians) * 1e6) / 1e6, y: Math.round(-Math.cos(radians) * 1e6) / 1e6 };
};
/** `n` modulo `m`, never negative. */
const mod = (n: number, m: number) => ((n % m) + m) % m;
/** The shortest signed move from index `from` to index `to` on a wheel of `n` values. */
const shortest = (from: number, to: number, n: number) => {
  const d = mod(to - from, n);
  return d > n / 2 ? d - n : d;
};

/** A wheel's drag or scroll in progress, and its settling. */
interface WheelMotion {
  /** The rows' unbounded position: the value on the band is the list's entry at this index, modulo its length. */
  at: number;
  /** How far the rows are moved off `at`, in rows, while a drag or a scroll follows the pointer. */
  shift: number;
  pointer: number | null;
  startY: number;
  moved: boolean;
  samples: { y: number; t: number }[];
  settling: number;
  scrolling: number;
}

let ids = 0;

/**
 * Lets a person choose a date, a time, or a date and time — or a span of any of them — from a Calendar and time wheels
 * or a clock dial, in a dialog or in a surface that drops down from a field.
 *
 * Contract: specs/date-time-picker.spec.json. `modal` (the default) is a native `<dialog>` in the shadow root opened with
 * `showModal()` — `::backdrop` is the scrim, everything else is inert, focus is trapped — with a start-aligned title row,
 * the pending value (in a mode with a date) and Cancel and OK; the choice is pending until OK. `docked` is a manual
 * popover in the top layer, placed below the element whose id is `anchor` with the menu's placement (flipped above when
 * there is more room there, shifted to stay in the viewport, following the anchor); it is not modal: Tab and focus
 * leaving close it, and a docked picker that sets a date only commits by choosing it. Both move focus in when they open
 * and give it back when they close.
 *
 * The picker never closes itself: it fires `close` with a reason and you set `open` to false. When one activation
 * commits a choice, the element takes the new `value` (or `start` and `end`) and fires `change` before `close`.
 *
 * Values are the strings of `<input type=date>`, `type=time` and `type=datetime-local`: "2026-09-17", "19:30",
 * "2026-09-17T19:30" — no seconds, no time zone. The date is a `<tanrei-calendar>`; the time is set on two wheels (spin
 * buttons that also take a typed number: press a wheel's chosen value, or type a digit) or on a clock dial with an hour
 * and a minute selector, chosen by two icon-only `<tanrei-tabs variant="secondary">` at the end of the title row while
 * the design system offers both (`comp.date-time-picker.time.entry-modes`) — the keyboard glyph for the wheels, the
 * clock face for the dial, `wheelsLabel` and `dialLabel` their accessible names. They are the picker's only tabs. The
 * period of a 12-hour time (AM, PM) is a part of the time, after the minute or — where the locale writes it first —
 * before the hour: a third wheel of two rows in the wheels mode, and in the dial mode a narrow selector that shows the
 * pending period and changes to the other when pressed; either is a spin button of two values named `periodLabel`, and
 * neither is ever drawn as selected. The two ends of a range that has a time are two range fields joined by an en dash
 * ("9:00 AM – 5:30 PM") across the whole time section, with no word for start or end; the one the wheels or the dial set
 * is drawn as selected, and pressing the other sets it. Names, digits, forms, the separator and the preferred clock come from `Intl` for `locale`
 * (without it, the nearest `lang`, then the browser's language). Every visual value comes from
 * `--tanrei-comp-date-time-picker-*` tokens; the calendar, the tabs and the Buttons keep their own. The `inline`
 * attribute, for tests and documentation, draws the open surface in place without the overlay's behaviour.
 *
 * @tag tanrei-date-time-picker
 * @csspart container - The surface: the native `<dialog>` (modal) or the popover (docked).
 * @csspart header - The title row (and, in a modal picker with a date, the pending value).
 * @csspart calendar - The `<tanrei-calendar>`.
 * @csspart time - The time section: the range display across its width, the time display and the wheels or the dial.
 * @csspart range-display - The two ends of a range that has a time: a group of two range fields and the dash between them.
 * @csspart range-field - One end of the range (a button, `data-end` is `start` or `end`); `aria-pressed` on the one being set.
 * @csspart range-separator - The en dash between the two range fields.
 * @csspart wheel - The hour or the minute wheel; its middle row is the spin button, an input that takes typed digits.
 * @csspart selector - The hour or the minute selector of the dial mode (a spin button).
 * @csspart period - The period of a 12-hour time (a spin button of two values): the period wheel in the wheels mode, the period selector in the dial mode.
 * @csspart separator - The separator between the hour and the minute.
 * @csspart dial - The clock dial.
 * @csspart handle - The handle over the chosen value.
 * @csspart error - The line that says a range's end is before its start.
 * @csspart actions - Cancel and OK.
 * @fires {CustomEvent<TanreiDateTimePickerChangeDetail>} change - The person committed a choice that differs from the one before (OK, or choosing a date in a docked picker that sets a date only). `value`, `start` and `end` are already the new ones; `detail` holds them too. Fired before the `close` it causes.
 * @fires {CustomEvent<TanreiDateTimePickerCloseDetail>} close - The picker asks to be closed: `detail.reason` is `escape`, `back`, `outside`, `tab`, `focus-out`, `cancel`, `confirm` or `select`. Set `open` to false.
 */
export class TanreiDateTimePicker extends LitElement {
  private readonly availability = new AvailabilityController(this, 'date-time-picker');
  private readonly system = new SystemWatchController(this);
  /** DTM-48: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  /**
   * DTM-48: the picker's own words, each the instance's prop, else the product's — and, for the hour's, the minute's and
   * the period's names, else the locale's own name for that field, which is the platform's and not a word of Tanrei's.
   * (The calendar reads its six itself, from the props the picker hands it.)
   */
  private get say() {
    const { locale } = this.cfg;
    const get = (key: WordKey, own: string) => this.words.get(key, own);
    return {
      dateLabel: get('dateLabel', this.dateLabel),
      startLabel: get('startLabel', this.startLabel),
      endLabel: get('endLabel', this.endLabel),
      confirmLabel: get('confirmLabel', this.confirmLabel),
      cancelLabel: get('cancelLabel', this.cancelLabel),
      hourLabel: get('hourLabel', this.hourLabel) || unitName(locale, 'hour'),
      minuteLabel: get('minuteLabel', this.minuteLabel) || unitName(locale, 'minute'),
      periodLabel: get('periodLabel', this.periodLabel) || unitName(locale, 'period'),
      wheelsLabel: get('wheelsLabel', this.wheelsLabel),
      dialLabel: get('dialLabel', this.dialLabel),
      entryModeLabel: get('entryModeLabel', this.entryModeLabel),
      rangeLabel: get('rangeLabel', this.rangeLabel),
      // "+1" is a mark, in the locale's digits: what "next day" says, without a word.
      nextDayLabel: get('nextDayLabel', this.nextDayLabel) || `+${numberText(locale, 1)}`,
      rangeErrorText: get('rangeErrorText', this.rangeErrorText),
    };
  }

  /**
   * DTM-48: a word that is drawn or exposed now and that nobody gave — not the instance, not the product's words, not
   * the platform — is recorded (`missingWords()`) and, in a debug build, reported once, naming the prop. The part is
   * still drawn and still works. `label` is the instance's alone, and reported for this picker.
   */
  private reportWords() {
    if (!this.session) return;
    const say = this.say;
    const { range, mode } = this.cfg;
    const lacks = (key: WordKey, effect: string) => this.words.missing(key, { id: 'DTM-48', effect });
    if (!this.label.trim()) report(this, 'DTM-48', 'label is empty, so the title row draws no words and the surface has no accessible name; say what is being chosen ("Check-in"): the product\'s words hold no title');
    if (this.pendingUntilOk) {
      if (!say.cancelLabel) lacks('cancelLabel', 'an icon-only Button with the close glyph is drawn in its place, without a name');
      if (!say.confirmLabel) lacks('confirmLabel', 'an icon-only Button with the check glyph is drawn in its place, without a name');
    }
    if (this.modal && this.hasDate && !say.dateLabel && (range ? !this.pending.start.date || !this.pending.end.date : !this.pending.value.date)) lacks('dateLabel', 'a date not chosen yet draws nothing in the header, which keeps its height');
    if (this.hasTime) {
      if (!say.hourLabel) lacks('hourLabel', 'the hour has no accessible name');
      if (!say.minuteLabel) lacks('minuteLabel', 'the minute has no accessible name');
      if (this.cfg.cycle === 'h12' && !say.periodLabel) lacks('periodLabel', 'the period has no accessible name');
      if (this.offered === 'both') {
        if (!say.entryModeLabel) lacks('entryModeLabel', 'the row of entry-mode tabs has no accessible name');
        if (!say.wheelsLabel) lacks('wheelsLabel', 'the tab that shows the wheels has no accessible name');
        if (!say.dialLabel) lacks('dialLabel', 'the tab that shows the dial has no accessible name');
      }
      if (range) {
        if (!say.rangeLabel) lacks('rangeLabel', 'the group of the two range fields has no accessible name');
        if (!say.startLabel) lacks('startLabel', 'the start\'s range field is named by its time alone');
        if (!say.endLabel) lacks('endLabel', 'the end\'s range field is named by its time alone');
      }
    }
    if (this.nextDay && !this.words.get('nextDayLabel', this.nextDayLabel)) lacks('nextDayLabel', '"+1" is drawn after the end\'s time in its place');
    if (mode === 'date-time' && this.rangeError && !say.rangeErrorText) lacks('rangeErrorText', 'the error line draws no words and keeps its height');
  }
  static override styles = [styles, hiddenHost];

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    presentation: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    range: { type: Boolean, reflect: true },
    value: { type: String },
    start: { type: String },
    end: { type: String },
    min: { type: String },
    max: { type: String },
    disabledDates: { attribute: 'disabled-dates', converter: { fromAttribute: parseValues, toAttribute: (value: string[]) => value.join(' ') } },
    isDateDisabled: { attribute: false },
    today: { type: String },
    firstDayOfWeek: { type: String, attribute: 'first-day-of-week' },
    locale: { type: String },
    startView: { type: String, attribute: 'start-view' },
    showAdjacentDays: { type: Boolean, attribute: 'show-adjacent-days' },
    hourCycle: { type: String, attribute: 'hour-cycle' },
    minuteStep: { type: Number, attribute: 'minute-step' },
    entryMode: { type: String, attribute: 'entry-mode' },
    unit: { type: String },
    layout: { type: String, reflect: true },
    label: { type: String },
    dateLabel: { type: String, attribute: 'date-label' },
    startLabel: { type: String, attribute: 'start-label' },
    endLabel: { type: String, attribute: 'end-label' },
    confirmLabel: { type: String, attribute: 'confirm-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    previousMonthLabel: { type: String, attribute: 'previous-month-label' },
    nextMonthLabel: { type: String, attribute: 'next-month-label' },
    yearViewLabel: { type: String, attribute: 'year-view-label' },
    todayLabel: { type: String, attribute: 'today-label' },
    hourLabel: { type: String, attribute: 'hour-label' },
    minuteLabel: { type: String, attribute: 'minute-label' },
    wheelsLabel: { type: String, attribute: 'wheels-label' },
    dialLabel: { type: String, attribute: 'dial-label' },
    entryModeLabel: { type: String, attribute: 'entry-mode-label' },
    periodLabel: { type: String, attribute: 'period-label' },
    rangeLabel: { type: String, attribute: 'range-label' },
    nextDayLabel: { type: String, attribute: 'next-day-label' },
    rangeErrorText: { type: String, attribute: 'range-error-text' },
    anchor: { type: String, reflect: true },
    opener: { type: String, reflect: true },
    inline: { type: Boolean, reflect: true },
    pending: { state: true },
    editing: { state: true },
    entry: { state: true },
    typed: { state: true },
    armed: { state: true },
    ringed: { state: true },
    ringedEnd: { state: true },
    shownUnit: { state: true },
    angle: { state: true },
    instant: { state: true },
    stacked: { state: true },
    wheelFrame: { state: true },
  };

  /** Whether the picker is shown. Open it from your field or button; set it to false when the picker fires `close`. */
  open = false;

  /** `modal`: a dialog over a scrim, committed by OK. `docked`: a surface below `anchor`. */
  presentation: TanreiDateTimePickerPresentation = 'modal';

  /** `date`, `time` or `date-time`: what is chosen. */
  mode: TanreiDateTimePickerMode = 'date';

  /** Chooses a span (`start` … `end`) instead of one `value`: of dates, of times (the end may fall on the next day) or of both. */
  range = false;

  /** The chosen value without a range: "2026-09-17" (date), "19:30" (time, 24-hour), "2026-09-17T19:30" (date-time); empty when none. */
  value = '';

  /** The first value of the chosen span when `range` is true, in the mode's form; empty when none. */
  start = '';

  /** The last value of the chosen span when `range` is true, in the mode's form; empty while only `start` is chosen. */
  end = '';

  /**
   * The earliest value that can be chosen, in the mode's form — as a Text field's `min` is: "2026-09-17" (date),
   * "09:00" (time), "2026-09-17T09:00" (date-time; a date alone bounds only the dates there). It bounds the calendar by
   * its date and the time by its time: earlier times stay in place, faded, and cannot be chosen. Empty for no limit.
   */
  min = '';

  /** The latest value that can be chosen, in the mode's form ("2026-09-30", "17:00", "2026-09-30T17:00"); empty for no limit. */
  max = '';

  /** Dates that cannot be chosen, passed to the calendar. The `disabled-dates` attribute is a space-separated list or a JSON array. */
  disabledDates: string[] = [];

  /** A rule no list can hold (every weekend): true for an ISO date that cannot be chosen. Passed to the calendar. Property only. */
  isDateDisabled: ((date: string) => boolean) | null = null;

  /** The date the calendar draws as today; empty uses the device's current date. */
  today = '';

  /** The weekday in the calendar's first column (`first-day-of-week`). */
  firstDayOfWeek = 'locale';

  /** A BCP 47 tag ("en-US", "ja-JP") for names, digits, forms, the separator and the clock; empty: the nearest `lang`, then the browser's. */
  locale = '';

  /** Whether the calendar opens on the days of a month or on the list of years (`start-view`). */
  startView = 'day';

  /** Whether the calendar shows the neighbouring months' days in its spare cells (`show-adjacent-days`). */
  showAdjacentDays = false;

  /** `h12` (1–12 with a period), `h23` (00–23) or `locale` (the locale's clock). Values are 24-hour in every cycle (`hour-cycle`). */
  hourCycle: TanreiDateTimePickerHourCycle = 'locale';

  /** The minutes a person can choose: every minute (1), or every 5, 10, 15 or 30 (`minute-step`). */
  minuteStep = 1;

  /** How the time is set when the picker opens (`entry-mode`): `wheels` or `dial`. Not HTML's `inputmode`. */
  entryMode: TanreiDateTimePickerEntryMode = 'wheels';

  /** Dial mode: the unit the dial shows, and the selector that takes focus, when the picker opens. */
  unit: TanreiDateTimePickerUnit = 'hour';

  /** `vertical`, `horizontal`, or `auto`: horizontal only when the window is too short for vertical and wide enough. */
  layout: TanreiDateTimePickerLayout = 'auto';

  /** Names the picker: its surface's accessible name and the start of its title row — what is being chosen ("Check-in", "Meeting time"). Required, and this instance's alone: the product's words hold none. Empty, the title row draws no words and keeps its height, and the surface has no name. */
  label = '';

  /** What the header shows for a date not chosen yet: a single value's, and either end's of a range (`date-label`). This instance's words, else the product's (`setWords({ dateLabel })`); Tanrei has none: without them nothing is drawn there, and the place keeps its height. */
  dateLabel = '';

  /** Range: the accessible name of the start's range field and the calendar's start day's description; never drawn (`start-label`). This instance's words, else the product's (`setWords({ startLabel })`); Tanrei has none: without them the field and the day say nothing of it. */
  startLabel = '';

  /** Range: the accessible name of the end's range field and the calendar's end day's description; never drawn (`end-label`). This instance's words, else the product's (`setWords({ endLabel })`); Tanrei has none: without them the field and the day say nothing of it. */
  endLabel = '';

  /** OK's label (`confirm-label`). This instance's words, else the product's (`setWords({ confirmLabel })`); Tanrei has none: without them an icon-only Button with the check glyph, unnamed. */
  confirmLabel = '';

  /** Cancel's label (`cancel-label`). This instance's words, else the product's (`setWords({ cancelLabel })`); Tanrei has none: without them an icon-only Button with the close glyph, unnamed. */
  cancelLabel = '';

  /** Passed to the calendar (`previous-month-label`). This instance's words, else the product's (`setWords({ previousMonthLabel })`); Tanrei has none: without them the button is drawn and works, unnamed. */
  previousMonthLabel = '';

  /** Passed to the calendar (`next-month-label`). This instance's words, else the product's (`setWords({ nextMonthLabel })`); Tanrei has none: without them the button is drawn and works, unnamed. */
  nextMonthLabel = '';

  /** Passed to the calendar (`year-view-label`). This instance's words, else the product's (`setWords({ yearViewLabel })`); Tanrei has none: without them the view toggle has no description. */
  yearViewLabel = '';

  /** Passed to the calendar (`today-label`). This instance's words, else the product's (`setWords({ todayLabel })`); Tanrei has none: without them the locale's own word for the present day, from the browser. */
  todayLabel = '';

  /** The accessible name of the hour wheel and the hour selector (`hour-label`). This instance's words, else the product's (`setWords({ hourLabel })`); Tanrei has none: without them the locale's own name for the hour, from the browser. */
  hourLabel = '';

  /** The accessible name of the minute wheel and the minute selector (`minute-label`). This instance's words, else the product's (`setWords({ minuteLabel })`); Tanrei has none: without them the locale's own name for the minute, from the browser. */
  minuteLabel = '';

  /** The accessible name of the entry-mode tab that shows the wheels, which draws the keyboard glyph alone (`wheels-label`). This instance's words, else the product's (`setWords({ wheelsLabel })`); Tanrei has none: without them the tab is drawn and works, unnamed. */
  wheelsLabel = '';

  /** The accessible name of the entry-mode tab that shows the dial, which draws the schedule glyph alone (`dial-label`). This instance's words, else the product's (`setWords({ dialLabel })`); Tanrei has none: without them the tab is drawn and works, unnamed. */
  dialLabel = '';

  /** The accessible name of the row of entry-mode tabs (`entry-mode-label`). This instance's words, else the product's (`setWords({ entryModeLabel })`); Tanrei has none: without them the row of tabs has no name. */
  entryModeLabel = '';

  /** The accessible name of the period — the period wheel or the period selector, a spin button (`period-label`). This instance's words, else the product's (`setWords({ periodLabel })`); Tanrei has none: without them the locale's own name for the day period, from the browser. */
  periodLabel = '';

  /** The accessible name of the range display, the group of the two range fields (`range-label`). This instance's words, else the product's (`setWords({ rangeLabel })`); Tanrei has none: without them the group has no name. */
  rangeLabel = '';

  /** Mode time with a range: added after the end's time, in its range field and its accessible name, while it falls on the next day (`next-day-label`). This instance's words, else the product's (`setWords({ nextDayLabel })`); Tanrei has none: without them "+1" in the locale's digits. */
  nextDayLabel = '';

  /** Mode date-time with a range: the error line while the end is before the start (`range-error-text`). This instance's words, else the product's (`setWords({ rangeErrorText })`); Tanrei has none: without them the line draws no words and keeps its height; OK is still disabled. */
  rangeErrorText = '';

  /** Docked: the id of the element the surface is placed against (as the menu's `anchor`), in the picker's own document or shadow root. */
  anchor = '';

  /** Docked: the id of the element that opens the picker, when it is not the anchor (a text field's picker button). It gets `aria-haspopup`, `aria-controls` and `aria-expanded`. */
  opener = '';

  /** For tests and documentation: draws the open surface in place (DTM-1's verify), without the overlay's behaviour. */
  inline = false;

  /** The choice shown, from opening to OK (DTM-6). */
  protected pending: Choice = NO_CHOICE;
  /** Which end the time section sets (DTM-15): `value` without a range. */
  protected editing: End = 'value';
  /** The entry mode shown (DTM-13). */
  protected entry: TanreiDateTimePickerEntryMode = 'wheels';
  /** The unit the dial shows (DTM-21). */
  protected shownUnit: Unit = 'hour';
  /** DTM-26: the handle's angle, kept continuous so that a change turns it along the shorter arc. */
  protected angle = 0;
  /** DTM-25: the handle moves without animation (a drag, or the picker just opened). */
  protected instant = true;
  /** DTM-34: the actions are a column. */
  protected stacked = false;
  /** DTM-19: a count that renders the wheels again while they follow a pointer. */
  protected wheelFrame = 0;
  /** DTM-43, DTM-44: the typed entry in progress — the wheel or the selector it is on, and the digits read so far. */
  protected typed: { unit: Unit; digits: string } | null = null;
  /**
   * DTM-44: the wheel that an hour's finished entry moved on to. Its input takes text — so that an on-screen keyboard
   * stays up — though no entry has begun on it: the next digit begins one.
   */
  protected armed: Unit | null = null;
  /**
   * DTM-20, DTM-47: the wheel — or the period, wheel or selector — whose focus is keyboard focus, and so shows its ring.
   * An input's own `:focus-visible` cannot tell, and whether a key pressed after a pointer press makes a focused element
   * match it is each browser's own guess: the picker keeps the answer itself, so every engine draws the same.
   */
  protected ringed: Unit | 'period' | null = null;
  /**
   * DTM-28: the range field whose focus is keyboard focus, kept by the picker for the same reason: after a press and
   * then Space or Enter one engine draws no ring on a button it still reads as focused by the pointer.
   */
  protected ringedEnd: RangeEnd | null = null;

  private cfg!: Config;
  private session = false;
  private shown = false;
  private presenting = false;
  private closeRequested = false;
  /** The choice the picker opened with, in the mode's form (DTM-6). */
  private openedWith: Record<End, string> = { value: '', start: '', end: '' };
  /** DTM-4: where focus was when it opened. */
  private returnTo: Element | null = null;
  private lastLayout = '';
  private listening = false;
  private pressedScrim = false;
  private dragging: number | null = null;
  /** DTM-33: the error line was shown at the last update (it is announced when it appears). */
  private errorShown = false;
  /** DTM-20: a press on a wheel is about to focus its input (no ring), or the next focus was asked to show one or not. */
  private wheelPress = false;
  private nextRing: boolean | null = null;
  /** DTM-45: the Escape that ended a typed entry closes nothing: when the key was pressed. */
  private escapeSpent = Number.NEGATIVE_INFINITY;
  /** DTM-45: how much of the window the on-screen keyboard covered at the last look. */
  private keyboard = 0;
  private readonly wheels: Record<Unit, WheelMotion> = {
    hour: { at: 0, shift: 0, pointer: null, startY: 0, moved: false, samples: [], settling: 0, scrolling: 0 },
    minute: { at: 0, shift: 0, pointer: null, startY: 0, moved: false, samples: [], settling: 0, scrolling: 0 },
  };
  /** DTM-46: the period wheel — its rows' position is 0 before noon and 1 after, and never past either. */
  private readonly periodWheel: WheelMotion = { at: 0, shift: 0, pointer: null, startY: 0, moved: false, samples: [], settling: 0, scrolling: 0 };
  private readonly placement = new ActionPlacement(this);
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.arrange());

  /** DTM-29, DTM-30: each selector is pressed on its own (data-pressed, press-hold, the ripple). */
  private readonly presses: Record<Unit, PressController> = (() => {
    const part = (name: Unit) => () => this.renderRoot?.querySelector<HTMLElement>(`.selector[data-unit='${name}']`) ?? null;
    const press = (name: Unit) => new PressController(this, { container: part(name), holdCarrier: () => part(name)()?.querySelector('.value') ?? null, disabled: () => false });
    return { hour: press('hour'), minute: press('minute') };
  })();

  /** DTM-14: and the period selector, which answers a press as an unselected selector does. */
  private readonly periodPress = (() => {
    const part = () => this.renderRoot?.querySelector<HTMLElement>('.selector.period') ?? null;
    return new PressController(this, { container: part, holdCarrier: () => part()?.querySelector('.value') ?? null, disabled: () => false });
  })();

  /** DTM-29, DTM-30: and each range field. */
  private readonly rangePresses: Record<RangeEnd, PressController> = (() => {
    const part = (name: RangeEnd) => () => this.renderRoot?.querySelector<HTMLElement>(`.range-field[data-end='${name}']`) ?? null;
    const press = (name: RangeEnd) => new PressController(this, { container: part(name), holdCarrier: () => part(name)()?.querySelector('.value') ?? null, disabled: () => false });
    return { start: press('start'), end: press('end') };
  })();

  constructor() {
    super();
    this.addEventListener('focusout', this.onFocusOut);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this.open) {
      this.requestUpdate();
      void this.updateComplete.then(() => this.present());
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize$?.disconnect();
    this.stopFollowing();
    this.listen(false);
    window.removeEventListener('resize', this.onWindow);
    if (this.shown) this.withdraw(false);
  }

  // ── Reading the props (DTM-16, DTM-17, DTM-38, DTM-40) ───────────────────────────────────────────────────────────

  private closed<T extends string>(values: readonly T[], value: T, fallback: T, name: string): T {
    if (values.includes(value)) return value;
    report(this, 'DTM-40', `${name} "${value}" is not a value the date-time picker defines; it behaves as "${fallback}"`);
    return fallback;
  }

  /** DTM-38: `locale`, else the nearest `lang` (through shadow roots), else the browser's language; English when `Intl` does not know it. */
  private resolveLocale(): string {
    const tag = this.locale.trim();
    if (!tag) return ambientLocale(this);
    const known = supportedLocale(tag);
    if (!known) report(this, 'DTM-38', `locale "${tag}" is not a BCP 47 tag this browser knows; it uses "${FALLBACK_LOCALE}"`);
    return known ?? FALLBACK_LOCALE;
  }

  /** DTM-8, DTM-40: a value in the mode's form as a moment, or null (reported) when it is not one. */
  private parseMoment(name: string, text: string, mode: TanreiDateTimePickerMode): Moment | null {
    if (!text) return null;
    let moment: Moment | null = null;
    if (mode === 'date') {
      const date = parseIsoDate(text);
      moment = date ? { date, time: null } : null;
    } else if (mode === 'time') {
      const time = parseClockTime(text);
      moment = time ? { date: null, time } : null;
    } else {
      const [date, time, ...rest] = text.split('T');
      const d = parseIsoDate(date);
      const t = parseClockTime(time);
      moment = d && t && !rest.length ? { date: d, time: t } : null;
    }
    if (!moment) {
      const form = mode === 'date' ? 'YYYY-MM-DD' : mode === 'time' ? 'HH:MM' : 'YYYY-MM-DDTHH:MM';
      report(this, 'DTM-40', `${name} "${text}" is not in the ${mode} mode's form (${form}); it is ignored`);
    }
    return moment;
  }

  private readConfig(): Config {
    const presentation = this.closed(PRESENTATIONS, this.presentation, 'modal', 'presentation');
    const mode = this.closed(MODES, this.mode, 'date', 'mode');
    const hourCycle = this.closed(HOUR_CYCLES, this.hourCycle, 'locale', 'hourCycle');
    const entryMode = this.closed(ENTRY_MODES, this.entryMode, 'wheels', 'entryMode');
    const unit = this.closed(UNITS, this.unit, 'hour', 'unit');
    const layout = this.closed(LAYOUTS, this.layout, 'auto', 'layout');
    const firstDayOfWeek = this.closed(FIRST_DAYS as readonly string[], this.firstDayOfWeek, 'locale', 'firstDayOfWeek');
    const startView = this.closed(START_VIEWS as readonly string[], this.startView, 'day', 'startView');
    const range = !!this.range;
    const locale = this.resolveLocale();
    // A 12-hour clock needs the locale's own period names: Tanrei has no "AM" and "PM" of its own to stand in.
    const cycle = hourCycle === 'locale' ? localeHourCycle(locale) : clockFor(locale, hourCycle);
    const step = Number(this.minuteStep);
    const known = (MINUTE_STEPS as readonly number[]).includes(step);
    if (!known) report(this, 'DTM-17', `minuteStep "${this.minuteStep}" is not 1, 5, 10, 15 or 30; it behaves as 1`);
    const isoDate = (name: string, text: string) => {
      if (!text) return '';
      if (parseIsoDate(text)) return text;
      report(this, 'DTM-40', `${name} "${text}" is not an ISO 8601 calendar date (YYYY-MM-DD); it is ignored`);
      return '';
    };
    const stepped = known ? step : 1;
    const { low, high } = this.readBounds(mode, stepped, isoDate);
    const today = isoDate('today', this.today);
    const disabledDates = (this.disabledDates ?? []).filter((entry) => isoDate('an entry of disabledDates', entry) !== '');
    let value = this.parseMoment('value', this.value, mode);
    let start = this.parseMoment('start', this.start, mode);
    let end = this.parseMoment('end', this.end, mode);
    if (range && value) {
      report(this, 'DTM-40', `value "${this.value}" is set while range is true, where the choice is start and end; it is ignored`);
      value = null;
    }
    if (!range && (start || end)) {
      report(this, 'DTM-40', 'start or end is set while range is false, where the choice is value; they are ignored');
      start = null;
      end = null;
    }
    if (start && end && mode !== 'time' && this.momentText(end, mode) < this.momentText(start, mode)) {
      report(this, 'DTM-40', `end "${this.end}" is before start "${this.start}"; the end is ignored`);
      end = null;
    }
    const committed: Choice = { value: value ?? EMPTY, start: start ?? EMPTY, end: end ?? EMPTY };
    const [min, max] = mode === 'time' ? ['', ''] : [low?.date ?? '', high?.date ?? ''];
    return { presentation, mode, range, cycle, step: stepped, entryMode, unit, layout, locale, min, max, low, high, today, disabledDates, firstDayOfWeek, startView, committed };
  }

  /**
   * DTM-40, DTM-49: min and max in the mode's form — a calendar date in mode date, a time in mode time, a date and time
   * or a calendar date in mode date-time — each a bound, min rounded up and max down to the step, so that the picker
   * offers no time the Text field it opens from refuses. Anything else is ignored and reported; both are ignored, and
   * reported, where min is after max or no time of the step lies between them.
   */
  private readBounds(mode: TanreiDateTimePickerMode, step: number, isoDate: (name: string, text: string) => string): { low: Bound | null; high: Bound | null } {
    const read = (name: 'min' | 'max', text: string): Bound | null => {
      if (!text) return null;
      if (mode === 'date') {
        const date = isoDate(name, text);
        return date ? { date, minutes: null } : null;
      }
      if (mode === 'time') {
        const time = parseClockTime(text);
        if (time) return { date: '', minutes: minutesOf(time) };
      } else {
        if (parseIsoDate(text)) return { date: text, minutes: null };
        const [date, time, ...rest] = text.split('T');
        const clock = parseClockTime(time);
        if (parseIsoDate(date) && clock && !rest.length) return { date, minutes: minutesOf(clock) };
      }
      const form = mode === 'time' ? 'a time of day (HH:MM)' : 'a date and time (YYYY-MM-DDTHH:MM) or a calendar date (YYYY-MM-DD)';
      report(this, 'DTM-40', `${name} "${text}" is not ${form}, the ${mode} mode's form; it is ignored`);
      return null;
    };
    // A bound's place in time; a calendar date's min is its first minute and its max its last.
    const at = (bound: Bound, fallback: number) => `${bound.date}T${String(bound.minutes ?? fallback).padStart(4, '0')}`;
    let low = read('min', this.min);
    let high = read('max', this.max);
    if (low && high && at(low, 0) > at(high, DAY_END)) {
      report(this, 'DTM-40', `min "${this.min}" is after max "${this.max}"; both are ignored`);
      return { low: null, high: null };
    }
    if (low && low.minutes !== null) {
      const minutes = Math.ceil(low.minutes / step) * step;
      // A min the step carries past the day's last minute: the earliest time offered is the next day's first.
      if (minutes > DAY_END) low = mode === 'time' ? { date: '', minutes: DAY_END + 1 } : { date: isoOf(addDays(parseIsoDate(low.date)!, 1)), minutes: 0 };
      else low = { ...low, minutes };
    }
    if (high && high.minutes !== null) high = { ...high, minutes: high.minutes - (high.minutes % step) };
    const empty = (low && low.minutes !== null && low.minutes > DAY_END) || (low && high && at(low, 0) > at(high, DAY_END));
    if (empty) {
      report(this, 'DTM-40', `no time of minuteStep ${step} lies between min "${this.min}" and max "${this.max}"; both are ignored`);
      return { low: null, high: null };
    }
    return { low, high };
  }

  /** DTM-8: a moment in the mode's form; `""` while a part the mode needs is missing. */
  private momentText(moment: Moment, mode = this.cfg.mode): string {
    if (mode === 'date') return moment.date ? isoOf(moment.date) : '';
    if (mode === 'time') return moment.time ? clockText(moment.time) : '';
    return moment.date && moment.time ? `${isoOf(moment.date)}T${clockText(moment.time)}` : '';
  }

  private detailOf(choice: Choice): TanreiDateTimePickerChangeDetail {
    return this.cfg.range
      ? { value: '', start: this.momentText(choice.start), end: this.momentText(choice.end) }
      : { value: this.momentText(choice.value), start: '', end: '' };
  }

  // ── The session: what a picker holds from opening to closing (DTM-6, DTM-8) ─────────────────────────────────────

  private get hasDate() {
    return this.cfg.mode !== 'time';
  }

  private get hasTime() {
    return this.cfg.mode !== 'date';
  }

  private get modal() {
    return this.cfg.presentation === 'modal';
  }

  /** DTM-6, DTM-7: whether the choice is pending until OK (every picker but a docked one for a date only). */
  private get pendingUntilOk() {
    return this.modal || this.hasTime;
  }

  /** DTM-13: the entry modes the design system offers, read from the cascade now. */
  private get offered(): (typeof OFFERED)[number] {
    return compChoice(this, `${PREFIX}-time-entry-modes`, OFFERED);
  }

  /** The entry mode shown: the one chosen, or the only one offered (DTM-13). */
  private get shownEntry(): TanreiDateTimePickerEntryMode {
    const offered = this.offered;
    return offered === 'both' ? this.entry : offered;
  }

  private initSession() {
    this.session = true;
    this.cfg = this.readConfig();
    const { committed, step, entryMode, unit, range } = this.cfg;
    this.openedWith = { value: this.momentText(committed.value), start: this.momentText(committed.start), end: this.momentText(committed.end) };
    // DTM-8: an empty time starts at the device's time; a minute off the step is rounded down to it.
    const now = roundDown(deviceTime(), step);
    const fill = (moment: Moment): Moment => (this.hasTime ? { ...moment, time: moment.time ? roundDown(moment.time, step) : now } : moment);
    this.pending = { value: fill(committed.value), start: fill(committed.start), end: fill(committed.end) };
    // DTM-49: a value, or the device's time, outside min and max starts at the nearer bound.
    this.keepWithin();
    this.editing = range ? 'start' : 'value';
    this.entry = entryMode;
    this.shownUnit = unit;
    this.instant = true;
    this.angle = this.targetAngle();
    this.errorShown = false;
    this.typed = null;
    this.armed = null;
    this.ringed = null;
    for (const wheel of [...Object.values(this.wheels), this.periodWheel]) {
      clearTimeout(wheel.settling);
      clearTimeout(wheel.scrolling);
      Object.assign(wheel, { shift: 0, pointer: null, moved: false, samples: [], settling: 0, scrolling: 0 });
    }
    this.syncWheels(true);
  }

  /** The pending time of the end the time section sets. */
  private get time(): ClockTime {
    return this.pending[this.editing].time ?? { hour: 0, minute: 0 };
  }

  /** DTM-49: the pending time of the end the time section sets becomes `time`, moved into min and max where it lies outside them. */
  private setTime(time: ClockTime) {
    this.pending = { ...this.pending, [this.editing]: { ...this.pending[this.editing], time: this.within(time) } };
  }

  // ── The bounds of the time (DTM-49, DTM-50) ───────────────────────────────────────────────────────────────────────

  /**
   * DTM-49: the earliest and the latest time offered to `end`, in minutes of the day: min's and max's times in mode
   * time; in mode date-time a bound's time on the bound's own date only, and none before a date is chosen.
   */
  private timeRange(end: End = this.editing): [number, number] {
    const { mode, low, high } = this.cfg;
    if (mode === 'time') return [low?.minutes ?? 0, high?.minutes ?? DAY_END];
    const date = this.pending[end].date;
    if (mode !== 'date-time' || !date) return [0, DAY_END];
    const iso = isoOf(date);
    const on = (bound: Bound | null) => (bound && bound.minutes !== null && bound.date === iso ? bound.minutes : null);
    return [on(low) ?? 0, on(high) ?? DAY_END];
  }

  /** DTM-49: `time` moved into the times offered to `end` — the earliest where it is before them, the latest where after. */
  private within(time: ClockTime, end: End = this.editing): ClockTime {
    const [earliest, latest] = this.timeRange(end);
    const minutes = minutesOf(time);
    return minutes < earliest ? timeAt(earliest) : minutes > latest ? timeAt(latest) : time;
  }

  /** DTM-49: every end's pending time moved into the times offered to it (after a date or the bounds changed). */
  private keepWithin() {
    if (!this.hasTime) return;
    for (const end of ['value', 'start', 'end'] as const) {
      const time = this.pending[end].time;
      if (!time) continue;
      const kept = this.within(time, end);
      if (kept !== time) this.pending = { ...this.pending, [end]: { ...this.pending[end], time: kept } };
    }
  }

  /**
   * DTM-50: whether `time`'s value of `unit` can be chosen — an hour with at least one minute offered (the bounds are
   * on the step, so a minute the hour shares with them is one), a minute offered in its hour.
   */
  private offers(unit: Unit, time: ClockTime): boolean {
    const [earliest, latest] = this.timeRange();
    if (unit === 'minute') return minutesOf(time) >= earliest && minutesOf(time) <= latest;
    return time.hour * 60 + 59 >= earliest && time.hour * 60 <= latest;
  }

  /** DTM-50: whether a period (0 before noon, 1 after) has a time offered. */
  private offersPeriod(period: 0 | 1): boolean {
    const [earliest, latest] = this.timeRange();
    return period * 720 + 719 >= earliest && period * 720 <= latest;
  }

  /** DTM-50: the period's spin button's minimum and maximum — the periods that have a time offered. */
  private get periodReach(): [number, number] {
    const [before, after] = [this.offersPeriod(0), this.offersPeriod(1)];
    return [before || !after ? 0 : 1, after || !before ? 1 : 0];
  }

  /** DTM-50: the move from index `at` of a wheel to its nearest available row — none where it is one — back toward where it came from (`moved`) on a tie. */
  private toOffered(unit: Unit, at: number, moved: number): number {
    const n = this.values(unit).length;
    const back = moved > 0 ? -1 : 1;
    for (let k = 0; k <= n / 2; k++) {
      for (const d of k ? [back * k, -back * k] : [0]) if (this.offers(unit, this.withIndex(unit, at + d))) return d;
    }
    return 0;
  }

  /** DTM-6: OK is enabled while the pending choice is complete and a date-time range's end is not before its start. */
  private get confirmable(): boolean {
    const { range, mode } = this.cfg;
    if (!range) return this.momentText(this.pending.value) !== '';
    if (!this.momentText(this.pending.start) || !this.momentText(this.pending.end)) return false;
    return !(mode === 'date-time' && this.rangeError);
  }

  /** DTM-33: a date-time range whose pending end is before its start. */
  private get rangeError(): boolean {
    const { range, mode } = this.cfg;
    if (!range || mode !== 'date-time') return false;
    const [start, end] = [this.momentText(this.pending.start), this.momentText(this.pending.end)];
    return !!start && !!end && end < start;
  }

  /** DTM-33: a time range's end at or before its start falls on the next day. */
  private get nextDay(): boolean {
    const { range, mode } = this.cfg;
    const { start, end } = this.pending;
    if (!range || mode !== 'time' || !start.time || !end.time) return false;
    return end.time.hour * 60 + end.time.minute <= start.time.hour * 60 + start.time.minute;
  }

  // ── Committing and closing (DTM-5 … DTM-7) ────────────────────────────────────────────────────────────────────────

  /** DTM-6, DTM-7: the pending choice becomes the element's — `change` if it differs — then `close` with the reason. */
  private commit(reason: 'confirm' | 'select') {
    if (!this.open || this.closeRequested) return;
    const next = this.detailOf(this.pending);
    const before = this.pendingUntilOk ? this.openedWith : { value: this.value, start: this.start, end: this.end };
    const changed = this.cfg.range ? next.start !== before.start || next.end !== before.end : next.value !== before.value;
    if (changed) {
      if (this.cfg.range) {
        this.start = next.start;
        this.end = next.end;
      } else this.value = next.value;
      this.dispatchEvent(new CustomEvent<TanreiDateTimePickerChangeDetail>('change', { bubbles: true, composed: true, detail: next }));
    }
    this.requestClose(reason);
  }

  /** DTM-5: asks the product to close the picker, once, with the reason. */
  private requestClose(reason: TanreiDateTimePickerCloseReason) {
    if (!this.open || this.closeRequested) return;
    this.closeRequested = true;
    this.dispatchEvent(new CustomEvent<TanreiDateTimePickerCloseDetail>('close', { detail: { reason } }));
  }

  private readonly onConfirm = () => {
    if (this.confirmable) this.commit('confirm');
  };

  private readonly onCancel = () => this.requestClose('cancel');

  // ── The calendar (DTM-11) ─────────────────────────────────────────────────────────────────────────────────────────

  private readonly onCalendarChange = (event: Event) => {
    event.stopPropagation();
    const detail = (event as CustomEvent<TanreiCalendarChangeDetail>).detail;
    const { range } = this.cfg;
    const date = (text: string) => parseIsoDate(text);
    if (!range) this.pending = { ...this.pending, value: { ...this.pending.value, date: date(detail.value) } };
    else {
      this.pending = { ...this.pending, start: { ...this.pending.start, date: date(detail.start) }, end: { ...this.pending.end, date: date(detail.end) } };
      // DTM-11: a chosen start selects the start's range field, a chosen end the end's.
      if (this.hasTime) this.selectEnd(detail.end ? 'end' : 'start');
    }
    // DTM-49: a date that is a bound's own date moves a pending time outside the bound into it.
    this.keepWithin();
    // DTM-7: a docked picker for a date only commits a completed choice (any day; a range's end).
    if (!this.pendingUntilOk && (!range || detail.end)) this.commit('select');
  };

  // ── The entry-mode tabs and the range fields (DTM-13, DTM-15, DTM-42) ─────────────────────────────────────────────

  private readonly onEntryTabs = (event: CustomEvent<{ value: string }>) => {
    event.stopPropagation();
    const next = event.detail.value === 'dial' ? 'dial' : 'wheels';
    if (next === this.entry) return;
    // DTM-13: a typed entry ends first, keeping what it read.
    this.endEntry(true);
    this.armed = null;
    this.entry = next;
    this.instant = true;
    this.syncWheels(true);
  };

  /**
   * DTM-42: the range field of `end` becomes the selected one — the wheels, the time display, the period and the
   * dial show and set that end's pending time (moving to it, DTM-26). A typed entry ends first; no pending time changes
   * and nothing is emitted. Selecting the selected one changes nothing.
   */
  private selectEnd(end: RangeEnd) {
    if (this.editing === end) return;
    this.endEntry(true);
    this.instant = false;
    this.editing = end;
  }

  /** DTM-42: a press, Enter or Space on a range field selects it (a native button's click); focus alone does not. */
  private readonly rangeHandlers = (end: RangeEnd) => {
    const press = this.rangePresses[end];
    return {
      onClick: () => this.selectEnd(end),
      onPointerDown: (event: PointerEvent) => press.onPointerDown(event),
      /** DTM-28: a key that works the field makes its focus keyboard focus, however focus first reached it. */
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') this.ringedEnd = end;
        press.onKeyDown(event);
      },
      /** DTM-28: the field shows its ring for keyboard focus only — what the browser says of how focus arrived. */
      onFocus: (event: FocusEvent) => {
        const control = event.currentTarget as HTMLElement;
        syncFocusStyle(this, control);
        this.ringedEnd = control.matches(':focus-visible') ? end : this.ringedEnd === end ? null : this.ringedEnd;
      },
      onBlur: () => {
        if (this.ringedEnd === end) this.ringedEnd = null;
        press.onBlur();
      },
    };
  };
  private readonly startHandlers = this.rangeHandlers('start');
  private readonly endHandlers = this.rangeHandlers('end');

  // ── Values of the clock (DTM-16, DTM-17) ──────────────────────────────────────────────────────────────────────────

  /** The hours of the clock in use, as drawn: 1–12, or 0–23. */
  private get hourValues(): number[] {
    return this.cfg.cycle === 'h12' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
  }

  private get minuteValues(): number[] {
    return stepMinutes(this.cfg.step);
  }

  private values(unit: Unit): number[] {
    return unit === 'hour' ? this.hourValues : this.minuteValues;
  }

  /** The index in its list of the pending value of `unit`. */
  private indexOf(unit: Unit, time = this.time): number {
    if (unit === 'minute') return Math.max(0, this.minuteValues.indexOf(time.minute - (time.minute % this.cfg.step)));
    return this.cfg.cycle === 'h12' ? shownHour12(time.hour) - 1 : time.hour;
  }

  /** The time with `unit` set to the list's entry at `index` (the period kept: DTM-19, DTM-20). */
  private withIndex(unit: Unit, index: number, time = this.time): ClockTime {
    const values = this.values(unit);
    const value = values[mod(index, values.length)];
    if (unit === 'minute') return { ...time, minute: value };
    return { ...time, hour: this.cfg.cycle === 'h12' ? hourOf12(value, periodOf(time.hour)) : value };
  }

  /**
   * DTM-20, DTM-22: the keys of a wheel or a selector, over the available values only (DTM-50): Up and Down the next
   * and the previous available one, wrapping past the unavailable ones; Page Up and Page Down five on, or the available
   * value nearest that on the way; Home and End the first and the last available. Returns the new time — the pending
   * one where nothing is available that way — or null for a key that is not theirs.
   */
  private keyTime(unit: Unit, key: string): ClockTime | null {
    const index = this.indexOf(unit);
    const n = this.values(unit).length;
    const pageable = unit === 'minute' && this.cfg.step === 1;
    const offered = (at: number) => {
      const time = this.withIndex(unit, at);
      return this.offers(unit, time) ? time : null;
    };
    /** The first available value of `count`, from `from` on in the direction `by`. */
    const scan = (from: number, by: 1 | -1, count: number) => {
      for (let k = 0; k < count; k++) {
        const time = offered(from + by * k);
        if (time) return time;
      }
      return this.time;
    };
    const page = (by: 1 | -1) => {
      for (let k = 5; k >= 1; k--) {
        const time = offered(index + by * k);
        if (time) return time;
      }
      return this.time;
    };
    switch (key) {
      case 'ArrowUp':
        return scan(index + 1, 1, n - 1);
      case 'ArrowDown':
        return scan(index - 1, -1, n - 1);
      case 'PageUp':
        return pageable ? page(1) : null;
      case 'PageDown':
        return pageable ? page(-1) : null;
      case 'Home':
        return scan(0, 1, n);
      case 'End':
        return scan(n - 1, -1, n);
      default:
        return null;
    }
  }

  /** DTM-20, DTM-22: a spin button's value as drawn, the hour with the period's name in the 12-hour clock ("7 AM"). */
  private valueText(unit: Unit): string {
    const { locale, cycle } = this.cfg;
    const time = this.time;
    if (unit === 'minute') return minuteText(locale, time.minute);
    const hour = hourText(locale, cycle, time.hour);
    if (cycle !== 'h12') return hour;
    const period = periodNames(locale)[periodOf(time.hour)];
    return periodPlace(locale) === 'before' ? `${period} ${hour}` : `${hour} ${period}`;
  }

  /** DTM-20, DTM-22, DTM-50: a spin button's value, and as its minimum and maximum the smallest and the largest available value. */
  private spinAria(unit: Unit) {
    const values = this.values(unit);
    const time = this.time;
    const now = unit === 'minute' ? time.minute : this.cfg.cycle === 'h12' ? shownHour12(time.hour) : time.hour;
    const available = values.filter((_, index) => this.offers(unit, this.withIndex(unit, index)));
    const reach = available.length ? available : values;
    return { now, min: Math.min(...reach), max: Math.max(...reach), text: this.valueText(unit) };
  }

  // ── The wheels (DTM-18 … DTM-20) ──────────────────────────────────────────────────────────────────────────────────

  /** Brings each wheel's rows to its pending value, along the shorter way, unless a pointer or a settle is moving it. */
  private syncWheels(jump = false) {
    for (const unit of ['hour', 'minute'] as const) {
      const wheel = this.wheels[unit];
      if (wheel.pointer !== null || wheel.settling || wheel.scrolling) continue;
      const n = this.values(unit).length;
      const target = this.indexOf(unit);
      wheel.at = jump ? target : wheel.at + shortest(mod(wheel.at, n), target, n);
    }
    // DTM-46: the period wheel does not run on: its rows are at the pending period's.
    const period = this.periodWheel;
    if (period.pointer === null && !period.settling && !period.scrolling) period.at = periodOf(this.time.hour);
  }

  /** The wheel an event of its own, or of its input, is about. */
  /** A wheel's rows at its pending value now, along the shorter way — also while a pointer holds it: what a drag or a scroll that ended a typed entry goes on from (DTM-45). */
  private alignWheel(unit: Unit) {
    const wheel = this.wheels[unit];
    const n = this.values(unit).length;
    wheel.at += shortest(mod(wheel.at, n), this.indexOf(unit), n);
  }

  private wheelOf(event: Event): { unit: Unit; element: HTMLElement } | null {
    const element = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.wheel') ?? null;
    const unit = element?.dataset.unit as Unit | undefined;
    return element && unit ? { unit, element } : null;
  }

  /** A wheel's control: the input on its middle row (DTM-20, DTM-43). */
  private spin(unit: Unit): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>(`.wheel[data-unit='${unit}'] .entry`) ?? null;
  }

  /** The height of a row in px (row.height, at least the target: DTM-32), and the settle's duration in ms (DTM-19). */
  private rowMetrics(element: HTMLElement): { row: number; duration: number } {
    const probe = element.querySelector<HTMLElement>('.row') ?? element;
    const style = getComputedStyle(probe);
    const row = probe.getBoundingClientRect().height || Number.parseFloat(style.blockSize) || 1;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return { row, duration: reduced ? 0 : (Number.parseFloat(style.transitionDuration) || 0) * 1000 };
  }

  /** DTM-19: the rows settle `rows` rows on (a drag's end, a fling, a press on a row) and the value is taken once they have. */
  private settle(unit: Unit, element: HTMLElement, rows: number) {
    const wheel = this.wheels[unit];
    const { duration } = this.rowMetrics(element);
    wheel.at += rows;
    // DTM-50: a row outside min and max is passed by — the rows settle on the nearest available one.
    wheel.at += this.toOffered(unit, wheel.at, rows);
    wheel.shift = 0;
    wheel.pointer = null;
    clearTimeout(wheel.settling);
    const take = () => {
      wheel.settling = 0;
      const time = this.withIndex(unit, wheel.at);
      if (clockText(time) !== clockText(this.time)) this.setTime(time);
      this.wheelFrame++;
    };
    if (duration <= 0) take();
    else wheel.settling = window.setTimeout(take, duration);
    this.wheelFrame++;
  }

  private readonly onWheelPointerDown = (event: PointerEvent) => {
    const found = this.wheelOf(event);
    if (!found || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const wheel = this.wheels[found.unit];
    if (wheel.pointer !== null) return;
    // DTM-45: a press on another wheel is a press elsewhere, and ends a typed entry.
    if (this.typed && this.typed.unit !== found.unit) this.endEntry(true);
    // DTM-20: the wheel takes focus on its input, whichever row is pressed, and a pressed wheel shows no ring.
    this.wheelPress = true;
    const input = this.spin(found.unit);
    if (input && deepActive() !== input) {
      this.nextRing = false;
      input.focus({ preventScroll: true });
    }
    // A press on a wheel starts a drag (DTM-20): it draws no press state.
    clearTimeout(wheel.settling);
    if (wheel.settling) {
      wheel.settling = 0;
      this.setTime(this.withIndex(found.unit, wheel.at));
    }
    wheel.pointer = event.pointerId;
    wheel.startY = event.clientY;
    wheel.moved = false;
    wheel.shift = 0;
    wheel.samples = [{ y: event.clientY, t: event.timeStamp }];
    found.element.setPointerCapture?.(event.pointerId);
  };

  private readonly onWheelPointerMove = (event: PointerEvent) => {
    const found = this.wheelOf(event);
    if (!found) return;
    const wheel = this.wheels[found.unit];
    if (wheel.pointer !== event.pointerId) return;
    const dy = event.clientY - wheel.startY;
    if (!wheel.moved && Math.abs(dy) <= SHEET_TOUCH_SLOP) return;
    // DTM-45: a wheel that is dragged ends its typed entry, keeping what it read.
    if (!wheel.moved && this.typed?.unit === found.unit) {
      this.endEntry(true);
      this.alignWheel(found.unit);
    }
    wheel.moved = true;
    const { row } = this.rowMetrics(found.element);
    // DTM-19: the rows move with the pointer; a drag upward brings the next values to the band.
    wheel.shift = -dy / row;
    wheel.samples = [...wheel.samples.filter((s) => event.timeStamp - s.t <= VELOCITY_WINDOW), { y: event.clientY, t: event.timeStamp }];
    this.wheelFrame++;
  };

  private readonly onWheelPointerUp = (event: PointerEvent) => {
    const found = this.wheelOf(event);
    if (!found) return;
    const wheel = this.wheels[found.unit];
    if (wheel.pointer !== event.pointerId) return;
    const { row, duration } = this.rowMetrics(found.element);
    this.wheelPress = false;
    if (!wheel.moved) {
      // DTM-19: a press on a row above or below the selection container settles that row on it; one on the middle row
      // that ends without a drag begins a typed entry (DTM-43).
      const box = found.element.getBoundingClientRect();
      const rows = Math.round((event.clientY - (box.top + box.height / 2)) / row);
      wheel.pointer = null;
      if (rows !== 0) {
        this.endEntry(true);
        this.settle(found.unit, found.element, rows);
      } else this.beginEntry(found.unit, { raise: true });
      return;
    }
    // DTM-19: a fling carries on and slows down (none where motion is reduced), then the nearest row settles.
    const first = wheel.samples[0];
    const velocity = first && event.timeStamp > first.t ? (event.clientY - first.y) / (event.timeStamp - first.t) : 0;
    const carry = duration > 0 ? (-velocity * duration) / 2 / row : 0;
    this.settle(found.unit, found.element, Math.round(wheel.shift + carry));
  };

  private readonly onWheelPointerCancel = (event: PointerEvent) => {
    const found = this.wheelOf(event);
    if (!found) return;
    const wheel = this.wheels[found.unit];
    if (wheel.pointer !== event.pointerId) return;
    this.wheelPress = false;
    this.settle(found.unit, found.element, Math.round(wheel.shift));
  };

  /** A press on a row of a wheel keeps the focus on the wheel's input: the rows take none, and the page gets none. */
  private readonly onWheelMouseDown = (event: MouseEvent) => {
    if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
  };

  /** DTM-19: a scroll moves the rows; when it stops, the nearest row settles. */
  private readonly onWheelScroll = (event: WheelEvent) => {
    const found = this.wheelOf(event);
    if (!found || event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    // DTM-45: a wheel that is scrolled ends its typed entry, keeping what it read.
    if (this.typed?.unit === found.unit) {
      this.endEntry(true);
      this.alignWheel(found.unit);
    }
    const wheel = this.wheels[found.unit];
    const { row } = this.rowMetrics(found.element);
    const pixels = event.deltaMode === 1 ? event.deltaY * row : event.deltaMode === 2 ? event.deltaY * row * 5 : event.deltaY;
    clearTimeout(wheel.settling);
    wheel.settling = 0;
    wheel.shift += pixels / row;
    clearTimeout(wheel.scrolling);
    wheel.scrolling = window.setTimeout(() => {
      wheel.scrolling = 0;
      this.settle(found.unit, found.element, Math.round(wheel.shift));
    }, WHEEL_QUIET);
    this.wheelFrame++;
  };

  /**
   * DTM-20: the keys of a wheel; the rows move over the wheel motion. DTM-43 … DTM-45: a digit begins or goes on with
   * a typed entry, and while one lasts the keys that move the wheel end it first, keeping what it read.
   */
  private readonly onWheelKeyDown = (event: KeyboardEvent) => {
    const found = this.wheelOf(event);
    if (!found || event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.entryKey(found.unit, event)) return this.ringKeyed();
    if (event.key === 'Enter' && this.armed === found.unit) {
      // The keyboard's action key on a wheel that only waits for a digit: it stops waiting.
      event.preventDefault();
      this.armed = null;
      return this.ringKeyed();
    }
    if (!this.keyTime(found.unit, event.key)) return;
    this.ringKeyed();
    event.preventDefault();
    this.endEntry(true);
    const next = this.keyTime(found.unit, event.key)!;
    const wheel = this.wheels[found.unit];
    clearTimeout(wheel.settling);
    wheel.settling = 0;
    this.setTime(next);
  };

  /**
   * DTM-20: a wheel shows its ring for focus from the keyboard only. Its control is a text input, which matches
   * `:focus-visible` however it was focused, so the wheel says itself: no ring after a press on it, the ring it was
   * asked for when the picker moved the focus, and the ring otherwise (Tab).
   */
  private readonly onSpinFocus = (event: FocusEvent) => {
    const input = event.currentTarget as HTMLInputElement;
    syncFocusStyle(this, input);
    const unit = input.dataset.unit as Unit;
    const ring = this.nextRing ?? !this.wheelPress;
    this.nextRing = null;
    this.ringed = ring ? unit : this.ringed === unit ? null : this.ringed;
  };

  /**
   * DTM-20: a wheel that has just been worked by the keyboard — a digit, a key that moves it, a key that ends its entry,
   * text from an on-screen keyboard — holds keyboard focus from then on, however focus first reached it: the wheel that
   * has focus now shows its ring. So the minute wheel shows where focus is once the hour's entry has moved on to it
   * (DTM-44), and a wheel whose entry has ended still does, where a press on it had shown none.
   */
  private ringKeyed() {
    const active = deepActive();
    if (!(active instanceof HTMLInputElement) || !active.classList.contains('entry') || active.getRootNode() !== this.renderRoot) return;
    const unit = active.dataset.unit as Unit | undefined;
    if (unit === 'hour' || unit === 'minute') this.ringed = unit;
  }

  /** DTM-45: focus leaving a wheel ends its typed entry, keeping what it read. */
  private readonly onSpinBlur = (event: FocusEvent) => {
    const unit = (event.currentTarget as HTMLInputElement).dataset.unit as Unit;
    if (this.typed?.unit === unit) this.endEntry(true);
    if (this.armed === unit) this.armed = null;
    if (this.ringed === unit) this.ringed = null;
  };

  /**
   * DTM-44: text that reaches a wheel's input without a key the picker read — an on-screen keyboard's digits, a paste —
   * is read as its characters typed in order. The input itself shows only what the entry holds.
   */
  private readonly onSpinInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const unit = input.dataset.unit as Unit;
    const digits = this.typed?.unit === unit ? this.typed.digits : '';
    const held = [...this.typedText(digits)];
    const text = [...input.value];
    input.value = held.join('');
    if ((event as InputEvent).inputType === 'insertLineBreak') {
      this.endEntry(true);
      this.armed = null;
    } else if (text.length < held.length) this.typed = this.typed && { ...this.typed, digits: digits.slice(0, text.length) };
    else this.readTyped(unit, (held.every((char, i) => text[i] === char) ? text.slice(held.length) : text).join(''));
    this.ringKeyed();
  };

  // ── Typing a number into a wheel or a selector (DTM-22, DTM-43 … DTM-45) ─────────────────────────────────────────

  /** The digits read so far as they are shown: in the locale's digits, as the values around them are (DTM-44). */
  private typedText(digits: string): string {
    return [...digits].map((digit) => numberText(this.cfg.locale, Number(digit))).join('');
  }

  /** The digit a typed character is, ASCII or the locale's (DTM-44); null for any other character. */
  private digitOf(char: string): number | null {
    const ascii = asciiDigits(this.cfg.locale, char);
    return /^[0-9]$/.test(ascii) ? Number(ascii) : null;
  }

  /** Whether `value` is a value of `unit`: an hour of the clock in use, or a minute (DTM-44). */
  private isValue(unit: Unit, value: number): boolean {
    if (unit === 'minute') return value >= 0 && value <= 59;
    return this.cfg.cycle === 'h12' ? value >= 1 && value <= 12 : value >= 0 && value <= 23;
  }

  /** Whether a second digit could join `first` (DTM-44): not after 2–9 for the 12-hour hour, 3–9 for the 24-hour one, 6–9 for the minute. */
  private canJoin(unit: Unit, first: number): boolean {
    if (unit === 'minute') return first <= 5;
    return first <= (this.cfg.cycle === 'h12' ? 1 : 2);
  }

  /**
   * DTM-43: a typed entry begins on `unit`. In the wheels mode the wheel takes focus and its input takes text, so that
   * an on-screen keyboard comes up for it (`raise`: within the press that began it, where a platform asks for that).
   */
  private beginEntry(unit: Unit, { raise = false }: { raise?: boolean } = {}) {
    if (this.typed?.unit === unit) return;
    this.endEntry(true);
    this.typed = { unit, digits: '' };
    if (this.shownEntry !== 'wheels') return;
    const input = this.spin(unit);
    if (!input) return;
    input.readOnly = false;
    if (raise && deepActive() === input) {
      // Focused again, within the press: a keyboard that stayed down for a read-only input comes up for this one.
      this.nextRing = this.ringed === unit;
      input.blur();
      this.typed = { unit, digits: '' };
    }
    if (deepActive() !== input) {
      this.nextRing ??= false;
      input.focus({ preventScroll: true });
    }
  }

  /**
   * DTM-45: the typed entry ends. Kept, what it read becomes the pending value where it is a value of the unit — a
   * minute rounded down to minuteStep (DTM-8), an hour of the 12-hour clock in the pending period — and the wheel's rows
   * or the dial's handle move to it; nothing typed, or no value (0 alone for the 12-hour hour), keeps the value it had.
   */
  private endEntry(keep: boolean) {
    const typed = this.typed;
    if (!typed) return;
    this.typed = null;
    if (!keep || typed.digits === '') return;
    const value = Number(typed.digits);
    if (!this.isValue(typed.unit, value)) return;
    const time = this.time;
    const { cycle, step } = this.cfg;
    const next: ClockTime = typed.unit === 'minute' ? { ...time, minute: value - (value % step) } : { ...time, hour: cycle === 'h12' ? hourOf12(value, periodOf(time.hour)) : value };
    // DTM-50: a value outside min and max is not taken, as a number that is no value of the unit is not.
    if (clockText(next) === clockText(time) || !this.offers(typed.unit, next)) return;
    const wheel = this.wheels[typed.unit];
    clearTimeout(wheel.settling);
    wheel.settling = 0;
    this.instant = false;
    this.setTime(next);
  }

  /**
   * DTM-44: the hour's entry has ended by its digits or by a separator: focus moves to the minute — the minute wheel,
   * whose input takes text from now on (the next digit begins its entry), or the minute selector.
   */
  private moveOn() {
    if (this.shownEntry === 'wheels') {
      const input = this.spin('minute');
      if (!input) return;
      this.armed = 'minute';
      input.readOnly = false;
      // DTM-20: typing moved the focus, so it is keyboard focus — the minute wheel shows its ring, whether or not the
      // hour wheel, pressed, had shown one. Without it nothing would say where the next digit goes.
      this.nextRing = true;
      input.focus({ preventScroll: true });
      return;
    }
    const from = deepActive();
    const ring = from instanceof HTMLElement && from.matches(':focus-visible');
    this.renderRoot.querySelector<HTMLElement>(".selector[data-unit='minute']")?.focus({ focusVisible: ring } as FocusOptions);
  }

  /** DTM-44: reads `text` as typed on `unit`, character by character, each on the unit the one before left the entry at. */
  private readTyped(unit: Unit, text: string) {
    let at = unit;
    for (const char of text) at = this.readChar(at, char);
  }

  /** DTM-44: one typed character on `unit`. Returns the unit the next character is read on. */
  private readChar(unit: Unit, char: string): Unit {
    const digit = this.digitOf(char);
    if (digit === null) {
      // The separator between hours and minutes ends the hour's entry and moves on; every other character is ignored.
      if (unit !== 'hour' || this.typed?.unit !== 'hour' || ![timeSeparator(this.cfg.locale), ...SEPARATORS].includes(char)) return unit;
      this.endEntry(true);
      this.moveOn();
      return 'minute';
    }
    this.beginEntry(unit);
    const digits = `${this.typed!.digits}${digit}`;
    if (digits.length === 2 && !this.isValue(unit, Number(digits))) {
      // Only an hour can meet it (1 3 on the 12-hour clock): the hour ends with its first digit, and this one begins the minute.
      this.endEntry(true);
      this.moveOn();
      return this.readChar('minute', char);
    }
    this.typed = { unit, digits };
    if (digits.length < 2 && this.canJoin(unit, digit)) return unit;
    // Full, or a digit no second one could join: the entry ends, and an hour's moves on to the minute. The minute wheel
    // goes on taking text — the next digit begins its entry again — so that an on-screen keyboard stays up.
    this.endEntry(true);
    if (unit === 'hour') this.moveOn();
    else if (this.shownEntry === 'wheels') this.armed = 'minute';
    return 'minute';
  }

  /**
   * DTM-43 … DTM-45: a key on a wheel or a selector, as a typed entry reads it. A digit begins an entry or goes on with
   * it. While one lasts: Backspace removes the last digit; Enter ends it, keeping what it read, and presses nothing;
   * Escape ends it with the value it had and closes nothing; the separator moves an hour on to the minute; any other
   * character is ignored. Returns whether the key was the entry's.
   */
  private entryKey(unit: Unit, event: KeyboardEvent): boolean {
    const typing = this.typed?.unit === unit;
    if (event.key.length === 1 && this.digitOf(event.key) !== null) {
      event.preventDefault();
      this.readChar(unit, event.key);
      return true;
    }
    if (!typing) return false;
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.typed = { unit, digits: this.typed!.digits.slice(0, -1) };
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.endEntry(true);
      this.armed = null;
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.escapeSpent = event.timeStamp;
      this.endEntry(false);
      this.armed = null;
      return true;
    }
    if (event.key.length !== 1) return false;
    event.preventDefault();
    this.readChar(unit, event.key);
    return true;
  }

  // ── The period (DTM-14, DTM-46, DTM-47) ───────────────────────────────────────────────────────────────────────────

  /**
   * DTM-14, DTM-47: `period` (0 before noon, 1 after) becomes the pending period. The hour's number and the minute stay,
   * the dial's handle stays where it is (the same angle), and neither the unit the dial shows nor the selected selector
   * changes. A typed entry ends first, keeping what it read.
   */
  private setPeriod(period: 0 | 1) {
    this.endEntry(true);
    const time = this.time;
    // DTM-50: a period with no time between min and max is not taken.
    if (periodOf(time.hour) === period || !this.offersPeriod(period)) return;
    this.setTime({ ...time, hour: hourOf12(shownHour12(time.hour), period) });
  }

  /**
   * DTM-47: the keys of the period — Up and Down change it (it has two values), and on the period selector Right and
   * Left too, in every layout direction; Home is before noon, End after; Enter and Space do what Up does; the first
   * letter of a period's name in the locale (A or P in English) sets that period, and where the two names begin with
   * the same letter (午前, 午後) it changes the period, as a browser's own time field does. Returns the period the key
   * asks for, or null for a key that is not the period's (a digit or any other letter is ignored).
   */
  private periodKey(event: KeyboardEvent, sideways: boolean): 0 | 1 | null {
    if (event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.isComposing || event.keyCode === 229) return null;
    const now = periodOf(this.time.hour);
    const other: 0 | 1 = now ? 0 : 1;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        return other;
      case 'ArrowRight':
      case 'ArrowLeft':
        return sideways ? other : null;
      case 'Home':
        return 0;
      case 'End':
        return 1;
      default:
        return this.periodByInitial(event.key, other);
    }
  }

  /**
   * DTM-47: the period whose name in the locale begins with the typed character — compared without case, in the
   * locale's own casing — or `other` where both names begin with it; null for a character neither begins with, and for
   * a key that is no character.
   */
  private periodByInitial(key: string, other: 0 | 1): 0 | 1 | null {
    if ([...key].length !== 1 || !key.trim()) return null;
    const locale = this.cfg.locale;
    const lower = (text: string) => {
      try {
        return text.toLocaleLowerCase(locale || undefined);
      } catch {
        return text.toLowerCase();
      }
    };
    const typed = lower(key);
    const begins = periodNames(locale).map((name) => {
      const first = [...name.trim()][0];
      return first !== undefined && lower(first) === typed;
    });
    if (begins[0] && begins[1]) return other;
    if (begins[0]) return 0;
    if (begins[1]) return 1;
    return null;
  }

  /** DTM-14: the period selector — a press, Enter or Space changes it to the other period; it shows no unit and is never selected. */
  private readonly periodHandlers = {
    onPointerDown: (event: PointerEvent) => {
      // DTM-45: a press ends a typed entry, keeping what it read.
      this.endEntry(true);
      this.periodPress.onPointerDown(event);
    },
    onClick: () => this.setPeriod(periodOf(this.time.hour) ? 0 : 1),
    onKeyDown: (event: KeyboardEvent) => {
      const period = this.periodKey(event, true);
      if (period === null) return;
      event.preventDefault();
      this.ringPeriod();
      if (event.repeat && (event.key === 'Enter' || event.key === ' ')) return;
      this.periodPress.onKeyDown(event);
      this.setPeriod(period);
    },
    /**
     * DTM-47: the period shows its ring for keyboard focus only — what the picker asked for when it moved the focus
     * (none after a press on the period wheel), otherwise what the browser says of how focus arrived (Tab, or a press).
     */
    onFocus: (event: FocusEvent) => {
      const control = event.currentTarget as HTMLElement;
      syncFocusStyle(this, control);
      const ring = this.nextRing ?? control.matches(':focus-visible');
      this.nextRing = null;
      this.ringed = ring ? 'period' : this.ringed === 'period' ? null : this.ringed;
    },
    onBlur: () => {
      if (this.ringed === 'period') this.ringed = null;
    },
  };

  /**
   * DTM-47, as DTM-20 for the other wheels: a key that works the period makes its focus keyboard focus, however focus
   * first reached it — after a press and then an arrow, the ring says where focus is.
   */
  private ringPeriod() {
    this.ringed = 'period';
  }

  private get periodControl(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.wheel.period .entry') ?? null;
  }

  /** DTM-46: the period wheel's rows settle on `period` over the wheel motion, and the period is taken once they have. */
  private settlePeriod(element: HTMLElement, period: number) {
    const wheel = this.periodWheel;
    const { duration } = this.rowMetrics(element);
    wheel.at = Math.min(1, Math.max(0, Math.round(period)));
    // DTM-50: a name with no time between min and max is passed by — the rows settle back on the pending one.
    if (!this.offersPeriod(wheel.at ? 1 : 0)) wheel.at = periodOf(this.time.hour);
    wheel.shift = 0;
    wheel.pointer = null;
    clearTimeout(wheel.settling);
    const take = () => {
      wheel.settling = 0;
      this.setPeriod(wheel.at ? 1 : 0);
      this.wheelFrame++;
    };
    if (duration <= 0) take();
    else wheel.settling = window.setTimeout(take, duration);
    this.wheelFrame++;
  }

  /** DTM-46: how far the rows may be moved off their place, in rows: to the first name and to the last, and no further. */
  private periodShift(shift: number): number {
    const wheel = this.periodWheel;
    return Math.min(1 - wheel.at, Math.max(-wheel.at, shift));
  }

  private readonly onPeriodPointerDown = (event: PointerEvent) => {
    const element = event.currentTarget as HTMLElement;
    const wheel = this.periodWheel;
    if ((event.pointerType === 'mouse' && event.button !== 0) || wheel.pointer !== null) return;
    // DTM-45: a press on another wheel is a press elsewhere, and ends a typed entry.
    this.endEntry(true);
    // DTM-47: the wheel takes focus on its control, whichever row is pressed; a pressed wheel shows no ring.
    const control = this.periodControl;
    if (control && deepActive() !== control) {
      this.nextRing = false;
      control.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      this.nextRing = null;
    }
    clearTimeout(wheel.settling);
    if (wheel.settling) {
      wheel.settling = 0;
      this.setPeriod(wheel.at ? 1 : 0);
    }
    wheel.pointer = event.pointerId;
    wheel.startY = event.clientY;
    wheel.moved = false;
    wheel.shift = 0;
    wheel.samples = [{ y: event.clientY, t: event.timeStamp }];
    element.setPointerCapture?.(event.pointerId);
  };

  private readonly onPeriodPointerMove = (event: PointerEvent) => {
    const wheel = this.periodWheel;
    if (wheel.pointer !== event.pointerId) return;
    const dy = event.clientY - wheel.startY;
    if (!wheel.moved && Math.abs(dy) <= SHEET_TOUCH_SLOP) return;
    wheel.moved = true;
    const { row } = this.rowMetrics(event.currentTarget as HTMLElement);
    // DTM-46: the rows move with the pointer and stop at the first and the last name.
    wheel.shift = this.periodShift(-dy / row);
    wheel.samples = [...wheel.samples.filter((sample) => event.timeStamp - sample.t <= VELOCITY_WINDOW), { y: event.clientY, t: event.timeStamp }];
    this.wheelFrame++;
  };

  private readonly onPeriodPointerUp = (event: PointerEvent) => {
    const element = event.currentTarget as HTMLElement;
    const wheel = this.periodWheel;
    if (wheel.pointer !== event.pointerId) return;
    const { row, duration } = this.rowMetrics(element);
    if (!wheel.moved) {
      // DTM-46: a press on the other name's row settles it; a press on the middle row settles the other name too — the
      // period begins no typed entry, so the press begins none.
      const box = element.getBoundingClientRect();
      const rows = Math.round((event.clientY - (box.top + box.height / 2)) / row);
      this.settlePeriod(element, rows === 0 ? 1 - wheel.at : wheel.at + rows);
      return;
    }
    const first = wheel.samples[0];
    const velocity = first && event.timeStamp > first.t ? (event.clientY - first.y) / (event.timeStamp - first.t) : 0;
    const carry = duration > 0 ? (-velocity * duration) / 2 / row : 0;
    this.settlePeriod(element, wheel.at + wheel.shift + carry);
  };

  private readonly onPeriodPointerCancel = (event: PointerEvent) => {
    const wheel = this.periodWheel;
    if (wheel.pointer !== event.pointerId) return;
    this.settlePeriod(event.currentTarget as HTMLElement, wheel.at + wheel.shift);
  };

  /** DTM-46: a scroll moves the rows, to the first and the last name at most; when it stops, the nearer name settles. */
  private readonly onPeriodScroll = (event: WheelEvent) => {
    if (event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    this.endEntry(true);
    const element = event.currentTarget as HTMLElement;
    const wheel = this.periodWheel;
    const { row } = this.rowMetrics(element);
    const pixels = event.deltaMode === 0 ? event.deltaY : event.deltaY * row;
    clearTimeout(wheel.settling);
    wheel.settling = 0;
    wheel.shift = this.periodShift(wheel.shift + pixels / row);
    clearTimeout(wheel.scrolling);
    wheel.scrolling = window.setTimeout(() => {
      wheel.scrolling = 0;
      this.settlePeriod(element, wheel.at + wheel.shift);
    }, WHEEL_QUIET);
    this.wheelFrame++;
  };

  private readonly onPeriodKeyDown = (event: KeyboardEvent) => {
    const period = this.periodKey(event, false);
    if (period === null) return;
    event.preventDefault();
    this.ringPeriod();
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) return;
    const wheel = this.periodWheel;
    clearTimeout(wheel.settling);
    wheel.settling = 0;
    this.setPeriod(period);
  };

  // ── The dial mode: selectors and dial (DTM-21 … DTM-26) ───────────────────────────────────────────────────────────

  /** DTM-22: a selector focused or pressed shows its unit on the dial and is drawn as selected. */
  private showUnit(unit: Unit) {
    if (this.shownUnit === unit) return;
    this.instant = false;
    this.shownUnit = unit;
  }

  private readonly selectorHandlers = (unit: Unit) => {
    const press = this.presses[unit];
    return {
      onPointerDown: (event: PointerEvent) => {
        // DTM-45: a press ends a typed entry, keeping what it read.
        this.endEntry(true);
        press.onPointerDown(event);
        this.showUnit(unit);
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        // DTM-22: digits typed on a selector are read as a wheel's typed entry is; the dial mode raises no keyboard.
        if (this.entryKey(unit, event)) return;
        press.onKeyDown(event);
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.showUnit(unit);
          return;
        }
        // DTM-22: Right and Left as Up and Down (a time is written left to right in every direction).
        const key = event.key === 'ArrowRight' ? 'ArrowUp' : event.key === 'ArrowLeft' ? 'ArrowDown' : event.key;
        if (!this.keyTime(unit, key)) return;
        event.preventDefault();
        // DTM-45: the keys that move the value end a typed entry first, keeping what it read.
        this.endEntry(true);
        this.showUnit(unit);
        this.instant = false;
        this.setTime(this.keyTime(unit, key)!);
      },
      onFocus: (event: FocusEvent) => {
        syncFocusStyle(this, event.currentTarget as HTMLElement);
        if (!this.presenting) this.showUnit(unit);
      },
      onBlur: () => {
        press.onBlur();
        // DTM-45: focus leaving ends a typed entry, keeping what it read.
        if (this.typed?.unit === unit) this.endEntry(true);
      },
    };
  };

  private readonly hourHandlers = this.selectorHandlers('hour');
  private readonly minuteHandlers = this.selectorHandlers('minute');

  /** The angle of the pending value of the unit shown, clockwise from the top (0–359). */
  private targetAngle(): number {
    const { hour, minute } = this.time;
    return this.shownUnit === 'minute' ? minute * 6 : (hour % 12) * 30;
  }

  /** On the 24-hour hour dial, 12 to 23 are on the inner ring. */
  private get innerRing(): boolean {
    return this.shownUnit === 'hour' && this.cfg.cycle === 'h23' && this.time.hour >= 12;
  }

  /** DTM-25: the value under a point — the nearest angle's, on the nearer ring for the 24-hour hour dial, a minute of the step. */
  private setFromPoint(event: PointerEvent) {
    const dial = this.renderRoot.querySelector<HTMLElement>('.dial');
    if (!dial) return;
    const box = dial.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const degrees = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const time = this.time;
    /** How far apart two angles are, the shorter way round. */
    const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
    /** DTM-50: of the values one ring holds, the available one nearest the pointer's angle; null where none is. */
    const nearest = (candidates: { time: ClockTime; angle: number }[], unit: Unit) =>
      candidates.filter((c) => this.offers(unit, c.time)).sort((a, b) => apart(a.angle, degrees) - apart(b.angle, degrees))[0]?.time ?? null;
    if (this.shownUnit === 'minute') {
      const minute = nearest(
        this.minuteValues.map((value) => ({ time: { ...time, minute: value }, angle: value * 6 })),
        'minute',
      );
      if (minute) this.setTime(minute);
      return;
    }
    if (this.cfg.cycle === 'h12') {
      const hour = nearest(
        this.hourValues.map((value) => ({ time: { ...time, hour: hourOf12(value, periodOf(time.hour)) }, angle: (value % 12) * 30 })),
        'hour',
      );
      if (hour) this.setTime(hour);
      return;
    }
    const radius = (selector: string) => {
      const number = dial.querySelector(selector)?.getBoundingClientRect();
      return number ? Math.hypot(number.left + number.width / 2 - (box.left + box.width / 2), number.top + number.height / 2 - (box.top + box.height / 2)) : 0;
    };
    const distance = Math.hypot(dx, dy);
    const [inner, outer] = [radius('.face .hours .inner'), radius('.face .hours .outer')];
    const index = Math.round(degrees / 30) % 12;
    const ringHour = index + (Math.abs(distance - inner) < Math.abs(distance - outer) ? 12 : 0);
    if (this.offers('hour', { ...time, hour: ringHour })) {
      this.setTime({ ...time, hour: ringHour });
      return;
    }
    // DTM-50: the number under the pointer is unavailable — the available one nearest the pointer, on either ring.
    const point = (hour: number) => {
      const at = direction((hour % 12) * 30);
      const r = hour >= 12 ? inner : outer;
      return Math.hypot(at.x * r - dx, at.y * r - dy);
    };
    const hour = this.hourValues.filter((value) => this.offers('hour', { ...time, hour: value })).sort((a, b) => point(a) - point(b))[0];
    if (hour !== undefined) this.setTime({ ...time, hour });
  }

  private readonly onDialDown = (event: PointerEvent) => {
    if (this.dragging !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    // DTM-45: a press elsewhere in the picker ends a typed entry, keeping what it read.
    this.endEntry(true);
    // No focus change and no text selection: focus stays where it is (on a selector, DTM-25).
    event.preventDefault();
    this.dragging = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.instant = true;
    this.setFromPoint(event);
  };

  private readonly onDialMove = (event: PointerEvent) => {
    if (event.pointerId !== this.dragging) return;
    this.setFromPoint(event);
  };

  /** DTM-25: a press or drag on the hour dial ends — the minute dial, its selector selected, and focus moved there from the hour's. */
  private readonly onDialUp = (event: PointerEvent) => {
    if (event.pointerId !== this.dragging) return;
    this.dragging = null;
    this.instant = false;
    if (this.shownUnit !== 'hour') return;
    const hour = this.renderRoot.querySelector<HTMLElement>(".selector[data-unit='hour']");
    const hourHadFocus = !!hour && deepActive() === hour;
    this.shownUnit = 'minute';
    if (hourHadFocus) {
      const ring = hour.matches(':focus-visible');
      void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(".selector[data-unit='minute']")?.focus({ focusVisible: ring } as FocusOptions));
    }
  };

  private readonly onDialCancel = (event: PointerEvent) => {
    if (event.pointerId !== this.dragging) return;
    this.dragging = null;
    this.instant = false;
  };

  // ── Closing requests (DTM-5) ──────────────────────────────────────────────────────────────────────────────────────

  private element(id: string): HTMLElement | null {
    if (!id) return null;
    return ((this.getRootNode() as Document | ShadowRoot).getElementById?.(id) as HTMLElement | null) ?? null;
  }

  private get anchorElement(): HTMLElement | null {
    return this.element(this.anchor);
  }

  private get openerElement(): HTMLElement | null {
    return this.element(this.opener || this.anchor);
  }

  /** Whether `node` is the anchor or the opener, or inside one. */
  private atAnchor(node: Node | null): boolean {
    return [this.anchorElement, this.openerElement].some((element) => !!element && !!node && (element === node || element.contains(node) || !!element.shadowRoot?.contains(node)));
  }

  private get surface(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null;
  }

  /** DTM-5: Escape; Tab (the modal keeps focus in, the docked one lets it leave and closes). */
  private readonly onSurfaceKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // DTM-45: the Escape that ended a typed entry closes nothing.
      if (event.defaultPrevented || event.timeStamp === this.escapeSpent) return;
      event.preventDefault();
      event.stopPropagation();
      this.requestClose('escape');
      return;
    }
    if (event.key !== 'Tab' || this.inline) return;
    const surface = this.surface;
    if (!surface) return;
    if (this.modal) {
      trapFocus(event, surface);
      return;
    }
    const order = tabbables(surface);
    const active = deepActive();
    const at = (element: Element | undefined) => !!element && (active === element || (!!active && !!element.shadowRoot?.contains(active)));
    const leaving = order.length === 0 || (event.shiftKey ? at(order[0]) : at(order[order.length - 1]));
    if (!leaving) return;
    // Focus goes back first, so that the Tab's own move goes on from there, as it would have from the anchor; the surface,
    // still drawn while it closes, is inert, so that the move cannot land back in it.
    this.requestClose('tab');
    surface.inert = true;
    requestAnimationFrame(() => {
      if (this.open && this.shown) surface.inert = false;
    });
    this.returnFocus();
  };

  /** DTM-5: the native dialog's cancel is `escape` when an Escape key caused it, and the platform's `back` otherwise. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    // DTM-45: a close request the Escape of a typed entry still caused closes nothing — one press never both discards
    // a number and dismisses the surface.
    if (event.timeStamp - this.escapeSpent < 500) return;
    this.requestClose(closeRequestReason(event));
  };

  /** DTM-45: a press elsewhere in the picker — anywhere but the wheel or the selector the entry is on — ends a typed entry, keeping what it read. */
  private readonly onSurfacePointerDown = (event: PointerEvent) => {
    const typed = this.typed;
    if (!typed) return;
    const own = event.composedPath().some((node) => node instanceof HTMLElement && node.matches('.wheel, .selector') && node.dataset.unit === typed.unit);
    if (!own) this.endEntry(true);
  };

  /** DTM-5: a press that starts and ends on a modal picker's scrim. */
  private readonly onDialogPointerDown = (event: PointerEvent) => {
    this.onSurfacePointerDown(event);
    this.pressedScrim = this.onScrim(event);
  };

  private readonly onDialogClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && this.onScrim(event);
    this.pressedScrim = false;
    if (scrim) this.requestClose('outside');
  };

  private onScrim(event: MouseEvent): boolean {
    const surface = this.surface;
    if (!surface || this.inline || event.composedPath()[0] !== surface) return false;
    const box = surface.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  /** A press on something in the docked surface that takes no focus keeps focus where it is. */
  private readonly onSurfaceMouseDown = (event: MouseEvent) => {
    if (this.modal) return;
    const focusable = event
      .composedPath()
      .some((node) => node instanceof HTMLElement && node.matches('input, button, [tabindex], tanrei-button, tanrei-tab, tanrei-calendar, .wheel, .selector'));
    if (!focusable) event.preventDefault();
  };

  /** DTM-5: focus moving out of a docked picker — anywhere but its anchor and opener — asks to close. */
  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.open || this.inline || !this.cfg || this.modal) return;
    const to = event.relatedTarget as Node | null;
    if (!to || to === this || this.contains(to) || this.renderRoot.contains(to) || this.atAnchor(to)) return;
    if (to instanceof Element && (to.getRootNode() as ShadowRoot).host && this.renderRoot.contains((to.getRootNode() as ShadowRoot).host)) return;
    this.requestClose('focus-out');
  };

  /** DTM-5: a press outside a docked picker and its anchor asks to close; the press also reaches what is under it. */
  private readonly onOutsidePress = (event: PointerEvent) => {
    const path = event.composedPath();
    if (path.includes(this) || path.some((node) => node instanceof Node && this.atAnchor(node))) return;
    this.requestClose('outside');
  };

  private listen(on: boolean) {
    if (on === this.listening) return;
    this.listening = on;
    if (on) document.addEventListener('pointerdown', this.onOutsidePress, true);
    else document.removeEventListener('pointerdown', this.onOutsidePress, true);
  }

  // ── Presenting (DTM-1 … DTM-4, DTM-9, DTM-35 … DTM-37) ────────────────────────────────────────────────────────────

  /** DTM-2, DTM-36: a docked picker below its anchor (flipped, shifted, its height limited to the room), following it. */
  private place() {
    const surface = this.surface;
    if (!surface || this.inline || !this.shown || this.modal) return;
    const style = getComputedStyle(surface);
    const offset = Number.parseFloat(style.scrollMarginBlockStart) || 0;
    const margin = Number.parseFloat(style.scrollMarginBlockEnd) || 0;
    // Measured as it stands, never by lifting the cap (which would lay the body out without overflow and send a scrolled
    // calendar back to its top on every placement): the body is the part that scrolls under the cap (DTM-36), or the
    // surface itself where everything scrolls together.
    const scroller = surface.classList.contains('whole') ? surface : surface.querySelector<HTMLElement>('.body');
    const size = { width: layoutSize(surface).width, height: naturalHeight(surface, scroller) };
    const box = this.anchorElement?.getBoundingClientRect() ?? { x: margin, y: margin, width: 0, height: 0 };
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const at = placeMenu({ anchor: box, surface: size, viewport, placement: 'bottom-start', offset, margin, rtl: getComputedStyle(this).direction === 'rtl' });
    const left = size.width > viewport.width - 2 * margin ? Math.max(0, (viewport.width - size.width) / 2) : at.left;
    surface.style.top = `${at.top}px`;
    surface.style.left = `${left}px`;
    surface.style.maxBlockSize = `${at.maxHeight}px`;
    surface.classList.toggle('side-top', at.side === 'top');
  }

  /**
   * DTM-2: the docked container follows its anchor while it moves (scrolling, layout, the viewport) — asked by
   * FollowController when something can have moved, frame by frame only while something does.
   */
  private readonly follow = (): boolean => {
    const box = this.anchorElement?.getBoundingClientRect();
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    // DTM-41: the layout direction too — the start edges are aligned (DTM-2), so a change of it places the container again.
    const layout = `${box?.x},${box?.y},${box?.width},${box?.height},${document.documentElement.clientWidth},${document.documentElement.clientHeight},${body?.scrollHeight},${getComputedStyle(this).direction}`;
    if (layout === this.lastLayout) return false;
    this.lastLayout = layout;
    this.place();
    return true;
  };

  private readonly following = new FollowController(this, {
    followed: () => [this.anchorElement],
    sized: () => [this.surface, this.renderRoot?.querySelector('.body')],
    check: this.follow,
  });

  private stopFollowing() {
    this.following.stop();
    this.lastLayout = '';
  }

  /** DTM-1: above the on-screen keyboard; DTM-9: the layout is decided again when the window changes. */
  private readonly onWindow = () => {
    const cover = keyboardCover();
    this.surface?.style.setProperty('--_keyboard', `${cover}px`);
    // DTM-45: the on-screen keyboard dismissed ends a typed entry, keeping what it read.
    if (this.keyboard > 0 && cover === 0) {
      this.endEntry(true);
      this.armed = null;
    }
    this.keyboard = cover;
    this.arrange();
  };

  /**
   * DTM-9, DTM-34, DTM-36: the layout — vertical or horizontal as `layout` says; for auto, horizontal only when the
   * vertical one does not fit the window's height and the horizontal one fits its width — the actions in a row or a
   * column, and the whole surface scrolling as one when the header and the actions leave no room between them.
   */
  private arrange() {
    const surface = this.surface;
    const body = this.renderRoot?.querySelector<HTMLElement>('.body');
    if (!surface || !body || !this.session) return;
    surface.dataset.arrangement = compChoice(this, `${PREFIX}-actions-arrangement`, ARRANGEMENTS);
    const { layout } = this.cfg;
    const overflows = () => body.scrollHeight > body.clientHeight + 0.5;
    surface.classList.remove('whole');
    if (layout !== 'auto' || this.inline) surface.dataset.layout = layout === 'horizontal' ? 'horizontal' : 'vertical';
    else {
      surface.dataset.layout = 'vertical';
      if (overflows()) {
        surface.dataset.layout = 'horizontal';
        const fits = surface.scrollWidth <= surface.clientWidth + 0.5;
        if (!fits) surface.dataset.layout = 'vertical';
      }
    }
    const box = this.renderRoot.querySelector<HTMLElement>('.actions');
    if (box) {
      this.placement.read([...box.children]);
      const { changed } = this.placement.measure(box, surface.dataset.arrangement === 'end' ? 'packed' : 'fill');
      if (changed) this.stacked = this.placement.stacked;
    }
    const line = Number.parseFloat(getComputedStyle(body).getPropertyValue('--_line')) || 0;
    surface.classList.toggle('whole', overflows() && body.clientHeight < line);
  }

  /** DTM-1, DTM-2, DTM-3: the overlay is presented and focus moves in — when it opens, not when its motion ends. */
  private present() {
    const surface = this.surface;
    if (!surface || this.shown || !this.isConnected) return;
    if (this.inline) {
      // Drawn in place where the page wrote it, it is no overlay somebody opened, and takes no focus (DTM-3 speaks of a
      // picker that opens): the dialog is marked open, not shown — `show()` runs the dialog's focusing steps, which
      // moved focus into a picker nobody had touched and had the browser scroll the page to it.
      if (surface instanceof HTMLDialogElement && !surface.open) surface.open = true;
      this.arrange();
      return;
    }
    this.returnTo = deepActive();
    this.shown = true;
    surface.inert = false;
    this.presenting = true;
    try {
      if (surface instanceof HTMLDialogElement) {
        watchEscape();
        if (!surface.open) surface.showModal();
        modalLayer.add(this);
        holdPageScroll(this, true);
        window.visualViewport?.addEventListener('resize', this.onWindow);
      } else {
        surface.classList.remove('leaving');
        if (!surface.matches(':popover-open')) surface.showPopover();
        this.place();
        this.following.start();
        this.listen(true);
        surface.classList.remove('entering');
        void surface.offsetWidth; // restart the animation
        surface.classList.add('entering');
      }
    } finally {
      this.presenting = false;
    }
    window.addEventListener('resize', this.onWindow);
    this.onWindow();
    void this.focusInitial();
    // The handle is placed at once when the picker opens, and moves over the dial motion from the next frame on (DTM-26).
    requestAnimationFrame(() => requestAnimationFrame(() => (this.instant = this.dragging !== null)));
  }

  /**
   * DTM-3: focus to the calendar's active day (or displayed year), the hour wheel, or the selector of `unit`. The ring
   * shows when the picker was opened from the keyboard — from an element that showed its own keyboard focus — and not
   * when it was opened by a press or with the page.
   */
  private async focusInitial() {
    const from = this.returnTo;
    const options = { focusVisible: !!from && from !== document.body && from.matches(':focus-visible') } as FocusOptions;
    this.presenting = true;
    try {
      if (this.hasDate) {
        const calendar = this.renderRoot.querySelector<TanreiCalendar>('tanrei-calendar');
        if (calendar) {
          await calendar.updateComplete;
          calendar.focus(options);
        }
      } else if (this.shownEntry === 'wheels') {
        // DTM-3, DTM-43: the hour wheel takes focus; no entry begins and no keyboard comes up.
        this.nextRing = !!(options as { focusVisible?: boolean }).focusVisible;
        focusAgain(this.spin('hour'), options);
      }
      else focusAgain(this.renderRoot.querySelector<HTMLElement>(`.selector[data-unit='${this.shownUnit}']`), options);
    } finally {
      this.presenting = false;
    }
  }

  /** DTM-4: focus back where it was when the picker opened (the opener, then the anchor, when that is gone). */
  private returnFocus() {
    const candidates = [this.returnTo, this.openerElement, this.anchorElement];
    for (const element of candidates) {
      if (element instanceof HTMLElement && element.isConnected && !element.closest('[inert]') && element !== document.body) {
        element.focus();
        const now = deepActive();
        if (now === element || (!!now && (element.shadowRoot?.contains(now) || element.contains(now)))) return;
      }
    }
    // Nowhere to go back to: focus does not stay in a closed picker.
    const active = deepActive() as HTMLElement | null;
    if (active && this.inside(active)) active.blur();
  }

  /** Whether `node` is in the picker, its shadow root, or the shadow root of an element it draws. */
  private inside(node: Node): boolean {
    for (let at: Node | null = node; at; ) {
      if (at === this || this.renderRoot.contains(at)) return true;
      const root = at.getRootNode();
      at = root instanceof ShadowRoot ? root.host : null;
    }
    return false;
  }

  /** DTM-4, DTM-35: out of the top layer (fading), the page given back, focus back where it was if it was inside. */
  private withdraw(restoreFocus = true) {
    const surface = this.surface;
    if (!this.shown) return;
    this.shown = false;
    const active = deepActive();
    const inside = !!active && this.inside(active);
    this.stopFollowing();
    this.listen(false);
    window.removeEventListener('resize', this.onWindow);
    if (surface instanceof HTMLDialogElement) {
      modalLayer.delete(this);
      holdPageScroll(this, false);
      window.visualViewport?.removeEventListener('resize', this.onWindow);
      if (surface.open) surface.close();
    } else if (surface) {
      surface.classList.remove('entering');
      surface.classList.add('leaving');
      const finish = () => {
        if (this.open || !surface.classList.contains('leaving')) return;
        surface.classList.remove('leaving');
        if (surface.matches(':popover-open')) surface.hidePopover();
      };
      const running = surface.getAnimations();
      if (running.length === 0) finish();
      else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
    }
    if (restoreFocus && inside) this.returnFocus();
    this.returnTo = null;
  }

  /** DTM-37: the element that opens a docked picker says it opens a dialog, whether it is open, and which. */
  private syncOpener() {
    const element = this.openerElement;
    if (!element) return;
    const target = findOpenerTarget(element);
    const docked = this.cfg.presentation === 'docked' && !this.inline;
    if (docked && !this.id) this.id = `tanrei-date-time-picker-${++ids}`;
    // A modal picker's opener keeps whatever it says itself (a text field's picker button says it opens a dialog, TXF-32).
    if (docked) hostAria(target, { 'aria-haspopup': 'dialog' });
    hostAria(target, {
      'aria-expanded': docked ? String(this.open) : null,
      'aria-controls': docked && target.getRootNode() === this.getRootNode() ? this.id : null,
    });
  }

  /** DTM-13: the entry-mode tabs control their panel (the row sets none of its own: it has no panels). */
  private linkPanels() {
    const link = (tabs: string, panel: string) => {
      const row = this.renderRoot.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>(tabs);
      if (!row) return;
      void row.updateComplete.then(() =>
        requestAnimationFrame(() => {
          for (const tab of row.querySelectorAll('tanrei-tab')) hostAria(tab, { 'aria-controls': panel });
        }),
      );
    };
    link('.entry-tabs', 'time-panel');
  }

  // ── Updates ───────────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues<this>) {
    const reopened = changed.has('open') || changed.has('presentation') || changed.has('inline') || changed.has('mode') || changed.has('range');
    if (this.open && (reopened || !this.session)) this.initSession();
    else {
      this.cfg = this.readConfig();
      // DTM-7: a docked picker for a date only shows what the product sets while it is open; any other keeps its pending choice (DTM-6).
      if (this.open && !this.pendingUntilOk && (changed.has('value') || changed.has('start') || changed.has('end'))) this.pending = this.cfg.committed;
      if (!this.session) this.pending = this.cfg.committed;
      // DTM-49: bounds set while the picker is open move a pending time outside them into them.
      else if (changed.has('min') || changed.has('max') || changed.has('minuteStep')) this.keepWithin();
    }
    if (this.session) this.syncWheels();
    // DTM-26: the handle turns along the shorter arc to the value it shows.
    const target = this.targetAngle();
    const current = ((this.angle % 360) + 360) % 360;
    const delta = ((target - current + 540) % 360) - 180;
    if (delta !== 0) this.angle += delta;
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('open') || changed.has('presentation') || changed.has('inline')) {
      this.closeRequested = false;
      if (changed.has('presentation') && this.shown) this.withdraw(false);
      if (this.open) this.present();
      else this.withdraw();
    }
    this.syncOpener();
    this.linkPanels();
    const surface = this.surface;
    if (surface) this.resize$?.observe(surface);
    const body = this.renderRoot.querySelector('.body');
    if (body) this.resize$?.observe(body);
    if (this.shown || this.inline) this.arrange();
    // DTM-33: the error line is announced once, politely, when it appears.
    const error = this.session && this.rangeError;
    if (error && !this.errorShown) {
      const live = this.renderRoot.querySelector<HTMLElement>('.announce');
      const words = this.say.rangeErrorText;
      if (live) live.textContent = live.textContent === words ? `${words}​` : words;
    }
    this.errorShown = error;
    this.reportWords();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /** DTM-10, DTM-48: the title's words and the surface's name — `label`, the instance's alone; nothing while it is empty. */
  private get heading(): string {
    return this.label.trim();
  }

  /**
   * DTM-10: the pending choice in the header — a date with its weekday, a range joined by an en dash, a date not chosen
   * yet as `dateLabel`, for a single value and for either end of a range: no word for start or end is drawn. Each part of
   * a range is an isolated run (`<bdi>`: a date as its locale writes it, or the product's word), and the two stand in
   * reading order around the dash: in a right-to-left layout the start is at its right.
   */
  private renderValue(): TemplateResult {
    const { locale, range, cycle, mode } = this.cfg;
    const year = (parseIsoDate(this.cfg.today) ?? { year: new Date().getFullYear() }).year;
    const time = mode === 'date-time';
    const part = (moment: Moment, placeholder: string, weekday: boolean) =>
      moment.date ? html`<bdi>${headerDateText(locale, moment.date, year, { weekday, time: time ? moment.time : null, cycle })}</bdi>` : html`<bdi class="placeholder">${placeholder || HOLDS_A_LINE}</bdi>`;
    const { value, start, end } = this.pending;
    const { dateLabel } = this.say;
    return html`<div class="value">${range ? html`${part(start, dateLabel, false)} – ${part(end, dateLabel, false)}` : part(value, dateLabel, true)}</div>`;
  }

  /**
   * DTM-13: the entry-mode tabs — two icon-only tabs that hug, the keyboard glyph for the wheels at the start and the
   * schedule glyph for the dial at the end. No word is drawn: `wheelsLabel` and `dialLabel` are their accessible names.
   */
  private renderEntryTabs(): TemplateResult | typeof nothing {
    if (!this.hasTime || this.offered !== 'both') return nothing;
    const say = this.say;
    return html`<tanrei-tabs class="entry-tabs" variant="secondary" label=${say.entryModeLabel} .value=${this.entry} @change=${this.onEntryTabs}>
      <tanrei-tab id="entry-wheels" value="wheels" label=${say.wheelsLabel} icon=${ENTRY_GLYPHS.wheels} label-hidden></tanrei-tab>
      <tanrei-tab id="entry-dial" value="dial" label=${say.dialLabel} icon=${ENTRY_GLYPHS.dial} label-hidden></tanrei-tab>
    </tanrei-tabs>`;
  }

  /** DTM-10: the title row (and in a modal picker with a date, the value and the divider below it). */
  private renderHeader(): TemplateResult | typeof nothing {
    const tabs = this.renderEntryTabs();
    const valueLine = this.modal && this.hasDate;
    if (!this.modal && tabs === nothing) return nothing;
    return html`<div part="header" class="header">
        <div class="title-row"><span class="title">${this.heading || HOLDS_A_LINE}</span>${tabs}</div>
        ${valueLine ? this.renderValue() : nothing}
      </div>
      ${valueLine ? html`<div class="divider" aria-hidden="true"></div>` : nothing}`;
  }

  /** DTM-11: the calendar, in single or range mode, given the pending dates and the picker's words; no label of its own. */
  private renderCalendar(): TemplateResult {
    const { range, min, max, today, disabledDates, firstDayOfWeek, startView, locale } = this.cfg;
    const date = (moment: Moment) => (moment.date ? isoOf(moment.date) : '');
    return html`<tanrei-calendar
      part="calendar"
      class="calendar"
      mode=${range ? 'range' : 'single'}
      .value=${range ? '' : date(this.pending.value)}
      .start=${range ? date(this.pending.start) : ''}
      .end=${range ? date(this.pending.end) : ''}
      .min=${min}
      .max=${max}
      .today=${today}
      .disabledDates=${disabledDates}
      .isDateDisabled=${this.isDateDisabled}
      .firstDayOfWeek=${firstDayOfWeek}
      .locale=${locale}
      .startView=${startView}
      .showAdjacentDays=${this.showAdjacentDays}
      .startLabel=${this.startLabel}
      .endLabel=${this.endLabel}
      .previousMonthLabel=${this.previousMonthLabel}
      .nextMonthLabel=${this.nextMonthLabel}
      .yearViewLabel=${this.yearViewLabel}
      .todayLabel=${this.todayLabel}
      @change=${this.onCalendarChange}
    ></tanrei-calendar>`;
  }

  /**
   * DTM-15, DTM-42: the range display — the start's range field, an en dash and the end's, in reading order. Each field
   * is a button that holds its end's pending time as the locale writes it (an isolated run), "next day" after an
   * overnight end; no word says start or end. The one the time section sets is drawn from the selected selector's
   * tokens and is the pressed one; assistive technology hears "Start, 9:00 AM" in a group named rangeLabel. The error
   * line, while it is shown, describes the end's field (DTM-33).
   */
  private renderRangeDisplay(): TemplateResult | typeof nothing {
    if (!this.cfg.range) return nothing;
    const { locale, cycle } = this.cfg;
    const say = this.say;
    const field = (end: RangeEnd): TemplateResult => {
      const moment = this.pending[end];
      const time = moment.time ? timeText(locale, cycle, moment.time) : '';
      const after = end === 'end' && this.nextDay ? ` ${say.nextDayLabel}` : '';
      const selected = this.editing === end;
      const handlers = end === 'start' ? this.startHandlers : this.endHandlers;
      const press = this.rangePresses[end];
      return html`<button
        type="button"
        part="range-field"
        class=${classMap({ 'range-field': true, selected })}
        data-end=${end}
        ?data-ring=${this.ringedEnd === end}
        data-tanrei-shape
        aria-pressed=${selected ? 'true' : 'false'}
        aria-label=${[end === 'start' ? say.startLabel : say.endLabel, `${time}${after}`].filter(Boolean).join(', ')}
        aria-describedby=${ifDefined(end === 'end' && this.rangeError ? 'range-error' : undefined)}
        @click=${handlers.onClick}
        @pointerdown=${handlers.onPointerDown}
        @pointerup=${press.release}
        @pointercancel=${press.release}
        @pointerleave=${press.release}
        @keydown=${handlers.onKeyDown}
        @keyup=${press.onKeyUp}
        @blur=${handlers.onBlur}
        @focus=${handlers.onFocus}
      >
        <span class="value"><bdi>${time}</bdi>${after}</span>
      </button>`;
    };
    return html`<div part="range-display" class="range-display" role="group" aria-label=${ifDefined(say.rangeLabel || undefined)}>
      ${field('start')}<span part="range-separator" class="range-separator" aria-hidden="true">–</span>${field('end')}
    </div>`;
  }

  /** DTM-14: whether the locale writes the period before the hour ("午前7:30"); otherwise it stands after the minute. */
  private get periodFirst(): boolean {
    return periodPlace(this.cfg.locale) === 'before';
  }

  /** The two names of the period, each in the same place: the part is as wide as the wider needs, whichever is shown. */
  private periodNames(shown: 0 | 1 | null): TemplateResult {
    return html`${periodNames(this.cfg.locale).map((name, index) => html`<span class="name" ?data-off=${index !== shown}>${name}</span>`)}`;
  }

  /**
   * DTM-46, DTM-47: the period wheel — two rows, the name before noon above the one after, that do not run on; the
   * pending period on its selection container (its own, or its part of the joined band). Its control is its middle row,
   * a spin button of two values that takes no text: the period begins no typed entry (a typed letter sets it, DTM-47).
   */
  private renderPeriodWheel(): TemplateResult {
    const names = periodNames(this.cfg.locale);
    const wheel = this.periodWheel;
    const position = wheel.at + wheel.shift;
    const following = wheel.pointer !== null || wheel.scrolling !== 0;
    const pending = periodOf(this.time.hour);
    return html`<div
      part="period"
      class=${classMap({ wheel: true, period: true, following })}
      data-unit="period"
      ?data-ring=${this.ringed === 'period'}
      @pointerdown=${this.onPeriodPointerDown}
      @pointermove=${this.onPeriodPointerMove}
      @pointerup=${this.onPeriodPointerUp}
      @pointercancel=${this.onPeriodPointerCancel}
      @lostpointercapture=${this.onPeriodPointerCancel}
      @mousedown=${this.onWheelMouseDown}
      @wheel=${this.onPeriodScroll}
    >
      <span class="ground" data-tanrei-shape aria-hidden="true"></span>
      <span class="ring" data-tanrei-shape aria-hidden="true"></span>
      <span class="measure" aria-hidden="true">${this.periodNames(null)}</span>
      <div class="rows" aria-hidden="true">
        ${names.map(
          (name, at) =>
            html`<span
              class=${classMap({ row: true, on: Math.abs(at - position) < 0.5 })}
              ?data-unavailable=${!this.offersPeriod(at ? 1 : 0)}
              style=${styleMap({ '--_at': String(at - position) })}
              >${name}</span
            >`,
        )}
      </div>
      <div
        class="entry"
        data-unit="period"
        role="spinbutton"
        tabindex="0"
        aria-label=${ifDefined(this.say.periodLabel || undefined)}
        aria-valuenow=${pending}
        aria-valuemin=${this.periodReach[0]}
        aria-valuemax=${this.periodReach[1]}
        aria-valuetext=${names[pending]}
        @keydown=${this.onPeriodKeyDown}
        @focus=${this.periodHandlers.onFocus}
        @blur=${this.periodHandlers.onBlur}
      ></div>
    </div>`;
  }

  /**
   * DTM-14, DTM-47: the period selector — a spin button of two values that shows the pending period's name and changes
   * to the other on a press. It is drawn from the unselected selector's tokens in every state: it never takes the
   * selected class, which marks the unit the dial sets.
   */
  private renderPeriodSelector(): TemplateResult {
    const names = periodNames(this.cfg.locale);
    const pending = periodOf(this.time.hour);
    const press = this.periodPress;
    return html`<div
      part="period"
      class="selector period"
      data-unit="period"
      role="spinbutton"
      tabindex="0"
      aria-label=${ifDefined(this.say.periodLabel || undefined)}
      aria-valuenow=${pending}
      aria-valuemin=${this.periodReach[0]}
      aria-valuemax=${this.periodReach[1]}
      aria-valuetext=${names[pending]}
      data-tanrei-shape
      ?data-ring=${this.ringed === 'period'}
      @pointerdown=${this.periodHandlers.onPointerDown}
      @pointerup=${press.release}
      @pointercancel=${press.release}
      @pointerleave=${press.release}
      @click=${this.periodHandlers.onClick}
      @keydown=${this.periodHandlers.onKeyDown}
      @keyup=${press.onKeyUp}
      @blur=${() => {
        press.onBlur();
        this.periodHandlers.onBlur();
      }}
      @focus=${this.periodHandlers.onFocus}
    >
      <span class="value">${this.periodNames(pending)}</span>
    </div>`;
  }

  private separator() {
    return html`<span part="separator" class="separator" aria-hidden="true">${timeSeparator(this.cfg.locale)}</span>`;
  }

  /**
   * DTM-18, DTM-20, DTM-43: one wheel — its rows running on past its ends, the pending value on its selection container
   * — whose control is its middle row: a native input that is a spin button, read-only until a number is typed into it,
   * showing the digits typed in place of the value.
   */
  private renderWheel(unit: Unit): TemplateResult {
    const { locale, cycle } = this.cfg;
    const wheel = this.wheels[unit];
    const values = this.values(unit);
    const n = values.length;
    const position = wheel.at + wheel.shift;
    const around = 4;
    const rows: number[] = [];
    for (let at = Math.floor(position) - around; at <= Math.ceil(position) + around; at++) rows.push(at);
    const text = (index: number) => {
      const value = values[mod(index, n)];
      return unit === 'minute' ? minuteText(locale, value) : hourText(locale, cycle, cycle === 'h12' ? hourOf12(value, 0) : value);
    };
    const aria = this.spinAria(unit);
    const following = wheel.pointer !== null || wheel.scrolling !== 0;
    const typing = this.typed?.unit === unit;
    const digits = typing ? this.typed!.digits : '';
    return html`<div
      part="wheel"
      class=${classMap({ wheel: true, following, typing, typed: digits !== '' })}
      data-unit=${unit}
      ?data-ring=${this.ringed === unit}
      @pointerdown=${this.onWheelPointerDown}
      @pointermove=${this.onWheelPointerMove}
      @pointerup=${this.onWheelPointerUp}
      @pointercancel=${this.onWheelPointerCancel}
      @lostpointercapture=${this.onWheelPointerCancel}
      @mousedown=${this.onWheelMouseDown}
      @wheel=${this.onWheelScroll}
    >
      <span class="ground" data-tanrei-shape aria-hidden="true"></span>
      <span class="ring" data-tanrei-shape aria-hidden="true"></span>
      <div class="rows" aria-hidden="true">
        ${repeat(
          rows,
          (at) => at,
          (at) =>
            html`<span
              class=${classMap({ row: true, on: Math.abs(at - position) < 0.5 })}
              ?data-unavailable=${!this.offers(unit, this.withIndex(unit, at))}
              style=${styleMap({ '--_at': String(at - position) })}
              >${text(at)}</span
            >`,
        )}
      </div>
      <input
        class="entry"
        data-unit=${unit}
        type="text"
        inputmode="numeric"
        enterkeyhint="done"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        role="spinbutton"
        .value=${this.typedText(digits)}
        ?readonly=${!typing && this.armed !== unit}
        aria-label=${ifDefined((unit === 'hour' ? this.say.hourLabel : this.say.minuteLabel) || undefined)}
        aria-valuenow=${aria.now}
        aria-valuemin=${aria.min}
        aria-valuemax=${aria.max}
        aria-valuetext=${aria.text}
        @keydown=${this.onWheelKeyDown}
        @input=${this.onSpinInput}
        @focus=${this.onSpinFocus}
        @blur=${this.onSpinBlur}
      />
    </div>`;
  }

  /**
   * DTM-18: the hour wheel, the separator and the minute wheel, left to right — each wheel on a selection container of
   * its own, or, where the system joins them (wheel.selection.span, read from the cascade now), on one band. DTM-46: with
   * the 12-hour clock the period wheel beside them, after the minute or before the hour as the locale writes a time —
   * its side follows the layout direction, the digits do not (DTM-39) — on the same band where the span is joined.
   */
  private renderWheels(): TemplateResult {
    const period = this.cfg.cycle === 'h12';
    const first = period && this.periodFirst;
    return html`<div class="wheels" data-frame=${this.wheelFrame} data-span=${compChoice(this, `${PREFIX}-wheel-selection-span`, SPANS)}>
      <span class="band" data-tanrei-shape aria-hidden="true"></span>
      ${first ? this.renderPeriodWheel() : nothing}
      <div class="digits" dir="ltr">${this.renderWheel('hour')}${this.separator()}${this.renderWheel('minute')}</div>
      ${period && !first ? this.renderPeriodWheel() : nothing}
    </div>`;
  }

  /**
   * DTM-12: what the other entry mode needs of the section's width, measured and never drawn — the time display beside
   * or above the dial for the wheels mode, the wheels for the dial mode — so that the section is as wide in the one mode
   * as in the other and switching does not change the picker's width. Only where the system offers both.
   */
  private renderMeasure(dial: boolean): TemplateResult | typeof nothing {
    if (this.offered !== 'both') return nothing;
    const period = this.cfg.cycle === 'h12';
    const first = period && this.periodFirst;
    const separator = html`<span class="separator">${timeSeparator(this.cfg.locale)}</span>`;
    if (dial) {
      const wheel = html`<span class="wheel"></span>`;
      const name = html`<span class="wheel period"><span class="measure">${this.periodNames(null)}</span></span>`;
      return html`<div class="other-mode" aria-hidden="true">
        <div class="wheels">${first ? name : nothing}<div class="digits" dir="ltr">${wheel}${separator}${wheel}</div>${period && !first ? name : nothing}</div>
      </div>`;
    }
    const selector = html`<span class="selector"></span>`;
    const name = html`<span class="selector period"><span class="value">${this.periodNames(null)}</span></span>`;
    return html`<div class="other-mode" aria-hidden="true">
      <div class="display">${first ? name : nothing}<div class="digits" dir="ltr">${selector}${separator}${selector}</div>${period && !first ? name : nothing}</div>
      <span class="dial-room"></span>
    </div>`;
  }

  /** DTM-21, DTM-22: a selector — a spin button drawn from its condition. */
  private renderSelector(unit: Unit): TemplateResult {
    const handlers = unit === 'hour' ? this.hourHandlers : this.minuteHandlers;
    const press = this.presses[unit];
    const aria = this.spinAria(unit);
    const { locale, cycle } = this.cfg;
    // DTM-22: what has been typed is the selector's text for as long as the entry lasts.
    const digits = this.typed?.unit === unit ? this.typed.digits : '';
    const text = digits ? this.typedText(digits) : unit === 'hour' ? hourText(locale, cycle, this.time.hour) : minuteText(locale, this.time.minute);
    return html`<div
      part="selector"
      class=${classMap({ selector: true, selected: this.shownUnit === unit })}
      data-unit=${unit}
      role="spinbutton"
      tabindex="0"
      aria-label=${ifDefined((unit === 'hour' ? this.say.hourLabel : this.say.minuteLabel) || undefined)}
      aria-valuenow=${aria.now}
      aria-valuemin=${aria.min}
      aria-valuemax=${aria.max}
      aria-valuetext=${aria.text}
      data-tanrei-shape
      @pointerdown=${handlers.onPointerDown}
      @pointerup=${press.release}
      @pointercancel=${press.release}
      @pointerleave=${press.release}
      @keydown=${handlers.onKeyDown}
      @keyup=${press.onKeyUp}
      @blur=${handlers.onBlur}
      @focus=${handlers.onFocus}
    >
      <span class="value">${text}</span>
    </div>`;
  }

  /** DTM-23: the numbers of a unit around the dial, clockwise from the top (two rings for the 24-hour hours). */
  /** DTM-23, DTM-50: … each with whether the value it names is available. */
  private dialNumbers(unit: Unit) {
    const { locale, cycle, step } = this.cfg;
    const time = this.time;
    if (unit === 'minute') {
      const every = step <= 5 ? 5 : step;
      return stepMinutes(every).map((minute) => ({
        text: numberText(locale, minute, 2),
        inner: false,
        available: this.offers('minute', { ...time, minute }),
        ...direction(minute * 6),
      }));
    }
    const ring = (inner: boolean, value: (index: number) => number, hour: (value: number) => number, digits: number) =>
      Array.from({ length: 12 }, (_, index) => ({
        text: numberText(locale, value(index), digits),
        inner,
        available: this.offers('hour', { ...time, hour: hour(value(index)) }),
        ...direction(index * 30),
      }));
    if (cycle === 'h12') return ring(false, (index) => (index === 0 ? 12 : index), (value) => hourOf12(value, periodOf(time.hour)), 1);
    return [...ring(false, (index) => index, (value) => value, 2), ...ring(true, (index) => index + 12, (value) => value, 2)];
  }

  private numbers() {
    const layer = (unit: Unit) =>
      html`<div class=${classMap({ numbers: true, [`${unit}s`]: true, faded: this.shownUnit !== unit })}>
        ${this.dialNumbers(unit).map(
          (number) =>
            html`<span
              class=${classMap({ number: true, inner: number.inner, outer: !number.inner })}
              ?data-unavailable=${!number.available}
              style=${styleMap({ '--_x': String(number.x), '--_y': String(number.y) })}
              >${number.text}</span
            >`,
        )}
      </div>`;
    return html`${layer('hour')}${layer('minute')}`;
  }

  /** DTM-23 … DTM-25: the dial, its numbers, the handle over the pending value and the track to it; hidden from assistive technology. */
  private renderDial(): TemplateResult {
    const between = this.shownUnit === 'minute' && this.time.minute % 5 !== 0;
    return html`<div
      part="dial"
      class="dial"
      aria-hidden="true"
      data-ring=${this.innerRing ? 'inner' : 'outer'}
      ?data-instant=${this.instant}
      style=${styleMap({ '--_angle': `${this.angle}deg` })}
      @pointerdown=${this.onDialDown}
      @pointermove=${this.onDialMove}
      @pointerup=${this.onDialUp}
      @pointercancel=${this.onDialCancel}
      @lostpointercapture=${this.onDialCancel}
    >
      <div class="face">${this.numbers()}</div>
      <div class="center"></div>
      <div class="arm">
        <div class="track"></div>
        <div part="handle" class="handle">
          <div class="copy">${this.numbers()}</div>
          ${between ? html`<div class="between"></div>` : nothing}
        </div>
      </div>
    </div>`;
  }

  /**
   * DTM-12: the time section, top to bottom — the range display across its whole width, the time display (dial) and the
   * wheels or the dial; the time display is the row next to the dial. DTM-14: the period of a 12-hour time is a part of
   * the time display (the period selector) and of the wheels (the period wheel) — after the minute, or before the hour
   * where the locale writes it first; its side follows the layout direction while the hour, the separator and the minute
   * stay left to right (DTM-39). There is no row of tabs in the section.
   */
  private renderTime(): TemplateResult {
    const dial = this.shownEntry === 'dial';
    const entryTabs = this.offered === 'both';
    const period = this.cfg.cycle === 'h12';
    const first = period && this.periodFirst;
    const clock = dial ? this.renderDial() : this.renderWheels();
    const display = dial
      ? html`<div class="display">
          ${first ? this.renderPeriodSelector() : nothing}
          <div class="digits" dir="ltr">${this.renderSelector('hour')}${this.separator()}${this.renderSelector('minute')}</div>
          ${period && !first ? this.renderPeriodSelector() : nothing}
        </div>`
      : nothing;
    return html`<div part="time" class=${classMap({ time: true, 'by-dial': dial, 'by-wheels': !dial })} id="time-panel" role=${ifDefined(entryTabs ? 'tabpanel' : undefined)} aria-labelledby=${ifDefined(entryTabs ? `entry-${this.shownEntry}` : undefined)}>
      ${this.renderRangeDisplay()}${display}${clock}${this.renderMeasure(dial)}
    </div>`;
  }

  /** DTM-34: Cancel and OK, placed as a full-width Button group places a dismissive and a confirming item. */
  private renderActions(): TemplateResult | typeof nothing {
    if (!this.pendingUntilOk) return nothing;
    const variant = compChoice(this, `${PREFIX}-actions-variant`, BUTTON_VARIANTS);
    const { cancelLabel, confirmLabel } = this.say;
    // DTM-48: without its word a Button draws the glyph that says the same — close, check — alone: the same variant,
    // size and place, and no name.
    const words = (label: string, glyph: string) => (label ? label : html`<span slot="icon">${glyph}</span>`);
    const actions = [
      { key: 'cancel', template: html`<tanrei-button class="cancel" dismissive variant=${variant} size="medium" @click=${this.onCancel}>${words(cancelLabel, ACTION_GLYPHS.cancel)}</tanrei-button>` },
      {
        key: 'confirm',
        template: html`<tanrei-button class="confirm" confirming variant=${variant} size="medium" ?disabled=${!this.confirmable} @click=${this.onConfirm}>${words(confirmLabel, ACTION_GLYPHS.confirm)}</tanrei-button>`,
      },
    ];
    const ordered = this.stacked ? [actions[1], actions[0]] : actions;
    return html`<div part="actions" class=${classMap({ actions: true, stacked: this.stacked })}>
      ${repeat(
        ordered,
        (action) => action.key,
        (action) => action.template,
      )}
    </div>`;
  }

  protected override render() {
    if (!this.cfg) this.cfg = this.readConfig();
    const modal = this.cfg.presentation === 'modal';
    const error = this.session && this.rangeError;
    const content = this.session
      ? html`${this.renderHeader()}
          <div class="body">${this.hasDate ? this.renderCalendar() : nothing}${this.hasTime ? this.renderTime() : nothing}</div>
          ${error ? html`<div part="error" class="error" id="range-error">${this.say.rangeErrorText || HOLDS_A_LINE}</div>` : nothing} ${this.renderActions()}`
      : nothing;
    const extras = html`<span class="hold" aria-hidden="true"></span><div class="announce" aria-live="polite"></div>`;
    const classes = classMap({
      surface: true,
      modal,
      docked: !modal,
      inline: this.inline,
      [`mode-${this.cfg.mode}`]: true,
    });
    const label = this.heading;
    if (modal) {
      return html`<dialog
        part="container"
        class=${classes}
        aria-label=${ifDefined(label || undefined)}
        tabindex="-1"
        data-tanrei-shape
        @keydown=${this.onSurfaceKeyDown}
        @cancel=${this.onNativeCancel}
        @pointerdown=${this.onDialogPointerDown}
        @click=${this.onDialogClick}
      >
        ${content}${extras}
      </dialog>`;
    }
    return html`<div
      part="container"
      class=${classes}
      role="dialog"
      aria-label=${ifDefined(label || undefined)}
      data-tanrei-shape
      popover=${ifDefined(this.inline ? undefined : 'manual')}
      @keydown=${this.onSurfaceKeyDown}
      @pointerdown=${this.onSurfacePointerDown}
      @mousedown=${this.onSurfaceMouseDown}
    >
      ${content}${extras}
    </div>`;
  }
}

/**
 * Focus to `element` with `options`. `showModal()` may have focused it already (the dialog's focusing steps): it is
 * focused again, so that whether its ring shows is the options' call, not the first focus's.
 */
function focusAgain(element: HTMLElement | null, options: FocusOptions) {
  if (!element) return;
  if (deepActive() === element) element.blur();
  element.focus(options);
}

/**
 * DTM-37: the element a docked picker's opener exposes its state on — the opener itself, or, for a component that holds
 * its button in a shadow root (a text field's picker button, a Tanrei Button), the native control inside it that says
 * it opens a dialog, else its first button.
 */
function findOpenerTarget(element: HTMLElement): HTMLElement {
  const search = (root: ShadowRoot | null, depth: number): HTMLElement | null => {
    if (!root || depth > 3) return null;
    const popup = root.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
    if (popup) return popup;
    for (const inner of root.querySelectorAll<HTMLElement>('*')) {
      const found = inner.shadowRoot ? search(inner.shadowRoot, depth + 1) : null;
      if (found) return found;
    }
    return null;
  };
  if (!element.shadowRoot) return element;
  return search(element.shadowRoot, 0) ?? element.shadowRoot.querySelector<HTMLElement>('button, [role="button"]') ?? element;
}

if (!customElements.get('tanrei-date-time-picker')) customElements.define('tanrei-date-time-picker', TanreiDateTimePicker);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-date-time-picker': TanreiDateTimePicker;
  }
}
