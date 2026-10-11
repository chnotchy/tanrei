import 'dart:convert';
import 'dart:io';

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';
import 'icon_button_harness.dart';

// The shipped presets drive `TanreiIconButton` through values alone: the widget has no code for any
// of them. Expectations are read from the system instance, not written as literals, wherever
// possible.

Widget iconButton(TanreiIconButtonVariant variant, {bool? isSelected}) => TanreiIconButton(
  onPressed: () {},
  isSelected: isSelected,
  variant: variant,
  semanticLabel: 'Favorite',
  icon: favorite,
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('every shipped system', () {
    for (final TanreiSystem system in shippedSystems) {
      for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
        testWidgets('ICB-12: "${system.id}" ${variant.name} at rest draws the enabled tokens of '
            'that system, in each look', (WidgetTester tester) async {
          final TanreiThemeData theme = TanreiThemeData(system: system);
          final TanreiIconButtonTokens tokens = system.iconButton;
          for (final MapEntry<String, bool?> look in looks.entries) {
            await tester.pumpWidget(
              tanreiTestApp(iconButton(variant, isSelected: look.value), theme: theme),
            );
            final ({TanreiPaint container, TanreiPaint icon, TanreiPaint outline}) parts = partsOf(
              tokens.variants[variant].enabled,
              look.value,
            );
            expect(containerColor(tester), theme.paint(parts.container), reason: look.key);
            expect(iconColor(tester), theme.paint(parts.icon), reason: look.key);
            expect(outlineColor(tester), theme.paint(parts.outline), reason: look.key);
            expect(containerDecoration(tester).shape.radius, tokens.containerShape);
            expect(containerDecoration(tester).shape.smoothing, system.shape.cornerSmoothing);
            expect(containerSize(tester), Size.square(tokens.sizes.medium.containerSize));
            expect(controlOpacity(tester), 1);
            // ICB-13: the icon style of the system, for the look's selection.
            final bool selected = look.value ?? false;
            expect(
              DefaultTextStyle.of(tester.element(find.text(favoriteGlyph))).style.fontFamily,
              system.icon.family(selected: selected),
            );
            expect(iconTheme(tester).fill, system.icon.fill(selected: selected));
            expect(iconTheme(tester).weight, system.icon.weight);
            expect(iconTheme(tester).size, tokens.sizes.medium.iconSize);
            expect(tester.takeException(), isNull);
          }
        });
      }

      testWidgets('ICB-5: "${system.id}" keeps every size inside the touch target of the system', (
        WidgetTester tester,
      ) async {
        for (final TanreiIconButtonSize size in system.iconButton.sizes.keys) {
          await tester.pumpWidget(
            tanreiTestApp(
              TanreiIconButton(
                onPressed: () {},
                size: size,
                semanticLabel: 'Favorite',
                icon: favorite,
              ),
              theme: TanreiThemeData(system: system),
            ),
          );
          final double side = system.iconButton.sizes[size].containerSize;
          expect(containerSize(tester), Size.square(side), reason: size.name);
          expect(
            tester.getSize(find.byType(TanreiTapTarget)),
            Size.square(side > system.measure.targetTouch ? side : system.measure.targetTouch),
            reason: size.name,
          );
        }
      });
    }
  });

  group('m3-like', () {
    const TanreiSystem system = m3LikeSystem;
    const TanreiThemeData theme = TanreiThemeData(system: system);
    final TanreiIconButtonTokens tokens = system.iconButton;

    testWidgets(
      'a round 40 × 40 button with a 24 icon, and the selected standard icon is primary',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(
            iconButton(TanreiIconButtonVariant.standard, isSelected: true),
            theme: theme,
          ),
        );
        expect(containerSize(tester), Size.square(tokens.sizes.medium.containerSize));
        expect(containerSize(tester), const Size.square(40));
        expect(containerDecoration(tester).shape.radius, system.shape.full);
        expect(tester.getSize(find.text(favoriteGlyph)), const Size.square(24));
        expect(iconColor(tester), system.schemes.light.primary);
      },
    );

    testWidgets('ICB-9: a press is a ripple of the pressed container of the look', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(iconButton(TanreiIconButtonVariant.tonal, isSelected: true), theme: theme),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      expect(
        containerDecoration(tester).ripple!.color,
        theme.paint(tokens.variants.tonal.pressed.selectedContainerColor),
      );
      expect(
        containerColor(tester),
        theme.paint(tokens.variants.tonal.enabled.selectedContainerColor),
      );
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });
  });

  group('cupertino', () {
    const TanreiSystem system = cupertinoSystem;
    const TanreiThemeData theme = TanreiThemeData(system: system);
    final TanreiIconButtonTokens tokens = system.iconButton;

    for (final TanreiIconButtonVariant variant in TanreiIconButtonVariant.core) {
      testWidgets('ICB-3: ${variant.name} has no hover look: container, icon and outline stay at '
          'rest (no state layer)', (WidgetTester tester) async {
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        for (final MapEntry<String, bool?> look in looks.entries) {
          await tester.pumpWidget(
            tanreiTestApp(iconButton(variant, isSelected: look.value), theme: theme),
          );
          final Color rest = containerColor(tester);
          final Color icon = iconColor(tester);
          final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
          await mouse.addPointer(location: tester.getCenter(find.byType(TanreiIconButton)));
          await tester.pumpAndSettle();
          expect(containerColor(tester), rest, reason: look.key);
          expect(iconColor(tester), icon, reason: look.key);
          await mouse.removePointer();
          await tester.pumpAndSettle();
        }
      });
    }

    testWidgets('ICB-9: a press dims the whole control to the pressed opacity of the system', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(iconButton(TanreiIconButtonVariant.filled), theme: theme),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiIconButton)),
      );
      await tester.pump();
      expect(controlOpacity(tester), tokens.pressed.opacity);
      expect(containerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
    });

    testWidgets('the tint: a standard or outlined icon is primary as an action and when on, and '
        'on-surface-variant when off', (WidgetTester tester) async {
      final TanreiColors colors = system.schemes.light;
      for (final TanreiIconButtonVariant variant in <TanreiIconButtonVariant>[
        TanreiIconButtonVariant.standard,
        TanreiIconButtonVariant.outlined,
      ]) {
        final Map<bool?, Color> expected = <bool?, Color>{
          null: colors.primary,
          false: colors.onSurfaceVariant,
          true: variant == TanreiIconButtonVariant.standard
              ? colors.primary
              : theme.paint(tokens.variants.outlined.enabled.selectedIconColor),
        };
        for (final MapEntry<bool?, Color> entry in expected.entries) {
          await tester.pumpWidget(
            tanreiTestApp(iconButton(variant, isSelected: entry.key), theme: theme),
          );
          expect(iconColor(tester), entry.value, reason: '${variant.name} ${entry.key}');
        }
      }
    });

    testWidgets('a circle of the size tokens (28 / 34 / 44)', (WidgetTester tester) async {
      expect(
        TanreiIconButtonSize.core.map(
          (TanreiIconButtonSize size) => tokens.sizes[size].containerSize,
        ),
        <double>[28, 34, 44],
      );
      await tester.pumpWidget(
        tanreiTestApp(iconButton(TanreiIconButtonVariant.filled), theme: theme),
      );
      expect(containerDecoration(tester).shape.radius, greaterThanOrEqualTo(34 / 2));
    });
  });

  group('preset goldens', () {
    // One representative fixture per shipped preset, light scheme, one folder per
    // preset: the filled button shows the preset's size, shape and primary at once.
    const String recorded = 'filled-medium';
    final Map<String, dynamic> spec =
        jsonDecode(File('../../specs/icon-button.spec.json').readAsStringSync())
            as Map<String, dynamic>;
    final Map<String, dynamic> fixture = (spec['fixtures'] as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .singleWhere((Map<String, dynamic> f) => f['id'] == recorded);

    for (final TanreiSystem system in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${system.id}/$recorded', (WidgetTester tester) async {
        await expectIconButtonGolden(
          tester,
          system: system,
          props: fixture['props'] as Map<String, dynamic>,
          file: 'goldens/icon_button/${system.id}/$recorded.png',
        );
      });
    }
  });
}
