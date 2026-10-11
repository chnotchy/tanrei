import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';
import 'theme_data.dart';

/// Provides a [TanreiThemeData] to descendant Tanrei widgets.
///
/// Without a [TanreiTheme] ancestor, [TanreiTheme.of] follows the platform brightness and
/// high-contrast settings (see [TanreiThemeData.platform]).
class TanreiTheme extends InheritedWidget {
  /// Applies [data] to [child].
  const TanreiTheme({super.key, required this.data, required super.child});

  /// The theme for this subtree.
  final TanreiThemeData data;

  /// The nearest theme, or null when there is no [TanreiTheme] ancestor.
  static TanreiThemeData? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<TanreiTheme>()?.data;

  /// The nearest theme, or the platform-following default.
  static TanreiThemeData of(BuildContext context) =>
      maybeOf(context) ?? TanreiThemeData.platform(context);

  /// Shorthand for `TanreiTheme.of(context).color(role, opacity: opacity)`.
  static Color colorOf(BuildContext context, TanreiColorRole role, {double? opacity}) =>
      of(context).color(role, opacity: opacity);

  /// Shorthand for `TanreiTheme.of(context).paint(paint)`.
  static Color paintOf(BuildContext context, TanreiPaint paint) => of(context).paint(paint);

  /// Shorthand for `TanreiTheme.of(context).system`: the design system every token is read from.
  static TanreiSystem systemOf(BuildContext context) => of(context).system;

  @override
  bool updateShouldNotify(TanreiTheme oldWidget) => data != oldWidget.data;
}
