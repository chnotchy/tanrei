import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';

/// The smallest component on the shared pressable: its visuals are one number (the container
/// radius of the drawn state), so the mixin is exercised with a visuals type of its own.
class _Probe extends StatefulWidget {
  const _Probe({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  State<_Probe> createState() => _ProbeState();
}

/// What the probe drew in its last build.
final List<String> _log = <String>[];

class _ProbeState extends State<_Probe>
    with TickerProviderStateMixin<_Probe>, TanreiPressableStateMixin<_Probe, double> {
  TanreiButtonTokens get _tokens => TanreiTheme.of(context).system.button;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  double lerpVisuals(double a, double b, double t) => a + (b - a) * t;

  @override
  Widget build(BuildContext context) {
    final double radius = animateVisuals(
      _tokens.stateTokens(drawnState)?.containerShape ?? _tokens.containerShape,
    );
    _log.add('$interactionState drawn=$drawnState container=$containerState radius=$radius');
    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      child: TanreiTapTarget(
        child: buildPressable(
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            child: SizedBox(key: pressContainerKey, width: 80, height: 40),
          ),
        ),
      ),
    );
  }
}

TanreiThemeData _feedback(TanreiPressedFeedback feedback) => TanreiThemeData(
  system: tanreiSystem.copyWith(
    behavior: tanreiSystem.behavior.copyWith(pressedFeedback: feedback),
  ),
);

void main() {
  setUp(_log.clear);

  group('TanreiPressableStateMixin (shared by every pressable component)', () {
    testWidgets('a tap activates once; Enter and Space activate once each', (
      WidgetTester tester,
    ) async {
      int presses = 0;
      await tester.pumpWidget(tanreiTestApp(_Probe(onPressed: () => presses++)));
      await tester.tap(find.byType(_Probe));
      await tester.pump(const Duration(milliseconds: 500));
      expect(presses, 1);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      addTearDown(() => FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(_log.last, startsWith('TanreiInteractionState.focused'));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump(const Duration(milliseconds: 500));
      expect(presses, 3);
    });

    testWidgets('a press shows at once and is held for motion.duration.pressHold (BTN-8)', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(_Probe(onPressed: () {})));
      await tester.tap(find.byType(_Probe));
      await tester.pump();
      expect(_log.last, startsWith('TanreiInteractionState.pressed'));
      final int hold = tanreiSystem.motion.duration.pressHold.round();
      await tester.pump(Duration(milliseconds: hold - 1));
      expect(_log.last, startsWith('TanreiInteractionState.pressed'));
      await tester.pump(const Duration(milliseconds: 1));
      expect(_log.last, startsWith('TanreiInteractionState.enabled'));
      await tester.pumpAndSettle();
    });

    for (final (TanreiPressedFeedback feedback, String drawn, String container)
        in <(TanreiPressedFeedback, String, String)>[
          (TanreiPressedFeedback.overlay, 'pressed', 'pressed'),
          (TanreiPressedFeedback.ripple, 'pressed', 'enabled'),
          (TanreiPressedFeedback.dim, 'pressed', 'enabled'),
          (TanreiPressedFeedback.none, 'enabled', 'enabled'),
        ]) {
      testWidgets('under pressedFeedback ${feedback.name} a press draws the $drawn tokens with the '
          '$container container (BTN-9)', (WidgetTester tester) async {
        final TestGesture gesture = await tester.startGesture(Offset.zero);
        await tester.pumpWidget(
          tanreiTestApp(_Probe(onPressed: () {}), theme: _feedback(feedback)),
        );
        await gesture.moveTo(tester.getCenter(find.byType(_Probe)));
        await gesture.up();
        await gesture.down(tester.getCenter(find.byType(_Probe)));
        await tester.pump();
        final TanreiButtonTokens button = tanreiSystem.button;
        final double radius =
            button.stateTokens(TanreiInteractionState.values.byName(drawn))?.containerShape ??
            button.containerShape;
        expect(
          _log.last,
          'TanreiInteractionState.pressed drawn=TanreiInteractionState.$drawn '
          'container=TanreiInteractionState.$container radius=$radius',
        );
        await gesture.up();
        await tester.pumpAndSettle(const Duration(milliseconds: 500));
      });
    }

    testWidgets('a state change eases from what was drawn; entering pressed does not', (
      WidgetTester tester,
    ) async {
      final TanreiButtonTokens button = tanreiSystem.button;
      final double resting = button.containerShape;
      final double pressed = resting + 12;
      // A system whose press morphs the shape, so the transition has something to ease.
      final TanreiThemeData theme = TanreiThemeData(
        system: tanreiSystem.copyWith(
          button: button.copyWith(pressed: button.pressed.copyWith(containerShape: pressed)),
        ),
      );
      await tester.pumpWidget(tanreiTestApp(_Probe(onPressed: () {}), theme: theme));
      await tester.tap(find.byType(_Probe));
      await tester.pump();
      expect(_log.last, endsWith('radius=$pressed'));
      await tester.pump(Duration(milliseconds: tanreiSystem.motion.duration.pressHold.round()));
      await tester.pump(
        Duration(milliseconds: tanreiDuration(button.motionStateDuration).inMilliseconds ~/ 2),
      );
      final double between = double.parse(_log.last.split('radius=').last);
      expect(between, allOf(greaterThan(resting), lessThan(pressed)));
      await tester.pumpAndSettle();
      expect(_log.last, endsWith('radius=$resting'));
    });

    testWidgets('a null onPressed is the disabled state; disabling ends a press', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(_Probe(onPressed: () {})));
      final TestGesture gesture = await tester.startGesture(tester.getCenter(find.byType(_Probe)));
      await tester.pump();
      expect(_log.last, startsWith('TanreiInteractionState.pressed'));
      await tester.pumpWidget(tanreiTestApp(const _Probe(onPressed: null)));
      await tester.pump(const Duration(milliseconds: 500));
      expect(_log.last, startsWith('TanreiInteractionState.disabled'));
      await gesture.up();
      await tester.pumpAndSettle();
    });
  });
}
