import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// The outline of a container: a rectangle whose corners are eased by the design system's
/// `shape.cornerSmoothing` (spec BTN-10), at one corner radius.
///
/// [smoothing] is Figma's corner smoothing, 0–1: 0 is a quarter circle ([RRect]), 0.6 is what
/// Figma calls the iOS corner, 1 the most eased curve. The radius does not change with it — only
/// how far before the corner the curve leaves the straight edge (`(1 + smoothing)` radii) and how
/// much of the turn the circular part still takes (`90° × (1 − smoothing)`).
///
/// ## The construction
///
/// [tanreiSmoothedRectPath] is Figma's corner-smoothing construction — the formulas published in
/// `figma-squircle` (MIT, github.com/phamfoo/figma-squircle, `getPathParamsForCorner`), which
/// follow Figma's "Desperately seeking squircles" — with the arc as one cubic, so that the web and
/// Compose packages draw the same three Béziers per corner and the three platforms rasterize
/// identically up to their anti-aliasing. Per corner, in units of the radius `R`, with `s` the
/// corner's amount (see **Room**) and `β = 45° · s` the part of the turn each eased leg takes:
///
/// ```text
/// p  = (1 + s) · R              where the leg leaves the straight edge
/// d  = R · (1 − cos β)          the leg's end, off the edge
/// x3 = R · (1 − sin β)          the leg's end, along the edge — on the corner circle
/// c  = R · tan(β / 2) · cos β
/// ab = p − x3 − c               a + b;  b = ab / 3,  a = 2 · b
/// leg: P0 = (p, 0)  P1 = (p − a, 0)  P2 = (x3 + c, 0)  P3 = (x3, d)     (distances from the corner)
/// arc: the corner circle (centre R, R) from tangent angle β to 90° − β, measure
///      θ = 90° − 2β, as one cubic with handles of h = (4 / 3) · tan(θ / 4) · R
/// ```
///
/// (these are exactly figma-squircle's `a b c d p` and `arcMeasure`; the leaving leg is the
/// arriving one mirrored across the corner's diagonal).
///
/// **Room.** The full easing needs `(1 + s)` radii of straight edge on each side of a corner. A
/// corner has half the box's shorter side as room and takes the amount that room allows,
/// `s_corner = min(s, room / R − 1)` on both of its sides — Figma's own budget
/// (`maxCornerSmoothing` of figma-squircle), so the platforms draw what the designer sees in the
/// file. Every corner of a box has the same room. A pill (radius ≥ half the shorter side) has no
/// room left: its amount is 0 and it is exactly the circular capsule, drawn as an
/// [RRect]; a near-pill eases both sides of each corner by what its short side allows (180 × 40 at
/// radius 16: 0.25).
///
/// ## Measured against Apple's corner
///
/// Apple's continuous corner (`UIBezierPath(roundedRect:cornerRadius:)`, the path SwiftUI's
/// `RoundedRectangle(style: .continuous)` builds; CoreGraphics reference:
/// `tool/continuous_corner_reference.swift`) is a different curve: its leg leaves the edge at
/// 1.5287 radii, its middle is not a circular arc. Area of the symmetric difference, logical px²,
/// analytic (the rasterizers alone differ by 1.8; `test/primitives/corner_shape_test.dart` measures
/// the same at 8×):
///
/// | box, radius | this path at 0.6 | at 0 (a circle) |
/// |---|---|---|
/// | 180 × 80, 20 | 5.1 | 18.1 |
/// | 180 × 40 pill, 20 | 11.2 (a circle: no room) | 11.2 |
/// | 60 × 36 capsule | 9.1 (a circle: no room) | 9.1 |
///
/// The minimum over the amount is 5.1 at 0.60–0.62: Figma's 60 % is a little less eased than iOS
/// (it removes 15.4 px² from the circular 180 × 80 box where Apple's removes 18.4). No amount
/// comes closer to Apple's curve than that.
///
/// `ContinuousRectangleBorder` and `RSuperellipse` are neither curve: at the same radius the former
/// looks like a corner of less than half the radius (281 px² from Apple's on that box), the latter
/// removes 28.6 px² where Apple's removes 17.4 (14.0 px² away), and `Canvas.drawRSuperellipse`
/// falls back to an `RRect` on Skia and on Flutter web. This path draws the same on every backend.
@immutable
class TanreiCornerShape {
  /// A shape with corners of [radius] eased by [smoothing].
  const TanreiCornerShape({required this.smoothing, required this.radius}) : corners = null;

  /// A shape whose four corners have radii of their own, each eased by [smoothing]: the joined
  /// items of a segmented button, a connected button group or a split button, whose corners that
  /// face a neighbour are tighter than their outer ones. [radius] is the largest of them.
  TanreiCornerShape.only({required this.smoothing, required TanreiCornerRadii this.corners})
    : radius = corners.largest;

  /// How the corners ease into the straight edges, 0–1 (`shape.cornerSmoothing`).
  final double smoothing;

  /// The corner radius, in logical pixels. It is limited to half the shorter side of the box. For a
  /// shape with [corners], the largest of them.
  final double radius;

  /// The radius of each corner, when the corners differ ([TanreiCornerShape.only]); null when every
  /// corner is [radius].
  final TanreiCornerRadii? corners;

  /// The radius of each corner.
  TanreiCornerRadii get radii => corners ?? TanreiCornerRadii.all(radius);

  /// Whether no corner is rounded.
  bool get isSquare => corners?.isSquare ?? radius <= 0;

  /// Whether the corners are plain quarter circles: an amount of 0, or no radius at all. Such a
  /// shape is drawn as an [RRect], exactly as `BoxDecoration` draws it.
  bool get isCircular => smoothing <= 0 || isSquare;

  /// The corners as a [BorderRadius], for callers that speak `BoxDecoration`.
  BorderRadius get borderRadius => switch (corners) {
    null => BorderRadius.circular(radius),
    final TanreiCornerRadii c => BorderRadius.only(
      topLeft: Radius.circular(c.topLeft),
      topRight: Radius.circular(c.topRight),
      bottomRight: Radius.circular(c.bottomRight),
      bottomLeft: Radius.circular(c.bottomLeft),
    ),
  };

  /// This shape's outline for [rect] grown by [delta] on every side (shrunk if negative). A rounded
  /// corner keeps its center — the radius grows by [delta], never below zero — and a square
  /// corner stays square, like a CSS outline or the spread of a CSS shadow.
  Path path(Rect rect, {double delta = 0}) {
    final Rect box = rect.inflate(delta);
    final TanreiCornerRadii? each = corners;
    if (each != null) {
      final TanreiCornerRadii grown = each.grow(delta);
      return isCircular
          ? (Path()..addRRect(grown.rrect(box)))
          : tanreiSmoothedRectPathOf(box, grown, smoothing);
    }
    final double grown = _grow(delta);
    return isCircular
        ? (Path()..addRRect(_rrect(box, grown)))
        : tanreiSmoothedRectPath(box, grown, smoothing);
  }

  /// Fills (or strokes, as [paint] says) the outline of [rect] grown by [delta].
  void paint(Canvas canvas, Rect rect, Paint paint, {double delta = 0}) {
    if (corners case final TanreiCornerRadii each when isCircular) {
      canvas.drawRRect(each.grow(delta).rrect(rect.inflate(delta)), paint);
    } else if (isCircular) {
      // The call `BoxDecoration` makes: a circular container rasterizes exactly as it always has.
      canvas.drawRRect(_rrect(rect.inflate(delta), _grow(delta)), paint);
    } else {
      canvas.drawPath(path(rect, delta: delta), paint);
    }
  }

  /// Fills the band between the outlines at [inner] and [outer] (both as `delta` of [path]).
  void paintBand(
    Canvas canvas,
    Rect rect,
    Paint paint, {
    required double inner,
    required double outer,
  }) {
    if (outer <= inner) {
      return;
    }
    if (corners case final TanreiCornerRadii each when isCircular) {
      canvas.drawDRRect(
        each.grow(outer).rrect(rect.inflate(outer)),
        each.grow(inner).rrect(rect.inflate(inner)),
        paint,
      );
    } else if (isCircular) {
      canvas.drawDRRect(
        _rrect(rect.inflate(outer), _grow(outer)),
        _rrect(rect.inflate(inner), _grow(inner)),
        paint,
      );
    } else {
      canvas.drawPath(
        Path()
          ..fillType = PathFillType.evenOdd
          ..addPath(path(rect, delta: outer), Offset.zero)
          ..addPath(path(rect, delta: inner), Offset.zero),
        paint,
      );
    }
  }

  double _grow(double delta) => radius <= 0 ? 0 : math.max(0, radius + delta);

  static RRect _rrect(Rect rect, double radius) =>
      RRect.fromRectAndRadius(rect, Radius.circular(radius));

  @override
  bool operator ==(Object other) =>
      other is TanreiCornerShape &&
      other.smoothing == smoothing &&
      other.radius == radius &&
      other.corners == corners;

  @override
  int get hashCode => Object.hash(smoothing, radius, corners);

  @override
  String toString() => corners == null
      ? 'TanreiCornerShape(smoothing: $smoothing, radius: $radius)'
      : 'TanreiCornerShape.only(smoothing: $smoothing, corners: $corners)';
}

/// The radii of the four corners of a [TanreiCornerShape.only], by physical corner. A component
/// that knows its corners by start and end resolves them with [TanreiCornerRadii.directional].
@immutable
class TanreiCornerRadii {
  /// Four radii.
  const TanreiCornerRadii({
    required this.topLeft,
    required this.topRight,
    required this.bottomRight,
    required this.bottomLeft,
  });

  /// One radius for every corner.
  const TanreiCornerRadii.all(double radius)
    : topLeft = radius,
      topRight = radius,
      bottomRight = radius,
      bottomLeft = radius;

  /// The radii of the corners at the start ([start]) and at the end ([end]) of the inline axis, top
  /// and bottom alike, for [textDirection]: in a right-to-left layout the start corners are the
  /// right ones.
  factory TanreiCornerRadii.directional({
    required double start,
    required double end,
    required TextDirection textDirection,
  }) => switch (textDirection) {
    TextDirection.ltr => TanreiCornerRadii(
      topLeft: start,
      topRight: end,
      bottomRight: end,
      bottomLeft: start,
    ),
    TextDirection.rtl => TanreiCornerRadii(
      topLeft: end,
      topRight: start,
      bottomRight: start,
      bottomLeft: end,
    ),
  };

  /// The top-left corner's radius.
  final double topLeft;

  /// The top-right corner's radius.
  final double topRight;

  /// The bottom-right corner's radius.
  final double bottomRight;

  /// The bottom-left corner's radius.
  final double bottomLeft;

  /// The largest radius.
  double get largest => math.max(math.max(topLeft, topRight), math.max(bottomRight, bottomLeft));

  /// Whether no corner is rounded.
  bool get isSquare => largest <= 0;

  /// Every rounded corner grown by [delta] (never below zero); a square corner stays square.
  TanreiCornerRadii grow(double delta) {
    double g(double r) => r <= 0 ? 0 : math.max(0, r + delta);
    return TanreiCornerRadii(
      topLeft: g(topLeft),
      topRight: g(topRight),
      bottomRight: g(bottomRight),
      bottomLeft: g(bottomLeft),
    );
  }

  /// These corners on [rect] as a circular [RRect], each limited to half the shorter side.
  RRect rrect(Rect rect) {
    final double limit = math.max(0, rect.shortestSide / 2);
    Radius r(double v) => Radius.circular(v.clamp(0, limit).toDouble());
    return RRect.fromRectAndCorners(
      rect,
      topLeft: r(topLeft),
      topRight: r(topRight),
      bottomRight: r(bottomRight),
      bottomLeft: r(bottomLeft),
    );
  }

  @override
  bool operator ==(Object other) =>
      other is TanreiCornerRadii &&
      other.topLeft == topLeft &&
      other.topRight == topRight &&
      other.bottomRight == bottomRight &&
      other.bottomLeft == bottomLeft;

  @override
  int get hashCode => Object.hash(topLeft, topRight, bottomRight, bottomLeft);

  @override
  String toString() =>
      'TanreiCornerRadii(topLeft: $topLeft, topRight: $topRight, bottomRight: $bottomRight, '
      'bottomLeft: $bottomLeft)';
}

/// A rectangle whose corners of [radius] are eased by [smoothing] (0–1), Figma's corner-smoothing
/// construction with Figma's per-corner budget (see [TanreiCornerShape] for the formulas). At 0 it is the circular
/// rounded rectangle; [radius] is limited to half the shorter side.
Path tanreiSmoothedRectPath(Rect rect, double radius, double smoothing) {
  final double limit = rect.shortestSide / 2;
  final double r = radius.clamp(0, math.max(0, limit)).toDouble();
  if (r <= 0) {
    return Path()..addRect(rect);
  }
  final double s = smoothing.clamp(0, 1).toDouble();
  if (s <= 0) {
    return Path()..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(r)));
  }
  // Figma's budget (`maxCornerSmoothing` of figma-squircle): a corner has half the shorter side as
  // room, of which the corner circle itself needs one radius. Every corner of the box has the same
  // room, so one leg serves both sides of every corner.
  final _Leg leg = _Leg(math.min(s, limit / r - 1).clamp(0, 1).toDouble());
  if (leg.s <= 0) {
    // No room to ease (a pill): the corner is the circle, exactly as at an amount of 0.
    return Path()..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(r)));
  }

  final Path path = Path();
  // One corner. [along] is the direction the arriving edge travels towards the corner, [away] the
  // direction the leaving edge travels from it. A point (x, y) of the corner's frame — x along the
  // arriving edge (negative before the corner), y along the leaving edge — in units of the radius.
  void corner(Offset at, Offset along, Offset away, {bool first = false}) {
    Offset world(double x, double y) => at + along * (x * r) + away * (y * r);
    void cubic(Offset c1, Offset c2, Offset end) =>
        path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, end.dx, end.dy);

    // The arriving leg, along the edge: P0 on the edge, P3 on the corner circle.
    final Offset p0 = world(-leg.p, 0);
    if (first) {
      path.moveTo(p0.dx, p0.dy);
    } else {
      path.lineTo(p0.dx, p0.dy);
    }
    final Offset a = world(-leg.x3, leg.d);
    if (leg.s > 0) {
      cubic(world(-leg.p + leg.a, 0), world(-leg.x3 - leg.c, 0), a);
    }
    // The arc: the corner circle from tangent angle β to 90° − β, as one cubic.
    final Offset b = world(-leg.d, leg.x3);
    final double theta = math.pi / 2 - 2 * leg.beta;
    final double h = 4 / 3 * math.tan(theta / 4);
    cubic(
      world(-leg.x3 + h * math.cos(leg.beta), leg.d + h * math.sin(leg.beta)),
      world(-leg.d - h * math.sin(leg.beta), leg.x3 - h * math.cos(leg.beta)),
      b,
    );
    // The leaving leg: the arriving one, mirrored across the corner's diagonal.
    if (leg.s > 0) {
      cubic(world(0, leg.x3 + leg.c), world(0, leg.p - leg.a), world(0, leg.p));
    }
  }

  corner(rect.topRight, const Offset(1, 0), const Offset(0, 1), first: true);
  corner(rect.bottomRight, const Offset(0, 1), const Offset(-1, 0));
  corner(rect.bottomLeft, const Offset(-1, 0), const Offset(0, -1));
  corner(rect.topLeft, const Offset(0, -1), const Offset(1, 0));
  return path..close();
}

/// A rectangle whose four corners have their own radii ([corners]), each eased by [smoothing]
/// with Figma's per-corner budget: every corner has half the box's shorter side as room, and takes
/// the amount its own radius leaves (see [TanreiCornerShape]). A corner of radius 0 is square; a
/// corner with no room to ease is a quarter circle. With four equal radii it is the path of
/// [tanreiSmoothedRectPath] up to how an uneased corner is written (one cubic instead of an
/// `RRect` arc).
Path tanreiSmoothedRectPathOf(Rect rect, TanreiCornerRadii corners, double smoothing) {
  final double limit = math.max(0, rect.shortestSide / 2);
  final double s = smoothing.clamp(0, 1).toDouble();
  final Path path = Path();

  void corner(double radius, Offset at, Offset along, Offset away, {bool first = false}) {
    final double r = radius.clamp(0, limit).toDouble();
    if (r <= 0) {
      if (first) {
        path.moveTo(at.dx, at.dy);
      } else {
        path.lineTo(at.dx, at.dy);
      }
      return;
    }
    final _Leg leg = _Leg(math.min(s, limit / r - 1).clamp(0, 1).toDouble());
    Offset world(double x, double y) => at + along * (x * r) + away * (y * r);
    void cubic(Offset c1, Offset c2, Offset end) =>
        path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, end.dx, end.dy);

    final Offset p0 = world(-leg.p, 0);
    if (first) {
      path.moveTo(p0.dx, p0.dy);
    } else {
      path.lineTo(p0.dx, p0.dy);
    }
    final Offset a = world(-leg.x3, leg.d);
    if (leg.s > 0) {
      cubic(world(-leg.p + leg.a, 0), world(-leg.x3 - leg.c, 0), a);
    }
    final Offset b = world(-leg.d, leg.x3);
    final double theta = math.pi / 2 - 2 * leg.beta;
    final double h = 4 / 3 * math.tan(theta / 4);
    cubic(
      world(-leg.x3 + h * math.cos(leg.beta), leg.d + h * math.sin(leg.beta)),
      world(-leg.d - h * math.sin(leg.beta), leg.x3 - h * math.cos(leg.beta)),
      b,
    );
    if (leg.s > 0) {
      cubic(world(0, leg.x3 + leg.c), world(0, leg.p - leg.a), world(0, leg.p));
    }
  }

  corner(corners.topRight, rect.topRight, const Offset(1, 0), const Offset(0, 1), first: true);
  corner(corners.bottomRight, rect.bottomRight, const Offset(0, 1), const Offset(-1, 0));
  corner(corners.bottomLeft, rect.bottomLeft, const Offset(-1, 0), const Offset(0, -1));
  corner(corners.topLeft, rect.topLeft, const Offset(0, -1), const Offset(1, 0));
  return path..close();
}

/// One eased leg of a corner, in units of the radius (the formulas in [TanreiCornerShape]).
class _Leg {
  _Leg(this.s)
    : beta = math.pi / 4 * s,
      p = 1 + s,
      d = 1 - math.cos(math.pi / 4 * s),
      x3 = 1 - math.sin(math.pi / 4 * s),
      c = math.tan(math.pi / 8 * s) * math.cos(math.pi / 4 * s) {
    a = 2 / 3 * (p - x3 - c);
  }

  /// The amount the corner takes: the design system's, limited by the corner's room.
  final double s;

  /// The part of the 90° turn this leg takes, in radians.
  final double beta;

  /// Where the leg leaves the straight edge, from the corner.
  final double p;

  /// The leg's end: [x3] along the edge from the corner, [d] off it — a point of the corner circle.
  final double d;
  final double x3;

  /// The second control's distance from the end, along the edge.
  final double c;

  /// The first control's distance from the start, along the edge (`a` of figma-squircle).
  late final double a;
}
