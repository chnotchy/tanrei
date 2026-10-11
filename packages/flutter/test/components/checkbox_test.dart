import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';
import 'selection_control_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiCheckboxTokens tokens = system.checkbox;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// A checkbox with the given props; [onChanged] defaults to a no-op unless [enabled] is false.
Widget checkbox({
  bool? value = false,
  bool tristate = false,
  bool isError = false,
  bool enabled = true,
  ValueChanged<bool>? onChanged,
  String label = 'Email me updates',
  bool labelHidden = false,
  FocusNode? focusNode,
  bool autofocus = false,
  Key? key,
}) => TanreiCheckbox(
  key: key,
  value: value,
  tristate: tristate,
  isError: isError,
  onChanged: enabled ? (onChanged ?? (_) {}) : null,
  label: label,
  labelHidden: labelHidden,
  focusNode: focusNode,
  autofocus: autofocus,
);

/// The checkbox of a spec fixture's [props].
Widget checkboxOf(Map<String, dynamic> props) => TanreiCheckbox(
  value: props['indeterminate'] == true ? null : props['checked'] == true,
  tristate: props['indeterminate'] == true,
  isError: props['error'] == true,
  onChanged: props['disabled'] == true ? null : (_) {},
  label: props['label'] as String? ?? '',
  labelHidden: props['labelHidden'] == true,
);

/// An owner that keeps the value, as a product does.
class Owner extends StatefulWidget {
  const Owner({super.key, required this.initial, required this.changes, this.tristate = false});

  final bool? initial;
  final List<bool> changes;
  final bool tristate;

  @override
  State<Owner> createState() => _OwnerState();
}

class _OwnerState extends State<Owner> {
  late bool? value = widget.initial;

  @override
  Widget build(BuildContext context) => checkbox(
    value: value,
    tristate: widget.tristate,
    onChanged: (bool next) => setState(() {
      widget.changes.add(next);
      value = next;
    }),
  );
}

TanreiCheckboxPainter box(WidgetTester tester) => painterOf<TanreiCheckboxPainter>(tester);

Finder get boxFinder =>
    find.byWidgetPredicate((Widget w) => w is CustomPaint && w.painter is TanreiCheckboxPainter);

/// Expects the parts drawn to be [state]'s tokens in [theme] (container aside).
void expectParts(
  WidgetTester tester,
  TanreiThemeData theme,
  TanreiCheckboxConditionStateTokens state, {
  String? reason,
}) {
  expect(box(tester).fill, theme.paint(state.boxColor), reason: reason);
  expect(box(tester).outline, theme.paint(state.outlineColor), reason: reason);
  expect(box(tester).mark, theme.paint(state.markColor), reason: reason);
  if (visibleLabel(TanreiCheckbox).evaluate().isNotEmpty) {
    expect(labelStyle(tester, TanreiCheckbox).color, theme.paint(state.labelColor), reason: reason);
  }
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('activation', () {
    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets('CHK-1: a ${kind.name} tap switches checked and emits change once with the new '
          'value', (WidgetTester tester) async {
        final List<bool> changes = <bool>[];
        await tester.pumpWidget(tanreiTestApp(Owner(initial: false, changes: changes)));
        await tester.tap(find.byType(TanreiCheckbox), kind: kind);
        await tester.pumpAndSettle();
        expect(changes, <bool>[true]);
        await tester.tap(find.byType(TanreiCheckbox), kind: kind);
        await tester.pumpAndSettle();
        expect(changes, <bool>[true, false]);
      });
    }

    testWidgets('CHK-1: a press on the visible label switches it', (WidgetTester tester) async {
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(Owner(initial: false, changes: changes)));
      await tester.tap(find.text('Email me updates'));
      await tester.pumpAndSettle();
      expect(changes, <bool>[true]);
    });

    testWidgets('CHK-1: Space switches it exactly once', (WidgetTester tester) async {
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(Owner(initial: false, changes: changes)));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(changes, <bool>[true]);
    });

    testWidgets('CHK-1: Enter switches it on Android, where any focused control activates with '
        'Enter', (WidgetTester tester) async {
      await onPlatform(TargetPlatform.android, () async {
        final List<bool> changes = <bool>[];
        await tester.pumpWidget(tanreiTestApp(Owner(initial: false, changes: changes)));
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        expect(changes, <bool>[true]);
      });
    });

    for (final TargetPlatform platform in <TargetPlatform>[
      TargetPlatform.iOS,
      TargetPlatform.macOS,
      TargetPlatform.windows,
      TargetPlatform.linux,
    ]) {
      testWidgets('CHK-1: Enter does not switch it on ${platform.name}, even through the app\'s '
          'ActivateIntent shortcut; Space does', (WidgetTester tester) async {
        await onPlatform(platform, () async {
          final List<bool> changes = <bool>[];
          await tester.pumpWidget(tanreiTestApp(Owner(initial: false, changes: changes)));
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.sendKeyEvent(LogicalKeyboardKey.enter);
          await tester.pumpAndSettle();
          expect(changes, isEmpty);
          await tester.sendKeyEvent(LogicalKeyboardKey.space);
          await tester.pumpAndSettle();
          expect(changes, <bool>[true]);
        });
      });
    }

    test('CHK-1: the keys that switch it — Space everywhere, Enter only on Android and never on '
        'the web', () {
      const TanreiToggleIntent toggle = TanreiToggleIntent();
      const SingleActivator enter = SingleActivator(LogicalKeyboardKey.enter);
      const SingleActivator space = SingleActivator(LogicalKeyboardKey.space);
      expect(tanreiToggleShortcuts(platform: TargetPlatform.android, web: false)[enter], toggle);
      expect(
        tanreiToggleShortcuts(platform: TargetPlatform.android, web: true),
        isNot(contains(enter)),
      );
      expect(
        tanreiToggleShortcuts(platform: TargetPlatform.iOS, web: false),
        isNot(contains(enter)),
      );
      for (final TargetPlatform platform in TargetPlatform.values) {
        for (final bool web in <bool>[false, true]) {
          expect(tanreiToggleShortcuts(platform: platform, web: web)[space], toggle);
        }
      }
    });

    testWidgets('CHK-1: keyboard activation works without an app-level Shortcuts widget', (
      WidgetTester tester,
    ) async {
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Center(child: checkbox(autofocus: true, onChanged: changes.add)),
          ),
        ),
      );
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      expect(changes, <bool>[true]);
      await tester.pumpAndSettle();
    });

    testWidgets('CHK-1: the semantic tap of assistive technology switches it once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(Owner(initial: true, changes: changes)));
      tester.semantics.tap(find.semantics.byLabel('Email me updates'));
      await tester.pumpAndSettle();
      expect(changes, <bool>[false]);
      handle.dispose();
    });

    testWidgets('CHK-2: activating an indeterminate checkbox checks it and emits true — by '
        'pointer, keyboard and assistive technology', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final Future<void> Function() activate in <Future<void> Function()>[
        () => tester.tap(find.byType(TanreiCheckbox)),
        () async {
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.sendKeyEvent(LogicalKeyboardKey.space);
        },
        () async => tester.semantics.tap(find.semantics.byLabel('Email me updates')),
      ]) {
        final List<bool> changes = <bool>[];
        await tester.pumpWidget(
          tanreiTestApp(Owner(key: UniqueKey(), initial: null, tristate: true, changes: changes)),
        );
        await activate();
        await tester.pumpAndSettle();
        expect(changes, <bool>[true]);
        // Now checked: the next activation clears it (it never goes back to indeterminate).
        await tester.tap(find.byType(TanreiCheckbox));
        await tester.pumpAndSettle();
        expect(changes, <bool>[true, false]);
      }
      handle.dispose();
    });
  });

  group('disabled', () {
    testWidgets('CHK-3: a null onChanged does not change or emit, is not focusable, ignores its '
        'label and is exposed as disabled', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(checkbox(enabled: false, focusNode: focusNode)));
      await tester.tap(find.byType(TanreiCheckbox));
      await tester.tap(find.text('Email me updates'));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Email me updates',
          hasCheckedState: true,
          isChecked: false,
          hasEnabledState: true,
          isEnabled: false,
          isFocusable: false,
          hasTapAction: false,
          hasFocusAction: false,
        ),
      );
      handle.dispose();
    });

    testWidgets('CHK-3: disabling a focused checkbox removes it from the focus order and stops '
        'every activation', (WidgetTester tester) async {
      final List<bool> changes = <bool>[];
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool enabled}) =>
          tanreiTestApp(checkbox(enabled: enabled, onChanged: changes.add, focusNode: focusNode));
      await tester.pumpWidget(build(enabled: true));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);
      await tester.pumpWidget(build(enabled: false));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
      await tester.tap(find.byType(TanreiCheckbox));
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(changes, isEmpty);
    });

    for (final TanreiCheckboxCondition condition in TanreiCheckboxCondition.core) {
      testWidgets('CHK-8: disabled ${condition.name} draws container, box, mark, outline, label '
          'and opacity from its disabled tokens', (WidgetTester tester) async {
        final bool indeterminate = condition.name.endsWith('indeterminate');
        await tester.pumpWidget(
          tanreiTestApp(
            checkbox(
              enabled: false,
              tristate: indeterminate,
              value: indeterminate
                  ? null
                  : condition.name.endsWith('-selected') || condition.name == 'selected',
              isError: condition.name.startsWith('error-'),
            ),
          ),
        );
        final TanreiCheckboxConditionStateTokens disabled = tokens.conditions[condition].disabled;
        expectParts(tester, lightTheme, disabled);
        expect(stateLayerColor(tester), lightTheme.paint(disabled.containerColor));
        expect(selectionOpacity(tester, TanreiCheckbox), tokens.disabled.opacity);
        expect(stateLayer(tester).shape.radius, tokens.disabled.containerShape);
      });
    }

    testWidgets('CHK-8: in the default system the round layer stays clear when disabled, an '
        'unfilled box stays unfilled, the error color goes, and the mark stays on the surface', (
      WidgetTester tester,
    ) async {
      final Color faded = light.onSurface.withValues(alpha: system.state.disabledContentOpacity);
      for (final bool isError in <bool>[false, true]) {
        await tester.pumpWidget(tanreiTestApp(checkbox(enabled: false, isError: isError)));
        await tester.pumpAndSettle();
        expect(stateLayerColor(tester).a, 0);
        expect(box(tester).fill.a, 0);
        expect(box(tester).outline, isSameColorAs(faded));
        expect(labelStyle(tester, TanreiCheckbox).color, isSameColorAs(faded));
        await tester.pumpWidget(
          tanreiTestApp(checkbox(enabled: false, value: true, isError: isError)),
        );
        await tester.pumpAndSettle();
        expect(stateLayerColor(tester).a, 0);
        expect(box(tester).fill, isSameColorAs(faded));
        expect(box(tester).mark, light.surface);
      }
    });
  });

  group('conditions', () {
    const Map<String, TanreiCheckboxCondition> byFixture = <String, TanreiCheckboxCondition>{
      'unselected': TanreiCheckboxCondition.unselected,
      'selected': TanreiCheckboxCondition.selected,
      'indeterminate': TanreiCheckboxCondition.indeterminate,
      'error-unselected': TanreiCheckboxCondition.errorUnselected,
      'error-selected': TanreiCheckboxCondition.errorSelected,
      'error-indeterminate': TanreiCheckboxCondition.errorIndeterminate,
    };

    for (final MapEntry<String, TanreiCheckboxCondition> entry in byFixture.entries) {
      testWidgets('CHK-4: the props of fixture ${entry.key} select the condition '
          '${entry.value.name} and draw its tokens (dark scheme)', (WidgetTester tester) async {
        final Map<String, dynamic> props =
            specFixtures(
                  'checkbox',
                ).singleWhere((Map<String, dynamic> f) => f['id'] == entry.key)['props']
                as Map<String, dynamic>;
        final TanreiCheckbox widget = checkboxOf(props) as TanreiCheckbox;
        expect(widget.condition, entry.value);
        await tester.pumpWidget(tanreiTestApp(widget, theme: TanreiThemeData.dark));
        expectParts(tester, TanreiThemeData.dark, tokens.conditions[entry.value].enabled);
      });
    }

    test('CHK-4: indeterminate wins over checked (a tristate null value is never also checked), '
        'and error prefixes whichever condition applies', () {
      expect(
        const TanreiCheckbox(value: null, tristate: true, onChanged: null).condition,
        TanreiCheckboxCondition.indeterminate,
      );
      expect(
        const TanreiCheckbox(value: null, tristate: true, isError: true, onChanged: null).condition,
        TanreiCheckboxCondition.errorIndeterminate,
      );
      expect(
        const TanreiCheckbox(value: true, onChanged: null).condition,
        TanreiCheckboxCondition.selected,
      );
      expect(
        const TanreiCheckbox(value: false, isError: true, onChanged: null).condition,
        TanreiCheckboxCondition.errorUnselected,
      );
    });

    testWidgets('CHK-4: the default values, by role', (
      WidgetTester tester,
    ) async {
      const Color none = Color(0x00000000);
      // condition -> box, mark, outline
      final Map<TanreiCheckboxCondition, (Color, Color, Color)> expected =
          <TanreiCheckboxCondition, (Color, Color, Color)>{
            TanreiCheckboxCondition.unselected: (none, none, light.outline),
            TanreiCheckboxCondition.selected: (light.primary, light.onPrimary, light.primary),
            TanreiCheckboxCondition.indeterminate: (light.primary, light.onPrimary, light.primary),
            TanreiCheckboxCondition.errorUnselected: (none, none, light.error),
            TanreiCheckboxCondition.errorSelected: (light.error, light.onError, light.error),
            TanreiCheckboxCondition.errorIndeterminate: (light.error, light.onError, light.error),
          };
      for (final MapEntry<TanreiCheckboxCondition, (Color, Color, Color)> entry
          in expected.entries) {
        final bool indeterminate = entry.key.name.endsWith('indeterminate');
        await tester.pumpWidget(
          tanreiTestApp(
            checkbox(
              tristate: indeterminate,
              value: indeterminate ? null : !entry.key.name.endsWith('unselected'),
              isError: entry.key.name.startsWith('error'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(box(tester).fill, isSameColorAs(entry.value.$1), reason: entry.key.name);
        expect(box(tester).mark, isSameColorAs(entry.value.$2), reason: entry.key.name);
        expect(box(tester).outline, entry.value.$3, reason: entry.key.name);
        expect(stateLayerColor(tester).a, 0, reason: entry.key.name);
        expect(labelStyle(tester, TanreiCheckbox).color, light.onSurface);
      }
    });

    testWidgets('an unknown condition key resolves to the default condition and is reported; the '
        'checkbox itself only ever selects core conditions', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      const TanreiCheckboxCondition unknown = TanreiCheckboxCondition('partly-invalid');
      expect(tokens.conditions.has(unknown), isFalse);
      expect(identical(tokens.conditions[unknown], tokens.conditions.unselected), isTrue);
      expect(reports, <String>['checkbox condition "partly-invalid" -> unselected']);
      reports.clear();
      for (final bool? value in <bool?>[false, true, null]) {
        for (final bool isError in <bool>[false, true]) {
          await tester.pumpWidget(
            tanreiTestApp(checkbox(value: value, tristate: true, isError: isError)),
          );
        }
      }
      expect(reports, isEmpty);
      expect(tester.takeException(), isNull);
    });
  });

  group('interaction states', () {
    testWidgets('CHK-5: container, box, mark, outline, label and opacity come from the tokens of '
        'the highest-precedence state, pressed > focused > hovered', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      final TanreiCheckboxConditionTokens selected = tokens.conditions.selected;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(checkbox(value: true, focusNode: focusNode)));
      expectParts(tester, lightTheme, selected.enabled);
      expect(stateLayerColor(tester).a, 0);

      final TestGesture mouse = await hoverOver(tester, find.byType(TanreiCheckbox));
      expectParts(tester, lightTheme, selected.hovered);
      // The state layer is the condition's state-layer color: here primary.
      expect(
        stateLayerColor(tester),
        isSameColorAs(light.primary.withValues(alpha: system.state.hoverStateLayerOpacity)),
      );
      expect(selectionOpacity(tester, TanreiCheckbox), tokens.hovered.opacity);

      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), lightTheme.paint(selected.focused.containerColor));

      await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), lightTheme.paint(selected.pressed.containerColor));
      expectParts(tester, lightTheme, selected.pressed);
      await mouse.up();
      focusNode.unfocus();
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester).a, 0);
    });

    testWidgets('CHK-5: under the acme fixture hovered, focused and pressed are three different '
        'values, and pressed > focused > hovered shows without overriding anything', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiCheckboxConditionTokens unselected = acmeSystem.checkbox.conditions.unselected;
      final Color hovered = theme.paint(unselected.hovered.containerColor);
      final Color focused = theme.paint(unselected.focused.containerColor);
      final Color pressed = theme.paint(unselected.pressed.containerColor);
      expect(<Color>{hovered, focused, pressed}, hasLength(3));
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(checkbox(focusNode: focusNode), theme: theme));
      final TestGesture mouse = await hoverOver(tester, find.byType(TanreiCheckbox));
      expect(stateLayerColor(tester), hovered);
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
      await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
      await tester.pump();
      expect(stateLayerColor(tester), pressed);
      await mouse.up();
      await tester.pumpAndSettle();
      expect(stateLayerColor(tester), focused);
    });

    testWidgets('CHK-5: focus gained by pointer or touch does not select the focused state', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(checkbox(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pumpAndSettle();
      expect(focusNode.hasFocus, isTrue);
      expect(stateLayerColor(tester).a, 0);
    });

    testWidgets('CHK-6: keyboard focus shows the focus ring around the box at once; pointer focus '
        'does not', (WidgetTester tester) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(checkbox()));
      expect(focusRingShown(tester), isFalse);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusRingShown(tester), isTrue);
      final TanreiFocusRing ring = tester.widget(find.byType(TanreiFocusRing));
      expect(ring.borderRadius, BorderRadius.circular(tokens.boxShape));
      // The ring's child is the box, not the round layer.
      expect(tester.getSize(find.byType(TanreiFocusRing)), Size.square(tokens.boxSize));
      final double offset = system.measure.focusOffset + system.measure.focusOuterWidth / 2;
      final RRect expected = BorderRadius.circular(
        tokens.boxShape,
      ).toRRect(Offset.zero & Size.square(tokens.boxSize)).inflate(offset);
      expect(
        find.byType(TanreiFocusRing),
        paints..something(
          (Symbol method, List<dynamic> arguments) =>
              method == #drawRRect &&
              arguments[0] == expected &&
              (arguments[1] as Paint).color.toARGB32() == light.focusRing.toARGB32(),
        ),
      );

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.pump();
      expect(focusRingShown(tester), isFalse);
    });
  });

  group('target', () {
    testWidgets('CHK-7: the hit area extends to sys.target.touch on both axes without changing the '
        'visual size, and the visible label is part of it', (WidgetTester tester) async {
      final List<bool> changes = <bool>[];
      await tester.pumpWidget(tanreiTestApp(checkbox(labelHidden: true, onChanged: changes.add)));
      expect(tester.getSize(find.byType(TanreiStateLayer)), Size.square(tokens.containerSize));
      expect(tester.getSize(boxFinder), Size.square(tokens.boxSize));
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      expect(target.size, Size.square(system.measure.targetTouch));
      await tester.tapAt(target.topLeft + const Offset(1, 1));
      await tester.pumpAndSettle();
      expect(changes, hasLength(1));

      await tester.pumpWidget(tanreiTestApp(checkbox(onChanged: changes.add)));
      final Rect labelled = tester.getRect(find.byType(TanreiTapTarget));
      expect(labelled.height, system.measure.targetTouch);
      expect(labelled.contains(tester.getRect(find.text('Email me updates')).center), isTrue);
      await tester.tapAt(
        tester.getRect(find.text('Email me updates')).centerRight - const Offset(1, 0),
      );
      await tester.tapAt(Offset(labelled.center.dx, labelled.top + 1));
      await tester.pumpAndSettle();
      expect(changes, hasLength(3));
    });

    testWidgets('CHK-7: the minimum target is the touch target token of the system in the theme', (
      WidgetTester tester,
    ) async {
      final TanreiSystem wide = system.copyWith(measure: system.measure.copyWith(targetTouch: 60));
      await tester.pumpWidget(
        tanreiTestApp(checkbox(labelHidden: true), theme: TanreiThemeData(system: wide)),
      );
      expect(tester.getSize(find.byType(TanreiTapTarget)), const Size.square(60));
      expect(tester.getSize(find.byType(TanreiStateLayer)), Size.square(tokens.containerSize));
    });
  });

  group('press', () {
    final Duration hold = Duration(milliseconds: system.motion.duration.pressHold);
    const Duration tick = Duration(milliseconds: 1);
    final Color pressedLayer = lightTheme.paint(
      tokens.conditions.unselected.pressed.containerColor,
    );

    for (final PointerDeviceKind kind in <PointerDeviceKind>[
      PointerDeviceKind.touch,
      PointerDeviceKind.mouse,
    ]) {
      testWidgets(
        'CHK-9: a ${kind.name} press shows the pressed state at once and keeps it for the '
        'press-hold duration',
        (WidgetTester tester) async {
          await tester.pumpWidget(tanreiTestApp(checkbox(labelHidden: true)));
          final TestGesture gesture = await tester.startGesture(
            tester.getCenter(find.byType(TanreiCheckbox)),
            kind: kind,
          );
          await tester.pump();
          expect(stateLayerColor(tester), pressedLayer);
          await gesture.up();
          await tester.pump(hold - tick);
          expect(stateLayerColor(tester), pressedLayer);
          await tester.pump(tick);
          await tester.pumpAndSettle();
          expect(stateLayerColor(tester), isNot(pressedLayer));
          await gesture.removePointer();
        },
      );
    }

    testWidgets('CHK-9: Space shows the pressed state at once and for the press-hold duration', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(checkbox(autofocus: true)));
      await tester.pumpAndSettle();
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pump();
      expect(stateLayerColor(tester), pressedLayer);
      await tester.pump(hold - tick);
      expect(stateLayerColor(tester), pressedLayer);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(
        stateLayerColor(tester),
        lightTheme.paint(tokens.conditions.unselected.focused.containerColor),
      );
    });

    testWidgets('CHK-10: overlay (the default) applies the pressed tokens to the container at '
        'once, with no ripple', (WidgetTester tester) async {
      expect(system.behavior.pressedFeedback, TanreiPressedFeedback.overlay);
      await tester.pumpWidget(tanreiTestApp(checkbox()));
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiStateLayer)),
      );
      await tester.pump();
      expect(stateLayerColor(tester), pressedLayer);
      expect(stateLayerDecoration(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('CHK-10: ripple (m3-like) grows the pressed layer from the point of contact over '
        'the feedback duration, from the center when the press lands on the label, and fades', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: m3LikeSystem);
      final TanreiCheckboxTokens m3 = m3LikeSystem.checkbox;
      await tester.pumpWidget(tanreiTestApp(checkbox(), theme: theme));
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      const Offset contact = Offset(9, 7);
      final TestGesture touch = await tester.startGesture(layer.topLeft + contact);
      await tester.pump();
      TanreiRipple ripple = stateLayerDecoration(tester).ripple!;
      expect(ripple.origin, contact);
      expect(ripple.color, theme.paint(m3.conditions.unselected.pressed.containerColor));
      expect(ripple.progress, 0);
      final Duration growth = Duration(milliseconds: m3.motionFeedbackDuration);
      await tester.pump(growth ~/ 2);
      expect(
        stateLayerDecoration(tester).ripple!.progress,
        moreOrLessEquals(m3.motionStateEasing.toCurve().transform(0.5)),
      );
      await touch.up();
      await tester.pumpAndSettle();
      expect(stateLayerDecoration(tester).ripple, isNull);

      final TestGesture onLabel = await tester.startGesture(
        tester.getCenter(find.text('Email me updates')),
      );
      await tester.pump();
      ripple = stateLayerDecoration(tester).ripple!;
      expect(ripple.origin, isNull, reason: 'outside the layer: from its center');
      await onLabel.up();
      await tester.pumpAndSettle();
    });

    for (final TanreiPressedFeedback feedback in <TanreiPressedFeedback>[
      TanreiPressedFeedback.ripple,
      TanreiPressedFeedback.dim,
      TanreiPressedFeedback.none,
    ]) {
      testWidgets(
        'CHK-10: under ${feedback.name} the container color stays with the state under '
        'the press; ${feedback == TanreiPressedFeedback.none ? 'so does every other part' : 'box, mark, outline, label, opacity and shape are the pressed tokens\''}',
        (WidgetTester tester) async {
          FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
          final TanreiCheckboxConditionTokens selected = tokens.conditions.selected;
          final TanreiSystem of = system.copyWith(
            behavior: system.behavior.copyWith(pressedFeedback: feedback),
            checkbox: tokens.copyWith(
              pressed: tokens.pressed.copyWith(opacity: 0.5, containerShape: 2),
              conditions: tokens.conditions.copyWith(
                selected: selected.copyWith(
                  pressed: selected.pressed.copyWith(
                    containerColor: const TanreiPaint.literal(Color(0xFF112233)),
                    boxColor: const TanreiPaint.literal(Color(0xFF445566)),
                    markColor: const TanreiPaint.literal(Color(0xFF778899)),
                    outlineColor: const TanreiPaint.literal(Color(0xFFAABBCC)),
                    labelColor: const TanreiPaint.literal(Color(0xFFDDEEFF)),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpWidget(
            tanreiTestApp(checkbox(value: true), theme: TanreiThemeData(system: of)),
          );
          final TestGesture mouse = await hoverOver(tester, find.byType(TanreiStateLayer));
          final Color hoveredLayer = stateLayerColor(tester);
          final Color hoveredBox = box(tester).fill;
          await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
          await tester.pump();
          expect(stateLayerColor(tester), hoveredLayer);
          if (feedback == TanreiPressedFeedback.none) {
            expect(box(tester).fill, hoveredBox);
            expect(selectionOpacity(tester, TanreiCheckbox), 1);
          } else {
            expect(box(tester).fill, const Color(0xFF445566));
            expect(box(tester).mark, const Color(0xFF778899));
            expect(box(tester).outline, const Color(0xFFAABBCC));
            expect(labelStyle(tester, TanreiCheckbox).color, const Color(0xFFDDEEFF));
            expect(selectionOpacity(tester, TanreiCheckbox), 0.5);
            expect(stateLayer(tester).shape.radius, 2);
            expect(
              stateLayerDecoration(tester).ripple?.color,
              feedback == TanreiPressedFeedback.ripple ? const Color(0xFF112233) : null,
            );
          }
          await mouse.up();
          await tester.pumpAndSettle();
        },
      );
    }

    testWidgets(
      'CHK-10: dim (cupertino) dims the whole control to the pressed opacity and draws no '
      'state layer',
      (WidgetTester tester) async {
        final TanreiCheckboxTokens cupertino = cupertinoSystem.checkbox;
        expect(cupertino.pressed.opacity, lessThan(1));
        await tester.pumpWidget(
          tanreiTestApp(checkbox(), theme: const TanreiThemeData(system: cupertinoSystem)),
        );
        final TestGesture touch = await tester.startGesture(
          tester.getCenter(find.byType(TanreiStateLayer)),
        );
        await tester.pump();
        expect(selectionOpacity(tester, TanreiCheckbox), cupertino.pressed.opacity);
        expect(stateLayerColor(tester).a, 0);
        expect(stateLayerDecoration(tester).ripple, isNull);
        await touch.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets('CHK-10: with animations disabled a ripple covers the layer at once', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          checkbox(),
          theme: const TanreiThemeData(system: m3LikeSystem),
          disableAnimations: true,
        ),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.byType(TanreiStateLayer)),
      );
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.progress, 1);
      await touch.up();
      await tester.pumpAndSettle();
    });
  });

  group('shape', () {
    testWidgets('CHK-11: the box is eased by the corner smoothing of the system (0 by default, 0.6 '
        'cupertino); the round layer stays round', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(checkbox(value: true)));
      expect(box(tester).shape, TanreiCornerShape(smoothing: 0, radius: tokens.boxShape));
      expect(boxFinder, paints..rrect());
      await tester.pumpWidget(
        tanreiTestApp(checkbox(value: true), theme: const TanreiThemeData(system: cupertinoSystem)),
      );
      expect(box(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      expect(box(tester).shape.radius, cupertinoSystem.checkbox.boxShape);
      expect(boxFinder, paints..path());
      expect(stateLayer(tester).shape.radius, greaterThanOrEqualTo(tokens.containerSize / 2));
    });

    testWidgets('CHK-11: the focus style of the system: a ring by default, a glow under acme', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Future<List<Paint>> strokes(TanreiSystem of) async {
        await tester.pumpWidget(
          tanreiTestApp(checkbox(autofocus: true), theme: TanreiThemeData(system: of)),
        );
        await tester.pump();
        final List<Paint> found = <Paint>[];
        expect(
          find.byType(TanreiFocusRing),
          paints..everything((Symbol method, List<dynamic> arguments) {
            if (method == #drawRRect && (arguments[1] as Paint).style == PaintingStyle.stroke) {
              found.add(arguments[1] as Paint);
            }
            return true;
          }),
        );
        return found;
      }

      final List<Paint> ring = await strokes(system);
      expect(ring, isNotEmpty);
      expect(ring.every((Paint p) => p.maskFilter == null), isTrue);
      final List<Paint> glow = await strokes(acmeSystem);
      expect(glow, isNotEmpty);
      expect(glow.every((Paint p) => p.maskFilter != null), isTrue);
    });

    testWidgets('CHK-12: a box of box.size with box.shape corners centered in a round layer of '
        'container.size; outline inside the edge, fill inside the outline, the mark stroked at '
        'mark.width — a check while selected, a dash while indeterminate, nothing unselected', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(tanreiTestApp(checkbox(value: true, labelHidden: true)));
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      final Rect boxRect = tester.getRect(boxFinder);
      expect(layer.size, Size.square(tokens.containerSize));
      expect(boxRect.size, Size.square(tokens.boxSize));
      expect(boxRect.center, layer.center);
      final Rect local = Offset.zero & boxRect.size;
      final double w = tokens.outlineWidth;
      final RRect outer = RRect.fromRectAndRadius(local, Radius.circular(tokens.boxShape));
      expect(
        boxFinder,
        paints
          // Checked: the fill and the outline are one color, drawn as one shape.
          ..rrect(rrect: outer, color: light.primary)
          // The check.
          ..path(
            color: light.onPrimary,
            strokeWidth: tokens.markWidth,
            style: PaintingStyle.stroke,
          ),
      );
      expect(
        boxFinder,
        isNot(
          paints
            ..rrect()
            ..drrect(),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(checkbox(value: null, tristate: true, labelHidden: true)),
      );
      await tester.pumpAndSettle();
      expect(
        boxFinder,
        paints
          ..rrect(rrect: outer)
          ..line(color: light.onPrimary, strokeWidth: tokens.markWidth),
      );
      await tester.pumpWidget(tanreiTestApp(checkbox(labelHidden: true)));
      await tester.pumpAndSettle();
      expect(boxFinder, isNot(paints..path()));
      expect(boxFinder, isNot(paints..line()));
      // Unchecked: the outline alone, the band inside the edge.
      expect(
        boxFinder,
        paints..drrect(outer: outer, inner: outer.deflate(w), color: light.outline),
      );

      // A translucent outline over a different fill: the fill lies inside the outline, never under
      // it; an opaque outline hides the fill under it.
      const Color halfRed = Color(0x80FF0000);
      const Color halfBlue = Color(0x800000FF);
      const Color blue = Color(0xFF0000FF);
      for (final (Color outline, RRect fill) in <(Color, RRect)>[
        (halfBlue, outer.deflate(w)),
        (blue, outer),
      ]) {
        final TanreiCheckboxConditionTokens selected = tokens.conditions.selected;
        final TanreiSystem product = system.copyWith(
          checkbox: tokens.copyWith(
            conditions: tokens.conditions.copyWith(
              selected: selected.copyWith(
                enabled: selected.enabled.copyWith(
                  boxColor: const TanreiPaint.literal(halfRed),
                  outlineColor: TanreiPaint.literal(outline),
                ),
              ),
            ),
          ),
        );
        await tester.pumpWidget(
          tanreiTestApp(
            checkbox(key: UniqueKey(), value: true, labelHidden: true),
            theme: TanreiThemeData(system: product),
          ),
        );
        expect(
          boxFinder,
          paints
            ..rrect(rrect: fill, color: halfRed)
            ..drrect(outer: outer, inner: outer.deflate(w), color: outline),
        );
      }
    });

    testWidgets(
      'CHK-13: the check draws along its path over the selection motion and reverses when '
      'it goes; the colors change with it',
      (WidgetTester tester) async {
        final Duration duration = Duration(milliseconds: tokens.motionSelectionDuration);
        final Curve curve = tokens.motionSelectionEasing.toCurve();
        Future<void> set(bool value) =>
            tester.pumpWidget(tanreiTestApp(checkbox(value: value, key: const ValueKey<int>(1))));
        await set(false);
        expect(box(tester).check, 0);
        await set(true);
        expect(box(tester).check, 0);
        await tester.pump(duration ~/ 2);
        expect(box(tester).check, moreOrLessEquals(curve.transform(0.5), epsilon: 1e-3));
        expect(box(tester).fill.a, greaterThan(0));
        expect(box(tester).fill.a, lessThan(1));
        await tester.pump(duration);
        expect(box(tester).check, 1);
        expect(box(tester).fill, light.primary);
        await set(false);
        await tester.pump(duration ~/ 2);
        expect(box(tester).check, moreOrLessEquals(1 - curve.transform(0.5), epsilon: 1e-3));
        await tester.pumpAndSettle();
        expect(box(tester).check, 0);
      },
    );

    testWidgets('CHK-13: the dash grows from its center; unchecked to indeterminate and back', (
      WidgetTester tester,
    ) async {
      final Duration duration = Duration(milliseconds: tokens.motionSelectionDuration);
      Future<void> set(bool? value) => tester.pumpWidget(
        tanreiTestApp(checkbox(value: value, tristate: true, key: const ValueKey<int>(1))),
      );
      await set(false);
      await set(null);
      await tester.pump(duration ~/ 3);
      final double dash = box(tester).dash;
      expect(dash, greaterThan(0));
      expect(dash, lessThan(1));
      await tester.pumpAndSettle();
      expect(box(tester).dash, 1);
      // The dash is centered: its two ends are equally far from the box's center.
      expect(
        boxFinder,
        paints..something((Symbol method, List<dynamic> arguments) {
          if (method != #drawLine) {
            return false;
          }
          final Offset a = arguments[0] as Offset;
          final Offset b = arguments[1] as Offset;
          return (a + b) / 2 == Size.square(tokens.boxSize).center(Offset.zero);
        }),
      );
    });

    testWidgets('CHK-13: where motion is reduced the new condition shows at once', (
      WidgetTester tester,
    ) async {
      Future<void> set(bool value) => tester.pumpWidget(
        tanreiTestApp(checkbox(value: value, key: const ValueKey<int>(1)), disableAnimations: true),
      );
      await set(false);
      await set(true);
      expect(box(tester).check, 1);
      expect(box(tester).fill, light.primary);
      expect(tester.hasRunningAnimations, isFalse);
    });
  });

  group('semantics', () {
    testWidgets('CHK-14: role checkbox with checked, not checked and mixed, and invalid while in '
        'error', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final (bool?, bool) entry in <(bool?, bool)>[
        (false, false),
        (true, false),
        (null, false),
        (true, true),
        (null, true),
      ]) {
        final (bool? value, bool isError) = entry;
        await tester.pumpWidget(
          tanreiTestApp(checkbox(value: value, tristate: true, isError: isError)),
        );
        final SemanticsData data = semanticsOfTarget(tester);
        final String reason = '$value $isError';
        expect(data.hasFlag(SemanticsFlag.hasCheckedState), isTrue, reason: reason);
        expect(data.hasFlag(SemanticsFlag.isChecked), value ?? false, reason: reason);
        expect(data.hasFlag(SemanticsFlag.isCheckStateMixed), value == null, reason: reason);
        expect(data.hasFlag(SemanticsFlag.hasToggledState), isFalse, reason: reason);
        expect(
          data.validationResult,
          isError ? SemanticsValidationResult.invalid : SemanticsValidationResult.none,
          reason: reason,
        );
        expect(data.label, 'Email me updates');
      }
      handle.dispose();
    });

    testWidgets('CHK-14: one node, named by the label and never read twice', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(checkbox(value: true)));
      expect(
        tester.getSemantics(find.byType(TanreiTapTarget)),
        matchesSemantics(
          label: 'Email me updates',
          hasCheckedState: true,
          isChecked: true,
          hasEnabledState: true,
          isEnabled: true,
          isFocusable: true,
          hasTapAction: true,
          hasFocusAction: true,
        ),
      );
      expect(find.bySemanticsLabel('Email me updates'), findsOneWidget);
      handle.dispose();
    });

    for (final TanreiThemeData theme in <TanreiThemeData>[
      TanreiThemeData.light,
      TanreiThemeData.dark,
    ]) {
      testWidgets('guidelines: tap targets, a labeled target and text contrast '
          '(${theme.brightness.name})', (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        for (final bool labelHidden in <bool>[false, true]) {
          await tester.pumpWidget(
            tanreiTestApp(checkbox(value: true, labelHidden: labelHidden), theme: theme),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
        handle.dispose();
      });
    }

    for (final Brightness brightness in Brightness.values) {
      test('non-text contrast: the unchecked outline and the filled box meet 3:1 against the '
          'surface in the ${brightness.name} schemes', () {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
          for (final TanreiCheckboxCondition condition in TanreiCheckboxCondition.core) {
            final TanreiCheckboxConditionStateTokens enabled = tokens.conditions[condition].enabled;
            final Color edge = theme.paint(enabled.outlineColor);
            expect(
              contrastOf(Color.alphaBlend(edge, theme.colors.surface), theme.colors.surface),
              greaterThanOrEqualTo(3),
              reason: '${condition.name} ${contrast.name}',
            );
          }
        }
      });
    }
  });

  group('label', () {
    testWidgets('CHK-15: the label sits label.gap after the round layer, in label.typescale, and '
        'wraps rather than truncating', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(checkbox()));
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      final Rect label = tester.getRect(find.text('Email me updates'));
      expect(label.left - layer.right, tokens.labelGap);
      expect(labelStyle(tester, TanreiCheckbox).fontSize, tokens.labelTypescale.size);
      final TextStyle expected = tokens.labelTypescale.toTextStyle();
      expect(labelStyle(tester, TanreiCheckbox).height, expected.height);

      await tester.pumpWidget(
        tanreiTestApp(SizedBox(width: 120, child: checkbox(label: 'I accept the terms of use'))),
      );
      final Text text = tester.widget(find.text('I accept the terms of use'));
      expect(text.maxLines, isNull);
      expect(text.overflow, isNot(TextOverflow.ellipsis));
      expect(
        tester.getSize(find.text('I accept the terms of use')).height,
        greaterThan(tokens.labelTypescale.lineHeight),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('CHK-15: a right-to-left layout mirrors the order: the label is left of the box', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(Directionality(textDirection: TextDirection.rtl, child: checkbox())),
      );
      final Rect layer = tester.getRect(find.byType(TanreiStateLayer));
      final Rect label = tester.getRect(find.text('Email me updates'));
      expect(layer.left - label.right, tokens.labelGap);
    });

    testWidgets('CHK-15: at 200% text the label grows and wraps; the box does not grow', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: SizedBox(width: 200, child: checkbox()),
          ),
        ),
      );
      expect(tester.getSize(boxFinder), Size.square(tokens.boxSize));
      expect(tester.getSize(find.byType(TanreiStateLayer)), Size.square(tokens.containerSize));
      expect(tester.takeException(), isNull);
    });

    testWidgets('CHK-16: labelHidden draws no label and keeps it as the accessible name', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(checkbox(label: 'Select row', labelHidden: true)));
      expect(find.byType(Text), findsNothing);
      expect(semanticsOfTarget(tester).label, 'Select row');
      handle.dispose();
    });

    testWidgets('CHK-16: an empty label still renders, and debug builds report it once', (
      WidgetTester tester,
    ) async {
      final List<String> reports = collectMissingNames();
      await tester.pumpWidget(tanreiTestApp(checkbox(label: '')));
      expect(find.byType(TanreiStateLayer), findsOneWidget);
      expect(find.byType(Text), findsNothing);
      expect(reports, <String>['checkbox']);
      await tester.pumpWidget(tanreiTestApp(checkbox(label: '', value: true)));
      expect(reports, hasLength(1));
      await tester.pumpWidget(tanreiTestApp(checkbox(label: 'Named')));
      await tester.pumpWidget(tanreiTestApp(checkbox(label: ' ')));
      expect(reports, hasLength(2));
    });

    testWidgets('CHK-16: the default reporter says to set label', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(checkbox(label: '')));
      final Object? reported = tester.takeException();
      expect(reported, isFlutterError);
      expect('$reported', contains('checkbox has no accessible name'));
      expect('$reported', contains('non-empty label'));
    });
  });

  group('a design system drives rendering', () {
    testWidgets('sizes, widths, shape and label tokens of a product system drive the checkbox', (
      WidgetTester tester,
    ) async {
      final TanreiSystem product = system.copyWith(
        checkbox: tokens.copyWith(
          boxSize: 22,
          containerSize: 40,
          boxShape: 0,
          outlineWidth: 3,
          markWidth: 4,
          labelGap: 12,
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(checkbox(value: true), theme: TanreiThemeData(system: product)),
      );
      expect(tester.getSize(boxFinder), const Size.square(22));
      expect(tester.getSize(find.byType(TanreiStateLayer)), const Size.square(40));
      expect(box(tester).shape.radius, 0);
      expect(box(tester).outlineWidth, 3);
      expect(box(tester).markWidth, 4);
      expect(
        tester.getRect(find.text('Email me updates')).left -
            tester.getRect(find.byType(TanreiStateLayer)).right,
        12,
      );
    });

    for (final TanreiSystem of in shippedSystems) {
      testWidgets('"${of.id}": every condition at rest draws that system\'s enabled tokens', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: of);
        for (final (bool?, bool) entry in <(bool?, bool)>[
          (false, false),
          (true, false),
          (null, false),
          (false, true),
          (true, true),
          (null, true),
        ]) {
          final TanreiCheckbox widget =
              checkbox(value: entry.$1, tristate: true, isError: entry.$2) as TanreiCheckbox;
          await tester.pumpWidget(tanreiTestApp(widget, theme: theme));
          await tester.pumpAndSettle();
          expectParts(tester, theme, of.checkbox.conditions[widget.condition].enabled);
          expect(tester.getSize(boxFinder), Size.square(of.checkbox.boxSize));
          expect(box(tester).shape.smoothing, of.shape.cornerSmoothing);
        }
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('checkbox');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'unselected',
        'selected',
        'indeterminate',
        'error-unselected',
        'error-selected',
        'error-indeterminate',
        'disabled-unselected',
        'disabled-selected',
        'disabled-indeterminate',
        'label-hidden',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          child: checkboxOf(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/checkbox/$id.png',
          surface: labelledGoldenSurface,
        );
      });
    }

    // One representative fixture per shipped preset: a checked box shows the box
    // size, corner, fill, mark and label style at once.
    const String recorded = 'selected';
    final Map<String, dynamic> representative = fixtures.singleWhere(
      (Map<String, dynamic> f) => f['id'] == recorded,
    );
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          child: checkboxOf(representative['props'] as Map<String, dynamic>),
          file: 'goldens/checkbox/${preset.id}/$recorded.png',
          surface: labelledGoldenSurface,
        );
      });
    }
  });

  group('motion and alignment', () {
    testWidgets(
      'CHK-5: a part the interaction states recolor changes over the state motion, as the '
      'container does, and pressed at once; only a change of condition uses the selection motion',
      (WidgetTester tester) async {
        const Color hoveredBox = Color(0xFF3366CC);
        const Color pressedBox = Color(0xFFCC3366);
        final TanreiCheckboxConditionTokens selected = tokens.conditions.selected;
        final TanreiSystem product = system.copyWith(
          checkbox: tokens.copyWith(
            conditions: tokens.conditions.copyWith(
              selected: selected.copyWith(
                hovered: selected.hovered.copyWith(boxColor: const TanreiPaint.literal(hoveredBox)),
                pressed: selected.pressed.copyWith(boxColor: const TanreiPaint.literal(pressedBox)),
              ),
            ),
          ),
        );
        await tester.pumpWidget(
          tanreiTestApp(checkbox(value: true), theme: TanreiThemeData(system: product)),
        );
        final Color rest = box(tester).fill;
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
        await mouse.addPointer(location: Offset.zero);
        addTearDown(mouse.removePointer);
        await mouse.moveTo(tester.getCenter(find.byType(TanreiStateLayer)));
        await tester.pump();
        final Duration state = Duration(milliseconds: tokens.motionStateDuration);
        await tester.pump(state ~/ 3);
        final double t = tokens.motionStateEasing.toCurve().transform(1 / 3);
        expect(box(tester).fill, isSameColorAs(tanreiLerpColor(rest, hoveredBox, t)));
        await tester.pump(state);
        expect(box(tester).fill, hoveredBox);
        await mouse.down(tester.getCenter(find.byType(TanreiStateLayer)));
        await tester.pump();
        expect(box(tester).fill, pressedBox, reason: 'pressed applies at once');
        await mouse.up();
        await tester.pumpAndSettle();
      },
    );

    testWidgets('CHK-10: a press on the label, outside the round container, grows the ripple from '
        'the container\'s center', (WidgetTester tester) async {
      await tester.pumpWidget(
        tanreiTestApp(checkbox(), theme: const TanreiThemeData(system: m3LikeSystem)),
      );
      final TestGesture touch = await tester.startGesture(
        tester.getCenter(find.text('Email me updates')),
      );
      await tester.pump();
      expect(stateLayerDecoration(tester).ripple!.origin, isNull, reason: 'null: the center');
      await touch.up();
      await tester.pumpAndSettle();
    });

    for (final double scale in <double>[1, 2]) {
      testWidgets('CHK-15: the control is centered on the first line of a wrapping label '
          '(text scale $scale)', (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: SizedBox(width: 160, child: checkbox(label: 'I accept the terms of use')),
            ),
          ),
        );
        final Rect label = tester.getRect(find.text('I accept the terms of use'));
        final double line =
            tokens.labelTypescale.lineHeight * scale; // the size scales, the ratio stays
        expect(label.height, greaterThan(line), reason: 'the label wraps');
        expect(
          tester.getCenter(find.byType(TanreiStateLayer)).dy,
          moreOrLessEquals(label.top + line / 2, epsilon: 0.01),
        );
        expect(tester.takeException(), isNull);
      });
    }
  });
}
