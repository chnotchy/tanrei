import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiProgressIndicatorTokens tokens = system.progressIndicator;
const TanreiThemeData lightTheme = TanreiThemeData.light;
final Color track = lightTheme.paint(tokens.trackColor);
final Color indicator = lightTheme.paint(tokens.indicatorColor);
final Duration cycle = tanreiDuration(tokens.motionCycleDuration);
final Curve linear = system.motion.easing.linear.toCurve();
const double top = -math.pi / 2;
const double turn = math.pi * 2;

/// The progress indicator of a spec fixture's [props].
TanreiProgressIndicator progressOf(Map<String, dynamic> props) => TanreiProgressIndicator(
  variant: TanreiProgressIndicatorVariant.fromName(props['variant'] as String? ?? 'linear'),
  size: TanreiProgressIndicatorSize(props['size'] as String? ?? 'medium'),
  value: (props['value'] as num?)?.toDouble(),
  min: (props['min'] as num? ?? 0).toDouble(),
  max: (props['max'] as num? ?? 1).toDouble(),
  semanticsLabel: props['label'] as String? ?? '',
  semanticsValue: props['valueText'] as String? ?? '',
);

/// A bar [width] wide.
Widget bar({
  double? value,
  double min = 0,
  double max = 1,
  double width = 200,
  TanreiProgressIndicatorSize size = TanreiProgressIndicatorSize.medium,
  String label = 'Uploading',
  String valueText = '',
}) => SizedBox(
  width: width,
  child: TanreiProgressIndicator(
    value: value,
    min: min,
    max: max,
    size: size,
    semanticsLabel: label,
    semanticsValue: valueText,
  ),
);

Widget ring({
  double? value,
  TanreiProgressIndicatorSize size = TanreiProgressIndicatorSize.medium,
  String label = 'Uploading',
}) => TanreiProgressIndicator(
  variant: TanreiProgressIndicatorVariant.circular,
  value: value,
  size: size,
  semanticsLabel: label,
);

Finder get subject => find.byType(TanreiProgressIndicator);

/// The bar's segment from [from] to [to] (logical, from the left), [thickness] high.
RRect barRRect(double from, double to, {double? thickness, double? shape}) {
  final double height = thickness ?? tokens.sizes.medium.linearThickness;
  return RRect.fromRectAndRadius(
    Rect.fromLTRB(from, 0, to, height),
    Radius.circular(math.min(shape ?? tokens.trackShape, height / 2)),
  );
}

/// The ring's circle for [size].
Rect ringRect(TanreiProgressIndicatorSizeTokens size) {
  final double stroke = size.circularThickness;
  return Rect.fromCircle(
    center: Offset(size.circularSize / 2, size.circularSize / 2),
    radius: (size.circularSize - stroke) / 2,
  );
}

double pulse(Curve curve, double t) => tanreiPulseOpacity(curve, t);

void main() {
  group('determinate', () {
    testWidgets('PRG-1: a bar covers (value − min) / (max − min) of the track from its start', (
      WidgetTester tester,
    ) async {
      for (final (double value, double min, double max) in <(double, double, double)>[
        (0.4, 0, 1),
        (3, 0, 10),
        (75, 50, 150),
      ]) {
        await tester.pumpWidget(tanreiTestApp(bar(value: value, min: min, max: max)));
        // A new value eases in (PRG-6): read the settled drawing.
        await tester.pumpAndSettle();
        final double end = 200 * (value - min) / (max - min);
        expect(
          subject,
          paints
            ..rrect(rrect: barRRect(0, 200), color: track)
            ..rrect(rrect: barRRect(0, end), color: indicator),
          reason: '$value in $min…$max',
        );
      }
    });

    testWidgets('PRG-1: a ring covers the fraction from the top, clockwise', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(ring(value: 0.4)));
      final Rect circle = ringRect(tokens.sizes.medium);
      expect(
        subject,
        paints
          ..arc(rect: circle, startAngle: top, sweepAngle: turn, color: track)
          ..arc(rect: circle, startAngle: top, sweepAngle: turn * 0.4, color: indicator),
      );
    });

    testWidgets('PRG-3: a bar is linear.thickness high across the width its layout gives it; a '
        'ring fills circular.size with a stroke of circular.thickness, for every size', (
      WidgetTester tester,
    ) async {
      for (final TanreiProgressIndicatorSize size in TanreiProgressIndicatorSize.core) {
        final TanreiProgressIndicatorSizeTokens t = tokens.sizes[size];
        await tester.pumpWidget(tanreiTestApp(bar(value: 0.5, size: size, width: 300)));
        expect(tester.getSize(subject), Size(300, t.linearThickness), reason: size.name);
        await tester.pumpWidget(tanreiTestApp(ring(value: 0.5, size: size)));
        expect(tester.getSize(subject), Size.square(t.circularSize), reason: size.name);
        expect(
          subject,
          paints..arc(rect: ringRect(t), strokeWidth: t.circularThickness),
          reason: size.name,
        );
      }
    });

    testWidgets('PRG-3: a bar given no width (in a Row) is as short as its constraints allow', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          const Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[TanreiProgressIndicator(value: 0.5, semanticsLabel: 'x')],
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(tester.getSize(subject).width, 0);
    });

    testWidgets('PRG-4: a bar\'s ends are rounded by track.shape, clamped to half the thickness; '
        'a ring has round caps unless the shape is none', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5)));
      expect(
        subject,
        paints
          ..rrect(rrect: barRRect(0, 200), color: track)
          ..rrect(rrect: barRRect(0, 100), color: indicator),
      );
      expect(barRRect(0, 200).tlRadiusX, tokens.sizes.medium.linearThickness / 2);

      final TanreiThemeData squarish = TanreiThemeData(
        system: system.copyWith(progressIndicator: tokens.copyWith(trackShape: 1)),
      );
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5), theme: squarish));
      expect(subject, paints..rrect(rrect: barRRect(0, 200, shape: 1)));

      await tester.pumpWidget(tanreiTestApp(ring(value: 0.5)));
      expect(subject, paints..arc(strokeCap: StrokeCap.round));
      final TanreiThemeData square = TanreiThemeData(
        system: system.copyWith(progressIndicator: tokens.copyWith(trackShape: 0)),
      );
      await tester.pumpWidget(tanreiTestApp(ring(value: 0.5), theme: square));
      expect(subject, paints..arc(strokeCap: StrokeCap.butt));
    });

    testWidgets('PRG-5: with a gap and a stop indicator, a bar leaves the gap after the indicator '
        'and draws the stop dot at the track\'s end; at min and max there is no gap', (
      WidgetTester tester,
    ) async {
      final TanreiThemeData theme = TanreiThemeData(
        system: system.copyWith(
          progressIndicator: tokens.copyWith(trackGap: 4, stopIndicatorSize: 4),
        ),
      );
      final double thickness = tokens.sizes.medium.linearThickness;
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.4), theme: theme));
      expect(
        subject,
        paints
          ..rrect(rrect: barRRect(84, 200), color: track)
          ..rrect(rrect: barRRect(0, 80), color: indicator)
          ..circle(x: 200 - thickness / 2, y: thickness / 2, radius: 2, color: indicator),
      );
      for (final double value in <double>[0, 1]) {
        await tester.pumpWidget(tanreiTestApp(bar(value: value), theme: theme));
        await tester.pumpAndSettle();
        expect(
          subject,
          paints..rrect(rrect: barRRect(0, 200), color: track),
          reason: '$value',
        );
      }
    });

    testWidgets('PRG-5: the stop dot\'s center is half the thickness before the track\'s end, '
        'concentric with the rounded end, at every size and in either direction', (
      WidgetTester tester,
    ) async {
      final TanreiThemeData theme = TanreiThemeData(
        system: system.copyWith(progressIndicator: tokens.copyWith(stopIndicatorSize: 3)),
      );
      for (final TanreiProgressIndicatorSize size in TanreiProgressIndicatorSize.core) {
        final double thickness = tokens.sizes[size].linearThickness;
        for (final TextDirection direction in TextDirection.values) {
          await tester.pumpWidget(
            tanreiTestApp(
              Directionality(
                textDirection: direction,
                child: bar(value: 0.5, size: size),
              ),
              theme: theme,
            ),
          );
          final double x = direction == TextDirection.ltr ? 200 - thickness / 2 : thickness / 2;
          expect(
            subject,
            paints
              ..rrect()
              ..rrect()
              ..circle(x: x, y: thickness / 2, radius: 1.5, color: indicator),
            reason: '${size.name} ${direction.name}',
          );
        }
      }
      // The end cap's center: the bar's rounded end is a half circle of radius thickness / 2.
      expect(barRRect(0, 200).brRadiusX, tokens.sizes.medium.linearThickness / 2);
    });

    testWidgets('PRG-5: the defaults draw no gap and no stop dot; a ring leaves the gap at both '
        'ends of its arc, past the round caps', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.4)));
      expect(subject, isNot(paints..circle()));

      final TanreiThemeData theme = TanreiThemeData(
        system: system.copyWith(progressIndicator: tokens.copyWith(trackGap: 4)),
      );
      await tester.pumpWidget(tanreiTestApp(ring(value: 0.25), theme: theme));
      final TanreiProgressIndicatorSizeTokens t = tokens.sizes.medium;
      final Rect circle = ringRect(t);
      final double skip = (4 + t.circularThickness) / circle.width * 2;
      expect(
        subject,
        paints
          ..arc(
            rect: circle,
            startAngle: top + turn / 4 + skip,
            sweepAngle: turn * 3 / 4 - 2 * skip,
            color: track,
          )
          ..arc(rect: circle, startAngle: top, sweepAngle: turn / 4, color: indicator),
      );
    });

    testWidgets('PRG-6: a new value eases the indicator\'s end over value-duration with '
        'value-easing', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.2)));
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.8)));
      final Duration duration = tanreiDuration(tokens.motionValueDuration);
      final Curve curve = tokens.motionValueEasing.toCurve();
      // The first frame of the change still draws the old value; the change starts on it.
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 40)),
      );
      await tester.pump();
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 40)),
      );
      await tester.pump(duration ~/ 2);
      final double halfway = 0.2 + (0.8 - 0.2) * curve.transform(0.5);
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 200 * halfway)),
      );
      await tester.pump(duration ~/ 2);
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 160)),
      );
      // A controller is done strictly after its duration.
      await tester.pump(const Duration(milliseconds: 1));
      expect(tester.hasRunningAnimations, isFalse);
    });

    testWidgets('PRG-6: a switch between determinate and indeterminate takes effect at once', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.3)));
      await tester.pumpWidget(tanreiTestApp(bar()));
      // Indeterminate at its first frame: the segment is still before the track.
      expect(subject, paints..rrect(rrect: barRRect(0, 200), color: track));
      expect(
        subject,
        isNot(
          paints
            ..rrect()
            ..rrect(),
        ),
      );
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.9)));
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 180), color: indicator),
      );
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('indeterminate', () {
    testWidgets('PRG-2: a bar moves a segment two fifths long from beyond its start to beyond its '
        'end once per cycle, with the cycle easing', (WidgetTester tester) async {
      final Curve curve = tokens.motionCycleEasing.toCurve();
      for (final double t in <double>[0.25, 0.5, 0.75]) {
        final double start = -80 + curve.transform(t) * 280;
        // A new indicator starts a cycle; advance it to t.
        await tester.pumpWidget(const SizedBox());
        await tester.pumpWidget(tanreiTestApp(bar()));
        await tester.pump(cycle * t);
        expect(
          subject,
          paints
            ..rrect(rrect: barRRect(0, 200), color: track)
            ..rrect(
              rrect: barRRect(start.clamp(0, 200), (start + 80).clamp(0, 200)),
              color: indicator,
            ),
          reason: 't $t',
        );
      }
      // At the start of the next cycle the segment is before the track again; it repeats.
      await tester.pump(cycle * 0.25);
      expect(
        subject,
        isNot(
          paints
            ..rrect()
            ..rrect(),
        ),
      );
      await tester.pump(cycle * 0.25);
      final double again = -80 + curve.transform(0.25) * 280;
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(again, again + 80)),
      );
      expect(tester.hasRunningAnimations, isTrue);
    });

    testWidgets('PRG-2: a ring turns a quarter arc clockwise once per cycle at constant speed', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(ring()));
      final Rect circle = ringRect(tokens.sizes.medium);
      for (final double t in <double>[0, 0.25, 0.5, 0.75]) {
        expect(
          subject,
          paints
            ..arc(rect: circle, startAngle: top, sweepAngle: turn, color: track)
            ..arc(
              rect: circle,
              startAngle: top + turn * linear.transform(t),
              sweepAngle: turn / 4,
              color: indicator,
            ),
          reason: 't $t',
        );
        await tester.pump(cycle * 0.25);
      }
    });

    testWidgets('PRG-7: under reduced motion a value change is immediate', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.2), disableAnimations: true));
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.8), disableAnimations: true));
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 160)),
      );
      expect(tester.hasRunningAnimations, isFalse);
    });

    for (final TanreiProgressIndicatorVariant variant in TanreiProgressIndicatorVariant.values) {
      testWidgets('PRG-7: under reduced motion an indeterminate ${variant.name} indicator does not '
          'move: it covers the whole track and pulses its opacity 1 → 0 → 1 once per cycle', (
        WidgetTester tester,
      ) async {
        final Widget subjectWidget = variant == TanreiProgressIndicatorVariant.linear
            ? bar()
            : ring();
        await tester.pumpWidget(tanreiTestApp(subjectWidget, disableAnimations: true));
        final Curve curve = tokens.motionCycleEasing.toCurve();
        final Rect circle = ringRect(tokens.sizes.medium);
        for (final double t in <double>[0, 0.25, 0.5, 0.75]) {
          final double opacity = pulse(curve, t);
          final Color faded = opacity >= 1
              ? indicator
              : indicator.withValues(alpha: indicator.a * opacity);
          if (opacity < 1e-9) {
            // Faded out entirely: only the still track is drawn.
            expect(
              subject,
              variant == TanreiProgressIndicatorVariant.linear
                  ? isNot(
                      paints
                        ..rrect()
                        ..rrect(),
                    )
                  : isNot(
                      paints
                        ..arc()
                        ..arc(),
                    ),
              reason: 't $t',
            );
            // The still track is drawn.
            expect(
              subject,
              variant == TanreiProgressIndicatorVariant.linear
                  ? (paints..rrect(rrect: barRRect(0, 200), color: track))
                  : (paints..arc(startAngle: top, sweepAngle: turn, color: track)),
            );
          } else if (variant == TanreiProgressIndicatorVariant.linear) {
            expect(
              subject,
              paints
                ..rrect(rrect: barRRect(0, 200), color: track)
                ..rrect(rrect: barRRect(0, 200), color: faded),
              reason: 't $t',
            );
          } else {
            expect(
              subject,
              paints
                ..arc(rect: circle, startAngle: top, sweepAngle: turn, color: track)
                ..arc(rect: circle, startAngle: top, sweepAngle: turn, color: faded),
              reason: 't $t',
            );
          }
          await tester.pump(cycle * 0.25);
        }
        expect(pulse(curve, 0), 1);
        expect(pulse(curve, 0.5), moreOrLessEquals(0, epsilon: 1e-9));
        expect(pulse(curve, 1), moreOrLessEquals(1, epsilon: 1e-9));
      });
    }

    testWidgets('PRG-14: the animation stops where TickerMode is off (a hidden route) and resumes '
        'when it is on again', (WidgetTester tester) async {
      Widget withTickers(bool enabled) => TickerMode(enabled: enabled, child: ring());
      final Rect circle = ringRect(tokens.sizes.medium);
      await tester.pumpWidget(tanreiTestApp(withTickers(true)));
      await tester.pump(cycle * 0.25);
      expect(
        subject,
        paints
          ..arc()
          ..arc(rect: circle, startAngle: top + turn * linear.transform(0.25)),
      );
      await tester.pumpWidget(tanreiTestApp(withTickers(false)));
      await tester.pump(cycle * 0.5);
      expect(tester.hasRunningAnimations, isFalse);
      expect(
        subject,
        paints
          ..arc()
          ..arc(rect: circle, startAngle: top + turn * linear.transform(0.25)),
      );
      // Resumed: it turns again (a muted ticker keeps its clock, so it resumes where the time
      // is, not where it stopped).
      await tester.pumpWidget(tanreiTestApp(withTickers(true)));
      expect(tester.hasRunningAnimations, isTrue);
      await tester.pump(cycle * 0.25);
      expect(
        subject,
        paints
          ..arc()
          ..arc(rect: circle, startAngle: top + turn * linear.transform(0)),
      );
      await tester.pump(cycle * 0.25);
      expect(
        subject,
        paints
          ..arc()
          ..arc(rect: circle, startAngle: top + turn * linear.transform(0.25)),
      );
    });

    testWidgets('PRG-14: a determinate indicator runs no animation', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(ring(value: 0.5)));
      await tester.pump();
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('accessibility', () {
    testWidgets('PRG-8: determinate: the name, and the clamped percentage as the value', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.4)));
      expect(tester.getSemantics(subject), matchesSemantics(label: 'Uploading', value: '40%'));
      await tester.pumpWidget(tanreiTestApp(bar(value: 3, max: 10)));
      expect(tester.getSemantics(subject), matchesSemantics(label: 'Uploading', value: '30%'));
      handle.dispose();
    });

    testWidgets('PRG-8: valueText replaces the percentage', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(bar(value: 3, max: 10, valueText: '3 of 10 files')));
      expect(
        tester.getSemantics(subject),
        matchesSemantics(label: 'Uploading', value: '3 of 10 files'),
      );
      handle.dispose();
    });

    testWidgets('PRG-9: indeterminate: the name and no value', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final Widget indeterminate in <Widget>[bar(), ring()]) {
        await tester.pumpWidget(tanreiTestApp(indeterminate));
        final SemanticsData data = tester.getSemantics(subject).getSemanticsData();
        expect(data.label, 'Uploading');
        expect(data.value, isEmpty);
      }
      handle.dispose();
    });

    testWidgets('PRG-10: not focusable, no actions, no live region, and a value change is not '
        'announced', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<Object?> announcements = <Object?>[];
      tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
        SystemChannels.accessibility,
        (Object? message) async {
          announcements.add(message);
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
          SystemChannels.accessibility,
          null,
        ),
      );
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.1)));
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.6)));
      await tester.pumpAndSettle();
      final SemanticsData data = tester.getSemantics(subject).getSemanticsData();
      expect(data.value, '60%');
      expect(data.actions, 0);
      expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);
      expect(data.hasFlag(SemanticsFlag.isLiveRegion), isFalse);
      expect(find.descendant(of: subject, matching: find.byType(Focus)), findsNothing);
      expect(announcements, isEmpty);
      handle.dispose();
    });

    for (final TanreiProgressIndicatorVariant variant in TanreiProgressIndicatorVariant.values) {
      testWidgets('guidelines: ${variant.name}', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(
          tanreiTestApp(
            variant == TanreiProgressIndicatorVariant.linear ? bar(value: 0.4) : ring(),
          ),
        );
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        handle.dispose();
      });
    }

    // The value is read from the boundary between indicator and track, and the indicator against
    // the surface (spec accessibility notes): 3:1 each.
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('non-text contrast: indicator against track and against the surface in the '
            '${brightness.name} ${contrast.name} scheme', () {
          final Color surface = theme.colors.surface;
          final Color trackColor = Color.alphaBlend(theme.paint(tokens.trackColor), surface);
          final Color indicatorColor = Color.alphaBlend(
            theme.paint(tokens.indicatorColor),
            surface,
          );
          expect(contrastOf(indicatorColor, trackColor), greaterThanOrEqualTo(3));
          expect(contrastOf(indicatorColor, surface), greaterThanOrEqualTo(3));
        });
      }
    }

    testWidgets('PRG-15: an empty label still renders, and debug builds report it once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.4, label: '')));
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 80)),
      );
      expect(reports, <String>['progress-indicator']);
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5, label: '')));
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5)));
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5, label: ' ')));
      expect(reports, hasLength(2));
    });

    testWidgets('PRG-15: the default reporter says what to set', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(ring(label: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('progress-indicator has no accessible name'));
      expect('$reported', contains('semanticsLabel'));
    });
  });

  group('values out of range', () {
    testWidgets('PRG-11: a value below min or above max is drawn and exposed clamped, and '
        'reported', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(tanreiTestApp(bar(value: 12, max: 10)));
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(rrect: barRRect(0, 200), color: indicator),
      );
      expect(tester.getSemantics(subject).getSemanticsData().value, '100%');
      expect(reports, <String>['progress-indicator value "12.0" -> 10.0']);
      reports.clear();
      await tester.pumpWidget(tanreiTestApp(bar(value: -1)));
      await tester.pumpAndSettle();
      expect(
        subject,
        isNot(
          paints
            ..rrect()
            ..rrect(),
        ),
      );
      expect(tester.getSemantics(subject).getSemanticsData().value, '0%');
      expect(reports, <String>['progress-indicator value "-1.0" -> 0.0']);
      handle.dispose();
    });

    testWidgets('PRG-11: max not greater than min draws the track alone and exposes 0 %, '
        'reported', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(tanreiTestApp(bar(value: 5, min: 5, max: 5)));
      expect(subject, paints..rrect(rrect: barRRect(0, 200), color: track));
      expect(
        subject,
        isNot(
          paints
            ..rrect()
            ..rrect(),
        ),
      );
      expect(tester.getSemantics(subject).getSemanticsData().value, '0%');
      expect(reports, <String>['progress-indicator range "5.0…5.0" -> 0…1, value 0']);
      // Rebuilt with the same values: not reported again.
      reports.clear();
      await tester.pumpWidget(tanreiTestApp(bar(value: 5, min: 5, max: 5)));
      expect(reports, isEmpty);
      handle.dispose();
    });

    testWidgets('PRG-12: a size the design system does not have and a variant the component does '
        'not define render as medium and linear, pixel for pixel, and are reported', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectUnknownValues();
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        child: progressOf(<String, dynamic>{
          'variant': 'wavy',
          'size': 'huge',
          'value': 0.4,
          'label': 'Uploading',
        }),
      );
      expect(reports, contains('progress-indicator variant "wavy" -> linear'));
      expect(reports, contains('progress-indicator size "huge" -> medium'));
      reports.clear();
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        child: progressOf(<String, dynamic>{'value': 0.4, 'label': 'Uploading'}),
      );
      expect(reports, isEmpty);
      expect(unknown, defaults);
    });

    testWidgets('PRG-12: a size a design system added drives the indicator', (
      WidgetTester tester,
    ) async {
      const TanreiProgressIndicatorSize hero = TanreiProgressIndicatorSize('hero');
      final TanreiSystem product = system.copyWith(
        progressIndicator: tokens.copyWith(
          sizes: tokens.sizes.copyWith(
            extra: <TanreiProgressIndicatorSize, TanreiProgressIndicatorSizeTokens>{
              hero: tokens.sizes.large.copyWith(
                linearThickness: 12,
                circularSize: 64,
                circularThickness: 6,
              ),
            },
          ),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5, size: hero), theme: theme));
      expect(tester.getSize(subject), const Size(200, 12));
      await tester.pumpWidget(tanreiTestApp(ring(value: 0.5, size: hero), theme: theme));
      expect(tester.getSize(subject), const Size.square(64));
      expect(subject, paints..arc(strokeWidth: 6));
    });
  });

  group('direction', () {
    testWidgets('PRG-13: a right-to-left bar fills from the right', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(Directionality(textDirection: TextDirection.rtl, child: bar(value: 0.4))),
      );
      expect(
        subject,
        paints
          ..rrect(rrect: barRRect(0, 200), color: track)
          ..rrect(rrect: barRRect(120, 200), color: indicator),
      );
    });

    testWidgets('PRG-13: a right-to-left indeterminate segment moves from right to left', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(Directionality(textDirection: TextDirection.rtl, child: bar())),
      );
      final Curve curve = tokens.motionCycleEasing.toCurve();
      await tester.pump(cycle * 0.25);
      final double start = -80 + curve.transform(0.25) * 280;
      expect(
        subject,
        paints
          ..rrect()
          ..rrect(
            rrect: barRRect(200 - (start + 80).clamp(0, 200), 200 - start.clamp(0, 200)),
            color: indicator,
          ),
      );
    });

    testWidgets('PRG-13: a ring is not mirrored: it starts at the top and turns clockwise in '
        'every direction', (WidgetTester tester) async {
      final FramePixels ltr = await framePixels(tester, system: system, child: ring(value: 0.3));
      final FramePixels rtl = await framePixels(
        tester,
        system: system,
        child: ring(value: 0.3),
        textDirection: TextDirection.rtl,
      );
      expect(rtl, ltr);
      expect(
        subject,
        paints
          ..arc()
          ..arc(startAngle: top, sweepAngle: turn * 0.3, color: indicator),
      );
    });
  });

  group('a design system drives rendering', () {
    testWidgets('colors, shape, gap, stop and motion tokens of a product system drive the '
        'indicator', (WidgetTester tester) async {
      final TanreiSystem product = system.copyWith(
        progressIndicator: tokens.copyWith(
          trackColor: const TanreiPaint.role(TanreiColorRole.errorContainer),
          indicatorColor: const TanreiPaint.role(TanreiColorRole.error),
          motionCycleDuration: 2000,
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      final TanreiColors colors = product.schemes.light;
      await tester.pumpWidget(tanreiTestApp(bar(value: 0.5), theme: theme));
      expect(
        subject,
        paints
          ..rrect(color: colors.errorContainer)
          ..rrect(color: colors.error),
      );
      await tester.pumpWidget(tanreiTestApp(ring(), theme: theme));
      await tester.pump(const Duration(milliseconds: 500));
      expect(
        subject,
        paints
          ..arc()
          ..arc(startAngle: top + turn * linear.transform(0.25)),
      );
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the indicator reads the tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiProgressIndicatorTokens t = shipped.progressIndicator;
        await tester.pumpWidget(tanreiTestApp(bar(value: 0.5), theme: theme));
        expect(tester.getSize(subject).height, t.sizes.medium.linearThickness);
        expect(subject, paints..rrect(color: theme.paint(t.trackColor)));
        await tester.pumpWidget(tanreiTestApp(ring(value: 0.5), theme: theme));
        expect(tester.getSize(subject), Size.square(t.sizes.medium.circularSize));
        expect(
          subject,
          paints
            ..arc(color: theme.paint(t.trackColor), strokeWidth: t.sizes.medium.circularThickness)
            ..arc(color: theme.paint(t.indicatorColor)),
        );
      });
    }

    test('the tokens the widget reads: the defaults (bars 2 / 4 / 8, rings 16 / 24 / 40)', () {
      expect(
        TanreiProgressIndicatorSize.core.map(
          (TanreiProgressIndicatorSize s) => tokens.sizes[s].linearThickness,
        ),
        <double>[2, 4, 8],
      );
      expect(
        TanreiProgressIndicatorSize.core.map(
          (TanreiProgressIndicatorSize s) => tokens.sizes[s].circularSize,
        ),
        <double>[16, 24, 40],
      );
      expect(tokens.trackGap, 0);
      expect(tokens.stopIndicatorSize, 0);
      expect(tokens.motionCycleDuration, system.motion.duration.extraLong4);
      expect(tokens.motionValueDuration, system.motion.duration.medium2);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('progress-indicator');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'linear-determinate',
        'linear-indeterminate',
        'linear-small',
        'linear-large',
        'linear-empty',
        'linear-full',
        'linear-range',
        'circular-determinate',
        'circular-indeterminate',
        'circular-small',
        'circular-large',
      ]);
    });

    // PRG-7 (verify): indeterminate fixtures are recorded with reduced motion requested, at the
    // start of a cycle (opacity 1); every fixture is, which changes nothing for a determinate one.
    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: progressOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/progress_indicator/$id.png',
          disableAnimations: true,
        );
      });
    }

    // One representative fixture per shipped preset: a determinate bar shows the
    // preset's thickness, track color, gap and stop dot at once.
    const String recorded = 'linear-determinate';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: progressOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/progress_indicator/${preset.id}/$recorded.png',
          disableAnimations: true,
        );
      });
    }
  });
}
