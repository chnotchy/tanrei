import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// The group of [TanreiRadioButton]s that choose one value of [T] (the spec's `name`: on Flutter a
/// group is an ancestor, in the idiom of Flutter's `RadioGroup`).
///
/// It holds the choice: [groupValue] is the value of the selected option (null: none yet), and
/// [onChanged] is called with an option's value when the user selects it — that option's `change`
/// (RAD-1). The options it replaced do not emit (RAD-3). The group draws nothing and has no tokens.
///
/// What the spec asks of the group (RAD-3…5, RAD-16):
///
/// * **Arrow keys.** While an option has keyboard focus, Down and Right move focus to the next
///   enabled option in the group and select it, Up and Left to the previous one, wrapping at the
///   ends; in a right-to-left layout Right and Left swap (RAD-4). Disabled options are skipped. The
///   order is the options' order in the widget tree.
/// * **One tab stop.** Only the selected option — or, while none is (or the selected one is
///   disabled), the first enabled one — is in the Tab order; Tab leaves the group (RAD-5).
/// * **Semantics.** A radio-group node (`SemanticsRole.radioGroup`) named by [semanticLabel], the
///   question the options answer, which the product gives.
///
/// Named `TanreiRadioGroup`, not `RadioGroup`: Flutter 3.32, the oldest this package supports,
/// has no `RadioGroup`, and a later Flutter's would clash with the name.
class TanreiRadioGroup<T> extends StatefulWidget {
  /// Groups the [TanreiRadioButton]s of type [T] below it.
  const TanreiRadioGroup({
    super.key,
    required this.groupValue,
    required this.onChanged,
    this.semanticLabel,
    required this.child,
  });

  /// The value of the selected option; null while none is selected.
  final T? groupValue;

  /// Called with the value of the option the user selected — never for the one already selected
  /// (RAD-2). The owner stores it as the new [groupValue].
  final ValueChanged<T> onChanged;

  /// The group's accessible name: the question its options answer.
  final String? semanticLabel;

  /// The subtree that holds the options (and anything else).
  final Widget child;

  @override
  State<TanreiRadioGroup<T>> createState() => _TanreiRadioGroupState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('groupValue', groupValue))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: null));
  }
}

/// Moves keyboard focus and the selection to a neighbouring option (RAD-4).
class _RadioMoveIntent extends Intent {
  const _RadioMoveIntent(this.key);

  final LogicalKeyboardKey key;
}

const Map<ShortcutActivator, Intent> _arrowKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.arrowDown): _RadioMoveIntent(LogicalKeyboardKey.arrowDown),
  SingleActivator(LogicalKeyboardKey.arrowRight): _RadioMoveIntent(LogicalKeyboardKey.arrowRight),
  SingleActivator(LogicalKeyboardKey.arrowUp): _RadioMoveIntent(LogicalKeyboardKey.arrowUp),
  SingleActivator(LogicalKeyboardKey.arrowLeft): _RadioMoveIntent(LogicalKeyboardKey.arrowLeft),
};

class _TanreiRadioGroupState<T> extends State<TanreiRadioGroup<T>> {
  final Set<_TanreiRadioButtonState<T>> _options = <_TanreiRadioButtonState<T>>{};
  bool _tabStopsScheduled = false;

  late final Map<Type, Action<Intent>> _actions = <Type, Action<Intent>>{
    _RadioMoveIntent: _RadioMoveAction<T>(this),
  };

  void _register(_TanreiRadioButtonState<T> option) {
    _options.add(option);
    _scheduleTabStops();
  }

  void _unregister(_TanreiRadioButtonState<T> option) {
    _options.remove(option);
    _scheduleTabStops();
  }

  void _select(T value) {
    if (value != widget.groupValue) {
      widget.onChanged(value);
    }
  }

  @override
  void didUpdateWidget(TanreiRadioGroup<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.groupValue != widget.groupValue) {
      _scheduleTabStops();
    }
  }

  /// The registered options in widget-tree order. Walks this group's subtree: call it outside a
  /// build (a key press, a post-frame callback).
  List<_TanreiRadioButtonState<T>> _ordered() {
    final List<_TanreiRadioButtonState<T>> found = <_TanreiRadioButtonState<T>>[];
    void visit(Element element) {
      if (element is StatefulElement) {
        final State<StatefulWidget> state = element.state;
        if (state is _TanreiRadioButtonState<T> && _options.contains(state)) {
          found.add(state);
        }
      }
      element.visitChildElements(visit);
    }

    context.visitChildElements(visit);
    return found;
  }

  /// RAD-5: after the frame (the order is read from the built tree), only the selected enabled
  /// option — or the first enabled one — is a Tab stop.
  void _scheduleTabStops() {
    if (_tabStopsScheduled) {
      return;
    }
    _tabStopsScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _tabStopsScheduled = false;
      if (mounted) {
        _updateTabStops();
      }
    });
  }

  void _updateTabStops() {
    final List<_TanreiRadioButtonState<T>> ordered = _ordered();
    final Iterable<_TanreiRadioButtonState<T>> enabled = ordered.where(
      (_TanreiRadioButtonState<T> option) => option.isEnabled,
    );
    final _TanreiRadioButtonState<T>? stop =
        enabled
            .where((_TanreiRadioButtonState<T> option) => option.widget.value == widget.groupValue)
            .firstOrNull ??
        enabled.firstOrNull;
    for (final _TanreiRadioButtonState<T> option in ordered) {
      option.focusNode.skipTraversal = !identical(option, stop);
    }
  }

  _TanreiRadioButtonState<T>? get _focusedOption => _options
      .where((_TanreiRadioButtonState<T> option) => option.focusNode.hasPrimaryFocus)
      .firstOrNull;

  /// RAD-4: focus and select the next or previous enabled option, wrapping.
  void _move(_RadioMoveIntent intent) {
    final _TanreiRadioButtonState<T>? current = _focusedOption;
    if (current == null) {
      return;
    }
    final List<_TanreiRadioButtonState<T>> enabled = _ordered()
        .where((_TanreiRadioButtonState<T> option) => option.isEnabled)
        .toList();
    final int index = enabled.indexOf(current);
    if (index < 0) {
      return;
    }
    final bool rtl = Directionality.maybeOf(current.context) == TextDirection.rtl;
    final bool forward = switch (intent.key) {
      LogicalKeyboardKey.arrowDown => true,
      LogicalKeyboardKey.arrowUp => false,
      LogicalKeyboardKey.arrowRight => !rtl,
      _ => rtl,
    };
    final _TanreiRadioButtonState<T> next = enabled[(index + (forward ? 1 : -1)) % enabled.length];
    next.focusNode.requestFocus();
    _select(next.widget.value);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    explicitChildNodes: true,
    role: SemanticsRole.radioGroup,
    label: widget.semanticLabel,
    child: Shortcuts(
      shortcuts: _arrowKeys,
      child: Actions(
        actions: _actions,
        child: _TanreiRadioGroupScope<T>(
          group: this,
          groupValue: widget.groupValue,
          child: widget.child,
        ),
      ),
    ),
  );
}

/// Handles the arrow keys while an option of the group has keyboard focus; otherwise the keys go on
/// (to scrolling, or to directional focus).
class _RadioMoveAction<T> extends Action<_RadioMoveIntent> {
  _RadioMoveAction(this.group);

  final _TanreiRadioGroupState<T> group;

  @override
  bool isEnabled(_RadioMoveIntent intent) => group._focusedOption != null;

  @override
  void invoke(_RadioMoveIntent intent) => group._move(intent);
}

class _TanreiRadioGroupScope<T> extends InheritedWidget {
  const _TanreiRadioGroupScope({
    required this.group,
    required this.groupValue,
    required super.child,
  });

  final _TanreiRadioGroupState<T> group;
  final T? groupValue;

  @override
  bool updateShouldNotify(_TanreiRadioGroupScope<T> oldWidget) =>
      group != oldWidget.group || groupValue != oldWidget.groupValue;
}

/// One option of a [TanreiRadioGroup]: exactly one option of a group is chosen.
///
/// Implements `specs/radio-button.spec.json` with the idiom of Flutter's `Radio` inside a
/// `RadioGroup`:
///
/// * [value] is the spec's `value`, and the option is selected (the spec's `selected`) while the
///   `groupValue` of the nearest [TanreiRadioGroup] of the same [T] equals it;
/// * the group's `onChanged` is the spec's `change`: activating an unselected option calls it once
///   with [value] (RAD-1); activating the selected one does nothing (RAD-2);
/// * [enabled] false is the spec's `disabled` (the inverse flag, as Flutter's `Radio` has it since
///   `RadioGroup`): not focusable, skipped by the arrow keys, its label ignored;
/// * [label] names the option — drawn at the inline end and the accessible name — and
///   [labelHidden] keeps it as the name without drawing it (RAD-17, RAD-18).
///
/// Every design value comes from the `TanreiRadioButtonTokens` of the active design system: the
/// condition (`unselected` or `selected`) and the interaction state select the tokens of the round
/// state layer (`container`), the ring, the dot and the label. Presses, keyboard focus, the target
/// and corner smoothing behave as `TanreiButton`'s (RAD-9, RAD-11…13 are BTN-5, BTN-8…10). Space
/// selects it everywhere, Enter only on Android (RAD-1).
///
/// Outside a [TanreiRadioGroup] of its type an option cannot be selected: it asserts in debug
/// builds and draws itself disabled.
class TanreiRadioButton<T> extends StatefulWidget {
  /// Creates an option of the enclosing [TanreiRadioGroup].
  const TanreiRadioButton({
    super.key,
    required this.value,
    this.enabled = true,
    this.label = '',
    this.labelHidden = false,
    this.focusNode,
    this.autofocus = false,
  });

  /// What this option stands for: the group's `onChanged` receives it.
  final T value;

  /// Whether the option reacts to input.
  final bool enabled;

  /// The text that names the option: drawn next to the ring and used as the accessible name. An
  /// empty one still renders and is reported in debug builds.
  final String label;

  /// Draws no visible label but keeps [label] as the accessible name.
  final bool labelHidden;

  /// An optional focus node to use instead of an internal one. The group sets its
  /// `skipTraversal` (RAD-5).
  final FocusNode? focusNode;

  /// Whether to focus this option when nothing else is focused.
  final bool autofocus;

  @override
  State<TanreiRadioButton<T>> createState() => _TanreiRadioButtonState<T>();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('value', value))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(StringProperty('label', label))
      ..add(FlagProperty('labelHidden', value: labelHidden, ifTrue: 'label hidden'));
  }
}

/// How an option looks in one condition and state: its tokens, evaluated in the current scheme.
@immutable
class _RadioVisuals {
  const _RadioVisuals({
    required this.container,
    required this.ring,
    required this.dot,
    required this.label,
    required this.opacity,
    required this.shape,
    required this.dotScale,
  });

  final Color container;
  final Color ring;
  final Color dot;
  final Color label;
  final double opacity;
  final double shape;

  /// How much of the dot is grown, 0–1.
  final double dotScale;

  static _RadioVisuals lerp(_RadioVisuals a, _RadioVisuals b, double t) => _RadioVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    ring: tanreiLerpColor(a.ring, b.ring, t),
    dot: tanreiLerpColor(a.dot, b.dot, t),
    label: tanreiLerpColor(a.label, b.label, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
    dotScale: lerpDouble(a.dotScale, b.dotScale, t)!,
  );
}

class _TanreiRadioButtonState<T> extends State<TanreiRadioButton<T>>
    with
        TickerProviderStateMixin<TanreiRadioButton<T>>,
        TanreiPressableStateMixin<TanreiRadioButton<T>, _RadioVisuals>,
        TanreiSelectionTransitionMixin<TanreiRadioButton<T>, _RadioVisuals> {
  _TanreiRadioGroupState<T>? _group;
  T? _groupValue;
  FocusNode? _internalFocusNode;

  /// The node the group makes a Tab stop or not (RAD-5).
  FocusNode get focusNode => widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  TanreiRadioButtonTokens get _tokens => TanreiTheme.of(context).system.radioButton;

  bool get _selected => _group != null && _groupValue == widget.value;

  @override
  VoidCallback? get onPressed => widget.enabled && _group != null ? _selectThis : null;

  // RAD-1 / RAD-2: select an unselected option; the selected one stays and emits nothing.
  void _selectThis() => _group?._select(widget.value);

  @override
  bool get activatesAsButton => false;

  @override
  Map<ShortcutActivator, Intent> get activationShortcuts => tanreiToggleShortcuts();

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // RAD-12: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _RadioVisuals lerpVisuals(_RadioVisuals a, _RadioVisuals b, double t) =>
      _RadioVisuals.lerp(a, b, t);

  @override
  Object get selectionCondition => _selected;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionSelectionDuration);

  @override
  Curve get selectionCurve => _tokens.motionSelectionEasing.toCurve();

  @override
  _RadioVisuals lerpSelection(_RadioVisuals a, _RadioVisuals b, double t) =>
      _RadioVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didChangeDependencies() {
    // The group first: the mixins read the selection and whether the option is enabled.
    final _TanreiRadioGroupScope<T>? scope = context
        .dependOnInheritedWidgetOfExactType<_TanreiRadioGroupScope<T>>();
    assert(
      scope != null,
      'A TanreiRadioButton<$T> needs a TanreiRadioGroup<$T> ancestor: the group holds the choice.',
    );
    if (scope?.group != _group) {
      _group?._unregister(this);
      _group = scope?.group;
      _group?._register(this);
    }
    _groupValue = scope?.groupValue;
    super.didChangeDependencies();
  }

  @override
  void didUpdateWidget(TanreiRadioButton<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    if (oldWidget.enabled != widget.enabled ||
        oldWidget.value != widget.value ||
        oldWidget.focusNode != widget.focusNode) {
      _group?._scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _group?._unregister(this);
    _internalFocusNode?.dispose();
    super.dispose();
  }

  /// RAD-18: an empty label is reported in debug builds — when first built without one, and when
  /// it loses the one it had.
  void _debugReportMissingName(TanreiRadioButton<T>? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.label);
      if (had && !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('radio-button', widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiRadioButtonTokens tokens = theme.system.radioButton;
    final bool selected = _selected;
    final TanreiRadioButtonConditionTokens parts =
        tokens.conditions[selected
            ? TanreiRadioButtonCondition.selected
            : TanreiRadioButtonCondition.unselected];
    final TanreiRadioButtonConditionStateTokens drawn = parts.of(drawnState);
    final TanreiRadioButtonStateTokens? state = tokens.stateTokens(drawnState);

    // RAD-7 / RAD-10 / RAD-12: the drawn state's tokens; RAD-15: a change of condition eases over
    // the selection motion.
    final _RadioVisuals visuals = animateVisuals(
      animateSelection(
        _RadioVisuals(
          container: theme.paint(parts.of(containerState).containerColor),
          ring: theme.paint(drawn.ringColor),
          dot: theme.paint(drawn.dotColor),
          label: theme.paint(drawn.labelColor),
          opacity: state?.opacity ?? 1,
          shape: state?.containerShape ?? tokens.containerShape,
          dotScale: selected ? 1 : 0,
        ),
      ),
    );
    final double smoothing = theme.system.shape.cornerSmoothing;
    final Size containerSize = Size.square(tokens.containerSize);

    final Widget control = SizedBox.fromSize(
      size: containerSize,
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          TanreiStateLayer(
            key: pressContainerKey,
            size: tokens.containerSize,
            shape: TanreiCornerShape(smoothing: smoothing, radius: visuals.shape),
            color: visuals.container,
            ripple: tanreiRippleInside(
              rippleFor(
                pressedContainer: () => theme.paint(parts.of(interactionState).containerColor),
                container: visuals.container,
              ),
              containerSize,
            ),
          ),
          // RAD-8: the focus ring follows the ring.
          TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: BorderRadius.circular(tokens.ringSize / 2),
            child: CustomPaint(
              size: Size.square(tokens.ringSize),
              painter: TanreiRadioButtonPainter(
                ring: visuals.ring,
                ringWidth: tokens.ringWidth,
                dot: visuals.dot,
                dotSize: tokens.dotSize,
                dotScale: visuals.dotScale,
              ),
            ),
          ),
        ],
      ),
    );

    return Semantics(
      container: true,
      enabled: isEnabled,
      // RAD-16: a radio, checked or not, in a mutually exclusive group.
      checked: selected,
      inMutuallyExclusiveGroup: true,
      label: widget.label,
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: focusNode,
          autofocus: widget.autofocus,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiSelectionControlLayout(
              control: control,
              controlHeight: tokens.containerSize,
              label: widget.label,
              showLabel: !widget.labelHidden && widget.label.isNotEmpty,
              gap: tokens.labelGap,
              typescale: tokens.labelTypescale,
              color: visuals.label,
            ),
          ),
        ),
      ),
    );
  }
}

/// Paints a radio button's ring and dot (RAD-14): a ring of the painted square's diameter stroked
/// at [ringWidth] inside it, and a dot of [dotSize] × [dotScale] centered in it (RAD-15). The
/// values are public so that tests can read what is drawn.
class TanreiRadioButtonPainter extends CustomPainter {
  /// Paints a ring and dot with the given values.
  const TanreiRadioButtonPainter({
    required this.ring,
    required this.ringWidth,
    required this.dot,
    required this.dotSize,
    required this.dotScale,
  });

  /// The ring's color (`ring.color` of the condition and state).
  final Color ring;

  /// The ring's stroke (`comp.radio-button.ring.width`), inside its outer diameter.
  final double ringWidth;

  /// The dot's color (`dot.color`).
  final Color dot;

  /// The dot's diameter (`comp.radio-button.dot.size`).
  final double dotSize;

  /// How much of the dot is grown, 0–1.
  final double dotScale;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset center = size.center(Offset.zero);
    final double radius = size.shortestSide / 2;
    final double width = ringWidth.clamp(0, radius).toDouble();
    if (ring.a > 0 && width > 0) {
      canvas.drawCircle(
        center,
        radius - width / 2,
        Paint()
          ..color = ring
          ..style = PaintingStyle.stroke
          ..strokeWidth = width,
      );
    }
    final double dotRadius = dotSize / 2 * dotScale.clamp(0, 1);
    if (dot.a > 0 && dotRadius > 0) {
      canvas.drawCircle(center, dotRadius, Paint()..color = dot);
    }
  }

  @override
  bool shouldRepaint(TanreiRadioButtonPainter oldDelegate) =>
      ring != oldDelegate.ring ||
      ringWidth != oldDelegate.ringWidth ||
      dot != oldDelegate.dot ||
      dotSize != oldDelegate.dotSize ||
      dotScale != oldDelegate.dotScale;
}
