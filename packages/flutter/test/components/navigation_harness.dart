import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';

// What the navigation bar, rail and drawer tests share: the fixtures' glyphs, the app around a
// region, and the semantics and report helpers.

/// The fixtures' glyphs, as Material Symbols code points (drawn as text by the icon helper).
const Map<String, int> navigationIconCodePoints = <String, int>{
  'inbox': 0xe156,
  'send': 0xe163,
  'star': 0xe838,
  'settings': 0xe8b8,
  'home': 0xe88a,
  'search': 0xe8b6,
  'person': 0xe7fd,
  'explore': 0xe87a,
  'add_circle': 0xe147,
  'video_library': 0xe04a,
  'chat': 0xe0b7,
  'menu': 0xe5d2,
  'edit': 0xe3c9,
  'drafts': 0xe151,
  'draft': 0xe66d,
  'delete': 0xe872,
  'label': 0xe892,
  'folder': 0xe2c7,
  'group': 0xe7ef,
  'schedule': 0xe8b5,
};

/// A fixture's glyph name as the string a destination draws: its code point, or the name itself
/// (a ligature) when the table does not have it; empty stays empty.
String navigationGlyph(String? name) => name == null || name.isEmpty
    ? ''
    : navigationIconCodePoints[name] == null
    ? name
    : String.fromCharCode(navigationIconCodePoints[name]!);

/// [child] in the test app with the given system insets, text scale and direction, [width] wide
/// (and [height] high, when given).
Widget navigationApp(
  Widget child, {
  TanreiThemeData theme = TanreiThemeData.light,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  EdgeInsets padding = EdgeInsets.zero,
  TextScaler textScaler = TextScaler.noScaling,
  double? width,
  double? height,
}) => tanreiTestApp(
  Builder(
    builder: (BuildContext context) => MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: padding, textScaler: textScaler),
      child: Directionality(
        textDirection: textDirection,
        child: SizedBox(width: width, height: height, child: child),
      ),
    ),
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

/// Moves a mouse over [finder] (traditional highlight mode, so hover is reported).
Future<TestGesture> hoverOver(WidgetTester tester, Finder finder) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(finder));
  await tester.pumpAndSettle();
  return mouse;
}

SemanticsNode semanticsRoot(WidgetTester tester) =>
    tester.renderObject(find.byType(WidgetsApp)).owner!.semanticsOwner!.rootSemanticsNode!;

/// Every semantics node below [node], depth first, [node] included.
List<SemanticsNode> nodesBelow(SemanticsNode node) {
  final List<SemanticsNode> found = <SemanticsNode>[];
  void visit(SemanticsNode n) {
    found.add(n);
    n.visitChildren((SemanticsNode child) {
      visit(child);
      return true;
    });
  }

  visit(node);
  return found;
}

/// The data of every node below the root with [role].
List<SemanticsData> nodesWithRole(WidgetTester tester, SemanticsRole role) => <SemanticsData>[
  for (final SemanticsNode node in nodesBelow(semanticsRoot(tester)))
    if (node.getSemanticsData().role == role) node.getSemanticsData(),
];

/// Collects what a component reports as ignored, and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

/// The navigation destination (bar or rail) labelled [label].
Finder destinationOf(String label) =>
    find.byWidgetPredicate((Widget w) => w is TanreiNavigationItem && w.label == label).first;

/// The item container of the destination labelled [label].
Finder itemContainerOf(String label) => find
    .descendant(
      of: destinationOf(label),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration itemDecorationOf(WidgetTester tester, String label) =>
    tester.widget<DecoratedBox>(itemContainerOf(label)).decoration as TanreiContainerDecoration;

/// The item container's fill (transparent for none).
Color itemFillOf(WidgetTester tester, String label) =>
    itemDecorationOf(tester, label).color ?? const Color(0x00000000);

TanreiControlIcon itemIconOf(WidgetTester tester, String label) => tester.widget<TanreiControlIcon>(
  find.descendant(of: destinationOf(label), matching: find.byType(TanreiControlIcon)),
);

/// The drawn label's text style; null when it is not drawn.
TextStyle? itemLabelStyleOf(WidgetTester tester, String label) {
  final Finder text = find.descendant(of: destinationOf(label), matching: find.text(label));
  if (text.evaluate().isEmpty) {
    return null;
  }
  return tester
      .widget<RichText>(find.descendant(of: text, matching: find.byType(RichText)))
      .text
      .style;
}

/// The opacity of the whole destination (its state's).
double itemOpacityOf(WidgetTester tester, String label) => tester
    .widget<Opacity>(
      find.descendant(of: destinationOf(label), matching: find.byType(Opacity)).first,
    )
    .opacity;

bool itemRingVisible(WidgetTester tester, String label) => tester
    .widget<TanreiFocusRing>(
      find.descendant(of: destinationOf(label), matching: find.byType(TanreiFocusRing)),
    )
    .visible;
