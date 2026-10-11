import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'corner_shape.dart';

/// The keyboard focus indicator.
///
/// Drawn from the control outwards with the `measure.focus*` tokens of the active design system:
/// a signed `focusOffset` (negative starts inside the control), an optional inner stroke of
/// `focusInnerWidth` in the `focusRingInner` role (0 = none), then the outer stroke of
/// `focusOuterWidth` in the `focusRing` role. With no inner stroke the offset leaves the surface
/// visible as a gap.
///
/// `behavior.focusStyle` of the design system chooses how the two strokes are drawn (spec BTN-10):
/// `ring` as hard lines, `glow` as a soft halo — the same two bands in the same two colors, blurred
/// by the ring width (a CSS blur radius: σ = width / 2). `shape.cornerSmoothing` eases the corners
/// of the indicator like the corners of the control.
///
/// With [inside] the same bands are moved inwards until the outer edge of the outer stroke lies on
/// [child]'s edge: an item of a list or a menu shows its focus inside its row, where the scrolling
/// ancestor or the menu's surface cannot clip it (LST-4, MNU-11).
///
/// It does not affect layout and it is never animated. Callers pass [visible] only for keyboard
/// focus, which is what `FocusableActionDetector.onShowFocusHighlight` reports
/// (`FocusManager.highlightMode`).
class TanreiFocusRing extends StatelessWidget {
  /// Draws the indicator around [child] while [visible].
  const TanreiFocusRing({
    super.key,
    required this.visible,
    this.borderRadius = BorderRadius.zero,
    this.inside = false,
    required this.child,
  });

  /// Whether the indicator is drawn inside [child]'s edge instead of around it.
  final bool inside;

  /// Whether the indicator is shown.
  final bool visible;

  /// The shape of [child]; the indicator's corners are offset from it. Circular radii, one per
  /// corner (the x of each); four equal ones are the common case.
  final BorderRadius borderRadius;

  /// The focusable visual.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!visible) {
      return CustomPaint(child: child);
    }
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiMeasure measure = theme.system.measure;
    // Inside: the whole indicator moves in by how far it would reach beyond the edge.
    final double reach = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth;
    final double shift = inside && reach > 0 ? -reach : 0;
    return CustomPaint(
      foregroundPainter: _FocusRingPainter(
        shape: _shapeOf(borderRadius, theme.system.shape.cornerSmoothing),
        focusStyle: theme.system.behavior.focusStyle,
        offset: measure.focusOffset + shift,
        innerWidth: measure.focusInnerWidth,
        innerColor: theme.color(TanreiColorRole.focusRingInner),
        outerWidth: measure.focusOuterWidth,
        outerColor: theme.color(TanreiColorRole.focusRing),
      ),
      child: child,
    );
  }
}

/// One radius when the four corners agree (every control but a joined item), else each corner's.
TanreiCornerShape _shapeOf(BorderRadius radius, double smoothing) {
  final double topLeft = radius.topLeft.x;
  if (radius.topRight.x == topLeft &&
      radius.bottomRight.x == topLeft &&
      radius.bottomLeft.x == topLeft) {
    return TanreiCornerShape(smoothing: smoothing, radius: topLeft);
  }
  return TanreiCornerShape.only(
    smoothing: smoothing,
    corners: TanreiCornerRadii(
      topLeft: topLeft,
      topRight: radius.topRight.x,
      bottomRight: radius.bottomRight.x,
      bottomLeft: radius.bottomLeft.x,
    ),
  );
}

class _FocusRingPainter extends CustomPainter {
  const _FocusRingPainter({
    required this.shape,
    required this.focusStyle,
    required this.offset,
    required this.innerWidth,
    required this.innerColor,
    required this.outerWidth,
    required this.outerColor,
  });

  final TanreiCornerShape shape;
  final TanreiFocusStyle focusStyle;
  final double offset;
  final double innerWidth;
  final Color innerColor;
  final double outerWidth;
  final Color outerColor;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect control = Offset.zero & size;
    _stroke(canvas, control, distance: offset, width: innerWidth, color: innerColor);
    _stroke(canvas, control, distance: offset + innerWidth, width: outerWidth, color: outerColor);
  }

  /// Strokes a band of [width] whose inner edge is [distance] outside [control] (inside if negative).
  void _stroke(
    Canvas canvas,
    Rect control, {
    required double distance,
    required double width,
    required Color color,
  }) {
    if (width <= 0) {
      return;
    }
    final Paint paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..color = color;
    switch (focusStyle) {
      case TanreiFocusStyle.ring:
        break;
      case TanreiFocusStyle.glow:
        // The halo is blurred by the width of the outer stroke, read as a CSS blur radius.
        paint.maskFilter = MaskFilter.blur(BlurStyle.normal, outerWidth / _cssBlurPerSigma);
    }
    // A stroke is centered on its outline, so the outline sits half a stroke beyond the inner edge.
    shape.paint(canvas, control, paint, delta: distance + width / 2);
  }

  @override
  bool shouldRepaint(_FocusRingPainter oldDelegate) =>
      shape != oldDelegate.shape ||
      focusStyle != oldDelegate.focusStyle ||
      offset != oldDelegate.offset ||
      innerWidth != oldDelegate.innerWidth ||
      innerColor != oldDelegate.innerColor ||
      outerWidth != oldDelegate.outerWidth ||
      outerColor != oldDelegate.outerColor;
}

/// CSS: a blur radius is twice the standard deviation of the Gaussian.
const double _cssBlurPerSigma = 2;
