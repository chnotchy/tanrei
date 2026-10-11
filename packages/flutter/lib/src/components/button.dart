import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/button_group_item.dart';
import '../primitives/control_content.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Lets people take an action or make a choice with one tap or click.
///
/// Implements `specs/button.spec.json`. A null [onPressed] disables the button (the Flutter idiom
/// for the spec's `disabled` prop).
///
/// Every design value comes from the [TanreiButtonTokens] of the active design system
/// (`TanreiTheme.of(context).system.button`). The button resolves which interaction state it is in
/// (disabled, or pressed > keyboard-focused > hovered) and draws container, label, outline,
/// elevation, opacity and shape from that state's tokens; it never computes how a state looks.
///
/// Two choices of kind come from `system.behavior`, never from the id of a system, and
/// the corners' easing is an amount of `system.shape`:
///
/// * `pressedFeedback` — how a press is answered (spec BTN-9). `overlay`: every pressed token at
///   once. `ripple`: the pressed container color grows from the point of contact (from the center
///   for keyboard activation), clipped to the container, over `motionFeedbackDuration` with
///   `motionStateEasing`; it fades over `motionStateDuration` once the press has ended and the
///   press-hold has passed, and appears whole where animations are disabled. `dim`: no state layer;
///   the pressed opacity dims the whole control. Under `ripple` and `dim` only the container color
///   stays with the state underneath the press — label, outline, elevation, opacity and shape are
///   the pressed tokens'. `none`: a press changes nothing; every part stays with the state
///   underneath.
/// * `focusStyle` — keyboard focus as a ring or as a glow (BTN-10).
/// * `shape.cornerSmoothing` — how the container's corners ease into its edges, 0 a quarter circle,
///   0.6 the iOS continuous corner, the focus indicator included (BTN-10, `TanreiCornerShape`).
///
/// Inside a connected `TanreiButtonGroup` the button draws the corners that face a neighbour and
/// its minimum width as the group sets them (BGR-2, BGR-3), through an internal channel that is not
/// part of its public surface (BTN-10, ICB-10).
///
/// A press shows without delay and stays visible for at least `motion.duration.pressHold`, however
/// short the tap or the key press was (BTN-8).
///
/// [variant] and [size] are open keys: `TanreiButtonVariant.filled`, `tonal`, `elevated`,
/// `outlined` and `text`, `TanreiButtonSize.small`, `medium` and `large` are the core values, and a
/// design system may add its own. A value the active system does not have renders as the default
/// (`filled`, `medium`) and is reported in debug builds through `debugTanreiReportUnknownValue`.
class TanreiButton extends StatefulWidget {
  /// Creates a button. Pass a null [onPressed] to disable it.
  const TanreiButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.icon,
    this.variant = TanreiButtonVariant.filled,
    this.size = TanreiButtonSize.medium,
    this.focusNode,
    this.autofocus = false,
    this.semanticLabel,
  });

  /// Called exactly once per activation (pointer, touch, Enter, Space or assistive technology).
  /// When null the button is disabled: it is not focusable and is exposed as disabled.
  final VoidCallback? onPressed;

  /// The label, usually a `Text`. It is the accessible name unless [semanticLabel] is given.
  final Widget child;

  /// Optional leading icon.
  final Widget? icon;

  /// Emphasis level. Use one filled button per view for the main action.
  final TanreiButtonVariant variant;

  /// Visual size: container height, padding, gap, outline width, label style and icon size. The hit
  /// area always meets the minimum target.
  final TanreiButtonSize size;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this button when nothing else is focused.
  final bool autofocus;

  /// Replaces the label as the accessible name.
  final String? semanticLabel;

  /// Whether the button reacts to input.
  bool get enabled => onPressed != null;

  @override
  State<TanreiButton> createState() => _TanreiButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'));
  }
}

class _TanreiButtonState extends State<TanreiButton>
    with
        TickerProviderStateMixin<TanreiButton>,
        TanreiPressableStateMixin<TanreiButton, TanreiControlVisuals> {
  TanreiButtonTokens get _tokens => TanreiTheme.of(context).system.button;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // BTN-9: a ripple grows over the component's feedback duration.
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
    final TanreiButtonTokens tokens = theme.system.button;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens.
    final TanreiButtonSizeTokens size = tokens.sizes[widget.size];
    final TanreiButtonVariantTokens variant = tokens.variants[widget.variant];

    // How a press is answered is a choice of the design system (BTN-9): the pressable resolves
    // which state's tokens are drawn, and which state's container color.
    final TanreiButtonVariantStateTokens drawn = variant.of(drawnState);
    final TanreiButtonStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).containerColor,
        labelColor: drawn.labelColor,
        outlineColor: drawn.outlineColor,
        elevation: drawn.containerElevation,
        // At rest (no state tokens) the shape is the resting token and nothing dims the control.
        opacity: state?.opacity,
        shape: state?.containerShape ?? tokens.containerShape,
      ),
    );
    // BTN-10: in a connected button group the group sets the corners that face a neighbour and the
    // minimum width (BGR-2, BGR-3), through an internal channel.
    final TanreiButtonGroupItemScope? group = TanreiButtonGroupItemScope.of(context, widget);
    final TanreiCornerShape shape = group == null
        ? TanreiCornerShape(smoothing: theme.system.shape.cornerSmoothing, radius: visuals.shape)
        : TanreiCornerShape.only(
            smoothing: theme.system.shape.cornerSmoothing,
            corners: TanreiCornerRadii.directional(
              start: group.start(visuals.shape),
              end: group.end(visuals.shape),
              textDirection: Directionality.of(context),
            ),
          );

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: size.outlineWidth,
      // The ripple: the pressed container color while pressed, fading into the container
      // underneath while the button eases out of the press.
      ripple: rippleFor(
        pressedContainer: () => theme.paint(variant.of(interactionState).containerColor),
        container: visuals.container,
      ),
      child: ConstrainedBox(
        // A minimum, not a fixed height: the container grows with large text (spec a11y note).
        constraints: BoxConstraints(
          minHeight: size.containerHeight,
          minWidth: group?.minWidth ?? 0,
        ),
        child: Padding(
          padding: EdgeInsetsDirectional.only(
            start: widget.icon == null
                ? size.containerPaddingInlineStart
                : size.containerPaddingInlineStartWithIcon,
            end: size.containerPaddingInlineEnd,
            top: size.containerPaddingBlock,
            bottom: size.containerPaddingBlock,
          ),
          child: Center(
            widthFactor: 1,
            heightFactor: 1,
            child: TanreiControlContent(
              icon: widget.icon,
              label: widget.child,
              gap: size.containerGap,
              iconSize: size.iconSize,
              labelTypescale: size.labelTypescale,
              color: visuals.label,
              excludeLabelSemantics: widget.semanticLabel != null,
            ),
          ),
        ),
      ),
    );

    return Semantics(
      // In a connected group the group's node for this item carries these (BGR-3).
      container: group == null,
      button: true,
      enabled: isEnabled,
      label: widget.semanticLabel,
      child: TanreiTapTarget(
        // In a connected group the group extends the hit area above and below the row (BGR-3).
        minSize: group == null ? null : 0,
        child: buildPressable(
          focusNode: widget.focusNode,
          autofocus: widget.autofocus,
          // The state's opacity dims the whole control, the focus indicator included.
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: shape.borderRadius,
              child: container,
            ),
          ),
        ),
      ),
    );
  }
}
