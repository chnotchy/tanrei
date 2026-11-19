import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../systems.dart' show shippedSystems;
import 'fixture_golden.dart';
import 'navigation_harness.dart'
    show collectIgnoredValues, hoverOver, nodesBelow, nodesWithRole, semanticsRoot;
import 'sheet_harness.dart' show tabTimes;

const TanreiSystem system = tanreiSystem;
final TanreiTimePickerTokens pickerTokens = system.timePicker;

/// The stages of the fixtures (TMP-1's `verify`): 480 x 640, and 720 x 480 for the horizontal
/// layout, each inside the `space200` padding of every baseline.
const Size verticalStage = Size(480, 640);
const Size horizontalStage = Size(720, 480);
Size frameOf(Size stage) =>
    Size(stage.width + 2 * system.space.space200, stage.height + 2 * system.space.space200);

final List<Map<String, dynamic>> fixtures = specFixtures('time-picker');

Map<String, dynamic> fixture(String id) =>
    fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == id);

/// A fixture's props as the picker's arguments.
class FixtureArgs {
  FixtureArgs(Map<String, dynamic> fixture) : props = fixture['props'] as Map<String, dynamic>;

  final Map<String, dynamic> props;

  TanreiTimeOfDay? get initialTime => TanreiTimeOfDay.parse(props['value'] as String? ?? '');
  TanreiTimePickerHourCycle get hourCycle =>
      TanreiTimePickerHourCycle.fromName(props['hourCycle'] as String? ?? 'locale');
  TanreiTimePickerEntryMode get entryMode =>
      TanreiTimePickerEntryMode.fromName(props['entryMode'] as String? ?? 'dial');
  TanreiTimePickerUnit get unit =>
      TanreiTimePickerUnit.fromName(props['unit'] as String? ?? 'hour');
  TanreiTimePickerLayout get layout =>
      TanreiTimePickerLayout.fromName(props['layout'] as String? ?? 'auto');
  Locale? get locale => localeOf(props['locale'] as String? ?? '');
  bool get horizontal => layout == TanreiTimePickerLayout.horizontal;
}

Locale? localeOf(String tag) {
  if (tag.isEmpty) {
    return null;
  }
  final List<String> parts = tag.split('-');
  return Locale(parts.first, parts.length > 1 ? parts[1] : null);
}

/// Presents [fixture] modally from [context].
Future<TanreiTimeOfDay?> showFixture(BuildContext context, Map<String, dynamic> fixture) {
  final FixtureArgs args = FixtureArgs(fixture);
  return showTanreiTimePicker(
    context: context,
    initialTime: args.initialTime,
    hourCycle: args.hourCycle,
    entryMode: args.entryMode,
    unit: args.unit,
    layout: args.layout,
    locale: args.locale,
  );
}

/// Japanese time words and patterns (CLDR's `ja`): the period before the hour ("aK:mm"), a
/// 24-hour preferred clock. The package ships English only; the harness supplies these, as a
/// product in Japanese supplies its own (TMP-27).
class JapaneseTimeLocalizations extends TanreiEnglishDateLocalizations {
  const JapaneseTimeLocalizations() : super(locale: const Locale('ja', 'JP'));

  @override
  String get anteMeridiemAbbreviation => '午前';

  @override
  String get postMeridiemAbbreviation => '午後';

  @override
  String get preferredHourMinutePattern => 'H:mm';

  @override
  String get hourMinutePattern12 => 'aK:mm';

  @override
  String get hourMinutePattern24 => 'H:mm';
}

class JapaneseDelegate extends LocalizationsDelegate<TanreiDateLocalizations> {
  const JapaneseDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'ja';

  @override
  Future<TanreiDateLocalizations> load(Locale locale) =>
      SynchronousFuture<TanreiDateLocalizations>(const JapaneseTimeLocalizations());

  @override
  bool shouldReload(JapaneseDelegate old) => false;
}

/// Captures a fixture's stage, settled, against [file] (see [presentFixture]).
Future<void> expectPickerGolden(
  WidgetTester tester, {
  required TanreiSystem system,
  required Map<String, dynamic> fixture,
  required String file,
}) async {
  final GlobalKey boundary = await presentFixture(tester, system: system, fixture: fixture);
  final RenderRepaintBoundary render =
      boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final ui.Image image = (await tester.runAsync(
    () => render.toImage(pixelRatio: goldenPixelRatio),
  ))!;
  addTearDown(image.dispose);
  await expectLater(image, matchesGoldenFile(file));
}

/// A fixture's stage under [system], settled: the fixture presented with [showTanreiTimePicker]
/// over the stage (a Japanese fixture under the Japanese delegate). Returns the frame's boundary.
Future<GlobalKey> presentFixture(
  WidgetTester tester, {
  required TanreiSystem system,
  required Map<String, dynamic> fixture,
}) async {
  final FixtureArgs args = FixtureArgs(fixture);
  final GlobalKey stageKey = GlobalKey();
  final Size stage = args.horizontal ? horizontalStage : verticalStage;
  final Locale? locale = args.locale;
  Widget navigator = Navigator(
    onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
      pageBuilder: (BuildContext context, _, _) =>
          ColoredBox(key: stageKey, color: TanreiTheme.of(context).colors.surface),
    ),
  );
  if (locale != null && locale.languageCode == 'ja') {
    navigator = Localizations(
      locale: locale,
      delegates: const <LocalizationsDelegate<dynamic>>[
        JapaneseDelegate(),
        DefaultWidgetsLocalizations.delegate,
      ],
      child: navigator,
    );
  }
  final GlobalKey boundary = await pumpFixtureFrame(
    tester,
    system: system,
    surface: frameOf(stage),
    child: SizedBox.fromSize(size: stage, child: navigator),
  );
  unawaited(showFixture(stageKey.currentContext!, fixture));
  await tester.pumpAndSettle();
  // TMP-1's `verify`: the open picker as drawn, not where focus went — a focused text field would
  // draw its caret and focused outline, which the other platforms' fixtures do not.
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  return boundary;
}

// ---------------------------------------------------------------------------------------------
// The harness of the behaviour tests.

const TanreiThemeData lightTheme = TanreiThemeData.light;
Duration ms(int value) => Duration(milliseconds: value);
TanreiTimeOfDay t(int hour, int minute) => TanreiTimeOfDay(hour: hour, minute: minute);

const List<LocalizationsDelegate<dynamic>> japanese = <LocalizationsDelegate<dynamic>>[
  TanreiDateLocalizations.delegate,
  JapaneseDelegate(),
];
const List<Locale> withJapanese = <Locale>[Locale('en', 'US'), Locale('ja', 'JP')];

/// What a picker emitted, in order.
class Emitted {
  final List<TanreiTimeOfDay> changes = <TanreiTimeOfDay>[];
  final List<TanreiTimePickerCloseReason> closes = <TanreiTimePickerCloseReason>[];
  final List<String> events = <String>[];
  TanreiTimeOfDay? result;
  bool completed = false;

  void change(TanreiTimeOfDay time) {
    changes.add(time);
    events.add('change:${time.format()}');
  }

  void close(TanreiTimePickerCloseReason reason) {
    closes.add(reason);
    events.add('close:${reason.name}');
  }
}

final GlobalKey appBoundary = GlobalKey();

/// An app whose theme, media and direction sit above its navigator, around [home], captured by
/// [appBoundary].
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
    return RepaintBoundary(
      key: appBoundary,
      child: MediaQuery(
        data: media?.call(data) ?? data,
        child: TanreiTheme(
          data: theme,
          child: Directionality(textDirection: textDirection, child: child!),
        ),
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

/// Opens a picker from an "Open" button on a page with a "Behind" button, and records what it
/// emits.
Future<Emitted> openPicker(
  WidgetTester tester, {
  TanreiTimeOfDay? initialTime,
  TanreiTimePickerHourCycle hourCycle = TanreiTimePickerHourCycle.h12,
  TanreiTimePickerEntryMode entryMode = TanreiTimePickerEntryMode.dial,
  TanreiTimePickerUnit unit = TanreiTimePickerUnit.hour,
  TanreiTimePickerLayout layout = TanreiTimePickerLayout.auto,
  Locale? locale,
  TanreiTimePickerLabels labels = const TanreiTimePickerLabels(),
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
                  showTanreiTimePicker(
                    context: context,
                    initialTime: initialTime,
                    hourCycle: hourCycle,
                    entryMode: entryMode,
                    unit: unit,
                    layout: layout,
                    locale: locale,
                    labels: labels,
                    onChanged: emitted.change,
                    onClose: emitted.close,
                  ).then((TanreiTimeOfDay? result) {
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
    expect(focusedName(), 'Open');
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

Finder selectorFinder(TanreiTimePickerUnit unit) =>
    find.byWidgetPredicate((Widget w) => w is TanreiTimePickerSelector && w.unit == unit);
final Finder hourSelector = selectorFinder(TanreiTimePickerUnit.hour);
final Finder minuteSelector = selectorFinder(TanreiTimePickerUnit.minute);

Finder periodFinder({required bool pm}) =>
    find.byWidgetPredicate((Widget w) => w is TanreiTimePickerPeriod && w.pm == pm);
final Finder am = periodFinder(pm: false);
final Finder pm = periodFinder(pm: true);

final Finder dialFinder = find.byKey(const ValueKey<String>('tanrei-time-picker-dial'));

TanreiTimePickerSelector selectorOf(WidgetTester tester, Finder selector) =>
    tester.widget<TanreiTimePickerSelector>(selector);

String hourText(WidgetTester tester) => selectorOf(tester, hourSelector).text;
String minuteText(WidgetTester tester) => selectorOf(tester, minuteSelector).text;
bool chosen(WidgetTester tester, Finder period) =>
    tester.widget<TanreiTimePickerPeriod>(period).selected;

Finder buttonText(String text) => find.byWidgetPredicate(
  (Widget w) => w is TanreiButton && w.child is Text && (w.child as Text).data == text,
);

Finder iconButton(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == label);

Finder fieldFinder(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiTextField && w.labelText == label);

/// The container a text field draws (its outline), inside the field labelled [label].
Finder fieldContainer(String label) => find.descendant(
  of: fieldFinder(label),
  matching: find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
);

TextEditingController fieldText(WidgetTester tester, String label) =>
    tester.widget<TanreiTextField>(fieldFinder(label)).controller!;

bool okEnabled(WidgetTester tester) =>
    tester.widget<TanreiButton>(buttonText('OK')).onPressed != null;

/// The container of the open surface: the one decoration in the surface color with its corners.
Finder surfaceFinder({TanreiThemeData theme = lightTheme}) {
  final TanreiTimePickerTokens tokens = theme.system.timePicker;
  final Color color = theme.paint(tokens.containerColor);
  return find.byWidgetPredicate(
    (Widget w) =>
        w is DecoratedBox &&
        w.decoration is TanreiContainerDecoration &&
        (w.decoration as TanreiContainerDecoration).color == color &&
        (w.decoration as TanreiContainerDecoration).shape.radius == tokens.containerShape,
  );
}

TanreiContainerDecoration surfaceDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(surfaceFinder()).decoration as TanreiContainerDecoration;

/// The first container decoration inside [item]: a selector's or a segment's container.
TanreiContainerDecoration decorationOf(WidgetTester tester, Finder item) => tester
    .widgetList<DecoratedBox>(find.descendant(of: item, matching: find.byType(DecoratedBox)))
    .map((DecoratedBox box) => box.decoration)
    .whereType<TanreiContainerDecoration>()
    .first;

const Color none = Color(0x00000000);

Color fillOf(WidgetTester tester, Finder item) => decorationOf(tester, item).color ?? none;

BorderSide? edgeOf(WidgetTester tester, Finder item) {
  final BoxBorder? border = decorationOf(tester, item).border;
  return border is Border ? border.top : null;
}

Color labelOf(WidgetTester tester, Finder item) =>
    tester.widget<Text>(find.descendant(of: item, matching: find.byType(Text)).first).style!.color!;

Color paint(TanreiPaint p, [TanreiThemeData theme = lightTheme]) => theme.paint(p);

TanreiTimePickerConditionStateTokens tone(
  TanreiTimePickerCondition condition,
  TanreiInteractionState state, [
  TanreiSystem of = system,
]) => of.timePicker.conditions[condition].of(state);

/// What the focused control is called: a selector's or a field's label, a segment's period, a
/// button's text, an icon button's name.
String focusedName() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  final TanreiTimePickerSelector? selector = context
      .findAncestorWidgetOfExactType<TanreiTimePickerSelector>();
  if (selector != null) {
    return selector.semanticLabel;
  }
  final TanreiTimePickerPeriod? period = context
      .findAncestorWidgetOfExactType<TanreiTimePickerPeriod>();
  if (period != null) {
    return period.text;
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
  return field?.labelText ?? '';
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

/// Moves keyboard focus to the part [item] holds (a segment Tab does not reach).
Future<void> focusPart(WidgetTester tester, Finder item) async {
  Focus.of(
    tester.element(find.descendant(of: item, matching: find.byType(Text)).first),
  ).requestFocus();
  await tester.pump();
}

/// Performs [action] on the semantics node of [item].
void act(WidgetTester tester, Finder item, SemanticsAction action) {
  final SemanticsNode node = tester.getSemantics(item);
  node.owner!.performAction(node.id, action);
}

/// The pixels of the whole window, at 2x.
Future<FramePixels> windowPixels(WidgetTester tester) => captureFrame(tester, appBoundary);

/// The point [radius] from the dial's centre at [degrees] clockwise from the top.
Offset onDial(WidgetTester tester, double degrees, double radius) {
  final Offset center = tester.getCenter(dialFinder);
  final double radians = degrees * math.pi / 180;
  return center + Offset(radius * math.sin(radians), -radius * math.cos(radians));
}

double get outerRing =>
    pickerTokens.dialContainerSize / 2 - pickerTokens.dialPadding - pickerTokens.dialHandleSize / 2;
double get innerRing => outerRing - pickerTokens.dialHandleSize;

/// A delegate with made-up localizations: the words, digits, separator and clocks come from it.
class MarkedLocalizations extends TanreiEnglishDateLocalizations {
  const MarkedLocalizations({this.preferred = 'h:mm a', this.twelve = "h'h'mm a"})
    : super(locale: const Locale('fr', 'FR'));

  final String preferred;
  final String twelve;

  @override
  String get anteMeridiemAbbreviation => 'mat.';

  @override
  String get postMeridiemAbbreviation => 'soir';

  @override
  String get preferredHourMinutePattern => preferred;

  @override
  String get hourMinutePattern12 => twelve;

  @override
  String get hourMinutePattern24 => "HH'h'mm";

  @override
  String formatNumber(int value, {int minDigits = 1}) =>
      value.toString().padLeft(minDigits, '0').replaceAll('1', 'I');

  @override
  String toAsciiDigits(String text) => text.replaceAll('I', '1');
}

class MarkedDelegate extends LocalizationsDelegate<TanreiDateLocalizations> {
  const MarkedDelegate([this.localizations = const MarkedLocalizations()]);

  final MarkedLocalizations localizations;

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'fr';

  @override
  Future<TanreiDateLocalizations> load(Locale locale) =>
      SynchronousFuture<TanreiDateLocalizations>(localizations);

  @override
  bool shouldReload(MarkedDelegate old) => false;
}

const List<Locale> withFrench = <Locale>[Locale('en', 'US'), Locale('fr', 'FR')];

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('presentation and the pending time', () {
    testWidgets(
      'TMP-1: the picker is centred over a scrim of scrim.color across the window; the '
      'page behind takes no press and is hidden; Tab wraps inside; the container has its color, '
      'elevation and corners eased by the smoothing, the margin from every edge and the keyboard',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        final Emitted emitted = await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
        final Color scrim = paint(pickerTokens.scrimColor);
        expect(
          tester.getSize(find.byWidgetPredicate((Widget w) => w is ColoredBox && w.color == scrim)),
          const Size(800, 800),
        );
        expect(tester.getRect(surfaceFinder()).center, const Offset(400, 400));
        final TanreiContainerDecoration decoration = surfaceDecoration(tester);
        expect(decoration.color, paint(pickerTokens.containerColor));
        expect(decoration.shape.radius, pickerTokens.containerShape);
        expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
        expect(decoration.boxShadow, isNotEmpty);
        // Focus stays inside: Shift+Tab from the first part reaches the last, Tab the first again.
        expect(focusedName(), 'Hour');
        await tabTimes(tester, 1, shift: true);
        expect(focusedName(), 'OK');
        await tabTimes(tester, 1);
        expect(focusedName(), 'Hour');
        // Nothing behind is pressable or read.
        expect(
          nodesBelow(semanticsRoot(tester)).any((SemanticsNode n) => n.label == 'Behind'),
          isFalse,
        );
        await tester.tapAt(const Offset(5, 5));
        await tester.pumpAndSettle();
        expect(behindPresses, 0);
        expect(emitted.closes, <TanreiTimePickerCloseReason>[TanreiTimePickerCloseReason.outside]);

        // The keyboard: the margin holds above it.
        await openPicker(
          tester,
          initialTime: t(7, 30),
          window: const Size(800, 900),
          media: (MediaQueryData data) =>
              data.copyWith(viewInsets: const EdgeInsets.only(bottom: 200)),
        );
        final Rect raised = tester.getRect(surfaceFinder());
        expect(raised.bottom, lessThanOrEqualTo(700 - pickerTokens.containerMargin + 0.01));
        expect(raised.top, greaterThanOrEqualTo(pickerTokens.containerMargin - 0.01));
        handle.dispose();
      },
    );

    testWidgets('TMP-2: opening moves focus to the selector of unit, or to the hour field in text '
        'entry, and shows that unit on the dial — when it opens, not when its motion ends', (
      WidgetTester tester,
    ) async {
      await openPicker(tester, initialTime: t(7, 30), settle: false);
      await tester.pump();
      expect(focusedName(), 'Hour', reason: 'before the motion ends');
      expect(selectorOf(tester, hourSelector).selected, isTrue);
      await tester.pumpAndSettle();
      await openPicker(tester, initialTime: t(7, 30), unit: TanreiTimePickerUnit.minute);
      expect(focusedName(), 'Minute');
      expect(selectorOf(tester, minuteSelector).selected, isTrue);
      expect(selectorOf(tester, hourSelector).selected, isFalse);
      await openPicker(tester, initialTime: t(7, 30), entryMode: TanreiTimePickerEntryMode.text);
      expect(focusedName(), 'Hour');
      expect(fieldFinder('Hour'), findsOneWidget);
    });

    testWidgets('TMP-3: closing returns focus to the element that opened the picker, when it '
        'closes, not when its motion ends', (WidgetTester tester) async {
      final Emitted emitted = await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
      expect(focusedName(), 'Hour');
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      expect(emitted.closes, <TanreiTimePickerCloseReason>[TanreiTimePickerCloseReason.escape]);
      await tester.pump();
      expect(focusedName(), 'Open', reason: 'at the start of the close');
      await tester.pumpAndSettle();
      expect(focusedName(), 'Open');
    });

    testWidgets('TMP-4: Escape, back, the scrim, Cancel and OK close the picker once with their '
        'reason; it closes itself; only confirm commits', (WidgetTester tester) async {
      Future<Emitted> closedBy(Future<void> Function() act) async {
        final Emitted emitted = await openPicker(tester, initialTime: t(7, 30));
        await tester.tap(pm);
        await tester.pump();
        await act();
        await tester.pumpAndSettle();
        expect(hourSelector, findsNothing, reason: 'closed itself');
        expect(emitted.completed, isTrue);
        return emitted;
      }

      Emitted e = await closedBy(() => tester.sendKeyEvent(LogicalKeyboardKey.escape));
      expect(e.events, <String>['close:escape']);
      expect(e.result, isNull);
      e = await closedBy(() async {
        await tester.binding.handlePopRoute();
      });
      expect(e.events, <String>['close:back']);
      e = await closedBy(() => tester.tapAt(const Offset(5, 5)));
      expect(e.events, <String>['close:outside']);
      e = await closedBy(() => tester.tap(buttonText('Cancel')));
      expect(e.events, <String>['close:cancel']);
      expect(e.result, isNull);
      e = await closedBy(() => tester.tap(buttonText('OK')));
      expect(e.events, <String>['change:19:30', 'close:confirm']);
      expect(e.result, t(19, 30));
    });

    testWidgets('TMP-5: the pending time starts as value (or the device\'s time) and is shown by '
        'the selectors; only OK commits it — change once when it differs, then close; a value set '
        'while open changes nothing; OK is disabled while a field holds no number of its unit', (
      WidgetTester tester,
    ) async {
      final Emitted emitted = await openPicker(tester, initialTime: t(7, 30));
      await tester.tap(pm);
      await tester.pumpAndSettle();
      expect(emitted.events, isEmpty);
      expect(hourText(tester), '7');
      expect(chosen(tester, pm), isTrue);
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(emitted.events, <String>['change:19:30', 'close:confirm']);
      expect(emitted.result, t(19, 30));

      // Unchanged: no change, but the future completes with the time.
      final Emitted same = await openPicker(tester, initialTime: t(7, 30));
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(same.events, <String>['close:confirm']);
      expect(same.result, t(7, 30));

      // No value: the device's current time; OK then emits change.
      final DateTime before = DateTime.now();
      final Emitted fresh = await openPicker(tester, hourCycle: TanreiTimePickerHourCycle.h23);
      final DateTime after = DateTime.now();
      expect(<String>{
        before.hour.toString().padLeft(2, '0'),
        after.hour.toString().padLeft(2, '0'),
      }, contains(hourText(tester)));
      expect(<String>{
        before.minute.toString().padLeft(2, '0'),
        after.minute.toString().padLeft(2, '0'),
      }, contains(minuteText(tester)));
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(fresh.changes, hasLength(1));

      // A field that holds no number of its unit: OK disabled.
      await openPicker(tester, initialTime: t(7, 30), entryMode: TanreiTimePickerEntryMode.text);
      expect(okEnabled(tester), isTrue);
      await tester.enterText(fieldFinder('Hour'), '13');
      await tester.pumpAndSettle();
      expect(okEnabled(tester), isFalse);

      // In place, a new value while open does not move the pending time.
      tester.view.physicalSize = const Size(800, 800);
      tester.view.devicePixelRatio = 1;
      final ValueNotifier<TanreiTimeOfDay> value = ValueNotifier<TanreiTimeOfDay>(t(7, 30));
      addTearDown(value.dispose);
      await tester.pumpWidget(
        pickerApp(
          Center(
            child: ValueListenableBuilder<TanreiTimeOfDay>(
              valueListenable: value,
              builder: (BuildContext context, TanreiTimeOfDay time, _) =>
                  TanreiTimePicker(initialTime: time, hourCycle: TanreiTimePickerHourCycle.h12),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      value.value = t(9, 45);
      await tester.pumpAndSettle();
      expect(hourText(tester), '7');
      expect(minuteText(tester), '30');
    });

    testWidgets('TMP-6: h12 runs 1 to 12 with a period, h23 00 to 23 without; locale takes the '
        'locale\'s clock (a 0–11 locale as h12, a 1–24 one as h23) unless the device chose '
        '24-hour time; the value is 24-hour in every cycle', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(19, 30));
      expect(hourText(tester), '7');
      expect(pm, findsOneWidget);
      await openPicker(tester, initialTime: t(19, 30), hourCycle: TanreiTimePickerHourCycle.h23);
      expect(hourText(tester), '19');
      expect(pm, findsNothing);
      // The locale's clock: 12-hour in en-US, 24-hour in en-GB.
      await openPicker(tester, initialTime: t(19, 30), hourCycle: TanreiTimePickerHourCycle.locale);
      expect(hourText(tester), '7');
      await openPicker(
        tester,
        initialTime: t(19, 30),
        hourCycle: TanreiTimePickerHourCycle.locale,
        locale: const Locale('en', 'GB'),
      );
      expect(hourText(tester), '19');
      // The device's 24-hour choice wins over the locale's.
      await openPicker(
        tester,
        initialTime: t(19, 30),
        hourCycle: TanreiTimePickerHourCycle.locale,
        media: (MediaQueryData data) => data.copyWith(alwaysUse24HourFormat: true),
      );
      expect(hourText(tester), '19');
      expect(pm, findsNothing);
      // A 0–11 locale ("K") is shown 1 to 12; a 1–24 one ("k") 00 to 23.
      for (final (String pattern, String shown) in <(String, String)>[
        ('K:mm a', '7'),
        ('kk:mm', 'I9'),
      ]) {
        await openPicker(
          tester,
          initialTime: t(19, 30),
          hourCycle: TanreiTimePickerHourCycle.locale,
          locale: const Locale('fr', 'FR'),
          delegates: <LocalizationsDelegate<dynamic>>[
            TanreiDateLocalizations.delegate,
            MarkedDelegate(MarkedLocalizations(preferred: pattern)),
          ],
          supportedLocales: withFrench,
        );
        expect(hourText(tester), shown, reason: pattern);
      }
      // 24-hour value from a 12-hour clock.
      final Emitted emitted = await openPicker(tester, initialTime: t(0, 5));
      expect(hourText(tester), '12');
      expect(chosen(tester, am), isTrue);
      await tester.tap(pm);
      await tester.pumpAndSettle();
      await tester.tap(buttonText('OK'));
      await tester.pumpAndSettle();
      expect(emitted.changes.single, t(12, 5));
    });
  });

  group('layout and drawing', () {
    testWidgets('TMP-7: vertical stacks the label, the time and the dial, centred, container.gap '
        'apart, the actions actions.margin-block-start below the dial, inset by the padding; '
        'horizontal puts the dial beside the time and the actions; auto chooses horizontal only '
        'for a window too short and wide enough; text entry is vertical', (
      WidgetTester tester,
    ) async {
      final double padding = pickerTokens.containerPadding;
      final double gap = pickerTokens.containerGap;
      await openPicker(tester, initialTime: t(7, 30), layout: TanreiTimePickerLayout.vertical);
      Rect surface = tester.getRect(surfaceFinder());
      Rect label = tester.getRect(find.text('Select time'));
      Rect hour = tester.getRect(hourSelector);
      Rect dial = tester.getRect(dialFinder);
      Rect toggle = tester.getRect(iconButton('Switch to text entry'));
      expect(label.top, moreOrLessEquals(surface.top + padding));
      expect(label.center.dx, moreOrLessEquals(surface.center.dx));
      expect(hour.top, moreOrLessEquals(label.bottom + gap));
      expect(dial.top, moreOrLessEquals(hour.bottom + gap));
      expect(dial.center.dx, moreOrLessEquals(surface.center.dx));
      expect(toggle.top, moreOrLessEquals(dial.bottom + pickerTokens.actionsMarginBlockStart));
      expect(toggle.bottom, moreOrLessEquals(surface.bottom - padding));
      expect(toggle.left, moreOrLessEquals(surface.left + padding));
      expect(tester.getRect(buttonText('OK')).right, moreOrLessEquals(surface.right - padding));
      final TextStyle style = tester.widget<Text>(find.text('Select time')).style!;
      expect(style.fontSize, pickerTokens.headerLabelTypescale.size);
      expect(style.color, paint(pickerTokens.headerLabelColor));

      // Horizontal: the label, the time and the actions in the start column, the dial at the end.
      await openPicker(tester, initialTime: t(7, 30), layout: TanreiTimePickerLayout.horizontal);
      surface = tester.getRect(surfaceFinder());
      label = tester.getRect(find.text('Select time'));
      hour = tester.getRect(hourSelector);
      dial = tester.getRect(dialFinder);
      toggle = tester.getRect(iconButton('Switch to text entry'));
      expect(label.left, moreOrLessEquals(surface.left + padding));
      expect(label.top, moreOrLessEquals(surface.top + padding));
      expect(hour.left, moreOrLessEquals(surface.left + padding));
      expect(hour.top, moreOrLessEquals(label.bottom + gap));
      expect(dial.right, moreOrLessEquals(surface.right - padding));
      expect(dial.left, moreOrLessEquals(tester.getRect(pm).right + gap));
      expect(dial.center.dy, moreOrLessEquals(surface.center.dy));
      expect(toggle.left, moreOrLessEquals(surface.left + padding));
      expect(toggle.bottom, moreOrLessEquals(surface.bottom - padding));
      expect(tester.getRect(buttonText('OK')).right, lessThan(dial.left));

      // Auto: vertical where it fits, horizontal in a short, wide window.
      await openPicker(tester, initialTime: t(7, 30));
      expect(tester.getRect(dialFinder).top, greaterThan(tester.getRect(hourSelector).bottom));
      await openPicker(tester, initialTime: t(7, 30), window: const Size(900, 420));
      expect(tester.getRect(dialFinder).left, greaterThan(tester.getRect(pm).right));
      // Short and narrow: vertical, scrolling.
      await openPicker(tester, initialTime: t(7, 30), window: const Size(420, 420));
      expect(tester.getRect(dialFinder).top, greaterThan(tester.getRect(hourSelector).top));

      // Text entry is vertical in every layout.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        layout: TanreiTimePickerLayout.horizontal,
        entryMode: TanreiTimePickerEntryMode.text,
      );
      expect(dialFinder, findsNothing);
      expect(
        tester.getRect(fieldFinder('Hour')).top,
        greaterThan(tester.getRect(find.text('Select time')).bottom),
      );
      expect(
        tester.getRect(iconButton('Switch to clock')).top,
        greaterThan(tester.getRect(fieldFinder('Hour')).bottom),
      );
    });

    testWidgets('TMP-8: in a short window the label and the actions stay and the time and the dial '
        'scroll between them (the horizontal layout scrolls as one); when they alone leave no room '
        'everything scrolls; the selectors, '
        'segments and dial numbers grow with enlarged text', (WidgetTester tester) async {
      await openPicker(
        tester,
        initialTime: t(7, 30),
        layout: TanreiTimePickerLayout.vertical,
        window: const Size(500, 300),
      );
      final Rect surface = tester.getRect(surfaceFinder());
      expect(surface.height, lessThanOrEqualTo(300 - 2 * pickerTokens.containerMargin + 0.01));
      expect(tester.getRect(buttonText('OK')).bottom, lessThanOrEqualTo(surface.bottom));
      expect(tester.getRect(find.text('Select time')).top, greaterThanOrEqualTo(surface.top));
      final ScrollableState middle = tester.state<ScrollableState>(
        find.ancestor(of: dialFinder, matching: find.byType(Scrollable)).first,
      );
      expect(middle.position.maxScrollExtent, greaterThan(0));
      expect(
        find.ancestor(of: find.text('Select time'), matching: find.byType(Scrollable)),
        findsNothing,
        reason: 'the label stays',
      );

      await openPicker(
        tester,
        initialTime: t(7, 30),
        layout: TanreiTimePickerLayout.vertical,
        window: const Size(500, 140),
      );
      final ScrollableState whole = tester.state<ScrollableState>(
        find.ancestor(of: find.text('Select time'), matching: find.byType(Scrollable)).first,
      );
      expect(whole.position.maxScrollExtent, greaterThan(0), reason: 'the label scrolls too');

      // Horizontal: nothing lies between the label and the actions; the surface scrolls as one.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        layout: TanreiTimePickerLayout.horizontal,
        window: const Size(800, 250),
      );
      final ScrollableState one = tester.state<ScrollableState>(
        find.ancestor(of: find.text('Select time'), matching: find.byType(Scrollable)).first,
      );
      expect(one.position.maxScrollExtent, greaterThan(0));
      expect(
        tester.state<ScrollableState>(
          find.ancestor(of: dialFinder, matching: find.byType(Scrollable)).first,
        ),
        same(one),
      );
      expect(
        tester.state<ScrollableState>(
          find.ancestor(of: buttonText('OK'), matching: find.byType(Scrollable)).first,
        ),
        same(one),
      );

      await openPicker(
        tester,
        initialTime: t(7, 30),
        window: const Size(1200, 1200),
        media: (MediaQueryData data) => data.copyWith(textScaler: const TextScaler.linear(2)),
      );
      final Size selector = tester.getSize(hourSelector);
      expect(selector.height, greaterThan(pickerTokens.selectorContainerHeight));
      final Size segment = tester.getSize(am);
      expect(segment.height, selector.height);
      expect(tester.takeException(), isNull);
    });

    testWidgets('TMP-7: auto measures the whole start column — a label wider than the time '
        'widens the horizontal layout, and where that is too wide for the window it is vertical', (
      WidgetTester tester,
    ) async {
      // 46 characters: in the test font the label is far wider than the time display.
      const TanreiTimePickerLabels long = TanreiTimePickerLabels(
        label: 'Choose the time at which the alarm should ring',
      );
      final double padding = pickerTokens.containerPadding;
      final double gap = pickerTokens.containerGap;
      final double margin = pickerTokens.containerMargin;
      // Wide enough for the label beside the dial: horizontal, the start column as wide as it.
      await openPicker(tester, initialTime: t(7, 30), labels: long, window: const Size(1100, 420));
      final Rect label = tester.getRect(find.text(long.label));
      final Rect dial = tester.getRect(dialFinder);
      expect(
        label.width,
        greaterThan(tester.getRect(pm).right - tester.getRect(hourSelector).left),
      );
      expect(dial.left, moreOrLessEquals(label.right + gap));
      expect(tester.takeException(), isNull);
      // Short and wide enough for the time beside the dial, not for the label: vertical — the
      // time alone would have fitted (what the width of the time display alone chose).
      const Size window = Size(900, 420);
      expect(
        2 * padding + label.width + gap + pickerTokens.dialContainerSize,
        greaterThan(window.width - 2 * margin),
      );
      await openPicker(tester, initialTime: t(7, 30), labels: long, window: window);
      expect(tester.getRect(dialFinder).top, greaterThan(tester.getRect(hourSelector).bottom));
      expect(tester.getSize(surfaceFinder()).width, lessThanOrEqualTo(window.width - 2 * margin));
      expect(tester.takeException(), isNull);
    });

    testWidgets('TMP-8: layout horizontal in a window too narrow for it scrolls the whole surface '
        'as one across as well as down, and never overflows', (WidgetTester tester) async {
      final double margin = pickerTokens.containerMargin;
      const Size window = Size(560, 300);
      await openPicker(
        tester,
        initialTime: t(7, 30),
        layout: TanreiTimePickerLayout.horizontal,
        window: window,
      );
      expect(tester.takeException(), isNull, reason: 'no overflow');
      final Rect surface = tester.getRect(surfaceFinder());
      expect(surface.width, lessThanOrEqualTo(window.width - 2 * margin + 0.01));
      expect(surface.height, lessThanOrEqualTo(window.height - 2 * margin + 0.01));
      // Still horizontal: the dial beside the time.
      expect(tester.getRect(dialFinder).left, greaterThan(tester.getRect(pm).right));
      ScrollableState across(Finder of) => tester
          .stateList<ScrollableState>(find.ancestor(of: of, matching: find.byType(Scrollable)))
          .singleWhere((ScrollableState s) => s.position.axis == Axis.horizontal);
      final ScrollableState one = across(dialFinder);
      expect(one.position.maxScrollExtent, greaterThan(0));
      expect(across(find.text('Select time')), same(one));
      expect(across(buttonText('OK')), same(one));
      // The vertical scroll is the nearer one (the surface scrolls down as one, as before).
      expect(
        tester
            .state<ScrollableState>(
              find.ancestor(of: dialFinder, matching: find.byType(Scrollable)).first,
            )
            .position
            .axis,
        Axis.vertical,
      );
      // Scrolled across to its end, the dial's far edge comes into the surface.
      one.position.jumpTo(one.position.maxScrollExtent);
      await tester.pump();
      expect(
        tester.getRect(dialFinder).right,
        moreOrLessEquals(surface.right - pickerTokens.containerPadding),
      );
      expect(tester.takeException(), isNull);
    });

    // The spec's horizontal stage under every shipped system: the presets' larger dial and
    // selectors need more than its width (with the test font), and the surface scrolls across
    // rather than overflowing. Only the default system's horizontal fixture has a baseline.
    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('TMP-8: the horizontal fixture under ${shipped.id} fits its stage or scrolls, '
          'never overflowing', (WidgetTester tester) async {
        await presentFixture(tester, system: shipped, fixture: fixture('horizontal'));
        expect(tester.takeException(), isNull);
        expect(tester.getRect(dialFinder).left, greaterThan(tester.getRect(pm).right));
      });
    }

    testWidgets('TMP-9: the hour, the separator and the minute left to right, selector.gap apart; '
        'each selector at least its container size with its corners, drawn from its condition — '
        'the selected one with a primary edge; the hour as the clock writes it, the minute with two '
        'digits, the separator in its style', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(7, 5));
      final Rect hour = tester.getRect(hourSelector);
      final Rect separator = tester.getRect(find.text(':'));
      final Rect minute = tester.getRect(minuteSelector);
      expect(separator.left, moreOrLessEquals(hour.right + pickerTokens.selectorGap));
      expect(minute.left, moreOrLessEquals(separator.right + pickerTokens.selectorGap));
      expect(hour.width, greaterThanOrEqualTo(pickerTokens.selectorContainerWidth));
      expect(hour.height, pickerTokens.selectorContainerHeight);
      expect(hourText(tester), '7');
      expect(minuteText(tester), '05');
      final TextStyle style = tester.widget<Text>(find.text(':')).style!;
      expect(style.fontSize, pickerTokens.separatorTypescale.size);
      expect(style.color, paint(pickerTokens.separatorColor));
      final TanreiTimePickerConditionStateTokens selected = tone(
        TanreiTimePickerCondition.selected,
        TanreiInteractionState.enabled,
      );
      final TanreiTimePickerConditionStateTokens unselected = tone(
        TanreiTimePickerCondition.unselected,
        TanreiInteractionState.enabled,
      );
      expect(decorationOf(tester, hourSelector).shape.radius, pickerTokens.selectorContainerShape);
      expect(fillOf(tester, hourSelector), paint(selected.selectorContainerColor));
      expect(edgeOf(tester, hourSelector)!.color, paint(selected.selectorOutlineColor));
      expect(edgeOf(tester, hourSelector)!.width, selected.selectorOutlineWidth);
      expect(labelOf(tester, hourSelector), paint(selected.selectorLabelColor));
      expect(
        tester
            .widget<Text>(find.descendant(of: hourSelector, matching: find.byType(Text)))
            .style!
            .fontSize,
        pickerTokens.selectorLabelTypescale.size,
      );
      expect(fillOf(tester, minuteSelector), paint(unselected.selectorContainerColor));
      expect(edgeOf(tester, minuteSelector), isNull, reason: 'the unselected edge is none');
      expect(labelOf(tester, minuteSelector), paint(unselected.selectorLabelColor));
      // The 24-hour clock writes the hour with two digits in en-US.
      await openPicker(tester, initialTime: t(7, 5), hourCycle: TanreiTimePickerHourCycle.h23);
      expect(hourText(tester), '07');
    });

    testWidgets('TMP-10: with a 12-hour clock the period sits where the locale\'s pattern writes '
        'it — after the minutes in English, before the hour in Japanese — period.margin-inline-start '
        'away: two segments, before noon first, as tall as the selectors (the fields), in a border '
        'with a line between them, the pending one selected', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(7, 30));
      final Rect minute = tester.getRect(minuteSelector);
      final Rect before = tester.getRect(am);
      final Rect after = tester.getRect(pm);
      expect(before.left, moreOrLessEquals(minute.right + pickerTokens.periodMarginInlineStart));
      expect(before.right, lessThan(after.left));
      expect(before.width, greaterThanOrEqualTo(pickerTokens.periodContainerWidth));
      expect(before.height, tester.getRect(hourSelector).height);
      expect(find.descendant(of: am, matching: find.text('AM')), findsOneWidget);
      expect(find.descendant(of: pm, matching: find.text('PM')), findsOneWidget);
      final TanreiTimePickerConditionStateTokens selected = tone(
        TanreiTimePickerCondition.selected,
        TanreiInteractionState.enabled,
      );
      final TanreiTimePickerConditionStateTokens unselected = tone(
        TanreiTimePickerCondition.unselected,
        TanreiInteractionState.enabled,
      );
      expect(fillOf(tester, am), paint(selected.periodContainerColor));
      expect(labelOf(tester, am), paint(selected.periodLabelColor));
      expect(fillOf(tester, pm), none);
      expect(labelOf(tester, pm), paint(unselected.periodLabelColor));
      final DecoratedBox border = tester.widget<DecoratedBox>(
        find
            .ancestor(
              of: am,
              matching: find.byWidgetPredicate(
                (Widget w) => w is DecoratedBox && w.position == DecorationPosition.foreground,
              ),
            )
            .first,
      );
      final TanreiContainerDecoration outline = border.decoration as TanreiContainerDecoration;
      expect(outline.shape.radius, pickerTokens.periodContainerShape);
      expect(outline.border!.top.color, paint(pickerTokens.periodOutlineColor));
      expect(outline.border!.top.width, pickerTokens.periodOutlineWidth);
      final Finder line = find.byWidgetPredicate(
        (Widget w) => w is ColoredBox && w.color == paint(pickerTokens.periodOutlineColor),
      );
      expect(tester.getRect(line).left, moreOrLessEquals(before.right));
      expect(tester.getRect(line).width, pickerTokens.periodOutlineWidth);

      // Japanese writes the period before the hour.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        locale: const Locale('ja', 'JP'),
        delegates: japanese,
        supportedLocales: withJapanese,
      );
      expect(find.descendant(of: am, matching: find.text('午前')), findsOneWidget);
      expect(
        tester.getRect(pm).right + pickerTokens.periodMarginInlineStart,
        moreOrLessEquals(tester.getRect(hourSelector).left),
      );
      // Beside the fields: as tall as a field's container, level with it.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
        locale: const Locale('ja', 'JP'),
        delegates: japanese,
        supportedLocales: withJapanese,
      );
      // The field's container, whatever its label and text make the field around it (TXF-13).
      final Rect container = tester.getRect(fieldContainer('Hour'));
      expect(
        container.height,
        greaterThanOrEqualTo(system.textField.sizes[TanreiTextFieldSize.large].containerHeight),
      );
      expect(tester.getRect(am).height, moreOrLessEquals(container.height));
      expect(tester.getRect(pm).right, lessThan(tester.getRect(fieldFinder('Hour')).left));
      expect(tester.getRect(am).center.dy, moreOrLessEquals(container.center.dy));
    });

    testWidgets('TMP-10, TMP-23: beside fields grown by a label that wraps (TXF-13) or by enlarged '
        'text, the period stays as tall as the fields\' containers and the separator and the '
        'period stay level with them', (WidgetTester tester) async {
      Future<void> check(String reason, {String hourLabel = 'Hour'}) async {
        final Rect hourContainer = tester.getRect(fieldContainer(hourLabel));
        final Rect minute = tester.getRect(fieldContainer('Minute'));
        expect(minute.top, moreOrLessEquals(hourContainer.top), reason: reason);
        // The two containers' tops align; a label may make one taller than the other, and the
        // separator and the period follow the taller.
        final Rect hour = hourContainer.expandToInclude(minute);
        expect(tester.getRect(am).height, moreOrLessEquals(hour.height), reason: reason);
        expect(tester.getRect(am).center.dy, moreOrLessEquals(hour.center.dy), reason: reason);
        expect(tester.getRect(pm).center.dy, moreOrLessEquals(hour.center.dy), reason: reason);
        expect(
          tester.getRect(find.text(':')).center.dy,
          moreOrLessEquals(hour.center.dy),
          reason: reason,
        );
        expect(tester.takeException(), isNull, reason: reason);
      }

      // A long label wraps in the narrow fields and reserves room above their containers.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
        labels: const TanreiTimePickerLabels(hourLabel: 'Hour of the day', minuteLabel: 'Minute'),
      );
      final Rect whole = tester.getRect(fieldFinder('Hour of the day'));
      expect(
        tester.getRect(fieldContainer('Hour of the day')).top,
        greaterThan(whole.top),
        reason: 'room reserved above the container',
      );
      await check('a label that wraps', hourLabel: 'Hour of the day');

      // Enlarged text grows the containers themselves.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
        media: (MediaQueryData data) => data.copyWith(textScaler: const TextScaler.linear(2)),
      );
      expect(
        tester.getRect(fieldContainer('Hour')).height,
        greaterThan(system.textField.sizes[TanreiTextFieldSize.large].containerHeight),
      );
      await check('enlarged text');
    });

    testWidgets(
      'TMP-11: a segment chosen by a press, Enter or Space becomes the pending period and '
      'keeps the hour\'s number; in the period selector the arrows move to the other segment and '
      'choose it; the selector is one tab stop, the chosen segment',
      (WidgetTester tester) async {
        final Emitted emitted = await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
        await tester.tap(pm);
        await tester.pumpAndSettle();
        expect(chosen(tester, pm), isTrue);
        expect(hourText(tester), '7');
        await key(tester, LogicalKeyboardKey.arrowLeft); // on the hour selector: an hour earlier
        expect(hourText(tester), '6');
        await key(tester, LogicalKeyboardKey.arrowRight);
        await tabTimes(tester, 2);
        expect(focusedName(), 'PM', reason: 'the chosen segment is the tab stop');
        await key(tester, LogicalKeyboardKey.arrowLeft);
        expect(chosen(tester, am), isTrue);
        expect(focusedName(), 'AM');
        await key(tester, LogicalKeyboardKey.arrowRight);
        expect(chosen(tester, pm), isTrue);
        expect(focusedName(), 'PM');
        await tabTimes(tester, 1);
        expect(focusedName(), 'Switch to text entry', reason: 'one tab stop');
        await tabTimes(tester, 1, shift: true);
        expect(focusedName(), 'PM');
        // Enter and Space on a segment.
        await focusPart(tester, am);
        await key(tester, LogicalKeyboardKey.enter);
        expect(chosen(tester, am), isTrue);
        await focusPart(tester, pm);
        await key(tester, LogicalKeyboardKey.space);
        expect(chosen(tester, pm), isTrue);
        await tester.tap(buttonText('OK'));
        await tester.pumpAndSettle();
        expect(emitted.changes.single, t(19, 30));
      },
    );

    testWidgets('TMP-12: the dial is a circle of dial.container.size holding twelve numbers '
        'clockwise from the top — 12 and 1 to 11; 00 to 11 outside and 12 to 23 inside for 24 '
        'hours; 00 to 55 for minutes — on the rings TMP-12 names; clockwise right to left too', (
      WidgetTester tester,
    ) async {
      final Color label = paint(pickerTokens.dialLabelColor);
      final Color face = paint(pickerTokens.dialContainerColor);
      await openPicker(tester, initialTime: t(7, 30));
      expect(tester.getSize(dialFinder), Size.square(pickerTokens.dialContainerSize));
      FramePixels px = await windowPixels(tester);
      expect(px.atLogical(onDial(tester, 0, outerRing)), looksLike(label), reason: '12');
      expect(px.atLogical(onDial(tester, 90, outerRing)), looksLike(label), reason: '3');
      expect(px.atLogical(onDial(tester, 15, outerRing)), looksLike(face), reason: 'between');
      expect(px.atLogical(onDial(tester, 90, innerRing)), looksLike(face), reason: 'no inner ring');
      expect(
        px.atLogical(onDial(tester, 45, pickerTokens.dialContainerSize / 2 - 1)),
        looksLike(face),
        reason: 'the face reaches the edge',
      );

      await openPicker(tester, initialTime: t(19, 30), hourCycle: TanreiTimePickerHourCycle.h23);
      px = await windowPixels(tester);
      expect(px.atLogical(onDial(tester, 90, outerRing)), looksLike(label), reason: '03');
      expect(px.atLogical(onDial(tester, 90, innerRing)), looksLike(label), reason: '15');
      expect(px.atLogical(onDial(tester, 105, innerRing)), looksLike(face));

      await openPicker(tester, initialTime: t(7, 30), unit: TanreiTimePickerUnit.minute);
      px = await windowPixels(tester);
      expect(px.atLogical(onDial(tester, 90, outerRing)), looksLike(label), reason: '15');
      expect(px.atLogical(onDial(tester, 90, innerRing)), looksLike(face));

      // Right to left: still clockwise, 3 at the right.
      await openPicker(tester, initialTime: t(7, 30), textDirection: TextDirection.rtl);
      px = await windowPixels(tester);
      expect(px.atLogical(onDial(tester, 90, outerRing)), looksLike(label));
      expect(px.atLogical(onDial(tester, 90, outerRing) + const Offset(-12, 0)), looksLike(face));
    });

    testWidgets(
      'TMP-13: the handle is a circle of handle.size where the pending value lies, joined '
      'to the centre by the track, with the centre dot; the number under it is drawn in '
      'selected-label.color; a minute between the fives holds a dot',
      (WidgetTester tester) async {
        final Color handle = paint(pickerTokens.dialHandleColor);
        final Color selectedLabel = paint(pickerTokens.dialSelectedLabelColor);
        final Color track = paint(pickerTokens.dialTrackColor);
        await openPicker(tester, initialTime: t(7, 30));
        FramePixels px = await windowPixels(tester);
        final Offset at = onDial(tester, 210, outerRing);
        final Offset center = tester.getCenter(dialFinder);
        expect(px.atLogical(at + const Offset(13, 0)), looksLike(handle));
        expect(px.atLogical(at), looksLike(selectedLabel), reason: 'the 7 under the handle');
        expect(px.atLogical(Offset.lerp(center, at, 0.5)!), looksLike(track));
        expect(px.atLogical(center), looksLike(track), reason: 'the centre dot');
        expect(
          px.atLogical(at + Offset(pickerTokens.dialHandleSize / 2 + 2, 0)),
          isNot(looksLike(handle)),
          reason: 'the handle is handle.size across',
        );

        // 24 hours: 19 on the inner ring.
        await openPicker(tester, initialTime: t(19, 30), hourCycle: TanreiTimePickerHourCycle.h23);
        px = await windowPixels(tester);
        expect(
          px.atLogical(onDial(tester, 210, innerRing) + const Offset(0, -13)),
          looksLike(handle),
        );

        // A minute between the fives: a dot at the handle's centre.
        await openPicker(tester, initialTime: t(7, 32), unit: TanreiTimePickerUnit.minute);
        px = await windowPixels(tester);
        final Offset minute = onDial(tester, 192, outerRing);
        expect(px.atLogical(minute), looksLike(selectedLabel), reason: 'the dot');
        expect(px.atLogical(minute + const Offset(0, -7)), looksLike(handle));
      },
    );

    testWidgets('TMP-14: a press or a drag on the dial moves the handle at once to the nearest '
        'value (the nearer ring for 24 hours; any minute) and makes it pending; when it ends on the '
        'hour dial the minute dial shows, and focus on the hour selector moves to the minute '
        'selector; the dial is hidden from assistive technology', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
      await tester.tapAt(onDial(tester, 90, outerRing));
      await tester.pumpAndSettle();
      expect(hourText(tester), '3');
      expect(chosen(tester, am), isTrue, reason: 'the period stays');
      expect(selectorOf(tester, minuteSelector).selected, isTrue);
      expect(focusedName(), 'Minute');
      // The minute dial takes any minute, and stays.
      await tester.tapAt(onDial(tester, 17 * 6.0, outerRing));
      await tester.pumpAndSettle();
      expect(minuteText(tester), '17');
      expect(selectorOf(tester, minuteSelector).selected, isTrue);

      // A drag on the hour dial: the handle follows at once; the minute dial shows when it ends.
      await tester.tap(hourSelector);
      await tester.pumpAndSettle();
      expect(selectorOf(tester, hourSelector).selected, isTrue);
      final TestGesture drag = await tester.startGesture(onDial(tester, 0, outerRing));
      await tester.pump();
      expect(hourText(tester), '12');
      await drag.moveTo(onDial(tester, 60, outerRing));
      await tester.pump();
      expect(hourText(tester), '2');
      final FramePixels px = await windowPixels(tester);
      expect(
        px.atLogical(onDial(tester, 60, outerRing) + const Offset(13, 0)),
        looksLike(paint(pickerTokens.dialHandleColor)),
        reason: 'without animation',
      );
      expect(selectorOf(tester, hourSelector).selected, isTrue, reason: 'until it ends');
      await drag.up();
      await tester.pumpAndSettle();
      expect(selectorOf(tester, minuteSelector).selected, isTrue);

      // Focus elsewhere stays where it is.
      await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
      await tabTimes(tester, 1, shift: true);
      expect(focusedName(), 'OK');
      await tester.tapAt(onDial(tester, 90, outerRing));
      await tester.pumpAndSettle();
      expect(focusedName(), 'OK');

      // 24 hours: the nearer ring.
      await openPicker(tester, initialTime: t(7, 30), hourCycle: TanreiTimePickerHourCycle.h23);
      await tester.tapAt(onDial(tester, 90, innerRing));
      await tester.pumpAndSettle();
      expect(hourText(tester), '15');
      await tester.tap(hourSelector);
      await tester.pumpAndSettle();
      await tester.tapAt(onDial(tester, 90, outerRing + 4));
      await tester.pumpAndSettle();
      expect(hourText(tester), '03');

      // Hidden: nothing on the dial is exposed.
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pump();
      final SemanticsData dial = tester.getSemantics(dialFinder).getSemanticsData();
      expect(dial.hasAction(SemanticsAction.tap), isFalse);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).any((SemanticsNode n) => n.label == '15' || n.label == '12' || n.label == '00'),
        isFalse,
      );
      handle.dispose();
    });

    testWidgets(
      'TMP-15: a change of unit cross-fades the numbers; a change by a key moves the handle '
      'along the shorter arc over dial-duration with dial-easing; reduced motion does both at once',
      (WidgetTester tester) async {
        final Color label = paint(pickerTokens.dialLabelColor);
        final Color face = paint(pickerTokens.dialContainerColor);
        final int duration = pickerTokens.motionDialDuration;
        await openPicker(tester, initialTime: t(11, 0), byKeyboard: true);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pump();
        await tester.pump(ms(duration ~/ 2));
        final double eased = pickerTokens.motionDialEasing.toCurve().transform(0.5);
        FramePixels px = await windowPixels(tester);
        expect(
          px.atLogical(onDial(tester, 330 + 30 * eased, outerRing)),
          isNot(looksLike(label)),
          reason: 'the handle on the short way, from 11 to 12',
        );
        expect(
          px.atLogical(onDial(tester, 330 - 330 * eased, outerRing)),
          isNot(looksLike(paint(pickerTokens.dialHandleColor))),
          reason: 'not the long way',
        );
        await tester.pumpAndSettle();
        expect(hourText(tester), '12');

        // The unit changes: the numbers cross-fade (the 15's second digit lies clear of the 3).
        await tester.tap(minuteSelector);
        await tester.pump();
        await tester.pump(ms(duration ~/ 2));
        final Offset fifteen = onDial(tester, 90, outerRing) + const Offset(12, 0);
        px = await windowPixels(tester);
        expect(px.atLogical(fifteen), isNot(looksLike(label)));
        expect(px.atLogical(fifteen), isNot(looksLike(face)));
        await tester.pumpAndSettle();
        px = await windowPixels(tester);
        expect(px.atLogical(fifteen), looksLike(label));

        // Reduced motion: at once.
        await openPicker(tester, initialTime: t(11, 0), byKeyboard: true, disableAnimations: true);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pump();
        px = await windowPixels(tester);
        expect(
          px.atLogical(onDial(tester, 0, outerRing) + const Offset(0, 13)),
          isNot(looksLike(face)),
        );
        await tester.tap(minuteSelector);
        await tester.pump();
        px = await windowPixels(tester);
        expect(px.atLogical(fifteen), looksLike(label));
      },
    );

    testWidgets('TMP-16: each selector is adjustable — Up and Right one later, Down and Left one '
        'earlier, wrapping without changing the other unit or the period; Page Up and Page Down five '
        'minutes; Home and End the first and last value; increase and decrease do what Up and Down '
        'do; focus or a press shows its unit and selects it', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(12, 59), byKeyboard: true);
      expect(hourText(tester), '12');
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(hourText(tester), '1');
      expect(chosen(tester, pm), isTrue, reason: '12 PM to 1 PM');
      await key(tester, LogicalKeyboardKey.arrowDown);
      expect(hourText(tester), '12');
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(hourText(tester), '1');
      await key(tester, LogicalKeyboardKey.arrowLeft);
      await key(tester, LogicalKeyboardKey.home);
      expect(hourText(tester), '1');
      await key(tester, LogicalKeyboardKey.end);
      expect(hourText(tester), '12');
      expect(minuteText(tester), '59');
      await tabTimes(tester, 1);
      expect(focusedName(), 'Minute');
      expect(selectorOf(tester, minuteSelector).selected, isTrue, reason: 'focus selects it');
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(minuteText(tester), '00');
      expect(hourText(tester), '12', reason: 'the hour stays');
      await key(tester, LogicalKeyboardKey.pageUp);
      expect(minuteText(tester), '05');
      await key(tester, LogicalKeyboardKey.pageDown);
      await key(tester, LogicalKeyboardKey.pageDown);
      expect(minuteText(tester), '55');
      await key(tester, LogicalKeyboardKey.home);
      expect(minuteText(tester), '00');
      await key(tester, LogicalKeyboardKey.end);
      expect(minuteText(tester), '59');
      // Page Up and Page Down do nothing to the hour.
      await tabTimes(tester, 1, shift: true);
      await key(tester, LogicalKeyboardKey.pageUp);
      expect(hourText(tester), '12');

      // 24 hours: 23 to 00.
      await openPicker(
        tester,
        initialTime: t(23, 0),
        hourCycle: TanreiTimePickerHourCycle.h23,
        byKeyboard: true,
      );
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(hourText(tester), '00');
      await key(tester, LogicalKeyboardKey.end);
      expect(hourText(tester), '23');

      // Assistive technology's increase and decrease.
      final SemanticsHandle handle = tester.ensureSemantics();
      await openPicker(tester, initialTime: t(7, 30));
      act(tester, hourSelector, SemanticsAction.increase);
      await tester.pumpAndSettle();
      expect(hourText(tester), '8');
      act(tester, minuteSelector, SemanticsAction.decrease);
      await tester.pumpAndSettle();
      expect(minuteText(tester), '29');
      // A press shows the unit.
      await tester.tap(minuteSelector);
      await tester.pumpAndSettle();
      expect(selectorOf(tester, minuteSelector).selected, isTrue);
      expect(selectorOf(tester, hourSelector).selected, isFalse);
      handle.dispose();
    });
  });

  group('states', () {
    const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
    Color fill(TanreiTimePickerCondition condition, TanreiInteractionState state) =>
        acme.paint(tone(condition, state, acmeSystem).selectorContainerColor);
    Color periodFill(TanreiTimePickerCondition condition, TanreiInteractionState state) =>
        acme.paint(tone(condition, state, acmeSystem).periodContainerColor);
    const TanreiTimePickerCondition selected = TanreiTimePickerCondition.selected;
    const TanreiTimePickerCondition unselected = TanreiTimePickerCondition.unselected;

    testWidgets('TMP-17: under the acme system a hovered, keyboard-focused or pressed selector or '
        'segment draws its condition\'s tokens of that state, pressed over focused over hovered; '
        'pointer focus draws no focused state; states and conditions ease over state-duration, at '
        'once where motion is reduced', (WidgetTester tester) async {
      expect(<Color>{
        fill(unselected, TanreiInteractionState.hovered),
        fill(unselected, TanreiInteractionState.focused),
        fill(unselected, TanreiInteractionState.pressed),
      }, hasLength(3));
      await openPicker(tester, initialTime: t(7, 30), theme: acme, byKeyboard: true);
      expect(fillOf(tester, hourSelector), fill(selected, TanreiInteractionState.focused));
      final TestGesture mouse = await hoverOver(tester, minuteSelector);
      expect(fillOf(tester, minuteSelector), fill(unselected, TanreiInteractionState.hovered));
      await mouse.down(tester.getCenter(minuteSelector));
      await tester.pump();
      expect(fillOf(tester, minuteSelector), fill(unselected, TanreiInteractionState.pressed));
      await mouse.up();
      await tester.pumpAndSettle();
      expect(fillOf(tester, minuteSelector), fill(selected, TanreiInteractionState.hovered));
      // Focus over hover: the hour selector keeps keyboard focus.
      await mouse.moveTo(tester.getCenter(hourSelector));
      await tester.pumpAndSettle();
      expect(fillOf(tester, hourSelector), fill(unselected, TanreiInteractionState.focused));
      // A segment.
      await mouse.moveTo(tester.getCenter(pm));
      await tester.pumpAndSettle();
      expect(fillOf(tester, pm), periodFill(unselected, TanreiInteractionState.hovered));
      // A hover eases over state-duration.
      await mouse.moveTo(tester.getCenter(minuteSelector));
      await tester.pump();
      await tester.pump(ms(acmeSystem.timePicker.motionStateDuration ~/ 2));
      final Color midway = fillOf(tester, minuteSelector);
      expect(midway, isNot(fill(selected, TanreiInteractionState.hovered)));
      expect(midway, isNot(fill(selected, TanreiInteractionState.enabled)));
      await tester.pumpAndSettle();
      await mouse.moveTo(const Offset(1, 1));
      await tester.pumpAndSettle();
      // A change of condition eases too: the hour selector gives up its edge as focus moves on.
      await tester.tap(hourSelector);
      await tester.pumpAndSettle();
      expect(selectorOf(tester, hourSelector).selected, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.pump(ms(acmeSystem.timePicker.motionStateDuration ~/ 2));
      final Color edge = edgeOf(tester, hourSelector)!.color;
      expect(
        edge,
        isNot(
          acme.paint(
            tone(selected, TanreiInteractionState.focused, acmeSystem).selectorOutlineColor,
          ),
        ),
      );
      expect(edge.a, greaterThan(0));
      await tester.pumpAndSettle();

      // Pointer focus: no focused state.
      await openPicker(tester, initialTime: t(7, 30), theme: acme);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await focusPart(tester, minuteSelector);
      await tester.pumpAndSettle();
      expect(fillOf(tester, minuteSelector), fill(selected, TanreiInteractionState.enabled));

      // Reduced motion: at once.
      await openPicker(tester, initialTime: t(7, 30), theme: acme, disableAnimations: true);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await mouse.moveTo(tester.getCenter(minuteSelector));
      await tester.pump();
      expect(fillOf(tester, minuteSelector), fill(unselected, TanreiInteractionState.hovered));
      await tester.tap(minuteSelector);
      await tester.pump();
      expect(edgeOf(tester, hourSelector), isNull, reason: 'the condition changes at once');
    });

    testWidgets('TMP-18: keyboard focus shows the focus ring around a selector or the chosen '
        'segment at once; pointer or touch focus shows none', (WidgetTester tester) async {
      TanreiFocusRing ring(Finder item) => tester.widget<TanreiFocusRing>(
        find.descendant(of: item, matching: find.byType(TanreiFocusRing)).first,
      );
      await openPicker(tester, initialTime: t(7, 30), byKeyboard: true);
      expect(ring(hourSelector).visible, isTrue);
      expect(ring(minuteSelector).visible, isFalse);
      await tabTimes(tester, 1);
      expect(ring(minuteSelector).visible, isTrue, reason: 'at once');
      await tabTimes(tester, 1);
      expect(ring(am).visible, isTrue);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.pump();
      expect(ring(am).visible, isFalse);
      await focusPart(tester, hourSelector);
      await tester.pump();
      expect(ring(hourSelector).visible, isFalse);
    });

    testWidgets('TMP-19: a press on a selector or a segment shows the pressed state at once and '
        'keeps it for the press-hold, by pointer or by Enter', (WidgetTester tester) async {
      await openPicker(tester, initialTime: t(7, 30), theme: acme);
      final Duration hold = tanreiDuration(acmeSystem.motion.duration.pressHold);
      final Color pressed = periodFill(selected, TanreiInteractionState.pressed);
      final TestGesture touch = await tester.startGesture(tester.getCenter(am));
      await tester.pump();
      expect(fillOf(tester, am), pressed, reason: 'without delay');
      await touch.up();
      await tester.pump(hold - ms(1));
      expect(fillOf(tester, am), pressed, reason: 'held');
      await tester.pumpAndSettle();
      expect(fillOf(tester, am), periodFill(selected, TanreiInteractionState.enabled));
      // By Enter.
      await openPicker(tester, initialTime: t(7, 30), theme: acme, byKeyboard: true);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(fillOf(tester, hourSelector), fill(selected, TanreiInteractionState.pressed));
      await tester.pump(hold - ms(1));
      expect(fillOf(tester, hourSelector), fill(selected, TanreiInteractionState.pressed));
      await tester.pumpAndSettle();
    });

    testWidgets('TMP-20: the press answers as pressed-feedback names: overlay (the default) paints '
        'the pressed container, ripple (m3-like) grows a ripple over the container underneath, dim '
        '(cupertino) keeps the container and applies the pressed opacity, none changes nothing', (
      WidgetTester tester,
    ) async {
      Future<void> pressMinute(TanreiThemeData theme) async {
        await openPicker(tester, initialTime: t(7, 30), theme: theme);
        await tester.startGesture(tester.getCenter(minuteSelector));
        await tester.pump();
      }

      await pressMinute(lightTheme);
      expect(
        fillOf(tester, minuteSelector),
        paint(tone(unselected, TanreiInteractionState.pressed).selectorContainerColor),
      );
      expect(decorationOf(tester, minuteSelector).ripple, isNull);

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await pressMinute(m3);
      expect(decorationOf(tester, minuteSelector).ripple, isNotNull);
      expect(
        fillOf(tester, minuteSelector),
        m3.paint(
          tone(unselected, TanreiInteractionState.enabled, m3LikeSystem).selectorContainerColor,
        ),
        reason: 'the container stays with the state under the press',
      );

      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      await pressMinute(cupertino);
      expect(decorationOf(tester, minuteSelector).ripple, isNull);
      final Opacity dim = tester.widget(
        find.descendant(of: minuteSelector, matching: find.byType(Opacity)).first,
      );
      expect(dim.opacity, cupertinoSystem.timePicker.pressed.opacity);
      expect(
        fillOf(tester, minuteSelector),
        cupertino.paint(
          tone(unselected, TanreiInteractionState.enabled, cupertinoSystem).selectorContainerColor,
        ),
      );

      final TanreiThemeData silent = TanreiThemeData(
        system: system.copyWith(
          behavior: system.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
        ),
      );
      await pressMinute(silent);
      expect(
        fillOf(tester, minuteSelector),
        paint(tone(unselected, TanreiInteractionState.enabled).selectorContainerColor),
      );
      await tester.pumpAndSettle();
    });

    testWidgets('TMP-21: the selectors\' and segments\' corners are eased by corner-smoothing, and '
        'keyboard focus follows focus-style (acme: glow)', (WidgetTester tester) async {
      await openPicker(
        tester,
        initialTime: t(7, 30),
        theme: const TanreiThemeData(system: cupertinoSystem),
      );
      expect(
        decorationOf(tester, hourSelector).shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      expect(decorationOf(tester, am).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      final DecoratedBox surface = tester.widget<DecoratedBox>(
        surfaceFinder(theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      expect(
        (surface.decoration as TanreiContainerDecoration).shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
      await openPicker(tester, initialTime: t(7, 30), theme: acme, byKeyboard: true);
      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      final CustomPaint painter = tester.widget(
        find
            .descendant(
              of: find.descendant(of: hourSelector, matching: find.byType(TanreiFocusRing)),
              matching: find.byType(CustomPaint),
            )
            .first,
      );
      expect(painter.foregroundPainter, isNotNull);
    });

    testWidgets('TMP-22: selectors and segments are drawn at least the touch target; beside the '
        'fields a segment is as tall as a field and its target reaches equally above and below', (
      WidgetTester tester,
    ) async {
      final double target = system.measure.targetTouch;
      final TanreiThemeData small = TanreiThemeData(
        system: system.copyWith(
          timePicker: system.timePicker.copyWith(
            selectorContainerWidth: 40,
            selectorContainerHeight: 40,
            periodContainerWidth: 30,
          ),
        ),
      );
      await openPicker(tester, initialTime: t(7, 30), theme: small);
      expect(tester.getSize(hourSelector).height, greaterThanOrEqualTo(target));
      expect(tester.getSize(hourSelector).width, greaterThanOrEqualTo(target));
      expect(tester.getSize(am).width, greaterThanOrEqualTo(target));
      expect(tester.getSize(am).height, greaterThanOrEqualTo(target));

      final SemanticsHandle handle = tester.ensureSemantics();
      // Labels that fit on one line in the test font, whose "Hour" wraps at rest and grows the
      // field (TXF-13): here the fields keep the large size's container height, under the target.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
        labels: const TanreiTimePickerLabels(hourLabel: 'H', minuteLabel: 'M'),
      );
      final Rect drawn = tester.getRect(pm);
      expect(drawn.height, lessThan(target));
      expect(drawn.width, greaterThanOrEqualTo(target));
      final double reach = (target - drawn.height) / 2;
      await tester.tapAt(Offset(drawn.center.dx, drawn.top - reach + 1));
      await tester.pumpAndSettle();
      expect(chosen(tester, pm), isTrue, reason: 'above the drawing');
      final Rect before = tester.getRect(am);
      await tester.tapAt(Offset(before.center.dx, before.bottom + reach - 1));
      await tester.pumpAndSettle();
      expect(chosen(tester, am), isTrue, reason: 'below the drawing');
      expect(tester.getSemantics(am).rect.height, moreOrLessEquals(target));
      handle.dispose();
    });
  });

  group('text entry, actions and motion', () {
    testWidgets('TMP-23: text entry shows two outlined large number fields of maxLength 2, '
        'selector.container.width wide, labelled hourLabel and minuteLabel, with the separator '
        'between them; filled with the pending time; a number of the unit becomes pending, anything '
        'else committed is an error until the next edit; the action key moves to the minute field, '
        'then activates OK', (WidgetTester tester) async {
      final Emitted emitted = await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
      );
      final TanreiTextField hour = tester.widget<TanreiTextField>(fieldFinder('Hour'));
      expect(hour.variant, TanreiTextFieldVariant.outlined);
      expect(hour.size, TanreiTextFieldSize.large);
      expect(hour.type, TanreiTextFieldType.number);
      expect(hour.maxLength, 2);
      expect(tester.getSize(fieldFinder('Hour')).width, pickerTokens.selectorContainerWidth);
      expect(tester.getSize(fieldFinder('Minute')).width, pickerTokens.selectorContainerWidth);
      expect(fieldText(tester, 'Hour').text, '7');
      expect(fieldText(tester, 'Minute').text, '30');
      final Rect separator = tester.getRect(find.text(':'));
      expect(
        separator.left,
        moreOrLessEquals(tester.getRect(fieldFinder('Hour')).right + pickerTokens.selectorGap),
      );
      final TextStyle style = tester.widget<Text>(find.text(':')).style!;
      expect(style.fontSize, system.textField.sizes[TanreiTextFieldSize.large].inputTypescale.size);
      expect(style.color, paint(pickerTokens.separatorColor));

      // A number of the unit becomes the pending one.
      await tester.enterText(fieldFinder('Hour'), '8');
      await tester.pumpAndSettle();
      expect(okEnabled(tester), isTrue);
      // Not a number of the unit: OK disabled; committed, an error; the next edit clears it.
      await tester.enterText(fieldFinder('Hour'), '13');
      await tester.pumpAndSettle();
      expect(okEnabled(tester), isFalse);
      expect(tester.widget<TanreiTextField>(fieldFinder('Hour')).isError, isFalse);
      await tester.showKeyboard(fieldFinder('Minute'));
      await tester.pumpAndSettle();
      TanreiTextField shown = tester.widget<TanreiTextField>(fieldFinder('Hour'));
      expect(shown.isError, isTrue);
      expect(shown.errorText, 'Enter a valid time');
      await tester.enterText(fieldFinder('Hour'), '9');
      await tester.pumpAndSettle();
      shown = tester.widget<TanreiTextField>(fieldFinder('Hour'));
      expect(shown.isError, isFalse);
      expect(okEnabled(tester), isTrue);
      // Empty, committed: an error too.
      await tester.enterText(fieldFinder('Minute'), '');
      await tester.showKeyboard(fieldFinder('Hour'));
      await tester.pumpAndSettle();
      expect(tester.widget<TanreiTextField>(fieldFinder('Minute')).isError, isTrue);
      await tester.enterText(fieldFinder('Minute'), '05');
      await tester.pumpAndSettle();
      // The action key: hour to minute, then OK.
      await tester.showKeyboard(fieldFinder('Hour'));
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(focusedName(), 'Minute');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(emitted.events, <String>['change:09:05', 'close:confirm']);

      // 24 hours: 0 to 23; the locale's digits are read too.
      await openPicker(
        tester,
        initialTime: t(19, 30),
        hourCycle: TanreiTimePickerHourCycle.h23,
        entryMode: TanreiTimePickerEntryMode.text,
      );
      expect(fieldText(tester, 'Hour').text, '19');
      await tester.enterText(fieldFinder('Hour'), '24');
      await tester.pumpAndSettle();
      expect(okEnabled(tester), isFalse);
      await tester.enterText(fieldFinder('Hour'), '0');
      await tester.pumpAndSettle();
      expect(okEnabled(tester), isTrue);
      await openPicker(
        tester,
        initialTime: t(7, 30),
        entryMode: TanreiTimePickerEntryMode.text,
        locale: const Locale('fr', 'FR'),
        delegates: const <LocalizationsDelegate<dynamic>>[
          TanreiDateLocalizations.delegate,
          MarkedDelegate(),
        ],
        supportedLocales: withFrench,
      );
      await tester.enterText(fieldFinder('Hour'), 'I0');
      await tester.pumpAndSettle();
      await tester.tap(iconButton('Switch to clock'));
      await tester.pumpAndSettle();
      expect(hourText(tester), 'I0');
    });

    testWidgets(
      'TMP-24: the actions row holds the entry-mode toggle — a standard medium icon button, '
      'the keyboard glyph named textEntryLabel — at its start, and Cancel and OK — medium text '
      'Buttons, OK last — actions.gap apart at its end; the toggle switches entry, keeps the '
      'pending time and moves focus to the hour field or the hour selector',
      (WidgetTester tester) async {
        await openPicker(tester, initialTime: t(7, 30));
        final Rect surface = tester.getRect(surfaceFinder());
        final TanreiIconButton toggle = tester.widget<TanreiIconButton>(
          iconButton('Switch to text entry'),
        );
        expect(toggle.variant, TanreiIconButtonVariant.standard);
        expect(toggle.size, TanreiIconButtonSize.medium);
        expect((toggle.icon as Text).data, '\u{e312}');
        expect(
          tester.getRect(iconButton('Switch to text entry')).left,
          moreOrLessEquals(surface.left + pickerTokens.containerPadding),
        );
        for (final String label in <String>['Cancel', 'OK']) {
          final TanreiButton button = tester.widget<TanreiButton>(buttonText(label));
          expect(button.variant, TanreiButtonVariant.text);
          expect(button.size, TanreiButtonSize.medium);
        }
        final Rect cancel = tester.getRect(buttonText('Cancel'));
        final Rect ok = tester.getRect(buttonText('OK'));
        expect(ok.left, moreOrLessEquals(cancel.right + pickerTokens.actionsGap));

        await tester.tap(pm);
        await tester.pumpAndSettle();
        await tester.tap(iconButton('Switch to text entry'));
        await tester.pumpAndSettle();
        expect(fieldText(tester, 'Hour').text, '7');
        expect(chosen(tester, pm), isTrue, reason: 'the pending time is kept');
        expect(focusedName(), 'Hour');
        expect(tester.widget<TanreiTextField>(fieldFinder('Hour')), isNotNull);
        final TanreiIconButton back = tester.widget<TanreiIconButton>(
          iconButton('Switch to clock'),
        );
        expect((back.icon as Text).data, '\u{e8b5}');
        await tester.enterText(fieldFinder('Minute'), '45');
        await tester.tap(iconButton('Switch to clock'));
        await tester.pumpAndSettle();
        expect(minuteText(tester), '45');
        expect(focusedName(), 'Hour');
        expect(selectorOf(tester, hourSelector).selected, isTrue);
      },
    );

    testWidgets(
      'TMP-25: opening fades the scrim and the container in, growing it from '
      'enter-scale over open-duration; closing fades both out over close-duration; reduced motion '
      'fades without growing, and on Android appears and disappears at once',
      (WidgetTester tester) async {
        Opacity transition() => tester.widget<Opacity>(
          find.byWidgetPredicate((Widget w) => w is Opacity && w.child is Transform),
        );
        Transform transform() => transition().child! as Transform;
        double opacity() => transition().opacity;
        double scrim() => tester
            .widget<FadeTransition>(
              find
                  .ancestor(
                    of: find.byWidgetPredicate(
                      (Widget w) => w is ColoredBox && w.color == paint(pickerTokens.scrimColor),
                    ),
                    matching: find.byType(FadeTransition),
                  )
                  .first,
            )
            .opacity
            .value;

        await openPicker(tester, initialTime: t(7, 30), settle: false);
        await tester.pump(ms(pickerTokens.motionOpenDuration ~/ 5));
        final double scale = transform().transform.storage[0];
        expect(scale, greaterThan(pickerTokens.motionEnterScale));
        expect(scale, lessThan(1));
        expect(opacity(), inExclusiveRange(0, 1));
        expect(scrim(), inExclusiveRange(0, 1));
        await tester.pumpAndSettle();
        expect(opacity(), 1);
        await tester.tap(buttonText('Cancel'));
        await tester.pump();
        await tester.pump(ms(pickerTokens.motionCloseDuration ~/ 2));
        expect(transform().transform.storage[0], 1, reason: 'it closes by fading alone');
        expect(opacity(), inExclusiveRange(0, 1));
        await tester.pumpAndSettle();
        expect(surfaceFinder(), findsNothing);

        // Reduced motion (off Android, whose setting removes every animation — and the test
        // platform is Android): a fade without growing.
        debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
        try {
          await openPicker(tester, initialTime: t(7, 30), settle: false, disableAnimations: true);
          await tester.pump(ms(pickerTokens.motionOpenDuration ~/ 5));
          expect(transform().transform.storage[0], 1);
          expect(opacity(), inExclusiveRange(0, 1));
          await tester.pumpAndSettle();
        } finally {
          debugDefaultTargetPlatformOverride = null;
        }

        // Android's reduced motion: at once.
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        try {
          await openPicker(tester, initialTime: t(7, 30), settle: false, disableAnimations: true);
          await tester.pump();
          expect(opacity(), 1);
          await tester.tap(buttonText('Cancel'));
          await tester.pump();
          await tester.pump();
          expect(surfaceFinder(), findsNothing);
        } finally {
          debugDefaultTargetPlatformOverride = null;
        }
      },
    );
  });

  group('accessibility, locale, direction and values', () {
    testWidgets('TMP-26: the surface is a modal dialog named by label; each selector an adjustable '
        'control named by its label whose value is its text, the hour with its period; the period a '
        'group of two radio buttons; the toggle, Cancel and OK named by their labels; the dial '
        'hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await openPicker(
        tester,
        initialTime: t(7, 30),
        labels: const TanreiTimePickerLabels(label: 'Alarm'),
      );
      final SemanticsData dialog = nodesWithRole(tester, SemanticsRole.dialog).single;
      expect(dialog.label, 'Alarm');
      expect(dialog.hasFlag(ui.SemanticsFlag.scopesRoute), isTrue);
      final SemanticsData hour = tester.getSemantics(hourSelector).getSemanticsData();
      expect(hour.label, 'Hour');
      expect(hour.value, '7 AM');
      expect(hour.increasedValue, '8 AM');
      expect(hour.decreasedValue, '6 AM');
      expect(hour.hasAction(SemanticsAction.increase), isTrue);
      expect(hour.hasAction(SemanticsAction.decrease), isTrue);
      expect(hour.hasFlag(ui.SemanticsFlag.isFocusable), isTrue);
      final SemanticsData minute = tester.getSemantics(minuteSelector).getSemanticsData();
      expect(minute.label, 'Minute');
      expect(minute.value, '30');
      expect(minute.increasedValue, '31');
      expect(minute.decreasedValue, '29');
      expect(nodesWithRole(tester, SemanticsRole.radioGroup), hasLength(1));
      final SemanticsData before = tester.getSemantics(am).getSemanticsData();
      expect(before.label, 'AM');
      expect(before.hasFlag(ui.SemanticsFlag.hasCheckedState), isTrue);
      expect(before.hasFlag(ui.SemanticsFlag.isChecked), isTrue);
      expect(before.hasFlag(ui.SemanticsFlag.isInMutuallyExclusiveGroup), isTrue);
      final SemanticsData after = tester.getSemantics(pm).getSemanticsData();
      expect(after.label, 'PM');
      expect(after.hasFlag(ui.SemanticsFlag.isChecked), isFalse);
      expect(tester.getSemantics(iconButton('Switch to text entry')).label, 'Switch to text entry');
      expect(tester.getSemantics(buttonText('Cancel')).label, 'Cancel');
      expect(tester.getSemantics(buttonText('OK')).label, 'OK');
      // Activation by assistive technology.
      tester.semantics.tap(find.semantics.byLabel('PM'));
      await tester.pumpAndSettle();
      expect(tester.getSemantics(hourSelector).getSemanticsData().value, '7 PM');
      // Japanese: the period first, as the pattern writes it.
      await openPicker(
        tester,
        initialTime: t(7, 30),
        locale: const Locale('ja', 'JP'),
        delegates: japanese,
        supportedLocales: withJapanese,
      );
      expect(tester.getSemantics(hourSelector).getSemanticsData().value, '午前 7');
      // 24 hours: the hour alone.
      await openPicker(tester, initialTime: t(19, 30), hourCycle: TanreiTimePickerHourCycle.h23);
      expect(tester.getSemantics(hourSelector).getSemanticsData().value, '19');
      handle.dispose();
    });

    testWidgets(
      'TMP-27: the period names, the digits, the separator and the preferred clock come '
      'from locale (or the ambient locale) through TanreiDateLocalizations; English is built in',
      (WidgetTester tester) async {
        const List<LocalizationsDelegate<dynamic>> delegates = <LocalizationsDelegate<dynamic>>[
          TanreiDateLocalizations.delegate,
          MarkedDelegate(),
        ];
        await openPicker(
          tester,
          initialTime: t(11, 10),
          locale: const Locale('fr', 'FR'),
          delegates: delegates,
          supportedLocales: withFrench,
        );
        expect(hourText(tester), 'II');
        expect(minuteText(tester), 'I0');
        expect(find.text('h'), findsOneWidget, reason: "the separator of h'h'mm a");
        expect(find.text('mat.'), findsOneWidget);
        expect(find.text('soir'), findsOneWidget);
        // The ambient locale, without the prop.
        await openPicker(
          tester,
          initialTime: t(11, 10),
          appLocale: const Locale('fr', 'FR'),
          delegates: delegates,
          supportedLocales: withFrench,
        );
        expect(hourText(tester), 'II');
        // A locale without localizations: English words.
        await openPicker(
          tester,
          initialTime: t(11, 10),
          locale: const Locale('de', 'DE'),
          supportedLocales: const <Locale>[Locale('en', 'US'), Locale('de', 'DE')],
        );
        expect(find.text('AM'), findsOneWidget);
        // The built-in English and the patterns.
        const TanreiEnglishDateLocalizations us = TanreiEnglishDateLocalizations.unitedStates;
        const TanreiEnglishDateLocalizations gb = TanreiEnglishDateLocalizations(
          locale: Locale('en', 'GB'),
        );
        expect(us.anteMeridiemAbbreviation, 'AM');
        expect(us.postMeridiemAbbreviation, 'PM');
        expect(us.preferredHourMinutePattern, 'h:mm a');
        expect(gb.preferredHourMinutePattern, 'HH:mm');
        final TanreiTimePattern english = TanreiTimePattern.parse('h:mm a');
        expect(english.twentyFourHour, isFalse);
        expect(english.periodBeforeHour, isFalse);
        expect(english.hourDigits, 1);
        expect(english.separator, ':');
        final TanreiTimePattern japaneseTwelve = TanreiTimePattern.parse('aK:mm');
        expect(japaneseTwelve.periodBeforeHour, isTrue);
        expect(japaneseTwelve.twentyFourHour, isFalse);
        expect(TanreiTimePattern.parse('a h:mm').periodBeforeHour, isTrue);
        expect(TanreiTimePattern.parse('HH:mm').hourDigits, 2);
        expect(TanreiTimePattern.parse('kk:mm').twentyFourHour, isTrue);
        expect(TanreiTimePattern.parse('H.mm').separator, '.');
        expect(TanreiTimePattern.parse("HH'h'mm").separator, 'h');
      },
    );

    testWidgets(
      'TMP-28: right to left the layout mirrors — the period beside the time, the actions, '
      'the columns — but the hour, the separator and the minute stay left to right and the dial '
      'runs clockwise',
      (WidgetTester tester) async {
        await openPicker(tester, initialTime: t(7, 30), textDirection: TextDirection.rtl);
        final Rect surface = tester.getRect(surfaceFinder());
        final Rect hour = tester.getRect(hourSelector);
        expect(hour.left, lessThan(tester.getRect(minuteSelector).left));
        expect(
          tester.getRect(am).right + pickerTokens.periodMarginInlineStart,
          moreOrLessEquals(hour.left),
          reason: 'after the minutes in reading order: at their left',
        );
        expect(tester.getRect(am).left, greaterThan(tester.getRect(pm).left));
        expect(
          tester.getRect(iconButton('Switch to text entry')).right,
          moreOrLessEquals(surface.right - pickerTokens.containerPadding),
        );
        expect(
          tester.getRect(buttonText('OK')).left,
          lessThan(tester.getRect(buttonText('Cancel')).left),
        );
        await tester.tapAt(onDial(tester, 90, outerRing));
        await tester.pumpAndSettle();
        expect(hourText(tester), '3', reason: 'clockwise');

        await openPicker(
          tester,
          initialTime: t(7, 30),
          textDirection: TextDirection.rtl,
          layout: TanreiTimePickerLayout.horizontal,
        );
        final Rect wide = tester.getRect(surfaceFinder());
        expect(
          tester.getRect(dialFinder).left,
          moreOrLessEquals(wide.left + pickerTokens.containerPadding),
        );
        expect(
          tester.getRect(find.text('Select time')).right,
          moreOrLessEquals(wide.right - pickerTokens.containerPadding),
        );

        await openPicker(
          tester,
          initialTime: t(7, 30),
          textDirection: TextDirection.rtl,
          entryMode: TanreiTimePickerEntryMode.text,
        );
        expect(
          tester.getRect(fieldFinder('Hour')).left,
          lessThan(tester.getRect(fieldFinder('Minute')).left),
        );
      },
    );

    testWidgets(
      'TMP-29: an hourCycle, entryMode, unit or layout the picker does not define behaves '
      'as the default and is reported; a value that is not "HH:MM" is treated as none and '
      'reported; an empty label is reported and the picker still opens',
      (WidgetTester tester) async {
        final List<String> unknown = collectUnknownValues();
        expect(TanreiTimePickerHourCycle.fromName('h24'), TanreiTimePickerHourCycle.locale);
        expect(TanreiTimePickerEntryMode.fromName('voice'), TanreiTimePickerEntryMode.dial);
        expect(TanreiTimePickerUnit.fromName('second'), TanreiTimePickerUnit.hour);
        expect(TanreiTimePickerLayout.fromName('diagonal'), TanreiTimePickerLayout.auto);
        expect(unknown, hasLength(4));
        expect(TanreiTimeOfDay.parse('24:00'), isNull);
        expect(TanreiTimeOfDay.parse('7:30'), isNull);
        expect(TanreiTimeOfDay.parse('19:30:00'), isNull);
        expect(TanreiTimeOfDay.parse(''), isNull);
        expect(TanreiTimeOfDay.parse('19:30'), t(19, 30));
        expect(t(19, 30).format(), '19:30');
        expect(unknown, hasLength(7), reason: 'empty text is no report');

        final List<String> ignored = collectIgnoredValues();
        final DateTime now = DateTime.now();
        await openPicker(
          tester,
          initialTime: const TanreiTimeOfDay(hour: 25, minute: 0),
          hourCycle: TanreiTimePickerHourCycle.h23,
        );
        expect(ignored.single, contains('initialTime'));
        expect(
          <String>{
            now.hour.toString().padLeft(2, '0'),
            DateTime.now().hour.toString().padLeft(2, '0'),
          },
          contains(hourText(tester)),
          reason: 'treated as none: the device\'s time',
        );

        final List<String> missing = collectMissingNames();
        await openPicker(tester, labels: const TanreiTimePickerLabels(label: ''));
        expect(missing, <String>['time picker']);
        expect(surfaceFinder(), findsOneWidget, reason: 'it still opens');
      },
    );

    testWidgets('accessibility guidelines: the dial and text entry', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await openPicker(tester, initialTime: t(7, 30));
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      await openPicker(tester, initialTime: t(7, 30), entryMode: TanreiTimePickerEntryMode.text);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });

    testWidgets('a modified system drives the picker: selector and period sizes, dial and handle '
        'sizes, corners and colors', (WidgetTester tester) async {
      final TanreiSystem custom = system.copyWith(
        timePicker: system.timePicker.copyWith(
          selectorContainerWidth: 100,
          selectorContainerHeight: 72,
          periodContainerWidth: 60,
          dialContainerSize: 280,
          containerShape: 20,
          dialHandleColor: const TanreiPaint.role(TanreiColorRole.error),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: custom);
      await openPicker(tester, initialTime: t(7, 30), theme: theme);
      expect(tester.getSize(hourSelector), const Size(100, 72));
      expect(tester.getSize(am).width, 60);
      expect(tester.getSize(dialFinder), const Size.square(280));
      expect(
        (tester.widget<DecoratedBox>(surfaceFinder(theme: theme)).decoration
                as TanreiContainerDecoration)
            .shape
            .radius,
        20,
      );
      final double outer =
          280 / 2 - custom.timePicker.dialPadding - custom.timePicker.dialHandleSize / 2;
      final FramePixels px = await windowPixels(tester);
      expect(
        px.atLogical(onDial(tester, 210, outer) + const Offset(13, 0)),
        looksLike(theme.color(TanreiColorRole.error)),
      );
    });
  });

  group('goldens', () {
    test('the spec lists the fixtures this suite records, every one open', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'dial-hour',
        'dial-hour-ja',
        'dial-minute',
        'dial-minute-between',
        'dial-24h',
        'text',
        'text-24h',
        'horizontal',
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
          file: 'goldens/time_picker/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the hour dial shows the
    // preset's scrim, container, label, selectors, period, dial, handle and actions at once.
    const String recorded = 'dial-hour';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectPickerGolden(
          tester,
          system: preset,
          fixture: fixture(recorded),
          file: 'goldens/time_picker/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
