import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiLoadingIndicatorTokens tokens = system.loadingIndicator;
const TanreiThemeData lightTheme = TanreiThemeData.light;
final Duration cycle = tanreiDuration(tokens.motionCycleDuration);
final Curve linear = system.motion.easing.linear.toCurve();
final Curve standard = system.motion.easing.standard.toCurve();
const double top = TanreiRing.top;
const double turn = TanreiRing.turn;

/// The loading indicator of a spec fixture's [props].
TanreiLoadingIndicator loadingOf(Map<String, dynamic> props) => TanreiLoadingIndicator(
  size: TanreiLoadingIndicatorSize(props['size'] as String? ?? 'medium'),
  contained: props['contained'] as bool? ?? false,
  semanticsLabel: props['label'] as String? ?? '',
);

Widget loading({
  TanreiLoadingIndicatorSize size = TanreiLoadingIndicatorSize.medium,
  bool contained = false,
  String label = 'Loading',
}) => TanreiLoadingIndicator(size: size, contained: contained, semanticsLabel: label);

Finder get subject => find.byType(TanreiLoadingIndicator);

/// The arc's painted box: the indicator square.
Finder get markFinder => find.descendant(of: subject, matching: find.byType(CustomPaint));

/// The container, when contained.
Finder get containerFinder => find.descendant(of: subject, matching: find.byType(DecoratedBox));

TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(containerFinder).decoration as TanreiContainerDecoration;

/// The circle the arc of [size] runs along, in the mark's own coordinates.
Rect arcRect(TanreiLoadingIndicatorSizeTokens size) =>
    TanreiRing(Size.square(size.indicatorSize), size.indicatorThickness).circle;

void main() {
  group('the mark', () {
    testWidgets('LDG-1: a quarter arc with round caps and the size\'s stroke, outer edge on the '
        'square, turning clockwise once per cycle at constant speed, with no track', (
      WidgetTester tester,
    ) async {
      for (final TanreiLoadingIndicatorSize size in TanreiLoadingIndicatorSize.core) {
        final TanreiLoadingIndicatorSizeTokens t = tokens.sizes[size];
        await tester.pumpWidget(tanreiTestApp(loading(size: size)));
        expect(tester.getSize(markFinder), Size.square(t.indicatorSize), reason: size.name);
        final Rect circle = arcRect(t);
        expect(circle.width + t.indicatorThickness, t.indicatorSize, reason: size.name);
        for (final double at in <double>[0, 0.25, 0.5, 0.75]) {
          expect(
            markFinder,
            paints..arc(
              rect: circle,
              startAngle: top + turn * linear.transform(at),
              sweepAngle: turn / 4,
              strokeWidth: t.indicatorThickness,
              strokeCap: StrokeCap.round,
            ),
            reason: '${size.name} at $at',
          );
          // One arc and nothing else: no track.
          expect(
            markFinder,
            isNot(
              paints
                ..arc()
                ..arc(),
            ),
            reason: '${size.name} at $at',
          );
          await tester.pump(cycle * 0.25);
        }
        // A whole cycle later it is where it started.
        expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0)));
        await tester.pumpWidget(const SizedBox());
      }
    });

    testWidgets('LDG-2: not contained, it takes exactly its indicator square, draws no container '
        'and draws the arc in indicator.color', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(loading()));
      expect(tester.getSize(subject), Size.square(tokens.sizes.medium.indicatorSize));
      expect(containerFinder, findsNothing);
      expect(markFinder, paints..arc(color: lightTheme.paint(tokens.indicatorColor)));
    });

    testWidgets('LDG-3: contained, it draws a container of container.size with container.shape, '
        'filled and raised by the contained tokens, the arc centered on it in its color', (
      WidgetTester tester,
    ) async {
      final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
        tokens.containedContainerElevation,
        lightTheme.colors,
      );
      for (final TanreiLoadingIndicatorSize size in TanreiLoadingIndicatorSize.core) {
        final TanreiLoadingIndicatorSizeTokens t = tokens.sizes[size];
        await tester.pumpWidget(tanreiTestApp(loading(size: size, contained: true)));
        expect(tester.getSize(subject), Size.square(t.containerSize), reason: size.name);
        final TanreiContainerDecoration decoration = containerDecoration(tester);
        expect(decoration.color, lightTheme.paint(tokens.containedContainerColor));
        expect(decoration.shape.radius, tokens.containerShape);
        expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
        expect(decoration.boxShadow, elevation.shadows.isEmpty ? isNull : elevation.shadows);
        expect(decoration.border, elevation.ring);
        expect(tester.getSize(markFinder), Size.square(t.indicatorSize));
        expect(tester.getCenter(markFinder), tester.getCenter(subject));
        expect(
          markFinder,
          paints..arc(color: lightTheme.paint(tokens.containedIndicatorColor)),
          reason: size.name,
        );
      }
    });

    testWidgets('LDG-3: the default container is raised: level 2 draws a shadow', (
      WidgetTester tester,
    ) async {
      expect(tokens.containedContainerElevation, system.elevation.level2);
      expect(system.elevation.level2, isNotEmpty);
    });

    for (final bool contained in <bool>[false, true]) {
      testWidgets(
        'LDG-4: under reduced motion the ${contained ? 'contained ' : ''}indicator does '
        'not turn: the whole circle, its opacity eased 1 → 0 → 1 once per cycle with '
        'sys.motion.easing.standard${contained ? '; the container stays still and opaque' : ''}',
        (WidgetTester tester) async {
          await tester.pumpWidget(
            tanreiTestApp(loading(contained: contained), disableAnimations: true),
          );
          final TanreiLoadingIndicatorSizeTokens t = tokens.sizes.medium;
          final Color color = lightTheme.paint(
            contained ? tokens.containedIndicatorColor : tokens.indicatorColor,
          );
          final TanreiContainerDecoration? before = contained ? containerDecoration(tester) : null;
          for (final double at in <double>[0, 0.25, 0.5, 0.75]) {
            final double opacity = tanreiPulseOpacity(standard, at);
            if (opacity < 1e-9) {
              expect(markFinder, isNot(paints..arc()), reason: 'at $at');
            } else {
              expect(
                markFinder,
                paints..arc(
                  rect: arcRect(t),
                  startAngle: top,
                  sweepAngle: turn,
                  color: tanreiFade(color, opacity),
                  strokeWidth: t.indicatorThickness,
                ),
                reason: 'at $at',
              );
            }
            if (contained) {
              expect(containerDecoration(tester), before, reason: 'at $at');
              expect(find.descendant(of: subject, matching: find.byType(Opacity)), findsNothing);
            }
            await tester.pump(cycle * 0.25);
          }
          expect(tanreiPulseOpacity(standard, 0), 1);
          expect(tanreiPulseOpacity(standard, 0.5), moreOrLessEquals(0, epsilon: 1e-9));
        },
      );
    }

    testWidgets('LDG-7: the animation stops where TickerMode is off (a hidden route) and resumes '
        'when it is on again', (WidgetTester tester) async {
      Widget withTickers(bool enabled) => TickerMode(enabled: enabled, child: loading());
      await tester.pumpWidget(tanreiTestApp(withTickers(true)));
      expect(tester.hasRunningAnimations, isTrue);
      await tester.pump(cycle * 0.25);
      expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0.25)));
      await tester.pumpWidget(tanreiTestApp(withTickers(false)));
      await tester.pump(cycle * 0.5);
      expect(tester.hasRunningAnimations, isFalse);
      expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0.25)));
      await tester.pumpWidget(tanreiTestApp(withTickers(true)));
      expect(tester.hasRunningAnimations, isTrue);
      // A muted ticker keeps its clock: it resumes where the time is.
      await tester.pump(cycle * 0.25);
      expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0)));
    });

    testWidgets('LDG-7: an indicator that is not in the tree runs nothing', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(loading()));
      expect(tester.hasRunningAnimations, isTrue);
      await tester.pumpWidget(tanreiTestApp(const SizedBox()));
      expect(tester.hasRunningAnimations, isFalse);
    });

    testWidgets('LDG-8: right-to-left is not mirrored: it turns clockwise, pixel for pixel the '
        'same', (WidgetTester tester) async {
      for (final bool contained in <bool>[false, true]) {
        final FramePixels ltr = await framePixels(
          tester,
          system: system,
          child: loading(contained: contained),
        );
        await tester.pumpWidget(const SizedBox());
        final FramePixels rtl = await framePixels(
          tester,
          system: system,
          child: loading(contained: contained),
          textDirection: TextDirection.rtl,
        );
        expect(rtl, ltr, reason: 'contained $contained');
        await tester.pump(cycle * 0.25);
        expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0.25)));
        await tester.pumpWidget(const SizedBox());
      }
    });
  });

  group('accessibility', () {
    testWidgets('LDG-5: the label is the name, with no value', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final bool contained in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(loading(contained: contained, label: 'Loading messages')),
        );
        final SemanticsData data = tester.getSemantics(subject).getSemanticsData();
        expect(data.label, 'Loading messages');
        expect(data.value, isEmpty);
      }
      handle.dispose();
    });

    testWidgets(
      'LDG-6: not focusable, no actions, no live region, and nothing is announced when it '
      'appears or disappears',
      (WidgetTester tester) async {
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
        await tester.pumpWidget(tanreiTestApp(const SizedBox()));
        await tester.pumpWidget(tanreiTestApp(loading()));
        final SemanticsData data = tester.getSemantics(subject).getSemanticsData();
        expect(data.actions, 0);
        expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);
        expect(data.hasFlag(SemanticsFlag.isLiveRegion), isFalse);
        expect(find.descendant(of: subject, matching: find.byType(Focus)), findsNothing);
        await tester.pumpWidget(tanreiTestApp(const SizedBox()));
        expect(announcements, isEmpty);
        handle.dispose();
      },
    );

    for (final bool contained in <bool>[false, true]) {
      testWidgets('guidelines: ${contained ? 'contained' : 'inline'}', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(tanreiTestApp(loading(contained: contained)));
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        handle.dispose();
      });
    }

    // The mark is the only sign that something is happening: 3:1 against the surface behind it,
    // and contained against its container (spec accessibility notes).
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('non-text contrast: the mark on the surface and on its container in the '
            '${brightness.name} ${contrast.name} scheme', () {
          final Color surface = theme.colors.surface;
          final Color mark = Color.alphaBlend(theme.paint(tokens.indicatorColor), surface);
          final Color container = Color.alphaBlend(
            theme.paint(tokens.containedContainerColor),
            surface,
          );
          final Color containedMark = Color.alphaBlend(
            theme.paint(tokens.containedIndicatorColor),
            container,
          );
          expect(contrastOf(mark, surface), greaterThanOrEqualTo(3));
          expect(contrastOf(containedMark, container), greaterThanOrEqualTo(3));
        });
      }
    }

    testWidgets('LDG-10: an empty label still renders, and debug builds report it once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(loading(label: '')));
      expect(markFinder, paints..arc());
      expect(reports, <String>['loading-indicator']);
      await tester.pumpWidget(tanreiTestApp(loading(label: '', contained: true)));
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(loading()));
      await tester.pumpWidget(tanreiTestApp(loading(label: '\t')));
      expect(reports, hasLength(2));
    });

    testWidgets('LDG-10: the default reporter says what to set', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(loading(label: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('loading-indicator has no accessible name'));
      expect('$reported', contains('semanticsLabel'));
    });
  });

  group('sizes', () {
    testWidgets('LDG-9: a size the design system does not have renders as medium, pixel for '
        'pixel, and is reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      for (final bool contained in <bool>[false, true]) {
        reports.clear();
        final FramePixels unknown = await framePixels(
          tester,
          system: system,
          disableAnimations: true,
          child: loading(size: const TanreiLoadingIndicatorSize('giant'), contained: contained),
        );
        expect(reports, <String>['loading-indicator size "giant" -> medium']);
        reports.clear();
        await tester.pumpWidget(const SizedBox());
        final FramePixels defaults = await framePixels(
          tester,
          system: system,
          disableAnimations: true,
          child: loading(contained: contained),
        );
        expect(reports, isEmpty);
        expect(unknown, defaults, reason: 'contained $contained');
        await tester.pumpWidget(const SizedBox());
      }
    });

    testWidgets('LDG-9: a size a design system added drives the indicator', (
      WidgetTester tester,
    ) async {
      const TanreiLoadingIndicatorSize hero = TanreiLoadingIndicatorSize('hero');
      final TanreiSystem product = system.copyWith(
        loadingIndicator: tokens.copyWith(
          sizes: tokens.sizes.copyWith(
            extra: <TanreiLoadingIndicatorSize, TanreiLoadingIndicatorSizeTokens>{
              hero: tokens.sizes.large.copyWith(
                indicatorSize: 56,
                indicatorThickness: 5,
                containerSize: 72,
              ),
            },
          ),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(tanreiTestApp(loading(size: hero, contained: true), theme: theme));
      expect(tester.getSize(subject), const Size.square(72));
      expect(tester.getSize(markFinder), const Size.square(56));
      expect(markFinder, paints..arc(strokeWidth: 5));
    });
  });

  group('a design system drives rendering', () {
    testWidgets('colors, shape, elevation and the cycle of a product system drive the indicator', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        loadingIndicator: tokens.copyWith(
          indicatorColor: const TanreiPaint.role(TanreiColorRole.error),
          containedContainerColor: const TanreiPaint.role(TanreiColorRole.errorContainer),
          containedIndicatorColor: const TanreiPaint.role(TanreiColorRole.onErrorContainer),
          containedContainerElevation: system.elevation.level0,
          containerShape: 4,
          motionCycleDuration: 2000,
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      final TanreiColors colors = product.schemes.light;
      await tester.pumpWidget(tanreiTestApp(loading(), theme: theme));
      expect(markFinder, paints..arc(color: colors.error));
      await tester.pump(const Duration(milliseconds: 500));
      expect(markFinder, paints..arc(startAngle: top + turn * linear.transform(0.25)));
      await tester.pumpWidget(tanreiTestApp(loading(contained: true), theme: theme));
      expect(containerDecoration(tester).color, colors.errorContainer);
      expect(containerDecoration(tester).shape.radius, 4);
      expect(containerDecoration(tester).boxShadow, isNull);
      expect(markFinder, paints..arc(color: colors.onErrorContainer));
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the indicator reads the tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiLoadingIndicatorTokens t = shipped.loadingIndicator;
        await tester.pumpWidget(tanreiTestApp(loading(), theme: theme));
        expect(tester.getSize(subject), Size.square(t.sizes.medium.indicatorSize));
        expect(
          markFinder,
          paints..arc(
            color: theme.paint(t.indicatorColor),
            strokeWidth: t.sizes.medium.indicatorThickness,
          ),
        );
        await tester.pumpWidget(tanreiTestApp(loading(contained: true), theme: theme));
        expect(tester.getSize(subject), Size.square(t.sizes.medium.containerSize));
        expect(containerDecoration(tester).color, theme.paint(t.containedContainerColor));
        expect(markFinder, paints..arc(color: theme.paint(t.containedIndicatorColor)));
      });
    }

    test('the tokens the widget reads: the defaults (16 / 24 / 40 in 24 / 32 / 48, one turn a '
        'second)', () {
      expect(
        TanreiLoadingIndicatorSize.core.map(
          (TanreiLoadingIndicatorSize s) => <double>[
            tokens.sizes[s].indicatorSize,
            tokens.sizes[s].containerSize,
            tokens.sizes[s].indicatorThickness,
          ],
        ),
        <List<double>>[
          <double>[16, 24, 2],
          <double>[24, 32, 2],
          <double>[40, 48, 2],
        ],
      );
      expect(tokens.motionCycleDuration, system.motion.duration.extraLong4);
      expect(tokens.containerShape, system.shape.full);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('loading-indicator');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'small',
        'medium',
        'large',
        'contained-small',
        'contained-medium',
        'contained-large',
      ]);
    });

    // LDG-4 (verify): recorded with reduced motion requested, at the start of a cycle (opacity 1).
    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: loadingOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/loading_indicator/$id.png',
          disableAnimations: true,
        );
      });
    }

    // One representative fixture per shipped preset: contained shows the mark's size,
    // stroke and color and the container's size, fill and elevation at once.
    const String recorded = 'contained-medium';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: loadingOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/loading_indicator/${preset.id}/$recorded.png',
          disableAnimations: true,
        );
      });
    }
  });
}
