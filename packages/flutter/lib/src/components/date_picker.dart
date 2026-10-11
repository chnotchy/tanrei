import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/date_localizations.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/field_container.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'button.dart';
import 'icon_button.dart';
import 'text_field.dart';

// ---------------------------------------------------------------------------------------------
// The picker's closed choices (spec props `presentation`, `mode`, `entryMode`, `startView`,
// `firstDayOfWeek`) and the reasons of its `close` event.

/// How a date picker is presented (the spec's `presentation`). Flutter's idiom chooses it by the
/// API: [showTanreiDatePicker] presents [modal], [TanreiDatePickerAnchor] presents [docked];
/// [TanreiDatePicker] draws either surface in place.
enum TanreiDatePickerPresentation {
  /// A dialog over a scrim, with a header, text entry and Cancel and OK; OK commits the choice.
  modal,

  /// A surface below an anchor that the rest of the page stays usable around; choosing a day
  /// commits it and closes the picker.
  docked;

  /// The presentation named [name], or [modal] — reported in debug builds — for a name the picker
  /// does not define (DTP-40).
  static TanreiDatePickerPresentation fromName(String name) =>
      tanreiEnumByName(values, name, fallback: modal, kind: 'date-picker presentation');
}

/// What a date picker chooses (the spec's `mode`).
enum TanreiDatePickerMode {
  /// One date: `value`.
  single,

  /// One contiguous span of dates, from `start` to `end` inclusive.
  range;

  /// The mode named [name], or [single] — reported in debug builds — for a name the picker does not
  /// define (DTP-40).
  static TanreiDatePickerMode fromName(String name) =>
      tanreiEnumByName(values, name, fallback: single, kind: 'date-picker mode');
}

/// How a modal date picker opens (the spec's `entryMode`).
enum TanreiDatePickerEntryMode {
  /// On the calendar.
  calendar,

  /// With text fields to type the date in.
  text;

  /// The entry mode named [name], or [calendar] — reported in debug builds — for a name the picker
  /// does not define (DTP-40).
  static TanreiDatePickerEntryMode fromName(String name) =>
      tanreiEnumByName(values, name, fallback: calendar, kind: 'date-picker entryMode');
}

/// Which view the calendar opens on (the spec's `startView`).
enum TanreiDatePickerStartView {
  /// The days of a month.
  day,

  /// The list of years.
  year;

  /// The view named [name], or [day] — reported in debug builds — for a name the picker does not
  /// define (DTP-40).
  static TanreiDatePickerStartView fromName(String name) =>
      tanreiEnumByName(values, name, fallback: day, kind: 'date-picker startView');
}

/// The weekday in the first column (the spec's `firstDayOfWeek`).
enum TanreiDatePickerFirstDayOfWeek {
  /// The locale's (CLDR's week data): Sunday in the United States and Japan, Monday in most of
  /// Europe.
  locale,

  /// Sunday.
  sunday,

  /// Monday.
  monday,

  /// Tuesday.
  tuesday,

  /// Wednesday.
  wednesday,

  /// Thursday.
  thursday,

  /// Friday.
  friday,

  /// Saturday.
  saturday;

  /// The weekday as `DateTime` numbers it ([DateTime.monday] … [DateTime.sunday]); null for
  /// [locale].
  int? get weekday => switch (this) {
    locale => null,
    sunday => DateTime.sunday,
    monday => DateTime.monday,
    tuesday => DateTime.tuesday,
    wednesday => DateTime.wednesday,
    thursday => DateTime.thursday,
    friday => DateTime.friday,
    saturday => DateTime.saturday,
  };

  /// The first day named [name], or [locale] — reported in debug builds — for a name the picker
  /// does not define (DTP-40).
  static TanreiDatePickerFirstDayOfWeek fromName(String name) =>
      tanreiEnumByName(values, name, fallback: locale, kind: 'date-picker firstDayOfWeek');
}

/// Why a date picker asks to be closed: the reason its `close` event carries (DTP-5).
enum TanreiDatePickerCloseReason {
  /// Escape.
  escape,

  /// The platform's back (Android's back button or gesture).
  back,

  /// A press on a modal picker's scrim, or outside a docked picker and its anchor.
  outside,

  /// Tab or Shift+Tab out of a docked picker: focus moves on from the anchor.
  tab,

  /// Focus moved out of a docked picker some other way.
  focusOut,

  /// A modal picker's Cancel.
  cancel,

  /// A modal picker's OK: the pending choice is committed.
  confirm,

  /// A day that completes a choice in a docked picker: the choice is committed.
  select,
}

/// A committed choice: [value] in single mode, [start] and [end] in range mode. Only the year,
/// month and day of each `DateTime` are meaningful; the picker hands out local midnights.
@immutable
class TanreiDateSelection {
  /// Creates a selection.
  const TanreiDateSelection({this.value, this.start, this.end});

  /// The chosen date in single mode.
  final DateTime? value;

  /// The first date of the chosen range in range mode.
  final DateTime? start;

  /// The last date of the chosen range in range mode.
  final DateTime? end;

  @override
  bool operator ==(Object other) =>
      other is TanreiDateSelection &&
      _sameDay(other.value, value) &&
      _sameDay(other.start, start) &&
      _sameDay(other.end, end);

  @override
  int get hashCode => Object.hash(_key(value), _key(start), _key(end));

  static int? _key(DateTime? date) =>
      date == null ? null : date.year * 10000 + date.month * 100 + date.day;

  @override
  String toString() =>
      'TanreiDateSelection(value: ${_iso(value)}, start: ${_iso(start)}, end: ${_iso(end)})';
}

/// The words a date picker shows or announces that are not locale data (DTP-37: every one a prop
/// with an English default; a product in another language sets them).
@immutable
class TanreiDatePickerLabels {
  /// The picker's words, English by default.
  const TanreiDatePickerLabels({
    this.label = 'Select date',
    this.dateLabel = 'Date',
    this.startLabel = 'Start date',
    this.endLabel = 'End date',
    this.confirmLabel = 'OK',
    this.cancelLabel = 'Cancel',
    this.previousMonthLabel = 'Previous month',
    this.nextMonthLabel = 'Next month',
    this.yearViewLabel = 'Choose a year',
    this.textEntryLabel = 'Switch to text entry',
    this.calendarEntryLabel = 'Switch to calendar',
    this.todayLabel = 'Today',
    this.invalidText = 'Enter a valid date',
    this.unavailableText = "This date can't be chosen",
  });

  /// Names the picker: its surface's accessible name, and the line above the chosen date in a
  /// modal picker's header.
  final String label;

  /// Single mode: the text field's label, and what the header shows while no date is chosen.
  final String dateLabel;

  /// Range mode: the start field's label, the header's placeholder and the start day's
  /// description.
  final String startLabel;

  /// Range mode: the end field's label, the header's placeholder and the end day's description.
  final String endLabel;

  /// The label of OK.
  final String confirmLabel;

  /// The label of Cancel.
  final String cancelLabel;

  /// The accessible name of the previous-month button.
  final String previousMonthLabel;

  /// The accessible name of the next-month button.
  final String nextMonthLabel;

  /// The description of the view toggle.
  final String yearViewLabel;

  /// The entry-mode toggle's name while the calendar is shown.
  final String textEntryLabel;

  /// The entry-mode toggle's name while text entry is shown.
  final String calendarEntryLabel;

  /// Read after today's date and the current year.
  final String todayLabel;

  /// The error of a field whose text is not a date, or whose end is before its start.
  final String invalidText;

  /// The error of a field whose date is before the first or after the last date, or disabled.
  final String unavailableText;

  /// A copy with the given words replaced.
  TanreiDatePickerLabels copyWith({
    String? label,
    String? dateLabel,
    String? startLabel,
    String? endLabel,
    String? confirmLabel,
    String? cancelLabel,
    String? previousMonthLabel,
    String? nextMonthLabel,
    String? yearViewLabel,
    String? textEntryLabel,
    String? calendarEntryLabel,
    String? todayLabel,
    String? invalidText,
    String? unavailableText,
  }) => TanreiDatePickerLabels(
    label: label ?? this.label,
    dateLabel: dateLabel ?? this.dateLabel,
    startLabel: startLabel ?? this.startLabel,
    endLabel: endLabel ?? this.endLabel,
    confirmLabel: confirmLabel ?? this.confirmLabel,
    cancelLabel: cancelLabel ?? this.cancelLabel,
    previousMonthLabel: previousMonthLabel ?? this.previousMonthLabel,
    nextMonthLabel: nextMonthLabel ?? this.nextMonthLabel,
    yearViewLabel: yearViewLabel ?? this.yearViewLabel,
    textEntryLabel: textEntryLabel ?? this.textEntryLabel,
    calendarEntryLabel: calendarEntryLabel ?? this.calendarEntryLabel,
    todayLabel: todayLabel ?? this.todayLabel,
    invalidText: invalidText ?? this.invalidText,
    unavailableText: unavailableText ?? this.unavailableText,
  );
}

/// Opens and closes a [TanreiDatePickerAnchor] (the spec's `open` of a docked picker), in the idiom
/// of Flutter's `MenuController`. A picker that asks to be closed (its `onClose`, with a reason)
/// closes itself through its controller; a product that closes it with [close] gets no `onClose`.
class TanreiDatePickerController extends ChangeNotifier {
  bool _isOpen = false;

  /// Whether the picker is shown.
  bool get isOpen => _isOpen;

  /// Shows the picker.
  void open() {
    if (!_isOpen) {
      _isOpen = true;
      notifyListeners();
    }
  }

  /// Removes the picker.
  void close() {
    if (_isOpen) {
      _isOpen = false;
      notifyListeners();
    }
  }
}

/// Builds a docked picker's anchor: the product's own field or button, which usually calls
/// `controller.open()`.
typedef TanreiDatePickerAnchorBuilder =
    Widget Function(BuildContext context, TanreiDatePickerController controller, Widget? child);

// ---------------------------------------------------------------------------------------------
// Calendar dates. Internally a date is the UTC midnight of its day (`DateTime.utc`), so adding days
// never meets a daylight-saving change; out of the picker it is a local midnight, of which only the
// year, month and day are meaningful (DTP-37).

DateTime _day(DateTime date) => DateTime.utc(date.year, date.month, date.day);
DateTime? _dayOrNull(DateTime? date) => date == null ? null : _day(date);
DateTime _local(DateTime day) => DateTime(day.year, day.month, day.day);
DateTime _monthOf(DateTime day) => DateTime.utc(day.year, day.month);
DateTime _addDays(DateTime day, int days) => DateTime.utc(day.year, day.month, day.day + days);
DateTime _addMonthsTo(DateTime month, int months) => DateTime.utc(month.year, month.month + months);
int _daysIn(DateTime month) => DateTime.utc(month.year, month.month + 1, 0).day;

bool _sameDay(DateTime? a, DateTime? b) =>
    a == null ? b == null : b != null && a.year == b.year && a.month == b.month && a.day == b.day;

String _iso(DateTime? date) => date == null
    ? 'none'
    : '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-'
          '${date.day.toString().padLeft(2, '0')}';

/// The same day number [months] later, the last day of that month when it is shorter (DTP-18,
/// DTP-20).
DateTime _addMonths(DateTime day, int months) {
  final DateTime month = _addMonthsTo(_monthOf(day), months);
  return DateTime.utc(month.year, month.month, math.min(day.day, _daysIn(month)));
}

DateTime _clampDay(DateTime day, DateTime? min, DateTime? max) {
  if (min != null && day.isBefore(min)) {
    return min;
  }
  if (max != null && day.isAfter(max)) {
    return max;
  }
  return day;
}

DateTime _clampMonth(DateTime month, DateTime? min, DateTime? max) {
  if (min != null && month.isBefore(_monthOf(min))) {
    return _monthOf(min);
  }
  if (max != null && month.isAfter(_monthOf(max))) {
    return _monthOf(max);
  }
  return month;
}

/// The years listed while the first or last date is not set (DTP-16).
const int _firstListedYear = 1900;
const int _lastListedYear = 2100;

/// Reads an ISO 8601 calendar date ("2026-09-17"). Text that is not one — a time, a zone, a day
/// that does not exist — is null.
DateTime? _parseIso(String text) {
  final RegExpMatch? match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(text);
  if (match == null) {
    return null;
  }
  final int year = int.parse(match.group(1)!);
  final int month = int.parse(match.group(2)!);
  final int day = int.parse(match.group(3)!);
  if (month < 1 || month > 12 || day < 1 || day > _daysIn(DateTime.utc(year, month))) {
    return null;
  }
  return DateTime(year, month, day);
}

/// Reads a field's text as a date (DTP-26): exactly three groups of digits (ASCII or the
/// locale's), separated by other characters, in the order of the locale's numeric form, with a
/// four-digit year and a month and day that exist in that year; leading zeros optional.
DateTime? _parseNumeric(String text, TanreiDateLocalizations localizations) {
  final List<String> groups = RegExp(r'[0-9]+')
      .allMatches(localizations.toAsciiDigits(text))
      .map((RegExpMatch match) => match.group(0)!)
      .toList();
  if (groups.length != 3) {
    return null;
  }
  final List<TanreiDateField> order = localizations.numericDateOrder;
  String group(TanreiDateField field) => groups[order.indexOf(field)];
  final String year = group(TanreiDateField.year);
  final String month = group(TanreiDateField.month);
  final String day = group(TanreiDateField.day);
  if (year.length != 4 || month.length > 2 || day.length > 2) {
    return null;
  }
  final int m = int.parse(month);
  final int d = int.parse(day);
  final int y = int.parse(year);
  if (m < 1 || m > 12 || d < 1 || d > _daysIn(DateTime.utc(y, m))) {
    return null;
  }
  return DateTime.utc(y, m, d);
}

// ---------------------------------------------------------------------------------------------
// The glyphs the picker draws (the spec names them), as Material Symbols code points drawn as text
// through the system's icon style.

const String _chevronLeftGlyph = '\u{e5cb}';
const String _chevronRightGlyph = '\u{e5cc}';
const String _expandMoreGlyph = '\u{e5cf}';
const String _keyboardGlyph = '\u{e312}';
const String _calendarMonthGlyph = '\u{ebcc}';

// ---------------------------------------------------------------------------------------------
// The props every form of the picker shares.

@immutable
class _PickerProps {
  const _PickerProps({
    required this.presentation,
    required this.mode,
    required this.value,
    required this.start,
    required this.end,
    required this.firstDate,
    required this.lastDate,
    required this.disabledDates,
    required this.isDateDisabled,
    required this.currentDate,
    required this.firstDayOfWeek,
    required this.locale,
    required this.entryMode,
    required this.startView,
    required this.labels,
  });

  final TanreiDatePickerPresentation presentation;
  final TanreiDatePickerMode mode;
  final DateTime? value;
  final DateTime? start;
  final DateTime? end;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final List<DateTime> disabledDates;
  final bool Function(DateTime date)? isDateDisabled;
  final DateTime? currentDate;
  final TanreiDatePickerFirstDayOfWeek firstDayOfWeek;
  final Locale? locale;
  final TanreiDatePickerEntryMode entryMode;
  final TanreiDatePickerStartView startView;
  final TanreiDatePickerLabels labels;
}

/// DTP-38: the surface's natural width — seven cells at the minimum target and the container's
/// inline padding on each side.
double _naturalSurfaceWidth(TanreiSystem system) =>
    7 * math.max(system.datePicker.cellSize, system.measure.targetTouch) +
    2 * system.datePicker.containerPaddingInline;

/// DTP-38: the margin from the window's side edges where the window (inside its safe area) is
/// [room] across: [margin], shrunk first where the window is too narrow for the surface at its
/// natural width — before the container's inline padding, and before the cells.
double _sideMargin(TanreiSystem system, double room, double margin) =>
    ((room - _naturalSurfaceWidth(system)) / 2).clamp(0, margin).toDouble();

/// DTP-1, DTP-38: the modal picker's margin from the window's side edges: `modal.container.margin`,
/// shrunk where the window is too narrow for the surface at its natural width.
double _modalSideMargin(BuildContext context) {
  final TanreiSystem system = TanreiTheme.of(context).system;
  final double room =
      (MediaQuery.maybeSizeOf(context)?.width ?? double.infinity) -
      (MediaQuery.maybePaddingOf(context)?.horizontal ?? 0);
  return _sideMargin(system, room, system.datePicker.modalContainerMargin);
}

/// DTP-2, DTP-38: a docked picker's margin from the viewport's side edges: `docked.viewport-margin`,
/// shrunk as the modal one is. The placement shrinks it the same way from the surface's width.
double _dockedSideMargin(BuildContext context) {
  final TanreiSystem system = TanreiTheme.of(context).system;
  final double room = MediaQuery.maybeSizeOf(context)?.width ?? double.infinity;
  return _sideMargin(system, room, system.datePicker.dockedViewportMargin);
}

/// DTP-37: [child] with the localizations of [locale], as `showDatePicker` does it; the layout
/// keeps the ambient direction. Without a locale, or without an ambient `Localizations` to load it
/// from, [child] as it is (the picker then reads the locale's week data and English words).
Widget _withLocale(BuildContext context, Locale? locale, Widget child) {
  final Locale? ambient = Localizations.maybeLocaleOf(context);
  if (locale == null || ambient == null || ambient == locale) {
    return child;
  }
  return Localizations.override(
    context: context,
    locale: locale,
    child: Directionality(textDirection: Directionality.of(context), child: child),
  );
}

// ---------------------------------------------------------------------------------------------
// Modal: showTanreiDatePicker

/// Presents a modal date picker — the spec's `open` with `presentation: modal` — as a modal route
/// over everything in the navigator, in the idiom of Flutter's `showDatePicker`, and completes with
/// the committed choice when OK is activated, or with null when the picker closes otherwise.
///
/// Implements `specs/date-picker.spec.json`:
///
/// * the route draws the scrim, `comp.date-picker.modal.scrim.color`, over the whole navigator and
///   makes everything behind the picker inert; the picker keeps Tab inside itself (DTP-1);
/// * the picker holds a pending choice, starting as [value] (single [mode]) or [start] and [end]
///   (range [mode]); OK commits it: [onChanged] is called with it when it differs from what the
///   picker opened with, then [onClose] with `confirm` (DTP-6). Cancel, Escape, the platform's back
///   and a press on the scrim close it without committing, [onClose] carrying the reason (DTP-5);
///   the picker closes itself;
/// * [firstDate], [lastDate], [disabledDates] and [isDateDisabled] make days unavailable (DTP-29);
///   [currentDate] is the day drawn as today (the device's date when null); [firstDayOfWeek] and
///   [locale] choose the first column and the locale data (DTP-37); [entryMode] and [startView]
///   the entry and the view it opens on; [labels] its words;
/// * focus moves to the active day (or the displayed year, or the first field) when it opens, and
///   back to where it was when it closes (DTP-3, DTP-4).
///
/// While it is shown the route counts as a Tanrei modal overlay (`TanreiModalOverlays`).
Future<TanreiDateSelection?> showTanreiDatePicker({
  required BuildContext context,
  TanreiDatePickerMode mode = TanreiDatePickerMode.single,
  DateTime? value,
  DateTime? start,
  DateTime? end,
  DateTime? firstDate,
  DateTime? lastDate,
  List<DateTime> disabledDates = const <DateTime>[],
  bool Function(DateTime date)? isDateDisabled,
  DateTime? currentDate,
  TanreiDatePickerFirstDayOfWeek firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.locale,
  Locale? locale,
  TanreiDatePickerEntryMode entryMode = TanreiDatePickerEntryMode.calendar,
  TanreiDatePickerStartView startView = TanreiDatePickerStartView.day,
  TanreiDatePickerLabels labels = const TanreiDatePickerLabels(),
  ValueChanged<TanreiDateSelection>? onChanged,
  ValueChanged<TanreiDatePickerCloseReason>? onClose,
  bool useRootNavigator = true,
  RouteSettings? routeSettings,
}) {
  final NavigatorState navigator = Navigator.of(context, rootNavigator: useRootNavigator);
  final bool disable = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  final TanreiDatePickerTokens tokens = TanreiTheme.of(context).system.datePicker;
  // DTP-22: Android's reduced-motion setting removes every animation.
  final bool atOnce = disable && defaultTargetPlatform == TargetPlatform.android;
  return navigator.push<TanreiDateSelection?>(
    _DatePickerRoute(
      props: _PickerProps(
        presentation: TanreiDatePickerPresentation.modal,
        mode: mode,
        value: value,
        start: start,
        end: end,
        firstDate: firstDate,
        lastDate: lastDate,
        disabledDates: disabledDates,
        isDateDisabled: isDateDisabled,
        currentDate: currentDate,
        firstDayOfWeek: firstDayOfWeek,
        locale: locale,
        entryMode: entryMode,
        startView: startView,
        labels: labels,
      ),
      onChanged: onChanged,
      onClose: onClose,
      settings: routeSettings,
      enter: atOnce ? Duration.zero : tanreiDuration(tokens.modalMotionOpenDuration),
      exit: atOnce ? Duration.zero : tanreiDuration(tokens.modalMotionCloseDuration),
      grows: !disable,
    ),
  );
}

class _DatePickerRoute extends PopupRoute<TanreiDateSelection?> {
  _DatePickerRoute({
    required this.props,
    required this.onChanged,
    required this.onClose,
    required this.enter,
    required this.exit,
    required this.grows,
    super.settings,
  });

  final _PickerProps props;
  final ValueChanged<TanreiDateSelection>? onChanged;
  final ValueChanged<TanreiDatePickerCloseReason>? onClose;
  final Duration enter;
  final Duration exit;

  /// Whether the picker grows as it enters (false where motion is reduced: DTP-22).
  final bool grows;

  bool _counted = false;

  // The scrim takes its own presses (reason `outside`); the barrier only blocks.
  @override
  bool get barrierDismissible => false;

  @override
  Color? get barrierColor => null;

  @override
  String? get barrierLabel => null;

  @override
  Duration get transitionDuration => enter;

  @override
  Duration get reverseTransitionDuration => exit;

  @override
  void install() {
    super.install();
    _counted = true;
    TanreiModalOverlays.instance.add();
  }

  void _uncount() {
    if (_counted) {
      _counted = false;
      TanreiModalOverlays.instance.remove();
    }
  }

  @override
  bool didPop(TanreiDateSelection? result) {
    _uncount();
    return super.didPop(result);
  }

  @override
  void dispose() {
    _uncount();
    super.dispose();
  }

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => _ModalPickerPage(route: this);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    return _ModalTransition(
      animation: animation,
      enter: tokens.modalMotionOpenEasing.toCurve(),
      exit: tokens.modalMotionCloseEasing.toCurve(),
      enterScale: grows ? tokens.modalMotionEnterScale : 1,
      scrim: theme.paint(tokens.modalScrimColor),
      child: child,
    );
  }
}

/// DTP-1, DTP-22: the scrim over the whole route and the picker above it, faded in (the picker
/// growing about its centre) and both faded out, with the open and close easings.
class _ModalTransition extends StatefulWidget {
  const _ModalTransition({
    required this.animation,
    required this.enter,
    required this.exit,
    required this.enterScale,
    required this.scrim,
    required this.child,
  });

  final Animation<double> animation;
  final Curve enter;
  final Curve exit;
  final double enterScale;
  final Color scrim;
  final Widget child;

  @override
  State<_ModalTransition> createState() => _ModalTransitionState();
}

class _ModalTransitionState extends State<_ModalTransition> {
  late final CurvedAnimation _curve = CurvedAnimation(
    parent: widget.animation,
    curve: widget.enter,
    // The close runs the parent from 1 to 0: flipped, the close easing eases the close's own
    // progress.
    reverseCurve: widget.exit.flipped,
  );

  @override
  void dispose() {
    _curve.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: <Widget>[
      IgnorePointer(
        child: FadeTransition(
          opacity: _curve,
          child: ColoredBox(color: widget.scrim),
        ),
      ),
      AnimatedBuilder(
        animation: _curve,
        builder: (BuildContext context, Widget? child) {
          // It grows only while it opens; it closes by fading alone.
          final bool closing = widget.animation.status == AnimationStatus.reverse;
          final double scale = closing
              ? 1
              : lerpDouble(widget.enterScale, 1, _curve.value.clamp(0, 1))!;
          return Opacity(
            opacity: _curve.value.clamp(0, 1),
            child: Transform.scale(scale: scale, child: child),
          );
        },
        child: widget.child,
      ),
    ],
  );
}

/// The route's page: a press on the scrim closes (reason `outside`), the platform's back closes
/// (reason `back`), and the picker centred in the safe area, the margin from every edge and from
/// the keyboard (DTP-1).
class _ModalPickerPage extends StatefulWidget {
  const _ModalPickerPage({required this.route});

  final _DatePickerRoute route;

  @override
  State<_ModalPickerPage> createState() => _ModalPickerPageState();
}

class _ModalPickerPageState extends State<_ModalPickerPage> {
  bool _closed = false;
  TanreiDateSelection? _confirmed;

  void _close(TanreiDatePickerCloseReason reason) {
    if (_closed) {
      return;
    }
    _closed = true;
    widget.route.onClose?.call(reason);
    final TanreiDateSelection? result = reason == TanreiDatePickerCloseReason.confirm
        ? _confirmed
        : null;
    final NavigatorState? navigator = widget.route.navigator;
    if (navigator == null) {
      return;
    }
    if (widget.route.isCurrent) {
      navigator.pop(result);
    } else {
      navigator.removeRoute(widget.route, result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final TanreiDatePickerTokens tokens = TanreiTheme.of(context).system.datePicker;
    final EdgeInsets safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final EdgeInsets keyboard = MediaQuery.maybeViewInsetsOf(context) ?? EdgeInsets.zero;
    final double margin = tokens.modalContainerMargin;
    final double side = _modalSideMargin(context);
    return PopScope<Object?>(
      canPop: false,
      // DTP-5: the platform's back closes the picker, and goes no further.
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          _close(TanreiDatePickerCloseReason.back);
        }
      },
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          // DTP-5: a press on the scrim closes the picker without committing.
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            excludeFromSemantics: true,
            onTap: () => _close(TanreiDatePickerCloseReason.outside),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              safe.left + side,
              safe.top + margin,
              safe.right + side,
              math.max(safe.bottom, keyboard.bottom) + margin,
            ),
            child: Center(
              child: _withLocale(
                context,
                widget.route.props.locale,
                _PickerSurface(
                  props: widget.route.props,
                  owner: widget,
                  takeFocus: true,
                  onChanged: widget.route.onChanged,
                  onConfirmed: (TanreiDateSelection selection) => _confirmed = selection,
                  onClose: _close,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Docked: TanreiDatePickerAnchor

/// A docked date picker — the spec's `presentation: docked` — anchored to what [builder] or
/// [child] builds (usually the product's text field with a calendar button), in the idiom of the
/// menu's anchor.
///
/// * [controller] is the spec's `open` (`TanreiDatePickerController.open()` / `.close()`);
/// * the surface goes `comp.date-picker.docked.offset` below the anchor with the start edges
///   aligned, flips above it when the space below is too small and the space above larger, shifts
///   to stay `docked.viewport-margin` inside the viewport, limits its height to the room and
///   scrolls, and follows the anchor (DTP-2);
/// * choosing a day that completes a choice calls [onChanged] with it when it differs from [value]
///   (or [start] and [end]) and then [onClose] with `select`; choosing a range's start calls
///   nothing (DTP-7). Escape, the platform's back, a press outside the picker and its anchor, Tab
///   out of it and focus leaving it close it without committing, [onClose] carrying the reason
///   (DTP-5). The picker then closes itself through the controller;
/// * the other props are those of [showTanreiDatePicker]. A docked picker has the calendar only
///   (DTP-28).
///
/// The surface is shown in the nearest `Overlay`. It is an operated overlay that is not modal:
/// opening moves focus to the active day, closing returns it to the anchor (the
/// [childFocusNode], else the first focusable node in the anchor); it traps nothing, makes nothing
/// inert and draws no scrim. A press outside also reaches what is under it, as the menu's does.
class TanreiDatePickerAnchor extends StatefulWidget {
  /// Creates a docked picker anchored to what [builder] or [child] builds.
  const TanreiDatePickerAnchor({
    super.key,
    required this.controller,
    this.mode = TanreiDatePickerMode.single,
    this.value,
    this.start,
    this.end,
    this.firstDate,
    this.lastDate,
    this.disabledDates = const <DateTime>[],
    this.isDateDisabled,
    this.currentDate,
    this.firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.locale,
    this.locale,
    this.entryMode = TanreiDatePickerEntryMode.calendar,
    this.startView = TanreiDatePickerStartView.day,
    this.labels = const TanreiDatePickerLabels(),
    this.onChanged,
    this.onClose,
    this.builder,
    this.child,
    this.childFocusNode,
  });

  /// Opens and closes the picker.
  final TanreiDatePickerController controller;

  /// One date or one range.
  final TanreiDatePickerMode mode;

  /// The chosen date in single mode.
  final DateTime? value;

  /// The first date of the chosen range in range mode.
  final DateTime? start;

  /// The last date of the chosen range in range mode.
  final DateTime? end;

  /// The earliest date that can be chosen (the spec's `min`).
  final DateTime? firstDate;

  /// The latest date that can be chosen (the spec's `max`).
  final DateTime? lastDate;

  /// Dates that cannot be chosen.
  final List<DateTime> disabledDates;

  /// Whether a date cannot be chosen, for a rule no list can hold.
  final bool Function(DateTime date)? isDateDisabled;

  /// The date drawn as today (the spec's `today`); null reads the device's date when it opens.
  final DateTime? currentDate;

  /// The weekday in the first column.
  final TanreiDatePickerFirstDayOfWeek firstDayOfWeek;

  /// The locale of the names, digits and forms; null uses the ambient one.
  final Locale? locale;

  /// A docked picker has the calendar only: `text` is reported in debug builds (DTP-28).
  final TanreiDatePickerEntryMode entryMode;

  /// The view the calendar opens on.
  final TanreiDatePickerStartView startView;

  /// The picker's words.
  final TanreiDatePickerLabels labels;

  /// The spec's `change`: the new choice, before [onClose].
  final ValueChanged<TanreiDateSelection>? onChanged;

  /// The spec's `close`, with its reason; the picker then closes itself.
  final ValueChanged<TanreiDatePickerCloseReason>? onClose;

  /// Builds the anchor.
  final TanreiDatePickerAnchorBuilder? builder;

  /// The anchor, or what [builder] receives.
  final Widget? child;

  /// The node focus returns to when the picker closes (else the first focusable node in the
  /// anchor).
  final FocusNode? childFocusNode;

  _PickerProps get _props => _PickerProps(
    presentation: TanreiDatePickerPresentation.docked,
    mode: mode,
    value: value,
    start: start,
    end: end,
    firstDate: firstDate,
    lastDate: lastDate,
    disabledDates: disabledDates,
    isDateDisabled: isDateDisabled,
    currentDate: currentDate,
    firstDayOfWeek: firstDayOfWeek,
    locale: locale,
    entryMode: entryMode,
    startView: startView,
    labels: labels,
  );

  @override
  State<TanreiDatePickerAnchor> createState() => _TanreiDatePickerAnchorState();
}

/// Stops the enclosing route from popping while the picker is open: the platform's back closes the
/// picker instead (DTP-5).
class _PickerPopEntry extends PopEntry<Object?> {
  _PickerPopEntry(this.onBack);

  final VoidCallback onBack;
  final ValueNotifier<bool> _canPop = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get canPopNotifier => _canPop;

  @override
  void onPopInvokedWithResult(bool didPop, Object? result) {
    if (!didPop) {
      scheduleMicrotask(onBack);
    }
  }

  void dispose() => _canPop.dispose();
}

class _TanreiDatePickerAnchorState extends State<TanreiDatePickerAnchor>
    with SingleTickerProviderStateMixin<TanreiDatePickerAnchor>, WidgetsBindingObserver {
  final OverlayPortalController _overlay = OverlayPortalController(debugLabel: 'TanreiDatePicker');
  final FocusNode _anchorNode = FocusNode(
    debugLabel: 'TanreiDatePicker anchor',
    skipTraversal: true,
    canRequestFocus: false,
  );
  final FocusNode _surfaceNode = FocusNode(
    debugLabel: 'TanreiDatePicker surface',
    skipTraversal: true,
    canRequestFocus: false,
  );
  late final AnimationController _motion = AnimationController(vsync: this);
  late final CurvedAnimation _curve = CurvedAnimation(parent: _motion, curve: Curves.linear);
  late final _PickerPopEntry _popEntry = _PickerPopEntry(
    () => _requestClose(TanreiDatePickerCloseReason.back),
  );
  final List<ScrollPosition> _scrolls = <ScrollPosition>[];
  ModalRoute<Object?>? _route;
  Rect? _anchorRect;

  /// While the surface fades out: it takes no focus and nothing reacts.
  bool _closing = false;
  FocusNode? _returnFocus;
  TanreiDatePickerCloseReason? _reason;
  bool? _tabForward;
  bool _returningFocus = false;
  bool _surfaceHadFocus = false;

  /// Bumped each time the picker opens, so that a new surface starts from the props.
  int _session = 0;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_handleController);
    _motion.addStatusListener(_handleMotionStatus);
    if (widget.controller.isOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.controller.isOpen) {
          _show();
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiDatePickerTokens tokens = TanreiTheme.of(context).system.datePicker;
    _motion
      ..duration = tanreiDuration(tokens.dockedMotionOpenDuration)
      ..reverseDuration = tanreiDuration(tokens.dockedMotionCloseDuration);
    _curve
      ..curve = tokens.dockedMotionOpenEasing.toCurve()
      ..reverseCurve = tokens.dockedMotionCloseEasing.toCurve().flipped;
  }

  @override
  void didUpdateWidget(TanreiDatePickerAnchor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_handleController);
      widget.controller.addListener(_handleController);
      _handleController();
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleController);
    _stopFollowing();
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _popEntry.dispose();
    _curve.dispose();
    _motion.dispose();
    _anchorNode.dispose();
    _surfaceNode.dispose();
    super.dispose();
  }

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _handleController() {
    final bool open = widget.controller.isOpen;
    if (open && (!_overlay.isShowing || _closing)) {
      _show();
    } else if (!open && _overlay.isShowing && !_closing) {
      _hide();
    }
  }

  void _handleMotionStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && _closing) {
      _finishHide();
    }
  }

  /// DTP-2, DTP-3: present the surface (it moves focus to its active day once built).
  void _show() {
    _closing = false;
    _reason = null;
    _session++;
    _surfaceNode.descendantsAreFocusable = true;
    _returnFocus = widget.childFocusNode ?? _anchorFocusable();
    WidgetsBinding.instance.addObserver(this);
    _route = ModalRoute.of(context);
    _route?.registerPopEntry(_popEntry);
    _follow();
    setState(() => _overlay.show());
    // DTP-22: fade in and grow; at once where motion is reduced.
    if (_reduceMotion) {
      _motion.value = _motion.upperBound;
    } else {
      _motion.forward(from: _motion.lowerBound);
    }
  }

  /// DTP-4, DTP-22: take the surface away (fading out, at once where motion is reduced), returning
  /// focus to the anchor when it was inside.
  void _hide() {
    final bool focusInside = _surfaceNode.hasFocus;
    _closing = true;
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _route = null;
    _stopFollowing();
    if (focusInside && _reason != TanreiDatePickerCloseReason.focusOut) {
      _returningFocus = true;
      final FocusNode? anchor = _returnFocus;
      anchor?.requestFocus();
      // DTP-5: Tab and Shift+Tab move on from the anchor as they would have from it.
      if (anchor != null && _tabForward != null) {
        final bool forward = _tabForward!;
        _surfaceNode.descendantsAreFocusable = false;
        if (forward) {
          anchor.nextFocus();
        } else {
          anchor.previousFocus();
        }
      }
    }
    _tabForward = null;
    _surfaceNode.descendantsAreFocusable = false;
    if (_reduceMotion || !_overlay.isShowing) {
      _motion.value = _motion.lowerBound;
      _finishHide();
    } else {
      _motion.reverse();
      setState(() {});
    }
  }

  void _finishHide() {
    _closing = false;
    if (_overlay.isShowing) {
      setState(() => _overlay.hide());
    }
  }

  /// The first focusable node in the anchor.
  FocusNode? _anchorFocusable() {
    final FocusNode? focused = FocusManager.instance.primaryFocus;
    if (focused != null &&
        _anchorNode.descendants.contains(focused) &&
        !_surfaceNode.descendants.contains(focused)) {
      return focused;
    }
    return _anchorNode.descendants
        .where(
          (FocusNode node) =>
              node.canRequestFocus &&
              !node.skipTraversal &&
              node != _surfaceNode &&
              !_surfaceNode.descendants.contains(node),
        )
        .firstOrNull;
  }

  // DTP-2: follow the anchor while an ancestor scrolls.
  void _follow() {
    _stopFollowing();
    ScrollableState? scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      final ScrollPosition position = scrollable.position;
      position.addListener(_anchorMoved);
      _scrolls.add(position);
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
  }

  void _stopFollowing() {
    for (final ScrollPosition position in _scrolls) {
      position.removeListener(_anchorMoved);
    }
    _scrolls.clear();
  }

  void _anchorMoved() {
    if (mounted && _overlay.isShowing) {
      setState(() {});
    }
  }

  @override
  Future<bool> didPopRoute() async {
    // DTP-5: the platform's back closes an open picker, and goes no further.
    if (_overlay.isShowing && !_closing) {
      _requestClose(TanreiDatePickerCloseReason.back);
      return true;
    }
    return false;
  }

  void _requestClose(TanreiDatePickerCloseReason reason) {
    if (!_overlay.isShowing || _closing) {
      return;
    }
    _reason = reason;
    widget.onClose?.call(reason);
    if (widget.controller.isOpen) {
      widget.controller.close();
    } else {
      _hide();
    }
  }

  void _handleTabOut(bool forward) {
    _tabForward = forward;
    _requestClose(TanreiDatePickerCloseReason.tab);
    _tabForward = null;
  }

  void _handleSurfaceFocus(bool focused) {
    if (focused == _surfaceHadFocus) {
      return;
    }
    _surfaceHadFocus = focused;
    if (_returningFocus) {
      _returningFocus = false;
      if (!focused) {
        return;
      }
    }
    // DTP-5: focus leaving the picker some other way closes it.
    if (!focused && _overlay.isShowing && !_closing) {
      _requestClose(TanreiDatePickerCloseReason.focusOut);
    }
  }

  Rect _computeAnchorRect() {
    final RenderBox overlay = Overlay.of(context).context.findRenderObject()! as RenderBox;
    final RenderBox anchor = context.findRenderObject()! as RenderBox;
    return MatrixUtils.transformRect(anchor.getTransformTo(overlay), Offset.zero & anchor.size);
  }

  Widget _buildOverlay(BuildContext overlayContext) {
    final Rect rect = _computeAnchorRect();
    _anchorRect = rect;
    // DTP-2: after this frame, check whether the anchor moved (a layout change); if so, place again.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _overlay.isShowing && _computeAnchorRect() != _anchorRect) {
        setState(() {});
      }
    });
    final TanreiDatePickerTokens tokens = TanreiTheme.of(context).system.datePicker;
    return TapRegion(
      groupId: this,
      // DTP-5: a press outside the picker and its anchor closes it; it also reaches what is under
      // it.
      onTapOutside: (_) => _requestClose(TanreiDatePickerCloseReason.outside),
      child: AnimatedBuilder(
        animation: _curve,
        builder: (BuildContext context, Widget? child) => _DockedPosition(
          anchorRect: rect,
          textDirection: Directionality.of(this.context),
          offset: tokens.dockedOffset,
          margin: tokens.dockedViewportMargin,
          progress: _curve.value,
          closing: _closing,
          child: child,
        ),
        child: IgnorePointer(
          ignoring: _closing,
          child: Focus(
            focusNode: _surfaceNode,
            includeSemantics: false,
            onFocusChange: _handleSurfaceFocus,
            child: _withLocale(
              context,
              widget.locale,
              _PickerSurface(
                key: ValueKey<int>(_session),
                props: widget._props,
                owner: widget,
                takeFocus: true,
                scrolls: true,
                onChanged: widget.onChanged,
                onClose: _requestClose,
                onTabOut: _handleTabOut,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool open = _overlay.isShowing && !_closing;
    final Widget anchor =
        widget.builder?.call(context, widget.controller, widget.child) ??
        widget.child ??
        const SizedBox.shrink();
    return Focus(
      focusNode: _anchorNode,
      includeSemantics: false,
      child: TapRegion(
        groupId: this,
        child: OverlayPortal(
          controller: _overlay,
          overlayChildBuilder: _buildOverlay,
          // DTP-36: the anchor says whether its picker is open (Flutter has no has-popup property).
          child: MergeSemantics(
            child: Semantics(expanded: open, child: anchor),
          ),
        ),
      ),
    );
  }
}

/// Places a docked surface against the anchor (DTP-2) and draws its motion (DTP-22): it fills the
/// overlay, sizes the surface to its natural width within the room, puts it below the anchor — or
/// above when the space below is too small and the space above larger — shifts it to stay [margin]
/// inside, limits its height to the room left, and fades it (growing from the edge that faces the
/// anchor while it opens) as far as [progress].
class _DockedPosition extends SingleChildRenderObjectWidget {
  const _DockedPosition({
    required this.anchorRect,
    required this.textDirection,
    required this.offset,
    required this.margin,
    required this.progress,
    required this.closing,
    super.child,
  });

  final Rect anchorRect;
  final TextDirection textDirection;
  final double offset;
  final double margin;
  final double progress;
  final bool closing;

  @override
  RenderTanreiDatePickerPosition createRenderObject(BuildContext context) =>
      RenderTanreiDatePickerPosition(
        anchorRect: anchorRect,
        textDirection: textDirection,
        offset: offset,
        margin: margin,
        progress: progress,
        closing: closing,
      );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiDatePickerPosition renderObject) {
    renderObject
      ..anchorRect = anchorRect
      ..textDirection = textDirection
      ..offset = offset
      ..margin = margin
      ..progress = progress
      ..closing = closing;
  }
}

/// The render object that places a docked picker's surface; public so that tests can read where it
/// went.
class RenderTanreiDatePickerPosition extends RenderShiftedBox {
  /// Creates the render object.
  RenderTanreiDatePickerPosition({
    required Rect anchorRect,
    required TextDirection textDirection,
    required double offset,
    required double margin,
    required double progress,
    required bool closing,
  }) : _anchorRect = anchorRect,
       _textDirection = textDirection,
       _offset = offset,
       _margin = margin,
       _progress = progress,
       _closing = closing,
       super(null);

  Rect _anchorRect;
  set anchorRect(Rect value) => _relayout(_anchorRect != value, () => _anchorRect = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _relayout(_textDirection != value, () => _textDirection = value);

  double _offset;
  set offset(double value) => _relayout(_offset != value, () => _offset = value);

  double _margin;
  set margin(double value) => _relayout(_margin != value, () => _margin = value);

  /// How far the open or close motion is (0: hidden, 1: whole).
  double get progress => _progress;
  double _progress;
  set progress(double value) {
    if (_progress != value) {
      final bool composited = _progress < 1;
      _progress = value;
      if (composited != (value < 1)) {
        markNeedsCompositingBitsUpdate();
      }
      markNeedsPaint();
    }
  }

  /// Whether the surface is closing: it fades without shrinking (DTP-22).
  bool get closing => _closing;
  bool _closing;
  set closing(bool value) {
    if (_closing != value) {
      _closing = value;
      markNeedsPaint();
    }
  }

  void _relayout(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  /// Whether the surface went above the anchor in the last layout.
  bool get isAbove => _above;
  bool _above = false;

  /// Where the surface went in the last layout, in this box's coordinates.
  Rect get surfaceRect => _surfaceRect;
  Rect _surfaceRect = Rect.zero;

  @override
  bool get alwaysNeedsCompositing => child != null && _progress < 1;

  @override
  void performLayout() {
    size = constraints.biggest;
    final RenderBox? child = this.child;
    if (child == null) {
      return;
    }
    // DTP-2, DTP-38: the natural width within the room, and the height within the room left. In a
    // window too narrow for the surface and its margins, the side margins shrink first.
    final double natural = child.getMaxIntrinsicWidth(double.infinity);
    final double side = ((size.width - natural) / 2).clamp(0, _margin).toDouble();
    final double width = math.min(natural, math.max(0, size.width - 2 * side));
    final double tall = child.getMaxIntrinsicHeight(width);
    final double below = size.height - _margin - (_anchorRect.bottom + _offset);
    final double above = _anchorRect.top - _offset - _margin;
    final bool top = tall > below && above > below;
    final double height = math.min(tall, math.max(0, top ? above : below));
    child.layout(BoxConstraints.tightFor(width: width, height: height), parentUsesSize: true);
    final bool rtl = _textDirection == TextDirection.rtl;
    final double x = (rtl ? _anchorRect.right - width : _anchorRect.left)
        .clamp(side, math.max(side, size.width - side - width))
        .toDouble();
    final double y = top ? _anchorRect.top - _offset - height : _anchorRect.bottom + _offset;
    _above = top;
    _surfaceRect = Rect.fromLTWH(x, y, width, height);
    (child.parentData! as BoxParentData).offset = Offset(x, y);
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    if (child == null || _progress <= 0) {
      return;
    }
    final Offset at = offset + (child.parentData! as BoxParentData).offset;
    if (_progress >= 1) {
      context.paintChild(child, at);
      return;
    }
    // DTP-22: fade, growing from the edge that faces the anchor while it opens.
    final double edge = _above ? at.dy + child.size.height : at.dy;
    final double grow = _closing ? 1 : _progress;
    final Matrix4 transform = Matrix4.identity()
      ..translate(0.0, edge)
      ..scale(1.0, grow)
      ..translate(0.0, -edge);
    context.pushOpacity(
      offset,
      (_progress.clamp(0, 1) * 255).round(),
      (PaintingContext context, Offset _) => context.pushTransform(
        needsCompositing,
        Offset.zero,
        transform,
        (PaintingContext context, Offset _) => context.paintChild(child, at),
      ),
    );
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    if (_progress <= 0) {
      return false;
    }
    return super.hitTestChildren(result, position: position);
  }
}

// ---------------------------------------------------------------------------------------------
// In place: TanreiDatePicker

/// Lets a person choose one date, or one range of dates, from a month calendar or by typing it.
///
/// Implements the surface of `specs/date-picker.spec.json`. Present it with
/// [showTanreiDatePicker] (modal) or [TanreiDatePickerAnchor] (docked); this widget draws the open
/// surface where it is built, at its natural size, without an overlay, scrim, anchor or motion:
/// the fixtures' form (DTP-1's `verify`), for tests, baselines and galleries. It takes no focus on
/// its own; [onChanged] and [onClose] report what would commit and close it.
///
/// The props are those of [showTanreiDatePicker], with [presentation] choosing the surface.
class TanreiDatePicker extends StatelessWidget {
  /// Draws the open picker in place.
  const TanreiDatePicker({
    super.key,
    this.presentation = TanreiDatePickerPresentation.modal,
    this.mode = TanreiDatePickerMode.single,
    this.value,
    this.start,
    this.end,
    this.firstDate,
    this.lastDate,
    this.disabledDates = const <DateTime>[],
    this.isDateDisabled,
    this.currentDate,
    this.firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.locale,
    this.locale,
    this.entryMode = TanreiDatePickerEntryMode.calendar,
    this.startView = TanreiDatePickerStartView.day,
    this.labels = const TanreiDatePickerLabels(),
    this.onChanged,
    this.onClose,
  });

  /// Which surface is drawn: the modal one (header, text entry, Cancel and OK) or the docked one.
  final TanreiDatePickerPresentation presentation;

  /// One date or one range.
  final TanreiDatePickerMode mode;

  /// The chosen date in single mode.
  final DateTime? value;

  /// The first date of the chosen range in range mode.
  final DateTime? start;

  /// The last date of the chosen range in range mode.
  final DateTime? end;

  /// The earliest date that can be chosen (the spec's `min`).
  final DateTime? firstDate;

  /// The latest date that can be chosen (the spec's `max`).
  final DateTime? lastDate;

  /// Dates that cannot be chosen.
  final List<DateTime> disabledDates;

  /// Whether a date cannot be chosen, for a rule no list can hold.
  final bool Function(DateTime date)? isDateDisabled;

  /// The date drawn as today (the spec's `today`); null reads the device's date.
  final DateTime? currentDate;

  /// The weekday in the first column.
  final TanreiDatePickerFirstDayOfWeek firstDayOfWeek;

  /// The locale of the names, digits and forms; null uses the ambient one.
  final Locale? locale;

  /// How a modal picker opens.
  final TanreiDatePickerEntryMode entryMode;

  /// The view the calendar opens on.
  final TanreiDatePickerStartView startView;

  /// The picker's words.
  final TanreiDatePickerLabels labels;

  /// The spec's `change`.
  final ValueChanged<TanreiDateSelection>? onChanged;

  /// The spec's `close`, with its reason.
  final ValueChanged<TanreiDatePickerCloseReason>? onClose;

  /// Reads an ISO 8601 calendar date ("2026-09-17") as the local midnight of that day, for a date
  /// that arrives as text (a fixture, a server-driven screen). Text that is not one — a time, a
  /// zone, a day that does not exist — is null, and is reported in debug builds (DTP-40); empty
  /// text is null and reported by nothing.
  static DateTime? parseDate(String text) {
    if (text.isEmpty) {
      return null;
    }
    final DateTime? date = _parseIso(text);
    if (date == null) {
      assert(() {
        debugTanreiReportUnknownValue('date-picker date', text, 'no date');
        return true;
      }());
    }
    return date;
  }

  @override
  Widget build(BuildContext context) => _withLocale(
    context,
    locale,
    _PickerSurface(
      props: _PickerProps(
        presentation: presentation,
        mode: mode,
        value: value,
        start: start,
        end: end,
        firstDate: firstDate,
        lastDate: lastDate,
        disabledDates: disabledDates,
        isDateDisabled: isDateDisabled,
        currentDate: currentDate,
        firstDayOfWeek: firstDayOfWeek,
        locale: locale,
        entryMode: entryMode,
        startView: startView,
        labels: labels,
      ),
      owner: this,
      takeFocus: false,
      onChanged: onChanged,
      onClose: onClose,
    ),
  );

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiDatePickerPresentation>('presentation', presentation))
      ..add(EnumProperty<TanreiDatePickerMode>('mode', mode))
      ..add(StringProperty('label', labels.label));
  }
}

// ---------------------------------------------------------------------------------------------
// The surface: header, calendar or text entry, actions.

/// The views of the calendar.
enum _View { day, year }

/// A text field of text entry.
enum _Field { date, start, end }

/// What is wrong with a field's committed text (DTP-26).
enum _FieldError { invalid, unavailable }

/// The props read once per change: bounds, the committed choice, the unavailable days (DTP-29,
/// DTP-40).
class _Values {
  _Values({
    required this.mode,
    required this.min,
    required this.max,
    required this.value,
    required this.start,
    required this.end,
    required this.disabled,
    required this.predicate,
  });

  final TanreiDatePickerMode mode;
  final DateTime? min;
  final DateTime? max;
  final DateTime? value;
  final DateTime? start;
  final DateTime? end;
  final Set<DateTime> disabled;
  final bool Function(DateTime date)? predicate;

  /// DTP-29: before the first date, after the last, listed, or named by the predicate.
  bool unavailable(DateTime day) =>
      (min != null && day.isBefore(min!)) ||
      (max != null && day.isAfter(max!)) ||
      disabled.contains(day) ||
      (predicate?.call(_local(day)) ?? false);

  TanreiDateSelection get committed => mode == TanreiDatePickerMode.single
      ? TanreiDateSelection(value: value == null ? null : _local(value!))
      : TanreiDateSelection(
          start: start == null ? null : _local(start!),
          end: end == null ? null : _local(end!),
        );
}

class _PickerSurface extends StatefulWidget {
  const _PickerSurface({
    super.key,
    required this.props,
    required this.owner,
    required this.takeFocus,
    this.scrolls = false,
    this.onChanged,
    this.onClose,
    this.onConfirmed,
    this.onTabOut,
  });

  final _PickerProps props;

  /// The widget the product built, for reports.
  final Widget owner;

  /// Whether the surface moves focus in when it is first built (DTP-3): false in place.
  final bool takeFocus;

  /// Whether the whole surface scrolls when its box is lower than its content (docked, DTP-38).
  final bool scrolls;

  final ValueChanged<TanreiDateSelection>? onChanged;
  final ValueChanged<TanreiDatePickerCloseReason>? onClose;

  /// The pending choice OK commits, before [onClose] with `confirm`.
  final ValueChanged<TanreiDateSelection>? onConfirmed;

  /// Tab or Shift+Tab out of a docked surface (null: Tab wraps inside, as in a modal one).
  final ValueChanged<bool>? onTabOut;

  @override
  State<_PickerSurface> createState() => _PickerSurfaceState();
}

class _PickerSurfaceState extends State<_PickerSurface> with TickerProviderStateMixin {
  late _Values _values;
  late DateTime _today;

  // The pending choice (DTP-6): what the calendar, the header and the fields show.
  DateTime? _pendingValue;
  DateTime? _pendingStart;
  DateTime? _pendingEnd;

  late DateTime _month;
  late DateTime _active;
  late _View _view;
  late TanreiDatePickerEntryMode _entry;
  late int _focusedYear;

  // DTP-21: the page slide and the view cross-fade.
  late final AnimationController _paging = AnimationController(vsync: this, value: 1);
  late final AnimationController _fading = AnimationController(vsync: this, value: 1);
  DateTime? _pageFrom;
  int _pageDirection = 1;
  _View? _fadeFrom;

  // DTP-15: the view toggle's chevron, turned half a turn in the year view.
  late final AnimationController _turn = AnimationController(vsync: this);

  /// One node per day number: the day of the shown month with that number takes it.
  final List<FocusNode> _dayNodes = List<FocusNode>.generate(
    31,
    (int i) => FocusNode(debugLabel: 'TanreiDatePicker day ${i + 1}'),
  );
  final Map<int, FocusNode> _yearNodes = <int, FocusNode>{};
  final FocusNode _viewToggleNode = FocusNode(debugLabel: 'TanreiDatePicker view toggle');
  final FocusNode _previousNode = FocusNode(debugLabel: 'TanreiDatePicker previous');
  final FocusNode _nextNode = FocusNode(debugLabel: 'TanreiDatePicker next');
  final FocusNode _entryNode = FocusNode(debugLabel: 'TanreiDatePicker entry mode');
  final FocusNode _cancelNode = FocusNode(debugLabel: 'TanreiDatePicker cancel');
  final FocusNode _okNode = FocusNode(debugLabel: 'TanreiDatePicker OK');
  final Map<_Field, FocusNode> _fieldNodes = <_Field, FocusNode>{
    for (final _Field field in _Field.values)
      field: FocusNode(debugLabel: 'TanreiDatePicker ${field.name} field'),
  };
  final Map<_Field, TextEditingController> _fieldText = <_Field, TextEditingController>{
    for (final _Field field in _Field.values) field: TextEditingController(),
  };
  final Map<_Field, _FieldError> _fieldErrors = <_Field, _FieldError>{};
  ScrollController? _yearScroll;
  final List<ScrollController> _retiredScrolls = <ScrollController>[];
  final ScrollController _bodyScroll = ScrollController();

  /// DTP-38: the header and the actions leave the calendar no room — everything scrolls.
  bool _whole = false;
  Size? _window;
  double? _textScale;

  /// What was reported, so that a report is made once per element (DTP-40).
  final Set<String> _reported = <String>{};

  TanreiDatePickerTokens get _tokens => TanreiTheme.of(context).system.datePicker;
  _PickerProps get _props => widget.props;
  bool get _modal => _props.presentation == TanreiDatePickerPresentation.modal;
  bool get _range => _values.mode == TanreiDatePickerMode.range;
  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  @override
  void initState() {
    super.initState();
    _values = _read(_props);
    // DTP-37: today is read when the picker opens.
    _today = _day(_props.currentDate ?? DateTime.now());
    _resetPending();
    _entry = _modal ? _props.entryMode : TanreiDatePickerEntryMode.calendar;
    _debugReportEntry();
    _debugReportLabel(null);
    // DTP-29: the month of the chosen date or start, otherwise of today, within the bounds.
    _month = _openingMonth();
    _active = _activeDayOf(_month);
    _view = _props.startView == TanreiDatePickerStartView.year ? _View.year : _View.day;
    _focusedYear = _month.year;
    _turn.value = _view == _View.year ? 1 : 0;
    if (widget.takeFocus) {
      // DTP-3: focus moves in when the picker opens, not when its motion ends.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _focusCurrent();
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiDatePickerTokens tokens = _tokens;
    _paging.duration = tanreiDuration(tokens.motionPageDuration);
    _fading.duration = tanreiDuration(tokens.motionPageDuration);
    _turn.duration = tanreiDuration(tokens.motionStateDuration);
    // DTP-38: a new window size or text size is measured again from the usual layout.
    final Size? window = MediaQuery.maybeSizeOf(context);
    final double scale = MediaQuery.maybeTextScalerOf(context)?.scale(1) ?? 1;
    if (window != _window || scale != _textScale) {
      _window = window;
      _textScale = scale;
      _whole = false;
    }
    if (!_filled) {
      _filled = true;
      _fillFields();
    }
  }

  @override
  void didUpdateWidget(_PickerSurface oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportLabel(oldWidget.props);
    final _Values values = _read(_props);
    final bool committedChanged = values.committed != _values.committed;
    _values = values;
    // DTP-6: a value the product sets while a modal picker is open does not change its pending
    // choice; a docked picker shows what the product sets.
    if (!_modal && committedChanged) {
      _resetPending();
    }
    if (oldWidget.props.presentation != _props.presentation) {
      _entry = _modal ? _props.entryMode : TanreiDatePickerEntryMode.calendar;
    }
  }

  @override
  void dispose() {
    _paging.dispose();
    _fading.dispose();
    _turn.dispose();
    for (final FocusNode node in <FocusNode>[
      ..._dayNodes,
      ..._yearNodes.values,
      ..._fieldNodes.values,
      _viewToggleNode,
      _previousNode,
      _nextNode,
      _entryNode,
      _cancelNode,
      _okNode,
    ]) {
      node.dispose();
    }
    for (final TextEditingController controller in _fieldText.values) {
      controller.dispose();
    }
    _yearScroll?.dispose();
    for (final ScrollController scroll in _retiredScrolls) {
      scroll.dispose();
    }
    _bodyScroll.dispose();
    super.dispose();
  }

  // --- Reading the props (DTP-40) ---

  void _report(String key, String prop, String why) {
    assert(() {
      if (_reported.add(key)) {
        debugTanreiReportIgnoredValue('date-picker', prop, why, widget.owner);
      }
      return true;
    }());
  }

  _Values _read(_PickerProps props) {
    DateTime? min = _dayOrNull(props.firstDate);
    DateTime? max = _dayOrNull(props.lastDate);
    if (min != null && max != null && min.isAfter(max)) {
      _report(
        'min-max',
        'firstDate',
        'firstDate ${_iso(min)} is after lastDate ${_iso(max)}: both are ignored.',
      );
      min = null;
      max = null;
    }
    DateTime? value = _dayOrNull(props.value);
    DateTime? start = _dayOrNull(props.start);
    DateTime? end = _dayOrNull(props.end);
    if (props.mode == TanreiDatePickerMode.range && value != null) {
      _report('value', 'value', 'A range is start and end: value is ignored in range mode.');
      value = null;
    }
    if (props.mode == TanreiDatePickerMode.single && (start != null || end != null)) {
      _report(
        'start-end',
        'start',
        'A single date is value: start and end are ignored in single mode.',
      );
      start = null;
      end = null;
    }
    if (start != null && end != null && end.isBefore(start)) {
      _report('end', 'end', 'end ${_iso(end)} is before start ${_iso(start)}: it is ignored.');
      end = null;
    }
    if (end != null && start == null) {
      _report('end-alone', 'end', 'end without a start is ignored.');
      end = null;
    }
    return _Values(
      mode: props.mode,
      min: min,
      max: max,
      value: value,
      start: start,
      end: end,
      disabled: <DateTime>{for (final DateTime date in props.disabledDates) _day(date)},
      predicate: props.isDateDisabled,
    );
  }

  void _debugReportEntry() {
    if (!_modal && _props.entryMode == TanreiDatePickerEntryMode.text) {
      _report(
        'entry',
        'entryMode',
        'A docked picker has the calendar only: entryMode text is ignored (DTP-28).',
      );
    }
  }

  /// DTP-40: an empty label is reported — when first built so, and when it loses the one it had.
  void _debugReportLabel(_PickerProps? old) {
    assert(() {
      if ((old == null || tanreiIsAccessibleName(old.labels.label)) &&
          !tanreiIsAccessibleName(_props.labels.label)) {
        debugTanreiReportMissingName('date picker', widget.owner);
      }
      return true;
    }());
  }

  // --- The choice ---

  void _resetPending() {
    _pendingValue = _values.value;
    _pendingStart = _values.start;
    _pendingEnd = _values.end;
  }

  TanreiDateSelection get _pending => _range
      ? TanreiDateSelection(
          start: _pendingStart == null ? null : _local(_pendingStart!),
          end: _pendingEnd == null ? null : _local(_pendingEnd!),
        )
      : TanreiDateSelection(value: _pendingValue == null ? null : _local(_pendingValue!));

  bool get _complete =>
      _range ? _pendingStart != null && _pendingEnd != null : _pendingValue != null;

  /// DTP-6: OK is enabled while the choice is complete and no field holds text that is not an
  /// available date.
  bool get _canConfirm =>
      _complete &&
      (_entry != TanreiDatePickerEntryMode.text ||
          _activeFields.every((_Field field) => !_fieldInvalid(field)));

  DateTime _openingMonth() =>
      _clampMonth(_monthOf(_pendingValue ?? _pendingStart ?? _today), _values.min, _values.max);

  /// DTP-17: the chosen date (or start) when it lies in [month], otherwise today when it does,
  /// otherwise the first available day, otherwise the first day.
  DateTime _activeDayOf(DateTime month) {
    bool inMonth(DateTime? day) =>
        day != null && day.year == month.year && day.month == month.month;
    final DateTime? chosen = _range ? _pendingStart : _pendingValue;
    if (inMonth(chosen)) {
      return chosen!;
    }
    if (inMonth(_today)) {
      return _today;
    }
    for (int d = 1; d <= _daysIn(month); d++) {
      final DateTime day = DateTime.utc(month.year, month.month, d);
      if (!_values.unavailable(day)) {
        return day;
      }
    }
    return month;
  }

  /// DTP-10: selected over in-range over today over unselected.
  TanreiDatePickerCondition _conditionOf(DateTime day) {
    if (_sameDay(day, _pendingValue) ||
        _sameDay(day, _pendingStart) ||
        _sameDay(day, _pendingEnd)) {
      return TanreiDatePickerCondition.selected;
    }
    if (_pendingStart != null &&
        _pendingEnd != null &&
        day.isAfter(_pendingStart!) &&
        day.isBefore(_pendingEnd!)) {
      return TanreiDatePickerCondition.inRange;
    }
    if (_sameDay(day, _today)) {
      return TanreiDatePickerCondition.today;
    }
    return TanreiDatePickerCondition.unselected;
  }

  /// DTP-8, DTP-9, DTP-7: choose an available day.
  void _choose(DateTime day) {
    if (_values.unavailable(day)) {
      return;
    }
    setState(() {
      _active = day;
      if (!_range) {
        _pendingValue = day;
      } else if (_pendingStart == null || _pendingEnd != null || day.isBefore(_pendingStart!)) {
        _pendingStart = day;
        _pendingEnd = null;
      } else {
        _pendingEnd = day;
      }
    });
    if (!_modal && _complete) {
      _commit(TanreiDatePickerCloseReason.select);
    }
  }

  /// DTP-6, DTP-7: change (when the choice differs from the committed one), then close.
  void _commit(TanreiDatePickerCloseReason reason) {
    final TanreiDateSelection selection = _pending;
    if (selection != _values.committed) {
      widget.onChanged?.call(selection);
    }
    widget.onConfirmed?.call(selection);
    widget.onClose?.call(reason);
  }

  void _confirm() {
    if (_canConfirm) {
      _commit(TanreiDatePickerCloseReason.confirm);
    }
  }

  // --- Months and views ---

  /// DTP-21: show [month], sliding the grids unless motion is reduced.
  void _showMonth(DateTime month) {
    if (month == _month) {
      return;
    }
    _pageFrom = _month;
    _pageDirection = month.isAfter(_month) ? 1 : -1;
    _month = month;
    if (_reduceMotion || _view != _View.day) {
      _paging.value = 1;
      _pageFrom = null;
    } else {
      _paging.forward(from: 0).whenCompleteOrCancel(() {
        if (mounted) {
          setState(() => _pageFrom = null);
        }
      });
    }
  }

  void _switchView(_View view) {
    if (view == _view) {
      return;
    }
    _fadeFrom = _view;
    _view = view;
    if (view == _View.year) {
      _focusedYear = _month.year;
      // A new list opens at the displayed year (DTP-16); the old controller may still be attached
      // to the list that fades out.
      if (_yearScroll != null) {
        _retiredScrolls.add(_yearScroll!);
        _yearScroll = null;
      }
    }
    // DTP-15: the chevron turns half a turn in the year view.
    final double turn = view == _View.year ? 1 : 0;
    if (_reduceMotion) {
      _turn.value = turn;
      _fading.value = 1;
      _fadeFrom = null;
    } else {
      _turn.animateTo(turn, curve: _tokens.motionStateEasing.toCurve());
      _fading.forward(from: 0).whenCompleteOrCancel(() {
        if (mounted) {
          setState(() => _fadeFrom = null);
        }
      });
    }
  }

  int get _firstYear => _values.min?.year ?? _firstListedYear;
  int get _lastYear => _values.max?.year ?? _lastListedYear;

  double get _cell =>
      math.max(_tokens.cellSize, TanreiTheme.of(context).system.measure.targetTouch);

  /// DTP-16: the displayed year's row is the third row in view, or as near as the ends allow.
  ScrollController _newYearScroll() {
    final double cell = _cell;
    final int row = (_month.year - _firstYear) ~/ 3;
    final int rows = ((_lastYear - _firstYear) ~/ 3) + 1;
    final double max = math.max(0, rows * cell - 7 * cell);
    return ScrollController(initialScrollOffset: ((row - 2) * cell).clamp(0, max).toDouble());
  }

  void _page(int months) {
    setState(() {
      final DateTime month = _addMonthsTo(_month, months);
      _showMonth(month);
      final int day = math.min(_active.day, _daysIn(month));
      _active = _clampDay(DateTime.utc(month.year, month.month, day), _values.min, _values.max);
    });
    _announceMonth();
  }

  void _toggleView() {
    setState(() => _switchView(_view == _View.day ? _View.year : _View.day));
  }

  /// DTP-16: the day view of the displayed month's number in [year], within the bounds.
  void _chooseYear(int year) {
    setState(() {
      final DateTime month = _clampMonth(
        DateTime.utc(year, _month.month),
        _values.min,
        _values.max,
      );
      _month = month;
      _pageFrom = null;
      _active = _activeDayOf(month);
      _switchView(_View.day);
    });
    _focusLater(() => _dayNodes[_active.day - 1]);
    _announceMonth();
  }

  /// DTP-20: the new month and year, once, politely.
  void _announceMonth() {
    final TanreiDateLocalizations localizations = _localizationsOf(context);
    unawaited(
      SemanticsService.announce(
        localizations.monthYear(_month.year, _month.month),
        Directionality.maybeOf(context) ?? TextDirection.ltr,
      ),
    );
  }

  /// DTP-28: switch between the calendar and text entry, keeping the pending choice.
  void _toggleEntry() {
    setState(() {
      _entry = _entry == TanreiDatePickerEntryMode.calendar
          ? TanreiDatePickerEntryMode.text
          : TanreiDatePickerEntryMode.calendar;
      _pageFrom = null;
      _fadeFrom = null;
      _view = _View.day;
      _turn.value = 0;
      _month = _openingMonth();
      _active = _activeDayOf(_month);
      _fillFields();
      _whole = false;
    });
    _focusLater(_currentFocusTarget);
  }

  // --- Focus ---

  void _focusLater(FocusNode Function() target) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        target().requestFocus();
      }
    });
  }

  /// DTP-3: the active day in the day view, the displayed year in the year view, the first field
  /// in text entry.
  FocusNode _currentFocusTarget() {
    if (_entry == TanreiDatePickerEntryMode.text) {
      return _fieldNodes[_activeFields.first]!;
    }
    if (_view == _View.year) {
      return _yearNode(_focusedYear);
    }
    return _dayNodes[_active.day - 1];
  }

  void _focusCurrent() => _currentFocusTarget().requestFocus();

  FocusNode _yearNode(int year) =>
      _yearNodes.putIfAbsent(year, () => FocusNode(debugLabel: 'TanreiDatePicker year $year'));

  /// The parts Tab moves through, in order (the spec's keyboard table).
  List<FocusNode> _tabOrder() => <FocusNode>[
    if (_modal) _entryNode,
    if (_entry == TanreiDatePickerEntryMode.calendar) ...<FocusNode>[
      _viewToggleNode,
      if (_view == _View.day) ...<FocusNode>[_previousNode, _nextNode, _dayNodes[_active.day - 1]],
      if (_view == _View.year) _yearNode(_focusedYear),
    ] else
      for (final _Field field in _activeFields) _fieldNodes[field]!,
    if (_modal) ...<FocusNode>[_cancelNode, _okNode],
  ].where((FocusNode node) => node.context != null && node.canRequestFocus).toList();

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is KeyUpEvent) {
      return KeyEventResult.ignored;
    }
    final LogicalKeyboardKey key = event.logicalKey;
    final bool shift = HardwareKeyboard.instance.isShiftPressed;
    if (key == LogicalKeyboardKey.escape && event is KeyDownEvent) {
      // DTP-5: Escape closes without committing.
      widget.onClose?.call(TanreiDatePickerCloseReason.escape);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.tab) {
      return _handleTab(forward: !shift);
    }
    final FocusNode? primary = FocusManager.instance.primaryFocus;
    if (primary == null) {
      return KeyEventResult.ignored;
    }
    if (_entry == TanreiDatePickerEntryMode.calendar && _view == _View.day) {
      if (_dayNodes.contains(primary)) {
        return _handleDayKey(key, shift);
      }
    } else if (_entry == TanreiDatePickerEntryMode.calendar && _view == _View.year) {
      if (_yearNodes.values.contains(primary)) {
        return _handleYearKey(key);
      }
    }
    return KeyEventResult.ignored;
  }

  /// The keyboard table: Tab and Shift+Tab move through the parts; a modal picker wraps, a docked
  /// one closes when focus would leave it (DTP-5).
  KeyEventResult _handleTab({required bool forward}) {
    final List<FocusNode> order = _tabOrder();
    if (order.isEmpty) {
      return KeyEventResult.ignored;
    }
    final FocusNode? primary = FocusManager.instance.primaryFocus;
    int index = primary == null ? -1 : order.indexOf(primary);
    if (index < 0 && primary != null && _dayNodes.contains(primary)) {
      index = order.indexOf(_dayNodes[_active.day - 1]);
    }
    final int next = index < 0 ? (forward ? 0 : order.length - 1) : index + (forward ? 1 : -1);
    if (next < 0 || next >= order.length) {
      if (widget.onTabOut != null) {
        widget.onTabOut!(forward);
        return KeyEventResult.handled;
      }
      order[(next + order.length) % order.length].requestFocus();
      return KeyEventResult.handled;
    }
    order[next].requestFocus();
    return KeyEventResult.handled;
  }

  bool get _rtl => Directionality.maybeOf(context) == TextDirection.rtl;

  /// DTP-18: the arrows, Home and End, Page Up and Page Down (with Shift, a year).
  KeyEventResult _handleDayKey(LogicalKeyboardKey key, bool shift) {
    final int forward = _rtl ? -1 : 1;
    final int firstDay = _firstDayOfWeek(context);
    final int column = (_active.weekday - firstDay + 7) % 7;
    final DateTime? target = switch (key) {
      LogicalKeyboardKey.arrowRight => _addDays(_active, forward),
      LogicalKeyboardKey.arrowLeft => _addDays(_active, -forward),
      LogicalKeyboardKey.arrowDown => _addDays(_active, 7),
      LogicalKeyboardKey.arrowUp => _addDays(_active, -7),
      LogicalKeyboardKey.home => _addDays(_active, -column),
      LogicalKeyboardKey.end => _addDays(_active, 6 - column),
      LogicalKeyboardKey.pageDown => _addMonths(_active, shift ? 12 : 1),
      LogicalKeyboardKey.pageUp => _addMonths(_active, shift ? -12 : -1),
      _ => null,
    };
    if (target == null) {
      return KeyEventResult.ignored;
    }
    final DateTime day = _clampDay(target, _values.min, _values.max);
    setState(() {
      _showMonth(_monthOf(day));
      _active = day;
    });
    _focusLater(() => _dayNodes[_active.day - 1]);
    return KeyEventResult.handled;
  }

  /// DTP-19: the arrows by a year or a row, Home and End to the first and last year.
  KeyEventResult _handleYearKey(LogicalKeyboardKey key) {
    final int forward = _rtl ? -1 : 1;
    final int? target = switch (key) {
      LogicalKeyboardKey.arrowRight => _focusedYear + forward,
      LogicalKeyboardKey.arrowLeft => _focusedYear - forward,
      LogicalKeyboardKey.arrowDown => _focusedYear + 3,
      LogicalKeyboardKey.arrowUp => _focusedYear - 3,
      LogicalKeyboardKey.home => _firstYear,
      LogicalKeyboardKey.end => _lastYear,
      _ => null,
    };
    if (target == null) {
      return KeyEventResult.ignored;
    }
    final int year = target.clamp(_firstYear, _lastYear);
    setState(() => _focusedYear = year);
    _scrollYearIntoView(year);
    _focusLater(() => _yearNode(year));
    return KeyEventResult.handled;
  }

  void _scrollYearIntoView(int year) {
    final ScrollController? scroll = _yearScroll;
    if (scroll == null || !scroll.hasClients) {
      return;
    }
    final double cell = _cell;
    final double top = ((year - _firstYear) ~/ 3) * cell;
    final ScrollPosition position = scroll.position;
    if (top < position.pixels) {
      scroll.jumpTo(top);
    } else if (top + cell > position.pixels + position.viewportDimension) {
      scroll.jumpTo(top + cell - position.viewportDimension);
    }
  }

  // --- Text entry (DTP-25 … DTP-27) ---

  List<_Field> get _activeFields =>
      _range ? const <_Field>[_Field.start, _Field.end] : const <_Field>[_Field.date];

  DateTime? _pendingOf(_Field field) => switch (field) {
    _Field.date => _pendingValue,
    _Field.start => _pendingStart,
    _Field.end => _pendingEnd,
  };

  void _setPending(_Field field, DateTime? day) {
    switch (field) {
      case _Field.date:
        _pendingValue = day;
      case _Field.start:
        _pendingStart = day;
        // An end before the new start no longer reads as an available end.
        if (day != null && _pendingEnd != null && _pendingEnd!.isBefore(day)) {
          _pendingEnd = null;
        }
      case _Field.end:
        _pendingEnd = day;
    }
  }

  /// DTP-26: fill each field with its pending date in the locale's numeric form.
  void _fillFields() {
    _fieldErrors.clear();
    final TanreiDateLocalizations localizations = _localizationsOf(context);
    for (final _Field field in _Field.values) {
      final DateTime? day = _pendingOf(field);
      _fieldText[field]!.text = day == null ? '' : localizations.numericDate(day);
    }
  }

  bool _filled = false;

  /// Why [day] cannot be [field]'s date, or null.
  _FieldError? _problemOf(_Field field, DateTime? day) {
    if (day == null) {
      return _FieldError.invalid;
    }
    if (_values.unavailable(day)) {
      return _FieldError.unavailable;
    }
    if (field == _Field.end && _pendingStart != null && day.isBefore(_pendingStart!)) {
      return _FieldError.invalid;
    }
    return null;
  }

  bool _fieldInvalid(_Field field) {
    final String text = _fieldText[field]!.text;
    if (text.trim().isEmpty) {
      return false;
    }
    return _problemOf(field, _parseNumeric(text, _localizationsOf(context))) != null;
  }

  void _handleFieldChanged(_Field field, String text) {
    setState(() {
      // DTP-26: the next edit clears the error; an emptied field clears its date, and text that
      // reads as an available date becomes it.
      _fieldErrors.remove(field);
      if (text.trim().isEmpty) {
        _setPending(field, null);
        return;
      }
      final DateTime? day = _parseNumeric(text, _localizationsOf(context));
      if (_problemOf(field, day) == null) {
        _setPending(field, day);
      }
    });
  }

  void _handleFieldCommitted(_Field field, String text) {
    if (text.trim().isEmpty) {
      return;
    }
    final _FieldError? problem = _problemOf(field, _parseNumeric(text, _localizationsOf(context)));
    if (problem != null) {
      setState(() {
        _fieldErrors[field] = problem;
        _setPending(field, null);
      });
    }
  }

  /// DTP-27: the action key moves to the next field, or activates OK in the last one.
  void _handleFieldSubmitted(_Field field) {
    final List<_Field> fields = _activeFields;
    final int index = fields.indexOf(field);
    if (index + 1 < fields.length) {
      _fieldNodes[fields[index + 1]]!.requestFocus();
    } else {
      _confirm();
    }
  }

  // --- Locale (DTP-37) ---

  Locale _localeOf(BuildContext context) =>
      _props.locale ?? Localizations.maybeLocaleOf(context) ?? const Locale('en', 'US');

  TanreiDateLocalizations _localizationsOf(BuildContext context) =>
      Localizations.of<TanreiDateLocalizations>(context, TanreiDateLocalizations) ??
      TanreiEnglishDateLocalizations.fallbackFor(_localeOf(context));

  int _firstDayOfWeek(BuildContext context) =>
      _props.firstDayOfWeek.weekday ??
      _localizationsOf(context).firstDayOfWeek ??
      tanreiFirstDayOfWeek(_localeOf(context));

  // --- Build ---

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    final TanreiDateLocalizations localizations = _localizationsOf(context);
    final TanreiDatePickerLabels labels = _props.labels;
    final double cell = _cell;
    final double natural = _naturalSurfaceWidth(theme.system);
    // DTP-38: in a window too narrow for the surface, the margins shrink first, then the
    // container's inline padding; below seven minimum targets with neither left, the cells narrow
    // equally so that the grid fits the window. Their height and their numbers stay.
    final Size window = MediaQuery.maybeSizeOf(context) ?? Size.infinite;
    final double outer = _modal
        ? 2 * _modalSideMargin(context) + (MediaQuery.maybePaddingOf(context)?.horizontal ?? 0)
        : 2 * _dockedSideMargin(context);
    final double room = math.max(0, window.width - outer);
    final double width = math.min(natural, room);
    final double gridWidth = 7 * math.min(cell, width / 7);
    final double inset = ((width - gridWidth) / 2).clamp(0, tokens.containerPaddingInline);

    final Widget body = _entry == TanreiDatePickerEntryMode.text && _modal
        ? _buildFields(context, localizations, labels)
        : _buildCalendar(context, localizations, labels, inset: inset, gridWidth: gridWidth);

    final Widget content;
    if (_modal) {
      final Widget header = _buildHeader(context, localizations, labels);
      final Widget divider = SizedBox(
        height: tokens.dividerWidth,
        child: ColoredBox(color: theme.paint(tokens.dividerColor)),
      );
      final Widget actions = _buildActions(labels, tokens);
      content = _whole
          ? _ModalFrame(
              width: width,
              whole: true,
              onNeedsWhole: _handleNeedsWhole,
              middle: SingleChildScrollView(
                controller: _bodyScroll,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[header, divider, body, actions],
                ),
              ),
            )
          : _ModalFrame(
              width: width,
              whole: false,
              onNeedsWhole: _handleNeedsWhole,
              top: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[header, divider],
              ),
              middle: SingleChildScrollView(controller: _bodyScroll, child: body),
              bottom: actions,
            );
    } else {
      final Widget sized = SizedBox(width: width, child: body);
      content = widget.scrolls ? SingleChildScrollView(child: sized) : sized;
    }

    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: _modal ? tokens.modalContainerShape : tokens.dockedContainerShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      _modal ? tokens.modalContainerElevation : tokens.dockedContainerElevation,
      theme.colors,
    );
    final String label = labels.label;
    // DTP-36: a dialog named by label (a modal one scopes and names the route).
    return Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: _modal && widget.takeFocus ? true : null,
      namesRoute: _modal && widget.takeFocus ? true : null,
      role: SemanticsRole.dialog,
      label: tanreiIsAccessibleName(label) ? label : null,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        includeSemantics: false,
        onKeyEvent: _handleKey,
        child: DecoratedBox(
          decoration: TanreiContainerDecoration(
            shape: shape,
            color: theme.paint(_modal ? tokens.modalContainerColor : tokens.dockedContainerColor),
            border: elevation.ring,
            boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
          ),
          child: content,
        ),
      ),
    );
  }

  void _handleNeedsWhole(bool whole) {
    if (mounted && whole != _whole) {
      setState(() => _whole = whole);
    }
  }

  /// DTP-23: the label, the pending choice and the entry-mode toggle.
  Widget _buildHeader(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels,
  ) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    final Color value = theme.paint(tokens.headerValueColor);
    final Color placeholder = theme.paint(tokens.headerPlaceholderColor);
    TextSpan part(String text, {required bool chosen}) => TextSpan(
      text: text,
      style: TextStyle(color: chosen ? value : placeholder),
    );
    final List<TextSpan> spans = _range
        ? <TextSpan>[
            _pendingStart == null
                ? part(labels.startLabel, chosen: false)
                : part(
                    localizations.headerMonthDay(
                      _pendingStart!,
                      withYear: _pendingStart!.year != _today.year,
                    ),
                    chosen: true,
                  ),
            // The dash is drawn in the value's color and style (DTP-23).
            part(' – ', chosen: true),
            _pendingEnd == null
                ? part(labels.endLabel, chosen: false)
                : part(
                    localizations.headerMonthDay(
                      _pendingEnd!,
                      withYear: _pendingEnd!.year != _today.year,
                    ),
                    chosen: true,
                  ),
          ]
        : <TextSpan>[
            _pendingValue == null
                ? part(labels.dateLabel, chosen: false)
                : part(
                    localizations.headerDate(
                      _pendingValue!,
                      withYear: _pendingValue!.year != _today.year,
                    ),
                    chosen: true,
                  ),
          ];
    final bool calendar = _entry == TanreiDatePickerEntryMode.calendar;
    return Padding(
      padding: EdgeInsetsDirectional.fromSTEB(
        tokens.headerPaddingInlineStart,
        tokens.headerPaddingBlock,
        tokens.headerPaddingInlineEnd,
        tokens.headerPaddingBlock,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: tokens.headerGap,
        children: <Widget>[
          // The label names the surface; it is not read twice.
          ExcludeSemantics(
            child: Text(
              labels.label,
              style: theme.textStyle(
                tokens.headerLabelTypescale,
                color: theme.paint(tokens.headerLabelColor),
              ),
            ),
          ),
          Row(
            children: <Widget>[
              Expanded(
                child: Text.rich(
                  TextSpan(children: spans),
                  key: const ValueKey<String>('tanrei-date-picker-header-value'),
                  style: theme.textStyle(tokens.headerValueTypescale, color: value),
                  softWrap: true,
                ),
              ),
              TanreiIconButton(
                focusNode: _entryNode,
                onPressed: _toggleEntry,
                icon: Text(calendar ? _keyboardGlyph : _calendarMonthGlyph),
                semanticLabel: calendar ? labels.textEntryLabel : labels.calendarEntryLabel,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// DTP-24: Cancel and OK, text Buttons at the end.
  Widget _buildActions(TanreiDatePickerLabels labels, TanreiDatePickerTokens tokens) => Padding(
    padding: EdgeInsets.symmetric(
      horizontal: tokens.containerPaddingInline,
      vertical: tokens.actionsPaddingBlock,
    ),
    child: OverflowBar(
      spacing: tokens.actionsGap,
      overflowSpacing: tokens.actionsGap,
      alignment: MainAxisAlignment.end,
      overflowAlignment: OverflowBarAlignment.end,
      children: <Widget>[
        TanreiButton(
          focusNode: _cancelNode,
          variant: TanreiButtonVariant.text,
          onPressed: () => widget.onClose?.call(TanreiDatePickerCloseReason.cancel),
          child: Text(labels.cancelLabel),
        ),
        TanreiButton(
          focusNode: _okNode,
          variant: TanreiButtonVariant.text,
          onPressed: _canConfirm ? _confirm : null,
          child: Text(labels.confirmLabel),
        ),
      ],
    ),
  );

  /// DTP-25: the text fields of text entry.
  Widget _buildFields(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels,
  ) {
    final TanreiDatePickerTokens tokens = _tokens;
    Widget field(_Field field, String label) {
      final _FieldError? error = _fieldErrors[field];
      return TanreiTextField(
        key: ValueKey<_Field>(field),
        controller: _fieldText[field],
        focusNode: _fieldNodes[field],
        labelText: label,
        hintText: localizations.numericDatePattern,
        isError: error != null,
        errorText: switch (error) {
          _FieldError.invalid => labels.invalidText,
          _FieldError.unavailable => labels.unavailableText,
          null => '',
        },
        onChanged: (String text) => _handleFieldChanged(field, text),
        onCommit: (String text) => _handleFieldCommitted(field, text),
        onSubmitted: (_) => _handleFieldSubmitted(field),
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: tokens.inputPaddingInline,
        vertical: tokens.inputPaddingBlock,
      ),
      child: _range
          // DTP-25: equally wide, and equally tall with their containers level when one label
          // wraps and the other does not (TXF-13): each field makes room for the other's label.
          ? TanreiFieldLabelRoom(
              labels: <String>[labels.startLabel, labels.endLabel],
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: tokens.inputGap,
                children: <Widget>[
                  Expanded(child: field(_Field.start, labels.startLabel)),
                  Expanded(child: field(_Field.end, labels.endLabel)),
                ],
              ),
            )
          : field(_Field.date, labels.dateLabel),
    );
  }

  /// DTP-11, DTP-14 … DTP-16, DTP-21: the navigation row and the day or year view.
  Widget _buildCalendar(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels, {
    required double inset,
    required double gridWidth,
  }) {
    final TanreiDatePickerTokens tokens = _tokens;
    final double cell = _cell;
    final bool rtl = _rtl;
    final bool yearView = _view == _View.year;
    final bool atFirst = _values.min != null && !_month.isAfter(_monthOf(_values.min!));
    final bool atLast = _values.max != null && !_month.isBefore(_monthOf(_values.max!));

    final Widget navigation = ConstrainedBox(
      constraints: BoxConstraints(minHeight: tokens.cellSize),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: _ViewToggle(
                focusNode: _viewToggleNode,
                text: localizations.monthYear(_month.year, _month.month),
                description: labels.yearViewLabel,
                expanded: yearView,
                turn: _turn,
                onPressed: _toggleView,
              ),
            ),
          ),
          if (!yearView)
            Row(
              mainAxisSize: MainAxisSize.min,
              spacing: tokens.navigationGap,
              children: <Widget>[
                // DTP-14: the glyphs point toward the start and the end: swapped right to left.
                TanreiIconButton(
                  focusNode: _previousNode,
                  onPressed: atFirst ? null : () => _page(-1),
                  icon: Text(rtl ? _chevronRightGlyph : _chevronLeftGlyph),
                  semanticLabel: labels.previousMonthLabel,
                ),
                TanreiIconButton(
                  focusNode: _nextNode,
                  onPressed: atLast ? null : () => _page(1),
                  icon: Text(rtl ? _chevronLeftGlyph : _chevronRightGlyph),
                  semanticLabel: labels.nextMonthLabel,
                ),
              ],
            ),
        ],
      ),
    );

    Widget viewOf(_View view, {required bool interactive}) => view == _View.year
        ? _buildYears(context, localizations, labels, cell: cell, gridWidth: gridWidth)
        : _buildDays(
            context,
            localizations,
            labels,
            cell: cell,
            gridWidth: gridWidth,
            interactive: interactive,
          );

    Widget views = viewOf(_view, interactive: true);
    final _View? fadeFrom = _fadeFrom;
    if (fadeFrom != null) {
      // DTP-21: the views cross-fade.
      views = Stack(
        children: <Widget>[
          _inert(
            FadeTransition(
              opacity: ReverseAnimation(_curved(_fading)),
              child: viewOf(fadeFrom, interactive: false),
            ),
          ),
          FadeTransition(opacity: _curved(_fading), child: views),
        ],
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: inset, vertical: tokens.containerPaddingBlock),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          navigation,
          // DTP-38: the grid is as wide as its cells, which narrow in the narrowest windows.
          Align(
            alignment: AlignmentDirectional.topStart,
            widthFactor: 1,
            child: SizedBox(width: gridWidth, child: views),
          ),
        ],
      ),
    );
  }

  Animation<double> _curved(AnimationController controller) =>
      CurvedAnimation(parent: controller, curve: _tokens.motionPageEasing.toCurve());

  static Widget _inert(Widget child) => IgnorePointer(
    child: ExcludeFocus(child: ExcludeSemantics(child: child)),
  );

  /// DTP-11, DTP-13, DTP-36: the weekday row and six rows of days, the rows sliding when the month
  /// changes (DTP-21).
  Widget _buildDays(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels, {
    required double cell,
    required double gridWidth,
    required bool interactive,
  }) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    final int firstDay = _firstDayOfWeek(context);
    // DTP-38: a column's width; narrower than the minimum target only in the narrowest windows.
    final double cellWidth = gridWidth / 7;
    final TextStyle weekdayStyle = theme.textStyle(
      tokens.weekdayTypescale,
      color: theme.paint(tokens.weekdayColor),
    );
    final Widget weekdays = Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.row,
      child: Row(
        children: <Widget>[
          for (int column = 0; column < 7; column++)
            Semantics(
              container: true,
              role: SemanticsRole.columnHeader,
              label: localizations.weekday((firstDay - 1 + column) % 7 + 1),
              child: ExcludeSemantics(
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minWidth: cellWidth,
                    maxWidth: cellWidth,
                    minHeight: cell,
                  ),
                  child: Center(
                    child: Text(
                      localizations.narrowWeekday((firstDay - 1 + column) % 7 + 1),
                      style: weekdayStyle,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
    Widget grid = _buildRows(
      context,
      localizations,
      labels,
      month: _month,
      firstDay: firstDay,
      cell: cell,
      cellWidth: cellWidth,
      interactive: interactive,
    );
    final DateTime? from = _pageFrom;
    if (interactive && from != null) {
      // DTP-21: a later month comes in from the end and the old one leaves toward the start.
      final double end = _pageDirection * (_rtl ? -1.0 : 1.0);
      final Animation<double> progress = _curved(_paging);
      grid = Stack(
        children: <Widget>[
          AnimatedBuilder(
            animation: progress,
            builder: (BuildContext context, Widget? child) => FractionalTranslation(
              translation: Offset(end * (1 - progress.value), 0),
              child: child,
            ),
            child: grid,
          ),
          Positioned.fill(
            child: _inert(
              AnimatedBuilder(
                animation: progress,
                builder: (BuildContext context, Widget? child) => FractionalTranslation(
                  translation: Offset(-end * progress.value, 0),
                  child: child,
                ),
                child: OverflowBox(
                  alignment: AlignmentDirectional.topStart,
                  maxHeight: double.infinity,
                  child: _buildRows(
                    context,
                    localizations,
                    labels,
                    month: from,
                    firstDay: firstDay,
                    cell: cell,
                    cellWidth: cellWidth,
                    interactive: false,
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.table,
      label: localizations.monthYear(_month.year, _month.month),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          weekdays,
          ClipRect(child: grid),
        ],
      ),
    );
  }

  Widget _buildRows(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels, {
    required DateTime month,
    required int firstDay,
    required double cell,
    required double cellWidth,
    required bool interactive,
  }) {
    final int lead = (DateTime.utc(month.year, month.month).weekday - firstDay + 7) % 7;
    final int length = _daysIn(month);
    final bool ranged =
        _pendingStart != null && _pendingEnd != null && _pendingStart != _pendingEnd;
    final List<Widget> rows = <Widget>[];
    for (int row = 0; row < 6; row++) {
      final List<Widget> cells = <Widget>[];
      bool any = false;
      for (int column = 0; column < 7; column++) {
        final int number = row * 7 + column - lead + 1;
        if (number < 1 || number > length) {
          cells.add(SizedBox(width: cellWidth, height: cell));
          continue;
        }
        any = true;
        final DateTime day = DateTime.utc(month.year, month.month, number);
        final bool unavailable = _values.unavailable(day);
        final bool isStart = _sameDay(day, _pendingStart);
        final bool isEnd = _sameDay(day, _pendingEnd);
        final bool inSpan =
            _pendingStart != null &&
            _pendingEnd != null &&
            !day.isBefore(_pendingStart!) &&
            !day.isAfter(_pendingEnd!);
        final bool today = _sameDay(day, _today);
        final String name = today
            ? '${localizations.fullDate(_local(day))}, ${labels.todayLabel}'
            : localizations.fullDate(_local(day));
        final bool active = interactive && day == _active;
        final FocusNode? node = interactive ? _dayNodes[number - 1] : null;
        node?.skipTraversal = !active;
        cells.add(
          Semantics(
            container: true,
            explicitChildNodes: true,
            role: SemanticsRole.cell,
            child: TanreiDatePickerDay._(
              key: ValueKey<DateTime>(day),
              date: _local(day),
              disabled: unavailable,
              condition: _conditionOf(day),
              band: ranged && isStart
                  ? _Band.towardEnd
                  : ranged && isEnd
                  ? _Band.towardStart
                  : _Band.none,
              selected: _sameDay(day, _pendingValue) || inSpan || isStart,
              semanticLabel: name,
              semanticHint: isStart
                  ? labels.startLabel
                  : isEnd
                  ? labels.endLabel
                  : null,
              number: localizations.formatNumber(number),
              cell: cell,
              cellWidth: cellWidth,
              focusNode: node,
              onPressed: interactive && !unavailable ? () => _choose(day) : null,
            ),
          ),
        );
      }
      // DTP-11: all six rows are kept; a row without days is empty space, hidden.
      rows.add(
        any
            ? Semantics(
                container: true,
                explicitChildNodes: true,
                role: SemanticsRole.row,
                child: Row(children: cells),
              )
            : SizedBox(height: cell, width: 7 * cellWidth),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: rows,
    );
  }

  /// DTP-16, DTP-19: the years in rows of three, in the space of the weekday row and six rows.
  Widget _buildYears(
    BuildContext context,
    TanreiDateLocalizations localizations,
    TanreiDatePickerLabels labels, {
    required double cell,
    required double gridWidth,
  }) {
    final int first = _firstYear;
    final int last = _lastYear;
    final int rows = ((last - first) ~/ 3) + 1;
    final ScrollController scroll = _yearScroll ??= _newYearScroll();
    return SizedBox(
      width: gridWidth,
      height: 7 * cell,
      child: ListView.builder(
        controller: scroll,
        itemExtent: cell,
        itemCount: rows,
        padding: EdgeInsets.zero,
        itemBuilder: (BuildContext context, int row) => Row(
          children: <Widget>[
            for (int column = 0; column < 3; column++)
              if (first + row * 3 + column <= last)
                SizedBox(
                  width: gridWidth / 3,
                  height: cell,
                  child: Center(child: _year(localizations, labels, first + row * 3 + column)),
                ),
          ],
        ),
      ),
    );
  }

  Widget _year(TanreiDateLocalizations localizations, TanreiDatePickerLabels labels, int year) {
    // DTP-10: selected for the displayed year, today for the current one when not displayed.
    final TanreiDatePickerCondition condition = year == _month.year
        ? TanreiDatePickerCondition.selected
        : year == _today.year
        ? TanreiDatePickerCondition.today
        : TanreiDatePickerCondition.unselected;
    final String text = localizations.formatNumber(year);
    final FocusNode node = _yearNode(year);
    node.skipTraversal = year != _focusedYear;
    return TanreiDatePickerYear._(
      key: ValueKey<int>(year),
      year: year,
      condition: condition,
      selected: year == _month.year,
      text: text,
      semanticLabel: year == _today.year ? '$text, ${labels.todayLabel}' : text,
      focusNode: node,
      onPressed: () => _chooseYear(year),
      onFocused: () {
        if (_focusedYear != year) {
          setState(() => _focusedYear = year);
        }
      },
    );
  }
}

// ---------------------------------------------------------------------------------------------
// The modal frame (DTP-38): the header on top and the actions at the bottom stay; the calendar or
// the fields between them scroll. When the header and the actions alone leave no room, everything
// scrolls together.

enum _FramePart { top, middle, bottom }

class _ModalFrame extends SlottedMultiChildRenderObjectWidget<_FramePart, RenderBox> {
  const _ModalFrame({
    required this.width,
    required this.whole,
    required this.onNeedsWhole,
    this.top,
    required this.middle,
    this.bottom,
  });

  final double width;
  final bool whole;
  final ValueChanged<bool> onNeedsWhole;
  final Widget? top;
  final Widget middle;
  final Widget? bottom;

  @override
  Iterable<_FramePart> get slots => _FramePart.values;

  @override
  Widget? childForSlot(_FramePart slot) => switch (slot) {
    _FramePart.top => top,
    _FramePart.middle => middle,
    _FramePart.bottom => bottom,
  };

  @override
  _RenderModalFrame createRenderObject(BuildContext context) =>
      _RenderModalFrame(width: width, whole: whole, onNeedsWhole: onNeedsWhole);

  @override
  void updateRenderObject(BuildContext context, _RenderModalFrame renderObject) {
    renderObject
      ..width = width
      ..whole = whole
      ..onNeedsWhole = onNeedsWhole;
  }
}

class _RenderModalFrame extends RenderBox
    with SlottedContainerRenderObjectMixin<_FramePart, RenderBox> {
  _RenderModalFrame({required double width, required bool whole, required this.onNeedsWhole})
    : _width = width,
      _whole = whole;

  double _width;
  set width(double value) {
    if (_width != value) {
      _width = value;
      markNeedsLayout();
    }
  }

  bool _whole;
  set whole(bool value) {
    if (_whole != value) {
      _whole = value;
      _reported = false;
      markNeedsLayout();
    }
  }

  ValueChanged<bool> onNeedsWhole;
  bool _reported = false;

  RenderBox? get _top => childForSlot(_FramePart.top);
  RenderBox? get _middle => childForSlot(_FramePart.middle);
  RenderBox? get _bottom => childForSlot(_FramePart.bottom);

  @override
  double computeMinIntrinsicWidth(double height) => _width;

  @override
  double computeMaxIntrinsicWidth(double height) => _width;

  @override
  double computeMinIntrinsicHeight(double width) =>
      _layout(BoxConstraints(maxWidth: width), dry: true).height;

  @override
  double computeMaxIntrinsicHeight(double width) => computeMinIntrinsicHeight(width);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) => _layout(constraints, dry: true);

  @override
  void performLayout() {
    size = _layout(constraints, dry: false);
  }

  Size _layout(BoxConstraints constraints, {required bool dry}) {
    Size sizeOf(RenderBox? child, BoxConstraints c) {
      if (child == null) {
        return Size.zero;
      }
      if (dry) {
        return child.getDryLayout(c);
      }
      child.layout(c, parentUsesSize: true);
      return child.size;
    }

    final double width = constraints.constrainWidth(_width);
    final Size top = sizeOf(_top, BoxConstraints.tightFor(width: width));
    final Size bottom = sizeOf(_bottom, BoxConstraints.tightFor(width: width));
    final double room = constraints.maxHeight - top.height - bottom.height;
    final Size middle = sizeOf(
      _middle,
      BoxConstraints(
        minWidth: width,
        maxWidth: width,
        maxHeight: constraints.hasBoundedHeight ? math.max(0, room) : double.infinity,
      ),
    );
    final Size size = constraints.constrain(
      Size(width, top.height + middle.height + bottom.height),
    );
    if (!dry) {
      double y = 0;
      for (final (RenderBox? child, double height) in <(RenderBox?, double)>[
        (_top, top.height),
        (_middle, middle.height),
        (_bottom, bottom.height),
      ]) {
        if (child != null) {
          (child.parentData! as BoxParentData).offset = Offset(0, y);
        }
        y += height;
      }
      // DTP-38: the header and the actions leave the calendar no room — everything scrolls.
      if (!_whole && room <= 0 && !_reported) {
        _reported = true;
        SchedulerBinding.instance.addPostFrameCallback((_) => onNeedsWhole(true));
      }
    }
    return size;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final RenderBox child in children) {
      context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final RenderBox child in children) {
      final Offset at = (child.parentData! as BoxParentData).offset;
      final bool hit = result.addWithPaintOffset(
        offset: at,
        position: position,
        hitTest: (BoxHitTestResult result, Offset transformed) =>
            child.hitTest(result, position: transformed),
      );
      if (hit) {
        return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Days, years and the view toggle: pressables drawn from the tokens of their condition (DTP-10,
// DTP-31 … DTP-35).

/// What an in-range endpoint draws behind its container (DTP-12).
enum _Band {
  none,

  /// The start: the half of its cell toward the end.
  towardEnd,

  /// The end: the half of its cell toward the start.
  towardStart,
}

/// The state and press answer that days, years and the view toggle share.
mixin _ConditionPressable<W extends StatefulWidget>
    on TickerProviderStateMixin<W>, TanreiPressableStateMixin<W, TanreiControlVisuals> {
  TanreiDatePickerTokens get tokens => TanreiTheme.of(context).system.datePicker;

  @override
  Duration get stateTransitionDuration => tanreiDuration(tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  /// DTP-31, DTP-34: the tokens of [condition] in the drawn state, the container color in the
  /// container state, eased between states.
  TanreiControlVisuals visualsOf(TanreiDatePickerCondition condition, double shape) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerConditionTokens tones = tokens.conditions[condition];
    final TanreiDatePickerConditionStateTokens drawn = tones.of(drawnState);
    return animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: tones.of(containerState).containerColor,
        labelColor: drawn.labelColor,
        outlineColor: drawn.outlineColor,
        elevation: const <TanreiShadowLayer>[],
        opacity: tokens.stateTokens(drawnState)?.opacity,
        shape: shape,
      ),
    );
  }

  /// DTP-34: the ripple of a press, in the pressed container color of [condition].
  TanreiRipple? rippleOf(TanreiDatePickerCondition condition, TanreiControlVisuals visuals) =>
      rippleFor(
        pressedContainer: () =>
            TanreiTheme.of(context).paint(tokens.conditions[condition].pressed.containerColor),
        container: visuals.container,
      );
}

/// One day of the displayed month: the spec's item kind `day`, which the picker generates from the
/// month, the bounds and the disabled dates (a product never builds one). [date] is the day and
/// [disabled] whether it is unavailable (DTP-30): drawn from the disabled tokens of its condition,
/// reachable by the arrow keys, never chosen.
class TanreiDatePickerDay extends StatefulWidget {
  const TanreiDatePickerDay._({
    super.key,
    required this.date,
    required this.disabled,
    required this.condition,
    required _Band band,
    required this.selected,
    required this.semanticLabel,
    required this.semanticHint,
    required String number,
    required double cell,
    required double cellWidth,
    required FocusNode? focusNode,
    required VoidCallback? onPressed,
  }) : _band = band,
       _number = number,
       _cell = cell,
       _cellWidth = cellWidth,
       _focusNode = focusNode,
       _onPressed = onPressed;

  /// The day: the local midnight of its date.
  final DateTime date;

  /// Whether the day is unavailable.
  final bool disabled;

  /// The condition the day is drawn from (DTP-10).
  final TanreiDatePickerCondition condition;

  final _Band _band;

  /// Whether the day is exposed as selected: the chosen date and every day of a range.
  final bool selected;

  /// The full date in the locale, followed by the today label for today.
  final String semanticLabel;

  /// The start or end label of a range's start and end.
  final String? semanticHint;

  final String _number;

  /// The cell's height: the minimum target.
  final double _cell;

  /// The cell's width: the minimum target, narrower only in the narrowest windows (DTP-38).
  final double _cellWidth;
  final FocusNode? _focusNode;
  final VoidCallback? _onPressed;

  @override
  State<TanreiDatePickerDay> createState() => _DayState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<DateTime>('date', date))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(StringProperty('condition', condition.name));
  }
}

class _DayState extends State<TanreiDatePickerDay>
    with
        TickerProviderStateMixin<TanreiDatePickerDay>,
        TanreiPressableStateMixin<TanreiDatePickerDay, TanreiControlVisuals>,
        _ConditionPressable<TanreiDatePickerDay> {
  @override
  VoidCallback? get onPressed => widget._onPressed;

  // DTP-30: an unavailable day stays reachable by the arrow keys.
  @override
  bool get focusableWhileDisabled => true;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    final double smoothing = theme.system.shape.cornerSmoothing;
    final bool inRange = widget.condition == TanreiDatePickerCondition.inRange;
    final TanreiControlVisuals visuals = visualsOf(widget.condition, tokens.dayContainerShape);
    final TanreiRipple? ripple = rippleOf(widget.condition, visuals);
    final TextStyle style = theme.textStyle(tokens.dayLabelTypescale, color: visuals.label);
    // DTP-38: the container grows to hold its number with enlarged text.
    final TextPainter measure = TextPainter(
      text: TextSpan(text: widget._number, style: style),
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.maybeTextScalerOf(context) ?? TextScaler.noScaling,
      maxLines: 1,
    )..layout();
    final double side = math.min(
      widget._cellWidth,
      math.max(tokens.dayContainerSize, math.max(measure.width, measure.height)),
    );
    measure.dispose();
    final double height = math.max(widget._cell, side);
    final TanreiCornerShape square = TanreiCornerShape(smoothing: smoothing, radius: visuals.shape);
    final Widget label = Center(
      child: Text(widget._number, style: style, maxLines: 1, softWrap: false),
    );
    // DTP-12: the square container, or — in range — a container across the whole cell (the band,
    // square ends); the focus ring goes around the square either way (DTP-32).
    final Widget container = inRange
        ? SizedBox(
            width: widget._cellWidth,
            height: side,
            child: DecoratedBox(
              key: pressContainerKey,
              decoration: visuals.decoration(
                const TanreiCornerShape(smoothing: 0, radius: 0),
                outlineWidth: tokens.outlineWidth,
                ripple: ripple,
              ),
              child: Center(
                child: TanreiFocusRing(
                  visible: isKeyboardFocused,
                  borderRadius: BorderRadius.circular(visuals.shape),
                  child: SizedBox.square(dimension: side, child: label),
                ),
              ),
            ),
          )
        : TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: BorderRadius.circular(visuals.shape),
            child: SizedBox.square(
              dimension: side,
              child: TanreiControlContainer(
                key: pressContainerKey,
                visuals: visuals,
                shape: square,
                outlineWidth: tokens.outlineWidth,
                ripple: ripple,
                child: label,
              ),
            ),
          );
    final Color band = theme.paint(tokens.conditions.inRange.enabled.containerColor);
    final Widget cell = SizedBox(
      width: widget._cellWidth,
      height: height,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          if (widget._band != _Band.none && band.a > 0)
            // DTP-12: the half of the cell toward the other end, in the band's color.
            PositionedDirectional(
              start: widget._band == _Band.towardEnd ? widget._cellWidth / 2 : 0,
              end: widget._band == _Band.towardStart ? widget._cellWidth / 2 : 0,
              top: (height - side) / 2,
              bottom: (height - side) / 2,
              child: ColoredBox(color: band),
            ),
          container,
        ],
      ),
    );
    return Semantics(
      container: true,
      button: true,
      enabled: !widget.disabled,
      selected: widget.selected,
      label: widget.semanticLabel,
      hint: widget.semanticHint,
      child: buildPressable(
        focusNode: widget._focusNode,
        child: ExcludeSemantics(
          child: Opacity(opacity: visuals.opacity, child: cell),
        ),
      ),
    );
  }
}

/// One year of the year view: the spec's item kind `year`, which the picker generates from the
/// first year to the last (a product never builds one). [year] is the year.
class TanreiDatePickerYear extends StatefulWidget {
  const TanreiDatePickerYear._({
    super.key,
    required this.year,
    required this.condition,
    required this.selected,
    required String text,
    required this.semanticLabel,
    required FocusNode focusNode,
    required VoidCallback onPressed,
    required VoidCallback onFocused,
  }) : _text = text,
       _focusNode = focusNode,
       _onPressed = onPressed,
       _onFocused = onFocused;

  /// The year.
  final int year;

  /// The condition the year is drawn from (DTP-10).
  final TanreiDatePickerCondition condition;

  /// Whether the year is the displayed one.
  final bool selected;

  /// The year in the locale's digits, followed by the today label for the current year.
  final String semanticLabel;

  final String _text;
  final FocusNode _focusNode;
  final VoidCallback _onPressed;
  final VoidCallback _onFocused;

  @override
  State<TanreiDatePickerYear> createState() => _YearState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('year', year))
      ..add(StringProperty('condition', condition.name));
  }
}

class _YearState extends State<TanreiDatePickerYear>
    with
        TickerProviderStateMixin<TanreiDatePickerYear>,
        TanreiPressableStateMixin<TanreiDatePickerYear, TanreiControlVisuals>,
        _ConditionPressable<TanreiDatePickerYear> {
  @override
  VoidCallback? get onPressed => widget._onPressed;

  @override
  void initState() {
    super.initState();
    widget._focusNode.addListener(_handleFocus);
  }

  @override
  void didUpdateWidget(TanreiDatePickerYear oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget._focusNode != widget._focusNode) {
      oldWidget._focusNode.removeListener(_handleFocus);
      widget._focusNode.addListener(_handleFocus);
    }
  }

  @override
  void dispose() {
    widget._focusNode.removeListener(_handleFocus);
    super.dispose();
  }

  void _handleFocus() {
    if (widget._focusNode.hasPrimaryFocus) {
      widget._onFocused();
    }
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    final TanreiControlVisuals visuals = visualsOf(widget.condition, tokens.yearContainerShape);
    final TanreiRipple? ripple = rippleOf(widget.condition, visuals);
    return Semantics(
      container: true,
      button: true,
      selected: widget.selected,
      label: widget.semanticLabel,
      child: buildPressable(
        focusNode: widget._focusNode,
        child: Opacity(
          opacity: visuals.opacity,
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: BorderRadius.circular(visuals.shape),
            child: ConstrainedBox(
              constraints: BoxConstraints.tightFor(
                width: tokens.yearContainerWidth,
              ).copyWith(minHeight: tokens.yearContainerHeight),
              child: TanreiControlContainer(
                key: pressContainerKey,
                visuals: visuals,
                shape: TanreiCornerShape(
                  smoothing: theme.system.shape.cornerSmoothing,
                  radius: visuals.shape,
                ),
                outlineWidth: tokens.outlineWidth,
                ripple: ripple,
                // As tall as the year's text, never lower than the container height.
                child: Center(
                  heightFactor: 1,
                  child: ExcludeSemantics(
                    child: Text(
                      widget._text,
                      style: theme.textStyle(tokens.yearLabelTypescale, color: visuals.label),
                      maxLines: 1,
                      softWrap: false,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// DTP-15: the displayed month and year with a chevron, drawn with the unselected condition's
/// tokens; it switches between the day and the year view.
class _ViewToggle extends StatefulWidget {
  const _ViewToggle({
    required this.focusNode,
    required this.text,
    required this.description,
    required this.expanded,
    required this.turn,
    required this.onPressed,
  });

  final FocusNode focusNode;
  final String text;
  final String description;
  final bool expanded;
  final Animation<double> turn;
  final VoidCallback onPressed;

  @override
  State<_ViewToggle> createState() => _ViewToggleState();
}

class _ViewToggleState extends State<_ViewToggle>
    with
        TickerProviderStateMixin<_ViewToggle>,
        TanreiPressableStateMixin<_ViewToggle, TanreiControlVisuals>,
        _ConditionPressable<_ViewToggle> {
  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDatePickerTokens tokens = theme.system.datePicker;
    const TanreiDatePickerCondition condition = TanreiDatePickerCondition.unselected;
    final TanreiControlVisuals visuals = visualsOf(condition, tokens.viewToggleContainerShape);
    final TanreiRipple? ripple = rippleOf(condition, visuals);
    final Animation<double> turn = CurvedAnimation(
      parent: widget.turn,
      curve: tokens.motionStateEasing.toCurve(),
    );
    return Semantics(
      container: true,
      button: true,
      label: widget.text,
      hint: widget.description,
      expanded: widget.expanded,
      // DTP-15: the hit area reaches the minimum target without changing the visual size.
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: BorderRadius.circular(visuals.shape),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: tokens.viewToggleContainerHeight),
                child: TanreiControlContainer(
                  key: pressContainerKey,
                  visuals: visuals,
                  shape: TanreiCornerShape(
                    smoothing: theme.system.shape.cornerSmoothing,
                    radius: visuals.shape,
                  ),
                  outlineWidth: tokens.outlineWidth,
                  ripple: ripple,
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: tokens.viewToggleContainerPaddingInline,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      spacing: tokens.viewToggleGap,
                      children: <Widget>[
                        Flexible(
                          child: ExcludeSemantics(
                            child: Text(
                              widget.text,
                              style: theme.textStyle(
                                tokens.viewToggleLabelTypescale,
                                color: visuals.label,
                              ),
                            ),
                          ),
                        ),
                        // DTP-15: half a turn in the year view.
                        RotationTransition(
                          turns: turn.drive(Tween<double>(begin: 0, end: 0.5)),
                          child: TanreiControlIcon(
                            icon: const Text(_expandMoreGlyph),
                            size: tokens.viewToggleIconSize,
                            selected: false,
                            color: visuals.label,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
