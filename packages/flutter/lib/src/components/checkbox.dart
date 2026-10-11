import 'dart:ui' show SemanticsValidationResult, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/check_mark.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Turns one independent choice on or off, shows a parent choice that is only partly on, and marks
/// a required choice left unmade.
///
/// Implements `specs/checkbox.spec.json` with the idiom of Flutter's `Checkbox`:
///
/// * [value] is the spec's `checked`; with [tristate] true a null [value] is the spec's
///   `indeterminate` (drawn and announced as mixed, CHK-4 / CHK-14);
/// * [onChanged] is the spec's `change`, and a null [onChanged] disables it (the spec's
///   `disabled`). The checkbox keeps no value of its own: [onChanged] is where the owner stores the
///   new one. Unlike Flutter's `Checkbox`, which cycles null → false, activation from null calls
///   `onChanged(true)` (CHK-2): an indeterminate "select all" selects all;
/// * [isError] is the spec's `error`: the error form of the condition, exposed as invalid;
/// * [label] names the choice — drawn at the inline end and used as the accessible name — and
///   [labelHidden] keeps it as the name without drawing it (CHK-15, CHK-16). A press on the label
///   switches the checkbox.
///
/// Every design value comes from the `TanreiCheckboxTokens` of the active design system
/// (`TanreiTheme.of(context).system.checkbox`). The props select one of the six conditions of the
/// token axis `condition` (CHK-4); the checkbox resolves which interaction state it is in and draws
/// the round state layer (`container`), the box, its outline, the mark and the label from that
/// condition's tokens in that state. It never computes how a state looks.
///
/// Presses, keyboard focus, the minimum target and corner smoothing behave as `TanreiButton`'s
/// (CHK-7, CHK-9…11 are BTN-5, BTN-8…10), through the same primitives. Space switches it
/// everywhere, Enter only on Android (CHK-1; `tanreiToggleShortcuts`).
class TanreiCheckbox extends StatefulWidget {
  /// Creates a checkbox. Pass a null [onChanged] to disable it.
  const TanreiCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    this.tristate = false,
    this.isError = false,
    this.label = '',
    this.labelHidden = false,
    this.focusNode,
    this.autofocus = false,
  }) : assert(tristate || value != null, 'A null value needs tristate: true.');

  /// Whether the choice is on. Null — only with [tristate] — is indeterminate: partly on.
  final bool? value;

  /// Called exactly once per activation (pointer, touch, Space, a press on the label, assistive
  /// technology; Enter on Android) with the new value: `false` when [value] is true, `true`
  /// otherwise — an indeterminate checkbox becomes checked. When null the checkbox is disabled: it
  /// is not focusable, ignores its label and is exposed as disabled.
  final ValueChanged<bool>? onChanged;

  /// Whether [value] may be null (indeterminate).
  final bool tristate;

  /// Whether the choice is invalid (a required choice left unmade): draws the error form of the
  /// condition and is exposed as invalid. The message belongs to the surrounding form.
  final bool isError;

  /// The text that names the choice: drawn next to the box and used as the accessible name. An
  /// empty one still renders and is reported in debug builds.
  final String label;

  /// Draws no visible label but keeps [label] as the accessible name.
  final bool labelHidden;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this checkbox when nothing else is focused.
  final bool autofocus;

  /// Whether the checkbox reacts to input.
  bool get enabled => onChanged != null;

  /// Whether the checkbox shows the indeterminate condition.
  bool get isIndeterminate => tristate && value == null;

  /// The condition of the token axis the props select (CHK-4): indeterminate over checked, and the
  /// error form of either while [isError].
  TanreiCheckboxCondition get condition => switch ((isIndeterminate, value ?? false, isError)) {
    (true, _, false) => TanreiCheckboxCondition.indeterminate,
    (true, _, true) => TanreiCheckboxCondition.errorIndeterminate,
    (false, true, false) => TanreiCheckboxCondition.selected,
    (false, true, true) => TanreiCheckboxCondition.errorSelected,
    (false, false, false) => TanreiCheckboxCondition.unselected,
    (false, false, true) => TanreiCheckboxCondition.errorUnselected,
  };

  @override
  State<TanreiCheckbox> createState() => _TanreiCheckboxState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<bool>('value', value))
      ..add(FlagProperty('tristate', value: tristate, ifTrue: 'tristate'))
      ..add(FlagProperty('isError', value: isError, ifTrue: 'error'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(StringProperty('label', label))
      ..add(FlagProperty('labelHidden', value: labelHidden, ifTrue: 'label hidden'));
  }
}

/// The mark the props select (CHK-12): a dash while indeterminate, else a check while checked,
/// else none — as full (1) or absent (0) strokes.
({double check, double dash}) _markOf(TanreiCheckbox checkbox) => checkbox.isIndeterminate
    ? (check: 0, dash: 1)
    : (checkbox.value ?? false)
    ? (check: 1, dash: 0)
    : (check: 0, dash: 0);

/// How the checkbox looks in one condition and state: its tokens, evaluated in the current scheme.
@immutable
class _CheckboxVisuals {
  const _CheckboxVisuals({
    required this.container,
    required this.box,
    required this.mark,
    required this.outline,
    required this.label,
    required this.opacity,
    required this.shape,
    required this.check,
    required this.dash,
  });

  final Color container;
  final Color box;
  final Color mark;
  final Color outline;
  final Color label;
  final double opacity;

  /// The corner radius of the state layer.
  final double shape;

  /// How much of the check is drawn (0–1) and how much of the dash.
  final double check;
  final double dash;

  static _CheckboxVisuals lerp(_CheckboxVisuals a, _CheckboxVisuals b, double t) =>
      _CheckboxVisuals(
        container: tanreiLerpColor(a.container, b.container, t),
        box: tanreiLerpColor(a.box, b.box, t),
        mark: tanreiLerpColor(a.mark, b.mark, t),
        outline: tanreiLerpColor(a.outline, b.outline, t),
        label: tanreiLerpColor(a.label, b.label, t),
        opacity: lerpDouble(a.opacity, b.opacity, t)!,
        shape: lerpDouble(a.shape, b.shape, t)!,
        check: lerpDouble(a.check, b.check, t)!,
        dash: lerpDouble(a.dash, b.dash, t)!,
      );
}

class _TanreiCheckboxState extends State<TanreiCheckbox>
    with
        TickerProviderStateMixin<TanreiCheckbox>,
        TanreiPressableStateMixin<TanreiCheckbox, _CheckboxVisuals>,
        TanreiSelectionTransitionMixin<TanreiCheckbox, _CheckboxVisuals> {
  TanreiCheckboxTokens get _tokens => TanreiTheme.of(context).system.checkbox;

  @override
  VoidCallback? get onPressed => widget.onChanged == null ? null : _toggle;

  // CHK-2: activation from indeterminate (null) or unchecked checks it.
  void _toggle() => widget.onChanged?.call(widget.value != true);

  @override
  bool get activatesAsButton => false;

  @override
  Map<ShortcutActivator, Intent> get activationShortcuts => tanreiToggleShortcuts();

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // CHK-10: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _CheckboxVisuals lerpVisuals(_CheckboxVisuals a, _CheckboxVisuals b, double t) =>
      _CheckboxVisuals.lerp(a, b, t);

  @override
  Object get selectionCondition => widget.condition.name;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionSelectionDuration);

  @override
  Curve get selectionCurve => _tokens.motionSelectionEasing.toCurve();

  @override
  _CheckboxVisuals lerpSelection(_CheckboxVisuals a, _CheckboxVisuals b, double t) =>
      _CheckboxVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didUpdateWidget(TanreiCheckbox oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// CHK-16: an empty label is reported in debug builds — when the checkbox is first built without
  /// one, and when it loses the one it had; never on every build.
  void _debugReportMissingName(TanreiCheckbox? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.label);
      if (had && !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('checkbox', widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiCheckboxTokens tokens = theme.system.checkbox;
    final TanreiCheckboxCondition condition = widget.condition;
    final TanreiCheckboxConditionTokens parts = tokens.conditions[condition];
    final TanreiCheckboxConditionStateTokens drawn = parts.of(drawnState);
    final TanreiCheckboxStateTokens? state = tokens.stateTokens(drawnState);
    final ({double check, double dash}) mark = _markOf(widget);

    // CHK-5 / CHK-8 / CHK-10: the drawn state's tokens, the container color of the state the
    // pressed feedback names; CHK-13: a change of condition eases over the selection motion, a
    // change of state over the state motion.
    final _CheckboxVisuals visuals = animateVisuals(
      animateSelection(
        _CheckboxVisuals(
          container: theme.paint(parts.of(containerState).containerColor),
          box: theme.paint(drawn.boxColor),
          mark: theme.paint(drawn.markColor),
          outline: theme.paint(drawn.outlineColor),
          label: theme.paint(drawn.labelColor),
          // At rest (no state tokens) nothing dims the control and the shape is the resting token.
          opacity: state?.opacity ?? 1,
          shape: state?.containerShape ?? tokens.containerShape,
          check: mark.check,
          dash: mark.dash,
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
          // CHK-6: the focus ring follows the box, not the round layer.
          TanreiFocusRing(
            visible: isKeyboardFocused,
            borderRadius: BorderRadius.circular(tokens.boxShape),
            child: CustomPaint(
              size: Size.square(tokens.boxSize),
              painter: TanreiCheckboxPainter(
                shape: TanreiCornerShape(smoothing: smoothing, radius: tokens.boxShape),
                fill: visuals.box,
                outline: visuals.outline,
                outlineWidth: tokens.outlineWidth,
                mark: visuals.mark,
                markWidth: tokens.markWidth,
                check: visuals.check,
                dash: visuals.dash,
              ),
            ),
          ),
        ],
      ),
    );

    return Semantics(
      container: true,
      enabled: isEnabled,
      // CHK-14: checked, not checked or mixed; invalid while in error.
      checked: widget.value ?? false,
      mixed: widget.tristate ? widget.isIndeterminate : null,
      validationResult: widget.isError
          ? SemanticsValidationResult.invalid
          : SemanticsValidationResult.none,
      label: widget.label,
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
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

// The dash's geometry, in fractions of the box side, as the spec's anatomy (`mark`) gives it: its
// ends, stroked with square caps like the check (`tanreiCheckPath`). A glyph's construction, not a
// design value; its stroke is `comp.checkbox.mark.width`.
const double _dashInset = 0.1375;
const double _half = 0.5;

/// Paints a checkbox's box (CHK-12): the fill inside the outline, the outline inside the box's
/// edge, and the mark stroked over them — the check drawn along its path from its start, the dash
/// grown from its center, each as far as its progress (CHK-13). `TanreiCheckbox` gives it the
/// resolved values of its condition and state; they are public so that tests can read what is
/// drawn.
class TanreiCheckboxPainter extends CustomPainter {
  /// Paints a box with the given values.
  const TanreiCheckboxPainter({
    required this.shape,
    required this.fill,
    required this.outline,
    required this.outlineWidth,
    required this.mark,
    required this.markWidth,
    required this.check,
    required this.dash,
  });

  /// The box's corners (`comp.checkbox.box.shape`, eased by the system's corner smoothing).
  final TanreiCornerShape shape;

  /// The fill (`box.color` of the condition and state), inside the outline.
  final Color fill;

  /// The outline (`outline.color`), inside the box's edge.
  final Color outline;

  /// The outline's width (`comp.checkbox.outline.width`).
  final double outlineWidth;

  /// The mark's color (`mark.color`).
  final Color mark;

  /// The mark's stroke width (`comp.checkbox.mark.width`).
  final double markWidth;

  /// How much of the check is drawn, 0–1.
  final double check;

  /// How much of the dash is drawn, 0–1.
  final double dash;

  @override
  void paint(Canvas canvas, Size size) {
    final Rect box = Offset.zero & size;
    tanreiPaintOutlinedShape(
      canvas,
      box,
      shape: shape,
      fill: fill,
      outline: outline,
      outlineWidth: outlineWidth,
    );
    if (mark.a == 0 || markWidth <= 0) {
      return;
    }
    tanreiPaintCheck(canvas, size, color: mark, width: markWidth, progress: check);
    final double dashDrawn = dash.clamp(0, 1).toDouble();
    if (dashDrawn > 0) {
      final Paint stroke = tanreiCheckStroke(mark, markWidth);
      final Offset center = Offset(size.width * _half, size.height * _half);
      final double reach = (_half - _dashInset) * size.width * dashDrawn;
      canvas.drawLine(center - Offset(reach, 0), center + Offset(reach, 0), stroke);
    }
  }

  @override
  bool shouldRepaint(TanreiCheckboxPainter oldDelegate) =>
      shape != oldDelegate.shape ||
      fill != oldDelegate.fill ||
      outline != oldDelegate.outline ||
      outlineWidth != oldDelegate.outlineWidth ||
      mark != oldDelegate.mark ||
      markWidth != oldDelegate.markWidth ||
      check != oldDelegate.check ||
      dash != oldDelegate.dash;
}
