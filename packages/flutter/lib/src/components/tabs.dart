import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Switches between views of the same subject with a row of labelled tabs, one of them selected,
/// above the view it shows.
///
/// Implements `specs/tabs.spec.json` with the idiom of Flutter's `TabBar`, selected by value rather
/// than by a `TabController`'s index:
///
/// * [value] is the spec's `selected`: the value of the selected tab. Null selects the first enabled
///   tab; a value that names no tab selects none and is reported in debug builds (TAB-11);
/// * [onChanged] is the spec's `change`: called once with the value of a tab the user selected
///   (TAB-1). The bar keeps no selection of its own — the owner stores the value and passes it back;
/// * [variant] (`primary`, `secondary`, or a value a design system adds), [isScrollable] (the
///   spec's `scrollable`) and [semanticLabel] (the spec's `label`, the row's accessible name);
/// * [tabs] are [TanreiTab]s (the spec's item kind `tab`).
///
/// The row is one Tab stop, the selected tab; Right and Left Arrow (swapped in a right-to-left
/// layout) move focus to the next and previous enabled tab, wrapping, and Home and End to the first
/// and last; each move selects the tab it reaches (automatic activation, TAB-12). Disabled tabs
/// are skipped (TAB-2).
///
/// The bar draws no background: only the tabs, the active indicator under the selected tab, which
/// slides to a newly selected one (TAB-16, TAB-17), and a divider along the bottom of the whole row
/// (TAB-20). Show the selected tab's view below it with [TanreiTabBarView].
class TanreiTabBar<T> extends StatefulWidget {
  /// Creates a row of [tabs].
  const TanreiTabBar({
    super.key,
    required this.value,
    required this.onChanged,
    this.variant = TanreiTabsVariant.primary,
    this.isScrollable = false,
    this.semanticLabel = '',
    required this.tabs,
  });

  /// The value of the selected tab; null selects the first enabled tab.
  final T? value;

  /// Called with the value of the tab the user selected.
  final ValueChanged<T>? onChanged;

  /// Primary tabs switch the main views of a screen; secondary tabs switch within one of them.
  final TanreiTabsVariant variant;

  /// False divides the row's width equally among the tabs; true sizes each tab to its content and
  /// scrolls the row sideways.
  final bool isScrollable;

  /// The accessible name of the row: what the views are views of.
  final String semanticLabel;

  /// The tabs, in order.
  final List<TanreiTab<T>> tabs;

  @override
  State<TanreiTabBar<T>> createState() => _TanreiTabBarState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('value', value))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(FlagProperty('isScrollable', value: isScrollable, ifTrue: 'scrollable'))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// One tab of a [TanreiTabBar] (the spec's item kind `tab`), as a `Tab` in `TabBar.tabs`:
/// [value] identifies it, [label] is its text and its accessible name — drawn or not
/// ([labelHidden]) — and [icon] an optional glyph, stacked above the label in primary tabs and
/// before it in secondary ones. [enabled] false disables it: it cannot be selected and the arrow
/// keys skip it.
class TanreiTab<T> extends StatefulWidget {
  /// Creates a tab.
  const TanreiTab({
    super.key,
    required this.value,
    required this.label,
    this.icon,
    this.labelHidden = false,
    this.enabled = true,
  });

  /// Identifies the tab: the bar's value names the selected tab by it. Unique within the row.
  final T value;

  /// The tab's text and its accessible name. Required, even when [labelHidden] is true.
  final String label;

  /// The glyph, drawn through the system's icon style (outlined unselected, filled selected).
  final Widget? icon;

  /// Draws the icon alone and keeps [label] as the accessible name.
  final bool labelHidden;

  /// Whether the tab can be selected.
  final bool enabled;

  @override
  State<TanreiTab<T>> createState() => _TanreiTabState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('value', value))
      ..add(StringProperty('label', label))
      ..add(FlagProperty('labelHidden', value: labelHidden, ifTrue: 'label hidden'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'));
  }
}

/// Shows the view of the selected tab below a [TanreiTabBar], as `TabBarView` without swiping:
/// [children] maps each tab's value to its view, and only the view of [value] is built (the others
/// are neither drawn nor exposed to assistive technology). Null shows the first entry, as the bar
/// selects its first enabled tab.
///
/// The view is a `SemanticsRole.tabPanel` node named by [semanticLabels] for the value (the
/// selected tab's label: "named by its tab", TAB-13), and follows the row in reading order. A view
/// with nothing focusable in it is itself focusable, so that Tab moves from the selected tab into
/// it.
class TanreiTabBarView<T> extends StatefulWidget {
  /// Shows the view of [value].
  const TanreiTabBarView({
    super.key,
    required this.value,
    required this.children,
    this.semanticLabels = const <Never, String>{},
  });

  /// The value of the selected tab.
  final T? value;

  /// The view of each tab, by the tab's value.
  final Map<T, Widget> children;

  /// The name of each view: its tab's label.
  final Map<T, String> semanticLabels;

  @override
  State<TanreiTabBarView<T>> createState() => _TanreiTabBarViewState<T>();
}

class _TanreiTabBarViewState<T> extends State<TanreiTabBarView<T>> {
  final FocusNode _panel = FocusNode(debugLabel: 'TanreiTabBarView panel');

  /// Whether the panel itself takes focus: while nothing in it does (TAB-13).
  bool _focusable = true;

  @override
  void dispose() {
    _panel.dispose();
    super.dispose();
  }

  /// TAB-13: the panel takes focus only when nothing in it does. Read after the frame, from the
  /// built tree.
  void _updateFocusability() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      final bool empty = _panel.traversalDescendants.isEmpty;
      _panel
        ..canRequestFocus = empty
        ..skipTraversal = !empty;
      if (empty != _focusable) {
        setState(() => _focusable = empty);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final T? value = widget.value ?? widget.children.keys.firstOrNull;
    final Widget? child = value == null ? null : widget.children[value];
    if (child == null) {
      return const SizedBox.shrink();
    }
    _updateFocusability();
    final String? label = widget.semanticLabels[value];
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.tabPanel,
      label: tanreiIsAccessibleName(label) ? label : null,
      focusable: _focusable,
      focused: _focusable && _panel.hasPrimaryFocus,
      child: Focus(
        focusNode: _panel,
        includeSemantics: false,
        onFocusChange: (_) => setState(() {}),
        child: KeyedSubtree(key: ValueKey<T>(value as T), child: child),
      ),
    );
  }
}

/// What a tab needs from its bar.
abstract interface class _TabHost {
  void select(int index);
  void reveal(int index, {bool immediately});
}

/// The bar's state as each tab sees it.
class _TabBarScope extends InheritedWidget {
  const _TabBarScope({
    required this.host,
    required this.variant,
    required this.scrollable,
    required this.selected,
    required this.count,
    required this.looks,
    required super.child,
  });

  final _TabHost host;
  final TanreiTabsVariant variant;
  final bool scrollable;

  /// The index of the selected tab; -1 for none.
  final int selected;
  final int count;
  final _IndicatorLooks looks;

  @override
  bool updateShouldNotify(_TabBarScope oldWidget) =>
      host != oldWidget.host ||
      variant != oldWidget.variant ||
      scrollable != oldWidget.scrollable ||
      selected != oldWidget.selected ||
      count != oldWidget.count ||
      looks != oldWidget.looks;
}

/// Where one tab is in its row, and the key of its content (what a primary indicator spans).
class _TabSlot extends InheritedWidget {
  const _TabSlot({required this.index, required this.contentKey, required super.child});

  final int index;
  final GlobalKey contentKey;

  @override
  bool updateShouldNotify(_TabSlot oldWidget) =>
      index != oldWidget.index || contentKey != oldWidget.contentKey;
}

/// How one tab's indicator is drawn now: its color (the tab's opacity applied), thickness and
/// corner.
@immutable
class _IndicatorLook {
  const _IndicatorLook({required this.color, required this.thickness, required this.shape});

  final Color color;
  final double thickness;
  final double shape;

  @override
  bool operator ==(Object other) =>
      other is _IndicatorLook &&
      other.color == color &&
      other.thickness == thickness &&
      other.shape == shape;

  @override
  int get hashCode => Object.hash(color, thickness, shape);
}

/// The indicator look of every tab, by index, written by each tab as it builds and read by the
/// bar's indicator layer as it paints.
class _IndicatorLooks extends ChangeNotifier {
  final Map<int, _IndicatorLook> _looks = <int, _IndicatorLook>{};

  _IndicatorLook? operator [](int index) => _looks[index];

  void set(int index, _IndicatorLook look) {
    if (_looks[index] != look) {
      _looks[index] = look;
      notifyListeners();
    }
  }

  void trim(int count) => _looks.removeWhere((int index, _) => index >= count);
}

class _TanreiTabBarState<T> extends State<TanreiTabBar<T>>
    with SingleTickerProviderStateMixin<TanreiTabBar<T>>, TanreiItemGroupMixin<TanreiTabBar<T>>
    implements _TabHost {
  final List<GlobalKey> _tabKeys = <GlobalKey>[];
  final List<GlobalKey> _contentKeys = <GlobalKey>[];
  final _IndicatorLooks _looks = _IndicatorLooks();
  final ScrollController _scroll = ScrollController();
  late final AnimationController _slide = AnimationController(vsync: this, value: 1);
  late final CurvedAnimation _slideCurve = CurvedAnimation(parent: _slide, curve: Curves.linear);

  /// The tab the indicator slides from (-1: none).
  int _from = -1;

  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  @override
  bool get wrapsFocus => true;

  // TAB-12: Right and Left Arrow; nothing is found by typing.
  @override
  Axis get itemAxis => Axis.horizontal;

  @override
  bool get typeaheadEnabled => false;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// TAB-11: the tab [TanreiTabBar.value] selects — the first with that value — or, while it is
  /// null, the first enabled tab; -1 for none.
  int get _selected {
    final List<TanreiTab<T>> tabs = widget.tabs;
    final T? value = widget.value;
    if (value == null) {
      return tabs.indexWhere((TanreiTab<T> tab) => tab.enabled);
    }
    return tabs.indexWhere((TanreiTab<T> tab) => tab.value == value);
  }

  @override
  void initState() {
    super.initState();
    // TAB-15: when the row first appears with its selected tab out of view, it scrolls there at
    // once, with no animation.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        reveal(_selected, immediately: true);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiTabsTokens tokens = TanreiTheme.of(context).system.tabs;
    _slide.duration = tanreiDuration(tokens.motionIndicatorDuration);
    _slideCurve.curve = tokens.motionIndicatorEasing.toCurve();
  }

  @override
  void didUpdateWidget(TanreiTabBar<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    final int before = _indexIn(oldWidget);
    final int after = _selected;
    if (before != after) {
      // TAB-17: the indicator slides from the old tab to the new one; at once where motion is
      // reduced, or when there was none.
      if (before >= 0 && after >= 0 && !_reduceMotion) {
        _from = before;
        _slide.forward(from: _slide.lowerBound);
      } else {
        _from = -1;
        _slide.value = _slide.upperBound;
      }
      scheduleTabStops();
      if (after >= 0) {
        // TAB-15: a newly selected tab scrolls into view.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            reveal(after);
          }
        });
      }
    }
  }

  int _indexIn(TanreiTabBar<T> bar) {
    final T? value = bar.value;
    return value == null
        ? bar.tabs.indexWhere((TanreiTab<T> tab) => tab.enabled)
        : bar.tabs.indexWhere((TanreiTab<T> tab) => tab.value == value);
  }

  @override
  void dispose() {
    _slideCurve.dispose();
    _slide.dispose();
    _scroll.dispose();
    _looks.dispose();
    super.dispose();
  }

  // TAB-1: an enabled tab that is not selected is selected, and change emitted once.
  @override
  void select(int index) {
    if (index < 0 || index >= widget.tabs.length || index == _selected) {
      return;
    }
    final TanreiTab<T> tab = widget.tabs[index];
    if (tab.enabled) {
      widget.onChanged?.call(tab.value);
    }
  }

  // TAB-15: scroll the row until the whole tab is visible, over the indicator's motion ([immediately]
  // when the row first appears).
  @override
  void reveal(int index, {bool immediately = false}) {
    if (!widget.isScrollable || !_scroll.hasClients || index < 0 || index >= _tabKeys.length) {
      return;
    }
    final RenderObject? box = _tabKeys[index].currentContext?.findRenderObject();
    if (box is! RenderBox || !box.attached || !box.hasSize) {
      return;
    }
    final RenderAbstractViewport viewport = RenderAbstractViewport.of(box);
    final ScrollPosition position = _scroll.position;
    final double leading = viewport.getOffsetToReveal(box, 0).offset;
    final double trailing = viewport.getOffsetToReveal(box, 1).offset;
    final double target = position.pixels
        .clamp(math.min(leading, trailing), math.max(leading, trailing))
        .clamp(position.minScrollExtent, position.maxScrollExtent)
        .toDouble();
    if (target == position.pixels) {
      return;
    }
    if (immediately || _reduceMotion) {
      position.jumpTo(target);
    } else {
      final TanreiTabsTokens tokens = TanreiTheme.of(context).system.tabs;
      position.animateTo(
        target,
        duration: tanreiDuration(tokens.motionIndicatorDuration),
        curve: tokens.motionIndicatorEasing.toCurve(),
      );
    }
  }

  // TAB-12: the selected tab is the one Tab stop (TAB-2: never a disabled one; the first enabled
  // tab then).
  @override
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) {
    if (items.isEmpty) {
      return null;
    }
    final int selected = _selected;
    return items
            .whereType<_TanreiTabState<Object?>>()
            .where((_TanreiTabState<Object?> tab) => tab.index == selected)
            .firstOrNull ??
        items.first;
  }

  // TAB-12: automatic activation — the tab focus moves to is selected.
  @override
  void focusItem(TanreiGroupItem item) {
    super.focusItem(item);
    if (item is _TanreiTabState<Object?>) {
      select(item.index);
    }
  }

  void _syncKeys() {
    final int count = widget.tabs.length;
    while (_tabKeys.length < count) {
      _tabKeys.add(GlobalKey(debugLabel: 'TanreiTab ${_tabKeys.length}'));
      _contentKeys.add(GlobalKey(debugLabel: 'TanreiTab content ${_contentKeys.length}'));
    }
    if (_tabKeys.length > count) {
      _tabKeys.removeRange(count, _tabKeys.length);
      _contentKeys.removeRange(count, _contentKeys.length);
    }
    _looks.trim(count);
  }

  /// TAB-11: in debug builds, report a value that names no tab, and a tab whose value is empty or
  /// repeats another's — once for each state of the bar that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[];
      final Set<T> seen = <T>{};
      for (final TanreiTab<T> tab in widget.tabs) {
        final T value = tab.value;
        if (value == null || value == '') {
          problems.add('A tab ("${tab.label}") has no value: nothing can select it by value.');
        } else if (!seen.add(value)) {
          problems.add(
            'Two tabs have the value "$value": the first is the one it selects, and change '
            'cannot tell them apart.',
          );
        }
      }
      if (widget.value != null && _selected < 0) {
        problems.add('The value "${widget.value}" names no tab: none is selected.');
      }
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('tabs', 'value', problem, widget);
        }
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    _syncKeys();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTabsTokens tokens = theme.system.tabs;
    final int selected = _selected;
    if (_from >= widget.tabs.length) {
      _from = -1;
    }
    final List<Widget> slots = <Widget>[
      for (int i = 0; i < widget.tabs.length; i++)
        _TabSlot(
          index: i,
          contentKey: _contentKeys[i],
          child: KeyedSubtree(key: _tabKeys[i], child: widget.tabs[i]),
        ),
    ];

    // TAB-14: fixed tabs share the width equally and grow to the tallest; scrollable ones are as
    // wide as their content. Every tab of a row is as tall as the tallest.
    Widget row = IntrinsicHeight(
      child: Row(
        mainAxisSize: widget.isScrollable ? MainAxisSize.min : MainAxisSize.max,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: widget.isScrollable
            ? slots
            : <Widget>[for (final Widget slot in slots) Expanded(child: slot)],
      ),
    );
    // TAB-16, TAB-17: the indicator, over the tabs, sliding between them.
    row = _TabIndicatorLayer(
      tabKeys: List<GlobalKey>.of(_tabKeys),
      contentKeys: List<GlobalKey>.of(_contentKeys),
      selected: selected,
      from: _from,
      slide: _slideCurve,
      // Primary (and a value the system does not have, drawn as primary) spans the content.
      spansContent: widget.variant != TanreiTabsVariant.secondary,
      looks: _looks,
      child: row,
    );
    // TAB-13: the tab list, named by the row's label; its children are the tabs.
    row = Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.tabBar,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: buildItemGroup(
        child: _TabBarScope(
          host: this,
          variant: widget.variant,
          scrollable: widget.isScrollable,
          selected: selected,
          count: widget.tabs.length,
          looks: _looks,
          child: row,
        ),
      ),
    );
    if (widget.isScrollable) {
      // TAB-14, TAB-21: from the start edge (the right one in a right-to-left layout), scrolling
      // sideways when wider than the room.
      row = SingleChildScrollView(
        controller: _scroll,
        scrollDirection: Axis.horizontal,
        child: row,
      );
    }
    // TAB-20: the divider along the bottom of the whole row, under the tabs and the indicator,
    // across the row's full width even while it scrolls; not exposed.
    return Stack(
      children: <Widget>[
        PositionedDirectional(
          start: 0,
          end: 0,
          bottom: 0,
          height: tokens.dividerThickness,
          child: ExcludeSemantics(child: ColoredBox(color: theme.paint(tokens.dividerColor))),
        ),
        Align(alignment: AlignmentDirectional.centerStart, heightFactor: 1, child: row),
      ],
    );
  }
}

/// Paints the active indicator over the row of tabs: under the selected tab (sliding from the
/// previous one while [slide] runs) in the selected tab's look, and under any other tab whose own
/// look draws one. It spans the tab's content when [spansContent] (primary) and the whole tab
/// otherwise, on the bottom edge of the row, its corners away from the edge rounded.
class _TabIndicatorLayer extends SingleChildRenderObjectWidget {
  const _TabIndicatorLayer({
    required this.tabKeys,
    required this.contentKeys,
    required this.selected,
    required this.from,
    required this.slide,
    required this.spansContent,
    required this.looks,
    super.child,
  });

  final List<GlobalKey> tabKeys;
  final List<GlobalKey> contentKeys;
  final int selected;
  final int from;
  final Animation<double> slide;
  final bool spansContent;
  final _IndicatorLooks looks;

  @override
  _RenderTabIndicator createRenderObject(BuildContext context) => _RenderTabIndicator(
    tabKeys: tabKeys,
    contentKeys: contentKeys,
    selected: selected,
    from: from,
    slide: slide,
    spansContent: spansContent,
    looks: looks,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderTabIndicator renderObject) {
    renderObject
      .._tabKeys = tabKeys
      .._contentKeys = contentKeys
      ..selected = selected
      ..from = from
      ..slide = slide
      ..spansContent = spansContent
      ..looks = looks;
  }
}

/// The render object that draws a [TanreiTabBar]'s active indicator, as tests see it: where the
/// selected tab's indicator is drawn now.
abstract interface class RenderTanreiTabIndicator implements RenderObject {
  /// The selected tab's indicator in this render object's coordinates (null: none is drawn).
  Rect? get indicatorRect;
}

class _RenderTabIndicator extends RenderProxyBox implements RenderTanreiTabIndicator {
  _RenderTabIndicator({
    required List<GlobalKey> tabKeys,
    required List<GlobalKey> contentKeys,
    required int selected,
    required int from,
    required Animation<double> slide,
    required bool spansContent,
    required _IndicatorLooks looks,
  }) : _tabKeys = tabKeys,
       _contentKeys = contentKeys,
       _selected = selected,
       _from = from,
       _slide = slide,
       _spansContent = spansContent,
       _looks = looks;

  List<GlobalKey> _tabKeys;
  List<GlobalKey> _contentKeys;

  int _selected;
  set selected(int value) => _repaint(_selected != value, () => _selected = value);

  int _from;
  set from(int value) => _repaint(_from != value, () => _from = value);

  bool _spansContent;
  set spansContent(bool value) => _repaint(_spansContent != value, () => _spansContent = value);

  Animation<double> _slide;
  set slide(Animation<double> value) {
    if (_slide != value) {
      if (attached) {
        _slide.removeListener(markNeedsPaint);
        value.addListener(markNeedsPaint);
      }
      _slide = value;
      markNeedsPaint();
    }
  }

  _IndicatorLooks _looks;
  set looks(_IndicatorLooks value) {
    if (_looks != value) {
      if (attached) {
        _looks.removeListener(markNeedsPaint);
        value.addListener(markNeedsPaint);
      }
      _looks = value;
      markNeedsPaint();
    }
  }

  void _repaint(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsPaint();
    }
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _slide.addListener(markNeedsPaint);
    _looks.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _slide.removeListener(markNeedsPaint);
    _looks.removeListener(markNeedsPaint);
    super.detach();
  }

  /// The horizontal extent of the tab at [index], in this box's coordinates: its content's
  /// (primary) or its own (secondary); null when it is not laid out.
  ({double left, double right})? _extentOf(int index) {
    if (index < 0 || index >= _tabKeys.length) {
      return null;
    }
    final RenderObject? tab = _tabKeys[index].currentContext?.findRenderObject();
    final RenderObject? content = _contentKeys[index].currentContext?.findRenderObject();
    final RenderObject? measured = _spansContent && content is RenderBox ? content : tab;
    if (measured is! RenderBox || !measured.hasSize || !measured.attached) {
      return null;
    }
    final Rect rect = MatrixUtils.transformRect(
      measured.getTransformTo(this),
      Offset.zero & measured.size,
    );
    return (left: rect.left, right: rect.right);
  }

  @override
  Rect? get indicatorRect {
    final _IndicatorLook? look = _looks[_selected];
    final ({double left, double right})? to = _extentOf(_selected);
    if (look == null || to == null) {
      return null;
    }
    double left = to.left;
    double right = to.right;
    final ({double left, double right})? from = _from == _selected ? null : _extentOf(_from);
    final double t = _slide.value;
    if (from != null && t < 1) {
      left = lerpDouble(from.left, to.left, t)!;
      right = lerpDouble(from.right, to.right, t)!;
    }
    return Rect.fromLTRB(left, size.height - look.thickness, right, size.height);
  }

  void _paintBar(Canvas canvas, Offset offset, Rect rect, _IndicatorLook look) {
    if (look.color.a <= 0 || rect.isEmpty) {
      return;
    }
    // TAB-16: the corners that face away from the divider, rounded.
    final double radius = math.max(0, math.min(look.shape, math.min(rect.height, rect.width / 2)));
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        rect.shift(offset),
        topLeft: Radius.circular(radius),
        topRight: Radius.circular(radius),
      ),
      Paint()..color = look.color,
    );
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    super.paint(context, offset);
    final Canvas canvas = context.canvas;
    for (int i = 0; i < _tabKeys.length; i++) {
      final _IndicatorLook? look = _looks[i];
      final ({double left, double right})? extent = i == _selected ? null : _extentOf(i);
      if (look != null && extent != null) {
        _paintBar(
          canvas,
          offset,
          Rect.fromLTRB(extent.left, size.height - look.thickness, extent.right, size.height),
          look,
        );
      }
    }
    final _IndicatorLook? look = _looks[_selected];
    final Rect? rect = indicatorRect;
    if (look != null && rect != null) {
      _paintBar(canvas, offset, rect, look);
    }
  }
}

/// How a tab looks in one state and condition.
@immutable
class _TabVisuals {
  const _TabVisuals({
    required this.container,
    required this.label,
    required this.icon,
    required this.ownIndicator,
    required this.selectedIndicator,
    required this.indicatorThickness,
    required this.indicatorShape,
    required this.opacity,
  });

  final Color container;
  final Color label;
  final Color icon;

  /// The indicator of this tab while it is not selected (none in every shipped system).
  final Color ownIndicator;

  /// The indicator of this tab while it is selected.
  final Color selectedIndicator;
  final double indicatorThickness;
  final double indicatorShape;
  final double opacity;

  static _TabVisuals lerp(_TabVisuals a, _TabVisuals b, double t) => _TabVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    label: tanreiLerpColor(a.label, b.label, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    ownIndicator: tanreiLerpColor(a.ownIndicator, b.ownIndicator, t),
    selectedIndicator: tanreiLerpColor(a.selectedIndicator, b.selectedIndicator, t),
    indicatorThickness: lerpDouble(a.indicatorThickness, b.indicatorThickness, t)!,
    indicatorShape: lerpDouble(a.indicatorShape, b.indicatorShape, t)!,
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

/// A resting tab is not dimmed.
const double _opaque = 1;

class _TanreiTabState<T> extends State<TanreiTab<T>>
    with
        TickerProviderStateMixin<TanreiTab<T>>,
        TanreiPressableStateMixin<TanreiTab<T>, _TabVisuals>,
        TanreiSelectionTransitionMixin<TanreiTab<T>, _TabVisuals>
    implements TanreiGroupItem {
  _TabBarScope? _scope;
  _TabSlot? _slot;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  final FocusNode _focusNode = FocusNode(debugLabel: 'TanreiTab');
  bool _reportedHiddenLabel = false;

  /// Where the tab is in its row (-1 outside a bar).
  int get index => _slot?.index ?? -1;

  bool get _selected => _scope != null && _scope!.selected == index;

  @override
  FocusNode get focusNode => _focusNode;

  @override
  String get typeaheadText => widget.label;

  // TAB-2: the arrow keys skip a disabled tab.
  @override
  bool get takesFocus => widget.enabled;

  TanreiTabsTokens get _tokens => TanreiTheme.of(context).system.tabs;

  @override
  VoidCallback? get onPressed => widget.enabled ? () => _scope?.host.select(index) : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // TAB-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _TabVisuals lerpVisuals(_TabVisuals a, _TabVisuals b, double t) => _TabVisuals.lerp(a, b, t);

  // TAB-23: becoming selected or not eases over the state motion.
  @override
  Object get selectionCondition => _selected;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Curve get selectionCurve => _tokens.motionStateEasing.toCurve();

  @override
  _TabVisuals lerpSelection(_TabVisuals a, _TabVisuals b, double t) => _TabVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
    _focusNode.addListener(_handleFocus);
  }

  // TAB-15: a tab that receives focus scrolls into view.
  void _handleFocus() {
    if (_focusNode.hasPrimaryFocus) {
      _scope?.host.reveal(index);
    }
  }

  @override
  void didChangeDependencies() {
    // The bar first: the mixins read the selection.
    _scope = context.dependOnInheritedWidgetOfExactType<_TabBarScope>();
    _slot = context.dependOnInheritedWidgetOfExactType<_TabSlot>();
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      _group?.unregisterItem(this);
      _group = group;
      _group?.registerItem(this);
    }
    super.didChangeDependencies();
  }

  @override
  void didUpdateWidget(TanreiTab<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.enabled != widget.enabled) {
      _group?.scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _focusNode.removeListener(_handleFocus);
    _group?.unregisterItem(this);
    _focusNode.dispose();
    super.dispose();
  }

  /// TAB-22: an empty label is reported in debug builds — when first built so, and when it loses
  /// the one it had.
  void _debugReportMissingName(TanreiTab<T>? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.label)) &&
          !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('tab', widget);
      }
      return true;
    }());
  }

  /// TAB-19: a hidden label without an icon is drawn anyway, and reported once.
  void _debugReportHiddenLabel(bool ignored) {
    assert(() {
      if (ignored && !_reportedHiddenLabel) {
        debugTanreiReportIgnoredValue(
          'tabs',
          'labelHidden',
          'A tab without an icon cannot hide its label: nothing else would be drawn, so the label '
              'is drawn.',
          widget,
        );
      }
      _reportedHiddenLabel = ignored;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTabsTokens tokens = theme.system.tabs;
    final TanreiTabsVariant variantKey = _scope?.variant ?? TanreiTabsVariant.primary;
    final TanreiTabsVariantTokens variant = tokens.variants[variantKey];
    final bool selected = _selected;
    final bool scrollable = _scope?.scrollable ?? false;
    final TanreiTabsVariantStateTokens drawn = variant.of(drawnState);
    final TanreiTabsVariantStateTokens container = variant.of(containerState);
    final TanreiTabsStateTokens? state = tokens.stateTokens(drawnState);

    // TAB-3, TAB-6, TAB-9, TAB-11: the drawn state's tokens of the look (selected. or plain), the
    // container of the state the pressed feedback names; TAB-23: changes ease.
    final _TabVisuals visuals = animateVisuals(
      animateSelection(
        _TabVisuals(
          container: theme.paint(
            selected ? container.selectedContainerColor : container.containerColor,
          ),
          label: theme.paint(selected ? drawn.selectedLabelColor : drawn.labelColor),
          icon: theme.paint(selected ? drawn.selectedIconColor : drawn.iconColor),
          ownIndicator: theme.paint(drawn.activeIndicatorColor),
          selectedIndicator: theme.paint(drawn.selectedActiveIndicatorColor),
          indicatorThickness: drawn.activeIndicatorThickness,
          indicatorShape: drawn.activeIndicatorShape,
          opacity: state?.opacity ?? _opaque,
        ),
      ),
    );
    // TAB-16: the indicator the bar draws for this tab, dimmed with it.
    final Color indicator = selected ? visuals.selectedIndicator : visuals.ownIndicator;
    if (index >= 0) {
      _scope?.looks.set(
        index,
        _IndicatorLook(
          color: indicator.withValues(alpha: indicator.a * visuals.opacity),
          thickness: visuals.indicatorThickness,
          shape: visuals.indicatorShape,
        ),
      );
    }

    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );

    // TAB-19: a hidden label needs an icon to stand for it.
    final Widget? icon = widget.icon;
    final bool labelDrawn = !widget.labelHidden || icon == null;
    _debugReportHiddenLabel(widget.labelHidden && icon == null);
    final bool stacked = variantKey != TanreiTabsVariant.secondary && icon != null && labelDrawn;

    // TAB-14, TAB-18: the label in the label style, wrapping in fixed rows and on one line in
    // scrollable ones; the icon through the icon helper with the tab's selection.
    final Widget? label = labelDrawn
        ? Text(
            widget.label,
            style: tokens.labelTypescale.toTextStyle(color: visuals.label),
            textAlign: TextAlign.center,
            softWrap: !scrollable,
            maxLines: scrollable ? 1 : null,
            textWidthBasis: TextWidthBasis.longestLine,
          )
        : null;
    final Widget? glyph = icon == null
        ? null
        : TanreiControlIcon(
            icon: icon,
            size: tokens.iconSize,
            selected: selected,
            color: visuals.icon,
          );
    final Widget content = ExcludeSemantics(
      child: KeyedSubtree(
        key: _slot?.contentKey,
        child: switch ((glyph, label)) {
          (final Widget glyph, final Widget label) when stacked => Column(
            mainAxisSize: MainAxisSize.min,
            spacing: tokens.containerGap,
            children: <Widget>[glyph, label],
          ),
          (final Widget glyph, final Widget label) => Row(
            mainAxisSize: MainAxisSize.min,
            spacing: tokens.containerGap,
            children: <Widget>[
              glyph,
              Flexible(child: label),
            ],
          ),
          (final Widget glyph, null) => glyph,
          (null, final Widget label) => label,
          (null, null) => const SizedBox.shrink(),
        },
      ),
    );

    // TAB-5, TAB-18: at least the tab height (with a stacked icon, the taller one) and the touch
    // target on both axes, since a hit area cannot extend over the neighbours or the panel.
    final double target = theme.system.measure.targetTouch;
    final Widget body = ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: target,
        minHeight: math.max(
          target,
          stacked ? tokens.containerHeightWithIcon : tokens.containerHeight,
        ),
      ),
      child: Padding(
        // The content keeps clear of the indicator on the bottom edge (and, to stay centered, of
        // as much at the top) when a wrapping label makes it taller than the tab.
        padding: EdgeInsetsDirectional.symmetric(
          horizontal: tokens.containerPaddingInline,
          vertical: variant.enabled.activeIndicatorThickness,
        ),
        child: Center(widthFactor: 1, heightFactor: 1, child: content),
      ),
    );

    final Widget tab = buildPressable(
      focusNode: _focusNode,
      child: Opacity(
        opacity: visuals.opacity,
        // TAB-4, TAB-10: the focus ring inside the tab, which a scrolling row would clip outside.
        child: TanreiFocusRing(
          visible: isKeyboardFocused,
          inside: true,
          borderRadius: BorderRadius.circular(shape.radius),
          child: DecoratedBox(
            key: pressContainerKey,
            decoration: TanreiContainerDecoration(
              shape: shape,
              color: visuals.container.a > 0 ? visuals.container : null,
              ripple: rippleFor(
                pressedContainer: () {
                  final TanreiTabsVariantStateTokens pressed = variant.of(interactionState);
                  return theme.paint(
                    selected ? pressed.selectedContainerColor : pressed.containerColor,
                  );
                },
                container: visuals.container,
              ),
            ),
            child: body,
          ),
        ),
      ),
    );

    // TAB-13: the tab role with its selected state, named by its label drawn or not. (Flutter
    // exposes no position in the row or count of tabs.)
    return Semantics(
      container: true,
      role: SemanticsRole.tab,
      selected: selected,
      enabled: widget.enabled,
      label: tanreiIsAccessibleName(widget.label) ? widget.label : null,
      child: tab,
    );
  }
}
