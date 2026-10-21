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
final TanreiChipTokens chipTokens = system.chip;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The glyphs: the fixtures' `event` icon (drawn as text by the test, as a product would), and the
/// chip's own check and close (Material Symbols code points, drawn by the chip).
const String eventGlyph = '\u{e878}';
const Widget event = Text(eventGlyph);
const String checkGlyph = '\u{e5ca}';
const String closeGlyph = '\u{e5cd}';
const String calendar = 'Add to calendar';
const String vegetarian = 'Vegetarian';
const String ada = 'Ada Lovelace';
const String removeAda = 'Remove Ada Lovelace';

/// A neutral stand-in for the fixtures' avatar image: a solid square
/// of a scheme color, so a baseline shows its size, clip and fade without an image file.
class Avatar extends StatelessWidget {
  const Avatar({super.key});

  @override
  Widget build(BuildContext context) =>
      ColoredBox(color: TanreiTheme.of(context).colors.secondary, child: const SizedBox.expand());
}

Widget action({
  VoidCallback? onPressed,
  bool isEnabled = true,
  Widget? icon = event,
  String label = calendar,
  TanreiChipVariant variant = TanreiChipVariant.outlined,
  TanreiChipSize size = TanreiChipSize.medium,
  FocusNode? focusNode,
  bool autofocus = false,
  Widget? avatar,
  Key? key,
}) => TanreiChip(
  key: key,
  label: label,
  onPressed: onPressed ?? () {},
  icon: icon,
  avatar: avatar,
  variant: variant,
  size: size,
  isEnabled: isEnabled,
  focusNode: focusNode,
  autofocus: autofocus,
);

Widget filter({
  bool selected = false,
  ValueChanged<bool>? onSelected,
  VoidCallback? onPressed,
  bool isEnabled = true,
  Widget? icon,
  TanreiChipVariant variant = TanreiChipVariant.outlined,
  TanreiChipSize size = TanreiChipSize.medium,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key,
}) => TanreiChip.filter(
  key: key,
  label: vegetarian,
  selected: selected,
  onSelected: onSelected ?? (_) {},
  onPressed: onPressed,
  icon: icon,
  variant: variant,
  size: size,
  isEnabled: isEnabled,
  focusNode: focusNode,
  autofocus: autofocus,
);

Widget input({
  VoidCallback? onDeleted,
  VoidCallback? onPressed,
  bool isEnabled = true,
  Widget? avatar,
  Widget? icon,
  String label = ada,
  String removeSemanticLabel = removeAda,
  TanreiChipVariant variant = TanreiChipVariant.outlined,
  TanreiChipSize size = TanreiChipSize.medium,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key,
}) => TanreiChip.input(
  key: key,
  label: label,
  removeSemanticLabel: removeSemanticLabel,
  onDeleted: onDeleted ?? () {},
  onPressed: onPressed,
  avatar: avatar,
  icon: icon,
  variant: variant,
  size: size,
  isEnabled: isEnabled,
  focusNode: focusNode,
  autofocus: autofocus,
);

Finder get chipFinder => find.byType(TanreiChip);

/// The chip's own focus ring (an input chip has a second one, its remove action's).
Finder get chipRing =>
    find.descendant(of: chipFinder, matching: find.byType(TanreiFocusRing)).first;

/// The chip's container.
Finder get chipContainer =>
    find.descendant(of: chipRing, matching: find.byType(DecoratedBox)).first;

TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(chipContainer).decoration as TanreiContainerDecoration;

Color containerColor(WidgetTester tester) =>
    containerDecoration(tester).color ?? const Color(0x00000000);

/// The outline drawn (none: transparent).
Color outlineColor(WidgetTester tester) {
  final TanreiContainerDecoration decoration = containerDecoration(tester);
  final Border? border = decoration.border;
  if (border == null || border.top.strokeAlign == BorderSide.strokeAlignOutside) {
    return const Color(0x00000000); // none, or only an elevation ring
  }
  return border.top.color;
}

Size chipSize(WidgetTester tester) => tester.getSize(chipContainer);

TextStyle styleOf(WidgetTester tester, String text) =>
    DefaultTextStyle.of(tester.element(find.text(text))).style;

Color labelColor(WidgetTester tester, [String text = calendar]) {
  final RichText rich = tester.widget<RichText>(
    find.descendant(of: find.text(text), matching: find.byType(RichText)),
  );
  return rich.text.style!.color!;
}

Color glyphColor(WidgetTester tester, String glyph) => styleOf(tester, glyph).color!;

IconThemeData iconThemeOf(WidgetTester tester, String glyph) =>
    IconTheme.of(tester.element(find.text(glyph)));

double chipOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.ancestor(of: chipRing, matching: find.byType(Opacity)).first)
    .opacity;

bool chipRingVisible(WidgetTester tester) => tester.widget<TanreiFocusRing>(chipRing).visible;

/// The remove action's round container (the only state layer a chip has).
Finder get removeLayer => find.byType(TanreiStateLayer);

TanreiContainerDecoration removeDecoration(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find.descendant(of: removeLayer, matching: find.byType(DecoratedBox)),
            )
            .decoration
        as TanreiContainerDecoration;

Color removeContainerColor(WidgetTester tester) =>
    removeDecoration(tester).color ?? const Color(0x00000000);

/// The remove action's focus ring.
Finder get removeRing =>
    find.ancestor(of: removeLayer, matching: find.byType(TanreiFocusRing)).first;

/// The remove action's hit area (its gesture detector's box).
Rect removeHitArea(WidgetTester tester) =>
    tester.getRect(find.ancestor(of: removeLayer, matching: find.byType(GestureDetector)).first);

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
  expect(drawn.boxShadow ?? const <BoxShadow>[], expected.shadows, reason: reason);
  if (expected.ring != null) {
    expect(drawn.border, anyOf(expected.ring, isNotNull), reason: reason);
  }
}

Future<TestGesture> hoverAt(WidgetTester tester, Offset at) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(at);
  await tester.pumpAndSettle();
  return mouse;
}

/// A point on the chip away from its remove action: the label's center.
Offset chipPoint(WidgetTester tester, [String text = calendar]) =>
    tester.getCenter(find.text(text));

Future<TestGesture> hover(WidgetTester tester, [String text = calendar]) =>
    hoverAt(tester, chipPoint(tester, text));

/// Collects the ignored values reported, and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// The chip of a spec fixture.
Widget fixtureChip(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final String? content = fixture['content'] as String?;
  final TanreiChipVariant variant = TanreiChipVariant(props['variant'] as String? ?? 'outlined');
  final TanreiChipSize size = TanreiChipSize(props['size'] as String? ?? 'medium');
  final bool isEnabled = props['disabled'] != true;
  final String label = props['label'] as String? ?? '';
  return switch (props['kind'] as String? ?? 'action') {
    'filter' => TanreiChip.filter(
      label: label,
      selected: props['selected'] as bool? ?? false,
      onSelected: (_) {},
      icon: content == null ? null : event,
      variant: variant,
      size: size,
      isEnabled: isEnabled,
    ),
    'input' => TanreiChip.input(
      label: label,
      removeSemanticLabel: props['removeLabel'] as String? ?? '',
      onDeleted: () {},
      avatar: content == 'avatar' ? const Avatar() : null,
      variant: variant,
      size: size,
      isEnabled: isEnabled,
    ),
    _ => TanreiChip(
      label: label,
      onPressed: () {},
      icon: content == null ? null : event,
      variant: variant,
      size: size,
      isEnabled: isEnabled,
    ),
  };
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
      testWidgets('CHP-1: a ${kind.name} tap emits onPressed exactly once', (
        WidgetTester tester,
      ) async {
        int pressed = 0;
        await tester.pumpWidget(tanreiTestApp(action(onPressed: () => pressed++)));
        await tester.tap(chipFinder, kind: kind);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('CHP-1: $name emits onPressed exactly once', (WidgetTester tester) async {
        int pressed = 0;
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(action(onPressed: () => pressed++, focusNode: focusNode)),
        );
        focusNode.requestFocus();
        await tester.pump();
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(pressed, 1);
      });
    }

    testWidgets('CHP-1: the semantic tap action emits onPressed exactly once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      int pressed = 0;
      await tester.pumpWidget(tanreiTestApp(action(onPressed: () => pressed++)));
      tester.semantics.tap(find.semantics.byLabel(calendar));
      await tester.pump();
      expect(pressed, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('CHP-2: a disabled chip of every kind emits nothing, is not focusable — nor its '
        'remove action — and is exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> events = <String>[];
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      for (final Widget chip in <Widget>[
        TanreiChip(
          label: calendar,
          isEnabled: false,
          focusNode: focusNode,
          onPressed: () => events.add('click'),
        ),
        TanreiChip.filter(
          label: vegetarian,
          selected: false,
          isEnabled: false,
          focusNode: focusNode,
          onPressed: () => events.add('click'),
          onSelected: (bool _) => events.add('change'),
        ),
        TanreiChip.input(
          label: ada,
          removeSemanticLabel: removeAda,
          isEnabled: false,
          focusNode: focusNode,
          onPressed: () => events.add('click'),
          onDeleted: () => events.add('remove'),
        ),
      ]) {
        await tester.pumpWidget(tanreiTestApp(chip));
        await tester.tap(chipFinder, warnIfMissed: false);
        if (removeLayer.evaluate().isNotEmpty) {
          await tester.tap(removeLayer, warnIfMissed: false);
        }
        focusNode.requestFocus();
        await tester.pump();
        expect(focusNode.hasFocus, isFalse);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
        await tester.pump();
        expect(focusNode.hasFocus, isFalse);
        final SemanticsData data = tester
            .getSemantics(
              find.descendant(of: chipFinder, matching: find.byType(TanreiTapTarget)).first,
            )
            .getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
        expect(data.hasFlag(SemanticsFlag.isFocusable), isFalse);
        expect(data.hasAction(SemanticsAction.tap), isFalse);
      }
      // The remove action is disabled too.
      final SemanticsData remove = find.semantics
          .byLabel(removeAda)
          .evaluate()
          .single
          .getSemanticsData();
      expect(remove.hasFlag(SemanticsFlag.isEnabled), isFalse);
      expect(remove.hasAction(SemanticsAction.tap), isFalse);
      expect(events, isEmpty);
      handle.dispose();
    });

    for (final TanreiChipVariant variant in TanreiChipVariant.core) {
      for (final bool selected in <bool>[false, true]) {
        testWidgets('CHP-6: a disabled ${variant.name} ${selected ? 'selected ' : ''}filter chip '
            'draws container, outline, label, icon, elevation and opacity from the disabled '
            'tokens of its variant and selection', (WidgetTester tester) async {
          await tester.pumpWidget(
            tanreiTestApp(
              filter(variant: variant, selected: selected, isEnabled: false, icon: event),
            ),
          );
          final TanreiChipVariantStateTokens disabled = chipTokens.variants[variant].disabled;
          expect(
            containerColor(tester),
            lightTheme.paint(selected ? disabled.selectedContainerColor : disabled.containerColor),
          );
          expect(
            outlineColor(tester),
            lightTheme.paint(selected ? disabled.selectedOutlineColor : disabled.outlineColor),
          );
          expect(
            labelColor(tester, vegetarian),
            lightTheme.paint(selected ? disabled.selectedLabelColor : disabled.labelColor),
          );
          expect(
            glyphColor(tester, selected ? checkGlyph : eventGlyph),
            lightTheme.paint(selected ? disabled.selectedIconColor : disabled.iconColor),
          );
          expect(containerDecoration(tester).boxShadow, isNull);
          expect(chipOpacity(tester), chipTokens.disabled.opacity);
        });
      }
    }

    testWidgets('CHP-6: the default values — an outlined chip stays transparent and its border '
        'fades, a selected chip grows no border, the remove glyph reads as disabled content and '
        'its round container stays invisible, and an avatar fades to the disabled content '
        'opacity', (WidgetTester tester) async {
      final Color fadedEdge = light.onSurface.withValues(
        alpha: system.state.disabledContainerOpacity,
      );
      await tester.pumpWidget(tanreiTestApp(action(isEnabled: false)));
      expect(containerDecoration(tester).color, isNull);
      expect(outlineColor(tester), isSameColorAs(fadedEdge));
      expect(labelColor(tester).a, closeTo(system.state.disabledContentOpacity, 1e-6));

      await tester.pumpWidget(
        tanreiTestApp(filter(key: UniqueKey(), selected: true, isEnabled: false)),
      );
      expect(outlineColor(tester), const Color(0x00000000));
      expect(containerColor(tester), isSameColorAs(fadedEdge));

      await tester.pumpWidget(
        tanreiTestApp(input(key: UniqueKey(), isEnabled: false, avatar: const Avatar())),
      );
      expect(removeContainerColor(tester), const Color(0x00000000));
      expect(glyphColor(tester, closeGlyph).a, closeTo(system.state.disabledContentOpacity, 1e-6));
      final Opacity avatarFade = tester.widget<Opacity>(
        find.ancestor(of: find.byType(Avatar), matching: find.byType(Opacity)).first,
      );
      expect(avatarFade.opacity, system.state.disabledContentOpacity);
    });
  });

  group('interaction states', () {
    testWidgets('CHP-3: container, outline, label, icon, elevation and opacity come from the '
        'tokens of the highest-precedence state, pressed > focused > hovered', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiChipVariantTokens elevated = chipTokens.variants.elevated;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(action(variant: TanreiChipVariant.elevated, focusNode: focusNode)),
      );
      void expectDrawnFrom(TanreiChipVariantStateTokens tokens, TanreiChipStateTokens? state) {
        expect(containerColor(tester), lightTheme.paint(tokens.containerColor));
        expect(labelColor(tester), lightTheme.paint(tokens.labelColor));
        expect(glyphColor(tester, eventGlyph), lightTheme.paint(tokens.iconColor));
        expectElevation(tester, tokens.containerElevation);
        expect(chipOpacity(tester), state?.opacity ?? 1);
      }

      expectDrawnFrom(elevated.enabled, null);
      expect(elevated.enabled.containerElevation, system.elevation.level2);
      final TestGesture mouse = await hover(tester);
      expectDrawnFrom(elevated.hovered, chipTokens.hovered);
      expect(elevated.hovered.containerElevation, system.elevation.level3);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.focused, chipTokens.focused);
      await mouse.down(chipPoint(tester));
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.pressed, chipTokens.pressed);
      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expectDrawnFrom(elevated.enabled, null);
    });

    testWidgets('CHP-3: the outlined chip draws the state mix over nothing, and focus gained by '
        'pointer or touch does not select the focused state', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(action()));
      expect(containerDecoration(tester).color, isNull);
      await hover(tester);
      expect(
        containerColor(tester),
        isSameColorAs(light.onSurface.withValues(alpha: system.state.hoverStateLayerOpacity)),
      );

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(containerDecoration(tester).color, isNull);
    });

    testWidgets('CHP-3: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered is visible', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiChipVariantTokens elevated = acmeSystem.chip.variants.elevated;
      final Color hovered = theme.paint(elevated.hovered.containerColor);
      final Color focused = theme.paint(elevated.focused.containerColor);
      final Color pressed = theme.paint(elevated.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          action(variant: TanreiChipVariant.elevated, focusNode: focusNode),
          theme: theme,
        ),
      );
      final TestGesture mouse = await hover(tester);
      expect(containerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(containerColor(tester), focused);
      await mouse.down(chipPoint(tester));
      await tester.pump();
      expect(containerColor(tester), pressed);
      await mouse.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 200));
    });
  });

  group('focus ring', () {
    testWidgets('CHP-4: keyboard focus shows the focus ring at once, around the chip; pointer '
        'focus does not', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(action()));
      expect(chipRingVisible(tester), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(chipRingVisible(tester), isTrue);
      final double offset = system.measure.focusOffset + system.measure.focusOuterWidth / 2;
      final RRect ring = BorderRadius.circular(
        chipTokens.containerShape,
      ).toRRect(Offset.zero & chipSize(tester)).inflate(offset);
      expect(
        chipRing,
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawRRect &&
              arguments[0] == ring &&
              (arguments[1] as Paint).style == PaintingStyle.stroke,
        ),
      );

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(chipRingVisible(tester), isFalse);
    });
  });

  group('target size', () {
    testWidgets('CHP-5: the small chip extends its hit area to sys.target.touch without changing '
        'its visual size', (WidgetTester tester) async {
      int pressed = 0;
      await tester.pumpWidget(
        tanreiTestApp(action(size: TanreiChipSize.small, onPressed: () => pressed++)),
      );
      expect(chipSize(tester).height, chipTokens.sizes.small.containerHeight);
      final Rect target = tester.getRect(
        find.descendant(of: chipFinder, matching: find.byType(TanreiTapTarget)),
      );
      expect(target.height, system.measure.targetTouch);
      final Rect visual = tester.getRect(chipContainer);
      final Offset above = Offset(visual.center.dx, target.top + 1);
      expect(visual.contains(above), isFalse);
      await tester.tapAt(above);
      expect(pressed, 1);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });
  });

  group('open size and variant keys', () {
    testWidgets('CHP-7: a size and a variant the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      final FramePixels unknown = await framePixels(
        tester,
        system: system,
        surface: labelledGoldenSurface,
        child: input(size: const TanreiChipSize('3x'), variant: const TanreiChipVariant('danger')),
      );
      expect(tester.takeException(), isNull);
      expect(reports, contains('chip size "3x" -> medium'));
      expect(reports, contains('chip variant "danger" -> outlined'));
      reports.clear();
      final FramePixels defaults = await framePixels(
        tester,
        system: system,
        surface: labelledGoldenSurface,
        child: input(),
      );
      expect(reports, isEmpty);
      expect(unknown, defaults, reason: 'pixel for pixel the default chip');
    });

    testWidgets('CHP-7: a size and a variant a design system added with copyWith drive the chip', (
      WidgetTester tester,
    ) async {
      const TanreiChipSize large = TanreiChipSize('large');
      const TanreiChipVariant tinted = TanreiChipVariant('tinted');
      final TanreiSystem product = system.copyWith(
        chip: chipTokens.copyWith(
          sizes: chipTokens.sizes.copyWith(
            extra: <TanreiChipSize, TanreiChipSizeTokens>{
              large: chipTokens.sizes.medium.copyWith(containerHeight: 40, iconSize: 20),
            },
          ),
          variants: chipTokens.variants.copyWith(
            extra: <TanreiChipVariant, TanreiChipVariantTokens>{
              tinted: chipTokens.variants.elevated.copyWith(
                enabled: chipTokens.variants.elevated.enabled.copyWith(
                  containerColor: const TanreiPaint.role(TanreiColorRole.primaryContainer),
                ),
              ),
            },
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          action(size: large, variant: tinted),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(chipSize(tester).height, 40);
      expect(containerColor(tester), light.primaryContainer);
      expect(tester.getSize(find.text(eventGlyph)), const Size.square(20));
    });
  });

  group('press hold (CHP-8)', () {
    final Duration hold = tanreiDuration(system.motion.duration.pressHold);
    final Color pressedFill = lightTheme.paint(chipTokens.variants.elevated.pressed.containerColor);
    const Duration tick = Duration(milliseconds: 1);

    testWidgets('CHP-8: a tap shows the pressed state without delay and keeps it for the '
        'press-hold duration', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(action(variant: TanreiChipVariant.elevated)));
      await tester.tap(chipFinder);
      await tester.pump();
      expect(containerColor(tester), pressedFill);
      await tester.pump(hold - tick);
      expect(containerColor(tester), pressedFill);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(containerColor(tester), isNot(pressedFill));
    });

    for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
      LogicalKeyboardKey.enter,
      LogicalKeyboardKey.space,
    ]) {
      final String name = key == LogicalKeyboardKey.enter ? 'Enter' : 'Space';
      testWidgets('CHP-8: $name shows the pressed state at once and for the press-hold duration', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tester.pumpWidget(
          tanreiTestApp(action(variant: TanreiChipVariant.elevated, autofocus: true)),
        );
        await tester.pumpAndSettle();
        final TanreiChipVariantTokens elevated = chipTokens.variants.elevated;
        final Color focusedFill = containerColor(tester);
        expect(focusedFill, lightTheme.paint(elevated.focused.containerColor));
        await tester.sendKeyEvent(key);
        await tester.pump();
        expect(containerColor(tester), pressedFill);
        // The pressed state shows its own elevation and opacity at once too.
        expectElevation(tester, elevated.pressed.containerElevation);
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

    testWidgets('CHP-9: overlay (the default system) applies the pressed tokens to the whole '
        'container at once, with no ripple', (WidgetTester tester) async {
      await tester.pumpWidget(app(system, action(variant: TanreiChipVariant.elevated)));
      final TestGesture touch = await tester.startGesture(chipPoint(tester));
      await tester.pump();
      expect(
        containerColor(tester),
        lightTheme.paint(chipTokens.variants.elevated.pressed.containerColor),
      );
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('CHP-9: ripple (m3-like) grows the pressed container from the point of contact '
        'over comp.chip.motion.feedback-duration, from the center for the keyboard, whole where '
        'motion is reduced', (WidgetTester tester) async {
      final TanreiChipTokens tokens = m3LikeSystem.chip;
      await tester.pumpWidget(app(m3LikeSystem, action()));
      final Rect box = tester.getRect(chipContainer);
      const Offset contact = Offset(40, 9);
      final TestGesture touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, contact);
      await tester.pump(tanreiDuration(tokens.motionFeedbackDuration) ~/ 2);
      expect(
        containerDecoration(tester).ripple!.progress,
        moreOrLessEquals(tokens.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).ripple, isNull);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(app(m3LikeSystem, action(key: UniqueKey(), autofocus: true)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, isNull);
      await tester.pumpAndSettle(const Duration(milliseconds: 100));

      await tester.pumpWidget(app(m3LikeSystem, action(key: UniqueKey()), disableAnimations: true));
      final TestGesture reduced = await tester.startGesture(chipPoint(tester));
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
        'CHP-9: under ${feedback.name} '
        '${feedback == TanreiPressedFeedback.none ? 'every part stays with the state under the press' : 'only the container color stays with the state under the press; outline, label, icon, elevation and opacity are the pressed tokens\''}',
        (WidgetTester tester) async {
          final TanreiChipVariantTokens outlined = chipTokens.variants.outlined;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            chip: chipTokens.copyWith(
              pressed: chipTokens.pressed.copyWith(opacity: 0.5),
              variants: chipTokens.variants.copyWith(
                outlined: outlined.copyWith(
                  pressed: outlined.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    labelColor: const TanreiPaint.literal(Color(0xFF445566)),
                    iconColor: const TanreiPaint.literal(Color(0xFF556677)),
                    outlineColor: const TanreiPaint.literal(Color(0xFF778899)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(app(of, action()));
          final TestGesture mouse = await hover(tester);
          final TanreiContainerDecoration hovered = containerDecoration(tester);
          final Color hoveredLabel = labelColor(tester);
          await mouse.down(chipPoint(tester));
          await tester.pump();
          final TanreiContainerDecoration drawn = containerDecoration(tester);
          expect(drawn.color, hovered.color);
          if (feedback == TanreiPressedFeedback.none) {
            expect(drawn, hovered);
            expect(labelColor(tester), hoveredLabel);
            expect(chipOpacity(tester), 1);
          } else {
            expect(labelColor(tester), const Color(0xFF445566));
            expect(glyphColor(tester, eventGlyph), const Color(0xFF556677));
            expect(outlineColor(tester), const Color(0xFF778899));
            expect(chipOpacity(tester), 0.5);
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

    testWidgets('CHP-10: the corner smoothing of the system eases the container, and the focus '
        'style draws a ring or a glow', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        app(system, action(key: UniqueKey(), variant: TanreiChipVariant.elevated)),
      );
      expect(containerDecoration(tester).shape.smoothing, 0);
      expect(chipContainer, paints..rrect());
      final TanreiSystem smoothed = system.copyWith(
        shape: system.shape.copyWith(cornerSmoothing: cupertinoSystem.shape.cornerSmoothing),
      );
      await tester.pumpWidget(
        app(smoothed, action(key: UniqueKey(), variant: TanreiChipVariant.elevated)),
      );
      expect(containerDecoration(tester).shape.smoothing, 0.6);
      expect(chipContainer, paints..path());
      expect(chipContainer, isNot(paints..rrect()));

      await tester.pumpWidget(app(acmeSystem, action(key: UniqueKey(), autofocus: true)));
      await tester.pump();
      expect(
        chipRing,
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawRRect &&
              (arguments[1] as Paint).maskFilter ==
                  MaskFilter.blur(BlurStyle.normal, acmeSystem.measure.focusOuterWidth / 2),
        ),
      );
    });
  });

  group('filter', () {
    testWidgets('CHP-11: activating a filter chip emits change with the opposite of selected and '
        'click, by pointer, keyboard and assistive technology, and exposes selected', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final ValueNotifier<bool> value = ValueNotifier<bool>(false);
      addTearDown(value.dispose);
      final List<String> events = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          ValueListenableBuilder<bool>(
            valueListenable: value,
            builder: (BuildContext context, bool selected, Widget? _) => filter(
              selected: selected,
              onPressed: () => events.add('click'),
              onSelected: (bool next) {
                events.add('change $next');
                value.value = next;
              },
            ),
          ),
        ),
      );
      SemanticsData data() => tester
          .getSemantics(find.descendant(of: chipFinder, matching: find.byType(TanreiTapTarget)))
          .getSemanticsData();
      expect(data().hasFlag(SemanticsFlag.hasSelectedState), isTrue);
      expect(data().hasFlag(SemanticsFlag.isSelected), isFalse);

      await tester.tap(chipFinder);
      await tester.pumpAndSettle();
      expect(events, <String>['click', 'change true']);
      expect(data().hasFlag(SemanticsFlag.isSelected), isTrue);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(events, <String>['click', 'change true', 'click', 'change false']);

      tester.semantics.tap(find.semantics.byLabel(vegetarian));
      await tester.pumpAndSettle();
      expect(events.last, 'change true');
      // A toggle button, never a switch or a checkbox.
      expect(data().hasFlag(SemanticsFlag.hasToggledState), isFalse);
      expect(data().hasFlag(SemanticsFlag.hasCheckedState), isFalse);
      handle.dispose();
    });

    testWidgets('CHP-11: a filter chip emits click and then change, in that order, as a native '
        'checkbox does — by pointer, keyboard and assistive technology alike', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> events = <String>[];
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          filter(
            focusNode: focusNode,
            onPressed: () => events.add('click'),
            onSelected: (bool next) => events.add('change $next'),
          ),
        ),
      );
      await tester.tap(chipFinder);
      await tester.pumpAndSettle();
      expect(events, <String>['click', 'change true']);
      focusNode.requestFocus();
      await tester.pump();
      for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
        LogicalKeyboardKey.enter,
        LogicalKeyboardKey.space,
      ]) {
        events.clear();
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(events, <String>['click', 'change true'], reason: key.keyLabel);
      }
      events.clear();
      tester.semantics.tap(find.semantics.byLabel(vegetarian));
      await tester.pumpAndSettle();
      expect(events, <String>['click', 'change true']);
      handle.dispose();
    });

    testWidgets('CHP-11: an action or input chip exposes no selected state', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final Widget chip in <Widget>[action(), input()]) {
        await tester.pumpWidget(tanreiTestApp(chip));
        final SemanticsData data = tester
            .getSemantics(
              find.descendant(of: chipFinder, matching: find.byType(TanreiTapTarget)).first,
            )
            .getSemanticsData();
        expect(data.hasFlag(SemanticsFlag.hasSelectedState), isFalse);
        expect(tester.widget<TanreiChip>(chipFinder).selected, isFalse);
      }
      handle.dispose();
    });

    for (final TanreiChipVariant variant in TanreiChipVariant.core) {
      testWidgets('CHP-12: ${variant.name} draws its own parts when off and its selected parts '
          'when on (dark scheme)', (WidgetTester tester) async {
        const TanreiThemeData theme = TanreiThemeData.dark;
        final TanreiChipVariantStateTokens rest = chipTokens.variants[variant].enabled;
        for (final bool selected in <bool>[false, true]) {
          await tester.pumpWidget(
            tanreiTestApp(
              filter(key: UniqueKey(), variant: variant, selected: selected),
              theme: theme,
            ),
          );
          expect(
            containerColor(tester),
            theme.paint(selected ? rest.selectedContainerColor : rest.containerColor),
          );
          expect(
            outlineColor(tester),
            theme.paint(selected ? rest.selectedOutlineColor : rest.outlineColor),
          );
          expect(
            labelColor(tester, vegetarian),
            theme.paint(selected ? rest.selectedLabelColor : rest.labelColor),
          );
        }
        // The default system: off and on differ in fill or edge.
        expect(theme.paint(rest.selectedContainerColor), isNot(theme.paint(rest.containerColor)));
      });
    }

    testWidgets('CHP-13: a selected filter chip shows a check in the leading position, in place '
        'of its icon; an unselected one none', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(filter(key: UniqueKey())));
      expect(find.text(checkGlyph), findsNothing);
      await tester.pumpWidget(tanreiTestApp(filter(key: UniqueKey(), selected: true)));
      expect(find.text(checkGlyph), findsOneWidget);
      expect(
        tester.getRect(find.text(checkGlyph)).right,
        lessThan(tester.getRect(find.text(vegetarian)).left),
      );
      // With an icon: the check takes its place; the width does not change.
      await tester.pumpWidget(tanreiTestApp(filter(key: UniqueKey(), icon: event)));
      final double width = chipSize(tester).width;
      final Rect iconRect = tester.getRect(find.text(eventGlyph));
      await tester.pumpWidget(tanreiTestApp(filter(key: UniqueKey(), icon: event, selected: true)));
      expect(find.text(eventGlyph), findsNothing);
      expect(tester.getRect(find.text(checkGlyph)), iconRect);
      expect(chipSize(tester).width, width);
    });

    testWidgets('CHP-13: when selected changes the check shows or hides, the width changes with '
        'it, and the colors change, over the selection motion; at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiChipSizeTokens size = chipTokens.sizes.medium;
      final Key key = UniqueKey();
      Widget build(bool selected, {bool reduced = false}) => tanreiTestApp(
        filter(key: key, selected: selected),
        disableAnimations: reduced,
      );
      await tester.pumpWidget(build(false));
      final double off = chipSize(tester).width;
      final double label = tester.getSize(find.text(vegetarian)).width;
      expect(off, moreOrLessEquals(2 * size.containerPaddingInline + label));
      final double on =
          size.containerPaddingInlineWithIcon +
          size.iconSize +
          size.containerGap +
          label +
          size.containerPaddingInline;
      final Color offFill = containerColor(tester);

      await tester.pumpWidget(build(true));
      final Duration duration = tanreiDuration(chipTokens.motionSelectionDuration);
      await tester.pump(duration ~/ 2);
      final double t = chipTokens.motionSelectionEasing.toCurve().transform(0.5);
      expect(chipSize(tester).width, moreOrLessEquals(off + t * (on - off), epsilon: 0.01));
      expect(containerColor(tester), isNot(offFill));
      expect(
        containerColor(tester),
        isNot(lightTheme.paint(chipTokens.variants.outlined.enabled.selectedContainerColor)),
      );
      await tester.pumpAndSettle();
      expect(chipSize(tester).width, moreOrLessEquals(on));
      expect(
        containerColor(tester),
        lightTheme.paint(chipTokens.variants.outlined.enabled.selectedContainerColor),
      );

      await tester.pumpWidget(build(false, reduced: true));
      await tester.pump();
      expect(chipSize(tester).width, moreOrLessEquals(off));
      expect(find.text(checkGlyph), findsNothing);
    });
  });

  group('glyphs', () {
    testWidgets('CHP-14: the icon, the check and the remove glyph are drawn at the icon size of '
        'the size, in the icon color of the look (the remove glyph in the remove color), with the '
        'icon style of the selection', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiIconStyle icons = acmeSystem.icon;
      final TanreiChipTokens tokens = acmeSystem.chip;
      final TanreiChipVariantStateTokens rest = tokens.variants.outlined.enabled;
      for (final TanreiChipSize key in TanreiChipSize.core) {
        final double side = tokens.sizes[key].iconSize;
        await tester.pumpWidget(
          tanreiTestApp(
            action(key: UniqueKey(), size: key),
            theme: theme,
          ),
        );
        expect(tester.getSize(find.text(eventGlyph)), Size.square(side));
        expect(glyphColor(tester, eventGlyph), theme.paint(rest.iconColor));
        expect(styleOf(tester, eventGlyph).fontFamily, icons.family(selected: false));
        expect(iconThemeOf(tester, eventGlyph).weight, icons.weight);

        await tester.pumpWidget(
          tanreiTestApp(
            filter(key: UniqueKey(), size: key, selected: true),
            theme: theme,
          ),
        );
        expect(tester.getSize(find.text(checkGlyph)), Size.square(side));
        expect(glyphColor(tester, checkGlyph), theme.paint(rest.selectedIconColor));
        expect(styleOf(tester, checkGlyph).fontFamily, icons.family(selected: true));
        expect(iconThemeOf(tester, checkGlyph).fill, icons.fill(selected: true));

        await tester.pumpWidget(
          tanreiTestApp(
            input(key: UniqueKey(), size: key),
            theme: theme,
          ),
        );
        expect(tester.getSize(find.text(closeGlyph)), Size.square(side));
        expect(glyphColor(tester, closeGlyph), theme.paint(rest.removeIconColor));
        expect(styleOf(tester, closeGlyph).fontFamily, icons.family(selected: false));
      }
      // An optical size clamped to the system's range: 16 is below Material Symbols' 20.
      await tester.pumpWidget(tanreiTestApp(action()));
      expect(iconThemeOf(tester, eventGlyph).opticalSize, system.icon.opticalSizeMin);
    });
  });

  group('avatar', () {
    testWidgets('CHP-15: an input chip draws its avatar in the leading position at the avatar size '
        'of its size, clipped to comp.chip.avatar.shape and hidden from assistive technology', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final TanreiChipSizeTokens size = chipTokens.sizes.medium;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiChip.input(
            label: ada,
            removeSemanticLabel: removeAda,
            avatar: Semantics(label: 'portrait', child: const Avatar()),
            icon: event,
          ),
        ),
      );
      expect(tester.getSize(find.byType(Avatar)), Size.square(size.avatarSize));
      expect(find.text(eventGlyph), findsNothing, reason: 'the avatar replaces the icon');
      final Rect box = tester.getRect(chipContainer);
      expect(
        tester.getRect(find.byType(Avatar)).left - box.left,
        moreOrLessEquals(size.containerPaddingInlineWithAvatar),
      );
      final ClipPath clip = tester.widget<ClipPath>(
        find.ancestor(of: find.byType(Avatar), matching: find.byType(ClipPath)).first,
      );
      final Path path = clip.clipper!.getClip(Size.square(size.avatarSize));
      // A full corner: the circle — its corner points are outside.
      expect(chipTokens.avatarShape, system.shape.full);
      expect(path.contains(const Offset(1, 1)), isFalse);
      expect(path.contains(Offset(size.avatarSize / 2, size.avatarSize / 2)), isTrue);
      expect(find.semantics.byLabel('portrait'), findsNothing);
      handle.dispose();
    });

    testWidgets('CHP-15: a chip that is not an input chip ignores an avatar and debug builds '
        'report it once', (WidgetTester tester) async {
      final List<String> reports = collectIgnoredValues();
      await tester.pumpWidget(tanreiTestApp(action(avatar: const Avatar())));
      expect(find.byType(Avatar), findsNothing);
      expect(find.text(eventGlyph), findsOneWidget);
      expect(reports, <String>['chip avatar']);
      await tester.pumpWidget(
        tanreiTestApp(action(avatar: const Avatar(), variant: TanreiChipVariant.elevated)),
      );
      expect(reports, hasLength(1));
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiChip.filter(
            key: UniqueKey(),
            label: vegetarian,
            selected: false,
            avatar: const Avatar(),
          ),
        ),
      );
      expect(reports, hasLength(2));
      expect(find.byType(Avatar), findsNothing);
    });
  });

  group('layout', () {
    testWidgets('CHP-16: each end is padded for what it holds — label, glyph or avatar — the parts '
        'are a gap apart, and the chip is at least its height with the outline inside its edge', (
      WidgetTester tester,
    ) async {
      for (final TanreiChipSize key in TanreiChipSize.core) {
        final TanreiChipSizeTokens size = chipTokens.sizes[key];
        await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), size: key, icon: null)));
        Rect box = tester.getRect(chipContainer);
        Rect label = tester.getRect(find.text(calendar));
        expect(chipSize(tester).height, size.containerHeight, reason: key.name);
        expect(label.left - box.left, moreOrLessEquals(size.containerPaddingInline));
        expect(box.right - label.right, moreOrLessEquals(size.containerPaddingInline));

        await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), size: key)));
        box = tester.getRect(chipContainer);
        label = tester.getRect(find.text(calendar));
        final Rect icon = tester.getRect(find.text(eventGlyph));
        expect(icon.left - box.left, moreOrLessEquals(size.containerPaddingInlineWithIcon));
        expect(label.left - icon.right, moreOrLessEquals(size.containerGap));
        expect(icon.center.dy, moreOrLessEquals(box.center.dy));

        await tester.pumpWidget(
          tanreiTestApp(input(key: UniqueKey(), size: key, avatar: const Avatar())),
        );
        box = tester.getRect(chipContainer);
        label = tester.getRect(find.text(ada));
        final Rect avatar = tester.getRect(find.byType(Avatar));
        final Rect close = tester.getRect(find.text(closeGlyph));
        expect(avatar.left - box.left, moreOrLessEquals(size.containerPaddingInlineWithAvatar));
        expect(label.left - avatar.right, moreOrLessEquals(size.containerGap));
        expect(close.left - label.right, moreOrLessEquals(size.containerGap));
        expect(box.right - close.right, moreOrLessEquals(size.containerPaddingInlineWithIcon));
      }
      await tester.pumpWidget(tanreiTestApp(action()));
      final Border border = containerDecoration(tester).border!;
      expect(border.top.width, chipTokens.outlineWidth);
      expect(border.top.strokeAlign, BorderSide.strokeAlignInside);
      expect(containerDecoration(tester).shape.radius, chipTokens.containerShape);
    });

    testWidgets('CHP-17: the label stays on one line in the text style of its size, truncated with '
        'an ellipsis only when the chip is given less width; it grows in height with larger text; '
        'the full label stays the name', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiChipSize key in TanreiChipSize.core) {
        await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), size: key)));
        final TextStyle expected = lightTheme.textStyle(chipTokens.sizes[key].labelTypescale);
        expect(styleOf(tester, calendar).fontSize, expected.fontSize);
        expect(styleOf(tester, calendar).height, expected.height);
      }
      await tester.pumpWidget(tanreiTestApp(action()));
      RenderParagraph paragraph = tester.renderObject(find.text(calendar));
      expect(paragraph.didExceedMaxLines, isFalse);
      expect(paragraph.maxLines, 1);

      await tester.pumpWidget(tanreiTestApp(SizedBox(width: 120, child: Center(child: action()))));
      paragraph = tester.renderObject(find.text(calendar));
      expect(paragraph.overflow, TextOverflow.ellipsis);
      expect(
        paragraph.getMaxIntrinsicWidth(double.infinity),
        greaterThan(paragraph.size.width),
        reason: 'the label needs more width than it was given',
      );
      expect(chipSize(tester).width, lessThanOrEqualTo(120));
      expect(chipSize(tester).height, chipTokens.sizes.medium.containerHeight);
      expect(find.semantics.byLabel(calendar), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: action(),
          ),
        ),
      );
      expect(chipSize(tester).height, greaterThan(chipTokens.sizes.medium.containerHeight));
      expect(tester.getSize(find.text(eventGlyph)).height, chipTokens.sizes.medium.iconSize);
      handle.dispose();
    });
  });

  group('input', () {
    testWidgets('CHP-18: the remove action is a round container of the remove size behind a close '
        'glyph at the inline end, and a separate button named by removeSemanticLabel', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final TanreiChipSizeTokens size = chipTokens.sizes.medium;
      await tester.pumpWidget(tanreiTestApp(input()));
      expect(tester.getSize(removeLayer), Size.square(size.removeContainerSize));
      expect(removeDecoration(tester).shape.radius, chipTokens.removeContainerShape);
      expect(tester.getCenter(removeLayer), tester.getCenter(find.text(closeGlyph)));
      expect(
        find.semantics.byLabel(removeAda).evaluate().single,
        matchesSemantics(
          label: removeAda,
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      expect(find.semantics.byLabel(ada), findsOneWidget);
      handle.dispose();
    });

    testWidgets('CHP-18: activating the remove action by pointer, Enter or Space emits remove '
        'exactly once each, and never click; Tab reaches it after the chip', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> events = <String>[];
      final FocusNode chipFocus = FocusNode();
      addTearDown(chipFocus.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          input(
            focusNode: chipFocus,
            onPressed: () => events.add('click'),
            onDeleted: () => events.add('remove'),
          ),
        ),
      );
      await tester.tap(removeLayer);
      await tester.pumpAndSettle();
      expect(events, <String>['remove']);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(chipFocus.hasPrimaryFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(chipFocus.hasFocus, isFalse);
      expect(tester.widget<TanreiFocusRing>(removeRing).visible, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(events, <String>['remove', 'remove', 'remove']);

      // A tap on the label is the chip's.
      await tester.tap(find.text(ada));
      await tester.pumpAndSettle();
      expect(events.last, 'click');
    });

    testWidgets('CHP-19: Backspace or Delete on the focused input chip emits remove once; not '
        'while its remove action has focus, and not on other kinds', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> events = <String>[];
      final FocusNode chipFocus = FocusNode();
      addTearDown(chipFocus.dispose);
      await tester.pumpWidget(
        tanreiTestApp(input(focusNode: chipFocus, onDeleted: () => events.add('remove'))),
      );
      chipFocus.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
      await tester.sendKeyEvent(LogicalKeyboardKey.delete);
      expect(events, <String>['remove', 'remove']);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
      expect(events, hasLength(2));

      int pressed = 0;
      final FocusNode other = FocusNode();
      addTearDown(other.dispose);
      await tester.pumpWidget(tanreiTestApp(action(focusNode: other, onPressed: () => pressed++)));
      other.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
      expect(pressed, 0);
      await tester.pumpAndSettle();
    });

    testWidgets('CHP-20: hovering, focusing and pressing the remove action draws its round '
        'container from the remove parts of its own state, keeps the chip at the chip\'s own '
        'state — the chip is not hovered or pressed while the pointer or the press is on the '
        'remove action — and shows the focus ring around the round container', (
      WidgetTester tester,
    ) async {
      final TanreiChipVariantTokens outlined = chipTokens.variants.outlined;
      await tester.pumpWidget(tanreiTestApp(input()));
      expect(removeContainerColor(tester), const Color(0x00000000));
      final TestGesture mouse = await hoverAt(tester, tester.getCenter(removeLayer));
      expect(removeContainerColor(tester), lightTheme.paint(outlined.hovered.removeContainerColor));
      expect(containerDecoration(tester).color, isNull, reason: 'the chip is not hovered');

      expect(outlineColor(tester), lightTheme.paint(outlined.enabled.outlineColor));
      expect(labelColor(tester, ada), lightTheme.paint(outlined.enabled.labelColor));
      // Anywhere in the remove action's hit area, beyond the chip's end too.
      await mouse.moveTo(Offset(removeHitArea(tester).right - 2, removeHitArea(tester).top + 2));
      await tester.pumpAndSettle();
      expect(removeContainerColor(tester), lightTheme.paint(outlined.hovered.removeContainerColor));
      expect(containerDecoration(tester).color, isNull, reason: 'the chip is not hovered');

      await mouse.down(tester.getCenter(removeLayer));
      await tester.pump();
      expect(removeContainerColor(tester), lightTheme.paint(outlined.pressed.removeContainerColor));
      expect(containerDecoration(tester).color, isNull, reason: 'the chip is not pressed');
      expect(chipOpacity(tester), 1);
      await mouse.up();
      await tester.pumpAndSettle();

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(chipRingVisible(tester), isFalse);
      expect(tester.widget<TanreiFocusRing>(removeRing).visible, isTrue);
      expect(removeContainerColor(tester), lightTheme.paint(outlined.focused.removeContainerColor));
      expect(containerDecoration(tester).color, isNull);
      await mouse.removePointer();
    });

    testWidgets('CHP-20: under ripple (m3-like) a press of the remove action grows within its '
        'round container, from the center when it lands outside it', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(input(), theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      final Rect round = tester.getRect(removeLayer);
      final TestGesture inside = await tester.startGesture(round.topLeft + const Offset(15, 12));
      await tester.pump();
      expect(removeDecoration(tester).ripple!.origin, const Offset(15, 12));
      expect(containerDecoration(tester).ripple, isNull, reason: 'the chip does not ripple');
      await inside.up();
      await tester.pumpAndSettle();
      final Rect area = removeHitArea(tester);
      final TestGesture outside = await tester.startGesture(Offset(area.right - 2, area.top + 2));
      await tester.pump();
      expect(removeDecoration(tester).ripple!.origin, isNull);
      await outside.up();
      await tester.pumpAndSettle();
    });

    testWidgets('CHP-21: the remove action\'s hit area is at least sys.target.touch on both axes, '
        'around its glyph, reaching toward the label no further than the gap before the glyph and '
        'outward beyond the chip as far as it needs — never over the label; the rest of the chip '
        'activates the chip', (WidgetTester tester) async {
      final List<String> events = <String>[];
      for (final TanreiChipSize key in TanreiChipSize.core) {
        events.clear();
        await tester.pumpWidget(
          tanreiTestApp(
            input(
              key: UniqueKey(),
              size: key,
              onPressed: () => events.add('click'),
              onDeleted: () => events.add('remove'),
            ),
          ),
        );
        final double target = system.measure.targetTouch;
        final Rect area = removeHitArea(tester);
        final Rect glyph = tester.getRect(find.text(closeGlyph));
        final Rect label = tester.getRect(find.text(ada));
        final Rect chip = tester.getRect(chipContainer);
        expect(area.width, greaterThanOrEqualTo(target), reason: key.name);
        expect(area.height, greaterThanOrEqualTo(target), reason: key.name);
        final double gap = chipTokens.sizes[key].containerGap;
        expect(area.center.dy, moreOrLessEquals(glyph.center.dy));
        expect(area.contains(glyph.center), isTrue);
        // Toward the label: exactly the gap before the glyph (half the target is farther in the
        // default system), so never over the label.
        expect(area.left, moreOrLessEquals(glyph.left - gap), reason: key.name);
        expect(area.left, greaterThanOrEqualTo(label.right - 0.01), reason: key.name);
        // Outward: as far as the target needs, beyond the chip's visual bounds.
        expect(area.width, moreOrLessEquals(target), reason: key.name);
        expect(area.right, greaterThan(chip.right), reason: key.name);
        expect(
          tester.getSize(find.byType(TanreiChip)).width,
          moreOrLessEquals(area.right - chip.left),
        );

        await tester.tapAt(Offset(area.right - 1, area.top + 1));
        await tester.tapAt(Offset(area.left + 1, area.bottom - 1));
        await tester.tapAt(Offset(label.right - 1, label.center.dy));
        await tester.tapAt(Offset(chip.left + 1, chip.center.dy));
        await tester.pumpAndSettle();
        expect(events, <String>['remove', 'remove', 'click', 'click'], reason: key.name);
      }
    });

    testWidgets('CHP-22: emitting remove does not remove the chip or move focus', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final FocusNode chipFocus = FocusNode();
      addTearDown(chipFocus.dispose);
      int removed = 0;
      await tester.pumpWidget(
        tanreiTestApp(input(focusNode: chipFocus, onDeleted: () => removed++)),
      );
      chipFocus.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.delete);
      await tester.pumpAndSettle();
      expect(removed, 1);
      expect(chipFinder, findsOneWidget);
      expect(chipFocus.hasPrimaryFocus, isTrue);
      await tester.tap(removeLayer);
      await tester.pumpAndSettle();
      expect(removed, 2);
      expect(chipFinder, findsOneWidget);
    });

    testWidgets('CHP-23: a chip is one tab stop, an input chip two, and a chip handles no arrow '
        'keys', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final List<String> events = <String>[];
      final FocusNode first = FocusNode();
      final FocusNode last = FocusNode();
      addTearDown(first.dispose);
      addTearDown(last.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              action(focusNode: first, onPressed: () => events.add('click')),
              input(onDeleted: () => events.add('remove'), onPressed: () => events.add('click')),
              filter(focusNode: last, onSelected: (bool _) => events.add('change')),
            ],
          ),
        ),
      );
      final List<FocusNode> stops = <FocusNode>[];
      for (int i = 0; i < 4; i++) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        stops.add(FocusManager.instance.primaryFocus!);
      }
      expect(stops.first, first);
      expect(stops.last, last);
      expect(stops.toSet(), hasLength(4), reason: 'action, input, its remove action, filter');

      first.requestFocus();
      await tester.pump();
      for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
        LogicalKeyboardKey.arrowRight,
        LogicalKeyboardKey.arrowLeft,
        LogicalKeyboardKey.arrowDown,
      ]) {
        await tester.sendKeyEvent(key);
      }
      await tester.pumpAndSettle();
      expect(events, isEmpty);
    });
  });

  group('motion', () {
    testWidgets('CHP-24: a change of state animates container color and elevation over '
        'comp.chip.motion.state-duration with its easing, and at once where motion is reduced', (
      WidgetTester tester,
    ) async {
      final TanreiChipVariantTokens elevated = chipTokens.variants.elevated;
      final TanreiResolvedElevation rest = elevationOf(elevated.enabled.containerElevation);
      final TanreiResolvedElevation raised = elevationOf(elevated.hovered.containerElevation);
      final Color restFill = lightTheme.paint(elevated.enabled.containerColor);
      final Color hoverFill = lightTheme.paint(elevated.hovered.containerColor);
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<TestGesture> hoverWith({required bool reduced}) async {
        await tester.pumpWidget(
          tanreiTestApp(
            action(key: UniqueKey(), variant: TanreiChipVariant.elevated),
            disableAnimations: reduced,
          ),
        );
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        await mouse.moveTo(chipPoint(tester));
        await tester.pump();
        return mouse;
      }

      final TestGesture mouse = await hoverWith(reduced: false);
      await tester.pump(Duration(milliseconds: chipTokens.motionStateDuration ~/ 3));
      final double progress = chipTokens.motionStateEasing.toCurve().transform(1 / 3);
      expect(containerColor(tester), isSameColorAs(tanreiLerpColor(restFill, hoverFill, progress)));
      expect(
        containerDecoration(tester).boxShadow,
        BoxShadow.lerpList(rest.shadows, raised.shadows, progress),
      );
      await tester.pump(tanreiDuration(chipTokens.motionStateDuration));
      expect(containerDecoration(tester).boxShadow, raised.shadows);
      await mouse.removePointer();

      final TestGesture reduced = await hoverWith(reduced: true);
      expect(containerColor(tester), hoverFill);
      expect(containerDecoration(tester).boxShadow, raised.shadows);
      await reduced.removePointer();
    });
  });

  group('right to left', () {
    testWidgets('CHP-25: in right-to-left the content is mirrored, the paddings follow the logical '
        'start and end, the remove action sits at the left, and a ripple grows from the point of '
        'contact', (WidgetTester tester) async {
      final TanreiChipSizeTokens size = chipTokens.sizes.medium;
      Widget rtl(Widget child, [TanreiSystem of = system]) => tanreiTestApp(
        Directionality(textDirection: TextDirection.rtl, child: child),
        theme: TanreiThemeData(system: of),
      );
      await tester.pumpWidget(rtl(input(avatar: const Avatar())));
      final Rect box = tester.getRect(chipContainer);
      final Rect avatar = tester.getRect(find.byType(Avatar));
      final Rect label = tester.getRect(find.text(ada));
      final Rect close = tester.getRect(find.text(closeGlyph));
      expect(box.right - avatar.right, moreOrLessEquals(size.containerPaddingInlineWithAvatar));
      expect(avatar.left - label.right, moreOrLessEquals(size.containerGap));
      expect(label.left - close.right, moreOrLessEquals(size.containerGap));
      expect(close.left - box.left, moreOrLessEquals(size.containerPaddingInlineWithIcon));
      final Rect area = removeHitArea(tester);
      expect(area.right, lessThanOrEqualTo(label.left + 0.01));
      expect(area.left, lessThan(box.left));
      expect(tester.getCenter(removeLayer), tester.getCenter(find.text(closeGlyph)));

      await tester.pumpWidget(rtl(action(), m3LikeSystem));
      const Offset contact = Offset(20, 10);
      final TestGesture touch = await tester.startGesture(
        tester.getRect(chipContainer).topLeft + contact,
      );
      await tester.pump();
      expect(containerDecoration(tester).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();
    });
  });

  group('accessible names', () {
    testWidgets('CHP-26: an empty label renders and is reported once; an input chip\'s empty '
        'removeSemanticLabel is reported for its remove action', (WidgetTester tester) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(action(label: '')));
      expect(chipFinder, findsOneWidget);
      expect(chipSize(tester).height, chipTokens.sizes.medium.containerHeight);
      expect(reports, <String>['chip']);
      await tester.pumpWidget(
        tanreiTestApp(action(label: '', variant: TanreiChipVariant.elevated)),
      );
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(input(key: UniqueKey(), removeSemanticLabel: ' ')));
      expect(reports, <String>['chip', 'chip remove action']);
    });

    testWidgets('CHP-26: the default reporter says which property to set', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(input(removeSemanticLabel: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('chip remove action has no accessible name'));
      expect('$reported', contains('removeSemanticLabel'));
      await tester.pumpWidget(tanreiTestApp(action(key: UniqueKey(), label: '')));
      expect('${tester.takeException()}', contains('non-empty label'));
    });
  });

  group('accessibility', () {
    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: small chips of every kind on ${theme.brightness.name}', (
        WidgetTester tester,
      ) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        for (final Widget chip in <Widget>[
          action(size: TanreiChipSize.small),
          filter(size: TanreiChipSize.small, selected: true),
          input(size: TanreiChipSize.small),
        ]) {
          await tester.pumpWidget(tanreiTestApp(chip, theme: theme));
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        }
        handle.dispose();
      });
    }

    // WCAG 1.4.3 / 1.4.11 in every scheme of the default system: the label needs 4.5:1 and the
    // icon, check and remove glyph 3:1 on their container over the surface. An imitation preset is
    // held to its original, not to these criteria, in any scheme.
    test('contrast: every enabled look of "${system.id}" in every scheme (label 4.5:1, glyphs '
        '3:1)', () {
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
        for (final TanreiChipVariant variant in TanreiChipVariant.core) {
          final TanreiChipVariantStateTokens rest = system.chip.variants[variant].enabled;
          for (final bool selected in <bool>[false, true]) {
            final Color background = Color.alphaBlend(
              theme.paint(selected ? rest.selectedContainerColor : rest.containerColor),
              theme.colors.surface,
            );
            Color on(TanreiPaint paint) => Color.alphaBlend(theme.paint(paint), background);
            final double label = contrastOf(
              on(selected ? rest.selectedLabelColor : rest.labelColor),
              background,
            );
            final double icon = contrastOf(
              on(selected ? rest.selectedIconColor : rest.iconColor),
              background,
            );
            final String look = '${scheme.key} ${variant.name}${selected ? ' selected' : ''}';
            if (label < 4.5) failures.add('$look label ${label.toStringAsFixed(2)}');
            if (icon < 3) failures.add('$look icon ${icon.toStringAsFixed(2)}');
            if (!selected && contrastOf(on(rest.removeIconColor), background) < 3) {
              failures.add('$look remove');
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('shipped presets', () {
    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": every look at rest draws the enabled tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        for (final TanreiChipVariant variant in TanreiChipVariant.core) {
          final TanreiChipVariantStateTokens rest = shipped.chip.variants[variant].enabled;
          for (final bool selected in <bool>[false, true]) {
            await tester.pumpWidget(
              tanreiTestApp(
                filter(key: UniqueKey(), variant: variant, selected: selected),
                theme: theme,
              ),
            );
            expect(
              containerColor(tester),
              theme.paint(selected ? rest.selectedContainerColor : rest.containerColor),
            );
            expect(
              labelColor(tester, vegetarian),
              theme.paint(selected ? rest.selectedLabelColor : rest.labelColor),
            );
            expect(containerDecoration(tester).shape.radius, shipped.chip.containerShape);
          }
          await tester.pumpWidget(tanreiTestApp(input(variant: variant), theme: theme));
          expect(tester.takeException(), isNull);
        }
      });
    }

    test('m3-like: an outline-variant edge, a primary icon at 18, 16 inline padding', () {
      final TanreiChipTokens tokens = m3LikeSystem.chip;
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiColors colors = m3LikeSystem.schemes.light;
      expect(theme.paint(tokens.variants.outlined.enabled.outlineColor), colors.outlineVariant);
      expect(theme.paint(tokens.variants.outlined.enabled.iconColor), colors.primary);
      expect(tokens.sizes.medium.iconSize, 18);
      expect(tokens.sizes.medium.containerPaddingInline, 16);
    });

    testWidgets('cupertino: a capsule, the selected chip on the tint, and no hover lift', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      final TanreiChipTokens tokens = cupertinoSystem.chip;
      expect(tokens.containerShape, greaterThanOrEqualTo(tokens.sizes.medium.containerHeight / 2));
      expect(
        theme.paint(tokens.variants.outlined.enabled.selectedContainerColor),
        cupertinoSystem.schemes.light.primary,
      );
      await tester.pumpWidget(
        tanreiTestApp(action(variant: TanreiChipVariant.elevated), theme: theme),
      );
      final List<BoxShadow>? before = containerDecoration(tester).boxShadow;
      final Color fill = containerColor(tester);
      await hover(tester);
      expect(containerDecoration(tester).boxShadow, before);
      expect(containerColor(tester), fill);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('chip');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'action-outlined',
        'action-elevated',
        'action-small',
        'action-no-icon',
        'action-disabled',
        'filter-unselected',
        'filter-selected',
        'filter-elevated-unselected',
        'filter-elevated-selected',
        'filter-selected-small',
        'filter-selected-disabled',
        'input',
        'input-avatar',
        'input-small',
        'input-disabled',
      ]);
      expect(fixtures.map((Map<String, dynamic> f) => f['content']).toSet(), <String?>{
        'event',
        null,
        'avatar',
      });
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: labelledGoldenSurface,
          child: fixtureChip(fixture),
          file: 'goldens/chip/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the selected filter chip shows
    // the preset's shape, selected colors and check at once.
    const String recorded = 'filter-selected';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: labelledGoldenSurface,
          child: fixtureChip(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/chip/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
