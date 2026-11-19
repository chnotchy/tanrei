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
import 'selection_control_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiRadioButtonTokens tokens = system.radioButton;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// A group that holds one choice among [options], as a product does: `onChanged` stores it.
class Frequency extends StatefulWidget {
  const Frequency({
    super.key,
    this.initial,
    this.options = const <String>['daily', 'weekly', 'monthly'],
    this.disabled = const <String>{},
    this.changes,
    this.after = false,
  });

  final String? initial;
  final List<String> options;
  final Set<String> disabled;
  final List<String>? changes;

  /// Whether a button follows the group (somewhere for Tab to go).
  final bool after;

  @override
  State<Frequency> createState() => _FrequencyState();
}

class _FrequencyState extends State<Frequency> {
  late String? value = widget.initial;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      TanreiRadioGroup<String>(
        groupValue: value,
        semanticLabel: 'Frequency',
        onChanged: (String next) => setState(() {
          widget.changes?.add(next);
          value = next;
        }),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            for (final String option in widget.options)
              TanreiRadioButton<String>(
                key: ValueKey<String>(option),
                value: option,
                enabled: !widget.disabled.contains(option),
                label: option,
              ),
          ],
        ),
      ),
      if (widget.after)
        TanreiButton(
          key: const ValueKey<String>('after'),
          onPressed: () {},
          child: const Text('Next'),
        ),
    ],
  );
}

/// One option in a group of its own.
Widget single({
  bool selected = false,
  bool enabled = true,
  String label = 'Weekly',
  bool labelHidden = false,
  ValueChanged<String>? onChanged,
  FocusNode? focusNode,
  bool autofocus = false,
}) => TanreiRadioGroup<String>(
  groupValue: selected ? 'weekly' : null,
  onChanged: onChanged ?? (_) {},
  child: TanreiRadioButton<String>(
    value: 'weekly',
    enabled: enabled,
    label: label,
    labelHidden: labelHidden,
    focusNode: focusNode,
    autofocus: autofocus,
  ),
);

/// The option of a spec fixture's [props], in its group.
Widget radioOf(Map<String, dynamic> props) => TanreiRadioGroup<String>(
  groupValue: props['selected'] == true ? props['value'] as String : null,
  onChanged: (_) {},
  child: TanreiRadioButton<String>(
    value: props['value'] as String,
    enabled: props['disabled'] != true,
    label: props['label'] as String? ?? '',
    labelHidden: props['labelHidden'] == true,
  ),
);

TanreiRadioButtonPainter ring(WidgetTester tester, [Finder? within]) => within == null
    ? painterOf<TanreiRadioButtonPainter>(tester)
    : tester
              .widget<CustomPaint>(
                find.descendant(
                  of: within,
                  matching: find.byWidgetPredicate(
                    (Widget w) => w is CustomPaint && w.painter is TanreiRadioButtonPainter,
                  ),
                ),
              )
              .painter!
          as TanreiRadioButtonPainter;

Finder get ringFinder =>
    find.byWidgetPredicate((Widget w) => w is CustomPaint && w.painter is TanreiRadioButtonPainter);

Finder option(String value) => find.byKey(ValueKey<String>(value));

FocusNode focusOf(WidgetTester tester, String value) => Focus.of(
  tester.element(find.descendant(of: option(value), matching: find.byType(TanreiStateLayer))),
);

bool selectedIn(WidgetTester tester, String value) => ring(tester, option(value)).dotScale == 1;

void expectParts(
  WidgetTester tester,
  TanreiThemeData theme,
  TanreiRadioButtonConditionStateTokens state, {
  String? reason,
}) {
  expect(ring(tester).ring, theme.paint(state.ringColor), reason: reason);
  expect(ring(tester).dot, theme.paint(state.dotColor), reason: reason);
  if (visibleLabel(TanreiRadioButton<String>).evaluate().isNotEmpty) {
    expect(
      labelStyle(tester, TanreiRadioButton<String>).color,
      theme.paint(state.labelColor),
      reason: reason,
    );
  }
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('RAD-1: a ${kind.name} tap selects an unselected option and emits change once '
          'with its value', (WidgetTester tester) async {
        final List<String> changes = <String>[];
        await tester.pumpWidget(tanreiTestApp(Frequency(changes: changes)));
        await tester.tap(option('weekly'), kind: kind);
        await tester.pumpAndSettle();
        expect(changes, <String>['weekly']);
        expect(selectedIn(tester, 'weekly'), isTrue);
      });
    }

    testWidgets('RAD-1: a press on the label, Space, and the semantic tap select it', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> changes = <String>[];
      await tester.pumpWidget(tanreiTestApp(Frequency(changes: changes)));
      await tester.tap(find.text('monthly'));
      await tester.pumpAndSettle();
      expect(changes, <String>['monthly']);
      tester.semantics.tap(find.semantics.byLabel('daily'));
      await tester.pumpAndSettle();
      expect(changes, <String>['monthly', 'daily']);
      focusOf(tester, 'weekly').requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(changes, <String>['monthly', 'daily', 'weekly']);
      handle.dispose();
    });

    testWidgets('RAD-1: Enter selects it on Android only', (WidgetTester tester) async {
      for (final TargetPlatform platform in <TargetPlatform>[
        TargetPlatform.android,
        TargetPlatform.iOS,
        TargetPlatform.macOS,
      ]) {
        await onPlatform(platform, () async {
          final List<String> changes = <String>[];
          await tester.pumpWidget(tanreiTestApp(Frequency(key: UniqueKey(), changes: changes)));
          focusOf(tester, 'weekly').requestFocus();
          await tester.pump();
          await tester.sendKeyEvent(LogicalKeyboardKey.enter);
          await tester.pumpAndSettle();
          expect(
            changes,
            platform == TargetPlatform.android ? <String>['weekly'] : isEmpty,
            reason: platform.name,
          );
        });
      }
    });

    testWidgets('RAD-2: activating the selected option keeps it selected and emits nothing', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> changes = <String>[];
      await tester.pumpWidget(tanreiTestApp(Frequency(initial: 'weekly', changes: changes)));
      await tester.tap(option('weekly'));
      await tester.pumpAndSettle();
      tester.semantics.tap(find.semantics.byLabel('weekly'));
      focusOf(tester, 'weekly').requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      expect(selectedIn(tester, 'weekly'), isTrue);
      handle.dispose();
    });

    testWidgets(
      'RAD-3: selecting an option unselects the others, and only the selected one emits',
      (WidgetTester tester) async {
        final List<String> changes = <String>[];
        await tester.pumpWidget(tanreiTestApp(Frequency(initial: 'daily', changes: changes)));
        expect(selectedIn(tester, 'daily'), isTrue);
        await tester.tap(option('monthly'));
        await tester.pumpAndSettle();
        expect(changes, <String>['monthly']);
        expect(
          <bool>[
            selectedIn(tester, 'daily'),
            selectedIn(tester, 'weekly'),
            selectedIn(tester, 'monthly'),
          ],
          <bool>[false, false, true],
        );
      },
    );
  });

  group('the group', () {
    testWidgets('RAD-4: Down and Right move focus to the next enabled option and select it, Up and '
        'Left to the previous one, wrapping and skipping disabled options', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Frequency(
            initial: 'daily',
            options: const <String>['daily', 'weekly', 'monthly', 'yearly'],
            disabled: const <String>{'monthly'},
            changes: changes,
          ),
        ),
      );
      focusOf(tester, 'daily').requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(focusOf(tester, 'weekly').hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      // monthly is disabled: skipped.
      expect(focusOf(tester, 'yearly').hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      // Wraps to the first.
      expect(focusOf(tester, 'daily').hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.pumpAndSettle();
      expect(focusOf(tester, 'yearly').hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(focusOf(tester, 'weekly').hasPrimaryFocus, isTrue);
      expect(changes, <String>['weekly', 'yearly', 'daily', 'yearly', 'weekly']);
      expect(selectedIn(tester, 'weekly'), isTrue);
    });

    testWidgets('RAD-4: in a right-to-left layout Right moves to the previous option and Left to '
        'the next', (WidgetTester tester) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          Directionality(
            textDirection: TextDirection.rtl,
            child: Frequency(initial: 'weekly', changes: changes),
          ),
        ),
      );
      focusOf(tester, 'weekly').requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
      expect(changes, <String>['daily']);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pumpAndSettle();
      expect(changes, <String>['daily', 'weekly']);
      // Up and Down do not depend on the direction.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(changes, <String>['daily', 'weekly', 'monthly']);
    });

    testWidgets('RAD-4: arrow keys pressed while no option has focus are not the group\'s', (
      WidgetTester tester,
    ) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(tanreiTestApp(Frequency(changes: changes, after: true)));
      Focus.of(tester.element(find.text('Next'))).requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
    });

    testWidgets('RAD-5: the group is one Tab stop — the selected option — and Tab leaves it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(const Frequency(initial: 'monthly', after: true)));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusOf(tester, 'monthly').hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(Focus.of(tester.element(find.text('Next'))).hasPrimaryFocus, isTrue);
      // Shift+Tab back into the group lands on the selected option again.
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pump();
      expect(focusOf(tester, 'monthly').hasPrimaryFocus, isTrue);
      expect(focusOf(tester, 'daily').skipTraversal, isTrue);
      expect(focusOf(tester, 'weekly').skipTraversal, isTrue);
      expect(focusOf(tester, 'monthly').skipTraversal, isFalse);
    });

    testWidgets(
      'RAD-5: with none selected the Tab stop is the first enabled option, and it follows '
      'the selection',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(const Frequency(disabled: <String>{'daily'}, after: true)),
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(focusOf(tester, 'weekly').hasPrimaryFocus, isTrue);
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
        await tester.pumpAndSettle();
        expect(focusOf(tester, 'monthly').hasPrimaryFocus, isTrue);
        expect(focusOf(tester, 'monthly').skipTraversal, isFalse);
        expect(focusOf(tester, 'weekly').skipTraversal, isTrue);
      },
    );
  });

  group('disabled', () {
    testWidgets('RAD-6: a disabled option does not change or emit, is not focusable, ignores its '
        'label and is exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> changes = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(Frequency(disabled: const <String>{'weekly'}, changes: changes)),
      );
      await tester.tap(option('weekly'));
      await tester.tap(find.text('weekly'));
      await tester.pumpAndSettle();
      expect(changes, isEmpty);
      final FocusNode node = focusOf(tester, 'weekly');
      node.requestFocus();
      await tester.pump();
      expect(node.hasFocus, isFalse);
      expect(
        tester.getSemantics(
          find.descendant(of: option('weekly'), matching: find.byType(TanreiTapTarget)),
        ),
        matchesSemantics(
          label: 'weekly',
          hasCheckedState: true,
          isInMutuallyExclusiveGroup: true,
          hasEnabledState: true,
          isEnabled: false,
          isFocusable: false,
        ),
      );
      handle.dispose();
    });

    for (final bool selected in <bool>[false, true]) {
      testWidgets('RAD-10: disabled ${selected ? 'selected' : 'unselected'} draws container, ring, '
          'dot, label and opacity from its disabled tokens', (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(single(selected: selected, enabled: false)));
        final TanreiRadioButtonConditionStateTokens disabled =
            (selected ? tokens.conditions.selected : tokens.conditions.unselected).disabled;
        expectParts(tester, lightTheme, disabled);
        expect(stateLayerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(stateLayerColor(tester).a, 0, reason: 'the round layer stays clear');
        expect(selectionOpacity(tester, TanreiRadioButton<String>), tokens.disabled.opacity);
        final Color faded = light.onSurface.withValues(alpha: system.state.disabledContentOpacity);
        expect(ring(tester).ring, isSameColorAs(faded));
        expect(
          ring(tester).dot,
          selected ? isSameColorAs(faded) : isSameColorAs(const Color(0x00000000)),
        );
      });
    }
  });

  group('interaction states', () {
    testWidgets('RAD-7: the drawn tokens are those of the highest-precedence state, pressed > '
        'focused > hovered (acme values each differently)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiRadioButtonConditionTokens selected = acmeSystem.radioButton.conditions.selected;
      final Color hovered = theme.paint(selected.hovered.containerColor);
      final Color focused = theme.paint(selected.focused.containerColor);
      final Color pressed = theme.paint(selected.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(single(selected: true, focusNode: focusNode), theme: theme),
      );
      final TestGesture mouse = await hoverOver(tester, find.byType(TanreiStateLayer));
      expect(stateLayerColor(tester), hovered);
      expectParts(tester, theme, selected.hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
      await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pump();
      expect(stateLayerColor(tester), pressed);
      expectParts(tester, theme, selected.pressed);
      await mouse.up();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
    });

    testWidgets('RAD-7: the default mixes the ring color into the round layer; pointer focus does '
        'not select the focused state', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(single()));
      await hoverOver(tester, find.byType(TanreiStateLayer));
      expect(
        stateLayerColor(tester),
        isSameColorAs(light.outline.withValues(alpha: system.state.hoverStateLayerOpacity)),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(single(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(focusRingShown(tester), isFalse);
    });

    testWidgets('RAD-8: keyboard focus shows the focus ring around the ring, at once', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(single()));
      expect(focusRingShown(tester), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusRingShown(tester), isTrue);
      final TanreiFocusRing focusRing = tester.widget(find.byType(TanreiFocusRing));
      expect(focusRing.borderRadius, BorderRadius.circular(tokens.ringSize / 2));
      expect(tester.getSize(find.byType(TanreiFocusRing)), Size.square(tokens.ringSize));
    });

    testWidgets('RAD-9: the hit area reaches sys.target.touch on both axes, the label included, '
        'without changing the visual size', (WidgetTester tester) async {
      final List<String> changes = <String>[];
      await tester.pumpWidget(tanreiTestApp(single(labelHidden: true, onChanged: changes.add)));
      expect(tester.getSize(find.byType(TanreiStateLayer)), Size.square(tokens.containerSize));
      expect(tester.getSize(ringFinder), Size.square(tokens.ringSize));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.size, Size.square(system.measure.targetTouch));
      await tester.tapAt(target.bottomRight - const Offset(1, 1));
      await tester.pumpAndSettle();
      expect(changes, <String>['weekly']);
      changes.clear();
      await tester.pumpWidget(tanreiTestApp(single(onChanged: changes.add)));
      await tester.tapAt(tester.getRect(find.text('Weekly')).centerRight - const Offset(1, 0));
      await tester.pumpAndSettle();
      expect(changes, <String>['weekly']);
    });
  });

  group('press', () {
    const Duration tick = Duration(milliseconds: 1);

    testWidgets('RAD-11: a press shows the pressed state at once and keeps it for the press-hold '
        'duration — by touch and by Space', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      // Under acme focused and pressed differ, so the end of the press is visible.
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiRadioButtonConditionTokens unselected =
          acmeSystem.radioButton.conditions.unselected;
      final Color pressed = theme.paint(unselected.pressed.containerColor);
      final Duration hold = Duration(milliseconds: acmeSystem.motion.duration.pressHold);
      await tester.pumpWidget(tanreiTestApp(single(autofocus: true), theme: theme));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(TanreiStateLayer));
      await tester.pump();
      // The group here keeps no value, so the option stays unselected: the unselected pressed layer.
      expect(stateLayerColor(tester), pressed);
      await tester.pump(hold - tick);
      expect(stateLayerColor(tester), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), isNot(pressed));
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(stateLayerColor(tester), pressed);
      await tester.pump(hold - tick);
      expect(stateLayerColor(tester), pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), theme.paint(unselected.focused.containerColor));
    });

    testWidgets('RAD-12: overlay by default; ripple under m3-like from the point of contact; dim '
        'under cupertino with no state layer', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(single()));
      TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiStateLayer)),
      );
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple, isNull);
      expect(
        stateLayerColor(tester),
        lightTheme.paint(tokens.conditions.unselected.pressed.containerColor),
      );
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(tanreiTestApp(single(), theme: m3));
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      touch = await tester.startGesture(layer.topLeft + const Offset(10, 12));
      await tester.pump();
      final TanreiRipple ripple = stateLayerDecoration(tester).ripple!;
      expect(ripple.origin, const Offset(10, 12));
      expect(
        ripple.color,
        m3.paint(m3LikeSystem.radioButton.conditions.unselected.pressed.containerColor),
      );
      await tester.pump(Duration(milliseconds: m3LikeSystem.radioButton.motionFeedbackDuration));
      expect(stateLayerDecoration(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pumpAndSettle();
      expect(stateLayerDecoration(tester).ripple, isNull);

      await tester.pumpWidget(
        tanreiTestApp(single(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      touch = await tester.startGesture(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pump();
      expect(
        selectionOpacity(tester, TanreiRadioButton<String>),
        cupertinoSystem.radioButton.pressed.opacity,
      );
      expect(stateLayerColor(tester).a, 0);
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'RAD-12: under ${feedback.name} only the container color stays with the state '
        'under the press${feedback == TanreiPressedFeedback.none ? ', and every other part too' : ''}',
        (WidgetTester tester) async {
          final TanreiRadioButtonConditionTokens unselected = tokens.conditions.unselected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            radioButton: tokens.copyWith(
              pressed: tokens.pressed.copyWith(opacity: 0.5),
              conditions: tokens.conditions.copyWith(
                unselected: unselected.copyWith(
                  pressed: unselected.pressed.copyWith(
                    ringColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(tanreiTestApp(single(), theme: TanreiThemeData(system: of)));
          final TestGesture mouse = await hoverOver(tester, find.byType(TanreiStateLayer));
          final Color hoveredLayer = stateLayerColor(tester);
          final Color hoveredRing = ring(tester).ring;
          await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
          await tester.pump();
          expect(stateLayerColor(tester), hoveredLayer);
          if (feedback == TanreiPressedFeedback.none) {
            expect(ring(tester).ring, hoveredRing);
            expect(selectionOpacity(tester, TanreiRadioButton<String>), 1);
          } else {
            expect(ring(tester).ring, const Color(0xFF445566));
            expect(selectionOpacity(tester, TanreiRadioButton<String>), 0.5);
          }
          await mouse.up();
          await tester.pumpAndSettle();
        },
      );
    }
  });

  group('shape and drawing', () {
    testWidgets('RAD-13: the round layer takes the system\'s corner smoothing (still round); the '
        'focus style is a ring by default and a glow under acme', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(single(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      expect(stateLayer(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      // A product that gives the layer a corner below full sees the smoothing.
      final TanreiSystem squarish = cupertinoSystem.copyWith(
        radioButton: cupertinoSystem.radioButton.copyWith(containerShape: 6),
      );
      await tester.pumpWidget(tanreiTestApp(single(), theme: TanreiThemeData(system: squarish)));
      expect(stateLayer(tester).shape, const TanreiCornerShape(smoothing: 0.6, radius: 6));

      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(
          tanreiTestApp(single(autofocus: true), theme: TanreiThemeData(system: of)),
        );
        await tester.pump();
        final List<Paint> found = <Paint>[];
        expect(
          find.byType(TanreiFocusRing),
          paints..everything((Symbol method, List<dynamic> arguments) {
            if (method == #drawRRect && (arguments[1] as Paint).style == PaintingStyle.stroke) {
              found.add(arguments[1] as Paint);
            }
            return true;
          }),
        );
        return found;
      }

      expect((await strokes(system)).every((Paint p) => p.maskFilter == null), isTrue);
      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow, isNotEmpty);
      expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
    });

    testWidgets(
      'RAD-14: a ring of ring.size stroked at ring.width inside its diameter, centered in '
      'the round layer, and a dot of dot.size only while selected',
      (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(single(selected: true, labelHidden: true)));
        final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
        final Rect ringRect = tester.getRect(ringFinder);
        expect(ringRect.size, Size.square(tokens.ringSize));
        expect(ringRect.center, layer.center);
        final Offset center = Size.square(tokens.ringSize).center(Offset.zero);
        expect(
          ringFinder,
          paints
            ..circle(
              x: center.dx,
              y: center.dy,
              radius: tokens.ringSize / 2 - tokens.ringWidth / 2,
              strokeWidth: tokens.ringWidth,
              style: PaintingStyle.stroke,
              color: light.primary,
            )
            ..circle(
              x: center.dx,
              y: center.dy,
              radius: tokens.dotSize / 2,
              style: PaintingStyle.fill,
              color: light.primary,
            ),
        );
        await tester.pumpWidget(tanreiTestApp(single(labelHidden: true)));
        await tester.pumpAndSettle();
        expect(ringFinder, paints..circle(color: light.outline));
        expect(
          ringFinder,
          isNot(
            paints
              ..circle()
              ..circle(),
          ),
        );
      },
    );

    testWidgets('RAD-15: the dot grows from the center over the selection motion and shrinks back; '
        'at once where motion is reduced', (WidgetTester tester) async {
      final Duration duration = Duration(milliseconds: tokens.motionSelectionDuration);
      final Curve curve = tokens.motionSelectionEasing.toCurve();
      await tester.pumpWidget(tanreiTestApp(const Frequency(initial: 'daily')));
      await tester.tap(option('weekly'));
      await tester.pump();
      await tester.pump(duration ~/ 2);
      expect(
        ring(tester, option('weekly')).dotScale,
        moreOrLessEquals(curve.transform(0.5), epsilon: 1e-3),
      );
      expect(
        ring(tester, option('daily')).dotScale,
        moreOrLessEquals(1 - curve.transform(0.5), epsilon: 1e-3),
      );
      await tester.pumpAndSettle();
      expect(ring(tester, option('weekly')).dotScale, 1);
      expect(ring(tester, option('daily')).dotScale, 0);

      await tester.pumpWidget(
        tanreiTestApp(Frequency(key: UniqueKey(), initial: 'daily'), disableAnimations: true),
      );
      await tester.tap(option('weekly'));
      await tester.pump();
      expect(ring(tester, option('weekly')).dotScale, 1);
      expect(ring(tester, option('daily')).dotScale, 0);
    });
  });

  group('semantics', () {
    testWidgets(
      'RAD-16: each option is a radio, checked or not, in a mutually exclusive group; the '
      'group is a radio group named by the product',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(tanreiTestApp(const Frequency(initial: 'weekly')));
        for (final String value in <String>['daily', 'weekly', 'monthly']) {
          final SemanticsData data = tester
              .getSemantics(
                find.descendant(of: option(value), matching: find.byType(TanreiTapTarget)),
              )
              .getSemanticsData();
          expect(data.label, value);
          expect(data.hasFlag(SemanticsFlag.hasCheckedState), isTrue);
          expect(data.hasFlag(SemanticsFlag.isChecked), value == 'weekly');
          expect(data.hasFlag(SemanticsFlag.isInMutuallyExclusiveGroup), isTrue);
          expect(data.hasFlag(SemanticsFlag.hasToggledState), isFalse);
        }
        final SemanticsNode group = tester.getSemantics(
          find.byWidgetPredicate(
            (Widget w) => w is Semantics && w.properties.role == SemanticsRole.radioGroup,
          ),
        );
        expect(group.getSemanticsData().role, SemanticsRole.radioGroup);
        expect(group.label, 'Frequency');
        int children = 0;
        group.visitChildren((SemanticsNode child) {
          children++;
          return true;
        });
        expect(children, greaterThanOrEqualTo(1));
        handle.dispose();
      },
    );

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: tap targets, labeled targets and text contrast '
          '(${theme.brightness.name})', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(tanreiTestApp(const Frequency(initial: 'weekly'), theme: theme));
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
        handle.dispose();
      });
    }

    test('non-text contrast: the unselected and selected rings meet 3:1 against the surface in '
        'every scheme', () {
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
          for (final TanreiRadioButtonCondition condition in TanreiRadioButtonCondition.core) {
            final Color edge = theme.paint(tokens.conditions[condition].enabled.ringColor);
            expect(
              contrastOf(Color.alphaBlend(edge, theme.colors.surface), theme.colors.surface),
              greaterThanOrEqualTo(3),
              reason: '${condition.name} ${brightness.name} ${contrast.name}',
            );
          }
        }
      }
    });

    test('an unknown condition key resolves to the default and is reported; the option only ever '
        'selects core conditions', () {
      final List<String> reports = collectUnknownValues();
      const TanreiRadioButtonCondition unknown = TanreiRadioButtonCondition('chosen');
      expect(identical(tokens.conditions[unknown], tokens.conditions.unselected), isTrue);
      expect(reports, <String>['radio-button condition "chosen" -> unselected']);
    });
  });

  group('label', () {
    testWidgets('RAD-17: the label sits label.gap after the round layer in label.typescale, wraps, '
        'and a right-to-left layout mirrors the order', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(single()));
      expect(
        tester.getRect(find.text('Weekly')).left -
            tester.getRect(find.byType(TanreiStateLayer)).right,
        tokens.labelGap,
      );
      expect(labelStyle(tester, TanreiRadioButton<String>).fontSize, tokens.labelTypescale.size);
      await tester.pumpWidget(
        tanreiTestApp(Directionality(textDirection: TextDirection.rtl, child: single())),
      );
      expect(
        tester.getRect(find.byType(TanreiStateLayer)).left -
            tester.getRect(find.text('Weekly')).right,
        tokens.labelGap,
      );
      await tester.pumpWidget(
        tanreiTestApp(SizedBox(width: 100, child: single(label: 'Every other week, on Mondays'))),
      );
      expect(
        tester.getSize(find.text('Every other week, on Mondays')).height,
        greaterThan(tokens.labelTypescale.lineHeight),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('RAD-18: labelHidden draws no label and keeps the name; an empty label renders and '
        'is reported once', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(single(labelHidden: true)));
      expect(find.byType(Text), findsNothing);
      expect(semanticsOfTarget(tester).label, 'Weekly');
      handle.dispose();
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(single(label: '')));
      expect(find.byType(TanreiStateLayer), findsOneWidget);
      await tester.pumpWidget(tanreiTestApp(single(label: '', selected: true)));
      expect(reports, <String>['radio-button']);
    });
  });

  group('a design system drives rendering', () {
    for (final TanreiSystem of in shippedSystems) {
      testWidgets('"${of.id}": both conditions at rest draw that system\'s tokens and sizes', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: of);
        for (final bool selected in <bool>[false, true]) {
          await tester.pumpWidget(tanreiTestApp(single(selected: selected), theme: theme));
          await tester.pumpAndSettle();
          expectParts(
            tester,
            theme,
            (selected ? of.radioButton.conditions.selected : of.radioButton.conditions.unselected)
                .enabled,
          );
          expect(tester.getSize(ringFinder), Size.square(of.radioButton.ringSize));
          expect(ring(tester).ringWidth, of.radioButton.ringWidth);
          expect(ring(tester).dotSize, of.radioButton.dotSize);
          expect(
            tester.getSize(find.byType(TanreiStateLayer)),
            Size.square(of.radioButton.containerSize),
          );
        }
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('radio-button');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'unselected',
        'selected',
        'disabled-unselected',
        'disabled-selected',
        'label-hidden',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: radioOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/radio_button/$id.png',
          surface: labelledGoldenSurface,
        );
      });
    }

    // One representative fixture per shipped preset: the selected option shows the ring, its
    // width, the dot and the label style at once.
    const String recorded = 'selected';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: radioOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/radio_button/${preset.id}/$recorded.png',
          surface: labelledGoldenSurface,
        );
      });
    }
  });

  group('motion and alignment', () {
    testWidgets('RAD-7: a part the interaction states recolor changes over the state motion, and '
        'pressed at once; only a change of condition uses the selection motion', (
      WidgetTester tester,
    ) async {
      const Color hoveredRing = Color(0xFF3366CC);
      const Color pressedRing = Color(0xFFCC3366);
      final TanreiRadioButtonConditionTokens unselected = tokens.conditions.unselected;
      final TanreiSystem product = system.copyWith(
        radioButton: tokens.copyWith(
          conditions: tokens.conditions.copyWith(
            unselected: unselected.copyWith(
              hovered: unselected.hovered.copyWith(
                ringColor: const TanreiPaint.literal(hoveredRing),
              ),
              pressed: unselected.pressed.copyWith(
                ringColor: const TanreiPaint.literal(pressedRing),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(tanreiTestApp(single(), theme: TanreiThemeData(system: product)));
      final Color rest = ring(tester).ring;
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pump();
      final Duration state = Duration(milliseconds: tokens.motionStateDuration);
      await tester.pump(state ~/ 3);
      final double t = tokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(ring(tester).ring, isSameColorAs(tanreiLerpColor(rest, hoveredRing, t)));
      await tester.pump(state);
      expect(ring(tester).ring, hoveredRing);
      await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pump();
      expect(ring(tester).ring, pressedRing, reason: 'pressed applies at once');
      await mouse.up();
      await tester.pumpAndSettle();
    });

    testWidgets('RAD-12: a press on the label, outside the round container, grows the ripple from '
        'the container\'s center', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(single(), theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Weekly')));
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.origin, isNull, reason: 'null: the center');
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final double scale in <double>[1, 2]) {
      testWidgets('RAD-17: the control is centered on the first line of a wrapping label '
          '(text scale $scale)', (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: SizedBox(width: 160, child: single(label: 'Every other week, on Mondays')),
            ),
          ),
        );
        final Rect label = tester.getRect(find.text('Every other week, on Mondays'));
        final double line = tokens.labelTypescale.lineHeight * scale;
        expect(label.height, greaterThan(line), reason: 'the label wraps');
        expect(
          tester.getCenter(find.byType(TanreiStateLayer)).dy,
          moreOrLessEquals(label.top + line / 2, epsilon: 0.01),
        );
        expect(tester.takeException(), isNull);
      });
    }
  });
}
