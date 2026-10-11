import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/enum_by_name.dart';
import '../primitives/ignored_value.dart';
import '../theme/motion.dart';
import '../theme/text_style.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// The form of a [TanreiTooltip] (the spec's `variant`): a structural choice, not a token axis.
enum TanreiTooltipVariant {
  /// One short phrase on the inverse surface, for naming what an icon does.
  plain,

  /// An optional title and a few sentences on a raised surface, for explaining something.
  rich;

  /// The variant named [name], or [plain] — reported in debug builds — for a name the tooltip does
  /// not define.
  static TanreiTooltipVariant fromName(String name) =>
      tanreiEnumByName(values, name, fallback: plain, kind: 'tooltip variant');
}

/// The side of the anchor a [TanreiTooltip] prefers (the spec's `placement`). It flips to the
/// opposite side when the preferred one has no room; [start] and [end] follow the layout direction.
enum TanreiTooltipPlacement {
  /// Above the anchor.
  top,

  /// Below the anchor.
  bottom,

  /// Before the anchor: its left in a left-to-right layout.
  start,

  /// After the anchor: its right in a left-to-right layout.
  end;

  /// The placement named [name], or [top] — reported in debug builds — for a name the tooltip does
  /// not define.
  static TanreiTooltipPlacement fromName(String name) =>
      tanreiEnumByName(values, name, fallback: top, kind: 'tooltip placement');
}

/// Shows and hides a [TanreiTooltip] (the spec's `open`) and reports what it does by itself (the
/// spec's `toggle`), as `OverlayPortalController` and a `ChangeNotifier`:
///
/// * [show] and [hide] are the product setting `open`: the tooltip shows or hides and then keeps
///   opening and closing itself; they do not notify listeners (TIP-7: setting `open` emits no
///   toggle);
/// * listeners are notified — the spec's `toggle` — when the tooltip opens or closes by itself
///   (hover, focus, long-press, Escape, the touch timeout, another tooltip opening); [isOpen] then
///   holds the new value.
class TanreiTooltipController extends ChangeNotifier {
  /// Creates a controller, [open] or not.
  TanreiTooltipController({bool open = false}) : _isOpen = open;

  bool _isOpen;
  ValueChanged<bool>? _attached;

  /// Whether the tooltip is showing.
  bool get isOpen => _isOpen;

  /// Shows the tooltip (without notifying listeners).
  void show() => _set(true);

  /// Hides the tooltip (without notifying listeners).
  void hide() => _set(false);

  void _set(bool open) {
    if (_isOpen != open) {
      _isOpen = open;
      _attached?.call(open);
    }
  }

  /// The tooltip changed by itself: the spec's toggle.
  void _toggled(bool open) {
    if (_isOpen != open) {
      _isOpen = open;
      notifyListeners();
    }
  }
}

/// Whether [event] is the Escape a [TanreiTooltip] took to close itself (TIP-4). A component that
/// closes on Escape itself — a dialog — checks it first and leaves the key alone, so that Escape
/// closes only the tooltip.
bool tanreiTooltipTookKey(KeyEvent event) => identical(event, _TooltipRegistry.tookKey);

/// Keeps one tooltip open in the window (TIP-8) and takes Escape for it (TIP-4).
abstract final class _TooltipRegistry {
  static _TanreiTooltipState? open;
  static final Set<_TanreiTooltipState> _mounted = <_TanreiTooltipState>{};
  static KeyEvent? tookKey;

  static void mount(_TanreiTooltipState state) {
    if (_mounted.isEmpty) {
      HardwareKeyboard.instance.addHandler(_handleKey);
    }
    _mounted.add(state);
  }

  static void unmount(_TanreiTooltipState state) {
    _mounted.remove(state);
    if (identical(open, state)) {
      open = null;
    }
    if (_mounted.isEmpty) {
      HardwareKeyboard.instance.removeHandler(_handleKey);
      tookKey = null;
    }
  }

  // Runs before the focus system sees the key: whatever has focus, an open tooltip closes on
  // Escape, and the anchor's (or a Tanrei dialog's) key handler then consumes that same event.
  static bool _handleKey(KeyEvent event) {
    if (event is! KeyDownEvent) {
      return false;
    }
    tookKey = null;
    final _TanreiTooltipState? current = open;
    if (current == null) {
      return false;
    }
    final LogicalKeyboardKey key = event.logicalKey;
    if (key == LogicalKeyboardKey.escape) {
      tookKey = event;
      current._escape();
    } else if (current._keyboardFocus &&
        (key == LogicalKeyboardKey.enter ||
            key == LogicalKeyboardKey.numpadEnter ||
            key == LogicalKeyboardKey.space)) {
      // TIP-6: Enter or Space activates the focused anchor (which handles the key itself, before
      // any ancestor sees it), and the tooltip closes.
      current._activated();
    }
    return false;
  }
}

/// Describes an element in a few words when a person points at it, focuses it with the keyboard
/// or long-presses it, without taking focus or blocking anything.
///
/// Implements `specs/tooltip.spec.json` with the idiom of Flutter's `Tooltip`:
///
/// * [message] is the spec's `text`, [title] its heading (rich only), [variant] and [placement];
/// * [excludeFromSemantics] is the inverse of the spec's `describes`: while false the text (after
///   the title) is [child]'s accessible description (`Semantics(tooltip:)`), whether or not the
///   tooltip is open; set it when the text repeats the anchor's own name;
/// * [controller] is the spec's `open` ([TanreiTooltipController.show] / `hide`) and `toggle` (its
///   listeners).
///
/// It opens after a mouse rests on [child] for `motion.show-delay` (and stays while the pointer
/// moves onto it, closing `motion.hide-delay` after the pointer left both), at once on keyboard
/// focus, and on a touch long-press (closing `timeout.touch` after the finger lifts). Escape closes
/// it without moving focus, and consumes the key; activating [child] closes it; the next tooltip
/// opens without the delay, and only one is open at a time.
///
/// The tooltip is drawn through an `OverlayPortal` in the nearest `Overlay` (so above a dialog
/// route opened earlier), placed on [placement]'s side of [child], flipped or shifted to stay
/// `window-margin` inside the overlay's safe area, following [child] as it moves. It takes no
/// focus and holds nothing interactive; a press on it closes it and goes no further.
class TanreiTooltip extends StatefulWidget {
  /// Describes [child] with [message].
  const TanreiTooltip({
    super.key,
    required this.message,
    this.variant = TanreiTooltipVariant.plain,
    this.title = '',
    this.placement = TanreiTooltipPlacement.top,
    this.excludeFromSemantics = false,
    this.controller,
    required this.child,
  });

  /// The description. Required: while it is empty the tooltip never opens.
  final String message;

  /// Plain or rich.
  final TanreiTooltipVariant variant;

  /// A heading above [message] in a rich tooltip; a plain one ignores it.
  final String title;

  /// The side of [child] the tooltip prefers.
  final TanreiTooltipPlacement placement;

  /// Whether the text is kept out of [child]'s semantics (the spec's `describes`, inverted).
  final bool excludeFromSemantics;

  /// Shows and hides the tooltip, and reports when it changes by itself.
  final TanreiTooltipController? controller;

  /// The anchor.
  final Widget child;

  @override
  State<TanreiTooltip> createState() => _TanreiTooltipState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('message', message))
      ..add(EnumProperty<TanreiTooltipVariant>('variant', variant))
      ..add(StringProperty('title', title, defaultValue: ''))
      ..add(EnumProperty<TanreiTooltipPlacement>('placement', placement))
      ..add(FlagProperty('excludeFromSemantics', value: excludeFromSemantics, ifTrue: 'excluded'));
  }
}

class _TanreiTooltipState extends State<TanreiTooltip> with SingleTickerProviderStateMixin {
  final OverlayPortalController _overlay = OverlayPortalController(debugLabel: 'TanreiTooltip');
  late final AnimationController _fade = AnimationController(vsync: this);
  late final CurvedAnimation _fadeCurve = CurvedAnimation(parent: _fade, curve: Curves.linear);
  final List<ScrollPosition> _scrolls = <ScrollPosition>[];

  Timer? _showTimer;
  Timer? _hideTimer;
  Timer? _touchTimer;

  bool _open = false;
  bool _hoverAnchor = false;
  bool _hoverTooltip = false;
  bool _keyboardFocus = false;
  bool _byTouch = false;
  bool _followPending = false;

  /// After Escape (TIP-4) or an activation (TIP-6): closed until the pointer enters the anchor
  /// again or the anchor is focused again.
  bool _suppressed = false;
  String _reported = '';

  TanreiTooltipController? _controller;

  bool get _hasText => widget.message.isNotEmpty;

  TanreiTooltipTokens get _tokens => TanreiTheme.of(context).system.tooltip;

  /// TIP-15: reduced motion keeps the fade (nothing moves), except on Android, whose setting
  /// removes every animation: there the tooltip appears and disappears at once.
  bool get _reduceMotion =>
      (MediaQuery.maybeDisableAnimationsOf(context) ?? false) &&
      defaultTargetPlatform == TargetPlatform.android;

  @override
  void initState() {
    super.initState();
    _TooltipRegistry.mount(this);
    _fade.addStatusListener(_handleFadeStatus);
    _attach(widget.controller);
    if (_controller?.isOpen ?? false) {
      // Open from the start (a first-run hint, a fixture): drawn at once.
      _showNow(self: false, animate: false);
    }
  }

  void _attach(TanreiTooltipController? controller) {
    _controller?._attached = null;
    _controller = controller;
    controller?._attached = _handleProductSet;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_followPending) {
      _followPending = false;
      _follow();
    }
    final TanreiTooltipTokens tokens = _tokens;
    _fade
      ..duration = tanreiDuration(tokens.motionEnterDuration)
      ..reverseDuration = tanreiDuration(tokens.motionExitDuration);
    _fadeCurve
      ..curve = tokens.motionEnterEasing.toCurve()
      ..reverseCurve = tokens.motionExitEasing.toCurve().flipped;
  }

  @override
  void didUpdateWidget(TanreiTooltip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      _attach(widget.controller);
      _handleProductSet(widget.controller?.isOpen ?? false);
    }
    if (!_hasText && _open) {
      _hideNow(self: true, animate: false);
    }
  }

  @override
  void dispose() {
    // TIP-9: a removed anchor takes its tooltip with it.
    _controller?._attached = null;
    _showTimer?.cancel();
    _hideTimer?.cancel();
    _touchTimer?.cancel();
    _stopFollowing();
    _TooltipRegistry.unmount(this);
    _fadeCurve.dispose();
    _fade.dispose();
    super.dispose();
  }

  // TIP-7: the product set open — show or hide, emitting nothing.
  void _handleProductSet(bool open) {
    if (open) {
      _showNow(self: false);
    } else {
      _hideNow(self: false);
    }
  }

  void _handleFadeStatus(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && !_open) {
      _syncOverlay();
    }
  }

  bool _syncScheduled = false;

  /// Shows the overlay child while the tooltip is open or fading out, and hides it otherwise; an
  /// `OverlayPortal` cannot change during a build, so a change asked for then waits for the frame
  /// to end.
  void _syncOverlay() {
    if (!mounted) {
      return;
    }
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.persistentCallbacks) {
      if (!_syncScheduled) {
        _syncScheduled = true;
        SchedulerBinding.instance.addPostFrameCallback((_) {
          _syncScheduled = false;
          _syncOverlay();
        });
      }
      return;
    }
    final bool wanted = _open || _fade.value > _fade.lowerBound;
    if (wanted && !_overlay.isShowing) {
      _overlay.show();
    } else if (!wanted && _overlay.isShowing) {
      _overlay.hide();
    }
  }

  /// Opens now (TIP-8: closing the tooltip that is open elsewhere). [self]: the tooltip opened by
  /// itself and emits toggle.
  void _showNow({required bool self, bool animate = true}) {
    _showTimer?.cancel();
    _hideTimer?.cancel();
    if (!_hasText) {
      return;
    }
    final _TanreiTooltipState? other = _TooltipRegistry.open;
    if (other != null && !identical(other, this)) {
      other._hideNow(self: true, animate: false);
    }
    _TooltipRegistry.open = this;
    if (_open) {
      return;
    }
    _open = true;
    if (animate) {
      _follow();
    } else {
      // From initState: follow once the dependencies are known.
      _followPending = true;
    }
    if (animate) {
      _syncOverlay();
    } else {
      // From initState, before the portal is built: its first build shows it.
      _overlay.show();
    }
    // TIP-15: a fade in, at once where animations are off (or for a tooltip open from the start).
    if (!animate || _reduceMotion) {
      _fade.value = _fade.upperBound;
    } else {
      _fade.forward();
    }
    if (self) {
      _controller?._toggled(true);
    }
  }

  void _hideNow({required bool self, bool animate = true}) {
    _showTimer?.cancel();
    _hideTimer?.cancel();
    _touchTimer?.cancel();
    _byTouch = false;
    if (identical(_TooltipRegistry.open, this)) {
      _TooltipRegistry.open = null;
    }
    if (!_open) {
      return;
    }
    _open = false;
    _stopFollowing();
    if (!animate || _reduceMotion) {
      _fade.value = _fade.lowerBound;
      _syncOverlay();
    } else {
      _fade.reverse();
    }
    if (self) {
      _controller?._toggled(false);
    }
  }

  // TIP-1: a mouse resting on the anchor opens it after the show delay — at once while another
  // tooltip is open (TIP-8).
  void _handleAnchorEnter(PointerEnterEvent event) {
    _hoverAnchor = true;
    _suppressed = false;
    _hideTimer?.cancel();
    if (_open) {
      return;
    }
    if (_TooltipRegistry.open != null) {
      _showNow(self: true);
      return;
    }
    _showTimer?.cancel();
    _showTimer = Timer(tanreiDuration(_tokens.motionShowDelay), () {
      if (mounted && _hoverAnchor && !_suppressed) {
        _showNow(self: true);
      }
    });
  }

  void _handleAnchorExit(PointerExitEvent event) {
    _hoverAnchor = false;
    _showTimer?.cancel();
    _scheduleHide();
  }

  void _handleTooltipEnter(PointerEnterEvent event) {
    _hoverTooltip = true;
    _hideTimer?.cancel();
  }

  void _handleTooltipExit(PointerExitEvent event) {
    _hoverTooltip = false;
    _scheduleHide();
  }

  // TIP-1, TIP-5: closes once the pointer has been off the anchor and the tooltip for the hide
  // delay, unless the anchor has keyboard focus.
  void _scheduleHide() {
    if (!_open || _byTouch) {
      return;
    }
    _hideTimer?.cancel();
    _hideTimer = Timer(tanreiDuration(_tokens.motionHideDelay), () {
      if (mounted && !_hoverAnchor && !_hoverTooltip && !_keyboardFocus) {
        _hideNow(self: true);
      }
    });
  }

  // TIP-2: keyboard focus opens at once; losing focus closes. A pointer's focus does nothing.
  void _handleFocusChange(bool focused) {
    if (focused) {
      if (FocusManager.instance.highlightMode == FocusHighlightMode.traditional) {
        _keyboardFocus = true;
        _suppressed = false;
        _showNow(self: true);
      }
    } else {
      _keyboardFocus = false;
      if (_open && !_hoverAnchor && !_hoverTooltip) {
        _hideNow(self: true);
      }
    }
  }

  // TIP-4: Escape closes without moving focus; the registry took the key for the anchor to consume.
  void _escape() {
    _suppressed = true;
    _hideNow(self: true);
  }

  // TIP-4: the Escape the registry took is consumed here, before an enclosing dialog sees it.
  KeyEventResult _handleAnchorKey(FocusNode node, KeyEvent event) =>
      tanreiTooltipTookKey(event) ? KeyEventResult.handled : KeyEventResult.ignored;

  void _activated() {
    _suppressed = true;
    _hideNow(self: true);
  }

  // TIP-6: a press on the anchor closes it, and the same hover does not open it again.
  void _handleAnchorPointerDown(PointerDownEvent event) {
    if (event.kind == PointerDeviceKind.mouse) {
      _suppressed = true;
      _showTimer?.cancel();
    }
    if (_open) {
      _hideNow(self: true);
    }
  }

  // TIP-3: a long-press opens it without activating the anchor.
  void _handleLongPress() {
    _touchTimer?.cancel();
    _suppressed = false;
    _showNow(self: true);
    _byTouch = true;
  }

  void _handleLongPressEnd() {
    if (!_open) {
      return;
    }
    _touchTimer?.cancel();
    _touchTimer = Timer(tanreiDuration(_tokens.timeoutTouch), () {
      if (mounted) {
        _hideNow(self: true);
      }
    });
  }

  // TIP-3: a touch anywhere else closes it sooner.
  void _handleTapOutside(PointerDownEvent event) {
    if (_open && _byTouch) {
      _hideNow(self: true);
    }
  }

  // TIP-13: a press on the tooltip closes it and goes no further.
  void _handleTooltipPress() {
    _suppressed = true;
    _hideNow(self: true);
  }

  // TIP-9: follow the anchor while an ancestor scrolls.
  void _follow() {
    _stopFollowing();
    if (!mounted) {
      return;
    }
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

  /// The anchor's box, for the tooltip to be placed against when it paints.
  RenderBox? _anchorBox() {
    final RenderObject? anchor = mounted ? context.findRenderObject() : null;
    return anchor is RenderBox ? anchor : null;
  }

  // TIP-9: an anchor removed from layout or scrolled out of the window closes its tooltip.
  void _handleAnchorOutside() {
    if (mounted && _open) {
      _hideNow(self: true, animate: false);
    }
  }

  /// TIP-16: an empty text and a plain tooltip's title are reported once for each state that has
  /// them.
  void _debugCheck() {
    assert(() {
      final List<(String, String)> problems = <(String, String)>[
        if (!_hasText)
          (
            'message',
            'A tooltip without text never opens and describes nothing: give it a message.',
          ),
        if (widget.variant == TanreiTooltipVariant.plain && widget.title.isNotEmpty)
          (
            'title',
            'A plain tooltip draws no title: "${widget.title}" is ignored. Use a rich one.',
          ),
      ];
      final String signature = problems.map(((String, String) p) => p.$1).join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final (String prop, String why) in problems) {
          debugTanreiReportIgnoredValue('tooltip', prop, why, widget);
        }
      }
      return true;
    }());
  }

  Widget _buildOverlay(BuildContext overlayContext) {
    final TanreiTooltipTokens tokens = _tokens;
    return TapRegion(
      groupId: this,
      onTapOutside: _handleTapOutside,
      child: _TooltipPosition(
        anchor: _anchorBox,
        onAnchorOutside: _handleAnchorOutside,
        placement: widget.placement,
        textDirection: Directionality.of(context),
        offset: tokens.offset,
        margin: tokens.windowMargin,
        safeArea: MediaQuery.maybePaddingOf(context) ?? EdgeInsets.zero,
        child: FadeTransition(
          opacity: _fadeCurve,
          // TIP-13: nothing in it takes focus; TIP-14: it is not read a second time.
          child: ExcludeFocus(
            child: ExcludeSemantics(
              child: MouseRegion(
                onEnter: _handleTooltipEnter,
                onExit: _handleTooltipExit,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  excludeFromSemantics: true,
                  onTapDown: (_) => _handleTooltipPress(),
                  child: _TooltipSurface(
                    variant: widget.variant,
                    title: widget.title,
                    message: widget.message,
                  ),
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
    // TIP-14: the text (after a rich tooltip's title) is the anchor's description, open or not;
    // the anchor's name and role stay its own.
    final String description =
        widget.variant == TanreiTooltipVariant.rich && widget.title.isNotEmpty
        ? '${widget.title}, ${widget.message}'
        : widget.message;
    Widget anchor = widget.child;
    if (_hasText && !widget.excludeFromSemantics) {
      anchor = MergeSemantics(
        child: Semantics(tooltip: description, child: anchor),
      );
    }
    return TapRegion(
      groupId: this,
      child: OverlayPortal(
        controller: _overlay,
        overlayChildBuilder: _buildOverlay,
        child: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          includeSemantics: false,
          onFocusChange: _handleFocusChange,
          onKeyEvent: _handleAnchorKey,
          child: MouseRegion(
            onEnter: _handleAnchorEnter,
            onExit: _handleAnchorExit,
            child: Listener(
              onPointerDown: _handleAnchorPointerDown,
              child: RawGestureDetector(
                excludeFromSemantics: true,
                gestures: <Type, GestureRecognizerFactory>{
                  LongPressGestureRecognizer:
                      GestureRecognizerFactoryWithHandlers<LongPressGestureRecognizer>(
                        () => LongPressGestureRecognizer(
                          debugOwner: this,
                          supportedDevices: const <PointerDeviceKind>{PointerDeviceKind.touch},
                        ),
                        (LongPressGestureRecognizer recognizer) => recognizer
                          ..onLongPress = _handleLongPress
                          ..onLongPressEnd = (_) => _handleLongPressEnd(),
                      ),
                },
                child: anchor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The drawn tooltip (TIP-10, TIP-11, TIP-12): the container of its variant with the supporting
/// text, and a rich tooltip's title above it.
class _TooltipSurface extends StatelessWidget {
  const _TooltipSurface({required this.variant, required this.title, required this.message});

  final TanreiTooltipVariant variant;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiTooltipTokens tokens = theme.system.tooltip;
    final bool rich = variant == TanreiTooltipVariant.rich;
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: rich ? tokens.richContainerShape : tokens.plainContainerShape,
    );
    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      rich ? tokens.richContainerElevation : tokens.plainContainerElevation,
      theme.colors,
    );
    final Widget text = Text(
      message,
      style: (rich ? tokens.richSupportingTextTypescale : tokens.plainSupportingTextTypescale)
          .toTextStyle(
            color: theme.paint(
              rich ? tokens.richSupportingTextColor : tokens.plainSupportingTextColor,
            ),
          ),
      textAlign: TextAlign.start,
      softWrap: true,
    );
    final Widget content = rich && title.isNotEmpty
        ? Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: tokens.richContainerGap,
            children: <Widget>[
              Text(
                title,
                style: tokens.richTitleTypescale.toTextStyle(
                  color: theme.paint(tokens.richTitleColor),
                ),
                textAlign: TextAlign.start,
                softWrap: true,
              ),
              text,
            ],
          )
        : text;
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: rich ? tokens.richContainerMaxWidth : tokens.plainContainerMaxWidth,
        minHeight: rich ? 0 : tokens.plainContainerMinHeight,
      ),
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: shape,
          color: theme.paint(rich ? tokens.richContainerColor : tokens.plainContainerColor),
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: rich
                ? tokens.richContainerPaddingInline
                : tokens.plainContainerPaddingInline,
            vertical: rich ? tokens.richContainerPaddingBlock : tokens.plainContainerPaddingBlock,
          ),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            widthFactor: 1,
            heightFactor: 1,
            child: content,
          ),
        ),
      ),
    );
  }
}

/// Places the tooltip against its anchor (TIP-9): it fills the overlay, lays the tooltip out within
/// the room [margin] inside the overlay's [safeArea], and — when it paints, from where [anchor] is
/// then — puts it [offset] away on [placement]'s side, centred along it, or on the opposite side
/// when the preferred one has no room, or on the side with more room when neither has, shifted
/// along the side to stay inside. Placing at paint time uses the anchor's final position, so a
/// tooltip that is open from the first frame is placed in that frame, and one whose anchor moves
/// follows it.
class _TooltipPosition extends SingleChildRenderObjectWidget {
  const _TooltipPosition({
    required this.anchor,
    required this.onAnchorOutside,
    required this.placement,
    required this.textDirection,
    required this.offset,
    required this.margin,
    required this.safeArea,
    super.child,
  });

  final ValueGetter<RenderBox?> anchor;
  final VoidCallback onAnchorOutside;
  final TanreiTooltipPlacement placement;
  final TextDirection textDirection;
  final double offset;
  final double margin;
  final EdgeInsets safeArea;

  @override
  _RenderTooltipPosition createRenderObject(BuildContext context) => _RenderTooltipPosition(
    anchor: anchor,
    onAnchorOutside: onAnchorOutside,
    placement: placement,
    textDirection: textDirection,
    offset: offset,
    margin: margin,
    safeArea: safeArea,
  );

  @override
  void updateRenderObject(BuildContext context, _RenderTooltipPosition renderObject) {
    renderObject
      ..anchor = anchor
      ..onAnchorOutside = onAnchorOutside
      ..placement = placement
      ..textDirection = textDirection
      ..offset = offset
      ..margin = margin
      ..safeArea = safeArea
      // A rebuild (an ancestor scrolled, the theme changed): place again.
      ..markNeedsPaint();
  }
}

/// The render object that places a [TanreiTooltip], as tests see it.
abstract interface class RenderTanreiTooltipPosition implements RenderObject {
  /// The side the tooltip went to when it last painted, after flipping (start and end resolved to
  /// the layout direction's sides: [TanreiTooltipPlacement.start] is the left in left-to-right).
  TanreiTooltipPlacement get side;

  /// Where the tooltip went when it last painted, in the overlay's coordinates.
  Rect get tooltipRect;
}

class _RenderTooltipPosition extends RenderShiftedBox implements RenderTanreiTooltipPosition {
  _RenderTooltipPosition({
    required this.anchor,
    required this.onAnchorOutside,
    required TanreiTooltipPlacement placement,
    required TextDirection textDirection,
    required double offset,
    required double margin,
    required EdgeInsets safeArea,
  }) : _placement = placement,
       _textDirection = textDirection,
       _offset = offset,
       _margin = margin,
       _safeArea = safeArea,
       super(null);

  ValueGetter<RenderBox?> anchor;
  VoidCallback onAnchorOutside;

  TanreiTooltipPlacement _placement;
  set placement(TanreiTooltipPlacement value) =>
      _repaint(_placement != value, () => _placement = value);

  TextDirection _textDirection;
  set textDirection(TextDirection value) =>
      _repaint(_textDirection != value, () => _textDirection = value);

  double _offset;
  set offset(double value) => _repaint(_offset != value, () => _offset = value);

  double _margin;
  set margin(double value) {
    if (_margin != value) {
      _margin = value;
      markNeedsLayout();
    }
  }

  EdgeInsets _safeArea;
  set safeArea(EdgeInsets value) {
    if (_safeArea != value) {
      _safeArea = value;
      markNeedsLayout();
    }
  }

  void _repaint(bool changed, VoidCallback apply) {
    if (changed) {
      apply();
      markNeedsPaint();
    }
  }

  @override
  TanreiTooltipPlacement get side => _side;
  TanreiTooltipPlacement _side = TanreiTooltipPlacement.top;

  @override
  Rect get tooltipRect => _tooltipRect;
  Rect _tooltipRect = Rect.zero;

  /// The anchor where the tooltip was last placed against it.
  Rect? _placedAgainst;
  bool _checkScheduled = false;

  /// The room the tooltip may use: the overlay inside its safe area and the margin.
  Rect get _window => Rect.fromLTRB(
    _safeArea.left + _margin,
    _safeArea.top + _margin,
    size.width - _safeArea.right - _margin,
    size.height - _safeArea.bottom - _margin,
  );

  @override
  void performLayout() {
    size = constraints.biggest;
    final Rect window = _window;
    child?.layout(
      BoxConstraints(maxWidth: math.max(0, window.width), maxHeight: math.max(0, window.height)),
      parentUsesSize: true,
    );
  }

  /// The anchor's rect in this box's coordinates now, or null when it is not laid out here.
  Rect? _anchorRect() {
    final RenderBox? box = anchor();
    if (box == null || !box.attached || !box.hasSize || !attached) {
      return null;
    }
    return MatrixUtils.transformRect(box.getTransformTo(this), Offset.zero & box.size);
  }

  void _place(Rect anchorRect) {
    final RenderBox child = this.child!;
    final Rect window = _window;
    final Size tip = child.size;
    final bool rtl = _textDirection == TextDirection.rtl;
    final bool vertical =
        _placement == TanreiTooltipPlacement.top || _placement == TanreiTooltipPlacement.bottom;
    // Start and end become left and right; top and bottom stay. "Low" is above or to the left.
    final bool towardsLow = switch (_placement) {
      TanreiTooltipPlacement.top => true,
      TanreiTooltipPlacement.bottom => false,
      TanreiTooltipPlacement.start => !rtl,
      TanreiTooltipPlacement.end => rtl,
    };
    final double needed = (vertical ? tip.height : tip.width) + _offset;
    final double low = vertical ? anchorRect.top - window.top : anchorRect.left - window.left;
    final double high = vertical
        ? window.bottom - anchorRect.bottom
        : window.right - anchorRect.right;
    bool useLow = towardsLow;
    if ((towardsLow ? low : high) < needed) {
      if ((towardsLow ? high : low) >= needed) {
        useLow = !towardsLow;
      } else {
        useLow = low >= high;
      }
    }
    double along(double value, double min, double max) =>
        max < min ? min : value.clamp(min, max).toDouble();
    final double x;
    final double y;
    if (vertical) {
      y = useLow ? anchorRect.top - _offset - tip.height : anchorRect.bottom + _offset;
      x = along(anchorRect.center.dx - tip.width / 2, window.left, window.right - tip.width);
      _side = useLow ? TanreiTooltipPlacement.top : TanreiTooltipPlacement.bottom;
    } else {
      x = useLow ? anchorRect.left - _offset - tip.width : anchorRect.right + _offset;
      y = along(anchorRect.center.dy - tip.height / 2, window.top, window.bottom - tip.height);
      _side = useLow == !rtl ? TanreiTooltipPlacement.start : TanreiTooltipPlacement.end;
    }
    _tooltipRect = Rect.fromLTWH(x, y, tip.width, tip.height);
    (child.parentData! as BoxParentData).offset = Offset(x, y);
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    final RenderBox? child = this.child;
    if (child == null) {
      return;
    }
    final Rect? anchorRect = _anchorRect();
    _placedAgainst = anchorRect;
    _scheduleCheck();
    if (anchorRect == null || !anchorRect.overlaps(Offset.zero & size)) {
      // TIP-9: the anchor left the window (or layout): the tooltip closes.
      SchedulerBinding.instance.addPostFrameCallback((_) => onAnchorOutside());
      return;
    }
    _place(anchorRect);
    context.paintChild(child, offset + (child.parentData! as BoxParentData).offset);
  }

  // TIP-9: after each frame, check whether the anchor moved (a layout change); if so, place again.
  void _scheduleCheck() {
    if (_checkScheduled) {
      return;
    }
    _checkScheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _checkScheduled = false;
      if (attached && _anchorRect() != _placedAgainst) {
        markNeedsPaint();
      }
    });
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      _placedAgainst != null && super.hitTestChildren(result, position: position);

  // The overlay itself takes no pointer: only the tooltip does.
  @override
  bool hitTestSelf(Offset position) => false;
}
