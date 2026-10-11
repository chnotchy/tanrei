import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';

// The capture every Flutter baseline uses (as `expectIconButtonGolden`), for components whose
// fixtures are drawn from a builder: a spec's fixtures, the golden, and the pixels of a widget.

/// The fixtures of `specs/<name>.spec.json`, read in place so the two cannot drift apart.
List<Map<String, dynamic>> specFixtures(String name) {
  final Map<String, dynamic> spec =
      jsonDecode(File('../../specs/$name.spec.json').readAsStringSync()) as Map<String, dynamic>;
  return (spec['fixtures'] as List<dynamic>).cast<Map<String, dynamic>>();
}

/// The widgets a fixture puts into [slot] of `specs/<component>.spec.json`: each of the
/// fixture's strings for that slot, drawn as the slot's `fixture` kind says — `glyph`: the glyph
/// (a Material Symbols code point from [glyphs], else the name) as text, for the component's icon
/// helper to draw; `icon-only-button`: a standard Tanrei icon button showing that glyph, labelled by its
/// name; `button`: a text-variant Tanrei Button with that label; `text`: plain text. Empty when the
/// fixture does not fill the slot.
List<Widget> fixtureSlot(
  String component,
  Map<String, dynamic> fixture,
  String slot, {
  Map<String, int> glyphs = const <String, int>{},
}) {
  final Map<String, dynamic> spec =
      jsonDecode(File('../../specs/$component.spec.json').readAsStringSync())
          as Map<String, dynamic>;
  final String? kind =
      ((spec['slots'] as List<dynamic>? ?? const <dynamic>[]).cast<Map<String, dynamic>>())
              .where((Map<String, dynamic> s) => s['name'] == slot)
              .firstOrNull?['fixture']
          as String?;
  final List<String> values = switch ((fixture['slots'] as Map<String, dynamic>?)?[slot]) {
    final String one => <String>[one],
    final List<dynamic> many => many.cast<String>(),
    _ => const <String>[],
  };
  Widget glyph(String name) =>
      Text(glyphs[name] == null ? name : String.fromCharCode(glyphs[name]!));
  return <Widget>[
    for (final String value in values)
      switch (kind) {
        'glyph' => glyph(value),
        'icon-only-button' => TanreiIconButton(
          onPressed: () {},
          icon: glyph(value),
          semanticLabel: value,
        ),
        'button' => TanreiButton(
          variant: TanreiButtonVariant.text,
          onPressed: () {},
          child: Text(value),
        ),
        _ => Text(value),
      },
  ];
}

/// The logical surface of every baseline, captured at 2x.
const Size goldenSurface = Size(160, 80);

/// The wider surface of a control with a visible label (checkbox, radio button, switch): the
/// longest fixture label of the three (`I accept the terms`) fits on one line beside the control
/// in every shipped system.
const Size labelledGoldenSurface = Size(320, 80);
const double goldenPixelRatio = 2;

/// Renders [child] on the light surface of [system], [surface] logical pixels at 2x (default
/// [goldenSurface]), inside a `space200` padding and centered (the frame of every Flutter
/// baseline), and compares it with [file]. [disableAnimations] records the reduced-motion form (a
/// looping animation's fixtures). [settle] pumps one more frame (no time passes) before the
/// capture, for a component that corrects itself after its first frame, such as a tab row that
/// scrolls its selected tab into view once it has been laid out (TAB-15).
Future<void> expectFixtureGolden(
  WidgetTester tester, {
  required TanreiSystem system,
  required Widget child,
  required String file,
  bool disableAnimations = false,
  Size surface = goldenSurface,
  bool settle = false,
}) async {
  final GlobalKey boundaryKey = await pumpFixtureFrame(
    tester,
    system: system,
    child: child,
    disableAnimations: disableAnimations,
    surface: surface,
  );
  if (settle) {
    await tester.pump();
  }
  final RenderRepaintBoundary boundary =
      boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final ui.Image image = (await tester.runAsync(
    () => boundary.toImage(pixelRatio: goldenPixelRatio),
  ))!;
  addTearDown(image.dispose);
  await expectLater(image, matchesGoldenFile(file));
}

/// Pumps [child] in the frame of [expectFixtureGolden] and returns the key of its boundary.
Future<GlobalKey> pumpFixtureFrame(
  WidgetTester tester, {
  required TanreiSystem system,
  required Widget child,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  Size surface = goldenSurface,
}) async {
  tester.view.devicePixelRatio = goldenPixelRatio;
  tester.view.physicalSize = surface * goldenPixelRatio;
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
            child: Directionality(
              textDirection: textDirection,
              child: Padding(
                padding: EdgeInsets.all(system.space.space200),
                child: Center(child: child),
              ),
            ),
          ),
        ),
      ),
      theme: theme,
      disableAnimations: disableAnimations,
    ),
  );
  return boundaryKey;
}

/// The RGBA pixels of the fixture frame of [child], [goldenSurface] at 2x, row by row.
class FramePixels {
  FramePixels(this.bytes, this.width);

  final Uint8List bytes;
  final int width;

  /// The color of the device pixel at ([x], [y]).
  Color at(int x, int y) {
    final int i = (y * width + x) * 4;
    return Color.fromARGB(bytes[i + 3], bytes[i], bytes[i + 1], bytes[i + 2]);
  }

  /// The color at the logical point [p] (the device pixel whose top-left corner it is).
  Color atLogical(Offset p) =>
      at((p.dx * goldenPixelRatio).floor(), (p.dy * goldenPixelRatio).floor());

  @override
  bool operator ==(Object other) =>
      other is FramePixels && other.width == width && listEquals(other.bytes, bytes);

  @override
  int get hashCode => Object.hash(width, bytes.length);
}

/// Captures the fixture frame of [child] (see [pumpFixtureFrame]).
Future<FramePixels> framePixels(
  WidgetTester tester, {
  required TanreiSystem system,
  required Widget child,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  Size surface = goldenSurface,
}) async {
  final GlobalKey boundaryKey = await pumpFixtureFrame(
    tester,
    system: system,
    child: child,
    disableAnimations: disableAnimations,
    textDirection: textDirection,
    surface: surface,
  );
  return captureFrame(tester, boundaryKey);
}

/// The pixels under [boundaryKey] now, at 2x.
Future<FramePixels> captureFrame(WidgetTester tester, GlobalKey boundaryKey) async {
  final RenderRepaintBoundary boundary =
      boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  return (await tester.runAsync(() async {
    final ui.Image image = await boundary.toImage(pixelRatio: goldenPixelRatio);
    final ByteData data = (await image.toByteData())!;
    final FramePixels pixels = FramePixels(data.buffer.asUint8List(), image.width);
    image.dispose();
    return pixels;
  }))!;
}

/// Collects what the lookups report instead of failing the test, and restores the reporter.
List<String> collectUnknownValues() {
  final List<String> reports = <String>[];
  final TanreiUnknownValueReporter previous = debugTanreiReportUnknownValue;
  debugTanreiReportUnknownValue = (String kind, String key, String fallback) =>
      reports.add('$kind "$key" -> $fallback');
  addTearDown(() => debugTanreiReportUnknownValue = previous);
  return reports;
}

/// Collects the components reported without an accessible name, and restores the reporter.
List<String> collectMissingNames() {
  final List<String> reports = <String>[];
  final TanreiMissingNameReporter previous = debugTanreiReportMissingName;
  debugTanreiReportMissingName = (String component, Widget widget) => reports.add(component);
  addTearDown(() => debugTanreiReportMissingName = previous);
  return reports;
}

/// WCAG 2.2 contrast ratio of two opaque colors.
double contrastOf(Color a, Color b) {
  final double la = a.computeLuminance();
  final double lb = b.computeLuminance();
  return (la > lb ? la + 0.05 : lb + 0.05) / (la > lb ? lb + 0.05 : la + 0.05);
}

/// Whether [a] and [b] differ by at most [tolerance] in every channel: a composite rasterized by
/// the engine rounds differently from `Color.alphaBlend`.
bool nearColor(Color a, Color b, {double tolerance = 1.5 / 255}) =>
    (a.a - b.a).abs() <= tolerance &&
    (a.r - b.r).abs() <= tolerance &&
    (a.g - b.g).abs() <= tolerance &&
    (a.b - b.b).abs() <= tolerance;

/// Matches a color [nearColor] to [expected].
Matcher looksLike(Color expected) => isSameColorAs(expected, threshold: 1.5 / 255);
