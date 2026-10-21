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
final TanreiFabTokens fabTokens = system.fab;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The `add` glyph of Material Symbols (the fixtures' content). Icon names belong to the product;
/// the tests draw the glyph as text so that it takes the family of the theme (with the Flutter test
/// font it is a box).
const String addGlyph = '\u{e145}';
const Widget add = Text(addGlyph);

/// The frame of the FAB baselines: tall enough for the large FAB (64) and the solid shadow that
/// `flutter test` draws below it (`debugDisableShadows`).
const Size fabGoldenSurface = Size(160, 112);

Widget fab({
  VoidCallback? onPressed,
  bool enabled = true,
  TanreiFabVariant variant = TanreiFabVariant.filled,
  TanreiFabSize size = TanreiFabSize.medium,
  String semanticLabel = 'Create',
  FocusNode? focusNode,
  bool autofocus = false,
  Widget icon = add,
  Key? key,
}) => TanreiFloatingActionButton(
  key: key,
  onPressed: enabled ? (onPressed ?? () {}) : null,
  variant: variant,
  size: size,
  semanticLabel: semanticLabel,
  focusNode: focusNode,
  autofocus: autofocus,
  icon: icon,
);

/// The visual container (the first box inside the focus ring).
Finder get fabContainer =>
    find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first;

TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(fabContainer).decoration as TanreiContainerDecoration;

Size containerSize(WidgetTester tester) => tester.getSize(fabContainer);

Color containerColor(WidgetTester tester) =>
    containerDecoration(tester).color ?? const Color(0x00000000);

TextStyle glyphStyle(WidgetTester tester) =>
    DefaultTextStyle.of(tester.element(find.text(addGlyph))).style;

Color iconColor(WidgetTester tester) => glyphStyle(tester).color!;

IconThemeData iconTheme(WidgetTester tester) => IconTheme.of(tester.element(find.text(addGlyph)));

double controlOpacity(WidgetTester tester) => tester
    .widget<Opacity>(
      find.descendant(of: find.byType(TanreiFloatingActionButton), matching: find.byType(Opacity)),
    )
    .opacity;

bool focusRingVisible(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

/// The resolved elevation of [layers] in [colors] (default: the light scheme).
TanreiResolvedElevation elevationOf(List<TanreiShadowLayer> layers, [TanreiColors? colors]) =>
    TanreiResolvedElevation.resolve(layers, colors ?? light);

void expectElevation(
  WidgetTester tester,
  List<TanreiShadowLayer> layers, {
  TanreiColors? colors,
  String? reason,
}) {
  final TanreiResolvedElevation expected = elevationOf(layers, colors);
  final TanreiContainerDecoration drawn = containerDecoration(tester);
  expect(drawn.border, expected.ring, reason: reason);
  expect(drawn.boxShadow ?? const <BoxShadow>[], expected.shadows, reason: reason);
}

Future<TestGesture> hover(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(find.byType(TanreiFloatingActionButton)));
  await tester.pumpAndSettle();
  return mouse;
}

/// What the default system's rules draw: [layer] at [opacity] composited over [container].
Color overlaid(Color container, Color layer, double opacity) =>
    Color.alphaBlend(layer.withValues(alpha: layer.a * opacity), container);

/// The FAB of a spec fixture's [props].
Widget fixtureFab(Map<String, dynamic> props) => TanreiFloatingActionButton(
  onPressed: props['disabled'] == true ? null : () {},
  variant: TanreiFabVariant(props['variant'] as String? ?? 'filled'),
  size: TanreiFabSize(props['size'] as String? ?? 'medium'),
  semanticLabel: props['label'] as String? ?? '',
  icon: add,
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('FAB-1: a ${kind.name} tap emits onPressed exactly once', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(fab(onPressed: () => pressed++)));
        await tester.tap(find.byType(TanreiFloatingActionButton), kind: kind);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('FAB-1: $name emits onPressed exactly once', (WidgetTester tester) async {
        int pressed = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(fab(onPressed: () => pressed++, focusNode: focusNode)),
        );
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasPrimaryFocus, isTrue);
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    testWidgets('FAB-1: keyboard activation works without an app-level Shortcuts widget', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: TanreiTheme(
              data: lightTheme,
              child: Center(child: fab(onPressed: () => pressed++, autofocus: true)),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 2);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('FAB-1: the semantic tap action emits onPressed exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(fab(onPressed: () => pressed++)));
      tester.semantics.tap(find.semantics.byLabel('Create'));
      await tester.pump();
      expect(pressed, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('FAB-2: a null onPressed emits nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(fab(enabled: false, focusNode: focusNode)));
      await tester.tap(find.byType(TanreiFloatingActionButton));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Create',
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

    testWidgets('FAB-2: disabling a FAB stops onPressed and removes it from the focus order', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool enabled}) =>
          tanreiTestApp(fab(enabled: enabled, onPressed: () => pressed++, focusNode: focusNode));

      await tester.pumpWidget(build(enabled: true));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);

      await tester.pumpWidget(build(enabled: false));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.tap(find.byType(TanreiFloatingActionButton));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(pressed, 0);
    });

    for (final TanreiFabVariant variant in TanreiFabVariant.core) {
      testWidgets('FAB-6: disabled ${variant.name} draws container, icon, elevation and opacity '
          'from the disabled tokens of its variant', (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(fab(enabled: false, variant: variant)));
        final TanreiFabVariantStateTokens disabled = fabTokens.variants[variant].disabled;
        expect(containerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(iconColor(tester), lightTheme.paint(disabled.iconColor));
        expectElevation(tester, disabled.containerElevation);
        expect(controlOpacity(tester), fabTokens.disabled.opacity);
      });
    }

    testWidgets('FAB-6: the default values — a disabled FAB is an on-surface fill at the disabled '
        'container opacity with a disabled-content icon, and nothing raised', (
      WidgetTester tester,
    ) async {
      for (final TanreiFabVariant variant in TanreiFabVariant.core) {
        await tester.pumpWidget(tanreiTestApp(fab(enabled: false, variant: variant)));
        expect(
          containerColor(tester),
          isSameColorAs(light.onSurface.withValues(alpha: system.state.disabledContainerOpacity)),
          reason: variant.name,
        );
        expect(iconColor(tester).a, closeTo(system.state.disabledContentOpacity, 1e-6));
        expect(iconColor(tester).withValues(alpha: 1), light.onSurface);
        expect(containerDecoration(tester).boxShadow, isNull, reason: variant.name);
        expect(containerDecoration(tester).border, isNull, reason: variant.name);
        expect(controlOpacity(tester), 1);
      }
    });
  });

  group('interaction states', () {
    testWidgets('FAB-3: container, icon, elevation and opacity come from the tokens of the '
        'highest-precedence state, pressed > focused > hovered', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiFabVariantTokens filled = fabTokens.variants.filled;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(fab(focusNode: focusNode)));
      void expectDrawnFrom(TanreiFabVariantStateTokens tokens, TanreiFabStateTokens? state) {
        expect(containerColor(tester), lightTheme.paint(tokens.containerColor));
        expect(iconColor(tester), lightTheme.paint(tokens.iconColor));
        expectElevation(tester, tokens.containerElevation);
        expect(controlOpacity(tester), state?.opacity ?? 1);
      }

      expectDrawnFrom(filled.enabled, null);
      expect(containerColor(tester), light.primary);
      expect(iconColor(tester), light.onPrimary);
      expect(filled.enabled.containerElevation, system.elevation.level3);

      // Hovered: the default system mixes the state-layer color, here the icon color,
      // and raises the FAB to level4.
      final TestGesture mouse = await hover(tester);
      expectDrawnFrom(filled.hovered, fabTokens.hovered);
      expect(
        containerColor(tester),
        isSameColorAs(
          overlaid(light.primary, light.onPrimary, system.state.hoverStateLayerOpacity),
        ),
      );
      expect(filled.hovered.containerElevation, system.elevation.level4);

      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.focused, fabTokens.focused);
      expect(filled.focused.containerElevation, system.elevation.level3);

      await mouse.down(tester.getCenter(find.byType(TanreiFloatingActionButton)));
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.pressed, fabTokens.pressed);
      expect(filled.pressed.containerElevation, system.elevation.level3);

      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.enabled, null);
    });

    testWidgets('FAB-3: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(fab(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(containerColor(tester), light.primary);
    });

    testWidgets('FAB-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible without overriding anything', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiFabVariantTokens filled = acmeSystem.fab.variants.filled;
      final Color hovered = theme.paint(filled.hovered.containerColor);
      final Color focused = theme.paint(filled.focused.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(<Color>{hovered, focused, pressedColor}, hasLength(3));
      expect(acmeSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);

      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(fab(focusNode: focusNode), theme: theme));
      final TestGesture mouse = await hover(tester);
      expect(containerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
      await mouse.down(tester.getCenter(find.byType(TanreiFloatingActionButton)));
      await tester.pump();
      expect(containerColor(tester), pressedColor);
      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
    });
  });

  group('focus ring', () {
    testWidgets('FAB-4: keyboard focus shows the focus ring at once, around the square', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(Column(mainAxisSize: MainAxisSize.min, children: <Widget>[fab()])),
      );
      expect(focusRingVisible(tester), isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusRingVisible(tester), isTrue);

      final TanreiMeasure measure = system.measure;
      final double offset = measure.focusOffset + measure.focusOuterWidth / 2;
      final Rect visual = Offset.zero & containerSize(tester);
      expect(visual.size, Size.square(fabTokens.sizes.medium.containerSize));
      final RRect expectedRing = BorderRadius.circular(
        fabTokens.sizes.medium.containerShape,
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

    testWidgets('FAB-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(fab(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(focusRingVisible(tester), isFalse);
    });
  });

  group('target size', () {
    testWidgets('FAB-5: the small FAB extends its hit area on both axes to sys.target.touch '
        'without changing the visual size', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(fab(size: TanreiFabSize.small, onPressed: () => pressed++)),
      );
      expect(containerSize(tester), Size.square(fabTokens.sizes.small.containerSize));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.size, Size.square(system.measure.targetTouch));

      final Rect visual = tester.getRect(fabContainer);
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

    testWidgets('FAB-5: every size keeps its square inside a target of at least sys.target.touch; '
        'a FAB larger than the target is its own target', (WidgetTester tester) async {
      for (final TanreiFabSize size in TanreiFabSize.core) {
        await tester.pumpWidget(tanreiTestApp(fab(size: size)));
        final double side = fabTokens.sizes[size].containerSize;
        expect(containerSize(tester), Size.square(side), reason: size.name);
        final double target = side > system.measure.targetTouch ? side : system.measure.targetTouch;
        expect(tester.getSize(find.byType(TanreiTapTarget)), Size.square(target));
      }
    });

    testWidgets('FAB-5: the minimum target is the touch target token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem wide = system.copyWith(measure: system.measure.copyWith(targetTouch: 60));
      await tester.pumpWidget(
        tanreiTestApp(
          fab(size: TanreiFabSize.small),
          theme: TanreiThemeData(system: wide),
        ),
      );
      expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(60));
      expect(containerSize(tester), Size.square(fabTokens.sizes.small.containerSize));
    });

    testWidgets('a larger text size does not change the square or the icon: an icon is not text', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: fab(),
          ),
        ),
      );
      expect(containerSize(tester), Size.square(fabTokens.sizes.medium.containerSize));
      expect(tester.getSize(find.text(addGlyph)), Size.square(fabTokens.sizes.medium.iconSize));
      expect(tester.takeException(), isNull);
    });
  });

  group('open size and variant keys', () {
    testWidgets('FAB-7: a size and a variant the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      const TanreiFabSize unknownSize = TanreiFabSize('3x');
      const TanreiFabVariant unknownVariant = TanreiFabVariant('danger');
      expect(fabTokens.sizes.has(unknownSize), isFalse);
      expect(fabTokens.variants.has(unknownVariant), isFalse);

      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        surface: fabGoldenSurface,
        child: fab(size: unknownSize, variant: unknownVariant),
      );
      expect(tester.takeException(), isNull);
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      final TextStyle glyph = glyphStyle(tester);
      expect(reports, contains('fab size "3x" -> medium'));
      expect(reports, contains('fab variant "danger" -> filled'));

      reports.clear();
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        surface: fabGoldenSurface,
        child: fab(),
      );
      expect(reports, isEmpty);
      expect(decoration, containerDecoration(tester));
      expect(glyph, glyphStyle(tester));
      expect(unknown, defaults, reason: 'pixel for pixel the default FAB');
    });

    testWidgets('FAB-7: an unknown value follows the default through disabled, and with the '
        'reporter silent (a release build) nothing fails and the FAB still activates', (
      WidgetTester tester,
    ) async {
      collectUnknownValues();
      await tester.pumpWidget(
        tanreiTestApp(fab(enabled: false, variant: const TanreiFabVariant('no-such-variant'))),
      );
      expect(
        containerColor(tester),
        lightTheme.paint(fabTokens.variants.filled.disabled.containerColor),
      );

      debugTanreiReportUnknownValue = (String kind, String key, String fallback) {};
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(
          fab(
            onPressed: () => pressed++,
            size: const TanreiFabSize('no-such-size'),
            variant: const TanreiFabVariant('no-such-variant'),
          ),
        ),
      );
      await tester.tap(find.byType(TanreiFloatingActionButton));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(pressed, 1);
      expect(containerSize(tester), Size.square(fabTokens.sizes.medium.containerSize));
      expect(tester.takeException(), isNull);
    });

    testWidgets('FAB-7: the default reporter reports an unknown value as a FlutterError, and the '
        'FAB still renders', (WidgetTester tester) async {
      const TanreiFabSize unknown = TanreiFabSize('fab-7-reported');
      await tester.pumpWidget(tanreiTestApp(fab(size: unknown)));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('fab size "fab-7-reported"'));
      expect(containerSize(tester), Size.square(fabTokens.sizes.medium.containerSize));
    });

    testWidgets('a size and a variant a design system added with copyWith drive the FAB', (
      WidgetTester tester,
    ) async {
      const TanreiFabSize hero = TanreiFabSize('hero');
      const TanreiFabVariant danger = TanreiFabVariant('danger');
      final TanreiSystem product = tanreiSystem.copyWith(
        fab: fabTokens.copyWith(
          sizes: fabTokens.sizes.copyWith(
            extra: <TanreiFabSize, TanreiFabSizeTokens>{
              hero: fabTokens.sizes.large.copyWith(
                containerSize: 96,
                containerShape: 28,
                iconSize: 36,
              ),
            },
          ),
          variants: fabTokens.variants.copyWith(
            extra: <TanreiFabVariant, TanreiFabVariantTokens>{
              danger: fabTokens.variants.filled.copyWith(
                enabled: fabTokens.variants.filled.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.error),
                  iconColor: const TanreiPaint.role(TanreiColorRole.onError),
                ),
              ),
            },
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          fab(size: hero, variant: danger),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(containerSize(tester), const Size.square(96));
      expect(containerDecoration(tester).shape.radius, 28);
      expect(containerColor(tester), light.error);
      expect(iconColor(tester), light.onError);
      expect(tester.getSize(find.text(addGlyph)), const Size.square(36));
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (FAB-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(fabTokens.variants.filled.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('FAB-8: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration although the press ended at once', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(fab(onPressed: () => pressed++)));
        expect(containerColor(tester), light.primary);
        await tester.tap(find.byType(TanreiFloatingActionButton), kind: kind);
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

    testWidgets('FAB-8: a press held longer than the press-hold duration ends with the press', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(fab()));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiFloatingActionButton)),
      );
      await tester.pump();
      await tester.pump(hold * 3);
      expect(containerColor(tester), pressedFill);
      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(fabTokens.motionStateDuration));
      expect(containerColor(tester), light.primary);
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('FAB-8: $name shows the pressed state at once and for the press-hold duration, '
          'and emits exactly once', (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(fab(onPressed: () => pressed++, autofocus: true)));
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

    testWidgets('FAB-8: the duration is the token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem calm = system.copyWith(
        motion: system.motion.copyWith(duration: system.motion.duration.copyWith(pressHold: 400)),
      );
      await tester.pumpWidget(tanreiTestApp(fab(), theme: TanreiThemeData(system: calm)));
      await tester.tap(find.byType(TanreiFloatingActionButton));
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

    testWidgets('FAB-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      expect(system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      await tester.pumpWidget(app(system, fab(variant: TanreiFabVariant.tonal)));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiFloatingActionButton)),
      );
      await tester.pump();
      expect(
        containerColor(tester),
        lightTheme.paint(fabTokens.variants.tonal.pressed.containerColor),
      );
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('FAB-9: ripple (m3-like) grows the pressed container from the point of contact '
        'over comp.fab.motion.feedback-duration, and fades when the press ends', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiFabTokens tokens = m3LikeSystem.fab;
      final TanreiFabVariantTokens tonal = tokens.variants.tonal;
      final Color resting = theme.paint(tonal.enabled.containerColor);
      final Color pressedColor = theme.paint(tonal.pressed.containerColor);
      expect(pressedColor, isNot(resting));
      await tester.pumpWidget(app(m3LikeSystem, fab(variant: TanreiFabVariant.tonal)));
      final Rect box = tester.getRect(fabContainer);
      const Offset contact = Offset(9, 6);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();

      TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, resting);
      expect(decoration.ripple!.origin, contact);
      expect(decoration.ripple!.color, pressedColor);
      expect(decoration.ripple!.progress, 0);

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
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);
      expect(containerColor(tester), resting);
    });

    testWidgets('FAB-9: a ripple started from the keyboard grows from the center, and with '
        'animations disabled it covers the container at once', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(app(m3LikeSystem, fab(autofocus: true)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, isNull);
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);

      await tester.pumpWidget(app(m3LikeSystem, fab(key: UniqueKey()), disableAnimations: true));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiFloatingActionButton)),
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
        'FAB-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; icon, elevation and opacity are the pressed tokens\''}',
        (WidgetTester tester) async {
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          final TanreiFabVariantTokens filled = fabTokens.variants.filled;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            fab: fabTokens.copyWith(
              pressed: fabTokens.pressed.copyWith(opacity: 0.5),
              variants: fabTokens.variants.copyWith(
                filled: filled.copyWith(
                  pressed: filled.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    iconColor: const TanreiPaint.literal(Color(0xFF445566)),
                    containerElevation: system.elevation.level1,
                  ),
                ),
              ),
            ),
          );
          final TanreiThemeData theme = TanreiThemeData(system: of);
          await tester.pumpWidget(app(of, fab()));
          final TestGesture mouse = await hover(tester);
          final TanreiContainerDecoration hovered = containerDecoration(tester);
          final Color hoveredIcon = iconColor(tester);
          expect(containerColor(tester), theme.paint(filled.hovered.containerColor));

          await mouse.down(tester.getCenter(find.byType(TanreiFloatingActionButton)));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerDecoration(tester);
          expect(drawn.color, hovered.color);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(iconColor(tester), hoveredIcon);
            expect(controlOpacity(tester), 1);
          } else {
            expect(iconColor(tester), const Color(0xFF445566));
            expectElevation(tester, system.elevation.level1);
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

    testWidgets('FAB-9: dim (cupertino) applies the pressed opacity to the whole control and draws '
        'no state layer', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiFabTokens tokens = cupertinoSystem.fab;
      expect(cupertinoSystem.behavior.pressedFeedback, TanreiPressedFeedback.dim);
      expect(tokens.pressed.opacity, lessThan(1));
      await tester.pumpWidget(app(cupertinoSystem, fab()));
      final Color resting = theme.paint(tokens.variants.filled.enabled.containerColor);
      expect(containerColor(tester), resting);
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiFloatingActionButton)),
      );
      await tester.pump();
      expect(controlOpacity(tester), tokens.pressed.opacity);
      expect(containerColor(tester), resting);
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('FAB-10: the corner smoothing of the system eases the container and the focus '
        'indicator: 0 by default (a plain RRect), any amount above 0 a path', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      bool Function(Symbol, List<dynamic>) strokes(Symbol call) =>
          (Symbol method, List<dynamic> arguments) =>
              method == call && (arguments[1] as Paint).style == PaintingStyle.stroke;
      Widget focused(TanreiSystem of) => app(of, fab(key: UniqueKey(), autofocus: true));

      await tester.pumpWidget(focused(system));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0);
      expect(containerDecoration(tester).shape.radius, fabTokens.sizes.medium.containerShape);
      expect(fabContainer, paints..rrect());
      expect(fabContainer, isNot(paints..path()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawRRect)));

      final TanreiSystem smoothed = system.copyWith(
        shape: system.shape.copyWith(cornerSmoothing: cupertinoSystem.shape.cornerSmoothing),
      );
      await tester.pumpWidget(focused(smoothed));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(containerDecoration(tester).shape.isCircular, isFalse);
      expect(fabContainer, paints..path());
      expect(fabContainer, isNot(paints..rrect()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawPath)));

      // cupertino: every size is a circle, which smoothing leaves circular.
      await tester.pumpWidget(focused(cupertinoSystem));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(containerDecoration(tester).shape.radius, cupertinoSystem.shape.full);
    });

    testWidgets('FAB-10: the focus style of the system draws keyboard focus as a ring (default) or '
        'as a glow (acme)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(app(of, fab(key: UniqueKey(), autofocus: true)));
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

  group('geometry and icon', () {
    testWidgets('FAB-11: each size is a square of its container size with the corners of its '
        'size, and its icon centered at the icon size of its size', (WidgetTester tester) async {
      // size -> side, corner, icon
      const Map<TanreiFabSize, (double, double, double)> expected =
          <TanreiFabSize, (double, double, double)>{
            TanreiFabSize.small: (40, 8, 20),
            TanreiFabSize.medium: (48, 12, 24),
            TanreiFabSize.large: (64, 16, 24),
          };
      expect(fabTokens.sizes.keys, expected.keys);
      for (final MapEntry<TanreiFabSize, (double, double, double)> entry in expected.entries) {
        final TanreiFabSizeTokens size = fabTokens.sizes[entry.key];
        expect(
          <double>[size.containerSize, size.containerShape, size.iconSize],
          <double>[entry.value.$1, entry.value.$2, entry.value.$3],
        );
        await tester.pumpWidget(tanreiTestApp(fab(size: entry.key)));
        expect(containerSize(tester), Size.square(size.containerSize));
        expect(containerDecoration(tester).shape.radius, size.containerShape);
        expect(tester.getSize(find.text(addGlyph)), Size.square(size.iconSize));
        expect(tester.getCenter(find.text(addGlyph)), tester.getCenter(fabContainer));
      }
      // Corners follow the size, not the state: a FAB does not change shape when pressed.
      await tester.pumpWidget(tanreiTestApp(fab(size: TanreiFabSize.large)));
      await tester.startGesture(tester.getCenter(find.byType(TanreiFloatingActionButton)));
      await tester.pump();
      expect(containerDecoration(tester).shape.radius, fabTokens.sizes.large.containerShape);
    });

    testWidgets('FAB-11: the icon has the family and fill of an unselected icon, the weight of the '
        'system and an optical size clamped to sys.icon.optical-size', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiIconStyle icon = acmeSystem.icon;
      expect(icon.family(selected: false), isNot(icon.family(selected: true)));
      await tester.pumpWidget(tanreiTestApp(fab(), theme: theme));
      expect(glyphStyle(tester).fontFamily, icon.family(selected: false));
      expect(iconTheme(tester).fill, icon.fill(selected: false));
      expect(iconTheme(tester).weight, icon.weight);

      final TanreiSystem product = system.copyWith(
        icon: system.icon.copyWith(weight: 600, opticalSizeMin: 30, opticalSizeMax: 40),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          fab(size: TanreiFabSize.small),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(iconTheme(tester).weight, 600);
      expect(iconTheme(tester).opticalSize, 30, reason: '20 clamped up to the minimum');
      expect(glyphStyle(tester).fontVariations, contains(const FontVariation.opticalSize(30)));
      final TanreiSystem narrow = system.copyWith(
        icon: system.icon.copyWith(opticalSizeMin: 10, opticalSizeMax: 22),
      );
      await tester.pumpWidget(tanreiTestApp(fab(), theme: TanreiThemeData(system: narrow)));
      expect(fabTokens.sizes.medium.iconSize, 24);
      expect(iconTheme(tester).opticalSize, 22, reason: '24 clamped down to the maximum');
    });

    testWidgets('FAB-11: an Icon in the slot takes size, color and fill from the FAB, not from an '
        'ambient icon theme', (WidgetTester tester) async {
      const IconData plus = IconData(0xe145, fontFamily: 'Material Symbols Rounded');
      await tester.pumpWidget(
        tanreiTestApp(
          IconTheme(
            data: const IconThemeData(size: 99, weight: 100, fill: 0.5),
            child: fab(icon: const Icon(plus)),
          ),
        ),
      );
      final TextStyle style = tester
          .widget<RichText>(find.descendant(of: find.byType(Icon), matching: find.byType(RichText)))
          .text
          .style!;
      expect(style.fontSize, fabTokens.sizes.medium.iconSize);
      expect(style.color, light.onPrimary);
      expect(style.fontVariations, contains(FontVariation('FILL', system.icon.fillUnselected)));
    });
  });

  group('elevation', () {
    testWidgets('FAB-12: every variant casts the elevation of its variant and state outside the '
        'container, and nothing clips it', (WidgetTester tester) async {
      for (final TanreiFabVariant variant in TanreiFabVariant.core) {
        await tester.pumpWidget(tanreiTestApp(fab(variant: variant)));
        expectElevation(
          tester,
          fabTokens.variants[variant].enabled.containerElevation,
          reason: variant.name,
        );
      }
      expect(
        find.ancestor(
          of: fabContainer,
          matching: find.byWidgetPredicate(
            (Widget w) => w is ClipRect || w is ClipRRect || w is ClipPath,
          ),
        ),
        findsNothing,
      );

      // In pixels: the (solid, under flutter test) shadow of level3 reaches below the square.
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        surface: fabGoldenSurface,
        child: fab(),
      );
      final Rect square = tester.getRect(fabContainer);
      final Color surface = pixels.atLogical(const Offset(1, 1));
      expect(pixels.atLogical(square.bottomCenter + const Offset(0, 4)), isNot(surface));
      expect(pixels.atLogical(square.bottomCenter + const Offset(0, 12)), surface);
    });

    testWidgets('FAB-12: a change of state animates container color and elevation over '
        'comp.fab.motion.state-duration with its easing, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiFabVariantTokens filled = fabTokens.variants.filled;
      final Color resting = lightTheme.paint(filled.enabled.containerColor);
      final Color hovered = lightTheme.paint(filled.hovered.containerColor);
      final TanreiResolvedElevation restingElevation = elevationOf(
        filled.enabled.containerElevation,
      );
      final TanreiResolvedElevation hoveredElevation = elevationOf(
        filled.hovered.containerElevation,
      );
      expect(hoveredElevation.shadows, isNot(restingElevation.shadows));
      final Duration partWay = Duration(milliseconds: fabTokens.motionStateDuration ~/ 3);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;

      Future<TestGesture> hoverWith({required bool disableAnimations}) async {
        await tester.pumpWidget(
          tanreiTestApp(fab(key: UniqueKey()), disableAnimations: disableAnimations),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await mouse.moveTo(tester.getCenter(find.byType(TanreiFloatingActionButton)));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(disableAnimations: false);
      expect(containerColor(tester), resting);
      await tester.pump(partWay);
      final double progress = fabTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(containerColor(tester), isSameColorAs(Color.lerp(resting, hovered, progress)!));
      expect(
        containerDecoration(tester).boxShadow,
        BoxShadow.lerpList(restingElevation.shadows, hoveredElevation.shadows, progress),
      );
      await tester.pump(tanreiDuration(fabTokens.motionStateDuration));
      expect(containerColor(tester), hovered);
      expect(containerDecoration(tester).boxShadow, hoveredElevation.shadows);
      await mouse.removePointer();

      final TestGesture reduced = await hoverWith(disableAnimations: true);
      expect(containerColor(tester), hovered);
      expect(containerDecoration(tester).boxShadow, hoveredElevation.shadows);
      await reduced.removePointer();
    });
  });

  group('placement', () {
    testWidgets('FAB-13: the FAB does not position itself — it lays out at its own size where the '
        'layout puts it, and draws no scrim and moves nothing', (WidgetTester tester) async {
      const Key content = Key('content');
      await tester.pumpWidget(
        tanreiTestApp(
          SizedBox(
            width: 400,
            height: 400,
            child: Stack(
              children: <Widget>[
                const Positioned.fill(key: content, child: SizedBox.expand()),
                Align(alignment: AlignmentDirectional.bottomEnd, child: fab()),
              ],
            ),
          ),
        ),
      );
      final Rect stack = tester.getRect(find.byType(Stack));
      final Rect target = tester.getRect(find.byType(TanreiFloatingActionButton));
      expect(target.size, Size.square(system.measure.targetTouch));
      expect(target.bottomRight, stack.bottomRight);
      expect(tester.getRect(find.byKey(content)), stack);
      expect(find.byType(ModalBarrier), findsNothing);
      expect(find.byType(Positioned), findsOneWidget, reason: 'only the test content');
    });
  });

  group('accessible name', () {
    testWidgets('FAB-14: an empty label still renders, and debug builds report it once — not on '
        'every build', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(fab(semanticLabel: '')));
      expect(find.byType(TanreiFloatingActionButton), findsOneWidget);
      expect(containerSize(tester), Size.square(fabTokens.sizes.medium.containerSize));
      expect(reports, <String>['fab']);
      await tester.pumpWidget(
        tanreiTestApp(fab(semanticLabel: '', variant: TanreiFabVariant.tonal)),
      );
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(fab()));
      await tester.pumpWidget(tanreiTestApp(fab(semanticLabel: '  ')));
      expect(reports, hasLength(2));
    });

    testWidgets('FAB-14: the default reporter reports a FlutterError that says what to set', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(fab(semanticLabel: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('fab has no accessible name'));
      expect('$reported', contains('semanticLabel'));
    });
  });

  group('accessibility', () {
    testWidgets('semantics: button role, enabled state, the label as the name, and the icon is '
        'decorative', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(fab()));
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiTapTarget));
      expect(
        node,
        matchesSemantics(
          label: 'Create',
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      expect(node.label, isNot(contains(addGlyph)));
      final SemanticsData data = node.getSemanticsData();
      expect(data.hasFlag(SemanticsFlag.hasSelectedState), isFalse);
      expect(data.hasFlag(SemanticsFlag.hasToggledState), isFalse);
      handle.dispose();
    });

    for (final TanreiFabVariant variant in TanreiFabVariant.core) {
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
              fab(variant: variant, size: TanreiFabSize.small),
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
    // against its container (composited over the surface), in every scheme of the default system.
    // An imitation preset is held to its original, not to this criterion, in any scheme.
    test('non-text contrast: every enabled variant in every scheme of "${system.id}" meets 3:1 '
        '(icon against its container over the surface)', () {
      final List<String> failures = <String>[];
      for (final MapEntry<String, TanreiColors> scheme in schemesOf(system).entries) {
        final TanreiThemeData theme = TanreiThemeData(
          system: system,
          brightness: scheme.key.startsWith('dark') ? Brightness.dark : Brightness.light,
          contrast: scheme.key.endsWith('High')
              ? TanreiContrast.high
              : scheme.key.endsWith('Medium')
              ? TanreiContrast.medium
              : TanreiContrast.standard,
        );
        for (final TanreiFabVariant variant in TanreiFabVariant.core) {
          final TanreiFabVariantStateTokens rest = system.fab.variants[variant].enabled;
          final Color background = Color.alphaBlend(
            theme.paint(rest.containerColor),
            theme.colors.surface,
          );
          final Color icon = Color.alphaBlend(theme.paint(rest.iconColor), background);
          final double ratio = contrastOf(icon, background);
          if (ratio < 3) {
            failures.add('${scheme.key} ${variant.name}: ${ratio.toStringAsFixed(2)}');
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('a design system drives rendering', () {
    testWidgets('size, shape, elevation and opacity tokens of a product system drive the FAB', (
      WidgetTester tester,
    ) async {
      final TanreiFabVariantTokens filled = fabTokens.variants.filled;
      final TanreiSystem product = system.copyWith(
        fab: fabTokens.copyWith(
          sizes: fabTokens.sizes.copyWith(
            medium: fabTokens.sizes.medium.copyWith(
              containerSize: 56,
              containerShape: 0,
              iconSize: 28,
            ),
          ),
          variants: fabTokens.variants.copyWith(
            filled: filled.copyWith(
              enabled: filled.enabled.copyWith(containerElevation: system.elevation.level5),
            ),
          ),
          disabled: fabTokens.disabled.copyWith(opacity: 0.5),
        ),
      );
      final TanreiThemeData theme = TanreiThemeData(system: product);
      await tester.pumpWidget(tanreiTestApp(fab(), theme: theme));
      expect(containerSize(tester), const Size.square(56));
      expect(containerDecoration(tester).shape.radius, 0);
      expect(tester.getSize(find.text(addGlyph)), const Size.square(28));
      expectElevation(tester, system.elevation.level5);

      await tester.pumpWidget(tanreiTestApp(fab(enabled: false), theme: theme));
      await tester.pumpAndSettle();
      expect(controlOpacity(tester), 0.5);
    });

    testWidgets('a FAB re-reads its tokens when the system in the theme changes', (
      WidgetTester tester,
    ) async {
      final Widget button = fab();
      await tester.pumpWidget(tanreiTestApp(button));
      expect(containerSize(tester), Size.square(fabTokens.sizes.medium.containerSize));
      await tester.pumpWidget(
        tanreiTestApp(button, theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      expect(containerSize(tester), Size.square(m3LikeSystem.fab.sizes.medium.containerSize));
      expect(
        containerDecoration(tester).shape.radius,
        m3LikeSystem.fab.sizes.medium.containerShape,
      );
    });

    test('the tokens the widget reads: their default values by role', () {
      final TanreiColors colors = system.schemes.dark;
      const TanreiThemeData theme = TanreiThemeData.dark;
      final Map<TanreiFabVariant, (Color, Color)> expected = <TanreiFabVariant, (Color, Color)>{
        TanreiFabVariant.filled: (colors.primary, colors.onPrimary),
        TanreiFabVariant.tonal: (colors.secondaryContainer, colors.onSecondaryContainer),
        TanreiFabVariant.surface: (colors.surfaceContainerLowest, colors.primary),
      };
      expect(fabTokens.variants.keys, expected.keys);
      for (final MapEntry<TanreiFabVariant, (Color, Color)> entry in expected.entries) {
        final TanreiFabVariantStateTokens rest = fabTokens.variants[entry.key].enabled;
        expect(theme.paint(rest.containerColor), entry.value.$1, reason: entry.key.name);
        expect(theme.paint(rest.iconColor), entry.value.$2, reason: entry.key.name);
        expect(theme.paint(rest.stateLayerColor), entry.value.$2, reason: entry.key.name);
      }
      // The three containers differ at rest, in both schemes.
      for (final TanreiThemeData scheme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        expect(
          TanreiFabVariant.core
              .map(
                (TanreiFabVariant v) => scheme.paint(fabTokens.variants[v].enabled.containerColor),
              )
              .toSet(),
          hasLength(3),
        );
      }
    });
  });

  group('shipped presets', () {
    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": every variant at rest draws the enabled tokens of that system, '
          'and every size its square', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        for (final TanreiFabVariant variant in TanreiFabVariant.core) {
          await tester.pumpWidget(tanreiTestApp(fab(variant: variant), theme: theme));
          final TanreiFabVariantStateTokens rest = shipped.fab.variants[variant].enabled;
          expect(containerColor(tester), theme.paint(rest.containerColor), reason: variant.name);
          expect(iconColor(tester), theme.paint(rest.iconColor), reason: variant.name);
          expectElevation(tester, rest.containerElevation, colors: theme.colors);
          expect(containerDecoration(tester).shape.smoothing, shipped.shape.cornerSmoothing);
          expect(controlOpacity(tester), 1);
        }
        for (final TanreiFabSize size in shipped.fab.sizes.keys) {
          await tester.pumpWidget(tanreiTestApp(fab(size: size), theme: theme));
          expect(containerSize(tester), Size.square(shipped.fab.sizes[size].containerSize));
          expect(tester.takeException(), isNull);
        }
      });
    }

    test('m3-like: 40 / 56 / 96 with Material\'s corners 12 / 16 / 28 and icons 24 / 24 / 36, and '
        'tonal is the primary container', () {
      final TanreiFabTokens tokens = m3LikeSystem.fab;
      expect(
        TanreiFabSize.core.map(
          (TanreiFabSize s) => <double>[
            tokens.sizes[s].containerSize,
            tokens.sizes[s].containerShape,
            tokens.sizes[s].iconSize,
          ],
        ),
        <List<double>>[
          <double>[40, 12, 24],
          <double>[56, 16, 24],
          <double>[96, 28, 36],
        ],
      );
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      expect(
        theme.paint(tokens.variants.tonal.enabled.containerColor),
        m3LikeSystem.schemes.light.primaryContainer,
      );
    });

    testWidgets('cupertino: every size is a circle, and a pointer does not lift it (no hover '
        'elevation, no state layer)', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiFabTokens tokens = cupertinoSystem.fab;
      for (final TanreiFabSize size in TanreiFabSize.core) {
        expect(
          tokens.sizes[size].containerShape,
          greaterThanOrEqualTo(tokens.sizes[size].containerSize / 2),
        );
      }
      for (final TanreiFabVariant variant in TanreiFabVariant.core) {
        await tester.pumpWidget(
          tanreiTestApp(
            fab(key: UniqueKey(), variant: variant),
            theme: theme,
          ),
        );
        final Color rest = containerColor(tester);
        final TanreiContainerDecoration before = containerDecoration(tester);
        final TestGesture mouse = await hover(tester);
        expect(containerColor(tester), rest, reason: variant.name);
        expect(containerDecoration(tester).boxShadow, before.boxShadow, reason: variant.name);
        await mouse.removePointer();
        await tester.pumpAndSettle();
      }
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('fab');

    test('the spec lists the fixtures this suite records, and each shows the add icon', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'filled-medium',
        'tonal-medium',
        'surface-medium',
        'filled-small',
        'filled-large',
        'filled-disabled',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String>{'add'});
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: fabGoldenSurface,
          child: fixtureFab(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/fab/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the filled medium FAB shows the
    // preset's size, corner, primary and elevation at once.
    const String recorded = 'filled-medium';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: fabGoldenSurface,
          child: fixtureFab(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)['props']
                as Map<String, dynamic>,
          ),
          file: 'goldens/fab/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
