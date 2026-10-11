import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/button_group_item.dart';
import '../primitives/control_icon.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Performs an action, or switches something on and off, with a single icon and no visible label.
///
/// Implements `specs/icon-button.spec.json` with the idiom of Flutter's `IconButton`:
///
/// * a null [onPressed] disables it (the spec's `disabled`);
/// * a non-null [isSelected] makes it a **toggle** (the spec's `toggle` and `selected`): the button
///   does not keep the selection itself — [onPressed] is where the owner flips it (the spec's
///   `change` event), and the button draws and announces the value it is given;
/// * [semanticLabel] is the accessible name (the spec's `label`). It is required: an icon alone is
///   not a name. An empty one still renders and is reported in debug builds (ICB-14) through
///   `debugTanreiReportMissingName`.
///
/// Every design value comes from the `TanreiIconButtonTokens` of the active design system
/// (`TanreiTheme.of(context).system.iconButton`). The button resolves which interaction state it is
/// in (disabled, or pressed > keyboard-focused > hovered) and which **look** it has — its
/// variant's own parts, or for a toggle the `unselected` or `selected` parts (ICB-12) — and draws
/// container, icon, outline, opacity and shape from that state's tokens; it never computes how a
/// state looks.
///
/// The icon is a slot, drawn by `TanreiControlIcon` at the icon size of [size], with the family
/// and fill of its selection (selected only for a toggle that is on), `sys.icon.weight` and an
/// optical size clamped to `sys.icon.optical-size` (ICB-13). A glyph drawn as text takes the
/// family from the theme; an `Icon`'s `IconData` names its own family, which a product picks with
/// `system.icon.family(selected:)`.
///
/// Presses, keyboard focus, the minimum target and corner smoothing behave exactly as
/// `TanreiButton`'s (ICB-1…10 are BTN-1…10), through the same primitives:
/// `behavior.pressedFeedback` (`overlay`, `ripple`, `dim`, `none`), `behavior.focusStyle` (ring or
/// glow), `shape.cornerSmoothing`, and `motion.duration.pressHold`.
///
/// Inside a connected `TanreiButtonGroup` the icon button draws the corners that face a neighbour and
/// its minimum width as the group sets them (BGR-2, BGR-3), through an internal channel that is not
/// part of its public surface (BTN-10, ICB-10).
///
/// [variant] and [size] are open keys: `TanreiIconButtonVariant.standard`, `filled`,
/// `tonal` and `outlined`, `TanreiIconButtonSize.small`, `medium` and `large` are the core values,
/// and a design system may add its own. A value the active system does not have renders as the
/// default (`standard`, `medium`) and is reported in debug builds (ICB-7).
class TanreiIconButton extends StatefulWidget {
  /// Creates an icon button. Pass a null [onPressed] to disable it, and a non-null [isSelected] to
  /// make it a toggle.
  const TanreiIconButton({
    super.key,
    required this.onPressed,
    required this.icon,
    required this.semanticLabel,
    this.isSelected,
    this.variant = TanreiIconButtonVariant.standard,
    this.size = TanreiIconButtonSize.medium,
    this.focusNode,
    this.autofocus = false,
  });

  /// Called exactly once per activation (pointer, touch, Enter, Space or assistive technology).
  /// For a toggle this is the change: flip [isSelected] here. When null the button is disabled: it
  /// is not focusable and is exposed as disabled.
  final VoidCallback? onPressed;

  /// The icon: an `Icon`, or a glyph of the system's icon font drawn as text. It is decorative to
  /// assistive technology.
  final Widget icon;

  /// The accessible name. Required; an empty one is reported in debug builds.
  final String semanticLabel;

  /// Null: an action button. Non-null: a toggle that is on (`true`) or off (`false`), announced as
  /// selected or not.
  final bool? isSelected;

  /// Emphasis level. Standard is the quiet default for toolbars; filled marks the one most important
  /// icon action in a view.
  final TanreiIconButtonVariant variant;

  /// Visual size: the square container, the icon size and the outline width. The hit area always
  /// meets the minimum target.
  final TanreiIconButtonSize size;

  /// An optional focus node to use instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus this button when nothing else is focused.
  final bool autofocus;

  /// Whether the button reacts to input.
  bool get enabled => onPressed != null;

  /// Whether the button is a toggle (the spec's `toggle`).
  bool get isToggle => isSelected != null;

  @override
  State<TanreiIconButton> createState() => _TanreiIconButtonState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(StringProperty('size', size.name, quoted: false))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled'))
      ..add(DiagnosticsProperty<bool>('isSelected', isSelected, defaultValue: null))
      ..add(StringProperty('semanticLabel', semanticLabel));
  }
}

/// Which parts of a variant a button draws (ICB-12): a plain button its variant's own, a toggle the
/// `unselected` or `selected` parts. A condition, not an interaction state.
enum _Look { plain, unselected, selected }

/// The parts of one look in one state.
typedef _Parts = ({TanreiPaint container, TanreiPaint icon, TanreiPaint outline});

_Parts _partsOf(TanreiIconButtonVariantStateTokens tokens, _Look look) => switch (look) {
  _Look.plain => (
    container: tokens.containerColor,
    icon: tokens.iconColor,
    outline: tokens.outlineColor,
  ),
  _Look.unselected => (
    container: tokens.unselectedContainerColor,
    icon: tokens.unselectedIconColor,
    outline: tokens.unselectedOutlineColor,
  ),
  _Look.selected => (
    container: tokens.selectedContainerColor,
    icon: tokens.selectedIconColor,
    outline: tokens.selectedOutlineColor,
  ),
};

/// An icon button draws no elevation: its tokens have none (not a design value — nothing to draw).
const List<TanreiShadowLayer> _noElevation = <TanreiShadowLayer>[];

class _TanreiIconButtonState extends State<TanreiIconButton>
    with
        TickerProviderStateMixin<TanreiIconButton>,
        TanreiPressableStateMixin<TanreiIconButton, TanreiControlVisuals> {
  TanreiIconButtonTokens get _tokens => TanreiTheme.of(context).system.iconButton;

  @override
  VoidCallback? get onPressed => widget.onPressed;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // ICB-9: a ripple grows over the component's feedback duration.
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
  void didUpdateWidget(TanreiIconButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// ICB-14: an empty label is reported in debug builds — when the button is first built without
  /// one, and when it loses the one it had; never on every build.
  void _debugReportMissingName(TanreiIconButton? oldWidget) {
    assert(() {
      final bool had = oldWidget == null || tanreiIsAccessibleName(oldWidget.semanticLabel);
      if (had && !tanreiIsAccessibleName(widget.semanticLabel)) {
        debugTanreiReportMissingName('icon-button', widget);
      }
      return true;
    }());
  }

  _Look get _look => switch (widget.isSelected) {
    null => _Look.plain,
    false => _Look.unselected,
    true => _Look.selected,
  };

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiIconButtonTokens tokens = theme.system.iconButton;
    // Total lookups: a size or variant the system does not have resolves to the default's tokens
    // and is reported in debug builds (ICB-7).
    final TanreiIconButtonSizeTokens size = tokens.sizes[widget.size];
    final TanreiIconButtonVariantTokens variant = tokens.variants[widget.variant];
    final _Look look = _look;

    // How a press is answered is a choice of the design system (ICB-9): the pressable resolves
    // which state's tokens are drawn, and which state's container color.
    final _Parts drawn = _partsOf(variant.of(drawnState), look);
    final TanreiIconButtonStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: _partsOf(variant.of(containerState), look).container,
        labelColor: drawn.icon,
        outlineColor: drawn.outline,
        elevation: _noElevation,
        // At rest (no state tokens) the shape is the resting token and nothing dims the control.
        opacity: state?.opacity,
        shape: state?.containerShape ?? tokens.containerShape,
      ),
    );
    // ICB-10: in a connected button group the group sets the corners that face a neighbour and the
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
    final Widget icon = TanreiControlIcon(
      icon: widget.icon,
      size: size.iconSize,
      // ICB-13: selected only for a toggle that is on.
      selected: look == _Look.selected,
      color: visuals.label,
    );

    final Widget container = TanreiControlContainer(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: size.outlineWidth,
      // The ripple: the pressed container color of the look while pressed, fading into the
      // container underneath while the button eases out of the press.
      ripple: rippleFor(
        pressedContainer: () => theme.paint(_partsOf(variant.of(interactionState), look).container),
        container: visuals.container,
      ),
      // A square of the size's token, whatever the text size: an icon is not text. In a connected
      // group it widens around its centred icon to the group's minimum width, and stretches to the
      // tallest item (BGR-1, BGR-3).
      child: group == null
          ? SizedBox.square(
              dimension: size.containerSize,
              child: Center(child: icon),
            )
          : ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: group.minWidth > size.containerSize ? group.minWidth : size.containerSize,
                minHeight: size.containerSize,
              ),
              child: Center(widthFactor: 1, heightFactor: 1, child: icon),
            ),
    );

    return Semantics(
      // In a connected group the group's node for this item carries these (BGR-3).
      container: group == null,
      button: true,
      enabled: isEnabled,
      // ICB-11: a toggle exposes its value as selected / not selected (the selected trait on Apple
      // platforms); a plain button has no such state at all.
      selected: widget.isSelected,
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
