import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type Insets,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import type { TanreiCoreTimePickerCondition, TanreiTimePickerConditionStateTokens, TanreiTimePickerTokens } from '../generated/vocabulary';
import {
  clockText,
  deviceTime,
  hourOf12,
  hourText,
  localeHourCycle,
  minuteText,
  parseClockTime,
  periodNames,
  periodOf,
  periodPlace,
  shownHour12,
  timeSeparator,
  wholeNumber,
  type ClockTime,
  type HourCycle,
} from '../primitives/clock';
import { Label, RESTING_OPACITY, drawsColor, fillOf, partTestID } from '../primitives/content';
import { FocusRing } from '../primitives/FocusRing';
import type { InteractionState } from '../primitives/interaction';
import { useItemRow } from '../primitives/itemRow';
import { formatInteger, resolveLocale } from '../primitives/locale';
import { PICKER_AT_REST, PickerModal, PickerModalArea, type PickerModalMotion } from '../primitives/pickerModal';
import type { PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import type { FocusableNode, KeyDownEvent } from '../primitives/rovingFocus';
import { supportsBoxShadow } from '../theme/elevation';
import { closedValue, lookupValue } from '../theme/lookup';
import { toEasing, useReduceMotion } from '../theme/motion';
import { borderCurveOf } from '../theme/shape';
import { useTanrei, useTanreiInsets, type TanreiInsets, type TanreiResolvedInsets, type TanreiTheme } from '../theme/TanreiProvider';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { TextField, TextFieldContainerFrameContext, useLevelledContainers } from './TextField';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

// ---------------------------------------------------------------------------------------------------------------
// Public types

/** h12: 1–12 with a period; h23: 00–23; locale: the locale's preferred clock. `value` is 24-hour in every cycle. */
export type TimePickerHourCycle = 'locale' | 'h12' | 'h23';
/** How the picker opens: on the clock dial, or with text fields. */
export type TimePickerEntryMode = 'dial' | 'text';
/** The unit the dial shows (and the selector that takes focus) when the picker opens. */
export type TimePickerUnit = 'hour' | 'minute';
/** vertical: the time above the dial; horizontal: the time and the actions beside it; auto: horizontal only when vertical does not fit and horizontal does. */
export type TimePickerLayout = 'auto' | 'vertical' | 'horizontal';
/** Why the picker asks to be closed (the spec's `close`, TMP-4): Escape, Android's back (or the iOS escape gesture), a press on the scrim, Cancel, OK. */
export type TimePickerCloseReason = 'escape' | 'back' | 'outside' | 'cancel' | 'confirm';

/** What `onClose` carries. */
export interface TimePickerCloseEvent {
  reason: TimePickerCloseReason;
}

export interface TimePickerSurfaceProps {
  /** The chosen time, 24-hour "HH:MM" ("19:30"); `''` for none (the picker then starts from the device's time). */
  value?: string;
  /** `locale` (the default), `h12` or `h23`. Unknown values render as `locale` (TMP-29). */
  hourCycle?: TimePickerHourCycle;
  /** `dial` (the default) or `text`. */
  entryMode?: TimePickerEntryMode;
  /** `hour` (the default) or `minute`. */
  unit?: TimePickerUnit;
  /** `auto` (the default), `vertical` or `horizontal`. */
  layout?: TimePickerLayout;
  /** A BCP 47 tag for the period names, the digits, the separator and the preferred clock; `''`: the platform's locale. */
  locale?: string;
  /** Names the picker (its surface's accessible name) and heads it. */
  label?: string;
  /** The hour selector's name and the hour field's label. */
  hourLabel?: string;
  /** The minute selector's name and the minute field's label. */
  minuteLabel?: string;
  /** OK's label. */
  confirmLabel?: string;
  /** Cancel's label. */
  cancelLabel?: string;
  /** The entry-mode toggle's name while the dial is shown. */
  textEntryLabel?: string;
  /** The entry-mode toggle's name while text entry is shown. */
  dialEntryLabel?: string;
  /** A field's error when its text is not a number of its unit. */
  invalidText?: string;
  /** The spec's `change`: the time committed with OK, "HH:MM", when it differs from `value` as it is at OK (or `value` is empty). Before `onClose`. */
  onChange?: (value: string) => void;
  /** The spec's `close`: the picker asks to be closed, with the reason. Set `visible` to false. */
  onClose?: (event: TimePickerCloseEvent) => void;
  /** The surface's test id; its parts are `<testID>.<part>`. */
  testID?: string;
}

export interface TimePickerProps extends TimePickerSurfaceProps {
  /** The spec's `open`. **Controlled**: set it to false from `onClose` (TMP-4). */
  visible?: boolean;
  /** The window's system insets for this picker; each side named replaces `TanreiProvider`'s `insets`. */
  insets?: TanreiInsets;
}

// ---------------------------------------------------------------------------------------------------------------
// The closed values (TMP-29) and the English words (TMP-27)

const HOUR_CYCLES: readonly TimePickerHourCycle[] = ['locale', 'h12', 'h23'];
const ENTRY_MODES: readonly TimePickerEntryMode[] = ['dial', 'text'];
const UNITS: readonly TimePickerUnit[] = ['hour', 'minute'];
const LAYOUTS: readonly TimePickerLayout[] = ['auto', 'vertical', 'horizontal'];

const WORDS = {
  label: 'Select time',
  hourLabel: 'Hour',
  minuteLabel: 'Minute',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  textEntryLabel: 'Switch to text entry',
  dialEntryLabel: 'Switch to clock',
  invalidText: 'Enter a valid time',
} as const;
type Words = { -readonly [Key in keyof typeof WORDS]: string };

/** The entry-mode toggle's glyphs (the spec names them). */
const GLYPHS = { keyboard: 'keyboard', clock: 'schedule' } as const;

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;
/** The text-entry fields, whose containers are levelled (TMP-10). */
const FIELD_KEYS = ['hour', 'minute'] as const;
const NO_SLOP: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

interface TimeConfig {
  cycle: HourCycle;
  entryMode: TimePickerEntryMode;
  unit: TimePickerUnit;
  layout: TimePickerLayout;
  locale: string;
  /** The committed time the props name; null while `value` is empty. */
  committed: ClockTime | null;
  words: Words;
  reports: string[];
}

function readConfig(props: TimePickerSurfaceProps, where: string): TimeConfig {
  const reports: string[] = [];
  const hourCycle = closedValue(HOUR_CYCLES, props.hourCycle ?? 'locale', 'locale', 'TimePicker hourCycle');
  const entryMode = closedValue(ENTRY_MODES, props.entryMode ?? 'dial', 'dial', 'TimePicker entryMode');
  const unit = closedValue(UNITS, props.unit ?? 'hour', 'hour', 'TimePicker unit');
  const layout = closedValue(LAYOUTS, props.layout ?? 'auto', 'auto', 'TimePicker layout');
  const locale = resolveLocale(props.locale, 'TimePicker locale');
  // TMP-6: the locale's clock, a 0–11 locale taken as h12 and a 1–24 one as h23.
  const cycle: HourCycle = hourCycle === 'locale' ? localeHourCycle(locale) : hourCycle;
  const committed = parseClockTime(props.value);
  if (props.value && !committed) reports.push(`Tanrei: a TimePicker${where} has value "${props.value}", which is not a 24-hour "HH:MM" time; it is treated as empty.`);
  const words = Object.fromEntries(Object.entries(WORDS).map(([name, fallback]) => [name, (props as Record<string, unknown>)[name] ?? fallback])) as Words;
  if (!words.label.trim()) reports.push(`Tanrei: a TimePicker${where} has an empty label, so its surface has no accessible name.`);
  return { cycle, entryMode, unit, layout, locale, committed, words, reports };
}

/** TMP-16: one later or earlier, wrapping, without changing the other unit or the period. */
function stepHour(time: ClockTime, delta: number, cycle: HourCycle): ClockTime {
  if (cycle === 'h23') return { ...time, hour: (((time.hour + delta) % 24) + 24) % 24 };
  const shown = ((((shownHour12(time.hour) - 1 + delta) % 12) + 12) % 12) + 1;
  return { ...time, hour: hourOf12(shown, periodOf(time.hour)) };
}
const stepMinute = (time: ClockTime, delta: number): ClockTime => ({ ...time, minute: (((time.minute + delta) % 60) + 60) % 60 });


// ---------------------------------------------------------------------------------------------------------------
// TimePicker

/**
 * Tanrei TimePicker — spec: `specs/time-picker.spec.json`.
 * A time of day ("HH:MM", 24-hour) in a modal dialog: a transparent `Modal` over a scrim. Anatomy: container > label >
 * time display (the hour selector, the separator and the minute selector, left to right; the period selector where the
 * locale writes the period) > dial (numbers, the track, the handle; hidden from assistive technology) > actions row
 * (the entry-mode toggle at the start, Cancel and OK at the end). Text entry replaces the display and the dial with two
 * text fields. The pending time is committed by OK.
 */
export function TimePicker({ visible = false, insets: own, ...surface }: TimePickerProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.timePicker;
  const insets = useTanreiInsets(own);
  // A new session each time the picker opens: its pending time, unit and entry start again (TMP-5).
  const [session, setSession] = useState(visible ? 1 : 0);
  const opened = useRef(visible);
  useEffect(() => {
    if (visible && !opened.current) setSession((previous) => previous + 1);
    opened.current = visible;
  }, [visible]);
  const close = useCallback((reason: TimePickerCloseReason) => surface.onClose?.({ reason }), [surface.onClose]);
  // TMP-1 / TMP-25: a transparent Modal; the scrim fades in, the container fades in while it grows from enter-scale;
  // both fade out when it closes. Reduced motion: a fade without growing (Android: at once). TMP-2: focus moves in as it
  // opens, and again when the Modal's window is shown.
  return (
    <PickerModal
      visible={visible}
      motion={{ openDuration: tokens.motionOpenDuration, openEasing: tokens.motionOpenEasing, closeDuration: tokens.motionCloseDuration, closeEasing: tokens.motionCloseEasing, enterScale: tokens.motionEnterScale }}
      onBack={() => close('back')}
      testID={surface.testID}
      layerTestID="tanrei.time-picker.layer"
    >
      {(motion, focusSignal) => <TimeArea key={session} surface={surface} motion={motion} onRequestClose={close} focusSignal={focusSignal} insets={insets} />}
    </PickerModal>
  );
}

/**
 * The picker as it is drawn while open — its scrim over the view it is in and its container centred — in place,
 * without a `Modal`, motion or a focus move: the spec's snapshot harness (TMP-1's verify), the gallery and a
 * documentation page. It is fully operable.
 */
export function TimePickerSurface(props: TimePickerSurfaceProps) {
  const close = useCallback((reason: TimePickerCloseReason) => props.onClose?.({ reason }), [props.onClose]);
  return <TimeArea surface={props} motion={PICKER_AT_REST} onRequestClose={close} focusSignal={0} inPlace />;
}

interface TimeAreaProps {
  surface: TimePickerSurfaceProps;
  motion: PickerModalMotion;
  onRequestClose: (reason: TimePickerCloseReason) => void;
  focusSignal: number;
  insets?: TanreiResolvedInsets;
  inPlace?: boolean;
}

/** TMP-1: the scrim over the whole area (a press on it is 'outside', TMP-4), the container centred in it, at least the margin from every edge and the keyboard. */
function TimeArea({ surface, motion, onRequestClose, focusSignal, insets, inPlace = false }: TimeAreaProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.timePicker;
  return (
    <PickerModalArea scrimColor={theme.paint(tokens.scrimColor)} scrimOpacity={motion.scrim} margin={tokens.containerMargin} insets={insets} inPlace={inPlace} onOutside={() => onRequestClose('outside')} testID={surface.testID}>
      {(room) => <TimeBody surface={surface} focusSignal={focusSignal} onRequestClose={onRequestClose} room={room} motion={motion} />}
    </PickerModalArea>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The surface

/** A part that takes focus, by key: `hour`, `minute`, `period.0`, `period.1`, `field.hour`, `field.minute`, `entry-toggle`, `cancel`, `confirm`. */
type PartKey = string;

interface TimeBodyProps {
  surface: TimePickerSurfaceProps;
  focusSignal: number;
  onRequestClose: (reason: TimePickerCloseReason) => void;
  room: { width: number; height: number } | null;
  motion: PickerModalMotion;
}

function TimeBody({ surface, focusSignal, onRequestClose, room, motion }: TimeBodyProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.timePicker;
  const { cornerSmoothing } = theme.system.shape;
  const testID = surface.testID;
  const part = (name: string) => partTestID(testID, name);
  const where = testID ? ` (testID "${testID}")` : '';
  const config = readConfig(surface, where);
  const { cycle, locale, words } = config;
  const reports = config.reports.join('\n');
  useEffect(() => {
    if (__DEV__ && reports) for (const message of reports.split('\n')) console.warn(message);
  }, [reports]);

  // TMP-5: the pending time starts as value or, while it is empty, the device's current time; a value set while the
  // picker is open does not change it.
  const [pending, setPending] = useState<ClockTime>(() => config.committed ?? deviceTime());
  // TMP-5: OK compares with value as it is when OK is activated (one the product set while open included).
  const committedText = config.committed ? clockText(config.committed) : '';
  const [unit, setUnit] = useState<TimePickerUnit>(config.unit);
  const [entry, setEntry] = useState<TimePickerEntryMode>(config.entryMode);
  const [dragging, setDragging] = useState(false);
  const twelve = cycle === 'h12';
  const periods = periodNames(locale);
  const place = periodPlace(locale);
  const separator = timeSeparator(locale);
  const hourShown = hourText(locale, cycle, pending.hour);
  const minuteShown = minuteText(locale, pending.minute);
  const period = periodOf(pending.hour);

  // TMP-23: the fields hold their own text; a whole number of the unit sets the pending value, a commit of anything
  // else puts the field in error until its next edit.
  const [texts, setTexts] = useState<{ hour: string; minute: string }>(() => ({ hour: hourShown, minute: minuteShown }));
  const [errors, setErrors] = useState<{ hour: boolean; minute: boolean }>({ hour: false, minute: false });
  // TMP-10 / TMP-23: where each field's container is drawn. A field grows with enlarged text and with a label that
  // wraps, and an outlined one reserves room above its container for a floated label's lines above the last (TXF-13);
  // the separator and the period follow the containers.
  const containers = useLevelledContainers(FIELD_KEYS, theme.system.components.textField.sizes.large.containerHeight, false);
  const readField = useCallback(
    (which: 'hour' | 'minute', text: string): number | null => {
      const number = wholeNumber(locale, text);
      if (number === null) return null;
      if (which === 'minute') return number <= 59 ? number : null;
      if (twelve) return number >= 1 && number <= 12 ? number : null;
      return number <= 23 ? number : null;
    },
    [locale, twelve],
  );
  const fieldsHold = entry !== 'text' || (readField('hour', texts.hour) !== null && readField('minute', texts.minute) !== null);
  // TMP-5: OK is disabled while a field holds text that is not a number of its unit.
  const confirmEnabled = fieldsHold;

  // Focus: the parts' host views by key, and a request carried out after the render that made its target exist.
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
  // TMP-2: focus moves in when the picker opens — to the selector of unit, or the hour field.
  useEffect(() => {
    if (focusSignal > 0) requestFocus(entry === 'text' ? 'field.hour' : unit);
  }, [focusSignal]);
  const focused = useRef<PartKey | null>(null);
  const onPartFocus = useCallback((key: PartKey) => {
    focused.current = key;
  }, []);
  const onPartBlur = useCallback((key: PartKey) => {
    if (focused.current === key) focused.current = null;
  }, []);
  const focusHandlers = useCallback((key: PartKey) => ({ onFocus: () => onPartFocus(key), onBlur: () => onPartBlur(key) }), [onPartFocus, onPartBlur]);

  // ---- setting the time
  const setTime = useCallback(
    (next: ClockTime) => {
      setPending(next);
      setTexts({ hour: hourText(locale, cycle, next.hour), minute: minuteText(locale, next.minute) });
    },
    [locale, cycle],
  );
  // TMP-16: a selector is focused or pressed — its unit is shown on the dial.
  const showUnit = useCallback((next: TimePickerUnit) => setUnit(next), []);
  // TMP-11: a period keeps the hour's number (7 before noon becomes 7 after noon).
  const choosePeriod = useCallback(
    (next: 0 | 1) => {
      if (next === period) return;
      setTime({ ...pending, hour: hourOf12(shownHour12(pending.hour), next) });
    },
    [period, pending, setTime],
  );
  const adjust = useCallback(
    (which: TimePickerUnit, delta: number) => setTime(which === 'hour' ? stepHour(pending, delta, cycle) : stepMinute(pending, delta)),
    [pending, cycle, setTime],
  );

  // ---- committing (TMP-4, TMP-5)
  const close = onRequestClose;
  const confirm = useCallback(() => {
    if (!confirmEnabled) return;
    const next = clockText(pending);
    if (next !== committedText) surface.onChange?.(next);
    close('confirm');
  }, [confirmEnabled, pending, committedText, surface.onChange, close]);

  // ---- the fields (TMP-23)
  const onFieldChange = useCallback(
    (which: 'hour' | 'minute', text: string) => {
      setTexts((previous) => ({ ...previous, [which]: text }));
      setErrors((previous) => ({ ...previous, [which]: false }));
      const number = readField(which, text);
      if (number === null) return;
      setPending((previous) => (which === 'minute' ? { ...previous, minute: number } : { ...previous, hour: twelve ? hourOf12(number, periodOf(previous.hour)) : number }));
    },
    [readField, twelve],
  );
  const onFieldCommit = useCallback((which: 'hour' | 'minute', text: string) => {
    if (readField(which, text) === null) setErrors((previous) => ({ ...previous, [which]: true }));
  }, [readField]);
  const onFieldSubmit = useCallback(
    (which: 'hour' | 'minute') => {
      if (which === 'hour') requestFocus('field.minute');
      else confirm();
    },
    [requestFocus, confirm],
  );

  // ---- the entry-mode toggle (TMP-24)
  const toggleEntry = useCallback(() => {
    const next = entry === 'dial' ? 'text' : 'dial';
    setEntry(next);
    setTexts({ hour: hourText(locale, cycle, pending.hour), minute: minuteText(locale, pending.minute) });
    setErrors({ hour: false, minute: false });
    if (next === 'dial') setUnit('hour');
    requestFocus(next === 'text' ? 'field.hour' : 'hour');
  }, [entry, locale, cycle, pending, requestFocus]);

  // ---- the dial (TMP-14)
  const onDialSet = useCallback(
    (value: number) => {
      setDragging(true);
      setTime(unit === 'hour' ? { ...pending, hour: value } : { ...pending, minute: value });
    },
    [unit, pending, setTime],
  );
  const onDialRelease = useCallback(() => {
    setDragging(false);
    if (unit !== 'hour') return;
    setUnit('minute');
    if (focused.current === 'hour') requestFocus('minute');
  }, [unit, requestFocus]);

  // ---- keys (TMP-1's focus loop, TMP-4, TMP-11, TMP-16)
  const periodFirst = twelve && place === 'before';
  const firstInOrder: PartKey = periodFirst ? `period.${period}` : entry === 'text' ? 'field.hour' : 'hour';
  const lastInOrder: PartKey = confirmEnabled ? 'confirm' : 'cancel';
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
        // TMP-1: focus stays in — Tab from the last element moves to the first, Shift+Tab the other way.
        if (!shift && at === lastInOrder) {
          event.preventDefault?.();
          requestFocus(firstInOrder);
        } else if (shift && at === firstInOrder) {
          event.preventDefault?.();
          requestFocus(lastInOrder);
        }
        return;
      }
      if (at === 'hour' || at === 'minute') {
        let next: ClockTime | null = null;
        if (key === 'ArrowUp' || key === 'ArrowRight') next = at === 'hour' ? stepHour(pending, 1, cycle) : stepMinute(pending, 1);
        else if (key === 'ArrowDown' || key === 'ArrowLeft') next = at === 'hour' ? stepHour(pending, -1, cycle) : stepMinute(pending, -1);
        else if (at === 'minute' && key === 'PageUp') next = stepMinute(pending, 5);
        else if (at === 'minute' && key === 'PageDown') next = stepMinute(pending, -5);
        else if (key === 'Home') next = at === 'hour' ? { ...pending, hour: twelve ? hourOf12(1, period) : 0 } : { ...pending, minute: 0 };
        else if (key === 'End') next = at === 'hour' ? { ...pending, hour: twelve ? hourOf12(12, period) : 23 } : { ...pending, minute: 59 };
        if (!next) return;
        event.preventDefault?.();
        setTime(next);
        return;
      }
      if (at?.startsWith('period.') && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        // TMP-11: as a group of radio buttons — the arrows move focus to the other segment and choose it.
        event.preventDefault?.();
        const other = (at === 'period.0' ? 1 : 0) as 0 | 1;
        choosePeriod(other);
        focused.current = `period.${other}`;
        requestFocus(focused.current);
      }
    },
    [close, lastInOrder, firstInOrder, requestFocus, pending, cycle, twelve, period, setTime, choosePeriod],
  );

  // ---- drawing
  const target = theme.system.measure.target.touch;
  const selectorWidth = Math.max(tokens.selectorContainerWidth, target);
  const selectorHeight = Math.max(tokens.selectorContainerHeight, target);
  // The fields' containers, aligned: both start at the lower of their tops, and the separator and the period take that
  // top and the taller container's height (a field's own height until one is laid out).
  const fieldTop = containers.top;
  const fieldHeight = containers.height;
  const fieldOffset = containers.offset;

  const selector = (which: TimePickerUnit) => (
    <TimeSelector
      key={which}
      condition={entry === 'dial' && unit === which ? 'selected' : 'unselected'}
      text={which === 'hour' ? hourShown : minuteShown}
      name={which === 'hour' ? words.hourLabel : words.minuteLabel}
      valueText={which === 'hour' && twelve ? (periodFirst ? `${periods[period]} ${hourShown}` : `${hourShown} ${periods[period]}`) : which === 'hour' ? hourShown : minuteShown}
      width={selectorWidth}
      height={selectorHeight}
      tokens={tokens}
      theme={theme}
      onPress={() => {
        showUnit(which);
      }}
      onFocused={() => {
        showUnit(which);
        onPartFocus(which);
      }}
      onBlurred={() => onPartBlur(which)}
      onAdjust={(delta) => adjust(which, delta)}
      focusRef={refFor(which)}
      testID={part(which)}
    />
  );
  const separatorNode = (style: 'display' | 'field') => (
    <Text
      style={{ ...(style === 'display' ? theme.text(tokens.separatorTypescale) : theme.text(theme.system.components.textField.sizes.large.inputTypescale)), color: theme.paint(tokens.separatorColor) }}
      allowFontScaling
      {...HIDDEN}
      testID={part(style === 'display' ? 'separator' : 'fields.separator')}
    >
      {separator}
    </Text>
  );
  // In the display the period stretches to the selectors' height (they grow with enlarged text) and is drawn at least
  // the target. Beside the fields (TMP-22) it is drawn as tall as a field, from their top — never stretched to a field's
  // supporting text (invalidText) — and reaches the target's height with a hit area extending equally above and below:
  // nothing sits there. Its width is drawn at least the target in both, its neighbours being beside it.
  const periodSelector = (height: number, beside: 'selectors' | 'fields') =>
    twelve ? (
      <PeriodSelector
        names={periods}
        period={period}
        place={place}
        height={beside === 'selectors' ? Math.max(height, target) : height}
        slop={beside === 'selectors' ? 0 : Math.max(0, (target - height) / 2)}
        offset={beside === 'selectors' ? 0 : fieldTop}
        stretch={beside === 'selectors'}
        tokens={tokens}
        theme={theme}
        onChoose={choosePeriod}
        focusHandlers={focusHandlers}
        refFor={refFor}
        testID={part('period')}
      />
    ) : null;
  // TMP-9 / TMP-28: hour, separator and minute always left to right, as a time is written; the period where the locale
  // writes it, which mirrors with the layout.
  const display = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} testID={part('display')}>
      {twelve && place === 'before' ? periodSelector(selectorHeight, 'selectors') : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.selectorGap, direction: 'ltr' }} testID={part('time')}>
        {selector('hour')}
        {separatorNode('display')}
        {selector('minute')}
      </View>
      {twelve && place === 'after' ? periodSelector(selectorHeight, 'selectors') : null}
    </View>
  );
  const field = (which: 'hour' | 'minute') => (
    <TextFieldContainerFrameContext.Provider key={which} value={containers.link(which)}>
      <TextField
        ref={refFor(`field.${which}`) as never}
        variant="outlined"
        size="large"
        type="number"
        maxLength={2}
        label={which === 'hour' ? words.hourLabel : words.minuteLabel}
        value={texts[which]}
        error={errors[which]}
        errorText={errors[which] ? words.invalidText : undefined}
        onChangeText={(text) => onFieldChange(which, text)}
        onEndEditing={(text) => onFieldCommit(which, text)}
        onSubmitEditing={() => onFieldSubmit(which)}
        returnKeyType={which === 'hour' ? 'next' : 'done'}
        {...focusHandlers(`field.${which}`)}
        style={{ width: tokens.selectorContainerWidth, ...(fieldOffset(which) > 0 ? { marginTop: fieldOffset(which) } : null) }}
        testID={part(`field.${which}`)}
      />
    </TextFieldContainerFrameContext.Provider>
  );
  const fields = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} testID={part('fields')}>
      {twelve && place === 'before' ? periodSelector(fieldHeight, 'fields') : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.selectorGap, direction: 'ltr' }}>
        {field('hour')}
        <View style={{ minHeight: fieldHeight, justifyContent: 'center', ...(fieldTop > 0 ? { marginTop: fieldTop } : null) }}>{separatorNode('field')}</View>
        {field('minute')}
      </View>
      {twelve && place === 'after' ? periodSelector(fieldHeight, 'fields') : null}
    </View>
  );
  const dial = (
    <Dial
      unit={unit}
      time={pending}
      cycle={cycle}
      locale={locale}
      tokens={tokens}
      theme={theme}
      animate={!dragging}
      onSet={onDialSet}
      onRelease={onDialRelease}
      testID={part('dial')}
    />
  );
  const label = (
    <Text style={{ ...theme.text(tokens.headerLabelTypescale), color: theme.paint(tokens.headerLabelColor) }} allowFontScaling testID={part('label')}>
      {words.label}
    </Text>
  );
  // TMP-24: the entry-mode toggle at the start; Cancel and OK at the end, OK last, actions.gap apart.
  const actions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', gap: tokens.actionsGap }} testID={part('actions')}>
      <IconButton
        ref={refFor('entry-toggle') as never}
        variant="standard"
        size="medium"
        accessibilityLabel={entry === 'dial' ? words.textEntryLabel : words.dialEntryLabel}
        onPress={toggleEntry}
        {...focusHandlers('entry-toggle')}
        testID={part('entry-toggle')}
      >
        {entry === 'dial' ? GLYPHS.keyboard : GLYPHS.clock}
      </IconButton>
      <View style={{ flexDirection: 'row', gap: tokens.actionsGap }}>
        <Button ref={refFor('cancel') as never} variant="text" size="medium" onPress={() => close('cancel')} {...focusHandlers('cancel')} testID={part('cancel')}>
          {words.cancelLabel}
        </Button>
        <Button ref={refFor('confirm') as never} variant="text" size="medium" disabled={!confirmEnabled} onPress={confirm} {...focusHandlers('confirm')} testID={part('confirm')}>
          {words.confirmLabel}
        </Button>
      </View>
    </View>
  );

  // TMP-7: vertical, horizontal, or auto — horizontal only when vertical does not fit the room's height and horizontal
  // fits its width. The sizes are measured as the parts are laid out; until then (and in place) vertical.
  const [sizes, setSizes] = useState<{ label?: number; display?: { width: number; height: number }; actions?: number }>({});
  const measure = (key: 'label' | 'display' | 'actions') => (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSizes((previous) => {
      if (key === 'display') return previous.display && previous.display.width === width && previous.display.height === height ? previous : { ...previous, display: { width, height } };
      return previous[key] === height ? previous : { ...previous, [key]: height };
    });
  };
  const padding = tokens.containerPadding;
  const verticalHeight = sizes.label !== undefined && sizes.display && sizes.actions !== undefined ? 2 * padding + sizes.label + tokens.containerGap + sizes.display.height + tokens.containerGap + tokens.dialContainerSize + tokens.actionsMarginBlockStart + sizes.actions : null;
  const horizontalWidth = sizes.display ? 2 * padding + sizes.display.width + tokens.containerGap + tokens.dialContainerSize : null;
  const horizontal =
    entry === 'dial' &&
    (config.layout === 'horizontal' || (config.layout === 'auto' && room !== null && verticalHeight !== null && horizontalWidth !== null && room.height < verticalHeight && room.width >= horizontalWidth));

  // TMP-8: the label and the actions stay while the time and the dial scroll between them; when they alone leave no
  // room, everything scrolls.
  const [fixed, setFixed] = useState({ top: 0, bottom: 0 });
  const onTopLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.top === height ? previous : { ...previous, top: height }));
  }, []);
  const onBottomLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setFixed((previous) => (previous.bottom === height ? previous : { ...previous, bottom: height }));
  }, []);
  const limit = room?.height;
  const scrollsAll = limit !== undefined && fixed.top + fixed.bottom > 0 && fixed.top + fixed.bottom + selectorHeight > limit;

  // TMP-1: the container's color, elevation and corners (eased by the smoothing), inset by the padding.
  const elevation = theme.elevation(tokens.containerElevation);
  const shadow: ViewStyle = supportsBoxShadow() ? (elevation.boxShadow.length > 0 ? { boxShadow: elevation.boxShadow } : {}) : elevation.legacy;
  const fill = theme.resolve(tokens.containerColor);
  const containerStyle: ViewStyle = {
    ...(limit !== undefined ? { maxHeight: limit } : null),
    ...(room ? { maxWidth: room.width } : null),
    borderRadius: tokens.containerShape,
    ...(fill.a > 0 ? { backgroundColor: theme.paint(tokens.containerColor) } : null),
    ...shadow,
    ...borderCurveOf(cornerSmoothing),
  };
  const clip: ViewStyle = { overflow: 'hidden', borderRadius: tokens.containerShape, flexShrink: 1, ...borderCurveOf(cornerSmoothing) };
  const middle =
    entry === 'text' ? (
      <View style={{ alignItems: 'center' }} testID={part('middle')}>
        {fields}
      </View>
    ) : (
      <View style={{ alignItems: 'center', gap: tokens.containerGap }} testID={part('middle')}>
        <View onLayout={measure('display')}>{display}</View>
        {dial}
      </View>
    );
  let body;
  if (horizontal) {
    // TMP-7: two columns — the label, the time and (at the bottom) the actions; the dial, centred vertically.
    body = (
      <ScrollView bounces={false} style={{ flexGrow: 0 }} contentContainerStyle={{ padding }} testID={part('scroll')}>
        <View style={{ flexDirection: 'row', gap: tokens.containerGap }} testID={part('columns')}>
          <View style={{ justifyContent: 'space-between', gap: tokens.containerGap }} testID={part('start')}>
            <View style={{ gap: tokens.containerGap }}>
              {label}
              <View onLayout={measure('display')}>{display}</View>
            </View>
            {actions}
          </View>
          <View style={{ justifyContent: 'center' }} testID={part('end')}>
            {dial}
          </View>
        </View>
      </ScrollView>
    );
  } else {
    const top = (
      <View onLayout={scrollsAll ? undefined : onTopLayout} style={{ paddingTop: padding, paddingHorizontal: padding, paddingBottom: tokens.containerGap, alignItems: 'center' }} testID={part('top')}>
        <View onLayout={measure('label')}>{label}</View>
      </View>
    );
    const bottom = (
      <View onLayout={scrollsAll ? undefined : onBottomLayout} style={{ paddingTop: tokens.actionsMarginBlockStart, paddingHorizontal: padding, paddingBottom: padding }} testID={part('bottom')}>
        <View onLayout={measure('actions')}>{actions}</View>
      </View>
    );
    const center = <View style={{ paddingHorizontal: padding, alignItems: 'center' }}>{middle}</View>;
    body = scrollsAll ? (
      <ScrollView bounces={false} style={{ flexGrow: 0 }} testID={part('scroll')}>
        {top}
        {center}
        {bottom}
      </ScrollView>
    ) : (
      <>
        {top}
        <ScrollView bounces={false} style={{ flexGrow: 0, flexShrink: 1 }} testID={part('scroll')}>
          {center}
        </ScrollView>
        {bottom}
      </>
    );
  }
  const keys = { onKeyDown } as object;
  return (
    <Animated.View
      {...keys}
      // TMP-26: a modal dialog named by label.
      role="dialog"
      aria-modal
      accessibilityLabel={words.label.trim() ? words.label : undefined}
      onAccessibilityEscape={() => close('back')}
      style={[containerStyle, { opacity: motion.container, transform: [{ scale: motion.scale }] }]}
      testID={testID}
    >
      {elevation.ring ? <Ring placement="outside" width={elevation.ring.width} color={elevation.ring.color} radius={tokens.containerShape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null}
      <View style={clip} testID={part('clip')}>
        {body}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// A selector (TMP-9, TMP-16 … TMP-22, TMP-26)

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A condition's tokens in a state; the picker has no disabled state, so disabled reads the resting ones. */
const toneOf = (tones: { enabled: TanreiTimePickerConditionStateTokens; hovered: TanreiTimePickerConditionStateTokens; focused: TanreiTimePickerConditionStateTokens; pressed: TanreiTimePickerConditionStateTokens }, state: InteractionState) =>
  state === 'disabled' ? tones.enabled : tones[state];

interface TimeSelectorProps {
  condition: TanreiCoreTimePickerCondition;
  text: string;
  name: string;
  valueText: string;
  width: number;
  height: number;
  tokens: TanreiTimePickerTokens;
  theme: TanreiTheme;
  onPress: () => void;
  onFocused: () => void;
  onBlurred: () => void;
  onAdjust: (delta: number) => void;
  focusRef: (node: FocusableNode | null) => void;
  testID: string | undefined;
}

function TimeSelector({ condition, text, name, valueText, width, height, tokens, theme, onPress, onFocused, onBlurred, onAdjust, focusRef, testID }: TimeSelectorProps) {
  const part = (name_: string) => partTestID(testID, name_);
  const { cornerSmoothing } = theme.system.shape;
  const tones = lookupValue(tokens.conditions, condition, 'unselected', 'TimePicker condition');
  const row = useItemRow<'label' | 'outline'>({
    pressable: true,
    disabled: false,
    condition,
    paints: (state) => ({ container: toneOf(tones, state).selectorContainerColor, label: toneOf(tones, state).selectorLabelColor, outline: toneOf(tones, state).selectorOutlineColor }),
    shapes: { ...tokens, containerShape: tokens.selectorContainerShape, disabledOpacity: RESTING_OPACITY },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width, height },
    ref: focusRef as unknown as RefObject<PressableHost>,
    onPress,
    onFocus: onFocused,
    onBlur: onBlurred,
  });
  const { drawn, interaction } = row;
  const tone = toneOf(tones, row.state);
  const outline = theme.resolve(tone.selectorOutlineColor);
  // TMP-16 / TMP-26: an adjustable control — increment and decrement do what Up and Down Arrow do.
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') onAdjust(1);
      if (event.nativeEvent.actionName === 'decrement') onAdjust(-1);
    },
    [onAdjust],
  );
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      // TMP-22: at least the target in each dimension; neighbours never extend a hit area over each other.
      hitSlop={NO_SLOP}
      accessibilityRole="adjustable"
      accessibilityLabel={name}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={{
        minWidth: width,
        minHeight: height,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: drawn.shape,
        backgroundColor: fillOf(row.container, drawn.container),
        opacity: drawn.opacity,
        ...borderCurveOf(cornerSmoothing),
      }}
      testID={testID}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={row.rippleColor} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {drawsColor(outline, drawn.outline) ? <Ring placement="inside" width={tone.selectorOutlineWidth} color={drawn.outline} radius={drawn.shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null}
      <Label style={{ ...theme.text(tokens.selectorLabelTypescale), textAlign: 'center' }} color={drawn.label} testID={part('label')}>
        {text}
      </Label>
      {/* TMP-18: gap-then-ring outside the box, never animated. */}
      <FocusRing visible={interaction.focused} radius={tokens.selectorContainerShape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The period selector (TMP-10, TMP-11, TMP-26)

interface PeriodSelectorProps {
  names: [string, string];
  period: 0 | 1;
  place: 'before' | 'after';
  height: number;
  /** The hit area's extension above and below each segment (TMP-22, beside the fields). */
  slop: number;
  /** As tall as the row (the selectors'), or its own height from the top (beside the fields). */
  stretch: boolean;
  /** Beside the fields: how far below the row's top their containers start (room reserved above a field for its label). */
  offset: number;
  tokens: TanreiTimePickerTokens;
  theme: TanreiTheme;
  onChoose: (period: 0 | 1) => void;
  focusHandlers: (key: PartKey) => { onFocus: () => void; onBlur: () => void };
  refFor: (key: PartKey) => (node: FocusableNode | null) => void;
  testID: string | undefined;
}

function PeriodSelector({ names, period, place, height, slop, stretch, offset, tokens, theme, onChoose, focusHandlers, refFor, testID }: PeriodSelectorProps) {
  const part = (name: string) => partTestID(testID, name);
  const { cornerSmoothing } = theme.system.shape;
  const shape = tokens.periodContainerShape;
  // comp.time-picker.period.margin-inline-start from the selector it sits beside, in the layout direction.
  const margin: ViewStyle = {
    ...(place === 'after' ? { marginStart: tokens.periodMarginInlineStart } : { marginEnd: tokens.periodMarginInlineStart }),
    ...(offset > 0 ? { marginTop: offset } : null),
  };
  return (
    <View role="radiogroup" style={[{ flexDirection: 'row', minHeight: height, alignSelf: stretch ? 'stretch' : 'flex-start', borderRadius: shape, ...borderCurveOf(cornerSmoothing) }, margin]} testID={testID}>
      {([0, 1] as const).map((each) => (
        <PeriodSegment
          key={each}
          index={each}
          name={names[each]}
          chosen={period === each}
          height={height}
          slop={slop}
          tokens={tokens}
          theme={theme}
          onChoose={onChoose}
          {...focusHandlers(`period.${each}`)}
          focusRef={refFor(`period.${each}`)}
          testID={part(String(each))}
        />
      ))}
      {/* A border around both segments and a line between them, in the outline's width and color. */}
      <Ring placement="inside" width={tokens.periodOutlineWidth} color={theme.paint(tokens.periodOutlineColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, start: '50%', width: tokens.periodOutlineWidth, marginStart: -tokens.periodOutlineWidth / 2, backgroundColor: theme.paint(tokens.periodOutlineColor) }} {...HIDDEN} testID={part('divider')} />
    </View>
  );
}

interface PeriodSegmentProps {
  index: 0 | 1;
  name: string;
  chosen: boolean;
  height: number;
  slop: number;
  tokens: TanreiTimePickerTokens;
  theme: TanreiTheme;
  onChoose: (period: 0 | 1) => void;
  onFocus: () => void;
  onBlur: () => void;
  focusRef: (node: FocusableNode | null) => void;
  testID: string | undefined;
}

function PeriodSegment({ index, name, chosen, height, slop, tokens, theme, onChoose, onFocus, onBlur, focusRef, testID }: PeriodSegmentProps) {
  const part = (name_: string) => partTestID(testID, name_);
  const { cornerSmoothing } = theme.system.shape;
  const condition: TanreiCoreTimePickerCondition = chosen ? 'selected' : 'unselected';
  const tones = lookupValue(tokens.conditions, condition, 'unselected', 'TimePicker condition');
  const target = theme.system.measure.target.touch;
  const width = Math.max(tokens.periodContainerWidth, target);
  const handlePress = useCallback(() => onChoose(index), [onChoose, index]);
  const row = useItemRow<'label'>({
    pressable: true,
    disabled: false,
    condition,
    paints: (state) => ({ container: toneOf(tones, state).periodContainerColor, label: toneOf(tones, state).periodLabelColor }),
    shapes: { ...tokens, containerShape: tokens.periodContainerShape, disabledOpacity: RESTING_OPACITY },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    estimate: { width, height },
    ref: focusRef as unknown as RefObject<PressableHost>,
    onPress: handlePress,
    onFocus,
    onBlur,
  });
  const { drawn, interaction } = row;
  // The outer corners only: the segment before noon has the start corners, the other the end corners.
  const shape = tokens.periodContainerShape;
  const corners = index === 0 ? { topStart: shape, bottomStart: shape, topEnd: 0, bottomEnd: 0 } : { topStart: 0, bottomStart: 0, topEnd: shape, bottomEnd: shape };
  return (
    <AnimatedPressable
      {...interaction.hostProps}
      // TMP-22: never over the other segment or the fields beside it; above and below only where the drawing is shorter
      // than the target (beside the fields).
      hitSlop={slop > 0 ? { top: slop, bottom: slop, left: 0, right: 0 } : NO_SLOP}
      // TMP-11: one tab stop, the chosen segment.
      focusable={chosen}
      role="radio"
      accessibilityLabel={name}
      accessibilityState={{ checked: chosen }}
      style={{
        minWidth: width,
        minHeight: height,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopStartRadius: corners.topStart,
        borderBottomStartRadius: corners.bottomStart,
        borderTopEndRadius: corners.topEnd,
        borderBottomEndRadius: corners.bottomEnd,
        backgroundColor: fillOf(row.container, drawn.container),
        opacity: drawn.opacity,
        ...borderCurveOf(cornerSmoothing),
      }}
      testID={testID}
    >
      {interaction.wave.ripple ? <PressRipple ripple={interaction.wave.ripple} color={row.rippleColor} radius={0} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      <Label style={{ ...theme.text(tokens.periodLabelTypescale), textAlign: 'center' }} color={drawn.label} testID={part('label')}>
        {name}
      </Label>
      <FocusRing visible={interaction.focused} radius={shape} corners={corners} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The dial (TMP-12 … TMP-15)

/** sin and cos every 5° over −360°…720°: a handle moving along the shorter arc is interpolated from them. */
const ARC_STEP = 5;
const ARC_INPUT = Array.from({ length: (1080 / ARC_STEP) + 1 }, (_unused, index) => -360 + index * ARC_STEP);
const ARC_SIN = ARC_INPUT.map((degrees) => Math.sin((degrees * Math.PI) / 180));
const ARC_COS = ARC_INPUT.map((degrees) => Math.cos((degrees * Math.PI) / 180));
/** A point on the dial to a thousandth of a point: no floating-point noise (148.99999999999997) in what is drawn. */
const settle = (value: number) => Math.round(value * 1000) / 1000;

interface DialPosition {
  /** Degrees clockwise from the top. */
  angle: number;
  radius: number;
}

/** Where a value lies on the dial (TMP-13): an hour at its number (the inner ring for 12–23 on the 24-hour clock); a minute at six degrees a minute. */
function dialPosition(unit: TimePickerUnit, time: ClockTime, cycle: HourCycle, outer: number, inner: number): DialPosition {
  if (unit === 'minute') return { angle: time.minute * 6, radius: outer };
  return { angle: (time.hour % 12) * 30, radius: cycle === 'h23' && time.hour >= 12 ? inner : outer };
}

/**
 * TMP-15: the handle's angle and radius — plain when settled; moving along the shorter arc over the dial motion when the
 * value changes by a key, an action or a field, and when the unit changes; at once while dragging and where motion is
 * reduced.
 */
function useHandle(target: DialPosition, animate: boolean, duration: number, easing: TanreiTimePickerTokens['motionDialEasing']) {
  const reduce = useReduceMotion();
  const [settled, setSettled] = useState(target);
  const [moving, setMoving] = useState(false);
  const angle = useRef(new Animated.Value(target.angle)).current;
  const radius = useRef(new Animated.Value(target.radius)).current;
  useEffect(() => {
    if (target.angle === settled.angle && target.radius === settled.radius) return undefined;
    if (!animate || reduce) {
      angle.setValue(target.angle);
      radius.setValue(target.radius);
      setSettled(target);
      setMoving(false);
      return undefined;
    }
    const delta = ((((target.angle - settled.angle) % 360) + 540) % 360) - 180;
    angle.setValue(settled.angle);
    radius.setValue(settled.radius);
    setMoving(true);
    const animation = Animated.parallel([
      Animated.timing(angle, { toValue: settled.angle + delta, duration, easing: toEasing(easing), useNativeDriver: false }),
      Animated.timing(radius, { toValue: target.radius, duration, easing: toEasing(easing), useNativeDriver: false }),
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      setSettled(target);
      setMoving(false);
    });
    return () => animation.stop();
  }, [target.angle, target.radius]);
  return moving ? { angle, radius, moving: true as const } : { angle: settled.angle, radius: settled.radius, moving: false as const };
}

interface DialProps {
  unit: TimePickerUnit;
  time: ClockTime;
  cycle: HourCycle;
  locale: string;
  tokens: TanreiTimePickerTokens;
  theme: TanreiTheme;
  animate: boolean;
  onSet: (value: number) => void;
  onRelease: () => void;
  testID: string | undefined;
}

function Dial({ unit, time, cycle, locale, tokens, theme, animate, onSet, onRelease, testID }: DialProps) {
  const part = (name: string) => partTestID(testID, name);
  const size = tokens.dialContainerSize;
  const center = size / 2;
  const handleSize = tokens.dialHandleSize;
  const outer = center - tokens.dialPadding - handleSize / 2;
  const inner = outer - handleSize;
  const reduce = useReduceMotion();

  // TMP-12: twelve numbers clockwise from the top, in the locale's digits.
  const numbers = (which: TimePickerUnit): { text: string; angle: number; radius: number }[] => {
    const ring = (values: number[], radius: number, digits: number) => values.map((value, index) => ({ text: formatInteger(locale, value, digits), angle: index * 30, radius }));
    if (which === 'minute') return ring(Array.from({ length: 12 }, (_unused, index) => index * 5), outer, 2);
    if (cycle === 'h12') return ring([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], outer, 1);
    return [...ring(Array.from({ length: 12 }, (_unused, index) => index), outer, 2), ...ring(Array.from({ length: 12 }, (_unused, index) => index + 12), inner, 2)];
  };
  const layer = (which: TimePickerUnit, color: string, name: string) => (
    <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }} pointerEvents="none" testID={part(name)}>
      {numbers(which).map(({ text, angle, radius }) => {
        const radians = (angle * Math.PI) / 180;
        return (
          <View key={`${radius}.${angle}`} style={{ position: 'absolute', left: settle(center + radius * Math.sin(radians) - handleSize / 2), top: settle(center - radius * Math.cos(radians) - handleSize / 2), width: handleSize, height: handleSize, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...theme.text(tokens.dialLabelTypescale), color }} allowFontScaling>
              {text}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // TMP-15: the numbers cross-fade when the unit changes (at once where motion is reduced).
  const [fade, setFade] = useState<{ from: TimePickerUnit; id: number } | null>(null);
  const shownUnit = useRef(unit);
  const fadeProgress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (shownUnit.current === unit) return undefined;
    const from = shownUnit.current;
    shownUnit.current = unit;
    if (reduce) return undefined;
    setFade((previous) => ({ from, id: (previous?.id ?? 0) + 1 }));
    fadeProgress.setValue(0);
    const animation = Animated.timing(fadeProgress, { toValue: 1, duration: tokens.motionDialDuration, easing: toEasing(tokens.motionDialEasing), useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished) setFade(null);
    });
    return () => animation.stop();
  }, [unit]);

  const position = dialPosition(unit, time, cycle, outer, inner);
  const handle = useHandle(position, animate, tokens.motionDialDuration, tokens.motionDialEasing);
  const labelColor = theme.paint(tokens.dialLabelColor);
  const selectedColor = theme.paint(tokens.dialSelectedLabelColor);
  // The handle's top-left corner, the track's length and turn: plain when settled, interpolated while it moves.
  let left: Moving<number> | Animated.AnimatedNode;
  let top: Moving<number> | Animated.AnimatedNode;
  let length: Moving<number> | Animated.Value;
  let turn: Moving<string>;
  if (handle.moving) {
    const sin = handle.angle.interpolate({ inputRange: ARC_INPUT, outputRange: ARC_SIN });
    const cos = handle.angle.interpolate({ inputRange: ARC_INPUT, outputRange: ARC_COS });
    left = Animated.add(center - handleSize / 2, Animated.multiply(handle.radius, sin));
    top = Animated.subtract(center - handleSize / 2, Animated.multiply(handle.radius, cos));
    length = handle.radius;
    turn = handle.angle.interpolate({ inputRange: [-360, 720], outputRange: ['-450deg', '630deg'] });
  } else {
    const radians = (handle.angle * Math.PI) / 180;
    left = settle(center + handle.radius * Math.sin(radians) - handleSize / 2);
    top = settle(center - handle.radius * Math.cos(radians) - handleSize / 2);
    length = handle.radius;
    turn = `${handle.angle - 90}deg`;
  }
  const negative = (value: Moving<number> | Animated.AnimatedNode) => (typeof value === 'number' ? -value : Animated.multiply(value as never, -1));

  // TMP-14: a press or a drag sets the value nearest the pointer's angle (on the 24-hour hour dial, on the nearer ring);
  // it ends on the minute dial. The responder is the dial itself (its children take no touches), so the location is
  // in the dial's coordinates.
  const valueAt = (x: number, y: number): number => {
    const dx = x - center;
    const dy = y - center;
    const degrees = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (unit === 'minute') return Math.round(degrees / 6) % 60;
    const index = Math.round(degrees / 30) % 12;
    if (cycle === 'h12') return hourOf12(index === 0 ? 12 : index, periodOf(time.hour));
    const distance = Math.hypot(dx, dy);
    return Math.abs(distance - inner) < Math.abs(distance - outer) ? index + 12 : index;
  };
  const onTouch = (event: GestureResponderEvent) => onSet(valueAt(event.nativeEvent.locationX, event.nativeEvent.locationY));
  const between = unit === 'minute' && time.minute % 5 !== 0;
  const trackWidth = tokens.dialTrackWidth;
  return (
    <View
      // TMP-14 / TMP-26: a pointer surface, hidden from assistive technology — the selectors and the fields are its controls.
      {...HIDDEN}
      pointerEvents="box-only"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onTouch}
      onResponderMove={onTouch}
      onResponderRelease={onRelease}
      onResponderTerminate={onRelease}
      // The dial runs clockwise in every layout direction (TMP-28): it is drawn with physical coordinates, never mirrored.
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.paint(tokens.dialContainerColor), direction: 'ltr' }}
      testID={testID}
    >
      {/* TMP-13: the track from the centre to the handle, the centre dot, the handle. */}
      <Animated.View
        style={{ position: 'absolute', left: center, top: center - trackWidth / 2, width: length as never, height: trackWidth, backgroundColor: theme.paint(tokens.dialTrackColor), transformOrigin: 'left', transform: [{ rotate: turn }] }}
        testID={part('track')}
      />
      <View style={{ position: 'absolute', left: center - tokens.dialCenterSize / 2, top: center - tokens.dialCenterSize / 2, width: tokens.dialCenterSize, height: tokens.dialCenterSize, borderRadius: tokens.dialCenterSize / 2, backgroundColor: theme.paint(tokens.dialTrackColor) }} testID={part('center')} />
      {fade ? <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity: fadeProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }} testID={part('numbers.leaving')}>{layer(fade.from, labelColor, 'numbers.leaving.layer')}</Animated.View> : null}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity: fade ? fadeProgress : 1 }}>{layer(unit, labelColor, 'numbers')}</Animated.View>
      <Animated.View style={{ position: 'absolute', left: left as never, top: top as never, width: handleSize, height: handleSize, borderRadius: handleSize / 2, overflow: 'hidden', backgroundColor: theme.paint(tokens.dialHandleColor) }} testID={part('handle')}>
        {/* The part of a number under the handle in the selected-label color: the numbers again, clipped by the handle. */}
        <Animated.View style={{ position: 'absolute', left: negative(left) as never, top: negative(top) as never }}>{layer(unit, selectedColor, 'numbers.selected')}</Animated.View>
        {between ? (
          <View style={{ position: 'absolute', left: (handleSize - tokens.dialCenterSize) / 2, top: (handleSize - tokens.dialCenterSize) / 2, width: tokens.dialCenterSize, height: tokens.dialCenterSize, borderRadius: tokens.dialCenterSize / 2, backgroundColor: selectedColor }} testID={part('handle.dot')} />
        ) : null}
      </Animated.View>
    </View>
  );
}

