import 'dart:ui' show Color;

import '../generated/tokens.g.dart';

/// Evaluates paints against one color scheme.
extension TanreiPaintResolve on TanreiPaint {
  /// The color this paint has in [colors], the roles of [scheme].
  ///
  /// `none` is fully transparent black, which is also what it contributes to a mix: mixing "nothing"
  /// with a color at 10 % gives that color at 10 % alpha, exactly like a state layer over no fill.
  ///
  /// A per-scheme paint ([TanreiPaint.scheme]: a `tone` or `contrast-pick` rule whose result differs
  /// between schemes) is evaluated for [scheme]; without one, for the scheme [colors] say they are
  /// (`TanreiColors.scheme`). `TanreiThemeData.paint` passes the theme's scheme, which also holds
  /// for colors that were interpolated or built by hand.
  Color resolve(TanreiColors colors, {TanreiScheme? scheme}) => switch (this) {
    TanreiRolePaint(:final TanreiColorRole role) => colors[role],
    TanreiMixPaint(:final TanreiPaint base, :final TanreiPaint other, :final double amount) =>
      tanreiMixColors(
        base.resolve(colors, scheme: scheme),
        other.resolve(colors, scheme: scheme),
        amount,
      ),
    TanreiAlphaPaint(:final TanreiPaint of, :final double amount) => _scaleAlpha(
      of.resolve(colors, scheme: scheme),
      amount,
    ),
    TanreiNoPaint() => _nothing,
    TanreiLiteralPaint(:final Color color) => color,
    final TanreiSchemePaint paint =>
      paint.of(scheme ?? colors.scheme).resolve(colors, scheme: scheme),
  };
}

/// Interpolates from [base] towards [other] by [amount] (clamped to 0–1) on premultiplied sRGB
/// channels: the same result as CSS `color-mix(in srgb, base, other amount)`.
///
/// For an opaque [base] this equals painting [other] at `amount` opacity over it.
Color tanreiMixColors(Color base, Color other, double amount) {
  final double t = amount.clamp(0, 1);
  final double alpha = base.a * (1 - t) + other.a * t;
  if (alpha == 0) {
    return _nothing;
  }
  double channel(double from, double to) => (from * base.a * (1 - t) + to * other.a * t) / alpha;
  return Color.from(
    alpha: alpha,
    red: channel(base.r, other.r),
    green: channel(base.g, other.g),
    blue: channel(base.b, other.b),
  );
}

Color _scaleAlpha(Color color, double amount) => color.withValues(alpha: color.a * amount);

/// What `none` resolves to: nothing is drawn.
const Color _nothing = Color(0x00000000);
