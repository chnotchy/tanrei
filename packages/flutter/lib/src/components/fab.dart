import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Performs the single most important action of a screen with one icon on a raised container
/// that floats above the content.
///
/// Implements `specs/fab.spec.json` with the idiom of Flutter's `FloatingActionButton`:
///
/// * a null [onPressed] disables it (the spec's `disabled`); hiding a FAB whose action is
///   unavailable is usually better than disabling it;
/// * [semanticLabel] is the accessible name (the spec's `label`). It is required: an icon alone is
///   not a name. An empty one still renders and is reported in debug builds (FAB-14) through
///   `debugTanreiReportMissingName`;
/// * it does not position itself (FAB-13): put it in a scaffold's floating-action-button slot, or
///   in a `Stack` / `Align` at the inline-end bottom corner of the screen. It adds no `Hero`, no
///   scrim, and moves nothing.
///
/// Every design value comes from the `TanreiFabTokens` of the active design system
/// (`TanreiTheme.of(context).system.fab`). The button resolves which interaction state it is in
/// (disabled, or pressed > keyboard-focused > hovered) and draws container, icon, elevation and
/// opacity from that state's tokens (FAB-3, FAB-6); it never computes how a state looks. The
/// state layer a system mixes into the container is each variant's `stateLayerColor`:
/// the tokens already carry the mix, so the widget never reads it.
///
/// The container is a square of the size's `containerSize`, with the size's `containerShape`
/// corners, casting its variant's and state's elevation outside it (FAB-11, FAB-12). The icon is a
/// slot, drawn by `TanreiControlIcon` at the size's `iconSize` with the family and fill of an
/// unselected icon, `sys.icon.weight` and an optical size clamped to `sys.icon.optical-size`.
///
/// Presses, keyboard focus, the minimum target and corner smoothing behave exactly as
/// `TanreiButton`'s (FAB-1…10 are BTN-1…10), through the same primitives:
/// `behavior.pressedFeedback` (`overlay`, `ripple`, `dim`, `none`), `behavior.focusStyle` (ring or
/// glow), `shape.cornerSmoothing`, and `motion.duration.pressHold`.
///
/// [variant] and [size] are open keys: `TanreiFabVariant.filled`, `tonal` and `surface`,
/// `TanreiFabSize.small`, `medium` and `large` are the core values, and a design system may add
/// its own. A value the active system does not have renders as the default (`filled`, `medium`)
/// and is reported in debug builds (FAB-7).
class TanreiFloatingActionButton extends StatefulWidget {
  /// Creates a floating action button. Pass a null [onPressed] to disable it.
  const TanreiFloatingActionButton({
    super.key,
    required this.onPressed,
    required this.icon,
    required this.semanticLabel,
    this.variant = TanreiFabVariant.filled,
    this.size = TanreiFabSize.medium,
    this.focusNode,
    this.autofocus = false,
  });

  /// Called exactly once per activation (pointer, touch, Enter, Space or assistive technology).
  /// When null the button is disabled: it is not focusable and is exposed as disabled.
  final VoidCallback? onPressed;

  /// The icon: an `Icon`, or a glyph of the system's icon font drawn as text. It is decorative to
  /// assistive technology.
  final Widget icon;

  /// The accessible name. Required; an empty one is reported in debug builds.
  final String semanticLabel;

  /// Emphasis. Filled is the screen's main action at full strength; tonal is quieter; surface
  /// keeps the container neutral over colored content (a map, a photo).
  final TanreiFabVariant variant;

  /// Visual size: the square, its corners and the icon. The hit area always meets the minimum
  /// target.
  final TanreiFabSize size;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this button when nothing else is focused.
  final bool autofocus;

  /// Whether the button reacts to input.
  bool get enabled => onPressed != null;

  @override
  State<TanreiFloatingActionButton> createState() => _TanreiFloatingActionButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(StringProperty('semanticLabel', semanticLabel));
  }
}

/// A FAB has no outline part: nothing to draw, at no width (not design values).
const TanreiPaint _noOutline = TanreiPaint.none();
const double _noOutlineWidth = 0;

class _TanreiFloatingActionButtonState extends State<TanreiFloatingActionButton>
    with
        TickerProviderStateMixin<TanreiFloatingActionButton>,
        TanreiPressableStateMixin<TanreiFloatingActionButton, TanreiControlVisuals> {
  TanreiFabTokens get _tokens => TanreiTheme.of(context).system.fab;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  // FAB-12: colors and elevation change over the component's state motion.
  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // FAB-9: a ripple grows over the component's feedback duration.
  @override
  Duration get rippleDuration => tanreiDuration(_tokens.motionFeedbackDuration);

  @override
  Curve get stateCurve => _tokens.motionStateEasing.toCurve();

  @override
  TanreiControlVisuals lerpVisuals(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didUpdateWidget(TanreiFloatingActionButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// FAB-14: an empty label is reported in debug builds — when the button is first built without
  /// one, and when it loses the one it had; never on every build.
  void _debugReportMissingName(TanreiFloatingActionButton? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticLabel)) {
        debugTanreiReportMissingName('fab', widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiFabTokens tokens = theme.system.fab;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (FAB-7).
    final TanreiFabSizeTokens size = tokens.sizes[widget.size];
    final TanreiFabVariantTokens variant = tokens.variants[widget.variant];

    // How a press is answered is a choice of the design system (FAB-9): the pressable resolves
    // which state's tokens are drawn, and which state's container color.
    final TanreiFabVariantStateTokens drawn = variant.of(drawnState);
    final TanreiFabStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).containerColor,
        labelColor: drawn.iconColor,
        outlineColor: _noOutline,
        elevation: drawn.containerElevation,
        // At rest (no state tokens) nothing dims the control. A FAB does not change shape with its
        // state: the corners are the size's.
        opacity: state?.opacity,
        shape: size.containerShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: _noOutlineWidth,
      // The ripple: the pressed container color while pressed, fading into the container
      // underneath while the button eases out of the press.
      ripple: rippleFor(
        pressedContainer: () => theme.paint(variant.of(interactionState).containerColor),
        container: visuals.container,
      ),
      // FAB-11: a square of the size's token, whatever the text size: an icon is not text.
      child: SizedBox.square(
        dimension: size.containerSize,
        child: Center(
          child: TanreiControlIcon(
            icon: widget.icon,
            size: size.iconSize,
            selected: false,
            color: visuals.label,
          ),
        ),
      ),
    );

    return Semantics(
      container: true,
      button: true,
      enabled: isEnabled,
      label: widget.semanticLabel,
      child: TanreiTapTarget(
        child: buildPressable(
          focusNode: widget.focusNode,
          autofocus: widget.autofocus,
          // The state's opacity dims the whole control, the focus indicator included.
          child: Opacity(
            opacity: visuals.opacity,
            child: TanreiFocusRing(
              visible: isKeyboardFocused,
              borderRadius: BorderRadius.circular(shape.radius),
              child: container,
            ),
          ),
        ),
      ),
    );
  }
}
