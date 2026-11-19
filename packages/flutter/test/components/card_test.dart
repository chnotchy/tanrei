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
final TanreiCardTokens cardTokens = system.card;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The content of every fixture.
const String report = 'Quarterly report. Revenue grew 12% over the previous quarter.';
const String heading = 'Quarterly report';

/// The frame of the card baselines: as wide as the checkbox's, and tall enough for the fixture's
/// text wrapped in a card four `space900` wide (the gallery's width).
const Size cardGoldenSurface = Size(320, 160);

Widget card({
  VoidCallback? onTap,
  bool interactive = false,
  bool enabled = true,
  TanreiCardVariant variant = TanreiCardVariant.outlined,
  bool inset = true,
  String semanticLabel = '',
  FocusNode? focusNode,
  bool autofocus = false,
  Widget child = const Text(report),
  Key? key,
}) => TanreiCard(
  key: key,
  onTap: onTap ?? (interactive ? () {} : null),
  enabled: enabled,
  variant: variant,
  inset: inset,
  semanticLabel: semanticLabel,
  focusNode: focusNode,
  autofocus: autofocus,
  child: child,
);

/// An interactive card named by its heading, as a product writes one.
Widget action({
  VoidCallback? onTap,
  bool enabled = true,
  TanreiCardVariant variant = TanreiCardVariant.outlined,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key,
}) => card(
  key: key,
  onTap: onTap ?? () {},
  enabled: enabled,
  variant: variant,
  semanticLabel: heading,
  focusNode: focusNode,
  autofocus: autofocus,
);

bool _isContainer(Widget w, DecorationPosition position) =>
    w is DecoratedBox && w.position == position && w.decoration is TanreiContainerDecoration;

/// The card's container: fill, ripple, elevation.
Finder get cardContainer => find
    .descendant(
      of: find.byType(TanreiCard),
      matching: find.byWidgetPredicate(
        (Widget w) => _isContainer(w, DecorationPosition.background),
      ),
    )
    .first;

/// The outline above the content (the outlined variant only).
Finder get cardOutline => find.descendant(
  of: find.byType(TanreiCard),
  matching: find.byWidgetPredicate((Widget w) => _isContainer(w, DecorationPosition.foreground)),
);

TanreiContainerDecoration containerOf(WidgetTester tester) =>
    tester.widget<DecoratedBox>(cardContainer).decoration as TanreiContainerDecoration;

Color containerColor(WidgetTester tester) => containerOf(tester).color ?? const Color(0x00000000);

/// The outline drawn (none: transparent).
Color outlineColor(WidgetTester tester) {
  if (cardOutline.evaluate().isEmpty) {
    return const Color(0x00000000);
  }
  final TanreiContainerDecoration outline =
      tester.widget<DecoratedBox>(cardOutline).decoration as TanreiContainerDecoration;
  return outline.border!.top.color;
}

/// The content color the card hands its content: the default text style's.
Color contentColor(WidgetTester tester, {String text = report}) =>
    DefaultTextStyle.of(tester.element(find.text(text))).style.color!;

/// The whole-card opacity (1 where there is none: a card that is not interactive).
double cardOpacity(WidgetTester tester) {
  final Finder opacity = find.descendant(
    of: find.byType(TanreiCard),
    matching: find.byType(Opacity),
  );
  return opacity.evaluate().isEmpty ? 1 : tester.widget<Opacity>(opacity).opacity;
}

/// The resolved elevation of [layers] in the light scheme.
TanreiResolvedElevation elevationOf(List<TanreiShadowLayer> layers, [TanreiColors? colors]) =>
    TanreiResolvedElevation.resolve(layers, colors ?? light);

void expectElevation(WidgetTester tester, List<TanreiShadowLayer> layers, {String? reason}) {
  final TanreiResolvedElevation expected = elevationOf(layers);
  final TanreiContainerDecoration drawn = containerOf(tester);
  expect(drawn.border, expected.ring, reason: reason);
  expect(drawn.boxShadow ?? const <BoxShadow>[], expected.shadows, reason: reason);
}

bool focusRingVisible(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

Future<TestGesture> hover(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(find.byType(TanreiCard)));
  await tester.pumpAndSettle();
  return mouse;
}

/// Every semantics node an assistive technology sees (not merged into a parent), with a label or
/// a flag of its own.
List<SemanticsNode> exposedNodes(WidgetTester tester) {
  final List<SemanticsNode> found = <SemanticsNode>[];
  void visit(SemanticsNode node) {
    if (!node.isMergedIntoParent) {
      final SemanticsData data = node.getSemanticsData();
      if (data.label.isNotEmpty || data.hasFlag(SemanticsFlag.isButton)) {
        found.add(node);
      }
    }
    node.visitChildren((SemanticsNode child) {
      visit(child);
      return true;
    });
  }

  visit(semanticsRoot(tester));
  return found;
}

/// The root of the semantics tree of the app under test.
SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

/// Frames a card like the baselines: four `space900` wide on the card surface.
Widget framed(TanreiSystem of, Widget child) =>
    SizedBox(width: of.space.space900 * 4, child: child);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('CRD-1: a ${kind.name} tap on an interactive card emits onTap exactly once', (
        WidgetTester tester,
      ) async {
        int taps = 0;
        await tester.pumpWidget(tanreiTestApp(action(onTap: () => taps++)));
        await tester.tap(find.byType(TanreiCard), kind: kind);
        await tester.pumpAndSettle();
        expect(taps, 1);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('CRD-1: $name emits onTap exactly once', (WidgetTester tester) async {
        int taps = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(tanreiTestApp(action(onTap: () => taps++, focusNode: focusNode)));
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasPrimaryFocus, isTrue);
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(taps, 1);
      });
    }

    testWidgets('CRD-1: keyboard activation works without an app-level Shortcuts widget', (
      WidgetTester tester,
    ) async {
      int taps = 0;
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: TanreiTheme(
              data: lightTheme,
              child: Center(child: action(onTap: () => taps++, autofocus: true)),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(taps, 2);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('CRD-1: the semantic tap action emits onTap exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int taps = 0;
      await tester.pumpWidget(tanreiTestApp(action(onTap: () => taps++)));
      tester.semantics.tap(find.semantics.byLabel(heading));
      await tester.pump();
      expect(taps, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('CRD-2: a disabled interactive card emits nothing, is not focusable and is '
        'exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int taps = 0;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(action(onTap: () => taps++, enabled: false, focusNode: focusNode)),
      );
      await tester.tap(find.byType(TanreiCard), warnIfMissed: false);
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      expect(taps, 0);
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: heading,
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

    testWidgets('CRD-2: disabling an interactive card stops onTap and removes it from the focus '
        'order', (WidgetTester tester) async {
      int taps = 0;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool enabled}) =>
          tanreiTestApp(action(onTap: () => taps++, enabled: enabled, focusNode: focusNode));

      await tester.pumpWidget(build(enabled: true));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);

      await tester.pumpWidget(build(enabled: false));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.tap(find.byType(TanreiCard), warnIfMissed: false);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(taps, 0);
    });

    for (final TanreiCardVariant variant in TanreiCardVariant.core) {
      testWidgets('CRD-6: a disabled ${variant.name} card draws container, outline, elevation, '
          'content color and opacity from the disabled tokens of its variant', (
        WidgetTester tester,
      ) async {
        await tester.pumpWidget(tanreiTestApp(action(enabled: false, variant: variant)));
        final TanreiCardVariantStateTokens disabled = cardTokens.variants[variant].disabled;
        expect(containerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(outlineColor(tester), lightTheme.paint(disabled.outlineColor));
        expect(contentColor(tester), lightTheme.paint(disabled.contentColor));
        expectElevation(tester, disabled.containerElevation);
        expect(cardOpacity(tester), cardTokens.disabled.opacity);
      });
    }

    testWidgets('CRD-6: the default values — a disabled card keeps its colors and dims as a whole '
        'to the disabled content opacity; an elevated one loses its shadow but keeps level1\'s '
        'ring, so its edge stays visible', (WidgetTester tester) async {
      expect(cardTokens.disabled.opacity, system.state.disabledContentOpacity);
      for (final TanreiCardVariant variant in TanreiCardVariant.core) {
        final TanreiCardVariantTokens tokens = cardTokens.variants[variant];
        expect(tokens.disabled.containerColor, tokens.enabled.containerColor);
        expect(tokens.disabled.contentColor, tokens.enabled.contentColor);
        expect(tokens.disabled.outlineColor, tokens.enabled.outlineColor);
        expect(
          tokens.disabled.containerElevation,
          variant == TanreiCardVariant.elevated ? system.elevation.level1 : system.elevation.level0,
          reason: variant.name,
        );
      }
      await tester.pumpWidget(tanreiTestApp(action(variant: TanreiCardVariant.elevated)));
      expect(containerOf(tester).boxShadow, isNotEmpty, reason: 'level2 casts a shadow');
      await tester.pumpWidget(
        tanreiTestApp(action(variant: TanreiCardVariant.elevated, enabled: false)),
      );
      await tester.pumpAndSettle();
      expect(containerOf(tester).border, isNotNull, reason: 'level1 is a ring');
      expect(containerOf(tester).boxShadow, isNull);
      expect(cardOpacity(tester), closeTo(0.38, 1e-9));
    });
  });

  group('interaction states', () {
    testWidgets('CRD-3: container, outline, elevation, content color and opacity come from the '
        'tokens of the highest-precedence state, pressed > focused > hovered', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiCardVariantTokens elevated = cardTokens.variants.elevated;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(action(variant: TanreiCardVariant.elevated, focusNode: focusNode)),
      );
      void expectDrawnFrom(TanreiCardVariantStateTokens tokens, TanreiCardStateTokens? state) {
        expect(containerColor(tester), lightTheme.paint(tokens.containerColor));
        expect(outlineColor(tester), lightTheme.paint(tokens.outlineColor));
        expect(contentColor(tester), lightTheme.paint(tokens.contentColor));
        expectElevation(tester, tokens.containerElevation);
        expect(cardOpacity(tester), state?.opacity ?? 1);
      }

      expectDrawnFrom(elevated.enabled, null);
      expect(containerColor(tester), light.surfaceContainerLowest);

      final TestGesture mouse = await hover(tester);
      expectDrawnFrom(elevated.hovered, cardTokens.hovered);
      // The state layer is the variant's state-layer color, the content color.
      expect(
        containerColor(tester),
        isSameColorAs(
          Color.alphaBlend(
            light.onSurface.withValues(alpha: system.state.hoverStateLayerOpacity),
            light.surfaceContainerLowest,
          ),
        ),
      );
      // An elevated card rises on hover (one level above its rest).
      expect(
        containerOf(tester).boxShadow!.length,
        greaterThan(elevationOf(elevated.enabled.containerElevation).shadows.length),
      );

      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.focused, cardTokens.focused);

      await mouse.down(tester.getCenter(find.byType(TanreiCard)));
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.pressed, cardTokens.pressed);

      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.enabled, null);
    });

    testWidgets('CRD-3: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(action(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(containerColor(tester), light.surface);
    });

    testWidgets('CRD-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible without overriding anything', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiCardVariantTokens outlined = acmeSystem.card.variants.outlined;
      final Color hovered = theme.paint(outlined.hovered.containerColor);
      final Color focused = theme.paint(outlined.focused.containerColor);
      final Color pressed = theme.paint(outlined.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      expect(acmeSystem.behavior.pressedFeedback, TanreiPressedFeedback.overlay);

      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(action(focusNode: focusNode), theme: theme));
      final TestGesture mouse = await hover(tester);
      expect(containerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
      await mouse.down(tester.getCenter(find.byType(TanreiCard)));
      await tester.pump();
      expect(containerColor(tester), pressed);
      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
    });
  });

  group('focus ring', () {
    testWidgets('CRD-4: keyboard focus shows the focus ring at once, around the card', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(framed(system, action())));
      expect(focusRingVisible(tester), isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      // Not animated: visible on the first frame after focus.
      expect(focusRingVisible(tester), isTrue);

      final TanreiMeasure measure = system.measure;
      final double offset = measure.focusOffset + measure.focusOuterWidth / 2;
      final Rect visual = Offset.zero & tester.getSize(cardContainer);
      final RRect expectedRing = BorderRadius.circular(
        cardTokens.containerShape,
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

    testWidgets('CRD-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(action(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(focusRingVisible(tester), isFalse);
    });
  });

  group('target size', () {
    Widget small({VoidCallback? onTap, TanreiThemeData theme = lightTheme}) => tanreiTestApp(
      card(
        onTap: onTap ?? () {},
        inset: false,
        semanticLabel: 'Tiny',
        child: const SizedBox.square(dimension: 20),
      ),
      theme: theme,
    );

    testWidgets('CRD-5: a card smaller than the minimum target extends its hit area on both axes '
        'to sys.target.touch without changing its visual size', (WidgetTester tester) async {
      int taps = 0;
      await tester.pumpWidget(small(onTap: () => taps++));
      expect(tester.getSize(cardContainer), const Size.square(20));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.size, Size.square(system.measure.targetTouch));
      final Rect visual = tester.getRect(cardContainer);
      for (final Offset outside in <Offset>[
        Offset(target.center.dx, target.top + 1),
        Offset(target.left + 1, target.center.dy),
        target.bottomRight - const Offset(1, 1),
      ]) {
        expect(visual.contains(outside), isFalse);
        await tester.tapAt(outside);
      }
      expect(taps, 3);
      await tester.tapAt(Offset(target.left - 1, target.center.dy));
      expect(taps, 3);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('CRD-5: the minimum target is the touch target token of the system, and a card '
        'larger than it keeps its own size as its hit area', (WidgetTester tester) async {
      final TanreiSystem wide = system.copyWith(measure: system.measure.copyWith(targetTouch: 60));
      await tester.pumpWidget(small(theme: TanreiThemeData(system: wide)));
      expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(60));

      await tester.pumpWidget(tanreiTestApp(framed(system, action())));
      expect(tester.getSize(find.byType(TanreiTapTarget)), tester.getSize(cardContainer));
    });
  });

  group('open variant key', () {
    testWidgets('CRD-7: a variant the design system does not have renders exactly like the '
        'default value, and debug builds report it', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      const TanreiCardVariant unknown = TanreiCardVariant('hero');
      expect(cardTokens.variants.has(unknown), isFalse);
      for (final bool interactive in <bool>[false, true]) {
        reports.clear();
        final FramePixels drawn = await framePixels(
          tester,
          system: system,
          surface: cardGoldenSurface,
          child: framed(
            system,
            card(variant: unknown, interactive: interactive, semanticLabel: 'x'),
          ),
        );
        expect(tester.takeException(), isNull);
        expect(reports, contains('card variant "hero" -> outlined'));
        final TanreiContainerDecoration decoration = containerOf(tester);

        reports.clear();
        final FramePixels defaults = await framePixels(
          tester,
          system: system,
          surface: cardGoldenSurface,
          child: framed(system, card(interactive: interactive, semanticLabel: 'x')),
        );
        expect(reports, isEmpty);
        expect(decoration, containerOf(tester));
        expect(drawn, defaults, reason: 'pixel for pixel the default card ($interactive)');
      }
    });

    testWidgets('CRD-7: an unknown value follows the default through disabled, and with the '
        'reporter silent (a release build) nothing fails and the card still activates', (
      WidgetTester tester,
    ) async {
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) {};
      addTearDown(() => debugTanreiReportUnknownValue = previous);
      const TanreiCardVariant unknown = TanreiCardVariant('no-such-variant');
      await tester.pumpWidget(
        tanreiTestApp(
          card(variant: unknown, interactive: true, enabled: false, semanticLabel: heading),
        ),
      );
      expect(
        outlineColor(tester),
        lightTheme.paint(cardTokens.variants.outlined.disabled.outlineColor),
      );
      expect(cardOpacity(tester), cardTokens.disabled.opacity);
      int taps = 0;
      await tester.pumpWidget(
        tanreiTestApp(card(variant: unknown, onTap: () => taps++, semanticLabel: heading)),
      );
      await tester.tap(find.byType(TanreiCard));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(taps, 1);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a variant a design system added with copyWith drives the card', (
      WidgetTester tester,
    ) async {
      const TanreiCardVariant inverse = TanreiCardVariant('inverse');
      final TanreiSystem product = system.copyWith(
        card: cardTokens.copyWith(
          variants: cardTokens.variants.copyWith(
            extra: <TanreiCardVariant, TanreiCardVariantTokens>{
              inverse: cardTokens.variants.filled.copyWith(
                enabled: cardTokens.variants.filled.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.inverseSurface),
                  contentColor: const TanreiPaint.role(TanreiColorRole.inverseOnSurface),
                ),
              ),
            },
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          card(variant: inverse),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(containerColor(tester), light.inverseSurface);
      expect(contentColor(tester), light.inverseOnSurface);
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (CRD-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(cardTokens.variants.outlined.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('CRD-8: a ${kind.name} press shows the pressed state without delay and keeps it '
          'for the press-hold duration although the press ended at once', (
        WidgetTester tester,
      ) async {
        int taps = 0;
        await tester.pumpWidget(tanreiTestApp(action(onTap: () => taps++)));
        expect(containerColor(tester), light.surface);
        await tester.tap(find.byType(TanreiCard), kind: kind);
        await tester.pump();
        expect(taps, 1);
        expect(containerColor(tester), pressedFill);
        await tester.pump(hold - tick);
        expect(containerColor(tester), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(containerColor(tester), isNot(pressedFill));
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('CRD-8: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.pumpWidget(tanreiTestApp(action(autofocus: true)));
        await tester.pumpAndSettle();
        final Color focusedFill = containerColor(tester);
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(containerColor(tester), pressedFill);
        await tester.pump(hold - tick);
        expect(containerColor(tester), pressedFill);
        await tester.pump(tick);
        await tester.pumpAndSettle();
        expect(containerColor(tester), focusedFill);
      });
    }

    testWidgets('CRD-8: a press held longer than the press-hold duration ends with the press, and '
        'the duration is the token of the system in the theme', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(action()));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiCard)),
      );
      await tester.pump();
      await tester.pump(hold * 3);
      expect(containerColor(tester), pressedFill);
      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(cardTokens.motionStateDuration));
      expect(containerColor(tester), light.surface);

      final TanreiSystem calm = system.copyWith(
        motion: system.motion.copyWith(duration: system.motion.duration.copyWith(pressHold: 400)),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          action(key: UniqueKey()),
          theme: TanreiThemeData(system: calm),
        ),
      );
      await tester.tap(find.byType(TanreiCard));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 399));
      expect(containerColor(tester), pressedFill);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(containerColor(tester), light.surface);
    });
  });

  group('choices of kind', () {
    Widget app(TanreiSystem of, Widget child, {bool disableAnimations = false}) => tanreiTestApp(
      framed(of, child),
      theme: TanreiThemeData(system: of),
      disableAnimations: disableAnimations,
    );

    testWidgets('CRD-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      expect(system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      await tester.pumpWidget(app(system, action(variant: TanreiCardVariant.filled)));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiCard)),
      );
      await tester.pump();
      expect(
        containerColor(tester),
        lightTheme.paint(cardTokens.variants.filled.pressed.containerColor),
      );
      expect(containerOf(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('CRD-9: ripple (m3-like) grows the pressed container from the point of contact '
        'over comp.card.motion.feedback-duration, and fades once the press has ended', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiCardTokens tokens = m3LikeSystem.card;
      final TanreiCardVariantTokens filled = tokens.variants.filled;
      final Color resting = theme.paint(filled.enabled.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(pressedColor, isNot(resting));
      await tester.pumpWidget(app(m3LikeSystem, action(variant: TanreiCardVariant.filled)));
      final Rect box = tester.getRect(cardContainer);
      const Offset contact = Offset(30, 12);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();

      TanreiContainerDecoration decoration = containerOf(tester);
      expect(decoration.color, resting);
      expect(decoration.ripple!.origin, contact);
      expect(decoration.ripple!.color, pressedColor);
      expect(decoration.ripple!.progress, 0);

      final Duration growth = tanreiDuration(tokens.motionFeedbackDuration);
      await tester.pump(growth ~/ 2);
      expect(
        containerOf(tester).ripple!.progress,
        moreOrLessEquals(tokens.motionStateEasing.toCurve().transform(0.5)),
      );
      await tester.pump(growth);
      expect(containerOf(tester).ripple!.progress, 1);

      await touch.up();
      await tester.pump();
      await tester.pump(tanreiDuration(tokens.motionStateDuration) ~/ 2);
      decoration = containerOf(tester);
      expect(decoration.ripple!.color, isNot(pressedColor));
      await tester.pumpAndSettle();
      expect(containerOf(tester).ripple, isNull);
      expect(containerColor(tester), resting);
    });

    testWidgets('CRD-9: a ripple started from the keyboard grows from the center, and with '
        'animations disabled it covers the container at once', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(app(m3LikeSystem, action(autofocus: true)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(containerOf(tester).ripple!.origin, isNull, reason: 'null = the center');
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerOf(tester).ripple, isNull);

      await tester.pumpWidget(app(m3LikeSystem, action(key: UniqueKey()), disableAnimations: true));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiCard)),
      );
      await tester.pump();
      expect(containerOf(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pump(tanreiDuration(m3LikeSystem.motion.duration.pressHold));
      await tester.pump();
      expect(containerOf(tester).ripple, isNull);
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'CRD-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; content, outline, elevation and opacity are the pressed tokens\''}',
        (WidgetTester tester) async {
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          final TanreiCardVariantTokens outlined = cardTokens.variants.outlined;
          const List<TanreiShadowLayer> raised = <TanreiShadowLayer>[
            TanreiShadowLayer(0, 2, 4, 0, TanreiColorRole.elevationShadow1),
          ];
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            card: cardTokens.copyWith(
              pressed: cardTokens.pressed.copyWith(opacity: 0.5),
              variants: cardTokens.variants.copyWith(
                outlined: outlined.copyWith(
                  pressed: outlined.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    contentColor: const TanreiPaint.literal(Color(0xFF445566)),
                    outlineColor: const TanreiPaint.literal(Color(0xFF778899)),
                    containerElevation: raised,
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(app(of, action()));
          final TestGesture mouse = await hover(tester);
          final TanreiContainerDecoration hovered = containerOf(tester);
          final Color hoveredContent = contentColor(tester);
          final Color hoveredOutline = outlineColor(tester);

          await mouse.down(tester.getCenter(find.byType(TanreiCard)));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerOf(tester);
          expect(drawn.color, hovered.color);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(contentColor(tester), hoveredContent);
            expect(outlineColor(tester), hoveredOutline);
            expect(cardOpacity(tester), 1);
          } else {
            expect(contentColor(tester), const Color(0xFF445566));
            expect(outlineColor(tester), const Color(0xFF778899));
            expect(drawn.boxShadow, elevationOf(raised).shadows);
            expect(cardOpacity(tester), 0.5);
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

    testWidgets('CRD-9: dim (cupertino) applies the pressed opacity to the whole card and draws '
        'no state layer', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiCardTokens tokens = cupertinoSystem.card;
      expect(cupertinoSystem.behavior.pressedFeedback, TanreiPressedFeedback.dim);
      expect(tokens.pressed.opacity, lessThan(1));
      await tester.pumpWidget(app(cupertinoSystem, action(variant: TanreiCardVariant.filled)));
      final Color resting = theme.paint(tokens.variants.filled.enabled.containerColor);
      expect(containerColor(tester), resting);
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiCard)),
      );
      await tester.pump();
      expect(cardOpacity(tester), tokens.pressed.opacity);
      expect(containerColor(tester), resting);
      expect(containerOf(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('CRD-10: the corner smoothing of the system eases the container, the clip of the '
        'content and the focus indicator: 0.6 under cupertino (a path), 0 by default (an RRect)', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      bool Function(Symbol, List<dynamic>) strokes(Symbol call) =>
          (Symbol method, List<dynamic> arguments) =>
              method == call && (arguments[1] as Paint).style == PaintingStyle.stroke;
      Widget focused(TanreiSystem of) =>
          app(of, action(variant: TanreiCardVariant.filled, autofocus: true));
      Path clipOf() {
        final RenderClipPath clip = tester.renderObject<RenderClipPath>(
          find.descendant(of: find.byType(TanreiCard), matching: find.byType(ClipPath)),
        );
        return clip.clipper!.getClip(clip.size);
      }

      await tester.pumpWidget(focused(system));
      await tester.pumpAndSettle();
      expect(containerOf(tester).shape.smoothing, 0);
      expect(containerOf(tester).shape.radius, cardTokens.containerShape);
      expect(cardContainer, paints..rrect());
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawRRect)));
      final Size size = tester.getSize(cardContainer);
      // A quarter circle: the corner point just inside the radius is outside the clip.
      final Path round = clipOf();
      expect(round.contains(const Offset(1, 1)), isFalse);
      expect(round.contains(size.center(Offset.zero)), isTrue);

      expect(cupertinoSystem.shape.cornerSmoothing, 0.6);
      await tester.pumpWidget(focused(cupertinoSystem));
      await tester.pumpAndSettle();
      expect(containerOf(tester).shape.smoothing, 0.6);
      expect(containerOf(tester).shape.radius, cupertinoSystem.card.containerShape);
      expect(cardContainer, paints..path());
      expect(cardContainer, isNot(paints..rrect()));
      expect(find.byType(TanreiFocusRing), paints..something(strokes(#drawPath)));
      expect(clipOf(), isNot(same(round)));
      final TanreiCornerShape smooth = containerOf(tester).shape;
      expect(
        clipOf().getBounds(),
        smooth.path(Offset.zero & tester.getSize(cardContainer)).getBounds(),
      );
    });

    testWidgets('CRD-10: the focus style of the system draws keyboard focus as a ring (default) or '
        'as a glow (acme)', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(app(of, action(key: UniqueKey(), autofocus: true)));
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
      expect(glow, isNotEmpty);
      for (final Paint paint in glow) {
        expect(
          paint.maskFilter,
          MaskFilter.blur(BlurStyle.normal, acmeSystem.measure.focusOuterWidth / 2),
        );
      }
    });
  });

  group('not interactive', () {
    testWidgets('CRD-11: a card without onTap is not focusable, emits nothing and draws no hover, '
        'focus or press answer', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(card(variant: TanreiCardVariant.elevated, semanticLabel: heading)),
      );
      final TanreiContainerDecoration rest = containerOf(tester);
      expect(
        find.descendant(of: find.byType(TanreiCard), matching: find.byType(Focus)),
        findsNothing,
      );
      expect(find.byType(TanreiTapTarget), findsNothing);
      expect(find.byType(TanreiFocusRing), findsNothing);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      final TestGesture mouse = await hover(tester);
      expect(containerOf(tester), rest);
      await mouse.down(tester.getCenter(find.byType(TanreiCard)));
      await tester.pump();
      expect(containerOf(tester), rest);
      await mouse.up();
      await tester.pumpAndSettle();
      expect(containerOf(tester), rest);
    });

    testWidgets('CRD-11: a card that is not interactive ignores enabled and renders from the '
        'resting tokens of its variant', (WidgetTester tester) async {
      for (final TanreiCardVariant variant in TanreiCardVariant.core) {
        await tester.pumpWidget(tanreiTestApp(card(variant: variant, enabled: false)));
        final TanreiCardVariantStateTokens rest = cardTokens.variants[variant].enabled;
        expect(containerColor(tester), lightTheme.paint(rest.containerColor), reason: variant.name);
        expect(outlineColor(tester), lightTheme.paint(rest.outlineColor), reason: variant.name);
        expect(contentColor(tester), lightTheme.paint(rest.contentColor), reason: variant.name);
        expectElevation(tester, rest.containerElevation, reason: variant.name);
        expect(cardOpacity(tester), 1, reason: variant.name);
      }
    });

    testWidgets('CRD-11: the content of a card that is not interactive stays in the focus order '
        'and keeps its own presses', (WidgetTester tester) async {
      int pressed = 0;
      final FocusNode inner = FocusNode();
      addTearDown(inner.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          card(
            child: TanreiButton(
              onPressed: () => pressed++,
              focusNode: inner,
              child: const Text('Open'),
            ),
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(inner.hasPrimaryFocus, isTrue);
      await tester.tap(find.byType(TanreiButton));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(pressed, 1);
    });
  });

  group('layout', () {
    testWidgets('CRD-12: with inset the content sits comp.card.container.padding inside the '
        'container on every side; flush it reaches the edges; the card has no height of its own', (
      WidgetTester tester,
    ) async {
      const Key content = Key('content');
      final double padding = cardTokens.containerPadding;
      expect(padding, system.space.space200);
      for (final bool inset in <bool>[true, false]) {
        await tester.pumpWidget(
          tanreiTestApp(
            card(
              inset: inset,
              child: const SizedBox(key: content, width: 120, height: 30),
            ),
          ),
        );
        final Rect box = tester.getRect(cardContainer);
        final Rect inner = tester.getRect(find.byKey(content));
        final double expected = inset ? padding : 0;
        expect(inner.left - box.left, expected, reason: 'inset: $inset');
        expect(inner.top - box.top, expected, reason: 'inset: $inset');
        expect(box.right - inner.right, expected, reason: 'inset: $inset');
        expect(box.bottom - inner.bottom, expected, reason: 'inset: $inset');
      }
      // Taller content, taller card.
      await tester.pumpWidget(
        tanreiTestApp(card(child: const SizedBox(key: content, width: 120, height: 90))),
      );
      expect(tester.getSize(cardContainer).height, 90 + 2 * padding);
    });

    testWidgets('CRD-12: the content is clipped to the container shape, and the outline of the '
        'outlined variant (comp.card.outline.width) is drawn above the content', (
      WidgetTester tester,
    ) async {
      const Color photo = Color(0xFFFF0000);
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        surface: cardGoldenSurface,
        child: card(
          inset: false,
          child: const ColoredBox(color: photo, child: SizedBox(width: 200, height: 100)),
        ),
      );
      final Rect box = tester.getRect(cardContainer);
      final Rect frame = tester.getRect(find.byType(RepaintBoundary).first);
      Offset local(Offset p) => p - frame.topLeft;
      // A corner point is outside the rounded shape: the surface, not the photo.
      expect(
        pixels.atLogical(local(box.topLeft + const Offset(0.5, 0.5))),
        looksLike(light.surface),
      );
      // The outline is above the photo along the edge.
      expect(
        pixels.atLogical(local(Offset(box.center.dx, box.top + 0.25))),
        looksLike(Color.alphaBlend(light.outlineVariant, photo)),
      );
      // Inside, the photo.
      expect(pixels.atLogical(local(box.center)), looksLike(photo));

      final TanreiContainerDecoration outline =
          tester.widget<DecoratedBox>(cardOutline).decoration as TanreiContainerDecoration;
      expect(outline.border!.top.width, cardTokens.outlineWidth);
      expect(outline.border!.top.strokeAlign, BorderSide.strokeAlignInside);
      expect(outline.color, isNull);
      // The outline is a foreground decoration: painted after the content.
      expect(tester.widget<DecoratedBox>(cardOutline).position, DecorationPosition.foreground);
    });

    testWidgets('CRD-12: filled and elevated cards draw no outline at all', (
      WidgetTester tester,
    ) async {
      for (final TanreiCardVariant variant in <TanreiCardVariant>[
        TanreiCardVariant.filled,
        TanreiCardVariant.elevated,
      ]) {
        await tester.pumpWidget(tanreiTestApp(card(variant: variant)));
        expect(cardOutline, findsNothing, reason: variant.name);
      }
    });

    testWidgets('a card grows with its content at 200 % text size and clips nothing', (
      WidgetTester tester,
    ) async {
      Future<double> heightAt(double scale) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: framed(system, action()),
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        final Rect text = tester.getRect(find.text(report));
        final Rect box = tester.getRect(cardContainer);
        expect(
          box.contains(text.topLeft) && box.contains(text.bottomRight - const Offset(1, 1)),
          isTrue,
        );
        expect(box.bottom - text.bottom, cardTokens.containerPadding);
        return box.height;
      }

      final double normal = await heightAt(1);
      final double large = await heightAt(2);
      expect(large, greaterThan(normal * 1.5));
    });
  });

  group('content color', () {
    for (final TanreiCardVariant variant in TanreiCardVariant.core) {
      testWidgets('CRD-13: a ${variant.name} card hands its content the content color of its '
          'variant as the default text and icon color (dark scheme)', (WidgetTester tester) async {
        const TanreiThemeData theme = TanreiThemeData.dark;
        await tester.pumpWidget(
          tanreiTestApp(
            card(
              variant: variant,
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[Text(report), Icon(IconData(0xe87d))],
              ),
            ),
            theme: theme,
          ),
        );
        final Color expected = theme.paint(cardTokens.variants[variant].enabled.contentColor);
        expect(contentColor(tester), expected);
        expect(expected, system.schemes.dark.onSurface);
        expect(IconTheme.of(tester.element(find.byType(Icon))).color, expected);
        // Plain text takes the body style (CRD-13).
        final TextStyle plain = DefaultTextStyle.of(tester.element(find.text(report))).style;
        expect(plain.fontSize, system.typescale.body.size);
        expect(plain.height, system.typescale.body.lineHeight / system.typescale.body.size);
        expect(plain.fontFamily, lightTheme.textStyle(system.typescale.body).fontFamily);
        final RichText icon = tester.widget<RichText>(
          find.descendant(of: find.byType(Icon), matching: find.byType(RichText)),
        );
        expect(icon.text.style!.color, expected);
      });
    }

    testWidgets('CRD-13: the content color follows the state, and a text style of its own that '
        'names no color keeps the card\'s', (WidgetTester tester) async {
      final TanreiCardVariantTokens outlined = cardTokens.variants.outlined;
      const Color hoveredContent = Color(0xFF203040);
      final TanreiSystem product = system.copyWith(
        card: cardTokens.copyWith(
          variants: cardTokens.variants.copyWith(
            outlined: outlined.copyWith(
              hovered: outlined.hovered.copyWith(
                contentColor: const TanreiPaint.literal(hoveredContent),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiCard(
            onTap: () {},
            semanticLabel: heading,
            child: Text(report, style: lightTheme.textStyle(system.typescale.heading5)),
          ),
          theme: TanreiThemeData(system: product),
        ),
      );
      final RichText text = tester.widget<RichText>(
        find.descendant(of: find.text(report), matching: find.byType(RichText)),
      );
      expect(text.text.style!.color, light.onSurface);
      expect(text.text.style!.fontSize, system.typescale.heading5.size);
      await hover(tester);
      final RichText hovered = tester.widget<RichText>(
        find.descendant(of: find.text(report), matching: find.byType(RichText)),
      );
      expect(hovered.text.style!.color, hoveredContent);
    });
  });

  group('accessibility semantics', () {
    testWidgets('CRD-14: an interactive card is exactly one focusable element with the button '
        'role, named by its label; its content is presentational', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(action()));
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiTapTarget));
      expect(
        node,
        matchesSemantics(
          label: heading,
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      final List<SemanticsNode> exposed = exposedNodes(tester);
      expect(exposed, hasLength(1));
      expect(exposed.single.getSemanticsData().label, heading);
      handle.dispose();
    });

    testWidgets('CRD-14: without a label the text of the content, merged in reading order, is the '
        'name, and debug builds report the missing label once', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectMissingNames();
      Widget unnamed() => tanreiTestApp(
        TanreiCard(
          onTap: () {},
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[Text('Quarterly report'), Text('Revenue grew 12%')],
          ),
        ),
      );
      await tester.pumpWidget(unnamed());
      final List<SemanticsNode> exposed = exposedNodes(tester);
      expect(exposed, hasLength(1));
      final SemanticsData data = exposed.single.getSemanticsData();
      expect(data.label, 'Quarterly report\nRevenue grew 12%');
      expect(data.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(reports, <String>['card']);
      await tester.pumpWidget(unnamed());
      expect(reports, hasLength(1));
      // Named, then not again: reported again. White space is not a name.
      await tester.pumpWidget(tanreiTestApp(action()));
      await tester.pumpWidget(
        tanreiTestApp(TanreiCard(onTap: () {}, semanticLabel: '  ', child: const Text(report))),
      );
      expect(reports, hasLength(2));
      handle.dispose();
    });

    testWidgets('CRD-14: the default reporter says what to do, and a card that is not interactive '
        'needs no label', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(TanreiCard(onTap: () {}, child: const Text(report))));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('card has no accessible name'));
      expect('$reported', contains('semanticLabel'));
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(card()));
      expect(reports, isEmpty);
    });

    testWidgets('CRD-14: a card that is not interactive has no role of its own and leaves its '
        'content\'s semantics untouched', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(
          card(
            child: const Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[Text('Quarterly report'), Text('Revenue grew 12%')],
            ),
          ),
        ),
      );
      expect(
        exposedNodes(
          tester,
        ).where((SemanticsNode n) => n.getSemanticsData().hasFlag(SemanticsFlag.isButton)),
        isEmpty,
      );
      // The same tree as the content alone.
      final String withCard = semanticsRoot(tester).toStringDeep();
      await tester.pumpWidget(
        tanreiTestApp(
          const Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[Text('Quarterly report'), Text('Revenue grew 12%')],
          ),
        ),
      );
      final String alone = semanticsRoot(tester).toStringDeep();
      expect(
        withCard
            .replaceAll(RegExp(r'SemanticsNode#\d+'), 'N')
            .replaceAll(RegExp(r'Rect\.fromLTRB\([^)]*\)'), 'R'),
        alone
            .replaceAll(RegExp(r'SemanticsNode#\d+'), 'N')
            .replaceAll(RegExp(r'Rect\.fromLTRB\([^)]*\)'), 'R'),
      );
      handle.dispose();
    });

    testWidgets('CRD-14: with a label a card that is not interactive is a group named by it, its '
        'content inside', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(
        tanreiTestApp(card(semanticLabel: heading, child: const Text('Revenue grew 12%'))),
      );
      final SemanticsNode group = tester.getSemantics(find.byType(TanreiCard));
      final SemanticsData data = group.getSemanticsData();
      expect(data.label, heading);
      expect(data.hasFlag(SemanticsFlag.isButton), isFalse);
      expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);
      expect(group.mergeAllDescendantsIntoThisNode, isFalse);
      final List<String> children = <String>[];
      group.visitChildren((SemanticsNode child) {
        children.add(child.getSemanticsData().label);
        return true;
      });
      expect(children, <String>['Revenue grew 12%']);
      handle.dispose();
    });

    testWidgets('CRD-15: content an interactive card holds is merged into its one element — '
        'nothing inside is exposed on its own (the rule is stated in the README)', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      collectMissingNames();
      for (final String label in <String>['', heading]) {
        await tester.pumpWidget(
          tanreiTestApp(
            TanreiCard(
              onTap: () {},
              semanticLabel: label,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Semantics(container: true, header: true, child: const Text('Quarterly report')),
                  Semantics(
                    container: true,
                    image: true,
                    label: 'Chart',
                    child: const SizedBox.square(dimension: 40),
                  ),
                  const Text('Revenue grew 12%'),
                ],
              ),
            ),
          ),
        );
        final List<SemanticsNode> exposed = exposedNodes(tester);
        expect(exposed, hasLength(1), reason: 'label: "$label"');
        expect(exposed.single.getSemanticsData().hasFlag(SemanticsFlag.isButton), isTrue);
      }
      handle.dispose();
    });

    for (final TanreiCardVariant variant in TanreiCardVariant.core) {
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        testWidgets('guidelines: an interactive ${variant.name} card on ${theme.brightness.name}', (
          WidgetTester tester,
        ) async {
          final SemanticsHandle handle = tester.ensureSemantics();
          await tester.pumpWidget(
            tanreiTestApp(
              framed(
                system,
                TanreiCard(
                  onTap: () {},
                  variant: variant,
                  semanticLabel: heading,
                  child: Text(report, style: theme.textStyle(system.typescale.body)),
                ),
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

    // WCAG 1.4.3: the content color is the text color of whatever the card holds, so it needs
    // 4.5:1 against the container composited over the surface.
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('text contrast: the content color of every variant at rest in the ${brightness.name} '
            '${contrast.name} scheme meets 4.5:1 against its container', () {
          final List<String> failures = <String>[];
          for (final TanreiCardVariant variant in TanreiCardVariant.core) {
            final TanreiCardVariantStateTokens rest = cardTokens.variants[variant].enabled;
            final Color background = Color.alphaBlend(
              theme.paint(rest.containerColor),
              theme.colors.surface,
            );
            final Color text = Color.alphaBlend(theme.paint(rest.contentColor), background);
            final double ratio = contrastOf(text, background);
            if (ratio < 4.5) {
              failures.add('${variant.name}: ${ratio.toStringAsFixed(2)}');
            }
          }
          expect(failures, isEmpty);
        });
      }
    }
  });

  group('motion', () {
    testWidgets('CRD-16: a change of state animates container color and elevation over '
        'comp.card.motion.state-duration with its easing, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiCardVariantTokens elevated = cardTokens.variants.elevated;
      final Color resting = lightTheme.paint(elevated.enabled.containerColor);
      final Color hovered = lightTheme.paint(elevated.hovered.containerColor);
      final TanreiResolvedElevation restingElevation = elevationOf(
        elevated.enabled.containerElevation,
      );
      final TanreiResolvedElevation hoveredElevation = elevationOf(
        elevated.hovered.containerElevation,
      );
      final Duration partWay = Duration(milliseconds: cardTokens.motionStateDuration ~/ 3);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;

      Future<TestGesture> hoverWith({required bool disableAnimations}) async {
        await tester.pumpWidget(
          tanreiTestApp(
            action(key: UniqueKey(), variant: TanreiCardVariant.elevated),
            disableAnimations: disableAnimations,
          ),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await mouse.moveTo(tester.getCenter(find.byType(TanreiCard)));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(disableAnimations: false);
      expect(containerColor(tester), resting);
      await tester.pump(partWay);
      final double progress = cardTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(containerColor(tester), isSameColorAs(Color.lerp(resting, hovered, progress)!));
      final List<BoxShadow> midway = containerOf(tester).boxShadow!;
      expect(
        midway,
        BoxShadow.lerpList(restingElevation.shadows, hoveredElevation.shadows, progress),
      );
      await tester.pump(tanreiDuration(cardTokens.motionStateDuration));
      expect(containerColor(tester), hovered);
      expect(containerOf(tester).boxShadow, hoveredElevation.shadows);
      await mouse.removePointer();

      await hoverWith(disableAnimations: true);
      expect(containerColor(tester), hovered);
      expect(containerOf(tester).boxShadow, hoveredElevation.shadows);
    });
  });

  group('right to left', () {
    testWidgets('CRD-17: in right-to-left the padding applies by logical start and end, the '
        'content follows the direction by itself, and a ripple grows from the point of contact', (
      WidgetTester tester,
    ) async {
      const Key mark = Key('mark');
      Widget build(TextDirection direction) => tanreiTestApp(
        Directionality(
          textDirection: direction,
          child: framed(
            m3LikeSystem,
            TanreiCard(
              onTap: () {},
              semanticLabel: heading,
              child: const Align(
                alignment: AlignmentDirectional.centerStart,
                child: SizedBox(key: mark, width: 10, height: 10),
              ),
            ),
          ),
        ),
        theme: const TanreiThemeData(system: m3LikeSystem),
      );
      final double padding = m3LikeSystem.card.containerPadding;

      await tester.pumpWidget(build(TextDirection.ltr));
      Rect box = tester.getRect(cardContainer);
      expect(tester.getRect(find.byKey(mark)).left - box.left, padding);

      await tester.pumpWidget(build(TextDirection.rtl));
      box = tester.getRect(cardContainer);
      expect(box.right - tester.getRect(find.byKey(mark)).right, padding);
      // The card does not mirror its content: no transform between the card and the content.
      expect(
        find.descendant(of: find.byType(TanreiCard), matching: find.byType(Transform)),
        findsNothing,
      );

      const Offset contact = Offset(24, 10);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(containerOf(tester).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });
  });

  group('a design system drives rendering', () {
    testWidgets('shape, padding and outline width of a product system drive the card', (
      WidgetTester tester,
    ) async {
      const Key content = Key('content');
      final TanreiSystem product = system.copyWith(
        card: cardTokens.copyWith(containerShape: 20, containerPadding: 24, outlineWidth: 3),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          card(child: const SizedBox(key: content, width: 50, height: 50)),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(containerOf(tester).shape.radius, 20);
      expect(tester.getSize(cardContainer), const Size(98, 98));
      expect(
        (tester.widget<DecoratedBox>(cardOutline).decoration as TanreiContainerDecoration)
            .border!
            .top
            .width,
        3,
      );
    });

    testWidgets('a card re-reads its tokens when the system in the theme changes', (
      WidgetTester tester,
    ) async {
      final Widget subject = card(variant: TanreiCardVariant.filled);
      await tester.pumpWidget(tanreiTestApp(subject));
      expect(containerColor(tester), light.surfaceContainerHighest);
      await tester.pumpWidget(
        tanreiTestApp(subject, theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      expect(containerOf(tester).shape.radius, cupertinoSystem.card.containerShape);
      expect(
        containerColor(tester),
        const TanreiThemeData(
          system: cupertinoSystem,
        ).paint(cupertinoSystem.card.variants.filled.enabled.containerColor),
      );
    });

    test('the tokens the widget reads: their default values', () {
      expect(cardTokens.containerShape, system.shape.medium);
      expect(cardTokens.containerPadding, system.space.space200);
      expect(cardTokens.outlineWidth, system.measure.borderHairline);
      expect(cardTokens.variants.keys, TanreiCardVariant.core);
      final TanreiCardVariants variants = cardTokens.variants;
      expect(
        lightTheme.paint(variants.elevated.enabled.containerColor),
        light.surfaceContainerLowest,
      );
      expect(
        lightTheme.paint(variants.filled.enabled.containerColor),
        light.surfaceContainerHighest,
      );
      expect(lightTheme.paint(variants.outlined.enabled.containerColor), light.surface);
      expect(lightTheme.paint(variants.outlined.enabled.outlineColor), light.outlineVariant);
      // Tanrei's level1 is only a ring: an elevated card rests on level2's shadow, one level above
      // on hover, and keeps level1's ring when disabled.
      expect(variants.elevated.enabled.containerElevation, system.elevation.level2);
      expect(variants.elevated.hovered.containerElevation, system.elevation.level3);
      expect(variants.elevated.focused.containerElevation, system.elevation.level2);
      expect(variants.elevated.pressed.containerElevation, system.elevation.level2);
      expect(variants.elevated.disabled.containerElevation, system.elevation.level1);
      expect(variants.filled.hovered.containerElevation, system.elevation.level0);
      expect(variants.outlined.hovered.containerElevation, system.elevation.level0);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets(
        '"${shipped.id}": every variant at rest draws the enabled tokens of that system',
        (WidgetTester tester) async {
          final TanreiThemeData theme = TanreiThemeData(system: shipped);
          for (final TanreiCardVariant variant in TanreiCardVariant.core) {
            await tester.pumpWidget(tanreiTestApp(action(variant: variant), theme: theme));
            final TanreiCardVariantStateTokens rest = shipped.card.variants[variant].enabled;
            expect(containerColor(tester), theme.paint(rest.containerColor), reason: variant.name);
            expect(contentColor(tester), theme.paint(rest.contentColor), reason: variant.name);
            expect(outlineColor(tester), theme.paint(rest.outlineColor), reason: variant.name);
            expect(containerOf(tester).shape.radius, shipped.card.containerShape);
            expect(containerOf(tester).shape.smoothing, shipped.shape.cornerSmoothing);
            expect(cardOpacity(tester), 1);
          }
        },
      );
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('card');

    test('the spec lists the fixtures this suite records, all with the report as content', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'outlined',
        'filled',
        'elevated',
        'outlined-flush',
        'outlined-interactive',
        'outlined-disabled',
        'elevated-disabled',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String>{report});
    });

    Widget fixtureCard(TanreiSystem of, Map<String, dynamic> fixture) {
      final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
      return framed(
        of,
        TanreiCard(
          onTap: props['interactive'] == true ? () {} : null,
          enabled: props['disabled'] != true,
          variant: TanreiCardVariant(props['variant'] as String? ?? 'outlined'),
          inset: props['inset'] as bool? ?? true,
          semanticLabel: props['label'] as String? ?? '',
          // Plain text: the card gives it the body style and the content color (CRD-13).
          child: Text(fixture['content'] as String),
        ),
      );
    }

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: cardGoldenSurface,
          child: fixtureCard(system, fixture),
          file: 'goldens/card/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the elevated card shows the
    // preset's shape, container color and shadow at once.
    const String recorded = 'elevated';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: cardGoldenSurface,
          child: fixtureCard(
            preset,
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/card/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
