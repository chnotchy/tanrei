import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/focus_ring.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/pressable.dart';
import '../primitives/sheet.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// The two forms of a [TanreiBottomSheet] (the spec's `variant`; not a token axis: both read the
/// same container tokens, and the scrim and the behaviour set them apart).
enum TanreiBottomSheetVariant {
  /// Over the lower part of the content, which stays usable: a layout region.
  standard,

  /// Over a scrim that dims and blocks everything else, holding focus until it closes: a modal
  /// overlay.
  modal;

  /// The variant named [name] (a fixture's, a server-driven screen's), or [modal], the default,
  /// for a name the bottom sheet does not define — reported in debug builds (BSH-25).
  static TanreiBottomSheetVariant fromName(String name) =>
      tanreiEnumByName(values, name, fallback: modal, kind: 'bottom-sheet variant');
}

/// The height a [TanreiBottomSheet] rests at while its content is taller than it (the spec's
/// `detent`).
enum TanreiBottomSheetDetent {
  /// `comp.bottom-sheet.container.partial-fraction` of the area it covers.
  partial,

  /// The area's height less `comp.bottom-sheet.container.margin-block-start`.
  full;

  /// The detent named [name], or [partial], the default, for a name the bottom sheet does not
  /// define — reported in debug builds (BSH-25).
  static TanreiBottomSheetDetent fromName(String name) =>
      tanreiEnumByName(values, name, fallback: partial, kind: 'bottom-sheet detent');
}

/// Shows supplementary content or a short task in a surface that rises from the bottom edge.
///
/// Implements `specs/bottom-sheet.spec.json`, controlled:
///
/// * [variant] — [TanreiBottomSheetVariant.modal] (the default) or `.standard`;
/// * [open] — whether it is shown; the caller sets it to false from [onClose], which carries the
///   [TanreiSheetCloseReason] (`drag`, `scrim`, `escape` or `back`) and is called only while
///   [dismissible] (the spec's `close`);
/// * [detent] — the height it rests at while its content is taller than it; the person moves
///   between the two by dragging or with the drag handle, and [onDetentChanged] reports the new one
///   (the spec's `detentChange`, never called when the product changes [detent]); the sheet keeps
///   the height the person chose until [detent] changes;
/// * [showHandle] and [handleSemanticLabel] (the spec's `handle` and `handleLabel`), [inset] and
///   [semanticLabel] (its `label`); [child] is the content.
///
/// Place it as the last child of a `Stack` over what it covers (it fills the `Stack`): for a modal
/// sheet, a `Stack` over the whole page, as a modal navigation drawer; for a standard one, the
/// parent it covers the bottom of. Not `showModalBottomSheet`, which needs Material.
///
/// A **modal** sheet draws `scrim.color` over the whole `Stack`, blocks presses and the semantics
/// behind it, keeps Tab in its `FocusScope`, names itself as a dialog, answers the platform's back
/// through the enclosing route (`PopScope`) and Escape through `Shortcuts`, and counts in
/// [TanreiModalOverlays]. A **standard** sheet draws no scrim, lets presses above it reach the
/// content and Tab leave it, and ignores Escape and back.
///
/// Opening moves focus to the content's `autofocus: true` widget or, without one, to the sheet's
/// own focus scope; closing with focus inside returns it to where it was. A sheet mounted with
/// [open] true does not move focus.
class TanreiBottomSheet extends StatefulWidget {
  /// Creates a bottom sheet.
  const TanreiBottomSheet({
    super.key,
    this.variant = TanreiBottomSheetVariant.modal,
    this.open = false,
    this.onClose,
    this.detent = TanreiBottomSheetDetent.partial,
    this.onDetentChanged,
    this.dismissible = true,
    this.showHandle = true,
    this.handleSemanticLabel = '',
    this.inset = true,
    this.semanticLabel = '',
    required this.child,
  });

  /// Modal (over a scrim) or standard (a layout region).
  final TanreiBottomSheetVariant variant;

  /// Whether the sheet is shown.
  final bool open;

  /// Called once when the person asks the sheet to close, with the reason; the caller closes it by
  /// setting [open] to false.
  final ValueChanged<TanreiSheetCloseReason>? onClose;

  /// The height the sheet rests at while its content is taller than its partial height.
  final TanreiBottomSheetDetent detent;

  /// Called with the new detent when the person moves the sheet to its other height.
  final ValueChanged<TanreiBottomSheetDetent>? onDetentChanged;

  /// Whether a drag below the lowest height and, for a modal sheet, the scrim, Escape and back ask
  /// it to close.
  final bool dismissible;

  /// Whether the drag handle is drawn at the top of the sheet.
  final bool showHandle;

  /// The drag handle's accessible name ("Resize sheet").
  final String handleSemanticLabel;

  /// Whether the content is inset by `container.padding`.
  final bool inset;

  /// The sheet's accessible name ("Share photo"): the modal dialog's, or the standard sheet's.
  final String semanticLabel;

  /// The content.
  final Widget child;

  @override
  State<TanreiBottomSheet> createState() => _TanreiBottomSheetState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(EnumProperty<TanreiBottomSheetVariant>('variant', variant))
      ..add(FlagProperty('open', value: open, ifTrue: 'open', ifFalse: 'closed'))
      ..add(EnumProperty<TanreiBottomSheetDetent>('detent', detent))
      ..add(FlagProperty('dismissible', value: dismissible, ifFalse: 'not dismissible'))
      ..add(FlagProperty('showHandle', value: showHandle, ifFalse: 'no handle'))
      ..add(StringProperty('handleSemanticLabel', handleSemanticLabel, defaultValue: ''))
      ..add(FlagProperty('inset', value: inset, ifFalse: 'flush'))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''));
  }
}

/// A sheet is shown at 1 and gone at 0; a detent's progress is partial at 0 and full at 1.
const double _shown = 1;
const double _gone = 0;
const double _partial = 0;
const double _fullT = 1;

/// Two heights closer than this are one (layout rounding).
const double _sameHeight = 0.5;

/// Where a released drag sends the sheet.
enum _Settle { lowest, highest, close }

class _TanreiBottomSheetState extends State<TanreiBottomSheet> with TickerProviderStateMixin {
  /// The enter and exit motion: shown at 1. Slides the sheet (or, where motion is reduced, fades
  /// it) and fades the scrim.
  late final AnimationController _presence = AnimationController(
    vsync: this,
    value: widget.open ? _shown : _gone,
  )..addStatusListener(_handlePresenceStatus);

  /// Between the lowest (0) and the highest (1) height.
  late final AnimationController _heightT = AnimationController(
    vsync: this,
    value: _tOf(widget.detent),
  );

  /// How far a drag pushed the sheet below its lowest height, as a fraction of that height.
  late final AnimationController _drop = AnimationController(vsync: this);

  /// The detent the sheet rests at: the product's, until the person chooses another (BSH-21).
  late TanreiBottomSheetDetent _detent = widget.detent;

  /// The sheet's focus: a trap for a modal sheet, a scope Tab leaves for a standard one. It is
  /// what takes focus when the content marks nothing (BSH-3).
  final FocusScopeNode _scope = FocusScopeNode(
    debugLabel: 'TanreiBottomSheet',
    skipTraversal: true,
  );

  late final _SheetScrollController _scroll = _SheetScrollController(this);

  /// The heights of the last layout.
  _SheetMetrics _metrics = const _SheetMetrics(lowest: 0, highest: 0);

  /// Whether the sheet has two heights (BSH-6), as the last layout found.
  bool _twoHeights = false;

  /// Where focus was when the sheet opened (BSH-3).
  FocusNode? _previousFocus;

  /// Whether the sheet asked to close and waits for [TanreiBottomSheet.open] to turn false.
  bool _closeRequested = false;

  /// Whether the modal sheet counts as an open modal overlay.
  bool _counted = false;

  /// Whether the sheet follows a drag, and the detent the drag started from.
  bool _dragging = false;
  TanreiBottomSheetDetent _dragStartDetent = TanreiBottomSheetDetent.partial;

  bool _reportedName = false;
  bool _reportedHandleName = false;

  bool get _modal => widget.variant == TanreiBottomSheetVariant.modal;

  bool get _reduceMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// BSH-1: Android's reduced-motion setting removes every animation.
  bool get _atOnce => _reduceMotion && defaultTargetPlatform == TargetPlatform.android;

  TanreiBottomSheetTokens get _tokens => TanreiTheme.of(context).system.bottomSheet;

  static double _tOf(TanreiBottomSheetDetent detent) =>
      detent == TanreiBottomSheetDetent.full ? _fullT : _partial;

  @override
  void initState() {
    super.initState();
    if (widget.open) {
      // BSH-1, BSH-3: a sheet mounted open appears in place. A standard one does not move focus; a modal
      // one moves focus in as if it had just opened, because nothing behind it can hold focus.
      if (_modal) {
        _previousFocus = FocusManager.instance.primaryFocus;
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && widget.open && _modal) {
          _count(true);
          // The scope forwards focus to the content's autofocus widget, or keeps it itself.
          _scope.requestFocus();
        }
      });
    }
  }

  @override
  void didUpdateWidget(TanreiBottomSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.variant != widget.variant) {
      _count(widget.open && _modal);
    }
    if (oldWidget.detent != widget.detent) {
      // BSH-21: the product's detent, moved to without an event.
      _detent = widget.detent;
      if (widget.open && !_dragging) {
        _settleTo(_tOf(_detent));
      } else {
        _heightT.value = _tOf(_detent);
      }
    }
    if (oldWidget.open != widget.open) {
      _closeRequested = false;
      if (widget.open) {
        _open();
      } else {
        _close();
      }
    }
  }

  @override
  void dispose() {
    _count(false);
    _presence.dispose();
    _heightT.dispose();
    _drop.dispose();
    _scroll.dispose();
    _scope.dispose();
    super.dispose();
  }

  void _count(bool open) {
    if (open && !_counted) {
      _counted = true;
      TanreiModalOverlays.instance.add();
    } else if (!open && _counted) {
      _counted = false;
      TanreiModalOverlays.instance.remove();
    }
  }

  void _handlePresenceStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && mounted) {
      setState(() {});
    }
  }

  Duration get _enterDuration => tanreiDuration(_tokens.motionEnterDuration);

  Curve get _enterCurve => _tokens.motionEnterEasing.toCurve();

  // BSH-1, BSH-3: rise from below (fade where motion is reduced, at once on Android's setting), and
  // move focus in when the sheet opens, not when its motion ends.
  void _open() {
    _previousFocus = FocusManager.instance.primaryFocus;
    _count(_modal);
    _drop.value = _gone;
    _heightT.value = _tOf(_detent);
    if (_atOnce) {
      _presence.value = _shown;
    } else {
      _presence.animateTo(_shown, duration: _enterDuration, curve: _enterCurve);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open) {
        // The scope forwards focus to the content's autofocus widget, or keeps it itself.
        _scope.requestFocus();
      }
    });
  }

  // BSH-1, BSH-3: slide down out of view from wherever the sheet is, and give focus back at once.
  void _close() {
    _count(false);
    if (_scope.hasFocus) {
      tanreiReturnFocus(_previousFocus, region: _scope);
    }
    _previousFocus = null;
    _dragging = false;
    _heightT.stop();
    if (!_reduceMotion && _drop.value > 0) {
      // Continue from where the drag left it: the part below the lowest height becomes presence.
      _presence.value = math.max(_gone, _presence.value - _drop.value);
      _drop.value = _gone;
    }
    _drop.stop();
    if (_atOnce) {
      _presence.value = _gone;
    } else {
      _presence.animateBack(
        _gone,
        duration: tanreiDuration(_tokens.motionExitDuration),
        curve: _tokens.motionExitEasing.toCurve(),
      );
    }
  }

  /// BSH-5, BSH-20: ask the owner to close the sheet — once, until [TanreiBottomSheet.open]
  /// changes. Where the owner does not close it, [onDeclined] runs one frame later (a drag's sheet
  /// settles back). Returns whether it asked.
  bool _requestClose(TanreiSheetCloseReason reason, {VoidCallback? onDeclined}) {
    if (!widget.open || !widget.dismissible || _closeRequested) {
      return false;
    }
    _closeRequested = true;
    widget.onClose?.call(reason);
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.open && _closeRequested) {
        _closeRequested = false;
        onDeclined?.call();
      }
    });
    SchedulerBinding.instance.ensureVisualUpdate();
    return true;
  }

  /// Moves the sheet to [t] between its heights, the drop undone, over the enter motion (at once
  /// where motion is reduced: BSH-9, BSH-21).
  void _settleTo(double t) {
    if (_reduceMotion) {
      _heightT.value = t;
      _drop.value = _gone;
    } else {
      _heightT.animateTo(t, duration: _enterDuration, curve: _enterCurve);
      _drop.animateTo(_gone, duration: _enterDuration, curve: _enterCurve);
    }
  }

  /// BSH-9, BSH-11: settle at one of the heights and, where it is the other detent than the one
  /// the gesture started from, report it.
  void _settle(_Settle target, {TanreiBottomSheetDetent? from}) {
    if (!_twoHeights) {
      // One height: the detent changes nothing.
      _settleTo(_tOf(_detent));
      return;
    }
    final TanreiBottomSheetDetent next = target == _Settle.highest
        ? TanreiBottomSheetDetent.full
        : TanreiBottomSheetDetent.partial;
    _settleTo(_tOf(next));
    final TanreiBottomSheetDetent start = from ?? _detent;
    if (next != _detent) {
      setState(() => _detent = next);
    }
    if (next != start) {
      widget.onDetentChanged?.call(next);
    }
  }

  /// BSH-11: the drag handle moves the sheet to its other height.
  void _toggleDetent() {
    if (!widget.open || !_twoHeights) {
      return;
    }
    _settle(_detent == TanreiBottomSheetDetent.full ? _Settle.lowest : _Settle.highest);
  }

  // ---- Dragging (BSH-9, BSH-10, BSH-20) --------------------------------------------------------

  /// The visible height of the sheet now: between its heights, less what a drag pushed below.
  double get _visible {
    final _SheetMetrics m = _metrics;
    return lerpDouble(m.lowest, m.highest, _heightT.value)! - _drop.value * m.lowest;
  }

  set _visible(double value) {
    final _SheetMetrics m = _metrics;
    final double v = math.min(value, m.highest);
    if (v >= m.lowest) {
      _heightT.value = m.highest - m.lowest > _sameHeight
          ? (v - m.lowest) / (m.highest - m.lowest)
          : _heightT.value;
      _drop.value = _gone;
    } else {
      if (m.highest - m.lowest > _sameHeight) {
        _heightT.value = _partial;
      }
      _drop.value = m.lowest > 0 ? clampDouble((m.lowest - v) / m.lowest, _gone, _shown) : _gone;
    }
  }

  bool get _canDrag => widget.open && _metrics.lowest > 0;

  void _beginDrag() {
    if (_dragging) {
      return;
    }
    _heightT.stop();
    _drop.stop();
    _dragStartDetent = _detent;
    setState(() => _dragging = true);
  }

  /// Moves the sheet [down] pixels (up where negative), never above its highest height. Returns
  /// the part of an upward move it did not take.
  double _dragBy(double down) {
    if (!_canDrag) {
      return down < 0 ? -down : 0;
    }
    _beginDrag();
    final double before = _visible;
    final double wanted = before - down;
    _visible = wanted;
    return wanted > _metrics.highest ? wanted - _metrics.highest : 0;
  }

  /// Whether an upward drag on the content raises the sheet before it scrolls (BSH-10).
  bool get _canRise => _canDrag && _visible < _metrics.highest - _sameHeight / 2;

  /// A drag ended with [velocity] (logical pixels per second, down positive).
  void _endDrag(double velocity) {
    if (!_dragging) {
      return;
    }
    setState(() => _dragging = false);
    final _SheetMetrics m = _metrics;
    final double v = _visible;
    final bool fling = velocity.abs() > kMinFlingVelocity;
    _Settle target;
    if (fling && velocity > 0) {
      // Down: the next height below where it was released.
      target = v > m.lowest + _sameHeight ? _Settle.lowest : _Settle.close;
    } else if (fling) {
      target = _Settle.highest;
    } else if (v < m.lowest / 2) {
      target = _Settle.close;
    } else {
      target = v - m.lowest > m.highest - v ? _Settle.highest : _Settle.lowest;
    }
    final TanreiBottomSheetDetent from = _dragStartDetent;
    // BSH-20: a drag that asks to close emits, holds for one frame, then leaves or settles back.
    if (target == _Settle.close &&
        _requestClose(
          TanreiSheetCloseReason.drag,
          onDeclined: () => _settle(_Settle.lowest, from: from),
        )) {
      return;
    }
    _settle(target == _Settle.close ? _Settle.lowest : target, from: from);
  }

  void _handleMetrics(_SheetMetrics metrics) {
    _metrics = metrics;
    final bool two = metrics.highest - metrics.lowest > _sameHeight;
    if (two != _twoHeights) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (mounted && two != _twoHeights) {
          setState(() => _twoHeights = two);
        }
      });
    }
  }

  // ---- Debug reports (BSH-11, BSH-22) ----------------------------------------------------------

  void _debugReportNames() {
    assert(() {
      final bool missing = !tanreiIsAccessibleName(widget.semanticLabel);
      if (missing && !_reportedName) {
        debugTanreiReportMissingName('bottom sheet', widget);
      }
      _reportedName = missing;
      final bool handleMissing =
          widget.showHandle && _twoHeights && !tanreiIsAccessibleName(widget.handleSemanticLabel);
      if (handleMissing && !_reportedHandleName) {
        debugTanreiReportMissingName('bottom sheet handle', widget);
      }
      _reportedHandleName = handleMissing;
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final bool showing = widget.open || !_presence.isDismissed;
    if (!showing) {
      // BSH-1: a closed sheet has no presence.
      return const SizedBox.shrink();
    }
    _debugReportNames();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiBottomSheetTokens tokens = theme.system.bottomSheet;
    final bool modal = _modal;
    final bool slide = !_reduceMotion;
    final EdgeInsets padding = MediaQuery.paddingOf(context);
    final double keyboard = MediaQuery.viewInsetsOf(context).bottom;

    Widget sheet = _SheetSurface(
      tokens: tokens,
      bottomInset: padding.bottom,
      showHandle: widget.showHandle,
      inset: widget.inset,
      scroll: _scroll,
      handle: widget.showHandle
          ? _DragHandle(
              tokens: tokens,
              interactive: widget.open && _twoHeights,
              expanded: _detent == TanreiBottomSheetDetent.full,
              label: widget.handleSemanticLabel,
              dragging: _dragging,
              onPressed: _toggleDetent,
            )
          : null,
      child: widget.child,
    );

    // BSH-9: a drag on the handle's row or the padding moves the sheet; the content's own drags
    // reach it through its scroll position (BSH-10).
    sheet = GestureDetector(
      // The drag counts from where the finger went down, the slop included.
      dragStartBehavior: DragStartBehavior.down,
      onVerticalDragStart: widget.open ? (_) => _beginDrag() : null,
      onVerticalDragUpdate: widget.open ? (DragUpdateDetails d) => _dragBy(d.primaryDelta!) : null,
      onVerticalDragEnd: widget.open
          ? (DragEndDetails d) => _endDrag(d.primaryVelocity ?? 0)
          : null,
      onVerticalDragCancel: widget.open ? () => _endDrag(0) : null,
      child: sheet,
    );

    final String? name = tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null;
    // BSH-2, BSH-4: a trap for a modal sheet; a scope Tab leaves for a standard one.
    _scope.traversalEdgeBehavior = modal
        ? TraversalEdgeBehavior.closedLoop
        : TraversalEdgeBehavior.parentScope;
    sheet = FocusScope(node: _scope, child: sheet);
    if (modal) {
      // BSH-5: Escape asks a dismissible modal sheet to close; otherwise it is taken and ignored.
      sheet = Actions(
        actions: <Type, Action<Intent>>{
          DismissIntent: CallbackAction<DismissIntent>(
            onInvoke: (_) => _requestClose(TanreiSheetCloseReason.escape),
          ),
        },
        child: Shortcuts(
          shortcuts: const <ShortcutActivator, Intent>{
            SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
          },
          child: sheet,
        ),
      );
    }
    // BSH-22: a modal dialog, or a region, named by the label.
    sheet = Semantics(
      container: true,
      explicitChildNodes: true,
      scopesRoute: modal ? true : null,
      namesRoute: modal ? true : null,
      role: modal ? SemanticsRole.dialog : null,
      label: name,
      child: sheet,
    );

    final Widget placed = AnimatedBuilder(
      animation: Listenable.merge(<Listenable>[_presence, _heightT, _drop]),
      builder: (BuildContext context, Widget? child) => _SheetLayout(
        maxWidth: tokens.containerMaxWidth,
        partialFraction: tokens.containerPartialFraction,
        marginTop: tokens.containerMarginBlockStart,
        heightT: _heightT.value,
        drop: _drop.value,
        presence: slide ? _presence.value : _shown,
        onMetrics: _handleMetrics,
        // BSH-1: where motion is reduced the sheet fades in place instead of sliding.
        child: slide ? child! : Opacity(opacity: _presence.value, child: child),
      ),
      child: sheet,
    );

    // BSH-6: the area is the window below its top inset (modal) or the parent (standard), ending
    // at the keyboard's top edge.
    final Widget area = Padding(
      padding: EdgeInsets.only(top: modal ? padding.top : 0, bottom: keyboard),
      child: placed,
    );

    if (!modal) {
      // BSH-4: no scrim; presses above the sheet reach the content.
      return SizedBox.expand(
        child: Stack(children: <Widget>[Positioned.fill(child: area)]),
      );
    }

    final Color scrim = theme.paint(tokens.scrimColor);
    return PopScope<Object?>(
      // BSH-5: the platform's back asks the open sheet to close instead of leaving the page.
      canPop: !widget.open,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (!didPop) {
          _requestClose(TanreiSheetCloseReason.back);
        }
      },
      child: BlockSemantics(
        child: SizedBox.expand(
          child: Stack(
            children: <Widget>[
              // BSH-2, BSH-5: every press behind the sheet lands on the scrim.
              Positioned.fill(
                child: ExcludeSemantics(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => _requestClose(TanreiSheetCloseReason.scrim),
                    child: AnimatedBuilder(
                      animation: Listenable.merge(<Listenable>[_presence, _drop]),
                      builder: (BuildContext context, Widget? child) => Opacity(
                        opacity: clampDouble(
                          _presence.value * (_shown - _drop.value),
                          _gone,
                          _shown,
                        ),
                        child: child,
                      ),
                      child: ColoredBox(color: scrim),
                    ),
                  ),
                ),
              ),
              Positioned.fill(child: area),
            ],
          ),
        ),
      ),
    );
  }
}

/// The heights a layout found: the lowest (partial, or the content's) and the highest (full, or
/// the content's).
@immutable
class _SheetMetrics {
  const _SheetMetrics({required this.lowest, required this.highest});

  final double lowest;
  final double highest;
}

/// Places the sheet in its area (BSH-6, BSH-7): as wide as the area but no wider than
/// [maxWidth], centred; as tall as its content up to the height [heightT] names between the lowest
/// and the highest height; at the area's bottom edge, moved down by [drop] of its lowest height and,
/// while [presence] is below 1, by the part of its height that is not yet shown. Reports the
/// heights to [onMetrics]. Presses outside the sheet pass through.
class _SheetLayout extends SingleChildRenderObjectWidget {
  const _SheetLayout({
    required this.maxWidth,
    required this.partialFraction,
    required this.marginTop,
    required this.heightT,
    required this.drop,
    required this.presence,
    required this.onMetrics,
    required Widget super.child,
  });

  final double maxWidth;
  final double partialFraction;
  final double marginTop;
  final double heightT;
  final double drop;
  final double presence;
  final ValueChanged<_SheetMetrics> onMetrics;

  @override
  _RenderSheetLayout createRenderObject(BuildContext context) => _RenderSheetLayout(this);

  @override
  void updateRenderObject(BuildContext context, _RenderSheetLayout renderObject) {
    renderObject.config = this;
  }
}

class _RenderSheetLayout extends RenderShiftedBox {
  _RenderSheetLayout(this._config) : super(null);

  _SheetLayout _config;
  set config(_SheetLayout value) {
    if (value.maxWidth != _config.maxWidth ||
        value.partialFraction != _config.partialFraction ||
        value.marginTop != _config.marginTop ||
        value.heightT != _config.heightT ||
        value.drop != _config.drop ||
        value.presence != _config.presence) {
      markNeedsLayout();
    }
    _config = value;
  }

  @override
  bool get sizedByParent => true;

  @override
  Size computeDryLayout(BoxConstraints constraints) => constraints.biggest;

  @override
  void performLayout() {
    final RenderBox? child = this.child;
    if (child == null) {
      return;
    }
    final _SheetLayout c = _config;
    final double width = math.min(size.width, c.maxWidth);
    final double partial = size.height * c.partialFraction;
    final double full = math.max(0, size.height - c.marginTop);
    // As tall as the content allows, up to the full height: the content's own height.
    child.layout(
      BoxConstraints(minWidth: width, maxWidth: width, maxHeight: full),
      parentUsesSize: true,
    );
    final double natural = child.size.height;
    final double highest = math.min(natural, full);
    final double lowest = math.min(math.min(natural, partial), highest);
    final double height = lerpDouble(lowest, highest, c.heightT)!;
    child.layout(BoxConstraints.tightFor(width: width, height: height), parentUsesSize: true);
    final BoxParentData data = child.parentData! as BoxParentData;
    data.offset = Offset(
      (size.width - width) / 2,
      size.height - height + (_shown - c.presence) * height + c.drop * lowest,
    );
    c.onMetrics(_SheetMetrics(lowest: lowest, highest: highest));
  }
}

/// The sheet itself: the container (top corners rounded, bottom corners square, color under the
/// bottom inset, raised), the handle's row and the content, clipped to the container's shape.
class _SheetSurface extends StatelessWidget {
  const _SheetSurface({
    required this.tokens,
    required this.bottomInset,
    required this.showHandle,
    required this.inset,
    required this.scroll,
    required this.handle,
    required this.child,
  });

  final TanreiBottomSheetTokens tokens;
  final double bottomInset;
  final bool showHandle;
  final bool inset;
  final ScrollController scroll;
  final Widget? handle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final Color contentColor = theme.paint(tokens.contentColor);
    final double rowHeight = showHandle
        ? tokens.handleMarginBlock * 2 + tokens.handleContainerHeight
        : 0;
    final double p = tokens.containerPadding;

    // BSH-8: the content color and the body style as the inherited foreground; inset from the
    // start, end and bottom edges (and the top edge without a handle) while inset is true.
    Widget content = DefaultTextStyle.merge(
      style: theme.textStyle(theme.system.typescale.body, color: contentColor),
      child: IconTheme.merge(
        data: IconThemeData(color: contentColor),
        child: child,
      ),
    );
    // BSH-10: the content scrolls inside the container, below the handle's row.
    content = SingleChildScrollView(
      controller: scroll,
      // BSH-9: the content's drag follows the finger from where it went down, as the sheet's.
      dragStartBehavior: DragStartBehavior.down,
      physics: const AlwaysScrollableScrollPhysics(parent: ClampingScrollPhysics()),
      padding: inset ? EdgeInsets.fromLTRB(p, showHandle ? 0 : p, p, p) : EdgeInsets.zero,
      child: content,
    );
    Widget body = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (showHandle) SizedBox(height: rowHeight),
        Flexible(child: content),
      ],
    );
    if (handle case final Widget handle) {
      // BSH-12: the handle's row stays in place while the content scrolls; drawn over the
      // content so its target may reach into it (BSH-15).
      body = Stack(
        children: <Widget>[
          body,
          Positioned(top: 0, left: 0, right: 0, child: Center(child: handle)),
        ],
      );
    }
    // BSH-7: the content stays above the bottom inset; the container's color reaches under it.
    body = Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: MediaQuery.removePadding(
        context: context,
        removeTop: true,
        removeBottom: true,
        removeLeft: true,
        removeRight: true,
        child: body,
      ),
    );

    final double radius = tokens.containerShape;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: radius,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    final Color color = theme.paint(tokens.containerColor);
    // BSH-7, BSH-18: the top corners rounded by container.shape and eased by the system's
    // smoothing; the bottom corners square, by drawing the container past the bottom edge by the
    // radius and clipping it there (the shadows on the other sides stay).
    return ClipRect(
      clipper: const TanreiEdgeClipper(side: TanreiEdgeSide.bottom),
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            bottom: -radius,
            child: DecoratedBox(
              decoration: TanreiContainerDecoration(
                shape: shape,
                color: color.a > 0 ? color : null,
                border: elevation.ring,
                boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
              ),
            ),
          ),
          // BSH-8: the content clipped to the container's shape.
          ClipPath(clipper: _TopCornersClipper(shape), child: body),
        ],
      ),
    );
  }
}

/// The container's shape with its bottom corners past the bottom edge: rounds the top corners
/// only.
class _TopCornersClipper extends CustomClipper<Path> {
  const _TopCornersClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) =>
      shape.path(Rect.fromLTWH(0, 0, size.width, size.height + shape.radius));

  @override
  bool shouldReclip(_TopCornersClipper oldClipper) => oldClipper.shape != shape;
}

/// A resting control is not dimmed.
const double _opaque = 1;

/// BSH-11 – BSH-19: the drag handle. A box that carries hover, focus and press with the grip in it;
/// a button with the expanded state while the sheet has two heights ([interactive]), drawn at rest
/// and hidden otherwise. Its target is its row across the box, at least the touch target on both
/// axes, reaching into the content below a row that is lower than that (BSH-15).
class _DragHandle extends StatefulWidget {
  const _DragHandle({
    required this.tokens,
    required this.interactive,
    required this.expanded,
    required this.label,
    required this.dragging,
    required this.onPressed,
  });

  final TanreiBottomSheetTokens tokens;
  final bool interactive;
  final bool expanded;
  final String label;

  /// Whether the sheet follows a drag (which ends a press on the handle, BSH-13).
  final bool dragging;
  final VoidCallback onPressed;

  @override
  State<_DragHandle> createState() => _DragHandleState();
}

class _DragHandleState extends State<_DragHandle>
    with
        TickerProviderStateMixin<_DragHandle>,
        TanreiPressableStateMixin<_DragHandle, TanreiControlVisuals> {
  TanreiBottomSheetTokens get _tokens => widget.tokens;

  @override
  VoidCallback? get onPressed => widget.interactive ? widget.onPressed : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  // BSH-16: the press is shown when the pointer goes down, not when the tap wins over the sheet's
  // drag.
  @override
  bool get pressedByTaps => false;

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  void didUpdateWidget(_DragHandle oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.dragging && !oldWidget.dragging) {
      // BSH-13: a drag that moves the sheet does not leave the handle pressed.
      cancelPress();
    }
  }

  TanreiBottomSheetControlTokens get _control =>
      _tokens.controls[TanreiBottomSheetControl.dragHandle];

  void _pointerDown(PointerDownEvent event) {
    if (widget.dragging) {
      return;
    }
    final RenderObject? box = pressContainerKey.currentContext?.findRenderObject();
    beginPress(box is RenderBox ? box.globalToLocal(event.position) : null);
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiBottomSheetTokens tokens = _tokens;
    final TanreiBottomSheetControlTokens control = _control;
    // BSH-13, BSH-17, BSH-19: the drawn state's tokens, the container of the state the pressed
    // feedback names, eased over the state motion.
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: control.of(containerState).containerColor,
        labelColor: control.of(drawnState).gripColor,
        outlineColor: const TanreiPaint.none(),
        elevation: const <TanreiShadowLayer>[],
        opacity: tokens.stateTokens(drawnState)?.opacity ?? _opaque,
        shape: tokens.handleContainerShape,
      ),
    );
    final double smoothing = theme.system.shape.cornerSmoothing;
    final TanreiCornerShape shape = TanreiCornerShape(smoothing: smoothing, radius: visuals.shape);
    // BSH-12: the grip centred in the box; decorative (BSH-22).
    final Widget grip = ExcludeSemantics(
      child: SizedBox(
        width: tokens.handleGripWidth,
        height: tokens.handleGripHeight,
        child: DecoratedBox(
          decoration: TanreiContainerDecoration(
            shape: TanreiCornerShape(smoothing: smoothing, radius: tokens.handleGripShape),
            color: visuals.label,
          ),
        ),
      ),
    );
    // BSH-14, BSH-18: the focus ring around the box, as the focus style says.
    final Widget box = Opacity(
      opacity: visuals.opacity,
      child: TanreiFocusRing(
        visible: isKeyboardFocused,
        borderRadius: BorderRadius.circular(shape.radius),
        child: TanreiControlContainer(
          key: pressContainerKey,
          visuals: visuals,
          shape: shape,
          outlineWidth: 0,
          ripple: rippleFor(
            pressedContainer: () => theme.paint(control.of(interactionState).containerColor),
            container: visuals.container,
          ),
          child: SizedBox(
            width: tokens.handleContainerWidth,
            height: tokens.handleContainerHeight,
            child: Center(child: grip),
          ),
        ),
      ),
    );
    final double row = tokens.handleMarginBlock * 2 + tokens.handleContainerHeight;
    final double touch = theme.system.measure.targetTouch;
    // BSH-12, BSH-15: the box centred in its row; the target the row across the box, at least the
    // touch target wide and high, from the sheet's top edge.
    final Widget target = SizedBox(
      width: math.max(tokens.handleContainerWidth, touch),
      height: math.max(row, touch),
      child: Align(
        alignment: Alignment.topCenter,
        child: SizedBox(
          height: row,
          child: Center(child: box),
        ),
      ),
    );
    if (!widget.interactive) {
      // BSH-11: drawn at rest, neither focusable, pressable nor exposed.
      return ExcludeSemantics(child: IgnorePointer(child: target));
    }
    return Semantics(
      container: true,
      button: true,
      expanded: widget.expanded,
      label: tanreiIsAccessibleName(widget.label) ? widget.label : null,
      child: buildPressable(
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: _pointerDown,
          onPointerUp: (_) => endPress(),
          onPointerCancel: (_) => endPress(),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              if (!widget.dragging) {
                widget.onPressed();
              }
            },
            child: target,
          ),
        ),
      ),
    );
  }
}

/// The content's scroll controller: its position hands a drag to the sheet first where BSH-10
/// says so.
class _SheetScrollController extends ScrollController {
  _SheetScrollController(this._sheet);

  final _TanreiBottomSheetState _sheet;

  @override
  ScrollPosition createScrollPosition(
    ScrollPhysics physics,
    ScrollContext context,
    ScrollPosition? oldPosition,
  ) => _SheetScrollPosition(_sheet, physics: physics, context: context, oldPosition: oldPosition);
}

/// BSH-10: an upward drag on the content first raises the sheet to its highest height, then
/// scrolls; a downward one first scrolls the content to its top, then lowers the sheet. A drag
/// that moved the sheet settles it as a drag of the sheet does (BSH-9) instead of flinging the
/// content.
class _SheetScrollPosition extends ScrollPositionWithSingleContext {
  _SheetScrollPosition(
    this._sheet, {
    required super.physics,
    required super.context,
    super.oldPosition,
  });

  final _TanreiBottomSheetState _sheet;

  /// Whether the current drag moved the sheet.
  bool _movedSheet = false;

  @override
  Drag drag(DragStartDetails details, VoidCallback dragCancelCallback) {
    _movedSheet = false;
    return super.drag(details, dragCancelCallback);
  }

  @override
  void applyUserOffset(double delta) {
    // delta > 0: the finger moves down, toward the content's top.
    if (delta < 0 && _sheet._canRise) {
      _movedSheet = true;
      final double rest = _sheet._dragBy(delta);
      if (rest > 0) {
        super.applyUserOffset(-rest);
      }
      return;
    }
    if (delta > 0 && _sheet._canDrag) {
      final double scrollable = math.max(0, pixels - minScrollExtent);
      if (delta > scrollable) {
        if (scrollable > 0) {
          super.applyUserOffset(scrollable);
        }
        _movedSheet = true;
        _sheet._dragBy(delta - scrollable);
        return;
      }
    }
    super.applyUserOffset(delta);
  }

  @override
  void goBallistic(double velocity) {
    if (_movedSheet) {
      _movedSheet = false;
      // A scroll velocity is positive toward the content's end: the finger moving up.
      _sheet._endDrag(-velocity);
      super.goBallistic(0);
      return;
    }
    super.goBallistic(velocity);
  }
}
