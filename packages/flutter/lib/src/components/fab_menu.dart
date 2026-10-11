import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/item_group.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'menu.dart';

/// One action of a [TanreiFabMenu] (the spec's item kind `item`): an icon and a label on a raised
/// container. [onPressed] is its `click`; the menu then closes.
@immutable
class TanreiFabMenuItem {
  /// Creates an item.
  const TanreiFabMenuItem({required this.label, required this.icon, this.onPressed});

  /// The item's text and its accessible name. Required.
  final String label;

  /// The item's glyph, drawn through the icon helper. Required; a null one is reported in debug
  /// builds.
  final Widget? icon;

  /// Called once per activation, before the menu closes with the reason `item`.
  final VoidCallback? onPressed;
}

/// A floating action button that opens a short column of related actions.
///
/// Implements `specs/fab-menu.spec.json` with the widgets library: `TanreiFabMenu(controller:,
/// semanticLabel:, icon:, variant:, size:, enabled:, items:, onToggle:, onClose:)`.
///
/// * The **toggle** is a floating action button of [size]. Activating it — pointer, touch, Enter,
///   Space, or Down or Up Arrow while closed — calls [onToggle] with the open value it asks for
///   (the spec's `toggle`) and opens or closes the menu through [controller] (the spec's `open`: a
///   `TanreiMenuController`, internal when null) (FBM-1). Its glyph is [icon] while closed and the
///   icon set's close glyph while open; its colors take the variant's `open.` look and its corners
///   round to `container.shape-open` (FBM-11, FBM-19).
/// * [items] (`TanreiFabMenuItem`s, the spec's item kind) are presented in the nearest `Overlay`
///   as a column above the toggle, `list.offset` from its top and `list.gap` apart, their end edges
///   aligned with the toggle's (FBM-13). Opening moves focus to the first item — to the last, the
///   one nearest the toggle, when Up Arrow opened it; closing returns it to the toggle. It is an
///   operated overlay that is not modal: no focus trap, nothing made inert, no scrim (FBM-14).
/// * When the menu asks to be closed — Escape, the platform's back, a press outside the items and
///   the toggle, Tab or Shift+Tab on an item, focus moving out, or an item's activation — [onClose]
///   is called once with the `TanreiMenuCloseReason` and the menu closes itself through the
///   controller (FBM-15, FBM-16). A press outside also reaches what is under it, as the menu's does.
/// * [enabled] false disables the toggle: it is not focusable, reacts to nothing, is drawn closed,
///   and no items are presented whatever the controller says (FBM-2).
/// * [semanticLabel] (the spec's `label`) names the toggle and the list of items (FBM-20).
///
/// It does not position itself (FBM-12): put it where a floating action button goes (a scaffold's
/// slot, or a `Stack` at the inline-end bottom corner). [TanreiFabMenu.inPlace] draws the open items
/// above the toggle in the layout, without the overlay and without motion — the fixtures' form
/// (FBM-13's `verify`), for tests, baselines and galleries.
///
/// Every design value comes from the `TanreiFabMenuTokens` of the active design system
/// (`TanreiTheme.of(context).system.fabMenu`). The toggle and each item resolve their own
/// interaction state and draw from their look's tokens of that state (FBM-3): the toggle its
/// variant's closed or `open.` parts, an item its `item.` parts. Presses, keyboard focus, the
/// press-hold, `pressedFeedback`, `focusStyle` and corner smoothing behave as `TanreiButton`'s
/// (FBM-4, FBM-8…10).
///
/// [variant] and [size] are open keys; a value the active system does not have renders
/// as the default (`filled`, `medium`) and is reported in debug builds (FBM-7).
class TanreiFabMenu extends StatefulWidget {
  /// Creates a FAB menu whose items are presented in the nearest `Overlay`.
  const TanreiFabMenu({
    super.key,
    this.controller,
    required this.semanticLabel,
    required this.icon,
    this.variant = TanreiFabMenuVariant.filled,
    this.size = TanreiFabMenuSize.medium,
    this.enabled = true,
    required this.items,
    this.onToggle,
    this.onClose,
    this.focusNode,
  }) : inPlace = false;

  /// The FAB menu drawn in place (FBM-13's `verify`): while [controller] is open, the items are
  /// laid out above the toggle, without the overlay and without motion. Everything else works.
  const TanreiFabMenu.inPlace({
    super.key,
    this.controller,
    required this.semanticLabel,
    required this.icon,
    this.variant = TanreiFabMenuVariant.filled,
    this.size = TanreiFabMenuSize.medium,
    this.enabled = true,
    required this.items,
    this.onToggle,
    this.onClose,
    this.focusNode,
  }) : inPlace = true;

  /// Opens and closes the menu (the spec's `open`); an internal one when null.
  final TanreiMenuController? controller;

  /// The accessible name of the toggle and of the list ("Create").
  final String semanticLabel;

  /// The toggle's glyph while closed.
  final Widget icon;

  /// Emphasis, as the floating action button's variants of the same names.
  final TanreiFabMenuVariant variant;

  /// The toggle's size (40 / 48 / 64 in the default system). The items keep one size.
  final TanreiFabMenuSize size;

  /// Whether the toggle reacts to input.
  final bool enabled;

  /// The actions, top to bottom: two to six.
  final List<TanreiFabMenuItem> items;

  /// Called with the open value the toggle asks for, before the menu opens or closes.
  final ValueChanged<bool>? onToggle;

  /// Called once with the reason when the menu asks to be closed.
  final ValueChanged<TanreiMenuCloseReason>? onClose;

  /// An optional focus node for the toggle.
  final FocusNode? focusNode;

  /// Whether this is the in-place form.
  final bool inPlace;

  @override
  State<TanreiFabMenu> createState() => _TanreiFabMenuState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('semanticLabel', semanticLabel))
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(FlagProperty('inPlace', value: inPlace, ifTrue: 'in place'));
  }
}

/// Stops the enclosing route from popping while the menu is open: the platform's back closes it
/// (FBM-15), as the menu's does.
class _FabMenuPopEntry extends PopEntry<Object?> {
  _FabMenuPopEntry(this.onBack);

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

class _EscapeIntent extends Intent {
  const _EscapeIntent();
}

class _TabIntent extends Intent {
  const _TabIntent({required this.forward});

  final bool forward;
}

const Map<ShortcutActivator, Intent> _listKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.escape): _EscapeIntent(),
  SingleActivator(LogicalKeyboardKey.tab): _TabIntent(forward: true),
  SingleActivator(LogicalKeyboardKey.tab, shift: true): _TabIntent(forward: false),
};

/// What an item needs from its menu.
abstract interface class _FabMenuHost {
  void requestClose(TanreiMenuCloseReason reason);
}

class _FabMenuScope extends InheritedWidget {
  const _FabMenuScope({
    required this.host,
    required this.variant,
    required this.count,
    required super.child,
  });

  final _FabMenuHost host;
  final TanreiFabMenuVariant variant;
  final int count;

  @override
  bool updateShouldNotify(_FabMenuScope oldWidget) =>
      host != oldWidget.host || variant != oldWidget.variant || count != oldWidget.count;
}

/// The ends of a motion, and of a part being shown: not design values.
const double _hidden = 0;
const double _shown = 1;

class _TanreiFabMenuState extends State<TanreiFabMenu>
    with
        TickerProviderStateMixin<TanreiFabMenu>,
        TanreiItemGroupMixin<TanreiFabMenu>,
        WidgetsBindingObserver
    implements _FabMenuHost {
  TanreiMenuController? _ownController;
  final OverlayPortalController _overlay = OverlayPortalController(debugLabel: 'TanreiFabMenu');
  final FocusNode _toggleNode = FocusNode(debugLabel: 'TanreiFabMenu toggle');
  final FocusNode _listNode = FocusNode(
    debugLabel: 'TanreiFabMenu list',
    skipTraversal: true,
    canRequestFocus: false,
  );
  final GlobalKey _toggleKey = GlobalKey(debugLabel: 'TanreiFabMenu toggle container');

  /// The toggle's open form, 0 → 1 (FBM-19).
  late final AnimationController _toggleMotion = AnimationController(vsync: this);

  /// The items coming in (0 → 1 over the open duration plus the stagger) or going out (1 → 0 over
  /// the close duration) (FBM-19).
  late final AnimationController _itemsMotion = AnimationController(vsync: this);

  bool _closing = false;
  bool _openedWithUp = false;
  bool? _tabForward;
  bool _returningFocus = false;
  bool _listHadFocus = false;
  TanreiMenuCloseReason? _reason;
  late final _FabMenuPopEntry _popEntry = _FabMenuPopEntry(
    () => requestClose(TanreiMenuCloseReason.back),
  );
  ModalRoute<Object?>? _route;
  Rect? _toggleRect;
  String _reported = '';

  TanreiMenuController get _controller =>
      widget.controller ?? (_ownController ??= TanreiMenuController());

  FocusNode get _toggleFocus => widget.focusNode ?? _toggleNode;

  /// Whether the menu is drawn open: enabled and open (FBM-2).
  bool get _open => widget.enabled && _controller.isOpen;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  TanreiFabMenuTokens get _tokens => TanreiTheme.of(context).system.fabMenu;

  // FBM-17: Down and Up Arrow wrapping, Home and End; no typeahead.
  @override
  bool get wrapsFocus => true;

  @override
  bool get typeaheadEnabled => false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleController);
    _toggleMotion.addListener(_rebuild);
    _itemsMotion
      ..addListener(_rebuild)
      ..addStatusListener(_handleItemsStatus);
    if (_open) {
      _toggleMotion.value = _toggleMotion.upperBound;
      _itemsMotion.value = _itemsMotion.upperBound;
      if (!widget.inPlace) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _open) {
            _show(animate: false);
          }
        });
      }
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _toggleMotion.duration = tanreiDuration(_tokens.motionOpenDuration);
    _toggleMotion.reverseDuration = tanreiDuration(_tokens.motionCloseDuration);
  }

  @override
  void didUpdateWidget(TanreiFabMenu oldWidget) {
    super.didUpdateWidget(oldWidget);
    final TanreiMenuController old = oldWidget.controller ?? _ownController!;
    if (!identical(old, _controller)) {
      old.removeListener(_handleController);
      _controller.addListener(_handleController);
    }
    if (oldWidget.enabled != widget.enabled || !identical(old, _controller)) {
      // After this build: presenting or removing the overlay is not done while building.
      WidgetsBinding.instance.addPostFrameCallback((_) => _handleController());
    }
    if (oldWidget.items.length != widget.items.length) {
      scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_handleController);
    _ownController?.dispose();
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _popEntry.dispose();
    _toggleMotion.dispose();
    _itemsMotion.dispose();
    _toggleNode.dispose();
    _listNode.dispose();
    super.dispose();
  }

  void _rebuild() => setState(() {});

  void _handleController() {
    if (!mounted) {
      return;
    }
    final bool open = _open;
    if (widget.inPlace) {
      // FBM-13's `verify`: in place, no motion.
      _toggleMotion.value = open ? _toggleMotion.upperBound : _toggleMotion.lowerBound;
      _itemsMotion.value = open ? _itemsMotion.upperBound : _itemsMotion.lowerBound;
      setState(() {});
      return;
    }
    if (open && (!_overlay.isShowing || _closing)) {
      _show(animate: !_reduceMotion);
    } else if (!open && _overlay.isShowing && !_closing) {
      _hide();
    } else {
      setState(() {});
    }
  }

  void _handleItemsStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && _closing) {
      _finishHide();
    }
  }

  /// FBM-13, FBM-19: present the items, turn the toggle, and move focus to the first item (the last
  /// when Up Arrow opened the menu).
  void _show({required bool animate}) {
    _closing = false;
    _reason = null;
    _listNode.descendantsAreFocusable = true;
    WidgetsBinding.instance.addObserver(this);
    _route = ModalRoute.of(context);
    _route?.registerPopEntry(_popEntry);
    setState(() => _overlay.show());
    final TanreiFabMenuTokens tokens = _tokens;
    final int count = widget.items.length;
    final Duration open = tanreiDuration(tokens.motionOpenDuration);
    _itemsMotion.duration = open + tanreiDuration(tokens.motionStagger) * math.max(0, count - 1);
    if (animate) {
      _toggleMotion.forward();
      _itemsMotion.forward(from: _itemsMotion.lowerBound);
    } else {
      _toggleMotion.value = _toggleMotion.upperBound;
      _itemsMotion.value = _itemsMotion.upperBound;
    }
    final bool byKeyboard = HardwareKeyboard.instance.logicalKeysPressed.isNotEmpty;
    final bool fromUp = _openedWithUp;
    _openedWithUp = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_overlay.isShowing || _closing) {
        return;
      }
      final List<TanreiGroupItem> items = orderedItems();
      final TanreiGroupItem? target = fromUp ? items.lastOrNull : items.firstOrNull;
      if (target != null) {
        focusItem(target);
        // Opened by a pointer: focus without the ring (FBM-4).
        if (!byKeyboard && target is _FabMenuItemState) {
          target.focusedByPointer = true;
        }
      }
    });
  }

  /// FBM-13, FBM-19: take the items away (fading out together), turn the toggle back, and return
  /// focus to the toggle when it was in the items.
  void _hide() {
    final bool focusInside = _listNode.hasFocus;
    _closing = true;
    WidgetsBinding.instance.removeObserver(this);
    _route?.unregisterPopEntry(_popEntry);
    _route = null;
    if (focusInside && _reason != TanreiMenuCloseReason.focusOut) {
      _returningFocus = true;
      _toggleFocus.requestFocus();
      // FBM-15: Tab and Shift+Tab move on from the toggle as they would have from it.
      if (_tabForward != null) {
        _listNode.descendantsAreFocusable = false;
        if (_tabForward!) {
          _toggleFocus.nextFocus();
        } else {
          _toggleFocus.previousFocus();
        }
      }
    }
    _tabForward = null;
    _listNode.descendantsAreFocusable = false;
    if (_reduceMotion || !_overlay.isShowing) {
      _toggleMotion.value = _toggleMotion.lowerBound;
      _itemsMotion.value = _itemsMotion.lowerBound;
      _finishHide();
    } else {
      _toggleMotion.reverse();
      _itemsMotion.duration = tanreiDuration(_tokens.motionCloseDuration);
      _itemsMotion.reverse();
      setState(() {});
    }
  }

  void _finishHide() {
    // Not while the frame builds or lays out (a controller changed by a rebuild): after it.
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _closing) {
          _finishHide();
        }
      });
      return;
    }
    _closing = false;
    if (_overlay.isShowing) {
      setState(() => _overlay.hide());
    }
  }

  @override
  Future<bool> didPopRoute() async {
    if (_overlay.isShowing && !_closing) {
      requestClose(TanreiMenuCloseReason.back);
      return true;
    }
    return false;
  }

  // FBM-15, FBM-16: the reason once; then closed through the controller.
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
    if (_controller.isOpen) {
      _controller.close();
    } else {
      _hide();
    }
  }

  // FBM-1: toggle with the opposite of open, then open or close through the controller.
  void _toggle() {
    if (!widget.enabled) {
      return;
    }
    final bool open = !_controller.isOpen;
    widget.onToggle?.call(open);
    if (open) {
      _controller.open();
    } else {
      _controller.close();
    }
  }

  // FBM-1, FBM-13: Down or Up Arrow on a closed toggle opens it, focusing the first or last item.
  void _openFromKeyboard({required bool up}) {
    if (widget.enabled && !_controller.isOpen) {
      _openedWithUp = up;
      _toggle();
    }
  }

  @override
  void focusItem(TanreiGroupItem item) {
    if (item is _FabMenuItemState) {
      item.focusedByPointer = false;
    }
    super.focusItem(item);
  }

  void _handleListFocus(bool focused) {
    if (focused == _listHadFocus) {
      return;
    }
    _listHadFocus = focused;
    if (_returningFocus) {
      _returningFocus = false;
      if (!focused) {
        return;
      }
    }
    // FBM-15: focus leaving the items (to anything but the toggle's own press) closes the menu.
    if (!focused && _overlay.isShowing && !_closing && !_toggleFocus.hasPrimaryFocus) {
      requestClose(TanreiMenuCloseReason.focusOut);
    }
  }

  void _handleTab(bool forward) {
    _tabForward = forward;
    requestClose(TanreiMenuCloseReason.tab);
    _tabForward = null;
  }

  /// FBM-23: an empty label, an item without a label or an icon, and fewer than two or more than
  /// six items, each reported once for each state of the menu that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[
        for (final TanreiFabMenuItem item in widget.items)
          if (item.icon == null) 'An item ("${item.label}") has no icon: it is drawn without one.',
        if (widget.items.length < 2 || widget.items.length > 6)
          'A FAB menu holds two to six items; this one holds ${widget.items.length}. It is drawn '
              'as it is.',
      ];
      final bool unnamed = !tanreiIsAccessibleName(widget.semanticLabel);
      final int unnamedItems = widget.items
          .where((TanreiFabMenuItem i) => !tanreiIsAccessibleName(i.label))
          .length;
      final String signature = '${problems.join('|')}|$unnamed|$unnamedItems';
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('fab-menu', 'items', problem, widget);
        }
        if (unnamed) {
          debugTanreiReportMissingName('fab menu', widget);
        }
        for (int i = 0; i < unnamedItems; i++) {
          debugTanreiReportMissingName('fab menu item', widget);
        }
      }
      return true;
    }());
  }

  /// The toggle's container in the overlay's coordinates.
  Rect? _computeToggleRect() {
    final RenderObject? overlay = Overlay.maybeOf(context)?.context.findRenderObject();
    final RenderObject? toggle = _toggleKey.currentContext?.findRenderObject();
    if (overlay is! RenderBox || toggle is! RenderBox || !toggle.hasSize) {
      return null;
    }
    return MatrixUtils.transformRect(toggle.getTransformTo(overlay), Offset.zero & toggle.size);
  }

  Widget _buildOverlay(BuildContext overlayContext) {
    final Rect? rect = _computeToggleRect();
    _toggleRect = rect;
    // FBM-12: follow the toggle when the layout moves it.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _overlay.isShowing && _computeToggleRect() != _toggleRect) {
        setState(() {});
      }
    });
    if (rect == null) {
      return const SizedBox.shrink();
    }
    return TapRegion(
      groupId: this,
      // FBM-15: a press outside the items and the toggle closes the menu; it also reaches what is
      // under it.
      onTapOutside: (_) => requestClose(TanreiMenuCloseReason.outside),
      child: CustomSingleChildLayout(
        delegate: _ListPosition(
          toggle: rect,
          offset: _tokens.listOffset,
          textDirection: Directionality.of(context),
        ),
        child: IgnorePointer(ignoring: _closing, child: _buildList()),
      ),
    );
  }

  /// FBM-13, FBM-18, FBM-20: the column of items, end-aligned, `list.gap` apart, as a menu named by
  /// the label; FBM-19: each fading and growing in from its end edge, the one nearest the toggle
  /// first.
  Widget _buildList() {
    final TanreiFabMenuTokens tokens = _tokens;
    final List<TanreiFabMenuItem> items = widget.items;
    final int count = items.length;
    final Duration openDuration = tanreiDuration(tokens.motionOpenDuration);
    final Duration stagger = tanreiDuration(tokens.motionStagger);
    final Duration total = _itemsMotion.duration ?? openDuration;
    final Curve openCurve = tokens.motionOpenEasing.toCurve();
    final Curve closeCurve = tokens.motionCloseEasing.toCurve();

    double progressOf(int index) {
      final double t = _itemsMotion.value;
      if (_closing) {
        // All together, the close easing applied to the close's own progress.
        return _shown - closeCurve.transform(_shown - t);
      }
      if (t >= _shown || total.inMicroseconds == 0) {
        return _shown;
      }
      // The item nearest the toggle (the last) first; each next one a stagger later.
      final int delay = (count - 1 - index) * stagger.inMicroseconds;
      final double local =
          ((t * total.inMicroseconds - delay) / math.max(1, openDuration.inMicroseconds))
              .clamp(_hidden, _shown)
              .toDouble();
      return openCurve.transform(local);
    }

    final List<Widget> children = <Widget>[
      for (int i = 0; i < count; i++)
        _ItemEntrance(
          progress: widget.inPlace ? _shown : progressOf(i),
          fadeOnly: _closing,
          child: _FabMenuItem(index: i, item: items[i]),
        ),
    ];
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.menu,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: Shortcuts(
        shortcuts: _listKeys,
        includeSemantics: false,
        child: Actions(
          actions: <Type, Action<Intent>>{
            _EscapeIntent: CallbackAction<_EscapeIntent>(
              onInvoke: (_) => requestClose(TanreiMenuCloseReason.escape),
            ),
            _TabIntent: CallbackAction<_TabIntent>(
              onInvoke: (_TabIntent i) => _handleTab(i.forward),
            ),
          },
          child: Focus(
            focusNode: _listNode,
            includeSemantics: false,
            onFocusChange: _handleListFocus,
            child: buildItemGroup(
              child: _FabMenuScope(
                host: this,
                variant: widget.variant,
                count: count,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  spacing: tokens.listGap,
                  children: children,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiFabMenuTokens tokens = _tokens;
    final double open = widget.enabled
        ? (_closing
              ? _shown - tokens.motionCloseEasing.toCurve().transform(_shown - _toggleMotion.value)
              : tokens.motionOpenEasing.toCurve().transform(_toggleMotion.value))
        : _hidden;
    final Widget toggle = CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.arrowDown): () => _openFromKeyboard(up: false),
        const SingleActivator(LogicalKeyboardKey.arrowUp): () => _openFromKeyboard(up: true),
      },
      child: _FabMenuToggle(
        containerKey: _toggleKey,
        variant: widget.variant,
        size: widget.size,
        onPressed: widget.enabled ? _toggle : null,
        focusNode: _toggleFocus,
        icon: widget.icon,
        open: open,
        expanded: widget.enabled ? _open : null,
        semanticLabel: widget.semanticLabel,
      ),
    );

    if (widget.inPlace) {
      // FBM-13's `verify`: the items in the layout above the toggle, no overlay, no motion.
      return _InPlaceFabMenu(
        containerSize: tokens.sizes[widget.size].containerSize,
        offset: tokens.listOffset,
        textDirection: Directionality.of(context),
        list: _open ? _buildList() : null,
        toggle: toggle,
      );
    }
    return TapRegion(
      groupId: this,
      child: OverlayPortal(controller: _overlay, overlayChildBuilder: _buildOverlay, child: toggle),
    );
  }
}

/// FBM-19: an item coming in (faded and grown from its end edge by [progress]) or going out
/// (faded only). Paint only, as the menu's surface grows: the item keeps its layout, its hit area
/// and its accessibility node throughout, so the menu is never empty to assistive technology.
class _ItemEntrance extends SingleChildRenderObjectWidget {
  const _ItemEntrance({
    required this.progress,
    required this.fadeOnly,
    required Widget super.child,
  });

  final double progress;
  final bool fadeOnly;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderItemEntrance(
    progress: progress,
    fadeOnly: fadeOnly,
    textDirection: Directionality.of(context),
  );

  @override
  void updateRenderObject(BuildContext context, _RenderItemEntrance renderObject) {
    renderObject
      ..progress = progress
      ..fadeOnly = fadeOnly
      ..textDirection = Directionality.of(context);
  }
}

class _RenderItemEntrance extends RenderProxyBox {
  _RenderItemEntrance({
    required double progress,
    required bool fadeOnly,
    required TextDirection textDirection,
  }) : _progress = progress,
       _fadeOnly = fadeOnly,
       _textDirection = textDirection;

  double _progress;
  set progress(double value) {
    if (value == _progress) {
      return;
    }
    final bool wasWhole = _progress >= _shown;
    _progress = value;
    if (wasWhole != (value >= _shown)) {
      markNeedsCompositingBitsUpdate();
    }
    markNeedsPaint();
  }

  bool _fadeOnly;
  set fadeOnly(bool value) {
    if (value != _fadeOnly) {
      _fadeOnly = value;
      markNeedsPaint();
    }
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value != _textDirection) {
      _textDirection = value;
      markNeedsPaint();
    }
  }

  @override
  bool get alwaysNeedsCompositing => child != null && _progress < _shown;

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    if (child == null || _progress <= _hidden) {
      return;
    }
    if (_progress >= _shown) {
      context.paintChild(child, offset);
      return;
    }
    final double p = _progress.clamp(_hidden, _shown).toDouble();
    // Grown from the end edge (the left one in a right-to-left layout), vertically centred.
    final double endX = _textDirection == TextDirection.rtl ? offset.dx : offset.dx + size.width;
    final double midY = offset.dy + size.height / 2;
    final double scale = _fadeOnly ? _shown : p;
    final Matrix4 grow = Matrix4.identity()
      ..translate(endX, midY)
      ..scale(scale, scale)
      ..translate(-endX, -midY);
    context.pushOpacity(
      offset,
      (p * 255).round(),
      (PaintingContext context, Offset _) => context.pushTransform(
        needsCompositing,
        Offset.zero,
        grow,
        (PaintingContext context, Offset _) => context.paintChild(child, offset),
      ),
    );
  }
}

/// Places the column of items above the toggle (FBM-13): its bottom `list.offset` above the
/// toggle's top, its end edge on the toggle's end edge (the left edge in a right-to-left layout,
/// FBM-22).
class _ListPosition extends SingleChildLayoutDelegate {
  const _ListPosition({required this.toggle, required this.offset, required this.textDirection});

  final Rect toggle;
  final double offset;
  final TextDirection textDirection;

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) => constraints.loosen();

  @override
  Offset getPositionForChild(Size size, Size childSize) => Offset(
    textDirection == TextDirection.rtl ? toggle.left : toggle.right - childSize.width,
    toggle.top - offset - childSize.height,
  );

  @override
  bool shouldRelayout(_ListPosition oldDelegate) =>
      toggle != oldDelegate.toggle ||
      offset != oldDelegate.offset ||
      textDirection != oldDelegate.textDirection;
}

/// The in-place form: the toggle at the bottom end, and — while open — the list above it, as
/// [_ListPosition] places it over the overlay.
class _InPlaceFabMenu extends StatelessWidget {
  const _InPlaceFabMenu({
    required this.containerSize,
    required this.offset,
    required this.textDirection,
    required this.list,
    required this.toggle,
  });

  final double containerSize;
  final double offset;
  final TextDirection textDirection;
  final Widget? list;
  final Widget toggle;

  @override
  Widget build(BuildContext context) {
    final Widget? list = this.list;
    if (list == null) {
      return toggle;
    }
    return CustomMultiChildLayout(
      delegate: _InPlaceLayout(
        containerSize: containerSize,
        offset: offset,
        textDirection: textDirection,
      ),
      children: <Widget>[
        LayoutId(id: #list, child: list),
        LayoutId(id: #toggle, child: toggle),
      ],
    );
  }
}

class _InPlaceLayout extends MultiChildLayoutDelegate {
  _InPlaceLayout({required this.containerSize, required this.offset, required this.textDirection});

  final double containerSize;
  final double offset;
  final TextDirection textDirection;

  Size _toggle = Size.zero;
  Size _list = Size.zero;

  @override
  Size getSize(BoxConstraints constraints) => constraints.biggest;

  @override
  void performLayout(Size size) {
    _toggle = layoutChild(#toggle, BoxConstraints.loose(size));
    _list = layoutChild(#list, BoxConstraints.loose(size));
    final bool rtl = textDirection == TextDirection.rtl;
    // The toggle at the bottom end; its drawn square centred in its target.
    final Offset toggleAt = Offset(
      rtl ? 0 : size.width - _toggle.width,
      size.height - _toggle.height,
    );
    positionChild(#toggle, toggleAt);
    final double inset = (_toggle.width - containerSize) / 2;
    final double top = toggleAt.dy + (_toggle.height - containerSize) / 2;
    final double end = rtl ? toggleAt.dx + inset : toggleAt.dx + inset + containerSize;
    positionChild(#list, Offset(rtl ? end : end - _list.width, top - offset - _list.height));
  }

  @override
  bool shouldRelayout(_InPlaceLayout oldDelegate) =>
      containerSize != oldDelegate.containerSize ||
      offset != oldDelegate.offset ||
      textDirection != oldDelegate.textDirection;
}

/// The toggle (FBM-1…11, FBM-19…21): a FAB whose colors, corners and glyph move to the open look
/// by [open].
class _FabMenuToggle extends StatefulWidget {
  const _FabMenuToggle({
    required this.containerKey,
    required this.variant,
    required this.size,
    required this.onPressed,
    required this.focusNode,
    required this.icon,
    required this.open,
    required this.expanded,
    required this.semanticLabel,
  });

  final GlobalKey containerKey;
  final TanreiFabMenuVariant variant;
  final TanreiFabMenuSize size;
  final VoidCallback? onPressed;
  final FocusNode focusNode;
  final Widget icon;

  /// How far the toggle is in its open form, 0–1 (the eased open or close motion).
  final double open;
  final bool? expanded;
  final String semanticLabel;

  @override
  State<_FabMenuToggle> createState() => _FabMenuToggleState();
}

class _FabMenuToggleState extends State<_FabMenuToggle>
    with
        TickerProviderStateMixin<_FabMenuToggle>,
        TanreiPressableStateMixin<_FabMenuToggle, TanreiControlVisuals> {
  TanreiFabMenuTokens get _tokens => TanreiTheme.of(context).system.fabMenu;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // FBM-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiFabMenuTokens tokens = theme.system.fabMenu;
    // FBM-7: total lookups, the default for a value the system does not have (reported).
    final TanreiFabMenuSizeTokens size = tokens.sizes[widget.size];
    final TanreiFabMenuVariantTokens variant = tokens.variants[widget.variant];
    final TanreiFabMenuVariantStateTokens drawn = variant.of(drawnState);
    final TanreiFabMenuVariantStateTokens container = variant.of(containerState);
    final TanreiFabMenuStateTokens? state = tokens.stateTokens(drawnState);
    final double open = widget.open;

    // FBM-3, FBM-11, FBM-19, FBM-21: the closed and the open look of the drawn state, as far as
    // the toggle is open; the corners from the size's to `container.shape-open`, both limited to a
    // circle.
    final TanreiControlVisuals closedLook = TanreiControlVisuals.resolve(
      theme,
      containerColor: container.containerColor,
      labelColor: drawn.iconColor,
      outlineColor: const TanreiPaint.none(),
      elevation: drawn.containerElevation,
      opacity: state?.opacity,
      shape: math.min(size.containerShape, size.containerSize / 2),
    );
    final TanreiControlVisuals openLook = TanreiControlVisuals.resolve(
      theme,
      containerColor: container.openContainerColor,
      labelColor: drawn.openIconColor,
      outlineColor: const TanreiPaint.none(),
      elevation: drawn.openContainerElevation,
      opacity: state?.opacity,
      shape: math.min(tokens.containerShapeOpen, size.containerSize / 2),
    );
    final TanreiControlVisuals visuals = animateVisuals(
      open <= _hidden
          ? closedLook
          : (open >= _shown ? openLook : TanreiControlVisuals.lerp(closedLook, openLook, open)),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: math.max(0, visuals.shape),
    );
    final double shown = open.clamp(_hidden, _shown).toDouble();

    Widget glyph(Widget slot) =>
        TanreiControlIcon(icon: slot, size: size.iconSize, selected: false, color: visuals.label);

    final Widget body = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: 0,
      ripple: rippleFor(
        pressedContainer: () {
          final TanreiFabMenuVariantStateTokens pressed = variant.of(interactionState);
          return Color.lerp(
            theme.paint(pressed.containerColor),
            theme.paint(pressed.openContainerColor),
            shown,
          )!;
        },
        container: visuals.container,
      ),
      // FBM-11: a square of the size's token, whatever the text size; FBM-19: the glyphs
      // cross-fade.
      child: SizedBox.square(
        key: widget.containerKey,
        dimension: size.containerSize,
        child: Stack(
          alignment: Alignment.center,
          children: <Widget>[
            if (shown < _shown) Opacity(opacity: _shown - shown, child: glyph(widget.icon)),
            if (shown > _hidden)
              Opacity(opacity: shown, child: glyph(const Text(tanreiCloseGlyph))),
          ],
        ),
      ),
    );

    // FBM-20: a button named by the label that says whether its menu is open.
    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      expanded: widget.expanded,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: shape.borderRadius,
              child: body,
            ),
          ),
        ),
      ),
    );
  }
}

/// One item (FBM-3, FBM-5, FBM-9, FBM-16, FBM-18): a raised container with an icon and a label,
/// pressed as a button, reached by the arrow keys.
class _FabMenuItem extends StatefulWidget {
  const _FabMenuItem({required this.index, required this.item});

  final int index;
  final TanreiFabMenuItem item;

  @override
  State<_FabMenuItem> createState() => _FabMenuItemState();
}

class _FabMenuItemState extends State<_FabMenuItem>
    with
        TickerProviderStateMixin<_FabMenuItem>,
        TanreiPressableStateMixin<_FabMenuItem, TanreiControlVisuals>
    implements TanreiGroupItem {
  _FabMenuScope? _scope;
  TanreiItemGroupMixin<StatefulWidget>? _group;
  final FocusNode _focusNode = FocusNode(debugLabel: 'TanreiFabMenuItem');

  /// Focus a pointer's opening put here: drawn without the ring until a key moves it (FBM-4).
  set focusedByPointer(bool value) => suppressFocusHighlight(value);

  @override
  FocusNode get focusNode => _focusNode;

  @override
  String get typeaheadText => widget.item.label;

  @override
  bool get takesFocus => true;

  TanreiFabMenuTokens get _tokens => TanreiTheme.of(context).system.fabMenu;

  // FBM-16: the item's click, then close(item).
  @override
  VoidCallback? get onPressed => () {
    widget.item.onPressed?.call();
    _scope?.host.requestClose(TanreiMenuCloseReason.item);
  };

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  void didChangeDependencies() {
    _scope = context.dependOnInheritedWidgetOfExactType<_FabMenuScope>();
    final TanreiItemGroupMixin<StatefulWidget>? group = TanreiItemGroupMixin.maybeOf(context);
    if (!identical(group, _group)) {
      _group?.unregisterItem(this);
      _group = group;
      _group?.registerItem(this);
    }
    super.didChangeDependencies();
  }

  @override
  void dispose() {
    _group?.unregisterItem(this);
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiFabMenuTokens tokens = theme.system.fabMenu;
    final TanreiFabMenuVariantTokens variant =
        tokens.variants[_scope?.variant ?? TanreiFabMenuVariant.filled];
    final TanreiFabMenuVariantStateTokens drawn = variant.of(drawnState);
    final TanreiFabMenuStateTokens? state = tokens.stateTokens(drawnState);
    // FBM-3, FBM-9, FBM-18: the item parts of its own state.
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).itemContainerColor,
        labelColor: drawn.itemLabelColor,
        outlineColor: const TanreiPaint.none(),
        elevation: drawn.itemContainerElevation,
        opacity: state?.opacity,
        shape: tokens.itemShape,
      ),
    );
    final Color iconColor = theme.paint(drawn.itemIconColor);
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );
    final Widget? icon = widget.item.icon;

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: 0,
      ripple: rippleFor(
        pressedContainer: () => theme.paint(variant.of(interactionState).itemContainerColor),
        container: visuals.container,
      ),
      child: ConstrainedBox(
        // FBM-5: at least the touch target tall, since stacked items cannot extend a hit area.
        constraints: BoxConstraints(
          minHeight: math.max(tokens.itemHeight, theme.system.measure.targetTouch),
        ),
        child: Padding(
          padding: EdgeInsetsDirectional.only(
            start: tokens.itemPaddingInlineStart,
            end: tokens.itemPaddingInlineEnd,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: tokens.itemGap,
            children: <Widget>[
              if (icon != null)
                TanreiControlIcon(
                  icon: icon,
                  size: tokens.itemIconSize,
                  selected: false,
                  color: iconColor,
                ),
              // FBM-18: one line while it fits, wrapping rather than truncating.
              Flexible(
                child: ExcludeSemantics(
                  child: Text(
                    widget.item.label,
                    style: tokens.itemLabelTypescale.toTextStyle(color: visuals.label),
                    softWrap: true,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // FBM-20: a menu item named by its label. (Flutter has no position in the menu or number of
    // items.)
    return Semantics(
      container: true,
      role: SemanticsRole.menuItem,
      label: tanreiIsAccessibleName(widget.item.label) ? widget.item.label : null,
      child: buildPressable(
        focusNode: _focusNode,
        child: Opacity(
          opacity: visuals.opacity,
          child: TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: shape.borderRadius,
            child: container,
          ),
        ),
      ),
    );
  }
}
