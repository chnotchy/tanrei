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
final TanreiSwitchTokens tokens = system.switch_;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The Material Symbols glyphs the fixtures name (drawn as text: the test font's box).
const Map<String, String> glyphs = <String, String>{'check': '\u{e5ca}', 'close': '\u{e5cd}'};

/// The thumbIcon of a fixture's selectedIcon / unselectedIcon (empty: none).
WidgetStateProperty<Widget?>? thumbIconOf(String selectedIcon, String unselectedIcon) =>
    selectedIcon.isEmpty && unselectedIcon.isEmpty
    ? null
    : WidgetStateProperty.resolveWith((Set<WidgetState> states) {
        final String name = states.contains(WidgetState.selected) ? selectedIcon : unselectedIcon;
        return name.isEmpty ? null : Text(glyphs[name] ?? name);
      });

Widget switchOf(Map<String, dynamic> props) => TanreiSwitch(
  value: props['selected'] == true,
  onChanged: props['disabled'] == true ? null : (_) {},
  thumbIcon: thumbIconOf(
    props['selectedIcon'] as String? ?? '',
    props['unselectedIcon'] as String? ?? '',
  ),
  label: props['label'] as String? ?? '',
  labelHidden: props['labelHidden'] == true,
);

Widget toggle({
  bool value = false,
  bool enabled = true,
  ValueChanged<bool>? onChanged,
  WidgetStateProperty<Widget?>? thumbIcon,
  String label = 'Wi-Fi',
  bool labelHidden = false,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key = const ValueKey<String>('switch'),
}) => TanreiSwitch(
  key: key,
  value: value,
  onChanged: enabled ? (onChanged ?? (_) {}) : null,
  thumbIcon: thumbIcon,
  label: label,
  labelHidden: labelHidden,
  focusNode: focusNode,
  autofocus: autofocus,
);

/// An owner that keeps the value, as a product does.
class Owner extends StatefulWidget {
  const Owner({super.key, required this.changes, this.initial = false});

  final List<bool> changes;
  final bool initial;

  @override
  State<Owner> createState() => _OwnerState();
}

class _OwnerState extends State<Owner> {
  late bool value = widget.initial;

  @override
  Widget build(BuildContext context) => toggle(
    value: value,
    onChanged: (bool next) => setState(() {
      widget.changes.add(next);
      value = next;
    }),
  );
}

TanreiSwitchTrackPainter trackOf(WidgetTester tester) =>
    painterOf<TanreiSwitchTrackPainter>(tester);

TanreiSwitchHandlePainter handleOf(WidgetTester tester) =>
    painterOf<TanreiSwitchHandlePainter>(tester);

Finder get trackFinder =>
    find.byWidgetPredicate((Widget w) => w is CustomPaint && w.painter is TanreiSwitchTrackPainter);

Finder get handleFinder => find.byWidgetPredicate(
  (Widget w) => w is CustomPaint && w.painter is TanreiSwitchHandlePainter,
);

void expectParts(
  WidgetTester tester,
  TanreiThemeData theme,
  TanreiSwitchConditionStateTokens state, {
  String? reason,
}) {
  expect(trackOf(tester).fill, theme.paint(state.trackColor), reason: reason);
  expect(trackOf(tester).outline, theme.paint(state.outlineColor), reason: reason);
  expect(handleOf(tester).color, theme.paint(state.handleColor), reason: reason);
  expect(tester.getSize(handleFinder), Size.square(state.handleSize), reason: reason);
  if (visibleLabel(TanreiSwitch).evaluate().isNotEmpty) {
    expect(labelStyle(tester, TanreiSwitch).color, theme.paint(state.labelColor), reason: reason);
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
      testWidgets(
        'SWT-1: a ${kind.name} tap switches it and emits change once with the new value',
        (WidgetTester tester) async {
          final List<bool> changes = <bool>[];
          await tester.pumpWidget(tanreiTestApp(Owner(changes: changes)));
          await tester.tap(trackFinder, kind: kind);
          await tester.pumpAndSettle();
          expect(changes, <bool>[true]);
          await tester.tap(trackFinder, kind: kind);
          await tester.pumpAndSettle();
          expect(changes, <bool>[true, false]);
        },
      );
    }

    testWidgets('SWT-1: a press on the label, Space and the semantic tap switch it', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(Owner(changes: changes)));
      await tester.tap(find.text('Wi-Fi'));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      tester.semantics.tap(find.semantics.byLabel('Wi-Fi'));
      await tester.pumpAndSettle();
      expect(changes, <bool>[true, false, true]);
      handle.dispose();
    });

    testWidgets('SWT-1: Enter switches it on Android only', (WidgetTester tester) async {
      for (final TargetPlatform platform in <TargetPlatform>[
        TargetPlatform.android,
        TargetPlatform.iOS,
        TargetPlatform.macOS,
      ]) {
        await onPlatform(platform, () async {
          final List<bool> changes = <bool>[];
          await tester.pumpWidget(tanreiTestApp(Owner(key: UniqueKey(), changes: changes)));
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.sendKeyEvent(LogicalKeyboardKey.enter);
          await tester.pumpAndSettle();
          expect(
            changes,
            platform == TargetPlatform.android ? <bool>[true] : isEmpty,
            reason: platform.name,
          );
        });
      }
    });

    testWidgets('SWT-2: a null onChanged does not change or emit, is not focusable, ignores its '
        'label and is exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(toggle(enabled: false, focusNode: focusNode)));
      await tester.tap(trackFinder);
      await tester.tap(find.text('Wi-Fi'));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Wi-Fi',
          hasToggledState: true,
          isToggled: false,
          hasEnabledState: true,
          isEnabled: false,
          isFocusable: false,
          hasTapAction: false,
        ),
      );
      handle.dispose();
    });
  });

  group('interaction states', () {
    testWidgets('SWT-3: the drawn tokens are those of the highest-precedence state, pressed > '
        'focused > hovered (acme values each differently)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiSwitchConditionTokens selected = acmeSystem.switch_.conditions.selected;
      final Color hovered = theme.paint(selected.hovered.containerColor);
      final Color focused = theme.paint(selected.focused.containerColor);
      final Color pressed = theme.paint(selected.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(toggle(value: true, focusNode: focusNode), theme: theme),
      );
      final TestGesture mouse = await hoverOver(tester, handleFinder);
      expect(stateLayerColor(tester), hovered);
      expectParts(tester, theme, selected.hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
      await mouse.down(tester.getCenter(handleFinder));
      await tester.pump();
      expect(stateLayerColor(tester), pressed);
      expectParts(tester, theme, selected.pressed);
      await mouse.up();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
    });

    testWidgets('SWT-3: m3-like grows the handle under a press (a per-state size), and pointer '
        'focus does not select the focused state', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiSwitchConditionTokens unselected = m3LikeSystem.switch_.conditions.unselected;
      expect(unselected.pressed.handleSize, greaterThan(unselected.enabled.handleSize));
      await tester.pumpWidget(tanreiTestApp(toggle(), theme: theme));
      expect(tester.getSize(handleFinder), Size.square(unselected.enabled.handleSize));
      final TestGesture touch = await tester.startGesture(tester.getCenter(handleFinder));
      await tester.pump();
      expect(tester.getSize(handleFinder), Size.square(unselected.pressed.handleSize));
      await touch.up();
      await tester.pumpAndSettle();
      expect(tester.getSize(handleFinder), Size.square(unselected.enabled.handleSize));

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(toggle(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester).a, 0);
      expect(focusRingShown(tester), isFalse);
    });

    testWidgets('SWT-4: keyboard focus shows the focus ring around the track, at once', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(toggle()));
      expect(focusRingShown(tester), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusRingShown(tester), isTrue);
      expect(
        tester.getSize(find.byType(TanreiFocusRing)),
        Size(tokens.trackWidth, tokens.trackHeight),
      );
      final TanreiFocusRing ring = tester.widget(find.byType(TanreiFocusRing));
      expect(ring.borderRadius, BorderRadius.circular(tokens.trackShape));
    });

    testWidgets('SWT-5: the hit area reaches sys.target.touch; the whole track and the label are '
        'part of it; the visual size does not change', (WidgetTester tester) async {
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(toggle(labelHidden: true, onChanged: changes.add)));
      final Rect trackRect = tester.getRect(trackFinder);
      expect(trackRect.size, Size(tokens.trackWidth, tokens.trackHeight));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.height, system.measure.targetTouch);
      expect(target.width, greaterThanOrEqualTo(system.measure.targetTouch));
      // The far end of the track, away from the handle.
      await tester.tapAt(trackRect.centerRight - const Offset(2, 0));
      await tester.tapAt(Offset(target.center.dx, target.top + 1));
      await tester.pumpAndSettle();
      expect(changes, hasLength(2));
      await tester.pumpWidget(tanreiTestApp(toggle(onChanged: changes.add)));
      await tester.tapAt(tester.getRect(find.text('Wi-Fi')).centerRight - const Offset(1, 0));
      await tester.pumpAndSettle();
      expect(changes, hasLength(3));
    });

    testWidgets('SWT-6: disabled draws container, track, outline, handle, icon, label and opacity '
        'from the disabled tokens of its condition', (WidgetTester tester) async {
      final Color faded = light.onSurface.withValues(alpha: system.state.disabledContainerOpacity);
      for (final bool value in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(
            toggle(
              key: ValueKey<bool>(value),
              value: value,
              enabled: false,
              thumbIcon: thumbIconOf('check', 'close'),
            ),
          ),
        );
        final TanreiSwitchConditionStateTokens disabled =
            (value ? tokens.conditions.selected : tokens.conditions.unselected).disabled;
        expect(trackOf(tester).fill, lightTheme.paint(disabled.trackColor));
        expect(trackOf(tester).outline, lightTheme.paint(disabled.outlineColor));
        expect(handleOf(tester).color, lightTheme.paint(disabled.handleColor));
        expect(labelStyle(tester, TanreiSwitch).color, lightTheme.paint(disabled.labelColor));
        expect(stateLayerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(selectionOpacity(tester, TanreiSwitch), tokens.disabled.opacity);
        final TextStyle glyph = DefaultTextStyle.of(
          tester.element(find.text(glyphs[value ? 'check' : 'close']!)),
        ).style;
        expect(glyph.color, lightTheme.paint(disabled.iconColor));
        // The default system: the track and its outline fade together as one fill, the round layer
        // stays clear.
        expect(trackOf(tester).fill, isSameColorAs(faded));
        expect(trackOf(tester).outline, isSameColorAs(faded));
        expect(stateLayerColor(tester).a, 0);
      }
    });

    testWidgets('SWT-7: a press shows the pressed state at once and keeps it for the press-hold '
        'duration', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final Color pressed = theme.paint(
        acmeSystem.switch_.conditions.unselected.pressed.containerColor,
      );
      final Duration hold = Duration(milliseconds: acmeSystem.motion.duration.pressHold);
      await tester.pumpWidget(tanreiTestApp(toggle(labelHidden: true), theme: theme));
      final TestGesture touch = await tester.startGesture(tester.getCenter(handleFinder));
      await tester.pump();
      expect(stateLayerColor(tester), pressed);
      await touch.up();
      await tester.pump(hold - const Duration(milliseconds: 1));
      expect(stateLayerColor(tester), pressed);
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), isNot(pressed));
    });

    testWidgets('SWT-8: overlay by default; ripple under m3-like from the point of contact on the '
        'round layer; dim under cupertino with no state layer', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(toggle()));
      TestGesture touch = await tester.startGesture(tester.getCenter(handleFinder));
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple, isNull);
      expect(
        stateLayerColor(tester),
        lightTheme.paint(tokens.conditions.unselected.pressed.containerColor),
      );
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(tanreiTestApp(toggle(), theme: m3));
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      touch = await tester.startGesture(layer.topLeft + const Offset(12, 14));
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.origin, const Offset(12, 14));
      expect(
        stateLayerDecoration(tester).ripple!.color,
        m3.paint(m3LikeSystem.switch_.conditions.unselected.pressed.containerColor),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(stateLayerDecoration(tester).ripple, isNull);
      // A press on the far end of the track is outside the round layer: from its center.
      touch = await tester.startGesture(
        tester.getRect(trackFinder).centerRight - const Offset(2, 0),
      );
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.origin, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      await tester.pumpWidget(
        tanreiTestApp(toggle(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      touch = await tester.startGesture(tester.getCenter(handleFinder));
      await tester.pump();
      expect(selectionOpacity(tester, TanreiSwitch), cupertinoSystem.switch_.pressed.opacity);
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
        'SWT-8: under ${feedback.name} the container color stays with the state under the '
        'press${feedback == TanreiPressedFeedback.none ? ', and so does every other part' : '; the handle and track come from the pressed tokens'}',
        (WidgetTester tester) async {
          final TanreiSwitchConditionTokens unselected = tokens.conditions.unselected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            switch_: tokens.copyWith(
              conditions: tokens.conditions.copyWith(
                unselected: unselected.copyWith(
                  pressed: unselected.pressed.copyWith(
                    handleColor: const TanreiPaint.literal(Color(0xFF445566)),
                    trackColor: const TanreiPaint.literal(Color(0xFF778899)),
                    handleSize: 18,
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(tanreiTestApp(toggle(), theme: TanreiThemeData(system: of)));
          final TestGesture mouse = await hoverOver(tester, handleFinder);
          final Color hoveredLayer = stateLayerColor(tester);
          final Color hoveredHandle = handleOf(tester).color;
          await mouse.down(tester.getCenter(handleFinder));
          await tester.pump();
          expect(stateLayerColor(tester), hoveredLayer);
          if (feedback == TanreiPressedFeedback.none) {
            expect(handleOf(tester).color, hoveredHandle);
            expect(tester.getSize(handleFinder), Size.square(unselected.hovered.handleSize));
          } else {
            expect(handleOf(tester).color, const Color(0xFF445566));
            expect(trackOf(tester).fill, const Color(0xFF778899));
            expect(tester.getSize(handleFinder), const Size.square(18));
          }
          await mouse.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets('SWT-9: the track takes the corner smoothing of the system (a pill stays a pill; a '
        'track with a smaller corner shows it); the focus style is a ring or a glow (acme)', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(toggle(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      expect(trackOf(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      // A pill has no room to ease: the smoothed path is the circular capsule (corner_shape.dart).
      expect(trackFinder, paints..path());
      final TanreiSystem squarish = cupertinoSystem.copyWith(
        switch_: cupertinoSystem.switch_.copyWith(trackShape: 6),
      );
      await tester.pumpWidget(tanreiTestApp(toggle(), theme: TanreiThemeData(system: squarish)));
      expect(trackFinder, paints..path());

      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(
          tanreiTestApp(toggle(autofocus: true), theme: TanreiThemeData(system: of)),
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
  });

  group('geometry and motion', () {
    testWidgets('SWT-10: a track of track.width × track.height, outline inside its edge and fill '
        'inside the outline; the handle on the midline half the track height from the start (off) '
        'or the end (on); the round layer centered on it, beyond the track, outside layout', (
      WidgetTester tester,
    ) async {
      for (final bool value in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(toggle(key: ValueKey<bool>(value), value: value, labelHidden: true)),
        );
        final Rect trackRect = tester.getRect(trackFinder);
        expect(trackRect.size, Size(tokens.trackWidth, tokens.trackHeight));
        final Rect handle = tester.getRect(handleFinder);
        final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
        final double inset = tokens.trackHeight / 2;
        expect(handle.center.dy, trackRect.center.dy);
        expect(handle.center.dx, value ? trackRect.right - inset : trackRect.left + inset);
        expect(layer.center, handle.center);
        expect(layer.size, Size.square(tokens.containerSize));
        expect(layer.top, lessThan(trackRect.top), reason: 'extends beyond the track');
        // The token radius as drawn (the engine limits it to the pill).
        final RRect outer = RRect.fromRectAndRadius(
          Offset.zero & trackRect.size,
          Radius.circular(tokens.trackShape),
        );
        final TanreiSwitchConditionStateTokens enabled =
            (value ? tokens.conditions.selected : tokens.conditions.unselected).enabled;
        expect(
          trackFinder,
          value
              // On: track and outline are one color, drawn as one shape.
              ? (paints..rrect(rrect: outer, color: lightTheme.paint(enabled.trackColor)))
              // Off: the fill under the opaque outline, which hides it; the band inside the edge.
              : (paints
                  ..rrect(rrect: outer, color: lightTheme.paint(enabled.trackColor))
                  ..drrect(
                    outer: outer,
                    inner: outer.deflate(tokens.outlineWidth),
                    color: lightTheme.paint(enabled.outlineColor),
                  )),
        );
      }
      // The layout box is the track: the tap target, not the round layer, sets the size.
      expect(tester.getSize(find.byType(TanreiTapTarget)).height, system.measure.targetTouch);
    });

    testWidgets('SWT-11: right-to-left mirrors the handle (off at the right end, on at the left) '
        'and its travel, and places the label mirrored', (WidgetTester tester) async {
      Future<void> pump(bool value) => tester.pumpWidget(
        tanreiTestApp(
          Directionality(
            textDirection: TextDirection.rtl,
            child: toggle(value: value),
          ),
        ),
      );
      await pump(false);
      Rect trackRect = tester.getRect(trackFinder);
      final double inset = tokens.trackHeight / 2;
      expect(tester.getRect(handleFinder).center.dx, trackRect.right - inset);
      expect(trackRect.left - tester.getRect(find.text('Wi-Fi')).right, tokens.labelGap);
      await pump(true);
      await tester.pump(Duration(milliseconds: tokens.motionSelectionDuration) ~/ 2);
      final double midway = tester.getRect(handleFinder).center.dx;
      expect(midway, lessThan(trackRect.right - inset));
      await tester.pumpAndSettle();
      trackRect = tester.getRect(trackFinder);
      expect(tester.getRect(handleFinder).center.dx, trackRect.left + inset);
    });

    testWidgets('SWT-12: with an icon the handle is at least handle.size-with-icon, the glyph is '
        'centered at icon.size with the condition\'s family and fill; each condition shows its '
        'own icon or none', (WidgetTester tester) async {
      final TanreiIconStyle icon = system.icon;
      await tester.pumpWidget(
        tanreiTestApp(toggle(value: true, thumbIcon: thumbIconOf('check', ''))),
      );
      expect(tester.getSize(handleFinder), Size.square(tokens.handleSizeWithIcon));
      final Finder check = find.text(glyphs['check']!);
      expect(tester.getSize(check), Size.square(tokens.iconSize));
      expect(tester.getCenter(check), tester.getCenter(handleFinder));
      final TextStyle style = DefaultTextStyle.of(tester.element(check)).style;
      expect(style.fontFamily, icon.family(selected: true));
      expect(style.color, lightTheme.paint(tokens.conditions.selected.enabled.iconColor));
      expect(IconTheme.of(tester.element(check)).fill, icon.fill(selected: true));
      expect(IconTheme.of(tester.element(check)).weight, icon.weight);

      // Off, with no unselected icon: no glyph, the bare handle size.
      await tester.pumpWidget(
        tanreiTestApp(toggle(key: const ValueKey<int>(2), thumbIcon: thumbIconOf('check', ''))),
      );
      expect(find.text(glyphs['check']!), findsNothing);
      expect(
        tester.getSize(handleFinder),
        Size.square(tokens.conditions.unselected.enabled.handleSize),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          toggle(key: const ValueKey<int>(3), thumbIcon: thumbIconOf('check', 'close')),
        ),
      );
      final Finder close = find.text(glyphs['close']!);
      expect(close, findsOneWidget);
      expect(
        DefaultTextStyle.of(tester.element(close)).style.fontFamily,
        icon.family(selected: false),
      );
      // The icon is decorative.
      final SemanticsHandle handle = tester.ensureSemantics();
      expect(semanticsOfTarget(tester).label, 'Wi-Fi');
      handle.dispose();
    });

    testWidgets('SWT-13: the handle travels, and the colors change, over the selection motion '
        '(a spring that may overshoot); where motion is reduced the new condition shows at once', (
      WidgetTester tester,
    ) async {
      final Duration duration = Duration(milliseconds: tokens.motionSelectionDuration);
      final Curve curve = tokens.motionSelectionEasing.toCurve();
      Future<void> pump(bool value, {bool reduced = false}) => tester.pumpWidget(
        tanreiTestApp(toggle(value: value, labelHidden: true), disableAnimations: reduced),
      );
      await pump(false);
      final Rect trackRect = tester.getRect(trackFinder);
      final double start = trackRect.left + tokens.trackHeight / 2;
      final double end = trackRect.right - tokens.trackHeight / 2;
      await pump(true);
      expect(tester.getRect(handleFinder).center.dx, start);
      await tester.pump(duration ~/ 2);
      expect(
        tester.getRect(handleFinder).center.dx,
        moreOrLessEquals(start + (end - start) * curve.transform(0.5), epsilon: 0.01),
      );
      final Color midTrack = trackOf(tester).fill;
      expect(midTrack, isNot(light.primary));
      await tester.pumpAndSettle();
      expect(tester.getRect(handleFinder).center.dx, end);
      expect(trackOf(tester).fill, light.primary);

      await pump(false, reduced: true);
      expect(tester.getRect(handleFinder).center.dx, start);
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('semantics and label', () {
    testWidgets('SWT-14: a switch that is on or off (toggled), never a checkbox', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final bool value in <bool>[false, true]) {
        await tester.pumpWidget(tanreiTestApp(toggle(value: value)));
        final SemanticsData data = semanticsOfTarget(tester);
        expect(data.hasFlag(SemanticsFlag.hasToggledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isToggled), value);
        expect(data.hasFlag(SemanticsFlag.hasCheckedState), isFalse);
        expect(data.label, 'Wi-Fi');
      }
      handle.dispose();
    });

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: tap targets, labeled target and text contrast '
          '(${theme.brightness.name})', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        for (final bool labelHidden in <bool>[false, true]) {
          await tester.pumpWidget(
            tanreiTestApp(toggle(value: true, labelHidden: labelHidden), theme: theme),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
        handle.dispose();
      });
    }

    test('non-text contrast: the off handle and the on track meet 3:1 against the surface in every '
        'scheme', () {
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
          final Color surface = theme.colors.surface;
          final String reason = '${brightness.name} ${contrast.name}';
          expect(
            contrastOf(theme.paint(tokens.conditions.unselected.enabled.handleColor), surface),
            greaterThanOrEqualTo(3),
            reason: reason,
          );
          expect(
            contrastOf(theme.paint(tokens.conditions.selected.enabled.trackColor), surface),
            greaterThanOrEqualTo(3),
            reason: reason,
          );
        }
      }
    });

    test('an unknown condition key resolves to the default and is reported', () {
      final List<String> reports = collectUnknownValues();
      const TanreiSwitchCondition unknown = TanreiSwitchCondition('pending');
      expect(identical(tokens.conditions[unknown], tokens.conditions.unselected), isTrue);
      expect(reports, <String>['switch condition "pending" -> unselected']);
    });

    testWidgets('SWT-15: the label sits label.gap after the track in label.typescale and wraps', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(toggle()));
      expect(
        tester.getRect(find.text('Wi-Fi')).left - tester.getRect(trackFinder).right,
        tokens.labelGap,
      );
      expect(labelStyle(tester, TanreiSwitch).fontSize, tokens.labelTypescale.size);
      await tester.pumpWidget(
        tanreiTestApp(SizedBox(width: 120, child: toggle(label: 'Use cellular data when away'))),
      );
      expect(
        tester.getSize(find.text('Use cellular data when away')).height,
        greaterThan(tokens.labelTypescale.lineHeight),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('SWT-16: labelHidden draws no label and keeps the name; an empty label renders and '
        'is reported once', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(toggle(labelHidden: true)));
      expect(find.byType(Text), findsNothing);
      expect(semanticsOfTarget(tester).label, 'Wi-Fi');
      handle.dispose();
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(toggle(label: '')));
      expect(trackFinder, findsOneWidget);
      await tester.pumpWidget(tanreiTestApp(toggle(label: '', value: true)));
      expect(reports, <String>['switch']);
    });
  });

  group('a design system drives rendering', () {
    for (final TanreiSystem of in shippedSystems) {
      testWidgets('"${of.id}": both conditions at rest draw that system\'s tokens and sizes', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: of);
        for (final bool value in <bool>[false, true]) {
          await tester.pumpWidget(tanreiTestApp(toggle(value: value), theme: theme));
          await tester.pumpAndSettle();
          expectParts(
            tester,
            theme,
            (value ? of.switch_.conditions.selected : of.switch_.conditions.unselected).enabled,
          );
          expect(tester.getSize(trackFinder), Size(of.switch_.trackWidth, of.switch_.trackHeight));
          expect(
            tester.getSize(find.byType(TanreiStateLayer)),
            Size.square(of.switch_.containerSize),
          );
        }
      });
    }

    testWidgets('cupertino raises the handle at level 1: its shadows are drawn', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(toggle(), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      final TanreiResolvedElevation elevation = handleOf(tester).elevation;
      expect(
        elevation.shadows.isNotEmpty || elevation.ring != null,
        cupertinoSystem.elevation.level1.isNotEmpty,
      );
      expect(handleOf(tester).color, cupertinoSystem.schemes.light.onPrimary);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('switch');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'unselected',
        'selected',
        'disabled-unselected',
        'disabled-selected',
        'selected-icon',
        'unselected-icon',
        'label-hidden',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: switchOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/switch/$id.png',
          surface: labelledGoldenSurface,
        );
      });
    }

    // One representative fixture per shipped preset: on, with a glyph, shows the track, the
    // handle's position, size (with an icon) and elevation, and the label style at once.
    const String recorded = 'selected-icon';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: switchOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/switch/${preset.id}/$recorded.png',
          surface: labelledGoldenSurface,
        );
      });
    }
  });

  group('motion and alignment', () {
    testWidgets(
      'SWT-3: a part the interaction states recolor changes over the state motion, as the '
      'container does, and pressed at once; only a change of condition uses the selection motion',
      (WidgetTester tester) async {
        const Color hoveredHandle = Color(0xFF3366CC);
        const Color pressedHandle = Color(0xFFCC3366);
        final TanreiSwitchConditionTokens unselected = tokens.conditions.unselected;
        final TanreiSystem product = system.copyWith(
          switch_: tokens.copyWith(
            conditions: tokens.conditions.copyWith(
              unselected: unselected.copyWith(
                hovered: unselected.hovered.copyWith(
                  handleColor: const TanreiPaint.literal(hoveredHandle),
                ),
                pressed: unselected.pressed.copyWith(
                  handleColor: const TanreiPaint.literal(pressedHandle),
                ),
              ),
            ),
          ),
        );
        await tester.pumpWidget(tanreiTestApp(toggle(), theme: TanreiThemeData(system: product)));
        final Color rest = handleOf(tester).color;
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(handleFinder));
        await tester.pump();
        final Duration state = Duration(milliseconds: tokens.motionStateDuration);
        await tester.pump(state ~/ 3);
        final double t = tokens.motionStateEasing.toCurve().transform(1 / 3);
        expect(handleOf(tester).color, isSameColorAs(tanreiLerpColor(rest, hoveredHandle, t)));
        await tester.pump(state);
        expect(handleOf(tester).color, hoveredHandle);
        await mouse.down(tester.getCenter(handleFinder));
        await tester.pump();
        expect(handleOf(tester).color, pressedHandle, reason: 'pressed applies at once');
        await mouse.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets('SWT-8: a press on the label, outside the round container, grows the ripple from '
        'the container\'s center', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(toggle(), theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      final TestGesture touch = await tester.startGesture(tester.getCenter(find.text('Wi-Fi')));
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.origin, isNull, reason: 'null: the center');
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final double scale in <double>[1, 2]) {
      testWidgets('SWT-15: the track is centered on the first line of a wrapping label '
          '(text scale $scale)', (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: SizedBox(width: 160, child: toggle(label: 'Use cellular data when away')),
            ),
          ),
        );
        final Rect label = tester.getRect(find.text('Use cellular data when away'));
        final double line = tokens.labelTypescale.lineHeight * scale;
        expect(label.height, greaterThan(line), reason: 'the label wraps');
        expect(
          tester.getCenter(trackFinder).dy,
          moreOrLessEquals(label.top + line / 2, epsilon: 0.01),
        );
        expect(tester.takeException(), isNull);
      });
    }
  });
}
