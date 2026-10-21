import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_expressive_like.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

import '../../test_fixtures/acme_system.g.dart';
import '../systems.dart';
import 'fixture_golden.dart';
import 'navigation_harness.dart';
import 'sheet_harness.dart';

const TanreiSystem system = tanreiSystem;
final TanreiBottomSheetTokens sheetTokens = system.bottomSheet;
const TanreiThemeData lightTheme = TanreiThemeData.light;

/// The stage of every bottom sheet fixture: 400 x 720 with no system insets.
const Size stage = Size(400, 720);

/// The frame of the bottom sheet baselines: the stage in the `space200` padding of every baseline.
final Size sheetGoldenSurface = Size(
  stage.width + 2 * system.space.space200,
  stage.height + 2 * system.space.space200,
);

/// The height of the handle's row with the default tokens.
final double handleRow = sheetTokens.handleMarginBlock * 2 + sheetTokens.handleContainerHeight;

/// The fixtures, read from the spec.
final List<Map<String, dynamic>> fixtures = specFixtures('bottom-sheet');

/// The long text of the `modal-partial` fixture: far taller than the stage.
final String longText =
    fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == 'modal-partial')['content']
        as String;

/// The two-line text of the `modal` fixture.
final String shortText =
    fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == 'modal')['content'] as String;

/// The sheet a fixture describes, over a bare `surface` page in the stage.
Widget fixtureSheet(Map<String, dynamic> fixture) {
  final Map<String, dynamic> props = fixture['props'] as Map<String, dynamic>;
  return SizedBox.fromSize(
    size: stage,
    child: Stack(
      children: <Widget>[
        TanreiBottomSheet(
          variant: TanreiBottomSheetVariant.fromName(props['variant'] as String? ?? 'modal'),
          open: props['open'] == true,
          detent: TanreiBottomSheetDetent.fromName(props['detent'] as String? ?? 'partial'),
          dismissible: props['dismissible'] as bool? ?? true,
          showHandle: props['handle'] as bool? ?? true,
          handleSemanticLabel: props['handleLabel'] as String? ?? '',
          inset: props['inset'] as bool? ?? true,
          semanticLabel: props['label'] as String? ?? '',
          onClose: (_) {},
          child: Text(fixture['content'] as String),
        ),
      ],
    ),
  );
}

/// A page with a sheet whose owner keeps `open` and `detent`, recording every event: an Open
/// button and a Content button on the page, the sheet over it in a `Stack`.
class SheetOwner extends StatefulWidget {
  const SheetOwner({
    super.key,
    this.variant = TanreiBottomSheetVariant.modal,
    this.initialOpen = true,
    this.detent = TanreiBottomSheetDetent.partial,
    this.dismissible = true,
    this.showHandle = true,
    this.handleSemanticLabel = 'Resize sheet',
    this.inset = true,
    this.semanticLabel = 'Save photo',
    this.closeOnRequest = true,
    this.closes,
    this.detents,
    this.content,
    this.page,
  });

  final TanreiBottomSheetVariant variant;
  final bool initialOpen;
  final TanreiBottomSheetDetent detent;
  final bool dismissible;
  final bool showHandle;
  final String handleSemanticLabel;
  final bool inset;
  final String semanticLabel;

  /// Whether the owner sets open to false when the sheet asks.
  final bool closeOnRequest;
  final List<TanreiSheetCloseReason>? closes;
  final List<TanreiBottomSheetDetent>? detents;
  final Widget? content;
  final Widget? page;

  @override
  State<SheetOwner> createState() => SheetOwnerState();
}

class SheetOwnerState extends State<SheetOwner> {
  late bool open = widget.initialOpen;
  late TanreiBottomSheetDetent detent = widget.detent;

  void setOpen(bool value) => setState(() => open = value);

  void setDetent(TanreiBottomSheetDetent value) => setState(() => detent = value);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: <Widget>[
        Positioned.fill(
          child:
              widget.page ??
              Column(
                key: const ValueKey<String>('page'),
                children: <Widget>[
                  TanreiButton(onPressed: () => setOpen(!open), child: const Text('Open')),
                  TanreiButton(onPressed: () {}, child: const Text('Content')),
                ],
              ),
        ),
        TanreiBottomSheet(
          variant: widget.variant,
          open: open,
          detent: detent,
          dismissible: widget.dismissible,
          showHandle: widget.showHandle,
          handleSemanticLabel: widget.handleSemanticLabel,
          inset: widget.inset,
          semanticLabel: widget.semanticLabel,
          onClose: (TanreiSheetCloseReason reason) {
            widget.closes?.add(reason);
            if (widget.closeOnRequest) {
              setOpen(false);
            }
          },
          onDetentChanged: (TanreiBottomSheetDetent value) => widget.detents?.add(value),
          child: widget.content ?? Text(shortText),
        ),
      ],
    );
  }
}

Future<void> pumpSheet(WidgetTester tester, Widget app, {Size window = stage}) =>
    pumpInWindow(tester, app, window);

/// The sheet's visible rectangle (the container is drawn past the bottom edge and clipped there).
Finder sheetFinder() =>
    find.byWidgetPredicate((Widget w) => w is ClipRect && w.clipper is TanreiEdgeClipper);

Rect sheetRect(WidgetTester tester) => tester.getRect(sheetFinder());

TanreiContainerDecoration sheetDecoration(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find
                  .descendant(
                    of: sheetFinder(),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                    ),
                  )
                  .first,
            )
            .decoration
        as TanreiContainerDecoration;

/// The drag handle's box.
Finder handleBox() => find.descendant(
  of: find.byType(TanreiBottomSheet),
  matching: find.byType(TanreiControlContainer),
);

TanreiControlContainer handleContainer(WidgetTester tester) =>
    tester.widget<TanreiControlContainer>(handleBox());

/// The grip's decoration.
TanreiContainerDecoration gripDecoration(WidgetTester tester) =>
    tester
            .widget<DecoratedBox>(
              find
                  .descendant(
                    of: handleBox(),
                    matching: find.byWidgetPredicate(
                      (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                    ),
                  )
                  .last,
            )
            .decoration
        as TanreiContainerDecoration;

/// The interactive handle: a button named 'Resize sheet'.
Finder handleButton() => find.byWidgetPredicate(
  (Widget w) => w is Semantics && w.properties.button == true && w.properties.expanded != null,
);

/// The handle's focus ring.
Finder handleRing() =>
    find.descendant(of: find.byType(TanreiBottomSheet), matching: find.byType(TanreiFocusRing));

double handleOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.ancestor(of: handleRing(), matching: find.byType(Opacity)).first)
    .opacity;

Finder contentScroll() => find.descendant(
  of: find.byType(TanreiBottomSheet),
  matching: find.byType(SingleChildScrollView),
);

double scrollOffset(WidgetTester tester) =>
    tester.widget<SingleChildScrollView>(contentScroll()).controller!.offset;

Finder scrimFinder() => find.descendant(
  of: find.byType(TanreiBottomSheet),
  matching: find.byWidgetPredicate(
    (Widget w) => w is ColoredBox && w.color == lightTheme.paint(sheetTokens.scrimColor),
  ),
);

double scrimOpacity(WidgetTester tester) => tester
    .widget<Opacity>(find.ancestor(of: scrimFinder(), matching: find.byType(Opacity)).first)
    .opacity;

/// Two buttons as content.
Widget buttonsContent({bool autofocusSecond = false}) => Column(
  mainAxisSize: MainAxisSize.min,
  children: <Widget>[
    TanreiButton(onPressed: () {}, child: const Text('Save')),
    TanreiButton(autofocus: autofocusSecond, onPressed: () {}, child: const Text('Cancel')),
  ],
);

void main() {
  tearDown(() {
    FocusManager.instance.highlightStrategy = FocusHighlightStrategy.automatic;
    debugDefaultTargetPlatformOverride = null;
  });

  final Duration hold = tanreiDuration(system.motion.duration.pressHold);
  const Duration tick = Duration(milliseconds: 1);
  final Duration enter = tanreiDuration(sheetTokens.motionEnterDuration);
  final Duration exit = tanreiDuration(sheetTokens.motionExitDuration);
  final double partialHeight = stage.height * sheetTokens.containerPartialFraction;
  final double fullHeight = stage.height - sheetTokens.containerMarginBlockStart;

  group('presentation', () {
    testWidgets('BSH-1: opening slides the sheet up from below the bottom edge over the enter '
        'motion and fades the scrim in; closing slides it down and fades the scrim over the exit '
        'motion; reduced motion fades in place (at once on Android); a sheet mounted open appears '
        'in place', (WidgetTester tester) async {
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(tester, sheetApp(SheetOwner(key: owner, initialOpen: false)));
      expect(find.text(shortText), findsNothing);
      owner.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      final double t = sheetTokens.motionEnterEasing.toCurve().transform(0.5);
      await tester.pump();
      final double h = sheetRect(tester).height;
      await tester.pumpAndSettle();
      final double restingTop = sheetRect(tester).top;
      expect(sheetRect(tester).bottom, stage.height);

      // Measure the middle of the motion on a fresh sheet.
      owner.currentState!.setOpen(false);
      await tester.pumpAndSettle();
      owner.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(sheetRect(tester).top, moreOrLessEquals(restingTop + (1 - t) * h, epsilon: 0.5));
      expect(scrimOpacity(tester), moreOrLessEquals(t, epsilon: 0.01));
      await tester.pumpAndSettle();
      expect(scrimOpacity(tester), 1);

      owner.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump(exit ~/ 2);
      final double e = sheetTokens.motionExitEasing.toCurve().transform(0.5);
      expect(sheetRect(tester).top, moreOrLessEquals(restingTop + e * h, epsilon: 0.5));
      expect(scrimOpacity(tester), moreOrLessEquals(1 - e, epsilon: 0.01));
      await tester.pumpAndSettle();
      expect(find.text(shortText), findsNothing);

      // Reduced motion on iOS: fades in place.
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      final GlobalKey<SheetOwnerState> fading = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: fading, initialOpen: false), disableAnimations: true),
      );
      fading.currentState!.setOpen(true);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(sheetRect(tester).top, moreOrLessEquals(restingTop, epsilon: 0.5));
      final Opacity sheetFade = tester.widget<Opacity>(
        find.ancestor(of: sheetFinder(), matching: find.byType(Opacity)).first,
      );
      expect(sheetFade.opacity, moreOrLessEquals(t, epsilon: 0.01));
      await tester.pumpAndSettle();
      debugDefaultTargetPlatformOverride = null;

      // Reduced motion on Android: at once.
      final GlobalKey<SheetOwnerState> atOnce = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: atOnce, initialOpen: false), disableAnimations: true),
      );
      atOnce.currentState!.setOpen(true);
      await tester.pump();
      expect(sheetRect(tester).top, moreOrLessEquals(restingTop, epsilon: 0.5));
      atOnce.currentState!.setOpen(false);
      await tester.pump();
      await tester.pump();
      expect(find.text(shortText), findsNothing);

      // Mounted open: in place from the first frame.
      await tester.pumpWidget(sheetApp(SheetOwner(key: UniqueKey())));
      expect(sheetRect(tester).top, moreOrLessEquals(restingTop, epsilon: 0.5));
      expect(scrimOpacity(tester), 1);
    });

    testWidgets('BSH-2: an open modal sheet keeps Tab inside it, both ways, makes the page behind '
        'hidden from assistive technology and unpressable, and keeps it from scrolling', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle handle = tester.ensureSemantics();
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      final ScrollController pageScroll = ScrollController();
      addTearDown(pageScroll.dispose);
      int pagePresses = 0;
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: owner,
            initialOpen: false,
            closeOnRequest: false,
            content: buttonsContent(),
            page: ListView(
              controller: pageScroll,
              children: <Widget>[
                TanreiButton(
                  onPressed: () => owner.currentState!.setOpen(true),
                  child: const Text('Open'),
                ),
                TanreiButton(onPressed: () => pagePresses++, child: const Text('Content')),
                const SizedBox(height: 2000),
              ],
            ),
          ),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Open');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(focusInside<TanreiBottomSheet>(), isTrue);
      final Set<String> seen = <String>{};
      for (int i = 0; i < 5; i++) {
        await tabTimes(tester, 1);
        seen.add(focusedLabel());
        expect(focusInside<TanreiBottomSheet>(), isTrue);
      }
      expect(seen, <String>{'Save', 'Cancel'});
      for (int i = 0; i < 3; i++) {
        await tabTimes(tester, 1, shift: true);
        expect(focusInside<TanreiBottomSheet>(), isTrue);
      }

      await tester.tapAt(tester.getCenter(find.text('Content')));
      await tester.pump();
      expect(pagePresses, 0, reason: 'the scrim took the press');
      await tester.dragFrom(const Offset(200, 200), const Offset(0, -200));
      await tester.pumpAndSettle();
      expect(pageScroll.offset, 0, reason: 'the page behind does not scroll');
      expect(
        nodesBelow(
          semanticsRoot(tester),
        ).where((SemanticsNode n) => n.getSemanticsData().label == 'Content'),
        isEmpty,
      );
      expect(TanreiModalOverlays.instance.isAnyOpen, isTrue);
      owner.currentState!.setOpen(false);
      await tester.pumpAndSettle();
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);
      handle.dispose();
    });

    testWidgets('BSH-3: opening moves focus to the content\'s autofocus widget, or to the sheet; '
        'closing returns it when the sheet closes; a standard sheet mounted open moves none, a '
        'modal one moves focus in as if it had just opened', (WidgetTester tester) async {
      for (final TanreiBottomSheetVariant variant in TanreiBottomSheetVariant.values) {
        final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SheetOwner(
              key: owner,
              variant: variant,
              initialOpen: false,
              content: buttonsContent(autofocusSecond: true),
            ),
          ),
        );
        FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
        await tabTimes(tester, 1);
        expect(focusedLabel(), 'Open');
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        await tester.pump();
        expect(focusedLabel(), 'Cancel', reason: '$variant: when it opens, not after its motion');
        owner.currentState!.setOpen(false);
        await tester.pump();
        expect(focusedLabel(), 'Open', reason: '$variant: when it closes');
        await tester.pumpAndSettle();

        // Without a mark: the sheet itself.
        final GlobalKey<SheetOwnerState> plain = GlobalKey<SheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SheetOwner(key: plain, variant: variant, initialOpen: false, content: buttonsContent()),
          ),
        );
        await tabTimes(tester, 1);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        await tester.pump();
        expect(focusInside<TanreiBottomSheet>(), isTrue);
        expect(FocusManager.instance.primaryFocus, isA<FocusScopeNode>());
        await tester.pumpAndSettle();

        // Where the element that had focus is gone: nowhere in particular, not the sheet.
        final GlobalKey<SheetOwnerState> gone = GlobalKey<SheetOwnerState>();
        bool showOpen = true;
        late StateSetter setPage;
        await pumpSheet(
          tester,
          sheetApp(
            SheetOwner(
              key: gone,
              variant: variant,
              initialOpen: false,
              content: buttonsContent(autofocusSecond: true),
              page: StatefulBuilder(
                builder: (BuildContext context, StateSetter set) {
                  setPage = set;
                  return Column(
                    children: <Widget>[
                      if (showOpen)
                        TanreiButton(
                          onPressed: () => gone.currentState!.setOpen(true),
                          child: const Text('Open'),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        );
        await tabTimes(tester, 1);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pumpAndSettle();
        setPage(() => showOpen = false);
        await tester.pump();
        gone.currentState!.setOpen(false);
        await tester.pump();
        expect(focusInside<TanreiBottomSheet>(), isFalse);
        await tester.pumpAndSettle();
      }

      // Mounted open: a standard sheet leaves focus where it is.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: UniqueKey(),
            variant: TanreiBottomSheetVariant.standard,
            content: buttonsContent(),
          ),
        ),
      );
      expect(focusInside<TanreiBottomSheet>(), isFalse, reason: 'standard, mounted open');

      // A modal sheet mounted open moves focus in, as if it had just opened: to the content's
      // autofocus widget, or to the sheet itself.
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: UniqueKey(), content: buttonsContent(autofocusSecond: true))),
      );
      expect(focusedLabel(), 'Cancel', reason: 'modal, mounted open, with a mark');
      await pumpSheet(tester, sheetApp(SheetOwner(key: UniqueKey(), content: buttonsContent())));
      expect(focusInside<TanreiBottomSheet>(), isTrue, reason: 'modal, mounted open');
      expect(FocusManager.instance.primaryFocus, isA<FocusScopeNode>());
    });

    testWidgets('BSH-4: a standard sheet draws no scrim, makes nothing inert, lets Tab leave it '
        'without closing it, ignores Escape and back, docks to its parent\'s bottom edge without '
        'moving the content, and lets presses above it reach the content', (
      WidgetTester tester,
    ) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      int contentPresses = 0;
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: owner,
            variant: TanreiBottomSheetVariant.standard,
            initialOpen: false,
            closes: closes,
            content: buttonsContent(),
            page: Column(
              children: <Widget>[
                TanreiButton(
                  onPressed: () => owner.currentState!.setOpen(true),
                  child: const Text('Open'),
                ),
                TanreiButton(onPressed: () => contentPresses++, child: const Text('Content')),
              ],
            ),
          ),
        ),
      );
      final Rect contentBefore = tester.getRect(find.text('Content'));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(scrimFinder(), findsNothing);
      expect(tester.getRect(find.text('Content')), contentBefore);
      expect(sheetRect(tester).bottom, stage.height);
      expect(TanreiModalOverlays.instance.isAnyOpen, isFalse);

      // Tab leaves the sheet, and comes back; the sheet stays open.
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Save');
      final Set<String> outside = <String>{};
      for (int i = 0; i < 4; i++) {
        await tabTimes(tester, 1);
        if (!focusInside<TanreiBottomSheet>()) {
          outside.add(focusedLabel());
        }
      }
      expect(outside, isNotEmpty);
      expect(owner.currentState!.open, isTrue);

      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(closes, isEmpty);
      expect(owner.currentState!.open, isTrue);

      await tester.tap(find.text('Content'));
      await tester.pump();
      expect(contentPresses, 1);
    });

    testWidgets('BSH-5: the scrim, Escape and back each ask a dismissible modal sheet to close '
        'once, with their reason; the owner closes it; not dismissible, they do nothing and the '
        'scrim still takes the press', (WidgetTester tester) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      Future<GlobalKey<SheetOwnerState>> openSheet({
        bool dismissible = true,
        bool closeOnRequest = true,
      }) async {
        final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
        await pumpSheet(
          tester,
          sheetApp(
            SheetOwner(
              key: owner,
              initialOpen: false,
              closes: closes,
              dismissible: dismissible,
              closeOnRequest: closeOnRequest,
              content: buttonsContent(),
            ),
          ),
        );
        owner.currentState!.setOpen(true);
        await tester.pumpAndSettle();
        return owner;
      }

      GlobalKey<SheetOwnerState> owner = await openSheet();
      await tester.tapAt(const Offset(200, 100));
      await tester.pumpAndSettle();
      expect(closes, <TanreiSheetCloseReason>[TanreiSheetCloseReason.scrim]);
      expect(owner.currentState!.open, isFalse);

      owner = await openSheet();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(closes.last, TanreiSheetCloseReason.escape);
      expect(owner.currentState!.open, isFalse);

      owner = await openSheet();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(closes.last, TanreiSheetCloseReason.back);
      expect(owner.currentState!.open, isFalse);
      expect(find.text('Open'), findsOneWidget, reason: 'the page stayed');
      expect(closes, hasLength(3));

      // Controlled: one request per press, and the sheet stays until its owner closes it.
      owner = await openSheet(closeOnRequest: false);
      await tester.tapAt(const Offset(200, 100));
      await tester.tapAt(const Offset(200, 100));
      await tester.pumpAndSettle();
      expect(closes, hasLength(4));
      expect(owner.currentState!.open, isTrue);

      // Not dismissible: nothing asks, and nothing behind is pressed.
      owner = await openSheet(dismissible: false);
      await tester.tapAt(tester.getCenter(find.text('Open')));
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(closes, hasLength(4));
      expect(owner.currentState!.open, isTrue);
      expect(find.text('Open'), findsOneWidget);
    });

    testWidgets('BSH-23: a dialog opened from a modal sheet stays above it, Escape closes only '
        'the dialog, and the sheet gets back the focus the dialog returns', (
      WidgetTester tester,
    ) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: owner,
            initialOpen: false,
            closes: closes,
            content: Builder(
              builder: (BuildContext context) => TanreiButton(
                onPressed: () => unawaited(
                  showTanreiDialog<void>(
                    context: context,
                    builder: (BuildContext dialog) => TanreiDialog(
                      headline: 'Delete photo?',
                      actions: <Widget>[
                        TanreiButton(
                          onPressed: () => Navigator.of(dialog).pop(),
                          child: const Text('Keep'),
                        ),
                      ],
                    ),
                  ),
                ),
                child: const Text('Delete'),
              ),
            ),
          ),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      owner.currentState!.setOpen(true);
      await tester.pumpAndSettle();
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Delete');
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(find.text('Delete photo?'), findsOneWidget);
      // The sheet is below: a press on it lands on the dialog's barrier.
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();
      expect(find.text('Delete photo?'), findsNothing);
      expect(closes, isEmpty, reason: 'Escape dismissed only the topmost overlay');
      expect(find.text('Delete'), findsOneWidget);
      expect(focusedLabel(), 'Delete');
    });
  });

  group('layout', () {
    testWidgets('BSH-6: as tall as its handle row and content, up to partial-fraction of the area '
        'or the area less margin-block-start; the area ends at the top inset of a modal sheet and '
        'at the keyboard; a short sheet has one height and detent changes nothing', (
      WidgetTester tester,
    ) async {
      await pumpSheet(tester, sheetApp(const SheetOwner()));
      final double text = tester.getSize(find.text(shortText)).height;
      expect(
        sheetRect(tester).height,
        moreOrLessEquals(handleRow + text + sheetTokens.containerPadding),
      );
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: UniqueKey(), detent: TanreiBottomSheetDetent.full)),
      );
      expect(
        sheetRect(tester).height,
        moreOrLessEquals(handleRow + text + sheetTokens.containerPadding),
        reason: 'one height: detent changes nothing',
      );

      await pumpSheet(tester, sheetApp(SheetOwner(key: UniqueKey(), content: Text(longText))));
      expect(sheetRect(tester).height, moreOrLessEquals(partialHeight));
      expect(sheetRect(tester).bottom, stage.height);
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: UniqueKey(),
            content: Text(longText),
            detent: TanreiBottomSheetDetent.full,
          ),
        ),
      );
      expect(sheetRect(tester).height, moreOrLessEquals(fullHeight));
      expect(sheetRect(tester).top, sheetTokens.containerMarginBlockStart);

      // A modal sheet's area starts below the top inset.
      const double top = 24;
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: UniqueKey(),
            content: Text(longText),
            detent: TanreiBottomSheetDetent.full,
          ),
          padding: const EdgeInsets.only(top: top),
        ),
      );
      expect(sheetRect(tester).top, top + sheetTokens.containerMarginBlockStart);

      // The keyboard: both heights from the smaller area, the sheet on the keyboard.
      const double keyboard = 300;
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          viewInsets: const EdgeInsets.only(bottom: keyboard),
        ),
      );
      expect(sheetRect(tester).bottom, stage.height - keyboard);
      expect(
        sheetRect(tester).height,
        moreOrLessEquals((stage.height - keyboard) * sheetTokens.containerPartialFraction),
      );
    });

    testWidgets('BSH-7: at the area\'s bottom edge, no wider than max-width and centred, in the '
        'container color and elevation, top corners rounded and bottom corners square, its color '
        'under the bottom inset and its content above it', (WidgetTester tester) async {
      await pumpSheet(
        tester,
        sheetApp(const SheetOwner(), padding: const EdgeInsets.only(bottom: 34)),
        window: const Size(800, 720),
      );
      final Rect sheet = sheetRect(tester);
      expect(sheet.width, sheetTokens.containerMaxWidth);
      expect(sheet.center.dx, 400);
      expect(sheet.bottom, 720);
      expect(tester.getRect(find.text(shortText)).bottom, lessThanOrEqualTo(720 - 34 - 16));
      final TanreiContainerDecoration decoration = sheetDecoration(tester);
      expect(decoration.color, lightTheme.paint(sheetTokens.containerColor));
      final TanreiResolvedElevation elevation = TanreiResolvedElevation.resolve(
        sheetTokens.containerElevation,
        lightTheme.colors,
      );
      expect(decoration.border, elevation.ring);
      expect(decoration.boxShadow, elevation.shadows);
      expect(decoration.shape.radius, sheetTokens.containerShape);
      // The container is drawn past the bottom edge by the radius, and clipped there.
      final Rect drawn = tester.getRect(
        find
            .descendant(
              of: sheetFinder(),
              matching: find.byWidgetPredicate(
                (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
              ),
            )
            .first,
      );
      expect(drawn.bottom, sheet.bottom + sheetTokens.containerShape);
      expect(tester.widget<ClipRect>(sheetFinder()).clipper, isA<TanreiEdgeClipper>());
    });

    testWidgets('BSH-8: the handle\'s row, then the content inset by container.padding from the '
        'start, end and bottom (and the top without a handle), flush when inset is false, clipped '
        'to the container, in content.color and the body style', (WidgetTester tester) async {
      await pumpSheet(tester, sheetApp(const SheetOwner()));
      final double p = sheetTokens.containerPadding;
      Rect sheet = sheetRect(tester);
      Rect text = tester.getRect(find.text(shortText));
      expect(text.top - sheet.top, handleRow);
      expect(text.left - sheet.left, p);
      expect(sheet.right - text.right, p);
      expect(sheet.bottom - text.bottom, p);
      final TextStyle style = tester
          .widget<RichText>(
            find.descendant(of: find.text(shortText), matching: find.byType(RichText)),
          )
          .text
          .style!;
      final TextStyle body = lightTheme.textStyle(
        system.typescale.body,
        color: lightTheme.paint(sheetTokens.contentColor),
      );
      expect(style.color, body.color);
      expect(style.fontSize, body.fontSize);
      expect(style.height, body.height);
      expect(
        find.descendant(of: find.byType(TanreiBottomSheet), matching: find.byType(ClipPath)),
        findsWidgets,
      );

      await pumpSheet(tester, sheetApp(SheetOwner(key: UniqueKey(), showHandle: false)));
      sheet = sheetRect(tester);
      text = tester.getRect(find.text(shortText));
      expect(text.top - sheet.top, p);
      expect(handleBox(), findsNothing);

      await pumpSheet(tester, sheetApp(SheetOwner(key: UniqueKey(), inset: false)));
      sheet = sheetRect(tester);
      text = tester.getRect(find.text(shortText));
      expect(text.top - sheet.top, handleRow);
      expect(text.left, sheet.left);
      expect(text.right, sheet.right);
      expect(text.bottom, sheet.bottom);
    });

    testWidgets('BSH-12: the handle\'s box container-width x container-height with container-shape '
        'corners, margin-block above and below, centred; the grip grip-width x grip-height in its '
        'color, centred in it; the row stays while the content scrolls', (
      WidgetTester tester,
    ) async {
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText))));
      final Rect sheet = sheetRect(tester);
      final Rect box = tester.getRect(handleBox());
      expect(box.size, Size(sheetTokens.handleContainerWidth, sheetTokens.handleContainerHeight));
      expect(box.top - sheet.top, sheetTokens.handleMarginBlock);
      expect(box.center.dx, sheet.center.dx);
      final Rect grip = tester.getRect(
        find
            .descendant(
              of: handleBox(),
              matching: find.byWidgetPredicate(
                (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
              ),
            )
            .last,
      );
      expect(grip.size, Size(sheetTokens.handleGripWidth, sheetTokens.handleGripHeight));
      expect(grip.center, box.center);
      expect(
        gripDecoration(tester).color,
        lightTheme.paint(sheetTokens.controls.dragHandle.enabled.gripColor),
      );
      expect(gripDecoration(tester).shape.radius, sheetTokens.handleContainerShape);
      expect(handleContainer(tester).shape.radius, sheetTokens.handleContainerShape);
      expect(handleContainer(tester).visuals.container.a, 0, reason: 'clear at rest');

      final ScrollController scroll = tester
          .widget<SingleChildScrollView>(contentScroll())
          .controller!;
      scroll.jumpTo(200);
      await tester.pump();
      expect(tester.getRect(handleBox()), box);
    });

    testWidgets('BSH-24: enlarged text grows the sheet up to its detent\'s height and scrolls the '
        'rest; the drag handle does not scale', (WidgetTester tester) async {
      await pumpSheet(tester, sheetApp(const SheetOwner(), textScaler: const TextScaler.linear(2)));
      final double text = tester.getSize(find.text(shortText)).height;
      expect(
        sheetRect(tester).height,
        moreOrLessEquals(math.min(handleRow + text + sheetTokens.containerPadding, partialHeight)),
      );
      expect(
        tester.getSize(handleBox()),
        Size(sheetTokens.handleContainerWidth, sheetTokens.handleContainerHeight),
      );
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          textScaler: const TextScaler.linear(2),
        ),
      );
      expect(sheetRect(tester).height, moreOrLessEquals(partialHeight));
      final ScrollPosition position = tester
          .widget<SingleChildScrollView>(contentScroll())
          .controller!
          .position;
      expect(position.maxScrollExtent, greaterThan(0));
    });

    testWidgets('BSH-26: right to left, the container and the drag handle stay centred and the '
        'content follows the direction', (WidgetTester tester) async {
      await pumpSheet(
        tester,
        sheetApp(
          const SheetOwner(
            content: Align(alignment: AlignmentDirectional.centerStart, child: Text('Hi')),
          ),
          textDirection: TextDirection.rtl,
        ),
        window: const Size(800, 720),
      );
      final Rect sheet = sheetRect(tester);
      expect(sheet.center.dx, 400);
      expect(tester.getRect(handleBox()).center.dx, 400);
      expect(tester.getRect(find.text('Hi')).right, sheet.right - sheetTokens.containerPadding);
    });
  });

  group('drag', () {
    testWidgets('BSH-9: a drag by the handle\'s row follows the finger, never above full; a '
        'release settles at the nearest height or the next one in a fling\'s direction over the '
        'enter motion and reports a new detent once; below half the lowest height or a fling '
        'down from it asks to close; not dismissible it settles at the lowest height', (
      WidgetTester tester,
    ) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final List<TanreiBottomSheetDetent> detents = <TanreiBottomSheetDetent>[];
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: owner, closes: closes, detents: detents, content: Text(longText))),
      );
      final double top = sheetRect(tester).top;
      expect(top, stage.height - partialHeight);
      final Offset row = Offset(stage.width / 4, top + handleRow / 2);

      // Follows the finger (from where it went down), never above full.
      final TestGesture drag = await tester.startGesture(row);
      await drag.moveBy(const Offset(0, -40));
      await drag.moveBy(const Offset(0, -40));
      await tester.pump();
      expect(sheetRect(tester).top, moreOrLessEquals(top - 80));
      await drag.moveBy(const Offset(0, -1000));
      await tester.pump();
      expect(sheetRect(tester).top, sheetTokens.containerMarginBlockStart);
      // Released nearer full: settles there over the enter motion.
      await drag.moveBy(const Offset(0, 60));
      await tester.pump();
      final double released = sheetRect(tester).top;
      await drag.up();
      await tester.pump();
      await tester.pump(enter ~/ 2);
      final double t = sheetTokens.motionEnterEasing.toCurve().transform(0.5);
      expect(
        sheetRect(tester).top,
        moreOrLessEquals(
          released + (sheetTokens.containerMarginBlockStart - released) * t,
          epsilon: 1,
        ),
      );
      await tester.pumpAndSettle();
      expect(sheetRect(tester).top, sheetTokens.containerMarginBlockStart);
      expect(detents, <TanreiBottomSheetDetent>[TanreiBottomSheetDetent.full]);

      // A fling down from full goes to partial, the next height; not further.
      await tester.flingFrom(
        Offset(stage.width / 4, sheetTokens.containerMarginBlockStart + handleRow / 2),
        const Offset(0, 60),
        1000,
      );
      await tester.pumpAndSettle();
      expect(sheetRect(tester).top, stage.height - partialHeight);
      expect(detents.last, TanreiBottomSheetDetent.partial);
      expect(closes, isEmpty);

      // A short drag springs back without an event.
      await tester.dragFrom(row, const Offset(0, 60));
      await tester.pumpAndSettle();
      expect(sheetRect(tester).top, stage.height - partialHeight);
      expect(detents, hasLength(2));

      // A fling down from the lowest height asks to close.
      await tester.flingFrom(row, const Offset(0, 60), 1000);
      await tester.pumpAndSettle();
      expect(closes, <TanreiSheetCloseReason>[TanreiSheetCloseReason.drag]);
      expect(owner.currentState!.open, isFalse);

      // Released below half of the lowest height asks to close.
      final GlobalKey<SheetOwnerState> second = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: second, closes: closes, content: Text(longText))),
      );
      await tester.timedDragFrom(row, Offset(0, partialHeight * 0.6), const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(closes, hasLength(2));
      expect(second.currentState!.open, isFalse);

      // Not dismissible: settles at the lowest height, nothing asked.
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), closes: closes, dismissible: false, content: Text(longText)),
        ),
      );
      await tester.timedDragFrom(row, Offset(0, partialHeight * 0.8), const Duration(seconds: 2));
      await tester.pumpAndSettle();
      await tester.flingFrom(row, const Offset(0, 60), 1000);
      await tester.pumpAndSettle();
      expect(closes, hasLength(2));
      expect(sheetRect(tester).top, stage.height - partialHeight);
    });

    testWidgets('BSH-10: the content scrolls below the handle row at either height; an upward drag '
        'on it first raises the sheet to full, then scrolls; a downward drag first scrolls to the '
        'top, then lowers the sheet; assistive technology can scroll it', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final List<TanreiBottomSheetDetent> detents = <TanreiBottomSheetDetent>[];
      await pumpSheet(tester, sheetApp(SheetOwner(detents: detents, content: Text(longText))));
      final Offset onContent = Offset(stage.width / 2, stage.height - 100);
      final double raise = partialHeight - (fullHeight - partialHeight) / 2;
      expect(raise, greaterThan(0));
      final TestGesture drag = await tester.startGesture(onContent);
      await drag.moveBy(const Offset(0, -20));
      await drag.moveBy(const Offset(0, -100));
      await tester.pump();
      expect(sheetRect(tester).top, moreOrLessEquals(stage.height - partialHeight - 120));
      expect(scrollOffset(tester), 0, reason: 'the sheet rises first');
      await drag.moveBy(Offset(0, -(fullHeight - partialHeight - 120) - 50));
      await tester.pump();
      expect(sheetRect(tester).top, sheetTokens.containerMarginBlockStart);
      expect(scrollOffset(tester), moreOrLessEquals(50), reason: 'then the content scrolls');
      await drag.up();
      await tester.pumpAndSettle();
      expect(sheetRect(tester).top, sheetTokens.containerMarginBlockStart);
      expect(detents, <TanreiBottomSheetDetent>[TanreiBottomSheetDetent.full]);

      // Down: scrolls to the top first, then lowers the sheet.
      final double scrolled = scrollOffset(tester);
      final TestGesture down = await tester.startGesture(onContent);
      await down.moveBy(const Offset(0, 20));
      await down.moveBy(Offset(0, scrolled + 30));
      await tester.pump();
      expect(scrollOffset(tester), 0);
      expect(sheetRect(tester).top, moreOrLessEquals(sheetTokens.containerMarginBlockStart + 50));
      await down.up();
      await tester.pumpAndSettle();

      // Assistive technology scrolls the content.
      final SemanticsNode scrollNode = nodesBelow(
        semanticsRoot(tester),
      ).firstWhere((SemanticsNode n) => n.getSemanticsData().hasAction(SemanticsAction.scrollUp));
      expect(scrollNode, isNotNull);
      semantics.dispose();
    });

    testWidgets('BSH-20: a drag that asks to close emits close, holds for one frame, then slides '
        'out from where it was if the owner closed it, or settles back at the lowest height', (
      WidgetTester tester,
    ) async {
      final List<TanreiSheetCloseReason> closes = <TanreiSheetCloseReason>[];
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: owner, closes: closes, closeOnRequest: false, content: Text(longText)),
        ),
      );
      final double top = sheetRect(tester).top;
      final Offset row = Offset(stage.width / 4, top + handleRow / 2);
      final TestGesture drag = await tester.startGesture(row);
      await drag.moveBy(const Offset(0, 20));
      await drag.moveBy(Offset(0, partialHeight * 0.6));
      await tester.pump(const Duration(seconds: 1));
      final double released = sheetRect(tester).top;
      await drag.up();
      expect(closes, <TanreiSheetCloseReason>[TanreiSheetCloseReason.drag]);
      await tester.pump();
      expect(sheetRect(tester).top, released, reason: 'held for one frame');
      await tester.pump();
      await tester.pump(enter ~/ 2);
      expect(sheetRect(tester).top, lessThan(released), reason: 'declined: settling back');
      await tester.pumpAndSettle();
      expect(sheetRect(tester).top, top);

      // Closed by its owner: slides out from where the drag left it.
      final GlobalKey<SheetOwnerState> closing = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: closing, closes: closes, content: Text(longText))),
      );
      final TestGesture second = await tester.startGesture(row);
      await second.moveBy(const Offset(0, 20));
      await second.moveBy(Offset(0, partialHeight * 0.6));
      await tester.pump(const Duration(seconds: 1));
      final double from = sheetRect(tester).top;
      await second.up();
      await tester.pump();
      expect(closing.currentState!.open, isFalse);
      expect(sheetRect(tester).top, moreOrLessEquals(from, epsilon: 0.5));
      await tester.pump(exit ~/ 2);
      expect(sheetRect(tester).top, greaterThan(from));
      await tester.pumpAndSettle();
      expect(find.text(longText), findsNothing);
    });

    testWidgets('BSH-21: a detent the product sets moves the sheet over the enter motion without '
        'an event; a height the person chose stays until the product sets detent again', (
      WidgetTester tester,
    ) async {
      final List<TanreiBottomSheetDetent> detents = <TanreiBottomSheetDetent>[];
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: owner, detents: detents, content: Text(longText))),
      );
      owner.currentState!.setDetent(TanreiBottomSheetDetent.full);
      await tester.pump();
      await tester.pump(enter ~/ 2);
      final double t = sheetTokens.motionEnterEasing.toCurve().transform(0.5);
      expect(
        sheetRect(tester).height,
        moreOrLessEquals(partialHeight + (fullHeight - partialHeight) * t, epsilon: 0.5),
      );
      await tester.pumpAndSettle();
      expect(sheetRect(tester).height, moreOrLessEquals(fullHeight));
      expect(detents, isEmpty);

      // The person chooses partial with the handle; the owner still says full.
      await tester.tap(handleButton());
      await tester.pumpAndSettle();
      expect(detents, <TanreiBottomSheetDetent>[TanreiBottomSheetDetent.partial]);
      expect(sheetRect(tester).height, moreOrLessEquals(partialHeight));
      await tester.pumpWidget(
        sheetApp(SheetOwner(key: owner, detents: detents, content: Text(longText))),
      );
      await tester.pumpAndSettle();
      expect(sheetRect(tester).height, moreOrLessEquals(partialHeight), reason: 'kept');
    });
  });

  group('drag handle', () {
    testWidgets('BSH-11: with two heights the handle is one focusable button named by '
        'handleSemanticLabel, expanded at full; a press, Enter or Space moves the sheet to its '
        'other height and reports it once; with one height it is drawn but not focusable, '
        'pressable or exposed; an empty name is reported', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final List<TanreiBottomSheetDetent> detents = <TanreiBottomSheetDetent>[];
      await pumpSheet(tester, sheetApp(SheetOwner(detents: detents, content: Text(longText))));
      SemanticsData handleData() => nodesBelow(semanticsRoot(tester))
          .map((SemanticsNode n) => n.getSemanticsData())
          .singleWhere((SemanticsData d) => d.label == 'Resize sheet');
      expect(handleData().hasFlag(SemanticsFlag.isButton), isTrue);
      expect(handleData().hasFlag(SemanticsFlag.hasExpandedState), isTrue);
      expect(handleData().hasFlag(SemanticsFlag.isExpanded), isFalse);

      await tester.tap(handleButton());
      await tester.pumpAndSettle();
      expect(detents, <TanreiBottomSheetDetent>[TanreiBottomSheetDetent.full]);
      expect(sheetRect(tester).height, moreOrLessEquals(fullHeight));
      expect(handleData().hasFlag(SemanticsFlag.isExpanded), isTrue);

      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Focus.of(tester.element(handleRing())).requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();
      expect(detents.last, TanreiBottomSheetDetent.partial);
      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();
      expect(detents, <TanreiBottomSheetDetent>[
        TanreiBottomSheetDetent.full,
        TanreiBottomSheetDetent.partial,
        TanreiBottomSheetDetent.full,
      ]);

      // One height: drawn, not interactive, not exposed.
      final List<String> reports = collectMissingNames();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: UniqueKey(), detents: detents, handleSemanticLabel: '')),
      );
      expect(handleBox(), findsOneWidget);
      expect(handleButton(), findsNothing);
      await tester.tap(handleBox(), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(detents, hasLength(3));
      expect(reports, isEmpty, reason: 'no interactive handle, nothing to name');

      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: UniqueKey(), handleSemanticLabel: '', content: Text(longText))),
      );
      await tester.pump();
      expect(reports, <String>['bottom sheet handle']);
      expect(handleButton(), findsOneWidget, reason: 'still rendered');
      semantics.dispose();
    });

    testWidgets('BSH-13: under the acme system the handle draws hovered, focused and pressed from '
        'their own tokens, pressed over focused over hovered; pointer focus draws no focused '
        'state; a drag from the handle does not leave it pressed', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiBottomSheetControlTokens control = acmeSystem.bottomSheet.controls.dragHandle;
      Color fill(TanreiInteractionState state) => acme.paint(control.of(state).containerColor);
      expect(<Color>{
        fill(TanreiInteractionState.hovered),
        fill(TanreiInteractionState.focused),
        fill(TanreiInteractionState.pressed),
      }, hasLength(3));
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText)), theme: acme));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Focus.of(tester.element(handleRing())).requestFocus();
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.focused));
      final TestGesture mouse = await hoverOver(tester, handleBox());
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.focused));
      await mouse.down(tester.getCenter(handleBox()));
      await tester.pump();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.pressed));
      await mouse.up();
      await tester.pumpAndSettle();
      FocusManager.instance.primaryFocus?.unfocus();
      // The click moved the sheet to full height: follow the handle.
      await mouse.moveTo(tester.getCenter(handleBox()));
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.hovered));
      await mouse.moveTo(const Offset(390, 710));
      await tester.pumpAndSettle();

      // A drag that starts on the handle ends its press as soon as the sheet follows.
      final TestGesture drag = await tester.startGesture(tester.getCenter(handleBox()));
      await tester.pump();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.pressed));
      await drag.moveBy(const Offset(0, -30));
      await drag.moveBy(const Offset(0, -30));
      await tester.pump();
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.enabled));
      await drag.up();
      await tester.pumpAndSettle();

      // Pointer focus: no focused state.
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.tap(handleBox());
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, fill(TanreiInteractionState.enabled));
    });

    testWidgets('BSH-14: keyboard focus shows the focus ring around the handle\'s box at once; '
        'focus by touch shows none', (WidgetTester tester) async {
      final GlobalKey<SheetOwnerState> owner = GlobalKey<SheetOwnerState>();
      await pumpSheet(
        tester,
        sheetApp(SheetOwner(key: owner, initialOpen: false, content: Text(longText))),
      );
      owner.currentState!.setOpen(true);
      await tester.pumpAndSettle();
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      await tabTimes(tester, 1);
      expect(focusedLabel(), 'Resize sheet');
      final TanreiFocusRing ring = tester.widget<TanreiFocusRing>(handleRing());
      expect(ring.visible, isTrue);
      expect(tester.getSize(handleRing()), tester.getSize(handleBox()));
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTouch;
      await tester.pump();
      expect(tester.widget<TanreiFocusRing>(handleRing()).visible, isFalse);
    });

    testWidgets('BSH-15: the handle\'s hit area is its row across the box, at least the touch '
        'target on both axes, without changing the box; a row lower than that reaches into the '
        'content', (WidgetTester tester) async {
      final List<TanreiBottomSheetDetent> detents = <TanreiBottomSheetDetent>[];
      await pumpSheet(tester, sheetApp(SheetOwner(detents: detents, content: Text(longText))));
      final double touch = system.measure.targetTouch;
      final Rect target = tester.getRect(handleButton());
      expect(target.width, math.max(touch, sheetTokens.handleContainerWidth));
      expect(target.height, math.max(touch, handleRow));
      expect(handleRow, touch, reason: 'with the default tokens the row is the target');
      await tester.tapAt(target.topLeft + const Offset(1, 1));
      await tester.pumpAndSettle();
      expect(detents, hasLength(1));

      // cupertino: a 16 row; the target still reaches the touch target, into the content.
      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      final TanreiBottomSheetTokens tokens = cupertinoSystem.bottomSheet;
      final double row = tokens.handleMarginBlock * 2 + tokens.handleContainerHeight;
      expect(row, lessThan(cupertinoSystem.measure.targetTouch));
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), detents: detents, content: Text(longText)),
          theme: cupertino,
        ),
      );
      final Rect sheet = sheetRect(tester);
      expect(tester.getRect(handleButton()).height, cupertinoSystem.measure.targetTouch);
      expect(tester.getSize(handleBox()).height, tokens.handleContainerHeight);
      await tester.tapAt(Offset(sheet.center.dx, sheet.top + row + 10));
      await tester.pumpAndSettle();
      expect(detents, hasLength(2));
    });

    testWidgets('BSH-16: a press shows the pressed state at once and keeps it for the press-hold', (
      WidgetTester tester,
    ) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final Color pressed = acme.paint(
        acmeSystem.bottomSheet.controls.dragHandle.pressed.containerColor,
      );
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText)), theme: acme));
      final TestGesture touch = await tester.startGesture(tester.getCenter(handleBox()));
      await tester.pump();
      expect(handleContainer(tester).visuals.container, pressed, reason: 'without delay');
      await touch.up();
      await tester.pump(hold - tick);
      expect(handleContainer(tester).visuals.container, pressed);
      await tester.pump(tick);
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, isNot(pressed));
    });

    testWidgets('BSH-17: overlay (default) fills the pressed box; ripple (m3-like) grows from the '
        'point of contact; dim (cupertino) dims the handle with no state layer; none draws no '
        'answer', (WidgetTester tester) async {
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText))));
      TestGesture touch = await tester.startGesture(tester.getCenter(handleBox()));
      await tester.pump();
      expect(
        handleContainer(tester).visuals.container,
        lightTheme.paint(sheetTokens.controls.dragHandle.pressed.containerColor),
      );
      expect(handleContainer(tester).ripple, isNull);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData m3 = TanreiThemeData(system: m3LikeSystem);
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          theme: m3,
        ),
      );
      final Rect box = tester.getRect(handleBox());
      const Offset contact = Offset(10, 6);
      touch = await tester.startGesture(box.topLeft + contact);
      await tester.pump();
      expect(handleContainer(tester).ripple!.origin, contact);
      await touch.up();
      await tester.pumpAndSettle();

      const TanreiThemeData cupertino = TanreiThemeData(system: cupertinoSystem);
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          theme: cupertino,
        ),
      );
      touch = await tester.startGesture(tester.getCenter(handleBox()));
      await tester.pump();
      expect(handleOpacity(tester), cupertinoSystem.bottomSheet.pressed.opacity);
      expect(handleContainer(tester).visuals.container.a, 0);
      await touch.up();
      await tester.pumpAndSettle();

      final TanreiThemeData none = TanreiThemeData(
        system: acmeSystem.copyWith(
          behavior: acmeSystem.behavior.copyWith(pressedFeedback: TanreiPressedFeedback.none),
        ),
      );
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          theme: none,
        ),
      );
      touch = await tester.startGesture(tester.getCenter(handleBox()));
      await tester.pump();
      expect(
        handleContainer(tester).visuals.container,
        none.paint(acmeSystem.bottomSheet.controls.dragHandle.enabled.containerColor),
      );
      await touch.up();
      await tester.pumpAndSettle();
    });

    testWidgets('BSH-18: the corner smoothing eases the container\'s top corners and the handle\'s '
        'box; the focus ring follows the focus style', (WidgetTester tester) async {
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(content: Text(longText)),
          theme: const TanreiThemeData(system: cupertinoSystem),
        ),
      );
      expect(sheetDecoration(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      expect(sheetDecoration(tester).shape.radius, cupertinoSystem.bottomSheet.containerShape);
      expect(handleContainer(tester).shape.smoothing, cupertinoSystem.shape.cornerSmoothing);
      expect(acmeSystem.behavior.focusStyle, TanreiFocusStyle.glow);
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          theme: const TanreiThemeData(system: acmeSystem),
        ),
      );
      FocusManager.instance.highlightStrategy = FocusHighlightStrategy.alwaysTraditional;
      Focus.of(tester.element(handleRing())).requestFocus();
      await tester.pumpAndSettle();
      expect(tester.widget<TanreiFocusRing>(handleRing()).visible, isTrue);
    });

    testWidgets('BSH-19: the handle\'s colors ease between states over state-duration, and change '
        'at once where motion is reduced', (WidgetTester tester) async {
      const TanreiThemeData acme = TanreiThemeData(system: acmeSystem);
      final TanreiBottomSheetControlTokens control = acmeSystem.bottomSheet.controls.dragHandle;
      final Color rest = acme.paint(control.enabled.containerColor);
      final Color hovered = acme.paint(control.hovered.containerColor);
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText)), theme: acme));
      final TestGesture mouse = await hoverOver(tester, find.text(longText));
      await mouse.moveTo(tester.getCenter(handleBox()));
      await tester.pump();
      await tester.pump(tanreiDuration(acmeSystem.bottomSheet.motionStateDuration) ~/ 2);
      final Color middle = handleContainer(tester).visuals.container;
      expect(middle, isNot(rest));
      expect(middle, isNot(hovered));
      await tester.pumpAndSettle();
      expect(handleContainer(tester).visuals.container, hovered);
      await mouse.moveTo(const Offset(390, 710));
      await tester.pumpAndSettle();

      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(key: UniqueKey(), content: Text(longText)),
          theme: acme,
          disableAnimations: true,
        ),
      );
      await mouse.moveTo(tester.getCenter(handleBox()));
      await tester.pump();
      expect(handleContainer(tester).visuals.container, hovered);
    });
  });

  group('accessibility', () {
    testWidgets('BSH-22: a modal sheet is a modal dialog named by its label, a standard one a '
        'region named by it; the grip is hidden; an empty label is reported', (
      WidgetTester tester,
    ) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText))));
      final List<SemanticsData> dialogs = nodesWithRole(tester, SemanticsRole.dialog);
      expect(dialogs, hasLength(1));
      expect(dialogs.single.label, 'Save photo');
      expect(dialogs.single.hasFlag(SemanticsFlag.scopesRoute), isTrue);
      expect(dialogs.single.hasFlag(SemanticsFlag.namesRoute), isTrue);

      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            key: UniqueKey(),
            variant: TanreiBottomSheetVariant.standard,
            semanticLabel: 'Nearby places',
            content: Text(longText),
          ),
        ),
      );
      expect(nodesWithRole(tester, SemanticsRole.dialog), isEmpty);
      final Iterable<SemanticsData> all = nodesBelow(
        semanticsRoot(tester),
      ).map((SemanticsNode n) => n.getSemanticsData());
      expect(all.where((SemanticsData d) => d.label == 'Nearby places'), hasLength(1));
      // The page stays reachable beside a standard sheet.
      expect(all.where((SemanticsData d) => d.label == 'Content'), hasLength(1));
      // Only the handle's own node: nothing for the grip.
      expect(
        all.where((SemanticsData d) => d.label.isEmpty && d.hasFlag(SemanticsFlag.isButton)),
        isEmpty,
      );

      final List<String> reports = collectMissingNames();
      await pumpSheet(tester, sheetApp(SheetOwner(key: UniqueKey(), semanticLabel: '')));
      expect(reports, <String>['bottom sheet']);
      expect(find.text(shortText), findsOneWidget, reason: 'still rendered');
      semantics.dispose();
    });

    testWidgets('BSH-25: a variant or detent name the bottom sheet does not define renders as the '
        'default and is reported', (WidgetTester tester) async {
      final List<String> reports = collectUnknownValues();
      expect(TanreiBottomSheetVariant.fromName('sideways'), TanreiBottomSheetVariant.modal);
      expect(TanreiBottomSheetDetent.fromName('half'), TanreiBottomSheetDetent.partial);
      expect(reports, <String>[
        'bottom-sheet variant "sideways" -> modal',
        'bottom-sheet detent "half" -> partial',
      ]);
      await pumpSheet(
        tester,
        sheetApp(
          SheetOwner(
            variant: TanreiBottomSheetVariant.fromName('sideways'),
            detent: TanreiBottomSheetDetent.fromName('half'),
            content: Text(longText),
          ),
        ),
      );
      expect(scrimFinder(), findsOneWidget);
      expect(sheetRect(tester).height, moreOrLessEquals(partialHeight));
    });

    testWidgets('guidelines: bottom sheet', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      for (final TanreiBottomSheetVariant variant in TanreiBottomSheetVariant.values) {
        for (final TanreiThemeData theme in <TanreiThemeData>[
          TanreiThemeData.light,
          TanreiThemeData.dark,
        ]) {
          await pumpSheet(
            tester,
            sheetApp(
              SheetOwner(key: UniqueKey(), variant: variant, content: Text(longText)),
              theme: theme,
            ),
          );
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          await expectLater(tester, meetsGuideline(textContrastGuideline));
        }
      }
      semantics.dispose();
    });
  });

  group('a design system drives rendering', () {
    test('the tokens the widget reads: their default values', () {
      expect(sheetTokens.containerMaxWidth, 640);
      expect(sheetTokens.containerMarginBlockStart, 48);
      expect(sheetTokens.containerPartialFraction, 0.5);
      expect(sheetTokens.containerPadding, 16);
      expect(handleRow, 48);
      expect(sheetTokens.handleGripWidth, 32);
      expect(sheetTokens.handleGripHeight, 4);
      expect(sheetTokens.containerShape, 12);
    });

    for (final TanreiSystem shipped in shippedSystems) {
      testWidgets('"${shipped.id}": the sheet draws that system\'s container, corners, grip and '
          'heights', (WidgetTester tester) async {
        final TanreiThemeData theme = TanreiThemeData(system: shipped);
        final TanreiBottomSheetTokens tokens = shipped.bottomSheet;
        await pumpSheet(tester, sheetApp(SheetOwner(content: Text(longText)), theme: theme));
        expect(sheetDecoration(tester).color, theme.paint(tokens.containerColor));
        expect(sheetDecoration(tester).shape.radius, tokens.containerShape);
        expect(
          gripDecoration(tester).color,
          theme.paint(tokens.controls.dragHandle.enabled.gripColor),
        );
        expect(
          tester.getSize(
            find
                .descendant(
                  of: handleBox(),
                  matching: find.byWidgetPredicate(
                    (Widget w) => w is DecoratedBox && w.decoration is TanreiContainerDecoration,
                  ),
                )
                .last,
          ),
          Size(tokens.handleGripWidth, tokens.handleGripHeight),
        );
        expect(
          sheetRect(tester).height,
          moreOrLessEquals(stage.height * tokens.containerPartialFraction),
        );
      });
    }
  });

  group('goldens', () {
    test('the spec lists the fixtures this suite records', () {
      expect(fixtures.map((Map<String, dynamic> f) => f['id']), <String>[
        'modal',
        'modal-partial',
        'modal-full',
        'no-handle',
        'standard',
      ]);
    });

    for (final Map<String, dynamic> fixture in fixtures) {
      final String id = fixture['id'] as String;
      testWidgets('golden: $id', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: system,
          surface: sheetGoldenSurface,
          settle: true,
          child: fixtureSheet(fixture),
          file: 'goldens/bottom_sheet/$id.png',
        );
      });
    }

    // One representative fixture per shipped preset: the modal sheet shows the
    // preset's scrim, container, corners, elevation and grip at once.
    const String recorded = 'modal';
    for (final TanreiSystem preset in <TanreiSystem>[
      m3LikeSystem,
      m3ExpressiveLikeSystem,
      cupertinoSystem,
    ]) {
      testWidgets('golden: ${preset.id}/$recorded', (WidgetTester tester) async {
        await expectFixtureGolden(
          tester,
          system: preset,
          surface: sheetGoldenSurface,
          settle: true,
          child: fixtureSheet(
            fixtures.singleWhere((Map<String, dynamic> f) => f['id'] == recorded),
          ),
          file: 'goldens/bottom_sheet/${preset.id}/$recorded.png',
        );
      });
    }
  });
}
