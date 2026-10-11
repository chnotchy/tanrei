import 'dart:async';
import 'dart:collection';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
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
import '../primitives/enum_by_name.dart';
import '../primitives/focus_ring.dart';
import '../primitives/glyphs.dart';
import '../primitives/ignored_value.dart';
import '../primitives/modal_overlays.dart';
import '../primitives/pressable.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'tooltip.dart' show tanreiTooltipTookKey;

/// How long a [TanreiSnackbar] stays by itself (the spec's `duration`).
enum TanreiSnackbarDuration {
  /// [short] without an action, [indefinite] with one (WCAG 2.2.1).
  auto,

  /// Closes after `comp.snackbar.timeout.short`.
  short,

  /// Closes after `comp.snackbar.timeout.long`.
  long,

  /// Stays until it is closed.
  indefinite;

  /// The duration named [name], or [auto] — reported in debug builds — for a name the snackbar
  /// does not define.
  static TanreiSnackbarDuration fromName(String name) =>
      tanreiEnumByName(values, name, fallback: auto, kind: 'snackbar duration');
}

/// Why a [TanreiSnackbar] closed: [action] is the spec's `action` event, every other value its
/// `dismiss` event with that reason.
enum TanreiSnackbarClosedReason {
  /// The action was activated.
  action,

  /// The close button was activated.
  close,

  /// Escape, while focus was inside the snackbar.
  escape,

  /// Its time ran out.
  timeout,

  /// The product closed it or cleared the queue.
  host,
}

/// The glyph of the close button (`glyphs.dart`), drawn as text so that it takes the icon family.
const String _closeGlyph = tanreiCloseGlyph;

/// Tells a person briefly, at the bottom edge of the screen, what the app just did, with at most
/// one action, without taking focus or interrupting their work.
///
/// Implements `specs/snackbar.spec.json` with the idiom of Flutter's `SnackBar`: [message],
/// [actionLabel] (the spec's `action`: empty draws none), [showCloseIcon] and [closeIconLabel] (the
/// spec's `closable` and `closeLabel`), [duration], and [onClosed] — the spec's `action` event
/// (`TanreiSnackbarClosedReason.action`) and `dismiss` event (every other
/// `TanreiSnackbarClosedReason`), called once when it closes.
///
/// Show it through a [TanreiSnackbarMessenger]: `TanreiSnackbarMessenger.of(context).show(...)`
/// queues it, shows one at a time at the bottom of the messenger's area, times it out, announces it
/// politely and returns a [TanreiSnackbarController] whose `closed` future completes with the
/// reason. Built anywhere else, it draws in place at rest — no timer, queue, entrance or
/// announcement — and still calls [onClosed] (SNK-19): the form of fixtures and documentation.
class TanreiSnackbar extends StatefulWidget {
  /// Creates a snackbar.
  const TanreiSnackbar({
    super.key,
    required this.message,
    this.actionLabel = '',
    this.showCloseIcon = false,
    this.closeIconLabel = '',
    this.duration = TanreiSnackbarDuration.auto,
    this.onClosed,
  });

  /// What happened. Plain text: the whole message is announced.
  final String message;

  /// The label of the one action; empty draws no action.
  final String actionLabel;

  /// Whether a close button is drawn.
  final bool showCloseIcon;

  /// The close button's accessible name. Required while [showCloseIcon] is true.
  final String closeIconLabel;

  /// How long the snackbar stays by itself.
  final TanreiSnackbarDuration duration;

  /// Called once, with the reason, when the snackbar closes.
  final ValueChanged<TanreiSnackbarClosedReason>? onClosed;

  /// Whether an action is drawn.
  bool get hasAction => actionLabel.isNotEmpty;

  @override
  State<TanreiSnackbar> createState() => _TanreiSnackbarState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('message', message))
      ..add(StringProperty('actionLabel', actionLabel, defaultValue: ''))
      ..add(FlagProperty('showCloseIcon', value: showCloseIcon, ifTrue: 'closable'))
      ..add(StringProperty('closeIconLabel', closeIconLabel, defaultValue: ''))
      ..add(EnumProperty<TanreiSnackbarDuration>('duration', duration));
  }
}

/// A snackbar shown by a [TanreiSnackbarMessenger]: [closed] completes with the reason once it has
/// closed (SNK-12), and [close] closes it (or drops it from the queue) with the reason `host`.
class TanreiSnackbarController {
  TanreiSnackbarController._(this._close);

  final Completer<TanreiSnackbarClosedReason> _closed = Completer<TanreiSnackbarClosedReason>();
  final VoidCallback _close;

  /// Completes with the reason the snackbar closed.
  Future<TanreiSnackbarClosedReason> get closed => _closed.future;

  /// Closes the snackbar, or drops it from the queue, with the reason `host`.
  void close() => _close();
}

/// Hosts snackbars for the area it wraps, as Flutter's `ScaffoldMessenger`: [show] queues a
/// [TanreiSnackbar] and shows one at a time at the bottom of that area (SNK-12, SNK-13).
///
/// Put it inside the route whose content it covers — around a page — so that a dialog route opened
/// above it (a `TanreiDialog`) is drawn above its snackbar (SNK-13). Its snackbar follows the page's
/// content in the focus order (SNK-11).
class TanreiSnackbarMessenger extends StatefulWidget {
  /// Hosts snackbars over [child].
  const TanreiSnackbarMessenger({super.key, required this.child});

  /// The area the snackbars are shown over.
  final Widget child;

  /// The nearest messenger above [context].
  static TanreiSnackbarMessengerState of(BuildContext context) {
    final TanreiSnackbarMessengerState? state = maybeOf(context);
    assert(state != null, 'No TanreiSnackbarMessenger above this context.');
    return state!;
  }

  /// The nearest messenger above [context], if any.
  static TanreiSnackbarMessengerState? maybeOf(BuildContext context) =>
      context.findAncestorStateOfType<TanreiSnackbarMessengerState>();

  @override
  State<TanreiSnackbarMessenger> createState() => TanreiSnackbarMessengerState();
}

class _Entry {
  _Entry(this.snackbar);

  final TanreiSnackbar snackbar;
  late final TanreiSnackbarController controller;
}

/// The state of a [TanreiSnackbarMessenger]: [show], [dismissCurrent] and [clear].
class TanreiSnackbarMessengerState extends State<TanreiSnackbarMessenger>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final Queue<_Entry> _queue = Queue<_Entry>();
  _Entry? _current;
  bool _closing = false;
  bool _rising = false;
  Timer? _timer;
  bool _hovered = false;
  bool _focused = false;
  bool _active = true;
  FocusNode? _lastOutside;
  final FocusNode _snackNode = FocusNode(
    debugLabel: 'TanreiSnackbar',
    canRequestFocus: false,
    skipTraversal: true,
  );
  late final AnimationController _motion = AnimationController(vsync: this);
  late final CurvedAnimation _curve = CurvedAnimation(parent: _motion, curve: Curves.linear);

  /// Queues [snackbar] and returns its controller (SNK-12).
  TanreiSnackbarController show(TanreiSnackbar snackbar) {
    final _Entry entry = _Entry(snackbar);
    entry.controller = TanreiSnackbarController._(
      () => _close(entry, TanreiSnackbarClosedReason.host),
    );
    _queue.add(entry);
    _presentNext();
    return entry.controller;
  }

  /// Closes the showing snackbar with the reason `host` (SNK-12).
  void dismissCurrent() {
    final _Entry? current = _current;
    if (current != null) {
      _close(current, TanreiSnackbarClosedReason.host);
    }
  }

  /// Drops the waiting snackbars and closes the showing one, each with the reason `host` (SNK-12).
  void clear() {
    for (final _Entry entry in _queue.toList()) {
      _close(entry, TanreiSnackbarClosedReason.host);
    }
    dismissCurrent();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    TanreiModalOverlays.instance.addListener(_handleModals);
    FocusManager.instance.addListener(_handleFocusMoved);
    _motion.addStatusListener(_handleMotionStatus);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final TanreiSnackbarTokens tokens = TanreiTheme.of(context).system.snackbar;
    _motion
      ..duration = tanreiDuration(tokens.motionEnterDuration)
      ..reverseDuration = tanreiDuration(tokens.motionExitDuration);
    _curve
      ..curve = tokens.motionEnterEasing.toCurve()
      ..reverseCurve = tokens.motionExitEasing.toCurve().flipped;
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    TanreiModalOverlays.instance.removeListener(_handleModals);
    FocusManager.instance.removeListener(_handleFocusMoved);
    for (final _Entry entry in <_Entry>[..._queue, if (_current != null) _current!]) {
      if (!entry.controller._closed.isCompleted) {
        entry.controller._closed.complete(TanreiSnackbarClosedReason.host);
      }
    }
    _curve.dispose();
    _motion.dispose();
    _snackNode.dispose();
    super.dispose();
  }

  bool get _disableAnimations => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  /// SNK-17: Android's reduced-motion setting removes every animation.
  bool get _noMotion => _disableAnimations && defaultTargetPlatform == TargetPlatform.android;

  bool get _modalOpen => TanreiModalOverlays.instance.isAnyOpen;

  /// SNK-9: hovered, focused, the app in the background, or a modal dialog over the host.
  bool get _paused => _hovered || _focused || !_active || _modalOpen;

  /// SNK-8: the time the showing snackbar stays by itself; null for none.
  Duration? get _timeout {
    final TanreiSnackbar? snackbar = _current?.snackbar;
    if (snackbar == null) {
      return null;
    }
    final TanreiSnackbarTokens tokens = TanreiTheme.of(context).system.snackbar;
    final TanreiSnackbarDuration duration = snackbar.duration == TanreiSnackbarDuration.auto
        ? (snackbar.hasAction ? TanreiSnackbarDuration.indefinite : TanreiSnackbarDuration.short)
        : snackbar.duration;
    // A running screen reader never times out an action (SNK-8).
    if (snackbar.hasAction && (MediaQuery.maybeAccessibleNavigationOf(context) ?? false)) {
      return null;
    }
    return switch (duration) {
      TanreiSnackbarDuration.short => tanreiDuration(tokens.timeoutShort),
      TanreiSnackbarDuration.long => tanreiDuration(tokens.timeoutLong),
      TanreiSnackbarDuration.auto || TanreiSnackbarDuration.indefinite => null,
    };
  }

  /// SNK-9: (re)starts the timeout from its whole length, unless paused.
  void _restartTimer() {
    _timer?.cancel();
    _timer = null;
    final _Entry? current = _current;
    if (current == null || _closing || _paused) {
      return;
    }
    final Duration? timeout = _timeout;
    if (timeout != null) {
      _timer = Timer(timeout, () => _close(current, TanreiSnackbarClosedReason.timeout));
    }
  }

  void _updatePause() {
    if (_paused) {
      _timer?.cancel();
      _timer = null;
    } else if (_timer == null) {
      _restartTimer();
    }
  }

  /// SNK-12: shows the next snackbar once the showing one has closed and no modal covers the host.
  void _presentNext() {
    if (!mounted || _current != null || _queue.isEmpty || _modalOpen) {
      return;
    }
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      SchedulerBinding.instance.addPostFrameCallback((_) => _presentNext());
      return;
    }
    final _Entry entry = _queue.removeFirst();
    setState(() {
      _current = entry;
      _hovered = false;
      _focused = false;
    });
    // SNK-17: rise and fade in; fade only where motion is reduced; at once on Android's setting.
    _rising = !_disableAnimations;
    if (_noMotion) {
      _motion.value = _motion.upperBound;
    } else {
      _motion.forward(from: _motion.lowerBound);
    }
    // SNK-10: announced once, politely, the action's label after the message; focus stays.
    final TanreiSnackbar snackbar = entry.snackbar;
    SemanticsService.announce(
      snackbar.hasAction ? '${snackbar.message}, ${snackbar.actionLabel}' : snackbar.message,
      Directionality.maybeOf(context) ?? TextDirection.ltr,
    );
    _restartTimer();
  }

  /// Closes [entry] with [reason]: a waiting one leaves the queue; the showing one fades out, and
  /// the next is shown after that (SNK-12, SNK-17). Its controller and `onClosed` learn why.
  void _close(_Entry entry, TanreiSnackbarClosedReason reason) {
    if (!identical(entry, _current)) {
      if (_queue.remove(entry)) {
        _resolve(entry, reason);
      }
      return;
    }
    if (_closing) {
      return;
    }
    _closing = true;
    _timer?.cancel();
    _timer = null;
    _resolve(entry, reason);
    // SNK-11: focus inside the snackbar goes back where it came from.
    if (_snackNode.hasFocus) {
      final FocusNode? back = _lastOutside;
      if (back != null && back.context != null && back.canRequestFocus) {
        back.requestFocus();
      } else {
        FocusManager.instance.primaryFocus?.unfocus();
      }
    }
    _rising = false;
    if (_noMotion || !mounted) {
      _motion.value = _motion.lowerBound;
      _finishClose();
    } else {
      _motion.reverse();
      setState(() {});
    }
  }

  void _resolve(_Entry entry, TanreiSnackbarClosedReason reason) {
    if (!entry.controller._closed.isCompleted) {
      entry.controller._closed.complete(reason);
    }
    entry.snackbar.onClosed?.call(reason);
  }

  void _handleMotionStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && _closing) {
      _finishClose();
    }
  }

  void _finishClose() {
    _closing = false;
    if (mounted) {
      setState(() => _current = null);
      _presentNext();
    } else {
      _current = null;
    }
  }

  void _handleModals() {
    if (!mounted) {
      return;
    }
    _updatePause();
    _presentNext();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    _updatePause();
  }

  void _handleFocusMoved() {
    final FocusNode? focused = FocusManager.instance.primaryFocus;
    if (focused != null && focused != _snackNode && !_snackNode.descendants.contains(focused)) {
      _lastOutside = focused;
    }
  }

  void _hover(bool hovered) {
    _hovered = hovered;
    _updatePause();
  }

  void _focus(bool focused) {
    _focused = focused;
    _updatePause();
  }

  @override
  Widget build(BuildContext context) {
    final _Entry? current = _current;
    final TanreiSnackbarTokens tokens = TanreiTheme.of(context).system.snackbar;
    final EdgeInsets safe = MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero;
    final EdgeInsets keyboard = MediaQuery.maybeViewInsetsOf(context) ?? EdgeInsets.zero;
    final double margin = tokens.containerMargin;
    return Stack(
      fit: StackFit.passthrough,
      children: <Widget>[
        widget.child,
        if (current != null)
          // SNK-13: bottom centre, margin from the edges, inside the safe area, above the keyboard.
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                margin + safe.left,
                margin + safe.top,
                margin + safe.right,
                margin + math.max(safe.bottom, keyboard.bottom),
              ),
              child: Align(
                alignment: Alignment.bottomCenter,
                child: _Rise(
                  animation: _curve,
                  rising: _rising,
                  margin: margin,
                  child: FadeTransition(
                    opacity: _curve,
                    child: IgnorePointer(
                      ignoring: _closing,
                      child: Focus(
                        focusNode: _snackNode,
                        includeSemantics: false,
                        child: _HostScope(
                          entry: current,
                          close: (TanreiSnackbarClosedReason reason) => _close(current, reason),
                          hover: _hover,
                          focus: _focus,
                          child: KeyedSubtree(key: ObjectKey(current), child: current.snackbar),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// What the showing snackbar needs from its messenger.
class _HostScope extends InheritedWidget {
  const _HostScope({
    required this.entry,
    required this.close,
    required this.hover,
    required this.focus,
    required super.child,
  });

  final _Entry entry;
  final ValueChanged<TanreiSnackbarClosedReason> close;
  final ValueChanged<bool> hover;
  final ValueChanged<bool> focus;

  @override
  bool updateShouldNotify(_HostScope oldWidget) => !identical(entry, oldWidget.entry);
}

/// SNK-17: the entrance — the snackbar rises by its own height plus [margin] while [animation] runs
/// forward, and stays in place while it fades out.
class _Rise extends SingleChildRenderObjectWidget {
  const _Rise({required this.animation, required this.rising, required this.margin, super.child});

  final Animation<double> animation;
  final bool rising;
  final double margin;

  @override
  _RenderRise createRenderObject(BuildContext context) =>
      _RenderRise(animation: animation, rising: rising, margin: margin);

  @override
  void updateRenderObject(BuildContext context, _RenderRise renderObject) {
    renderObject
      ..animation = animation
      ..rising = rising
      ..margin = margin;
  }
}

class _RenderRise extends RenderProxyBox {
  _RenderRise({required Animation<double> animation, required bool rising, required double margin})
    : _animation = animation,
      _rising = rising,
      _margin = margin;

  Animation<double> _animation;
  set animation(Animation<double> value) {
    if (_animation != value) {
      if (attached) {
        _animation.removeListener(markNeedsPaint);
        value.addListener(markNeedsPaint);
      }
      _animation = value;
      markNeedsPaint();
    }
  }

  bool _rising;
  set rising(bool value) {
    if (_rising != value) {
      _rising = value;
      markNeedsPaint();
    }
  }

  double _margin;
  set margin(double value) {
    if (_margin != value) {
      _margin = value;
      markNeedsPaint();
    }
  }

  double get _shift => _rising ? (1 - _animation.value.clamp(0, 1)) * (size.height + _margin) : 0;

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _animation.addListener(markNeedsPaint);
  }

  @override
  void detach() {
    _animation.removeListener(markNeedsPaint);
    super.detach();
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    super.paint(context, offset + Offset(0, _shift));
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) =>
      super.hitTest(result, position: position - Offset(0, _shift));

  @override
  void applyPaintTransform(RenderBox child, Matrix4 transform) {
    transform.translate(0.0, _shift);
  }
}

class _TanreiSnackbarState extends State<TanreiSnackbar> {
  String _reported = '';

  _HostScope? get _host => context.dependOnInheritedWidgetOfExactType<_HostScope>();

  void _closeWith(TanreiSnackbarClosedReason reason) {
    final _HostScope? host = _host;
    if (host != null) {
      host.close(reason);
    } else {
      // SNK-19: in place, it still emits.
      widget.onClosed?.call(reason);
    }
  }

  /// SNK-20: an empty message, a close button without a name, and a timed action are reported once
  /// for each state that has them.
  void _debugCheck() {
    assert(() {
      final bool unnamedClose =
          widget.showCloseIcon && !tanreiIsAccessibleName(widget.closeIconLabel);
      final List<(String, String)> problems = <(String, String)>[
        if (widget.message.isEmpty)
          ('message', 'A snackbar without a message still shows, but says nothing.'),
        if (widget.hasAction &&
            (widget.duration == TanreiSnackbarDuration.short ||
                widget.duration == TanreiSnackbarDuration.long))
          (
            'duration',
            'A timed snackbar with an action: offer "${widget.actionLabel}" elsewhere too (a menu, a '
                'history), since a person may not reach it in time (WCAG 2.2.1).',
          ),
      ];
      final String signature =
          '$unnamedClose|${problems.map(((String, String) p) => p.$1).join('|')}';
      if (signature != _reported) {
        final bool wasUnnamed = _reported.startsWith('true');
        _reported = signature;
        if (unnamedClose && !wasUnnamed) {
          debugTanreiReportMissingName('snackbar close button', widget);
        }
        for (final (String prop, String why) in problems) {
          debugTanreiReportIgnoredValue('snackbar', prop, why, widget);
        }
      }
      return true;
    }());
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    // SNK-11: Escape while focus is inside closes it (unless a tooltip took the key).
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.escape &&
        !tanreiTooltipTookKey(event)) {
      _closeWith(TanreiSnackbarClosedReason.escape);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSnackbarTokens tokens = theme.system.snackbar;
    final _HostScope? host = _host;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: tokens.containerShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    final Widget? action = widget.hasAction
        ? _SnackbarControl(
            control: TanreiSnackbarControl.action,
            label: widget.actionLabel,
            onPressed: () => _closeWith(TanreiSnackbarClosedReason.action),
          )
        : null;
    final Widget? close = widget.showCloseIcon
        ? _SnackbarControl(
            control: TanreiSnackbarControl.close,
            label: widget.closeIconLabel,
            onPressed: () => _closeWith(TanreiSnackbarClosedReason.close),
          )
        : null;
    Widget bar = ConstrainedBox(
      // SNK-14: between the width bounds (never wider than the room), at least min-height.
      constraints: BoxConstraints(
        minWidth: tokens.containerMinWidth,
        maxWidth: tokens.containerMaxWidth,
        minHeight: tokens.containerMinHeight,
      ),
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: theme.paint(tokens.containerColor),
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
        child: _SnackbarRow(
          message: Text(
            widget.message,
            style: tokens.supportingTextTypescale.toTextStyle(
              color: theme.paint(tokens.supportingTextColor),
            ),
            softWrap: true,
            textWidthBasis: TextWidthBasis.longestLine,
          ),
          action: action,
          close: close,
          paddingStart: tokens.containerPaddingInlineStart,
          paddingEnd: tokens.containerPaddingInlineEnd,
          paddingEndWithControls: tokens.containerPaddingInlineEndWithControls,
          paddingBlock: tokens.containerPaddingBlock,
          gap: tokens.containerGap,
          controlsGap: tokens.controlsGap,
          minHeight: tokens.containerMinHeight,
          target: theme.system.measure.targetTouch,
          textDirection: Directionality.of(context),
        ),
      ),
    );
    // SNK-10: the message is text of the snackbar's node (announced by the host, not a live region).
    bar = Semantics(container: true, explicitChildNodes: true, child: bar);
    if (host == null) {
      return Focus(
        canRequestFocus: false,
        skipTraversal: true,
        includeSemantics: false,
        onKeyEvent: _handleKey,
        child: bar,
      );
    }
    // SNK-9: hovered or focused, it waits.
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      includeSemantics: false,
      onKeyEvent: _handleKey,
      onFocusChange: host.focus,
      child: MouseRegion(
        onEnter: (_) => host.hover(true),
        onExit: (_) => host.hover(false),
        child: bar,
      ),
    );
  }
}

/// The action or the close button (the `control` axis): a pressable with Button's
/// press, ripple, press-hold and focus ring (SNK-1…7), drawn from `controls[control]`.
class _SnackbarControl extends StatefulWidget {
  const _SnackbarControl({required this.control, required this.label, required this.onPressed});

  final TanreiSnackbarControl control;

  /// The action's label, or the close button's accessible name.
  final String label;
  final VoidCallback onPressed;

  bool get isClose => control == TanreiSnackbarControl.close;

  @override
  State<_SnackbarControl> createState() => _SnackbarControlState();
}

class _SnackbarControlState extends State<_SnackbarControl>
    with
        TickerProviderStateMixin<_SnackbarControl>,
        TanreiPressableStateMixin<_SnackbarControl, TanreiControlVisuals> {
  TanreiSnackbarTokens get _tokens => TanreiTheme.of(context).system.snackbar;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SNK-6: a ripple grows over the component's feedback duration.
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
    final TanreiSnackbarTokens tokens = theme.system.snackbar;
    final TanreiSnackbarControlTokens control = tokens.controls[widget.control];
    final TanreiSnackbarControlStateTokens drawn = control.of(drawnState);
    final TanreiSnackbarStateTokens? state = tokens.stateTokens(drawnState);
    // SNK-2, SNK-6: the drawn state's tokens, the container of the state the press feedback names.
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: control.of(containerState).containerColor,
        labelColor: drawn.contentColor,
        outlineColor: const TanreiPaint.none(),
        elevation: const <TanreiShadowLayer>[],
        opacity: state?.opacity,
        shape: tokens.controlsShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );
    // SNK-15: the action's label on one line within its padding; the close glyph in a square.
    final Widget content = widget.isClose
        ? SizedBox.square(
            dimension: tokens.controlsHeight,
            child: Center(
              child: TanreiControlIcon(
                icon: const Text(_closeGlyph),
                size: tokens.controlsIconSize,
                selected: false,
                color: visuals.label,
              ),
            ),
          )
        : ConstrainedBox(
            constraints: BoxConstraints(minHeight: tokens.controlsHeight),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: tokens.controlsPaddingInline),
              child: Center(
                widthFactor: 1,
                heightFactor: 1,
                child: ExcludeSemantics(
                  child: Text(
                    widget.label,
                    style: tokens.controlsLabelTypescale.toTextStyle(color: visuals.label),
                    maxLines: 1,
                    softWrap: false,
                  ),
                ),
              ),
            ),
          );
    // SNK-4: the node is as large as the target the row hit-tests, the control keeps its size.
    return _TargetSemantics(
      target: theme.system.measure.targetTouch,
      child: Semantics(
        button: true,
        label: tanreiIsAccessibleName(widget.label) ? widget.label : null,
        child: buildPressable(
          child: Opacity(
            opacity: visuals.opacity,
            // SNK-3, SNK-7: the focus ring around the control, as the focus style says.
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
                child: content,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The semantics node of a snackbar control, grown around its centre to at least [target] on both
/// axes (SNK-4): the control keeps its visual size in the row, which hit-tests the same area.
class _TargetSemantics extends SingleChildRenderObjectWidget {
  const _TargetSemantics({required this.target, super.child});

  final double target;

  @override
  _RenderTargetSemantics createRenderObject(BuildContext context) => _RenderTargetSemantics(target);

  @override
  void updateRenderObject(BuildContext context, _RenderTargetSemantics renderObject) {
    renderObject.target = target;
  }
}

class _RenderTargetSemantics extends RenderProxyBox {
  _RenderTargetSemantics(this._target);

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
    width: math.max(size.width, _target),
    height: math.max(size.height, _target),
  );

  @override
  void describeSemanticsConfiguration(SemanticsConfiguration config) {
    super.describeSemanticsConfiguration(config);
    config.isSemanticBoundary = true;
  }
}

/// The slots of a [_SnackbarRow].
enum _Slot { message, action, close }

/// The inside of the bar (SNK-14, SNK-15, SNK-16, SNK-18): the message, then — `gap` later — the
/// action and the close button, `controlsGap` apart and centred on the message's first line; the
/// action moves to a row of its own, `gap` below the message's text, end-aligned, with
/// `paddingEndWithControls` below it, when the message would need more than two lines beside the
/// controls or the controls leave it less than its longest word. Padded as the tokens
/// say, mirrored in right-to-left. Each control is hit-tested over at least [target] on both
/// axes around its centre, without changing its size (SNK-4).
class _SnackbarRow extends SlottedMultiChildRenderObjectWidget<_Slot, RenderBox> {
  const _SnackbarRow({
    required this.message,
    this.action,
    this.close,
    required this.paddingStart,
    required this.paddingEnd,
    required this.paddingEndWithControls,
    required this.paddingBlock,
    required this.gap,
    required this.controlsGap,
    required this.minHeight,
    required this.target,
    required this.textDirection,
  });

  final Widget message;
  final Widget? action;
  final Widget? close;
  final double paddingStart;
  final double paddingEnd;
  final double paddingEndWithControls;
  final double paddingBlock;
  final double gap;
  final double controlsGap;
  final double minHeight;
  final double target;
  final TextDirection textDirection;

  @override
  Iterable<_Slot> get slots => _Slot.values;

  @override
  Widget? childForSlot(_Slot slot) => switch (slot) {
    _Slot.message => message,
    _Slot.action => action,
    _Slot.close => close,
  };

  @override
  _RenderSnackbarRow createRenderObject(BuildContext context) => _RenderSnackbarRow(
    paddingStart: paddingStart,
    paddingEnd: paddingEnd,
    paddingEndWithControls: paddingEndWithControls,
    paddingBlock: paddingBlock,
    gap: gap,
    controlsGap: controlsGap,
    minHeight: minHeight,
    target: target,
    textDirection: textDirection,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderSnackbarRow renderObject) {
    renderObject
      .._paddingStart = paddingStart
      .._paddingEnd = paddingEnd
      .._paddingEndWithControls = paddingEndWithControls
      .._paddingBlock = paddingBlock
      .._gap = gap
      .._controlsGap = controlsGap
      .._minHeight = minHeight
      .._target = target
      .._textDirection = textDirection
      ..markNeedsLayout();
  }
}

/// The render object of a snackbar's content, as tests see it.
abstract interface class RenderTanreiSnackbarRow implements RenderObject {
  /// Whether the action was laid out on a row of its own (SNK-16).
  bool get actionOnOwnRow;
}

class _RenderSnackbarRow extends RenderBox
    with SlottedContainerRenderObjectMixin<_Slot, RenderBox>
    implements RenderTanreiSnackbarRow {
  _RenderSnackbarRow({
    required double paddingStart,
    required double paddingEnd,
    required double paddingEndWithControls,
    required double paddingBlock,
    required double gap,
    required double controlsGap,
    required double minHeight,
    required double target,
    required TextDirection textDirection,
  }) : _paddingStart = paddingStart,
       _paddingEnd = paddingEnd,
       _paddingEndWithControls = paddingEndWithControls,
       _paddingBlock = paddingBlock,
       _gap = gap,
       _controlsGap = controlsGap,
       _minHeight = minHeight,
       _target = target,
       _textDirection = textDirection;

  double _paddingStart;
  double _paddingEnd;
  double _paddingEndWithControls;
  double _paddingBlock;
  double _gap;
  double _controlsGap;
  double _minHeight;
  double _target;
  TextDirection _textDirection;

  @override
  bool get actionOnOwnRow => _stacked;
  bool _stacked = false;

  RenderBox? get _message => childForSlot(_Slot.message);
  RenderBox? get _action => childForSlot(_Slot.action);
  RenderBox? get _close => childForSlot(_Slot.close);

  static RenderParagraph? _paragraphOf(RenderBox? child) {
    RenderObject? node = child;
    while (node is RenderProxyBox) {
      node = node.child;
    }
    return node is RenderParagraph ? node : null;
  }

  static double _lineHeightOf(RenderParagraph paragraph) {
    final TextPainter painter = TextPainter(
      text: TextSpan(text: ' ', style: paragraph.text.style),
      textDirection: paragraph.textDirection,
      textScaler: paragraph.textScaler,
      strutStyle: paragraph.strutStyle,
      textHeightBehavior: paragraph.textHeightBehavior,
    );
    final double height = painter.preferredLineHeight;
    painter.dispose();
    return height;
  }

  @override
  double computeMinIntrinsicWidth(double height) =>
      _layout(const BoxConstraints(), dry: true).width;

  @override
  double computeMaxIntrinsicWidth(double height) =>
      _layout(const BoxConstraints(), dry: true).width;

  @override
  double computeMinIntrinsicHeight(double width) =>
      _layout(BoxConstraints(maxWidth: width), dry: true).height;

  @override
  double computeMaxIntrinsicHeight(double width) => computeMinIntrinsicHeight(width);

  @override
  Size computeDryLayout(covariant BoxConstraints constraints) => _layout(constraints, dry: true);

  @override
  void performLayout() {
    size = _layout(constraints, dry: false);
  }

  final Map<_Slot, Offset> _offsets = <_Slot, Offset>{};

  Size _layout(BoxConstraints constraints, {required bool dry}) {
    Size sizeOf(RenderBox? child, BoxConstraints c) {
      if (child == null) {
        return Size.zero;
      }
      if (dry) {
        return child.getDryLayout(c);
      }
      child.layout(c, parentUsesSize: true);
      return child.size;
    }

    final RenderBox? message = _message;
    final RenderBox? action = _action;
    final RenderBox? close = _close;
    // The controls keep their natural size: the label on one line, the close button square.
    final Size actionSize = sizeOf(action, const BoxConstraints());
    final Size closeSize = sizeOf(close, const BoxConstraints());
    final bool controls = action != null || close != null;
    final double end = controls ? _paddingEndWithControls : _paddingEnd;
    final double controlsWidth =
        actionSize.width + closeSize.width + (action != null && close != null ? _controlsGap : 0);
    final bool bounded = constraints.hasBoundedWidth;
    final double messageNatural = message?.getMaxIntrinsicWidth(double.infinity) ?? 0;
    final double messageLongestWord = message?.getMinIntrinsicWidth(double.infinity) ?? 0;
    final double inlineRoom = bounded
        ? constraints.maxWidth - _paddingStart - end - (controls ? _gap + controlsWidth : 0)
        : messageNatural;
    final RenderParagraph? paragraph = _paragraphOf(message);
    final double line = paragraph == null ? 0 : _lineHeightOf(paragraph);

    // SNK-16: inline, unless the message would take more than two lines there, or the controls
    // leave it less than its longest word.
    bool stacked = false;
    Size messageSize = Size.zero;
    if (message != null) {
      final double room = math.max(0, inlineRoom);
      final Size inline = dry
          ? message.getDryLayout(BoxConstraints(maxWidth: room))
          : (message..layout(BoxConstraints(maxWidth: room), parentUsesSize: true)).size;
      final int lines = line > 0 ? (inline.height / line).round() : 1;
      stacked = action != null && (lines > 2 || room < messageLongestWord);
      messageSize = inline;
    }
    if (stacked) {
      // Row one: the message and the close button; row two: the action, at the end.
      final double closeRoom = close == null ? 0 : _gap + closeSize.width;
      final double firstEnd = close == null ? _paddingEnd : _paddingEndWithControls;
      final double room = bounded
          ? math.max(0, constraints.maxWidth - _paddingStart - firstEnd - closeRoom)
          : messageNatural;
      messageSize = sizeOf(message, BoxConstraints(maxWidth: room));
    }
    if (!dry) {
      _stacked = stacked;
    }

    // Vertical positions: the controls centred on the first line; nothing above the top.
    final double firstLine = math.min(line > 0 ? line : messageSize.height, messageSize.height);
    final double firstCentre = _paddingBlock + firstLine / 2;
    final double tallestInline = math.max(stacked ? 0 : actionSize.height, closeSize.height);
    final double shift = math.max(0, tallestInline / 2 - firstCentre);
    final double messageTop = _paddingBlock + shift;
    final double centre = firstCentre + shift;
    double contentBottom = messageTop + messageSize.height + _paddingBlock;
    contentBottom = math.max(contentBottom, centre + tallestInline / 2 + shift);
    double actionTop = centre - actionSize.height / 2;
    if (stacked) {
      // The action's row: gap below the message's text, the controls' end inset above the edge.
      actionTop = messageTop + messageSize.height + _gap;
      contentBottom = actionTop + actionSize.height + _paddingEndWithControls;
    }

    // Widths: hug the content, within the constraints.
    final double inlineWidth =
        _paddingStart +
        messageSize.width +
        (controls && !stacked ? _gap + controlsWidth : 0) +
        (stacked ? 0 : end);
    final double stackedWidth = stacked
        ? math.max(
            _paddingStart +
                messageSize.width +
                (close == null ? _paddingEnd : _gap + closeSize.width + _paddingEndWithControls),
            _paddingStart + actionSize.width + _paddingEndWithControls,
          )
        : 0;
    final Size size = constraints.constrain(
      Size(stacked ? stackedWidth : inlineWidth, math.max(_minHeight, contentBottom)),
    );
    // Centred in a minimum height taller than the content.
    final double extra = math.max(0, size.height - contentBottom) / 2;

    if (!dry) {
      final bool rtl = _textDirection == TextDirection.rtl;
      Offset place(double start, double top, double width) =>
          Offset(rtl ? size.width - start - width : start, top + extra);
      _offsets[_Slot.message] = place(_paddingStart, messageTop, messageSize.width);
      double controlEnd = size.width - _paddingEndWithControls;
      if (close != null) {
        _offsets[_Slot.close] = place(
          controlEnd - closeSize.width,
          centre - closeSize.height / 2,
          closeSize.width,
        );
        controlEnd -= closeSize.width + _controlsGap;
      }
      if (action != null) {
        final double actionEnd = stacked ? size.width - _paddingEndWithControls : controlEnd;
        _offsets[_Slot.action] = place(actionEnd - actionSize.width, actionTop, actionSize.width);
      }
      for (final _Slot slot in _Slot.values) {
        final RenderBox? child = childForSlot(slot);
        if (child != null) {
          (child.parentData! as BoxParentData).offset = _offsets[slot]!;
        }
      }
    }
    return size;
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final RenderBox child in children) {
      context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
    }
  }

  @override
  bool hitTestSelf(Offset position) => false;

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    // SNK-4: a control answers over at least the target around its centre.
    for (final RenderBox? control in <RenderBox?>[_close, _action]) {
      if (control == null) {
        continue;
      }
      final Offset at = (control.parentData! as BoxParentData).offset;
      final Rect rect = at & control.size;
      final Rect area = Rect.fromCenter(
        center: rect.center,
        width: math.max(rect.width, _target),
        height: math.max(rect.height, _target),
      );
      if (!area.contains(position)) {
        continue;
      }
      final bool hit = rect.contains(position)
          ? result.addWithPaintOffset(
              offset: at,
              position: position,
              hitTest: (BoxHitTestResult result, Offset transformed) =>
                  control.hitTest(result, position: transformed),
            )
          // In the added area: forwarded to the control's centre, as TanreiTapTarget does.
          : result.addWithRawTransform(
              transform: MatrixUtils.forceToPoint(control.size.center(Offset.zero)),
              position: position,
              hitTest: (BoxHitTestResult result, Offset _) =>
                  control.hitTest(result, position: control.size.center(Offset.zero)),
            );
      if (hit) {
        return true;
      }
    }
    final RenderBox? message = _message;
    if (message == null) {
      return false;
    }
    final Offset at = (message.parentData! as BoxParentData).offset;
    return result.addWithPaintOffset(
      offset: at,
      position: position,
      hitTest: (BoxHitTestResult result, Offset transformed) =>
          message.hitTest(result, position: transformed),
    );
  }
}
