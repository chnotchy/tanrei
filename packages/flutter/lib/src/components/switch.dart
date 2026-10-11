import 'dart:ui' show lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_icon.dart';
import '../primitives/corner_shape.dart';
import '../primitives/elevation.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/selection_control.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Turns a setting on or off with an immediate effect.
///
/// Implements `specs/switch.spec.json` with the idiom of Flutter's `Switch`:
///
/// * [value] is the spec's `selected`, and [onChanged] its `change`: called once per activation
///   with the new value, where the owner stores it; a null [onChanged] disables the switch (the
///   spec's `disabled`);
/// * [thumbIcon] is the spec's `selectedIcon` and `unselectedIcon` together, resolved per state as
///   `Switch.thumbIcon` is: with `WidgetState.selected` while on (plus `disabled`, `hovered`,
///   `focused` or `pressed`). It resolves to the glyph the handle shows, or null for none (SWT-12);
///   a glyph drawn as text takes the family and fill of the condition from the theme;
/// * [label] names the setting — drawn at the inline end of the track and the accessible name —
///   and [labelHidden] keeps it as the name without drawing it (SWT-15, SWT-16).
///
/// Every design value comes from the `TanreiSwitchTokens` of the active design system: the
/// condition (`unselected` or `selected`) and the interaction state select the tokens of the track,
/// its outline, the handle (color, size and elevation), the icon, the label and the round state
/// layer (`container`), which is centered on the handle and moves with it (SWT-10). The handle
/// travels, grows or shrinks and the colors change over the selection motion (a spring's
/// duration and easing, which may overshoot); where motion is reduced the new condition shows at
/// once (SWT-13). Right-to-left mirrors the handle's positions and travel (SWT-11).
///
/// Presses, keyboard focus, the target and corner smoothing behave as `TanreiButton`'s (SWT-5,
/// SWT-7…9 are BTN-5, BTN-8…10). Space switches it everywhere, Enter only on Android (SWT-1).
/// Dragging the handle is not part of the spec: a press anywhere on the switch or its label
/// switches it.
class TanreiSwitch extends StatefulWidget {
  /// Creates a switch. Pass a null [onChanged] to disable it.
  const TanreiSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.thumbIcon,
    this.label = '',
    this.labelHidden = false,
    this.focusNode,
    this.autofocus = false,
  });

  /// Whether the setting is on.
  final bool value;

  /// Called exactly once per activation with `!value`. When null the switch is disabled: it is not
  /// focusable, ignores its label and is exposed as disabled.
  final ValueChanged<bool>? onChanged;

  /// The glyph the handle shows in a set of states (with `WidgetState.selected` while on), or null
  /// for none. Decorative: on and off are announced from the state.
  final WidgetStateProperty<Widget?>? thumbIcon;

  /// The text that names the setting: drawn next to the track and used as the accessible name. An
  /// empty one still renders and is reported in debug builds.
  final String label;

  /// Draws no visible label but keeps [label] as the accessible name.
  final bool labelHidden;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this switch when nothing else is focused.
  final bool autofocus;

  /// Whether the switch reacts to input.
  bool get enabled => onChanged != null;

  @override
  State<TanreiSwitch> createState() => _TanreiSwitchState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('value', value: value, ifTrue: 'on', ifFalse: 'off'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(StringProperty('label', label))
      ..add(FlagProperty('labelHidden', value: labelHidden, ifTrue: 'label hidden'));
  }
}

/// How the switch looks in one condition and state: its tokens, evaluated in the current scheme.
@immutable
class _SwitchVisuals {
  const _SwitchVisuals({
    required this.container,
    required this.track,
    required this.outline,
    required this.handle,
    required this.handleSize,
    required this.handleElevation,
    required this.icon,
    required this.label,
    required this.opacity,
    required this.shape,
    required this.position,
  });

  final Color container;
  final Color track;
  final Color outline;
  final Color handle;
  final double handleSize;
  final TanreiResolvedElevation handleElevation;
  final Color icon;
  final Color label;
  final double opacity;
  final double shape;

  /// Where the handle is: 0 at the inline start (off), 1 at the inline end (on). A spring easing
  /// may take it a little past either end.
  final double position;

  static _SwitchVisuals lerp(_SwitchVisuals a, _SwitchVisuals b, double t) => _SwitchVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    track: tanreiLerpColor(a.track, b.track, t),
    outline: tanreiLerpColor(a.outline, b.outline, t),
    handle: tanreiLerpColor(a.handle, b.handle, t),
    handleSize: lerpDouble(a.handleSize, b.handleSize, t)!,
    handleElevation: TanreiResolvedElevation.lerp(a.handleElevation, b.handleElevation, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    label: tanreiLerpColor(a.label, b.label, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    shape: lerpDouble(a.shape, b.shape, t)!,
    position: lerpDouble(a.position, b.position, t)!,
  );
}

class _TanreiSwitchState extends State<TanreiSwitch>
    with
        TickerProviderStateMixin<TanreiSwitch>,
        TanreiPressableStateMixin<TanreiSwitch, _SwitchVisuals>,
        TanreiSelectionTransitionMixin<TanreiSwitch, _SwitchVisuals> {
  TanreiSwitchTokens get _tokens => TanreiTheme.of(context).system.switch_;

  @override
  VoidCallback? get onPressed => widget.onChanged == null ? null : _toggle;

  void _toggle() => widget.onChanged?.call(!widget.value);

  @override
  bool get activatesAsButton => false;

  @override
  Map<ShortcutActivator, Intent> get activationShortcuts => tanreiToggleShortcuts();

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // SWT-8: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  _SwitchVisuals lerpVisuals(_SwitchVisuals a, _SwitchVisuals b, double t) =>
      _SwitchVisuals.lerp(a, b, t);

  @override
  Object get selectionCondition => widget.value;

  @override
  Duration get selectionDuration => tanreiDuration(_tokens.motionSelectionDuration);

  @override
  Curve get selectionCurve => _tokens.motionSelectionEasing.toCurve();

  @override
  _SwitchVisuals lerpSelection(_SwitchVisuals a, _SwitchVisuals b, double t) =>
      _SwitchVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didUpdateWidget(TanreiSwitch oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// SWT-16: an empty label is reported in debug builds — when first built without one, and when
  /// it loses the one it had.
  void _debugReportMissingName(TanreiSwitch? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.label);
      if (had && !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName('switch', widget);
      }
      return true;
    }());
  }

  /// The states [TanreiSwitch.thumbIcon] is resolved in: the selection and the interaction state.
  Set<WidgetState> get _iconStates => <WidgetState>{
    if (widget.value) WidgetState.selected,
    ...switch (interactionState) {
      TanreiInteractionState.enabled => const <WidgetState>{},
      TanreiInteractionState.hovered => const <WidgetState>{WidgetState.hovered},
      TanreiInteractionState.focused => const <WidgetState>{WidgetState.focused},
      TanreiInteractionState.pressed => const <WidgetState>{WidgetState.pressed},
      TanreiInteractionState.disabled => const <WidgetState>{WidgetState.disabled},
    },
  };

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiSwitchTokens tokens = theme.system.switch_;
    final TanreiSwitchConditionTokens parts =
        tokens.conditions[widget.value
            ? TanreiSwitchCondition.selected
            : TanreiSwitchCondition.unselected];
    final TanreiSwitchConditionStateTokens drawn = parts.of(drawnState);
    final TanreiSwitchStateTokens? state = tokens.stateTokens(drawnState);
    final Widget? icon = widget.thumbIcon?.resolve(_iconStates);

    // SWT-3 / SWT-6 / SWT-8: the drawn state's tokens; SWT-12: a handle that shows an icon is at
    // least handle.size-with-icon; SWT-13: a change of condition eases over the selection motion.
    final _SwitchVisuals visuals = animateVisuals(
      animateSelection(
        _SwitchVisuals(
          container: theme.paint(parts.of(containerState).containerColor),
          track: theme.paint(drawn.trackColor),
          outline: theme.paint(drawn.outlineColor),
          handle: theme.paint(drawn.handleColor),
          handleSize: icon == null
              ? drawn.handleSize
              : (drawn.handleSize > tokens.handleSizeWithIcon
                    ? drawn.handleSize
                    : tokens.handleSizeWithIcon),
          handleElevation: TanreiResolvedElevation.resolve(drawn.handleElevation, theme.colors),
          icon: theme.paint(drawn.iconColor),
          label: theme.paint(drawn.labelColor),
          opacity: state?.opacity ?? 1,
          shape: state?.containerShape ?? tokens.containerShape,
          position: widget.value ? 1 : 0,
        ),
      ),
    );
    final double smoothing = theme.system.shape.cornerSmoothing;
    final Size track = Size(tokens.trackWidth, tokens.trackHeight);
    final Size containerSize = Size.square(tokens.containerSize);

    // SWT-10 / SWT-11: the handle's center is on the midline, half the track height from the
    // inline-start end when off and from the inline-end end when on; right-to-left mirrors it.
    final double inset = track.height / 2;
    final double along = inset + visuals.position * (track.width - 2 * inset);
    final bool rtl = Directionality.of(context) == TextDirection.rtl;
    final Offset center = Offset(rtl ? track.width - along : along, track.height / 2);

    final Widget control = TanreiFocusRing(
      // SWT-4: the focus ring follows the track.
      visible: isKeyboardFocused,
      borderRadius: BorderRadius.circular(tokens.trackShape),
      child: CustomPaint(
        painter: TanreiSwitchTrackPainter(
          shape: TanreiCornerShape(smoothing: smoothing, radius: tokens.trackShape),
          fill: visuals.track,
          outline: visuals.outline,
          outlineWidth: tokens.outlineWidth,
        ),
        child: SizedBox.fromSize(
          size: track,
          // The round layer and the handle may extend beyond the track without affecting layout.
          child: Stack(
            clipBehavior: Clip.none,
            children: <Widget>[
              Positioned(
                left: center.dx - containerSize.width / 2,
                top: center.dy - containerSize.height / 2,
                child: TanreiStateLayer(
                  key: pressContainerKey,
                  size: tokens.containerSize,
                  shape: TanreiCornerShape(smoothing: smoothing, radius: visuals.shape),
                  color: visuals.container,
                  ripple: tanreiRippleInside(
                    rippleFor(
                      pressedContainer: () =>
                          theme.paint(parts.of(interactionState).containerColor),
                      container: visuals.container,
                    ),
                    containerSize,
                  ),
                ),
              ),
              Positioned(
                left: center.dx - visuals.handleSize / 2,
                top: center.dy - visuals.handleSize / 2,
                child: CustomPaint(
                  size: Size.square(visuals.handleSize),
                  painter: TanreiSwitchHandlePainter(
                    color: visuals.handle,
                    elevation: visuals.handleElevation,
                    smoothing: smoothing,
                  ),
                  child: icon == null
                      ? null
                      : SizedBox.square(
                          dimension: visuals.handleSize,
                          // The glyph box keeps icon.size whatever the handle's size.
                          child: OverflowBox(
                            minWidth: 0,
                            minHeight: 0,
                            maxWidth: tokens.iconSize,
                            maxHeight: tokens.iconSize,
                            child: TanreiControlIcon(
                              icon: icon,
                              size: tokens.iconSize,
                              selected: widget.value,
                              color: visuals.icon,
                            ),
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    return Semantics(
      container: true,
      enabled: isEnabled,
      // SWT-14: a switch that is on or off, never a checkbox.
      toggled: widget.value,
      label: widget.label,
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
          autofocus: widget.autofocus,
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiSelectionControlLayout(
              control: control,
              controlHeight: tokens.trackHeight,
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

/// Paints a switch's track (SWT-10): the fill inside the outline, the outline inside the track's
/// edge. The values are public so that tests can read what is drawn.
class TanreiSwitchTrackPainter extends CustomPainter {
  /// Paints a track with the given values.
  const TanreiSwitchTrackPainter({
    required this.shape,
    required this.fill,
    required this.outline,
    required this.outlineWidth,
  });

  /// The track's corners (`comp.switch.track.shape`, eased by the system's corner smoothing).
  final TanreiCornerShape shape;

  /// The fill (`track.color` of the condition and state), inside the outline.
  final Color fill;

  /// The outline (`outline.color`), inside the track's edge.
  final Color outline;

  /// The outline's width (`comp.switch.outline.width`).
  final double outlineWidth;

  @override
  void paint(Canvas canvas, Size size) => tanreiPaintOutlinedShape(
    canvas,
    Offset.zero & size,
    shape: shape,
    fill: fill,
    outline: outline,
    outlineWidth: outlineWidth,
  );

  @override
  bool shouldRepaint(TanreiSwitchTrackPainter oldDelegate) =>
      shape != oldDelegate.shape ||
      fill != oldDelegate.fill ||
      outline != oldDelegate.outline ||
      outlineWidth != oldDelegate.outlineWidth;
}

/// Paints a switch's handle: a circle of the painted square in [color], raised by [elevation] (its
/// ring and shadows, as every container's). The values are public so that tests can read what is
/// drawn.
class TanreiSwitchHandlePainter extends CustomPainter {
  /// Paints a handle with the given values.
  const TanreiSwitchHandlePainter({
    required this.color,
    required this.elevation,
    required this.smoothing,
  });

  /// The handle's color (`handle.color` of the condition and state).
  final Color color;

  /// The handle's elevation (`handle.elevation`), resolved.
  final TanreiResolvedElevation elevation;

  /// The system's corner smoothing (a circle is unchanged by any amount).
  final double smoothing;

  @override
  void paint(Canvas canvas, Size size) {
    TanreiContainerDecoration(
      shape: TanreiCornerShape(smoothing: smoothing, radius: size.shortestSide / 2),
      color: color.a > 0 ? color : null,
      border: elevation.ring,
      boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
    ).createBoxPainter().paint(canvas, Offset.zero, ImageConfiguration(size: size));
  }

  @override
  bool shouldRepaint(TanreiSwitchHandlePainter oldDelegate) =>
      color != oldDelegate.color ||
      elevation.ring != oldDelegate.elevation.ring ||
      !listEquals(elevation.shadows, oldDelegate.elevation.shadows) ||
      smoothing != oldDelegate.smoothing;
}
