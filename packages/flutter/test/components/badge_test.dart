import 'package:flutter/foundation.dart';
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
final TanreiBadgeTokens tokens = system.badge;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The `notifications` glyph of Material Symbols, drawn as text (a box in the Flutter test font).
const String notificationsGlyph = '\u{e7f4}';

/// The anchor of the tests and baselines: an icon of `sys.icon.large` (24 in the default
/// system), drawn as the system draws an icon, in on-surface-variant.
const Key anchorKey = ValueKey<String>('anchor');

Widget anchorIcon() => const _Anchor(key: anchorKey);

class _Anchor extends StatelessWidget {
  const _Anchor({super.key});

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final double size = theme.system.measure.iconLarge;
    return SizedBox.square(
      dimension: size,
      child: TanreiControlIcon(
        icon: const Text(notificationsGlyph),
        size: size,
        selected: false,
        color: theme.colors.onSurfaceVariant,
      ),
    );
  }
}

/// The badge of a spec [fixture] on the icon its content names, whose accessible name is that
/// glyph name; the badge adds the fixture's label as the value (the spec's `default` slot).
TanreiBadge badgeOf(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return TanreiBadge(
    count: props['count'] as num?,
    max: props['max'] as num? ?? TanreiBadge.defaultMax,
    semanticLabel: props['label'] as String? ?? '',
    child: Semantics(label: fixture['content'] as String, child: anchorIcon()),
  );
}

/// The drawn dot or pill: the box inside the badge's layout.
Finder get markFinder =>
    find.descendant(of: find.byType(CustomSingleChildLayout), matching: find.byType(DecoratedBox));

Rect markRect(WidgetTester tester) => tester.getRect(markFinder);

TanreiContainerDecoration markDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(markFinder).decoration as TanreiContainerDecoration;

/// The drawn number, if any.
Finder get numberFinder =>
    find.descendant(of: find.byType(CustomSingleChildLayout), matching: find.byType(Text));

String drawnText(WidgetTester tester) => tester.widget<Text>(numberFinder).data!;

void main() {
  group('forms', () {
    testWidgets('BDG-1: a null count draws a dot of dot.size in the container color, centered '
        'dot.offset inside the top-end corner, with no label', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(TanreiBadge(semanticLabel: 'New', child: anchorIcon())),
      );
      final Rect anchor = tester.getRect(find.byKey(anchorKey));
      final Rect dot = markRect(tester);
      expect(dot.size, Size.square(tokens.dotSize));
      expect(dot.center, Offset(anchor.right - tokens.dotOffset, anchor.top + tokens.dotOffset));
      expect(markDecoration(tester).color, lightTheme.paint(tokens.containerColor));
      expect(numberFinder, findsNothing);
    });

    testWidgets('BDG-1: the dot is a circle whatever corners the container has', (
      WidgetTester tester,
    ) async {
      for (final double shape in <double>[0, 2, 9999]) {
        final TanreiSystem squared = system.copyWith(badge: tokens.copyWith(containerShape: shape));
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiBadge(semanticLabel: 'New', child: anchorIcon()),
            theme: TanreiThemeData(system: squared),
          ),
        );
        expect(markDecoration(tester).shape.radius, tokens.dotSize / 2, reason: '$shape');
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiBadge(count: 42, child: anchorIcon()),
            theme: TanreiThemeData(system: squared),
          ),
        );
        // The pill keeps the container's corners.
        expect(markDecoration(tester).shape.radius, shape, reason: '$shape');
      }
    });

    testWidgets('BDG-2: a count draws a pill at least container.height high and as wide as high, '
        'padding-inline either side of a centered label in the label style and color', (
      WidgetTester tester,
    ) async {
      for (final int count in <int>[3, 42, 1200]) {
        await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: count, child: anchorIcon())));
        final Rect pill = markRect(tester);
        final Rect label = tester.getRect(numberFinder);
        expect(pill.height, greaterThanOrEqualTo(tokens.containerHeight), reason: '$count');
        expect(pill.width, greaterThanOrEqualTo(pill.height), reason: '$count');
        expect(label.center.dx, moreOrLessEquals(pill.center.dx), reason: '$count');
        expect(label.center.dy, moreOrLessEquals(pill.center.dy), reason: '$count');
        if (pill.width > pill.height) {
          expect(label.left - pill.left, tokens.containerPaddingInline, reason: '$count');
          expect(pill.right - label.right, tokens.containerPaddingInline, reason: '$count');
        }
        final TanreiContainerDecoration decoration = markDecoration(tester);
        expect(decoration.color, lightTheme.paint(tokens.containerColor));
        expect(decoration.shape.radius, tokens.containerShape);
        expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
        final TextStyle style = tester.widget<Text>(numberFinder).style!;
        expect(style.color, lightTheme.paint(tokens.labelColor));
        expect(style.fontSize, tokens.labelTypescale.size);
        expect(style.height, tokens.labelTypescale.lineHeight / tokens.labelTypescale.size);
      }
    });

    testWidgets('BDG-3: the pill\'s leading circle is centered container.offset inside the '
        'top-end corner, and a longer count grows toward the end', (WidgetTester tester) async {
      final List<Rect> pills = <Rect>[];
      for (final int count in <int>[3, 42, 1200]) {
        await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: count, child: anchorIcon())));
        final Rect anchor = tester.getRect(find.byKey(anchorKey));
        final Rect pill = markRect(tester);
        final Offset circleCenter = Offset(pill.left + pill.height / 2, pill.center.dy);
        expect(
          circleCenter,
          Offset(anchor.right - tokens.containerOffset, anchor.top + tokens.containerOffset),
          reason: '$count',
        );
        pills.add(pill.shift(-anchor.topLeft));
      }
      // Same start, growing end.
      expect(pills.map((Rect r) => r.left).toSet(), hasLength(1));
      expect(pills[0].right, lessThan(pills[1].right));
      expect(pills[1].right, lessThan(pills[2].right));
    });

    testWidgets('BDG-4: a count above max shows max followed by a plus sign, otherwise the count '
        'in full', (WidgetTester tester) async {
      final Map<(int, int), String> expected = <(int, int), String>{
        (1, 999): '1',
        (999, 999): '999',
        (1000, 999): '999+',
        (1200, 999): '999+',
        (99, 99): '99',
        (120, 99): '99+',
        (123456, 999999): '123456',
      };
      for (final MapEntry<(int, int), String> entry in expected.entries) {
        await tester.pumpWidget(
          tanreiTestApp(TanreiBadge(count: entry.key.$1, max: entry.key.$2, child: anchorIcon())),
        );
        expect(drawnText(tester), entry.value, reason: '${entry.key}');
        expect(
          TanreiBadge.displayText(entry.key.$1, max: entry.key.$2),
          entry.value,
          reason: '${entry.key}',
        );
      }
      // The default max is the spec's.
      expect(const TanreiBadge(count: 5, child: SizedBox()).max, 999);
    });

    testWidgets('BDG-5: a count of 0 draws nothing and the anchor renders and is announced as it '
        'would without a badge', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      Widget button() => TanreiIconButton(
        key: anchorKey,
        onPressed: () {},
        semanticLabel: 'Inbox',
        icon: const Text(notificationsGlyph),
      );
      final FramePixels bare = await framePixels(tester, system: system, child: button());
      final SemanticsData bareData = tester.getSemantics(find.byKey(anchorKey)).getSemanticsData();
      final Rect bareRect = tester.getRect(find.byKey(anchorKey));

      final FramePixels zero = await framePixels(
        tester,
        system: system,
        child: TanreiBadge(count: 0, semanticLabel: 'No unread messages', child: button()),
      );
      expect(zero, bare);
      expect(tester.getRect(find.byKey(anchorKey)), bareRect);
      expect(markFinder, findsNothing);
      final SemanticsData data = tester.getSemantics(find.byKey(anchorKey)).getSemanticsData();
      expect(data.label, bareData.label);
      expect(data.value, isEmpty);
      expect(data.value, bareData.value);
      expect(data.flags, bareData.flags);
      expect(data.actions, bareData.actions);
      handle.dispose();
    });

    testWidgets('BDG-6: the outline is outline.width of outline.color outside the edge, and does '
        'not change the badge\'s size or position', (WidgetTester tester) async {
      for (final int? count in <int?>[null, 42]) {
        await tester.pumpWidget(
          tanreiTestApp(TanreiBadge(count: count, semanticLabel: 'x', child: anchorIcon())),
        );
        final BorderSide side = markDecoration(tester).border!.top;
        expect(side.color, lightTheme.paint(tokens.outlineColor));
        expect(side.width, tokens.outlineWidth);
        expect(side.strokeAlign, BorderSide.strokeAlignOutside);
        final Rect withOutline = markRect(tester);

        final TanreiSystem wide = system.copyWith(badge: tokens.copyWith(outlineWidth: 6));
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiBadge(count: count, semanticLabel: 'x', child: anchorIcon()),
            theme: TanreiThemeData(system: wide),
          ),
        );
        expect(markRect(tester), withOutline, reason: '$count');
      }
    });

    testWidgets('BDG-6: the pixels: the outline ring surrounds the dot outside its edge', (
      WidgetTester tester,
    ) async {
      final TanreiSystem ringed = system.copyWith(
        badge: tokens.copyWith(outlineColor: const TanreiPaint.role(TanreiColorRole.error)),
      );
      final FramePixels pixels = await framePixels(
        tester,
        system: ringed,
        child: TanreiBadge(semanticLabel: 'New', child: anchorIcon()),
      );
      final Rect dot = markRect(tester);
      final Color error = ringed.schemes.light.error;
      // Just outside the dot's edge: the ring; at its center: the container.
      expect(pixels.atLogical(dot.center), looksLike(lightTheme.paint(tokens.containerColor)));
      expect(
        pixels.atLogical(Offset(dot.center.dx, dot.top - tokens.outlineWidth / 2)),
        looksLike(error),
      );
      expect(
        pixels.atLogical(Offset(dot.right + tokens.outlineWidth / 2 - 0.5, dot.center.dy)),
        looksLike(error),
      );
    });
  });

  group('placement and input', () {
    testWidgets('BDG-7: the anchor keeps its size and position, the badge takes no space in the '
        'layout, and it may extend past the anchor', (WidgetTester tester) async {
      Widget row(Widget anchor) => Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          anchor,
          const SizedBox.square(key: ValueKey<String>('next'), dimension: 10),
        ],
      );
      await tester.pumpWidget(tanreiTestApp(row(anchorIcon())));
      final Rect bareAnchor = tester.getRect(find.byKey(anchorKey));
      final Rect bareNext = tester.getRect(find.byKey(const ValueKey<String>('next')));

      for (final int? count in <int?>[null, 3, 1200]) {
        await tester.pumpWidget(
          tanreiTestApp(row(TanreiBadge(count: count, semanticLabel: 'x', child: anchorIcon()))),
        );
        expect(tester.getRect(find.byKey(anchorKey)), bareAnchor, reason: '$count');
        expect(tester.getRect(find.byKey(const ValueKey<String>('next'))), bareNext);
        expect(tester.getSize(find.byType(TanreiBadge)), bareAnchor.size);
      }
      // The long pill extends past the anchor's end.
      expect(markRect(tester).right, greaterThan(bareAnchor.right));
    });

    testWidgets('BDG-7: tight constraints reach the anchor unchanged', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(
          SizedBox(
            width: 100,
            height: 40,
            child: TanreiBadge(count: 3, child: Container(key: anchorKey)),
          ),
        ),
      );
      expect(tester.getSize(find.byKey(anchorKey)), const Size(100, 40));
    });

    testWidgets('BDG-7: pointer and touch over the badge reach the anchor; the badge takes no '
        'keyboard focus', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiBadge(
            count: 3,
            child: TanreiIconButton(
              onPressed: () => pressed++,
              semanticLabel: 'Inbox',
              icon: const Text(notificationsGlyph),
            ),
          ),
        ),
      );
      final Rect pill = markRect(tester);
      final Rect button = tester.getRect(find.byType(TanreiIconButton));
      // A point on the pill that is also over the button.
      final Offset over = Offset((pill.left + button.right) / 2, (pill.bottom + pill.top) / 2);
      expect(button.contains(over), isTrue);
      await tester.tapAt(over);
      await tester.pumpAndSettle();
      expect(pressed, 1);
      expect(
        find.descendant(of: find.byType(CustomSingleChildLayout), matching: find.byType(Focus)),
        findsNothing,
      );
    });
  });

  group('accessibility', () {
    Widget inbox({num? count, String label = ''}) => TanreiBadge(
      count: count,
      semanticLabel: label,
      child: TanreiIconButton(
        onPressed: () {},
        semanticLabel: 'Inbox',
        icon: const Text(notificationsGlyph),
      ),
    );

    testWidgets('BDG-8: the anchor is announced with its own name followed by the label, as one '
        'node; the drawn number is hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(inbox(count: 3, label: '3 unread')));
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiIconButton));
      expect(
        node,
        matchesSemantics(
          label: 'Inbox',
          value: '3 unread',
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      expect(find.bySemanticsLabel('3'), findsNothing);
      expect(node.getSemanticsData().label, isNot(contains('3')));
      handle.dispose();
    });

    testWidgets('BDG-8: without a label the displayed text is added (999+), and a dot adds its '
        'label', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(inbox(count: 1200)));
      expect(tester.getSemantics(find.byType(TanreiIconButton)).value, '999+');
      await tester.pumpWidget(tanreiTestApp(inbox(label: 'New messages')));
      // The merged node: the anchor's name and the badge's label.
      final SemanticsData dot = tester
          .getSemantics(find.byType(TanreiIconButton))
          .getSemanticsData();
      expect(dot.label, 'Inbox');
      expect(dot.value, 'New messages');
      handle.dispose();
    });

    testWidgets('BDG-9: a dot without a label still renders, and debug builds report it once — '
        'not on every build', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(child: anchorIcon())));
      expect(markRect(tester).size, Size.square(tokens.dotSize));
      expect(reports, <String>['badge']);
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(child: anchorIcon())));
      expect(reports, hasLength(1));
      // A count, or a label, is not reported; losing the label again is.
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: 2, child: anchorIcon())));
      await tester.pumpWidget(
        tanreiTestApp(TanreiBadge(semanticLabel: 'New', child: anchorIcon())),
      );
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(semanticLabel: ' ', child: anchorIcon())));
      expect(reports, hasLength(2));
    });

    testWidgets('BDG-9: the default reporter reports a FlutterError that says what to set', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(child: anchorIcon())));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('badge has no accessible name'));
      expect('$reported', contains('semanticLabel'));
      expect(markFinder, findsOneWidget);
    });

    testWidgets('BDG-10: a new count or label updates the anchor\'s value, and nothing is '
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
      await tester.pumpWidget(tanreiTestApp(inbox(count: 3)));
      expect(tester.getSemantics(find.byType(TanreiIconButton)).value, '3');
      await tester.pumpWidget(tanreiTestApp(inbox(count: 4)));
      SemanticsNode node = tester.getSemantics(find.byType(TanreiIconButton));
      expect(node.value, '4');
      expect(node.getSemanticsData().hasFlag(SemanticsFlag.isLiveRegion), isFalse);
      await tester.pumpWidget(tanreiTestApp(inbox(count: 4, label: '4 unread')));
      node = tester.getSemantics(find.byType(TanreiIconButton));
      expect(node.value, '4 unread');
      expect(announcements, isEmpty);
      handle.dispose();
    });

    testWidgets('BDG-10: the anchor keeps its state (focus) when the count changes', (
      WidgetTester tester,
    ) async {
      final FocusNode focus = FocusNode();
      addTearDown(focus.dispose);
      Widget withCount(int count) => TanreiBadge(
        count: count,
        child: TanreiIconButton(
          focusNode: focus,
          onPressed: () {},
          semanticLabel: 'Inbox',
          icon: const Text(notificationsGlyph),
        ),
      );
      await tester.pumpWidget(tanreiTestApp(withCount(0)));
      focus.requestFocus();
      await tester.pump();
      await tester.pumpWidget(tanreiTestApp(withCount(3)));
      await tester.pumpWidget(tanreiTestApp(withCount(0)));
      expect(focus.hasPrimaryFocus, isTrue);
    });

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: an icon button with a count on ${theme.brightness.name}', (
        WidgetTester tester,
      ) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(tanreiTestApp(inbox(count: 1200, label: 'Many'), theme: theme));
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        handle.dispose();
      });
    }

    // The number is text: 4.5:1 on its container; the container is a graphic: 3:1 against the
    // outline that separates it from its anchor.
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('contrast: the number on the container (4.5:1) and the container against its outline '
            '(3:1) in the ${brightness.name} ${contrast.name} scheme', () {
          final Color container = Color.alphaBlend(
            theme.paint(tokens.containerColor),
            theme.colors.surface,
          );
          final Color label = Color.alphaBlend(theme.paint(tokens.labelColor), container);
          final Color outline = Color.alphaBlend(
            theme.paint(tokens.outlineColor),
            theme.colors.surface,
          );
          expect(contrastOf(label, container), greaterThanOrEqualTo(4.5));
          expect(contrastOf(container, outline), greaterThanOrEqualTo(3));
        });
      }
    }
  });

  group('direction, digits and text size', () {
    testWidgets('BDG-11: right-to-left takes the top-left corner and grows to the left', (
      WidgetTester tester,
    ) async {
      Widget rtl(Widget child) => Directionality(textDirection: TextDirection.rtl, child: child);
      await tester.pumpWidget(
        tanreiTestApp(rtl(TanreiBadge(semanticLabel: 'New', child: anchorIcon()))),
      );
      Rect anchor = tester.getRect(find.byKey(anchorKey));
      expect(
        markRect(tester).center,
        Offset(anchor.left + tokens.dotOffset, anchor.top + tokens.dotOffset),
      );

      final List<Rect> pills = <Rect>[];
      for (final int count in <int>[3, 1200]) {
        await tester.pumpWidget(tanreiTestApp(rtl(TanreiBadge(count: count, child: anchorIcon()))));
        anchor = tester.getRect(find.byKey(anchorKey));
        final Rect pill = markRect(tester);
        expect(
          Offset(pill.right - pill.height / 2, pill.center.dy),
          Offset(anchor.left + tokens.containerOffset, anchor.top + tokens.containerOffset),
        );
        pills.add(pill);
      }
      expect(pills.first.right, pills.last.right);
      expect(pills.last.left, lessThan(pills.first.left));
    });

    testWidgets('BDG-11: the label is isolated left to right, so a capped count keeps its plus '
        'sign after the digits in a right-to-left layout', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(
          Directionality(
            textDirection: TextDirection.rtl,
            child: TanreiBadge(count: 1200, child: anchorIcon()),
          ),
        ),
      );
      expect(tester.widget<Text>(numberFinder).textDirection, TextDirection.ltr);
      final RenderParagraph paragraph = tester.renderObject(numberFinder);
      Rect boxOf(int index) => paragraph
          .getBoxesForSelection(TextSelection(baseOffset: index, extentOffset: index + 1))
          .single
          .toRect();
      expect(drawnText(tester), '999+');
      expect(boxOf(3).left, greaterThanOrEqualTo(boxOf(2).right - 0.01));
      expect(boxOf(0).right, lessThanOrEqualTo(boxOf(1).left + 0.01));
    });

    testWidgets('BDG-12: the locale\'s digits, no grouping separator, and tabular figures', (
      WidgetTester tester,
    ) async {
      final Map<Locale, String> expected = <Locale, String>{
        const Locale('en', 'US'): '1200',
        const Locale('ar'): '١٢٠٠',
        const Locale('ar', 'MA'): '1200',
        const Locale('fa'): '۱۲۰۰',
        const Locale('bn'): '১২০০',
        const Locale('hi'): '1200',
        const Locale('de'): '1200',
      };
      for (final MapEntry<Locale, String> entry in expected.entries) {
        await tester.pumpWidget(
          tanreiTestApp(
            Localizations(
              locale: entry.key,
              delegates: const <LocalizationsDelegate<dynamic>>[
                DefaultWidgetsLocalizations.delegate,
              ],
              child: TanreiBadge(count: 1200, max: 9999, child: anchorIcon()),
            ),
          ),
        );
        expect(drawnText(tester), entry.value, reason: '${entry.key}');
      }
      expect(
        TanreiBadge.displayText(1200, locale: const Locale('ar')),
        '٩٩٩+',
        reason: 'the cap in the locale\'s digits, the plus sign kept',
      );
      final TextStyle style = tester.widget<Text>(numberFinder).style!;
      expect(style.fontFeatures, contains(const FontFeature.tabularFigures()));
    });

    testWidgets('BDG-12: the accessible text without a label is the displayed text, in the '
        'locale\'s digits', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          Localizations(
            locale: const Locale('ar'),
            delegates: const <LocalizationsDelegate<dynamic>>[DefaultWidgetsLocalizations.delegate],
            child: TanreiBadge(
              count: 3,
              child: Semantics(container: true, label: 'Inbox', child: anchorIcon()),
            ),
          ),
        ),
      );
      expect(tester.getSemantics(find.byType(TanreiBadge)).value, '٣');
      handle.dispose();
    });

    testWidgets('BDG-13: enlarged text grows the pill with its label and keeps the leading '
        'circle\'s placement; the dot keeps its size', (WidgetTester tester) async {
      Widget scaled(Widget child) => Builder(
        builder: (BuildContext context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2)),
          child: child,
        ),
      );
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: 3, child: anchorIcon())));
      final Rect normal = markRect(tester);
      await tester.pumpWidget(tanreiTestApp(scaled(TanreiBadge(count: 3, child: anchorIcon()))));
      final Rect large = markRect(tester);
      final Rect anchor = tester.getRect(find.byKey(anchorKey));
      expect(large.height, greaterThan(normal.height));
      expect(large.height, tokens.labelTypescale.lineHeight * 2);
      expect(large.width, greaterThan(normal.width));
      expect(
        Offset(large.left + large.height / 2, large.center.dy),
        Offset(anchor.right - tokens.containerOffset, anchor.top + tokens.containerOffset),
      );

      await tester.pumpWidget(
        tanreiTestApp(scaled(TanreiBadge(semanticLabel: 'New', child: anchorIcon()))),
      );
      expect(markRect(tester).size, Size.square(tokens.dotSize));
    });
  });

  group('values out of range', () {
    testWidgets('BDG-14: a negative count renders as 0, a fractional one rounded down, a max '
        'below 1 as 999; debug builds report each', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: -3, child: anchorIcon())));
      expect(markFinder, findsNothing);
      expect(reports, <String>['badge count "-3" -> 0']);

      reports.clear();
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: 2.7, child: anchorIcon())));
      expect(drawnText(tester), '2');
      expect(reports, <String>['badge count "2.7" -> 2']);

      reports.clear();
      await tester.pumpWidget(tanreiTestApp(TanreiBadge(count: 1200, max: 0, child: anchorIcon())));
      expect(drawnText(tester), '999+');
      expect(reports, <String>['badge max "0" -> 999']);

      reports.clear();
      await tester.pumpWidget(
        tanreiTestApp(TanreiBadge(count: double.nan, max: -5, child: anchorIcon())),
      );
      expect(markFinder, findsNothing);
      expect(reports, <String>['badge max "-5" -> 999', 'badge count "NaN" -> 0']);

      // Rebuilt with the same values: not reported again.
      reports.clear();
      await tester.pumpWidget(
        tanreiTestApp(TanreiBadge(count: double.nan, max: -5, child: anchorIcon())),
      );
      expect(reports, isEmpty);
    });

    testWidgets('BDG-14: a count that is not a number renders as for 0 — nothing drawn, nothing '
        'announced, the anchor as it is — and debug builds report it', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectUnknownValues();
      Widget inbox(num? count) => TanreiBadge(
        count: count,
        semanticLabel: '3 unread',
        child: TanreiIconButton(
          onPressed: () {},
          semanticLabel: 'Inbox',
          icon: const Text(notificationsGlyph),
        ),
      );
      await tester.pumpWidget(tanreiTestApp(inbox(0)));
      final SemanticsData zero = tester
          .getSemantics(find.byType(TanreiIconButton))
          .getSemanticsData();
      expect(reports, isEmpty);
      await tester.pumpWidget(tanreiTestApp(inbox(double.nan)));
      expect(markFinder, findsNothing);
      expect(numberFinder, findsNothing);
      final SemanticsData nan = tester
          .getSemantics(find.byType(TanreiIconButton))
          .getSemanticsData();
      expect(nan.label, 'Inbox');
      expect(nan.value, isEmpty);
      expect(nan.label, zero.label);
      expect(nan.value, zero.value);
      expect(reports, <String>['badge count "NaN" -> 0']);
      expect(TanreiBadge.displayText(double.nan), isNull);
      handle.dispose();
    });

    testWidgets('BDG-14: a valid count and max are not reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      for (final num? count in <num?>[null, 0, 1, 42, 5.0]) {
        await tester.pumpWidget(
          tanreiTestApp(TanreiBadge(count: count, semanticLabel: 'x', child: anchorIcon())),
        );
      }
      expect(reports, isEmpty);
    });

    test('BDG-14: displayText reads the values the same way, and reports nothing', () {
      expect(TanreiBadge.displayText(-1), isNull);
      expect(TanreiBadge.displayText(0), isNull);
      expect(TanreiBadge.displayText(null), isNull);
      expect(TanreiBadge.displayText(9.99), '9');
      expect(TanreiBadge.displayText(5000, max: 0.5), '999+');
      expect(TanreiBadge.displayText(double.infinity), '999+');
    });
  });

  group('a design system drives rendering', () {
    testWidgets('sizes, offsets, shape and colors of a product system drive the badge', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        badge: tokens.copyWith(
          dotSize: 10,
          dotOffset: 5,
          containerHeight: 20,
          containerOffset: 3,
          containerPaddingInline: 7,
          containerShape: 0,
          containerColor: const TanreiPaint.role(TanreiColorRole.error),
          labelColor: const TanreiPaint.role(TanreiColorRole.onError),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiBadge(semanticLabel: 'New', child: anchorIcon()),
          theme: theme,
        ),
      );
      Rect anchor = tester.getRect(find.byKey(anchorKey));
      expect(markRect(tester).size, const Size.square(10));
      expect(markRect(tester).center, Offset(anchor.right - 5, anchor.top + 5));
      expect(markDecoration(tester).color, product.schemes.light.error);

      await tester.pumpWidget(
        tanreiTestApp(TanreiBadge(count: 1200, child: anchorIcon()), theme: theme),
      );
      anchor = tester.getRect(find.byKey(anchorKey));
      final Rect pill = markRect(tester);
      expect(pill.height, 20);
      expect(Offset(pill.left + 10, pill.center.dy), Offset(anchor.right - 3, anchor.top + 3));
      expect(tester.getRect(numberFinder).left - pill.left, 7);
      expect(markDecoration(tester).shape.radius, 0);
      expect(tester.widget<Text>(numberFinder).style!.color, product.schemes.light.onError);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the badge reads the tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiBadgeTokens t = shipped.badge;
        await tester.pumpWidget(
          tanreiTestApp(TanreiBadge(count: 42, child: anchorIcon()), theme: theme),
        );
        expect(markRect(tester).height, greaterThanOrEqualTo(t.containerHeight));
        expect(markDecoration(tester).color, theme.paint(t.containerColor));
        expect(markDecoration(tester).border!.top.color, theme.paint(t.outlineColor));
        expect(tester.widget<Text>(numberFinder).style!.color, theme.paint(t.labelColor));
        expect(tester.widget<Text>(numberFinder).style!.fontSize, t.labelTypescale.size);
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiBadge(semanticLabel: 'New', child: anchorIcon()),
            theme: theme,
          ),
        );
        expect(markRect(tester).size, Size.square(t.dotSize));
      });
    }

    test('the tokens the widget reads: the defaults (dot 6, pill 16, primary on the surface '
        'outline)', () {
      expect(tokens.dotSize, 6);
      expect(tokens.dotOffset, system.space.space25);
      expect(tokens.containerHeight, 16);
      expect(tokens.containerPaddingInline, system.space.space50);
      expect(tokens.containerOffset, system.space.space0);
      expect(tokens.containerShape, system.shape.full);
      expect(tokens.containerColor, const TanreiPaint.role(TanreiColorRole.primary));
      expect(tokens.labelColor, const TanreiPaint.role(TanreiColorRole.onPrimary));
      expect(tokens.labelTypescale, system.typescale.labelSmall);
      expect(tokens.outlineColor, const TanreiPaint.role(TanreiColorRole.surface));
      expect(tokens.outlineWidth, system.measure.borderThick);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('badge');

    testWidgets('BDG-8: a fixture\'s anchor is named by its glyph name, and the badge adds the '
        'fixture\'s label as the value — the label is read once (the spec\'s default slot)', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Map<String, dynamic> fixture = fixtures.singleWhere(
        (Map<String, dynamic> f) => f['id'] == 'count-single',
      );
      final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
      await tester.pumpWidget(tanreiTestApp(badgeOf(fixture)));
      final SemanticsData data = tester.getSemantics(find.byType(TanreiBadge)).getSemanticsData();
      expect(data.label, fixture['content']);
      expect(data.label, 'notifications');
      expect(data.value, props['label']);
      expect(data.label, isNot(contains(props['label'] as String)));
      handle.dispose();
    });

    test('the spec lists the fixtures this suite records, each on the notifications icon', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'dot',
        'count-single',
        'count-double',
        'count-overflow',
        'count-custom-max',
        'count-zero',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String>{
        'notifications',
      });
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: badgeOf(fixture),
          file: 'goldens/badge/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: two digits show the pill's
    // height, padding, colors and label style at once.
    const String recorded = 'count-double';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: badgeOf(representative),
          file: 'goldens/badge/${preset.id}/$recorded.png',
        );
      });
    }
  });

  test('debugFillProperties names the dot', () {
    final DiagnosticPropertiesBuilder builder = DiagnosticPropertiesBuilder();
    TanreiBadge(child: anchorIcon()).debugFillProperties(builder);
    expect(builder.properties.map((DiagnosticsNode p) => p.toString()), contains('count: dot'));
  });
}
