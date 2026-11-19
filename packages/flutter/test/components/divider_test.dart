import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiDividerTokens tokens = system.divider;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The divider of a spec fixture's [props].
TanreiDivider dividerOf(Map<String, dynamic> props) => TanreiDivider(
  axis: TanreiDivider.axisFromName(props['orientation'] as String? ?? 'horizontal'),
  inset: TanreiDividerInset.fromName(props['inset'] as String? ?? 'none'),
  excludeFromSemantics: props['decorative'] as bool? ?? true,
);

RenderTanreiDividerLine lineOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiDividerLine>().toSet().single;

/// A box of [length] with the divider between two 20-pixel blocks along [axis].
Widget between(Widget divider, {Axis axis = Axis.vertical, double length = 100}) => SizedBox(
  width: axis == Axis.vertical ? length : null,
  height: axis == Axis.horizontal ? length : null,
  child: Flex(
    direction: axis,
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      const SizedBox.square(key: ValueKey<String>('before'), dimension: 20),
      divider,
      const SizedBox.square(key: ValueKey<String>('after'), dimension: 20),
    ],
  ),
);

void main() {
  group('the line', () {
    testWidgets('DIV-1: a horizontal divider spans the full width of its container, in the line '
        'color', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(const SizedBox(width: 200, height: 50, child: TanreiDivider())),
      );
      expect(tester.getSize(find.byType(TanreiDivider)).width, 200);
      final RenderTanreiDividerLine line = lineOf(tester);
      expect(line.color, lightTheme.paint(tokens.lineColor));
      expect(line.color, system.schemes.light.outlineVariant);
      expect(line.lineRect.left, 0);
      expect(line.lineRect.right, 200);
    });

    testWidgets('DIV-1: a vertical divider spans the full height of its container', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          const SizedBox(width: 50, height: 120, child: TanreiDivider(axis: Axis.vertical)),
        ),
      );
      expect(tester.getSize(find.byType(TanreiDivider)).height, 120);
      final Rect rect = lineOf(tester).lineRect;
      expect(rect.top, 0);
      expect(rect.bottom, 120);
    });

    testWidgets('DIV-1: the pixels: the line color along the whole length, the surface beside it', (
      WidgetTester tester,
    ) async {
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        child: const TanreiDivider(),
      );
      final Color surface = lightTheme.colors.surface;
      // The line color may be translucent (outline-variant is): what is seen is it over the surface.
      final Color line = Color.alphaBlend(lightTheme.paint(tokens.lineColor), surface);
      final Rect box = tester.getRect(find.byType(TanreiDivider));
      final double y = box.center.dy;
      for (final double x in <double>[box.left, box.center.dx, box.right - 0.5]) {
        expect(pixels.atLogical(Offset(x, y - 0.25)), looksLike(line), reason: 'x $x');
      }
      expect(pixels.atLogical(Offset(box.left - 1, y - 0.25)), surface);
      expect(pixels.atLogical(Offset(box.right + 0.5, y - 0.25)), surface);
      expect(pixels.atLogical(Offset(box.center.dx, y - 2)), surface);
      expect(pixels.atLogical(Offset(box.center.dx, y + 1.5)), surface);
    });

    testWidgets('DIV-2: the divider takes exactly the thickness across and adds no margin or '
        'padding', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(between(const TanreiDivider())));
      expect(tester.getSize(find.byType(TanreiDivider)).height, tokens.lineThickness);
      expect(
        tester.getTopLeft(find.byType(TanreiDivider)).dy,
        tester.getBottomLeft(find.byKey(const ValueKey<String>('before'))).dy,
      );
      expect(
        tester.getTopLeft(find.byKey(const ValueKey<String>('after'))).dy,
        tester.getBottomLeft(find.byType(TanreiDivider)).dy,
      );

      await tester.pumpWidget(
        tanreiTestApp(between(const TanreiDivider(axis: Axis.vertical), axis: Axis.horizontal)),
      );
      expect(tester.getSize(find.byType(TanreiDivider)).width, tokens.lineThickness);
      expect(
        tester.getTopLeft(find.byType(TanreiDivider)).dx,
        tester.getTopRight(find.byKey(const ValueKey<String>('before'))).dx,
      );
      expect(
        tester.getTopLeft(find.byKey(const ValueKey<String>('after'))).dx,
        tester.getTopRight(find.byType(TanreiDivider)).dx,
      );
    });

    testWidgets('DIV-2: intrinsic sizes are the thickness across and nothing along (a vertical '
        'divider in an IntrinsicHeight row takes the row\'s height)', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(
          const IntrinsicHeight(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                SizedBox(width: 30, height: 44),
                TanreiDivider(axis: Axis.vertical),
                SizedBox(width: 30, height: 20),
              ],
            ),
          ),
        ),
      );
      expect(tester.getSize(find.byType(TanreiDivider)), Size(tokens.lineThickness, 44));
    });
  });

  group('inset', () {
    testWidgets('DIV-3: start shortens a horizontal line at its start, both at each end; the inset '
        'stretch draws nothing', (WidgetTester tester) async {
      final double inset = tokens.lineInset;
      final Map<TanreiDividerInset, (double, double)> expected =
          <TanreiDividerInset, (double, double)>{
            TanreiDividerInset.none: (0, 200),
            TanreiDividerInset.start: (inset, 200),
            TanreiDividerInset.both: (inset, 200 - inset),
          };
      for (final MapEntry<TanreiDividerInset, (double, double)> entry in expected.entries) {
        await tester.pumpWidget(
          tanreiTestApp(SizedBox(width: 200, child: TanreiDivider(inset: entry.key))),
        );
        final Rect rect = lineOf(tester).lineRect;
        expect((rect.left, rect.right), entry.value, reason: entry.key.name);
        // The box still spans the container: the inset is inside it, not a margin.
        expect(tester.getSize(find.byType(TanreiDivider)).width, 200);
      }
    });

    testWidgets('DIV-3: a vertical line is shortened at its top (start) and at both ends', (
      WidgetTester tester,
    ) async {
      final double inset = tokens.lineInset;
      for (final (TanreiDividerInset value, double top, double bottom)
          in <(TanreiDividerInset, double, double)>[
            (TanreiDividerInset.none, 0, 100),
            (TanreiDividerInset.start, inset, 100),
            (TanreiDividerInset.both, inset, 100 - inset),
          ]) {
        await tester.pumpWidget(
          tanreiTestApp(
            SizedBox(
              height: 100,
              child: TanreiDivider(axis: Axis.vertical, inset: value),
            ),
          ),
        );
        final Rect rect = lineOf(tester).lineRect;
        expect((rect.top, rect.bottom), (top, bottom), reason: value.name);
      }
    });

    testWidgets('DIV-3: the pixels of an inset: surface in the inset stretch, the line after it', (
      WidgetTester tester,
    ) async {
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        child: const TanreiDivider(inset: TanreiDividerInset.both),
      );
      final Rect box = tester.getRect(find.byType(TanreiDivider));
      final double y = box.center.dy - 0.25;
      final double inset = tokens.lineInset;
      final Color surface = lightTheme.colors.surface;
      final Color line = Color.alphaBlend(lightTheme.paint(tokens.lineColor), surface);
      expect(pixels.atLogical(Offset(box.left + inset / 2, y)), surface);
      expect(pixels.atLogical(Offset(box.left + inset + 0.5, y)), looksLike(line));
      expect(pixels.atLogical(Offset(box.right - inset - 1, y)), looksLike(line));
      expect(pixels.atLogical(Offset(box.right - inset / 2, y)), surface);
    });

    testWidgets('DIV-4: right-to-left puts a horizontal start inset at the right end', (
      WidgetTester tester,
    ) async {
      final double inset = tokens.lineInset;
      await tester.pumpWidget(
        tanreiTestApp(
          const Directionality(
            textDirection: TextDirection.rtl,
            child: SizedBox(width: 200, child: TanreiDivider(inset: TanreiDividerInset.start)),
          ),
        ),
      );
      Rect rect = lineOf(tester).lineRect;
      expect((rect.left, rect.right), (0, 200 - inset));

      // Both ends: symmetric in either direction.
      await tester.pumpWidget(
        tanreiTestApp(
          const Directionality(
            textDirection: TextDirection.rtl,
            child: SizedBox(width: 200, child: TanreiDivider(inset: TanreiDividerInset.both)),
          ),
        ),
      );
      rect = lineOf(tester).lineRect;
      expect((rect.left, rect.right), (inset, 200 - inset));
    });

    testWidgets('DIV-4: a vertical divider\'s inset does not change with the direction', (
      WidgetTester tester,
    ) async {
      final List<Rect> rects = <Rect>[];
      for (final TextDirection direction in TextDirection.values) {
        await tester.pumpWidget(
          tanreiTestApp(
            Directionality(
              textDirection: direction,
              child: const SizedBox(
                height: 100,
                child: TanreiDivider(axis: Axis.vertical, inset: TanreiDividerInset.start),
              ),
            ),
          ),
        );
        rects.add(lineOf(tester).lineRect);
      }
      expect(rects.first, rects.last);
      expect(rects.first.top, tokens.lineInset);
    });

    testWidgets('DIV-4: the pixels of a right-to-left start inset mirror the left-to-right ones', (
      WidgetTester tester,
    ) async {
      const Widget divider = TanreiDivider(inset: TanreiDividerInset.start);
      final FramePixels ltr = await framePixels(tester, system: system, child: divider);
      final FramePixels rtl = await framePixels(
        tester,
        system: system,
        child: divider,
        textDirection: TextDirection.rtl,
      );
      final int width = ltr.width;
      final int height = ltr.bytes.length ~/ 4 ~/ width;
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          if (ltr.at(x, y) != rtl.at(width - 1 - x, y)) {
            fail('pixel ($x, $y) is not mirrored');
          }
        }
      }
    });
  });

  group('accessibility', () {
    testWidgets('DIV-5: a decorative divider (the default) is not in the semantics tree and is not '
        'focusable', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          Semantics(
            container: true,
            label: 'Group',
            child: const SizedBox(width: 200, child: TanreiDivider()),
          ),
        ),
      );
      final SemanticsNode group = tester.getSemantics(find.bySemanticsLabel('Group'));
      expect(group.childrenCount, 0);
      expect(group.label, 'Group');
      expect(
        find.descendant(of: find.byType(TanreiDivider), matching: find.byType(Focus)),
        findsNothing,
      );
      expect(FocusManager.instance.primaryFocus?.context?.widget, isNot(isA<TanreiDivider>()));
      handle.dispose();
    });

    testWidgets('DIV-6: excludeFromSemantics false makes the divider its own node — no name, no '
        'value, no actions, not focusable (Flutter has no separator '
        'role)', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          const SizedBox(width: 200, child: TanreiDivider(excludeFromSemantics: false)),
        ),
      );
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiDivider));
      final SemanticsData data = node.getSemanticsData();
      expect(data.label, isEmpty);
      expect(data.value, isEmpty);
      expect(data.hint, isEmpty);
      expect(data.actions, 0);
      expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);
      expect(node.rect.size, Size(200, tokens.lineThickness));
      handle.dispose();
    });

    testWidgets('DIV-5 / DIV-6: the node exists only when the divider is not decorative', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int nodes(WidgetTester tester) {
        int count = 0;
        void visit(SemanticsNode node) {
          count++;
          node.visitChildren((SemanticsNode child) {
            visit(child);
            return true;
          });
        }

        SemanticsNode root = tester.getSemantics(find.byType(WidgetsApp));
        while (root.parent != null) {
          root = root.parent!;
        }
        visit(root);
        return count;
      }

      await tester.pumpWidget(tanreiTestApp(const SizedBox(width: 200, child: TanreiDivider())));
      final int decorative = nodes(tester);
      await tester.pumpWidget(
        tanreiTestApp(
          const SizedBox(width: 200, child: TanreiDivider(excludeFromSemantics: false)),
        ),
      );
      expect(nodes(tester), decorative + 1);
      handle.dispose();
    });

    testWidgets('DIV-6: a divider takes no input: a tap on it reaches what lies underneath', (
      WidgetTester tester,
    ) async {
      int taps = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () => taps++,
            child: const SizedBox(width: 200, child: TanreiDivider(excludeFromSemantics: false)),
          ),
        ),
      );
      await tester.tapAt(tester.getCenter(find.byType(TanreiDivider)));
      expect(taps, 1);
    });

    for (final bool decorative in <bool>[true, false]) {
      testWidgets('guidelines: a ${decorative ? 'decorative' : 'separator'} divider between two '
          'controls', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(
          tanreiTestApp(
            SizedBox(
              width: 200,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  TanreiButton(onPressed: () {}, child: const Text('One')),
                  TanreiDivider(excludeFromSemantics: decorative),
                  TanreiButton(onPressed: () {}, child: const Text('Two')),
                ],
              ),
            ),
          ),
        );
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
        handle.dispose();
      });
    }
  });

  group('unknown values', () {
    testWidgets('DIV-7: an orientation or inset the divider does not define renders as the default '
        '(horizontal, none), pixel for pixel, and debug builds report it', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectUnknownValues();
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        child: dividerOf(<String, dynamic>{'orientation': 'diagonal', 'inset': 'middle'}),
      );
      expect(reports, <String>[
        'divider orientation "diagonal" -> horizontal',
        'divider inset "middle" -> none',
      ]);
      reports.clear();
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        child: const TanreiDivider(),
      );
      expect(reports, isEmpty);
      expect(unknown, defaults);
    });

    test('DIV-7: every name the spec defines is read as that value, and nothing is reported', () {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add(key);
      try {
        expect(TanreiDivider.axisFromName('horizontal'), Axis.horizontal);
        expect(TanreiDivider.axisFromName('vertical'), Axis.vertical);
        for (final TanreiDividerInset inset in TanreiDividerInset.values) {
          expect(TanreiDividerInset.fromName(inset.name), inset);
        }
        expect(reports, isEmpty);
      } finally {
        debugTanreiReportUnknownValue = previous;
      }
    });

    testWidgets('DIV-7: the default reporter reports an unknown value as a FlutterError, and the '
        'divider still renders', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(
          SizedBox(
            width: 200,
            child: TanreiDivider(inset: TanreiDividerInset.fromName('div-7-reported')),
          ),
        ),
      );
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('Unknown divider inset "div-7-reported"'));
      expect('$reported', contains('"none"'));
      expect(lineOf(tester).lineRect.left, 0);
    });
  });

  group('device pixels', () {
    for (final double ratio in <double>[1, 1.5, 2, 2.625, 3]) {
      testWidgets('DIV-8: at ${ratio}x the line is whole device pixels thick, at least one, and '
          'on the pixel grid — at a fractional position too', (WidgetTester tester) async {
        tester.view.devicePixelRatio = ratio;
        addTearDown(tester.view.reset);
        for (final double thickness in <double>[tokens.lineThickness, 0.25, 1.3]) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system.copyWith(divider: tokens.copyWith(lineThickness: thickness)),
          );
          for (final Axis axis in Axis.values) {
            await tester.pumpWidget(
              tanreiTestApp(
                Padding(
                  // A position between device pixels.
                  padding: const EdgeInsets.only(left: 10.3, top: 7.7),
                  child: SizedBox(
                    width: 100.2,
                    height: 60.1,
                    child: Align(
                      alignment: Alignment.topLeft,
                      child: SizedBox(
                        width: axis == Axis.horizontal ? 100.2 : null,
                        height: axis == Axis.vertical ? 60.1 : null,
                        child: TanreiDivider(axis: axis, inset: TanreiDividerInset.both),
                      ),
                    ),
                  ),
                ),
                theme: theme,
              ),
            );
            final RenderTanreiDividerLine line = lineOf(tester);
            final Rect global = line.lineRect.shift(line.localToGlobal(Offset.zero));
            final String where = '$axis, thickness $thickness';
            for (final double edge in <double>[
              global.left,
              global.top,
              global.right,
              global.bottom,
            ]) {
              expect(
                (edge * ratio - (edge * ratio).roundToDouble()).abs(),
                lessThan(1e-6),
                reason: '$where: edge $edge',
              );
            }
            final double across = axis == Axis.horizontal ? global.height : global.width;
            expect(across * ratio, greaterThanOrEqualTo(1 - 1e-6), reason: where);
            expect(
              (across * ratio).roundToDouble(),
              (thickness * ratio).roundToDouble() < 1 ? 1 : (thickness * ratio).roundToDouble(),
              reason: where,
            );
            // The layout box keeps the token's thickness (DIV-2).
            final Size size = tester.getSize(find.byType(TanreiDivider));
            expect(axis == Axis.horizontal ? size.height : size.width, thickness, reason: where);
          }
        }
      });
    }

    testWidgets('DIV-8: the golden frame has no partial pixel: every pixel of the line column is '
        'either the line color or the surface', (WidgetTester tester) async {
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        child: const TanreiDivider(axis: Axis.vertical),
      );
      final Color surface = lightTheme.colors.surface;
      final Color line = Color.alphaBlend(lightTheme.paint(tokens.lineColor), surface);
      final int y = (goldenSurface.height * goldenPixelRatio / 2).floor();
      int lineColumns = 0;
      for (int x = 0; x < pixels.width; x++) {
        final Color color = pixels.at(x, y);
        expect(nearColor(color, line) || color == surface, isTrue, reason: 'column $x is $color');
        if (nearColor(color, line)) {
          lineColumns++;
        }
      }
      expect(lineColumns, (tokens.lineThickness * goldenPixelRatio).round());
    });
  });

  group('a design system drives rendering', () {
    testWidgets('thickness, inset and color of a product system drive the divider', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        divider: tokens.copyWith(
          lineThickness: 3,
          lineInset: 24,
          lineColor: const TanreiPaint.role(TanreiColorRole.error),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          const SizedBox(width: 200, child: TanreiDivider(inset: TanreiDividerInset.start)),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(tester.getSize(find.byType(TanreiDivider)), const Size(200, 3));
      final RenderTanreiDividerLine line = lineOf(tester);
      expect(line.lineRect.left, 24);
      expect(line.lineRect.height, 3);
      expect(line.color, product.schemes.light.error);
    });

    testWidgets('a transparent line color draws nothing, and the divider keeps its size', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        divider: tokens.copyWith(lineColor: const TanreiPaint.none()),
      );
      final FramePixels pixels = await framePixels(
        tester,
        system: product,
        child: const TanreiDivider(),
      );
      final FramePixels empty = await framePixels(
        tester,
        system: product,
        child: SizedBox(height: tokens.lineThickness),
      );
      expect(pixels, empty);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the divider reads the tokens of that system in every scheme', (
        WidgetTester tester,
      ) async {
        for (final Brightness brightness in Brightness.values) {
          for (final TanreiContrast contrast in TanreiContrast.values) {
            final TanreiThemeData theme = TanreiThemeData(
              system: shipped,
              brightness: brightness,
              contrast: contrast,
            );
            await tester.pumpWidget(
              tanreiTestApp(
                const SizedBox(width: 200, child: TanreiDivider(inset: TanreiDividerInset.both)),
                theme: theme,
              ),
            );
            final RenderTanreiDividerLine line = lineOf(tester);
            expect(line.color, theme.paint(shipped.divider.lineColor));
            expect(line.lineRect.left, shipped.divider.lineInset);
            expect(
              tester.getSize(find.byType(TanreiDivider)).height,
              shipped.divider.lineThickness,
            );
          }
        }
      });
    }

    test('the tokens the widget reads: the defaults (a hairline of outline-variant, inset 16)', () {
      expect(tokens.lineThickness, system.measure.borderHairline);
      expect(tokens.lineInset, system.space.space200);
      expect(tokens.lineColor, const TanreiPaint.role(TanreiColorRole.outlineVariant));
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('divider');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'horizontal',
        'horizontal-inset-start',
        'horizontal-inset-both',
        'vertical',
        'vertical-inset-start',
        'vertical-inset-both',
        'horizontal-separator',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: dividerOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/divider/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the inset shows the preset's
    // inset length as well as its color and thickness.
    const String recorded = 'horizontal-inset-start';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: dividerOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/divider/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
