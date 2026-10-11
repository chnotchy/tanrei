import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/control_visuals.dart';
import '../primitives/corner_shape.dart';
import '../primitives/focus_ring.dart';
import '../primitives/pressable.dart';
import '../primitives/tap_target.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Sets a group of related content apart from its background, and can be one action that opens
/// what it shows.
///
/// Implements `specs/card.spec.json` with Flutter idioms:
///
/// * a non-null [onTap] makes the card **interactive** (the spec's `interactive`, and its `click`
///   event): the whole card is one pressable element with the button role. With a null [onTap] it
///   is a plain container: not focusable, no hover, focus or press answer, and [enabled] is ignored
///   (CRD-11);
/// * [enabled] `false` disables an interactive card (the spec's `disabled`) while keeping its
///   interactive look, as `ListTile` does — a null [onTap] already means "not an action";
/// * [semanticLabel] is the spec's `label`: the name of an interactive card (normally its
///   heading's text), or — for a card that is not interactive — the name of the group it then
///   forms;
/// * [inset] insets [child] by `comp.card.container.padding` on every side (CRD-12); `false` lets
///   content such as a photo reach the edges.
///
/// Every design value comes from the `TanreiCardTokens` of the active design system
/// (`TanreiTheme.of(context).system.card`). The card clips [child] to its corner shape, draws the
/// outline of the outlined variant above it, grows with it (it has no height of its own), and hands
/// it the content color of its variant and state as the default text and icon color, with plain text
/// in `sys.typescale.body` (CRD-13).
///
/// An interactive card presses exactly as `TanreiButton` does (CRD-1…10 are BTN-1…10), through the
/// same primitives: `behavior.pressedFeedback`, `behavior.focusStyle`, `shape.cornerSmoothing`,
/// `motion.duration.pressHold`, and the minimum target.
///
/// **Never put an interactive element in an interactive card** (CRD-15): its content is merged
/// into the card's one accessible element, so assistive technology cannot reach a nested button,
/// link or field, and a press on one would also activate the card. Flutter cannot tell reliably
/// whether a subtree is interactive, so the card does not check; a card that needs its own buttons
/// stays non-interactive.
///
/// [variant] is an open key: `TanreiCardVariant.elevated`, `filled` and `outlined` are
/// the core values, and a design system may add its own. A value the active system does not have
/// renders as the default (`outlined`) and is reported in debug builds (CRD-7).
class TanreiCard extends StatefulWidget {
  /// Creates a card. Pass [onTap] to make it one action.
  const TanreiCard({
    super.key,
    this.onTap,
    this.enabled = true,
    this.variant = TanreiCardVariant.outlined,
    this.inset = true,
    this.semanticLabel = '',
    this.focusNode,
    this.autofocus = false,
    required this.child,
  });

  /// Null: a card that is not an action. Non-null: an interactive card, called exactly once per
  /// activation (pointer, touch, Enter, Space or assistive technology) while [enabled].
  final VoidCallback? onTap;

  /// Whether an interactive card reacts to input. A disabled interactive card is not focusable, is
  /// exposed as disabled, and draws the disabled tokens of its variant. Ignored while [onTap] is
  /// null.
  final bool enabled;

  /// How the card separates from its background: by depth (elevated), by tone (filled) or by an
  /// edge (outlined). Pick by the background, not by importance.
  final TanreiCardVariant variant;

  /// Whether [child] is inset by the card's padding. Set it to false for content that reaches the
  /// card's edges; that content pads its own text (it may read `comp.card.container.padding`).
  final bool inset;

  /// The accessible name. For an interactive card, normally the text of its heading; when empty
  /// the whole content becomes the name, which debug builds report (CRD-14). For a card that is
  /// not interactive, a non-empty label makes it a named group.
  final String semanticLabel;

  /// An optional focus node for an interactive card, instead of an internal one.
  final FocusNode? focusNode;

  /// Whether to focus an interactive card when nothing else is focused.
  final bool autofocus;

  /// The content: any layout of media, text and — only when the card is not interactive — actions.
  final Widget child;

  /// Whether the card is one action (the spec's `interactive`).
  bool get interactive => onTap != null;

  @override
  State<TanreiCard> createState() => _TanreiCardState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('variant', variant.name, quoted: false))
      ..add(FlagProperty('interactive', value: interactive, ifTrue: 'interactive'))
      ..add(FlagProperty('enabled', value: enabled, ifFalse: 'disabled', defaultValue: true))
      ..add(FlagProperty('inset', value: inset, ifFalse: 'flush', defaultValue: true))
      ..add(StringProperty('semanticLabel', semanticLabel));
  }
}

class _TanreiCardState extends State<TanreiCard>
    with
        TickerProviderStateMixin<TanreiCard>,
        TanreiPressableStateMixin<TanreiCard, TanreiControlVisuals> {
  TanreiCardTokens get _tokens => TanreiTheme.of(context).system.card;

  // A card that is not an action never reacts (CRD-11): to the pressable it is disabled, but it is
  // drawn from its resting tokens, not the disabled ones.
  @override
  VoidCallback? get onPressed => widget.enabled ? widget.onTap : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_tokens.motionStateDuration);

  // CRD-9: a ripple grows over the component's feedback duration.
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
  void didUpdateWidget(TanreiCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
  }

  /// CRD-14: an interactive card without a label is reported in debug builds — when it is first
  /// built so, and when it becomes so again; never on every build.
  void _debugReportMissingName(TanreiCard? oldWidget) {
    assert(() {
      bool named(TanreiCard card) =>
          !card.interactive || tanreiIsAccessibleName(card.semanticLabel);
      if ((oldWidget == null || named(oldWidget)) && !named(widget)) {
        debugTanreiReportMissingName('card', widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiCardTokens tokens = theme.system.card;
    // A total lookup: a variant the system does not have resolves to the default's tokens and is
    // reported in debug builds (CRD-7).
    final TanreiCardVariantTokens variant = tokens.variants[widget.variant];

    if (!widget.interactive) {
      // CRD-11: the resting tokens of the variant, whatever `enabled` says; no state, no motion.
      final TanreiCardVariantStateTokens rest = variant.enabled;
      final Widget surface = _CardSurface(
        visuals: TanreiControlVisuals.resolve(
          theme,
          containerColor: rest.containerColor,
          labelColor: rest.contentColor,
          outlineColor: rest.outlineColor,
          elevation: rest.containerElevation,
          shape: tokens.containerShape,
        ),
        shape: TanreiCornerShape(
          smoothing: theme.system.shape.cornerSmoothing,
          radius: tokens.containerShape,
        ),
        outlineWidth: tokens.outlineWidth,
        padding: widget.inset ? tokens.containerPadding : null,
        child: widget.child,
      );
      // CRD-14: no role of its own and the content's semantics untouched — unless it is named,
      // then it is a group of that name around them.
      return tanreiIsAccessibleName(widget.semanticLabel)
          ? Semantics(
              container: true,
              explicitChildNodes: true,
              label: widget.semanticLabel,
              child: surface,
            )
          : surface;
    }

    // How a press is answered is a choice of the design system (CRD-9): the pressable resolves
    // which state's tokens are drawn, and which state's container color.
    final TanreiCardVariantStateTokens drawn = variant.of(drawnState);
    final TanreiCardStateTokens? state = tokens.stateTokens(drawnState);
    final TanreiControlVisuals visuals = animateVisuals(
      TanreiControlVisuals.resolve(
        theme,
        containerColor: variant.of(containerState).containerColor,
        labelColor: drawn.contentColor,
        outlineColor: drawn.outlineColor,
        elevation: drawn.containerElevation,
        // At rest (no state tokens) nothing dims the card.
        opacity: state?.opacity,
        shape: tokens.containerShape,
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: visuals.shape,
    );
    final bool named = tanreiIsAccessibleName(widget.semanticLabel);

    final Widget surface = _CardSurface(
      key: pressContainerKey,
      visuals: visuals,
      shape: shape,
      outlineWidth: tokens.outlineWidth,
      padding: widget.inset ? tokens.containerPadding : null,
      // The ripple: the pressed container color of the variant while pressed, fading into the
      // container underneath while the card eases out of the press.
      ripple: rippleFor(
        pressedContainer: () => theme.paint(variant.of(interactionState).containerColor),
        container: visuals.container,
      ),
      // CRD-14: named by the label, the content is presentational; without one, the content is
      // read as the name (merged below).
      child: named ? ExcludeSemantics(child: widget.child) : widget.child,
    );

    // CRD-14: exactly one element — the button, with everything under it merged into it.
    return MergeSemantics(
      child: Semantics(
        container: true,
        button: true,
        enabled: isEnabled,
        label: named ? widget.semanticLabel : null,
        child: TanreiTapTarget(
          child: buildPressable(
            focusNode: widget.focusNode,
            autofocus: widget.autofocus,
            // The state's opacity dims the whole card, its content and the focus indicator
            // included: a card cannot recolor content it does not know (CRD-6).
            child: Opacity(
              opacity: visuals.opacity,
              child: TanreiFocusRing(
                visible: isKeyboardFocused,
                borderRadius: BorderRadius.circular(shape.radius),
                child: surface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The card's container around its content, in paint order: elevation (shadows, and the level's
/// ring outside the shape), fill and ripple, the content — inset, clipped to the shape and given
/// the content color — and the outline above it (CRD-12, CRD-13).
class _CardSurface extends StatelessWidget {
  const _CardSurface({
    super.key,
    required this.visuals,
    required this.shape,
    required this.outlineWidth,
    required this.padding,
    this.ripple,
    required this.child,
  });

  final TanreiControlVisuals visuals;
  final TanreiCornerShape shape;
  final double outlineWidth;

  /// The inset on every side; null = none (the content reaches the edges).
  final double? padding;
  final TanreiRipple? ripple;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final Color content = visuals.label;
    final TanreiThemeData theme = TanreiTheme.of(context);
    // CRD-13: the content color as the default text and icon color, and plain text in the body
    // style (Flutter's `Text` has no style of its own to fall back on).
    Widget result = IconTheme.merge(
      data: IconThemeData(color: content),
      child: DefaultTextStyle.merge(
        style: theme.textStyle(theme.system.typescale.body, color: content),
        child: child,
      ),
    );
    if (padding case final double padding) {
      // By logical start and end (CRD-17).
      result = Padding(padding: EdgeInsetsDirectional.all(padding), child: result);
    }
    result = ClipPath(clipper: _ShapeClipper(shape), child: result);
    if (visuals.hasOutline(outlineWidth)) {
      result = DecoratedBox(
        position: DecorationPosition.foreground,
        decoration: TanreiContainerDecoration(
          shape: shape,
          border: Border.all(color: visuals.outline, width: outlineWidth),
        ),
        child: result,
      );
    }
    return DecoratedBox(
      decoration: TanreiContainerDecoration(
        shape: shape,
        color: visuals.container.a > 0 ? visuals.container : null,
        border: visuals.elevation.ring,
        boxShadow: visuals.elevation.shadows.isEmpty ? null : visuals.elevation.shadows,
        ripple: ripple,
      ),
      child: result,
    );
  }
}

/// Clips to the container's shape, corner smoothing included.
class _ShapeClipper extends CustomClipper<Path> {
  const _ShapeClipper(this.shape);

  final TanreiCornerShape shape;

  @override
  Path getClip(Size size) => shape.path(Offset.zero & size);

  @override
  bool shouldReclip(_ShapeClipper oldClipper) => oldClipper.shape != shape;
}
