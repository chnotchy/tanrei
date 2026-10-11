import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import 'container_decoration.dart';
import 'interaction_state.dart';

/// Everything a pressable control does between input and its tokens, once for every component
/// (the interactive widget recipe of `packages/flutter/AGENTS.md`):
///
/// * the interaction state: hover, keyboard focus (`WidgetState.focused` is set from
///   `onShowFocusHighlight`, so only for keyboard focus), press and disabled in a
///   [WidgetStatesController], resolved to the one state drawn by [tanreiInteractionStateOf];
/// * activation by pointer, touch, Enter, Space and assistive technology, exactly once each;
/// * the press shown without delay and held for `motion.duration.pressHold` (spec BTN-8), with a
///   `Timer`, for pointer, touch and keyboard alike;
/// * the answer to a press that `behavior.pressedFeedback` chooses (BTN-9): [stateBeneathPress],
///   [drawnState], [containerState] and the ripple ([rippleFor]);
/// * state transitions: [animateVisuals] eases from what was drawn to the new state's visuals with
///   the component's motion tokens; entering pressed, a first build and disabled animations
///   (`MediaQuery.disableAnimationsOf`) apply at once, and a theme change is not a transition.
///
/// A component mixes it into its `State` (with [TickerProviderStateMixin]), implements the four
/// abstract members, wraps its visual in [buildPressable] and gives its container
/// [pressContainerKey]. It still never computes how a state looks: it reads the tokens of
/// [drawnState] (and of [containerState] for the container color).
mixin TanreiPressableStateMixin<S extends StatefulWidget, V extends Object>
    on TickerProviderStateMixin<S> {
  static const Set<WidgetState> _pressedOnly = <WidgetState>{WidgetState.pressed};

  static const Map<ShortcutActivator, Intent> _shortcuts = <ShortcutActivator, Intent>{
    SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
    SingleActivator(LogicalKeyboardKey.numpadEnter): ActivateIntent(),
    SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
  };

  /// Called exactly once per activation. Null disables the control: it is not focusable, reacts to
  /// nothing and draws the disabled state.
  VoidCallback? get onPressed;

  /// How long a change of state takes (the component's `motion.state-duration` token). Read in
  /// [didChangeDependencies].
  Duration get stateTransitionDuration;

  /// How long a ripple takes to grow (the component's `motion.feedback-duration` token). Read in
  /// [didChangeDependencies].
  Duration get rippleDuration;

  /// The easing of state changes and of the ripple (the component's `motion.state-easing` token).
  Curve get stateCurve;

  /// Interpolates the component's visuals (for [V] = `TanreiControlVisuals`:
  /// `TanreiControlVisuals.lerp`).
  V lerpVisuals(V a, V b, double t);

  final WidgetStatesController _states = WidgetStatesController();

  /// Runs 0 → 1 while the visuals move from [_begin] to the current state's.
  late final AnimationController _transition = AnimationController(vsync: this, value: 1);

  /// Runs 0 → 1 while a ripple grows from [_pressOrigin].
  late final AnimationController _rippleGrowth = AnimationController(vsync: this);

  /// Where the current (or last) press happened, in the container's coordinates; null = the
  /// center (keyboard and assistive technology).
  Offset? _pressOrigin;

  /// The pressed container color of the last press, kept while its ripple fades.
  Color? _rippleColor;

  /// Whether a pointer is still down, and the floor under the pressed state's visibility (BTN-8).
  bool _pointerDown = false;

  /// Whether the tap being recognized began with a pointer (and so is already shown as a press).
  bool _shownByPointer = false;
  Timer? _pressHold;
  Duration _pressHoldDuration = Duration.zero;
  TanreiPressedFeedback _feedback = TanreiPressedFeedback.values.first;
  bool _enabled = false;
  bool _disableAnimations = false;

  /// What `FocusableActionDetector` last reported for the focus highlight, and whether it is
  /// ignored ([suppressFocusHighlight]).
  bool _focusHighlight = false;
  bool _focusHighlightSuppressed = false;

  /// The state being drawn.
  late TanreiInteractionState _state;

  /// What the last build drew, and where the running transition started.
  V? _drawn;
  V? _begin;

  /// The key of the control's container, which a press is located against: give it to the
  /// container (`TanreiControlContainer`) so a ripple grows from the point of contact.
  final GlobalKey pressContainerKey = GlobalKey();

  late final Map<Type, Action<Intent>> _actions = <Type, Action<Intent>>{
    if (activatesAsButton) ...<Type, Action<Intent>>{
      ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) => _activate()),
      ButtonActivateIntent: CallbackAction<ButtonActivateIntent>(onInvoke: (_) => _activate()),
    },
    TanreiToggleIntent: CallbackAction<TanreiToggleIntent>(onInvoke: (_) => _activate()),
  };

  /// Whether the control answers the app's `ActivateIntent` and `ButtonActivateIntent` (a button:
  /// Enter and Space everywhere, BTN-1). A selection control returns false and names its own keys
  /// in [activationShortcuts] (`tanreiToggleShortcuts`), so that Enter reaching the app's shortcuts
  /// does not switch it where the platform does not (CHK-1).
  @protected
  bool get activatesAsButton => true;

  /// The keys that activate the focused control, bound on the control itself so that it works
  /// without an app-level `Shortcuts`. A button: Enter and Space.
  @protected
  Map<ShortcutActivator, Intent> get activationShortcuts => _shortcuts;

  /// Whether the control reacts to input.
  bool get isEnabled => onPressed != null;

  /// Whether a tap on the control presses and activates it (every button). False for a control
  /// whose presses its owner recognizes and shows with [beginPress] and [endPress] (a slider's
  /// handle, moved by a drag along the whole slider): [buildPressable] then recognizes no tap.
  @protected
  bool get pressedByTaps => true;

  /// Whether the pointer over the control's own area hovers it (every button). False for a control
  /// whose owner decides which of its parts is hovered and says so with [setHovered] (a slider's
  /// handle: the one a press would move).
  @protected
  bool get hoveredByPointer => true;

  /// Shows the hovered state, or ends it, for a control that is not [hoveredByPointer].
  @protected
  void setHovered(bool hovered) {
    _states.update(WidgetState.hovered, hovered && isEnabled);
  }

  /// Shows the focused state, or ends it, for an element whose keyboard focus is elsewhere: a
  /// search's suggestion that is active while focus stays in the input (SRC-17), a search bar
  /// focused through its input however the input was focused (SRC-18). The focus indicator follows
  /// it ([isKeyboardFocused]).
  @protected
  void setFocused(bool focused) {
    _states.update(WidgetState.focused, focused && (isEnabled || focusableWhileDisabled));
  }

  /// A press that the owner recognized (see [pressedByTaps]) began at [origin] in the container's
  /// coordinates (null: the center): shown now and held for at least the press-hold, as a tap's
  /// (BTN-8), until [endPress].
  @protected
  void beginPress(Offset? origin) {
    if (!isEnabled) {
      return;
    }
    _pointerDown = true;
    _beginPress(origin);
  }

  /// The press that [beginPress] showed ended: it goes now if it has been visible for the
  /// press-hold duration, and when that has elapsed otherwise.
  @protected
  void endPress() => _releasePress();

  /// Ends the press now, without waiting for the press-hold: for a press that turned into
  /// something else — a drag that started on a bottom sheet's drag handle and moves the sheet
  /// (BSH-13), which must not leave the handle pressed.
  @protected
  void cancelPress() {
    _pointerDown = false;
    _shownByPointer = false;
    _endPress();
  }

  /// Ignores the focus highlight while [suppressed]: the control draws no focused state and no
  /// focus indicator although it has focus. For focus that a pointer moved onto an item (a menu's,
  /// MNU-8: the item under the pointer is drawn hovered, and the arrow keys continue from it). A
  /// component clears it when focus arrives from the keyboard.
  @protected
  void suppressFocusHighlight(bool suppressed) {
    if (suppressed == _focusHighlightSuppressed) {
      return;
    }
    _focusHighlightSuppressed = suppressed;
    _states.update(WidgetState.focused, _focusHighlight && !suppressed);
  }

  /// Whether the control keeps taking keyboard focus while disabled. False for a control on its
  /// own (a disabled button leaves the focus order); true for an item of a composite that the arrow
  /// keys still reach when it is disabled (a list's items, LST-2; a menu's, MNU-7): it is focusable
  /// and shows the focus indicator, but never activates, hovers or presses.
  @protected
  bool get focusableWhileDisabled => false;

  /// The one interaction state of the control (disabled, or pressed > focused > hovered).
  TanreiInteractionState get interactionState => _state;

  /// Whether the control is pressed.
  bool get isPressed => _state == TanreiInteractionState.pressed;

  /// Whether the control has keyboard focus: the focus indicator shows.
  bool get isKeyboardFocused =>
      (isEnabled || focusableWhileDisabled) && _states.value.contains(WidgetState.focused);

  /// How the design system answers a press (`behavior.pressedFeedback`), in the current theme.
  TanreiPressedFeedback get pressedFeedback =>
      TanreiTheme.of(context).system.behavior.pressedFeedback;

  /// The state the control would draw without the press: the state underneath a press.
  TanreiInteractionState get stateBeneathPress =>
      isPressed ? tanreiInteractionStateOf(_states.value.difference(_pressedOnly)) : _state;

  /// The state whose tokens the control draws: under `none` a press changes nothing, so the state
  /// underneath it; otherwise [interactionState].
  TanreiInteractionState get drawnState =>
      pressedFeedback == TanreiPressedFeedback.none ? stateBeneathPress : _state;

  /// The state whose container COLOR the control draws. A ripple paints the pressed container
  /// color itself and a dim draws no state layer, so under both it is the state underneath the
  /// press; otherwise [drawnState].
  TanreiInteractionState get containerState => switch (pressedFeedback) {
    TanreiPressedFeedback.overlay || TanreiPressedFeedback.none => drawnState,
    TanreiPressedFeedback.ripple || TanreiPressedFeedback.dim => stateBeneathPress,
  };

  @override
  void initState() {
    super.initState();
    _enabled = isEnabled;
    _states
      ..update(WidgetState.disabled, !_enabled)
      ..addListener(_handleStatesChanged);
    _state = tanreiInteractionStateOf(_states.value);
    _transition.addListener(_rebuild);
    _rippleGrowth.addListener(_rebuild);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // A control whose enabled state comes from an ancestor (a radio button's group) learns it here.
    _syncEnabled();
    _disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final TanreiSystem system = TanreiTheme.of(context).system;
    _transition.duration = stateTransitionDuration;
    // BTN-9: a ripple grows over the component's feedback duration, with its state easing, and
    // fades over the state duration.
    _rippleGrowth.duration = rippleDuration;
    _pressHoldDuration = tanreiDuration(system.motion.duration.pressHold);
    _feedback = system.behavior.pressedFeedback;
  }

  @override
  void didUpdateWidget(S oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncEnabled();
  }

  void _syncEnabled() {
    if (isEnabled != _enabled) {
      _enabled = isEnabled;
      _states.update(WidgetState.disabled, !_enabled);
      if (!_enabled) {
        _pointerDown = false;
        _endPress();
      }
    }
  }

  @override
  void dispose() {
    _pressHold?.cancel();
    _rippleGrowth.dispose();
    _transition.dispose();
    _states.dispose();
    super.dispose();
  }

  void _rebuild() => setState(() {});

  void _handleStatesChanged() {
    final TanreiInteractionState next = tanreiInteractionStateOf(_states.value);
    if (next != _state) {
      _state = next;
      _begin = _drawn;
      // Pressed applies immediately; every other change eases with the component's motion tokens.
      if (next == TanreiInteractionState.pressed || _disableAnimations || _begin == null) {
        _transition.value = _transition.upperBound;
      } else {
        _transition.forward(from: _transition.lowerBound);
      }
    }
    // The focus indicator follows WidgetState.focused even when the drawn state does not change.
    _rebuild();
  }

  /// Keyboard and assistive-technology activation: a press that is over at once, from the center.
  void _activate() {
    if (!isEnabled) {
      return;
    }
    _beginPress(null);
    _releasePress();
    onPressed?.call();
  }

  /// Shows the pressed state now (BTN-8: without delay) and starts the floor under its visibility.
  void _beginPress(Offset? origin) {
    _pressOrigin = origin;
    _pressHold?.cancel();
    _pressHold = Timer(_pressHoldDuration, _handlePressHoldElapsed);
    if (_feedback == TanreiPressedFeedback.ripple) {
      if (_disableAnimations) {
        _rippleGrowth.value = _rippleGrowth.upperBound;
      } else {
        unawaited(_rippleGrowth.forward(from: _rippleGrowth.lowerBound));
      }
    }
    _states.update(WidgetState.pressed, true);
  }

  /// The press ended: the pressed state goes now if it has been visible for the press-hold
  /// duration, and when that has elapsed otherwise.
  void _releasePress() {
    _pointerDown = false;
    if (!(_pressHold?.isActive ?? false)) {
      _endPress();
    }
  }

  void _handlePressHoldElapsed() {
    if (!_pointerDown) {
      _endPress();
    }
  }

  void _endPress() {
    _pressHold?.cancel();
    _pressHold = null;
    _states.update(WidgetState.pressed, false);
  }

  /// A pointer tap was already shown by [_handleTapDown] and only emits. A tap that arrives without
  /// a pointer (the semantic tap action of assistive technology) is a press from the center.
  void _handleTap() {
    if (_shownByPointer) {
      _shownByPointer = false;
      onPressed?.call();
    } else {
      _activate();
    }
  }

  void _handleTapCancel() {
    _shownByPointer = false;
    _releasePress();
  }

  void _handleTapDown(TapDownDetails details) {
    _pointerDown = true;
    _shownByPointer = true;
    final RenderObject? container = pressContainerKey.currentContext?.findRenderObject();
    _beginPress(container is RenderBox ? container.globalToLocal(details.globalPosition) : null);
  }

  /// The visuals to draw this frame for the current state's [target]: [target] itself, or — while
  /// a state change runs — the interpolation from what was drawn when it began, eased by
  /// [stateCurve]. Call once per build.
  @protected
  V animateVisuals(V target) {
    final V? begin = _begin;
    final V visuals = begin == null || _transition.isCompleted
        ? target
        : lerpVisuals(begin, target, stateCurve.transform(_transition.value));
    _drawn = visuals;
    return visuals;
  }

  /// The ripple to draw this frame, under `pressedFeedback` = ripple (null otherwise): the pressed
  /// container color ([pressedContainer], read only while pressed) growing from the point of
  /// contact while pressed, then fading into [container] — the container being drawn — while the
  /// control eases out of the press. Call once per build, after [animateVisuals].
  @protected
  TanreiRipple? rippleFor({
    required ValueGetter<Color> pressedContainer,
    required Color container,
  }) {
    if (pressedFeedback != TanreiPressedFeedback.ripple) {
      _rippleColor = null;
      return null;
    }
    if (isPressed) {
      _rippleColor = pressedContainer();
    } else if (_transition.isCompleted) {
      _rippleColor = null;
    }
    final Color? color = _rippleColor;
    if (color == null) {
      return null;
    }
    return TanreiRipple(
      origin: _pressOrigin,
      progress: stateCurve.transform(_rippleGrowth.value),
      color: isPressed
          ? color
          : Color.lerp(color, container, stateCurve.transform(_transition.value))!,
    );
  }

  /// The input side of the recipe around [child]: a `FocusableActionDetector` (focus, hover,
  /// Enter / Space, the pointer cursor) over a `GestureDetector` (taps, with the press-hold).
  /// Place it inside the component's `Semantics` and `TanreiTapTarget`.
  @protected
  Widget buildPressable({FocusNode? focusNode, bool autofocus = false, required Widget child}) {
    final bool enabled = isEnabled;
    return FocusableActionDetector(
      // A disabled item of a composite stays focusable (focusableWhileDisabled); its actions and
      // taps do nothing, since activation checks isEnabled.
      enabled: enabled || focusableWhileDisabled,
      focusNode: focusNode,
      autofocus: autofocus,
      mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      shortcuts: activationShortcuts,
      actions: _actions,
      onShowHoverHighlight: (bool value) {
        if (hoveredByPointer) {
          _states.update(WidgetState.hovered, value);
        }
      },
      // True only for keyboard focus (FocusManager.highlightMode == traditional).
      onShowFocusHighlight: (bool value) {
        _focusHighlight = value;
        _states.update(WidgetState.focused, value && !_focusHighlightSuppressed);
      },
      child: pressedByTaps
          ? GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: enabled ? _handleTap : null,
              onTapDown: enabled ? _handleTapDown : null,
              onTapUp: enabled ? (_) => _releasePress() : null,
              onTapCancel: enabled ? _handleTapCancel : null,
              child: child,
            )
          : child,
    );
  }
}

/// Activates a selection control (checkbox, radio button, switch) from the keyboard: the intent of
/// [tanreiToggleShortcuts]. It is not `ActivateIntent`, which the app's shortcuts send for Enter on
/// every platform but the web.
class TanreiToggleIntent extends Intent {
  /// Creates the intent.
  const TanreiToggleIntent();
}

/// The keys that switch a focused selection control (CHK-1, RAD-1, SWT-1): Space, and the select
/// and game-pad A keys of a remote everywhere; Enter only where the platform activates any focused
/// control with it — Android, not the web (where Enter submits the form) and not iOS or a desktop
/// (where Enter presses the default button). [platform] defaults to [defaultTargetPlatform];
/// [web] to [kIsWeb].
Map<ShortcutActivator, Intent> tanreiToggleShortcuts({
  TargetPlatform? platform,
  bool web = kIsWeb,
}) => !web && (platform ?? defaultTargetPlatform) == TargetPlatform.android
    ? _toggleWithEnter
    : _toggleWithoutEnter;

const Map<ShortcutActivator, Intent> _toggleWithoutEnter = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.space): TanreiToggleIntent(),
  SingleActivator(LogicalKeyboardKey.select): TanreiToggleIntent(),
  SingleActivator(LogicalKeyboardKey.gameButtonA): TanreiToggleIntent(),
};

const Map<ShortcutActivator, Intent> _toggleWithEnter = <ShortcutActivator, Intent>{
  ..._toggleWithoutEnter,
  SingleActivator(LogicalKeyboardKey.enter): TanreiToggleIntent(),
  SingleActivator(LogicalKeyboardKey.numpadEnter): TanreiToggleIntent(),
};
