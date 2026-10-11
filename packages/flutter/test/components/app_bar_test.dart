import 'dart:math' as math;

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
final TanreiAppBarTokens barTokens = system.appBar;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The width of every bar in these tests and baselines.
const double barWidth = 360;

/// The frame of the app bar baselines: a bar 360 wide inside the `space200` padding of every
/// baseline, tall enough for an expanded large bar with a subtitle (56 + 40 + 22 + 12 = 130).
const Size appBarGoldenSurface = Size(392, 170);

/// The fixtures' glyphs, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'arrow_back': 0xe5c4,
  'search': 0xe8b6,
  'more_vert': 0xe5d4,
  'share': 0xe80d,
  'menu': 0xe5d2,
  'account_circle': 0xe853,
};

Widget glyph(String name) => Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// A standard icon button as a fixture's navigation or action item: its glyph and its
/// label.
TanreiIconButton itemButton(String label, String icon, {FocusNode? focusNode}) => TanreiIconButton(
  onPressed: () {},
  icon: glyph(icon),
  semanticLabel: label,
  focusNode: focusNode,
);

/// The bar a fixture describes: 360 wide, its navigation item as `leading` and its action items
/// as `actions`, in order.
Widget fixtureAppBar(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Map<String, dynamic>> items = ((fixture['items'] as List<dynamic>?) ?? <dynamic>[])
      .cast<Map<String, dynamic>>();
  TanreiIconButton button(Map<String, dynamic> item) => itemButton(
    (item['props'] as Map<String, dynamic>)['label'] as String,
    item['content'] as String,
  );
  final Map<String, dynamic>? navigation = items
      .where((Map<String, dynamic> i) => i['kind'] == 'navigation')
      .firstOrNull;
  return SizedBox(
    width: barWidth,
    child: TanreiAppBar(
      leading: navigation == null ? null : button(navigation),
      actions: <Widget>[
        for (final Map<String, dynamic> item in items)
          if (item['kind'] == 'action') button(item),
      ],
      title: props['title'] as String? ?? '',
      subtitle: props['subtitle'] as String? ?? '',
      size: TanreiAppBarSize(props['size'] as String? ?? 'small'),
      centerTitle: props['titleAlignment'] == 'center',
      scrolledUnder: props['scrolled'] == true,
    ),
  );
}

/// The small bar of most tests: back, the title, search and more.
TanreiAppBar smallBar({
  String title = 'Inbox',
  String subtitle = '',
  bool centerTitle = false,
  bool? scrolledUnder,
  TanreiAppBarSize size = TanreiAppBarSize.small,
  bool leading = true,
  int actions = 2,
}) => TanreiAppBar(
  leading: leading ? itemButton('Back', 'arrow_back') : null,
  actions: <Widget>[
    for (int i = 0; i < actions; i++) itemButton('Action $i', i.isEven ? 'search' : 'more_vert'),
  ],
  title: title,
  subtitle: subtitle,
  size: size,
  centerTitle: centerTitle,
  scrolledUnder: scrolledUnder,
);

/// [child] in the test app, [width] wide, with the given system insets, text scale and direction.
Widget barApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
  double width = barWidth,
  double? height,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: padding, textScaler: textScaler),
      child: Directionality(
        textDirection: textDirection,
        child: SizedBox(width: width, height: height, child: child),
      ),
    ),
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

/// The bar's container: the first container decoration under [of] (the icon buttons' are deeper).
Finder containerOf([Finder? of]) => find
    .descendant(
      of: of ?? find.byType(TanreiAppBar),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, [Finder? of]) =>
    tester.widget<DecoratedBox>(containerOf(of)).decoration as TanreiContainerDecoration;

/// The color and width of the bar's bottom edge, as it paints them.
({Color color, double width}) edgeOf(WidgetTester tester, [Finder? of]) {
  final CustomPaint paint = tester.widget<CustomPaint>(
    find
        .descendant(
          of: of ?? find.byType(TanreiAppBar),
          matching: find.byWidgetPredicate(
            (Widget w) => w is CustomPaint && w.foregroundPainter != null,
          ),
        )
        .first,
  );
  final TanreiEdgePainter painter = paint.foregroundPainter! as TanreiEdgePainter;
  expect(painter.side, TanreiEdgeSide.bottom);
  return (color: painter.color, width: painter.width);
}

RenderTanreiAppBarLayout layoutOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiAppBarLayout>().toSet().single;

/// The text widgets that show [text], with their style.
List<TextStyle> stylesOf(WidgetTester tester, String text) => <TextStyle>[
  for (final Element element in find.text(text).evaluate())
    tester
        .widget<RichText>(
          find.descendant(
            of: find.byElementPredicate((Element e) => e == element),
            matching: find.byType(RichText),
          ),
        )
        .text
        .style!,
];

/// The one text showing [text] in [style]'s size.
Finder textInSize(String text, double fontSize) => find.byWidgetPredicate(
  (Widget w) => w is RichText && w.text.toPlainText() == text && w.text.style?.fontSize == fontSize,
);

Rect barRect(WidgetTester tester, [Finder? of]) => tester.getRect(containerOf(of));

/// A rect relative to the bar's top-left corner.
Rect inBar(WidgetTester tester, Finder finder, [Finder? of]) =>
    tester.getRect(finder).shift(-barRect(tester, of).topLeft);

Finder button(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == label);

SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

List<SemanticsNode> nodesBelow(SemanticsNode node) {
  final List<SemanticsNode> found = <SemanticsNode>[];
  void visit(SemanticsNode n) {
    found.add(n);
    n.visitChildren((SemanticsNode child) {
      visit(child);
      return true;
    });
  }

  visit(node);
  return found;
}

List<SemanticsData> headings(WidgetTester tester) => <SemanticsData>[
  for (final SemanticsNode node in nodesBelow(semanticsRoot(tester)))
    if (node.getSemanticsData().hasFlag(SemanticsFlag.isHeader)) node.getSemanticsData(),
];

/// Collects what the bar reports as ignored (APB-13), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// A page whose content scrolls under a [TanreiSliverAppBar], through [controller].
Widget sliverPage(Widget bar, ScrollController controller) => CustomScrollView(
  controller: controller,
  slivers: <Widget>[
    bar,
    SliverList(
      delegate: SliverChildListDelegate(<Widget>[
        for (int i = 0; i < 40; i++) SizedBox(height: 50, child: Text('Row $i')),
      ]),
    ),
  ],
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('condition', () {
    testWidgets('APB-1: while flat, the container takes flat.container.color and '
        'flat.container.elevation, and the bottom edge outline.width in flat.outline.color', (
      WidgetTester tester,
    ) async {
      // A system whose flat bar is visibly set apart, so the tokens are seen to drive it.
      final TanreiAppBarConditionTokens flat = barTokens.conditions.flat.copyWith(
        containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
        containerElevation: system.elevation.level2,
        outlineColor: const TanreiPaint.role(TanreiColorRole.primary),
      );
      final TanreiThemeData theme = TanreiThemeData(
        system: system.copyWith(
          appBar: barTokens.copyWith(conditions: barTokens.conditions.copyWith(flat: flat)),
        ),
      );
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: false), theme: theme));
      final TanreiContainerDecoration decoration = decorationOf(tester);
      final TanreiResolvedElevation level2 = TanreiResolvedElevation.resolve(
        system.elevation.level2,
        light,
      );
      expect(decoration.color, light.primaryContainer);
      expect(decoration.boxShadow, level2.shadows);
      expect(decoration.border, level2.ring);
      expect(decoration.shape.radius, 0);
      expect(edgeOf(tester).color, light.primary);
      expect(edgeOf(tester).width, barTokens.outlineWidth);

      // The default system: the page's surface, no elevation, no edge.
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: false)));
      expect(
        decorationOf(tester).color,
        lightTheme.paint(barTokens.conditions.flat.containerColor),
      );
      expect(decorationOf(tester).boxShadow, isNull);
      expect(edgeOf(tester).color.a, 0);
    });

    testWidgets('APB-2: while scrolled, the container takes scrolled.container.color and '
        'scrolled.container.elevation, and the bottom edge scrolled.outline.color', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: true)));
      final TanreiAppBarConditionTokens scrolled = barTokens.conditions.scrolled;
      expect(decorationOf(tester).color, lightTheme.paint(scrolled.containerColor));
      expect(edgeOf(tester).color, light.outlineVariant);
      expect(edgeOf(tester).width, barTokens.outlineWidth);
      // The edge is drawn along the bottom of the bar.
      expect(
        find.byType(TanreiAppBar),
        paints..rect(
          rect: Rect.fromLTWH(0, 56 - barTokens.outlineWidth, barWidth, barTokens.outlineWidth),
          color: light.outlineVariant,
        ),
      );

      final TanreiThemeData raised = TanreiThemeData(
        system: system.copyWith(
          appBar: barTokens.copyWith(
            conditions: barTokens.conditions.copyWith(
              scrolled: scrolled.copyWith(containerElevation: system.elevation.level3),
            ),
          ),
        ),
      );
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: true), theme: raised));
      expect(
        decorationOf(tester).boxShadow,
        TanreiResolvedElevation.resolve(system.elevation.level3, light).shadows,
      );
    });

    testWidgets('APB-3: a change of scrolled eases container, elevation and edge over '
        'motion.condition-duration with motion.condition-easing, at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiThemeData theme = TanreiThemeData(
        system: system.copyWith(
          appBar: barTokens.copyWith(
            conditions: barTokens.conditions.copyWith(
              scrolled: barTokens.conditions.scrolled.copyWith(
                containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: false), theme: theme));
      await tester.pumpWidget(barApp(smallBar(scrolledUnder: true), theme: theme));
      await tester.pump(Duration(milliseconds: barTokens.motionConditionDuration ~/ 2));
      final double t = barTokens.motionConditionEasing.toCurve().transform(0.5);
      expect(
        decorationOf(tester).color,
        looksLike(Color.lerp(light.surface, light.primaryContainer, t)!),
      );
      expect(
        edgeOf(tester).color,
        looksLike(light.outlineVariant.withValues(alpha: light.outlineVariant.a * t)),
      );
      await tester.pumpAndSettle();
      expect(decorationOf(tester).color, light.primaryContainer);
      expect(edgeOf(tester).color, light.outlineVariant);

      await tester.pumpWidget(
        barApp(smallBar(scrolledUnder: false), theme: theme, disableAnimations: true),
      );
      await tester.pump();
      expect(decorationOf(tester).color, light.surface);
      expect(edgeOf(tester).color.a, 0);
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('layout', () {
    testWidgets('APB-4: full width; a top row container.height.small high; the navigation item '
        'padding-inline from the start, the title container.gap after it, the actions '
        'padding-inline from the end actions.gap apart, each centered in the row; without a '
        'navigation item the title starts at title.inset; right-to-left mirrors the order', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(barApp(smallBar()));
      final double pad = barTokens.containerPaddingInline;
      final double row = barTokens.sizes.small.containerHeight;
      expect(barRect(tester).width, barWidth);
      expect(barRect(tester).height, row);
      final Rect back = inBar(tester, button('Back'));
      final Rect first = inBar(tester, button('Action 0'));
      final Rect second = inBar(tester, button('Action 1'));
      final Rect title = inBar(tester, find.text('Inbox'));
      expect(back.left, pad);
      expect(second.right, barWidth - pad);
      expect(second.left - first.right, barTokens.actionsGap);
      expect(title.left, back.right + barTokens.containerGap);
      for (final Rect part in <Rect>[back, first, second, title]) {
        expect(part.center.dy, moreOrLessEquals(row / 2));
      }

      await tester.pumpWidget(barApp(smallBar(leading: false, actions: 0)));
      expect(inBar(tester, find.text('Inbox')).left, barTokens.titleInset);

      await tester.pumpWidget(barApp(smallBar(), textDirection: TextDirection.rtl));
      expect(inBar(tester, button('Back')).right, barWidth - pad);
      expect(inBar(tester, button('Action 1')).left, pad);
      expect(
        inBar(tester, button('Action 0')).left,
        inBar(tester, button('Action 1')).right + barTokens.actionsGap,
      );
      expect(
        inBar(tester, find.text('Inbox')).right,
        inBar(tester, button('Back')).left - barTokens.containerGap,
      );
    });

    testWidgets('APB-5: the title on one line in title.typescale.small and title.color, the '
        'subtitle below in subtitle.typescale.small and subtitle.color, centered as a block, each '
        'truncated with an ellipsis', (WidgetTester tester) async {
      await tester.pumpWidget(barApp(smallBar(subtitle: 'Edited 5 minutes ago')));
      final TanreiAppBarSizeTokens small = barTokens.sizes.small;
      final TextStyle title = stylesOf(tester, 'Inbox').single;
      final TextStyle subtitle = stylesOf(tester, 'Edited 5 minutes ago').single;
      expect(title.fontSize, small.titleTypescale.size);
      expect(title.color, lightTheme.paint(barTokens.titleColor));
      expect(subtitle.fontSize, small.subtitleTypescale.size);
      expect(subtitle.color, lightTheme.paint(barTokens.subtitleColor));
      final Rect t = inBar(tester, find.text('Inbox'));
      final Rect s = inBar(tester, find.text('Edited 5 minutes ago'));
      expect(s.top, t.bottom);
      expect((t.top + s.bottom) / 2, moreOrLessEquals(small.containerHeight / 2));

      const String long = 'A screen title far too long for the room the bar has';
      await tester.pumpWidget(barApp(smallBar(title: long, subtitle: long)));
      for (final Element element in find.text(long).evaluate()) {
        final Text text = element.widget as Text;
        expect(text.maxLines, 1);
        expect(text.softWrap, isFalse);
        expect(text.overflow, TextOverflow.ellipsis);
      }
      final Rect truncated = inBar(tester, find.text(long).first);
      expect(truncated.height, small.titleTypescale.lineHeight);
      expect(truncated.right, lessThanOrEqualTo(inBar(tester, button('Action 0')).left));
    });

    testWidgets('APB-6: a centered title block is centered on the bar and narrowed equally on '
        'both sides so it never overlaps the slots; a start one starts after the navigation slot', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(barApp(smallBar(centerTitle: true)));
      final Rect title = inBar(tester, find.text('Inbox'));
      expect(title.center.dx, moreOrLessEquals(barWidth / 2));
      expect(tester.widget<Text>(find.text('Inbox')).textAlign, TextAlign.center);

      const String long = 'A screen title far too long for the room the bar has';
      await tester.pumpWidget(barApp(smallBar(title: long, centerTitle: true)));
      final Rect narrowed = inBar(tester, find.text(long));
      final Rect back = inBar(tester, button('Back'));
      final Rect actions = inBar(tester, button('Action 0'));
      expect(narrowed.center.dx, moreOrLessEquals(barWidth / 2));
      // The nearer slot (the two actions) sets the room on both sides.
      expect(narrowed.right, moreOrLessEquals(actions.left - barTokens.containerGap));
      expect(narrowed.left, greaterThan(back.right + barTokens.containerGap));

      await tester.pumpWidget(barApp(smallBar()));
      expect(tester.widget<Text>(find.text('Inbox')).textAlign, TextAlign.start);
      expect(
        inBar(tester, find.text('Inbox')).left,
        inBar(tester, button('Back')).right + barTokens.containerGap,
      );
    });

    testWidgets('APB-7: an expanded large bar is at least container.height.large high, draws no '
        'title in its top row, and draws the title and subtitle in the large styles below it from '
        'title.inset, the block padding-block-end above the bottom edge', (
      WidgetTester tester,
    ) async {
      final TanreiAppBarSizeTokens large = barTokens.sizes.large;
      await tester.pumpWidget(barApp(smallBar(size: TanreiAppBarSize.large)));
      expect(barRect(tester).height, large.containerHeight);
      // The top row's title is drawn at no opacity and not exposed.
      expect(layoutOf(tester).covered, 0);
      expect(layoutOf(tester).topTitleExposed, isFalse);
      final Finder expanded = textInSize('Inbox', large.titleTypescale.size);
      expect(expanded, findsOneWidget);
      final Rect title = inBar(tester, expanded);
      expect(title.left, barTokens.titleInset);
      expect(title.bottom, large.containerHeight - barTokens.containerPaddingBlockEnd);

      // With a subtitle the bar grows past its minimum: 56 + 40 + 22 + 12.
      await tester.pumpWidget(
        barApp(smallBar(size: TanreiAppBarSize.large, subtitle: 'ada@example.com')),
      );
      final Finder subtitle = textInSize('ada@example.com', large.subtitleTypescale.size);
      expect(subtitle, findsOneWidget);
      final double grown =
          barTokens.sizes.small.containerHeight +
          large.titleTypescale.lineHeight +
          large.subtitleTypescale.lineHeight +
          barTokens.containerPaddingBlockEnd;
      expect(grown, greaterThan(large.containerHeight));
      expect(barRect(tester).height, grown);
      expect(inBar(tester, subtitle).top, inBar(tester, textInSize('Inbox', 32)).bottom);
      expect(inBar(tester, subtitle).bottom, grown - barTokens.containerPaddingBlockEnd);

      // Right-to-left: from the right.
      await tester.pumpWidget(
        barApp(smallBar(size: TanreiAppBarSize.large), textDirection: TextDirection.rtl),
      );
      expect(
        inBar(tester, textInSize('Inbox', large.titleTypescale.size)).right,
        barWidth - barTokens.titleInset,
      );
    });

    testWidgets('APB-10: the container reaches under the top inset; the content sits below it '
        'and inside the side insets', (WidgetTester tester) async {
      const EdgeInsets insets = EdgeInsets.fromLTRB(10, 24, 20, 0);
      await tester.pumpWidget(barApp(smallBar(), padding: insets));
      final double row = barTokens.sizes.small.containerHeight;
      final Rect bar = barRect(tester);
      expect(bar.height, insets.top + row);
      expect(decorationOf(tester).color, light.surface);
      final Rect back = inBar(tester, button('Back'));
      expect(back.left, insets.left + barTokens.containerPaddingInline);
      expect(back.center.dy, moreOrLessEquals(insets.top + row / 2));
      expect(
        inBar(tester, button('Action 1')).right,
        barWidth - insets.right - barTokens.containerPaddingInline,
      );
      expect(inBar(tester, find.text('Inbox')).center.dy, moreOrLessEquals(insets.top + row / 2));
      // The parts no longer see the insets the bar placed them inside.
      expect(MediaQuery.paddingOf(tester.element(find.text('Inbox'))), EdgeInsets.zero);
    });

    testWidgets('APB-15: enlarged text grows the rows, keeps each line on one line, and does not '
        'scale the navigation and action items', (WidgetTester tester) async {
      await tester.pumpWidget(barApp(smallBar(subtitle: 'Edited 5 minutes ago')));
      final Size back = tester.getSize(button('Back'));
      await tester.pumpWidget(
        barApp(smallBar(subtitle: 'Edited 5 minutes ago'), textScaler: const TextScaler.linear(2)),
      );
      final TanreiAppBarSizeTokens small = barTokens.sizes.small;
      final double lines =
          2 * (small.titleTypescale.lineHeight + small.subtitleTypescale.lineHeight);
      expect(barRect(tester).height, moreOrLessEquals(lines));
      expect(barRect(tester).height, greaterThan(small.containerHeight));
      expect(tester.getSize(find.text('Inbox')).height, 2 * small.titleTypescale.lineHeight);
      expect(tester.getSize(button('Back')), back);
      final BuildContext glyphContext = tester.element(
        find.descendant(of: button('Back'), matching: find.byType(RichText)),
      );
      expect(MediaQuery.textScalerOf(glyphContext), TextScaler.noScaling);
    });
  });

  group('scrolling', () {
    testWidgets('APB-8: a large sliver bar shrinks one for one with the scroll from its expanded '
        'height to container.height.small, the expanded title moving up clipped under the top '
        'row, the top row\'s title fading in with the part of it covered; it expands back the '
        'same way', (WidgetTester tester) async {
      final ScrollController controller = ScrollController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        barApp(
          sliverPage(
            TanreiSliverAppBar(
              leading: itemButton('Menu', 'menu'),
              actions: <Widget>[itemButton('Search', 'search')],
              title: 'Inbox',
            ),
            controller,
          ),
          height: 600,
        ),
      );
      final Finder sliver = find.byType(TanreiSliverAppBar);
      final TanreiAppBarSizeTokens large = barTokens.sizes.large;
      final double top = barTokens.sizes.small.containerHeight;
      final double expanded = large.containerHeight;
      expect(barRect(tester, sliver).height, expanded);
      expect(layoutOf(tester).covered, 0);

      final double titleHeight = large.titleTypescale.lineHeight;
      double coveredAt(double height) =>
          ((top - (height - barTokens.containerPaddingBlockEnd - titleHeight)) / titleHeight).clamp(
            0,
            1,
          );
      for (final double offset in <double>[4, 20, 36]) {
        controller.jumpTo(offset);
        await tester.pump();
        final double height = expanded - offset;
        expect(barRect(tester, sliver).height, height, reason: 'at $offset');
        expect(layoutOf(tester).covered, moreOrLessEquals(coveredAt(height)), reason: 'at $offset');
        // The expanded title moves up with the bottom edge.
        expect(
          inBar(tester, textInSize('Inbox', large.titleTypescale.size), sliver).bottom,
          height - barTokens.containerPaddingBlockEnd,
        );
        // The content follows the bar's bottom edge.
        expect(tester.getRect(find.text('Row 0')).top - barRect(tester, sliver).top, height);
      }
      expect(layoutOf(tester).covered, greaterThan(0));
      expect(layoutOf(tester).covered, lessThan(1));

      controller.jumpTo(expanded - top);
      await tester.pump();
      expect(barRect(tester, sliver).height, top);
      expect(layoutOf(tester).covered, 1);
      controller.jumpTo(300);
      await tester.pump();
      expect(barRect(tester, sliver).height, top, reason: 'pinned, collapsed');

      // Back toward the top: it expands the same way.
      controller.jumpTo(20);
      await tester.pump();
      expect(barRect(tester, sliver).height, expanded - 20);
      expect(layoutOf(tester).covered, moreOrLessEquals(coveredAt(expanded - 20)));
      controller.jumpTo(0);
      await tester.pump();
      expect(barRect(tester, sliver).height, expanded);
    });

    testWidgets('APB-9: a connected view sets scrolled — true while content lies under the bar, '
        'for a large bar only once it has fully collapsed; a large bar is drawn collapsed while '
        'scrolled, and stays expanded while nothing is connected and scrolled is false', (
      WidgetTester tester,
    ) async {
      // A small bar over a list, connected through the observer a scaffold provides.
      final ScrollController list = ScrollController();
      addTearDown(list.dispose);
      await tester.pumpWidget(
        barApp(
          ScrollNotificationObserver(
            child: Column(
              children: <Widget>[
                smallBar(),
                Expanded(
                  child: ListView(
                    controller: list,
                    children: <Widget>[
                      for (int i = 0; i < 40; i++) SizedBox(height: 50, child: Text('Row $i')),
                    ],
                  ),
                ),
              ],
            ),
          ),
          height: 600,
        ),
      );
      expect(edgeOf(tester).color.a, 0);
      list.jumpTo(10);
      await tester.pumpAndSettle();
      expect(edgeOf(tester).color, light.outlineVariant);
      list.jumpTo(0);
      await tester.pumpAndSettle();
      expect(edgeOf(tester).color.a, 0);

      // A large sliver bar: flat while it collapses, scrolled once content is under it.
      final ScrollController page = ScrollController();
      addTearDown(page.dispose);
      await tester.pumpWidget(
        barApp(sliverPage(const TanreiSliverAppBar(title: 'Inbox'), page), height: 600),
      );
      final Finder sliver = find.byType(TanreiSliverAppBar);
      final double range =
          barTokens.sizes.large.containerHeight - barTokens.sizes.small.containerHeight;
      page.jumpTo(range);
      await tester.pumpAndSettle();
      expect(edgeOf(tester, sliver).color.a, 0, reason: 'collapsed, nothing under it yet');
      page.jumpTo(range + 1);
      await tester.pumpAndSettle();
      expect(edgeOf(tester, sliver).color, light.outlineVariant);
      page.jumpTo(range / 2);
      await tester.pumpAndSettle();
      expect(edgeOf(tester, sliver).color.a, 0);

      // scrolledUnder overrides the view, and a large bar is then drawn collapsed.
      await tester.pumpWidget(
        barApp(
          sliverPage(const TanreiSliverAppBar(title: 'Inbox', scrolledUnder: true), page),
          height: 600,
        ),
      );
      await tester.pumpAndSettle();
      expect(barRect(tester, sliver).height, barTokens.sizes.small.containerHeight);
      expect(edgeOf(tester, sliver).color, light.outlineVariant);

      // A large box bar: collapsed while scrolled, expanded while not and nothing is connected.
      await tester.pumpWidget(barApp(smallBar(size: TanreiAppBarSize.large, scrolledUnder: true)));
      expect(barRect(tester).height, barTokens.sizes.small.containerHeight);
      expect(layoutOf(tester).covered, 1);
      expect(layoutOf(tester).topTitleExposed, isTrue);
      await tester.pumpWidget(barApp(smallBar(size: TanreiAppBarSize.large)));
      expect(barRect(tester).height, barTokens.sizes.large.containerHeight);
    });
  });

  group('items and semantics', () {
    testWidgets('APB-11: the navigation and action items render as the icon buttons they are, '
        'and the bar is not focusable: Tab goes from the navigation item through the actions', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final FocusNode back = FocusNode(debugLabel: 'Back');
      final FocusNode search = FocusNode(debugLabel: 'Search');
      final FocusNode more = FocusNode(debugLabel: 'More');
      addTearDown(back.dispose);
      addTearDown(search.dispose);
      addTearDown(more.dispose);
      await tester.pumpWidget(
        barApp(
          TanreiAppBar(
            leading: itemButton('Back', 'arrow_back', focusNode: back),
            actions: <Widget>[
              itemButton('Search', 'search', focusNode: search),
              itemButton('More options', 'more_vert', focusNode: more),
            ],
            title: 'Inbox',
            scrolledUnder: true,
          ),
        ),
      );
      final TanreiIconButtonVariantStateTokens standard =
          system.iconButton.variants.standard.enabled;
      final TanreiIconButtonSizeTokens medium = system.iconButton.sizes.medium;
      for (final String label in <String>['Back', 'Search', 'More options']) {
        final TanreiControlIcon icon = tester.widget<TanreiControlIcon>(
          find.descendant(of: button(label), matching: find.byType(TanreiControlIcon)),
        );
        expect(icon.color, lightTheme.paint(standard.iconColor), reason: label);
        expect(icon.size, medium.iconSize, reason: label);
      }
      final List<FocusNode?> order = <FocusNode?>[];
      for (int i = 0; i < 3; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        order.add(FocusManager.instance.primaryFocus);
      }
      expect(order, <FocusNode>[back, search, more]);
      // No focus node of the bar's own: every one belongs to an icon button.
      for (final Element focus
          in find
              .descendant(of: find.byType(TanreiAppBar), matching: find.byType(Focus))
              .evaluate()) {
        expect(focus.findAncestorWidgetOfExactType<TanreiIconButton>(), isNotNull);
      }
    });

    testWidgets('APB-12: the title is exposed as a heading and the subtitle as text read after '
        'it; a large bar exposes one title — the expanded one while any of it is visible, the top '
        'row\'s once collapsed', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(barApp(smallBar(subtitle: 'Edited 5 minutes ago')));
      List<SemanticsData> found = headings(tester);
      expect(found.map((SemanticsData d) => d.label), <String>['Inbox']);
      expect(found.single.headingLevel, 1);
      final List<String> labels = <String>[
        for (final SemanticsNode node in nodesBelow(semanticsRoot(tester)))
          if (node.getSemanticsData().label.isNotEmpty) node.getSemanticsData().label,
      ];
      expect(labels.indexOf('Edited 5 minutes ago'), greaterThan(labels.indexOf('Inbox')));
      expect(
        nodesBelow(semanticsRoot(tester))
            .singleWhere((SemanticsNode n) => n.getSemanticsData().label == 'Edited 5 minutes ago')
            .getSemanticsData()
            .hasFlag(SemanticsFlag.isHeader),
        isFalse,
      );

      final ScrollController controller = ScrollController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        barApp(
          sliverPage(
            const TanreiSliverAppBar(title: 'Inbox', subtitle: 'ada@example.com'),
            controller,
          ),
          height: 600,
        ),
      );
      found = headings(tester);
      expect(found, hasLength(1));
      expect(layoutOf(tester).topTitleExposed, isFalse);
      // The expanded title's node: below the top row.
      expect(found.single.rect.height, barTokens.sizes.large.titleTypescale.lineHeight);
      // Partly covered: still the expanded one, once.
      controller.jumpTo(20);
      await tester.pump();
      expect(layoutOf(tester).covered, greaterThan(0));
      expect(layoutOf(tester).covered, lessThan(1));
      expect(headings(tester), hasLength(1));
      expect(layoutOf(tester).topTitleExposed, isFalse);
      // Collapsed: the top row's, once.
      controller.jumpTo(200);
      await tester.pump();
      found = headings(tester);
      expect(found, hasLength(1));
      expect(layoutOf(tester).topTitleExposed, isTrue);
      expect(found.single.rect.height, barTokens.sizes.small.titleTypescale.lineHeight);
      handle.dispose();
    });

    testWidgets('APB-13: an empty title draws no title block and exposes no heading; more than '
        'three actions are all drawn and reported', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(barApp(smallBar(title: '', subtitle: 'ignored')));
      expect(
        find.byType(Text).evaluate().where((Element e) => (e.widget as Text).data == 'ignored'),
        isEmpty,
      );
      expect(headings(tester), isEmpty);
      await tester.pumpWidget(barApp(smallBar(title: '', size: TanreiAppBarSize.large)));
      expect(barRect(tester).height, barTokens.sizes.large.containerHeight);
      expect(headings(tester), isEmpty);
      handle.dispose();

      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(barApp(smallBar(actions: 4)));
      expect(find.byType(TanreiIconButton), findsNWidgets(5));
      expect(reports, hasLength(1));
      expect(reports.single, contains('overflow menu'));
      await tester.pumpWidget(barApp(smallBar(actions: 4, title: 'Other')));
      expect(reports, hasLength(1), reason: 'once, not on every build');
    });

    testWidgets('APB-14: a size the system does not have renders with small\'s tokens and is '
        'reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(barApp(smallBar(size: const TanreiAppBarSize('huge'))));
      expect(reports, contains('app-bar size "huge" -> small'));
      expect(barRect(tester).height, barTokens.sizes.small.containerHeight);
      expect(stylesOf(tester, 'Inbox').single.fontSize, barTokens.sizes.small.titleTypescale.size);
    });

    testWidgets('guidelines: app bar', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final bool scrolled in <bool>[false, true]) {
          await tester.pumpWidget(
            barApp(
              smallBar(subtitle: 'Edited 5 minutes ago', scrolledUnder: scrolled),
              theme: theme,
            ),
          );
          await tester.pumpAndSettle();
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
      }
      handle.dispose();
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(barTokens.sizes.small.containerHeight, 56);
      expect(barTokens.sizes.large.containerHeight, 112);
      expect(barTokens.sizes.small.titleTypescale, system.typescale.heading4);
      expect(barTokens.sizes.large.titleTypescale, system.typescale.heading1);
      expect(barTokens.containerPaddingInline, system.space.space100);
      expect(barTokens.titleInset, system.space.space200);
      expect(barTokens.containerPaddingBlockEnd, system.space.space150);
      expect(lightTheme.paint(barTokens.conditions.scrolled.outlineColor), light.outlineVariant);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the bar draws that system\'s heights, title style and '
          'conditions', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiAppBarTokens tokens = shipped.appBar;
        await tester.pumpWidget(barApp(smallBar(scrolledUnder: true), theme: theme));
        await tester.pumpAndSettle();
        // The row is at least its height, and grows to hold the items' targets (cupertino's 44 row
        // grows to hold 48 targets).
        final double row = math.max(
          tokens.sizes.small.containerHeight,
          shipped.measure.targetTouch,
        );
        expect(barRect(tester).height, row);
        final Color scrolled = theme.paint(tokens.conditions.scrolled.containerColor);
        expect(decorationOf(tester).color, scrolled.a > 0 ? scrolled : null);
        expect(edgeOf(tester).color, theme.paint(tokens.conditions.scrolled.outlineColor));
        expect(stylesOf(tester, 'Inbox').single.fontSize, tokens.sizes.small.titleTypescale.size);
        expect(decorationOf(tester).shape.smoothing, shipped.shape.cornerSmoothing);

        await tester.pumpWidget(
          barApp(smallBar(size: TanreiAppBarSize.large, scrolledUnder: false), theme: theme),
        );
        await tester.pumpAndSettle();
        final TanreiAppBarSizeTokens large = tokens.sizes.large;
        expect(
          barRect(tester).height,
          math.max(
            large.containerHeight,
            row + large.titleTypescale.lineHeight + tokens.containerPaddingBlockEnd,
          ),
        );
        expect(textInSize('Inbox', large.titleTypescale.size), findsOneWidget);
        final Color flat = theme.paint(tokens.conditions.flat.containerColor);
        expect(decorationOf(tester).color, flat.a > 0 ? flat : null);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('app-bar');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'small',
        'small-scrolled',
        'small-center',
        'small-subtitle',
        'small-title-only',
        'large',
        'large-subtitle',
        'large-scrolled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: appBarGoldenSurface,
          child: fixtureAppBar(fixture),
          file: 'goldens/app_bar/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the scrolled small bar shows the
    // preset's height, title style and scrolled look (a tone, an edge, or both) at once.
    const String recorded = 'small-scrolled';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: appBarGoldenSurface,
          child: fixtureAppBar(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/app_bar/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
