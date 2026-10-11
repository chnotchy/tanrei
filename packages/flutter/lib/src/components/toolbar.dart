import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/tap_target.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'button.dart';
import 'icon_button.dart';

/// Holds a short row of actions for the current screen or selection, docked across the bottom edge
/// or floating over the content.
///
/// Implements `specs/toolbar.spec.json`:
///
/// * [children] are the items, in reading order: the product's own `TanreiIconButton`s (the spec's
///   item kind `action`; a toggle is an icon button with `isSelected`) and `TanreiButton`s (the item
///   kind `button`). Each keeps its own `semanticLabel`, `variant`, `isSelected` and `onPressed`
///   (null: disabled), its tokens, press, focus, target and semantics: the toolbar lays them out and
///   never restyles them (TBR-9).
/// * [variant] is an open key: `TanreiToolbarVariant.docked` spans the bottom edge,
///   `floating` is a rounded, raised surface as long as its items. A value the active system does
///   not have is drawn as docked and reported in debug builds (TBR-13). A value a layer adds takes
///   the docked structure — spanning the width, reaching under the insets, spreading its items, a
///   top edge — with its own values (TBR-13).
/// * [orientation] is Flutter's `Axis` (the spec's `orientation`): a floating toolbar stands upright
///   with [Axis.vertical]; a docked one is always horizontal (TBR-6). [orientationFromName] reads
///   the spec's names.
/// * [semanticLabel] names the toolbar for assistive technology (the spec's `label`). Flutter's
///   widgets library has no toolbar role: the toolbar is a semantics container
///   (`Semantics(container: true, explicitChildNodes: true, label:)`) that holds its items' nodes in
///   order (TBR-11).
///
/// **Keyboard** (TBR-10): the toolbar is one Tab stop — the item focused last, or else the first
/// item that is not disabled — through `TanreiItemGroupMixin`, the roving focus of the list, the
/// menu and the tabs, with its item axis set by the orientation: Right and Left Arrow (mirrored right
/// to left) or Down and Up Arrow move to the next and previous enabled item, wrapping, and Home and
/// End to the first and last. Moving focus never activates; Enter and Space act as the item does.
///
/// **Insets** (TBR-3): a docked toolbar applies `MediaQuery.paddingOf(context)`'s bottom, left and
/// right padding itself, as `SafeArea` would, with its color under the bottom inset.
///
/// Every design value comes from `TanreiTheme.of(context).system.toolbar`.
class TanreiToolbar extends StatefulWidget {
  /// Creates a toolbar holding [children].
  const TanreiToolbar({
    super.key,
    required this.semanticLabel,
    this.variant = TanreiToolbarVariant.docked,
    this.orientation = Axis.horizontal,
    required this.children,
  });

  /// The accessible name of the toolbar ("Formatting"). Never drawn. Required; an empty one still
  /// renders and is reported in debug builds (TBR-12).
  final String semanticLabel;

  /// Docked across the bottom edge, or floating over the content.
  final TanreiToolbarVariant variant;

  /// The direction the items run; vertical only for a floating toolbar.
  final Axis orientation;

  /// The items, in reading order: `TanreiIconButton`s and `TanreiButton`s.
  final List<Widget> children;

  /// The axis named [name] (`horizontal` or `vertical`, the spec's `orientation` values), for a
  /// prop that arrives as text. An unknown name is [Axis.horizontal], reported in debug builds
  /// (TBR-13).
  static Axis orientationFromName(String name) =>
      tanreiEnumByName(Axis.values, name, fallback: Axis.horizontal, kind: 'toolbar orientation');

  @override
  State<TanreiToolbar> createState() => _TanreiToolbarState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('semanticLabel', semanticLabel))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(EnumProperty<Axis>('orientation', orientation, defaultValue: Axis.horizontal));
  }
}

class _TanreiToolbarState extends State<TanreiToolbar> with TanreiItemGroupMixin<TanreiToolbar> {
  bool _reportedOrientation = false;
  bool _reportedEmpty = false;
  bool _reportedOverflow = false;

  /// Whether the toolbar is laid out as a floating one: packed, rounded, free to stand upright.
  bool get _floating => widget.variant == TanreiToolbarVariant.floating;

  /// TBR-6: a docked toolbar is always horizontal.
  Axis get _axis => _floating ? widget.orientation : Axis.horizontal;

  // TBR-10: the arrow keys wrap at the ends, along the toolbar's axis; no typeahead.
  @override
  bool get wrapsFocus => true;

  @override
  Axis get itemAxis => _axis;

  @override
  bool get typeaheadEnabled => false;

  // TBR-10: one Tab stop — the item focused last, or else the first enabled item (the ordered items
  // are the enabled ones: a disabled icon button or button does not take focus).
  @override
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) =>
      lastFocused ?? items.firstOrNull;

  // The items are icon buttons and buttons whose `Focus` resets `skipTraversal` on every build: the
  // toolbar takes an item out of the Tab order around it instead.
  @override
  void applyTabStop(TanreiGroupItem item, {required bool traversable}) {
    if (item is _ToolbarItemState) {
      item.traversable = traversable;
    } else {
      super.applyTabStop(item, traversable: traversable);
    }
  }

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didUpdateWidget(TanreiToolbar oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.children.length != widget.children.length ||
        oldWidget.variant != widget.variant ||
        oldWidget.orientation != widget.orientation) {
      scheduleTabStops();
    }
  }

  /// TBR-12: an empty label is reported when the toolbar is first built without one, and when it
  /// loses the one it had; never on every build.
  void _debugReportMissingName(TanreiToolbar? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticLabel)) {
        debugTanreiReportMissingName('toolbar', widget);
      }
      return true;
    }());
  }

  /// TBR-6 and TBR-12, in debug builds: a docked toolbar told to stand upright, and a toolbar with
  /// no items; each once, when it begins.
  void _debugCheck() {
    assert(() {
      final bool upright = !_floating && widget.orientation == Axis.vertical;
      if (upright && !_reportedOrientation) {
        debugTanreiReportIgnoredValue(
          'toolbar',
          'orientation',
          'A docked toolbar is always horizontal: it spans the bottom edge. It is laid out '
              'horizontally; a vertical toolbar is a floating one.',
          widget,
        );
      }
      _reportedOrientation = upright;
      final bool empty = widget.children.isEmpty;
      if (empty && !_reportedEmpty) {
        debugTanreiReportIgnoredValue(
          'toolbar',
          'children',
          'A toolbar holds icon buttons and buttons; this one holds none. It is drawn empty.',
          widget,
        );
      }
      _reportedEmpty = empty;
      return true;
    }());
  }

  /// TBR-8, in debug builds: items that need more length than the toolbar has, once each time they
  /// begin not to fit.
  bool _handleMetrics(ScrollMetricsNotification notification) {
    assert(() {
      final ScrollMetrics metrics = notification.metrics;
      final bool overflows = metrics.maxScrollExtent > metrics.minScrollExtent;
      if (overflows && !_reportedOverflow) {
        debugTanreiReportIgnoredValue(
          'toolbar',
          'children',
          'The items need more length than the toolbar has: they scroll along it, every one at its '
              'own size. The extra actions belong in an overflow menu the product provides (a '
              'TanreiMenuAnchor on a "More" icon button).',
          widget,
        );
      }
      _reportedOverflow = overflows;
      return true;
    }());
    return false;
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiToolbarTokens tokens = theme.system.toolbar;
    // TBR-13: a total lookup — a variant the system does not have is drawn as docked, reported.
    final TanreiToolbarVariantTokens variant = tokens.variants[widget.variant];
    final bool floating = _floating;
    final Axis axis = _axis;
    final TextDirection direction = Directionality.of(context);

    // TBR-9: every item as it is; the wrapper only takes part in the roving Tab stop.
    final List<Widget> items = <Widget>[
      for (final Widget child in widget.children) _ToolbarItem(child: child),
    ];

    // TBR-2, TBR-4, TBR-6, TBR-14: the items placed by what they draw, their targets reaching into
    // the space around them. TBR-8: items that do not fit scroll along the axis, every one at its
    // own size and the gap at its minimum; nothing wraps, shrinks or hides.
    Widget row({required bool spread, required double minLength}) =>
        NotificationListener<ScrollMetricsNotification>(
          onNotification: _handleMetrics,
          child: SingleChildScrollView(
            scrollDirection: axis,
            child: _ToolbarRow(
              axis: axis,
              textDirection: direction,
              padding: variant.containerPaddingInline,
              gap: variant.containerGap,
              minCross: variant.containerSize,
              minLength: minLength,
              spread: spread,
              children: items,
            ),
          ),
        );

    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: variant.containerShape,
    );
    final Widget toolbar;
    if (floating) {
      // TBR-4, TBR-6: as long as the items need — the padding at each end and the exact gap
      // between neighbours — and at least the size across; rounded, raised and edged all round
      // (the elevation ring over an edge, TanreiControlContainer).
      toolbar = TanreiControlContainer(
        visuals: TanreiControlVisuals.resolve(
          theme,
          containerColor: variant.containerColor,
          labelColor: variant.outlineColor,
          outlineColor: variant.outlineColor,
          elevation: variant.containerElevation,
          shape: variant.containerShape,
        ),
        shape: shape,
        outlineWidth: tokens.outlineWidth,
        child: row(spread: false, minLength: 0),
      );
    } else {
      // TBR-2: the first item the padding from the start, the last as far from the end, equal space
      // between neighbours and never less than the gap; one item centered.
      final Widget body = LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) =>
            row(spread: true, minLength: constraints.hasBoundedWidth ? constraints.maxWidth : 0),
      );
      final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
        variant.containerElevation,
        theme.colors,
      );
      final Color color = theme.paint(variant.containerColor);
      // TBR-1, TBR-3: full width; the container reaches under the bottom inset, the items sit above
      // it and inside the side insets, and no longer see those insets; the top edge over all.
      final EdgeInsets insets = MediaQuery.paddingOf(context);
      toolbar = DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: color.a > 0 ? color : null,
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
        child: CustomPaint(
          foregroundPainter: TanreiEdgePainter(
            color: theme.paint(variant.outlineColor),
            width: tokens.outlineWidth,
            side: TanreiEdgeSide.top,
          ),
          child: Padding(
            padding: EdgeInsets.only(left: insets.left, right: insets.right, bottom: insets.bottom),
            child: MediaQuery.removePadding(
              context: context,
              removeLeft: true,
              removeRight: true,
              removeBottom: true,
              child: body,
            ),
          ),
        ),
      );
    }

    // TBR-11: a semantics container named by the label, holding the items' own nodes in order.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.semanticLabel,
      child: buildItemGroup(child: toolbar),
    );
  }
}

/// One item of a toolbar: the product's icon button or button, unchanged, inside a focus node of
/// the toolbar's that takes it out of the Tab order while another item is the Tab stop (TBR-10),
/// and that brings it into view when it receives focus (TBR-8).
class _ToolbarItem extends StatefulWidget {
  const _ToolbarItem({required this.child});

  final Widget child;

  @override
  State<_ToolbarItem> createState() => _ToolbarItemState();
}

class _ToolbarItemState extends State<_ToolbarItem> implements TanreiGroupItem {
  /// Around the item's own node: never focused itself, never a Tab stop itself.
  final FocusNode _scope = FocusNode(
    debugLabel: 'TanreiToolbar item',
    canRequestFocus: false,
    skipTraversal: true,
  );

  /// The item's own node (its `FocusableActionDetector`'s), found after it was built; null while it
  /// cannot take focus.
  FocusNode? _node;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  bool _syncScheduled = false;
  bool _reportedKind = false;

  @override
  FocusNode get focusNode => _node ?? _scope;

  @override
  String get typeaheadText => '';

  // A disabled icon button or button cannot take focus: the arrow keys and Tab pass it (TBR-10).
  @override
  bool get takesFocus => _node?.canRequestFocus ?? false;

  /// Whether Tab reaches the item.
  set traversable(bool value) => _scope.descendantsAreTraversable = value;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      if (_node != null) {
        _group?.unregisterItem(this);
      }
      _group = group;
      if (_node != null) {
        _group?.registerItem(this);
      }
    }
  }

  @override
  void dispose() {
    if (_node != null) {
      _group?.unregisterItem(this);
    }
    _node?.removeListener(_handleFocus);
    _scope.dispose();
    super.dispose();
  }

  /// After the item was built: its node, and whether it is an icon button or a button.
  void _scheduleSync() {
    if (_syncScheduled) {
      return;
    }
    _syncScheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _syncScheduled = false;
      if (mounted) {
        _sync();
      }
    });
  }

  /// The first node below the wrapper, in tree order, that can take focus: the item's own. None
  /// while the item is disabled. (A node that cannot, such as the one its `Shortcuts` hold, is
  /// passed over.)
  FocusNode? _findNode() {
    FocusNode? visit(Iterable<FocusNode> nodes) {
      for (final FocusNode node in nodes) {
        if (node.canRequestFocus) {
          return node;
        }
        final FocusNode? below = visit(node.children);
        if (below != null) {
          return below;
        }
      }
      return null;
    }

    return visit(_scope.children);
  }

  void _sync() {
    final FocusNode? node = _findNode();
    if (!identical(node, _node)) {
      if (_node != null) {
        _group?.unregisterItem(this);
        _node!.removeListener(_handleFocus);
      }
      _node = node;
      _node?.addListener(_handleFocus);
      if (_node != null) {
        _group?.registerItem(this);
      }
    } else {
      // Whether the item takes focus may have changed (disabled or enabled).
      _group?.scheduleTabStops();
    }
    // The Tab stop is read from the tree after a frame: make sure there is one.
    SchedulerBinding.instance.ensureVisualUpdate();
    _debugCheckKind();
  }

  /// TBR-12: an element that is not an icon button or a button is laid out as it is, and reported
  /// once in debug builds, since it would take the arrow keys the toolbar moves focus with.
  void _debugCheckKind() {
    assert(() {
      bool found = false;
      void visit(Element element) {
        if (found) {
          return;
        }
        if (element.widget is TanreiIconButton || element.widget is TanreiButton) {
          found = true;
          return;
        }
        element.visitChildElements(visit);
      }

      context.visitChildElements(visit);
      if (!found && !_reportedKind) {
        final TanreiToolbar? toolbar = context.findAncestorWidgetOfExactType<TanreiToolbar>();
        debugTanreiReportIgnoredValue(
          'toolbar',
          'children',
          'A toolbar holds icon buttons and buttons; a ${widget.child.runtimeType} is laid out as '
              'it is. A field, a slider or a chip set would take the arrow keys the toolbar moves '
              'focus with: put it in the app bar or the page.',
          toolbar ?? widget,
        );
      }
      _reportedKind = !found;
      return true;
    }());
  }

  /// TBR-8: an item that receives keyboard focus is brought fully into view.
  void _handleFocus() {
    if (!(_node?.hasPrimaryFocus ?? false)) {
      return;
    }
    Scrollable.ensureVisible(
      context,
      alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
    );
    Scrollable.ensureVisible(
      context,
      alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart,
    );
  }

  @override
  Widget build(BuildContext context) {
    _scheduleSync();
    return Focus(focusNode: _scope, includeSemantics: false, child: widget.child);
  }
}

/// The items of a toolbar along its axis (TBR-2, TBR-4, TBR-6, TBR-7, TBR-14): each placed by the
/// rectangle it draws (`tanreiVisibleRectOf`), so that [padding] runs from each end to the first and
/// last item's visible edge and [gap] between neighbours' visible edges, while each item's own
/// target reaches into that space. At least [minLength] long; where [spread] (docked) the extra
/// length goes equally between neighbours, and one item is centered. At least [minCross] across,
/// and as much as the tallest item's target; every item centered across. Mirrored right to left
/// along a horizontal axis.
class _ToolbarRow extends MultiChildRenderObjectWidget {
  const _ToolbarRow({
    required this.axis,
    required this.textDirection,
    required this.padding,
    required this.gap,
    required this.minCross,
    required this.minLength,
    required this.spread,
    required super.children,
  });

  final Axis axis;
  final TextDirection textDirection;
  final double padding;
  final double gap;
  final double minCross;
  final double minLength;
  final bool spread;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderToolbarRow()
    ..axis = axis
    ..textDirection = textDirection
    ..padding = padding
    ..gap = gap
    ..minCross = minCross
    ..minLength = minLength
    ..spread = spread;

  @override
  void updateRenderObject(BuildContext context, _RenderToolbarRow renderObject) {
    renderObject
      ..axis = axis
      ..textDirection = textDirection
      ..padding = padding
      ..gap = gap
      ..minCross = minCross
      ..minLength = minLength
      ..spread = spread;
  }
}

class _ToolbarRowParentData extends ContainerBoxParentData<RenderBox> {
  /// The rectangle the item draws, in the row's coordinates.
  Rect visible = Rect.zero;
}

class _RenderToolbarRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _ToolbarRowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _ToolbarRowParentData> {
  Axis _axis = Axis.horizontal;
  set axis(Axis value) => _relayout(value != _axis, () => _axis = value);

  TextDirection _textDirection = TextDirection.ltr;
  set textDirection(TextDirection value) =>
      _relayout(value != _textDirection, () => _textDirection = value);

  double _padding = 0;
  set padding(double value) => _relayout(value != _padding, () => _padding = value);

  double _gap = 0;
  set gap(double value) => _relayout(value != _gap, () => _gap = value);

  double _minCross = 0;
  set minCross(double value) => _relayout(value != _minCross, () => _minCross = value);

  double _minLength = 0;
  set minLength(double value) => _relayout(value != _minLength, () => _minLength = value);

  bool _spread = false;
  set spread(bool value) => _relayout(value != _spread, () => _spread = value);

  void _relayout(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  bool get _horizontal => _axis == Axis.horizontal;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _ToolbarRowParentData) {
      child.parentData = _ToolbarRowParentData();
    }
  }

  Iterable<RenderBox> get _children sync* {
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      yield child;
    }
  }

  double get _gaps => math.max(0, childCount - 1) * _gap;

  double _mainIntrinsic(double cross, bool max) => _children.fold<double>(
    2 * _padding + _gaps,
    (double sum, RenderBox child) =>
        sum +
        (_horizontal
            ? (max ? child.getMaxIntrinsicWidth(cross) : child.getMinIntrinsicWidth(cross))
            : (max ? child.getMaxIntrinsicHeight(cross) : child.getMinIntrinsicHeight(cross))),
  );

  double _crossIntrinsic(bool max) => _children.fold<double>(
    _minCross,
    (double tallest, RenderBox child) => math.max(
      tallest,
      _horizontal
          ? (max
                ? child.getMaxIntrinsicHeight(double.infinity)
                : child.getMinIntrinsicHeight(double.infinity))
          : (max
                ? child.getMaxIntrinsicWidth(double.infinity)
                : child.getMinIntrinsicWidth(double.infinity)),
    ),
  );

  @override
  double computeMinIntrinsicWidth(double height) =>
      _horizontal ? math.max(_minLength, _mainIntrinsic(height, false)) : _crossIntrinsic(false);

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _horizontal ? math.max(_minLength, _mainIntrinsic(height, true)) : _crossIntrinsic(true);

  @override
  double computeMinIntrinsicHeight(double width) =>
      _horizontal ? _crossIntrinsic(false) : math.max(_minLength, _mainIntrinsic(width, false));

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _horizontal ? _crossIntrinsic(true) : math.max(_minLength, _mainIntrinsic(width, true));

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    double main = 2 * _padding + _gaps;
    double cross = _minCross;
    for (final RenderBox child in _children) {
      final Size size = child.getDryLayout(const BoxConstraints());
      main += _horizontal ? size.width : size.height;
      cross = math.max(cross, _horizontal ? size.height : size.width);
    }
    main = math.max(main, _minLength);
    return constraints.constrain(_horizontal ? Size(main, cross) : Size(cross, main));
  }

  @override
  void performLayout() {
    final List<RenderBox> children = _children.toList();
    final List<Rect> visible = <Rect>[];
    double cross = _minCross;
    double needed = 2 * _padding + _gaps;
    for (final RenderBox child in children) {
      // Every item at its own size (TBR-8, TBR-9).
      child.layout(const BoxConstraints(), parentUsesSize: true);
      final Rect rect = tanreiVisibleRectOf(child, child.size);
      visible.add(rect);
      needed += _horizontal ? rect.width : rect.height;
      // TBR-14: across, the row holds the tallest item's target.
      cross = math.max(cross, _horizontal ? child.size.height : child.size.width);
    }
    final double length = math.max(needed, _minLength);
    final int count = children.length;
    final double extra = length - needed;
    // TBR-2: a docked toolbar spreads its items (one item centered); a floating one packs them.
    final double between = _spread && count > 1 ? _gap + extra / (count - 1) : _gap;
    double start = _spread && count == 1 ? _padding + extra / 2 : _padding;
    // TBR-7: a horizontal row runs from the right edge right to left; a vertical one keeps its
    // top-to-bottom order.
    final bool mirrored = _horizontal && _textDirection == TextDirection.rtl;
    for (final (int i, RenderBox child) in children.indexed) {
      final Rect rect = visible[i];
      final double extent = _horizontal ? rect.width : rect.height;
      final double visibleStart = mirrored ? length - start - extent : start;
      final double childCross = _horizontal ? child.size.height : child.size.width;
      final double crossOffset = (cross - childCross) / 2;
      final _ToolbarRowParentData data = child.parentData! as _ToolbarRowParentData;
      data.offset = _horizontal
          ? Offset(visibleStart - rect.left, crossOffset)
          : Offset(crossOffset, visibleStart - rect.top);
      data.visible = rect.shift(data.offset);
      start += extent + between;
    }
    size = constraints.constrain(_horizontal ? Size(length, cross) : Size(cross, length));
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    // TBR-9 (as BGR-4): between two items the hit areas meet at the middle of the gap between what
    // they draw, and never overlap; on every side without a neighbour an item keeps its own target.
    final List<RenderBox> children = _children.toList();
    if (children.isEmpty) {
      return false;
    }
    double along(Offset p) => _horizontal ? p.dx : p.dy;
    double start(Rect r) => _horizontal ? r.left : r.top;
    double end(Rect r) => _horizontal ? r.right : r.bottom;
    final List<RenderBox> ordered = children.toList()
      ..sort(
        (RenderBox a, RenderBox b) => start(
          (a.parentData! as _ToolbarRowParentData).visible,
        ).compareTo(start((b.parentData! as _ToolbarRowParentData).visible)),
      );
    final double at = along(position);
    for (int i = 0; i < ordered.length; i++) {
      final RenderBox child = ordered[i];
      final _ToolbarRowParentData data = child.parentData! as _ToolbarRowParentData;
      final Rect box = data.offset & child.size;
      final double lo = i == 0
          ? start(box)
          : (end((ordered[i - 1].parentData! as _ToolbarRowParentData).visible) +
                    start(data.visible)) /
                2;
      final double hi = i == ordered.length - 1
          ? end(box)
          : (end(data.visible) +
                    start((ordered[i + 1].parentData! as _ToolbarRowParentData).visible)) /
                2;
      final bool across = _horizontal
          ? position.dy >= box.top && position.dy < box.bottom
          : position.dx >= box.left && position.dx < box.right;
      if (at < lo || at >= hi || !across) {
        continue;
      }
      if (box.contains(position)) {
        return result.addWithPaintOffset(
          offset: data.offset,
          position: position,
          hitTest: (BoxHitTestResult result, Offset transformed) =>
              child.hitTest(result, position: transformed),
        );
      }
      // In the gap beyond the item's own target: the press lands on the nearest point inside it.
      // Half a pixel inside the edge: a box does not contain its right and bottom edges.
      const double inset = 0.5;
      final Offset inside = Offset(
        (position.dx - data.offset.dx).clamp(inset, child.size.width - inset).toDouble(),
        (position.dy - data.offset.dy).clamp(inset, child.size.height - inset).toDouble(),
      );
      return result.addWithRawTransform(
        transform: MatrixUtils.forceToPoint(inside),
        position: inside,
        hitTest: (BoxHitTestResult result, Offset transformed) =>
            child.hitTest(result, position: inside),
      );
    }
    return false;
  }
}
