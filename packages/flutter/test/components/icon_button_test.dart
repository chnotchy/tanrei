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
import 'icon_button_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiIconButtonTokens iconButtonTokens = system.iconButton;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('ICB-1: a ${kind.name} tap emits onPressed exactly once', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(iconButton(onPressed: () => pressed++)));
        await tester.tap(find.byType(TanreiIconButton), kind: kind);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('ICB-1: $name emits onPressed exactly once', (WidgetTester tester) async {
        int pressed = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(iconButton(onPressed: () => pressed++, focusNode: focusNode)),
        );
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasPrimaryFocus, isTrue);
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    testWidgets('ICB-1: keyboard activation works without an app-level Shortcuts widget', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Center(child: iconButton(onPressed: () => pressed++, autofocus: true)),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 2);
    });

    testWidgets('ICB-1: the semantic tap action emits onPressed exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(iconButton(onPressed: () => pressed++)));
      tester.semantics.tap(find.semantics.byLabel('Favorite'));
      await tester.pump();
      expect(pressed, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('ICB-2: a null onPressed emits nothing, is not focusable and is exposed as '
        'disabled — for a toggle too, which keeps announcing its selection', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      for (final bool? isSelected in looks.values) {
        await tester.pumpWidget(
          tanreiTestApp(iconButton(enabled: false, isSelected: isSelected, focusNode: focusNode)),
        );
        await tester.tap(find.byType(TanreiIconButton));
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasFocus, isFalse);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(focusNode.hasFocus, isFalse);
        expect(
          tester.getSemantics(find.byType(TanreiTapTarget)),
          matchesSemantics(
            label: 'Favorite',
            isButton: true,
            hasEnabledState: true,
            isEnabled: false,
            isFocusable: false,
            hasTapAction: false,
            hasFocusAction: false,
            hasSelectedState: isSelected != null,
            isSelected: isSelected ?? false,
          ),
          reason: 'isSelected: $isSelected',
        );
      }
      handle.dispose();
    });

    testWidgets('ICB-2: disabling an icon button stops click and change and removes it from the '
        'focus order', (WidgetTester tester) async {
      int pressed = 0;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool enabled}) => tanreiTestApp(
        iconButton(
          enabled: enabled,
          isSelected: false,
          onPressed: () => pressed++,
          focusNode: focusNode,
        ),
      );

      await tester.pumpWidget(build(enabled: true));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);

      await tester.pumpWidget(build(enabled: false));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.tap(find.byType(TanreiIconButton));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 0);
    });

    for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
      for (final MapEntry<String, bool?> look in looks.entries) {
        testWidgets('ICB-6: disabled ${variant.name} (${look.key}) draws container, icon, outline '
            'and opacity from the disabled tokens of its variant and selection', (
          WidgetTester tester,
        ) async {
          await tester.pumpWidget(
            tanreiTestApp(iconButton(enabled: false, variant: variant, isSelected: look.value)),
          );
          final TanreiIconButtonVariantStateTokens disabled =
              iconButtonTokens.variants[variant].disabled;
          final ({TanreiPaint container, TanreiPaint icon, TanreiPaint outline}) parts = partsOf(
            disabled,
            look.value,
          );
          expect(containerColor(tester), lightTheme.paint(parts.container));
          expect(iconColor(tester), lightTheme.paint(parts.icon));
          expect(outlineColor(tester), lightTheme.paint(parts.outline));
          expect(controlOpacity(tester), iconButtonTokens.disabled.opacity);
          expect(
            containerDecoration(tester).shape.radius,
            iconButtonTokens.disabled.containerShape,
          );
          // The default system: the icon reads as disabled content.
          expect(iconColor(tester).a, closeTo(system.state.disabledContentOpacity, 1e-6));
          expect(iconColor(tester).withValues(alpha: 1), light.onSurface);
        });
      }
    }
    testWidgets('ICB-6: in the default system a look that is clear at rest stays clear when '
        'disabled, an outline that is none stays none, and the outlined border fades', (
      WidgetTester tester,
    ) async {
      const Color clear = Color(0x00000000);
      final Color faded = light.onSurface.withValues(alpha: system.state.disabledContainerOpacity);
      // variant, isSelected -> container, outline (disabled)
      final Map<(TanreiIconButtonVariant, bool?), (Color, Color)> expected =
          <(TanreiIconButtonVariant, bool?), (Color, Color)>{
            for (final bool? look in looks.values)
              (TanreiIconButtonVariant.standard, look): (clear, clear),
            for (final bool? look in looks.values)
              (TanreiIconButtonVariant.filled, look): (faded, clear),
            (TanreiIconButtonVariant.outlined, null): (clear, faded),
            (TanreiIconButtonVariant.outlined, false): (clear, faded),
            (TanreiIconButtonVariant.outlined, true): (faded, clear),
          };
      for (final MapEntry<(TanreiIconButtonVariant, bool?), (Color, Color)> entry
          in expected.entries) {
        final (TanreiIconButtonVariant variant, bool? isSelected) = entry.key;
        await tester.pumpWidget(
          tanreiTestApp(iconButton(enabled: false, variant: variant, isSelected: isSelected)),
        );
        final String reason = '${variant.name} $isSelected';
        expect(containerColor(tester), isSameColorAs(entry.value.$1), reason: reason);
        expect(outlineColor(tester), isSameColorAs(entry.value.$2), reason: reason);
      }
    });
  });

  group('interaction states', () {
    testWidgets('ICB-3: container, icon, outline and opacity come from the tokens of the '
        'highest-precedence state, pressed > focused > hovered', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiIconButtonVariantTokens filled = iconButtonTokens.variants.filled;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(iconButton(variant: TanreiIconButtonVariant.filled, focusNode: focusNode)),
      );
      void expectDrawnFrom(TanreiIconButtonVariantStateTokens tokens) {
        expect(containerColor(tester), lightTheme.paint(tokens.containerColor));
        expect(iconColor(tester), lightTheme.paint(tokens.iconColor));
        expect(containerDecoration(tester).border, isNull);
      }

      expectDrawnFrom(filled.enabled);
      expect(containerColor(tester), light.primary);
      expect(iconColor(tester), light.onPrimary);

      // Hovered: the state layer is the look's state-layer color, here the icon color.
      final TestGesture mouse = await hover(tester);
      expectDrawnFrom(filled.hovered);
      expect(
        containerColor(tester),
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.hoverStateLayerOpacity),
        ),
      );
      expect(controlOpacity(tester), iconButtonTokens.hovered.opacity);

      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.focused);
      expect(
        containerColor(tester),
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.focusStateLayerOpacity),
        ),
      );

      await mouse.down(tester.getCenter(find.byType(TanreiIconButton)));
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.pressed);
      expect(
        containerColor(tester),
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.pressedStateLayerOpacity),
        ),
      );
      expect(controlOpacity(tester), iconButtonTokens.pressed.opacity);

      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.enabled);
      expect(controlOpacity(tester), 1);
    });

    testWidgets('ICB-3: a toggle mixes the state layer of its look — unselected over its own '
        'container, not the plain variant\'s', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(iconButton(variant: TanreiIconButtonVariant.filled, isSelected: false)),
      );
      expect(containerColor(tester), light.surfaceContainerHighest);
      await hover(tester);
      expect(
        containerColor(tester),
        isSameColorAs(
          overlaid(
            light.surfaceContainerHighest,
            light.onSurfaceVariant,
            system.state.hoverStateLayerOpacity,
          ),
        ),
      );
      expect(iconColor(tester), light.onSurfaceVariant);
    });

    testWidgets('ICB-3: a variant without a fill draws the state mix over nothing', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(iconButton()));
      expect(containerDecoration(tester).color, isNull);
      await hover(tester);
      expect(
        containerColor(tester),
        isSameColorAs(
          light.onSurfaceVariant.withValues(alpha: system.state.hoverStateLayerOpacity),
        ),
      );
    });

    testWidgets('ICB-3: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(iconButton(variant: TanreiIconButtonVariant.filled, focusNode: focusNode)),
      );
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(containerColor(tester), light.primary);
    });

    testWidgets('ICB-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible without overriding anything', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiIconButtonVariantTokens filled = acmeSystem.iconButton.variants.filled;
      final Color hovered = theme.paint(filled.hovered.containerColor);
      final Color focused = theme.paint(filled.focused.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(<Color>{hovered, focused, pressedColor}, hasLength(3));
      expect(acmeSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);

      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(variant: TanreiIconButtonVariant.filled, focusNode: focusNode),
          theme: theme,
        ),
      );
      final TestGesture mouse = await hover(tester);
      expect(containerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
      await mouse.down(tester.getCenter(find.byType(TanreiIconButton)));
      await tester.pump();
      expect(containerColor(tester), pressedColor);
      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
    });

    testWidgets('ICB-3: a state change eases with the motion tokens, pressed applies at once, and '
        'nothing animates when animations are disabled', (WidgetTester tester) async {
      final TanreiIconButtonVariantTokens filled = iconButtonTokens.variants.filled;
      final Color resting = lightTheme.paint(filled.enabled.containerColor);
      final Color hovered = lightTheme.paint(filled.hovered.containerColor);
      final Color pressed = lightTheme.paint(filled.pressed.containerColor);
      final Duration partWay = Duration(milliseconds: iconButtonTokens.motionStateDuration ~/ 3);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;

      Future<TestGesture> hoverWith({required bool disableAnimations}) async {
        await tester.pumpWidget(
          tanreiTestApp(
            iconButton(key: UniqueKey(), variant: TanreiIconButtonVariant.filled),
            disableAnimations: disableAnimations,
          ),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(find.byType(TanreiIconButton)));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(disableAnimations: false);
      expect(containerColor(tester), resting);
      await tester.pump(partWay);
      final double progress = iconButtonTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(containerColor(tester), isSameColorAs(Color.lerp(resting, hovered, progress)!));
      await tester.pump(tanreiDuration(iconButtonTokens.motionStateDuration));
      expect(containerColor(tester), hovered);

      await mouse.down(tester.getCenter(find.byType(TanreiIconButton)));
      await tester.pump();
      expect(containerColor(tester), pressed);
      await mouse.up();
      await tester.pump(tanreiDuration(system.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerColor(tester), hovered);
      await mouse.removePointer();

      await hoverWith(disableAnimations: true);
      expect(containerColor(tester), hovered);
    });
  });

  group('focus ring', () {
    testWidgets('ICB-4: keyboard focus shows the focus ring at once, around the square', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(Column(mainAxisSize: MainAxisSize.min, children: <Widget>[iconButton()])),
      );
      expect(focusRingVisible(tester), isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusRingVisible(tester), isTrue);

      final TanreiMeasure measure = system.measure;
      expect(measure.focusInnerWidth, 0);
      final double offset = measure.focusOffset + measure.focusOuterWidth / 2;
      final Rect visual = Offset.zero & containerSize(tester);
      expect(visual.size, Size.square(iconButtonTokens.sizes.medium.containerSize));
      final RRect expectedRing = BorderRadius.circular(
        iconButtonTokens.focused.containerShape,
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

    testWidgets('ICB-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(iconButton(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(focusRingVisible(tester), isFalse);
    });
  });

  group('target size', () {
    testWidgets('ICB-5: the hit area extends on both axes to sys.target.touch without changing the '
        'visual size', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(iconButton(onPressed: () => pressed++)));
      expect(containerSize(tester), const Size.square(36));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.size, Size.square(system.measure.targetTouch));
      expect(target.size, const Size.square(48));

      final Rect visual = tester.getRect(iconButtonContainerBox);
      for (final Offset outside in <Offset>[
        Offset(target.center.dx, target.top + 1),
        Offset(target.left + 1, target.center.dy),
        target.bottomRight - const Offset(1, 1),
      ]) {
        expect(visual.contains(outside), isFalse);
        await tester.tapAt(outside);
      }
      expect(pressed, 3);
      await tester.tapAt(Offset(target.left - 1, target.center.dy));
      expect(pressed, 3);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('ICB-5: every size keeps its square token size inside the minimum target', (
      WidgetTester tester,
    ) async {
      const Map<TanreiIconButtonSize, double> sides = <TanreiIconButtonSize, double>{
        TanreiIconButtonSize.small: 32,
        TanreiIconButtonSize.medium: 36,
        TanreiIconButtonSize.large: 40,
      };
      for (final MapEntry<TanreiIconButtonSize, double> entry in sides.entries) {
        await tester.pumpWidget(tanreiTestApp(iconButton(size: entry.key)));
        expect(containerSize(tester), Size.square(entry.value), reason: '${entry.key}');
        expect(containerSize(tester), Size.square(iconButtonTokens.sizes[entry.key].containerSize));
        expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(48));
      }
    });

    testWidgets('ICB-5: the minimum target is the touch target token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem wide = system.copyWith(measure: system.measure.copyWith(targetTouch: 60));
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(size: TanreiIconButtonSize.small),
          theme: TanreiThemeData(system: wide),
        ),
      );
      expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(60));
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.small.containerSize));
    });

    testWidgets('a larger text size does not change the box or the icon: an icon is not text', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: iconButton(),
          ),
        ),
      );
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.medium.containerSize));
      expect(
        tester.getSize(find.text(favoriteGlyph)),
        Size.square(iconButtonTokens.sizes.medium.iconSize),
      );
      expect(tester.takeException(), isNull);
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

    testWidgets('ICB-7: a size and a variant the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValueReports();
      const TanreiIconButtonSize unknownSize = TanreiIconButtonSize('3x');
      const TanreiIconButtonVariant unknownVariant = TanreiIconButtonVariant('danger');
      expect(iconButtonTokens.sizes.has(unknownSize), isFalse);
      expect(iconButtonTokens.variants.has(unknownVariant), isFalse);

      for (final bool? isSelected in looks.values) {
        reports.clear();
        final List<int> unknown = await pixelsOf(
          tester,
          iconButton(size: unknownSize, variant: unknownVariant, isSelected: isSelected),
        );
        expect(tester.takeException(), isNull);
        final TanreiContainerDecoration decoration = containerDecoration(tester);
        final Size size = containerSize(tester);
        final TextStyle glyph = glyphStyle(tester);
        expect(reports, contains('icon-button size "3x" -> medium'));
        expect(reports, contains('icon-button variant "danger" -> standard'));

        reports.clear();
        final List<int> defaults = await pixelsOf(tester, iconButton(isSelected: isSelected));
        expect(reports, isEmpty);
        expect(decoration, containerDecoration(tester));
        expect(size, containerSize(tester));
        expect(glyph, glyphStyle(tester));
        expect(unknown, defaults, reason: 'pixel for pixel the default icon button ($isSelected)');
      }
    });

    testWidgets('ICB-7: an unknown value follows the default through disabled', (
      WidgetTester tester,
    ) async {
      collectUnknownValueReports();
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(enabled: false, variant: const TanreiIconButtonVariant('no-such-variant')),
        ),
      );
      expect(
        containerColor(tester),
        lightTheme.paint(iconButtonTokens.variants.standard.disabled.containerColor),
      );
    });

    testWidgets('ICB-7: with the reporter silent (what a release build does) nothing fails and '
        'the button still activates', (WidgetTester tester) async {
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) {};
      addTearDown(() => debugTanreiReportUnknownValue = previous);
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(
            onPressed: () => pressed++,
            size: const TanreiIconButtonSize('no-such-size'),
            variant: const TanreiIconButtonVariant('no-such-variant'),
          ),
        ),
      );
      await tester.tap(find.byType(TanreiIconButton));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(pressed, 1);
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.medium.containerSize));
      expect(tester.takeException(), isNull);
    });

    testWidgets('ICB-7: the default reporter reports an unknown value once, as a FlutterError, and '
        'the button still renders', (WidgetTester tester) async {
      const TanreiIconButtonSize unknown = TanreiIconButtonSize('icb-7-reported-once');
      await tester.pumpWidget(tanreiTestApp(iconButton(size: unknown)));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('Unknown icon-button size "icb-7-reported-once"'));
      expect('$reported', contains('"medium"'));
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.medium.containerSize));
      await tester.pumpWidget(tanreiTestApp(iconButton(enabled: false, size: unknown)));
      expect(tester.takeException(), isNull);
    });

    testWidgets('a size and a variant a design system added with copyWith drive the button', (
      WidgetTester tester,
    ) async {
      const TanreiIconButtonSize hero = TanreiIconButtonSize('hero');
      const TanreiIconButtonVariant danger = TanreiIconButtonVariant('danger');
      final TanreiSystem product = tanreiSystem.copyWith(
        iconButton: iconButtonTokens.copyWith(
          sizes: iconButtonTokens.sizes.copyWith(
            extra: <TanreiIconButtonSize, TanreiIconButtonSizeTokens>{
              hero: iconButtonTokens.sizes.large.copyWith(containerSize: 64, iconSize: 32),
            },
          ),
          variants: iconButtonTokens.variants.copyWith(
            extra: <TanreiIconButtonVariant, TanreiIconButtonVariantTokens>{
              danger: iconButtonTokens.variants.filled.copyWith(
                enabled: iconButtonTokens.variants.filled.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.error),
                  selectedContainerColor: const TanreiPaint.role(TanreiColorRole.errorContainer),
                ),
              ),
            },
          ),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(size: hero, variant: danger),
          theme: theme,
        ),
      );
      expect(containerSize(tester), const Size.square(64));
      expect(containerColor(tester), light.error);
      expect(tester.getSize(find.text(favoriteGlyph)), const Size.square(32));
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(size: hero, variant: danger, isSelected: true),
          theme: theme,
        ),
      );
      expect(containerColor(tester), light.errorContainer);
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (ICB-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(
      iconButtonTokens.variants.filled.pressed.containerColor,
    );
    const Duration tick = Duration(milliseconds: 1);
    Widget filled({VoidCallback? onPressed, bool autofocus = false}) => iconButton(
      variant: TanreiIconButtonVariant.filled,
      onPressed: onPressed,
      autofocus: autofocus,
    );

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('ICB-8: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration although the press ended at once', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(filled(onPressed: () => pressed++)));
        expect(containerColor(tester), light.primary);
        await tester.tap(find.byType(TanreiIconButton), kind: kind);
        await tester.pump();
        expect(pressed, 1);
        expect(containerColor(tester), pressedFill);
        await tester.pump(hold - tick);
        expect(containerColor(tester), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(containerColor(tester), isNot(pressedFill));
      });
    }

    testWidgets('ICB-8: a press held longer than the press-hold duration ends with the press', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(filled()));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      await tester.pump(hold * 3);
      expect(containerColor(tester), pressedFill);
      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(iconButtonTokens.motionStateDuration));
      expect(containerColor(tester), light.primary);
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('ICB-8: $name shows the pressed state at once and for the press-hold duration, '
          'and emits exactly once', (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(filled(onPressed: () => pressed++, autofocus: true)));
        await tester.pumpAndSettle();
        final Color focusedFill = containerColor(tester);
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(pressed, 1);
        expect(containerColor(tester), pressedFill);
        await tester.pump(hold - tick);
        expect(containerColor(tester), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(containerColor(tester), focusedFill);
        expect(pressed, 1);
      });
    }

    testWidgets('ICB-8: the semantic tap of assistive technology is a press, held like any other', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(filled(onPressed: () => pressed++)));
      tester.semantics.tap(find.semantics.byLabel('Favorite'));
      await tester.pump();
      expect(pressed, 1);
      expect(containerColor(tester), pressedFill);
      await tester.pump(hold);
      await tester.pumpAndSettle();
      expect(containerColor(tester), light.primary);
      handle.dispose();
    });

    testWidgets('ICB-8: the duration is the token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem calm = system.copyWith(
        motion: system.motion.copyWith(duration: system.motion.duration.copyWith(pressHold: 400)),
      );
      await tester.pumpWidget(tanreiTestApp(filled(), theme: TanreiThemeData(system: calm)));
      await tester.tap(find.byType(TanreiIconButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 399));
      expect(containerColor(tester), pressedFill);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(containerColor(tester), light.primary);
    });
  });

  group('choices of kind', () {
    Widget app(TanreiSystem of, Widget child, {bool disableAnimations = false}) => tanreiTestApp(
      child,
      theme: TanreiThemeData(system: of),
      disableAnimations: disableAnimations,
    );

    testWidgets('ICB-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      expect(system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      await tester.pumpWidget(app(system, iconButton(variant: TanreiIconButtonVariant.tonal)));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      expect(
        containerColor(tester),
        lightTheme.paint(iconButtonTokens.variants.tonal.pressed.containerColor),
      );
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets(
      'ICB-9: ripple (m3-like) grows the pressed container of the look from the point '
      'of contact over comp.icon-button.motion.feedback-duration, and fades when the press ends',
      (WidgetTester tester) async {
        const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
        final TanreiIconButtonTokens tokens = m3LikeSystem.iconButton;
        final TanreiIconButtonVariantTokens filled = tokens.variants.filled;
        // A toggle that is off: the ripple is the pressed container of the unselected look.
        final Color resting = theme.paint(filled.enabled.unselectedContainerColor);
        final Color pressedColor = theme.paint(filled.pressed.unselectedContainerColor);
        expect(pressedColor, isNot(resting));
        await tester.pumpWidget(
          app(m3LikeSystem, iconButton(variant: TanreiIconButtonVariant.filled, isSelected: false)),
        );
        final Rect box = tester.getRect(iconButtonContainerBox);
        const Offset contact = Offset(7, 5);
        final TestGesture touch = await tester.startGesture(box.topLeft + contact);
        await tester.pump();

        TanreiContainerDecoration decoration = containerDecoration(tester);
        expect(decoration.color, resting);
        expect(decoration.ripple!.origin, contact);
        expect(decoration.ripple!.color, pressedColor);
        expect(decoration.ripple!.progress, 0);
        expect(iconColor(tester), theme.paint(filled.pressed.unselectedIconColor));

        final Duration growth = tanreiDuration(tokens.motionFeedbackDuration);
        await tester.pump(growth ~/ 2);
        expect(
          containerDecoration(tester).ripple!.progress,
          moreOrLessEquals(tokens.motionStateEasing.toCurve().transform(0.5)),
        );
        await tester.pump(growth);
        expect(containerDecoration(tester).ripple!.progress, 1);

        await touch.up();
        await tester.pump();
        await tester.pump(tanreiDuration(tokens.motionStateDuration) ~/ 2);
        decoration = containerDecoration(tester);
        expect(decoration.ripple!.color, isNot(pressedColor));
        expect(decoration.ripple!.color, isNot(resting));
        await tester.pumpAndSettle();
        expect(containerDecoration(tester).ripple, isNull);
        expect(containerColor(tester), resting);
      },
    );

    testWidgets('ICB-9: a ripple started from the keyboard grows from the center', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        app(m3LikeSystem, iconButton(variant: TanreiIconButtonVariant.filled, autofocus: true)),
      );
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      final TanreiRipple ripple = containerDecoration(tester).ripple!;
      expect(ripple.origin, isNull, reason: 'null = the center of the container');
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);
    });

    testWidgets('ICB-9: with animations disabled a ripple covers the container at once', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(app(m3LikeSystem, iconButton(), disableAnimations: true));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      expect(containerDecoration(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pump();
      expect(containerDecoration(tester).ripple, isNull);
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'ICB-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; icon, outline, opacity and shape are the pressed tokens\''}',
        (WidgetTester tester) async {
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          final TanreiIconButtonVariantTokens outlined = iconButtonTokens.variants.outlined;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            iconButton: iconButtonTokens.copyWith(
              pressed: iconButtonTokens.pressed.copyWith(opacity: 0.5, containerShape: 2),
              variants: iconButtonTokens.variants.copyWith(
                outlined: outlined.copyWith(
                  pressed: outlined.pressed.copyWith(
                    unselectedContainerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    unselectedIconColor: const TanreiPaint.literal(Color(0xFF445566)),
                    unselectedOutlineColor: const TanreiPaint.literal(Color(0xFF778899)),
                  ),
                ),
              ),
            ),
          );
          final TanreiThemeData theme = TanreiThemeData(system: of);
          await tester.pumpWidget(
            app(of, iconButton(variant: TanreiIconButtonVariant.outlined, isSelected: false)),
          );
          final TestGesture mouse = await hover(tester);
          final TanreiContainerDecoration hovered = containerDecoration(tester);
          final Color hoveredIcon = iconColor(tester);
          expect(containerColor(tester), theme.paint(outlined.hovered.unselectedContainerColor));

          await mouse.down(tester.getCenter(find.byType(TanreiIconButton)));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerDecoration(tester);
          expect(drawn.color, hovered.color);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(iconColor(tester), hoveredIcon);
            expect(controlOpacity(tester), 1);
          } else {
            expect(iconColor(tester), const Color(0xFF445566));
            expect(drawn.border!.top.color, const Color(0xFF778899));
            expect(drawn.shape.radius, 2);
            expect(controlOpacity(tester), 0.5);
            expect(
              drawn.ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await mouse.up();
          await tester.pumpAndSettle(const Duration(milliseconds: 100));
        },
      );
    }

    testWidgets('ICB-9: dim (cupertino) applies the pressed opacity to the whole control and draws '
        'no state layer', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiIconButtonTokens tokens = cupertinoSystem.iconButton;
      expect(cupertinoSystem.behavior.pressedFeedback, TanreiPressedFeedback.dim);
      expect(tokens.pressed.opacity, lessThan(1));
      await tester.pumpWidget(
        app(cupertinoSystem, iconButton(variant: TanreiIconButtonVariant.filled)),
      );
      final Color resting = theme.paint(tokens.variants.filled.enabled.containerColor);
      expect(containerColor(tester), resting);
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      expect(controlOpacity(tester), tokens.pressed.opacity);
      expect(containerColor(tester), resting);
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('ICB-10: the corner smoothing of the system eases the container and the focus '
        'indicator: 0.6 under cupertino (a path), 0 by default (a plain RRect)', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      bool Function(Symbol, List<dynamic>) strokes(Symbol call) =>
          (Symbol method, List<dynamic> arguments) =>
              method == call && (arguments[1] as Paint).style == PaintingStyle.stroke;
      // Filled, so that the container paints; large, so that cupertino's pill has straight sides.
      Widget focused(TanreiSystem of) =>
          app(of, iconButton(variant: TanreiIconButtonVariant.filled, autofocus: true));

      await tester.pumpWidget(focused(system));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0);
      expect(containerDecoration(tester).shape.radius, iconButtonTokens.focused.containerShape);
      expect(iconButtonContainerBox, paints..rrect());
      expect(iconButtonContainerBox, isNot(paints..path()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawRRect)));

      // Any amount above 0 is a path; the amount is read from the system, not from its id. (The
      // shipped cupertino icon button is a circle, which smoothing leaves circular.)
      final TanreiSystem smoothed = system.copyWith(
        shape: system.shape.copyWith(cornerSmoothing: cupertinoSystem.shape.cornerSmoothing),
      );
      expect(cupertinoSystem.shape.cornerSmoothing, 0.6);
      await tester.pumpWidget(focused(smoothed));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(containerDecoration(tester).shape.isCircular, isFalse);
      expect(iconButtonContainerBox, paints..path());
      expect(iconButtonContainerBox, isNot(paints..rrect()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawPath)));
      expect(find.byType(TanreiFocusRing), isNot(paints..something(strokes(#drawRRect))));

      await tester.pumpWidget(focused(cupertinoSystem));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(
        containerDecoration(tester).shape.radius,
        cupertinoSystem.iconButton.focused.containerShape,
      );
    });

    testWidgets('ICB-10: the focus style of the system draws keyboard focus as a ring (default) or '
        'as a glow (acme)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(app(of, iconButton(autofocus: true)));
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

      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      final List<Paint> ring = await strokes(system);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint paint) => paint.maskFilter == null), isTrue);
      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow, hasLength(ring.length));
      for (final Paint paint in glow) {
        expect(
          paint.maskFilter,
          MaskFilter.blur(BlurStyle.normal, acmeSystem.measure.focusOuterWidth / 2),
        );
      }
    });
  });

  group('toggle', () {
    /// An owner that keeps the selection, as a product does: onPressed flips it.
    Widget owner({required ValueNotifier<bool> selected, required List<bool> changes}) =>
        ValueListenableBuilder<bool>(
          valueListenable: selected,
          builder: (BuildContext context, bool value, Widget? _) => iconButton(
            isSelected: value,
            variant: TanreiIconButtonVariant.filled,
            onPressed: () {
              selected.value = !value;
              changes.add(selected.value);
            },
          ),
        );

    testWidgets('ICB-11: activating a toggle emits once with the opposite of isSelected, by '
        'pointer, keyboard and assistive technology, and announces the new value as selected', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final ValueNotifier<bool> selected = ValueNotifier<bool>(false);
      addTearDown(selected.dispose);
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(owner(selected: selected, changes: changes)));

      Matcher announces({required bool isSelected}) => matchesSemantics(
        label: 'Favorite',
        isButton: true,
        hasEnabledState: true,
        isEnabled: true,
        isFocusable: true,
        isFocused: true,
        hasTapAction: true,
        hasFocusAction: true,
        hasSelectedState: true,
        isSelected: isSelected,
      );

      await tester.tap(find.byType(TanreiIconButton));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(changes, <bool>[true]);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(tester.getSemantics(find.byType(TanreiTapTarget)), announces(isSelected: true));

      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(changes, <bool>[true, false]);
      expect(tester.getSemantics(find.byType(TanreiTapTarget)), announces(isSelected: false));

      tester.semantics.tap(find.semantics.byLabel('Favorite'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(changes, <bool>[true, false, true]);
      expect(tester.getSemantics(find.byType(TanreiTapTarget)), announces(isSelected: true));
      handle.dispose();
    });

    testWidgets(
      'ICB-11: click, then change — onPressed (both, in Flutter\'s idiom) is called once, '
      'while the button still shows isSelected, and the opposite is drawn and announced only '
      'after it',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        final List<String> events = <String>[];
        bool selected = false;
        late StateSetter update;
        await tester.pumpWidget(
          tanreiTestApp(
            StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                update = setState;
                return TanreiIconButton(
                  isSelected: selected,
                  semanticLabel: 'Favorite',
                  icon: const Text('F'),
                  onPressed: () {
                    // The click: the button still draws and exposes the old value.
                    final bool shown = tester
                        .widget<TanreiIconButton>(find.byType(TanreiIconButton))
                        .isSelected!;
                    events.add('click shows $shown');
                    // The change: the owner flips it to the opposite.
                    update(() => selected = !selected);
                    events.add('change to $selected');
                  },
                );
              },
            ),
          ),
        );
        await tester.tap(find.byType(TanreiIconButton));
        await tester.pump();
        expect(events, <String>['click shows false', 'change to true']);
        expect(
          tester
              .getSemantics(find.byType(TanreiTapTarget))
              .getSemanticsData()
              .hasFlag(SemanticsFlag.isSelected),
          isTrue,
        );
        await tester.pumpAndSettle(const Duration(milliseconds: 100));
        handle.dispose();
      },
    );

    testWidgets('ICB-11: a toggle is a button with a selected state, never a switch or a checkbox; '
        'a plain icon button exposes no selected state at all', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final bool? isSelected in looks.values) {
        await tester.pumpWidget(tanreiTestApp(iconButton(isSelected: isSelected)));
        final SemanticsData data = tester
            .getSemantics(find.byType(TanreiTapTarget))
            .getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.isButton), isTrue);
        expect(data.hasFlag(SemanticsFlag.hasSelectedState), isSelected != null);
        expect(data.hasFlag(SemanticsFlag.isSelected), isSelected ?? false);
        expect(data.hasFlag(SemanticsFlag.hasToggledState), isFalse);
        expect(data.hasFlag(SemanticsFlag.hasCheckedState), isFalse);
      }
      handle.dispose();
    });

    for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
      testWidgets('ICB-12: ${variant.name} draws its own parts as a plain button, the unselected '
          'parts when off and the selected parts when on (dark scheme)', (
        WidgetTester tester,
      ) async {
        const TanreiThemeData theme = TanreiThemeData.dark;
        final TanreiIconButtonVariantStateTokens enabled =
            iconButtonTokens.variants[variant].enabled;
        for (final MapEntry<String, bool?> look in looks.entries) {
          await tester.pumpWidget(
            tanreiTestApp(
              iconButton(variant: variant, isSelected: look.value),
              theme: theme,
            ),
          );
          final ({TanreiPaint container, TanreiPaint icon, TanreiPaint outline}) parts = partsOf(
            enabled,
            look.value,
          );
          expect(containerColor(tester), theme.paint(parts.container), reason: look.key);
          expect(iconColor(tester), theme.paint(parts.icon), reason: look.key);
          expect(outlineColor(tester), theme.paint(parts.outline), reason: look.key);
        }
      });
    }

    testWidgets('ICB-12: the default values, by role', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData.dark;
      final TanreiColors colors = system.schemes.dark;
      const Color none = Color(0x00000000);
      // variant, isSelected -> container, icon, outline
      final Map<(TanreiIconButtonVariant, bool?), (Color, Color, Color)>
      expected = <(TanreiIconButtonVariant, bool?), (Color, Color, Color)>{
        (TanreiIconButtonVariant.standard, null): (none, colors.onSurfaceVariant, none),
        (TanreiIconButtonVariant.standard, false): (none, colors.onSurfaceVariant, none),
        (TanreiIconButtonVariant.standard, true): (none, colors.onSurface, none),
        (TanreiIconButtonVariant.filled, null): (colors.primary, colors.onPrimary, none),
        (TanreiIconButtonVariant.filled, false): (
          colors.surfaceContainerHighest,
          colors.onSurfaceVariant,
          none,
        ),
        (TanreiIconButtonVariant.filled, true): (colors.primary, colors.onPrimary, none),
        (TanreiIconButtonVariant.tonal, null): (
          colors.secondaryContainer,
          colors.onSecondaryContainer,
          none,
        ),
        (TanreiIconButtonVariant.tonal, false): (
          colors.surfaceContainerHighest,
          colors.onSurfaceVariant,
          none,
        ),
        (TanreiIconButtonVariant.tonal, true): (colors.secondary, colors.onSecondary, none),
        (TanreiIconButtonVariant.outlined, null): (none, colors.onSurfaceVariant, colors.outline),
        (TanreiIconButtonVariant.outlined, false): (none, colors.onSurfaceVariant, colors.outline),
        (TanreiIconButtonVariant.outlined, true): (
          colors.inverseSurface,
          colors.inverseOnSurface,
          none,
        ),
      };
      for (final MapEntry<(TanreiIconButtonVariant, bool?), (Color, Color, Color)> entry
          in expected.entries) {
        final (TanreiIconButtonVariant variant, bool? isSelected) = entry.key;
        await tester.pumpWidget(
          tanreiTestApp(
            iconButton(variant: variant, isSelected: isSelected),
            theme: theme,
          ),
        );
        final String reason = '${variant.name} $isSelected';
        expect(containerColor(tester), entry.value.$1, reason: reason);
        expect(iconColor(tester), entry.value.$2, reason: reason);
        expect(outlineColor(tester), entry.value.$3, reason: reason);
        if (entry.value.$3.a > 0) {
          final Border border = containerDecoration(tester).border!;
          expect(border.top.width, iconButtonTokens.sizes.medium.outlineWidth, reason: reason);
          expect(border.top.strokeAlign, BorderSide.strokeAlignInside, reason: reason);
        }
      }
    });

    testWidgets('ICB-12: every look is read from its own tokens — a system that gives the three '
        'looks three different values draws three different buttons', (WidgetTester tester) async {
      const Color plain = Color(0xFF102030);
      const Color off = Color(0xFF405060);
      const Color on = Color(0xFF708090);
      final TanreiIconButtonVariantTokens standard = iconButtonTokens.variants.standard;
      final TanreiSystem product = system.copyWith(
        iconButton: iconButtonTokens.copyWith(
          variants: iconButtonTokens.variants.copyWith(
            standard: standard.copyWith(
              enabled: standard.enabled.copyWith(
                containerColor: const TanreiPaint.literal(plain),
                iconColor: const TanreiPaint.literal(on),
                unselectedContainerColor: const TanreiPaint.literal(off),
                unselectedIconColor: const TanreiPaint.literal(plain),
                unselectedOutlineColor: const TanreiPaint.literal(on),
                selectedContainerColor: const TanreiPaint.literal(on),
                selectedIconColor: const TanreiPaint.literal(off),
              ),
            ),
          ),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      final Map<bool?, (Color, Color, Color)> expected = <bool?, (Color, Color, Color)>{
        null: (plain, on, const Color(0x00000000)),
        false: (off, plain, on),
        true: (on, off, const Color(0x00000000)),
      };
      for (final MapEntry<bool?, (Color, Color, Color)> entry in expected.entries) {
        await tester.pumpWidget(tanreiTestApp(iconButton(isSelected: entry.key), theme: theme));
        expect(containerColor(tester), entry.value.$1, reason: '${entry.key}');
        expect(iconColor(tester), entry.value.$2, reason: '${entry.key}');
        expect(outlineColor(tester), entry.value.$3, reason: '${entry.key}');
      }
    });
  });

  group('icon', () {
    testWidgets('ICB-13: the icon is drawn at the icon size of its size, with the weight of the '
        'system and an optical size clamped to sys.icon.optical-size', (WidgetTester tester) async {
      final TanreiIconStyle icon = system.icon;
      expect(<double>[icon.opticalSizeMin, icon.opticalSizeMax], <double>[20, 48]);
      const Map<TanreiIconButtonSize, (double, double)> expected =
          <TanreiIconButtonSize, (double, double)>{
            // size -> icon box, opsz
            TanreiIconButtonSize.small: (16, 20), // below the font's range: clamped up
            TanreiIconButtonSize.medium: (20, 20),
            TanreiIconButtonSize.large: (24, 24),
          };
      for (final MapEntry<TanreiIconButtonSize, (double, double)> entry in expected.entries) {
        await tester.pumpWidget(tanreiTestApp(iconButton(size: entry.key)));
        final double size = iconButtonTokens.sizes[entry.key].iconSize;
        expect(size, entry.value.$1);
        expect(tester.getSize(find.text(favoriteGlyph)), Size.square(size));
        final IconThemeData theme = iconTheme(tester);
        expect(theme.size, size);
        expect(theme.weight, icon.weight);
        expect(theme.opticalSize, entry.value.$2, reason: '${entry.key}');
        expect(theme.grade, 0);
        expect(theme.color, iconColor(tester));
        final TextStyle glyph = glyphStyle(tester);
        expect(glyph.fontSize, size);
        expect(glyph.fontVariations, contains(FontVariation.opticalSize(entry.value.$2)));
        expect(glyph.fontVariations, contains(FontVariation.weight(icon.weight)));
      }
    });

    testWidgets('ICB-13: the family and fill are those of the selection — selected only for a '
        'toggle that is on (acme: two static families)', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiIconStyle icon = acmeSystem.icon;
      expect(icon.family(selected: false), 'Material Icons Outlined');
      expect(icon.family(selected: true), 'Material Icons');
      for (final MapEntry<String, bool?> look in looks.entries) {
        await tester.pumpWidget(tanreiTestApp(iconButton(isSelected: look.value), theme: theme));
        final bool selected = look.value ?? false;
        expect(glyphStyle(tester).fontFamily, icon.family(selected: selected), reason: look.key);
        expect(iconTheme(tester).fill, icon.fill(selected: selected), reason: look.key);
        expect(
          glyphStyle(tester).fontVariations,
          contains(FontVariation('FILL', icon.fill(selected: selected))),
          reason: look.key,
        );
      }
    });

    testWidgets('ICB-13: the icon style is read from the system: weight, fills and the optical '
        'range of another icon font change what is drawn', (WidgetTester tester) async {
      final TanreiSystem product = system.copyWith(
        icon: system.icon.copyWith(
          weight: 600,
          fillUnselected: 0.25,
          fillSelected: 0.75,
          opticalSizeMin: 30,
          opticalSizeMax: 40,
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(tanreiTestApp(iconButton(isSelected: true), theme: theme));
      expect(iconTheme(tester).weight, 600);
      expect(iconTheme(tester).fill, 0.75);
      expect(iconTheme(tester).opticalSize, 30);
      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(isSelected: false, size: const TanreiIconButtonSize('hero')),
          theme: TanreiThemeData(
            system: product.copyWith(
              iconButton: product.iconButton.copyWith(
                sizes: product.iconButton.sizes.copyWith(
                  extra: <TanreiIconButtonSize, TanreiIconButtonSizeTokens>{
                    const TanreiIconButtonSize('hero'): product.iconButton.sizes.large.copyWith(
                      containerSize: 64,
                      iconSize: 48,
                    ),
                  },
                ),
              ),
            ),
          ),
        ),
      );
      expect(iconTheme(tester).fill, 0.25);
      expect(iconTheme(tester).opticalSize, 40);
    });

    testWidgets('ICB-13: an Icon in the slot takes size, color, fill, weight and optical size from '
        'the button, not from an ambient icon theme', (WidgetTester tester) async {
      const IconData heart = IconData(0xe87d, fontFamily: 'Material Symbols Rounded');
      await tester.pumpWidget(
        tanreiTestApp(
          IconTheme(
            data: const IconThemeData(size: 99, opacity: 0.5, weight: 100, fill: 0.5),
            child: iconButton(
              variant: TanreiIconButtonVariant.filled,
              isSelected: true,
              icon: const Icon(heart),
            ),
          ),
        ),
      );
      final RichText glyph = tester.widget<RichText>(
        find.descendant(of: find.byType(Icon), matching: find.byType(RichText)),
      );
      final TextStyle style = glyph.text.style!;
      final double size = iconButtonTokens.sizes.medium.iconSize;
      expect(tester.getSize(find.byType(Icon)), Size.square(size));
      expect(style.fontSize, size);
      expect(style.color, light.onPrimary);
      expect(style.fontVariations, contains(FontVariation('FILL', system.icon.fillSelected)));
      expect(style.fontVariations, contains(FontVariation.weight(system.icon.weight)));
      expect(style.fontVariations, contains(const FontVariation.opticalSize(20)));
    });
  });

  group('accessible name', () {
    testWidgets('ICB-14: an empty label still renders, and debug builds report it once — not on '
        'every build', (WidgetTester tester) async {
      final List<String> reports = collectMissingNameReports();
      await tester.pumpWidget(tanreiTestApp(iconButton(semanticLabel: '')));
      expect(find.byType(TanreiIconButton), findsOneWidget);
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.medium.containerSize));
      expect(reports, <String>['icon-button']);
      await tester.pumpWidget(tanreiTestApp(iconButton(semanticLabel: '', isSelected: true)));
      expect(reports, hasLength(1));

      // Given a name and losing it again: reported again. White space is not a name.
      await tester.pumpWidget(tanreiTestApp(iconButton()));
      await tester.pumpWidget(tanreiTestApp(iconButton(semanticLabel: '  ')));
      expect(reports, hasLength(2));
    });

    testWidgets('ICB-14: a named icon button is not reported', (WidgetTester tester) async {
      final List<String> reports = collectMissingNameReports();
      await tester.pumpWidget(tanreiTestApp(iconButton()));
      await tester.pumpWidget(tanreiTestApp(iconButton(isSelected: false)));
      expect(reports, isEmpty);
    });

    testWidgets('ICB-14: the default reporter reports a FlutterError that says what to do', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(iconButton(semanticLabel: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('icon-button has no accessible name'));
      expect('$reported', contains('semanticLabel'));
      expect(find.byType(TanreiIconButton), findsOneWidget);
    });

    test('ICB-14: white space is not a name', () {
      expect(tanreiIsAccessibleName('Favorite'), isTrue);
      expect(tanreiIsAccessibleName(''), isFalse);
      expect(tanreiIsAccessibleName(' \n'), isFalse);
      expect(tanreiIsAccessibleName(null), isFalse);
    });
  });

  group('accessibility', () {
    testWidgets('semantics: button role, enabled state, the label as the name, and the icon is '
        'decorative', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(iconButton()));
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiTapTarget));
      expect(
        node,
        matchesSemantics(
          label: 'Favorite',
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      // The glyph adds nothing: no child node, and no glyph in the label.
      expect(node.mergeAllDescendantsIntoThisNode || node.childrenCount == 0, isTrue);
      expect(node.label, isNot(contains(favoriteGlyph)));
      handle.dispose();
    });

    for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        testWidgets('guidelines: ${variant.name} small on ${theme.brightness.name}', (
          WidgetTester tester,
        ) async {
          final SemanticsHandle handle = tester.ensureSemantics();
          await tester.pumpWidget(
            tanreiTestApp(
              iconButton(variant: variant, size: TanreiIconButtonSize.small, isSelected: false),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          handle.dispose();
        });
      }
    }

    // WCAG 1.4.11: the icon is the only thing that says what the button does, so it needs 3:1
    // against what it is drawn on — the container composited over the surface.
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('non-text contrast: every enabled look of every variant in the ${brightness.name} '
            '${contrast.name} scheme meets 3:1 (icon against its container over the surface)', () {
          final List<String> failures = <String>[];
          for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
            for (final MapEntry<String, bool?> look in looks.entries) {
              final ({TanreiPaint container, TanreiPaint icon, TanreiPaint outline}) parts =
                  partsOf(iconButtonTokens.variants[variant].enabled, look.value);
              final Color background = Color.alphaBlend(
                theme.paint(parts.container),
                theme.colors.surface,
              );
              final Color icon = Color.alphaBlend(theme.paint(parts.icon), background);
              final double ratio = contrastRatio(icon, background);
              if (ratio < nonTextContrastMinimum) {
                failures.add('${variant.name} ${look.key}: ${ratio.toStringAsFixed(2)}');
              }
            }
          }
          expect(failures, isEmpty);
        });
      }
    }
  });

  group('a design system drives rendering', () {
    testWidgets('size, shape and opacity tokens of a product system drive the button', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        iconButton: iconButtonTokens.copyWith(
          containerShape: 0,
          sizes: iconButtonTokens.sizes.copyWith(
            medium: iconButtonTokens.sizes.medium.copyWith(
              containerSize: 44,
              iconSize: 28,
              outlineWidth: 3,
            ),
          ),
          disabled: iconButtonTokens.disabled.copyWith(opacity: 0.5, containerShape: 12),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(
        tanreiTestApp(iconButton(variant: TanreiIconButtonVariant.outlined), theme: theme),
      );
      expect(containerSize(tester), const Size.square(44));
      expect(tester.getSize(find.text(favoriteGlyph)), const Size.square(28));
      expect(containerDecoration(tester).border!.top.width, 3);
      expect(containerDecoration(tester).shape.radius, 0);
      expect(controlOpacity(tester), 1);

      await tester.pumpWidget(
        tanreiTestApp(
          iconButton(variant: TanreiIconButtonVariant.outlined, enabled: false),
          theme: theme,
        ),
      );
      // Becoming disabled is a state change: it eases.
      await tester.pumpAndSettle();
      expect(controlOpacity(tester), 0.5);
      expect(containerDecoration(tester).shape.radius, 12);
    });

    testWidgets('an icon button re-reads its tokens when the system in the theme changes', (
      WidgetTester tester,
    ) async {
      final Widget button = iconButton(variant: TanreiIconButtonVariant.filled);
      await tester.pumpWidget(tanreiTestApp(button));
      expect(containerSize(tester), Size.square(iconButtonTokens.sizes.medium.containerSize));
      await tester.pumpWidget(
        tanreiTestApp(button, theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      expect(
        containerSize(tester),
        Size.square(m3LikeSystem.iconButton.sizes.medium.containerSize),
      );
      expect(containerDecoration(tester).shape.radius, m3LikeSystem.iconButton.containerShape);
    });

    test('the tokens the widget reads: the default square sizes (32 / 36 / 40, icons '
        '16 / 20 / 24, hairline outline)', () {
      final Map<TanreiIconButtonSize, List<double>> expected = <TanreiIconButtonSize, List<double>>{
        TanreiIconButtonSize.small: <double>[32, 16, system.measure.borderHairline],
        TanreiIconButtonSize.medium: <double>[36, 20, system.measure.borderHairline],
        TanreiIconButtonSize.large: <double>[40, 24, system.measure.borderHairline],
      };
      expect(iconButtonTokens.sizes.keys, expected.keys);
      for (final MapEntry<TanreiIconButtonSize, List<double>> entry in expected.entries) {
        final TanreiIconButtonSizeTokens size = iconButtonTokens.sizes[entry.key];
        expect(<double>[size.containerSize, size.iconSize, size.outlineWidth], entry.value);
        // Button's heights, so the two sit in one row.
        expect(
          size.containerSize,
          system.button.sizes[TanreiButtonSize(entry.key.name)].containerHeight,
        );
      }
      expect(iconButtonTokens.variants.keys, TanreiIconButtonVariant.core);
    });
  });

  group('goldens', () {
    // One baseline per spec fixture, read from the spec so the two cannot drift apart.
    final Map<String, dynamic> spec =
        jsonDecode(File('../../specs/icon-button.spec.json').readAsStringSync())
            as Map<String, dynamic>;
    final List<Map<String, dynamic>> fixtures = (spec['fixtures'] as List<dynamic>)
        .cast<Map<String, dynamic>>();

    test('the spec lists the fixtures this suite records, and each shows the favorite icon', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'standard-medium',
        'filled-medium',
        'tonal-medium',
        'outlined-medium',
        'standard-small',
        'standard-large',
        'standard-disabled',
        'standard-selected',
        'filled-unselected',
        'filled-selected',
        'tonal-selected',
        'outlined-selected',
        'outlined-disabled',
        'standard-unselected',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String>{'favorite'});
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectIconButtonGolden(
          tester,
          system: system,
          props: props,
          file: 'goldens/icon_button/$id.png',
        );
      });
    }
  });
}
