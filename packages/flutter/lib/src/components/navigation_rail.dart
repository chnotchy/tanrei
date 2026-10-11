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

/// Which destinations of a [TanreiNavigationRail] draw their label (the spec's `labelVisibility`),
/// as Material's `NavigationRailLabelType`.
enum TanreiNavigationRailLabelType {
  /// Every destination draws its label (`always`).
  all,

  /// Only the selected destination draws its label (`selected`).
  selected,

  /// No destination draws its label (`never`): the label is still its accessible name.
  none,
}

/// One destination of a [TanreiNavigationRail] (the spec's item kind `destination`), as a
/// `NavigationRailDestination` in `NavigationRail.destinations`: its value is its index in the
/// rail's `destinations`.
///
/// [icon] is the glyph's name (or its code point) in the system's icon font, drawn outlined while
/// unselected and filled while selected; [label] its name, drawn or not, and always its accessible
/// name; [disabled] true disables it (the spec's `disabled`, as `NavigationRailDestination`'s flag);
/// [badge] a `TanreiNavigationBadge` (the spec's `badge`, with its `count` and `semanticLabel`),
/// drawn as a `TanreiBadge` on the icon.
@immutable
class TanreiNavigationRailDestination {
  /// Describes a destination.
  const TanreiNavigationRailDestination({
    required this.icon,
    required this.label,
    this.disabled = false,
    this.badge,
  });

  /// The glyph's name (or code point) in the system's icon font.
  final String icon;

  /// The destination's name.
  final String label;

  /// Whether it is unavailable: it keeps its place, cannot be activated and is not focusable.
  final bool disabled;

  /// The badge on its icon, if any.
  final TanreiNavigationBadge? badge;
}

/// Moves between a product's top-level destinations from the start edge of a medium or expanded
/// window, and shows which one is current.
///
/// Implements `specs/navigation-rail.spec.json` with the idiom of Flutter's `NavigationRail`:
///
/// * [destinations] are `TanreiNavigationRailDestination`s (the spec's item kind `destination`); a
///   destination's value is its index in [destinations];
/// * [selectedIndex] is the spec's `value`: the index of the selected destination, null for none.
///   An index that names no destination selects none and is reported in debug builds (NVR-3);
/// * [onDestinationSelected] is both `change` and `reselect`: called once with the index of the
///   activated destination, the selected one included — the caller compares;
/// * [labelType] is the spec's `labelVisibility` (`always`, `selected`, `never`) and
///   [semanticLabel] its `label`, the rail's accessible name;
/// * [leading] is the spec's `header` slot: the header-button items (a `TanreiIconButton` with its
///   own `semanticLabel` and `onPressed`, the product's menu button) and a floating action button,
///   in a `Column` when there are both. The rail centers it and does not restyle it.
///
/// The rail is [TanreiNavigationRailTokens.containerWidth] wide beside the start inset and as high
/// as its parent (place it first in a `Row`); its color reaches under the system insets at its
/// start, top and bottom. The header stays in place while the destinations scroll. Every enabled
/// destination is a Tab stop, after the header's content; to assistive technology the destinations
/// are the tabs of a tab bar.
class TanreiNavigationRail extends StatefulWidget {
  /// Creates a navigation rail.
  const TanreiNavigationRail({
    super.key,
    required this.destinations,
    this.selectedIndex,
    this.onDestinationSelected,
    this.labelType = TanreiNavigationRailLabelType.all,
    this.leading,
    this.semanticLabel = '',
  });

  /// The destinations, in order: three to seven.
  final List<TanreiNavigationRailDestination> destinations;

  /// The index of the selected destination; null selects none.
  final int? selectedIndex;

  /// Called with the index of the destination the user activated, whether or not it is selected.
  final ValueChanged<int>? onDestinationSelected;

  /// Which destinations draw their label.
  final TanreiNavigationRailLabelType labelType;

  /// The header: the menu icon button, and a floating action button the product places there.
  final Widget? leading;

  /// The rail's accessible name ("Main").
  final String semanticLabel;

  @override
  State<TanreiNavigationRail> createState() => _TanreiNavigationRailState();

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('selectedIndex', selectedIndex, ifNull: 'none'))
      ..add(EnumProperty<TanreiNavigationRailLabelType>('labelType', labelType))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: ''))
      ..add(IntProperty('destinations', destinations.length));
  }
}

/// NVR-18: the destinations a rail is meant to hold.
const int _fewestDestinations = 3;
const int _mostDestinations = 7;

class _TanreiNavigationRailState extends State<TanreiNavigationRail> {
  /// What the last debug check reported, so a report is made once per change, never per build.
  String _reported = '';

  /// NVR-3, NVR-18: in debug builds, report an index that names no destination and a count outside
  /// three to seven — once for each state of the rail that has them.
  void _debugCheck() {
    assert(() {
      final List<String> problems = <String>[
        if (widget.selectedIndex case final int index
            when index < 0 || index >= widget.destinations.length)
          'The selectedIndex $index names no destination: none is selected.',
        if (widget.destinations.length < _fewestDestinations ||
            widget.destinations.length > _mostDestinations)
          'A navigation rail holds three to seven destinations; these '
              '${widget.destinations.length} are all drawn.',
      ];
      final String signature = problems.join('|');
      if (signature != _reported) {
        _reported = signature;
        for (final String problem in problems) {
          debugTanreiReportIgnoredValue('navigation-rail', 'destinations', problem, widget);
        }
      }
      return true;
    }());
  }

  @override
  Widget build(BuildContext context) {
    _debugCheck();
    final TanreiThemeData theme = TanreiTheme.of(context);
    final TanreiNavigationRailTokens tokens = theme.system.navigationRail;
    final TextDirection direction = Directionality.of(context);
    final double halfGap = tokens.containerGap / 2;
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
      // NVR-3, NVR-4, NVR-7: the parts of the destination's condition in its state.
      parts: (bool selected, TanreiInteractionState state) {
        final TanreiNavigationRailConditionStateTokens parts = tokens
            .conditions[selected
                ? TanreiNavigationRailCondition.selected
                : TanreiNavigationRailCondition.unselected]
            .of(state);
        return (
          container: parts.itemContainerColor,
          icon: parts.itemIconColor,
          label: parts.itemLabelColor,
        );
      },
      opacity: (TanreiInteractionState state) => tokens.stateTokens(state)?.opacity,
      // NVR-13, NVR-22: two lines, then an ellipsis.
      labelMaxLines: _labelLines,
      // NVR-6: the cell is the destination with half the gap above and below it.
      cellPadding: EdgeInsets.symmetric(vertical: halfGap),
    );

    final int? selected = widget.selectedIndex;
    // NVR-6, NVR-12: cells the rail's full width, stacked in reading order, container.gap between
    // two destinations (each cell's half gaps).
    final Widget destinations = Semantics(
      // NVR-20: a tab bar named by the rail's label, each destination a tab.
      container: true,
      explicitChildNodes: true,
      role: SemanticsRole.tabBar,
      label: tanreiIsAccessibleName(widget.semanticLabel) ? widget.semanticLabel : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          for (final (int index, TanreiNavigationRailDestination destination)
              in widget.destinations.indexed)
            TanreiNavigationItem(
              style: style,
              icon: destination.icon,
              label: destination.label,
              // NVR-14: always, only the selected one's, or never.
              labelShown: switch (widget.labelType) {
                TanreiNavigationRailLabelType.all => true,
                TanreiNavigationRailLabelType.selected => index == selected,
                TanreiNavigationRailLabelType.none => false,
              },
              selected: index == selected,
              enabled: !destination.disabled,
              badge: destination.badge,
              // NVR-1: change or reselect, the caller compares.
              onPressed: () => widget.onDestinationSelected?.call(index),
            ),
        ],
      ),
    );

    // NVR-12: the header centered and stacked, padding-block below the top; the destinations
    // header.gap below it (padding-block below the top without one) — measured to the first
    // destination, whose cell starts half a gap above it.
    final Widget? header = widget.leading;
    final double top = header == null ? tokens.containerPaddingBlock : tokens.headerGap;
    // NVR-18: the destinations scroll; the header stays in place.
    final Widget list = SingleChildScrollView(
      padding: EdgeInsets.only(
        top: _positive(top - halfGap),
        bottom: _positive(tokens.containerPaddingBlock - halfGap),
      ),
      child: destinations,
    );

    // NVR-19: inside the insets at the rail's start, top and bottom.
    final EdgeInsets insets = MediaQuery.paddingOf(context);
    final EdgeInsets inside = EdgeInsets.only(
      top: insets.top,
      bottom: insets.bottom,
      left: direction == TextDirection.ltr ? insets.left : 0,
      right: direction == TextDirection.rtl ? insets.right : 0,
    );
    Widget content = Column(
      children: <Widget>[
        if (header != null)
          Padding(
            padding: EdgeInsets.only(top: tokens.containerPaddingBlock),
            child: Center(child: header),
          ),
        Expanded(child: list),
      ],
    );
    content = Padding(
      padding: inside,
      child: MediaQuery.removePadding(
        context: context,
        removeTop: true,
        removeBottom: true,
        removeLeft: true,
        removeRight: true,
        // NVR-11: container.width beside the start inset.
        child: SizedBox(width: tokens.containerWidth, child: content),
      ),
    );

    final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
      tokens.containerElevation,
      theme.colors,
    );
    final Color color = theme.paint(tokens.containerColor);
    // NVR-20: the header first in reading and focus order, with its own semantics.
    return Semantics(
      container: true,
      explicitChildNodes: true,
      // NVR-11: the container, raised, edged at its end, reaching under the insets.
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
            side: TanreiEdgeSide.end,
            textDirection: direction,
          ),
          child: content,
        ),
      ),
    );
  }
}

double _positive(double value) => value < 0 ? 0 : value;

/// NVR-13: a rail's label takes at most two lines.
const int _labelLines = 2;

/// The rail is flush with the screen's edges: a square container (no corner token exists).
const double _square = 0;
