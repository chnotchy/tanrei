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
final TanreiButtonGroupTokens groupTokens = system.buttonGroup;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every fixture: BGR-1's `verify` asks for 400 × 96, the group at its natural width,
/// start-aligned and vertically centred. The test font's square glyphs make the `standard` row 422
/// wide, which a 400 stage would narrow (BGR-7), so the stage is 480 wide here;
/// inside the `space200` padding of every baseline.
const Size stage = Size(480, 96);
const Size groupGoldenSurface = Size(512, 128);

/// The fixtures' icon names, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'edit': 0xe3c9,
  'share': 0xe80d,
  'delete': 0xe872,
  'format_bold': 0xe238,
  'format_italic': 0xe23f,
  'format_underlined': 0xe249,
};

Widget glyph(String name) => Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// The group a fixture describes (BGR-1's `verify`), on its stage.
Widget fixtureGroup(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox.fromSize(
    size: stage,
    child: Align(
      alignment: AlignmentDirectional.centerStart,
      child: TanreiButtonGroup(
        variant: TanreiButtonGroupVariant.fromName(props['variant'] as String? ?? 'standard'),
        semanticLabel: props['label'] as String? ?? '',
        children: <Widget>[
          for (final Map<String, dynamic> item
              in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
            fixtureItem(item),
        ],
      ),
    ),
  );
}

Widget fixtureItem(Map<String, dynamic> item) {
  final Map<String, dynamic> props = item['props'] as Map<String, dynamic>? ?? <String, dynamic>{};
  final String content = item['content'] as String? ?? '';
  final bool disabled = props['disabled'] == true;
  return switch (item['kind']) {
    'icon-button' => TanreiIconButton(
      onPressed: disabled ? null : () {},
      icon: glyph(content),
      semanticLabel: props['label'] as String? ?? '',
      isSelected: props['toggle'] == true ? props['selected'] == true : null,
      variant: TanreiIconButtonVariant(props['variant'] as String? ?? 'standard'),
      size: TanreiIconButtonSize(props['size'] as String? ?? 'medium'),
    ),
    _ => TanreiButton(
      onPressed: disabled ? null : () {},
      variant: TanreiButtonVariant(props['variant'] as String? ?? 'filled'),
      size: TanreiButtonSize(props['size'] as String? ?? 'medium'),
      child: Text(content),
    ),
  };
}

/// Collects what the group reports (BGR-7, BGR-10), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

Widget groupApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  TextDirection textDirection = TextDirection.ltr,
  double textScale = 1,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
      child: Directionality(textDirection: textDirection, child: child),
    ),
  ),
  theme: theme,
);

/// Three outlined buttons (the `connected` fixture's), each counting its presses in [presses].
List<Widget> clipboard({Map<String, int>? presses, String? disabled, TanreiButtonSize? size}) =>
    <Widget>[
      for (final String label in <String>['Cut', 'Copy', 'Paste'])
        TanreiButton(
          onPressed: label == disabled
              ? null
              : () => presses?.update(label, (int n) => n + 1, ifAbsent: () => 1),
          variant: TanreiButtonVariant.outlined,
          size: size ?? TanreiButtonSize.medium,
          child: Text(label),
        ),
    ];

/// The container of the button labelled [label] (a Button's text or an icon button's name).
Finder containerOf(String label) {
  final Finder item =
      find.ancestor(of: find.text(label), matching: find.byType(TanreiButton)).evaluate().isNotEmpty
      ? find.ancestor(of: find.text(label), matching: find.byType(TanreiButton))
      : find.byWidgetPredicate((Widget w) => w is TanreiIconButton && w.semanticLabel == label);
  return find
      .descendant(
        of: item,
        matching: find.byWidgetPredicate(
          (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
        ),
      )
      .first;
}

TanreiContainerDecoration decorationOf(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(containerOf(label)).decoration as TanreiContainerDecoration;

RenderTanreiButtonGroupRow rowOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiButtonGroupRow>().toSet().single;

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

  node.visitChildren((SemanticsNode child) {
    visit(child);
    return true;
  });
  return found;
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('layout', () {
    testWidgets('BGR-1: standard lays its items out in one row, in order, standard.gap apart, each '
        'at its own size and centred on the row\'s middle', (WidgetTester tester) async {
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            children: <Widget>[
              TanreiButton(onPressed: () {}, size: TanreiButtonSize.small, child: const Text('A')),
              TanreiButton(
                onPressed: () {},
                size: TanreiButtonSize.large,
                child: const Text('Bee'),
              ),
            ],
          ),
        ),
      );
      final Rect a = tester.getRect(find.byType(TanreiButton).first);
      final Rect b = tester.getRect(find.byType(TanreiButton).last);
      expect(b.left - a.right, groupTokens.standardGap);
      expect(a.center.dy, b.center.dy);
      expect(tester.getSize(containerOf('A')).height, system.button.sizes.small.containerHeight);
      expect(tester.getSize(containerOf('Bee')).height, system.button.sizes.large.containerHeight);
    });

    testWidgets('BGR-1: connected joins its items connected.gap apart and stretches each to the '
        'tallest, even when a label is enlarged', (WidgetTester tester) async {
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            variant: TanreiButtonGroupVariant.connected,
            children: <Widget>[
              TanreiButton(onPressed: () {}, size: TanreiButtonSize.small, child: const Text('A')),
              TanreiButton(onPressed: () {}, size: TanreiButtonSize.large, child: const Text('B')),
              TanreiIconButton(onPressed: () {}, icon: glyph('edit'), semanticLabel: 'Edit'),
            ],
          ),
        ),
      );
      final Rect a = tester.getRect(containerOf('A'));
      final Rect b = tester.getRect(containerOf('B'));
      final Rect edit = tester.getRect(containerOf('Edit'));
      expect(b.left - a.right, groupTokens.connectedGap);
      expect(edit.left - b.right, groupTokens.connectedGap);
      final double tallest = system.button.sizes.large.containerHeight;
      expect(<double>[a.height, b.height, edit.height], everyElement(tallest));
      expect(a.top, b.top);
    });

    testWidgets(
      'BGR-2, BTN-10, ICB-10: connected gives every corner that faces a neighbour connected.inner-shape '
      'and leaves the outer corners the item\'s own; the focus ring follows the shape',
      (WidgetTester tester) async {
        for (final TanreiSystem of in <TanreiSystem>[system, m3LikeSystem, cupertinoSystem]) {
          await tester.pumpWidget(
            groupApp(
              TanreiButtonGroup(
                key: UniqueKey(),
                variant: TanreiButtonGroupVariant.connected,
                children: clipboard(),
              ),
              theme: TanreiThemeData(system: of),
            ),
          );
          final double inner = of.buttonGroup.connectedInnerShape;
          final double own = of.button.containerShape;
          expect(
            decorationOf(tester, 'Cut').shape.radii,
            TanreiCornerRadii(topLeft: own, topRight: inner, bottomRight: inner, bottomLeft: own),
            reason: of.id,
          );
          expect(decorationOf(tester, 'Copy').shape.radii, TanreiCornerRadii.all(inner));
          expect(
            decorationOf(tester, 'Paste').shape.radii,
            TanreiCornerRadii(topLeft: inner, topRight: own, bottomRight: own, bottomLeft: inner),
          );
          expect(decorationOf(tester, 'Cut').shape.smoothing, of.shape.cornerSmoothing);
        }
        await tester.pumpWidget(
          groupApp(
            TanreiButtonGroup(
              key: UniqueKey(),
              variant: TanreiButtonGroupVariant.connected,
              children: clipboard(),
            ),
          ),
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
          find.descendant(
            of: find.ancestor(of: find.text('Cut'), matching: find.byType(TanreiButton)),
            matching: find.byType(TanreiFocusRing),
          ),
        );
        expect(ring.visible, isTrue);
        expect(ring.borderRadius, decorationOf(tester, 'Cut').shape.borderRadius);
      },
    );

    testWidgets('BGR-2: standard leaves every corner as the item draws it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(groupApp(TanreiButtonGroup(children: clipboard())));
      for (final String label in <String>['Cut', 'Copy', 'Paste']) {
        final TanreiCornerShape shape = decorationOf(tester, label).shape;
        expect(shape.corners, isNull);
        expect(shape.radius, system.button.containerShape);
      }
    });

    testWidgets('BGR-3: connected makes each item at least the touch target wide — an icon button '
        'widens around its centred icon — and extends the hit areas above and below the row', (
      WidgetTester tester,
    ) async {
      final List<String> pressed = <String>[];
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            variant: TanreiButtonGroupVariant.connected,
            children: <Widget>[
              for (final String name in <String>['format_bold', 'format_italic'])
                TanreiIconButton(
                  onPressed: () => pressed.add(name),
                  icon: glyph(name),
                  semanticLabel: name,
                  size: TanreiIconButtonSize.small,
                ),
            ],
          ),
        ),
      );
      final double target = system.measure.targetTouch;
      final Rect bold = tester.getRect(containerOf('format_bold'));
      expect(bold.width, target);
      expect(bold.height, system.iconButton.sizes.small.containerSize);
      final Rect icon = tester.getRect(
        find.descendant(
          of: find.byWidgetPredicate(
            (Widget w) => w is TanreiIconButton && w.semanticLabel == 'format_bold',
          ),
          matching: find.byType(TanreiControlIcon),
        ),
      );
      expect(icon.center, bold.center);
      final Rect row = tester.getRect(find.byType(TanreiButtonGroup));
      expect(row.height, target);
      final Rect italic = tester.getRect(containerOf('format_italic'));
      await tester.tapAt(Offset(italic.center.dx, row.top + 1));
      await tester.tapAt(Offset(bold.center.dx, row.bottom - 1));
      await tester.pumpAndSettle();
      expect(pressed, <String>['format_italic', 'format_bold']);
    });

    testWidgets('BGR-4: in a standard group a press on an item\'s visible bounds is that item\'s, '
        'and a press in the gap goes to the nearer item', (WidgetTester tester) async {
      final Map<String, int> presses = <String, int>{};
      await tester.pumpWidget(groupApp(TanreiButtonGroup(children: clipboard(presses: presses))));
      final Rect cut = tester.getRect(containerOf('Cut'));
      final Rect copy = tester.getRect(containerOf('Copy'));
      await tester.tapAt(cut.centerRight - const Offset(1, 0));
      await tester.tapAt(copy.centerLeft + const Offset(1, 0));
      await tester.pumpAndSettle();
      expect(presses, <String, int>{'Cut': 1, 'Copy': 1});
      // In the gap: nearer to Cut, then nearer to Copy.
      final double gapStart = tester.getRect(find.byType(TanreiButton).first).right;
      final double gapEnd = tester.getRect(find.byType(TanreiButton).at(1)).left;
      expect(gapEnd - gapStart, groupTokens.standardGap);
      await tester.tapAt(Offset(gapStart + 1, cut.center.dy));
      await tester.tapAt(Offset(gapEnd - 1, cut.center.dy));
      await tester.pumpAndSettle();
      expect(presses, <String, int>{'Cut': 2, 'Copy': 2});
    });

    testWidgets('BGR-7: a row wider than its layout narrows its Buttons in proportion, down to '
        'their longest word, keeps icon buttons at their size, never wraps or scrolls, and reports '
        'a row that still does not fit', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      Widget group(double width) => groupApp(
        SizedBox(
          width: width,
          child: Align(
            alignment: Alignment.centerLeft,
            child: TanreiButtonGroup(
              children: <Widget>[
                TanreiButton(onPressed: () {}, child: const Text('Save a draft')),
                TanreiButton(onPressed: () {}, child: const Text('Publish now')),
                TanreiIconButton(onPressed: () {}, icon: glyph('share'), semanticLabel: 'Share'),
              ],
            ),
          ),
        ),
      );
      await tester.pumpWidget(group(1000));
      final double draft = tester.getSize(find.byType(TanreiButton).first).width;
      final double publish = tester.getSize(find.byType(TanreiButton).last).width;
      final double share = tester.getSize(find.byType(TanreiIconButton)).width;
      final double natural = draft + publish + share + 2 * groupTokens.standardGap;
      // A little narrower: both Buttons narrow in proportion, the icon button keeps its size.
      await tester.pumpWidget(group(natural - 40));
      await tester.pumpAndSettle();
      final double draft2 = tester.getSize(find.byType(TanreiButton).first).width;
      final double publish2 = tester.getSize(find.byType(TanreiButton).last).width;
      expect(tester.getSize(find.byType(TanreiIconButton)).width, share);
      expect(draft2 / draft, moreOrLessEquals(publish2 / publish, epsilon: 0.01));
      expect(draft2 + publish2, moreOrLessEquals(draft + publish - 40));
      expect(
        tester.getSize(find.text('Save a draft')).height,
        greaterThan(system.button.sizes.medium.labelTypescale.lineHeight),
        reason: 'the label wraps',
      );
      expect(rowOf(tester).overflows, isFalse);
      expect(reports, isEmpty);
      // Far too narrow: the Buttons stop at their longest word, and the row is reported once.
      await tester.pumpWidget(group(120));
      await tester.pumpAndSettle();
      expect(rowOf(tester).overflows, isTrue);
      expect(reports, <Matcher>[contains('overflows')]);
      await tester.pump();
      expect(reports, hasLength(1));
      tester.takeException();
    });

    testWidgets('BGR-8: in a right-to-left layout the items start from the right and the inner '
        'corners mirror', (WidgetTester tester) async {
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(variant: TanreiButtonGroupVariant.connected, children: clipboard()),
          textDirection: TextDirection.rtl,
        ),
      );
      expect(
        tester.getRect(containerOf('Cut')).left,
        greaterThan(tester.getRect(containerOf('Paste')).left),
      );
      final double inner = groupTokens.connectedInnerShape;
      final double own = system.button.containerShape;
      expect(
        decorationOf(tester, 'Cut').shape.radii,
        TanreiCornerRadii(topLeft: inner, topRight: own, bottomRight: own, bottomLeft: inner),
      );
    });

    testWidgets('BGR-9: a variant name the group does not define renders as standard and is '
        'reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      expect(TanreiButtonGroupVariant.fromName('split'), TanreiButtonGroupVariant.standard);
      expect(reports, <String>['button-group variant "split" -> standard']);
      expect(TanreiButtonGroupVariant.fromName('connected'), TanreiButtonGroupVariant.connected);
    });

    testWidgets('BGR-10: fewer than two items, or a child that is not a Tanrei Button or icon '
        'button, still render and are reported once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            variant: TanreiButtonGroupVariant.connected,
            children: <Widget>[TanreiButton(onPressed: () {}, child: const Text('Alone'))],
          ),
        ),
      );
      expect(find.text('Alone'), findsOneWidget);
      expect(reports, <Matcher>[contains('holds 1')]);
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            children: <Widget>[
              TanreiButton(onPressed: () {}, child: const Text('One')),
              const Text('Stray'),
            ],
          ),
        ),
      );
      expect(find.text('Stray'), findsOneWidget);
      expect(reports.last, contains('a Text is laid out as it is'));
      final int count = reports.length;
      await tester.pump();
      expect(reports, hasLength(count));
    });

    testWidgets(
      'BGR-11: an item that becomes disabled keeps its place, gap and corners; one that is '
      'removed or added makes the corners recompute at once',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          groupApp(
            TanreiButtonGroup(variant: TanreiButtonGroupVariant.connected, children: clipboard()),
          ),
        );
        final Rect copy = tester.getRect(containerOf('Copy'));
        final TanreiCornerRadii corners = decorationOf(tester, 'Copy').shape.radii;
        await tester.pumpWidget(
          groupApp(
            TanreiButtonGroup(
              variant: TanreiButtonGroupVariant.connected,
              children: clipboard(disabled: 'Copy'),
            ),
          ),
        );
        expect(tester.getRect(containerOf('Copy')), copy);
        expect(decorationOf(tester, 'Copy').shape.radii, corners);
        // Paste removed: Copy is the last item, its end corners its own, in the same frame.
        await tester.pumpWidget(
          groupApp(
            TanreiButtonGroup(
              variant: TanreiButtonGroupVariant.connected,
              children: clipboard().take(2).toList(),
            ),
          ),
        );
        expect(decorationOf(tester, 'Copy').shape.radii.topRight, system.button.containerShape);
      },
    );
  });

  group('items keep themselves', () {
    testWidgets('BGR-5: each item draws from its own tokens, answers its own states and events, '
        'and is its own Tab stop; the group takes no focus, handles no arrow keys and keeps no '
        'selection', (WidgetTester tester) async {
      final Map<String, int> presses = <String, int>{};
      bool bold = true;
      await tester.pumpWidget(
        groupApp(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) => TanreiButtonGroup(
              variant: TanreiButtonGroupVariant.connected,
              children: <Widget>[
                ...clipboard(presses: presses),
                TanreiIconButton(
                  onPressed: () => setState(() => bold = !bold),
                  isSelected: bold,
                  icon: glyph('format_bold'),
                  semanticLabel: 'Bold',
                  variant: TanreiIconButtonVariant.tonal,
                ),
              ],
            ),
          ),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> stops = <String>[];
      for (int i = 0; i < 4; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        final BuildContext focused = FocusManager.instance.primaryFocus!.context!;
        final TanreiButton? button = focused.findAncestorWidgetOfExactType<TanreiButton>();
        final TanreiIconButton? icon = focused.findAncestorWidgetOfExactType<TanreiIconButton>();
        stops.add(button == null ? icon!.semanticLabel : (button.child as Text).data!);
      }
      expect(stops, <String>['Cut', 'Copy', 'Paste', 'Bold']);
      // The group handles no arrow key: Left Arrow does what the app's directional focus does
      // (the item to the left), exactly as without the group; the items are the only focus nodes.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(
        FocusManager.instance.primaryFocus!.context!
            .findAncestorWidgetOfExactType<TanreiButton>()
            ?.child,
        isA<Text>().having((Text t) => t.data, 'label', 'Paste'),
      );
      final Element groupElement = tester.element(find.byType(TanreiButtonGroup));
      final Iterable<FocusNode> inGroup = FocusManager.instance.rootScope.descendants.where((
        FocusNode node,
      ) {
        bool below = false;
        node.context?.visitAncestorElements((Element e) {
          below = identical(e, groupElement);
          return !below;
        });
        return below;
      });
      // Every focus node below the group belongs to an item.
      expect(inGroup, isNotEmpty);
      for (final FocusNode node in inGroup) {
        final BuildContext context = node.context!;
        expect(
          context.findAncestorWidgetOfExactType<TanreiButton>() != null ||
              context.findAncestorWidgetOfExactType<TanreiIconButton>() != null,
          isTrue,
          reason: '$node',
        );
      }
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      // The toggle keeps its own state; the other items are untouched.
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(bold, isFalse);
      expect(presses, isEmpty);
      // Each draws its own tokens: the focused toggle its tonal unselected focused container.
      final TanreiIconButtonVariantTokens tonal = system.iconButton.variants.tonal;
      expect(
        decorationOf(tester, 'Bold').color,
        lightTheme.paint(tonal.focused.unselectedContainerColor),
      );
      expect(
        decorationOf(tester, 'Cut').border!.top.color,
        lightTheme.paint(system.button.variants.outlined.enabled.outlineColor),
      );
      await tester.tap(find.text('Paste'));
      await tester.pumpAndSettle();
      expect(presses, <String, int>{'Paste': 1});
    });
  });

  group('accessibility semantics', () {
    testWidgets('BGR-6: with a label the group is a node named by it that contains its items; '
        'without one it adds no node', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        groupApp(
          TanreiButtonGroup(
            variant: TanreiButtonGroupVariant.connected,
            semanticLabel: 'Clipboard',
            children: clipboard(),
          ),
        ),
      );
      final SemanticsNode group = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'Clipboard');
      final List<SemanticsData> items = <SemanticsData>[];
      group.visitChildren((SemanticsNode child) {
        items.add(child.getSemanticsData());
        return true;
      });
      expect(items.map((SemanticsData d) => d.label), <String>['Cut', 'Copy', 'Paste']);
      expect(items.every((SemanticsData d) => d.hasFlag(SemanticsFlag.isButton)), isTrue);
      // BGR-3: each item's node spans its hit area, at least the target tall.
      expect(items.every((SemanticsData d) => d.rect.height >= system.measure.targetTouch), isTrue);

      await tester.pumpWidget(groupApp(TanreiButtonGroup(children: clipboard())));
      final List<String> labels = nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData().label)
          .where((String l) => l.isNotEmpty)
          .toList();
      expect(labels, <String>['Cut', 'Copy', 'Paste']);
      handle.dispose();
    });

    testWidgets('guidelines: button group', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiButtonGroupVariant variant in TanreiButtonGroupVariant.values) {
          await tester.pumpWidget(
            groupApp(
              TanreiButtonGroup(
                key: UniqueKey(),
                variant: variant,
                semanticLabel: 'Text style',
                children: <Widget>[
                  ...clipboard(size: TanreiButtonSize.small),
                  TanreiIconButton(
                    onPressed: () {},
                    icon: glyph('format_bold'),
                    semanticLabel: 'Bold',
                    size: TanreiIconButtonSize.small,
                  ),
                ],
              ),
              theme: theme,
            ),
          );
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
    test('the tokens the group reads: their defaults, the standard gap widened for '
        'whole 48 targets', () {
      expect(groupTokens.standardGap, system.space.space200);
      expect(
        groupTokens.standardGap,
        greaterThanOrEqualTo(
          system.measure.targetTouch - system.iconButton.sizes.small.containerSize,
        ),
      );
      expect(groupTokens.connectedGap, system.space.space25);
      expect(groupTokens.connectedInnerShape, system.shape.extraSmall);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": a connected group draws that system\'s gap and inner corners', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(
          groupApp(
            TanreiButtonGroup(variant: TanreiButtonGroupVariant.connected, children: clipboard()),
            theme: TanreiThemeData(system: shipped),
          ),
        );
        expect(
          tester.getRect(containerOf('Copy')).left - tester.getRect(containerOf('Cut')).right,
          shipped.buttonGroup.connectedGap,
        );
        expect(
          decorationOf(tester, 'Copy').shape.radii,
          TanreiCornerRadii.all(shipped.buttonGroup.connectedInnerShape),
        );
        expect(
          math.max(tester.getSize(find.byType(TanreiButtonGroup)).height, 0),
          math.max(shipped.button.sizes.medium.containerHeight, shipped.measure.targetTouch),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('button-group');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'standard',
        'standard-icon-buttons',
        'connected',
        'connected-icon-buttons',
        'connected-large',
        'connected-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: groupGoldenSurface,
          child: fixtureGroup(fixture),
          file: 'goldens/button_group/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the connected toggles show the
    // preset's gap, inner corners and outer corners at once.
    const String recorded = 'connected-icon-buttons';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: groupGoldenSurface,
          child: fixtureGroup(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/button_group/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
