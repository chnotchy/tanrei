import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';

/// Converts the `blur` of a shadow token to a Flutter `BoxShadow.blurRadius`.
///
/// Tanrei shadows have CSS `box-shadow` semantics: `blur` is the CSS blur radius, and the
/// Gaussian that blurs the shadow has the standard deviation `σ = blur / 2`. Flutter's
/// `blurRadius` is a different quantity: the engine turns it into a standard deviation with
/// `Shadow.convertRadiusToSigma`, `σ = blurRadius × 0.57735 + 0.5` (and 0 for a radius of 0).
/// Passing the token through, as this package once did, draws `blur: 3` with σ = 2.23 instead of
/// 1.5 — a shadow half again as soft as on the web.
///
/// Equal σ gives `blurRadius = (blur / 2 − 0.5) / 0.57735`. Flutter cannot blur by less than
/// σ = 0.5, so a CSS blur of 1 px or less is drawn sharp.
///
/// This is the one place the conversion is made.
double tanreiBlurRadiusFromCss(double cssBlur) =>
    math.max(0, (cssBlur / _cssBlurPerSigma - _sigmaFloor) / _sigmaPerRadius);

/// CSS: the blur radius is twice the standard deviation.
const double _cssBlurPerSigma = 2;

/// `Shadow.convertRadiusToSigma` (Skia's `SkBlurMask::ConvertRadiusToSigma`): σ = r × 0.57735 + 0.5.
const double _sigmaPerRadius = 0.57735;
const double _sigmaFloor = 0.5;

/// An elevation level resolved against a color scheme, ready for a container decoration.
@immutable
class TanreiResolvedElevation {
  /// Creates a resolved elevation.
  const TanreiResolvedElevation({this.ring, this.shadows = const <BoxShadow>[]});

  /// Resolves [layers] (an elevation level of the design system, or a component's elevation token)
  /// with [colors].
  ///
  /// A leading layer that has no offset and no blur is the level's ring: it becomes a [Border]
  /// whose width is the layer's spread, painted outside the box exactly where the shadow ring
  /// would be. The remaining layers become [BoxShadow]s with spread; their blur is converted with
  /// [tanreiBlurRadiusFromCss]. An empty level (`level0`) resolves to nothing at all, and a layer
  /// that cannot paint anything is dropped.
  factory TanreiResolvedElevation.resolve(List<TanreiShadowLayer> layers, TanreiColors colors) {
    Border? ring;
    final List<BoxShadow> shadows = <BoxShadow>[];
    for (final (int index, TanreiShadowLayer layer) in layers.indexed) {
      final bool flat = layer.x == 0 && layer.y == 0 && layer.blur == 0;
      if (flat && layer.spread <= 0) {
        continue;
      }
      if (index == 0 && flat) {
        ring = Border.all(
          color: colors[layer.role],
          width: layer.spread,
          strokeAlign: BorderSide.strokeAlignOutside,
        );
        continue;
      }
      shadows.add(
        BoxShadow(
          color: colors[layer.role],
          offset: Offset(layer.x, layer.y),
          blurRadius: tanreiBlurRadiusFromCss(layer.blur),
          spreadRadius: layer.spread,
        ),
      );
    }
    return TanreiResolvedElevation(ring: ring, shadows: shadows);
  }

  /// Interpolates between two resolved elevations (ring and shadows), for state transitions: a
  /// shadow never jumps between two states.
  static TanreiResolvedElevation lerp(
    TanreiResolvedElevation a,
    TanreiResolvedElevation b,
    double t,
  ) {
    if (identical(a, b)) {
      return a;
    }
    return TanreiResolvedElevation(
      ring: Border.lerp(a.ring, b.ring, t),
      shadows: BoxShadow.lerpList(a.shadows, b.shadows, t) ?? const <BoxShadow>[],
    );
  }

  /// The level's hairline ring, or null when the level has none (level 0, or a system whose levels
  /// are shadows only).
  final Border? ring;

  /// The level's drop shadows, in token order.
  final List<BoxShadow> shadows;
}
