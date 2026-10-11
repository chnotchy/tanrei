import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/enum_by_name.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// How far a [TanreiDivider]'s line is shortened to align with content (the spec's `inset`).
///
/// The length is `comp.divider.line.inset` of the active design system; this only says where it
/// applies. Unlike the `indent` / `endIndent` lengths of Flutter's own dividers, it is not a
/// length.
enum TanreiDividerInset {
  /// The full length (the default).
  none,

  /// Shortened at the start: the inline start of a horizontal divider (the right end in a
  /// right-to-left layout), the top of a vertical one — to line up with an inset list's text.
  start,

  /// Shortened at both ends: a middle divider.
  both;

  /// The inset named [name] (`none`, `start` or `both`), for a prop that arrives as text. An
  /// unknown name is [none], reported in debug builds (DIV-7).
  static TanreiDividerInset fromName(String name) =>
      tanreiEnumByName(values, name, fallback: none, kind: 'divider inset');
}

/// Separates groups of content in a list, a layout or a toolbar with a thin line.
///
/// Implements `specs/divider.spec.json` as one widget with an [axis] (the spec's `orientation`),
/// instead of Flutter's `Divider` and `VerticalDivider`:
///
/// * a horizontal divider spans the width its layout gives it and a vertical one the height, and
///   each takes exactly `comp.divider.line.thickness` across (DIV-1, DIV-2). It adds no margin or
///   padding: the space around the line belongs to the layout that places it. Given no bound on its
///   length (a horizontal divider in a `Row`), it is as short as its constraints allow — give it an
///   `Expanded` or a `SizedBox`, as with any line that fills its container;
/// * [inset] shortens the line by `comp.divider.line.inset` at its start or at both ends (DIV-3); a
///   horizontal divider's start is its right end in a right-to-left layout (DIV-4);
/// * the line is drawn in `comp.divider.line.color` at least one device pixel thick and on the
///   device pixel grid, so it is never smeared over two rows of pixels (DIV-8);
/// * [excludeFromSemantics] (the spec's `decorative`, with the same polarity; the name `Image` and
///   `GestureDetector` use) hides it from assistive technology, which is the default (DIV-5).
///   Flutter's semantics have no separator role and no orientation property: with
///   [excludeFromSemantics] false the divider is its own empty semantics node — a boundary between
///   the groups on either side, with no name and no actions — which is as far as Flutter can say
///   "separator" (DIV-6). It is never focusable.
///
/// Every design value comes from the `TanreiDividerTokens` of the active design system
/// (`TanreiTheme.of(context).system.divider`).
class TanreiDivider extends StatelessWidget {
  /// Creates a divider.
  const TanreiDivider({
    super.key,
    this.axis = Axis.horizontal,
    this.inset = TanreiDividerInset.none,
    this.excludeFromSemantics = true,
  });

  /// The orientation (the spec's `orientation`): horizontal separates stacked content, vertical
  /// separates content in a row.
  final Axis axis;

  /// Where the line is shortened to align with content.
  final TanreiDividerInset inset;

  /// Whether the divider is hidden from assistive technology (the spec's `decorative`). Set it to
  /// false only where the grouping is meaningful, such as a toolbar's or a menu's groups.
  final bool excludeFromSemantics;

  /// The axis named [name] (`horizontal` or `vertical`, the spec's `orientation` values), for a
  /// prop that arrives as text. An unknown name is [Axis.horizontal], reported in debug builds
  /// (DIV-7).
  static Axis axisFromName(String name) =>
      tanreiEnumByName(Axis.values, name, fallback: Axis.horizontal, kind: 'divider orientation');

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiDividerTokens tokens = theme.system.divider;
    final double length = tokens.lineInset;
    final Widget line = _DividerLine(
      axis: axis,
      thickness: tokens.lineThickness,
      startInset: inset == TanreiDividerInset.none ? 0 : length,
      endInset: inset == TanreiDividerInset.both ? length : 0,
      color: theme.paint(tokens.lineColor),
      textDirection: Directionality.maybeOf(context) ?? TextDirection.ltr,
      devicePixelRatio:
          MediaQuery.maybeDevicePixelRatioOf(context) ?? View.of(context).devicePixelRatio,
    );
    // DIV-5: the line itself has no semantics, so a decorative divider adds nothing to the tree.
    // DIV-6: otherwise it is a node of its own, with no name, no value and no actions.
    return excludeFromSemantics ? line : Semantics(container: true, child: line);
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<Axis>('axis', axis, defaultValue: Axis.horizontal))
      ..add(EnumProperty<TanreiDividerInset>('inset', inset, defaultValue: TanreiDividerInset.none))
      ..add(
        FlagProperty(
          'excludeFromSemantics',
          value: excludeFromSemantics,
          ifFalse: 'separator',
          showName: true,
        ),
      );
  }
}

class _DividerLine extends LeafRenderObjectWidget {
  const _DividerLine({
    required this.axis,
    required this.thickness,
    required this.startInset,
    required this.endInset,
    required this.color,
    required this.textDirection,
    required this.devicePixelRatio,
  });

  final Axis axis;
  final double thickness;
  final double startInset;
  final double endInset;
  final Color color;
  final TextDirection textDirection;
  final double devicePixelRatio;

  @override
  RenderTanreiDividerLine createRenderObject(BuildContext context) => RenderTanreiDividerLine(
    axis: axis,
    thickness: thickness,
    startInset: startInset,
    endInset: endInset,
    color: color,
    textDirection: textDirection,
    devicePixelRatio: devicePixelRatio,
  );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiDividerLine renderObject) {
    renderObject
      ..axis = axis
      ..thickness = thickness
      ..startInset = startInset
      ..endInset = endInset
      ..color = color
      ..textDirection = textDirection
      ..devicePixelRatio = devicePixelRatio;
  }
}

/// The line of a [TanreiDivider]: laid out at its logical thickness across and the full length its
/// constraints give it along, and painted on the device pixel grid (DIV-8).
class RenderTanreiDividerLine extends RenderBox {
  /// Creates the line.
  RenderTanreiDividerLine({
    required Axis axis,
    required double thickness,
    required double startInset,
    required double endInset,
    required Color color,
    required TextDirection textDirection,
    required double devicePixelRatio,
  }) : _axis = axis,
       _thickness = thickness,
       _startInset = startInset,
       _endInset = endInset,
       _color = color,
       _textDirection = textDirection,
       _devicePixelRatio = devicePixelRatio;

  /// Along which axis the line runs.
  Axis get axis => _axis;
  Axis _axis;
  set axis(Axis value) {
    if (value != _axis) {
      _axis = value;
      markNeedsLayout();
    }
  }

  /// The logical thickness across the line (`comp.divider.line.thickness`).
  double get thickness => _thickness;
  double _thickness;
  set thickness(double value) {
    if (value != _thickness) {
      _thickness = value;
      markNeedsLayout();
    }
  }

  /// How much shorter the line is at its start.
  double get startInset => _startInset;
  double _startInset;
  set startInset(double value) {
    if (value != _startInset) {
      _startInset = value;
      markNeedsPaint();
    }
  }

  /// How much shorter the line is at its end.
  double get endInset => _endInset;
  double _endInset;
  set endInset(double value) {
    if (value != _endInset) {
      _endInset = value;
      markNeedsPaint();
    }
  }

  /// The color of the line (`comp.divider.line.color`, resolved against the scheme).
  Color get color => _color;
  Color _color;
  set color(Color value) {
    if (value != _color) {
      _color = value;
      markNeedsPaint();
    }
  }

  /// Which end of a horizontal line is its start.
  TextDirection get textDirection => _textDirection;
  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      markNeedsPaint();
    }
  }

  /// Device pixels per logical pixel: the grid the line is drawn on.
  double get devicePixelRatio => _devicePixelRatio;
  double _devicePixelRatio;
  set devicePixelRatio(double value) {
    if (value != _devicePixelRatio) {
      _devicePixelRatio = value;
      markNeedsPaint();
    }
  }

  bool get _horizontal => _axis == Axis.horizontal;

  @override
  bool get sizedByParent => true;

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    // DIV-1 / DIV-2: the full length the constraints give, exactly the thickness across.
    final double along = _horizontal
        ? (constraints.hasBoundedWidth ? constraints.maxWidth : constraints.minWidth)
        : (constraints.hasBoundedHeight ? constraints.maxHeight : constraints.minHeight);
    return constraints.constrain(_horizontal ? Size(along, _thickness) : Size(_thickness, along));
  }

  @override
  double computeMinIntrinsicWidth(double height) => _horizontal ? 0 : _thickness;

  @override
  double computeMaxIntrinsicWidth(double height) => _horizontal ? 0 : _thickness;

  @override
  double computeMinIntrinsicHeight(double width) => _horizontal ? _thickness : 0;

  @override
  double computeMaxIntrinsicHeight(double width) => _horizontal ? _thickness : 0;

  // The line takes no input: a pointer over it reaches whatever lies underneath.
  @override
  bool hitTestSelf(Offset position) => false;

  /// The rectangle the line fills, in local coordinates: snapped to the device pixel grid of the
  /// view, at least one device pixel across (DIV-8). Empty when the insets leave no line.
  @visibleForTesting
  Rect get lineRect {
    final double ratio = _devicePixelRatio;
    final Offset origin = attached ? localToGlobal(Offset.zero) : Offset.zero;
    // Device pixels across, whole and at least one; centered on the box's cross axis.
    final double across = math.max(1, (_thickness * ratio).roundToDouble()) / ratio;
    double snap(double global) => (global * ratio).roundToDouble() / ratio;

    final bool reversed = _horizontal && _textDirection == TextDirection.rtl;
    // DIV-3 / DIV-4: a horizontal line's start is its right end in a right-to-left layout.
    final double leading = reversed ? _endInset : _startInset;
    final double trailing = reversed ? _startInset : _endInset;
    final double mainOrigin = _horizontal ? origin.dx : origin.dy;
    final double crossOrigin = _horizontal ? origin.dy : origin.dx;
    final double mainExtent = _horizontal ? size.width : size.height;
    final double crossExtent = _horizontal ? size.height : size.width;

    final double from = snap(mainOrigin + leading) - mainOrigin;
    final double to = snap(mainOrigin + mainExtent - trailing) - mainOrigin;
    if (to <= from) {
      return Rect.zero;
    }
    final double top = snap(crossOrigin + (crossExtent - across) / 2) - crossOrigin;
    return _horizontal
        ? Rect.fromLTRB(from, top, to, top + across)
        : Rect.fromLTRB(top, from, top + across, to);
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final Rect line = lineRect;
    // A transparent line (a `none` paint) draws nothing.
    if (line.isEmpty || _color.a == 0) {
      return;
    }
    context.canvas.drawRect(line.shift(offset), Paint()..color = _color);
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<Axis>('axis', _axis))
      ..add(DoubleProperty('thickness', _thickness))
      ..add(DoubleProperty('startInset', _startInset))
      ..add(DoubleProperty('endInset', _endInset))
      ..add(ColorProperty('color', _color))
      ..add(EnumProperty<TextDirection>('textDirection', _textDirection))
      ..add(DoubleProperty('devicePixelRatio', _devicePixelRatio));
  }
}
