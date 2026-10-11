import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../systems.dart';

/// CSS keywords a font stack may contain on the web. None of them is a font family on Flutter.
const Set<String> cssKeywords = <String>{
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'sans-serif',
  'cursive',
  'fantasy',
};

void main() {
  group('the font stack of a design system, as the IR read it', () {
    test('default system: Inter, Noto Sans JP, Noto Sans, then the platform sans-serif', () {
      final TanreiFontStack font = tanreiSystem.typescale.label.font;
      expect(font.families, <String>['Inter', 'Noto Sans JP', 'Noto Sans']);
      expect(font.generic, TanreiFontGeneric.sansSerif);
      expect(font.system, isFalse);
      expect(tanreiSystem.typefaces.plain.families, font.families);
      expect(tanreiSystem.typefaces.mono.families, <String>['Roboto Mono', 'Noto Sans JP']);
      expect(tanreiSystem.typefaces.mono.generic, TanreiFontGeneric.monospace);
    });

    test('m3-like: Roboto', () {
      final TanreiFontStack font = m3LikeSystem.typescale.label.font;
      expect(font.families, <String>['Roboto']);
      expect(font.generic, TanreiFontGeneric.sansSerif);
      expect(font.system, isFalse);
      expect(m3LikeSystem.typefaces.mono.families, <String>['Roboto Mono']);
    });

    test('cupertino: the platform font first, Inter after it', () {
      final TanreiFontStack font = cupertinoSystem.typescale.label.font;
      expect(font.system, isTrue);
      expect(font.families, <String>['Inter']);
      expect(font.generic, TanreiFontGeneric.sansSerif);
      expect(cupertinoSystem.typefaces.mono.system, isTrue);
      expect(cupertinoSystem.typefaces.mono.families, <String>['SF Mono', 'Menlo']);
    });

    for (final TanreiSystem system in shippedSystems) {
      test('"${system.id}": no CSS keyword is ever a font family', () {
        final List<TanreiFontStack> stacks = <TanreiFontStack>[
          system.typefaces.brand,
          system.typefaces.plain,
          system.typefaces.mono,
          system.typefaces.icon,
          system.icon.familyUnselected,
          system.icon.familySelected,
          system.typescale.label.font,
          system.typescale.body.font,
          system.typescale.display.font,
        ];
        for (final TanreiFontStack stack in stacks) {
          for (final TargetPlatform platform in TargetPlatform.values) {
            final TanreiResolvedFontStack resolved = stack.resolve(platform: platform);
            final List<String> delivered = <String>[
              if (resolved.fontFamily case final String family) family,
              ...?resolved.fontFamilyFallback,
            ];
            expect(
              delivered.map((String f) => f.toLowerCase()).toSet().intersection(cssKeywords),
              isEmpty,
              reason: '$delivered on $platform',
            );
            expect(delivered, containsAll(stack.families));
          }
        }
      });
    }
  });

  group('delivered to Flutter', () {
    test('default system: fontFamily = the first named family, fontFamilyFallback = the rest, on '
        'every platform (the platform sans-serif is Flutter\'s own last resort)', () {
      for (final TargetPlatform platform in TargetPlatform.values) {
        final TextStyle style = tanreiSystem.typescale.label.toTextStyle(platform: platform);
        expect(style.fontFamily, 'Inter');
        expect(style.fontFamilyFallback, <String>['Noto Sans JP', 'Noto Sans']);
      }
    });

    test('m3-like: Roboto and no fallback list', () {
      final TextStyle style = m3LikeSystem.typescale.label.toTextStyle();
      expect(style.fontFamily, 'Roboto');
      expect(style.fontFamilyFallback, isNull);
    });

    test('cupertino: NO family, so Flutter draws with the font of the OS — on and off Apple '
        'platforms — and Inter is only a fallback', () {
      for (final TargetPlatform platform in TargetPlatform.values) {
        final TextStyle style = cupertinoSystem.typescale.label.toTextStyle(platform: platform);
        expect(style.fontFamily, isNull, reason: '$platform');
        expect(style.fontFamilyFallback, <String>['Inter'], reason: '$platform');
      }
    });

    test('monospace: the named families, then the monospace fonts of the platform', () {
      final TanreiFontStack mono = tanreiSystem.typefaces.mono;
      final TanreiResolvedFontStack mac = mono.resolve(platform: TargetPlatform.macOS);
      expect(mac.fontFamily, 'Roboto Mono');
      expect(mac.fontFamilyFallback, <String>['Noto Sans JP', 'Menlo', 'Courier']);
      expect(mono.resolve(platform: TargetPlatform.android).fontFamilyFallback, <String>[
        'Noto Sans JP',
        'monospace',
      ]);
      expect(mono.resolve(platform: TargetPlatform.windows).fontFamilyFallback, <String>[
        'Noto Sans JP',
        'Consolas',
        'Courier New',
      ]);
      for (final TargetPlatform platform in TargetPlatform.values) {
        expect(
          tanreiPlatformFontFamilies(TanreiFontGeneric.monospace, platform),
          isNotEmpty,
          reason: '$platform',
        );
        expect(tanreiPlatformFontFamilies(TanreiFontGeneric.sansSerif, platform), isEmpty);
      }
    });

    test('a system monospace stack (cupertino) starts with the platform monospace', () {
      final TanreiFontStack mono = cupertinoSystem.typefaces.mono;
      final TanreiResolvedFontStack ios = mono.resolve(platform: TargetPlatform.iOS);
      expect(ios.fontFamily, 'Menlo');
      expect(ios.fontFamilyFallback, <String>['Courier', 'SF Mono', 'Menlo']);
      expect(mono.resolve(platform: TargetPlatform.linux).fontFamily, 'DejaVu Sans Mono');
    });

    test('the platform families of every generic class on every TargetPlatform (sources: the doc '
        'comment of tanreiPlatformFontFamilies)', () {
      const Map<TargetPlatform, (List<String>, List<String>)>
      expected = <TargetPlatform, (List<String>, List<String>)>{
        TargetPlatform.iOS: (<String>['Menlo', 'Courier'], <String>['Times New Roman', 'Times']),
        TargetPlatform.macOS: (<String>['Menlo', 'Courier'], <String>['Times New Roman', 'Times']),
        TargetPlatform.android: (<String>['monospace'], <String>['serif']),
        TargetPlatform.fuchsia: (<String>['monospace'], <String>['serif']),
        TargetPlatform.windows: (
          <String>['Consolas', 'Courier New'],
          <String>['Times New Roman', 'Georgia'],
        ),
        TargetPlatform.linux: (
          <String>['DejaVu Sans Mono', 'Liberation Mono', 'monospace'],
          <String>['DejaVu Serif', 'Liberation Serif', 'serif'],
        ),
      };
      expect(expected.keys.toSet(), TargetPlatform.values.toSet(), reason: 'every platform');
      for (final TargetPlatform platform in TargetPlatform.values) {
        final (List<String> mono, List<String> serif) = expected[platform]!;
        expect(tanreiPlatformFontFamilies(TanreiFontGeneric.monospace, platform), mono);
        expect(tanreiPlatformFontFamilies(TanreiFontGeneric.serif, platform), serif);
        expect(tanreiPlatformFontFamilies(TanreiFontGeneric.sansSerif, platform), isEmpty);

        // Delivered: a plain stack ends with them, a `system` stack starts with them.
        const TanreiFontStack plain = TanreiFontStack(
          families: <String>['Roboto Mono'],
          generic: TanreiFontGeneric.monospace,
          system: false,
        );
        const TanreiFontStack systemFirst = TanreiFontStack(
          families: <String>['New York'],
          generic: TanreiFontGeneric.serif,
          system: true,
        );
        final TanreiResolvedFontStack a = plain.resolve(platform: platform);
        expect(<String>[a.fontFamily!, ...a.fontFamilyFallback!], <String>['Roboto Mono', ...mono]);
        final TanreiResolvedFontStack b = systemFirst.resolve(platform: platform);
        expect(<String>[b.fontFamily!, ...b.fontFamilyFallback!], <String>[...serif, 'New York']);
      }
      // The three classes are all there are: `cursive`, `fantasy`, `math` and `emoji` arrive as
      // sansSerif (decided in the emitter), i.e. no platform family at all.
      expect(TanreiFontGeneric.values, hasLength(3));
    });

    test('an empty stack resolves to the platform font', () {
      const TanreiFontStack empty = TanreiFontStack(
        families: <String>[],
        generic: TanreiFontGeneric.sansSerif,
        system: false,
      );
      expect(empty.resolve(), (fontFamily: null, fontFamilyFallback: null));
    });
  });
}
