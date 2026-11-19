import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../systems.dart';

/// Design systems differ in values, never in tokens: the default system and the shipped presets are
/// instances of the same vocabulary types, and each must be complete on its own.
void main() {
  test('the package ships the default system and two presets', () {
    expect(shippedSystems.map((TanreiSystem s) => s.id), <String>[
      'tanrei',
      'm3-like',
      'cupertino',
    ]);
  });

  for (final TanreiSystem system in shippedSystems) {
    group('system "${system.id}"', () {
      test(
        'every role a component token or elevation layer references exists in all six schemes',
        () {
          final Map<String, Set<TanreiColorRole>> referenced = referencedRoles(system);
          expect(referenced.values.expand((Set<TanreiColorRole> r) => r), isNotEmpty);
          expect(unknownRoles(system), isEmpty);
        },
      );

      test('every referenced role resolves without the release fallback in all six schemes', () {
        // `colors[role]` asserts on an unknown role; reading each one proves no paint can hit it.
        for (final TanreiColors colors in schemesOf(system).values) {
          for (final Set<TanreiColorRole> roles in referencedRoles(system).values) {
            for (final TanreiColorRole role in roles) {
              expect(() => colors[role], returnsNormally, reason: role.name);
            }
          }
        }
      });

      test('every intent resolves to four roles in all six schemes', () {
        expect(system.intents, isNotEmpty);
        expect(
          system.intents,
          containsAll(<TanreiColorRole>[
            TanreiColorRole.primary,
            TanreiColorRole.secondary,
            TanreiColorRole.error,
          ]),
        );
        for (final MapEntry<String, TanreiColors> scheme in schemesOf(system).entries) {
          for (final TanreiColorRole intent in system.intents) {
            for (final String name in <String>[
              intent.name,
              'on-${intent.name}',
              '${intent.name}-container',
              'on-${intent.name}-container',
            ]) {
              expect(
                scheme.value.has(TanreiColorRole(name)),
                isTrue,
                reason: '$name (${scheme.key})',
              );
            }
          }
        }
      });

      test(
        'every size and variant the system has resolves to its own tokens, never the fallback',
        () {
          final List<String> reports = <String>[];
          final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
          debugTanreiReportUnknownValue = (String kind, String key, String _) =>
              reports.add('$kind $key');
          addTearDown(() => debugTanreiReportUnknownValue = previous);

          expect(system.button.sizes.keys, containsAllInOrder(TanreiButtonSize.core));
          expect(system.button.variants.keys, containsAllInOrder(TanreiButtonVariant.core));
          for (final TanreiButtonSize size in system.button.sizes.keys) {
            expect(system.button.sizes.has(size), isTrue, reason: size.name);
            expect(system.button.sizes[size].containerHeight, greaterThan(0), reason: size.name);
          }
          for (final TanreiButtonVariant variant in system.button.variants.keys) {
            expect(system.button.variants.has(variant), isTrue, reason: variant.name);
            expect(system.button.variants[variant].enabled, isNotNull, reason: variant.name);
          }
          expect(system.button.sizes[TanreiButtonSize.medium], same(system.button.sizes.medium));
          expect(
            system.button.variants[TanreiButtonVariant.filled],
            same(system.button.variants.filled),
          );
          expect(reports, isEmpty);
        },
      );

      test('every declared (open-key) role is present in all six schemes', () {
        final Set<TanreiColorRole> declared = system.schemes.light.extra.keys.toSet();
        for (final MapEntry<String, TanreiColors> scheme in schemesOf(system).entries) {
          expect(scheme.value.extra.keys.toSet(), declared, reason: scheme.key);
        }
      });
    });
  }

  group('open role keys', () {
    test('the default system declares accent; the presets do not', () {
      expect(tanreiSystem.intents, contains(TanreiColorRoles.accent));
      for (final TanreiColors colors in schemesOf(tanreiSystem).values) {
        expect(colors[TanreiColorRoles.accent], colors.extra[const TanreiColorRole('accent')]);
        expect(colors[TanreiColorRoles.onAccentContainer], isNot(colors.onPrimaryContainer));
      }
      for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
        expect(preset.intents, isNot(contains(TanreiColorRoles.accent)));
        expect(preset.schemes.light.has(TanreiColorRoles.accent), isFalse);
      }
    });

    test('m3-like declares tertiary as a palette of its own', () {
      expect(m3LikeSystem.intents, contains(M3LikeColorRoles.tertiary));
      for (final TanreiColors colors in schemesOf(m3LikeSystem).values) {
        final Color tertiary = colors[M3LikeColorRoles.tertiary];
        expect(tertiary, colors.extra[const TanreiColorRole('tertiary')]);
        expect(tertiary, isNot(colors.primary));
        expect(tertiary, isNot(colors.secondary));
        expect(const TanreiPaint.role(M3LikeColorRoles.tertiary).resolve(colors), tertiary);
      }
      expect(tanreiSystem.schemes.light.has(M3LikeColorRoles.tertiary), isFalse);
      expect(cupertinoSystem.schemes.light.has(M3LikeColorRoles.tertiary), isFalse);
    });

    test('a theme on a preset reads the preset schemes', () {
      const TanreiThemeData theme = TanreiThemeData(
        brightness: Brightness.dark,
        system: m3LikeSystem,
      );
      expect(theme.colors, m3LikeSystem.schemes.dark);
      expect(
        theme.color(M3LikeColorRoles.tertiaryContainer),
        m3LikeSystem.schemes.dark.extra[M3LikeColorRoles.tertiaryContainer],
      );
    });
  });
}
