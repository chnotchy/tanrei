import 'package:flutter/widgets.dart';

/// Tells the `TanreiMenuAnchor` built as [anchor] that its anchor exposes its own expanded state:
/// the anchor then adds no `MergeSemantics` and no expanded state around what it is anchored to.
///
/// **Internal to the package** (not exported from `package:tanrei/tanrei.dart`, not part of the
/// menu's public surface). A split button anchors its menu to the whole control, whose two halves
/// must stay two buttons, and puts the expanded state on the trailing half itself (SPB-17).
class TanreiMenuAnchorOwnSemantics extends InheritedWidget {
  /// Marks [anchor].
  const TanreiMenuAnchorOwnSemantics({super.key, required this.anchor}) : super(child: anchor);

  /// The menu anchor this applies to.
  final Widget anchor;

  /// Whether the menu anchor [widget], built in [context], leaves its semantics to its anchor.
  static bool of(BuildContext context, Widget widget) {
    final TanreiMenuAnchorOwnSemantics? scope = context
        .getInheritedWidgetOfExactType<TanreiMenuAnchorOwnSemantics>();
    return scope != null && identical(scope.anchor, widget);
  }

  @override
  bool updateShouldNotify(TanreiMenuAnchorOwnSemantics oldWidget) => false;
}
