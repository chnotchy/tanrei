import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/button_group_item.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/ignored_value.dart';
import '../theme/theme.dart';
import 'button.dart';
import 'icon_button.dart';

/// How a button group lays out its buttons (the spec's `variant`). Not a token axis: the two differ
/// in structure — which corners the group sets — so a design system does not extend it.
enum TanreiButtonGroupVariant {
  /// The buttons spaced `comp.button-group.standard.gap` apart, each drawn as it is anywhere.
  standard,

  /// The buttons joined `comp.button-group.connected.gap` apart, with tighter corners where they
  /// meet, every one at least the touch target wide and stretched to the tallest.
  connected;

  /// The variant named [name], or [standard] — reported in debug builds — for a name the group
  /// does not define (BGR-9).
  static TanreiButtonGroupVariant fromName(String name) => tanreiEnumByName(
    values,
    name,
    fallback: TanreiButtonGroupVariant.standard,
    kind: 'button-group variant',
  );
}

/// A row of related buttons — Tanrei Buttons and icon buttons, toggles included — spaced apart or
/// joined as one shape.
///
/// Implements `specs/button-group.spec.json`: `TanreiButtonGroup(variant:, semanticLabel:,
/// children:)`, whose [children] are [TanreiButton]s and [TanreiIconButton]s (the spec's item kinds
/// `button` and `icon-button`), each configured as it is anywhere.
///
/// * [variant] `standard` spaces the buttons by `comp.button-group.standard.gap` and centres them
///   on the row's middle; `connected` joins them `comp.button-group.connected.gap` apart, stretches
///   each to the tallest, and makes each at least the touch target wide — an icon button widens
///   around its centred icon (BGR-1, BGR-3).
/// * In a connected group every corner that faces a neighbour takes
///   `comp.button-group.connected.inner-shape`, eased by the system's corner smoothing; the outer
///   corners stay the button's own. The fill, outline, state layer, ripple and focus ring follow
///   (BGR-2). Right-to-left mirrors which corners are inner (BGR-8). The group reaches its items
///   through an internal `InheritedWidget` that is not part of Button's or IconButton's public
///   surface.
/// * Each item keeps its own tokens, states, events, semantics and Tab stop. The group takes no
///   focus, handles no arrow keys and keeps no selection; a toggle stays independent (BGR-5).
/// * [semanticLabel] (the spec's `label`) names the group: a node that contains the items. Without
///   one the group adds no node (BGR-6).
/// * A row wider than its layout allows narrows its Buttons in proportion to their widths, down to
///   their longest word (their labels wrap), keeps icon buttons at their size, and never wraps or
///   scrolls; a row that still does not fit is reported in debug builds (BGR-7).
/// * A press on an item's visible bounds is that item's; a press between two items goes to the
///   nearer one (BGR-4). In a connected group the group extends each item's hit area and
///   accessibility node above and below the row to the touch target (BGR-3).
/// * Fewer than two items, or a child that is not a Tanrei Button or icon button, still renders and
///   is reported in debug builds (BGR-10).
class TanreiButtonGroup extends StatefulWidget {
  /// Creates a group of [children].
  const TanreiButtonGroup({
    super.key,
    this.variant = TanreiButtonGroupVariant.standard,
    this.semanticLabel = '',
    required this.children,
  });

  /// Spaced apart (`standard`) or joined (`connected`).
  final TanreiButtonGroupVariant variant;

  /// The accessible name of the group ("Text style"). Optional: a row of actions each named by its
  /// own label needs none.
  final String semanticLabel;

  /// The buttons, in order: [TanreiButton]s and [TanreiIconButton]s. Give every one the same size.
  final List<Widget> children;

  @override
  State<TanreiButtonGroup> createState() => _TanreiButtonGroupState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiButtonGroupVariant>('variant', variant))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

class _TanreiButtonGroupState extends State<TanreiButtonGroup> {
  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  bool _reportedOverflow = false;

  static bool _isItem(Widget child) => child is TanreiButton || child is TanreiIconButton;

  /// BGR-10: in debug builds, fewer than two items and a child that is not a Tanrei Button or icon
  /// button.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[
        if (widget.children.length < 2)
          'A button group holds two or more buttons; this one holds ${widget.children.length}. It '
              'is drawn as it is.',
        for (final Widget child in widget.children)
          if (!_isItem(child))
            'A button group holds Tanrei Buttons and icon buttons; a ${child.runtimeType} is laid '
                'out as it is, and a connected group cannot set its corners.',
      ];
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('button-group', 'children', problem, widget);
        }
      }
      return true;
    }());
  }

  /// BGR-7: a row that still does not fit, reported once each time it begins not to fit.
  void _debugOverflow(bool overflows) {
    assert(() {
      if (overflows && !_reportedOverflow) {
        SchedulerBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            debugTanreiReportIgnoredValue(
              'button-group',
              'children',
              'The row is wider than its layout allows even with every Button narrowed to its '
                  'longest word: it overflows. A group never wraps or scrolls; use fewer or '
                  'shorter buttons, or a toolbar.',
              widget,
            );
          }
        });
      }
      _reportedOverflow = overflows;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiSystem system = TanreiTheme.of(context).system;
    final TanreiButtonGroupTokens tokens = system.buttonGroup;
    final bool connected = widget.variant == TanreiButtonGroupVariant.connected;
    final List<Widget> children = widget.children;
    final int last = children.length - 1;

    final Widget row = _ButtonGroupRow(
      gap: connected ? tokens.connectedGap : tokens.standardGap,
      connected: connected,
      target: system.measure.targetTouch,
      textDirection: Directionality.of(context),
      onOverflow: _debugOverflow,
      children: <Widget>[
        for (final (int i, Widget child) in children.indexed)
          _ButtonGroupSlot(
            shrinkable: child is TanreiButton,
            boundary: connected,
            // BGR-2, BGR-3, BGR-11: the corners that face a neighbour and the minimum width, from
            // the items' order, at once.
            child: connected && _isItem(child)
                ? TanreiButtonGroupItemScope(
                    item: child,
                    innerStart: i > 0,
                    innerEnd: i < last,
                    innerRadius: tokens.connectedInnerShape,
                    minWidth: system.measure.targetTouch,
                  )
                : child,
          ),
      ],
    );

    // BGR-6: a group named by its label that contains its items; no node without one.
    if (!tanreiIsAccessibleName(widget.semanticLabel)) {
      return row;
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.semanticLabel,
      child: row,
    );
  }
}

/// One item's place in the row: whether a narrow row may narrow it (a Button, BGR-7), and — in a
/// connected group — its accessibility node, whose bounds the row extends above and below the item
/// to its hit area (BGR-3).
class _ButtonGroupSlot extends SingleChildRenderObjectWidget {
  const _ButtonGroupSlot({
    required this.shrinkable,
    required this.boundary,
    required Widget super.child,
  });

  final bool shrinkable;
  final bool boundary;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderButtonGroupSlot(shrinkable: shrinkable, boundary: boundary);

  @override
  void updateRenderObject(BuildContext context, _RenderButtonGroupSlot renderObject) {
    renderObject
      ..shrinkable = shrinkable
      ..boundary = boundary;
  }
}

class _RenderButtonGroupSlot extends RenderProxyBox {
  _RenderButtonGroupSlot({required this.shrinkable, required bool boundary}) : _boundary = boundary;

  bool shrinkable;

  bool _boundary;
  set boundary(bool value) {
    if (value != _boundary) {
      _boundary = value;
      markNeedsSemanticsUpdate();
    }
  }

  double _above = 0;
  double _below = 0;

  void extend({required double above, required double below}) {
    if (above != _above || below != _below) {
      _above = above;
      _below = below;
      markNeedsSemanticsUpdate();
    }
  }

  @override
  Rect get semanticBounds => Rect.fromLTRB(0, -_above, size.width, size.height + _below);

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = _boundary;
  }
}

/// The row (BGR-1, BGR-3, BGR-4, BGR-7, BGR-8).
class _ButtonGroupRow extends MultiChildRenderObjectWidget {
  const _ButtonGroupRow({
    required this.gap,
    required this.connected,
    required this.target,
    required this.textDirection,
    required this.onOverflow,
    required super.children,
  });

  final double gap;
  final bool connected;
  final double target;
  final TextDirection textDirection;
  final ValueChanged<bool> onOverflow;

  @override
  RenderTanreiButtonGroupRow createRenderObject(BuildContext context) =>
      RenderTanreiButtonGroupRow._(
        gap: gap,
        connected: connected,
        target: target,
        textDirection: textDirection,
        onOverflow: onOverflow,
      );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiButtonGroupRow renderObject) {
    renderObject
      ..gap = gap
      ..connected = connected
      ..target = target
      ..textDirection = textDirection
      ..onOverflow = onOverflow;
  }
}

class _RowParentData extends ContainerBoxParentData<RenderBox> {}

/// The render object of a [TanreiButtonGroup]'s row, as tests see it.
class RenderTanreiButtonGroupRow extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _RowParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _RowParentData> {
  RenderTanreiButtonGroupRow._({
    required double gap,
    required bool connected,
    required double target,
    required TextDirection textDirection,
    required this.onOverflow,
  }) : _gap = gap,
       _connected = connected,
       _target = target,
       _textDirection = textDirection;

  double _gap;
  set gap(double value) => _relayout(value != _gap, () => _gap = value);

  bool _connected;
  set connected(bool value) => _relayout(value != _connected, () => _connected = value);

  double _target;
  set target(double value) => _relayout(value != _target, () => _target = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _relayout(value != _textDirection, () => _textDirection = value);

  /// Told after each layout whether the row fits (BGR-7's report).
  ValueChanged<bool> onOverflow;

  void _relayout(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  /// Whether the last layout could not fit the row, even narrowed.
  bool get overflows => _overflows;
  bool _overflows = false;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _RowParentData) {
      child.parentData = _RowParentData();
    }
  }

  List<RenderBox> get _children {
    final List<RenderBox> found = <RenderBox>[];
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      found.add(child);
    }
    return found;
  }

  double get _gaps => math.max(0, childCount - 1) * _gap;

  static bool _shrinks(RenderBox child) => child is _RenderButtonGroupSlot && child.shrinkable;

  /// BGR-7: the width of each item within [maxWidth]: its natural width, or — where the row is too
  /// wide — its Buttons narrowed in proportion to their widths, none below its longest word.
  ({List<double> widths, bool overflows}) _widthsFor(double maxWidth) {
    final List<RenderBox> children = _children;
    final List<double> natural = <double>[
      for (final RenderBox child in children) child.getMaxIntrinsicWidth(double.infinity),
    ];
    final double total = natural.fold<double>(0, (double a, double b) => a + b) + _gaps;
    if (!maxWidth.isFinite || total <= maxWidth) {
      return (widths: natural, overflows: false);
    }
    final List<double> floor = <double>[
      for (final (int i, RenderBox child) in children.indexed)
        _shrinks(child)
            ? math.min(natural[i], child.getMinIntrinsicWidth(double.infinity))
            : natural[i],
    ];
    final List<double> widths = List<double>.of(natural);
    // Narrow the Buttons that can still narrow in proportion to their widths; those that reach
    // their floor stay there, and the rest take what is left.
    final Set<int> free = <int>{
      for (int i = 0; i < children.length; i++)
        if (_shrinks(children[i]) && floor[i] < natural[i]) i,
    };
    while (free.isNotEmpty) {
      final double fixed =
          _gaps +
          <double>[
            for (int i = 0; i < widths.length; i++)
              if (!free.contains(i)) widths[i],
          ].fold<double>(0, (double a, double b) => a + b);
      final double room = maxWidth - fixed;
      final double wanted = free.fold<double>(0, (double a, int i) => a + natural[i]);
      final double factor = wanted <= 0 ? 0 : math.max(0, room / wanted);
      final Set<int> clamped = <int>{};
      for (final int i in free) {
        final double width = natural[i] * factor;
        if (width <= floor[i]) {
          widths[i] = floor[i];
          clamped.add(i);
        } else {
          widths[i] = math.min(width, natural[i]);
        }
      }
      if (clamped.isEmpty) {
        break;
      }
      free.removeAll(clamped);
    }
    final double used = widths.fold<double>(0, (double a, double b) => a + b) + _gaps;
    return (widths: widths, overflows: used > maxWidth + precisionErrorTolerance);
  }

  @override
  double computeMinIntrinsicWidth(double height) => _children.fold<double>(
    _gaps,
    (double a, RenderBox child) =>
        a +
        (_shrinks(child) ? child.getMinIntrinsicWidth(height) : child.getMaxIntrinsicWidth(height)),
  );

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _children.fold<double>(_gaps, (double a, RenderBox c) => a + c.getMaxIntrinsicWidth(height));

  @override
  double computeMinIntrinsicHeight(double width) => _heightOf(
    _children
        .map((RenderBox c) => c.getMinIntrinsicHeight(double.infinity))
        .fold<double>(0, math.max),
  );

  @override
  double computeMaxIntrinsicHeight(double width) => _heightOf(
    _children
        .map((RenderBox c) => c.getMaxIntrinsicHeight(double.infinity))
        .fold<double>(0, math.max),
  );

  /// The row's height for items [tallest] tall: in a connected group at least the touch target,
  /// since the items leave their vertical extension to the row (BGR-3).
  double _heightOf(double tallest) => _connected ? math.max(tallest, _target) : tallest;

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final List<double> widths = _widthsFor(constraints.maxWidth).widths;
    double tallest = 0;
    for (final (int i, RenderBox child) in _children.indexed) {
      tallest = math.max(
        tallest,
        child.getDryLayout(BoxConstraints.tightFor(width: widths[i])).height,
      );
    }
    final double width = widths.fold<double>(0, (double a, double b) => a + b) + _gaps;
    return constraints.constrain(Size(width, _heightOf(tallest)));
  }

  @override
  void performLayout() {
    final List<RenderBox> children = _children;
    final ({List<double> widths, bool overflows}) fit = _widthsFor(constraints.maxWidth);
    final List<double> widths = fit.widths;
    _overflows = fit.overflows;
    double tallest = 0;
    for (final (int i, RenderBox child) in children.indexed) {
      child.layout(BoxConstraints.tightFor(width: widths[i]), parentUsesSize: true);
      tallest = math.max(tallest, child.size.height);
    }
    // BGR-1: a connected group stretches every item to the tallest.
    if (_connected) {
      for (final (int i, RenderBox child) in children.indexed) {
        if (child.size.height != tallest) {
          child.layout(BoxConstraints.tight(Size(widths[i], tallest)), parentUsesSize: true);
        }
      }
    }
    final double width = widths.fold<double>(0, (double a, double b) => a + b) + _gaps;
    size = constraints.constrain(Size(width, _heightOf(tallest)));
    // BGR-8: from the right in a right-to-left layout.
    final bool rtl = _textDirection == TextDirection.rtl;
    double x = rtl ? width : 0;
    for (final (int i, RenderBox child) in children.indexed) {
      final double top = (size.height - child.size.height) / 2;
      if (rtl) {
        x -= widths[i];
      }
      (child.parentData! as _RowParentData).offset = Offset(x, top);
      if (child is _RenderButtonGroupSlot) {
        child.extend(above: _connected ? top : 0, below: _connected ? top : 0);
      }
      x += rtl ? -_gap : widths[i] + _gap;
    }
    onOverflow(_overflows);
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    if (defaultHitTestChildren(result, position: position)) {
      return true;
    }
    if (!size.contains(position)) {
      return false;
    }
    // BGR-3, BGR-4: a press between two items goes to the nearer one, and — in a connected group —
    // a press above or below an item to that item: to the nearest point inside it.
    RenderBox? nearest;
    double distance = double.infinity;
    for (RenderBox? child = firstChild; child != null; child = childAfter(child)) {
      final Rect rect = (child.parentData! as _RowParentData).offset & child.size;
      final double d = position.dx < rect.left
          ? rect.left - position.dx
          : (position.dx > rect.right ? position.dx - rect.right : 0);
      if (d < distance) {
        distance = d;
        nearest = child;
      }
    }
    if (nearest == null) {
      return false;
    }
    final RenderBox child = nearest;
    final Offset origin = (child.parentData! as _RowParentData).offset;
    // Half a pixel inside the edge: a box does not contain its right and bottom edges.
    const double inset = 0.5;
    final Offset inside = Offset(
      (position.dx - origin.dx).clamp(inset, math.max(inset, child.size.width - inset)).toDouble(),
      (position.dy - origin.dy).clamp(inset, math.max(inset, child.size.height - inset)).toDouble(),
    );
    return result.addWithRawTransform(
      transform: MatrixUtils.forceToPoint(inside),
      position: inside,
      hitTest: (BoxHitTestResult result, Offset position) =>
          child.hitTest(result, position: inside),
    );
  }
}
