import 'dart:ui' show PointerDeviceKind;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/tone_per_state_expected.g.dart';
import '../../test_fixtures/tone_per_state_system.g.dart';
import '../harness.dart';

/// A component color that differs per scheme (IR paint kind `scheme`), end to end:
/// `test_fixtures/tone_per_state_system.g.dart` is what
/// the Dart emitter writes for `packages/tokens-build/test/fixtures/tone-per-state.system.json`, a
/// layer that puts a NON-MONOTONIC `tone` rule on two states of the filled Button. What the token
/// bundle says those colors are, per scheme, is in `tone_per_state_expected.g.dart` — read from the
/// resolved tokens, not from the emitter. Regenerate both with
/// `node packages/flutter/tool/generate_acme_fixture.mjs` (repository root).
void main() {
  const List<(Brightness, TanreiContrast)> themes = <(Brightness, TanreiContrast)>[
    (Brightness.light, TanreiContrast.standard),
    (Brightness.light, TanreiContrast.medium),
    (Brightness.light, TanreiContrast.high),
    (Brightness.dark, TanreiContrast.standard),
    (Brightness.dark, TanreiContrast.medium),
    (Brightness.dark, TanreiContrast.high),
  ];

  TanreiContainerDecoration containerDecoration(WidgetTester tester) {
    final DecoratedBox box = tester.widget(
      find.descendant(of: find.byType(TanreiFocusRing), matching: find.byType(DecoratedBox)).first,
    );
    return box.decoration as TanreiContainerDecoration;
  }

  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  test('the premise: the two state colors are per-scheme paints, not monotonic, and nothing '
      'else is', () {
    final TanreiButtonVariantTokens filled = tonePerStateSystem.button.variants.filled;
    expect(filled.hovered.containerColor, isA<TanreiSchemePaint>());
    expect(filled.pressed.containerColor, isA<TanreiSchemePaint>());
    expect(filled.enabled.containerColor, isA<TanreiRolePaint>());
    expect(filled.focused.containerColor, isNot(isA<TanreiSchemePaint>()));
    expect(tanreiSystem.button.variants.filled.pressed.containerColor, isA<TanreiMixPaint>());

    // Light gets darker with contrast (tones 20, 15, 10) while dark stays (90): no single rule of
    // "more contrast = further from the surface" reproduces it, and light ≠ dark.
    final Map<String, Color> pressed = <String, Color>{
      for (final MapEntry<String, Map<String, Color>> e in tonePerStateExpected.entries)
        e.key: e.value['pressed']!,
    };
    expect(pressed.keys, TanreiScheme.values.map((TanreiScheme s) => s.name));
    expect(<Color>{
      pressed['light']!,
      pressed['lightMedium']!,
      pressed['lightHigh']!,
    }, hasLength(3));
    expect(<Color>{pressed['dark']!, pressed['darkMedium']!, pressed['darkHigh']!}, hasLength(1));
    expect(pressed['light'], isNot(pressed['dark']));
  });

  test('the theme evaluates them to what the token bundle says, in all six schemes', () {
    final TanreiButtonVariantTokens filled = tonePerStateSystem.button.variants.filled;
    for (final (Brightness brightness, TanreiContrast contrast) in themes) {
      final TanreiThemeData theme = TanreiThemeData(
        system: tonePerStateSystem,
        brightness: brightness,
        contrast: contrast,
      );
      final Map<String, Color> expected = tonePerStateExpected[theme.scheme.name]!;
      expect(theme.paint(filled.hovered.containerColor), expected['hovered'], reason: '$theme');
      expect(theme.paint(filled.pressed.containerColor), expected['pressed'], reason: '$theme');
      // Without the theme, the colors themselves say which scheme they are.
      expect(filled.pressed.containerColor.resolve(theme.colors), expected['pressed']);
    }
  });

  for (final (Brightness brightness, TanreiContrast contrast) in themes) {
    testWidgets('a filled TanreiButton draws the hovered and the pressed container of its scheme: '
        '${brightness.name} / ${contrast.name}', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiThemeData theme = TanreiThemeData(
        system: tonePerStateSystem,
        brightness: brightness,
        contrast: contrast,
      );
      final Map<String, Color> expected = tonePerStateExpected[theme.scheme.name]!;
      await tester.pumpWidget(
        tanreiTestApp(
          TanreiButton(onPressed: () {}, child: const Text('Deploy')),
          theme: theme,
        ),
      );
      expect(
        containerDecoration(tester).color,
        theme.colors[const TanreiColorRole('brand')],
        reason: 'at rest: the role',
      );

      final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(tester.getCenter(find.byType(TanreiButton)));
      await tester.pumpAndSettle();
      expect(containerDecoration(tester).color, expected['hovered']);

      // The default system answers a press with `overlay`: the pressed container at once.
      await mouse.down(tester.getCenter(find.byType(TanreiButton)));
      await tester.pump();
      expect(containerDecoration(tester).color, expected['pressed']);
      await mouse.up();
      await tester.pumpAndSettle(const Duration(milliseconds: 50));
    });
  }

  testWidgets('changing the scheme under a pressed button re-evaluates the paint', (
    WidgetTester tester,
  ) async {
    Widget app(Brightness brightness) => tanreiTestApp(
      TanreiButton(onPressed: () {}, child: const Text('Deploy')),
      theme: TanreiThemeData(system: tonePerStateSystem, brightness: brightness),
    );
    await tester.pumpWidget(app(Brightness.light));
    final TestGesture touch = await tester.startGesture(
      tester.getCenter(find.byType(TanreiButton)),
    );
    await tester.pump();
    expect(containerDecoration(tester).color, tonePerStateExpected['light']!['pressed']);
    await tester.pumpWidget(app(Brightness.dark));
    await tester.pump();
    expect(containerDecoration(tester).color, tonePerStateExpected['dark']!['pressed']);
    await touch.up();
    await tester.pumpAndSettle(const Duration(milliseconds: 50));
  });
}
