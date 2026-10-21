import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../systems.dart';
import 'fixture_golden.dart';

const TanreiSystem system = tanreiSystem;
final TanreiDialogTokens dialogTokens = system.dialog;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every dialog fixture: 480 x 640, inside the `space200` padding of
/// every baseline.
const Size stage = Size(480, 640);
final Size dialogGoldenSurface = Size(
  stage.width + 2 * system.space.space200,
  stage.height + 2 * system.space.space200,
);

Duration ms(int value) => Duration(milliseconds: value);

final GlobalKey homeKey = GlobalKey();

/// An app with a navigator whose home page is [home] on the surface, the theme above the navigator.
Widget dialogApp({
  Widget? home,
  TanreiThemeData theme = lightTheme,
  bool disableAnimations = false,
  TextDirection textDirection = TextDirection.ltr,
  MediaQueryData Function(MediaQueryData)? media,
}) => WidgetsApp(
  color: theme.colors.primary,
  debugShowCheckedModeBanner: false,
  builder: (BuildContext context, Widget? child) {
    final MediaQueryData data = MediaQuery.of(
      context,
    ).copyWith(disableAnimations: disableAnimations);
    return MediaQuery(
      data: media?.call(data) ?? data,
      child: TanreiTheme(
        data: theme,
        child: Directionality(textDirection: textDirection, child: child!),
      ),
    );
  },
  pageRouteBuilder: <T>(RouteSettings settings, WidgetBuilder builder) => PageRouteBuilder<T>(
    settings: settings,
    pageBuilder: (BuildContext context, _, _) => builder(context),
  ),
  home: ColoredBox(
    key: homeKey,
    color: theme.colors.surface,
    child: home ?? const SizedBox.expand(),
  ),
);

/// The home page's context.
BuildContext homeContext() => homeKey.currentContext!;

/// A dialog with two text actions, as every fixture has.
TanreiDialog basicDialog({
  String headline = 'Discard draft?',
  String supportingText = 'The message you were writing will be deleted from this device.',
  bool alert = false,
  Widget? icon,
  Widget? child,
  VoidCallback? onCancel,
  VoidCallback? onConfirm,
  bool autofocusCancel = false,
  String cancel = 'Cancel',
  String confirm = 'Discard',
}) => TanreiDialog(
  headline: headline,
  supportingText: supportingText,
  alert: alert,
  icon: icon,
  actions: <Widget>[
    TanreiButton(
      variant: TanreiButtonVariant.text,
      autofocus: autofocusCancel,
      onPressed: onCancel ?? () {},
      child: Text(cancel),
    ),
    TanreiButton(
      variant: TanreiButtonVariant.text,
      onPressed: onConfirm ?? () {},
      child: Text(confirm),
    ),
  ],
  child: child,
);

/// The future of the dialog [openDialog] opened last.
late Future<Object?> lastResult;

/// Opens [dialog] from the home page and settles; its future is [lastResult].
Future<void> openDialog(
  WidgetTester tester,
  WidgetBuilder builder, {
  bool dismissible = true,
  bool settle = true,
}) async {
  lastResult = showTanreiDialog<Object?>(
    context: homeContext(),
    barrierDismissible: dismissible,
    builder: builder,
  );
  await tester.pump();
  if (settle) {
    await tester.pumpAndSettle();
  }
}

Finder containerFinder() => find
    .descendant(
      of: find.byType(TanreiDialog),
      matching: find.byWidgetPredicate(
        (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
      ),
    )
    .first;

TanreiContainerDecoration containerDecoration(WidgetTester tester) =>
    tester.widget<DecoratedBox>(containerFinder()).decoration as TanreiContainerDecoration;

RenderTanreiDialogFrame frameOf(WidgetTester tester) =>
    tester.allRenderObjects.whereType<RenderTanreiDialogFrame>().toSet().single;

TextStyle textStyleOf(WidgetTester tester, String text) => tester
    .widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)))
    .text
    .style!;

String focusedLabel() {
  final FocusNode? node = FocusManager.instance.primaryFocus;
  if (node == null) {
    return '';
  }
  if (node.debugLabel == 'TanreiDialog') {
    return 'container';
  }
  final TanreiButton? button = node.context?.findAncestorWidgetOfExactType<TanreiButton>();
  final Widget? child = button?.child;
  return child is Text ? child.data ?? '' : '';
}

/// Whether a node of the semantics tree now carries [label].
bool inSemanticsTree(WidgetTester tester, String label) {
  bool found = false;
  bool visit(SemanticsNode node) {
    if (node.getSemanticsData().label == label) {
      found = true;
    }
    node.visitChildren(visit);
    return !found;
  }

  final SemanticsNode root = tester
      .renderObject(find.byType(WidgetsApp))
      .owner!
      .semanticsOwner!
      .rootSemanticsNode!;
  visit(root);
  return found;
}

Finder dialogScroll() =>
    find.descendant(of: find.byType(TanreiDialog), matching: find.byType(SingleChildScrollView));

Finder scrimFinder(Color color) =>
    find.byWidgetPredicate((Widget w) => w is ColoredBox && w.color == color);

/// Captures the stage with the dialog open, after it settled, against [file].
Future<void> expectDialogGolden(
  WidgetTester tester, {
  required TanreiSystem system,
  required WidgetBuilder builder,
  required String file,
}) async {
  final GlobalKey stageKey = GlobalKey();
  final GlobalKey boundary = await pumpFixtureFrame(
    tester,
    system: system,
    surface: dialogGoldenSurface,
    child: SizedBox.fromSize(
      size: stage,
      child: Navigator(
        onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
          pageBuilder: (BuildContext context, _, _) =>
              ColoredBox(key: stageKey, color: TanreiTheme.of(context).colors.surface),
        ),
      ),
    ),
  );
  unawaited(showTanreiDialog<void>(context: stageKey.currentContext!, builder: builder));
  await tester.pumpAndSettle();
  final RenderRepaintBoundary render =
      boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final ui.Image image = (await tester.runAsync(
    () => render.toImage(pixelRatio: goldenPixelRatio),
  ))!;
  addTearDown(image.dispose);
  await expectLater(image, matchesGoldenFile(file));
}

/// The glyphs the fixtures name, as Material Symbols code points drawn as text.
const Map<String, int> iconCodePoints = <String, int>{'delete': 0xe872};

/// The fixture's dialog: its props, its slots filled as their fixture kinds say (`fixtureSlot`: the icon a
/// glyph, the actions text-variant buttons) and its `content` as text in the default slot.
TanreiDialog fixtureDialog(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  final List<Widget> icon = fixtureSlot('dialog', fixture, 'icon', glyphs: iconCodePoints);
  return TanreiDialog(
    headline: props['headline'] as String? ?? '',
    supportingText: props['supportingText'] as String? ?? '',
    alert: props['alert'] == true,
    icon: icon.firstOrNull,
    actions: fixtureSlot('dialog', fixture, 'actions'),
    child: fixture['content'] == null ? null : Text(fixture['content'] as String),
  );
}

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
  });

  group('presentation', () {
    testWidgets(
      'DLG-1: open presents the dialog with the scrim of comp.dialog.scrim.color over the '
      'whole window, and everything behind is inert: no press, no focus, no scrolling, hidden '
      'from assistive technology',
      (WidgetTester tester) async {
        final SemanticsHandle handle = tester.ensureSemantics();
        int behind = 0;
        final ScrollController scroll = ScrollController();
        addTearDown(scroll.dispose);
        await tester.pumpWidget(
          dialogApp(
            home: Column(
              children: <Widget>[
                TanreiButton(onPressed: () => behind++, child: const Text('Behind')),
                Expanded(
                  child: SingleChildScrollView(
                    controller: scroll,
                    child: const SizedBox(height: 3000, width: 100),
                  ),
                ),
              ],
            ),
          ),
        );
        expect(inSemanticsTree(tester, 'Behind'), isTrue);
        await openDialog(tester, (_) => basicDialog(), dismissible: false);
        final Color scrim = lightTheme.paint(dialogTokens.scrimColor);
        expect(scrimFinder(scrim), findsOneWidget);
        expect(
          tester.getSize(scrimFinder(scrim)),
          tester.view.physicalSize / tester.view.devicePixelRatio,
        );
        await tester.tap(find.text('Behind'), warnIfMissed: false);
        await tester.pump();
        expect(behind, 0);
        await tester.drag(
          find.byType(SingleChildScrollView).first,
          const Offset(0, -200),
          warnIfMissed: false,
        );
        await tester.pumpAndSettle();
        expect(scroll.offset, 0);
        expect(inSemanticsTree(tester, 'Behind'), isFalse);
        for (int i = 0; i < 5; i++) {
          await tester.sendKeyEvent(LogicalKeyboardKey.tab);
          await tester.pump();
          expect(focusedLabel(), isNot('Behind'));
        }
        handle.dispose();
      },
    );

    testWidgets('DLG-2: focus moves to the element marked autofocus, or else to the container, and '
        'the next Tab reaches the first focusable element', (WidgetTester tester) async {
      await tester.pumpWidget(dialogApp());
      await openDialog(tester, (_) => basicDialog());
      expect(focusedLabel(), 'container');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Cancel');
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      await openDialog(tester, (_) => basicDialog(autofocusCancel: true, confirm: 'Delete'));
      expect(focusedLabel(), 'Cancel');
    });

    testWidgets('DLG-3: focus stays inside: Tab from the last element goes to the first, Shift+Tab '
        'from the first to the last', (WidgetTester tester) async {
      await tester.pumpWidget(
        dialogApp(
          home: TanreiButton(onPressed: () {}, child: const Text('Behind')),
        ),
      );
      await openDialog(tester, (_) => basicDialog(autofocusCancel: true));
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Discard');
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(focusedLabel(), 'Cancel', reason: 'wraps to the first');
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pump();
      expect(focusedLabel(), 'Discard', reason: 'wraps to the last');
    });

    testWidgets('DLG-4: closing returns focus to the element that had it when the dialog opened', (
      WidgetTester tester,
    ) async {
      final FocusNode opener = FocusNode();
      addTearDown(opener.dispose);
      await tester.pumpWidget(
        dialogApp(
          home: Center(
            child: TanreiButton(focusNode: opener, onPressed: () {}, child: const Text('Open')),
          ),
        ),
      );
      opener.requestFocus();
      await tester.pump();
      await openDialog(tester, (_) => basicDialog());
      expect(opener.hasPrimaryFocus, isFalse);
      Navigator.of(homeContext()).pop();
      await tester.pump();
      expect(opener.hasPrimaryFocus, isTrue, reason: 'at the start of the motion');
      await tester.pumpAndSettle();
      expect(opener.hasPrimaryFocus, isTrue);
    });

    testWidgets('DLG-5: while dismissible, Escape, the platform\'s back and a press on the scrim '
        'emit dismiss once (the future completes with null); while not, they do nothing', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(dialogApp());
      await openDialog(tester, (_) => basicDialog());
      Future<Object?> result = lastResult;
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(await result, isNull);
      expect(find.byType(TanreiDialog), findsNothing);

      await openDialog(tester, (_) => basicDialog());
      result = lastResult;
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(await result, isNull);
      expect(find.byType(TanreiDialog), findsNothing);

      await openDialog(tester, (_) => basicDialog());
      result = lastResult;
      await tester.tapAt(const Offset(4, 4));
      await tester.pumpAndSettle();
      expect(await result, isNull);
      expect(find.byType(TanreiDialog), findsNothing);

      bool completed = false;
      await openDialog(tester, (_) => basicDialog(), dismissible: false);
      result = lastResult;
      unawaited(result.then((_) => completed = true));
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      await tester.tapAt(const Offset(4, 4));
      await tester.pumpAndSettle();
      expect(find.byType(TanreiDialog), findsOneWidget);
      expect(completed, isFalse);
    });

    testWidgets('DLG-6: an action does not close the dialog by itself; its handler closes it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(dialogApp());
      int cancelled = 0;
      await openDialog(
        tester,
        (BuildContext context) => basicDialog(
          onCancel: () => cancelled++,
          onConfirm: () => Navigator.of(context).pop('discarded'),
        ),
      );
      final Future<Object?> result = lastResult;
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(cancelled, 1);
      expect(find.byType(TanreiDialog), findsOneWidget);
      await tester.tap(find.text('Discard'));
      await tester.pumpAndSettle();
      expect(await result, 'discarded');
    });

    testWidgets(
      'DLG-15: a dialog opened from a dialog stacks above it with its own scrim, makes the '
      'first inert, returns focus into the first when it closes; Escape dismisses only the '
      'topmost',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        int firstPressed = 0;
        await openDialog(
          tester,
          (_) => basicDialog(autofocusCancel: true, onConfirm: () => firstPressed++),
        );
        expect(focusedLabel(), 'Cancel');
        final Future<Object?> second = showTanreiDialog<Object?>(
          context: tester.element(find.text('Cancel')),
          builder: (_) => basicDialog(headline: 'Really?', cancel: 'No', confirm: 'Yes'),
        );
        await tester.pumpAndSettle();
        final Color scrim = lightTheme.paint(dialogTokens.scrimColor);
        expect(scrimFinder(scrim), findsNWidgets(2), reason: 'a scrim of its own');
        expect(focusedLabel(), 'container', reason: 'focus moved into the second');
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(await second, isNull);
        expect(find.text('Really?'), findsNothing);
        expect(find.text('Discard draft?'), findsOneWidget, reason: 'only the topmost');
        expect(focusedLabel(), 'Cancel', reason: 'focus back inside the first');

        // The first is inert under the second.
        final Rect discard = tester.getRect(find.text('Discard'));
        unawaited(
          showTanreiDialog<Object?>(
            context: tester.element(find.text('Cancel')),
            barrierDismissible: false,
            builder: (_) =>
                basicDialog(headline: 'Wait', supportingText: '', cancel: 'N', confirm: 'Y'),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tapAt(discard.center);
        await tester.pump();
        expect(firstPressed, 0, reason: 'the first dialog is inert');
        expect(find.text('Wait'), findsOneWidget);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        expect(<String>['N', 'Y'], contains(focusedLabel()), reason: 'Tab stays in the second');
      },
    );
  });

  group('layout', () {
    testWidgets('DLG-7: centred in the safe area, margin from every edge and the keyboard, as wide '
        'as the content between min- and max-width, never wider than the window less the margins; '
        'container color, elevation and smoothed corners', (WidgetTester tester) async {
      await tester.pumpWidget(dialogApp());
      await openDialog(tester, (_) => basicDialog(supportingText: 'Short.'));
      final Size window = tester.view.physicalSize / tester.view.devicePixelRatio;
      Rect box = tester.getRect(containerFinder());
      expect(box.center.dx, moreOrLessEquals(window.width / 2));
      expect(box.center.dy, moreOrLessEquals(window.height / 2));
      expect(box.width, greaterThanOrEqualTo(dialogTokens.containerMinWidth));
      expect(box.width, lessThanOrEqualTo(dialogTokens.containerMaxWidth));
      final TanreiContainerDecoration decoration = containerDecoration(tester);
      expect(decoration.color, lightTheme.paint(dialogTokens.containerColor));
      expect(decoration.shape.radius, dialogTokens.containerShape);
      final TanreiResolvedElevation level3 = TanreiResolvedElevation.resolve(
        dialogTokens.containerElevation,
        lightTheme.colors,
      );
      expect(decoration.border, level3.ring);
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      // A long text reaches max-width.
      await openDialog(tester, (_) => basicDialog(supportingText: 'word ' * 80));
      expect(tester.getSize(containerFinder()).width, dialogTokens.containerMaxWidth);
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      // A narrow window: the margins win; a keyboard pushes it up.
      tester.view.physicalSize = const Size(300, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        dialogApp(
          media: (MediaQueryData d) => d.copyWith(viewInsets: const EdgeInsets.only(bottom: 300)),
        ),
      );
      await openDialog(tester, (_) => basicDialog());
      box = tester.getRect(containerFinder());
      expect(box.width, 300 - 2 * dialogTokens.containerMargin);
      expect(box.left, dialogTokens.containerMargin);
      expect(box.center.dy, moreOrLessEquals((700 - 300) / 2));
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      await tester.pumpWidget(dialogApp(theme: const TanreiThemeData(system: cupertinoSystem)));
      await openDialog(tester, (_) => basicDialog());
      expect(containerDecoration(tester).shape.smoothing, 0.6);
    });

    testWidgets(
      'DLG-8: padding on every side, the parts container.gap apart (empty ones left out), '
      'the actions actions.margin-block-start below; the texts in their tokens; the content '
      'handed content.color, plain text in sys.typescale.body',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        await openDialog(tester, (_) => basicDialog(child: const Text('Custom')));
        final Rect box = tester.getRect(containerFinder());
        final Rect headline = tester.getRect(find.text('Discard draft?'));
        final Rect supporting = tester.getRect(
          find.text('The message you were writing will be deleted from this device.'),
        );
        final Rect custom = tester.getRect(find.text('Custom'));
        final Rect cancel = tester.getRect(find.byType(TanreiButton).first);
        final double pad = dialogTokens.containerPadding;
        expect(headline.top - box.top, pad);
        expect(headline.left - box.left, pad);
        expect(supporting.top - headline.bottom, dialogTokens.containerGap);
        expect(custom.top - supporting.bottom, dialogTokens.containerGap);
        expect(box.bottom - tester.getRect(find.byType(OverflowBar)).bottom, pad);
        expect(
          tester.getRect(find.byType(OverflowBar)).top - custom.bottom,
          dialogTokens.actionsMarginBlockStart,
        );
        expect(cancel.height, greaterThan(0));
        expect(
          textStyleOf(tester, 'Discard draft?').color,
          lightTheme.paint(dialogTokens.headlineColor),
        );
        expect(
          textStyleOf(tester, 'Discard draft?').fontSize,
          dialogTokens.headlineTypescale.toTextStyle().fontSize,
        );
        expect(
          textStyleOf(
            tester,
            'The message you were writing will be deleted from this device.',
          ).color,
          lightTheme.paint(dialogTokens.supportingTextColor),
        );
        expect(textStyleOf(tester, 'Custom').color, lightTheme.paint(dialogTokens.contentColor));
        // 1c12655: plain text given as content takes sys.typescale.body, as the card's (CRD-13).
        final TextStyle plain = DefaultTextStyle.of(tester.element(find.text('Custom'))).style;
        final TanreiTextStyle body = tanreiSystem.typescale.body;
        expect(plain.fontSize, body.size);
        expect(plain.height, body.lineHeight / body.size);
        expect(plain.fontFamily, lightTheme.textStyle(body).fontFamily);
        expect(plain.color, lightTheme.paint(dialogTokens.contentColor));
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();

        // Headline only: no supporting part, no gap for it.
        await openDialog(tester, (_) => basicDialog(supportingText: ''));
        expect(
          tester.getRect(find.byType(OverflowBar)).top -
              tester.getRect(find.text('Discard draft?')).bottom,
          dialogTokens.actionsMarginBlockStart,
        );
      },
    );

    testWidgets(
      'DLG-9: an icon is drawn at icon.size in icon.color, unselected, and centres itself '
      'and the headline; without one the headline and the supporting text start-align',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        await openDialog(tester, (_) => basicDialog(icon: const Text('I')));
        final TanreiControlIcon icon = tester.widget<TanreiControlIcon>(
          find.byType(TanreiControlIcon),
        );
        expect(icon.size, dialogTokens.iconSize);
        expect(icon.color, lightTheme.paint(dialogTokens.iconColor));
        expect(icon.selected, isFalse);
        final Rect box = tester.getRect(containerFinder());
        expect(
          tester.getCenter(find.byType(TanreiControlIcon)).dx,
          moreOrLessEquals(box.center.dx),
        );
        expect(tester.getCenter(find.text('Discard draft?')).dx, moreOrLessEquals(box.center.dx));
        expect(
          tester.getRect(find.text('Discard draft?')).top -
              tester.getRect(find.byType(TanreiControlIcon)).bottom,
          dialogTokens.containerGap,
        );
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();
        await openDialog(tester, (_) => basicDialog(headline: 'Hi'));
        expect(
          tester.getRect(find.text('Hi')).left - tester.getRect(containerFinder()).left,
          dialogTokens.containerPadding,
        );
      },
    );

    testWidgets(
      'DLG-10: the actions sit in a row at the end, actions.gap apart, in order; when they '
      'do not fit they stack in a column at the end, in the same order; they are not restyled',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        await openDialog(tester, (_) => basicDialog());
        Rect cancel = tester.getRect(find.text('Cancel'));
        Rect discard = tester.getRect(find.text('Discard'));
        final Rect box = tester.getRect(containerFinder());
        expect(cancel.center.dy, discard.center.dy);
        expect(
          tester.getRect(find.byType(TanreiButton).at(1)).left -
              tester.getRect(find.byType(TanreiButton).at(0)).right,
          greaterThanOrEqualTo(dialogTokens.actionsGap - 0.01),
        );
        expect(
          box.right - tester.getRect(find.byType(TanreiButton).at(1)).right,
          lessThanOrEqualTo(dialogTokens.containerPadding + system.measure.targetTouch),
        );
        expect(
          tester.widget<TanreiButton>(find.byType(TanreiButton).first).variant,
          TanreiButtonVariant.text,
        );
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();

        tester.view.physicalSize = const Size(320, 700);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(dialogApp());
        await openDialog(
          tester,
          (_) => basicDialog(cancel: 'Keep everything as it is', confirm: 'Delete it all now'),
        );
        cancel = tester.getRect(find.text('Keep everything as it is'));
        discard = tester.getRect(find.text('Delete it all now'));
        expect(discard.top, greaterThan(cancel.bottom), reason: 'a column, in order');
      },
    );

    testWidgets(
      'DLG-11: parts that do not fit keep the headline and the actions in place and scroll '
      'the supporting text and the content, with a divider below the headline while scrolled '
      'from the top and above the actions while more lies below; none while everything fits',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        await openDialog(tester, (_) => basicDialog());
        expect(frameOf(tester).topDividerShown, isFalse);
        expect(frameOf(tester).bottomDividerShown, isFalse);
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();

        await openDialog(tester, (_) => basicDialog(supportingText: 'Terms of service. ' * 200));
        expect(frameOf(tester).scrollsWhole, isFalse);
        expect(frameOf(tester).topDividerShown, isFalse);
        expect(frameOf(tester).bottomDividerShown, isTrue);
        final Rect headline = tester.getRect(find.text('Discard draft?'));
        final Rect actions = tester.getRect(find.byType(OverflowBar));
        await tester.drag(dialogScroll(), const Offset(0, -150));
        await tester.pumpAndSettle();
        expect(tester.getRect(find.text('Discard draft?')), headline, reason: 'fixed');
        expect(tester.getRect(find.byType(OverflowBar)), actions, reason: 'fixed');
        expect(frameOf(tester).topDividerShown, isTrue);
        expect(frameOf(tester).bottomDividerShown, isTrue);
        await tester.drag(dialogScroll(), const Offset(0, -100000));
        await tester.pumpAndSettle();
        expect(frameOf(tester).topDividerShown, isTrue);
        expect(frameOf(tester).bottomDividerShown, isFalse);
        expect(
          find.byType(TanreiDialog),
          paints..rect(color: lightTheme.paint(dialogTokens.dividerColor)),
        );
      },
    );

    testWidgets('DLG-12: when the headline and the actions alone leave no room, everything scrolls '
        'together', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(400, 200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        dialogApp(media: (MediaQueryData d) => d.copyWith(textScaler: const TextScaler.linear(2))),
      );
      await openDialog(
        tester,
        (_) => basicDialog(headline: 'A headline that wraps at 200 percent'),
      );
      expect(frameOf(tester).scrollsWhole, isTrue);
      final Rect before = tester.getRect(find.text('A headline that wraps at 200 percent'));
      await tester.drag(find.byType(TanreiDialog), const Offset(0, -100));
      await tester.pumpAndSettle();
      expect(
        tester.getRect(find.text('A headline that wraps at 200 percent')).top,
        lessThan(before.top),
        reason: 'the headline scrolls with the rest',
      );
    });

    testWidgets(
      'DLG-16: in a right-to-left layout the texts align right and the actions sit at the '
      'left in the same order; the content follows the direction',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp(textDirection: TextDirection.rtl));
        await openDialog(tester, (_) => basicDialog(child: const Text('Custom')));
        final Rect box = tester.getRect(containerFinder());
        expect(
          box.right - tester.getRect(find.text('Discard draft?')).right,
          dialogTokens.containerPadding,
        );
        final Rect cancel = tester.getRect(find.text('Cancel'));
        final Rect discard = tester.getRect(find.text('Discard'));
        expect(
          discard.right,
          lessThan(cancel.left),
          reason: 'Cancel first in reading order, at right',
        );
        expect(
          tester.getRect(find.byType(TanreiButton).last).left - box.left,
          lessThan(box.right - tester.getRect(find.byType(TanreiButton).first).right),
          reason: 'the row at the left',
        );
        expect(Directionality.of(tester.element(find.text('Custom'))), TextDirection.rtl);
      },
    );
  });

  group('motion', () {
    testWidgets(
      'DLG-13: opening fades the scrim and the dialog in, growing it from enter-scale, over '
      'the enter motion; closing fades both out over the exit motion; focus moves at the start',
      (WidgetTester tester) async {
        await tester.pumpWidget(dialogApp());
        await openDialog(tester, (_) => basicDialog(), settle: false);
        expect(focusedLabel(), 'container', reason: 'focus moved at the start');
        await tester.pump(ms(dialogTokens.motionEnterDuration ~/ 2));
        final double t = dialogTokens.motionEnterEasing.toCurve().transform(0.5);
        final Transform transform = tester.widget<Transform>(
          find.ancestor(of: find.byType(TanreiDialog), matching: find.byType(Transform)).first,
        );
        expect(
          transform.transform.storage[0],
          moreOrLessEquals(dialogTokens.motionEnterScale + (1 - dialogTokens.motionEnterScale) * t),
        );
        final Opacity opacity = tester.widget<Opacity>(
          find.ancestor(of: find.byType(TanreiDialog), matching: find.byType(Opacity)).first,
        );
        expect(opacity.opacity, moreOrLessEquals(t));
        await tester.pumpAndSettle();
        Navigator.of(homeContext()).pop();
        await tester.pump();
        await tester.pump(ms(dialogTokens.motionExitDuration ~/ 2));
        expect(
          tester
              .widget<Transform>(
                find
                    .ancestor(of: find.byType(TanreiDialog), matching: find.byType(Transform))
                    .first,
              )
              .transform
              .storage[0],
          1,
          reason: 'no shrinking',
        );
        expect(
          tester
              .widget<Opacity>(
                find.ancestor(of: find.byType(TanreiDialog), matching: find.byType(Opacity)).first,
              )
              .opacity,
          moreOrLessEquals(1 - dialogTokens.motionExitEasing.toCurve().transform(0.5)),
        );
        await tester.pumpAndSettle();

        // Reduced motion: a fade without growing (iOS); at once on Android.
        debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
        await tester.pumpWidget(dialogApp(disableAnimations: true));
        await openDialog(tester, (_) => basicDialog(), settle: false);
        await tester.pump(ms(dialogTokens.motionEnterDuration ~/ 2));
        expect(
          tester
              .widget<Transform>(
                find
                    .ancestor(of: find.byType(TanreiDialog), matching: find.byType(Transform))
                    .first,
              )
              .transform
              .storage[0],
          1,
        );
        expect(
          tester
              .widget<Opacity>(
                find.ancestor(of: find.byType(TanreiDialog), matching: find.byType(Opacity)).first,
              )
              .opacity,
          lessThan(1),
        );
        await tester.pumpAndSettle();
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        await openDialog(tester, (_) => basicDialog(), settle: false);
        await tester.pump();
        expect(
          tester
              .widget<Opacity>(
                find.ancestor(of: find.byType(TanreiDialog), matching: find.byType(Opacity)).first,
              )
              .opacity,
          1,
        );
        Navigator.of(homeContext()).pop();
        await tester.pump();
        await tester.pump();
        expect(find.byType(TanreiDialog), findsNothing);
        debugDefaultTargetPlatformOverride = null;
      },
    );
  });

  group('accessibility', () {
    testWidgets('DLG-14: the container is a modal dialog — an alert dialog while alert — named by '
        'the headline and described by the supporting text; an alert is read at once; an empty '
        'headline still opens and is reported', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      await tester.pumpWidget(dialogApp());
      await openDialog(tester, (_) => basicDialog());
      SemanticsData node = tester.getSemantics(containerFinder()).getSemanticsData();
      expect(node.role, SemanticsRole.dialog);
      expect(node.label, 'Discard draft?');
      expect(node.hint, 'The message you were writing will be deleted from this device.');
      expect(node.hasFlag(SemanticsFlag.scopesRoute), isTrue);
      expect(node.hasFlag(SemanticsFlag.namesRoute), isTrue);
      expect(find.bySemanticsLabel('Discard draft?'), findsOneWidget, reason: 'read once');
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      tester.takeAnnouncements();
      await openDialog(tester, (_) => basicDialog(alert: true));
      node = tester.getSemantics(containerFinder()).getSemanticsData();
      expect(node.role, SemanticsRole.alertDialog);
      final List<CapturedAccessibilityAnnouncement> read = tester.takeAnnouncements();
      expect(read, hasLength(1));
      expect(
        read.single.message,
        'Discard draft?\nThe message you were writing will be deleted from this device.',
      );
      expect(read.single.assertiveness, Assertiveness.assertive);
      Navigator.of(homeContext()).pop();
      await tester.pumpAndSettle();

      final List<String> missing = collectMissingNames();
      await openDialog(tester, (_) => basicDialog(headline: ''));
      expect(find.byType(TanreiDialog), findsOneWidget);
      expect(missing, <String>['dialog']);
      handle.dispose();
    });

    testWidgets('a tooltip open inside the dialog takes Escape: the dialog stays (TIP-4)', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(dialogApp());
      final TanreiTooltipController tip = TanreiTooltipController();
      addTearDown(tip.dispose);
      await openDialog(
        tester,
        (_) => basicDialog(
          child: TanreiTooltip(
            message: 'More',
            controller: tip,
            child: TanreiButton(onPressed: () {}, child: const Text('Info')),
          ),
        ),
      );
      final Future<Object?> result = lastResult;
      tip.show();
      await tester.pumpAndSettle();
      expect(focusedLabel(), 'container', reason: 'focus is not on the anchor');
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(tip.isOpen, isFalse);
      expect(find.byType(TanreiDialog), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(await result, isNull);
    });

    testWidgets('snackbars wait: the dialog counts as a modal overlay while it is open', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(dialogApp());
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);
      await openDialog(tester, (_) => basicDialog());
      expect(TanreiModalOverlays.instance.count, 1);
      Navigator.of(homeContext()).pop();
      await tester.pump();
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);
      await tester.pumpAndSettle();
    });

    testWidgets('guidelines: an open dialog', (WidgetTester tester) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      for (final TanreiThemeData theme in <TanreiThemeData>[
        TanreiThemeData.light,
        TanreiThemeData.dark,
      ]) {
        await tester.pumpWidget(dialogApp(theme: theme));
        await openDialog(tester, (_) => basicDialog(icon: const Text('I')));
        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        await expectLater(tester, meetsGuideline(textContrastGuideline));
        Navigator.of(homeContext()).pop();
        await tester.pumpAndSettle();
      }
      handle.dispose();
    });

    // WCAG 1.4.3 / 1.4.11 in every scheme of the default system: headline, supporting text and
    // content 4.5:1 and the icon 3:1 on the container. An imitation preset is held to its original,
    // not to these criteria, in any scheme.
    test('contrast: "${system.id}" dialog texts 4.5:1 and the icon 3:1 on the container', () {
      final List<String> failures = <String>[];
      for (final Brightness brightness in Brightness.values) {
        for (final TanreiContrast contrast in TanreiContrast.values) {
          final TanreiThemeData theme = TanreiThemeData(
            system: system,
            brightness: brightness,
            contrast: contrast,
          );
          final TanreiDialogTokens t = system.dialog;
          final Color box = Color.alphaBlend(theme.paint(t.containerColor), theme.colors.surface);
          for (final (String part, TanreiPaint paint, double minimum)
              in <(String, TanreiPaint, double)>[
                ('headline', t.headlineColor, 4.5),
                ('supporting', t.supportingTextColor, 4.5),
                ('content', t.contentColor, 4.5),
                ('icon', t.iconColor, 3),
              ]) {
            final double ratio = contrastOf(Color.alphaBlend(theme.paint(paint), box), box);
            if (ratio < minimum) {
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
      expect(dialogTokens.containerColor, const TanreiPaint.role(TanreiColorRole.surfaceBright));
      expect(dialogTokens.containerElevation, system.elevation.level3);
      expect(dialogTokens.containerShape, system.shape.large);
      expect(dialogTokens.containerMinWidth, 280);
      expect(dialogTokens.containerMaxWidth, 560);
      expect(dialogTokens.scrimColor, const TanreiPaint.role(TanreiColorRole.scrim));
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": an open dialog draws that system\'s tokens', (
        WidgetTester tester,
      ) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        await tester.pumpWidget(dialogApp(theme: theme));
        await openDialog(tester, (_) => basicDialog());
        final TanreiContainerDecoration decoration = containerDecoration(tester);
        expect(decoration.color, theme.paint(shipped.dialog.containerColor));
        expect(decoration.shape.radius, shipped.dialog.containerShape);
        expect(decoration.shape.smoothing, shipped.shape.cornerSmoothing);
        expect(scrimFinder(theme.paint(shipped.dialog.scrimColor)), findsOneWidget);
        expect(
          textStyleOf(tester, 'Discard draft?').color,
          theme.paint(shipped.dialog.headlineColor),
        );
      });
    }
  });

  group('goldens', () {
    final List<Map<String, dynamic>> fixtures = specFixtures('dialog');

    test('the spec lists the fixtures this suite records, every one open', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'basic',
        'icon',
        'headline-only',
        'content',
        'scrolling',
      ]);
      for (final Map<String, dynamic> fixture in fixtures) {
        expect((fixture['props'] as Map<String, dynamic>)['open'], isTrue);
      }
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectDialogGolden(
          tester,
          system: system,
          builder: (_) => fixtureDialog(fixture),
          file: 'goldens/dialog/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the icon fixture shows the
    // preset's scrim, container, corners, icon, headline and actions at once.
    const String recorded = 'icon';
    for (final TanreiSystem preset in <TanreiSystem>[m3LikeSystem, cupertinoSystem]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectDialogGolden(
          tester,
          system: preset,
          builder: (_) =>
              fixtureDialog(fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded)),
          file: 'goldens/dialog/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
