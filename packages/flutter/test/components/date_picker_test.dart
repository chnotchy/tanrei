import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import 'fixture_golden.dart';
import 'navigation_harness.dart'
    show collectIgnoredValues, hoverOver, nodesBelow, nodesWithRole, semanticsRoot;
import 'sheet_harness.dart' show tabTimes;

const TanreiSystem system = tanreiSystem;
final TanreiDatePickerTokens pickerTokens = system.datePicker;

/// The stages of the fixtures (DTP-1's `verify`): 480 x 640 for a modal picker, 400 x 440 for a
/// docked one, each inside the `space200` padding of every baseline.
const Size modalStage = Size(480, 640);
const Size dockedStage = Size(400, 440);
Size frameOf(Size stage) =>
    Size(stage.width + 2 * system.space.space200, stage.height + 2 * system.space.space200);

final List<Map<String, dynamic>> fixtures = specFixtures('date-picker');

Map<String, dynamic> fixture(String id) =>
    fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == id);

DateTime? date(Object? iso) => iso == null ? null : TanreiDatePicker.parseDate(iso as String);

/// A fixture's props as the picker's arguments.
class FixtureArgs {
  FixtureArgs(Map<String, dynamic> fixture) : props = fixture['props'] as Map<String, dynamic>;

  final Map<String, dynamic> props;

  TanreiDatePickerPresentation get presentation =>
      TanreiDatePickerPresentation.fromName(props['presentation'] as String? ?? 'modal');
  TanreiDatePickerMode get mode =>
      TanreiDatePickerMode.fromName(props['mode'] as String? ?? 'single');
  TanreiDatePickerEntryMode get entryMode =>
      TanreiDatePickerEntryMode.fromName(props['entryMode'] as String? ?? 'calendar');
  TanreiDatePickerStartView get startView =>
      TanreiDatePickerStartView.fromName(props['startView'] as String? ?? 'day');
  TanreiDatePickerFirstDayOfWeek get firstDayOfWeek =>
      TanreiDatePickerFirstDayOfWeek.fromName(props['firstDayOfWeek'] as String? ?? 'locale');
  DateTime? get value => date(props['value']);
  DateTime? get start => date(props['start']);
  DateTime? get end => date(props['end']);
  DateTime? get min => date(props['min']);
  DateTime? get max => date(props['max']);
  DateTime? get today => date(props['today']);
  List<DateTime> get disabledDates => <DateTime>[
    for (final Object? iso in props['disabledDates'] as List<dynamic>? ?? const <dynamic>[])
      date(iso)!,
  ];
  Locale? get locale {
    final String? tag = props['locale'] as String?;
    if (tag == null || tag.isEmpty) {
      return null;
    }
    final List<String> parts = tag.split('-');
    return Locale(parts.first, parts.length > 1 ? parts[1] : null);
  }

  TanreiDatePickerLabels get labels => props['label'] == null
      ? const TanreiDatePickerLabels()
      : TanreiDatePickerLabels(label: props['label'] as String);
}

/// Presents [fixture] modally from [context].
Future<TanreiDateSelection?> showFixture(BuildContext context, Map<String, dynamic> fixture) {
  final FixtureArgs args = FixtureArgs(fixture);
  return showTanreiDatePicker(
    context: context,
    mode: args.mode,
    value: args.value,
    start: args.start,
    end: args.end,
    firstDate: args.min,
    lastDate: args.max,
    disabledDates: args.disabledDates,
    currentDate: args.today,
    firstDayOfWeek: args.firstDayOfWeek,
    locale: args.locale,
    entryMode: args.entryMode,
    startView: args.startView,
    labels: args.labels,
  );
}

/// [fixture] drawn in place.
TanreiDatePicker inPlace(Map<String, dynamic> fixture) {
  final FixtureArgs args = FixtureArgs(fixture);
  return TanreiDatePicker(
    presentation: args.presentation,
    mode: args.mode,
    value: args.value,
    start: args.start,
    end: args.end,
    firstDate: args.min,
    lastDate: args.max,
    disabledDates: args.disabledDates,
    currentDate: args.today,
    firstDayOfWeek: args.firstDayOfWeek,
    locale: args.locale,
    entryMode: args.entryMode,
    startView: args.startView,
    labels: args.labels,
  );
}

/// Captures a fixture's stage, settled, against [file]: a modal fixture presented with
/// [showTanreiDatePicker] over the stage, a docked one drawn in place in its middle.
Future<void> expectPickerGolden(
  WidgetTester tester, {
  required TanreiSystem system,
  required Map<String, dynamic> fixture,
  required String file,
}) async {
  final bool modal = FixtureArgs(fixture).presentation == TanreiDatePickerPresentation.modal;
  final GlobalKey stageKey = GlobalKey();
  final Size stage = modal ? modalStage : dockedStage;
  final GlobalKey boundary = await pumpFixtureFrame(
    tester,
    system: system,
    surface: frameOf(stage),
    child: SizedBox.fromSize(
      size: stage,
      child: modal
          ? Navigator(
              onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
                pageBuilder: (BuildContext context, _, _) =>
                    ColoredBox(key: stageKey, color: TanreiTheme.of(context).colors.surface),
              ),
            )
          : Center(child: inPlace(fixture)),
    ),
  );
  if (modal) {
    unawaited(showFixture(stageKey.currentContext!, fixture));
  }
  await tester.pumpAndSettle();
  // DTP-1's `verify`: the open picker as drawn, not where focus went — a focused text field would
  // draw its caret and focused outline, which the other platforms' fixtures do not.
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final RenderRepaintBoundary render =
      boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final ui.Image image = (await tester.runAsync(
    () => render.toImage(pixelRatio: goldenPixelRatio),
  ))!;
  addTearDown(image.dispose);
  await expectLater(image, matchesGoldenFile(file));
}

// ---------------------------------------------------------------------------------------------
// The harness of the behaviour tests.

const TanreiThemeData lightTheme = TanreiThemeData.light;
Duration ms(int value) => Duration(milliseconds: value);

/// A day of 2026 (September by default): the month every fixture shows.
DateTime d(int day, [int month = 9, int year = 2026]) => DateTime(year, month, day);
final DateTime today = d(24);

/// What a picker emitted, in order.
class Emitted {
  final List<TanreiDateSelection> changes = <TanreiDateSelection>[];
  final List<TanreiDatePickerCloseReason> closes = <TanreiDatePickerCloseReason>[];
  final List<String> events = <String>[];
  TanreiDateSelection? result;
  bool completed = false;

  void change(TanreiDateSelection selection) {
    changes.add(selection);
    events.add('change');
  }

  void close(TanreiDatePickerCloseReason reason) {
    closes.add(reason);
    events.add('close:${reason.name}');
  }
}

/// An app whose theme, media and direction sit above its navigator, around [home].
Widget pickerApp(
  Widget home, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  MediaQueryData Function(MediaQueryData)? media,
  Locale? locale,
  Iterable<LocalizationsDelegate<dynamic>>? delegates,
  List<Locale> supportedLocales = const <Locale>[Locale('en', 'US')],
}) => WidgetsApp(
  // A new app each time: a picker left open by the previous one must not stay on its navigator.
  key: UniqueKey(),
  color: theme.colors.primary,
  debugShowCheckedModeBanner: false,
  locale: locale,
  localizationsDelegates: delegates,
  supportedLocales: supportedLocales,
  builder: (BuildContext context, Widget? child) {
    final MediaQueryData data = MediaQuery.of(
      context,
    ).copyWith(disableAnimations: disableAnimations);
    return MediaQuery(
      data: media?.call(data) ?? data,
      child: TanreiTheme(
        data: theme,
        child: Directionality(textDirection: textDirection, child: child!),
      ),
    );
  },
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) => PageRouteBuilder<T>(
    settings: settings,
    pageBuilder: (BuildContext context, _, _) => builder(context),
  ),
  home: Builder(
    builder: (BuildContext context) =>
        ColoredBox(color: TanreiTheme.of(context).colors.surface, child: home),
  ),
);

int behindPresses = 0;

/// Opens a modal picker from an "Open" button on a page with a "Behind" button, and records what it
/// emits.
Future<Emitted> openModal(
  WidgetTester tester, {
  TanreiDatePickerMode mode = TanreiDatePickerMode.single,
  DateTime? value,
  DateTime? start,
  DateTime? end,
  DateTime? firstDate,
  DateTime? lastDate,
  List<DateTime> disabledDates = const <DateTime>[],
  bool Function(DateTime date)? isDateDisabled,
  DateTime? currentDate,
  bool deviceToday = false,
  TanreiDatePickerFirstDayOfWeek firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.locale,
  Locale? locale,
  TanreiDatePickerEntryMode entryMode = TanreiDatePickerEntryMode.calendar,
  TanreiDatePickerStartView startView = TanreiDatePickerStartView.day,
  TanreiDatePickerLabels labels = const TanreiDatePickerLabels(),
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  Size window = const Size(800, 800),
  MediaQueryData Function(MediaQueryData)? media,
  Iterable<LocalizationsDelegate<dynamic>>? delegates,
  Locale? appLocale,
  List<Locale> supportedLocales = const <Locale>[Locale('en', 'US')],
  bool byKeyboard = false,
  bool settle = true,
}) async {
  final Emitted emitted = Emitted();
  behindPresses = 0;
  tester.view.physicalSize = window;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    pickerApp(
      Center(
        child: Builder(
          builder: (BuildContext context) => Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TanreiButton(
                onPressed: () => unawaited(
                  showTanreiDatePicker(
                    context: context,
                    mode: mode,
                    value: value,
                    start: start,
                    end: end,
                    firstDate: firstDate,
                    lastDate: lastDate,
                    disabledDates: disabledDates,
                    isDateDisabled: isDateDisabled,
                    currentDate: deviceToday ? null : currentDate ?? today,
                    firstDayOfWeek: firstDayOfWeek,
                    locale: locale,
                    entryMode: entryMode,
                    startView: startView,
                    labels: labels,
                    onChanged: emitted.change,
                    onClose: emitted.close,
                  ).then((TanreiDateSelection? result) {
                    emitted.result = result;
                    emitted.completed = true;
                  }),
                ),
                child: const Text('Open'),
              ),
              TanreiButton(onPressed: () => behindPresses++, child: const Text('Behind')),
            ],
          ),
        ),
      ),
      theme: theme,
      disableAnimations: disableAnimations,
      textDirection: textDirection,
      media: media,
      delegates: delegates,
      locale: appLocale,
      supportedLocales: supportedLocales,
    ),
  );
  if (byKeyboard) {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
    await tabTimes(tester, 1);
    expect(focusedText(), 'Open');
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
  } else {
    await tester.tap(find.text('Open'));
  }
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
  return emitted;
}

/// A docked picker anchored to an "Open" button between a "Before" and an "After" button.
class Docked {
  Docked(this.emitted, this.controller);

  final Emitted emitted;
  final TanreiDatePickerController controller;
}

Future<Docked> openDocked(
  WidgetTester tester, {
  TanreiDatePickerMode mode = TanreiDatePickerMode.single,
  DateTime? value,
  DateTime? start,
  DateTime? end,
  DateTime? firstDate,
  DateTime? lastDate,
  List<DateTime> disabledDates = const <DateTime>[],
  DateTime? currentDate,
  TanreiDatePickerFirstDayOfWeek firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.locale,
  TanreiDatePickerEntryMode entryMode = TanreiDatePickerEntryMode.calendar,
  TanreiDatePickerStartView startView = TanreiDatePickerStartView.day,
  TanreiDatePickerLabels labels = const TanreiDatePickerLabels(),
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  Size window = const Size(800, 800),
  Widget Function(Widget anchor)? place,
  bool open = true,
}) async {
  final Emitted emitted = Emitted();
  final TanreiDatePickerController controller = TanreiDatePickerController();
  addTearDown(controller.dispose);
  tester.view.physicalSize = window;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final Widget anchor = TanreiDatePickerAnchor(
    controller: controller,
    mode: mode,
    value: value,
    start: start,
    end: end,
    firstDate: firstDate,
    lastDate: lastDate,
    disabledDates: disabledDates,
    currentDate: currentDate ?? today,
    firstDayOfWeek: firstDayOfWeek,
    entryMode: entryMode,
    startView: startView,
    labels: labels,
    onChanged: emitted.change,
    onClose: emitted.close,
    builder: (BuildContext context, TanreiDatePickerController controller, Widget? child) =>
        TanreiButton(onPressed: controller.open, child: const Text('Open')),
  );
  await tester.pumpWidget(
    pickerApp(
      place?.call(anchor) ??
          Align(
            alignment: Alignment.topCenter,
            child: Padding(
              padding: const EdgeInsets.only(top: 40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  TanreiButton(onPressed: () {}, child: const Text('Before')),
                  anchor,
                  TanreiButton(onPressed: () {}, child: const Text('After')),
                ],
              ),
            ),
          ),
      theme: theme,
      disableAnimations: disableAnimations,
      textDirection: textDirection,
    ),
  );
  if (open) {
    controller.open();
    await tester.pumpAndSettle();
  }
  return Docked(emitted, controller);
}

Finder dayFinder(int day, [int month = 9, int year = 2026]) => find.byWidgetPredicate(
  (Widget w) => w is TanreiDatePickerDay && w.date == DateTime(year, month, day),
);

Finder yearFinder(int year) =>
    find.byWidgetPredicate((Widget w) => w is TanreiDatePickerYear && w.year == year);

TanreiDatePickerDay dayOf(WidgetTester tester, int day, [int month = 9]) =>
    tester.widget<TanreiDatePickerDay>(dayFinder(day, month));

final Finder headerValue = find.byKey(const ValueKey<String>('tanrei-date-picker-header-value'));

/// The text of the header's value, as drawn.
String headerText(WidgetTester tester) => tester.widget<Text>(headerValue).textSpan!.toPlainText();

/// The container of the open surface: the one decoration in the surface color with a shadow.
Finder surfaceFinder({bool modal = true, TanreiThemeData theme = lightTheme}) {
  final TanreiDatePickerTokens tokens = theme.system.datePicker;
  final Color color = theme.paint(modal ? tokens.modalContainerColor : tokens.dockedContainerColor);
  final double radius = modal ? tokens.modalContainerShape : tokens.dockedContainerShape;
  return find.byWidgetPredicate(
    (Widget w) =>
        w is DecoratedBox &&
        w.decoration is TanreiContainerDecoration &&
        (w.decoration as TanreiContainerDecoration).color == color &&
        (w.decoration as TanreiContainerDecoration).shape.radius == radius,
  );
}

/// The first container decoration inside [item]: the day's container (or band), the year's.
TanreiContainerDecoration decorationOf(WidgetTester tester, Finder item) => tester
    .widgetList<DecoratedBox>(find.descendant(of: item, matching: find.byType(DecoratedBox)))
    .map((DecoratedBox box) => box.decoration)
    .whereType<TanreiContainerDecoration>()
    .first;

const Color none = Color(0x00000000);

/// The decoration of the open surface's container.
TanreiContainerDecoration surfaceDecoration(WidgetTester tester, {bool modal = true}) =>
    tester.widget<DecoratedBox>(surfaceFinder(modal: modal)).decoration
        as TanreiContainerDecoration;

Color fillOf(WidgetTester tester, Finder item) => decorationOf(tester, item).color ?? none;

Color outlineOf(WidgetTester tester, Finder item) {
  final BoxBorder? border = decorationOf(tester, item).border;
  return border is Border ? border.top.color : none;
}

Color labelOf(WidgetTester tester, Finder item) =>
    tester.widget<Text>(find.descendant(of: item, matching: find.byType(Text)).first).style!.color!;

/// The date of the day with primary focus, if one has it.
DateTime? focusedDay() => FocusManager.instance.primaryFocus?.context
    ?.findAncestorWidgetOfExactType<TanreiDatePickerDay>()
    ?.date;

int? focusedYear() => FocusManager.instance.primaryFocus?.context
    ?.findAncestorWidgetOfExactType<TanreiDatePickerYear>()
    ?.year;

/// What the focused control says: a button's text, an icon button's or a view toggle's name.
String focusedText() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  final TanreiButton? button = context.findAncestorWidgetOfExactType<TanreiButton>();
  if (button != null) {
    final Widget child = button.child;
    return child is Text ? child.data ?? '' : '';
  }
  final TanreiIconButton? icon = context.findAncestorWidgetOfExactType<TanreiIconButton>();
  if (icon != null) {
    return icon.semanticLabel;
  }
  final TanreiTextField? field = context.findAncestorWidgetOfExactType<TanreiTextField>();
  if (field != null) {
    return field.labelText;
  }
  String? label;
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is Semantics && widget.properties.button == true) {
      label = widget.properties.label;
      return false;
    }
    return true;
  });
  return label ?? '';
}

Future<void> key(WidgetTester tester, LogicalKeyboardKey key, {bool shift = false}) async {
  if (shift) {
    await tester.sendKeyDownEvent(LogicalKeyboardKey.shift);
  }
  await tester.sendKeyEvent(key);
  if (shift) {
    await tester.sendKeyUpEvent(LogicalKeyboardKey.shift);
  }
  await tester.pumpAndSettle();
}

/// The semantics data of the day node [day].
SemanticsData daySemantics(WidgetTester tester, int day, [int month = 9]) =>
    tester.getSemantics(dayFinder(day, month)).getSemanticsData();

Finder iconButton(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == label);

Finder buttonText(String text) => find.byWidgetPredicate(
  (Widget w) => w is TanreiButton && w.child is Text && (w.child as Text).data == text,
);

Finder viewToggle() => find.byWidgetPredicate(
  (Widget w) =>
      w is Semantics && w.properties.hint == 'Choose a year' && w.properties.button == true,
);

Finder fieldFinder(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiTextField && w.labelText == label);

/// The container of the field labelled [label] (the text field's own layout of it).
Finder fieldContainer(String label) => find.descendant(
  of: fieldFinder(label),
  matching: find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
);

/// The expected color of a condition part in a state, in the light theme.
TanreiDatePickerConditionStateTokens tone(
  TanreiDatePickerCondition condition,
  TanreiInteractionState state, [
  TanreiSystem of = system,
]) => of.datePicker.conditions[condition].of(state);

Color paint(TanreiPaint p, [TanreiThemeData theme = lightTheme]) => theme.paint(p);

/// Collects the announcements made through `SemanticsService.announce`.
List<String> collectAnnouncements(WidgetTester tester) {
  final List<String> announcements = <String>[];
  tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
    SystemChannels.accessibility,
    (Object? message) async {
      final Map<Object?, Object?> map = message! as Map<Object?, Object?>;
      if (map['type'] == 'announce') {
        final Map<Object?, Object?> data = map['data']! as Map<Object?, Object?>;
        announcements.add('${data['message']} (${data['assertiveness'] ?? 0})');
      }
      return null;
    },
  );
  addTearDown(
    () => tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
      SystemChannels.accessibility,
      null,
    ),
  );
  return announcements;
}

/// A delegate with made-up localizations: the words and forms come from it, not from English.
class _MarkedLocalizations extends TanreiEnglishDateLocalizations {
  const _MarkedLocalizations() : super(locale: const Locale('fr', 'FR'));

  @override
  String narrowWeekday(int weekday) => 'w$weekday';

  @override
  String monthYear(int year, int month) => 'm$month.$year';

  @override
  String fullDate(DateTime date) => 'd${date.day}.${date.month}.${date.year}';

  @override
  String formatNumber(int value, {int minDigits = 1}) =>
      value.toString().padLeft(minDigits, '0').replaceAll('1', 'I');

  @override
  String toAsciiDigits(String text) => text.replaceAll('I', '1');

  @override
  List<TanreiDateField> get numericDateOrder => const <TanreiDateField>[
    TanreiDateField.day,
    TanreiDateField.month,
    TanreiDateField.year,
  ];

  @override
  String get numericDateSeparator => '.';
}

class _MarkedDelegate extends LocalizationsDelegate<TanreiDateLocalizations> {
  const _MarkedDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'fr';

  @override
  Future<TanreiDateLocalizations> load(Locale locale) =>
      SynchronousFuture<TanreiDateLocalizations>(const _MarkedLocalizations());

  @override
  bool shouldReload(_MarkedDelegate old) => false;
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('presentation', () {
    testWidgets('DTP-1: a modal picker is centred over a scrim of modal.scrim.color across the '
        'window; the page behind takes no press, no focus and is hidden; the container has the '
        'modal color, elevation and corners, the margin from every edge and from the keyboard', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Emitted emitted = await openModal(tester);
      final Color scrim = paint(pickerTokens.modalScrimColor);
      final Finder scrimBox = find.byWidgetPredicate(
        (Widget w) => w is ColoredBox && w.color == scrim,
      );
      expect(tester.getSize(scrimBox), const Size(800, 800));
      final Rect surface = tester.getRect(surfaceFinder());
      expect(surface.center, const Offset(400, 400));
      final TanreiContainerDecoration decoration = surfaceDecoration(tester);
      expect(decoration.shape.radius, pickerTokens.modalContainerShape);
      expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
      expect(decoration.boxShadow, isNotEmpty);
      // Nothing behind is pressable, focusable or read.
      expect(
        nodesBelow(semanticsRoot(tester)).any((SemanticsNode n) => n.label == 'Behind'),
        isFalse,
      );
      await tester.tapAt(const Offset(5, 5));
      await tester.pumpAndSettle();
      expect(behindPresses, 0);
      expect(emitted.closes, <TanreiDatePickerCloseReason>[TanreiDatePickerCloseReason.outside]);

      // The keyboard and a short window: the margin holds above the keyboard.
      await openModal(
        tester,
        window: const Size(800, 900),
        media: (MediaQueryData data) =>
            data.copyWith(viewInsets: const EdgeInsets.only(bottom: 200)),
      );
      final Rect raised = tester.getRect(surfaceFinder());
      expect(raised.bottom, lessThanOrEqualTo(700 - pickerTokens.modalContainerMargin + 0.01));
      expect(raised.top, greaterThanOrEqualTo(pickerTokens.modalContainerMargin - 0.01));
      handle.dispose();
    });

    testWidgets('DTP-2: a docked picker sits docked.offset below its anchor, start edges aligned, '
        'in the docked container; it flips above where the space below is smaller, shifts to stay '
        'viewport-margin inside, follows the anchor, mirrors right to left, and draws no scrim', (
      WidgetTester tester,
    ) async {
      await openDocked(tester, value: d(17));
      final Rect anchor = tester.getRect(buttonText('Open'));
      final RenderTanreiDatePickerPosition position = tester.allRenderObjects
          .whereType<RenderTanreiDatePickerPosition>()
          .toSet()
          .single;
      final Rect surface = tester.getRect(surfaceFinder(modal: false));
      expect(surface.top, moreOrLessEquals(anchor.bottom + pickerTokens.dockedOffset));
      expect(surface.left, moreOrLessEquals(anchor.left));
      expect(position.isAbove, isFalse);
      final TanreiContainerDecoration decoration = surfaceDecoration(tester, modal: false);
      expect(decoration.shape.radius, pickerTokens.dockedContainerShape);
      expect(decoration.boxShadow, isNotEmpty);
      expect(
        find.byWidgetPredicate(
          (Widget w) => w is ColoredBox && w.color == paint(pickerTokens.modalScrimColor),
        ),
        findsNothing,
      );
      // The page stays usable: the button after the anchor still takes presses under the surface's
      // side.
      expect(tester.getRect(buttonText('After')).overlaps(surface), isTrue);

      // Near the bottom of the window: above the anchor.
      await openDocked(
        tester,
        value: d(17),
        place: (Widget anchor) => Align(alignment: const Alignment(0, 0.9), child: anchor),
      );
      final Rect low = tester.getRect(buttonText('Open'));
      final Rect above = tester.getRect(surfaceFinder(modal: false));
      expect(above.bottom, moreOrLessEquals(low.top - pickerTokens.dockedOffset));

      // Near the end edge: shifted to stay inside the margin.
      await openDocked(
        tester,
        value: d(17),
        place: (Widget anchor) => Align(alignment: Alignment.topRight, child: anchor),
      );
      final Rect shifted = tester.getRect(surfaceFinder(modal: false));
      expect(shifted.right, moreOrLessEquals(800 - pickerTokens.dockedViewportMargin));

      // Right to left: the start edges are the right ones.
      await openDocked(
        tester,
        value: d(17),
        textDirection: TextDirection.rtl,
        place: (Widget anchor) => Align(alignment: const Alignment(0.2, -0.8), child: anchor),
      );
      final Rect rtlAnchor = tester.getRect(buttonText('Open'));
      expect(tester.getRect(surfaceFinder(modal: false)).right, moreOrLessEquals(rtlAnchor.right));

      // It follows the anchor while the page scrolls.
      final ScrollController scroll = ScrollController();
      addTearDown(scroll.dispose);
      await openDocked(
        tester,
        value: d(17),
        place: (Widget anchor) => SingleChildScrollView(
          controller: scroll,
          child: Column(
            children: <Widget>[const SizedBox(height: 100), anchor, const SizedBox(height: 2000)],
          ),
        ),
      );
      final double before = tester.getRect(surfaceFinder(modal: false)).top;
      scroll.jumpTo(30);
      await tester.pump();
      expect(tester.getRect(surfaceFinder(modal: false)).top, moreOrLessEquals(before - 30));
    });

    testWidgets('DTP-3: opening moves focus to the active day, to the displayed year in the year '
        'view, or to the first field in text entry — when it opens, not when its motion ends', (
      WidgetTester tester,
    ) async {
      await openModal(tester, value: d(17), settle: false);
      await tester.pump();
      expect(focusedDay(), d(17), reason: 'before the motion ends');
      await tester.pumpAndSettle();
      await openModal(tester, value: d(17), startView: TanreiDatePickerStartView.year);
      expect(focusedYear(), 2026);
      await openModal(tester, value: d(17), entryMode: TanreiDatePickerEntryMode.text);
      expect(focusedText(), 'Date');
      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        entryMode: TanreiDatePickerEntryMode.text,
      );
      expect(focusedText(), 'Start date');
      await openDocked(tester);
      expect(focusedDay(), today, reason: 'docked: the active day is today');
    });

    testWidgets('DTP-4: closing returns focus to where it was — the opener of a modal picker, the '
        'anchor of a docked one — when it closes, not when its motion ends', (
      WidgetTester tester,
    ) async {
      final Emitted modal = await openModal(tester, value: d(17), byKeyboard: true);
      expect(focusedDay(), d(17));
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      expect(modal.closes, <TanreiDatePickerCloseReason>[TanreiDatePickerCloseReason.escape]);
      await tester.pump();
      expect(focusedText(), 'Open', reason: 'at the start of the close');
      await tester.pumpAndSettle();
      expect(focusedText(), 'Open');

      final Docked docked = await openDocked(tester, open: false);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 2);
      expect(focusedText(), 'Open');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(focusedDay(), today);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      expect(docked.controller.isOpen, isFalse);
      expect(focusedText(), 'Open');
      await tester.pumpAndSettle();
    });

    testWidgets(
      'DTP-5: Escape, back, the scrim, Cancel and OK close a modal picker once with their '
      'reason; Escape, back, a press outside, Tab out, focus leaving and a completed choice close '
      'a docked one; only confirm and select commit; the picker closes itself',
      (WidgetTester tester) async {
        Future<Emitted> modalClosedBy(Future<void> Function() act) async {
          final Emitted emitted = await openModal(tester, value: d(17));
          await tester.tap(dayFinder(18));
          await tester.pump();
          await act();
          await tester.pumpAndSettle();
          expect(find.byType(TanreiDatePickerDay), findsNothing, reason: 'closed itself');
          expect(emitted.completed, isTrue);
          return emitted;
        }

        Emitted e = await modalClosedBy(() => tester.sendKeyEvent(LogicalKeyboardKey.escape));
        expect(e.events, <String>['close:escape']);
        expect(e.result, isNull);
        e = await modalClosedBy(() async {
          await tester.binding.handlePopRoute();
        });
        expect(e.events, <String>['close:back']);
        e = await modalClosedBy(() => tester.tapAt(const Offset(5, 5)));
        expect(e.events, <String>['close:outside']);
        e = await modalClosedBy(() => tester.tap(buttonText('Cancel')));
        expect(e.events, <String>['close:cancel']);
        e = await modalClosedBy(() => tester.tap(buttonText('OK')));
        expect(e.events, <String>['change', 'close:confirm']);
        expect(e.result, TanreiDateSelection(value: d(18)));

        // Docked.
        Docked docked = await openDocked(tester, value: d(17));
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:escape']);
        expect(docked.controller.isOpen, isFalse);

        docked = await openDocked(tester, value: d(17));
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:back']);

        docked = await openDocked(tester, value: d(17));
        await tester.tapAt(const Offset(5, 790));
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:outside']);

        // Tab out of the last part: closed, and focus moves on from the anchor.
        docked = await openDocked(tester, value: d(17), open: false);
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tabTimes(tester, 2);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        expect(focusedDay(), d(17));
        await tabTimes(tester, 1);
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:tab']);
        expect(focusedText(), 'After');

        // Shift+Tab out of the first part.
        docked = await openDocked(tester, value: d(17), open: false);
        await tabTimes(tester, 2);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        await tabTimes(tester, 4, shift: true);
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:tab']);
        expect(focusedText(), 'Before');

        // Focus moved elsewhere.
        docked = await openDocked(tester, value: d(17));
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['close:focusOut']);

        // A completed choice.
        docked = await openDocked(tester, value: d(17));
        await tester.tap(dayFinder(20));
        await tester.pumpAndSettle();
        expect(docked.emitted.events, <String>['change', 'close:select']);
        expect(docked.controller.isOpen, isFalse);
      },
    );

    testWidgets('DTP-6: a modal picker holds a pending choice that the header and calendar show; '
        'only OK commits it — change once when it differs, then close with confirm; OK is '
        'disabled while the choice is incomplete or a field holds text that is no available date', (
      WidgetTester tester,
    ) async {
      final Emitted emitted = await openModal(tester, value: d(17));
      await tester.tap(dayFinder(20));
      await tester.pumpAndSettle();
      expect(emitted.events, isEmpty);
      expect(headerText(tester), 'Sun, Sep 20');
      expect(
        fillOf(tester, dayFinder(20)),
        paint(
          tone(TanreiDatePickerCondition.selected, TanreiInteractionState.enabled).containerColor,
        ),
      );
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(emitted.events, <String>['change', 'close:confirm']);
      expect(emitted.changes.single, TanreiDateSelection(value: d(20)));
      expect(emitted.result, TanreiDateSelection(value: d(20)));

      // Unchanged: no change, but the future completes with the choice.
      final Emitted same = await openModal(tester, value: d(17));
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(same.events, <String>['close:confirm']);
      expect(same.result, TanreiDateSelection(value: d(17)));

      // Incomplete: OK disabled.
      await openModal(tester, mode: TanreiDatePickerMode.range);
      bool okEnabled() => tester.widget<TanreiButton>(buttonText('OK')).onPressed != null;
      expect(okEnabled(), isFalse);
      await tester.tap(dayFinder(10));
      await tester.pumpAndSettle();
      expect(okEnabled(), isFalse);
      await tester.tap(dayFinder(12));
      await tester.pumpAndSettle();
      expect(okEnabled(), isTrue);

      // A field with text that is not an available date: OK disabled.
      await openModal(tester, value: d(17), entryMode: TanreiDatePickerEntryMode.text);
      expect(okEnabled(), isTrue);
      await tester.enterText(fieldFinder('Date'), '09/31/2026');
      await tester.pumpAndSettle();
      expect(okEnabled(), isFalse);
    });

    testWidgets('DTP-7: in a docked picker a day that completes the choice emits change (when it '
        'differs) and then close with select; a range\'s start emits nothing and keeps it open', (
      WidgetTester tester,
    ) async {
      Docked docked = await openDocked(tester, value: d(17));
      await tester.tap(dayFinder(17));
      await tester.pumpAndSettle();
      expect(docked.emitted.events, <String>['close:select'], reason: 'the same day: no change');

      docked = await openDocked(tester, mode: TanreiDatePickerMode.range);
      await tester.tap(dayFinder(10));
      await tester.pumpAndSettle();
      expect(docked.emitted.events, isEmpty);
      expect(docked.controller.isOpen, isTrue);
      expect(dayOf(tester, 10).condition, TanreiDatePickerCondition.selected);
      await tester.tap(dayFinder(14));
      await tester.pumpAndSettle();
      expect(docked.emitted.events, <String>['change', 'close:select']);
      expect(docked.emitted.changes.single, TanreiDateSelection(start: d(10), end: d(14)));
    });
  });

  group('choosing', () {
    testWidgets(
      'DTP-8: in single mode a pointer, a touch, Enter or Space on an available day makes '
      'it the chosen date',
      (WidgetTester tester) async {
        await openModal(tester, value: d(17), byKeyboard: true);
        await key(tester, LogicalKeyboardKey.arrowRight);
        await key(tester, LogicalKeyboardKey.enter);
        expect(headerText(tester), 'Fri, Sep 18');
        await key(tester, LogicalKeyboardKey.arrowRight);
        await key(tester, LogicalKeyboardKey.space);
        expect(headerText(tester), 'Sat, Sep 19');
        await tester.tap(dayFinder(3));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Thu, Sep 3');
        final TestGesture mouse = await tester.createGesture(kind: ui.PointerDeviceKind.mouse);
        addTearDown(mouse.removePointer);
        await mouse.down(tester.getCenter(dayFinder(5)));
        await mouse.up();
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sat, Sep 5');
      },
    );

    testWidgets(
      'DTP-9: in range mode a day starts the range when none is chosen, both are chosen or '
      'it is before the start, and otherwise ends it; one day is a one-day range; unavailable days '
      'inside stay inside, drawn and exposed as unavailable',
      (WidgetTester tester) async {
        await openModal(tester, mode: TanreiDatePickerMode.range, disabledDates: <DateTime>[d(13)]);
        await tester.tap(dayFinder(10));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 10 – End date');
        await tester.tap(dayFinder(16));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 10 – Sep 16');
        expect(dayOf(tester, 13).condition, TanreiDatePickerCondition.inRange);
        expect(dayOf(tester, 13).disabled, isTrue);
        expect(daySemantics(tester, 13).hasFlag(ui.SemanticsFlag.hasEnabledState), isTrue);
        expect(daySemantics(tester, 13).hasFlag(ui.SemanticsFlag.isEnabled), isFalse);
        // Both chosen: a new start.
        await tester.tap(dayFinder(20));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 20 – End date');
        // Before the start: a new start.
        await tester.tap(dayFinder(8));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 8 – End date');
        // The same day: a one-day range.
        await tester.tap(dayFinder(8));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 8 – Sep 8');
        expect(dayOf(tester, 8).condition, TanreiDatePickerCondition.selected);
        // An unavailable day chooses nothing.
        await tester.tap(dayFinder(13));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Sep 8 – Sep 8');
      },
    );

    testWidgets('DTP-10: each day draws one condition — selected over in-range over today over '
        'unselected; years are selected for the displayed one and today for the current one; the '
        'view toggle draws unselected; an unavailable day draws its condition\'s disabled tokens', (
      WidgetTester tester,
    ) async {
      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        start: d(22),
        end: d(26),
        disabledDates: <DateTime>[d(28)],
      );
      expect(dayOf(tester, 22).condition, TanreiDatePickerCondition.selected);
      expect(dayOf(tester, 24).condition, TanreiDatePickerCondition.inRange, reason: 'over today');
      expect(dayOf(tester, 26).condition, TanreiDatePickerCondition.selected);
      expect(dayOf(tester, 27).condition, TanreiDatePickerCondition.unselected);
      for (final (int day, TanreiDatePickerCondition condition)
          in <(int, TanreiDatePickerCondition)>[
            (22, TanreiDatePickerCondition.selected),
            (24, TanreiDatePickerCondition.inRange),
            (27, TanreiDatePickerCondition.unselected),
          ]) {
        final TanreiDatePickerConditionStateTokens t = tone(
          condition,
          TanreiInteractionState.enabled,
        );
        expect(fillOf(tester, dayFinder(day)), paint(t.containerColor));
        expect(labelOf(tester, dayFinder(day)), paint(t.labelColor));
      }
      final TanreiDatePickerConditionStateTokens disabled = tone(
        TanreiDatePickerCondition.unselected,
        TanreiInteractionState.disabled,
      );
      expect(labelOf(tester, dayFinder(28)), paint(disabled.labelColor));

      await openModal(tester, value: d(17));
      final TanreiDatePickerConditionStateTokens todayTone = tone(
        TanreiDatePickerCondition.today,
        TanreiInteractionState.enabled,
      );
      expect(dayOf(tester, 24).condition, TanreiDatePickerCondition.today);
      expect(outlineOf(tester, dayFinder(24)), paint(todayTone.outlineColor));
      expect(labelOf(tester, dayFinder(24)), paint(todayTone.labelColor));
      final TanreiDatePickerConditionStateTokens unselected = tone(
        TanreiDatePickerCondition.unselected,
        TanreiInteractionState.enabled,
      );
      expect(labelOf(tester, viewToggle()), paint(unselected.labelColor));

      await openModal(
        tester,
        value: d(17),
        currentDate: d(15, 1, 2027),
        startView: TanreiDatePickerStartView.year,
      );
      expect(
        tester.widget<TanreiDatePickerYear>(yearFinder(2026)).condition,
        TanreiDatePickerCondition.selected,
      );
      expect(
        tester.widget<TanreiDatePickerYear>(yearFinder(2027)).condition,
        TanreiDatePickerCondition.today,
      );
      expect(
        tester.widget<TanreiDatePickerYear>(yearFinder(2028)).condition,
        TanreiDatePickerCondition.unselected,
      );
      expect(
        fillOf(tester, yearFinder(2026)),
        paint(
          tone(TanreiDatePickerCondition.selected, TanreiInteractionState.enabled).containerColor,
        ),
      );
    });
  });
  group('layout', () {
    testWidgets(
      'DTP-11: the day view is a weekday row and six rows of seven cells of cell.size (at '
      'least the touch target), the first day in its weekday\'s column, empty cells before and '
      'after, six rows kept; container padding around the navigation row, the grid and the list',
      (WidgetTester tester) async {
        await openDocked(tester, value: d(17));
        final double cell = pickerTokens.cellSize;
        expect(cell, greaterThanOrEqualTo(system.measure.targetTouch));
        final Rect first = tester.getRect(dayFinder(1));
        final Rect last = tester.getRect(dayFinder(30));
        expect(first.size, Size(cell, cell));
        // September 2026 starts on a Tuesday: the third column from Sunday (en-US).
        final Rect surface = tester.getRect(surfaceFinder(modal: false));
        final double gridLeft = surface.left + pickerTokens.containerPaddingInline;
        expect(first.left, moreOrLessEquals(gridLeft + 2 * cell));
        expect(last.left, moreOrLessEquals(gridLeft + 3 * cell));
        expect(surface.width, moreOrLessEquals(7 * cell + 2 * pickerTokens.containerPaddingInline));
        // The navigation row, the weekday row (one cell) and six rows, inside the block padding.
        final double rows = last.top - first.top;
        expect(rows, 4 * cell);
        expect(
          surface.height,
          moreOrLessEquals(
            2 * pickerTokens.containerPaddingBlock + pickerTokens.cellSize + 7 * cell,
          ),
        );
        // A month that needs six rows keeps the same height: March 2026 starts on a Sunday and needs
        // five; August 2026 starts on a Saturday and needs six.
        await tester.tap(iconButton('Previous month'));
        await tester.pumpAndSettle();
        expect(
          tester.getRect(surfaceFinder(modal: false)).height,
          moreOrLessEquals(surface.height),
        );
        expect(
          tester.getRect(dayFinder(31, 8)).top - tester.getRect(dayFinder(1, 8)).top,
          5 * cell,
        );
      },
    );

    testWidgets(
      'DTP-12: a day\'s number is centred on a square container of day.container.size with '
      'day.container.shape corners and the outline of its condition; an in-range day\'s container '
      'spans its cell; a start and an end draw the half cell toward each other in the band color; '
      'the band covers only the displayed month',
      (WidgetTester tester) async {
        await openDocked(tester, mode: TanreiDatePickerMode.range, start: d(10), end: d(16));
        Rect containerOf(int day) => tester.getRect(
          find.descendant(of: dayFinder(day), matching: find.byType(DecoratedBox)).first,
        );
        final Rect cell10 = tester.getRect(dayFinder(10));
        expect(containerOf(10).size, Size.square(pickerTokens.dayContainerSize));
        expect(containerOf(10).center, cell10.center);
        expect(decorationOf(tester, dayFinder(10)).shape.radius, pickerTokens.dayContainerShape);
        // The band: across the cell, square.
        expect(containerOf(12).width, pickerTokens.cellSize);
        expect(containerOf(12).height, pickerTokens.dayContainerSize);
        expect(decorationOf(tester, dayFinder(12)).shape.radius, 0);
        final Color band = paint(pickerTokens.conditions.inRange.enabled.containerColor);
        expect(fillOf(tester, dayFinder(12)), band);
        // The start's half toward the end, the end's toward the start.
        final Rect half10 = tester.getRect(
          find.descendant(
            of: dayFinder(10),
            matching: find.byWidgetPredicate((Widget w) => w is ColoredBox && w.color == band),
          ),
        );
        expect(half10.left, moreOrLessEquals(cell10.center.dx));
        expect(half10.right, moreOrLessEquals(cell10.right));
        final Rect cell16 = tester.getRect(dayFinder(16));
        final Rect half16 = tester.getRect(
          find.descendant(
            of: dayFinder(16),
            matching: find.byWidgetPredicate((Widget w) => w is ColoredBox && w.color == band),
          ),
        );
        expect(half16.left, moreOrLessEquals(cell16.left));
        expect(half16.right, moreOrLessEquals(cell16.center.dx));

        // A range into the next month: the band stops with the displayed month.
        await openDocked(tester, mode: TanreiDatePickerMode.range, start: d(28), end: d(3, 10));
        expect(dayOf(tester, 30).condition, TanreiDatePickerCondition.inRange);
        expect(
          find.byWidgetPredicate((Widget w) => w is TanreiDatePickerDay && w.date.month == 10),
          findsNothing,
        );
      },
    );

    testWidgets('DTP-13: the weekday row shows the narrow names from the first day of the week in '
        'weekday.typescale and weekday.color, exposed as column headers by their full names, and takes '
        'no focus', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await openDocked(tester, value: d(17));
      final List<Text> names = tester
          .widgetList<Text>(
            find.descendant(
              of: find.byWidgetPredicate(
                (Widget w) => w is Semantics && w.properties.role == SemanticsRole.columnHeader,
              ),
              matching: find.byType(Text),
            ),
          )
          .toList();
      expect(names.take(7).map((Text t) => t.data), <String>['S', 'M', 'T', 'W', 'T', 'F', 'S']);
      expect(names.first.style!.color, paint(pickerTokens.weekdayColor));
      expect(names.first.style!.fontSize, pickerTokens.weekdayTypescale.size);
      final List<SemanticsData> headers = nodesWithRole(tester, SemanticsRole.columnHeader);
      expect(headers.map((SemanticsData h) => h.label), <String>[
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]);
      expect(headers.every((SemanticsData h) => !h.hasFlag(ui.SemanticsFlag.isFocusable)), isTrue);
      handle.dispose();
    });

    testWidgets('DTP-14: the navigation row, at least a cell tall, holds the view toggle at the '
        'start and the previous and next buttons at the end, navigation.gap apart: standard medium '
        'icon buttons named by their labels, disabled at the first and last month, hidden in the year '
        'view', (WidgetTester tester) async {
      await openDocked(tester, value: d(17), firstDate: d(3), lastDate: d(10, 10));
      final TanreiIconButton previous = tester.widget(iconButton('Previous month'));
      final TanreiIconButton next = tester.widget(iconButton('Next month'));
      expect(previous.variant, TanreiIconButtonVariant.standard);
      expect(previous.size, TanreiIconButtonSize.medium);
      expect((previous.icon as Text).data, '\u{e5cb}', reason: 'chevron_left');
      expect((next.icon as Text).data, '\u{e5cc}', reason: 'chevron_right');
      expect(previous.onPressed, isNull, reason: 'the first date\'s month');
      expect(next.onPressed, isNotNull);
      final Rect p = tester.getRect(iconButton('Previous month'));
      final Rect n = tester.getRect(iconButton('Next month'));
      final Rect surface = tester.getRect(surfaceFinder(modal: false));
      expect(n.right, moreOrLessEquals(surface.right - pickerTokens.containerPaddingInline));
      expect(tester.getRect(viewToggle()).left, lessThan(p.left));
      // The visual boxes are navigation.gap apart (the icon buttons' targets are their own).
      expect(n.center.dx - p.center.dx, moreOrLessEquals(p.width + pickerTokens.navigationGap));
      await tester.tap(iconButton('Next month'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TanreiIconButton>(iconButton('Next month')).onPressed,
        isNull,
        reason: 'the last date\'s month',
      );
      await tester.tap(viewToggle());
      await tester.pumpAndSettle();
      expect(iconButton('Previous month'), findsNothing);
      expect(iconButton('Next month'), findsNothing);
    });

    testWidgets(
      'DTP-15: the view toggle is at least view-toggle.container.height tall, padded, '
      'with the month and year and the expand_more glyph at view-toggle.icon.size in the unselected '
      'colors; the glyph turns half a turn in the year view over state-duration (at once where '
      'motion is reduced); its target is at least the touch target; it switches the views',
      (WidgetTester tester) async {
        await openDocked(tester, value: d(17));
        final Finder toggle = viewToggle();
        final Finder box = find.descendant(
          of: toggle,
          matching: find.byType(TanreiControlContainer),
        );
        expect(
          tester.getSize(box).height,
          greaterThanOrEqualTo(pickerTokens.viewToggleContainerHeight),
        );
        expect(tester.getSize(toggle).height, greaterThanOrEqualTo(system.measure.targetTouch));
        expect(
          tester
              .widget<Text>(find.descendant(of: toggle, matching: find.text('September 2026')))
              .style!
              .fontSize,
          pickerTokens.viewToggleLabelTypescale.size,
        );
        final TanreiControlIcon icon = tester.widget(
          find.descendant(of: toggle, matching: find.byType(TanreiControlIcon)),
        );
        expect((icon.icon as Text).data, '\u{e5cf}');
        expect(icon.size, pickerTokens.viewToggleIconSize);
        expect(icon.selected, isFalse);
        RotationTransition turn() =>
            tester.widget(find.descendant(of: toggle, matching: find.byType(RotationTransition)));
        expect(turn().turns.value, 0);
        await tester.tap(toggle);
        await tester.pump();
        await tester.pump(ms(pickerTokens.motionStateDuration ~/ 2));
        expect(turn().turns.value, inExclusiveRange(0, 0.5));
        await tester.pumpAndSettle();
        expect(turn().turns.value, 0.5);
        expect(find.byType(TanreiDatePickerYear), findsWidgets);
        await tester.tap(toggle);
        await tester.pumpAndSettle();
        expect(turn().turns.value, 0);
        expect(find.byType(TanreiDatePickerYear), findsNothing);

        await openDocked(tester, value: d(17), disableAnimations: true);
        await tester.tap(viewToggle());
        await tester.pump();
        expect(turn().turns.value, 0.5, reason: 'at once where motion is reduced');
      },
    );

    testWidgets(
      'DTP-16: the year view lists the years from the first to the last date\'s (1900 to '
      '2100 without them) in rows of three cells, opened with the displayed year in the third row; '
      'choosing a year shows that year\'s month (within the bounds) and focuses its active day '
      'without changing the choice; the toggle returns to the day view unchanged',
      (WidgetTester tester) async {
        final Emitted emitted = await openModal(
          tester,
          value: d(17),
          startView: TanreiDatePickerStartView.year,
        );
        final Rect y2026 = tester.getRect(yearFinder(2026));
        final Rect list = tester.getRect(find.byType(ListView));
        expect(list.height, 7 * pickerTokens.cellSize);
        expect(
          ((y2026.center.dy - list.top) / pickerTokens.cellSize).floor(),
          2,
          reason: 'the third row',
        );
        expect(
          tester.getSize(
            find.descendant(of: yearFinder(2026), matching: find.byType(TanreiControlContainer)),
          ),
          Size(pickerTokens.yearContainerWidth, pickerTokens.yearContainerHeight),
        );
        expect(
          tester.getRect(yearFinder(2027)).left - y2026.left,
          moreOrLessEquals(7 * pickerTokens.cellSize / 3),
        );
        final ScrollPosition position = tester
            .state<ScrollableState>(find.byType(Scrollable).last)
            .position;
        expect(
          position.maxScrollExtent + position.viewportDimension,
          moreOrLessEquals(((2100 - 1900) ~/ 3 + 1) * pickerTokens.cellSize),
        );
        await tester.tap(yearFinder(2028));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<Text>(find.descendant(of: viewToggle(), matching: find.byType(Text)).first)
              .data,
          'September 2028',
        );
        expect(focusedDay(), d(1, 9, 2028), reason: 'no chosen date or today in it: the first day');
        expect(headerText(tester), 'Thu, Sep 17', reason: 'the choice is unchanged');
        expect(emitted.events, isEmpty);

        // Within the bounds, and the list from the first to the last year.
        await openModal(
          tester,
          value: d(17),
          firstDate: d(5, 3, 2024),
          lastDate: d(10, 6, 2027),
          startView: TanreiDatePickerStartView.year,
        );
        expect(find.byType(TanreiDatePickerYear), findsNWidgets(4));
        await tester.tap(yearFinder(2027));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<Text>(find.descendant(of: viewToggle(), matching: find.byType(Text)).first)
              .data,
          'June 2027',
        );

        // The toggle in the year view returns to the day view unchanged.
        await openModal(tester, value: d(17));
        await tester.tap(viewToggle());
        await tester.pumpAndSettle();
        await tester.tap(viewToggle());
        await tester.pumpAndSettle();
        expect(find.byType(TanreiDatePickerDay), findsNWidgets(30));
        expect(
          tester
              .widget<Text>(find.descendant(of: viewToggle(), matching: find.byType(Text)).first)
              .data,
          'September 2026',
        );
      },
    );
  });
  group('keyboard and motion', () {
    testWidgets('DTP-17: the grid is one tab stop, the active day: the chosen date or start in the '
        'month, else today, else the first available day, else the first day', (
      WidgetTester tester,
    ) async {
      await openModal(tester, value: d(17), byKeyboard: true);
      expect(focusedDay(), d(17));
      await openModal(tester, mode: TanreiDatePickerMode.range, start: d(10), end: d(12));
      expect(focusedDay(), d(10));
      await openModal(tester);
      expect(focusedDay(), today);
      await openModal(
        tester,
        currentDate: d(1, 1, 2030),
        firstDate: d(1, 9, 2026),
        lastDate: d(30, 9, 2026),
        disabledDates: <DateTime>[d(1), d(2)],
      );
      expect(focusedDay(), d(3), reason: 'the first available day');
      await openModal(
        tester,
        currentDate: d(1, 1, 2030),
        isDateDisabled: (DateTime date) => date.month == 12 && date.year == 2029,
        firstDate: d(1, 12, 2029),
        lastDate: d(31, 12, 2029),
      );
      expect(focusedDay(), d(1, 12, 2029), reason: 'no available day: the first');
      // Only the active day takes focus from Tab.
      await openModal(tester, value: d(17), byKeyboard: true);
      final List<String> visited = <String>[];
      for (int i = 0; i < 7; i++) {
        await tabTimes(tester, 1);
        visited.add(focusedDay()?.day.toString() ?? focusedText());
      }
      expect(visited, <String>[
        'Cancel',
        'OK',
        'Switch to text entry',
        'September 2026',
        'Previous month',
        'Next month',
        '17',
      ]);
    });

    testWidgets('DTP-18: arrows move the active day by a day (as they point, mirrored right to '
        'left) or a week, Home and End to the row\'s ends, Page Up and Down by a month (Shift: a '
        'year), across months, never past the bounds; unavailable days are reached, not chosen', (
      WidgetTester tester,
    ) async {
      await openModal(
        tester,
        value: d(17),
        byKeyboard: true,
        disabledDates: <DateTime>[d(18)],
        lastDate: d(20, 12, 2027),
      );
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedDay(), d(18));
      await key(tester, LogicalKeyboardKey.enter);
      expect(headerText(tester), 'Thu, Sep 17', reason: 'unavailable: not chosen');
      await key(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedDay(), d(17));
      await key(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedDay(), d(24));
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedDay(), d(17));
      await key(tester, LogicalKeyboardKey.home);
      expect(focusedDay(), d(13), reason: 'Sunday of its row');
      await key(tester, LogicalKeyboardKey.end);
      expect(focusedDay(), d(19));
      await key(tester, LogicalKeyboardKey.pageDown);
      expect(focusedDay(), d(19, 10));
      expect(find.text('October 2026'), findsOneWidget);
      await key(tester, LogicalKeyboardKey.pageUp);
      await key(tester, LogicalKeyboardKey.pageUp);
      expect(focusedDay(), d(19, 8));
      await key(tester, LogicalKeyboardKey.pageDown, shift: true);
      expect(focusedDay(), d(19, 8, 2027));
      await key(tester, LogicalKeyboardKey.pageDown, shift: true);
      expect(focusedDay(), d(20, 12, 2027), reason: 'not past the last date');
      // The last day of a shorter month.
      await openModal(tester, value: d(31, 8), byKeyboard: true);
      await key(tester, LogicalKeyboardKey.pageDown);
      expect(focusedDay(), d(30, 9));
      // Right to left: Right Arrow is the previous day.
      await openModal(tester, value: d(17), byKeyboard: true, textDirection: TextDirection.rtl);
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedDay(), d(16));
      await key(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedDay(), d(17));
      // Space chooses.
      await key(tester, LogicalKeyboardKey.arrowDown);
      await key(tester, LogicalKeyboardKey.space);
      expect(headerText(tester), 'Thu, Sep 24');
    });

    testWidgets('DTP-19: in the year view the list is one tab stop; arrows move a year (as they '
        'point) or a row, Home and End to the first and last year, scrolling into view; Enter and '
        'Space choose', (WidgetTester tester) async {
      await openModal(
        tester,
        value: d(17),
        startView: TanreiDatePickerStartView.year,
        byKeyboard: true,
      );
      expect(focusedYear(), 2026);
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedYear(), 2027);
      await key(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedYear(), 2030);
      await key(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedYear(), 2029);
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedYear(), 2026);
      await key(tester, LogicalKeyboardKey.end);
      expect(focusedYear(), 2100);
      expect(
        tester.getRect(yearFinder(2100)).bottom,
        lessThanOrEqualTo(tester.getRect(find.byType(ListView)).bottom + 0.01),
      );
      await key(tester, LogicalKeyboardKey.home);
      expect(focusedYear(), 1900);
      await key(tester, LogicalKeyboardKey.arrowRight);
      await key(tester, LogicalKeyboardKey.enter);
      expect(find.text('September 1901'), findsOneWidget);
      expect(focusedDay(), d(1, 9, 1901));
      // Space, and one tab stop.
      await openModal(
        tester,
        value: d(17),
        startView: TanreiDatePickerStartView.year,
        byKeyboard: true,
      );
      await tabTimes(tester, 1);
      expect(focusedText(), 'Cancel', reason: 'from the list, Tab leaves it');
      await tabTimes(tester, 1, shift: true);
      expect(focusedYear(), 2026);
      await key(tester, LogicalKeyboardKey.arrowRight);
      await key(tester, LogicalKeyboardKey.space);
      expect(find.text('September 2027'), findsOneWidget);
    });

    testWidgets('DTP-20: the previous and next buttons show the other month, keep focus, make the '
        'active day the same day number (the last day of a shorter month) and announce the month '
        'once, politely; choosing a year announces the same way', (WidgetTester tester) async {
      final List<String> announcements = collectAnnouncements(tester);
      await openModal(tester, value: d(31, 8), byKeyboard: true);
      await tabTimes(tester, 1, shift: true);
      expect(focusedText(), 'Next month');
      await key(tester, LogicalKeyboardKey.enter);
      expect(focusedText(), 'Next month');
      expect(find.text('September 2026'), findsOneWidget);
      expect(announcements, <String>['September 2026 (0)']);
      await tabTimes(tester, 1);
      expect(focusedDay(), d(30), reason: 'the 31st of a 30-day month');
      await tabTimes(tester, 2, shift: true);
      await key(tester, LogicalKeyboardKey.enter);
      expect(focusedText(), 'Previous month');
      expect(announcements.last, 'August 2026 (0)');
      await tester.tap(viewToggle());
      await tester.pumpAndSettle();
      await tester.tap(yearFinder(2027));
      await tester.pumpAndSettle();
      expect(announcements.last, 'August 2027 (0)');
      expect(announcements, hasLength(3));
    });

    testWidgets('DTP-21: a later month slides in from the end while the old one leaves toward the '
        'start (the reverse for an earlier one, mirrored right to left) over page-duration; the '
        'views cross-fade; the weekday row stays; reduced motion changes at once', (
      WidgetTester tester,
    ) async {
      await openDocked(tester, value: d(17));
      final double weekdays = tester.getRect(find.text('M')).top;
      final Rect before = tester.getRect(dayFinder(17));
      await tester.tap(iconButton('Next month'));
      await tester.pump();
      await tester.pump(ms(pickerTokens.motionPageDuration ~/ 2));
      final Rect incoming = tester.getRect(dayFinder(17, 10));
      final Rect outgoing = tester.getRect(dayFinder(17));
      final double gridLeft =
          tester.getRect(surfaceFinder(modal: false)).left + pickerTokens.containerPaddingInline;
      // October 17 is a Saturday: its column is the last.
      expect(
        incoming.left,
        greaterThan(gridLeft + 6 * pickerTokens.cellSize),
        reason: 'from the end',
      );
      expect(outgoing.left, lessThan(before.left), reason: 'toward the start');
      expect(tester.getRect(find.text('M')).top, weekdays, reason: 'the weekday row stays');
      await tester.pumpAndSettle();
      expect(dayFinder(17), findsNothing);
      await tester.tap(iconButton('Previous month'));
      await tester.pump();
      await tester.pump(ms(pickerTokens.motionPageDuration ~/ 2));
      expect(
        tester.getRect(dayFinder(17)).left,
        lessThan(before.left),
        reason: 'earlier: from the start',
      );
      await tester.pumpAndSettle();

      // The views cross-fade.
      await tester.tap(viewToggle());
      await tester.pump();
      await tester.pump(ms(pickerTokens.motionPageDuration ~/ 2));
      expect(find.byType(TanreiDatePickerYear), findsWidgets);
      expect(find.byType(TanreiDatePickerDay), findsWidgets);
      await tester.pumpAndSettle();
      expect(find.byType(TanreiDatePickerDay), findsNothing);

      // Right to left: a later month comes in from the left.
      await openDocked(tester, value: d(17), textDirection: TextDirection.rtl);
      final Rect rtlBefore = tester.getRect(dayFinder(17));
      await tester.tap(iconButton('Next month'));
      await tester.pump();
      await tester.pump(ms(pickerTokens.motionPageDuration ~/ 2));
      expect(tester.getRect(dayFinder(17)).left, greaterThan(rtlBefore.left));
      await tester.pumpAndSettle();

      // Reduced motion: at once.
      await openDocked(tester, value: d(17), disableAnimations: true);
      await tester.tap(iconButton('Next month'));
      await tester.pump();
      expect(dayFinder(17), findsNothing);
      expect(dayFinder(17, 10), findsOneWidget);
    });

    testWidgets('DTP-22: a modal picker fades its scrim and container in, growing it from '
        'enter-scale, over open-duration, and fades out over close-duration; a docked one fades in '
        'growing from the anchor\'s edge and fades out; reduced motion: modal fades without growing, '
        'docked at once; Android\'s setting: both at once', (WidgetTester tester) async {
      Opacity fade() => tester.widget<Opacity>(
        find.ancestor(of: surfaceFinder(), matching: find.byType(Opacity)).first,
      );
      Transform scale() => tester.widget<Transform>(
        find.ancestor(of: surfaceFinder(), matching: find.byType(Transform)).first,
      );
      await openModal(tester, value: d(17), settle: false);
      await tester.pump(ms(pickerTokens.modalMotionOpenDuration ~/ 2));
      expect(fade().opacity, inExclusiveRange(0, 1));
      final double half = scale().transform.storage[0];
      expect(half, inExclusiveRange(pickerTokens.modalMotionEnterScale, 1));
      await tester.pump(ms(pickerTokens.modalMotionOpenDuration ~/ 2 + 1));
      expect(fade().opacity, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      await tester.pump(ms(pickerTokens.modalMotionCloseDuration ~/ 2));
      expect(fade().opacity, inExclusiveRange(0, 1));
      expect(scale().transform.storage[0], 1, reason: 'it closes by fading alone');
      await tester.pump(ms(pickerTokens.modalMotionCloseDuration ~/ 2 + 1));
      await tester.pump();
      expect(surfaceFinder(), findsNothing);

      // Reduced motion (off Android, whose setting removes every animation): a fade without
      // growing.
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      try {
        await openModal(tester, value: d(17), settle: false, disableAnimations: true);
        await tester.pump(ms(pickerTokens.modalMotionOpenDuration ~/ 2));
        expect(fade().opacity, inExclusiveRange(0, 1));
        expect(scale().transform.storage[0], 1);
        await tester.pumpAndSettle();
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }

      // Docked.
      final Docked docked = await openDocked(tester, value: d(17), open: false);
      RenderTanreiDatePickerPosition position() =>
          tester.allRenderObjects.whereType<RenderTanreiDatePickerPosition>().toSet().single;
      docked.controller.open();
      await tester.pump();
      await tester.pump(ms(pickerTokens.dockedMotionOpenDuration ~/ 2));
      expect(position().progress, inExclusiveRange(0, 1));
      expect(position().closing, isFalse);
      await tester.pumpAndSettle();
      docked.controller.close();
      await tester.pump();
      await tester.pump(ms(pickerTokens.dockedMotionCloseDuration ~/ 2));
      expect(position().progress, inExclusiveRange(0, 1));
      expect(position().closing, isTrue, reason: 'it fades without shrinking');
      await tester.pumpAndSettle();
      expect(surfaceFinder(modal: false), findsNothing);

      final Docked reduced = await openDocked(
        tester,
        value: d(17),
        open: false,
        disableAnimations: true,
      );
      reduced.controller.open();
      await tester.pump();
      expect(position().progress, 1);

      // Android's setting removes every animation.
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      try {
        await openModal(tester, value: d(17), settle: false, disableAnimations: true);
        await tester.pump();
        expect(fade().opacity, 1);
      } finally {
        debugDefaultTargetPlatformOverride = null;
      }
    });
  });
  group('modal parts and text entry', () {
    testWidgets(
      'DTP-23: the header, inset by its paddings, shows the label and header.gap below it '
      'the pending choice in its style and color — the year added outside the current year, an '
      'unchosen part as its label in the placeholder color, the dash in the value\'s color — with '
      'the entry-mode toggle at its end, and a divider below',
      (WidgetTester tester) async {
        await openModal(tester, value: d(17));
        expect(headerText(tester), 'Thu, Sep 17');
        final Text value = tester.widget(headerValue);
        expect(value.style!.fontSize, pickerTokens.headerValueTypescale.size);
        expect(value.style!.color, paint(pickerTokens.headerValueColor));
        final Rect surface = tester.getRect(surfaceFinder());
        final Rect label = tester.getRect(find.text('Select date'));
        expect(label.left - surface.left, pickerTokens.headerPaddingInlineStart);
        expect(label.top - surface.top, pickerTokens.headerPaddingBlock);
        expect(
          tester.widget<Text>(find.text('Select date')).style!.color,
          paint(pickerTokens.headerLabelColor),
        );
        final TanreiIconButton toggle = tester.widget(iconButton('Switch to text entry'));
        expect((toggle.icon as Text).data, '\u{e312}', reason: 'keyboard');
        expect(toggle.variant, TanreiIconButtonVariant.standard);
        expect(toggle.size, TanreiIconButtonSize.medium);
        expect(
          surface.right - tester.getRect(iconButton('Switch to text entry')).right,
          pickerTokens.headerPaddingInlineEnd,
        );
        final Finder divider = find.byWidgetPredicate(
          (Widget w) => w is ColoredBox && w.color == paint(pickerTokens.dividerColor),
        );
        expect(tester.getSize(divider), Size(surface.width, pickerTokens.dividerWidth));

        await openModal(tester, mode: TanreiDatePickerMode.range, start: d(10));
        final List<InlineSpan> spans =
            (tester.widget<Text>(headerValue).textSpan! as TextSpan).children!;
        final Color placeholder = paint(pickerTokens.headerPlaceholderColor);
        expect(spans.map((InlineSpan s) => (s as TextSpan).text), <String>[
          'Sep 10',
          ' – ',
          'End date',
        ]);
        expect((spans[0] as TextSpan).style!.color, paint(pickerTokens.headerValueColor));
        expect(
          (spans[1] as TextSpan).style!.color,
          paint(pickerTokens.headerValueColor),
          reason: 'the dash',
        );
        expect((spans[2] as TextSpan).style!.color, placeholder);
        await openModal(tester);
        expect(headerText(tester), 'Date');
        await openModal(tester, value: d(17), currentDate: d(15, 1, 2027));
        expect(headerText(tester), 'Thu, Sep 17, 2026');
        await openModal(
          tester,
          mode: TanreiDatePickerMode.range,
          start: d(30, 12, 2026),
          end: d(2, 1, 2027),
        );
        expect(headerText(tester), 'Dec 30 – Jan 2, 2027');
        await tester.tap(iconButton('Switch to text entry'));
        await tester.pumpAndSettle();
        expect(
          (tester.widget<TanreiIconButton>(iconButton('Switch to calendar')).icon as Text).data,
          '\u{ebcc}',
        );
      },
    );

    testWidgets('DTP-24: Cancel and OK are text Buttons of the medium size, OK last, at the end, '
        'actions.gap apart, padded; Cancel closes with cancel; a docked picker has none', (
      WidgetTester tester,
    ) async {
      final Emitted emitted = await openModal(tester, value: d(17));
      final TanreiButton cancel = tester.widget(buttonText('Cancel'));
      final TanreiButton ok = tester.widget(buttonText('OK'));
      expect(cancel.variant, TanreiButtonVariant.text);
      expect(ok.variant, TanreiButtonVariant.text);
      expect(cancel.size, TanreiButtonSize.medium);
      final Rect c = tester.getRect(buttonText('Cancel'));
      final Rect o = tester.getRect(buttonText('OK'));
      final Rect surface = tester.getRect(surfaceFinder());
      expect(o.left, greaterThan(c.right));
      expect(o.left - c.right, moreOrLessEquals(pickerTokens.actionsGap));
      expect(surface.right - o.right, moreOrLessEquals(pickerTokens.containerPaddingInline));
      expect(surface.bottom - o.bottom, moreOrLessEquals(pickerTokens.actionsPaddingBlock));
      await tester.tap(buttonText('Cancel'));
      await tester.pumpAndSettle();
      expect(emitted.events, <String>['close:cancel']);
      await openDocked(tester, value: d(17));
      expect(buttonText('Cancel'), findsNothing);
      expect(buttonText('OK'), findsNothing);
    });

    testWidgets('DTP-25: text entry shows outlined medium text fields — one full width, or two '
        'input.gap apart and equally wide — labelled by their labels, with the locale\'s pattern as '
        'placeholder, inset by the input paddings', (WidgetTester tester) async {
      await openModal(tester, value: d(17), entryMode: TanreiDatePickerEntryMode.text);
      final TanreiTextField field = tester.widget(fieldFinder('Date'));
      expect(field.variant, TanreiTextFieldVariant.outlined);
      expect(field.size, TanreiTextFieldSize.medium);
      expect(field.type, TanreiTextFieldType.text);
      expect(field.hintText, 'mm/dd/yyyy');
      final Rect surface = tester.getRect(surfaceFinder());
      final Rect box = tester.getRect(fieldFinder('Date'));
      expect(box.left - surface.left, pickerTokens.inputPaddingInline);
      expect(surface.right - box.right, pickerTokens.inputPaddingInline);
      expect(find.byType(TanreiDatePickerDay), findsNothing);

      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        entryMode: TanreiDatePickerEntryMode.text,
      );
      final Rect start = tester.getRect(fieldFinder('Start date'));
      final Rect end = tester.getRect(fieldFinder('End date'));
      expect(end.left - start.right, pickerTokens.inputGap);
      expect(start.width, end.width);
    });

    testWidgets('DTP-25: in range mode, when one label wraps (TXF-13) and the other does not, the '
        'two containers are equally tall, the taller one\'s height, and level; an error line below '
        'one field does not count', (WidgetTester tester) async {
      const String long = 'First day of the stay';
      const String short = 'To';
      for (final (String startLabel, String endLabel) in <(String, String)>[
        (long, short),
        (short, long),
      ]) {
        final String reason = 'start "$startLabel", end "$endLabel"';
        await openModal(
          tester,
          mode: TanreiDatePickerMode.range,
          start: d(10),
          end: d(16),
          entryMode: TanreiDatePickerEntryMode.text,
          labels: TanreiDatePickerLabels(startLabel: startLabel, endLabel: endLabel),
        );
        Size labelSize(String label) =>
            tester.getSize(find.descendant(of: fieldFinder(label), matching: find.text(label)));
        // The long label wraps in its field; the short one fits on one line.
        expect(labelSize(long).height, greaterThan(labelSize(short).height * 1.5), reason: reason);
        final Rect wraps = tester.getRect(fieldFinder(long));
        expect(
          tester.getRect(fieldContainer(long)).top,
          greaterThan(wraps.top),
          reason: '$reason: room reserved above the container for the floated lines',
        );

        void containersLevel(String reason) {
          final Rect startContainer = tester.getRect(fieldContainer(startLabel));
          final Rect endContainer = tester.getRect(fieldContainer(endLabel));
          // Level and equally tall: they span the same rows.
          expect(endContainer.top, moreOrLessEquals(startContainer.top), reason: reason);
          expect(endContainer.bottom, moreOrLessEquals(startContainer.bottom), reason: reason);
          expect(tester.takeException(), isNull, reason: reason);
        }

        final Rect start = tester.getRect(fieldFinder(startLabel));
        final Rect end = tester.getRect(fieldFinder(endLabel));
        containersLevel(reason);
        // Equally tall, the taller one's height: the one whose label wraps.
        expect(end.top, moreOrLessEquals(start.top), reason: reason);
        expect(
          <double>[start.height, end.height],
          everyElement(moreOrLessEquals(wraps.height)),
          reason: reason,
        );
        // Still equally wide, input.gap apart.
        expect(end.width, moreOrLessEquals(start.width), reason: reason);
        expect(end.left - start.right, moreOrLessEquals(pickerTokens.inputGap), reason: reason);

        // An error line below one field (DTP-26) does not count: the containers stay as they were.
        final Rect before = tester.getRect(fieldContainer(startLabel));
        await tester.enterText(fieldFinder(startLabel), 'not a date');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pumpAndSettle();
        expect(tester.widget<TanreiTextField>(fieldFinder(startLabel)).isError, isTrue);
        expect(
          tester.getRect(fieldFinder(startLabel)).height,
          greaterThan(tester.getRect(fieldFinder(endLabel)).height),
          reason: '$reason: the error line is below the start field only',
        );
        containersLevel('$reason, the start field in error');
        // The surface is centred and grows by the line, so only the containers' height is kept.
        expect(
          tester.getSize(fieldContainer(startLabel)),
          before.size,
          reason: '$reason: the container keeps its height',
        );
      }
    });

    testWidgets('DTP-26: each field is filled with its pending date in the numeric form; text '
        'reading as an available date becomes the pending date, an emptied field clears it; a '
        'committed field that does not read so is put in error and cleared; the next edit clears '
        'the error; typing is never reformatted', (WidgetTester tester) async {
      await openModal(
        tester,
        value: d(17),
        entryMode: TanreiDatePickerEntryMode.text,
        firstDate: d(1),
        lastDate: d(30, 12),
      );
      String text(String label) =>
          tester.widget<TanreiTextField>(fieldFinder(label)).controller!.text;
      expect(text('Date'), '09/17/2026');
      await tester.enterText(fieldFinder('Date'), '9-3-2026');
      await tester.pump();
      expect(headerText(tester), 'Thu, Sep 3');
      expect(text('Date'), '9-3-2026', reason: 'not reformatted');
      await tester.enterText(fieldFinder('Date'), '');
      await tester.pump();
      expect(headerText(tester), 'Date');
      await tester.enterText(fieldFinder('Date'), '13/40/2026');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      TanreiTextField field = tester.widget(fieldFinder('Date'));
      expect(field.isError, isTrue);
      expect(field.errorText, 'Enter a valid date');
      await tester.enterText(fieldFinder('Date'), '1/5/2025');
      await tester.pump();
      field = tester.widget(fieldFinder('Date'));
      expect(field.isError, isFalse, reason: 'the next edit clears it');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      field = tester.widget(fieldFinder('Date'));
      expect(field.errorText, "This date can't be chosen");
      expect(headerText(tester), 'Date', reason: 'its pending date is cleared');

      // An end before the start is not a date for the end field.
      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        start: d(10),
        end: d(16),
        entryMode: TanreiDatePickerEntryMode.text,
      );
      expect(text('Start date'), '09/10/2026');
      expect(text('End date'), '09/16/2026');
      await tester.enterText(fieldFinder('End date'), '09/05/2026');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(
        tester.widget<TanreiTextField>(fieldFinder('End date')).errorText,
        'Enter a valid date',
      );
      // Three groups only, a four-digit year.
      await tester.enterText(fieldFinder('End date'), '09/20/26');
      await tester.pump();
      expect(headerText(tester), 'Sep 10 – End date');
      await tester.enterText(fieldFinder('End date'), '09/20/2026');
      await tester.pump();
      expect(headerText(tester), 'Sep 10 – Sep 20');
    });

    testWidgets('DTP-27: the action key moves to the next field, and in the last one activates OK '
        'while it is enabled', (WidgetTester tester) async {
      final Emitted emitted = await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        entryMode: TanreiDatePickerEntryMode.text,
      );
      await tester.enterText(fieldFinder('Start date'), '09/10/2026');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(focusedText(), 'End date');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(emitted.events, isEmpty, reason: 'OK is disabled without an end');
      await tester.enterText(fieldFinder('End date'), '09/12/2026');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(emitted.events, <String>['change', 'close:confirm']);
      expect(emitted.result, TanreiDateSelection(start: d(10), end: d(12)));
    });

    testWidgets(
      'DTP-28: the entry-mode toggle switches between the calendar and text entry, keeping '
      'the pending choice, showing its month and moving focus to the first field or the active '
      'day; a docked picker shows the calendar only and reports entryMode text',
      (WidgetTester tester) async {
        await openModal(tester, value: d(17, 3));
        await tester.tap(dayFinder(20, 3));
        await tester.pumpAndSettle();
        await tester.tap(iconButton('Previous month'));
        await tester.pumpAndSettle();
        await tester.tap(iconButton('Switch to text entry'));
        await tester.pumpAndSettle();
        expect(tester.widget<TanreiTextField>(fieldFinder('Date')).controller!.text, '03/20/2026');
        expect(focusedText(), 'Date');
        await tester.tap(iconButton('Switch to calendar'));
        await tester.pumpAndSettle();
        expect(find.text('March 2026'), findsOneWidget, reason: 'the pending date\'s month');
        expect(focusedDay(), d(20, 3));
        expect(headerText(tester), 'Fri, Mar 20');

        final List<String> reports = collectIgnoredValues();
        await openDocked(tester, value: d(17), entryMode: TanreiDatePickerEntryMode.text);
        expect(find.byType(TanreiTextField), findsNothing);
        expect(find.byType(TanreiDatePickerDay), findsWidgets);
        expect(reports, hasLength(1));
        expect(reports.single, contains('entryMode'));
      },
    );

    testWidgets('DTP-29: days before the first date, after the last, listed or named by the '
        'predicate are unavailable; the picker opens on the chosen date\'s or start\'s month, else '
        'today\'s, within the bounds, or on the year view', (WidgetTester tester) async {
      await openDocked(
        tester,
        value: d(12),
        firstDate: d(3),
        lastDate: d(22),
        disabledDates: <DateTime>[d(12)],
      );
      expect(dayOf(tester, 2).disabled, isTrue);
      expect(dayOf(tester, 3).disabled, isFalse);
      expect(dayOf(tester, 12).disabled, isTrue);
      expect(dayOf(tester, 23).disabled, isTrue);
      await openModal(
        tester,
        isDateDisabled: (DateTime date) =>
            date.weekday == DateTime.saturday || date.weekday == DateTime.sunday,
      );
      expect(dayOf(tester, 19).disabled, isTrue);
      expect(dayOf(tester, 18).disabled, isFalse);
      await openModal(tester, mode: TanreiDatePickerMode.range, start: d(5, 11), end: d(8, 11));
      expect(find.text('November 2026'), findsOneWidget);
      await openModal(tester, currentDate: d(24, 9), firstDate: d(1, 1, 2027));
      expect(
        find.text('January 2027'),
        findsOneWidget,
        reason: 'today\'s month, clamped to the first',
      );
      await openModal(tester, value: d(17), startView: TanreiDatePickerStartView.year);
      expect(find.byType(TanreiDatePickerYear), findsWidgets);
    });

    testWidgets('DTP-30: an unavailable day draws the disabled tokens of its condition, is never '
        'chosen, is exposed as disabled and stays reachable by the arrows; a value naming one draws '
        'selected from the disabled tokens', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await openModal(
        tester,
        value: d(12),
        disabledDates: <DateTime>[d(12), d(13)],
        byKeyboard: true,
      );
      final TanreiDatePickerConditionStateTokens selectedDisabled = tone(
        TanreiDatePickerCondition.selected,
        TanreiInteractionState.disabled,
      );
      expect(dayOf(tester, 12).condition, TanreiDatePickerCondition.selected);
      expect(fillOf(tester, dayFinder(12)), paint(selectedDisabled.containerColor));
      expect(labelOf(tester, dayFinder(12)), paint(selectedDisabled.labelColor));
      final TanreiDatePickerConditionStateTokens disabled = tone(
        TanreiDatePickerCondition.unselected,
        TanreiInteractionState.disabled,
      );
      expect(labelOf(tester, dayFinder(13)), paint(disabled.labelColor));
      final SemanticsData node = daySemantics(tester, 13);
      expect(node.hasFlag(ui.SemanticsFlag.hasEnabledState), isTrue);
      expect(node.hasFlag(ui.SemanticsFlag.isEnabled), isFalse);
      expect(focusedDay(), d(12));
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedDay(), d(13), reason: 'reachable');
      await key(tester, LogicalKeyboardKey.enter);
      expect(headerText(tester), 'Sat, Sep 12', reason: 'not chosen');
      await tester.tap(dayFinder(13));
      await tester.pumpAndSettle();
      expect(headerText(tester), 'Sat, Sep 12');
      handle.dispose();
    });
  });
  group('states', () {
    const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);

    testWidgets('DTP-31: under the acme system a hovered, keyboard-focused or pressed day, year or '
        'view toggle draws its condition\'s tokens of that state, pressed over focused over hovered; '
        'pointer focus draws no focused state; colors ease over state-duration, at once where motion '
        'is reduced', (WidgetTester tester) async {
      Color fill(TanreiDatePickerCondition condition, TanreiInteractionState state) =>
          acme.paint(tone(condition, state, acmeSystem).containerColor);
      expect(<Color>{
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.focused),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.pressed),
      }, hasLength(3));
      await openModal(tester, value: d(17), theme: acme, byKeyboard: true);
      expect(
        fillOf(tester, dayFinder(17)),
        fill(TanreiDatePickerCondition.selected, TanreiInteractionState.focused),
      );
      final TestGesture mouse = await hoverOver(tester, dayFinder(17));
      expect(
        fillOf(tester, dayFinder(17)),
        fill(TanreiDatePickerCondition.selected, TanreiInteractionState.focused),
        reason: 'focused over hovered',
      );
      await mouse.moveTo(tester.getCenter(dayFinder(9)));
      await tester.pumpAndSettle();
      expect(
        fillOf(tester, dayFinder(9)),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered),
      );
      await mouse.down(tester.getCenter(dayFinder(9)));
      await tester.pump();
      expect(
        fillOf(tester, dayFinder(9)),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.pressed),
      );
      await mouse.up();
      await tester.pumpAndSettle();
      // The hover eases over state-duration.
      await mouse.moveTo(tester.getCenter(dayFinder(10)));
      await tester.pump();
      await tester.pump(ms(acmeSystem.datePicker.motionStateDuration ~/ 2));
      final Color midway = fillOf(tester, dayFinder(10));
      expect(
        midway,
        isNot(fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered)),
      );
      expect(
        midway,
        isNot(fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.enabled)),
      );
      await tester.pumpAndSettle();
      // The view toggle and a year.
      await mouse.moveTo(tester.getCenter(viewToggle()));
      await tester.pumpAndSettle();
      expect(
        fillOf(tester, viewToggle()),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered),
      );
      await tester.tap(viewToggle());
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(yearFinder(2027)));
      await tester.pumpAndSettle();
      expect(
        fillOf(tester, yearFinder(2027)),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered),
      );
      await mouse.moveTo(const Offset(1, 1));
      await tester.pumpAndSettle();

      // Pointer focus: no focused state.
      await openModal(tester, value: d(17), theme: acme);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(dayFinder(9));
      await tester.pumpAndSettle();
      expect(
        fillOf(tester, dayFinder(9)),
        fill(TanreiDatePickerCondition.selected, TanreiInteractionState.enabled),
      );

      // Reduced motion: at once.
      await openModal(tester, value: d(17), theme: acme, disableAnimations: true);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await mouse.moveTo(tester.getCenter(dayFinder(10)));
      await tester.pumpAndSettle();
      await mouse.moveTo(tester.getCenter(dayFinder(11)));
      await tester.pump();
      expect(
        fillOf(tester, dayFinder(11)),
        fill(TanreiDatePickerCondition.unselected, TanreiInteractionState.hovered),
      );
    });

    testWidgets(
      'DTP-32: keyboard focus shows the focus ring around the day\'s square — an in-range '
      'day\'s too — the year\'s and the toggle\'s container, at once; pointer or touch focus shows '
      'none',
      (WidgetTester tester) async {
        TanreiFocusRing ring(Finder item) => tester.widget<TanreiFocusRing>(
          find.descendant(of: item, matching: find.byType(TanreiFocusRing)),
        );
        await openModal(
          tester,
          mode: TanreiDatePickerMode.range,
          start: d(10),
          end: d(16),
          byKeyboard: true,
        );
        await key(tester, LogicalKeyboardKey.arrowRight);
        expect(focusedDay(), d(11));
        expect(ring(dayFinder(11)).visible, isTrue);
        expect(
          tester.getSize(
            find
                .descendant(
                  of: find.descendant(of: dayFinder(11), matching: find.byType(TanreiFocusRing)),
                  matching: find.byType(SizedBox),
                )
                .first,
          ),
          Size.square(pickerTokens.dayContainerSize),
        );
        await tabTimes(tester, 3, shift: true);
        expect(focusedText(), 'September 2026');
        expect(ring(viewToggle()).visible, isTrue);
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
        await tester.pump();
        expect(ring(viewToggle()).visible, isFalse);
        await tester.tap(dayFinder(12));
        await tester.pumpAndSettle();
        expect(ring(dayFinder(12)).visible, isFalse);
      },
    );

    testWidgets(
      'DTP-33: a press shows the pressed state at once and keeps it for the press-hold, for '
      'a day, a year and the view toggle',
      (WidgetTester tester) async {
        await openModal(tester, value: d(17), theme: acme);
        final Duration hold = tanreiDuration(acmeSystem.motion.duration.pressHold);
        final Color pressed = acme.paint(
          tone(
            TanreiDatePickerCondition.unselected,
            TanreiInteractionState.pressed,
            acmeSystem,
          ).containerColor,
        );
        final TestGesture touch = await tester.startGesture(tester.getCenter(viewToggle()));
        await tester.pump();
        expect(fillOf(tester, viewToggle()), pressed, reason: 'without delay');
        await touch.up();
        await tester.pump(hold - ms(1));
        expect(fillOf(tester, viewToggle()), pressed, reason: 'held');
        await tester.pumpAndSettle();
        // A day, by Enter.
        await openModal(tester, value: d(17), theme: acme, byKeyboard: true);
        await key(tester, LogicalKeyboardKey.arrowLeft);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        expect(
          fillOf(tester, dayFinder(16)),
          acme.paint(
            tone(
              TanreiDatePickerCondition.selected,
              TanreiInteractionState.pressed,
              acmeSystem,
            ).containerColor,
          ),
        );
        await tester.pump(hold - ms(1));
        expect(
          fillOf(tester, dayFinder(16)),
          acme.paint(
            tone(
              TanreiDatePickerCondition.selected,
              TanreiInteractionState.pressed,
              acmeSystem,
            ).containerColor,
          ),
        );
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'DTP-34: the press answers as pressed-feedback names: overlay (the default) paints the '
      'pressed container, ripple (m3-like) grows a ripple and keeps the container underneath, dim '
      '(cupertino) keeps it and applies the pressed opacity, none changes nothing',
      (WidgetTester tester) async {
        Future<void> pressDay(TanreiThemeData theme) async {
          await openModal(tester, value: d(17), theme: theme);
          await tester.startGesture(tester.getCenter(dayFinder(9)));
          await tester.pump();
        }

        await pressDay(lightTheme);
        expect(
          fillOf(tester, dayFinder(9)),
          paint(
            tone(
              TanreiDatePickerCondition.unselected,
              TanreiInteractionState.pressed,
            ).containerColor,
          ),
        );
        expect(decorationOf(tester, dayFinder(9)).ripple, isNull);

        const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
        await pressDay(m3);
        expect(decorationOf(tester, dayFinder(9)).ripple, isNotNull);
        expect(
          fillOf(tester, dayFinder(9)).a,
          m3
              .paint(
                tone(
                  TanreiDatePickerCondition.unselected,
                  TanreiInteractionState.enabled,
                  m3LikeSystem,
                ).containerColor,
              )
              .a,
          reason: 'the container stays with the state under the press',
        );

        const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
        await pressDay(cupertino);
        expect(decorationOf(tester, dayFinder(9)).ripple, isNull);
        final Opacity dim = tester.widget(
          find.descendant(of: dayFinder(9), matching: find.byType(Opacity)).first,
        );
        expect(dim.opacity, cupertinoSystem.datePicker.pressed.opacity);

        final TanreiThemeData silent = TanreiThemeData(
          system: system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
          ),
        );
        await pressDay(silent);
        expect(fillOf(tester, dayFinder(9)), none);
        await tester.pumpAndSettle();
      },
    );

    testWidgets('DTP-35: the containers of days, years and the view toggle ease their corners by '
        'corner-smoothing, and keyboard focus follows focus-style (acme: glow)', (
      WidgetTester tester,
    ) async {
      await openModal(
        tester,
        value: d(17),
        theme: const TanreiThemeData(system: cupertinoSystem),
      );
      expect(
        decorationOf(tester, dayFinder(17)).shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      expect(
        decorationOf(tester, viewToggle()).shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      await openModal(tester, value: d(17), theme: acme, byKeyboard: true);
      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      final CustomPaint painter = tester.widget(
        find
            .descendant(
              of: find.descendant(of: dayFinder(17), matching: find.byType(TanreiFocusRing)),
              matching: find.byType(CustomPaint),
            )
            .first,
      );
      expect(painter.foregroundPainter, isNotNull);
    });
  });

  group('accessibility, locale, layout and values', () {
    testWidgets(
      'DTP-36: the surface is a dialog named by label (a modal one scopes the route); the '
      'grid a table named by the month with the weekdays as column headers; each day a button '
      'named by its full date (today with the today label), selected in the choice, described as '
      'start or end, disabled while unavailable; empty cells hidden; the view toggle a button with '
      'its description and expanded state; years buttons; the anchor says whether it is open',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await openModal(
          tester,
          mode: TanreiDatePickerMode.range,
          start: d(10),
          end: d(12),
          labels: const TanreiDatePickerLabels(label: 'Select dates'),
        );
        final SemanticsData dialog = nodesWithRole(tester, SemanticsRole.dialog).single;
        expect(dialog.label, 'Select dates');
        expect(dialog.hasFlag(ui.SemanticsFlag.scopesRoute), isTrue);
        final SemanticsData table = nodesWithRole(tester, SemanticsRole.table).single;
        expect(table.label, 'September 2026');
        expect(
          nodesWithRole(tester, SemanticsRole.row),
          hasLength(6),
          reason: 'the weekdays and five weeks',
        );
        expect(
          nodesWithRole(tester, SemanticsRole.cell),
          hasLength(30),
          reason: 'empty cells hidden',
        );
        final SemanticsData start = daySemantics(tester, 10);
        expect(start.label, 'Thursday, September 10, 2026');
        expect(start.hint, 'Start date');
        expect(start.hasFlag(ui.SemanticsFlag.isButton), isTrue);
        expect(start.hasFlag(ui.SemanticsFlag.isSelected), isTrue);
        expect(daySemantics(tester, 11).hasFlag(ui.SemanticsFlag.isSelected), isTrue);
        expect(daySemantics(tester, 12).hint, 'End date');
        expect(daySemantics(tester, 13).hasFlag(ui.SemanticsFlag.isSelected), isFalse);
        expect(daySemantics(tester, 24).label, 'Thursday, September 24, 2026, Today');
        final SemanticsData toggle = tester.getSemantics(viewToggle()).getSemanticsData();
        expect(toggle.label, 'September 2026');
        expect(toggle.hint, 'Choose a year');
        expect(toggle.hasFlag(ui.SemanticsFlag.hasExpandedState), isTrue);
        expect(toggle.hasFlag(ui.SemanticsFlag.isExpanded), isFalse);
        await tester.tap(viewToggle());
        await tester.pumpAndSettle();
        expect(
          tester.getSemantics(viewToggle()).getSemanticsData().hasFlag(ui.SemanticsFlag.isExpanded),
          isTrue,
        );
        final SemanticsData year = tester.getSemantics(yearFinder(2026)).getSemanticsData();
        expect(year.label, '2026, Today');
        expect(year.hasFlag(ui.SemanticsFlag.isButton), isTrue);
        expect(year.hasFlag(ui.SemanticsFlag.isSelected), isTrue);
        // Activation by assistive technology.
        await openModal(tester, value: d(17));
        tester.semantics.tap(find.semantics.byLabel('Friday, September 18, 2026'));
        await tester.pumpAndSettle();
        expect(headerText(tester), 'Fri, Sep 18');

        // The docked picker: a dialog, not scoping the route; the anchor's expanded state.
        final Docked docked = await openDocked(tester, value: d(17), open: false);
        expect(
          tester
              .getSemantics(buttonText('Open'))
              .getSemanticsData()
              .hasFlag(ui.SemanticsFlag.isExpanded),
          isFalse,
        );
        docked.controller.open();
        await tester.pumpAndSettle();
        final SemanticsData surface = nodesWithRole(tester, SemanticsRole.dialog).single;
        expect(surface.label, 'Select date');
        expect(surface.hasFlag(ui.SemanticsFlag.scopesRoute), isFalse);
        expect(
          tester
              .getSemantics(buttonText('Open'))
              .getSemanticsData()
              .hasFlag(ui.SemanticsFlag.isExpanded),
          isTrue,
        );
        handle.dispose();
      },
    );

    testWidgets(
      'DTP-37: names, digits, the numeric form and the first day of the week come from the '
      'locale (firstDayOfWeek overriding its first day); a locale without localizations keeps its '
      'week data; today is the device\'s date when the picker opens',
      (WidgetTester tester) async {
        // A product's localizations for French, through the app's delegates.
        await openModal(
          tester,
          value: d(17),
          locale: const Locale('fr', 'FR'),
          delegates: const <LocalizationsDelegate<dynamic>>[
            TanreiDateLocalizations.delegate,
            _MarkedDelegate(),
          ],
          supportedLocales: const <Locale>[Locale('en', 'US'), Locale('fr', 'FR')],
        );
        expect(find.text('m9.2026'), findsOneWidget);
        expect(find.text('w1'), findsOneWidget, reason: 'France starts on Monday');
        expect(
          tester.getRect(find.text('w1')).left,
          lessThan(tester.getRect(find.text('w7')).left),
        );
        expect(find.text('I7'), findsOneWidget, reason: 'the locale\'s digits');
        await tester.tap(iconButton('Switch to text entry'));
        await tester.pumpAndSettle();
        expect(tester.widget<TanreiTextField>(fieldFinder('Date')).controller!.text, 'I7.09.2026');
        expect(tester.widget<TanreiTextField>(fieldFinder('Date')).hintText, 'dd.mm.yyyy');
        await tester.enterText(fieldFinder('Date'), 'I8.9.2026');
        await tester.pump();
        await tester.tap(iconButton('Switch to calendar'));
        await tester.pumpAndSettle();
        expect(dayOf(tester, 18).condition, TanreiDatePickerCondition.selected);

        // firstDayOfWeek overrides it.
        final SemanticsHandle handle = tester.ensureSemantics();
        await openDocked(
          tester,
          value: d(17),
          firstDayOfWeek: TanreiDatePickerFirstDayOfWeek.monday,
        );
        expect(nodesWithRole(tester, SemanticsRole.columnHeader).first.label, 'Monday');
        handle.dispose();
        // The built-in English: US forms, and day-first forms for other English regions.
        const TanreiEnglishDateLocalizations us = TanreiEnglishDateLocalizations.unitedStates;
        const TanreiEnglishDateLocalizations gb = TanreiEnglishDateLocalizations(
          locale: Locale('en', 'GB'),
        );
        expect(us.fullDate(d(17)), 'Thursday, September 17, 2026');
        expect(gb.fullDate(d(17)), 'Thursday 17 September 2026');
        expect(us.headerDate(d(17), withYear: true), 'Thu, Sep 17, 2026');
        expect(gb.headerMonthDay(d(17), withYear: false), '17 Sep');
        expect(us.numericDate(d(7, 3)), '03/07/2026');
        expect(gb.numericDate(d(7, 3)), '07/03/2026');
        expect(gb.numericDatePattern, 'dd/mm/yyyy');
        expect(TanreiEnglishDateLocalizations.fallbackFor(const Locale('ja', 'JP')), same(us));
        expect(tanreiFirstDayOfWeek(const Locale('en', 'US')), DateTime.sunday);
        expect(tanreiFirstDayOfWeek(const Locale('ja')), DateTime.sunday);
        expect(tanreiFirstDayOfWeek(const Locale('de', 'DE')), DateTime.monday);
        expect(tanreiFirstDayOfWeek(const Locale('ar', 'EG')), DateTime.saturday);

        // Without a delegate for the locale: English words, the locale's week data.
        await openModal(
          tester,
          value: d(17),
          locale: const Locale('de', 'DE'),
          supportedLocales: const <Locale>[Locale('en', 'US'), Locale('de', 'DE')],
        );
        expect(find.text('September 2026'), findsOneWidget);
        expect(
          tester.getRect(find.text('M').first).left,
          lessThan(tester.getRect(find.text('W')).left),
        );

        // Today from the device.
        await openModal(tester, deviceToday: true);
        final DateTime now = DateTime.now();
        expect(
          find.byWidgetPredicate(
            (Widget w) =>
                w is TanreiDatePickerDay &&
                w.date == DateTime(now.year, now.month, now.day) &&
                w.condition == TanreiDatePickerCondition.today,
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'DTP-38: in a short window the header and the actions stay and the calendar scrolls '
      'between them; when they alone leave no room everything scrolls; a docked picker taller '
      'than the room scrolls; enlarged text grows the days; a narrow window keeps the cells and '
      'shrinks the margins',
      (WidgetTester tester) async {
        await openModal(tester, value: d(17), window: const Size(420, 400));
        final Rect surface = tester.getRect(surfaceFinder());
        expect(
          surface.height,
          lessThanOrEqualTo(400 - 2 * pickerTokens.modalContainerMargin + 0.01),
        );
        expect(tester.getRect(buttonText('OK')).bottom, lessThanOrEqualTo(surface.bottom));
        expect(tester.getRect(find.text('Select date')).top, greaterThanOrEqualTo(surface.top));
        final ScrollableState middle = tester.state<ScrollableState>(
          find
              .ancestor(
                of: find.byType(TanreiDatePickerDay).first,
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(middle.position.maxScrollExtent, greaterThan(0));

        await openModal(tester, value: d(17), window: const Size(420, 150));
        await tester.pumpAndSettle();
        final ScrollableState whole = tester.state<ScrollableState>(
          find.ancestor(of: find.text('Select date'), matching: find.byType(Scrollable)).first,
        );
        expect(whole.position.maxScrollExtent, greaterThan(0), reason: 'the header scrolls too');

        await openDocked(tester, value: d(17), window: const Size(800, 300));
        final Rect docked = tester.getRect(surfaceFinder(modal: false));
        expect(docked.bottom, lessThanOrEqualTo(300 - pickerTokens.dockedViewportMargin + 0.01));
        expect(
          find.ancestor(
            of: find.byType(TanreiDatePickerDay).first,
            matching: find.byType(Scrollable),
          ),
          findsWidgets,
        );

        await openModal(
          tester,
          value: d(17),
          media: (MediaQueryData data) => data.copyWith(textScaler: const TextScaler.linear(2)),
        );
        final double side = tester
            .getSize(
              find.descendant(of: dayFinder(17), matching: find.byType(TanreiControlContainer)),
            )
            .height;
        expect(side, greaterThan(pickerTokens.dayContainerSize));

        // 350 is narrower than the surface (7 targets and the padding, 360) with its margins: the
        // margins go first, and the padding takes what is left (7 a side).
        await openModal(tester, value: d(17), window: const Size(350, 800));
        expect(
          tester.getSize(dayFinder(17)).width,
          pickerTokens.cellSize,
          reason: 'the cells keep the target',
        );
        final Rect narrow = tester.getRect(surfaceFinder());
        expect(narrow.width, 350, reason: 'the margins shrank first');
        expect(
          narrow.right - tester.getRect(dayFinder(19)).right,
          moreOrLessEquals((350 - 7 * pickerTokens.cellSize) / 2),
          reason: 'then the padding',
        );
      },
    );

    testWidgets(
      'DTP-38: on a 320-wide window, narrower than seven minimum targets, the margins and the '
      'padding are gone and the cells narrow equally so that the grid fits; their height and '
      'their numbers stay, and the surface is never wider than the window, modal or docked',
      (WidgetTester tester) async {
        const Size phone = Size(320, 800);
        final double cellWidth = phone.width / 7;
        void expectNarrowGrid(Rect surface, String where) {
          expect(surface.left, moreOrLessEquals(0), reason: where);
          expect(surface.width, moreOrLessEquals(phone.width), reason: where);
          expect(find.byType(FittedBox), findsNothing, reason: '$where: nothing is scaled');
          final Rect first = tester.getRect(dayFinder(13));
          final Rect last = tester.getRect(dayFinder(19));
          expect(first.width, moreOrLessEquals(cellWidth), reason: where);
          expect(first.height, pickerTokens.cellSize, reason: '$where: the height stays');
          expect(first.left, moreOrLessEquals(surface.left), reason: where);
          expect(last.right, moreOrLessEquals(surface.right), reason: where);
          // The numbers keep their size and are not scaled.
          final Finder number = find.descendant(of: dayFinder(17), matching: find.text('17'));
          expect(tester.widget<Text>(number).style!.fontSize, pickerTokens.dayLabelTypescale.size);
          expect(
            tester.getSize(number).height,
            moreOrLessEquals(pickerTokens.dayLabelTypescale.lineHeight),
            reason: where,
          );
          // The day's container keeps its size inside the narrower cell.
          expect(
            tester
                .getSize(
                  find.descendant(of: dayFinder(17), matching: find.byType(TanreiControlContainer)),
                )
                .width,
            pickerTokens.dayContainerSize,
            reason: where,
          );
          expect(tester.takeException(), isNull, reason: where);
        }

        await openModal(tester, value: d(17), window: phone);
        expectNarrowGrid(tester.getRect(surfaceFinder()), 'modal');

        await openDocked(tester, value: d(17), window: phone);
        expectNarrowGrid(tester.getRect(surfaceFinder(modal: false)), 'docked');
      },
    );

    testWidgets('DTP-39: right to left the layout mirrors — the first day of the week in the '
        'rightmost column, the toggle at the right, the navigation buttons at the left, the header, '
        'the fields and the actions', (WidgetTester tester) async {
      await openModal(tester, value: d(17), textDirection: TextDirection.rtl);
      final Rect surface = tester.getRect(surfaceFinder());
      expect(
        tester.getRect(dayFinder(13)).right,
        moreOrLessEquals(surface.right - pickerTokens.containerPaddingInline),
        reason: 'Sunday at the right',
      );
      expect(tester.getRect(viewToggle()).center.dx, greaterThan(surface.center.dx));
      expect(
        tester.getRect(iconButton('Next month')).center.dx,
        lessThan(tester.getRect(iconButton('Previous month')).center.dx),
      );
      expect(
        (tester.widget<TanreiIconButton>(iconButton('Previous month')).icon as Text).data,
        '\u{e5cc}',
        reason: 'toward the start: right',
      );
      expect(
        tester.getRect(buttonText('OK')).left,
        lessThan(tester.getRect(buttonText('Cancel')).left),
      );
      expect(
        tester.getRect(iconButton('Switch to text entry')).left,
        lessThan(tester.getRect(headerValue).left),
      );
      expect(
        tester.getRect(find.text('Select date')).right,
        moreOrLessEquals(surface.right - pickerTokens.headerPaddingInlineStart),
      );
      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        entryMode: TanreiDatePickerEntryMode.text,
        textDirection: TextDirection.rtl,
      );
      expect(
        tester.getRect(fieldFinder('Start date')).left,
        greaterThan(tester.getRect(fieldFinder('End date')).left),
      );
    });

    testWidgets('DTP-40: an enum name the picker does not define behaves as the default and is '
        'reported; a malformed date, min after max, end before start, a value in range mode or a '
        'start in single mode is ignored and reported; an empty label is reported', (
      WidgetTester tester,
    ) async {
      final List<String> unknown = collectUnknownValues();
      expect(TanreiDatePickerPresentation.fromName('sheet'), TanreiDatePickerPresentation.modal);
      expect(TanreiDatePickerMode.fromName('multiple'), TanreiDatePickerMode.single);
      expect(TanreiDatePickerEntryMode.fromName('voice'), TanreiDatePickerEntryMode.calendar);
      expect(TanreiDatePickerStartView.fromName('month'), TanreiDatePickerStartView.day);
      expect(
        TanreiDatePickerFirstDayOfWeek.fromName('funday'),
        TanreiDatePickerFirstDayOfWeek.locale,
      );
      expect(TanreiDatePicker.parseDate('2026-02-30'), isNull);
      expect(TanreiDatePicker.parseDate('2026-09-17T10:00'), isNull);
      expect(TanreiDatePicker.parseDate('2026-09-17'), d(17));
      expect(unknown, hasLength(7));

      final List<String> ignored = collectIgnoredValues();
      final List<String> missing = collectMissingNames();
      await openModal(tester, firstDate: d(20), lastDate: d(10));
      expect(ignored.single, contains('firstDate'));
      expect(dayOf(tester, 5).disabled, isFalse, reason: 'both bounds ignored');
      ignored.clear();
      await openModal(
        tester,
        mode: TanreiDatePickerMode.range,
        value: d(17),
        start: d(16),
        end: d(12),
      );
      expect(ignored, hasLength(2));
      expect(headerText(tester), 'Sep 16 – End date');
      ignored.clear();
      await openModal(tester, start: d(10), value: d(17));
      expect(ignored.single, contains('start'));
      expect(headerText(tester), 'Thu, Sep 17');
      await openModal(tester, labels: const TanreiDatePickerLabels(label: ''));
      expect(missing, <String>['date picker']);
      expect(surfaceFinder(), findsOneWidget, reason: 'it still opens');
    });

    testWidgets('accessibility guidelines: the modal and docked pickers', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await openModal(tester, value: d(17));
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      await openDocked(tester, mode: TanreiDatePickerMode.range, start: d(10), end: d(16));
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });

    testWidgets(
      'a modified system drives the picker: cell size, day size and corners, band color',
      (WidgetTester tester) async {
        final TanreiSystem custom = system.copyWith(
          datePicker: system.datePicker.copyWith(
            cellSize: 56,
            dayContainerSize: 44,
            dayContainerShape: 22,
            conditions: system.datePicker.conditions.copyWith(
              inRange: system.datePicker.conditions.inRange.copyWith(
                enabled: system.datePicker.conditions.inRange.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
                ),
              ),
            ),
          ),
        );
        final TanreiThemeData theme = TanreiThemeData(system: custom);
        await openDocked(
          tester,
          mode: TanreiDatePickerMode.range,
          start: d(10),
          end: d(16),
          theme: theme,
        );
        expect(tester.getSize(dayFinder(17)), const Size(56, 56));
        expect(decorationOf(tester, dayFinder(17)).shape.radius, 22);
        expect(
          tester.getSize(
            find.descendant(of: dayFinder(17), matching: find.byType(TanreiControlContainer)),
          ),
          const Size.square(44),
        );
        expect(fillOf(tester, dayFinder(12)), theme.color(TanreiColorRole.primaryContainer));
      },
    );
  });

  group('goldens', () {
    test('the spec lists the fixtures this suite records, every one open', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'modal',
        'modal-range',
        'modal-range-start',
        'modal-range-empty',
        'modal-text',
        'modal-text-range',
        'modal-year',
        'docked',
        'docked-monday',
        'docked-unavailable',
        'docked-range-unavailable',
      ]);
      for (final Map<String, dynamic> fixture in fixtures) {
        expect((fixture['props'] as Map<String, dynamic>)['open'], isTrue);
      }
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectPickerGolden(
          tester,
          system: system,
          fixture: fixture,
          file: 'goldens/date_picker/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the range shows the preset's
    // scrim, container, header, days, band, today's ring and actions at once.
    const String recorded = 'modal-range';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectPickerGolden(
          tester,
          system: preset,
          fixture: fixture(recorded),
          file: 'goldens/date_picker/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
