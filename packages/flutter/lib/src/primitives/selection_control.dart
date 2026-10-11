import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/text_style.dart';
import 'container_decoration.dart';
import 'corner_shape.dart';

// What the selection controls share (checkbox, radio button, switch): the label
// beside the control, the change of condition that eases over the component's selection motion,
// and a shape filled inside its own outline.

/// A selection control and its visible label: [control], then [label] at the inline end, [gap]
/// apart, in [typescale] and [color] (CHK-15, RAD-17, SWT-15). A `Row`, so a right-to-left layout
/// mirrors the order. The label wraps rather than truncates where the width is bounded, and grows
/// with the text size; the control does not. The control is centered on the label's FIRST line
/// (a wrapped label runs on below it): whichever of the two is shorter — [controlHeight] or the
/// first line at the current text scale — is moved down by half the difference. The label is
/// excluded from semantics: the control's `Semantics` carries it as the accessible name, visible
/// or not.
///
/// With [showLabel] false (an empty label, or `labelHidden`) it is [control] alone.
class TanreiSelectionControlLayout extends StatelessWidget {
  /// Lays out [control] and its [label].
  const TanreiSelectionControlLayout({
    super.key,
    required this.control,
    required this.controlHeight,
    required this.label,
    required this.showLabel,
    required this.gap,
    required this.typescale,
    required this.color,
  });

  /// The control (its box, ring or track, with the round state layer).
  final Widget control;

  /// The height [control] takes in layout (a checkbox's or radio's container, a switch's track).
  final double controlHeight;

  /// The label text.
  final String label;

  /// Whether the label is drawn.
  final bool showLabel;

  /// The space between the control and the label (the component's `label.gap`).
  final double gap;

  /// The label's text style (the component's `label.typescale`).
  final TanreiTextStyle typescale;

  /// The label color of the current condition and state.
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (!showLabel) {
      return control;
    }
    // One line of the label: the scaled font size times the token's line-height ratio (the style
    // sets `height`, so every line box is exactly that tall).
    final TextScaler scaler = MediaQuery.maybeTextScalerOf(context) ?? TextScaler.noScaling;
    final double firstLine = scaler.scale(typescale.size) * typescale.lineHeight / typescale.size;
    final double offset = (controlHeight - firstLine) / 2;
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: gap,
      children: <Widget>[
        Padding(
          padding: EdgeInsets.only(top: offset < 0 ? -offset : 0),
          child: control,
        ),
        Flexible(
          child: Padding(
            padding: EdgeInsets.only(top: offset > 0 ? offset : 0),
            child: ExcludeSemantics(
              child: Text(label, style: typescale.toTextStyle(color: color), softWrap: true),
            ),
          ),
        ),
      ],
    );
  }
}

/// [a] to [b] at [t], where a fully transparent end takes the other end's color at zero alpha: a
/// fill that appears fades in in its own color instead of through the black of `Color(0x00000000)`.
/// [t] may leave 0–1 (an easing that overshoots); the channels are clamped.
Color tanreiLerpColor(Color a, Color b, double t) {
  final Color from = a.a == 0 ? b.withValues(alpha: 0) : a;
  final Color to = b.a == 0 ? a.withValues(alpha: 0) : b;
  return Color.lerp(from, to, t)!;
}

/// Fills [rect] in [shape] with [fill] inside an outline of [outlineWidth] in [outline], drawn
/// inside the edge (CHK-12, SWT-10): a translucent fill never lies under a translucent outline, so
/// the two never add up. A transparent paint draws nothing.
///
/// Two edges anti-aliased along the same curve leave a hairline of the background between them, so
/// the shape is drawn with as few edges as that rule allows: one fill where the fill and the outline
/// are the same color (a checked box, a disabled track); the fill under an opaque outline, which
/// hides it; and only a translucent outline over a different fill takes the fill inside it.
void tanreiPaintOutlinedShape(
  Canvas canvas,
  Rect rect, {
  required TanreiCornerShape shape,
  required Color fill,
  required Color outline,
  required double outlineWidth,
}) {
  final double width = outlineWidth.clamp(0, rect.shortestSide / 2).toDouble();
  final bool drawsOutline = outline.a > 0 && width > 0;
  if (drawsOutline && fill == outline) {
    shape.paint(canvas, rect, Paint()..color = fill);
    return;
  }
  if (fill.a > 0) {
    final bool hidden = drawsOutline && outline.a >= 1;
    shape.paint(canvas, rect, Paint()..color = fill, delta: hidden ? 0 : -width);
  }
  if (drawsOutline) {
    shape.paintBand(canvas, rect, Paint()..color = outline, inner: -width, outer: 0);
  }
}

/// The round state layer behind a selection control: a [size] square in [shape],
/// filled with [color] and the [ripple] of a press. Give it the pressable's container key.
class TanreiStateLayer extends StatelessWidget {
  /// Draws the layer.
  const TanreiStateLayer({
    super.key,
    required this.size,
    required this.shape,
    required this.color,
    this.ripple,
  });

  /// The diameter (the component's `container.size`).
  final double size;

  /// The corners (the state's `container.shape`, eased by the system's corner smoothing).
  final TanreiCornerShape shape;

  /// The container color of the state (transparent at rest).
  final Color color;

  /// The ripple of a press, under `pressedFeedback` = ripple.
  final TanreiRipple? ripple;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: DecoratedBox(
      decoration: TanreiContainerDecoration(
        shape: shape,
        color: color.a > 0 ? color : null,
        ripple: ripple,
      ),
    ),
  );
}

/// [ripple] with its origin moved to the center when the press landed outside the [size] of the
/// container — on the label or in the added target space: a ripple grows from the point of contact
/// only when that point is on the state layer.
TanreiRipple? tanreiRippleInside(TanreiRipple? ripple, Size size) {
  final Offset? origin = ripple?.origin;
  if (ripple == null || origin == null || (Offset.zero & size).contains(origin)) {
    return ripple;
  }
  return TanreiRipple(origin: null, progress: ripple.progress, color: ripple.color);
}

/// A change of condition (unchecked → checked, off → on) drawn over the component's selection
/// motion (CHK-13, RAD-15, SWT-13): the visuals ease from what was drawn when the condition
/// changed to the new condition's, over [selectionDuration] with [selectionCurve]. Where motion is
/// reduced (`MediaQuery.disableAnimations`) the new condition shows at once.
///
/// It is the selection half of a selection control, next to `TanreiPressableStateMixin` (the
/// interaction half): a component implements the four members, and calls [animateSelection] once
/// per build on the visuals of its condition in its state — before `animateVisuals`, which eases
/// interaction-state changes over them. The condition is read in `didUpdateWidget` and
/// `didChangeDependencies`, so it may come from the widget or from an ancestor (a radio group).
mixin TanreiSelectionTransitionMixin<S extends StatefulWidget, V extends Object>
    on TickerProviderStateMixin<S> {
  /// The condition drawn now (a condition key, or anything with value equality).
  Object get selectionCondition;

  /// How long a change of condition takes (the component's `motion.selection-duration`).
  Duration get selectionDuration;

  /// Its easing (the component's `motion.selection-easing`); it may overshoot.
  Curve get selectionCurve;

  /// Interpolates the component's visuals. [t] may leave 0–1 when [selectionCurve] overshoots.
  V lerpSelection(V a, V b, double t);

  late final AnimationController _selection = AnimationController(vsync: this, value: 1);
  Object? _condition;
  bool _hasCondition = false;
  V? _selectionBegin;
  V? _selectionDrawn;

  /// Whether a change of condition is being drawn.
  bool get isSelectionAnimating => _selection.isAnimating;

  @override
  void initState() {
    super.initState();
    _selection.addListener(_rebuildSelection);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _selection.duration = selectionDuration;
    // Motion reduced while a change runs: it ends now.
    if (_reduceSelectionMotion && _selection.isAnimating) {
      _selection.value = _selection.upperBound;
    }
    _checkSelection();
  }

  @override
  void didUpdateWidget(S oldWidget) {
    super.didUpdateWidget(oldWidget);
    _checkSelection();
  }

  @override
  void dispose() {
    _selection.dispose();
    super.dispose();
  }

  void _rebuildSelection() => setState(() {});

  // Read when needed, not cached: `didUpdateWidget` runs before `didChangeDependencies` learns
  // that the media query changed in the same frame.
  bool get _reduceSelectionMotion => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _checkSelection() {
    final Object next = selectionCondition;
    if (!_hasCondition) {
      _hasCondition = true;
      _condition = next;
      return;
    }
    if (next == _condition) {
      return;
    }
    _condition = next;
    _selectionBegin = _selectionDrawn;
    if (_reduceSelectionMotion || _selectionBegin == null) {
      _selection.value = _selection.upperBound;
    } else {
      _selection.forward(from: _selection.lowerBound);
    }
  }

  /// The visuals to draw this frame for the current condition's [target]: [target] itself, or —
  /// while a change of condition runs — the interpolation from what was drawn when it began.
  @protected
  V animateSelection(V target) {
    final V? begin = _selectionBegin;
    final V visuals = begin == null || _selection.isCompleted
        ? target
        : lerpSelection(begin, target, selectionCurve.transform(_selection.value));
    _selectionDrawn = visuals;
    return visuals;
  }
}
