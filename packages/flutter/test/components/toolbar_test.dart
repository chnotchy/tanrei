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
final TanreiToolbarTokens toolbarTokens = system.toolbar;
final TanreiToolbarVariantTokens docked = toolbarTokens.variants.docked;
final TanreiToolbarVariantTokens floating = toolbarTokens.variants.floating;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The docked stage of TBR-1's `verify`: 360 × 56.
const Size dockedStage = Size(360, 56);

/// The floating stage of TBR-4's `verify`: 360 × 96, the toolbar centered.
const Size floatingStage = Size(360, 96);

/// The vertical stage of TBR-6's `verify`: 96 × 240, the toolbar centered.
const Size verticalStage = Size(96, 240);

/// The fixtures' glyphs, as Material Symbols code points drawn as text (the test font draws every
/// one as the same box; the table keeps each glyph one character wide).
const Map<String, int> iconCodePoints = <String, int>{
  'archive': 0xe149,
  'delete': 0xe872,
  'mark_email_unread': 0xf18a,
  'drive_file_move': 0xe675,
  'attach_file': 0xe226,
  'image': 0xe3f4,
  'link': 0xe157,
  'format_bold': 0xe238,
  'format_italic': 0xe23f,
  'format_underlined': 0xe249,
  'edit': 0xe3c9,
  'check': 0xe5ca,
  'add': 0xe145,
  'remove': 0xe15b,
  'my_location': 0xe55c,
};

Widget glyph(String name) => Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// A standard icon action: its label and glyph.
TanreiIconButton action(
  String label, {
  String icon = 'archive',
  VoidCallback? onPressed,
  bool enabled = true,
  bool? isSelected,
  TanreiIconButtonVariant variant = TanreiIconButtonVariant.standard,
}) => TanreiIconButton(
  onPressed: enabled ? (onPressed ?? () {}) : null,
  icon: glyph(icon),
  semanticLabel: label,
  isSelected: isSelected,
  variant: variant,
);

/// The toolbar a fixture describes: its items in order, `action` as an icon button (a toggle when
/// `toggle` is set), `button` as a Button.
TanreiToolbar fixtureToolbar(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Map<String, dynamic>> items = ((fixture['items'] as List<dynamic>?) ?? <dynamic>[])
      .cast<Map<String, dynamic>>();
  Widget item(Map<String, dynamic> item) {
    final Map<String, dynamic> p = (item['props'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final bool disabled = p['disabled'] == true;
    return switch (item['kind']) {
      'button' => TanreiButton(
        onPressed: disabled ? null : () {},
        variant: TanreiButtonVariant(p['variant'] as String? ?? 'filled'),
        child: Text(item['content'] as String),
      ),
      _ => TanreiIconButton(
        onPressed: disabled ? null : () {},
        icon: glyph(item['content'] as String),
        semanticLabel: p['label'] as String? ?? '',
        isSelected: p['toggle'] == true ? p['selected'] == true : null,
        variant: TanreiIconButtonVariant(p['variant'] as String? ?? 'standard'),
      ),
    };
  }

  return TanreiToolbar(
    semanticLabel: props['label'] as String? ?? '',
    variant: TanreiToolbarVariant(props['variant'] as String? ?? 'docked'),
    orientation: TanreiToolbar.orientationFromName(props['orientation'] as String? ?? 'horizontal'),
    children: <Widget>[for (final Map<String, dynamic> i in items) item(i)],
  );
}

/// [toolbar] in the stage its variant and orientation are verified in: a docked toolbar at the
/// bottom of 360 × 56, a floating one centered in 360 × 96, a vertical one centered in 96 × 240.
Widget staged(TanreiToolbar toolbar) {
  final bool isFloating = toolbar.variant == TanreiToolbarVariant.floating;
  if (!isFloating) {
    return SizedBox.fromSize(
      size: dockedStage,
      child: Align(alignment: Alignment.bottomCenter, child: toolbar),
    );
  }
  return SizedBox.fromSize(
    size: toolbar.orientation == Axis.vertical ? verticalStage : floatingStage,
    child: Center(child: toolbar),
  );
}

/// The baseline surface of [toolbar]'s stage: the stage inside the `space200` padding of every
/// baseline.
Size goldenSurfaceFor(TanreiToolbar toolbar) {
  final Size stage = toolbar.variant != TanreiToolbarVariant.floating
      ? dockedStage
      : (toolbar.orientation == Axis.vertical ? verticalStage : floatingStage);
  final double pad = system.space.space200 * 2;
  return Size(stage.width + pad, stage.height + pad);
}

/// [child] in the test app, with the given system insets, text scale and direction.
Widget toolbarApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: padding, textScaler: textScaler),
      child: Directionality(textDirection: textDirection, child: child),
    ),
  ),
  theme: theme,
);

/// Four standard actions in a toolbar, the second optionally disabled.
TanreiToolbar fourActions({
  TanreiToolbarVariant variant = TanreiToolbarVariant.docked,
  Axis orientation = Axis.horizontal,
  bool secondDisabled = false,
  bool firstDisabled = false,
  List<String>? pressed,
  String label = 'Message actions',
}) => TanreiToolbar(
  semanticLabel: label,
  variant: variant,
  orientation: orientation,
  children: <Widget>[
    for (final (int i, String name) in <String>['Archive', 'Delete', 'Unread', 'Move'].indexed)
      action(
        name,
        enabled: !((i == 1 && secondDisabled) || (i == 0 && firstDisabled)),
        onPressed: () => pressed?.add(name),
      ),
  ],
);

Finder get toolbarFinder => find.byType(TanreiToolbar);

Rect toolbarRect(WidgetTester tester) => tester.getRect(toolbarFinder);

/// The visible container of the icon button labelled [label] (or of the Button showing [label]).
Rect itemRect(WidgetTester tester, String label) {
  final Finder button = find.byWidgetPredicate(
    (Widget w) => w is TanreiIconButton && w.semanticLabel == label,
  );
  final Finder of = button.evaluate().isNotEmpty
      ? button
      : find.ancestor(of: find.text(label), matching: find.byType(TanreiButton));
  return tester.getRect(find.descendant(of: of, matching: find.byType(TanreiControlContainer)));
}

TanreiContainerDecoration decorationOf(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find
                  .descendant(
                    of: toolbarFinder,
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                    ),
                  )
                  .first,
            )
            .decoration
        as TanreiContainerDecoration;

/// The docked toolbar's top edge, as it paints it.
TanreiEdgePainter edgeOf(WidgetTester tester) =>
    tester
            .widget<CustomPaint>(
              find
                  .descendant(
                    of: toolbarFinder,
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is CustomPaint && w.foregroundPainter is TanreiEdgePainter,
                    ),
                  )
                  .first,
            )
            .foregroundPainter!
        as TanreiEdgePainter;

/// The label of the item with primary focus: an icon button's semantic label, or a Button's text.
String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  final TanreiIconButton? icon = context?.findAncestorWidgetOfExactType<TanreiIconButton>();
  if (icon != null) {
    return icon.semanticLabel;
  }
  final TanreiButton? button = context?.findAncestorWidgetOfExactType<TanreiButton>();
  final Widget? child = button?.child;
  return child is Text ? child.data ?? '' : '';
}

Future<void> press(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pumpAndSettle();
}

Future<void> shiftTab(WidgetTester tester) async {
  await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
  await tester.pumpAndSettle();
}

/// Collects what the toolbar reports through `debugTanreiReportIgnoredValue`, and restores it.
List<String> collectIgnored() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

SemanticsNode? findNode(SemanticsNode root, bool Function(SemanticsNode) test) {
  SemanticsNode? found;
  void visit(SemanticsNode node) {
    if (found != null) {
      return;
    }
    if (test(node)) {
      found = node;
      return;
    }
    node.visitChildren((SemanticsNode child) {
      visit(child);
      return found == null;
    });
  }

  visit(root);
  return found;
}

List<SemanticsNode> childrenOf(SemanticsNode node) {
  final List<SemanticsNode> children = <SemanticsNode>[];
  node.visitChildren((SemanticsNode child) {
    children.add(child);
    return true;
  });
  return children;
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('docked', () {
    testWidgets(
      'TBR-1: a docked toolbar spans its parent, is container.size.docked high, and draws '
      'the docked color, elevation and corners with a top edge outline.width thick',
      (WidgetTester tester) async {
        await tester.pumpWidget(toolbarApp(SizedBox(width: 360, child: fourActions())));
        await tester.pumpAndSettle();
        expect(toolbarRect(tester).size, Size(360, docked.containerSize));
        final TanreiContainerDecoration decoration = decorationOf(tester);
        expect(decoration.color, lightTheme.paint(docked.containerColor));
        expect(decoration.color, light.surface);
        expect(decoration.shape.radius, docked.containerShape);
        expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
        // level0: no ring, no shadow.
        expect(decoration.border, isNull);
        expect(decoration.boxShadow, isNull);
        final TanreiEdgePainter edge = edgeOf(tester);
        expect(edge.side, TanreiEdgeSide.top);
        expect(edge.color, lightTheme.paint(docked.outlineColor));
        expect(edge.color, light.outlineVariant);
        expect(edge.width, toolbarTokens.outlineWidth);
      },
    );

    testWidgets('TBR-1: a modified system drives the docked size, color and edge', (
      WidgetTester tester,
    ) async {
      final TanreiSystem modified = system.copyWith(
        toolbar: toolbarTokens.copyWith(
          outlineWidth: 3,
          variants: toolbarTokens.variants.copyWith(
            docked: docked.copyWith(
              containerSize: 72,
              containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
              outlineColor: const TanreiPaint.role(TanreiColorRole.primary),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(width: 360, child: fourActions()),
          theme: TanreiThemeData(system: modified),
        ),
      );
      await tester.pumpAndSettle();
      expect(toolbarRect(tester).height, 72);
      expect(decorationOf(tester).color, light.primaryContainer);
      expect(edgeOf(tester).color, light.primary);
      expect(edgeOf(tester).width, 3);
    });

    testWidgets(
      'TBR-2: the first item padding-inline from the start, the last as far from the end, '
      'equal space between neighbours, never less than the gap, each centered in the row',
      (WidgetTester tester) async {
        await tester.pumpWidget(toolbarApp(SizedBox(width: 360, child: fourActions())));
        await tester.pumpAndSettle();
        final Rect bar = toolbarRect(tester);
        final List<Rect> rects = <Rect>[
          for (final String l in <String>['Archive', 'Delete', 'Unread', 'Move'])
            itemRect(tester, l),
        ];
        expect(rects.first.left - bar.left, docked.containerPaddingInline);
        expect(bar.right - rects.last.right, docked.containerPaddingInline);
        final List<double> gaps = <double>[
          for (int i = 1; i < rects.length; i++) rects[i].left - rects[i - 1].right,
        ];
        for (final double gap in gaps) {
          expect(gap, moreOrLessEquals(gaps.first));
          expect(gap, greaterThanOrEqualTo(docked.containerGap));
        }
        for (final Rect r in rects) {
          expect(r.center.dy, moreOrLessEquals(bar.center.dy));
        }
      },
    );

    testWidgets('TBR-2: a toolbar with one item centers it', (WidgetTester tester) async {
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 360,
            child: TanreiToolbar(
              semanticLabel: 'Reply',
              children: <Widget>[
                TanreiButton(
                  onPressed: () {},
                  variant: TanreiButtonVariant.tonal,
                  child: const Text('Reply'),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(itemRect(tester, 'Reply').center, toolbarRect(tester).center);
    });

    testWidgets('TBR-2: a narrower toolbar keeps the gap as its minimum', (
      WidgetTester tester,
    ) async {
      // padding + 5 × 36 + 4 × gap + padding: the items fit exactly, at the minimum gap.
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 2 * docked.containerPaddingInline + 5 * 36 + 4 * docked.containerGap,
            child: TanreiToolbar(
              semanticLabel: 'Actions',
              children: <Widget>[for (int i = 0; i < 5; i++) action('A$i')],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (int i = 1; i < 5; i++) {
        expect(
          itemRect(tester, 'A$i').left - itemRect(tester, 'A${i - 1}').right,
          moreOrLessEquals(docked.containerGap),
        );
      }
    });

    testWidgets('TBR-3: a docked toolbar extends its container under the bottom inset and places '
        'its items above it and inside the side insets', (WidgetTester tester) async {
      const EdgeInsets insets = EdgeInsets.only(left: 20, right: 12, bottom: 34);
      await tester.pumpWidget(
        toolbarApp(SizedBox(width: 360, child: fourActions()), padding: insets),
      );
      await tester.pumpAndSettle();
      final Rect bar = toolbarRect(tester);
      expect(bar.height, docked.containerSize + insets.bottom);
      // The container (its color) covers the whole toolbar, inset included.
      expect(tester.getSize(find.byType(TanreiToolbar)), bar.size);
      expect(decorationOf(tester).color, light.surface);
      final Rect first = itemRect(tester, 'Archive');
      final Rect last = itemRect(tester, 'Move');
      expect(first.left - bar.left, insets.left + docked.containerPaddingInline);
      expect(bar.right - last.right, insets.right + docked.containerPaddingInline);
      // Centered in the row above the inset.
      expect(first.center.dy, moreOrLessEquals(bar.top + docked.containerSize / 2));
      // The items no longer see the insets.
      final BuildContext inner = tester.element(find.byType(TanreiIconButton).first);
      expect(MediaQuery.paddingOf(inner), EdgeInsets.zero);
    });
  });

  group('floating', () {
    testWidgets('TBR-4: a floating toolbar fills, raises and rounds its container by the floating '
        'tokens, eased by corner smoothing, is as long as its items need and '
        'container.size.floating across', (WidgetTester tester) async {
      await tester.pumpWidget(
        toolbarApp(Center(child: fourActions(variant: TanreiToolbarVariant.floating))),
      );
      await tester.pumpAndSettle();
      final Rect bar = toolbarRect(tester);
      // 6 + 4 × 36 + 3 × 16 + 6 = 204 long (the gap widened for whole 48 targets), 48 across.
      final double item = system.iconButton.sizes.medium.containerSize;
      expect(bar.width, 2 * floating.containerPaddingInline + 4 * item + 3 * floating.containerGap);
      expect(bar.width, 204);
      expect(bar.height, floating.containerSize);
      final TanreiContainerDecoration decoration = decorationOf(tester);
      expect(decoration.color, lightTheme.paint(floating.containerColor));
      expect(decoration.color, light.surfaceBright);
      expect(decoration.shape.radius, floating.containerShape);
      expect(decoration.shape.smoothing, system.shape.cornerSmoothing);
      final TanreiResolvedElevation level3 = TanreiResolvedElevation.resolve(
        floating.containerElevation,
        light,
      );
      expect(decoration.boxShadow, level3.shadows.isEmpty ? isNull : level3.shadows);
      // The edge is transparent in the default system: the border slot carries the ring, if any.
      expect(decoration.border, level3.ring);
      final Rect first = itemRect(tester, 'Archive');
      expect(first.left - bar.left, floating.containerPaddingInline);
      expect(itemRect(tester, 'Delete').left - first.right, floating.containerGap);
      expect(first.center.dy, moreOrLessEquals(bar.center.dy));
    });

    testWidgets('TBR-4: a floating edge in a modified system is drawn around the whole shape', (
      WidgetTester tester,
    ) async {
      final TanreiSystem modified = system.copyWith(
        toolbar: toolbarTokens.copyWith(
          variants: toolbarTokens.variants.copyWith(
            floating: floating.copyWith(
              outlineColor: const TanreiPaint.role(TanreiColorRole.outline),
              containerShape: 12,
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        toolbarApp(
          Center(child: fourActions(variant: TanreiToolbarVariant.floating)),
          theme: TanreiThemeData(system: modified),
        ),
      );
      await tester.pumpAndSettle();
      final TanreiContainerDecoration decoration = decorationOf(tester);
      expect(
        decoration.border,
        Border.all(color: light.outline, width: toolbarTokens.outlineWidth),
      );
      expect(decoration.shape.radius, 12);
    });

    testWidgets('TBR-5: a floating toolbar lays out at its own size where its parent places it, '
        'draws no scrim and does not reach under a system inset', (WidgetTester tester) async {
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 360,
            height: 300,
            child: Align(
              alignment: Alignment.topLeft,
              child: fourActions(variant: TanreiToolbarVariant.floating),
            ),
          ),
          padding: const EdgeInsets.only(bottom: 34),
        ),
      );
      await tester.pumpAndSettle();
      final Rect stage = tester.getRect(find.byType(SizedBox).first);
      final Rect bar = toolbarRect(tester);
      expect(bar.topLeft, stage.topLeft);
      expect(bar.size, const Size(204, 48));
      // Nothing is drawn beyond its container: no scrim, no barrier.
      expect(find.descendant(of: toolbarFinder, matching: find.byType(ModalBarrier)), findsNothing);
      expect(find.byType(ModalBarrier), findsNothing);
    });

    testWidgets('TBR-6: a vertical floating toolbar stacks its items top to bottom, with the '
        'floating paddings and gap along the vertical axis and the floating size as its width', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        toolbarApp(
          Center(
            child: TanreiToolbar(
              semanticLabel: 'Map controls',
              variant: TanreiToolbarVariant.floating,
              orientation: Axis.vertical,
              children: <Widget>[
                action('Zoom in', icon: 'add'),
                action('Zoom out', icon: 'remove'),
                action('My location', icon: 'my_location'),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final Rect bar = toolbarRect(tester);
      expect(bar.width, floating.containerSize);
      expect(bar.height, 2 * floating.containerPaddingInline + 3 * 36 + 2 * floating.containerGap);
      final Rect a = itemRect(tester, 'Zoom in');
      final Rect b = itemRect(tester, 'Zoom out');
      final Rect c = itemRect(tester, 'My location');
      expect(a.top - bar.top, floating.containerPaddingInline);
      expect(b.top - a.bottom, floating.containerGap);
      expect(c.top - b.bottom, floating.containerGap);
      expect(bar.bottom - c.bottom, floating.containerPaddingInline);
      expect(a.center.dx, moreOrLessEquals(bar.center.dx));
    });

    testWidgets(
      'TBR-6: a vertical docked toolbar lays out as a horizontal docked toolbar and debug '
      'builds report that a docked toolbar is horizontal',
      (WidgetTester tester) async {
        final List<String> reports = collectIgnored();
        await tester.pumpWidget(
          toolbarApp(SizedBox(width: 360, child: fourActions(orientation: Axis.vertical))),
        );
        await tester.pumpAndSettle();
        expect(reports, <String>['toolbar orientation']);
        expect(toolbarRect(tester).size, Size(360, docked.containerSize));
        expect(itemRect(tester, 'Delete').left, greaterThan(itemRect(tester, 'Archive').right));
        // Rebuilt the same way, it is not reported again.
        await tester.pumpWidget(
          toolbarApp(SizedBox(width: 360, child: fourActions(orientation: Axis.vertical))),
        );
        await tester.pumpAndSettle();
        expect(reports, hasLength(1));
      },
    );
  });

  group('direction and overflow', () {
    testWidgets('TBR-7: right to left, a horizontal toolbar lays out its items from the right edge '
        'in reading order; a vertical one keeps its top-to-bottom order', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        toolbarApp(SizedBox(width: 360, child: fourActions()), textDirection: TextDirection.rtl),
      );
      await tester.pumpAndSettle();
      final Rect bar = toolbarRect(tester);
      expect(bar.right - itemRect(tester, 'Archive').right, docked.containerPaddingInline);
      expect(itemRect(tester, 'Move').left - bar.left, docked.containerPaddingInline);
      expect(itemRect(tester, 'Delete').right, lessThan(itemRect(tester, 'Archive').left));

      await tester.pumpWidget(
        toolbarApp(
          Center(child: fourActions(variant: TanreiToolbarVariant.floating)),
          textDirection: TextDirection.rtl,
        ),
      );
      await tester.pumpAndSettle();
      final Rect pill = toolbarRect(tester);
      expect(pill.right - itemRect(tester, 'Archive').right, floating.containerPaddingInline);

      await tester.pumpWidget(
        toolbarApp(
          Center(
            child: fourActions(variant: TanreiToolbarVariant.floating, orientation: Axis.vertical),
          ),
          textDirection: TextDirection.rtl,
        ),
      );
      await tester.pumpAndSettle();
      expect(itemRect(tester, 'Archive').top, lessThan(itemRect(tester, 'Delete').top));
      expect(itemRect(tester, 'Delete').top, lessThan(itemRect(tester, 'Unread').top));
    });

    testWidgets('TBR-8: items that need more length scroll along the axis at their own size and '
        'the minimum gap, an item that receives keyboard focus is brought fully into view, and '
        'debug builds report it once', (WidgetTester tester) async {
      final List<String> reports = collectIgnored();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 200,
            child: TanreiToolbar(
              semanticLabel: 'Actions',
              children: <Widget>[for (int i = 0; i < 8; i++) action('A$i')],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(reports, <String>['toolbar children']);
      final Rect bar = toolbarRect(tester);
      expect(bar.width, 200);
      expect(find.byType(TanreiIconButton), findsNWidgets(8));
      for (int i = 0; i < 8; i++) {
        expect(itemRect(tester, 'A$i').size, const Size.square(36));
      }
      for (int i = 1; i < 8; i++) {
        expect(
          itemRect(tester, 'A$i').left - itemRect(tester, 'A${i - 1}').right,
          docked.containerGap,
        );
      }
      // The last item is out of view until focus reaches it.
      expect(itemRect(tester, 'A7').left, greaterThan(bar.right));
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'A0');
      await press(tester, LogicalKeyboardKey.end);
      expect(focusedLabel(), 'A7');
      final Rect last = itemRect(tester, 'A7');
      expect(last.left, greaterThanOrEqualTo(bar.left));
      expect(last.right, lessThanOrEqualTo(bar.right));
      await press(tester, LogicalKeyboardKey.home);
      final Rect first = itemRect(tester, 'A0');
      expect(first.left, greaterThanOrEqualTo(bar.left));
      expect(reports, hasLength(1));
    });

    testWidgets('TBR-8: a floating toolbar narrower than its items scrolls too', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectIgnored();
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 120,
            child: Center(child: fourActions(variant: TanreiToolbarVariant.floating)),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(toolbarRect(tester).width, 120);
      expect(itemRect(tester, 'Move').size, const Size.square(36));
      expect(reports, <String>['toolbar children']);
    });
  });

  group('items', () {
    testWidgets('TBR-9: the items render as the icon buttons and buttons they are, from their own '
        'tokens, and keep their press, target and toggle; between two items the hit areas meet at '
        'the middle of the gap and never overlap', (WidgetTester tester) async {
      Future<TanreiControlVisuals> visualsOf(Widget child) async {
        await tester.pumpWidget(toolbarApp(Center(child: child)));
        await tester.pumpAndSettle();
        return tester
            .widget<TanreiControlContainer>(
              find.descendant(
                of: find.byType(TanreiIconButton),
                matching: find.byType(TanreiControlContainer),
              ),
            )
            .visuals;
      }

      for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
        for (final bool? selected in <bool?>[null, false, true]) {
          final TanreiIconButton alone = action('Bold', isSelected: selected, variant: variant);
          final TanreiControlVisuals outside = await visualsOf(alone);
          final TanreiControlVisuals inside = await visualsOf(
            TanreiToolbar(
              semanticLabel: 'Formatting',
              variant: TanreiToolbarVariant.floating,
              children: <Widget>[action('Bold', isSelected: selected, variant: variant)],
            ),
          );
          expect(inside.container, outside.container, reason: '$variant $selected');
          expect(inside.label, outside.label, reason: '$variant $selected');
          expect(inside.outline, outside.outline, reason: '$variant $selected');
          expect(inside.shape, outside.shape, reason: '$variant $selected');
        }
      }

      final List<String> pressed = <String>[];
      await tester.pumpWidget(
        toolbarApp(SizedBox(width: 360, child: fourActions(pressed: pressed))),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Delete'));
      await tester.pumpAndSettle();
      expect(pressed, <String>['Delete']);
      // The target: a press 5 px outside the visible container, above it, still reaches it.
      final Rect delete = itemRect(tester, 'Delete');
      await tester.tapAt(Offset(delete.center.dx, delete.top - 5));
      await tester.pumpAndSettle();
      expect(pressed, <String>['Delete', 'Delete']);
      // Between two items the hit areas meet at the middle of the gap: in a docked toolbar's wide
      // gap too, a press goes to the nearer item.
      final Rect unread = itemRect(tester, 'Unread');
      final double middleOfGap = (delete.right + unread.left) / 2;
      await tester.tapAt(Offset(middleOfGap - 2, delete.center.dy));
      await tester.pumpAndSettle();
      await tester.tapAt(Offset(middleOfGap + 2, delete.center.dy));
      await tester.pumpAndSettle();
      expect(pressed, <String>['Delete', 'Delete', 'Delete', 'Unread']);
      // On a side without a neighbour an item keeps its own target, and no more.
      final Rect first = itemRect(tester, 'Archive');
      final double target = system.measure.targetTouch;
      final double reach = (target - first.width) / 2;
      await tester.tapAt(Offset(first.left - reach + 1, first.center.dy));
      await tester.pumpAndSettle();
      expect(pressed.last, 'Archive');
      pressed.clear();
      await tester.tapAt(Offset(first.left - reach - 1, first.center.dy));
      await tester.pumpAndSettle();
      expect(pressed, isEmpty);
      // Where two targets overlap in the gap of a floating toolbar, a press goes to the nearer item.
      await tester.pumpWidget(
        toolbarApp(
          Center(
            child: fourActions(pressed: pressed, variant: TanreiToolbarVariant.floating),
          ),
        ),
      );
      await tester.pumpAndSettle();
      pressed.clear();
      final Rect archive = itemRect(tester, 'Archive');
      final Rect next = itemRect(tester, 'Delete');
      expect(next.left - archive.right, floating.containerGap);
      await tester.tapAt(Offset(archive.right + 3, archive.center.dy));
      await tester.pumpAndSettle();
      await tester.tapAt(Offset(next.left - 3, next.center.dy));
      await tester.pumpAndSettle();
      expect(pressed, <String>['Archive', 'Delete']);
    });

    testWidgets('TBR-9: a disabled item stays disabled and does nothing', (
      WidgetTester tester,
    ) async {
      final List<String> pressed = <String>[];
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(width: 360, child: fourActions(pressed: pressed, secondDisabled: true)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Delete'), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(pressed, isEmpty);
    });
  });

  group('keyboard', () {
    Future<void> pumpToolbar(
      WidgetTester tester, {
      List<String>? pressed,
      TextDirection textDirection = TextDirection.ltr,
      Axis orientation = Axis.horizontal,
      bool secondDisabled = true,
      bool firstDisabled = false,
    }) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        toolbarApp(
          Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TanreiButton(onPressed: () {}, child: const Text('Before')),
              SizedBox(
                width: 360,
                child: Center(
                  child: fourActions(
                    pressed: pressed,
                    secondDisabled: secondDisabled,
                    firstDisabled: firstDisabled,
                    orientation: orientation,
                    variant: orientation == Axis.vertical
                        ? TanreiToolbarVariant.floating
                        : TanreiToolbarVariant.docked,
                  ),
                ),
              ),
              TanreiButton(onPressed: () {}, child: const Text('After')),
            ],
          ),
          textDirection: textDirection,
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('TBR-10: the toolbar is one Tab stop; Right and Left Arrow move to the next and '
        'previous enabled item, wrapping, Home and End to the ends; moving never activates', (
      WidgetTester tester,
    ) async {
      final List<String> pressed = <String>[];
      await pumpToolbar(tester, pressed: pressed);
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'Before');
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'Archive', reason: 'the first enabled item is the Tab stop');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Unread', reason: 'the disabled Delete is passed');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Move');
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Archive', reason: 'wraps at the end');
      await press(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedLabel(), 'Move', reason: 'wraps at the start');
      await press(tester, LogicalKeyboardKey.home);
      expect(focusedLabel(), 'Archive');
      await press(tester, LogicalKeyboardKey.end);
      expect(focusedLabel(), 'Move');
      expect(pressed, isEmpty, reason: 'moving focus activates nothing');
      await press(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedLabel(), 'Unread');
      // Tab leaves the toolbar: one stop.
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'After');
      // Shift+Tab comes back to the item focused last.
      await shiftTab(tester);
      expect(focusedLabel(), 'Unread');
      await shiftTab(tester);
      expect(focusedLabel(), 'Before');
    });

    testWidgets('TBR-10: Enter and Space act on the focused item as that item does', (
      WidgetTester tester,
    ) async {
      final List<String> pressed = <String>[];
      await pumpToolbar(tester, pressed: pressed);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.enter);
      expect(pressed, <String>['Archive']);
      await press(tester, LogicalKeyboardKey.arrowRight);
      await press(tester, LogicalKeyboardKey.space);
      expect(pressed, <String>['Archive', 'Unread']);
      // The press-hold of the item runs out.
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('TBR-10: a disabled first item is not the Tab stop and takes no focus', (
      WidgetTester tester,
    ) async {
      await pumpToolbar(tester, firstDisabled: true, secondDisabled: false);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'Delete');
      await press(tester, LogicalKeyboardKey.arrowLeft);
      expect(focusedLabel(), 'Move');
      await press(tester, LogicalKeyboardKey.home);
      expect(focusedLabel(), 'Delete');
    });

    testWidgets(
      'TBR-10, TBR-7: right to left, Left Arrow moves to the next item and Right Arrow to '
      'the previous',
      (WidgetTester tester) async {
        await pumpToolbar(tester, textDirection: TextDirection.rtl, secondDisabled: false);
        await press(tester, LogicalKeyboardKey.tab);
        await press(tester, LogicalKeyboardKey.tab);
        expect(focusedLabel(), 'Archive');
        await press(tester, LogicalKeyboardKey.arrowLeft);
        expect(focusedLabel(), 'Delete');
        await press(tester, LogicalKeyboardKey.arrowRight);
        expect(focusedLabel(), 'Archive');
      },
    );

    testWidgets('TBR-10: a vertical toolbar moves with Down and Up Arrow', (
      WidgetTester tester,
    ) async {
      await pumpToolbar(tester, orientation: Axis.vertical, secondDisabled: false);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'Archive');
      await press(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedLabel(), 'Delete');
      await press(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedLabel(), 'Archive');
      await press(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedLabel(), 'Move', reason: 'wraps');
    });

    testWidgets('TBR-10: an item that becomes disabled is left, and the Tab stop moves on', (
      WidgetTester tester,
    ) async {
      await pumpToolbar(tester, secondDisabled: false);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.tab);
      await press(tester, LogicalKeyboardKey.arrowRight);
      expect(focusedLabel(), 'Delete');
      await press(tester, LogicalKeyboardKey.tab);
      expect(focusedLabel(), 'After');
      await pumpToolbar(tester, secondDisabled: true);
      await tester.pumpAndSettle();
      await shiftTab(tester);
      expect(focusedLabel(), 'Archive');
    });
  });

  group('accessibility', () {
    testWidgets('TBR-11: the toolbar is a semantics container named by its label that holds its '
        'items in order, each with its own name, role and state', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        toolbarApp(
          Center(
            child: TanreiToolbar(
              semanticLabel: 'Formatting',
              variant: TanreiToolbarVariant.floating,
              children: <Widget>[
                action('Bold', icon: 'format_bold', isSelected: true),
                action('Italic', icon: 'format_italic', isSelected: false),
                action('Insert link', icon: 'link', enabled: false),
                TanreiButton(onPressed: () {}, child: const Text('Done')),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final SemanticsNode toolbar = findNode(
        semanticsRoot(tester),
        (SemanticsNode n) => n.label == 'Formatting',
      )!;
      // The items in order below the toolbar's node (a scrolling node may sit between them: TBR-8).
      final List<SemanticsNode> items = <SemanticsNode>[];
      void collect(SemanticsNode node) {
        for (final SemanticsNode child in childrenOf(node)) {
          if (child.label.isEmpty) {
            collect(child);
          } else {
            items.add(child);
          }
        }
      }

      collect(toolbar);
      expect(items.map((SemanticsNode n) => n.label), <String>[
        'Bold',
        'Italic',
        'Insert link',
        'Done',
      ]);
      final SemanticsData bold = items[0].getSemanticsData();
      expect(bold.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(bold.hasFlag(SemanticsFlag.hasSelectedState), isTrue);
      expect(bold.hasFlag(SemanticsFlag.isSelected), isTrue);
      expect(items[1].getSemanticsData().hasFlag(SemanticsFlag.isSelected), isFalse);
      final SemanticsData link = items[2].getSemanticsData();
      expect(link.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(link.hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(items[3].getSemanticsData().hasFlag(SemanticsFlag.isButton), isTrue);
      // The toolbar adds nothing to its items, and is not itself a button.
      final SemanticsData own = toolbar.getSemanticsData();
      expect(own.hasFlag(SemanticsFlag.isButton), isFalse);
      expect(own.hasAction(SemanticsAction.tap), isFalse);
      handle.dispose();
    });

    testWidgets('TBR-12: an empty label still renders and is reported in debug builds once', (
      WidgetTester tester,
    ) async {
      final List<String> missing = collectMissingNames();
      await tester.pumpWidget(toolbarApp(SizedBox(width: 360, child: fourActions(label: ''))));
      await tester.pumpAndSettle();
      expect(missing, <String>['toolbar']);
      expect(find.byType(TanreiIconButton), findsNWidgets(4));
      await tester.pumpWidget(toolbarApp(SizedBox(width: 360, child: fourActions(label: ''))));
      expect(missing, <String>['toolbar']);
    });

    testWidgets('TBR-12: a toolbar with no item, or an element that is not an icon button or a '
        'button, still lays it out and is reported in debug builds', (WidgetTester tester) async {
      final List<String> reports = collectIgnored();
      await tester.pumpWidget(
        toolbarApp(
          const SizedBox(
            width: 360,
            child: TanreiToolbar(semanticLabel: 'Empty', children: <Widget>[]),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(reports, <String>['toolbar children']);
      expect(toolbarRect(tester).size, Size(360, docked.containerSize));

      reports.clear();
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(
            width: 360,
            child: TanreiToolbar(
              semanticLabel: 'Mixed',
              children: <Widget>[
                action('Archive'),
                const SizedBox(width: 120, height: 36, child: Text('Search')),
                // A product's wrapper around an icon button is an icon button.
                Padding(padding: EdgeInsets.zero, child: action('Move')),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(reports, <String>['toolbar children']);
      expect(find.text('Search'), findsOneWidget);
    });

    testWidgets('guidelines: toolbar', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiToolbarVariant variant in TanreiToolbarVariant.core) {
          await tester.pumpWidget(
            toolbarApp(
              SizedBox(
                width: 360,
                child: Center(
                  child: TanreiToolbar(
                    semanticLabel: 'Compose',
                    variant: variant,
                    children: <Widget>[
                      action('Attach file', icon: 'attach_file'),
                      action('Insert link', icon: 'link'),
                      TanreiButton(onPressed: () {}, child: const Text('Send')),
                    ],
                  ),
                ),
              ),
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

  group('unknown values and text size', () {
    testWidgets(
      'TBR-13: a variant the system does not have renders as docked, pixel for pixel, and '
      'debug builds report it',
      (WidgetTester tester) async {
        final List<String> reports = collectUnknownValues();
        Widget bar(TanreiToolbarVariant variant) => SizedBox(
          width: 360,
          child: TanreiToolbar(
            semanticLabel: 'Actions',
            variant: variant,
            children: <Widget>[action('Archive'), action('Delete')],
          ),
        );
        const Size surface = Size(392, 88);
        final FramePixels unknown = await framePixels(
          tester,
          system: system,
          surface: surface,
          child: bar(const TanreiToolbarVariant('vibrant')),
        );
        await tester.pumpAndSettle();
        expect(reports, contains('toolbar variant "vibrant" -> docked'));
        final FramePixels defaults = await framePixels(
          tester,
          system: system,
          surface: surface,
          child: bar(TanreiToolbarVariant.docked),
        );
        expect(unknown, defaults);
      },
    );

    testWidgets('TBR-13: a variant a layer adds takes the docked structure with its own values', (
      WidgetTester tester,
    ) async {
      const TanreiToolbarVariant vibrant = TanreiToolbarVariant('vibrant');
      final TanreiSystem layered = system.copyWith(
        toolbar: toolbarTokens.copyWith(
          variants: toolbarTokens.variants.copyWith(
            extra: <TanreiToolbarVariant, TanreiToolbarVariantTokens>{
              vibrant: floating.copyWith(
                containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
                outlineColor: const TanreiPaint.role(TanreiColorRole.primary),
                containerSize: 64,
              ),
            },
          ),
        ),
      );
      final List<String> reports = collectUnknownValues();
      const EdgeInsets insets = EdgeInsets.only(bottom: 20);
      await tester.pumpWidget(
        toolbarApp(
          SizedBox(width: 360, child: fourActions(variant: vibrant)),
          theme: TanreiThemeData(system: layered),
          padding: insets,
        ),
      );
      await tester.pumpAndSettle();
      expect(reports, isEmpty);
      final Rect bar = toolbarRect(tester);
      // Spanning the width, reaching under the inset, its own size and color, a top edge.
      expect(bar.size, Size(360, 64 + insets.bottom));
      expect(decorationOf(tester).color, light.primaryContainer);
      expect(edgeOf(tester).side, TanreiEdgeSide.top);
      expect(edgeOf(tester).color, light.primary);
      // Spreading its items: the first and last at the floating values' padding from the ends.
      expect(itemRect(tester, 'Archive').left - bar.left, floating.containerPaddingInline);
      expect(bar.right - itemRect(tester, 'Move').right, floating.containerPaddingInline);
    });

    test('TBR-13: an orientation the component does not define is horizontal, reported; every '
        'defined name is read as that value', () {
      final List<String> reports = collectUnknownValues();
      expect(TanreiToolbar.orientationFromName('horizontal'), Axis.horizontal);
      expect(TanreiToolbar.orientationFromName('vertical'), Axis.vertical);
      expect(reports, isEmpty);
      expect(TanreiToolbar.orientationFromName('diagonal'), Axis.horizontal);
      expect(reports, <String>['toolbar orientation "diagonal" -> horizontal']);
    });

    testWidgets('TBR-14: enlarged text grows the toolbar across its axis to hold its items; the '
        'toolbar scales nothing itself', (WidgetTester tester) async {
      Widget bar() => SizedBox(
        width: 360,
        child: TanreiToolbar(
          semanticLabel: 'Compose',
          children: <Widget>[
            action('Attach file', icon: 'attach_file'),
            TanreiButton(onPressed: () {}, child: const Text('Send')),
          ],
        ),
      );
      await tester.pumpWidget(toolbarApp(bar()));
      await tester.pumpAndSettle();
      expect(toolbarRect(tester).height, docked.containerSize);
      final Size icon = itemRect(tester, 'Attach file').size;

      await tester.pumpWidget(toolbarApp(bar(), textScaler: const TextScaler.linear(3)));
      await tester.pumpAndSettle();
      final Rect send = itemRect(tester, 'Send');
      expect(send.height, greaterThan(docked.containerSize));
      expect(toolbarRect(tester).height, greaterThanOrEqualTo(send.height));
      // The icon button keeps its size, as its own spec says.
      expect(itemRect(tester, 'Attach file').size, icon);
      expect(send.center.dy, moreOrLessEquals(toolbarRect(tester).center.dy));
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(docked.containerSize, 56);
      expect(floating.containerSize, 48);
      expect(docked.containerShape, system.shape.none);
      expect(floating.containerShape, system.shape.full);
      expect(docked.containerPaddingInline, system.space.space100);
      expect(floating.containerPaddingInline, system.space.space75);
      expect(docked.containerGap, system.space.space200);
      expect(floating.containerGap, system.space.space200);
      expect(floating.containerElevation, system.elevation.level3);
      expect(lightTheme.paint(floating.outlineColor).a, 0);
      expect(toolbarTokens.outlineWidth, system.measure.borderHairline);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the toolbar draws that system\'s docked and floating tokens', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiToolbarTokens tokens = shipped.toolbar;
        await tester.pumpWidget(
          toolbarApp(SizedBox(width: 360, child: fourActions()), theme: theme),
        );
        await tester.pumpAndSettle();
        final TanreiToolbarVariantTokens d = tokens.variants.docked;
        // The row holds the items' targets (cupertino's 44 row holds 48 targets).
        expect(
          toolbarRect(tester).height,
          d.containerSize > shipped.measure.targetTouch
              ? d.containerSize
              : shipped.measure.targetTouch,
        );
        final Color dockedColor = theme.paint(d.containerColor);
        expect(decorationOf(tester).color, dockedColor.a > 0 ? dockedColor : null);
        expect(edgeOf(tester).color, theme.paint(d.outlineColor));

        await tester.pumpWidget(
          toolbarApp(
            Center(child: fourActions(variant: TanreiToolbarVariant.floating)),
            theme: theme,
          ),
        );
        await tester.pumpAndSettle();
        final TanreiToolbarVariantTokens f = tokens.variants.floating;
        final TanreiContainerDecoration decoration = decorationOf(tester);
        expect(decoration.color, theme.paint(f.containerColor));
        expect(decoration.shape.radius, f.containerShape);
        expect(decoration.shape.smoothing, shipped.shape.cornerSmoothing);
        final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
          f.containerElevation,
          theme.colors,
        );
        expect(decoration.boxShadow, elevation.shadows.isEmpty ? isNull : elevation.shadows);
        final double item = shipped.iconButton.sizes.medium.containerSize;
        expect(
          toolbarRect(tester).width,
          2 * f.containerPaddingInline + 4 * item + 3 * f.containerGap,
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('toolbar');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'docked',
        'docked-button',
        'docked-one-item',
        'docked-disabled-item',
        'floating',
        'floating-filled-action',
        'floating-vertical',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        final TanreiToolbar toolbar = fixtureToolbar(fixture);
        await expectFixtureGolden(
          tester,
          system: system,
          surface: goldenSurfaceFor(toolbar),
          child: staged(toolbar),
          file: 'goldens/toolbar/$id.png',
          settle: true,
        );
      });
    }

    // One representative fixture per shipped preset: the floating toolbar shows the
    // preset's container color, elevation and corners, and a toggle on and off.
    const String recorded = 'floating';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        final TanreiToolbar toolbar = fixtureToolbar(
          fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
        );
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: goldenSurfaceFor(toolbar),
          child: staged(toolbar),
          file: 'goldens/toolbar/${preset.id}/$recorded.png',
          settle: true,
        );
      });
    }
  });
}
