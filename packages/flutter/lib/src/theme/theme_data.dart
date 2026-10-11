import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tanrei_system.g.dart';
import '../generated/tokens.g.dart';
import 'paint.dart';
import 'text_style.dart';

// `package:flutter/widgets.dart` does not export Brightness; re-export it so apps that do not use
// Material can build a TanreiThemeData without importing dart:ui.
export 'dart:ui' show Brightness;

/// How strongly foreground and background roles are separated.
///
/// Maps to the three contrast levels of a design system's color schemes.
enum TanreiContrast {
  /// The default scheme.
  standard,

  /// Increased contrast.
  medium,

  /// Maximum contrast. Chosen automatically when the platform asks for high contrast.
  high,
}

/// The resolved Tanrei theme: a design [system], and the brightness and contrast level that select
/// one of its six color schemes.
///
/// Every token a widget reads comes from [system]: `theme.system.space`, `theme.system.button`, ...
/// Colors are read through the theme ([colors], [color], [paint]) because they depend on the scheme.
@immutable
class TanreiThemeData with Diagnosticable {
  /// Selects one of the six color schemes of [system] (default: the generated Tanrei system).
  const TanreiThemeData({
    this.brightness = Brightness.light,
    this.contrast = TanreiContrast.standard,
    this.system = tanreiSystem,
  }) : _colors = null;

  /// A theme with an explicit color scheme, used for interpolation and custom schemes.
  const TanreiThemeData.raw({
    required this.brightness,
    required this.contrast,
    required TanreiColors colors,
    this.system = tanreiSystem,
  }) : _colors = colors;

  /// The theme that follows the platform: `MediaQuery.platformBrightnessOf` selects light or dark
  /// and `MediaQuery.highContrastOf` selects [TanreiContrast.high].
  ///
  /// Falls back to light / standard when there is no [MediaQuery].
  factory TanreiThemeData.platform(BuildContext context, {TanreiSystem system = tanreiSystem}) {
    final Brightness brightness = MediaQuery.maybePlatformBrightnessOf(context) ?? Brightness.light;
    final bool highContrast = MediaQuery.maybeHighContrastOf(context) ?? false;
    return TanreiThemeData(
      brightness: brightness,
      contrast: highContrast ? TanreiContrast.high : TanreiContrast.standard,
      system: system,
    );
  }

  /// Light scheme, standard contrast.
  static const TanreiThemeData light = TanreiThemeData();

  /// Dark scheme, standard contrast.
  static const TanreiThemeData dark = TanreiThemeData(brightness: Brightness.dark);

  /// Whether the scheme is light or dark.
  final Brightness brightness;

  /// The contrast level of the scheme.
  final TanreiContrast contrast;

  /// The design system every token is read from.
  final TanreiSystem system;

  final TanreiColors? _colors;

  /// Which of the six schemes [brightness] and [contrast] select.
  TanreiScheme get scheme => switch ((brightness, contrast)) {
    (Brightness.light, TanreiContrast.standard) => TanreiScheme.light,
    (Brightness.light, TanreiContrast.medium) => TanreiScheme.lightMedium,
    (Brightness.light, TanreiContrast.high) => TanreiScheme.lightHigh,
    (Brightness.dark, TanreiContrast.standard) => TanreiScheme.dark,
    (Brightness.dark, TanreiContrast.medium) => TanreiScheme.darkMedium,
    (Brightness.dark, TanreiContrast.high) => TanreiScheme.darkHigh,
  };

  /// Every color role of the selected scheme.
  TanreiColors get colors => _colors ?? system.schemes.of(scheme);

  /// Looks up a color [role], optionally multiplying its alpha by a token [opacity].
  Color color(TanreiColorRole role, {double? opacity}) {
    final Color base = colors[role];
    return opacity == null ? base : base.withValues(alpha: base.a * opacity);
  }

  /// Evaluates a component [paint] (a role, a mix, an alpha, nothing, a literal, or one paint per
  /// scheme) in this scheme.
  Color paint(TanreiPaint paint) => paint.resolve(colors, scheme: scheme);

  /// A [TextStyle] for a text style [token] of [system] — `theme.textStyle(system.typescale.heading1)`.
  ///
  /// [emphasized] adds the emphasis step of the token's family
  /// (`system.typescale.emphasis`) to its weight: the same size, tracking and line
  /// height, heavier. [color] and [platform] are those of `toTextStyle()`.
  TextStyle textStyle(
    TanreiTextStyle token, {
    bool emphasized = false,
    Color? color,
    TargetPlatform? platform,
  }) => (emphasized ? token.emphasized(system.typescale.emphasis) : token).toTextStyle(
    color: color,
    platform: platform,
  );

  /// Returns a copy with the given fields replaced; the scheme is re-selected.
  TanreiThemeData copyWith({
    Brightness? brightness,
    TanreiContrast? contrast,
    TanreiSystem? system,
  }) => TanreiThemeData(
    brightness: brightness ?? this.brightness,
    contrast: contrast ?? this.contrast,
    system: system ?? this.system,
  );

  /// Interpolates between two themes: every color role is interpolated; the brightness, the
  /// contrast and the [system] (its non-color tokens and paints) step at the midpoint.
  static TanreiThemeData lerp(TanreiThemeData a, TanreiThemeData b, double t) {
    if (identical(a, b) || a == b) {
      return a;
    }
    final TanreiThemeData nearest = t < 0.5 ? a : b;
    return TanreiThemeData.raw(
      brightness: nearest.brightness,
      contrast: nearest.contrast,
      colors: TanreiColors.lerp(a.colors, b.colors, t),
      system: nearest.system,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TanreiThemeData &&
          other.brightness == brightness &&
          other.contrast == contrast &&
          other.system == system &&
          other.colors == colors;

  @override
  int get hashCode => Object.hash(brightness, contrast, system, colors);

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<Brightness>('brightness', brightness))
      ..add(EnumProperty<TanreiContrast>('contrast', contrast))
      ..add(StringProperty('system', system.id));
  }
}
