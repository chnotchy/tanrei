import 'dart:ui' as ui;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';

// What the icon-button suites share: the icon, finders into the widget, and the golden capture.

/// The `favorite` glyph of Material Symbols. Icon names belong to the product; the tests draw the
/// glyph as text so that it takes the family of the theme (with the Flutter test font it is a box).
const String favoriteGlyph = '\u{e87d}';
const Widget favorite = Text(favoriteGlyph);

/// What the pre-paint implementation drew: [layer] at [opacity] composited over [container].
Color overlaid(Color container, Color layer, double opacity) =>
    Color.alphaBlend(layer.withValues(alpha: layer.a * opacity), container);

Widget iconButton({
  VoidCallback? onPressed,
  bool enabled = true,
  bool? isSelected,
  TanreiIconButtonVariant variant = TanreiIconButtonVariant.standard,
  TanreiIconButtonSize size = TanreiIconButtonSize.medium,
  String semanticLabel = 'Favorite',
  FocusNode? focusNode,
  bool autofocus = false,
  Widget icon = favorite,
  Key? key,
}) => TanreiIconButton(
  key: key,
  onPressed: enabled ? (onPressed ?? () {}) : null,
  isSelected: isSelected,
  variant: variant,
  size: size,
  semanticLabel: semanticLabel,
  focusNode: focusNode,
  autofocus: autofocus,
  icon: icon,
);

/// The visual container (the first box inside the focus ring).
Finder get iconButtonContainerBox =>
    find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first;

/// The whole-control opacity the current state applies.
double controlOpacity(WidgetTester tester) => tester
    .widget<Opacity>(
      find.descendant(of: find.byType(TanreiIconButton), matching: find.byType(Opacity)),
    )
    .opacity;

/// The decoration of the visual container (the first box inside the focus ring).
TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(iconButtonContainerBox).decoration as TanreiContainerDecoration;

Size containerSize(WidgetTester tester) => tester.getSize(iconButtonContainerBox);

/// The container color drawn (a `none` paint draws nothing: null).
Color containerColor(WidgetTester tester) =>
    containerDecoration(tester).color ?? const Color(0x00000000);

/// The outline drawn (none: transparent).
Color outlineColor(WidgetTester tester) {
  return containerDecoration(tester).border?.top.color ?? const Color(0x00000000);
}

/// The text style the glyph is drawn with (the family, fill and color of the icon).
TextStyle glyphStyle(WidgetTester tester) =>
    DefaultTextStyle.of(tester.element(find.text(favoriteGlyph))).style;

Color iconColor(WidgetTester tester) => glyphStyle(tester).color!;

IconThemeData iconTheme(WidgetTester tester) =>
    IconTheme.of(tester.element(find.text(favoriteGlyph)));

bool focusRingVisible(WidgetTester tester) =>
    tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible;

Future<TestGesture> hover(WidgetTester tester) async {
  FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(find.byType(TanreiIconButton)));
  await tester.pumpAndSettle();
  return mouse;
}

/// The three looks of a variant (ICB-12): a plain button, a toggle that is off, one that is on.
const Map<String, bool?> looks = <String, bool?>{
  'plain': null,
  'unselected': false,
  'selected': true,
};

/// The container / icon / outline paints of the look [isSelected] in [tokens].
({TanreiPaint container, TanreiPaint icon, TanreiPaint outline}) partsOf(
  TanreiIconButtonVariantStateTokens tokens,
  bool? isSelected,
) => switch (isSelected) {
  null => (container: tokens.containerColor, icon: tokens.iconColor, outline: tokens.outlineColor),
  false => (
    container: tokens.unselectedContainerColor,
    icon: tokens.unselectedIconColor,
    outline: tokens.unselectedOutlineColor,
  ),
  true => (
    container: tokens.selectedContainerColor,
    icon: tokens.selectedIconColor,
    outline: tokens.selectedOutlineColor,
  ),
};

/// Collects what the lookups report instead of failing the test, and restores the reporter.
List<String> collectUnknownValueReports() {
  final List<String> reports = <String>[];
  final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
  debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
      reports.add('$kind "$key" -> $fallback');
  addTearDown(() => debugTanreiReportUnknownValue = previous);
  return reports;
}

/// Collects the controls reported without an accessible name, and restores the reporter.
List<String> collectMissingNameReports() {
  final List<String> reports = <String>[];
  final TanreiMissingNameReporter previous = debugTanreiReportMissingName;
  debugTanreiReportMissingName = (String component, Widget widget) => reports.add(component);
  addTearDown(() => debugTanreiReportMissingName = previous);
  return reports;
}

/// WCAG 2.2 contrast ratio of two opaque colors.
double contrastRatio(Color a, Color b) {
  final double la = a.computeLuminance();
  final double lb = b.computeLuminance();
  return (la > lb ? la + 0.05 : lb + 0.05) / (la > lb ? lb + 0.05 : la + 0.05);
}

/// WCAG 2.2 success criterion 1.4.11 (non-text contrast): a graphical object needs 3:1.
const double nonTextContrastMinimum = 3;

/// Renders the icon button of a spec fixture's [props] on the light surface of [system], 160 x 80
/// logical pixels at 2x (the capture of every Flutter baseline), and compares it with [file].
Future<void> expectIconButtonGolden(
  WidgetTester tester, {
  required TanreiSystem system,
  required Map<String, dynamic> props,
  required String file,
}) async {
  const double pixelRatio = 2;
  const Size surface = Size(160, 80);
  tester.view.devicePixelRatio = pixelRatio;
  tester.view.physicalSize = surface * pixelRatio;
  addTearDown(tester.view.reset);

  final GlobalKey boundaryKey = GlobalKey();
  final TanreiThemeData theme = TanreiThemeData(system: system);
  await tester.pumpWidget(
    tanreiTestApp(
      RepaintBoundary(
        key: boundaryKey,
        child: ColoredBox(
          color: theme.colors.surface,
          child: SizedBox.fromSize(
            size: surface,
            child: Padding(
              padding: EdgeInsets.all(system.space.space200),
              child: Center(
                child: TanreiIconButton(
                  onPressed: props['disabled'] == true ? null : () {},
                  isSelected: props['toggle'] == true ? props['selected'] == true : null,
                  variant: TanreiIconButtonVariant(props['variant'] as String? ?? 'standard'),
                  size: TanreiIconButtonSize(props['size'] as String? ?? 'medium'),
                  semanticLabel: props['label'] as String,
                  icon: favorite,
                ),
              ),
            ),
          ),
        ),
      ),
      theme: theme,
    ),
  );

  final RenderRepaintBoundary boundary =
      boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final ui.Image image = (await tester.runAsync(() => boundary.toImage(pixelRatio: pixelRatio)))!;
  addTearDown(image.dispose);
  await expectLater(image, matchesGoldenFile(file));
}
