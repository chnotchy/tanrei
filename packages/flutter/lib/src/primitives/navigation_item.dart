import 'dart:math' as math;
import 'dart:ui' show SemanticsRole, lerpDouble;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../components/badge.dart';
import '../generated/tokens.g.dart';
import '../theme/motion.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';
import 'accessible_name.dart';
import 'container_decoration.dart';
import 'control_icon.dart';
import 'corner_shape.dart';
import 'focus_ring.dart';
import 'pressable.dart';
import 'selection_control.dart';

/// The badge of a navigation destination (a navigation bar's or rail's): drawn as a `TanreiBadge`
/// on the destination's icon. [count] is the badge's count — null the dot, 0 nothing, above 0 the
/// number (above 999 as 999+) — and [semanticLabel] its label, read after the destination's name
/// and state ("3 unread"); without one the displayed count is read, and a dot needs one.
@immutable
class TanreiNavigationBadge {
  /// Describes a badge.
  const TanreiNavigationBadge({this.count, this.semanticLabel = ''});

  /// The badge's count: null draws the dot.
  final num? count;

  /// What assistive technology reads after the destination's name and state.
  final String semanticLabel;

  /// The description a destination adds to its own (NVB-16): [semanticLabel], or the displayed
  /// count when it is empty; null when there is nothing to say (a dot without a label, or 0).
  String? description(Locale? locale) {
    if (tanreiIsAccessibleName(semanticLabel)) {
      return (count ?? 1) > 0 ? semanticLabel : null;
    }
    return TanreiBadge.displayText(count, locale: locale);
  }

  @override
  bool operator ==(Object other) =>
      other is TanreiNavigationBadge &&
      other.count == count &&
      other.semanticLabel == semanticLabel;

  @override
  int get hashCode => Object.hash(count, semanticLabel);
}

/// A destination's parts in one condition and interaction state: its item container (the state
/// layer's box and, while selected, the active indicator), its icon and its label.
typedef TanreiNavigationItemParts = ({TanreiPaint container, TanreiPaint icon, TanreiPaint label});

/// What a navigation bar or rail tells its destinations: the item tokens of the component, read
/// through [parts] and [opacity] so that each component keeps its own tokens.
@immutable
class TanreiNavigationItemStyle {
  /// Describes a component's destinations.
  const TanreiNavigationItemStyle({
    required this.containerWidth,
    required this.containerHeight,
    required this.containerShape,
    required this.gap,
    required this.iconSize,
    required this.labelTypescale,
    required this.feedbackDuration,
    required this.stateDuration,
    required this.stateEasing,
    required this.selectionDuration,
    required this.selectionEasing,
    required this.parts,
    required this.opacity,
    this.labelMaxLines = 1,
    this.cellPadding = EdgeInsets.zero,
  });

  /// `item.container.width`.
  final double containerWidth;

  /// `item.container.height`.
  final double containerHeight;

  /// `item.container.shape`.
  final double containerShape;

  /// `item.gap`: between the item container and the label.
  final double gap;

  /// `item.icon.size`.
  final double iconSize;

  /// `item.label.typescale`.
  final TanreiTextStyle labelTypescale;

  /// `motion.feedback-duration`: how long a ripple grows.
  final int feedbackDuration;

  /// `motion.state-duration`.
  final int stateDuration;

  /// `motion.state-easing`.
  final TanreiCubicBezier stateEasing;

  /// `motion.selection-duration`.
  final int selectionDuration;

  /// `motion.selection-easing`.
  final TanreiCubicBezier selectionEasing;

  /// The parts of the selected or unselected condition in [state].
  final TanreiNavigationItemParts Function(bool selected, TanreiInteractionState state) parts;

  /// The opacity of [state] (null at rest: 1).
  final double? Function(TanreiInteractionState state) opacity;

  /// How many lines a label may take before it is truncated: one in a bar, two in a rail.
  final int labelMaxLines;

  /// The space around the destination inside its cell, part of the hit area (a rail's half gap
  /// above and below).
  final EdgeInsets cellPadding;
}

/// One destination of a navigation bar or rail: an item container with the icon in it (the badge
/// on the icon), the label below, the two centered as a group in whatever cell the component gives
/// it — which is the destination's whole hit area, at least the touch target on both axes.
///
/// It presses as a button does (`TanreiPressableStateMixin`: states, press-hold, the pressed
/// feedback, the focus ring around the item container), and a change of selection eases over the
/// selection motion (`TanreiSelectionTransitionMixin`): colors and the label's presence, the new
/// active indicator growing from the center of the item container while the old one fades. It is
/// exposed as a tab with its selected and enabled states, named by [label] drawn or not, with the
/// badge's description as its value.
class TanreiNavigationItem extends StatefulWidget {
  /// Creates a destination.
  const TanreiNavigationItem({
    super.key,
    required this.style,
    required this.icon,
    required this.label,
    required this.labelShown,
    required this.selected,
    required this.enabled,
    required this.onPressed,
    this.badge,
    this.debugComponent = 'navigation destination',
  });

  /// The component's item tokens.
  final TanreiNavigationItemStyle style;

  /// The glyph's name (or its code point) in the system's icon font, drawn as text.
  final String icon;

  /// The name, drawn under the item container while [labelShown], and always the accessible name.
  final String label;

  /// Whether the label is drawn.
  final bool labelShown;

  /// Whether this is the selected destination.
  final bool selected;

  /// Whether it can be activated and focused.
  final bool enabled;

  /// Called when it is activated.
  final VoidCallback onPressed;

  /// The badge on the icon, if any.
  final TanreiNavigationBadge? badge;

  /// How a missing name is reported in debug builds.
  final String debugComponent;

  @override
  State<TanreiNavigationItem> createState() => _TanreiNavigationItemState();
}

/// How a destination looks in one state and condition.
@immutable
class _ItemVisuals {
  const _ItemVisuals({
    required this.container,
    required this.icon,
    required this.label,
    required this.opacity,
    required this.labelPresence,
  });

  final Color container;
  final Color icon;
  final Color label;
  final double opacity;

  /// 1 while the label is drawn, 0 while it is not (between while it appears or leaves).
  final double labelPresence;

  static _ItemVisuals lerp(_ItemVisuals a, _ItemVisuals b, double t) => _ItemVisuals(
    container: tanreiLerpColor(a.container, b.container, t),
    icon: tanreiLerpColor(a.icon, b.icon, t),
    label: tanreiLerpColor(a.label, b.label, t),
    opacity: lerpDouble(a.opacity, b.opacity, t)!,
    labelPresence: lerpDouble(a.labelPresence, b.labelPresence, t)!,
  );
}

/// A resting destination is not dimmed.
const double _opaque = 1;

class _TanreiNavigationItemState extends State<TanreiNavigationItem>
    with
        TickerProviderStateMixin<TanreiNavigationItem>,
        TanreiPressableStateMixin<TanreiNavigationItem, _ItemVisuals>,
        TanreiSelectionTransitionMixin<TanreiNavigationItem, _ItemVisuals> {
  /// How far the active indicator has grown from the center (1: the whole item container).
  late final AnimationController _grow = AnimationController(vsync: this, value: 1)
    ..addListener(() => setState(() {}));

  TanreiNavigationItemStyle get _style => widget.style;

  @override
  VoidCallback? get onPressed => widget.enabled ? widget.onPressed : null;

  @override
  Duration get stateTransitionDuration => tanreiDuration(_style.stateDuration);

  @override
  Duration get rippleDuration => tanreiDuration(_style.feedbackDuration);

  @override
  Curve get stateCurve => _style.stateEasing.toCurve();

  @override
  _ItemVisuals lerpVisuals(_ItemVisuals a, _ItemVisuals b, double t) => _ItemVisuals.lerp(a, b, t);

  // A change of selection, or of whether the label is drawn, eases over the selection motion.
  @override
  Object get selectionCondition => (widget.selected, widget.labelShown);

  @override
  Duration get selectionDuration => tanreiDuration(_style.selectionDuration);

  @override
  Curve get selectionCurve => _style.selectionEasing.toCurve();

  @override
  _ItemVisuals lerpSelection(_ItemVisuals a, _ItemVisuals b, double t) =>
      _ItemVisuals.lerp(a, b, t);

  @override
  void initState() {
    super.initState();
    _debugReportMissingName(null);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _grow.duration = tanreiDuration(_style.selectionDuration);
  }

  @override
  void didUpdateWidget(TanreiNavigationItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    _debugReportMissingName(oldWidget);
    _grow.duration = tanreiDuration(_style.selectionDuration);
    final bool reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (!oldWidget.selected && widget.selected && !reduced) {
      // The new active indicator grows from the center of the item container.
      _grow.forward(from: _grow.lowerBound);
    } else if (!widget.selected || reduced) {
      _grow.value = _grow.upperBound;
    }
  }

  @override
  void dispose() {
    _grow.dispose();
    super.dispose();
  }

  /// An empty label is reported in debug builds — when first built so, and when it loses the one
  /// it had.
  void _debugReportMissingName(TanreiNavigationItem? oldWidget) {
    assert(() {
      if ((oldWidget == null || tanreiIsAccessibleName(oldWidget.label)) &&
          !tanreiIsAccessibleName(widget.label)) {
        debugTanreiReportMissingName(widget.debugComponent, widget);
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiNavigationItemStyle style = _style;
    final bool selected = widget.selected;
    final TanreiNavigationItemParts drawn = style.parts(selected, drawnState);
    final _ItemVisuals visuals = animateVisuals(
      animateSelection(
        _ItemVisuals(
          // The container of the state the pressed feedback names; every other part the drawn
          // state's.
          container: theme.paint(style.parts(selected, containerState).container),
          icon: theme.paint(drawn.icon),
          label: theme.paint(drawn.label),
          opacity: style.opacity(drawnState) ?? _opaque,
          labelPresence: widget.labelShown ? 1 : 0,
        ),
      ),
    );
    final TanreiCornerShape shape = TanreiCornerShape(
      smoothing: theme.system.shape.cornerSmoothing,
      radius: style.containerShape,
    );
    final Size box = Size(style.containerWidth, style.containerHeight);

    Widget icon = TanreiControlIcon(
      icon: Text(widget.icon),
      size: style.iconSize,
      selected: selected,
      color: visuals.icon,
    );
    final TanreiNavigationBadge? badge = widget.badge;
    if (badge != null) {
      // The badge component on the icon, with its own tokens; its description joins the
      // destination's (below), not a node of its own.
      icon = TanreiBadge(count: badge.count, semanticLabel: badge.semanticLabel, child: icon);
    }

    final Widget container = TanreiFocusRing(
      visible: isKeyboardFocused,
      borderRadius: BorderRadius.circular(shape.radius),
      child: SizedBox.fromSize(
        size: box,
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: <Widget>[
            // The item container: the state layer's box and, selected, the active indicator,
            // growing from its center when it becomes selected.
            FractionallySizedBox(
              widthFactor: math.max(0, selectionCurve.transform(_grow.value)),
              heightFactor: 1,
              child: DecoratedBox(
                key: pressContainerKey,
                decoration: TanreiContainerDecoration(
                  shape: shape,
                  color: visuals.container.a > 0 ? visuals.container : null,
                  // A press in the cell outside the item container grows from its center.
                  ripple: tanreiRippleInside(
                    rippleFor(
                      pressedContainer: () =>
                          theme.paint(style.parts(selected, interactionState).container),
                      container: visuals.container,
                    ),
                    box,
                  ),
                ),
              ),
            ),
            icon,
          ],
        ),
      ),
    );

    final double presence = clampDouble(visuals.labelPresence, 0, 1);
    final Widget group = Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        container,
        if (presence > 0)
          // The label appears and leaves with the selection motion, moving the item container.
          ClipRect(
            child: Align(
              alignment: Alignment.topCenter,
              heightFactor: presence,
              child: Opacity(
                opacity: presence,
                child: Padding(
                  padding: EdgeInsets.only(top: style.gap),
                  child: Text(
                    widget.label,
                    style: theme.textStyle(style.labelTypescale, color: visuals.label),
                    textAlign: TextAlign.center,
                    maxLines: style.labelMaxLines,
                    softWrap: style.labelMaxLines > 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ),
      ],
    );

    final double target = theme.system.measure.targetTouch;
    return Semantics(
      container: true,
      role: SemanticsRole.tab,
      selected: selected,
      enabled: widget.enabled,
      label: tanreiIsAccessibleName(widget.label) ? widget.label : null,
      value: badge?.description(Localizations.maybeLocaleOf(context)),
      child: buildPressable(
        child: Opacity(
          opacity: visuals.opacity,
          child: ConstrainedBox(
            // The whole cell is the hit area, never below the touch target.
            constraints: BoxConstraints(minWidth: target, minHeight: target),
            child: Padding(
              padding: style.cellPadding,
              child: Center(heightFactor: 1, child: ExcludeSemantics(child: group)),
            ),
          ),
        ),
      ),
    );
  }
}
