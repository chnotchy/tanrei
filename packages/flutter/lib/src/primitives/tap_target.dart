import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../theme/theme.dart';

/// Extends layout and hit testing to the minimum target without changing the visual child.
///
/// The child keeps its own size and is centered in a box of at least [minSize] on both axes.
/// Pointer events that land in the added space are forwarded to the center of the child, so the
/// whole box activates it.
class TanreiTapTarget extends SingleChildRenderObjectWidget {
  /// Guarantees a target of at least [minSize] (default: the `measure.targetTouch` token of the
  /// active design system).
  const TanreiTapTarget({super.key, this.minSize, required Widget super.child});

  /// Minimum width and height of the target, in logical pixels. Null reads the touch target token
  /// from the theme; Flutter cannot tell a fine pointer before it arrives, so touch is the default.
  final double? minSize;

  double _resolve(BuildContext context) =>
      minSize ?? TanreiTheme.of(context).system.measure.targetTouch;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderTapTarget(_resolve(context));

  @override
  void updateRenderObject(BuildContext context, covariant RenderObject renderObject) {
    (renderObject as _RenderTapTarget).minSize = _resolve(context);
  }
}

class _RenderTapTarget extends RenderShiftedBox {
  _RenderTapTarget(this._minSize) : super(null);

  double get minSize => _minSize;
  double _minSize;
  set minSize(double value) {
    if (_minSize == value) {
      return;
    }
    _minSize = value;
    markNeedsLayout();
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      math.max(child?.getMinIntrinsicWidth(height) ?? 0, minSize);

  @override
  double computeMaxIntrinsicWidth(double height) =>
      math.max(child?.getMaxIntrinsicWidth(height) ?? 0, minSize);

  @override
  double computeMinIntrinsicHeight(double width) =>
      math.max(child?.getMinIntrinsicHeight(width) ?? 0, minSize);

  @override
  double computeMaxIntrinsicHeight(double width) =>
      math.max(child?.getMaxIntrinsicHeight(width) ?? 0, minSize);

  Size _sizeFor(Size childSize, BoxConstraints constraints) => constraints.constrain(
    Size(math.max(childSize.width, minSize), math.max(childSize.height, minSize)),
  );

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      _sizeFor(child?.getDryLayout(constraints) ?? Size.zero, constraints);

  /// Where the visual child was placed by the last layout, in this box's coordinates.
  Rect visibleRect = Rect.zero;

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    if (child == null) {
      size = _sizeFor(Size.zero, constraints);
      visibleRect = Offset.zero & size;
      return;
    }
    child.layout(constraints, parentUsesSize: true);
    size = _sizeFor(child.size, constraints);
    final BoxParentData childParentData = child.parentData! as BoxParentData;
    childParentData.offset = Alignment.center.alongOffset(size - child.size as Offset);
    visibleRect = childParentData.offset & child.size;
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (super.hitTest(result, position: position)) {
      return true;
    }
    final RenderBox? child = this.child;
    if (child == null || !size.contains(position)) {
      return false;
    }
    // The pointer is in the added space: forward it to the center of the visual child.
    final Offset center = child.size.center(Offset.zero);
    return result.addWithRawTransform(
      transform: MatrixUtils.forceToPoint(center),
      position: center,
      hitTest: (BoxHitTestResult result, Offset position) =>
          child.hitTest(result, position: center),
    );
  }
}

/// The rectangle a control draws inside [box] (laid out, [size] big), in [box]'s coordinates: for
/// a control whose layout a [TanreiTapTarget] grows to the minimum target (an icon button, a
/// button), the visual child of the first tap target found below [box] through single-child render
/// objects; for anything else, the whole box.
///
/// For a layout that places controls by what they draw and lets their targets reach into the space
/// around them (a toolbar's items, TBR-2 and TBR-4). Call it after [box] was laid out.
Rect tanreiVisibleRectOf(RenderBox box, Size size) {
  RenderObject? current = box;
  Offset offset = Offset.zero;
  while (current != null) {
    if (current is _RenderTapTarget) {
      return current.visibleRect.shift(offset);
    }
    if (current is! RenderObjectWithChildMixin<RenderBox>) {
      break;
    }
    final RenderBox? child = current.child;
    if (child == null) {
      break;
    }
    final ParentData? data = child.parentData;
    if (data is BoxParentData) {
      offset += data.offset;
    }
    current = child;
  }
  return Offset.zero & size;
}

/// Lays [child] out at the size of what it draws ([tanreiVisibleRectOf]): a control whose
/// [TanreiTapTarget] grows its layout to the minimum target takes only its visible size in a row
/// (an icon button in a search bar, SRC-1), while its target reaches beyond that size, painted and
/// hit-tested where the control put it.
///
/// The target outside this box is reached only where the parent lets a press through (a parent
/// hit-tests its children anywhere inside itself).
class TanreiVisibleSize extends SingleChildRenderObjectWidget {
  /// Lays out [child] at its visible size.
  const TanreiVisibleSize({super.key, required Widget super.child});

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderVisibleSize();
}

class _RenderVisibleSize extends RenderProxyBox {
  /// Where the visible part lies in the child.
  Rect _visible = Rect.zero;

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    child.layout(constraints.loosen(), parentUsesSize: true);
    _visible = tanreiVisibleRectOf(child, child.size);
    size = constraints.constrain(_visible.size);
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      constraints.constrain(child?.getDryLayout(constraints.loosen()) ?? Size.zero);

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    if (child != null) {
      context.paintChild(child, offset - _visible.topLeft);
    }
  }

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    transform.translate(-_visible.left, -_visible.top);
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    final RenderBox? child = this.child;
    if (child == null) {
      return false;
    }
    final bool hit = result.addWithPaintOffset(
      offset: -_visible.topLeft,
      position: position,
      hitTest: (BoxHitTestResult result, Offset transformed) =>
          (Offset.zero & child.size).contains(transformed) &&
          child.hitTest(result, position: transformed),
    );
    if (hit) {
      result.add(BoxHitTestEntry(this, position));
    }
    return hit;
  }
}
