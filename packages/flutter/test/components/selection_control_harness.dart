import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

// What the checkbox, radio button and switch suites share: finders into a selection control, a
// mouse that hovers it, and the reads of what it draws.

/// The round state layer (`container`) of the only selection control on screen.
TanreiStateLayer stateLayer(WidgetTester tester) =>
    tester.widget<TanreiStateLayer>(find.byType(TanreiStateLayer));

/// Its decoration.
TanreiContainerDecoration stateLayerDecoration(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find.descendant(
                of: find.byType(TanreiStateLayer),
                matching: find.byType(DecoratedBox),
              ),
            )
            .decoration
        as TanreiContainerDecoration;

/// The container color drawn (transparent: nothing).
Color stateLayerColor(WidgetTester tester) => stateLayer(tester).color;

/// The whole-control opacity of the state.
double selectionOpacity(WidgetTester tester, Type control) => tester
    .widget<Opacity>(find.descendant(of: find.byType(control), matching: find.byType(Opacity)))
    .opacity;

/// The visible label's text widget (the `Flexible` of the layout's row holds only the label; an
/// icon's glyph is a `Text` too).
Finder visibleLabel(Type control) => find.descendant(
  of: find.descendant(of: find.byType(control), matching: find.byType(Flexible)),
  matching: find.byType(Text),
);

/// The visible label's style.
TextStyle labelStyle(WidgetTester tester, Type control) =>
    tester.widget<Text>(visibleLabel(control)).style!;

/// Whether the focus indicator shows.
bool focusRingShown(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

/// The painter of type [P] the control draws with.
P painterOf<P extends CustomPainter>(WidgetTester tester) =>
    tester
            .widget<CustomPaint>(
              find.byWidgetPredicate((Widget w) => w is CustomPaint && w.painter is P),
            )
            .painter!
        as P;

/// A mouse over the center of [finder], in the traditional highlight mode (hover needs it).
Future<TestGesture> hoverOver(WidgetTester tester, Finder finder) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(finder));
  await tester.pumpAndSettle();
  return mouse;
}

/// Semantics flags of the node of the tap target.
SemanticsData semanticsOfTarget(WidgetTester tester) =>
    tester.getSemantics(find.byType(TanreiTapTarget)).getSemanticsData();

/// Runs [body] with [platform] as the target platform, restoring it after.
Future<void> onPlatform(TargetPlatform platform, Future<void> Function() body) async {
  debugDefaultTargetPlatformOverride = platform;
  try {
    await body();
  } finally {
    debugDefaultTargetPlatformOverride = null;
  }
}
