import 'dart:math' as math;

import 'package:flutter/animation.dart';
import 'package:flutter/painting.dart';

/// A ring drawn in a square: the stroke's outer edge touches the square (a progress indicator's
/// ring, PRG-3; a loading indicator's mark, LDG-1). Angles are radians clockwise from the top.
class TanreiRing {
  /// The ring of [stroke] in the largest square centered in [size]. A stroke wider than half the
  /// square is limited to it.
  factory TanreiRing(Size size, double stroke) {
    final double side = math.min(size.width, size.height);
    final double width = math.min(stroke, side / 2);
    return TanreiRing._(
      Rect.fromCircle(center: size.center(Offset.zero), radius: math.max(0, (side - width) / 2)),
      width,
    );
  }

  const TanreiRing._(this.circle, this.stroke);

  /// The circle the middle of the stroke runs along.
  final Rect circle;

  /// The stroke width.
  final double stroke;

  /// The radius of [circle].
  double get radius => circle.width / 2;

  /// The top of the ring, where an arc of a clock-like indicator starts.
  static const double top = -math.pi / 2;

  /// A full turn.
  static const double turn = math.pi * 2;

  /// Strokes the arc from [start] over [sweep] (both radians, clockwise) in [color] with [cap]
  /// ends. Nothing for an empty sweep, an empty ring or a transparent color.
  void arc(Canvas canvas, double start, double sweep, Color color, {required StrokeCap cap}) {
    if (sweep <= 0 || radius <= 0 || stroke <= 0 || color.a == 0) {
      return;
    }
    canvas.drawArc(
      circle,
      start,
      sweep,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = cap,
    );
  }
}

/// The opacity of an indicator that stands still under reduced motion, at [t] (0–1) of its cycle:
/// 1 at the start, eased with [curve] to 0 at the middle, and back to 1 at the end (PRG-7, LDG-4).
double tanreiPulseOpacity(Curve curve, double t) =>
    t < 0.5 ? 1 - curve.transform(t * 2) : curve.transform((t - 0.5) * 2);

/// [color] with its alpha multiplied by [opacity].
Color tanreiFade(Color color, double opacity) =>
    opacity >= 1 ? color : color.withValues(alpha: color.a * opacity.clamp(0, 1));
