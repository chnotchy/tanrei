import { type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  AvailabilityController,
  type CalendarDate,
  type CalendarMonth,
  FALLBACK_LOCALE,
  type GridDay,
  PressController,
  SHEET_FLING_VELOCITY,
  SheetDrag,
  SystemWatchController,
  WEEKDAY_NAMES,
  type Weekday,
  addDays,
  addMonths,
  addMonthsTo,
  ambientLocale,
  clampDate,
  clampMonth,
  compChoice,
  compareDates,
  compareMonths,
  containedWheel,
  daysInMonth,
  deviceToday,
  fullDateText,
  inMonth,
  isoOf,
  localeFirstDay,
  longWeekdays,
  monthGrid,
  monthOf,
  monthYearText,
  narrowWeekdays,
  numberText,
  parseIsoDate,
  parseValues,
  report,
  sameDate,
  supportedLocale,
  syncFocusStyle,
  todayName,
  untilMidnight,
  weekdayColumns,
  weekdayOf,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import { PROGRESS, styles } from './calendar.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** single: one date (`value`). range: one contiguous span (`start` … `end`, inclusive). */
export type TanreiCalendarMode = 'single' | 'range';
/** The weekday in the first column; `locale` takes it from the locale. */
export type TanreiCalendarFirstDayOfWeek = 'locale' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
/** Whether the calendar first shows the days of a month or the list of years. */
export type TanreiCalendarStartView = 'day' | 'year';
/** What `change` carries: ISO 8601 calendar dates, `""` where none is chosen (`value` in single mode, `start` and `end` in range mode). */
export interface TanreiCalendarChangeDetail {
  value: string;
  start: string;
  end: string;
}

const MODES: readonly TanreiCalendarMode[] = ['single', 'range'];
const FIRST_DAYS: readonly TanreiCalendarFirstDayOfWeek[] = ['locale', ...WEEKDAY_NAMES];
const START_VIEWS: readonly TanreiCalendarStartView[] = ['day', 'year'];

/** The axis the months move along (comp.calendar.navigation.axis, a choice of kind: its value is the name). */
const AXIS = '--tanrei-comp-calendar-navigation-axis';
const AXES = ['vertical', 'horizontal'] as const;
type Axis = (typeof AXES)[number];

/** The glyphs the calendar draws (CAL-5, CAL-6), by the icon set's names. */
const GLYPHS = { up: 'arrow_upward', down: 'arrow_downward', back: 'arrow_back', forward: 'arrow_forward', expand: 'expand_more' } as const;

/** The years listed while min or max is empty (CAL-7). */
const FIRST_LISTED_YEAR = 1900;
const LAST_LISTED_YEAR = 2100;

/** CAL-34: a followed scroll has ended when no wheel event has arrived for this long (ms) … */
const SCROLL_QUIET = 150;
/** … or when it has slowed below this speed (px per ms), measured over its events of the last `SCROLL_WINDOW` ms. */
const SCROLL_SLOW = 0.1;
const SCROLL_WINDOW = 100;
/**
 * How much faster than `SCROLL_SLOW` an event must be to move the days again once a scroll has ended by slowing: a
 * momentum tail's speed, read from whole pixels a frame apart, wavers about the threshold as it falls through it, and
 * without a margin it would end, begin and end again. A new push of the fingers passes it within an event or two.
 */
const SCROLL_RESUME = 1.5;
/** CAL-31, CAL-34: the share of the way to a neighbouring month's view from which a release or the end of a scroll chooses it. */
const SETTLE_SHARE = 0.25;
/** What a sum of travelled shares may be off by. */
const EPSILON = 1e-6;

/** The rows of a month's view (CAL-1), and the rows two views that are not neighbours lie apart (CAL-29). */
const VIEW_ROWS = 6;

/** The first day of the week row a month's view begins with: the row of its first day (CAL-29). */
const firstRowOf = (month: CalendarMonth, firstDay: Weekday): CalendarDate => {
  const first: CalendarDate = { ...month, day: 1 };
  return addDays(first, -((weekdayOf(first) - firstDay + 7) % 7));
};
const sameMonth = (a: CalendarMonth, b: CalendarMonth) => compareMonths(a, b) === 0;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * CAL-29: a value drawn at the progress — `values[i]` at view `i`, straight between two views — as a CSS number: null
 * where every view draws the same, else the first plus each step's change by that step's share of the progress.
 */
function between(values: number[]): string | null {
  const terms = values.slice(1).flatMap((value, i) => (value === values[i] ? [] : [`${value - values[i]} * clamp(0, var(${PROGRESS}) - ${i}, 1)`]));
  return terms.length ? `calc(${values[0]} + ${terms.join(' + ')})` : null;
}
/** How far the days have travelled at progress `p`, in rows (or pages), where step `i` is `steps[i]` long. */
const travelAt = (steps: number[], p: number) => steps.reduce((sum, step, i) => sum + step * clamp(p - i, 0, 1), 0);
/** The progress at which the days have travelled `travel` rows (or pages). */
function progressAt(steps: number[], travel: number): number {
  let p = 0;
  for (const step of steps) {
    const share = clamp(travel / step, 0, 1);
    p += share;
    travel -= step * share;
    if (share < 1) break;
  }
  return p;
}

/** CAL-29: how a day is drawn between two views — its fade and the mix of its two conditions, each a CSS number of the progress. */
interface Between {
  /** 0 where a view does not draw the day, 1 where one does; absent where every view draws it. */
  opacity?: string;
  /** 0 where the day is a neighbouring month's, 1 where it is the month's own; absent where every view agrees. */
  mix?: string;
  /** The displayed month's view does not draw the day (yet): it takes no press and no focus, and is hidden (CAL-32). */
  coming?: boolean;
}

/** A week row of the column (CAL-29): its first day, and which of the views hold it among their six. */
interface WeekRow {
  start: CalendarDate;
  held: boolean[];
}

/** CAL-30: a press on the day grid that may become a drag, and the drag once the calendar has taken it. */
interface MonthDrag {
  gesture: SheetDrag;
  taken: boolean;
  /** The days' travel when the drag was taken, in rows (or pages), and a row's (a page's) length in px. */
  from: number;
  unit: number;
  /** The displayed month's place among the views, and how far the progress may go either way (CAL-30: the neighbour, never past min or max). */
  home: number;
  low: number;
  high: number;
  /** The progress the drag last wrote. */
  at: number;
}

/**
 * CAL-33, CAL-34: the wheel events of one scroll, from its first to the quiet that ends it. The web is told neither a
 * scroll's end nor its momentum, so the calendar reads both from the events' own distances and times.
 */
interface MonthScroll {
  /** The days are held where the scroll has put them (CAL-33); false once it has ended and they settle. */
  following: boolean;
  /** CAL-32: what is left of the scroll is ignored, whatever its speed, until the quiet that ends it. */
  spent: boolean;
  /** The scroll has been as fast as `SCROLL_SLOW`: only then can it have slowed below it (CAL-34). */
  fast: boolean;
  /** The month displayed when the days began to follow: the end announces another one (CAL-34). */
  origin: CalendarMonth;
  /** The distances of the events of the last `SCROLL_WINDOW` ms, with their times. */
  samples: { time: number; distance: number }[];
  /** A row's (a page's) length in px, and the progress the scroll last wrote. */
  unit: number;
  at: number;
  /** The timer of the quiet that ends the scroll. */
  quiet: number;
}

/** A day's condition, by precedence (CAL-2). */
type Condition = 'unselected' | 'adjacent' | 'today' | 'selected' | 'in-range';

interface Choice {
  value: CalendarDate | null;
  start: CalendarDate | null;
  end: CalendarDate | null;
}

/** The props, read once per update: unknown values replaced by the defaults, malformed dates dropped (CAL-27). */
interface Config {
  mode: TanreiCalendarMode;
  startView: TanreiCalendarStartView;
  firstDay: Weekday;
  locale: string;
  min: CalendarDate | null;
  max: CalendarDate | null;
  today: CalendarDate;
  choice: Choice;
  unavailable: (date: CalendarDate) => boolean;
}

const detailOf = (choice: Choice, mode: TanreiCalendarMode): TanreiCalendarChangeDetail =>
  mode === 'single'
    ? { value: choice.value ? isoOf(choice.value) : '', start: '', end: '' }
    : { value: '', start: choice.start ? isoOf(choice.start) : '', end: choice.end ? isoOf(choice.end) : '' };

/**
 * The browser's frames, for a month's travel (CAL-14): the functions the page had when this module was evaluated. A
 * travel is drawn frame by frame as a transition is, by the browser's own clock — so a page that later replaces its
 * timers with a clock of its own (a test that stops time to count a scroll's 150 ms of silence) stops the timers it
 * replaced, and not the drawing of a motion that is under way.
 */
const nextFrame: (callback: FrameRequestCallback) => number = typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : () => 0;
const dropFrame: (handle: number) => void = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : () => undefined;

/**
 * Shows one month as a grid of days, in the page or inside a picker, and lets a person choose one date or one range of
 * dates from it.
 *
 * Contract: specs/calendar.spec.json. The calendar draws no surface and no padding of its own: it is seven cells wide
 * (never wider than its container) and the page, or the picker that holds it, gives it its background. It commits each
 * choice itself — it sets `value` (or `start` and `end`) and then fires `change` — and is not form-associated: the
 * product's field is. Months move by the previous and next buttons, Page Up / Page Down, and along the axis the design
 * system names (`comp.calendar.navigation.axis`, vertical by default) by a wheel or trackpad scroll and by a drag of a
 * finger, a pen or the primary mouse button: the days follow either point for point — a scroll through month after
 * month, a drag to the neighbouring month — and settle on the neighbour from a quarter of the way on. A wheel that
 * reports lines or pages moves one month a step.
 *
 * Dates are ISO 8601 calendar dates ("2026-09-17") without a time or a time zone. Month and weekday names, digits and
 * the first day of the week come from `Intl` for `locale` — without it, the nearest `lang` attribute, then the browser's
 * language. Every visual value comes from `--tanrei-comp-calendar-*` tokens; the navigation buttons are
 * `<tanrei-button variant="text">` elements that keep their own. `focus()` moves focus to the active day (or the
 * displayed year in the year view).
 *
 * @tag tanrei-calendar
 * @csspart navigation - The top row: the view toggle and the previous and next buttons.
 * @csspart view-toggle - The month-and-year button that switches between the day view and the year view.
 * @csspart grid - The day grid (role grid): the weekday row and six rows of days.
 * @csspart day - A day (a gridcell); `data-date` holds its ISO date, `data-adjacent` marks a day of the neighbouring month.
 * @csspart years - The year list of the year view.
 * @csspart year - A year of the year view (a button, `data-year` holds it).
 * @fires {CustomEvent<TanreiCalendarChangeDetail>} change - The person chose a day that changes the choice. `value`, `start` and `end` are already the new ones (end empty after a start alone); `detail` holds them too.
 */
export class TanreiCalendar extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'calendar');
  private readonly system = new SystemWatchController(this);
  /** CAL-35: the product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    mode: { type: String, reflect: true },
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
    label: { type: String },
    startLabel: { type: String, attribute: 'start-label' },
    endLabel: { type: String, attribute: 'end-label' },
    previousMonthLabel: { type: String, attribute: 'previous-month-label' },
    nextMonthLabel: { type: String, attribute: 'next-month-label' },
    yearViewLabel: { type: String, attribute: 'year-view-label' },
    todayLabel: { type: String, attribute: 'today-label' },
    month: { state: true },
    view: { state: true },
    active: { state: true },
    activeYear: { state: true },
    announcement: { state: true },
    deviceDate: { state: true },
  };

  /** `single`: one date, in `value`. `range`: one contiguous span, from `start` to `end` inclusive. Reflected. */
  mode: TanreiCalendarMode = 'single';

  /** The chosen date in single mode, as an ISO 8601 calendar date ("2026-09-17"); empty when none is chosen. */
  value = '';

  /** The first date of the chosen range in range mode; empty when none is chosen. */
  start = '';

  /** The last date of the chosen range in range mode, never before `start`; empty while only `start` is chosen. */
  end = '';

  /** The earliest date that can be chosen; empty for no limit. */
  min = '';

  /** The latest date that can be chosen; empty for no limit. */
  max = '';

  /** Dates inside min and max that cannot be chosen (booked, closed). The `disabled-dates` attribute is a space-separated list or a JSON array. */
  disabledDates: string[] = [];

  /** A rule no list can hold (every weekend): true for an ISO date that cannot be chosen. Read with `disabledDates`. Property only. */
  isDateDisabled: ((date: string) => boolean) | null = null;

  /** The date drawn as today; empty reads the device's current date in its own time zone (and again at midnight). */
  today = '';

  /** The weekday in the first column (`first-day-of-week`); `locale` takes it from the locale. */
  firstDayOfWeek: TanreiCalendarFirstDayOfWeek = 'locale';

  /** A BCP 47 tag ("en-US", "ja-JP") for names, digits and the first day of the week; empty: the nearest `lang`, then the browser's. */
  locale = '';

  /** Whether the calendar first shows the days of a month or the list of years (`start-view`). */
  startView: TanreiCalendarStartView = 'day';

  /** Fills the spare cells with the neighbouring months' days, drawn quieter; they can be chosen (`show-adjacent-days`). */
  showAdjacentDays = false;

  /** The accessible name of the whole calendar ("Check-in date"); a picker that holds it names it itself. */
  label = '';

  /** Range mode: the description of the start day (`start-label`): this instance's words, else the product's (`setWords({ startLabel })`). Tanrei has none: without them the day has no description. */
  startLabel = '';

  /** Range mode: the description of the end day (`end-label`): this instance's words, else the product's (`setWords({ endLabel })`). Tanrei has none: without them the day has no description. */
  endLabel = '';

  /** The previous-month button's accessible name (`previous-month-label`): this instance's words, else the product's (`setWords({ previousMonthLabel })`). Tanrei has none: without them the button is drawn and works, and has no name. */
  previousMonthLabel = '';

  /** The next-month button's accessible name (`next-month-label`): this instance's words, else the product's (`setWords({ nextMonthLabel })`). Tanrei has none: without them the button is drawn and works, and has no name. */
  nextMonthLabel = '';

  /** The view toggle's description; its name is the month and year it shows (`year-view-label`): this instance's words, else the product's (`setWords({ yearViewLabel })`). Tanrei has none: without them the toggle has no description. */
  yearViewLabel = '';

  /** Read after the current year. Today's date is `aria-current="date"` on the web, so it is not added to a day (`today-label`): this instance's words, else the product's (`setWords({ todayLabel })`), else the locale's own word for the present day, from the browser. */
  todayLabel = '';

  /** The displayed month. */
  protected month: CalendarMonth = monthOf(deviceToday());
  protected view: 'day' | 'year' = 'day';
  /** The day grid's one tab stop (CAL-10). */
  protected active: CalendarDate = deviceToday();
  /** The year list's one tab stop (CAL-12). */
  protected activeYear = deviceToday().year;
  /** The polite announcement of a new month (CAL-13). */
  protected announcement = '';
  /** The device's date while `today` is empty, read again at midnight (CAL-24). */
  protected deviceDate: CalendarDate = deviceToday();

  private cfg!: Config;
  private shown = false;
  private axis: Axis = 'vertical';
  /**
   * CAL-29: the views the grid holds, earliest first — the displayed month alone at rest; while a change plays or a drag
   * lasts, also the months the days move between. The progress counts them: 0 at the first, 1 at the next.
   */
  private views: CalendarMonth[] = [];
  /** The progress to write once the views are rendered: `jump` at once (where the days are now), then `to` over the page motion. */
  private step: { jump: number | null; to: number } | null = null;
  /**
   * CAL-14, CAL-29: the progress on its way from one place to another over the page motion. The progress is a custom
   * property that no one registers — a registered one makes every transition of the page dear —
   * so it has no transition of its own: `clock` is an
   * animation with no effect on the grid, running for the page motion's duration on its curve, and each frame writes
   * the progress where the clock's eased time says it is. A moment of it and a drag held at that place are one look.
   */
  private travel: { clock: Animation; from: number; to: number; frame: number } | null = null;
  /** CAL-30: the press that may become a drag, or the drag. */
  private drag: MonthDrag | null = null;
  /** Where focus goes after the next update, and whether it shows its ring (true after a key, false after a press). */
  private focusAfter: 'day' | 'year' | null = null;
  private ringAfter: boolean | undefined;
  private scrollYearsAfter = false;
  /**
   * The year list holds its years: while the year view is shown, and until it has faded out after it (CAL-6's
   * cross-fade). A calendar in its day view holds none of them — two hundred and one buttons, most of what a calendar
   * would otherwise be made of, and a picker's date view is a calendar.
   */
  private yearsHeld = false;
  /** The calendar set its own choice (CAL-17 is about a date the product sets). */
  private ownChoice = false;
  private midnight = 0;
  /** CAL-33, CAL-34: the scroll in progress, if any. */
  private wheel: MonthScroll | null = null;
  /** CAL-30, CAL-31: the click a taken drag's release still produces chooses no day. */
  private swallowClick = false;

  /** CAL-20, CAL-21: the press of a day, a year or the view toggle — whichever container `pressedBox` is. */
  private pressedBox: HTMLElement | null = null;
  private readonly press = new PressController(this, {
    container: () => this.pressedBox,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => !!this.pressedBox?.closest('[aria-disabled="true"]'),
  });

  override connectedCallback() {
    super.connectedCallback();
    this.scheduleMidnight();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.midnight);
    // A scroll, a drag or a change in progress has nothing left to move: the days are at the displayed month's view.
    this.forgetScroll();
    this.dropDrag();
    this.endTravel();
    if (this.views.length > 1) this.rest();
    else this.pages?.removeAttribute('data-held');
  }

  /** CAL-24: while `today` is empty, the device's date is read again when it changes (at the next local midnight). */
  private scheduleMidnight() {
    clearTimeout(this.midnight);
    this.midnight = window.setTimeout(() => {
      this.deviceDate = deviceToday();
      this.scheduleMidnight();
    }, untilMidnight());
  }

  /** Moves focus to the active day, or to the displayed year in the year view (CAL-10, CAL-12). */
  override focus(options?: FocusOptions & { focusVisible?: boolean }) {
    const target =
      this.view === 'year'
        ? this.renderRoot?.querySelector<HTMLElement>(`.year[data-year="${this.activeYear}"]`)
        : this.renderRoot?.querySelector<HTMLElement>(`.page.current .day[data-date="${isoOf(this.active)}"]`);
    if (!target) return super.focus(options);
    // Focused already (a dialog's focusing steps): focused again, so that whether its ring shows is the options' call.
    if (options && 'focusVisible' in options && (this.renderRoot as ShadowRoot).activeElement === target) target.blur();
    target.focus(options);
  }

  // ── Reading the props (CAL-24, CAL-27) ────────────────────────────────────────────────────────────────────────────

  private closed<T extends string>(values: readonly T[], value: T, fallback: T, name: string): T {
    if (values.includes(value)) return value;
    report(this, 'CAL-27', `${name} "${value}" is not a value the calendar defines; it behaves as "${fallback}"`);
    return fallback;
  }

  /** CAL-24: `locale`, else the nearest `lang` (through shadow roots), else the browser's language; English when `Intl` does not know it. */
  private resolveLocale(): string {
    const tag = this.locale.trim();
    if (!tag) return ambientLocale(this);
    const known = supportedLocale(tag);
    if (!known) report(this, 'CAL-24', `locale "${tag}" is not a BCP 47 tag this browser knows; it uses "${FALLBACK_LOCALE}"`);
    return known ?? FALLBACK_LOCALE;
  }

  private readConfig(): Config {
    const mode = this.closed(MODES, this.mode, 'single', 'mode');
    const startView = this.closed(START_VIEWS, this.startView, 'day', 'startView');
    const firstDayOfWeek = this.closed(FIRST_DAYS, this.firstDayOfWeek, 'locale', 'firstDayOfWeek');
    const locale = this.resolveLocale();
    const firstDay = firstDayOfWeek === 'locale' ? localeFirstDay(locale) : (WEEKDAY_NAMES.indexOf(firstDayOfWeek) as Weekday);
    const date = (name: string, text: string) => {
      if (!text) return null;
      const parsed = parseIsoDate(text);
      if (!parsed) report(this, 'CAL-27', `${name} "${text}" is not an ISO 8601 calendar date (YYYY-MM-DD); it is ignored`);
      return parsed;
    };
    let min = date('min', this.min);
    let max = date('max', this.max);
    if (min && max && compareDates(min, max) > 0) {
      report(this, 'CAL-27', `min "${this.min}" is after max "${this.max}"; both are ignored`);
      min = null;
      max = null;
    }
    let value = date('value', this.value);
    let start = date('start', this.start);
    let end = date('end', this.end);
    if (mode === 'range' && value) {
      report(this, 'CAL-27', `value "${this.value}" is set in range mode, where the choice is start and end; it is ignored`);
      value = null;
    }
    if (mode === 'single' && (start || end)) {
      report(this, 'CAL-27', 'start or end is set in single mode, where the choice is value; they are ignored');
      start = null;
      end = null;
    }
    if (start && end && compareDates(end, start) < 0) {
      report(this, 'CAL-27', `end "${this.end}" is before start "${this.start}"; the end is ignored`);
      end = null;
    }
    if (end && !start) {
      report(this, 'CAL-27', `end "${this.end}" is set without a start; it is ignored`);
      end = null;
    }
    const disabled = new Set<string>();
    for (const entry of this.disabledDates ?? []) {
      const parsed = date('an entry of disabledDates', entry);
      if (parsed) disabled.add(isoOf(parsed));
    }
    const predicate = this.isDateDisabled;
    const unavailable = (day: CalendarDate) =>
      (min !== null && compareDates(day, min) < 0) || (max !== null && compareDates(day, max) > 0) || disabled.has(isoOf(day)) || (typeof predicate === 'function' && !!predicate(isoOf(day)));
    const today = date('today', this.today) ?? this.deviceDate;
    return { mode, startView, firstDay, locale, min, max, today, choice: { value, start, end }, unavailable };
  }

  /** CAL-17: the month of value or start, otherwise of today, between min's and max's months. */
  private homeMonth(): CalendarMonth {
    const { today, min, max, choice } = this.cfg;
    return clampMonth(monthOf(choice.value ?? choice.start ?? today), min, max);
  }

  /** CAL-10: the chosen date (start) in the month, otherwise today there, otherwise its first available day, otherwise its first. */
  private activeDayOf(month: CalendarMonth): CalendarDate {
    const { choice, today, unavailable } = this.cfg;
    const chosen = choice.value ?? choice.start;
    if (inMonth(chosen, month)) return chosen!;
    if (inMonth(today, month)) return today;
    const days = Array.from({ length: daysInMonth(month.year, month.month) }, (_, i) => ({ ...month, day: i + 1 }));
    return days.find((day) => !unavailable(day)) ?? days[0];
  }

  /** CAL-2: the condition a day is drawn from, by precedence. */
  private dayCondition(day: GridDay): Condition {
    const { value, start, end } = this.cfg.choice;
    if (sameDate(day.date, value) || sameDate(day.date, start) || sameDate(day.date, end)) return 'selected';
    if (start && end && compareDates(day.date, start) > 0 && compareDates(day.date, end) < 0) return 'in-range';
    if (sameDate(day.date, this.cfg.today)) return 'today';
    if (day.adjacent) return 'adjacent';
    return 'unselected';
  }

  private get rtl() {
    return this.matches(':dir(rtl)');
  }

  private get reducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** The axis the months move along, read from the cascade now (never cached). */
  private readAxis(): Axis {
    this.axis = compChoice(this, AXIS, AXES);
    return this.axis;
  }

  // ── Choosing (CAL-8, CAL-9, CAL-15, CAL-16) ───────────────────────────────────────────────────────────────────────

  private choose(day: CalendarDate) {
    const { mode, unavailable, choice } = this.cfg;
    if (unavailable(day)) return;
    let next: Choice;
    if (mode === 'single') {
      if (sameDate(day, choice.value)) return;
      next = { value: day, start: null, end: null };
    } else {
      const { start, end } = choice;
      next = !start || end || compareDates(day, start) < 0 ? { value: null, start: day, end: null } : { value: null, start, end: day };
    }
    const detail = detailOf(next, mode);
    this.ownChoice = true;
    if (mode === 'single') this.value = detail.value;
    else {
      this.start = detail.start;
      this.end = detail.end;
    }
    this.cfg = { ...this.cfg, choice: next };
    this.dispatchEvent(new CustomEvent<TanreiCalendarChangeDetail>('change', { bubbles: true, detail }));
  }

  // ── The month and the views (CAL-5 … CAL-7, CAL-13, CAL-14, CAL-17) ──────────────────────────────────────────────

  private get pages(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.pages') ?? null;
  }

  /** CAL-29: how far apart two consecutive views are — the rows between their first rows (four or five) for neighbouring months, six otherwise; one page on the horizontal axis. */
  private stepsOf(views: CalendarMonth[], axis = this.axis): number[] {
    const { firstDay } = this.cfg;
    return views.slice(1).map((view, i) => {
      if (axis === 'horizontal') return 1;
      if (!sameMonth(addMonthsTo(views[i], 1), view)) return VIEW_ROWS;
      const next = firstRowOf(view, firstDay);
      let rows = 0;
      for (let row = firstRowOf(views[i], firstDay); compareDates(row, next) < 0; row = addDays(row, 7)) rows += 1;
      return rows;
    });
  }

  /** CAL-29: the column of week rows the views hold, in order: a row two views share is there once. */
  private weekRows(views: CalendarMonth[]): WeekRow[] {
    const { firstDay } = this.cfg;
    const rows: WeekRow[] = [];
    const byStart = new Map<string, WeekRow>();
    views.forEach((view, index) => {
      const first = firstRowOf(view, firstDay);
      for (let n = 0; n < VIEW_ROWS; n += 1) {
        const start = addDays(first, 7 * n);
        let row = byStart.get(isoOf(start));
        if (!row) {
          row = { start, held: views.map(() => false) };
          byStart.set(isoOf(start), row);
          rows.push(row);
        }
        row.held[index] = true;
      }
    });
    return rows;
  }

  /** Where the days are now, as the progress drawn (a moment of a travel included). */
  private progressNow(): number {
    if (this.travel) return this.travelAt(this.travel);
    const pages = this.pages;
    return pages ? Number(getComputedStyle(pages).getPropertyValue(PROGRESS)) || 0 : 0;
  }

  /** The page motion, as the day view carries it — it cross-fades over it (CAL-14): its duration in ms and its curve. */
  private get pageMotion(): { duration: number; easing: string } {
    const carrier = this.renderRoot?.querySelector('.day-view');
    if (!carrier) return { duration: 0, easing: 'linear' };
    const style = getComputedStyle(carrier);
    // The first of the list (`opacity`); a curve holds commas of its own.
    const easing = /^(?:[^,(]|\((?:[^()]|\([^()]*\))*\))+/.exec(style.transitionTimingFunction)?.[0].trim() || 'linear';
    return { duration: (Number.parseFloat(style.transitionDuration) || 0) * 1000, easing };
  }

  /** Whether a month change can play: not where motion is reduced, the page motion is none, or the browser has no animation to keep its time. */
  private get canTravel(): boolean {
    const pages = this.pages;
    if (!pages || this.reducedMotion || typeof pages.animate !== 'function') return false;
    return this.pageMotion.duration > 0;
  }

  /** Whether the progress is on its way somewhere. */
  private get travelling(): boolean {
    return !!this.travel;
  }

  /** Where a travel's clock says the progress is: its eased time, between where it began and where it goes. */
  private travelAt(travel: { clock: Animation; from: number; to: number }): number {
    const eased = travel.clock.playState === 'finished' ? 1 : (travel.clock.effect?.getComputedTiming().progress ?? 1);
    return travel.from + (travel.to - travel.from) * eased;
  }

  /** CAL-14, CAL-29: sends the progress from `from` to `to` over the page motion, written in each frame; at once where no change can play. */
  private beginTravel(from: number, to: number) {
    const pages = this.pages;
    this.endTravel();
    if (!pages) return;
    if (from === to || !this.canTravel) {
      pages.style.setProperty(PROGRESS, String(to));
      return;
    }
    const clock = pages.animate(null, this.pageMotion);
    // The name tells the clock from any other animation of the grid.
    clock.id = PROGRESS;
    const travel = { clock, from, to, frame: 0 };
    const frame = () => {
      if (this.travel !== travel) return;
      if (clock.playState === 'finished') {
        pages.style.setProperty(PROGRESS, String(to));
        this.endTravel();
        this.#onTravelEnd();
        return;
      }
      pages.style.setProperty(PROGRESS, String(this.travelAt(travel)));
      travel.frame = nextFrame(frame);
    };
    this.travel = travel;
    pages.style.setProperty(PROGRESS, String(from));
    travel.frame = nextFrame(frame);
  }

  /** Stops a travel where it is: whoever stops it writes the progress next. */
  private endTravel() {
    const travel = this.travel;
    if (!travel) return;
    this.travel = null;
    dropFrame(travel.frame);
    travel.clock.cancel();
  }

  /** CAL-29: the grid keeps its six rows' height while it holds more (the rows of a month's view are equally tall). */
  private pin() {
    const pages = this.pages;
    if (pages && !pages.style.blockSize) pages.style.blockSize = `${pages.getBoundingClientRect().height}px`;
  }

  /** The days are at the displayed month's view, and the grid holds that view alone. */
  private rest() {
    this.views = [this.month];
    this.step = { jump: 0, to: 0 };
    this.requestUpdate();
  }

  /**
   * CAL-14, CAL-29: shows `month`. With the motion, the days travel there from where they are now — the views on screen
   * stay, the new month's joins them, and the progress goes to it over the page motion — so a change that begins while
   * another plays carries on without a jump. Without it (CAL-7, CAL-17, reduced motion) the month is shown at once.
   */
  private showMonth(month: CalendarMonth, { motion = true }: { motion?: boolean } = {}) {
    // CAL-14: a scroll being followed ends here, and the change carries on from where it left the days.
    this.dropScroll();
    const moving = this.views.length > 1;
    if (sameMonth(month, this.month) && !moving) return;
    if (!motion || this.view !== 'day' || !this.shown || !this.canTravel) {
      this.month = month;
      this.rest();
      return;
    }
    this.readAxis();
    // Where the days are, among the views they are between.
    let at = moving ? this.progressNow() : 0;
    let views = moving ? this.views : [this.month];
    const low = clamp(Math.floor(at), 0, views.length - 1);
    const high = clamp(Math.ceil(at), low, views.length - 1);
    views = views.slice(low, high + 1);
    at -= low;
    let to = views.findIndex((view) => sameMonth(view, month));
    if (to < 0) {
      if (compareMonths(month, views[0]) < 0) {
        views = [month, ...views];
        at += 1;
        to = 0;
      } else if (compareMonths(month, views[views.length - 1]) > 0) {
        views = [...views, month];
        to = views.length - 1;
      } else {
        // Between two views that are not neighbours (a month step during a year's): the later one gives way.
        views = [views[0], month];
        to = 1;
      }
    }
    this.pin();
    this.views = views;
    this.month = month;
    this.step = { jump: at, to };
    this.requestUpdate();
  }

  /** Writes the progress the last render asked for (see `step`), and rests when it has nowhere to travel. */
  private applyStep() {
    const step = this.step;
    const pages = this.pages;
    this.step = null;
    if (!step || !pages) return;
    // From where the step says the days are — or from where they are — to where it sends them.
    const from = step.jump ?? this.progressNow();
    pages.removeAttribute('data-held');
    this.beginTravel(from, step.to);
    if (this.views.length === 1) pages.style.removeProperty('block-size');
    else if (!this.travelling) queueMicrotask(() => this.views.length > 1 && !this.drag?.taken && !this.wheel?.following && !this.travelling && this.rest());
  }

  /** CAL-14, CAL-31: the travel has ended — the grid holds the displayed month's view alone again. */
  #onTravelEnd() {
    if (this.drag?.taken || this.wheel?.following) return;
    if (this.views.length > 1 && !this.travelling) this.rest();
  }

  /**
   * CAL-13: `month` is shown — the active day keeps its number (the last day of a shorter month), the month is announced
   * once, and focus stays where it was: a focused day that leaves the view hands it to the new active day.
   */
  private turnTo(month: CalendarMonth) {
    const focused = (this.renderRoot as ShadowRoot).activeElement;
    this.showMonth(month);
    this.carryActive(month, focused);
    this.announce();
  }

  /** CAL-13: the active day keeps its number in `month`, and a day that had the focus hands it to the new active day. */
  private carryActive(month: CalendarMonth, focused: Element | null) {
    const { min, max } = this.cfg;
    this.active = clampDate({ ...month, day: Math.min(this.active.day, daysInMonth(month.year, month.month)) }, min, max);
    if (focused instanceof HTMLElement && focused.classList.contains('day')) {
      this.focusAfter = 'day';
      this.ringAfter = focused.matches(':focus-visible');
    }
  }

  /**
   * CAL-13: a month button that has just shown the first or the last month is disabled under the focus it holds, and a
   * disabled button holds none: focus stays in the calendar, on the other month button — the one that leads back — or,
   * where that one is disabled too (the product moved min or max under it), on the active day. It is moved within the
   * turn that disables the button — once the other button, which this update may have just enabled, has drawn itself
   * so — before the platform takes focus, so focus is never on nothing and nothing hears it leave.
   */
  private keepPagingFocus() {
    type MonthButton = HTMLElement & { disabled: boolean; updateComplete?: Promise<unknown> };
    const root = this.renderRoot as ShadowRoot;
    const focused = root.activeElement as MonthButton | null;
    if (!focused?.disabled || !focused.matches('.previous, .next')) return;
    const other = this.renderRoot.querySelector<MonthButton>(focused.matches('.next') ? '.previous' : '.next');
    void Promise.resolve(other?.updateComplete).then(() => {
      if (root.activeElement !== focused || !focused.disabled) return;
      if (other && !other.disabled) other.focus();
      else this.focus();
    });
  }

  /** CAL-13: the previous or next month, never past min's or max's. */
  private pageBy(months: 1 | -1): boolean {
    const target = addMonthsTo(this.month, months);
    if (!this.allowed(target)) return false;
    this.turnTo(target);
    return true;
  }

  private allowed(month: CalendarMonth): boolean {
    const { min, max } = this.cfg;
    return !(min && compareMonths(month, min) < 0) && !(max && compareMonths(month, max) > 0);
  }

  private announce() {
    const text = monthYearText(this.cfg.locale, this.month);
    // The same words twice in a row are still a change the live region reads: a zero-width space tells them apart.
    this.announcement = this.announcement === text ? `${text}​` : text;
  }

  /** CAL-6: the view toggle switches between the day view and the year view. */
  private readonly onToggleView = () => {
    if (this.view === 'day') {
      // CAL-32: the year view shown while a drag lasts or a scroll is followed cancels it.
      this.cancelDrag();
      this.cancelScroll();
      this.view = 'year';
      this.yearsHeld = true;
      this.activeYear = this.month.year;
      this.scrollYearsAfter = true;
    } else this.view = 'day';
  };

  /** CAL-7: a year is chosen — the day view of the displayed month in that year, focus to its active day; the choice is unchanged. */
  private chooseYear(year: number, byKey: boolean) {
    const { min, max } = this.cfg;
    this.showMonth(clampMonth({ year, month: this.month.month }, min, max), { motion: false });
    this.view = 'day';
    this.active = this.activeDayOf(this.month);
    this.focusAfter = 'day';
    this.ringAfter = byKey;
    this.announce();
  }

  // ── Following a scroll (CAL-33, CAL-34) ───────────────────────────────────────────────────────────────────────────

  /**
   * CAL-33: a wheel or trackpad scroll along the axis is the calendar's — also where the days can move no further — and
   * one across it, or one that zooms, is left to the scrolling ancestor. A scroll reported as a distance is followed; one
   * reported in lines or pages is a detented wheel's step, and moves one month as a button does.
   */
  private readonly onWheel = (event: WheelEvent) => {
    if (this.view !== 'day' || event.ctrlKey) return;
    const vertical = this.readAxis() === 'vertical';
    const along = vertical ? event.deltaY : event.deltaX * (this.rtl ? -1 : 1);
    const across = vertical ? event.deltaX : event.deltaY;
    if (along === 0 || Math.abs(across) > Math.abs(along)) return;
    event.preventDefault();
    // The pointer holds the days while a drag lasts.
    if (this.drag?.taken) return;
    if (event.deltaMode !== 0) this.pageBy(along > 0 ? 1 : -1);
    else this.followScroll(along, event.timeStamp);
  };

  /**
   * CAL-33, CAL-34: one event of a scroll, `distance` px toward the next month, at `time`. The days move by it, unless
   * the scroll has ended: it ends when it has slowed below `SCROLL_SLOW` — having been that fast: a scroll that never
   * was has not slowed, and is followed until it is quiet — and what follows is ignored for as long as it is no faster
   * (the tail of a momentum scroll). A faster event (by `SCROLL_RESUME`) is a new push, and moves the days again from
   * where they are.
   */
  private followScroll(distance: number, time: number) {
    const scroll = (this.wheel ??= { following: false, spent: false, fast: false, origin: this.month, samples: [], unit: 1, at: 0, quiet: 0 });
    clearTimeout(scroll.quiet);
    scroll.quiet = window.setTimeout(this.onScrollQuiet, SCROLL_QUIET);
    scroll.samples.push({ time, distance: Math.abs(distance) });
    while (time - scroll.samples[0].time > SCROLL_WINDOW) scroll.samples.shift();
    if (scroll.spent) return;
    const speed = scroll.samples.reduce((sum, sample) => sum + sample.distance, 0) / SCROLL_WINDOW;
    const slow = speed < SCROLL_SLOW;
    const ended = scroll.fast && slow;
    if (!scroll.following) {
      // Ended by slowing (or handed to a button, a key or a drag): only a new push moves the days again.
      if (scroll.fast && speed < SCROLL_SLOW * SCROLL_RESUME) return;
      if (!this.beginScroll(scroll)) return;
    }
    if (!slow) scroll.fast = true;
    this.moveScroll(scroll, distance / scroll.unit);
    if (ended) this.settleScroll();
  }

  /** CAL-34: no event for `SCROLL_QUIET` ms — the scroll is over; days it still holds settle. */
  private readonly onScrollQuiet = () => {
    if (this.wheel?.following) this.settleScroll();
    this.wheel = null;
  };

  /**
   * CAL-33: the days begin to follow a scroll, as a drag takes them without a pointer: the progress is held where the
   * days are now (a change that is playing carries on from there, CAL-14), and the grid holds the displayed month's view
   * and its neighbours'.
   */
  private beginScroll(scroll: MonthScroll): boolean {
    const pages = this.pages;
    if (!pages) return false;
    const moving = this.views.length > 1;
    let at = moving ? this.progressNow() : 0;
    let views = moving ? this.views : [this.month];
    const box = pages.getBoundingClientRect();
    scroll.unit = Math.max(1, this.axis === 'vertical' ? box.height / VIEW_ROWS : box.width);
    this.pin();
    const [before, after] = [addMonthsTo(this.month, -1), addMonthsTo(this.month, 1)];
    if (sameMonth(views[0], this.month) && this.allowed(before)) {
      views = [before, ...views];
      at += 1;
    }
    if (sameMonth(views[views.length - 1], this.month) && this.allowed(after)) views = [...views, after];
    scroll.following = true;
    scroll.origin = this.month;
    scroll.at = at;
    this.views = views;
    this.step = null;
    // A change that was playing stops where the scroll took the days from.
    this.endTravel();
    pages.setAttribute('data-held', '');
    pages.style.setProperty(PROGRESS, String(at));
    this.requestUpdate();
    return true;
  }

  /**
   * CAL-33: the days move `travel` rows (or pages) toward the next month — toward the previous one when negative — one
   * point for each point, in the frame the event arrives. When they reach a neighbouring month's view that month is the
   * displayed one (CAL-34: shown, not announced), the grid holds its neighbours', and the scroll carries on with what is
   * left; where there is no further view (min's or max's month) they stop.
   */
  private moveScroll(scroll: MonthScroll, travel: number) {
    const pages = this.pages;
    if (!pages) return;
    let left = travel;
    if (Math.abs(scroll.at - Math.round(scroll.at)) < EPSILON) scroll.at = Math.round(scroll.at);
    while (Math.abs(left) > 0) {
      const views = this.views;
      const toward = Math.sign(left);
      const next = toward > 0 ? Math.floor(scroll.at + EPSILON) + 1 : Math.ceil(scroll.at - EPSILON) - 1;
      if (next < 0 || next >= views.length) break;
      const step = this.stepsOf(views)[toward > 0 ? next - 1 : next];
      const room = Math.abs(next - scroll.at) * step;
      // (A hair short of a view is at it: the days never rest within a rounding error of a view they have not reached.)
      if (Math.abs(left) < room - EPSILON) {
        scroll.at += left / step;
        break;
      }
      left = Math.abs(left) > room ? left - toward * room : 0;
      scroll.at = next;
      // A view passed on the way back to the displayed month's (a change was playing) is only passed.
      const home = views.findIndex((view) => sameMonth(view, this.month));
      if ((next - home) * toward >= 0) this.reachView(scroll, views[next]);
    }
    pages.style.setProperty(PROGRESS, String(scroll.at));
  }

  /** CAL-34: the days have reached `month`'s view — it is the displayed month (CAL-13, without the announcement), between its neighbours'. */
  private reachView(scroll: MonthScroll, month: CalendarMonth) {
    if (!sameMonth(month, this.month)) {
      const focused = (this.renderRoot as ShadowRoot).activeElement;
      this.month = month;
      this.carryActive(month, focused);
    }
    const views = [addMonthsTo(month, -1), month, addMonthsTo(month, 1)].filter((view) => this.allowed(view));
    this.views = views;
    scroll.at = views.findIndex((view) => sameMonth(view, month));
    this.requestUpdate();
  }

  /**
   * CAL-34: the scroll has ended. Between two views the days go to the neighbour's from a quarter of the way on, and
   * otherwise return, over the page motion (at once where motion is reduced, CAL-32); the month is announced once, if it
   * is not the one displayed when the scroll began.
   */
  private settleScroll() {
    const scroll = this.wheel;
    if (!scroll?.following) return;
    scroll.following = false;
    const home = this.views.findIndex((view) => sameMonth(view, this.month));
    const from = scroll.at;
    const side = Math.sign(from - home);
    const share = Math.abs(from - home);
    let to = home;
    if (side !== 0 && share >= SETTLE_SHARE - EPSILON && share <= 1 + EPSILON && this.views[home + side]) {
      to = home + side;
      const focused = (this.renderRoot as ShadowRoot).activeElement;
      this.month = this.views[to];
      this.carryActive(this.month, focused);
    }
    if (!sameMonth(this.month, scroll.origin)) this.announce();
    scroll.origin = this.month;
    if (!this.canTravel) {
      this.rest();
      return;
    }
    this.step = { jump: from, to };
    this.requestUpdate();
  }

  /**
   * CAL-14: something else moves the month (a button, a key, a drag): the scroll no longer holds the days, which stay
   * where it left them for that to carry on from. A month the scroll had reached is announced, as its end would have.
   */
  private dropScroll() {
    const scroll = this.wheel;
    if (!scroll?.following) return;
    scroll.following = false;
    if (!sameMonth(this.month, scroll.origin)) this.announce();
  }

  /** CAL-32: the scroll is cancelled — the days return to the displayed month's view, nothing is announced, and what is left of it is ignored. */
  private cancelScroll() {
    const scroll = this.wheel;
    if (!scroll) return;
    scroll.spent = true;
    if (!scroll.following) return;
    scroll.following = false;
    if (!this.canTravel) {
      this.rest();
      return;
    }
    this.step = { jump: scroll.at, to: this.views.findIndex((view) => sameMonth(view, this.month)) };
    this.requestUpdate();
  }

  /** The scroll has nothing left to move (the grid is drawn anew, or gone). */
  private forgetScroll() {
    clearTimeout(this.wheel?.quiet);
    this.wheel = null;
  }

  // ── Following a drag (CAL-30 … CAL-32) ────────────────────────────────────────────────────────────────────────────

  /** CAL-30: a press of touch, a pen or the primary button of a mouse on the day grid may become a drag; another mouse button takes none. */
  private readonly onDragDown = (event: PointerEvent) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || this.view !== 'day' || this.drag) return;
    const gesture = new SheetDrag(event, this.readAxis() === 'vertical' ? 'y' : 'x');
    this.drag = { gesture, taken: false, from: 0, unit: 1, home: 0, low: 0, high: 0, at: 0 };
  };

  private readonly onDragMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    const moved = drag.gesture.move(event);
    if (moved === 'start') this.takeDrag(event);
    if (drag.taken) this.followDrag(event);
  };

  /**
   * CAL-30: past the slop, further along the axis than across it — the drag is the calendar's. The press chooses no day
   * and the day under it leaves its pressed state; the grid holds the displayed month's view and its neighbours' (never
   * one past min or max), and from now on the progress is the pointer's — wherever it goes, since the grid captures it.
   * While it lasts nothing in the calendar is hovered and a fine pointer shows the grabbing cursor (`data-dragging`).
   */
  private takeDrag(event: PointerEvent) {
    const drag = this.drag;
    const pages = this.pages;
    const grid = this.renderRoot.querySelector<HTMLElement>('.day-view');
    if (!drag || !pages || !grid) return;
    try {
      grid.setPointerCapture(event.pointerId);
    } catch {
      // No active pointer by that id (a dispatched event): the moves still reach the grid they are dispatched on.
    }
    this.press.release(event);
    // CAL-14: a scroll being followed ends here; the drag carries on from where it left the days.
    this.dropScroll();
    grid.closest('.calendar')?.setAttribute('data-dragging', '');
    const moving = this.views.length > 1;
    let at = moving ? this.progressNow() : 0;
    let views = moving ? this.views : [this.month];
    const box = pages.getBoundingClientRect();
    drag.unit = Math.max(1, this.axis === 'vertical' ? box.height / VIEW_ROWS : box.width);
    this.pin();
    const [before, after] = [addMonthsTo(this.month, -1), addMonthsTo(this.month, 1)];
    if (sameMonth(views[0], this.month) && this.allowed(before)) {
      views = [before, ...views];
      at += 1;
    }
    if (sameMonth(views[views.length - 1], this.month) && this.allowed(after)) views = [...views, after];
    drag.home = views.findIndex((view) => sameMonth(view, this.month));
    const has = (index: number) => index >= 0 && index < views.length && this.allowed(views[index]) && sameMonth(views[index], addMonthsTo(this.month, index - drag.home));
    drag.low = Math.min(at, has(drag.home - 1) ? drag.home - 1 : drag.home);
    drag.high = Math.max(at, has(drag.home + 1) ? drag.home + 1 : drag.home);
    drag.from = travelAt(this.stepsOf(views), at);
    drag.at = at;
    drag.taken = true;
    this.views = views;
    this.step = null;
    // A change that was playing stops where the drag took the days from.
    this.endTravel();
    pages.setAttribute('data-held', '');
    pages.style.setProperty(PROGRESS, String(at));
    window.addEventListener('keydown', this.onDragKeyDown, true);
    this.requestUpdate();
  }

  /**
   * CAL-30: the days move by the distance the pointer has travelled along the axis since the press, in the frame it
   * moves — toward the next month for a drag toward the top (or the start), wherever the pointer goes in either layout
   * direction (CAL-26) — and stop at the neighbouring month's view.
   */
  private followDrag(event: PointerEvent) {
    const drag = this.drag;
    const pages = this.pages;
    if (!drag?.taken || !pages) return;
    const toward = this.axis === 'vertical' || !this.rtl ? -1 : 1;
    const steps = this.stepsOf(this.views);
    const travel = drag.from + (toward * drag.gesture.distance(event)) / drag.unit;
    drag.at = clamp(travel < 0 ? 0 : progressAt(steps, travel), drag.low, drag.high);
    pages.style.setProperty(PROGRESS, String(drag.at));
  }

  /**
   * CAL-31: the release chooses the displayed month or the neighbour the days have moved toward — the neighbour from a
   * quarter of the way on (as the end of a scroll does, CAL-34), or the one a fling is toward — shows it as any month change (CAL-13) and lets the
   * days travel there from where they are; a release on the displayed month returns them and announces nothing.
   */
  private readonly onDragUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    if (!drag.taken) {
      this.drag = null;
      return;
    }
    this.followDrag(event);
    const toward = this.axis === 'vertical' || !this.rtl ? -1 : 1;
    const velocity = toward * drag.gesture.velocity(event);
    const side = Math.sign(drag.at - drag.home);
    const fling = Math.abs(velocity) >= SHEET_FLING_VELOCITY;
    const chosen = side !== 0 && (fling ? Math.sign(velocity) === side : Math.abs(drag.at - drag.home) >= SETTLE_SHARE - EPSILON) ? drag.home + side : drag.home;
    this.endDrag(clamp(chosen, 0, this.views.length - 1));
  };

  /** CAL-32: the platform cancels the pointer (a system gesture, a lost capture): the days return. */
  private readonly onDragCancel = (event: PointerEvent) => {
    if (this.drag && event.pointerId === this.drag.gesture.id) this.cancelDrag();
  };

  /** CAL-32: Escape while a drag lasts cancels it, and is spent on it: nothing behind the calendar hears it. */
  private readonly onDragKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.drag?.taken) return;
    event.preventDefault();
    event.stopPropagation();
    this.cancelDrag();
  };

  /** CAL-32: the drag is over without a choice — the days return to the displayed month's view; nothing is announced. */
  private cancelDrag() {
    const drag = this.drag;
    if (!drag) return;
    if (drag.taken) this.endDrag(drag.home);
    else this.drag = null;
  }

  /**
   * Lets go of the pointer, without moving anything. The progress stays held where the drag left it until the next
   * step is written (`applyStep`), so that no style read in between starts a travel from somewhere else.
   */
  private dropDrag() {
    const drag = this.drag;
    this.drag = null;
    window.removeEventListener('keydown', this.onDragKeyDown, true);
    if (!drag?.taken) return;
    const grid = this.renderRoot?.querySelector<HTMLElement>('.day-view');
    grid?.closest('.calendar')?.removeAttribute('data-dragging');
    if (grid?.hasPointerCapture?.(drag.gesture.id)) grid.releasePointerCapture(drag.gesture.id);
  }

  /**
   * CAL-31, CAL-32: the drag ends on the view at `index`. Another month than the displayed one is shown as CAL-13 says;
   * the days go there from where the pointer left them over the page motion — at once where motion is reduced.
   */
  private endDrag(index: number) {
    const drag = this.drag;
    if (!drag?.taken) return;
    const month = this.views[index];
    // The click this release may still produce chooses no day (CAL-31); the mark is taken away by it, or by the next press.
    this.swallowClick = true;
    const from = drag.at;
    const travel = this.canTravel;
    this.dropDrag();
    if (!sameMonth(month, this.month)) {
      const focused = (this.renderRoot as ShadowRoot).activeElement;
      this.month = month;
      this.carryActive(month, focused);
      this.announce();
    }
    if (!travel) {
      this.rest();
      return;
    }
    // From where the pointer left the days — said again, so that it is where the travel starts even when no frame was drawn there.
    this.step = { jump: from, to: index };
    this.requestUpdate();
  }

  // ── The day grid's keys and presses (CAL-10, CAL-11, CAL-20) ──────────────────────────────────────────────────────

  private dayOf(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.classList.contains('day') && node.dataset.date) return node;
      if (node === this) break;
    }
    return null;
  }

  private containerOf(cell: HTMLElement): HTMLElement | null {
    return cell.querySelector<HTMLElement>(cell.classList.contains('in-range') ? '.band' : '.box');
  }

  /** CAL-11: moves the active day (showing its month) and focus to it, never before min or after max. */
  private moveActive(to: CalendarDate) {
    const target = clampDate(to, this.cfg.min, this.cfg.max);
    if (!inMonth(target, this.month)) {
      this.showMonth(monthOf(target));
      this.active = target;
      this.announce();
    } else this.active = target;
    this.focusAfter = 'day';
    this.ringAfter = true;
  }

  private readonly onGridKeyDown = (event: KeyboardEvent) => {
    const cell = this.dayOf(event);
    if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;
    const day = parseIsoDate(cell.dataset.date)!;
    const forward = this.rtl ? -1 : 1;
    const column = (weekdayOf(day) - this.cfg.firstDay + 7) % 7;
    let to: CalendarDate | null = null;
    switch (event.key) {
      case 'ArrowRight':
        to = addDays(day, forward);
        break;
      case 'ArrowLeft':
        to = addDays(day, -forward);
        break;
      case 'ArrowDown':
        to = addDays(day, 7);
        break;
      case 'ArrowUp':
        to = addDays(day, -7);
        break;
      case 'Home':
        to = addDays(day, -column);
        break;
      case 'End':
        to = addDays(day, 6 - column);
        break;
      case 'PageDown':
        to = addMonths(day, event.shiftKey ? 12 : 1);
        break;
      case 'PageUp':
        to = addMonths(day, event.shiftKey ? -12 : -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (event.repeat) return;
        this.pressedBox = this.containerOf(cell);
        this.press.press(null);
        this.choose(day);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.moveActive(to);
  };

  private readonly onGridKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') this.press.release(event);
  };

  private readonly onGridPointerDown = (event: PointerEvent) => {
    this.swallowClick = false;
    this.onDragDown(event);
    const cell = this.dayOf(event);
    if (!cell) return;
    this.pressedBox = this.containerOf(cell);
    this.press.onPointerDown(event);
  };

  private readonly onGridPointerUp = (event: PointerEvent) => {
    this.onDragUp(event);
    this.press.release(event);
  };

  /** CAL-15: a press on a neighbouring month's day moves no focus by itself: the day takes it once its month is shown, if focus was in the grid. */
  private readonly onGridMouseDown = (event: MouseEvent) => {
    if (this.dayOf(event)?.dataset.adjacent !== undefined) event.preventDefault();
  };

  private readonly onGridClick = (event: MouseEvent) => {
    if (this.swallowClick) {
      this.swallowClick = false;
      return;
    }
    const cell = this.dayOf(event);
    if (!cell) return;
    const day = parseIsoDate(cell.dataset.date)!;
    if (inMonth(day, this.month)) {
      this.active = day;
      this.choose(day);
      return;
    }
    // CAL-15: an available day of a neighbouring month is chosen as any day — change first — and then its month is
    // shown (CAL-13, with the motion of CAL-14), where it is the active day and takes focus if focus was in the grid.
    if (this.cfg.unavailable(day)) return;
    const focused = (this.renderRoot as ShadowRoot).activeElement;
    this.choose(day);
    this.showMonth(monthOf(day));
    this.active = day;
    if (focused instanceof HTMLElement && focused.classList.contains('day')) {
      this.focusAfter = 'day';
      this.ringAfter = false;
    }
    this.announce();
  };

  private readonly onCellFocus = (event: FocusEvent) => {
    const cell = event.target as HTMLElement;
    if (cell.classList?.contains('cell')) syncFocusStyle(this, cell);
  };

  // ── The year list (CAL-7, CAL-12) ─────────────────────────────────────────────────────────────────────────────────

  private get years(): [number, number] {
    const { min, max } = this.cfg;
    return [min?.year ?? FIRST_LISTED_YEAR, max?.year ?? LAST_LISTED_YEAR];
  }

  private yearOf(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.classList.contains('year')) return node;
      if (node === this) break;
    }
    return null;
  }

  private readonly onYearsKeyDown = (event: KeyboardEvent) => {
    const button = this.yearOf(event);
    if (!button || event.altKey || event.ctrlKey || event.metaKey) return;
    const year = Number(button.dataset.year);
    const [first, last] = this.years;
    const forward = this.rtl ? -1 : 1;
    const moves: Record<string, number> = { ArrowRight: year + forward, ArrowLeft: year - forward, ArrowDown: year + 3, ArrowUp: year - 3, Home: first, End: last };
    if (event.key in moves) {
      event.preventDefault();
      this.activeYear = Math.min(last, Math.max(first, moves[event.key]));
      this.focusAfter = 'year';
      this.ringAfter = true;
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      this.pressedBox = button.querySelector('.box');
      this.press.onKeyDown(event);
    }
  };

  private readonly onYearsPointerDown = (event: PointerEvent) => {
    const button = this.yearOf(event);
    if (!button) return;
    this.pressedBox = button.querySelector('.box');
    this.press.onPointerDown(event);
  };

  private readonly onYearsClick = (event: MouseEvent) => {
    const button = this.yearOf(event);
    if (button) this.chooseYear(Number(button.dataset.year), event.detail === 0);
  };

  /** CAL-7: the displayed year's row is the third in view, or as near to it as the list's ends allow. */
  private scrollYears() {
    const list = this.renderRoot.querySelector<HTMLElement>('.years');
    const first = list?.querySelector<HTMLElement>('.year');
    if (!list || !first) return;
    const row = Math.floor((this.month.year - this.years[0]) / 3);
    list.scrollTop = Math.max(0, (row - 2) * first.offsetHeight);
  }

  /** The year list has faded out (its `visibility` is the last to change): the day view holds no year. */
  private readonly onYearsFaded = (event: TransitionEvent) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'visibility') return;
    this.releaseYears();
  };

  /** Lets go of the years once the day view is shown and the list is out of sight (at once where nothing fades). */
  private releaseYears() {
    if (!this.yearsHeld || this.view === 'year') return;
    const list = this.renderRoot?.querySelector<HTMLElement>('.years');
    if (list && getComputedStyle(list).visibility !== 'hidden') return;
    this.yearsHeld = false;
    this.requestUpdate();
  }

  /** CAL-12: the focused year scrolled into view inside the list. */
  private revealYear(button: HTMLElement) {
    const list = button.closest<HTMLElement>('.years');
    if (!list) return;
    const [box, room] = [button.getBoundingClientRect(), list.getBoundingClientRect()];
    if (box.top < room.top) list.scrollTop -= room.top - box.top;
    else if (box.bottom > room.bottom) list.scrollTop += box.bottom - room.bottom;
  }

  // ── The view toggle's press (CAL-6, CAL-20) ───────────────────────────────────────────────────────────────────────

  private readonly onTogglePointerDown = (event: PointerEvent) => {
    this.pressedBox = (event.currentTarget as HTMLElement).querySelector('.box');
    this.press.onPointerDown(event);
  };

  private readonly onToggleKeyDown = (event: KeyboardEvent) => {
    this.pressedBox = (event.currentTarget as HTMLElement).querySelector('.box');
    this.press.onKeyDown(event);
  };

  // ── Updates ───────────────────────────────────────────────────────────────────────────────────────────────────────

  protected override willUpdate(changed: PropertyValues<this>) {
    this.cfg = this.readConfig();
    const axis = this.axis;
    if (this.readAxis() !== axis && this.hasUpdated) {
      // Another system's axis draws the days anew (a column, or pages): nothing is left to move, and a focused day keeps the focus.
      const focused = (this.renderRoot as ShadowRoot).activeElement;
      if (focused instanceof HTMLElement && focused.classList.contains('day')) {
        this.focusAfter = 'day';
        this.ringAfter = focused.matches(':focus-visible');
      }
      this.forgetScroll();
      this.dropDrag();
      this.views = [this.month];
      this.step = { jump: 0, to: 0 };
    }
    const { min, max, choice, startView } = this.cfg;
    if (!this.hasUpdated) {
      // CAL-17: the month of the choice or of today, or the year view.
      this.view = startView;
      this.yearsHeld = startView === 'year';
      this.month = this.homeMonth();
      this.active = this.activeDayOf(this.month);
      this.activeYear = this.month.year;
      this.scrollYearsAfter = this.view === 'year';
      this.views = [this.month];
      return;
    }
    const own = this.ownChoice;
    this.ownChoice = false;
    if (!own) {
      // CAL-17: a date the product sets outside the displayed month shows that month, without the slide.
      const set = (['value', 'start', 'end'] as const).find((name) => changed.has(name) && choice[name] && !inMonth(choice[name], this.month));
      // CAL-32: a date the product sets while a drag lasts cancels it — the days return, to that date's month where it names one.
      // A scroll being followed is cancelled the same way, and what is left of it is ignored.
      const named = (['value', 'start', 'end'] as const).some((name) => changed.has(name));
      const dragged = (!!this.drag?.taken || !!this.wheel?.following) && named;
      if (dragged) {
        this.cancelDrag();
        this.cancelScroll();
      }
      if (set) {
        this.showMonth(clampMonth(monthOf(choice[set]!), min, max), { motion: dragged });
        this.active = this.activeDayOf(this.month);
        this.activeYear = this.month.year;
      }
    }
    // The bounds may have moved: the displayed month and the active day stay inside them.
    const clamped = clampMonth(this.month, min, max);
    if (compareMonths(clamped, this.month) !== 0) {
      this.month = clamped;
      this.active = this.activeDayOf(clamped);
    } else if (!inMonth(this.active, this.month)) this.active = this.activeDayOf(this.month);
    else this.active = clampDate(this.active, min, max);
    // The grid holds the displayed month's view: alone at rest, among the views the days move between otherwise.
    if (!this.views.some((view) => sameMonth(view, this.month)) || this.views.some((view) => !this.allowed(view))) {
      this.forgetScroll();
      this.dropDrag();
      this.views = [this.month];
      this.step = { jump: 0, to: 0 };
    }
  }

  /**
   * CAL-35: a part that needs a word nobody gave — not the instance, not the product's words — is still drawn and
   * works; it is recorded (`missingWords()`) and, in a debug build, reported once, naming the prop. The view toggle's
   * description is not one of them: its name and its expanded state already say what it shows.
   */
  private reportWords() {
    const { choice } = this.cfg;
    if (this.view !== 'year') {
      if (!this.words.get('previousMonthLabel', this.previousMonthLabel)) this.words.missing('previousMonthLabel', { id: 'CAL-35', effect: 'the previous-month button is drawn and works, and has no accessible name' });
      if (!this.words.get('nextMonthLabel', this.nextMonthLabel)) this.words.missing('nextMonthLabel', { id: 'CAL-35', effect: 'the next-month button is drawn and works, and has no accessible name' });
    }
    if (choice.start && !this.words.get('startLabel', this.startLabel)) this.words.missing('startLabel', { id: 'CAL-35', effect: 'the start of the range has no description' });
    if (choice.end && !this.words.get('endLabel', this.endLabel)) this.words.missing('endLabel', { id: 'CAL-35', effect: 'the end of the range has no description' });
  }

  protected override updated() {
    this.shown = true;
    this.reportWords();
    this.applyStep();
    if (this.scrollYearsAfter) {
      this.scrollYearsAfter = false;
      this.scrollYears();
    }
    // Where the list does not fade (reduced motion, a calendar that is not drawn) no transition ends: it is let go here.
    this.releaseYears();
    this.keepPagingFocus();
    if (this.focusAfter) {
      const what = this.focusAfter;
      const ring = this.ringAfter;
      this.focusAfter = null;
      this.ringAfter = undefined;
      const options: FocusOptions & { focusVisible?: boolean } = ring === undefined ? {} : { focusVisible: ring };
      if (what === 'day') this.focus(options);
      else {
        const button = this.renderRoot.querySelector<HTMLElement>(`.year[data-year="${this.activeYear}"]`);
        if (button) {
          button.focus({ ...options, preventScroll: true });
          this.revealYear(button);
        }
      }
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /** The day grid's item: one day, a gridcell with its condition and state (CAL-2, CAL-3, CAL-15, CAL-16, CAL-23). */
  protected renderDay(day: GridDay | null, look: Between = {}): TemplateResult {
    if (!day) return html`<div class="cell empty" aria-hidden="true"></div>`;
    const { locale, today, unavailable, choice } = this.cfg;
    const { date, adjacent } = day;
    const { start, end } = choice;
    const condition = this.dayCondition(day);
    const disabled = unavailable(date);
    const band = !!start && !!end && compareDates(start, end) !== 0;
    const isStart = band && sameDate(date, start);
    const isEnd = band && sameDate(date, end);
    // CAL-35: the words of a range's ends are the instance's, else the product's; without them the day has no description.
    const described = [sameDate(date, start) ? this.words.get('startLabel', this.startLabel) : '', sameDate(date, end) ? this.words.get('endLabel', this.endLabel) : ''].filter(Boolean).join(', ');
    return html`<div
      role="gridcell"
      part="day"
      class=${classMap({ cell: true, day: true, [condition]: condition !== 'unselected', 'range-start': isStart, 'range-end': isEnd, between: !!look.mix })}
      style=${styleMap(look.mix ? { '--_mix': look.mix } : {})}
      data-date=${isoOf(date)}
      ?data-adjacent=${adjacent}
      ?inert=${!!look.coming}
      aria-hidden=${ifDefined(look.coming ? 'true' : undefined)}
      tabindex=${!adjacent && !look.coming && sameDate(date, this.active) ? '0' : '-1'}
      aria-selected=${condition === 'selected' || condition === 'in-range' ? 'true' : 'false'}
      aria-disabled=${ifDefined(disabled ? 'true' : undefined)}
      aria-current=${ifDefined(sameDate(date, today) ? 'date' : undefined)}
      aria-label=${fullDateText(locale, date)}
      aria-description=${ifDefined(described || undefined)}
    >
      <span class="lane" style=${styleMap(look.opacity ? { opacity: look.opacity } : {})}
        ><span class="band"></span><span class="box" data-tanrei-shape>${numberText(locale, date.day)}</span></span
      >
    </div>`;
  }

  /**
   * CAL-29: the day grid on the vertical axis — ONE column of week rows, keyed by their first day, holding the rows of
   * every view the grid holds: the displayed month's six at rest, and those of the months the days move between while a
   * change plays or a drag lasts. Each day is drawn between what the views draw for it, by the progress: faded where a
   * view does not draw it (a row outside its six; an empty cell without showAdjacentDays), mixed between the adjacent
   * and the unselected condition where it is a neighbouring month's in one view and the month's own in another. What the
   * displayed month's view does not hold is inert and hidden until that month is the displayed one (CAL-32).
   */
  private renderColumn(): TemplateResult {
    const views = this.views;
    const home = views.findIndex((view) => sameMonth(view, this.month));
    const rows = this.weekRows(views);
    const steps = this.stepsOf(views, 'vertical');
    const travel = steps.map((step, i) => `${step} * clamp(0, var(${PROGRESS}) - ${i}, 1)`).join(' + ');
    const cell = (row: WeekRow, date: CalendarDate): TemplateResult => {
      const own = views.map((view) => inMonth(date, view));
      const drawn = views.map((_, i) => row.held[i] && (own[i] || this.showAdjacentDays));
      if (!drawn.some(Boolean)) return this.renderDay(null);
      // Where a view does not draw the day its condition there is the nearest drawing view's, so that nothing mixes unseen:
      // a day only October's view draws is one of the month's own for as long as it fades in.
      const first = drawn.indexOf(true);
      let last = own[first];
      const conditions = own.map((value, i) => (last = drawn[i] ? value : last));
      const day: GridDay = { date, adjacent: !conditions[home] };
      const condition = this.dayCondition(day);
      const mix = condition === 'adjacent' || condition === 'unselected' ? between(conditions.map(Number)) : null;
      const opacity = between(drawn.map(Number));
      return this.renderDay(day, { ...(mix ? { mix } : {}), ...(opacity ? { opacity } : {}), coming: !drawn[home] });
    };
    return html`<div role="rowgroup" class="page current" style=${styleMap(views.length > 1 ? { '--_travel': `calc(${travel})`, '--_rows': String(rows.length) } : {})}>
      ${repeat(
        rows,
        (row) => isoOf(row.start),
        (row) => {
          const days = Array.from({ length: 7 }, (_, column) => addDays(row.start, column));
          const cells = days.map((date) => cell(row, date));
          const coming = !row.held[home];
          const empty = !coming && days.every((date) => !inMonth(date, this.month) && !this.showAdjacentDays);
          return html`<div role="row" class="row" ?inert=${coming} aria-hidden=${ifDefined(coming || empty ? 'true' : undefined)}>${cells}</div>`;
        },
      )}
    </div>`;
  }

  /**
   * CAL-14, CAL-30: the day grid on the horizontal axis — a page a view, side by side in order, travelling together by
   * the progress. The displayed month's page is the grid's; the others are inert and hidden until theirs is (CAL-32).
   */
  private renderPages(): TemplateResult {
    const { firstDay } = this.cfg;
    const moving = this.views.length > 1;
    return html`${repeat(
      this.views,
      (view) => `${view.year}-${view.month}`,
      (view, place) => {
        const current = sameMonth(view, this.month);
        const cells = monthGrid(view, firstDay, this.showAdjacentDays);
        const rows = Array.from({ length: VIEW_ROWS }, (_, row) => cells.slice(row * 7, row * 7 + 7));
        return html`<div role="rowgroup" class=${classMap({ page: true, current })} style=${styleMap(moving ? { '--_place': String(place) } : {})} ?inert=${!current} aria-hidden=${ifDefined(current ? undefined : 'true')}>
          ${rows.map((row) => html`<div role="row" class="row" aria-hidden=${ifDefined(row.every((day) => !day) ? 'true' : undefined)}>${row.map((day) => this.renderDay(day))}</div>`)}
        </div>`;
      },
    )}`;
  }

  /** The year list's item: one year, a button with its condition (CAL-2, CAL-7, CAL-23). */
  protected renderYear(year: number): TemplateResult {
    const { locale, today } = this.cfg;
    const displayed = year === this.month.year;
    const condition: Condition = displayed ? 'selected' : year === today.year ? 'today' : 'unselected';
    return html`<button
      type="button"
      part="year"
      class=${classMap({ cell: true, year: true, [condition]: condition !== 'unselected' })}
      data-year=${year}
      tabindex=${year === this.activeYear ? '0' : '-1'}
      aria-current=${ifDefined(displayed ? 'true' : undefined)}
      aria-description=${ifDefined((year === today.year && (this.words.get('todayLabel', this.todayLabel) || todayName(locale))) || undefined)}
    >
      <span class="lane"><span class="box" data-tanrei-shape>${numberText(locale, year)}</span></span>
    </button>`;
  }

  /**
   * CAL-5: the arrows follow the axis — up and down, or back and forward. The names never change with the direction:
   * arrow_back and arrow_forward are flagged by the icon set, so each Button's icon helper mirrors its glyph in
   * right-to-left (BTN-19), and previous still points to the start edge.
   */
  private glyphs(): { previous: string; next: string } {
    return this.axis === 'vertical' ? { previous: GLYPHS.up, next: GLYPHS.down } : { previous: GLYPHS.back, next: GLYPHS.forward };
  }

  protected override render() {
    const { locale, firstDay, min, max } = this.cfg;
    const year = this.view === 'year';
    const monthYear = monthYearText(locale, this.month);
    const narrow = narrowWeekdays(locale);
    const long = longWeekdays(locale);
    const [first, last] = this.years;
    const moving = this.views.length > 1;
    const glyphs = this.glyphs();
    const label = this.label.trim();
    return html`<div class="calendar" role=${ifDefined(label || namedByProduct(this) ? 'group' : undefined)} ${delegatedAria(this, { 'aria-label': label })} data-axis=${this.axis}>
      <div part="navigation" class="nav">
        <button
          type="button"
          part="view-toggle"
          class="cell toggle"
          aria-expanded=${year ? 'true' : 'false'}
          aria-description=${ifDefined(this.words.get('yearViewLabel', this.yearViewLabel) || undefined)}
          @click=${this.onToggleView}
          @pointerdown=${this.onTogglePointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @pointerleave=${this.press.release}
          @keydown=${this.onToggleKeyDown}
          @keyup=${this.press.onKeyUp}
          @blur=${this.press.onBlur}
          @focus=${this.onCellFocus}
        >
          <span class="lane"
            ><span class="box" data-tanrei-shape><span class="toggle-label">${monthYear}</span><span class="chevron" aria-hidden="true">${GLYPHS.expand}</span></span></span
          >
        </button>
        <span class="arrows" ?data-off=${year}>
          <tanrei-button
            class="previous"
            variant="text"
            size="medium"
            label=${this.words.get('previousMonthLabel', this.previousMonthLabel)}
            ?disabled=${!!min && compareMonths(this.month, min) <= 0}
            @click=${() => this.pageBy(-1)}
            ><span slot="icon">${glyphs.previous}</span></tanrei-button
          >
          <tanrei-button
            class="next"
            variant="text"
            size="medium"
            label=${this.words.get('nextMonthLabel', this.nextMonthLabel)}
            ?disabled=${!!max && compareMonths(this.month, max) >= 0}
            @click=${() => this.pageBy(1)}
            ><span slot="icon">${glyphs.next}</span></tanrei-button
          >
        </span>
      </div>
      <div class="views">
        <div
          part="grid"
          class="day-view"
          role="grid"
          aria-label=${monthYear}
          ?data-off=${year}
          ?inert=${year}
          @keydown=${this.onGridKeyDown}
          @keyup=${this.onGridKeyUp}
          @pointerdown=${this.onGridPointerDown}
          @pointermove=${this.onDragMove}
          @pointerup=${this.onGridPointerUp}
          @pointercancel=${(event: PointerEvent) => (this.onDragCancel(event), this.press.release(event))}
          @lostpointercapture=${this.onDragCancel}
          @pointerleave=${this.press.release}
          @mousedown=${this.onGridMouseDown}
          @click=${this.onGridClick}
          @dragstart=${(event: DragEvent) => event.preventDefault()}
          @wheel=${this.onWheel}
          @focusin=${this.onCellFocus}
          @focusout=${this.press.onBlur}
        >
          <div role="rowgroup">
            <div role="row" class="row weekdays">
              ${weekdayColumns(firstDay).map((weekday) => html`<div role="columnheader" class="weekday" aria-label=${long[weekday]}>${narrow[weekday]}</div>`)}
            </div>
          </div>
          <div class="pages" data-moving=${ifDefined(moving ? this.axis : undefined)}>
            ${this.axis === 'vertical' ? this.renderColumn() : this.renderPages()}
          </div>
        </div>
        <div
          part="years"
          class="years"
          ?data-off=${!year}
          ?inert=${!year}
          @keydown=${this.onYearsKeyDown}
          @keyup=${this.press.onKeyUp}
          @pointerdown=${this.onYearsPointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @pointerleave=${this.press.release}
          @click=${this.onYearsClick}
          @wheel=${containedWheel}
          @focusin=${this.onCellFocus}
          @focusout=${this.press.onBlur}
          @transitionend=${this.onYearsFaded}
          @transitioncancel=${this.onYearsFaded}
        >
          ${year || this.yearsHeld ? Array.from({ length: last - first + 1 }, (_, i) => this.renderYear(first + i)) : nothing}
        </div>
      </div>
      <span class="hold" aria-hidden="true"></span>
      <div class="announce" aria-live="polite">${this.announcement}</div>
    </div>`;
  }
}

// CAL-36: the product's ARIA on the host is its group's, which it is while it has a name (src/primitives/delegated-aria.ts).
delegatesAria(TanreiCalendar, { sentence: 'CAL-36' });
if (!customElements.get('tanrei-calendar')) customElements.define('tanrei-calendar', TanreiCalendar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-calendar': TanreiCalendar;
  }
}
