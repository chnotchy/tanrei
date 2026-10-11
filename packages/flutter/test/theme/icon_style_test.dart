import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';

const TanreiFontStack _rounded = TanreiFontStack(
  families: <String>['Material Symbols Rounded'],
  generic: TanreiFontGeneric.sansSerif,
  system: false,
);

void main() {
  const TanreiIconStyle icon = TanreiIconStyle(
    familyUnselected: _rounded,
    familySelected: _rounded,
    weight: 300,
    fillUnselected: 0,
    fillSelected: 1,
    opticalSizeMin: 20,
    opticalSizeMax: 48,
  );

  group('system.icon', () {
    test('the default system: Material Symbols Rounded, weight 300, fill 0 unselected and 1 '
        'selected', () {
      expect(tanreiSystem.icon.familyUnselected.families, <String>['Material Symbols Rounded']);
      expect(tanreiSystem.icon.familySelected.families, <String>['Material Symbols Rounded']);
      expect(tanreiSystem.icon.weight, 300);
      expect(tanreiSystem.icon.fillUnselected, 0);
      expect(tanreiSystem.icon.fillSelected, 1);
    });

    for (final TanreiSystem system in shippedSystems) {
      test('"${system.id}" names an icon font per selection state and tells selected from '
          'unselected by fill', () {
        expect(system.icon.family(selected: false), isNotEmpty);
        expect(system.icon.family(selected: true), isNotEmpty);
        expect(system.icon.weight, inInclusiveRange(1, 1000));
        expect(system.icon.fillUnselected, inInclusiveRange(0, 1));
        expect(system.icon.fillSelected, inInclusiveRange(0, 1));
        expect(system.icon.fillSelected, isNot(system.icon.fillUnselected));
      });
    }
  });

  group('TanreiIconStyle helper', () {
    test('selected is fill 1, unselected is fill 0', () {
      expect(icon.fill(selected: true), 1);
      expect(icon.fill(selected: false), 0);
    });

    test('the fill is the token of the system, not a constant', () {
      final TanreiIconStyle inverted = icon.copyWith(fillUnselected: 0.25, fillSelected: 0.75);
      expect(inverted.fill(selected: false), 0.25);
      expect(inverted.fill(selected: true), 0.75);
    });

    test('the optical size is the icon box size, clamped to the 20–48 range of the font', () {
      expect(icon.opticalSize(16), 20);
      expect(icon.opticalSize(20), 20);
      expect(icon.opticalSize(24), 24);
      expect(icon.opticalSize(40), 40);
      expect(icon.opticalSize(48), 48);
      expect(icon.opticalSize(96), 48);
    });

    test('the optical-size range is the token of the system (sys.icon.optical-size.min / .max), '
        'not the range of Material Symbols', () {
      // An icon font drawn for 8–96: a 16 box is drawn at 16, not raised to 20, and a 96 box at 96.
      final TanreiIconStyle wide = icon.copyWith(opticalSizeMin: 8, opticalSizeMax: 96);
      expect(wide.opticalSize(4), 8);
      expect(wide.opticalSize(8), 8);
      expect(wide.opticalSize(16), 16);
      expect(wide.opticalSize(96), 96);
      expect(wide.opticalSize(200), 96);
      expect(wide.resolve(size: 16, selected: false).opticalSize, 16);
      expect(wide.toIconThemeData(size: 120, selected: true).opticalSize, 96);
      // Through the theme: a system with that range clamps to it.
      final TanreiSystem system = tanreiSystem.copyWith(
        icon: tanreiSystem.icon.copyWith(opticalSizeMin: 8, opticalSizeMax: 96),
      );
      expect(system.icon.resolve(size: 12, selected: false).opticalSize, 12);
      expect(system.icon.resolve(size: 72, selected: false).opticalSize, 72);
      expect(tanreiSystem.icon.resolve(size: 12, selected: false).opticalSize, 20);
    });

    for (final TanreiSystem system in shippedSystems) {
      test('"${system.id}" declares a usable optical-size range', () {
        expect(system.icon.opticalSizeMin, greaterThan(0));
        expect(system.icon.opticalSizeMax, greaterThan(system.icon.opticalSizeMin));
      });
    }

    test(
      'toIconThemeData carries size, fill, weight 300, grade 0 and the clamped optical size',
      () {
        final IconThemeData unselected = icon.toIconThemeData(size: 16, selected: false);
        expect(unselected.size, 16);
        expect(unselected.fill, 0);
        expect(unselected.weight, 300);
        expect(unselected.grade, 0);
        expect(unselected.opticalSize, 20);
        expect(unselected.color, isNull);

        const Color color = Color(0xFF123456);
        final IconThemeData selected = icon.toIconThemeData(size: 24, selected: true, color: color);
        expect(selected.size, 24);
        expect(selected.fill, 1);
        expect(selected.weight, 300);
        expect(selected.grade, 0);
        expect(selected.opticalSize, 24);
        expect(selected.color, color);
      },
    );

    test('resolve returns family, fill, weight, optical size and grade 0 (default system: one '
        'variable family, two fills)', () {
      final TanreiIconStyle style = tanreiSystem.icon;
      final TanreiResolvedIconStyle unselected = style.resolve(size: 24, selected: false);
      final TanreiResolvedIconStyle selected = style.resolve(size: 24, selected: true);
      expect(unselected.fontFamily, 'Material Symbols Rounded');
      expect(selected.fontFamily, 'Material Symbols Rounded');
      expect(unselected.fontFamilyFallback, isNull);
      expect((unselected.fill, selected.fill), (0, 1));
      expect((unselected.weight, selected.weight), (300, 300));
      expect((unselected.opticalSize, selected.opticalSize), (24, 24));
      expect((unselected.grade, selected.grade), (0, 0));
      expect(unselected.size, 24);
    });

    test('resolve under a static icon set (the acme fixture): the FAMILY tells selected from '
        'unselected, and the axes are harmless', () {
      final TanreiIconStyle style = acmeSystem.icon;
      final TanreiResolvedIconStyle unselected = style.resolve(size: 16, selected: false);
      final TanreiResolvedIconStyle selected = style.resolve(size: 16, selected: true);
      expect(unselected.fontFamily, 'Material Icons Outlined');
      expect(selected.fontFamily, 'Material Icons');
      expect(style.family(selected: false), 'Material Icons Outlined');
      expect(style.family(selected: true), 'Material Icons');
      expect((unselected.weight, selected.weight), (400, 400));
      expect((unselected.fill, selected.fill), (0, 1));
      expect((unselected.opticalSize, unselected.grade), (20, 0));

      final TextStyle text = selected.toTextStyle(color: const Color(0xFF000000));
      expect(text.fontFamily, 'Material Icons');
      expect(text.fontSize, 16);
      expect(text.fontVariations, selected.fontVariations);
    });

    test('m3-like draws Material Symbols Outlined at weight 400', () {
      final TanreiSystem m3 = shippedSystems.firstWhere((TanreiSystem s) => s.id == 'm3-like');
      final TanreiResolvedIconStyle style = m3.icon.resolve(size: 24, selected: false);
      expect(style.fontFamily, 'Material Symbols Outlined');
      expect(style.weight, 400);
    });

    test('fontVariations are FILL, wght, GRAD and opsz', () {
      expect(icon.fontVariations(size: 64, selected: true), const <FontVariation>[
        FontVariation('FILL', 1),
        FontVariation('wght', 300),
        FontVariation('GRAD', 0),
        FontVariation('opsz', 48),
      ]);
      expect(icon.fontVariations(size: 12, selected: false), const <FontVariation>[
        FontVariation('FILL', 0),
        FontVariation('wght', 300),
        FontVariation('GRAD', 0),
        FontVariation('opsz', 20),
      ]);
    });

    testWidgets('an Icon under the icon theme of the system draws its glyph with those axes', (
      WidgetTester tester,
    ) async {
      final TanreiIconStyle style = tanreiSystem.icon;
      final IconData glyph = IconData(0xe88a, fontFamily: style.family(selected: true));
      await tester.pumpWidget(
        tanreiTestApp(
          IconTheme.merge(
            data: style.toIconThemeData(size: tanreiSystem.measure.iconMedium, selected: true),
            child: Icon(glyph),
          ),
        ),
      );
      final RichText text = tester.widget(
        find.descendant(of: find.byType(Icon), matching: find.byType(RichText)),
      );
      final TextStyle drawn = text.text.style!;
      expect(drawn.fontFamily, 'Material Symbols Rounded');
      expect(drawn.fontSize, tanreiSystem.measure.iconMedium);
      expect(
        drawn.fontVariations,
        containsAll(style.fontVariations(size: tanreiSystem.measure.iconMedium, selected: true)),
      );
    });
  });
}
