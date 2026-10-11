import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiMenuTokens menuTokens = system.menu;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The frame of the menu baselines: the widest surface (`surface.max-width`, 320) inside the
/// `space200` padding of every baseline, and tall enough for the tallest fixture, `group-titles`
/// (two titles, five rows of the 48 touch target, a divider).
const Size menuGoldenSurface = Size(360, 400);

/// The fixtures' icon names, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'content_cut': 0xe14e,
  'content_copy': 0xe14d,
  'content_paste': 0xe14f,
  'link': 0xe157,
  'open_in_new': 0xe89e,
  'archive': 0xe149,
  'delete': 0xe872,
};

Widget? glyph(String? name) =>
    name == null || name.isEmpty ? null : Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// One item of a fixture's `items`, a group holding its own.
Widget fixtureEntry(Map<String, dynamic> item) {
  final Map<String, dynamic> props = item['props'] as Map<String, dynamic>;
  final String label = props['label'] as String? ?? '';
  final bool disabled = props['disabled'] == true;
  final String supporting = props['supportingText'] as String? ?? '';
  final String trailingText = props['trailingText'] as String? ?? '';
  final Widget? leadingIcon = glyph(props['leadingIcon'] as String?);
  final Widget? trailingIcon = glyph(props['trailingIcon'] as String?);
  return switch (item['kind'] as String) {
    'checkbox-item' => TanreiCheckboxMenuItem(
      value: props['checked'] == true,
      onChanged: disabled ? null : (_) {},
      supportingText: supporting,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      trailingText: trailingText,
      child: Text(label),
    ),
    'radio-item' => TanreiRadioMenuItem<String>(
      value: props['value'] as String? ?? '',
      enabled: !disabled,
      supportingText: supporting,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      trailingText: trailingText,
      child: Text(label),
    ),
    'group' => TanreiMenuGroup<String>(
      title: props['title'] as String? ?? '',
      groupValue: props['value'] as String?,
      onChanged: (_) {},
      children: <Widget>[
        for (final Map<String, dynamic> inner
            in (item['items'] as List<dynamic>).cast<Map<String, dynamic>>())
          fixtureEntry(inner),
      ],
    ),
    _ => TanreiMenuItem(
      onPressed: disabled ? null : () {},
      destructive: props['destructive'] == true,
      supportingText: supporting,
      leadingIcon: leadingIcon,
      trailingIcon: trailingIcon,
      trailingText: trailingText,
      child: Text(label),
    ),
  };
}

/// The open menu a fixture describes, drawn in place (MNU-19's `verify`).
Widget fixtureMenu(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return TanreiMenuAnchor.inPlace(
    placement: TanreiMenuPlacement.fromName(props['placement'] as String? ?? 'bottom-start'),
    menuChildren: <Widget>[
      for (final Map<String, dynamic> item
          in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
        fixtureEntry(item),
    ],
  );
}

/// Collects what the menu reports as ignored (MNU-29), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

TanreiMenuItem action(
  String label, {
  VoidCallback? onPressed,
  bool enabled = true,
  bool destructive = false,
  Widget? leadingIcon,
  String supportingText = '',
  String trailingText = '',
}) => TanreiMenuItem(
  onPressed: enabled ? (onPressed ?? () {}) : null,
  destructive: destructive,
  leadingIcon: leadingIcon,
  supportingText: supportingText,
  trailingText: trailingText,
  child: Text(label),
);

/// A menu anchored to a "More" button, in an overlay, at [alignment] of an 800 x 600 view.
Widget menuApp({
  required TanreiMenuController controller,
  required List<Widget> items,
  TanreiMenuPlacement placement = TanreiMenuPlacement.bottomStart,
  ValueChanged<TanreiMenuCloseReason>? onClose,
  AlignmentGeometry alignment = Alignment.topLeft,
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  FocusNode? buttonNode,
  List<Widget> before = const <Widget>[],
  List<Widget> after = const <Widget>[],
}) => tanreiTestApp(
  Directionality(
    textDirection: textDirection,
    child: Overlay.wrap(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Align(
          alignment: alignment,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              ...before,
              TanreiMenuAnchor(
                controller: controller,
                placement: placement,
                onClose: (TanreiMenuCloseReason reason) {
                  onClose?.call(reason);
                },
                menuChildren: items,
                builder: (BuildContext context, TanreiMenuController menu, Widget? child) =>
                    TanreiButton(
                      focusNode: buttonNode,
                      onPressed: () => menu.isOpen ? menu.close() : menu.open(),
                      child: const Text('More'),
                    ),
              ),
              ...after,
            ],
          ),
        ),
      ),
    ),
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

TanreiMenuController newController() {
  final TanreiMenuController controller = TanreiMenuController();
  addTearDown(controller.dispose);
  return controller;
}

FocusNode newNode() {
  final FocusNode node = FocusNode();
  addTearDown(node.dispose);
  return node;
}

RenderTanreiMenuPosition positionOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiMenuPosition>().toSet().single;

/// The surface's rect in global coordinates.
Rect surfaceRect(WidgetTester tester) {
  final RenderTanreiMenuPosition position = positionOf(tester);
  return position.surfaceRect.shift(position.localToGlobal(Offset.zero));
}

Finder entryOf(String label) => find
    .ancestor(
      of: find.text(label),
      matching: find.byWidgetPredicate((Widget w) => w is TanreiMenuEntry),
    )
    .first;

Finder containerOfEntry(String label) => find
    .ancestor(
      of: find.text(label),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(containerOfEntry(label)).decoration as TanreiContainerDecoration;

Color fillOf(WidgetTester tester, String label) =>
    decorationOf(tester, label).color ?? const Color(0x00000000);

Color textColor(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!
    .color!;

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

double opacityOf(WidgetTester tester, String label) => tester
    .widget<Opacity>(find.descendant(of: entryOf(label), matching: find.byType(Opacity)).first)
    .opacity;

bool ringVisible(WidgetTester tester, String label) => tester
    .widget<TanreiFocusRing>(
      find.descendant(of: entryOf(label), matching: find.byType(TanreiFocusRing)),
    )
    .visible;

TanreiCheckMarkPainter markOf(WidgetTester tester, String label) =>
    tester
            .widget<CustomPaint>(
              find.descendant(
                of: entryOf(label),
                matching: find.byWidgetPredicate(
                  (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
                ),
              ),
            )
            .painter!
        as TanreiCheckMarkPainter;

String focusedLabel() =>
    FocusManager.instance.primaryFocus?.context
        ?.findAncestorWidgetOfExactType<TanreiMenuItem>()
        ?.labelText ??
    FocusManager.instance.primaryFocus?.context
        ?.findAncestorWidgetOfExactType<TanreiCheckboxMenuItem>()
        ?.labelText ??
    FocusManager.instance.primaryFocus?.context
        ?.findAncestorWidgetOfExactType<TanreiRadioMenuItem<String>>()
        ?.labelText ??
    '';

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

Future<TestGesture> hoverOver(WidgetTester tester, Finder target) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(target));
  await tester.pumpAndSettle();
  return mouse;
}

/// An in-place menu of [items], with an owner of checked states where given.
Widget inPlace(
  List<Widget> items, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  ValueChanged<TanreiMenuCloseReason>? onClose,
}) => tanreiTestApp(
  TanreiMenuAnchor.inPlace(onClose: onClose, menuChildren: items),
  theme: theme,
  disableAnimations: disableAnimations,
);

const List<String> three = <String>['Cut', 'Copy', 'Paste'];

List<Widget> threeActions({List<String>? pressed}) => <Widget>[
  for (final String label in three) action(label, onPressed: () => pressed?.add(label)),
];

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('presentation and focus', () {
    testWidgets(
      'MNU-1: open presents the surface in the overlay at comp.menu.surface.elevation and '
      'focuses the first enabled item; close removes it and returns focus to the anchor',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        final FocusNode button = newNode();
        await tester.pumpWidget(
          menuApp(
            controller: controller,
            buttonNode: button,
            items: <Widget>[action('Cut', enabled: false), action('Copy'), action('Paste')],
          ),
        );
        expect(find.text('Copy'), findsNothing);
        await tester.tap(find.text('More'));
        await tester.pumpAndSettle();
        expect(controller.isOpen, isTrue);
        expect(find.text('Copy'), findsOneWidget);
        // In the overlay, not below the anchor in the widget's own subtree's layout.
        expect(
          find.ancestor(of: find.text('Copy'), matching: find.byType(TanreiButton)),
          findsNothing,
        );
        expect(focusedLabel(), 'Copy', reason: 'the first enabled item');
        // Opened by a pointer: focus without the ring (MNU-11).
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.pump();
        expect(ringVisible(tester, 'Copy'), isFalse);
        final TanreiContainerDecoration surface =
            tester
                    .widget<DecoratedBox>(
                      find
                          .ancestor(
                            of: find.byType(SingleChildScrollView),
                            matching: find.byWidgetPredicate(
                              (Widget w) =>
                                  w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                            ),
                          )
                          .first,
                    )
                    .decoration
                as TanreiContainerDecoration;
        final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
          menuTokens.surfaceElevation,
          light,
        );
        expect(surface.boxShadow, elevation.shadows);
        expect(surface.border, elevation.ring);
        expect(surface.color, lightTheme.paint(menuTokens.surfaceColor));

        controller.close();
        await tester.pumpAndSettle();
        expect(find.text('Copy'), findsNothing);
        expect(button.hasPrimaryFocus, isTrue);
      },
    );

    testWidgets('MNU-25: the menu traps nothing, makes nothing inert and draws no scrim', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      int taps = 0;
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          items: threeActions(),
          after: <Widget>[
            const SizedBox(width: 300),
            TanreiButton(onPressed: () => taps++, child: const Text('Other')),
          ],
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      expect(find.byType(ModalBarrier), findsNothing);
      // The rest of the screen still takes presses (the menu also closes, MNU-5).
      await tester.tap(find.text('Other'));
      await tester.pumpAndSettle();
      expect(taps, 1);
    });
  });

  group('placement', () {
    Future<Rect> anchorAndOpen(
      WidgetTester tester, {
      required TanreiMenuPlacement placement,
      AlignmentGeometry alignment = Alignment.topLeft,
      TextDirection textDirection = TextDirection.ltr,
      List<Widget>? items,
    }) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          placement: placement,
          alignment: alignment,
          textDirection: textDirection,
          items: items ?? threeActions(),
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      return tester.getRect(find.byType(TanreiButton));
    }

    testWidgets(
      'MNU-2: each placement puts the surface comp.menu.surface.offset from the anchor on '
      'its side, start or end edges aligned; right-to-left mirrors start and end',
      (WidgetTester tester) async {
        final double offset = menuTokens.surfaceOffset;
        Rect anchor = await anchorAndOpen(tester, placement: TanreiMenuPlacement.bottomStart);
        Rect surface = surfaceRect(tester);
        expect(surface.left, anchor.left);
        expect(surface.top, anchor.bottom + offset);

        anchor = await anchorAndOpen(
          tester,
          placement: TanreiMenuPlacement.bottomEnd,
          alignment: Alignment.topCenter,
        );
        surface = surfaceRect(tester);
        expect(surface.right, anchor.right);

        anchor = await anchorAndOpen(
          tester,
          placement: TanreiMenuPlacement.topStart,
          alignment: Alignment.bottomCenter,
        );
        surface = surfaceRect(tester);
        expect(surface.bottom, anchor.top - offset);
        expect(surface.left, anchor.left);
        expect(positionOf(tester).isAbove, isTrue);

        anchor = await anchorAndOpen(
          tester,
          placement: TanreiMenuPlacement.bottomStart,
          alignment: Alignment.topCenter,
          textDirection: TextDirection.rtl,
        );
        surface = surfaceRect(tester);
        expect(surface.right, anchor.right, reason: 'start is the right edge in right-to-left');
      },
    );

    testWidgets('MNU-2: a side with too little room flips to the other; the surface shifts to stay '
        'surface.viewport-margin inside, and limits its height to the room left and scrolls', (
      WidgetTester tester,
    ) async {
      final double margin = menuTokens.surfaceViewportMargin;
      // Below has no room at the bottom of the view: above.
      Rect anchor = await anchorAndOpen(
        tester,
        placement: TanreiMenuPlacement.bottomStart,
        alignment: Alignment.bottomLeft,
      );
      expect(positionOf(tester).isAbove, isTrue);
      expect(surfaceRect(tester).bottom, anchor.top - menuTokens.surfaceOffset);
      // Start-aligned at the right edge of the view: shifted in.
      anchor = await anchorAndOpen(
        tester,
        placement: TanreiMenuPlacement.bottomStart,
        alignment: Alignment.topRight,
      );
      final Size view = tester.view.physicalSize / tester.view.devicePixelRatio;
      expect(surfaceRect(tester).right, view.width - margin);
      // Twenty items in the room left: the height is limited and the items scroll.
      anchor = await anchorAndOpen(
        tester,
        placement: TanreiMenuPlacement.bottomStart,
        alignment: Alignment.center,
        items: <Widget>[for (int i = 0; i < 20; i++) action('Item $i')],
      );
      final Rect surface = surfaceRect(tester);
      final double room = view.height - margin - (anchor.bottom + menuTokens.surfaceOffset);
      final double above = anchor.top - menuTokens.surfaceOffset - margin;
      expect(surface.height, moreOrLessEquals(room > above ? room : above));
      final ScrollableState scrollable = tester.state(find.byType(Scrollable).last);
      expect(scrollable.position.maxScrollExtent, greaterThan(0));
      // Keyboard focus scrolls the focused item into view.
      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Item 19');
      expect(scrollable.position.pixels, greaterThan(0));
    });

    testWidgets('MNU-2: the surface follows the anchor while an ancestor scrolls', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      final ScrollController scroll = ScrollController();
      addTearDown(scroll.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          Overlay.wrap(
            child: SingleChildScrollView(
              controller: scroll,
              child: Column(
                children: <Widget>[
                  const SizedBox(height: 100),
                  TanreiMenuAnchor(
                    controller: controller,
                    menuChildren: threeActions(),
                    builder: (BuildContext context, TanreiMenuController menu, Widget? child) =>
                        TanreiButton(onPressed: menu.open, child: const Text('More')),
                  ),
                  const SizedBox(height: 2000),
                ],
              ),
            ),
          ),
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      final double before = surfaceRect(tester).top;
      scroll.jumpTo(60);
      await tester.pumpAndSettle();
      expect(surfaceRect(tester).top, moreOrLessEquals(before - 60));
      expect(
        surfaceRect(tester).top,
        tester.getRect(find.byType(TanreiButton)).bottom + menuTokens.surfaceOffset,
      );
    });

    testWidgets('MNU-14: a placement the menu does not define renders as bottom-start, and debug '
        'builds report it', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      expect(TanreiMenuPlacement.fromName('left'), TanreiMenuPlacement.bottomStart);
      expect(reports, <String>['menu placement "left" -> bottomStart']);
      reports.clear();
      expect(TanreiMenuPlacement.fromName('bottom-end'), TanreiMenuPlacement.bottomEnd);
      expect(TanreiMenuPlacement.fromName('top-start'), TanreiMenuPlacement.topStart);
      expect(TanreiMenuPlacement.fromName('top-end'), TanreiMenuPlacement.topEnd);
      expect(TanreiMenuPlacement.fromName('bottom-start'), TanreiMenuPlacement.bottomStart);
      expect(reports, isEmpty);
      final Rect anchor = await anchorAndOpen(
        tester,
        placement: TanreiMenuPlacement.fromName('sideways'),
      );
      expect(
        surfaceRect(tester).topLeft,
        Offset(anchor.left, anchor.bottom + menuTokens.surfaceOffset),
      );
    });
  });

  group('surface', () {
    testWidgets('MNU-3: the surface is as wide as its widest item within surface.min-width and '
        'surface.max-width, pads its items, and is filled, rounded and clipped by its tokens', (
      WidgetTester tester,
    ) async {
      Future<Size> sizeWith(List<Widget> items) async {
        await tester.pumpWidget(inPlace(items));
        return tester.getSize(find.byType(TanreiMenuAnchor));
      }

      expect((await sizeWith(<Widget>[action('Cut')])).width, menuTokens.surfaceMinWidth);
      final Size wide = await sizeWith(<Widget>[
        action('A label far too long to fit on one line of any menu at all'),
      ]);
      expect(wide.width, menuTokens.surfaceMaxWidth);
      final Size middle = await sizeWith(<Widget>[action('Select everything')]);
      expect(middle.width, greaterThan(menuTokens.surfaceMinWidth));
      expect(middle.width, lessThan(menuTokens.surfaceMaxWidth));

      await tester.pumpWidget(inPlace(threeActions()));
      final Rect surface = tester.getRect(find.byType(TanreiMenuAnchor));
      final Rect first = tester.getRect(entryOf('Cut'));
      final Rect last = tester.getRect(entryOf('Paste'));
      expect(first.top - surface.top, menuTokens.surfacePaddingBlock);
      expect(first.left - surface.left, menuTokens.surfacePaddingInline);
      expect(surface.bottom - last.bottom, menuTokens.surfacePaddingBlock);
      final ClipPath clip = tester.widget(
        find
            .ancestor(of: find.byType(SingleChildScrollView), matching: find.byType(ClipPath))
            .first,
      );
      final Path path = clip.clipper!.getClip(surface.size);
      expect(path.contains(const Offset(0.5, 0.5)), isFalse, reason: 'a rounded corner');
      expect(menuTokens.surfaceShape, system.shape.medium);
    });

    testWidgets('MNU-4: the surface fades in and grows from the edge facing the anchor over the '
        'open motion, fades out over the close motion, and appears and disappears at once where '
        'motion is reduced', (WidgetTester tester) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(menuApp(controller: controller, items: threeActions()));
      controller.open();
      await tester.pump();
      final Duration open = tanreiDuration(menuTokens.motionOpenDuration);
      await tester.pump(open ~/ 2);
      final double midway = menuTokens.motionOpenEasing.toCurve().transform(0.5);
      expect(positionOf(tester).progress, moreOrLessEquals(midway, epsilon: 0.02));
      expect(positionOf(tester).isAbove, isFalse, reason: 'grows down from the anchor');
      expect(
        tester.layers.whereType<OpacityLayer>().map((OpacityLayer l) => l.alpha),
        contains((positionOf(tester).progress * 255).round()),
      );
      await tester.pumpAndSettle();
      expect(positionOf(tester).progress, 1);

      controller.close();
      await tester.pump();
      final Duration close = tanreiDuration(menuTokens.motionCloseDuration);
      await tester.pump(close ~/ 2);
      expect(find.text('Cut'), findsOneWidget, reason: 'fading out');
      expect(
        positionOf(tester).progress,
        moreOrLessEquals(1 - menuTokens.motionCloseEasing.toCurve().transform(0.5), epsilon: 0.02),
      );
      await tester.pump(close);
      await tester.pump();
      expect(find.text('Cut'), findsNothing);

      await tester.pumpWidget(
        menuApp(controller: controller, items: threeActions(), disableAnimations: true),
      );
      controller.open();
      await tester.pump();
      expect(positionOf(tester).progress, 1, reason: 'whole at once');
      controller.close();
      await tester.pump();
      expect(find.text('Cut'), findsNothing);
    });
  });

  group('closing', () {
    testWidgets('MNU-5: Escape emits close(escape) once, closes, and returns focus to the anchor', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      final FocusNode button = newNode();
      final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          buttonNode: button,
          onClose: reasons.add,
          items: threeActions(),
        ),
      );
      button.requestFocus();
      await tester.pump();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Cut');
      expect(ringVisible(tester, 'Cut'), isTrue, reason: 'opened from the keyboard');
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.escape]);
      expect(controller.isOpen, isFalse);
      expect(find.text('Cut'), findsNothing);
      expect(button.hasPrimaryFocus, isTrue);
    });

    testWidgets('MNU-5: the platform\'s back emits close(back) and closes it', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
      await tester.pumpWidget(
        menuApp(controller: controller, onClose: reasons.add, items: threeActions()),
      );
      controller.open();
      await tester.pumpAndSettle();
      final bool handled = await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(handled, isTrue);
      expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.back]);
      expect(controller.isOpen, isFalse);
    });

    testWidgets('MNU-5: in an app with a Navigator the platform\'s back closes the menu, not the '
        'route', (WidgetTester tester) async {
      final TanreiMenuController controller = newController();
      final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
      final GlobalKey<NavigatorState> navigator = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        WidgetsApp(
          navigatorKey: navigator,
          color: light.primary,
          pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) =>
              PageRouteBuilder<T>(
                settings: settings,
                pageBuilder: (BuildContext context, _, _) => builder(context),
              ),
          home: TanreiTheme(
            data: lightTheme,
            child: Center(
              child: TanreiMenuAnchor(
                controller: controller,
                onClose: reasons.add,
                menuChildren: threeActions(),
                builder: (BuildContext context, TanreiMenuController menu, Widget? child) =>
                    TanreiButton(onPressed: menu.open, child: const Text('More')),
              ),
            ),
          ),
        ),
      );
      unawaited(
        navigator.currentState!.push(
          PageRouteBuilder<void>(
            pageBuilder: (BuildContext context, _, _) => TanreiTheme(
              data: lightTheme,
              child: Center(
                child: TanreiMenuAnchor(
                  controller: controller,
                  onClose: reasons.add,
                  menuChildren: threeActions(),
                  builder: (BuildContext context, TanreiMenuController menu, Widget? child) =>
                      TanreiButton(onPressed: menu.open, child: const Text('Second')),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      controller.open();
      await tester.pumpAndSettle();
      expect(find.text('Cut'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.back]);
      expect(find.text('Second'), findsOneWidget, reason: 'the route stayed');
      expect(controller.isOpen, isFalse);
      // Closed, the back press pops the route again.
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Second'), findsNothing);
    });

    testWidgets('MNU-5: a press outside the surface and the anchor emits close(outside), and '
        'the press also reaches what is under it', (WidgetTester tester) async {
      final TanreiMenuController controller = newController();
      final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
      int under = 0;
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          onClose: reasons.add,
          items: threeActions(),
          after: <Widget>[
            const SizedBox(width: 300),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => under++,
              child: const SizedBox(width: 40, height: 40, key: Key('under')),
            ),
          ],
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('under')));
      await tester.pumpAndSettle();
      expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.outside]);
      expect(under, 1);
      expect(controller.isOpen, isFalse);
      // A press on the surface itself does not close it.
      controller.open();
      await tester.pumpAndSettle();
      await tester.tapAt(surfaceRect(tester).topLeft + const Offset(2, 2));
      await tester.pumpAndSettle();
      expect(controller.isOpen, isTrue);
    });

    testWidgets(
      'MNU-5: Tab and Shift+Tab emit close(tab), close, and move focus on from the anchor '
      'as they would have from it',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        final FocusNode button = newNode();
        final FocusNode before = newNode();
        final FocusNode after = newNode();
        final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
        await tester.pumpWidget(
          menuApp(
            controller: controller,
            buttonNode: button,
            onClose: reasons.add,
            items: threeActions(),
            before: <Widget>[
              TanreiButton(focusNode: before, onPressed: () {}, child: const Text('Before')),
            ],
            after: <Widget>[
              TanreiButton(focusNode: after, onPressed: () {}, child: const Text('After')),
            ],
          ),
        );
        controller.open();
        await tester.pumpAndSettle();
        expect(focusedLabel(), 'Cut');
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pumpAndSettle();
        expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.tab]);
        expect(controller.isOpen, isFalse);
        expect(after.hasPrimaryFocus, isTrue);

        controller.open();
        await tester.pumpAndSettle();
        await tester.sendKeyDownEvent(LogicalKeyboardKey.shift);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.sendKeyUpEvent(LogicalKeyboardKey.shift);
        await tester.pumpAndSettle();
        expect(reasons.last, TanreiMenuCloseReason.tab);
        expect(before.hasPrimaryFocus, isTrue);
      },
    );

    testWidgets('MNU-5: focus moving out of the menu some other way emits close(focus-out)', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      final FocusNode elsewhere = newNode();
      final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          onClose: reasons.add,
          items: threeActions(),
          after: <Widget>[
            TanreiButton(focusNode: elsewhere, onPressed: () {}, child: const Text('Other')),
          ],
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      elsewhere.requestFocus();
      await tester.pumpAndSettle();
      expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.focusOut]);
      expect(controller.isOpen, isFalse);
      expect(elsewhere.hasPrimaryFocus, isTrue, reason: 'focus stays where it went');
    });
  });

  test('MNU-5: the close reasons are the spec\'s names in Dart\'s casing: escape, back, outside, '
      'tab, focus-out, item', () {
    expect(TanreiMenuCloseReason.values.map((TanreiMenuCloseReason r) => r.name), <String>[
      'escape',
      'back',
      'outside',
      'tab',
      'focusOut',
      'item',
    ]);
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('MNU-6: a ${kind.name} press on an action emits its click once, then close', (
        WidgetTester tester,
      ) async {
        final TanreiMenuController controller = newController();
        final List<String> events = <String>[];
        await tester.pumpWidget(
          menuApp(
            controller: controller,
            onClose: (TanreiMenuCloseReason r) => events.add('close ${r.name}'),
            items: <Widget>[action('Cut', onPressed: () => events.add('click'))],
          ),
        );
        controller.open();
        await tester.pumpAndSettle();
        await tester.tap(find.text('Cut'), kind: kind);
        await tester.pumpAndSettle();
        expect(events, <String>['click', 'close item']);
        expect(controller.isOpen, isFalse);
      });
    }

    testWidgets(
      'MNU-6: Enter activates and closes; Space on a checkbox item switches it and leaves '
      'the menu open; a press on one switches it and closes',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        final List<bool> changes = <bool>[];
        bool grid = false;
        await tester.pumpWidget(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) => menuApp(
              controller: controller,
              items: <Widget>[
                TanreiCheckboxMenuItem(
                  value: grid,
                  onChanged: (bool value) {
                    changes.add(value);
                    setState(() => grid = value);
                  },
                  child: const Text('Show grid'),
                ),
              ],
            ),
          ),
        );
        controller.open();
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pumpAndSettle();
        expect(changes, <bool>[true]);
        expect(controller.isOpen, isTrue, reason: 'Space leaves it open');
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        expect(changes, <bool>[true, false]);
        expect(controller.isOpen, isFalse);
        controller.open();
        await tester.pumpAndSettle();
        await tester.tap(find.text('Show grid'));
        await tester.pumpAndSettle();
        expect(changes, <bool>[true, false, true]);
        expect(controller.isOpen, isFalse);
      },
    );

    testWidgets(
      'MNU-6: choosing a radio item sets its group\'s value and emits the group\'s change '
      'once; the checked one emits nothing, and closes the menu like any other radio item',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        final List<String> changes = <String>[];
        final List<TanreiMenuCloseReason> reasons = <TanreiMenuCloseReason>[];
        String sort = 'name';
        await tester.pumpWidget(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) => menuApp(
              controller: controller,
              onClose: reasons.add,
              items: <Widget>[
                TanreiMenuGroup<String>(
                  groupValue: sort,
                  onChanged: (String value) {
                    changes.add(value);
                    setState(() => sort = value);
                  },
                  children: const <Widget>[
                    TanreiRadioMenuItem<String>(value: 'name', child: Text('Name')),
                    TanreiRadioMenuItem<String>(value: 'date', child: Text('Date')),
                  ],
                ),
              ],
            ),
          ),
        );
        controller.open();
        await tester.pumpAndSettle();
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pumpAndSettle();
        expect(changes, isEmpty, reason: 'Name is already checked');
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        await tester.pumpAndSettle();
        expect(changes, <String>['date']);
        expect(controller.isOpen, isTrue);
        expect(markOf(tester, 'Date').progress, 1);
        expect(markOf(tester, 'Name').progress, 0);
        expect(reasons, isEmpty, reason: 'Space leaves the menu open');
        // Enter on the checked one: no change, and the menu closes like any other radio item.
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        expect(changes, <String>['date']);
        expect(reasons, <TanreiMenuCloseReason>[TanreiMenuCloseReason.item]);
        expect(controller.isOpen, isFalse);
      },
    );

    testWidgets('MNU-9: a disabled item emits no click or change and is exposed as disabled', (
      WidgetTester tester,
    ) async {
      // The group's value names none of its radio items on purpose (MNU-29 reports it).
      collectIgnoredValues();
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> events = <String>[];
      await tester.pumpWidget(
        inPlace(<Widget>[
          const TanreiMenuItem(onPressed: null, child: Text('Paste')),
          const TanreiCheckboxMenuItem(value: false, onChanged: null, child: Text('Grid')),
          TanreiMenuGroup<String>(
            groupValue: 'a',
            onChanged: (String v) => events.add(v),
            children: const <Widget>[
              TanreiRadioMenuItem<String>(value: 'b', enabled: false, child: Text('B')),
            ],
          ),
        ], onClose: (TanreiMenuCloseReason r) => events.add(r.name)),
      );
      for (final String label in <String>['Paste', 'Grid', 'B']) {
        await tester.tap(find.text(label), warnIfMissed: false);
        await tester.pumpAndSettle();
        final SemanticsData data = tester.getSemantics(entryOf(label)).getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue, reason: label);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse, reason: label);
        expect(data.hasAction(SemanticsAction.tap), isFalse, reason: label);
      }
      expect(events, isEmpty);
      handle.dispose();
    });
  });

  group('keyboard', () {
    testWidgets(
      'MNU-7: Down and Up Arrow wrap at the ends and pass through groups, Home and End go '
      'to the ends, typeahead finds labels, disabled items are reached but do not activate; '
      'titles and dividers take no focus',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        final List<String> pressed = <String>[];
        await tester.pumpWidget(
          menuApp(
            controller: controller,
            items: <Widget>[
              action('Cut', onPressed: () => pressed.add('Cut')),
              TanreiMenuGroup<String>(
                title: 'Edit',
                children: <Widget>[
                  action('Copy', enabled: false),
                  action('Paste', onPressed: () => pressed.add('Paste')),
                ],
              ),
              action('Select all', onPressed: () => pressed.add('Select all')),
            ],
          ),
        );
        controller.open();
        await tester.pumpAndSettle();
        expect(focusedLabel(), 'Cut');
        final List<String> seen = <String>[];
        for (int i = 0; i < 4; i++) {
          await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
          await tester.pump();
          seen.add(focusedLabel());
        }
        expect(seen, <String>['Copy', 'Paste', 'Select all', 'Cut']);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
        await tester.pump();
        expect(focusedLabel(), 'Select all', reason: 'wraps');
        await tester.sendKeyEvent(LogicalKeyboardKey.home);
        await tester.pump();
        expect(focusedLabel(), 'Cut');
        await tester.sendKeyEvent(LogicalKeyboardKey.end);
        await tester.pump();
        expect(focusedLabel(), 'Select all');
        await tester.sendKeyEvent(LogicalKeyboardKey.keyP);
        await tester.pump();
        expect(focusedLabel(), 'Paste');
        await tester.pump(tanreiTypeaheadWindow);
        await tester.sendKeyEvent(LogicalKeyboardKey.keyC);
        await tester.pump();
        expect(focusedLabel(), 'Cut', reason: 'the next label with "c" after Paste, wrapping');
        await tester.sendKeyEvent(LogicalKeyboardKey.keyC);
        await tester.pump();
        expect(focusedLabel(), 'Copy', reason: 'the same letter again moves on');
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        expect(pressed, isEmpty, reason: 'Copy is disabled');
        expect(controller.isOpen, isTrue);
        await tester.pump(tanreiTypeaheadWindow);
      },
    );

    testWidgets('MNU-8: a pointer moving onto an item moves focus to it without the ring and draws '
        'it hovered; the arrow keys continue from it; leaving the surface keeps focus there', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(menuApp(controller: controller, items: threeActions()));
      controller.open();
      await tester.pumpAndSettle();
      final TestGesture mouse = await hoverOver(tester, find.text('Copy'));
      expect(focusedLabel(), 'Copy');
      expect(ringVisible(tester, 'Copy'), isFalse);
      expect(
        fillOf(tester, 'Copy'),
        lightTheme.paint(menuTokens.conditions.unselected.hovered.containerColor),
      );
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Copy');
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Paste');
      expect(ringVisible(tester, 'Paste'), isTrue, reason: 'keyboard focus shows the ring');
    });
  });
  group('item states', () {
    testWidgets('MNU-10: container, texts, icons, mark and opacity come from the tokens of the '
        'condition in the highest-precedence state, pressed > focused > hovered', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final FocusNode node = newNode();
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuItem(
            focusNode: node,
            onPressed: () {},
            destructive: true,
            supportingText: 'Forever',
            child: const Text('Delete'),
          ),
        ]),
      );
      final TanreiMenuConditionTokens destructive = menuTokens.conditions.destructive;
      void expectDrawnFrom(TanreiMenuConditionStateTokens tokens, TanreiMenuStateTokens? state) {
        expect(fillOf(tester, 'Delete'), lightTheme.paint(tokens.containerColor));
        expect(textColor(tester, 'Delete'), lightTheme.paint(tokens.labelColor));
        expect(textColor(tester, 'Forever'), lightTheme.paint(tokens.supportingTextColor));
        expect(opacityOf(tester, 'Delete'), state?.opacity ?? 1);
      }

      expectDrawnFrom(destructive.enabled, null);
      final TestGesture mouse = await hoverOver(tester, find.text('Delete'));
      node.unfocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(destructive.hovered, menuTokens.hovered);
      // The state layer is the condition's label color: the error color.
      expect(
        fillOf(tester, 'Delete'),
        isSameColorAs(light.error.withValues(alpha: system.state.hoverStateLayerOpacity)),
      );
      node.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(destructive.focused, menuTokens.focused);
      await mouse.down(tester.getCenter(find.text('Delete')));
      await tester.pump();
      expectDrawnFrom(destructive.pressed, menuTokens.pressed);
      await mouse.up();
      await tester.pumpAndSettle();
    });

    testWidgets('MNU-10: under the acme fixture hovered, focused and pressed are three different '
        'values; focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiMenuConditionTokens unselected = acmeSystem.menu.conditions.unselected;
      final Color hovered = theme.paint(unselected.hovered.containerColor);
      final Color focused = theme.paint(unselected.focused.containerColor);
      final Color pressed = theme.paint(unselected.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      final FocusNode node = newNode();
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuItem(focusNode: node, onPressed: () {}, child: const Text('Cut')),
        ], theme: theme),
      );
      final TestGesture mouse = await hoverOver(tester, find.text('Cut'));
      node.unfocus();
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Cut'), hovered);
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Cut'), focused);
      await mouse.down(tester.getCenter(find.text('Cut')));
      await tester.pump();
      expect(fillOf(tester, 'Cut'), pressed);
      await mouse.up();
      await tester.pumpAndSettle();

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await mouse.moveTo(Offset.zero);
      node.unfocus();
      await tester.pumpAndSettle();
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(fillOf(tester, 'Cut'), theme.paint(unselected.enabled.containerColor));
      expect(ringVisible(tester, 'Cut'), isFalse);
    });

    testWidgets('MNU-11: keyboard focus shows the focus ring inside the item\'s row at once', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final FocusNode node = newNode();
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuItem(focusNode: node, onPressed: () {}, child: const Text('Cut')),
        ]),
      );
      expect(ringVisible(tester, 'Cut'), isFalse);
      node.requestFocus();
      await tester.pump();
      expect(ringVisible(tester, 'Cut'), isTrue);
      final TanreiFocusRing ring = tester.widget(
        find.descendant(of: entryOf('Cut'), matching: find.byType(TanreiFocusRing)),
      );
      expect(ring.inside, isTrue);
    });

    testWidgets(
      'MNU-12: an item shorter than the minimum target is made sys.target.touch tall, and '
      'the whole row is its hit area',
      (WidgetTester tester) async {
        final List<String> pressed = <String>[];
        await tester.pumpWidget(inPlace(threeActions(pressed: pressed)));
        expect(menuTokens.containerHeight, lessThan(system.measure.targetTouch));
        final Rect row = tester.getRect(containerOfEntry('Cut'));
        expect(row.height, system.measure.targetTouch);
        await tester.tapAt(row.topLeft + const Offset(1, 1));
        await tester.tapAt(row.bottomRight - const Offset(1, 1));
        await tester.pumpAndSettle();
        expect(pressed, <String>['Cut', 'Cut']);
      },
    );

    testWidgets('MNU-13: a disabled item draws the disabled tokens of its condition: no fill, no '
        'check unless checked, the content color faded', (WidgetTester tester) async {
      await tester.pumpWidget(
        inPlace(const <Widget>[
          TanreiMenuItem(onPressed: null, destructive: true, child: Text('Delete')),
          TanreiCheckboxMenuItem(value: true, onChanged: null, child: Text('Grid')),
          TanreiCheckboxMenuItem(value: false, onChanged: null, child: Text('Rulers')),
        ]),
      );
      for (final (String label, TanreiMenuCondition condition) in <(String, TanreiMenuCondition)>[
        ('Delete', TanreiMenuCondition.destructive),
        ('Grid', TanreiMenuCondition.selected),
        ('Rulers', TanreiMenuCondition.unselected),
      ]) {
        final TanreiMenuConditionStateTokens disabled = menuTokens.conditions[condition].disabled;
        expect(fillOf(tester, label), lightTheme.paint(disabled.containerColor), reason: label);
        expect(textColor(tester, label), lightTheme.paint(disabled.labelColor), reason: label);
        expect(markOf(tester, label).color, lightTheme.paint(disabled.markColor), reason: label);
        expect(opacityOf(tester, label), menuTokens.disabled.opacity, reason: label);
      }
      expect(fillOf(tester, 'Delete').a, 0);
      expect(markOf(tester, 'Rulers').color.a, 0, reason: 'no faint check');
      expect(markOf(tester, 'Grid').color.a, greaterThan(0));
      expect(
        textColor(tester, 'Delete'),
        lightTheme.paint(menuTokens.conditions.unselected.disabled.labelColor),
        reason: 'a disabled destructive item loses its red',
      );
    });
  });

  group('press hold (MNU-15)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(
      menuTokens.conditions.unselected.pressed.containerColor,
    );
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('MNU-15: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration', (WidgetTester tester) async {
        await tester.pumpWidget(inPlace(threeActions()));
        await tester.tap(find.text('Cut'), kind: kind);
        await tester.pump();
        expect(fillOf(tester, 'Cut'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Cut'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Cut'), isNot(pressedFill));
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('MNU-15: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final FocusNode node = newNode();
        await tester.pumpWidget(
          inPlace(<Widget>[
            TanreiMenuItem(focusNode: node, onPressed: () {}, child: const Text('Cut')),
          ]),
        );
        node.requestFocus();
        await tester.pumpAndSettle();
        final Color focused = fillOf(tester, 'Cut');
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(fillOf(tester, 'Cut'), pressedFill);
        await tester.pump(hold - tick);
        expect(fillOf(tester, 'Cut'), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Cut'), focused);
      });
    }
  });

  group('choices of kind', () {
    testWidgets('MNU-16: overlay (default) fills the pressed container at once; ripple (m3-like) '
        'grows it from the point of contact over comp.menu.motion.feedback-duration; dim '
        '(cupertino) dims the row and draws no state layer', (WidgetTester tester) async {
      await tester.pumpWidget(inPlace(threeActions()));
      TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Cut')));
      await tester.pump();
      expect(
        fillOf(tester, 'Cut'),
        lightTheme.paint(menuTokens.conditions.unselected.pressed.containerColor),
      );
      expect(decorationOf(tester, 'Cut').ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(inPlace(threeActions(), theme: m3));
      final Rect box = tester.getRect(containerOfEntry('Cut'));
      const Offset contact = Offset(30, 10);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = decorationOf(tester, 'Cut').ripple!;
      expect(ripple.origin, contact);
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.menu.conditions.unselected.pressed.containerColor),
      );
      await tester.pump(tanreiDuration(m3LikeSystem.menu.motionFeedbackDuration) ~/ 2);
      expect(
        decorationOf(tester, 'Cut').ripple!.progress,
        moreOrLessEquals(m3LikeSystem.menu.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Cut').ripple, isNull);

      await tester.pumpWidget(
        inPlace(threeActions(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      touch = await tester.startGesture(tester.getCenter(find.text('Cut')));
      await tester.pump();
      expect(opacityOf(tester, 'Cut'), cupertinoSystem.menu.pressed.opacity);
      expect(cupertinoSystem.menu.pressed.opacity, lessThan(1));
      expect(fillOf(tester, 'Cut').a, 0);
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'MNU-16: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiMenuConditionTokens unselected = menuTokens.conditions.unselected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            menu: menuTokens.copyWith(
              pressed: menuTokens.pressed.copyWith(opacity: 0.5),
              conditions: menuTokens.conditions.copyWith(
                unselected: unselected.copyWith(
                  pressed: unselected.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(inPlace(threeActions(), theme: TanreiThemeData(system: of)));
          final Color resting = textColor(tester, 'Cut');
          final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Cut')));
          await tester.pump();
          expect(fillOf(tester, 'Cut').a, 0);
          if (feedback == TanreiPressedFeedback.none) {
            expect(textColor(tester, 'Cut'), resting);
            expect(opacityOf(tester, 'Cut'), 1);
          } else {
            expect(textColor(tester, 'Cut'), const Color(0xFF445566));
            expect(opacityOf(tester, 'Cut'), 0.5);
            expect(
              decorationOf(tester, 'Cut').ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'MNU-17: the corner smoothing of the system eases the rows, their focus ring and the '
      'surface; the focus style draws a ring (default) or a glow (acme)',
      (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        Future<List<Paint>> focusedStrokes(TanreiSystem of) async {
          final FocusNode node = newNode();
          await tester.pumpWidget(
            inPlace(<Widget>[
              TanreiMenuItem(
                key: UniqueKey(),
                focusNode: node,
                onPressed: () {},
                child: const Text('Cut'),
              ),
            ], theme: TanreiThemeData(system: of)),
          );
          node.requestFocus();
          await tester.pump();
          final List<Paint> found = <Paint>[];
          expect(
            find.descendant(of: entryOf('Cut'), matching: find.byType(TanreiFocusRing)),
            paints..everything((Symbol method, List<dynamic> arguments) {
              if ((method == #drawRRect || method == #drawPath) &&
                  (arguments[1] as Paint).style == PaintingStyle.stroke) {
                found.add(arguments[1] as Paint);
              }
              return true;
            }),
          );
          return found;
        }

        final List<Paint> ring = await focusedStrokes(system);
        expect(decorationOf(tester, 'Cut').shape.smoothing, 0);
        expect(decorationOf(tester, 'Cut').shape.radius, menuTokens.containerShape);
        expect(ring, isNotEmpty);
        expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
        final List<Paint> glow = await focusedStrokes(acmeSystem);
        expect(glow, isNotEmpty);
        expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
        await focusedStrokes(cupertinoSystem);
        expect(decorationOf(tester, 'Cut').shape.smoothing, 0.6);
        expect(
          find.descendant(of: entryOf('Cut'), matching: find.byType(TanreiFocusRing)),
          paints..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawPath && (arguments[1] as Paint).style == PaintingStyle.stroke,
          ),
        );
      },
    );
  });

  group('conditions and layout', () {
    testWidgets('MNU-18: an action is destructive when destructive; a checked checkbox or radio '
        'item is selected; everything else unselected', (WidgetTester tester) async {
      await tester.pumpWidget(
        inPlace(<Widget>[
          action('Delete', destructive: true),
          action('Archive'),
          TanreiCheckboxMenuItem(value: true, onChanged: (_) {}, child: const Text('Grid')),
          TanreiCheckboxMenuItem(value: false, onChanged: (_) {}, child: const Text('Rulers')),
          TanreiMenuGroup<String>(
            groupValue: 'name',
            onChanged: (_) {},
            children: const <Widget>[
              TanreiRadioMenuItem<String>(value: 'name', child: Text('Name')),
              TanreiRadioMenuItem<String>(value: 'date', child: Text('Date')),
            ],
          ),
        ]),
      );
      for (final (String label, TanreiMenuCondition condition) in <(String, TanreiMenuCondition)>[
        ('Delete', TanreiMenuCondition.destructive),
        ('Archive', TanreiMenuCondition.unselected),
        ('Grid', TanreiMenuCondition.selected),
        ('Rulers', TanreiMenuCondition.unselected),
        ('Name', TanreiMenuCondition.selected),
        ('Date', TanreiMenuCondition.unselected),
      ]) {
        final TanreiMenuConditionStateTokens rest = menuTokens.conditions[condition].enabled;
        expect(textColor(tester, label), lightTheme.paint(rest.labelColor), reason: label);
        expect(markOf(tester, label).color, lightTheme.paint(rest.markColor), reason: label);
      }
      expect(textColor(tester, 'Delete'), light.error);
    });

    testWidgets('MNU-19: a row is padding, the check column, the icon column, the label, the '
        'trailing text and icon, a gap apart; empty columns keep their width so labels align; '
        'right-to-left mirrors', (WidgetTester tester) async {
      Future<void> pump(TextDirection direction) => tester.pumpWidget(
        tanreiTestApp(
          Directionality(
            textDirection: direction,
            child: TanreiMenuAnchor.inPlace(
              menuChildren: <Widget>[
                TanreiCheckboxMenuItem(
                  value: true,
                  onChanged: (_) {},
                  leadingIcon: const SizedBox.expand(key: Key('icon')),
                  trailingText: 'K',
                  trailingIcon: const SizedBox.expand(key: Key('trail')),
                  child: const Text('Grid'),
                ),
                action('Plain'),
              ],
            ),
          ),
        ),
      );
      await pump(TextDirection.ltr);
      final double pad = menuTokens.containerPaddingInline;
      final double gap = menuTokens.containerGap;
      Rect row = tester.getRect(containerOfEntry('Grid'));
      final Rect mark = tester.getRect(
        find.descendant(
          of: entryOf('Grid'),
          matching: find.byWidgetPredicate(
            (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
          ),
        ),
      );
      final Rect icon = tester.getRect(find.byKey(const Key('icon')));
      final Rect label = tester.getRect(find.text('Grid'));
      final Rect trailingText = tester.getRect(find.text('K'));
      final Rect trailingIcon = tester.getRect(find.byKey(const Key('trail')));
      expect(mark.left - row.left, pad);
      expect(mark.size, Size.square(menuTokens.markSize));
      expect(icon.left - mark.right, gap);
      expect(icon.width, menuTokens.leadingIconSize);
      expect(label.left - icon.right, gap);
      expect(row.right - trailingIcon.right, pad);
      expect(trailingIcon.left - trailingText.right, gap);
      // The plain action reserves both columns: its label starts where Grid's does.
      expect(tester.getRect(find.text('Plain')).left, label.left);

      await pump(TextDirection.rtl);
      row = tester.getRect(containerOfEntry('Grid'));
      final Rect markRtl = tester.getRect(
        find.descendant(
          of: entryOf('Grid'),
          matching: find.byWidgetPredicate(
            (Widget w) => w is CustomPaint && w.painter is TanreiCheckMarkPainter,
          ),
        ),
      );
      expect(row.right - markRtl.right, pad);
      expect(tester.getRect(find.byKey(const Key('trail'))).left - row.left, pad);
    });

    testWidgets('MNU-20: an item is at least comp.menu.container.height tall, pads its content by '
        'padding-block, draws each text in its style, and grows with enlarged text', (
      WidgetTester tester,
    ) async {
      final TanreiSystem tall = system.copyWith(menu: menuTokens.copyWith(containerHeight: 60));
      await tester.pumpWidget(
        inPlace(<Widget>[
          action('Share link', supportingText: 'Anyone with the link', trailingText: 'K'),
        ], theme: TanreiThemeData(system: tall)),
      );
      expect(tester.getSize(containerOfEntry('Share link')).height, 60);
      void expectStyle(String text, TanreiTextStyle token) {
        final TextStyle style = textStyleOf(tester, text);
        expect(style.fontSize, token.size, reason: text);
        expect(style.height, token.lineHeight / token.size, reason: text);
      }

      expectStyle('Share link', menuTokens.labelTypescale);
      expectStyle('Anyone with the link', menuTokens.supportingTextTypescale);
      expectStyle('K', menuTokens.trailingTextTypescale);
      Future<double> heightAt(double scale) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: TanreiMenuAnchor.inPlace(
                menuChildren: <Widget>[action('Share link', supportingText: 'Anyone')],
              ),
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        return tester.getSize(containerOfEntry('Share link')).height;
      }

      final double normal = await heightAt(1);
      final double large = await heightAt(2);
      expect(large, greaterThan(normal));
      final Rect row = tester.getRect(containerOfEntry('Share link'));
      expect(
        row.bottom - tester.getRect(find.text('Anyone')).bottom,
        menuTokens.containerPaddingBlock,
      );
    });

    testWidgets('MNU-21: the icons are drawn through the icon helper at their sizes, with the '
        'selection of the item; an empty one draws nothing', (WidgetTester tester) async {
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiCheckboxMenuItem(
            value: true,
            onChanged: (_) {},
            leadingIcon: const Text('L'),
            trailingIcon: const Text('T'),
            child: const Text('Grid'),
          ),
          action('Plain'),
        ]),
      );
      final List<TanreiControlIcon> icons = tester
          .widgetList<TanreiControlIcon>(
            find.descendant(of: entryOf('Grid'), matching: find.byType(TanreiControlIcon)),
          )
          .toList();
      expect(icons.map((TanreiControlIcon i) => i.size), <double>[
        menuTokens.leadingIconSize,
        menuTokens.trailingIconSize,
      ]);
      expect(icons.every((TanreiControlIcon i) => i.selected), isTrue);
      final TanreiMenuConditionStateTokens selected = menuTokens.conditions.selected.enabled;
      expect(icons.first.color, lightTheme.paint(selected.leadingIconColor));
      expect(
        find.descendant(of: entryOf('Plain'), matching: find.byType(TanreiControlIcon)),
        findsNothing,
      );
    });

    testWidgets(
      'MNU-22: a checked item strokes the check at mark.width in its mark color; a change '
      'while open draws it in over the state motion, at once where motion is reduced',
      (WidgetTester tester) async {
        Future<void> pump(bool checked, {bool reduce = false}) => tester.pumpWidget(
          inPlace(<Widget>[
            TanreiCheckboxMenuItem(value: checked, onChanged: (_) {}, child: const Text('Grid')),
          ], disableAnimations: reduce),
        );
        await pump(true);
        final TanreiCheckMarkPainter mark = markOf(tester, 'Grid');
        expect(mark.progress, 1);
        expect(mark.width, menuTokens.markWidth);
        expect(mark.color, light.primary);
        await pump(false);
        await tester.pump(tanreiDuration(menuTokens.motionStateDuration) ~/ 2);
        expect(
          markOf(tester, 'Grid').progress,
          moreOrLessEquals(1 - menuTokens.motionStateEasing.toCurve().transform(0.5)),
        );
        await tester.pumpAndSettle();
        expect(markOf(tester, 'Grid').progress, 0);
        await pump(true, reduce: true);
        await tester.pump();
        expect(markOf(tester, 'Grid').progress, 1);
      },
    );

    testWidgets('MNU-23: a divider is drawn between a group and what is next to it, inside '
        'surface.padding-inline as the rows are, with divider.space around it, never at the ends, '
        'and is not a node', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuGroup<String>(children: <Widget>[action('Cut'), action('Copy')]),
          TanreiMenuGroup<String>(children: <Widget>[action('Paste')]),
          action('Select all'),
          action('Find'),
        ]),
      );
      final Finder lines = find.descendant(
        of: find.byType(TanreiMenuAnchor),
        matching: find.byWidgetPredicate(
          (Widget w) => w is ColoredBox && w.color == lightTheme.paint(menuTokens.dividerColor),
        ),
      );
      // Between the two groups, and between the second group and Select all; none between two
      // plain items or at the ends.
      expect(lines, findsNWidgets(2));
      final Rect first = tester.getRect(lines.first);
      expect(first.height, menuTokens.dividerThickness);
      expect(first.top - tester.getRect(containerOfEntry('Copy')).bottom, menuTokens.dividerSpace);
      expect(tester.getRect(containerOfEntry('Paste')).top - first.bottom, menuTokens.dividerSpace);
      final Rect surface = tester.getRect(find.byType(TanreiMenuAnchor));
      // Inside surface.padding-inline, the rows' inset (e4b2843).
      expect(first.left - surface.left, menuTokens.surfacePaddingInline);
      expect(surface.right - first.right, menuTokens.surfacePaddingInline);
      expect(first.left, tester.getRect(containerOfEntry('Copy')).left);
      expect(first.right, tester.getRect(containerOfEntry('Copy')).right);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.rect.height == menuTokens.dividerThickness),
        isEmpty,
      );
      handle.dispose();
    });

    testWidgets('MNU-28: a group title is drawn above its items in its style, starting where the '
        'labels start and ending padding-inline from the end, takes no focus and names the group', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuGroup<String>(
            title: 'View',
            children: <Widget>[
              TanreiCheckboxMenuItem(value: true, onChanged: (_) {}, child: const Text('Grid')),
            ],
          ),
        ]),
      );
      final Rect title = tester.getRect(find.text('View'));
      expect(title.left, tester.getRect(find.text('Grid')).left);
      expect(
        title.bottom + menuTokens.containerPaddingBlock,
        tester.getRect(containerOfEntry('Grid')).top,
      );
      final TextStyle style = textStyleOf(tester, 'View');
      expect(style.fontSize, menuTokens.groupTitleTypescale.size);
      expect(style.color, lightTheme.paint(menuTokens.groupTitleColor));
      final SemanticsNode group = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == 'View');
      expect(group.getSemanticsData().role, isNot(SemanticsRole.menuItem));
      expect(group.getSemanticsData().hasFlag(SemanticsFlag.isFocusable), isFalse);
      handle.dispose();
    });
  });

  group('accessibility semantics', () {
    testWidgets('MNU-24: the menu role; items as menu items, checkbox items and radio items with '
        'their checked state, named by label and described by supporting and trailing text; groups '
        'named by their title; the anchor says whether the menu is open', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        menuApp(
          controller: controller,
          items: <Widget>[
            action(
              'Cut',
              supportingText: 'To the clipboard',
              trailingText: '⌘X',
              leadingIcon: const Text('C'),
            ),
            TanreiCheckboxMenuItem(value: true, onChanged: (_) {}, child: const Text('Grid')),
            TanreiMenuGroup<String>(
              title: 'Sort by',
              groupValue: 'name',
              onChanged: (_) {},
              children: const <Widget>[
                TanreiRadioMenuItem<String>(value: 'name', child: Text('Name')),
              ],
            ),
          ],
        ),
      );
      SemanticsData anchor = tester.getSemantics(find.byType(TanreiButton)).getSemanticsData();
      expect(anchor.hasFlag(SemanticsFlag.hasExpandedState), isTrue);
      expect(anchor.hasFlag(SemanticsFlag.isExpanded), isFalse);
      expect(anchor.label, 'More');
      controller.open();
      await tester.pumpAndSettle();
      anchor = tester.getSemantics(find.byType(TanreiButton)).getSemanticsData();
      expect(anchor.hasFlag(SemanticsFlag.isExpanded), isTrue);

      final List<SemanticsNode> nodes = nodesBelow(semanticsRoot(tester));
      final SemanticsNode menu = nodes.firstWhere(
        (SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.menu,
      );
      SemanticsData item(String label) => nodesBelow(
        menu,
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().label == label).getSemanticsData();
      final SemanticsData cut = item('Cut');
      expect(cut.role, SemanticsRole.menuItem);
      expect(cut.hint, 'To the clipboard\n⌘X');
      expect(cut.hasFlag(SemanticsFlag.hasCheckedState), isFalse);
      final SemanticsData grid = item('Grid');
      expect(grid.role, SemanticsRole.menuItemCheckbox);
      expect(grid.hasFlag(SemanticsFlag.isChecked), isTrue);
      final SemanticsData name = item('Name');
      expect(name.role, SemanticsRole.menuItemRadio);
      expect(name.hasFlag(SemanticsFlag.isChecked), isTrue);
      expect(name.hasFlag(SemanticsFlag.isInMutuallyExclusiveGroup), isTrue);
      expect(item('Sort by').role, SemanticsRole.none);
      // Icons and the mark are not read: only the labels and the group title are.
      expect(
        nodesBelow(
          menu,
        ).map((SemanticsNode n) => n.getSemanticsData().label).where((String l) => l.isNotEmpty),
        <String>['Cut', 'Grid', 'Sort by', 'Name'],
      );
      handle.dispose();
    });

    testWidgets('MNU-26: an empty label still renders and is reported once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(inPlace(<Widget>[action(''), action('Copy')]));
      expect(find.byWidgetPredicate((Widget w) => w is TanreiMenuEntry), findsNWidgets(2));
      expect(reports, <String>['menu item']);
      await tester.pumpWidget(inPlace(<Widget>[action(''), action('Copy')]));
      expect(reports, hasLength(1));
      debugTanreiReportMissingName = tanreiReportMissingName;
      await tester.pumpWidget(
        inPlace(<Widget>[
          TanreiMenuItem(key: UniqueKey(), onPressed: () {}, child: const Text(' ')),
        ]),
      );
      final Object? reported = tester.takeException();
      expect('$reported', contains('menu item has no accessible name'));
      expect('$reported', contains('child'));
    });

    testWidgets('guidelines: an open menu', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await tester.pumpWidget(
          inPlace(<Widget>[
            action('Cut', supportingText: 'To the clipboard', trailingText: 'K'),
            action('Delete', destructive: true),
            TanreiCheckboxMenuItem(value: true, onChanged: (_) {}, child: const Text('Grid')),
          ], theme: theme),
        );
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
      }
      handle.dispose();
    });

    // WCAG 1.4.3 and 1.4.11 in every scheme of the default system: the texts need 4.5:1 and the
    // check 3:1 on the surface. An imitation preset is held to its original, not to these criteria,
    // in any scheme.
    test('contrast: "${system.id}" texts 4.5:1 and the check 3:1 on the surface at rest', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          final Color surface = Color.alphaBlend(
            theme.paint(system.menu.surfaceColor),
            theme.colors.surface,
          );
          final String scheme = '${brightness.name} ${contrast.name}';
          final double title = contrastOf(
            Color.alphaBlend(theme.paint(system.menu.groupTitleColor), surface),
            surface,
          );
          if (title < 4.5) {
            failures.add('$scheme title ${title.toStringAsFixed(2)}');
          }
          for (final TanreiMenuCondition condition in TanreiMenuCondition.core) {
            final TanreiMenuConditionStateTokens rest = system.menu.conditions[condition].enabled;
            final Color row = Color.alphaBlend(theme.paint(rest.containerColor), surface);
            for (final (String part, TanreiPaint paint) in <(String, TanreiPaint)>[
              ('label', rest.labelColor),
              ('supporting', rest.supportingTextColor),
              ('trailing', rest.trailingTextColor),
            ]) {
              final double ratio = contrastOf(Color.alphaBlend(theme.paint(paint), row), row);
              if (ratio < 4.5) {
                failures.add('$scheme ${condition.name} $part ${ratio.toStringAsFixed(2)}');
              }
            }
            if (condition == TanreiMenuCondition.selected) {
              final double ratio = contrastOf(
                Color.alphaBlend(theme.paint(rest.markColor), row),
                row,
              );
              if (ratio < 3) {
                failures.add('$scheme mark ${ratio.toStringAsFixed(2)}');
              }
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('motion', () {
    testWidgets(
      'MNU-27: a change of state animates the colors over comp.menu.motion.state-duration '
      'with its easing, and at once where motion is reduced',
      (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TanreiMenuConditionTokens unselected = menuTokens.conditions.unselected;
        final Color resting = lightTheme.paint(unselected.enabled.containerColor);
        final Color hovered = lightTheme.paint(unselected.hovered.containerColor);
        Future<TestGesture> hover({required bool reduce}) async {
          await tester.pumpWidget(
            inPlace(<Widget>[
              TanreiMenuItem(key: UniqueKey(), onPressed: () {}, child: const Text('Cut')),
            ], disableAnimations: reduce),
          );
          final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
          await mouse.addPointer(location: Offset.zero);
          await mouse.moveTo(tester.getCenter(find.text('Cut')));
          await tester.pump();
          return mouse;
        }

        final TestGesture mouse = await hover(reduce: false);
        await tester.pump(Duration(milliseconds: menuTokens.motionStateDuration ~/ 3));
        final double progress = menuTokens.motionStateEasing.toCurve().transform(1 / 3);
        expect(fillOf(tester, 'Cut'), isSameColorAs(tanreiLerpColor(resting, hovered, progress)));
        await tester.pumpAndSettle();
        expect(fillOf(tester, 'Cut'), hovered);
        await mouse.removePointer();
        final TestGesture again = await hover(reduce: true);
        expect(fillOf(tester, 'Cut'), hovered);
        await again.removePointer();
      },
    );
  });

  group('radio groups', () {
    testWidgets('MNU-29: a radio item outside a group is unchecked; a group value that names none '
        'checks none; two radio items with one value are both checked; a group in a group is drawn '
        'as the outer group\'s items; debug builds report each once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      Widget build() => inPlace(<Widget>[
        const TanreiRadioMenuItem<String>(value: 'a', child: Text('Alone')),
        TanreiMenuGroup<String>(
          groupValue: 'x',
          onChanged: (_) {},
          children: const <Widget>[TanreiRadioMenuItem<String>(value: 'b', child: Text('B'))],
        ),
        TanreiMenuGroup<String>(
          title: 'Outer',
          groupValue: 'c',
          onChanged: (_) {},
          children: <Widget>[
            const TanreiRadioMenuItem<String>(value: 'c', child: Text('C1')),
            const TanreiRadioMenuItem<String>(value: 'c', child: Text('C2')),
            const TanreiMenuGroup<String>(
              title: 'Inner',
              children: <Widget>[TanreiRadioMenuItem<String>(value: 'c', child: Text('C3'))],
            ),
          ],
        ),
      ]);
      await tester.pumpWidget(build());
      expect(markOf(tester, 'Alone').progress, 0);
      expect(markOf(tester, 'B').progress, 0);
      expect(markOf(tester, 'C1').progress, 1);
      expect(markOf(tester, 'C2').progress, 1);
      expect(markOf(tester, 'C3').progress, 1, reason: 'the outer group\'s item');
      expect(find.text('Inner'), findsNothing);
      expect(reports.where((String r) => r.contains('outside a group')), hasLength(1));
      expect(reports.where((String r) => r.contains('names none')), hasLength(1));
      expect(reports.where((String r) => r.contains('checked together')), hasLength(1));
      expect(reports.where((String r) => r.contains('inside a group')), hasLength(1));
      final int count = reports.length;
      await tester.pumpWidget(build());
      expect(reports, hasLength(count), reason: 'not on every build');
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(menuTokens.surfaceColor, const TanreiPaint.role(TanreiColorRole.surfaceBright));
      expect(menuTokens.surfaceElevation, system.elevation.level2);
      expect(menuTokens.surfaceShape, system.shape.medium);
      expect(menuTokens.surfacePaddingBlock, system.space.space50);
      expect(menuTokens.surfacePaddingInline, system.space.space50);
      expect(menuTokens.surfaceMinWidth, 160);
      expect(menuTokens.surfaceMaxWidth, 320);
      expect(menuTokens.containerHeight, 44);
      expect(menuTokens.containerShape, system.shape.small);
      expect(menuTokens.labelTypescale, system.typescale.label);
      expect(lightTheme.paint(menuTokens.conditions.destructive.enabled.labelColor), light.error);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": items at rest draw the enabled tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(
          inPlace(<Widget>[action('Cut'), action('Delete', destructive: true)], theme: theme),
        );
        expect(
          textColor(tester, 'Cut'),
          theme.paint(shipped.menu.conditions.unselected.enabled.labelColor),
        );
        expect(
          textColor(tester, 'Delete'),
          theme.paint(shipped.menu.conditions.destructive.enabled.labelColor),
        );
        expect(decorationOf(tester, 'Cut').shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          tester.getSize(containerOfEntry('Cut')).height,
          math.max(shipped.menu.containerHeight, shipped.measure.targetTouch),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('menu');

    test('the spec lists the fixtures this suite records, every one open', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'actions',
        'icons-shortcut',
        'groups',
        'group-titles',
        'supporting-text',
        'trailing-icon',
        'checkbox-checked',
        'checkbox-unchecked',
        'radio-checked',
        'destructive',
        'disabled',
        'checked-disabled',
        'destructive-disabled',
      ]);
      for (final Map<String, dynamic> fixture in fixtures) {
        expect((fixture['props'] as Map<String, dynamic>)['open'], isTrue);
      }
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: menuGoldenSurface,
          child: fixtureMenu(fixture),
          file: 'goldens/menu/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the titled groups show the
    // preset's surface, rows, title, divider and check at once.
    const String recorded = 'group-titles';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: menuGoldenSurface,
          child: fixtureMenu(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/menu/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
