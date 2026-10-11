import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/check_mark.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/focus_ring.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/item_row.dart';
import '../primitives/menu_anchor_semantics.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Where a menu's surface goes against its anchor (the spec's `placement`).
enum TanreiMenuPlacement {
  /// Below the anchor, the start edges aligned.
  bottomStart,

  /// Below the anchor, the end edges aligned.
  bottomEnd,

  /// Above the anchor, the start edges aligned.
  topStart,

  /// Above the anchor, the end edges aligned.
  topEnd;

  /// Whether the surface goes above the anchor.
  bool get isTop => this == topStart || this == topEnd;

  /// Whether the start edges are aligned.
  bool get alignsStart => this == bottomStart || this == topStart;

  /// The placement named [name] (the spec's kebab-case: `bottom-start`), or [bottomStart] —
  /// reported in debug builds — for a name the menu does not define (MNU-14).
  static TanreiMenuPlacement fromName(String name) => tanreiEnumByName(
    values,
    name.replaceAllMapped(RegExp('-([a-z])'), (Match m) => m.group(1)!.toUpperCase()),
    fallback: TanreiMenuPlacement.bottomStart,
    kind: 'menu placement',
  );
}

/// Why a menu asks to be closed: the reason its `close` event carries (MNU-5, MNU-6), named as the
/// spec names them — escape, back, outside, tab, focus-out, item.
enum TanreiMenuCloseReason {
  /// Escape.
  escape,

  /// The platform's back (Android's back button or gesture: `WidgetsBindingObserver.didPopRoute`).
  back,

  /// A press outside the surface and the anchor.
  outside,

  /// Tab or Shift+Tab: focus moves on from the anchor.
  tab,

  /// Focus moved out of the menu some other way.
  focusOut,

  /// An item was activated.
  item,
}

/// Opens and closes a [TanreiMenuAnchor] (the spec's `open`), in the idiom of Flutter's
/// `MenuController`: [open] shows the menu, [close] removes it, [isOpen] says which.
///
/// A menu that asks to be closed (its `onClose`, with a reason) closes itself through its
/// controller; a product that closes it with [close] gets no `onClose`, as nothing asked.
class TanreiMenuController extends ChangeNotifier {
  bool _isOpen = false;

  /// Whether the menu is shown.
  bool get isOpen => _isOpen;

  /// Shows the menu.
  void open() {
    if (!_isOpen) {
      _isOpen = true;
      notifyListeners();
    }
  }

  /// Removes the menu.
  void close() {
    if (_isOpen) {
      _isOpen = false;
      notifyListeners();
    }
  }
}

/// Builds a menu's anchor: the product's own button, which usually calls `controller.open()`.
typedef TanreiMenuAnchorBuilder =
    Widget Function(BuildContext context, TanreiMenuController controller, Widget? child);

/// Offers a short set of actions or choices on a temporary surface that opens from the element
/// that asked for it.
///
/// Implements `specs/menu.spec.json` with the idiom of Flutter's `MenuAnchor`:
///
/// * [controller] is the spec's `open` (`TanreiMenuController.open()` / `.close()`);
/// * [placement] places the surface below or above the anchor, start or end edges aligned; it
///   flips when that side has no room, shifts to stay `surface.viewport-margin` inside the
///   viewport, limits its height to the room left and scrolls beyond it, and follows the anchor
///   (MNU-2);
/// * [onClose] is the spec's `close`, with its [TanreiMenuCloseReason]: `escape`, `back`,
///   `outside` (a press), `tab`, `focusOut` or `item` (an activation). The menu then closes itself
///   (MNU-5);
/// * [menuChildren] are the items: [TanreiMenuItem] (an action), [TanreiCheckboxMenuItem],
///   [TanreiRadioMenuItem] and [TanreiMenuGroup] (the spec's item kinds);
/// * [builder] and [child] build the anchor.
///
/// The surface is shown in the nearest `Overlay` (MNU-1). It is an operated overlay that is not
/// modal: opening moves focus to the first enabled item, closing returns it to the
/// anchor when it was inside; it traps nothing, makes nothing inert and draws no scrim (MNU-25).
/// The anchor is [childFocusNode] when given, else the first focusable node in the anchor. A press
/// outside also reaches what is under it (`consumeOutsideTaps` false, as Flutter's menus).
///
/// [TanreiMenuAnchor.inPlace] draws the open surface where it is built, at its natural size and
/// with its elevation, without an anchor, placement or motion: the fixtures' form (MNU-19), for
/// tests, baselines and galleries.
class TanreiMenuAnchor extends StatefulWidget {
  /// Creates a menu anchored to what [builder] or [child] builds.
  const TanreiMenuAnchor({
    super.key,
    required TanreiMenuController this.controller,
    this.placement = TanreiMenuPlacement.bottomStart,
    this.onClose,
    required this.menuChildren,
    this.builder,
    this.child,
    this.childFocusNode,
  }) : inPlace = false;

  /// The open menu drawn in place: the surface at its natural size, no anchor, placement or
  /// motion. [onClose] still reports what would close it.
  const TanreiMenuAnchor.inPlace({
    super.key,
    this.placement = TanreiMenuPlacement.bottomStart,
    this.onClose,
    required this.menuChildren,
  }) : controller = null,
       builder = null,
       child = null,
       childFocusNode = null,
       inPlace = true;

  /// Opens and closes the menu. Null for [TanreiMenuAnchor.inPlace].
  final TanreiMenuController? controller;

  /// Where the surface goes against the anchor.
  final TanreiMenuPlacement placement;

  /// Called once with the reason when the menu asks to be closed; the menu then closes.
  final ValueChanged<TanreiMenuCloseReason>? onClose;

  /// The items.
  final List<Widget> menuChildren;

  /// Builds the anchor.
  final TanreiMenuAnchorBuilder? builder;

  /// The anchor, or what [builder] receives.
  final Widget? child;

  /// The node focus returns to when the menu closes (else the first focusable node in the
  /// anchor).
  final FocusNode? childFocusNode;

  /// Whether this is the in-place form.
  final bool inPlace;

  @override
  State<TanreiMenuAnchor> createState() => _TanreiMenuAnchorState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiMenuPlacement>('placement', placement))
      ..add(FlagProperty('inPlace', value: inPlace, ifTrue: 'in place'));
  }
}

/// Stops the enclosing route from popping while the menu is open: the platform's back closes the
/// menu instead (MNU-5), in an app with a `Navigator`, which sees the back press first.
class _MenuPopEntry extends PopEntry<Object?> {
  _MenuPopEntry(this.onBack);

  final VoidCallback onBack;
  final ValueNotifier<bool> _canPop = ValueNotifier<bool>(false);

  @override
  ValueListenable<bool> get canPopNotifier => _canPop;

  @override
  void onPopInvokedWithResult(bool didPop, Object? result) {
    if (!didPop) {
      // Not while the route walks its entries: closing unregisters this one.
      scheduleMicrotask(onBack);
    }
  }

  void dispose() => _canPop.dispose();
}

/// What a menu's items need from it.
abstract interface class _MenuHost {
  void requestClose(TanreiMenuCloseReason reason);
  void focusByPointer(_MenuItemState item);
}

/// Whether [children] (and the items of their groups) hold a checkbox or radio item, and whether
/// any has a leading icon (MNU-19's reserved columns).
({bool mark, bool icon}) _columnsOf(List<Widget> children) {
  bool mark = false;
  bool icon = false;
  void visit(List<Widget> widgets) {
    for (final Widget widget in widgets) {
      if (widget is TanreiMenuEntry) {
        mark = mark || widget is TanreiCheckboxMenuItem || widget is TanreiRadioMenuItem;
        icon = icon || widget.leadingIcon != null;
      } else if (widget is TanreiMenuGroup) {
        visit(widget.children);
      }
    }
  }

  visit(children);
  return (mark: mark, icon: icon);
}

class _TanreiMenuAnchorState extends State<TanreiMenuAnchor>
    with
        SingleTickerProviderStateMixin<TanreiMenuAnchor>,
        TanreiItemGroupMixin<TanreiMenuAnchor>,
        WidgetsBindingObserver
    implements _MenuHost {
  final OverlayPortalController _overlay = OverlayPortalController(debugLabel: 'TanreiMenu');
  final FocusNode _anchorNode = FocusNode(
    debugLabel: 'TanreiMenu anchor',
    skipTraversal: true,
    canRequestFocus: false,
  );
  final FocusNode _surfaceNode = FocusNode(
    debugLabel: 'TanreiMenu surface',
    skipTraversal: true,
    canRequestFocus: false,
  );
  late final AnimationController _motion = AnimationController(vsync: this);
  late final CurvedAnimation _curve = CurvedAnimation(parent: _motion, curve: Curves.linear);

  /// While the surface fades out: its items take no focus and nothing reacts.
  bool _closing = false;
  FocusNode? _returnFocus;
  TanreiMenuCloseReason? _reason;
  final List<ScrollPosition> _scrolls = <ScrollPosition>[];
  late final _MenuPopEntry _popEntry = _MenuPopEntry(
    () => requestClose(TanreiMenuCloseReason.back),
  );
  ModalRoute<Object?>? _route;
  Rect? _anchorRect;

  @override
  bool get wrapsFocus => true;

  TanreiMenuController? get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller?.addListener(_handleController);
    _motion.addStatusListener(_handleMotionStatus);
    if (_controller?.isOpen ?? false) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _show();
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiMenuTokens tokens = TanreiTheme.of(context).system.menu;
    _motion
      ..duration = tanreiDuration(tokens.motionOpenDuration)
      ..reverseDuration = tanreiDuration(tokens.motionCloseDuration);
    _curve
      ..curve = tokens.motionOpenEasing.toCurve()
      // The close runs the parent from 1 to 0: flipped, the close easing eases the close's own
      // progress (an accelerating fade-out starts slowly), as MNU-4 means it.
      ..reverseCurve = tokens.motionCloseEasing.toCurve().flipped;
  }

  @override
  void didUpdateWidget(TanreiMenuAnchor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?.removeListener(_handleController);
      _controller?.addListener(_handleController);
      _handleController();
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_handleController);
    _stopFollowing();
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _popEntry.dispose();
    _curve.dispose();
    _motion.dispose();
    _anchorNode.dispose();
    _surfaceNode.dispose();
    super.dispose();
  }

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _handleController() {
    final bool open = _controller?.isOpen ?? false;

    if (open && (!_overlay.isShowing || _closing)) {
      _show();
    } else if (!open && _overlay.isShowing && !_closing) {
      _hide();
    }
  }

  void _handleMotionStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && _closing) {
      _finishHide();
    }
  }

  /// MNU-1: present the surface, then move focus to its first enabled item.
  void _show() {
    _closing = false;
    _reason = null;
    _surfaceNode.descendantsAreFocusable = true;
    _returnFocus = widget.childFocusNode ?? _anchorFocusable();
    WidgetsBinding.instance.addObserver(this);
    // MNU-5: the platform's back closes the menu, not the route it is in.
    _route = ModalRoute.of(context);
    _route?.registerPopEntry(_popEntry);
    _follow();
    setState(() => _overlay.show());
    // MNU-4: fade in and grow, at once where motion is reduced.
    if (_reduceMotion) {
      _motion.value = _motion.upperBound;
    } else {
      _motion.forward(from: _motion.lowerBound);
    }
    // Opened from the keyboard (the Enter or Space that pressed the anchor is still down), the
    // first item shows its focus; opened by a pointer, it takes focus without the ring (MNU-11).
    final bool byKeyboard = HardwareKeyboard.instance.logicalKeysPressed.isNotEmpty;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_overlay.isShowing) {
        return;
      }
      final List<TanreiGroupItem> items = orderedItems();
      final TanreiGroupItem? first =
          items.whereType<_MenuItemState>().where((_MenuItemState i) => i.isEnabled).firstOrNull ??
          items.firstOrNull;
      if (first != null) {
        focusItem(first);
        if (!byKeyboard && first is _MenuItemState) {
          first.focusedByPointer = true;
        }
      }
    });
  }

  /// MNU-1, MNU-4: take the surface away (fading out), returning focus to the anchor when it was
  /// inside.
  void _hide() {
    final bool focusInside = _surfaceNode.hasFocus;

    _closing = true;
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _route = null;
    _stopFollowing();
    if (focusInside && _reason != TanreiMenuCloseReason.focusOut) {
      _returningFocus = true;
      final FocusNode? anchor = _returnFocus;
      anchor?.requestFocus();
      // MNU-5: Tab and Shift+Tab move on from the anchor as they would have from it.
      if (anchor != null && _tabForward != null) {
        final bool forward = _tabForward!;
        _surfaceNode.descendantsAreFocusable = false;
        if (forward) {
          anchor.nextFocus();
        } else {
          anchor.previousFocus();
        }
      }
    }
    _tabForward = null;
    _surfaceNode.descendantsAreFocusable = false;
    if (_reduceMotion || !_overlay.isShowing) {
      _motion.value = _motion.lowerBound;
      _finishHide();
    } else {
      _motion.reverse();
      setState(() {});
    }
  }

  void _finishHide() {
    _closing = false;
    if (_overlay.isShowing) {
      setState(() => _overlay.hide());
    }
  }

  bool? _tabForward;

  /// Set while the menu itself moves focus out of the surface (returning it to the anchor), so
  /// that the surface does not read it as focus leaving (MNU-5).
  bool _returningFocus = false;
  bool _surfaceHadFocus = false;

  /// The first focusable node in the anchor, not in the surface.
  FocusNode? _anchorFocusable() {
    final FocusNode? focused = FocusManager.instance.primaryFocus;
    if (focused != null &&
        _anchorNode.descendants.contains(focused) &&
        !_surfaceNode.descendants.contains(focused)) {
      return focused;
    }
    return _anchorNode.descendants
        .where(
          (FocusNode node) =>
              node.canRequestFocus &&
              !node.skipTraversal &&
              node != _surfaceNode &&
              !_surfaceNode.descendants.contains(node),
        )
        .firstOrNull;
  }

  // MNU-2: follow the anchor while an ancestor scrolls.
  void _follow() {
    _stopFollowing();
    ScrollableState? scrollable = Scrollable.maybeOf(context);
    while (scrollable != null) {
      final ScrollPosition position = scrollable.position;
      position.addListener(_anchorMoved);
      _scrolls.add(position);
      scrollable = Scrollable.maybeOf(scrollable.context);
    }
  }

  void _stopFollowing() {
    for (final ScrollPosition position in _scrolls) {
      position.removeListener(_anchorMoved);
    }
    _scrolls.clear();
  }

  void _anchorMoved() {
    if (mounted && _overlay.isShowing) {
      setState(() {});
    }
  }

  @override
  Future<bool> didPopRoute() async {
    // MNU-5: the platform's back closes an open menu, and goes no further.
    if (_overlay.isShowing && !_closing) {
      requestClose(TanreiMenuCloseReason.back);
      return true;
    }
    return false;
  }

  @override
  void requestClose(TanreiMenuCloseReason reason) {
    if (widget.inPlace) {
      widget.onClose?.call(reason);
      return;
    }
    if (!_overlay.isShowing || _closing) {
      return;
    }
    _reason = reason;
    widget.onClose?.call(reason);
    if (_controller?.isOpen ?? false) {
      _controller!.close();
    } else {
      _hide();
    }
  }

  @override
  void focusItem(TanreiGroupItem item) {
    if (item is _MenuItemState) {
      // Focus from the keyboard shows (MNU-11); a pointer's does not (MNU-8).
      item.focusedByPointer = false;
      Scrollable.ensureVisible(item.context);
    }
    super.focusItem(item);
  }

  @override
  void focusByPointer(_MenuItemState item) {
    if (_closing || item.focusNode.hasPrimaryFocus) {
      return;
    }
    item.focusedByPointer = true;
    item.focusNode.requestFocus();
  }

  void _handleSurfaceFocus(bool focused) {
    // The node also notifies when what it lets its descendants do changes: only a change of focus
    // counts.
    if (focused == _surfaceHadFocus) {
      return;
    }
    _surfaceHadFocus = focused;
    if (_returningFocus) {
      _returningFocus = false;
      if (!focused) {
        return;
      }
    }
    // MNU-5: focus leaving the menu some other way closes it.
    if (!focused && _overlay.isShowing && !_closing) {
      requestClose(TanreiMenuCloseReason.focusOut);
    }
  }

  void _handleTab(bool forward) {
    _tabForward = forward;
    requestClose(TanreiMenuCloseReason.tab);
    _tabForward = null;
  }

  Rect _computeAnchorRect(BuildContext overlayContext) {
    final RenderBox overlay = Overlay.of(context).context.findRenderObject()! as RenderBox;
    final RenderBox anchor = context.findRenderObject()! as RenderBox;
    return MatrixUtils.transformRect(anchor.getTransformTo(overlay), Offset.zero & anchor.size);
  }

  Widget _buildOverlay(BuildContext overlayContext) {
    final Rect rect = _computeAnchorRect(overlayContext);
    _anchorRect = rect;
    // MNU-2: after this frame, check whether the anchor moved (a layout change); if so, place again.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _overlay.isShowing && _computeAnchorRect(overlayContext) != _anchorRect) {
        setState(() {});
      }
    });
    final TanreiMenuTokens tokens = TanreiTheme.of(context).system.menu;
    return TapRegion(
      groupId: this,
      // MNU-5: a press outside the surface and the anchor closes the menu; it also reaches what
      // is under it.
      onTapOutside: (_) => requestClose(TanreiMenuCloseReason.outside),
      child: AnimatedBuilder(
        animation: _curve,
        builder: (BuildContext context, Widget? child) => _MenuPosition(
          anchorRect: rect,
          placement: widget.placement,
          textDirection: Directionality.of(this.context),
          offset: tokens.surfaceOffset,
          margin: tokens.surfaceViewportMargin,
          minWidth: tokens.surfaceMinWidth,
          maxWidth: tokens.surfaceMaxWidth,
          progress: _curve.value,
          child: child,
        ),
        child: IgnorePointer(ignoring: _closing, child: _buildSurface()),
      ),
    );
  }

  Widget _buildSurface() {
    final ({bool mark, bool icon}) columns = _columnsOf(widget.menuChildren);
    return _MenuSurface(
      host: this,
      mark: columns.mark,
      icon: columns.icon,
      inPlace: widget.inPlace,
      surfaceNode: _surfaceNode,
      onFocusChange: _handleSurfaceFocus,
      onEscape: () => requestClose(TanreiMenuCloseReason.escape),
      onTab: _handleTab,
      group: (Widget child) => buildItemGroup(child: child),
      children: widget.menuChildren,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.inPlace) {
      final TanreiMenuTokens tokens = TanreiTheme.of(context).system.menu;
      // MNU-3: as wide as the widest item, within the width bounds.
      return ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: tokens.surfaceMinWidth,
          maxWidth: tokens.surfaceMaxWidth,
        ),
        child: IntrinsicWidth(child: _buildSurface()),
      );
    }
    final TanreiMenuController controller = _controller!;
    final bool open = _overlay.isShowing && !_closing;
    final Widget anchor =
        widget.builder?.call(context, controller, widget.child) ??
        widget.child ??
        const SizedBox.shrink();
    return Focus(
      focusNode: _anchorNode,
      includeSemantics: false,
      child: TapRegion(
        groupId: this,
        child: OverlayPortal(
          controller: _overlay,
          overlayChildBuilder: _buildOverlay,
          // MNU-24: the anchor says whether its menu is open (Flutter has no has-popup property),
          // unless it says so itself (a split button's trailing half, SPB-17).
          child: TanreiMenuAnchorOwnSemantics.of(context, widget)
              ? anchor
              : MergeSemantics(
                  child: Semantics(expanded: open, child: anchor),
                ),
        ),
      ),
    );
  }
}

class _EscapeIntent extends Intent {
  const _EscapeIntent();
}

class _TabIntent extends Intent {
  const _TabIntent({required this.forward});

  final bool forward;
}

const Map<ShortcutActivator, Intent> _surfaceKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.escape): _EscapeIntent(),
  SingleActivator(LogicalKeyboardKey.tab): _TabIntent(forward: true),
  SingleActivator(LogicalKeyboardKey.tab, shift: true): _TabIntent(forward: false),
};

class _TanreiMenuScope extends InheritedWidget {
  const _TanreiMenuScope({
    required this.host,
    required this.mark,
    required this.icon,
    required super.child,
  });

  final _MenuHost host;

  /// Whether the check column is reserved in every item (MNU-19).
  final bool mark;

  /// Whether the leading icon column is reserved in every item (MNU-19).
  final bool icon;

  @override
  bool updateShouldNotify(_TanreiMenuScope oldWidget) =>
      host != oldWidget.host || mark != oldWidget.mark || icon != oldWidget.icon;
}

/// The surface (MNU-3) and its items, with dividers between groups (MNU-23).
class _MenuSurface extends StatelessWidget {
  const _MenuSurface({
    required this.host,
    required this.mark,
    required this.icon,
    required this.inPlace,
    required this.surfaceNode,
    required this.onFocusChange,
    required this.onEscape,
    required this.onTab,
    required this.group,
    required this.children,
  });

  final _MenuHost host;
  final bool mark;
  final bool icon;
  final bool inPlace;
  final FocusNode surfaceNode;
  final ValueChanged<bool> onFocusChange;
  final VoidCallback onEscape;
  final ValueChanged<bool> onTab;
  final Widget Function(Widget child) group;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiMenuTokens tokens = theme.system.menu;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.surfaceShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.surfaceElevation,
      theme.colors,
    );
    // MNU-23: a divider between a group and whatever is next to it, none at the ends; inside the
    // surface's padding, as the rows are.
    final List<Widget> entries = <Widget>[];
    for (int i = 0; i < children.length; i++) {
      if (i > 0 && (children[i - 1] is TanreiMenuGroup || children[i] is TanreiMenuGroup)) {
        entries.add(const _MenuDivider());
      }
      entries.add(children[i]);
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      // MNU-24: the menu role.
      role: SemanticsRole.menu,
      child: Shortcuts(
        shortcuts: _surfaceKeys,
        includeSemantics: false,
        child: Actions(
          actions: <Type, Action<Intent>>{
            _EscapeIntent: CallbackAction<_EscapeIntent>(onInvoke: (_) => onEscape()),
            _TabIntent: CallbackAction<_TabIntent>(onInvoke: (_TabIntent i) => onTab(i.forward)),
          },
          child: Focus(
            focusNode: surfaceNode,
            includeSemantics: false,
            onFocusChange: onFocusChange,
            child: DecoratedBox(
              decoration: TanreiContainerDecoration(
                shape: shape,
                color: theme.paint(tokens.surfaceColor),
                border: elevation.ring,
                boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
              ),
              child: ClipPath(
                clipper: _ShapeClipper(shape),
                child: SingleChildScrollView(
                  child: Padding(
                    padding: EdgeInsetsDirectional.symmetric(
                      horizontal: tokens.surfacePaddingInline,
                      vertical: tokens.surfacePaddingBlock,
                    ),
                    child: group(
                      _TanreiMenuScope(
                        host: host,
                        mark: mark,
                        icon: icon,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: entries,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// MNU-23: a line of `divider.thickness` in `divider.color` across the surface's inner width
/// (inside `surface.padding-inline`, as the rows), with `divider.space` above and below; painted, so
/// no node.
class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiMenuTokens tokens = theme.system.menu;
    return Padding(
      padding: EdgeInsets.symmetric(vertical: tokens.dividerSpace),
      child: SizedBox(
        height: tokens.dividerThickness,
        child: ColoredBox(color: theme.paint(tokens.dividerColor)),
      ),
    );
  }
}

/// Places the surface against the anchor (MNU-2) and draws the open and close motion (MNU-4): it
/// fills the overlay, sizes the surface to its widest item within the width bounds, puts it on the
/// side [placement] names — or the other one when that has less room than the surface needs and the
/// other more — shifts it to stay [margin] inside, limits its height to the room left, and fades
/// and grows it from the edge facing the anchor as far as [progress].
class _MenuPosition extends SingleChildRenderObjectWidget {
  const _MenuPosition({
    required this.anchorRect,
    required this.placement,
    required this.textDirection,
    required this.offset,
    required this.margin,
    required this.minWidth,
    required this.maxWidth,
    required this.progress,
    super.child,
  });

  final Rect anchorRect;
  final TanreiMenuPlacement placement;
  final TextDirection textDirection;
  final double offset;
  final double margin;
  final double minWidth;
  final double maxWidth;
  final double progress;

  @override
  RenderTanreiMenuPosition createRenderObject(BuildContext context) => RenderTanreiMenuPosition(
    anchorRect: anchorRect,
    placement: placement,
    textDirection: textDirection,
    offset: offset,
    margin: margin,
    minWidth: minWidth,
    maxWidth: maxWidth,
    progress: progress,
  );

  @override
  void updateRenderObject(BuildContext context, RenderTanreiMenuPosition renderObject) {
    renderObject
      ..anchorRect = anchorRect
      ..placement = placement
      ..textDirection = textDirection
      ..offset = offset
      ..margin = margin
      ..minWidth = minWidth
      ..maxWidth = maxWidth
      ..progress = progress;
  }
}

/// The render object that places a menu's surface; public so that tests can read where it went.
class RenderTanreiMenuPosition extends RenderShiftedBox {
  /// Creates the render object.
  RenderTanreiMenuPosition({
    required Rect anchorRect,
    required TanreiMenuPlacement placement,
    required TextDirection textDirection,
    required double offset,
    required double margin,
    required double minWidth,
    required double maxWidth,
    required double progress,
  }) : _anchorRect = anchorRect,
       _placement = placement,
       _textDirection = textDirection,
       _offset = offset,
       _margin = margin,
       _minWidth = minWidth,
       _maxWidth = maxWidth,
       _progress = progress,
       super(null);

  Rect _anchorRect;
  set anchorRect(Rect value) => _relayout(_anchorRect != value, () => _anchorRect = value);

  TanreiMenuPlacement _placement;
  set placement(TanreiMenuPlacement value) =>
      _relayout(_placement != value, () => _placement = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _relayout(_textDirection != value, () => _textDirection = value);

  double _offset;
  set offset(double value) => _relayout(_offset != value, () => _offset = value);

  double _margin;
  set margin(double value) => _relayout(_margin != value, () => _margin = value);

  double _minWidth;
  set minWidth(double value) => _relayout(_minWidth != value, () => _minWidth = value);

  double _maxWidth;
  set maxWidth(double value) => _relayout(_maxWidth != value, () => _maxWidth = value);

  /// How far the open motion is (0: hidden, 1: whole).
  double get progress => _progress;
  double _progress;
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

  /// Whether the surface went above the anchor in the last layout (after flipping).
  bool get isAbove => _above;
  bool _above = false;

  /// Where the surface went in the last layout, in this box's coordinates.
  Rect get surfaceRect => _surfaceRect;
  Rect _surfaceRect = Rect.zero;

  @override
  bool get alwaysNeedsCompositing => child != null && _progress < 1;

  @override
  void performLayout() {
    size = constraints.biggest;
    final RenderBox? child = this.child;
    if (child == null) {
      return;
    }
    // MNU-3: as wide as the widest item, within the bounds and the viewport's room.
    final double room = math.max(0, size.width - 2 * _margin);
    final double widest = math.min(_maxWidth, room);
    final double width = child
        .getMaxIntrinsicWidth(double.infinity)
        .clamp(math.min(_minWidth, widest), widest)
        .toDouble();
    final double natural = child.getMaxIntrinsicHeight(width);
    // MNU-2: the named side, or the other when this one has too little room and the other more.
    final double below = size.height - _margin - (_anchorRect.bottom + _offset);
    final double above = _anchorRect.top - _offset - _margin;
    bool top = _placement.isTop;
    if (top && natural > above && below > above) {
      top = false;
    } else if (!top && natural > below && above > below) {
      top = true;
    }
    final double height = math.min(natural, math.max(0, top ? above : below));
    child.layout(BoxConstraints.tightFor(width: width, height: height), parentUsesSize: true);
    final bool rtl = _textDirection == TextDirection.rtl;
    final bool leftAligned = _placement.alignsStart != rtl;
    final double x = (leftAligned ? _anchorRect.left : _anchorRect.right - width)
        .clamp(_margin, math.max(_margin, size.width - _margin - width))
        .toDouble();
    final double y = top ? _anchorRect.top - _offset - height : _anchorRect.bottom + _offset;
    _above = top;
    _surfaceRect = Rect.fromLTWH(x, y, width, height);
    (child.parentData! as BoxParentData).offset = Offset(x, y);
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
    // MNU-4: fade, and grow from the edge that faces the anchor.
    final double edge = _above ? at.dy + child.size.height : at.dy;
    final Matrix4 grow = Matrix4.identity()
      ..translate(0.0, edge)
      ..scale(1.0, _progress)
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

/// A group of a menu's items (the spec's item kind `group`): a run of related items, optionally
/// under a [title], set apart from what is next to it by a divider (MNU-23). It is also the radio
/// group of its [TanreiRadioMenuItem]s: [groupValue] is the value of the checked one (null: none),
/// and [onChanged] is the group's `change`, called with the value of a radio item the user chose
/// (MNU-6).
///
/// A group inside a group is drawn as its outer group's items, without a title or a divider of
/// its own, and reported in debug builds (MNU-29).
class TanreiMenuGroup<T> extends StatefulWidget {
  /// Creates a group of [children].
  const TanreiMenuGroup({
    super.key,
    this.title = '',
    this.groupValue,
    this.onChanged,
    required this.children,
  });

  /// The heading drawn above the items, which also names the group; empty draws none.
  final String title;

  /// The value of the checked radio item.
  final T? groupValue;

  /// Called with the value of the radio item the user chose.
  final ValueChanged<T>? onChanged;

  /// The group's items.
  final List<Widget> children;

  @override
  State<TanreiMenuGroup<T>> createState() => _TanreiMenuGroupState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('title', title, defaultValue: ''))
      ..add(DiagnosticsProperty<T>('groupValue', groupValue, defaultValue: null));
  }
}

/// What a radio item needs from its group.
class _TanreiMenuGroupScope extends InheritedWidget {
  const _TanreiMenuGroupScope({
    required this.groupValue,
    required this.select,
    required super.child,
  });

  final Object? groupValue;
  final ValueChanged<Object?> select;

  @override
  bool updateShouldNotify(_TanreiMenuGroupScope oldWidget) => groupValue != oldWidget.groupValue;
}

class _TanreiMenuGroupState<T> extends State<TanreiMenuGroup<T>> {
  String _reported = '';

  bool get _nested => context.getInheritedWidgetOfExactType<_TanreiMenuGroupScope>() != null;

  /// MNU-29: a nested group, a value that names none of the radio items, or two radio items with
  /// one value are reported once for each state that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[];
      if (_nested) {
        problems.add(
          'A group inside a group: its items are drawn as the outer group\'s, with no '
          'title or divider of its own.',
        );
      }
      final List<Object?> values = <Object?>[
        for (final Widget child in widget.children)
          if (child is TanreiRadioMenuItem) child.value,
      ];
      if (widget.groupValue != null && values.isNotEmpty && !values.contains(widget.groupValue)) {
        problems.add(
          'The group value "${widget.groupValue}" names none of its radio items: none is '
          'checked.',
        );
      }
      final Set<Object?> seen = <Object?>{};
      for (final Object? value in values) {
        if (!seen.add(value)) {
          problems.add('Two radio items have the value "$value": they are checked together.');
        }
      }
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('menu', 'groupValue', problem, widget);
        }
      }
      return true;
    }());
  }

  void _select(Object? value) {
    if (value != widget.groupValue && value is T) {
      widget.onChanged?.call(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    if (_nested) {
      // MNU-29: the outer group's items; its radio items belong to the outer group.
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: widget.children,
      );
    }
    final bool titled = tanreiIsAccessibleName(widget.title);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      // MNU-24: a group, named by its title (Flutter has no group role: a named container node).
      label: titled ? widget.title : null,
      child: _TanreiMenuGroupScope(
        groupValue: widget.groupValue,
        select: _select,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[if (titled) _GroupTitle(widget.title), ...widget.children],
        ),
      ),
    );
  }
}

/// MNU-28: a group's title, starting where the items' labels start, in the title's style; no
/// focus, not an item (its text is the group's name).
class _GroupTitle extends StatelessWidget {
  const _GroupTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiMenuTokens tokens = theme.system.menu;
    final _TanreiMenuScope? scope = context.dependOnInheritedWidgetOfExactType<_TanreiMenuScope>();
    final double columns =
        ((scope?.mark ?? false) ? tokens.markSize + tokens.containerGap : 0) +
        ((scope?.icon ?? false) ? tokens.leadingIconSize + tokens.containerGap : 0);
    return Padding(
      padding: EdgeInsetsDirectional.only(
        start: tokens.containerPaddingInline + columns,
        end: tokens.containerPaddingInline,
        top: tokens.containerPaddingBlock,
        bottom: tokens.containerPaddingBlock,
      ),
      child: ExcludeSemantics(
        child: Text(
          title,
          style: tokens.groupTitleTypescale.toTextStyle(color: theme.paint(tokens.groupTitleColor)),
          softWrap: true,
        ),
      ),
    );
  }
}

/// What every item of a menu has: the label ([child], the spec's `label`), a line of
/// [supportingText], a [leadingIcon], [trailingText] (usually the keyboard shortcut) and a
/// [trailingIcon]. The item kinds are [TanreiMenuItem], [TanreiCheckboxMenuItem] and
/// [TanreiRadioMenuItem].
abstract class TanreiMenuEntry extends StatefulWidget {
  /// Creates an item.
  const TanreiMenuEntry({
    super.key,
    required this.child,
    this.supportingText = '',
    this.leadingIcon,
    this.trailingIcon,
    this.trailingText = '',
    this.focusNode,
  });

  /// The label: usually a `Text`, whose text is then the item's accessible name and what
  /// typeahead matches. An empty `Text` still renders and is reported in debug builds (MNU-26).
  final Widget child;

  /// A line below the label that says more about the item.
  final String supportingText;

  /// An icon before the label (a slot drawn through the icon helper).
  final Widget? leadingIcon;

  /// An icon at the end of the row.
  final Widget? trailingIcon;

  /// Text at the end of the row, usually the keyboard shortcut of the same action.
  final String trailingText;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether the item reacts to input.
  bool get isEnabled;

  /// The text of [child] when it is a `Text`; null otherwise.
  String? get labelText => switch (child) {
    Text(:final String? data, :final InlineSpan? textSpan) => data ?? textSpan?.toPlainText(),
    _ => null,
  };

  @override
  State<TanreiMenuEntry> createState() => _MenuItemState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('child', labelText))
      ..add(StringProperty('supportingText', supportingText, defaultValue: ''))
      ..add(StringProperty('trailingText', trailingText, defaultValue: ''))
      ..add(FlagProperty('enabled', value: isEnabled, ifFalse: 'disabled'));
  }
}

/// An action in a menu (the spec's item kind `item`), as Flutter's `MenuItemButton`: [onPressed] is
/// its `click` — called once per activation, after which the menu closes (MNU-6) — and a null
/// [onPressed] disables it. [destructive] draws an action that deletes or discards something in the
/// `destructive` condition (the error color, MNU-18).
class TanreiMenuItem extends TanreiMenuEntry {
  /// Creates an action.
  const TanreiMenuItem({
    super.key,
    required this.onPressed,
    required super.child,
    super.supportingText,
    super.leadingIcon,
    super.trailingIcon,
    super.trailingText,
    this.destructive = false,
    super.focusNode,
  });

  /// Called once per activation; null disables the item.
  final VoidCallback? onPressed;

  /// Whether the action deletes or discards something.
  final bool destructive;

  @override
  bool get isEnabled => onPressed != null;
}

/// An option in a menu that is switched on or off on its own (the spec's item kind
/// `checkbox-item`), as Flutter's `CheckboxMenuButton`: [value] is its `checked`, [onChanged] its
/// `change` (called with the new value; the owner stores it), and a null [onChanged] disables it.
/// Activated by pointer, touch or Enter the menu then closes; by Space it stays open (MNU-6).
class TanreiCheckboxMenuItem extends TanreiMenuEntry {
  /// Creates a checkbox item.
  const TanreiCheckboxMenuItem({
    super.key,
    required this.value,
    required this.onChanged,
    required super.child,
    super.supportingText,
    super.leadingIcon,
    super.trailingIcon,
    super.trailingText,
    super.focusNode,
  });

  /// Whether the option is on.
  final bool value;

  /// Called with the new value; null disables the item.
  final ValueChanged<bool>? onChanged;

  @override
  bool get isEnabled => onChanged != null;
}

/// One choice of several in a menu (the spec's item kind `radio-item`), as Flutter's
/// `RadioMenuButton` under a `RadioGroup`: [value] identifies it, and it is checked while the
/// `groupValue` of its [TanreiMenuGroup] equals it. Choosing it calls the group's `onChanged`; a
/// checked one emits nothing (MNU-6). [enabled] false disables it. Outside a group it is drawn
/// unchecked and reported in debug builds (MNU-29).
class TanreiRadioMenuItem<T> extends TanreiMenuEntry {
  /// Creates a radio item.
  const TanreiRadioMenuItem({
    super.key,
    required this.value,
    this.enabled = true,
    required super.child,
    super.supportingText,
    super.leadingIcon,
    super.trailingIcon,
    super.trailingText,
    super.focusNode,
  });

  /// Identifies the choice.
  final T value;

  /// Whether the item reacts to input.
  final bool enabled;

  @override
  bool get isEnabled => enabled;
}

/// How an item looks in one condition and state.
@immutable
class _MenuVisuals {
  const _MenuVisuals({
    required this.container,
    required this.label,
    required this.supporting,
    required this.trailingText,
    required this.leadingIcon,
    required this.trailingIcon,
    required this.mark,
    required this.opacity,
    required this.shape,
    required this.check,
  });

  final Color container;
  final Color label;
  final Color supporting;
  final Color trailingText;
  final Color leadingIcon;
  final Color trailingIcon;
  final Color mark;
  final double opacity;
  final double shape;
  final double check;

  static _MenuVisuals lerp(_MenuVisuals a, _MenuVisuals b, double t) => _MenuVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    label: tanreiLerpColor(a.label, b.label, t),
    supporting: tanreiLerpColor(a.supporting, b.supporting, t),
    trailingText: tanreiLerpColor(a.trailingText, b.trailingText, t),
    leadingIcon: tanreiLerpColor(a.leadingIcon, b.leadingIcon, t),
    trailingIcon: tanreiLerpColor(a.trailingIcon, b.trailingIcon, t),
    mark: tanreiLerpColor(a.mark, b.mark, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
    check: lerpDouble(a.check, b.check, t)!,
  );
}

/// A resting row is not dimmed.
const double _opaque = 1;

class _MenuItemState extends State<TanreiMenuEntry>
    with
        TickerProviderStateMixin<TanreiMenuEntry>,
        TanreiPressableStateMixin<TanreiMenuEntry, _MenuVisuals>,
        TanreiSelectionTransitionMixin<TanreiMenuEntry, _MenuVisuals>
    implements TanreiGroupItem {
  _TanreiMenuScope? _scope;
  _TanreiMenuGroupScope? _groupScope;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  FocusNode? _internalFocusNode;
  bool _reportedOutsideGroup = false;

  /// Whether the item has focus because a pointer moved onto it (MNU-8): drawn hovered, no ring.
  bool get focusedByPointer => _focusedByPointer;
  bool _focusedByPointer = false;
  set focusedByPointer(bool value) {
    _focusedByPointer = value;
    suppressFocusHighlight(value);
  }

  @override
  FocusNode get focusNode => widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  @override
  String get typeaheadText => widget.labelText ?? '';

  @override
  bool get takesFocus => true;

  TanreiMenuTokens get _tokens => TanreiTheme.of(context).system.menu;

  /// Whether a checkbox or radio item is checked.
  bool get _checked => switch (widget) {
    final TanreiCheckboxMenuItem item => item.value,
    final TanreiRadioMenuItem<Object?> item =>
      _groupScope != null && _groupScope!.groupValue == item.value,
    _ => false,
  };

  /// MNU-18: destructive for a destructive action, selected for a checked item.
  TanreiMenuCondition get _condition => switch (widget) {
    TanreiMenuItem(destructive: true) => TanreiMenuCondition.destructive,
    _ => _checked ? TanreiMenuCondition.selected : TanreiMenuCondition.unselected,
  };

  @override
  VoidCallback? get onPressed => widget.isEnabled ? _activate : null;

  // MNU-7: a disabled item is reached by the arrow keys.
  @override
  bool get focusableWhileDisabled => true;

  /// MNU-6: an action's click, a checkbox item's change, a radio item's group change; then the
  /// menu closes — except after a checkbox or radio item activated with Space.
  void _activate() {
    final bool bySpace = HardwareKeyboard.instance.isLogicalKeyPressed(LogicalKeyboardKey.space);
    switch (widget) {
      case TanreiMenuItem(:final VoidCallback? onPressed):
        onPressed?.call();
        _scope?.host.requestClose(TanreiMenuCloseReason.item);
        return;
      case TanreiCheckboxMenuItem(:final bool value, :final ValueChanged<bool>? onChanged):
        onChanged?.call(!value);
      case final TanreiRadioMenuItem<Object?> item:
        if (!_checked) {
          _groupScope?.select(item.value);
        }
    }
    if (!bySpace) {
      _scope?.host.requestClose(TanreiMenuCloseReason.item);
    }
  }

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // MNU-16: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _MenuVisuals lerpVisuals(_MenuVisuals a, _MenuVisuals b, double t) => _MenuVisuals.lerp(a, b, t);

  // MNU-22: checking or unchecking while open eases over the state motion.
  @override
  Object get selectionCondition => _condition.name;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Curve get selectionCurve => _tokens.motionStateEasing.toCurve();

  @override
  _MenuVisuals lerpSelection(_MenuVisuals a, _MenuVisuals b, double t) =>
      _MenuVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
    focusNode.addListener(_handleFocus);
  }

  void _handleFocus() {
    if (!focusNode.hasFocus && _focusedByPointer) {
      focusedByPointer = false;
    }
  }

  @override
  void didChangeDependencies() {
    // The menu and the group first: the mixins read the condition.
    _scope = context.dependOnInheritedWidgetOfExactType<_TanreiMenuScope>();
    _groupScope = context.dependOnInheritedWidgetOfExactType<_TanreiMenuGroupScope>();
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      _group?.unregisterItem(this);
      _group = group;
      _group?.registerItem(this);
    }
    _debugReportOutsideGroup();
    super.didChangeDependencies();
  }

  @override
  void didUpdateWidget(TanreiMenuEntry oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      (oldWidget.focusNode ?? _internalFocusNode)?.removeListener(_handleFocus);
      focusNode.addListener(_handleFocus);
      _group?.unregisterItem(this);
      _group?.registerItem(this);
    }
  }

  @override
  void dispose() {
    focusNode.removeListener(_handleFocus);
    _group?.unregisterItem(this);
    _internalFocusNode?.dispose();
    super.dispose();
  }

  /// MNU-26: an empty label is reported in debug builds — when first built so, and when it loses
  /// the one it had. A label that is not a `Text` names itself through its own semantics.
  void _debugReportMissingName(TanreiMenuEntry? oldWidget) {
    assert(() {
      bool named(TanreiMenuEntry entry) =>
          entry.labelText == null || tanreiIsAccessibleName(entry.labelText);
      if ((oldWidget == null || named(oldWidget)) && !named(widget)) {
        debugTanreiReportMissingName('menu item', widget);
      }
      return true;
    }());
  }

  /// MNU-29: a radio item outside a group is drawn unchecked and reported, once.
  void _debugReportOutsideGroup() {
    assert(() {
      if (widget is TanreiRadioMenuItem && _groupScope == null && !_reportedOutsideGroup) {
        _reportedOutsideGroup = true;
        debugTanreiReportIgnoredValue(
          'menu',
          'value',
          'A radio item outside a group: nothing holds its choice, and it is drawn unchecked.',
          widget,
        );
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiMenuTokens tokens = theme.system.menu;
    final TanreiMenuCondition conditionKey = _condition;
    final TanreiMenuConditionTokens condition = tokens.conditions[conditionKey];
    final bool checked = conditionKey == TanreiMenuCondition.selected;
    final TanreiMenuConditionStateTokens drawn = condition.of(drawnState);
    final TanreiMenuStateTokens? state = tokens.stateTokens(drawnState);
    // MNU-10, MNU-13, MNU-16: the drawn state's tokens of the condition, the container of the
    // state the pressed feedback names; MNU-22, MNU-27: condition and state changes ease.
    final _MenuVisuals visuals = animateVisuals(
      animateSelection(
        _MenuVisuals(
          container: theme.paint(condition.of(containerState).containerColor),
          label: theme.paint(drawn.labelColor),
          supporting: theme.paint(drawn.supportingTextColor),
          trailingText: theme.paint(drawn.trailingTextColor),
          leadingIcon: theme.paint(drawn.leadingIconColor),
          trailingIcon: theme.paint(drawn.trailingIconColor),
          mark: theme.paint(drawn.markColor),
          opacity: state?.opacity ?? _opaque,
          shape: state?.containerShape ?? tokens.containerShape,
          check: checked ? 1 : 0,
        ),
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );

    // MNU-19: the check column and the icon column, each reserved in every item while any item
    // needs it.
    final bool markColumn = _scope?.mark ?? widget is! TanreiMenuItem;
    final bool iconColumn = _scope?.icon ?? widget.leadingIcon != null;
    final List<Widget> leading = <Widget>[
      if (markColumn)
        CustomPaint(
          size: Size.square(tokens.markSize),
          painter: TanreiCheckMarkPainter(
            color: visuals.mark,
            width: tokens.markWidth,
            progress: visuals.check,
          ),
        ),
      if (iconColumn)
        SizedBox.square(
          dimension: tokens.leadingIconSize,
          child: switch (widget.leadingIcon) {
            // MNU-21: through the icon helper, with the item's selection.
            final Widget icon => TanreiControlIcon(
              icon: icon,
              size: tokens.leadingIconSize,
              selected: checked,
              color: visuals.leadingIcon,
            ),
            null => null,
          },
        ),
    ];
    final List<Widget> trailing = <Widget>[
      if (widget.trailingText.isNotEmpty)
        Flexible(
          child: Text(
            widget.trailingText,
            style: tokens.trailingTextTypescale.toTextStyle(color: visuals.trailingText),
            softWrap: true,
          ),
        ),
      if (widget.trailingIcon case final Widget icon)
        TanreiControlIcon(
          icon: icon,
          size: tokens.trailingIconSize,
          selected: checked,
          color: visuals.trailingIcon,
        ),
    ];
    final String? labelText = widget.labelText;

    // MNU-19, MNU-20: one row; the label and supporting text wrap and grow with the text size.
    final Widget row = TanreiItemRow(
      leading: leading.isEmpty
          ? null
          : ExcludeSemantics(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: tokens.containerGap,
                children: leading,
              ),
            ),
      headline: ExcludeSemantics(
        excluding: labelText != null,
        child: DefaultTextStyle(
          style: tokens.labelTypescale.toTextStyle(color: visuals.label),
          softWrap: true,
          child: IconTheme.merge(
            data: IconThemeData(color: visuals.label),
            child: widget.child,
          ),
        ),
      ),
      supporting: widget.supportingText.isEmpty
          ? null
          : ExcludeSemantics(
              child: Text(
                widget.supportingText,
                style: tokens.supportingTextTypescale.toTextStyle(color: visuals.supporting),
                softWrap: true,
              ),
            ),
      trailing: trailing.isEmpty
          ? null
          : ExcludeSemantics(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: tokens.containerGap,
                children: trailing,
              ),
            ),
      paddingStart: tokens.containerPaddingInline,
      paddingEnd: tokens.containerPaddingInline,
      paddingBlock: tokens.containerPaddingBlock,
      gap: tokens.containerGap,
      minHeights: <double>[tokens.containerHeight],
      // MNU-12: at least the touch target tall (Flutter cannot tell a fine pointer in advance).
      minTarget: theme.system.measure.targetTouch,
      alignment: TanreiItemRowAlignment.firstLine,
    );

    final Widget item = MouseRegion(
      // MNU-8: a pointer moving onto the item moves focus to it, without the focus ring.
      onEnter: (_) => _scope?.host.focusByPointer(this),
      child: buildPressable(
        focusNode: focusNode,
        child: Opacity(
          opacity: visuals.opacity,
          // MNU-11, MNU-17: the focus ring inside the row, as the focus style says.
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
                  pressedContainer: () =>
                      theme.paint(condition.of(interactionState).containerColor),
                  container: visuals.container,
                ),
              ),
              child: row,
            ),
          ),
        ),
      ),
    );

    // MNU-24: the item's role and checked state; the label names it, and the supporting and
    // trailing text (the shortcut: Flutter has no shortcut property) describe it.
    final String description = <String>[
      widget.supportingText,
      widget.trailingText,
    ].where((String text) => text.isNotEmpty).join('\n');
    final bool isRadio = widget is TanreiRadioMenuItem;
    return Semantics(
      container: true,
      role: switch (widget) {
        TanreiCheckboxMenuItem() => SemanticsRole.menuItemCheckbox,
        TanreiRadioMenuItem() => SemanticsRole.menuItemRadio,
        _ => SemanticsRole.menuItem,
      },
      enabled: isEnabled,
      checked: widget is TanreiMenuItem ? null : checked,
      inMutuallyExclusiveGroup: isRadio ? true : null,
      label: labelText,
      hint: description.isEmpty ? null : description,
      child: item,
    );
  }
}

/// Clips the surface to its shape, corner smoothing included.
class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}
