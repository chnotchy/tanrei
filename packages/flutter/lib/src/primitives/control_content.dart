import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/text_style.dart';

/// The content of a control: an optional leading [icon] and a [label], in a row [gap] apart,
/// centered, drawn in [color].
///
/// The icon stays a slot: this sets the icon size and color of its subtree (`IconTheme`) and
/// nothing else. The label gets the [labelTypescale] text style as the `DefaultTextStyle`, so a
/// plain `Text` needs no style. Every value is a token of the component (its size axis for [gap],
/// [iconSize] and [labelTypescale]; the state's label color for [color]).
class TanreiControlContent extends StatelessWidget {
  /// Lays out [icon] and [label].
  const TanreiControlContent({
    super.key,
    this.icon,
    required this.label,
    required this.gap,
    required this.iconSize,
    required this.labelTypescale,
    required this.color,
    this.excludeLabelSemantics = false,
  });

  /// The leading icon slot.
  final Widget? icon;

  /// The label slot, usually a `Text`.
  final Widget label;

  /// The space between icon and label.
  final double gap;

  /// The icon box size.
  final double iconSize;

  /// The label's text style.
  final TanreiTextStyle labelTypescale;

  /// The label and icon color of the current state.
  final Color color;

  /// Whether the label is hidden from assistive technology, because the control names itself
  /// another way (a `semanticLabel`).
  final bool excludeLabelSemantics;

  @override
  Widget build(BuildContext context) => IconTheme.merge(
    data: IconThemeData(size: iconSize, color: color),
    child: DefaultTextStyle(
      style: labelTypescale.toTextStyle(color: color),
      textAlign: TextAlign.center,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: gap,
        children: <Widget>[
          if (icon case final Widget icon) icon,
          Flexible(child: excludeLabelSemantics ? ExcludeSemantics(child: label) : label),
        ],
      ),
    ),
  );
}
