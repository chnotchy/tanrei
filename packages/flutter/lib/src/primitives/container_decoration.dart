import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'corner_shape.dart';

/// A pressed state layer that grows from the point of contact (`behavior.pressedFeedback` =
/// `ripple`, spec BTN-9).
@immutable
class TanreiRipple {
  /// A ripple of [color] at [progress] (0 = nothing yet, 1 = the whole container).
  const TanreiRipple({required this.origin, required this.progress, required this.color});

  /// Where the press happened, in the container's coordinates; null = the center (keyboard and
  /// assistive-technology activation).
  final Offset? origin;

  /// How far the layer has grown, from 0 to 1. At 1 it reaches the farthest corner.
  final double progress;

  /// What the container looks like inside the ripple: the pressed container color of the design
  /// system, fading to the color underneath once the press has ended. It REPLACES the fill inside
  /// the circle (it is not composited over it), so a fully grown ripple is exactly the pressed
  /// container the tokens describe.
  final Color color;

  @override
  bool operator ==(Object other) =>
      other is TanreiRipple &&
      other.origin == origin &&
      other.progress == progress &&
      other.color == color;

  @override
  int get hashCode => Object.hash(origin, progress, color);

  @override
  String toString() => 'TanreiRipple(origin: $origin, progress: $progress, color: $color)';
}

/// The container of a control: elevation shadows, fill, an optional [ripple], and one uniform
/// border — in that order — inside a [TanreiCornerShape].
///
/// It reads like a `BoxDecoration` ([color], [border], [borderRadius], [boxShadow]) and paints a
/// circular container with the very same canvas calls. What it adds: the corner smoothing of the
/// design system (`shape.cornerSmoothing`), the ripple, and CSS semantics for a shadow's spread (the
/// corner radius grows with it).
@immutable
class TanreiContainerDecoration extends Decoration {
  /// Describes a container.
  const TanreiContainerDecoration({
    required this.shape,
    this.color,
    this.border,
    this.boxShadow,
    this.ripple,
  });

  /// Corner style and radius.
  final TanreiCornerShape shape;

  /// The fill; null = none.
  final Color? color;

  /// One uniform border: an outline inside the box, or an elevation ring outside it
  /// (`BorderSide.strokeAlign`).
  final Border? border;

  /// Drop shadows, in paint order. `blurRadius` is Flutter's quantity (see
  /// `tanreiBlurRadiusFromCss`).
  final List<BoxShadow>? boxShadow;

  /// The growing pressed layer, while there is one.
  final TanreiRipple? ripple;

  /// The corner radius as a [BorderRadius], for callers that speak `BoxDecoration`.
  BorderRadius get borderRadius => shape.borderRadius;

  @override
  Path getClipPath(Rect rect, TextDirection textDirection) => shape.path(rect);

  @override
  bool hitTest(Size size, Offset position, {TextDirection? textDirection}) =>
      (Offset.zero & size).contains(position);

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) => _ContainerPainter(this);

  @override
  bool operator ==(Object other) =>
      other is TanreiContainerDecoration &&
      other.shape == shape &&
      other.color == color &&
      other.border == border &&
      listEquals(other.boxShadow, boxShadow) &&
      other.ripple == ripple;

  @override
  int get hashCode => Object.hash(
    shape,
    color,
    border,
    boxShadow == null ? null : Object.hashAll(boxShadow!),
    ripple,
  );

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<TanreiCornerShape>('shape', shape))
      ..add(ColorProperty('color', color, defaultValue: null))
      ..add(DiagnosticsProperty<Border>('border', border, defaultValue: null))
      ..add(IterableProperty<BoxShadow>('boxShadow', boxShadow, defaultValue: null))
      ..add(DiagnosticsProperty<TanreiRipple>('ripple', ripple, defaultValue: null));
  }
}

class _ContainerPainter extends BoxPainter {
  _ContainerPainter(this.decoration);

  final TanreiContainerDecoration decoration;

  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final Rect rect = offset & configuration.size!;
    final TanreiCornerShape shape = decoration.shape;

    for (final BoxShadow shadow in decoration.boxShadow ?? const <BoxShadow>[]) {
      shape.paint(canvas, rect.shift(shadow.offset), shadow.toPaint(), delta: shadow.spreadRadius);
    }

    final Color? color = decoration.color;
    final TanreiRipple? ripple = decoration.ripple;
    if (ripple == null || ripple.progress <= 0) {
      if (color != null) {
        shape.paint(canvas, rect, Paint()..color = color);
      }
    } else {
      // The ripple replaces the fill inside its circle, so both are drawn into one layer: a
      // translucent pressed color must not add up with a translucent fill underneath it.
      final Offset origin = rect.topLeft + (ripple.origin ?? rect.size.center(Offset.zero));
      final double reach = <Offset>[
        rect.topLeft,
        rect.topRight,
        rect.bottomLeft,
        rect.bottomRight,
      ].map((Offset corner) => (corner - origin).distance).reduce((a, b) => a > b ? a : b);
      // One antialiased edge each: the circle is drawn over the unclipped fill, then everything
      // outside the container shape is cleared.
      canvas.saveLayer(rect, Paint());
      if (color != null) {
        canvas.drawRect(rect, Paint()..color = color);
      }
      canvas
        ..drawCircle(
          origin,
          reach * ripple.progress,
          Paint()
            ..color = ripple.color
            ..blendMode = BlendMode.src,
        )
        ..drawPath(
          Path()
            ..fillType = PathFillType.evenOdd
            ..addRect(rect.inflate(1))
            ..addPath(shape.path(rect), Offset.zero),
          Paint()..blendMode = BlendMode.clear,
        )
        ..restore();
    }

    final Border? border = decoration.border;
    if (border != null) {
      final BorderSide side = border.top;
      assert(border.isUniform, 'A container has one uniform border.');
      if (side.style == BorderStyle.none) {
        // Nothing to draw.
      } else if (shape.isSquare) {
        border.paint(canvas, rect);
      } else if (side.width <= 0) {
        // A hairline, as `Border` draws a zero-width side.
        shape.paint(
          canvas,
          rect,
          Paint()
            ..color = side.color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 0,
        );
      } else {
        shape.paintBand(
          canvas,
          rect,
          Paint()..color = side.color,
          inner: -side.strokeInset,
          outer: side.strokeOutset,
        );
      }
    }
  }
}
