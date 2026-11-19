import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';

// The shipped presets drive `TanreiButton` through values alone: the widget has no code for any of
// them. Expectations are read from the system instance, not written as literals, wherever possible.

Matcher isSameColorAs(Color expected) => isA<Color>()
    .having((Color c) => c.a, 'a', closeTo(expected.a, 1e-6))
    .having((Color c) => c.r, 'r', closeTo(expected.r, 1e-6))
    .having((Color c) => c.g, 'g', closeTo(expected.g, 1e-6))
    .having((Color c) => c.b, 'b', closeTo(expected.b, 1e-6));

Finder get _containerBox =>
    find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first;

/// The decoration of the visual container (the first box inside the focus ring).
TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(_containerBox).decoration as TanreiContainerDecoration;

Size containerSize(WidgetTester tester) => tester.getSize(_containerBox);

/// Every decoration the button paints (the container, plus a foreground ring if there is one).
Iterable<TanreiContainerDecoration> buttonDecorations(WidgetTester tester) => tester
    .widgetList<DecoratedBox>(
      find.descendant(of: find.byType(TanreiButton), matching: find.byType(DecoratedBox)),
    )
    .map((DecoratedBox box) => box.decoration as TanreiContainerDecoration);

TextStyle labelStyle(WidgetTester tester, String label) =>
    DefaultTextStyle.of(tester.element(find.text(label))).style;

double controlOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.descendant(of: find.byType(TanreiButton), matching: find.byType(Opacity)))
    .opacity;

double cornerRadius(WidgetTester tester) => containerDecoration(tester).borderRadius.topLeft.x;

double saturation(Color color) => HSVColor.fromColor(color).saturation;

Future<TestGesture> hover(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
  await tester.pumpAndSettle();
  return mouse;
}

Widget button(TanreiButtonVariant variant, {FocusNode? focusNode}) => TanreiButton(
  onPressed: () {},
  variant: variant,
  focusNode: focusNode,
  child: const Text('Deploy'),
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('every shipped system', () {
    for (final TanreiSystem system in shippedSystems) {
      for (final TanreiButtonVariant variant in TanreiButtonVariant.core) {
        testWidgets('BTN-3: "${system.id}" ${variant.name} at rest draws the enabled tokens of '
            'that system', (WidgetTester tester) async {
          final TanreiThemeData theme = TanreiThemeData(system: system);
          final TanreiButtonTokens tokens = system.button;
          final TanreiButtonVariantStateTokens enabled = buttonVariantsOf(
            tokens,
          )[variant.name]!.enabled;
          await tester.pumpWidget(tanreiTestApp(button(variant), theme: theme));

          final Color fill = theme.paint(enabled.containerColor);
          expect(containerDecoration(tester).color, fill.a > 0 ? fill : isNull);
          expect(cornerRadius(tester), tokens.containerShape);
          expect(containerSize(tester).height, tokens.sizes.medium.containerHeight);
          expect(controlOpacity(tester), 1);

          // The font stack of the system is delivered as Flutter reads one (theme/text_style.dart):
          // named families in order, and no family at all where the platform's font comes first.
          final TextStyle label = labelStyle(tester, 'Deploy');
          final TanreiResolvedFontStack stack = tokens.sizes.medium.labelTypescale.font.resolve();
          expect(label.color, theme.paint(enabled.labelColor));
          expect(label.fontFamily, stack.fontFamily);
          expect(label.fontFamilyFallback, stack.fontFamilyFallback);
          expect(label.fontSize, tokens.sizes.medium.labelTypescale.size);
          expect(
            tester.getSize(find.text('Deploy')).height,
            tokens.sizes.medium.labelTypescale.lineHeight,
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  });

  group('m3-like', () {
    const TanreiSystem system = m3LikeSystem;
    const TanreiThemeData theme = TanreiThemeData(system: system);
    final TanreiColors colors = system.schemes.light;
    final TanreiButtonTokens tokens = system.button;
    final TanreiButtonSizes sizes = tokens.sizes;

    testWidgets('the filled medium container is a pill filled with the primary of the system', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.filled), theme: theme));
      final Size size = containerSize(tester);
      expect(size.height, tokens.sizes.medium.containerHeight);
      expect(cornerRadius(tester), greaterThanOrEqualTo(size.height / 2));
      expect(cornerRadius(tester), system.shape.full);
      expect(containerDecoration(tester).color, colors.primary);
      expect(labelStyle(tester, 'Deploy').color, colors.onPrimary);
      // A chromatic primary, unlike the default system's neutral one.
      expect(
        saturation(colors.primary),
        greaterThan(saturation(tanreiSystem.schemes.light.primary)),
      );
    });

    testWidgets('BTN-3: a state is a mix (state layer) of the label color over the container', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.filled), theme: theme));
      await hover(tester);
      final Color hovered = containerDecoration(tester).color!;
      expect(hovered, theme.paint(tokens.variants.filled.hovered.containerColor));
      expect(
        hovered,
        isSameColorAs(
          tanreiMixColors(colors.primary, colors.onPrimary, system.state.hoverStateLayerOpacity),
        ),
      );
      expect(hovered, isNot(colors.primary));
      expect(cornerRadius(tester), greaterThanOrEqualTo(containerSize(tester).height / 2));
    });

    testWidgets('elevated is a shadow without a ring: no border, only the shadows of the level', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.elevated), theme: theme));
      final List<TanreiShadowLayer> level = tokens.variants.elevated.enabled.containerElevation;
      expect(level, system.elevation.level1);
      for (final TanreiContainerDecoration decoration in buttonDecorations(tester)) {
        expect(decoration.border, isNull);
      }
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, theme.paint(tokens.variants.elevated.enabled.containerColor));
      expect(decoration.boxShadow, <BoxShadow>[
        for (final TanreiShadowLayer layer in level)
          BoxShadow(
            color: colors[layer.role],
            offset: Offset(layer.x, layer.y),
            blurRadius: tanreiBlurRadiusFromCss(layer.blur),
            spreadRadius: layer.spread,
          ),
      ]);
      expect(decoration.boxShadow!.every((BoxShadow shadow) => shadow.color.a > 0), isTrue);
      // The ring role of this system paints nothing, wherever a level would use it.
      expect(colors.elevationRing.a, 0);

      await hover(tester);
      expect(containerDecoration(tester).border, isNull);
      expect(
        containerDecoration(tester).boxShadow!.map((BoxShadow shadow) => shadow.blurRadius),
        tokens.variants.elevated.hovered.containerElevation.map(
          (TanreiShadowLayer layer) => tanreiBlurRadiusFromCss(layer.blur),
        ),
      );
    });

    testWidgets('a ring layer in the transparent ring role of the system is invisible', (
      WidgetTester tester,
    ) async {
      // The default system's level shape (ring first) with m3-like's colors.
      final TanreiSystem ringed = system.copyWith(
        button: tokens.copyWith(
          variants: tokens.variants.copyWith(
            elevated: tokens.variants.elevated.copyWith(
              enabled: tokens.variants.elevated.enabled.copyWith(
                containerElevation: tanreiSystem.elevation.level2,
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(button(TanreiButtonVariant.elevated), theme: TanreiThemeData(system: ringed)),
      );
      final Border ring = containerDecoration(tester).border!;
      expect(ring.top.color.a, 0);
      expect(containerDecoration(tester).boxShadow, hasLength(1));
    });

    testWidgets('a declared role (tertiary) drives the button like any vocabulary role', (
      WidgetTester tester,
    ) async {
      final TanreiSystem tertiary = system.copyWith(
        button: tokens.copyWith(
          variants: tokens.variants.copyWith(
            filled: tokens.variants.filled.copyWith(
              enabled: tokens.variants.filled.enabled.copyWith(
                containerColor: const TanreiPaint.role(M3LikeColorRoles.tertiary),
                labelColor: const TanreiPaint.role(M3LikeColorRoles.onTertiary),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(button(TanreiButtonVariant.filled), theme: TanreiThemeData(system: tertiary)),
      );
      expect(containerDecoration(tester).color, colors.extra[M3LikeColorRoles.tertiary]);
      expect(containerDecoration(tester).color, isNot(colors.primary));
      expect(labelStyle(tester, 'Deploy').color, colors.extra[M3LikeColorRoles.onTertiary]);
    });

    test('adds the sizes xsmall and xlarge to the three core ones: Material 3\'s five', () {
      expect(sizes.keys, <TanreiButtonSize>[
        ...TanreiButtonSize.core,
        M3LikeButtonSize.xsmall,
        M3LikeButtonSize.xlarge,
      ]);
      List<double> values(TanreiButtonSizeTokens size) => <double>[
        size.containerHeight,
        size.containerPaddingInlineStart,
        size.containerPaddingInlineEnd,
        size.containerPaddingInlineStartWithIcon,
        size.containerPaddingInlineEndWithIcon,
        size.iconSize,
        size.iconSizeWithoutLabel,
        size.containerGap,
        size.outlineWidth,
        size.containerPaddingInlineNarrow,
        size.containerWidthWide,
      ];
      // height, padding start / end (without and with an icon), icon beside a label, icon alone,
      // gap, outline width, narrow inset, wide width
      expect(values(sizes.xsmall), <double>[32, 16, 16, 16, 16, 20, 20, 8, 1, 4, 40]);
      expect(values(sizes.small), <double>[40, 16, 16, 16, 16, 20, 24, 8, 1, 4, 52]);
      expect(values(sizes.medium), <double>[56, 24, 24, 24, 24, 24, 24, 8, 1, 12, 72]);
      expect(values(sizes.large), <double>[96, 48, 48, 48, 48, 32, 32, 12, 2, 16, 128]);
      expect(values(sizes.xlarge), <double>[136, 64, 64, 64, 64, 40, 40, 16, 3, 32, 184]);
      // The label grows with the size: label, label, heading-5, heading-3, heading-1.
      final TanreiTypescale type = system.typescale;
      expect(sizes.xsmall.labelTypescale, same(type.label));
      expect(sizes.small.labelTypescale, same(type.label));
      expect(sizes.medium.labelTypescale, same(type.heading5));
      expect(sizes.large.labelTypescale, same(type.heading3));
      expect(sizes.xlarge.labelTypescale, same(type.heading1));
    });

    testWidgets('an outlined xlarge Button is 136 tall with an outline of 3 and a gap of 16', (
      WidgetTester tester,
    ) async {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String _) =>
          reports.add('$kind $key');
      addTearDown(() => debugTanreiReportUnknownValue = previous);

      const Key iconKey = Key('icon');
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            variant: TanreiButtonVariant.outlined,
            size: M3LikeButtonSize.xlarge,
            icon: Builder(
              key: iconKey,
              builder: (BuildContext context) =>
                  SizedBox.square(dimension: IconTheme.of(context).size),
            ),
            child: const Text('Deploy'),
          ),
          theme: theme,
        ),
      );
      final TanreiButtonSizeTokens xlarge = sizes[M3LikeButtonSize.xlarge];
      expect(xlarge, same(sizes.extra[M3LikeButtonSize.xlarge]));
      expect(reports, isEmpty);

      expect(containerSize(tester).height, xlarge.containerHeight);
      expect(containerSize(tester).height, 136);

      final BorderSide outline = (containerDecoration(tester).border!).top;
      expect(outline.width, xlarge.outlineWidth);
      expect(outline.width, 3);
      expect(outline.color, theme.paint(system.button.variants.outlined.enabled.outlineColor));

      final Rect icon = tester.getRect(find.byKey(iconKey));
      final Rect label = tester.getRect(find.text('Deploy'));
      expect(icon.size, Size.square(xlarge.iconSize));
      expect(label.left - icon.right, xlarge.containerGap);
      expect(label.left - icon.right, 16);
    });

    testWidgets('an xsmall Button is 32 tall', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            size: M3LikeButtonSize.xsmall,
            child: const Text('Deploy'),
          ),
          theme: theme,
        ),
      );
      expect(containerSize(tester).height, sizes.xsmall.containerHeight);
      expect(containerSize(tester).height, 32);
      // The hit area still meets the minimum target of the system.
      expect(
        tester.getSize(find.byType(TanreiTapTarget)).height,
        greaterThanOrEqualTo(system.measure.targetTouch),
      );
    });

    testWidgets('BTN-7: under tanrei, which has no xlarge, the same Button is the default size', (
      WidgetTester tester,
    ) async {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String _) =>
          reports.add('$kind $key');
      addTearDown(() => debugTanreiReportUnknownValue = previous);

      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            size: M3LikeButtonSize.xlarge,
            child: const Text('Deploy'),
          ),
          theme: const TanreiThemeData(system: tanreiSystem),
        ),
      );
      expect(tanreiSystem.button.sizes.has(M3LikeButtonSize.xlarge), isFalse);
      expect(containerSize(tester).height, tanreiSystem.button.sizes.medium.containerHeight);
      expect(reports, contains('button size xlarge'));
    });
  });

  group('tanrei', () {
    testWidgets('a declared role (accent) drives the button like any vocabulary role', (
      WidgetTester tester,
    ) async {
      final TanreiButtonTokens tokens = tanreiSystem.button;
      final TanreiColors colors = tanreiSystem.schemes.light;
      final TanreiSystem accent = tanreiSystem.copyWith(
        button: tokens.copyWith(
          variants: tokens.variants.copyWith(
            filled: tokens.variants.filled.copyWith(
              enabled: tokens.variants.filled.enabled.copyWith(
                containerColor: const TanreiPaint.role(TanreiColorRoles.accent),
                labelColor: const TanreiPaint.role(TanreiColorRoles.onAccent),
              ),
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(button(TanreiButtonVariant.filled), theme: TanreiThemeData(system: accent)),
      );
      expect(containerDecoration(tester).color, colors.extra[TanreiColorRoles.accent]);
      expect(containerDecoration(tester).color, isNot(colors.primary));
      expect(labelStyle(tester, 'Deploy').color, colors.extra[TanreiColorRoles.onAccent]);
    });
  });

  group('cupertino', () {
    const TanreiSystem system = cupertinoSystem;
    const TanreiThemeData theme = TanreiThemeData(system: system);
    final TanreiColors colors = system.schemes.light;
    final TanreiButtonTokens tokens = system.button;

    for (final TanreiButtonVariant variant in TanreiButtonVariant.core) {
      testWidgets('BTN-3: ${variant.name} has no hover or focus look: container, label, outline '
          'and elevation equal the resting ones', (WidgetTester tester) async {
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(tanreiTestApp(button(variant, focusNode: focusNode), theme: theme));
        final TanreiContainerDecoration resting = containerDecoration(tester);
        final Color restingLabel = labelStyle(tester, 'Deploy').color!;
        final TanreiButtonVariantTokens variantTokens = buttonVariantsOf(tokens)[variant.name]!;
        expect(
          theme.paint(variantTokens.hovered.containerColor),
          theme.paint(variantTokens.enabled.containerColor),
        );

        await hover(tester);
        expect(containerDecoration(tester), resting);
        expect(labelStyle(tester, 'Deploy').color, restingLabel);
        expect(controlOpacity(tester), tokens.hovered.opacity);
        expect(controlOpacity(tester), 1);

        focusNode.requestFocus();
        await tester.pumpAndSettle();
        expect(containerDecoration(tester), resting);
        expect(labelStyle(tester, 'Deploy').color, restingLabel);
      });
    }

    testWidgets('BTN-3: pressed dims the whole control to the pressed opacity of the system', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.filled), theme: theme));
      final TanreiContainerDecoration resting = containerDecoration(tester);
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiButton)),
      );
      await tester.pump();
      expect(controlOpacity(tester), tokens.pressed.opacity);
      expect(controlOpacity(tester), closeTo(0.7, 1e-9));
      // The dimming is the whole pressed look: the paints do not change.
      expect(containerDecoration(tester), resting);
      await touch.up();
      await tester.pumpAndSettle();
      expect(controlOpacity(tester), 1);
    });

    testWidgets('filled is the saturated tint with a white label', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.filled), theme: theme));
      expect(containerDecoration(tester).color, colors.primary);
      expect(labelStyle(tester, 'Deploy').color, colors.onPrimary);
      expect(colors.onPrimary, const Color(0xFFFFFFFF));
      expect(colors.primary.b, greaterThan(colors.primary.r));
      expect(colors.primary.b, greaterThan(colors.primary.g));
    });

    testWidgets('tonal is a gray fill whose label is the tint, not on-surface', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.tonal), theme: theme));
      final Color label = labelStyle(tester, 'Deploy').color!;
      expect(label, colors.primary);
      expect(label, isNot(colors.onSurface));
      final Color fill = containerDecoration(tester).color!;
      expect(fill, colors.secondaryContainer);
      expect(saturation(fill), lessThan(saturation(colors.primary)));
    });

    testWidgets('corners are the rounded rectangle of the system, not a pill', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(button(TanreiButtonVariant.filled), theme: theme));
      expect(cornerRadius(tester), tokens.containerShape);
      expect(cornerRadius(tester), lessThan(containerSize(tester).height / 2));
      expect(cornerRadius(tester), isNot(tanreiSystem.button.containerShape));
    });

    test('surfaces are pure white and pure black', () {
      expect(system.schemes.light.surface, const Color(0xFFFFFFFF));
      expect(system.schemes.dark.surface, const Color(0xFF000000));
    });
  });

  group('preset goldens', () {
    // The same spec fixtures as the default system's baselines, light scheme, one folder per preset.
    const List<String> recorded = <String>[
      'filled-medium',
      'tonal-medium',
      'outlined-medium',
      'elevated-medium',
      'text-medium',
    ];
    final Map<String, dynamic> spec =
        jsonDecode(File('../../specs/button.spec.json').readAsStringSync()) as Map<String, dynamic>;
    final List<Map<String, dynamic>> fixtures = (spec['fixtures'] as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .where((Map<String, dynamic> f) => recorded.contains(f['id']))
        .toList();

    test('the spec still has the fixtures recorded for the presets', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), unorderedEquals(recorded));
    });

    for (final TanreiSystem system in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      for (final Map<String, dynamic> fixture in fixtures) {
        final String id = fixture['id'] as String;
        final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
        testWidgets('golden: ${system.id}/$id', (WidgetTester tester) async {
          const double pixelRatio = 2;
          const Size surface = Size(160, 80);
          tester.view.devicePixelRatio = pixelRatio;
          tester.view.physicalSize = surface * pixelRatio;
          addTearDown(tester.view.reset);

          final GlobalKey boundaryKey = GlobalKey();
          final TanreiThemeData theme = TanreiThemeData(system: system);
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
                          onPressed: () {},
                          variant: TanreiButtonVariant(props['variant'] as String),
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
          await expectLater(image, matchesGoldenFile('goldens/button/${system.id}/$id.png'));
        });
      }
    }
  });
}
