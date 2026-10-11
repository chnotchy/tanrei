import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart' as fixtures;
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiSliderTokens sliderTokens = system.slider;
final TanreiSliderConditionTokens standard = sliderTokens.conditions.standard;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// SLD-7's horizontal stage (320 × 96, a slider 320 long centered in it) inside the `space200`
/// padding of every baseline; and the vertical one (96 × 240).
const Size horizontalSurface = Size(352, 128);
const Size verticalSurface = Size(128, 272);
const double horizontalLength = 320;
const double verticalLength = 240;

/// What an owner of the value saw: `input 40`, `change 40`; a range's `input 20–60`.
typedef Log = List<String>;

String _n(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

/// Keeps a slider's value as a product does, and logs its events.
class Owner extends StatefulWidget {
  const Owner({
    super.key,
    required this.log,
    this.value = 40,
    this.start = 20,
    this.range = false,
    this.enabled = true,
    this.min = 0,
    this.max = 100,
    this.step = 0,
    this.origin,
    this.showStops = false,
    this.valueIndicator = TanreiSliderValueIndicator.none,
    this.size = TanreiSliderSize.small,
    this.orientation = Axis.horizontal,
    this.label = 'Volume',
    this.startLabel = 'Minimum',
    this.valueText = '',
    this.startValueText = '',
  });

  final Log log;
  final double value;
  final double start;
  final bool range;
  final bool enabled;
  final double min;
  final double max;
  final double step;
  final double? origin;
  final bool showStops;
  final TanreiSliderValueIndicator valueIndicator;
  final TanreiSliderSize size;
  final Axis orientation;
  final String label;
  final String startLabel;
  final String valueText;
  final String startValueText;

  @override
  State<Owner> createState() => OwnerState();
}

class OwnerState extends State<Owner> {
  late double value = widget.value;
  late double start = widget.start;

  @override
  void didUpdateWidget(Owner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      value = widget.value;
    }
    if (oldWidget.start != widget.start) {
      start = widget.start;
    }
  }

  @override
  Widget build(BuildContext context) {
    final Widget slider = widget.range
        ? TanreiSlider.range(
            start: start,
            end: value,
            onChanged: widget.enabled
                ? (double s, double e) => setState(() {
                    widget.log.add('input ${_n(s)}–${_n(e)}');
                    start = s;
                    value = e;
                  })
                : null,
            onChangeEnd: (double s, double e) => widget.log.add('change ${_n(s)}–${_n(e)}'),
            min: widget.min,
            max: widget.max,
            step: widget.step,
            showStops: widget.showStops,
            valueIndicator: widget.valueIndicator,
            size: widget.size,
            orientation: widget.orientation,
            semanticLabel: widget.label,
            startSemanticLabel: widget.startLabel,
            semanticValue: widget.valueText,
            startSemanticValue: widget.startValueText,
          )
        : TanreiSlider(
            value: value,
            onChanged: widget.enabled
                ? (double v) => setState(() {
                    widget.log.add('input ${_n(v)}');
                    value = v;
                  })
                : null,
            onChangeEnd: (double v) => widget.log.add('change ${_n(v)}'),
            min: widget.min,
            max: widget.max,
            step: widget.step,
            origin: widget.origin,
            showStops: widget.showStops,
            valueIndicator: widget.valueIndicator,
            size: widget.size,
            orientation: widget.orientation,
            semanticLabel: widget.label,
            semanticValue: widget.valueText,
          );
    // No wrapper of the slider's own size: the stage's padding gives it its length, and leaves room
    // for its hit area (SLD-7).
    return slider;
  }
}

/// A slider in SLD-7's stage, as a baseline frames it, in [system]'s light scheme.
Future<GlobalKey> pumpSlider(
  WidgetTester tester,
  Widget owner, {
  TanreiSystem system = system,
  TextDirection textDirection = TextDirection.ltr,
  bool disableAnimations = false,
  bool vertical = false,
}) async {
  final GlobalKey key = await pumpFixtureFrame(
    tester,
    system: system,
    child: owner,
    textDirection: textDirection,
    disableAnimations: disableAnimations,
    surface: vertical ? verticalSurface : horizontalSurface,
  );
  await tester.pumpAndSettle();
  return key;
}

Rect sliderRect(WidgetTester tester, [int index = 0]) =>
    tester.getRect(find.byType(TanreiSlider).at(index));

/// Where the handle's center is at [fraction] of the travel (SLD-7): the track inset by half the
/// container, the travel half the track's thickness in from its ends.
Offset pointAt(
  WidgetTester tester,
  double fraction, {
  TanreiSystem system = system,
  TanreiSliderSize size = TanreiSliderSize.small,
  bool rtl = false,
  bool vertical = false,
}) {
  final Rect rect = sliderRect(tester);
  final TanreiSliderTokens tokens = system.slider;
  final double thickness = tokens.sizes[size].trackThickness;
  final double start = tokens.containerSize / 2 + thickness / 2;
  final double length = vertical ? rect.height : rect.width;
  final double along = start + fraction * (length - 2 * start);
  if (vertical) {
    return Offset(rect.center.dx, rect.bottom - along);
  }
  return Offset(rtl ? rect.right - along : rect.left + along, rect.center.dy);
}

/// The color a part in [paint] shows over the light surface.
Color over(TanreiPaint paint, {TanreiThemeData theme = lightTheme, Color? under}) =>
    Color.alphaBlend(theme.paint(paint), under ?? theme.colors.surface);

SemanticsNode nodeOf(WidgetTester tester, String label) =>
    tester.getSemantics(find.bySemanticsLabel(label));

void act(WidgetTester tester, String label, SemanticsAction action) {
  final SemanticsNode node = nodeOf(tester, label);
  node.owner!.performAction(node.id, action);
}

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String label = '';
  context.visitAncestorElements((Element element) {
    final Widget w = element.widget;
    if (w is Semantics && (w.properties.slider ?? false)) {
      label = w.properties.label ?? '';
      return false;
    }
    return true;
  });
  return label;
}

Future<void> key(WidgetTester tester, LogicalKeyboardKey k) async {
  await tester.sendKeyEvent(k);
  await tester.pumpAndSettle();
}

Future<void> tabTo(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.pumpAndSettle();
}

List<String> collectIgnored() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// The fixture's slider, as the gallery draws it: the props over the spec's defaults.
Widget fixtureSlider(Map<String, dynamic> fixture) {
  final Map<String, dynamic> p = fixture['props'] as Map<String, dynamic>;
  double n(String k, double d) => (p[k] as num?)?.toDouble() ?? d;
  return Owner(
    log: <String>[],
    value: n('value', 0),
    start: n('startValue', 0),
    range: p['range'] == true,
    enabled: p['disabled'] != true,
    min: n('min', 0),
    max: n('max', 100),
    step: n('step', 0),
    origin: (p['origin'] as num?)?.toDouble(),
    showStops: p['stops'] == true,
    valueIndicator: TanreiSliderValueIndicator.fromName(p['valueIndicator'] as String? ?? 'none'),
    size: TanreiSliderSize(p['size'] as String? ?? 'small'),
    orientation: TanreiSlider.orientationFromName(p['orientation'] as String? ?? 'horizontal'),
    label: p['label'] as String? ?? '',
    startLabel: p['startLabel'] as String? ?? '',
    valueText: p['valueText'] as String? ?? '',
    startValueText: p['startValueText'] as String? ?? '',
  );
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('values', () {
    testWidgets('SLD-1: values stay between min and max and, with a step, snap to the nearest step '
        'that does not exceed max; continuous values take any value', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, step: 10, value: 30));
      final TestGesture mouse = await tester.startGesture(
        pointAt(tester, 0.34),
        kind: PointerDeviceKind.mouse,
      );
      await mouse.up();
      await tester.pumpAndSettle();
      // 34 snaps to 30: nothing changed.
      expect(log, isEmpty);
      await tester.tapAt(pointAt(tester, 0.36), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(log, <String>['input 40', 'change 40']);
      log.clear();
      // Beyond the end: max.
      await tester.tapAt(sliderRect(tester).centerRight - const Offset(1, 0));
      await tester.pumpAndSettle();
      expect(log, <String>['input 100', 'change 100']);

      // max 25, step 10: the highest value is 20.
      log.clear();
      await pumpSlider(tester, Owner(log: log, step: 10, value: 0, max: 25));
      await tabTo(tester);
      await key(tester, LogicalKeyboardKey.end);
      expect(log, <String>['input 20', 'change 20']);

      // Continuous: any value.
      log.clear();
      await pumpSlider(tester, Owner(log: log, value: 0, max: 1));
      await tester.tapAt(pointAt(tester, 0.37), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(log.first, startsWith('input 0.37'));
    });

    testWidgets('SLD-2: a pointer press moves the handle to the value under it at once, a drag '
        'follows it with input for each change, and the end emits change once', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, step: 10, value: 40));
      final TestGesture mouse = await tester.startGesture(
        pointAt(tester, 0.6),
        kind: PointerDeviceKind.mouse,
      );
      await tester.pump();
      expect(log, <String>['input 60']);
      await mouse.moveTo(pointAt(tester, 0.62));
      await tester.pump();
      expect(log, <String>['input 60'], reason: 'no change of value, no input');
      await mouse.moveTo(pointAt(tester, 0.8));
      await tester.pump();
      await mouse.moveTo(pointAt(tester, 0.9));
      await tester.pump();
      await mouse.up();
      await tester.pumpAndSettle();
      expect(log, <String>['input 60', 'input 80', 'input 90', 'change 90']);
      // A press that ends where it began: no change.
      log.clear();
      final TestGesture again = await tester.startGesture(
        pointAt(tester, 0.3),
        kind: PointerDeviceKind.mouse,
      );
      await again.moveTo(pointAt(tester, 0.9));
      await again.up();
      await tester.pumpAndSettle();
      expect(log, <String>['input 30', 'input 90']);
    });

    testWidgets('SLD-2: on touch the handle moves once the press travels along the track, or when '
        'a press that did not move ends', (WidgetTester tester) async {
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, step: 10, value: 40));
      await tester.tapAt(pointAt(tester, 0.7));
      await tester.pumpAndSettle();
      expect(log, <String>['input 70', 'change 70']);
      log.clear();
      final TestGesture finger = await tester.startGesture(pointAt(tester, 0.2));
      await tester.pump();
      expect(log, isEmpty, reason: 'touch waits for the slop');
      await finger.moveBy(const Offset(40, 0));
      await tester.pump();
      await finger.moveBy(const Offset(40, 0));
      await tester.pump();
      await finger.up();
      await tester.pumpAndSettle();
      expect(log.first, startsWith('input'));
      expect(log.last, startsWith('change'));
      expect(log.where((String e) => e.startsWith('change')), hasLength(1));
    });

    testWidgets('SLD-2: a touch press that first travels across the track is left to an enclosing '
        'scroll view and changes nothing', (WidgetTester tester) async {
      final Log log = <String>[];
      final ScrollController scroll = ScrollController();
      addTearDown(scroll.dispose);
      await pumpFixtureFrame(
        tester,
        system: system,
        surface: const Size(352, 300),
        child: SizedBox(
          height: 268,
          child: SingleChildScrollView(
            controller: scroll,
            child: Column(
              children: <Widget>[
                const SizedBox(height: 100),
                Owner(log: log, step: 10, value: 40),
                const SizedBox(height: 400),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.dragFrom(pointAt(tester, 0.7), const Offset(0, -80));
      await tester.pumpAndSettle();
      expect(log, isEmpty);
      expect(scroll.offset, greaterThan(0));
    });

    testWidgets(
      'SLD-2, SLD-5: a press moves the nearer handle of a range; where they meet, the one '
      'that can move toward the press',
      (WidgetTester tester) async {
        final Log log = <String>[];
        await pumpSlider(tester, Owner(log: log, range: true, start: 20, value: 60, step: 10));
        await tester.tapAt(pointAt(tester, 0.3), kind: PointerDeviceKind.mouse);
        await tester.pumpAndSettle();
        await tester.tapAt(pointAt(tester, 0.5), kind: PointerDeviceKind.mouse);
        await tester.pumpAndSettle();
        expect(log, <String>['input 30–60', 'change 30–60', 'input 30–50', 'change 30–50']);
        log.clear();
        await pumpSlider(tester, Owner(log: log, range: true, start: 50, value: 50, step: 10));
        await tester.tapAt(pointAt(tester, 0.8), kind: PointerDeviceKind.mouse);
        await tester.pumpAndSettle();
        await tester.tapAt(pointAt(tester, 0.1), kind: PointerDeviceKind.mouse);
        await tester.pumpAndSettle();
        expect(log, <String>['input 50–80', 'change 50–80', 'input 10–80', 'change 10–80']);
      },
    );

    testWidgets('SLD-3: arrows move one keyboard step, Page Up and Down ten, Home and End to the '
        'ends; each change emits input then change; a key that changes nothing emits nothing', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, value: 40, step: 5));
      await tabTo(tester);
      expect(focusedLabel(), 'Volume');
      await key(tester, LogicalKeyboardKey.arrowRight);
      await key(tester, LogicalKeyboardKey.arrowUp);
      await key(tester, LogicalKeyboardKey.arrowLeft);
      await key(tester, LogicalKeyboardKey.arrowDown);
      await key(tester, LogicalKeyboardKey.pageUp);
      await key(tester, LogicalKeyboardKey.pageDown);
      await key(tester, LogicalKeyboardKey.end);
      await key(tester, LogicalKeyboardKey.end);
      await key(tester, LogicalKeyboardKey.home);
      expect(log, <String>[
        'input 45', 'change 45', //
        'input 50', 'change 50',
        'input 45', 'change 45',
        'input 40', 'change 40',
        'input 90', 'change 90',
        'input 40', 'change 40',
        'input 100', 'change 100',
        'input 0', 'change 0',
      ]);
      // Continuous: one hundredth of the scale.
      log.clear();
      await pumpSlider(tester, Owner(log: log, value: 40, max: 200));
      await tabTo(tester);
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(log, <String>['input 42', 'change 42']);
    });

    testWidgets('SLD-4: assistive technology increments and decrements by one keyboard step, input '
        'then change', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, value: 40, step: 10));
      act(tester, 'Volume', SemanticsAction.increase);
      await tester.pumpAndSettle();
      act(tester, 'Volume', SemanticsAction.decrease);
      await tester.pumpAndSettle();
      act(tester, 'Volume', SemanticsAction.decrease);
      await tester.pumpAndSettle();
      expect(log, <String>[
        'input 50',
        'change 50',
        'input 40',
        'change 40',
        'input 30',
        'change 30',
      ]);
      handle.dispose();
    });

    testWidgets('SLD-5: a range has two handles that meet but never cross, each its own Tab stop '
        '(the start first) and its own element for assistive technology', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, range: true, start: 40, value: 50, step: 10));
      expect(nodeOf(tester, 'Minimum').value, '40');
      expect(nodeOf(tester, 'Volume').value, '50');
      await tabTo(tester);
      expect(focusedLabel(), 'Minimum');
      await key(tester, LogicalKeyboardKey.arrowRight);
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(log, <String>['input 50–50', 'change 50–50'], reason: 'the start stops at the end');
      await key(tester, LogicalKeyboardKey.end);
      expect(log, hasLength(2), reason: 'the start handle cannot pass the end one');
      await key(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'Volume');
      await key(tester, LogicalKeyboardKey.home);
      expect(log, hasLength(2), reason: 'the end handle is already at the start one');
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(log.last, 'change 50–60');
      // A drag of the start handle past the end stops at it.
      log.clear();
      final TestGesture mouse = await tester.startGesture(
        pointAt(tester, 0.5),
        kind: PointerDeviceKind.mouse,
      );
      await mouse.moveTo(pointAt(tester, 0.9));
      await mouse.up();
      await tester.pumpAndSettle();
      expect(log, <String>['input 60–60', 'change 60–60'], reason: 'the start stops at the end');
      handle.dispose();
    });
  });

  group('drawing', () {
    testWidgets('SLD-6: the active track runs from the origin to the value, on either side; a '
        'range between its handles', (WidgetTester tester) async {
      Future<(Color, Color, Color)> sample(Widget owner, List<double> at) async {
        final GlobalKey key = await pumpSlider(tester, owner);
        final FramePixels pixels = await captureFrame(tester, key);
        final List<Color> colors = <Color>[
          for (final double f in at) pixels.atLogical(pointAt(tester, f)),
        ];
        return (colors[0], colors[1], colors[2]);
      }

      final Color track = over(standard.enabled.trackColor);
      final Color active = over(standard.enabled.activeTrackColor);
      // Centered, value to the right of the origin.
      (Color, Color, Color) c = await sample(
        const Owner(log: <String>[], min: -50, max: 50, origin: 0, value: 20),
        <double>[0.3, 0.6, 0.9],
      );
      expect(c.$1, looksLike(track));
      expect(c.$2, looksLike(active));
      expect(c.$3, looksLike(track));
      // Centered, value to the left.
      c = await sample(
        const Owner(log: <String>[], min: -50, max: 50, origin: 0, value: -30),
        <double>[0.1, 0.35, 0.7],
      );
      expect(c.$1, looksLike(track));
      expect(c.$2, looksLike(active));
      expect(c.$3, looksLike(track));
      // No origin: from min.
      c = await sample(const Owner(log: <String>[], value: 50), <double>[0.1, 0.3, 0.8]);
      expect(c.$1, looksLike(active));
      expect(c.$2, looksLike(active));
      expect(c.$3, looksLike(track));
      // A range: between its handles.
      c = await sample(const Owner(log: <String>[], range: true, start: 30, value: 70), <double>[
        0.15,
        0.5,
        0.85,
      ]);
      expect(c.$1, looksLike(track));
      expect(c.$2, looksLike(active));
      expect(c.$3, looksLike(track));
    });

    testWidgets('SLD-7: the slider is as long as its layout gives it and as thick as the larger of '
        'the container and the handle; the hit area reaches the touch target across it', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, step: 10, value: 0));
      final Rect rect = sliderRect(tester);
      expect(rect.width, horizontalLength);
      final double across = sliderTokens.containerSize > sliderTokens.sizes.small.handleHeight
          ? sliderTokens.containerSize
          : sliderTokens.sizes.small.handleHeight;
      expect(rect.height, across);
      final double grow = (system.measure.targetTouch - across) / 2;
      // Inside the grown hit area.
      await tester.tapAt(Offset(pointAt(tester, 0.5).dx, rect.top - grow + 1));
      await tester.pumpAndSettle();
      expect(log, <String>['input 50', 'change 50']);
      // Outside it.
      await tester.tapAt(Offset(pointAt(tester, 0.8).dx, rect.top - grow - 1));
      await tester.pumpAndSettle();
      expect(log, hasLength(2));
      // At min the handle's center is half the thickness in from the track's start (inset by half
      // the container).
      final Offset min = pointAt(tester, 0);
      expect(
        min.dx - rect.left,
        sliderTokens.containerSize / 2 + sliderTokens.sizes.small.trackThickness / 2,
      );
    });

    testWidgets('SLD-8: the handle is drawn centered on the track, handle.width along and '
        'handle.height across, in the handle color; a track gap leaves empty track beside it', (
      WidgetTester tester,
    ) async {
      GlobalKey key = await pumpSlider(tester, const Owner(log: <String>[], value: 50));
      FramePixels pixels = await captureFrame(tester, key);
      final Offset c = pointAt(tester, 0.5);
      final double half = standard.enabled.handleWidth / 2;
      final Color handle = over(standard.enabled.handleColor);
      expect(pixels.atLogical(c), looksLike(handle));
      expect(pixels.atLogical(c + Offset(0, -half + 1)), looksLike(handle));
      expect(pixels.atLogical(c + Offset(0, -half - 1.5)), isNot(looksLike(handle)));

      // A narrow bar handle with a gap (a modified system).
      final TanreiSystem bar = system.copyWith(
        slider: sliderTokens.copyWith(
          trackGap: 6,
          handleShape: 2,
          conditions: sliderTokens.conditions.copyWith(
            standard: standard.copyWith(
              enabled: standard.enabled.copyWith(
                handleWidth: 4,
                handleColor: const TanreiPaint.role(TanreiColorRole.error),
              ),
            ),
          ),
        ),
      );
      key = await pumpSlider(tester, const Owner(log: <String>[], value: 50), system: bar);
      pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(c), looksLike(light.error));
      expect(pixels.atLogical(c + const Offset(0, -9)), looksLike(light.error));
      // Beyond the bar (2) and within the gap (6): no track.
      expect(pixels.atLogical(c + const Offset(-5, 0)), looksLike(light.surface));
      expect(pixels.atLogical(c + const Offset(5, 0)), looksLike(light.surface));
      expect(
        pixels.atLogical(c + const Offset(12, 0)),
        looksLike(over(standard.enabled.trackColor)),
      );
    });

    testWidgets('SLD-9: a dot at an end of the travel on the track, and at every step while stops; '
        'colored by the part it lies on; none under a handle; none at size 0', (
      WidgetTester tester,
    ) async {
      GlobalKey key = await pumpSlider(tester, const Owner(log: <String>[], value: 40));
      FramePixels pixels = await captureFrame(tester, key);
      final Color stop = standard.enabled.stopIndicatorColor == const TanreiPaint.none()
          ? light.surface
          : over(standard.enabled.stopIndicatorColor);
      expect(pixels.atLogical(pointAt(tester, 1)), looksLike(stop), reason: 'the end on the track');
      expect(
        pixels.atLogical(pointAt(tester, 0)),
        looksLike(over(standard.enabled.activeTrackColor)),
        reason: 'no dot at the start, on the active track',
      );

      key = await pumpSlider(
        tester,
        const Owner(log: <String>[], value: 30, step: 10, showStops: true),
      );
      pixels = await captureFrame(tester, key);
      expect(
        pixels.atLogical(pointAt(tester, 0.1)),
        looksLike(over(standard.enabled.activeStopIndicatorColor)),
      );
      expect(pixels.atLogical(pointAt(tester, 0.6)), looksLike(stop));
      expect(pixels.atLogical(pointAt(tester, 0.3)), looksLike(over(standard.enabled.handleColor)));

      final TanreiSystem none = system.copyWith(
        slider: sliderTokens.copyWith(stopIndicatorSize: 0),
      );
      key = await pumpSlider(
        tester,
        const Owner(log: <String>[], value: 30, step: 10, showStops: true),
        system: none,
      );
      pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(pointAt(tester, 0.6)), looksLike(over(standard.enabled.trackColor)));
    });

    testWidgets('SLD-10: each handle has a round state layer of container.size, invisible at rest, '
        'in the state\'s container color; a size of 0 draws none', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      GlobalKey key = await pumpSlider(tester, const Owner(log: <String>[], value: 50));
      final Offset ring = pointAt(tester, 0.5) + const Offset(0, -15);
      FramePixels pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(ring), looksLike(light.surface));
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: pointAt(tester, 0.5));
      addTearDown(mouse.removePointer);
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(ring), looksLike(over(standard.hovered.containerColor)));

      final TanreiSystem none = system.copyWith(slider: sliderTokens.copyWith(containerSize: 0));
      key = await pumpSlider(tester, const Owner(log: <String>[], value: 50), system: none);
      await mouse.moveTo(pointAt(tester, 0.5));
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(
        pixels.atLogical(pointAt(tester, 0.5, system: none) + const Offset(0, -15)),
        looksLike(light.surface),
      );
    });

    testWidgets('SLD-11: under the acme system a handle draws its highest-precedence state '
        '(pressed over focused over hovered), and the tracks take the state of any handle; the '
        'change is animated, and focus from a pointer is not focused', (WidgetTester tester) async {
      // The acme system's glow would reach the state layer's edge: a ring keeps the layer visible.
      final TanreiSystem acmeSystem = fixtures.acmeSystem.copyWith(
        behavior: fixtures.acmeSystem.behavior.copyWith(focusStyle: TanreiFocusStyle.ring),
      );
      final TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiSliderConditionTokens tokens = acmeSystem.slider.conditions.standard;
      final Log log = <String>[];
      final GlobalKey key = await pumpSlider(
        tester,
        Owner(log: log, range: true, start: 20, value: 80),
        system: acmeSystem,
      );
      Color ringOf(FramePixels p, double f) =>
          p.atLogical(pointAt(tester, f, system: acmeSystem) + const Offset(0, -15));
      Color expected(TanreiPaint paint) => over(paint, theme: acme);

      // Keyboard focus on the start handle.
      await tabTo(tester);
      FramePixels pixels = await captureFrame(tester, key);
      expect(ringOf(pixels, 0.2), looksLike(expected(tokens.focused.containerColor)));
      expect(ringOf(pixels, 0.8), looksLike(expected(tokens.enabled.containerColor)));
      // Hovering the start handle too: focused wins.
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: pointAt(tester, 0.2, system: acmeSystem));
      addTearDown(mouse.removePointer);
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(ringOf(pixels, 0.2), looksLike(expected(tokens.focused.containerColor)));
      // Hovering the end handle: the end is hovered, the start stays focused.
      await mouse.moveTo(pointAt(tester, 0.8, system: acmeSystem));
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(ringOf(pixels, 0.8), looksLike(expected(tokens.hovered.containerColor)));
      expect(ringOf(pixels, 0.2), looksLike(expected(tokens.focused.containerColor)));
      // Pressing the end: pressed.
      await mouse.down(pointAt(tester, 0.8, system: acmeSystem));
      await tester.pump();
      pixels = await captureFrame(tester, key);
      expect(ringOf(pixels, 0.8), looksLike(expected(tokens.pressed.containerColor)));
      await mouse.up();
      await tester.pumpAndSettle();
      // Focus moved by the pointer (to the end handle) draws no focused state.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(ringOf(pixels, 0.8), looksLike(expected(tokens.enabled.containerColor)));
    });

    testWidgets('SLD-11: a change of state eases over motion.state-duration, and at once where '
        'motion is reduced', (WidgetTester tester) async {
      for (final bool reduced in <bool>[false, true]) {
        final GlobalKey key = await pumpSlider(
          tester,
          const Owner(log: <String>[], value: 50),
          disableAnimations: reduced,
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await tester.pump();
        await mouse.moveTo(pointAt(tester, 0.5));
        await tester.pump();
        await tester.pump(Duration(milliseconds: sliderTokens.motionStateDuration ~/ 3));
        final FramePixels mid = await captureFrame(tester, key);
        final Color ring = mid.atLogical(pointAt(tester, 0.5) + const Offset(0, -15));
        final Color hovered = over(standard.hovered.containerColor);
        if (reduced) {
          expect(ring, looksLike(hovered));
        } else {
          expect(ring, isNot(looksLike(hovered)));
          expect(ring, isNot(looksLike(light.surface)));
        }
        await tester.pumpAndSettle();
        await mouse.removePointer();
      }
    });

    testWidgets('SLD-12: keyboard focus shows the focus ring around the handle, without animation; '
        'pointer focus does not', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, value: 50, step: 10));
      bool ringShown() => tester
          .widgetList<TanreiFocusRing>(find.byType(TanreiFocusRing))
          .any((TanreiFocusRing r) => r.visible);
      expect(ringShown(), isFalse);
      // A pointer press gives the handle focus without the ring.
      await tester.tapAt(pointAt(tester, 0.5), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Volume');
      expect(ringShown(), isFalse);
      // Using the keyboard shows it.
      await key(tester, LogicalKeyboardKey.arrowRight);
      expect(ringShown(), isTrue);
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      expect(ringShown(), isFalse);
      await tabTo(tester);
      expect(ringShown(), isTrue);
      final TanreiFocusRing ring = tester
          .widgetList<TanreiFocusRing>(find.byType(TanreiFocusRing))
          .firstWhere((TanreiFocusRing r) => r.visible);
      expect(ring.borderRadius, BorderRadius.circular(standard.enabled.handleWidth / 2));
    });

    testWidgets('SLD-13: a press shows the pressed state at once, for the whole press and at least '
        'the press-hold', (WidgetTester tester) async {
      final GlobalKey key = await pumpSlider(tester, const Owner(log: <String>[], value: 50));
      final Offset ring = pointAt(tester, 0.5) + const Offset(0, -15);
      final Color pressed = over(standard.pressed.containerColor);
      final TestGesture finger = await tester.startGesture(pointAt(tester, 0.5));
      await tester.pump();
      expect((await captureFrame(tester, key)).atLogical(ring), looksLike(pressed));
      await tester.pump(const Duration(seconds: 1));
      expect((await captureFrame(tester, key)).atLogical(ring), looksLike(pressed));
      await finger.up();
      await tester.pump();
      await tester.pumpAndSettle();
      // A short press: still visible within the press-hold.
      final TestGesture quick = await tester.startGesture(pointAt(tester, 0.5));
      await tester.pump();
      await quick.up();
      await tester.pump(Duration(milliseconds: system.motion.duration.pressHold ~/ 2));
      expect((await captureFrame(tester, key)).atLogical(ring), looksLike(pressed));
      await tester.pumpAndSettle();
      expect((await captureFrame(tester, key)).atLogical(ring), looksLike(light.surface));
    });

    testWidgets('SLD-14: a press is answered as pressedFeedback names: none keeps the state under '
        'the press, overlay draws the pressed container, ripple grows it from the handle', (
      WidgetTester tester,
    ) async {
      Future<Color> pressedRing(TanreiPressedFeedback feedback) async {
        final TanreiSystem s = system.copyWith(
          behavior: system.behavior.copyWith(pressedFeedback: feedback),
        );
        final GlobalKey key = await pumpSlider(
          tester,
          const Owner(log: <String>[], value: 50),
          system: s,
        );
        final TestGesture finger = await tester.startGesture(pointAt(tester, 0.5));
        await tester.pumpAndSettle();
        final Color c = (await captureFrame(
          tester,
          key,
        )).atLogical(pointAt(tester, 0.5) + const Offset(0, -15));
        await finger.up();
        await tester.pumpAndSettle();
        return c;
      }

      expect(await pressedRing(TanreiPressedFeedback.none), looksLike(light.surface));
      expect(
        await pressedRing(TanreiPressedFeedback.overlay),
        looksLike(over(standard.pressed.containerColor)),
      );
      expect(
        await pressedRing(TanreiPressedFeedback.ripple),
        looksLike(over(standard.pressed.containerColor)),
      );
      expect(await pressedRing(TanreiPressedFeedback.dim), looksLike(light.surface));
    });

    testWidgets('SLD-15: the handle\'s corners are eased by corner smoothing, and the focus style '
        'is the system\'s', (WidgetTester tester) async {
      TanreiSystem square(double smoothing) => system.copyWith(
        shape: system.shape.copyWith(cornerSmoothing: smoothing),
        slider: sliderTokens.copyWith(handleShape: 8),
      );
      Future<FramePixels> corner(double smoothing) async {
        final GlobalKey key = await pumpSlider(
          tester,
          const Owner(log: <String>[], value: 50),
          system: square(smoothing),
        );
        return captureFrame(tester, key);
      }

      expect(await corner(0), isNot(await corner(1)));
      // The focus ring is the shared primitive, which draws the system's ring or glow.
      await pumpSlider(
        tester,
        const Owner(log: <String>[], value: 50),
        system: system.copyWith(
          behavior: system.behavior.copyWith(focusStyle: TanreiFocusStyle.glow),
        ),
      );
      await tabTo(tester);
      expect(
        tester.widgetList<TanreiFocusRing>(find.byType(TanreiFocusRing)).where((r) => r.visible),
        hasLength(1),
      );
    });

    testWidgets('SLD-16: a key moves the handle over the value motion, a drag follows at once, a '
        'value the product sets moves without emitting, and reduced motion shows it at once', (
      WidgetTester tester,
    ) async {
      final Log log = <String>[];
      final GlobalKey key = await pumpSlider(tester, Owner(log: log, value: 0, step: 50));
      final Color handle = over(standard.enabled.handleColor);
      await tabTo(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();
      await tester.pump(Duration(milliseconds: sliderTokens.motionValueDuration ~/ 4));
      FramePixels pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(pointAt(tester, 0.5)), isNot(looksLike(handle)), reason: 'moving');
      await tester.pumpAndSettle();
      pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(pointAt(tester, 0.5)), looksLike(handle));
      // A drag follows without delay.
      final TestGesture mouse = await tester.startGesture(
        pointAt(tester, 0.5),
        kind: PointerDeviceKind.mouse,
      );
      await tester.pumpAndSettle();
      await mouse.moveTo(pointAt(tester, 1));
      await tester.pump();
      pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(pointAt(tester, 1)), looksLike(handle));
      await mouse.up();
      await tester.pumpAndSettle();
      // The product sets a value: no events.
      log.clear();
      await pumpSlider(tester, Owner(log: log, value: 0, step: 50));
      expect(log, isEmpty);
      // Reduced motion: at once.
      final GlobalKey reduced = await pumpSlider(
        tester,
        Owner(log: log, value: 0, step: 50),
        disableAnimations: true,
      );
      await tabTo(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();
      pixels = await captureFrame(tester, reduced);
      expect(pixels.atLogical(pointAt(tester, 0.5)), looksLike(handle));
    });

    testWidgets('SLD-17: the value indicator shows always, or while the handle is pressed or '
        'focused; above the handle, inside the window, fading, hidden from assistive technology', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpSlider(
        tester,
        const Owner(log: <String>[], value: 40, valueIndicator: TanreiSliderValueIndicator.always),
      );
      final Finder text = find.text('40');
      expect(text, findsOneWidget);
      final Rect label = tester.getRect(text);
      final Offset c = pointAt(tester, 0.4);
      expect(label.center.dx, moreOrLessEquals(c.dx, epsilon: 0.5));
      final double handleTop = c.dy - sliderTokens.sizes.small.handleHeight / 2;
      final Rect container = tester.getRect(
        find.ancestor(of: text, matching: find.byType(DecoratedBox)).first,
      );
      expect(handleTop - container.bottom, moreOrLessEquals(sliderTokens.valueIndicatorOffset));
      expect(container.height, greaterThanOrEqualTo(sliderTokens.valueIndicatorContainerHeight));
      expect(container.width, greaterThanOrEqualTo(container.height));
      expect(find.bySemanticsLabel('40'), findsNothing);
      expect(nodeOf(tester, 'Volume').value, '40');

      // Near the window's edge: moved inside it.
      await pumpSlider(
        tester,
        const Owner(
          log: <String>[],
          value: 0,
          valueText: 'A long value text',
          valueIndicator: TanreiSliderValueIndicator.always,
        ),
      );
      expect(tester.getRect(find.text('A long value text')).left, greaterThanOrEqualTo(0));

      // Active: none at rest, shown on keyboard focus, fading in.
      await pumpSlider(
        tester,
        const Owner(log: <String>[], value: 40, valueIndicator: TanreiSliderValueIndicator.active),
      );
      expect(find.text('40'), findsNothing);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.pump(Duration(milliseconds: sliderTokens.motionStateDuration ~/ 2));
      final Opacity fading = tester.widget<Opacity>(
        find.ancestor(of: find.text('40'), matching: find.byType(Opacity)).first,
      );
      expect(fading.opacity, inExclusiveRange(0, 1));
      await tester.pumpAndSettle();
      expect(find.text('40'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('SLD-17: with an Overlay the value indicator is drawn in it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          Overlay.wrap(
            child: const Center(
              child: Owner(
                log: <String>[],
                value: 40,
                valueIndicator: TanreiSliderValueIndicator.always,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('40'), findsOneWidget);
      // In the overlay's render tree, not under the slider's.
      final RenderObject slider = tester.renderObject(find.byType(TanreiSlider));
      RenderObject? node = tester.renderObject(find.text('40'));
      bool underSlider = false;
      while (node != null) {
        underSlider = underSlider || identical(node, slider);
        node = node.parent;
      }
      expect(underSlider, isFalse);
    });

    testWidgets('SLD-18: the value text is valueText, else the number with the keyboard step\'s '
        'fraction digits, at most two', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpSlider(tester, const Owner(log: <String>[], value: 40, valueText: '40 %'));
      expect(nodeOf(tester, 'Volume').value, '40 %');
      await pumpSlider(tester, const Owner(log: <String>[], value: 2.5, max: 10, step: 0.5));
      expect(nodeOf(tester, 'Volume').value, '2.5');
      await pumpSlider(tester, const Owner(log: <String>[], value: 0.4, max: 1));
      expect(nodeOf(tester, 'Volume').value, '0.40');
      await pumpSlider(tester, const Owner(log: <String>[], value: 0.25, max: 1, step: 0.001));
      expect(nodeOf(tester, 'Volume').value, '0.25');
      handle.dispose();
    });
  });

  group('accessibility', () {
    testWidgets('SLD-19: each handle is a slider node named by its label with its value, the '
        'increased and decreased values and its enabled state; nothing else is exposed', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await pumpSlider(
        tester,
        const Owner(log: <String>[], range: true, start: 20, value: 60, step: 10),
      );
      for (final (String label, String value, String up, String down)
          in <(String, String, String, String)>[
            ('Minimum', '20', '30', '10'),
            ('Volume', '60', '70', '50'),
          ]) {
        final SemanticsData data = nodeOf(tester, label).getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.isSlider), isTrue, reason: label);
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isTrue);
        expect(data.hasFlag(SemanticsFlag.isFocusable), isTrue);
        expect(data.value, value);
        expect(data.increasedValue, up);
        expect(data.decreasedValue, down);
        expect(data.hasAction(SemanticsAction.increase), isTrue);
        expect(data.hasAction(SemanticsAction.decrease), isTrue);
      }
      // The start handle's highest value is the end handle's.
      await pumpSlider(
        tester,
        const Owner(log: <String>[], range: true, start: 60, value: 60, step: 10),
      );
      expect(nodeOf(tester, 'Minimum').getSemanticsData().increasedValue, '60');
      handle.dispose();
    });

    testWidgets('SLD-19: an empty label, or a range without a start label, still renders and is '
        'reported in debug builds', (WidgetTester tester) async {
      final List<String> missing = collectMissingNames();
      await pumpSlider(tester, const Owner(log: <String>[], label: ''));
      expect(missing, <String>['slider']);
      expect(find.byType(TanreiSlider), findsOneWidget);
      missing.clear();
      await pumpSlider(tester, const Owner(log: <String>[], range: true, startLabel: ''));
      expect(missing, <String>['slider start handle']);
    });

    testWidgets('SLD-20: a disabled slider changes nothing, emits nothing, takes no focus, shows '
        'no value indicator, is exposed as disabled and draws the disabled tokens', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Log log = <String>[];
      final GlobalKey key = await pumpSlider(
        tester,
        Owner(
          log: log,
          value: 40,
          enabled: false,
          valueIndicator: TanreiSliderValueIndicator.always,
        ),
      );
      await tester.tapAt(pointAt(tester, 0.8));
      await tester.tapAt(pointAt(tester, 0.8), kind: PointerDeviceKind.mouse);
      await tabTo(tester);
      await tester.pumpAndSettle();
      expect(log, isEmpty);
      expect(focusedLabel(), '');
      expect(find.text('40'), findsNothing);
      final SemanticsData data = nodeOf(tester, 'Volume').getSemanticsData();
      expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(data.hasAction(SemanticsAction.increase), isFalse);
      final FramePixels pixels = await captureFrame(tester, key);
      expect(
        pixels.atLogical(pointAt(tester, 0.4)),
        looksLike(over(standard.disabled.handleColor)),
      );
      expect(pixels.atLogical(pointAt(tester, 0.7)), looksLike(over(standard.disabled.trackColor)));
      expect(
        pixels.atLogical(pointAt(tester, 0.2)),
        looksLike(over(standard.disabled.activeTrackColor)),
      );
      handle.dispose();
    });

    testWidgets('guidelines: slider', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final bool range in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(
            SizedBox(
              width: 320,
              child: Owner(log: <String>[], range: range, value: 60),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
      }
      handle.dispose();
    });
  });

  group('orientation, direction and unknown values', () {
    testWidgets(
      'SLD-21: a vertical slider runs from the bottom (min) to the top; Up Arrow increases '
      'it; right to left a horizontal slider runs from the right and its arrows swap; a vertical '
      'one is not mirrored',
      (WidgetTester tester) async {
        final Color handle = over(standard.enabled.handleColor);
        final Log log = <String>[];
        GlobalKey key = await pumpSlider(
          tester,
          Owner(log: log, value: 25, step: 25, orientation: Axis.vertical),
          vertical: true,
        );
        final Rect rect = sliderRect(tester);
        expect(rect.height, verticalLength);
        FramePixels pixels = await captureFrame(tester, key);
        expect(pixels.atLogical(pointAt(tester, 0.25, vertical: true)), looksLike(handle));
        expect(pointAt(tester, 0.25, vertical: true).dy, greaterThan(rect.center.dy));
        await tabTo(tester);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pumpAndSettle();
        expect(log, <String>['input 50', 'change 50']);

        log.clear();
        key = await pumpSlider(
          tester,
          Owner(log: log, value: 25, step: 25),
          textDirection: TextDirection.rtl,
        );
        pixels = await captureFrame(tester, key);
        expect(pixels.atLogical(pointAt(tester, 0.25, rtl: true)), looksLike(handle));
        expect(pointAt(tester, 0.25, rtl: true).dx, greaterThan(sliderRect(tester).center.dx));
        await tabTo(tester);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pumpAndSettle();
        expect(log, <String>['input 50', 'change 50', 'input 75', 'change 75']);
        await tester.tapAt(pointAt(tester, 1, rtl: true), kind: PointerDeviceKind.mouse);
        await tester.pumpAndSettle();
        expect(log.last, 'change 100');

        key = await pumpSlider(
          tester,
          const Owner(log: <String>[], value: 25, step: 25, orientation: Axis.vertical),
          textDirection: TextDirection.rtl,
          vertical: true,
        );
        pixels = await captureFrame(tester, key);
        expect(pixels.atLogical(pointAt(tester, 0.25, vertical: true)), looksLike(handle));
      },
    );

    testWidgets('SLD-22: values outside the scale or off a step are drawn clamped and snapped '
        'without events; a start above the end is drawn at the end; max not above min draws the '
        'handles at the start and takes no input; a negative step is 0; each is reported', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectIgnored();
      final Log log = <String>[];
      await pumpSlider(tester, Owner(log: log, value: 140));
      expect(nodeOf(tester, 'Volume').value, '100');
      expect(reports, <String>['slider value']);
      reports.clear();
      await pumpSlider(tester, Owner(log: log, value: 33, step: 10));
      expect(nodeOf(tester, 'Volume').value, '30');
      expect(reports, <String>['slider value']);
      reports.clear();
      await pumpSlider(tester, Owner(log: log, range: true, start: 70, value: 40));
      expect(nodeOf(tester, 'Minimum').value, '40');
      expect(nodeOf(tester, 'Volume').value, '40');
      expect(reports, <String>['slider start']);
      reports.clear();
      await pumpSlider(tester, Owner(log: log, min: -50, max: 50, origin: 80, value: 0));
      expect(reports, <String>['slider origin']);
      reports.clear();
      await pumpSlider(tester, Owner(log: log, value: 40, step: -5));
      expect(reports, <String>['slider step']);
      reports.clear();
      final GlobalKey key = await pumpSlider(tester, Owner(log: log, min: 10, max: 10, value: 10));
      expect(reports, <String>['slider max']);
      await tester.tapAt(pointAt(tester, 0.5), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      final FramePixels pixels = await captureFrame(tester, key);
      expect(pixels.atLogical(pointAt(tester, 0)), looksLike(over(standard.enabled.handleColor)));
      expect(log, isEmpty);
      handle.dispose();
    });

    testWidgets('SLD-23: a size the system does not have renders as small, pixel for pixel, and '
        'debug builds report it', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      Widget slider(TanreiSliderSize size) => SizedBox(
        width: horizontalLength,
        child: TanreiSlider(value: 40, onChanged: (_) {}, size: size, semanticLabel: 'Volume'),
      );
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        surface: horizontalSurface,
        child: slider(const TanreiSliderSize('huge')),
      );
      expect(reports, contains('slider size "huge" -> small'));
      final FramePixels small = await framePixels(
        tester,
        system: system,
        surface: horizontalSurface,
        child: slider(TanreiSliderSize.small),
      );
      expect(unknown, small);
    });

    test('SLD-23: an orientation or valueIndicator name the slider does not define is the default, '
        'reported; every defined name is read as that value', () {
      final List<String> reports = collectUnknownValues();
      expect(TanreiSlider.orientationFromName('horizontal'), Axis.horizontal);
      expect(TanreiSlider.orientationFromName('vertical'), Axis.vertical);
      for (final TanreiSliderValueIndicator v in TanreiSliderValueIndicator.values) {
        expect(TanreiSliderValueIndicator.fromName(v.name), v);
      }
      expect(reports, isEmpty);
      expect(TanreiSlider.orientationFromName('diagonal'), Axis.horizontal);
      expect(TanreiSliderValueIndicator.fromName('hover'), TanreiSliderValueIndicator.none);
      expect(reports, <String>[
        'slider orientation "diagonal" -> horizontal',
        'slider valueIndicator "hover" -> none',
      ]);
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(sliderTokens.sizes.small.trackThickness, 4);
      expect(sliderTokens.sizes.medium.trackThickness, 6);
      expect(sliderTokens.sizes.large.trackThickness, 8);
      expect(sliderTokens.sizes.small.handleHeight, 20);
      expect(standard.enabled.handleWidth, 20);
      expect(sliderTokens.containerSize, 32);
      expect(sliderTokens.stopIndicatorSize, system.space.space50);
      expect(sliderTokens.valueIndicatorOffset, system.space.space100);
      expect(lightTheme.paint(standard.enabled.handleColor), light.primary);
      expect(lightTheme.paint(standard.enabled.trackColor), light.surfaceVariant);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the slider draws that system\'s handle and tracks', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiSliderConditionTokens tokens = shipped.slider.conditions.standard;
        final GlobalKey key = await pumpSlider(
          tester,
          const Owner(log: <String>[], value: 50),
          system: shipped,
        );
        final double across = shipped.slider.containerSize > shipped.slider.sizes.small.handleHeight
            ? shipped.slider.containerSize
            : shipped.slider.sizes.small.handleHeight;
        expect(sliderRect(tester).height, across);
        final FramePixels pixels = await captureFrame(tester, key);
        expect(
          pixels.atLogical(pointAt(tester, 0.5, system: shipped)),
          looksLike(over(tokens.enabled.handleColor, theme: theme)),
        );
        expect(
          pixels.atLogical(pointAt(tester, 0.9, system: shipped)),
          looksLike(over(tokens.enabled.trackColor, theme: theme)),
        );
        expect(
          pixels.atLogical(pointAt(tester, 0.15, system: shipped)),
          looksLike(over(tokens.enabled.activeTrackColor, theme: theme)),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('slider');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'continuous',
        'discrete-stops',
        'range',
        'centered',
        'value-indicator',
        'medium',
        'large',
        'vertical',
        'disabled',
        'disabled-stops',
      ]);
    });

    bool isVertical(Map<String, dynamic> f) =>
        (f['props'] as Map<String, dynamic>)['orientation'] == 'vertical';

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: isVertical(fixture) ? verticalSurface : horizontalSurface,
          child: fixtureSlider(fixture),
          file: 'goldens/slider/$id.png',
          settle: true,
        );
      });
    }

    // One representative fixture per shipped preset: the stops show the preset's
    // track, active track, handle and dots together.
    const String recorded = 'discrete-stops';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: horizontalSurface,
          child: fixtureSlider(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/slider/${preset.id}/$recorded.png',
          settle: true,
        );
      });
    }
  });
}
