import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/ignored_value.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Names the current screen at its top edge and holds the way back and the screen's most used
/// actions, flat while the content is at its top and set apart once content scrolls under it.
///
/// Implements `specs/app-bar.spec.json` with the idiom of Flutter's `AppBar`: a
/// [PreferredSizeWidget] for a scaffold's app bar slot, or the first child of a `Column` above the
/// screen's content.
///
/// * [title] is the screen's name and its heading for assistive technology; [subtitle] one line
///   under it (empty draws none);
/// * [leading] is the spec's navigation item: one `TanreiIconButton` (back, menu or close) with its
///   own `semanticLabel` and `onPressed`, laid out at the start and never restyled;
/// * [actions] are the spec's action items: up to three `TanreiIconButton`s at the end, in reading
///   order, each with its own `semanticLabel` and `onPressed`. More are drawn and reported in debug
///   builds (they belong in an overflow menu);
/// * [size] (`TanreiAppBarSize.small`, `large`, or a size a design system adds) and [centerTitle]
///   (the spec's `titleAlignment`: false is `start`, true is `center`);
/// * [scrolledUnder] is the spec's `scrolled`. Null follows the `ScrollNotification`s of the nearest
///   `ScrollNotificationObserver` (a Material `Scaffold` puts one around its body; a product without
///   one wraps the page in its own), as `AppBar`'s scrolled-under state does: true while the
///   content is scrolled from its top. A bool overrides it.
///
/// A size taller than `small` (`large`) gives the title a row of its own under the top row. This
/// widget cannot collapse it as the content scrolls: it stays expanded, and is drawn collapsed
/// while [scrolledUnder] is true. The bar that collapses with its content is [TanreiSliverAppBar],
/// the first sliver of a `CustomScrollView`.
///
/// The bar's color reaches under the top system inset (`MediaQuery.paddingOf`: the status bar, a
/// camera cutout, a window caption) and its content stays below it and inside the left and right
/// insets. It has no role of its own and is not focusable: Tab goes from the navigation button to
/// the actions.
///
/// [preferredSize] cannot know the height, which comes from the design system in the theme and
/// the text size: it reports an unbounded height, so a scaffold lets the bar size itself.
class TanreiAppBar extends StatefulWidget implements PreferredSizeWidget {
  /// Creates an app bar.
  const TanreiAppBar({
    super.key,
    this.leading,
    this.actions = const <Widget>[],
    this.title = '',
    this.subtitle = '',
    this.size = TanreiAppBarSize.small,
    this.centerTitle = false,
    this.scrolledUnder,
  });

  /// The navigation item: one icon button at the start (back, menu or close).
  final Widget? leading;

  /// The action items: up to three icon buttons at the end, in reading order.
  final List<Widget> actions;

  /// The screen's name, drawn on one line and exposed as a heading. Empty draws no title.
  final String title;

  /// One line under the title. Empty draws none.
  final String subtitle;

  /// Small puts the title in the one row the bar has; large gives it a larger row of its own.
  final TanreiAppBarSize size;

  /// Whether the top row's title is centered on the bar (the spec's `titleAlignment: center`)
  /// rather than starting after the navigation button (`start`).
  final bool centerTitle;

  /// Whether content lies under the bar; null follows the nearest `ScrollNotificationObserver`.
  final bool? scrolledUnder;

  @override
  Size get preferredSize => _unboundedPreferredSize;

  @override
  State<TanreiAppBar> createState() => _TanreiAppBarState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('title', title))
      ..add(StringProperty('subtitle', subtitle, defaultValue: ''))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('centerTitle', value: centerTitle, ifTrue: 'center'))
      ..add(DiagnosticsProperty<bool>('scrolledUnder', scrolledUnder, defaultValue: null));
  }
}

/// No height a scaffold could impose: the bar measures itself (a scaffold asserts a finite one).
const Size _unboundedPreferredSize = Size.fromHeight(double.maxFinite);

class _TanreiAppBarState extends State<TanreiAppBar> {
  ScrollNotificationObserverState? _observer;
  bool _scrolledUnder = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _observer?.removeListener(_handleScroll);
    _observer = ScrollNotificationObserver.maybeOf(context);
    _observer?.addListener(_handleScroll);
  }

  @override
  void dispose() {
    _observer?.removeListener(_handleScroll);
    _observer = null;
    super.dispose();
  }

  // APB-9: content lies under the bar while the connected view is scrolled from its top.
  void _handleScroll(ScrollNotification notification) {
    if (notification is! ScrollUpdateNotification || notification.depth != 0) {
      return;
    }
    final ScrollMetrics metrics = notification.metrics;
    final bool scrolled = switch (metrics.axisDirection) {
      AxisDirection.down => metrics.extentBefore > 0,
      AxisDirection.up => metrics.extentAfter > 0,
      // Only a vertical view scrolls under a bar.
      AxisDirection.left || AxisDirection.right => _scrolledUnder,
    };
    if (scrolled != _scrolledUnder) {
      setState(() => _scrolledUnder = scrolled);
    }
  }

  @override
  Widget build(BuildContext context) {
    final TanreiAppBarSizes sizes = TanreiTheme.of(context).system.appBar.sizes;
    // A bar with a title row of its own cannot collapse here, so nothing scrolls under it until it
    // is told so (APB-9: a large bar is scrolled only once fully collapsed). An unknown size is
    // small (reported once, by the surface).
    final bool expandedRow =
        sizes.has(widget.size) && sizes[widget.size].containerHeight > sizes.small.containerHeight;
    final bool scrolled = widget.scrolledUnder ?? (!expandedRow && _scrolledUnder);
    return _AppBarSurface(
      leading: widget.leading,
      actions: widget.actions,
      title: widget.title,
      subtitle: widget.subtitle,
      size: widget.size,
      centerTitle: widget.centerTitle,
      scrolled: scrolled,
      // APB-9: a large bar is drawn fully collapsed while scrolled is true.
      collapsed: scrolled,
    );
  }
}

/// An app bar as the first sliver of a `CustomScrollView`, pinned at the top of the view: the bar
/// that collapses with its content (spec `app-bar`, APB-8 and APB-9, as `SliverAppBar.large`).
///
/// It takes the parameters of [TanreiAppBar]. While [size] is taller than `small`, the bar
/// shrinks by the distance the content has scrolled, one for one, from its expanded height to the
/// top row's, the expanded title moving up with the bottom edge under the top row, and the top
/// row's title fading in with the part of the expanded title that is covered; it expands the same
/// way as the content returns. It is scrolled once content lies under it — for a bar that
/// collapses, once it has fully collapsed. [scrolledUnder] overrides that (true also draws it
/// fully collapsed).
class TanreiSliverAppBar extends StatefulWidget {
  /// Creates an app bar for a `CustomScrollView`.
  const TanreiSliverAppBar({
    super.key,
    this.leading,
    this.actions = const <Widget>[],
    this.title = '',
    this.subtitle = '',
    this.size = TanreiAppBarSize.large,
    this.centerTitle = false,
    this.scrolledUnder,
  });

  /// The navigation item, as [TanreiAppBar.leading].
  final Widget? leading;

  /// The action items, as [TanreiAppBar.actions].
  final List<Widget> actions;

  /// The screen's name, as [TanreiAppBar.title].
  final String title;

  /// One line under the title, as [TanreiAppBar.subtitle].
  final String subtitle;

  /// The size, as [TanreiAppBar.size]; large by default, the size that collapses.
  final TanreiAppBarSize size;

  /// Whether the top row's title is centered, as [TanreiAppBar.centerTitle].
  final bool centerTitle;

  /// Whether content lies under the bar; null follows the scroll view the bar is in.
  final bool? scrolledUnder;

  @override
  State<TanreiSliverAppBar> createState() => _TanreiSliverAppBarState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('title', title))
      ..add(StringProperty('subtitle', subtitle, defaultValue: ''))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('centerTitle', value: centerTitle, ifTrue: 'center'))
      ..add(DiagnosticsProperty<bool>('scrolledUnder', scrolledUnder, defaultValue: null));
  }
}

class _TanreiSliverAppBarState extends State<TanreiSliverAppBar> {
  final _AppBarExtents _extents = _AppBarExtents();
  bool _scrolledUnder = false;

  // APB-9: what the sliver saw in its layout, applied after the frame (a layout cannot rebuild).
  void _handleScrolled(bool scrolled) {
    if (mounted && scrolled != _scrolledUnder) {
      setState(() => _scrolledUnder = scrolled);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool scrolled = widget.scrolledUnder ?? _scrolledUnder;
    return _SliverAppBar(
      extents: _extents,
      collapsed: widget.scrolledUnder ?? false,
      onScrolled: _handleScrolled,
      child: _AppBarSurface(
        leading: widget.leading,
        actions: widget.actions,
        title: widget.title,
        subtitle: widget.subtitle,
        size: widget.size,
        centerTitle: widget.centerTitle,
        scrolled: scrolled,
        collapsed: widget.scrolledUnder ?? false,
        extents: _extents,
      ),
    );
  }
}

/// The condition's look (APB-1, APB-2): the container color, its elevation and the bottom edge.
@immutable
class _ConditionVisuals {
  const _ConditionVisuals({
    required this.container,
    required this.elevation,
    required this.outline,
  });

  final Color container;
  final TanreiResolvedElevation elevation;
  final Color outline;

  static _ConditionVisuals lerp(_ConditionVisuals a, _ConditionVisuals b, double t) =>
      _ConditionVisuals(
        container: tanreiLerpColor(a.container, b.container, t),
        elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
        outline: tanreiLerpColor(a.outline, b.outline, t),
      );
}

/// The bar both widgets draw: the condition's container and edge around the laid-out parts.
class _AppBarSurface extends StatefulWidget {
  const _AppBarSurface({
    required this.leading,
    required this.actions,
    required this.title,
    required this.subtitle,
    required this.size,
    required this.centerTitle,
    required this.scrolled,
    required this.collapsed,
    this.extents,
  });

  final Widget? leading;
  final List<Widget> actions;
  final String title;
  final String subtitle;
  final TanreiAppBarSize size;
  final bool centerTitle;

  /// The condition: scrolled or flat.
  final bool scrolled;

  /// Whether a bar with a title row of its own is drawn fully collapsed.
  final bool collapsed;

  /// Where the layout reports its expanded and collapsed heights (for the sliver).
  final _AppBarExtents? extents;

  @override
  State<_AppBarSurface> createState() => _AppBarSurfaceState();
}

class _AppBarSurfaceState extends State<_AppBarSurface>
    with
        TickerProviderStateMixin<_AppBarSurface>,
        TanreiSelectionTransitionMixin<_AppBarSurface, _ConditionVisuals> {
  bool _reportedActions = false;

  TanreiAppBarTokens get _tokens => TanreiTheme.of(context).system.appBar;

  // APB-3: a change of condition eases over the condition motion, at once where motion is reduced
  // (the mixin's rule).
  @override
  Object get selectionCondition => widget.scrolled;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionConditionDuration);

  @override
  Curve get selectionCurve => _tokens.motionConditionEasing.toCurve();

  @override
  _ConditionVisuals lerpSelection(_ConditionVisuals a, _ConditionVisuals b, double t) =>
      _ConditionVisuals.lerp(a, b, t);

  /// APB-13: more than three actions are drawn, and reported once in debug builds.
  void _debugReportActions() {
    assert(() {
      final bool tooMany = widget.actions.length > _maxActions;
      if (tooMany && !_reportedActions) {
        debugTanreiReportIgnoredValue(
          'app-bar',
          'actions',
          'An app bar holds up to three actions; the ${widget.actions.length} given are all drawn, '
              'but the ones after the third belong in an overflow menu the product provides.',
          widget,
        );
      }
      _reportedActions = tooMany;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugReportActions();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiAppBarTokens tokens = theme.system.appBar;
    final TanreiAppBarSizeTokens top = tokens.sizes.small;
    // APB-14: a size the system does not have is drawn as small, and reported.
    final TanreiAppBarSizeTokens size = tokens.sizes[widget.size];
    // APB-7: a size taller than the top row has a title row of its own (large, and a size a layer
    // clones from it).
    final bool expandedRow = size.containerHeight > top.containerHeight;
    final TanreiAppBarConditionTokens condition = tokens
        .conditions[widget.scrolled ? TanreiAppBarCondition.scrolled : TanreiAppBarCondition.flat];
    final _ConditionVisuals visuals = animateSelection(
      _ConditionVisuals(
        container: theme.paint(condition.containerColor),
        elevation: TanreiResolvedElevation.resolve(condition.containerElevation, theme.colors),
        outline: theme.paint(condition.outlineColor),
      ),
    );

    final bool hasTitle = widget.title.isNotEmpty;
    final bool hasSubtitle = widget.subtitle.isNotEmpty;
    final Color titleColor = theme.paint(tokens.titleColor);
    final Color subtitleColor = theme.paint(tokens.subtitleColor);
    final TextAlign align = widget.centerTitle ? TextAlign.center : TextAlign.start;

    // APB-5, APB-7, APB-15: one line, truncated at the end, growing with the text size.
    Widget line(String text, TanreiTextStyle style, Color color, TextAlign align) => Text(
      text,
      style: theme.textStyle(style, color: color),
      textAlign: align,
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.ellipsis,
    );
    // APB-12: the title is the screen's heading, a node of its own; the subtitle is text read
    // after it, never merged into the heading.
    Widget heading(Widget child) =>
        Semantics(container: true, header: true, headingLevel: 1, child: child);
    Widget text(Widget child) => Semantics(container: true, child: child);

    // APB-5, APB-6: the top row's title block, the two lines centered as a block.
    final Widget? topTitle = hasTitle
        ? Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: widget.centerTitle
                ? CrossAxisAlignment.center
                : CrossAxisAlignment.start,
            children: <Widget>[
              heading(line(widget.title, top.titleTypescale, titleColor, align)),
              if (hasSubtitle)
                text(line(widget.subtitle, top.subtitleTypescale, subtitleColor, align)),
            ],
          )
        : null;

    // APB-11, APB-15: the items as they are, from their own tokens, never scaled with the text.
    Widget? item(Widget? child) =>
        child == null ? null : MediaQuery.withNoTextScaling(child: child);

    Widget bar = _AppBarLayout(
      geometry: _AppBarGeometry(
        paddingInline: tokens.containerPaddingInline,
        gap: tokens.containerGap,
        titleInset: tokens.titleInset,
        blockEnd: tokens.containerPaddingBlockEnd,
        topHeight: top.containerHeight,
        expandedHeight: size.containerHeight,
        expandedRow: expandedRow,
        center: widget.centerTitle,
        collapsed: expandedRow && widget.collapsed,
        // APB-10: the content below the top inset and inside the side insets.
        insets: MediaQuery.paddingOf(context),
      ),
      textDirection: Directionality.of(context),
      extents: widget.extents,
      navigation: item(widget.leading),
      actions: widget.actions.isEmpty
          ? null
          : item(
              Row(
                mainAxisSize: MainAxisSize.min,
                spacing: tokens.actionsGap,
                children: widget.actions,
              ),
            ),
      topTitle: topTitle,
      // APB-7: the expanded title and subtitle in the size's styles, from the start.
      expandedTitle: expandedRow && hasTitle
          ? heading(line(widget.title, size.titleTypescale, titleColor, TextAlign.start))
          : null,
      expandedSubtitle: expandedRow && hasTitle && hasSubtitle
          ? text(line(widget.subtitle, size.subtitleTypescale, subtitleColor, TextAlign.start))
          : null,
    );
    // The parts no longer see the system insets the bar has placed them inside.
    bar = MediaQuery.removePadding(
      context: context,
      removeTop: true,
      removeLeft: true,
      removeRight: true,
      child: bar,
    );
    // APB-1, APB-2: the bottom edge over everything, the container and its elevation under it; the
    // container reaches under the top inset (APB-10).
    return DecoratedBox(
      decoration: TanreiContainerDecoration(
        shape: TanreiCornerShape(smoothing: theme.system.shape.cornerSmoothing, radius: _square),
        color: visuals.container.a > 0 ? visuals.container : null,
        border: visuals.elevation.ring,
        boxShadow: visuals.elevation.shadows.isEmpty ? null : visuals.elevation.shadows,
      ),
      child: CustomPaint(
        foregroundPainter: TanreiEdgePainter(
          color: visuals.outline,
          width: tokens.outlineWidth,
          side: TanreiEdgeSide.bottom,
        ),
        child: bar,
      ),
    );
  }
}

/// The bar is flush with the screen's edges: a square container (no corner token exists).
const double _square = 0;

/// APB-13: the most actions a bar holds before the rest belong in an overflow menu.
const int _maxActions = 3;

/// The tokens and insets that place the bar's parts.
@immutable
class _AppBarGeometry {
  const _AppBarGeometry({
    required this.paddingInline,
    required this.gap,
    required this.titleInset,
    required this.blockEnd,
    required this.topHeight,
    required this.expandedHeight,
    required this.expandedRow,
    required this.center,
    required this.collapsed,
    required this.insets,
  });

  final double paddingInline;
  final double gap;
  final double titleInset;
  final double blockEnd;

  /// The top row's minimum height (`container.height.small`).
  final double topHeight;

  /// The expanded bar's minimum height (the size's `container.height`).
  final double expandedHeight;

  /// Whether the title has a row of its own under the top row.
  final bool expandedRow;
  final bool center;

  /// Whether the bar is drawn fully collapsed when nothing else sets its height.
  final bool collapsed;

  /// The system insets the container reaches under and the content stays out of.
  final EdgeInsets insets;

  @override
  bool operator ==(Object other) =>
      other is _AppBarGeometry &&
      other.paddingInline == paddingInline &&
      other.gap == gap &&
      other.titleInset == titleInset &&
      other.blockEnd == blockEnd &&
      other.topHeight == topHeight &&
      other.expandedHeight == expandedHeight &&
      other.expandedRow == expandedRow &&
      other.center == center &&
      other.collapsed == collapsed &&
      other.insets == insets;

  @override
  int get hashCode => Object.hash(
    paddingInline,
    gap,
    titleInset,
    blockEnd,
    topHeight,
    expandedHeight,
    expandedRow,
    center,
    collapsed,
    insets,
  );
}

/// The heights the layout found, top inset included: expanded, and collapsed to the top row.
class _AppBarExtents {
  double expanded = 0;
  double collapsed = 0;
}

enum _AppBarSlot { navigation, actions, topTitle, expandedTitle, expandedSubtitle }

class _AppBarLayout extends SlottedMultiChildRenderObjectWidget<_AppBarSlot, RenderBox> {
  const _AppBarLayout({
    required this.geometry,
    required this.textDirection,
    required this.extents,
    required this.navigation,
    required this.actions,
    required this.topTitle,
    required this.expandedTitle,
    required this.expandedSubtitle,
  });

  final _AppBarGeometry geometry;
  final TextDirection textDirection;
  final _AppBarExtents? extents;
  final Widget? navigation;
  final Widget? actions;
  final Widget? topTitle;
  final Widget? expandedTitle;
  final Widget? expandedSubtitle;

  @override
  Iterable<_AppBarSlot> get slots => _AppBarSlot.values;

  @override
  Widget? childForSlot(_AppBarSlot slot) => switch (slot) {
    _AppBarSlot.navigation => navigation,
    _AppBarSlot.actions => actions,
    _AppBarSlot.topTitle => topTitle,
    _AppBarSlot.expandedTitle => expandedTitle,
    _AppBarSlot.expandedSubtitle => expandedSubtitle,
  };

  @override
  _RenderAppBarLayout createRenderObject(BuildContext context) =>
      _RenderAppBarLayout(geometry: geometry, textDirection: textDirection, extents: extents);

  @override
  void updateRenderObject(BuildContext context, _RenderAppBarLayout renderObject) {
    renderObject
      ..geometry = geometry
      ..textDirection = textDirection
      ..extents = extents;
  }
}

/// The render object that lays out an app bar's parts (APB-4…APB-8), as tests see it: how much of
/// the expanded title the top row covers, and which title assistive technology is given.
abstract interface class RenderTanreiAppBarLayout implements RenderBox {
  /// How much of the expanded title the top row covers, 0 to 1 (1 without an expanded title). The
  /// top row's title is drawn at this opacity (APB-8).
  double get covered;

  /// Whether the top row's title is exposed to assistive technology rather than the expanded one
  /// (APB-12).
  bool get topTitleExposed;
}

class _RenderAppBarLayout extends RenderBox
    with SlottedContainerRenderObjectMixin<_AppBarSlot, RenderBox>
    implements RenderTanreiAppBarLayout {
  _RenderAppBarLayout({
    required _AppBarGeometry geometry,
    required TextDirection textDirection,
    required _AppBarExtents? extents,
  }) : _geometry = geometry,
       _textDirection = textDirection,
       _extents = extents;

  _AppBarGeometry _geometry;
  set geometry(_AppBarGeometry value) {
    if (_geometry != value) {
      _geometry = value;
      markNeedsLayout();
    }
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (_textDirection != value) {
      _textDirection = value;
      markNeedsLayout();
    }
  }

  _AppBarExtents? _extents;
  set extents(_AppBarExtents? value) {
    if (!identical(_extents, value)) {
      _extents = value;
      markNeedsLayout();
    }
  }

  @override
  double get covered => _covered;
  double _covered = 1;

  @override
  bool get topTitleExposed => _topExposed;
  bool _topExposed = true;

  bool _expandedExposed = false;

  /// Where the expanded title is clipped: the bottom of the top row.
  double _clipTop = 0;

  final LayerHandle<OpacityLayer> _opacityLayer = LayerHandle<OpacityLayer>();
  final LayerHandle<ClipRectLayer> _clipLayer = LayerHandle<ClipRectLayer>();

  RenderBox? get _navigation => childForSlot(_AppBarSlot.navigation);
  RenderBox? get _actions => childForSlot(_AppBarSlot.actions);
  RenderBox? get _topTitle => childForSlot(_AppBarSlot.topTitle);
  RenderBox? get _expandedTitle => childForSlot(_AppBarSlot.expandedTitle);
  RenderBox? get _expandedSubtitle => childForSlot(_AppBarSlot.expandedSubtitle);

  /// The parts in reading order.
  List<RenderBox> get _ordered => <RenderBox?>[
    _navigation,
    _topTitle,
    _expandedTitle,
    _expandedSubtitle,
    _actions,
  ].whereType<RenderBox>().toList();

  @override
  void dispose() {
    _opacityLayer.layer = null;
    _clipLayer.layer = null;
    super.dispose();
  }

  static Size _layout(RenderBox? box, BoxConstraints constraints) {
    if (box == null) {
      return Size.zero;
    }
    box.layout(constraints, parentUsesSize: true);
    return box.size;
  }

  static void _place(RenderBox? box, Offset offset) {
    if (box != null) {
      (box.parentData! as BoxParentData).offset = offset;
    }
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      (_navigation?.getMinIntrinsicWidth(height) ?? 0) +
      (_actions?.getMinIntrinsicWidth(height) ?? 0) +
      2 * _geometry.paddingInline +
      _geometry.insets.horizontal;

  @override
  double computeMaxIntrinsicWidth(double height) =>
      computeMinIntrinsicWidth(height) +
      (_topTitle?.getMaxIntrinsicWidth(height) ?? 0) +
      2 * _geometry.gap;

  double _intrinsicHeight(double width) {
    final _AppBarGeometry g = _geometry;
    final double row = <double>[
      g.topHeight,
      _navigation?.getMaxIntrinsicHeight(width) ?? 0,
      _actions?.getMaxIntrinsicHeight(width) ?? 0,
      _topTitle?.getMaxIntrinsicHeight(width) ?? 0,
    ].reduce(math.max);
    if (!g.expandedRow || g.collapsed) {
      return g.insets.top + row;
    }
    final double block =
        (_expandedTitle?.getMaxIntrinsicHeight(width) ?? 0) +
        (_expandedSubtitle?.getMaxIntrinsicHeight(width) ?? 0);
    return g.insets.top + math.max(g.expandedHeight, row + block + g.blockEnd);
  }

  @override
  double computeMinIntrinsicHeight(double width) => _intrinsicHeight(width);

  @override
  double computeMaxIntrinsicHeight(double width) => _intrinsicHeight(width);

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    assert(
      debugCannotComputeDryLayout(
        reason: 'The app bar measures its items and its collapse in layout.',
      ),
    );
    return Size.zero;
  }

  @override
  void performLayout() {
    final _AppBarGeometry g = _geometry;
    final BoxConstraints constraints = this.constraints;
    final bool rtl = _textDirection == TextDirection.rtl;
    // APB-4: the bar spans the full width of its parent.
    final double width = constraints.maxWidth.isFinite
        ? constraints.maxWidth
        : constraints.minWidth;
    final double inner = math.max(0, width - g.insets.horizontal);
    final BoxConstraints loose = BoxConstraints(maxWidth: inner);

    // APB-4, APB-15: the items at their own size.
    final Size navigation = _layout(_navigation, loose);
    final Size actions = _layout(_actions, loose);

    // APB-4, APB-6: the title block after the navigation slot (or at the title inset), up to the
    // actions; centered, it narrows equally on both sides so it never overlaps either.
    final double start = _navigation != null
        ? g.paddingInline + navigation.width + g.gap
        : g.titleInset;
    final double end = _actions != null
        ? inner - g.paddingInline - actions.width - g.gap
        : inner - g.titleInset;
    final double available = math.max(
      0,
      g.center ? 2 * math.min(inner / 2 - start, end - inner / 2) : end - start,
    );
    final Size topTitle = _layout(_topTitle, BoxConstraints(maxWidth: available));

    // APB-4, APB-15: the top row is at least the small height and grows with what it holds.
    final double row = <double>[
      g.topHeight,
      navigation.height,
      actions.height,
      topTitle.height,
    ].reduce(math.max);

    // APB-7: the expanded title row under the top row, the block padding-block-end above the
    // bottom edge; the bar at least the size's height.
    final BoxConstraints block = BoxConstraints(maxWidth: math.max(0, inner - 2 * g.titleInset));
    final Size title = g.expandedRow ? _layout(_expandedTitle, block) : Size.zero;
    final Size subtitle = g.expandedRow ? _layout(_expandedSubtitle, block) : Size.zero;
    final double blockHeight = title.height + subtitle.height;
    final double expanded =
        g.insets.top +
        (g.expandedRow ? math.max(g.expandedHeight, row + blockHeight + g.blockEnd) : row);
    final double collapsed = g.insets.top + row;
    _extents
      ?..expanded = expanded
      ..collapsed = collapsed;

    // APB-8, APB-9: the height the parent gives (a sliver shrinks the bar with its content), else
    // expanded — or collapsed while scrolled.
    final double height = constraints.constrainHeight(g.collapsed ? collapsed : expanded);
    size = constraints.constrain(Size(width, height));

    double x(double logicalStart, double childWidth) =>
        g.insets.left + (rtl ? inner - logicalStart - childWidth : logicalStart);
    double centered(double childHeight) => g.insets.top + (row - childHeight) / 2;

    _place(_navigation, Offset(x(g.paddingInline, navigation.width), centered(navigation.height)));
    _place(
      _actions,
      Offset(x(inner - g.paddingInline - actions.width, actions.width), centered(actions.height)),
    );
    _place(
      _topTitle,
      Offset(
        x(g.center ? (inner - topTitle.width) / 2 : start, topTitle.width),
        centered(topTitle.height),
      ),
    );
    // APB-8: the expanded block moves up with the bottom edge, clipped under the top row.
    final double blockTop = size.height - g.blockEnd - blockHeight;
    _place(_expandedTitle, Offset(x(g.titleInset, title.width), blockTop));
    _place(_expandedSubtitle, Offset(x(g.titleInset, subtitle.width), blockTop + title.height));
    _clipTop = collapsed;

    // APB-8: the top row's title fades in with the part of the expanded title that is covered;
    // APB-12: one title is exposed — the expanded one while any of it is visible.
    final bool hasExpanded = g.expandedRow && _expandedTitle != null && title.height > 0;
    final double covered = hasExpanded
        ? clampDouble((_clipTop - blockTop) / title.height, 0, 1)
        : 1;
    final bool topExposed = !hasExpanded || covered >= 1;
    final bool expandedExposed = hasExpanded && covered < 1;
    if (topExposed != _topExposed || expandedExposed != _expandedExposed) {
      _topExposed = topExposed;
      _expandedExposed = expandedExposed;
      markNeedsSemanticsUpdate();
    }
    _covered = covered;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    void paintChild(RenderBox? child, PaintingContext context, Offset offset) {
      if (child != null) {
        context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
      }
    }

    paintChild(_navigation, context, offset);
    paintChild(_actions, context, offset);
    final RenderBox? topTitle = _topTitle;
    if (topTitle != null) {
      if (_covered >= 1) {
        _opacityLayer.layer = null;
        paintChild(topTitle, context, offset);
      } else if (_covered > 0) {
        _opacityLayer.layer = context.pushOpacity(
          offset,
          Color.getAlphaFromOpacity(_covered),
          (PaintingContext context, Offset offset) => paintChild(topTitle, context, offset),
          oldLayer: _opacityLayer.layer,
        );
      } else {
        _opacityLayer.layer = null;
      }
    }
    if (_expandedExposed) {
      _clipLayer.layer = context.pushClipRect(
        needsCompositing,
        offset,
        Rect.fromLTRB(0, _clipTop, size.width, size.height),
        (PaintingContext context, Offset offset) {
          paintChild(_expandedTitle, context, offset);
          paintChild(_expandedSubtitle, context, offset);
        },
        oldLayer: _clipLayer.layer,
      );
    } else {
      _clipLayer.layer = null;
    }
  }

  @override
  bool hitTestSelf(Offset position) => true;

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final RenderBox child in <RenderBox?>[_actions, _navigation].whereType<RenderBox>()) {
      final BoxParentData data = child.parentData! as BoxParentData;
      final bool hit = result.addWithPaintOffset(
        offset: data.offset,
        position: position,
        hitTest: (BoxHitTestResult result, Offset transformed) =>
            child.hitTest(result, position: transformed),
      );
      if (hit) {
        return true;
      }
    }
    return false;
  }

  @override
  void visitChildrenForSemantics(RenderObjectVisitor visitor) {
    for (final RenderBox child in _ordered) {
      final bool exposed = switch (child) {
        _ when child == _topTitle => _topExposed,
        _ when child == _expandedTitle || child == _expandedSubtitle => _expandedExposed,
        _ => true,
      };
      if (exposed) {
        visitor(child);
      }
    }
  }
}

/// A pinned sliver holding an app bar: the bar shrinks with the scroll offset from its expanded
/// height to its collapsed one and stays at the top of the view (APB-8).
class _SliverAppBar extends SingleChildRenderObjectWidget {
  const _SliverAppBar({
    required this.extents,
    required this.collapsed,
    required this.onScrolled,
    required super.child,
  });

  final _AppBarExtents extents;
  final bool collapsed;
  final ValueChanged<bool> onScrolled;

  @override
  _RenderSliverAppBar createRenderObject(BuildContext context) =>
      _RenderSliverAppBar(extents: extents, collapsed: collapsed, onScrolled: onScrolled);

  @override
  void updateRenderObject(BuildContext context, _RenderSliverAppBar renderObject) {
    renderObject
      ..extents = extents
      ..collapsed = collapsed
      ..onScrolled = onScrolled;
  }
}

class _RenderSliverAppBar extends RenderSliverSingleBoxAdapter {
  _RenderSliverAppBar({
    required _AppBarExtents extents,
    required bool collapsed,
    required this.onScrolled,
  }) : _extents = extents,
       _collapsed = collapsed;

  _AppBarExtents _extents;
  set extents(_AppBarExtents value) {
    if (!identical(_extents, value)) {
      _extents = value;
      markNeedsLayout();
    }
  }

  bool _collapsed;
  set collapsed(bool value) {
    if (_collapsed != value) {
      _collapsed = value;
      markNeedsLayout();
    }
  }

  ValueChanged<bool> onScrolled;
  bool? _scrolled;

  @override
  double childMainAxisPosition(RenderBox child) => 0;

  @override
  void performLayout() {
    final SliverConstraints constraints = this.constraints;
    final RenderBox? child = this.child;
    if (child == null) {
      geometry = SliverGeometry.zero;
      return;
    }
    // The bar's own heights first, then the bar at the height the scroll offset leaves it.
    child.layout(constraints.asBoxConstraints(), parentUsesSize: true);
    final double collapsed = _extents.collapsed;
    final double expanded = _collapsed ? collapsed : _extents.expanded;
    final double height = clampDouble(expanded - constraints.scrollOffset, collapsed, expanded);
    child.layout(
      constraints.asBoxConstraints(minExtent: height, maxExtent: height),
      parentUsesSize: true,
    );
    final double remaining = math.max(0, constraints.remainingPaintExtent - constraints.overlap);
    final double layoutExtent = clampDouble(expanded - constraints.scrollOffset, 0, remaining);
    final double paintExtent = math.min(child.size.height, remaining);
    geometry = SliverGeometry(
      scrollExtent: expanded,
      paintOrigin: constraints.overlap,
      paintExtent: paintExtent,
      layoutExtent: layoutExtent,
      maxPaintExtent: expanded,
      maxScrollObstructionExtent: collapsed,
      cacheExtent: layoutExtent > 0 ? -constraints.cacheOrigin + layoutExtent : layoutExtent,
      hasVisualOverflow: true,
    );
    (child.parentData! as SliverPhysicalParentData).paintOffset =
        switch (applyGrowthDirectionToAxisDirection(
          constraints.axisDirection,
          constraints.growthDirection,
        )) {
          AxisDirection.up => Offset(0, paintExtent - child.size.height),
          _ => Offset.zero,
        };

    // APB-9: scrolled once content lies under the bar — for a bar that collapses, only once it
    // has fully collapsed.
    final bool scrolled =
        constraints.overlap > 0 || constraints.scrollOffset > expanded - collapsed;
    if (scrolled != _scrolled) {
      _scrolled = scrolled;
      SchedulerBinding.instance.addPostFrameCallback((_) => onScrolled(scrolled));
    }
  }
}
