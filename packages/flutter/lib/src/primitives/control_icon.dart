import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import '../theme/icon_style.dart';
import '../theme/theme.dart';

/// The icon of a control: an [icon] slot drawn the way the design system's icon tokens say
/// (`system.icon`), in a square box of [size], in [color].
///
/// The slot stays a slot. What this sets for its subtree:
///
/// * an [IconTheme] with the size, color, `FILL`, `wght`, `GRAD` and `opsz` of the selection state
///   (`system.icon.toIconThemeData(size:, selected:)`: the optical size is [size] clamped to
///   `sys.icon.optical-size.min` / `.max`), replacing any ambient icon theme, so an `Icon` is drawn
///   from the tokens and nothing else;
/// * a [DefaultTextStyle] of the same style *with the family of the selection state*
///   (`system.icon.resolve(...).toTextStyle`), so a glyph drawn as text —
///   `Text(String.fromCharCode(0xe87d))`, or a ligature name with a font that has ligatures — takes
///   `familyUnselected` or `familySelected` from the theme. An `Icon` cannot: its `IconData` carries
///   its family (see `TanreiIconStyleToIconTheme`);
/// * no text scaling: an icon is not text, and a larger text size does not change its box;
/// * no semantics: the icon is decorative, the control names itself (its label).
///
/// [selected] is whether the icon's subject is selected: for a toggle, its selection; for
/// everything else, false.
class TanreiControlIcon extends StatelessWidget {
  /// Draws [icon] at [size] for [selected], in [color].
  const TanreiControlIcon({
    super.key,
    required this.icon,
    required this.size,
    required this.selected,
    required this.color,
  });

  /// The icon slot: an `Icon`, or a glyph of the icon font drawn as text.
  final Widget icon;

  /// The icon box, in logical pixels (a component's icon size token).
  final double size;

  /// Whether the icon's subject is selected: chooses the family and the fill.
  final bool selected;

  /// The icon color of the current state.
  final Color color;

  @override
  Widget build(BuildContext context) {
    final TanreiIconStyle tokens = TanreiTheme.of(context).system.icon;
    final TanreiResolvedIconStyle style = tokens.resolve(size: size, selected: selected);
    return ExcludeSemantics(
      child: MediaQuery.withNoTextScaling(
        child: IconTheme(
          data: tokens.toIconThemeData(size: size, selected: selected, color: color),
          child: DefaultTextStyle(
            style: style.toTextStyle(color: color),
            textAlign: TextAlign.center,
            softWrap: false,
            maxLines: 1,
            child: SizedBox.square(
              dimension: size,
              child: Center(child: icon),
            ),
          ),
        ),
      ),
    );
  }
}
