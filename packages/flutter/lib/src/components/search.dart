import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show SemanticsInputType, SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_row.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../primitives/tap_target.dart';
import '../primitives/text_direction.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'icon_button.dart';

/// The query of a [TanreiSearch] and whether its view is open: a [TextEditingController] that also
/// holds [isExpanded], as Material's `SearchController` does.
///
/// The search updates it itself — it expands when the person presses the bar, types or presses
/// Down Arrow (SRC-5) and collapses for the reasons of SRC-6 — and a product may call [expand] and
/// [collapse] too; a change the product makes emits no `onExpandedChanged`, as setting the text
/// emits no `onChanged`.
class TanreiSearchController extends TextEditingController {
  /// Creates a controller with an initial query.
  TanreiSearchController({super.text});

  bool _expanded = false;

  /// Whether the view is open (the spec's `expanded`).
  bool get isExpanded => _expanded;

  /// Opens the view.
  void expand() {
    if (!_expanded) {
      _expanded = true;
      notifyListeners();
    }
  }

  /// Closes the view; the query stays as it is.
  void collapse() {
    if (_expanded) {
      _expanded = false;
      notifyListeners();
    }
  }
}

/// Where a [TanreiSearch] opens its view (the spec's `presentation`).
enum TanreiSearchPresentation {
  /// Under the bar, in the overlay (a large screen).
  docked,

  /// Over the whole window, with a header of its own (a small screen). The spec's `full-screen`.
  fullScreen;

  /// The value the spec names [name] (`docked` or `full-screen`), for a prop that arrives as text. An
  /// unknown name is [docked], reported in debug builds (SRC-27).
  static TanreiSearchPresentation fromName(String name) {
    switch (name) {
      case 'docked':
        return docked;
      case 'full-screen':
        return fullScreen;
    }
    assert(() {
      debugTanreiReportUnknownValue('search presentation', name, 'docked');
      return true;
    }());
    return docked;
  }
}

/// Why a [TanreiSearch] closed its view (SRC-6).
enum TanreiSearchCloseReason {
  /// Escape.
  escape,

  /// The platform's back, or the full-screen view's back button.
  back,

  /// A suggestion was chosen.
  select,

  /// The query was submitted.
  submit,

  /// A press outside the bar and the docked view.
  outside,

  /// Tab or Shift+Tab in a docked search.
  tab,

  /// Focus left a docked search some other way (the spec's `focus-out`).
  focusOut,
}

/// Called when a [TanreiSearch] asks to open (`true`, no reason) or close its view (the spec's
/// `toggle`).
typedef TanreiSearchExpandedChanged = void Function(bool expanded, TanreiSearchCloseReason? reason);

/// A suggestion of a [TanreiSearch] (the spec's item kind `suggestion`): a query the person searched
/// before, a completion, or a result the product can open.
@immutable
class TanreiSearchSuggestion {
  /// Describes a suggestion.
  const TanreiSearchSuggestion({
    required this.value,
    required this.headline,
    this.supportingText = '',
    this.leadingIcon = '',
  });

  /// Identifies the suggestion; `onSelected` carries it. Unique among the suggestions.
  final String value;

  /// Its text and accessible name.
  final String headline;

  /// A second line under the headline, and its description.
  final String supportingText;

  /// The glyph at the row's start: its name (a ligature) or code point in the system's icon font,
  /// drawn as text; empty for none.
  final String leadingIcon;

  @override
  bool operator ==(Object other) =>
      other is TanreiSearchSuggestion &&
      other.value == value &&
      other.headline == headline &&
      other.supportingText == supportingText &&
      other.leadingIcon == leadingIcon;

  @override
  int get hashCode => Object.hash(value, headline, supportingText, leadingIcon);
}

/// A search bar that opens a view of suggestions, docked below the bar or over the whole window.
///
/// Implements `specs/search.spec.json` with the idiom of Material's `SearchAnchor` and
/// `SearchController`, without Material:
///
/// * [controller] (a [TanreiSearchController]) holds the query (the spec's `value`) and whether
///   the view is open (`expanded`); the search updates it itself and reports the change through
///   [onExpandedChanged] with its reason (the spec's `toggle`);
/// * [onChanged] (`input`) is every edit the person makes — typing, the clear button, Escape — and
///   never a value the product sets; [onSubmitted] (`submit`) the action key with no suggestion
///   active; [onSelected] (`select`) a suggestion chosen, with its value (the query is left for
///   the product to set);
/// * [semanticLabel] (`label`) names the field, its suggestions and the full-screen view;
///   [hintText] (`placeholder`) is drawn in the empty input and is never the name; [enabled] false
///   is the spec's `disabled`; [clearLabel] and [backLabel] name the built-in buttons;
/// * [leading] and [trailing] are the product's icon buttons in the bar; [suggestions] are the
///   rows of the view and [child] the product's own content after them.
///
/// The input is an `EditableText` with the search action and the search input type; it edits as
/// `TanreiTextField` does. The docked view is drawn through an `OverlayPortal` and keeps focus in
/// the input (the combobox pattern: Down and Up Arrow make a suggestion active, Enter chooses it).
/// The full-screen view is a modal route that scopes semantics and returns focus to the bar.
/// [inPlace] draws the open view where the search is built, for baselines and galleries.
///
/// Every design value comes from `TanreiTheme.of(context).system.search`; the selection highlight
/// is `system.textField.selectionColor`, the product's one selection color for text entry.
class TanreiSearch extends StatefulWidget {
  /// Creates a search.
  const TanreiSearch({
    super.key,
    required this.controller,
    required this.semanticLabel,
    this.presentation = TanreiSearchPresentation.docked,
    this.hintText = '',
    this.enabled = true,
    this.clearLabel = '',
    this.backLabel = '',
    this.onChanged,
    this.onSubmitted,
    this.onSelected,
    this.onExpandedChanged,
    this.leading,
    this.trailing = const <Widget>[],
    this.suggestions = const <TanreiSearchSuggestion>[],
    this.child,
    this.focusNode,
    this.inPlace = false,
  });

  /// The query and whether the view is open.
  final TanreiSearchController controller;

  /// Names the field, its suggestions and the full-screen view. Never drawn. Required.
  final String semanticLabel;

  /// Where the view opens.
  final TanreiSearchPresentation presentation;

  /// A hint shown while the query is empty (the spec's `placeholder`).
  final String hintText;

  /// Whether the search can be focused, edited and opened.
  final bool enabled;

  /// The clear button's accessible name ("Clear search"). Required while the button can show.
  final String clearLabel;

  /// The full-screen view's back button's accessible name ("Back"). Required for full-screen.
  final String backLabel;

  /// Every change the person makes to the query (the spec's `input`).
  final ValueChanged<String>? onChanged;

  /// The action key with no suggestion active (the spec's `submit`).
  final ValueChanged<String>? onSubmitted;

  /// A suggestion was chosen, with its value (the spec's `select`).
  final ValueChanged<String>? onSelected;

  /// The search asks to open or close its view (the spec's `toggle`).
  final TanreiSearchExpandedChanged? onExpandedChanged;

  /// An icon button at the bar's start, in place of the search glyph.
  final Widget? leading;

  /// Up to two icon buttons at the bar's end, after the clear button.
  final List<Widget> trailing;

  /// The suggestions, in order.
  final List<TanreiSearchSuggestion> suggestions;

  /// The product's own content in the view, after the suggestions.
  final Widget? child;

  /// An optional focus node for the bar's input.
  final FocusNode? focusNode;

  /// Draws the open view where the search is built (docked: under the bar; full-screen: the view
  /// alone, filling the space given), with no overlay or route: for baselines and galleries.
  final bool inPlace;

  @override
  State<TanreiSearch> createState() => _TanreiSearchState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('semanticLabel', semanticLabel))
      ..add(EnumProperty<TanreiSearchPresentation>('presentation', presentation))
      ..add(StringProperty('hintText', hintText, defaultValue: ''))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(IntProperty('suggestions', suggestions.length))
      ..add(FlagProperty('inPlace', value: inPlace, ifTrue: 'in place'));
  }
}

/// How the bar looks in its state (SRC-18): its tokens, evaluated in the scheme.
@immutable
class _BarVisuals {
  const _BarVisuals({
    required this.container,
    required this.elevation,
    required this.outline,
    required this.outlineWidth,
    required this.glyph,
    required this.input,
    required this.placeholder,
    required this.caret,
    required this.opacity,
  });

  final Color container;
  final TanreiResolvedElevation elevation;
  final Color outline;
  final double outlineWidth;
  final Color glyph;
  final Color input;
  final Color placeholder;
  final Color caret;
  final double opacity;

  static _BarVisuals lerp(_BarVisuals a, _BarVisuals b, double t) => _BarVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
    outline: tanreiLerpColor(a.outline, b.outline, t),
    outlineWidth: lerpDouble(a.outlineWidth, b.outlineWidth, t)!,
    glyph: tanreiLerpColor(a.glyph, b.glyph, t),
    input: tanreiLerpColor(a.input, b.input, t),
    placeholder: tanreiLerpColor(a.placeholder, b.placeholder, t),
    caret: tanreiLerpColor(a.caret, b.caret, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

/// The bar's taps: the text field's own (the caret, the selection, the keyboard), and SRC-5's
/// expansion on a press.
class _BarGestures extends TextSelectionGestureDetectorBuilder {
  _BarGestures(this._search) : super(delegate: _search);

  final _TanreiSearchState _search;

  @override
  void onUserTap() {
    super.onUserTap();
    _search._handleBarTap();
  }
}

/// Stops the enclosing route from popping while a docked view is open: the platform's back closes
/// the view instead (SRC-6), as for a menu.
class _SearchPopEntry extends PopEntry<Object?> {
  _SearchPopEntry(this.onBack);

  final VoidCallback onBack;
  final ValueNotifier<bool> _canPop = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get canPopNotifier => _canPop;

  @override
  void onPopInvokedWithResult(bool didPop, Object? result) {
    if (!didPop) {
      scheduleMicrotask(onBack);
    }
  }

  void dispose() => _canPop.dispose();
}

class _TanreiSearchState extends State<TanreiSearch>
    with
        TickerProviderStateMixin<TanreiSearch>,
        TanreiPressableStateMixin<TanreiSearch, _BarVisuals>,
        WidgetsBindingObserver
    implements TextSelectionGestureDetectorBuilderDelegate {
  @override
  final GlobalKey<EditableTextState> editableTextKey = GlobalKey<EditableTextState>();

  final GlobalKey<EditableTextState> _headerKey = GlobalKey<EditableTextState>();

  @override
  bool get forcePressEnabled => false;

  @override
  bool get selectionEnabled => widget.enabled;

  late final _BarGestures _gestures = _BarGestures(this);
  FocusNode? _ownNode;
  late final FocusNode _headerNode = FocusNode(
    debugLabel: 'TanreiSearch header',
    onKeyEvent: _handleKey,
  );
  final OverlayPortalController _overlay = OverlayPortalController(debugLabel: 'TanreiSearch');
  late final AnimationController _view = AnimationController(vsync: this)
    ..addStatusListener(_handleViewStatus);
  late final CurvedAnimation _viewCurve = CurvedAnimation(parent: _view, curve: Curves.linear);
  final ValueNotifier<int> _viewChanges = ValueNotifier<int>(0);
  late final _SearchPopEntry _popEntry = _SearchPopEntry(
    () => _requestCollapse(TanreiSearchCloseReason.back),
  );
  ModalRoute<Object?>? _popRoute;
  _SearchViewRoute? _route;
  final List<ScrollPosition> _scrolls = <ScrollPosition>[];
  Rect? _barRect;

  /// The suggestion that is active (SRC-14), by index; null for none.
  int? _active;
  List<GlobalKey<_SuggestionRowState>> _rowKeys = <GlobalKey<_SuggestionRowState>>[];

  /// Whether the view is shown (it follows the controller).
  bool _shown = false;
  TextEditingValue _value = TextEditingValue.empty;

  /// The pointer pressing the bar, and one that went down on a slot element (not the bar's press).
  int? _barPointer;
  int? _slotPointer;

  String _reported = '';
  bool _reportedClearName = false;
  bool _reportedBackName = false;

  TanreiSearchTokens get _tokens => TanreiTheme.of(context).system.search;

  FocusNode get _inputNode =>
      widget.focusNode ?? (_ownNode ??= FocusNode(debugLabel: 'TanreiSearch'));

  bool get _fullScreen => widget.presentation == TanreiSearchPresentation.fullScreen;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  bool get _hasViewContent => widget.suggestions.isNotEmpty || widget.child != null;

  // The bar is pressed to focus the input and open the view (SRC-5); it takes no focus itself.
  @override
  VoidCallback? get onPressed => widget.enabled ? _noop : null;

  static void _noop() {}

  @override
  bool get pressedByTaps => false;

  @override
  bool get hoveredByPointer => false;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SRC-20: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _BarVisuals lerpVisuals(_BarVisuals a, _BarVisuals b, double t) => _BarVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _value = widget.controller.value;
    _shown = widget.controller.isExpanded;
    widget.controller.addListener(_handleController);
    _inputNode
      ..addListener(_handleInputFocus)
      ..onKeyEvent = _handleKey;
    _syncRowKeys();
    _debugReport(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiSearchTokens tokens = _tokens;
    _view
      ..duration = tanreiDuration(tokens.motionOpenDuration)
      ..reverseDuration = tanreiDuration(tokens.motionCloseDuration);
    _viewCurve
      ..curve = tokens.motionOpenEasing.toCurve()
      // The close runs the controller from 1 to 0: flipped, the close easing eases its own progress.
      ..reverseCurve = tokens.motionCloseEasing.toCurve().flipped;
    if (_shown && !_viewOpen) {
      // A view that was open before the first build (the controller was expanded).
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted && _shown && !_viewOpen) {
          _openView(animate: false);
        }
      });
    }
  }

  @override
  void didUpdateWidget(TanreiSearch oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_handleController);
      widget.controller.addListener(_handleController);
      _value = widget.controller.value;
      _handleController();
    }
    if (oldWidget.focusNode != widget.focusNode) {
      (oldWidget.focusNode ?? _ownNode)?.removeListener(_handleInputFocus);
      _inputNode
        ..addListener(_handleInputFocus)
        ..onKeyEvent = _handleKey;
    }
    // SRC-14: a change of the suggestions leaves none active.
    if (!listEquals(oldWidget.suggestions, widget.suggestions)) {
      _active = null;
    }
    _syncRowKeys();
    if (!widget.enabled && oldWidget.enabled && widget.controller.isExpanded) {
      // SRC-26: a disabled search cannot be open; it says nothing of it.
      widget.controller.collapse();
    }
    if (oldWidget.presentation != widget.presentation && _viewOpen) {
      _closeView(animate: false);
      if (_shown) {
        _openView(animate: false);
      }
    }
    _debugReport(oldWidget);
    _notifyViewLater();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleController);
    _inputNode
      ..removeListener(_handleInputFocus)
      ..onKeyEvent = null;
    _stopBack();
    _stopFollowing();
    final _SearchViewRoute? route = _route;
    _route = null;
    if (route != null && route.isActive) {
      route.navigator?.removeRoute(route);
    }
    _ownNode?.dispose();
    _headerNode.dispose();
    _viewCurve.dispose();
    _view.dispose();
    _viewChanges.dispose();
    _popEntry.dispose();
    super.dispose();
  }

  void _syncRowKeys() {
    final int count = widget.suggestions.length;
    if (_rowKeys.length != count) {
      _rowKeys = <GlobalKey<_SuggestionRowState>>[
        for (int i = 0; i < count; i++)
          i < _rowKeys.length ? _rowKeys[i] : GlobalKey<_SuggestionRowState>(),
      ];
    }
    if (_active != null && _active! >= count) {
      _active = null;
    }
  }

  /// SRC-10, SRC-11, SRC-27, in debug builds: what the search draws otherwise than it was given, and
  /// the names it lacks; each once, when it begins.
  void _debugReport(TanreiSearch? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticLabel)) {
        debugTanreiReportMissingName('search', widget);
      }
      final Set<String> values = <String>{};
      final List<String> problems = <String>[
        for (final (int i, TanreiSearchSuggestion s) in widget.suggestions.indexed) ...<String>[
          if (s.value.isEmpty) 'Suggestion $i has no value: it is drawn, and selects "".',
          if (s.value.isNotEmpty && !values.add(s.value))
            'Suggestion $i repeats the value "${s.value}": each value must be unique.',
          if (s.headline.isEmpty) 'Suggestion $i has no headline: it is drawn without a name.',
        ],
        if (widget.trailing.length > 2)
          'A search holds up to two trailing icon buttons; the ${widget.trailing.length} given are '
              'all laid out.',
      ];
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue(
            'search',
            problem.startsWith('A search') ? 'trailing' : 'suggestions',
            problem,
            widget,
          );
        }
      }
      return true;
    }());
  }

  /// SRC-10: the clear button without a name is reported once, when it is first shown so.
  void _debugReportClearName() {
    assert(() {
      if (!tanreiIsAccessibleName(widget.clearLabel) && !_reportedClearName) {
        _reportedClearName = true;
        debugTanreiReportMissingName('search clear button', widget);
      }
      return true;
    }());
  }

  /// SRC-11: the back button without a name is reported once, when it is first drawn so.
  void _debugReportBackName() {
    assert(() {
      if (!tanreiIsAccessibleName(widget.backLabel) && !_reportedBackName) {
        _reportedBackName = true;
        debugTanreiReportMissingName('search back button', widget);
      }
      return true;
    }());
  }

  // ---------------------------------------------------------------------------------------------
  // The query and the view (SRC-5, SRC-6, SRC-14).

  void _handleController() {
    final TanreiSearchController controller = widget.controller;
    if (controller.value != _value) {
      // SRC-14: typing, deleting or moving the caret leaves no suggestion active.
      _value = controller.value;
      setState(() => _active = null);
      _notifyView();
    }
    if (controller.isExpanded != _shown) {
      _shown = controller.isExpanded;
      if (_shown) {
        _openView(animate: !_reduceMotion);
      } else {
        _closeView(animate: !_reduceMotion);
      }
    }
  }

  /// SRC-5: the search asks to open, and opens.
  void _requestExpand() {
    if (!widget.enabled || widget.controller.isExpanded) {
      return;
    }
    widget.onExpandedChanged?.call(true, null);
    widget.controller.expand();
  }

  /// SRC-6: the search asks to close for [reason], and closes; the query stays.
  void _requestCollapse(TanreiSearchCloseReason reason) {
    if (!widget.controller.isExpanded) {
      return;
    }
    widget.onExpandedChanged?.call(false, reason);
    widget.controller.collapse();
  }

  bool _viewOpen = false;

  void _openView({required bool animate}) {
    if (!mounted || _viewOpen) {
      return;
    }
    _viewOpen = true;
    if (widget.inPlace) {
      setState(() {});
      return;
    }
    final NavigatorState? navigator = _fullScreen ? Navigator.maybeOf(context) : null;
    if (navigator != null) {
      _openRoute(navigator);
      return;
    }
    if (Overlay.maybeOf(context) != null) {
      _overlay.show();
      _follow();
    }
    _startBack();
    if (animate) {
      _view.forward();
    } else {
      _view.value = _view.upperBound;
    }
    setState(() {});
  }

  void _closeView({required bool animate}) {
    if (!_viewOpen) {
      return;
    }
    _viewOpen = false;
    _active = null;
    final _SearchViewRoute? route = _route;
    if (route != null) {
      _route = null;
      if (route.isActive) {
        if (route.isCurrent) {
          route.navigator!.pop();
        } else {
          route.navigator!.removeRoute(route);
        }
      }
      // SRC-9: focus returns to the bar's input, which does not open the view again.
      if (widget.enabled) {
        _inputNode.requestFocus();
      }
      setState(() {});
      return;
    }
    _stopBack();
    _stopFollowing();
    if (animate && _overlay.isShowing) {
      _view.reverse();
    } else {
      _view.value = _view.lowerBound;
      if (_overlay.isShowing) {
        _overlay.hide();
      }
    }
    setState(() {});
  }

  void _handleViewStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && !_viewOpen && _overlay.isShowing && mounted) {
      setState(_overlay.hide);
    }
  }

  void _openRoute(NavigatorState navigator) {
    final TanreiSearchTokens tokens = _tokens;
    final bool reduce = _reduceMotion;
    // SRC-9: the caret at the end of the query in the header's input.
    final TanreiSearchController controller = widget.controller;
    controller.selection = TextSelection.collapsed(offset: controller.text.length);
    _value = controller.value;
    final _SearchViewRoute route = _SearchViewRoute(
      builder: (BuildContext context) => ListenableBuilder(
        listenable: _viewChanges,
        builder: (BuildContext context, Widget? _) => _buildFullScreen(context),
      ),
      enter: reduce ? Duration.zero : tanreiDuration(tokens.motionOpenDuration),
      exit: reduce ? Duration.zero : tanreiDuration(tokens.motionCloseDuration),
      enterCurve: tokens.motionOpenEasing.toCurve(),
      exitCurve: tokens.motionCloseEasing.toCurve(),
      onPopped: _handleRoutePopped,
    );
    _route = route;
    unawaited(navigator.push<void>(route));
  }

  /// The full-screen view was popped from outside (the platform's back): the search closes (SRC-6).
  void _handleRoutePopped(_SearchViewRoute route) {
    if (!identical(route, _route)) {
      return;
    }
    _route = null;
    _viewOpen = false;
    if (widget.controller.isExpanded) {
      _requestCollapse(TanreiSearchCloseReason.back);
    }
    if (mounted && widget.enabled) {
      _inputNode.requestFocus();
    }
  }

  void _notifyView() {
    if (_route != null) {
      _viewChanges.value++;
    }
  }

  /// A change the search's own build made (new suggestions): the full-screen view follows after the
  /// frame, since the route is not below the search.
  void _notifyViewLater() {
    if (_route == null) {
      return;
    }
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _notifyView();
      }
    });
  }

  // SRC-6: the platform's back closes a docked view.
  void _startBack() {
    WidgetsBinding.instance.addObserver(this);
    final ModalRoute<Object?>? route = ModalRoute.of(context);
    if (route != null) {
      route.registerPopEntry(_popEntry);
      _popRoute = route;
    }
  }

  void _stopBack() {
    WidgetsBinding.instance.removeObserver(this);
    _popRoute?.unregisterPopEntry(_popEntry);
    _popRoute = null;
  }

  @override
  Future<bool> didPopRoute() async {
    if (_viewOpen && _route == null && widget.controller.isExpanded) {
      _requestCollapse(TanreiSearchCloseReason.back);
      return true;
    }
    return false;
  }

  // SRC-7: the docked view follows the bar while an ancestor scrolls.
  void _follow() {
    _stopFollowing();
    ScrollableState? scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      final ScrollPosition position = scrollable.position;
      position.addListener(_barMoved);
      _scrolls.add(position);
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
  }

  void _stopFollowing() {
    for (final ScrollPosition position in _scrolls) {
      position.removeListener(_barMoved);
    }
    _scrolls.clear();
  }

  void _barMoved() {
    if (mounted && _overlay.isShowing) {
      setState(() {});
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Input (SRC-4, SRC-5, SRC-6, SRC-10, SRC-12…15).

  void _handleInputFocus() {
    final bool focused = _inputNode.hasFocus;
    // SRC-18: the bar is focused however the input was focused.
    setFocused(focused);
    // SRC-6: focus leaving a docked search closes its view.
    if (!focused && !_fullScreen && widget.controller.isExpanded) {
      _requestCollapse(TanreiSearchCloseReason.focusOut);
    }
  }

  void _handleBarTap() {
    if (!widget.enabled) {
      return;
    }
    _inputNode.requestFocus();
    _requestExpand();
  }

  void _handleChanged(String value) {
    widget.onChanged?.call(value);
    // SRC-5: typing opens the view.
    _requestExpand();
  }

  void _handleSubmitted(String value) {
    if (_active != null) {
      _chooseActive();
      return;
    }
    // SRC-13: submit, then close.
    widget.onSubmitted?.call(value);
    _requestCollapse(TanreiSearchCloseReason.submit);
  }

  void _handleTapOutside(PointerDownEvent event) {
    if (!_fullScreen && widget.controller.isExpanded) {
      _requestCollapse(TanreiSearchCloseReason.outside);
    }
    // A touch outside the field lets go of it on a phone, as a text field does.
    if (event.kind == PointerDeviceKind.touch &&
        switch (defaultTargetPlatform) {
          TargetPlatform.android || TargetPlatform.iOS || TargetPlatform.fuchsia => true,
          TargetPlatform.linux || TargetPlatform.macOS || TargetPlatform.windows => false,
        }) {
      _inputNode.unfocus();
    }
  }

  /// SRC-10: empties the query, emits input and returns focus to its input.
  void _clear() {
    if (!widget.enabled) {
      return;
    }
    widget.controller.value = TextEditingValue.empty;
    widget.onChanged?.call('');
    (_route != null ? _headerNode : _inputNode).requestFocus();
  }

  void _select(TanreiSearchSuggestion suggestion) {
    if (!widget.enabled) {
      return;
    }
    // SRC-15: select, then close; the query is the product's to set.
    widget.onSelected?.call(suggestion.value);
    _requestCollapse(TanreiSearchCloseReason.select);
  }

  void _chooseActive() {
    final int? index = _active;
    if (index == null || index >= widget.suggestions.length) {
      return;
    }
    // SRC-19: Enter presses the row.
    _rowKeys[index].currentState?.flashPress();
    _select(widget.suggestions[index]);
  }

  void _setActive(int? index) {
    setState(() => _active = index);
    _notifyView();
    if (index != null) {
      // SRC-14: an active row partly out of view is scrolled into it.
      SchedulerBinding.instance.addPostFrameCallback((_) {
        final BuildContext? row = index < _rowKeys.length ? _rowKeys[index].currentContext : null;
        if (row != null && row.mounted) {
          Scrollable.ensureVisible(
            row,
            alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
          );
          Scrollable.ensureVisible(
            row,
            alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart,
          );
        }
      });
    }
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (!widget.enabled || (event is! KeyDownEvent && event is! KeyRepeatEvent)) {
      return KeyEventResult.ignored;
    }
    final bool expanded = widget.controller.isExpanded;
    final int count = widget.suggestions.length;
    final LogicalKeyboardKey key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowDown) {
      if (!expanded) {
        // SRC-5: Down Arrow opens the view.
        _requestExpand();
        return KeyEventResult.handled;
      }
      if (count > 0) {
        // SRC-14: the next suggestion, staying on the last.
        _setActive(_active == null ? 0 : math.min(_active! + 1, count - 1));
      }
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowUp) {
      if (expanded && _active != null) {
        _setActive(_active == 0 ? null : _active! - 1);
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (key == LogicalKeyboardKey.escape) {
      if (expanded) {
        _requestCollapse(TanreiSearchCloseReason.escape);
        return KeyEventResult.handled;
      }
      if (widget.controller.text.isNotEmpty) {
        // SRC-12: Escape clears, as a native search input does.
        widget.controller.value = TextEditingValue.empty;
        widget.onChanged?.call('');
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      if (expanded && _active != null) {
        _chooseActive();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (key == LogicalKeyboardKey.tab && expanded && !_fullScreen) {
      // SRC-6: Tab closes a docked view, and moves on as it would have.
      _requestCollapse(TanreiSearchCloseReason.tab);
    }
    return KeyEventResult.ignored;
  }

  // ---------------------------------------------------------------------------------------------
  // The bar (SRC-1…4, SRC-10, SRC-18…22, SRC-25, SRC-26).

  Offset? _containerOffset(Offset global) {
    final RenderObject? box = pressContainerKey.currentContext?.findRenderObject();
    return box is RenderBox ? box.globalToLocal(global) : null;
  }

  void _handleBarPointerDown(PointerDownEvent event) {
    if (!widget.enabled || event.pointer == _slotPointer || _barPointer != null) {
      return;
    }
    _barPointer = event.pointer;
    // SRC-19: the press shows at once; SRC-20: a ripple from the point of contact.
    beginPress(_containerOffset(event.position));
  }

  void _handleBarPointerEnd(PointerEvent event) {
    if (event.pointer == _slotPointer) {
      _slotPointer = null;
    }
    if (event.pointer == _barPointer) {
      _barPointer = null;
      endPress();
    }
  }

  /// A slot element (an icon button, the clear button): its presses are its own, not the bar's.
  Widget _slot(Widget child) => Listener(
    onPointerDown: (PointerDownEvent event) => _slotPointer = event.pointer,
    // SRC-28: an icon button keeps its size whatever the text size.
    child: MediaQuery.withNoTextScaling(child: TanreiVisibleSize(child: child)),
  );

  Widget _editable({
    required GlobalKey<EditableTextState> key,
    required FocusNode focusNode,
    required _BarVisuals visuals,
    required bool autofocus,
    required bool header,
  }) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSearchTokens tokens = theme.system.search;
    final TextDirection ambient = Directionality.of(context);
    final String text = widget.controller.text;
    final TextStyle style = tokens.inputTypescale.toTextStyle(color: visuals.input);
    final Widget editable = EditableText(
      key: key,
      controller: widget.controller,
      focusNode: focusNode,
      autofocus: autofocus,
      readOnly: !widget.enabled,
      style: style,
      cursorColor: visuals.caret,
      backgroundCursorColor: visuals.placeholder,
      // SRC-3: the product's one selection color for text entry.
      selectionColor: theme.paint(theme.system.textField.selectionColor),
      // SRC-4 (TXF-24): the typed text's own direction.
      textDirection: tanreiTextDirectionOf(text) ?? ambient,
      // SRC-4 (TXF-20): a general keyboard whose action key is search.
      keyboardType: TextInputType.text,
      textInputAction: TextInputAction.search,
      maxLines: 1,
      onChanged: _handleChanged,
      onSubmitted: _handleSubmitted,
      // The input keeps focus after a submit; the search closes the view itself (SRC-13).
      onEditingComplete: () {},
      onTapOutside: header ? (_) {} : _handleTapOutside,
      rendererIgnoresPointer: !header,
      mouseCursor: MouseCursor.defer,
      contextMenuBuilder: MediaQuery.maybeSupportsShowingSystemContextMenu(context) ?? false
          ? (BuildContext context, EditableTextState state) =>
                SystemContextMenu.editableText(editableTextState: state)
          : null,
    );
    // SRC-3: the placeholder while the query is empty, never the name.
    return Stack(
      alignment: AlignmentDirectional.centerStart,
      children: <Widget>[
        if (text.isEmpty && widget.hintText.isNotEmpty)
          Positioned.fill(
            child: IgnorePointer(
              child: ExcludeSemantics(
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    widget.hintText,
                    style: tokens.inputTypescale.toTextStyle(color: visuals.placeholder),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ),
        editable,
      ],
    );
  }

  /// SRC-24: a search field named by label, never by the placeholder, as large as the bar (or the
  /// header) around it: the built-in and slot buttons are nodes of their own inside it.
  Widget _inputSemantics({
    required GlobalKey<EditableTextState> key,
    required FocusNode focusNode,
    required Widget child,
  }) => Semantics(
    container: true,
    label: widget.semanticLabel,
    enabled: widget.enabled,
    inputType: SemanticsInputType.search,
    onTap: widget.enabled ? () => _focusInput(key, focusNode) : null,
    onFocus: widget.enabled ? () => _focusInput(key, focusNode) : null,
    child: child,
  );

  void _focusInput(GlobalKey<EditableTextState> key, FocusNode node) {
    final TextEditingController controller = widget.controller;
    if (!controller.selection.isValid) {
      controller.selection = TextSelection.collapsed(offset: controller.text.length);
    }
    key.currentState?.requestKeyboard();
  }

  TanreiIconButton _clearButton({required bool header}) {
    _debugReportClearName();
    return TanreiIconButton(
      onPressed: widget.enabled ? _clear : null,
      icon: const Text(tanreiCloseGlyph),
      semanticLabel: widget.clearLabel,
      // SRC-10: small in the bar, medium in the full-screen header.
      size: header ? TanreiIconButtonSize.medium : TanreiIconButtonSize.small,
    );
  }

  _BarVisuals _barVisuals(TanreiThemeData theme, {TanreiInteractionState? only}) {
    final TanreiSearchTokens tokens = theme.system.search;
    final TanreiSearchConditionTokens condition = tokens.conditions.standard;
    final TanreiInteractionState drawn = only ?? drawnState;
    final TanreiSearchConditionStateTokens parts = condition.of(drawn);
    final TanreiSearchStateTokens? state = tokens.stateTokens(drawn);
    return _BarVisuals(
      container: theme.paint(condition.of(only ?? containerState).containerColor),
      elevation: TanreiResolvedElevation.resolve(parts.containerElevation, theme.colors),
      outline: theme.paint(parts.outlineColor),
      outlineWidth: state?.outlineWidth ?? tokens.outlineWidth,
      glyph: theme.paint(parts.leadingIconColor),
      input: theme.paint(parts.inputColor),
      placeholder: theme.paint(parts.placeholderColor),
      caret: theme.paint(parts.caretColor),
      opacity: state?.opacity ?? 1,
    );
  }

  Widget _buildBar(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSystem system = theme.system;
    final TanreiSearchTokens tokens = system.search;
    // SRC-18, SRC-20: the drawn state's tokens, the container of the state under a ripple or a dim.
    final _BarVisuals visuals = animateVisuals(_barVisuals(theme));
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );
    final bool clearShown = widget.enabled && widget.controller.text.isNotEmpty;
    final Widget? leading = widget.leading;
    final bool endsWithButton = clearShown || widget.trailing.isNotEmpty;

    // SRC-1: one row, each element vertically centered and the gap apart.
    final Widget row = Padding(
      padding: EdgeInsetsDirectional.only(
        start: leading == null
            ? tokens.containerPaddingInline
            : tokens.containerPaddingInlineWithButton,
        end: endsWithButton
            ? tokens.containerPaddingInlineWithButton
            : tokens.containerPaddingInline,
      ),
      child: Row(
        spacing: tokens.containerGap,
        children: <Widget>[
          // SRC-2: the search glyph, hidden from assistive technology; SRC-25: the product's own
          // icon button in its place.
          if (leading != null)
            _slot(leading)
          else
            TanreiControlIcon(
              icon: const Text(tanreiSearchGlyph),
              size: tokens.leadingIconSize,
              selected: false,
              color: visuals.glyph,
            ),
          Expanded(
            child: ExcludeFocus(
              excluding: !widget.enabled,
              child: _editable(
                key: editableTextKey,
                focusNode: _inputNode,
                visuals: visuals,
                autofocus: false,
                header: false,
              ),
            ),
          ),
          // SRC-10: the clear button while there is a query.
          if (clearShown) _slot(_clearButton(header: false)),
          for (final Widget trailing in widget.trailing) _slot(trailing),
        ],
      ),
    );

    final TanreiControlVisuals container = TanreiControlVisuals(
      container: visuals.container,
      label: visuals.input,
      outline: visuals.outline,
      elevation: visuals.elevation,
      opacity: visuals.opacity,
      shape: tokens.containerShape,
    );
    // SRC-18: the bar's focus is its outline; WHERE the focus style is glow, a glow around it too.
    final bool glow = switch (system.behavior.focusStyle) {
      TanreiFocusStyle.ring => false,
      TanreiFocusStyle.glow => _inputNode.hasFocus,
    };
    Widget bar = TanreiControlContainer(
      key: pressContainerKey,
      visuals: container,
      shape: shape,
      outlineWidth: visuals.outlineWidth,
      ripple: rippleFor(
        pressedContainer: () =>
            theme.paint(tokens.conditions.standard.of(interactionState).containerColor),
        container: visuals.container,
      ),
      // SRC-1, SRC-28: at least container.height; it grows with the input's line.
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: tokens.containerHeight),
        child: Center(heightFactor: 1, child: row),
      ),
    );
    bar = Opacity(
      opacity: visuals.opacity,
      child: TanreiFocusRing(
        visible: glow,
        borderRadius: BorderRadius.circular(tokens.containerShape),
        child: bar,
      ),
    );
    return TextFieldTapRegion(
      child: _inputSemantics(
        key: editableTextKey,
        focusNode: _inputNode,
        // SRC-22: the minimum target, above and below.
        child: TanreiTapTarget(
          child: MouseRegion(
            cursor: widget.enabled ? SystemMouseCursors.text : MouseCursor.defer,
            onEnter: (_) => setHovered(true),
            onExit: (_) => setHovered(false),
            child: Listener(
              onPointerDown: _handleBarPointerDown,
              onPointerUp: _handleBarPointerEnd,
              onPointerCancel: _handleBarPointerEnd,
              child: _gestures.buildGestureDetector(
                behavior: HitTestBehavior.translucent,
                child: bar,
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------------------------
  // The view (SRC-7…9, SRC-14…17, SRC-23, SRC-24, SRC-29).

  /// The suggestions and the product's content, as the view holds them.
  Widget _buildContent(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSearchTokens tokens = theme.system.search;
    final bool iconColumn = widget.suggestions.any(
      (TanreiSearchSuggestion s) => s.leadingIcon.isNotEmpty,
    );
    final int count = widget.suggestions.length;
    final Widget? child = widget.child;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (final (int i, TanreiSearchSuggestion s) in widget.suggestions.indexed)
          _SuggestionRow(
            key: i < _rowKeys.length ? _rowKeys[i] : null,
            suggestion: s,
            active: i == _active,
            iconColumn: iconColumn,
            enabled: widget.enabled,
            onPressed: () => _select(s),
            index: i,
            count: count,
          ),
        // SRC-29: the product's content in the headline color and the body style, at the rows'
        // inset.
        if (child != null)
          Padding(
            padding: EdgeInsets.symmetric(horizontal: tokens.suggestionContainerPaddingInline),
            child: DefaultTextStyle(
              style: theme.system.typescale.body.toTextStyle(
                color: theme.paint(tokens.conditions.standard.enabled.suggestionHeadlineColor),
              ),
              child: IconTheme(
                data: IconThemeData(
                  color: theme.paint(tokens.conditions.standard.enabled.suggestionHeadlineColor),
                ),
                child: child,
              ),
            ),
          ),
      ],
    );
  }

  /// SRC-7: the docked view's surface, its content clipped to its shape and scrolling.
  Widget _buildDockedView(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSearchTokens tokens = theme.system.search;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.viewContainerShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.viewContainerElevation,
      theme.colors,
    );
    final Color color = theme.paint(tokens.viewContainerColor);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.semanticLabel,
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: color.a > 0 ? color : null,
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
        child: ClipPath(
          clipper: _ShapeClipper(shape),
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              vertical: tokens.viewPaddingBlock,
              horizontal: tokens.viewPaddingInline,
            ),
            child: _buildContent(context),
          ),
        ),
      ),
    );
  }

  Rect _computeBarRect() {
    final RenderBox overlay = Overlay.of(context).context.findRenderObject()! as RenderBox;
    final RenderBox bar = pressContainerKey.currentContext!.findRenderObject()! as RenderBox;
    return MatrixUtils.transformRect(bar.getTransformTo(overlay), Offset.zero & bar.size);
  }

  Widget _buildOverlay(BuildContext overlayContext) {
    if (!_hasViewContent || !_viewOpen && _view.isDismissed) {
      // SRC-7: no content, no view; the search stays expanded.
      return const SizedBox.shrink();
    }
    final Rect rect = _computeBarRect();
    _barRect = rect;
    // SRC-7: after this frame, check whether the bar moved (a layout change); if so, place again.
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && _overlay.isShowing && _computeBarRect() != _barRect) {
        setState(() {});
      }
    });
    final TanreiSearchTokens tokens = _tokens;
    final EdgeInsets insets = MediaQuery.viewInsetsOf(context);
    return AnimatedBuilder(
      animation: _viewCurve,
      builder: (BuildContext context, Widget? child) => _ViewPosition(
        barRect: rect,
        offset: tokens.viewOffset,
        margin: tokens.viewViewportMargin,
        keyboard: insets.bottom,
        progress: _viewCurve.value,
        child: child,
      ),
      // SRC-8: presses in the view do not take the input's focus.
      child: TextFieldTapRegion(child: _buildDockedView(context)),
    );
  }

  /// SRC-9: the full-screen view: the header, the divider and the scrolling content, to every edge
  /// of the window with its content inside the safe area and above the keyboard.
  Widget _buildFullScreen(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSearchTokens tokens = theme.system.search;
    _debugReportBackName();
    final EdgeInsets safe = MediaQuery.paddingOf(context);
    final EdgeInsets keyboard = MediaQuery.viewInsetsOf(context);
    final bool rtl = Directionality.of(context) == TextDirection.rtl;
    // The header's input is focused: it draws the focused state's text colors.
    final _BarVisuals visuals = _barVisuals(theme, only: TanreiInteractionState.focused);
    final bool clearShown = widget.enabled && widget.controller.text.isNotEmpty;
    final TanreiIconButton back = TanreiIconButton(
      onPressed: () => _requestCollapse(TanreiSearchCloseReason.back),
      // SRC-11: arrow_back, mirrored right to left.
      icon: Transform.flip(flipX: rtl, child: const Text(tanreiArrowBackGlyph)),
      semanticLabel: widget.backLabel,
    );
    final Widget header = _inputSemantics(
      key: _headerKey,
      focusNode: _headerNode,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: tokens.headerHeight),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: tokens.headerPaddingInline),
          child: Row(
            spacing: tokens.containerGap,
            children: <Widget>[
              MediaQuery.withNoTextScaling(child: TanreiVisibleSize(child: back)),
              Expanded(
                child: _editable(
                  key: _headerKey,
                  focusNode: _headerNode,
                  visuals: visuals,
                  autofocus: !widget.inPlace,
                  header: true,
                ),
              ),
              if (clearShown)
                MediaQuery.withNoTextScaling(
                  child: TanreiVisibleSize(child: _clearButton(header: true)),
                ),
            ],
          ),
        ),
      ),
    );
    final Color color = theme.paint(tokens.viewContainerColor);
    // SRC-24: a modal dialog named by label, which scopes the route.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: true,
      namesRoute: true,
      role: SemanticsRole.dialog,
      label: widget.semanticLabel,
      child: ColoredBox(
        color: color,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            safe.left,
            safe.top,
            safe.right,
            math.max(safe.bottom, keyboard.bottom),
          ),
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            includeSemantics: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                header,
                ExcludeSemantics(
                  child: SizedBox(
                    height: tokens.dividerThickness,
                    child: ColoredBox(color: theme.paint(tokens.dividerColor)),
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(
                      vertical: tokens.viewPaddingBlock,
                      horizontal: tokens.viewPaddingInline,
                    ),
                    child: _buildContent(context),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final TanreiSearchTokens tokens = _tokens;
    if (widget.inPlace && _shown && widget.enabled) {
      if (_fullScreen) {
        return _buildFullScreen(context);
      }
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _buildBar(context),
          if (_hasViewContent) ...<Widget>[
            SizedBox(height: tokens.viewOffset),
            _buildDockedView(context),
          ],
        ],
      );
    }
    final Widget bar = _buildBar(context);
    if (_fullScreen && !_overlay.isShowing) {
      return bar;
    }
    return OverlayPortal(controller: _overlay, overlayChildBuilder: _buildOverlay, child: bar);
  }
}

/// How a suggestion row looks in its state (SRC-17).
@immutable
class _RowVisuals {
  const _RowVisuals({
    required this.container,
    required this.icon,
    required this.headline,
    required this.supporting,
    required this.opacity,
  });

  final Color container;
  final Color icon;
  final Color headline;
  final Color supporting;
  final double opacity;

  static _RowVisuals lerp(_RowVisuals a, _RowVisuals b, double t) => _RowVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    headline: tanreiLerpColor(a.headline, b.headline, t),
    supporting: tanreiLerpColor(a.supporting, b.supporting, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
  );
}

/// One suggestion (SRC-15…17, SRC-19, SRC-20, SRC-24): a row pressed by pointer or touch, never
/// focused (focus stays in the input), active while the search says so.
class _SuggestionRow extends StatefulWidget {
  const _SuggestionRow({
    super.key,
    required this.suggestion,
    required this.active,
    required this.iconColumn,
    required this.enabled,
    required this.onPressed,
    required this.index,
    required this.count,
  });

  final TanreiSearchSuggestion suggestion;
  final bool active;
  final bool iconColumn;
  final bool enabled;
  final VoidCallback onPressed;
  final int index;
  final int count;

  @override
  State<_SuggestionRow> createState() => _SuggestionRowState();
}

class _SuggestionRowState extends State<_SuggestionRow>
    with
        TickerProviderStateMixin<_SuggestionRow>,
        TanreiPressableStateMixin<_SuggestionRow, _RowVisuals> {
  // SRC-8: a row never takes focus.
  final FocusNode _node = FocusNode(
    debugLabel: 'TanreiSearch suggestion',
    canRequestFocus: false,
    skipTraversal: true,
  );

  TanreiSearchTokens get _tokens => TanreiTheme.of(context).system.search;

  @override
  VoidCallback? get onPressed => widget.enabled ? widget.onPressed : null;

  @override
  Map<ShortcutActivator, Intent> get activationShortcuts => const <ShortcutActivator, Intent>{};

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _RowVisuals lerpVisuals(_RowVisuals a, _RowVisuals b, double t) => _RowVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    if (widget.active) {
      // SRC-17: the active suggestion takes the focused tokens.
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setFocused(widget.active);
        }
      });
    }
  }

  @override
  void didUpdateWidget(_SuggestionRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) {
      setFocused(widget.active);
    }
  }

  @override
  void dispose() {
    _node.dispose();
    super.dispose();
  }

  /// SRC-19: Enter on the active row shows its press, from the center, for the press-hold.
  void flashPress() {
    beginPress(null);
    endPress();
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSystem system = theme.system;
    final TanreiSearchTokens tokens = system.search;
    final TanreiSearchConditionTokens condition = tokens.conditions.standard;
    final TanreiSearchConditionStateTokens drawn = condition.of(drawnState);
    final _RowVisuals visuals = animateVisuals(
      _RowVisuals(
        container: theme.paint(condition.of(containerState).suggestionContainerColor),
        icon: theme.paint(drawn.suggestionLeadingIconColor),
        headline: theme.paint(drawn.suggestionHeadlineColor),
        supporting: theme.paint(drawn.suggestionSupportingTextColor),
        opacity: tokens.stateTokens(drawnState)?.opacity ?? 1,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: system.shape.cornerSmoothing,
      radius: tokens.suggestionContainerShape,
    );
    final TanreiSearchSuggestion s = widget.suggestion;
    // SRC-16: the icon column is kept in every row while any suggestion has an icon.
    final Widget? leading = !widget.iconColumn
        ? null
        : (s.leadingIcon.isEmpty
              ? SizedBox.square(dimension: tokens.suggestionLeadingIconSize)
              : TanreiControlIcon(
                  icon: Text(s.leadingIcon),
                  size: tokens.suggestionLeadingIconSize,
                  selected: false,
                  color: visuals.icon,
                ));
    final Widget row = TanreiItemRow(
      leading: leading,
      headline: Text(
        s.headline,
        style: tokens.suggestionHeadlineTypescale.toTextStyle(color: visuals.headline),
      ),
      supporting: s.supportingText.isEmpty
          ? null
          : Text(
              s.supportingText,
              style: tokens.suggestionSupportingTextTypescale.toTextStyle(
                color: visuals.supporting,
              ),
            ),
      paddingStart: tokens.suggestionContainerPaddingInline,
      paddingEnd: tokens.suggestionContainerPaddingInline,
      paddingBlock: tokens.suggestionContainerPaddingBlock,
      gap: tokens.suggestionContainerGap,
      minHeights: <double>[tokens.suggestionContainerHeight],
      // SRC-16: rows that touch cannot extend a hit area over each other.
      minTarget: system.measure.targetTouch,
      alignment: TanreiItemRowAlignment.centerThenTop,
    );
    // SRC-24: a button named by its headline and described by its supporting text.
    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      label: s.headline,
      hint: s.supportingText.isEmpty ? null : s.supportingText,
      child: Builder(
        builder: (BuildContext _) => buildPressable(
          focusNode: _node,
          child: Opacity(
            opacity: visuals.opacity,
            // SRC-17: the ring inside the active row, without animation.
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              inside: true,
              borderRadius: BorderRadius.circular(tokens.suggestionContainerShape),
              child: DecoratedBox(
                key: pressContainerKey,
                decoration: TanreiContainerDecoration(
                  shape: shape,
                  color: visuals.container.a > 0 ? visuals.container : null,
                  ripple: rippleFor(
                    pressedContainer: () =>
                        theme.paint(condition.of(interactionState).suggestionContainerColor),
                    container: visuals.container,
                  ),
                ),
                child: ExcludeSemantics(child: row),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// SRC-7, SRC-23: places the docked view under the bar (or above it, where the room below is too
/// small and the room above larger), as wide as the bar, limited to the room left; fades it and
/// grows it from the edge that faces the bar while it opens and closes.
class _ViewPosition extends SingleChildRenderObjectWidget {
  const _ViewPosition({
    required this.barRect,
    required this.offset,
    required this.margin,
    required this.keyboard,
    required this.progress,
    super.child,
  });

  final Rect barRect;
  final double offset;
  final double margin;
  final double keyboard;
  final double progress;

  @override
  RenderTanreiSearchViewPosition createRenderObject(BuildContext context) =>
      RenderTanreiSearchViewPosition._()
        ..barRect = barRect
        ..offset = offset
        ..margin = margin
        ..keyboard = keyboard
        ..progress = progress;

  @override
  void updateRenderObject(BuildContext context, RenderTanreiSearchViewPosition renderObject) {
    renderObject
      ..barRect = barRect
      ..offset = offset
      ..margin = margin
      ..keyboard = keyboard
      ..progress = progress;
  }
}

/// The render object that places a search's docked view; public so that tests can read where it
/// went.
class RenderTanreiSearchViewPosition extends RenderShiftedBox {
  RenderTanreiSearchViewPosition._() : super(null);

  Rect _barRect = Rect.zero;
  set barRect(Rect value) => _relayout(_barRect != value, () => _barRect = value);

  double _offset = 0;
  set offset(double value) => _relayout(_offset != value, () => _offset = value);

  double _margin = 0;
  set margin(double value) => _relayout(_margin != value, () => _margin = value);

  double _keyboard = 0;
  set keyboard(double value) => _relayout(_keyboard != value, () => _keyboard = value);

  double _progress = 1;
  set progress(double value) {
    if (_progress != value) {
      final bool composited = _progress < 1;
      _progress = value;
      if (composited != (value < 1)) {
        markNeedsCompositingBitsUpdate();
      }
      markNeedsPaint();
    }
  }

  void _relayout(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsLayout();
    }
  }

  /// Whether the view went above the bar in the last layout.
  bool get isAbove => _above;
  bool _above = false;

  /// Where the view went in the last layout, in this box's coordinates.
  Rect get viewRect => _viewRect;
  Rect _viewRect = Rect.zero;

  @override
  bool get alwaysNeedsCompositing => child != null && _progress < 1;

  @override
  void performLayout() {
    size = constraints.biggest;
    final RenderBox? child = this.child;
    if (child == null) {
      return;
    }
    final double width = _barRect.width;
    final double natural = child.getMaxIntrinsicHeight(width);
    final double bottomEdge = size.height - math.max(_margin, _keyboard + _margin);
    final double below = bottomEdge - (_barRect.bottom + _offset);
    final double above = _barRect.top - _offset - _margin;
    final bool top = natural > below && above > below;
    final double height = math.max(0, math.min(natural, top ? above : below));
    child.layout(BoxConstraints.tightFor(width: width, height: height), parentUsesSize: true);
    final double y = top ? _barRect.top - _offset - height : _barRect.bottom + _offset;
    _above = top;
    _viewRect = Rect.fromLTWH(_barRect.left, y, width, height);
    (child.parentData! as BoxParentData).offset = _viewRect.topLeft;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    if (child == null || _progress <= 0) {
      return;
    }
    final Offset at = offset + (child.parentData! as BoxParentData).offset;
    if (_progress >= 1) {
      context.paintChild(child, at);
      return;
    }
    final double edge = _above ? at.dy + child.size.height : at.dy;
    final Matrix4 grow = Matrix4.identity()
      ..translate(0.0, edge)
      ..scale(1.0, _progress.clamp(0, 1).toDouble())
      ..translate(0.0, -edge);
    context.pushOpacity(
      offset,
      (_progress.clamp(0, 1) * 255).round(),
      (PaintingContext context, Offset _) => context.pushTransform(
        needsCompositing,
        Offset.zero,
        grow,
        (PaintingContext context, Offset _) => context.paintChild(child, at),
      ),
    );
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    if (_progress <= 0) {
      return false;
    }
    return super.hitTestChildren(result, position: position);
  }
}

class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}

/// SRC-9, SRC-23: the full-screen view's modal route: it fades in over the open motion and out
/// over the close motion, scopes semantics (its page says so) and counts as a Tanrei modal overlay.
class _SearchViewRoute extends PopupRoute<void> {
  _SearchViewRoute({
    required this.builder,
    required this.enter,
    required this.exit,
    required this.enterCurve,
    required this.exitCurve,
    required this.onPopped,
  });

  final WidgetBuilder builder;
  final Duration enter;
  final Duration exit;
  final Curve enterCurve;
  final Curve exitCurve;
  final void Function(_SearchViewRoute route) onPopped;

  bool _counted = false;
  CurvedAnimation? _curve;

  @override
  bool get barrierDismissible => false;

  @override
  Color? get barrierColor => null;

  @override
  String? get barrierLabel => null;

  @override
  Duration get transitionDuration => enter;

  @override
  Duration get reverseTransitionDuration => exit;

  @override
  void install() {
    super.install();
    _counted = true;
    TanreiModalOverlays.instance.add();
  }

  void _uncount() {
    if (_counted) {
      _counted = false;
      TanreiModalOverlays.instance.remove();
    }
  }

  @override
  bool didPop(void result) {
    _uncount();
    final bool popped = super.didPop(result);
    onPopped(this);
    return popped;
  }

  @override
  void dispose() {
    _uncount();
    _curve?.dispose();
    super.dispose();
  }

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => Builder(builder: builder);

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) => FadeTransition(
    opacity: _curve ??= CurvedAnimation(
      parent: animation,
      curve: enterCurve,
      reverseCurve: exitCurve.flipped,
    ),
    child: child,
  );
}
