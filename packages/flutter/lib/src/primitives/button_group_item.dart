import 'package:flutter/widgets.dart';

/// What a connected button group tells one of its items (BGR-2, BGR-3; BTN-10, ICB-10): which of
/// its corners face a neighbour and take [innerRadius], and the width the item is at least.
///
/// **Internal to the package.** It is not exported from `package:tanrei/tanrei.dart`: it is not
/// part of Button's or IconButton's public surface, and a product draws joined buttons only through
/// `TanreiButtonGroup`. `TanreiButton` and `TanreiIconButton` read it with [of], which answers only
/// for the item the scope was built around ([item]), never for a button further down.
///
/// While an item is in a connected group it also leaves the vertical extension of its hit area to
/// the group (the group extends every item's hit area and accessibility node above and below the
/// row), and it merges its semantics into the node the group gives it.
class TanreiButtonGroupItemScope extends InheritedWidget {
  /// Tells [item] how the group draws it.
  const TanreiButtonGroupItemScope({
    super.key,
    required this.item,
    required this.innerStart,
    required this.innerEnd,
    required this.innerRadius,
    required this.minWidth,
  }) : super(child: item);

  /// The item this applies to: the group's child.
  final Widget item;

  /// Whether the item's start corners face a neighbour.
  final bool innerStart;

  /// Whether the item's end corners face a neighbour.
  final bool innerEnd;

  /// The radius of the corners that face a neighbour (`comp.button-group.connected.inner-shape`).
  final double innerRadius;

  /// The width the item is at least (`sys.target.touch`).
  final double minWidth;

  /// The scope around [widget], if [widget] is the item of a connected group.
  static TanreiButtonGroupItemScope? of(BuildContext context, Widget widget) {
    final TanreiButtonGroupItemScope? scope = context
        .dependOnInheritedWidgetOfExactType<TanreiButtonGroupItemScope>();
    return scope != null && identical(scope.item, widget) ? scope : null;
  }

  /// The radius of the start corners: [innerRadius] where they face a neighbour, else [own].
  double start(double own) => innerStart ? innerRadius : own;

  /// The radius of the end corners: [innerRadius] where they face a neighbour, else [own].
  double end(double own) => innerEnd ? innerRadius : own;

  @override
  bool updateShouldNotify(TanreiButtonGroupItemScope oldWidget) =>
      innerStart != oldWidget.innerStart ||
      innerEnd != oldWidget.innerEnd ||
      innerRadius != oldWidget.innerRadius ||
      minWidth != oldWidget.minWidth;
}
