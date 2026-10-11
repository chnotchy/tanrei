import 'dart:ui' show lerpDouble;

import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/theme_data.dart';
import 'container_decoration.dart';
import 'corner_shape.dart';
import 'elevation.dart';

/// How a control with a container looks in one interaction state: the state's tokens, evaluated
/// in the current scheme. State transitions interpolate these ([lerp]).
///
/// A component reads its per-state tokens (container, label and outline color, elevation, opacity,
/// shape) and hands them to [TanreiControlVisuals.resolve]; it never computes how a state looks
/// (spec BTN-3 / BTN-6). Every component whose tokens have that shape — a button, a chip, an icon
/// button, a FAB — draws with the same class, [TanreiControlContainer] and
/// [TanreiControlContent].
@immutable
class TanreiControlVisuals {
  /// Creates the visuals of one state.
  const TanreiControlVisuals({
    required this.container,
    required this.label,
    required this.outline,
    required this.elevation,
    required this.opacity,
    required this.shape,
  });

  /// Evaluates one state's tokens in the current scheme of [theme]. [opacity] and [shape] are the
  /// state's own values; at rest a component passes its resting shape and no [opacity] (the
  /// control is then not dimmed).
  factory TanreiControlVisuals.resolve(
    TanreiThemeData theme, {
    required TanreiPaint containerColor,
    required TanreiPaint labelColor,
    required TanreiPaint outlineColor,
    required List<TanreiShadowLayer> elevation,
    double? opacity,
    required double shape,
  }) => TanreiControlVisuals(
    container: theme.paint(containerColor),
    label: theme.paint(labelColor),
    outline: theme.paint(outlineColor),
    elevation: TanreiResolvedElevation.resolve(elevation, theme.colors),
    opacity: opacity ?? _opaque,
    shape: shape,
  );

  /// A resting control is not dimmed.
  static const double _opaque = 1;

  /// The container fill (zero alpha: none).
  final Color container;

  /// The label and icon color.
  final Color label;

  /// The outline color (zero alpha: none).
  final Color outline;

  /// The elevation, as an outside ring and shadows.
  final TanreiResolvedElevation elevation;

  /// The opacity of the whole control, focus indicator included.
  final double opacity;

  /// The corner radius of the container.
  final double shape;

  /// The visuals [t] of the way from [a] to [b].
  static TanreiControlVisuals lerp(TanreiControlVisuals a, TanreiControlVisuals b, double t) =>
      TanreiControlVisuals(
        container: Color.lerp(a.container, b.container, t)!,
        label: Color.lerp(a.label, b.label, t)!,
        outline: Color.lerp(a.outline, b.outline, t)!,
        elevation: TanreiResolvedElevation.lerp(a.elevation, b.elevation, t),
        opacity: lerpDouble(a.opacity, b.opacity, t)!,
        shape: lerpDouble(a.shape, b.shape, t)!,
      );

  /// Whether the outline paints anything (a `none` paint resolves to zero alpha).
  bool hasOutline(double outlineWidth) => outline.a > 0 && outlineWidth > 0;

  /// The container: fill, elevation shadows, and one border. The outline is an inside border;
  /// without an outline the border slot carries the elevation ring (outside the box).
  TanreiContainerDecoration decoration(
    TanreiCornerShape shape, {
    required double outlineWidth,
    TanreiRipple? ripple,
  }) => TanreiContainerDecoration(
    shape: shape,
    color: container.a > 0 ? container : null,
    border: hasOutline(outlineWidth)
        ? Border.all(color: outline, width: outlineWidth)
        : elevation.ring,
    boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
    ripple: ripple,
  );
}

/// The container of a control: a `DecoratedBox` with [TanreiControlVisuals.decoration] in [shape],
/// and — when the outline takes the decoration's single border slot — the elevation ring painted
/// over it.
///
/// Give it the key a press is located against (`TanreiPressableStateMixin.pressContainerKey`), so
/// a ripple grows from the point of contact.
class TanreiControlContainer extends StatelessWidget {
  /// Draws [visuals] around [child].
  const TanreiControlContainer({
    super.key,
    required this.visuals,
    required this.shape,
    required this.outlineWidth,
    this.ripple,
    required this.child,
  });

  /// The state's visuals.
  final TanreiControlVisuals visuals;

  /// The container's outline, eased by the system's corner smoothing.
  final TanreiCornerShape shape;

  /// The outline width (a token of the component's size).
  final double outlineWidth;

  /// The ripple of a press, if the design system answers presses with one.
  final TanreiRipple? ripple;

  /// The content.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final Border? ring = visuals.elevation.ring;
    return DecoratedBox(
      decoration: visuals.decoration(shape, outlineWidth: outlineWidth, ripple: ripple),
      child: ring == null || !visuals.hasOutline(outlineWidth)
          ? child
          : DecoratedBox(
              position: DecorationPosition.foreground,
              decoration: TanreiContainerDecoration(shape: shape, border: ring),
              child: child,
            ),
    );
  }
}
