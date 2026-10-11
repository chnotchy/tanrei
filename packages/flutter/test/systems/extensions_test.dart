import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';

/// Vocabulary extensions end to end: `test_fixtures/acme_system.g.dart` is what `tanrei build` writes into a
/// product's package for `packages/tokens-build/test/fixtures/acme.system.json`, a layer that
/// extends the vocabulary in every allowed way. It only uses the public library.
/// Regenerate it with `node packages/flutter/tool/generate_acme_fixture.mjs` (repository root).
void main() {
  const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
  final TanreiButtonTokens button = acmeSystem.button;

  group('a value on a component axis', () {
    test('size 3x is cloned from large, scaled, and keeps its override', () {
      expect(button.sizes.has(AcmeButtonSize.size3x), isTrue);
      expect(button.sizes.keys, <TanreiButtonSize>[
        ...TanreiButtonSize.core,
        const TanreiButtonSize('3x'),
      ]);
      final TanreiButtonSizeTokens size = button.sizes[const TanreiButtonSize('3x')];
      expect(size, same(button.sizes.size3x));
      expect(size.containerHeight, 60);
      expect(size.containerPaddingInlineStart, 24);
      expect(size.containerPaddingInlineEnd, 24);
      expect(size.containerPaddingInlineStartWithIcon, 24);
      expect(size.containerPaddingBlock, 16, reason: 'overridden under "tokens"');
      expect(size.labelTypescale, same(button.sizes.large.labelTypescale));
      expect(size.iconSize, button.sizes.large.iconSize * 1.5);
      // The core sizes are untouched.
      expect(button.sizes.medium.containerHeight, tanreiSystem.button.sizes.medium.containerHeight);
    });

    test('variant danger is cloned from filled; the pattern rules value every state', () {
      expect(button.variants.has(AcmeButtonVariant.danger), isTrue);
      final TanreiButtonVariantTokens danger = button.variants[const TanreiButtonVariant('danger')];
      expect(danger, same(button.variants.danger));
      expect(danger.enabled.containerColor, const TanreiPaint.role(TanreiColorRole.error));
      expect(danger.enabled.labelColor, const TanreiPaint.role(TanreiColorRole.onError));
      for (final TanreiColors colors in schemesOf(acmeSystem).values) {
        final Color rest = danger.enabled.containerColor.resolve(colors);
        expect(rest, colors.error);
        for (final TanreiInteractionState state in <TanreiInteractionState>[
          TanreiInteractionState.hovered,
          TanreiInteractionState.pressed,
          TanreiInteractionState.disabled,
        ]) {
          expect(danger.of(state).containerColor.resolve(colors), isNot(rest), reason: state.name);
        }
      }
      expect(
        danger.hovered.containerColor,
        // The strength is acme's own hover opacity (the fixture values its three state layers apart).
        TanreiPaint.mix(
          const TanreiPaint.role(TanreiColorRole.error),
          const TanreiPaint.role(TanreiColorRole.onError),
          acmeSystem.state.hoverStateLayerOpacity,
        ),
      );
    });

    testWidgets('a Button with size 3x and variant danger renders with those values', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            size: AcmeButtonSize.size3x,
            variant: AcmeButtonVariant.danger,
            child: const Text('Delete'),
          ),
          theme: theme,
        ),
      );
      final Finder container = find
          .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
          .first;
      expect(tester.getSize(container).height, 60);
      final TanreiContainerDecoration decoration =
          tester.widget<DecoratedBox>(container).decoration as TanreiContainerDecoration;
      expect(decoration.color, acmeSystem.schemes.light.error);
      final Rect box = tester.getRect(container);
      final Rect label = tester.getRect(find.text('Delete'));
      expect(label.left - box.left, 24);
      expect(box.right - label.right, 24);
      final TextStyle style = DefaultTextStyle.of(tester.element(find.text('Delete'))).style;
      expect(style.color, acmeSystem.schemes.light.onError);
      expect(style.fontSize, button.sizes.large.labelTypescale.size);
      expect(tester.takeException(), isNull);
    });

    testWidgets('BTN-7: the same Button under a system without those values is the default '
        'button, and reports both', (WidgetTester tester) async {
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add('$kind "$key" -> $fallback');
      addTearDown(() => debugTanreiReportUnknownValue = previous);

      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(
            onPressed: () {},
            size: AcmeButtonSize.size3x,
            variant: AcmeButtonVariant.danger,
            child: const Text('Delete'),
          ),
        ),
      );
      final Finder container = find
          .descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox))
          .first;
      expect(tester.getSize(container).height, tanreiSystem.button.sizes.medium.containerHeight);
      expect(
        (tester.widget<DecoratedBox>(container).decoration as TanreiContainerDecoration).color,
        tanreiSystem.schemes.light.primary,
      );
      expect(reports.toSet(), <String>{
        'button size "3x" -> medium',
        'button variant "danger" -> filled',
      });
    });
  });

  group('a step in a series', () {
    test('space1200 is 96 through the typed accessor and the keyed lookup', () {
      expect(acmeSystem.space.space1200, 96);
      expect(acmeSystem.space['space1200'], 96);
      expect(acmeSystem.space.extra, <String, double>{'space1200': 96});
      // Core steps answer the same lookup.
      expect(acmeSystem.space['space200'], acmeSystem.space.space200);
    });

    test(
      'a system without the step answers null by key; the typed accessor never throws: it '
      'answers with the value the declaring system gives the step, and debug builds report it',
      () {
        final List<String> reports = <String>[];
        final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
        debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
            reports.add('$kind "$key" -> $fallback');
        addTearDown(() => debugTanreiReportUnknownValue = previous);

        expect(tanreiSystem.space['space1200'], isNull);
        expect(tanreiSystem.space.space1200, 96);
        expect(reports, <String>['space "space1200" -> the value of "acme"']);

        // Under the system that has the step nothing is reported.
        reports.clear();
        expect(acmeSystem.space.space1200, 96);
        expect(reports, isEmpty);
      },
    );

    test(
      'a spring the layer added (bouncy) is typed in each scheme, and its accessor never throws',
      () {
        final TanreiMotion motion = acmeSystem.motion;
        expect(motion.springStandard.bouncy, same(motion.springStandard['bouncy']));
        expect(motion.springExpressive.bouncy, same(motion.springExpressive['bouncy']));
        expect(motion.springStandard.bouncy.damping, 0.5);
        expect(motion.springExpressive.bouncy.damping, 0.4);
        expect(motion.springStandard.extra.keys, <String>['bouncy']);

        final List<String> reports = <String>[];
        final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
        debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
            reports.add('$kind "$key" -> $fallback');
        addTearDown(() => debugTanreiReportUnknownValue = previous);
        expect(tanreiSystem.motion.springStandard['bouncy'], isNull);
        expect(tanreiSystem.motion.springStandard.bouncy, isA<TanreiSpringSpec>());
        expect(reports, <String>['spring "bouncy" -> the value of "acme"']);
      },
    );

    test('under a system without the spring, the accessor answers with the FIRST scheme of the '
        'declaring system that has it — whichever scheme it is read from', () {
      // A `TanreiSpring` does not know which scheme it is, so the fallback cannot follow the
      // scheme. "acme" declares `bouncy` in `expressive` first (the order of the IR), and that is
      // the value both schemes of the default system answer with. The generated doc comment of
      // the accessor says so, naming the scheme.
      final List<String> reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add('$kind "$key" -> $fallback');
      addTearDown(() => debugTanreiReportUnknownValue = previous);

      final TanreiSpringSpec declared = acmeSystem.motion.springExpressive['bouncy']!;
      expect(acmeSystem.motion.springStandard['bouncy'], isNot(same(declared)));
      for (final TanreiSystem system in <TanreiSystem>[tanreiSystem, m3LikeSystem]) {
        expect(system.motion.springStandard.bouncy, same(declared), reason: system.id);
        expect(system.motion.springExpressive.bouncy, same(declared), reason: system.id);
      }
      expect(reports, List<String>.filled(4, 'spring "bouncy" -> the value of "acme"'));

      final String generated = File('test_fixtures/acme_system.g.dart').readAsStringSync();
      expect(
        generated,
        contains(
          'That value is the one of the `expressive` spring scheme — the first scheme of "acme" '
          'that declares the spring',
        ),
      );
    });

    test('springs are a series like the others: named core springs, `extra`, a lookup by key', () {
      const TanreiSpringSpec bouncy = TanreiSpringSpec(
        damping: 0.4,
        stiffness: 900,
        easing: TanreiCubicBezier(0.3, 1.4, 0.6, 1),
        durationMs: 500,
      );
      final TanreiSpring standard = tanreiSystem.motion.springStandard;
      expect(standard.extra, isEmpty);
      expect(standard['default-spatial'], same(standard.defaultSpatial));
      expect(standard['bouncy'], isNull);

      final TanreiSpring extended = standard.copyWith(
        extra: <String, TanreiSpringSpec>{'bouncy': bouncy},
      );
      expect(extended['bouncy'], same(bouncy));
      expect(extended['fast-effects'], same(standard.fastEffects));

      // A spring scheme of its own goes next to `standard` and `expressive`.
      final TanreiMotion motion = tanreiSystem.motion.copyWith(
        extra: <String, TanreiSpring>{'playful': extended},
      );
      expect(motion.spring('standard'), same(standard));
      expect(motion.spring('playful'), same(extended));
      expect(motion.spring('unknown'), isNull);
    });

    test('a color role (brand-glow) resolves in all six schemes and follows the scheme', () {
      final Set<Color> seen = <Color>{};
      for (final MapEntry<String, TanreiColors> scheme in schemesOf(acmeSystem).entries) {
        expect(scheme.value.has(AcmeColorRoles.brandGlow), isTrue, reason: scheme.key);
        final Color glow = scheme.value[const TanreiColorRole('brand-glow')];
        expect(glow, scheme.value.brandGlow, reason: scheme.key);
        expect(const TanreiPaint.role(AcmeColorRoles.brandGlow).resolve(scheme.value), glow);
        seen.add(glow);
      }
      expect(seen.length, greaterThan(1), reason: 'light and dark differ');
      expect(
        const TanreiThemeData(
          system: acmeSystem,
          brightness: Brightness.dark,
        ).color(AcmeColorRoles.brandGlow),
        acmeSystem.schemes.dark.brandGlow,
      );
    });
  });

  group('the typed accessor of an added color role never throws or asserts', () {
    late List<String> reports;
    setUp(() {
      reports = <String>[];
      final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
      debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
          reports.add('$kind "$key" -> $fallback');
      addTearDown(() => debugTanreiReportUnknownValue = previous);
    });

    test(
      'acme\'s brand-glow under the default system: acme\'s color of the SAME scheme, reported',
      () {
        final Map<String, TanreiColors> declaring = schemesOf(acmeSystem);
        final Set<Color> seen = <Color>{};
        for (final MapEntry<String, TanreiColors> scheme in schemesOf(tanreiSystem).entries) {
          expect(scheme.value.has(AcmeColorRoles.brandGlow), isFalse, reason: scheme.key);
          final Color glow = scheme.value.brandGlow;
          expect(glow, declaring[scheme.key]!.extra[AcmeColorRoles.brandGlow], reason: scheme.key);
          seen.add(glow);
        }
        expect(seen.length, greaterThan(1), reason: 'the fallback follows the scheme');
        expect(reports, List<String>.filled(6, 'color role "brand-glow" -> the value of "acme"'));
      },
    );

    test('m3-like\'s added roles under the default system, in all six schemes', () {
      final Map<String, TanreiColors> declaring = schemesOf(m3LikeSystem);
      for (final MapEntry<String, TanreiColors> scheme in schemesOf(tanreiSystem).entries) {
        final TanreiColors m3 = declaring[scheme.key]!;
        expect(scheme.value.surfaceTint, m3[M3LikeColorRoles.surfaceTint], reason: scheme.key);
        expect(scheme.value.primaryFixed, m3[M3LikeColorRoles.primaryFixed], reason: scheme.key);
        expect(
          scheme.value.onTertiaryFixedVariant,
          m3[M3LikeColorRoles.onTertiaryFixedVariant],
          reason: scheme.key,
        );
      }
      expect(reports, hasLength(18));
      expect(reports.toSet(), <String>{
        'color role "surface-tint" -> the value of "m3-like"',
        'color role "primary-fixed" -> the value of "m3-like"',
        'color role "on-tertiary-fixed-variant" -> the value of "m3-like"',
      });
      // A theme of the default system, dark and high contrast, reads the dark-high color.
      const TanreiThemeData darkHigh = TanreiThemeData(
        brightness: Brightness.dark,
        contrast: TanreiContrast.high,
      );
      expect(darkHigh.colors.surfaceTint, m3LikeSystem.schemes.darkHigh.surfaceTint);
      expect(darkHigh.colors.surfaceTint, isNot(m3LikeSystem.schemes.light.surfaceTint));
    });

    test('under the declaring system, and one that inherits the role, nothing is reported', () {
      expect(acmeSystem.schemes.dark.brandGlow, isA<Color>());
      expect(m3LikeSystem.schemes.dark.surfaceTint, isA<Color>());
      expect(
        m3ExpressiveLikeSystem.schemes.dark.surfaceTint,
        m3ExpressiveLikeSystem.schemes.dark[M3LikeColorRoles.surfaceTint],
      );
      expect(reports, isEmpty);
    });

    testWidgets('a widget that reads it under the default system builds without an error', (
      WidgetTester tester,
    ) async {
      late Color drawn;
      await tester.pumpWidget(
        tanreiTestApp(
          theme: TanreiThemeData.dark,
          Builder(
            builder: (BuildContext context) {
              drawn = TanreiTheme.of(context).colors.brandGlow;
              return ColoredBox(color: drawn, child: const SizedBox.square(dimension: 10));
            },
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(drawn, acmeSystem.schemes.dark.extra[AcmeColorRoles.brandGlow]);
      expect(reports, <String>['color role "brand-glow" -> the value of "acme"']);
    });
  });

  group("a layer's own tokens", () {
    test('are a typed object of their own, not part of TanreiSystem', () {
      expect(acmeTokens.rating.star.size, 20);
      expect(acmeTokens.rating.gap, acmeSystem.space.space50);
      expect(acmeTokens.rating.star.color, const TanreiPaint.role(TanreiColorRole.warning));
    });

    test('their colors are paints: they follow the scheme', () {
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData scheme = theme.copyWith(brightness: brightness, contrast: contrast);
          expect(scheme.paint(acmeTokens.rating.star.color), scheme.colors.warning);
        }
      }
      expect(
        theme.paint(acmeTokens.rating.star.color),
        isNot(theme.copyWith(brightness: Brightness.dark).paint(acmeTokens.rating.star.color)),
      );
    });
  });

  group('structure', () {
    test('the extended system is complete: every referenced role exists in all six schemes', () {
      expect(buttonVariantsOf(button).keys, contains('danger'));
      expect(unknownRoles(acmeSystem), isEmpty);
    });

    test('extending changes no core value', () {
      expect(acmeSystem.space.space900, tanreiSystem.space.space900);
      expect(acmeSystem.schemes.light.primary, tanreiSystem.schemes.light.primary);
      expect(
        button.variants.filled.enabled.containerColor,
        tanreiSystem.button.variants.filled.enabled.containerColor,
      );
    });
  });

  group('complexity is paid only by those who extend', () {
    // A palette a system DECLARES (`accent` in the default system, `tertiary` in m3-like) is
    // delivered through `TanreiColors.extra`; that one line per scheme is not an extension and is
    // the only mention allowed.
    final RegExp declaredPaletteRoles = RegExp(
      r'^\s*extra: <TanreiColorRole, Color>\{.*$',
      multiLine: true,
    );

    test('tanrei_system.g.dart does not mention extensions', () {
      final String source = File('lib/src/generated/tanrei_system.g.dart').readAsStringSync();
      final String values = source.replaceAll(declaredPaletteRoles, '');
      expect(RegExp(r'\bextra\b').hasMatch(values), isFalse, reason: '"extra"');
      expect(values.toLowerCase(), isNot(contains('extension')));
      expect(values.toLowerCase(), isNot(contains('acme')));
    });

    test('cupertino declares no palette and adds three text roles, so `extra` appears '
        'for those alone: once in the values, once per typed accessor', () {
      final String source = File('lib/src/generated/cupertino_system.g.dart').readAsStringSync();
      expect(source, isNot(contains('extra: <TanreiColorRole, Color>')));
      final List<String> mentions = source
          .split('\n')
          .where((String line) => RegExp(r'\bextra\b').hasMatch(line))
          .toList();
      expect(mentions.where((String l) => l.trim().startsWith('extra:')), <String>[
        '    extra: <String, TanreiTextStyle>{',
      ]);
      expect(
        mentions.where((String l) => l.contains('typescale.extra[')).map((String l) => l.trim()),
        <Matcher>[
          startsWith('TanreiTextStyle get bodyCallout =>'),
          startsWith('TanreiTextStyle get bodySubhead =>'),
          startsWith('TanreiTextStyle get captionSmall =>'),
        ],
      );
      expect(mentions, hasLength(5), reason: 'the values, the section comment, three accessors');
      // The added roles have families like every role: the first name segment.
      expect(cupertinoSystem.typescale.bodyCallout.family, TanreiTypeFamily.body);
      expect(cupertinoSystem.typescale.captionSmall.family, TanreiTypeFamily.label);
    });

    test('the fixture has exactly one extensions section', () {
      final String source = File('test_fixtures/acme_system.g.dart').readAsStringSync();
      expect('VOCABULARY EXTENSIONS'.allMatches(source), hasLength(1));
    });
  });
}
