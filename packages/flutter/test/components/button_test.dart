import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

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

const TanreiSystem system = tanreiSystem;
final TanreiButtonTokens buttonTokens = system.button;
final TanreiColors light = system.schemes.light;

/// What the pre-paint implementation drew: [layer] at [opacity] composited over [container].
Color overlaid(Color container, Color layer, double opacity) =>
    Color.alphaBlend(layer.withValues(alpha: layer.a * opacity), container);

Matcher isSameColorAs(Color expected) => isA<Color>()
    .having((Color c) => c.a, 'a', closeTo(expected.a, 1e-6))
    .having((Color c) => c.r, 'r', closeTo(expected.r, 1e-6))
    .having((Color c) => c.g, 'g', closeTo(expected.g, 1e-6))
    .having((Color c) => c.b, 'b', closeTo(expected.b, 1e-6));

/// The whole-control opacity the current state applies.
double controlOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.descendant(of: find.byType(TanreiButton), matching: find.byType(Opacity)))
    .opacity;

/// The decoration of the visual container (the first box inside the focus ring).
TanreiContainerDecoration containerDecoration(WidgetTester tester) {
  final DecoratedBox box = tester.widget(
    find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first,
  );
  return box.decoration as TanreiContainerDecoration;
}

Size containerSize(WidgetTester tester) => tester.getSize(
  find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first,
);

Color labelColor(WidgetTester tester, String label) =>
    DefaultTextStyle.of(tester.element(find.text(label))).style.color!;

bool focusRingVisible(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    testWidgets('BTN-1: a tap emits onPressed exactly once', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
      );
      await tester.tap(find.byType(TanreiButton));
      await tester.pumpAndSettle();
      expect(pressed, 1);
    });

    testWidgets('BTN-1: a mouse click emits onPressed exactly once', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
      );
      await tester.tap(find.byType(TanreiButton), kind: PointerDeviceKind.mouse);
      await tester.pumpAndSettle();
      expect(pressed, 1);
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      testWidgets('BTN-1: ${key.keyLabel.trim().isEmpty ? 'Space' : key.keyLabel} emits onPressed '
          'exactly once', (WidgetTester tester) async {
        int pressed = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(
              onPressed: () => pressed++,
              focusNode: focusNode,
              child: const Text('Deploy'),
            ),
          ),
        );
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasPrimaryFocus, isTrue);

        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    testWidgets('BTN-1: keyboard activation works without an app-level Shortcuts widget', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Center(
              child: TanreiButton(
                onPressed: () => pressed++,
                autofocus: true,
                child: const Text('Deploy'),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 2);
    });

    testWidgets('BTN-1: the semantic tap action emits onPressed exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
      );
      tester.semantics.tap(find.semantics.byLabel('Deploy'));
      await tester.pump();
      expect(pressed, 1);
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('BTN-2: a null onPressed emits nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: null, focusNode: focusNode, child: const Text('Deploy')),
        ),
      );

      // No callback exists to fire; tapping and keys must also not throw or focus the button.
      await tester.tap(find.byType(TanreiButton));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);

      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Deploy',
          isButton: true,
          hasEnabledState: true,
          isEnabled: false,
          isFocusable: false,
          hasTapAction: false,
          hasFocusAction: false,
        ),
      );
      handle.dispose();
    });

    testWidgets('BTN-2: disabling a button stops click and removes it from the focus order', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool enabled}) => tanreiTestApp(
        TanreiButton(
          onPressed: enabled ? () => pressed++ : null,
          focusNode: focusNode,
          child: const Text('Deploy'),
        ),
      );

      await tester.pumpWidget(build(enabled: true));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);

      await tester.pumpWidget(build(enabled: false));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.tap(find.byType(TanreiButton));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 0);
    });

    testWidgets('BTN-6: disabled container and label are drawn from the disabled tokens '
        '(on-surface at the disabled opacities in the default system)', (
      WidgetTester tester,
    ) async {
      for (final TanreiButtonVariant variant in <TanreiButtonVariant>[
        TanreiButtonVariant.filled,
        TanreiButtonVariant.tonal,
        TanreiButtonVariant.elevated,
      ]) {
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(onPressed: null, variant: variant, child: const Text('Deploy')),
          ),
        );
        final TanreiContainerDecoration decoration = containerDecoration(tester);
        expect(decoration.color!.a, closeTo(system.state.disabledContainerOpacity, 1e-6));
        expect(decoration.color!.withValues(alpha: 1), light.onSurface, reason: '$variant');
        expect(decoration.boxShadow, isNull, reason: 'disabled $variant has no elevation');
        expect(decoration.border, isNull);

        final Color label = labelColor(tester, 'Deploy');
        expect(label.a, closeTo(system.state.disabledContentOpacity, 1e-6));
        expect(label.withValues(alpha: 1), light.onSurface);
        expect(controlOpacity(tester), buttonTokens.disabled.opacity);
      }
    });

    testWidgets('BTN-6: disabled outlined and text variants keep no fill', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          const TanreiButton(
            onPressed: null,
            variant: TanreiButtonVariant.outlined,
            child: Text('Deploy'),
          ),
        ),
      );
      TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, isNull);
      expect(
        decoration.border!.top.color,
        const TanreiThemeData().paint(buttonTokens.variants.outlined.disabled.outlineColor),
      );
      expect(decoration.border!.top.color.a, closeTo(system.state.disabledContainerOpacity, 1e-6));
      expect(labelColor(tester, 'Deploy').a, closeTo(system.state.disabledContentOpacity, 1e-6));

      await tester.pumpWidget(
        tanreiTestApp(
          const TanreiButton(
            onPressed: null,
            variant: TanreiButtonVariant.text,
            child: Text('Deploy'),
          ),
        ),
      );
      decoration = containerDecoration(tester);
      expect(decoration.color, isNull);
      expect(decoration.border, isNull);
      expect(labelColor(tester, 'Deploy').a, closeTo(system.state.disabledContentOpacity, 1e-6));
    });
  });

  group('interaction states', () {
    testWidgets('BTN-3: container, label, outline, elevation and opacity come from the tokens of '
        'the highest-precedence state, pressed > focused > hovered', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData.light;
      final TanreiButtonVariantTokens filled = buttonTokens.variants.filled;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, focusNode: focusNode, child: const Text('Deploy')),
        ),
      );
      void expectDrawnFrom(TanreiButtonVariantStateTokens tokens) {
        expect(containerDecoration(tester).color, theme.paint(tokens.containerColor));
        expect(labelColor(tester, 'Deploy'), theme.paint(tokens.labelColor));
        expect(containerDecoration(tester).border, isNull);
        expect(containerDecoration(tester).boxShadow, isNull);
      }

      expectDrawnFrom(filled.enabled);
      expect(containerDecoration(tester).color, light.primary);
      expect(labelColor(tester, 'Deploy'), light.onPrimary);

      // Hovered. In the default system the state is a mix that equals the former state-layer overlay.
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.hovered);
      expect(
        containerDecoration(tester).color,
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.hoverStateLayerOpacity),
        ),
      );
      expect(controlOpacity(tester), buttonTokens.hovered.opacity);

      // Focused wins over hovered.
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.focused);
      expect(
        containerDecoration(tester).color,
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.focusStateLayerOpacity),
        ),
      );

      // Pressed wins over focused and hovered.
      await mouse.down(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.pressed);
      expect(
        containerDecoration(tester).color,
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.pressedStateLayerOpacity),
        ),
      );
      expect(controlOpacity(tester), buttonTokens.pressed.opacity);

      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.enabled);
      expect(controlOpacity(tester), 1);
    });

    testWidgets('BTN-3: variants without a fill draw the state mix over nothing', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            variant: TanreiButtonVariant.outlined,
            child: const Text('Deploy'),
          ),
        ),
      );
      expect(containerDecoration(tester).color, isNull);
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      expect(
        containerDecoration(tester).color,
        isSameColorAs(light.onSurface.withValues(alpha: system.state.hoverStateLayerOpacity)),
      );
      expect(containerDecoration(tester).border!.top.color, light.outline);
    });

    test('BTN-3: state resolution selects exactly one state', () {
      expect(tanreiInteractionStateOf(<WidgetState>{}), TanreiInteractionState.enabled);
      expect(
        tanreiInteractionStateOf(<WidgetState>{WidgetState.hovered}),
        TanreiInteractionState.hovered,
      );
      expect(
        tanreiInteractionStateOf(<WidgetState>{WidgetState.hovered, WidgetState.focused}),
        TanreiInteractionState.focused,
      );
      expect(
        tanreiInteractionStateOf(<WidgetState>{
          WidgetState.hovered,
          WidgetState.focused,
          WidgetState.pressed,
        }),
        TanreiInteractionState.pressed,
      );
      expect(
        tanreiInteractionStateOf(<WidgetState>{
          WidgetState.disabled,
          WidgetState.hovered,
          WidgetState.pressed,
        }),
        TanreiInteractionState.disabled,
      );
    });

    testWidgets('BTN-3: a state change eases with the motion tokens, pressed applies immediately, '
        'and nothing animates when animations are disabled', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData.light;
      final Color resting = theme.paint(buttonTokens.variants.filled.enabled.containerColor);
      final Color hovered = theme.paint(buttonTokens.variants.filled.hovered.containerColor);
      final Color pressed = theme.paint(buttonTokens.variants.filled.pressed.containerColor);
      final Duration partWay = Duration(milliseconds: buttonTokens.motionStateDuration ~/ 3);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<TestGesture> hoverWith({required bool disableAnimations}) async {
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(key: UniqueKey(), onPressed: () {}, child: const Text('Deploy')),
            disableAnimations: disableAnimations,
          ),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(disableAnimations: false);
      expect(containerDecoration(tester).color, resting);
      await tester.pump(partWay);
      final Color between = containerDecoration(tester).color!;
      expect(between, isNot(resting));
      expect(between, isNot(hovered));
      final double progress = buttonTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(between, isSameColorAs(Color.lerp(resting, hovered, progress)!));
      await tester.pump(tanreiDuration(buttonTokens.motionStateDuration));
      expect(containerDecoration(tester).color, hovered);

      // Pressed: one frame, no elapsed time.
      await mouse.down(tester.getCenter(find.byType(TanreiButton)));
      await tester.pump();
      expect(containerDecoration(tester).color, pressed);
      // Leaving pressed eases again.
      await mouse.up();
      await tester.pump();
      await tester.pump(partWay);
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, hovered);
      await mouse.removePointer();

      await hoverWith(disableAnimations: true);
      expect(containerDecoration(tester).color, hovered);
    });
  });

  group('focus ring', () {
    testWidgets('BTN-4: keyboard focus shows the focus ring immediately', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(
          Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[TanreiButton(onPressed: () {}, child: const Text('Deploy'))],
          ),
        ),
      );
      expect(focusRingVisible(tester), isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      // One frame, no elapsed time: the ring is not animated.
      await tester.pump();
      expect(focusRingVisible(tester), isTrue);

      // No inner stroke in the default system: the offset is a gap, then the outer stroke.
      final TanreiMeasure measure = system.measure;
      expect(measure.focusInnerWidth, 0);
      final double offset = measure.focusOffset + measure.focusOuterWidth / 2;
      final Rect visual = Offset.zero & containerSize(tester);
      final RRect expectedRing = BorderRadius.circular(
        buttonTokens.focused.containerShape,
      ).toRRect(visual).inflate(offset);
      expect(
        find.byType(TanreiFocusRing),
        paints..something((Symbol method, List<dynamic> arguments) {
          if (method != #drawRRect) {
            return false;
          }
          final Paint paint = arguments[1] as Paint;
          return arguments[0] == expectedRing &&
              paint.style == PaintingStyle.stroke &&
              paint.strokeWidth == measure.focusOuterWidth &&
              paint.color.toARGB32() == light.focusRing.toARGB32();
        }),
      );
    });

    testWidgets('BTN-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, focusNode: focusNode, child: const Text('Deploy')),
        ),
      );
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(focusRingVisible(tester), isFalse);
      // BTN-3: pointer or touch focus does not select the focused state either.
      expect(
        containerDecoration(tester).color,
        const TanreiThemeData().paint(buttonTokens.variants.filled.enabled.containerColor),
      );
    });
  });

  group('target size', () {
    testWidgets('BTN-5: the hit area extends to sys.target without changing the visual size', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('OK'))),
      );
      expect(containerSize(tester).height, 36);
      expect(containerSize(tester).height, buttonTokens.sizes.medium.containerHeight);

      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.height, greaterThanOrEqualTo(48));
      expect(target.width, greaterThanOrEqualTo(48));
      expect(target.height, system.measure.targetTouch);

      // Tap in the extended area, above the 36px visual container.
      final Rect visual = tester.getRect(
        find
            .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
            .first,
      );
      final Offset above = Offset(target.center.dx, target.top + 1);
      expect(visual.contains(above), isFalse);
      await tester.tapAt(above);
      expect(pressed, 1);

      // Just outside the target does nothing.
      await tester.tapAt(Offset(target.center.dx, target.top - 1));
      expect(pressed, 1);
    });

    testWidgets('BTN-5: every size keeps its token height inside a 48px target', (
      WidgetTester tester,
    ) async {
      const Map<TanreiButtonSize, double> heights = <TanreiButtonSize, double>{
        TanreiButtonSize.small: 32,
        TanreiButtonSize.medium: 36,
        TanreiButtonSize.large: 40,
      };
      for (final MapEntry<TanreiButtonSize, double> entry in heights.entries) {
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(onPressed: () {}, size: entry.key, child: const Text('Deploy')),
          ),
        );
        expect(containerSize(tester).height, entry.value, reason: '${entry.key}');
        expect(tester.getSize(find.byType(TanreiTapTarget)).height, 48);
      }
    });

    testWidgets('the container grows with large text instead of truncating', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: TanreiButton(onPressed: () {}, child: const Text('Deploy')),
          ),
        ),
      );
      expect(containerSize(tester).height, greaterThan(buttonTokens.sizes.medium.containerHeight));
      expect(tester.takeException(), isNull);
    });
  });

  group('anatomy', () {
    testWidgets('the icon slot leads the label at the token size and gap', (
      WidgetTester tester,
    ) async {
      const Key iconKey = Key('icon');
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            icon: Builder(
              key: iconKey,
              builder: (BuildContext context) =>
                  SizedBox.square(dimension: IconTheme.of(context).size),
            ),
            child: const Text('Deploy'),
          ),
        ),
      );
      final Rect icon = tester.getRect(find.byKey(iconKey));
      final Rect label = tester.getRect(find.text('Deploy'));
      expect(icon.size, Size.square(buttonTokens.sizes.medium.iconSize));
      expect(label.left - icon.right, buttonTokens.sizes.medium.containerGap);
    });

    testWidgets('variants bind container, label and outline to their comp.button tokens', (
      WidgetTester tester,
    ) async {
      final TanreiColors colors = system.schemes.dark;
      Future<TanreiContainerDecoration> pump(TanreiButtonVariant variant) async {
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(onPressed: () {}, variant: variant, child: const Text('Deploy')),
            theme: TanreiThemeData.dark,
          ),
        );
        return containerDecoration(tester);
      }

      TanreiContainerDecoration decoration = await pump(TanreiButtonVariant.filled);
      expect(decoration.color, colors.primary);
      expect(decoration.borderRadius, BorderRadius.circular(system.shape.small));
      expect(labelColor(tester, 'Deploy'), colors.onPrimary);

      decoration = await pump(TanreiButtonVariant.tonal);
      expect(decoration.color, colors.secondaryContainer);
      expect(labelColor(tester, 'Deploy'), colors.onSecondaryContainer);

      decoration = await pump(TanreiButtonVariant.elevated);
      expect(decoration.color, colors.surfaceContainerLowest);
      expect(decoration.border!.top.color, colors.elevationRing);
      expect(decoration.boxShadow, hasLength(system.elevation.level2.length - 1));
      expect(decoration.boxShadow!.single.color, colors.elevationShadow1);

      decoration = await pump(TanreiButtonVariant.outlined);
      expect(decoration.color, isNull);
      expect(decoration.border!.top.color, colors.outline);
      expect(decoration.border!.top.width, system.measure.borderHairline);

      decoration = await pump(TanreiButtonVariant.text);
      expect(decoration.color, isNull);
      expect(decoration.border, isNull);
      expect(labelColor(tester, 'Deploy'), colors.onSurface);
    });
  });

  group('accessibility', () {
    testWidgets('semantics: button role, enabled state, label and tap action', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () {}, child: const Text('Deploy'))),
      );
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Deploy',
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );

      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            semanticLabel: 'Deploy to production',
            child: const Text('Go'),
          ),
        ),
      );
      expect(tester.getSemantics(find.byType(TanreiTapTarget)).label, 'Deploy to production');
      handle.dispose();
    });

    for (final TanreiButtonVariant variant in TanreiButtonVariant.core) {
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        testWidgets('guidelines: ${variant.name} on ${theme.brightness.name}', (
          WidgetTester tester,
        ) async {
          final SemanticsHandle handle = tester.ensureSemantics();
          await tester.pumpWidget(
            tanreiTestApp(
              TanreiButton(
                onPressed: () {},
                variant: variant,
                size: TanreiButtonSize.small,
                child: const Text('OK'),
              ),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
          handle.dispose();
        });
      }
    }
  });

  group('a design system drives rendering', () {
    // A product's system: same vocabulary, other values. Nothing here is what Tanrei ships.
    const Color hoverFill = Color(0xFF00AA55);
    const Color hoverLabel = Color(0xFF001122);
    const Color disabledFill = Color(0xFF334455);
    final TanreiButtonTokens base = tanreiSystem.button;
    final TanreiSystem product = tanreiSystem.copyWith(
      id: 'product',
      schemes: tanreiSystem.schemes.copyWith(
        light: tanreiSystem.schemes.light.copyWith(focusRingInner: const Color(0xFFFFFFFF)),
      ),
      measure: tanreiSystem.measure.copyWith(focusOffset: -4, focusInnerWidth: 1, targetTouch: 60),
      button: base.copyWith(
        sizes: base.sizes.copyWith(
          medium: base.sizes.medium.copyWith(
            containerPaddingInlineStart: base.sizes.medium.containerPaddingInlineStart * 2,
            containerPaddingInlineStartWithIcon: base.sizes.medium.containerPaddingInlineStart * 3,
            containerPaddingBlock: 30,
          ),
        ),
        variants: base.variants.copyWith(
          filled: base.variants.filled.copyWith(
            hovered: base.variants.filled.hovered.copyWith(
              containerColor: const TanreiPaint.literal(hoverFill),
              labelColor: const TanreiPaint.literal(hoverLabel),
              outlineColor: const TanreiPaint.role(TanreiColorRole.error),
              containerElevation: tanreiSystem.elevation.level3,
            ),
            disabled: base.variants.filled.disabled.copyWith(
              containerColor: const TanreiPaint.literal(disabledFill),
              outlineColor: const TanreiPaint.role(TanreiColorRole.outlineVariant),
              containerElevation: tanreiSystem.elevation.level2,
            ),
          ),
        ),
        pressed: base.pressed.copyWith(containerShape: 2, opacity: 0.4),
        disabled: base.disabled.copyWith(containerShape: 0, opacity: 0.5),
      ),
    );
    final TanreiThemeData theme = TanreiThemeData(system: product);

    Future<TestGesture> hover(WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      return mouse;
    }

    testWidgets('BTN-3: hovered draws the hovered paints, outline and elevation of the system', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, child: const Text('Deploy')),
          theme: theme,
        ),
      );
      expect(containerDecoration(tester).color, light.primary);
      await hover(tester);

      final TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, hoverFill);
      expect(labelColor(tester, 'Deploy'), hoverLabel);
      final BorderSide outline = decoration.border!.top;
      expect(outline.color, light.error);
      expect(outline.width, base.sizes.medium.outlineWidth);
      expect(outline.strokeAlign, BorderSide.strokeAlignInside);
      expect(decoration.boxShadow, hasLength(tanreiSystem.elevation.level3.length - 1));

      // The elevation ring is still drawn, outside the outline.
      final DecoratedBox ring = tester.widget(
        find
            .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
            .at(1),
      );
      expect(ring.position, DecorationPosition.foreground);
      final BorderSide ringSide = (ring.decoration as TanreiContainerDecoration).border!.top;
      expect(ringSide.color, light.elevationRing);
      expect(ringSide.strokeAlign, BorderSide.strokeAlignOutside);
    });

    testWidgets('BTN-3: pressed takes its shape and opacity from the pressed tokens, at once', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, child: const Text('Deploy')),
          theme: theme,
        ),
      );
      expect(containerDecoration(tester).borderRadius, BorderRadius.circular(base.containerShape));
      expect(controlOpacity(tester), 1);

      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      addTearDown(touch.removePointer);
      await tester.pump();
      expect(containerDecoration(tester).borderRadius, BorderRadius.circular(2));
      expect(controlOpacity(tester), 0.4);
      expect(
        tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).borderRadius,
        BorderRadius.circular(2),
      );

      // The press was shorter than the press-hold duration, so it stays visible until then
      // (BTN-8). Leaving pressed eases back: part-way, shape and opacity are between the two states.
      await touch.up();
      await tester.pump();
      expect(controlOpacity(tester), 0.4);
      await tester.pump(tanreiDuration(product.motion.duration.pressHold));
      await tester.pump();
      await tester.pump(Duration(milliseconds: base.motionStateDuration ~/ 3));
      expect(controlOpacity(tester), allOf(greaterThan(0.4), lessThan(1)));
      await tester.pumpAndSettle();
      expect(controlOpacity(tester), 1);
      expect(containerDecoration(tester).borderRadius, BorderRadius.circular(base.containerShape));
    });

    testWidgets('BTN-6: disabled draws the disabled tokens of the system, whatever they are', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(const TanreiButton(onPressed: null, child: Text('Deploy')), theme: theme),
      );
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, disabledFill);
      expect(decoration.border!.top.color, light.outlineVariant);
      expect(decoration.boxShadow, hasLength(tanreiSystem.elevation.level2.length - 1));
      expect(decoration.borderRadius, BorderRadius.circular(0));
      expect(controlOpacity(tester), 0.5);
      expect(labelColor(tester, 'Deploy'), theme.paint(base.variants.filled.disabled.labelColor));
    });

    testWidgets('padding is directional: start, start-with-icon, end and block tokens', (
      WidgetTester tester,
    ) async {
      const Key iconKey = Key('icon');
      Future<void> pump({required bool icon, required TextDirection direction}) =>
          tester.pumpWidget(
            tanreiTestApp(
              Directionality(
                textDirection: direction,
                child: TanreiButton(
                  onPressed: () {},
                  icon: icon ? const SizedBox.square(key: iconKey, dimension: 16) : null,
                  child: const Text('Deploy'),
                ),
              ),
              theme: theme,
            ),
          );
      Rect container() => tester.getRect(
        find
            .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
            .first,
      );

      await pump(icon: false, direction: TextDirection.ltr);
      Rect label = tester.getRect(find.text('Deploy'));
      expect(label.left - container().left, base.sizes.medium.containerPaddingInlineStart * 2);
      expect(container().right - label.right, base.sizes.medium.containerPaddingInlineEnd);
      // Height is a minimum: the block padding of this system makes the container taller.
      expect(container().height, label.height + 2 * 30);
      expect(container().height, greaterThan(base.sizes.medium.containerHeight));

      await pump(icon: true, direction: TextDirection.ltr);
      expect(
        tester.getRect(find.byKey(iconKey)).left - container().left,
        base.sizes.medium.containerPaddingInlineStart * 3,
      );

      // Right-to-left: start is the right edge.
      await pump(icon: false, direction: TextDirection.rtl);
      label = tester.getRect(find.text('Deploy'));
      expect(container().right - label.right, base.sizes.medium.containerPaddingInlineStart * 2);
      expect(label.left - container().left, base.sizes.medium.containerPaddingInlineEnd);

      await pump(icon: true, direction: TextDirection.rtl);
      expect(
        container().right - tester.getRect(find.byKey(iconKey)).right,
        base.sizes.medium.containerPaddingInlineStart * 3,
      );
    });

    testWidgets('BTN-4: the focus indicator is offset (negative = inside), inner stroke, then '
        'outer stroke', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, autofocus: true, child: const Text('Deploy')),
          theme: theme,
        ),
      );
      await tester.pump();
      expect(focusRingVisible(tester), isTrue);

      final Rect visual = Offset.zero & containerSize(tester);
      final RRect control = BorderRadius.circular(base.focused.containerShape).toRRect(visual);
      final double outerWidth = product.measure.focusOuterWidth;
      bool strokes(List<dynamic> arguments, RRect shape, double width, Color color) {
        final Paint paint = arguments[1] as Paint;
        return arguments[0] == shape &&
            paint.style == PaintingStyle.stroke &&
            paint.strokeWidth == width &&
            paint.color.toARGB32() == color.toARGB32();
      }

      expect(
        find.byType(TanreiFocusRing),
        paints
          // Inner stroke: from 4 inside the edge to 3 inside, centered 3.5 inside.
          ..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawRRect &&
                strokes(arguments, control.inflate(-4 + 1 / 2), 1, const Color(0xFFFFFFFF)),
          )
          // Outer stroke: starts where the inner stroke ends.
          ..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawRRect &&
                strokes(
                  arguments,
                  control.inflate(-4 + 1 + outerWidth / 2),
                  outerWidth,
                  light.focusRing,
                ),
          ),
      );
    });

    testWidgets('BTN-5: the minimum target is the touch target token of the system', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, size: TanreiButtonSize.small, child: const Text('OK')),
          theme: theme,
        ),
      );
      expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(60));
      expect(containerSize(tester).height, base.sizes.small.containerHeight);
    });

    testWidgets('a button re-reads its tokens when the system in the theme changes', (
      WidgetTester tester,
    ) async {
      final Widget button = TanreiButton(onPressed: () {}, child: const Text('Deploy'));
      await tester.pumpWidget(tanreiTestApp(button));
      final double before = containerSize(tester).width;
      await tester.pumpWidget(tanreiTestApp(button, theme: theme));
      expect(containerSize(tester).width, before + base.sizes.medium.containerPaddingInlineStart);
    });
  });

  group('open size and variant keys', () {
    /// The pixels of [child] on the light surface, captured like the goldens.
    Future<List<int>> pixelsOf(WidgetTester tester, Widget child) async {
      final GlobalKey boundaryKey = GlobalKey();
      await tester.pumpWidget(
        tanreiTestApp(
          RepaintBoundary(
            key: boundaryKey,
            child: SizedBox(width: 160, height: 80, child: Center(child: child)),
          ),
        ),
      );
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ByteData bytes = (await tester.runAsync(() async {
        final ui.Image image = await boundary.toImage();
        final ByteData data = (await image.toByteData())!;
        image.dispose();
        return data;
      }))!;
      return bytes.buffer.asUint8List();
    }

    /// Collects what the lookups report instead of failing the test, and restores the reporter.
    List<String> collectReports() {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add('$kind "$key" -> $fallback');
      addTearDown(() => debugTanreiReportUnknownValue = previous);
      return reports;
    }

    testWidgets('BTN-7: a size and a variant the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectReports();
      const TanreiButtonSize unknownSize = TanreiButtonSize('3x');
      const TanreiButtonVariant unknownVariant = TanreiButtonVariant('danger');
      expect(buttonTokens.sizes.has(unknownSize), isFalse);
      expect(buttonTokens.variants.has(unknownVariant), isFalse);

      final List<int> unknown = await pixelsOf(
        tester,
        TanreiButton(
          onPressed: () {},
          size: unknownSize,
          variant: unknownVariant,
          child: const Text('Deploy'),
        ),
      );
      expect(tester.takeException(), isNull);
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      final Size size = containerSize(tester);
      final TextStyle label = DefaultTextStyle.of(tester.element(find.text('Deploy'))).style;
      expect(reports, contains('button size "3x" -> medium'));
      expect(reports, contains('button variant "danger" -> filled'));

      reports.clear();
      final List<int> defaults = await pixelsOf(
        tester,
        TanreiButton(
          onPressed: () {},
          size: TanreiButtonSize.medium,
          variant: TanreiButtonVariant.filled,
          child: const Text('Deploy'),
        ),
      );
      expect(reports, isEmpty);
      expect(decoration, containerDecoration(tester));
      expect(size, containerSize(tester));
      expect(size.height, buttonTokens.sizes.medium.containerHeight);
      expect(label, DefaultTextStyle.of(tester.element(find.text('Deploy'))).style);
      expect(unknown, defaults, reason: 'pixel for pixel the default button');
    });

    testWidgets('BTN-7: an unknown value follows the default through states and disabled', (
      WidgetTester tester,
    ) async {
      collectReports();
      await tester.pumpWidget(
        tanreiTestApp(
          const TanreiButton(
            onPressed: null,
            variant: TanreiButtonVariant('no-such-variant'),
            child: Text('Deploy'),
          ),
        ),
      );
      expect(
        containerDecoration(tester).color,
        const TanreiThemeData().paint(buttonTokens.variants.filled.disabled.containerColor),
      );
      expect(controlOpacity(tester), buttonTokens.disabled.opacity);
    });

    testWidgets('BTN-7: with the reporter silent (what a release build does) nothing fails and '
        'the button still activates', (WidgetTester tester) async {
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) {};
      addTearDown(() => debugTanreiReportUnknownValue = previous);
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () => pressed++,
            size: const TanreiButtonSize('no-such-size'),
            variant: const TanreiButtonVariant('no-such-variant'),
            child: const Text('Deploy'),
          ),
        ),
      );
      await tester.tap(find.byType(TanreiButton));
      await tester.pumpAndSettle();
      expect(pressed, 1);
      expect(containerSize(tester).height, buttonTokens.sizes.medium.containerHeight);
      expect(tester.takeException(), isNull);
    });

    testWidgets('BTN-7: the default reporter reports an unknown value once, as a FlutterError, '
        'and the button still renders', (WidgetTester tester) async {
      const TanreiButtonSize unknown = TanreiButtonSize('btn-7-reported-once');
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () {}, size: unknown, child: const Text('Deploy'))),
      );
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('Unknown button size "btn-7-reported-once"'));
      expect('$reported', contains('"medium"'));
      expect(containerSize(tester).height, buttonTokens.sizes.medium.containerHeight);

      // Rebuilding does not report again.
      await tester.pumpWidget(
        tanreiTestApp(const TanreiButton(onPressed: null, size: unknown, child: Text('Deploy'))),
      );
      expect(tester.takeException(), isNull);
    });

    test('pixel identity: every value of the flat size tokens this shape replaced is the value of '
        'the axis (default system)', () {
      // containerHeightSmall|Medium|Large, containerPadding*Small|Medium|Large, and the single
      // labelTypescale / iconSize / containerGap / outlineWidth tokens, as they were generated
      // before they became members of the size axis.
      const Map<TanreiButtonSize, List<double>> flat = <TanreiButtonSize, List<double>>{
        //                       height, start, end, start-with-icon, block
        TanreiButtonSize.small: <double>[32, 12, 12, 12, 6],
        TanreiButtonSize.medium: <double>[36, 14, 14, 14, 6],
        TanreiButtonSize.large: <double>[40, 16, 16, 16, 6],
      };
      expect(buttonTokens.sizes.keys, flat.keys);
      for (final MapEntry<TanreiButtonSize, List<double>> entry in flat.entries) {
        final TanreiButtonSizeTokens size = buttonTokens.sizes[entry.key];
        expect(
          <double>[
            size.containerHeight,
            size.containerPaddingInlineStart,
            size.containerPaddingInlineEnd,
            size.containerPaddingInlineStartWithIcon,
            size.containerPaddingBlock,
          ],
          entry.value,
          reason: entry.key.name,
        );
        expect(size.labelTypescale, same(system.typescale.label), reason: entry.key.name);
        expect(size.iconSize, 16, reason: entry.key.name);
        // The former flat `containerGap` / `outlineWidth`: since they joined the size axis, the same
        // value at every size.
        expect(size.containerGap, 8, reason: entry.key.name);
        expect(size.outlineWidth, 1, reason: entry.key.name);
      }
      expect(buttonTokens.sizes.medium.containerHeight, 36);
      expect(buttonTokens.sizes[TanreiButtonSize.medium], same(buttonTokens.sizes.medium));
      expect(buttonTokens.variants.keys, TanreiButtonVariant.core);
      expect(buttonTokens.variants[TanreiButtonVariant.text], same(buttonTokens.variants.text));
    });

    test('copyWith adds to the values a design system added and never drops one', () {
      const TanreiButtonSize hero = TanreiButtonSize('hero');
      const TanreiButtonSize tiny = TanreiButtonSize('tiny');
      final TanreiButtonSizes withHero = buttonTokens.sizes.copyWith(
        extra: <TanreiButtonSize, TanreiButtonSizeTokens>{
          hero: buttonTokens.sizes.large.copyWith(containerHeight: 64),
        },
      );
      final TanreiButtonSizes both = withHero.copyWith(
        small: withHero.small.copyWith(containerHeight: 30),
        extra: <TanreiButtonSize, TanreiButtonSizeTokens>{
          tiny: buttonTokens.sizes.small.copyWith(containerHeight: 24),
        },
      );
      expect(both.keys, <TanreiButtonSize>[...TanreiButtonSize.core, hero, tiny]);
      expect(both[hero].containerHeight, 64);
      expect(both[tiny].containerHeight, 24);
      expect(both.small.containerHeight, 30);
      expect(both.copyWith().extra.keys, <TanreiButtonSize>[hero, tiny]);
    });

    testWidgets('a size and a variant added with copyWith drive the button', (
      WidgetTester tester,
    ) async {
      const TanreiButtonSize hero = TanreiButtonSize('hero');
      const TanreiButtonVariant danger = TanreiButtonVariant('danger');
      final TanreiSystem product = tanreiSystem.copyWith(
        button: buttonTokens.copyWith(
          sizes: buttonTokens.sizes.copyWith(
            extra: <TanreiButtonSize, TanreiButtonSizeTokens>{
              hero: buttonTokens.sizes.large.copyWith(containerHeight: 64, iconSize: 28),
            },
          ),
          variants: buttonTokens.variants.copyWith(
            extra: <TanreiButtonVariant, TanreiButtonVariantTokens>{
              danger: buttonTokens.variants.filled.copyWith(
                enabled: buttonTokens.variants.filled.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.error),
                ),
              ),
            },
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            size: hero,
            variant: danger,
            icon: const SizedBox.square(dimension: 8),
            child: const Text('Delete'),
          ),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(containerSize(tester).height, 64);
      expect(containerDecoration(tester).color, light.error);
      expect(IconTheme.of(tester.element(find.text('Delete'))).size, 28);
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (BTN-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = const TanreiThemeData().paint(
      buttonTokens.variants.filled.pressed.containerColor,
    );
    const Duration tick = Duration(milliseconds: 1);

    test('the floor is the token sys.motion.duration.press-hold', () {
      expect(system.motion.duration.pressHold, 100);
      expect(system.motion.duration['press-hold'], 100);
    });

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets(
        'BTN-8: a ${kind.name} press shows the pressed state without delay and keeps it for '
        'the press-hold duration although the press ended at once',
        (WidgetTester tester) async {
          int pressed = 0;
          await tester.pumpWidget(
            tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
          );
          expect(containerDecoration(tester).color, light.primary);

          // Down and up within the same frame: the shortest press there is.
          await tester.tap(find.byType(TanreiButton), kind: kind);
          await tester.pump();
          expect(pressed, 1);
          expect(containerDecoration(tester).color, pressedFill);

          await tester.pump(hold - tick);
          expect(containerDecoration(tester).color, pressedFill);

          await tester.pump(tick);
          await tester.pumpAndSettle();
          expect(containerDecoration(tester).color, isNot(pressedFill));
        },
      );
    }

    testWidgets('BTN-8: a press held longer than the press-hold duration ends with the press', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () {}, child: const Text('Deploy'))),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(containerDecoration(tester).color, pressedFill);
      await tester.pump(hold * 3);
      expect(containerDecoration(tester).color, pressedFill);

      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(buttonTokens.motionStateDuration));
      expect(containerDecoration(tester).color, light.primary);
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('BTN-8: $name shows the pressed state at once and for the press-hold duration, '
          'and emits exactly once', (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        int pressed = 0;
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiButton(onPressed: () => pressed++, autofocus: true, child: const Text('Deploy')),
          ),
        );
        await tester.pumpAndSettle();
        final Color focusedFill = containerDecoration(tester).color!;

        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(pressed, 1);
        expect(containerDecoration(tester).color, pressedFill);
        expect(controlOpacity(tester), buttonTokens.pressed.opacity);

        await tester.pump(hold - tick);
        expect(containerDecoration(tester).color, pressedFill);

        // Afterwards the button is what it was: keyboard-focused.
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(containerDecoration(tester).color, focusedFill);
        expect(pressed, 1);
      });
    }

    testWidgets('BTN-8: the semantic tap of assistive technology is a press from the center, held '
        'like any other, and emits once', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
      );
      tester.semantics.tap(find.semantics.byLabel('Deploy'));
      await tester.pump();
      expect(pressed, 1);
      expect(containerDecoration(tester).color, pressedFill);
      await tester.pump(hold);
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, light.primary);
      expect(pressed, 1);
      handle.dispose();
    });

    testWidgets('BTN-8: a long pointer press emits once and is not shown a second time', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(TanreiButton(onPressed: () => pressed++, child: const Text('Deploy'))),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump(hold * 2);
      await touch.up();
      await tester.pump();
      expect(pressed, 1);
      await tester.pump(tanreiDuration(buttonTokens.motionStateDuration));
      expect(containerDecoration(tester).color, light.primary);
    });

    testWidgets('BTN-8: the duration is the token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem calm = system.copyWith(
        motion: system.motion.copyWith(duration: system.motion.duration.copyWith(pressHold: 400)),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, child: const Text('Deploy')),
          theme: TanreiThemeData(system: calm),
        ),
      );
      await tester.tap(find.byType(TanreiButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 399));
      expect(containerDecoration(tester).color, pressedFill);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, light.primary);
    });

    testWidgets('BTN-8: a button disabled while its press is held drops the press', (
      WidgetTester tester,
    ) async {
      Widget app({required bool enabled}) => tanreiTestApp(
        TanreiButton(onPressed: enabled ? () {} : null, child: const Text('Deploy')),
      );
      await tester.pumpWidget(app(enabled: true));
      await tester.tap(find.byType(TanreiButton));
      await tester.pump();
      await tester.pumpWidget(app(enabled: false));
      await tester.pumpAndSettle();
      expect(
        containerDecoration(tester).color,
        const TanreiThemeData().paint(buttonTokens.variants.filled.disabled.containerColor),
      );
      await tester.pump(hold);
    });
  });

  group('choices of kind', () {
    Widget app(TanreiSystem of, {Widget? child, bool disableAnimations = false}) => tanreiTestApp(
      child ?? TanreiButton(onPressed: () {}, child: const Text('Deploy')),
      theme: TanreiThemeData(system: of),
      disableAnimations: disableAnimations,
    );

    test(
      'the shipped values: default overlay / corner smoothing 0 / ring, m3-like ripple, cupertino '
      'dim and corner smoothing 0.6 (the iOS corner), acme glow',
      () {
        expect(tanreiSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
        expect(tanreiSystem.shape.cornerSmoothing, 0);
        expect(tanreiSystem.behavior.focusStyle, TanreiFocusStyle.ring);
        expect(m3LikeSystem.behavior.pressedFeedback, TanreiPressedFeedback.ripple);
        expect(m3LikeSystem.shape.cornerSmoothing, 0);
        expect(cupertinoSystem.behavior.pressedFeedback, TanreiPressedFeedback.dim);
        expect(cupertinoSystem.shape.cornerSmoothing, 0.6);
        expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      },
    );

    testWidgets('BTN-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      await tester.pumpWidget(app(tanreiSystem));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(
        decoration.color,
        const TanreiThemeData().paint(buttonTokens.variants.filled.pressed.containerColor),
      );
      expect(decoration.ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 50));
    });

    testWidgets('BTN-9: ripple (m3-like) grows the pressed container color from the point of '
        'contact, clipped to the container, and fades when the press ends', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiButtonVariantTokens filled = m3LikeSystem.button.variants.filled;
      final Color resting = theme.paint(filled.enabled.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(pressedColor, isNot(resting));
      await tester.pumpWidget(app(m3LikeSystem));

      final Rect box = tester.getRect(
        find
            .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
            .first,
      );
      const Offset contact = Offset(7, 5);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();

      // The container keeps the color underneath; the pressed color is the ripple's.
      TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, resting);
      expect(decoration.ripple!.origin, contact);
      expect(decoration.ripple!.color, pressedColor);
      expect(decoration.ripple!.progress, 0);
      // The label takes its pressed color at once.
      expect(labelColor(tester, 'Deploy'), theme.paint(filled.pressed.labelColor));

      // It grows over comp.button.motion.feedback-duration with the Button's state easing.
      final Duration growth = tanreiDuration(m3LikeSystem.button.motionFeedbackDuration);
      final Duration fade = tanreiDuration(m3LikeSystem.button.motionStateDuration);
      await tester.pump(growth ~/ 2);
      final double halfway = containerDecoration(tester).ripple!.progress;
      expect(halfway, allOf(greaterThan(0), lessThan(1)));
      await tester.pump(growth);
      expect(containerDecoration(tester).ripple!.progress, 1);

      // Painted inside the container shape: the circle is drawn, then everything outside the shape
      // is cleared, all inside one layer.
      expect(
        find
            .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
            .first,
        paints
          ..something((Symbol method, List<dynamic> arguments) => method == #saveLayer)
          ..circle(color: pressedColor)
          ..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawPath && (arguments[1] as Paint).blendMode == BlendMode.clear,
          )
          ..restore(),
      );

      // Released: the ripple fades into the container underneath, then is gone.
      await touch.up();
      await tester.pump();
      await tester.pump(fade ~/ 2);
      decoration = containerDecoration(tester);
      expect(decoration.color, resting);
      expect(decoration.ripple!.color, isNot(pressedColor));
      expect(decoration.ripple!.color, isNot(resting));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);
      expect(containerDecoration(tester).color, resting);
    });

    testWidgets('BTN-9: the ripple grows over comp.button.motion.feedback-duration — the '
        'component token, not a system step — eased by motion.state-easing', (
      WidgetTester tester,
    ) async {
      final TanreiSystem slow = m3LikeSystem.copyWith(
        button: m3LikeSystem.button.copyWith(motionFeedbackDuration: 1000),
      );
      expect(slow.motion.duration.long1, isNot(1000), reason: 'only the component token changed');
      await tester.pumpWidget(app(slow));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(containerDecoration(tester).ripple!.progress, 0);
      await tester.pump(const Duration(milliseconds: 500));
      expect(
        containerDecoration(tester).ripple!.progress,
        moreOrLessEquals(slow.button.motionStateEasing.toCurve().transform(0.5)),
      );
      // Still growing where the system step (long1) would have finished long ago.
      await tester.pump(const Duration(milliseconds: 499));
      expect(containerDecoration(tester).ripple!.progress, lessThan(1));
      await tester.pump(const Duration(milliseconds: 1));
      expect(containerDecoration(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('BTN-9: a ripple fades only once the press has ended AND press-hold has passed, '
        'over motion.state-duration', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final Color pressedColor = theme.paint(
        m3LikeSystem.button.variants.filled.pressed.containerColor,
      );
      final Color resting = theme.paint(m3LikeSystem.button.variants.filled.enabled.containerColor);
      final Duration hold = tanreiDuration(m3LikeSystem.motion.duration.pressHold);
      final Duration fade = tanreiDuration(m3LikeSystem.button.motionStateDuration);
      await tester.pumpWidget(app(m3LikeSystem));

      // A tap that is over at once: the ripple stays whole in color until press-hold has passed.
      await tester.tap(find.byType(TanreiButton));
      await tester.pump();
      await tester.pump(hold - const Duration(milliseconds: 1));
      expect(containerDecoration(tester).ripple!.color, pressedColor);
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump(); // The first frame of the fade.
      await tester.pump(fade ~/ 2);
      final Color fading = containerDecoration(tester).ripple!.color;
      expect(fading, isNot(pressedColor));
      expect(fading, isNot(resting));
      await tester.pump(fade ~/ 2 - const Duration(milliseconds: 1));
      expect(
        containerDecoration(tester).ripple!.color,
        isNot(resting),
        reason: 'it takes the whole state duration',
      );
      // At the duration it has reached the container color; the frame after, it is gone.
      await tester.pump(const Duration(milliseconds: 1));
      expect(containerDecoration(tester).ripple?.color ?? resting, resting);
      await tester.pump(const Duration(milliseconds: 1));
      expect(containerDecoration(tester).ripple, isNull);

      // A long press: it does not fade while the pointer is down, however long.
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      await tester.pump(hold * 20);
      expect(containerDecoration(tester).ripple!.color, pressedColor);
      await touch.up();
      await tester.pump();
      await tester.pump(fade ~/ 2);
      expect(containerDecoration(tester).ripple!.color, isNot(pressedColor));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'BTN-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; label, outline, elevation, opacity and shape are the pressed tokens\''}',
        (WidgetTester tester) async {
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          // A system whose pressed state differs from the hovered one in every part.
          final TanreiButtonVariantTokens outlined = buttonTokens.variants.outlined;
          final TanreiSystem of = tanreiSystem.copyWith(
            behavior: tanreiSystem.behavior.copyWith(pressedFeedback: feedback),
            button: buttonTokens.copyWith(
              pressed: buttonTokens.pressed.copyWith(opacity: 0.5, containerShape: 2),
              variants: buttonTokens.variants.copyWith(
                outlined: outlined.copyWith(
                  pressed: outlined.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                    outlineColor: const TanreiPaint.literal(Color(0xFF778899)),
                    containerElevation: tanreiSystem.elevation.level3,
                  ),
                ),
              ),
            ),
          );
          final TanreiThemeData theme = TanreiThemeData(system: of);
          await tester.pumpWidget(
            app(
              of,
              child: TanreiButton(
                onPressed: () {},
                variant: TanreiButtonVariant.outlined,
                child: const Text('Deploy'),
              ),
            ),
          );
          // The state under the press is `hovered`.
          final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
          await mouse.addPointer(location: Offset.zero);
          addTearDown(mouse.removePointer);
          await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
          await tester.pumpAndSettle();
          final TanreiContainerDecoration hovered = containerDecoration(tester);
          final Color hoveredLabel = labelColor(tester, 'Deploy');
          final Color? hoveredFill = hovered.color;
          expect(
            hoveredFill ?? const Color(0x00000000),
            theme.paint(outlined.hovered.containerColor),
          );

          await mouse.down(tester.getCenter(find.byType(TanreiButton)));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerDecoration(tester);
          // The container color is the hovered one under all three.
          expect(drawn.color, hoveredFill);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(labelColor(tester, 'Deploy'), hoveredLabel);
            expect(controlOpacity(tester), 1);
          } else {
            expect(labelColor(tester, 'Deploy'), const Color(0xFF445566));
            expect(drawn.border!.top.color, const Color(0xFF778899));
            expect(drawn.shape.radius, 2);
            expect(controlOpacity(tester), 0.5);
            final TanreiResolvedElevation level3 = TanreiResolvedElevation.resolve(
              tanreiSystem.elevation.level3,
              theme.colors,
            );
            expect(drawn.boxShadow, level3.shadows);
            expect(drawn.boxShadow, isNot(hovered.boxShadow));
            // The pressed container color is the ripple's, and nobody's under dim.
            expect(
              drawn.ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await mouse.up();
          await tester.pumpAndSettle(const Duration(milliseconds: 50));
        },
      );
    }

    testWidgets('BTN-9: a ripple started from the keyboard grows from the center', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        app(
          m3LikeSystem,
          child: TanreiButton(onPressed: () {}, autofocus: true, child: const Text('Deploy')),
        ),
      );
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      final TanreiRipple ripple = containerDecoration(tester).ripple!;
      expect(ripple.origin, isNull, reason: 'null = the center of the container');
      expect(
        ripple.color,
        const TanreiThemeData(
          system: m3LikeSystem,
        ).paint(m3LikeSystem.button.variants.filled.pressed.containerColor),
      );
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);
    });

    testWidgets('BTN-9: with animations disabled a ripple covers the container at once', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(app(m3LikeSystem, disableAnimations: true));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(containerDecoration(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pump();
      expect(containerDecoration(tester).ripple, isNull);
    });

    testWidgets('BTN-9: dim (cupertino) applies the pressed opacity to the whole control and draws '
        'no state layer', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiButtonTokens tokens = cupertinoSystem.button;
      expect(tokens.pressed.opacity, lessThan(1));
      await tester.pumpWidget(app(cupertinoSystem));
      final Color resting = theme.paint(tokens.variants.filled.enabled.containerColor);
      expect(containerDecoration(tester).color, resting);
      expect(controlOpacity(tester), 1);

      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(controlOpacity(tester), tokens.pressed.opacity);
      expect(containerDecoration(tester).color, resting);
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 50));
    });

    testWidgets('BTN-9: dim never draws a state layer, even where the pressed tokens carry one', (
      WidgetTester tester,
    ) async {
      // The default system's pressed container is a state-layer mix; only the choice changes.
      final TanreiSystem dimmed = tanreiSystem.copyWith(
        behavior: tanreiSystem.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.dim),
        button: buttonTokens.copyWith(pressed: buttonTokens.pressed.copyWith(opacity: 0.5)),
      );
      await tester.pumpWidget(app(dimmed));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(containerDecoration(tester).color, light.primary);
      expect(controlOpacity(tester), 0.5);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 50));
    });

    testWidgets('BTN-9: none draws no answer to a press; hover and focus still apply', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiSystem silent = tanreiSystem.copyWith(
        behavior: tanreiSystem.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
        button: buttonTokens.copyWith(
          pressed: buttonTokens.pressed.copyWith(opacity: 0.5, containerShape: 1),
        ),
      );
      int pressed = 0;
      await tester.pumpWidget(
        app(
          silent,
          child: TanreiButton(onPressed: () => pressed++, child: const Text('Deploy')),
        ),
      );
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      final TanreiContainerDecoration hovered = containerDecoration(tester);
      expect(
        hovered.color,
        const TanreiThemeData().paint(buttonTokens.variants.filled.hovered.containerColor),
      );

      await mouse.down(tester.getCenter(find.byType(TanreiButton)));
      await tester.pump();
      expect(containerDecoration(tester), hovered);
      expect(controlOpacity(tester), 1);
      await mouse.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 50));
      expect(pressed, 1);
    });

    testWidgets('BTN-10: the corner smoothing of the system eases the container and the focus '
        'indicator: 0.6 under cupertino (a path), 0 by default (a plain RRect)', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      bool Function(Symbol, List<dynamic>) strokes(Symbol call) =>
          (Symbol method, List<dynamic> arguments) =>
              method == call && (arguments[1] as Paint).style == PaintingStyle.stroke;
      Widget focused(TanreiSystem of) => app(
        of,
        child: TanreiButton(onPressed: () {}, autofocus: true, child: const Text('Deploy')),
      );

      await tester.pumpWidget(focused(tanreiSystem));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0);
      expect(containerDecoration(tester).shape.isCircular, isTrue);
      expect(containerDecoration(tester).shape.radius, buttonTokens.focused.containerShape);
      final Finder container = find
          .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
          .first;
      expect(container, paints..rrect());
      expect(container, isNot(paints..path()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawRRect)));
      expect(find.byType(TanreiFocusRing), isNot(paints..something(strokes(#drawPath))));

      await tester.pumpWidget(focused(cupertinoSystem));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(containerDecoration(tester).shape.isCircular, isFalse);
      expect(
        containerDecoration(tester).shape.radius,
        cupertinoSystem.button.focused.containerShape,
      );
      expect(container, paints..path());
      expect(container, isNot(paints..rrect()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawPath)));
      expect(find.byType(TanreiFocusRing), isNot(paints..something(strokes(#drawRRect))));

      // Any amount above 0 is a path; the amount is read from the system, not from its id.
      await tester.pumpWidget(
        focused(tanreiSystem.copyWith(shape: tanreiSystem.shape.copyWith(cornerSmoothing: 1))),
      );
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 1);
      expect(container, paints..path());
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawPath)));
    });

    testWidgets('BTN-10: the focus style of the system draws keyboard focus as a ring (default) or '
        'as a glow (acme): the same strokes, blurred by the ring width', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(
          app(
            of,
            child: TanreiButton(onPressed: () {}, autofocus: true, child: const Text('Deploy')),
          ),
        );
        await tester.pump();
        expect(focusRingVisible(tester), isTrue);
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

      final List<Paint> ring = await strokes(tanreiSystem);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint paint) => paint.maskFilter == null), isTrue);

      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow, hasLength(ring.length));
      final double width = acmeSystem.measure.focusOuterWidth;
      for (final Paint paint in glow) {
        expect(paint.maskFilter, MaskFilter.blur(BlurStyle.normal, width / 2));
      }
      expect(
        glow.last.color.toARGB32(),
        acmeSystem.schemes.light[TanreiColorRole.focusRing].toARGB32(),
      );
      expect(glow.last.strokeWidth, width);
    });
  });

  group('precedence with real tokens', () {
    testWidgets('BTN-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible without overriding anything', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiButtonVariantTokens filled = acmeSystem.button.variants.filled;
      final Color hovered = theme.paint(filled.hovered.containerColor);
      final Color focused = theme.paint(filled.focused.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(<Color>{hovered, focused, pressedColor}, hasLength(3));
      expect(acmeSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);

      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, focusNode: focusNode, child: const Text('Deploy')),
          theme: theme,
        ),
      );
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, hovered);

      // Hovered and keyboard-focused: focused wins.
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, focused);

      // Hovered, focused and pressed: pressed wins.
      await mouse.down(tester.getCenter(find.byType(TanreiButton)));
      await tester.pump();
      expect(containerDecoration(tester).color, pressedColor);

      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, focused);
    });
  });

  group('elevation between states', () {
    testWidgets('the shadow is interpolated, never jumps (m3-like elevated, rest → hovered)', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiButtonVariantTokens elevated = m3LikeSystem.button.variants.elevated;
      final TanreiResolvedElevation from = TanreiResolvedElevation.resolve(
        elevated.enabled.containerElevation,
        theme.colors,
      );
      final TanreiResolvedElevation to = TanreiResolvedElevation.resolve(
        elevated.hovered.containerElevation,
        theme.colors,
      );
      expect(to.shadows.last.blurRadius, greaterThan(from.shadows.last.blurRadius));

      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            variant: TanreiButtonVariant.elevated,
            child: const Text('Deploy'),
          ),
          theme: theme,
        ),
      );
      expect(containerDecoration(tester).boxShadow, from.shadows);
      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pump();
      await tester.pump(tanreiDuration(m3LikeSystem.button.motionStateDuration) ~/ 2);
      final double between = containerDecoration(tester).boxShadow!.last.blurRadius;
      expect(
        between,
        allOf(greaterThan(from.shadows.last.blurRadius), lessThan(to.shadows.last.blurRadius)),
      );
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).boxShadow, to.shadows);
    });
  });

  group('goldens', () {
    // One baseline per spec fixture, read from the spec so the two cannot drift apart.
    final Map<String, dynamic> spec =
        jsonDecode(File('../../specs/button.spec.json').readAsStringSync()) as Map<String, dynamic>;
    final List<Map<String, dynamic>> fixtures = (spec['fixtures'] as List<dynamic>)
        .cast<Map<String, dynamic>>();

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'filled-medium',
        'tonal-medium',
        'elevated-medium',
        'outlined-medium',
        'text-medium',
        'filled-small',
        'filled-large',
        'filled-disabled',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
      testWidgets('golden: $id', (WidgetTester tester) async {
        const double pixelRatio = 2;
        const Size surface = Size(160, 80);
        tester.view.devicePixelRatio = pixelRatio;
        tester.view.physicalSize = surface * pixelRatio;
        addTearDown(tester.view.reset);

        final GlobalKey boundaryKey = GlobalKey();
        const TanreiThemeData theme = TanreiThemeData.light;
        await tester.pumpWidget(
          tanreiTestApp(
            RepaintBoundary(
              key: boundaryKey,
              child: ColoredBox(
                color: theme.colors.surface,
                child: SizedBox.fromSize(
                  size: surface,
                  child: Padding(
                    padding: EdgeInsets.all(system.space.space200),
                    child: Center(
                      child: TanreiButton(
                        onPressed: props['disabled'] == true ? null : () {},
                        variant: TanreiButtonVariant(props['variant'] as String? ?? 'filled'),
                        size: TanreiButtonSize(props['size'] as String? ?? 'medium'),
                        child: Text(fixture['content'] as String),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            theme: theme,
          ),
        );

        final RenderRepaintBoundary boundary =
            boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final ui.Image image = (await tester.runAsync(
          () => boundary.toImage(pixelRatio: pixelRatio),
        ))!;
        addTearDown(image.dispose);
        await expectLater(image, matchesGoldenFile('goldens/button/$id.png'));
      });
    }
  });
}
