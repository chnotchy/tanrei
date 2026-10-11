import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

import '../generated/tokens.g.dart';

/// A font stack as Flutter takes it: `TextStyle.fontFamily` and `TextStyle.fontFamilyFallback`.
typedef TanreiResolvedFontStack = ({String? fontFamily, List<String>? fontFamilyFallback});

/// Delivers a font stack of the design system to Flutter.
///
/// Flutter resolves a text run family by family: `fontFamily`, then each `fontFamilyFallback`, then
/// the platform's default font. A family that is neither registered by the app (`pubspec.yaml`,
/// `FontLoader`) nor installed on the device is skipped. So:
///
/// * the named [TanreiFontStack.families] are passed in order — the first as `fontFamily`, the
///   rest as `fontFamilyFallback`;
/// * the generic class ends the stack with the platform's fonts of that class
///   ([tanreiPlatformFontFamilies]). For `sansSerif` that is nothing at all, because Flutter's
///   last resort already is the platform's UI font;
/// * a `system` stack puts the platform's font FIRST: no `fontFamily` for `sansSerif` (Flutter then
///   draws with the OS font — San Francisco on Apple platforms, Roboto on Android, Segoe UI on
///   Windows), the platform's monospace or serif families otherwise; the named families follow.
///
/// No CSS keyword (`system-ui`, `ui-monospace`, `sans-serif`, …) ever becomes a family name.
extension TanreiFontStackToFlutter on TanreiFontStack {
  /// `fontFamily` / `fontFamilyFallback` for [platform] (default: [defaultTargetPlatform]).
  TanreiResolvedFontStack resolve({TargetPlatform? platform}) {
    final List<String> platformFonts = tanreiPlatformFontFamilies(
      generic,
      platform ?? defaultTargetPlatform,
    );
    if (system && platformFonts.isEmpty) {
      return (fontFamily: null, fontFamilyFallback: families.isEmpty ? null : families);
    }
    final List<String> ordered = system
        ? <String>[...platformFonts, ...families]
        : <String>[...families, ...platformFonts];
    return (
      fontFamily: ordered.isEmpty ? null : ordered.first,
      fontFamilyFallback: ordered.length > 1 ? ordered.sublist(1) : null,
    );
  }
}

/// The families that stand for a generic font class on [platform], most specific first.
///
/// `sansSerif` is empty on every platform: with no family, Flutter draws with the platform's own
/// UI font. For `monospace` and `serif` Flutter has no generic family, so the fonts each OS ships
/// are named. `TanreiFontGeneric` has no other value: the token pipeline maps the CSS generics
/// without a platform font (`cursive`, `fantasy`, `math`, `emoji`) to `sansSerif`.
///
/// Where each name comes from (only the Apple rows have also been seen drawn):
///
/// * **iOS, macOS** — `Menlo`, `Courier`, `Times New Roman`, `Times`: the operating systems'
///   own font directories. macOS 26: `/System/Library/Fonts/{Menlo,Courier,Times}.ttc` and
///   `…/Supplemental/Times New Roman.ttf`. iOS 26 (simulator runtime, `System/Library/Fonts`):
///   `CoreUI/Menlo.ttc`, `Core/Courier.ttc`, `Core/TimesNewRoman.ttf` — iOS has no `Times`, which
///   is why `Times New Roman` comes first. Apple's list: developer.apple.com/fonts/system-fonts.
/// * **Android** — `monospace` and `serif` are `<family name="…">` entries of the platform's
///   `fonts.xml` (AOSP `frameworks/base/data/fonts/fonts.xml`, shipped in the SDK as
///   `platforms/android-*/data/fonts/fonts.xml`); Flutter's Android font manager
///   (Skia `SkFontMgr_android`) matches family names against exactly that file.
/// * **Fuchsia** — `monospace` and `serif` are generic families Skia's Fuchsia font manager maps
///   to `fuchsia.fonts.GenericFontFamily` by name (`kGenericFontFamiliesByName` in Skia
///   `src/ports/SkFontMgr_fuchsia.cpp`).
/// * **Windows** — `Consolas`, `Courier New`, `Times New Roman`, `Georgia` are in the base font
///   list of Windows 11, not in an optional feature
///   (learn.microsoft.com/typography/fonts/windows_11_font_list).
/// * **Linux** — no font is guaranteed. `DejaVu Sans Mono` / `DejaVu Serif` and `Liberation Mono`
///   / `Liberation Serif` are the defaults of the large distributions, and the last entry is the
///   fontconfig alias `monospace` / `serif` (fontconfig `conf.d/60-latin.conf`), which Flutter's
///   Linux font manager resolves as the user configured it (Skia
///   `src/ports/SkFontMgr_fontconfig.cpp`, `onMatchFamilyStyle`: a generic name matches through
///   its preferred substitutions).
///
/// On Flutter web (CanvasKit, skwasm) NONE of these names resolve: the engine cannot read the
/// fonts installed on the device, so only families the app registers take effect, and everything
/// else — a `system` stack included — is drawn with the Roboto the engine downloads as its
/// default (Flutter engine `lib/web_ui/lib/src/engine/canvaskit/fonts.dart`: fonts come from the
/// app's `FontManifest.json`, from bytes, or from the downloaded fallbacks, "We chose Roboto to
/// match Android"; there is no access to local fonts).
List<String> tanreiPlatformFontFamilies(TanreiFontGeneric generic, TargetPlatform platform) =>
    switch ((generic, platform)) {
      (TanreiFontGeneric.sansSerif, _) => const <String>[],
      (TanreiFontGeneric.monospace, TargetPlatform.iOS || TargetPlatform.macOS) => const <String>[
        'Menlo',
        'Courier',
      ],
      (TanreiFontGeneric.monospace, TargetPlatform.windows) => const <String>[
        'Consolas',
        'Courier New',
      ],
      (TanreiFontGeneric.monospace, TargetPlatform.linux) => const <String>[
        'DejaVu Sans Mono',
        'Liberation Mono',
        'monospace',
      ],
      (TanreiFontGeneric.monospace, TargetPlatform.android || TargetPlatform.fuchsia) =>
        const <String>['monospace'],
      (TanreiFontGeneric.serif, TargetPlatform.iOS || TargetPlatform.macOS) => const <String>[
        'Times New Roman',
        'Times',
      ],
      (TanreiFontGeneric.serif, TargetPlatform.windows) => const <String>[
        'Times New Roman',
        'Georgia',
      ],
      (TanreiFontGeneric.serif, TargetPlatform.linux) => const <String>[
        'DejaVu Serif',
        'Liberation Serif',
        'serif',
      ],
      (TanreiFontGeneric.serif, TargetPlatform.android || TargetPlatform.fuchsia) => const <String>[
        'serif',
      ],
    };

/// Converts typescale tokens to Flutter text styles.
extension TanreiTextStyleToTextStyle on TanreiTextStyle {
  /// The nearest of the nine [FontWeight]s to the numeric token weight (450 → w500).
  FontWeight get nearestFontWeight {
    final int index = (weight / _weightStep).round().clamp(1, FontWeight.values.length) - 1;
    return FontWeight.values[index];
  }

  /// A [TextStyle] for this token.
  ///
  /// The font stack becomes `fontFamily` / `fontFamilyFallback` as [TanreiFontStackToFlutter]
  /// describes, for [platform] (default: [defaultTargetPlatform]). The exact numeric weight is also
  /// passed on the `wght` axis so variable fonts render in-between weights. `height` is the token
  /// line height divided by the size, with leading split evenly above and below like CSS
  /// half-leading.
  TextStyle toTextStyle({Color? color, TargetPlatform? platform}) {
    final TanreiResolvedFontStack stack = font.resolve(platform: platform);
    return TextStyle(
      color: color,
      fontFamily: stack.fontFamily,
      fontFamilyFallback: stack.fontFamilyFallback,
      fontSize: size,
      fontWeight: nearestFontWeight,
      fontVariations: <FontVariation>[FontVariation('wght', weight.toDouble())],
      letterSpacing: tracking,
      height: lineHeight / size,
      leadingDistribution: TextLeadingDistribution.even,
    );
  }
}

/// Distance between two adjacent named font weights on the `wght` axis (an OpenType constant).
const int _weightStep = 100;
