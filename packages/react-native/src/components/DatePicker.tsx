import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  I18nManager,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import type { TanreiCoreDatePickerCondition, TanreiDatePickerTokens, TanreiPaint } from '../generated/vocabulary';
import {
  addDays,
  addMonths,
  addMonthsTo,
  clampDate,
  clampMonth,
  compareDates,
  compareMonths,
  deviceToday,
  fullDateText,
  headerDateText,
  headerRangeText,
  isoOf,
  localeFirstDay,
  longWeekdays,
  monthGrid,
  monthOf,
  monthYearText,
  narrowWeekdays,
  numberText,
  numericDatePattern,
  numericDateText,
  parseIsoDate,
  parseNumericDate,
  sameDate,
  weekdayColumns,
  weekdayOf,
  WEEKDAY_NAMES,
  type CalendarDate,
  type CalendarMonth,
  type Weekday,
} from '../primitives/calendar';
import { IconBox, Label, drawsColor, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import { useItemRow } from '../primitives/itemRow';
import { PICKER_AT_REST, PickerModal, PickerModalArea, type PickerModalMotion } from '../primitives/pickerModal';
import { resolveLocale } from '../primitives/locale';
import type { PressableHost, RippleAreaNode } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { FocusableNode, KeyDownEvent } from '../primitives/rovingFocus';
import { useStateTransition } from '../primitives/stateTransition';
import { supportsBoxShadow } from '../theme/elevation';
import { iconGlyphStyle } from '../theme/icon';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { useOverlayPortal } from '../theme/overlay';
import { borderCurveOf } from '../theme/shape';
import { TanreiThemeScope, useTanrei, useTanreiInsets, type TanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { placeMenu, type MenuBox } from './Menu';
import { TextField, TextFieldContainerFrameContext, useLevelledContainers } from './TextField';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

// ---------------------------------------------------------------------------------------------------------------
// Public types

/** modal: a dialog over a scrim, committed by OK. docked: a surface below its anchor; choosing a day commits it. */
export type DatePickerPresentation = 'modal' | 'docked';
/** single: one date (`value`). range: one contiguous span (`start` … `end`, inclusive). */
export type DatePickerMode = 'single' | 'range';
/** The weekday in the first column; `locale` takes it from the locale (CLDR's week data). */
export type DatePickerFirstDayOfWeek = 'locale' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
/** How a modal picker opens: on the calendar, or with text fields. */
export type DatePickerEntryMode = 'calendar' | 'text';
/** Whether the calendar opens on the days of a month or on the list of years. */
export type DatePickerStartView = 'day' | 'year';
/**
 * Why the picker asks to be closed (the spec's `close`, DTP-5), by the spec's names: Escape, Android's back (or the iOS
 * accessibility escape gesture), a press on the scrim or outside a docked picker and its anchor, Tab out of a docked
 * picker, keyboard focus leaving it, Cancel, OK, or a docked picker's completed choice.
 */
export type DatePickerCloseReason = 'escape' | 'back' | 'outside' | 'tab' | 'focus-out' | 'cancel' | 'confirm' | 'select';

/** What `onChange` carries: ISO 8601 calendar dates, `''` where none is chosen (`value` in single mode, `start` / `end` in range mode). */
export interface DatePickerSelection {
  value: string;
  start: string;
  end: string;
}

/** What `onClose` carries. */
export interface DatePickerCloseEvent {
  reason: DatePickerCloseReason;
}

/** What a docked picker reads from its anchor (your field or button): where it is, and how to give it focus back. */
export interface DatePickerAnchor {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  focus?: () => void;
}

export interface DatePickerSurfaceProps {
  /** `modal` (the default) or `docked`. Unknown values render as `modal` (DTP-40). */
  presentation?: DatePickerPresentation;
  /** `single` (the default) or `range`. */
  mode?: DatePickerMode;
  /** The chosen date in single mode, as an ISO 8601 calendar date ("2026-09-17"); `''` for none. */
  value?: string;
  /** The first date of the range in range mode; `''` for none. */
  start?: string;
  /** The last date of the range in range mode, never before `start`; `''` while only a start is chosen. */
  end?: string;
  /** The earliest date that can be chosen; `''` for no limit. */
  min?: string;
  /** The latest date that can be chosen; `''` for no limit. */
  max?: string;
  /** Dates that cannot be chosen (booked, closed). */
  disabledDates?: readonly string[];
  /** A rule no list can hold (every weekend): true for an ISO date that cannot be chosen. Read with `disabledDates`. */
  isDateDisabled?: (date: string) => boolean;
  /** The date drawn as today; `''` reads the device's date in its own time zone when the picker opens. */
  today?: string;
  /** The weekday in the first column; `locale` (the default) takes it from the locale. */
  firstDayOfWeek?: DatePickerFirstDayOfWeek;
  /** A BCP 47 tag for names, digits, the numeric date's order and the first day of the week; `''`: the platform's locale. */
  locale?: string;
  /** How a modal picker opens: `calendar` (the default) or `text`. A docked picker has the calendar only. */
  entryMode?: DatePickerEntryMode;
  /** `day` (the default) or `year`: the list of years, for a date far from today. */
  startView?: DatePickerStartView;
  /** Names the picker (its surface's accessible name) and heads a modal picker's header. */
  label?: string;
  /** Single mode: the field's label, and the header while no date is chosen. */
  dateLabel?: string;
  /** Range mode: the start field's label, the header until a start is chosen, and the start day's description. */
  startLabel?: string;
  /** Range mode: the end field's label, the header until an end is chosen, and the end day's description. */
  endLabel?: string;
  /** OK's label. */
  confirmLabel?: string;
  /** Cancel's label. */
  cancelLabel?: string;
  /** The previous-month button's accessible name. */
  previousMonthLabel?: string;
  /** The next-month button's accessible name. */
  nextMonthLabel?: string;
  /** The view toggle's description (its name is the month and year it shows). */
  yearViewLabel?: string;
  /** The entry-mode toggle's name while the calendar is shown. */
  textEntryLabel?: string;
  /** The entry-mode toggle's name while text entry is shown. */
  calendarEntryLabel?: string;
  /** Read after today's date and the current year (React Native has no current-date property). */
  todayLabel?: string;
  /** A field's error when its text is not a date, or its end is before its start. */
  invalidText?: string;
  /** A field's error when its date is before `min`, after `max` or disabled. */
  unavailableText?: string;
  /** The spec's `change`: the person committed a choice that differs from `value` (or `start` and `end`). Before `onClose`. */
  onChange?: (selection: DatePickerSelection) => void;
  /** The spec's `close`: the picker asks to be closed, with the reason. Set `visible` to false. */
  onClose?: (event: DatePickerCloseEvent) => void;
  /** The surface's test id; its parts are `<testID>.<part>`. */
  testID?: string;
}

export interface DatePickerProps extends DatePickerSurfaceProps {
  /** The spec's `open`. **Controlled**: set it to false from `onClose` (DTP-5). */
  visible?: boolean;
  /**
   * The element the picker opens from: a docked picker is placed below it (measured with `measureInWindow`), and focus
   * goes back to it when the picker closes (either presentation).
   */
  anchorRef?: RefObject<DatePickerAnchor | null>;
  /** The window's system insets for this picker; each side named replaces `TanreiProvider`'s `insets`. */
  insets?: TanreiInsets;
}

// ---------------------------------------------------------------------------------------------------------------
// The closed values (DTP-40) and the English words (DTP-37: every word that is not locale data is a prop)

const PRESENTATIONS: readonly DatePickerPresentation[] = ['modal', 'docked'];
const MODES: readonly DatePickerMode[] = ['single', 'range'];
const FIRST_DAYS: readonly DatePickerFirstDayOfWeek[] = ['locale', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ENTRY_MODES: readonly DatePickerEntryMode[] = ['calendar', 'text'];
const START_VIEWS: readonly DatePickerStartView[] = ['day', 'year'];

const WORDS = {
  label: 'Select date',
  dateLabel: 'Date',
  startLabel: 'Start date',
  endLabel: 'End date',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
  yearViewLabel: 'Choose a year',
  textEntryLabel: 'Switch to text entry',
  calendarEntryLabel: 'Switch to calendar',
  todayLabel: 'Today',
  invalidText: 'Enter a valid date',
  unavailableText: "This date can't be chosen",
} as const;
type Words = { -readonly [Key in keyof typeof WORDS]: string };

/** The glyphs the picker draws (the spec names them): the paging arrows, the view toggle's chevron, the entry-mode toggle. */
const GLYPHS = { previous: 'chevron_left', next: 'chevron_right', expand: 'expand_more', keyboard: 'keyboard', calendar: 'calendar_month' } as const;

/** Years listed while min or max is empty (DTP-16). */
const FIRST_LISTED_YEAR = 1900;
const LAST_LISTED_YEAR = 2100;

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
/** The text-entry fields by index: one in single mode, start and end in range mode (DTP-25). */
const SINGLE_FIELD = ['0'] as const;
const RANGE_FIELDS = ['0', '1'] as const;
const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };
const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

// ---------------------------------------------------------------------------------------------------------------
// The picker's configuration: its props read once, unknown and malformed values reported (DTP-40)

interface Choice {
  value: CalendarDate | null;
  start: CalendarDate | null;
  end: CalendarDate | null;
}

interface PickerConfig {
  presentation: DatePickerPresentation;
  mode: DatePickerMode;
  entryMode: DatePickerEntryMode;
  startView: DatePickerStartView;
  firstDay: Weekday;
  locale: string;
  min: CalendarDate | null;
  max: CalendarDate | null;
  today: CalendarDate;
  /** The committed choice the props name (what the picker opened with). */
  committed: Choice;
  unavailable: (date: CalendarDate) => boolean;
  words: Words;
  reports: string[];
}

const selectionOf = (choice: Choice, mode: DatePickerMode): DatePickerSelection =>
  mode === 'single' ? { value: choice.value ? isoOf(choice.value) : '', start: '', end: '' } : { value: '', start: choice.start ? isoOf(choice.start) : '', end: choice.end ? isoOf(choice.end) : '' };
const sameSelection = (a: DatePickerSelection, b: DatePickerSelection) => a.value === b.value && a.start === b.start && a.end === b.end;

function readConfig(props: DatePickerSurfaceProps, today: CalendarDate | null, where: string): PickerConfig {
  const reports: string[] = [];
  const report = (message: string) => reports.push(`Tanrei: a DatePicker${where} ${message}`);
  const presentation = closedValue(PRESENTATIONS, props.presentation ?? 'modal', 'modal', 'DatePicker presentation');
  const mode = closedValue(MODES, props.mode ?? 'single', 'single', 'DatePicker mode');
  const entryMode = closedValue(ENTRY_MODES, props.entryMode ?? 'calendar', 'calendar', 'DatePicker entryMode');
  const startView = closedValue(START_VIEWS, props.startView ?? 'day', 'day', 'DatePicker startView');
  const firstDayOfWeek = closedValue(FIRST_DAYS, props.firstDayOfWeek ?? 'locale', 'locale', 'DatePicker firstDayOfWeek');
  const locale = resolveLocale(props.locale, 'DatePicker locale');
  const firstDay: Weekday = firstDayOfWeek === 'locale' ? localeFirstDay(locale) : (WEEKDAY_NAMES.indexOf(firstDayOfWeek) as Weekday);

  const date = (name: string, text: string | undefined): CalendarDate | null => {
    if (!text) return null;
    const parsed = parseIsoDate(text);
    if (!parsed) report(`has ${name} "${text}", which is not an ISO 8601 calendar date (YYYY-MM-DD); it is ignored.`);
    return parsed;
  };
  let min = date('min', props.min);
  let max = date('max', props.max);
  if (min && max && compareDates(min, max) > 0) {
    report(`has min "${props.min}" after max "${props.max}"; both are ignored.`);
    min = null;
    max = null;
  }
  const todayProp = date('today', props.today);
  let value = date('value', props.value);
  let start = date('start', props.start);
  let end = date('end', props.end);
  if (mode === 'range' && value) {
    report(`in range mode has value "${props.value}"; a range is start and end, so it is ignored.`);
    value = null;
  }
  if (mode === 'single' && (start || end)) {
    report('in single mode has start or end; a single date is value, so they are ignored.');
    start = null;
    end = null;
  }
  if (start && end && compareDates(end, start) < 0) {
    report(`has end "${props.end}" before start "${props.start}"; the end is ignored.`);
    end = null;
  }
  if (end && !start) {
    report(`has end "${props.end}" without a start; it is ignored.`);
    end = null;
  }
  const disabled = new Set<string>();
  for (const entry of props.disabledDates ?? []) {
    const parsed = date('an entry of disabledDates', entry);
    if (parsed) disabled.add(isoOf(parsed));
  }
  const predicate = props.isDateDisabled;
  const unavailable = (day: CalendarDate) => (min !== null && compareDates(day, min) < 0) || (max !== null && compareDates(day, max) > 0) || disabled.has(isoOf(day)) || (predicate?.(isoOf(day)) ?? false);

  const words = Object.fromEntries(Object.entries(WORDS).map(([name, fallback]) => [name, (props as Record<string, unknown>)[name] ?? fallback])) as Words;
  if (!words.label.trim()) report('has an empty label, so its surface has no accessible name.');
  if (presentation === 'docked' && entryMode === 'text') report('is docked with entryMode "text"; a docked picker has the calendar only (DTP-28).');

  return { presentation, mode, entryMode, startView, firstDay, locale, min, max, today: todayProp ?? today ?? deviceToday(), committed: { value, start, end }, unavailable, words, reports };
}

/** The month a picker opens on (DTP-29): the chosen date's or start's, otherwise today's, between min's and max's months. */
const openingMonth = (config: PickerConfig, choice: Choice): CalendarMonth => clampMonth(monthOf(choice.value ?? choice.start ?? config.today), config.min, config.max);

/**
 * The active day of a month that is shown (DTP-17): the chosen date (start) when it lies in it, otherwise today when it
 * does, otherwise the first available day, otherwise its first day.
 */
function activeDayOf(month: CalendarMonth, choice: Choice, config: PickerConfig): CalendarDate {
  const inMonth = (day: CalendarDate | null) => day !== null && day.year === month.year && day.month === month.month;
  const chosen = choice.value ?? choice.start;
  if (inMonth(chosen)) return chosen!;
  if (inMonth(config.today)) return config.today;
  const days = monthGrid(month, 0).filter((day): day is CalendarDate => day !== null);
  return days.find((day) => !config.unavailable(day)) ?? days[0]!;
}

/**
 * DTP-10: the condition a day is drawn from, by precedence — selected (the date, or a range's start or end) over in-range
 * (strictly between them) over today over unselected.
 */
function dayCondition(day: CalendarDate, choice: Choice, today: CalendarDate): TanreiCoreDatePickerCondition {
  if (sameDate(day, choice.value) || sameDate(day, choice.start) || sameDate(day, choice.end)) return 'selected';
  if (choice.start && choice.end && compareDates(day, choice.start) > 0 && compareDates(day, choice.end) < 0) return 'inRange';
  if (sameDate(day, today)) return 'today';
  return 'unselected';
}

// ---------------------------------------------------------------------------------------------------------------
// DatePicker

/**
 * Tanrei DatePicker — spec: `specs/date-picker.spec.json`.
 * One date or one range of dates from a month calendar, or typed. `presentation="modal"`: a dialog in a transparent
 * `Modal` (its own window) over a scrim, with a header, text entry, Cancel and OK; the choice is pending until OK.
 * `presentation="docked"`: an operated overlay below `anchorRef`, drawn in `TanreiProvider`'s overlay layer (not
 * modal); choosing a day commits it. Anatomy: container > [header: label, the pending choice, the entry-mode toggle;
 * divider] > navigation row (view toggle, previous and next month) > weekday row > six rows of days (or the year list,
 * or the text fields) > [Cancel, OK]. Values are ISO 8601 strings; nothing here holds a `Date`.
 */
export function DatePicker({ visible = false, anchorRef, insets, ...surface }: DatePickerProps) {
  const presentation = closedValue(PRESENTATIONS, surface.presentation ?? 'modal', 'modal', 'DatePicker presentation');
  // DTP-4: focus goes back to the anchor when the picker closes — when focus is inside, or was inside when the close
  // was asked for (Tab, Escape, a choice). Focus that has already left (focus-out) stays where the person moved it.
  const focusInside = useRef(false);
  const returnFocus = useRef(false);
  const wasOpen = useRef(visible);
  useEffect(() => {
    if (wasOpen.current && !visible && (focusInside.current || returnFocus.current)) anchorRef?.current?.focus?.();
    if (!visible) {
      focusInside.current = false;
      returnFocus.current = false;
    }
    wasOpen.current = visible;
  }, [visible, anchorRef]);
  const callerClose = surface.onClose;
  const onClose = useCallback(
    (event: DatePickerCloseEvent) => {
      if (focusInside.current) returnFocus.current = true;
      callerClose?.(event);
    },
    [callerClose],
  );
  // A new session each time the picker opens: its pending choice, month and views start again (DTP-6, DTP-29).
  const [session, setSession] = useState(visible ? 1 : 0);
  const opened = useRef(visible);
  useEffect(() => {
    if (visible && !opened.current) setSession((previous) => previous + 1);
    opened.current = visible;
  }, [visible]);
  const onFocusWithin = useCallback((inside: boolean) => {
    focusInside.current = inside;
  }, []);
  const withClose = { ...surface, onClose };
  if (presentation === 'modal') return <ModalPicker visible={visible} session={session} surface={withClose} insets={insets} onFocusWithin={onFocusWithin} />;
  return <DockedPicker visible={visible} session={session} surface={withClose} anchorRef={anchorRef} insets={insets} onFocusWithin={onFocusWithin} />;
}

/**
 * The picker as it is drawn while open, in place, without a `Modal`, the overlay layer, motion or a focus move: the
 * spec's snapshot harness (DTP-1's verify), the gallery and a documentation page. A modal picker draws its scrim over
 * the whole area it is in and centres its container; a docked one draws its container at its natural size.
 * It is fully operable: the grid, the keys, the views, the fields and the actions work as in the overlay.
 */
export function DatePickerSurface(props: DatePickerSurfaceProps) {
  const presentation = closedValue(PRESENTATIONS, props.presentation ?? 'modal', 'modal', 'DatePicker presentation');
  const close = useCallback((reason: DatePickerCloseReason) => props.onClose?.({ reason }), [props.onClose]);
  if (presentation === 'docked') return <PickerBody surface={props} focusSignal={0} onRequestClose={close} />;
  return (
    <ModalArea surface={props} motion={PICKER_AT_REST} onRequestClose={close} focusSignal={0} inPlace />
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The modal presentation (DTP-1, DTP-4, DTP-22)

interface PresentationProps {
  visible: boolean;
  session: number;
  surface: DatePickerSurfaceProps;
  insets: TanreiInsets | undefined;
  onFocusWithin: (inside: boolean) => void;
}

function ModalPicker({ visible, session, surface, insets: own, onFocusWithin }: PresentationProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.datePicker;
  const insets = useTanreiInsets(own);
  const close = useCallback((reason: DatePickerCloseReason) => surface.onClose?.({ reason }), [surface.onClose]);
  // DTP-1 / DTP-22: a transparent Modal; the scrim fades in, the container fades in while it grows from enter-scale; both
  // fade out when it closes. Reduced motion: a fade without growing (Android: at once). DTP-3: focus moves in as it
  // opens, and again when the Modal's window is shown.
  return (
    <PickerModal
      visible={visible}
      motion={{ openDuration: tokens.modalMotionOpenDuration, openEasing: tokens.modalMotionOpenEasing, closeDuration: tokens.modalMotionCloseDuration, closeEasing: tokens.modalMotionCloseEasing, enterScale: tokens.modalMotionEnterScale }}
      onBack={() => close('back')}
      testID={surface.testID}
      layerTestID="tanrei.date-picker.layer"
    >
      {(motion, focusSignal) => <ModalArea key={session} surface={surface} motion={motion} onRequestClose={close} focusSignal={focusSignal} insets={insets} onFocusWithin={onFocusWithin} />}
    </PickerModal>
  );
}

interface ModalAreaProps {
  surface: DatePickerSurfaceProps;
  motion: PickerModalMotion;
  onRequestClose: (reason: DatePickerCloseReason) => void;
  focusSignal: number;
  insets?: TanreiResolvedInsets;
  onFocusWithin?: (inside: boolean) => void;
  /** Drawn in place (`DatePickerSurface`): bounded by the area it is in once laid out, not by the window. */
  inPlace?: boolean;
}

/** DTP-1: the scrim over the whole area (a press on it is 'outside', DTP-5), the container centred in it, at least the margin from every edge and the keyboard. */
function ModalArea({ surface, motion, onRequestClose, focusSignal, insets, onFocusWithin, inPlace = false }: ModalAreaProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.datePicker;
  return (
    <PickerModalArea scrimColor={theme.paint(tokens.modalScrimColor)} scrimOpacity={motion.scrim} margin={tokens.modalContainerMargin} insets={insets} inPlace={inPlace} onOutside={() => onRequestClose('outside')} testID={surface.testID}>
      {(room) => <PickerBody surface={surface} focusSignal={focusSignal} onRequestClose={onRequestClose} room={room} motion={{ opacity: motion.container, scale: motion.scale }} onFocusWithin={onFocusWithin} />}
    </PickerModalArea>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The docked presentation (DTP-2, DTP-4, DTP-5, DTP-22)

interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

function DockedPicker({ visible, session, surface, anchorRef, insets: own, onFocusWithin }: PresentationProps & { anchorRef: RefObject<DatePickerAnchor | null> | undefined }) {
  const theme = useTanrei();
  const tokens = theme.system.components.datePicker;
  const window = useWindowDimensions();
  const insets = useTanreiInsets(own);
  const reduce = useReduceMotion();
  const [present, setPresent] = useState(visible);
  const [anchor, setAnchor] = useState<MenuBox | null>(null);
  const [area, setArea] = useState<MenuBox | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const layerRef = useRef<{ current: Measurable | null } | null>(null);
  const part = (name: string) => partTestID(surface.testID, name);
  const where = surface.testID ? ` (testID "${surface.testID}")` : '';
  const close = useCallback((reason: DatePickerCloseReason) => surface.onClose?.({ reason }), [surface.onClose]);

  // DTP-2: the anchor (and the layer) is measured when the picker opens, when the surface is laid out and when the window
  // changes; React Native reports no other movement of a view.
  const measure = useCallback(() => {
    const same = (a: MenuBox | null, b: MenuBox) => a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const node = anchorRef?.current;
    if (node?.measureInWindow) node.measureInWindow((x, y, width, height) => setAnchor((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
    else setAnchor((previous) => previous ?? { x: 0, y: 0, width: 0, height: 0 });
    const layer = layerRef.current?.current;
    if (layer?.measureInWindow) layer.measureInWindow((x, y, width, height) => setArea((previous) => (same(previous, { x, y, width, height }) ? previous : { x, y, width, height })));
  }, [anchorRef]);
  useEffect(() => {
    if (!visible) return;
    setPresent(true);
    measure();
  }, [visible, measure, window.width, window.height]);
  const onSurfaceLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize((previous) => (previous && previous.width === width && previous.height === height ? previous : { width, height }));
      measure();
    },
    [measure],
  );
  const box = area ?? { x: 0, y: 0, width: window.width, height: window.height };
  const within: TanreiResolvedInsets = {
    top: Math.max(0, insets.top - box.y),
    left: Math.max(0, insets.left - box.x),
    bottom: Math.max(0, insets.bottom - (window.height - box.y - box.height)),
    right: Math.max(0, insets.right - (window.width - box.x - box.width)),
  };
  const relative = anchor ? { ...anchor, x: anchor.x - box.x, y: anchor.y - box.y } : null;
  // DTP-2: offset below the anchor, start edges aligned (mirrored right to left); flipped above when below has less room
  // than the surface needs and above has more; shifted to stay within the viewport margin; its height limited to the room.
  const position = relative && size ? placeMenu({ anchor: relative, surface: size, viewport: box, placement: 'bottom-start', offset: tokens.dockedOffset, margin: tokens.dockedViewportMargin, rtl: I18nManager.isRTL, insets: within }) : null;
  const placed = position !== null;

  // DTP-3: focus moves in once the surface is placed (its days exist then, in the layer).
  const [focusSignal, setFocusSignal] = useState(0);
  const placedOnce = useRef(false);
  useEffect(() => {
    if (!visible) placedOnce.current = false;
    else if (placed && !placedOnce.current) {
      placedOnce.current = true;
      setFocusSignal((previous) => previous + 1);
    }
  }, [visible, placed]);

  // DTP-5: Android's back asks to close while the picker is open.
  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close('back');
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  // DTP-22: once placed, it fades in and grows from the edge that faces the anchor over the open motion; it fades out
  // over the close motion before it leaves; at once where motion is reduced.
  useEffect(() => {
    if (visible && !placed) return undefined;
    const target = visible ? 1 : 0;
    if (reduce) {
      progress.setValue(target);
      if (!visible) setPresent(false);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: visible ? tokens.dockedMotionOpenDuration : tokens.dockedMotionCloseDuration,
      easing: toEasing(visible ? tokens.dockedMotionOpenEasing : tokens.dockedMotionCloseEasing),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresent(false);
    });
    return () => animation.stop();
  }, [visible, placed, reduce, progress, tokens]);

  // DTP-5: a press outside the picker AND its anchor asks to close ('outside') and does not reach what is under it; the
  // anchor stays reachable (the catchers surround it). No scrim, nothing is made inert, focus is not trapped (DTP-2).
  const catchers: ViewStyle[] = relative
    ? [
        { position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, relative.y) },
        { position: 'absolute', top: relative.y + relative.height, left: 0, right: 0, bottom: 0 },
        { position: 'absolute', top: relative.y, height: relative.height, left: 0, width: Math.max(0, relative.x) },
        { position: 'absolute', top: relative.y, height: relative.height, left: relative.x + relative.width, right: 0 },
      ]
    : [];
  const grow: ViewStyle = position?.side === 'top' ? { transformOrigin: 'bottom' } : { transformOrigin: 'top' };
  const node = present ? (
    <TanreiThemeScope theme={theme}>
      <View style={FILL} pointerEvents="box-none" testID={part('overlay')}>
        {catchers.map((catcher, index) => (
          <Pressable
            key={index}
            style={catcher}
            onPress={() => close('outside')}
            accessible={false}
            focusable={false}
            importantForAccessibility="no"
            accessibilityElementsHidden
            pointerEvents={visible ? 'auto' : 'none'}
            testID={part(`outside.${index}`)}
          />
        ))}
        <Animated.View
          onLayout={onSurfaceLayout}
          pointerEvents={visible ? 'box-none' : 'none'}
          style={[{ position: 'absolute', top: position?.top ?? 0, left: position?.left ?? 0 }, { opacity: placed ? progress : 0, transform: [{ scaleY: progress }], ...grow }]}
          testID={part('placement')}
        >
          <PickerBody key={session} surface={surface} focusSignal={focusSignal} onRequestClose={close} maxHeight={position?.maxHeight} widest={box.width - within.left - within.right} onFocusWithin={onFocusWithin} overlay open={visible} />
        </Animated.View>
      </View>
    </TanreiThemeScope>
  ) : null;
  const portal = useOverlayPortal('menu', node);
  layerRef.current = portal.layer as { current: Measurable | null } | null;
  const unhosted = visible && !portal.hosted;
  useEffect(() => {
    if (__DEV__ && unhosted) console.warn(`Tanrei: a docked DatePicker${where} opened outside a TanreiProvider, which hosts the overlay layer it is drawn in; it is not drawn.`);
  }, [unhosted, where]);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The surface: header, calendar or fields, actions — everything both presentations share

/**
 * DTP-38: what gives way on a narrow window. The modal's margins go first (the surface stays centred, reaching past
 * them); then the container's inline padding, so that the cells keep the minimum target; below seven targets with no
 * margins left, the cells narrow equally so that the grid fits `widest` — their height and their numbers stay.
 */
function narrowGrid(cell: number, padding: number, widest: number): { cellWidth: number; paddingInline: number } {
  const grid = 7 * cell;
  if (!(widest < grid + 2 * padding)) return { cellWidth: cell, paddingInline: padding };
  if (widest >= grid) return { cellWidth: cell, paddingInline: (widest - grid) / 2 };
  return { cellWidth: Math.max(0, widest) / 7, paddingInline: 0 };
}

/** A part that takes focus, by key: `day:<iso>`, `year:<n>`, `view-toggle`, `previous`, `next`, `entry-toggle`, `field.0`, `field.1`, `cancel`, `confirm`. */
type PartKey = string;

type FieldStatus = { kind: 'empty' } | { kind: 'date'; date: CalendarDate } | { kind: 'invalid' } | { kind: 'unavailable' };

interface PickerBodyProps {
  surface: DatePickerSurfaceProps;
  /** Each change after 0 moves focus into the picker (DTP-3). */
  focusSignal: number;
  onRequestClose: (reason: DatePickerCloseReason) => void;
  /** Modal: the window less the margins (null in place before layout). */
  room?: { width: number; height: number } | null;
  /** Modal: the container's enter / exit motion. */
  motion?: { opacity: Moving<number> | Animated.Value; scale: Moving<number> };
  /** Docked: the room left beside the anchor. */
  maxHeight?: number;
  /** Docked: the viewport's width inside the insets, without margins (DTP-38). */
  widest?: number;
  /** Docked in the overlay: focus leaving it asks to close. */
  overlay?: boolean;
  open?: boolean;
  onFocusWithin?: (inside: boolean) => void;
}

function PickerBody({ surface, focusSignal, onRequestClose, room = null, motion, maxHeight, widest: dockedWidest, overlay = false, open = true, onFocusWithin }: PickerBodyProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.datePicker;
  const { cornerSmoothing } = theme.system.shape;
  const rtl = I18nManager.isRTL;
  const reduce = useReduceMotion();
  const testID = surface.testID;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';

  // DTP-37: today is read when the picker opens (this body is new each time it opens).
  const [openedToday] = useState(deviceToday);
  const config = readConfig(surface, openedToday, where);
  const { mode, locale, words, min, max, today } = config;
  const docked = config.presentation === 'docked';
  const reports = config.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // DTP-6: the pending choice starts as the committed one; a modal picker ignores values set while it is open. A docked
  // one commits each completed choice, so it follows what the product sets.
  const committedKey = JSON.stringify(selectionOf(config.committed, mode));
  const [pending, setPending] = useState<Choice>(config.committed);
  const [openedWith] = useState(committedKey);
  useEffect(() => {
    if (docked) setPending(config.committed);
  }, [docked, committedKey]);

  const [entry, setEntry] = useState<DatePickerEntryMode>(docked ? 'calendar' : config.entryMode);
  const [view, setView] = useState<DatePickerStartView>(config.startView);
  const [shown, setShown] = useState<CalendarMonth>(() => openingMonth(config, config.committed));
  const [active, setActive] = useState<CalendarDate>(() => activeDayOf(openingMonth(config, config.committed), config.committed, config));
  const [focusedYear, setFocusedYear] = useState(shown.year);
  const [page, setPage] = useState<{ from: CalendarMonth; direction: 1 | -1; id: number } | null>(null);
  const [viewFade, setViewFade] = useState<{ from: DatePickerStartView; id: number } | null>(null);
  const fieldText = (date: CalendarDate | null) => (date ? numericDateText(locale, date) : '');
  const [texts, setTexts] = useState<[string, string]>(() => (mode === 'single' ? [fieldText(config.committed.value), ''] : [fieldText(config.committed.start), fieldText(config.committed.end)]));
  const [errors, setErrors] = useState<[FieldStatus['kind'] | null, FieldStatus['kind'] | null]>([null, null]);
  // DTP-25: the range fields are equally tall, the taller one's height, with their containers level — a label that
  // wraps grows its field's container and reserves room above an outlined one (TXF-13).
  const containers = useLevelledContainers<'0' | '1'>(mode === 'single' ? SINGLE_FIELD : RANGE_FIELDS, theme.system.components.textField.sizes.medium.containerHeight, true);

  // Focus: the parts' host views by key, and a request that is carried out after the render that made its target exist.
  const nodes = useRef(new Map<PartKey, FocusableNode>());
  const refs = useRef(new Map<PartKey, (node: FocusableNode | null) => void>());
  const refFor = useCallback((key: PartKey) => {
    let ref = refs.current.get(key);
    if (!ref) {
      ref = (node: FocusableNode | null) => {
        if (node) nodes.current.set(key, node);
        else nodes.current.delete(key);
      };
      refs.current.set(key, ref);
    }
    return ref;
  }, []);
  const [focusRequest, setFocusRequest] = useState<{ key: PartKey; id: number } | null>(null);
  const requestFocus = useCallback((key: PartKey) => setFocusRequest((previous) => ({ key, id: (previous?.id ?? 0) + 1 })), []);
  useEffect(() => {
    if (!focusRequest) return;
    const node = nodes.current.get(focusRequest.key);
    if (!node) return;
    node.focus?.();
    try {
      AccessibilityInfo.sendAccessibilityEvent(node as never, 'focus');
    } catch {
      // Not a host view: keyboard focus only.
    }
  }, [focusRequest]);

  // DTP-3: focus moves in when the picker opens — to the active day, the displayed year, or the first field.
  const openingTarget = entry === 'text' ? 'field.0' : view === 'year' ? `year:${shown.year}` : `day:${isoOf(active)}`;
  useEffect(() => {
    if (focusSignal > 0) requestFocus(openingTarget);
  }, [focusSignal]);

  // Which part has focus: the keys act on it (DTP-18, DTP-19), and a docked picker closes when focus leaves (DTP-5).
  const focused = useRef<PartKey | null>(null);
  const requests = useRef(0);
  const focusedAt = useRef(0);
  const tabbing = useRef(false);
  const openNow = useRef(open);
  openNow.current = open;
  const close = useCallback(
    (reason: DatePickerCloseReason) => {
      requests.current += 1;
      onRequestClose(reason);
    },
    [onRequestClose],
  );
  const onPartFocus = useCallback(
    (key: PartKey) => {
      focused.current = key;
      focusedAt.current = requests.current;
      tabbing.current = false;
      onFocusWithin?.(true);
    },
    [onFocusWithin],
  );
  const onPartBlur = useCallback(
    (key: PartKey) => {
      if (focused.current === key) focused.current = null;
      // Focus moving between parts blurs one and focuses the next in the same pass: wait for it. A blur that follows a
      // close request (Tab, a choice) is not another reason.
      const since = focusedAt.current;
      setTimeout(() => {
        if (focused.current !== null) return;
        onFocusWithin?.(false);
        if (overlay && openNow.current && requests.current === since) close(tabbing.current ? 'tab' : 'focus-out');
      }, 0);
    },
    [overlay, close, onFocusWithin],
  );
  const focusHandlers = useCallback((key: PartKey) => ({ onFocus: () => onPartFocus(key), onBlur: () => onPartBlur(key) }), [onPartFocus, onPartBlur]);

  // DTP-20: the new month and year, announced once, politely.
  const announce = useCallback(
    (month: CalendarMonth) => {
      const text = monthYearText(locale, month);
      if (typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
      else AccessibilityInfo.announceForAccessibility(text);
    },
    [locale],
  );

  // DTP-21: a month change slides; a view change cross-fades (at once where motion is reduced).
  const showMonth = useCallback(
    (month: CalendarMonth) => {
      setShown((previous) => {
        const order = compareMonths(month, previous);
        if (order !== 0 && !reduce) setPage((current) => ({ from: previous, direction: order > 0 ? 1 : -1, id: (current?.id ?? 0) + 1 }));
        return month;
      });
    },
    [reduce],
  );
  const switchView = useCallback(
    (next: DatePickerStartView) => {
      setView((previous) => {
        if (previous !== next && !reduce) setViewFade((current) => ({ from: previous, id: (current?.id ?? 0) + 1 }));
        return next;
      });
    },
    [reduce],
  );

  // ---- choosing (DTP-7 … DTP-9)
  const commit = useCallback(
    (choice: Choice, reason: 'confirm' | 'select') => {
      const next = selectionOf(choice, mode);
      if (!sameSelection(next, JSON.parse(reason === 'confirm' ? openedWith : committedKey) as DatePickerSelection)) surface.onChange?.(next);
      close(reason);
    },
    [mode, openedWith, committedKey, surface.onChange, close],
  );
  const chooseDay = useCallback(
    (day: CalendarDate) => {
      setActive(day);
      if (config.unavailable(day)) return;
      if (mode === 'single') {
        const next = { value: day, start: null, end: null };
        setPending(next);
        if (docked) commit(next, 'select');
        return;
      }
      const startsAgain = !pending.start || pending.end !== null || compareDates(day, pending.start) < 0;
      const next = startsAgain ? { value: null, start: day, end: null } : { value: null, start: pending.start, end: day };
      setPending(next);
      if (docked && !startsAgain) commit(next, 'select');
    },
    [config, mode, pending, docked, commit],
  );

  // ---- paging (DTP-14, DTP-20)
  const minMonth = min ? monthOf(min) : null;
  const maxMonth = max ? monthOf(max) : null;
  const atFirst = minMonth !== null && compareMonths(shown, minMonth) <= 0;
  const atLast = maxMonth !== null && compareMonths(shown, maxMonth) >= 0;
  const turnPage = useCallback(
    (months: 1 | -1) => {
      const month = addMonthsTo(shown, months);
      showMonth(month);
      setActive(clampDate(addMonths({ ...shown, day: active.year === shown.year && active.month === shown.month ? active.day : 1 }, months), min, max));
      announce(month);
    },
    [shown, active, min, max, showMonth, announce],
  );

  // ---- the year view (DTP-16, DTP-19)
  const firstYear = min?.year ?? FIRST_LISTED_YEAR;
  const lastYear = max?.year ?? LAST_LISTED_YEAR;
  const chooseYear = useCallback(
    (year: number) => {
      const month = clampMonth({ year, month: shown.month }, min, max);
      showMonth(month);
      switchView('day');
      const day = activeDayOf(month, pending, config);
      setActive(day);
      requestFocus(`day:${isoOf(day)}`);
      announce(month);
    },
    [shown, min, max, showMonth, switchView, pending, config, requestFocus, announce],
  );
  const toggleView = useCallback(() => {
    if (view === 'day') setFocusedYear(shown.year);
    switchView(view === 'day' ? 'year' : 'day');
  }, [view, shown, switchView]);

  // ---- text entry (DTP-25 … DTP-28)
  const fieldCount = mode === 'single' ? 1 : 2;
  const statusOf = useCallback(
    (index: number, text: string, start: CalendarDate | null): FieldStatus => {
      if (!text.trim()) return { kind: 'empty' };
      const date = parseNumericDate(locale, text);
      if (!date) return { kind: 'invalid' };
      if (index === 1 && start && compareDates(date, start) < 0) return { kind: 'invalid' };
      if (config.unavailable(date)) return { kind: 'unavailable' };
      return { kind: 'date', date };
    },
    [locale, config],
  );
  const setFieldDate = (choice: Choice, index: number, date: CalendarDate | null): Choice => (mode === 'single' ? { ...choice, value: date } : index === 0 ? { ...choice, start: date } : { ...choice, end: date });
  const onFieldChange = useCallback(
    (index: number, text: string) => {
      setTexts((previous) => (index === 0 ? [text, previous[1]] : [previous[0], text]));
      setErrors((previous) => (index === 0 ? [null, previous[1]] : [previous[0], null]));
      const status = statusOf(index, text, pending.start);
      if (status.kind === 'empty') setPending((previous) => setFieldDate(previous, index, null));
      else if (status.kind === 'date') setPending((previous) => setFieldDate(previous, index, status.date));
    },
    [statusOf, pending.start, mode],
  );
  const onFieldCommit = useCallback(
    (index: number, text: string) => {
      const status = statusOf(index, text, pending.start);
      if (status.kind !== 'invalid' && status.kind !== 'unavailable') return;
      setErrors((previous) => (index === 0 ? [status.kind, previous[1]] : [previous[0], status.kind]));
      setPending((previous) => setFieldDate(previous, index, null));
    },
    [statusOf, pending.start, mode],
  );
  const statuses = texts.slice(0, fieldCount).map((text, index) => statusOf(index, text, pending.start));
  const complete = mode === 'single' ? pending.value !== null : pending.start !== null && pending.end !== null;
  const fieldsHold = entry !== 'text' || statuses.every((status) => status.kind === 'empty' || status.kind === 'date');
  // DTP-6: OK is disabled while the choice is incomplete or a field holds text that is not an available date.
  const confirmEnabled = complete && fieldsHold;
  const confirm = useCallback(() => {
    if (confirmEnabled) commit(pending, 'confirm');
  }, [confirmEnabled, commit, pending]);
  const onFieldSubmit = useCallback(
    (index: number) => {
      if (index < fieldCount - 1) requestFocus(`field.${index + 1}`);
      else confirm();
    },
    [fieldCount, requestFocus, confirm],
  );
  const toggleEntry = useCallback(() => {
    const next = entry === 'calendar' ? 'text' : 'calendar';
    setEntry(next);
    const month = clampMonth(monthOf(pending.value ?? pending.start ?? today), min, max);
    setShown(month);
    const day = activeDayOf(month, pending, config);
    setActive(day);
    if (next === 'text') {
      setTexts(mode === 'single' ? [fieldText(pending.value), ''] : [fieldText(pending.start), fieldText(pending.end)]);
      setErrors([null, null]);
    }
    setView('day');
    requestFocus(next === 'text' ? 'field.0' : `day:${isoOf(day)}`);
  }, [entry, pending, today, min, max, config, mode, requestFocus]);

  // ---- keys (DTP-5, DTP-18, DTP-19; the modal's focus loop, DTP-1)
  const firstInOrder: PartKey = docked ? 'view-toggle' : 'entry-toggle';
  const lastInOrder: PartKey = docked ? (view === 'year' ? 'year' : 'day') : confirmEnabled ? 'confirm' : 'cancel';
  const onKeyDown = useCallback(
    (event: KeyDownEvent) => {
      const { key } = event.nativeEvent;
      const shift = (event.nativeEvent as { shiftKey?: boolean }).shiftKey === true;
      const at = focused.current;
      if (key === 'Escape') {
        event.preventDefault?.();
        close('escape');
        return;
      }
      if (key === 'Tab') {
        const kind = at?.split(':')[0] ?? null;
        if (docked) {
          // DTP-5: Tab out of a docked picker (past the grid, or back past the view toggle) asks to close; focus leaving it otherwise is 'focus-out'.
          tabbing.current = true;
          if ((!shift && kind === lastInOrder) || (shift && at === firstInOrder)) {
            event.preventDefault?.();
            close('tab');
          }
        } else if (!shift && at === lastInOrder) {
          // DTP-1: focus stays in a modal picker — Tab from the last element moves to the first, Shift+Tab the other way.
          event.preventDefault?.();
          requestFocus(firstInOrder);
        } else if (shift && at === firstInOrder) {
          event.preventDefault?.();
          requestFocus(lastInOrder);
        }
        return;
      }
      if (at?.startsWith('day:')) {
        const from = parseIsoDate(at.slice(4)) ?? active;
        const forward = rtl ? -1 : 1;
        const column = (weekdayOf(from) - config.firstDay + 7) % 7;
        let next: CalendarDate | null = null;
        if (key === 'ArrowRight') next = addDays(from, forward);
        else if (key === 'ArrowLeft') next = addDays(from, -forward);
        else if (key === 'ArrowDown') next = addDays(from, 7);
        else if (key === 'ArrowUp') next = addDays(from, -7);
        else if (key === 'Home') next = addDays(from, -column);
        else if (key === 'End') next = addDays(from, 6 - column);
        else if (key === 'PageDown') next = addMonths(from, shift ? 12 : 1);
        else if (key === 'PageUp') next = addMonths(from, shift ? -12 : -1);
        if (!next) return;
        event.preventDefault?.();
        next = clampDate(next, min, max);
        if (next.year !== shown.year || next.month !== shown.month) showMonth(monthOf(next));
        setActive(next);
        focused.current = `day:${isoOf(next)}`;
        requestFocus(focused.current);
        return;
      }
      if (at?.startsWith('year:')) {
        const from = Number(at.slice(5));
        const forward = rtl ? -1 : 1;
        let next: number | null = null;
        if (key === 'ArrowRight') next = from + forward;
        else if (key === 'ArrowLeft') next = from - forward;
        else if (key === 'ArrowDown') next = from + 3;
        else if (key === 'ArrowUp') next = from - 3;
        else if (key === 'Home') next = firstYear;
        else if (key === 'End') next = lastYear;
        if (next === null) return;
        event.preventDefault?.();
        next = Math.min(lastYear, Math.max(firstYear, next));
        setFocusedYear(next);
        focused.current = `year:${next}`;
        requestFocus(focused.current);
      }
    },
    [docked, lastInOrder, firstInOrder, close, requestFocus, active, rtl, config.firstDay, min, max, shown, showMonth, firstYear, lastYear],
  );

  // ---- drawing
  const cell = Math.max(tokens.cellSize, theme.system.measure.target.touch);
  // DTP-38: the widest the surface may be — the window (its safe area) with no margins; unbounded in place before layout.
  const widest = docked ? (dockedWidest ?? Infinity) : room ? room.width + 2 * tokens.modalContainerMargin : Infinity;
  const { cellWidth, paddingInline } = narrowGrid(cell, tokens.containerPaddingInline, widest);
  const gridWidth = cellWidth * 7;
  const surfaceWidth = gridWidth + 2 * paddingInline;
  const condition = (day: CalendarDate) => dayCondition(day, pending, today);

  const calendar = (
    <Calendar
      tokens={tokens}
      theme={theme}
      config={config}
      pending={pending}
      shown={shown}
      active={active}
      view={view}
      page={page}
      viewFade={viewFade}
      onPageEnd={() => setPage(null)}
      onViewFadeEnd={() => setViewFade(null)}
      focusedYear={focusedYear}
      firstYear={firstYear}
      lastYear={lastYear}
      cell={cell}
      cellWidth={cellWidth}
      gridWidth={gridWidth}
      paddingInline={paddingInline}
      condition={condition}
      atFirst={atFirst}
      atLast={atLast}
      onPage={turnPage}
      onToggleView={toggleView}
      onChooseDay={chooseDay}
      onChooseYear={chooseYear}
      onDayFocus={(day) => {
        setActive(day);
        onPartFocus(`day:${isoOf(day)}`);
      }}
      onYearFocus={(year) => {
        setFocusedYear(year);
        onPartFocus(`year:${year}`);
      }}
      focusHandlers={focusHandlers}
      onPartBlur={onPartBlur}
      refFor={refFor}
      testID={testID}
    />
  );

  const fields = (
    <View style={{ flexDirection: 'row', gap: tokens.inputGap, paddingHorizontal: tokens.inputPaddingInline, paddingVertical: tokens.inputPaddingBlock }} testID={part('fields')}>
      {Array.from({ length: fieldCount }, (_unused, index) => {
        const error = errors[index];
        const fieldLabel = mode === 'single' ? words.dateLabel : index === 0 ? words.startLabel : words.endLabel;
        const key = index === 0 ? '0' : '1';
        const offset = containers.offset(key);
        return (
          <TextFieldContainerFrameContext.Provider key={index} value={containers.link(key)}>
            <TextField
              ref={refFor(`field.${index}`) as never}
              variant="outlined"
              size="medium"
              type="text"
              label={fieldLabel}
              placeholder={numericDatePattern(locale)}
              value={texts[index]}
              error={error !== null}
              errorText={error === 'unavailable' ? words.unavailableText : error === 'invalid' ? words.invalidText : undefined}
              onChangeText={(text) => onFieldChange(index, text)}
              onEndEditing={(text) => onFieldCommit(index, text)}
              onSubmitEditing={() => onFieldSubmit(index)}
              returnKeyType={index < fieldCount - 1 ? 'next' : 'done'}
              {...focusHandlers(`field.${index}`)}
              style={{ flex: 1, ...(offset > 0 ? { marginTop: offset } : null) }}
              testID={part(`field.${index}`)}
            />
          </TextFieldContainerFrameContext.Provider>
        );
      })}
    </View>
  );

  const header = docked ? null : (
    <Header
      tokens={tokens}
      theme={theme}
      config={config}
      pending={pending}
      entry={entry}
      onToggleEntry={toggleEntry}
      focusHandlers={focusHandlers}
      refFor={refFor}
      testID={testID}
    />
  );
  const actions = docked ? null : (
    // DTP-24: Cancel and OK, text Buttons of the medium size, OK last, at the end; the picker never restyles them.
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.actionsGap, paddingEnd: paddingInline, paddingVertical: tokens.actionsPaddingBlock }} testID={part('actions')}>
      <Button ref={refFor('cancel') as never} variant="text" size="medium" onPress={() => close('cancel')} {...focusHandlers('cancel')} testID={part('cancel')}>
        {words.cancelLabel}
      </Button>
      <Button ref={refFor('confirm') as never} variant="text" size="medium" disabled={!confirmEnabled} onPress={confirm} {...focusHandlers('confirm')} testID={part('confirm')}>
        {words.confirmLabel}
      </Button>
    </View>
  );
  const middle = entry === 'text' && !docked ? fields : calendar;

  // DTP-1 / DTP-2: the surface's color, elevation and corners (eased by the smoothing); its width is the grid's and the insets.
  const color = docked ? tokens.dockedContainerColor : tokens.modalContainerColor;
  const shape = docked ? tokens.dockedContainerShape : tokens.modalContainerShape;
  const elevation = theme.elevation(docked ? tokens.dockedContainerElevation : tokens.modalContainerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(color);
  const limit = docked ? maxHeight : room?.height;
  const containerStyle: ViewStyle = {
    width: surfaceWidth,
    ...(limit !== undefined ? { maxHeight: limit } : null),
    borderRadius: shape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(color) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const clip: ViewStyle = { overflow: 'hidden', borderRadius: shape, flexShrink: 1, ...borderCurveOf(cornerSmoothing) };

  // DTP-38: the header and the actions stay; the calendar or the fields scroll between them. When the header and the
  // actions alone leave no room, everything scrolls together.
  const [fixed, setFixed] = useState({ top: 0, bottom: 0 });
  const onTopLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.top === height ? previous : { ...previous, top: height }));
  }, []);
  const onBottomLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.bottom === height ? previous : { ...previous, bottom: height }));
  }, []);
  const scrollsAll = !docked && limit !== undefined && fixed.top + fixed.bottom > 0 && fixed.top + fixed.bottom + cell > limit;
  const divider = docked ? null : <View style={{ height: tokens.dividerWidth, backgroundColor: theme.paint(tokens.dividerColor) }} testID={part('divider')} {...HIDDEN} />;

  const keys = { onKeyDown } as object;
  const body = docked ? (
    <ScrollView bounces={false} style={{ flexGrow: 0 }} testID={part('scroll')}>
      {middle}
    </ScrollView>
  ) : scrollsAll ? (
    <ScrollView bounces={false} style={{ flexGrow: 0 }} testID={part('scroll')}>
      {header}
      {divider}
      {middle}
      {actions}
    </ScrollView>
  ) : (
    <>
      <View onLayout={onTopLayout} testID={part('top')}>
        {header}
        {divider}
      </View>
      <ScrollView bounces={false} style={{ flexGrow: 0, flexShrink: 1 }} testID={part('scroll')}>
        {middle}
      </ScrollView>
      <View onLayout={onBottomLayout} testID={part('bottom')}>
        {actions}
      </View>
    </>
  );
  return (
    <Animated.View
      {...keys}
      // DTP-36: a dialog named by label — a modal dialog while presentation is modal (VoiceOver stays in it).
      role="dialog"
      aria-modal={docked ? undefined : true}
      accessibilityLabel={words.label.trim() ? words.label : undefined}
      onAccessibilityEscape={() => close('back')}
      style={[containerStyle, motion ? { opacity: motion.opacity, transform: [{ scale: motion.scale }] } : null]}
      testID={testID}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      <View style={clip} testID={part('clip')}>
        {body}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The header (DTP-23)

interface HeaderProps {
  tokens: TanreiDatePickerTokens;
  theme: TanreiTheme;
  config: PickerConfig;
  pending: Choice;
  entry: DatePickerEntryMode;
  onToggleEntry: () => void;
  focusHandlers: (key: PartKey) => { onFocus: () => void; onBlur: () => void };
  refFor: (key: PartKey) => (node: FocusableNode | null) => void;
  testID: string | undefined;
}

function Header({ tokens, theme, config, pending, entry, onToggleEntry, focusHandlers, refFor, testID }: HeaderProps) {
  const part = (name: string) => partTestID(testID, name);
  const { locale, words, today, mode } = config;
  const valueColor = theme.paint(tokens.headerValueColor);
  const placeholderColor = theme.paint(tokens.headerPlaceholderColor);
  // The pending choice in the locale's form; a part not chosen yet is its label in the placeholder color.
  const segment = (text: string, chosen: boolean, name: string) => (
    <Text key={name} style={{ color: chosen ? valueColor : placeholderColor }} testID={part(`header.value.${name}`)}>
      {text}
    </Text>
  );
  const segments: ReactNode[] =
    mode === 'single'
      ? [pending.value ? segment(headerDateText(locale, pending.value, today.year), true, 'date') : segment(words.dateLabel, false, 'date')]
      : [
          pending.start ? segment(headerRangeText(locale, pending.start, today.year), true, 'start') : segment(words.startLabel, false, 'start'),
          segment(' – ', pending.start !== null && pending.end !== null, 'dash'),
          pending.end ? segment(headerRangeText(locale, pending.end, today.year), true, 'end') : segment(words.endLabel, false, 'end'),
        ];
  const toText = entry === 'calendar';
  return (
    <View
      style={{ paddingStart: tokens.headerPaddingInlineStart, paddingEnd: tokens.headerPaddingInlineEnd, paddingVertical: tokens.headerPaddingBlock, gap: tokens.headerGap }}
      testID={part('header')}
    >
      <Text style={{ ...theme.text(tokens.headerLabelTypescale), color: theme.paint(tokens.headerLabelColor) }} allowFontScaling testID={part('header.label')}>
        {words.label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* The value wraps rather than being cut, and grows with enlarged text. */}
        <Text style={{ ...theme.text(tokens.headerValueTypescale), color: valueColor, flex: 1 }} allowFontScaling testID={part('header.value')}>
          {segments}
        </Text>
        <IconButton
          ref={refFor('entry-toggle') as never}
          variant="standard"
          size="medium"
          accessibilityLabel={toText ? words.textEntryLabel : words.calendarEntryLabel}
          onPress={onToggleEntry}
          {...focusHandlers('entry-toggle')}
          testID={part('entry-toggle')}
        >
          {toText ? GLYPHS.keyboard : GLYPHS.calendar}
        </IconButton>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The calendar: navigation row, weekday row, the grid of days or the list of years (DTP-10 … DTP-21)

interface CalendarProps {
  tokens: TanreiDatePickerTokens;
  theme: TanreiTheme;
  config: PickerConfig;
  pending: Choice;
  shown: CalendarMonth;
  active: CalendarDate;
  view: DatePickerStartView;
  page: { from: CalendarMonth; direction: 1 | -1; id: number } | null;
  viewFade: { from: DatePickerStartView; id: number } | null;
  onPageEnd: () => void;
  onViewFadeEnd: () => void;
  focusedYear: number;
  firstYear: number;
  lastYear: number;
  /** A cell's height: the minimum target (DTP-11). */
  cell: number;
  /** A cell's width: the cell, narrowed equally where the window is narrower than seven of them (DTP-38). */
  cellWidth: number;
  gridWidth: number;
  /** The container's inline padding, shrunk where the window is too narrow for it (DTP-38). */
  paddingInline: number;
  condition: (day: CalendarDate) => TanreiCoreDatePickerCondition;
  atFirst: boolean;
  atLast: boolean;
  onPage: (months: 1 | -1) => void;
  onToggleView: () => void;
  onChooseDay: (day: CalendarDate) => void;
  onChooseYear: (year: number) => void;
  onDayFocus: (day: CalendarDate) => void;
  onYearFocus: (year: number) => void;
  focusHandlers: (key: PartKey) => { onFocus: () => void; onBlur: () => void };
  onPartBlur: (key: PartKey) => void;
  refFor: (key: PartKey) => (node: FocusableNode | null) => void;
  testID: string | undefined;
}

function Calendar(props: CalendarProps) {
  const { tokens, theme, config, shown, view, page, viewFade, onPageEnd, onViewFadeEnd, cell, gridWidth, paddingInline, atFirst, atLast, onPage, onToggleView, focusHandlers, refFor, testID } = props;
  const part = (name: string) => partTestID(testID, name);
  const { locale, words } = config;
  const rtl = I18nManager.isRTL;
  const reduce = useReduceMotion();
  const yearView = view === 'year';

  // DTP-21: the page slide and the view cross-fade, driven by one progress each; plain values at rest.
  const pageProgress = useMotion(page?.id ?? null, tokens.motionPageDuration, tokens.motionPageEasing, reduce, onPageEnd);
  const fadeProgress = useMotion(viewFade?.id ?? null, tokens.motionPageDuration, tokens.motionPageEasing, reduce, onViewFadeEnd);
  // Physical: a later month comes in from the end (the right, left to right).
  const travel = gridWidth * (rtl ? -1 : 1);
  const incoming = page && pageProgress !== null ? { transform: [{ translateX: pageProgress.interpolate({ inputRange: [0, 1], outputRange: [page.direction * travel, 0] }) }] } : null;
  const outgoing = page && pageProgress !== null ? { transform: [{ translateX: pageProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -page.direction * travel] }) }] } : null;

  const areaHeight = cell * 7;
  const dayView = (month: CalendarMonth, interactive: boolean) => <DayView {...props} month={month} interactive={interactive} />;
  const yearList = (interactive: boolean) => <YearList {...props} interactive={interactive} height={areaHeight} />;
  const current = yearView ? yearList(true) : dayView(shown, true);
  const fading = viewFade && fadeProgress !== null;
  return (
    <View style={{ paddingHorizontal: paddingInline, paddingVertical: tokens.containerPaddingBlock }} testID={part('calendar')}>
      {/* DTP-14: the navigation row, at least a cell tall: the view toggle at the start, previous and next at the end. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: tokens.cellSize }} testID={part('navigation')}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ViewToggle tokens={tokens} theme={theme} text={monthYearText(locale, shown)} description={words.yearViewLabel} expanded={yearView} onPress={onToggleView} focusRef={refFor('view-toggle')} {...focusHandlers('view-toggle')} testID={part('view-toggle')} />
        </View>
        {yearView ? null : (
          <View style={{ flexDirection: 'row', gap: tokens.navigationGap }}>
            {/* chevron_left and chevron_right point toward the start and the end: swapped right to left. */}
            <IconButton ref={refFor('previous') as never} variant="standard" size="medium" accessibilityLabel={words.previousMonthLabel} disabled={atFirst} onPress={() => onPage(-1)} {...focusHandlers('previous')} testID={part('previous')}>
              {rtl ? GLYPHS.next : GLYPHS.previous}
            </IconButton>
            <IconButton ref={refFor('next') as never} variant="standard" size="medium" accessibilityLabel={words.nextMonthLabel} disabled={atLast} onPress={() => onPage(1)} {...focusHandlers('next')} testID={part('next')}>
              {rtl ? GLYPHS.previous : GLYPHS.next}
            </IconButton>
          </View>
        )}
      </View>
      {/* DTP-11 / DTP-16: the weekday row and six rows of days, or the year list in the same space; it grows with enlarged text. */}
      <View style={{ width: gridWidth, minHeight: areaHeight, overflow: 'hidden' }} testID={part('views')}>
        {fading ? (
          <Animated.View style={[FILL, { opacity: fadeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} pointerEvents="none" {...HIDDEN} testID={part('views.leaving')}>
            {viewFade.from === 'year' ? yearList(false) : dayView(page?.from ?? shown, false)}
          </Animated.View>
        ) : null}
        {page && outgoing && !yearView ? (
          <Animated.View style={[FILL, outgoing]} pointerEvents="none" {...HIDDEN} testID={part('page.leaving')}>
            {dayView(page.from, false)}
          </Animated.View>
        ) : null}
        {fading || (!yearView && incoming) ? <Animated.View style={[fading ? { opacity: fadeProgress } : null, !yearView && incoming ? incoming : null]}>{current}</Animated.View> : current}
      </View>
    </View>
  );
}

/** A progress 0 → 1 over the page motion each time `id` changes (null: at rest). */
function useMotion(id: number | null, duration: number, easing: TanreiDatePickerTokens['motionPageEasing'], reduce: boolean, onEnd: () => void): Animated.Value | null {
  const progress = useRef(new Animated.Value(1)).current;
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (id === null) return undefined;
    if (reduce) {
      end.current();
      return undefined;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration, easing: toEasing(easing), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished) end.current();
    });
    return () => animation.stop();
  }, [id]);
  return id === null || reduce ? null : progress;
}

// ---------------------------------------------------------------------------------------------------------------
// The view toggle (DTP-15)

interface ViewToggleProps {
  tokens: TanreiDatePickerTokens;
  theme: TanreiTheme;
  text: string;
  description: string;
  expanded: boolean;
  onPress: () => void;
  focusRef: (node: FocusableNode | null) => void;
  onFocus: () => void;
  onBlur: () => void;
  testID: string | undefined;
}

function ViewToggle({ tokens, theme, text, description, expanded, onPress, focusRef, onFocus, onBlur, testID }: ViewToggleProps) {
  const part = (name: string) => partTestID(testID, name);
  const { cornerSmoothing } = theme.system.shape;
  const unselected = tokens.conditions.unselected;
  const row = useItemRow<'label' | 'outline'>({
    pressable: true,
    disabled: false,
    condition: 'unselected',
    paints: (state) => ({ container: unselected[state].containerColor, label: unselected[state].labelColor, outline: unselected[state].outlineColor }),
    shapes: { ...tokens, containerShape: tokens.viewToggleContainerShape },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: tokens.viewToggleContainerHeight, height: tokens.viewToggleContainerHeight },
    ref: focusRef as unknown as RefObject<PressableHost>,
    onPress,
    onFocus,
    onBlur,
  });
  const { drawn, interaction } = row;
  // The chevron turns half a turn while the year view is shown, over the state motion (at once where motion is reduced).
  const turn = useStateTransition({ turn: expanded ? 1 : 0 }, { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing }).turn;
  const rotate = typeof turn === 'number' ? `${turn * 180}deg` : turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const glyph = iconGlyphStyle(theme.system.icon, tokens.viewToggleIconSize, { selected: false, resolveFont: theme.resolveIconFont });
  const outline = theme.resolve(unselected[row.state].outlineColor);
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      role="button"
      accessibilityLabel={text}
      accessibilityHint={description || undefined}
      accessibilityState={{ expanded }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.viewToggleGap,
        minHeight: tokens.viewToggleContainerHeight,
        paddingStart: tokens.viewToggleContainerPaddingInline,
        paddingEnd: tokens.viewToggleContainerPaddingInline,
        borderRadius: drawn.shape,
        backgroundColor: fillOf(row.container, drawn.container),
        opacity: drawn.opacity,
        ...borderCurveOf(cornerSmoothing),
      }}
      testID={testID}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={row.rippleColor} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {drawsColor(outline, drawn.outline) ? <Ring placement="inside" width={tokens.outlineWidth} color={drawn.outline} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      <Label style={theme.text(tokens.viewToggleLabelTypescale)} color={drawn.label} testID={part('label')}>
        {text}
      </Label>
      <Animated.View style={{ transform: [{ rotate }] }} testID={part('chevron')}>
        <IconBox
          icon={
            <Animated.Text style={[glyph.style, { color: drawn.label, textAlign: 'center' }]} allowFontScaling={false} testID={part('chevron.glyph')}>
              {GLYPHS.expand}
            </Animated.Text>
          }
          color={row.colors.label}
          size={tokens.viewToggleIconSize}
          decorative
        />
      </Animated.View>
      <FocusRing visible={interaction.focused} radius={tokens.viewToggleContainerShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------------------------------------------
// The day view (DTP-11 … DTP-13, DTP-17, DTP-30 … DTP-36)

function DayView({ tokens, theme, config, pending, active, cell, cellWidth, gridWidth, condition, onChooseDay, onDayFocus, onPartBlur, refFor, testID, month, interactive }: CalendarProps & { month: CalendarMonth; interactive: boolean }) {
  const part = (name: string) => partTestID(testID, name);
  const { locale, words, today, firstDay } = config;
  const columns = weekdayColumns(firstDay);
  const narrow = narrowWeekdays(locale);
  const long = longWeekdays(locale);
  const days = monthGrid(month, firstDay);
  const rows = Array.from({ length: 6 }, (_unused, row) => days.slice(row * 7, row * 7 + 7));
  const weekday = { ...theme.text(tokens.weekdayTypescale), color: theme.paint(tokens.weekdayColor), textAlign: 'center' as const };
  const bandPaint = tokens.conditions.inRange.enabled.containerColor;
  const ranged = pending.start !== null && pending.end !== null && compareDates(pending.start, pending.end) !== 0;
  return (
    // DTP-36: a grid named by the month and year it shows; its first row the column headers.
    <View role="grid" accessibilityLabel={monthYearText(locale, month)} style={{ width: gridWidth }} testID={part(interactive ? 'grid' : 'grid.leaving')}>
      <View role="row" style={{ flexDirection: 'row' }} testID={part('weekdays')}>
        {columns.map((column) => (
          // DTP-13: the narrow name, named by the full one; no focus.
          <View key={column} role="columnheader" accessible accessibilityLabel={long[column]} style={{ width: cellWidth, minHeight: cell, alignItems: 'center', justifyContent: 'center' }} testID={part(`weekday.${column}`)}>
            <Text style={weekday} allowFontScaling>
              {narrow[column]}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} role="row" style={{ flexDirection: 'row' }} testID={interactive ? part(`row.${index}`) : undefined}>
          {row.map((day, column) => {
            if (!day) return <View key={column} style={{ width: cellWidth, minHeight: cell }} {...HIDDEN} />;
            const iso = isoOf(day);
            const dayCond = condition(day);
            const isStart = sameDate(day, pending.start);
            const isEnd = sameDate(day, pending.end);
            const inSpan = pending.start !== null && pending.end !== null && compareDates(day, pending.start) >= 0 && compareDates(day, pending.end) <= 0;
            return (
              <DatePickerDay
                key={iso}
                date={iso}
                disabled={config.unavailable(day)}
                day={day}
                condition={dayCond}
                band={ranged && isStart ? 'end' : ranged && isEnd ? 'start' : null}
                bandPaint={bandPaint}
                selected={sameDate(day, pending.value) || inSpan || isStart}
                tabStop={interactive && sameDate(day, active)}
                interactive={interactive}
                name={`${fullDateText(locale, day)}${sameDate(day, today) ? `, ${words.todayLabel}` : ''}`}
                description={isStart ? words.startLabel : isEnd ? words.endLabel : undefined}
                number={numberText(locale, day.day)}
                cell={cell}
                cellWidth={cellWidth}
                tokens={tokens}
                theme={theme}
                onChoose={onChooseDay}
                onFocused={onDayFocus}
                onBlurred={() => onPartBlur(`day:${iso}`)}
                focusRef={interactive ? refFor(`day:${iso}`) : undefined}
                testID={interactive ? part(`day.${iso}`) : undefined}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface DatePickerDayProps {
  /** The day's ISO date (the item kind's `date`). */
  date: string;
  /** Unavailable (the item kind's `disabled`): drawn from the disabled tokens, reachable, never chosen. */
  disabled: boolean;
  day: CalendarDate;
  condition: TanreiCoreDatePickerCondition;
  /** A range's start or end draws the half of its cell toward the other in the band's color. */
  band: 'start' | 'end' | null;
  bandPaint: TanreiPaint;
  selected: boolean;
  tabStop: boolean;
  interactive: boolean;
  name: string;
  description: string | undefined;
  number: string;
  cell: number;
  cellWidth: number;
  tokens: TanreiDatePickerTokens;
  theme: TanreiTheme;
  onChoose: (day: CalendarDate) => void;
  onFocused: (day: CalendarDate) => void;
  onBlurred: () => void;
  focusRef: ((node: FocusableNode | null) => void) | undefined;
  testID: string | undefined;
}

/** One day (the spec's item kind `day`): its cell is the hit area, its container the state answer. */
function DatePickerDay({ date, disabled, day, condition, band, bandPaint, selected, tabStop, interactive, name, description, number, cell, cellWidth, tokens, theme, onChoose, onFocused, onBlurred, focusRef, testID }: DatePickerDayProps) {
  const part = (name_: string) => partTestID(testID, name_);
  const { cornerSmoothing } = theme.system.shape;
  const tones = lookupValue(tokens.conditions, condition, 'unselected', 'DatePicker condition');
  const inRange = condition === 'inRange';
  const area = useRef<RippleAreaNode | null>(null);
  const handlePress = useCallback(() => onChoose(day), [onChoose, day]);
  const handleFocus = useCallback(() => onFocused(day), [onFocused, day]);
  // DTP-31 … DTP-34: the state that wins, its tokens, the press hold, the ripple (grown in the container), the motion.
  const row = useItemRow<'label' | 'outline'>({
    pressable: interactive,
    disabled,
    condition,
    paints: (state) => ({ container: tones[state].containerColor, label: tones[state].labelColor, outline: tones[state].outlineColor }),
    shapes: { ...tokens, containerShape: tokens.dayContainerShape },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width: cellWidth, height: cell },
    ref: focusRef as unknown as RefObject<PressableHost>,
    rippleArea: { ref: area, size: inRange ? { width: cellWidth, height: tokens.dayContainerSize } : { width: tokens.dayContainerSize, height: tokens.dayContainerSize } },
    onPress: handlePress,
    onFocus: handleFocus,
    onBlur: onBlurred,
  });
  const { drawn, interaction } = row;
  const shape = inRange ? 0 : drawn.shape;
  const outline = theme.resolve(tones[row.state].outlineColor);
  const fill = fillOf(row.container, drawn.container);
  const bandFill = theme.resolve(bandPaint);
  const ripple = interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={row.rippleColor} radius={shape} cornerSmoothing={inRange ? 0 : cornerSmoothing} testID={part('ripple')} /> : null;
  // DTP-12: the square container centred in the cell; an in-range day's container spans the cell (the band, square ends).
  const square: ViewStyle = {
    minWidth: tokens.dayContainerSize,
    minHeight: tokens.dayContainerSize,
    alignItems: 'center',
    justifyContent: 'center',
    ...(inRange ? null : borderCurveOf(cornerSmoothing)),
  };
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      // DTP-11: the cell is the hit area, never smaller than the target; it extends none over its neighbours.
      hitSlop={NO_SLOP}
      disabled={disabled || !interactive}
      // DTP-17: the grid is one tab stop, the active day.
      focusable={tabStop}
      role="button"
      accessibilityLabel={name}
      accessibilityHint={description}
      accessibilityState={{ selected, disabled }}
      style={{ width: cellWidth, minHeight: cell, alignItems: 'center', justifyContent: 'center', opacity: drawn.opacity }}
      testID={testID}
    >
      <Animated.View ref={inRange ? (area as never) : undefined} style={[{ alignSelf: 'stretch', alignItems: 'center' }, inRange ? { backgroundColor: fill } : null]} testID={part('track')}>
        {band && bandFill.a > 0 ? (
          <View style={{ position: 'absolute', top: 0, bottom: 0, ...(band === 'end' ? { start: '50%', end: 0 } : { start: 0, end: '50%' }), backgroundColor: theme.paint(bandPaint) }} testID={part('band')} {...HIDDEN} />
        ) : null}
        {inRange ? ripple : null}
        <Animated.View ref={inRange ? undefined : (area as never)} style={[square, inRange ? null : { borderRadius: shape, backgroundColor: fill }]} testID={part('container')}>
          {inRange ? null : ripple}
          {drawsColor(outline, drawn.outline) ? <Ring placement="inside" width={tokens.outlineWidth} color={drawn.outline} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
          <Label style={theme.text(tokens.dayLabelTypescale)} color={drawn.label} testID={part('label')}>
            {number}
          </Label>
          {/* DTP-32: around the day's square — an in-range day's too — without animation. */}
          <FocusRing visible={interaction.focused} radius={tokens.dayContainerShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The year view (DTP-16, DTP-19)

function YearList({ tokens, theme, config, shown, focusedYear, firstYear, lastYear, cell, gridWidth, onChooseYear, onYearFocus, onPartBlur, refFor, testID, interactive, height }: CalendarProps & { interactive: boolean; height: number }) {
  const part = (name: string) => partTestID(testID, name);
  const { locale, today, words } = config;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_unused, index) => firstYear + index);
  const rows = Array.from({ length: Math.ceil(years.length / 3) }, (_unused, row) => years.slice(row * 3, row * 3 + 3));
  // The displayed year's row is the third row in view, or as near to it as the list's ends allow.
  const shownRow = Math.floor((shown.year - firstYear) / 3);
  const offset = Math.max(0, Math.min((shownRow - 2) * cell, rows.length * cell - height));
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const width = gridWidth / 3;
  const tabStop = Math.min(lastYear, Math.max(firstYear, focusedYear));
  const tabStopRow = Math.floor((tabStop - firstYear) / 3);
  // Only the rows near the view are drawn (a list of two hundred years is two hundred controls); the others keep their
  // place as empty rows. The tab stop's row is always drawn, so the keys can move focus to it (DTP-19).
  const [scrolled, setScrolled] = useState(offset);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => setScrolled(event.nativeEvent.contentOffset.y), []);
  const drawnFrom = Math.floor((scrolled - height) / cell);
  const drawnTo = Math.ceil((scrolled + 2 * height) / cell);
  // DTP-19: the focused year is scrolled into view.
  const tabStopTop = tabStopRow * cell;
  useEffect(() => {
    if (!interactive) return;
    if (tabStopTop < scrolled) scroll.current?.scrollTo?.({ x: 0, y: tabStopTop, animated: false });
    else if (tabStopTop + cell > scrolled + height) scroll.current?.scrollTo?.({ x: 0, y: tabStopTop + cell - height, animated: false });
  }, [tabStopTop]);
  return (
    <ScrollView
      ref={scroll}
      style={{ width: gridWidth, height }}
      contentOffset={{ x: 0, y: offset }}
      onLayout={() => scroll.current?.scrollTo?.({ x: 0, y: offset, animated: false })}
      onScroll={onScroll}
      scrollEventThrottle={16}
      bounces={false}
      testID={part(interactive ? 'years' : 'years.leaving')}
    >
      {rows.map((row, index) => (index < drawnFrom || index > drawnTo) && index !== tabStopRow ? (
        <View key={index} style={{ height: cell }} {...HIDDEN} />
      ) : (
        <View key={index} style={{ flexDirection: 'row' }}>
          {row.map((year) => {
            const condition: TanreiCoreDatePickerCondition = year === shown.year ? 'selected' : year === today.year ? 'today' : 'unselected';
            return (
              <DatePickerYear
                key={year}
                year={year}
                condition={condition}
                text={numberText(locale, year)}
                name={`${numberText(locale, year)}${year === today.year ? `, ${words.todayLabel}` : ''}`}
                tabStop={interactive && year === tabStop}
                interactive={interactive}
                width={width}
                height={cell}
                tokens={tokens}
                theme={theme}
                onChoose={onChooseYear}
                onFocused={onYearFocus}
                onBlurred={() => onPartBlur(`year:${year}`)}
                focusRef={interactive ? refFor(`year:${year}`) : undefined}
                testID={interactive ? part(`year.${year}`) : undefined}
              />
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

interface DatePickerYearProps {
  /** The year (the item kind's `year`). */
  year: number;
  condition: TanreiCoreDatePickerCondition;
  text: string;
  name: string;
  tabStop: boolean;
  interactive: boolean;
  width: number;
  height: number;
  tokens: TanreiDatePickerTokens;
  theme: TanreiTheme;
  onChoose: (year: number) => void;
  onFocused: (year: number) => void;
  onBlurred: () => void;
  focusRef: ((node: FocusableNode | null) => void) | undefined;
  testID: string | undefined;
}

/** One year of the year view (the spec's item kind `year`): selected for the displayed year, today for the current one. */
function DatePickerYear({ year, condition, text, name, tabStop, interactive, width, height, tokens, theme, onChoose, onFocused, onBlurred, focusRef, testID }: DatePickerYearProps) {
  const part = (name_: string) => partTestID(testID, name_);
  const { cornerSmoothing } = theme.system.shape;
  const tones = lookupValue(tokens.conditions, condition, 'unselected', 'DatePicker condition');
  const area = useRef<RippleAreaNode | null>(null);
  const handlePress = useCallback(() => onChoose(year), [onChoose, year]);
  const handleFocus = useCallback(() => onFocused(year), [onFocused, year]);
  const row = useItemRow<'label' | 'outline'>({
    pressable: interactive,
    disabled: false,
    condition,
    paints: (state) => ({ container: tones[state].containerColor, label: tones[state].labelColor, outline: tones[state].outlineColor }),
    shapes: { ...tokens, containerShape: tokens.yearContainerShape },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width, height },
    ref: focusRef as unknown as RefObject<PressableHost>,
    rippleArea: { ref: area, size: { width: tokens.yearContainerWidth, height: tokens.yearContainerHeight } },
    onPress: handlePress,
    onFocus: handleFocus,
    onBlur: onBlurred,
  });
  const { drawn, interaction } = row;
  const outline = theme.resolve(tones[row.state].outlineColor);
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      hitSlop={NO_SLOP}
      disabled={!interactive}
      focusable={tabStop}
      role="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: condition === 'selected' }}
      style={{ width, minHeight: height, alignItems: 'center', justifyContent: 'center', opacity: drawn.opacity }}
      testID={testID}
    >
      <Animated.View
        ref={area as never}
        style={{ minWidth: tokens.yearContainerWidth, minHeight: tokens.yearContainerHeight, borderRadius: drawn.shape, backgroundColor: fillOf(row.container, drawn.container), alignItems: 'center', justifyContent: 'center', ...borderCurveOf(cornerSmoothing) }}
        testID={part('container')}
      >
        {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={row.rippleColor} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
        {drawsColor(outline, drawn.outline) ? <Ring placement="inside" width={tokens.outlineWidth} color={drawn.outline} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
        <Label style={theme.text(tokens.yearLabelTypescale)} color={drawn.label} testID={part('label')}>
          {text}
        </Label>
        <FocusRing visible={interaction.focused} radius={tokens.yearContainerShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
      </Animated.View>
    </AnimatedPressable>
  );
}
