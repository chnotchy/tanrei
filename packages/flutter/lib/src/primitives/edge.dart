import 'package:flutter/widgets.dart';

/// Which edge of a region an edge line runs along; [start] and [end] follow the text direction.
enum TanreiEdgeSide {
  /// The top edge (a navigation bar's).
  top,

  /// The bottom edge (an app bar's).
  bottom,

  /// The start edge: the left one left to right, the right one right to left.
  start,

  /// The end edge (a navigation rail's, a standard navigation drawer's).
  end,
}

/// Paints the line that sets a layout region apart from the content next to it (an app bar's
/// bottom edge, a navigation bar's top edge, a rail's or a drawer's end edge): [width] thick along
/// [side], inside the region, in [color] (nothing at zero alpha). Use it as a `CustomPaint`'s
/// `foregroundPainter`, so the line is drawn over the region's content.
class TanreiEdgePainter extends CustomPainter {
  /// Paints a line [width] thick in [color] along [side].
  const TanreiEdgePainter({
    required this.color,
    required this.width,
    required this.side,
    this.textDirection = TextDirection.ltr,
  });

  /// The line's color (the component's outline color token, resolved).
  final Color color;

  /// The line's thickness (the component's outline width token).
  final double width;

  /// The edge it runs along.
  final TanreiEdgeSide side;

  /// Resolves [TanreiEdgeSide.start] and [TanreiEdgeSide.end].
  final TextDirection textDirection;

  /// The line's rectangle in a region of [size].
  Rect rectIn(Size size) {
    final bool rtl = textDirection == TextDirection.rtl;
    return switch (side) {
      TanreiEdgeSide.top => Rect.fromLTWH(0, 0, size.width, width),
      TanreiEdgeSide.bottom => Rect.fromLTWH(0, size.height - width, size.width, width),
      TanreiEdgeSide.start when rtl => Rect.fromLTWH(size.width - width, 0, width, size.height),
      TanreiEdgeSide.end when !rtl => Rect.fromLTWH(size.width - width, 0, width, size.height),
      TanreiEdgeSide.start || TanreiEdgeSide.end => Rect.fromLTWH(0, 0, width, size.height),
    };
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (color.a <= 0 || width <= 0) {
      return;
    }
    canvas.drawRect(rectIn(size), Paint()..color = color);
  }

  @override
  bool shouldRepaint(TanreiEdgePainter oldDelegate) =>
      oldDelegate.color != color ||
      oldDelegate.width != width ||
      oldDelegate.side != side ||
      oldDelegate.textDirection != textDirection;
}

/// Clips a region only at one [side] (and far beyond the other three), so that a container drawn
/// past that edge loses its corners there while its shadows on the other sides stay: a bottom
/// sheet's square bottom corners (BSH-7), a side sheet's square end corners (SSH-7).
class TanreiEdgeClipper extends CustomClipper<Rect> {
  /// Clips at [side], resolved for [textDirection].
  const TanreiEdgeClipper({required this.side, this.textDirection = TextDirection.ltr});

  /// The edge that is clipped.
  final TanreiEdgeSide side;

  /// Resolves [TanreiEdgeSide.start] and [TanreiEdgeSide.end].
  final TextDirection textDirection;

  @override
  Rect getClip(Size size) {
    final double far = size.longestSide + size.shortestSide;
    final bool rtl = textDirection == TextDirection.rtl;
    return switch (side) {
      TanreiEdgeSide.top => Rect.fromLTRB(-far, 0, size.width + far, size.height + far),
      TanreiEdgeSide.bottom => Rect.fromLTRB(-far, -far, size.width + far, size.height),
      TanreiEdgeSide.start when rtl => Rect.fromLTRB(-far, -far, size.width, size.height + far),
      TanreiEdgeSide.end when !rtl => Rect.fromLTRB(-far, -far, size.width, size.height + far),
      TanreiEdgeSide.start ||
      TanreiEdgeSide.end => Rect.fromLTRB(0, -far, size.width + far, size.height + far),
    };
  }

  @override
  bool shouldReclip(TanreiEdgeClipper oldClipper) =>
      oldClipper.side != side || oldClipper.textDirection != textDirection;
}
