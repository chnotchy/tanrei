import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
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
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'button.dart';
import 'icon_button.dart';
import 'text_field.dart';

// ---------------------------------------------------------------------------------------------
// The picker's closed choices (spec props `hourCycle`, `entryMode`, `unit`, `layout`) and the
// reasons of its `close` event.

/// Which clock a time picker uses (the spec's `hourCycle`). The chosen time is 24-hour in every
/// cycle.
enum TanreiTimePickerHourCycle {
  /// The locale's preferred clock (a locale that counts 0 to 11 as [h12], one that counts 1 to 24
  /// as [h23]); the device's 24-hour setting (`MediaQuery.alwaysUse24HourFormatOf`) wins (TMP-6).
  locale,

  /// Hours 1 to 12 with a period (AM, PM).
  h12,

  /// Hours 00 to 23.
  h23;

  /// The cycle named [name], or [locale] — reported in debug builds — for a name the picker does
  /// not define (TMP-29).
  static TanreiTimePickerHourCycle fromName(String name) =>
      tanreiEnumByName(values, name, fallback: locale, kind: 'time-picker hourCycle');
}

/// How a time picker opens (the spec's `entryMode`).
enum TanreiTimePickerEntryMode {
  /// On the clock dial.
  dial,

  /// With text fields to type the time in.
  text;

  /// The entry mode named [name], or [dial] — reported in debug builds — for a name the picker does
  /// not define (TMP-29).
  static TanreiTimePickerEntryMode fromName(String name) =>
      tanreiEnumByName(values, name, fallback: dial, kind: 'time-picker entryMode');
}

/// The unit the dial shows, and the selector that takes focus, when a time picker opens (the spec's
/// `unit`).
enum TanreiTimePickerUnit {
  /// The hour.
  hour,

  /// The minute.
  minute;

  /// The unit named [name], or [hour] — reported in debug builds — for a name the picker does not
  /// define (TMP-29).
  static TanreiTimePickerUnit fromName(String name) =>
      tanreiEnumByName(values, name, fallback: hour, kind: 'time-picker unit');
}

/// How a time picker arranges its parts (the spec's `layout`, TMP-7).
enum TanreiTimePickerLayout {
  /// [horizontal] only when the window is too short for [vertical] and wide enough for it.
  auto,

  /// The time above the dial.
  vertical,

  /// The time and the actions beside the dial, for a short window.
  horizontal;

  /// The layout named [name], or [auto] — reported in debug builds — for a name the picker does
  /// not define (TMP-29).
  static TanreiTimePickerLayout fromName(String name) =>
      tanreiEnumByName(values, name, fallback: auto, kind: 'time-picker layout');
}

/// Why a time picker asks to be closed: the reason its `close` event carries (TMP-4).
enum TanreiTimePickerCloseReason {
  /// Escape.
  escape,

  /// The platform's back (Android's back button or gesture).
  back,

  /// A press on the scrim.
  outside,

  /// Cancel.
  cancel,

  /// OK: the pending time is committed.
  confirm,
}

/// A time of day in hours and minutes, 24-hour: the spec's `value` ("19:30"). It has no date, no
/// seconds and no time zone. It is the package's own because `TimeOfDay` belongs to the Material
/// library.
@immutable
class TanreiTimeOfDay {
  /// The time [hour]:[minute], [hour] 0 to 23 and [minute] 0 to 59.
  const TanreiTimeOfDay({required this.hour, required this.minute});

  /// The hour and minute of [time].
  TanreiTimeOfDay.fromDateTime(DateTime time) : hour = time.hour, minute = time.minute;

  /// The device's current local time, to the minute.
  factory TanreiTimeOfDay.now() => TanreiTimeOfDay.fromDateTime(DateTime.now());

  /// The hour, 0 to 23.
  final int hour;

  /// The minute, 0 to 59.
  final int minute;

  /// Whether [hour] and [minute] name a time of day.
  bool get isValid => hour >= 0 && hour < 24 && minute >= 0 && minute < 60;

  /// The time as the spec's `value` writes it, as an HTML time input holds it: "07:30".
  String format() => '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

  /// Reads a 24-hour "HH:MM" time ("19:30"), for a time that arrives as text (a fixture, a
  /// server-driven screen). Text that is not one is null and is reported in debug builds (TMP-29);
  /// empty text is null and reported by nothing.
  static TanreiTimeOfDay? parse(String text) {
    if (text.isEmpty) {
      return null;
    }
    final RegExpMatch? match = RegExp(r'^([01][0-9]|2[0-3]):([0-5][0-9])$').firstMatch(text);
    if (match == null) {
      assert(() {
        debugTanreiReportUnknownValue('time-picker value', text, 'no time');
        return true;
      }());
      return null;
    }
    return TanreiTimeOfDay(hour: int.parse(match.group(1)!), minute: int.parse(match.group(2)!));
  }

  @override
  bool operator ==(Object other) =>
      other is TanreiTimeOfDay && other.hour == hour && other.minute == minute;

  @override
  int get hashCode => Object.hash(hour, minute);

  @override
  String toString() => 'TanreiTimeOfDay(${format()})';
}

/// The words a time picker shows or announces that are not locale data (TMP-27: every one a prop
/// with an English default; a product in another language sets them).
@immutable
class TanreiTimePickerLabels {
  /// The picker's words, English by default.
  const TanreiTimePickerLabels({
    this.label = 'Select time',
    this.hourLabel = 'Hour',
    this.minuteLabel = 'Minute',
    this.confirmLabel = 'OK',
    this.cancelLabel = 'Cancel',
    this.textEntryLabel = 'Switch to text entry',
    this.dialEntryLabel = 'Switch to clock',
    this.invalidText = 'Enter a valid time',
  });

  /// Names the picker: the accessible name of its surface and the line at its top.
  final String label;

  /// The accessible name of the hour selector and the label of the hour field.
  final String hourLabel;

  /// The accessible name of the minute selector and the label of the minute field.
  final String minuteLabel;

  /// The label of OK.
  final String confirmLabel;

  /// The label of Cancel.
  final String cancelLabel;

  /// The entry-mode toggle's name while the dial is shown.
  final String textEntryLabel;

  /// The entry-mode toggle's name while text entry is shown.
  final String dialEntryLabel;

  /// The error text of a field whose text is not a number of its unit.
  final String invalidText;

  /// A copy with the given words replaced.
  TanreiTimePickerLabels copyWith({
    String? label,
    String? hourLabel,
    String? minuteLabel,
    String? confirmLabel,
    String? cancelLabel,
    String? textEntryLabel,
    String? dialEntryLabel,
    String? invalidText,
  }) => TanreiTimePickerLabels(
    label: label ?? this.label,
    hourLabel: hourLabel ?? this.hourLabel,
    minuteLabel: minuteLabel ?? this.minuteLabel,
    confirmLabel: confirmLabel ?? this.confirmLabel,
    cancelLabel: cancelLabel ?? this.cancelLabel,
    textEntryLabel: textEntryLabel ?? this.textEntryLabel,
    dialEntryLabel: dialEntryLabel ?? this.dialEntryLabel,
    invalidText: invalidText ?? this.invalidText,
  );
}

// ---------------------------------------------------------------------------------------------
// The glyphs of the entry-mode toggle (TMP-24), as Material Symbols code points drawn as text
// through the system's icon style.

const String _keyboardGlyph = '\u{e312}';
const String _scheduleGlyph = '\u{e8b5}';

// ---------------------------------------------------------------------------------------------
// The props every form of the picker shares.

@immutable
class _TimeProps {
  const _TimeProps({
    required this.initialTime,
    required this.hourCycle,
    required this.entryMode,
    required this.unit,
    required this.layout,
    required this.locale,
    required this.labels,
  });

  final TanreiTimeOfDay? initialTime;
  final TanreiTimePickerHourCycle hourCycle;
  final TanreiTimePickerEntryMode entryMode;
  final TanreiTimePickerUnit unit;
  final TanreiTimePickerLayout layout;
  final Locale? locale;
  final TanreiTimePickerLabels labels;
}

/// TMP-27: [child] with the localizations of [locale], as `showTimePicker` does it; the layout
/// keeps the ambient direction. Without a locale, or without an ambient `Localizations` to load it
/// from, [child] as it is.
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
// Modal: showTanreiTimePicker

/// Presents a time picker — the spec's `open` — as a modal route over everything in the navigator,
/// in the idiom of Flutter's `showTimePicker`, and completes with the committed time when OK is
/// activated, or with null when the picker closes otherwise.
///
/// Implements `specs/time-picker.spec.json`:
///
/// * the route draws the scrim, `comp.time-picker.scrim.color`, over the whole navigator and makes
///   everything behind the picker inert; the picker keeps Tab inside itself (TMP-1);
/// * the picker holds a pending time, starting as [initialTime] (the spec's `value`) or, while it
///   is null, the device's current time; OK commits it: [onChanged] is called with it when it
///   differs from [initialTime] (or [initialTime] is null), then [onClose] with `confirm` (TMP-5).
///   Cancel, Escape, the platform's back and a press on the scrim close it without committing,
///   [onClose] carrying the reason (TMP-4); the picker closes itself;
/// * [hourCycle] chooses the clock (TMP-6), [entryMode] and [unit] what it opens on, [layout] its
///   arrangement (TMP-7), [locale] the locale data (TMP-27) and [labels] its words;
/// * focus moves to the selector of [unit] (or the hour field) when it opens, and back to where it
///   was when it closes (TMP-2, TMP-3).
///
/// While it is shown the route counts as a Tanrei modal overlay (`TanreiModalOverlays`).
Future<TanreiTimeOfDay?> showTanreiTimePicker({
  required BuildContext context,
  TanreiTimeOfDay? initialTime,
  TanreiTimePickerHourCycle hourCycle = TanreiTimePickerHourCycle.locale,
  TanreiTimePickerEntryMode entryMode = TanreiTimePickerEntryMode.dial,
  TanreiTimePickerUnit unit = TanreiTimePickerUnit.hour,
  TanreiTimePickerLayout layout = TanreiTimePickerLayout.auto,
  Locale? locale,
  TanreiTimePickerLabels labels = const TanreiTimePickerLabels(),
  ValueChanged<TanreiTimeOfDay>? onChanged,
  ValueChanged<TanreiTimePickerCloseReason>? onClose,
  bool useRootNavigator = true,
  RouteSettings? routeSettings,
}) {
  final NavigatorState navigator = Navigator.of(context, rootNavigator: useRootNavigator);
  final bool disable = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  final TanreiTimePickerTokens tokens = TanreiTheme.of(context).system.timePicker;
  // TMP-25: Android's reduced-motion setting removes every animation.
  final bool atOnce = disable && defaultTargetPlatform == TargetPlatform.android;
  return navigator.push<TanreiTimeOfDay?>(
    _TimePickerRoute(
      props: _TimeProps(
        initialTime: initialTime,
        hourCycle: hourCycle,
        entryMode: entryMode,
        unit: unit,
        layout: layout,
        locale: locale,
        labels: labels,
      ),
      onChanged: onChanged,
      onClose: onClose,
      settings: routeSettings,
      enter: atOnce ? Duration.zero : tanreiDuration(tokens.motionOpenDuration),
      exit: atOnce ? Duration.zero : tanreiDuration(tokens.motionCloseDuration),
      grows: !disable,
    ),
  );
}

// TODO: share the overlay route — this route and its transition repeat the date
// picker's (and the dialog's) with the time picker's tokens.
class _TimePickerRoute extends PopupRoute<TanreiTimeOfDay?> {
  _TimePickerRoute({
    required this.props,
    required this.onChanged,
    required this.onClose,
    required this.enter,
    required this.exit,
    required this.grows,
    super.settings,
  });

  final _TimeProps props;
  final ValueChanged<TanreiTimeOfDay>? onChanged;
  final ValueChanged<TanreiTimePickerCloseReason>? onClose;
  final Duration enter;
  final Duration exit;

  /// Whether the picker grows as it enters (false where motion is reduced: TMP-25).
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
  bool didPop(TanreiTimeOfDay? result) {
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
  ) => _TimePickerPage(route: this);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    return _ModalTransition(
      animation: animation,
      enter: tokens.motionOpenEasing.toCurve(),
      exit: tokens.motionCloseEasing.toCurve(),
      enterScale: grows ? tokens.motionEnterScale : 1,
      scrim: theme.paint(tokens.scrimColor),
      child: child,
    );
  }
}

/// TMP-1, TMP-25: the scrim over the whole route and the picker above it, faded in (the picker
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
/// the keyboard (TMP-1).
class _TimePickerPage extends StatefulWidget {
  const _TimePickerPage({required this.route});

  final _TimePickerRoute route;

  @override
  State<_TimePickerPage> createState() => _TimePickerPageState();
}

class _TimePickerPageState extends State<_TimePickerPage> {
  bool _closed = false;
  TanreiTimeOfDay? _confirmed;

  void _close(TanreiTimePickerCloseReason reason) {
    if (_closed) {
      return;
    }
    _closed = true;
    widget.route.onClose?.call(reason);
    final TanreiTimeOfDay? result = reason == TanreiTimePickerCloseReason.confirm
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
    final TanreiTimePickerTokens tokens = TanreiTheme.of(context).system.timePicker;
    final EdgeInsets safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final EdgeInsets keyboard = MediaQuery.maybeViewInsetsOf(context) ?? EdgeInsets.zero;
    final double margin = tokens.containerMargin;
    return PopScope<Object?>(
      canPop: false,
      // TMP-4: the platform's back closes the picker, and goes no further.
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          _close(TanreiTimePickerCloseReason.back);
        }
      },
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          // TMP-4: a press on the scrim closes the picker without committing.
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            excludeFromSemantics: true,
            onTap: () => _close(TanreiTimePickerCloseReason.outside),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              safe.left + margin,
              safe.top + margin,
              safe.right + margin,
              math.max(safe.bottom, keyboard.bottom) + margin,
            ),
            child: Center(
              child: _withLocale(
                context,
                widget.route.props.locale,
                _TimeSurface(
                  props: widget.route.props,
                  owner: widget,
                  takeFocus: true,
                  onChanged: widget.route.onChanged,
                  onConfirmed: (TanreiTimeOfDay time) => _confirmed = time,
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
// In place: TanreiTimePicker

/// Lets a person choose a time of day, in hours and minutes, on a clock dial or by typing it.
///
/// Implements the surface of `specs/time-picker.spec.json`: the surface [showTanreiTimePicker]
/// shows. This widget draws the open surface where it is built, at its natural size, without a
/// route, scrim or motion — for tests, galleries and a product's own presentation. It takes no
/// focus on its own; [onChanged] and [onClose] report what would commit and close it.
///
/// The props are those of [showTanreiTimePicker]: [initialTime] is the spec's `value`, and the
/// words are the fields of [labels] (`label`, `hourLabel`, `minuteLabel`, `confirmLabel`,
/// `cancelLabel`, `textEntryLabel`, `dialEntryLabel`, `invalidText`).
class TanreiTimePicker extends StatelessWidget {
  /// Draws the open picker in place.
  const TanreiTimePicker({
    super.key,
    this.initialTime,
    this.hourCycle = TanreiTimePickerHourCycle.locale,
    this.entryMode = TanreiTimePickerEntryMode.dial,
    this.unit = TanreiTimePickerUnit.hour,
    this.layout = TanreiTimePickerLayout.auto,
    this.locale,
    this.labels = const TanreiTimePickerLabels(),
    this.onChanged,
    this.onClose,
  });

  /// The committed time (the spec's `value`); null for none, the picker then starting from the
  /// device's current time.
  final TanreiTimeOfDay? initialTime;

  /// The clock: `locale`, `h12` or `h23`.
  final TanreiTimePickerHourCycle hourCycle;

  /// What the picker opens on: `dial` or `text`.
  final TanreiTimePickerEntryMode entryMode;

  /// The unit the dial shows first: `hour` or `minute`.
  final TanreiTimePickerUnit unit;

  /// The arrangement: `auto`, `vertical` or `horizontal`.
  final TanreiTimePickerLayout layout;

  /// The locale of the period names, the digits, the separator and the preferred clock; null uses
  /// the ambient one.
  final Locale? locale;

  /// The picker's words.
  final TanreiTimePickerLabels labels;

  /// The spec's `change`.
  final ValueChanged<TanreiTimeOfDay>? onChanged;

  /// The spec's `close`, with its reason.
  final ValueChanged<TanreiTimePickerCloseReason>? onClose;

  @override
  Widget build(BuildContext context) => _withLocale(
    context,
    locale,
    _TimeSurface(
      props: _TimeProps(
        initialTime: initialTime,
        hourCycle: hourCycle,
        entryMode: entryMode,
        unit: unit,
        layout: layout,
        locale: locale,
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
      ..add(DiagnosticsProperty<TanreiTimeOfDay>('initialTime', initialTime))
      ..add(EnumProperty<TanreiTimePickerHourCycle>('hourCycle', hourCycle))
      ..add(EnumProperty<TanreiTimePickerEntryMode>('entryMode', entryMode))
      ..add(EnumProperty<TanreiTimePickerUnit>('unit', unit))
      ..add(EnumProperty<TanreiTimePickerLayout>('layout', layout))
      ..add(StringProperty('label', labels.label));
  }
}

// ---------------------------------------------------------------------------------------------
// The surface.

/// A field of text entry.
enum _Field { hour, minute }

/// The locale data the surface draws with, read once per build.
@immutable
class _Clock {
  factory _Clock.of(BuildContext context, TanreiTimePickerHourCycle cycle, Locale? locale) {
    final TanreiDateLocalizations localizations =
        Localizations.of<TanreiDateLocalizations>(context, TanreiDateLocalizations) ??
        TanreiEnglishDateLocalizations.fallbackFor(
          locale ?? Localizations.maybeLocaleOf(context) ?? const Locale('en', 'US'),
        );
    // TMP-6: the device's 24-hour choice wins while the cycle is the locale's.
    final bool twelve = switch (cycle) {
      TanreiTimePickerHourCycle.h12 => true,
      TanreiTimePickerHourCycle.h23 => false,
      TanreiTimePickerHourCycle.locale =>
        !(MediaQuery.maybeAlwaysUse24HourFormatOf(context) ?? false) &&
            !TanreiTimePattern.parse(localizations.preferredHourMinutePattern).twentyFourHour,
    };
    return _Clock._(
      localizations: localizations,
      twelve: twelve,
      pattern: TanreiTimePattern.parse(
        twelve ? localizations.hourMinutePattern12 : localizations.hourMinutePattern24,
      ),
    );
  }

  const _Clock._({required this.localizations, required this.twelve, required this.pattern});

  final TanreiDateLocalizations localizations;

  /// Whether the 12-hour clock is used.
  final bool twelve;

  /// The locale's pattern for the clock in use.
  final TanreiTimePattern pattern;

  /// TMP-10: the period before the hour ("aK:mm"), not after the minutes.
  bool get periodFirst => twelve && pattern.periodBeforeHour;

  String get separator => pattern.separator;

  String periodName(bool pm) =>
      pm ? localizations.postMeridiemAbbreviation : localizations.anteMeridiemAbbreviation;

  /// TMP-9: the hour as the locale writes one of the clock in use ("7" with h12 in en-US, "07"
  /// with h23).
  String hourText(int hour) => twelve
      ? localizations.formatNumber(_hour12(hour), minDigits: pattern.hourDigits)
      : localizations.formatNumber(hour, minDigits: pattern.hourDigits);

  String minuteText(int minute) => localizations.formatNumber(minute, minDigits: 2);

  /// TMP-26: the hour selector's value — the hour with its period on the 12-hour clock ("7 AM").
  String hourValue(int hour) {
    if (!twelve) {
      return hourText(hour);
    }
    final String period = periodName(hour >= 12);
    return periodFirst ? '$period ${hourText(hour)}' : '${hourText(hour)} $period';
  }

  /// A number typed in a field (ASCII or the locale's digits), or null (TMP-23).
  int? wholeNumber(String text) {
    final String ascii = localizations.toAsciiDigits(text).trim();
    if (!RegExp(r'^[0-9]{1,2}$').hasMatch(ascii)) {
      return null;
    }
    return int.parse(ascii);
  }
}

int _hour12(int hour) => hour % 12 == 0 ? 12 : hour % 12;

int _hour24(int hour12, {required bool pm}) => hour12 % 12 + (pm ? 12 : 0);

class _TimeSurface extends StatefulWidget {
  const _TimeSurface({
    required this.props,
    required this.owner,
    required this.takeFocus,
    this.onChanged,
    this.onClose,
    this.onConfirmed,
  });

  final _TimeProps props;

  /// The widget the product built, for reports.
  final Widget owner;

  /// Whether the surface moves focus in when it is first built (TMP-2): false in place.
  final bool takeFocus;

  final ValueChanged<TanreiTimeOfDay>? onChanged;
  final ValueChanged<TanreiTimePickerCloseReason>? onClose;

  /// The pending time OK commits, before [onClose] with `confirm`.
  final ValueChanged<TanreiTimeOfDay>? onConfirmed;

  @override
  State<_TimeSurface> createState() => _TimeSurfaceState();
}

class _TimeSurfaceState extends State<_TimeSurface> {
  // The pending time (TMP-5), 24-hour.
  late int _hour;
  late int _minute;

  late TanreiTimePickerUnit _unit;
  late TanreiTimePickerEntryMode _entry;

  /// A press or drag on the dial is under way: the handle follows it without animation (TMP-14).
  bool _dragging = false;

  final FocusNode _hourNode = FocusNode(debugLabel: 'TanreiTimePicker hour');
  final FocusNode _minuteNode = FocusNode(debugLabel: 'TanreiTimePicker minute');
  final List<FocusNode> _periodNodes = <FocusNode>[
    FocusNode(debugLabel: 'TanreiTimePicker AM'),
    FocusNode(debugLabel: 'TanreiTimePicker PM'),
  ];
  final Map<_Field, FocusNode> _fieldNodes = <_Field, FocusNode>{
    for (final _Field field in _Field.values)
      field: FocusNode(debugLabel: 'TanreiTimePicker ${field.name} field'),
  };
  final Map<_Field, TextEditingController> _fieldText = <_Field, TextEditingController>{
    for (final _Field field in _Field.values) field: TextEditingController(),
  };
  final Set<_Field> _fieldErrors = <_Field>{};
  final FocusNode _entryNode = FocusNode(debugLabel: 'TanreiTimePicker entry mode');
  final FocusNode _cancelNode = FocusNode(debugLabel: 'TanreiTimePicker cancel');
  final FocusNode _okNode = FocusNode(debugLabel: 'TanreiTimePicker OK');

  // TMP-7, TMP-8: what the parts measure, for the layout auto chooses and the whole scroll.
  final GlobalKey _labelKey = GlobalKey();
  final GlobalKey _displayKey = GlobalKey();
  final GlobalKey _actionsKey = GlobalKey();
  double? _labelHeight;
  Size? _displaySize;
  double? _actionsHeight;
  // The start column of the horizontal layout, as wide as the widest of the label, the time and
  // the actions want to be (what its IntrinsicWidth gives it).
  double? _startWidth;
  bool _measuring = false;

  bool _filled = false;

  /// What was reported, so that a report is made once per element (TMP-29).
  final Set<String> _reported = <String>{};

  TanreiTimePickerTokens get _tokens => TanreiTheme.of(context).system.timePicker;
  _TimeProps get _props => widget.props;
  bool get _text => _entry == TanreiTimePickerEntryMode.text;

  @override
  void initState() {
    super.initState();
    _debugReportLabel(null);
    // TMP-5: the pending time starts as the value or, while there is none, the device's time.
    final TanreiTimeOfDay start = _committed ?? TanreiTimeOfDay.now();
    _hour = start.hour;
    _minute = start.minute;
    _unit = _props.unit;
    _entry = _props.entryMode;
    _hourNode.addListener(_handleSelectorFocus);
    _minuteNode.addListener(_handleSelectorFocus);
    if (widget.takeFocus) {
      // TMP-2: focus moves in when the picker opens, not when its motion ends.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _openingFocus().requestFocus();
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_filled) {
      _filled = true;
      _fillFields();
    }
  }

  @override
  void didUpdateWidget(_TimeSurface oldWidget) {
    super.didUpdateWidget(oldWidget);
    // TMP-5: a value the product sets while the picker is open does not change the pending time.
    _debugReportLabel(oldWidget.props);
  }

  @override
  void dispose() {
    for (final FocusNode node in <FocusNode>[
      _hourNode,
      _minuteNode,
      ..._periodNodes,
      ..._fieldNodes.values,
      _entryNode,
      _cancelNode,
      _okNode,
    ]) {
      node.dispose();
    }
    for (final TextEditingController controller in _fieldText.values) {
      controller.dispose();
    }
    super.dispose();
  }

  // --- Reading the props (TMP-29) ---

  void _report(String key, String prop, String why) {
    assert(() {
      if (_reported.add(key)) {
        debugTanreiReportIgnoredValue('time-picker', prop, why, widget.owner);
      }
      return true;
    }());
  }

  /// The committed time the props name: null while there is none, or when it is not a time of
  /// day (reported, TMP-29).
  TanreiTimeOfDay? get _committed {
    final TanreiTimeOfDay? time = _props.initialTime;
    if (time != null && !time.isValid) {
      _report(
        'value',
        'initialTime',
        '${time.hour}:${time.minute} is not a time of day: it is treated as none.',
      );
      return null;
    }
    return time;
  }

  /// TMP-29: an empty label is reported — when first built so, and when it loses the one it had.
  void _debugReportLabel(_TimeProps? old) {
    assert(() {
      if ((old == null || tanreiIsAccessibleName(old.labels.label)) &&
          !tanreiIsAccessibleName(_props.labels.label)) {
        debugTanreiReportMissingName('time picker', widget.owner);
      }
      return true;
    }());
  }

  _Clock _clockOf(BuildContext context) => _Clock.of(context, _props.hourCycle, _props.locale);

  bool get _pm => _hour >= 12;

  // --- The pending time ---

  TanreiTimeOfDay get _pending => TanreiTimeOfDay(hour: _hour, minute: _minute);

  void _setTime(int hour, int minute) {
    if (hour == _hour && minute == _minute) {
      return;
    }
    setState(() {
      _hour = hour;
      _minute = minute;
    });
  }

  /// TMP-16: one later or earlier, wrapping, without changing the other unit or the period.
  void _step(TanreiTimePickerUnit unit, int delta) {
    if (unit == TanreiTimePickerUnit.minute) {
      _setTime(_hour, (_minute + delta) % 60);
      return;
    }
    if (_clockOf(context).twelve) {
      final int shown = (_hour12(_hour) - 1 + delta) % 12 + 1;
      _setTime(_hour24(shown, pm: _pm), _minute);
    } else {
      _setTime((_hour + delta) % 24, _minute);
    }
  }

  /// TMP-16: Home and End — the first and the last value of the unit.
  void _toEnd(TanreiTimePickerUnit unit, {required bool last}) {
    if (unit == TanreiTimePickerUnit.minute) {
      _setTime(_hour, last ? 59 : 0);
    } else if (_clockOf(context).twelve) {
      _setTime(_hour24(last ? 12 : 1, pm: _pm), _minute);
    } else {
      _setTime(last ? 23 : 0, _minute);
    }
  }

  /// TMP-11: a period keeps the hour's number (7 before noon becomes 7 after noon).
  void _choosePeriod(bool pm) {
    if (pm != _pm) {
      _setTime(_hour24(_hour12(_hour), pm: pm), _minute);
    }
  }

  /// TMP-16: a selector that is focused or pressed shows its unit on the dial and is drawn as
  /// selected.
  void _showUnit(TanreiTimePickerUnit unit) {
    if (unit != _unit) {
      setState(() => _unit = unit);
    }
  }

  void _handleSelectorFocus() {
    if (_hourNode.hasPrimaryFocus) {
      _showUnit(TanreiTimePickerUnit.hour);
    } else if (_minuteNode.hasPrimaryFocus) {
      _showUnit(TanreiTimePickerUnit.minute);
    }
  }

  // --- The dial (TMP-14) ---

  void _handleDialSet(int value) {
    // TMP-14: the handle follows the pointer without animation.
    _dragging = true;
    if (_unit == TanreiTimePickerUnit.minute) {
      _setTime(_hour, value);
    } else {
      _setTime(value, _minute);
    }
  }

  void _handleDialRelease() {
    final bool wasHour = _unit == TanreiTimePickerUnit.hour;
    setState(() {
      _dragging = false;
      if (wasHour) {
        _unit = TanreiTimePickerUnit.minute;
      }
    });
    if (wasHour && _hourNode.hasPrimaryFocus) {
      _minuteNode.requestFocus();
    }
  }

  // --- Committing (TMP-4, TMP-5) ---

  /// TMP-5: OK is disabled while a field holds text that is not a number of its unit.
  bool get _canConfirm =>
      !_text ||
      _Field.values.every((_Field field) => _readField(field, _fieldText[field]!.text) != null);

  void _confirm() {
    if (!_canConfirm) {
      return;
    }
    final TanreiTimeOfDay time = _pending;
    if (time != _committed) {
      widget.onChanged?.call(time);
    }
    widget.onConfirmed?.call(time);
    widget.onClose?.call(TanreiTimePickerCloseReason.confirm);
  }

  // --- Text entry (TMP-23) ---

  int? _readField(_Field field, String text) {
    final _Clock clock = _clockOf(context);
    final int? number = clock.wholeNumber(text);
    if (number == null) {
      return null;
    }
    return switch (field) {
      _Field.minute => number <= 59 ? number : null,
      _Field.hour when clock.twelve => number >= 1 && number <= 12 ? number : null,
      _Field.hour => number <= 23 ? number : null,
    };
  }

  /// TMP-23: each field holds its pending unit, as the time display writes it.
  void _fillFields() {
    _fieldErrors.clear();
    final _Clock clock = _clockOf(context);
    _fieldText[_Field.hour]!.text = clock.hourText(_hour);
    _fieldText[_Field.minute]!.text = clock.minuteText(_minute);
  }

  void _handleFieldChanged(_Field field, String text) {
    setState(() {
      // TMP-23: the next edit clears the error; a number of the unit becomes the pending one.
      _fieldErrors.remove(field);
      final int? number = _readField(field, text);
      if (number == null) {
        return;
      }
      if (field == _Field.minute) {
        _minute = number;
      } else {
        _hour = _clockOf(context).twelve ? _hour24(number, pm: _pm) : number;
      }
    });
  }

  void _handleFieldCommitted(_Field field, String text) {
    if (_readField(field, text) == null) {
      setState(() => _fieldErrors.add(field));
    }
  }

  /// TMP-23: the action key moves from the hour field to the minute field, and activates OK in the
  /// minute field.
  void _handleFieldSubmitted(_Field field) {
    if (field == _Field.hour) {
      _fieldNodes[_Field.minute]!.requestFocus();
    } else {
      _confirm();
    }
  }

  /// TMP-24: switch between the dial and text entry, keeping the pending time.
  void _toggleEntry() {
    setState(() {
      _entry = _text ? TanreiTimePickerEntryMode.dial : TanreiTimePickerEntryMode.text;
      if (!_text) {
        _unit = TanreiTimePickerUnit.hour;
      }
      _fillFields();
    });
    _focusLater(() => _text ? _fieldNodes[_Field.hour]! : _hourNode);
  }

  // --- Focus ---

  void _focusLater(FocusNode Function() target) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        target().requestFocus();
      }
    });
  }

  /// TMP-2: the selector of the unit, or the hour field.
  FocusNode _openingFocus() => _text
      ? _fieldNodes[_Field.hour]!
      : _unit == TanreiTimePickerUnit.minute
      ? _minuteNode
      : _hourNode;

  FocusNode get _chosenPeriodNode => _periodNodes[_pm ? 1 : 0];

  /// The parts Tab moves through, in reading order (the spec's keyboard table; TMP-10).
  List<FocusNode> _tabOrder() {
    final _Clock clock = _clockOf(context);
    return <FocusNode>[
      if (clock.periodFirst) _chosenPeriodNode,
      if (_text) ..._fieldNodes.values else ...<FocusNode>[_hourNode, _minuteNode],
      if (clock.twelve && !clock.periodFirst) _chosenPeriodNode,
      _entryNode,
      _cancelNode,
      _okNode,
    ].where((FocusNode node) => node.context != null && node.canRequestFocus).toList();
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is KeyUpEvent) {
      return KeyEventResult.ignored;
    }
    final LogicalKeyboardKey key = event.logicalKey;
    if (key == LogicalKeyboardKey.escape && event is KeyDownEvent) {
      // TMP-4: Escape closes without committing.
      widget.onClose?.call(TanreiTimePickerCloseReason.escape);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.tab) {
      return _handleTab(forward: !HardwareKeyboard.instance.isShiftPressed);
    }
    final FocusNode? primary = FocusManager.instance.primaryFocus;
    if (primary == _hourNode || primary == _minuteNode) {
      return _handleSelectorKey(
        primary == _hourNode ? TanreiTimePickerUnit.hour : TanreiTimePickerUnit.minute,
        key,
      );
    }
    if (_periodNodes.contains(primary) &&
        (key == LogicalKeyboardKey.arrowLeft || key == LogicalKeyboardKey.arrowRight)) {
      // TMP-11: as a group of radio buttons — the arrows move focus to the other segment and
      // choose it.
      final bool pm = primary == _periodNodes[0];
      _choosePeriod(pm);
      _focusLater(() => _periodNodes[pm ? 1 : 0]);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  /// TMP-1: Tab and Shift+Tab move through the parts and wrap; focus never leaves the picker.
  KeyEventResult _handleTab({required bool forward}) {
    final List<FocusNode> order = _tabOrder();
    if (order.isEmpty) {
      return KeyEventResult.ignored;
    }
    FocusNode? primary = FocusManager.instance.primaryFocus;
    if (_periodNodes.contains(primary)) {
      primary = _chosenPeriodNode;
    }
    final int index = primary == null ? -1 : order.indexOf(primary);
    final int next = index < 0
        ? (forward ? 0 : order.length - 1)
        : (index + (forward ? 1 : -1) + order.length) % order.length;
    order[next].requestFocus();
    return KeyEventResult.handled;
  }

  /// TMP-16: the arrows, Page Up and Page Down (minutes) and Home and End on a selector.
  KeyEventResult _handleSelectorKey(TanreiTimePickerUnit unit, LogicalKeyboardKey key) {
    final bool minute = unit == TanreiTimePickerUnit.minute;
    if (key == LogicalKeyboardKey.arrowUp || key == LogicalKeyboardKey.arrowRight) {
      _step(unit, 1);
    } else if (key == LogicalKeyboardKey.arrowDown || key == LogicalKeyboardKey.arrowLeft) {
      _step(unit, -1);
    } else if (minute && key == LogicalKeyboardKey.pageUp) {
      _step(unit, 5);
    } else if (minute && key == LogicalKeyboardKey.pageDown) {
      _step(unit, -5);
    } else if (key == LogicalKeyboardKey.home) {
      _toEnd(unit, last: false);
    } else if (key == LogicalKeyboardKey.end) {
      _toEnd(unit, last: true);
    } else {
      return KeyEventResult.ignored;
    }
    return KeyEventResult.handled;
  }

  // --- Measuring (TMP-7, TMP-8) ---

  void _scheduleMeasure() {
    if (_measuring) {
      return;
    }
    _measuring = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _measuring = false;
      if (!mounted) {
        return;
      }
      RenderBox? boxOf(GlobalKey key) {
        final RenderObject? box = key.currentContext?.findRenderObject();
        return box is RenderBox && box.hasSize ? box : null;
      }

      final RenderBox? labelBox = boxOf(_labelKey);
      final RenderBox? displayBox = boxOf(_displayKey);
      final RenderBox? actionsBox = boxOf(_actionsKey);
      final double? label = labelBox?.size.height;
      final Size? display = displayBox?.size;
      final double? actions = actionsBox?.size.height;
      // TMP-7: the width each part of the start column wants, whichever layout drew it — the label
      // on one line, the time, and the actions with Cancel and OK side by side.
      final double? start = labelBox == null || displayBox == null || actionsBox == null
          ? null
          : <RenderBox>[
              labelBox,
              displayBox,
              actionsBox,
            ].map((RenderBox box) => box.getMaxIntrinsicWidth(double.infinity)).reduce(math.max);
      bool differs(double? a, double? b) => b != null && (a == null || (a - b).abs() > 0.5);
      if (differs(_labelHeight, label) ||
          differs(_actionsHeight, actions) ||
          differs(_displaySize?.width, display?.width) ||
          differs(_displaySize?.height, display?.height) ||
          differs(_startWidth, start)) {
        setState(() {
          _labelHeight = label ?? _labelHeight;
          _actionsHeight = actions ?? _actionsHeight;
          _displaySize = display ?? _displaySize;
          _startWidth = start ?? _startWidth;
        });
      }
    });
  }

  /// TMP-7: horizontal where layout says so, or — layout auto — only when the room is lower than
  /// the vertical layout needs and wide enough for the horizontal one. Text entry is vertical.
  bool _horizontal(Size room) {
    if (_text) {
      return false;
    }
    switch (_props.layout) {
      case TanreiTimePickerLayout.horizontal:
        return true;
      case TanreiTimePickerLayout.vertical:
        return false;
      case TanreiTimePickerLayout.auto:
        final double? label = _labelHeight;
        final Size? display = _displaySize;
        final double? actions = _actionsHeight;
        final double? start = _startWidth;
        if (label == null ||
            display == null ||
            actions == null ||
            start == null ||
            !room.height.isFinite) {
          return false;
        }
        final TanreiTimePickerTokens tokens = _tokens;
        final double padding = tokens.containerPadding;
        final double vertical =
            2 * padding +
            label +
            tokens.containerGap +
            display.height +
            tokens.containerGap +
            tokens.dialContainerSize +
            tokens.actionsMarginBlockStart +
            actions;
        // The start column is as wide as its widest part — the label or the actions can be wider
        // than the time — beside the dial.
        final double horizontal =
            2 * padding + start + tokens.containerGap + tokens.dialContainerSize;
        return room.height < vertical && room.width >= horizontal;
    }
  }

  // --- Build ---

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final String label = _props.labels.label;
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    _scheduleMeasure();
    // TMP-26: a modal dialog named by label (the route's picker scopes and names the route).
    return Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: widget.takeFocus ? true : null,
      namesRoute: widget.takeFocus ? true : null,
      role: SemanticsRole.dialog,
      label: tanreiIsAccessibleName(label) ? label : null,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        includeSemantics: false,
        onKeyEvent: _handleKey,
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) => DecoratedBox(
            // TMP-1: the container's color, elevation and corners eased by the smoothing.
            decoration: TanreiContainerDecoration(
              shape: TanreiCornerShape(
                smoothing: theme.system.shape.cornerSmoothing,
                radius: tokens.containerShape,
              ),
              color: theme.paint(tokens.containerColor),
              border: elevation.ring,
              boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
            ),
            child: _buildContent(context, constraints.biggest),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Size room) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final _Clock clock = _clockOf(context);
    final double padding = tokens.containerPadding;
    final bool horizontal = _horizontal(room);

    final Widget label = ExcludeSemantics(
      // The label names the surface; it is not read twice.
      child: Text(
        _props.labels.label,
        key: _labelKey,
        textAlign: horizontal ? TextAlign.start : TextAlign.center,
        style: theme.textStyle(
          tokens.headerLabelTypescale,
          color: theme.paint(tokens.headerLabelColor),
        ),
      ),
    );
    final Widget actions = KeyedSubtree(key: _actionsKey, child: _buildActions(tokens));
    final Widget time = _text ? _buildFields(context, clock) : _buildDisplay(context, clock);

    if (horizontal) {
      // TMP-7: two columns — the label, the time and (at the bottom) the actions; the dial,
      // centred vertically. TMP-28: the columns mirror right to left.
      final Widget columns = Padding(
        padding: EdgeInsets.all(padding),
        child: IntrinsicHeight(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: tokens.containerGap,
            children: <Widget>[
              IntrinsicWidth(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: tokens.containerGap,
                      children: <Widget>[label, time],
                    ),
                    Padding(
                      padding: EdgeInsets.only(top: tokens.containerGap),
                      child: actions,
                    ),
                  ],
                ),
              ),
              Center(child: _buildDial(context, clock)),
            ],
          ),
        ),
      );
      // TMP-8: a window too short or too narrow for it scrolls the whole picker as one, down and
      // across (layout horizontal is kept however narrow the window; web's surface scrolls across
      // too). The vertical scroll is the nearer one.
      Widget whole = columns;
      if (room.height.isFinite) {
        whole = SingleChildScrollView(child: whole);
      }
      if (room.width.isFinite) {
        whole = SingleChildScrollView(scrollDirection: Axis.horizontal, child: whole);
      }
      return whole;
    }

    // TMP-7: the label, the time and the dial stacked and centred, the actions below.
    final Widget top = Padding(
      padding: EdgeInsets.fromLTRB(padding, padding, padding, 0),
      child: label,
    );
    final Widget middle = Padding(
      padding: EdgeInsets.fromLTRB(
        padding,
        tokens.containerGap,
        padding,
        tokens.actionsMarginBlockStart,
      ),
      child: _ReachHost(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: tokens.containerGap,
          children: <Widget>[time, if (!_text) _buildDial(context, clock)],
        ),
      ),
    );
    final Widget bottom = Padding(
      padding: EdgeInsets.fromLTRB(padding, 0, padding, padding),
      child: actions,
    );
    // TMP-8: the label and the actions stay while what is between them scrolls; when they alone
    // leave no room, everything scrolls together.
    final double? labelHeight = _labelHeight;
    final double? actionsHeight = _actionsHeight;
    final bool whole =
        room.height.isFinite &&
        labelHeight != null &&
        actionsHeight != null &&
        2 * padding +
                labelHeight +
                tokens.containerGap +
                tokens.actionsMarginBlockStart +
                actionsHeight +
                tokens.selectorContainerHeight >
            room.height;
    if (whole || !room.height.isFinite) {
      final Widget all = IntrinsicWidth(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[top, middle, bottom],
        ),
      );
      return room.height.isFinite ? SingleChildScrollView(child: all) : all;
    }
    return IntrinsicWidth(
      child: Flex(
        direction: Axis.vertical,
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        // Until the parts are measured (one frame), a room lower than the label and the actions
        // clips them rather than overflowing; the next frame scrolls them all.
        clipBehavior: Clip.hardEdge,
        children: <Widget>[
          top,
          Flexible(child: SingleChildScrollView(child: middle)),
          bottom,
        ],
      ),
    );
  }

  /// TMP-24: the entry-mode toggle at the start; Cancel and OK at the end, OK last.
  Widget _buildActions(TanreiTimePickerTokens tokens) {
    final TanreiTimePickerLabels labels = _props.labels;
    return Row(
      spacing: tokens.actionsGap,
      children: <Widget>[
        TanreiIconButton(
          focusNode: _entryNode,
          onPressed: _toggleEntry,
          icon: Text(_text ? _scheduleGlyph : _keyboardGlyph),
          semanticLabel: _text ? labels.dialEntryLabel : labels.textEntryLabel,
        ),
        Expanded(
          child: Align(
            alignment: AlignmentDirectional.centerEnd,
            child: OverflowBar(
              spacing: tokens.actionsGap,
              overflowSpacing: tokens.actionsGap,
              alignment: MainAxisAlignment.end,
              overflowAlignment: OverflowBarAlignment.end,
              children: <Widget>[
                TanreiButton(
                  focusNode: _cancelNode,
                  variant: TanreiButtonVariant.text,
                  onPressed: () => widget.onClose?.call(TanreiTimePickerCloseReason.cancel),
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
          ),
        ),
      ],
    );
  }

  /// TMP-9, TMP-10: the hour, the separator and the minute, left to right, with the period where
  /// the locale writes it.
  Widget _buildDisplay(BuildContext context, _Clock clock) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final TanreiTimePickerLabels labels = _props.labels;
    final double target = theme.system.measure.targetTouch;
    Widget selector(TanreiTimePickerUnit unit) {
      final bool hour = unit == TanreiTimePickerUnit.hour;
      final int next = hour ? _stepped(clock, 1) : (_minute + 1) % 60;
      final int previous = hour ? _stepped(clock, -1) : (_minute + 59) % 60;
      return TanreiTimePickerSelector._(
        key: ValueKey<TanreiTimePickerUnit>(unit),
        unit: unit,
        selected: _unit == unit,
        text: hour ? clock.hourText(_hour) : clock.minuteText(_minute),
        semanticLabel: hour ? labels.hourLabel : labels.minuteLabel,
        semanticValue: hour ? clock.hourValue(_hour) : clock.minuteText(_minute),
        increasedValue: hour ? clock.hourValue(next) : clock.minuteText(next),
        decreasedValue: hour ? clock.hourValue(previous) : clock.minuteText(previous),
        minWidth: math.max(tokens.selectorContainerWidth, target),
        minHeight: math.max(tokens.selectorContainerHeight, target),
        focusNode: hour ? _hourNode : _minuteNode,
        // TMP-16: a press shows the unit; it does not move focus (TMP-17).
        onPressed: () => _showUnit(unit),
        onIncrease: () => _step(unit, 1),
        onDecrease: () => _step(unit, -1),
      );
    }

    final Widget digits = Directionality(
      // TMP-28: a time is written left to right in every layout direction.
      textDirection: TextDirection.ltr,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: tokens.selectorGap,
        children: <Widget>[
          selector(TanreiTimePickerUnit.hour),
          ExcludeSemantics(
            child: Text(
              clock.separator,
              style: theme.textStyle(
                tokens.separatorTypescale,
                color: theme.paint(tokens.separatorColor),
              ),
            ),
          ),
          selector(TanreiTimePickerUnit.minute),
        ],
      ),
    );
    return KeyedSubtree(
      key: _displayKey,
      child: IntrinsicHeight(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            if (clock.periodFirst) _buildPeriod(context, clock, besideFields: false),
            digits,
            if (clock.twelve && !clock.periodFirst)
              _buildPeriod(context, clock, besideFields: false),
          ],
        ),
      ),
    );
  }

  int _stepped(_Clock clock, int delta) =>
      clock.twelve ? _hour24((_hour12(_hour) - 1 + delta) % 12 + 1, pm: _pm) : (_hour + delta) % 24;

  /// TMP-10, TMP-11, TMP-22: two segments, the one before noon first, in a border with a line
  /// between them; beside the fields as tall as a field, its target reaching above and below.
  Widget _buildPeriod(BuildContext context, _Clock clock, {required bool besideFields}) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final Color outline = theme.paint(tokens.periodOutlineColor);
    final double target = theme.system.measure.targetTouch;
    final TextDirection direction = Directionality.of(context);
    Widget segment(bool pm) => TanreiTimePickerPeriod._(
      key: ValueKey<bool>(pm),
      pm: pm,
      selected: pm == _pm,
      text: clock.periodName(pm),
      corners: TanreiCornerRadii.directional(
        start: pm ? 0 : tokens.periodContainerShape,
        end: pm ? tokens.periodContainerShape : 0,
        textDirection: direction,
      ),
      minWidth: math.max(tokens.periodContainerWidth, target),
      target: target,
      focusNode: _periodNodes[pm ? 1 : 0],
      onPressed: () => _choosePeriod(pm),
    );

    Widget group = DecoratedBox(
      position: DecorationPosition.foreground,
      decoration: TanreiContainerDecoration(
        shape: TanreiCornerShape(
          smoothing: theme.system.shape.cornerSmoothing,
          radius: tokens.periodContainerShape,
        ),
        border: outline.a > 0 && tokens.periodOutlineWidth > 0
            ? Border.all(color: outline, width: tokens.periodOutlineWidth)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          segment(false),
          SizedBox(
            width: tokens.periodOutlineWidth,
            child: ColoredBox(color: outline),
          ),
          segment(true),
        ],
      ),
    );
    if (besideFields) {
      // TMP-10, TMP-22: as tall as the fields' containers, level with them, however they grow
      // (_EntryRow gives it their height at least); its segments reach the target above and
      // below through the _ReachHost around the time.
      group = IntrinsicHeight(child: group);
    }
    return Padding(
      // TMP-10, TMP-28: period.margin-inline-start from what it sits beside, in the layout
      // direction.
      padding: clock.periodFirst
          ? EdgeInsetsDirectional.only(end: tokens.periodMarginInlineStart)
          : EdgeInsetsDirectional.only(start: tokens.periodMarginInlineStart),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        role: SemanticsRole.radioGroup,
        child: group,
      ),
    );
  }

  /// TMP-23: two outlined large number fields, the separator between them, the period as TMP-10
  /// places it.
  Widget _buildFields(BuildContext context, _Clock clock) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final TanreiTimePickerLabels labels = _props.labels;
    final TanreiTextFieldSizeTokens large = theme.system.textField.sizes[TanreiTextFieldSize.large];
    Widget field(_Field field) => SizedBox(
      width: tokens.selectorContainerWidth,
      child: TanreiTextField(
        key: ValueKey<_Field>(field),
        controller: _fieldText[field],
        focusNode: _fieldNodes[field],
        labelText: field == _Field.hour ? labels.hourLabel : labels.minuteLabel,
        variant: TanreiTextFieldVariant.outlined,
        size: TanreiTextFieldSize.large,
        type: TanreiTextFieldType.number,
        maxLength: 2,
        isError: _fieldErrors.contains(field),
        errorText: _fieldErrors.contains(field) ? labels.invalidText : '',
        onChanged: (String text) => _handleFieldChanged(field, text),
        onCommit: (String text) => _handleFieldCommitted(field, text),
        onSubmitted: (_) => _handleFieldSubmitted(field),
      ),
    );

    // Level with the fields' containers, however they grow (TMP-23).
    final Widget separator = ExcludeSemantics(
      child: Center(
        heightFactor: 1,
        child: Text(
          clock.separator,
          style: theme.textStyle(large.inputTypescale, color: theme.paint(tokens.separatorColor)),
        ),
      ),
    );
    Widget ltr(Widget child) => Directionality(textDirection: TextDirection.ltr, child: child);
    final bool before = clock.periodFirst;
    final bool after = clock.twelve && !clock.periodFirst;
    // TMP-28: a time is written left to right in every layout direction; the period sits before
    // or after it in the layout direction, and in reading and focus order where it is drawn
    // (TMP-10).
    return _EntryRow(
      gap: tokens.selectorGap,
      periodBefore: before,
      periodAfter: after,
      textDirection: Directionality.of(context),
      children: <Widget>[
        if (before) _buildPeriod(context, clock, besideFields: true),
        ltr(field(_Field.hour)),
        ltr(separator),
        ltr(field(_Field.minute)),
        if (after) _buildPeriod(context, clock, besideFields: true),
      ],
    );
  }

  Widget _buildDial(BuildContext context, _Clock clock) => _Dial(
    unit: _unit,
    hour: _hour,
    minute: _minute,
    clock: clock,
    animate: !_dragging,
    onSet: _handleDialSet,
    onRelease: _handleDialRelease,
  );
}

// ---------------------------------------------------------------------------------------------
// The selectors and the period's segments: pressables drawn from the tokens of their condition
// (TMP-9, TMP-10, TMP-17 … TMP-21).

/// The state, the change of condition and the press answer that the selectors and the period's
/// segments share.
mixin _ConditionPressable<W extends StatefulWidget>
    on TickerProviderStateMixin<W>, TanreiPressableStateMixin<W, TanreiControlVisuals> {
  TanreiTimePickerTokens get tokens => TanreiTheme.of(context).system.timePicker;

  /// Runs 0 → 1 while the part moves from [_conditionFrom] to its new condition (TMP-17).
  late final AnimationController _conditionChange = AnimationController(vsync: this, value: 1)
    ..addListener(() => setState(() {}));
  TanreiControlVisuals? _conditionFrom;
  TanreiControlVisuals? _last;

  @override
  Duration get stateTransitionDuration => tanreiDuration(tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _conditionChange.duration = tanreiDuration(tokens.motionStateDuration);
  }

  @override
  void dispose() {
    _conditionChange.dispose();
    super.dispose();
  }

  /// TMP-17: a change of condition eases over state-duration like a change of state; at once where
  /// motion is reduced, and while pressed (TMP-19: the press shows without delay).
  void conditionChanged() {
    final TanreiControlVisuals? last = _last;
    if (last == null || isPressed || (MediaQuery.maybeDisableAnimationsOf(context) ?? false)) {
      _conditionFrom = null;
      _conditionChange.value = 1;
      return;
    }
    _conditionFrom = last;
    unawaited(_conditionChange.forward(from: 0));
  }

  /// TMP-17, TMP-20: [condition]'s tokens in the drawn state, the container color in the container
  /// state, eased between states and conditions.
  TanreiControlVisuals visualsOf(
    TanreiTimePickerCondition condition, {
    required bool selector,
    required double shape,
  }) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerConditionTokens tones = tokens.conditions[condition];
    final TanreiTimePickerConditionStateTokens drawn = tones.of(drawnState);
    final TanreiTimePickerConditionStateTokens container = tones.of(containerState);
    final TanreiControlVisuals target = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: selector
            ? container.selectorContainerColor
            : container.periodContainerColor,
        labelColor: selector ? drawn.selectorLabelColor : drawn.periodLabelColor,
        outlineColor: selector ? drawn.selectorOutlineColor : const TanreiPaint.none(),
        elevation: const <TanreiShadowLayer>[],
        opacity: tokens.stateTokens(drawnState)?.opacity,
        shape: shape,
      ),
    );
    final TanreiControlVisuals? from = _conditionFrom;
    final TanreiControlVisuals visuals = from == null || _conditionChange.isCompleted || isPressed
        ? target
        : TanreiControlVisuals.lerp(from, target, stateCurve.transform(_conditionChange.value));
    _last = visuals;
    return visuals;
  }

  /// TMP-20: the ripple of a press, in the pressed container color of [condition].
  TanreiRipple? rippleOf(
    TanreiTimePickerCondition condition,
    TanreiControlVisuals visuals, {
    required bool selector,
  }) => rippleFor(
    pressedContainer: () {
      final TanreiTimePickerConditionStateTokens pressed = tokens.conditions[condition].pressed;
      return TanreiTheme.of(
        context,
      ).paint(selector ? pressed.selectorContainerColor : pressed.periodContainerColor);
    },
    container: visuals.container,
  );
}

/// The hour or the minute selector of a time picker (anatomy `selector`): an adjustable control
/// whose value is its unit's, drawn from the `selected` condition while the dial shows its unit
/// and from `unselected` otherwise (TMP-9, TMP-16). The picker builds it; a product never does.
class TanreiTimePickerSelector extends StatefulWidget {
  const TanreiTimePickerSelector._({
    super.key,
    required this.unit,
    required this.selected,
    required this.text,
    required this.semanticLabel,
    required this.semanticValue,
    required this.increasedValue,
    required this.decreasedValue,
    required double minWidth,
    required double minHeight,
    required FocusNode focusNode,
    required VoidCallback onPressed,
    required VoidCallback onIncrease,
    required VoidCallback onDecrease,
  }) : _minWidth = minWidth,
       _minHeight = minHeight,
       _focusNode = focusNode,
       _onPressed = onPressed,
       _onIncrease = onIncrease,
       _onDecrease = onDecrease;

  /// The selector's unit.
  final TanreiTimePickerUnit unit;

  /// Whether the dial shows its unit: drawn from the `selected` condition.
  final bool selected;

  /// The value as drawn, in the locale's digits.
  final String text;

  /// The accessible name: `hourLabel` or `minuteLabel`.
  final String semanticLabel;

  /// The value read out: the text, with the period for a 12-hour hour ("7 AM").
  final String semanticValue;

  /// The value one later.
  final String increasedValue;

  /// The value one earlier.
  final String decreasedValue;

  final double _minWidth;
  final double _minHeight;
  final FocusNode _focusNode;
  final VoidCallback _onPressed;
  final VoidCallback _onIncrease;
  final VoidCallback _onDecrease;

  @override
  State<TanreiTimePickerSelector> createState() => _SelectorState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiTimePickerUnit>('unit', unit))
      ..add(FlagProperty('selected', value: selected, ifTrue: 'selected'))
      ..add(StringProperty('text', text));
  }
}

class _SelectorState extends State<TanreiTimePickerSelector>
    with
        TickerProviderStateMixin<TanreiTimePickerSelector>,
        TanreiPressableStateMixin<TanreiTimePickerSelector, TanreiControlVisuals>,
        _ConditionPressable<TanreiTimePickerSelector> {
  @override
  VoidCallback? get onPressed => widget._onPressed;

  TanreiTimePickerCondition get _condition =>
      widget.selected ? TanreiTimePickerCondition.selected : TanreiTimePickerCondition.unselected;

  @override
  void didUpdateWidget(TanreiTimePickerSelector oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected) {
      conditionChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final TanreiTimePickerCondition condition = _condition;
    final TanreiControlVisuals visuals = visualsOf(
      condition,
      selector: true,
      shape: tokens.selectorContainerShape,
    );
    final TanreiRipple? ripple = rippleOf(condition, visuals, selector: true);
    final double outlineWidth = tokens.conditions[condition].of(drawnState).selectorOutlineWidth;
    return Semantics(
      container: true,
      label: widget.semanticLabel,
      value: widget.semanticValue,
      increasedValue: widget.increasedValue,
      decreasedValue: widget.decreasedValue,
      onIncrease: widget._onIncrease,
      onDecrease: widget._onDecrease,
      child: buildPressable(
        focusNode: widget._focusNode,
        child: Opacity(
          opacity: visuals.opacity,
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: BorderRadius.circular(visuals.shape),
            child: ConstrainedBox(
              // TMP-8, TMP-22: at least the container (and the target), growing with its text.
              constraints: BoxConstraints(minWidth: widget._minWidth, minHeight: widget._minHeight),
              child: TanreiControlContainer(
                key: pressContainerKey,
                visuals: visuals,
                shape: TanreiCornerShape(
                  smoothing: theme.system.shape.cornerSmoothing,
                  radius: visuals.shape,
                ),
                outlineWidth: outlineWidth,
                ripple: ripple,
                child: Center(
                  widthFactor: 1,
                  heightFactor: 1,
                  child: ExcludeSemantics(
                    child: Text(
                      widget.text,
                      style: theme.textStyle(tokens.selectorLabelTypescale, color: visuals.label),
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

/// One segment of a time picker's period selector (anatomy `period`): before noon ([pm] false) or
/// after noon, drawn from the `selected` condition for the pending period and from `unselected` for
/// the other (TMP-10). The picker builds it; a product never does.
class TanreiTimePickerPeriod extends StatefulWidget {
  const TanreiTimePickerPeriod._({
    super.key,
    required this.pm,
    required this.selected,
    required this.text,
    required TanreiCornerRadii corners,
    required double minWidth,
    required double target,
    required FocusNode focusNode,
    required VoidCallback onPressed,
  }) : _corners = corners,
       _minWidth = minWidth,
       _target = target,
       _focusNode = focusNode,
       _onPressed = onPressed;

  /// Whether this is the segment after noon.
  final bool pm;

  /// Whether its period is the pending one: drawn from the `selected` condition and checked.
  final bool selected;

  /// The locale's name of the period ("AM"), its accessible name.
  final String text;

  final TanreiCornerRadii _corners;
  final double _minWidth;
  final double _target;
  final FocusNode _focusNode;
  final VoidCallback _onPressed;

  @override
  State<TanreiTimePickerPeriod> createState() => _PeriodState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('pm', value: pm, ifTrue: 'PM', ifFalse: 'AM'))
      ..add(FlagProperty('selected', value: selected, ifTrue: 'selected'));
  }
}

class _PeriodState extends State<TanreiTimePickerPeriod>
    with
        TickerProviderStateMixin<TanreiTimePickerPeriod>,
        TanreiPressableStateMixin<TanreiTimePickerPeriod, TanreiControlVisuals>,
        _ConditionPressable<TanreiTimePickerPeriod> {
  @override
  VoidCallback? get onPressed => widget._onPressed;

  TanreiTimePickerCondition get _condition =>
      widget.selected ? TanreiTimePickerCondition.selected : TanreiTimePickerCondition.unselected;

  @override
  void didUpdateWidget(TanreiTimePickerPeriod oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selected != widget.selected) {
      conditionChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final TanreiTimePickerCondition condition = _condition;
    final TanreiControlVisuals visuals = visualsOf(
      condition,
      selector: false,
      shape: tokens.periodContainerShape,
    );
    final TanreiRipple? ripple = rippleOf(condition, visuals, selector: false);
    final TanreiCornerRadii corners = widget._corners;
    // TMP-11: one tab stop, the chosen segment.
    widget._focusNode.skipTraversal = !widget.selected;
    // TMP-22: the target reaches above and below a segment drawn lower than it (beside the fields);
    // TMP-26: a radio button named by the period.
    return _TargetReach(
      minExtent: widget._target,
      child: Semantics(
        checked: widget.selected,
        inMutuallyExclusiveGroup: true,
        label: widget.text,
        child: buildPressable(
          focusNode: widget._focusNode,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(corners.topLeft),
                topRight: Radius.circular(corners.topRight),
                bottomRight: Radius.circular(corners.bottomRight),
                bottomLeft: Radius.circular(corners.bottomLeft),
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(minWidth: widget._minWidth),
                child: DecoratedBox(
                  key: pressContainerKey,
                  decoration: visuals.decoration(
                    TanreiCornerShape.only(
                      smoothing: theme.system.shape.cornerSmoothing,
                      corners: corners,
                    ),
                    outlineWidth: 0,
                    ripple: ripple,
                  ),
                  child: Center(
                    widthFactor: 1,
                    heightFactor: 1,
                    child: ExcludeSemantics(
                      child: Text(
                        widget.text,
                        style: theme.textStyle(tokens.periodLabelTypescale, color: visuals.label),
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
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------
// TMP-22: a target that reaches above and below a part drawn lower than it, without changing the
// layout: nothing sits above or below the period beside the fields.

/// TMP-10, TMP-23: the text entry's row: [children] are the period where [periodBefore], the
/// hour field, the separator, the minute field, and the period where [periodAfter], in reading
/// order. The time is drawn left to right, the fields [gap] from the separator; the period before
/// or after it in [textDirection], with its own margin. The separator and the period are at least
/// as tall as the fields' containers and centred on them, however the fields grow around their
/// containers (a label that wraps, TXF-13; enlarged text, TXF-16).
class _EntryRow extends MultiChildRenderObjectWidget {
  const _EntryRow({
    required this.gap,
    required this.periodBefore,
    required this.periodAfter,
    required this.textDirection,
    required super.children,
  });

  final double gap;
  final bool periodBefore;
  final bool periodAfter;
  final TextDirection textDirection;

  @override
  _RenderEntryRow createRenderObject(BuildContext context) => _RenderEntryRow(
    gap: gap,
    periodBefore: periodBefore,
    periodAfter: periodAfter,
    textDirection: textDirection,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderEntryRow renderObject) {
    renderObject
      ..gap = gap
      ..periodBefore = periodBefore
      ..periodAfter = periodAfter
      ..textDirection = textDirection;
  }
}

class _EntryRowParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderEntryRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _EntryRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _EntryRowParentData> {
  _RenderEntryRow({
    required double gap,
    required bool periodBefore,
    required bool periodAfter,
    required TextDirection textDirection,
  }) : _gap = gap,
       _periodBefore = periodBefore,
       _periodAfter = periodAfter,
       _textDirection = textDirection;

  double _gap;
  set gap(double value) {
    if (value != _gap) {
      _gap = value;
      markNeedsLayout();
    }
  }

  bool _periodBefore;
  set periodBefore(bool value) {
    if (value != _periodBefore) {
      _periodBefore = value;
      markNeedsLayout();
    }
  }

  bool _periodAfter;
  set periodAfter(bool value) {
    if (value != _periodAfter) {
      _periodAfter = value;
      markNeedsLayout();
    }
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      markNeedsLayout();
    }
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _EntryRowParentData) {
      child.parentData = _EntryRowParentData();
    }
  }

  /// The children as drawn, left to right: each, whether it is levelled with the fields'
  /// containers (the separator and the period) rather than a field, and the space before it.
  List<(RenderBox child, bool levelled, double gap)> get _ordered {
    final List<RenderBox> all = getChildrenAsList();
    final int at = _periodBefore ? 1 : 0;
    final RenderBox? before = _periodBefore ? all[0] : null;
    final RenderBox? after = _periodAfter ? all[at + 3] : null;
    final bool rtl = _textDirection == TextDirection.rtl;
    final RenderBox? left = rtl ? after : before;
    final RenderBox? right = rtl ? before : after;
    return <(RenderBox, bool, double)>[
      if (left != null) (left, true, 0),
      (all[at], false, 0),
      (all[at + 1], true, _gap),
      (all[at + 2], false, _gap),
      if (right != null) (right, true, 0),
    ];
  }

  double _width(double Function(RenderBox child) of) {
    final List<(RenderBox, bool, double)> ordered = _ordered;
    double width = 0;
    for (int i = 0; i < ordered.length; i++) {
      width += ordered[i].$3 + of(ordered[i].$1);
    }
    return width;
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      _width((RenderBox child) => child.getMinIntrinsicWidth(height));

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _width((RenderBox child) => child.getMaxIntrinsicWidth(height));

  // Without a layout the containers cannot be found: the tallest child is the estimate (the
  // separator and the period are no taller than the fields' containers unless their own text
  // is).
  double _height(double Function(RenderBox child) of) {
    double height = 0;
    for (final (RenderBox child, bool _, double _) in _ordered) {
      height = math.max(height, of(child));
    }
    return height;
  }

  @override
  double computeMinIntrinsicHeight(double width) =>
      _height((RenderBox child) => child.getMinIntrinsicHeight(double.infinity));

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _height((RenderBox child) => child.getMaxIntrinsicHeight(double.infinity));

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) {
    final BoxConstraints loose = BoxConstraints(maxHeight: constraints.maxHeight);
    final List<(RenderBox, bool, double)> ordered = _ordered;
    double width = 0;
    double height = 0;
    for (int i = 0; i < ordered.length; i++) {
      final Size size = ordered[i].$1.getDryLayout(loose);
      width += ordered[i].$3 + size.width;
      height = math.max(height, size.height);
    }
    return constraints.constrain(Size(width, height));
  }

  @override
  void performLayout() {
    final BoxConstraints loose = BoxConstraints(maxHeight: constraints.maxHeight);
    final List<(RenderBox, bool, double)> ordered = _ordered;
    // The fields first: where their containers are. The two containers' tops are aligned (a
    // label may wrap in one field and not in the other).
    final Map<RenderBox, Rect> containers = <RenderBox, Rect>{};
    for (final (RenderBox child, bool levelled, double _) in ordered) {
      if (!levelled) {
        child.layout(loose, parentUsesSize: true);
        containers[child] =
            tanreiFieldContainerRectIn(child) ?? Offset.zero & Size(0, child.size.height);
      }
    }
    final double bandTop = containers.values.map((Rect r) => r.top).reduce(math.max);
    final double bandHeight = containers.values.map((Rect r) => r.height).reduce(math.max);
    // Then the separator and the period: at least as tall as a container, centred on it.
    for (final (RenderBox child, bool levelled, double _) in ordered) {
      if (levelled) {
        child.layout(
          BoxConstraints(minHeight: bandHeight, maxHeight: constraints.maxHeight),
          parentUsesSize: true,
        );
      }
    }
    final double bandCentre = bandTop + bandHeight / 2;
    double top = 0;
    final List<double> tops = <double>[
      for (final (RenderBox child, bool levelled, double _) in ordered)
        levelled ? bandCentre - child.size.height / 2 : bandTop - containers[child]!.top,
    ];
    for (final double t in tops) {
      top = math.min(top, t);
    }
    double x = 0;
    double bottom = 0;
    for (int i = 0; i < ordered.length; i++) {
      final RenderBox child = ordered[i].$1;
      x += ordered[i].$3;
      final double y = tops[i] - top;
      (child.parentData! as _EntryRowParentData).offset = Offset(x, y);
      x += child.size.width;
      bottom = math.max(bottom, y + child.size.height);
    }
    size = constraints.constrain(Size(x, bottom));
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}

/// Hit-tests and describes [child] as at least [minExtent] tall, reaching equally above and below
/// what it draws. Its semantics node is its own and has that height. Points outside its parent
/// reach it only through a [_ReachHost] above it.
class _TargetReach extends SingleChildRenderObjectWidget {
  const _TargetReach({required this.minExtent, required Widget super.child});

  final double minExtent;

  @override
  _RenderTargetReach createRenderObject(BuildContext context) => _RenderTargetReach(minExtent);

  @override
  void updateRenderObject(BuildContext context, _RenderTargetReach renderObject) {
    renderObject.minExtent = minExtent;
  }
}

class _RenderTargetReach extends RenderProxyBox {
  _RenderTargetReach(this._minExtent);

  double _minExtent;
  set minExtent(double value) {
    if (value != _minExtent) {
      _minExtent = value;
      markNeedsSemanticsUpdate();
    }
  }

  /// How far the target reaches above and below the drawing.
  double get reach => hasSize ? math.max(0, (_minExtent - size.height) / 2) : 0;

  /// The target, in this box's coordinates.
  Rect get target => Rect.fromLTRB(0, -reach, size.width, size.height + reach);

  @override
  Rect get semanticBounds => target;

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = true;
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!target.contains(position)) {
      return false;
    }
    // A point in the reach presses the part at the same distance along it, at its nearest edge.
    final Offset inside = Offset(
      position.dx,
      position.dy.clamp(0, math.max(0, size.height - 1)).toDouble(),
    );
    if (hitTestChildren(result, position: inside)) {
      result.add(BoxHitTestEntry(this, inside));
      return true;
    }
    return false;
  }
}

/// Lets the targets of the [_TargetReach]es below it reach past their parents' boxes, and past its
/// own where its parent lets the point through.
class _ReachHost extends SingleChildRenderObjectWidget {
  const _ReachHost({required Widget super.child});

  @override
  RenderProxyBox createRenderObject(BuildContext context) => _RenderReachHost();
}

class _RenderReachHost extends RenderProxyBox {
  List<_RenderTargetReach> _reaches() {
    final List<_RenderTargetReach> found = <_RenderTargetReach>[];
    void visit(RenderObject child) {
      if (child is _RenderTargetReach) {
        if (child.reach > 0) {
          found.add(child);
        }
        return;
      }
      child.visitChildren(visit);
    }

    visitChildren(visit);
    return found;
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (size.contains(position) && super.hitTest(result, position: position)) {
      return true;
    }
    for (final _RenderTargetReach reach in _reaches()) {
      final Matrix4 transform = reach.getTransformTo(this);
      final Matrix4? inverse = Matrix4.tryInvert(transform);
      if (inverse == null) {
        continue;
      }
      final Offset local = MatrixUtils.transformPoint(inverse, position);
      if (!reach.target.contains(local)) {
        continue;
      }
      final bool hit = result.addWithPaintTransform(
        transform: transform,
        position: position,
        hitTest: (BoxHitTestResult result, Offset position) =>
            reach.hitTest(result, position: position),
      );
      if (hit) {
        result.add(BoxHitTestEntry(this, position));
        return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// The dial (TMP-12 … TMP-15).

/// Where a value lies on the dial: degrees clockwise from the top and the distance from the centre.
@immutable
class _DialPoint {
  const _DialPoint(this.angle, this.radius);

  final double angle;
  final double radius;

  /// [t] of the way from [a] to [b] along the shorter arc (TMP-15).
  static _DialPoint lerp(_DialPoint a, _DialPoint b, double t) {
    final double delta = ((b.angle - a.angle) % 360 + 540) % 360 - 180;
    return _DialPoint(a.angle + delta * t, lerpDouble(a.radius, b.radius, t)!);
  }

  @override
  bool operator ==(Object other) =>
      other is _DialPoint && other.angle == angle && other.radius == radius;

  @override
  int get hashCode => Object.hash(angle, radius);
}

class _Dial extends StatefulWidget {
  const _Dial({
    required this.unit,
    required this.hour,
    required this.minute,
    required this.clock,
    required this.animate,
    required this.onSet,
    required this.onRelease,
  });

  final TanreiTimePickerUnit unit;
  final int hour;
  final int minute;
  final _Clock clock;

  /// Whether a change of value moves the handle over the dial motion (not while dragging).
  final bool animate;
  final ValueChanged<int> onSet;
  final VoidCallback onRelease;

  @override
  State<_Dial> createState() => _DialState();
}

class _DialState extends State<_Dial> with TickerProviderStateMixin {
  late final AnimationController _move = AnimationController(vsync: this, value: 1);
  late final AnimationController _fade = AnimationController(vsync: this, value: 1);
  _DialPoint? _from;
  _DialPoint? _drawn;
  TanreiTimePickerUnit? _fadeFrom;
  int? _pointer;

  TanreiTimePickerTokens get _tokens => TanreiTheme.of(context).system.timePicker;
  double get _outer =>
      _tokens.dialContainerSize / 2 - _tokens.dialPadding - _tokens.dialHandleSize / 2;
  double get _inner => _outer - _tokens.dialHandleSize;
  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final Duration duration = tanreiDuration(_tokens.motionDialDuration);
    _move.duration = duration;
    _fade.duration = duration;
  }

  @override
  void didUpdateWidget(_Dial oldWidget) {
    super.didUpdateWidget(oldWidget);
    final bool unitChanged = oldWidget.unit != widget.unit;
    if (unitChanged) {
      // TMP-15: the numbers cross-fade.
      if (_reduceMotion) {
        _fadeFrom = null;
        _fade.value = 1;
      } else {
        _fadeFrom = oldWidget.unit;
        unawaited(_fade.forward(from: 0));
      }
    }
    final _DialPoint target = _pointOf(widget.unit, widget.hour, widget.minute);
    final _DialPoint? drawn = _drawn;
    if (drawn != null && drawn != target) {
      // TMP-14, TMP-15: at once while dragging and where motion is reduced; otherwise along the
      // shorter arc.
      if (_reduceMotion || (!widget.animate && !unitChanged)) {
        _from = null;
        _move.value = 1;
      } else {
        _from = drawn;
        unawaited(_move.forward(from: 0));
      }
    }
  }

  @override
  void dispose() {
    _move.dispose();
    _fade.dispose();
    super.dispose();
  }

  /// TMP-13: an hour at its number (the inner ring for 12 to 23 on the 24-hour clock); a minute at
  /// six degrees a minute.
  _DialPoint _pointOf(TanreiTimePickerUnit unit, int hour, int minute) =>
      unit == TanreiTimePickerUnit.minute
      ? _DialPoint(minute * 6.0, _outer)
      : _DialPoint((hour % 12) * 30.0, !widget.clock.twelve && hour >= 12 ? _inner : _outer);

  /// TMP-14: the value nearest the pointer's angle (on the 24-hour hour dial, on the nearer ring).
  int _valueAt(Offset position) {
    final double center = _tokens.dialContainerSize / 2;
    final double dx = position.dx - center;
    final double dy = position.dy - center;
    final double degrees = (math.atan2(dx, -dy) * 180 / math.pi + 360) % 360;
    if (widget.unit == TanreiTimePickerUnit.minute) {
      return (degrees / 6).round() % 60;
    }
    final int index = (degrees / 30).round() % 12;
    if (widget.clock.twelve) {
      return _hour24(index == 0 ? 12 : index, pm: widget.hour >= 12);
    }
    final double distance = math.sqrt(dx * dx + dy * dy);
    return (distance - _inner).abs() < (distance - _outer).abs() ? index + 12 : index;
  }

  void _handleDown(PointerDownEvent event) {
    if (_pointer != null) {
      return;
    }
    _pointer = event.pointer;
    widget.onSet(_valueAt(event.localPosition));
  }

  void _handleMove(PointerMoveEvent event) {
    if (event.pointer == _pointer) {
      widget.onSet(_valueAt(event.localPosition));
    }
  }

  void _handleEnd(PointerEvent event) {
    if (event.pointer == _pointer) {
      _pointer = null;
      widget.onRelease();
    }
  }

  /// TMP-12: the twelve numbers of [unit], clockwise from the top.
  List<({String text, _DialPoint point})> _numbers(TanreiTimePickerUnit unit) {
    final TanreiDateLocalizations localizations = widget.clock.localizations;
    if (unit == TanreiTimePickerUnit.minute) {
      return <({String text, _DialPoint point})>[
        for (int i = 0; i < 12; i++)
          (
            text: localizations.formatNumber(i * 5, minDigits: 2),
            point: _DialPoint(i * 30.0, _outer),
          ),
      ];
    }
    if (widget.clock.twelve) {
      return <({String text, _DialPoint point})>[
        for (int i = 0; i < 12; i++)
          (text: localizations.formatNumber(i == 0 ? 12 : i), point: _DialPoint(i * 30.0, _outer)),
      ];
    }
    return <({String text, _DialPoint point})>[
      for (int i = 0; i < 12; i++)
        (text: localizations.formatNumber(i, minDigits: 2), point: _DialPoint(i * 30.0, _outer)),
      for (int i = 0; i < 12; i++)
        (
          text: localizations.formatNumber(i + 12, minDigits: 2),
          point: _DialPoint(i * 30.0, _inner),
        ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTimePickerTokens tokens = theme.system.timePicker;
    final _DialPoint target = _pointOf(widget.unit, widget.hour, widget.minute);
    final Curve curve = tokens.motionDialEasing.toCurve();
    final double size = tokens.dialContainerSize;
    // TMP-14, TMP-26: a pointer surface hidden from assistive technology; the selectors and the
    // fields are its controls. It wins its presses over a scrolling ancestor.
    return ExcludeSemantics(
      child: RawGestureDetector(
        gestures: <Type, GestureRecognizerFactory>{
          EagerGestureRecognizer: GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(
            EagerGestureRecognizer.new,
            (EagerGestureRecognizer instance) {},
          ),
        },
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: _handleDown,
          onPointerMove: _handleMove,
          onPointerUp: _handleEnd,
          onPointerCancel: _handleEnd,
          child: AnimatedBuilder(
            animation: Listenable.merge(<Listenable>[_move, _fade]),
            builder: (BuildContext context, Widget? child) {
              final _DialPoint? from = _from;
              final _DialPoint handle = from == null || _move.isCompleted
                  ? target
                  : _DialPoint.lerp(from, target, curve.transform(_move.value));
              _drawn = handle;
              final TanreiTimePickerUnit? fadeFrom = _fade.isCompleted ? null : _fadeFrom;
              final double fade = fadeFrom == null ? 1 : curve.transform(_fade.value);
              return CustomPaint(
                key: const ValueKey<String>('tanrei-time-picker-dial'),
                size: Size.square(size),
                painter: _DialPainter(
                  size: size,
                  dialColor: theme.paint(tokens.dialContainerColor),
                  labelStyle: theme.textStyle(tokens.dialLabelTypescale),
                  labelColor: theme.paint(tokens.dialLabelColor),
                  selectedLabelColor: theme.paint(tokens.dialSelectedLabelColor),
                  handleColor: theme.paint(tokens.dialHandleColor),
                  handleSize: tokens.dialHandleSize,
                  trackColor: theme.paint(tokens.dialTrackColor),
                  trackWidth: tokens.dialTrackWidth,
                  centerSize: tokens.dialCenterSize,
                  textScaler: MediaQuery.maybeTextScalerOf(context) ?? TextScaler.noScaling,
                  layers: <({List<({String text, _DialPoint point})> numbers, double opacity})>[
                    if (fadeFrom != null) (numbers: _numbers(fadeFrom), opacity: 1 - fade),
                    (numbers: _numbers(widget.unit), opacity: fade),
                  ],
                  handle: handle,
                  // TMP-13: a minute between the multiples of five holds a dot.
                  between: widget.unit == TanreiTimePickerUnit.minute && widget.minute % 5 != 0,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _DialPainter extends CustomPainter {
  _DialPainter({
    required this.size,
    required this.dialColor,
    required this.labelStyle,
    required this.labelColor,
    required this.selectedLabelColor,
    required this.handleColor,
    required this.handleSize,
    required this.trackColor,
    required this.trackWidth,
    required this.centerSize,
    required this.textScaler,
    required this.layers,
    required this.handle,
    required this.between,
  });

  final double size;
  final Color dialColor;
  final TextStyle labelStyle;
  final Color labelColor;
  final Color selectedLabelColor;
  final Color handleColor;
  final double handleSize;
  final Color trackColor;
  final double trackWidth;
  final double centerSize;
  final TextScaler textScaler;
  final List<({List<({String text, _DialPoint point})> numbers, double opacity})> layers;
  final _DialPoint handle;
  final bool between;

  Offset _offsetOf(Offset center, _DialPoint point) {
    final double radians = point.angle * math.pi / 180;
    return center + Offset(point.radius * math.sin(radians), -point.radius * math.cos(radians));
  }

  void _paintNumbers(Canvas canvas, Offset center, Color color) {
    for (final ({List<({String text, _DialPoint point})> numbers, double opacity}) layer
        in layers) {
      if (layer.opacity <= 0) {
        continue;
      }
      final Color faded = color.withValues(alpha: color.a * layer.opacity);
      for (final ({String text, _DialPoint point}) number in layer.numbers) {
        final TextPainter painter = TextPainter(
          text: TextSpan(
            text: number.text,
            style: labelStyle.copyWith(color: faded),
          ),
          textDirection: TextDirection.ltr,
          textScaler: textScaler,
          maxLines: 1,
        )..layout();
        final Offset at = _offsetOf(center, number.point);
        painter.paint(canvas, at - Offset(painter.width / 2, painter.height / 2));
        painter.dispose();
      }
    }
  }

  @override
  void paint(Canvas canvas, Size _) {
    final Offset center = Offset(size / 2, size / 2);
    // TMP-12: the face.
    canvas.drawCircle(center, size / 2, Paint()..color = dialColor);
    // TMP-13: the track from the centre to the handle, and the centre dot.
    final Offset at = _offsetOf(center, handle);
    final Paint track = Paint()..color = trackColor;
    canvas.drawLine(center, at, track..strokeWidth = trackWidth);
    canvas.drawCircle(center, centerSize / 2, Paint()..color = trackColor);
    _paintNumbers(canvas, center, labelColor);
    // The handle, and the part of a number under it in the selected-label color.
    canvas.drawCircle(at, handleSize / 2, Paint()..color = handleColor);
    canvas
      ..save()
      ..clipPath(Path()..addOval(Rect.fromCircle(center: at, radius: handleSize / 2)));
    _paintNumbers(canvas, center, selectedLabelColor);
    canvas.restore();
    if (between) {
      canvas.drawCircle(at, centerSize / 2, Paint()..color = selectedLabelColor);
    }
  }

  @override
  bool shouldRepaint(_DialPainter old) => true;
}
