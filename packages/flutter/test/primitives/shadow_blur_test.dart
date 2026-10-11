import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

/// `flutter test` sets `debugDisableShadows`, and `BoxShadow.toPaint()` then drops the blur: every
/// golden draws a shadow as a solid shape. These
/// tests turn the flag off for one frame and SAMPLE the blurred shadow instead of recording it, so
/// they verify the blur — a token's CSS `blur` is a Gaussian of σ = blur / 2 — without a baseline
/// that depends on how one engine rasterizes a blur.
///
/// A Gaussian-blurred straight edge of alpha `a` has `a / 2` at the edge, `a × 15.9 %` one σ outside
/// and `a × 84.1 %` one σ inside (`1 − Φ(d / σ)`).
void main() {
  const double pixelRatio = 4;

  /// Standard normal CDF (Abramowitz–Stegun 7.1.26 on erf; error < 1.5e-7).
  double phi(double z) {
    final double x = z.abs() / math.sqrt2;
    final double t = 1 / (1 + 0.3275911 * x);
    final double erf =
        1 -
        (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
                0.254829592) *
            t *
            math.exp(-x * x);
    return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
  }

  /// Draws [child] with real (blurred) shadows on a transparent background and returns the alpha
  /// channel, 0–1, with a lookup in the logical coordinates of the boundary.
  Future<double Function(Offset)> alphaOf(
    WidgetTester tester,
    Widget child, {
    required Size size,
    required bool blurred,
  }) async {
    final GlobalKey boundaryKey = GlobalKey();
    final bool before = debugDisableShadows;
    late final ByteData bytes;
    late final int width;
    debugDisableShadows = !blurred;
    try {
      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: Align(
            alignment: Alignment.topLeft,
            child: RepaintBoundary(
              key: boundaryKey,
              child: SizedBox.fromSize(size: size, child: child),
            ),
          ),
        ),
      );
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = (await tester.runAsync(
        () => boundary.toImage(pixelRatio: pixelRatio),
      ))!;
      width = image.width;
      bytes = (await tester.runAsync<ByteData?>(() => image.toByteData()))!;
      image.dispose();
    } finally {
      // The binding checks at the end of every test that the flag is what it set.
      debugDisableShadows = before;
      // Nothing painted with the other setting may survive into the next frame or test.
      await tester.pumpWidget(const SizedBox.shrink());
    }
    return (Offset at) {
      final int x = (at.dx * pixelRatio).floor();
      final int y = (at.dy * pixelRatio).floor();
      return bytes.getUint8((y * width + x) * 4 + 3) / 255;
    };
  }

  testWidgets('the flag is restored: shadows are solid again after a blurred capture', (
    WidgetTester tester,
  ) async {
    expect(debugDisableShadows, isTrue, reason: 'flutter test draws shadows solid');
    await alphaOf(tester, const SizedBox.shrink(), size: const Size(10, 10), blurred: true);
    expect(debugDisableShadows, isTrue);
  });

  testWidgets('a shadow token with blur 16 is a Gaussian of σ = 8: half at the edge, 15.9 % one σ '
      'outside, 84.1 % one σ inside', (WidgetTester tester) async {
    const Color black = Color(0xFF000000);
    final TanreiColors colors = tanreiSystem.schemes.light.copyWith(elevationShadow1: black);
    const List<TanreiShadowLayer> level = <TanreiShadowLayer>[
      TanreiShadowLayer(0, 0, 16, 0, TanreiColorRole.elevationShadow1),
    ];
    const double sigma = 8;
    // A box with a long straight edge, far from its corners, and no fill (the shadow shows inside).
    const Rect box = Rect.fromLTWH(60, 60, 240, 120);
    Widget scene() => Padding(
      padding: EdgeInsets.only(left: box.left, top: box.top),
      child: Align(
        alignment: Alignment.topLeft,
        child: SizedBox.fromSize(
          size: box.size,
          child: DecoratedBox(
            decoration: TanreiContainerDecoration(
              shape: const TanreiCornerShape(smoothing: 0, radius: 0),
              boxShadow: TanreiResolvedElevation.resolve(level, colors).shadows,
            ),
          ),
        ),
      ),
    );
    const Size size = Size(360, 240);
    final double Function(Offset) blurred = await alphaOf(
      tester,
      scene(),
      size: size,
      blurred: true,
    );
    final double Function(Offset) solid = await alphaOf(
      tester,
      scene(),
      size: size,
      blurred: false,
    );

    // Along the vertical through the middle of the bottom edge; d > 0 is outside. Average the two
    // pixel rows that touch the edge for d = 0.
    final double x = box.center.dx;
    double at(double Function(Offset) alpha, double d) => d == 0
        ? (alpha(Offset(x, box.bottom - 0.01)) + alpha(Offset(x, box.bottom + 0.01))) / 2
        : alpha(Offset(x, box.bottom + d));
    for (final double d in <double>[-2 * sigma, -sigma, 0, sigma, 2 * sigma]) {
      expect(at(blurred, d), closeTo(1 - phi(d / sigma), 0.02), reason: 'd = $d');
    }
    expect(at(blurred, 3.5 * sigma), lessThan(0.01));
    // What every golden sees instead: a solid shape, all or nothing.
    expect(at(solid, -sigma), 1);
    expect(at(solid, sigma), 0);
  });

  testWidgets('the elevated fixture under m3-like (elevation level 1) draws the blur its tokens '
      'describe: both layers, their offset, spread and σ = blur / 2', (WidgetTester tester) async {
    const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
    final List<TanreiShadowLayer> layers =
        m3LikeSystem.button.variants.elevated.enabled.containerElevation;
    expect(layers, hasLength(2));
    expect(layers.every((TanreiShadowLayer l) => l.blur > 1), isTrue, reason: 'blurred layers');

    Widget scene() => TanreiTheme(
      data: theme,
      child: Center(
        child: TanreiButton(
          onPressed: () {},
          variant: TanreiButtonVariant.elevated,
          child: const Text('Deploy'),
        ),
      ),
    );
    const Size size = Size(160, 80);
    final double Function(Offset) blurred = await alphaOf(
      tester,
      scene(),
      size: size,
      blurred: true,
    );
    // The container's box inside the boundary: centered, medium height.
    final double height = m3LikeSystem.button.sizes.medium.containerHeight;
    final double bottom = (size.height + height) / 2;
    final double x = size.width / 2;

    /// What the two layers add up to, [d] logical pixels below the container's bottom edge: each
    /// is a blurred edge at `offset + spread`, drawn over the one before.
    double predicted(double d) {
      double through = 1;
      for (final TanreiShadowLayer layer in layers) {
        final double alpha = theme.colors[layer.role].a;
        through *= 1 - alpha * (1 - phi((d - layer.y - layer.spread) / (layer.blur / 2)));
      }
      return 1 - through;
    }

    // Pixel centers at 4×, from the edge to where the shadow has died away.
    final List<double> measured = <double>[];
    for (double d = 0.125; d < 7; d += 0.25) {
      final double alpha = blurred(Offset(x, bottom + d));
      measured.add(alpha);
      expect(alpha, closeTo(predicted(d), 0.025), reason: 'd = $d');
    }
    expect(measured.first, greaterThan(0.2), reason: 'there is a shadow under the button');
    expect(measured.last, lessThan(0.01));
    // Blurred, not solid: it falls off gradually — many distinct levels, never rising.
    expect(measured.toSet().length, greaterThan(8));
    for (int i = 1; i < measured.length; i++) {
      expect(measured[i], lessThanOrEqualTo(measured[i - 1] + 0.004), reason: 'row $i');
    }

    // The same frame as the goldens see it: solid, so at most three levels (both, one, none).
    final double Function(Offset) solid = await alphaOf(
      tester,
      scene(),
      size: size,
      blurred: false,
    );
    final Set<double> levels = <double>{
      for (double d = 0.125; d < 7; d += 0.25) solid(Offset(x, bottom + d)),
    };
    expect(levels.length, lessThanOrEqualTo(3));
  });
}
