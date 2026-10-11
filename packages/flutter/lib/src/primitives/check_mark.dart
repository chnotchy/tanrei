import 'dart:ui' show PathMetric;

import 'package:flutter/widgets.dart';

// The check's geometry, in fractions of its box's side, as the checkbox spec's anatomy (`mark`)
// gives it: three points stroked with square caps. A glyph's construction, not a design value; its
// stroke is a component's `mark.width` token. The checkbox, the list's selected option (LST-21) and
// the menu's checked items (MNU-22) draw the same check.
const Offset _checkStart = Offset(0.2, 0.5);
const Offset _checkCorner = Offset(0.4, 0.7);
const Offset _checkEnd = Offset(0.8, 0.3);

/// The check's path in a box of [size]: from its start, through its corner, to its end.
Path tanreiCheckPath(Size size) {
  Offset at(Offset fraction) => Offset(fraction.dx * size.width, fraction.dy * size.height);
  return Path()
    ..moveTo(at(_checkStart).dx, at(_checkStart).dy)
    ..lineTo(at(_checkCorner).dx, at(_checkCorner).dy)
    ..lineTo(at(_checkEnd).dx, at(_checkEnd).dy);
}

/// The stroke a check is drawn with: [color] at [width], square caps and mitred joins.
Paint tanreiCheckStroke(Color color, double width) => Paint()
  ..color = color
  ..style = PaintingStyle.stroke
  ..strokeCap = StrokeCap.square
  ..strokeJoin = StrokeJoin.miter
  ..strokeWidth = width;

/// Strokes the check in a box of [size] as far as [progress] (0–1) along its path, from its start:
/// a check drawn in, or taken back (CHK-13, LST-21, MNU-22). Nothing is drawn for a transparent
/// [color], a zero [width] or no progress.
void tanreiPaintCheck(
  Canvas canvas,
  Size size, {
  required Color color,
  required double width,
  required double progress,
}) {
  final double drawn = progress.clamp(0, 1).toDouble();
  if (color.a == 0 || width <= 0 || drawn <= 0) {
    return;
  }
  final PathMetric metric = tanreiCheckPath(size).computeMetrics().single;
  canvas.drawPath(metric.extractPath(0, metric.length * drawn), tanreiCheckStroke(color, width));
}

/// Paints a check alone in a box — the mark of a list's selected option or a menu's checked item —
/// drawn along its path as far as [progress]. The values are public so that tests can read what
/// is drawn.
class TanreiCheckMarkPainter extends CustomPainter {
  /// Paints a check with the given values.
  const TanreiCheckMarkPainter({required this.color, required this.width, required this.progress});

  /// The mark color of the item's condition and state.
  final Color color;

  /// The stroke width (a component's `mark.width`).
  final double width;

  /// How much of the check is drawn, 0–1.
  final double progress;

  @override
  void paint(Canvas canvas, Size size) =>
      tanreiPaintCheck(canvas, size, color: color, width: width, progress: progress);

  @override
  bool shouldRepaint(TanreiCheckMarkPainter oldDelegate) =>
      color != oldDelegate.color || width != oldDelegate.width || progress != oldDelegate.progress;
}
