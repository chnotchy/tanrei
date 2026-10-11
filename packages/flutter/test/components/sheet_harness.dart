import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

// What the bottom sheet and side sheet tests share: the app around a sheet and its page, and the
// focus helpers.

/// A navigator app (so the platform's back reaches the page's route) around [child], with the
/// given insets, keyboard, text scale and direction.
Widget sheetApp(
  Widget child, {
  TanreiThemeData theme = TanreiThemeData.light,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  EdgeInsets viewInsets = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
}) => WidgetsApp(
  color: theme.colors.primary,
  debugShowCheckedModeBanner: false,
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) => PageRouteBuilder<T>(
    settings: settings,
    pageBuilder: (BuildContext context, _, _) => builder(context),
  ),
  home: Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(
        padding: padding,
        viewInsets: viewInsets,
        textScaler: textScaler,
        disableAnimations: disableAnimations,
      ),
      child: Directionality(
        textDirection: textDirection,
        child: TanreiTheme(
          data: theme,
          child: ColoredBox(color: theme.colors.surface, child: child),
        ),
      ),
    ),
  ),
);

/// Pumps [app] in a [window] at a device pixel ratio of 1, settled.
Future<void> pumpInWindow(WidgetTester tester, Widget app, Size window) async {
  tester.view.physicalSize = window;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(app);
  await tester.pumpAndSettle();
}

/// Whether the primary focus is inside a widget of type [T] (the sheet).
bool focusInside<T extends Widget>() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return false;
  }
  bool inside = context.widget is T;
  context.visitAncestorElements((Element element) {
    if (element.widget is T) {
      inside = true;
      return false;
    }
    return true;
  });
  return inside;
}

String focusedLabel() {
  final BuildContext? context = FocusManager.instance.primaryFocus?.context;
  if (context == null) {
    return '';
  }
  String? found;
  context.visitAncestorElements((Element element) {
    final Widget widget = element.widget;
    if (widget is Semantics &&
        widget.properties.button == true &&
        widget.properties.label != null) {
      found = widget.properties.label;
      return false;
    }
    if (widget is TanreiButton) {
      found = ((widget.child as Text?)?.data);
      return false;
    }
    return true;
  });
  return found ?? '';
}

Future<void> tabTimes(WidgetTester tester, int times, {bool shift = false}) async {
  for (int i = 0; i < times; i++) {
    if (shift) {
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shift);
    }
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    if (shift) {
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shift);
    }
    await tester.pump();
  }
}
