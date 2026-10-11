import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

/// [path] rasterized at 8× into an alpha mask (coverage per sample, 0–1).
Future<Float32List> maskOf(Path path, Size size) async {
  const int scale = 8;
  final ui.PictureRecorder recorder = ui.PictureRecorder();
  Canvas(recorder)
    ..scale(scale.toDouble())
    ..drawPath(path, Paint()..color = const Color(0xFF000000));
  final ui.Image image = await recorder.endRecording().toImage(
    (size.width * scale).ceil(),
    (size.height * scale).ceil(),
  );
  final Uint8List bytes = (await image.toByteData())!.buffer.asUint8List();
  image.dispose();
  final Float32List mask = Float32List(bytes.length ~/ 4);
  for (int i = 0; i < mask.length; i++) {
    mask[i] = bytes[i * 4 + 3] / 255;
  }
  return mask;
}

/// The area of [path], in logical px² (coverage sum / 64).
Future<double> areaOf(Path path, Size size) async {
  final Float32List mask = await maskOf(path, size);
  double sum = 0;
  for (final double v in mask) {
    sum += v;
  }
  return sum / 64;
}

/// The area of the symmetric difference of two paths, in logical px²: what one covers and the
/// other does not, both ways.
Future<double> symmetricDifference(Path a, Path b, Size size) async {
  final Float32List x = await maskOf(a, size);
  final Float32List y = await maskOf(b, size);
  double sum = 0;
  for (int i = 0; i < x.length; i++) {
    sum += (x[i] - y[i]).abs();
  }
  return sum / 64;
}

/// Apple's continuous corner: the path `UIBezierPath(roundedRect:cornerRadius:)` builds (three
/// cubics per corner joined by two short lines), which SwiftUI's
/// `RoundedRectangle(style: .continuous)` draws. This is the reference the smoothed path is
/// measured against; it was itself measured at 2.3 px² from CoreGraphics on the 180 × 80 r20 box
/// (`tool/continuous_corner_reference.swift`, whose rasterizer alone differs from Flutter's by
/// 1.8). A side with less than 1.5287 radii of room moves its outer curve as SwiftUI does: it
/// starts where the room ends and its controls go to 0.96 and 0.82 radii from the corner when the
/// room is exactly one radius (a pill's short side).
Path applePath(Rect rect, double radius) {
  const double reach = 1.52866483;
  const List<double> full = <double>[reach, 1.08849299, 0.86840701];
  const List<double> tight = <double>[1, 0.96, 0.82];
  const List<Offset> middle = <Offset>[
    Offset(0.66993427, 0.06549600),
    Offset(0.63149399, 0.07491100),
    Offset(0.37282401, 0.16905999),
    Offset(0.16905999, 0.37282401),
    Offset(0.07491100, 0.63149399),
    Offset(0.06549600, 0.66993427),
  ];
  final double r = radius.clamp(0, rect.shortestSide / 2).toDouble();
  List<double> outer(double edge) {
    final double room = ((edge / 2 / r - 1) / (reach - 1)).clamp(0, 1).toDouble();
    return <double>[for (int i = 0; i < 3; i++) tight[i] + (full[i] - tight[i]) * room];
  }

  final List<double> horizontal = outer(rect.width);
  final List<double> vertical = outer(rect.height);
  final Path path = Path();
  void corner(Offset at, Offset along, Offset away, {bool first = false}) {
    final List<double> arriving = along.dx != 0 ? horizontal : vertical;
    final List<double> leaving = along.dx != 0 ? vertical : horizontal;
    Offset p(int i) {
      final Offset point = switch (i) {
        0 || 1 || 2 => Offset(arriving[i], 0),
        9 || 10 || 11 => Offset(0, leaving[11 - i]),
        _ => middle[i - 3],
      };
      return at - along * (point.dx * r) + away * (point.dy * r);
    }

    if (first) {
      path.moveTo(p(0).dx, p(0).dy);
    } else {
      path.lineTo(p(0).dx, p(0).dy);
    }
    path
      ..cubicTo(p(1).dx, p(1).dy, p(2).dx, p(2).dy, p(3).dx, p(3).dy)
      ..lineTo(p(4).dx, p(4).dy)
      ..cubicTo(p(5).dx, p(5).dy, p(6).dx, p(6).dy, p(7).dx, p(7).dy)
      ..lineTo(p(8).dx, p(8).dy)
      ..cubicTo(p(9).dx, p(9).dy, p(10).dx, p(10).dy, p(11).dx, p(11).dy);
  }

  corner(rect.topRight, const Offset(1, 0), const Offset(0, 1), first: true);
  corner(rect.bottomRight, const Offset(0, 1), const Offset(-1, 0));
  corner(rect.bottomLeft, const Offset(-1, 0), const Offset(0, -1));
  corner(rect.topLeft, const Offset(0, -1), const Offset(1, 0));
  return path..close();
}

void main() {
  const Rect box = Rect.fromLTWH(10, 10, 180, 80);
  const Size canvas = Size(200, 100);
  const TanreiCornerShape circular = TanreiCornerShape(smoothing: 0, radius: 20);
  const TanreiCornerShape ios = TanreiCornerShape(smoothing: 0.6, radius: 20);

  group('TanreiCornerShape', () {
    test('at 0 it is the circular rounded rectangle, pixel for pixel', () async {
      final Path expected = Path()
        ..addRRect(RRect.fromRectAndRadius(box, const Radius.circular(20)));
      expect(circular.isCircular, isTrue);
      expect(circular.path(box).getBounds(), expected.getBounds());
      expect(await symmetricDifference(circular.path(box), expected, canvas), 0);
      // So is the free function at 0, whatever the radius.
      expect(await symmetricDifference(tanreiSmoothedRectPath(box, 20, 0), expected, canvas), 0);
    });

    test(
      'the amount moves where the curve leaves the edge: (1 + amount) radii before the corner',
      () {
        for (final (double amount, double leaves, double atOneRadius) in <(double, double, double)>[
          (0.3, 1.3, 0.049),
          (0.6, 1.6, 0.192),
          (1, 2, 0.509),
        ]) {
          final Path path = TanreiCornerShape(smoothing: amount, radius: 20).path(box);
          expect(path.getBounds(), box, reason: '$amount');
          // One radius before the corner the circular corner is still straight and the smoothed one
          // has left the edge — by [atOneRadius] px, more with more amount; past (1 + amount)
          // radii the edge is straight again.
          final Offset probe = box.topLeft + const Offset(20, 0.03);
          expect(circular.path(box).contains(probe), isTrue, reason: '$amount');
          expect(path.contains(probe), isFalse, reason: '$amount');
          expect(
            path.contains(box.topLeft + Offset(20, atOneRadius + 0.02)),
            isTrue,
            reason: '$amount',
          );
          expect(
            path.contains(box.topLeft + Offset(20, atOneRadius - 0.02)),
            isFalse,
            reason: '$amount',
          );
          expect(
            path.contains(box.topLeft + Offset(20 * leaves + 0.5, 0.05)),
            isTrue,
            reason: '$amount',
          );
          expect(
            path.contains(box.topLeft + Offset(20 * leaves - 12, 0.05)),
            isFalse,
            reason: '$amount',
          );
        }
        // On the diagonal every amount is within a fraction of a pixel of the circle.
        expect(ios.path(box).contains(box.topLeft + const Offset(6.5, 6.5)), isTrue);
        expect(ios.path(box).contains(box.topLeft + const Offset(5, 5)), isFalse);
      },
    );

    test('more amount removes more, without a jump; 1 is the most eased', () async {
      // What the construction removes from the circular 180 × 80 r20 box (analytic, px²): 0.26 at
      // 0.1, 0.86 at 0.2, 4.9 at 0.4, 15.4 at 0.6, 34.7 at 0.8, 64.1 at 1. Below 0.3 that is
      // within the rasterizer's own bias between an RRect and a path (about 1.7 px² here, which
      // every measured removal is short by), so the series is checked from 0.2 up and the first
      // step only for being small.
      final double round = await areaOf(circular.path(box), canvas);
      double previous = await areaOf(
        const TanreiCornerShape(smoothing: 0.2, radius: 20).path(box),
        canvas,
      );
      expect((round - previous).abs(), lessThan(2.5));
      for (final (double amount, double removes) in <(double, double)>[
        (0.4, 4.9),
        (0.6, 15.4),
        (0.8, 34.7),
        (1, 64.1),
      ]) {
        final double area = await areaOf(
          TanreiCornerShape(smoothing: amount, radius: 20).path(box),
          canvas,
        );
        expect(area, lessThan(previous), reason: '$amount');
        expect(round - area, closeTo(removes, 3.5), reason: '$amount');
        previous = area;
      }
    });

    test('at 0.6, measured against Apple\'s corner (SwiftUI RoundedRectangle(cornerRadius: 20, '
        'style: .continuous)) on the 180 × 80 box: 5.1 px² symmetric difference', () async {
      // Reference areas from CoreGraphics at 8×: continuous 14039.1, circular 14056.5. The measure
      // is calibrated on the circle: Apple's corner is 18.2 px² from it in CoreGraphics.
      final Path apple = applePath(box, 20);
      expect(await areaOf(circular.path(box), canvas), closeTo(14056.5, 2.5));
      expect(await symmetricDifference(apple, circular.path(box), canvas), closeTo(18.2, 1));
      // Figma's construction at 0.6 is NOT Apple's corner within rasterizer noise (1.8 px²): the
      // leg leaves the edge at 1.6 radii instead of 1.5287 and the middle is a circular arc. The
      // difference is 5.1 px² analytic (5.8 with the anti-aliasing of two masks), and no amount
      // gets closer (0.60–0.62 is the minimum). So the amount means Figma's curve;
      // Apple's own is drawn by the platforms that have it. This test pins the measured distance.
      final double difference = await symmetricDifference(apple, ios.path(box), canvas);
      expect(difference, closeTo(5.8, 0.8));
      expect(difference, lessThan(18.2 / 3), reason: 'far closer to Apple than a circle is');
      // What each removes from the circular box: Apple 17.4 px² (CoreGraphics, 18.35 analytic),
      // this path 15.4: Figma's 60 % is a little less eased than iOS.
      final double removed =
          await areaOf(circular.path(box), canvas) - await areaOf(ios.path(box), canvas);
      expect(removed, closeTo(15.4, 2.5));
      expect(removed, lessThan(14056.5 - 14039.1));
      // Flutter's own RSuperellipse removes far more than Apple does (28.6 against 17.4).
      final double superellipse = await areaOf(
        Path()..addRSuperellipse(RSuperellipse.fromRectAndRadius(box, const Radius.circular(20))),
        canvas,
      );
      expect(await areaOf(circular.path(box), canvas) - superellipse, greaterThan(1.5 * 17.4));
    });

    test(
      'ContinuousRectangleBorder is NOT this corner: at the same radius it cuts far less',
      () async {
        final double flutterContinuous = await areaOf(
          const ContinuousRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
          ).getOuterPath(box),
          canvas,
        );
        // 264 px² more than the circular corner's 14056: it looks like a much smaller radius.
        expect(flutterContinuous, greaterThan(14300));
      },
    );

    test('a pill has no room to ease: Figma\'s per-corner budget draws the circular capsule, '
        '180 × 40 at radius 20 and a 60 × 36 capsule, against Apple\'s pill', () async {
      // Reference areas from CoreGraphics at 8× (tool/continuous_corner_reference.swift):
      // 180×40 r20 continuous 6846.4, circular 6856.5; 60×36 capsule continuous 1873.5, circular 1881.8.
      // figma-squircle budgets the smoothing per corner (`maxCornerSmoothing` = min(w, h) / 2 / r − 1),
      // so a radius of half the short side leaves an amount of 0: the pill IS the circular one, pixel
      // for pixel, and it is as far from Apple's pill as a circle is — 11.2 and 9.1 px² analytic,
      // measured 11.5 and 9.4 at 8×. (Keeping the easing along the long side would land 5.3 and 4.3
      // from Apple's, but that is not what Figma draws.)
      for (final (Rect pill, double radius, double appleCircular, double apart)
          in <(Rect, double, double, double)>[
            (const Rect.fromLTWH(10, 10, 180, 40), 20, 6856.5, 11.5),
            (const Rect.fromLTWH(10, 10, 60, 36), 9999, 1881.8, 9.4),
          ]) {
        final Path smoothed = TanreiCornerShape(smoothing: 0.6, radius: radius).path(pill);
        final Path round = TanreiCornerShape(smoothing: 0, radius: radius).path(pill);
        expect(await areaOf(round, canvas), closeTo(appleCircular, 2.5), reason: '$pill');
        expect(await symmetricDifference(round, smoothed, canvas), 0, reason: '$pill');
        for (final double amount in <double>[0.3, 1]) {
          expect(
            await symmetricDifference(
              round,
              TanreiCornerShape(smoothing: amount, radius: radius).path(pill),
              canvas,
            ),
            0,
            reason: '$pill at $amount',
          );
        }
        expect(
          await symmetricDifference(applePath(pill, radius), smoothed, canvas),
          closeTo(apart, 0.8),
          reason: '$pill',
        );
      }
    });

    test('a corner without room takes the amount its room allows, on both sides: 180 × 40', () async {
      const Rect pill = Rect.fromLTWH(0, 0, 180, 40);
      final Path path = ios.path(pill);
      expect(path.getBounds(), pill);
      // At radius 20 (a pill) the ends touch the box in the middle of the short side only, and the
      // long side is straight from one radius on, like the circular pill's: no easing anywhere.
      expect(path.contains(const Offset(179.95, 20)), isTrue);
      expect(path.contains(const Offset(179.95, 20 + 4)), isFalse);
      expect(path.contains(const Offset(20.5, 0.03)), isTrue);
      expect(circular.path(pill).contains(const Offset(20.5, 0.03)), isTrue);
      // At radius 16 each corner has 20 px of room: 20 / 16 − 1 = 0.25 of easing, on the long side
      // as on the short one. So any amount from 0.25 up draws the same path, and less draws less.
      const Rect canvasBox = Rect.fromLTWH(10, 10, 180, 40);
      Path near(double amount) => TanreiCornerShape(smoothing: amount, radius: 16).path(canvasBox);
      expect(await symmetricDifference(near(0.6), near(0.25), canvas), 0);
      expect(await symmetricDifference(near(1), near(0.25), canvas), 0);
      expect(await symmetricDifference(near(0.2), near(0.25), canvas), greaterThan(0.05));
      // The long side eases where it leaves the edge, (1 + 0.25) radii = 20 px before the corner —
      // not 1.6 radii, as the per-side budget had it.
      expect(near(0.6).contains(canvasBox.topLeft + const Offset(20.3, 0.02)), isTrue);
      // A box with room on every side keeps the full amount.
      expect(
        await symmetricDifference(
          const TanreiCornerShape(smoothing: 0.6, radius: 16).path(box),
          const TanreiCornerShape(smoothing: 0.25, radius: 16).path(box),
          canvas,
        ),
        greaterThan(3),
      );
    });

    test('between a box with room and a pill the area shrinks without a jump', () async {
      const Rect pill = Rect.fromLTWH(10, 10, 60, 36);
      double previous = double.infinity;
      for (final double radius in <double>[8, 11, 11.7, 11.8, 12, 14, 16, 17.9, 18]) {
        final double area = await areaOf(
          TanreiCornerShape(smoothing: 0.6, radius: radius).path(pill),
          canvas,
        );
        expect(area, lessThan(previous), reason: 'radius $radius');
        previous = area;
      }
    });

    test('growing the shape keeps the corner centers; a square corner stays square', () {
      const TanreiCornerShape rounded = TanreiCornerShape(smoothing: 0.6, radius: 10);
      expect(rounded.path(box, delta: 3).getBounds(), box.inflate(3));
      expect(rounded.path(box, delta: -3).getBounds(), box.deflate(3));
      for (final double amount in <double>[0, 0.6, 1]) {
        final TanreiCornerShape square = TanreiCornerShape(smoothing: amount, radius: 0);
        expect(square.isCircular, isTrue);
        expect(square.path(box, delta: 4).contains(box.topLeft - const Offset(3.9, 3.9)), isTrue);
      }
    });

    test('the legs are the three Béziers every platform samples: the leg\'s end is on the corner '
        'circle and the arc handle is the classic one at 0', () {
      // At amount s, β = 45°·s: the leg ends at (1 − sin β, 1 − cos β) radii from the corner, which
      // is a point of the corner circle (centre (1, 1) in radii). Probe the path there.
      for (final double s in <double>[0.3, 0.6, 1]) {
        final double beta = math.pi / 4 * s;
        final Offset end =
            box.topLeft + Offset(20 * (1 - math.sin(beta)), 20 * (1 - math.cos(beta)));
        final Path path = TanreiCornerShape(smoothing: s, radius: 20).path(box);
        // Inside towards the circle's centre, outside away from it.
        final Offset normal = Offset(math.sin(beta), math.cos(beta));
        expect(path.contains(end + normal * 0.2), isTrue, reason: '$s');
        expect(path.contains(end - normal * 0.2), isFalse, reason: '$s');
      }
    });
  });

  group('TanreiCornerShape.only (joined items: a segmented button, a connected button group, a '
      'split button)', () {
    test(
      'four equal radii draw the uniform shape (up to the cubic of an uneased corner)',
      () async {
        for (final double amount in <double>[0, 0.6, 1]) {
          final TanreiCornerShape uniform = TanreiCornerShape(smoothing: amount, radius: 20);
          final TanreiCornerShape each = TanreiCornerShape.only(
            smoothing: amount,
            corners: const TanreiCornerRadii.all(20),
          );
          expect(each.radius, 20);
          expect(
            await symmetricDifference(uniform.path(box), each.path(box), canvas),
            lessThan(0.5),
            reason: '$amount',
          );
        }
      },
    );

    test('a square corner stays square and a rounded one takes its own radius and easing', () {
      for (final double amount in <double>[0, 0.6]) {
        final TanreiCornerShape shape = TanreiCornerShape.only(
          smoothing: amount,
          corners: const TanreiCornerRadii(
            topLeft: 20,
            topRight: 0,
            bottomRight: 0,
            bottomLeft: 20,
          ),
        );
        final Path path = shape.path(box);
        expect(path.getBounds(), box);
        // The right corners are square: their very corner is inside.
        expect(path.contains(box.topRight + const Offset(-0.5, 0.5)), isTrue, reason: '$amount');
        expect(path.contains(box.bottomRight + const Offset(-0.5, -0.5)), isTrue);
        // The left ones are rounded.
        expect(path.contains(box.topLeft + const Offset(1, 1)), isFalse, reason: '$amount');
        expect(shape.isSquare, isFalse);
        expect(shape.borderRadius.topRight, Radius.zero);
        // Growing keeps a square corner square.
        final Path grown = shape.path(box, delta: 3);
        expect(grown.contains(box.topRight + const Offset(2.5, -2.5)), isTrue);
      }
    });

    test('directional radii put the start corners on the left, and on the right in a '
        'right-to-left layout', () {
      final TanreiCornerRadii ltr = TanreiCornerRadii.directional(
        start: 8,
        end: 2,
        textDirection: TextDirection.ltr,
      );
      expect(ltr, const TanreiCornerRadii(topLeft: 8, topRight: 2, bottomRight: 2, bottomLeft: 8));
      final TanreiCornerRadii rtl = TanreiCornerRadii.directional(
        start: 8,
        end: 2,
        textDirection: TextDirection.rtl,
      );
      expect(rtl, const TanreiCornerRadii(topLeft: 2, topRight: 8, bottomRight: 8, bottomLeft: 2));
      expect(
        ltr.grow(-3),
        const TanreiCornerRadii(topLeft: 5, topRight: 0, bottomRight: 0, bottomLeft: 5),
      );
    });

    test('a radius larger than half the shorter side is limited to it: a pill end', () {
      final TanreiCornerShape shape = TanreiCornerShape.only(
        smoothing: 0.6,
        corners: const TanreiCornerRadii(
          topLeft: 999,
          topRight: 0,
          bottomRight: 0,
          bottomLeft: 999,
        ),
      );
      final Path path = shape.path(box);
      // The left end is a half circle of radius 40 (half of 80): its middle touches the edge.
      expect(path.contains(Offset(box.left + 0.5, box.center.dy)), isTrue);
      expect(path.contains(box.topLeft + const Offset(10, 10)), isFalse);
    });
  });
}
