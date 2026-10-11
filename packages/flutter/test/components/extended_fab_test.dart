import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiExtendedFabTokens efbTokens = system.extendedFab;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The `edit` glyph of Material Symbols (the fixtures' content), drawn as text so that it takes the
/// family of the theme (with the Flutter test font it is a box).
const String editGlyph = '\u{e3c9}';
const Widget edit = Text(editGlyph);
const String compose = 'Compose';

/// The frame of the extended FAB baselines: wide enough for the large one's label in the test
/// font, tall enough for its 64 and the solid shadow below it.
const Size efbGoldenSurface = Size(240, 112);

Widget efb({
  VoidCallback? onPressed,
  bool enabled = true,
  String label = compose,
  Widget? icon = edit,
  bool isExtended = true,
  TanreiExtendedFabVariant variant = TanreiExtendedFabVariant.filled,
  TanreiExtendedFabSize size = TanreiExtendedFabSize.medium,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key,
}) => TanreiExtendedFloatingActionButton(
  key: key,
  onPressed: enabled ? (onPressed ?? () {}) : null,
  label: label,
  icon: icon,
  isExtended: isExtended,
  variant: variant,
  size: size,
  focusNode: focusNode,
  autofocus: autofocus,
);

Finder get efbFinder => find.byType(TanreiExtendedFloatingActionButton);

/// The visual container (the first box inside the focus ring).
Finder get efbContainer =>
    find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first;

TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(efbContainer).decoration as TanreiContainerDecoration;

Size containerSize(WidgetTester tester) => tester.getSize(efbContainer);

Color containerColor(WidgetTester tester) =>
    containerDecoration(tester).color ?? const Color(0x00000000);

TextStyle labelStyle(WidgetTester tester, [String text = compose]) =>
    DefaultTextStyle.of(tester.element(find.text(text))).style;

Color labelColor(WidgetTester tester) => labelStyle(tester).color!;

TextStyle glyphStyle(WidgetTester tester) =>
    DefaultTextStyle.of(tester.element(find.text(editGlyph))).style;

Color iconColor(WidgetTester tester) => glyphStyle(tester).color!;

IconThemeData iconTheme(WidgetTester tester) => IconTheme.of(tester.element(find.text(editGlyph)));

double controlOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.descendant(of: efbFinder, matching: find.byType(Opacity)).first)
    .opacity;

/// The opacity the label part is drawn with while it resizes (1 when nothing fades it). The only
/// `Opacity` inside the focus ring is the label's fade; the control's own is outside it.
double labelOpacity(WidgetTester tester) {
  final Finder fade = find.descendant(
    of: find.byType(TanreiFocusRing),
    matching: find.byType(Opacity),
  );
  return fade.evaluate().isEmpty ? 1 : tester.widget<Opacity>(fade).opacity;
}

bool focusRingVisible(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

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
  await mouse.moveTo(tester.getCenter(efbFinder));
  await tester.pumpAndSettle();
  return mouse;
}

/// The extended width of the default medium button with an icon: start padding, icon, gap, label
/// and end padding (EFB-11).
double extendedWidth(WidgetTester tester, TanreiExtendedFabSizeTokens size) =>
    size.containerPaddingInlineStartWithIcon +
    size.iconSize +
    size.containerGap +
    tester.getSize(find.text(compose)).width +
    size.containerPaddingInlineEnd;

/// Collects the components reported for an ignored value, and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// The extended FAB of a spec fixture.
Widget fixtureEfb(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return TanreiExtendedFloatingActionButton(
    onPressed: props['disabled'] == true ? null : () {},
    label: props['label'] as String? ?? '',
    icon: fixture['content'] == null ? null : edit,
    isExtended: props['expanded'] as bool? ?? true,
    variant: TanreiExtendedFabVariant(props['variant'] as String? ?? 'filled'),
    size: TanreiExtendedFabSize(props['size'] as String? ?? 'medium'),
  );
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
      testWidgets('EFB-1: a ${kind.name} tap emits onPressed exactly once, extended or collapsed', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        for (final bool isExtended in <bool>[true, false]) {
          await tester.pumpWidget(
            tanreiTestApp(efb(onPressed: () => pressed++, isExtended: isExtended)),
          );
          await tester.tap(efbFinder, kind: kind);
          await tester.pumpAndSettle();
        }
        expect(pressed, 2);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('EFB-1: $name emits onPressed exactly once', (WidgetTester tester) async {
        int pressed = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(efb(onPressed: () => pressed++, focusNode: focusNode)),
        );
        focusNode.requestFocus();
        await tester.pump();
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    testWidgets('EFB-1: the semantic tap action emits onPressed exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(efb(onPressed: () => pressed++)));
      tester.semantics.tap(find.semantics.byLabel(compose));
      await tester.pump();
      expect(pressed, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('EFB-2: a null onPressed emits nothing, is not focusable and is exposed as '
        'disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(efb(enabled: false, focusNode: focusNode)));
      await tester.tap(efbFinder);
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: compose,
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

    for (final TanreiExtendedFabVariant variant in TanreiExtendedFabVariant.core) {
      testWidgets('EFB-6: disabled ${variant.name} draws container, label, icon, elevation and '
          'opacity from the disabled tokens of its variant', (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(efb(enabled: false, variant: variant)));
        final TanreiExtendedFabVariantStateTokens disabled = efbTokens.variants[variant].disabled;
        expect(containerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(labelColor(tester), lightTheme.paint(disabled.labelColor));
        expect(iconColor(tester), lightTheme.paint(disabled.labelColor));
        expectElevation(tester, disabled.containerElevation);
        expect(controlOpacity(tester), efbTokens.disabled.opacity);
        // The default system: an on-surface fill, disabled content, nothing raised.
        expect(
          containerColor(tester),
          isSameColorAs(light.onSurface.withValues(alpha: system.state.disabledContainerOpacity)),
        );
        expect(labelColor(tester).a, closeTo(system.state.disabledContentOpacity, 1e-6));
        expect(containerDecoration(tester).boxShadow, isNull);
      });
    }
  });

  group('interaction states', () {
    testWidgets('EFB-3: container, label, icon, elevation and opacity come from the tokens of the '
        'highest-precedence state, pressed > focused > hovered', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiExtendedFabVariantTokens filled = efbTokens.variants.filled;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(efb(focusNode: focusNode)));
      void expectDrawnFrom(
        TanreiExtendedFabVariantStateTokens tokens,
        TanreiExtendedFabStateTokens? state,
      ) {
        expect(containerColor(tester), lightTheme.paint(tokens.containerColor));
        expect(labelColor(tester), lightTheme.paint(tokens.labelColor));
        expect(iconColor(tester), lightTheme.paint(tokens.labelColor));
        expectElevation(tester, tokens.containerElevation);
        expect(controlOpacity(tester), state?.opacity ?? 1);
      }

      expectDrawnFrom(filled.enabled, null);
      expect(containerColor(tester), light.primary);
      expect(labelColor(tester), light.onPrimary);

      final TestGesture mouse = await hover(tester);
      expectDrawnFrom(filled.hovered, efbTokens.hovered);
      expect(filled.hovered.containerElevation, system.elevation.level4);

      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.focused, efbTokens.focused);

      await mouse.down(tester.getCenter(efbFinder));
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.pressed, efbTokens.pressed);

      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(filled.enabled, null);
    });

    testWidgets('EFB-3: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(efb(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(containerColor(tester), light.primary);
    });

    testWidgets('EFB-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiExtendedFabVariantTokens filled = acmeSystem.extendedFab.variants.filled;
      final Color hovered = theme.paint(filled.hovered.containerColor);
      final Color focused = theme.paint(filled.focused.containerColor);
      final Color pressedColor = theme.paint(filled.pressed.containerColor);
      expect(<Color>{hovered, focused, pressedColor}, hasLength(3));

      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(efb(focusNode: focusNode), theme: theme));
      final TestGesture mouse = await hover(tester);
      expect(containerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
      await mouse.down(tester.getCenter(efbFinder));
      await tester.pump();
      expect(containerColor(tester), pressedColor);
      await mouse.up();
      await tester.pump(tanreiDuration(acmeSystem.motion.duration.pressHold));
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
    });
  });

  group('focus ring', () {
    testWidgets('EFB-4: keyboard focus shows the focus ring at once, around the container, '
        'extended or collapsed', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      for (final bool isExtended in <bool>[true, false]) {
        await tester.pumpWidget(
          tanreiTestApp(
            Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[efb(key: UniqueKey(), isExtended: isExtended)],
            ),
          ),
        );
        expect(focusRingVisible(tester), isFalse);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(focusRingVisible(tester), isTrue);
        final TanreiMeasure measure = system.measure;
        final double offset = measure.focusOffset + measure.focusOuterWidth / 2;
        final RRect expectedRing = BorderRadius.circular(
          efbTokens.sizes.medium.containerShape,
        ).toRRect(Offset.zero & containerSize(tester)).inflate(offset);
        expect(
          find.byType(TanreiFocusRing),
          paints..something(
            (Symbol method, List<dynamic> arguments) =>
                method == #drawRRect &&
                arguments[0] == expectedRing &&
                (arguments[1] as Paint).style == PaintingStyle.stroke,
          ),
          reason: 'isExtended: $isExtended',
        );
        FocusManager.instance.primaryFocus?.unfocus();
      }
    });

    testWidgets('EFB-4: pointer or touch focus does not show the focus ring', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(efb(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusRingVisible(tester), isFalse);
    });
  });

  group('target size', () {
    testWidgets('EFB-5: the small size extends its hit area to sys.target.touch on the short axis '
        'without changing its visual size, and collapsed on both axes', (
      WidgetTester tester,
    ) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(efb(size: TanreiExtendedFabSize.small, onPressed: () => pressed++)),
      );
      final TanreiExtendedFabSizeTokens small = efbTokens.sizes.small;
      expect(containerSize(tester).height, small.containerHeight);
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.height, system.measure.targetTouch);
      expect(target.width, containerSize(tester).width);
      await tester.tapAt(Offset(target.center.dx, target.top + 1));
      expect(pressed, 1);

      await tester.pumpWidget(
        tanreiTestApp(
          efb(
            key: UniqueKey(),
            size: TanreiExtendedFabSize.small,
            isExtended: false,
            onPressed: () => pressed++,
          ),
        ),
      );
      expect(containerSize(tester), Size.square(small.containerHeight));
      final Rect square = tester.getRect(find.byType(TanreiTapTarget));
      expect(square.size, Size.square(system.measure.targetTouch));
      await tester.tapAt(square.topLeft + const Offset(1, 1));
      expect(pressed, 2);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });
  });

  group('open size and variant keys', () {
    testWidgets('EFB-7: a size and a variant the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        surface: efbGoldenSurface,
        child: efb(
          size: const TanreiExtendedFabSize('3x'),
          variant: const TanreiExtendedFabVariant('danger'),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(reports, contains('extended-fab size "3x" -> medium'));
      expect(reports, contains('extended-fab variant "danger" -> filled'));
      reports.clear();
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        surface: efbGoldenSurface,
        child: efb(),
      );
      expect(reports, isEmpty);
      expect(unknown, defaults, reason: 'pixel for pixel the default extended FAB');
    });

    testWidgets('EFB-7: a size and a variant a design system added with copyWith drive it', (
      WidgetTester tester,
    ) async {
      const TanreiExtendedFabSize hero = TanreiExtendedFabSize('hero');
      const TanreiExtendedFabVariant danger = TanreiExtendedFabVariant('danger');
      final TanreiSystem product = system.copyWith(
        extendedFab: efbTokens.copyWith(
          sizes: efbTokens.sizes.copyWith(
            extra: <TanreiExtendedFabSize, TanreiExtendedFabSizeTokens>{
              hero: efbTokens.sizes.large.copyWith(containerHeight: 80),
            },
          ),
          variants: efbTokens.variants.copyWith(
            extra: <TanreiExtendedFabVariant, TanreiExtendedFabVariantTokens>{
              danger: efbTokens.variants.filled.copyWith(
                enabled: efbTokens.variants.filled.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.error),
                  labelColor: const TanreiPaint.role(TanreiColorRole.onError),
                ),
              ),
            },
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          efb(size: hero, variant: danger),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(containerSize(tester).height, 80);
      expect(containerColor(tester), light.error);
      expect(labelColor(tester), light.onError);
      expect(tester.takeException(), isNull);
    });
  });

  group('press hold (EFB-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(efbTokens.variants.filled.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    testWidgets('EFB-8: a tap shows the pressed state without delay and keeps it for the '
        'press-hold duration although the press ended at once', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(efb()));
      await tester.tap(efbFinder);
      await tester.pump();
      expect(containerColor(tester), pressedFill);
      await tester.pump(hold - tick);
      expect(containerColor(tester), pressedFill);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(containerColor(tester), light.primary);
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('EFB-8: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.pumpWidget(tanreiTestApp(efb(autofocus: true)));
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
  });

  group('choices of kind', () {
    Widget app(TanreiSystem of, Widget child, {bool disableAnimations = false}) => tanreiTestApp(
      child,
      theme: TanreiThemeData(system: of),
      disableAnimations: disableAnimations,
    );

    testWidgets('EFB-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      await tester.pumpWidget(app(system, efb(variant: TanreiExtendedFabVariant.tonal)));
      final TestGesture touch = await tester.startGesture(tester.getCenter(efbFinder));
      await tester.pump();
      expect(
        containerColor(tester),
        lightTheme.paint(efbTokens.variants.tonal.pressed.containerColor),
      );
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('EFB-9: ripple (m3-like) grows the pressed container from the point of contact '
        'over comp.extended-fab.motion.feedback-duration, from the center for the keyboard, and '
        'whole where motion is reduced', (WidgetTester tester) async {
      final TanreiExtendedFabTokens tokens = m3LikeSystem.extendedFab;
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      await tester.pumpWidget(app(m3LikeSystem, efb()));
      final Rect box = tester.getRect(efbContainer);
      const Offset contact = Offset(30, 7);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, contact);
      expect(
        containerDecoration(tester).ripple!.color,
        theme.paint(tokens.variants.filled.pressed.containerColor),
      );
      final Duration growth = tanreiDuration(tokens.motionFeedbackDuration);
      await tester.pump(growth ~/ 2);
      expect(
        containerDecoration(tester).ripple!.progress,
        moreOrLessEquals(tokens.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(app(m3LikeSystem, efb(key: UniqueKey(), autofocus: true)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, isNull);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));

      await tester.pumpWidget(app(m3LikeSystem, efb(key: UniqueKey()), disableAnimations: true));
      final TestGesture reduced = await tester.startGesture(tester.getCenter(efbFinder));
      await tester.pump();
      expect(containerDecoration(tester).ripple!.progress, 1);
      await reduced.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'EFB-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; label, icon, elevation and opacity are the pressed tokens\''}',
        (WidgetTester tester) async {
          final TanreiExtendedFabVariantTokens filled = efbTokens.variants.filled;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            extendedFab: efbTokens.copyWith(
              pressed: efbTokens.pressed.copyWith(opacity: 0.5),
              variants: efbTokens.variants.copyWith(
                filled: filled.copyWith(
                  pressed: filled.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                    containerElevation: system.elevation.level1,
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(app(of, efb()));
          final TestGesture mouse = await hover(tester);
          final TanreiContainerDecoration hovered = containerDecoration(tester);
          final Color hoveredLabel = labelColor(tester);
          await mouse.down(tester.getCenter(efbFinder));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerDecoration(tester);
          expect(drawn.color, hovered.color);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(labelColor(tester), hoveredLabel);
            expect(controlOpacity(tester), 1);
          } else {
            expect(labelColor(tester), const Color(0xFF445566));
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

    testWidgets('EFB-10: the corner smoothing of the system eases the container (a path above 0), '
        'and the focus style draws a ring or a glow', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(app(system, efb(key: UniqueKey(), autofocus: true)));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0);
      expect(efbContainer, paints..rrect());

      final TanreiSystem smoothed = system.copyWith(
        shape: system.shape.copyWith(cornerSmoothing: cupertinoSystem.shape.cornerSmoothing),
      );
      await tester.pumpWidget(app(smoothed, efb(key: UniqueKey(), autofocus: true)));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(efbContainer, paints..path());
      expect(efbContainer, isNot(paints..rrect()));

      await tester.pumpWidget(app(acmeSystem, efb(key: UniqueKey(), autofocus: true)));
      await tester.pump();
      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      expect(
        find.byType(TanreiFocusRing),
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawRRect &&
              (arguments[1] as Paint).maskFilter ==
                  MaskFilter.blur(BlurStyle.normal, acmeSystem.measure.focusOuterWidth / 2),
        ),
      );
    });
  });

  group('layout', () {
    testWidgets('EFB-11: extended, each size is its height high, as wide as padding, icon, gap, '
        'label and padding, with the corners of its size', (WidgetTester tester) async {
      for (final TanreiExtendedFabSize key in TanreiExtendedFabSize.core) {
        final TanreiExtendedFabSizeTokens size = efbTokens.sizes[key];
        await tester.pumpWidget(tanreiTestApp(efb(size: key)));
        expect(containerSize(tester).height, size.containerHeight, reason: key.name);
        expect(containerSize(tester).width, moreOrLessEquals(extendedWidth(tester, size)));
        expect(containerDecoration(tester).shape.radius, size.containerShape);
        final Rect box = tester.getRect(efbContainer);
        final Rect icon = tester.getRect(find.text(editGlyph));
        final Rect label = tester.getRect(find.text(compose));
        expect(icon.left - box.left, moreOrLessEquals(size.containerPaddingInlineStartWithIcon));
        expect(label.left - icon.right, moreOrLessEquals(size.containerGap));
        expect(box.right - label.right, moreOrLessEquals(size.containerPaddingInlineEnd));
        expect(icon.center.dy, moreOrLessEquals(box.center.dy));
      }
    });

    testWidgets('EFB-11: without an icon the start padding is padding-inline-start', (
      WidgetTester tester,
    ) async {
      final TanreiExtendedFabSizeTokens size = efbTokens.sizes.medium;
      await tester.pumpWidget(tanreiTestApp(efb(icon: null)));
      final Rect box = tester.getRect(efbContainer);
      final Rect label = tester.getRect(find.text(compose));
      expect(label.left - box.left, moreOrLessEquals(size.containerPaddingInlineStart));
      expect(box.right - label.right, moreOrLessEquals(size.containerPaddingInlineEnd));
      expect(find.text(editGlyph), findsNothing);
    });

    testWidgets('EFB-12: the label is set in the text style of its size and the label color, the '
        'icon in the same color at the icon size of its size, unselected', (
      WidgetTester tester,
    ) async {
      for (final TanreiExtendedFabSize key in TanreiExtendedFabSize.core) {
        final TanreiExtendedFabSizeTokens size = efbTokens.sizes[key];
        await tester.pumpWidget(tanreiTestApp(efb(size: key)));
        final TextStyle expected = lightTheme.textStyle(
          size.labelTypescale,
          color: light.onPrimary,
        );
        final TextStyle style = labelStyle(tester);
        expect(style.fontSize, expected.fontSize, reason: key.name);
        expect(style.fontWeight, expected.fontWeight, reason: key.name);
        expect(style.height, expected.height, reason: key.name);
        expect(style.color, light.onPrimary);
        expect(tester.getSize(find.text(editGlyph)), Size.square(size.iconSize));
        expect(iconColor(tester), light.onPrimary);
        expect(iconTheme(tester).fill, system.icon.fill(selected: false));
        expect(iconTheme(tester).weight, system.icon.weight);
      }
      // The large size's label is heading-5.
      expect(efbTokens.sizes.large.labelTypescale, system.typescale.heading5);
      expect(efbTokens.sizes.medium.labelTypescale, system.typescale.label);

      // Acme's icon set has two static families: the icon is the unselected one.
      await tester.pumpWidget(
        tanreiTestApp(efb(), theme: const TanreiThemeData(system: acmeSystem)),
      );
      expect(glyphStyle(tester).fontFamily, acmeSystem.icon.family(selected: false));
    });

    testWidgets('EFB-12: the label never truncates — it wraps when the layout gives it less width, '
        'and the container grows in both axes, at 200 % text too', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(SizedBox(width: 120, child: Center(child: efb()))));
      final RenderParagraph paragraph = tester.renderObject<RenderParagraph>(find.text(compose));
      expect(paragraph.didExceedMaxLines, isFalse);
      expect(paragraph.maxLines, isNull);
      expect(paragraph.overflow, isNot(TextOverflow.ellipsis));
      final double line = labelStyle(tester).fontSize! * labelStyle(tester).height!;
      expect(tester.getSize(find.text(compose)).height, greaterThan(line * 1.5));
      expect(containerSize(tester).width, lessThanOrEqualTo(120));
      expect(containerSize(tester).height, greaterThan(efbTokens.sizes.medium.containerHeight));
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: efb(),
          ),
        ),
      );
      final Size large = containerSize(tester);
      expect(
        large.height,
        moreOrLessEquals(
          tester.getSize(find.text(compose)).height +
              2 * efbTokens.sizes.medium.containerPaddingBlock,
        ),
      );
      expect(large.height, greaterThan(efbTokens.sizes.medium.containerHeight));
      // The icon is not text: it keeps its size.
      expect(tester.getSize(find.text(editGlyph)), Size.square(efbTokens.sizes.medium.iconSize));
      expect(tester.takeException(), isNull);
    });
  });

  group('collapse', () {
    testWidgets('EFB-13: collapsed, it is a square of its height with the icon centered, the label '
        'hidden, and the label still its accessible name', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiExtendedFabSize key in TanreiExtendedFabSize.core) {
        final TanreiExtendedFabSizeTokens size = efbTokens.sizes[key];
        await tester.pumpWidget(tanreiTestApp(efb(size: key, isExtended: false)));
        expect(containerSize(tester), Size.square(size.containerHeight), reason: key.name);
        expect(tester.getCenter(find.text(editGlyph)), tester.getCenter(efbContainer));
        expect(labelOpacity(tester), 0);
        expect(
          tester.getSemantics(find.byType(TanreiTapTarget)),
          matchesSemantics(
            label: compose,
            isButton: true,
            hasEnabledState: true,
            isEnabled: true,
            isFocusable: true,
            hasTapAction: true,
            hasFocusAction: true,
          ),
        );
      }
      // Collapsed at 200 % text it stays a square: the label takes no room.
      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: efb(isExtended: false),
          ),
        ),
      );
      expect(containerSize(tester), Size.square(efbTokens.sizes.medium.containerHeight));
      handle.dispose();
    });

    testWidgets('EFB-13: collapsed, it matches the FAB of its size in every shipped system', (
      WidgetTester tester,
    ) async {
      for (final TanreiSystem shipped in shippedSystems) {
        for (final TanreiExtendedFabSize key in TanreiExtendedFabSize.core) {
          final TanreiFabSizeTokens fab = shipped.fab.sizes[TanreiFabSize(key.name)];
          final TanreiExtendedFabSizeTokens size = shipped.extendedFab.sizes[key];
          final String reason = '${shipped.id} ${key.name}';
          expect(size.containerHeight, fab.containerSize, reason: reason);
          expect(size.containerShape, fab.containerShape, reason: reason);
          expect(size.iconSize, fab.iconSize, reason: reason);
        }
      }
    });

    testWidgets('EFB-14: a change of isExtended changes the width over the resize motion tokens, '
        'fading the label, and at once where motion is reduced', (WidgetTester tester) async {
      final TanreiExtendedFabSizeTokens size = efbTokens.sizes.medium;
      final Key key = UniqueKey();
      Widget build(bool isExtended, {bool disableAnimations = false}) => tanreiTestApp(
        efb(key: key, isExtended: isExtended),
        disableAnimations: disableAnimations,
      );
      await tester.pumpWidget(build(true));
      final double wide = containerSize(tester).width;
      expect(wide, moreOrLessEquals(extendedWidth(tester, size)));
      final double side = size.containerHeight;

      await tester.pumpWidget(build(false));
      expect(containerSize(tester).width, moreOrLessEquals(wide), reason: 'starts where it was');
      final Duration duration = tanreiDuration(efbTokens.motionResizeDuration);
      final Curve curve = efbTokens.motionResizeEasing.toCurve();
      await tester.pump(duration ~/ 3);
      final double shown = 1 - curve.transform(1 / 3);
      expect(containerSize(tester).width, moreOrLessEquals(side + shown * (wide - side)));
      expect(labelOpacity(tester), moreOrLessEquals(shown.clamp(0, 1)));
      expect(labelOpacity(tester), inExclusiveRange(0, 1));
      await tester.pump(duration);
      expect(containerSize(tester), Size.square(side));

      // Back out: the label fades in as it widens.
      await tester.pumpWidget(build(true));
      await tester.pump(duration ~/ 3);
      expect(containerSize(tester).width, inExclusiveRange(side, wide * 1.2));
      expect(labelOpacity(tester), inExclusiveRange(0, 1));
      await tester.pumpAndSettle();
      expect(containerSize(tester).width, moreOrLessEquals(wide));
      expect(labelOpacity(tester), 1);

      // Reduced motion: at once.
      await tester.pumpWidget(build(false, disableAnimations: true));
      await tester.pump();
      expect(containerSize(tester), Size.square(side));
      await tester.pumpWidget(build(true, disableAnimations: true));
      await tester.pump();
      expect(containerSize(tester).width, moreOrLessEquals(wide));
    });

    testWidgets('EFB-15: without an icon isExtended false keeps it extended, and debug builds '
        'report it once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(tanreiTestApp(efb(icon: null)));
      final double wide = containerSize(tester).width;
      expect(reports, isEmpty);
      await tester.pumpWidget(tanreiTestApp(efb(icon: null, isExtended: false)));
      await tester.pumpAndSettle();
      expect(containerSize(tester).width, wide);
      expect(labelOpacity(tester), 1);
      expect(reports, <String>['extended-fab isExtended']);
      await tester.pumpWidget(
        tanreiTestApp(efb(icon: null, isExtended: false, variant: TanreiExtendedFabVariant.tonal)),
      );
      expect(reports, hasLength(1), reason: 'not on every build');
      // With an icon it collapses and nothing is reported.
      await tester.pumpWidget(tanreiTestApp(efb(isExtended: false)));
      expect(reports, hasLength(1));
    });

    testWidgets('EFB-15: the default reporter reports a FlutterError that says what to do', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(efb(icon: null, isExtended: false)));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('extended-fab ignores its isExtended'));
      expect('$reported', contains('without an icon'));
    });
  });

  group('elevation', () {
    testWidgets('EFB-16: it casts the elevation of its variant and state outside the container, '
        'unclipped, and animates a change of state over the state motion (at once where motion is '
        'reduced)', (WidgetTester tester) async {
      for (final TanreiExtendedFabVariant variant in TanreiExtendedFabVariant.core) {
        await tester.pumpWidget(tanreiTestApp(efb(variant: variant)));
        expectElevation(tester, efbTokens.variants[variant].enabled.containerElevation);
      }
      expect(
        find.ancestor(
          of: efbContainer,
          matching: find.byWidgetPredicate(
            (Widget w) => w is ClipRect || w is ClipRRect || w is ClipPath,
          ),
        ),
        findsNothing,
      );

      final TanreiExtendedFabVariantTokens filled = efbTokens.variants.filled;
      final TanreiResolvedElevation rest = elevationOf(filled.enabled.containerElevation);
      final TanreiResolvedElevation raised = elevationOf(filled.hovered.containerElevation);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<TestGesture> hoverWith({required bool disableAnimations}) async {
        await tester.pumpWidget(
          tanreiTestApp(efb(key: UniqueKey()), disableAnimations: disableAnimations),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await mouse.moveTo(tester.getCenter(efbFinder));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(disableAnimations: false);
      await tester.pump(Duration(milliseconds: efbTokens.motionStateDuration ~/ 3));
      final double progress = efbTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(
        containerDecoration(tester).boxShadow,
        BoxShadow.lerpList(rest.shadows, raised.shadows, progress),
      );
      await tester.pump(tanreiDuration(efbTokens.motionStateDuration));
      expect(containerDecoration(tester).boxShadow, raised.shadows);
      await mouse.removePointer();

      final TestGesture reduced = await hoverWith(disableAnimations: true);
      expect(containerDecoration(tester).boxShadow, raised.shadows);
      await reduced.removePointer();
    });
  });

  group('placement', () {
    testWidgets('EFB-17: it does not position itself — the layout places it (here a '
        'PositionedDirectional in a Stack), it draws no scrim and moves nothing', (
      WidgetTester tester,
    ) async {
      const Key content = Key('content');
      await tester.pumpWidget(
        tanreiTestApp(
          SizedBox(
            width: 400,
            height: 400,
            child: Stack(
              children: <Widget>[
                const SizedBox.expand(key: content),
                PositionedDirectional(end: 16, bottom: 16, child: efb()),
              ],
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      final Rect stack = tester.getRect(find.byType(Stack));
      final Rect button = tester.getRect(efbFinder);
      expect(button.bottomRight, stack.bottomRight - const Offset(16, 16));
      expect(button.width, moreOrLessEquals(extendedWidth(tester, efbTokens.sizes.medium)));
      expect(tester.getRect(find.byKey(content)), stack);
      expect(find.byType(ModalBarrier), findsNothing);
    });
  });

  group('right to left', () {
    testWidgets('EFB-18: in right-to-left the icon and label swap sides, the paddings follow the '
        'logical start and end, and a ripple grows from the point of contact', (
      WidgetTester tester,
    ) async {
      final TanreiExtendedFabSizeTokens size = efbTokens.sizes.medium;
      await tester.pumpWidget(
        tanreiTestApp(Directionality(textDirection: TextDirection.rtl, child: efb())),
      );
      final Rect box = tester.getRect(efbContainer);
      final Rect icon = tester.getRect(find.text(editGlyph));
      final Rect label = tester.getRect(find.text(compose));
      expect(icon.left, greaterThan(label.right));
      expect(box.right - icon.right, moreOrLessEquals(size.containerPaddingInlineStartWithIcon));
      expect(icon.left - label.right, moreOrLessEquals(size.containerGap));
      expect(label.left - box.left, moreOrLessEquals(size.containerPaddingInlineEnd));

      // A ripple (m3-like) grows from the point of contact, as in left-to-right.
      await tester.pumpWidget(
        tanreiTestApp(
          Directionality(textDirection: TextDirection.rtl, child: efb()),
          theme: const TanreiThemeData(system: m3LikeSystem),
        ),
      );
      const Offset contact = Offset(12, 9);
      final TestGesture touch = await tester.startGesture(
        tester.getRect(efbContainer).topLeft + contact,
      );
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
    });
  });

  group('accessible name', () {
    testWidgets('EFB-19: an empty label still renders, and debug builds report it once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(efb(label: '')));
      expect(find.byType(TanreiExtendedFloatingActionButton), findsOneWidget);
      expect(containerSize(tester).height, efbTokens.sizes.medium.containerHeight);
      expect(reports, <String>['extended-fab']);
      await tester.pumpWidget(tanreiTestApp(efb(label: '', isExtended: false)));
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(efb()));
      await tester.pumpWidget(tanreiTestApp(efb(label: ' ')));
      expect(reports, hasLength(2));
    });

    testWidgets('EFB-19: the default reporter names the label property', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(efb(label: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('extended-fab has no accessible name'));
      expect('$reported', contains('label'));
    });
  });

  group('accessibility', () {
    testWidgets('semantics: one button named by the label, the label text and the icon adding '
        'nothing of their own', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(efb()));
      final SemanticsNode node = tester.getSemantics(find.byType(TanreiTapTarget));
      expect(
        node,
        matchesSemantics(
          label: compose,
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      expect(node.childrenCount, 0);
      handle.dispose();
    });

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: small, extended and collapsed, on ${theme.brightness.name}', (
        WidgetTester tester,
      ) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        for (final bool isExtended in <bool>[true, false]) {
          await tester.pumpWidget(
            tanreiTestApp(
              efb(size: TanreiExtendedFabSize.small, isExtended: isExtended),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        }
        handle.dispose();
      });
    }

    // WCAG 1.4.3: the label needs 4.5:1 on its container in every scheme of the default system. An
    // imitation preset is held to its original, not to this criterion, in any scheme.
    test('text contrast: every enabled variant of "${system.id}" meets 4.5:1 (label on its '
        'container over the surface)', () {
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
        for (final TanreiExtendedFabVariant variant in TanreiExtendedFabVariant.core) {
          final TanreiExtendedFabVariantStateTokens rest =
              system.extendedFab.variants[variant].enabled;
          final Color background = Color.alphaBlend(
            theme.paint(rest.containerColor),
            theme.colors.surface,
          );
          final Color label = Color.alphaBlend(theme.paint(rest.labelColor), background);
          final double ratio = contrastOf(label, background);
          if (ratio < 4.5) {
            failures.add('${scheme.key} ${variant.name}: ${ratio.toStringAsFixed(2)}');
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('shipped presets', () {
    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": every variant at rest draws the enabled tokens of that system, '
          'and collapsed equals the FAB of its size', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        for (final TanreiExtendedFabVariant variant in TanreiExtendedFabVariant.core) {
          await tester.pumpWidget(tanreiTestApp(efb(variant: variant), theme: theme));
          final TanreiExtendedFabVariantStateTokens rest =
              shipped.extendedFab.variants[variant].enabled;
          expect(containerColor(tester), theme.paint(rest.containerColor), reason: variant.name);
          expect(labelColor(tester), theme.paint(rest.labelColor), reason: variant.name);
          expectElevation(tester, rest.containerElevation, colors: theme.colors);
          final TanreiFabVariantStateTokens fab =
              shipped.fab.variants[TanreiFabVariant(variant.name)].enabled;
          expect(theme.paint(rest.containerColor), theme.paint(fab.containerColor));
          expect(theme.paint(rest.labelColor), theme.paint(fab.iconColor));
        }
        for (final TanreiExtendedFabSize key in TanreiExtendedFabSize.core) {
          final TanreiExtendedFabSizeTokens size = shipped.extendedFab.sizes[key];
          final TanreiFabSizeTokens fab = shipped.fab.sizes[TanreiFabSize(key.name)];
          await tester.pumpWidget(
            tanreiTestApp(
              efb(key: UniqueKey(), size: key, isExtended: false),
              theme: theme,
            ),
          );
          expect(containerSize(tester), Size.square(size.containerHeight), reason: key.name);
          // A collapsed extended FAB matches the FAB of its size in every shipped system.
          expect(size.containerHeight, fab.containerSize, reason: '${shipped.id} ${key.name}');
          expect(size.containerShape, fab.containerShape, reason: '${shipped.id} ${key.name}');
          expect(size.iconSize, fab.iconSize, reason: '${shipped.id} ${key.name}');
          expect(tester.takeException(), isNull);
        }
      });
    }

    testWidgets('cupertino: a capsule, and a pointer does not lift it', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiExtendedFabTokens tokens = cupertinoSystem.extendedFab;
      await tester.pumpWidget(tanreiTestApp(efb(), theme: theme));
      expect(
        containerDecoration(tester).shape.radius,
        greaterThanOrEqualTo(tokens.sizes.medium.containerHeight / 2),
      );
      final List<BoxShadow>? before = containerDecoration(tester).boxShadow;
      final Color rest = containerColor(tester);
      await hover(tester);
      expect(containerDecoration(tester).boxShadow, before);
      expect(containerColor(tester), rest);
    });

    test('m3-like: a 56 medium with Material\'s 12 gap', () {
      final TanreiExtendedFabSizeTokens medium = m3LikeSystem.extendedFab.sizes.medium;
      expect(medium.containerHeight, 56);
      expect(medium.containerGap, 12);
      expect(medium.containerPaddingInlineStartWithIcon, 16);
      expect(medium.containerPaddingInlineEnd, 20);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('extended-fab');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'filled-medium',
        'tonal-medium',
        'surface-medium',
        'filled-small',
        'filled-large',
        'filled-disabled',
        'filled-collapsed',
        'filled-no-icon',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String?>{
        'edit',
        null,
      });
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: efbGoldenSurface,
          child: fixtureEfb(fixture),
          file: 'goldens/extended_fab/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset.
    const String recorded = 'filled-medium';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: efbGoldenSurface,
          child: fixtureEfb(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/extended_fab/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
