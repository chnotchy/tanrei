import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Marks the render box that draws a field's container (a text field's), so that a composite can
/// level what it draws beside a field with that container, however the field grows around it: a
/// label that wraps (TXF-13), enlarged text (TXF-16), a target that reaches past it (TXF-8).
///
/// Not exported: a component's own layout reads it, never a product.
mixin TanreiFieldContainerBox on RenderBox {
  Size? _containerSize;

  /// Records the size this layout gave the container, for [tanreiFieldContainerRectIn] to read
  /// during a composite's layout (where a descendant's `size` may not be read). Call it at the end
  /// of `performLayout`.
  @protected
  void recordContainerSize() => _containerSize = size;
}

/// Where the first field container inside [root]'s laid-out subtree is, in [root]'s coordinates;
/// null when there is none. Call it only after [root] has been laid out.
Rect? tanreiFieldContainerRectIn(RenderBox root) {
  TanreiFieldContainerBox? found;
  void visit(RenderObject child) {
    if (found != null) {
      return;
    }
    if (child is TanreiFieldContainerBox) {
      found = child;
      return;
    }
    child.visitChildren(visit);
  }

  root.visitChildren(visit);
  final TanreiFieldContainerBox? box = found;
  final Size? size = box?._containerSize;
  if (box == null || size == null) {
    return null;
  }
  return MatrixUtils.transformRect(box.getTransformTo(root), Offset.zero & size);
}

/// The labels of the text fields laid out as peers under it — side by side, equally tall — which
/// each of them makes room for besides its own (TXF-13): every field is as tall, its container as
/// tall and as far below its top, as the tallest of those labels needs, resting and floated, so
/// the fields stay equally tall with their containers level when one label wraps and the other
/// does not (the date picker's range text entry, DTP-25).
///
/// Not exported: a component's own layout provides it, never a product.
class TanreiFieldLabelRoom extends InheritedWidget {
  /// Makes the fields under [child] room for [labels].
  const TanreiFieldLabelRoom({super.key, required this.labels, required super.child});

  /// The peers' labels (a field's own label among them is measured once).
  final List<String> labels;

  /// The labels the fields under [context] make room for; empty when they are not peers.
  static List<String> of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<TanreiFieldLabelRoom>()?.labels ??
      const <String>[];

  @override
  bool updateShouldNotify(TanreiFieldLabelRoom oldWidget) => !listEquals(oldWidget.labels, labels);
}
