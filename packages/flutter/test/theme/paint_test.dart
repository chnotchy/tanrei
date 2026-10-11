import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

Matcher isSameColorAs(Color expected) => isA<Color>()
    .having((Color c) => c.a, 'a', closeTo(expected.a, 1e-6))
    .having((Color c) => c.r, 'r', closeTo(expected.r, 1e-6))
    .having((Color c) => c.g, 'g', closeTo(expected.g, 1e-6))
    .having((Color c) => c.b, 'b', closeTo(expected.b, 1e-6));

void main() {
  final TanreiColors light = tanreiSystem.schemes.light;
  final TanreiColors dark = tanreiSystem.schemes.dark;
  const TanreiPaint primary = TanreiPaint.role(TanreiColorRole.primary);
  const TanreiPaint onPrimary = TanreiPaint.role(TanreiColorRole.onPrimary);

  group(
    'a paint per scheme (a tone or contrast-pick rule whose result differs between schemes)',
    () {
      const TanreiPaint perScheme = TanreiPaint.scheme(
        light: TanreiPaint.role(TanreiColorRole.primary),
        lightMedium: TanreiPaint.role(TanreiColorRole.primary),
        lightHigh: TanreiPaint.literal(Color(0xFF000000)),
        dark: TanreiPaint.role(TanreiColorRole.secondary),
        darkMedium: TanreiPaint.role(TanreiColorRole.secondary),
        darkHigh: TanreiPaint.literal(Color(0xFFFFFFFF)),
      );

      test('the theme evaluates the paint of the scheme it draws in', () {
        for (final Brightness brightness in Brightness.values) {
          for (final TanreiContrast contrast in TanreiContrast.values) {
            final TanreiThemeData theme = TanreiThemeData(
              brightness: brightness,
              contrast: contrast,
            );
            expect(theme.colors, same(tanreiSystem.schemes.of(theme.scheme)));
            expect(
              theme.paint(perScheme),
              (perScheme as TanreiSchemePaint).of(theme.scheme).resolve(theme.colors),
              reason: theme.scheme.name,
            );
          }
        }
        expect(TanreiThemeData.dark.paint(perScheme), dark.secondary);
        expect(
          const TanreiThemeData(contrast: TanreiContrast.high).paint(perScheme),
          const Color(0xFF000000),
        );
      });

      test('it composes: a mix of a per-scheme paint follows the scheme too', () {
        const TanreiPaint hovered = TanreiPaint.mix(perScheme, onPrimary, 0.08);
        expect(
          TanreiThemeData.dark.paint(hovered),
          isSameColorAs(tanreiMixColors(dark.secondary, dark.onPrimary, 0.08)),
        );
      });

      test('resolved without a scheme it follows the scheme the colors say they are — it never '
          'asserts and never answers with another scheme\'s color', () {
        expect(light.scheme, TanreiScheme.light);
        expect(dark.scheme, TanreiScheme.dark);
        expect(perScheme.resolve(light), light.primary);
        expect(perScheme.resolve(dark), dark.secondary);
        expect(perScheme.resolve(tanreiSystem.schemes.darkHigh), const Color(0xFFFFFFFF));
        // An explicit scheme wins (a theme built with `TanreiThemeData.raw` names its own).
        expect(perScheme.resolve(light, scheme: TanreiScheme.dark), light.secondary);
        // Copies and interpolations keep knowing which scheme they are.
        expect(dark.copyWith(primary: const Color(0xFF123456)).scheme, TanreiScheme.dark);
        expect(TanreiColors.lerp(light, dark, 0.4).scheme, TanreiScheme.light);
        expect(TanreiColors.lerp(light, dark, 0.6).scheme, TanreiScheme.dark);
      });

      test('equality is by value', () {
        expect(
          perScheme,
          const TanreiPaint.scheme(
            light: TanreiPaint.role(TanreiColorRole.primary),
            lightMedium: TanreiPaint.role(TanreiColorRole.primary),
            lightHigh: TanreiPaint.literal(Color(0xFF000000)),
            dark: TanreiPaint.role(TanreiColorRole.secondary),
            darkMedium: TanreiPaint.role(TanreiColorRole.secondary),
            darkHigh: TanreiPaint.literal(Color(0xFFFFFFFF)),
          ),
        );
      });
    },
  );

  group('TanreiPaint.resolve', () {
    test('role: the role of the scheme it is evaluated against', () {
      expect(primary.resolve(light), light.primary);
      expect(primary.resolve(dark), dark.primary);
      expect(light.primary, isNot(dark.primary));
    });

    test('literal: the same in every scheme', () {
      const TanreiPaint brand = TanreiPaint.literal(Color(0xFFE4002B));
      expect(brand.resolve(light), const Color(0xFFE4002B));
      expect(brand.resolve(dark), const Color(0xFFE4002B));
    });

    test('none: nothing is drawn', () {
      expect(const TanreiPaint.none().resolve(light).a, 0);
      expect(const TanreiPaint.none().resolve(dark).a, 0);
    });

    test('alpha: multiplies the alpha of what it wraps, in light and dark', () {
      const TanreiPaint dim = TanreiPaint.alpha(TanreiPaint.role(TanreiColorRole.onSurface), 0.38);
      for (final TanreiColors colors in <TanreiColors>[light, dark]) {
        final Color resolved = dim.resolve(colors);
        expect(resolved.a, closeTo(0.38, 1e-6));
        expect(resolved.withValues(alpha: 1), colors.onSurface);
      }
      // A role that already has alpha keeps it as a factor.
      const TanreiPaint ring = TanreiPaint.alpha(
        TanreiPaint.role(TanreiColorRole.elevationRing),
        0.5,
      );
      expect(ring.resolve(light).a, closeTo(light.elevationRing.a * 0.5, 1e-6));
      // Nested alphas multiply.
      expect(const TanreiPaint.alpha(dim, 0.5).resolve(dark).a, closeTo(0.19, 1e-6));
    });

    test('mix: opaque colors interpolate per channel, in light and dark', () {
      const TanreiPaint hovered = TanreiPaint.mix(primary, onPrimary, 0.08);
      for (final TanreiColors colors in <TanreiColors>[light, dark]) {
        final Color resolved = hovered.resolve(colors);
        expect(resolved.a, 1);
        expect(resolved.r, closeTo(colors.primary.r * 0.92 + colors.onPrimary.r * 0.08, 1e-6));
        expect(resolved.g, closeTo(colors.primary.g * 0.92 + colors.onPrimary.g * 0.08, 1e-6));
        expect(resolved.b, closeTo(colors.primary.b * 0.92 + colors.onPrimary.b * 0.08, 1e-6));
        // … which is the former state layer: `other` at `amount` opacity painted over `base`.
        expect(
          resolved,
          isSameColorAs(Color.alphaBlend(colors.onPrimary.withValues(alpha: 0.08), colors.primary)),
        );
      }
      expect(
        const TanreiPaint.mix(primary, onPrimary, 0).resolve(light),
        isSameColorAs(light.primary),
      );
      expect(
        const TanreiPaint.mix(primary, onPrimary, 1).resolve(light),
        isSameColorAs(light.onPrimary),
      );
    });

    test(
      'mix: premultiplied like CSS color-mix(in srgb), reference values from the token engine',
      () {
        // mixColors({1,0,0,a:1}, {0,0,1,a:0.5}, 0.5) → a 0.75, r 2/3, g 0, b 1/3.
        final Color mixed = tanreiMixColors(
          const Color.from(alpha: 1, red: 1, green: 0, blue: 0),
          const Color.from(alpha: 0.5, red: 0, green: 0, blue: 1),
          0.5,
        );
        expect(mixed.a, closeTo(0.75, 1e-6));
        expect(mixed.r, closeTo(2 / 3, 1e-6));
        expect(mixed.g, closeTo(0, 1e-6));
        expect(mixed.b, closeTo(1 / 3, 1e-6));
        // Out-of-range amounts clamp.
        expect(tanreiMixColors(light.primary, light.onPrimary, 2), isSameColorAs(light.onPrimary));
        expect(tanreiMixColors(light.primary, light.onPrimary, -1), isSameColorAs(light.primary));
      },
    );

    test('mix over none: the other color at that alpha (a state layer over no fill)', () {
      const TanreiPaint hovered = TanreiPaint.mix(
        TanreiPaint.none(),
        TanreiPaint.role(TanreiColorRole.onSurface),
        0.08,
      );
      for (final TanreiColors colors in <TanreiColors>[light, dark]) {
        expect(hovered.resolve(colors), isSameColorAs(colors.onSurface.withValues(alpha: 0.08)));
      }
      expect(
        const TanreiPaint.mix(TanreiPaint.none(), TanreiPaint.none(), 0.5).resolve(light).a,
        0,
      );
    });

    test('paints are values: equal descriptions are equal, const ones identical', () {
      expect(
        const TanreiPaint.mix(primary, onPrimary, 0.08),
        same(const TanreiPaint.mix(primary, onPrimary, 0.08)),
      );
      // ignore: prefer_const_constructors
      expect(TanreiPaint.alpha(primary, 0.1), const TanreiPaint.alpha(primary, 0.1));
      // ignore: prefer_const_constructors
      expect(TanreiPaint.role(TanreiColorRole('primary')), primary);
      expect(const TanreiPaint.none(), isNot(primary));
    });
  });

  group('the generated system', () {
    test('every button paint resolves in all six schemes', () {
      final TanreiButtonTokens button = tanreiSystem.button;
      final TanreiSchemes schemes = tanreiSystem.schemes;
      for (final TanreiColors colors in <TanreiColors>[
        schemes.light,
        schemes.lightMedium,
        schemes.lightHigh,
        schemes.dark,
        schemes.darkMedium,
        schemes.darkHigh,
      ]) {
        for (final TanreiButtonVariantTokens variant in <TanreiButtonVariantTokens>[
          button.variants.filled,
          button.variants.tonal,
          button.variants.elevated,
          button.variants.outlined,
          button.variants.text,
        ]) {
          for (final TanreiInteractionState state in TanreiInteractionState.values) {
            final TanreiButtonVariantStateTokens tokens = variant.of(state);
            expect(tokens.labelColor.resolve(colors).a, greaterThan(0));
            tokens.containerColor.resolve(colors);
            tokens.outlineColor.resolve(colors);
          }
        }
      }
    });

    test('the default system shows state with a mix, not by dimming or reshaping', () {
      final TanreiButtonTokens button = tanreiSystem.button;
      expect(
        button.variants.filled.hovered.containerColor,
        TanreiPaint.mix(
          button.variants.filled.enabled.containerColor,
          button.variants.filled.enabled.labelColor,
          tanreiSystem.state.hoverStateLayerOpacity,
        ),
      );
      expect(button.stateTokens(TanreiInteractionState.enabled), isNull);
      for (final TanreiInteractionState state in TanreiInteractionState.values.skip(1)) {
        expect(button.stateTokens(state)!.opacity, 1);
        expect(button.stateTokens(state)!.containerShape, button.containerShape);
      }
    });
  });
}
