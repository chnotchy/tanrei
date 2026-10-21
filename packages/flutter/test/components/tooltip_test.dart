import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../harness.dart';
import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiTooltipTokens tipTokens = system.tooltip;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every tooltip fixture: 320 wide with the anchor at its centre, inside the
/// `space200` padding of every baseline. The spec's stage is 320 x 200; the Flutter test font's
/// square glyphs make the wrapped and rich texts about half again as tall as a real font's, so the
/// stage is 440 tall to keep them whole.
const Size stage = Size(320, 440);
final Size tooltipGoldenSurface = Size(
  stage.width + 2 * system.space.space200,
  stage.height + 2 * system.space.space200,
);

/// The fixtures' icon names, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{'delete': 0xe872, 'info': 0xe88e};

Duration ms(int value) => Duration(milliseconds: value);

/// The anchor of every fixture: a medium standard icon button showing [glyph].
Widget anchorButton(String glyph, {VoidCallback? onPressed, FocusNode? focusNode, String? label}) =>
    TanreiIconButton(
      onPressed: onPressed ?? () {},
      focusNode: focusNode,
      semanticLabel: label ?? glyph,
      icon: Text(String.fromCharCode(iconCodePoints[glyph] ?? 0xe5cc)),
    );

/// The fixture's stage: the anchor at the centre, the tooltip open beside it.
Widget fixtureTooltip(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox.fromSize(
    size: stage,
    child: Overlay.wrap(
      child: Center(
        child: TanreiTooltip(
          message: props['text'] as String? ?? '',
          title: props['title'] as String? ?? '',
          variant: TanreiTooltipVariant.fromName(props['variant'] as String? ?? 'plain'),
          placement: TanreiTooltipPlacement.fromName(props['placement'] as String? ?? 'top'),
          excludeFromSemantics: props['describes'] == false,
          controller: TanreiTooltipController(open: props['open'] == true),
          child: anchorButton(fixture['content'] as String),
        ),
      ),
    ),
  );
}

/// Collects what the tooltip reports as ignored (TIP-16), and restores the reporter.
List<String> collectIgnoredValues() {
  final List<String> reports = <String>[];
  final TanreiIgnoredValueReporter previous = debugTanreiReportIgnoredValue;
  debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) =>
      reports.add('$component $prop: $why');
  addTearDown(() => debugTanreiReportIgnoredValue = previous);
  return reports;
}

TanreiTooltipController newController({bool open = false}) {
  final TanreiTooltipController controller = TanreiTooltipController(open: open);
  addTearDown(controller.dispose);
  return controller;
}

/// Records the toggles a controller emits.
List<bool> togglesOf(TanreiTooltipController controller) {
  final List<bool> toggles = <bool>[];
  controller.addListener(() => toggles.add(controller.isOpen));
  return toggles;
}

/// An 800 x 600 app with an overlay; [child] at [alignment].
Widget tipApp(
  Widget child, {
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  AlignmentGeometry alignment = Alignment.center,
}) => tanreiTestApp(
  Directionality(
    textDirection: textDirection,
    child: Overlay.wrap(
      child: SizedBox.expand(
        child: Align(alignment: alignment, child: child),
      ),
    ),
  ),
  theme: theme,
  disableAnimations: disableAnimations,
);

Widget tooltip({
  String message = 'Move to trash',
  TanreiTooltipVariant variant = TanreiTooltipVariant.plain,
  String title = '',
  TanreiTooltipPlacement placement = TanreiTooltipPlacement.top,
  bool excludeFromSemantics = false,
  TanreiTooltipController? controller,
  VoidCallback? onPressed,
  FocusNode? focusNode,
  String glyph = 'delete',
  Key? key,
}) => TanreiTooltip(
  key: key,
  message: message,
  variant: variant,
  title: title,
  placement: placement,
  excludeFromSemantics: excludeFromSemantics,
  controller: controller,
  child: anchorButton(glyph, onPressed: onPressed, focusNode: focusNode, label: 'Delete'),
);

bool isShowing(WidgetTester tester, [String message = 'Move to trash']) =>
    find.text(message).evaluate().isNotEmpty;

double opacityOf(WidgetTester tester) =>
    tester.widget<FadeTransition>(find.byType(FadeTransition).last).opacity.value;

RenderTanreiTooltipPosition positionOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiTooltipPosition>().toSet().single;

Rect tooltipRect(WidgetTester tester) {
  final RenderTanreiTooltipPosition position = positionOf(tester);
  return position.tooltipRect.shift((position as RenderBox).localToGlobal(Offset.zero));
}

Finder surfaceOf(String message) => find
    .ancestor(
      of: find.text(message),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration decorationOf(WidgetTester tester, String message) =>
    tester.widget<DecoratedBox>(surfaceOf(message)).decoration as TanreiContainerDecoration;

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

Future<TestGesture> mouseAt(WidgetTester tester, Offset position) async {
  final TestGesture mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
  await mouse.addPointer(location: position);
  addTearDown(mouse.removePointer);
  await tester.pump();
  return mouse;
}

Offset anchorCenter(WidgetTester tester, [int index = 0]) =>
    tester.getCenter(find.byType(TanreiIconButton).at(index));

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('opening and closing', () {
    testWidgets('TIP-1: a mouse resting on the anchor for show-delay opens it; it stays while the '
        'pointer moves onto the tooltip, and closes hide-delay after the pointer left both', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      final List<bool> toggles = togglesOf(controller);
      await tester.pumpWidget(tipApp(tooltip(controller: controller)));
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay - 1));
      expect(isShowing(tester), isFalse);
      await tester.pump(ms(1));
      await tester.pumpAndSettle();
      expect(isShowing(tester), isTrue);
      expect(toggles, <bool>[true]);
      // Onto the tooltip across the gap: it stays.
      await mouse.moveTo(tester.getCenter(find.text('Move to trash')));
      await tester.pump(ms(tipTokens.motionHideDelay * 3));
      expect(isShowing(tester), isTrue);
      // Off both: closed after the hide delay.
      await mouse.moveTo(Offset.zero);
      await tester.pump(ms(tipTokens.motionHideDelay - 1));
      expect(controller.isOpen, isTrue);
      await tester.pump(ms(1));
      await tester.pumpAndSettle();
      expect(isShowing(tester), isFalse);
      expect(toggles, <bool>[true, false]);
    });

    testWidgets('TIP-2: keyboard focus on the anchor opens it at once and losing focus closes it; '
        'focus from a pointer or touch does not open it', (WidgetTester tester) async {
      final TanreiTooltipController controller = newController();
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      await tester.pumpWidget(
        tipApp(
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              tooltip(controller: controller, focusNode: node),
              TanreiButton(onPressed: () {}, child: const Text('Next')),
            ],
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(node.hasFocus, isTrue);
      expect(controller.isOpen, isTrue, reason: 'no delay');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pumpAndSettle();
      expect(controller.isOpen, isFalse);
      // Focus that is not the keyboard's.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      node.requestFocus();
      await tester.pumpAndSettle();
      expect(node.hasFocus, isTrue);
      expect(controller.isOpen, isFalse);
    });

    testWidgets(
      'TIP-3: a long-press opens it without activating the anchor; after the finger lifts '
      'it stays timeout.touch, then closes; a touch elsewhere closes it sooner',
      (WidgetTester tester) async {
        final TanreiTooltipController controller = newController();
        final List<bool> toggles = togglesOf(controller);
        int pressed = 0;
        await tester.pumpWidget(
          tipApp(tooltip(controller: controller, onPressed: () => pressed++)),
        );
        await tester.longPress(find.byType(TanreiIconButton));
        await tester.pump();
        expect(controller.isOpen, isTrue);
        expect(pressed, 0, reason: 'the long-press does not activate the anchor');
        await tester.pump(ms(tipTokens.timeoutTouch - 1));
        expect(controller.isOpen, isTrue);
        await tester.pump(ms(1));
        await tester.pumpAndSettle();
        expect(controller.isOpen, isFalse);
        expect(toggles, <bool>[true, false]);

        await tester.longPress(find.byType(TanreiIconButton));
        await tester.pump();
        expect(controller.isOpen, isTrue);
        await tester.tapAt(const Offset(10, 10));
        await tester.pumpAndSettle();
        expect(controller.isOpen, isFalse);
        expect(pressed, 0);
      },
    );

    testWidgets('TIP-4: Escape closes it without moving focus and is consumed, so an enclosing '
        'handler does not see it; it stays closed until the anchor is entered or focused again', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      final FocusNode node = FocusNode();
      addTearDown(node.dispose);
      final List<LogicalKeyboardKey> reachedAncestor = <LogicalKeyboardKey>[];
      await tester.pumpWidget(
        tipApp(
          Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: (FocusNode _, KeyEvent event) {
              if (event is KeyDownEvent) {
                reachedAncestor.add(event.logicalKey);
              }
              return KeyEventResult.ignored;
            },
            child: tooltip(controller: controller, focusNode: node),
          ),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(controller.isOpen, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(controller.isOpen, isFalse);
      expect(node.hasFocus, isTrue, reason: 'focus did not move');
      expect(reachedAncestor, isNot(contains(LogicalKeyboardKey.escape)));
      // A closed tooltip lets Escape through.
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      expect(reachedAncestor, contains(LogicalKeyboardKey.escape));

      // Opened by hover, closed by Escape: a resting pointer does not open it again.
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      node.unfocus();
      await tester.pumpAndSettle();
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(controller.isOpen, isTrue);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(controller.isOpen, isFalse);
      await tester.pump(ms(tipTokens.motionShowDelay * 2));
      expect(controller.isOpen, isFalse);
      // Entered again: it opens.
      await mouse.moveTo(Offset.zero);
      await tester.pump();
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(controller.isOpen, isTrue);
    });

    testWidgets('TIP-5: while hovered or focused it stays open with no time limit', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      await tester.pumpWidget(tipApp(tooltip(controller: controller)));
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      for (int i = 0; i < 6; i++) {
        await tester.pump(const Duration(seconds: 10));
      }
      expect(controller.isOpen, isTrue);
      await mouse.moveTo(Offset.zero);
      await tester.pump(ms(tipTokens.motionHideDelay));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      for (int i = 0; i < 6; i++) {
        await tester.pump(const Duration(seconds: 10));
      }
      expect(controller.isOpen, isTrue);
    });

    testWidgets('TIP-6: activating the anchor (a click, Enter or Space) closes it; the same hover '
        'does not open it again until the pointer leaves and enters again', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      int pressed = 0;
      await tester.pumpWidget(tipApp(tooltip(controller: controller, onPressed: () => pressed++)));
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(controller.isOpen, isTrue);
      await mouse.down(anchorCenter(tester));
      await mouse.up();
      await tester.pumpAndSettle();
      expect(pressed, 1);
      expect(controller.isOpen, isFalse);
      await tester.pump(ms(tipTokens.motionShowDelay * 2));
      expect(controller.isOpen, isFalse, reason: 'the same hover');
      await mouse.moveTo(Offset.zero);
      await tester.pump();
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(controller.isOpen, isTrue, reason: 'entered again');
      await mouse.moveTo(Offset.zero);
      await tester.pumpAndSettle();

      for (final LogicalKeyboardKey key in <LogicalKeyboardKey>[
        LogicalKeyboardKey.enter,
        LogicalKeyboardKey.space,
      ]) {
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(controller.isOpen, isTrue);
        await tester.sendKeyEvent(key);
        await tester.pumpAndSettle();
        expect(controller.isOpen, isFalse, reason: '$key');
        FocusManager.instance.primaryFocus?.unfocus();
        await tester.pumpAndSettle();
      }
    });

    testWidgets('TIP-7: toggle is emitted when it changes by itself; show() and hide() by the '
        'product emit nothing, and it keeps following hover afterwards', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      final List<bool> toggles = togglesOf(controller);
      await tester.pumpWidget(tipApp(tooltip(controller: controller)));
      controller.show();
      await tester.pumpAndSettle();
      expect(isShowing(tester), isTrue);
      controller.hide();
      await tester.pumpAndSettle();
      expect(isShowing(tester), isFalse);
      expect(toggles, isEmpty);
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(toggles, <bool>[true]);
    });

    testWidgets('TIP-8: a tooltip opening while another is open closes the other at once and opens '
        'without the show delay; at most one is open', (WidgetTester tester) async {
      final TanreiTooltipController first = newController();
      final TanreiTooltipController second = newController();
      final List<bool> firstToggles = togglesOf(first);
      await tester.pumpWidget(
        tipApp(
          Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 40,
            children: <Widget>[
              tooltip(controller: first, message: 'First'),
              tooltip(controller: second, message: 'Second', glyph: 'info'),
            ],
          ),
        ),
      );
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(first.isOpen, isTrue);
      await mouse.moveTo(anchorCenter(tester, 1));
      await tester.pump();
      expect(second.isOpen, isTrue, reason: 'no show delay');
      expect(first.isOpen, isFalse, reason: 'closed at once');
      expect(firstToggles, <bool>[true, false]);
      await tester.pumpAndSettle();
      expect(isShowing(tester, 'First'), isFalse);
      expect(isShowing(tester, 'Second'), isTrue);
      // The product opening one closes the other too.
      first.show();
      await tester.pumpAndSettle();
      expect(isShowing(tester, 'First'), isTrue);
      expect(isShowing(tester, 'Second'), isFalse);
    });
  });

  group('placement (TIP-9)', () {
    testWidgets(
      'TIP-9: offset from the anchor on the placement\'s side, centred along it; start and '
      'end follow the layout direction',
      (WidgetTester tester) async {
        Future<(Rect, Rect)> place(
          TanreiTooltipPlacement placement,
          TextDirection direction,
        ) async {
          await tester.pumpWidget(
            tipApp(
              tooltip(
                key: UniqueKey(),
                controller: newController(open: true),
                placement: placement,
              ),
              textDirection: direction,
            ),
          );
          await tester.pumpAndSettle();
          return (tester.getRect(find.byType(TanreiIconButton)), tooltipRect(tester));
        }

        var (Rect anchor, Rect tip) = await place(TanreiTooltipPlacement.top, TextDirection.ltr);
        expect(anchor.top - tip.bottom, tipTokens.offset);
        expect(tip.center.dx, moreOrLessEquals(anchor.center.dx));
        (anchor, tip) = await place(TanreiTooltipPlacement.bottom, TextDirection.ltr);
        expect(tip.top - anchor.bottom, tipTokens.offset);
        (anchor, tip) = await place(TanreiTooltipPlacement.start, TextDirection.ltr);
        expect(anchor.left - tip.right, tipTokens.offset);
        expect(tip.center.dy, moreOrLessEquals(anchor.center.dy));
        (anchor, tip) = await place(TanreiTooltipPlacement.end, TextDirection.ltr);
        expect(tip.left - anchor.right, tipTokens.offset);
        (anchor, tip) = await place(TanreiTooltipPlacement.start, TextDirection.rtl);
        expect(tip.left - anchor.right, tipTokens.offset, reason: 'start is the right in RTL');
        expect(positionOf(tester).side, TanreiTooltipPlacement.start);
      },
    );

    testWidgets('TIP-9: the preferred side flips when it has no room, the side with more room wins '
        'when neither has, and the tooltip shifts to stay window-margin inside', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tipApp(tooltip(controller: newController(open: true)), alignment: Alignment.topLeft),
      );
      await tester.pumpAndSettle();
      expect(positionOf(tester).side, TanreiTooltipPlacement.bottom, reason: 'flipped');
      final Rect tip = tooltipRect(tester);
      expect(tip.left, tipTokens.windowMargin, reason: 'shifted inside the margin');

      // A long rich tooltip in a short window: neither side fits; the one with more room is used.
      tester.view.physicalSize = const Size(800, 200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        tipApp(
          tooltip(
            key: UniqueKey(),
            controller: newController(open: true),
            variant: TanreiTooltipVariant.rich,
            title: 'Storage',
            message: 'Files in the trash still count toward your storage until they are deleted.',
          ),
          alignment: const Alignment(0, 0.4),
        ),
      );
      await tester.pumpAndSettle();
      expect(positionOf(tester).side, TanreiTooltipPlacement.top, reason: 'more room above');
    });

    testWidgets(
      'TIP-9: it follows the anchor while an ancestor scrolls, and closes when the anchor '
      'is scrolled out of the window or removed',
      (WidgetTester tester) async {
        final TanreiTooltipController controller = newController(open: true);
        final List<bool> toggles = togglesOf(controller);
        final ScrollController scroll = ScrollController();
        addTearDown(scroll.dispose);
        await tester.pumpWidget(
          tipApp(
            SingleChildScrollView(
              controller: scroll,
              child: Column(
                children: <Widget>[
                  const SizedBox(height: 300),
                  tooltip(controller: controller),
                  const SizedBox(height: 1200),
                ],
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final double before = tooltipRect(tester).top;
        scroll.jumpTo(100);
        await tester.pump();
        expect(tooltipRect(tester).top, moreOrLessEquals(before - 100));
        scroll.jumpTo(800);
        await tester.pump();
        await tester.pumpAndSettle();
        expect(controller.isOpen, isFalse);
        expect(toggles, <bool>[false]);

        final TanreiTooltipController removed = newController(open: true);
        await tester.pumpWidget(tipApp(tooltip(key: UniqueKey(), controller: removed)));
        await tester.pumpAndSettle();
        expect(isShowing(tester), isTrue);
        await tester.pumpWidget(tipApp(const SizedBox()));
        await tester.pumpAndSettle();
        expect(isShowing(tester), isFalse);
      },
    );
  });

  group('drawing', () {
    testWidgets(
      'TIP-10: a plain tooltip draws its text in the plain tokens on the plain container, '
      'at least min-height tall, at most max-width wide, wrapping; it ignores title',
      (WidgetTester tester) async {
        final List<String> reports = collectIgnoredValues();
        const String long = 'Move the selected files to the trash. They are deleted after 30 days.';
        await tester.pumpWidget(
          tipApp(tooltip(controller: newController(open: true), message: long, title: 'Ignored')),
        );
        await tester.pumpAndSettle();
        expect(find.text('Ignored'), findsNothing);
        expect(reports.where((String r) => r.startsWith('tooltip title')), hasLength(1));
        final TextStyle style = textStyleOf(tester, long);
        expect(style.color, lightTheme.paint(tipTokens.plainSupportingTextColor));
        expect(style.fontSize, tipTokens.plainSupportingTextTypescale.toTextStyle().fontSize);
        final TanreiContainerDecoration decoration = decorationOf(tester, long);
        expect(decoration.color, lightTheme.paint(tipTokens.plainContainerColor));
        expect(decoration.shape.radius, tipTokens.plainContainerShape);
        expect(decoration.boxShadow, isNull, reason: 'level0');
        final Rect surface = tester.getRect(surfaceOf(long));
        expect(surface.width, lessThanOrEqualTo(tipTokens.plainContainerMaxWidth));
        expect(tester.getSize(find.text(long)).height, greaterThan(style.fontSize! * 2));
        final Rect text = tester.getRect(find.text(long));
        expect(text.left - surface.left, tipTokens.plainContainerPaddingInline);
        expect(text.top - surface.top, tipTokens.plainContainerPaddingBlock);

        // A minimum above the text's own height holds.
        await tester.pumpWidget(
          tipApp(
            tooltip(key: UniqueKey(), controller: newController(open: true), message: 'x'),
            theme: TanreiThemeData(
              system: system.copyWith(tooltip: tipTokens.copyWith(plainContainerMinHeight: 40)),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.getSize(surfaceOf('x')).height, 40);
        expect(
          tester.getCenter(find.text('x')).dy,
          moreOrLessEquals(tester.getCenter(surfaceOf('x')).dy),
        );
      },
    );

    testWidgets(
      'TIP-11: a rich tooltip draws its title above the text, gap apart, in the rich tokens '
      'on the rich container within max-width; without a title the text alone',
      (WidgetTester tester) async {
        const String text = 'Files in the trash still count toward your storage.';
        await tester.pumpWidget(
          tipApp(
            tooltip(
              controller: newController(open: true),
              variant: TanreiTooltipVariant.rich,
              title: 'Storage',
              message: text,
            ),
          ),
        );
        await tester.pumpAndSettle();
        final TextStyle title = textStyleOf(tester, 'Storage');
        expect(title.color, lightTheme.paint(tipTokens.richTitleColor));
        expect(title.fontSize, tipTokens.richTitleTypescale.toTextStyle().fontSize);
        expect(
          textStyleOf(tester, text).color,
          lightTheme.paint(tipTokens.richSupportingTextColor),
        );
        expect(
          tester.getRect(find.text(text)).top - tester.getRect(find.text('Storage')).bottom,
          tipTokens.richContainerGap,
        );
        final TanreiContainerDecoration decoration = decorationOf(tester, text);
        expect(decoration.color, lightTheme.paint(tipTokens.richContainerColor));
        expect(decoration.shape.radius, tipTokens.richContainerShape);
        final TanreiResolvedElevation level2 = TanreiResolvedElevation.resolve(
          tipTokens.richContainerElevation,
          lightTheme.colors,
        );
        expect(decoration.border, level2.ring);
        final Rect surface = tester.getRect(surfaceOf(text));
        expect(surface.width, lessThanOrEqualTo(tipTokens.richContainerMaxWidth));
        expect(
          tester.getRect(find.text('Storage')).left - surface.left,
          tipTokens.richContainerPaddingInline,
        );
        expect(
          tester.getRect(find.text('Storage')).top - surface.top,
          tipTokens.richContainerPaddingBlock,
        );

        await tester.pumpWidget(
          tipApp(
            tooltip(
              key: UniqueKey(),
              controller: newController(open: true),
              variant: TanreiTooltipVariant.rich,
              message: text,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester.getRect(find.text(text)).top - tester.getRect(surfaceOf(text)).top,
          tipTokens.richContainerPaddingBlock,
        );
      },
    );

    testWidgets('TIP-12: the corners are eased by the system\'s smoothing, the tooltip grows with '
        'enlarged text, and its text starts at the layout direction\'s start', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        tipApp(
          tooltip(controller: newController(open: true)),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      await tester.pumpAndSettle();
      expect(decorationOf(tester, 'Move to trash').shape.smoothing, 0.6);
      final double height = tester.getSize(surfaceOf('Move to trash')).height;

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: tipApp(tooltip(key: UniqueKey(), controller: newController(open: true))),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.getSize(surfaceOf('Move to trash')).height, greaterThan(height));

      const String long = 'Move the selected files to the trash. They are deleted after 30 days.';
      await tester.pumpWidget(
        tipApp(
          tooltip(key: UniqueKey(), controller: newController(open: true), message: long),
          textDirection: TextDirection.rtl,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.widget<Text>(find.text(long)).textAlign, TextAlign.start);
      expect(
        tester.getRect(surfaceOf(long)).right - tester.getRect(find.text(long)).right,
        tipTokens.plainContainerPaddingInline,
      );
    });

    testWidgets('TIP-15: it fades in over enter-duration and out over exit-duration with their '
        'easings, without moving; at once where animations are disabled', (
      WidgetTester tester,
    ) async {
      final TanreiTooltipController controller = newController();
      await tester.pumpWidget(tipApp(tooltip(controller: controller)));
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pump(ms(tipTokens.motionEnterDuration ~/ 2));
      expect(
        opacityOf(tester),
        moreOrLessEquals(tipTokens.motionEnterEasing.toCurve().transform(0.5)),
      );
      final Rect atHalf = tooltipRect(tester);
      await tester.pumpAndSettle();
      expect(opacityOf(tester), 1);
      expect(tooltipRect(tester), atHalf, reason: 'no movement, no scale');
      await mouse.moveTo(Offset.zero);
      await tester.pump(ms(tipTokens.motionHideDelay));
      await tester.pump(ms(tipTokens.motionExitDuration ~/ 2));
      expect(
        opacityOf(tester),
        moreOrLessEquals(1 - tipTokens.motionExitEasing.toCurve().transform(0.5)),
      );
      await tester.pumpAndSettle();
      expect(isShowing(tester), isFalse);

      // Android's setting removes every animation: at once.
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final TanreiTooltipController reduced = newController();
      await tester.pumpWidget(
        tipApp(tooltip(key: UniqueKey(), controller: reduced), disableAnimations: true),
      );
      reduced.show();
      await tester.pump();
      expect(opacityOf(tester), 1);
      reduced.hide();
      await tester.pump();
      expect(isShowing(tester), isFalse);

      // Elsewhere reduced motion keeps the fade: nothing moves anyway.
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final TanreiTooltipController kept = newController();
      await tester.pumpWidget(
        tipApp(tooltip(key: UniqueKey(), controller: kept), disableAnimations: true),
      );
      kept.show();
      await tester.pump();
      await tester.pump(ms(tipTokens.motionEnterDuration ~/ 2));
      expect(opacityOf(tester), lessThan(1));
      await tester.pumpAndSettle();
      debugDefaultTargetPlatformOverride = null;
    });
  });

  group('accessibility', () {
    testWidgets('TIP-13: it takes no focus and holds nothing focusable, blocks nothing, is drawn '
        'above the layers of its overlay, and a press on it closes it without reaching what lies '
        'under it', (WidgetTester tester) async {
      int under = 0;
      final TanreiTooltipController controller = newController(open: true);
      await tester.pumpWidget(
        tipApp(
          SizedBox(
            width: 300,
            height: 200,
            child: Stack(
              children: <Widget>[
                Positioned.fill(
                  child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => under++),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: tooltip(controller: controller),
                ),
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final Rect tip = tooltipRect(tester);
      expect(
        tester
            .widgetList<Focus>(
              find.descendant(of: find.byType(FadeTransition).last, matching: find.byType(Focus)),
            )
            .every((Focus f) => f.canRequestFocus != true),
        isTrue,
        reason: 'nothing focusable in it',
      );
      final FocusNode? before = FocusManager.instance.primaryFocus;
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(FocusManager.instance.primaryFocus, isNot(before));
      expect(
        FocusManager.instance.primaryFocus?.context?.findAncestorWidgetOfExactType<ExcludeFocus>(),
        isNull,
      );
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      controller.show();
      await tester.pumpAndSettle();
      await tester.tapAt(tip.center);
      await tester.pumpAndSettle();
      expect(controller.isOpen, isFalse);
      expect(under, 0, reason: 'the press did not reach under the tooltip');
      await tester.tapAt(tip.center);
      expect(under, 1, reason: 'nothing is inert');
    });

    testWidgets(
      'TIP-14: while describes, the text (after a rich tooltip\'s title) is the anchor\'s '
      'description, open or not, and the drawn tooltip is not read; with describes false nothing '
      'is added; the anchor keeps its name and role',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        await tester.pumpWidget(tipApp(tooltip()));
        SemanticsData anchor = tester
            .getSemantics(find.byType(TanreiIconButton))
            .getSemanticsData();
        expect(anchor.tooltip, 'Move to trash');
        expect(anchor.label, 'Delete');
        expect(anchor.hasFlag(SemanticsFlag.isButton), isTrue);

        final TanreiTooltipController controller = newController(open: true);
        await tester.pumpWidget(
          tipApp(
            tooltip(
              key: UniqueKey(),
              controller: controller,
              variant: TanreiTooltipVariant.rich,
              title: 'Storage',
              message: 'Files count.',
            ),
          ),
        );
        await tester.pumpAndSettle();
        anchor = tester.getSemantics(find.byType(TanreiIconButton)).getSemanticsData();
        expect(anchor.tooltip, 'Storage, Files count.');
        expect(anchor.label, 'Delete');
        expect(find.bySemanticsLabel('Files count.'), findsNothing, reason: 'not read twice');

        await tester.pumpWidget(tipApp(tooltip(key: UniqueKey(), excludeFromSemantics: true)));
        anchor = tester.getSemantics(find.byType(TanreiIconButton)).getSemanticsData();
        expect(anchor.tooltip, isEmpty);
        expect(anchor.label, 'Delete');
        handle.dispose();
      },
    );

    testWidgets('TIP-16: an empty text never opens and adds nothing to the anchor, reported once', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final List<String> reports = collectIgnoredValues();
      final TanreiTooltipController controller = newController();
      await tester.pumpWidget(tipApp(tooltip(controller: controller, message: '')));
      controller.show();
      await tester.pumpAndSettle();
      expect(positionOf, throwsA(anything));
      final TestGesture mouse = await mouseAt(tester, Offset.zero);
      await mouse.moveTo(anchorCenter(tester));
      await tester.pump(ms(tipTokens.motionShowDelay));
      await tester.pumpAndSettle();
      expect(tester.allRenderObjects.whereType<RenderTanreiTooltipPosition>(), isEmpty);
      expect(
        tester.getSemantics(find.byType(TanreiIconButton)).getSemanticsData().tooltip,
        isEmpty,
      );
      expect(reports.where((String r) => r.startsWith('tooltip message')), hasLength(1));
      await tester.pumpWidget(tipApp(tooltip(controller: controller, message: '')));
      expect(reports.where((String r) => r.startsWith('tooltip message')), hasLength(1));
      handle.dispose();
    });

    test('closed props: a variant or placement name the tooltip does not define falls back to the '
        'default and is reported', () {
      final List<String> reports = collectUnknownValues();
      expect(TanreiTooltipVariant.fromName('fancy'), TanreiTooltipVariant.plain);
      expect(TanreiTooltipPlacement.fromName('left'), TanreiTooltipPlacement.top);
      expect(TanreiTooltipPlacement.fromName('end'), TanreiTooltipPlacement.end);
      expect(reports, <String>[
        'tooltip variant "fancy" -> plain',
        'tooltip placement "left" -> top',
      ]);
    });

    testWidgets('guidelines: an anchor with its tooltip open', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        for (final TanreiTooltipVariant variant in TanreiTooltipVariant.values) {
          await tester.pumpWidget(
            tipApp(
              tooltip(
                key: UniqueKey(),
                controller: newController(open: true),
                variant: variant,
                title: variant == TanreiTooltipVariant.rich ? 'Storage' : '',
              ),
              theme: theme,
            ),
          );
          await tester.pumpAndSettle();
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
      }
      handle.dispose();
    });

    // WCAG 1.4.3 in every scheme of the default system: the texts need 4.5:1 on their container. An
    // imitation preset is held to its original, not to this criterion, in any scheme.
    test('contrast: "${system.id}" tooltip texts 4.5:1 on their container', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          final TanreiTooltipTokens t = system.tooltip;
          for (final (String part, TanreiPaint text, TanreiPaint container)
              in <(String, TanreiPaint, TanreiPaint)>[
                ('plain', t.plainSupportingTextColor, t.plainContainerColor),
                ('rich title', t.richTitleColor, t.richContainerColor),
                ('rich text', t.richSupportingTextColor, t.richContainerColor),
              ]) {
            final Color bg = Color.alphaBlend(theme.paint(container), theme.colors.surface);
            final double ratio = contrastOf(Color.alphaBlend(theme.paint(text), bg), bg);
            if (ratio < 4.5) {
              failures.add('${brightness.name} ${contrast.name} $part ${ratio.toStringAsFixed(2)}');
            }
          }
        }
      }
      expect(failures, isEmpty);
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(tipTokens.motionShowDelay, 500);
      expect(tipTokens.timeoutTouch, 1500);
      expect(tipTokens.plainContainerColor, const TanreiPaint.role(TanreiColorRole.inverseSurface));
      expect(tipTokens.plainContainerElevation, system.elevation.level0);
      expect(tipTokens.richContainerColor, const TanreiPaint.role(TanreiColorRole.surfaceBright));
      expect(tipTokens.richContainerElevation, system.elevation.level2);
      expect(tipTokens.plainContainerMaxWidth, 200);
      expect(tipTokens.richContainerMaxWidth, 320);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": an open plain tooltip draws that system\'s tokens', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(
          tipApp(tooltip(controller: newController(open: true)), theme: theme),
        );
        await tester.pumpAndSettle();
        final TanreiContainerDecoration decoration = decorationOf(tester, 'Move to trash');
        expect(decoration.color, theme.paint(shipped.tooltip.plainContainerColor));
        expect(decoration.shape.radius, shipped.tooltip.plainContainerShape);
        expect(decoration.shape.smoothing, shipped.shape.cornerSmoothing);
        expect(
          textStyleOf(tester, 'Move to trash').color,
          theme.paint(shipped.tooltip.plainSupportingTextColor),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('tooltip');

    test('the spec lists the fixtures this suite records, every one open', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'plain',
        'plain-wrapped',
        'plain-bottom',
        'rich',
        'rich-untitled',
      ]);
      for (final Map<String, dynamic> fixture in fixtures) {
        expect((fixture['props'] as Map<String, dynamic>)['open'], isTrue);
      }
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: tooltipGoldenSurface,
          child: fixtureTooltip(fixture),
          file: 'goldens/tooltip/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the rich tooltip shows the
    // preset's surface, elevation, corners and both text styles; the plain one is the inverse
    // surface every preset keeps.
    const String recorded = 'rich';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: tooltipGoldenSurface,
          child: fixtureTooltip(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/tooltip/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
