import 'package:flutter/widgets.dart';
import 'package:tanrei/tanrei.dart';

/// A minimal app shell for widget tests: shortcuts, focus traversal, media query and a Tanrei theme
/// on a `surface` background. Deliberately not a MaterialApp.
Widget tanreiTestApp(
  Widget child, {
  TanreiThemeData theme = TanreiThemeData.light,
  bool disableAnimations = false,
}) {
  return WidgetsApp(
    color: theme.colors.primary,
    debugShowCheckedModeBanner: false,
    builder: (BuildContext context, Widget? _) => MediaQuery(
      data: MediaQuery.of(context).copyWith(disableAnimations: disableAnimations),
      child: TanreiTheme(
        data: theme,
        child: ColoredBox(
          color: theme.colors.surface,
          // Stands in for a route's focus scope so Tab traversal has a starting point.
          child: FocusScope(autofocus: true, child: Center(child: child)),
        ),
      ),
    ),
  );
}
