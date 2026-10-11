import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// How a [TanreiCarousel] arranges its items (the spec's `layout`; not a token axis: the layouts
/// are geometry read from the same tokens).
enum TanreiCarouselLayout {
  /// As many large items as fit, then a medium and a small one that grow as they scroll toward
  /// the start (CRL-10). The spec's `multi-browse`.
  multiBrowse,

  /// One large item and a small one after it (CRL-11).
  hero,

  /// Every item the same width, the last one in view cut by the edge; scrolls freely (CRL-13).
  uncontained;

  /// The layout the spec names [name] (`multi-browse`, `hero` or `uncontained`), for a prop that
  /// arrives as text. An unknown name is [multiBrowse], reported in debug builds (CRL-24).
  static TanreiCarouselLayout fromName(String name) {
    switch (name) {
      case 'multi-browse':
        return multiBrowse;
      case 'hero':
        return hero;
      case 'uncontained':
        return uncontained;
    }
    assert(() {
      debugTanreiReportUnknownValue('carousel layout', name, 'multi-browse');
      return true;
    }());
    return multiBrowse;
  }
}

/// Lets people browse a row of visual items that scrolls sideways.
///
/// Implements `specs/carousel.spec.json`, built on the widgets library's `Scrollable` with a
/// layout of its own and scroll physics that settle (not Material's `CarouselView`):
///
/// * [children] are [TanreiCarouselItem]s (the spec's item kind `item`), in order;
/// * [layout] — [TanreiCarouselLayout.multiBrowse] (the default), `.hero` or `.uncontained`;
/// * [itemWidth] — the width of a large item for multi-browse and uncontained; null takes
///   `comp.carousel.container.large-width` (a value that is not a positive number is treated as
///   null and reported, CRL-24);
/// * [semanticLabel] — the list's accessible name (the spec's `label`).
///
/// It is as wide as its parent and `comp.carousel.layout.height` tall unless the parent gives it a
/// tight height. The items are one Tab stop: the arrow keys (mirrored right to left), Home and End
/// move between them and bring the focused one into place; each is a button named by its label
/// with its position among the items. An item's content holds no interactive element: it is
/// hidden from assistive technology and receives no presses of its own.
class TanreiCarousel extends StatefulWidget {
  /// Creates a carousel.
  const TanreiCarousel({
    super.key,
    this.layout = TanreiCarouselLayout.multiBrowse,
    this.itemWidth,
    this.semanticLabel = '',
    required this.children,
  });

  /// How the row arranges its items.
  final TanreiCarouselLayout layout;

  /// The width of a large item (multi-browse, uncontained); null for the token.
  final double? itemWidth;

  /// The list's accessible name ("Recently played").
  final String semanticLabel;

  /// The items, in order.
  final List<TanreiCarouselItem> children;

  @override
  State<TanreiCarousel> createState() => _TanreiCarouselState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiCarouselLayout>('layout', layout))
      ..add(DoubleProperty('itemWidth', itemWidth, defaultValue: null))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// One item of a [TanreiCarousel] (the spec's item kind `item`): the product's content in a
/// rounded box, one action named by [label].
///
/// [child] is the content (an image, a poster); it is laid out at a large item's width and the
/// carousel's height, centred and clipped, so a narrower item shows its middle. It is hidden from
/// assistive technology and must hold no interactive element (CRL-20): the item is the one action.
class TanreiCarouselItem extends StatefulWidget {
  /// Describes an item.
  const TanreiCarouselItem({super.key, required this.label, this.onTap, required this.child});

  /// The item's accessible name: what its content shows ("Coast path, 12 photos").
  final String label;

  /// Called once when the item is activated (the spec's `click`).
  final VoidCallback? onTap;

  /// The content.
  final Widget child;

  @override
  State<TanreiCarouselItem> createState() => _TanreiCarouselItemState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('label', label));
  }
}

/// Where the items of a carousel are for a width and a scroll offset (CRL-8 – CRL-13): the pure
/// geometry of the spec, in the inner coordinates of the row (0 is the inner start edge, after
/// `layout.padding-inline`).
@immutable
class _CarouselGeometry {
  const _CarouselGeometry._({
    required this.inner,
    required this.padding,
    required this.gap,
    required this.slotWidths,
    required this.slotStarts,
    required this.largeCount,
    required this.contentWidth,
    required this.snaps,
    required this.count,
  });

  /// CRL-9 – CRL-11, CRL-13: the slots of [layout] for a row [width] wide.
  factory _CarouselGeometry.compute({
    required double width,
    required double padding,
    required double gap,
    required double largeWidth,
    required double smallMin,
    required double smallMax,
    required TanreiCarouselLayout layout,
    required int count,
  }) {
    final double w = math.max(0.0, width - 2 * padding);
    final double g = gap;
    List<double> slots;
    int large = 1;
    double content;
    bool snaps = true;
    if (w < 3 * smallMin + 2 * g) {
      // CRL-9: too narrow for a small slot: one slot as wide as the row, in every layout.
      slots = <double>[w];
      content = w;
    } else {
      switch (layout) {
        case TanreiCarouselLayout.multiBrowse:
          // CRL-10: n large, one medium, one small, filling W exactly.
          final double room = w - 2 * (smallMin + g);
          final double l = math.min(largeWidth, room);
          large = math.max(1, ((room + _epsilon) / (l + g)).floor());
          final double r = w - large * (l + g);
          double s = clampDouble((r - g) / 3, smallMin, smallMax);
          double m = r - g - s;
          if (m > l) {
            m = l;
            s = r - g - l;
          }
          slots = <double>[for (int i = 0; i < large; i++) l, m, s];
          content = l;
        case TanreiCarouselLayout.hero:
          // CRL-11: one large slot and one small slot of the greatest small width.
          slots = <double>[w - g - smallMax, smallMax];
          content = w - g - smallMax;
        case TanreiCarouselLayout.uncontained:
          // CRL-13: every item the large width, no slots.
          slots = const <double>[];
          content = math.min(largeWidth, w);
          snaps = false;
      }
    }
    final List<double> starts = <double>[];
    double at = 0;
    for (final double slot in slots) {
      starts.add(at);
      at += slot + g;
    }
    return _CarouselGeometry._(
      inner: w,
      padding: padding,
      gap: g,
      slotWidths: slots,
      slotStarts: starts,
      largeCount: large,
      contentWidth: content,
      snaps: snaps,
      count: count,
    );
  }

  /// Rounding slack of the whole-number search.
  static const double _epsilon = 1e-9;

  /// The inner width W.
  final double inner;
  final double padding;
  final double gap;

  /// The slots 0 … K − 1 (empty for uncontained).
  final List<double> slotWidths;
  final List<double> slotStarts;

  /// The number of large slots n (1 for hero and the one-slot row).
  final int largeCount;

  /// The width every item's content is laid out at (CRL-15): the large slot's.
  final double contentWidth;

  /// Whether the row settles at whole positions (multi-browse, hero, the one-slot row).
  final bool snaps;
  final int count;

  /// How far the row scrolls for one position: the large slot plus the gap (CRL-12), or one item
  /// and the gap (uncontained).
  double get step => contentWidth + gap;

  /// The greatest scroll offset.
  double get maxScroll {
    if (snaps) {
      return math.max(0, count - largeCount) * step;
    }
    return math.max(0, count * contentWidth + math.max(0, count - 1) * gap - inner);
  }

  int get _k => slotWidths.length;

  /// Slot [k]'s start and width, for k from −1 to K (CRL-12).
  (double, double) _slot(int k) {
    if (k < 0) {
      final double width = slotWidths[_k - 1];
      return (-padding - width, width);
    }
    if (k >= _k) {
      return (inner + padding, slotWidths[_k - 1]);
    }
    return (slotStarts[k], slotWidths[k]);
  }

  /// Item [index]'s start (in inner coordinates) and width at scroll offset [pixels].
  (double, double) item(int index, double pixels) {
    if (!snaps) {
      return (index * step - pixels, contentWidth);
    }
    final double s = index - pixels / step;
    if (s <= -1) {
      final (double start, double width) = _slot(-1);
      return (start + (s + 1) * (width + gap), width);
    }
    if (s >= _k) {
      final (double start, double width) = _slot(_k);
      return (start + (s - _k) * (width + gap), width);
    }
    final int k = s.floor();
    final double f = s - k;
    final (double a, double aw) = _slot(k);
    final (double b, double bw) = _slot(k + 1);
    return (lerpDouble(a, b, f)!, lerpDouble(aw, bw, f)!);
  }

  /// CRL-17: the item at slot 0 (snapping) or the first wholly in view (uncontained).
  int restingIndex(double pixels) {
    if (count == 0) {
      return 0;
    }
    if (snaps) {
      return clampDouble((pixels / step).roundToDouble(), 0, count - 1.0).toInt();
    }
    for (int i = 0; i < count; i++) {
      final (double start, double width) = item(i, pixels);
      if (start >= -padding - _halfPixel && start + width <= inner + padding + _halfPixel) {
        return i;
      }
    }
    return clampDouble((pixels / step).floorToDouble(), 0, count - 1.0).toInt();
  }

  static const double _halfPixel = 0.5;

  /// CRL-18: the scroll offset that brings item [index] into place: slot 0 (snapping), or in view
  /// with the least scroll (uncontained); clamped to the range.
  double revealOffset(int index, double pixels) {
    if (snaps) {
      return clampDouble(index * step, 0, maxScroll);
    }
    final (double start, double width) = item(index, pixels);
    double target = pixels;
    if (start < 0) {
      target = pixels + start;
    } else if (start + width > inner) {
      target = pixels + start + width - inner;
    }
    return clampDouble(target, 0, maxScroll);
  }
}

class _TanreiCarouselState extends State<TanreiCarousel> with TanreiItemGroupMixin<TanreiCarousel> {
  final ScrollController _controller = ScrollController();

  /// The geometry of the last layout.
  _CarouselGeometry? _geometry;

  bool _reportedName = false;
  bool _reportedWidth = false;

  @override
  bool get wrapsFocus => false;

  @override
  Axis get itemAxis => Axis.horizontal;

  @override
  bool get typeaheadEnabled => false;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleScroll);
  }

  @override
  void didUpdateWidget(TanreiCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final _CarouselGeometry? geometry = _geometry;
    if (geometry != null &&
        _controller.hasClients &&
        !listEquals(_keysOf(oldWidget), _keysOf(widget))) {
      // CRL-21: keep the item that was in place where it was, without motion.
      final int resting = geometry.restingIndex(_controller.offset);
      final Key? key = resting < oldWidget.children.length ? oldWidget.children[resting].key : null;
      final int moved = key == null
          ? resting
          : widget.children.indexWhere((TanreiCarouselItem item) => item.key == key);
      if (moved >= 0 && moved != resting) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final _CarouselGeometry? now = _geometry;
          if (mounted && now != null && _controller.hasClients) {
            _controller.jumpTo(now.revealOffset(moved, _controller.offset));
          }
        });
      }
    }
  }

  static List<Key?> _keysOf(TanreiCarousel carousel) => <Key?>[
    for (final TanreiCarouselItem item in carousel.children) item.key,
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// The Tab stop follows the item in place once a scroll ends (CRL-17).
  void _handleScroll() {
    if (!_controller.position.isScrollingNotifier.value) {
      scheduleTabStops();
    }
  }

  @override
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) {
    if (items.isEmpty) {
      return null;
    }
    if (lastFocused != null) {
      return lastFocused;
    }
    final _CarouselGeometry? geometry = _geometry;
    final int resting = geometry == null || !_controller.hasClients
        ? 0
        : geometry.restingIndex(_controller.offset);
    return items[math.min(resting, items.length - 1)];
  }

  /// CRL-18: bring [item] into place over the scroll motion (at once where motion is reduced).
  void revealItem(TanreiGroupItem item) {
    final int index = orderedItems().indexOf(item);
    final _CarouselGeometry? geometry = _geometry;
    if (index < 0 || geometry == null || !_controller.hasClients) {
      return;
    }
    _revealIndex(index);
  }

  void _revealIndex(int index) {
    final _CarouselGeometry? geometry = _geometry;
    if (geometry == null || !_controller.hasClients) {
      return;
    }
    final double target = geometry.revealOffset(index, _controller.offset);
    if ((target - _controller.offset).abs() < _CarouselGeometry._epsilon) {
      return;
    }
    final TanreiCarouselTokens tokens = TanreiTheme.of(context).system.carousel;
    if (_reduceMotion) {
      _controller.jumpTo(target);
    } else {
      _controller.animateTo(
        target,
        duration: tanreiDuration(tokens.motionScrollDuration),
        curve: tokens.motionScrollEasing.toCurve(),
      );
    }
  }

  void _debugReport() {
    assert(() {
      final bool missing = !tanreiIsAccessibleName(widget.semanticLabel);
      if (missing && !_reportedName) {
        debugTanreiReportMissingName('carousel', widget);
      }
      _reportedName = missing;
      final double? width = widget.itemWidth;
      final bool invalid = width != null && !(width > 0 && width.isFinite);
      if (invalid && !_reportedWidth) {
        debugTanreiReportIgnoredValue(
          'carousel',
          'itemWidth',
          'An item width of $width is not a positive number: it is treated as null, the '
              'container.large-width token.',
          widget,
        );
      }
      _reportedWidth = invalid;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugReport();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiCarouselTokens tokens = theme.system.carousel;
    final TextDirection direction = Directionality.of(context);
    final double? itemWidth = widget.itemWidth;
    final double largeWidth = itemWidth != null && itemWidth > 0 && itemWidth.isFinite
        ? itemWidth
        : tokens.containerLargeWidth;
    final bool snaps = widget.layout != TanreiCarouselLayout.uncontained;
    final int count = widget.children.length;
    final Widget scrollable = Scrollable(
      controller: _controller,
      // CRL-23: right to left, the row scrolls toward the left.
      axisDirection: direction == TextDirection.rtl ? AxisDirection.left : AxisDirection.right,
      physics: _CarouselPhysics(
        geometry: () => _geometry,
        snaps: snaps,
        duration: _reduceMotion ? Duration.zero : tanreiDuration(tokens.motionScrollDuration),
        curve: tokens.motionScrollEasing.toCurve(),
      ),
      semanticChildCount: count,
      // CRL-1: a press that becomes a scroll does not activate; the drag counts from the slop.
      dragStartBehavior: DragStartBehavior.start,
      viewportBuilder: (BuildContext context, ViewportOffset offset) => _CarouselViewport(
        offset: offset,
        layout: widget.layout,
        largeWidth: largeWidth,
        padding: tokens.layoutPaddingInline,
        gap: tokens.layoutGap,
        smallMin: tokens.containerSmallMinWidth,
        smallMax: tokens.containerSmallMaxWidth,
        height: tokens.layoutHeight,
        target: theme.system.measure.targetTouch,
        textDirection: direction,
        onLayout: (_CarouselGeometry geometry) => _geometry = geometry,
        onReveal: _revealIndex,
        children: <Widget>[
          for (int i = 0; i < count; i++) IndexedSemantics(index: i, child: widget.children[i]),
        ],
      ),
    );
    // CRL-19: the list, named by the label; each item a button with its index.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: _CarouselScope(
        carousel: this,
        gap: tokens.layoutGap,
        contentWidth: () => _geometry?.contentWidth ?? largeWidth,
        child: buildItemGroup(child: scrollable),
      ),
    );
  }
}

/// What an item reads from its carousel: the carousel (focus and reveal), the gap its hit area
/// takes half of, and the width its content is laid out at.
class _CarouselScope extends InheritedWidget {
  const _CarouselScope({
    required this.carousel,
    required this.gap,
    required this.contentWidth,
    required super.child,
  });

  final _TanreiCarouselState carousel;
  final double gap;
  final ValueGetter<double> contentWidth;

  static _CarouselScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_CarouselScope>();

  @override
  bool updateShouldNotify(_CarouselScope oldWidget) =>
      carousel != oldWidget.carousel || gap != oldWidget.gap;
}

/// CRL-14: settles a snapping row at a whole position — the next one in a fling's direction, else
/// the nearest — over the scroll motion; an uncontained row scrolls freely. Never past its ends.
class _CarouselPhysics extends ScrollPhysics {
  const _CarouselPhysics({
    required this.geometry,
    required this.snaps,
    required this.duration,
    required this.curve,
    super.parent,
  });

  final ValueGetter<_CarouselGeometry?> geometry;
  final bool snaps;
  final Duration duration;
  final Curve curve;

  @override
  _CarouselPhysics applyTo(ScrollPhysics? ancestor) => _CarouselPhysics(
    geometry: geometry,
    snaps: snaps,
    duration: duration,
    curve: curve,
    parent: buildParent(const ClampingScrollPhysics().applyTo(ancestor)),
  );

  @override
  Simulation? createBallisticSimulation(ScrollMetrics position, double velocity) {
    final _CarouselGeometry? g = geometry();
    if (!snaps ||
        g == null ||
        g.step <= 0 ||
        position.outOfRange ||
        position.maxScrollExtent <= position.minScrollExtent) {
      return super.createBallisticSimulation(position, velocity);
    }
    final double p = position.pixels / g.step;
    final double whole;
    if (velocity.abs() > minFlingVelocity) {
      whole = velocity > 0 ? p.floorToDouble() + 1 : p.ceilToDouble() - 1;
    } else {
      whole = p.roundToDouble();
    }
    final double target = clampDouble(
      whole * g.step,
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    if ((target - position.pixels).abs() < toleranceFor(position).distance) {
      return null;
    }
    return _SettleSimulation(
      start: position.pixels,
      end: target,
      seconds: duration.inMicroseconds / Duration.microsecondsPerSecond,
      curve: curve,
    );
  }
}

/// Moves from [start] to [end] over [seconds] with [curve]; at once for no time.
class _SettleSimulation extends Simulation {
  _SettleSimulation({
    required this.start,
    required this.end,
    required this.seconds,
    required this.curve,
  });

  final double start;
  final double end;
  final double seconds;
  final Curve curve;

  double _t(double time) => seconds <= 0 ? 1 : clampDouble(time / seconds, 0, 1);

  @override
  double x(double time) => start + (end - start) * curve.transform(_t(time));

  @override
  double dx(double time) {
    if (seconds <= 0 || time >= seconds) {
      return 0;
    }
    const double h = 1e-3;
    return (x(time + h) - x(time)) / h;
  }

  @override
  bool isDone(double time) => time >= seconds;
}

/// The row: lays the items out by the scroll offset (CRL-8 – CRL-13), clips them at its edges,
/// hit-tests each item across half the gap on both sides and at least the touch target (CRL-4),
/// keeps the items out of view in the semantics tree, and brings one into place when assistive
/// technology asks (CRL-18).
class _CarouselViewport extends MultiChildRenderObjectWidget {
  const _CarouselViewport({
    required this.offset,
    required this.layout,
    required this.largeWidth,
    required this.padding,
    required this.gap,
    required this.smallMin,
    required this.smallMax,
    required this.height,
    required this.target,
    required this.textDirection,
    required this.onLayout,
    required this.onReveal,
    super.children,
  });

  final ViewportOffset offset;
  final TanreiCarouselLayout layout;
  final double largeWidth;
  final double padding;
  final double gap;
  final double smallMin;
  final double smallMax;
  final double height;
  final double target;
  final TextDirection textDirection;
  final ValueChanged<_CarouselGeometry> onLayout;
  final ValueChanged<int> onReveal;

  @override
  _RenderCarousel createRenderObject(BuildContext context) => _RenderCarousel(this);

  @override
  void updateRenderObject(BuildContext context, _RenderCarousel renderObject) {
    renderObject.config = this;
  }
}

class _CarouselParentData extends ContainerBoxParentData<RenderBox> {
  /// How much wider than the drawn item its hit area is (CRL-4).
  double hitExtra = 0;
}

class _RenderCarousel extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _CarouselParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _CarouselParentData> {
  _RenderCarousel(this._config);

  _CarouselViewport _config;
  set config(_CarouselViewport value) {
    final _CarouselViewport old = _config;
    _config = value;
    if (!identical(old.offset, value.offset)) {
      if (attached) {
        old.offset.removeListener(markNeedsLayout);
        value.offset.addListener(markNeedsLayout);
      }
    }
    markNeedsLayout();
  }

  /// The large slot's step of the last layout, to keep the position when it changes (CRL-21).
  double? _lastStep;

  final LayerHandle<ClipRectLayer> _clip = LayerHandle<ClipRectLayer>();

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _config.offset.addListener(markNeedsLayout);
  }

  @override
  void detach() {
    _config.offset.removeListener(markNeedsLayout);
    super.detach();
  }

  @override
  void dispose() {
    _clip.layer = null;
    super.dispose();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _CarouselParentData) {
      child.parentData = _CarouselParentData();
    }
  }

  @override
  bool get isRepaintBoundary => true;

  @override
  void performLayout() {
    final _CarouselViewport c = _config;
    // CRL-8, CRL-4: as wide as the parent, layout.height tall unless the parent says otherwise,
    // never lower than the touch target.
    final double width = constraints.maxWidth.isFinite
        ? constraints.maxWidth
        : constraints.minWidth;
    final double height = constraints.hasTightHeight
        ? constraints.maxHeight
        : constraints.constrainHeight(math.max(c.height, c.target));
    size = constraints.constrain(Size(width, height));
    final _CarouselGeometry geometry = _CarouselGeometry.compute(
      width: size.width,
      padding: c.padding,
      gap: c.gap,
      largeWidth: c.largeWidth,
      smallMin: c.smallMin,
      smallMax: c.smallMax,
      layout: c.layout,
      count: childCount,
    );
    final ViewportOffset offset = c.offset;
    // CRL-21: a new step keeps the position (the item in place stays where it was).
    final double? lastStep = _lastStep;
    if (geometry.snaps &&
        lastStep != null &&
        lastStep > 0 &&
        lastStep != geometry.step &&
        offset.hasPixels) {
      offset.correctBy(offset.pixels / lastStep * geometry.step - offset.pixels);
    }
    _lastStep = geometry.snaps ? geometry.step : null;
    offset.applyViewportDimension(size.width);
    offset.applyContentDimensions(0, geometry.maxScroll);
    final double pixels = offset.pixels;
    final bool rtl = c.textDirection == TextDirection.rtl;
    int index = 0;
    RenderBox? child = firstChild;
    while (child != null) {
      final (double start, double itemWidth) = geometry.item(index, pixels);
      final double drawn = math.max(0, itemWidth);
      child.layout(
        BoxConstraints.tightFor(width: drawn, height: size.height),
        parentUsesSize: true,
      );
      final _CarouselParentData data = child.parentData! as _CarouselParentData;
      final double left = rtl ? size.width - c.padding - start - drawn : c.padding + start;
      data.offset = Offset(left, 0);
      data.hitExtra = math.max(drawn + c.gap, c.target) - drawn;
      child = data.nextSibling;
      index++;
    }
    c.onLayout(geometry);
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    // CRL-8: items scroll under the padding to the edges and are clipped there.
    _clip.layer = context.pushClipRect(
      needsCompositing,
      offset,
      Offset.zero & size,
      defaultPaint,
      oldLayer: _clip.layer,
    );
  }

  @override
  Rect? describeApproximatePaintClip(RenderObject child) => Offset.zero & size;

  // CRL-19: items out of view stay in the semantics tree, in order (hidden, not dropped).
  @override
  Rect? describeSemanticsClip(RenderObject? child) => Rect.largest;

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    // The scrollable reads each item's index and the first one in view.
    config.addTagForChildren(RenderViewport.useTwoPaneSemantics);
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    RenderBox? child = lastChild;
    while (child != null) {
      final _CarouselParentData data = child.parentData! as _CarouselParentData;
      final Rect drawn = data.offset & child.size;
      // CRL-4: the container with half the gap on each side, at least the touch target wide.
      final Rect hit = Rect.fromLTRB(
        drawn.left - data.hitExtra / 2,
        drawn.top,
        drawn.right + data.hitExtra / 2,
        drawn.bottom,
      );
      if (hit.contains(position) && child.size.width > 0) {
        final RenderBox box = child;
        final bool isHit = result.addWithRawTransform(
          transform: Matrix4.translationValues(-data.offset.dx, -data.offset.dy, 0),
          position: position,
          hitTest: (BoxHitTestResult result, Offset local) => box.hitTest(
            result,
            position: Offset(
              clampDouble(local.dx, 0, box.size.width - _inside),
              clampDouble(local.dy, 0, box.size.height - _inside),
            ),
          ),
        );
        if (isHit) {
          return true;
        }
      }
      child = data.previousSibling;
    }
    return false;
  }

  /// A point on a box's far edge is outside it: clamp a hair inside.
  static const double _inside = 0.01;

  @override
  void showOnScreen({
    RenderObject? descendant,
    Rect? rect,
    Duration duration = Duration.zero,
    Curve curve = Curves.ease,
  }) {
    // CRL-18: assistive technology asks for an item: bring it into place.
    if (descendant != null && descendant != this) {
      RenderObject? node = descendant;
      while (node != null && node.parent != this) {
        node = node.parent;
      }
      if (node is RenderBox) {
        int index = 0;
        RenderBox? child = firstChild;
        while (child != null && child != node) {
          child = childAfter(child);
          index++;
        }
        if (child != null) {
          _config.onReveal(index);
        }
      }
    }
    super.showOnScreen(rect: rect, duration: duration, curve: curve);
  }
}

/// How an item looks in one state (CRL-2, CRL-16, CRL-22): the state layer over its content, its
/// content color, opacity and shape. The container under the content is the resting fill.
@immutable
class _ItemVisuals {
  const _ItemVisuals({
    required this.layer,
    required this.content,
    required this.opacity,
    required this.shape,
  });

  /// The state layer drawn over the content: `state-layer.color` at the state's opacity, clear at
  /// rest.
  final Color layer;
  final Color content;
  final double opacity;
  final double shape;

  static _ItemVisuals lerp(_ItemVisuals a, _ItemVisuals b, double t) => _ItemVisuals(
    layer: tanreiLerpColor(a.layer, b.layer, t),
    content: tanreiLerpColor(a.content, b.content, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
  );
}

class _TanreiCarouselItemState extends State<TanreiCarouselItem>
    with
        TickerProviderStateMixin<TanreiCarouselItem>,
        TanreiPressableStateMixin<TanreiCarouselItem, _ItemVisuals>
    implements TanreiGroupItem {
  final FocusNode _focusNode = FocusNode(debugLabel: 'TanreiCarouselItem');
  _TanreiCarouselState? _carousel;
  ValueListenable<bool>? _scrolling;
  bool _reportedName = false;

  TanreiCarouselTokens get _tokens => TanreiTheme.of(context).system.carousel;

  @override
  FocusNode get focusNode => _focusNode;

  @override
  String get typeaheadText => widget.label;

  @override
  bool get takesFocus => true;

  @override
  VoidCallback? get onPressed => widget.onTap;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  // CRL-5: the press is shown when the pointer goes down, not when the tap wins over the scroll.
  @override
  bool get pressedByTaps => false;

  @override
  _ItemVisuals lerpVisuals(_ItemVisuals a, _ItemVisuals b, double t) => _ItemVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_handleFocus);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final _TanreiCarouselState? carousel = _CarouselScope.maybeOf(context)?.carousel;
    if (!identical(carousel, _carousel)) {
      _carousel?.unregisterItem(this);
      _carousel = carousel;
      carousel?.registerItem(this);
    }
    final ValueListenable<bool>? scrolling = Scrollable.maybeOf(
      context,
    )?.position.isScrollingNotifier;
    if (!identical(scrolling, _scrolling)) {
      _scrolling?.removeListener(_handleScrolling);
      _scrolling = scrolling;
      scrolling?.addListener(_handleScrolling);
    }
  }

  @override
  void dispose() {
    _scrolling?.removeListener(_handleScrolling);
    _carousel?.unregisterItem(this);
    _focusNode
      ..removeListener(_handleFocus)
      ..dispose();
    super.dispose();
  }

  // CRL-1: a press that turns into a scroll is not a press.
  void _handleScrolling() {
    if (_scrolling?.value ?? false) {
      cancelPress();
    }
  }

  /// Whether the item had primary focus at the last focus notification.
  bool _hadPrimaryFocus = false;

  // CRL-18: keyboard focus brings the item into place, once when it arrives.
  void _handleFocus() {
    final bool primary = _focusNode.hasPrimaryFocus;
    if (primary && !_hadPrimaryFocus) {
      _carousel?.revealItem(this);
    }
    _hadPrimaryFocus = primary;
  }

  void _debugReportName() {
    assert(() {
      final bool missing = !tanreiIsAccessibleName(widget.label);
      if (missing && !_reportedName) {
        debugTanreiReportMissingName('carousel item', widget);
      }
      _reportedName = missing;
      return true;
    }());
  }

  /// CRL-16: the state layer of [state]: `state-layer.color` at the system's state-layer opacity
  /// for that state; clear at rest.
  static Color _layerOf(
    TanreiThemeData theme,
    TanreiCarouselPartTokens part,
    TanreiInteractionState state,
  ) {
    final TanreiState opacities = theme.system.state;
    final double opacity = switch (state) {
      TanreiInteractionState.hovered => opacities.hoverStateLayerOpacity,
      TanreiInteractionState.focused => opacities.focusStateLayerOpacity,
      TanreiInteractionState.pressed => opacities.pressedStateLayerOpacity,
      TanreiInteractionState.enabled || TanreiInteractionState.disabled => 0,
    };
    final Color color = theme.paint(part.of(state).stateLayerColor);
    return color.withValues(alpha: color.a * opacity);
  }

  void _pointerDown(PointerDownEvent event) {
    final RenderObject? box = pressContainerKey.currentContext?.findRenderObject();
    beginPress(box is RenderBox ? box.globalToLocal(event.position) : null);
  }

  @override
  Widget build(BuildContext context) {
    _debugReportName();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiCarouselTokens tokens = _tokens;
    final TanreiCarouselPartTokens part = tokens.parts[TanreiCarouselPart.item];
    final TanreiCarouselStateTokens? state = tokens.stateTokens(drawnState);
    // CRL-2, CRL-6, CRL-16, CRL-22: the drawn state's tokens; the state layer of the state the
    // pressed feedback names (ripple and dim keep the one under the press); eased over the state
    // motion.
    final _ItemVisuals visuals = animateVisuals(
      _ItemVisuals(
        layer: _layerOf(theme, part, containerState),
        content: theme.paint(part.of(drawnState).contentColor),
        opacity: state?.opacity ?? _opaque,
        shape: state?.containerShape ?? tokens.containerShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );
    final _CarouselScope? scope = _CarouselScope.maybeOf(context);
    final double contentWidth = scope?.contentWidth() ?? tokens.containerLargeWidth;
    // CRL-15, CRL-16: the content at the large width and the full height, centred and clipped to
    // the container; the content color and the body style as its inherited foreground; hidden
    // from assistive technology (CRL-19).
    final Widget content = ClipPath(
      clipper: _ShapeClipper(shape),
      child: OverflowBox(
        minWidth: contentWidth,
        maxWidth: contentWidth,
        child: ExcludeSemantics(
          child: DefaultTextStyle.merge(
            style: theme.textStyle(theme.system.typescale.body, color: visuals.content),
            child: IconTheme.merge(
              data: IconThemeData(color: visuals.content),
              child: IgnorePointer(child: widget.child),
            ),
          ),
        ),
      ),
    );
    final Color fill = theme.paint(part.enabled.containerColor);
    // CRL-16: the resting fill under the content; the state layer and the ripple over it, so that
    // hover, focus and press show on any content. CRL-3, CRL-7: the focus ring inside the
    // container, which the row would clip, over both.
    final Widget container = TanreiFocusRing(
      visible: isKeyboardFocused,
      inside: true,
      borderRadius: BorderRadius.circular(shape.radius),
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(shape: shape, color: fill.a > 0 ? fill : null),
        child: DecoratedBox(
          key: pressContainerKey,
          position: DecorationPosition.foreground,
          decoration: TanreiContainerDecoration(
            shape: shape,
            color: visuals.layer.a > 0 ? visuals.layer : null,
            ripple: rippleFor(
              pressedContainer: () => _layerOf(theme, part, TanreiInteractionState.pressed),
              container: visuals.layer,
            ),
          ),
          child: SizedBox.expand(child: content),
        ),
      ),
    );
    final double gap = scope?.gap ?? tokens.layoutGap;
    // CRL-19, CRL-4: a button named by its label; its node as wide as its hit area.
    return _HitAreaSemantics(
      gap: gap,
      target: theme.system.measure.targetTouch,
      child: Semantics(
        button: true,
        label: tanreiIsAccessibleName(widget.label) ? widget.label : null,
        onDidGainAccessibilityFocus: () => _carousel?.revealItem(this),
        child: buildPressable(
          focusNode: _focusNode,
          child: Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: _pointerDown,
            onPointerUp: (_) => endPress(),
            onPointerCancel: (_) => endPress(),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onTap,
              child: Opacity(opacity: visuals.opacity, child: container),
            ),
          ),
        ),
      ),
    );
  }
}

/// A resting item is not dimmed.
const double _opaque = 1;

/// Clips to a [TanreiCornerShape].
class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}

/// An item's semantics node grown to its hit area (CRL-4): half the gap on each side, at least
/// the touch target wide and high, around the drawn container.
class _HitAreaSemantics extends SingleChildRenderObjectWidget {
  const _HitAreaSemantics({required this.gap, required this.target, super.child});

  final double gap;
  final double target;

  @override
  _RenderHitAreaSemantics createRenderObject(BuildContext context) =>
      _RenderHitAreaSemantics(gap, target);

  @override
  void updateRenderObject(BuildContext context, _RenderHitAreaSemantics renderObject) {
    renderObject
      ..gap = gap
      ..target = target;
  }
}

class _RenderHitAreaSemantics extends RenderProxyBox {
  _RenderHitAreaSemantics(this._gap, this._target);

  double _gap;
  set gap(double value) {
    if (_gap != value) {
      _gap = value;
      markNeedsSemanticsUpdate();
    }
  }

  double _target;
  set target(double value) {
    if (_target != value) {
      _target = value;
      markNeedsSemanticsUpdate();
    }
  }

  @override
  Rect get semanticBounds => Rect.fromCenter(
    center: size.center(Offset.zero),
    width: math.max(size.width + _gap, _target),
    height: math.max(size.height, _target),
  );

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = true;
  }
}
