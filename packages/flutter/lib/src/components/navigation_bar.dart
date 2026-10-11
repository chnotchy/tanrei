import 'dart:math' as math;
import 'dart:ui' show SemanticsRole;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../primitives/accessible_name.dart';
import '../primitives/container_decoration.dart';
import '../primitives/corner_shape.dart';
import '../primitives/edge.dart';
import '../primitives/elevation.dart';
import '../primitives/ignored_value.dart';
import '../primitives/navigation_item.dart';
import '../theme/theme.dart';
import '../theme/theme_data.dart';

/// Which destinations of a [TanreiNavigationBar] draw their label (the spec's `labelVisibility`),
/// as Material's `NavigationDestinationLabelBehavior`.
enum TanreiNavigationBarLabelBehavior {
  /// Every destination draws its label (`always`).
  alwaysShow,

  /// Only the selected destination draws its label (`selected`).
  onlyShowSelected,

  /// No destination draws its label (`never`): the label is still its accessible name.
  alwaysHide,
}

/// One destination of a [TanreiNavigationBar] (the spec's item kind `destination`), as a
/// `NavigationDestination` in `NavigationBar.destinations`: its value is its index in the bar's
/// `destinations`.
///
/// [icon] is the glyph's name (or its code point) in the system's icon font, drawn outlined while
/// unselected and filled while selected; [label] its name, drawn or not, and always its accessible
/// name; [enabled] false disables it (the spec's `disabled`); [badge] a `TanreiNavigationBadge`
/// (the spec's `badge`, with its `count` and `semanticLabel`), drawn as a `TanreiBadge` on the icon.
@immutable
class TanreiNavigationDestination {
  /// Describes a destination.
  const TanreiNavigationDestination({
    required this.icon,
    required this.label,
    this.enabled = true,
    this.badge,
  });

  /// The glyph's name (or code point) in the system's icon font.
  final String icon;

  /// The destination's name.
  final String label;

  /// Whether it can be activated and focused.
  final bool enabled;

  /// The badge on its icon, if any.
  final TanreiNavigationBadge? badge;
}

/// Moves between three to five top-level destinations from the bottom edge of a compact screen,
/// and shows which one is current.
///
/// Implements `specs/navigation-bar.spec.json` with the idiom of Flutter's `NavigationBar`:
///
/// * [destinations] are `TanreiNavigationDestination`s (the spec's item kind `destination`); a
///   destination's value is its index in [destinations];
/// * [selectedIndex] is the spec's `value`: the index of the selected destination, null for none.
///   An index that names no destination selects none and is reported in debug builds (NVB-3);
/// * [onDestinationSelected] is both the spec's `change` and `reselect`: called once with the index
///   of the activated destination, the selected one included — the caller compares it with
///   [selectedIndex]. The bar keeps no selection of its own;
/// * [labelBehavior] is the spec's `labelVisibility` (`always`, `selected`, `never`) and
///   [semanticLabel] its `label`, the bar's accessible name.
///
/// Every destination is a Tab stop (a disabled one is not), activated with Enter or Space. The bar
/// is a tab bar to assistive technology, each destination a tab with its selected state, named by
/// its label drawn or not, followed by its badge's description.
///
/// The bar spans its parent's width, one equal cell per destination in reading order (mirrored
/// right to left), each cell the destination's whole hit area. Its color reaches under the bottom
/// system inset (`MediaQuery.paddingOf`: the home indicator, the gesture bar) and its destinations
/// sit above it and inside the side insets.
class TanreiNavigationBar extends StatefulWidget {
  /// Creates a navigation bar.
  const TanreiNavigationBar({
    super.key,
    required this.destinations,
    this.selectedIndex,
    this.onDestinationSelected,
    this.labelBehavior = TanreiNavigationBarLabelBehavior.alwaysShow,
    this.semanticLabel = '',
  });

  /// The destinations, in order: three to five.
  final List<TanreiNavigationDestination> destinations;

  /// The index of the selected destination; null selects none.
  final int? selectedIndex;

  /// Called with the index of the destination the user activated, whether or not it is selected.
  final ValueChanged<int>? onDestinationSelected;

  /// Which destinations draw their label.
  final TanreiNavigationBarLabelBehavior labelBehavior;

  /// The bar's accessible name ("Main").
  final String semanticLabel;

  @override
  State<TanreiNavigationBar> createState() => _TanreiNavigationBarState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('selectedIndex', selectedIndex, ifNull: 'none'))
      ..add(EnumProperty<TanreiNavigationBarLabelBehavior>('labelBehavior', labelBehavior))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''))
      ..add(IntProperty('destinations', destinations.length));
  }
}

/// NVB-17: the destinations a bar is meant to hold.
const int _fewestDestinations = 3;
const int _mostDestinations = 5;

class _TanreiNavigationBarState extends State<TanreiNavigationBar> {
  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  /// NVB-3, NVB-17: in debug builds, report an index that names no destination and a count outside
  /// three to five — once for each state of the bar that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[
        if (widget.selectedIndex case final int index
            when index < 0 || index >= widget.destinations.length)
          'The selectedIndex $index names no destination: none is selected.',
        if (widget.destinations.length < _fewestDestinations ||
            widget.destinations.length > _mostDestinations)
          'A navigation bar holds three to five destinations; these '
              '${widget.destinations.length} are all drawn.',
      ];
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('navigation-bar', 'destinations', problem, widget);
        }
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiNavigationBarTokens tokens = theme.system.navigationBar;
    final TanreiNavigationItemStyle style = TanreiNavigationItemStyle(
      containerWidth: tokens.itemContainerWidth,
      containerHeight: tokens.itemContainerHeight,
      containerShape: tokens.itemContainerShape,
      gap: tokens.itemGap,
      iconSize: tokens.itemIconSize,
      labelTypescale: tokens.itemLabelTypescale,
      feedbackDuration: tokens.motionFeedbackDuration,
      stateDuration: tokens.motionStateDuration,
      stateEasing: tokens.motionStateEasing,
      selectionDuration: tokens.motionSelectionDuration,
      selectionEasing: tokens.motionSelectionEasing,
      // NVB-3, NVB-4, NVB-7: the parts of the destination's condition in its state.
      parts: (bool selected, TanreiInteractionState state) {
        final TanreiNavigationBarConditionStateTokens parts = tokens
            .conditions[selected
                ? TanreiNavigationBarCondition.selected
                : TanreiNavigationBarCondition.unselected]
            .of(state);
        return (
          container: parts.itemContainerColor,
          icon: parts.itemIconColor,
          label: parts.itemLabelColor,
        );
      },
      opacity: (TanreiInteractionState state) => tokens.stateTokens(state)?.opacity,
    );

    final int? selected = widget.selectedIndex;
    final EdgeInsets insets = MediaQuery.paddingOf(context);
    // NVB-11: one equal cell per destination, in reading order (a Row mirrors right to left);
    // NVB-6: each cell the destination's whole hit area, as tall as the bar.
    final Widget row = Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (final (int index, TanreiNavigationDestination destination)
            in widget.destinations.indexed)
          Expanded(
            child: TanreiNavigationItem(
              style: style,
              icon: destination.icon,
              label: destination.label,
              // NVB-13: always, only the selected one's, or never.
              labelShown: switch (widget.labelBehavior) {
                TanreiNavigationBarLabelBehavior.alwaysShow => true,
                TanreiNavigationBarLabelBehavior.onlyShowSelected => index == selected,
                TanreiNavigationBarLabelBehavior.alwaysHide => false,
              },
              selected: index == selected,
              enabled: destination.enabled,
              badge: destination.badge,
              // NVB-1: change or reselect, the caller compares.
              onPressed: () => widget.onDestinationSelected?.call(index),
              debugComponent: 'navigation destination',
            ),
          ),
      ],
    );

    // NVB-11, NVB-21: at least container.height (and the touch target) above the inset, growing
    // with the labels at enlarged text; NVB-18: above the bottom inset, inside the side insets.
    Widget content = ConstrainedBox(
      constraints: BoxConstraints(
        minHeight: math.max(tokens.containerHeight, theme.system.measure.targetTouch),
      ),
      child: IntrinsicHeight(child: row),
    );
    content = Padding(
      padding: EdgeInsets.only(left: insets.left, right: insets.right, bottom: insets.bottom),
      child: MediaQuery.removePadding(
        context: context,
        removeLeft: true,
        removeRight: true,
        removeBottom: true,
        child: content,
      ),
    );

    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    final Color color = theme.paint(tokens.containerColor);
    // NVB-19: a tab bar named by the bar's label; each destination a tab.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.tabBar,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      // NVB-11, NVB-18: the container, raised and edged at the top, reaching under the inset.
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: TanreiCornerShape(smoothing: theme.system.shape.cornerSmoothing, radius: _square),
          color: color.a > 0 ? color : null,
          border: elevation.ring,
          boxShadow: elevation.shadows.isEmpty ? null : elevation.shadows,
        ),
        child: CustomPaint(
          foregroundPainter: TanreiEdgePainter(
            color: theme.paint(tokens.outlineColor),
            width: tokens.outlineWidth,
            side: TanreiEdgeSide.top,
          ),
          child: content,
        ),
      ),
    );
  }
}

/// The bar is flush with the screen's edges: a square container (no corner token exists).
const double _square = 0;
