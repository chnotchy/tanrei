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
final TanreiSplitButtonTokens splitTokens = system.splitButton;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every fixture (SPB-12's `verify`): 320 × 96, the split button at its natural width,
/// start-aligned and vertically centred; inside the `space200` padding of every baseline.
const Size stage = Size(320, 96);
const Size splitGoldenSurface = Size(352, 128);

/// The fixtures' glyphs, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{'save': 0xe161};

/// The split button a fixture describes (SPB-12's `verify`), on its stage: `open` draws the
/// trailing half's open form, and no menu is presented, since a fixture cannot fill the menu slot.
Widget fixtureSplit(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Widget> icon = fixtureSlot('split-button', fixture, 'icon', glyphs: iconCodePoints);
  return SizedBox.fromSize(
    size: stage,
    child: Align(
      alignment: AlignmentDirectional.centerStart,
      child: _FixtureSplit(props: props, icon: icon.isEmpty ? null : icon.single),
    ),
  );
}

class _FixtureSplit extends StatefulWidget {
  const _FixtureSplit({required this.props, this.icon});

  final Map<String, dynamic> props;
  final Widget? icon;

  @override
  State<_FixtureSplit> createState() => _FixtureSplitState();
}

class _FixtureSplitState extends State<_FixtureSplit> {
  late final TanreiMenuController controller = TanreiMenuController();

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
  Widget build(BuildContext context) => TanreiSplitButton(
    label: widget.props['label'] as String? ?? '',
    menuSemanticLabel: widget.props['menuLabel'] as String? ?? '',
    icon: widget.icon,
    onPressed: widget.props['disabled'] == true ? null : () {},
    menuController: controller,
    menuChildren: const <Widget>[],
    variant: TanreiSplitButtonVariant(widget.props['variant'] as String? ?? 'filled'),
    size: TanreiSplitButtonSize(widget.props['size'] as String? ?? 'medium'),
  );
}

/// Collects what the split button reports as ignored (SPB-20), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// What a product sees of one split button: clicks, toggles, closes and the menu's item clicks,
/// in order.
class Events {
  final List<String> log = <String>[];
}

TanreiMenuController newController() {
  final TanreiMenuController controller = TanreiMenuController();
  addTearDown(controller.dispose);
  return controller;
}

Widget splitApp({
  required TanreiMenuController controller,
  Events? events,
  bool enabled = true,
  List<Widget>? items,
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  TanreiSplitButtonVariant variant = TanreiSplitButtonVariant.filled,
  TanreiSplitButtonSize size = TanreiSplitButtonSize.medium,
  String label = 'Save',
  String menuLabel = 'More save options',
  Widget? icon,
  double? width,
  List<Widget> after = const <Widget>[],
}) {
  final Widget split = TanreiSplitButton(
    label: label,
    menuSemanticLabel: menuLabel,
    icon: icon,
    onPressed: enabled ? () => events?.log.add('click') : null,
    menuController: controller,
    onMenuToggle: (bool open) => events?.log.add('toggle $open'),
    onMenuClose: (TanreiMenuCloseReason reason) => events?.log.add('close ${reason.name}'),
    variant: variant,
    size: size,
    menuChildren:
        items ??
        <Widget>[
          TanreiMenuItem(
            onPressed: () => events?.log.add('item Save as'),
            child: const Text('Save as'),
          ),
          TanreiMenuItem(
            onPressed: () => events?.log.add('item Save all'),
            child: const Text('Save all'),
          ),
        ],
  );
  return tanreiTestApp(
    Directionality(
      textDirection: textDirection,
      child: Overlay.wrap(
        child: Align(
          alignment: Alignment.topCenter,
          child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (width == null) split else SizedBox(width: width, child: split),
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
}

/// The half named [name]: its `Semantics` (the leading half's label or the menu label).
Finder halfOf(String name) =>
    find.byWidgetPredicate((Widget w) => w is Semantics && w.properties.label == name).first;

Finder containerOf(String name) => find
    .descendant(
      of: halfOf(name),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, String name) =>
    tester.widget<DecoratedBox>(containerOf(name)).decoration as TanreiContainerDecoration;

Color fillOf(WidgetTester tester, String name) =>
    decorationOf(tester, name).color ?? const Color(0x00000000);

double opacityOf(WidgetTester tester, String name) => tester
    .widget<Opacity>(find.descendant(of: halfOf(name), matching: find.byType(Opacity)).first)
    .opacity;

TanreiFocusRing ringOf(WidgetTester tester, String name) => tester.widget<TanreiFocusRing>(
  find.descendant(of: halfOf(name), matching: find.byType(TanreiFocusRing)),
);

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

const String save = 'Save';
const String more = 'More save options';

/// The chevron's turn, in half turns (0 closed, 1 open).
double chevronTurn(WidgetTester tester) {
  final Transform rotate = tester.widget<Transform>(
    find.ancestor(of: find.text(tanreiArrowDownGlyph), matching: find.byType(Transform)).first,
  );
  return math.atan2(rotate.transform.entry(1, 0), rotate.transform.entry(0, 0)).abs() / math.pi;
}

String focusedName() {
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

Future<void> tab(WidgetTester tester) async {
  await tester.sendKeyEvent(LogicalKeyboardKey.tab);
  await tester.pumpAndSettle();
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('events', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('SPB-1: a ${kind.name} press on the leading half emits click once and does not '
          'open the menu', (WidgetTester tester) async {
        final Events events = Events();
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(splitApp(controller: controller, events: events));
        await tester.tap(find.text(save), kind: kind);
        await tester.pumpAndSettle();
        expect(events.log, <String>['click']);
        expect(controller.isOpen, isFalse);
        expect(find.text('Save as'), findsNothing);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      testWidgets(
        'SPB-1, SPB-2: ${key.keyLabel} on the leading half clicks; on the trailing half it '
        'toggles the menu open',
        (WidgetTester tester) async {
          final Events events = Events();
          final TanreiMenuController controller = newController();
          await tester.pumpWidget(splitApp(controller: controller, events: events));
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          await tab(tester);
          expect(focusedName(), save);
          await tester.sendKeyEvent(key);
          await tester.pumpAndSettle();
          expect(events.log, <String>['click']);
          await tab(tester);
          expect(focusedName(), more);
          await tester.sendKeyEvent(key);
          await tester.pumpAndSettle();
          expect(events.log, <String>['click', 'toggle true']);
          expect(controller.isOpen, isTrue);
          // SPB-15: focus moved to the first item.
          expect(focusedName(), isNot(more));
          // Escape returns focus to the trailing half (SPB-15), its menu closed.
          await tester.sendKeyEvent(LogicalKeyboardKey.escape);
          await tester.pumpAndSettle();
          expect(focusedName(), more);
          expect(events.log.last, 'close escape');
          expect(controller.isOpen, isFalse);
        },
      );
    }

    testWidgets('SPB-2: a press on the trailing half emits toggle with the opposite of open, then '
        'the menu opens or closes through its controller; Down Arrow opens a closed menu', (
      WidgetTester tester,
    ) async {
      final Events events = Events();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(splitApp(controller: controller, events: events));
      await tester.tap(find.byWidget(tester.widget(halfOf(more))));
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true']);
      expect(controller.isOpen, isTrue);
      expect(find.text('Save as'), findsOneWidget);
      // SPB-16: a press on the trailing half while open is not a press outside.
      await tester.tap(find.byWidget(tester.widget(halfOf(more))));
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true', 'toggle false']);
      expect(controller.isOpen, isFalse);
      expect(find.text('Save as'), findsNothing);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tab(tester);
      await tab(tester);
      expect(focusedName(), more);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(events.log.last, 'toggle true');
      expect(controller.isOpen, isTrue);
    });

    testWidgets('SPB-3: while disabled neither half emits or takes focus, both are exposed as '
        'disabled, and no menu is presented whatever open says', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final Events events = Events();
      final TanreiMenuController controller = newController()..open();
      await tester.pumpWidget(splitApp(controller: controller, events: events, enabled: false));
      await tester.pumpAndSettle();
      expect(find.text('Save as'), findsNothing);
      await tester.tap(find.text(save));
      await tester.tapAt(tester.getCenter(containerOf(more)));
      await tester.pumpAndSettle();
      await tab(tester);
      expect(events.log, isEmpty);
      expect(focusedName(), isNot(anyOf(save, more)));
      for (final String name in <String>[save, more]) {
        final SemanticsData data = tester.getSemantics(halfOf(name)).getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
      }
      expect(chevronTurn(tester), 0, reason: 'drawn closed');
      handle.dispose();
    });

    testWidgets('SPB-16: Escape emits close(escape) once and closes the menu through its '
        'controller, returning focus to the trailing half; an action item emits its click, then '
        'close(item)', (WidgetTester tester) async {
      final Events events = Events();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(splitApp(controller: controller, events: events));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tab(tester);
      await tab(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true', 'close escape']);
      expect(controller.isOpen, isFalse);
      expect(focusedName(), more);

      events.log.clear();
      await tester.tap(find.byWidget(tester.widget(halfOf(more))));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save all'));
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true', 'item Save all', 'close item']);
      expect(controller.isOpen, isFalse);

      // A press outside: close(outside).
      events.log.clear();
      await tester.tap(find.byWidget(tester.widget(halfOf(more))));
      await tester.pumpAndSettle();
      await tester.tapAt(const Offset(5, 590));
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true', 'close outside']);
    });

    testWidgets('SPB-15: the menu is anchored to the whole split button at bottom-end', (
      WidgetTester tester,
    ) async {
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(splitApp(controller: controller));
      controller.open();
      await tester.pumpAndSettle();
      final Rect leading = tester.getRect(containerOf(save));
      final Rect trailing = tester.getRect(containerOf(more));
      final RenderTanreiMenuPosition position = tester.allRenderObjects
          .whereType<RenderTanreiMenuPosition>()
          .toSet()
          .single;
      final Rect surface = MatrixUtils.transformRect(
        position.child!.getTransformTo(null),
        Offset.zero & position.child!.size,
      );
      expect(surface.right, moreOrLessEquals(trailing.right));
      expect(surface.top, moreOrLessEquals(leading.bottom + system.menu.surfaceOffset));
    });
  });

  group('states', () {
    testWidgets(
      'SPB-4: under the acme system each half draws hovered, focused and pressed from its '
      'own state, and the other half stays at its own',
      (WidgetTester tester) async {
        const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
        final TanreiSplitButtonVariantTokens filled = acmeSystem.splitButton.variants.filled;
        await tester.pumpWidget(splitApp(controller: newController(), theme: acme));
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(containerOf(more)));
        await tester.pumpAndSettle();
        expect(fillOf(tester, more), acme.paint(filled.hovered.containerColor));
        expect(fillOf(tester, save), acme.paint(filled.enabled.containerColor));
        await mouse.moveTo(Offset.zero);
        await tester.pumpAndSettle();
        await tab(tester);
        expect(fillOf(tester, save), acme.paint(filled.focused.containerColor));
        expect(fillOf(tester, more), acme.paint(filled.enabled.containerColor));
        final TestGesture touch = await tester.startGesture(tester.getCenter(find.text(save)));
        await tester.pump();
        expect(fillOf(tester, save), acme.paint(filled.pressed.containerColor));
        expect(fillOf(tester, more), acme.paint(filled.enabled.containerColor));
        await touch.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'SPB-5: keyboard focus shows the ring around the focused half\'s own shape at once; '
      'focus from a pointer shows none',
      (WidgetTester tester) async {
        await tester.pumpWidget(splitApp(controller: newController()));
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tab(tester);
        expect(ringOf(tester, save).visible, isTrue);
        expect(ringOf(tester, save).inside, isFalse);
        expect(ringOf(tester, save).borderRadius, decorationOf(tester, save).shape.borderRadius);
        expect(ringOf(tester, more).visible, isFalse);
        await tab(tester);
        expect(ringOf(tester, more).visible, isTrue);
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
        await tester.tap(find.text(save));
        await tester.pumpAndSettle();
        expect(ringOf(tester, save).visible, isFalse);
      },
    );

    testWidgets('SPB-6: each half\'s hit area reaches the touch target above and below and outward '
        'past its own edge, and toward the other half only to the middle of the gap', (
      WidgetTester tester,
    ) async {
      final Events events = Events();
      await tester.pumpWidget(
        splitApp(controller: newController(), events: events, size: TanreiSplitButtonSize.small),
      );
      final double target = system.measure.targetTouch;
      final Rect leading = tester.getRect(containerOf(save));
      final Rect trailing = tester.getRect(containerOf(more));
      expect(trailing.width, lessThan(target));
      final Rect box = tester.getRect(find.byType(TanreiSplitButton));
      expect(box.height, target);
      final double gap = splitTokens.containerInnerGap;
      expect(box.right - trailing.right, target - trailing.width - gap / 2);
      // Above the leading half; below the trailing half; beyond the trailing half's end.
      await tester.tapAt(Offset(leading.center.dx, box.top + 1));
      await tester.tapAt(Offset(trailing.center.dx, box.bottom - 1));
      await tester.pumpAndSettle();
      await tester.tapAt(Offset(box.right - 1, trailing.center.dy));
      await tester.pumpAndSettle();
      expect(events.log, <String>['click', 'toggle true', 'toggle false']);
      // The gap: its leading side is the leading half's, its trailing side the trailing half's.
      events.log.clear();
      await tester.tapAt(Offset(leading.right + gap / 4, leading.center.dy));
      await tester.pumpAndSettle();
      await tester.tapAt(Offset(trailing.left - gap / 4, leading.center.dy));
      await tester.pumpAndSettle();
      expect(events.log, <String>['click', 'toggle true']);
    });

    testWidgets('SPB-7: disabled, both halves draw the disabled tokens of their variant', (
      WidgetTester tester,
    ) async {
      for (final TanreiSplitButtonVariant variant in TanreiSplitButtonVariant.core) {
        await tester.pumpWidget(
          splitApp(controller: newController(), enabled: false, variant: variant),
        );
        final TanreiSplitButtonVariantStateTokens disabled = splitTokens.variants[variant].disabled;
        for (final String name in <String>[save, more]) {
          expect(
            fillOf(tester, name),
            lightTheme.paint(disabled.containerColor),
            reason: '$variant',
          );
          expect(opacityOf(tester, name), splitTokens.disabled.opacity);
        }
        expect(textStyleOf(tester, save).color, lightTheme.paint(disabled.labelColor));
      }
    });

    testWidgets('SPB-8: a variant or size the system does not have renders as the default and is '
        'reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      await tester.pumpWidget(
        splitApp(
          controller: newController(),
          variant: const TanreiSplitButtonVariant('neon'),
          size: const TanreiSplitButtonSize('huge'),
        ),
      );
      expect(
        fillOf(tester, save),
        lightTheme.paint(splitTokens.variants.filled.enabled.containerColor),
      );
      expect(tester.getSize(containerOf(save)).height, splitTokens.sizes.medium.containerHeight);
      expect(reports, contains('split-button variant "neon" -> filled'));
      expect(reports, contains('split-button size "huge" -> medium'));
    });

    testWidgets('SPB-18: a change of state animates the colors over '
        'comp.split-button.motion.state-duration, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiSplitButtonVariantTokens filled = splitTokens.variants.filled;
      final Color hovered = lightTheme.paint(filled.hovered.containerColor);
      final Color rest = lightTheme.paint(filled.enabled.containerColor);
      final Duration duration = tanreiDuration(splitTokens.motionStateDuration);
      for (final bool reduced in <bool>[false, true]) {
        await tester.pumpWidget(splitApp(controller: newController(), disableAnimations: reduced));
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await tester.pump();
        await mouse.moveTo(tester.getCenter(find.text(save)));
        await tester.pump();
        await tester.pump(duration ~/ 2);
        if (reduced) {
          expect(fillOf(tester, save), hovered);
        } else {
          expect(fillOf(tester, save), isNot(anyOf(hovered, rest)));
        }
        await tester.pump(duration);
        expect(fillOf(tester, save), hovered);
        await mouse.removePointer();
        await tester.pumpAndSettle();
      }
    });

    testWidgets('SPB-18: each half casts its variant\'s elevation outside it, unclipped', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        splitApp(controller: newController(), variant: TanreiSplitButtonVariant.elevated),
      );
      final TanreiResolvedElevation level = TanreiResolvedElevation.resolve(
        splitTokens.variants.elevated.enabled.containerElevation,
        lightTheme.colors,
      );
      expect(level.shadows, isNotEmpty);
      for (final String name in <String>[save, more]) {
        expect(decorationOf(tester, name).boxShadow, level.shadows);
      }
      expect(find.ancestor(of: containerOf(save), matching: find.byType(ClipRect)), findsNothing);
    });
  });

  group('press hold (SPB-9)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressed = lightTheme.paint(splitTokens.variants.filled.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets(
        'SPB-9: a ${kind.name} press shows the pressed state at once and keeps it for the '
        'press-hold duration',
        (WidgetTester tester) async {
          await tester.pumpWidget(splitApp(controller: newController()));
          await tester.tap(find.text(save), kind: kind);
          await tester.pump();
          expect(fillOf(tester, save), pressed);
          await tester.pump(hold - tick);
          expect(fillOf(tester, save), pressed);
          await tester.pump(tick);
          await tester.pumpAndSettle();
          expect(fillOf(tester, save), isNot(pressed));
        },
      );
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      testWidgets('SPB-9: ${key.keyLabel} shows the pressed state at once and for the press-hold '
          'duration', (WidgetTester tester) async {
        await tester.pumpWidget(splitApp(controller: newController()));
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tab(tester);
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(fillOf(tester, save), pressed);
        await tester.pump(hold - tick);
        expect(fillOf(tester, save), pressed);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(
          fillOf(tester, save),
          lightTheme.paint(splitTokens.variants.filled.focused.containerColor),
        );
      });
    }
  });

  group('choices of kind', () {
    testWidgets('SPB-10: overlay (default) fills the pressed container at once; ripple (m3-like) '
        'grows it from the point of contact; dim (cupertino) dims the half and draws no state '
        'layer', (WidgetTester tester) async {
      await tester.pumpWidget(splitApp(controller: newController()));
      TestGesture touch = await tester.startGesture(tester.getCenter(find.text(save)));
      await tester.pump();
      expect(
        fillOf(tester, save),
        lightTheme.paint(splitTokens.variants.filled.pressed.containerColor),
      );
      expect(decorationOf(tester, save).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(splitApp(controller: newController(), theme: m3));
      await tester.pumpAndSettle();
      final Rect box = tester.getRect(containerOf(save));
      const Offset contact = Offset(20, 10);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      final TanreiRipple ripple = decorationOf(tester, save).ripple!;
      expect(ripple.origin, contact);
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.splitButton.variants.filled.pressed.containerColor),
      );
      await tester.pump(tanreiDuration(m3LikeSystem.splitButton.motionFeedbackDuration) ~/ 2);
      expect(
        decorationOf(tester, save).ripple!.progress,
        moreOrLessEquals(m3LikeSystem.splitButton.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      await tester.pumpWidget(splitApp(controller: newController(), theme: cupertino));
      touch = await tester.startGesture(tester.getCenter(find.text(save)));
      await tester.pump();
      expect(opacityOf(tester, save), cupertinoSystem.splitButton.pressed.opacity);
      expect(cupertinoSystem.splitButton.pressed.opacity, lessThan(1));
      expect(
        fillOf(tester, save),
        cupertino.paint(cupertinoSystem.splitButton.variants.filled.enabled.containerColor),
      );
      expect(opacityOf(tester, more), 1, reason: 'the other half is not pressed');
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'SPB-10: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiSplitButtonVariantTokens filled = splitTokens.variants.filled;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            splitButton: splitTokens.copyWith(
              pressed: splitTokens.pressed.copyWith(opacity: 0.5),
              variants: splitTokens.variants.copyWith(
                filled: filled.copyWith(
                  pressed: filled.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          final TanreiThemeData theme = TanreiThemeData(system: of);
          await tester.pumpWidget(splitApp(controller: newController(), theme: theme));
          final Color resting = textStyleOf(tester, save).color!;
          final TestGesture touch = await tester.startGesture(tester.getCenter(find.text(save)));
          await tester.pump();
          expect(fillOf(tester, save), theme.paint(filled.enabled.containerColor));
          if (feedback == TanreiPressedFeedback.none) {
            expect(textStyleOf(tester, save).color, resting);
            expect(opacityOf(tester, save), 1);
          } else {
            expect(textStyleOf(tester, save).color, const Color(0xFF445566));
            expect(opacityOf(tester, save), 0.5);
            expect(
              decorationOf(tester, save).ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'SPB-11: the corner smoothing of the system eases each half and its focus ring; the '
      'focus style draws a ring (default) or a glow (acme)',
      (WidgetTester tester) async {
        Future<List<Paint>> strokes(TanreiSystem of) async {
          await tester.pumpWidget(
            splitApp(
              controller: newController(),
              theme: TanreiThemeData(system: of),
            ),
          );
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          await tab(tester);
          final List<Paint> found = <Paint>[];
          expect(
            find.descendant(of: halfOf(save), matching: find.byType(TanreiFocusRing)),
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
        expect(decorationOf(tester, save).shape.smoothing, 0);
        final List<Paint> glow = await strokes(acmeSystem);
        expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
        await strokes(cupertinoSystem);
        expect(decorationOf(tester, save).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      },
    );
  });

  group('layout', () {
    testWidgets('SPB-12: two halves inner-gap apart; the leading half\'s paddings and gap, the '
        'trailing half as tall as the leading one with the chevron between its paddings', (
      WidgetTester tester,
    ) async {
      for (final TanreiSplitButtonSize size in TanreiSplitButtonSize.core) {
        for (final bool withIcon in <bool>[false, true]) {
          await tester.pumpWidget(
            splitApp(
              controller: newController(),
              size: size,
              icon: withIcon ? const Text('\u{e161}') : null,
            ),
          );
          final TanreiSplitButtonSizeTokens tokens = splitTokens.sizes[size];
          final Rect leading = tester.getRect(containerOf(save));
          final Rect trailing = tester.getRect(containerOf(more));
          expect(trailing.left - leading.right, splitTokens.containerInnerGap);
          expect(leading.height, tokens.containerHeight);
          expect(trailing.height, leading.height);
          final Rect label = tester.getRect(find.text(save));
          expect(leading.right - label.right, tokens.leadingPaddingInlineEnd);
          final double start = withIcon
              ? tokens.leadingPaddingInlineStartWithIcon
              : tokens.leadingPaddingInlineStart;
          final double labelStart = withIcon
              ? start + tokens.iconSize + tokens.containerGap
              : start;
          expect(label.left - leading.left, labelStart, reason: '$size $withIcon');
          expect(trailing.width, tokens.trailingPaddingInline * 2 + tokens.iconSize);
        }
      }
    });

    testWidgets('SPB-13: the outer corners are container.shape and the join inner-shape; while '
        'open the trailing half\'s inner corners ease to inner-shape-open and the chevron turns '
        'over the open motion, at once where motion is reduced', (WidgetTester tester) async {
      final double outer = splitTokens.containerShape;
      final double inner = splitTokens.containerInnerShape;
      final double open = splitTokens.containerInnerShapeOpen;
      for (final bool reduced in <bool>[false, true]) {
        final TanreiMenuController controller = newController();
        await tester.pumpWidget(splitApp(controller: controller, disableAnimations: reduced));
        expect(
          decorationOf(tester, save).shape.radii,
          TanreiCornerRadii(topLeft: outer, topRight: inner, bottomRight: inner, bottomLeft: outer),
        );
        expect(
          decorationOf(tester, more).shape.radii,
          TanreiCornerRadii(topLeft: inner, topRight: outer, bottomRight: outer, bottomLeft: inner),
        );
        expect(chevronTurn(tester), 0);
        controller.open();
        await tester.pump();
        if (!reduced) {
          await tester.pump(tanreiDuration(splitTokens.motionOpenDuration) ~/ 4);
          expect(chevronTurn(tester), inExclusiveRange(0, 1));
        }
        await tester.pumpAndSettle();
        expect(chevronTurn(tester), moreOrLessEquals(1));
        expect(decorationOf(tester, more).shape.radii.topLeft, moreOrLessEquals(open));
        expect(decorationOf(tester, save).shape.radii.topRight, inner, reason: 'the leading half');
        controller.close();
        await tester.pumpAndSettle();
        expect(chevronTurn(tester), moreOrLessEquals(0));
      }
    });

    testWidgets('SPB-13: each half draws its outline of its size inside its own edge', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        splitApp(controller: newController(), variant: TanreiSplitButtonVariant.outlined),
      );
      for (final String name in <String>[save, more]) {
        final Border border = decorationOf(tester, name).border!;
        expect(border.top.width, splitTokens.sizes.medium.outlineWidth);
        expect(border.top.strokeAlign, BorderSide.strokeAlignInside);
        expect(
          border.top.color,
          lightTheme.paint(splitTokens.variants.outlined.enabled.outlineColor),
        );
      }
    });

    testWidgets('SPB-14: the label in the size\'s style and the half\'s label color, never '
        'truncated (it wraps when given less width), the icon and chevron at the icon size', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        splitApp(
          controller: newController(),
          label: 'Save a copy of this draft',
          icon: const Text('\u{e161}'),
          width: 180,
        ),
      );
      final TextStyle style = textStyleOf(tester, 'Save a copy of this draft');
      expect(style.fontSize, splitTokens.sizes.medium.labelTypescale.size);
      expect(style.color, lightTheme.paint(splitTokens.variants.filled.enabled.labelColor));
      final RenderParagraph paragraph = tester.renderObject(
        find.descendant(
          of: find.text('Save a copy of this draft'),
          matching: find.byType(RichText),
        ),
      );
      expect(paragraph.maxLines, isNull);
      expect(paragraph.overflow, TextOverflow.clip);
      expect(
        paragraph.size.height,
        greaterThan(splitTokens.sizes.medium.labelTypescale.lineHeight),
      );
      final Rect leading = tester.getRect(containerOf('Save a copy of this draft'));
      final Rect trailing = tester.getRect(containerOf(more));
      expect(trailing.height, leading.height, reason: 'both grow together');
      final List<TanreiControlIcon> icons = tester
          .widgetList<TanreiControlIcon>(find.byType(TanreiControlIcon))
          .toList();
      expect(icons, hasLength(2));
      expect(
        icons.map((TanreiControlIcon i) => i.size),
        everyElement(splitTokens.sizes.medium.iconSize),
      );
      expect(icons.map((TanreiControlIcon i) => i.selected), everyElement(isFalse));
      expect(tester.takeException(), isNull);
    });

    testWidgets('SPB-19: in a right-to-left layout the trailing half is on the left, the corners '
        'mirror, and the chevron is not mirrored', (WidgetTester tester) async {
      await tester.pumpWidget(
        splitApp(controller: newController(), textDirection: TextDirection.rtl),
      );
      final Rect leading = tester.getRect(containerOf(save));
      final Rect trailing = tester.getRect(containerOf(more));
      expect(trailing.right, lessThan(leading.left));
      expect(
        decorationOf(tester, save).shape.radii.topRight,
        splitTokens.containerShape,
        reason: 'the start corners are on the right',
      );
      expect(chevronTurn(tester), 0);
      expect(
        find.ancestor(of: find.text(tanreiArrowDownGlyph), matching: find.byType(Directionality)),
        findsWidgets,
      );
      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(
        splitApp(controller: newController(), textDirection: TextDirection.rtl, theme: m3),
      );
      const Offset contact = Offset(12, 8);
      final TestGesture touch = await tester.startGesture(
        tester.getRect(containerOf(save)).topLeft + contact,
      );
      await tester.pump();
      expect(decorationOf(tester, save).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('SPB-20: an empty label or menu label, and an empty menu, still render and are '
        'reported once; an empty menu still toggles and draws the open form', (
      WidgetTester tester,
    ) async {
      final List<String> names = collectMissingNames();
      final List<String> ignored = collectIgnoredValues();
      final Events events = Events();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(
        splitApp(
          controller: controller,
          events: events,
          label: '',
          menuLabel: '',
          items: const <Widget>[],
        ),
      );
      expect(names, <String>['split button', 'split button menu']);
      expect(ignored, <Matcher>[contains('no items')]);
      final Rect trailing = tester.getRect(
        find
            .byWidgetPredicate(
              (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
            )
            .last,
      );
      await tester.tapAt(trailing.center);
      await tester.pumpAndSettle();
      expect(events.log, <String>['toggle true']);
      expect(controller.isOpen, isTrue);
      expect(chevronTurn(tester), moreOrLessEquals(1));
      expect(find.byType(RenderTanreiMenuPosition), findsNothing);
      expect(names, hasLength(2));
    });
  });

  group('accessibility semantics', () {
    testWidgets('SPB-17: two buttons in reading order, each its own Tab stop, named by label and '
        'menuSemanticLabel; the trailing one says whether its menu is open; the icon and the '
        'chevron are hidden and nothing wraps the two', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final TanreiMenuController controller = newController();
      await tester.pumpWidget(splitApp(controller: controller, icon: const Text('\u{e161}')));
      List<SemanticsData> buttons() => nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .where((SemanticsData d) => d.hasFlag(SemanticsFlag.isButton))
          .toList();
      expect(buttons().map((SemanticsData d) => d.label), <String>[save, more]);
      expect(buttons().last.hasFlag(SemanticsFlag.hasExpandedState), isTrue);
      expect(buttons().last.hasFlag(SemanticsFlag.isExpanded), isFalse);
      expect(buttons().first.hasFlag(SemanticsFlag.hasExpandedState), isFalse);
      // No node holds the two halves but the ones that were there without it.
      final Iterable<String> labels = nodesBelow(
        semanticsRoot(tester),
      ).map((SemanticsNode n) => n.getSemanticsData().label).where((String l) => l.isNotEmpty);
      expect(labels, <String>[save, more]);
      // Each half's node spans its hit area.
      for (final SemanticsData d in buttons()) {
        expect(d.rect.height, greaterThanOrEqualTo(system.measure.targetTouch));
      }
      controller.open();
      await tester.pumpAndSettle();
      expect(
        buttons()
            .firstWhere((SemanticsData d) => d.label == more)
            .hasFlag(SemanticsFlag.isExpanded),
        isTrue,
      );
      handle.dispose();
    });

    testWidgets('guidelines: split button', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiSplitButtonVariant variant in TanreiSplitButtonVariant.core) {
          await tester.pumpWidget(
            splitApp(
              controller: newController(),
              variant: variant,
              theme: theme,
              size: TanreiSplitButtonSize.small,
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
    test('the tokens the widget reads: their default values', () {
      expect(splitTokens.sizes.small.containerHeight, 32);
      expect(splitTokens.sizes.medium.containerHeight, 36);
      expect(splitTokens.sizes.large.containerHeight, 40);
      expect(splitTokens.containerShape, system.shape.small);
      expect(splitTokens.containerInnerShape, system.shape.extraSmall);
      expect(splitTokens.containerInnerShapeOpen, splitTokens.containerShape);
      expect(splitTokens.containerInnerGap, system.space.space25);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets(
        '"${shipped.id}": a split button at rest draws the enabled tokens of that system',
        (WidgetTester tester) async {
          final TanreiThemeData theme = TanreiThemeData(system: shipped);
          await tester.pumpWidget(splitApp(controller: newController(), theme: theme));
          final TanreiSplitButtonTokens tokens = shipped.splitButton;
          expect(fillOf(tester, save), theme.paint(tokens.variants.filled.enabled.containerColor));
          expect(fillOf(tester, more), theme.paint(tokens.variants.filled.enabled.containerColor));
          expect(tester.getSize(containerOf(save)).height, tokens.sizes.medium.containerHeight);
          expect(decorationOf(tester, save).shape.smoothing, shipped.shape.cornerSmoothing);
        },
      );
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('split-button');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'filled-medium',
        'tonal-medium',
        'elevated-medium',
        'outlined-medium',
        'filled-small',
        'filled-large',
        'filled-icon',
        'filled-open',
        'outlined-open',
        'filled-disabled',
        'outlined-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        // SPB-20: a fixture's menu is empty, and reported.
        collectIgnoredValues();
        await expectFixtureGolden(
          tester,
          system: system,
          surface: splitGoldenSurface,
          child: fixtureSplit(fixture),
          file: 'goldens/split_button/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the open filled split button
    // shows the preset's outer, inner and open corners, the chevron turned and the fill at once.
    const String recorded = 'filled-open';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        collectIgnoredValues();
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: splitGoldenSurface,
          child: fixtureSplit(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/split_button/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
