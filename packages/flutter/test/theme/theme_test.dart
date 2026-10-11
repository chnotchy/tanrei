import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

void main() {
  final TanreiSchemes schemes = tanreiSystem.schemes;

  group('TanreiThemeData', () {
    test('the default system is the generated Tanrei system', () {
      expect(const TanreiThemeData().system, same(tanreiSystem));
      expect(tanreiSystem.id, 'tanrei');
      expect(TanreiThemeData.light.system.button, same(tanreiSystem.button));
    });

    test('a theme carries the system its tokens are read from', () {
      final TanreiSystem product = tanreiSystem.copyWith(
        id: 'product',
        space: tanreiSystem.space.copyWith(space100: 10),
        schemes: schemes.copyWith(dark: schemes.dark.copyWith(primary: const Color(0xFF123456))),
      );
      final TanreiThemeData theme = TanreiThemeData(brightness: Brightness.dark, system: product);
      expect(theme.system.space.space100, 10);
      expect(theme.system.space.space200, tanreiSystem.space.space200);
      expect(theme.colors.primary, const Color(0xFF123456));
      expect(theme.copyWith(brightness: Brightness.light).system, same(product));
      expect(theme, isNot(const TanreiThemeData(brightness: Brightness.dark)));
      expect(theme, TanreiThemeData(brightness: Brightness.dark, system: product));
      expect(const TanreiThemeData().copyWith(system: product).colors, same(product.schemes.light));
    });

    test('brightness and contrast select one of the six schemes of the system', () {
      expect(const TanreiThemeData().colors, same(schemes.light));
      expect(
        const TanreiThemeData(contrast: TanreiContrast.medium).colors,
        same(schemes.lightMedium),
      );
      expect(const TanreiThemeData(contrast: TanreiContrast.high).colors, same(schemes.lightHigh));
      expect(const TanreiThemeData(brightness: Brightness.dark).colors, same(schemes.dark));
      expect(
        const TanreiThemeData(brightness: Brightness.dark, contrast: TanreiContrast.medium).colors,
        same(schemes.darkMedium),
      );
      expect(
        const TanreiThemeData(brightness: Brightness.dark, contrast: TanreiContrast.high).colors,
        same(schemes.darkHigh),
      );
    });

    test('color() looks up a role and applies token opacity', () {
      const TanreiThemeData theme = TanreiThemeData.light;
      expect(theme.color(TanreiColorRole.primary), schemes.light.primary);
      final double opacity = theme.system.state.disabledContentOpacity;
      final Color disabled = theme.color(TanreiColorRole.onSurface, opacity: opacity);
      expect(disabled.a, closeTo(opacity, 1e-6));
    });

    test('lerp interpolates every role and snaps the enums at the midpoint', () {
      const TanreiThemeData a = TanreiThemeData.light;
      const TanreiThemeData b = TanreiThemeData.dark;
      expect(TanreiThemeData.lerp(a, a, 0.3), same(a));
      expect(TanreiThemeData.lerp(a, b, 0).colors.surface, a.colors.surface);
      expect(TanreiThemeData.lerp(a, b, 1).colors.surface, b.colors.surface);
      final TanreiThemeData mid = TanreiThemeData.lerp(a, b, 0.75);
      expect(mid.brightness, Brightness.dark);
      expect(mid.system, same(tanreiSystem));
      expect(mid.colors.surface, Color.lerp(a.colors.surface, b.colors.surface, 0.75));
    });
  });

  group('lerp between design systems', () {
    test('colors are interpolated; the choices of kind, the typefaces and the icon families are '
        'not amounts and step with the system at the midpoint', () {
      const TanreiThemeData a = TanreiThemeData.light;
      const TanreiThemeData b = TanreiThemeData(system: cupertinoSystem);
      final TanreiThemeData before = TanreiThemeData.lerp(a, b, 0.25);
      final TanreiThemeData after = TanreiThemeData.lerp(a, b, 0.75);
      expect(before.system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      expect(before.system.shape.cornerSmoothing, 0);
      expect(after.system.behavior.pressedFeedback, TanreiPressedFeedback.dim);
      expect(after.system.shape.cornerSmoothing, 0.6);
      expect(before.system.typefaces, same(tanreiSystem.typefaces));
      expect(after.system.typefaces, same(cupertinoSystem.typefaces));
      expect(after.system.icon, same(cupertinoSystem.icon));
      expect(after.system.motion.duration.pressHold, cupertinoSystem.motion.duration.pressHold);
      expect(after.colors.primary, Color.lerp(a.colors.primary, b.colors.primary, 0.75));
    });
  });

  group('TanreiColors', () {
    test('roles are open-ended: a system may declare its own', () {
      const TanreiColorRole tertiary = TanreiColorRole('tertiary');
      final TanreiColors colors = schemes.light.copyWith(
        extra: const <TanreiColorRole, Color>{tertiary: Color(0xFF7D5260)},
      );
      expect(colors[tertiary], const Color(0xFF7D5260));
      expect(colors.has(tertiary), isTrue);
      expect(schemes.light.has(tertiary), isFalse);
      expect(colors[TanreiColorRole.primary], schemes.light.primary);
      expect(colors[const TanreiColorRole('primary')], schemes.light.primary);
      expect(const TanreiPaint.role(tertiary).resolve(colors), const Color(0xFF7D5260));
    });

    test('an unknown role never throws or asserts: it resolves to the primary slot of the same '
        'kind and is reported', () {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add('$kind "$key" -> $fallback');
      addTearDown(() => debugTanreiReportUnknownValue = previous);

      final TanreiColors light = schemes.light;
      expect(light.has(const TanreiColorRole('tertiary')), isFalse);
      expect(light[const TanreiColorRole('tertiary')], light.primary);
      expect(light[const TanreiColorRole('on-tertiary')], light.onPrimary);
      expect(light[const TanreiColorRole('tertiary-container')], light.primaryContainer);
      expect(light[const TanreiColorRole('on-tertiary-container')], light.onPrimaryContainer);
      expect(
        const TanreiPaint.role(TanreiColorRole('tertiary')).resolve(schemes.dark),
        schemes.dark.primary,
      );
      expect(reports, <String>[
        'color role "tertiary" -> primary',
        'color role "on-tertiary" -> on-primary',
        'color role "tertiary-container" -> primary-container',
        'color role "on-tertiary-container" -> on-primary-container',
        'color role "tertiary" -> primary',
      ]);
    });

    test('every intent of the system is a full set of four roles', () {
      expect(tanreiSystem.intents, contains(TanreiColorRole.primary));
      for (final TanreiColorRole intent in tanreiSystem.intents) {
        for (final String name in <String>[
          intent.name,
          'on-${intent.name}',
          '${intent.name}-container',
          'on-${intent.name}-container',
        ]) {
          expect(schemes.dark.has(TanreiColorRole(name)), isTrue, reason: name);
        }
      }
    });

    test('lerp interpolates declared roles too', () {
      const TanreiColorRole tertiary = TanreiColorRole('tertiary');
      final TanreiColors a = schemes.light.copyWith(
        extra: const <TanreiColorRole, Color>{tertiary: Color(0xFF000000)},
      );
      final TanreiColors b = schemes.light.copyWith(
        extra: const <TanreiColorRole, Color>{tertiary: Color(0xFFFFFFFF)},
      );
      expect(
        TanreiColors.lerp(a, b, 0.5)[tertiary],
        const Color.from(alpha: 1, red: 0.5, green: 0.5, blue: 0.5),
      );
    });
  });

  group('TanreiTheme', () {
    testWidgets('of() returns the nearest theme', (WidgetTester tester) async {
      late TanreiThemeData seen;
      await tester.pumpWidget(
        TanreiTheme(
          data: TanreiThemeData.dark,
          child: Builder(
            builder: (BuildContext context) {
              seen = TanreiTheme.of(context);
              return const SizedBox();
            },
          ),
        ),
      );
      expect(seen, TanreiThemeData.dark);
    });

    testWidgets('without a theme, of() follows platform brightness and high contrast', (
      WidgetTester tester,
    ) async {
      late TanreiThemeData seen;
      Widget build(MediaQueryData data) => MediaQuery(
        data: data,
        child: Builder(
          builder: (BuildContext context) {
            seen = TanreiTheme.of(context);
            return const SizedBox();
          },
        ),
      );

      await tester.pumpWidget(build(const MediaQueryData()));
      expect(seen.colors, same(schemes.light));

      await tester.pumpWidget(build(const MediaQueryData(platformBrightness: Brightness.dark)));
      expect(seen.colors, same(schemes.dark));

      await tester.pumpWidget(
        build(const MediaQueryData(platformBrightness: Brightness.dark, highContrast: true)),
      );
      expect(seen.colors, same(schemes.darkHigh));
    });
  });

  group('TanreiTextStyle.toTextStyle', () {
    test('maps families, size, tracking and line height', () {
      final TanreiTextStyle token = tanreiSystem.typescale.label;
      final TextStyle style = token.toTextStyle(color: schemes.light.onSurface);
      expect(style.fontFamily, token.font.families.first);
      expect(style.fontFamilyFallback, token.font.families.sublist(1));
      expect(style.fontSize, token.size);
      expect(style.letterSpacing, token.tracking);
      expect(style.height, token.lineHeight / token.size);
      expect(style.color, schemes.light.onSurface);
    });

    test('numeric weight maps to the nearest FontWeight and to the wght axis', () {
      TanreiTextStyle weighted(int weight) => TanreiTextStyle(
        font: const TanreiFontStack(
          families: <String>['Inter'],
          generic: TanreiFontGeneric.sansSerif,
          system: false,
        ),
        size: 16,
        weight: weight,
        tracking: 0,
        lineHeight: 24,
        family: TanreiTypeFamily.body,
      );
      expect(weighted(400).nearestFontWeight, FontWeight.w400);
      expect(weighted(450).nearestFontWeight, FontWeight.w500);
      expect(weighted(440).nearestFontWeight, FontWeight.w400);
      expect(weighted(1000).nearestFontWeight, FontWeight.w900);
      expect(weighted(1).nearestFontWeight, FontWeight.w100);
      expect(weighted(450).toTextStyle().fontVariations, const <FontVariation>[
        FontVariation('wght', 450),
      ]);
    });

    test('emphasized adds the family\'s weight step and changes nothing else: '
        'heading-1 500 → 600 by default; under m3-like a label 500 → 700', () {
      final TanreiTypescale scale = tanreiSystem.typescale;
      expect(
        scale.emphasis,
        const TanreiTypeEmphasis(display: 100, heading: 100, body: 100, label: 100),
      );
      final TanreiTextStyle h1 = scale.heading1.emphasized(scale.emphasis);
      expect(scale.heading1.weight, 500);
      expect(h1.weight, 600);
      expect(h1.family, TanreiTypeFamily.heading);
      expect((h1.size, h1.tracking, h1.lineHeight), (32.0, scale.heading1.tracking, 40.0));
      expect(h1.font, same(scale.heading1.font));
      // The family of a role: its first name segment; caption, code and eyebrow take label.
      expect(scale.display.family, TanreiTypeFamily.display);
      expect(scale.bodySmall.family, TanreiTypeFamily.body);
      expect(scale.caption.family, TanreiTypeFamily.label);
      expect(scale.code.family, TanreiTypeFamily.label);
      expect(scale.eyebrow.family, TanreiTypeFamily.label);
      // m3-like: +100 on display, headings and body, +200 on labels.
      final TanreiTypescale m3 = m3LikeSystem.typescale;
      expect(m3.emphasis.label, 200);
      expect(m3.label.weight, 500);
      expect(m3.label.emphasized(m3.emphasis).weight, 700);
      expect(m3.emphasis[TanreiTypeFamily.label], 200);
      // The theme accessor: the same weight on the wght axis, nothing else moves.
      const TanreiThemeData theme = TanreiThemeData();
      final TextStyle plain = theme.textStyle(scale.heading1);
      final TextStyle stressed = theme.textStyle(scale.heading1, emphasized: true);
      expect(plain.fontVariations, const <FontVariation>[FontVariation('wght', 500)]);
      expect(stressed.fontVariations, const <FontVariation>[FontVariation('wght', 600)]);
      expect(stressed.fontWeight, FontWeight.w600);
      expect(
        stressed.copyWith(fontWeight: plain.fontWeight, fontVariations: plain.fontVariations),
        plain,
      );
      expect(
        const TanreiThemeData(
          system: m3LikeSystem,
        ).textStyle(m3.label, emphasized: true).fontVariations,
        const <FontVariation>[FontVariation('wght', 700)],
      );
    });

    test('easing tokens convert to Cubic curves', () {
      final TanreiCubicBezier token = tanreiSystem.motion.easing.standard;
      expect(token.toCurve(), isA<Cubic>());
      expect(token.toCurve().a, token.x1);
      expect(token.toCurve().d, token.y2);
      final int short3 = tanreiSystem.motion.duration.short3;
      expect(tanreiDuration(short3).inMilliseconds, short3);
    });
  });
}
