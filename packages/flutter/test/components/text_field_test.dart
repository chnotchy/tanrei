import 'dart:ui' show SemanticsInputType;

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';
import 'text_field_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiTextFieldTokens fieldTokens = system.textField;
final TanreiColors light = system.schemes.light;
const TanreiThemeData lightTheme = TanreiThemeData.light;

Widget field({
  TextEditingController? controller,
  String initialValue = '',
  String labelText = 'Email',
  bool labelHidden = false,
  TanreiTextFieldVariant variant = TanreiTextFieldVariant.outlined,
  TanreiTextFieldSize size = TanreiTextFieldSize.medium,
  TanreiTextFieldType type = TanreiTextFieldType.text,
  String hintText = '',
  String helperText = '',
  String errorText = '',
  bool isError = false,
  bool enabled = true,
  bool readOnly = false,
  bool isRequired = false,
  bool multiline = false,
  int minLines = 2,
  int? maxLines,
  int maxLength = 0,
  bool showCounter = false,
  String prefixText = '',
  String suffixText = '',
  Iterable<String>? autofillHints,
  Widget? leadingIcon,
  Widget? trailingIcon,
  ValueChanged<String>? onChanged,
  ValueChanged<String>? onCommit,
  ValueChanged<String>? onSubmitted,
  FocusNode? focusNode,
  bool autofocus = false,
  double? width = 288,
  Key? key,
}) => SizedBox(
  width: width,
  child: TanreiTextField(
    key: key,
    controller: controller,
    initialValue: initialValue,
    labelText: labelText,
    labelHidden: labelHidden,
    variant: variant,
    size: size,
    type: type,
    hintText: hintText,
    helperText: helperText,
    errorText: errorText,
    isError: isError,
    enabled: enabled,
    readOnly: readOnly,
    isRequired: isRequired,
    multiline: multiline,
    minLines: minLines,
    maxLines: maxLines,
    maxLength: maxLength,
    showCounter: showCounter,
    prefixText: prefixText,
    suffixText: suffixText,
    autofillHints: autofillHints,
    leadingIcon: leadingIcon,
    trailingIcon: trailingIcon,
    onChanged: onChanged,
    onCommit: onCommit,
    onSubmitted: onSubmitted,
    focusNode: focusNode,
    autofocus: autofocus,
  ),
);

/// The render object that lays out and paints the container.
RenderBox fieldBox(WidgetTester tester) => tester.allRenderObjects
    .whereType<RenderBox>()
    .firstWhere((RenderBox r) => r.runtimeType.toString() == '_RenderField');

/// A diagnostics property of the container (what it paints).
T boxProperty<T>(WidgetTester tester, String name) =>
    fieldBox(tester)
            .toDiagnosticsNode()
            .getProperties()
            .firstWhere((DiagnosticsNode p) => p.name == name)
            .value
        as T;

Color outlineOf(WidgetTester tester) => boxProperty<Color>(tester, 'outline');
double outlineWidthOf(WidgetTester tester) => boxProperty<double>(tester, 'outlineWidth');
Color indicatorOf(WidgetTester tester) => boxProperty<Color>(tester, 'activeIndicator');
double indicatorWidthOf(WidgetTester tester) => boxProperty<double>(tester, 'activeIndicatorWidth');
Color containerOf(WidgetTester tester) => boxProperty<Color>(tester, 'container');
double floatOf(WidgetTester tester) => boxProperty<double>(tester, 'float');
Rect? notchOf(WidgetTester tester) => boxProperty<Rect?>(tester, 'notch');

EditableText editableOf(WidgetTester tester) =>
    tester.widget<EditableText>(find.byType(EditableText));

/// The label as drawn (null when it is not drawn).
TextStyle? labelStyle(WidgetTester tester, [String label = 'Email']) {
  final Finder text = find.descendant(of: find.byType(TanreiTextField), matching: find.text(label));
  return text.evaluate().isEmpty ? null : tester.widget<Text>(text).style;
}

SemanticsData semanticsOf(WidgetTester tester) =>
    tester.getSemantics(find.byType(EditableText)).getSemanticsData();

double fieldOpacity(WidgetTester tester) => tester
    .widget<Opacity>(
      find.descendant(of: find.byType(TanreiTextField), matching: find.byType(Opacity)).first,
    )
    .opacity;

/// Collects what `SemanticsService.announce` sends.
List<String> collectAnnouncements(WidgetTester tester) {
  final List<String> announcements = <String>[];
  tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
    SystemChannels.accessibility,
    (Object? message) async {
      final Map<Object?, Object?> event = message! as Map<Object?, Object?>;
      if (event['type'] == 'announce') {
        announcements.add((event['data']! as Map<Object?, Object?>)['message']! as String);
      }
      return null;
    },
  );
  addTearDown(
    () => tester.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<Object?>(
      SystemChannels.accessibility,
      null,
    ),
  );
  return announcements;
}

Future<TestGesture> hover(WidgetTester tester) async {
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: Offset.zero);
  addTearDown(mouse.removePointer);
  await mouse.moveTo(tester.getCenter(find.byType(TanreiTextField)));
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  return mouse;
}

/// Lets state and label transitions finish (not `pumpAndSettle`: a focused caret blinks).
Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

/// Composes [text] with the input method: marked text, not yet committed.
Future<void> compose(WidgetTester tester, String text) async {
  tester.testTextInput.updateEditingValue(
    TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
      composing: TextRange(start: 0, end: text.length),
    ),
  );
  await tester.pump();
}

/// Commits [text] as an input method does: the same value without a composing range.
Future<void> commitComposition(WidgetTester tester, String text) async {
  tester.testTextInput.updateEditingValue(
    TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    ),
  );
  await tester.pump();
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('events', () {
    testWidgets('TXF-1: typing, deleting, pasting and autofill emit onChanged once per change with '
        'the new value; a value the product sets is shown and emits nothing', (
      WidgetTester tester,
    ) async {
      final List<String> changed = <String>[];
      final List<String> committed = <String>[];
      final TextEditingController controller = TextEditingController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          field(controller: controller, onChanged: changed.add, onCommit: committed.add),
        ),
      );
      await tester.enterText(find.byType(TanreiTextField), 'ada');
      await tester.pump();
      expect(changed, <String>['ada']);
      expect(controller.text, 'ada');
      // Deleting, and a paste (both arrive as a new editing value).
      tester.testTextInput.updateEditingValue(
        const TextEditingValue(text: 'ad', selection: TextSelection.collapsed(offset: 2)),
      );
      await tester.pump();
      tester.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: 'ada@example.com',
          selection: TextSelection.collapsed(offset: 15),
        ),
      );
      await tester.pump();
      expect(changed, <String>['ada', 'ad', 'ada@example.com']);

      controller.text = 'grace@example.com';
      await tester.pump();
      expect(editableOf(tester).controller.text, 'grace@example.com');
      expect(changed, hasLength(3));
      expect(committed, isEmpty);
    });

    testWidgets('TXF-2: losing focus with a changed value emits onCommit once; without a change it '
        'emits nothing', (WidgetTester tester) async {
      final List<String> committed = <String>[];
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(field(initialValue: 'ada', focusNode: focusNode, onCommit: committed.add)),
      );
      focusNode.requestFocus();
      await tester.pump();
      focusNode.unfocus();
      await tester.pump();
      expect(committed, isEmpty);

      await tester.enterText(find.byType(TanreiTextField), 'ada@');
      await tester.enterText(find.byType(TanreiTextField), 'ada@example.com');
      focusNode.unfocus();
      await tester.pump();
      expect(committed, <String>['ada@example.com']);
      // Refocused with the same value: nothing more.
      focusNode.requestFocus();
      await tester.pump();
      focusNode.unfocus();
      await tester.pump();
      expect(committed, hasLength(1));
    });

    testWidgets('TXF-2 / TXF-3: the action key commits a changed value, then emits onSubmitted; a '
        'second action key without a change emits only onSubmitted', (WidgetTester tester) async {
      final List<String> events = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            onCommit: (String v) => events.add('change:$v'),
            onSubmitted: (String v) => events.add('action:$v'),
          ),
        ),
      );
      await tester.enterText(find.byType(TanreiTextField), 'ada');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      expect(events, <String>['change:ada', 'action:ada']);
      await tester.enterText(find.byType(TanreiTextField), 'ada');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      expect(events, <String>['change:ada', 'action:ada', 'action:ada']);
    });

    testWidgets('TXF-3: in a multi-line field the action key inserts a line break and emits no '
        'action', (WidgetTester tester) async {
      final List<String> actions = <String>[];
      await tester.pumpWidget(tanreiTestApp(field(multiline: true, onSubmitted: actions.add)));
      await tester.enterText(find.byType(TanreiTextField), 'line');
      expect(editableOf(tester).textInputAction, TextInputAction.newline);
      expect(editableOf(tester).keyboardType, TextInputType.multiline);
      await tester.testTextInput.receiveAction(TextInputAction.newline);
      await tester.pump();
      expect(actions, isEmpty);
    });
  });

  group('input method composition (TXF-4)', () {
    testWidgets('TXF-4: a composition is left to the platform: no change during it, maxLength not '
        'applied to it, and its commit always emits input', (WidgetTester tester) async {
      final List<String> changed = <String>[];
      final List<String> committed = <String>[];
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            maxLength: 3,
            focusNode: focusNode,
            onChanged: changed.add,
            onCommit: committed.add,
          ),
        ),
      );
      await tester.showKeyboard(find.byType(TanreiTextField));
      // Marked text longer than the limit stays whole while it is composed.
      await compose(tester, 'にほんご');
      expect(editableOf(tester).controller.text, 'にほんご');
      expect(editableOf(tester).controller.value.composing, const TextRange(start: 0, end: 4));
      // Focus leaving during a composition commits nothing.
      focusNode.unfocus();
      await tester.pump();
      expect(committed, isEmpty);
      await tester.showKeyboard(find.byType(TanreiTextField));
      await compose(tester, 'にほんご');
      // Committed: the limit applies now, and the commit is an input.
      await commitComposition(tester, '日本語です');
      expect(editableOf(tester).controller.text, '日本語');
      expect(changed.last, '日本語');
    });

    testWidgets('TXF-4: a product that echoes every input back does not disturb the composition, '
        'and a value it sets during one is applied when the composition ends', (
      WidgetTester tester,
    ) async {
      final TextEditingController controller = TextEditingController();
      addTearDown(controller.dispose);
      final List<String> changed = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            controller: controller,
            onChanged: (String value) {
              changed.add(value);
              controller.text = value; // the echo
            },
          ),
        ),
      );
      await tester.showKeyboard(find.byType(TanreiTextField));
      await compose(tester, 'か');
      await compose(tester, 'かん');
      final TextEditingValue composing = editableOf(tester).controller.value;
      expect(composing.text, 'かん');
      expect(composing.composing, const TextRange(start: 0, end: 2));

      // The commit of an echoed composition is the committed text, not a stale echo.
      await commitComposition(tester, '感');
      await tester.pump();
      expect(editableOf(tester).controller.text, '感');
      expect(controller.text, '感');
      expect(changed.last, '感');
      await compose(tester, 'かん');

      // The product sets another value mid-composition: it waits.
      controller.text = 'reset';
      await tester.pump();
      expect(editableOf(tester).controller.value.composing, const TextRange(start: 0, end: 2));
      expect(editableOf(tester).controller.text, 'かん');

      // Suppose the product does not echo the commit: its value is applied once the composition ends.
      changed.clear();
      await tester.pumpWidget(tanreiTestApp(field(controller: controller, onChanged: changed.add)));
      await commitComposition(tester, '漢');
      expect(changed, <String>['漢']);
      await tester.pump();
      expect(editableOf(tester).controller.text, 'reset');
      expect(controller.text, 'reset');
    });
  });

  group('disabled', () {
    testWidgets(
      'TXF-5: a disabled field is not focusable or editable, emits nothing and is exposed '
      'as disabled',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        final List<String> events = <String>[];
        final FocusNode focusNode = FocusNode();
        addTearDown(focusNode.dispose);
        await tester.pumpWidget(
          tanreiTestApp(
            field(
              initialValue: 'ada@example.com',
              enabled: false,
              focusNode: focusNode,
              onChanged: events.add,
              onCommit: events.add,
              onSubmitted: events.add,
            ),
          ),
        );
        await tester.tap(find.byType(TanreiTextField), warnIfMissed: false);
        focusNode.requestFocus();
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(focusNode.hasFocus, isFalse);
        expect(editableOf(tester).readOnly, isTrue);
        expect(events, isEmpty);
        final SemanticsData data = semanticsOf(tester);
        expect(data.hasFlag(SemanticsFlag.hasEnabledState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isEnabled), isFalse);
        expect(data.hasFlag(SemanticsFlag.isTextField), isTrue);
        expect(data.hasAction(SemanticsAction.tap), isFalse);
        handle.dispose();
      },
    );

    testWidgets('TXF-5: disabling a focused field removes its focus', (WidgetTester tester) async {
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      await tester.pumpWidget(tanreiTestApp(field(focusNode: focusNode)));
      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);
      await tester.pumpWidget(tanreiTestApp(field(focusNode: focusNode, enabled: false)));
      await tester.pump();
      expect(focusNode.hasFocus, isFalse);
    });

    for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
      for (final bool error in <bool>[false, true]) {
        testWidgets(
          'TXF-5: disabled ${variant.name}${error ? ' in error' : ''} draws every part from '
          'the disabled tokens of its variant${error ? ' (its error parts)' : ''}',
          (WidgetTester tester) async {
            await tester.pumpWidget(
              tanreiTestApp(
                field(
                  variant: variant,
                  initialValue: 'ada',
                  enabled: false,
                  isError: error,
                  helperText: 'Help',
                  errorText: 'Wrong',
                  leadingIcon: fieldGlyph('search'),
                ),
              ),
            );
            final TanreiTextFieldVariantStateTokens t = fieldTokens.variants[variant].disabled;
            Color p(TanreiPaint plain, TanreiPaint inError) =>
                lightTheme.paint(error ? inError : plain);
            expect(containerOf(tester), p(t.containerColor, t.errorContainerColor));
            expect(outlineOf(tester), p(t.outlineColor, t.errorOutlineColor));
            expect(indicatorOf(tester), p(t.activeIndicatorColor, t.errorActiveIndicatorColor));
            expect(labelStyle(tester)!.color, p(t.labelColor, t.errorLabelColor));
            expect(editableOf(tester).style.color, p(t.inputColor, t.errorInputColor));
            expect(
              tester.widget<Text>(find.text(error ? 'Wrong' : 'Help')).style!.color,
              p(t.supportingTextColor, t.errorSupportingTextColor),
            );
            expect(
              IconTheme.of(
                tester.element(find.text(String.fromCharCode(fieldIconCodePoints['search']!))),
              ).color,
              p(t.leadingIconColor, t.errorLeadingIconColor),
            );
            expect(editableOf(tester).cursorColor, p(t.caretColor, t.errorCaretColor));
            expect(outlineWidthOf(tester), fieldTokens.disabled.outlineWidth);
            expect(fieldOpacity(tester), fieldTokens.disabled.opacity);
          },
        );
      }
    }
  });

  group('interaction states', () {
    testWidgets('TXF-6: hover draws the hovered tokens — a filled container carries the state '
        'layer, the indicator darkens', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(field(variant: TanreiTextFieldVariant.filled)));
      final TanreiTextFieldVariantTokens filled = fieldTokens.variants.filled;
      expect(containerOf(tester), lightTheme.paint(filled.enabled.containerColor));
      await hover(tester);
      expect(containerOf(tester), lightTheme.paint(filled.hovered.containerColor));
      expect(
        containerOf(tester),
        isSameColorAs(
          Color.alphaBlend(
            light.onSurface.withValues(alpha: system.state.hoverStateLayerOpacity),
            light.surfaceContainerHighest,
          ),
        ),
      );
      expect(indicatorOf(tester), light.onSurface);
      expect(indicatorWidthOf(tester), fieldTokens.hovered.activeIndicatorWidth);
    });

    testWidgets('TXF-6: an outlined field keeps its container under hover and darkens '
        'its outline', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(field()));
      await hover(tester);
      expect(containerOf(tester).a, 0);
      expect(outlineOf(tester), light.onSurface);
    });

    for (final String by in <String>['pointer', 'keyboard']) {
      testWidgets('TXF-6: focus gained by $by selects the focused state: a thicker edge in the '
          'focus-ring role, the focused label, and focused wins over hovered', (
        WidgetTester tester,
      ) async {
        FocusManager.instance.highlightStrategy = by == 'keyboard'
            ? FocusHighlightStrategy.alwaysTraditional
            : FocusHighlightStrategy.alwaysTouch;
        for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
          await tester.pumpWidget(tanreiTestApp(field(key: UniqueKey(), variant: variant)));
          final TanreiTextFieldVariantStateTokens focused = fieldTokens.variants[variant].focused;
          final TestGesture mouse = await hover(tester);
          if (by == 'keyboard') {
            await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          } else {
            await tester.tap(find.byType(TanreiTextField));
          }
          await settle(tester);
          expect(
            containerOf(tester),
            lightTheme.paint(focused.containerColor),
            reason: variant.name,
          );
          expect(outlineOf(tester), lightTheme.paint(focused.outlineColor), reason: variant.name);
          expect(indicatorOf(tester), lightTheme.paint(focused.activeIndicatorColor));
          expect(labelStyle(tester)!.color, lightTheme.paint(focused.labelColor));
          expect(labelStyle(tester)!.color, light.primary);
          expect(editableOf(tester).cursorColor, lightTheme.paint(focused.caretColor));
          expect(outlineWidthOf(tester), fieldTokens.focused.outlineWidth);
          expect(indicatorWidthOf(tester), fieldTokens.focused.activeIndicatorWidth);
          expect(fieldTokens.focused.outlineWidth, system.measure.borderThick);
          if (variant == TanreiTextFieldVariant.outlined) {
            expect(outlineOf(tester), light.focusRing);
          } else {
            expect(indicatorOf(tester), light.focusRing);
            // Focus draws no state layer, though the field is also hovered.
            expect(
              containerOf(tester),
              lightTheme.paint(fieldTokens.variants.filled.enabled.containerColor),
            );
          }
          await mouse.removePointer();
        }
      });
    }

    testWidgets('TXF-6: under the acme fixture the hovered and focused edges are two different '
        'values of the system', (WidgetTester tester) async {
      const TanreiThemeData theme = TanreiThemeData(system: acmeSystem);
      final TanreiTextFieldVariantTokens outlined = acmeSystem.textField.variants.outlined;
      await tester.pumpWidget(tanreiTestApp(field(), theme: theme));
      await hover(tester);
      expect(outlineOf(tester), theme.paint(outlined.hovered.outlineColor));
      await tester.tap(find.byType(TanreiTextField));
      await settle(tester);
      expect(outlineOf(tester), theme.paint(outlined.focused.outlineColor));
    });
    for (final TanreiSystem shipped in <TanreiSystem>[system, acmeSystem]) {
      testWidgets('TXF-6: selected text is highlighted in comp.text-field.selection.color in every '
          'variant and state ("${shipped.id}")', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final Color selection = theme.paint(shipped.textField.selectionColor);
        expect(
          selection,
          isNot(theme.paint(shipped.textField.variants.outlined.enabled.caretColor)),
        );
        for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
          for (final bool error in <bool>[false, true]) {
            await tester.pumpWidget(
              tanreiTestApp(
                DefaultSelectionStyle(
                  // An app's selection style does not replace the token.
                  selectionColor: const Color(0xFF00FF00),
                  child: field(
                    key: UniqueKey(),
                    variant: variant,
                    isError: error,
                    initialValue: 'ada',
                  ),
                ),
                theme: theme,
              ),
            );
            expect(editableOf(tester).selectionColor, selection, reason: '${variant.name} $error');
            await tester.tap(find.byType(TanreiTextField));
            await settle(tester);
            expect(editableOf(tester).selectionColor, selection, reason: '${variant.name} $error');
          }
        }
        await tester.pumpWidget(
          tanreiTestApp(field(initialValue: 'ada', enabled: false), theme: theme),
        );
        expect(editableOf(tester).selectionColor, selection);
      });
    }
  });

  group('focus indicator', () {
    testWidgets('TXF-7: the focused edge is the focus indicator; no focus ring is drawn', (
      WidgetTester tester,
    ) async {
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(tanreiTestApp(field()));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await settle(tester);
      expect(editableOf(tester).focusNode.hasFocus, isTrue);
      expect(tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible, isFalse);
      expect(outlineWidthOf(tester), system.measure.borderThick);
    });

    testWidgets(
      'TXF-7: where the focus style is glow (acme) the glow is drawn around the container '
      'while focused, by pointer too',
      (WidgetTester tester) async {
        expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
        await tester.pumpWidget(
          tanreiTestApp(field(), theme: const TanreiThemeData(system: acmeSystem)),
        );
        expect(tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible, isFalse);
        await tester.tap(find.byType(TanreiTextField));
        await settle(tester);
        expect(tester.widget<TanreiFocusRing>(find.byType(TanreiFocusRing)).visible, isTrue);
      },
    );
  });

  group('target and press', () {
    testWidgets('TXF-8: a field shorter than the minimum target extends its hit area to '
        'sys.target.touch without changing its visual height', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(field()));
      expect(fieldBox(tester).size.height, fieldTokens.sizes.medium.containerHeight);
      expect(tester.getSize(find.byType(TanreiTapTarget)).height, system.measure.targetTouch);
      final Rect target = tester.getRect(find.byType(TanreiTapTarget));
      await tester.tapAt(Offset(target.center.dx, target.top + 2));
      await tester.pump();
      expect(editableOf(tester).focusNode.hasFocus, isTrue);
    });

    testWidgets('TXF-8: a press on the label, the padding or a decorative icon focuses the input, '
        'and draws no press answer', (WidgetTester tester) async {
      for (final Offset Function(Rect box) where in <Offset Function(Rect)>[
        (Rect box) => box.centerLeft + const Offset(4, 0), // padding
        (Rect box) => box.center, // the resting label's line
        (Rect box) => box.centerRight - const Offset(14, 0), // the trailing icon
      ]) {
        await tester.pumpWidget(
          tanreiTestApp(field(key: UniqueKey(), trailingIcon: fieldGlyph('close'))),
        );
        final Rect box = tester.getRect(find.byType(TanreiTapTarget));
        final Color rest = containerOf(tester);
        final TestGesture touch = await tester.startGesture(where(box));
        await tester.pump();
        expect(containerOf(tester), rest);
        expect(fieldOpacity(tester), 1);
        await touch.up();
        await tester.pump();
        expect(editableOf(tester).focusNode.hasFocus, isTrue);
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pump();
      }
    });

    testWidgets(
      'TXF-8: an interactive element in the trailing slot keeps its own press: a press on '
      'it does not focus the input',
      (WidgetTester tester) async {
        int cleared = 0;
        await tester.pumpWidget(
          tanreiTestApp(
            field(
              trailingIcon: TanreiIconButton(
                onPressed: () => cleared++,
                size: TanreiIconButtonSize.small,
                semanticLabel: 'Clear',
                icon: fieldGlyph('close'),
              ),
            ),
          ),
        );
        await tester.tap(find.byType(TanreiIconButton));
        await tester.pump(const Duration(milliseconds: 200));
        expect(cleared, 1);
        expect(editableOf(tester).focusNode.hasFocus, isFalse);
      },
    );
  });

  group('open keys', () {
    testWidgets('TXF-9: a variant and a size the design system does not have render exactly like '
        'the default values, and debug builds report them', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      Future<FramePixels> draw(TanreiTextFieldVariant variant, TanreiTextFieldSize size) =>
          framePixels(
            tester,
            system: system,
            surface: textFieldGoldenSurface,
            child: field(variant: variant, size: size, initialValue: 'ada'),
          );
      final FramePixels unknown = await draw(
        const TanreiTextFieldVariant('underlined'),
        const TanreiTextFieldSize('huge'),
      );
      expect(reports, contains('text-field variant "underlined" -> outlined'));
      expect(reports, contains('text-field size "huge" -> medium'));
      reports.clear();
      final FramePixels defaults = await draw(
        TanreiTextFieldVariant.outlined,
        TanreiTextFieldSize.medium,
      );
      expect(reports, isEmpty);
      expect(unknown, defaults);
    });

    testWidgets('TXF-9: a type the text field does not know behaves as text, and debug builds '
        'report it', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      expect(TanreiTextFieldType.fromName('date'), TanreiTextFieldType.text);
      expect(reports, <String>['text-field type "date" -> text']);
      expect(TanreiTextFieldType.fromName('email'), TanreiTextFieldType.email);
      expect(reports, hasLength(1));
    });
  });

  group('read-only', () {
    testWidgets('TXF-10: a read-only field is focusable and selectable, lets nobody change the '
        'value, emits nothing, is exposed as read-only and draws its focused state', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> events = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            initialValue: 'ada@example.com',
            readOnly: true,
            onChanged: events.add,
            onCommit: events.add,
          ),
        ),
      );
      expect(
        outlineOf(tester),
        lightTheme.paint(fieldTokens.variants.outlined.enabled.outlineColor),
      );
      await tester.tap(find.byType(TanreiTextField));
      await settle(tester);
      expect(editableOf(tester).focusNode.hasFocus, isTrue);
      expect(editableOf(tester).readOnly, isTrue);
      expect(editableOf(tester).selectionEnabled, isTrue);
      expect(outlineOf(tester), light.focusRing);
      // Select all and copy work as in any field.
      final EditableTextState state = tester.state<EditableTextState>(find.byType(EditableText));
      state.selectAll(SelectionChangedCause.keyboard);
      await tester.pump();
      expect(
        editableOf(tester).controller.selection.textInside('ada@example.com'),
        'ada@example.com',
      );
      editableOf(tester).focusNode.unfocus();
      await tester.pump();
      expect(events, isEmpty);
      final SemanticsData data = semanticsOf(tester);
      expect(data.hasFlag(SemanticsFlag.isReadOnly), isTrue);
      expect(data.hasFlag(SemanticsFlag.isEnabled), isTrue);
      handle.dispose();
    });
  });

  group('error', () {
    for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
      testWidgets('TXF-11: in error a ${variant.name} field draws its error parts at rest, hovered '
          'and focused', (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(field(variant: variant, isError: true, errorText: 'Wrong')),
        );
        final TanreiTextFieldVariantTokens v = fieldTokens.variants[variant];
        void expectError(TanreiTextFieldVariantStateTokens t) {
          expect(containerOf(tester), lightTheme.paint(t.errorContainerColor));
          expect(outlineOf(tester), lightTheme.paint(t.errorOutlineColor));
          expect(indicatorOf(tester), lightTheme.paint(t.errorActiveIndicatorColor));
          expect(labelStyle(tester)!.color, lightTheme.paint(t.errorLabelColor));
          expect(editableOf(tester).cursorColor, lightTheme.paint(t.errorCaretColor));
          expect(
            tester.widget<Text>(find.text('Wrong')).style!.color,
            lightTheme.paint(t.errorSupportingTextColor),
          );
        }

        expectError(v.enabled);
        expect(labelStyle(tester)!.color, light.error);
        await hover(tester);
        expectError(v.hovered);
        await tester.tap(find.byType(TanreiTextField));
        await settle(tester);
        expectError(v.focused);
        expect(labelStyle(tester)!.color, light.error);
        // The focused error edge still thickens.
        expect(
          variant == TanreiTextFieldVariant.outlined
              ? outlineWidthOf(tester)
              : indicatorWidthOf(tester),
          system.measure.borderThick,
        );
      });
    }

    testWidgets('TXF-11: in error the field is exposed as invalid, errorText replaces the '
        'supporting text (which stays while errorText is empty), and the shown text is the '
        'description', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(field(helperText: 'Help')));
      expect(semanticsOf(tester).validationResult, SemanticsValidationResult.none);
      expect(semanticsOf(tester).hint, 'Help');

      await tester.pumpWidget(tanreiTestApp(field(helperText: 'Help', isError: true)));
      expect(find.text('Help'), findsOneWidget);
      expect(semanticsOf(tester).validationResult, SemanticsValidationResult.invalid);

      await tester.pumpWidget(
        tanreiTestApp(field(helperText: 'Help', isError: true, errorText: 'Wrong')),
      );
      expect(find.text('Help'), findsNothing);
      expect(find.text('Wrong'), findsOneWidget);
      expect(semanticsOf(tester).hint, 'Wrong');
      expect(semanticsOf(tester).label, 'Email');
      handle.dispose();
    });

    testWidgets('TXF-12: an error that appears or changes while the input has focus is announced '
        'once, politely; one set while unfocused is only described', (WidgetTester tester) async {
      final List<String> announcements = collectAnnouncements(tester);
      final FocusNode focusNode = FocusNode();
      addTearDown(focusNode.dispose);
      Widget build({required bool error, String text = 'Wrong'}) =>
          tanreiTestApp(field(focusNode: focusNode, isError: error, errorText: text));

      await tester.pumpWidget(build(error: true));
      expect(announcements, isEmpty);
      await tester.pumpWidget(build(error: false));
      focusNode.requestFocus();
      await tester.pump();
      await tester.pumpWidget(build(error: true));
      expect(announcements, <String>['Wrong']);
      await tester.pumpWidget(build(error: true));
      expect(announcements, hasLength(1));
      await tester.pumpWidget(build(error: true, text: 'Still wrong'));
      expect(announcements, <String>['Wrong', 'Still wrong']);
    });
  });

  group('label', () {
    testWidgets('TXF-13: an empty unfocused field rests its label in the input line in the '
        'label style; focus or a value floats it in the floated style', (
      WidgetTester tester,
    ) async {
      final TanreiTextFieldSizeTokens medium = fieldTokens.sizes.medium;
      await tester.pumpWidget(tanreiTestApp(field()));
      expect(floatOf(tester), 0);
      expect(labelStyle(tester)!.fontSize, medium.labelTypescale.size);
      final Rect box = tester.getRect(find.byType(EditableText));
      final Rect label = tester.getRect(find.text('Email'));
      expect(
        label.center.dy,
        moreOrLessEquals(box.top + fieldTokens.sizes.medium.inputTypescale.lineHeight / 2),
      );

      await tester.tap(find.byType(TanreiTextField));
      await settle(tester);
      expect(floatOf(tester), 1);
      expect(labelStyle(tester)!.fontSize, medium.labelFloatedTypescale.size);

      await tester.pumpWidget(tanreiTestApp(field(key: UniqueKey(), initialValue: 'ada')));
      expect(floatOf(tester), 1);

      // A filled field rests its label centred in the container, a multi-line one in its first
      // line (TXF-17).
      Rect layout() => tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      await tester.pumpWidget(tanreiTestApp(field(variant: TanreiTextFieldVariant.filled)));
      expect(tester.getRect(find.text('Email')).center.dy, moreOrLessEquals(layout().center.dy));
      await tester.pumpWidget(
        tanreiTestApp(field(variant: TanreiTextFieldVariant.filled, multiline: true, minLines: 3)),
      );
      expect(
        tester.getRect(find.text('Email')).center.dy,
        moreOrLessEquals(
          tester.getRect(find.byType(EditableText)).top + medium.inputTypescale.lineHeight / 2,
        ),
      );
    });

    testWidgets(
      'TXF-13: an outlined field floats the label onto its top edge, centred on the line, '
      'with a gap of outline.notch-padding on each side',
      (WidgetTester tester) async {
        await tester.pumpWidget(tanreiTestApp(field(initialValue: 'ada')));
        final Rect box = tester.getRect(
          find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
        );
        final Rect label = tester.getRect(find.text('Email'));
        expect(label.center.dy, moreOrLessEquals(box.top + fieldTokens.outlineWidth / 2));
        final Rect notch = notchOf(tester)!;
        final double pad = fieldTokens.outlineNotchPadding;
        expect(notch.left, moreOrLessEquals(label.left - box.left - pad));
        expect(notch.right, moreOrLessEquals(label.right - box.left + pad));
        expect(boxProperty<bool>(tester, 'labelOnEdge'), isTrue);
      },
    );

    testWidgets('TXF-13: a filled field floats the label to the top of the container, above the '
        'input line, and opens no gap', (WidgetTester tester) async {
      final TanreiTextFieldSizeTokens medium = fieldTokens.sizes.medium;
      await tester.pumpWidget(
        tanreiTestApp(field(variant: TanreiTextFieldVariant.filled, initialValue: 'ada')),
      );
      final Rect box = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      final Rect label = tester.getRect(find.text('Email'));
      expect(label.top - box.top, moreOrLessEquals(medium.containerPaddingBlockWithLabel));
      expect(label.bottom, lessThanOrEqualTo(tester.getRect(find.byType(EditableText)).top + 0.01));
      expect(notchOf(tester), isNull);
    });

    testWidgets('TXF-13: in a narrow field a label that does not fit wraps, resting and floated, '
        'and is never cut or drawn over the input: the container grows to hold a resting label, a '
        'filled field\'s band above the input holds the floated lines, an outlined field keeps the '
        'last line on its edge with room reserved above for the others, and the gap opens by the '
        'widest line', (WidgetTester tester) async {
      const String long = 'Destination airport';
      final TanreiTextFieldSizeTokens medium = fieldTokens.sizes.medium;
      final double floatedLine = medium.labelFloatedTypescale.lineHeight;
      Rect layout() => tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      RenderParagraph paragraph(String label) => tester.renderObject<RenderParagraph>(
        find.descendant(of: find.text(label), matching: find.byType(RichText)),
      );
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
        Future<void> pumpField(String value, [String labelText = long]) => tester.pumpWidget(
          tanreiTestApp(
            field(
              key: ValueKey<String>('${variant.name}-$value-$labelText'),
              variant: variant,
              labelText: labelText,
              initialValue: value,
              width: 96,
            ),
          ),
        );
        // A label that fits, at the same width: one floated line, and how far it reaches toward
        // the input (an outlined field's straddles the edge).
        await pumpField('ada', 'Email');
        final double oneLineHeight = layout().height;
        final double oneLineReach =
            tester.getRect(find.text('Email')).bottom -
            tester.getRect(find.byType(EditableText)).top;

        // Resting: wrapped inside the container, which has grown to hold it.
        await pumpField('');
        expect(tester.takeException(), isNull);
        final Rect restBox = layout();
        final Rect rest = tester.getRect(find.text(long));
        final double pad = variant == TanreiTextFieldVariant.filled
            ? medium.containerPaddingBlockWithLabel
            : medium.containerPaddingBlock;
        expect(
          rest.height,
          greaterThan(medium.labelTypescale.lineHeight * 1.5),
          reason: variant.name,
        );
        expect(paragraph(long).didExceedMaxLines, isFalse, reason: variant.name);
        expect(rest.top, greaterThanOrEqualTo(restBox.top + pad - 0.01), reason: variant.name);
        expect(rest.bottom, lessThanOrEqualTo(restBox.bottom - pad + 0.01), reason: variant.name);
        expect(restBox.height, greaterThan(oneLineHeight), reason: variant.name);
        final Rect restWhole = tester.getRect(find.byType(TanreiTextField));

        // Floated: wrapped, whole, and never over the input or the value.
        await pumpField('ada');
        expect(tester.takeException(), isNull);
        final Rect box = layout();
        final Rect label = tester.getRect(find.text(long));
        final Rect input = tester.getRect(find.byType(EditableText));
        expect(label.height, greaterThan(floatedLine * 1.5), reason: variant.name);
        expect(paragraph(long).didExceedMaxLines, isFalse, reason: variant.name);
        expect(label.right, lessThanOrEqualTo(box.right + 0.01), reason: variant.name);
        expect(
          label.bottom - input.top,
          lessThanOrEqualTo(oneLineReach + 0.01),
          reason: '${variant.name}: no nearer the input than one line',
        );
        expect(semanticsOf(tester).label, long, reason: variant.name);
        // TXF-13, TXF-16: neither variant changes height when its label floats — neither its
        // container nor the whole field (an outlined field keeps the room above reserved at rest).
        expect(box.height, moreOrLessEquals(restBox.height), reason: variant.name);
        expect(
          tester.getSize(find.byType(TanreiTextField)).height,
          moreOrLessEquals(restWhole.height),
          reason: variant.name,
        );
        if (variant == TanreiTextFieldVariant.filled) {
          expect(label.top - box.top, moreOrLessEquals(medium.containerPaddingBlockWithLabel));
          expect(label.bottom, lessThanOrEqualTo(input.top + 0.01));
        } else {
          // The last line centred on the edge; the lines above it in room the field reserves
          // above its container, so that no more of the label reaches past the field than one
          // line's upper half.
          expect(
            label.bottom,
            moreOrLessEquals(box.top + fieldTokens.outlineWidth / 2 + floatedLine / 2),
          );
          final Rect whole = tester.getRect(find.byType(TanreiTextField));
          // The room above the container is reserved at rest too.
          expect(restBox.top - restWhole.top, moreOrLessEquals(box.top - whole.top));
          expect(label.top, greaterThanOrEqualTo(whole.top - floatedLine / 2 - 0.01));
          expect(box.top - whole.top, greaterThanOrEqualTo(label.height - floatedLine - 0.01));
          // The gap opens by the widest line.
          final Rect notch = notchOf(tester)!;
          final double notchPad = fieldTokens.outlineNotchPadding;
          final double widest = paragraph(long).size.width;
          expect(label.width, moreOrLessEquals(widest));
          expect(notch.left, moreOrLessEquals(label.left - box.left - notchPad));
          expect(notch.right, moreOrLessEquals(label.right - box.left + notchPad));
          expect(
            notch.width,
            lessThan(box.width - 2 * medium.containerPaddingInline + 2 * notchPad + 0.01),
          );
        }
      }
      handle.dispose();
    });

    testWidgets('TXF-14: the label floats over comp.text-field.motion.label-duration with its '
        'easing, colors and widths change over the state motion, and nothing moves where motion is '
        'reduced', (WidgetTester tester) async {
      final Duration label = tanreiDuration(fieldTokens.motionLabelDuration);
      final Duration state = tanreiDuration(fieldTokens.motionStateDuration);
      await tester.pumpWidget(tanreiTestApp(field()));
      await tester.tap(find.byType(TanreiTextField));
      await tester.pump();
      await tester.pump(label ~/ 2);
      final double halfway = fieldTokens.motionLabelEasing.toCurve().transform(0.5);
      expect(floatOf(tester), moreOrLessEquals(halfway, epsilon: 0.02));
      // The gap opens with the float, from the label's centre.
      final double gap = notchOf(tester)!.width;
      expect(gap, greaterThan(0));
      final double width = outlineWidthOf(tester);
      expect(width, greaterThan(fieldTokens.outlineWidth));
      expect(width, lessThan(fieldTokens.focused.outlineWidth));
      await tester.pump(state);
      expect(floatOf(tester), 1);
      expect(notchOf(tester)!.width, greaterThan(gap));
      expect(outlineWidthOf(tester), fieldTokens.focused.outlineWidth);

      await tester.pumpWidget(tanreiTestApp(field(key: UniqueKey()), disableAnimations: true));
      await tester.tap(find.byType(TanreiTextField));
      await tester.pump();
      expect(floatOf(tester), 1);
      expect(outlineWidthOf(tester), fieldTokens.focused.outlineWidth);
    });

    testWidgets(
      'TXF-15: a hidden or empty label is not drawn; the placeholder shows only while the '
      'label is floated or not drawn, and so do the prefix and suffix',
      (WidgetTester tester) async {
        final List<String> reports = collectMissingNames();
        await tester.pumpWidget(
          tanreiTestApp(field(labelHidden: true, hintText: 'Search components')),
        );
        expect(labelStyle(tester), isNull);
        expect(find.text('Search components'), findsOneWidget);
        await tester.pumpWidget(tanreiTestApp(field(labelText: '', hintText: 'Hint')));
        expect(find.text('Hint'), findsOneWidget);
        expect(reports, <String>['text-field']);

        // Drawn and resting: no placeholder, no affixes.
        await tester.pumpWidget(
          tanreiTestApp(
            field(key: UniqueKey(), hintText: 'Hint', prefixText: r'$', suffixText: 'USD'),
          ),
        );
        expect(find.text('Hint'), findsNothing);
        expect(find.text(r'$'), findsNothing);
        expect(find.text('USD'), findsNothing);
        await tester.tap(find.byType(TanreiTextField));
        await settle(tester);
        expect(find.text('Hint'), findsOneWidget);
        expect(find.text(r'$'), findsOneWidget);
        expect(find.text('USD'), findsOneWidget);
        // The prefix sits affix.gap before the value, in the input's style and the affix color.
        final Text prefix = tester.widget<Text>(find.text(r'$'));
        expect(prefix.style!.fontSize, fieldTokens.sizes.medium.inputTypescale.size);
        expect(
          prefix.style!.color,
          lightTheme.paint(fieldTokens.variants.outlined.focused.affixColor),
        );
        expect(
          tester.getRect(find.byType(EditableText)).left - tester.getRect(find.text(r'$')).right,
          fieldTokens.affixGap,
        );
        // While shown, the affixes are read with the value: part of the description.
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pump();
        expect(semanticsOf(tester).hint, r'$ USD');
        expect(semanticsOf(tester).label, 'Email');
        // The suffix sits at the end of the input line, affix.gap after the input.
        expect(
          tester.getRect(find.text('USD')).left - tester.getRect(find.byType(EditableText)).right,
          fieldTokens.affixGap,
        );
        // With a value the placeholder goes.
        await tester.enterText(find.byType(TanreiTextField), '12');
        await tester.pump();
        expect(find.text('Hint'), findsNothing);
        handle.dispose();
      },
    );
  });

  group('geometry', () {
    testWidgets('TXF-16: the minimum heights — 36 / 40, and a filled field that draws its label '
        'tall enough for both lines from the start (46 / 50)', (WidgetTester tester) async {
      final Map<(TanreiTextFieldVariant, TanreiTextFieldSize, bool), double> expected =
          <(TanreiTextFieldVariant, TanreiTextFieldSize, bool), double>{
            (TanreiTextFieldVariant.outlined, TanreiTextFieldSize.medium, false): 36,
            (TanreiTextFieldVariant.outlined, TanreiTextFieldSize.large, false): 40,
            (TanreiTextFieldVariant.filled, TanreiTextFieldSize.medium, false): 46,
            (TanreiTextFieldVariant.filled, TanreiTextFieldSize.large, false): 50,
            (TanreiTextFieldVariant.filled, TanreiTextFieldSize.medium, true): 36,
          };
      for (final MapEntry<(TanreiTextFieldVariant, TanreiTextFieldSize, bool), double> entry
          in expected.entries) {
        final (TanreiTextFieldVariant variant, TanreiTextFieldSize size, bool hidden) = entry.key;
        final TanreiTextFieldSizeTokens s = fieldTokens.sizes[size];
        final double tokenHeight = hidden || variant == TanreiTextFieldVariant.outlined
            ? s.containerHeight
            : 2 * s.containerPaddingBlockWithLabel +
                  s.labelFloatedTypescale.lineHeight +
                  s.inputTypescale.lineHeight;
        expect(tokenHeight, entry.value, reason: '${entry.key}');
        for (final String value in <String>['', 'ada']) {
          await tester.pumpWidget(
            tanreiTestApp(
              field(variant: variant, size: size, labelHidden: hidden, initialValue: value),
            ),
          );
          expect(fieldBox(tester).size.height, entry.value, reason: '${entry.key} "$value"');
        }
      }
    });

    testWidgets('TXF-16: the text is padded by container.padding-inline and an icon by '
        'padding-inline-with-icon, and the corners follow container.shape / shape-bottom', (
      WidgetTester tester,
    ) async {
      final TanreiTextFieldSizeTokens medium = fieldTokens.sizes.medium;
      await tester.pumpWidget(tanreiTestApp(field(initialValue: 'ada')));
      Rect box = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      expect(
        tester.getRect(find.byType(EditableText)).left - box.left,
        medium.containerPaddingInline,
      );
      expect(boxProperty<TanreiCornerShape>(tester, 'shape').radius, fieldTokens.containerShape);
      expect(boxProperty<double>(tester, 'bottomRadius'), fieldTokens.containerShape);

      await tester.pumpWidget(
        tanreiTestApp(
          field(
            variant: TanreiTextFieldVariant.filled,
            leadingIcon: fieldGlyph('search'),
            trailingIcon: fieldGlyph('close'),
          ),
        ),
      );
      box = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      final Rect lead = tester.getRect(
        find.text(String.fromCharCode(fieldIconCodePoints['search']!)),
      );
      final Rect trail = tester.getRect(
        find.text(String.fromCharCode(fieldIconCodePoints['close']!)),
      );
      expect(lead.left - box.left, medium.containerPaddingInlineWithIcon);
      expect(box.right - trail.right, medium.containerPaddingInlineWithIcon);
      expect(tester.getRect(find.byType(EditableText)).left - lead.right, medium.containerGap);
      expect(boxProperty<double>(tester, 'bottomRadius'), fieldTokens.containerShapeBottom);

      // The filled field's bottom corners are square, its top corners round.
      final FramePixels pixels = await framePixels(
        tester,
        system: system,
        surface: textFieldGoldenSurface,
        child: field(variant: TanreiTextFieldVariant.filled),
      );
      final Rect filled = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      final Rect frame = tester.getRect(find.byType(RepaintBoundary).first);
      Offset at(Offset p) => p - frame.topLeft;
      expect(
        pixels.atLogical(at(filled.topLeft + const Offset(0.5, 0.5))),
        looksLike(light.surface),
      );
      expect(
        pixels.atLogical(at(filled.bottomLeft + const Offset(0.5, -3))),
        looksLike(light.surfaceContainerHighest),
      );
    });

    testWidgets('TXF-16: at 200 % text size the field grows and clips nothing; a label, the input '
        'and the supporting text stay whole', (WidgetTester tester) async {
      Future<double> heightAt(double scale, TanreiTextFieldVariant variant) async {
        await tester.pumpWidget(
          tanreiTestApp(
            MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(scale)),
              child: field(variant: variant, initialValue: 'ada', helperText: 'Help'),
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        final Rect box = tester.getRect(
          find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
        );
        final Rect input = tester.getRect(find.byType(EditableText));
        expect(input.top >= box.top && input.bottom <= box.bottom, isTrue);
        return box.height;
      }

      for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
        final double normal = await heightAt(1, variant);
        final double large = await heightAt(2, variant);
        expect(large, greaterThan(normal), reason: variant.name);
      }
    });

    testWidgets('TXF-17: a multi-line field starts at minRows lines, grows to maxRows, scrolls '
        'beyond, and aligns its icons with the first line', (WidgetTester tester) async {
      final double line = fieldTokens.sizes.medium.inputTypescale.lineHeight;
      final double padding = 2 * fieldTokens.sizes.medium.containerPaddingBlock;
      final TextEditingController controller = TextEditingController();
      addTearDown(controller.dispose);
      Widget build({int? maxLines}) => tanreiTestApp(
        field(
          controller: controller,
          multiline: true,
          minLines: 3,
          maxLines: maxLines,
          leadingIcon: fieldGlyph('search'),
        ),
      );
      await tester.pumpWidget(build(maxLines: 5));
      expect(fieldBox(tester).size.height, 3 * line + padding);
      controller.text = 'a\nb\nc\nd';
      await tester.pump();
      expect(fieldBox(tester).size.height, 4 * line + padding);
      controller.text = 'a\nb\nc\nd\ne\nf\ng';
      await tester.pump();
      expect(fieldBox(tester).size.height, 5 * line + padding);
      await tester.pumpWidget(build());
      expect(fieldBox(tester).size.height, 7 * line + padding);
      // The icon is centred on the first line.
      final Rect icon = tester.getRect(
        find.text(String.fromCharCode(fieldIconCodePoints['search']!)),
      );
      final Rect input = tester.getRect(find.byType(EditableText));
      expect(icon.center.dy, moreOrLessEquals(input.top + line / 2));
      // maxRows smaller than minRows: minRows.
      await tester.pumpWidget(
        tanreiTestApp(field(key: UniqueKey(), multiline: true, minLines: 3, maxLines: 1)),
      );
      expect(editableOf(tester).maxLines, 3);
    });

    testWidgets('TXF-17: a password stays single-line, and debug builds report a multi-line one', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(field(type: TanreiTextFieldType.password, multiline: true)),
      );
      final Object? reported = tester.takeException();
      expect('$reported', contains('password text field cannot be multi-line'));
      expect(editableOf(tester).maxLines, 1);
      expect(editableOf(tester).obscureText, isTrue);
    });
  });

  group('length and counter', () {
    testWidgets(
      'TXF-18: maxLength counts user-perceived characters: an emoji or an accented letter '
      'counts once, an edit past it is refused and a paste is shortened; a value the product sets '
      'is not',
      (WidgetTester tester) async {
        final TextEditingController controller = TextEditingController();
        addTearDown(controller.dispose);
        await tester.pumpWidget(
          tanreiTestApp(field(controller: controller, maxLength: 3, showCounter: true)),
        );
        await tester.enterText(find.byType(TanreiTextField), '👍🏽é');
        await tester.pump();
        expect(controller.text, '👍🏽é');
        expect(find.text('2/3'), findsOneWidget);
        await tester.enterText(find.byType(TanreiTextField), '👍🏽éab');
        await tester.pump();
        expect(controller.text, '👍🏽éa');
        expect(find.text('3/3'), findsOneWidget);
        controller.text = 'abcdef';
        await tester.pump();
        expect(editableOf(tester).controller.text, 'abcdef');
        expect(find.text('6/3'), findsOneWidget);
      },
    );

    testWidgets(
      'TXF-19: the supporting text sits supporting-text.gap below the container, aligned '
      'with the input text, and the counter at the end of the row, both in the supporting style',
      (WidgetTester tester) async {
        await tester.pumpWidget(
          tanreiTestApp(
            field(initialValue: 'Ada', helperText: 'Help', showCounter: true, maxLength: 40),
          ),
        );
        final Rect box = tester.getRect(find.byType(TanreiTapTarget));
        final Rect visual = tester.getRect(
          find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
        );
        final Rect help = tester.getRect(find.text('Help'));
        final Rect count = tester.getRect(find.text('3/40'));
        expect(help.top - box.bottom, fieldTokens.supportingTextGap);
        expect(help.left, tester.getRect(find.byType(EditableText)).left);
        expect(count.right, visual.right - fieldTokens.sizes.medium.containerPaddingInline);
        // At least container.gap from the text.
        expect(count.left - help.right, fieldTokens.sizes.medium.containerGap);
        expect(
          tester.widget<Text>(find.text('Help')).style!.fontSize,
          fieldTokens.supportingTextTypescale.size,
        );
        expect(
          tester.widget<Text>(find.text('3/40')).style!.color,
          lightTheme.paint(fieldTokens.variants.outlined.enabled.counterColor),
        );
      },
    );

    testWidgets('TXF-19: the count is part of the description and is announced once, as the '
        'counter\'s visible text, when typing pauses for a second, never on every keystroke', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> announcements = collectAnnouncements(tester);
      await tester.pumpWidget(tanreiTestApp(field(showCounter: true, maxLength: 10)));
      expect(semanticsOf(tester).hint, '0/10');
      await tester.enterText(find.byType(TanreiTextField), 'a');
      await tester.pump(const Duration(milliseconds: 500));
      await tester.enterText(find.byType(TanreiTextField), 'ab');
      await tester.pump(const Duration(milliseconds: 500));
      await tester.enterText(find.byType(TanreiTextField), 'abc');
      await tester.pump(const Duration(milliseconds: 999));
      expect(announcements, isEmpty);
      await tester.pump(const Duration(milliseconds: 1));
      expect(announcements, <String>['3/10']);
      await tester.pump(const Duration(seconds: 3));
      expect(announcements, hasLength(1));
      expect(semanticsOf(tester).hint, '3/10');
      expect(semanticsOf(tester).maxValueLength, 10);
      expect(semanticsOf(tester).currentValueLength, 3);
      handle.dispose();
    });
  });

  group('input types', () {
    testWidgets('TXF-20: each type sets its keyboard, autocorrection and obscured entry; number '
        'keeps its value a string', (WidgetTester tester) async {
      final Map<TanreiTextFieldType, (TextInputType, bool, bool)> expected =
          <TanreiTextFieldType, (TextInputType, bool, bool)>{
            // keyboard, obscured, autocorrect
            TanreiTextFieldType.text: (TextInputType.text, false, true),
            TanreiTextFieldType.email: (TextInputType.emailAddress, false, false),
            TanreiTextFieldType.password: (TextInputType.visiblePassword, true, false),
            TanreiTextFieldType.number: (
              const TextInputType.numberWithOptions(decimal: true),
              false,
              false,
            ),
            TanreiTextFieldType.search: (TextInputType.text, false, true),
            TanreiTextFieldType.tel: (TextInputType.phone, false, false),
            TanreiTextFieldType.url: (TextInputType.url, false, false),
          };
      expect(expected.keys, TanreiTextFieldType.values);
      for (final MapEntry<TanreiTextFieldType, (TextInputType, bool, bool)> entry
          in expected.entries) {
        await tester.pumpWidget(tanreiTestApp(field(type: entry.key)));
        final EditableText editable = editableOf(tester);
        expect(editable.keyboardType, entry.value.$1, reason: entry.key.name);
        expect(editable.obscureText, entry.value.$2, reason: entry.key.name);
        expect(editable.autocorrect, entry.value.$3, reason: entry.key.name);
        expect(editable.textCapitalization, TextCapitalization.none, reason: entry.key.name);
        expect(
          editable.textInputAction,
          entry.key == TanreiTextFieldType.search ? TextInputAction.search : null,
          reason: entry.key.name,
        );
      }
      final List<String> changed = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(field(type: TanreiTextFieldType.number, onChanged: changed.add)),
      );
      await tester.enterText(find.byType(TanreiTextField), '007.50');
      expect(changed, <String>['007.50']);
    });

    testWidgets('TXF-20: a search field is exposed as a search box; a password\'s value is '
        'obscured to assistive technology', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(tanreiTestApp(field(type: TanreiTextFieldType.search)));
      expect(semanticsOf(tester).inputType, SemanticsInputType.search);
      await tester.pumpWidget(
        tanreiTestApp(field(type: TanreiTextFieldType.password, initialValue: 'secret')),
      );
      expect(semanticsOf(tester).hasFlag(SemanticsFlag.isObscured), isTrue);
      expect(semanticsOf(tester).value, isNot(contains('secret')));
      handle.dispose();
    });

    testWidgets('TXF-21: autocomplete is passed as the autofill hint, mapped from HTML names; an '
        'autofill emits input and floats the label', (WidgetTester tester) async {
      expect(TanreiTextField.autofillHintsFromHtml('email'), <String>[AutofillHints.email]);
      expect(TanreiTextField.autofillHintsFromHtml('section-a shipping postal-code'), <String>[
        AutofillHints.postalCode,
      ]);
      expect(TanreiTextField.autofillHintsFromHtml('current-password'), <String>[
        AutofillHints.password,
      ]);
      expect(TanreiTextField.autofillHintsFromHtml('one-time-code'), <String>[
        AutofillHints.oneTimeCode,
      ]);
      expect(TanreiTextField.autofillHintsFromHtml(''), isNull);

      final List<String> changed = <String>[];
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            autofillHints: TanreiTextField.autofillHintsFromHtml('email'),
            onChanged: changed.add,
          ),
        ),
      );
      expect(editableOf(tester).autofillHints, <String>[AutofillHints.email]);
      expect(floatOf(tester), 0);
      // The platform fills the focused field (and, through its autofill group, the others): an
      // editing value that arrives from outside, an input like any other.
      await tester.showKeyboard(find.byType(TanreiTextField));
      tester.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: 'ada@example.com',
          selection: TextSelection.collapsed(offset: 15),
        ),
      );
      await settle(tester);
      expect(changed, <String>['ada@example.com']);
      // Filled, the label stays floated once focus leaves.
      FocusManager.instance.primaryFocus?.unfocus();
      await settle(tester);
      expect(floatOf(tester), 1);
    });
  });

  group('icons', () {
    testWidgets('TXF-22: an icon is drawn at icon.size with the family and fill of an unselected '
        'icon, the system weight and a clamped optical size, in its part\'s color, container.gap '
        'from the text', (WidgetTester tester) async {
      for (final TanreiTextFieldSize size in TanreiTextFieldSize.core) {
        await tester.pumpWidget(
          tanreiTestApp(
            field(
              size: size,
              initialValue: 'tanrei',
              leadingIcon: fieldGlyph('search'),
              trailingIcon: fieldGlyph('close'),
              isError: true,
            ),
          ),
        );
        final TanreiTextFieldSizeTokens s = fieldTokens.sizes[size];
        final TanreiTextFieldVariantStateTokens rest = fieldTokens.variants.outlined.enabled;
        final Finder lead = find.text(String.fromCharCode(fieldIconCodePoints['search']!));
        final Finder trail = find.text(String.fromCharCode(fieldIconCodePoints['close']!));
        expect(tester.getSize(lead), Size.square(s.iconSize), reason: size.name);
        final IconThemeData theme = IconTheme.of(tester.element(lead));
        expect(theme.size, s.iconSize);
        expect(theme.fill, system.icon.fill(selected: false));
        expect(theme.weight, system.icon.weight);
        expect(
          theme.opticalSize,
          s.iconSize.clamp(system.icon.opticalSizeMin, system.icon.opticalSizeMax),
        );
        expect(
          DefaultTextStyle.of(tester.element(lead)).style.fontFamily,
          system.icon.family(selected: false),
        );
        // In error the leading icon keeps its color and the trailing one turns to error.
        expect(theme.color, lightTheme.paint(rest.errorLeadingIconColor));
        expect(
          IconTheme.of(tester.element(trail)).color,
          lightTheme.paint(rest.errorTrailingIconColor),
        );
        expect(IconTheme.of(tester.element(trail)).color, light.error);
        expect(
          tester.getRect(find.byType(EditableText)).left - tester.getRect(lead).right,
          s.containerGap,
        );
      }
    });

    testWidgets('TXF-22: a product\'s icon button in the trailing slot keeps its own tokens and is '
        'its own focus stop after the input', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tester.pumpWidget(
        tanreiTestApp(
          field(
            trailingIcon: TanreiIconButton(
              onPressed: () {},
              size: TanreiIconButtonSize.small,
              semanticLabel: 'Clear',
              icon: fieldGlyph('close'),
            ),
          ),
        ),
      );
      final Finder glyph = find.text(String.fromCharCode(fieldIconCodePoints['close']!));
      expect(tester.getSize(glyph), Size.square(system.iconButton.sizes.small.iconSize));
      expect(
        IconTheme.of(tester.element(glyph)).color,
        lightTheme.paint(system.iconButton.variants.standard.enabled.iconColor),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(editableOf(tester).focusNode.hasFocus, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(editableOf(tester).focusNode.hasFocus, isFalse);
      expect(tester.getSemantics(find.byType(TanreiIconButton)).label, 'Clear');
      handle.dispose();
    });
  });

  group('accessibility semantics', () {
    testWidgets('TXF-23: the label is the name, drawn or hidden, and never the placeholder; '
        'required is exposed and draws no mark', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final bool hidden in <bool>[false, true]) {
        await tester.pumpWidget(
          tanreiTestApp(field(labelHidden: hidden, hintText: 'you@example.com', isRequired: true)),
        );
        final SemanticsData data = semanticsOf(tester);
        expect(data.label, 'Email', reason: 'hidden: $hidden');
        expect(data.label, isNot(contains('you@example.com')));
        expect(data.hasFlag(SemanticsFlag.isTextField), isTrue);
        expect(data.hasFlag(SemanticsFlag.hasRequiredState), isTrue);
        expect(data.hasFlag(SemanticsFlag.isRequired), isTrue);
        expect(find.textContaining('*'), findsNothing);
      }
      await tester.pumpWidget(tanreiTestApp(field()));
      expect(semanticsOf(tester).hasFlag(SemanticsFlag.isRequired), isFalse);
      // Exactly one node: the text field, with nothing merged into it that is drawn beside it.
      expect(tester.getSemantics(find.text('Email')).getSemanticsData().label, 'Email');
      handle.dispose();
    });

    testWidgets('TXF-23: an empty label still renders, and debug builds report it once, with what '
        'to set', (WidgetTester tester) async {
      await tester.pumpWidget(tanreiTestApp(field(labelText: '')));
      final Object? reported = tester.takeException();
      expect('$reported', contains('text-field has no accessible name'));
      expect('$reported', contains('labelText'));
      expect(find.byType(EditableText), findsOneWidget);
      await tester.pumpWidget(tanreiTestApp(field(labelText: '', initialValue: 'x')));
      expect(tester.takeException(), isNull);
    });

    for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        testWidgets('guidelines: ${variant.name} on ${theme.brightness.name}', (
          WidgetTester tester,
        ) async {
          final SemanticsHandle handle = tester.ensureSemantics();
          await tester.pumpWidget(
            tanreiTestApp(
              field(variant: variant, initialValue: 'ada@example.com', helperText: 'Help'),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
          handle.dispose();
        });
      }
    }

    // WCAG 1.4.11: the field's boundary (outline or indicator) needs 3:1 against the surface at
    // rest, and the focused edge — its focus indicator — as well.
    for (final Brightness brightness in Brightness.values) {
      for (final TanreiContrast contrast in TanreiContrast.values) {
        final TanreiThemeData theme = TanreiThemeData(brightness: brightness, contrast: contrast);
        test('non-text contrast: the edge of each variant at rest and focused in the '
            '${brightness.name} ${contrast.name} scheme meets 3:1', () {
          final List<String> failures = <String>[];
          for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
            final TanreiTextFieldVariantTokens v = fieldTokens.variants[variant];
            for (final TanreiTextFieldVariantStateTokens t in <TanreiTextFieldVariantStateTokens>[
              v.enabled,
              v.focused,
            ]) {
              final Color container = Color.alphaBlend(
                theme.paint(t.containerColor),
                theme.colors.surface,
              );
              final Color edge = Color.alphaBlend(
                theme.paint(
                  variant == TanreiTextFieldVariant.outlined
                      ? t.outlineColor
                      : t.activeIndicatorColor,
                ),
                container,
              );
              final double ratio = contrastOf(edge, theme.colors.surface);
              if (ratio < 3) {
                failures.add('${variant.name}: ${ratio.toStringAsFixed(2)}');
              }
            }
          }
          expect(failures, isEmpty);
        });
      }
    }
  });

  group('right to left', () {
    testWidgets('TXF-24: in right-to-left the layout mirrors — leading icon and label on the '
        'right, the supporting text on the right and the counter on the left', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tanreiTestApp(
          Directionality(
            textDirection: TextDirection.rtl,
            child: field(
              labelText: 'Search',
              initialValue: 'שלום',
              leadingIcon: fieldGlyph('search'),
              helperText: 'Help',
              showCounter: true,
            ),
          ),
        ),
      );
      final Rect box = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      final Rect lead = tester.getRect(
        find.text(String.fromCharCode(fieldIconCodePoints['search']!)),
      );
      expect(box.right - lead.right, fieldTokens.sizes.medium.containerPaddingInlineWithIcon);
      final Rect label = tester.getRect(find.text('Search'));
      expect(box.right - label.right, fieldTokens.sizes.medium.containerPaddingInline);
      expect(
        tester.getRect(find.text('Help')).right,
        tester.getRect(find.byType(EditableText)).right,
      );
      expect(
        tester.getRect(find.text('4')).left,
        box.left + fieldTokens.sizes.medium.containerPaddingInline,
      );
      expect(editableOf(tester).textDirection, TextDirection.rtl);
    });

    testWidgets(
      'TXF-24: typed text is laid out by its own direction, and an email, url, tel, number '
      'or password value left to right at the field\'s start edge',
      (WidgetTester tester) async {
        Future<EditableText> inRtl(TanreiTextFieldType type, String value) async {
          await tester.pumpWidget(
            tanreiTestApp(
              Directionality(
                textDirection: TextDirection.rtl,
                child: field(key: UniqueKey(), type: type, initialValue: value),
              ),
            ),
          );
          return editableOf(tester);
        }

        EditableText editable = await inRtl(TanreiTextFieldType.text, 'hello');
        expect(editable.textDirection, TextDirection.ltr);
        editable = await inRtl(TanreiTextFieldType.text, 'שלום');
        expect(editable.textDirection, TextDirection.rtl);
        for (final TanreiTextFieldType type in <TanreiTextFieldType>[
          TanreiTextFieldType.email,
          TanreiTextFieldType.url,
          TanreiTextFieldType.tel,
          TanreiTextFieldType.number,
          TanreiTextFieldType.password,
        ]) {
          editable = await inRtl(type, 'שלום');
          expect(editable.textDirection, TextDirection.ltr, reason: type.name);
          expect(editable.textAlign, TextAlign.right, reason: type.name);
        }
      },
    );
  });

  group('a design system drives rendering', () {
    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": each variant at rest draws the enabled tokens of that system', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        for (final TanreiTextFieldVariant variant in TanreiTextFieldVariant.core) {
          await tester.pumpWidget(
            tanreiTestApp(
              field(variant: variant, initialValue: 'ada'),
              theme: theme,
            ),
          );
          final TanreiTextFieldVariantStateTokens rest =
              shipped.textField.variants[variant].enabled;
          expect(containerOf(tester), theme.paint(rest.containerColor), reason: variant.name);
          expect(outlineOf(tester), theme.paint(rest.outlineColor), reason: variant.name);
          expect(indicatorOf(tester), theme.paint(rest.activeIndicatorColor), reason: variant.name);
          expect(editableOf(tester).style.color, theme.paint(rest.inputColor));
          expect(
            boxProperty<TanreiCornerShape>(tester, 'shape').smoothing,
            shipped.shape.cornerSmoothing,
          );
          expect(
            fieldBox(tester).size.height,
            greaterThanOrEqualTo(shipped.textField.sizes.medium.containerHeight),
          );
        }
      });
    }

    testWidgets('cupertino: no hover and no focus change of the edge (a hairline, at rest)', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData theme = TanreiThemeData(system: cupertinoSystem);
      await tester.pumpWidget(tanreiTestApp(field(), theme: theme));
      final Color rest = outlineOf(tester);
      await hover(tester);
      expect(outlineOf(tester), rest);
      await tester.tap(find.byType(TanreiTextField));
      await settle(tester);
      expect(outlineOf(tester), rest);
      expect(outlineWidthOf(tester), cupertinoSystem.measure.borderHairline);
    });

    testWidgets('size tokens of a product system drive the field', (WidgetTester tester) async {
      final TanreiSystem product = system.copyWith(
        textField: fieldTokens.copyWith(
          containerShape: 12,
          sizes: fieldTokens.sizes.copyWith(
            medium: fieldTokens.sizes.medium.copyWith(
              containerHeight: 52,
              containerPaddingInline: 20,
            ),
          ),
        ),
      );
      await tester.pumpWidget(
        tanreiTestApp(
          field(initialValue: 'ada'),
          theme: TanreiThemeData(system: product),
        ),
      );
      expect(fieldBox(tester).size.height, 52);
      final Rect box = tester.getRect(
        find.byWidgetPredicate((Widget w) => w.runtimeType.toString() == '_FieldLayout'),
      );
      expect(tester.getRect(find.byType(EditableText)).left - box.left, 20);
      expect(boxProperty<TanreiCornerShape>(tester, 'shape').radius, 12);
    });
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('text-field');

    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'outlined-empty',
        'outlined-filled',
        'filled-empty',
        'filled-filled',
        'outlined-large',
        'filled-large',
        'outlined-label-hidden',
        'outlined-supporting',
        'outlined-error',
        'filled-error',
        'outlined-disabled',
        'filled-disabled',
        'outlined-read-only',
        'outlined-icons',
        'outlined-affixes',
        'outlined-counter',
        'outlined-multiline',
        'filled-multiline',
        'outlined-password',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: textFieldGoldenSurface,
          child: fixtureField(
            fixture['props'] as Map<String, dynamic>,
            content: fixture['content'] as String?,
          ),
          file: 'goldens/text_field/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: an outlined field with a value
    // shows the preset's height, shape, edge and floated label at once.
    const String recorded = 'outlined-filled';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        final Map<String, dynamic> fixture = fixtures.singleWhere(
          (Map<String, dynamic> f) => f['id'] == recorded,
        );
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: textFieldGoldenSurface,
          child: fixtureField(fixture['props'] as Map<String, dynamic>),
          file: 'goldens/text_field/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
