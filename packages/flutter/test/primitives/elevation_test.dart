import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../systems.dart';

void main() {
  final TanreiColors colors = tanreiSystem.schemes.light;
  final TanreiElevation elevation = tanreiSystem.elevation;

  test('level 0 is an empty list in every shipped system, and paints nothing', () {
    for (final TanreiSystem system in shippedSystems) {
      expect(system.elevation.level0, isEmpty, reason: system.id);
    }
    final TanreiResolvedElevation level = TanreiResolvedElevation.resolve(elevation.level0, colors);
    expect(level.ring, isNull);
    expect(level.shadows, isEmpty);
  });

  group('shadow blur: CSS box-shadow semantics to BoxShadow.blurRadius', () {
    // Flutter: sigma = Shadow.convertRadiusToSigma(blurRadius). CSS: sigma = blur / 2.
    test('the converted radius gives the Gaussian CSS asks for', () {
      for (final double cssBlur in <double>[2, 3, 6, 8, 12, 24]) {
        final double sigma = Shadow.convertRadiusToSigma(tanreiBlurRadiusFromCss(cssBlur));
        expect(sigma, closeTo(cssBlur / 2, 1e-9), reason: 'blur $cssBlur');
        expect(BoxShadow(blurRadius: tanreiBlurRadiusFromCss(cssBlur)).blurSigma, sigma);
      }
    });

    test('passing the token through would blur half again as much', () {
      expect(Shadow.convertRadiusToSigma(3), closeTo(2.232, 1e-3));
      expect(Shadow.convertRadiusToSigma(tanreiBlurRadiusFromCss(3)), closeTo(1.5, 1e-9));
      expect(tanreiBlurRadiusFromCss(3), closeTo(1.7321, 1e-4));
    });

    test('no blur stays no blur; a blur Flutter cannot draw (sigma below 0.5) is sharp', () {
      expect(tanreiBlurRadiusFromCss(0), 0);
      expect(tanreiBlurRadiusFromCss(0.5), 0);
      expect(tanreiBlurRadiusFromCss(1), 0);
      expect(tanreiBlurRadiusFromCss(1.5), greaterThan(0));
    });

    test('an elevation level is resolved through the conversion', () {
      const List<TanreiShadowLayer> layers = <TanreiShadowLayer>[
        TanreiShadowLayer(0, 2, 6, 2, TanreiColorRole.elevationShadow1),
      ];
      final BoxShadow shadow = TanreiResolvedElevation.resolve(layers, colors).shadows.single;
      expect(shadow.blurSigma, closeTo(3, 1e-9));
      expect(shadow.offset, const Offset(0, 2));
      expect(shadow.spreadRadius, 2);
    });
  });

  test('the first layer of a level becomes an outside border, the rest box shadows', () {
    for (final List<TanreiShadowLayer> layers in <List<TanreiShadowLayer>>[
      elevation.level1,
      elevation.level2,
      elevation.level3,
      elevation.level4,
      elevation.level5,
    ]) {
      final TanreiResolvedElevation level = TanreiResolvedElevation.resolve(layers, colors);
      final BorderSide ring = level.ring!.top;
      expect(ring.color, colors[layers.first.role]);
      expect(ring.width, layers.first.spread);
      expect(ring.strokeAlign, BorderSide.strokeAlignOutside);

      expect(level.shadows, hasLength(layers.length - 1));
      for (final (int index, BoxShadow shadow) in level.shadows.indexed) {
        final TanreiShadowLayer layer = layers[index + 1];
        expect(shadow.color, colors[layer.role]);
        expect(shadow.offset, Offset(layer.x, layer.y));
        expect(shadow.blurRadius, tanreiBlurRadiusFromCss(layer.blur));
        expect(shadow.spreadRadius, layer.spread);
      }
    }
  });

  test('lerp interpolates the ring and the shadows', () {
    final TanreiResolvedElevation flat = TanreiResolvedElevation.resolve(elevation.level0, colors);
    final TanreiResolvedElevation raised = TanreiResolvedElevation.resolve(
      elevation.level2,
      colors,
    );
    expect(TanreiResolvedElevation.lerp(raised, raised, 0.5), same(raised));
    final TanreiResolvedElevation mid = TanreiResolvedElevation.lerp(flat, raised, 0.5);
    expect(mid.ring!.top.width, raised.ring!.top.width / 2);
    expect(mid.shadows.single.blurRadius, raised.shadows.single.blurRadius / 2);
    final TanreiResolvedElevation end = TanreiResolvedElevation.lerp(flat, raised, 1);
    expect(end.shadows, raised.shadows);
  });
}
