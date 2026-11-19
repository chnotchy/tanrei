import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
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
final TanreiSnackbarTokens snackTokens = system.snackbar;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every snackbar fixture: 400 wide, inside the `space200` padding of
/// every baseline, tall enough for `action-own-row`, whose message the test font's square glyphs
/// wrap onto four lines.
const Size snackbarGoldenSurface = Size(432, 232);

Duration ms(int value) => Duration(milliseconds: value);

/// The fixture's snackbar, drawn in place (SNK-19) on a 400-wide stage.
Widget fixtureSnackbar(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox(
    width: 400,
    child: Center(
      child: TanreiSnackbar(
        message: props['message'] as String? ?? '',
        actionLabel: props['action'] as String? ?? '',
        showCloseIcon: props['closable'] == true,
        closeIconLabel: props['closeLabel'] as String? ?? '',
        duration: TanreiSnackbarDuration.fromName(props['duration'] as String? ?? 'auto'),
      ),
    ),
  );
}

/// Collects what the snackbar reports as ignored (SNK-20), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

final GlobalKey<TanreiSnackbarMessengerState> messengerKey =
    GlobalKey<TanreiSnackbarMessengerState>();

/// A 800 x 600 app whose page is a messenger over [page].
Widget hostApp({
  Widget page = const SizedBox.expand(),
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  MediaQueryData Function(MediaQueryData)? media,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) {
      final MediaQueryData data = MediaQuery.of(context);
      return MediaQuery(
        data: media?.call(data) ?? data,
        child: Directionality(
          textDirection: textDirection,
          child: SizedBox.expand(
            child: TanreiSnackbarMessenger(key: messengerKey, child: page),
          ),
        ),
      );
    },
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

TanreiSnackbarMessengerState messenger() => messengerKey.currentState!;

/// Shows a snackbar and settles its entrance.
Future<TanreiSnackbarController> showSettled(WidgetTester tester, TanreiSnackbar snackbar) async {
  final TanreiSnackbarController controller = messenger().show(snackbar);
  await tester.pump();
  await tester.pump(ms(snackTokens.motionEnterDuration));
  return controller;
}

Finder barOf(String message) => find
    .ancestor(
      of: find.text(message),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration barDecoration(WidgetTester tester, String message) =>
    tester.widget<DecoratedBox>(barOf(message)).decoration as TanreiContainerDecoration;

Finder controlOf(String label) => find
    .ancestor(
      of: find.byWidgetPredicate(
        (Widget w) =>
            (w is Text && w.data == label) ||
            (w is Semantics && w.properties.label == label && w.properties.button == true),
      ),
      matching: find.byType(TanreiControlContainer),
    )
    .first;

Finder closeButton() => find
    .ancestor(of: find.byType(TanreiControlIcon), matching: find.byType(TanreiControlContainer))
    .first;

TanreiContainerDecoration controlDecoration(WidgetTester tester, Finder control) =>
    tester
            .widget<DecoratedBox>(
              find.descendant(of: control, matching: find.byType(DecoratedBox)).first,
            )
            .decoration
        as TanreiContainerDecoration;

Color controlFill(WidgetTester tester, Finder control) =>
    controlDecoration(tester, control).color ?? const Color(0x00000000);

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

double controlOpacity(WidgetTester tester, Finder control) => tester
    .widget<Opacity>(find.ancestor(of: control, matching: find.byType(Opacity)).first)
    .opacity;

bool ringVisible(WidgetTester tester, Finder control) => tester
    .widget<TanreiFocusRing>(
      find.ancestor(of: control, matching: find.byType(TanreiFocusRing)).first,
    )
    .visible;

RenderTanreiSnackbarRow rowOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiSnackbarRow>().toSet().single;

Widget inPlace(
  TanreiSnackbar snackbar, {
  TanreiThemeData theme = lightTheme,
  TextDirection textDirection = TextDirection.ltr,
}) => tanreiTestApp(
  Directionality(
    textDirection: textDirection,
    child: SizedBox(width: 400, child: Center(child: snackbar)),
  ),
  theme: theme,
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('controls', () {
    testWidgets('SNK-1: the action emits action once and closes; the close button emits dismiss '
        'with close once and closes — by pointer, touch, Enter or Space', (
      WidgetTester tester,
    ) async {
      final List<TanreiSnackbarClosedReason> closed = <TanreiSnackbarClosedReason>[];
      await tester.pumpWidget(hostApp());
      TanreiSnackbarController controller = await showSettled(
        tester,
        TanreiSnackbar(message: 'Archived', actionLabel: 'Undo', onClosed: closed.add),
      );
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(closed, <TanreiSnackbarClosedReason>[TanreiSnackbarClosedReason.action]);
      expect(await controller.closed, TanreiSnackbarClosedReason.action);
      expect(find.text('Archived'), findsNothing);

      controller = await showSettled(
        tester,
        TanreiSnackbar(
          message: 'Printer',
          showCloseIcon: true,
          closeIconLabel: 'Close',
          onClosed: closed.add,
        ),
      );
      await tester.tap(closeButton(), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(closed.last, TanreiSnackbarClosedReason.close);
      expect(closed, hasLength(2));
      expect(await controller.closed, TanreiSnackbarClosedReason.close);

      for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
        LogicalKeyboardKey.enter,
        LogicalKeyboardKey.space,
      ]) {
        controller = await showSettled(
          tester,
          TanreiSnackbar(message: 'Keyed', actionLabel: 'Undo', onClosed: closed.add),
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(await controller.closed, TanreiSnackbarClosedReason.action, reason: '$key');
      }
      expect(closed, hasLength(4));
    });

    testWidgets('SNK-2: under the acme system hovered, focused and pressed draw their own tokens, '
        'pressed over focused over hovered; focus from a pointer draws no focused state', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiSnackbarControlTokens action = acmeSystem.snackbar.controls.action;
      Color fill(TanreiInteractionState state) => acme.paint(action.of(state).containerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await tester.pumpWidget(
        inPlace(
          const TanreiSnackbar(message: 'Archived', actionLabel: 'Undo'),
          theme: acme,
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.text('Undo')));
      await tester.pumpAndSettle();
      expect(controlFill(tester, controlOf('Undo')), fill(TanreiInteractionState.hovered));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(controlFill(tester, controlOf('Undo')), fill(TanreiInteractionState.focused));
      await mouse.down(tester.getCenter(find.text('Undo')));
      await tester.pump();
      expect(controlFill(tester, controlOf('Undo')), fill(TanreiInteractionState.pressed));
      await mouse.up();
      await tester.pumpAndSettle();
      expect(textStyleOf(tester, 'Undo').color, acme.paint(action.focused.contentColor));
    });

    testWidgets('SNK-3: keyboard focus shows the focus ring around the control at once; focus from '
        'a pointer shows none', (WidgetTester tester) async {
      await tester.pumpWidget(
        inPlace(
          const TanreiSnackbar(
            message: 'Archived',
            actionLabel: 'Undo',
            showCloseIcon: true,
            closeIconLabel: 'Close',
          ),
        ),
      );
      expect(ringVisible(tester, controlOf('Undo')), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(ringVisible(tester, controlOf('Undo')), isTrue);
      expect(
        tester
            .widget<TanreiFocusRing>(
              find.ancestor(of: controlOf('Undo'), matching: find.byType(TanreiFocusRing)).first,
            )
            .inside,
        isFalse,
        reason: 'around the control',
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(ringVisible(tester, closeButton()), isTrue);
      expect(ringVisible(tester, controlOf('Undo')), isFalse);
    });

    testWidgets('SNK-4: a control smaller than the touch target answers over the target around its '
        'centre, without changing its visual size', (WidgetTester tester) async {
      final List<TanreiSnackbarClosedReason> closed = <TanreiSnackbarClosedReason>[];
      await tester.pumpWidget(
        inPlace(
          TanreiSnackbar(
            message: 'Printer',
            showCloseIcon: true,
            closeIconLabel: 'Close',
            onClosed: closed.add,
          ),
        ),
      );
      final Rect close = tester.getRect(closeButton());
      expect(close.size, Size.square(snackTokens.controlsHeight));
      final double reach = (system.measure.targetTouch - snackTokens.controlsHeight) / 2;
      expect(reach, greaterThan(0));
      await tester.tapAt(Offset(close.center.dx, close.top - reach + 1));
      await tester.pump();
      expect(closed, <TanreiSnackbarClosedReason>[TanreiSnackbarClosedReason.close]);
      await tester.tapAt(Offset(close.center.dx, close.top - reach - 2));
      await tester.pump();
      expect(closed, hasLength(1), reason: 'outside the target');
      await tester.pump(tanreiDuration(system.motion.duration.pressHold));
    });

    testWidgets('SNK-5: a press shows the pressed state without delay and keeps it for the '
        'press-hold duration, for touch, a mouse, Enter and Space', (WidgetTester tester) async {
      final Duration hold = tanreiDuration(system.motion.duration.pressHold);
      final Color pressed = lightTheme.paint(snackTokens.controls.action.pressed.containerColor);
      const Duration tick = Duration(milliseconds: 1);
      await tester.pumpWidget(
        inPlace(const TanreiSnackbar(message: 'Archived', actionLabel: 'Undo')),
      );
      for (final PointerDeviceKind kind in <PointerDeviceKind>[
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
      ]) {
        await tester.tap(find.text('Undo'), kind: kind);
        await tester.pump();
        expect(controlFill(tester, controlOf('Undo')), pressed, reason: '$kind');
        await tester.pump(hold - tick);
        expect(controlFill(tester, controlOf('Undo')), pressed);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(controlFill(tester, controlOf('Undo')), isNot(pressed));
      }
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
        LogicalKeyboardKey.enter,
        LogicalKeyboardKey.space,
      ]) {
        final Color focused = controlFill(tester, controlOf('Undo'));
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(controlFill(tester, controlOf('Undo')), pressed, reason: '$key');
        await tester.pump(hold - tick);
        expect(controlFill(tester, controlOf('Undo')), pressed);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(controlFill(tester, controlOf('Undo')), focused);
      }
    });
  });

  group('choices of kind', () {
    testWidgets(
      'SNK-6: overlay (default) fills the pressed control at once; ripple (m3-like) grows '
      'it from the point of contact over comp.snackbar.motion.feedback-duration; dim (cupertino) '
      'dims the control and draws no state layer',
      (WidgetTester tester) async {
        Widget bar(TanreiThemeData theme) => inPlace(
          TanreiSnackbar(key: UniqueKey(), message: 'Archived', actionLabel: 'Undo'),
          theme: theme,
        );
        await tester.pumpWidget(bar(lightTheme));
        TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Undo')));
        await tester.pump();
        expect(
          controlFill(tester, controlOf('Undo')),
          lightTheme.paint(snackTokens.controls.action.pressed.containerColor),
        );
        expect(controlDecoration(tester, controlOf('Undo')).ripple, isNull);
        await touch.up();
        await tester.pumpAndSettle();

        const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
        await tester.pumpWidget(bar(m3));
        final Rect box = tester.getRect(controlOf('Undo'));
        const Offset contact = Offset(10, 8);
        touch = await tester.startGesture(box.topLeft + contact);
        await tester.pump();
        final TanreiRipple ripple = controlDecoration(tester, controlOf('Undo')).ripple!;
        expect(ripple.origin, contact);
        expect(
          ripple.color,
          m3.paint(m3LikeSystem.snackbar.controls.action.pressed.containerColor),
        );
        await tester.pump(tanreiDuration(m3LikeSystem.snackbar.motionFeedbackDuration) ~/ 2);
        expect(
          controlDecoration(tester, controlOf('Undo')).ripple!.progress,
          moreOrLessEquals(m3LikeSystem.snackbar.motionStateEasing.toCurve().transform(0.5)),
        );
        await touch.up();
        await tester.pumpAndSettle();

        await tester.pumpWidget(bar(const TanreiThemeData(system: cupertinoSystem)));
        touch = await tester.startGesture(tester.getCenter(find.text('Undo')));
        await tester.pump();
        expect(controlOpacity(tester, controlOf('Undo')), cupertinoSystem.snackbar.pressed.opacity);
        expect(cupertinoSystem.snackbar.pressed.opacity, lessThan(1));
        expect(controlFill(tester, controlOf('Undo')).a, 0);
        await touch.up();
        await tester.pumpAndSettle();
      },
    );

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'SNK-6: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press'}',
        (WidgetTester tester) async {
          final TanreiSnackbarControlTokens action = snackTokens.controls.action;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            snackbar: snackTokens.copyWith(
              pressed: snackTokens.pressed.copyWith(opacity: 0.5),
              controls: snackTokens.controls.copyWith(
                action: action.copyWith(
                  pressed: action.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    contentColor: const TanreiPaint.literal(Color(0xFF445566)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(
            inPlace(
              const TanreiSnackbar(message: 'Archived', actionLabel: 'Undo'),
              theme: TanreiThemeData(system: of),
            ),
          );
          final Color resting = textStyleOf(tester, 'Undo').color!;
          final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Undo')));
          await tester.pump();
          expect(controlFill(tester, controlOf('Undo')).a, 0);
          if (feedback == TanreiPressedFeedback.none) {
            expect(textStyleOf(tester, 'Undo').color, resting);
            expect(controlOpacity(tester, controlOf('Undo')), 1);
          } else {
            expect(textStyleOf(tester, 'Undo').color, const Color(0xFF445566));
            expect(controlOpacity(tester, controlOf('Undo')), 0.5);
            expect(
              controlDecoration(tester, controlOf('Undo')).ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await touch.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'SNK-7: the corner smoothing of the system eases the bar and its controls; the focus '
      'style draws a ring (default) or a glow (acme)',
      (WidgetTester tester) async {
        Future<List<Paint>> focusedStrokes(TanreiSystem of) async {
          await tester.pumpWidget(
            inPlace(
              TanreiSnackbar(key: UniqueKey(), message: 'Archived', actionLabel: 'Undo'),
              theme: TanreiThemeData(system: of),
            ),
          );
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.pump();
          final List<Paint> found = <Paint>[];
          expect(
            find.ancestor(of: controlOf('Undo'), matching: find.byType(TanreiFocusRing)).first,
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
        expect(ring, isNotEmpty);
        expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
        expect(barDecoration(tester, 'Archived').shape.smoothing, 0);
        final List<Paint> glow = await focusedStrokes(acmeSystem);
        expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
        await focusedStrokes(cupertinoSystem);
        expect(barDecoration(tester, 'Archived').shape.smoothing, 0.6);
        expect(controlDecoration(tester, controlOf('Undo')).shape.smoothing, 0.6);
        expect(
          controlDecoration(tester, controlOf('Undo')).shape.radius,
          cupertinoSystem.snackbar.controlsShape,
        );
      },
    );
  });

  group('timing', () {
    testWidgets('SNK-8: auto is short without an action and indefinite with one; short and long '
        'close after their timeouts with the reason timeout; indefinite stays; with a screen reader '
        'running an action never times out', (WidgetTester tester) async {
      collectIgnoredValues();
      await tester.pumpWidget(hostApp());
      Future<void> expectTimeout(TanreiSnackbar snackbar, int? milliseconds) async {
        final TanreiSnackbarController controller = await showSettled(tester, snackbar);
        TanreiSnackbarClosedReason? reason;
        unawaited(controller.closed.then((TanreiSnackbarClosedReason r) => reason = r));
        if (milliseconds == null) {
          await tester.pump(ms(snackTokens.timeoutLong * 3));
          expect(reason, isNull, reason: snackbar.message);
          controller.close();
          await tester.pumpAndSettle();
          return;
        }
        await tester.pump(ms(milliseconds - snackTokens.motionEnterDuration - 1));
        expect(reason, isNull, reason: snackbar.message);
        await tester.pump(ms(1));
        await tester.pumpAndSettle();
        expect(reason, TanreiSnackbarClosedReason.timeout, reason: snackbar.message);
      }

      await expectTimeout(const TanreiSnackbar(message: 'auto'), snackTokens.timeoutShort);
      await expectTimeout(const TanreiSnackbar(message: 'auto action', actionLabel: 'Undo'), null);
      await expectTimeout(
        const TanreiSnackbar(message: 'long', duration: TanreiSnackbarDuration.long),
        snackTokens.timeoutLong,
      );
      await expectTimeout(
        const TanreiSnackbar(message: 'short', duration: TanreiSnackbarDuration.short),
        snackTokens.timeoutShort,
      );
      await expectTimeout(
        const TanreiSnackbar(message: 'indefinite', duration: TanreiSnackbarDuration.indefinite),
        null,
      );

      await tester.pumpWidget(
        hostApp(media: (MediaQueryData d) => d.copyWith(accessibleNavigation: true)),
      );
      await expectTimeout(
        const TanreiSnackbar(
          message: 'screen reader',
          actionLabel: 'Undo',
          duration: TanreiSnackbarDuration.short,
        ),
        null,
      );
    });

    testWidgets('SNK-9: the timeout pauses while hovered, focused, in the background or under a '
        'modal overlay, and restarts from its whole length', (WidgetTester tester) async {
      await tester.pumpWidget(hostApp());
      final int timeout = snackTokens.timeoutShort;
      TanreiSnackbarClosedReason? reason;
      final TanreiSnackbarController controller = await showSettled(
        tester,
        const TanreiSnackbar(message: 'Saved', showCloseIcon: true, closeIconLabel: 'Close'),
      );
      unawaited(controller.closed.then((TanreiSnackbarClosedReason r) => reason = r));

      // Hovered.
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await tester.pump(ms(timeout ~/ 2));
      await mouse.moveTo(tester.getCenter(find.text('Saved')));
      await tester.pump(ms(timeout * 2));
      expect(reason, isNull);
      await mouse.moveTo(Offset.zero);
      await tester.pump(ms(timeout - 1));
      expect(reason, isNull, reason: 'restarted from the whole length');

      // Focused.
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump(ms(timeout * 2));
      expect(reason, isNull);
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pump(ms(timeout - 1));
      expect(reason, isNull);

      // In the background.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(ms(timeout * 2));
      expect(reason, isNull);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump(ms(timeout - 1));
      expect(reason, isNull);

      // Under a modal overlay.
      TanreiModalOverlays.instance.add();
      await tester.pump(ms(timeout * 2));
      expect(reason, isNull);
      TanreiModalOverlays.instance.remove();
      await tester.pump(ms(timeout - 1));
      expect(reason, isNull);
      await tester.pump(ms(1));
      await tester.pumpAndSettle();
      expect(reason, TanreiSnackbarClosedReason.timeout);
    });
  });

  group('host', () {
    testWidgets(
      'SNK-10: a shown snackbar is announced once, politely, its action\'s label after the '
      'message, and focus does not move',
      (WidgetTester tester) async {
        final FocusNode node = FocusNode();
        addTearDown(node.dispose);
        await tester.pumpWidget(
          hostApp(
            page: Center(
              child: TanreiButton(focusNode: node, onPressed: () {}, child: const Text('Page')),
            ),
          ),
        );
        node.requestFocus();
        await tester.pump();
        tester.takeAnnouncements();
        await showSettled(tester, const TanreiSnackbar(message: 'Archived', actionLabel: 'Undo'));
        final List<CapturedAccessibilityAnnouncement> announced = tester.takeAnnouncements();
        expect(announced, hasLength(1));
        expect(announced.single.message, 'Archived, Undo');
        expect(announced.single.assertiveness, Assertiveness.polite);
        expect(node.hasPrimaryFocus, isTrue);
      },
    );

    testWidgets('SNK-11: the controls follow the host\'s content in the focus order; Escape inside '
        'emits dismiss with escape and closes; focus returns to where it came from', (
      WidgetTester tester,
    ) async {
      final FocusNode page = FocusNode();
      addTearDown(page.dispose);
      await tester.pumpWidget(
        hostApp(
          page: Center(
            child: TanreiButton(focusNode: page, onPressed: () {}, child: const Text('Page')),
          ),
        ),
      );
      final TanreiSnackbarController controller = await showSettled(
        tester,
        const TanreiSnackbar(message: 'Archived', actionLabel: 'Undo'),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(page.hasPrimaryFocus, isTrue, reason: 'the page first');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(ringVisible(tester, controlOf('Undo')), isTrue, reason: 'then the snackbar');
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(await controller.closed, TanreiSnackbarClosedReason.escape);
      expect(page.hasPrimaryFocus, isTrue, reason: 'focus went back');
    });

    testWidgets('SNK-12: one at a time, in order; the next waits for the exit and for a modal '
        'overlay to close; each resolves with its reason; dismissCurrent closes only the showing '
        'one (host) and the next then shows; clear also drops every waiting one (host)', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(hostApp());
      final TanreiSnackbarController first = messenger().show(
        const TanreiSnackbar(message: 'First', actionLabel: 'Undo'),
      );
      final TanreiSnackbarController second = messenger().show(
        const TanreiSnackbar(message: 'Second', actionLabel: 'Undo'),
      );
      final TanreiSnackbarController third = messenger().show(
        const TanreiSnackbar(message: 'Third', actionLabel: 'Undo'),
      );
      await tester.pumpAndSettle();
      expect(find.text('First'), findsOneWidget);
      expect(find.text('Second'), findsNothing);
      await tester.tap(find.text('Undo'));
      await tester.pump();
      await tester.pump(ms(snackTokens.motionExitDuration ~/ 2));
      expect(find.text('Second'), findsNothing, reason: 'waits for the exit');
      expect(await first.closed, TanreiSnackbarClosedReason.action);
      await tester.pumpAndSettle();
      expect(find.text('Second'), findsOneWidget);

      // A modal overlay holds the queue.
      TanreiModalOverlays.instance.add();
      messenger().dismissCurrent();
      await tester.pumpAndSettle();
      expect(await second.closed, TanreiSnackbarClosedReason.host);
      expect(find.text('Third'), findsNothing);
      TanreiModalOverlays.instance.remove();
      await tester.pumpAndSettle();
      expect(find.text('Third'), findsOneWidget);

      // Closing the showing one closes only it: the next waiting one then shows.
      final TanreiSnackbarController fourth = messenger().show(
        const TanreiSnackbar(message: 'Fourth', actionLabel: 'Undo'),
      );
      final TanreiSnackbarController fifth = messenger().show(
        const TanreiSnackbar(message: 'Fifth'),
      );
      messenger().dismissCurrent();
      await tester.pumpAndSettle();
      expect(await third.closed, TanreiSnackbarClosedReason.host);
      expect(find.text('Fourth'), findsOneWidget, reason: 'the next one shows');
      // Clearing drops every waiting one too.
      messenger().clear();
      await tester.pumpAndSettle();
      expect(await fourth.closed, TanreiSnackbarClosedReason.host);
      expect(await fifth.closed, TanreiSnackbarClosedReason.host);
      expect(find.text('Fourth'), findsNothing);
      expect(find.text('Fifth'), findsNothing);
    });

    testWidgets(
      'SNK-13: bottom centre, container.margin above the bottom and from the sides, inside '
      'the safe area and above the keyboard; above the content, below a modal dialog route',
      (WidgetTester tester) async {
        await tester.pumpWidget(hostApp());
        await showSettled(tester, const TanreiSnackbar(message: 'Saved'));
        final Size screen = tester.view.physicalSize / tester.view.devicePixelRatio;
        Rect bar = tester.getRect(barOf('Saved'));
        expect(bar.bottom, screen.height - snackTokens.containerMargin);
        expect(bar.center.dx, moreOrLessEquals(screen.width / 2));

        await tester.pumpWidget(
          hostApp(
            media: (MediaQueryData d) => d.copyWith(
              padding: const EdgeInsets.only(bottom: 20),
              viewInsets: const EdgeInsets.only(bottom: 250),
            ),
          ),
        );
        await tester.pump();
        bar = tester.getRect(barOf('Saved'));
        expect(bar.bottom, screen.height - snackTokens.containerMargin - 250, reason: 'keyboard');

        // Narrow: never wider than the host less the margins.
        tester.view.physicalSize = const Size(300, 600);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(hostApp());
        await tester.pump();
        bar = tester.getRect(barOf('Saved'));
        expect(bar.left, snackTokens.containerMargin);
        expect(bar.width, 300 - 2 * snackTokens.containerMargin);
      },
    );

    testWidgets('SNK-13: a dialog route pushed over the host is drawn above its snackbar', (
      WidgetTester tester,
    ) async {
      final GlobalKey<NavigatorState> navigator = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        WidgetsApp(
          color: const Color(0xFF000000),
          navigatorKey: navigator,
          builder: (BuildContext context, Widget? child) =>
              TanreiTheme(data: lightTheme, child: child!),
          pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) =>
              PageRouteBuilder<T>(
                settings: settings,
                pageBuilder: (BuildContext context, _, _) => builder(context),
              ),
          home: TanreiSnackbarMessenger(key: messengerKey, child: const SizedBox.expand()),
        ),
      );
      final TanreiSnackbarController controller = await showSettled(
        tester,
        const TanreiSnackbar(message: 'Saved', actionLabel: 'Undo'),
      );
      bool closed = false;
      unawaited(controller.closed.then((_) => closed = true));
      unawaited(
        navigator.currentState!.push(
          RawDialogRoute<void>(
            barrierDismissible: false,
            barrierColor: const Color(0x80000000),
            pageBuilder: (BuildContext context, _, _) => const SizedBox.shrink(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tapAt(tester.getCenter(find.text('Undo')));
      await tester.pumpAndSettle();
      expect(closed, isFalse, reason: 'the dialog\'s barrier, above the snackbar, took the press');
      expect(find.text('Saved'), findsOneWidget);
    });
  });

  group('layout', () {
    testWidgets('SNK-14: at least min-height, as wide as the content between min- and max-width; '
        'container color, elevation and shape; the paddings around the message and the controls', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(inPlace(const TanreiSnackbar(message: 'Hi')));
      Rect bar = tester.getRect(barOf('Hi'));
      expect(bar.height, snackTokens.containerMinHeight);
      expect(bar.width, snackTokens.containerMinWidth);
      final TanreiContainerDecoration decoration = barDecoration(tester, 'Hi');
      expect(decoration.color, lightTheme.paint(snackTokens.containerColor));
      expect(decoration.shape.radius, snackTokens.containerShape);
      final TanreiResolvedElevation level3 = TanreiResolvedElevation.resolve(
        snackTokens.containerElevation,
        lightTheme.colors,
      );
      expect(decoration.border, level3.ring);
      expect(decoration.boxShadow, level3.shadows.isEmpty ? null : level3.shadows);
      final Rect text = tester.getRect(find.text('Hi'));
      expect(text.left - bar.left, snackTokens.containerPaddingInlineStart);

      // Wide content: grows to the room (the 400 stage), wrapping.
      const String long = 'A message long enough to reach the maximum width of the bar and wrap';
      await tester.pumpWidget(inPlace(const TanreiSnackbar(message: long)));
      bar = tester.getRect(barOf(long));
      expect(bar.width, lessThanOrEqualTo(400));
      expect(bar.width, greaterThan(400 - snackTokens.supportingTextTypescale.size));
      expect(
        bar.right - tester.getRect(find.text(long)).right,
        greaterThanOrEqualTo(snackTokens.containerPaddingInlineEnd - 0.01),
      );
      expect(tester.getRect(find.text(long)).top - bar.top, snackTokens.containerPaddingBlock);

      // With a control: padding-inline-end-with-controls after the last one.
      await tester.pumpWidget(
        inPlace(const TanreiSnackbar(message: 'Hi', showCloseIcon: true, closeIconLabel: 'Close')),
      );
      expect(
        tester.getRect(barOf('Hi')).right - tester.getRect(closeButton()).right,
        snackTokens.containerPaddingInlineEndWithControls,
      );
    });

    testWidgets(
      'SNK-15: the message in its style, the controls gap after it and controls.gap apart, '
      'centred on the first line; the action at least controls.height with its padding and '
      'label style; the close glyph at controls.icon.size in a controls.height square',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          inPlace(
            const TanreiSnackbar(
              message: 'Saved file',
              actionLabel: 'Undo',
              showCloseIcon: true,
              closeIconLabel: 'Close',
            ),
          ),
        );
        final TextStyle message = textStyleOf(tester, 'Saved file');
        expect(message.color, lightTheme.paint(snackTokens.supportingTextColor));
        expect(message.fontSize, snackTokens.supportingTextTypescale.toTextStyle().fontSize);
        final Rect text = tester.getRect(find.text('Saved file'));
        final Rect action = tester.getRect(controlOf('Undo'));
        final Rect close = tester.getRect(closeButton());
        expect(action.left - text.right, snackTokens.containerGap);
        expect(close.left - action.right, snackTokens.controlsGap);
        expect(action.height, snackTokens.controlsHeight);
        expect(action.center.dy, moreOrLessEquals(text.center.dy));
        expect(close.center.dy, moreOrLessEquals(text.center.dy));
        expect(
          tester.getRect(find.text('Undo')).left - action.left,
          snackTokens.controlsPaddingInline,
        );
        expect(
          textStyleOf(tester, 'Undo').fontSize,
          snackTokens.controlsLabelTypescale.toTextStyle().fontSize,
        );
        expect(
          textStyleOf(tester, 'Undo').color,
          lightTheme.paint(snackTokens.controls.action.enabled.contentColor),
        );
        final TanreiControlIcon glyph = tester.widget<TanreiControlIcon>(
          find.byType(TanreiControlIcon),
        );
        expect(glyph.size, snackTokens.controlsIconSize);
        expect(glyph.selected, isFalse);
        expect(glyph.color, lightTheme.paint(snackTokens.controls.close.enabled.contentColor));
        expect(close.size, Size.square(snackTokens.controlsHeight));
      },
    );

    testWidgets('SNK-16: the action moves to a row of its own, gap below the message and at the '
        'end, when the message would need more than two lines or the label leaves it no room; the '
        'close button stays on the first row', (WidgetTester tester) async {
      await tester.pumpWidget(inPlace(const TanreiSnackbar(message: 'Saved', actionLabel: 'Undo')));
      expect(rowOf(tester).actionOnOwnRow, isFalse);

      const String message = 'Three files could not be uploaded.';
      await tester.pumpWidget(
        inPlace(
          const TanreiSnackbar(
            message: message,
            actionLabel: 'Review files that failed',
            showCloseIcon: true,
            closeIconLabel: 'Close',
          ),
        ),
      );
      expect(rowOf(tester).actionOnOwnRow, isTrue);
      final Rect text = tester.getRect(find.text(message));
      final Rect action = tester.getRect(controlOf('Review files that failed'));
      final Rect bar = tester.getRect(barOf(message));
      expect(action.top - text.bottom, snackTokens.containerGap);
      expect(bar.right - action.right, snackTokens.containerPaddingInlineEndWithControls);
      expect(bar.bottom - action.bottom, snackTokens.containerPaddingInlineEndWithControls);
      expect(tester.getRect(closeButton()).center.dy, lessThan(text.bottom));
      expect(
        tester.getSize(find.text('Review files that failed')).height,
        textStyleOf(tester, 'Review files that failed').fontSize! *
            textStyleOf(tester, 'Review files that failed').height!,
        reason: 'the label never wraps',
      );

      const String long =
          'Your changes were saved, but the shared copy could not be updated while you were '
          'offline.';
      await tester.pumpWidget(inPlace(const TanreiSnackbar(message: long, actionLabel: 'Retry')));
      expect(rowOf(tester).actionOnOwnRow, isTrue, reason: 'more than two lines beside the action');
    });

    testWidgets('SNK-18: in a right-to-left layout the message is at the right and the controls at '
        'the left; a ripple still grows from the point of contact', (WidgetTester tester) async {
      await tester.pumpWidget(
        inPlace(
          const TanreiSnackbar(message: 'Saved', actionLabel: 'Undo'),
          textDirection: TextDirection.rtl,
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      final Rect bar = tester.getRect(barOf('Saved'));
      expect(
        bar.right - tester.getRect(find.text('Saved')).right,
        m3LikeSystem.snackbar.containerPaddingInlineStart,
      );
      expect(
        tester.getRect(controlOf('Undo')).right,
        lessThan(tester.getRect(find.text('Saved')).left),
      );
      final Rect box = tester.getRect(controlOf('Undo'));
      const Offset contact = Offset(6, 5);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(controlDecoration(tester, controlOf('Undo')).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
    });
  });

  group('motion', () {
    testWidgets('SNK-17: it rises by its height plus its margin while fading in over the enter '
        'motion, fades out in place over the exit motion; reduced motion fades without moving, '
        'and Android\'s setting shows it at once', (WidgetTester tester) async {
      await tester.pumpWidget(hostApp());
      messenger().show(const TanreiSnackbar(message: 'Saved'));
      await tester.pump();
      final double rest =
          (tester.view.physicalSize / tester.view.devicePixelRatio).height -
          snackTokens.containerMargin;
      await tester.pump(ms(snackTokens.motionEnterDuration ~/ 2));
      final double t = snackTokens.motionEnterEasing.toCurve().transform(0.5);
      final double height = tester.getSize(barOf('Saved')).height;
      expect(
        tester.getRect(barOf('Saved')).bottom,
        moreOrLessEquals(rest + (1 - t) * (height + snackTokens.containerMargin), epsilon: 0.01),
      );
      FadeTransition fade() => tester.widget<FadeTransition>(
        find.ancestor(of: barOf('Saved'), matching: find.byType(FadeTransition)).first,
      );
      expect(fade().opacity.value, moreOrLessEquals(t));
      await tester.pumpAndSettle();
      expect(tester.getRect(barOf('Saved')).bottom, rest);
      messenger().dismissCurrent();
      await tester.pump();
      await tester.pump(ms(snackTokens.motionExitDuration ~/ 2));
      expect(tester.getRect(barOf('Saved')).bottom, rest, reason: 'in place');
      expect(
        fade().opacity.value,
        moreOrLessEquals(1 - snackTokens.motionExitEasing.toCurve().transform(0.5)),
      );
      await tester.pumpAndSettle();

      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      await tester.pumpWidget(hostApp(disableAnimations: true));
      messenger().show(const TanreiSnackbar(message: 'Faded'));
      await tester.pump();
      await tester.pump(ms(snackTokens.motionEnterDuration ~/ 2));
      expect(tester.getRect(barOf('Faded')).bottom, rest, reason: 'no movement');
      expect(
        tester
            .widget<FadeTransition>(
              find.ancestor(of: barOf('Faded'), matching: find.byType(FadeTransition)).first,
            )
            .opacity
            .value,
        lessThan(1),
      );
      messenger().dismissCurrent();
      await tester.pumpAndSettle();

      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      messenger().show(const TanreiSnackbar(message: 'At once'));
      await tester.pump();
      await tester.pump();
      expect(
        tester
            .widget<FadeTransition>(
              find.ancestor(of: barOf('At once'), matching: find.byType(FadeTransition)).first,
            )
            .opacity
            .value,
        1,
      );
      messenger().dismissCurrent();
      await tester.pump();
      expect(find.text('At once'), findsNothing);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('SNK-19: drawn in place it rests where it is, never times out, is not announced, '
        'and still emits action and dismiss', (WidgetTester tester) async {
      final List<TanreiSnackbarClosedReason> closed = <TanreiSnackbarClosedReason>[];
      collectIgnoredValues();
      tester.takeAnnouncements();
      await tester.pumpWidget(
        inPlace(
          TanreiSnackbar(
            message: 'Saved',
            actionLabel: 'Undo',
            showCloseIcon: true,
            closeIconLabel: 'Close',
            duration: TanreiSnackbarDuration.short,
            onClosed: closed.add,
          ),
        ),
      );
      await tester.pump(ms(snackTokens.timeoutLong * 2));
      expect(find.text('Saved'), findsOneWidget);
      expect(closed, isEmpty);
      expect(tester.takeAnnouncements(), isEmpty);
      await tester.tap(find.text('Undo'));
      await tester.pump(ms(1000));
      await tester.tap(closeButton());
      await tester.pump(ms(1000));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump(ms(1000));
      expect(closed, <TanreiSnackbarClosedReason>[
        TanreiSnackbarClosedReason.action,
        TanreiSnackbarClosedReason.close,
        TanreiSnackbarClosedReason.escape,
      ]);
    });
  });

  group('accessibility', () {
    testWidgets('SNK-20: an empty message still renders and is reported; a close button without a '
        'name still renders and is reported; a timed action is reminded — each once', (
      WidgetTester tester,
    ) async {
      final List<String> ignored = collectIgnoredValues();
      final List<String> missing = collectMissingNames();
      Widget build() => inPlace(
        const TanreiSnackbar(
          message: '',
          actionLabel: 'Undo',
          showCloseIcon: true,
          duration: TanreiSnackbarDuration.long,
        ),
      );
      await tester.pumpWidget(build());
      expect(find.byType(TanreiSnackbar), findsOneWidget);
      expect(find.byType(TanreiControlIcon), findsOneWidget);
      expect(missing, <String>['snackbar close button']);
      expect(ignored.where((String r) => r.startsWith('snackbar message')), hasLength(1));
      expect(ignored.where((String r) => r.startsWith('snackbar duration')), hasLength(1));
      await tester.pumpWidget(build());
      expect(missing, hasLength(1));
      expect(ignored, hasLength(2));
    });

    testWidgets('semantics: the message is read; the action is a button named by its label, the '
        'close button by closeIconLabel', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        inPlace(
          const TanreiSnackbar(
            message: 'Saved',
            actionLabel: 'Undo',
            showCloseIcon: true,
            closeIconLabel: 'Close',
          ),
        ),
      );
      expect(find.bySemanticsLabel('Saved'), findsOneWidget);
      final SemanticsData undo = tester.getSemantics(controlOf('Undo')).getSemanticsData();
      expect(undo.label, 'Undo');
      expect(undo.hasFlag(SemanticsFlag.isButton), isTrue);
      final SemanticsData close = tester.getSemantics(closeButton()).getSemanticsData();
      expect(close.label, 'Close');
      expect(close.hasFlag(SemanticsFlag.isButton), isTrue);
      handle.dispose();
    });

    testWidgets('guidelines: a snackbar with an action and a close button', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await tester.pumpWidget(
          inPlace(
            TanreiSnackbar(
              key: UniqueKey(),
              message: 'Saved',
              actionLabel: 'Undo',
              showCloseIcon: true,
              closeIconLabel: 'Close',
            ),
            theme: theme,
          ),
        );
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
      }
      handle.dispose();
    });

    // WCAG 1.4.3 / 1.4.11 in every scheme of the default system: the message and the action's label
    // 4.5:1 and the close glyph 3:1 on the bar. An imitation preset is held to its original, not to
    // these criteria, in any scheme.
    test('contrast: "${system.id}" snackbar texts 4.5:1 and the close glyph 3:1 on the bar', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          final TanreiSnackbarTokens t = system.snackbar;
          final Color bar = Color.alphaBlend(theme.paint(t.containerColor), theme.colors.surface);
          for (final (String part, TanreiPaint paint, double minimum)
              in <(String, TanreiPaint, double)>[
                ('message', t.supportingTextColor, 4.5),
                ('action', t.controls.action.enabled.contentColor, 4.5),
                ('close', t.controls.close.enabled.contentColor, 3),
              ]) {
            final double ratio = contrastOf(Color.alphaBlend(theme.paint(paint), bar), bar);
            if (ratio < minimum) {
              failures.add('${brightness.name} ${contrast.name} $part ${ratio.toStringAsFixed(2)}');
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(snackTokens.containerColor, const TanreiPaint.role(TanreiColorRole.inverseSurface));
      expect(snackTokens.containerElevation, system.elevation.level3);
      expect(snackTokens.timeoutShort, 4000);
      expect(snackTokens.timeoutLong, 10000);
      expect(snackTokens.containerMinWidth, 288);
      expect(snackTokens.containerMaxWidth, 560);
      expect(
        snackTokens.controls.action.enabled.contentColor,
        const TanreiPaint.role(TanreiColorRole.inversePrimary),
      );
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": a snackbar at rest draws that system\'s tokens', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(
          inPlace(
            const TanreiSnackbar(message: 'Saved', actionLabel: 'Undo'),
            theme: theme,
          ),
        );
        final TanreiContainerDecoration decoration = barDecoration(tester, 'Saved');
        expect(decoration.color, theme.paint(shipped.snackbar.containerColor));
        expect(decoration.shape.radius, shipped.snackbar.containerShape);
        expect(decoration.shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          textStyleOf(tester, 'Undo').color,
          theme.paint(shipped.snackbar.controls.action.enabled.contentColor),
        );
        expect(
          tester.getSize(barOf('Saved')).height,
          math.max(shipped.snackbar.containerMinHeight, 0),
        );
      });
    }

    test('closed props: a duration name the snackbar does not define is auto, reported', () {
      final List<String> reports = collectUnknownValues();
      expect(TanreiSnackbarDuration.fromName('forever'), TanreiSnackbarDuration.auto);
      expect(TanreiSnackbarDuration.fromName('long'), TanreiSnackbarDuration.long);
      expect(reports, <String>['snackbar duration "forever" -> auto']);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('snackbar');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'message',
        'action',
        'closable',
        'action-closable',
        'two-lines',
        'action-own-row',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: snackbarGoldenSurface,
          child: fixtureSnackbar(fixture),
          file: 'goldens/snackbar/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the action and the close
    // button show the preset's bar, both controls and the message at once.
    const String recorded = 'action-closable';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: snackbarGoldenSurface,
          child: fixtureSnackbar(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/snackbar/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
