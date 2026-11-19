import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiFabMenuTokens fabMenuTokens = system.fabMenu;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every fixture (FBM-13's `verify`): 320 × 320, the toggle at its inline-end bottom
/// corner 16 from both edges; inside the `space200` padding of every baseline.
const Size stage = Size(320, 320);
const Size fabMenuGoldenSurface = Size(352, 352);

/// The fixtures' glyphs, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{
  'add': 0xe145,
  'description': 0xe873,
  'create_new_folder': 0xe2cc,
  'upload': 0xf09b,
};

Widget glyph(String name) => Text(String.fromCharCode(iconCodePoints[name] ?? 0xe5cc));

/// The FAB menu a fixture describes (FBM-13's `verify`), on its stage, drawn in place.
Widget fixtureFabMenu(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Widget> icon = fixtureSlot('fab-menu', fixture, 'icon', glyphs: iconCodePoints);
  return SizedBox.fromSize(
    size: stage,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Align(
        alignment: AlignmentDirectional.bottomEnd,
        child: _FixtureFabMenu(
          props: props,
          icon: icon.single,
          items: <TanreiFabMenuItem>[
            for (final Map<String, dynamic> item
                in (fixture['items'] as List<dynamic>).cast<Map<String, dynamic>>())
              TanreiFabMenuItem(
                label: (item['props'] as Map<String, dynamic>)['label'] as String? ?? '',
                icon: glyph((item['props'] as Map<String, dynamic>)['icon'] as String? ?? ''),
                onPressed: () {},
              ),
          ],
        ),
      ),
    ),
  );
}

class _FixtureFabMenu extends StatefulWidget {
  const _FixtureFabMenu({required this.props, required this.icon, required this.items});

  final Map<String, dynamic> props;
  final Widget icon;
  final List<TanreiFabMenuItem> items;

  @override
  State<_FixtureFabMenu> createState() => _FixtureFabMenuState();
}

class _FixtureFabMenuState extends State<_FixtureFabMenu> {
  final TanreiMenuController controller = TanreiMenuController();

  @override
  void initState() {
    super.initState();
    if (widget.props['open'] == true) {
      controller.open();
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TanreiFabMenu.inPlace(
    controller: controller,
    semanticLabel: widget.props['label'] as String? ?? '',
    icon: widget.icon,
    variant: TanreiFabMenuVariant(widget.props['variant'] as String? ?? 'filled'),
    size: TanreiFabMenuSize(widget.props['size'] as String? ?? 'medium'),
    enabled: widget.props['disabled'] != true,
    items: widget.items,
  );
}

List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

TanreiMenuController newController() {
  final TanreiMenuController controller = TanreiMenuController();
  addTearDown(controller.dispose);
  return controller;
}

List<TanreiFabMenuItem> threeItems(List<String> log) => <TanreiFabMenuItem>[
  for (final String label in <String>['Document', 'Folder', 'Upload'])
    TanreiFabMenuItem(
      label: label,
      icon: glyph(label == 'Document' ? 'description' : 'upload'),
      onPressed: () => log.add('item $label'),
    ),
];

Widget fabApp({
  required TanreiMenuController controller,
  List<String>? log,
  bool enabled = true,
  List<TanreiFabMenuItem>? items,
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  TanreiFabMenuVariant variant = TanreiFabMenuVariant.filled,
  TanreiFabMenuSize size = TanreiFabMenuSize.medium,
  String label = 'Create',
  List<Widget> before = const <Widget>[],
}) {
  final List<String> events = log ?? <String>[];
  return tanreiTestApp(
    Directionality(
      textDirection: textDirection,
      child: Overlay.wrap(
        child: SizedBox(
          width: 400,
          height: 500,
          child: Stack(
            children: <Widget>[
              Positioned(left: 10, top: 10, child: Column(children: before)),
              PositionedDirectional(
                end: 16,
                bottom: 16,
                child: TanreiFabMenu(
                  controller: controller,
                  semanticLabel: label,
                  icon: glyph('add'),
                  variant: variant,
                  size: size,
                  enabled: enabled,
                  items: items ?? threeItems(events),
                  onToggle: (bool open) => events.add('toggle $open'),
                  onClose: (TanreiMenuCloseReason reason) => events.add('close ${reason.name}'),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
    theme: theme,
    disableAnimations: disableAnimations,
  );
}

Finder get toggleSemantics =>
    find.byWidgetPredicate((Widget w) => w is Semantics && w.properties.expanded != null).first;

Finder toggleContainer() => find
    .byWidgetPredicate(
      (Widget w) =>
          w is DecoratedBox && w.decoration is TanreiContainerDecoration && w.child is SizedBox,
    )
    .first;

TanreiContainerDecoration toggleDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(toggleContainer()).decoration as TanreiContainerDecoration;

Color toggleFill(WidgetTester tester) => toggleDecoration(tester).color ?? const Color(0x00000000);

Finder itemOf(String label) => find
    .byWidgetPredicate(
      (Widget w) =>
          w is Semantics &&
          w.properties.role == SemanticsRole.menuItem &&
          w.properties.label == label,
    )
    .first;

Finder itemContainer(String label) => find
    .descendant(
      of: itemOf(label),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration itemDecoration(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(itemContainer(label)).decoration as TanreiContainerDecoration;

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String found = '';
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is Semantics && widget.properties.label != null) {
      found = widget.properties.label!;
      return false;
    }
    return true;
  });
  return found;
}

bool itemRing(WidgetTester tester, String label) => tester
    .widget<TanreiFocusRing>(
      find.descendant(of: itemOf(label), matching: find.byType(TanreiFocusRing)),
    )
    .visible;

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

Future<void> tab(WidgetTester tester, {bool shift = false}) async {
  if (shift) {
    await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
  }
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  if (shift) {
    await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
  }
  await tester.pumpAndSettle();
}

Future<void> key(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pumpAndSettle();
}

/// Tabs to the toggle with the keyboard highlight.
Future<void> focusToggle(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  for (int i = 0; i < 4 && focusedLabel() != 'Create'; i++) {
    await tab(tester);
  }
  expect(focusedLabel(), 'Create');
}

/// How far an item has come in (FBM-19): its entrance's progress.
double entranceOf(WidgetTester tester, String label) {
  final Finder entrance = find.ancestor(
    of: itemOf(label),
    matching: find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_ItemEntrance'),
  );
  // ignore: avoid_dynamic_calls
  return (tester.widget(entrance) as dynamic).progress as double;
}

/// A focusable button before the menu, named so that focus on it can be told.
Widget pageButton(List<String> log) => TanreiButton(
  onPressed: () => log.add('page'),
  semanticLabel: 'Page',
  child: const Text('Page'),
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('events and focus', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('FBM-1: a ${kind.name} press on the toggle emits toggle with the opposite of '
          'open, and the menu opens or closes through its controller', (WidgetTester tester) async {
        final List<String> log = <String>[];
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller, log: log));
        await tester.tap(toggleContainer(), kind: kind);
        await tester.pumpAndSettle();
        expect(log, <String>['toggle true']);
        expect(controller.isOpen, isTrue);
        expect(find.text('Document'), findsOneWidget);
        // FBM-15: a press on the toggle while open is not a press outside.
        await tester.tap(toggleContainer(), kind: kind);
        await tester.pumpAndSettle();
        expect(log, <String>['toggle true', 'toggle false']);
        expect(controller.isOpen, isFalse);
        expect(find.text('Document'), findsNothing);
      });
    }

    for (final LogicalKeyboardKey k in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
      LogicalKeyboardKey.arrowDown,
    ]) {
      testWidgets(
        'FBM-1, FBM-13: ${k.keyLabel} on the closed toggle opens the menu and moves focus '
        'to the first item, with the ring',
        (WidgetTester tester) async {
          final List<String> log = <String>[];
          await tester.pumpWidget(fabApp(controller: newController(), log: log));
          await focusToggle(tester);
          await key(tester, k);
          expect(log, <String>['toggle true']);
          expect(focusedLabel(), 'Document');
          expect(itemRing(tester, 'Document'), isTrue);
        },
      );
    }

    testWidgets('FBM-13: Up Arrow on the closed toggle opens the menu and focuses the last item, '
        'the one nearest the toggle; a pointer\'s open focuses the first without the ring', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(fabApp(controller: newController()));
      await focusToggle(tester);
      await key(tester, LogicalKeyboardKey.arrowUp);
      expect(focusedLabel(), 'Upload');
      await key(tester, LogicalKeyboardKey.escape);
      expect(focusedLabel(), 'Create');
      await tester.tap(toggleContainer());
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'Document');
      expect(itemRing(tester, 'Document'), isFalse);
    });

    testWidgets('FBM-2: while disabled the toggle emits nothing, takes no focus, is exposed as '
        'disabled, is drawn closed and presents no items whatever open says', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> log = <String>[];
      final TanreiMenuController controller = newController()..open();
      await tester.pumpWidget(fabApp(controller: controller, log: log, enabled: false));
      await tester.pumpAndSettle();
      expect(find.text('Document'), findsNothing);
      await tester.tap(toggleContainer());
      await tester.pumpAndSettle();
      expect(log, isEmpty);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tab(tester);
      expect(focusedLabel(), isNot('Create'));
      final SemanticsData data = tester
          .getSemantics(
            find
                .byWidgetPredicate((Widget w) => w is Semantics && w.properties.label == 'Create')
                .first,
          )
          .getSemanticsData();
      expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
      expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(
        toggleFill(tester),
        lightTheme.paint(fabMenuTokens.variants.filled.disabled.containerColor),
      );
      handle.dispose();
    });

    testWidgets('FBM-14, FBM-15: not modal — no scrim, nothing inert; Escape emits close(escape) '
        'once, closes, and returns focus to the toggle', (WidgetTester tester) async {
      final List<String> log = <String>[];
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        fabApp(controller: controller, log: log, before: <Widget>[pageButton(log)]),
      );
      await tester.tap(toggleContainer());
      await tester.pumpAndSettle();
      // The page stays live under an open menu: a press on it closes the menu and reaches it.
      await tester.tap(find.text('Page'));
      await tester.pumpAndSettle();
      expect(log, <String>['toggle true', 'close outside', 'page']);
      expect(controller.isOpen, isFalse);

      log.clear();
      await focusToggle(tester);
      await key(tester, LogicalKeyboardKey.enter);
      await key(tester, LogicalKeyboardKey.escape);
      expect(log, <String>['toggle true', 'close escape']);
      expect(controller.isOpen, isFalse);
      expect(find.text('Document'), findsNothing);
      expect(focusedLabel(), 'Create');
    });

    testWidgets('FBM-15: the platform\'s back emits close(back); Tab on an item emits close(tab) '
        'and moves on from the toggle; focus moving out emits close(focus-out)', (
      WidgetTester tester,
    ) async {
      final List<String> log = <String>[];
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller, log: log));
      controller.open();
      await tester.pumpAndSettle();
      expect(await tester.binding.handlePopRoute(), isTrue);
      await tester.pumpAndSettle();
      expect(log, <String>['close back']);
      expect(controller.isOpen, isFalse);

      log.clear();
      await tester.pumpWidget(
        fabApp(controller: controller, log: log, before: <Widget>[pageButton(log)]),
      );
      await focusToggle(tester);
      await key(tester, LogicalKeyboardKey.enter);
      await tab(tester);
      expect(log, <String>['toggle true', 'close tab']);
      expect(controller.isOpen, isFalse);
      expect(focusedLabel(), 'Page', reason: 'on from the toggle, wrapping to the page');

      log.clear();
      final FocusNode elsewhere = FocusNode();
      addTearDown(elsewhere.dispose);
      await tester.pumpWidget(
        fabApp(
          controller: controller,
          log: log,
          before: <Widget>[
            Focus(focusNode: elsewhere, child: const SizedBox(width: 10, height: 10)),
          ],
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      elsewhere.requestFocus();
      await tester.pumpAndSettle();
      expect(log, <String>['close focusOut']);
      expect(controller.isOpen, isFalse);
    });

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets(
        'FBM-16: a ${kind.name} press on an item emits its click once, then close(item)',
        (WidgetTester tester) async {
          final List<String> log = <String>[];
          final TanreiMenuController controller = newController();
          await tester.pumpWidget(fabApp(controller: controller, log: log));
          controller.open();
          await tester.pumpAndSettle();
          await tester.tap(find.text('Folder'), kind: kind);
          await tester.pumpAndSettle();
          expect(log, <String>['item Folder', 'close item']);
          expect(controller.isOpen, isFalse);
        },
      );
    }

    testWidgets('FBM-16: Enter or Space on an item emits its click, then close(item)', (
      WidgetTester tester,
    ) async {
      final List<String> log = <String>[];
      await tester.pumpWidget(fabApp(controller: newController(), log: log));
      await focusToggle(tester);
      await key(tester, LogicalKeyboardKey.enter);
      await key(tester, LogicalKeyboardKey.space);
      expect(log, <String>['toggle true', 'item Document', 'close item']);
      expect(focusedLabel(), 'Create');
    });

    testWidgets(
      'FBM-17: Down and Up Arrow move through the items, wrapping, and Home and End go to '
      'the ends',
      (WidgetTester tester) async {
        await tester.pumpWidget(fabApp(controller: newController()));
        await focusToggle(tester);
        await key(tester, LogicalKeyboardKey.enter);
        await key(tester, LogicalKeyboardKey.arrowDown);
        expect(focusedLabel(), 'Folder');
        await key(tester, LogicalKeyboardKey.arrowDown);
        await key(tester, LogicalKeyboardKey.arrowDown);
        expect(focusedLabel(), 'Document', reason: 'wraps');
        await key(tester, LogicalKeyboardKey.arrowUp);
        expect(focusedLabel(), 'Upload');
        await key(tester, LogicalKeyboardKey.home);
        expect(focusedLabel(), 'Document');
        await key(tester, LogicalKeyboardKey.end);
        expect(focusedLabel(), 'Upload');
      },
    );
  });

  group('states', () {
    testWidgets(
      'FBM-3: under the acme system the toggle draws hovered, focused and pressed from its '
      'closed or open parts, and an item from its item parts',
      (WidgetTester tester) async {
        const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
        final TanreiFabMenuVariantTokens filled = acmeSystem.fabMenu.variants.filled;
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller, theme: acme));
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(toggleContainer()));
        await tester.pumpAndSettle();
        expect(toggleFill(tester), acme.paint(filled.hovered.containerColor));
        controller.open();
        await tester.pumpAndSettle();
        expect(toggleFill(tester), acme.paint(filled.hovered.openContainerColor));
        await mouse.moveTo(tester.getCenter(find.text('Folder')));
        await tester.pumpAndSettle();
        expect(
          itemDecoration(tester, 'Folder').color,
          acme.paint(filled.hovered.itemContainerColor),
        );
        expect(toggleFill(tester), acme.paint(filled.enabled.openContainerColor));
        final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Upload')));
        await tester.pump();
        expect(
          itemDecoration(tester, 'Upload').color,
          acme.paint(filled.pressed.itemContainerColor),
        );
        await touch.cancel();
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'FBM-4: keyboard focus shows the ring around the toggle and around an item at once; '
      'focus from a pointer shows none',
      (WidgetTester tester) async {
        await tester.pumpWidget(fabApp(controller: newController()));
        await focusToggle(tester);
        final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(
          find.ancestor(of: toggleContainer(), matching: find.byType(TanreiFocusRing)),
        );
        expect(ring.visible, isTrue);
        expect(ring.borderRadius, toggleDecoration(tester).shape.borderRadius);
        await key(tester, LogicalKeyboardKey.arrowDown);
        expect(itemRing(tester, 'Document'), isTrue);
        await key(tester, LogicalKeyboardKey.arrowDown);
        expect(itemRing(tester, 'Folder'), isTrue);
        expect(itemRing(tester, 'Document'), isFalse);
      },
    );

    testWidgets('FBM-5: the toggle\'s hit area is the touch target; each item is at least a target '
        'tall and its whole container is its hit area', (WidgetTester tester) async {
      final List<String> log = <String>[];
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        fabApp(controller: controller, log: log, size: TanreiFabMenuSize.small),
      );
      final Rect visual = tester.getRect(toggleContainer());
      expect(visual.width, fabMenuTokens.sizes.small.containerSize);
      final double target = system.measure.targetTouch;
      expect(visual.width, lessThan(target));
      await tester.tapAt(visual.topLeft - const Offset(3, 3));
      await tester.pumpAndSettle();
      expect(log, <String>['toggle true']);
      for (final String label in <String>['Document', 'Folder', 'Upload']) {
        expect(tester.getSize(itemContainer(label)).height, greaterThanOrEqualTo(target));
      }
      final Rect folder = tester.getRect(itemContainer('Folder'));
      await tester.tapAt(folder.topLeft + const Offset(2, 2));
      await tester.pumpAndSettle();
      expect(log.last, 'close item');
      expect(log, contains('item Folder'));
    });

    testWidgets('FBM-6: disabled, the toggle draws the disabled tokens of its variant\'s closed '
        'parts', (WidgetTester tester) async {
      for (final TanreiFabMenuVariant variant in TanreiFabMenuVariant.core) {
        await tester.pumpWidget(
          fabApp(controller: newController()..open(), enabled: false, variant: variant),
        );
        final TanreiFabMenuVariantStateTokens disabled = fabMenuTokens.variants[variant].disabled;
        expect(toggleFill(tester), lightTheme.paint(disabled.containerColor), reason: '$variant');
        expect(toggleDecoration(tester).boxShadow, isNull);
      }
    });

    testWidgets('FBM-7: a variant or size the system does not have renders as the default and is '
        'reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(
        fabApp(
          controller: newController(),
          variant: const TanreiFabMenuVariant('neon'),
          size: const TanreiFabMenuSize('huge'),
        ),
      );
      expect(
        toggleFill(tester),
        lightTheme.paint(fabMenuTokens.variants.filled.enabled.containerColor),
      );
      expect(tester.getSize(toggleContainer()).width, fabMenuTokens.sizes.medium.containerSize);
      expect(reports, contains('fab-menu variant "neon" -> filled'));
      expect(reports, contains('fab-menu size "huge" -> medium'));
    });

    testWidgets('FBM-21: the toggle casts its elevation, closed and open, unclipped; a change of '
        'state animates the colors over the state motion, at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiFabMenuVariantTokens filled = fabMenuTokens.variants.filled;
      final Duration duration = tanreiDuration(fabMenuTokens.motionStateDuration);
      for (final bool reduced in <bool>[false, true]) {
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller, disableAnimations: reduced));
        await tester.pumpAndSettle();
        // The previous run left focus on the toggle (closing returns it there).
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
        expect(
          toggleDecoration(tester).boxShadow,
          TanreiResolvedElevation.resolve(
            filled.enabled.containerElevation,
            lightTheme.colors,
          ).shadows,
        );
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await tester.pump();
        await mouse.moveTo(tester.getCenter(toggleContainer()));
        await tester.pump();
        await tester.pump(duration ~/ 2);
        final Color hovered = lightTheme.paint(filled.hovered.containerColor);
        if (reduced) {
          expect(toggleFill(tester), hovered);
        } else {
          expect(toggleFill(tester), isNot(hovered));
        }
        await tester.pump(duration);
        expect(toggleFill(tester), hovered);
        await mouse.removePointer();
        await tester.pumpAndSettle();
        controller.open();
        await tester.pumpAndSettle();
        expect(
          toggleDecoration(tester).boxShadow,
          TanreiResolvedElevation.resolve(
            filled.enabled.openContainerElevation,
            lightTheme.colors,
          ).shadows,
        );
      }
    });
  });

  group('press hold (FBM-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressed = lightTheme.paint(fabMenuTokens.variants.filled.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets(
        'FBM-8: a ${kind.name} press shows the pressed state at once and keeps it for the '
        'press-hold duration',
        (WidgetTester tester) async {
          await tester.pumpWidget(fabApp(controller: newController(), enabled: true));
          final TestGesture gesture = await tester.startGesture(
            tester.getCenter(toggleContainer()),
            kind: kind,
          );
          await tester.pump();
          expect(toggleFill(tester), pressed);
          await gesture.cancel();
          await tester.pump(hold - tick);
          expect(toggleFill(tester), pressed);
          await tester.pump(tick);
          await tester.pumpAndSettle();
          expect(toggleFill(tester), isNot(pressed));
        },
      );
    }

    testWidgets('FBM-8: Enter shows the pressed state at once, for the press-hold duration', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(fabApp(controller: newController(), disableAnimations: true));
      await focusToggle(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      final TanreiFabMenuVariantTokens filled = fabMenuTokens.variants.filled;
      // Opened at once (reduced motion): the pressed open look.
      expect(toggleFill(tester), lightTheme.paint(filled.pressed.openContainerColor));
      await tester.pump(hold - tick);
      expect(toggleFill(tester), lightTheme.paint(filled.pressed.openContainerColor));
      await tester.pumpAndSettle();
    });
  });

  group('choices of kind', () {
    testWidgets('FBM-9: overlay (default) fills the pressed container at once; ripple (m3-like) '
        'grows it from the point of contact, in the toggle and in each item; dim (cupertino) dims '
        'it and draws no state layer', (WidgetTester tester) async {
      await tester.pumpWidget(fabApp(controller: newController()));
      TestGesture touch = await tester.startGesture(tester.getCenter(toggleContainer()));
      await tester.pump();
      expect(
        toggleFill(tester),
        lightTheme.paint(fabMenuTokens.variants.filled.pressed.containerColor),
      );
      expect(toggleDecoration(tester).ripple, isNull);
      await touch.cancel();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller, theme: m3));
      final Rect box = tester.getRect(toggleContainer());
      const Offset contact = Offset(10, 12);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(toggleDecoration(tester).ripple!.origin, contact);
      await touch.cancel();
      await tester.pumpAndSettle();
      controller.open();
      await tester.pumpAndSettle();
      final Rect item = tester.getRect(itemContainer('Folder'));
      touch = await tester.startGesture(item.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = itemDecoration(tester, 'Folder').ripple!;
      expect(ripple.origin, contact);
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.fabMenu.variants.filled.pressed.itemContainerColor),
      );
      await touch.cancel();
      await tester.pumpAndSettle();

      await tester.pumpWidget(
        fabApp(
          controller: newController(),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      touch = await tester.startGesture(tester.getCenter(toggleContainer()));
      await tester.pump();
      final Opacity dim = tester.widget<Opacity>(
        find.ancestor(of: toggleContainer(), matching: find.byType(Opacity)).first,
      );
      expect(dim.opacity, cupertinoSystem.fabMenu.pressed.opacity);
      expect(cupertinoSystem.fabMenu.pressed.opacity, lessThan(1));
      await touch.cancel();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'FBM-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiFabMenuVariantTokens filled = fabMenuTokens.variants.filled;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            fabMenu: fabMenuTokens.copyWith(
              pressed: fabMenuTokens.pressed.copyWith(opacity: 0.5),
              variants: fabMenuTokens.variants.copyWith(
                filled: filled.copyWith(
                  pressed: filled.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    containerElevation: const <TanreiShadowLayer>[],
                  ),
                ),
              ),
            ),
          );
          final TanreiThemeData theme = TanreiThemeData(system: of);
          await tester.pumpWidget(fabApp(controller: newController(), theme: theme));
          final TestGesture touch = await tester.startGesture(tester.getCenter(toggleContainer()));
          await tester.pump();
          expect(toggleFill(tester), theme.paint(filled.enabled.containerColor));
          final double opacity = tester
              .widget<Opacity>(
                find.ancestor(of: toggleContainer(), matching: find.byType(Opacity)).first,
              )
              .opacity;
          if (feedback == TanreiPressedFeedback.none) {
            expect(opacity, 1);
            expect(toggleDecoration(tester).boxShadow, isNotNull);
          } else {
            expect(opacity, 0.5);
            expect(toggleDecoration(tester).boxShadow, isNull, reason: 'the pressed elevation');
            expect(
              toggleDecoration(tester).ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.cancel();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets('FBM-10: corner smoothing eases the toggle and the items; the focus style draws a '
        'ring (default) or a glow (acme)', (WidgetTester tester) async {
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(
          fabApp(
            controller: newController(),
            theme: TanreiThemeData(system: of),
          ),
        );
        await focusToggle(tester);
        final List<Paint> found = <Paint>[];
        expect(
          find.ancestor(of: toggleContainer(), matching: find.byType(TanreiFocusRing)),
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

      final List<Paint> ring = await strokes(system);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
      await strokes(cupertinoSystem);
      expect(toggleDecoration(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      await key(tester, LogicalKeyboardKey.enter);
      expect(
        itemDecoration(tester, 'Folder').shape.smoothing,
        cupertinoSystem.shape.cornerSmoothing,
      );
    });
  });

  group('layout and motion', () {
    testWidgets('FBM-11: the toggle is a square of its size with its size\'s corners closed and '
        'container.shape-open open; its glyph is the icon closed and the close glyph open', (
      WidgetTester tester,
    ) async {
      for (final TanreiFabMenuSize size in TanreiFabMenuSize.core) {
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller, size: size));
        // The previous size's menu was left open: a new, closed controller closes it.
        await tester.pumpAndSettle();
        final TanreiFabMenuSizeTokens tokens = fabMenuTokens.sizes[size];
        expect(tester.getSize(toggleContainer()), Size.square(tokens.containerSize));
        expect(
          toggleDecoration(tester).shape.radius,
          math.min(tokens.containerShape, tokens.containerSize / 2),
        );
        expect(find.text(tanreiCloseGlyph), findsNothing);
        final TanreiControlIcon icon = tester.widget<TanreiControlIcon>(
          find.descendant(of: toggleContainer(), matching: find.byType(TanreiControlIcon)),
        );
        expect(icon.size, tokens.iconSize);
        expect(icon.selected, isFalse);
        controller.open();
        await tester.pumpAndSettle();
        expect(
          toggleDecoration(tester).shape.radius,
          math.min(fabMenuTokens.containerShapeOpen, tokens.containerSize / 2),
        );
        expect(
          find.descendant(of: toggleContainer(), matching: find.text(tanreiCloseGlyph)),
          findsOneWidget,
        );
        expect(
          find.descendant(of: toggleContainer(), matching: find.text('\u{e145}')),
          findsNothing,
        );
      }
    });

    testWidgets('FBM-12: the toggle lays out at its own size where the layout puts it; the items '
        'are presented above the page and move no content', (WidgetTester tester) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller));
      final Rect before = tester.getRect(find.byType(TanreiFabMenu));
      expect(before.size, Size.square(system.measure.targetTouch));
      controller.open();
      await tester.pumpAndSettle();
      expect(tester.getRect(find.byType(TanreiFabMenu)), before);
      // The items are laid out in the overlay, not in the FAB menu's box.
      final RenderObject menu = tester.renderObject(find.byType(TanreiFabMenu));
      bool inMenu = false;
      for (RenderObject? r = tester.renderObject(find.text('Document')); r != null; r = r.parent) {
        inMenu = inMenu || identical(r, menu);
      }
      expect(inMenu, isFalse);
    });

    testWidgets('FBM-13: the items stand above the toggle, list.offset from its top and list.gap '
        'apart, the first at the top, every end edge on the toggle\'s', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller));
      controller.open();
      await tester.pumpAndSettle();
      final Rect toggle = tester.getRect(toggleContainer());
      final Rect doc = tester.getRect(itemContainer('Document'));
      final Rect folder = tester.getRect(itemContainer('Folder'));
      final Rect upload = tester.getRect(itemContainer('Upload'));
      expect(toggle.top - upload.bottom, fabMenuTokens.listOffset);
      expect(folder.top - doc.bottom, fabMenuTokens.listGap);
      expect(upload.top - folder.bottom, fabMenuTokens.listGap);
      for (final Rect r in <Rect>[doc, folder, upload]) {
        expect(r.right, moreOrLessEquals(toggle.right));
      }
    });

    testWidgets(
      'FBM-18: an item is at least item.height tall, as wide as its content, its icon and '
      'label item.gap apart inside its paddings, the label wrapping rather than truncating',
      (WidgetTester tester) async {
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller));
        controller.open();
        await tester.pumpAndSettle();
        final Rect item = tester.getRect(itemContainer('Folder'));
        expect(item.height, math.max(fabMenuTokens.itemHeight, system.measure.targetTouch));
        final Rect label = tester.getRect(find.text('Folder'));
        final Rect icon = tester.getRect(
          find.descendant(of: itemOf('Folder'), matching: find.byType(TanreiControlIcon)),
        );
        expect(icon.left - item.left, fabMenuTokens.itemPaddingInlineStart);
        expect(label.left - icon.right, fabMenuTokens.itemGap);
        expect(item.right - label.right, fabMenuTokens.itemPaddingInlineEnd);
        expect(icon.width, fabMenuTokens.itemIconSize);
        expect(textStyleOf(tester, 'Folder').fontSize, fabMenuTokens.itemLabelTypescale.size);
        expect(
          itemDecoration(tester, 'Folder').boxShadow,
          TanreiResolvedElevation.resolve(
            fabMenuTokens.variants.filled.enabled.itemContainerElevation,
            lightTheme.colors,
          ).shadows,
        );
        final RenderParagraph paragraph = tester.renderObject(
          find.descendant(of: find.text('Folder'), matching: find.byType(RichText)),
        );
        expect(paragraph.maxLines, isNull);
        expect(paragraph.overflow, TextOverflow.clip);
      },
    );

    testWidgets('FBM-19: opening turns the toggle and fades the items in from their end edges over '
        'the open motion, the nearest first, each a stagger later; closing fades them out '
        'together over the close motion; at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final Duration open = tanreiDuration(fabMenuTokens.motionOpenDuration);
      final Duration stagger = tanreiDuration(fabMenuTokens.motionStagger);
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller));
      double opacityOfItem(String label) => entranceOf(tester, label);

      controller.open();
      await tester.pump();
      await tester.pump(stagger ~/ 2);
      // The nearest (Upload) has begun; the farthest (Document) waits two staggers.
      expect(opacityOfItem('Upload'), greaterThan(0));
      expect(opacityOfItem('Document'), 0);
      expect(opacityOfItem('Upload'), greaterThan(opacityOfItem('Folder')));
      await tester.pump(open + stagger * 2);
      expect(opacityOfItem('Document'), 1);
      expect(
        find.descendant(of: toggleContainer(), matching: find.text(tanreiCloseGlyph)),
        findsOneWidget,
      );

      controller.close();
      await tester.pump();
      await tester.pump(tanreiDuration(fabMenuTokens.motionCloseDuration) ~/ 2);
      final double doc = opacityOfItem('Document');
      expect(doc, inExclusiveRange(0, 1));
      expect(opacityOfItem('Upload'), moreOrLessEquals(doc), reason: 'together');
      await tester.pumpAndSettle();
      expect(find.text('Document'), findsNothing);

      await tester.pumpWidget(fabApp(controller: controller, disableAnimations: true));
      controller.open();
      await tester.pump();
      await tester.pump();
      expect(opacityOfItem('Document'), 1);
      controller.close();
      await tester.pump();
      expect(find.text('Document'), findsNothing);
    });

    testWidgets('FBM-22: in a right-to-left layout the items\' end edges are on the toggle\'s left '
        'edge, their content mirrored, and a ripple grows from the point of contact', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        fabApp(
          controller: controller,
          textDirection: TextDirection.rtl,
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      final Rect toggle = tester.getRect(toggleContainer());
      final Rect folder = tester.getRect(itemContainer('Folder'));
      expect(folder.left, moreOrLessEquals(toggle.left));
      final Rect icon = tester.getRect(
        find.descendant(of: itemOf('Folder'), matching: find.byType(TanreiControlIcon)),
      );
      expect(icon.left, greaterThan(tester.getRect(find.text('Folder')).right));
      const Offset contact = Offset(14, 9);
      final TestGesture touch = await tester.startGesture(folder.topLeft + contact);
      await tester.pump();
      expect(itemDecoration(tester, 'Folder').ripple!.origin, contact);
      await touch.cancel();
      await tester.pumpAndSettle();
    });

    testWidgets('FBM-23: an empty label, an item without a label or an icon, and fewer than two or '
        'more than six items still render and are reported once', (WidgetTester tester) async {
      final List<String> names = collectMissingNames();
      final List<String> ignored = collectIgnoredValues();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        fabApp(
          controller: controller,
          label: '',
          items: const <TanreiFabMenuItem>[TanreiFabMenuItem(label: '', icon: null)],
        ),
      );
      controller.open();
      await tester.pumpAndSettle();
      expect(names, <String>['fab menu', 'fab menu item']);
      expect(ignored, hasLength(2));
      expect(ignored, contains(contains('has no icon')));
      expect(ignored, contains(contains('holds 1')));
      await tester.pump();
      expect(names, hasLength(2));
      ignored.clear();
      await tester.pumpWidget(
        fabApp(
          controller: newController(),
          items: <TanreiFabMenuItem>[
            for (int i = 0; i < 7; i++) TanreiFabMenuItem(label: 'Item $i', icon: glyph('add')),
          ],
        ),
      );
      expect(ignored, <Matcher>[contains('holds 7')]);
    });
  });

  group('accessibility semantics', () {
    testWidgets('FBM-20: the toggle is a button named by the label that says whether its menu is '
        'open; the open items are a menu named by the label, each a menu item named by its '
        'label; the icons are hidden', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(fabApp(controller: controller));
      SemanticsData toggle() => nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .firstWhere((SemanticsData d) => d.hasFlag(SemanticsFlag.isButton));
      expect(toggle().label, 'Create');
      expect(toggle().hasFlag(SemanticsFlag.hasExpandedState), isTrue);
      expect(toggle().hasFlag(SemanticsFlag.isExpanded), isFalse);
      controller.open();
      await tester.pumpAndSettle();
      expect(toggle().hasFlag(SemanticsFlag.isExpanded), isTrue);
      final SemanticsNode menu = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().role == SemanticsRole.menu);
      expect(menu.getSemanticsData().label, 'Create');
      final List<SemanticsData> items = <SemanticsData>[];
      menu.visitChildren((SemanticsNode child) {
        items.add(child.getSemanticsData());
        return true;
      });
      expect(items.map((SemanticsData d) => d.role), everyElement(SemanticsRole.menuItem));
      expect(items.map((SemanticsData d) => d.label), <String>['Document', 'Folder', 'Upload']);
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).map((SemanticsNode n) => n.getSemanticsData().label).where((String l) => l.isNotEmpty),
        <String>['Create', 'Create', 'Document', 'Folder', 'Upload'],
      );
      handle.dispose();
    });

    testWidgets('guidelines: FAB menu', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiFabMenuVariant variant in TanreiFabMenuVariant.core) {
          final TanreiMenuController controller = newController();
          await tester.pumpWidget(
            fabApp(
              controller: controller,
              variant: variant,
              theme: theme,
              size: TanreiFabMenuSize.small,
            ),
          );
          controller.open();
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
      expect(fabMenuTokens.sizes.small.containerSize, 40);
      expect(fabMenuTokens.sizes.medium.containerSize, 48);
      expect(fabMenuTokens.sizes.large.containerSize, 64);
      expect(fabMenuTokens.itemHeight, 48);
      expect(fabMenuTokens.motionStagger, 100);
      expect(fabMenuTokens.containerShapeOpen, system.shape.full);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": a FAB menu draws the closed, open and item tokens of that '
          'system', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(fabApp(controller: controller, theme: theme));
        final TanreiFabMenuVariantStateTokens rest = shipped.fabMenu.variants.filled.enabled;
        expect(toggleFill(tester), theme.paint(rest.containerColor));
        controller.open();
        await tester.pumpAndSettle();
        expect(toggleFill(tester), theme.paint(rest.openContainerColor));
        expect(itemDecoration(tester, 'Folder').color, theme.paint(rest.itemContainerColor));
        expect(itemDecoration(tester, 'Folder').shape.smoothing, shipped.shape.cornerSmoothing);
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('fab-menu');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'filled-closed',
        'tonal-closed',
        'surface-closed',
        'small-closed',
        'large-closed',
        'filled-open',
        'tonal-open',
        'surface-open',
        'filled-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: fabMenuGoldenSurface,
          child: fixtureFabMenu(fixture),
          file: 'goldens/fab_menu/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the open filled menu shows the
    // preset's toggle in its open look and the items at once.
    const String recorded = 'filled-open';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: fabMenuGoldenSurface,
          child: fixtureFabMenu(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/fab_menu/${preset.id}/$recorded.png',
        );
      });
    }
  });
}

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;
